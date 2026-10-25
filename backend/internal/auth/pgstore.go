package auth

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore is the PostgreSQL implementation of Store.
type PGStore struct{ pool *pgxpool.Pool }

// NewPGStore wraps a pool.
func NewPGStore(p *pgxpool.Pool) *PGStore { return &PGStore{pool: p} }

type pgTx struct{ tx pgx.Tx }

func (s *PGStore) Do(ctx context.Context, fn func(Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op
	if err := fn(pgTx{tx}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const adminCols = `id::text, email::text, coalesce(google_sub,''), name, picture_url, role, disabled`

func scanAdmin(row pgx.Row) (Admin, error) {
	var a Admin
	err := row.Scan(&a.ID, &a.Email, &a.GoogleSub, &a.Name, &a.Picture, &a.Role, &a.Disabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, ErrNotFound
	}
	return a, err
}

func (t pgTx) UpsertAdmin(ctx context.Context, a Admin) (Admin, error) {
	cur, err := scanAdmin(t.tx.QueryRow(ctx, `SELECT `+adminCols+` FROM admin_users WHERE email = $1 FOR UPDATE`, a.Email))
	switch {
	case errors.Is(err, ErrNotFound):
		return scanAdmin(t.tx.QueryRow(ctx,
			`INSERT INTO admin_users (email, google_sub, name, picture_url, role, last_login_at)
			 VALUES ($1, $2, $3, $4, $5, now()) RETURNING `+adminCols,
			a.Email, a.GoogleSub, a.Name, a.Picture, a.Role))
	case err != nil:
		return Admin{}, err
	}
	if cur.GoogleSub != "" && cur.GoogleSub != a.GoogleSub {
		return Admin{}, ErrSubMismatch
	}
	if cur.Disabled {
		return Admin{}, ErrDisabled
	}
	return scanAdmin(t.tx.QueryRow(ctx,
		`UPDATE admin_users SET google_sub = $2, name = $3, picture_url = $4, role = $5, last_login_at = now(), updated_at = now()
		 WHERE id = $1 RETURNING `+adminCols,
		cur.ID, a.GoogleSub, a.Name, a.Picture, a.Role))
}

func (t pgTx) AdminByID(ctx context.Context, id string) (Admin, error) {
	return scanAdmin(t.tx.QueryRow(ctx, `SELECT `+adminCols+` FROM admin_users WHERE id = $1`, id))
}

func (t pgTx) SessionByHashForUpdate(ctx context.Context, hash []byte) (Session, error) {
	var s Session
	var rotatedFrom *string
	err := t.tx.QueryRow(ctx,
		`SELECT id::text, admin_id::text, family_id::text, refresh_hash, rotated_from::text, created_at, expires_at, rotated_at, revoked_at, ip_hash, user_agent
		 FROM sessions WHERE refresh_hash = $1 FOR UPDATE`, hash).
		Scan(&s.ID, &s.AdminID, &s.FamilyID, &s.Hash, &rotatedFrom, &s.CreatedAt, &s.ExpiresAt, &s.RotatedAt, &s.RevokedAt, &s.IPHash, &s.UserAgent)
	if errors.Is(err, pgx.ErrNoRows) {
		return s, ErrNotFound
	}
	if rotatedFrom != nil {
		s.RotatedFrom = *rotatedFrom
	}
	return s, err
}

func (t pgTx) InsertSession(ctx context.Context, s Session) error {
	var from *string
	if s.RotatedFrom != "" {
		from = &s.RotatedFrom
	}
	_, err := t.tx.Exec(ctx,
		`INSERT INTO sessions (id, admin_id, family_id, refresh_hash, rotated_from, created_at, expires_at, ip_hash, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		s.ID, s.AdminID, s.FamilyID, s.Hash, from, s.CreatedAt, s.ExpiresAt, s.IPHash, s.UserAgent)
	return err
}

func (t pgTx) MarkRotated(ctx context.Context, id string, at time.Time) error {
	_, err := t.tx.Exec(ctx, `UPDATE sessions SET rotated_at = $2 WHERE id = $1`, id, at)
	return err
}

func (t pgTx) RevokeFamily(ctx context.Context, family string, at time.Time) error {
	_, err := t.tx.Exec(ctx, `UPDATE sessions SET revoked_at = $2 WHERE family_id = $1 AND revoked_at IS NULL`, family, at)
	return err
}

func (t pgTx) RevokeSession(ctx context.Context, id string, at time.Time) error {
	_, err := t.tx.Exec(ctx, `UPDATE sessions SET revoked_at = $2 WHERE id = $1`, id, at)
	return err
}

func (s *PGStore) AdminByID(ctx context.Context, id string) (Admin, error) {
	return scanAdmin(s.pool.QueryRow(ctx, `SELECT `+adminCols+` FROM admin_users WHERE id = $1`, id))
}

func (s *PGStore) SessionsForAdmin(ctx context.Context, adminID string, now time.Time) ([]Session, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, created_at, expires_at, user_agent FROM sessions
		 WHERE admin_id = $1 AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at > $2 ORDER BY created_at DESC`, adminID, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Session
	for rows.Next() {
		var x Session
		if err := rows.Scan(&x.ID, &x.CreatedAt, &x.ExpiresAt, &x.UserAgent); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (s *PGStore) ClientByID(ctx context.Context, id string) (Client, error) {
	var c Client
	err := s.pool.QueryRow(ctx, `SELECT client_id, secret_hash, scopes, disabled FROM service_clients WHERE client_id = $1`, id).
		Scan(&c.ID, &c.SecretHash, &c.Scopes, &c.Disabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func (s *PGStore) Audit(ctx context.Context, actorType, actorID, action, entityType, entityID, ipHash string, meta map[string]any) error {
	if meta == nil {
		meta = map[string]any{}
	}
	b, _ := json.Marshal(meta)
	_, err := s.pool.Exec(ctx,
		`INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, meta, ip_hash) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		actorType, actorID, action, entityType, entityID, b, ipHash)
	return err
}

func (s *PGStore) Ping(ctx context.Context) error { return s.pool.Ping(ctx) }
