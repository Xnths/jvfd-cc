package api

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/google/uuid"
)

func (s *Server) jobAdminRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc) http.Handler { return s.requireAdmin(h) }
	mux.Handle("GET /api/v1/admin/jobs", a(s.adminListJobs))
	mux.Handle("GET /api/v1/admin/jobs/runs", a(s.adminJobRuns))
	mux.Handle("POST /api/v1/admin/jobs/{name}/trigger", a(s.adminTriggerJob))
	mux.Handle("GET /api/v1/admin/audit", a(s.adminAudit))
}

// adminListJobs: the jobs the API can run, with their latest run.
func (s *Server) adminListJobs(w http.ResponseWriter, r *http.Request) {
	names := make([]string, 0, len(jobs))
	for n := range jobs {
		names = append(names, n)
	}
	sort.Strings(names)
	type item struct {
		Name       string          `json:"name"`
		LastStatus *string         `json:"lastStatus"`
		LastStart  *time.Time      `json:"lastStartedAt"`
		LastEnd    *time.Time      `json:"lastFinishedAt"`
		Summary    json.RawMessage `json:"lastSummary"`
	}
	out := []item{}
	for _, n := range names {
		it := item{Name: n}
		_ = s.Pool.QueryRow(r.Context(), `SELECT status, started_at, finished_at, summary FROM job_runs WHERE job = $1 ORDER BY started_at DESC LIMIT 1`, n).
			Scan(&it.LastStatus, &it.LastStart, &it.LastEnd, &it.Summary)
		out = append(out, it)
	}
	httpx.JSON(w, 200, map[string]any{"jobs": out})
}

func (s *Server) adminJobRuns(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, job, idempotency_key, status, started_at, finished_at, summary, error
		FROM job_runs WHERE ($1 = '' OR job = $1) ORDER BY started_at DESC LIMIT $2`, r.URL.Query().Get("job"), limit)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, job, key, status, errMsg string
		var started time.Time
		var finished *time.Time
		var summary json.RawMessage
		if err := rows.Scan(&id, &job, &key, &status, &started, &finished, &summary, &errMsg); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "job": job, "key": key, "status": status, "startedAt": started, "finishedAt": finished, "summary": summary, "error": errMsg})
	}
	httpx.JSON(w, 200, map[string]any{"runs": out})
}

// adminTriggerJob runs a job now, without Airflow. It returns at once; the run shows up in /jobs/runs.
func (s *Server) adminTriggerJob(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if _, ok := jobs[name]; !ok {
		notFound(w)
		return
	}
	key := "manual-" + uuid.NewString()
	s.audit(r, "job.trigger", "job", name, map[string]any{"key": key})
	go func() {
		if res, err := s.executeJob(context.Background(), name, key); err != nil || res.Err != nil {
			s.Log.Warn("manual job did not finish cleanly", "job", name, "err", err)
		}
	}()
	httpx.JSON(w, http.StatusAccepted, map[string]string{"key": key})
}

func (s *Server) adminAudit(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.Pool.Query(r.Context(), `SELECT a.id, a.at, a.actor_type, coalesce(u.email, a.actor_id), a.action, a.entity_type, a.entity_id, a.meta
		FROM audit_log a LEFT JOIN admin_users u ON a.actor_type = 'admin' AND u.id::text = a.actor_id
		WHERE ($1 = '' OR a.action LIKE $1 || '%') ORDER BY a.id DESC LIMIT $2`, r.URL.Query().Get("action"), limit)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var at time.Time
		var actorType, actor, action, et, eid string
		var meta json.RawMessage
		if err := rows.Scan(&id, &at, &actorType, &actor, &action, &et, &eid, &meta); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "at": at, "actorType": actorType, "actor": actor, "action": action, "entityType": et, "entityId": eid, "meta": meta})
	}
	httpx.JSON(w, 200, map[string]any{"entries": out})
}
