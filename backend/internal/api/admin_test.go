package api

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
)

const lexHello = `{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"A Análise do Comportamento estuda como o ambiente molda o que fazemos."}]}]}}`

func TestAdminAuthGating(t *testing.T) {
	e := newTestEnv(t)
	for _, path := range []string{"/api/v1/admin/dashboard", "/api/v1/admin/pages", "/api/v1/admin/posts", "/api/v1/admin/leads/export"} {
		if c := e.do("GET", path, "", "").Code; c != 401 {
			t.Errorf("%s without token: %d", path, c)
		}
		if c := e.do("GET", path, "", "garbage").Code; c != 401 {
			t.Errorf("%s with bad token: %d", path, c)
		}
		// service tokens are not admins
		if c := e.do("GET", path, "", e.token(authn.RoleService)).Code; c != 401 {
			t.Errorf("%s with service token: %d", path, c)
		}
		if c := e.do("GET", path, "", e.token(authn.RoleAdminTech)).Code; c == 401 {
			t.Errorf("%s rejected a valid admin: %d", path, c)
		}
	}
	// internal jobs: only service tokens
	if c := e.do("POST", "/api/v1/internal/jobs/retention.cleanup", "", e.token(authn.RoleAdminClinical), "Idempotency-Key", "k").Code; c != 401 {
		t.Errorf("admin token on internal jobs: %d", c)
	}
}

func TestRoleMatrixPatientData(t *testing.T) {
	e := newTestEnv(t)
	e.exec(`INSERT INTO contatos (name, phone, consent_given, consent_at) VALUES ('Paciente','11999999999',true,now())`)
	e.exec(`INSERT INTO faq_questions (question) VALUES ('Estou passando por um momento difícil, o que fazer?')`)
	tech, clin := e.token(authn.RoleAdminTech), e.token(authn.RoleAdminClinical)
	for _, p := range []string{"/api/v1/admin/contatos", "/api/v1/admin/faq-questions"} {
		if c := e.do("GET", p, "", tech).Code; c != 403 {
			t.Errorf("tech role read %s: %d (want 403)", p, c)
		}
		if rec := e.do("GET", p, "", clin); rec.Code != 200 {
			t.Errorf("clinical role read %s: %d", p, rec.Code)
		}
	}
	// dashboard hides patient-related counters from tech
	var d map[string]int
	_ = json.Unmarshal(e.do("GET", "/api/v1/admin/dashboard", "", tech).Body.Bytes(), &d)
	if d["newContatos"] != 0 || d["newQuestions"] != 0 {
		t.Errorf("tech dashboard leaks patient counts: %v", d)
	}
}

func TestCookieAuthNeedsSameOrigin(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	post := func(origin string) int {
		req := httptest.NewRequest("POST", "/api/v1/admin/posts", strings.NewReader(`{"title":"Olá mundo"}`))
		req.AddCookie(&http.Cookie{Name: "clinic_at", Value: tok})
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		rec := httptest.NewRecorder()
		e.h.ServeHTTP(rec, req)
		return rec.Code
	}
	if c := post("https://evil.test"); c != 401 {
		t.Errorf("cross-origin cookie request: %d", c)
	}
	if c := post(""); c != 401 {
		t.Errorf("origin-less cookie request: %d", c)
	}
	if c := post("https://site.test"); c != 201 {
		t.Errorf("same-origin cookie request: %d", c)
	}
}

func TestSettingsConcurrency(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	if c := e.do("PUT", "/api/v1/admin/settings/draft", `{"a":1}`, tok).Code; c != 428 {
		t.Fatalf("missing If-Match: %d", c)
	}
	if c := e.do("PUT", "/api/v1/admin/settings/draft", `{"person":{"name":"João"}}`, tok, "If-Match", `"1"`).Code; c != 200 {
		t.Fatalf("first save: %d", c)
	}
	if c := e.do("PUT", "/api/v1/admin/settings/draft", `{"person":{"name":"Outro"}}`, tok, "If-Match", `"1"`).Code; c != 412 {
		t.Fatalf("stale save: %d", c)
	}
	// not public until published
	if rec := e.do("GET", "/api/v1/public/settings", "", ""); strings.Contains(rec.Body.String(), "João") {
		t.Fatal("draft settings leaked")
	}
	if c := e.do("POST", "/api/v1/admin/settings/publish", "", tok).Code; c != 200 {
		t.Fatalf("publish: %d", c)
	}
	if rec := e.do("GET", "/api/v1/public/settings", "", ""); !strings.Contains(rec.Body.String(), "João") {
		t.Fatalf("published settings missing: %s", rec.Body.String())
	}
	if !e.notes.hasTag("settings") {
		t.Error("settings publish did not revalidate")
	}
}

