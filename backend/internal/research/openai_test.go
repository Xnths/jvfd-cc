package research

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOpenAISummarizer(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Write([]byte(`{"choices":[{"message":{"content":" Resumo curto. "}}],"usage":{"prompt_tokens":100,"completion_tokens":20}}`))
	}))
	defer srv.Close()
	o := NewOpenAISummarizer(nil, "k", "", 5)
	o.Base = srv.URL
	got, err := o.Summarize(context.Background(), Item{Title: "T", Abstract: "A"})
	if err != nil || got != "Resumo curto." {
		t.Fatalf("got %q, %v", got, err)
	}
	if gotAuth != "Bearer k" {
		t.Fatalf("auth header %q", gotAuth)
	}
}

func TestOpenAISummarizerErrorStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(429) }))
	defer srv.Close()
	o := NewOpenAISummarizer(nil, "k", "m", 5)
	o.Base = srv.URL
	if _, err := o.Summarize(context.Background(), Item{}); err == nil {
		t.Fatal("expected error")
	}
}

func TestWebSearchParsesCitations(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/responses" {
			t.Errorf("path %s", r.URL.Path)
		}
		w.Write([]byte(`{"output":[{"type":"web_search_call"},{"type":"message","content":[{"type":"output_text","text":"- Primeiro ponto.\n- Segundo ponto.","annotations":[
			{"type":"url_citation","url":"https://a.gov.br/x?utm_source=openai&id=1","title":"A","end_index":17},
			{"type":"url_citation","url":"https://a.gov.br/x?utm_source=openai&id=1","title":"A de novo","end_index":35},
			{"type":"url_citation","url":"ftp://bad","title":"B","end_index":5}]}]}]}`))
	}))
	defer srv.Close()
	o := NewOpenAISummarizer(nil, "k", "", 5)
	o.Base = srv.URL
	got, err := o.WebSearch(context.Background(), "t", "q")
	if err != nil || len(got) != 1 {
		t.Fatalf("got %v, %v", got, err)
	}
	if got[0].URL != "https://a.gov.br/x?id=1" || got[0].Snippet != "- Primeiro ponto." {
		t.Fatalf("source %+v", got[0])
	}
}
