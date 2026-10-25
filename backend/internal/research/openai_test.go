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
