-- +goose Up

-- ── Site settings (singleton) ────────────────────────────────────────────────
CREATE TABLE site_settings (
    id                int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    draft             jsonb NOT NULL DEFAULT '{}',
    published         jsonb NOT NULL DEFAULT '{}',
    draft_version     int NOT NULL DEFAULT 1,
    published_version int NOT NULL DEFAULT 0,
    published_at      timestamptz,
    updated_at        timestamptz NOT NULL DEFAULT now()
);
INSERT INTO site_settings (id) VALUES (1);

-- ── Media ────────────────────────────────────────────────────────────────────
CREATE TABLE media (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename    text NOT NULL UNIQUE,
    mime_type   text NOT NULL,
    filesize    bigint NOT NULL,
    width       int,
    height      int,
    alt         text NOT NULL,
    caption     text NOT NULL DEFAULT '',
    sha256      text NOT NULL DEFAULT '',
    uploaded_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    legacy_id   text UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Pages: every URL the site serves from the CMS ───────────────────────────
CREATE TABLE pages (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              citext NOT NULL UNIQUE,                 -- '' is the home page
    kind              text NOT NULL CHECK (kind IN ('home','service','location','education','legal','custom','tool')),
    title             text NOT NULL DEFAULT '',
    subtitle          text NOT NULL DEFAULT '',
    meta_title        text NOT NULL DEFAULT '',
    meta_description  text NOT NULL DEFAULT '',
    markdown_twin     boolean NOT NULL DEFAULT true,
    status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    draft_blocks      jsonb NOT NULL DEFAULT '[]',
    published_blocks  jsonb NOT NULL DEFAULT '[]',
    draft_meta        jsonb NOT NULL DEFAULT '{}',            -- unpublished title/meta edits
    draft_version     int NOT NULL DEFAULT 1,
    published_version int NOT NULL DEFAULT 0,
    published_at      timestamptz,
    legacy_id         text UNIQUE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE services (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id           uuid NOT NULL UNIQUE REFERENCES pages(id) ON DELETE CASCADE,
    name              text NOT NULL,
    card_title        text NOT NULL DEFAULT '',
    card_description  text NOT NULL DEFAULT '',
    icon              text NOT NULL DEFAULT 'heart',
    category          text NOT NULL DEFAULT 'therapy' CHECK (category IN ('therapy','education')),
    layout            text NOT NULL DEFAULT 'generic' CHECK (layout IN ('calming','structured','plantao','exploratory','supervisao','affirmative','generic','blocks')),
    theme             text NOT NULL DEFAULT 'teal' CHECK (theme IN ('teal','amber','slate','green','stone','slate_dark','violet')),
    badge             text NOT NULL DEFAULT '',
    cta_text          text NOT NULL DEFAULT 'Agendar pelo WhatsApp',
    whatsapp_message  text NOT NULL DEFAULT '',
    variant_copy      jsonb NOT NULL DEFAULT '{}',
    body              jsonb,                                   -- Lexical document (draft/published live on the page row's versions)
    published_body    jsonb,
    show_on_home      text NOT NULL DEFAULT 'always' CHECK (show_on_home IN ('always','campaign','never')),
    campaign_key      text,
    show_in_footer    boolean NOT NULL DEFAULT true,
    show_contact_section boolean NOT NULL DEFAULT true,
    sort_order        int NOT NULL DEFAULT 0,
    analytics_key     text NOT NULL UNIQUE,                    -- immutable: service_page_<slug> at creation
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementBegin
CREATE FUNCTION services_keep_analytics_key() RETURNS trigger AS $$
BEGIN
    IF NEW.analytics_key <> OLD.analytics_key THEN
        RAISE EXCEPTION 'analytics_key is immutable';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
-- +goose StatementEnd
CREATE TRIGGER services_analytics_key_immutable BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION services_keep_analytics_key();

CREATE TABLE redirects (
    from_path  text PRIMARY KEY,
    to_path    text NOT NULL,
    status     int NOT NULL DEFAULT 308 CHECK (status IN (301, 308)),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE revisions (
    id          bigserial PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id   text NOT NULL,
    version     int NOT NULL,
    data        jsonb NOT NULL,
    message     text NOT NULL DEFAULT '',
    created_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id, version)
);

-- ── Team profiles (LinkedIn-style) ───────────────────────────────────────────
CREATE TABLE profiles (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id    uuid UNIQUE REFERENCES admin_users(id) ON DELETE SET NULL,
    slug             citext NOT NULL UNIQUE,
    display_name     text NOT NULL,
    full_name        text NOT NULL DEFAULT '',
    job_title        text NOT NULL DEFAULT '',
    crp              text,
    is_clinician     boolean NOT NULL DEFAULT false,
    practicing_since int,
    approach         text NOT NULL DEFAULT '',
    bio              jsonb,
    photo_id         uuid REFERENCES media(id) ON DELETE SET NULL,
    knows_about      text[] NOT NULL DEFAULT '{}',
    languages        text[] NOT NULL DEFAULT '{}',
    alumni_of        text[] NOT NULL DEFAULT '{}',
    links            jsonb NOT NULL DEFAULT '{}',
    visibility       text NOT NULL DEFAULT 'hidden' CHECK (visibility IN ('public','hidden')),
    is_primary       boolean NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_one_primary ON profiles ((true)) WHERE is_primary;

CREATE TABLE profile_sections (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    kind       text NOT NULL CHECK (kind IN ('experience','education','certification','publication','course','language','award','custom')),
    title      text NOT NULL,
    visible    boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX profile_sections_profile_idx ON profile_sections (profile_id, sort_order);

CREATE TABLE profile_entries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id    uuid NOT NULL REFERENCES profile_sections(id) ON DELETE CASCADE,
    title         text NOT NULL,
    organization  text NOT NULL DEFAULT '',
    location      text NOT NULL DEFAULT '',
    start_date    date,
    end_date      date,
    is_current    boolean NOT NULL DEFAULT false,
    description   text NOT NULL DEFAULT '',
    url           text NOT NULL DEFAULT '',
    credential_id text NOT NULL DEFAULT '',
    icon          text NOT NULL DEFAULT '',
    featured      boolean NOT NULL DEFAULT false,
    metadata      jsonb NOT NULL DEFAULT '{}',
    sort_order    int NOT NULL DEFAULT 0
);
CREATE INDEX profile_entries_section_idx ON profile_entries (section_id, sort_order);

-- ── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                   citext NOT NULL UNIQUE,
    title                  text NOT NULL,
    excerpt                text NOT NULL DEFAULT '',
    keywords               text NOT NULL DEFAULT '',
    content                jsonb NOT NULL DEFAULT '{}',        -- Lexical (current/draft)
    published_content      jsonb,                               -- what the public sees; NULL until first publish
    status                 text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','scheduled','published','archived')),
    published_at           timestamptz,
    author_name            text NOT NULL DEFAULT 'João Vitor Fernandes',
    author_profile_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    last_reviewed_at       timestamptz,
    image_id               uuid REFERENCES media(id) ON DELETE SET NULL,
    meta_title             text NOT NULL DEFAULT '',
    meta_description       text NOT NULL DEFAULT '',
    origin                 text NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','research_bot','gsc','trend','faq')),
    citations              jsonb NOT NULL DEFAULT '[]',
    lint_ack_at            timestamptz,
    newsletter_sent_at     timestamptz,
    version                int NOT NULL DEFAULT 1,
    legacy_id              text UNIQUE,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_published_idx ON posts (published_at DESC) WHERE status = 'published';

-- ── Glossary ─────────────────────────────────────────────────────────────────
CREATE TABLE glossary_terms (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                   citext NOT NULL UNIQUE,
    term                   text NOT NULL,
    alt_names              text[] NOT NULL DEFAULT '{}',
    short_definition       text NOT NULL DEFAULT '',
    body                   jsonb,
    sources                jsonb NOT NULL DEFAULT '[]',
    related                uuid[] NOT NULL DEFAULT '{}',
    status                 text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    reviewed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    published_at           timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE glossary_terms;
DROP TABLE posts;
DROP TABLE profile_entries;
DROP TABLE profile_sections;
DROP TABLE profiles;
DROP TABLE revisions;
DROP TABLE redirects;
DROP TRIGGER services_analytics_key_immutable ON services;
DROP FUNCTION services_keep_analytics_key();
DROP TABLE services;
DROP TABLE pages;
DROP TABLE media;
DROP TABLE site_settings;
