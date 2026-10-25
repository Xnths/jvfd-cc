package api

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/blocks"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
)

// Cache tags shared with the Next.js app (src/lib/cache-tags.ts).
const (
	tagSettings = "settings"
	tagPages    = "pages"
	tagServices = "services"
	tagPosts    = "posts"
	tagComments = "comments"
	tagProfiles = "profiles"
	tagGlossary = "glossary"
	tagFAQ      = "faq"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// reservedSlugs can't be used for CMS pages: they belong to routes the app owns.
var reservedSlugs = map[string]bool{
	"blog": true, "sobre": true, "glossario": true, "perguntas": true, "ferramentas": true, "admin": true, "api": true,
	"auth": true, "edit": true, "internal": true, "media": true, "markdown": true, "og": true, "healthz": true,
	"feed.xml": true, "llms.txt": true, "llms-full.txt": true, "sitemap.xml": true, "robots.txt": true, "login": true,
	"registro": true, "conta": true, "_next": true, "icon": true, "apple-icon": true, "opengraph-image": true,
}

func (s *Server) adminRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc, roles ...string) http.Handler { return s.requireAdmin(h, roles...) }

	mux.Handle("GET /api/v1/admin/me", a(s.adminMe))
	mux.Handle("GET /api/v1/admin/dashboard", a(s.dashboard))

	mux.Handle("GET /api/v1/admin/settings", a(s.adminGetSettings))
	mux.Handle("PUT /api/v1/admin/settings/draft", a(s.adminPutSettings))
	mux.Handle("POST /api/v1/admin/settings/publish", a(s.adminPublishSettings))

	mux.Handle("GET /api/v1/admin/pages", a(s.adminListPages))
	mux.Handle("POST /api/v1/admin/pages", a(s.adminCreatePage))
	mux.Handle("GET /api/v1/admin/pages/{id}", a(s.adminGetPage))
	mux.Handle("PUT /api/v1/admin/pages/{id}/draft", a(s.adminPutPageDraft))
	mux.Handle("POST /api/v1/admin/pages/{id}/publish", a(s.adminPublishPage))
	mux.Handle("POST /api/v1/admin/pages/{id}/unpublish", a(s.adminUnpublishPage))
	mux.Handle("PATCH /api/v1/admin/pages/{id}/slug", a(s.adminRenamePage))
	mux.Handle("DELETE /api/v1/admin/pages/{id}", a(s.adminDeletePage))
	mux.Handle("GET /api/v1/admin/pages/{id}/revisions", a(s.adminPageRevisions))

	mux.Handle("GET /api/v1/admin/services", a(s.adminListServices))
	mux.Handle("POST /api/v1/admin/services", a(s.adminCreateService))
	mux.Handle("PATCH /api/v1/admin/services/{id}", a(s.adminPatchService))
	mux.Handle("PUT /api/v1/admin/services/{id}/body", a(s.adminPutServiceBody))
	mux.Handle("POST /api/v1/admin/services/reorder", a(s.adminReorderServices))

	s.adminContentRoutes(mux)
	s.adminInboxRoutes(mux)
}