func (n *recordingNotifier) hasTag(t string) bool {
	for _, x := range n.tags {
		if x == t {
			return true
		}
	}
	return false
}

func TestHomePageKeepsLockedSections(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.exec(`INSERT INTO pages (id, slug, kind, title) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','','home','Home')`)
	// removing the #faq section is refused
	bad := `{"blocks":[{"id":"1","type":"services_grid","anchor":"services","data":{}},{"id":"2","type":"text_with_image","anchor":"about","data":{}},{"id":"4","type":"contact","anchor":"contact","data":{}}]}`
	if c := e.do("PUT", "/api/v1/admin/pages/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/draft", bad, tok, "If-Match", "1").Code; c != 400 {
		t.Fatalf("missing locked anchor accepted: %d", c)
	}
	good := `{"title":"Início","blocks":[{"id":"1","type":"services_grid","anchor":"services","data":{}},{"id":"2","type":"text_with_image","anchor":"about","data":{}},{"id":"3","type":"faq","anchor":"faq","data":{}},{"id":"4","type":"contact","anchor":"contact","data":{}}]}`
	if c := e.do("PUT", "/api/v1/admin/pages/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/draft", good, tok, "If-Match", "1").Code; c != 200 {
		t.Fatalf("valid draft: %d", c)
	}
	if c := e.do("GET", "/api/v1/public/pages/_home", "", "").Code; c != 404 {
		t.Fatalf("draft visible publicly: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/pages/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/publish", "", tok).Code; c != 200 {
		t.Fatalf("publish: %d", c)
	}
	rec := e.do("GET", "/api/v1/public/pages/_home", "", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"anchor":"faq"`) || !strings.Contains(rec.Body.String(), "Início") {
		t.Fatalf("published home: %d %s", rec.Code, rec.Body.String())
	}
	// the home page can't be deleted
	if c := e.do("DELETE", "/api/v1/admin/pages/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "", tok).Code; c != 404 {
		t.Fatalf("home deletion: %d", c)
	}
}

func TestNewServiceFlow(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)

	if c := e.do("POST", "/api/v1/admin/services", `{"slug":"blog","name":"X"}`, tok).Code; c != 400 {
		t.Errorf("reserved slug accepted: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/services", `{"slug":"Bad Slug","name":"X"}`, tok).Code; c != 400 {
		t.Errorf("invalid slug accepted: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/services", `{"slug":"tcc","name":"TCC","layout":"nope"}`, tok).Code; c != 400 {
		t.Errorf("invalid layout accepted: %d", c)
	}
	rec := e.do("POST", "/api/v1/admin/services", `{"slug":"terapia-online","name":"Terapia online","cardTitle":"Terapia de onde você estiver","layout":"calming","theme":"teal","icon":"sun"}`, tok)
	if rec.Code != 201 {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var ids struct{ ID, PageID string }
	_ = json.Unmarshal(rec.Body.Bytes(), &ids)
	if c := e.do("POST", "/api/v1/admin/services", `{"slug":"terapia-online","name":"Dup"}`, tok).Code; c != 409 {
		t.Errorf("duplicate slug: %d", c)
	}
	// not public before publishing
	if c := e.do("GET", "/api/v1/public/pages/terapia-online", "", "").Code; c != 404 {
		t.Fatalf("unpublished service visible: %d", c)
	}
	if body := e.do("GET", "/api/v1/public/services", "", "").Body.String(); strings.Contains(body, "terapia-online") {
		t.Fatalf("unpublished service in list: %s", body)
	}
	if c := e.do("PUT", "/api/v1/admin/services/"+ids.ID+"/body", lexHello, tok).Code; c != 204 {
		t.Fatalf("body: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/pages/"+ids.PageID+"/publish", "", tok).Code; c != 200 {
		t.Fatalf("publish: %d", c)
	}
	page := e.do("GET", "/api/v1/public/pages/terapia-online", "", "").Body.String()
	if !strings.Contains(page, "Análise do Comportamento") || !strings.Contains(page, `"analyticsKey":"service_page_terapia-online"`) {
		t.Fatalf("published service page: %s", page)
	}
	if !strings.Contains(e.do("GET", "/api/v1/public/services", "", "").Body.String(), "terapia-online") {
		t.Fatal("published service missing from list")
	}
	if !strings.Contains(e.do("GET", "/api/v1/public/routes", "", "").Body.String(), `"/terapia-online"`) {
		t.Fatal("published service missing from routes (sitemap)")
	}
	if len(e.notes.index) == 0 || e.notes.index[0] != "/terapia-online" {
		t.Errorf("IndexNow not pinged: %v", e.notes.index)
	}
	// analytics key can't change, even directly in SQL
	if _, err := e.srv.Pool.Exec(t.Context(), `UPDATE services SET analytics_key = 'x' WHERE id::text = $1`, ids.ID); err == nil {
		t.Error("analytics_key was mutable")
	}
	// renaming keeps old links alive through a redirect
	if c := e.do("PATCH", "/api/v1/admin/pages/"+ids.PageID+"/slug", `{"slug":"terapia-a-distancia"}`, tok).Code; c != 204 {
		t.Fatalf("rename: %d", c)
	}
	rec = e.do("GET", "/api/v1/public/redirects/resolve?path=/terapia-online", "", "")
	if !strings.Contains(rec.Body.String(), "/terapia-a-distancia") {
		t.Fatalf("redirect missing: %s", rec.Body.String())
	}
}

func TestPostPublishGatesAndNewsletterOnce(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	rec := e.do("POST", "/api/v1/admin/posts", `{"title":"Ansiedade e rotina"}`, tok)
	var created struct{ ID, Slug string }
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if rec.Code != 201 || created.Slug != "ansiedade-e-rotina" {
		t.Fatalf("create post: %d %s", rec.Code, rec.Body.String())
	}
	// cannot publish an empty post
	if c := e.do("POST", "/api/v1/admin/posts/"+created.ID+"/publish", "", tok).Code; c != 422 {
		t.Fatalf("empty publish: %d", c)
	}
	patch := `{"excerpt":"Como a rotina influencia a ansiedade.","content":` + lexHello + `}`
	if c := e.do("PATCH", "/api/v1/admin/posts/"+created.ID, patch, tok, "If-Match", "1").Code; c != 200 {
		t.Fatalf("patch: %d", c)
	}
	if c := e.do("PATCH", "/api/v1/admin/posts/"+created.ID, `{"title":"x"}`, tok, "If-Match", "1").Code; c != 412 {
		t.Fatalf("stale patch: %d", c)
	}
	// CFP lint blocks promised results until acknowledged
	bad := `{"excerpt":"Cura garantida em 30 dias.","content":` + lexHello + `}`
	e.do("PATCH", "/api/v1/admin/posts/"+created.ID, bad, tok, "If-Match", "2")
	pub := e.do("POST", "/api/v1/admin/posts/"+created.ID+"/publish", "", tok)
	if pub.Code != 422 || !strings.Contains(pub.Body.String(), "promised_result") {
		t.Fatalf("lint gate: %d %s", pub.Code, pub.Body.String())
	}
	e.do("PATCH", "/api/v1/admin/posts/"+created.ID, `{"excerpt":"Como a rotina influencia a ansiedade."}`, tok, "If-Match", "3")
	if c := e.do("POST", "/api/v1/admin/posts/"+created.ID+"/publish", "", tok).Code; c != 200 {
		t.Fatalf("publish: %d", c)
	}
	if !strings.Contains(e.do("GET", "/api/v1/public/posts/ansiedade-e-rotina", "", "").Body.String(), "Análise do Comportamento") {
		t.Fatal("published post not visible")
	}
	// editing after publish stays a draft until published again
	e.do("PATCH", "/api/v1/admin/posts/"+created.ID, `{"title":"Título novo"}`, tok, "If-Match", "5")
	pubBody := e.do("GET", "/api/v1/public/posts/ansiedade-e-rotina", "", "").Body.String()
	_ = pubBody
	// publish twice → exactly one newsletter campaign
	e.do("POST", "/api/v1/admin/posts/"+created.ID+"/publish", "", tok)
	var n int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM newsletter_campaigns`).Scan(&n)
	if n != 1 {
		t.Fatalf("campaigns: %d", n)
	}
	// imported posts (newsletter_sent_at set) never queue a campaign
	e.exec(`INSERT INTO posts (id, slug, title, excerpt, status, content, published_content, published_at, newsletter_sent_at) VALUES ('77777777-7777-7777-7777-777777777777','antigo','Antigo','x','draft',$1,$1,now(),now())`, []byte(lexHello))
	e.do("POST", "/api/v1/admin/posts/77777777-7777-7777-7777-777777777777/publish", "", tok)
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM newsletter_campaigns`).Scan(&n)
	if n != 1 {
		t.Fatalf("imported post queued a newsletter: %d", n)
	}
}

func TestBotPostsNeedClinicianReview(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminTech)
	e.exec(`INSERT INTO posts (id, slug, title, excerpt, content, origin) VALUES ('88888888-8888-8888-8888-888888888888','bot','Resumo de estudo','Resumo.',$1,'research_bot')`, []byte(lexHello))
	if c := e.do("POST", "/api/v1/admin/posts/88888888-8888-8888-8888-888888888888/publish", "", tok).Code; c != 422 {
		t.Fatalf("bot draft published without reviewer: %d", c)
	}
	e.exec(`INSERT INTO profiles (id, slug, display_name, is_clinician, crp) VALUES ('99999999-9999-9999-9999-999999999999','joao','João',true,'06/157908')`)
	patch := `{"reviewedByProfileId":"99999999-9999-9999-9999-999999999999"}`
	if c := e.do("PATCH", "/api/v1/admin/posts/88888888-8888-8888-8888-888888888888", patch, tok, "If-Match", "1").Code; c != 200 {
		t.Fatalf("set reviewer: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/posts/88888888-8888-8888-8888-888888888888/publish", "", tok).Code; c != 200 {
		t.Fatalf("publish with reviewer: %d", c)
	}
	if strings.Contains(e.do("GET", "/api/v1/public/posts/bot", "", "").Body.String(), `"reviewedBy"`) {
		t.Fatal("a hidden profile must not be exposed as reviewer")
	}
	e.exec(`UPDATE profiles SET visibility = 'public'`)
	if !strings.Contains(e.do("GET", "/api/v1/public/posts/bot", "", "").Body.String(), `"slug":"joao"`) {
		t.Fatal("public reviewer missing")
	}
}

func TestLeadsExportMatchesLegacyFormat(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.exec(`INSERT INTO leads (gclid, clicked_at, status, converted_at, created_at) VALUES
		('AAA', '2026-10-01 10:00:00+00', 'converted', '2026-10-05 13:04:05+00', now() - interval '2 days'),
		('BBB', '2026-10-02 11:00:00+00', 'qualified', NULL, now() - interval '1 day'),
		('CCC', '2026-10-03 12:30:00+00', 'clicked', NULL, now())`)
	get := func(q string) *httptest.ResponseRecorder { return e.do("GET", "/api/v1/admin/leads/export"+q, "", tok) }

	rec := get("")
	want := "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency\nAAA,Consulta Marcada,2026-10-05 13:04:05+0000,350,BRL\n"
	if rec.Code != 200 || rec.Body.String() != want {
		t.Fatalf("consulta export:\n%q\nwant\n%q", rec.Body.String(), want)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "text/csv; charset=utf-8" {
		t.Errorf("content-type %q", ct)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.HasPrefix(cd, `attachment; filename="conversoes-consulta-`) {
		t.Errorf("content-disposition %q", cd)
	}
	rec = get("?action=contato")
	if !strings.Contains(rec.Body.String(), "BBB,Contato WhatsApp,2026-10-02 11:00:00+0000,0,BRL") || strings.Contains(rec.Body.String(), "AAA") {
		t.Fatalf("contato export: %q", rec.Body.String())
	}
	// status=all with newest-first ordering and blank time for missing converted_at
	rec = get("?status=all")
	if lines := strings.Split(strings.TrimSpace(rec.Body.String()), "\n"); len(lines) != 4 || !strings.HasPrefix(lines[1], "CCC,Consulta Marcada,,350") {
		t.Fatalf("status=all: %q", rec.Body.String())
	}
	// date filters: until covers the whole day
	if rec = get("?until=2026-10-05"); !strings.Contains(rec.Body.String(), "AAA") {
		t.Fatalf("until same day should include: %q", rec.Body.String())
	}
	if rec = get("?from=2026-10-06"); rec.Code != 400 || !strings.Contains(rec.Body.String(), "Nenhuma") {
		t.Fatalf("empty result: %d %s", rec.Code, rec.Body.String())
	}
}

