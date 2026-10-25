package api

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"github.com/Xnths/jvfd-cc/backend/internal/copylint"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
)

func (s *Server) adminInboxRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc, roles ...string) http.Handler { return s.requireAdmin(h, roles...) }

	mux.Handle("GET /api/v1/admin/comments", a(s.adminListComments))
	mux.Handle("PATCH /api/v1/admin/comments/{id}", a(s.adminModerateComment))
	mux.Handle("POST /api/v1/admin/comments/bulk", a(s.adminBulkComments))
	mux.Handle("DELETE /api/v1/admin/comments/{id}", a(s.adminDeleteComment))

	mux.Handle("GET /api/v1/admin/leads", a(s.adminListLeads))
	mux.Handle("PATCH /api/v1/admin/leads/{id}/status", a(s.adminLeadStatus))
	mux.Handle("GET /api/v1/admin/leads/export", a(s.adminExportLeads))

	// Patient-related data: João (clinical) only. Jonathas (tech) never sees it.
	mux.Handle("GET /api/v1/admin/contatos", a(s.adminListContatos, onlyClinical...))
	mux.Handle("PATCH /api/v1/admin/contatos/{id}", a(s.adminPatchContato, onlyClinical...))
	mux.Handle("DELETE /api/v1/admin/contatos/{id}", a(s.adminDeleteContato, onlyClinical...))
	mux.Handle("GET /api/v1/admin/faq-questions", a(s.adminListQuestions, onlyClinical...))
	mux.Handle("PUT /api/v1/admin/faq-questions/{id}", a(s.adminAnswerQuestion, onlyClinical...))
	mux.Handle("POST /api/v1/admin/faq-questions/{id}/publish", a(s.adminPublishQuestion, onlyClinical...))
	mux.Handle("POST /api/v1/admin/faq-questions/{id}/reject", a(s.adminRejectQuestion, onlyClinical...))

	mux.Handle("GET /api/v1/admin/subscribers", a(s.adminListSubscribers))
	mux.Handle("DELETE /api/v1/admin/subscribers/{id}", a(s.adminDeleteSubscriber))
	mux.Handle("GET /api/v1/admin/subscribers/export.csv", a(s.adminExportSubscribers))
}

// ── comments ─────────────────────────────────────────────────────────────────

func (s *Server) adminListComments(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	rows, err := s.Pool.Query(r.Context(), `SELECT c.id::text, c.post_id::text, p.title, p.slug::text, c.author_name, c.body, c.status, c.created_at
		FROM comments c JOIN posts p ON p.id = c.post_id WHERE ($1 = '' OR c.status = $1) ORDER BY c.created_at DESC LIMIT 300`, status)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type c struct {
		ID, PostID, PostTitle, PostSlug, AuthorName, Body, Status string
		CreatedAt                                                 time.Time
	}
	out := []map[string]any{}
	for rows.Next() {
		var x c
		if err := rows.Scan(&x.ID, &x.PostID, &x.PostTitle, &x.PostSlug, &x.AuthorName, &x.Body, &x.Status, &x.CreatedAt); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": x.ID, "postId": x.PostID, "postTitle": x.PostTitle, "postSlug": x.PostSlug,
			"authorName": x.AuthorName, "body": x.Body, "status": x.Status, "createdAt": x.CreatedAt})
	}
	httpx.JSON(w, 200, map[string]any{"comments": out})
}

var commentStatuses = map[string]bool{"pending": true, "approved": true, "rejected": true, "spam": true}

func (s *Server) moderate(r *http.Request, ids []string, status string) (int64, error) {
	tag, err := s.Pool.Exec(r.Context(), `UPDATE comments SET status = $2, moderated_by = $3::uuid, moderated_at = now() WHERE id::text = ANY($1)`, ids, status, s.actorID(r))
	if err != nil {
		return 0, err
	}
	s.Notify.Revalidate(r.Context(), []string{tagComments}, nil, false)
	s.audit(r, "comment."+status, "comment", strings.Join(ids, ","), nil)
	return tag.RowsAffected(), nil
}

