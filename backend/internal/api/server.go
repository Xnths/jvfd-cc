// Package api implements the public, admin and internal HTTP API of the content platform.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Notifier tells the website that content changed so cached pages are refreshed.
type Notifier interface {
	// Revalidate drops the given cache tags and paths (all=true drops everything).
	Revalidate(ctx context.Context, tags, paths []string, all bool)
	// IndexNow announces changed public URLs to search engines.
	IndexNow(ctx context.Context, paths []string)
}

// NopNotifier does nothing (tests, local runs).
type NopNotifier struct{}

func (NopNotifier) Revalidate(context.Context, []string, []string, bool) {}
func (NopNotifier) IndexNow(context.Context, []string)                   {}

// TurnstileVerifier validates Cloudflare Turnstile tokens.
type TurnstileVerifier interface {
	Verify(ctx context.Context, token, ip string) bool
}

// Server holds the API's dependencies.
type Server struct {
	Cfg       config.API
	Pool      *pgxpool.Pool
	Log       *slog.Logger
	Verifier  *authn.Verifier
	Notify    Notifier
	Turnstile TurnstileVerifier
	Now       func() time.Time
}

// Context keys / helpers for the authenticated principal.
type claimsKey struct{}

func claimsFrom(ctx context.Context) *authn.Claims {
	c, _ := ctx.Value(claimsKey{}).(*authn.Claims)
	return c
}

// Routes builds the router.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	s.publicRoutes(mux)
	s.publicWriteRoutes(mux)
	s.adminRoutes(mux)
	s.internalRoutes(mux)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { httpx.JSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := s.Pool.Ping(r.Context()); err != nil {
			httpx.Problem(w, http.StatusServiceUnavailable, "database unavailable")
			return
		}
		httpx.JSON(w, 200, map[string]string{"status": "ready"})
	})
	return httpx.Chain(mux, httpx.RequestID, httpx.RealIP(s.Cfg.TrustProxy), httpx.Recover(s.Log), httpx.Logger(s.Log),
		func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("X-Content-Type-Options", "nosniff")
				next.ServeHTTP(w, r)
			})
		})
}

// ── auth middleware ──────────────────────────────────────────────────────────

func (s *Server) cookieName(base string) string {
	if s.Cfg.SecureCookies {
		return "__Host-" + base
	}
	return base
}

func (s *Server) authenticate(r *http.Request) (*authn.Claims, bool) {
	token, viaCookie := "", false
	if a := r.Header.Get("Authorization"); strings.HasPrefix(a, "Bearer ") {
		token = strings.TrimPrefix(a, "Bearer ")
	} else if c, err := r.Cookie(s.cookieName("clinic_at")); err == nil {
		token, viaCookie = c.Value, true
	}
	if token == "" {
		return nil, false
	}
	claims, err := s.Verifier.Verify(token, s.Now())
	if err != nil {
		return nil, false
	}
	// Cookie-authenticated unsafe requests must be same-origin (CSRF).
	if viaCookie && !safeMethod(r.Method) && !sameOrigin(r, s.Cfg.PublicBaseURL) {
		return nil, false
	}
	return claims, true
}

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

func sameOrigin(r *http.Request, allowed string) bool {
	if o := r.Header.Get("Origin"); o != "" {
		return strings.TrimRight(o, "/") == allowed
	}
	return r.Header.Get("Sec-Fetch-Site") == "same-origin"
}

// requireAdmin allows human admins; with roles it additionally restricts to those roles.
func (s *Server) requireAdmin(h http.HandlerFunc, roles ...string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, ok := s.authenticate(r)
		if !ok || !c.IsAdmin() {
			httpx.Problem(w, http.StatusUnauthorized, "authentication required")
			return
		}
		if len(roles) > 0 {
			allowed := false
			for _, role := range roles {
				allowed = allowed || c.Role == role
			}
			if !allowed {
				httpx.Problem(w, http.StatusForbidden, "your role cannot access this resource")
				return
			}
		}
		h(w, r.WithContext(context.WithValue(r.Context(), claimsKey{}, c)))
	})
}

// requireService allows machine clients holding the jobs scope.
func (s *Server) requireService(h http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, ok := s.authenticate(r)
		if !ok || c.Role != authn.RoleService || !strings.Contains(" "+c.Scope+" ", " "+authn.ScopeJobs+" ") {
			httpx.Problem(w, http.StatusUnauthorized, "service token required")
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), claimsKey{}, c)))
	})
}

// ── shared helpers ───────────────────────────────────────────────────────────

func notFound(w http.ResponseWriter)               { httpx.Problem(w, http.StatusNotFound, "not found") }
func badRequest(w http.ResponseWriter, msg string) { httpx.Problem(w, http.StatusBadRequest, msg) }
func serverError(w http.ResponseWriter, log *slog.Logger, r *http.Request, err error) {
	log.Error("request failed", "id", httpx.ID(r.Context()), "path", r.URL.Path, "err", err)
	httpx.Problem(w, http.StatusInternalServerError, "internal error")
}

func isNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

// decode reads a JSON body with a size cap and unknown-field tolerance.
func decode(w http.ResponseWriter, r *http.Request, v any, maxBytes int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		badRequest(w, "invalid JSON body")
		return false
	}
	return true
}

// publicJSON writes a cacheable-by-Next but always-revalidated response.
func publicJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Cache-Control", "no-cache")
	httpx.JSON(w, 200, v)
}

func (s *Server) ipHash(r *http.Request) string {
	return httpx.HashIP(s.Cfg.IPHashSecret, httpx.ClientIP(r.Context()))
}
