-- +goose Up
-- "Gerar rascunho" on a pauta: search sources, outline an idea, write the draft post. One row per run.
ALTER TABLE posts DROP CONSTRAINT posts_origin_check;
ALTER TABLE posts ADD CONSTRAINT posts_origin_check CHECK (origin IN ('manual','research_bot','gsc','trend','faq','topic_bot'));

CREATE TABLE topic_digests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id    uuid NOT NULL REFERENCES topic_queue(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'searching' CHECK (status IN ('searching','outlining','writing','done','failed')),
    queries     jsonb NOT NULL DEFAULT '{}',
    sources     jsonb NOT NULL DEFAULT '[]',
    outline     jsonb,
    post_id     uuid REFERENCES posts(id) ON DELETE SET NULL,
    lint_flags  int NOT NULL DEFAULT 0,
    error       text NOT NULL DEFAULT '',
    cost_usd    numeric(10,4) NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);
-- A pauta has at most one run in flight.
CREATE UNIQUE INDEX topic_digests_active_idx ON topic_digests (topic_id) WHERE status IN ('searching','outlining','writing');
CREATE INDEX topic_digests_topic_idx ON topic_digests (topic_id, created_at DESC);

-- +goose Down
DROP TABLE topic_digests;
UPDATE posts SET origin = 'research_bot' WHERE origin = 'topic_bot';
ALTER TABLE posts DROP CONSTRAINT posts_origin_check;
ALTER TABLE posts ADD CONSTRAINT posts_origin_check CHECK (origin IN ('manual','research_bot','gsc','trend','faq'));
