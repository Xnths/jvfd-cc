// Package ads uploads offline click conversions (WhatsApp clicks and the stages after them) to Google Ads.
package ads

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Config comes from the environment; without the credentials the whole feature stays off.
type Config struct {
	DeveloperToken, ClientID, ClientSecret, RefreshToken string
	LoginCustomerID, CustomerID, APIVersion              string
	ActionClick, ActionMessage, ActionAppointment        string
	ValidateOnly                                         bool
}

// Enabled reports whether everything needed to upload is set.
func (c Config) Enabled() bool {
	return c.DeveloperToken != "" && c.ClientID != "" && c.ClientSecret != "" && c.RefreshToken != "" &&
		c.CustomerID != "" && c.APIVersion != "" && c.ActionClick != ""
}

func (c Config) action(stage string) string {
	switch stage {
	case StageMessage:
		return c.ActionMessage
	case StageAppointment:
		return c.ActionAppointment
	}
	return c.ActionClick
}

const (
	StageClick       = "whatsapp_click"
	StageMessage     = "message_received"
	StageAppointment = "appointment_booked"
)

// ErrAuth means OAuth or the developer token was rejected: retrying will not help until someone fixes the credentials.
var ErrAuth = errors.New("google ads authentication failed")

// Conversion is one click conversion to upload.
type Conversion struct {
	Gclid, Gbraid, Wbraid string
	Action                string
	Time                  time.Time
	Value                 *float64
	OrderID               string
}

// Failure is the partial-failure error Google returned for one conversion.
type Failure struct {
	Code, Message string
}

// Outcome holds, per conversion index, either nil (accepted) or the failure; Err is set when the whole request failed.
type Outcome struct {
	Failures map[int]Failure
	Raw      json.RawMessage
	Err      error
	// Transient is true when the whole request failed in a way worth retrying (5xx, 429, network).
	Transient bool
}

// Uploader is what the worker needs from the API; tests replace it.
type Uploader interface {
	Upload(ctx context.Context, convs []Conversion) Outcome
}

// Adjustment corrects a click conversion that was uploaded before: RESTATEMENT replaces its value, RETRACTION
// removes it. It is matched by order id (lead_id:appointment_booked), so no click id is sent.
type Adjustment struct {
	Type    string // RESTATEMENT | RETRACTION
	Action  string
	OrderID string
	Time    time.Time
	Value   *float64 // RESTATEMENT only
}

// Adjuster uploads conversion adjustments; tests replace it.
type Adjuster interface {
	Adjust(ctx context.Context, adjs []Adjustment) Outcome
}

// Client talks to the Google Ads REST API.
type Client struct {
	Cfg      Config
	HTTP     *http.Client
	Base     string // https://googleads.googleapis.com
	DMBase   string // https://datamanager.googleapis.com
	TokenURL string // https://oauth2.googleapis.com/token

	mu      sync.Mutex
	token   string
	expires time.Time
}

func NewClient(cfg Config) *Client {
	return &Client{Cfg: cfg, HTTP: &http.Client{Timeout: 30 * time.Second},
		Base: "https://googleads.googleapis.com", DMBase: "https://datamanager.googleapis.com", TokenURL: "https://oauth2.googleapis.com/token"}
}

var brt = time.FixedZone("-03:00", -3*60*60)

