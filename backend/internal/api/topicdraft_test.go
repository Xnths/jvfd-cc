package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/research"
)

// fakeServices stands in for OpenAI, PubMed and Crossref. The chat answer depends on which step's prompt it gets.
func fakeServices(t *testing.T) (ai *research.OpenAI, f *research.Fetcher) {
	t.Helper()
	chat := func(content string) string {
		b, _ := json.Marshal(map[string]any{"choices": []map[string]any{{"message": map[string]string{"content": content}}}, "usage": map[string]int{"prompt_tokens": 1000, "completion_tokens": 500}})
		return string(b)
	}
	openai := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		switch {
		case r.URL.Path == "/v1/responses":
			_, _ = w.Write([]byte(`{"output":[{"type":"web_search_call"},{"type":"message","content":[{"type":"output_text","text":"- A OMS descreve a ansiedade.\n- O CFP orienta.","annotations":[{"type":"url_citation","url":"https://www.who.int/x?utm_source=openai","title":"OMS","end_index":30}]}]}],"usage":{"input_tokens":800,"output_tokens":100}}`))
		case strings.Contains(string(body), "buscas bibliográficas"):
			_, _ = w.Write([]byte(chat(`{"pubmed_query":"exam anxiety","scielo_query":"ansiedade provas","web_query":"ansiedade antes de provas"}`)))
		case strings.Contains(string(body), "planejar o post"):
			_, _ = w.Write([]byte(chat(`{"angle":"Ansiedade não é fraqueza","title_options":["A","B","C"],"hook":"Você já travou?","sections":[{"heading":"O que acontece","points":["p"],"sources":[1]}],"example_scenario":"x","closing_line":"y","cautions":["Conferir a meta-análise [1]"]}`)))
		case strings.Contains(string(body), "escrever o post completo"):
			_, _ = w.Write([]byte(chat(`{"title":"Ansiedade antes das provas?","excerpt":"Um texto.","meta_description":"Meta.","keywords":"ansiedade, provas","blocks":[{"type":"p","text":"Você já travou? Os estudos sugerem algo [3]."},{"type":"h2","text":"O que acontece?"},{"type":"p","text":"A ativação comportamental ajuda [1] e a OMS descreve [9]."},{"type":"ul","items":["um","dois [2]"]}]}`)))
		default:
			w.WriteHeader(500)
		}
	}))
	t.Cleanup(openai.Close)
	eutils := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "esearch.fcgi") {
			_, _ = w.Write([]byte(`{"esearchresult":{"idlist":["111"]}}`))
			return
		}
		_, _ = w.Write([]byte(`<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>111</PMID><Article><Journal><Title>J Anxiety</Title><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>
<ArticleTitle>Exam anxiety: a meta-analysis</ArticleTitle><Abstract><AbstractText>Effects were moderate.</AbstractText></Abstract>
<AuthorList><Author><LastName>Silva</LastName><ForeName>Ana</ForeName></Author></AuthorList><PublicationTypeList><PublicationType>Meta-Analysis</PublicationType></PublicationTypeList></Article></MedlineCitation>
<PubmedData><ArticleIdList><ArticleId IdType="doi">10.1000/exam</ArticleId></ArticleIdList></PubmedData></PubmedArticle></PubmedArticleSet>`))
	}))
	t.Cleanup(eutils.Close)
	crossref := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"message":{"items":[{"DOI":"10.1590/ABC","title":["Ansiedade em estudantes"],"container-title":["Psico"],"URL":"https://doi.org/10.1590/ABC","abstract":"<jats:p>Resumo.</jats:p>","issued":{"date-parts":[[2023,5,1]]}}]}}`))
	}))
	t.Cleanup(crossref.Close)
	ai = research.NewOpenAISummarizer(nil, "k", "", 5)
	ai.Base = openai.URL
	return ai, &research.Fetcher{HTTP: http.DefaultClient, Email: "t@example.com", EUtilsBase: eutils.URL, CrossBase: crossref.URL}
}

func newDigest(e *testEnv) (topicID, digestID string) {
	e.t.Helper()
	ctx := context.Background()
	if err := e.srv.Pool.QueryRow(ctx, `INSERT INTO topic_queue (topic, rationale, source) VALUES ('Ansiedade antes de provas','Época de vestibular','manual') RETURNING id::text`).Scan(&topicID); err != nil {
		e.t.Fatal(err)
	}
	if err := e.srv.Pool.QueryRow(ctx, `INSERT INTO topic_digests (topic_id) VALUES ($1::uuid) RETURNING id::text`, topicID).Scan(&digestID); err != nil {
		e.t.Fatal(err)
	}
	return
}

func TestDraftTopicPipeline(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	ai, f := fakeServices(t)
	ai.Pool, ai.BudgetUSD = e.srv.Pool, 5
	topicID, digestID := newDigest(e)

	if err := research.DraftTopic(ctx, e.srv.Pool, f, ai, digestID); err != nil {
		t.Fatalf("draft: %v", err)
	}
	var status, postID, outline string
	var cost float64
	if err := e.srv.Pool.QueryRow(ctx, `SELECT status, post_id::text, outline::text, cost_usd::float8 FROM topic_digests WHERE id::text = $1`, digestID).Scan(&status, &postID, &outline, &cost); err != nil {
		t.Fatal(err)
	}
	if status != "done" || !strings.Contains(outline, "Ansiedade não é fraqueza") || cost <= 0.02 {
		t.Fatalf("digest row: %s cost=%v outline=%s", status, cost, outline)
	}
	var pstatus, origin, content, citations string
	if err := e.srv.Pool.QueryRow(ctx, `SELECT status, origin, content::text, citations::text FROM posts WHERE id::text = $1`, postID).Scan(&pstatus, &origin, &content, &citations); err != nil {
		t.Fatal(err)
	}
	if pstatus != "draft" || origin != "topic_bot" {
		t.Fatalf("post: %s %s", pstatus, origin)
	}
	// [3] and [9] point at no used source or no source at all: [9] is dropped; markers are renumbered by first use.
	if strings.Contains(content, "[9]") || !strings.Contains(content, "Referências") || !strings.Contains(content, "Para auditar") || !strings.Contains(content, "Rascunho gerado por IA") {
		t.Fatalf("content: %s", content)
	}
	if !strings.Contains(citations, "10.1000/exam") || strings.Contains(citations, "utm_source") {
		t.Fatalf("citations: %s", citations)
	}
	var usage int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM llm_usage WHERE job = 'topic.digest'`).Scan(&usage)
	if usage != 4 {
		t.Fatalf("llm_usage rows = %d, want 4 (queries, web search, idea, draft)", usage)
	}
	var tstatus string
	_ = e.srv.Pool.QueryRow(ctx, `SELECT status FROM topic_queue WHERE id::text = $1`, topicID).Scan(&tstatus)
	if tstatus != "in_progress" {
		t.Errorf("topic status %q", tstatus)
	}
	// papers used are kept for /admin/pesquisa and out of next week's digest
	var left int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM research_items WHERE status = 'new'`).Scan(&left)
	if left != 0 {
		t.Errorf("items left new: %d", left)
	}
	// the draft cannot go live without a clinician reviewer
	rec := e.do("POST", "/api/v1/admin/posts/"+postID+"/publish", `{"acknowledgeLint":true}`, e.token(authn.RoleAdminClinical))
	if rec.Code == 200 {
		t.Fatalf("topic_bot post published without a reviewer: %s", rec.Body.String())
	}
}

func TestDraftTopicBudget(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	ai, f := fakeServices(t)
	ai.Pool, ai.BudgetUSD = e.srv.Pool, 1
	e.exec(`INSERT INTO llm_usage (job, model, est_cost_usd) VALUES ('x','m',1.5)`)
	_, digestID := newDigest(e)
	if err := research.DraftTopic(ctx, e.srv.Pool, f, ai, digestID); err == nil {
		t.Fatal("expected the budget error")
	}
	var status string
	var posts int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT status FROM topic_digests WHERE id::text = $1`, digestID).Scan(&status)
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE origin = 'topic_bot'`).Scan(&posts)
	if status != "failed" || posts != 0 {
		t.Fatalf("status=%s posts=%d", status, posts)
	}
}

func TestTopicDigestEndpoint(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	topicID, _ := newDigest(e) // leaves a run in flight for this topic
	t.Setenv("OPENAI_API_KEY", "")
	if rec := e.do("POST", "/api/v1/admin/topics/"+topicID+"/digest", "", tok); rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("without a key: %d %s", rec.Code, rec.Body.String())
	}
	t.Setenv("OPENAI_API_KEY", "k")
	if rec := e.do("POST", "/api/v1/admin/topics/"+topicID+"/digest", "", tok); rec.Code != http.StatusConflict {
		t.Fatalf("second run: %d %s", rec.Code, rec.Body.String())
	}
	// one draft per pauta: a finished run blocks another, a failed one does not
	e.exec(`UPDATE topic_digests SET status = 'done' WHERE topic_id::text = $1`, topicID)
	if rec := e.do("POST", "/api/v1/admin/topics/"+topicID+"/digest", "", tok); rec.Code != http.StatusConflict {
		t.Fatalf("after a finished draft: %d %s", rec.Code, rec.Body.String())
	}
	e.exec(`UPDATE topic_digests SET status = 'failed' WHERE topic_id::text = $1`, topicID)
	if rec := e.do("POST", "/api/v1/admin/topics/"+topicID+"/digest", "", tok); rec.Code != http.StatusAccepted {
		t.Fatalf("retry after a failed run: %d %s", rec.Code, rec.Body.String())
	}
	if rec := e.do("POST", "/api/v1/admin/topics/00000000-0000-0000-0000-0000000000aa/digest", "", tok); rec.Code != http.StatusNotFound {
		t.Fatalf("unknown topic: %d", rec.Code)
	}
	rec := e.do("GET", "/api/v1/admin/topics?status=queued", "", tok)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"digest":{`) || !strings.Contains(rec.Body.String(), `"status":"searching"`) {
		t.Fatalf("topics list: %d %s", rec.Code, rec.Body.String())
	}
}

