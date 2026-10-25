package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

// JobFunc runs one scheduled job. It must be idempotent: Airflow may retry it.
type JobFunc func(ctx context.Context, s *Server) (map[string]any, error)

// jobs is the registry of internal jobs (filled by other files in this package).
var jobs = map[string]JobFunc{
	"retention.cleanup": jobRetentionCleanup,
}

func (s *Server) internalRoutes(mux *http.ServeMux) {
	mux.Handle("POST /api/v1/internal/jobs/{name}", s.requireService(s.runJob))
	mux.Handle("GET /api/v1/internal/jobs/runs/{id}", s.requireService(s.getJobRun))
}

// runJob executes a job synchronously. The Idempotency-Key (Airflow's run_id) makes retries
// return the stored result instead of repeating the work.
func (s *Server) runJob(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	fn, ok := jobs[name]
	if !ok {
		notFound(w)
		return
	}
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if key == "" || len(key) > 200 {
		badRequest(w, "Idempotency-Key header required")
		return
	}
	// Claim the run: a fresh key inserts a row; a failed or abandoned (>15 min) row is reclaimed.
	var id string
	err := s.Pool.QueryRow(r.Context(), `INSERT INTO job_runs (job, idempotency_key) VALUES ($1,$2)
		ON CONFLICT (job, idempotency_key) DO UPDATE SET status = 'running', started_at = now(), finished_at = NULL, error = ''
		  WHERE job_runs.status = 'failed' OR (job_runs.status = 'running' AND job_runs.started_at < now() - interval '15 minutes')
		RETURNING id::text`, name, key).Scan(&id)
	if isNoRows(err) { // an identical run is finished or in progress
		var status string
		var summary json.RawMessage
		if err := s.Pool.QueryRow(r.Context(), `SELECT id::text, status, summary FROM job_runs WHERE job = $1 AND idempotency_key = $2`, name, key).Scan(&id, &status, &summary); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		if status == "ok" {
			httpx.JSON(w, 200, map[string]any{"id": id, "status": "ok", "summary": summary, "replayed": true})
			return
		}
		httpx.Problem(w, http.StatusConflict, "this job run is already in progress")
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 10*time.Minute)
	defer cancel()
	result, jobErr := fn(ctx, s)
	b, _ := json.Marshal(result)
	if jobErr != nil {
		_, _ = s.Pool.Exec(ctx, `UPDATE job_runs SET status = 'failed', finished_at = now(), error = $2, summary = $3 WHERE id::text = $1`, id, jobErr.Error(), b)
		s.Log.Error("job failed", "job", name, "err", jobErr)
		httpx.Problem(w, http.StatusInternalServerError, "job failed: "+jobErr.Error())
		return
	}
	_, _ = s.Pool.Exec(ctx, `UPDATE job_runs SET status = 'ok', finished_at = now(), summary = $2, error = '' WHERE id::text = $1`, id, b)
	httpx.JSON(w, 200, map[string]any{"id": id, "status": "ok", "summary": result})
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
