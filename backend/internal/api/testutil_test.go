package api

import (
	"context"
	"database/sql"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/Xnths/jvfd-cc/backend/migrations"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

type fakeTurnstile struct{ ok bool }

func (f fakeTurnstile) Verify(context.Context, string, string) bool { return f.ok }

type recordingNotifier struct {
	tags, paths, index []string
	all                bool
}

func (n *recordingNotifier) Revalidate(_ context.Context, tags, paths []string, all bool) {
	n.tags, n.paths, n.all = append(n.tags, tags...), append(n.paths, paths...), n.all || all
}
func (n *recordingNotifier) IndexNow(_ context.Context, paths []string) {
	n.index = append(n.index, paths...)
}

type testEnv struct {
	t      *testing.T
	srv    *Server
	h      http.Handler
	signer *authn.Signer
	notes  *recordingNotifier
}

// newTestEnv migrates a clean database (TEST_DATABASE_URL) and builds a Server.
func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(migrations.FS)
	_ = goose.SetDialect("postgres")
	// Start from an empty schema (also drops goose's version table).
	if _, err := db.Exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public`); err != nil {
		t.Fatal(err)
	}
	if err := goose.Up(db, "."); err != nil {
		t.Fatal(err)
	}
	db.Close()
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	priv, _, _ := authn.GenerateKey()
	signer := authn.NewSigner(priv, "https://site.test", "clinic")
	notes := &recordingNotifier{}
	srv := &Server{
		Cfg:  config.API{PublicBaseURL: "https://site.test", IPHashSecret: "ip", UnsubscribeKey: "unsub-key", MediaDir: t.TempDir(), Issuer: "https://site.test", Audience: "clinic"},
		Pool: pool, Log: slog.New(slog.NewTextHandler(io.Discard, nil)), Verifier: signer.Verifier(),
		Notify: notes, Turnstile: fakeTurnstile{ok: true}, Now: time.Now,
	}
	// The test tokens' subject is a real admin row, as it is in production (FK targets for audit/moderation/uploads).
	if _, err := pool.Exec(context.Background(), `INSERT INTO admin_users (id, email, role) VALUES ('00000000-0000-0000-0000-000000000001','tech@test','tech')`); err != nil {
		t.Fatal(err)
	}
	return &testEnv{t: t, srv: srv, h: srv.Routes(), signer: signer, notes: notes}
}

func (e *testEnv) token(role string) string {
	e.t.Helper()
	c := authn.Claims{Role: role, Email: "x@test", RegisteredClaims: jwt.RegisteredClaims{Subject: "00000000-0000-0000-0000-000000000001"}}
	if role == authn.RoleService {
		c.Scope = authn.ScopeJobs
	}
	tok, err := e.signer.Sign(c, time.Minute, time.Now())
	if err != nil {
		e.t.Fatal(err)
	}
	return tok
}

func (e *testEnv) do(method, path, body, bearer string, hdr ...string) *httptest.ResponseRecorder {
	e.t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	for i := 0; i+1 < len(hdr); i += 2 {
		req.Header.Set(hdr[i], hdr[i+1])
	}
	req.RemoteAddr = "203.0.113.7:1234"
	rec := httptest.NewRecorder()
	e.h.ServeHTTP(rec, req)
	return rec
}

func (e *testEnv) exec(sql string, args ...any) {
	e.t.Helper()
	if _, err := e.srv.Pool.Exec(context.Background(), sql, args...); err != nil {
		e.t.Fatalf("exec %q: %v", sql, err)
	}
}
