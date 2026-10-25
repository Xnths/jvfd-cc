-- +goose Up
-- João's public profile, seeded from the copy that was hardcoded on the site (home "Sobre", formações).
-- Idempotent: nothing happens if a profile with this slug (or a primary profile) already exists.
INSERT INTO profiles (slug, display_name, full_name, job_title, crp, is_clinician, practicing_since, approach, bio, knows_about, languages, alumni_of, links, visibility, is_primary)
SELECT 'joao', 'João Fernandes', 'João Vitor Fernandes Domingues', 'Psicólogo clínico', '06/157908', true, 2019,
  'Análise do Comportamento (Behaviorismo Radical)',
  $j${"root":{"type":"root","version":1,"format":"","indent":0,"direction":null,"children":[
    {"type":"paragraph","version":1,"format":"","indent":0,"direction":null,"children":[{"type":"text","version":1,"format":0,"mode":"normal","style":"","detail":0,"text":"Sou psicólogo clínico e atuo desde 2019 com base na Análise do Comportamento, a ciência que estuda como nossas ações são moldadas pelas consequências que elas produzem no ambiente. É uma visão de comportamento ligada à biologia: somos organismos que aprendem e mudam ao longo da vida, e é isso que torna a mudança possível."}]},
    {"type":"paragraph","version":1,"format":"","indent":0,"direction":null,"children":[{"type":"text","version":1,"format":0,"mode":"normal","style":"","detail":0,"text":"Na prática, isso significa olhar com cuidado para o que acontece antes e depois do que te faz sofrer, e não apenas para o que você sente. A terapia é, antes de tudo, um encontro humano: ofereço escuta atenta, sem julgamentos, e um vínculo de confiança para você explorar suas questões com segurança e caminhar em direção ao que valoriza."}]},
    {"type":"paragraph","version":1,"format":"","indent":0,"direction":null,"children":[{"type":"text","version":1,"format":0,"mode":"normal","style":"","detail":0,"text":"Como psicólogo gay, conheço de perto as alegrias e os desafios da vida LGBTQIA+. Aqui, sua identidade é respeitada e a terapia é um espaço para construir relacionamentos que nutrem, viver com mais leveza e com autenticidade. Também dou aulas particulares de Química, Biologia e método de estudo."}]}
  ]}}$j$::jsonb,
  ARRAY['Análise do Comportamento','Behaviorismo Radical','Psicoterapia','Terapia comportamental','Psicologia LGBTQIA+','Neuropsicologia','Psicologia hospitalar','Supervisão clínica','Biologia do comportamento','Química para vestibular','Métodos de estudo'],
  ARRAY['pt-BR'],
  ARRAY['Pontifícia Universidade Católica de São Paulo','Hospital Israelita Albert Einstein','Pontifícia Universidade Católica do Paraná'],
  '{"instagram":"https://www.instagram.com/ciencia_comportamental_/","linkedin":"https://www.linkedin.com/in/psicologo-joao-fernandes-d/","lattes":"https://lattes.cnpq.br/2507330776380191","oneliv":"https://oneliv.com.br/profissional/joao-vitor-fernandes-domingues"}'::jsonb,
  'public', true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE slug = 'joao' OR is_primary);

INSERT INTO profile_sections (profile_id, kind, title, sort_order)
SELECT p.id, 'education', 'Formação e qualificações', 10 FROM profiles p
WHERE p.slug = 'joao' AND NOT EXISTS (SELECT 1 FROM profile_sections s WHERE s.profile_id = p.id);

INSERT INTO profile_entries (section_id, title, organization, featured, icon, sort_order)
SELECT s.id, e.title, e.org, true, e.icon, e.ord
FROM profile_sections s JOIN profiles p ON p.id = s.profile_id AND p.slug = 'joao',
(VALUES
  ('Bacharelado em Psicologia', 'Pontifícia Universidade Católica de São Paulo (PUCSP)', 'graduacao', 10),
  ('Aperfeiçoamento em Psicologia Hospitalar', 'Psicocare', 'hospitalar', 20),
  ('Pós-graduação em Neuropsicologia', 'Hospital Israelita Albert Einstein', 'neuropsicologia', 30),
  ('Pós-graduação em Neurociências, Comportamento e Psicopatologia', 'Pontifícia Universidade Católica do Paraná (PUCPR)', 'neurociencias', 40),
  ('Curso em Filosofia Oriental', 'Universidade Harvard', 'filosofia', 50)
) AS e(title, org, icon, ord)
WHERE s.kind = 'education' AND NOT EXISTS (SELECT 1 FROM profile_entries x WHERE x.section_id = s.id);

-- +goose Down
DELETE FROM profiles WHERE slug = 'joao';
