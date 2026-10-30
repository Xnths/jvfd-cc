package ads

import (
	"testing"
	"time"
)

func TestClassify(t *testing.T) {
	now := time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC)
	w := &Worker{Now: func() time.Time { return now }}
	fail := func(code string) Outcome { return Outcome{Failures: map[int]Failure{0: {Code: code, Message: "m"}}} }
	cases := []struct {
		name     string
		r        row
		out      Outcome
		status   string
		wait     time.Duration
		wantCode string
	}{
		{"success", row{}, Outcome{Failures: map[int]Failure{}}, "succeeded", 0, ""},
		{"too recent click", row{}, fail("TOO_RECENT_CLICK"), "retry", time.Hour, "TOO_RECENT_CLICK"},
		{"too recent action", row{}, fail("TOO_RECENT_CONVERSION_ACTION"), "retry", time.Hour, "TOO_RECENT_CONVERSION_ACTION"},
		{"transient", row{attempts: 2}, fail("TRANSIENT_ERROR"), "retry", 8 * time.Minute, "TRANSIENT_ERROR"},
		{"transient capped", row{attempts: 8}, fail("INTERNAL_ERROR"), "retry", 6 * time.Hour, "INTERNAL_ERROR"},
		{"expired", row{}, fail("EXPIRED_CLICK"), "failed", 0, "EXPIRED_CLICK"},
		{"unparseable", row{}, fail("UNPARSEABLE_GCLID"), "failed", 0, "UNPARSEABLE_GCLID"},
		{"invalid action", row{}, fail("INVALID_CONVERSION_ACTION"), "failed", 0, "INVALID_CONVERSION_ACTION"},
		{"precedes click", row{}, fail("CONVERSION_PRECEDES_CLICK"), "failed", 0, "CONVERSION_PRECEDES_CLICK"},
		{"click not found, first try", row{attempts: 0}, fail("CLICK_NOT_FOUND"), "retry", time.Hour, "CLICK_NOT_FOUND"},
		{"click not found, third try", row{attempts: 2}, fail("CLICK_NOT_FOUND"), "failed", 0, "CLICK_NOT_FOUND"},
		{"duplicate order id counts as sent", row{}, fail("DUPLICATE_ORDER_ID"), "succeeded", 0, "DUPLICATE_ORDER_ID"},
		{"unknown", row{}, fail("SOMETHING_NEW"), "failed", 0, "SOMETHING_NEW"},
		{"tenth attempt fails", row{attempts: 9}, fail("TRANSIENT_ERROR"), "failed", 0, "TRANSIENT_ERROR"},
		{"request 5xx", row{}, Outcome{Err: errTest, Transient: true}, "retry", 2 * time.Minute, "REQUEST_ERROR"},
		{"request rejected", row{}, Outcome{Err: errTest}, "failed", 0, "REQUEST_REJECTED"},
	}
	for _, c := range cases {
		status, next, code, _ := w.classify(c.r, 0, c.out)
		if status != c.status || code != c.wantCode {
			t.Errorf("%s: got %s/%s, want %s/%s", c.name, status, code, c.status, c.wantCode)
		}
		if c.status == "retry" && next.Sub(now) != c.wait {
			t.Errorf("%s: wait %v, want %v", c.name, next.Sub(now), c.wait)
		}
	}
}

type testErr string

func (e testErr) Error() string { return string(e) }

const errTest = testErr("boom")

func TestParseFailures(t *testing.T) {
	body := []byte(`{"partialFailureError":{"message":"x","details":[{"errors":[
		{"errorCode":{"conversionUploadError":"TOO_RECENT_CLICK"},"message":"too recent","location":{"fieldPathElements":[{"fieldName":"conversions","index":1}]}}]}]}}`)
	f := parseFailures(body)
	if len(f) != 1 || f[1].Code != "TOO_RECENT_CLICK" {
		t.Fatalf("failures: %+v", f)
	}
	if len(parseFailures([]byte(`{"results":[{}]}`))) != 0 {
		t.Fatal("clean response must have no failures")
	}
}
