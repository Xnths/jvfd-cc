// Package seo reads Search Console data and turns it into content suggestions.
package seo

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// Row is one Search Console result row (date × page × query).
type Row struct {
	Date        time.Time
	Page        string
	Query       string
	Clicks      int
	Impressions int
	CTR         float64
	Position    float64
}

// Client fetches Search Analytics rows. The interface lets tests run without the network.
type Client interface {
	// Query returns every row between start and end (inclusive), paging internally.
	Query(ctx context.Context, start, end time.Time) ([]Row, error)
}

// ErrNotConfigured means no Search Console credentials were provided; jobs skip instead of failing.
var ErrNotConfigured = errors.New("search console is not configured")

type serviceAccount struct {
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
	TokenURI    string `json:"token_uri"`
}

// APIClient talks to the Search Console API with a service account (JWT bearer grant, no extra dependencies).
type APIClient struct {
	Site       string // property as shown in Search Console: "sc-domain:example.com" or "https://example.com/"
	HTTP       *http.Client
	Base       string // override in tests
	sa         serviceAccount
	key        *rsa.PrivateKey
	mu         sync.Mutex
	token      string
	tokenUntil time.Time
}

// NewAPIClient reads the service-account JSON at path. It returns ErrNotConfigured when path or site is empty.
func NewAPIClient(path, site string) (*APIClient, error) {
	if path == "" || site == "" {
		return nil, ErrNotConfigured
	}
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNotConfigured // the secrets folder exists, the key has not been added yet
	}
	if err != nil {
		return nil, fmt.Errorf("read credentials: %w", err)
	}
	var sa serviceAccount
	if err := json.Unmarshal(b, &sa); err != nil || sa.ClientEmail == "" || sa.PrivateKey == "" {
		return nil, errors.New("credentials file is not a service-account key")
	}
	block, _ := pem.Decode([]byte(sa.PrivateKey))
	if block == nil {
		return nil, errors.New("credentials: private key is not PEM")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("credentials: not an RSA key")
	}
	if sa.TokenURI == "" {
		sa.TokenURI = "https://oauth2.googleapis.com/token"
	}
	return &APIClient{Site: site, HTTP: &http.Client{Timeout: 60 * time.Second}, Base: "https://searchconsole.googleapis.com", sa: sa, key: key}, nil
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func (c *APIClient) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.tokenUntil.Add(-time.Minute)) {
		return c.token, nil
	}
	now := time.Now()
	hdr, _ := json.Marshal(map[string]string{"alg": "RS256", "typ": "JWT"})
	claims, _ := json.Marshal(map[string]any{
		"iss": c.sa.ClientEmail, "scope": "https://www.googleapis.com/auth/webmasters.readonly",
		"aud": c.sa.TokenURI, "iat": now.Unix(), "exp": now.Add(time.Hour).Unix(),
	})
	signing := b64(hdr) + "." + b64(claims)
	sum := sha256.Sum256([]byte(signing))
	sig, err := rsa.SignPKCS1v15(rand.Reader, c.key, crypto.SHA256, sum[:])
	if err != nil {
		return "", err
	}
	form := url.Values{"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"}, "assertion": {signing + "." + b64(sig)}}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, c.sa.TokenURI, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("token endpoint: %d %s", resp.StatusCode, truncate(string(body), 200))
	}
	var tok struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tok); err != nil || tok.AccessToken == "" {
		return "", errors.New("token endpoint returned no token")
	}
	c.token, c.tokenUntil = tok.AccessToken, now.Add(time.Duration(tok.ExpiresIn)*time.Second)
	return c.token, nil
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// Query pages through searchAnalytics/query (25,000 rows per page).
func (c *APIClient) Query(ctx context.Context, start, end time.Time) ([]Row, error) {
	tok, err := c.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	const pageSize = 25000
	var out []Row
	for startRow := 0; ; startRow += pageSize {
		payload, _ := json.Marshal(map[string]any{
			"startDate": start.Format("2006-01-02"), "endDate": end.Format("2006-01-02"),
			"dimensions": []string{"date", "page", "query"}, "rowLimit": pageSize, "startRow": startRow, "dataState": "final",
		})
		u := fmt.Sprintf("%s/webmasters/v3/sites/%s/searchAnalytics/query", c.Base, url.PathEscape(c.Site))
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+tok)
		req.Header.Set("Content-Type", "application/json")
		resp, err := c.HTTP.Do(req)
		if err != nil {
			return nil, err
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
		resp.Body.Close()
		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("search analytics: %d %s", resp.StatusCode, truncate(string(body), 300))
		}
		var res struct {
			Rows []struct {
				Keys        []string `json:"keys"`
				Clicks      float64  `json:"clicks"`
				Impressions float64  `json:"impressions"`
				CTR         float64  `json:"ctr"`
				Position    float64  `json:"position"`
			} `json:"rows"`
		}
		if err := json.Unmarshal(body, &res); err != nil {
			return nil, err
		}
		for _, r := range res.Rows {
			if len(r.Keys) != 3 {
				continue
			}
			d, err := time.Parse("2006-01-02", r.Keys[0])
			if err != nil {
				continue
			}
			out = append(out, Row{Date: d, Page: r.Keys[1], Query: r.Keys[2], Clicks: int(r.Clicks), Impressions: int(r.Impressions), CTR: r.CTR, Position: r.Position})
		}
		if len(res.Rows) < pageSize {
			return out, nil
		}
	}
}
