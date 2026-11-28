-- +goose Up
-- SHA-256 (hex) of the patient's WhatsApp number in E.164 (+55DDDNUMBER), typed by the admin in "Registrar
-- mensagem". Sent to Google Ads as user-provided data with the M/Q/P conversions. The number itself is never stored.
ALTER TABLE leads ADD COLUMN phone_sha256 text CHECK (phone_sha256 ~ '^[0-9a-f]{64}$');

-- +goose Down
ALTER TABLE leads DROP COLUMN phone_sha256;
