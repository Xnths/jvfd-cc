package auth

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/Xnths/jvfd-cc/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// Runs the real rotation/reuse flow against PostgreSQL when TEST_DATABASE_URL is set.
func TestPGStoreFlow(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(migrations.FS)
	_ = goose.SetDialect("postgres")
	if err := goose.DownTo(db, ".", 0); err != nil {
		t.Fatal(err)
	}
	if err := goose.Up(db, "."); err != nil {
		t.Fatal(err)
	}
	db.Close()

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	priv, _, _ := authn.GenerateKey()
	sealer, _ := NewSealer("0123456789abcdef0123456789abcdef")
	now := time.Now()
	prov := &fakeProvider{id: Identity{Sub: "g1", Email: "joao@example.com", EmailVerified: true, Name: "João"}}
	svc := &Service{
		Cfg: config.Auth{IPHashSecret: "s", AdminEmails: config.ParseEmails("joao@example.com"),
			AdminRoles: config.ParseRoles("joao@example.com:clinical")},
		Store: NewPGStore(pool), Provider: prov, Signer: authn.NewSigner(priv, "i", "a"), Sealer: sealer,
		Now: func() time.Time { return now },
	}

	_, sealed := svc.StartLogin("/admin")
	t1, ret, err := svc.FinishLogin(ctx, sealed, prov.state, "code", "ip", "ua")
	if err != nil || ret != "/admin" {
		t.Fatalf("login: %v %q", err, ret)
	}
	now = now.Add(time.Minute)
	t2, err := svc.Refresh(ctx, t1.Refresh, "ip", "ua")
	if err != nil || t2.Refresh == "" {
		t.Fatalf("rotate: %v", err)
	}
	now = now.Add(2 * time.Minute)
	if _, err = svc.Refresh(ctx, t1.Refresh, "ip", "ua"); !errors.Is(err, ErrReuse) {
		t.Fatalf("want reuse, got %v", err)
	}
	if _, err = svc.Refresh(ctx, t2.Refresh, "ip", "ua"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("family should be revoked, got %v", err)
	}

	// same email, different Google account
	prov.id.Sub = "g2"
	_, sealed = svc.StartLogin("/admin")
	if _, _, err = svc.FinishLogin(ctx, sealed, prov.state, "c", "ip", "ua"); !errors.Is(err, ErrSubMismatch) {
		t.Fatalf("want sub mismatch, got %v", err)
	}
	var n int
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM audit_log WHERE action IN ('login.ok','refresh.reuse','login.failed')`).Scan(&n)
	if n < 3 {
		t.Fatalf("expected audit rows, got %d", n)
	}
}