func (c *Client) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.expires.Add(-time.Minute)) {
		return c.token, nil
	}
	form := url.Values{"client_id": {c.Cfg.ClientID}, "client_secret": {c.Cfg.ClientSecret},
		"refresh_token": {c.Cfg.RefreshToken}, "grant_type": {"refresh_token"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return "", fmt.Errorf("%w: token endpoint %d", ErrAuth, resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token endpoint %d", resp.StatusCode)
	}
	var tok struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if json.Unmarshal(b, &tok) != nil || tok.AccessToken == "" {
		return "", errors.New("token endpoint returned no access_token")
	}
	c.token, c.expires = tok.AccessToken, time.Now().Add(time.Duration(tok.ExpiresIn)*time.Second)
	return c.token, nil
}

func (c *Client) post(ctx context.Context, path string, body any) (int, []byte, error) {
	tok, err := c.accessToken(ctx)
	if err != nil {
		return 0, nil, err
	}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/%s/customers/%s%s", c.Base, c.Cfg.APIVersion, c.Cfg.CustomerID, path), bytes.NewReader(raw))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("developer-token", c.Cfg.DeveloperToken)
	if c.Cfg.LoginCustomerID != "" {
		req.Header.Set("login-customer-id", c.Cfg.LoginCustomerID)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode, b, nil
}

// dmEvent is one Data Manager API event: the click id, the time, the value and the order id (transactionId).
type dmEvent struct {
	AdIdentifiers   map[string]string `json:"adIdentifiers"`
	EventTimestamp  string            `json:"eventTimestamp"`
	TransactionID   string            `json:"transactionId"`
	ConversionValue *float64          `json:"conversionValue,omitempty"`
	Currency        string            `json:"currency,omitempty"`
	EventSource     string            `json:"eventSource"`
}

// Upload sends the click conversions through the Data Manager API (Google Ads' UploadClickConversions is closed to
// new integrations). One request per conversion action. Ingestion is asynchronous: a 200 means "accepted for
// processing"; Google's own result per event shows up in the reconcile summary. If a batch is rejected as a whole
// (400), each event is sent alone so one bad click id does not sink the others.
func (c *Client) Upload(ctx context.Context, convs []Conversion) Outcome {
	out := Outcome{Failures: map[int]Failure{}}
	byAction := map[string][]int{}
	var order []string
	for i, v := range convs {
		if _, ok := byAction[v.Action]; !ok {
			order = append(order, v.Action)
		}
		byAction[v.Action] = append(byAction[v.Action], i)
	}
	for _, action := range order {
		idx := byAction[action]
		events := make([]dmEvent, len(idx))
		for k, i := range idx {
			events[k] = c.dmEvent(convs[i])
		}
		status, body, err := c.ingest(ctx, action, events)
		if status == http.StatusBadRequest && len(idx) > 1 {
			for k, i := range idx {
				st, bd, er := c.ingest(ctx, action, events[k:k+1])
				if o := c.outcome(st, bd, er); o.Err != nil {
					if o.Transient || errors.Is(o.Err, ErrAuth) {
						return o
					}
					out.Failures[i] = Failure{Code: dmReason(bd), Message: trim(bd, 300)}
				}
			}
			continue
		}
		o := c.outcome(status, body, err)
		if o.Err != nil {
			if o.Transient || errors.Is(o.Err, ErrAuth) {
				return o
			}
			for _, i := range idx {
				out.Failures[i] = Failure{Code: dmReason(body), Message: trim(body, 300)}
			}
			continue
		}
		out.Raw = o.Raw
	}
	return out
}

func (c *Client) dmEvent(v Conversion) dmEvent {
	e := dmEvent{AdIdentifiers: map[string]string{}, EventTimestamp: v.Time.In(brt).Format(time.RFC3339), TransactionID: v.OrderID, EventSource: "WEB"}
	switch {
	case v.Gclid != "":
		e.AdIdentifiers["gclid"] = v.Gclid
	case v.Gbraid != "":
		e.AdIdentifiers["gbraid"] = v.Gbraid
	default:
		e.AdIdentifiers["wbraid"] = v.Wbraid
	}
	if v.Value != nil {
		e.ConversionValue, e.Currency = v.Value, "BRL"
	}
	return e
}

// ingest posts events to events:ingest; the destination is the conversion action id (last segment of its resource name).
func (c *Client) ingest(ctx context.Context, action string, events []dmEvent) (int, []byte, error) {
	tok, err := c.accessToken(ctx)
	if err != nil {
		return 0, nil, err
	}
	dest := map[string]any{
		"operatingAccount":     map[string]string{"accountType": "GOOGLE_ADS", "accountId": c.Cfg.CustomerID},
		"productDestinationId": action[strings.LastIndex(action, "/")+1:],
	}
	if c.Cfg.LoginCustomerID != "" {
		dest["loginAccount"] = map[string]string{"accountType": "GOOGLE_ADS", "accountId": c.Cfg.LoginCustomerID}
	} else {
		dest["loginAccount"] = map[string]string{"accountType": "GOOGLE_ADS", "accountId": c.Cfg.CustomerID}
	}
	raw, _ := json.Marshal(map[string]any{"destinations": []any{dest}, "events": events, "validateOnly": c.Cfg.ValidateOnly})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.DMBase+"/v1/events:ingest", bytes.NewReader(raw))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode, b, nil
}

// dmReason extracts error.details[].reason (or error.status) from a Google error body.
func dmReason(body []byte) string {
	var r struct {
		Error struct {
			Status  string `json:"status"`
			Details []struct {
				Reason string `json:"reason"`
			} `json:"details"`
		} `json:"error"`
	}
	if json.Unmarshal(body, &r) != nil {
		return "UNKNOWN"
	}
	for _, d := range r.Error.Details {
		if d.Reason != "" {
			return d.Reason
		}
	}
	if r.Error.Status != "" {
		return r.Error.Status
	}
	return "UNKNOWN"
}

type conversionAdjustment struct {
	ConversionAction   string `json:"conversionAction"`
	AdjustmentType     string `json:"adjustmentType"`
	AdjustmentDateTime string `json:"adjustmentDateTime"`
	OrderID            string `json:"orderId"`
	RestatementValue   *struct {
		AdjustedValue float64 `json:"adjustedValue"`
		CurrencyCode  string  `json:"currencyCode"`
	} `json:"restatementValue,omitempty"`
}

// Adjust sends RESTATEMENT/RETRACTION adjustments with partial_failure, like Upload.
func (c *Client) Adjust(ctx context.Context, adjs []Adjustment) Outcome {
	items := make([]conversionAdjustment, len(adjs))
	for i, a := range adjs {
		it := conversionAdjustment{ConversionAction: a.Action, AdjustmentType: a.Type, OrderID: a.OrderID,
			AdjustmentDateTime: a.Time.In(brt).Format("2006-01-02 15:04:05-07:00")}
		if a.Type == "RESTATEMENT" && a.Value != nil {
			it.RestatementValue = &struct {
				AdjustedValue float64 `json:"adjustedValue"`
				CurrencyCode  string  `json:"currencyCode"`
			}{*a.Value, "BRL"}
		}
		items[i] = it
	}
	status, body, err := c.post(ctx, ":uploadConversionAdjustments", map[string]any{
		"conversionAdjustments": items, "partialFailure": true, "validateOnly": c.Cfg.ValidateOnly,
	})
	return c.outcome(status, body, err)
}

// outcome maps an HTTP result to an Outcome; shared by Upload and Adjust.
func (c *Client) outcome(status int, body []byte, err error) Outcome {
	switch {
	case errors.Is(err, ErrAuth):
		return Outcome{Err: err}
	case err != nil:
		return Outcome{Err: err, Transient: true}
	case status == http.StatusUnauthorized || status == http.StatusForbidden:
		return Outcome{Err: fmt.Errorf("%w: HTTP %d", ErrAuth, status), Raw: body}
	case status == http.StatusTooManyRequests || status >= 500:
		return Outcome{Err: fmt.Errorf("google ads HTTP %d", status), Raw: body, Transient: true}
	case status != http.StatusOK:
		return Outcome{Err: fmt.Errorf("google ads HTTP %d: %s", status, trim(body, 300)), Raw: body}
	}
	return Outcome{Failures: parseFailures(body), Raw: body}
}

func trim(b []byte, n int) string {
	if len(b) > n {
		b = b[:n]
	}
	return string(b)
}

// parseFailures reads partialFailureError.details[].errors[]: the index of the conversion is in the first
// fieldPathElement, the error code is the single value of errorCode.
func parseFailures(body []byte) map[int]Failure {
	var r struct {
		PartialFailureError *struct {
			Message string `json:"message"`
			Details []struct {
				Errors []struct {
					ErrorCode map[string]string `json:"errorCode"`
					Message   string            `json:"message"`
					Location  struct {
						FieldPathElements []struct {
							FieldName string `json:"fieldName"`
							Index     *int   `json:"index"`
						} `json:"fieldPathElements"`
					} `json:"location"`
				} `json:"errors"`
			} `json:"details"`
		} `json:"partialFailureError"`
	}
	out := map[int]Failure{}
	if json.Unmarshal(body, &r) != nil || r.PartialFailureError == nil {
		return out
	}
	for _, d := range r.PartialFailureError.Details {
		for _, e := range d.Errors {
			idx := -1
			for _, p := range e.Location.FieldPathElements {
				if p.Index != nil {
					idx = *p.Index
					break
				}
			}
			code := "UNKNOWN"
			for _, v := range e.ErrorCode {
				code = v
			}
			if idx >= 0 {
				out[idx] = Failure{Code: code, Message: e.Message}
			}
		}
	}
	if len(out) == 0 && r.PartialFailureError.Message != "" {
		out[-1] = Failure{Code: "UNKNOWN", Message: r.PartialFailureError.Message}
	}
	return out
}

// Summary runs the GAQL query Google exposes for offline uploads, for the reconcile job.
func (c *Client) Summary(ctx context.Context) (json.RawMessage, error) {
	q := `SELECT offline_conversion_upload_conversion_action_summary.conversion_action_name,
  offline_conversion_upload_conversion_action_summary.successful_event_count,
  offline_conversion_upload_conversion_action_summary.total_event_count,
  offline_conversion_upload_conversion_action_summary.pending_event_count,
  offline_conversion_upload_conversion_action_summary.last_upload_date_time
FROM offline_conversion_upload_conversion_action_summary`
	status, body, err := c.post(ctx, "/googleAds:search", map[string]string{"query": q})
	if err != nil {
		return nil, err
	}
	if status == http.StatusUnauthorized || status == http.StatusForbidden {
		return nil, fmt.Errorf("%w: HTTP %d", ErrAuth, status)
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("google ads HTTP %d: %s", status, trim(body, 300))
	}
	return body, nil
}

// CampaignRow is the impressions and clicks Google reports for one campaign.
type CampaignRow struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Impressions int64  `json:"impressions"`
	Clicks      int64  `json:"clicks"`
}

