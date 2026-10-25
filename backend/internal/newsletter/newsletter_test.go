package newsletter

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

type fakeSender struct {
	mu      sync.Mutex
	batches [][]Message
	keys    []string
	failN   int
}

func (f *fakeSender) SendBatch(_ context.Context, key string, msgs []Message) ([]string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failN > 0 {
		f.failN--
		return nil, fmt.Errorf("provider down")
	}
	f.batches = append(f.batches, msgs)
	f.keys = append(f.keys, key)
	ids := make([]string, len(msgs))
	for i := range ids {
		ids[i] = fmt.Sprintf("re_%d_%d", len(f.batches), i)
	}
	return ids, nil
}

func TestRenderPost(t *testing.T) {
	html, err := RenderPost(Post{Title: "Ansiedade <e> rotina", Excerpt: "Resumo", Slug: "ansiedade", PublishedAt: time.Date(2026, 10, 5, 0, 0, 0, 0, time.UTC)},
		"https://psicologojoaofernandes.com", "https://psicologojoaofernandes.com/api/unsubscribe?t=abc")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"CRP 06/157908", "5 de outubro de 2026", "https://psicologojoaofernandes.com/blog/ansiedade", "unsubscribe?t=abc", "Ansiedade &lt;e&gt; rotina"} {
		if !strings.Contains(html, want) {
			t.Errorf("missing %q", want)
		}
	}
	if strings.Contains(html, "12/16198") {
		t.Error("old CRP leaked into the template")
	}
}

func TestOutbox(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	db, _ := sql.Open("pgx", url)
	goose.SetBaseFS(migrations.FS)
	_ = goose.SetDialect("postgres")
	if _, err := db.Exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public`); err != nil {
		t.Fatal(err)
	}
	if err := goose.Up(db, "."); err != nil {
		t.Fatal(err)
	}
	db.Close()
	ctx := context.Background()
	pool, _ := pgxpool.New(ctx, url)
	defer pool.Close()

	if _, err := pool.Exec(ctx, `INSERT INTO posts (id, slug, title, excerpt, status, published_at, published_content) VALUES ('33333333-3333-3333-3333-333333333333','p','Título','Resumo','published',now(),'{}')`); err != nil {
		t.Fatal(err)
	}
	// 230 active subscribers (3 batches), 1 inactive
	if _, err := pool.Exec(ctx, `INSERT INTO subscribers (email, consented_at, active) SELECT 'user'||g||'@example.com', now(), true FROM generate_series(1,230) g`); err != nil {
		t.Fatal(err)
	}
	pool.Exec(ctx, `INSERT INTO subscribers (email, consented_at, active) VALUES ('off@example.com', now(), false)`)
	pool.Exec(ctx, `INSERT INTO newsletter_campaigns (post_id) VALUES ('33333333-3333-3333-3333-333333333333')`)

	snd := &fakeSender{failN: 1}
	w := NewWorker(pool, snd, slog.New(slog.NewTextHandler(io.Discard, nil)), "https://site.test", func(e string) string { return "tok-" + e })
	w.staleClaim = 0 // let a failed campaign be retried immediately in this test

	// First attempt fails at the provider: nothing is marked sent, nothing is lost.
	if n, err := w.Drain(ctx); err != nil || n != 0 {
		t.Fatalf("first drain: n=%d err=%v", n, err)
	}
	var status string
	pool.QueryRow(ctx, `SELECT status FROM newsletter_campaigns`).Scan(&status)
	if status != "sending" {
		t.Fatalf("status after provider failure: %s", status)
	}
	// Retry succeeds: 230 recipients, 3 batches (100,100,30), one-click headers present.
	n, err := w.Drain(ctx)
	if err != nil || n != 230 {
		t.Fatalf("second drain: n=%d err=%v", n, err)
	}
	if len(snd.batches) != 3 || len(snd.batches[0]) != 100 || len(snd.batches[2]) != 30 {
		t.Fatalf("batches: %d", len(snd.batches))
	}
	m := snd.batches[0][0]
	if m.Headers["List-Unsubscribe-Post"] != "List-Unsubscribe=One-Click" || !strings.Contains(m.Headers["List-Unsubscribe"], "/api/unsubscribe?t=tok-") || m.Subject != "Novo artigo: Título" {
		t.Fatalf("message: %+v", m)
	}
	for _, b := range snd.batches {
		for _, msg := range b {
			if msg.To == "off@example.com" {
				t.Fatal("inactive subscriber got the email")
			}
		}
	}
	// A further drain sends nothing: exactly once.
	if n, _ := w.Drain(ctx); n != 0 || len(snd.batches) != 3 {
		t.Fatalf("re-send: n=%d batches=%d", n, len(snd.batches))
	}
	var sentAt *time.Time
	pool.QueryRow(ctx, `SELECT newsletter_sent_at FROM posts`).Scan(&sentAt)
	pool.QueryRow(ctx, `SELECT status FROM newsletter_campaigns`).Scan(&status)
	if sentAt == nil || status != "sent" {
		t.Fatalf("final state: %v %s", sentAt, status)
	}
}
