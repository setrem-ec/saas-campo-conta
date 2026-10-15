// Servico PRODUCAO (o core do CampoConta): registra entregas contra a cota.
// Dono do banco producao-db. Ninguem mais le essas tabelas.
const http = require('http');
const { Pool } = require('pg');
const { log, lerEntrada, responder, chamar, dormir } = require('../comum/util');
const { Cota } = require('./cota');

const S = 'producao';
const COBRANCA_URL = process.env.COBRANCA_URL;
const conexao = { host: process.env.DB_HOST, database: 'producao', user: 'app_producao', password: 'lab' };
const pool = new Pool({ ...conexao, max: 5 });       // atende as requisicoes
const poolRelay = new Pool({ ...conexao, max: 1 });  // so o relay da outbox

// Chaves do laboratorio (mudam pelo painel :8081, nunca pelo produto).
const chaves = { 'filtro-app': 'on', 'relay-duplica': 'off' };

// Toda consulta de tenant roda dentro de uma transacao que diz ao banco QUEM e o tenant.
// E esse app.tenant que a politica de RLS do init.sql consulta.
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

// Primeira camada de isolamento: o WHERE do codigo. A chave filtro-app=off simula
// o dev que esqueceu esse WHERE numa consulta.
function filtro(tenant) {
  return chaves['filtro-app'] === 'on'
    ? { sql: ' WHERE tenant_id = $1', params: [tenant] }
    : { sql: '', params: [] };
}

async function listarCotas(tenant) {
  const f = filtro(tenant);
  return comTenant(tenant, async c =>
    (await c.query('SELECT tenant_id, associado, safra, limite_kg, entregue_kg FROM cota' + f.sql + ' ORDER BY id', f.params)).rows);
}

async function listarEntregas(tenant) {
  const f = filtro(tenant);
  return comTenant(tenant, async c =>
    (await c.query('SELECT id, tenant_id, associado, safra, kg FROM entrega' + f.sql + ' ORDER BY id', f.params)).rows);
}

async function buscarEntrega(tenant, id) {
  return comTenant(tenant, async c =>
    (await c.query('SELECT id, tenant_id, associado, safra, kg FROM entrega WHERE id = $1 AND tenant_id = $2', [id, tenant])).rows[0]);
}

// O caso de uso central. Tres gravacoes, UMA transacao: cota, entrega e evento.
// Ou as tres acontecem, ou nenhuma - e por isso que o evento nunca se perde.
async function registrarEntrega(tenant, { associado, safra, kg }) {
  return comTenant(tenant, async c => {
    const linha = (await c.query(
      'SELECT id, limite_kg, entregue_kg FROM cota WHERE tenant_id = $1 AND associado = $2 AND safra = $3 FOR UPDATE',
      [tenant, associado, safra])).rows[0];
    if (!linha) { const e = new Error('cota nao encontrada para este associado e safra'); e.status = 404; throw e; }

    const cota = new Cota({ associado, safra, limiteKg: linha.limite_kg, entregueKg: linha.entregue_kg });
    try { cota.registrarEntrega(kg); } catch (e) { e.status = 422; throw e; }

    await c.query('UPDATE cota SET entregue_kg = $1 WHERE id = $2', [cota.entregueKg, linha.id]);
    const entrega = (await c.query(
      'INSERT INTO entrega (tenant_id, associado, safra, kg) VALUES ($1, $2, $3, $4) RETURNING id',
      [tenant, associado, safra, kg])).rows[0];
    const evento = (await c.query(
      "INSERT INTO outbox (tipo, tenant_id, payload) VALUES ('EntregaRegistrada', $1, $2) RETURNING id",
      [tenant, { entrega_id: entrega.id, associado, safra, kg }])).rows[0];
    return { entrega_id: entrega.id, evento_id: Number(evento.id), entregue_kg: cota.entregueKg, limite_kg: cota.limiteKg };
  });
}

// Relatorio caro de proposito: segura uma conexao do pool por 0,5 s (pg_sleep faz o
// papel do calculo pesado de fechamento de safra). Serve ao experimento do vizinho barulhento.
async function relatorioPesado(tenant) {
  return comTenant(tenant, async c => {
    await c.query('SELECT pg_sleep(0.5)');
    return (await c.query('SELECT count(*)::int AS entregas, coalesce(sum(kg),0)::int AS total_kg FROM entrega WHERE tenant_id = $1', [tenant])).rows[0];
  });
}

