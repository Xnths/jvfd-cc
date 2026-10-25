-- +goose Up
CREATE TABLE comments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id      uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_name  text NOT NULL,
    body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','spam')),
    ip_hash      text NOT NULL DEFAULT '',
    moderated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    moderated_at timestamptz,
    legacy_id    text UNIQUE,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON comments (post_id, created_at) WHERE status = 'approved';
CREATE INDEX comments_pending_idx ON comments (created_at) WHERE status = 'pending';

CREATE TABLE faq_questions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question     text NOT NULL CHECK (char_length(question) BETWEEN 10 AND 1000),
    status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new','answered','published','rejected','spam')),
    answer       jsonb,
    slug         citext UNIQUE,
    topic        text NOT NULL DEFAULT '',
    published_at timestamptz,
    answered_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    ip_hash      text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contatos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    phone        text NOT NULL,
    consent_given boolean NOT NULL,
    consent_at   timestamptz NOT NULL,
    status       text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','respondido')),
    legacy_id    text UNIQUE,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gclid        text NOT NULL UNIQUE,
    clicked_at   timestamptz NOT NULL,
    status       text NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked','qualified','converted')),
    qualified_at timestamptz,
    converted_at timestamptz,
    legacy_id    text UNIQUE,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON leads (status, clicked_at);

CREATE TABLE subscribers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    consented_at    timestamptz NOT NULL,
    active          boolean NOT NULL DEFAULT true,
    unsubscribed_at timestamptz,
    source          text NOT NULL DEFAULT 'site',
    legacy_id       text UNIQUE,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_campaigns (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    uuid NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    status     text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed')),
    queued_at  timestamptz NOT NULL DEFAULT now(),
    sent_at    timestamptz,
    stats      jsonb NOT NULL DEFAULT '{}',
    last_error text NOT NULL DEFAULT ''
);

CREATE TABLE newsletter_deliveries (
    campaign_id   uuid NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
    subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
    provider_id   text NOT NULL DEFAULT '',
    error         text NOT NULL DEFAULT '',
    sent_at       timestamptz,
    PRIMARY KEY (campaign_id, subscriber_id)
);

-- +goose Down
DROP TABLE newsletter_deliveries;
DROP TABLE newsletter_campaigns;
DROP TABLE subscribers;
DROP TABLE leads;
DROP TABLE contatos;
DROP TABLE faq_questions;
DROP TABLE comments;
