package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

// GCLIDs are standard base64 (+ / =) or base64url.
var gclidPattern = regexp.MustCompile(`^[A-Za-z0-9+/=_-]+$`)

// legacyUnsubscribeUntil is when old unsigned (?email=base64) unsubscribe links stop working.
var legacyUnsubscribeUntil = time.Date(2027, 2, 1, 0, 0, 0, 0, time.UTC)

func (s *Server) publicWriteRoutes(mux *http.ServeMux) {
	leadLimit := httpx.NewRateLimiter(10, 10)
	subLimit := httpx.NewRateLimiter(6, 6)
	commentLimit := httpx.NewRateLimiter(5, 5)

	mux.Handle("POST /api/leads", leadLimit.Middleware(http.HandlerFunc(s.createLead)))
	mux.Handle("POST /api/subscribe", subLimit.Middleware(http.HandlerFunc(s.subscribe)))
	mux.Handle("POST /api/v1/public/subscribe", subLimit.Middleware(http.HandlerFunc(s.subscribe)))
	mux.HandleFunc("GET /api/unsubscribe", s.unsubscribePage)
	mux.HandleFunc("POST /api/unsubscribe", s.unsubscribe)
	mux.Handle("POST /api/v1/public/comments", commentLimit.Middleware(http.HandlerFunc(s.createComment)))
	mux.Handle("POST /api/v1/public/faq-questions", commentLimit.Middleware(http.HandlerFunc(s.createFAQQuestion)))
}

// readBody reads a small body regardless of Content-Type: navigator.sendBeacon posts the
// gclid with whatever type the browser picks, and the old route ignored it too.
func readBody(w http.ResponseWriter, r *http.Request, max int64) ([]byte, bool) {
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, max))
	if err != nil {
		badRequest(w, "invalid body")
		return nil, false
	}
	return b, true
}

// ── leads ───────────────────────────────────────────────────────────────────

func (s *Server) createLead(w http.ResponseWriter, r *http.Request) {
	raw, ok := readBody(w, r, 2048)
	if !ok {
		return
	}
	var in struct {
		Gclid string `json:"gclid"`
	}
	if json.Unmarshal(raw, &in) != nil || in.Gclid == "" || len(in.Gclid) > 512 || !gclidPattern.MatchString(in.Gclid) {
		httpx.JSON(w, http.StatusBadRequest, map[string]bool{"ok": false})
		return
	}
	tag, err := s.Pool.Exec(r.Context(),
		`INSERT INTO leads (gclid, clicked_at, status) VALUES ($1, now(), 'clicked') ON CONFLICT (gclid) DO NOTHING`, in.Gclid)
	if err != nil {
		s.Log.Error("create lead", "err", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]bool{"ok": false})
		return
	}
	status := http.StatusOK // already known: succeed silently
	if tag.RowsAffected() == 1 {
		status = http.StatusCreated
	}
	httpx.JSON(w, status, map[string]bool{"ok": true})
}

// ── newsletter ──────────────────────────────────────────────────────────────

func normalizeEmail(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if len(s) > 254 {
		return "", false
	}
	a, err := mail.ParseAddress(s)
	if err != nil || a.Address != s || !strings.Contains(a.Address[strings.LastIndex(a.Address, "@"):], ".") {
		return "", false
	}
	return strings.ToLower(a.Address), true
}

