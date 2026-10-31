package ads

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func fakeGoogle(t *testing.T, status int, resp string, got *map[string]any) *Client {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/token"):
			_, _ = w.Write([]byte(`{"access_token":"at","expires_in":3600}`))
		default:
			if r.Header.Get("developer-token") != "dev" || r.Header.Get("login-customer-id") != "999" || r.Header.Get("Authorization") != "Bearer at" {
				t.Errorf("headers: %v", r.Header)
			}
			if got != nil {
				b, _ := io.ReadAll(r.Body)
				_ = json.Unmarshal(b, got)
			}
			w.WriteHeader(status)
			_, _ = w.Write([]byte(resp))
		}
	}))
	t.Cleanup(srv.Close)
	c := NewClient(Config{DeveloperToken: "dev", LoginCustomerID: "999", CustomerID: "123", APIVersion: "v21", ClientID: "i", ClientSecret: "s", RefreshToken: "r"})
	c.Base, c.TokenURL = srv.URL, srv.URL+"/token"
	return c
}

func fakeDataManager(t *testing.T, handler func(body map[string]any) (int, string)) *Client {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/token") {
			_, _ = w.Write([]byte(`{"access_token":"at","expires_in":3600}`))
			return
		}
		if r.URL.Path != "/v1/events:ingest" || r.Header.Get("Authorization") != "Bearer at" {
			t.Errorf("request: %s %v", r.URL.Path, r.Header)
		}
		var got map[string]any
		b, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(b, &got)
		st, resp := handler(got)
		w.WriteHeader(st)
		_, _ = w.Write([]byte(resp))
	}))
	t.Cleanup(srv.Close)
	c := NewClient(Config{CustomerID: "123", ClientID: "i", ClientSecret: "s", RefreshToken: "r"})
	c.DMBase, c.TokenURL = srv.URL, srv.URL+"/token"
	return c
}

func TestUploadBody(t *testing.T) {
	var bodies []map[string]any
	c := fakeDataManager(t, func(b map[string]any) (int, string) { bodies = append(bodies, b); return 200, `{"requestId":"x"}` })
	v := 350.0
	at := time.Date(2026, 10, 30, 15, 4, 5, 0, time.UTC)
	out := c.Upload(context.Background(), []Conversion{
		{Gclid: "G1", Action: "customers/123/conversionActions/1", Time: at, OrderID: "l:whatsapp_click"},
		{Gbraid: "B1", Action: "customers/123/conversionActions/3", Time: at, Value: &v, OrderID: "l:appointment_booked"},
	})
	if out.Err != nil || len(out.Failures) != 0 || len(bodies) != 2 {
		t.Fatalf("outcome: %+v bodies=%d", out, len(bodies))
	}
	d := bodies[0]["destinations"].([]any)[0].(map[string]any)
	if d["productDestinationId"] != "1" || d["operatingAccount"].(map[string]any)["accountId"] != "123" {
		t.Errorf("destination: %v", d)
	}
	first := bodies[0]["events"].([]any)[0].(map[string]any)
	if first["eventTimestamp"] != "2026-10-30T12:04:05-03:00" || first["transactionId"] != "l:whatsapp_click" ||
		first["adIdentifiers"].(map[string]any)["gclid"] != "G1" || first["conversionValue"] != nil {
		t.Errorf("first: %v", first)
	}
	second := bodies[1]["events"].([]any)[0].(map[string]any)
	if second["adIdentifiers"].(map[string]any)["gbraid"] != "B1" || second["conversionValue"] != 350.0 || second["currency"] != "BRL" {
		t.Errorf("second: %v", second)
	}
}

func TestUploadBadBatchIsSplit(t *testing.T) {
	c := fakeDataManager(t, func(b map[string]any) (int, string) {
		ev := b["events"].([]any)
		if len(ev) > 1 || ev[0].(map[string]any)["adIdentifiers"].(map[string]any)["gclid"] == "BAD" {
			return 400, `{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"INVALID_GCLID"}]}}`
		}
		return 200, `{}`
	})
	at := time.Now()
	out := c.Upload(context.Background(), []Conversion{
		{Gclid: "OK", Action: "customers/123/conversionActions/1", Time: at, OrderID: "a"},
		{Gclid: "BAD", Action: "customers/123/conversionActions/1", Time: at, OrderID: "b"},
	})
	if out.Err != nil || len(out.Failures) != 1 || out.Failures[1].Code != "INVALID_GCLID" {
		t.Fatalf("outcome: %+v", out)
	}
}

func TestUploadErrorClasses(t *testing.T) {
	conv := []Conversion{{Gclid: "G", Action: "customers/1/conversionActions/1", Time: time.Now()}}
	for st, check := range map[int]func(Outcome) bool{
		401: func(o Outcome) bool { return errors.Is(o.Err, ErrAuth) },
		503: func(o Outcome) bool { return o.Err != nil && o.Transient },
	} {
		c := fakeDataManager(t, func(map[string]any) (int, string) { return st, `{}` })
		if out := c.Upload(context.Background(), conv); !check(out) {
			t.Errorf("%d: %+v", st, out)
		}
	}
	c := fakeDataManager(t, func(map[string]any) (int, string) { return 400, `{"error":{"status":"INVALID_ARGUMENT"}}` })
	if out := c.Upload(context.Background(), conv); out.Err != nil || out.Failures[0].Code != "INVALID_ARGUMENT" {
		t.Errorf("400: %+v", out)
	}
}

func TestAdjustBodyRestatementAndRetraction(t *testing.T) {
	var got map[string]any
	c := fakeGoogle(t, 200, `{}`, &got)
	v := 400.0
	at := time.Date(2026, 10, 30, 15, 4, 5, 0, time.UTC)
	out := c.Adjust(t.Context(), []Adjustment{
		{Type: "RESTATEMENT", Action: "customers/123/conversionActions/9", OrderID: "L:appointment_booked", Time: at, Value: &v},
		{Type: "RETRACTION", Action: "customers/123/conversionActions/9", OrderID: "M:appointment_booked", Time: at},
	})
	if out.Err != nil || len(out.Failures) != 0 {
		t.Fatalf("outcome %+v", out)
	}
	items := got["conversionAdjustments"].([]any)
	first, second := items[0].(map[string]any), items[1].(map[string]any)
	rv := first["restatementValue"].(map[string]any)
	if first["adjustmentType"] != "RESTATEMENT" || first["orderId"] != "L:appointment_booked" || first["adjustmentDateTime"] != "2026-10-30 12:04:05-03:00" ||
		rv["adjustedValue"].(float64) != 400 || rv["currencyCode"] != "BRL" || got["partialFailure"] != true {
		t.Fatalf("restatement body %+v", first)
	}
	if second["adjustmentType"] != "RETRACTION" || second["restatementValue"] != nil {
		t.Fatalf("retraction body %+v", second)
	}
}

func TestParseCampaigns(t *testing.T) {
	rows, err := parseCampaigns([]byte(`{"results":[{"campaign":{"id":"7","name":"Avaliação"},"metrics":{"impressions":"12000","clicks":"340"}},
	  {"campaign":{"id":"8","name":"Sem métricas"},"metrics":{}}]}`))
	if err != nil || len(rows) != 2 || rows[0] != (CampaignRow{ID: "7", Name: "Avaliação", Impressions: 12000, Clicks: 340}) || rows[1].Clicks != 0 {
		t.Fatalf("rows=%+v err=%v", rows, err)
	}
}
