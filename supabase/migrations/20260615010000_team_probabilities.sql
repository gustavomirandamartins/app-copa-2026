-- Probabilidades por seleção (modelo UFMG), atualizáveis pelo admin.
-- Leitura pública; escrita apenas via service_role (sem policy de write).

create table if not exists public.team_probabilities (
  team_id        text primary key,
  champion       numeric not null default 0,
  final          numeric not null default 0,
  semifinal      numeric not null default 0,
  quarter_final  numeric not null default 0,
  round_of_16    numeric not null default 0,
  round_of_32    numeric not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.team_probabilities enable row level security;

-- Qualquer um pode ler (dados públicos, sem informação sensível).
drop policy if exists "team_probabilities readable by all" on public.team_probabilities;
create policy "team_probabilities readable by all"
  on public.team_probabilities for select using (true);

grant select on public.team_probabilities to anon, authenticated;
-- Sem grant de insert/update/delete: somente o service_role (admin) escreve.

-- Semente com a coleta de 15/06/2026 (dados reais UFMG).
insert into public.team_probabilities
  (team_id, champion, final, semifinal, quarter_final, round_of_16, round_of_32)
values
  ('esp', 4.5, 8.5, 15.45, 27.5, 47.6, 85.5),
  ('arg', 4.5, 8.4, 15.49, 27.4, 47.4, 84.8),
  ('fra', 4.5, 8.1, 14.96, 26.6, 48.0, 81.2),
  ('eng', 3.8, 7.3, 13.79, 26.0, 48.4, 85.3),
  ('ger', 3.8, 8.8, 16.45, 29.9, 56.2, 98.4),
  ('mex', 3.7, 7.2, 14.14, 28.1, 54.8, 95.7),
  ('por', 3.7, 7.1, 13.47, 25.5, 46.0, 79.9),
  ('bel', 3.5, 6.9, 13.11, 25.0, 47.7, 84.1),
  ('bra', 3.4, 5.9, 11.53, 22.5, 42.6, 84.3),
  ('ned', 3.2, 5.2, 10.29, 20.0, 37.5, 74.7),
  ('mar', 3.0, 5.5, 10.94, 21.8, 41.4, 83.4),
  ('cro', 3.0, 5.8, 11.39, 22.2, 43.2, 80.5),
  ('kor', 3.0, 5.9, 11.91, 24.8, 51.1, 93.9),
  ('usa', 2.7, 7.8, 14.91, 28.7, 55.3, 96.7),
  ('sen', 2.6, 5.0, 9.84, 19.0, 37.0, 69.4),
  ('uru', 2.3, 4.6, 9.13, 17.8, 34.2, 71.2),
  ('sui', 2.1, 3.8, 7.96, 17.2, 36.4, 73.3),
  ('col', 2.1, 4.3, 8.74, 17.7, 35.1, 68.2),
  ('irn', 2.0, 4.3, 8.76, 18.0, 37.7, 74.1),
  ('jpn', 2.0, 4.0, 8.16, 16.6, 33.0, 70.2),
  ('civ', 2.0, 5.9, 11.99, 23.6, 48.5, 95.1),
  ('aut', 2.0, 4.0, 8.22, 16.4, 32.2, 67.6),
  ('alg', 1.9, 3.9, 8.06, 16.2, 32.0, 68.1),
  ('tur', 1.9, 1.8, 3.72, 7.5, 16.2, 36.2),
  ('nor', 1.9, 3.8, 7.65, 15.3, 31.1, 61.9),
  ('ecu', 1.8, 2.3, 4.75, 10.3, 22.1, 51.3),
  ('par', 1.8, 2.0, 4.19, 8.5, 18.4, 40.1),
  ('swe', 1.7, 5.6, 11.5, 24.1, 46.5, 96.9),
  ('egy', 1.6, 3.5, 7.4, 15.6, 34.0, 69.7),
  ('sco', 1.6, 4.5, 9.45, 20.0, 41.2, 90.5),
  ('tun', 1.6, 1.4, 2.92, 6.0, 12.6, 29.0),
  ('cod', 1.5, 3.2, 6.74, 14.1, 29.5, 60.6),
  ('can', 1.5, 2.7, 6.01, 13.8, 30.1, 64.7),
  ('aus', 1.4, 5.1, 10.54, 21.7, 46.7, 92.8),
  ('irq', 1.4, 2.8, 5.83, 12.1, 25.5, 53.3),
  ('uzb', 1.4, 2.9, 6.07, 12.9, 27.3, 57.2),
  ('ksa', 1.3, 2.8, 5.95, 12.3, 25.4, 58.5),
  ('qat', 1.2, 2.7, 5.85, 13.3, 30.1, 65.6),
  ('bih', 1.2, 2.4, 5.45, 12.5, 28.4, 62.4),
  ('cze', 1.0, 2.0, 4.27, 9.4, 20.2, 43.4),
  ('pan', 0.9, 2.0, 4.41, 10.0, 22.8, 54.5),
  ('cpv', 0.9, 1.9, 4.12, 8.9, 19.5, 49.0),
  ('jor', 0.8, 1.7, 3.67, 8.1, 17.9, 43.4),
  ('gha', 0.7, 1.5, 3.39, 7.9, 18.7, 46.9),
  ('rsa', 0.6, 1.3, 2.89, 6.6, 15.0, 33.7),
  ('hti', 0.5, 0.4, 0.91, 2.2, 5.4, 16.0),
  ('nzl', 0.5, 1.1, 2.52, 6.0, 15.4, 38.3),
  ('cur', 0.5, 0.5, 1.1, 2.7, 6.7, 18.6)
on conflict (team_id) do nothing;
