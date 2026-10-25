// Package newsletter sends one email per published post through an outbox: campaigns and their
// per-subscriber deliveries live in Postgres, so a crash or a retry never double-sends.
package newsletter

import (
	"bytes"
	"context"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed templates/post.html.tmpl
var postTemplateSrc string

var postTemplate = template.Must(template.New("post").Parse(postTemplateSrc))

// Brand line shown in the email header. The CRP is part of the professional identification
// the advertising rules require.
const Brand = "João Fernandes · CRP 06/157908 · Psicólogo"

const batchSize = 100

// Post is what the email needs to know about an article.
type Post struct {
	Title, Excerpt, Slug string
	PublishedAt          time.Time
}

// RenderPost renders the HTML body.
func RenderPost(p Post, siteURL, unsubscribeURL string) (string, error) {
	var b bytes.Buffer
	err := postTemplate.Execute(&b, map[string]string{
		"Title": p.Title, "Excerpt": p.Excerpt, "Brand": Brand, "SiteURL": siteURL,
		"Date":           longDatePT(p.PublishedAt),
		"ArticleURL":     siteURL + "/blog/" + p.Slug,
		"UnsubscribeURL": unsubscribeURL,
	})
	return b.String(), err
}

var months = []string{"janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"}

func longDatePT(t time.Time) string {
	return fmt.Sprintf("%d de %s de %d", t.Day(), months[t.Month()-1], t.Year())
}

// Sender delivers a batch of emails.
type Sender interface {
	// SendBatch sends the messages and returns one provider id per message. The key makes
	// retries of the same batch idempotent on the provider's side.
	SendBatch(ctx context.Context, key string, msgs []Message) ([]string, error)
}

// Message is one outgoing email.
type Message struct {
	From, To, Subject, HTML string
	Headers                 map[string]string
}

// Resend is a Sender backed by the Resend HTTP API.
type Resend struct {
	APIKey string
	Client *http.Client
}

// SendBatch implements Sender.
func (r Resend) SendBatch(ctx context.Context, key string, msgs []Message) ([]string, error) {
	type item struct {
		From    string            `json:"from"`
		To      []string          `json:"to"`
		Subject string            `json:"subject"`
		HTML    string            `json:"html"`
		Headers map[string]string `json:"headers,omitempty"`
	}
	payload := make([]item, len(msgs))
	for i, m := range msgs {
		payload[i] = item{From: m.From, To: []string{m.To}, Subject: m.Subject, HTML: m.HTML, Headers: m.Headers}
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails/batch", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+r.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", key)
	c := r.Client
	if c == nil {
		c = &http.Client{Timeout: 30 * time.Second}
	}
	resp, err := c.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("resend: status %d: %s", resp.StatusCode, truncate(string(raw), 300))
	}
	var out struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Data) != len(msgs) {
		return nil, fmt.Errorf("resend: unexpected response: %s", truncate(string(raw), 300))
	}
	ids := make([]string, len(out.Data))
	for i, d := range out.Data {
		ids[i] = d.ID
	}
	return ids, nil
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// Worker drains the outbox.
type Worker struct {
	Pool       *pgxpool.Pool
	Sender     Sender
	Log        *slog.Logger
	SiteURL    string
	From       string
	UnsubToken func(email string) string
	Now        func() time.Time
	staleClaim time.Duration
}

// NewWorker builds a worker with sensible defaults.
func NewWorker(pool *pgxpool.Pool, sender Sender, log *slog.Logger, siteURL string, unsub func(string) string) *Worker {
	return &Worker{Pool: pool, Sender: sender, Log: log, SiteURL: siteURL, UnsubToken: unsub, Now: time.Now,
		From: "João Fernandes <newsletter@psicologojoaofernandes.com>", staleClaim: 10 * time.Minute}
}