func (s *Server) adminMe(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r.Context())
	httpx.JSON(w, 200, map[string]any{"id": c.Subject, "email": c.Email, "role": c.Role})
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	var d struct {
		PendingComments int `json:"pendingComments"`
		NewLeads        int `json:"newLeads"`
		QualifiedLeads  int `json:"qualifiedLeads"`
		Subscribers     int `json:"subscribers"`
		DraftPosts      int `json:"draftPosts"`
		NewQuestions    int `json:"newQuestions"`
		NewContatos     int `json:"newContatos"`
		OpenSuggestions int `json:"openSuggestions"`
	}
	err := s.Pool.QueryRow(r.Context(), `SELECT
		(SELECT count(*) FROM comments WHERE status = 'pending'),
		(SELECT count(*) FROM leads WHERE status = 'clicked' AND clicked_at > now() - interval '30 days'),
		(SELECT count(*) FROM leads WHERE status = 'qualified'),
		(SELECT count(*) FROM subscribers WHERE active),
		(SELECT count(*) FROM posts WHERE status IN ('draft','in_review')),
		(SELECT count(*) FROM faq_questions WHERE status = 'new'),
		(SELECT count(*) FROM contatos WHERE status = 'novo'),
		(SELECT count(*) FROM seo_suggestions WHERE status = 'new')`).
		Scan(&d.PendingComments, &d.NewLeads, &d.QualifiedLeads, &d.Subscribers, &d.DraftPosts, &d.NewQuestions, &d.NewContatos, &d.OpenSuggestions)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if claimsFrom(r.Context()).Role != authn.RoleAdminClinical { // patient-related counts are clinical only
		d.NewContatos, d.NewQuestions = 0, 0
	}
	httpx.JSON(w, 200, d)
}

// ── helpers ──────────────────────────────────────────────────────────────────

// ifMatch parses the optimistic-concurrency header ("3" or W/"3"). ok=false means absent/invalid.
func ifMatch(r *http.Request) (int, bool) {
	v := strings.Trim(strings.TrimPrefix(r.Header.Get("If-Match"), "W/"), `"`)
	n, err := strconv.Atoi(v)
	return n, err == nil
}

func (s *Server) actorID(r *http.Request) string { return claimsFrom(r.Context()).Subject }

func (s *Server) audit(r *http.Request, action, entityType, entityID string, meta map[string]any) {
	b, _ := json.Marshal(meta)
	c := claimsFrom(r.Context())
	if _, err := s.Pool.Exec(r.Context(),
		`INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, meta, ip_hash) VALUES ('admin',$1,$2,$3,$4,$5,$6)`,
		c.Subject, action, entityType, entityID, b, s.ipHash(r)); err != nil {
		s.Log.Warn("audit failed", "err", err)
	}
}

func (s *Server) revisionTx(ctx context.Context, tx pgx.Tx, entityType, entityID string, version int, data any, by, msg string) error {
	b, _ := json.Marshal(data)
	_, err := tx.Exec(ctx, `INSERT INTO revisions (entity_type, entity_id, version, data, message, created_by)
		VALUES ($1,$2,$3,$4,$5,$6::uuid) ON CONFLICT (entity_type, entity_id, version) DO NOTHING`, entityType, entityID, version, b, msg, by)
	return err
}

func (s *Server) validSlug(slug string) bool {
	return slugPattern.MatchString(slug) && len(slug) <= 80 && !reservedSlugs[slug]
}

// ── settings ─────────────────────────────────────────────────────────────────

func (s *Server) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	var draft, pub json.RawMessage
	var dv, pv int
	var at *time.Time
	if err := s.Pool.QueryRow(r.Context(), `SELECT draft, published, draft_version, published_version, published_at FROM site_settings WHERE id = 1`).
		Scan(&draft, &pub, &dv, &pv, &at); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.Header().Set("ETag", strconv.Itoa(dv))
	httpx.JSON(w, 200, map[string]any{"draft": draft, "published": pub, "draftVersion": dv, "publishedVersion": pv, "publishedAt": at})
}

