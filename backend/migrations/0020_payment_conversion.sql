-- +goose Up
ALTER TABLE conversion_uploads DROP CONSTRAINT conversion_uploads_stage_check;
ALTER TABLE conversion_uploads ADD CONSTRAINT conversion_uploads_stage_check
  CHECK (stage IN ('whatsapp_click','message_received','appointment_booked','payment_confirmed'));

UPDATE conversion_uploads SET value = NULL, updated_at = now()
WHERE stage = 'appointment_booked' AND status <> 'succeeded' AND value IS NOT NULL;

DELETE FROM conversion_adjustments ca USING leads l
WHERE l.id = ca.lead_id AND l.payment_status = 'paid' AND ca.adjustment_type = 'RESTATEMENT' AND ca.status <> 'succeeded';

UPDATE leads l SET paid_at = '2026-11-24T13:08:00-03:00'
WHERE l.gclid = 'CjwKCAiA5Y_YBhBbEiwAK5Dl7cYzC0xDoBiEoVRf3TKzuFd72aT6d2qM2Px7NFR7Reze1PG2tZ5iiRoCEGUQAvD_BwE'
  AND l.payment_status = 'paid' AND l.paid_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM conversion_uploads cu WHERE cu.lead_id = l.id AND cu.stage = 'payment_confirmed');

INSERT INTO conversion_uploads (lead_id, stage, conversion_time, value, status, last_error_code)
SELECT l.id, 'payment_confirmed', coalesce(l.paid_at, l.converted_at, now()), l.paid_value,
  CASE WHEN l.gclid IS NULL THEN 'skipped' ELSE 'pending' END,
  CASE WHEN l.gclid IS NOT NULL THEN NULL
       WHEN l.gbraid IS NOT NULL OR l.wbraid IS NOT NULL THEN 'ONE_PER_CLICK_CONVERSION_ACTION_NOT_PERMITTED_WITH_BRAID'
       ELSE 'NO_CLICK_ID' END
FROM leads l
WHERE l.payment_status = 'paid' AND l.paid_value IS NOT NULL
ON CONFLICT (lead_id, stage) DO NOTHING;

-- +goose Down
DELETE FROM conversion_uploads WHERE stage = 'payment_confirmed';
ALTER TABLE conversion_uploads DROP CONSTRAINT conversion_uploads_stage_check;
ALTER TABLE conversion_uploads ADD CONSTRAINT conversion_uploads_stage_check
  CHECK (stage IN ('whatsapp_click','message_received','appointment_booked'));
