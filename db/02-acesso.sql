-- Papel sem privilégio de superusuário: a API troca para ele a cada transação (SET LOCAL ROLE),
-- e só assim as políticas de Row Level Security valem (superusuário ignora RLS).
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_api') THEN CREATE ROLE app_api NOLOGIN; END IF;
END $$;
GRANT SELECT ON vendedores, conversas, mensagens, analises TO app_api;
GRANT app_api TO pa;
