-- +goose Up
-- /avaliacao-neuropsicologica redesign (credential band, condition cards, pages under /avaliacao-neuropsicologica/<slug>
-- built from src/content/avaliacoes.ts). Only the subtitle and the meta description live in Postgres. Each UPDATE only
-- touches a value that still equals the previous default, so an edit made in place is never overwritten.
UPDATE pages SET
  subtitle = CASE WHEN subtitle = $q$Testes padronizados, laudo e devolutiva para adultos, adolescentes e crianças, com psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein$q$
    THEN $q$Avaliação com testes padronizados, laudo e devolutiva para crianças, adolescentes e adultos, conduzida por psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein.$q$ ELSE subtitle END,
  meta_description = CASE WHEN meta_description = $q$Avaliação neuropsicológica presencial para adultos e crianças na Vila Madalena, São Paulo, com psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein. Consulta particular, com recibo para reembolso. CRP 06/157908.$q$
    THEN $q$Avaliação neuropsicológica presencial na Vila Madalena (SP) para crianças, adolescentes e adultos, com psicólogo pós-graduado pelo Einstein. CRP 06/157908.$q$ ELSE meta_description END,
  updated_at = now()
WHERE slug = 'avaliacao-neuropsicologica';

-- +goose Down
UPDATE pages SET
  subtitle = CASE WHEN subtitle = $q$Avaliação com testes padronizados, laudo e devolutiva para crianças, adolescentes e adultos, conduzida por psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein.$q$
    THEN $q$Testes padronizados, laudo e devolutiva para adultos, adolescentes e crianças, com psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein$q$ ELSE subtitle END,
  meta_description = CASE WHEN meta_description = $q$Avaliação neuropsicológica presencial na Vila Madalena (SP) para crianças, adolescentes e adultos, com psicólogo pós-graduado pelo Einstein. CRP 06/157908.$q$
    THEN $q$Avaliação neuropsicológica presencial para adultos e crianças na Vila Madalena, São Paulo, com psicólogo pós-graduado em Neuropsicologia pelo Hospital Israelita Albert Einstein. Consulta particular, com recibo para reembolso. CRP 06/157908.$q$ ELSE meta_description END
WHERE slug = 'avaliacao-neuropsicologica';
