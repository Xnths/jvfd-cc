package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/research"
	"github.com/Xnths/jvfd-cc/backend/internal/seo"
)

type fakeGSC struct{ rows []seo.Row }

func (f fakeGSC) Query(_ context.Context, start, end time.Time) ([]seo.Row, error) {
	var out []seo.Row
	for _, r := range f.rows {
		if !r.Date.Before(start) && !r.Date.After(end) {
			out = append(out, r)
		}
	}
	return out, nil
}

func TestSearchConsoleSyncAndOpportunities(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	now := time.Date(2026, 10, 25, 12, 0, 0, 0, time.UTC)
	d := func(daysAgo int) time.Time {
		return time.Date(2026, 10, 23, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -daysAgo)
	}
	row := func(daysAgo int, page, q string, clicks, imps int, pos float64) seo.Row {
		return seo.Row{Date: d(daysAgo), Page: "https://psicologojoaofernandes.com" + page, Query: q, Clicks: clicks, Impressions: imps, Position: pos}
	}
	f := fakeGSC{rows: []seo.Row{
		row(3, "/psicoterapia", "psicólogo online", 2, 100, 10),
		row(4, "/blog/ansiedade", "como lidar com ansiedade", 0, 40, 25),
		row(5, "/plantao", "plantão psicológico", 5, 500, 2),
		row(6, "/terapia-de-casal", "terapia de casal", 4, 50, 6),
		row(6, "/blog/casal", "terapia de casal", 1, 30, 9),
		row(3, "/blog/x", "tema antigo", 20, 200, 4), // recent: clicks fell
		row(40, "/blog/x", "tema antigo", 100, 400, 4),
	}}
	res, err := seo.Sync(ctx, e.srv.Pool, f, now)
	if err != nil || res["rows"] == nil {
		t.Fatalf("sync: %v %v", res, err)
	}
	// running again is a no-op for the data (upsert) and keeps counts
	if _, err := seo.Sync(ctx, e.srv.Pool, f, now); err != nil {
		t.Fatal(err)
	}
	var n int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM gsc_daily`).Scan(&n)
	if n != len(f.rows) {
		t.Fatalf("gsc_daily rows = %d, want %d", n, len(f.rows))
	}
	out, err := seo.Opportunities(ctx, e.srv.Pool)
	if err != nil {
		t.Fatalf("opportunities: %v (%v)", err, out)
	}
	want := map[string]int{"striking_distance": 1, "low_ctr": 1, "cannibalization": 1, "faq_candidate": 1, "decay": 1}
	for kind, min := range want {
		var c int
		_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM seo_suggestions WHERE kind = $1`, kind).Scan(&c)
		if c < min {
			t.Errorf("%s suggestions = %d, want >= %d (result %v)", kind, c, min, out)
		}
	}
	var gaps int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM seo_suggestions WHERE kind = 'content_gap' AND query = 'como lidar com ansiedade'`).Scan(&gaps)
	if gaps != 1 {
		t.Errorf("content gap for an uncovered query = %d", gaps)
	}
	// dismissed suggestions stay dismissed when the job runs again
	e.exec(`UPDATE seo_suggestions SET status = 'dismissed' WHERE kind = 'striking_distance'`)
	if _, err := seo.Opportunities(ctx, e.srv.Pool); err != nil {
		t.Fatal(err)
	}
	var st string
	_ = e.srv.Pool.QueryRow(ctx, `SELECT status FROM seo_suggestions WHERE kind = 'striking_distance'`).Scan(&st)
	if st != "dismissed" {
		t.Errorf("status after rerun = %s", st)
	}
	var total int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM seo_suggestions`).Scan(&total)
	_, _ = seo.Opportunities(ctx, e.srv.Pool)
	var again int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM seo_suggestions`).Scan(&again)
	if again != total {
		t.Errorf("rerun created duplicates: %d -> %d", total, again)
	}
}

func TestResearchFetchAndDigest(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	eutils := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "esearch.fcgi"):
			_, _ = w.Write([]byte(`{"esearchresult":{"idlist":["111","222"]}}`))
		case strings.HasSuffix(r.URL.Path, "efetch.fcgi"):
			_, _ = w.Write([]byte(`<?xml version="1.0"?><PubmedArticleSet>