// CampaignMetrics returns impressions and clicks per campaign between two days, inclusive (the funnel's n_0 and n_1).
func (c *Client) CampaignMetrics(ctx context.Context, from, to time.Time) ([]CampaignRow, error) {
	q := fmt.Sprintf(`SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks FROM campaign
WHERE segments.date BETWEEN '%s' AND '%s' AND campaign.status != 'REMOVED'`,
		from.In(brt).Format("2006-01-02"), to.In(brt).Format("2006-01-02"))
	status, body, err := c.post(ctx, "/googleAds:search", map[string]string{"query": q})
	if err != nil {
		return nil, err
	}
	if status == http.StatusUnauthorized || status == http.StatusForbidden {
		return nil, fmt.Errorf("%w: HTTP %d", ErrAuth, status)
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("google ads HTTP %d: %s", status, trim(body, 300))
	}
	return parseCampaigns(body)
}

// parseCampaigns reads a googleAds:search response; Google serializes int64 metrics as strings.
func parseCampaigns(body []byte) ([]CampaignRow, error) {
	var r struct {
		Results []struct {
			Campaign struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"campaign"`
			Metrics struct {
				Impressions json.Number `json:"impressions"`
				Clicks      json.Number `json:"clicks"`
			} `json:"metrics"`
		} `json:"results"`
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.UseNumber()
	if err := dec.Decode(&r); err != nil {
		return nil, err
	}
	out := make([]CampaignRow, 0, len(r.Results))
	for _, x := range r.Results {
		imp, _ := strconv.ParseInt(x.Metrics.Impressions.String(), 10, 64)
		clk, _ := strconv.ParseInt(x.Metrics.Clicks.String(), 10, 64)
		out = append(out, CampaignRow{ID: x.Campaign.ID, Name: x.Campaign.Name, Impressions: imp, Clicks: clk})
	}
	return out, nil
}

// ConfigFromEnv reads the GADS_* variables.
func ConfigFromEnv(get func(string) string) Config {
	return Config{
		DeveloperToken: get("GADS_DEVELOPER_TOKEN"), ClientID: get("GADS_CLIENT_ID"), ClientSecret: get("GADS_CLIENT_SECRET"),
		RefreshToken: get("GADS_REFRESH_TOKEN"), LoginCustomerID: get("GADS_LOGIN_CUSTOMER_ID"), CustomerID: get("GADS_CUSTOMER_ID"),
		APIVersion: get("GADS_API_VERSION"), ActionClick: get("GADS_CA_WHATSAPP_CLICK"), ActionMessage: get("GADS_CA_MESSAGE_RECEIVED"),
		ActionAppointment: get("GADS_CA_APPOINTMENT_BOOKED"), ValidateOnly: get("GADS_VALIDATE_ONLY") == "true",
	}
}
