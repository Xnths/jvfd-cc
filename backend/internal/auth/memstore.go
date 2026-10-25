package auth

import (
	"bytes"
	"context"
	"fmt"
	"sync"
	"time"
)

// MemStore is an in-memory Store used by tests.
type MemStore struct {
	mu       sync.Mutex
	admins   map[string]*Admin
	sessions map[string]*Session
	clients  map[string]Client
	Audits   []string
	seq      int
}

// NewMemStore creates an empty store.
func NewMemStore() *MemStore {
	return &MemStore{admins: map[string]*Admin{}, sessions: map[string]*Session{}, clients: map[string]Client{}}
}

// AddClient registers a machine client.
func (m *MemStore) AddClient(c Client) { m.mu.Lock(); m.clients[c.ID] = c; m.mu.Unlock() }

// SetDisabled flips the disabled flag of an admin by email.
func (m *MemStore) SetDisabled(email string, v bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, a := range m.admins {
		if a.Email == email {
			a.Disabled = v
		}
	}
}

// AdminCount returns the number of admin rows (tests assert rejected logins create none).
func (m *MemStore) AdminCount() int { m.mu.Lock(); defer m.mu.Unlock(); return len(m.admins) }

func (m *MemStore) nextID(p string) string { m.seq++; return fmt.Sprintf("%s-%d", p, m.seq) }

type memTx struct{ m *MemStore }

func (m *MemStore) Do(_ context.Context, fn func(Tx) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return fn(memTx{m})
}

func (t memTx) UpsertAdmin(_ context.Context, a Admin) (Admin, error) {
	for _, ex := range t.m.admins {
		if ex.Email == a.Email {
			if ex.GoogleSub != "" && ex.GoogleSub != a.GoogleSub {
				return Admin{}, ErrSubMismatch
			}
			ex.GoogleSub, ex.Name, ex.Picture, ex.Role = a.GoogleSub, a.Name, a.Picture, a.Role
			if ex.Disabled {
				return Admin{}, ErrDisabled
			}
			return *ex, nil
		}
	}
	a.ID = t.m.nextID("admin")
	t.m.admins[a.ID] = &a
	return a, nil
}

func (t memTx) AdminByID(_ context.Context, id string) (Admin, error) {
	a, ok := t.m.admins[id]
	if !ok {
		return Admin{}, ErrNotFound
	}
	return *a, nil
}

func (t memTx) SessionByHashForUpdate(_ context.Context, hash []byte) (Session, error) {
	for _, s := range t.m.sessions {
		if bytes.Equal(s.Hash, hash) {
			return *s, nil
		}
	}
	return Session{}, ErrNotFound
}

func (t memTx) InsertSession(_ context.Context, s Session) error {
	if s.ID == "" {
		s.ID = t.m.nextID("sess")
	}
	t.m.sessions[s.ID] = &s
	return nil
}

func (t memTx) MarkRotated(_ context.Context, id string, at time.Time) error {
	if s, ok := t.m.sessions[id]; ok {
		s.RotatedAt = &at
	}
	return nil
}

func (t memTx) RevokeFamily(_ context.Context, family string, at time.Time) error {
	for _, s := range t.m.sessions {
		if s.FamilyID == family && s.RevokedAt == nil {
			s.RevokedAt = &at
		}
	}
	return nil
}

func (t memTx) RevokeSession(_ context.Context, id string, at time.Time) error {
	if s, ok := t.m.sessions[id]; ok {
		s.RevokedAt = &at
	}
	return nil
}

func (m *MemStore) AdminByID(_ context.Context, id string) (Admin, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.admins[id]
	if !ok {
		return Admin{}, ErrNotFound
	}
	return *a, nil
}

func (m *MemStore) SessionsForAdmin(_ context.Context, adminID string, now time.Time) ([]Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Session
	for _, s := range m.sessions {
		if s.AdminID == adminID && s.RevokedAt == nil && s.RotatedAt == nil && s.ExpiresAt.After(now) {
			out = append(out, *s)
		}
	}
	return out, nil
}

func (m *MemStore) ClientByID(_ context.Context, id string) (Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.clients[id]
	if !ok {
		return Client{}, ErrNotFound
	}
	return c, nil
}

func (m *MemStore) Audit(_ context.Context, actorType, actorID, action, _, _, _ string, _ map[string]any) error {
	m.mu.Lock()
	m.Audits = append(m.Audits, actorType+":"+actorID+":"+action)
	m.mu.Unlock()
	return nil
}

func (m *MemStore) Ping(context.Context) error { return nil }

// Sessions returns a snapshot (tests).
func (m *MemStore) Sessions() []Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Session
	for _, s := range m.sessions {
		out = append(out, *s)
	}
	return out
}
