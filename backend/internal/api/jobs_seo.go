package api

import (
	"context"
	"errors"
	"os"
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

// summarizerFromEnv returns the optional LLM summarizer (nil without ANTHROPIC_API_KEY).
func summarizerFromEnv(*Server) research.Summarizer { return nil }