func (s *Server) adminModerateComment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &in, 512) || !commentStatuses[in.Status] {
		if in.Status != "" && !commentStatuses[in.Status] {
			badRequest(w, "invalid status")
		}
		return
	}
	n, err := s.moderate(r, []string{r.PathValue("id")}, in.Status)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if n == 0 {
		notFound(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminBulkComments(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs    []string `json:"ids"`
		Status string   `json:"status"`
	}
	if !decode(w, r, &in, 16<<10) {
		return
	}
	if !commentStatuses[in.Status] || len(in.IDs) == 0 || len(in.IDs) > 200 {
		badRequest(w, "invalid request")
		return
	}
	n, err := s.moderate(r, in.IDs, in.Status)
	if err != nil {
		badRequest(w, "invalid ids")
		return
	}
	httpx.JSON(w, 200, map[string]any{"updated": n})
}

func (s *Server) adminDeleteComment(w http.ResponseWriter, r *http.Request) {
	tag, err := s.Pool.Exec(r.Context(), `DELETE FROM comments WHERE id::text = $1`, r.PathValue("id"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	s.audit(r, "comment.delete", "comment", r.PathValue("id"), nil)
	s.Notify.Revalidate(r.Context(), []string{tagComments}, nil, false)
	w.WriteHeader(http.StatusNoContent)
}

// ── leads ────────────────────────────────────────────────────────────────────

func (s *Server) adminListLeads(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, gclid, clicked_at, status, qualified_at, converted_at FROM leads
		WHERE ($1 = '' OR status = $1) ORDER BY created_at DESC LIMIT $2`, r.URL.Query().Get("status"), limit)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, gclid, status string
		var clicked time.Time
		var q, c *time.Time
		if err := rows.Scan(&id, &gclid, &clicked, &status, &q, &c); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "gclid": gclid, "clickedAt": clicked, "status": status, "qualifiedAt": q, "convertedAt": c})
	}
	httpx.JSON(w, 200, map[string]any{"leads": out})
}

func (s *Server) adminLeadStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status      string  `json:"status"`
		ConvertedAt *string `json:"convertedAt"`
		QualifiedAt *string `json:"qualifiedAt"`
	}
	if !decode(w, r, &in, 1024) {
		return
	}
	if in.Status != "clicked" && in.Status != "qualified" && in.Status != "converted" {
		badRequest(w, "Status inválido.")
		return
	}
	parse := func(p *string) (*time.Time, bool) {
		if p == nil || *p == "" {
			return nil, true
		}
		t, err := time.Parse(time.RFC3339, *p)
		if err != nil {
			return nil, false
		}
		return &t, true
	}
	conv, ok1 := parse(in.ConvertedAt)
	qual, ok2 := parse(in.QualifiedAt)
	if !ok1 || !ok2 {
		badRequest(w, "invalid date")
		return
	}
	// Same semantics as the old route: converting sets convertedAt (given, or now if still empty).
	var gclid string
	err := s.Pool.QueryRow(r.Context(), `UPDATE leads SET status = $2,
		converted_at = CASE WHEN $2 = 'converted' THEN coalesce($3, converted_at, now()) ELSE converted_at END,
		qualified_at = CASE WHEN $2 = 'qualified' THEN coalesce($4, qualified_at, now()) ELSE qualified_at END
		WHERE id::text = $1 RETURNING gclid`, r.PathValue("id"), in.Status, conv, qual).Scan(&gclid)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "lead.status", "lead", r.PathValue("id"), map[string]any{"status": in.Status})
	httpx.JSON(w, 200, map[string]any{"ok": true})
}

// Google Ads offline conversion export — same contract as the old /api/leads/export route.
func (s *Server) adminExportLeads(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	type action struct{ name, value, status, col, empty string }
	actions := map[string]action{
		"consulta": {"Consulta Marcada", "350", "converted", "converted_at", `Nenhuma "Consulta Marcada" encontrada com os filtros aplicados.`},
		"contato":  {"Contato WhatsApp", "0", "qualified", "clicked_at", `Nenhum "Lead Qualificado" encontrado com os filtros aplicados.`},
	}
	key := q.Get("action")
	act, ok := actions[key]
	if !ok {
		key, act = "consulta", actions["consulta"]
	}
	where, args := []string{"true"}, []any{}
	switch st := q.Get("status"); {
	case st == "all":
	case st == "":
		args = append(args, act.status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	default:
		args = append(args, st)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	if t, ok := parseExportDate(q.Get("from"), false); ok {
		args = append(args, t)
		where = append(where, fmt.Sprintf("%s >= $%d", act.col, len(args)))
	}
	if t, ok := parseExportDate(q.Get("until"), true); ok {
		args = append(args, t)
		where = append(where, fmt.Sprintf("%s <= $%d", act.col, len(args)))
	}
	rows, err := s.Pool.Query(r.Context(), `SELECT gclid, `+act.col+` FROM leads WHERE `+strings.Join(where, " AND ")+` ORDER BY created_at DESC LIMIT 10000`, args...)
	if err != nil {
		httpx.JSON(w, 500, map[string]string{"error": "Erro ao exportar."})
		return
	}
	defer rows.Close()
	var b strings.Builder
	b.WriteString("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency\n")
	n := 0
	for rows.Next() {
		var gclid string
		var at *time.Time
		if err := rows.Scan(&gclid, &at); err != nil {
			httpx.JSON(w, 500, map[string]string{"error": "Erro ao exportar."})
			return
		}
		ts := ""
		if at != nil {
			ts = at.UTC().Format("2006-01-02 15:04:05") + "+0000"
		}
		b.WriteString(strings.Join([]string{gclid, act.name, ts, act.value, "BRL"}, ",") + "\n")
		n++
	}
	if n == 0 {
		httpx.JSON(w, http.StatusBadRequest, map[string]string{"error": act.empty})
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="conversoes-%s-%s.csv"`, key, s.Now().Format("2006-01-02")))
	_, _ = w.Write([]byte(b.String()))
}

// parseExportDate accepts YYYY-MM-DD or RFC 3339; an "until" date covers the whole UTC day.
func parseExportDate(v string, endOfDay bool) (time.Time, bool) {
	if v == "" {
		return time.Time{}, false
	}
	t, err := time.Parse("2006-01-02", v)
	if err != nil {
		t, err = time.Parse(time.RFC3339, v)
		if err != nil {
			return time.Time{}, false
		}
	}
	t = t.UTC()
	if endOfDay {
		t = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999_000_000, time.UTC)
	}
	return t, true
}

