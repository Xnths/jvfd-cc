package auth

import (
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

// Handler exposes the auth server over HTTP.
type Handler struct {
	Svc      *Service
	Log      *slog.Logger
	verifier *authn.Verifier
}

// NewHandler wires the handler.
func NewHandler(s *Service, log *slog.Logger) *Handler {
	return &Handler{Svc: s, Log: log, verifier: s.Signer.Verifier()}
}

// Routes returns the full router with middleware applied.
func (h *Handler) Routes() http.Handler {
	loginLimit := httpx.NewRateLimiter(20, 10)
	tokenLimit := httpx.NewRateLimiter(30, 10)
	origin := httpx.OriginCheck(h.Svc.Cfg.PublicBaseURL)

	mux := http.NewServeMux()
	mux.Handle("GET /auth/google/login", loginLimit.Middleware(http.HandlerFunc(h.login)))
	mux.Handle("GET /auth/google/callback", loginLimit.Middleware(http.HandlerFunc(h.callback)))
	mux.Handle("GET /auth/refresh", loginLimit.Middleware(http.HandlerFunc(h.refreshRedirect)))
	mux.Handle("POST /auth/refresh", origin(loginLimit.Middleware(http.HandlerFunc(h.refreshJSON))))
	mux.Handle("POST /auth/logout", origin(http.HandlerFunc(h.logout)))
	mux.HandleFunc("GET /auth/me", h.me)
	mux.HandleFunc("GET /auth/sessions", h.sessions)
	mux.HandleFunc("GET /auth/denied", h.denied)
	// Machine endpoint: no cookies involved, so no origin check. nginx hides it from the internet.
	mux.Handle("POST /auth/token", tokenLimit.Middleware(http.HandlerFunc(h.token)))
	mux.HandleFunc("GET /.well-known/jwks.json", h.jwks)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { httpx.JSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := h.Svc.Store.Ping(r.Context()); err != nil {
			httpx.Problem(w, http.StatusServiceUnavailable, "database unavailable")
			return
		}
		httpx.JSON(w, 200, map[string]string{"status": "ready"})
	})

	return httpx.Chain(mux,
		httpx.RequestID, httpx.RealIP(h.Svc.Cfg.TrustProxy), httpx.Recover(h.Log), httpx.Logger(h.Log), httpx.SecurityHeaders)
}

// cookie names: the __Host-/__Secure- prefixes need HTTPS, so plain names are used on http://localhost.
func (h *Handler) cookieName(base string) string {
	if !h.Svc.Cfg.SecureCookies {
		return base
	}
	switch base {
	case RefreshCookie:
		return "__Secure-" + base
	case AdminHintCache:
		return base
	default:
		return "__Host-" + base
	}
}

func (h *Handler) setCookie(w http.ResponseWriter, base, value, path string, httpOnly bool, maxAge time.Duration) {
	c := &http.Cookie{
		Name: h.cookieName(base), Value: value, Path: path, HttpOnly: httpOnly,
		Secure: h.Svc.Cfg.SecureCookies, SameSite: http.SameSiteLaxMode,
	}
	if maxAge < 0 {
		c.MaxAge = -1
	} else if maxAge > 0 {
		c.MaxAge = int(maxAge.Seconds())
	}
	http.SetCookie(w, c)
}

func (h *Handler) clear(w http.ResponseWriter, base, path string, httpOnly bool) {
	h.setCookie(w, base, "", path, httpOnly, -1)
}

func (h *Handler) setSession(w http.ResponseWriter, t Tokens) {
	h.setCookie(w, AccessCookie, t.Access, "/", true, AccessTTL)
	h.setCookie(w, AdminHintCache, "1", "/", false, RefreshTTL)
	if t.Refresh != "" {
		h.setCookie(w, RefreshCookie, t.Refresh, "/auth", true, time.Until(t.RefreshExp))
	}
}

func (h *Handler) clearSession(w http.ResponseWriter) {
	h.clear(w, AccessCookie, "/", true)
	h.clear(w, AdminHintCache, "/", false)
	h.clear(w, RefreshCookie, "/auth", true)
}

func (h *Handler) ipHash(r *http.Request) string {
	return httpx.HashIP(h.Svc.Cfg.IPHashSecret, httpx.ClientIP(r.Context()))
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	redirect, sealed := h.Svc.StartLogin(r.URL.Query().Get("return"))
	h.setCookie(w, OAuthCookie, sealed, "/", true, OAuthStateTTL)
	http.Redirect(w, r, redirect, http.StatusFound)
}

