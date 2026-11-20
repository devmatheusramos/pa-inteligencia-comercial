-- Cadastro de vendedores pelo gestor: celular, link de convite e estado da conexão do WhatsApp.
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS convite_token TEXT UNIQUE;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS whatsapp_estado TEXT NOT NULL DEFAULT 'aguardando'
  CHECK (whatsapp_estado IN ('aguardando', 'conectado', 'desconectado', 'simulado'));
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS vendedores_telefone_uq ON vendedores (telefone) WHERE telefone IS NOT NULL;

-- Vendedores das conversas simuladas não têm WhatsApp real.
UPDATE vendedores SET whatsapp_estado = 'simulado' WHERE telefone IS NULL AND convite_token IS NULL AND whatsapp_estado = 'aguardando';

-- O papel da API só enxerga as colunas que as consultas de painel usam: telefone e token de convite ficam fora (só o gestor, pela API).
REVOKE SELECT ON vendedores FROM app_api;
GRANT SELECT (id, nome, numero_wa_id) ON vendedores TO app_api;
