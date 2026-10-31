package api

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/ads"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/Xnths/jvfd-cc/backend/internal/newsletter"
)

const (
	alertFailureRate = 0.10 // failed / total uploads in 24 h
	alertNoLeadHours = 72
	alertFrom        = "Alertas <alertas@psicologojoaofernandes.com>"
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
	// Value corrections (RESTATEMENT / RETRACTION) of bookings Google already has.
	jobs["ads.adjust"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		if s.Ads == nil {
			return map[string]any{"skipped": "GADS_* not set"}, nil
		}
		res, err := s.Ads.AdjustPending(ctx)
		return map[string]any{"sent": res.Sent, "succeeded": res.Succeeded, "retried": res.Retried, "failed": res.Failed}, err
	}
	// Stores Google's own success/error counts and the impressions/clicks per campaign (the funnel's n_0, n_1).
	jobs["ads.reconcile"] = func(ctx context.Context, s *Server) (map[string]any, error) {
		cfg := ads.ConfigFromEnv(os.Getenv)
		if !cfg.Enabled() {
			return map[string]any{"skipped": "GADS_* not set"}, nil
		}
		cl := ads.NewClient(cfg)
		raw, err := cl.Summary(ctx)
		if err != nil {
			return nil, err
		}
		if err := s.putJobState(ctx, "ads.reconcile", map[string]any{"at": time.Now().UTC(), "rows": json.RawMessage(raw)}); err != nil {
			return nil, err
		}
		out := map[string]any{"stored": true}
		// Campaign metrics need no extra permission, but a failure here must not hide the summary above.
		now := time.Now()
		d30, err30 := cl.CampaignMetrics(ctx, now.AddDate(0, 0, -30), now)
		d3, err3 := cl.CampaignMetrics(ctx, now.AddDate(0, 0, -3), now)
		if err30 != nil || err3 != nil {
			out["campaignsError"] = fmt.Sprint(err30, err3)
			return out, nil
		}
		if err := s.putJobState(ctx, "ads.campaigns", map[string]any{"at": now.UTC(), "d30": d30, "d3": d3}); err != nil {
			return nil, err
		}
		out["campaigns"] = len(d30)
		return out, nil
	}
	// Daily check: email the tech admins when the conversion signal looks broken.
	jobs["ads.alerts"] = adsAlerts
}

func (s *Server) putJobState(ctx context.Context, key string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = s.Pool.Exec(ctx, `INSERT INTO job_state (key, value) VALUES ($1,$2)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, key, b)
	return err
}

// techRecipients are the ADMIN_EMAILS whose ADMIN_ROLES entry is "tech".
func techRecipients() []string {
	roles := config.ParseRoles(os.Getenv("ADMIN_ROLES"))
	admins := config.ParseEmails(os.Getenv("ADMIN_EMAILS"))
	var out []string
	for email := range admins {
		if roles[strings.ToLower(email)] == authn.RoleAdminTech {
			out = append(out, email)
		}
	}
	sort.Strings(out)
	return out
}

// adsAlerts looks for: (a) more than 10 % of the uploads of the last 24 h failed, (b) no WhatsApp click lead for 72 h
// while Google reports ad clicks, (c) Google rejected our credentials, and on Mondays (d) bookings without a payment
// decision after 60 days. At most one email a day.
func adsAlerts(ctx context.Context, s *Server) (map[string]any, error) {
	now := s.Now()
	var reasons []string

	var failed, total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*) FILTER (WHERE status = 'failed'), count(*) FROM conversion_uploads
		WHERE status <> 'skipped' AND updated_at > $1`, now.Add(-24*time.Hour)).Scan(&failed, &total); err != nil {
		return nil, err
	}
	if total > 0 && float64(failed)/float64(total) > alertFailureRate {
		reasons = append(reasons, fmt.Sprintf("%d de %d envios ao Google Ads falharam nas últimas 24 h.", failed, total))
	}

	if raw := s.jobState(ctx, "ads.campaigns"); raw != nil {
		var camp struct {
			D3 []ads.CampaignRow `json:"d3"`
		}
		var clicks int64
		if json.Unmarshal(raw, &camp) == nil {
			for _, c := range camp.D3 {
				clicks += c.Clicks
			}
		}
		var leads int
		if err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM leads WHERE clicked_at > $1`, now.Add(-alertNoLeadHours*time.Hour)).Scan(&leads); err != nil {
			return nil, err
		}
		if clicks > 0 && leads == 0 {
			reasons = append(reasons, fmt.Sprintf("Nenhum clique no botão do WhatsApp em %d h, mas o Google Ads registrou %d cliques em anúncios.", alertNoLeadHours, clicks))
		}
	}

	if raw := s.jobState(ctx, "ads.auth_error"); raw != nil {
		reasons = append(reasons, "O Google Ads recusou as credenciais: nenhum envio sai até corrigir (GADS_*).")
	}

	if now.Weekday() == time.Monday {
		var overdue int
		if err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM leads WHERE status = 'converted' AND payment_status IS NULL
			AND converted_at < $1`, now.AddDate(0, 0, -paymentOverdueDays)).Scan(&overdue); err != nil {
			return nil, err
		}
		if overdue > 0 {
			reasons = append(reasons, fmt.Sprintf("%d consulta(s) marcada(s) há mais de %d dias sem \"Pago\" ou \"Não pagou\" em /admin/leads.", overdue, paymentOverdueDays))
		}
	}

	out := map[string]any{"failed": failed, "total": total, "reasons": len(reasons)}
	if len(reasons) == 0 {
		return out, nil
	}
	today := now.In(time.FixedZone("-03:00", -3*60*60)).Format("2006-01-02")
	var last struct {
		Date string `json:"date"`
	}
	if raw := s.jobState(ctx, "ads.alerts.last"); raw != nil && json.Unmarshal(raw, &last) == nil && last.Date == today {
		out["skipped"] = "already sent today"
		return out, nil
	}
	to := techRecipients()
	if s.Mailer == nil || len(to) == 0 {
		out["skipped"] = "no mailer or tech recipient configured"
		out["pending"] = reasons
		return out, nil
	}
	var body strings.Builder
	body.WriteString("<p>Alertas do Google Ads (psicologojoaofernandes.com):</p><ul>")
	for _, r := range reasons {
		body.WriteString("<li>" + html.EscapeString(r) + "</li>")
	}
	body.WriteString("</ul><p>Veja /admin/funil e /admin/leads.</p>")
	msgs := make([]newsletter.Message, len(to))
	for i, addr := range to {
		msgs[i] = newsletter.Message{From: alertFrom, To: addr, Subject: "Alerta: conversões do Google Ads", HTML: body.String()}
	}
	if _, err := s.Mailer.SendBatch(ctx, "ads-alerts-"+today, msgs); err != nil {
		return out, err
	}
	if err := s.putJobState(ctx, "ads.alerts.last", map[string]any{"date": today, "reasons": reasons}); err != nil {
		return out, err
	}
	out["sent"] = len(to)
	return out, nil
}
