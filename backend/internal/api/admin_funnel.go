package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Xnths/jvfd-cc/backend/internal/ads"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
)

// Funnel (Google Ads signal ladder): B = WhatsApp click, M = message received, Q = booked, P = paid.
const (
	funnelThreshold    = 30 // θ: conversions per 30 days Smart Bidding needs before a stage can be primary
	minSwitchDays      = 21 // rule 7: weeks between switches
	paymentOverdueDays = 60
)

func (s *Server) funnelRoutes(mux *http.ServeMux) {
	a := func(h http.HandlerFunc, roles ...string) http.Handler { return s.requireAdmin(h, roles...) }
	mux.Handle("GET /api/v1/admin/leads/candidates", a(s.adminLeadCandidates))
	mux.Handle("GET /api/v1/admin/messages", a(s.adminListMessages))
	mux.Handle("POST /api/v1/admin/messages", a(s.adminRegisterMessage))
	mux.Handle("PATCH /api/v1/admin/leads/{id}/payment", a(s.adminLeadPayment))
	mux.Handle("GET /api/v1/admin/ads/funnel", a(s.adminAdsFunnel))
	mux.Handle("PUT /api/v1/admin/ads/primary", a(s.adminSetPrimary, authn.RoleAdminTech))
}

// ── message matching (§4) ────────────────────────────────────────────────────

type leadCandidate struct {
	ID          string    `json:"id"`
	ClickedAt   time.Time `json:"clickedAt"`
	Status      string    `json:"status"`
	Source      string    `json:"source"`
	PageURL     string    `json:"pageUrl"`
	UTMSource   *string   `json:"utmSource"`
	UTMCampaign *string   `json:"utmCampaign"`
	HasClickID  bool      `json:"hasClickId"`
}

// candidatesFor lists the clicks in [at-window, at] that have no message yet: the leads a first message could belong to.
func (s *Server) candidatesFor(ctx context.Context, at time.Time, window time.Duration) ([]leadCandidate, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, clicked_at, status, source, page_url, utm_source, utm_campaign,
		gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL
		FROM leads WHERE clicked_at >= $1 AND clicked_at <= $2 AND message_at IS NULL AND status = 'clicked'
		ORDER BY clicked_at DESC LIMIT 50`, at.Add(-window), at)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []leadCandidate{}
	for rows.Next() {
		var c leadCandidate
		if err := rows.Scan(&c.ID, &c.ClickedAt, &c.Status, &c.Source, &c.PageURL, &c.UTMSource, &c.UTMCampaign, &c.HasClickID); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// messageWindow parses ?at= (RFC3339) and ?window= (minutes, default 30, max 240).
func (s *Server) messageWindow(at string, window string) (time.Time, time.Duration, bool) {
	t, err := time.Parse(time.RFC3339, at)
	if err != nil || t.After(s.Now().Add(5*time.Minute)) {
		return time.Time{}, 0, false
	}
	m, _ := strconv.Atoi(window)
	if m <= 0 || m > 240 {
		m = 30
	}
	return t, time.Duration(m) * time.Minute, true
}

func (s *Server) adminLeadCandidates(w http.ResponseWriter, r *http.Request) {
	at, win, ok := s.messageWindow(r.URL.Query().Get("at"), r.URL.Query().Get("window"))
	if !ok {
		badRequest(w, "Horário inválido.")
		return
	}
	c, err := s.candidatesFor(r.Context(), at, win)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	httpx.JSON(w, 200, map[string]any{"candidates": c})
}

// adminRegisterMessage records one first message from a new person: marked on a lead (uploads M with the message
// time) or stored as unmatched so n_3 still counts it.
func (s *Server) adminRegisterMessage(w http.ResponseWriter, r *http.Request) {
	var in struct {
		At     string `json:"at"`
		LeadID string `json:"leadId"`
		Reason string `json:"reason"` // no_match | ambiguous, when there is no leadId
		Note   string `json:"note"`
	}
	if !decode(w, r, &in, 2048) {
		return
	}
	at, win, ok := s.messageWindow(in.At, "")
	if !ok {
		badRequest(w, "Horário inválido.")
		return
	}
	if len(in.Note) > 500 {
		badRequest(w, "Observação muito longa.")
		return
	}
	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx)

	if in.LeadID != "" {
		var hasID bool
		err = tx.QueryRow(ctx, `UPDATE leads SET status = 'qualified', qualified_at = $2, message_at = $2
			WHERE id::text = $1 AND status = 'clicked' AND message_at IS NULL AND clicked_at <= $2
			RETURNING gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL`, in.LeadID, at).Scan(&hasID)
		if isNoRows(err) {
			httpx.Problem(w, http.StatusConflict, "Esse lead já tem mensagem registrada ou o clique é posterior ao horário.")
			return
		}
		if err == nil {
			err = insertUpload(ctx, tx, in.LeadID, ads.StageMessage, at, nil, hasID)
		}
		if err == nil {
			err = tx.Commit(ctx)
		}
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		s.Ads.Kick()
		s.audit(r, "lead.message", "lead", in.LeadID, map[string]any{"at": at})
		httpx.JSON(w, 200, map[string]any{"ok": true})
		return
	}

	if in.Reason != "no_match" && in.Reason != "ambiguous" {
		badRequest(w, "Informe o lead ou o motivo (sem correspondência / ambígua).")
		return
	}
	ids := []string{}
	if cands, err := s.candidatesFor(ctx, at, win); err == nil {
		for _, c := range cands {
			ids = append(ids, c.ID)
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO messages_unmatched (message_at, reason, candidate_ids, note, created_by)
		VALUES ($1,$2,$3::uuid[],$4,$5::uuid)`, at, in.Reason, ids, in.Note, s.actorID(r)); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "message.unmatched", "message", in.Reason, map[string]any{"at": at})
	httpx.JSON(w, 200, map[string]any{"ok": true})
}

