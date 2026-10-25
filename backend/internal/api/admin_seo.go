package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

func (s *Server) seoAdminRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc) http.Handler { return s.requireAdmin(h) }
	mux.Handle("GET /api/v1/admin/seo/overview", a(s.adminSEOOverview))
	mux.Handle("GET /api/v1/admin/seo/suggestions", a(s.adminSuggestions))
	mux.Handle("POST /api/v1/admin/seo/suggestions/{id}/apply", a(s.adminApplySuggestion))
	mux.Handle("POST /api/v1/admin/seo/suggestions/{id}/dismiss", a(s.adminDismissSuggestion))
	mux.Handle("GET /api/v1/admin/research/items", a(s.adminResearchItems))
	mux.Handle("POST /api/v1/admin/research/items/{id}/dismiss", a(s.adminDismissResearch))
	mux.Handle("GET /api/v1/admin/topics", a(s.adminTopics))
	mux.Handle("POST /api/v1/admin/topics", a(s.adminCreateTopic))
	mux.Handle("PATCH /api/v1/admin/topics/{id}", a(s.adminPatchTopic))
	mux.Handle("GET /api/v1/admin/calendar", a(s.adminCalendar))
	mux.Handle("POST /api/v1/admin/calendar", a(s.adminUpsertCalendar))
	mux.Handle("PUT /api/v1/admin/calendar/{id}", a(s.adminUpsertCalendar))
	mux.Handle("DELETE /api/v1/admin/calendar/{id}", a(s.adminDeleteCalendar))
}

func (s *Server) adminSEOOverview(w http.ResponseWriter, r *http.Request) {
	type totals struct {
		Clicks      int64   `json:"clicks"`
		Impressions int64   `json:"impressions"`
		CTR         float64 `json:"ctr"`
		Position    float64 `json:"position"`
	}
	var through *time.Time
	var cur, prev totals
	if err := s.Pool.QueryRow(r.Context(), `
		WITH b AS (SELECT max(date) AS d FROM gsc_daily)
		SELECT (SELECT d FROM b),
		  coalesce(sum(clicks) FILTER (WHERE date > b.d - 28), 0), coalesce(sum(impressions) FILTER (WHERE date > b.d - 28), 0),
		  coalesce(sum(position * impressions) FILTER (WHERE date > b.d - 28) / nullif(sum(impressions) FILTER (WHERE date > b.d - 28), 0), 0),
		  coalesce(sum(clicks) FILTER (WHERE date <= b.d - 28 AND date > b.d - 56), 0), coalesce(sum(impressions) FILTER (WHERE date <= b.d - 28 AND date > b.d - 56), 0),
		  coalesce(sum(position * impressions) FILTER (WHERE date <= b.d - 28 AND date > b.d - 56) / nullif(sum(impressions) FILTER (WHERE date <= b.d - 28 AND date > b.d - 56), 0), 0)
		FROM gsc_daily, b`).Scan(&through, &cur.Clicks, &cur.Impressions, &cur.Position, &prev.Clicks, &prev.Impressions, &prev.Position); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if cur.Impressions > 0 {
		cur.CTR = float64(cur.Clicks) / float64(cur.Impressions)
	}
	if prev.Impressions > 0 {
		prev.CTR = float64(prev.Clicks) / float64(prev.Impressions)
	}
	top := func(col string) []map[string]any {
		rows, err := s.Pool.Query(r.Context(), `WITH b AS (SELECT max(date) AS d FROM gsc_daily)
			SELECT `+col+`, sum(clicks), sum(impressions), sum(position * impressions) / nullif(sum(impressions), 0)
			FROM gsc_daily, b WHERE date > b.d - 28 GROUP BY 1 ORDER BY sum(clicks) DESC, sum(impressions) DESC LIMIT 10`)
		out := []map[string]any{}
		if err != nil {
			return out
		}
		defer rows.Close()
		for rows.Next() {
			var k string
			var c, i int64
			var p *float64
			if rows.Scan(&k, &c, &i, &p) == nil {
				out = append(out, map[string]any{"key": strings.TrimPrefix(strings.TrimPrefix(k, "https://psicologojoaofernandes.com"), "http://psicologojoaofernandes.com"), "clicks": c, "impressions": i, "position": p})
			}
		}
		return out
	}
	httpx.JSON(w, 200, map[string]any{
		"configured": os.Getenv("GSC_CREDENTIALS_FILE") != "" && os.Getenv("GSC_SITE_URL") != "",
		"through":    through, "current": cur, "previous": prev, "topPages": top("page"), "topQueries": top("query"),
	})
}

