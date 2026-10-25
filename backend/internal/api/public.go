package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
	"github.com/jackc/pgx/v5"
)

func (s *Server) publicRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/public/settings", s.getSettings)
	mux.HandleFunc("GET /api/v1/public/pages/{slug}", s.getPage)
	mux.HandleFunc("GET /api/v1/public/services", s.listServices)
	mux.HandleFunc("GET /api/v1/public/posts", s.listPosts)
	mux.HandleFunc("GET /api/v1/public/posts/{slug}", s.getPost)
	mux.HandleFunc("GET /api/v1/public/posts/{id}/comments", s.listComments)
	mux.HandleFunc("GET /api/v1/public/routes", s.listRoutes)
	mux.HandleFunc("GET /api/v1/public/redirects/resolve", s.resolveRedirect)
	mux.HandleFunc("GET /api/v1/public/profiles", s.listProfiles)
	mux.HandleFunc("GET /api/v1/public/profiles/{slug}", s.getProfile)
	mux.HandleFunc("GET /api/v1/public/glossary", s.listGlossary)
	mux.HandleFunc("GET /api/v1/public/glossary/{slug}", s.getGlossaryTerm)
	mux.HandleFunc("GET /api/v1/public/faq", s.listFAQ)
}

// ── settings ────────────────────────────────────────────────────────────────

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	var version int
	var at *time.Time
	err := s.Pool.QueryRow(r.Context(), `SELECT published, published_version, published_at FROM site_settings WHERE id = 1`).Scan(&raw, &version, &at)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	publicJSON(w, map[string]any{"version": version, "publishedAt": at, "settings": raw})
}

// ── pages & services ────────────────────────────────────────────────────────

// ServiceOut is the public shape of a service (merged into its page).
type ServiceOut struct {
	ID                 string          `json:"id"`
	Slug               string          `json:"slug"`
	Name               string          `json:"name"`
	CardTitle          string          `json:"cardTitle"`
	CardDescription    string          `json:"cardDescription"`
	Icon               string          `json:"icon"`
	Category           string          `json:"category"`
	Layout             string          `json:"layout"`
	Theme              string          `json:"theme"`
	Badge              string          `json:"badge"`
	CTAText            string          `json:"ctaText"`
	WhatsAppMessage    string          `json:"whatsappMessage"`
	VariantCopy        json.RawMessage `json:"variantCopy"`
	ShowOnHome         string          `json:"showOnHome"`
	CampaignKey        *string         `json:"campaignKey"`
	ShowInFooter       bool            `json:"showInFooter"`
	ShowContactSection bool            `json:"showContactSection"`
	SortOrder          int             `json:"sortOrder"`
	AnalyticsKey       string          `json:"analyticsKey"`
	Title              string          `json:"title"`
	Subtitle           string          `json:"subtitle"`
	MetaTitle          string          `json:"metaTitle"`
	MetaDescription    string          `json:"metaDescription"`
	Body               any             `json:"body"`
	UpdatedAt          time.Time       `json:"updatedAt"`
	CreatedAt          time.Time       `json:"createdAt"`
}