<PubmedArticle><MedlineCitation><PMID>111</PMID><Article><Journal><Title>J Behav Ther</Title><JournalIssue><PubDate><Year>2026</Year><Month>Oct</Month></PubDate></JournalIssue></Journal>
<ArticleTitle>Behavioral activation for depression: a meta-analysis</ArticleTitle><Abstract><AbstractText Label="BACKGROUND">Depression is common.</AbstractText><AbstractText Label="RESULTS">Effects were moderate.</AbstractText></Abstract>
<AuthorList><Author><LastName>Silva</LastName><ForeName>Ana</ForeName></Author></AuthorList><PublicationTypeList><PublicationType>Meta-Analysis</PublicationType></PublicationTypeList></Article></MedlineCitation>
<PubmedData><ArticleIdList><ArticleId IdType="doi">10.1000/abc</ArticleId></ArticleIdList></PubmedData></PubmedArticle>
<PubmedArticle><MedlineCitation><PMID>222</PMID><Article><Journal><Title>Other</Title><JournalIssue><PubDate><Year>2026</Year></PubDate></JournalIssue></Journal><ArticleTitle>No abstract here</ArticleTitle></Article></MedlineCitation></PubmedArticle>
</PubmedArticleSet>`))
		}
	}))
	defer eutils.Close()
	crossref := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"message":{"items":[{"DOI":"10.1590/XYZ","title":["Análise do comportamento e saúde"],"container-title":["Psicologia: Teoria e Pesquisa"],"URL":"https://doi.org/10.1590/XYZ","abstract":"<jats:p>Resumo do artigo.</jats:p>","author":[{"given":"João","family":"Souza"}],"issued":{"date-parts":[[2026,10,3]]}}]}}`))
	}))
	defer crossref.Close()
	f := &research.Fetcher{HTTP: http.DefaultClient, Email: "test@example.com", EUtilsBase: eutils.URL, CrossBase: crossref.URL}
	res, err := research.Fetch(ctx, e.srv.Pool, f)
	if err != nil {
		t.Fatalf("fetch: %v %v", res, err)
	}
	var n int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM research_items`).Scan(&n)
	if n < 3 {
		t.Fatalf("items stored = %d (%v)", n, res)
	}
	// a second run adds nothing
	_, _ = research.Fetch(ctx, e.srv.Pool, f)
	var again int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM research_items`).Scan(&again)
	if again != n {
		t.Fatalf("duplicates after rerun: %d -> %d", n, again)
	}
	out, err := research.Digest(ctx, e.srv.Pool, time.Date(2026, 10, 26, 8, 0, 0, 0, time.UTC), nil)
	if err != nil || out["post_id"] == nil {
		t.Fatalf("digest: %v %v", out, err)
	}
	var status, origin, content string
	if err := e.srv.Pool.QueryRow(ctx, `SELECT status, origin, content::text FROM posts WHERE id::text = $1`, out["post_id"]).Scan(&status, &origin, &content); err != nil {
		t.Fatal(err)
	}
	if status != "draft" || origin != "research_bot" || !strings.Contains(content, "Behavioral activation") || !strings.Contains(content, "10.1000/abc") {
		t.Fatalf("draft post: %s %s %s", status, origin, content)
	}
	// the bot's draft cannot be published without a clinician reviewer
	tok := e.token(authn.RoleAdminClinical)
	rec := e.do("POST", "/api/v1/admin/posts/"+out["post_id"].(string)+"/publish", `{"acknowledgeLint":true}`, tok)
	if rec.Code == 200 {
		t.Fatalf("bot post published without a reviewer: %s", rec.Body.String())
	}
	// every item used by the digest is marked, so next week starts fresh
	var left int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM research_items WHERE status = 'new' AND abstract <> ''`).Scan(&left)
	if left != 0 {
		t.Errorf("items left new after digest: %d", left)
	}
}

func TestTrendRadar(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	// 2026-08-20: Setembro Amarelo (09-01, lead 60) and Dia do Psicólogo (08-27, lead 30) are both inside their lead time
	res, err := seo.Radar(ctx, e.srv.Pool, time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	var amarelo int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM topic_queue WHERE dedupe_key LIKE 'awareness|Setembro Amarelo%'`).Scan(&amarelo)
	if amarelo == 0 {
		t.Fatalf("no Setembro Amarelo topics: %v", res)
	}
	var far int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM topic_queue WHERE dedupe_key LIKE 'awareness|Dezembro Vermelho%'`).Scan(&far)
	if far != 0 {
		t.Errorf("topics queued too early: %d", far)
	}
	if _, err := seo.Radar(ctx, e.srv.Pool, time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC)); err != nil {
		t.Fatal(err)
	}
	var again int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM topic_queue WHERE dedupe_key LIKE 'awareness|Setembro Amarelo%'`).Scan(&again)
	if again != amarelo {
		t.Errorf("rerun duplicated topics: %d -> %d", amarelo, again)
	}
}

