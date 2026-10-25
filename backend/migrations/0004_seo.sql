-- +goose Up
CREATE TABLE gsc_daily (
    date        date NOT NULL,
    page        text NOT NULL,
    query       text NOT NULL,
    clicks      int NOT NULL,
    impressions int NOT NULL,
    ctr         real NOT NULL,
    position    real NOT NULL,
    PRIMARY KEY (date, page, query)
);
CREATE INDEX gsc_daily_query_idx ON gsc_daily (query);

CREATE TABLE seo_suggestions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        text NOT NULL CHECK (kind IN ('striking_distance','low_ctr','content_gap','cannibalization','decay','rising','awareness','research','faq_candidate')),
    dedupe_key  text NOT NULL UNIQUE,
    target_type text NOT NULL DEFAULT '',
    target_id   text NOT NULL DEFAULT '',
    query       text NOT NULL DEFAULT '',
    page        text NOT NULL DEFAULT '',
    metrics     jsonb NOT NULL DEFAULT '{}',
    proposal    jsonb NOT NULL DEFAULT '{}',
    generated_by text NOT NULL DEFAULT 'rules' CHECK (generated_by IN ('rules','llm')),
    status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','dismissed','done')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source       text NOT NULL CHECK (source IN ('pubmed','crossref')),
    external_id  text NOT NULL,
    doi          text,
    title        text NOT NULL,
    authors      text NOT NULL DEFAULT '',
    journal      text NOT NULL DEFAULT '',
    published_on date,
    abstract     text NOT NULL DEFAULT '',
    url          text NOT NULL DEFAULT '',
    pub_types    text[] NOT NULL DEFAULT '{}',
    score        real NOT NULL DEFAULT 0,
    status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new','selected','drafted','dismissed')),
    post_id      uuid REFERENCES posts(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);
CREATE UNIQUE INDEX research_items_doi_idx ON research_items (lower(doi)) WHERE doi IS NOT NULL;

CREATE TABLE research_queries (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        text NOT NULL CHECK (kind IN ('pubmed','crossref')),
    query       text NOT NULL,
    filters     jsonb NOT NULL DEFAULT '{}',
    enabled     boolean NOT NULL DEFAULT true,
    last_run_at timestamptz
);

CREATE TABLE awareness_calendar (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name      text NOT NULL,
    start_md  text NOT NULL CHECK (start_md ~ '^[0-1][0-9]-[0-3][0-9]$'),   -- MM-DD
    end_md    text NOT NULL CHECK (end_md ~ '^[0-1][0-9]-[0-3][0-9]$'),
    topics    text[] NOT NULL DEFAULT '{}',
    lead_days int NOT NULL DEFAULT 42,
    active    boolean NOT NULL DEFAULT true
);

CREATE TABLE topic_queue (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic         text NOT NULL,
    rationale     text NOT NULL DEFAULT '',
    source        text NOT NULL CHECK (source IN ('awareness','gsc_rising','research','faq','manual')),
    target_date   date,
    priority      int NOT NULL DEFAULT 0,
    status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in_progress','done','dismissed')),
    related_query text NOT NULL DEFAULT '',
    dedupe_key    text UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_runs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job             text NOT NULL,
    idempotency_key text NOT NULL,
    status          text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','failed')),
    started_at      timestamptz NOT NULL DEFAULT now(),
    finished_at     timestamptz,
    summary         jsonb NOT NULL DEFAULT '{}',
    error           text NOT NULL DEFAULT '',
    UNIQUE (job, idempotency_key)
);

CREATE TABLE llm_usage (
    id            bigserial PRIMARY KEY,
    at            timestamptz NOT NULL DEFAULT now(),
    job           text NOT NULL,
    model         text NOT NULL,
    input_tokens  int NOT NULL DEFAULT 0,
    output_tokens int NOT NULL DEFAULT 0,
    cache_read_tokens int NOT NULL DEFAULT 0,
    est_cost_usd  numeric(10,4) NOT NULL DEFAULT 0
);

-- +goose Down
DROP TABLE llm_usage;
DROP TABLE job_runs;
DROP TABLE topic_queue;
DROP TABLE awareness_calendar;
DROP TABLE research_queries;
DROP TABLE research_items;
DROP TABLE seo_suggestions;
DROP TABLE gsc_daily;
