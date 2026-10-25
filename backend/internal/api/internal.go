package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

// JobFunc runs one scheduled job. It must be idempotent: Airflow may retry it.
type JobFunc func(ctx context.Context, s *Server) (map[string]any, error)

// jobs is the registry of internal jobs (filled by other files in this package).
var jobs = map[string]JobFunc{
	"retention.cleanup":    jobRetentionCleanup,
	"newsletter.reconcile": jobNewsletterReconcile,
}

func (s *Server) internalRoutes(mux *http.ServeMux) {
	mux.Handle("POST /api/v1/internal/jobs/{name}", s.requireService(s.runJob))
	mux.Handle("GET /api/v1/internal/jobs/runs/{id}", s.requireService(s.getJobRun))
	mux.Handle("POST /api/v1/internal/jobs-report", s.requireService(s.reportRun))
}

// jobResult is what executing a job returns to its caller.
type jobResult struct {
	ID       string
	Status   string // ok | failed
	Summary  any
	Replayed bool
	Err      error
}

var errJobInProgress = errors.New("this job run is already in progress")

// executeJob runs a registered job once per (name, key). The key (Airflow's run_id, or "manual-<uuid>" from the
// admin UI) makes retries return the stored result instead of repeating the work.
func (s *Server) executeJob(ctx context.Context, name, key string) (jobResult, error) {
	fn, ok := jobs[name]
	if !ok {
		return jobResult{}, errUnknownJob
	}
	// Claim the run: a fresh key inserts a row; a failed or abandoned (>15 min) row is reclaimed.
	var id string
	err := s.Pool.QueryRow(ctx, `INSERT INTO job_runs (job, idempotency_key) VALUES ($1,$2)
		ON CONFLICT (job, idempotency_key) DO UPDATE SET status = 'running', started_at = now(), finished_at = NULL, error = ''
		  WHERE job_runs.status = 'failed' OR (job_runs.status = 'running' AND job_runs.started_at < now() - interval '15 minutes')
		RETURNING id::text`, name, key).Scan(&id)
	if isNoRows(err) { // an identical run is finished or in progress
		var status string
		var summary json.RawMessage
		if err := s.Pool.QueryRow(ctx, `SELECT id::text, status, summary FROM job_runs WHERE job = $1 AND idempotency_key = $2`, name, key).Scan(&id, &status, &summary); err != nil {
			return jobResult{}, err
		}
		if status == "ok" {
			return jobResult{ID: id, Status: "ok", Summary: summary, Replayed: true}, nil
		}
		return jobResult{ID: id}, errJobInProgress
	}
	if err != nil {
		return jobResult{}, err
	}
	runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Minute)
	defer cancel()
	result, jobErr := fn(runCtx, s)
	b, _ := json.Marshal(result)
	if jobErr != nil {
		_, _ = s.Pool.Exec(runCtx, `UPDATE job_runs SET status = 'failed', finished_at = now(), error = $2, summary = $3 WHERE id::text = $1`, id, jobErr.Error(), b)
		s.Log.Error("job failed", "job", name, "err", jobErr)
		return jobResult{ID: id, Status: "failed", Summary: result, Err: jobErr}, nil
	}
	_, _ = s.Pool.Exec(runCtx, `UPDATE job_runs SET status = 'ok', finished_at = now(), summary = $2, error = '' WHERE id::text = $1`, id, b)
	return jobResult{ID: id, Status: "ok", Summary: result}, nil
}

var errUnknownJob = errors.New("unknown job")

// runJob is the Airflow-facing endpoint: synchronous, idempotent on the Idempotency-Key header.
func (s *Server) runJob(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if key == "" || len(key) > 200 {
		badRequest(w, "Idempotency-Key header required")
		return
	}
	res, err := s.executeJob(r.Context(), r.PathValue("name"), key)
	switch {
	case errors.Is(err, errUnknownJob):
		notFound(w)
	case errors.Is(err, errJobInProgress):
		httpx.Problem(w, http.StatusConflict, err.Error())
	case err != nil:
		serverError(w, s.Log, r, err)
	case res.Err != nil:
		httpx.Problem(w, http.StatusInternalServerError, "job failed: "+res.Err.Error())
	default:
		out := map[string]any{"id": res.ID, "status": res.Status, "summary": res.Summary}
		if res.Replayed {
			out["replayed"] = true
		}
		httpx.JSON(w, 200, out)
	}
}

