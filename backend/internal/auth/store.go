// Package auth implements the Google-only login flow, sessions and token issuing.
package auth

import (
	"context"
	"errors"
	"time"
)

// Errors returned by stores and the service.
var (
	ErrNotFound    = errors.New("not found")
	ErrSubMismatch = errors.New("google account does not match the registered admin")
	ErrDisabled    = errors.New("admin disabled")
)

// Admin is a human administrator.
type Admin struct {
	ID        string
	Email     string
	GoogleSub string
	Name      string
	Picture   string
	Role      string
	Disabled  bool
}

// Session is a refresh-token record. Tokens are stored only as SHA-256 hashes.
type Session struct {
	ID          string
	AdminID     string
	FamilyID    string
	Hash        []byte
	RotatedFrom string
	CreatedAt   time.Time
	ExpiresAt   time.Time
	RotatedAt   *time.Time // set once the token has been exchanged for a successor
	RevokedAt   *time.Time
	IPHash      string
	UserAgent   string
}

// Client is a machine client (Airflow) for the client_credentials grant.
type Client struct {
	ID         string
	SecretHash string // argon2id encoded
	Scopes     []string
	Disabled   bool
}

// Tx is the set of operations that run atomically.
type Tx interface {
	// UpsertAdmin creates the admin or updates profile fields. It binds google_sub on first
	// login and returns ErrSubMismatch when a different Google account uses the same email.
	UpsertAdmin(ctx context.Context, a Admin) (Admin, error)
	AdminByID(ctx context.Context, id string) (Admin, error)
	// SessionByHashForUpdate locks the session row for the duration of the transaction.
	SessionByHashForUpdate(ctx context.Context, hash []byte) (Session, error)
	InsertSession(ctx context.Context, s Session) error
	MarkRotated(ctx context.Context, id string, at time.Time) error
	RevokeFamily(ctx context.Context, family string, at time.Time) error
	RevokeSession(ctx context.Context, id string, at time.Time) error
}

// Store persists auth state.
type Store interface {
	// Do runs fn in a transaction.
	Do(ctx context.Context, fn func(Tx) error) error
	AdminByID(ctx context.Context, id string) (Admin, error)
	SessionsForAdmin(ctx context.Context, adminID string, now time.Time) ([]Session, error)
	ClientByID(ctx context.Context, id string) (Client, error)
	Audit(ctx context.Context, actorType, actorID, action, entityType, entityID, ipHash string, meta map[string]any) error
	Ping(ctx context.Context) error
}