func (s *Server) subscribe(w http.ResponseWriter, r *http.Request) {
	raw, ok := readBody(w, r, 4096)
	if !ok {
		return
	}
	var in struct {
		Email string `json:"email"`
	}
	email, valid := "", false
	if json.Unmarshal(raw, &in) == nil {
		email, valid = normalizeEmail(in.Email)
	}
	if !valid {
		badRequest(w, "invalid email")
		return
	}
	var existed, wasActive bool
	err := s.Pool.QueryRow(r.Context(), `
		WITH prev AS (SELECT active FROM subscribers WHERE email = $1),
		up AS (
		  INSERT INTO subscribers (email, consented_at, active, source) VALUES ($1, now(), true, 'site')
		  ON CONFLICT (email) DO UPDATE SET active = true, consented_at = CASE WHEN subscribers.active THEN subscribers.consented_at ELSE now() END, unsubscribed_at = NULL
		  RETURNING 1)
		SELECT EXISTS (SELECT 1 FROM prev), coalesce((SELECT active FROM prev), false)`, email).Scan(&existed, &wasActive)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if existed && wasActive {
		httpx.JSON(w, http.StatusConflict, map[string]any{"ok": false, "error": "already subscribed"})
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

// UnsubscribeToken is the signed value placed in newsletter links.
func (s *Server) UnsubscribeToken(email string) string {
	m := hmac.New(sha256.New, []byte(s.Cfg.UnsubscribeKey))
	m.Write([]byte(email))
	return base64.RawURLEncoding.EncodeToString([]byte(email)) + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil)[:16])
}

func (s *Server) parseUnsubscribeToken(tok string) (string, bool) {
	enc, sig, ok := strings.Cut(tok, ".")
	if !ok {
		return "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(enc)
	if err != nil {
		return "", false
	}
	email := string(raw)
	want := s.UnsubscribeToken(email)
	if !hmac.Equal([]byte(want), []byte(enc+"."+sig)) {
		return "", false
	}
	return email, true
}

func (s *Server) legacyEmail(v string) (string, bool) {
	if s.Now().After(legacyUnsubscribeUntil) {
		return "", false
	}
	raw, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		raw, err = base64.RawURLEncoding.DecodeString(v)
	}
	if err != nil {
		return "", false
	}
	return normalizeEmail(string(raw))
}

// unsubscribePage never changes state on GET: mail scanners and link previews prefetch links.
func (s *Server) unsubscribePage(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var email, field, value string
	if t := q.Get("t"); t != "" {
		if e, ok := s.parseUnsubscribeToken(t); ok {
			email, field, value = e, "t", t
		}
	} else if l := q.Get("email"); l != "" {
		if e, ok := s.legacyEmail(l); ok {
			email, field, value = e, "legacy", l
		}
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Robots-Tag", "noindex")
	w.Header().Set("Cache-Control", "no-store")
	if email == "" {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprint(w, unsubPage("Link inválido", "<p>Este link de cancelamento não é válido ou expirou. Responda ao e-mail recebido e removeremos seu endereço.</p>"))
		return
	}
	fmt.Fprint(w, unsubPage("Cancelar inscrição", fmt.Sprintf(
		`<p>Deseja deixar de receber novos artigos em <strong>%s</strong>?</p><form method="post" action="/api/unsubscribe"><input type="hidden" name="%s" value="%s"><button type="submit" style="padding:.7rem 1.2rem;font-size:1rem">Confirmar cancelamento</button></form>`,
		html.EscapeString(email), field, html.EscapeString(value))))
}

// unsubscribe handles both the confirm-page form and RFC 8058 one-click POSTs.
func (s *Server) unsubscribe(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	_ = r.ParseForm()
	q := r.URL.Query()
	token := firstNonEmpty(r.PostForm.Get("t"), q.Get("t"))
	var email string
	if token != "" {
		email, _ = s.parseUnsubscribeToken(token)
	} else if l := firstNonEmpty(r.PostForm.Get("legacy"), ""); l != "" {
		email, _ = s.legacyEmail(l)
	}
	if email == "" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprint(w, unsubPage("Link inválido", "<p>Este link de cancelamento não é válido ou expirou.</p>"))
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE subscribers SET active = false, unsubscribed_at = now() WHERE email = $1 AND active`, email); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, unsubPage("Inscrição cancelada", "<p>Pronto. Você não receberá mais e-mails com novos artigos.</p>"))
}

func firstNonEmpty(v ...string) string {
	for _, s := range v {
		if s != "" {
			return s
		}
	}
	return ""
}

func unsubPage(title, body string) string {
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>` +
		html.EscapeString(title) + `</title></head><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>` +
		html.EscapeString(title) + `</h1>` + body + `<p><a href="/">Voltar ao site</a></p></body></html>`
}

// ── comments & questions ────────────────────────────────────────────────────

var linkPattern = regexp.MustCompile(`(?i)https?://|www\.`)

func (s *Server) verifyHuman(ctx context.Context, r *http.Request, token string) bool {
	return s.Turnstile != nil && s.Turnstile.Verify(ctx, token, httpx.ClientIP(r.Context()))
}

func (s *Server) createComment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PostID         string `json:"postId"`
		Name           string `json:"name"`
		Body           string `json:"body"`
		TurnstileToken string `json:"turnstileToken"`
		Website        string `json:"website"` // honeypot
	}
	if !decode(w, r, &in, 8192) {
		return
	}
	if in.Website != "" { // bots fill hidden fields: pretend success, store nothing
		httpx.JSON(w, http.StatusAccepted, map[string]bool{"ok": true})
		return
	}
	name, body := strings.TrimSpace(in.Name), strings.TrimSpace(in.Body)
	if n := utf8.RuneCountInString(name); n < 2 || n > 80 {
		badRequest(w, "name must have 2 to 80 characters")
		return
	}
	if n := utf8.RuneCountInString(body); n < 1 || n > 2000 {
		badRequest(w, "comment must have 1 to 2000 characters")
		return
	}
	if len(linkPattern.FindAllString(body, -1)) > 1 {
		badRequest(w, "comments may contain at most one link")
		return
	}
	if !s.verifyHuman(r.Context(), r, in.TurnstileToken) {
		httpx.Problem(w, http.StatusForbidden, "human verification failed")
		return
	}
	tag, err := s.Pool.Exec(r.Context(),
		`INSERT INTO comments (post_id, author_name, body, status, ip_hash)
		 SELECT id, $2, $3, 'pending', $4 FROM posts WHERE id = $1::uuid AND status = 'published'`,
		in.PostID, name, body, s.ipHash(r))
	if err != nil {
		badRequest(w, "invalid post")
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	httpx.JSON(w, http.StatusAccepted, map[string]any{"ok": true, "status": "pending"})
}

