package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"

	"github.com/Xnths/jvfd-cc/backend/internal/ads"
	"github.com/Xnths/jvfd-cc/backend/internal/authn"
)

type fakeUploader struct {
	mu    sync.Mutex
	sent  []ads.Conversion
	fails map[int]ads.Failure
	err   error
}

func (f *fakeUploader) Upload(_ context.Context, c []ads.Conversion) ads.Outcome {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, c...)
	if f.err != nil {
		return ads.Outcome{Err: f.err}
	}
	return ads.Outcome{Failures: f.fails}
}

func adsWorker(e *testEnv, up ads.Uploader) *ads.Worker {
	return ads.NewWorker(e.srv.Pool, up, ads.Config{ActionClick: "ca/click", ActionMessage: "ca/msg", ActionAppointment: "ca/appt"},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
}

const leadA = "11111111-1111-4111-8111-111111111111"

func uploadStatus(e *testEnv, lead, stage string) string {
	var s string
	_ = e.srv.Pool.QueryRow(e.t.Context(), `SELECT status FROM conversion_uploads WHERE lead_id::text=$1 AND stage=$2`, lead, stage).Scan(&s)
	return s
}

func TestLeadBeaconCreatesOneUploadAndIsIdempotent(t *testing.T) {
	e := newTestEnv(t)
	body := `{"id":"` + leadA + `","clicked_at":"` + e.srv.Now().UTC().Format("2006-01-02T15:04:05Z") + `","source":"hero_cta","page_url":"https://x/","gclid":"ABC-1","gbraid":"","utm_campaign":"c1"}`
	if c := e.do("POST", "/api/leads", body, "", "Content-Type", "text/plain").Code; c != 201 {
		t.Fatalf("first: %d", c)
	}
	if c := e.do("POST", "/api/leads", body, "").Code; c != 200 {
		t.Fatalf("repeat: %d", c)
	}
	var leads, ups int
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT (SELECT count(*) FROM leads), (SELECT count(*) FROM conversion_uploads)`).Scan(&leads, &ups)
	if leads != 1 || ups != 1 || uploadStatus(e, leadA, "whatsapp_click") != "pending" {
		t.Fatalf("leads=%d uploads=%d status=%s", leads, ups, uploadStatus(e, leadA, "whatsapp_click"))
	}
}

func TestLeadWithoutClickIDIsSkippedAndBadInputRejected(t *testing.T) {
	e := newTestEnv(t)
	if c := e.do("POST", "/api/leads", `{"id":"`+leadA+`","source":"header"}`, "").Code; c != 201 {
		t.Fatalf("organic click: %d", c)
	}
	if s := uploadStatus(e, leadA, "whatsapp_click"); s != "skipped" {
		t.Fatalf("status %s", s)
	}
	for _, bad := range []string{`{"id":"nope","gclid":"A"}`, `{"id":"` + leadA + `","gclid":"has space"}`,
		`{"id":"` + leadA + `","clicked_at":"2999-01-01T00:00:00Z"}`, `{"source":"x"}`} {
		if c := e.do("POST", "/api/leads", bad, "").Code; c != 400 {
			t.Errorf("%s => %d, want 400", bad, c)
		}
	}
}

func TestLegacyBeaconStillDedupesByGclid(t *testing.T) {
	e := newTestEnv(t)
	for i, want := range []int{201, 200} {
		if c := e.do("POST", "/api/leads", `{"gclid":"OLD1"}`, "").Code; c != want {
			t.Fatalf("legacy %d => %d", i, c)
		}
	}
}

func TestEdgeReplayKeepsClickTime(t *testing.T) {
	e := newTestEnv(t)
	at := e.srv.Now().Add(-3 * 60 * 60 * 1e9).UTC().Format("2006-01-02T15:04:05Z")
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","clicked_at":"`+at+`","gclid":"R1"}`, "")
	var ok bool
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT clicked_at < now() - interval '2 hours' FROM leads`).Scan(&ok)
	if !ok {
		t.Fatal("clicked_at should be the client time, not the insert time")
	}
}

func TestWorkerUploadsOnceAndRecordsOutcomes(t *testing.T) {
	e := newTestEnv(t)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	e.do("POST", "/api/leads", `{"id":"22222222-2222-4222-8222-222222222222","gclid":"G2"}`, "")
	up := &fakeUploader{fails: map[int]ads.Failure{1: {Code: "EXPIRED_CLICK", Message: "old"}}}
	w := adsWorker(e, up)
	res, err := w.UploadPending(t.Context())
	if err != nil || res.Sent != 2 || res.Succeeded != 1 || res.Failed != 1 {
		t.Fatalf("res=%+v err=%v", res, err)
	}
	if len(up.sent) != 2 || up.sent[0].OrderID != leadA+":whatsapp_click" || up.sent[0].Action != "ca/click" {
		t.Fatalf("sent: %+v", up.sent)
	}
	if res, _ = w.UploadPending(t.Context()); res.Sent != 0 {
		t.Fatalf("second pass resent %d", res.Sent)
	}
}

func TestWorkersNeverSendTheSameConversionTwice(t *testing.T) {
	e := newTestEnv(t)
	for i := 0; i < 20; i++ {
		id := fmt.Sprintf("33333333-3333-4333-8333-%012d", i)
		e.exec(`INSERT INTO leads (id, gclid, clicked_at) VALUES ($1, $2, now())`, id, "G"+id)
		e.exec(`INSERT INTO conversion_uploads (lead_id, stage, conversion_time, status) VALUES ($1,'whatsapp_click',now(),'pending')`, id)
	}
	up := &fakeUploader{}
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		w := adsWorker(e, up)
		w.Batch = 5
		wg.Add(1)
		go func() { defer wg.Done(); _, _ = w.UploadPending(context.Background()) }()
	}
	wg.Wait()
	seen := map[string]bool{}
	for _, c := range up.sent {
		if seen[c.OrderID] {
			t.Fatalf("%s sent twice", c.OrderID)
		}
		seen[c.OrderID] = true
	}
}

func TestAuthErrorLeavesRowsPending(t *testing.T) {
	e := newTestEnv(t)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1"}`, "")
	w := adsWorker(e, &fakeUploader{err: ads.ErrAuth})
	if _, err := w.UploadPending(t.Context()); err == nil {
		t.Fatal("auth error must surface")
	}
	if s := uploadStatus(e, leadA, "whatsapp_click"); s != "pending" {
		t.Fatalf("status %s", s)
	}
}

