package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/Xnths/jvfd-cc/backend/internal/copylint"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

const tagTexts = "texts"

var textKeyPattern = regexp.MustCompile(`^[a-z0-9_.-]{1,120}$`)

func (s *Server) textRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/public/texts", s.publicTexts)
	a := func(h http.HandlerFunc) http.Handler { return s.requireAdmin(h) }
	mux.Handle("GET /api/v1/admin/texts", a(s.adminListTexts))
	mux.Handle("PUT /api/v1/admin/texts/{key}", a(s.adminPutText))
	mux.Handle("DELETE /api/v1/admin/texts/{key}", a(s.adminDeleteText))
	mux.Handle("GET /api/v1/admin/texts/{key}/history", a(s.adminTextHistory))
	mux.Handle("POST /api/v1/admin/texts/{key}/restore", a(s.adminRestoreText))
}

func (s *Server) publicTexts(w http.ResponseWriter, r *http.Request) {
	publicJSON(w, map[string]any{"texts": s.loadTexts(r)})
}

func (s *Server) loadTexts(r *http.Request) map[string]any {
	out := map[string]any{}
	rows, err := s.Pool.Query(r.Context(), `SELECT key, value, version FROM site_texts`)
	if err != nil {
		s.Log.Error("texts", "err", err)
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var k string
		var v json.RawMessage
		var ver int
		if rows.Scan(&k, &v, &ver) == nil {
			out[k] = map[string]any{"value": v, "version": ver}
		}
	}
	return out
}

func (s *Server) adminListTexts(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, 200, map[string]any{"texts": s.loadTexts(r)})
}

// textValueOK accepts a string, a Lexical document, or a list of flat objects (editable lists).
func textValueOK(raw json.RawMessage) bool {
	var str string
	if json.Unmarshal(raw, &str) == nil {
		return true
	}
	// A Lexical document (legal pages edited inline).
	var doc map[string]any
	if json.Unmarshal(raw, &doc) == nil && doc["root"] != nil {
		return true
	}
	var list []map[string]any
	if json.Unmarshal(raw, &list) != nil || len(list) > 100 {
		return false
	}
	for _, it := range list {
		for _, v := range it {
			switch v.(type) {
			case string, float64, bool, nil, []any:
			default:
				return false
			}
		}
	}
	return true
}

// textStrings collects every string in a JSON value so the copy lint can scan it.
func textStrings(raw json.RawMessage) string {
	var v any
	_ = json.Unmarshal(raw, &v)
	var sb strings.Builder
	var walk func(any)
	walk = func(x any) {
		switch t := x.(type) {
		case string:
			sb.WriteString(t)
			sb.WriteString("\n")
		case []any:
			for _, i := range t {
				walk(i)
			}
		case map[string]any:
			for _, i := range t {
				walk(i)
			}
		}
	}
	walk(v)
	return sb.String()
}

func (s *Server) adminPutText(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	if !textKeyPattern.MatchString(key) {
		badRequest(w, "invalid key")
		return
	}
	want, ok := ifMatch(r) // 0 = no override yet
	if !ok {
		httpx.Problem(w, http.StatusPreconditionRequired, "If-Match header required")
		return
	}
	var in struct {
		Value           json.RawMessage `json:"value"`
		AcknowledgeLint bool            `json:"acknowledgeLint"`
	}
	if !decode(w, r, &in, 512<<10) {
		return
	}
	if len(in.Value) == 0 || !textValueOK(in.Value) {
		badRequest(w, "value must be a string or a list of objects")
		return
	}
	if flags := copylint.Check(textStrings(in.Value)); len(flags) > 0 && !in.AcknowledgeLint {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"title": "copy needs review", "flags": flags})
		return
	}
	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var ver int
	if want == 0 {
		err = tx.QueryRow(ctx, `INSERT INTO site_texts (key, value, version, updated_by) VALUES ($1,$2,1,$3::uuid)
			ON CONFLICT DO NOTHING RETURNING version`, key, []byte(in.Value), s.actorID(r)).Scan(&ver)
	} else {
		err = tx.QueryRow(ctx, `UPDATE site_texts SET value=$2, version=version+1, updated_at=now(), updated_by=$4::uuid
			WHERE key=$1 AND version=$3 RETURNING version`, key, []byte(in.Value), want, s.actorID(r)).Scan(&ver)
	}
	if isNoRows(err) {
		httpx.Problem(w, http.StatusPreconditionFailed, "this text was changed elsewhere; reload")
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if _, err := tx.Exec(ctx, `INSERT INTO site_text_history (key, value, version, created_by) VALUES ($1,$2,$3,$4::uuid)`,
		key, []byte(in.Value), ver, s.actorID(r)); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "text.update", "text", key, nil)
	s.Notify.Revalidate(ctx, []string{tagTexts}, nil, false)
	w.Header().Set("ETag", strconv.Itoa(ver))
	httpx.JSON(w, 200, map[string]any{"key": key, "version": ver})
}

// adminDeleteText removes the override: the page falls back to the default in code.
func (s *Server) adminDeleteText(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	ctx := r.Context()
	var ver int
	err := s.Pool.QueryRow(ctx, `DELETE FROM site_texts WHERE key=$1 RETURNING version`, key).Scan(&ver)
	if isNoRows(err) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	_, _ = s.Pool.Exec(ctx, `INSERT INTO site_text_history (key, value, version, created_by) VALUES ($1,NULL,$2,$3::uuid)`, key, ver+1, s.actorID(r))
	s.audit(r, "text.reset", "text", key, nil)
	s.Notify.Revalidate(ctx, []string{tagTexts}, nil, false)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminTextHistory(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT h.id, h.value, h.version, h.created_at, coalesce(u.name,'')
		FROM site_text_history h LEFT JOIN admin_users u ON u.id = h.created_by
		WHERE h.key=$1 ORDER BY h.id DESC LIMIT 30`, r.PathValue("key"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var v json.RawMessage
		var ver int
		var at any
		var by string
		if err := rows.Scan(&id, &v, &ver, &at, &by); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "value": v, "version": ver, "createdAt": at, "by": by})
	}
	httpx.JSON(w, 200, map[string]any{"history": out})
}

func (s *Server) adminRestoreText(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	var in struct {
		HistoryID int64 `json:"historyId"`
	}
	if !decode(w, r, &in, 1<<10) {
		return
	}
	var v json.RawMessage
	if err := s.Pool.QueryRow(r.Context(), `SELECT value FROM site_text_history WHERE id=$1 AND key=$2`, in.HistoryID, key).Scan(&v); err != nil {
		notFound(w)
		return
	}
	ctx := r.Context()
	if v == nil { // restoring the "default" state
		s.adminDeleteText(w, r)
		return
	}
	var ver int
	if err := s.Pool.QueryRow(ctx, `INSERT INTO site_texts (key, value, version, updated_by) VALUES ($1,$2,1,$3::uuid)
		ON CONFLICT (key) DO UPDATE SET value=$2, version=site_texts.version+1, updated_at=now(), updated_by=$3::uuid
		RETURNING version`, key, []byte(v), s.actorID(r)).Scan(&ver); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	_, _ = s.Pool.Exec(ctx, `INSERT INTO site_text_history (key, value, version, created_by) VALUES ($1,$2,$3,$4::uuid)`, key, []byte(v), ver, s.actorID(r))
	s.audit(r, "text.restore", "text", key, nil)
	s.Notify.Revalidate(ctx, []string{tagTexts}, nil, false)
	httpx.JSON(w, 200, map[string]any{"key": key, "version": ver, "value": v})
}