func TestDraftTopicNoCredit(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()
	_, f := fakeServices(t)
	broke := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(429)
		_, _ = w.Write([]byte(`{"error":{"code":"insufficient_quota","message":"You exceeded your current quota"}}`))
	}))
	defer broke.Close()
	ai := research.NewOpenAISummarizer(e.srv.Pool, "sk-secret", "", 5)
	ai.Base = broke.URL
	topicID, digestID := newDigest(e)
	if err := research.DraftTopic(ctx, e.srv.Pool, f, ai, digestID); err == nil {
		t.Fatal("expected an error")
	}
	var status, msg string
	var posts int
	_ = e.srv.Pool.QueryRow(ctx, `SELECT status, error FROM topic_digests WHERE id::text = $1`, digestID).Scan(&status, &msg)
	_ = e.srv.Pool.QueryRow(ctx, `SELECT count(*) FROM posts WHERE origin = 'topic_bot'`).Scan(&posts)
	if status != "failed" || !strings.Contains(msg, "sem crédito") || strings.Contains(msg, "sk-secret") || posts != 0 {
		t.Fatalf("status=%s msg=%q posts=%d", status, msg, posts)
	}
	// the failed run does not use up the pauta's one draft
	if err := e.srv.Pool.QueryRow(ctx, `INSERT INTO topic_digests (topic_id) VALUES ($1::uuid) RETURNING id::text`, topicID).Scan(&digestID); err != nil {
		t.Fatalf("retry after failure: %v", err)
	}
}
