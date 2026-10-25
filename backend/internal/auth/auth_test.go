package auth

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
)

type fakeProvider struct {
	id  Identity
	err error
	// captured from AuthURL
	state, nonce, challenge string
	// captured from Exchange
	gotVerifier string
}

func (f *fakeProvider) AuthURL(state, nonce, challenge string) string {
	f.state, f.nonce, f.challenge = state, nonce, challenge
	return "https://accounts.example/auth?state=" + state
}

func (f *fakeProvider) Exchange(_ context.Context, _ string, verifier, _ string) (Identity, error) {
	f.gotVerifier = verifier
	return f.id, f.err
}

type env struct {
	svc   *Service
	store *MemStore
	prov  *fakeProvider
	now   time.Time
	h     http.Handler
}

func newEnv(t *testing.T) *env {
	t.Helper()
	priv, _, err := authn.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	sealer, _ := NewSealer("0123456789abcdef0123456789abcdef")
	e := &env{store: NewMemStore(), prov: &fakeProvider{}, now: time.Date(2026, 10, 25, 12, 0, 0, 0, time.UTC)}
	e.svc = &Service{
		Cfg: config.Auth{
			PublicBaseURL: "https://site.test", Issuer: "https://site.test", Audience: "clinic", SecureCookies: true,
			IPHashSecret: "s",
			AdminEmails:  config.ParseEmails("Joao@Example.com, jonathas@example.com"),
			AdminRoles:   config.ParseRoles("joao@example.com:clinical,jonathas@example.com:tech"),
		},
		Store: e.store, Provider: e.prov, Signer: authn.NewSigner(priv, "https://site.test", "clinic"),
		Sealer: sealer, Now: func() time.Time { return e.now },
	}
	e.h = NewHandler(e.svc, slog.New(slog.NewTextHandler(io.Discard, nil))).Routes()
	return e
}

// login runs StartLogin+FinishLogin for the given Google identity.
func (e *env) login(t *testing.T, id Identity) (Tokens, string, error) {
	t.Helper()
	_, sealed := e.svc.StartLogin("/admin/leads")
	e.prov.id = id
	return e.svc.FinishLogin(context.Background(), sealed, e.prov.state, "code", "iphash", "ua")
}

var joao = Identity{Sub: "g-1", Email: "joao@example.com", EmailVerified: true, Name: "João"}

func TestLoginAllowlist(t *testing.T) {
	e := newEnv(t)

	// Allowed, with different letter case from the configured value.
	upper := joao
	upper.Email = "JOAO@Example.COM"
	tok, ret, err := e.login(t, upper)
	if err != nil {
		t.Fatalf("allowed admin rejected: %v", err)
	}
	if ret != "/admin/leads" || tok.Admin.Role != "clinical" || tok.Admin.Email != "joao@example.com" {
		t.Fatalf("unexpected result ret=%q admin=%+v", ret, tok.Admin)
	}

	// Another Google account: rejected, and no admin row is created for it.
	before := e.store.AdminCount()
	_, _, err = e.login(t, Identity{Sub: "g-9", Email: "stranger@gmail.com", EmailVerified: true})
	if !errors.Is(err, ErrNotAllowed) {
		t.Fatalf("want ErrNotAllowed, got %v", err)
	}
	if e.store.AdminCount() != before {
		t.Fatal("rejected login created an admin row")
	}

	// Unverified email is rejected even if on the allowlist.
	unv := joao
	unv.EmailVerified = false
	if _, _, err = e.login(t, unv); !errors.Is(err, ErrUnverified) {
		t.Fatalf("want ErrUnverified, got %v", err)
	}

	// Unlisted role defaults to least privilege.
	if r := e.svc.RoleFor("nobody@example.com"); r != config.RoleTech {
		t.Fatalf("default role = %q", r)
	}
}

func TestSubBinding(t *testing.T) {
	e := newEnv(t)
	if _, _, err := e.login(t, joao); err != nil {
		t.Fatal(err)
	}
	other := joao
	other.Sub = "different-google-account"
	if _, _, err := e.login(t, other); !errors.Is(err, ErrSubMismatch) {
		t.Fatalf("want ErrSubMismatch, got %v", err)
	}
}

