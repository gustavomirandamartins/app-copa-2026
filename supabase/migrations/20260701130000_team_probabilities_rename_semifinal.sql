-- A tabela team_probabilities foi criada (20260615010000) com a coluna
-- `semifinal` (sem underscore). A migração seguinte (20260630120000) usa
-- `create table if not exists` com `semi_final`, mas como a tabela já
-- existia isso foi um no-op — a coluna real ficou `semifinal`, enquanto o
-- código (upload da planilha) grava em `semi_final`, causando
-- "Could not find the 'semi_final' column ... in the schema cache".
-- Renomeia para alinhar tabela e código, preservando os dados existentes.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_probabilities' and column_name = 'semifinal'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_probabilities' and column_name = 'semi_final'
  ) then
    alter table public.team_probabilities rename column semifinal to semi_final;
  end if;
end $$;