// Run polls until ctx is cancelled.
func (w *Worker) Run(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		if _, err := w.Drain(ctx); err != nil && ctx.Err() == nil {
			w.Log.Error("newsletter drain", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}

// Drain processes queued campaigns until none are left and returns how many emails were sent.
func (w *Worker) Drain(ctx context.Context) (int, error) {
	total := 0
	for {
		n, more, err := w.processOne(ctx)
		total += n
		if err != nil || !more {
			return total, err
		}
	}
}

type campaign struct {
	ID string
	Post
}

func (w *Worker) claim(ctx context.Context) (*campaign, error) {
	var c campaign
	err := w.Pool.QueryRow(ctx, `
		UPDATE newsletter_campaigns SET status = 'sending', claimed_at = now()
		WHERE id = (SELECT nc.id FROM newsletter_campaigns nc
			WHERE nc.status = 'queued' OR (nc.status = 'sending' AND nc.claimed_at < now() - $1::interval)
			ORDER BY nc.queued_at FOR UPDATE SKIP LOCKED LIMIT 1)
		RETURNING id::text, (SELECT title FROM posts WHERE id = post_id), (SELECT excerpt FROM posts WHERE id = post_id),
		  (SELECT slug::text FROM posts WHERE id = post_id), (SELECT coalesce(published_at, now()) FROM posts WHERE id = post_id)`,
		fmt.Sprintf("%d seconds", int(w.staleClaim.Seconds()))).Scan(&c.ID, &c.Title, &c.Excerpt, &c.Slug, &c.PublishedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

// processOne claims a campaign and sends all its pending deliveries.
func (w *Worker) processOne(ctx context.Context) (sent int, more bool, err error) {
	c, err := w.claim(ctx)
	if err != nil || c == nil {
		return 0, false, err
	}
	// Snapshot the audience once; later subscribers don't get old articles.
	if _, err := w.Pool.Exec(ctx, `INSERT INTO newsletter_deliveries (campaign_id, subscriber_id)
		SELECT $1::uuid, id FROM subscribers WHERE active ON CONFLICT DO NOTHING`, c.ID); err != nil {
		return 0, true, err
	}
	failed := 0
	for {
		rows, err := w.Pool.Query(ctx, `SELECT d.subscriber_id::text, s.email::text FROM newsletter_deliveries d JOIN subscribers s ON s.id = d.subscriber_id
			WHERE d.campaign_id = $1::uuid AND d.status = 'pending' AND s.active ORDER BY d.subscriber_id LIMIT $2`, c.ID, batchSize)
		if err != nil {
			return sent, true, err
		}
		type rec struct{ id, email string }
		var batch []rec
		for rows.Next() {
			var r rec
			if err := rows.Scan(&r.id, &r.email); err != nil {
				rows.Close()
				return sent, true, err
			}
			batch = append(batch, r)
		}
		rows.Close()
		if len(batch) == 0 {
			break
		}
		msgs := make([]Message, len(batch))
		ids := make([]string, len(batch))
		for i, r := range batch {
			unsub := w.SiteURL + "/api/unsubscribe?t=" + w.UnsubToken(r.email)
			html, err := RenderPost(c.Post, w.SiteURL, unsub)
			if err != nil {
				return sent, true, err
			}
			msgs[i] = Message{From: w.From, To: r.email, Subject: "Novo artigo: " + c.Title, HTML: html, Headers: map[string]string{
				"List-Unsubscribe":      "<" + unsub + ">",
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			}}
			ids[i] = r.id
		}
		sort.Strings(ids)
		sum := sha256.Sum256([]byte(strings.Join(ids, ",")))
		key := "campaign-" + c.ID + "-" + hex.EncodeToString(sum[:8])
		providerIDs, sendErr := w.Sender.SendBatch(ctx, key, msgs)
		if sendErr != nil {
			// Leave the batch pending; the stale-claim logic retries it later with the same key.
			_, _ = w.Pool.Exec(ctx, `UPDATE newsletter_campaigns SET last_error = $2 WHERE id = $1::uuid`, c.ID, sendErr.Error())
			w.Log.Warn("newsletter batch failed", "campaign", c.ID, "err", sendErr)
			return sent, false, nil
		}
		tx, err := w.Pool.Begin(ctx)
		if err != nil {
			return sent, true, err
		}
		for i, r := range batch {
			if _, err := tx.Exec(ctx, `UPDATE newsletter_deliveries SET status = 'sent', provider_id = $3, sent_at = now() WHERE campaign_id = $1::uuid AND subscriber_id = $2::uuid`, c.ID, r.id, providerIDs[i]); err != nil {
				tx.Rollback(ctx) //nolint:errcheck
				return sent, true, err
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return sent, true, err
		}
		sent += len(batch)
	}
	// Anyone who unsubscribed mid-campaign is skipped.
	_, _ = w.Pool.Exec(ctx, `UPDATE newsletter_deliveries d SET status = 'skipped' FROM subscribers s WHERE d.subscriber_id = s.id AND d.campaign_id = $1::uuid AND d.status = 'pending' AND NOT s.active`, c.ID)
	var total int
	_ = w.Pool.QueryRow(ctx, `SELECT count(*) FROM newsletter_deliveries WHERE campaign_id = $1::uuid AND status = 'sent'`, c.ID).Scan(&total)
	stats, _ := json.Marshal(map[string]int{"sent": total, "failed": failed})
	if _, err := w.Pool.Exec(ctx, `UPDATE newsletter_campaigns SET status = 'sent', sent_at = now(), stats = $2, last_error = '' WHERE id = $1::uuid`, c.ID, stats); err != nil {
		return sent, true, err
	}
	_, _ = w.Pool.Exec(ctx, `UPDATE posts SET newsletter_sent_at = now() WHERE id = (SELECT post_id FROM newsletter_campaigns WHERE id = $1::uuid)`, c.ID)
	w.Log.Info("newsletter sent", "campaign", c.ID, "post", c.Slug, "recipients", total)
	return sent, true, nil
}