func (s *Server) adminListMessages(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, message_at, reason, cardinality(candidate_ids), note
		FROM messages_unmatched ORDER BY message_at DESC LIMIT 50`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, reason, note string
		var at time.Time
		var n int
		if err := rows.Scan(&id, &at, &reason, &n, &note); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "messageAt": at, "reason": reason, "candidates": n, "note": note})
	}
	httpx.JSON(w, 200, map[string]any{"unmatched": out})
}

// ── payment: adjustments on the booking (§5.3) ───────────────────────────────

var errRetracted = errors.New("conversion already retracted")

// queueAdjustment (re)queues the single adjustment of a lead; the latest decision wins.
func queueAdjustment(ctx context.Context, tx pgx.Tx, leadID, typ string, value *float64, at time.Time) error {
	_, err := tx.Exec(ctx, `INSERT INTO conversion_adjustments (lead_id, adjustment_type, value, adjustment_time, status)
		VALUES ($1::uuid,$2,$3,$4,'pending')
		ON CONFLICT (lead_id) DO UPDATE SET adjustment_type = EXCLUDED.adjustment_type, value = EXCLUDED.value,
		  adjustment_time = EXCLUDED.adjustment_time, status = 'pending', attempts = 0, next_attempt_at = now(),
		  last_error_code = NULL, last_error_message = NULL, response = NULL, updated_at = now()`, leadID, typ, value, at)
	return err
}

// syncRestatement makes Google's value for the booking equal want. Before the booking has been accepted there is
// nothing to correct (the upload itself carries the stored value); a paid lead keeps its paid value.
func syncRestatement(ctx context.Context, tx pgx.Tx, leadID string, want float64, now time.Time) error {
	var upStatus string
	var upValue *float64
	var payStatus *string
	err := tx.QueryRow(ctx, `SELECT cu.status, cu.value::float8, l.payment_status
		FROM conversion_uploads cu JOIN leads l ON l.id = cu.lead_id
		WHERE cu.lead_id::text = $1 AND cu.stage = $2`, leadID, ads.StageAppointment).Scan(&upStatus, &upValue, &payStatus)
	if isNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if upStatus != "succeeded" || payStatus != nil {
		return nil
	}
	return restate(ctx, tx, leadID, upValue, want, now)
}

// restate compares want with the value Google has now (the uploaded one, or the last restated one).
func restate(ctx context.Context, tx pgx.Tx, leadID string, uploaded *float64, want float64, now time.Time) error {
	var adjType, adjStatus *string
	var adjValue *float64
	err := tx.QueryRow(ctx, `SELECT adjustment_type, status, value::float8 FROM conversion_adjustments WHERE lead_id::text = $1`, leadID).
		Scan(&adjType, &adjStatus, &adjValue)
	if err != nil && !isNoRows(err) {
		return err
	}
	have := uploaded
	if adjType != nil {
		switch {
		case *adjType == "RETRACTION" && *adjStatus == "succeeded":
			return errRetracted
		case *adjType == "RESTATEMENT" && *adjStatus == "succeeded":
			have = adjValue
		}
	}
	if have != nil && *have == want {
		// Google already has this value; drop a queued correction it never needed.
		_, err := tx.Exec(ctx, `DELETE FROM conversion_adjustments WHERE lead_id::text = $1 AND status IN ('pending','retry','failed')`, leadID)
		return err
	}
	return queueAdjustment(ctx, tx, leadID, "RESTATEMENT", &want, now)
}

func (s *Server) adminLeadPayment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string   `json:"status"` // paid | not_paid
		Value  *float64 `json:"value"`
		PaidAt *string  `json:"paidAt"`
	}
	if !decode(w, r, &in, 1024) {
		return
	}
	if in.Status != "paid" && in.Status != "not_paid" {
		badRequest(w, "Status inválido.")
		return
	}
	if in.Status == "paid" && (in.Value == nil || *in.Value < 0 || *in.Value > 100000) {
		badRequest(w, "Informe o valor pago.")
		return
	}
	var paidAt *time.Time
	if in.PaidAt != nil && *in.PaidAt != "" {
		t, err := time.Parse(time.RFC3339, *in.PaidAt)
		if err != nil {
			badRequest(w, "Data inválida.")
			return
		}
		paidAt = &t
	}
	ctx := r.Context()
	now := s.Now()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer tx.Rollback(ctx)

	var hasID bool
	var upStatus *string
	var upValue *float64
	err = tx.QueryRow(ctx, `SELECT l.gclid IS NOT NULL OR l.gbraid IS NOT NULL OR l.wbraid IS NOT NULL, cu.status, cu.value::float8
		FROM leads l LEFT JOIN conversion_uploads cu ON cu.lead_id = l.id AND cu.stage = $2
		WHERE l.id::text = $1 AND l.status = 'converted' FOR UPDATE OF l`, r.PathValue("id"), ads.StageAppointment).Scan(&hasID, &upStatus, &upValue)
	if isNoRows(err) {
		httpx.Problem(w, http.StatusConflict, "Só é possível registrar pagamento de consultas marcadas.")
		return
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}

	if in.Status == "paid" {
		_, err = tx.Exec(ctx, `UPDATE leads SET payment_status = 'paid', paid_value = $2, paid_at = coalesce($3, now()) WHERE id::text = $1`,
			r.PathValue("id"), in.Value, paidAt)
		// The booking row carries the stored value until Google has it; after that the paid amount is restated.
		if err == nil && hasID && upStatus != nil && *upStatus == "succeeded" {
			err = restate(ctx, tx, r.PathValue("id"), upValue, *in.Value, now)
		} else if err == nil && hasID && upStatus != nil {
			_, err = tx.Exec(ctx, `UPDATE conversion_uploads SET value = $3, updated_at = now() WHERE lead_id::text = $1 AND stage = $2 AND status <> 'succeeded'`,
				r.PathValue("id"), ads.StageAppointment, in.Value)
		}
	} else {
		_, err = tx.Exec(ctx, `UPDATE leads SET payment_status = 'not_paid', paid_value = NULL, paid_at = NULL WHERE id::text = $1`, r.PathValue("id"))
		if err == nil && hasID && upStatus != nil && *upStatus != "skipped" {
			err = queueAdjustment(ctx, tx, r.PathValue("id"), "RETRACTION", nil, now)
		}
	}
	if errors.Is(err, errRetracted) {
		httpx.Problem(w, http.StatusConflict, "A conversão já foi retirada do Google Ads e não pode ser corrigida.")
		return
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.Ads.Kick()
	s.audit(r, "lead.payment", "lead", r.PathValue("id"), map[string]any{"status": in.Status})
	httpx.JSON(w, 200, map[string]any{"ok": true})
}

// ── funnel dashboard (§7) ────────────────────────────────────────────────────

// primaryStage is the stage the Google Ads account optimizes for. It is a record kept by hand: changing it here
// changes nothing in Google.
type primaryState struct {
	Stage string    `json:"stage"`
	Since time.Time `json:"since"`
}

var stageOrder = []string{ads.StageClick, ads.StageMessage, ads.StageAppointment}

func (s *Server) adminSetPrimary(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Stage string `json:"stage"`
	}
	if !decode(w, r, &in, 256) {
		return
	}
	valid := false
	for _, st := range stageOrder {
		valid = valid || st == in.Stage
	}
	if !valid {
		badRequest(w, "Etapa inválida.")
		return
	}
	var cur primaryState
	if raw := s.jobState(r.Context(), "ads.primary"); raw != nil {
		_ = json.Unmarshal(raw, &cur)
	}
	if cur.Stage == in.Stage {
		httpx.JSON(w, 200, map[string]any{"ok": true})
		return
	}
	v, _ := json.Marshal(primaryState{Stage: in.Stage, Since: s.Now().UTC()})
	if _, err := s.Pool.Exec(r.Context(), `INSERT INTO job_state (key, value) VALUES ('ads.primary',$1)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, v); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "ads.primary", "ads", in.Stage, nil)
	httpx.JSON(w, 200, map[string]any{"ok": true})
}

