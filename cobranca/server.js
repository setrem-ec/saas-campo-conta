// Servico COBRANCA: gera a taxa administrativa de cada entrega.
// Nao le o banco da producao. Fica sabendo das entregas por EVENTO.
const http = require('http');
const { Pool } = require('pg');
const { log, lerEntrada, responder } = require('../comum/util');

const S = 'cobranca';
const VALOR_POR_KG = 0.05;
const pool = new Pool({ host: process.env.DB_HOST, database: 'cobranca', user: 'app_cobranca', password: 'lab', max: 5 });

// Chave do laboratorio: idempotencia=off simula o consumidor que nao confere se ja processou.
const chaves = { idempotencia: 'on' };

async function comTenant(tenant, trabalho) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query("SELECT set_config('app.tenant', $1, true)", [tenant]);
    const resultado = await trabalho(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw erro;
  } finally {
    cliente.release();
  }
}

// Consumidor do evento EntregaRegistrada. O tenant vem DENTRO do evento: na fila
// nao existe requisicao do usuario nem token - o evento precisa carregar de quem ele e.
async function processarEvento(evento) {
  const { id, tenant_id: tenant, payload } = evento;
  return comTenant(tenant, async c => {
    if (chaves.idempotencia === 'on') {
      const novo = await c.query(
        'INSERT INTO evento_processado (evento_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING evento_id', [id]);
      if (novo.rowCount === 0) return { duplicado: true }; // ja vi este evento: confirmo e nao cobro de novo
    }
    const valor = (payload.kg * VALOR_POR_KG).toFixed(2);
    await c.query(
      'INSERT INTO taxa (tenant_id, entrega_id, associado, kg, valor) VALUES ($1, $2, $3, $4, $5)',
      [tenant, payload.entrega_id, payload.associado, payload.kg, valor]);
    return { duplicado: false, valor };
  });
}

async function listarTaxas(tenant) {
  return comTenant(tenant, async c => {
    const taxas = (await c.query(
      'SELECT entrega_id, associado, kg, valor::float FROM taxa WHERE tenant_id = $1 ORDER BY id', [tenant])).rows;
    const total = taxas.reduce((soma, t) => soma + t.valor, 0);
    return { taxas, total: Number(total.toFixed(2)) };
  });
}

http.createServer(async (req, res) => {
  const { caminho, dados } = await lerEntrada(req);
  const rid = req.headers['x-request-id'] || '-';
  try {
    if (caminho === '/lab' && req.method === 'GET') return responder(res, 200, chaves);
    if (caminho.startsWith('/lab/') && req.method === 'POST') {
      const [, , nome, valor] = caminho.split('/');
      if (!(nome in chaves) || !['on', 'off'].includes(valor)) return responder(res, 400, { erro: 'chave ou valor invalido' });
      chaves[nome] = valor;
      log(S, `CHAVE ${nome} = ${valor}`);
      return responder(res, 200, chaves);
    }

    if (caminho === '/eventos' && req.method === 'POST') {
      const r = await processarEvento(dados);
      log(S, r.duplicado
        ? `evento ${dados.id} (tenant=${dados.tenant_id}) JA PROCESSADO - ignorado`
        : `evento ${dados.id} (tenant=${dados.tenant_id}) -> taxa de R$ ${r.valor} gerada`);
      return responder(res, 200, r);
    }

    const tenant = req.headers['x-tenant-id'];
    if (!tenant) return responder(res, 400, { erro: 'requisicao sem tenant: so o gateway fala com este servico' });

    if (caminho === '/taxas' && req.method === 'GET') {
      const r = await listarTaxas(tenant);
      log(S, `req=${rid} tenant=${tenant} GET /taxas -> ${r.taxas.length} linhas`);
      return responder(res, 200, { tenant, ...r });
    }
    responder(res, 404, { erro: 'rota desconhecida' });
  } catch (erro) {
    log(S, `req=${rid} ERRO ${erro.message}`);
    responder(res, 500, { erro: erro.message });
  }
}).listen(3000, () => log(S, 'no ar'));