func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	c, err := r.Cookie(h.cookieName(OAuthCookie))
	h.clear(w, OAuthCookie, "/", true)
	if q.Get("error") != "" {
		http.Redirect(w, r, "/auth/denied?reason=cancelled", http.StatusSeeOther)
		return
	}
	if err != nil {
		http.Redirect(w, r, "/auth/denied?reason=expired", http.StatusSeeOther)
		return
	}
	tok, ret, err := h.Svc.FinishLogin(r.Context(), c.Value, q.Get("state"), q.Get("code"), h.ipHash(r), r.UserAgent())
	switch {
	case err == nil:
		h.setSession(w, tok)
		http.Redirect(w, r, ret, http.StatusSeeOther)
	case errors.Is(err, ErrNotAllowed), errors.Is(err, ErrUnverified), errors.Is(err, ErrSubMismatch), errors.Is(err, ErrDisabled):
		http.Redirect(w, r, "/auth/denied?reason=forbidden", http.StatusSeeOther)
	case errors.Is(err, ErrBadState):
		http.Redirect(w, r, "/auth/denied?reason=expired", http.StatusSeeOther)
	default:
		h.Log.Error("login failed", "err", err)
		http.Redirect(w, r, "/auth/denied?reason=error", http.StatusSeeOther)
	}
}

func (h *Handler) refreshToken(r *http.Request) string {
	if c, err := r.Cookie(h.cookieName(RefreshCookie)); err == nil {
		return c.Value
	}
	return ""
}

// refreshRedirect is the top-level navigation used by Next's proxy when the access token expired.
func (h *Handler) refreshRedirect(w http.ResponseWriter, r *http.Request) {
	ret := SafeReturn(r.URL.Query().Get("return"))
	tok, err := h.Svc.Refresh(r.Context(), h.refreshToken(r), h.ipHash(r), r.UserAgent())
	if err != nil {
		h.clearSession(w)
		http.Redirect(w, r, "/auth/google/login?return="+url.QueryEscape(ret), http.StatusSeeOther)
		return
	}
	h.setSession(w, tok)
	http.Redirect(w, r, ret, http.StatusSeeOther)
}

func (h *Handler) refreshJSON(w http.ResponseWriter, r *http.Request) {
	tok, err := h.Svc.Refresh(r.Context(), h.refreshToken(r), h.ipHash(r), r.UserAgent())
	if err != nil {
		h.clearSession(w)
		httpx.Problem(w, http.StatusUnauthorized, "session expired")
		return
	}
	h.setSession(w, tok)
	httpx.JSON(w, 200, map[string]any{"expires_at": tok.AccessExp.UTC(), "email": tok.Admin.Email, "role": tok.Admin.Role})
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	h.Svc.Logout(r.Context(), h.refreshToken(r))
	h.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) claims(r *http.Request) (*authn.Claims, error) {
	token := ""
	if a := r.Header.Get("Authorization"); strings.HasPrefix(a, "Bearer ") {
		token = strings.TrimPrefix(a, "Bearer ")
	} else if c, err := r.Cookie(h.cookieName(AccessCookie)); err == nil {
		token = c.Value
	}
	if token == "" {
		return nil, errors.New("no token")
	}
	return h.verifier.Verify(token, h.Svc.Now())
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	c, err := h.claims(r)
	if err != nil || !c.IsAdmin() {
		httpx.Problem(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	httpx.JSON(w, 200, map[string]any{"id": c.Subject, "email": c.Email, "role": c.Role})
}

func (h *Handler) sessions(w http.ResponseWriter, r *http.Request) {
	c, err := h.claims(r)
	if err != nil || !c.IsAdmin() {
		httpx.Problem(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	list, err := h.Svc.Store.SessionsForAdmin(r.Context(), c.Subject, h.Svc.Now())
	if err != nil {
		httpx.Problem(w, http.StatusInternalServerError, "could not list sessions")
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, s := range list {
		out = append(out, map[string]any{"id": s.ID, "created_at": s.CreatedAt, "expires_at": s.ExpiresAt,
			"user_agent": s.UserAgent, "current": s.ID == c.SID})
	}
	httpx.JSON(w, 200, map[string]any{"sessions": out})
}

func (h *Handler) token(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if err := r.ParseForm(); err != nil || r.PostForm.Get("grant_type") != "client_credentials" {
		httpx.Problem(w, http.StatusBadRequest, "unsupported_grant_type")
		return
	}
	tok, exp, err := h.Svc.ClientToken(r.Context(), r.PostForm.Get("client_id"), r.PostForm.Get("client_secret"))
	if err != nil {
		httpx.Problem(w, http.StatusUnauthorized, "invalid_client")
		return
	}
	httpx.JSON(w, 200, map[string]any{"access_token": tok, "token_type": "Bearer", "expires_in": int(time.Until(exp).Seconds())})
}

func (h *Handler) jwks(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=300")
	httpx.JSON(w, 200, h.Svc.Signer.JWKS())
}

func (h *Handler) denied(w http.ResponseWriter, r *http.Request) {
	msg := map[string]string{
		"forbidden": "Esta conta Google não tem acesso à área administrativa.",
		"expired":   "A tentativa de login expirou. Tente novamente.",
		"cancelled": "Login cancelado.",
	}[r.URL.Query().Get("reason")]
	if msg == "" {
		msg = "Não foi possível concluir o login. Tente novamente."
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Robots-Tag", "noindex")
	w.WriteHeader(http.StatusForbidden)
	fmt.Fprintf(w, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acesso negado</title></head><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Acesso negado</h1><p>%s</p><p><a href="/">Voltar ao site</a></p></body></html>`, html.EscapeString(msg))
}
