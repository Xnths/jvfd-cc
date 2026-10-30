package ads

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxAttempts = 10

// Worker sends due conversion_uploads rows. Kick() wakes it right after an insert; the ticker is the safety net.
type Worker struct {
	Pool  *pgxpool.Pool
	Up    Uploader
	Cfg   Config
	Log   *slog.Logger
	Now   func() time.Time
	kick  chan struct{}
	Batch int
}

func NewWorker(pool *pgxpool.Pool, up Uploader, cfg Config, log *slog.Logger) *Worker {
	return &Worker{Pool: pool, Up: up, Cfg: cfg, Log: log, Now: time.Now, kick: make(chan struct{}, 1), Batch: 100}
}

// Kick asks for an upload pass without blocking the caller. Safe on a nil Worker.
func (w *Worker) Kick() {
	if w == nil {
		return
	}
	select {
	case w.kick <- struct{}{}:
	default:
	}
}

// Run blocks until ctx is done.
func (w *Worker) Run(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		case <-w.kick:
		}
		if _, err := w.UploadPending(ctx); err != nil {
			w.Log.Error("ads upload", "err", err)
		}
	}
}

// Result of one pass.
type Result struct {
	Sent, Succeeded, Retried, Failed int
}

type row struct {
	id, leadID, stage     string
	at                    time.Time
	value                 *float64
	attempts              int
	gclid, gbraid, wbraid *string
}

// UploadPending locks due rows (SKIP LOCKED, so two workers never send the same conversion), uploads them in one
// request and records the outcome of each.
func (w *Worker) UploadPending(ctx context.Context) (Result, error) {
	var res Result
	tx, err := w.Pool.Begin(ctx)
	if err != nil {
		return res, err
	}
	defer tx.Rollback(ctx)
	rs, err := tx.Query(ctx, `SELECT cu.id::text, cu.lead_id::text, cu.stage, cu.conversion_time, cu.value::float8, cu.attempts,
		l.gclid, l.gbraid, l.wbraid
		FROM conversion_uploads cu JOIN leads l ON l.id = cu.lead_id
		WHERE cu.status IN ('pending','retry') AND cu.next_attempt_at <= now()
		ORDER BY cu.next_attempt_at LIMIT $1 FOR UPDATE OF cu SKIP LOCKED`, w.Batch)
	if err != nil {
		return res, err
	}
	var rows []row
	for rs.Next() {
		var r row
		if err := rs.Scan(&r.id, &r.leadID, &r.stage, &r.at, &r.value, &r.attempts, &r.gclid, &r.gbraid, &r.wbraid); err != nil {
			rs.Close()
			return res, err
		}
		rows = append(rows, r)
	}
	rs.Close()
	if len(rows) == 0 {
		return res, nil
	}
	convs := make([]Conversion, len(rows))
	for i, r := range rows {
		convs[i] = Conversion{Gclid: deref(r.gclid), Gbraid: deref(r.gbraid), Wbraid: deref(r.wbraid),
			Action: w.Cfg.action(r.stage), Time: r.at, Value: r.value, OrderID: r.leadID + ":" + r.stage}
	}
	out := w.Up.Upload(ctx, convs)
	if errors.Is(out.Err, ErrAuth) {
		w.Log.Error("ads auth error: uploads halted, rows stay pending", "err", out.Err)
		w.recordAuthError(ctx, out.Err)
		return res, out.Err
	}
	res.Sent = len(rows)
	for i, r := range rows {
		status, next, code, msg := w.classify(r, i, out)
		switch status {
		case "succeeded":
			res.Succeeded++
		case "retry":
			res.Retried++
		case "failed":
			res.Failed++
		}
		if err := w.save(ctx, tx, r, convs[i].Action, status, next, code, msg, out.Raw); err != nil {
			return res, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return res, err
	}
	_, _ = w.Pool.Exec(ctx, `DELETE FROM job_state WHERE key = 'ads.auth_error'`)
	return res, nil
}

func (w *Worker) classify(r row, i int, out Outcome) (status string, next time.Time, code, msg string) {
	now := w.Now()
	attempts := r.attempts + 1
	if out.Err != nil {
		if out.Transient {
			return retryOrFail(attempts, now, backoff(attempts), "REQUEST_ERROR", out.Err.Error())
		}
		return "failed", now, "REQUEST_REJECTED", out.Err.Error()
	}
	f, bad := out.Failures[i]
	if !bad {
		if whole, ok := out.Failures[-1]; ok {
			f, bad = whole, true
		}
	}
	if !bad {
		return "succeeded", now, "", ""
	}
	switch {
	case strings.Contains(f.Code, "DUPLICATE"):
		return "succeeded", now, f.Code, f.Message
	case f.Code == "TOO_RECENT_CLICK" || f.Code == "TOO_RECENT_EVENT" || f.Code == "TOO_RECENT_CONVERSION_ACTION":
		return retryOrFail(attempts, now, time.Hour, f.Code, f.Message)
	case f.Code == "CLICK_NOT_FOUND" || f.Code == "EVENT_NOT_FOUND":
		if attempts >= 3 {
			return "failed", now, f.Code, f.Message
		}
		return retryOrFail(attempts, now, time.Hour, f.Code, f.Message)
	case f.Code == "INTERNAL_ERROR" || f.Code == "TRANSIENT_ERROR" || f.Code == "RESOURCE_EXHAUSTED" ||
		f.Code == "RESOURCE_TEMPORARILY_EXHAUSTED" || f.Code == "QUOTA_ERROR" || f.Code == "RATE_EXCEEDED":
		return retryOrFail(attempts, now, backoff(attempts), f.Code, f.Message)
	}
	return "failed", now, f.Code, f.Message
}

func retryOrFail(attempts int, now time.Time, wait time.Duration, code, msg string) (string, time.Time, string, string) {
	if attempts >= maxAttempts {
		return "failed", now, code, msg
	}
	return "retry", now.Add(wait), code, msg
}

// backoff is 2^attempts minutes, capped at 6 hours.
func backoff(attempts int) time.Duration {
	if attempts > 9 {
		attempts = 9
	}
	d := time.Duration(1<<attempts) * time.Minute
	if d > 6*time.Hour {
		d = 6 * time.Hour
	}
	return d
}

func (w *Worker) save(ctx context.Context, tx pgx.Tx, r row, action, status string, next time.Time, code, msg string, raw json.RawMessage) error {
	var resp any
	if len(raw) > 0 && json.Valid(raw) {
		resp = raw
	}
	_, err := tx.Exec(ctx, `UPDATE conversion_uploads SET status = $2, attempts = attempts + 1, next_attempt_at = $3, conversion_action = $4,
		last_error_code = nullif($5,''), last_error_message = nullif($6,''), response = $7, updated_at = now() WHERE id::text = $1`,
		r.id, status, next, action, code, msg, resp)
	return err
}

func (w *Worker) recordAuthError(ctx context.Context, e error) {
	v, _ := json.Marshal(map[string]any{"error": e.Error(), "at": w.Now().UTC()})
	_, _ = w.Pool.Exec(ctx, `INSERT INTO job_state (key, value) VALUES ('ads.auth_error',$1)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, v)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
