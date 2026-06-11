-- ════════════════════════════════════════════════════════════════════
-- Restaura os privilégios do service_role nas tabelas do app.
--
-- Sintoma: o cliente admin (chave secreta → role service_role) recebia
-- "42501: permission denied for table profiles". Isso quebrava o guard do
-- /api/checkout (lia o profile como null → "complete seu cadastro") e o
-- grant de Premium no webhook do Stripe (upsert em profiles era negado).
--
-- service_role é usado SOMENTE no servidor (webhook, checkout, sync) e
-- ignora RLS — ter acesso total é o padrão do Supabase. Não concede nada
-- a anon/authenticated (o modelo de segurança desses continua intacto).
-- Idempotente.
-- ════════════════════════════════════════════════════════════════════

begin;

grant usage on schema public to service_role;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;

-- Tabelas/sequences criadas no futuro também já nascem acessíveis.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines  to service_role;

commit;
