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

func TestUploadBodyAndPartialFailure(t *testing.T) {
	var got map[string]any
	c := fakeGoogle(t, 200, `{"partialFailureError":{"details":[{"errors":[{"errorCode":{"conversionUploadError":"EXPIRED_CLICK"},"message":"old","location":{"fieldPathElements":[{"fieldName":"conversions","index":1}]}}]}]}}`, &got)
	v := 350.0
	at := time.Date(2026, 10, 30, 15, 4, 5, 0, time.UTC)
	out := c.Upload(context.Background(), []Conversion{
		{Gclid: "G1", Action: "customers/123/conversionActions/1", Time: at, OrderID: "l:whatsapp_click"},
		{Gbraid: "B1", Action: "customers/123/conversionActions/3", Time: at, Value: &v, OrderID: "l:appointment_booked"},
	})
	if out.Err != nil || len(out.Failures) != 1 || out.Failures[1].Code != "EXPIRED_CLICK" {
		t.Fatalf("outcome: %+v", out)
	}
	convs := got["conversions"].([]any)
	first, second := convs[0].(map[string]any), convs[1].(map[string]any)
	if first["conversionDateTime"] != "2026-10-30 12:04:05-03:00" || first["gclid"] != "G1" || first["orderId"] != "l:whatsapp_click" {
		t.Errorf("first: %v", first)
	}
	if second["gbraid"] != "B1" || second["conversionValue"] != 350.0 || second["currencyCode"] != "BRL" || second["gclid"] != nil {
		t.Errorf("second: %v", second)
	}
	if got["partialFailure"] != true {
		t.Errorf("partialFailure not set: %v", got)
	}
}

func TestUploadErrorClasses(t *testing.T) {
	conv := []Conversion{{Gclid: "G", Time: time.Now()}}
	if out := fakeGoogle(t, 401, `{}`, nil).Upload(context.Background(), conv); !errors.Is(out.Err, ErrAuth) {
		t.Errorf("401: %+v", out)
	}
	if out := fakeGoogle(t, 503, `{}`, nil).Upload(context.Background(), conv); out.Err == nil || !out.Transient {
		t.Errorf("503: %+v", out)
	}
	if out := fakeGoogle(t, 400, `{"error":"bad"}`, nil).Upload(context.Background(), conv); out.Err == nil || out.Transient {
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