func TestStateAndPKCE(t *testing.T) {
	e := newEnv(t)
	_, sealed := e.svc.StartLogin("/admin")
	if e.prov.challenge != PKCEChallenge(func() string { // verifier is inside the sealed cookie
		raw, _ := e.svc.Sealer.Open(sealed)
		return strings.Split(strings.Split(string(raw), `"v":"`)[1], `"`)[0]
	}()) {
		t.Fatal("PKCE challenge does not match verifier")
	}
	e.prov.id = joao

	// wrong state
	if _, _, err := e.svc.FinishLogin(context.Background(), sealed, "forged", "c", "", ""); !errors.Is(err, ErrBadState) {
		t.Fatalf("forged state: %v", err)
	}
	// tampered cookie
	if _, _, err := e.svc.FinishLogin(context.Background(), sealed[:len(sealed)-2]+"AA", e.prov.state, "c", "", ""); !errors.Is(err, ErrBadState) {
		t.Fatalf("tampered cookie: %v", err)
	}
	// expired
	e.now = e.now.Add(OAuthStateTTL + time.Minute)
	if _, _, err := e.svc.FinishLogin(context.Background(), sealed, e.prov.state, "c", "", ""); !errors.Is(err, ErrBadState) {
		t.Fatalf("expired state: %v", err)
	}
	// verifier reaches the provider
	e.now = e.now.Add(-OAuthStateTTL - time.Minute)
	if _, _, err := e.svc.FinishLogin(context.Background(), sealed, e.prov.state, "c", "", ""); err != nil {
		t.Fatal(err)
	}
	if e.prov.gotVerifier == "" {
		t.Fatal("code verifier not sent to provider")
	}
}

func TestSafeReturn(t *testing.T) {
	for in, want := range map[string]string{
		"":                       "/admin",
		"/admin/leads":           "/admin/leads",
		"//evil.com":             "/admin",
		"https://evil.com":       "/admin",
		"/\\evil.com":            "/admin",
		"javascript:alert(1)":    "/admin",
		"/ok\r\nSet-Cookie: a=b": "/admin",
	} {
		if got := SafeReturn(in); got != want {
			t.Errorf("SafeReturn(%q)=%q want %q", in, got, want)
		}
	}
}

func TestRefreshRotationAndReuse(t *testing.T) {
	e := newEnv(t)
	t1, _, err := e.login(t, joao)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()

	e.now = e.now.Add(time.Minute)
	t2, err := e.svc.Refresh(ctx, t1.Refresh, "", "")
	if err != nil || t2.Refresh == "" || t2.Refresh == t1.Refresh {
		t.Fatalf("rotation failed: %v %+v", err, t2)
	}

	// Concurrent tab inside the grace window: gets an access token, no new refresh token.
	e.now = e.now.Add(10 * time.Second)
	tg, err := e.svc.Refresh(ctx, t1.Refresh, "", "")
	if err != nil || tg.Refresh != "" || tg.Access == "" {
		t.Fatalf("grace refresh: %v %+v", err, tg)
	}

	// Outside the grace window the old token is a replay: whole family revoked.
	e.now = e.now.Add(time.Minute)
	if _, err = e.svc.Refresh(ctx, t1.Refresh, "", ""); !errors.Is(err, ErrReuse) {
		t.Fatalf("want ErrReuse, got %v", err)
	}
	if _, err = e.svc.Refresh(ctx, t2.Refresh, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("successor must be revoked after reuse, got %v", err)
	}
}

func TestRefreshRechecksAllowlistAndDisabled(t *testing.T) {
	e := newEnv(t)
	tk, _, _ := e.login(t, joao)
	ctx := context.Background()

	e.store.SetDisabled("joao@example.com", true)
	if _, err := e.svc.Refresh(ctx, tk.Refresh, "", ""); !errors.Is(err, ErrNotAllowed) {
		t.Fatalf("disabled admin refreshed: %v", err)
	}

	e2 := newEnv(t)
	tk2, _, _ := e2.login(t, joao)
	delete(e2.svc.Cfg.AdminEmails, "joao@example.com") // removed from ADMIN_EMAILS
	if _, err := e2.svc.Refresh(ctx, tk2.Refresh, "", ""); !errors.Is(err, ErrNotAllowed) {
		t.Fatalf("de-listed admin refreshed: %v", err)
	}
	if _, err := e2.svc.Refresh(ctx, tk2.Refresh, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("family must stay revoked: %v", err)
	}
}

func TestRefreshExpiredAndUnknown(t *testing.T) {
	e := newEnv(t)
	tk, _, _ := e.login(t, joao)
	if _, err := e.svc.Refresh(context.Background(), "garbage", "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatal("unknown token accepted")
	}
	e.now = e.now.Add(RefreshTTL + time.Hour)
	if _, err := e.svc.Refresh(context.Background(), tk.Refresh, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatal("expired token accepted")
	}
}

func TestLogoutRevokes(t *testing.T) {
	e := newEnv(t)
	tk, _, _ := e.login(t, joao)
	e.svc.Logout(context.Background(), tk.Refresh)
	if _, err := e.svc.Refresh(context.Background(), tk.Refresh, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("refresh after logout: %v", err)
	}
}

