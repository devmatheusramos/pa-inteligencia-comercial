-- Esquema inicial do MVP. Texto de mensagem é sempre gravado já mascarado.
CREATE TYPE papel AS ENUM ('gestor', 'vendedor');
CREATE TYPE etapa AS ENUM ('prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'perdido');

CREATE TABLE vendedores (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  numero_wa_id  TEXT UNIQUE NOT NULL
);

CREATE TABLE conversas (
  id                 BIGSERIAL PRIMARY KEY,
  vendedor_id        TEXT NOT NULL REFERENCES vendedores(id),
  cliente_hmac       TEXT NOT NULL,
  ultima_mensagem_em TIMESTAMPTZ,
  UNIQUE (vendedor_id, cliente_hmac)
);

CREATE TABLE mensagens (
  id               TEXT PRIMARY KEY,           -- id da Meta, garante idempotência
  conversa_id      BIGINT NOT NULL REFERENCES conversas(id),
  vendedor_id      TEXT NOT NULL,
  de               TEXT NOT NULL CHECK (de IN ('cliente', 'vendedor')),
  enviada_em       TIMESTAMPTZ NOT NULL,
  texto_mascarado  TEXT NOT NULL
);

CREATE TABLE analises (
  conversa_id     BIGINT PRIMARY KEY REFERENCES conversas(id),
  vendedor_id     TEXT NOT NULL,
  etapa           etapa NOT NULL,
  pendencias      JSONB NOT NULL DEFAULT '[]',
  proximo_passo   TEXT,
  tpr_minutos     INTEGER,
  tmr_minutos     INTEGER,
  modelo          TEXT NOT NULL,
  versao_prompt   TEXT NOT NULL,
  analisada_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security: vendedor só enxerga a própria carteira; gestor enxerga tudo.
-- A API define app.papel e app.vendedor_id a cada transação a partir do token.
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises  ENABLE ROW LEVEL SECURITY;

CREATE POLICY por_perfil ON conversas USING (
  current_setting('app.papel', true) = 'gestor'
  OR vendedor_id = current_setting('app.vendedor_id', true));
CREATE POLICY por_perfil ON mensagens USING (
  current_setting('app.papel', true) = 'gestor'
  OR vendedor_id = current_setting('app.vendedor_id', true));
CREATE POLICY por_perfil ON analises USING (
  current_setting('app.papel', true) = 'gestor'
  OR vendedor_id = current_setting('app.vendedor_id', true));