func (s *Server) createFAQQuestion(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Question       string `json:"question"`
		TurnstileToken string `json:"turnstileToken"`
		Website        string `json:"website"`
	}
	if !decode(w, r, &in, 8192) {
		return
	}
	if in.Website != "" {
		httpx.JSON(w, http.StatusAccepted, map[string]bool{"ok": true})
		return
	}
	q := strings.TrimSpace(in.Question)
	if n := utf8.RuneCountInString(q); n < 10 || n > 1000 {
		badRequest(w, "question must have 10 to 1000 characters")
		return
	}
	if linkPattern.MatchString(q) {
		badRequest(w, "links are not allowed in questions")
		return
	}
	if !s.verifyHuman(r.Context(), r, in.TurnstileToken) {
		httpx.Problem(w, http.StatusForbidden, "human verification failed")
		return
	}
	// No name or contact is collected: questions may describe health situations.
	if _, err := s.Pool.Exec(r.Context(), `INSERT INTO faq_questions (question, ip_hash) VALUES ($1, $2)`, q, s.ipHash(r)); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, map[string]bool{"ok": true})
}

// CFTurnstile verifies tokens with Cloudflare.
type CFTurnstile struct {
	Secret string
	Client *http.Client
}

// Verify implements TurnstileVerifier. With no secret configured it fails closed.
func (t CFTurnstile) Verify(ctx context.Context, token, ip string) bool {
	if t.Secret == "" || token == "" {
		return false
	}
	c := t.Client
	if c == nil {
		c = &http.Client{Timeout: 5 * time.Second}
	}
	form := url.Values{"secret": {t.Secret}, "response": {token}, "remoteip": {ip}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://challenges.cloudflare.com/turnstile/v0/siteverify", strings.NewReader(form.Encode()))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var out struct {
		Success bool `json:"success"`
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&out) == nil && out.Success
}
