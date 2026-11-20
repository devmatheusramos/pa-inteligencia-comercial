-- Canal de origem da conversa (hoje só WhatsApp; Instagram, webchat, e-mail etc. entram depois sem mudar o modelo).
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS canal TEXT NOT NULL DEFAULT 'whatsapp'
  CHECK (canal IN ('whatsapp', 'instagram', 'webchat', 'email', 'telegram'));

-- A mesma pessoa em canais diferentes é outra conversa: a chave passa a incluir o canal.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'conversas'::regclass AND contype = 'u'
           AND pg_get_constraintdef(oid) = 'UNIQUE (vendedor_id, cliente_hmac)' LOOP
    EXECUTE format('ALTER TABLE conversas DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS conversas_vendedor_canal_cliente_uq ON conversas (vendedor_id, canal, cliente_hmac);

-- Resumo em linguagem simples, gerado pelo Analista (prompt próprio, separado da classificação de etapa).
ALTER TABLE analises ADD COLUMN IF NOT EXISTS resumo TEXT;
ALTER TABLE analises ADD COLUMN IF NOT EXISTS resumo_prompt TEXT;

GRANT SELECT ON conversas, analises TO app_api;
