package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/Xnths/jvfd-cc/backend/internal/ads"
	"github.com/jackc/pgx/v5/pgconn"
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

type leadIn struct {
	ID         string `json:"id"`
	ClickedAt  string `json:"clicked_at"`
	Source     string `json:"source"`
	PageURL    string `json:"page_url"`
	LandingURL string `json:"landing_url"`
	Gclid      string `json:"gclid"`
	Gbraid     string `json:"gbraid"`
	Wbraid     string `json:"wbraid"`
	UTMSource  string `json:"utm_source"`
	UTMMedium  string `json:"utm_medium"`
	UTMCamp    string `json:"utm_campaign"`
	UTMTerm    string `json:"utm_term"`
	UTMContent string `json:"utm_content"`
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func clip(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func validClickID(s string) bool {
	return s == "" || (len(s) <= 512 && gclidPattern.MatchString(s))
}

// createLead records one WhatsApp click. Old pages send only {"gclid"}; those keep the former behavior (one lead
// per gclid). New pages send a client-generated id, so a repeated beacon is a no-op.
func (s *Server) createLead(w http.ResponseWriter, r *http.Request) {
	raw, ok := readBody(w, r, 4096)
	if !ok {
		return
	}
	var in leadIn
	if json.Unmarshal(raw, &in) != nil || !validClickID(in.Gclid) || !validClickID(in.Gbraid) || !validClickID(in.Wbraid) ||
		(in.ID != "" && !uuidPattern.MatchString(in.ID)) || (in.ID == "" && in.Gclid == "") {
		httpx.JSON(w, http.StatusBadRequest, map[string]bool{"ok": false})
		return
	}
	now := s.Now()
	clicked := now
	if in.ClickedAt != "" {
		t, err := time.Parse(time.RFC3339, in.ClickedAt)
		if err != nil || t.After(now.Add(5*time.Minute)) {
			httpx.JSON(w, http.StatusBadRequest, map[string]bool{"ok": false})
			return
		}
		// A replay from the edge queue keeps the real click time; anything older than 14 days is not trusted.
		if t.After(now.Add(-14 * 24 * time.Hour)) {
			clicked = t
		}
	}
	if clicked.After(now) {
		clicked = now
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		s.Log.Error("create lead", "err", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]bool{"ok": false})
		return
	}
	defer tx.Rollback(r.Context())
	var leadID string
	nz := func(v string, n int) any {
		if v == "" {
			return nil
		}
		return clip(v, n)
	}
	err = tx.QueryRow(r.Context(), `INSERT INTO leads (id, clicked_at, status, gclid, gbraid, wbraid, source, page_url, landing_url,
		utm_source, utm_medium, utm_campaign, utm_term, utm_content, user_agent)
		SELECT coalesce(nullif($1,'')::uuid, gen_random_uuid()), $2, 'clicked', nullif($3,''), nullif($4,''), nullif($5,''), $6, $7, $8, $9, $10, $11, $12, $13, $14
		WHERE NOT ($1 = '' AND EXISTS (SELECT 1 FROM leads WHERE gclid = $3))
		ON CONFLICT (id) DO NOTHING RETURNING id::text`,
		in.ID, clicked, in.Gclid, in.Gbraid, in.Wbraid, clip(in.Source, 80), clip(in.PageURL, 500), clip(in.LandingURL, 500),
		nz(in.UTMSource, 200), nz(in.UTMMedium, 200), nz(in.UTMCamp, 200), nz(in.UTMTerm, 200), nz(in.UTMContent, 200),
		clip(r.UserAgent(), 300)).Scan(&leadID)
	if isNoRows(err) { // already known: succeed silently
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if err != nil {
		s.Log.Error("create lead", "err", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]bool{"ok": false})
		return
	}
	if err := insertUpload(r.Context(), tx, leadID, ads.StageClick, clicked, nil, in.Gclid != "" || in.Gbraid != "" || in.Wbraid != ""); err != nil {
		s.Log.Error("create lead upload", "err", err)
		httpx.JSON(w, http.StatusInternalServerError, map[string]bool{"ok": false})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		httpx.JSON(w, http.StatusInternalServerError, map[string]bool{"ok": false})
		return
	}
	s.Ads.Kick()
	httpx.JSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

// insertUpload queues one conversion (or marks it skipped when the click carries no Google click id). Re-queuing a
// stage that already succeeded is a no-op; one that failed or was skipped is queued again.
func insertUpload(ctx context.Context, q interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}, leadID, stage string, at time.Time, value *float64, hasClickID bool) error {
	status, code := "pending", ""
	if !hasClickID {
		status, code = "skipped", "NO_CLICK_ID"
	}
	_, err := q.Exec(ctx, `INSERT INTO conversion_uploads (lead_id, stage, conversion_time, value, status, last_error_code)
		VALUES ($1::uuid,$2,$3,$4,$5,nullif($6,''))
		ON CONFLICT (lead_id, stage) DO UPDATE SET conversion_time = EXCLUDED.conversion_time, value = EXCLUDED.value,
		  status = EXCLUDED.status, last_error_code = EXCLUDED.last_error_code, last_error_message = NULL, attempts = 0,
		  next_attempt_at = now(), updated_at = now()
		WHERE conversion_uploads.status <> 'succeeded'`, leadID, stage, at, value, status, code)
	return err
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
