package api

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPublicReads(t *testing.T) {
	e := newTestEnv(t)

	// Nothing published: page 404, settings empty.
	if rec := e.do("GET", "/api/v1/public/pages/_home", "", ""); rec.Code != 404 {
		t.Fatalf("unpublished home: %d", rec.Code)
	}

	e.exec(`UPDATE site_settings SET published = '{"person":{"name":"João"}}', published_version = 1 WHERE id = 1`)
	e.exec(`INSERT INTO media (id, filename, mime_type, filesize, width, height, alt) VALUES ('11111111-1111-1111-1111-111111111111','a.png','image/png',10,640,480,'foto')`)
	e.exec(`INSERT INTO pages (slug, kind, title, status, published_blocks, published_version, published_at) VALUES ('', 'home', 'Home', 'published', '[{"id":"b1","type":"hero"}]', 1, now())`)
	e.exec(`INSERT INTO pages (id, slug, kind, title, subtitle, status, published_version, published_at) VALUES ('22222222-2222-2222-2222-222222222222','psicoterapia','service','Psicoterapia','sub','published',1,now())`)
	e.exec(`INSERT INTO pages (slug, kind, title, status) VALUES ('rascunho','custom','Rascunho','draft')`)
	e.exec(`INSERT INTO services (page_id, name, layout, theme, analytics_key, published_body) VALUES ('22222222-2222-2222-2222-222222222222','Psicoterapia','calming','teal','service_page_psicoterapia',
		'{"root":{"type":"root","children":[{"type":"upload","value":"11111111-1111-1111-1111-111111111111"}]}}')`)
	e.exec(`INSERT INTO posts (id, slug, title, excerpt, status, published_at, published_content, image_id) VALUES
		('33333333-3333-3333-3333-333333333333','post-um','Post um','resumo','published', now() - interval '1 day', '{"root":{"children":[]}}', '11111111-1111-1111-1111-111111111111'),
		('44444444-4444-4444-4444-444444444444','rascunho','Rascunho','x','draft', NULL, NULL, NULL),
		('55555555-5555-5555-5555-555555555555','futuro','Futuro','x','published', now() + interval '1 day', '{}', NULL)`)
	e.exec(`INSERT INTO comments (post_id, author_name, body, status) VALUES
		('33333333-3333-3333-3333-333333333333','Ana','aprovado','approved'),
		('33333333-3333-3333-3333-333333333333','Bot','pendente','pending')`)

	rec := e.do("GET", "/api/v1/public/settings", "", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"name":"João"`) {
		t.Fatalf("settings: %d %s", rec.Code, rec.Body.String())
	}

	rec = e.do("GET", "/api/v1/public/pages/_home", "", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"type":"hero"`) {
		t.Fatalf("home: %d %s", rec.Code, rec.Body.String())
	}

	rec = e.do("GET", "/api/v1/public/pages/psicoterapia", "", "")
	var page struct {
		Service struct {
			Layout string `json:"layout"`
			Body   struct {
				Root struct {
					Children []struct {
						Value struct {
							URL   string `json:"url"`
							Alt   string `json:"alt"`
							Width int    `json:"width"`
						} `json:"value"`
					} `json:"children"`
				} `json:"root"`
			} `json:"body"`
		} `json:"service"`
	}
	if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &page) != nil {
		t.Fatalf("service page: %d %s", rec.Code, rec.Body.String())
	}
	up := page.Service.Body.Root.Children[0].Value
	if page.Service.Layout != "calming" || up.URL != "/media/a.png" || up.Alt != "foto" || up.Width != 640 {
		t.Fatalf("upload not populated: %+v", page)
	}

	if rec = e.do("GET", "/api/v1/public/pages/rascunho", "", ""); rec.Code != 404 {
		t.Fatalf("draft page leaked: %d", rec.Code)
	}

	// posts: only published and not scheduled in the future
	rec = e.do("GET", "/api/v1/public/posts", "", "")
	if strings.Contains(rec.Body.String(), "rascunho") || strings.Contains(rec.Body.String(), "futuro") || !strings.Contains(rec.Body.String(), "post-um") {
		t.Fatalf("posts list: %s", rec.Body.String())
	}
	for _, slug := range []string{"rascunho", "futuro"} {
		if rec = e.do("GET", "/api/v1/public/posts/"+slug, "", ""); rec.Code != 404 {
			t.Fatalf("%s should be hidden: %d", slug, rec.Code)
		}
	}
	rec = e.do("GET", "/api/v1/public/posts/post-um", "", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"url":"/media/a.png"`) {
		t.Fatalf("post: %d %s", rec.Code, rec.Body.String())
	}

	rec = e.do("GET", "/api/v1/public/posts/33333333-3333-3333-3333-333333333333/comments", "", "")
	if !strings.Contains(rec.Body.String(), "aprovado") || strings.Contains(rec.Body.String(), "pendente") {
		t.Fatalf("comments: %s", rec.Body.String())
	}

	rec = e.do("GET", "/api/v1/public/routes", "", "")
	body := rec.Body.String()
	if !strings.Contains(body, `"path":"/psicoterapia"`) || !strings.Contains(body, `"path":"/blog/post-um"`) || strings.Contains(body, "rascunho") {
		t.Fatalf("routes: %s", body)
	}
	if rec = e.do("GET", "/api/v1/public/services", "", ""); !strings.Contains(rec.Body.String(), "service_page_psicoterapia") {
		t.Fatalf("services: %s", rec.Body.String())
	}
}

func TestLeadsContract(t *testing.T) {
	e := newTestEnv(t)
	post := func(body string) int { return e.do("POST", "/api/leads", body, "", "Content-Type", "text/plain").Code }
	if c := post(`{"gclid":"Cj0KCQ+abc/def=_-x"}`); c != 201 {
		t.Fatalf("new lead: %d", c)
	}
	if c := post(`{"gclid":"Cj0KCQ+abc/def=_-x"}`); c != 200 {
		t.Fatalf("duplicate lead: %d", c)
	}
	for _, bad := range []string{`{}`, `{"gclid":""}`, `{"gclid":"has space"}`, `not json`, `{"gclid":123}`} {
		if c := post(bad); c != 400 {
			t.Fatalf("%q => %d, want 400", bad, c)
		}
	}
	var n int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM leads`).Scan(&n)
	if n != 1 {
		t.Fatalf("leads stored: %d", n)
	}
}

