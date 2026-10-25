// Package importer copies the Payload/Mongo content (exported with mongoexport --jsonArray)
// into Postgres. Every row keeps its Mongo _id in legacy_id, so re-running the import is safe:
// interaction rows (leads, comments, subscribers, contatos) are insert-only, so anything the
// admin changed in Postgres is never overwritten; posts and media are refreshed.
package importer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type doc = map[string]any

// Report counts what an import did (or would do, in a dry run).
type Report struct {
	Source   map[string]int
	Inserted map[string]int
	Skipped  map[string]int
	Notes    []string
	NodeHist map[string]int
}

func newReport() *Report {
	return &Report{Source: map[string]int{}, Inserted: map[string]int{}, Skipped: map[string]int{}, NodeHist: map[string]int{}}
}

func (r *Report) note(f string, a ...any) { r.Notes = append(r.Notes, fmt.Sprintf(f, a...)) }

func (r *Report) String() string {
	var b strings.Builder
	keys := make([]string, 0, len(r.Source))
	for k := range r.Source {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(&b, "%-12s source=%-4d inserted=%-4d already-present=%d\n", k, r.Source[k], r.Inserted[k], r.Skipped[k])
	}
	if len(r.NodeHist) > 0 {
		fmt.Fprintf(&b, "lexical nodes: %v\n", r.NodeHist)
	}
	for _, n := range r.Notes {
		fmt.Fprintln(&b, "note:", n)
	}
	return b.String()
}

func load(dir, name string) ([]doc, error) {
	raw, err := os.ReadFile(filepath.Join(dir, name+".json"))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []doc
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("%s.json: %w", name, err)
	}
	return out, nil
}

func oid(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case map[string]any:
		if s, ok := x["$oid"].(string); ok {
			return s
		}
	}
	return ""
}

func date(v any) *time.Time {
	var s string
	switch x := v.(type) {
	case string:
		s = x
	case map[string]any:
		s, _ = x["$date"].(string)
	}
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return nil
	}
	return &t
}

func str(d doc, k string) string { s, _ := d[k].(string); return s }

// Options tune an import run.
type Options struct {
	// Apply commits the import; without it everything is rolled back (dry run).
	Apply bool
	// RefreshContent also overwrites posts and media that already exist in Postgres with the
	// Mongo version. Leave it off once editing happens in the new admin, or edits would be lost.
	RefreshContent bool
}

// Run imports the export in dir.
func Run(ctx context.Context, pool *pgxpool.Pool, dir string, o Options) (*Report, error) {
	apply := o.Apply
	rep := newReport()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	mediaMap, err := importMedia(ctx, tx, dir, o.RefreshContent, rep)
	if err != nil {
		return rep, fmt.Errorf("media: %w", err)
	}
	postMap, err := importPosts(ctx, tx, dir, mediaMap, o.RefreshContent, rep)
	if err != nil {
		return rep, fmt.Errorf("posts: %w", err)
	}
	if err := importTreatments(ctx, tx, dir, mediaMap, o.RefreshContent, rep); err != nil {
		return rep, fmt.Errorf("treatments: %w", err)
	}
	if err := importComments(ctx, tx, dir, postMap, rep); err != nil {
		return rep, fmt.Errorf("comments: %w", err)
	}
	if err := importLeads(ctx, tx, dir, rep); err != nil {
		return rep, fmt.Errorf("leads: %w", err)
	}
	if err := importSubscribers(ctx, tx, dir, rep); err != nil {
		return rep, fmt.Errorf("subscribers: %w", err)
	}
	if err := importContatos(ctx, tx, dir, rep); err != nil {
		return rep, fmt.Errorf("contatos: %w", err)
	}
	if !apply {
		rep.note("dry run: nothing was written")
		return rep, nil
	}
	return rep, tx.Commit(ctx)
}

