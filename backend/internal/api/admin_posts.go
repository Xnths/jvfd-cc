package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/copylint"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

const emptyLexical = `{"root":{"type":"root","children":[{"type":"paragraph","children":[],"direction":null,"format":"","indent":0,"version":1}],"direction":null,"format":"","indent":0,"version":1}}`

var nonSlug = regexp.MustCompile(`[^a-z0-9-]+`)

// Slugify mirrors the old Payload formatSlug: strip accents, lowercase, spaces to dashes.
func Slugify(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	out, _, err := transform.String(t, s)
	if err != nil {
		out = s
	}
	out = strings.ToLower(strings.TrimSpace(out))
	out = strings.NewReplacer(" ", "-", "_", "-").Replace(out)
	out = nonSlug.ReplaceAllString(out, "")
	out = regexp.MustCompile(`-{2,}`).ReplaceAllString(out, "-")
	return strings.Trim(out, "-")
}

func (s *Server) adminContentRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc, roles ...string) http.Handler { return s.requireAdmin(h, roles...) }

	mux.Handle("GET /api/v1/admin/posts", a(s.adminListPosts))
	mux.Handle("POST /api/v1/admin/posts", a(s.adminCreatePost))
	mux.Handle("GET /api/v1/admin/posts/{id}", a(s.adminGetPost))
	mux.Handle("PATCH /api/v1/admin/posts/{id}", a(s.adminPatchPost))
	mux.Handle("POST /api/v1/admin/posts/{id}/lint", a(s.adminLintPost))
	mux.Handle("POST /api/v1/admin/posts/{id}/publish", a(s.adminPublishPost))
	mux.Handle("POST /api/v1/admin/posts/{id}/unpublish", a(s.adminUnpublishPost))
	mux.Handle("DELETE /api/v1/admin/posts/{id}", a(s.adminDeletePost))

	mux.Handle("GET /api/v1/admin/media", a(s.adminListMedia))
	mux.Handle("POST /api/v1/admin/media", a(s.adminUploadMedia))
	mux.Handle("PATCH /api/v1/admin/media/{id}", a(s.adminPatchMedia))
	mux.Handle("DELETE /api/v1/admin/media/{id}", a(s.adminDeleteMedia))

	s.adminProfileRoutes(mux)
	s.jobAdminRoutes(mux)
	s.seoAdminRoutes(mux)
}

type adminPost struct {
	ID                  string          `json:"id"`
	Slug                string          `json:"slug"`
	Title               string          `json:"title"`
	Excerpt             string          `json:"excerpt"`
	Keywords            string          `json:"keywords"`
	Content             json.RawMessage `json:"content,omitempty"`
	Status              string          `json:"status"`
	PublishedAt         *time.Time      `json:"publishedAt"`
	AuthorName          string          `json:"authorName"`
	AuthorProfileID     *string         `json:"authorProfileId"`
	ReviewedByProfileID *string         `json:"reviewedByProfileId"`
	LastReviewedAt      *time.Time      `json:"lastReviewedAt"`
	ImageID             *string         `json:"imageId"`
	MetaTitle           string          `json:"metaTitle"`
	MetaDescription     string          `json:"metaDescription"`
	Origin              string          `json:"origin"`
	Citations           json.RawMessage `json:"citations"`
	LintAckAt           *time.Time      `json:"lintAckAt"`
	NewsletterSentAt    *time.Time      `json:"newsletterSentAt"`
	Version             int             `json:"version"`
	HasUnpublished      bool            `json:"hasUnpublishedChanges"`
	UpdatedAt           time.Time       `json:"updatedAt"`
	CreatedAt           time.Time       `json:"createdAt"`
}

const adminPostSelect = `id::text, slug::text, title, excerpt, keywords, status, published_at, author_name, author_profile_id::text,
	reviewed_by_profile_id::text, last_reviewed_at, image_id::text, meta_title, meta_description, origin, citations, lint_ack_at,
	newsletter_sent_at, version, (content IS DISTINCT FROM published_content), updated_at, created_at`

func (s *Server) adminListPosts(w http.ResponseWriter, r *http.Request) {
	q := `SELECT ` + adminPostSelect + ` FROM posts WHERE ($1 = '' OR status = $1) AND ($2 = '' OR title ILIKE '%' || $2 || '%') ORDER BY coalesce(published_at, created_at) DESC LIMIT 500`
	rows, err := s.Pool.Query(r.Context(), q, r.URL.Query().Get("status"), r.URL.Query().Get("q"))
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []adminPost{}
	for rows.Next() {
		var p adminPost
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Keywords, &p.Status, &p.PublishedAt, &p.AuthorName, &p.AuthorProfileID,
			&p.ReviewedByProfileID, &p.LastReviewedAt, &p.ImageID, &p.MetaTitle, &p.MetaDescription, &p.Origin, &p.Citations, &p.LintAckAt,
			&p.NewsletterSentAt, &p.Version, &p.HasUnpublished, &p.UpdatedAt, &p.CreatedAt); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, p)
	}
	httpx.JSON(w, 200, map[string]any{"posts": out})
}

