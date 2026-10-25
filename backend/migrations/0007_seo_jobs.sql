-- +goose Up
-- Small key/value state for jobs (e.g. the last day synced from Search Console).
CREATE TABLE job_state (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seo_suggestions ADD COLUMN decided_by uuid REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE seo_suggestions ADD COLUMN decided_at timestamptz;

-- Awareness dates (Brazil, mental health). João edits the list in /admin/pautas.
INSERT INTO awareness_calendar (name, start_md, end_md, topics, lead_days) VALUES
 ('Janeiro Branco (saúde mental)',            '01-01', '01-31', ARRAY['saúde mental','autocuidado','metas e hábitos'], 45),
 ('Dia da Visibilidade Trans',                '01-29', '01-29', ARRAY['saúde mental trans','acolhimento'], 30),
 ('Abril Azul e Dia do Autismo',              '04-01', '04-30', ARRAY['neurodiversidade','autismo'], 45),
 ('Dia contra a LGBTfobia',                   '05-17', '05-17', ARRAY['saúde mental LGBTQIA+','minority stress'], 30),
 ('Dia da Luta Antimanicomial',               '05-18', '05-18', ARRAY['saúde mental','cuidado em liberdade'], 30),
 ('Dia do Orgulho LGBTQIA+',                  '06-28', '06-28', ARRAY['saúde mental LGBTQIA+','identidade'], 40),
 ('Dia do Psicólogo',                         '08-27', '08-27', ARRAY['psicologia','profissão'], 30),
 ('Setembro Amarelo (prevenção do suicídio)', '09-01', '09-30', ARRAY['prevenção do suicídio','como ajudar','busca de ajuda'], 60),
 ('Dia Mundial da Saúde Mental',              '10-10', '10-10', ARRAY['saúde mental','trabalho e saúde mental'], 40),
 ('Novembro Azul (saúde do homem)',           '11-01', '11-30', ARRAY['saúde mental masculina','buscar terapia'], 45),
 ('Dezembro Vermelho (HIV/aids)',             '12-01', '12-01', ARRAY['saúde mental e HIV','estigma'], 30);

-- Searches the research digest runs every week (PubMed syntax; Crossref free text with the SciELO prefix).
INSERT INTO research_queries (kind, query, filters) VALUES
 ('pubmed',   '"behavioral activation" AND depression',                                   '{"days":30}'),
 ('pubmed',   '"acceptance and commitment therapy" AND anxiety',                          '{"days":30}'),
 ('pubmed',   '("sexual and gender minorities") AND "mental health" AND intervention',    '{"days":30}'),
 ('pubmed',   '"couple therapy" AND outcome',                                             '{"days":60}'),
 ('pubmed',   '"attention deficit hyperactivity disorder" AND adults AND "behavioral"',   '{"days":30}'),
 ('crossref', 'análise do comportamento',                                                 '{"prefix":"10.1590","days":90}'),
 ('crossref', 'terapia comportamental',                                                   '{"prefix":"10.1590","days":90}');

-- +goose Down
DELETE FROM research_queries;
DELETE FROM awareness_calendar;
ALTER TABLE seo_suggestions DROP COLUMN decided_at;
ALTER TABLE seo_suggestions DROP COLUMN decided_by;
DROP TABLE job_state;