func TestStatusQueuesStagesWithEditableValue(t *testing.T) {
	e := newTestEnv(t)
	tok := e.token(authn.RoleAdminClinical)
	e.do("POST", "/api/leads", `{"id":"`+leadA+`","gclid":"G1","source":"service_page_avaliacao-neuropsicologica"}`, "")
	e.do("POST", "/api/leads", `{"id":"22222222-2222-4222-8222-222222222222","gclid":"G2","source":"hero_cta"}`, "")
	patch := func(id, body string) int {
		return e.do("PATCH", "/api/v1/admin/leads/"+id+"/status", body, tok).Code
	}
	if c := patch(leadA, `{"status":"qualified"}`); c != 200 {
		t.Fatalf("qualified: %d", c)
	}
	if uploadStatus(e, leadA, "message_received") != "pending" {
		t.Fatal("message_received not queued")
	}
	value := func(id string) float64 {
		var v float64
		_ = e.srv.Pool.QueryRow(t.Context(), `SELECT value::float8 FROM conversion_uploads WHERE lead_id::text=$1 AND stage='appointment_booked'`, id).Scan(&v)
		return v
	}
	patch(leadA, `{"status":"converted"}`)
	if v := value(leadA); v != 3000 {
		t.Fatalf("evaluation suggestion = %v", v)
	}
	patch("22222222-2222-4222-8222-222222222222", `{"status":"converted"}`)
	if v := value("22222222-2222-4222-8222-222222222222"); v != 350 {
		t.Fatalf("default suggestion = %v", v)
	}
	patch("22222222-2222-4222-8222-222222222222", `{"status":"converted","value":420.5}`)
	if v := value("22222222-2222-4222-8222-222222222222"); v != 420.5 {
		t.Fatalf("edited value = %v", v)
	}
	if c := patch(leadA, `{"status":"converted","value":-1}`); c != 400 {
		t.Fatalf("negative value: %d", c)
	}
	rec := e.do("GET", "/api/v1/admin/leads/export", "", tok)
	if !strings.Contains(rec.Body.String(), "G2,Consulta Marcada") || !strings.Contains(rec.Body.String(), ",420.5,BRL") ||
		!strings.Contains(rec.Body.String(), ",3000,BRL") {
		t.Fatalf("export: %s", rec.Body.String())
	}
}

func TestAvaliacaoPageMentionsInstallmentsWithoutPrice(t *testing.T) {
	e := newTestEnv(t)
	var body string
	_ = e.srv.Pool.QueryRow(t.Context(), `SELECT published_body::text FROM services s JOIN pages p ON p.id = s.page_id WHERE p.slug='avaliacao-neuropsicologica'`).Scan(&body)
	if !strings.Contains(body, "parcelado em até 6 vezes") || strings.Contains(body, "3000") || strings.Contains(body, "3.000") {
		t.Fatalf("avaliação body: installments=%v", strings.Contains(body, "parcelado"))
	}
}