func TestSubscribeAndUnsubscribe(t *testing.T) {
	e := newTestEnv(t)
	if c := e.do("POST", "/api/subscribe", `{"email":"Ana@Example.com"}`, "").Code; c != 201 {
		t.Fatalf("subscribe: %d", c)
	}
	if c := e.do("POST", "/api/subscribe", `{"email":"ana@example.com"}`, "").Code; c != 409 {
		t.Fatalf("duplicate: %d", c)
	}
	if c := e.do("POST", "/api/subscribe", `{"email":"nope"}`, "").Code; c != 400 {
		t.Fatalf("invalid: %d", c)
	}

	tok := e.srv.UnsubscribeToken("ana@example.com")
	// GET must not change state
	if rec := e.do("GET", "/api/unsubscribe?t="+tok, "", ""); rec.Code != 200 || !strings.Contains(rec.Body.String(), "Confirmar") {
		t.Fatalf("confirm page: %d %s", rec.Code, rec.Body.String())
	}
	var active bool
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT active FROM subscribers WHERE email='ana@example.com'`).Scan(&active)
	if !active {
		t.Fatal("GET unsubscribed the user")
	}
	// forged token is rejected
	if c := e.do("POST", "/api/unsubscribe", "t="+e.srv.UnsubscribeToken("other@x.com")+"x", "", "Content-Type", "application/x-www-form-urlencoded").Code; c != 400 {
		t.Fatalf("forged token: %d", c)
	}
	// one-click POST
	if c := e.do("POST", "/api/unsubscribe?t="+tok, "List-Unsubscribe=One-Click", "", "Content-Type", "application/x-www-form-urlencoded").Code; c != 200 {
		t.Fatalf("one-click: %d", c)
	}
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT active FROM subscribers WHERE email='ana@example.com'`).Scan(&active)
	if active {
		t.Fatal("still active after unsubscribe")
	}
	// can resubscribe
	if c := e.do("POST", "/api/subscribe", `{"email":"ana@example.com"}`, "").Code; c != 201 {
		t.Fatalf("resubscribe: %d", c)
	}
}

func TestAnonymousComments(t *testing.T) {
	e := newTestEnv(t)
	e.exec(`INSERT INTO posts (id, slug, title, status, published_at, published_content) VALUES ('33333333-3333-3333-3333-333333333333','p','P','published',now(),'{}')`)
	good := `{"postId":"33333333-3333-3333-3333-333333333333","name":"Ana","body":"Ótimo texto","turnstileToken":"t"}`
	if c := e.do("POST", "/api/v1/public/comments", good, "").Code; c != 202 {
		t.Fatalf("comment: %d", c)
	}
	var status string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT status FROM comments`).Scan(&status)
	if status != "pending" {
		t.Fatalf("comment must be pending, got %q", status)
	}
	// honeypot: success response but nothing stored
	e.do("POST", "/api/v1/public/comments", `{"postId":"33333333-3333-3333-3333-333333333333","name":"Bot","body":"x","website":"spam.com"}`, "")
	// too many links
	if c := e.do("POST", "/api/v1/public/comments", `{"postId":"33333333-3333-3333-3333-333333333333","name":"Ana","body":"http://a.com http://b.com","turnstileToken":"t"}`, "").Code; c != 400 {
		t.Fatalf("links: %d", c)
	}
	// unknown post
	if c := e.do("POST", "/api/v1/public/comments", `{"postId":"99999999-9999-9999-9999-999999999999","name":"Ana","body":"oi","turnstileToken":"t"}`, "").Code; c != 404 {
		t.Fatalf("unknown post: %d", c)
	}
	// turnstile failure
	e.srv.Turnstile = fakeTurnstile{ok: false}
	if c := e.do("POST", "/api/v1/public/comments", good, "").Code; c != 403 {
		t.Fatalf("turnstile failure: %d", c)
	}
	var n int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM comments`).Scan(&n)
	if n != 1 {
		t.Fatalf("comments stored: %d", n)
	}
}