func (s *Server) loadPost(r *http.Request, id string) (adminPost, error) {
	var p adminPost
	// "slug:<slug>" lets the on-page editor open a post by the URL it is sitting on.
	where := `id::text = $1`
	if strings.HasPrefix(id, "slug:") {
		where, id = `slug::text = $1`, strings.TrimPrefix(id, "slug:")
	}
	err := s.Pool.QueryRow(r.Context(), `SELECT `+adminPostSelect+`, content FROM posts WHERE `+where, id).
		Scan(&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Keywords, &p.Status, &p.PublishedAt, &p.AuthorName, &p.AuthorProfileID,
			&p.ReviewedByProfileID, &p.LastReviewedAt, &p.ImageID, &p.MetaTitle, &p.MetaDescription, &p.Origin, &p.Citations, &p.LintAckAt,
			&p.NewsletterSentAt, &p.Version, &p.HasUnpublished, &p.UpdatedAt, &p.CreatedAt, &p.Content)
	return p, err
}

func (s *Server) adminGetPost(w http.ResponseWriter, r *http.Request) {
	p, err := s.loadPost(r, r.PathValue("id"))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	w.Header().Set("ETag", strconv.Itoa(p.Version))
	httpx.JSON(w, 200, p)
}

func (s *Server) uniquePostSlug(r *http.Request, base, exceptID string) (string, error) {
	if base == "" {
		base = "post"
	}
	slug := base
	for i := 2; i < 100; i++ {
		var exists bool
		if err := s.Pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM posts WHERE slug = $1 AND id::text <> $2)`, slug, exceptID).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		slug = base + "-" + strconv.Itoa(i)
	}
	return base + "-" + strconv.FormatInt(time.Now().Unix(), 10), nil
}

func (s *Server) adminCreatePost(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title string `json:"title"`
		Slug  string `json:"slug"`
	}
	if !decode(w, r, &in, 4096) {
		return
	}
	title := strings.TrimSpace(in.Title)
	if title == "" || len(title) > 200 {
		badRequest(w, "title is required (max 200 characters)")
		return
	}
	base := Slugify(firstNonEmpty(in.Slug, title))
	slug, err := s.uniquePostSlug(r, base, "")
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	var id string
	err = s.Pool.QueryRow(r.Context(), `INSERT INTO posts (slug, title, content, author_name, author_profile_id)
		VALUES ($1,$2,$3, coalesce((SELECT display_name FROM profiles WHERE admin_user_id::text = $4), 'João Vitor Fernandes'), (SELECT id FROM profiles WHERE admin_user_id::text = $4))
		RETURNING id::text`, slug, title, []byte(emptyLexical), s.actorID(r)).Scan(&id)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "post.create", "post", id, map[string]any{"slug": slug})
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id, "slug": slug})
}

type postPatch struct {
	Title               *string          `json:"title"`
	Slug                *string          `json:"slug"`
	Excerpt             *string          `json:"excerpt"`
	Keywords            *string          `json:"keywords"`
	Content             *json.RawMessage `json:"content"`
	AuthorName          *string          `json:"authorName"`
	AuthorProfileID     *string          `json:"authorProfileId"`
	ReviewedByProfileID *string          `json:"reviewedByProfileId"`
	ImageID             *string          `json:"imageId"`
	MetaTitle           *string          `json:"metaTitle"`
	MetaDescription     *string          `json:"metaDescription"`
	PublishedAt         *time.Time       `json:"publishedAt"`
}

func (s *Server) adminPatchPost(w http.ResponseWriter, r *http.Request) {
	want, ok := ifMatch(r)
	if !ok {
		httpx.Problem(w, http.StatusPreconditionRequired, "If-Match header required")
		return
	}
	var in postPatch
	if !decode(w, r, &in, 4<<20) {
		return
	}
	cur, err := s.loadPost(r, r.PathValue("id"))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	var slug *string
	if in.Slug != nil {
		sl, err := s.uniquePostSlug(r, Slugify(*in.Slug), cur.ID)
		if err != nil || sl == "" {
			badRequest(w, "invalid slug")
			return
		}
		slug = &sl
	}
	if in.Title != nil && strings.TrimSpace(*in.Title) == "" {
		badRequest(w, "title cannot be empty")
		return
	}
	var content any
	if in.Content != nil {
		var probe map[string]any
		if json.Unmarshal(*in.Content, &probe) != nil || probe["root"] == nil {
			badRequest(w, "content must be a Lexical document")
			return
		}
		content = []byte(*in.Content)
	}
	if in.ReviewedByProfileID != nil && *in.ReviewedByProfileID != "" {
		var clinician bool
		if err := s.Pool.QueryRow(r.Context(), `SELECT is_clinician AND crp IS NOT NULL FROM profiles WHERE id::text = $1`, *in.ReviewedByProfileID).Scan(&clinician); err != nil || !clinician {
			badRequest(w, "o revisor precisa ser psicólogo(a) com CRP")
			return
		}
	}
	var v int
	err = s.Pool.QueryRow(r.Context(), `UPDATE posts SET
		title = coalesce($3, title), slug = coalesce($4, slug), excerpt = coalesce($5, excerpt), keywords = coalesce($6, keywords),
		content = coalesce($7::jsonb, content), author_name = coalesce($8, author_name),
		author_profile_id = CASE WHEN $9::text IS NULL THEN author_profile_id WHEN $9 = '' THEN NULL ELSE $9::uuid END,
		reviewed_by_profile_id = CASE WHEN $10::text IS NULL THEN reviewed_by_profile_id WHEN $10 = '' THEN NULL ELSE $10::uuid END,
		last_reviewed_at = CASE WHEN $10::text IS NULL THEN last_reviewed_at WHEN $10 = '' THEN NULL ELSE now() END,
		image_id = CASE WHEN $11::text IS NULL THEN image_id WHEN $11 = '' THEN NULL ELSE $11::uuid END,
		meta_title = coalesce($12, meta_title), meta_description = coalesce($13, meta_description),
		published_at = coalesce($14, published_at),
		lint_ack_at = CASE WHEN $7::jsonb IS NULL AND $3 IS NULL AND $5 IS NULL THEN lint_ack_at ELSE NULL END,
		version = version + 1, updated_at = now()
		WHERE id::text = $1 AND version = $2 RETURNING version`,
		cur.ID, want, in.Title, slug, in.Excerpt, in.Keywords, content, in.AuthorName, in.AuthorProfileID, in.ReviewedByProfileID,
		in.ImageID, in.MetaTitle, in.MetaDescription, in.PublishedAt).Scan(&v)
	if isNoRows(err) {
		httpx.Problem(w, http.StatusPreconditionFailed, "this post was changed elsewhere; reload")
		return
	}
	if err != nil {
		if isFKViolation(err) {
			badRequest(w, "unknown image or profile")
			return
		}
		serverError(w, s.Log, r, err)
		return
	}
	// Renaming a live post must not break its address.
	if slug != nil && cur.Status == "published" && *slug != cur.Slug {
		_, _ = s.Pool.Exec(r.Context(), `INSERT INTO redirects (from_path, to_path) VALUES ($1,$2) ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path`, "/blog/"+cur.Slug, "/blog/"+*slug)
		_, _ = s.Pool.Exec(r.Context(), `DELETE FROM redirects WHERE from_path = $1`, "/blog/"+*slug)
		s.Notify.Revalidate(r.Context(), []string{tagPosts}, []string{"/blog/" + cur.Slug, "/blog/" + *slug, "/blog", "/sitemap.xml"}, false)
	}
	w.Header().Set("ETag", strconv.Itoa(v))
	httpx.JSON(w, 200, map[string]any{"version": v})
}

func (s *Server) lintPost(p adminPost) []copylint.Flag {
	doc, _ := richtext.Parse(p.Content)
	text := strings.Join([]string{p.Title, p.Excerpt, p.MetaTitle, p.MetaDescription, richtext.PlainText(doc)}, "\n")
	return copylint.Check(text)
}

func (s *Server) adminLintPost(w http.ResponseWriter, r *http.Request) {
	p, err := s.loadPost(r, r.PathValue("id"))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	flags := s.lintPost(p)
	if flags == nil {
		flags = []copylint.Flag{}
	}
	httpx.JSON(w, 200, map[string]any{"flags": flags})
}

func (s *Server) adminPublishPost(w http.ResponseWriter, r *http.Request) {
	var in struct {
		AcknowledgeLint bool `json:"acknowledgeLint"`
	}
	if r.ContentLength > 0 && !decode(w, r, &in, 1024) {
		return
	}
	ctx := r.Context()
	p, err := s.loadPost(r, r.PathValue("id"))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	doc, _ := richtext.Parse(p.Content)
	if strings.TrimSpace(p.Title) == "" || strings.TrimSpace(p.Excerpt) == "" || richtext.PlainText(doc) == "" {
		httpx.Problem(w, http.StatusUnprocessableEntity, "title, excerpt and content are required to publish")
		return
	}
	flags := s.lintPost(p)
	// Automated drafts (research bot, GSC, trend, FAQ) never go live without a clinician's review.
	// When the clinical admin publishes one, publishing is the review: they become the reviewer.
	var reviewer *string
	if p.Origin != "manual" {
		var clinician bool
		if p.ReviewedByProfileID != nil {
			_ = s.Pool.QueryRow(ctx, `SELECT is_clinician AND crp IS NOT NULL FROM profiles WHERE id::text = $1`, *p.ReviewedByProfileID).Scan(&clinician)
		}
		if !clinician && claimsFrom(ctx).Role == authn.RoleAdminClinical {
			var id string
			err := s.Pool.QueryRow(ctx, `SELECT id::text FROM profiles WHERE is_clinician AND crp IS NOT NULL
				ORDER BY (admin_user_id::text = $1) DESC NULLS LAST, is_primary DESC LIMIT 1`, s.actorID(r)).Scan(&id)
			if err == nil {
				reviewer, clinician = &id, true
			} else if !isNoRows(err) {
				serverError(w, s.Log, r, err)
				return
			}
		}
		if !clinician {
			httpx.Problem(w, http.StatusUnprocessableEntity, "Rascunhos automáticos precisam ser revisados por um psicólogo ou psicóloga com CRP antes de publicar. Peça a um profissional com CRP para publicar.")
			return
		}
		if len(flags) > 0 && !in.AcknowledgeLint {
			httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"title": "lint flags must be acknowledged", "flags": flags})
			return
		}
	} else if len(flags) > 0 && !in.AcknowledgeLint {
		httpx.JSON(w, http.StatusUnprocessableEntity, map[string]any{"title": "lint flags must be acknowledged", "flags": flags})
		return
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var version int
	var slug string
	var newlyPublished bool
	if err := tx.QueryRow(ctx, `UPDATE posts SET published_content = content, status = 'published',
		lint_ack_at = CASE WHEN $2 THEN now() ELSE lint_ack_at END,
		reviewed_by_profile_id = coalesce($3::uuid, reviewed_by_profile_id),
		last_reviewed_at = CASE WHEN $3::uuid IS NULL THEN last_reviewed_at ELSE now() END,
		published_at = coalesce(published_at, now()), updated_at = now()
		WHERE id::text = $1 RETURNING version, slug::text, (newsletter_sent_at IS NULL)`, p.ID, in.AcknowledgeLint, reviewer).Scan(&version, &slug, &newlyPublished); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := s.revisionTx(ctx, tx, "post", p.ID, version, map[string]any{"title": p.Title, "excerpt": p.Excerpt, "content": json.RawMessage(p.Content)}, s.actorID(r), r.URL.Query().Get("message")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	// One newsletter per post, ever: the unique post_id and newsletter_sent_at (set for imported posts) prevent re-sends.
	if newlyPublished {
		if _, err := tx.Exec(ctx, `INSERT INTO newsletter_campaigns (post_id) VALUES ($1::uuid) ON CONFLICT (post_id) DO NOTHING`, p.ID); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "post.publish", "post", p.ID, map[string]any{"slug": slug, "lintFlags": len(flags)})
	s.Notify.Revalidate(ctx, []string{tagPosts}, []string{"/blog/" + slug, "/blog", "/", "/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"}, false)
	s.Notify.IndexNow(ctx, []string{"/blog/" + slug, "/blog"})
	httpx.JSON(w, 200, map[string]any{"slug": slug})
}

func (s *Server) adminUnpublishPost(w http.ResponseWriter, r *http.Request) {
	var slug string
	err := s.Pool.QueryRow(r.Context(), `UPDATE posts SET status = 'draft', updated_at = now() WHERE id::text = $1 RETURNING slug::text`, r.PathValue("id")).Scan(&slug)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "post.unpublish", "post", r.PathValue("id"), map[string]any{"slug": slug})
	s.Notify.Revalidate(r.Context(), []string{tagPosts}, []string{"/blog/" + slug, "/blog", "/", "/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeletePost(w http.ResponseWriter, r *http.Request) {
	var slug string
	err := s.Pool.QueryRow(r.Context(), `DELETE FROM posts WHERE id::text = $1 RETURNING slug::text`, r.PathValue("id")).Scan(&slug)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "post.delete", "post", r.PathValue("id"), map[string]any{"slug": slug})
	s.Notify.Revalidate(r.Context(), []string{tagPosts, tagComments}, []string{"/blog/" + slug, "/blog", "/", "/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"}, false)
	w.WriteHeader(http.StatusNoContent)
}

// onlyClinical is the role list for endpoints that expose patient-related data.
var onlyClinical = []string{authn.RoleAdminClinical}
