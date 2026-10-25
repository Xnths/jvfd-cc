// Package authn issues and verifies the platform's JWTs (EdDSA / Ed25519).
// The auth server signs; every other service verifies against the published JWKS.
package authn

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Roles and scopes carried in tokens.
const (
	RoleAdminClinical = "clinical"
	RoleAdminTech     = "tech"
	RoleService       = "service"
	ScopeJobs         = "jobs:run"
)

// Claims is the JWT payload. Admin tokens carry Email/Role/SID; service tokens carry Scope.
type Claims struct {
	Email string `json:"email,omitempty"`
	Role  string `json:"role"`
	SID   string `json:"sid,omitempty"`
	Scope string `json:"scope,omitempty"`
	jwt.RegisteredClaims
}

// IsAdmin reports whether the token belongs to a human admin.
func (c *Claims) IsAdmin() bool { return c.Role == RoleAdminClinical || c.Role == RoleAdminTech }

// KeyID derives a stable key id from a public key.
func KeyID(pub ed25519.PublicKey) string {
	sum := sha256.Sum256(pub)
	return base64.RawURLEncoding.EncodeToString(sum[:])[:16]
}

// Signer issues tokens.
type Signer struct {
	priv     ed25519.PrivateKey
	kid      string
	issuer   string
	audience string
	extra    []ed25519.PublicKey // previous keys, still published in the JWKS
}

// NewSigner builds a signer from a private key.
func NewSigner(priv ed25519.PrivateKey, issuer, audience string, previous ...ed25519.PublicKey) *Signer {
	pub := priv.Public().(ed25519.PublicKey)
	return &Signer{priv: priv, kid: KeyID(pub), issuer: issuer, audience: audience, extra: previous}
}

// Sign creates a token with the given lifetime. The jti is random.
func (s *Signer) Sign(c Claims, ttl time.Duration, now time.Time) (string, error) {
	jti := make([]byte, 12)
	if _, err := rand.Read(jti); err != nil {
		return "", err
	}
	c.RegisteredClaims = jwt.RegisteredClaims{
		Issuer:    s.issuer,
		Subject:   c.Subject,
		Audience:  jwt.ClaimStrings{s.audience},
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		ID:        base64.RawURLEncoding.EncodeToString(jti),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodEdDSA, c)
	t.Header["kid"] = s.kid
	return t.SignedString(s.priv)
}

// Verifier returns a verifier for this signer's own keys.
func (s *Signer) Verifier() *Verifier {
	v := NewVerifier(s.issuer, s.audience)
	v.SetKeys(map[string]ed25519.PublicKey{s.kid: s.priv.Public().(ed25519.PublicKey)})
	return v
}

// JWKS returns the public key set document.
func (s *Signer) JWKS() map[string]any {
	keys := []map[string]string{jwk(s.priv.Public().(ed25519.PublicKey))}
	for _, p := range s.extra {
		keys = append(keys, jwk(p))
	}
	return map[string]any{"keys": keys}
}

func jwk(pub ed25519.PublicKey) map[string]string {
	return map[string]string{
		"kty": "OKP", "crv": "Ed25519", "alg": "EdDSA", "use": "sig",
		"kid": KeyID(pub), "x": base64.RawURLEncoding.EncodeToString(pub),
	}
}

// Verifier validates tokens against a set of public keys, which can be refreshed from a JWKS URL.
type Verifier struct {
	issuer, audience string
	mu               sync.RWMutex
	keys             map[string]ed25519.PublicKey
	jwksURL          string
	client           *http.Client
	fetched          time.Time
}

// NewVerifier creates an empty verifier; call SetKeys or use NewRemoteVerifier.
func NewVerifier(issuer, audience string) *Verifier {
	return &Verifier{issuer: issuer, audience: audience, keys: map[string]ed25519.PublicKey{}}
}

// NewRemoteVerifier fetches keys from a JWKS URL on demand (and when an unknown kid appears).
func NewRemoteVerifier(jwksURL, issuer, audience string) *Verifier {
	v := NewVerifier(issuer, audience)
	v.jwksURL = jwksURL
	v.client = &http.Client{Timeout: 5 * time.Second}
	return v
}

// SetKeys replaces the key set.
func (v *Verifier) SetKeys(k map[string]ed25519.PublicKey) {
	v.mu.Lock()
	v.keys = k
	v.mu.Unlock()
}

var errUnknownKey = errors.New("unknown signing key")

func (v *Verifier) key(kid string) (ed25519.PublicKey, error) {
	v.mu.RLock()
	k, ok := v.keys[kid]
	stale := time.Since(v.fetched) > 30*time.Second
	v.mu.RUnlock()
	if ok {
		return k, nil
	}
	if v.jwksURL == "" || !stale { // refetch at most every 30s to avoid hammering on forged kids
		return nil, errUnknownKey
	}
	if err := v.refresh(); err != nil {
		return nil, err
	}
	v.mu.RLock()
	defer v.mu.RUnlock()
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, errUnknownKey
}

func (v *Verifier) refresh() error {
	resp, err := v.client.Get(v.jwksURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks: status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	var doc struct {
		Keys []struct {
			Kty, Crv, Kid, X string
		} `json:"keys"`
	}
	if err := json.Unmarshal(body, &doc); err != nil {
		return err
	}
	keys := map[string]ed25519.PublicKey{}
	for _, k := range doc.Keys {
		if k.Kty != "OKP" || k.Crv != "Ed25519" {
			continue
		}
		raw, err := base64.RawURLEncoding.DecodeString(k.X)
		if err != nil || len(raw) != ed25519.PublicKeySize {
			continue
		}
		keys[k.Kid] = ed25519.PublicKey(raw)
	}
	v.mu.Lock()
	v.keys, v.fetched = keys, time.Now()
	v.mu.Unlock()
	return nil
}

// Verify parses and validates a token. Only EdDSA is accepted, which rules out
// alg=none and HS256 key-confusion attacks.
func (v *Verifier) Verify(token string, now time.Time) (*Claims, error) {
	c := &Claims{}
	_, err := jwt.ParseWithClaims(token, c, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("missing kid")
		}
		return v.key(kid)
	},
		jwt.WithValidMethods([]string{"EdDSA"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(func() time.Time { return now }),
		jwt.WithLeeway(5*time.Second),
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// GenerateKey creates a new Ed25519 key and returns its PKCS#8 PEM.
func GenerateKey() (ed25519.PrivateKey, []byte, error) {
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	der, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		return nil, nil, err
	}
	return priv, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}), nil
}

// LoadPrivateKey reads a PKCS#8 PEM Ed25519 private key.
func LoadPrivateKey(path string) (ed25519.PrivateKey, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(raw)
	if block == nil {
		return nil, errors.New("no PEM block in key file")
	}
	k, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	priv, ok := k.(ed25519.PrivateKey)
	if !ok {
		return nil, errors.New("key is not Ed25519")
	}
	return priv, nil
}

// LoadPublicKey reads a PKIX PEM Ed25519 public key.
func LoadPublicKey(path string) (ed25519.PublicKey, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(raw)
	if block == nil {
		return nil, errors.New("no PEM block in key file")
	}
	k, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	pub, ok := k.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New("key is not Ed25519")
	}
	return pub, nil
}
