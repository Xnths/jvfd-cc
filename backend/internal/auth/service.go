package auth

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/authn"
	"github.com/Xnths/jvfd-cc/backend/internal/config"
	"github.com/google/uuid"
)

// Token lifetimes.
const (
	AccessTTL      = 15 * time.Minute
	RefreshTTL     = 30 * 24 * time.Hour
	ServiceTTL     = 10 * time.Minute
	OAuthStateTTL  = 10 * time.Minute
	RotationGrace  = 30 * time.Second // concurrent tabs may present the just-rotated token
	defaultReturn  = "/admin"
	AccessCookie   = "clinic_at"
	RefreshCookie  = "clinic_rt"
	OAuthCookie    = "clinic_oauth"
	AdminHintCache = "clinic_admin"
)

// Errors surfaced to handlers.
var (
	ErrNotAllowed   = errors.New("email not allowed")
	ErrUnverified   = errors.New("email not verified")
	ErrBadState     = errors.New("invalid oauth state")
	ErrInvalidToken = errors.New("invalid refresh token")
	ErrReuse        = errors.New("refresh token reuse detected")
)

// Service holds the login and session logic.
type Service struct {
	Cfg      config.Auth
	Store    Store
	Provider Provider
	Signer   *authn.Signer
	Sealer   *Sealer
	Now      func() time.Time
}

