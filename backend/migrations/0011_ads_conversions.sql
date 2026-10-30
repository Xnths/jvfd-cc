-- +goose Up
-- Every WhatsApp click is a lead (one row per click, client-generated id). Conversions are sent to Google Ads
-- through conversion_uploads, one row per (lead, stage).
ALTER TABLE leads DROP CONSTRAINT leads_gclid_key;
ALTER TABLE leads ALTER COLUMN gclid DROP NOT NULL,
  ADD COLUMN gbraid text, ADD COLUMN wbraid text,
  ADD COLUMN source text NOT NULL DEFAULT '',
  ADD COLUMN page_url text NOT NULL DEFAULT '', ADD COLUMN landing_url text NOT NULL DEFAULT '',
  ADD COLUMN utm_source text, ADD COLUMN utm_medium text, ADD COLUMN utm_campaign text, ADD COLUMN utm_term text, ADD COLUMN utm_content text,
  ADD COLUMN user_agent text NOT NULL DEFAULT '',
  ADD COLUMN qualified_value numeric(10,2), ADD COLUMN converted_value numeric(10,2);
CREATE INDEX leads_gclid_idx ON leads (gclid) WHERE gclid IS NOT NULL;

CREATE TABLE conversion_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('whatsapp_click','message_received','appointment_booked')),
  conversion_action text NOT NULL DEFAULT '',
  conversion_time timestamptz NOT NULL,
  value numeric(10,2),
  currency char(3) NOT NULL DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('pending','retry','succeeded','failed','skipped')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_code text, last_error_message text,
  response jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, stage)
);
CREATE INDEX conversion_uploads_due_idx ON conversion_uploads (next_attempt_at) WHERE status IN ('pending','retry');

-- History was uploaded by hand (CSV): never send it again.
INSERT INTO conversion_uploads (lead_id, stage, conversion_time, status, last_error_code)
SELECT id, 'whatsapp_click', clicked_at, 'skipped', 'LEGACY' FROM leads;
INSERT INTO conversion_uploads (lead_id, stage, conversion_time, status, last_error_code)
SELECT id, 'message_received', qualified_at, 'skipped', 'LEGACY' FROM leads WHERE qualified_at IS NOT NULL;
INSERT INTO conversion_uploads (lead_id, stage, conversion_time, status, last_error_code)
SELECT id, 'appointment_booked', converted_at, 'skipped', 'LEGACY' FROM leads WHERE converted_at IS NOT NULL;

-- +goose Down
DROP TABLE conversion_uploads;
ALTER TABLE leads DROP COLUMN gbraid, DROP COLUMN wbraid, DROP COLUMN source, DROP COLUMN page_url, DROP COLUMN landing_url,
  DROP COLUMN utm_source, DROP COLUMN utm_medium, DROP COLUMN utm_campaign, DROP COLUMN utm_term, DROP COLUMN utm_content,
  DROP COLUMN user_agent, DROP COLUMN qualified_value, DROP COLUMN converted_value;
DROP INDEX leads_gclid_idx;
DELETE FROM leads WHERE gclid IS NULL;
ALTER TABLE leads ALTER COLUMN gclid SET NOT NULL;
-- duplicates may exist now; keep the earliest per gclid before restoring the constraint
DELETE FROM leads a USING leads b WHERE a.gclid = b.gclid AND (a.created_at, a.id) > (b.created_at, b.id);
ALTER TABLE leads ADD CONSTRAINT leads_gclid_key UNIQUE (gclid);
