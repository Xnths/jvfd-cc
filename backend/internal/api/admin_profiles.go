package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

var sectionKinds = map[string]bool{"experience": true, "education": true, "certification": true, "publication": true,
	"course": true, "language": true, "award": true, "custom": true}

func (s *Server) adminProfileRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc) http.Handler { return s.requireAdmin(h) }
	mux.Handle("GET /api/v1/admin/profiles", a(s.adminListProfiles))
	mux.Handle("POST /api/v1/admin/profiles", s.requireAdmin(s.adminCreateProfile, authn.RoleAdminClinical))
	mux.Handle("GET /api/v1/admin/profiles/{id}", a(s.adminGetProfile))
	mux.Handle("PATCH /api/v1/admin/profiles/{id}", a(s.adminPatchProfile))
	mux.Handle("POST /api/v1/admin/profiles/{id}/sections", a(s.adminCreateSection))
	mux.Handle("POST /api/v1/admin/profiles/{id}/sections/reorder", a(s.adminReorderSections))
	mux.Handle("PATCH /api/v1/admin/sections/{id}", a(s.adminPatchSection))
	mux.Handle("DELETE /api/v1/admin/sections/{id}", a(s.adminDeleteSection))
	mux.Handle("POST /api/v1/admin/sections/{id}/entries", a(s.adminCreateEntry))
	mux.Handle("POST /api/v1/admin/sections/{id}/entries/reorder", a(s.adminReorderEntries))
	mux.Handle("PATCH /api/v1/admin/entries/{id}", a(s.adminPatchEntry))
	mux.Handle("DELETE /api/v1/admin/entries/{id}", a(s.adminDeleteEntry))

	mux.Handle("GET /api/v1/admin/glossary", a(s.adminListGlossary))
	mux.Handle("POST /api/v1/admin/glossary", a(s.adminUpsertGlossary))
	mux.Handle("PUT /api/v1/admin/glossary/{id}", a(s.adminUpsertGlossary))
	mux.Handle("POST /api/v1/admin/glossary/{id}/publish", a(s.adminPublishGlossary))
	mux.Handle("DELETE /api/v1/admin/glossary/{id}", a(s.adminDeleteGlossary))
}

// canEditProfile: the owner may edit their own profile; the clinical admin may edit any.
func (s *Server) canEditProfile(r *http.Request, profileID string) (bool, error) {
	c := claimsFrom(r.Context())
	if c.Role == authn.RoleAdminClinical {
		var exists bool
		err := s.Pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM profiles WHERE id::text = $1)`, profileID).Scan(&exists)
		return exists, err
	}
	var owner bool
	err := s.Pool.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM profiles WHERE id::text = $1 AND admin_user_id::text = $2)`, profileID, c.Subject).Scan(&owner)
	return owner, err
}

func (s *Server) profileIDOfSection(r *http.Request, sectionID string) (string, error) {
	var id string
	err := s.Pool.QueryRow(r.Context(), `SELECT profile_id::text FROM profile_sections WHERE id::text = $1`, sectionID).Scan(&id)
	return id, err
}

func (s *Server) profileIDOfEntry(r *http.Request, entryID string) (string, error) {
	var id string
	err := s.Pool.QueryRow(r.Context(), `SELECT s.profile_id::text FROM profile_entries e JOIN profile_sections s ON s.id = e.section_id WHERE e.id::text = $1`, entryID).Scan(&id)
	return id, err
}

// authorize loads the profile id with fn and checks edit rights, writing the error response itself.
func (s *Server) authorize(w http.ResponseWriter, r *http.Request, profileID string, err error) bool {
	if isNoRows(err) {
		notFound(w)
		return false
	}
	if err != nil {
		badRequest(w, "invalid id")
		return false
	}
	ok, err := s.canEditProfile(r, profileID)
	if err != nil {
		serverError(w, s.Log, r, err)
		return false
	}
	if !ok {
		httpx.Problem(w, http.StatusForbidden, "you can only edit your own profile")
		return false
	}
	return true
}

