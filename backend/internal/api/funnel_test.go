package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/ads"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/newsletter"
)

const leadB = "22222222-2222-4222-8222-222222222222"

// adjUploader is a fakeUploader that also accepts adjustments.
type adjUploader struct {
	fakeUploader
	adjSent  []ads.Adjustment
	adjFails map[int]ads.Failure
}

func (f *adjUploader) Adjust(_ context.Context, a []ads.Adjustment) ads.Outcome {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.adjSent = append(f.adjSent, a...)
	return ads.Outcome{Failures: f.adjFails}
}

type recordingMailer struct {
	mu   sync.Mutex
	sent []newsletter.Message
}

func (m *recordingMailer) SendBatch(_ context.Context, _ string, msgs []newsletter.Message) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sent = append(m.sent, msgs...)
	return make([]string, len(msgs)), nil
}

func (e *testEnv) booked(tok, lead, body string) {
	e.t.Helper()
	if c := e.do("PATCH", "/api/v1/admin/leads/"+lead+"/status", body, tok).Code; c != 200 {
		e.t.Fatalf("converted: %d", c)
	}
}

func (e *testEnv) pay(tok, lead, body string) int {
	e.t.Helper()
	return e.do("PATCH", "/api/v1/admin/leads/"+lead+"/payment", body, tok).Code
}

func (e *testEnv) adjustment(lead string) (typ, status string, value *float64, ok bool) {
	err := e.srv.Pool.QueryRow(e.t.Context(), `SELECT adjustment_type, status, value::float8 FROM conversion_adjustments WHERE lead_id::text=$1`, lead).
		Scan(&typ, &status, &value)
	return typ, status, value, err == nil
}

// bookedAndUploaded leaves leadA booked at the default value (350) and accepted by Google.
func bookedAndUploaded(t *testing.T) (*testEnv, *adjUploader, *ads.Worker, string) {
	t.Helper()
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1","source":"hero_cta"}`, "")
	e.booked(tok, leadA, `{"status":"converted"}`)
	up := &adjUploader{}
	w := adsWorker(e, up)
	if _, err := w.UploadPending(t.Context()); err != nil {
		t.Fatal(err)
	}
	if uploadStatus(e, leadA, "appointment_booked") != "succeeded" {
		t.Fatal("booking not uploaded")
	}
	return e, up, w, tok
}

func TestPaidEnqueuesThePaymentActionWithValueTimeAndOrderID(t *testing.T) {
	e, up, w, tok := bookedAndUploaded(t)
	e.exec(`UPDATE leads SET clicked_at = '2026-11-23T09:02:00-03:00' WHERE id::text = $1`, leadA)
	paidAt := "2026-11-24T13:08:00-03:00"
	if c := e.pay(tok, leadA, `{"status":"paid","value":2300,"paidAt":"`+paidAt+`"}`); c != 200 {
		t.Fatalf("paid: %d", c)
	}
	if _, _, _, ok := e.adjustment(leadA); ok {
		t.Fatal("payment touched the booking")
	}
	up.sent = nil
	res, err := w.UploadPending(t.Context())
	if err != nil || res.Succeeded != 1 || len(up.sent) != 1 {
		t.Fatalf("res=%+v err=%v sent=%+v", res, err, up.sent)
	}
	c := up.sent[0]
	want, _ := time.Parse(time.RFC3339, paidAt)
	if c.Action != "ca/pay" || c.Gclid != "G1" || c.Value == nil || *c.Value != 2300 || !c.Time.Equal(want) || c.OrderID != leadA+"-pago" {
		t.Fatalf("sent %+v", c)
	}
	if uploadStatus(e, leadA, "payment_confirmed") != "succeeded" {
		t.Fatal("payment not recorded")
	}
	if c := e.pay(tok, leadA, `{"status":"paid","value":2300}`); c != 200 {
		t.Fatalf("paid again: %d", c)
	}
	if res, _ := w.UploadPending(t.Context()); res.Sent != 0 {
		t.Fatalf("resent a succeeded payment: %+v", res)
	}
}