func TestLeadStatusSemantics(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.exec(`INSERT INTO leads (id, gclid, clicked_at) VALUES ('66666666-6666-6666-6666-666666666666','LLL',now())`)
	if c := e.do("PATCH", "/api/v1/admin/leads/66666666-6666-6666-6666-666666666666/status", `{"status":"bogus"}`, tok).Code; c != 400 {
		t.Fatalf("bad status: %d", c)
	}
	if c := e.do("PATCH", "/api/v1/admin/leads/66666666-6666-6666-6666-666666666666/status", `{"status":"converted","convertedAt":"2026-10-10T15:00:00Z"}`, tok).Code; c != 200 {
		t.Fatalf("convert: %d", c)
	}
	var at string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT to_char(converted_at at time zone 'UTC','YYYY-MM-DD HH24:MI') FROM leads WHERE gclid='LLL'`).Scan(&at)
	if at != "2026-10-10 15:00" {
		t.Fatalf("converted_at = %q", at)
	}
}

func TestCommentModerationFlow(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminTech)
	e.exec(`INSERT INTO posts (id, slug, title, status, published_at, published_content) VALUES ('33333333-3333-3333-3333-333333333333','p','P','published',now(),'{}')`)
	e.exec(`INSERT INTO comments (id, post_id, author_name, body) VALUES ('c0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Ana','oi')`)
	if strings.Contains(e.do("GET", "/api/v1/public/posts/33333333-3333-3333-3333-333333333333/comments", "", "").Body.String(), "oi") {
		t.Fatal("pending comment visible")
	}
	if c := e.do("PATCH", "/api/v1/admin/comments/c0000000-0000-0000-0000-000000000001", `{"status":"approved"}`, tok).Code; c != 204 {
		t.Fatalf("approve: %d", c)
	}
	if !strings.Contains(e.do("GET", "/api/v1/public/posts/33333333-3333-3333-3333-333333333333/comments", "", "").Body.String(), `"authorName":"Ana"`) {
		t.Fatal("approved comment missing")
	}
	if !e.notes.hasTag("comments") {
		t.Error("moderation did not revalidate comments")
	}
	if c := e.do("PATCH", "/api/v1/admin/comments/c0000000-0000-0000-0000-000000000001", `{"status":"weird"}`, tok).Code; c != 400 {
		t.Errorf("invalid status: %d", c)
	}
}

func TestMediaUpload(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	upload := func(name string, data []byte, alt string) *httptest.ResponseRecorder {
		var buf bytes.Buffer
		mw := multipart.NewWriter(&buf)
		fw, _ := mw.CreateFormFile("file", name)
		fw.Write(data)
		if alt != "" {
			mw.WriteField("alt", alt)
		}
		mw.Close()
		req := httptest.NewRequest("POST", "/api/v1/admin/media", &buf)
		req.Header.Set("Content-Type", mw.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		e.h.ServeHTTP(rec, req)
		return rec
	}
	img := image.NewRGBA(image.Rect(0, 0, 8, 6))
	img.Set(1, 1, color.RGBA{255, 0, 0, 255})
	var pngBuf bytes.Buffer
	_ = png.Encode(&pngBuf, img)

	if c := upload("a.png", pngBuf.Bytes(), "").Code; c != 400 {
		t.Errorf("missing alt accepted: %d", c)
	}
	if c := upload("x.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), "icone").Code; c != 400 {
		t.Errorf("svg accepted: %d", c)
	}
	if c := upload("x.png", []byte("not an image at all"), "texto").Code; c != 400 {
		t.Errorf("garbage accepted: %d", c)
	}
	rec := upload("foto.png", pngBuf.Bytes(), "Foto de teste")
	if rec.Code != 201 {
		t.Fatalf("upload: %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		ID, Filename, URL string
		Width, Height     int
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Width != 8 || out.Height != 6 || !strings.HasPrefix(out.URL, "/media/") || !strings.HasSuffix(out.Filename, ".png") {
		t.Fatalf("upload result: %+v", out)
	}
	if _, err := os.Stat(filepath.Join(e.srv.Cfg.MediaDir, out.Filename)); err != nil {
		t.Fatalf("file not stored: %v", err)
	}
	// same bytes → same file, no duplicates
	rec2 := upload("outra.png", pngBuf.Bytes(), "Outra descrição")
	var out2 struct{ Filename string }
	_ = json.Unmarshal(rec2.Body.Bytes(), &out2)
	if out2.Filename != out.Filename {
		t.Errorf("duplicate bytes stored twice: %s vs %s", out.Filename, out2.Filename)
	}
	// in-use media can't be deleted
	e.exec(`INSERT INTO posts (slug, title, image_id) VALUES ('usa-imagem','Usa', $1::uuid)`, out.ID)
	if c := e.do("DELETE", "/api/v1/admin/media/"+out.ID, "", tok).Code; c != 409 {
		t.Errorf("deleted media in use: %d", c)
	}
	e.exec(`DELETE FROM posts WHERE slug = 'usa-imagem'`)
	if c := e.do("DELETE", "/api/v1/admin/media/"+out.ID, "", tok).Code; c != 204 {
		t.Errorf("delete unused media: %d", c)
	}
	if _, err := os.Stat(filepath.Join(e.srv.Cfg.MediaDir, out.Filename)); err == nil {
		t.Error("file left behind after delete")
	}
}

func TestStripJPEGMetadata(t *testing.T) {
	// SOI, APP0(JFIF), APP1(EXIF with fake GPS), SOS...
	jfif := []byte{0xFF, 0xE0, 0x00, 0x06, 'J', 'F', 'I', 'F'}
	exif := append([]byte{0xFF, 0xE1, 0x00, 0x0C}, []byte("Exif\x00\x00GPS!")...)
	in := append(append(append([]byte{0xFF, 0xD8}, jfif...), exif...), []byte{0xFF, 0xDA, 0x00, 0x02, 0x01, 0x02, 0xFF, 0xD9}...)
	out := stripJPEGMetadata(in)
	if bytes.Contains(out, []byte("GPS!")) || !bytes.Contains(out, []byte("JFIF")) || !bytes.HasSuffix(out, []byte{0xFF, 0xD9}) {
		t.Fatalf("exif not stripped properly: %x", out)
	}
}

func TestJobsIdempotent(t *testing.T) {
	e := newTestEnv(t)
	svc := e.token(authn.RoleService)
	e.exec(`INSERT INTO leads (gclid, clicked_at) VALUES ('OLD', now() - interval '100 days'), ('NEW', now())`)
	run := func(key string) *httptest.ResponseRecorder {
		return e.do("POST", "/api/v1/internal/jobs/retention.cleanup", "", svc, "Idempotency-Key", key)
	}
	if c := e.do("POST", "/api/v1/internal/jobs/retention.cleanup", "", svc).Code; c != 400 {
		t.Errorf("missing key: %d", c)
	}
	if c := e.do("POST", "/api/v1/internal/jobs/nope", "", svc, "Idempotency-Key", "k").Code; c != 404 {
		t.Errorf("unknown job: %d", c)
	}
	rec := run("run-1")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"leads_deleted":1`) {
		t.Fatalf("run: %d %s", rec.Code, rec.Body.String())
	}
	// retry with the same key replays the stored result and doesn't re-run
	e.exec(`INSERT INTO leads (gclid, clicked_at) VALUES ('OLD2', now() - interval '100 days')`)
	rec = run("run-1")
	if !strings.Contains(rec.Body.String(), `"replayed":true`) {
		t.Fatalf("expected replay: %s", rec.Body.String())
	}
	var n int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM leads WHERE gclid = 'OLD2'`).Scan(&n)
	if n != 1 {
		t.Fatal("replayed run executed again")
	}
	if rec = run("run-2"); !strings.Contains(rec.Body.String(), `"leads_deleted":1`) {
		t.Fatalf("new key should run: %s", rec.Body.String())
	}
}

func TestProfilePermissions(t *testing.T) {
	e := newTestEnv(t)
	// two admin rows with profiles; the tech admin owns only their own
	e.exec(`INSERT INTO admin_users (id, email, role) VALUES ('00000000-0000-0000-0000-000000000002','joao@test','clinical')`)
	e.exec(`INSERT INTO profiles (id, slug, display_name, admin_user_id) VALUES
		('aaaa0000-0000-0000-0000-000000000001','jonathas','Jonathas','00000000-0000-0000-0000-000000000001'),
		('aaaa0000-0000-0000-0000-000000000002','joao','João','00000000-0000-0000-0000-000000000002')`)
	tech := e.token(authn.RoleAdminTech) // subject ...0001
	if body := e.do("GET", "/api/v1/admin/profiles/slug:jonathas", "", tech).Body.String(); !strings.Contains(body, `"displayName":"Jonathas"`) {
		t.Errorf("admin profile json: %s", body)
	}
	if c := e.do("PATCH", "/api/v1/admin/profiles/aaaa0000-0000-0000-0000-000000000001", `{"jobTitle":"Desenvolvedor"}`, tech).Code; c != 204 {
		t.Errorf("own profile: %d", c)
	}
	if c := e.do("PATCH", "/api/v1/admin/profiles/aaaa0000-0000-0000-0000-000000000002", `{"jobTitle":"x"}`, tech).Code; c != 403 {
		t.Errorf("someone else's profile: %d", c)
	}
	if c := e.do("PATCH", "/api/v1/admin/profiles/aaaa0000-0000-0000-0000-000000000001", `{"crp":"06/1"}`, tech).Code; c != 403 {
		t.Errorf("self-assigned CRP: %d", c)
	}
	rec := e.do("POST", "/api/v1/admin/profiles/aaaa0000-0000-0000-0000-000000000001/sections", `{"kind":"education","title":"Formação"}`, tech)
	if rec.Code != 201 {
		t.Fatalf("section: %d %s", rec.Code, rec.Body.String())
	}
	var sec struct{ ID string }
	_ = json.Unmarshal(rec.Body.Bytes(), &sec)
	if c := e.do("POST", "/api/v1/admin/sections/"+sec.ID+"/entries", `{"title":"Bacharelado","organization":"USP","startDate":"2015-02-01","endDate":"2019-12-15","featured":true}`, tech).Code; c != 201 {
		t.Errorf("entry: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/sections/"+sec.ID+"/entries", `{"title":"x","startDate":"31/12/2020"}`, tech).Code; c != 400 {
		t.Errorf("bad date accepted: %d", c)
	}
	clin := e.token(authn.RoleAdminClinical)
	e.exec(`UPDATE profiles SET visibility = 'public' WHERE slug = 'jonathas'`)
	body := e.do("GET", "/api/v1/public/profiles/jonathas", "", "").Body.String()
	if !strings.Contains(body, "Bacharelado") || !strings.Contains(body, `"startDate":"2015-02-01"`) {
		t.Fatalf("public profile: %s", body)
	}
	if strings.Contains(e.do("GET", "/api/v1/public/profiles/joao", "", "").Body.String(), "Joao") {
		t.Fatal("hidden profile visible")
	}
	if c := e.do("PATCH", "/api/v1/admin/profiles/aaaa0000-0000-0000-0000-000000000001", `{"crp":"06/12345","isClinician":true}`, clin).Code; c != 204 {
		t.Errorf("clinical admin sets CRP: %d", c)
	}
}

func TestSiteTexts(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminTech)
	put := func(key, body string, ifm string) int {
		return e.do("PUT", "/api/v1/admin/texts/"+key, body, tok, "If-Match", ifm).Code
	}
	if c := e.do("PUT", "/api/v1/admin/texts/home.hero.title", `{"value":"x"}`, tok).Code; c != 428 {
		t.Errorf("missing If-Match: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Cuidado com escuta"}`, "0"); c != 200 {
		t.Fatalf("create: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Outro"}`, "0"); c != 412 {
		t.Errorf("stale create: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Outro"}`, "1"); c != 200 {
		t.Errorf("update: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Outro"}`, "1"); c != 412 {
		t.Errorf("stale update: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Resultados garantidos em 3 sessões"}`, "2"); c != 422 {
		t.Errorf("lint should block: %d", c)
	}
	if c := put("home.hero.title", `{"value":"Resultados garantidos em 3 sessões","acknowledgeLint":true}`, "2"); c != 200 {
		t.Errorf("acknowledged lint: %d", c)
	}
	if c := put("Bad%20Key", `{"value":"x"}`, "0"); c != 400 {
		t.Errorf("bad key: %d", c)
	}
	if c := put("home.faq", `{"value":[{"id":"a","question":"Q","answer":"A"}]}`, "0"); c != 200 {
		t.Errorf("list value: %d", c)
	}
	if c := put("home.bad", `{"value":{"a":1}}`, "0"); c != 400 {
		t.Errorf("object value: %d", c)
	}
	rec := e.do("GET", "/api/v1/public/texts", "", "")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "home.hero.title") {
		t.Errorf("public texts: %d %s", rec.Code, rec.Body.String())
	}
	h := e.do("GET", "/api/v1/admin/texts/home.hero.title/history", "", tok)
	if !strings.Contains(h.Body.String(), "Cuidado com escuta") {
		t.Errorf("history: %s", h.Body.String())
	}
	if c := e.do("DELETE", "/api/v1/admin/texts/home.hero.title", "", tok).Code; c != 204 {
		t.Errorf("delete: %d", c)
	}
	if strings.Contains(e.do("GET", "/api/v1/public/texts", "", "").Body.String(), "home.hero.title") {
		t.Errorf("deleted override still public")
	}
}