func TestClientCredentials(t *testing.T) {
	e := newEnv(t)
	e.store.AddClient(Client{ID: "airflow", SecretHash: HashSecret("s3cret"), Scopes: []string{authn.ScopeJobs}})
	tok, _, err := e.svc.ClientToken(context.Background(), "airflow", "s3cret")
	if err != nil {
		t.Fatal(err)
	}
	c, err := e.svc.Signer.Verifier().Verify(tok, e.now)
	if err != nil || c.Role != authn.RoleService || c.Scope != authn.ScopeJobs || c.IsAdmin() {
		t.Fatalf("bad service token: %v %+v", err, c)
	}
	for _, tc := range [][2]string{{"airflow", "wrong"}, {"nobody", "s3cret"}} {
		if _, _, err := e.svc.ClientToken(context.Background(), tc[0], tc[1]); err == nil {
			t.Fatalf("credentials %v accepted", tc)
		}
	}
}

func TestHTTPFlow(t *testing.T) {
	e := newEnv(t)
	do := func(method, path string, hdr map[string]string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, nil)
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		for _, c := range cookies {
			req.AddCookie(c)
		}
		rec := httptest.NewRecorder()
		e.h.ServeHTTP(rec, req)
		return rec
	}

	// login → redirect to provider and sealed state cookie with __Host- prefix
	rec := do("GET", "/auth/google/login?return=//evil.com", nil)
	if rec.Code != 302 || !strings.HasPrefix(rec.Header().Get("Location"), "https://accounts.example/auth") {
		t.Fatalf("login: %d %s", rec.Code, rec.Header().Get("Location"))
	}
	var oauthCookie *http.Cookie
	for _, c := range rec.Result().Cookies() {
		if c.Name == "__Host-clinic_oauth" {
			oauthCookie = c
			if !c.HttpOnly || !c.Secure || c.Path != "/" {
				t.Fatalf("oauth cookie flags: %+v", c)
			}
		}
	}
	if oauthCookie == nil {
		t.Fatal("no oauth cookie")
	}

	// callback for allowed admin → cookies + redirect to the (sanitised) default return
	e.prov.id = joao
	rec = do("GET", "/auth/google/callback?code=c&state="+url.QueryEscape(e.prov.state), nil, oauthCookie)
	if rec.Code != 303 || rec.Header().Get("Location") != "/admin" {
		t.Fatalf("callback: %d %s", rec.Code, rec.Header().Get("Location"))
	}
	var at, rt *http.Cookie
	for _, c := range rec.Result().Cookies() {
		switch c.Name {
		case "__Host-clinic_at":
			at = c
			if !c.HttpOnly || !c.Secure || c.Path != "/" || c.Domain != "" {
				t.Fatalf("access cookie flags: %+v", c)
			}
		case "__Secure-clinic_rt":
			rt = c
			if c.Path != "/auth" || !c.HttpOnly {
				t.Fatalf("refresh cookie flags: %+v", c)
			}
		}
	}
	if at == nil || rt == nil {
		t.Fatal("session cookies missing")
	}

	// /auth/me with the cookie
	rec = do("GET", "/auth/me", nil, at)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "joao@example.com") {
		t.Fatalf("me: %d %s", rec.Code, rec.Body.String())
	}
	if do("GET", "/auth/me", nil).Code != 401 {
		t.Fatal("me without cookie must be 401")
	}

	// callback for a stranger → denied, no session cookies
	_, sealed := e.svc.StartLogin("/admin")
	e.prov.id = Identity{Sub: "x", Email: "stranger@gmail.com", EmailVerified: true}
	rec = do("GET", "/auth/google/callback?code=c&state="+url.QueryEscape(e.prov.state), nil, &http.Cookie{Name: "__Host-clinic_oauth", Value: sealed})
	if rec.Header().Get("Location") != "/auth/denied?reason=forbidden" {
		t.Fatalf("stranger not denied: %s", rec.Header().Get("Location"))
	}
	for _, c := range rec.Result().Cookies() {
		if c.Name == "__Host-clinic_at" && c.Value != "" {
			t.Fatal("stranger got a session cookie")
		}
	}

	// POST /auth/refresh needs a same-origin request (CSRF guard)
	if rec = do("POST", "/auth/refresh", map[string]string{"Origin": "https://evil.test"}, rt); rec.Code != 403 {
		t.Fatalf("cross-origin refresh: %d", rec.Code)
	}
	if rec = do("POST", "/auth/refresh", map[string]string{"Origin": "https://site.test"}, rt); rec.Code != 200 {
		t.Fatalf("same-origin refresh: %d %s", rec.Code, rec.Body.String())
	}

	// GET /auth/refresh with a bad token goes to Google login, keeping the return path
	rec = do("GET", "/auth/refresh?return=/admin/leads", nil, &http.Cookie{Name: "__Secure-clinic_rt", Value: "bad"})
	if rec.Code != 303 || rec.Header().Get("Location") != "/auth/google/login?return=%2Fadmin%2Fleads" {
		t.Fatalf("refresh redirect: %d %s", rec.Code, rec.Header().Get("Location"))
	}

	// JWKS is public and lists the signing key
	rec = do("GET", "/.well-known/jwks.json", nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"Ed25519"`) {
		t.Fatalf("jwks: %d %s", rec.Code, rec.Body.String())
	}
}
