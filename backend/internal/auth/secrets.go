package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"strings"

	"golang.org/x/crypto/argon2"
)

// RandomToken returns n random bytes, base64url encoded.
func RandomToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err) // the OS entropy source failing is unrecoverable
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// HashToken returns the SHA-256 of an opaque token (refresh tokens are stored hashed).
func HashToken(t string) []byte {
	sum := sha256.Sum256([]byte(t))
	return sum[:]
}

// Sealer encrypts short-lived cookie payloads (the OAuth state) with AES-256-GCM.
type Sealer struct{ aead cipher.AEAD }

// NewSealer derives the key from the configured secret.
func NewSealer(secret string) (*Sealer, error) {
	key := sha256.Sum256([]byte("clinic-cookie-v1|" + secret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Sealer{aead}, nil
}

// Seal encrypts and base64url encodes data.
func (s *Sealer) Seal(plain []byte) string {
	nonce := make([]byte, s.aead.NonceSize())
	_, _ = rand.Read(nonce)
	return base64.RawURLEncoding.EncodeToString(s.aead.Seal(nonce, nonce, plain, nil))
}

// Open reverses Seal; it fails if the value was tampered with.
func (s *Sealer) Open(v string) ([]byte, error) {
	raw, err := base64.RawURLEncoding.DecodeString(v)
	if err != nil || len(raw) < s.aead.NonceSize() {
		return nil, errors.New("invalid sealed value")
	}
	n := s.aead.NonceSize()
	return s.aead.Open(nil, raw[:n], raw[n:], nil)
}

// PKCEChallenge computes the S256 code challenge for a verifier.
func PKCEChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// argon2id parameters for client secrets (machine secrets are high-entropy, so these are modest).
const (
	argonTime    = 2
	argonMemory  = 32 * 1024
	argonThreads = 2
	argonKeyLen  = 32
)

// HashSecret returns an encoded argon2id hash: argon2id$<salt>$<hash>.
func HashSecret(secret string) string {
	salt := make([]byte, 16)
	_, _ = rand.Read(salt)
	h := argon2.IDKey([]byte(secret), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return "argon2id$" + base64.RawStdEncoding.EncodeToString(salt) + "$" + base64.RawStdEncoding.EncodeToString(h)
}

// VerifySecret checks a secret against an encoded hash in constant time.
func VerifySecret(secret, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 3 || parts[0] != "argon2id" {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(parts[1])
	want, err2 := base64.RawStdEncoding.DecodeString(parts[2])
	if err1 != nil || err2 != nil {
		return false
	}
	got := argon2.IDKey([]byte(secret), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return subtle.ConstantTimeCompare(got, want) == 1
}