// PageOut is the public shape of a page.
type PageOut struct {
	ID              string          `json:"id"`
	Slug            string          `json:"slug"`
	Kind            string          `json:"kind"`
	Title           string          `json:"title"`
	Subtitle        string          `json:"subtitle"`
	MetaTitle       string          `json:"metaTitle"`
	MetaDescription string          `json:"metaDescription"`
	MarkdownTwin    bool            `json:"markdownTwin"`
	Blocks          json.RawMessage `json:"blocks"`
	PublishedAt     *time.Time      `json:"publishedAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
	Service         *ServiceOut     `json:"service,omitempty"`
}

const serviceSelect = `
	s.id::text, p.slug::text, s.name, s.card_title, s.card_description, s.icon, s.category, s.layout, s.theme, s.badge,
	s.cta_text, s.whatsapp_message, s.variant_copy, s.show_on_home, s.campaign_key, s.show_in_footer, s.show_contact_section,
	s.sort_order, s.analytics_key, p.title, p.subtitle, p.meta_title, p.meta_description, s.published_body, s.updated_at, s.created_at`

func scanService(row pgx.Row) (ServiceOut, error) {
	var o ServiceOut
	var body json.RawMessage
	err := row.Scan(&o.ID, &o.Slug, &o.Name, &o.CardTitle, &o.CardDescription, &o.Icon, &o.Category, &o.Layout, &o.Theme, &o.Badge,
		&o.CTAText, &o.WhatsAppMessage, &o.VariantCopy, &o.ShowOnHome, &o.CampaignKey, &o.ShowInFooter, &o.ShowContactSection,
		&o.SortOrder, &o.AnalyticsKey, &o.Title, &o.Subtitle, &o.MetaTitle, &o.MetaDescription, &body, &o.UpdatedAt, &o.CreatedAt)
	if err != nil {
		return o, err
	}
	if len(body) > 0 {
		o.Body, _ = richtext.Parse(body)
	}
	return o, nil
}

// populateMedia replaces upload ids in the given documents with media objects.
func (s *Server) populateMedia(ctx context.Context, docs ...any) error {
	var ids []string
	for _, d := range docs {
		ids = append(ids, richtext.UploadIDs(d)...)
	}
	if len(ids) == 0 {
		return nil
	}
	rows, err := s.Pool.Query(ctx, `SELECT id::text, filename, alt, mime_type, width, height FROM media WHERE id = ANY($1::uuid[])`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	m := map[string]richtext.Media{}
	for rows.Next() {
		var x richtext.Media
		if err := rows.Scan(&x.ID, &x.Filename, &x.Alt, &x.MimeType, &x.Width, &x.Height); err != nil {
			return err
		}
		x.URL = richtext.MediaURL(x.Filename)
		m[x.ID] = x
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, d := range docs {
		richtext.Populate(d, m)
	}
	return nil
}

func (s *Server) getPage(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "_home" {
		slug = ""
	}
	var o PageOut
	var pageID string
	err := s.Pool.QueryRow(r.Context(),
		`SELECT id::text, slug::text, kind, title, subtitle, meta_title, meta_description, markdown_twin, published_blocks, published_at, updated_at
		 FROM pages WHERE slug = $1 AND status = 'published' AND published_version > 0`, slug).
		Scan(&pageID, &o.Slug, &o.Kind, &o.Title, &o.Subtitle, &o.MetaTitle, &o.MetaDescription, &o.MarkdownTwin, &o.Blocks, &o.PublishedAt, &o.UpdatedAt)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	o.ID = pageID
	if o.Kind == "service" || o.Kind == "education" {
		svc, err := scanService(s.Pool.QueryRow(r.Context(), `SELECT `+serviceSelect+` FROM services s JOIN pages p ON p.id = s.page_id WHERE s.page_id = $1`, pageID))
		if err == nil {
			if err := s.populateMedia(r.Context(), svc.Body); err != nil {
				serverError(w, s.Log, r, err)
				return
			}
			o.Service = &svc
		} else if !isNoRows(err) {
			serverError(w, s.Log, r, err)
			return
		}
	}
	publicJSON(w, o)
}

func (s *Server) listServices(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT `+serviceSelect+`
		FROM services s JOIN pages p ON p.id = s.page_id
		WHERE p.status = 'published' AND p.published_version > 0 ORDER BY s.sort_order, s.name`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []ServiceOut{}
	for rows.Next() {
		svc, err := scanService(rows)
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		svc.Body = nil // the list is for cards and navigation; the page endpoint has the body
		out = append(out, svc)
	}
	publicJSON(w, map[string]any{"services": out})
}

// ── posts ───────────────────────────────────────────────────────────────────