func importMedia(ctx context.Context, tx pgx.Tx, dir string, refresh bool, rep *Report) (map[string]string, error) {
	items, err := load(dir, "media")
	if err != nil {
		return nil, err
	}
	rep.Source["media"] = len(items)
	ids := map[string]string{}
	for _, m := range items {
		legacy, fn := oid(m["_id"]), str(m, "filename")
		if fn == "" {
			rep.note("media %s has no filename; skipped", legacy)
			continue
		}
		alt := strings.TrimSpace(str(m, "alt"))
		if alt == "" {
			alt = strings.TrimSuffix(fn, filepath.Ext(fn))
		}
		var id string
		var inserted bool
		err := tx.QueryRow(ctx, `
			INSERT INTO media (filename, mime_type, filesize, width, height, alt, legacy_id, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,coalesce($8, now()))
			ON CONFLICT (filename) DO UPDATE SET alt = CASE WHEN $9 THEN EXCLUDED.alt ELSE media.alt END,
			    legacy_id = coalesce(media.legacy_id, EXCLUDED.legacy_id)
			RETURNING id::text, (xmax = 0)`,
			fn, str(m, "mimeType"), num(m["filesize"]), nullInt(m["width"]), nullInt(m["height"]), alt, legacy, date(m["createdAt"]), refresh).Scan(&id, &inserted)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", fn, err)
		}
		ids[legacy] = id
		count(rep, "media", inserted)
	}
	return ids, nil
}

func importPosts(ctx context.Context, tx pgx.Tx, dir string, media map[string]string, refresh bool, rep *Report) (map[string]string, error) {
	items, err := load(dir, "posts")
	if err != nil {
		return nil, err
	}
	rep.Source["posts"] = len(items)
	ids := map[string]string{}
	for _, p := range items {
		legacy := oid(p["_id"])
		content := p["content"]
		if miss := richtext.RewriteUploadIDs(content, media); len(miss) > 0 {
			rep.note("post %q: uploads without media row: %v", str(p, "slug"), miss)
		}
		richtext.NormalizeLinks(content, func(rel, id string) string { return "" })
		richtext.NodeTypes(content, rep.NodeHist)

		// Posts created before the status field existed have none: they were public.
		status := str(p, "status")
		if status == "" {
			status = "published"
		}
		published := date(p["publishedDate"])
		if published == nil {
			published = date(p["createdAt"])
		}
		raw, _ := json.Marshal(content)
		var pubContent any
		var newsletterSent any
		if status == "published" {
			pubContent = string(raw)
			newsletterSent = time.Now() // never mail old posts when the newsletter moves to Go
		} else {
			published = nil
		}
		author := str(p, "author")
		if author == "" {
			author = "João Vitor Fernandes"
		}
		var image any
		if im := oid(p["image"]); im != "" {
			if id, ok := media[im]; ok {
				image = id
			} else {
				rep.note("post %q: cover image %s has no media row", str(p, "slug"), im)
			}
		}
		var id string
		var inserted bool
		err := tx.QueryRow(ctx, `
			INSERT INTO posts (slug, title, excerpt, keywords, content, published_content, status, published_at, author_name, image_id,
			                   meta_title, meta_description, newsletter_sent_at, legacy_id, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10::uuid,$11,$12,$13,$14,coalesce($15, now()),coalesce($16, now()))
			ON CONFLICT (legacy_id) DO UPDATE SET
			    title = CASE WHEN $17 THEN EXCLUDED.title ELSE posts.title END,
			    excerpt = CASE WHEN $17 THEN EXCLUDED.excerpt ELSE posts.excerpt END,
			    keywords = CASE WHEN $17 THEN EXCLUDED.keywords ELSE posts.keywords END,
			    content = CASE WHEN $17 THEN EXCLUDED.content ELSE posts.content END,
			    published_content = CASE WHEN $17 THEN EXCLUDED.published_content ELSE posts.published_content END,
			    status = CASE WHEN $17 THEN EXCLUDED.status ELSE posts.status END,
			    published_at = CASE WHEN $17 THEN EXCLUDED.published_at ELSE posts.published_at END,
			    author_name = CASE WHEN $17 THEN EXCLUDED.author_name ELSE posts.author_name END,
			    image_id = CASE WHEN $17 THEN EXCLUDED.image_id ELSE posts.image_id END
			RETURNING id::text, (xmax = 0)`,
			str(p, "slug"), str(p, "title"), str(p, "excerpt"), str(p, "keywords"), string(raw), pubContent, status, published, author, image,
			str(p, "metaTitle"), str(p, "metaDescription"), newsletterSent, legacy, date(p["createdAt"]), date(p["updatedAt"]), refresh).Scan(&id, &inserted)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", str(p, "slug"), err)
		}
		ids[legacy] = id
		count(rep, "posts", inserted)
	}
	return ids, nil
}