func (s *Server) jobState(ctx context.Context, key string) json.RawMessage {
	var v json.RawMessage
	if err := s.Pool.QueryRow(ctx, `SELECT value FROM job_state WHERE key = $1`, key).Scan(&v); err != nil {
		return nil
	}
	return v
}

// funnelCounts are n_2..n_5 by event time inside the window. "Attributable" counts only leads with a click id,
// which is what Google sees; the plain counts include organic-looking leads for context.
type funnelCounts struct {
	Clicks, Messages, Booked, Paid                 int
	ClicksAttr, MessagesAttr, BookedAttr, PaidAttr int
	MessagesUnmatched                              int
}

func (s *Server) funnelCounts(ctx context.Context, days int, campaign *string) (funnelCounts, error) {
	var c funnelCounts
	since := s.Now().AddDate(0, 0, -days)
	err := s.Pool.QueryRow(ctx, `SELECT
		count(*) FILTER (WHERE clicked_at >= $1),
		count(*) FILTER (WHERE message_at >= $1),
		count(*) FILTER (WHERE converted_at >= $1),
		count(*) FILTER (WHERE paid_at >= $1 AND payment_status = 'paid'),
		count(*) FILTER (WHERE clicked_at >= $1 AND has_id),
		count(*) FILTER (WHERE message_at >= $1 AND has_id),
		count(*) FILTER (WHERE converted_at >= $1 AND has_id),
		count(*) FILTER (WHERE paid_at >= $1 AND payment_status = 'paid' AND has_id)
		FROM (SELECT clicked_at, message_at, converted_at, paid_at, payment_status, utm_campaign,
		  gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL AS has_id FROM leads) l
		WHERE $2::text IS NULL OR coalesce(l.utm_campaign, '') = $2`, since, campaign).
		Scan(&c.Clicks, &c.Messages, &c.Booked, &c.Paid, &c.ClicksAttr, &c.MessagesAttr, &c.BookedAttr, &c.PaidAttr)
	if err != nil {
		return c, err
	}
	if campaign == nil {
		err = s.Pool.QueryRow(ctx, `SELECT count(*) FROM messages_unmatched WHERE message_at >= $1`, since).Scan(&c.MessagesUnmatched)
	}
	return c, err
}

