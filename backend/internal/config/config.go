// Package config loads service configuration from the environment.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
)

// Auth is the configuration of the auth server (cmd/auth).
type Auth struct {
	Addr               string
	DatabaseURL        string
	PublicBaseURL      string // e.g. https://psicologojoaofernandes.com (no trailing slash)
	AdminEmails        map[string]struct{}
	AdminRoles         map[string]string // email -> clinical|tech
	GoogleClientID     string
	GoogleClientSecret string
	RedirectURL        string
	JWTPrivateKeyFile  string
	JWTPreviousPubFile string // optional: previous public key kept in the JWKS during rotation
	Issuer             string
	Audience           string
	CookieSecret       string
	TrustProxy         bool // trust CF-Connecting-IP / X-Real-IP (set when behind nginx)
	IPHashSecret       string
	SecureCookies      bool
}

// Roles understood by the platform.
const (
	RoleClinical = "clinical"
	RoleTech     = "tech"
)

// LoadAuth reads and validates the auth server configuration.
func LoadAuth() (Auth, error) {
	base := strings.TrimRight(get("PUBLIC_BASE_URL", "http://localhost:3000"), "/")
	c := Auth{
		Addr:               get("AUTH_ADDR", ":8081"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		PublicBaseURL:      base,
		AdminEmails:        ParseEmails(os.Getenv("ADMIN_EMAILS")),
		AdminRoles:         ParseRoles(os.Getenv("ADMIN_ROLES")),
		GoogleClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		RedirectURL:        get("OAUTH_REDIRECT_URL", base+"/auth/google/callback"),
		JWTPrivateKeyFile:  os.Getenv("JWT_PRIVATE_KEY_FILE"),
		JWTPreviousPubFile: os.Getenv("JWT_PREVIOUS_PUBLIC_KEY_FILE"),
		Issuer:             get("JWT_ISSUER", base),
		Audience:           get("JWT_AUDIENCE", "clinic"),
		CookieSecret:       os.Getenv("COOKIE_SECRET"),
		TrustProxy:         os.Getenv("TRUST_PROXY") == "true",
		IPHashSecret:       os.Getenv("IP_HASH_SECRET"),
	}
	u, err := url.Parse(base)
	if err != nil || u.Host == "" {
		return c, fmt.Errorf("PUBLIC_BASE_URL %q is not a valid URL", base)
	}
	c.SecureCookies = u.Scheme == "https"

	var missing []string
	for k, v := range map[string]string{
		"DATABASE_URL":               c.DatabaseURL,
		"GOOGLE_OAUTH_CLIENT_ID":     c.GoogleClientID,
		"GOOGLE_OAUTH_CLIENT_SECRET": c.GoogleClientSecret,
		"JWT_PRIVATE_KEY_FILE":       c.JWTPrivateKeyFile,
		"COOKIE_SECRET":              c.CookieSecret,
		"IP_HASH_SECRET":             c.IPHashSecret,
	} {
		if v == "" {
			missing = append(missing, k)
		}
	}
	if len(c.AdminEmails) == 0 {
		missing = append(missing, "ADMIN_EMAILS")
	}
	if len(missing) > 0 {
		return c, fmt.Errorf("missing required environment: %s", strings.Join(missing, ", "))
	}
	if len(c.CookieSecret) < 32 {
		return c, errors.New("COOKIE_SECRET must be at least 32 characters")
	}
	return c, nil
}

// ParseEmails parses a comma separated list into a lowercase set.
func ParseEmails(s string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, e := range strings.Split(s, ",") {
		e = strings.ToLower(strings.TrimSpace(e))
		if e != "" {
			out[e] = struct{}{}
		}
	}
	return out
}

// ParseRoles parses "a@x.com:clinical,b@y.com:tech". Unknown roles are dropped, so
// anyone not listed gets the least privileged role (tech).
func ParseRoles(s string) map[string]string {
	out := map[string]string{}
	for _, pair := range strings.Split(s, ",") {
		email, role, ok := strings.Cut(strings.TrimSpace(pair), ":")
		if !ok {
			continue
		}
		email, role = strings.ToLower(strings.TrimSpace(email)), strings.TrimSpace(role)
		if role == RoleClinical || role == RoleTech {
			out[email] = role
		}
	}
	return out
}

func get(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// API is the configuration of the content/admin API (cmd/api).
type API struct {
	Addr             string
	DatabaseURL      string
	PublicBaseURL    string
	JWKSURL          string
	Issuer           string
	Audience         string
	TrustProxy       bool
	IPHashSecret     string
	MediaDir         string
	RevalidateURL    string // internal nginx server that proxies to the live Next.js colour
	RevalidateSecret string
	UnsubscribeKey   string
	TurnstileSecret  string
	ResendAPIKey     string
	IndexNowKey      string
	SecureCookies    bool
}

// LoadAPI reads and validates the API configuration.
func LoadAPI() (API, error) {
	base := strings.TrimRight(get("PUBLIC_BASE_URL", "http://localhost:3000"), "/")
	c := API{
		Addr:             get("API_ADDR", ":8080"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		PublicBaseURL:    base,
		JWKSURL:          get("JWKS_URL", get("AUTH_INTERNAL_URL", "http://clinic-auth:8081")+"/.well-known/jwks.json"),
		Issuer:           get("JWT_ISSUER", base),
		Audience:         get("JWT_AUDIENCE", "clinic"),
		TrustProxy:       os.Getenv("TRUST_PROXY") == "true",
		IPHashSecret:     os.Getenv("IP_HASH_SECRET"),
		MediaDir:         get("MEDIA_DIR", "/srv/media"),
		RevalidateURL:    get("REVALIDATE_URL", "http://clinic-nginx:8081/internal/revalidate"),
		RevalidateSecret: os.Getenv("REVALIDATE_SECRET"),
		UnsubscribeKey:   os.Getenv("UNSUBSCRIBE_SECRET"),
		TurnstileSecret:  os.Getenv("TURNSTILE_SECRET"),
		ResendAPIKey:     os.Getenv("RESEND_API_KEY"),
		IndexNowKey:      os.Getenv("INDEXNOW_KEY"),
	}
	c.SecureCookies = strings.HasPrefix(base, "https://")
	var missing []string
	for k, v := range map[string]string{
		"DATABASE_URL": c.DatabaseURL, "IP_HASH_SECRET": c.IPHashSecret, "UNSUBSCRIBE_SECRET": c.UnsubscribeKey,
	} {
		if v == "" {
			missing = append(missing, k)
		}
	}
	if len(missing) > 0 {
		return c, fmt.Errorf("missing required environment: %s", strings.Join(missing, ", "))
	}
	return c, nil
}
