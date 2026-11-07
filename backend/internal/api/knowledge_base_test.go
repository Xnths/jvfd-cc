package api

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"testing"

	"github.com/Xnths/jvfd-cc/backend/internal/copylint"
	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
)

// Migration 0016 publishes content straight into the tables, skipping the API's lint, so the same
// checks run here. The rows must never claim a review that did not happen.
func TestSeededKnowledgeBase(t *testing.T) {
	e := newTestEnv(t)
	ctx := context.Background()

	// Titles João doesn't hold, and things the site must never say (CLAUDE.md, CFP Res. 010/2005 Art. 20).
	forbidden := regexp.MustCompile(`(?i)neuropsic[oó]log[oa]s?\b|especialista|parcel|R\$`)
	check := func(where, text string) {
		t.Helper()
		if flags := copylint.Check(text); len(flags) > 0 {
			t.Errorf("%s: copy lint flagged %v", where, flags)
		}
		if m := forbidden.FindString(text); m != "" {
			t.Errorf("%s: forbidden wording %q", where, m)
		}
	}
	// Every internal link must point at something that exists, or crawlers hit a 404.
	known := map[string]bool{}
	for _, p := range []string{"/avaliacao-neuropsicologica", "/psicoterapia", "/plantao", "/lgbtqia", "/autoconhecimento", "/presencial"} {
		known[p] = true
	}
	var links []string
	linkRe := regexp.MustCompile(`"url":"(/[^"]*)"`)

	rows, err := e.srv.Pool.Query(ctx, `SELECT slug::text, term, short_definition, body, sources, status, reviewed_by_profile_id::text FROM glossary_terms`)
	if err != nil {
		t.Fatal(err)
	}
	terms := 0
	for rows.Next() {
		var slug, term, short, status string
		var body, sources json.RawMessage
		var reviewer *string
		if err := rows.Scan(&slug, &term, &short, &body, &sources, &status, &reviewer); err != nil {
			t.Fatal(err)
		}
		terms++
		known["/glossario/"+slug] = true
		if status != "published" || reviewer != nil {
			t.Errorf("term %s: status=%s reviewer=%v", slug, status, reviewer)
		}
		doc, err := richtext.Parse(body)
		if err != nil {
			t.Errorf("term %s: body is not a Lexical document: %v", slug, err)
		}
		check("term "+slug, term+" "+short+" "+richtext.PlainText(doc))
		var src []string
		if err := json.Unmarshal(sources, &src); err != nil || len(src) == 0 {
			t.Errorf("term %s needs sources: %v", slug, err)
		}
		for _, m := range linkRe.FindAllStringSubmatch(string(body), -1) {
			links = append(links, m[1])
		}
	}
	rows.Close()

	rows, err = e.srv.Pool.Query(ctx, `SELECT slug::text, question, answer, status FROM faq_questions WHERE slug IS NOT NULL`)
	if err != nil {
		t.Fatal(err)
	}
	questions := 0
	for rows.Next() {
		var slug, question, status string
		var answer json.RawMessage
		if err := rows.Scan(&slug, &question, &answer, &status); err != nil {
			t.Fatal(err)
		}
		questions++
		known["/perguntas/"+slug] = true
		if status != "published" {
			t.Errorf("question %s: status=%s", slug, status)
		}
		doc, err := richtext.Parse(answer)
		if err != nil {
			t.Errorf("question %s: answer is not a Lexical document: %v", slug, err)
		}
		text := richtext.PlainText(doc)
		check("question "+slug, question+" "+text)
		if strings.Contains(strings.ToLower(question+text), "crise") && !strings.Contains(text, "188") {
			t.Errorf("question %s talks about crisis without CVV 188", slug)
		}
		for _, m := range linkRe.FindAllStringSubmatch(string(answer), -1) {
			links = append(links, m[1])
		}
	}
	rows.Close()

	if terms < 20 || questions < 20 {
		t.Errorf("expected the seeded content, got %d terms and %d questions", terms, questions)
	}
	for _, l := range links {
		if !known[l] {
			t.Errorf("broken internal link %s", l)
		}
	}

	// The public API serves them without a reviewer.
	rec := e.do("GET", "/api/v1/public/glossary/avaliacao-neuropsicologica", "", "")
	if rec.Code != 200 || strings.Contains(rec.Body.String(), `"reviewedBy":{`) {
		t.Errorf("public term: %d %s", rec.Code, rec.Body.String())
	}
}

// The session count and duration are stated, and the body no longer sends people to WhatsApp for them.
func TestAvaliacaoDurationInBody(t *testing.T) {
	e := newTestEnv(t)
	var body string
	err := e.srv.Pool.QueryRow(context.Background(), `SELECT s.published_body::text FROM services s JOIN pages p ON p.id = s.page_id WHERE p.slug = 'avaliacao-neuropsicologica'`).Scan(&body)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(body, "de 4 a 6 sessões, de até 2 horas cada") || strings.Contains(body, "variam conforme o caso") {
		t.Errorf("avaliação body not updated: %s", body)
	}
	if !strings.Contains(body, `"seo-links"`) {
		t.Error("avaliação body is missing the links into the knowledge base")
	}
}