type oauthState struct {
	State    string `json:"s"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
	Return   string `json:"r"`
	Exp      int64  `json:"e"`
}

// Tokens is the result of a successful login or refresh. Refresh is empty when the call fell
// inside the rotation grace window (the browser already holds the successor cookie).
type Tokens struct {
	Access     string
	AccessExp  time.Time
	Refresh    string
	RefreshExp time.Time
	Admin      Admin
}

// SafeReturn only allows same-site relative paths, which prevents open redirects.
func SafeReturn(p string) string {
	if p == "" || p[0] != '/' || strings.HasPrefix(p, "//") || strings.Contains(p, "\\") ||
		strings.ContainsAny(p, "\r\n") {
		return defaultReturn
	}
	return p
}

// Allowed reports whether an email is on the admin allowlist.
func (s *Service) Allowed(email string) bool {
	_, ok := s.Cfg.AdminEmails[strings.ToLower(strings.TrimSpace(email))]
	return ok
}

// RoleFor returns the configured role; unlisted admins get the least privileged one.
func (s *Service) RoleFor(email string) string {
	if r, ok := s.Cfg.AdminRoles[strings.ToLower(email)]; ok {
		return r
	}
	return config.RoleTech
}

// StartLogin prepares the redirect to Google and the sealed state cookie value.
func (s *Service) StartLogin(returnPath string) (redirect, sealedCookie string) {
	st := oauthState{
		State: RandomToken(24), Nonce: RandomToken(24), Verifier: RandomToken(48),
		Return: SafeReturn(returnPath), Exp: s.Now().Add(OAuthStateTTL).Unix(),
	}
	b, _ := json.Marshal(st)
	return s.Provider.AuthURL(st.State, st.Nonce, PKCEChallenge(st.Verifier)), s.Sealer.Seal(b)
}

// FinishLogin completes the OAuth callback.
func (s *Service) FinishLogin(ctx context.Context, sealedCookie, state, code, ipHash, ua string) (Tokens, string, error) {
	raw, err := s.Sealer.Open(sealedCookie)
	if err != nil {
		return Tokens{}, "", ErrBadState
	}
	var st oauthState
	if json.Unmarshal(raw, &st) != nil || st.Exp < s.Now().Unix() || state == "" || state != st.State {
		return Tokens{}, "", ErrBadState
	}
	id, err := s.Provider.Exchange(ctx, code, st.Verifier, st.Nonce)
	if err != nil {
		return Tokens{}, "", err
	}
	if !id.EmailVerified {
		_ = s.Store.Audit(ctx, "public", "", "login.unverified", "", "", ipHash, nil)
		return Tokens{}, "", ErrUnverified
	}
	email := strings.ToLower(strings.TrimSpace(id.Email))
	if !s.Allowed(email) {
		_ = s.Store.Audit(ctx, "public", "", "login.denied", "", "", ipHash, map[string]any{"email_hash": ipHashOf(s.Cfg.IPHashSecret, email)})
		return Tokens{}, "", ErrNotAllowed
	}
	var tok Tokens
	err = s.Store.Do(ctx, func(tx Tx) error {
		admin, err := tx.UpsertAdmin(ctx, Admin{
			Email: email, GoogleSub: id.Sub, Name: id.Name, Picture: id.Picture, Role: s.RoleFor(email),
		})
		if err != nil {
			return err
		}
		tok, err = s.newSession(ctx, tx, admin, uuid.NewString(), "", ipHash, ua)
		return err
	})
	if err != nil {
		_ = s.Store.Audit(ctx, "public", "", "login.failed", "", "", ipHash, map[string]any{"reason": err.Error()})
		return Tokens{}, "", err
	}
	_ = s.Store.Audit(ctx, "admin", tok.Admin.ID, "login.ok", "admin_user", tok.Admin.ID, ipHash, nil)
	return tok, st.Return, nil
}

func (s *Service) newSession(ctx context.Context, tx Tx, a Admin, family, rotatedFrom, ipHash, ua string) (Tokens, error) {
	now := s.Now()
	refresh := RandomToken(32)
	sess := Session{
		ID: uuid.NewString(), AdminID: a.ID, FamilyID: family, Hash: HashToken(refresh), RotatedFrom: rotatedFrom,
		CreatedAt: now, ExpiresAt: now.Add(RefreshTTL), IPHash: ipHash, UserAgent: truncate(ua, 200),
	}
	if err := tx.InsertSession(ctx, sess); err != nil {
		return Tokens{}, err
	}
	access, err := s.accessToken(a, sess.ID)
	if err != nil {
		return Tokens{}, err
	}
	return Tokens{Access: access, AccessExp: now.Add(AccessTTL), Refresh: refresh, RefreshExp: sess.ExpiresAt, Admin: a}, nil
}

func (s *Service) accessToken(a Admin, sid string) (string, error) {
	return s.Signer.Sign(authn.Claims{Email: a.Email, Role: a.Role, SID: sid,
		RegisteredClaims: registered(a.ID)}, AccessTTL, s.Now())
}

// Refresh exchanges a refresh token for a new access token and (normally) a rotated refresh token.
// Presenting an already-rotated token outside the grace window revokes the whole family.
func (s *Service) Refresh(ctx context.Context, refreshToken, ipHash, ua string) (Tokens, error) {
	if refreshToken == "" {
		return Tokens{}, ErrInvalidToken
	}
	var tok Tokens
	var reuse bool
	err := s.Store.Do(ctx, func(tx Tx) error {
		now := s.Now()
		sess, err := tx.SessionByHashForUpdate(ctx, HashToken(refreshToken))
		if err != nil {
			return ErrInvalidToken
		}
		if sess.RevokedAt != nil || !sess.ExpiresAt.After(now) {
			return ErrInvalidToken
		}
		admin, err := tx.AdminByID(ctx, sess.AdminID)
		if err != nil {
			return ErrInvalidToken
		}
		// The allowlist and disabled flag are re-checked on every refresh, so removing an
		// email from ADMIN_EMAILS locks that person out within one access-token lifetime.
		if admin.Disabled || !s.Allowed(admin.Email) {
			_ = tx.RevokeFamily(ctx, sess.FamilyID, now)
			return ErrNotAllowed
		}
		admin.Role = s.RoleFor(admin.Email)
		if sess.RotatedAt != nil {
			if now.Sub(*sess.RotatedAt) <= RotationGrace {
				access, err := s.accessToken(admin, sess.ID)
				if err != nil {
					return err
				}
				tok = Tokens{Access: access, AccessExp: now.Add(AccessTTL), Admin: admin}
				return nil
			}
			reuse = true
			return tx.RevokeFamily(ctx, sess.FamilyID, now)
		}
		if err := tx.MarkRotated(ctx, sess.ID, now); err != nil {
			return err
		}
		tok, err = s.newSession(ctx, tx, admin, sess.FamilyID, sess.ID, ipHash, ua)
		return err
	})
	if err != nil {
		return Tokens{}, err
	}
	if reuse {
		_ = s.Store.Audit(ctx, "public", "", "refresh.reuse", "", "", ipHash, nil)
		return Tokens{}, ErrReuse
	}
	return tok, nil
}

// Logout revokes the session family of the presented refresh token.
func (s *Service) Logout(ctx context.Context, refreshToken string) {
	if refreshToken == "" {
		return
	}
	_ = s.Store.Do(ctx, func(tx Tx) error {
		sess, err := tx.SessionByHashForUpdate(ctx, HashToken(refreshToken))
		if err != nil {
			return nil
		}
		return tx.RevokeFamily(ctx, sess.FamilyID, s.Now())
	})
}

// ClientToken implements the client_credentials grant used by Airflow.
func (s *Service) ClientToken(ctx context.Context, clientID, secret string) (string, time.Time, error) {
	c, err := s.Store.ClientByID(ctx, clientID)
	// Always run the hash to keep timing flat for unknown ids.
	hash := c.SecretHash
	if err != nil || hash == "" {
		hash = dummyHash
	}
	ok := VerifySecret(secret, hash)
	if err != nil || !ok || c.Disabled {
		return "", time.Time{}, ErrInvalidToken
	}
	now := s.Now()
	tok, err := s.Signer.Sign(authn.Claims{Role: authn.RoleService, Scope: strings.Join(c.Scopes, " "),
		RegisteredClaims: registered("client:" + c.ID)}, ServiceTTL, now)
	return tok, now.Add(ServiceTTL), err
}

var dummyHash = HashSecret("dummy-secret-for-timing")

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
