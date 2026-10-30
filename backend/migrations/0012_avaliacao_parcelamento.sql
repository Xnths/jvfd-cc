-- +goose Up
-- Installments note on the avaliação page (no price). Only touches the original sentence, so a text João already
-- edited in place is left alone.
UPDATE services SET
  body = replace(body::text, 'sobre valores são passadas diretamente por João, pelo WhatsApp.', 'sobre valores são passadas diretamente por João, pelo WhatsApp. O valor pode ser parcelado em até 6 vezes.')::jsonb,
  published_body = replace(published_body::text, 'sobre valores são passadas diretamente por João, pelo WhatsApp.', 'sobre valores são passadas diretamente por João, pelo WhatsApp. O valor pode ser parcelado em até 6 vezes.')::jsonb,
  updated_at = now()
WHERE page_id = (SELECT id FROM pages WHERE slug = 'avaliacao-neuropsicologica')
  AND (body::text LIKE '%sobre valores são passadas diretamente por João, pelo WhatsApp.%'
    OR published_body::text LIKE '%sobre valores são passadas diretamente por João, pelo WhatsApp.%');

-- +goose Down
UPDATE services SET
  body = replace(body::text, ' O valor pode ser parcelado em até 6 vezes.', '')::jsonb,
  published_body = replace(published_body::text, ' O valor pode ser parcelado em até 6 vezes.', '')::jsonb
WHERE page_id = (SELECT id FROM pages WHERE slug = 'avaliacao-neuropsicologica');
