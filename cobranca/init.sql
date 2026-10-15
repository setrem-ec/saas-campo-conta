-- Banco do contexto COBRANCA. So o servico "cobranca" conecta aqui.
-- Repare: nao existe tabela "entrega" nem "cota" neste banco. O que a cobranca
-- sabe sobre uma entrega chegou por evento e foi copiado para a tabela taxa.

CREATE ROLE app_cobranca LOGIN PASSWORD 'lab';

CREATE TABLE taxa (
  id         serial PRIMARY KEY,
  tenant_id  text NOT NULL,
  entrega_id integer NOT NULL,
  associado  text NOT NULL,
  kg         integer NOT NULL,
  valor      numeric(10,2) NOT NULL,   -- taxa administrativa: R$ 0,05 por kg entregue
  gerada_em  timestamptz NOT NULL DEFAULT now()
);

-- Idempotencia: cada evento so pode ser processado uma vez. A chave primaria e a trava.
CREATE TABLE evento_processado (
  evento_id     bigint PRIMARY KEY,
  processado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE taxa ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolamento ON taxa
  USING (tenant_id = current_setting('app.tenant', true))
  WITH CHECK (tenant_id = current_setting('app.tenant', true));

GRANT SELECT, INSERT ON taxa, evento_processado TO app_cobranca;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_cobranca;

-- Taxas das duas entregas de exemplo que ja existem no banco da producao.
INSERT INTO taxa (tenant_id, entrega_id, associado, kg, valor) VALUES
  ('alvorada', 1, 'A-017', 1200, 60.00),
  ('burica',   2, 'B-101',  900, 45.00);
