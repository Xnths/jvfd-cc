package authn

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func setup(t *testing.T) (*Signer, *Verifier, time.Time) {
	t.Helper()
	priv, _, err := GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	s := NewSigner(priv, "iss", "aud")
	return s, s.Verifier(), time.Date(2026, 10, 25, 12, 0, 0, 0, time.UTC)
}

func TestRoundTripAndExpiry(t *testing.T) {
	s, v, now := setup(t)
	tok, err := s.Sign(Claims{Role: RoleAdminClinical, Email: "a@b.c", RegisteredClaims: jwt.RegisteredClaims{Subject: "u1"}}, time.Minute, now)
	if err != nil {
		t.Fatal(err)
	}
	c, err := v.Verify(tok, now.Add(30*time.Second))
	if err != nil || c.Subject != "u1" || !c.IsAdmin() {
		t.Fatalf("verify: %v %+v", err, c)
	}
	if _, err = v.Verify(tok, now.Add(2*time.Minute)); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestRejects(t *testing.T) {
	s, v, now := setup(t)
	good := Claims{Role: RoleAdminClinical, RegisteredClaims: jwt.RegisteredClaims{Subject: "u1"}}

	// wrong audience / issuer
	other := NewSigner(s.priv, "iss", "other-aud")
	tok, _ := other.Sign(good, time.Minute, now)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("wrong audience accepted")
	}
	other = NewSigner(s.priv, "evil", "aud")
	tok, _ = other.Sign(good, time.Minute, now)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("wrong issuer accepted")
	}

	// signed by an unknown key (same kid claimed)
	_, evilPriv, _ := ed25519.GenerateKey(rand.Reader)
	forged := NewSigner(evilPriv, "iss", "aud")
	forged.kid = s.kid
	tok, _ = forged.Sign(good, time.Minute, now)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("forged signature accepted")
	}

	// unknown kid
	forged.kid = "nope"
	tok, _ = forged.Sign(good, time.Minute, now)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("unknown kid accepted")
	}

	// alg=none
	none := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{Role: RoleAdminClinical, RegisteredClaims: jwt.RegisteredClaims{
		Subject: "u1", Issuer: "iss", Audience: jwt.ClaimStrings{"aud"}, ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour))}})
	none.Header["kid"] = s.kid
	tok, _ = none.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("alg none accepted")
	}

	// HS256 using the public key as the HMAC secret (key confusion)
	hs := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{Role: RoleAdminClinical, RegisteredClaims: jwt.RegisteredClaims{
		Subject: "u1", Issuer: "iss", Audience: jwt.ClaimStrings{"aud"}, ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour))}})
	hs.Header["kid"] = s.kid
	tok, _ = hs.SignedString([]byte(s.priv.Public().(ed25519.PublicKey)))
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("HS256 key confusion accepted")
	}

	// no expiry
	noexp := jwt.NewWithClaims(jwt.SigningMethodEdDSA, Claims{Role: RoleAdminClinical, RegisteredClaims: jwt.RegisteredClaims{
		Subject: "u1", Issuer: "iss", Audience: jwt.ClaimStrings{"aud"}}})
	noexp.Header["kid"] = s.kid
	tok, _ = noexp.SignedString(s.priv)
	if _, err := v.Verify(tok, now); err == nil {
		t.Error("token without exp accepted")
	}
}

func TestJWKSContainsPreviousKey(t *testing.T) {
	priv, _, _ := GenerateKey()
	prev, _, _ := ed25519.GenerateKey(rand.Reader)
	s := NewSigner(priv, "i", "a", prev)
	keys := s.JWKS()["keys"].([]map[string]string)
	if len(keys) != 2 || keys[0]["kid"] == keys[1]["kid"] {
		t.Fatalf("jwks keys: %+v", keys)
	}
}