func importComments(ctx context.Context, tx pgx.Tx, dir string, posts map[string]string, rep *Report) error {
	items, err := load(dir, "comments")
	if err != nil {
		return err
	}
	users, _ := load(dir, "blog-users")
	names := map[string]string{}
	for _, u := range users {
		names[oid(u["_id"])] = strings.TrimSpace(str(u, "name"))
	}
	rep.Source["comments"] = len(items)
	for _, c := range items {
		pid, ok := posts[oid(c["post"])]
		if !ok {
			rep.note("comment %s: post not imported; skipped", oid(c["_id"]))
			continue
		}
		name := names[oid(c["author"])]
		if name == "" {
			name = "Anônimo"
		}
		status := str(c, "status")
		switch status {
		case "pending", "approved", "rejected":
		default:
			status = "pending"
		}
		tag, err := tx.Exec(ctx, `INSERT INTO comments (post_id, author_name, body, status, legacy_id, created_at)
			VALUES ($1::uuid,$2,$3,$4,$5,coalesce($6, now())) ON CONFLICT (legacy_id) DO NOTHING`,
			pid, name, str(c, "body"), status, oid(c["_id"]), date(c["createdAt"]))
		if err != nil {
			return err
		}
		count(rep, "comments", tag.RowsAffected() == 1)
	}
	return nil
}

func importLeads(ctx context.Context, tx pgx.Tx, dir string, rep *Report) error {
	items, err := load(dir, "leads")
	if err != nil {
		return err
	}
	rep.Source["leads"] = len(items)
	for _, l := range items {
		legacy := oid(l["_id"])
		gclid := str(l, "gclid")
		if gclid == "" {
			continue // phone-only rows are old contact requests; importContatos takes them
		}
		status := str(l, "status")
		if status != "qualified" && status != "converted" {
			status = "clicked"
		}
		clicked := date(l["clickedAt"])
		if clicked == nil {
			clicked = date(l["createdAt"])
		}
		tag, err := tx.Exec(ctx, `INSERT INTO leads (gclid, clicked_at, status, qualified_at, converted_at, legacy_id, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,coalesce($7, now())) ON CONFLICT DO NOTHING`,
			gclid, clicked, status, date(l["qualifiedAt"]), date(l["convertedAt"]), legacy, date(l["createdAt"]))
		if err != nil {
			return err
		}
		count(rep, "leads", tag.RowsAffected() == 1)
	}
	return nil
}

func importSubscribers(ctx context.Context, tx pgx.Tx, dir string, rep *Report) error {
	items, err := load(dir, "subscribers")
	if err != nil {
		return err
	}
	rep.Source["subscribers"] = len(items)
	for _, s := range items {
		email := strings.ToLower(strings.TrimSpace(str(s, "email")))
		if email == "" {
			continue
		}
		active, ok := s["active"].(bool)
		if !ok {
			active = true
		}
		consent := date(s["consentedAt"])
		if consent == nil {
			consent = date(s["createdAt"])
		}
		tag, err := tx.Exec(ctx, `INSERT INTO subscribers (email, consented_at, active, unsubscribed_at, source, legacy_id, created_at)
			VALUES ($1,$2,$3,CASE WHEN $3 THEN NULL ELSE now() END,'site',$4,coalesce($5, now())) ON CONFLICT DO NOTHING`,
			email, consent, active, oid(s["_id"]), date(s["createdAt"]))
		if err != nil {
			return err
		}
		count(rep, "subscribers", tag.RowsAffected() == 1)
	}
	return nil
}

