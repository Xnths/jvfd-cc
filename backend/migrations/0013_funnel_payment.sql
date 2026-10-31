-- +goose Up
-- Funnel stages after the booking: the message time (t_msg, matched by hand), the payment and the Google Ads
-- adjustment that corrects the booked value. Messages that could not be matched still count towards n_3.
ALTER TABLE leads
  ADD COLUMN message_at timestamptz,
  ADD COLUMN paid_value numeric(10,2),
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN payment_status text CHECK (payment_status IN ('paid','not_paid'));

-- Rows that were qualified before this migration keep their qualified_at as the message time.
UPDATE leads SET message_at = qualified_at WHERE qualified_at IS NOT NULL;

CREATE TABLE messages_unmatched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (reason IN ('no_match','ambiguous')),
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_unmatched_at_idx ON messages_unmatched (message_at DESC);

-- One adjustment per lead: the latest decision (restate the value or retract) wins and is queued again.
CREATE TABLE conversion_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('RESTATEMENT','RETRACTION')),
  value numeric(10,2),
  adjustment_time timestamptz NOT NULL,
  conversion_action text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending','retry','succeeded','failed','skipped')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_code text,
  last_error_message text,
  response jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversion_adjustments_due_idx ON conversion_adjustments (next_attempt_at) WHERE status IN ('pending','retry');

-- +goose Down
DROP TABLE conversion_adjustments;
DROP TABLE messages_unmatched;
ALTER TABLE leads DROP COLUMN message_at, DROP COLUMN paid_value, DROP COLUMN paid_at, DROP COLUMN payment_status;