func (s *Server) profileChanged(r *http.Request) {
	s.Notify.Revalidate(r.Context(), []string{tagProfiles, tagSettings}, []string{"/", "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
}

func (s *Server) adminListProfiles(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, slug::text, display_name, job_title, crp, is_clinician, visibility, is_primary, admin_user_id::text FROM profiles ORDER BY is_primary DESC, display_name`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	me := claimsFrom(r.Context())
	for rows.Next() {
		var id, slug, name, title, vis string
		var crp, owner *string
		var clin, primary bool
		if err := rows.Scan(&id, &slug, &name, &title, &crp, &clin, &vis, &primary, &owner); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "slug": slug, "displayName": name, "jobTitle": title, "crp": crp, "isClinician": clin,
			"visibility": vis, "isPrimary": primary, "editable": me.Role == authn.RoleAdminClinical || (owner != nil && *owner == me.Subject)})
	}
	httpx.JSON(w, 200, map[string]any{"profiles": out})
}

func (s *Server) adminGetProfile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var p struct {
		ID, Slug, DisplayName, FullName, JobTitle, Approach, Visibility string
		CRP                                                             *string
		IsClinician, IsPrimary                                          bool
		PracticingSince                                                 *int
		Bio                                                             json.RawMessage
		PhotoID                                                         *string
		KnowsAbout, Languages, AlumniOf                                 []string
		Links                                                           json.RawMessage
	}
	err := s.Pool.QueryRow(r.Context(), `SELECT id::text, slug::text, display_name, full_name, job_title, approach, visibility, crp, is_clinician, is_primary,
		practicing_since, bio, photo_id::text, knows_about, languages, alumni_of, links FROM profiles WHERE id::text = $1`, id).
		Scan(&p.ID, &p.Slug, &p.DisplayName, &p.FullName, &p.JobTitle, &p.Approach, &p.Visibility, &p.CRP, &p.IsClinician, &p.IsPrimary,
			&p.PracticingSince, &p.Bio, &p.PhotoID, &p.KnowsAbout, &p.Languages, &p.AlumniOf, &p.Links)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		badRequest(w, "invalid id")
		return
	}
	// Admin view includes hidden sections.
	rows, err := s.Pool.Query(r.Context(), `SELECT s.id::text, s.kind, s.title, s.visible, s.sort_order,
		e.id::text, e.title, e.organization, e.location, to_char(e.start_date,'YYYY-MM-DD'), to_char(e.end_date,'YYYY-MM-DD'),
		e.is_current, e.description, e.url, e.credential_id, e.icon, e.featured, e.sort_order
		FROM profile_sections s LEFT JOIN profile_entries e ON e.section_id = s.id WHERE s.profile_id::text = $1 ORDER BY s.sort_order, e.sort_order`, id)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	type entry struct {
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
		SortOrder    int     `json:"sortOrder"`
	}
	type section struct {
		ID        string  `json:"id"`
		Kind      string  `json:"kind"`
		Title     string  `json:"title"`
		Visible   bool    `json:"visible"`
		SortOrder int     `json:"sortOrder"`
		Entries   []entry `json:"entries"`
	}
	sections := []section{}
	idx := map[string]int{}
	for rows.Next() {
		var sec section
		var eid, et, eo, el, ed, eu, ec, ei *string
		var es, ee *string
		var ecur, efeat *bool
		var eso *int
		if err := rows.Scan(&sec.ID, &sec.Kind, &sec.Title, &sec.Visible, &sec.SortOrder, &eid, &et, &eo, &el, &es, &ee, &ecur, &ed, &eu, &ec, &ei, &efeat, &eso); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		i, ok := idx[sec.ID]
		if !ok {
			sec.Entries = []entry{}
			sections = append(sections, sec)
			i = len(sections) - 1
			idx[sec.ID] = i
		}
		if eid != nil {
			sections[i].Entries = append(sections[i].Entries, entry{ID: *eid, Title: derefStr(et), Organization: derefStr(eo), Location: derefStr(el),
				StartDate: es, EndDate: ee, IsCurrent: ecur != nil && *ecur, Description: derefStr(ed), URL: derefStr(eu),
				CredentialID: derefStr(ec), Icon: derefStr(ei), Featured: efeat != nil && *efeat, SortOrder: intOr(eso)})
		}
	}
	httpx.JSON(w, 200, map[string]any{"profile": p, "sections": sections})
}

func intOr(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

func (s *Server) adminCreateProfile(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug        string  `json:"slug"`
		DisplayName string  `json:"displayName"`
		AdminUserID *string `json:"adminUserId"`
	}
	if !decode(w, r, &in, 2048) {
		return
	}
	if !s.validSlug(in.Slug) || strings.TrimSpace(in.DisplayName) == "" {
		badRequest(w, "invalid slug or name")
		return
	}
	var id string
	err := s.Pool.QueryRow(r.Context(), `INSERT INTO profiles (slug, display_name, full_name, admin_user_id) VALUES ($1,$2,$2,$3::uuid) RETURNING id::text`,
		in.Slug, strings.TrimSpace(in.DisplayName), in.AdminUserID).Scan(&id)
	if err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "slug or user already has a profile")
			return
		}
		badRequest(w, "invalid data")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) adminPatchProfile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !s.authorize(w, r, id, nil) {
		return
	}
	var in struct {
		DisplayName     *string          `json:"displayName"`
		FullName        *string          `json:"fullName"`
		JobTitle        *string          `json:"jobTitle"`
		CRP             *string          `json:"crp"`
		PracticingSince *int             `json:"practicingSince"`
		Approach        *string          `json:"approach"`
		Bio             *json.RawMessage `json:"bio"`
		PhotoID         *string          `json:"photoId"`
		KnowsAbout      *[]string        `json:"knowsAbout"`
		Languages       *[]string        `json:"languages"`
		AlumniOf        *[]string        `json:"alumniOf"`
		Links           *json.RawMessage `json:"links"`
		Visibility      *string          `json:"visibility"`
		IsClinician     *bool            `json:"isClinician"`
		IsPrimary       *bool            `json:"isPrimary"`
		Slug            *string          `json:"slug"`
	}
	if !decode(w, r, &in, 1<<20) {
		return
	}
	me := claimsFrom(r.Context())
	// Credentials and visibility on the site are the clinical admin's call.
	if me.Role != authn.RoleAdminClinical && (in.CRP != nil || in.IsClinician != nil || in.IsPrimary != nil || in.Slug != nil || in.Visibility != nil) {
		httpx.Problem(w, http.StatusForbidden, "only the clinical admin can change registration, slug or visibility")
		return
	}
	if in.Visibility != nil && *in.Visibility != "public" && *in.Visibility != "hidden" {
		badRequest(w, "invalid visibility")
		return
	}
	if in.Slug != nil && !s.validSlug(*in.Slug) {
		badRequest(w, "invalid slug")
		return
	}
	var bio, links any
	if in.Bio != nil {
		bio = []byte(*in.Bio)
	}
	if in.Links != nil {
		var m map[string]any
		if json.Unmarshal(*in.Links, &m) != nil {
			badRequest(w, "links must be an object")
			return
		}
		links = []byte(*in.Links)
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(r.Context()) //nolint:errcheck
	if in.IsPrimary != nil && *in.IsPrimary {
		if _, err := tx.Exec(r.Context(), `UPDATE profiles SET is_primary = false WHERE is_primary`); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
	}
	_, err = tx.Exec(r.Context(), `UPDATE profiles SET
		display_name = coalesce($2, display_name), full_name = coalesce($3, full_name), job_title = coalesce($4, job_title),
		crp = CASE WHEN $5::text IS NULL THEN crp WHEN $5 = '' THEN NULL ELSE $5 END,
		practicing_since = coalesce($6, practicing_since), approach = coalesce($7, approach), bio = coalesce($8::jsonb, bio),
		photo_id = CASE WHEN $9::text IS NULL THEN photo_id WHEN $9 = '' THEN NULL ELSE $9::uuid END,
		knows_about = coalesce($10, knows_about), languages = coalesce($11, languages), alumni_of = coalesce($12, alumni_of),
		links = coalesce($13::jsonb, links), visibility = coalesce($14, visibility), is_clinician = coalesce($15, is_clinician),
		is_primary = coalesce($16, is_primary), slug = coalesce($17, slug), updated_at = now()
		WHERE id::text = $1`,
		id, in.DisplayName, in.FullName, in.JobTitle, in.CRP, in.PracticingSince, in.Approach, bio, in.PhotoID,
		in.KnowsAbout, in.Languages, in.AlumniOf, links, in.Visibility, in.IsClinician, in.IsPrimary, in.Slug)
	if err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "slug already in use")
			return
		}
		badRequest(w, "invalid data")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "profile.update", "profile", id, nil)
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminCreateSection(w http.ResponseWriter, r *http.Request) {
	pid := r.PathValue("id")
	if !s.authorize(w, r, pid, nil) {
		return
	}
	var in struct {
		Kind  string `json:"kind"`
		Title string `json:"title"`
	}
	if !decode(w, r, &in, 1024) {
		return
	}
	if !sectionKinds[in.Kind] || strings.TrimSpace(in.Title) == "" {
		badRequest(w, "invalid kind or title")
		return
	}
	var id string
	if err := s.Pool.QueryRow(r.Context(), `INSERT INTO profile_sections (profile_id, kind, title, sort_order)
		VALUES ($1::uuid,$2,$3,(SELECT coalesce(max(sort_order),0)+10 FROM profile_sections WHERE profile_id = $1::uuid)) RETURNING id::text`,
		pid, in.Kind, strings.TrimSpace(in.Title)).Scan(&id); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) adminReorderSections(w http.ResponseWriter, r *http.Request) {
	pid := r.PathValue("id")
	if !s.authorize(w, r, pid, nil) {
		return
	}
	s.reorder(w, r, `UPDATE profile_sections SET sort_order = $3 WHERE id::text = $1 AND profile_id::text = $2`, pid)
}

func (s *Server) adminReorderEntries(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfSection(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	s.reorder(w, r, `UPDATE profile_entries SET sort_order = $3 WHERE id::text = $1 AND section_id::text = $2`, r.PathValue("id"))
}

func (s *Server) reorder(w http.ResponseWriter, r *http.Request, sql, parent string) {
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
		if _, err := tx.Exec(r.Context(), sql, id, parent, (i+1)*10); err != nil {
			badRequest(w, "invalid id")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminPatchSection(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfSection(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	var in struct {
		Title   *string `json:"title"`
		Visible *bool   `json:"visible"`
		Kind    *string `json:"kind"`
	}
	if !decode(w, r, &in, 1024) {
		return
	}
	if in.Kind != nil && !sectionKinds[*in.Kind] {
		badRequest(w, "invalid kind")
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE profile_sections SET title = coalesce($2,title), visible = coalesce($3,visible), kind = coalesce($4,kind) WHERE id::text = $1`,
		r.PathValue("id"), in.Title, in.Visible, in.Kind); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeleteSection(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfSection(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `DELETE FROM profile_sections WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

type entryIn struct {
	Title        *string         `json:"title"`
	Organization *string         `json:"organization"`
	Location     *string         `json:"location"`
	StartDate    *string         `json:"startDate"`
	EndDate      *string         `json:"endDate"`
	IsCurrent    *bool           `json:"isCurrent"`
	Description  *string         `json:"description"`
	URL          *string         `json:"url"`
	CredentialID *string         `json:"credentialId"`
	Icon         *string         `json:"icon"`
	Featured     *bool           `json:"featured"`
	Metadata     json.RawMessage `json:"metadata"`
}

func validDate(p *string) bool {
	if p == nil || *p == "" {
		return true
	}
	_, err := time.Parse("2006-01-02", *p)
	return err == nil
}

func (in entryIn) check() string {
	switch {
	case in.Title != nil && strings.TrimSpace(*in.Title) == "":
		return "title cannot be empty"
	case !validDate(in.StartDate) || !validDate(in.EndDate):
		return "dates must be YYYY-MM-DD"
	case in.URL != nil && *in.URL != "" && !strings.HasPrefix(*in.URL, "https://") && !strings.HasPrefix(*in.URL, "http://"):
		return "url must start with http:// or https://"
	}
	return ""
}

func (s *Server) adminCreateEntry(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfSection(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	var in entryIn
	if !decode(w, r, &in, 16<<10) {
		return
	}
	if in.Title == nil || in.check() != "" {
		badRequest(w, firstNonEmpty(in.check(), "title is required"))
		return
	}
	meta := []byte(`{}`)
	if len(in.Metadata) > 0 {
		meta = in.Metadata
	}
	var id string
	err = s.Pool.QueryRow(r.Context(), `INSERT INTO profile_entries (section_id, title, organization, location, start_date, end_date, is_current, description, url, credential_id, icon, featured, metadata, sort_order)
		VALUES ($1::uuid,$2,coalesce($3,''),coalesce($4,''),nullif($5,'')::date,nullif($6,'')::date,coalesce($7,false),coalesce($8,''),coalesce($9,''),coalesce($10,''),coalesce($11,''),coalesce($12,false),$13,
		(SELECT coalesce(max(sort_order),0)+10 FROM profile_entries WHERE section_id = $1::uuid)) RETURNING id::text`,
		r.PathValue("id"), strings.TrimSpace(*in.Title), in.Organization, in.Location, in.StartDate, in.EndDate, in.IsCurrent, in.Description, in.URL, in.CredentialID, in.Icon, in.Featured, meta).Scan(&id)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	httpx.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) adminPatchEntry(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfEntry(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	var in entryIn
	if !decode(w, r, &in, 16<<10) {
		return
	}
	if msg := in.check(); msg != "" {
		badRequest(w, msg)
		return
	}
	var meta any
	if len(in.Metadata) > 0 {
		meta = []byte(in.Metadata)
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE profile_entries SET title = coalesce($2,title), organization = coalesce($3,organization), location = coalesce($4,location),
		start_date = CASE WHEN $5::text IS NULL THEN start_date ELSE nullif($5,'')::date END, end_date = CASE WHEN $6::text IS NULL THEN end_date ELSE nullif($6,'')::date END,
		is_current = coalesce($7,is_current), description = coalesce($8,description), url = coalesce($9,url), credential_id = coalesce($10,credential_id),
		icon = coalesce($11,icon), featured = coalesce($12,featured), metadata = coalesce($13::jsonb,metadata) WHERE id::text = $1`,
		r.PathValue("id"), in.Title, in.Organization, in.Location, in.StartDate, in.EndDate, in.IsCurrent, in.Description, in.URL, in.CredentialID, in.Icon, in.Featured, meta); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeleteEntry(w http.ResponseWriter, r *http.Request) {
	pid, err := s.profileIDOfEntry(r, r.PathValue("id"))
	if !s.authorize(w, r, pid, err) {
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `DELETE FROM profile_entries WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.profileChanged(r)
	w.WriteHeader(http.StatusNoContent)
}

// ── glossary ─────────────────────────────────────────────────────────────────

func (s *Server) adminListGlossary(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, slug::text, term, alt_names, short_definition, body, sources, status, reviewed_by_profile_id::text, published_at, updated_at FROM glossary_terms ORDER BY term`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, slug, term, short, status string
		var alt []string
		var body, sources json.RawMessage
		var rev *string
		var pub *time.Time
		var upd time.Time
		if err := rows.Scan(&id, &slug, &term, &alt, &short, &body, &sources, &status, &rev, &pub, &upd); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "slug": slug, "term": term, "altNames": alt, "shortDefinition": short, "body": body, "sources": sources,
			"status": status, "reviewedByProfileId": rev, "publishedAt": pub, "updatedAt": upd})
	}
	httpx.JSON(w, 200, map[string]any{"terms": out})
}

func (s *Server) adminUpsertGlossary(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug                string          `json:"slug"`
		Term                string          `json:"term"`
		AltNames            []string        `json:"altNames"`
		ShortDefinition     string          `json:"shortDefinition"`
		Body                json.RawMessage `json:"body"`
		Sources             json.RawMessage `json:"sources"`
		ReviewedByProfileID *string         `json:"reviewedByProfileId"`
	}
	if !decode(w, r, &in, 1<<20) {
		return
	}
	if strings.TrimSpace(in.Term) == "" {
		badRequest(w, "term is required")
		return
	}
	slug := Slugify(firstNonEmpty(in.Slug, in.Term))
	if slug == "" {
		badRequest(w, "invalid slug")
		return
	}
	if len(in.Sources) == 0 {
		in.Sources = []byte(`[]`)
	}
	if in.AltNames == nil {
		in.AltNames = []string{}
	}
	var body any
	if len(in.Body) > 0 {
		body = []byte(in.Body)
	}
	id := r.PathValue("id")
	var out string
	var err error
	if id == "" {
		err = s.Pool.QueryRow(r.Context(), `INSERT INTO glossary_terms (slug, term, alt_names, short_definition, body, sources, reviewed_by_profile_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7::uuid) RETURNING id::text`, slug, strings.TrimSpace(in.Term), in.AltNames, in.ShortDefinition, body, []byte(in.Sources), in.ReviewedByProfileID).Scan(&out)
	} else {
		err = s.Pool.QueryRow(r.Context(), `UPDATE glossary_terms SET slug = $2, term = $3, alt_names = $4, short_definition = $5, body = $6, sources = $7,
			reviewed_by_profile_id = $8::uuid, updated_at = now() WHERE id::text = $1 RETURNING id::text`, id, slug, strings.TrimSpace(in.Term), in.AltNames, in.ShortDefinition, body, []byte(in.Sources), in.ReviewedByProfileID).Scan(&out)
	}
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		if isUnique(err) {
			httpx.Problem(w, http.StatusConflict, "a term with this address already exists")
			return
		}
		badRequest(w, "invalid data")
		return
	}
	s.Notify.Revalidate(r.Context(), []string{tagGlossary}, []string{"/glossario", "/glossario/" + slug}, false)
	httpx.JSON(w, 200, map[string]string{"id": out, "slug": slug})
}

