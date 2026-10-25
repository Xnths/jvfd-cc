-- +goose Up
-- João gets ONE draft per pauta: a new run is only possible after the previous one failed (no draft came out of it).
DROP INDEX topic_digests_active_idx;
CREATE UNIQUE INDEX topic_digests_one_idx ON topic_digests (topic_id) WHERE status <> 'failed';

-- +goose Down
DROP INDEX topic_digests_one_idx;
CREATE UNIQUE INDEX topic_digests_active_idx ON topic_digests (topic_id) WHERE status IN ('searching','outlining','writing');
