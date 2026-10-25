package api

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// HTTPNotifier asks the live Next.js colour to revalidate (through the internal nginx server)
// and pings IndexNow. Both run in the background with retries: a failure never fails the
// admin's save, and the 24h ISR fallback covers anything missed.
type HTTPNotifier struct {
	RevalidateURL string
	Secret        string
	IndexNowKey   string
	SiteURL       string
	Log           *slog.Logger
	Client        *http.Client
}

func (n *HTTPNotifier) client() *http.Client {
	if n.Client != nil {
		return n.Client
	}
	return &http.Client{Timeout: 10 * time.Second}
}

// Revalidate implements Notifier.
func (n *HTTPNotifier) Revalidate(_ context.Context, tags, paths []string, all bool) {
	if n.RevalidateURL == "" || n.Secret == "" {
		return
	}
	body, _ := json.Marshal(map[string]any{"tags": tags, "paths": paths, "all": all})
	go func() {
		backoff := time.Second
		for attempt := 1; attempt <= 4; attempt++ {
			ts := strconv.FormatInt(time.Now().Unix(), 10)
			req, _ := http.NewRequest(http.MethodPost, n.RevalidateURL, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Timestamp", ts)
			req.Header.Set("X-Signature", "sha256="+Sign(n.Secret, ts, body))
			resp, err := n.client().Do(req)
			if err == nil {
				resp.Body.Close()
				if resp.StatusCode < 300 {
					return
				}
			}
			if n.Log != nil {
				n.Log.Warn("revalidate failed", "attempt", attempt, "err", err)
			}
			time.Sleep(backoff)
			backoff *= 3
		}
	}()
}

// Sign computes the HMAC the Next.js route verifies: sha256(secret, "<ts>.<body>").
func Sign(secret, ts string, body []byte) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(ts + "."))
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

// IndexNow implements Notifier.
func (n *HTTPNotifier) IndexNow(_ context.Context, paths []string) {
	if n.IndexNowKey == "" || len(paths) == 0 {
		return
	}
	u, err := url.Parse(n.SiteURL)
	if err != nil || u.Host == "" || u.Scheme != "https" { // only ping for the real, public site
		return
	}
	list := make([]string, 0, len(paths))
	for _, p := range paths {
		list = append(list, n.SiteURL+p)
	}
	body, _ := json.Marshal(map[string]any{
		"host": u.Host, "key": n.IndexNowKey, "keyLocation": n.SiteURL + "/" + n.IndexNowKey + ".txt", "urlList": list,
	})
	go func() {
		resp, err := n.client().Post("https://api.indexnow.org/indexnow", "application/json; charset=utf-8", bytes.NewReader(body))
		if err != nil {
			if n.Log != nil {
				n.Log.Warn("indexnow failed", "err", err)
			}
			return
		}
		resp.Body.Close()
	}()
}
