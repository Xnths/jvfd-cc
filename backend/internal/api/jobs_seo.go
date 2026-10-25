package api

import (
	"context"
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/research"
	"github.com/Xnths/jvfd-cc/backend/internal/seo"
)

// Jobs that Airflow runs for SEO. Each is idempotent and skips (without failing) when its credentials are missing,
// so the DAGs stay green until the owner finishes the setup.
func init() {
	jobs["gsc.sync"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		c, err := seo.NewAPIClient(os.Getenv("GSC_CREDENTIALS_FILE"), os.Getenv("GSC_SITE_URL"))
		if errors.Is(err, seo.ErrNotConfigured) {
			return map[string]any{"skipped": "GSC_CREDENTIALS_FILE / GSC_SITE_URL not set"}, nil
		}
		if err != nil {
			return nil, err
		}
		return seo.Sync(ctx, s.Pool, c, time.Now())
	}
	jobs["seo.opportunities"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		return seo.Opportunities(ctx, s.Pool)
	}
	jobs["trends.radar"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		return seo.Radar(ctx, s.Pool, time.Now())
	}
	jobs["research.fetch"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		email := os.Getenv("NCBI_EMAIL")
		if email == "" {
			return map[string]any{"skipped": "NCBI_EMAIL not set (NCBI and Crossref ask for a contact address)"}, nil
		}
		return research.Fetch(ctx, s.Pool, research.NewFetcher(email, os.Getenv("NCBI_API_KEY")))
	}
	jobs["research.digest"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		return research.Digest(ctx, s.Pool, time.Now(), summarizerFromEnv(s))
	}
}

// openAIFromEnv returns the OpenAI client, or nil without OPENAI_API_KEY (the digest then quotes the abstract and
// "Gerar rascunho" is unavailable).
func openAIFromEnv(s *Server) *research.OpenAI {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return nil
	}
	budget := 5.0
	if v, err := strconv.ParseFloat(os.Getenv("LLM_MONTHLY_BUDGET_USD"), 64); err == nil && v > 0 {
		budget = v
	}
	ai := research.NewOpenAISummarizer(s.Pool, key, os.Getenv("OPENAI_MODEL"), budget)
	ai.DraftModel = os.Getenv("OPENAI_DRAFT_MODEL")
	if base := os.Getenv("OPENAI_BASE_URL"); base != "" {
		ai.Base = base
	}
	return ai
}

// summarizerFromEnv is openAIFromEnv as the optional digest summarizer (a nil interface, not a typed nil).
func summarizerFromEnv(s *Server) research.Summarizer {
	if ai := openAIFromEnv(s); ai != nil {
		return ai
	}
	return nil
}
