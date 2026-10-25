-- +goose Up
-- Inline-editable copy: the code holds the default, a row here overrides it (live on save).
CREATE TABLE site_texts (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    version    int NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE TABLE site_text_history (
    id         bigserial PRIMARY KEY,
    key        text NOT NULL,
    value      jsonb,           -- NULL = override removed (back to the default in code)
    version    int NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_text_history_key_idx ON site_text_history (key, id DESC);

-- +goose Down
DROP TABLE site_text_history;
DROP TABLE site_texts;