// ── contatos (clinical only) ─────────────────────────────────────────────────

func (s *Server) adminListContatos(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, name, phone, consent_at, status, created_at FROM contatos ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, phone, status string
		var consent, created time.Time
		if err := rows.Scan(&id, &name, &phone, &consent, &status, &created); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "name": name, "phone": phone, "consentAt": consent, "status": status, "createdAt": created})
	}
	httpx.JSON(w, 200, map[string]any{"contatos": out})
}

func (s *Server) adminPatchContato(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &in, 256) || (in.Status != "novo" && in.Status != "respondido") {
		if in.Status != "novo" && in.Status != "respondido" {
			badRequest(w, "invalid status")
		}
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `UPDATE contatos SET status = $2 WHERE id::text = $1`, r.PathValue("id"), in.Status)
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

func (s *Server) adminDeleteContato(w http.ResponseWriter, r *http.Request) {
	tag, err := s.Pool.Exec(r.Context(), `DELETE FROM contatos WHERE id::text = $1`, r.PathValue("id"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	s.audit(r, "contato.delete", "contato", r.PathValue("id"), nil)
	w.WriteHeader(http.StatusNoContent)
}

// ── FAQ inbox (clinical only: questions may describe health situations) ─────

func (s *Server) adminListQuestions(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, question, status, answer, slug::text, topic, published_at, created_at FROM faq_questions
		WHERE ($1 = '' OR status = $1) ORDER BY created_at DESC LIMIT 300`, r.URL.Query().Get("status"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, q, status, topic string
		var slug *string
		var ans json.RawMessage
		var pub *time.Time
		var created time.Time
		if err := rows.Scan(&id, &q, &status, &ans, &slug, &topic, &pub, &created); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		a, _ := richtext.Parse(ans)
		out = append(out, map[string]any{"id": id, "question": q, "status": status, "answer": a, "slug": slug, "topic": topic, "publishedAt": pub, "createdAt": created})
	}
	httpx.JSON(w, 200, map[string]any{"questions": out})
}

func (s *Server) adminAnswerQuestion(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Question *string         `json:"question"` // the clinician may rephrase it (and remove personal details) before publishing
		Answer   json.RawMessage `json:"answer"`
		Topic    *string         `json:"topic"`
	}
	if !decode(w, r, &in, 1<<20) {
		return
	}
	var probe map[string]any
	if json.Unmarshal(in.Answer, &probe) != nil || probe["root"] == nil {
		badRequest(w, "answer must be a Lexical document")
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `UPDATE faq_questions SET question = coalesce($2, question), answer = $3, topic = coalesce($4, topic),
		status = CASE WHEN status = 'published' THEN status ELSE 'answered' END, answered_by = $5::uuid WHERE id::text = $1`,
		r.PathValue("id"), in.Question, []byte(in.Answer), in.Topic, s.actorID(r))
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

func (s *Server) adminPublishQuestion(w http.ResponseWriter, r *http.Request) {
	var q string
	var ans json.RawMessage
	if err := s.Pool.QueryRow(r.Context(), `SELECT question, answer FROM faq_questions WHERE id::text = $1`, r.PathValue("id")).Scan(&q, &ans); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if len(ans) == 0 {
		httpx.Problem(w, http.StatusUnprocessableEntity, "answer the question before publishing")
		return
	}
	// Published answers are advertising-adjacent copy: same CFP lint as posts and service pages.
	var in struct {
		AcknowledgeLint bool `json:"acknowledgeLint"`
	}
	if r.ContentLength > 0 {
		_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in)
	}
	doc, _ := richtext.Parse(ans)
	if flags := copylint.Check(q + "\n" + richtext.PlainText(doc)); len(flags) > 0 && !in.AcknowledgeLint {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"title": "copy needs review", "flags": flags})
		return
	}
	slug, err := s.uniqueFAQSlug(r, Slugify(q))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE faq_questions SET status = 'published', slug = coalesce(slug, $2), published_at = coalesce(published_at, now()) WHERE id::text = $1`, r.PathValue("id"), slug); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "faq.publish", "faq", r.PathValue("id"), nil)
	s.Notify.Revalidate(r.Context(), []string{tagFAQ}, []string{"/perguntas", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	s.Notify.IndexNow(r.Context(), []string{"/perguntas"})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) uniqueFAQSlug(r *http.Request, base string) (string, error) {
	if len(base) > 80 {
		base = strings.Trim(base[:80], "-")
	}
	if base == "" {
		base = "pergunta"
	}
	slug := base
	for i := 2; i < 50; i++ {
		var exists bool
		if err := s.Pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM faq_questions WHERE slug = $1 AND id::text <> $2)`, slug, r.PathValue("id")).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		slug = base + "-" + strconv.Itoa(i)
	}
	return base + "-" + strconv.FormatInt(time.Now().Unix(), 10), nil
}

func (s *Server) adminRejectQuestion(w http.ResponseWriter, r *http.Request) {
	tag, err := s.Pool.Exec(r.Context(), `UPDATE faq_questions SET status = 'rejected' WHERE id::text = $1`, r.PathValue("id"))
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

// ── subscribers ──────────────────────────────────────────────────────────────

func (s *Server) adminListSubscribers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, email::text, consented_at, active, unsubscribed_at, source FROM subscribers ORDER BY created_at DESC LIMIT 2000`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, email, source string
		var consent time.Time
		var active bool
		var unsub *time.Time
		if err := rows.Scan(&id, &email, &consent, &active, &unsub, &source); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "email": email, "consentedAt": consent, "active": active, "unsubscribedAt": unsub, "source": source})
	}
	httpx.JSON(w, 200, map[string]any{"subscribers": out})
}

func (s *Server) adminDeleteSubscriber(w http.ResponseWriter, r *http.Request) {
	tag, err := s.Pool.Exec(r.Context(), `DELETE FROM subscribers WHERE id::text = $1`, r.PathValue("id"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	s.audit(r, "subscriber.delete", "subscriber", r.PathValue("id"), nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminExportSubscribers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT email::text, consented_at, active FROM subscribers ORDER BY created_at`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="assinantes.csv"`)
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"email", "consented_at", "active"})
	for rows.Next() {
		var email string
		var at time.Time
		var active bool
		if err := rows.Scan(&email, &at, &active); err != nil {
			return
		}
		_ = cw.Write([]string{email, at.UTC().Format(time.RFC3339), strconv.FormatBool(active)})
	}
	cw.Flush()
}