// PostOut is the public shape of a post. Field names mirror the old Payload documents so the
// Next.js components keep working.
type PostOut struct {
	ID              string      `json:"id"`
	Slug            string      `json:"slug"`
	Title           string      `json:"title"`
	Excerpt         string      `json:"excerpt"`
	Keywords        string      `json:"keywords"`
	Content         any         `json:"content,omitempty"`
	PublishedDate   time.Time   `json:"publishedDate"`
	Author          string      `json:"author"`
	Image           any         `json:"image"`
	MetaTitle       string      `json:"metaTitle"`
	MetaDescription string      `json:"metaDescription"`
	ReviewedBy      *ReviewedBy `json:"reviewedBy,omitempty"`
	LastReviewedAt  *time.Time  `json:"lastReviewedAt,omitempty"`
	Citations       any         `json:"citations,omitempty"`
	Status          string      `json:"status"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

// ReviewedBy names the clinician who reviewed a post.
type ReviewedBy struct {
	Name string  `json:"name"`
	Slug string  `json:"slug"`
	CRP  *string `json:"crp"`
}

const postSelect = `
	po.id::text, po.slug::text, po.title, po.excerpt, po.keywords, po.published_at, po.author_name,
	po.meta_title, po.meta_description, po.status, po.created_at, po.updated_at, po.last_reviewed_at, po.citations,
	m.id::text, m.filename, m.alt, m.width, m.height, m.mime_type,
	rp.display_name, rp.slug::text, rp.crp`

const postFrom = `
	FROM posts po
	LEFT JOIN media m ON m.id = po.image_id
	LEFT JOIN profiles rp ON rp.id = po.reviewed_by_profile_id AND rp.visibility = 'public'`

func scanPost(row pgx.Row, withContent bool, content *json.RawMessage) (PostOut, error) {
	var p PostOut
	var citations json.RawMessage
	var mID, mFile, mAlt, mMime, rName, rSlug *string
	var mW, mH *int
	var rCRP *string
	var published *time.Time
	dest := []any{&p.ID, &p.Slug, &p.Title, &p.Excerpt, &p.Keywords, &published, &p.Author,
		&p.MetaTitle, &p.MetaDescription, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.LastReviewedAt, &citations,
		&mID, &mFile, &mAlt, &mW, &mH, &mMime, &rName, &rSlug, &rCRP}
	if withContent {
		dest = append(dest, content)
	}
	if err := row.Scan(dest...); err != nil {
		return p, err
	}
	if published != nil {
		p.PublishedDate = *published
	}
	if mID != nil && mFile != nil {
		alt := ""
		if mAlt != nil {
			alt = *mAlt
		}
		p.Image = richtext.Media{ID: *mID, URL: richtext.MediaURL(*mFile), Filename: *mFile, Alt: alt, Width: mW, Height: mH, MimeType: derefStr(mMime)}
	}
	if rName != nil && rSlug != nil {
		p.ReviewedBy = &ReviewedBy{Name: *rName, Slug: *rSlug, CRP: rCRP}
	}
	if len(citations) > 2 {
		p.Citations, _ = richtext.Parse(citations)
	}
	return p, nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (s *Server) listPosts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT `+postSelect+postFrom+`
		WHERE po.status = 'published' AND po.published_at <= now() ORDER BY po.published_at DESC LIMIT 1000`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []PostOut{}
	for rows.Next() {
		p, err := scanPost(rows, false, nil)
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, p)
	}
	publicJSON(w, map[string]any{"posts": out})
}

func (s *Server) getPost(w http.ResponseWriter, r *http.Request) {
	var content json.RawMessage
	p, err := scanPost(s.Pool.QueryRow(r.Context(), `SELECT `+postSelect+`, po.published_content`+postFrom+`
		WHERE po.slug = $1 AND po.status = 'published' AND po.published_at <= now()`, r.PathValue("slug")), true, &content)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	doc, _ := richtext.Parse(content)
	if err := s.populateMedia(r.Context(), doc); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	p.Content = doc
	publicJSON(w, p)
}