func TestSEOAdminEndpoints(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminTech)
	e.exec(`INSERT INTO seo_suggestions (kind, dedupe_key, target_id, query, proposal) VALUES
		('content_gap','content_gap||ansiedade no trabalho','','ansiedade no trabalho','{"action":"write_post"}'),
		('faq_candidate','faq_candidate||como começar terapia','','como começar terapia','{}'),
		('low_ctr','low_ctr|/plantao|plantão','/plantao','plantão','{}')`)
	if rec := e.do("GET", "/api/v1/admin/seo/suggestions", "", tok); rec.Code != 200 || !strings.Contains(rec.Body.String(), "ansiedade no trabalho") {
		t.Fatalf("list: %d %s", rec.Code, rec.Body.String())
	}
	var list struct {
		Suggestions []struct{ ID, Kind string } `json:"suggestions"`
	}
	_ = json.Unmarshal(e.do("GET", "/api/v1/admin/seo/suggestions", "", tok).Body.Bytes(), &list)
	byKind := map[string]string{}
	for _, s := range list.Suggestions {
		byKind[s.Kind] = s.ID
	}
	rec := e.do("POST", "/api/v1/admin/seo/suggestions/"+byKind["content_gap"]+"/apply", "", tok)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "/blog/ansiedade-no-trabalho") {
		t.Fatalf("apply gap: %d %s", rec.Code, rec.Body.String())
	}
	var origin, status string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT origin, status FROM posts WHERE slug = 'ansiedade-no-trabalho'`).Scan(&origin, &status)
	if origin != "gsc" || status != "draft" {
		t.Errorf("gap post = %s/%s", origin, status)
	}
	if rec := e.do("POST", "/api/v1/admin/seo/suggestions/"+byKind["faq_candidate"]+"/apply", "", tok); !strings.Contains(rec.Body.String(), "/admin/perguntas") {
		t.Errorf("apply faq: %s", rec.Body.String())
	}
	if c := e.do("POST", "/api/v1/admin/seo/suggestions/"+byKind["low_ctr"]+"/dismiss", "", tok).Code; c != 204 {
		t.Errorf("dismiss: %d", c)
	}
	if c := e.do("POST", "/api/v1/admin/seo/suggestions/"+byKind["content_gap"]+"/apply", "", tok).Code; c != 404 {
		t.Errorf("applying twice: %d", c)
	}
	for _, p := range []string{"/api/v1/admin/seo/overview", "/api/v1/admin/topics", "/api/v1/admin/calendar", "/api/v1/admin/research/items"} {
		if c := e.do("GET", p, "", tok).Code; c != 200 {
			t.Errorf("%s: %d", p, c)
		}
	}
	if c := e.do("POST", "/api/v1/admin/calendar", `{"name":"Teste","startMd":"13-45","endMd":"01-01"}`, tok).Code; c != 400 {
		t.Errorf("bad calendar date accepted: %d", c)
	}
}