func (s *Server) adminPublishGlossary(w http.ResponseWriter, r *http.Request) {
	var slug string
	var reviewed *string
	var short string
	err := s.Pool.QueryRow(r.Context(), `SELECT slug::text, reviewed_by_profile_id::text, short_definition FROM glossary_terms WHERE id::text = $1`, r.PathValue("id")).Scan(&slug, &reviewed, &short)
	if isNoRows(err) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if reviewed == nil || strings.TrimSpace(short) == "" {
		httpx.Problem(w, http.StatusUnprocessableEntity, "a definition and a clinician reviewer are required to publish")
		return
	}
	if _, err := s.Pool.Exec(r.Context(), `UPDATE glossary_terms SET status = 'published', published_at = coalesce(published_at, now()), updated_at = now() WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.Notify.Revalidate(r.Context(), []string{tagGlossary}, []string{"/glossario", "/glossario/" + slug, "/sitemap.xml", "/llms.txt", "/llms-full.txt"}, false)
	s.Notify.IndexNow(r.Context(), []string{"/glossario/" + slug})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) adminDeleteGlossary(w http.ResponseWriter, r *http.Request) {
	if _, err := s.Pool.Exec(r.Context(), `DELETE FROM glossary_terms WHERE id::text = $1`, r.PathValue("id")); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.Notify.Revalidate(r.Context(), []string{tagGlossary}, []string{"/glossario", "/sitemap.xml"}, false)
	w.WriteHeader(http.StatusNoContent)
}
