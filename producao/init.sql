-- Banco do contexto PRODUCAO. So o servico "producao" conecta aqui.
-- O servico usa o papel app_producao, que NAO e dono das tabelas: por isso a
-- politica de isolamento (RLS) vale para ele.

CREATE ROLE app_producao LOGIN PASSWORD 'lab';

CREATE TABLE cota (
  id          serial PRIMARY KEY,
  tenant_id   text NOT NULL,
  associado   text NOT NULL,
  safra       text NOT NULL,
  limite_kg   integer NOT NULL,
  entregue_kg integer NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, associado, safra)
);

CREATE TABLE entrega (
  id            serial PRIMARY KEY,
  tenant_id     text NOT NULL,
  associado     text NOT NULL,
  safra         text NOT NULL,
  kg            integer NOT NULL,
  registrada_em timestamptz NOT NULL DEFAULT now()
);

-- Outbox: o evento e gravado NA MESMA TRANSACAO da entrega. Um processo a parte
-- (o relay, dentro do servico producao) le daqui e entrega para a cobranca.
CREATE TABLE outbox (
  id         bigserial PRIMARY KEY,
  tipo       text NOT NULL,
  tenant_id  text NOT NULL,
  payload    jsonb NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz
);

-- Segunda camada de isolamento: mesmo que o codigo esqueca o WHERE tenant_id,
-- o banco so devolve linhas do tenant da transacao (app.tenant).
ALTER TABLE cota    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrega ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolamento ON cota
  USING (tenant_id = current_setting('app.tenant', true))
  WITH CHECK (tenant_id = current_setting('app.tenant', true));
CREATE POLICY isolamento ON entrega
  USING (tenant_id = current_setting('app.tenant', true))
  WITH CHECK (tenant_id = current_setting('app.tenant', true));

GRANT SELECT, INSERT, UPDATE ON cota, entrega, outbox TO app_producao;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_producao;

-- Dados de exemplo: duas cooperativas (os dois tenants).
INSERT INTO cota (tenant_id, associado, safra, limite_kg, entregue_kg) VALUES
  ('alvorada', 'A-017', '2026', 10000, 1200),
  ('alvorada', 'A-023', '2026',  6000,    0),
  ('burica',   'B-101', '2026',  8000,  900),
  ('burica',   'B-102', '2026', 12000,    0);

INSERT INTO entrega (tenant_id, associado, safra, kg) VALUES
  ('alvorada', 'A-017', '2026', 1200),
  ('burica',   'B-101', '2026',  900);
