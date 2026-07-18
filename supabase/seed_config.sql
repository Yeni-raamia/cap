-- ==================================================================
-- seed_config.sql — Catalogue versionné (cf. §5.4)
-- 9 métiers + 11 types. AUCUNE donnée sensible. Idempotent.
-- ==================================================================

insert into ref_metiers (code, label, tone, ordre) values
  ('SOC',  'Supervision & détection',   'rose',    1),
  ('CASE', 'Réponse à incident',        'rose',    2),
  ('INV',  'Investigation numérique',   'violet',  3),
  ('AUD',  'Audit',                     'sky',     4),
  ('CTI',  'Renseignement menace',      'violet',  5),
  ('GRC',  'Gouvernance & conformité',  'emerald', 6),
  ('PRJ',  'Projets & ingénierie',      'sky',     7),
  ('ADM',  'Coordination interne',      'slate',   8),
  ('PRE',  'Prestataires & tiers',      'amber',   9)
on conflict (code) do update
  set label = excluded.label, tone = excluded.tone, ordre = excluded.ordre;

insert into ref_types (code, label, sla_relance, sla_escalade, urgent, ordre) values
  ('INFO',       'Information',            null, null, false, 1),
  ('SIGNAL',     'Signalement',            3,    6,    false, 2),
  ('ALERTE',     'Alerte',                 1,    2,    true,  3),
  ('RECO',       'Recommandation',         4,    8,    false, 4),
  ('DEMANDE',    'Demande',                3,    7,    false, 5),
  ('RELANCE',    'Relance',                2,    4,    false, 6),
  ('VALIDATION', 'Validation',             4,    8,    false, 7),
  ('REUNION',    'Réunion',                2,    4,    false, 8),
  ('CR',         'Compte rendu',           null, null, false, 9),
  ('INTERDIT',   'Interdiction',           1,    2,    true,  10),
  ('CLOTURE',    'Clôture',                null, null, false, 11)
on conflict (code) do update
  set label = excluded.label, sla_relance = excluded.sla_relance,
      sla_escalade = excluded.sla_escalade, urgent = excluded.urgent, ordre = excluded.ordre;