func (s *Server) adminPutSettings(w http.ResponseWriter, r *http.Request) {
	want, ok := ifMatch(r)
	if !ok {
		httpx.Problem(w, http.StatusPreconditionRequired, "If-Match header required")
		return
	}
	var in json.RawMessage
	if !decode(w, r, &in, 512<<10) {
		return
	}
	var probe map[string]json.RawMessage
	if json.Unmarshal(in, &probe) != nil {
		badRequest(w, "settings must be a JSON object")
		return
	}
	var v int
	err := s.Pool.QueryRow(r.Context(),
		`UPDATE site_settings SET draft = $1, draft_version = draft_version + 1, updated_at = now() WHERE id = 1 AND draft_version = $2 RETURNING draft_version`,
		[]byte(in), want).Scan(&v)
	if isNoRows(err) {
		httpx.Problem(w, http.StatusPreconditionFailed, "settings were changed elsewhere; reload")
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.Header().Set("ETag", strconv.Itoa(v))
	httpx.JSON(w, 200, map[string]any{"draftVersion": v})
}

func (s *Server) adminPublishSettings(w http.ResponseWriter, r *http.Request) {
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(r.Context()) //nolint:errcheck
	var draft json.RawMessage
	var pv int
	if err := tx.QueryRow(r.Context(), `UPDATE site_settings SET published = draft, published_version = published_version + 1, published_at = now()
		WHERE id = 1 RETURNING draft, published_version`).Scan(&draft, &pv); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := s.revisionTx(r.Context(), tx, "settings", "1", pv, json.RawMessage(draft), s.actorID(r), r.URL.Query().Get("message")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "settings.publish", "settings", "1", nil)
	// Settings feed the header, footer, JSON-LD and llms.txt of every page.
	s.Notify.Revalidate(r.Context(), []string{tagSettings}, []string{"/", "/sitemap.xml", "/llms.txt", "/llms-full.txt", "/feed.xml"}, false)
	httpx.JSON(w, 200, map[string]any{"publishedVersion": pv})
}

// ── pages ────────────────────────────────────────────────────────────────────

type adminPage struct {
	ID               string          `json:"id"`
	Slug             string          `json:"slug"`
	Kind             string          `json:"kind"`
	Status           string          `json:"status"`
	Title            string          `json:"title"`
	Subtitle         string          `json:"subtitle"`
	MetaTitle        string          `json:"metaTitle"`
	MetaDescription  string          `json:"metaDescription"`
	MarkdownTwin     bool            `json:"markdownTwin"`
	DraftBlocks      json.RawMessage `json:"draftBlocks"`
	PublishedBlocks  json.RawMessage `json:"publishedBlocks"`
	DraftMeta        json.RawMessage `json:"draftMeta"`
	DraftVersion     int             `json:"draftVersion"`
	PublishedVersion int             `json:"publishedVersion"`
	PublishedAt      *time.Time      `json:"publishedAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
	HasUnpublished   bool            `json:"hasUnpublishedChanges"`
}

const adminPageSelect = `p.id::text, p.slug::text, p.kind, p.status, p.title, p.subtitle, p.meta_title, p.meta_description, p.markdown_twin,
	p.draft_blocks, p.published_blocks, p.draft_meta, p.draft_version, p.published_version, p.published_at, p.updated_at`

func scanAdminPage(row pgx.Row) (adminPage, error) {
	var p adminPage
	err := row.Scan(&p.ID, &p.Slug, &p.Kind, &p.Status, &p.Title, &p.Subtitle, &p.MetaTitle, &p.MetaDescription, &p.MarkdownTwin,
		&p.DraftBlocks, &p.PublishedBlocks, &p.DraftMeta, &p.DraftVersion, &p.PublishedVersion, &p.PublishedAt, &p.UpdatedAt)
	p.HasUnpublished = p.DraftVersion > p.PublishedVersion
	return p, err
}

func (s *Server) adminListPages(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT `+adminPageSelect+` FROM pages p ORDER BY p.slug`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []adminPage{}
	for rows.Next() {
		p, err := scanAdminPage(rows)
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		p.DraftBlocks, p.PublishedBlocks = nil, nil // lists don't need the block payloads
		out = append(out, p)
	}
	httpx.JSON(w, 200, map[string]any{"pages": out})
}

func (s *Server) adminGetPage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	q := `SELECT ` + adminPageSelect + ` FROM pages p WHERE p.id::text = $1`
	if id == "_home" || strings.HasPrefix(id, "slug:") {
		slug := strings.TrimPrefix(id, "slug:")
		if id == "_home" {
			slug = ""
		}
		q = `SELECT ` + adminPageSelect + ` FROM pages p WHERE p.slug = $1`
		id = slug
	}
	p, err := scanAdminPage(s.Pool.QueryRow(r.Context(), q, id))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	out := map[string]any{"page": p}
	if p.Kind == "service" || p.Kind == "education" {
		var svc ServiceOut
		var body json.RawMessage
		var draftBody json.RawMessage
		if err := s.Pool.QueryRow(r.Context(), `SELECT s.id::text, s.name, s.card_title, s.card_description, s.icon, s.category, s.layout, s.theme, s.badge, s.cta_text,
			s.whatsapp_message, s.variant_copy, s.show_on_home, s.campaign_key, s.show_in_footer, s.show_contact_section, s.sort_order, s.analytics_key, s.body, s.published_body
			FROM services s WHERE s.page_id = $1`, p.ID).
			Scan(&svc.ID, &svc.Name, &svc.CardTitle, &svc.CardDescription, &svc.Icon, &svc.Category, &svc.Layout, &svc.Theme, &svc.Badge, &svc.CTAText,
				&svc.WhatsAppMessage, &svc.VariantCopy, &svc.ShowOnHome, &svc.CampaignKey, &svc.ShowInFooter, &svc.ShowContactSection, &svc.SortOrder, &svc.AnalyticsKey, &draftBody, &body); err == nil {
			svc.Slug = p.Slug
			out["service"] = svc
			out["serviceDraftBody"] = draftBody
			out["servicePublishedBody"] = body
		}
	}
	w.Header().Set("ETag", strconv.Itoa(p.DraftVersion))
	httpx.JSON(w, 200, out)
}