func (s *Server) adminSuggestions(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "new"
	}
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, kind, target_id, query, metrics, proposal, generated_by, status, updated_at FROM seo_suggestions
		WHERE status = $1 ORDER BY CASE kind WHEN 'low_ctr' THEN 1 WHEN 'striking_distance' THEN 2 WHEN 'decay' THEN 3 WHEN 'cannibalization' THEN 4 ELSE 5 END, updated_at DESC LIMIT 200`, status)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, kind, target, query, by, st string
		var metrics, proposal json.RawMessage
		var at time.Time
		if err := rows.Scan(&id, &kind, &target, &query, &metrics, &proposal, &by, &st, &at); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "kind": kind, "target": target, "query": query, "metrics": metrics, "proposal": proposal, "generatedBy": by, "status": st, "updatedAt": at})
	}
	httpx.JSON(w, 200, map[string]any{"suggestions": out})
}

// adminApplySuggestion does the mechanical part of a suggestion and says where to continue editing.
// It never changes live content: posts are drafts, questions land in the inbox.
func (s *Server) adminApplySuggestion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var kind, target, query string
	var proposal json.RawMessage
	if err := s.Pool.QueryRow(ctx, `SELECT kind, target_id, query, proposal FROM seo_suggestions WHERE id::text = $1 AND status = 'new'`, r.PathValue("id")).Scan(&kind, &target, &query, &proposal); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	next := target
	switch kind {
	case "content_gap":
		slug, err := s.uniquePostSlug(r, Slugify(query), "")
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		if _, err := s.Pool.Exec(ctx, `INSERT INTO posts (slug, title, content, origin, keywords) VALUES ($1,$2,$3,'gsc',$4)`, slug, capitalize(query), []byte(emptyLexical), query); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		next = "/blog/" + slug
	case "faq_candidate":
		if _, err := s.Pool.Exec(ctx, `INSERT INTO faq_questions (question, ip_hash) VALUES ($1, 'seo')`, capitalize(query)+"?"); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		next = "/admin/perguntas"
	}
	if _, err := s.Pool.Exec(ctx, `UPDATE seo_suggestions SET status = 'accepted', decided_by = $2::uuid, decided_at = now(), updated_at = now() WHERE id::text = $1`, r.PathValue("id"), s.actorID(r)); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "seo.apply", "seo_suggestion", r.PathValue("id"), map[string]any{"kind": kind})
	httpx.JSON(w, 200, map[string]any{"next": next, "kind": kind, "proposal": proposal})
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func (s *Server) adminDismissSuggestion(w http.ResponseWriter, r *http.Request) {
	tag, err := s.Pool.Exec(r.Context(), `UPDATE seo_suggestions SET status = 'dismissed', decided_by = $2::uuid, decided_at = now(), updated_at = now() WHERE id::text = $1`, r.PathValue("id"), s.actorID(r))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminResearchItems(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	rows, err := s.Pool.Query(r.Context(), `SELECT i.id::text, i.source, i.title, i.authors, i.journal, i.published_on, left(i.abstract, 600), i.url, coalesce(i.doi,''), i.pub_types, i.score, i.status, p.slug::text
		FROM research_items i LEFT JOIN posts p ON p.id = i.post_id WHERE ($1 = '' OR i.status = $1) ORDER BY i.created_at DESC, i.score DESC LIMIT 100`, status)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, src, title, authors, journal, abstract, url, doi, st string
		var pub *time.Time
		var types []string
		var score float32
		var slug *string
		if err := rows.Scan(&id, &src, &title, &authors, &journal, &pub, &abstract, &url, &doi, &types, &score, &st, &slug); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "source": src, "title": title, "authors": authors, "journal": journal, "publishedOn": pub, "abstract": abstract, "url": url, "doi": doi, "pubTypes": types, "score": score, "status": st, "postSlug": slug})
	}
	httpx.JSON(w, 200, map[string]any{"items": out})
}

func (s *Server) adminDismissResearch(w http.ResponseWriter, r *http.Request) {
	if _, err := s.Pool.Exec(r.Context(), `UPDATE research_items SET status = 'dismissed' WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminTopics(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, topic, rationale, source, target_date, priority, status, related_query FROM topic_queue
		WHERE ($1 = '' OR status = $1) ORDER BY (status = 'queued') DESC, priority DESC, target_date NULLS LAST LIMIT 200`, r.URL.Query().Get("status"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, topic, why, src, st, q string
		var date *time.Time
		var prio int
		if err := rows.Scan(&id, &topic, &why, &src, &date, &prio, &st, &q); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "topic": topic, "rationale": why, "source": src, "targetDate": date, "priority": prio, "status": st, "relatedQuery": q})
	}
	httpx.JSON(w, 200, map[string]any{"topics": out})
}

func (s *Server) adminCreateTopic(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Topic      string  `json:"topic"`
		Rationale  string  `json:"rationale"`
		TargetDate *string `json:"targetDate"`
	}
	if !decode(w, r, &in, 4096) {
		return
	}
	if strings.TrimSpace(in.Topic) == "" {
		badRequest(w, "topic is required")
		return
	}
	var id string
	if err := s.Pool.QueryRow(r.Context(), `INSERT INTO topic_queue (topic, rationale, source, target_date, priority) VALUES ($1,$2,'manual',nullif($3,'')::date,50) RETURNING id::text`,
		strings.TrimSpace(in.Topic), in.Rationale, derefStr(in.TargetDate)).Scan(&id); err != nil {
		badRequest(w, "invalid data")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) adminPatchTopic(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status *string `json:"status"`
		Topic  *string `json:"topic"`
	}
	if !decode(w, r, &in, 2048) {
		return
	}
	if in.Status != nil && *in.Status != "queued" && *in.Status != "in_progress" && *in.Status != "done" && *in.Status != "dismissed" {
		badRequest(w, "invalid status")
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE topic_queue SET status = coalesce($2, status), topic = coalesce($3, topic) WHERE id::text = $1`, r.PathValue("id"), in.Status, in.Topic); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminCalendar(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, name, start_md, end_md, topics, lead_days, active FROM awareness_calendar ORDER BY start_md`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, sm, em string
		var topics []string
		var lead int
		var active bool
		if err := rows.Scan(&id, &name, &sm, &em, &topics, &lead, &active); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "name": name, "startMd": sm, "endMd": em, "topics": topics, "leadDays": lead, "active": active})
	}
	httpx.JSON(w, 200, map[string]any{"events": out})
}

func (s *Server) adminUpsertCalendar(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name     string   `json:"name"`
		StartMD  string   `json:"startMd"`
		EndMD    string   `json:"endMd"`
		Topics   []string `json:"topics"`
		LeadDays int      `json:"leadDays"`
		Active   *bool    `json:"active"`
	}
	if !decode(w, r, &in, 4096) {
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		badRequest(w, "name is required")
		return
	}
	if in.Topics == nil {
		in.Topics = []string{}
	}
	if in.LeadDays <= 0 {
		in.LeadDays = 42
	}
	active := in.Active == nil || *in.Active
	var err error
	if id := r.PathValue("id"); id == "" {
		_, err = s.Pool.Exec(r.Context(), `INSERT INTO awareness_calendar (name, start_md, end_md, topics, lead_days, active) VALUES ($1,$2,$3,$4,$5,$6)`, in.Name, in.StartMD, in.EndMD, in.Topics, in.LeadDays, active)
	} else {
		_, err = s.Pool.Exec(r.Context(), `UPDATE awareness_calendar SET name=$2, start_md=$3, end_md=$4, topics=$5, lead_days=$6, active=$7 WHERE id::text = $1`, id, in.Name, in.StartMD, in.EndMD, in.Topics, in.LeadDays, active)
	}
	if err != nil {
		badRequest(w, "dates must be MM-DD")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeleteCalendar(w http.ResponseWriter, r *http.Request) {
	if _, err := s.Pool.Exec(r.Context(), `DELETE FROM awareness_calendar WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
