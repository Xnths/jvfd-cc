-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE admin_users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext NOT NULL UNIQUE,
    google_sub    text UNIQUE,
    name          text NOT NULL DEFAULT '',
    picture_url   text NOT NULL DEFAULT '',
    role          text NOT NULL CHECK (role IN ('clinical', 'tech')),
    disabled      boolean NOT NULL DEFAULT false,
    last_login_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id           uuid PRIMARY KEY,
    admin_id     uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    family_id    uuid NOT NULL,
    refresh_hash bytea NOT NULL UNIQUE,
    rotated_from uuid,
    created_at   timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL,
    rotated_at   timestamptz,
    revoked_at   timestamptz,
    ip_hash      text NOT NULL DEFAULT '',
    user_agent   text NOT NULL DEFAULT ''
);
CREATE INDEX sessions_admin_idx ON sessions (admin_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_family_idx ON sessions (family_id);

CREATE TABLE service_clients (
    client_id   text PRIMARY KEY,
    secret_hash text NOT NULL,
    scopes      text[] NOT NULL DEFAULT '{}',
    disabled    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id          bigserial PRIMARY KEY,
    at          timestamptz NOT NULL DEFAULT now(),
    actor_type  text NOT NULL CHECK (actor_type IN ('admin', 'service', 'public')),
    actor_id    text NOT NULL DEFAULT '',
    action      text NOT NULL,
    entity_type text NOT NULL DEFAULT '',
    entity_id   text NOT NULL DEFAULT '',
    meta        jsonb NOT NULL DEFAULT '{}',
    ip_hash     text NOT NULL DEFAULT ''
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);

-- +goose Down
DROP TABLE audit_log;
DROP TABLE service_clients;
DROP TABLE sessions;
DROP TABLE admin_users;
