-- +goose Up
ALTER TABLE conversion_uploads
  ADD COLUMN request_id text,
  ADD COLUMN request_index int NOT NULL DEFAULT 0,
  ADD COLUMN google_status text CHECK (google_status IN ('PROCESSING','SUCCESS','FAILURE')),
  ADD COLUMN google_error text,
  ADD COLUMN checked_at timestamptz,
  ADD COLUMN diag_requeues int NOT NULL DEFAULT 0;
CREATE INDEX conversion_uploads_request_idx ON conversion_uploads (request_id) WHERE request_id IS NOT NULL;

-- Message conversions sent before the ordering rule existed carry a time earlier than their click: send them again with
-- a corrected time. The order id is unchanged, so Google ignores any that it already counted.
UPDATE conversion_uploads cu SET status = 'pending', attempts = 0, next_attempt_at = now(), last_error_code = NULL, last_error_message = NULL, updated_at = now()
FROM leads l
WHERE l.id = cu.lead_id AND cu.stage = 'message_received' AND cu.status = 'succeeded' AND cu.conversion_time < l.clicked_at
  AND l.clicked_at > now() - interval '85 days';

-- +goose Down
DROP INDEX conversion_uploads_request_idx;
ALTER TABLE conversion_uploads DROP COLUMN request_id, DROP COLUMN request_index, DROP COLUMN google_status,
  DROP COLUMN google_error, DROP COLUMN checked_at, DROP COLUMN diag_requeues;