func TestServicePublishLint(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	rec := e.do("POST", "/api/v1/admin/services", `{"slug":"promessa","name":"Promessa"}`, tok)
	var ids struct{ ID, PageID string }
	_ = json.Unmarshal(rec.Body.Bytes(), &ids)
	bad := `{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","text":"Resultados garantidos em poucas sessões, o melhor psicólogo."}]}]}}`
	if c := e.do("PUT", "/api/v1/admin/services/"+ids.ID+"/body", bad, tok).Code; c != 204 {
		t.Fatalf("body: %d", c)
	}
	pub := "/api/v1/admin/pages/" + ids.PageID + "/publish"
	if c := e.do("POST", pub, "", tok).Code; c != 422 {
		t.Fatalf("lint did not block publish: %d", c)
	}
	if c := e.do("GET", "/api/v1/public/pages/promessa", "", "").Code; c != 404 {
		t.Fatalf("blocked page became public: %d", c)
	}
	if c := e.do("POST", pub, `{"acknowledgeLint":true}`, tok).Code; c != 200 {
		t.Fatalf("acknowledged publish: %d", c)
	}
}

func TestGlossaryAndRoutes(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.exec(`INSERT INTO profiles (id, slug, display_name, is_clinician, crp, visibility) VALUES ('99999999-9999-9999-9999-999999999999','joao','João',true,'06/157908','public')`)
	rec := e.do("POST", "/api/v1/admin/glossary", `{"term":"Reforço positivo","shortDefinition":"Consequência que aumenta a frequência de um comportamento.","reviewedByProfileId":"99999999-9999-9999-9999-999999999999"}`, tok)
	if rec.Code != 200 {
		t.Fatalf("create term: %d %s", rec.Code, rec.Body.String())
	}
	var made struct{ ID, Slug string }
	_ = json.Unmarshal(rec.Body.Bytes(), &made)
	if c := e.do("GET", "/api/v1/public/glossary/"+made.Slug, "", "").Code; c != 404 {
		t.Fatalf("draft term is public: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/glossary/"+made.ID+"/publish", "", tok).Code; c != 204 {
		t.Fatalf("publish: %d", c)
	}
	routes := e.do("GET", "/api/v1/public/routes", "", "").Body.String()
	if !strings.Contains(routes, `"/glossario/reforco-positivo"`) || !strings.Contains(routes, `"/sobre/joao"`) {
		t.Fatalf("routes missing glossary/profile: %s", routes)
	}
	if c := e.do("POST", "/api/v1/admin/glossary/"+made.ID+"/unpublish", "", tok).Code; c != 204 {
		t.Fatalf("unpublish: %d", c)
	}
	if strings.Contains(e.do("GET", "/api/v1/public/routes", "", "").Body.String(), "reforco-positivo") {
		t.Fatal("unpublished term still in routes")
	}
}

func TestJobsRunAdminAndAirflow(t *testing.T) {
	e := newTestEnv(t)
	svc, admin := e.token(authn.RoleService), e.token(authn.RoleAdminTech)
	// Airflow path: synchronous, idempotent per key
	first := e.do("POST", "/api/v1/internal/jobs/newsletter.reconcile", "", svc, "Idempotency-Key", "run-1")
	if first.Code != 200 || !strings.Contains(first.Body.String(), `"status":"ok"`) {
		t.Fatalf("first run: %d %s", first.Code, first.Body.String())
	}
	again := e.do("POST", "/api/v1/internal/jobs/newsletter.reconcile", "", svc, "Idempotency-Key", "run-1")
	if !strings.Contains(again.Body.String(), `"replayed":true`) {
		t.Fatalf("retry did not replay: %s", again.Body.String())
	}
	if c := e.do("POST", "/api/v1/internal/jobs/nope", "", svc, "Idempotency-Key", "k").Code; c != 404 {
		t.Errorf("unknown job: %d", c)
	}
	// non-Go tasks report their own runs
	if c := e.do("POST", "/api/v1/internal/jobs-report", `{"job":"backup.run","key":"dag-1","status":"ok","summary":{"bytes":123}}`, svc).Code; c != 204 {
		t.Errorf("report: %d", c)
	}
	// admin UI path: trigger now, then see it in the runs list
	rec := e.do("POST", "/api/v1/admin/jobs/retention.cleanup/trigger", "", admin)
	if rec.Code != 202 {
		t.Fatalf("trigger: %d %s", rec.Code, rec.Body.String())
	}
	var ok bool
	for i := 0; i < 50 && !ok; i++ {
		time.Sleep(50 * time.Millisecond)
		ok = strings.Contains(e.do("GET", "/api/v1/admin/jobs/runs?job=retention.cleanup", "", admin).Body.String(), `"status":"ok"`)
	}
	if !ok {
		t.Fatal("manual run never finished")
	}
	runs := e.do("GET", "/api/v1/admin/jobs/runs", "", admin).Body.String()
	if !strings.Contains(runs, "backup.run") || !strings.Contains(runs, "newsletter.reconcile") {
		t.Errorf("runs list: %s", runs)
	}
	if c := e.do("GET", "/api/v1/admin/audit", "", admin).Code; c != 200 {
		t.Errorf("audit: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/jobs/retention.cleanup/trigger", "", svc).Code; c != 401 {
		t.Errorf("service token on admin trigger: %d", c)
	}
}
