// GATEWAY: a unica porta do produto (8080). Faz quatro coisas, nesta ordem:
//   1. descobre QUEM esta chamando (token -> tenant)
//   2. aplica o limite POR TENANT
//   3. encaminha ao servico dono da rota, com o tenant num cabecalho
//   4. compoe o relatorio que precisa de dois servicos
// A porta 8081 e o painel do laboratorio (chaves dos experimentos).
const http = require('http');
const crypto = require('crypto');
const { log, lerEntrada, responder, chamar } = require('../comum/util');

const S = 'gateway';
const PRODUCAO = process.env.PRODUCAO_URL;
const COBRANCA = process.env.COBRANCA_URL;

// Autenticacao de bancada: token fixo -> tenant. Num produto real isto e um JWT
// assinado por um provedor de identidade; o que importa aqui e ONDE o tenant nasce.
const TOKENS = {
  'tok-alvorada': { tenant: 'alvorada', usuario: 'ana' },
  'tok-burica':   { tenant: 'burica',   usuario: 'beto' },
};

// Rota -> servico dono. E a "descoberta de servico" na forma mais simples:
// o gateway conhece os servicos pelo NOME (producao, cobranca), nao pelo endereco.
const ROTAS = [
  { prefixo: '/cotas',            destino: PRODUCAO, nome: 'producao' },
  { prefixo: '/entregas',         destino: PRODUCAO, nome: 'producao' },
  { prefixo: '/relatorio-pesado', destino: PRODUCAO, nome: 'producao' },
  { prefixo: '/taxas',            destino: COBRANCA, nome: 'cobranca' },
];

// Limite por tenant: no maximo 3 requisicoes em andamento por tenant. A quarta recebe 429.
const MAX_SIMULTANEAS = 3;
const emAndamento = {};
const chaves = { 'limite-tenant': 'on' };

function identificar(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return TOKENS[token];
}

// Relatorio "producao x cobranca": nao existe JOIN entre dois bancos. O gateway chama
// os dois servicos e junta as respostas (composicao de API). Cada chamada tem timeout
// de 2 s e plano B: se a cobranca nao responder, o relatorio sai parcial, nao trava.
async function relatorio(quem, cabecalhos) {
  const [cotas, taxas] = await Promise.allSettled([
    chamar(PRODUCAO + '/cotas', { cabecalhos, timeoutMs: 2000 }),
    chamar(COBRANCA + '/taxas', { cabecalhos, timeoutMs: 2000 }),
  ]);
  const ok = r => r.status === 'fulfilled' && r.value.status === 200;
  return {
    tenant: quem.tenant,
    producao: ok(cotas) ? cotas.value.corpo.cotas : 'INDISPONIVEL',
    cobranca: ok(taxas) ? { total: taxas.value.corpo.total, taxas: taxas.value.corpo.taxas } : 'INDISPONIVEL (relatorio parcial)',
  };
}

http.createServer(async (req, res) => {
  const inicio = Date.now();
  const caminho = new URL(req.url, 'http://x').pathname;
  if (caminho === '/saude') return responder(res, 200, { gateway: 'ok' });

  const quem = identificar(req);
  if (!quem) return responder(res, 401, { erro: 'token ausente ou invalido' });
  const { tenant } = quem;
  const rid = crypto.randomBytes(3).toString('hex');

  if (chaves['limite-tenant'] === 'on' && (emAndamento[tenant] || 0) >= MAX_SIMULTANEAS) {
    return responder(res, 429, { erro: `limite do tenant ${tenant}: ${MAX_SIMULTANEAS} requisicoes simultaneas` });
  }
  emAndamento[tenant] = (emAndamento[tenant] || 0) + 1;

  // O cabecalho x-tenant-id que o cliente mandar e DESCARTADO: quem define o tenant e o token.
  const cabecalhos = { 'x-tenant-id': tenant, 'x-usuario': quem.usuario, 'x-request-id': rid };
  try {
    if (caminho === '/eu') return responder(res, 200, quem);
    if (caminho === '/relatorio') {
      const r = await relatorio(quem, cabecalhos);
      log(S, `req=${rid} tenant=${tenant} GET /relatorio (composicao) ${Date.now() - inicio} ms`);
      return responder(res, 200, { ...r, total_ms: Date.now() - inicio });
    }
    const rota = ROTAS.find(r => caminho === r.prefixo || caminho.startsWith(r.prefixo + '/'));
    if (!rota) return responder(res, 404, { erro: 'rota desconhecida' });

    const { dados } = await lerEntrada(req);
    const temCorpo = req.method !== 'GET' && Object.keys(dados).length > 0;
    log(S, `req=${rid} tenant=${tenant} ${req.method} ${caminho} -> ${rota.nome}`);
    const r = await chamar(rota.destino + caminho, {
      metodo: req.method, cabecalhos, corpo: temCorpo ? dados : undefined, timeoutMs: 10000,
    });
    responder(res, r.status, r.corpo);
  } catch (erro) {
    log(S, `req=${rid} tenant=${tenant} FALHA ${erro.name}: servico nao respondeu`);
    responder(res, 503, { erro: 'servico indisponivel', total_ms: Date.now() - inicio });
  } finally {
    emAndamento[tenant]--;
  }
}).listen(8080, () => log(S, 'produto na porta 8080'));

// ---------------- Painel do laboratorio (8081) ----------------
// GET  /chaves               -> estado de todas as chaves
// POST /chaves/<nome>/<on|off>
// GET  /fila                 -> eventos da outbox ainda nao entregues
const DONO = { 'limite-tenant': null, 'filtro-app': PRODUCAO, 'relay-duplica': PRODUCAO, 'idempotencia': COBRANCA };

http.createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://x').pathname;
  try {
    if (caminho === '/fila') {
      const r = await chamar(PRODUCAO + '/interno/fila');
      return responder(res, 200, r.corpo);
    }
    if (caminho === '/chaves' && req.method === 'GET') {
      const estado = { ...chaves };
      for (const [nome, url] of [['producao', PRODUCAO], ['cobranca', COBRANCA]]) {
        try { Object.assign(estado, (await chamar(url + '/lab')).corpo); } catch { estado[nome] = 'FORA DO AR'; }
      }
      return responder(res, 200, estado);
    }
    if (caminho.startsWith('/chaves/') && req.method === 'POST') {
      const [, , nome, valor] = caminho.split('/');
      if (!(nome in DONO) || !['on', 'off'].includes(valor)) return responder(res, 400, { erro: 'use /chaves/<nome>/<on|off>', chaves: Object.keys(DONO) });
      if (DONO[nome] === null) { chaves[nome] = valor; log(S, `CHAVE ${nome} = ${valor}`); return responder(res, 200, { [nome]: valor }); }
      const r = await chamar(`${DONO[nome]}/lab/${nome}/${valor}`, { metodo: 'POST' });
      return responder(res, r.status, { [nome]: r.corpo[nome] });
    }
    responder(res, 404, { erro: 'painel: use /chaves ou /fila' });
  } catch (erro) {
    responder(res, 503, { erro: 'servico dono da chave esta fora do ar' });
  }
}).listen(8081, () => log(S, 'painel do laboratorio na porta 8081'));