type pageDraftIn struct {
	Blocks          json.RawMessage `json:"blocks"`
	Title           *string         `json:"title"`
	Subtitle        *string         `json:"subtitle"`
	MetaTitle       *string         `json:"metaTitle"`
	MetaDescription *string         `json:"metaDescription"`
	MarkdownTwin    *bool           `json:"markdownTwin"`
}

func (s *Server) adminPutPageDraft(w http.ResponseWriter, r *http.Request) {
	want, ok := ifMatch(r)
	if !ok {
		httpx.Problem(w, http.StatusPreconditionRequired, "If-Match header required")
		return
	}
	var in pageDraftIn
	if !decode(w, r, &in, 2<<20) {
		return
	}
	id := r.PathValue("id")
	var kind string
	if err := s.Pool.QueryRow(r.Context(), `SELECT kind FROM pages WHERE id::text = $1`, id).Scan(&kind); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if len(in.Blocks) > 0 {
		if err := blocks.Validate(kind, in.Blocks); err != nil {
			badRequest(w, err.Error())
			return
		}
	}
	meta := map[string]any{}
	if in.Title != nil {
		meta["title"] = *in.Title
	}
	if in.Subtitle != nil {
		meta["subtitle"] = *in.Subtitle
	}
	if in.MetaTitle != nil {
		meta["metaTitle"] = *in.MetaTitle
	}
	if in.MetaDescription != nil {
		meta["metaDescription"] = *in.MetaDescription
	}
	if in.MarkdownTwin != nil {
		meta["markdownTwin"] = *in.MarkdownTwin
	}
	metaJSON, _ := json.Marshal(meta)
	var v int
	err := s.Pool.QueryRow(r.Context(), `UPDATE pages SET
		draft_blocks = CASE WHEN $2::jsonb IS NULL THEN draft_blocks ELSE $2::jsonb END,
		draft_meta = draft_meta || $3::jsonb,
		draft_version = draft_version + 1, updated_at = now()
		WHERE id::text = $1 AND draft_version = $4 RETURNING draft_version`,
		id, nullIfEmpty(in.Blocks), metaJSON, want).Scan(&v)
	if isNoRows(err) {
		httpx.Problem(w, http.StatusPreconditionFailed, "this page was changed elsewhere; reload")
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.Header().Set("ETag", strconv.Itoa(v))
	httpx.JSON(w, 200, map[string]any{"draftVersion": v})
}

func nullIfEmpty(b json.RawMessage) any {
	if len(b) == 0 {
		return nil
	}
	return []byte(b)
}

func (s *Server) adminPublishPage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var id, slug, kind string
	var draftBlocks, meta json.RawMessage
	if err := tx.QueryRow(ctx, `SELECT id::text, slug::text, kind, draft_blocks, draft_meta FROM pages WHERE id::text = $1 FOR UPDATE`, r.PathValue("id")).
		Scan(&id, &slug, &kind, &draftBlocks, &meta); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := blocks.Validate(kind, draftBlocks); err != nil && kind != "service" && kind != "education" {
		badRequest(w, err.Error())
		return
	}
	var m struct {
		Title, Subtitle, MetaTitle, MetaDescription *string
		MarkdownTwin                                *bool
	}
	_ = json.Unmarshal(meta, &m)
	var pv int
	err = tx.QueryRow(ctx, `UPDATE pages SET
		published_blocks = draft_blocks,
		title = coalesce($2, title), subtitle = coalesce($3, subtitle),
		meta_title = coalesce($4, meta_title), meta_description = coalesce($5, meta_description),
		markdown_twin = coalesce($6, markdown_twin),
		draft_meta = '{}', status = 'published',
		published_version = draft_version, published_at = coalesce(published_at, now()), updated_at = now()
		WHERE id::text = $1 RETURNING published_version`,
		id, m.Title, m.Subtitle, m.MetaTitle, m.MetaDescription, m.MarkdownTwin).Scan(&pv)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	// A service's rich-text body is published together with its page.
	if _, err := tx.Exec(ctx, `UPDATE services SET published_body = body, updated_at = now() WHERE page_id::text = $1`, id); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	snapshot := map[string]any{"blocks": json.RawMessage(draftBlocks), "meta": json.RawMessage(meta)}
	if err := s.revisionTx(ctx, tx, "page", id, pv, snapshot, s.actorID(r), r.URL.Query().Get("message")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "page.publish", "page", id, map[string]any{"slug": slug})
	path := "/" + slug
	s.Notify.Revalidate(ctx, []string{tagPages, tagServices}, []string{path, "/", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	s.Notify.IndexNow(ctx, []string{path})
	httpx.JSON(w, 200, map[string]any{"publishedVersion": pv})
}

func (s *Server) adminUnpublishPage(w http.ResponseWriter, r *http.Request) {
	var slug, kind string
	err := s.Pool.QueryRow(r.Context(), `UPDATE pages SET status = 'draft', updated_at = now() WHERE id::text = $1 AND kind <> 'home' RETURNING slug::text, kind`, r.PathValue("id")).Scan(&slug, &kind)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "page.unpublish", "page", r.PathValue("id"), map[string]any{"slug": slug})
	s.Notify.Revalidate(r.Context(), []string{tagPages, tagServices}, []string{"/" + slug, "/", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminCreatePage(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug  string `json:"slug"`
		Kind  string `json:"kind"`
		Title string `json:"title"`
	}
	if !decode(w, r, &in, 4096) {
		return
	}
	if in.Kind != "custom" && in.Kind != "legal" && in.Kind != "location" && in.Kind != "tool" {
		badRequest(w, "kind must be custom, legal, location or tool (use /services for services)")
		return
	}
	if !s.validSlug(in.Slug) || strings.TrimSpace(in.Title) == "" {
		badRequest(w, "invalid slug or title")
		return
	}
	var id string
	err := s.Pool.QueryRow(r.Context(), `INSERT INTO pages (slug, kind, title) VALUES ($1,$2,$3) RETURNING id::text`, in.Slug, in.Kind, strings.TrimSpace(in.Title)).Scan(&id)
	if err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "a page with this address already exists")
			return
		}
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "page.create", "page", id, map[string]any{"slug": in.Slug})
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) adminRenamePage(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug string `json:"slug"`
	}
	if !decode(w, r, &in, 1024) {
		return
	}
	if !s.validSlug(in.Slug) {
		badRequest(w, "invalid slug")
		return
	}
	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var old, kind, status string
	if err := tx.QueryRow(ctx, `SELECT slug::text, kind, status FROM pages WHERE id::text = $1 FOR UPDATE`, r.PathValue("id")).Scan(&old, &kind, &status); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if kind == "home" || old == in.Slug {
		badRequest(w, "this page cannot be renamed")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE pages SET slug = $2, updated_at = now() WHERE id::text = $1`, r.PathValue("id"), in.Slug); err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "a page with this address already exists")
			return
		}
		serverError(w, s.Log, r, err)
		return
	}
	// Old links keep working: redirect the previous address, and clear any redirect that pointed here.
	if status == "published" {
		if _, err := tx.Exec(ctx, `INSERT INTO redirects (from_path, to_path) VALUES ($1,$2) ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path`, "/"+old, "/"+in.Slug); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM redirects WHERE from_path = $1`, "/"+in.Slug); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "page.rename", "page", r.PathValue("id"), map[string]any{"from": old, "to": in.Slug})
	s.Notify.Revalidate(ctx, []string{tagPages, tagServices}, []string{"/" + old, "/" + in.Slug, "/", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	s.Notify.IndexNow(ctx, []string{"/" + in.Slug})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeletePage(w http.ResponseWriter, r *http.Request) {
	var slug string
	err := s.Pool.QueryRow(r.Context(), `DELETE FROM pages WHERE id::text = $1 AND kind <> 'home' RETURNING slug::text`, r.PathValue("id")).Scan(&slug)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "page.delete", "page", r.PathValue("id"), map[string]any{"slug": slug})
	s.Notify.Revalidate(r.Context(), []string{tagPages, tagServices}, []string{"/" + slug, "/", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminPageRevisions(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT version, message, created_at FROM revisions WHERE entity_type = 'page' AND entity_id = $1 ORDER BY version DESC LIMIT 50`, r.PathValue("id"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type rev struct {
		Version   int       `json:"version"`
		Message   string    `json:"message"`
		CreatedAt time.Time `json:"createdAt"`
	}
	out := []rev{}
	for rows.Next() {
		var x rev
		if err := rows.Scan(&x.Version, &x.Message, &x.CreatedAt); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, x)
	}
	httpx.JSON(w, 200, map[string]any{"revisions": out})
}

// ── services ─────────────────────────────────────────────────────────────────

var (
	validLayouts = map[string]bool{"calming": true, "structured": true, "plantao": true, "exploratory": true, "supervisao": true, "affirmative": true, "generic": true, "blocks": true}
	validThemes  = map[string]bool{"teal": true, "amber": true, "slate": true, "green": true, "stone": true, "slate_dark": true, "violet": true}
	validIcons   = map[string]bool{"heart": true, "brain": true, "target": true, "life-buoy": true, "users": true, "compass": true, "graduation-cap": true,
		"book-open": true, "shield": true, "sparkles": true, "message-circle": true, "sun": true, "flag": true, "puzzle": true, "clock": true, "map-pin": true}
	validShowOnHome = map[string]bool{"always": true, "campaign": true, "never": true}
)

func (s *Server) adminListServices(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT `+serviceSelect+`, p.id::text, p.status
		FROM services s JOIN pages p ON p.id = s.page_id ORDER BY s.sort_order, s.name`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type item struct {
		ServiceOut
		PageID string `json:"pageId"`
		Status string `json:"status"`
	}
	out := []item{}
	for rows.Next() {
		var it item
		var body json.RawMessage
		if err := rows.Scan(&it.ID, &it.Slug, &it.Name, &it.CardTitle, &it.CardDescription, &it.Icon, &it.Category, &it.Layout, &it.Theme, &it.Badge,
			&it.CTAText, &it.WhatsAppMessage, &it.VariantCopy, &it.ShowOnHome, &it.CampaignKey, &it.ShowInFooter, &it.ShowContactSection,
			&it.SortOrder, &it.AnalyticsKey, &it.Title, &it.Subtitle, &it.MetaTitle, &it.MetaDescription, &body, &it.UpdatedAt, &it.CreatedAt, &it.PageID, &it.Status); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, it)
	}
	httpx.JSON(w, 200, map[string]any{"services": out})
}

type serviceIn struct {
	Name               *string          `json:"name"`
	CardTitle          *string          `json:"cardTitle"`
	CardDescription    *string          `json:"cardDescription"`
	Icon               *string          `json:"icon"`
	Category           *string          `json:"category"`
	Layout             *string          `json:"layout"`
	Theme              *string          `json:"theme"`
	Badge              *string          `json:"badge"`
	CTAText            *string          `json:"ctaText"`
	WhatsAppMessage    *string          `json:"whatsappMessage"`
	VariantCopy        *json.RawMessage `json:"variantCopy"`
	ShowOnHome         *string          `json:"showOnHome"`
	CampaignKey        *string          `json:"campaignKey"`
	ShowInFooter       *bool            `json:"showInFooter"`
	ShowContactSection *bool            `json:"showContactSection"`
	SortOrder          *int             `json:"sortOrder"`
}

func (in serviceIn) validate() string {
	switch {
	case in.Layout != nil && !validLayouts[*in.Layout]:
		return "invalid layout"
	case in.Theme != nil && !validThemes[*in.Theme]:
		return "invalid theme"
	case in.Icon != nil && !validIcons[*in.Icon]:
		return "invalid icon"
	case in.Category != nil && *in.Category != "therapy" && *in.Category != "education":
		return "invalid category"
	case in.ShowOnHome != nil && !validShowOnHome[*in.ShowOnHome]:
		return "invalid showOnHome"
	case in.Name != nil && strings.TrimSpace(*in.Name) == "":
		return "name is required"
	}
	if in.VariantCopy != nil {
		var m map[string]any
		if json.Unmarshal(*in.VariantCopy, &m) != nil {
			return "variantCopy must be an object"
		}
	}
	return ""
}

func (s *Server) adminCreateService(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
		serviceIn
	}
	if !decode(w, r, &in, 64<<10) {
		return
	}
	if !s.validSlug(in.Slug) || strings.TrimSpace(in.Name) == "" {
		badRequest(w, "invalid slug or name")
		return
	}
	if msg := in.serviceIn.validate(); msg != "" {
		badRequest(w, msg)
		return
	}
	def := func(p *string, d string) string {
		if p != nil {
			return *p
		}
		return d
	}
	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var pageID, svcID string
	title := def(in.CardTitle, in.Name)
	if err := tx.QueryRow(ctx, `INSERT INTO pages (slug, kind, title, subtitle) VALUES ($1, $2, $3, '') RETURNING id::text`,
		in.Slug, map[bool]string{true: "education", false: "service"}[def(in.Category, "therapy") == "education"], title).Scan(&pageID); err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "a page with this address already exists")
			return
		}
		serverError(w, s.Log, r, err)
		return
	}
	variant := []byte(`{}`)
	if in.VariantCopy != nil {
		variant = *in.VariantCopy
	}
	err = tx.QueryRow(ctx, `INSERT INTO services (page_id, name, card_title, card_description, icon, category, layout, theme, badge, cta_text, whatsapp_message,
		variant_copy, show_on_home, campaign_key, show_in_footer, show_contact_section, sort_order, analytics_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
		  coalesce($17, (SELECT coalesce(max(sort_order),0)+10 FROM services)), $18) RETURNING id::text`,
		pageID, strings.TrimSpace(in.Name), title, def(in.CardDescription, ""), def(in.Icon, "heart"), def(in.Category, "therapy"),
		def(in.Layout, "generic"), def(in.Theme, "teal"), def(in.Badge, ""), def(in.CTAText, "Agendar pelo WhatsApp"),
		def(in.WhatsAppMessage, "Olá! Vi o site e gostaria de saber mais."), variant, def(in.ShowOnHome, "always"), in.CampaignKey,
		in.ShowInFooter == nil || *in.ShowInFooter, in.ShowContactSection == nil || *in.ShowContactSection, in.SortOrder,
		"service_page_"+in.Slug).Scan(&svcID)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "service.create", "service", svcID, map[string]any{"slug": in.Slug})
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": svcID, "pageId": pageID})
}