// ---- Relay da outbox: le eventos pendentes e entrega para a cobranca, em ordem. ----
// Entrega "pelo menos uma vez": se a cobranca nao confirmar, tenta de novo com recuo.
async function relay() {
  let recuo = 500;
  for (;;) {
    try {
      const pendentes = (await poolRelay.query(
        'SELECT id, tipo, tenant_id, payload FROM outbox WHERE enviado_em IS NULL ORDER BY id LIMIT 10')).rows;
      for (const ev of pendentes) {
        const envios = chaves['relay-duplica'] === 'on' ? 2 : 1; // on = simula o relay que caiu entre enviar e marcar
        for (let i = 0; i < envios; i++) {
          const r = await chamar(COBRANCA_URL + '/eventos', {
            metodo: 'POST', timeoutMs: 2000,
            corpo: { id: Number(ev.id), tipo: ev.tipo, tenant_id: ev.tenant_id, payload: ev.payload },
          });
          if (r.status >= 300) throw new Error('cobranca respondeu ' + r.status);
        }
        await poolRelay.query('UPDATE outbox SET enviado_em = now() WHERE id = $1', [ev.id]);
        log(S + '/relay', `evento ${ev.id} (tenant=${ev.tenant_id}) entregue a cobranca` + (envios === 2 ? ' DUAS VEZES' : ''));
      }
      recuo = 500;
    } catch (erro) {
      log(S + '/relay', `cobranca indisponivel (${erro.message}); evento fica na fila; nova tentativa em ${recuo} ms`);
      await dormir(recuo);
      recuo = Math.min(recuo * 2, 8000);
      continue;
    }
    await dormir(500);
  }
}

http.createServer(async (req, res) => {
  const { caminho, dados } = await lerEntrada(req);
  const tenant = req.headers['x-tenant-id'];
  const rid = req.headers['x-request-id'] || '-';
  try {
    // Rotas internas (painel do laboratorio); nao passam pelo gateway do produto.
    if (caminho === '/lab' && req.method === 'GET') return responder(res, 200, chaves);
    if (caminho.startsWith('/lab/') && req.method === 'POST') {
      const [, , nome, valor] = caminho.split('/');
      if (!(nome in chaves) || !['on', 'off'].includes(valor)) return responder(res, 400, { erro: 'chave ou valor invalido' });
      chaves[nome] = valor;
      log(S, `CHAVE ${nome} = ${valor}`);
      return responder(res, 200, chaves);
    }
    if (caminho === '/interno/fila') {
      const r = await poolRelay.query('SELECT count(*)::int AS pendentes FROM outbox WHERE enviado_em IS NULL');
      return responder(res, 200, r.rows[0]);
    }

    if (!tenant) return responder(res, 400, { erro: 'requisicao sem tenant: so o gateway fala com este servico' });

    if (caminho === '/cotas' && req.method === 'GET') {
      const cotas = await listarCotas(tenant);
      log(S, `req=${rid} tenant=${tenant} GET /cotas -> ${cotas.length} linhas`);
      return responder(res, 200, { tenant, cotas });
    }
    if (caminho === '/entregas' && req.method === 'GET') {
      const entregas = await listarEntregas(tenant);
      log(S, `req=${rid} tenant=${tenant} GET /entregas -> ${entregas.length} linhas`);
      return responder(res, 200, { tenant, entregas });
    }
    if (caminho.startsWith('/entregas/') && req.method === 'GET') {
      const entrega = await buscarEntrega(tenant, parseInt(caminho.split('/')[2]) || 0);
      log(S, `req=${rid} tenant=${tenant} GET ${caminho} -> ${entrega ? 'achou' : 'nao existe para este tenant'}`);
      return entrega ? responder(res, 200, entrega) : responder(res, 404, { erro: 'entrega nao encontrada' });
    }
    if (caminho === '/entregas' && req.method === 'POST') {
      const r = await registrarEntrega(tenant, { associado: dados.associado, safra: dados.safra || '2026', kg: parseInt(dados.kg) });
      log(S, `req=${rid} tenant=${tenant} entrega ${r.entrega_id} gravada + evento ${r.evento_id} na outbox (mesma transacao)`);
      return responder(res, 201, { tenant, ...r });
    }
    if (caminho === '/relatorio-pesado' && req.method === 'GET') {
      const r = await relatorioPesado(tenant);
      return responder(res, 200, { tenant, ...r });
    }
    responder(res, 404, { erro: 'rota desconhecida' });
  } catch (erro) {
    log(S, `req=${rid} tenant=${tenant} ERRO ${erro.message}`);
    responder(res, erro.status || 500, { erro: erro.message });
  }
}).listen(3000, () => { log(S, 'no ar'); relay(); });