// reportRun lets non-Go tasks (backups run by Airflow) leave a record next to the Go jobs.
func (s *Server) reportRun(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Job     string          `json:"job"`
		Key     string          `json:"key"`
		Status  string          `json:"status"`
		Summary json.RawMessage `json:"summary"`
		Error   string          `json:"error"`
	}
	if !decode(w, r, &in, 16<<10) {
		return
	}
	if in.Job == "" || in.Key == "" || (in.Status != "ok" && in.Status != "failed") {
		badRequest(w, "job, key and status (ok|failed) are required")
		return
	}
	if len(in.Summary) == 0 {
		in.Summary = []byte(`{}`)
	}
	if _, err := s.Pool.Exec(r.Context(), `INSERT INTO job_runs (job, idempotency_key, status, finished_at, summary, error) VALUES ($1,$2,$3,now(),$4,$5)
		ON CONFLICT (job, idempotency_key) DO UPDATE SET status = EXCLUDED.status, finished_at = now(), summary = EXCLUDED.summary, error = EXCLUDED.error`,
		in.Job, in.Key, in.Status, []byte(in.Summary), in.Error); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getJobRun(w http.ResponseWriter, r *http.Request) {
	var job, status, errMsg string
	var started time.Time
	var finished *time.Time
	var summary json.RawMessage
	err := s.Pool.QueryRow(r.Context(), `SELECT job, status, started_at, finished_at, summary, error FROM job_runs WHERE id::text = $1`, r.PathValue("id")).
		Scan(&job, &status, &started, &finished, &summary, &errMsg)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		badRequest(w, "invalid id")
		return
	}
	httpx.JSON(w, 200, map[string]any{"job": job, "status": status, "startedAt": started, "finishedAt": finished, "summary": summary, "error": errMsg})
}

// jobRetentionCleanup applies the data-retention promises of the privacy policy.
func jobRetentionCleanup(ctx context.Context, s *Server) (map[string]any, error) {
	res := map[string]any{}
	for name, q := range map[string]string{
		"leads_deleted":     `DELETE FROM leads WHERE clicked_at < now() - interval '90 days'`,
		"comments_deleted":  `DELETE FROM comments WHERE status IN ('rejected','spam') AND created_at < now() - interval '30 days'`,
		"sessions_deleted":  `DELETE FROM sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`,
		"questions_deleted": `DELETE FROM faq_questions WHERE status IN ('rejected','spam') AND created_at < now() - interval '30 days'`,
		"audit_deleted":     `DELETE FROM audit_log WHERE at < now() - interval '400 days'`,
	} {
		tag, err := s.Pool.Exec(ctx, q)
		if err != nil {
			return res, err
		}
		res[name] = tag.RowsAffected()
	}
	return res, nil
}

// jobNewsletterReconcile is the backstop for the outbox worker: campaigns a crashed worker left "sending" go back to
// the queue (deliveries already sent are never repeated: the unique (campaign, subscriber) rows decide).
func jobNewsletterReconcile(ctx context.Context, s *Server) (map[string]any, error) {
	res := map[string]any{}
	tag, err := s.Pool.Exec(ctx, `UPDATE newsletter_campaigns SET status = 'queued' WHERE status = 'sending' AND claimed_at < now() - interval '30 minutes'`)
	if err != nil {
		return res, err
	}
	res["requeued_campaigns"] = tag.RowsAffected()
	var queued, pending, failed int64
	if err := s.Pool.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM newsletter_campaigns WHERE status = 'queued'),
		(SELECT count(*) FROM newsletter_deliveries WHERE status = 'pending'),
		(SELECT count(*) FROM newsletter_deliveries WHERE status = 'failed')`).Scan(&queued, &pending, &failed); err != nil {
		return res, err
	}
	res["queued_campaigns"], res["pending_deliveries"], res["failed_deliveries"] = queued, pending, failed
	return res, nil
}