// optimizedStage is s*: the deepest of B, M, Q with at least θ attributable conversions in the window ("" below θ
// for B: no conversion-based bidding yet). Each stage needs the ones before it, so the ladder stops at the first gap.
func optimizedStage(c funnelCounts) string {
	best := ""
	for _, st := range []struct {
		name string
		n    int
	}{{ads.StageClick, c.ClicksAttr}, {ads.StageMessage, c.MessagesAttr}, {ads.StageAppointment, c.BookedAttr}} {
		if st.n < funnelThreshold {
			break
		}
		best = st.name
	}
	return best
}

func ratio(num, den int) *float64 {
	if den == 0 {
		return nil
	}
	v := float64(num) / float64(den)
	return &v
}

func (s *Server) adminAdsFunnel(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 || days > 365 {
		days = 30
	}
	c, err := s.funnelCounts(ctx, days, nil)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}

	var primary primaryState
	canSwitch, daysSince := true, (*int)(nil)
	if raw := s.jobState(ctx, "ads.primary"); raw != nil && json.Unmarshal(raw, &primary) == nil && !primary.Since.IsZero() {
		d := int(s.Now().Sub(primary.Since).Hours() / 24)
		daysSince, canSwitch = &d, d >= minSwitchDays
	}

	// Impressions and clicks come from the campaign cache the reconcile job keeps (n_0, n_1).
	var camp struct {
		At  time.Time         `json:"at"`
		D30 []ads.CampaignRow `json:"d30"`
	}
	if raw := s.jobState(ctx, "ads.campaigns"); raw != nil {
		_ = json.Unmarshal(raw, &camp)
	}
	var impressions, adClicks int64
	for _, row := range camp.D30 {
		impressions += row.Impressions
		adClicks += row.Clicks
	}

	// Per utm_campaign breakdown of the same counts.
	byCampaign := []map[string]any{}
	rows, err := s.Pool.Query(ctx, `SELECT coalesce(utm_campaign, ''), count(*) FILTER (WHERE clicked_at >= $1)
		FROM leads WHERE clicked_at >= $1 GROUP BY 1 ORDER BY 2 DESC LIMIT 20`, s.Now().AddDate(0, 0, -days))
	if err == nil {
		var names []string
		for rows.Next() {
			var name string
			var n int
			if rows.Scan(&name, &n) == nil {
				names = append(names, name)
			}
		}
		rows.Close()
		for _, name := range names {
			n := name
			cc, err := s.funnelCounts(ctx, days, &n)
			if err != nil {
				serverError(w, s.Log, r, err)
				return
			}
			byCampaign = append(byCampaign, map[string]any{"campaign": name, "clicks": cc.Clicks, "messages": cc.Messages,
				"booked": cc.Booked, "paid": cc.Paid})
		}
	}

	// Bookings with no payment decision after 60 days: candidates for "Pago" or "Não pagou" (never retracted automatically).
	overdue := []map[string]any{}
	orows, err := s.Pool.Query(ctx, `SELECT id::text, converted_at, source FROM leads
		WHERE status = 'converted' AND payment_status IS NULL AND converted_at < now() - make_interval(days => $1)
		ORDER BY converted_at LIMIT 50`, paymentOverdueDays)
	if err == nil {
		for orows.Next() {
			var id, source string
			var at time.Time
			if orows.Scan(&id, &at, &source) == nil {
				overdue = append(overdue, map[string]any{"id": id, "convertedAt": at, "source": source})
			}
		}
		orows.Close()
	}

	httpx.JSON(w, 200, map[string]any{
		"days": days, "threshold": funnelThreshold, "counts": c,
		"rates": map[string]any{
			"r0": ratio(int(adClicks), int(impressions)), "r1": ratio(c.Clicks, int(adClicks)),
			"r2": ratio(c.Messages+c.MessagesUnmatched, c.Clicks), "r3": ratio(c.BookedAttr, c.MessagesAttr), "r4": ratio(c.PaidAttr, c.BookedAttr),
		},
		"impressions": impressions, "adClicks": adClicks, "campaignsAt": camp.At, "googleCampaigns": camp.D30,
		"optimized": optimizedStage(c), "primary": primary.Stage, "primarySince": nullTime(primary.Since),
		"daysSinceSwitch": daysSince, "canSwitch": canSwitch, "minSwitchDays": minSwitchDays,
		"byCampaign": byCampaign, "overduePayments": overdue, "overdueDays": paymentOverdueDays,
	})
}

func nullTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