func (s *Server) listComments(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(),
		`SELECT id::text, body, created_at, author_name FROM comments
		 WHERE post_id = $1::uuid AND status = 'approved' ORDER BY created_at LIMIT 100`, r.PathValue("id"))
	if err != nil {
		badRequest(w, "invalid post id")
		return
	}
	defer rows.Close()
	type c struct {
		ID         string    `json:"id"`
		Body       string    `json:"body"`
		CreatedAt  time.Time `json:"createdAt"`
		AuthorName string    `json:"authorName"`
	}
	out := []c{}
	for rows.Next() {
		var x c
		if err := rows.Scan(&x.ID, &x.Body, &x.CreatedAt, &x.AuthorName); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, x)
	}
	publicJSON(w, map[string]any{"comments": out})
}

// ── routes / redirects ──────────────────────────────────────────────────────

func (s *Server) listRoutes(w http.ResponseWriter, r *http.Request) {
	type route struct {
		Path         string    `json:"path"`
		Kind         string    `json:"kind"`
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		UpdatedAt    time.Time `json:"updatedAt"`
		MarkdownTwin bool      `json:"markdownTwin"`
	}
	out := []route{}
	rows, err := s.Pool.Query(r.Context(),
		`SELECT slug::text, kind, coalesce(nullif(meta_title,''), title), coalesce(nullif(meta_description,''), subtitle), updated_at, markdown_twin
		 FROM pages WHERE status = 'published' AND published_version > 0 ORDER BY slug`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	for rows.Next() {
		var x route
		var slug string
		if err := rows.Scan(&slug, &x.Kind, &x.Title, &x.Description, &x.UpdatedAt, &x.MarkdownTwin); err != nil {
			rows.Close()
			serverError(w, s.Log, r, err)
			return
		}
		x.Path = "/" + slug
		out = append(out, x)
	}
	rows.Close()
	rows, err = s.Pool.Query(r.Context(),
		`SELECT slug::text, title, excerpt, updated_at FROM posts WHERE status = 'published' AND published_at <= now() ORDER BY published_at DESC`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	for rows.Next() {
		x := route{Kind: "post", MarkdownTwin: true}
		var slug string
		if err := rows.Scan(&slug, &x.Title, &x.Description, &x.UpdatedAt); err != nil {
			rows.Close()
			serverError(w, s.Log, r, err)
			return
		}
		x.Path = "/blog/" + slug
		out = append(out, x)
	}
	rows.Close()
	publicJSON(w, map[string]any{"routes": out})
}

func (s *Server) resolveRedirect(w http.ResponseWriter, r *http.Request) {
	var to string
	var status int
	err := s.Pool.QueryRow(r.Context(), `SELECT to_path, status FROM redirects WHERE from_path = $1`, r.URL.Query().Get("path")).Scan(&to, &status)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	publicJSON(w, map[string]any{"to": to, "status": status})
}

// ── profiles, glossary, faq ─────────────────────────────────────────────────

type entryOut struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	Organization string  `json:"organization"`
	Location     string  `json:"location"`
	StartDate    *string `json:"startDate"`
	EndDate      *string `json:"endDate"`
	IsCurrent    bool    `json:"isCurrent"`
	Description  string  `json:"description"`
	URL          string  `json:"url"`
	CredentialID string  `json:"credentialId"`
	Icon         string  `json:"icon"`
	Featured     bool    `json:"featured"`
	Metadata     any     `json:"metadata"`
}

type sectionOut struct {
	ID      string     `json:"id"`
	Kind    string     `json:"kind"`
	Title   string     `json:"title"`
	Entries []entryOut `json:"entries"`
}

type profileOut struct {
	ID              string       `json:"id"`
	Slug            string       `json:"slug"`
	DisplayName     string       `json:"displayName"`
	FullName        string       `json:"fullName"`
	JobTitle        string       `json:"jobTitle"`
	CRP             *string      `json:"crp"`
	IsClinician     bool         `json:"isClinician"`
	PracticingSince *int         `json:"practicingSince"`
	Approach        string       `json:"approach"`
	Bio             any          `json:"bio"`
	Photo           any          `json:"photo"`
	KnowsAbout      []string     `json:"knowsAbout"`
	Languages       []string     `json:"languages"`
	AlumniOf        []string     `json:"alumniOf"`
	Links           any          `json:"links"`
	IsPrimary       bool         `json:"isPrimary"`
	Sections        []sectionOut `json:"sections,omitempty"`
	UpdatedAt       time.Time    `json:"updatedAt"`
}

const profileSelect = `
	p.id::text, p.slug::text, p.display_name, p.full_name, p.job_title, p.crp, p.is_clinician, p.practicing_since, p.approach,
	p.bio, p.knows_about, p.languages, p.alumni_of, p.links, p.is_primary, p.updated_at,
	m.id::text, m.filename, m.alt, m.width, m.height, m.mime_type`

func scanProfile(row pgx.Row) (profileOut, error) {
	var p profileOut
	var bio, links json.RawMessage
	var mID, mFile, mAlt, mMime *string
	var mW, mH *int
	if err := row.Scan(&p.ID, &p.Slug, &p.DisplayName, &p.FullName, &p.JobTitle, &p.CRP, &p.IsClinician, &p.PracticingSince, &p.Approach,
		&bio, &p.KnowsAbout, &p.Languages, &p.AlumniOf, &links, &p.IsPrimary, &p.UpdatedAt,
		&mID, &mFile, &mAlt, &mW, &mH, &mMime); err != nil {
		return p, err
	}
	p.Bio, _ = richtext.Parse(bio)
	p.Links, _ = richtext.Parse(links)
	if mID != nil && mFile != nil {
		p.Photo = richtext.Media{ID: *mID, URL: richtext.MediaURL(*mFile), Filename: *mFile, Alt: derefStr(mAlt), Width: mW, Height: mH, MimeType: derefStr(mMime)}
	}
	return p, nil
}

func (s *Server) profileSections(ctx context.Context, profileID string) ([]sectionOut, error) {
	rows, err := s.Pool.Query(ctx, `SELECT s.id::text, s.kind, s.title,
		e.id::text, e.title, e.organization, e.location, to_char(e.start_date,'YYYY-MM-DD'), to_char(e.end_date,'YYYY-MM-DD'),
		e.is_current, e.description, e.url, e.credential_id, e.icon, e.featured, e.metadata
		FROM profile_sections s LEFT JOIN profile_entries e ON e.section_id = s.id
		WHERE s.profile_id = $1 AND s.visible ORDER BY s.sort_order, s.title, e.sort_order, e.start_date DESC NULLS FIRST`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []sectionOut
	idx := map[string]int{}
	for rows.Next() {
		var sid, kind, title string
		var e entryOut
		var eid *string
		var etitle, eorg, eloc, edesc, eurl, ecred, eicon *string
		var efeat, ecur *bool
		var meta json.RawMessage
		if err := rows.Scan(&sid, &kind, &title, &eid, &etitle, &eorg, &eloc, &e.StartDate, &e.EndDate, &ecur, &edesc, &eurl, &ecred, &eicon, &efeat, &meta); err != nil {
			return nil, err
		}
		i, ok := idx[sid]
		if !ok {
			out = append(out, sectionOut{ID: sid, Kind: kind, Title: title, Entries: []entryOut{}})
			i = len(out) - 1
			idx[sid] = i
		}
		if eid != nil {
			e.ID, e.Title, e.Organization, e.Location = *eid, derefStr(etitle), derefStr(eorg), derefStr(eloc)
			e.Description, e.URL, e.CredentialID, e.Icon = derefStr(edesc), derefStr(eurl), derefStr(ecred), derefStr(eicon)
			e.IsCurrent = ecur != nil && *ecur
			e.Featured = efeat != nil && *efeat
			e.Metadata, _ = richtext.Parse(meta)
			out[i].Entries = append(out[i].Entries, e)
		}
	}
	return out, rows.Err()
}

const profileFrom = ` FROM profiles p LEFT JOIN media m ON m.id = p.photo_id WHERE p.visibility = 'public'`

func (s *Server) listProfiles(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT `+profileSelect+profileFrom+` ORDER BY p.is_primary DESC, p.display_name`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	var list []profileOut
	for rows.Next() {
		p, err := scanProfile(rows)
		if err != nil {
			rows.Close()
			serverError(w, s.Log, r, err)
			return
		}
		list = append(list, p)
	}
	rows.Close()
	// The home page's credentials grid and Person JSON-LD need entries, so include sections.
	for i := range list {
		if list[i].Sections, err = s.profileSections(r.Context(), list[i].ID); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
	}
	if list == nil {
		list = []profileOut{}
	}
	publicJSON(w, map[string]any{"profiles": list})
}

func (s *Server) getProfile(w http.ResponseWriter, r *http.Request) {
	p, err := scanProfile(s.Pool.QueryRow(r.Context(), `SELECT `+profileSelect+profileFrom+` AND p.slug = $1`, r.PathValue("slug")))
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if p.Sections, err = s.profileSections(r.Context(), p.ID); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := s.populateMedia(r.Context(), p.Bio); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	publicJSON(w, p)
}

func (s *Server) listGlossary(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT slug::text, term, alt_names, short_definition, updated_at FROM glossary_terms WHERE status = 'published' ORDER BY term`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type t struct {
		Slug            string    `json:"slug"`
		Term            string    `json:"term"`
		AltNames        []string  `json:"altNames"`
		ShortDefinition string    `json:"shortDefinition"`
		UpdatedAt       time.Time `json:"updatedAt"`
	}
	out := []t{}
	for rows.Next() {
		var x t
		if err := rows.Scan(&x.Slug, &x.Term, &x.AltNames, &x.ShortDefinition, &x.UpdatedAt); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, x)
	}
	publicJSON(w, map[string]any{"terms": out})
}

func (s *Server) getGlossaryTerm(w http.ResponseWriter, r *http.Request) {
	var slug, term, short string
	var alt []string
	var body, sources json.RawMessage
	var updated time.Time
	var reviewer, reviewerSlug, reviewerCRP *string
	err := s.Pool.QueryRow(r.Context(), `SELECT g.slug::text, g.term, g.alt_names, g.short_definition, g.body, g.sources, g.updated_at, p.display_name, p.slug::text, p.crp
		FROM glossary_terms g LEFT JOIN profiles p ON p.id = g.reviewed_by_profile_id AND p.visibility = 'public'
		WHERE g.slug = $1 AND g.status = 'published'`, r.PathValue("slug")).
		Scan(&slug, &term, &alt, &short, &body, &sources, &updated, &reviewer, &reviewerSlug, &reviewerCRP)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	doc, _ := richtext.Parse(body)
	if err := s.populateMedia(r.Context(), doc); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	src, _ := richtext.Parse(sources)
	out := map[string]any{"slug": slug, "term": term, "altNames": alt, "shortDefinition": short, "body": doc, "sources": src, "updatedAt": updated}
	if reviewer != nil && reviewerSlug != nil {
		out["reviewedBy"] = ReviewedBy{Name: *reviewer, Slug: *reviewerSlug, CRP: reviewerCRP}
	}
	publicJSON(w, out)
}

func (s *Server) listFAQ(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, slug::text, question, answer, topic, published_at FROM faq_questions WHERE status = 'published' ORDER BY published_at DESC`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type q struct {
		ID          string     `json:"id"`
		Slug        *string    `json:"slug"`
		Question    string     `json:"question"`
		Answer      any        `json:"answer"`
		Topic       string     `json:"topic"`
		PublishedAt *time.Time `json:"publishedAt"`
	}
	out := []q{}
	for rows.Next() {
		var x q
		var ans json.RawMessage
		if err := rows.Scan(&x.ID, &x.Slug, &x.Question, &ans, &x.Topic, &x.PublishedAt); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		x.Answer, _ = richtext.Parse(ans)
		out = append(out, x)
	}
	publicJSON(w, map[string]any{"questions": out})
}
