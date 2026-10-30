package api

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/ads"
)

func init() {
	// The in-process worker sends conversions within seconds; this job is the sweep Airflow or the admin can trigger.
	jobs["ads.upload"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		if s.Ads == nil {
			return map[string]any{"skipped": "GADS_* not set"}, nil
		}
		res, err := s.Ads.UploadPending(ctx)
		out := map[string]any{"sent": res.Sent, "succeeded": res.Succeeded, "retried": res.Retried, "failed": res.Failed}
		return out, err
	}
	// Stores Google's own success/error counts next to ours (shown on /admin/leads).
	jobs["ads.reconcile"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		cfg := ads.ConfigFromEnv(os.Getenv)
		if !cfg.Enabled() {
			return map[string]any{"skipped": "GADS_* not set"}, nil
		}
		raw, err := ads.NewClient(cfg).Summary(ctx)
		if err != nil {
			return nil, err
		}
		v, _ := json.Marshal(map[string]any{"at": time.Now().UTC(), "rows": json.RawMessage(raw)})
		if _, err := s.Pool.Exec(ctx, `INSERT INTO job_state (key, value) VALUES ('ads.reconcile',$1)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, v); err != nil {
			return nil, err
		}
		return map[string]any{"stored": true}, nil
	}
}