func TestMarcadaCarriesNoPaymentValue(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	e.booked(tok, leadA, `{"status":"converted","value":500}`)
	if c := e.pay(tok, leadA, `{"status":"paid","value":420}`); c != 200 {
		t.Fatalf("paid: %d", c)
	}
	up := &adjUploader{}
	w := adsWorker(e, up)
	if _, err := w.UploadPending(t.Context()); err != nil {
		t.Fatal(err)
	}
	var booking, payment *ads.Conversion
	for i := range up.sent {
		switch up.sent[i].Action {
		case "ca/appt":
			booking = &up.sent[i]
		case "ca/pay":
			payment = &up.sent[i]
		}
	}
	if booking == nil || booking.Value != nil || booking.OrderID != leadA+":appointment_booked" {
		t.Fatalf("booking %+v", booking)
	}
	if payment == nil || payment.Value == nil || *payment.Value != 420 {
		t.Fatalf("payment %+v", payment)
	}
	if _, _, _, ok := e.adjustment(leadA); ok {
		t.Fatal("adjustment queued")
	}
}

func TestBraidLeadsSkipThePaymentAction(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gbraid":"GB1"}`, "")
	e.booked(tok, leadA, `{"status":"converted"}`)
	if c := e.pay(tok, leadA, `{"status":"paid","value":300}`); c != 200 {
		t.Fatalf("paid: %d", c)
	}
	var st, code string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT status, coalesce(last_error_code,'') FROM conversion_uploads WHERE lead_id::text=$1 AND stage='payment_confirmed'`, leadA).Scan(&st, &code)
	if st != "skipped" || code != ads.BraidNotPermitted {
		t.Fatalf("payment row %s %s", st, code)
	}
	up := &adjUploader{}
	if _, err := adsWorker(e, up).UploadPending(t.Context()); err != nil {
		t.Fatal(err)
	}
	for _, c := range up.sent {
		if c.Action == "ca/pay" {
			t.Fatalf("braid payment sent: %+v", c)
		}
	}
}

func TestPaymentWaitsWhileTheActionIsNotConfigured(t *testing.T) {
	e, _, _, tok := bookedAndUploaded(t)
	e.pay(tok, leadA, `{"status":"paid","value":100}`)
	up := &fakeUploader{}
	w := ads.NewWorker(e.srv.Pool, up, ads.Config{ActionClick: "ca/click", ActionAppointment: "ca/appt"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if res, _ := w.UploadPending(t.Context()); res.Sent != 0 || uploadStatus(e, leadA, "payment_confirmed") != "pending" {
		t.Fatalf("res=%+v", res)
	}
}

func TestPaymentBackfillIsIdempotent(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	gclid := "CjwKCAiA5Y_YBhBbEiwAK5Dl7cYzC0xDoBiEoVRf3TKzuFd72aT6d2qM2Px7NFR7Reze1PG2tZ5iiRoCEGUQAvD_BwE"
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"`+gclid+`"}`, "")
	e.do("POST", "/api/leads", `{"id":"`+leadB+`","wbraid":"WB1"}`, "")
	e.booked(tok, leadA, `{"status":"converted"}`)
	e.booked(tok, leadB, `{"status":"converted"}`)
	e.exec(`UPDATE leads SET payment_status = 'paid', paid_value = 2300, paid_at = NULL WHERE id::text = $1`, leadA)
	e.exec(`UPDATE leads SET payment_status = 'paid', paid_value = 500, paid_at = now() WHERE id::text = $1`, leadB)
	raw, err := os.ReadFile("../../migrations/0020_payment_conversion.sql")
	if err != nil {
		t.Fatal(err)
	}
	up := strings.SplitN(strings.SplitN(string(raw), "-- +goose Down", 2)[0], "-- +goose Up", 2)[1]
	for i := 0; i < 2; i++ {
		if _, err := e.srv.Pool.Exec(t.Context(), up); err != nil {
			t.Fatalf("run %d: %v", i, err)
		}
	}
	var n int
	var at time.Time
	var v float64
	var st string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) OVER (), conversion_time, value::float8, status FROM conversion_uploads WHERE lead_id::text=$1 AND stage='payment_confirmed'`, leadA).Scan(&n, &at, &v, &st)
	want, _ := time.Parse(time.RFC3339, "2026-11-24T13:08:00-03:00")
	if n != 1 || !at.Equal(want) || v != 2300 || st != "pending" {
		t.Fatalf("backfill %d %v %v %s", n, at, v, st)
	}
	var code string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT status, last_error_code FROM conversion_uploads WHERE lead_id::text=$1 AND stage='payment_confirmed'`, leadB).Scan(&st, &code)
	if st != "skipped" || code != ads.BraidNotPermitted {
		t.Fatalf("braid backfill %s %s", st, code)
	}
	var total int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*) FROM conversion_uploads WHERE stage='payment_confirmed'`).Scan(&total)
	if total != 2 {
		t.Fatalf("rows %d", total)
	}
}

func TestNotPaidRetractsAndAdjustmentWaitsForTheBooking(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	e.booked(tok, leadA, `{"status":"converted"}`)
	if c := e.pay(tok, leadA, `{"status":"not_paid"}`); c != 200 {
		t.Fatalf("not_paid: %d", c)
	}
	up := &adjUploader{}
	w := adsWorker(e, up)
	if res, _ := w.AdjustPending(t.Context()); res.Sent != 0 {
		t.Fatalf("adjusted before the booking was accepted: %+v", res)
	}
	if _, err := w.UploadPending(t.Context()); err != nil {
		t.Fatal(err)
	}
	if res, _ := w.AdjustPending(t.Context()); res.Succeeded != 1 || up.adjSent[0].Type != "RETRACTION" || up.adjSent[0].Value != nil {
		t.Fatalf("res=%+v sent=%+v", res, up.adjSent)
	}
	if st := uploadStatus(e, leadA, "payment_confirmed"); st != "" {
		t.Fatalf("payment row on not paid: %s", st)
	}
}

func TestPaymentNeedsABookedLeadAndAValue(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	if c := e.pay(tok, leadA, `{"status":"paid","value":100}`); c != 409 {
		t.Fatalf("unbooked lead: %d", c)
	}
	e.booked(tok, leadA, `{"status":"converted"}`)
	for _, bad := range []string{`{"status":"paid"}`, `{"status":"paid","value":-1}`, `{"status":"maybe"}`} {
		if c := e.pay(tok, leadA, bad); c != 400 {
			t.Errorf("%s => %d, want 400", bad, c)
		}
	}
}

func TestMessageCandidatesAndRegistration(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	at := time.Now().UTC().Truncate(time.Second)
	ins := func(id, gclid string, ago time.Duration) {
		e.exec(`INSERT INTO leads (id, gclid, clicked_at, source, page_url) VALUES ($1,$2,$3,'hero_cta','https://x/')`, id, nilIfEmpty(gclid), at.Add(-ago))
	}
	ins(leadA, "G1", 10*time.Minute)
	ins(leadB, "", 20*time.Minute)
	ins("33333333-3333-4333-8333-333333333333", "G3", 3*time.Hour) // outside the 30 min window
	q := "/api/v1/admin/leads/candidates?at=" + at.Format(time.RFC3339)
	var out struct {
		Candidates []leadCandidate `json:"candidates"`
	}
	rec := e.do("GET", q, "", tok)
	if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &out) != nil || len(out.Candidates) != 2 || out.Candidates[0].ID != leadA {
		t.Fatalf("candidates: %d %s", rec.Code, rec.Body.String())
	}
	if c := e.do("GET", "/api/v1/admin/leads/candidates?at=nope", "", tok).Code; c != 400 {
		t.Fatalf("bad time: %d", c)
	}

	msg := func(body string) int { return e.do("POST", "/api/v1/admin/messages", body, tok).Code }
	if c := msg(fmt.Sprintf(`{"at":%q,"leadId":%q}`, at.Format(time.RFC3339), leadA)); c != 200 {
		t.Fatalf("mark: %d", c)
	}
	if uploadStatus(e, leadA, "message_received") != "pending" {
		t.Fatal("message upload not queued")
	}
	var got time.Time
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT conversion_time FROM conversion_uploads WHERE lead_id::text=$1 AND stage='message_received'`, leadA).Scan(&got)
	if !got.Equal(at) {
		t.Fatalf("conversion time %v, want the message time %v", got, at)
	}
	if c := msg(fmt.Sprintf(`{"at":%q,"leadId":%q}`, at.Format(time.RFC3339), leadA)); c != 409 {
		t.Fatalf("marking twice: %d", c)
	}
	// A message before the click is impossible.
	if c := msg(fmt.Sprintf(`{"at":%q,"leadId":%q}`, at.Add(-time.Hour).Format(time.RFC3339), leadB)); c != 409 {
		t.Fatalf("message before click: %d", c)
	}
	if c := msg(fmt.Sprintf(`{"at":%q,"reason":"ambiguous","note":"dois cliques"}`, at.Format(time.RFC3339))); c != 200 {
		t.Fatalf("ambiguous: %d", c)
	}
	if c := msg(fmt.Sprintf(`{"at":%q}`, at.Format(time.RFC3339))); c != 400 {
		t.Fatalf("neither lead nor reason: %d", c)
	}
	var n, cands int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT count(*), coalesce(max(cardinality(candidate_ids)),0) FROM messages_unmatched`).Scan(&n, &cands)
	if n != 1 || cands != 1 { // only leadB is still unmarked inside the window
		t.Fatalf("unmatched rows=%d candidates=%d", n, cands)
	}
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func TestOptimizedStageLadder(t *testing.T) {
	for _, c := range []struct {
		in   funnelCounts
		want string
	}{
		{funnelCounts{ClicksAttr: 29}, ""},
		{funnelCounts{ClicksAttr: 30}, ads.StageClick},
		{funnelCounts{ClicksAttr: 80, MessagesAttr: 30}, ads.StageMessage},
		{funnelCounts{ClicksAttr: 80, MessagesAttr: 31, BookedAttr: 30}, ads.StageAppointment},
		{funnelCounts{ClicksAttr: 10, MessagesAttr: 40}, ""}, // deeper stages never skip a missing shallower one
	} {
		if got := optimizedStage(c.in); got != c.want {
			t.Errorf("%+v => %q, want %q", c.in, got, c.want)
		}
	}
}

func TestFunnelEndpointCountsAndPrimaryRoles(t *testing.T) {
	e := newTestEnv(t)
	clinical, tech := e.token(authn.RoleAdminClinical), e.token(authn.RoleAdminTech)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	e.do("POST", "/api/leads", `{"id":"`+leadB+`","source":"header"}`, "")
	e.booked(clinical, leadA, `{"status":"qualified"}`)
	e.booked(clinical, leadA, `{"status":"converted"}`)
	e.pay(clinical, leadA, `{"status":"paid","value":350}`)
	e.exec(`INSERT INTO messages_unmatched (message_at, reason) VALUES (now(), 'no_match')`)

	var out struct {
		Counts      funnelCounts `json:"counts"`
		Optimized   string       `json:"optimized"`
		CanSwitch   bool         `json:"canSwitch"`
		Overdue     []any        `json:"overduePayments"`
		ByCampaign  []any        `json:"byCampaign"`
		Primary     string       `json:"primary"`
		Threshold   int          `json:"threshold"`
		DaysSinceSw *int         `json:"daysSinceSwitch"`
	}
	rec := e.do("GET", "/api/v1/admin/ads/funnel", "", clinical)
	if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &out) != nil {
		t.Fatalf("funnel: %d %s", rec.Code, rec.Body.String())
	}
	c := out.Counts
	if c.Clicks != 2 || c.ClicksAttr != 1 || c.Messages != 1 || c.Booked != 1 || c.Paid != 1 || c.MessagesUnmatched != 1 ||
		out.Optimized != "" || !out.CanSwitch || out.Threshold != 30 {
		t.Fatalf("%+v %+v", c, out)
	}

	// Only the tech role records the primary stage, and it must be a known stage.
	put := func(tok, body string) int { return e.do("PUT", "/api/v1/admin/ads/primary", body, tok).Code }
	if c := put(clinical, `{"stage":"whatsapp_click"}`); c != 403 {
		t.Fatalf("clinical: %d", c)
	}
	if c := put(tech, `{"stage":"bogus"}`); c != 400 {
		t.Fatalf("bogus: %d", c)
	}
	if c := put(tech, `{"stage":"whatsapp_click"}`); c != 200 {
		t.Fatalf("tech: %d", c)
	}
	rec = e.do("GET", "/api/v1/admin/ads/funnel", "", tech)
	out.Primary, out.CanSwitch = "", true
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Primary != "whatsapp_click" || out.CanSwitch {
		t.Fatalf("primary=%q canSwitch=%v (rule 7: no switch within 21 days)", out.Primary, out.CanSwitch)
	}
}

func TestOverduePaymentsListsOldBookingsWithoutADecision(t *testing.T) {
	e := newTestEnv(t)
	e.exec(`INSERT INTO leads (id, gclid, clicked_at, status, converted_at) VALUES ($1,'G1', now() - interval '90 days', 'converted', now() - interval '70 days')`, leadA)
	e.exec(`INSERT INTO leads (id, gclid, clicked_at, status, converted_at) VALUES ($1,'G2', now() - interval '20 days', 'converted', now() - interval '10 days')`, leadB)
	var out struct {
		Overdue []struct {
			ID string `json:"id"`
		} `json:"overduePayments"`
	}
	rec := e.do("GET", "/api/v1/admin/ads/funnel", "", e.token(authn.RoleAdminClinical))
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.Overdue) != 1 || out.Overdue[0].ID != leadA {
		t.Fatalf("overdue: %s", rec.Body.String())
	}
}

func TestAlertsEmailTechAdminsOncePerDay(t *testing.T) {
	e := newTestEnv(t)
	t.Setenv("ADMIN_EMAILS", "joao@x.test,jonathas@x.test")
	t.Setenv("ADMIN_ROLES", "joao@x.test:clinical,jonathas@x.test:tech")
	mailer := &recordingMailer{}
	e.srv.Mailer = mailer
	run := func() map[string]any {
		out, err := jobs["ads.alerts"](t.Context(), e.srv)
		if err != nil {
			t.Fatal(err)
		}
		return out
	}

	// Healthy: 1 failure out of 20 recent uploads is 5 %.
	e.exec(`INSERT INTO leads (id, gclid, clicked_at) SELECT gen_random_uuid(), 'g'||i, now() FROM generate_series(1,20) i`)
	e.exec(`INSERT INTO conversion_uploads (lead_id, stage, conversion_time, status) SELECT id, 'whatsapp_click', now(), 'succeeded' FROM leads`)
	e.exec(`UPDATE conversion_uploads SET status = 'failed' WHERE lead_id = (SELECT id FROM leads LIMIT 1)`)
	if run(); len(mailer.sent) != 0 {
		t.Fatalf("alerted at 5 %% failures: %+v", mailer.sent)
	}

	// 4 of 20 is 20 %: email the tech admin only, and not twice on the same day.
	e.exec(`UPDATE conversion_uploads SET status = 'failed' WHERE lead_id IN (SELECT id FROM leads LIMIT 4)`)
	run()
	if len(mailer.sent) != 1 || mailer.sent[0].To != "jonathas@x.test" || !strings.Contains(mailer.sent[0].HTML, "4 de 20") {
		t.Fatalf("sent: %+v", mailer.sent)
	}
	if out := run(); len(mailer.sent) != 1 || out["skipped"] == nil {
		t.Fatalf("second run sent again: %+v", out)
	}
}

func TestAlertsNoLeadsWhileGoogleReportsClicks(t *testing.T) {
	e := newTestEnv(t)
	t.Setenv("ADMIN_EMAILS", "jonathas@x.test")
	t.Setenv("ADMIN_ROLES", "jonathas@x.test:tech")
	mailer := &recordingMailer{}
	e.srv.Mailer = mailer
	e.srv.putJobState(t.Context(), "ads.campaigns", map[string]any{"d3": []ads.CampaignRow{{Name: "c", Clicks: 12}}})
	if _, err := jobs["ads.alerts"](t.Context(), e.srv); err != nil {
		t.Fatal(err)
	}
	if len(mailer.sent) != 1 || !strings.Contains(mailer.sent[0].HTML, "12 cliques") {
		t.Fatalf("sent: %+v", mailer.sent)
	}
}