func (s *Server) adminPatchService(w http.ResponseWriter, r *http.Request) {
	var in serviceIn
	if !decode(w, r, &in, 64<<10) {
		return
	}
	if msg := in.validate(); msg != "" {
		badRequest(w, msg)
		return
	}
	var variant any
	if in.VariantCopy != nil {
		variant = []byte(*in.VariantCopy)
	}
	var slug string
	err := s.Pool.QueryRow(r.Context(), `UPDATE services s SET
		name = coalesce($2, name), card_title = coalesce($3, card_title), card_description = coalesce($4, card_description),
		icon = coalesce($5, icon), category = coalesce($6, category), layout = coalesce($7, layout), theme = coalesce($8, theme),
		badge = coalesce($9, badge), cta_text = coalesce($10, cta_text), whatsapp_message = coalesce($11, whatsapp_message),
		variant_copy = coalesce($12::jsonb, variant_copy), show_on_home = coalesce($13, show_on_home),
		campaign_key = CASE WHEN $14::text IS NULL THEN campaign_key WHEN $14 = '' THEN NULL ELSE $14 END,
		show_in_footer = coalesce($15, show_in_footer), show_contact_section = coalesce($16, show_contact_section),
		sort_order = coalesce($17, sort_order), updated_at = now()
		FROM pages p WHERE s.id::text = $1 AND p.id = s.page_id RETURNING p.slug::text`,
		r.PathValue("id"), in.Name, in.CardTitle, in.CardDescription, in.Icon, in.Category, in.Layout, in.Theme, in.Badge, in.CTAText,
		in.WhatsAppMessage, variant, in.ShowOnHome, in.CampaignKey, in.ShowInFooter, in.ShowContactSection, in.SortOrder).Scan(&slug)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "service.update", "service", r.PathValue("id"), map[string]any{"slug": slug})
	// Card/layout settings go live on save (only the rich-text body and page copy use draft → publish).
	s.Notify.Revalidate(r.Context(), []string{tagServices, tagPages}, []string{"/" + slug, "/", "/llms.txt", "/llms-full.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminPutServiceBody(w http.ResponseWriter, r *http.Request) {
	var body json.RawMessage
	if !decode(w, r, &body, 2<<20) {
		return
	}
	var probe map[string]any
	if json.Unmarshal(body, &probe) != nil || probe["root"] == nil {
		badRequest(w, "body must be a Lexical document")
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `UPDATE services SET body = $2, updated_at = now() WHERE id::text = $1`, r.PathValue("id"), []byte(body))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	// Bump the page's draft version so "unpublished changes" shows up and publishing copies the body.
	_, _ = s.Pool.Exec(r.Context(), `UPDATE pages SET draft_version = draft_version + 1, updated_at = now() WHERE id = (SELECT page_id FROM services WHERE id::text = $1)`, r.PathValue("id"))
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminReorderServices(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs []string `json:"ids"`
	}
	if !decode(w, r, &in, 16<<10) {
		return
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(r.Context()) //nolint:errcheck
	for i, id := range in.IDs {
		if _, err := tx.Exec(r.Context(), `UPDATE services SET sort_order = $2 WHERE id::text = $1`, id, (i+1)*10); err != nil {
			badRequest(w, "invalid service id")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.Notify.Revalidate(r.Context(), []string{tagServices}, []string{"/", "/llms.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}