func importContatos(ctx context.Context, tx pgx.Tx, dir string, rep *Report) error {
	items, err := load(dir, "contatos")
	if err != nil {
		return err
	}
	leads, _ := load(dir, "leads")
	for _, l := range leads {
		if str(l, "gclid") == "" && str(l, "phone") != "" {
			items = append(items, doc{"_id": l["_id"], "name": "(sem nome — importado de leads)", "phone": l["phone"], "consentGiven": false, "createdAt": l["createdAt"]})
		}
	}
	rep.Source["contatos"] = len(items)
	for _, c := range items {
		consentAt := date(c["consentTimestamp"])
		if consentAt == nil {
			consentAt = date(c["createdAt"])
		}
		status := str(c, "status")
		if status != "respondido" {
			status = "novo"
		}
		given, _ := c["consentGiven"].(bool)
		tag, err := tx.Exec(ctx, `INSERT INTO contatos (name, phone, consent_given, consent_at, status, legacy_id, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,coalesce($7, now())) ON CONFLICT DO NOTHING`,
			str(c, "name"), str(c, "phone"), given, consentAt, status, oid(c["_id"]), date(c["createdAt"]))
		if err != nil {
			return err
		}
		count(rep, "contatos", tag.RowsAffected() == 1)
	}
	return nil
}

func count(r *Report, k string, inserted bool) {
	if inserted {
		r.Inserted[k]++
	} else {
		r.Skipped[k]++
	}
}

func num(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case map[string]any:
		if s, ok := x["$numberInt"].(string); ok {
			var n int64
			fmt.Sscan(s, &n)
			return n
		}
		if s, ok := x["$numberLong"].(string); ok {
			var n int64
			fmt.Sscan(s, &n)
			return n
		}
	}
	return 0
}

func nullInt(v any) any {
	if n := num(v); n > 0 {
		return n
	}
	return nil
}

// Verify checks that every source row is present in Postgres and returns problems found.
func Verify(ctx context.Context, pool *pgxpool.Pool, dir string) ([]string, error) {
	var problems []string
	check := func(name, query string, want []string) error {
		rows, err := pool.Query(ctx, query)
		if err != nil {
			return err
		}
		defer rows.Close()
		have := map[string]bool{}
		for rows.Next() {
			var s string
			if err := rows.Scan(&s); err != nil {
				return err
			}
			have[s] = true
		}
		for _, w := range want {
			if !have[w] {
				problems = append(problems, fmt.Sprintf("%s: %q missing in postgres", name, w))
			}
		}
		return rows.Err()
	}
	collect := func(coll string, key func(doc) string) []string {
		items, _ := load(dir, coll)
		var out []string
		for _, d := range items {
			if k := key(d); k != "" {
				out = append(out, k)
			}
		}
		return out
	}
	if err := check("posts", `SELECT slug::text FROM posts`, collect("posts", func(d doc) string { return str(d, "slug") })); err != nil {
		return nil, err
	}
	if err := check("services", `SELECT slug::text FROM pages WHERE kind IN ('service','education')`, collect("treatments", func(d doc) string { return str(d, "slug") })); err != nil {
		return nil, err
	}
	if err := check("media", `SELECT filename FROM media`, collect("media", func(d doc) string { return str(d, "filename") })); err != nil {
		return nil, err
	}
	if err := check("leads", `SELECT gclid FROM leads`, collect("leads", func(d doc) string { return str(d, "gclid") })); err != nil {
		return nil, err
	}
	if err := check("subscribers", `SELECT email::text FROM subscribers`, collect("subscribers", func(d doc) string { return strings.ToLower(strings.TrimSpace(str(d, "email"))) })); err != nil {
		return nil, err
	}
	if err := check("comments", `SELECT legacy_id FROM comments`, collect("comments", func(d doc) string { return oid(d["_id"]) })); err != nil {
		return nil, err
	}
	// Published posts must have public content and no unresolved upload ids.
	var bad int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE status='published' AND (published_content IS NULL OR published_content::text ~ '"value": ?"[0-9a-f]{24}"')`).Scan(&bad); err != nil {
		return nil, err
	}
	if bad > 0 {
		problems = append(problems, fmt.Sprintf("posts: %d published post(s) with missing content or legacy upload ids", bad))
	}
	return problems, nil
}
