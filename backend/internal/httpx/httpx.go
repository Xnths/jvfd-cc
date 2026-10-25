// Package httpx holds the HTTP plumbing shared by the Go services: middleware,
// error responses and client IP handling.
package httpx

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ctxKey int

const (
	ctxRequestID ctxKey = iota
	ctxClientIP
)

// Middleware wraps a handler.
type Middleware func(http.Handler) http.Handler

// Chain applies middleware so the first one is outermost.
func Chain(h http.Handler, mw ...Middleware) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}

// RequestID attaches a request id (taken from X-Request-ID if sane) to the context and response.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if len(id) == 0 || len(id) > 64 {
			b := make([]byte, 8)
			_, _ = rand.Read(b)
			id = hex.EncodeToString(b)
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxRequestID, id)))
	})
}

// ID returns the request id stored by RequestID.
func ID(ctx context.Context) string {
	s, _ := ctx.Value(ctxRequestID).(string)
	return s
}

// RealIP resolves the client address. Behind nginx/Cloudflare (trustProxy) it uses
// CF-Connecting-IP, then X-Real-IP; otherwise the TCP peer address. Headers are never
// trusted when the service is directly exposed.
func RealIP(trustProxy bool) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := peerIP(r)
			if trustProxy {
				for _, h := range []string{"CF-Connecting-IP", "X-Real-IP"} {
					if v := strings.TrimSpace(r.Header.Get(h)); v != "" {
						if a, err := netip.ParseAddr(v); err == nil {
							ip = a.String()
							break
						}
					}
				}
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxClientIP, ip)))
		})
	}
}

// ClientIP returns the address resolved by RealIP.
func ClientIP(ctx context.Context) string {
	s, _ := ctx.Value(ctxClientIP).(string)
	return s
}

func peerIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// HashIP returns a keyed hash of an IP so logs and tables never store raw addresses.
func HashIP(secret, ip string) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(ip))
	return hex.EncodeToString(m.Sum(nil))[:32]
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(c int) { s.status = c; s.ResponseWriter.WriteHeader(c) }

// Logger writes one structured line per request.
func Logger(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			sw := &statusWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(sw, r)
			log.Info("request", "id", ID(r.Context()), "method", r.Method, "path", r.URL.Path,
				"status", sw.status, "ms", time.Since(start).Milliseconds(), "ip", ClientIP(r.Context()))
		})
	}
}

// Recover turns panics into 500 responses.
func Recover(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					log.Error("panic", "id", ID(r.Context()), "value", v, "stack", string(debug.Stack()))
					Problem(w, http.StatusInternalServerError, "internal error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders sets conservative defaults for JSON/HTML responses of the services.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// OriginCheck is a CSRF guard for cookie-authenticated unsafe requests: the request must
// come from the site itself (Origin header, or Sec-Fetch-Site: same-origin).
func OriginCheck(allowedOrigin string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
				next.ServeHTTP(w, r)
				return
			}
			if origin := r.Header.Get("Origin"); origin != "" {
				if u, err := url.Parse(origin); err == nil && u.Scheme+"://"+u.Host == allowedOrigin {
					next.ServeHTTP(w, r)
					return
				}
				Problem(w, http.StatusForbidden, "cross-origin request rejected")
				return
			}
			if r.Header.Get("Sec-Fetch-Site") == "same-origin" {
				next.ServeHTTP(w, r)
				return
			}
			Problem(w, http.StatusForbidden, "missing origin")
		})
	}
}

// RateLimiter is a per-key token bucket with periodic cleanup.
type RateLimiter struct {
	mu      sync.Mutex
	r       rate.Limit
	burst   int
	entries map[string]*entry
}

type entry struct {
	l    *rate.Limiter
	seen time.Time
}

// NewRateLimiter allows `perMinute` requests per key with the given burst.
func NewRateLimiter(perMinute, burst int) *RateLimiter {
	rl := &RateLimiter{r: rate.Limit(float64(perMinute) / 60), burst: burst, entries: map[string]*entry{}}
	go func() {
		for range time.Tick(5 * time.Minute) {
			rl.mu.Lock()
			for k, e := range rl.entries {
				if time.Since(e.seen) > 10*time.Minute {
					delete(rl.entries, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

// Allow reports whether the key may proceed now.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	e, ok := rl.entries[key]
	if !ok {
		e = &entry{l: rate.NewLimiter(rl.r, rl.burst)}
		rl.entries[key] = e
	}
	e.seen = time.Now()
	return e.l.Allow()
}

// Middleware limits by client IP.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rl.Allow(ClientIP(r.Context())) {
			w.Header().Set("Retry-After", "30")
			Problem(w, http.StatusTooManyRequests, "too many requests")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Problem writes an RFC 9457 style error body.
func Problem(w http.ResponseWriter, status int, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"type": "about:blank", "title": http.StatusText(status), "status": status, "detail": detail,
	})
}

// JSON writes v as JSON with the given status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
