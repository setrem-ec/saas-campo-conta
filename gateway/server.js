// GATEWAY: a unica porta do produto (8080). Faz quatro coisas, nesta ordem:
//   1. descobre QUEM esta chamando (token -> tenant)
//   2. aplica o limite POR TENANT, em duas faixas (o excedente espera numa fila, com teto)
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

// Limite por tenant com fila (ADR 012). Cada tenant tem DUAS faixas, cada uma com seu
// teto de requisicoes em andamento e sua fila:
//   - geral:  as rotas rapidas. O teto e alto.
//   - pesada: as rotas que seguram uma conexao do banco por muito tempo. O teto e baixo,
//             menor que o pool da producao, para um tenant nao tirar o banco do outro.
// A requisicao excedente ESPERA na fila da faixa. So recebe 429 se a fila estiver cheia
// ou se a espera passar de ESPERA_MAXIMA_MS. Os padroes vem da medicao citada no ADR 012.
// Numero invalido na variavel de ambiente (vazio, texto, negativo) cai no padrao.
const inteiro = (nome, padrao) => { const n = Number(process.env[nome]); return Number.isInteger(n) && n >= 0 ? n : padrao; };
const ROTAS_PESADAS = (process.env.ROTAS_PESADAS || '/relatorio-pesado').split(',').map(r => r.trim()).filter(Boolean);
const FAIXAS = {
  geral:  { max: inteiro('MAX_SIMULTANEAS', 40), fila: inteiro('FILA_MAXIMA', 80) },
  pesada: { max: inteiro('MAX_PESADAS', 8),      fila: inteiro('FILA_PESADAS', 64) },
};
const ESPERA_MAXIMA_MS = inteiro('ESPERA_MAXIMA_MS', 5000);
const emAndamento = {};  // "tenant faixa" -> requisicoes em andamento
const filas = {};        // "tenant faixa" -> pedidos esperando vaga, do mais antigo para o mais novo
const chaves = { 'limite-tenant': 'on' };

const faixaDe = caminho => ROTAS_PESADAS.some(p => caminho === p || caminho.startsWith(p + '/')) ? 'pesada' : 'geral';

// Devolve 'vaga' quando o pedido pode seguir, ou o motivo da recusa.
function pedirVaga(tenant, faixa, res) {
  const chave = tenant + ' ' + faixa;
  if (chaves['limite-tenant'] !== 'on' || (emAndamento[chave] || 0) < FAIXAS[faixa].max) {
    emAndamento[chave] = (emAndamento[chave] || 0) + 1;
    return Promise.resolve('vaga');
  }
  const fila = filas[chave] || (filas[chave] = []);
  if (fila.length >= FAIXAS[faixa].fila) return Promise.resolve('fila cheia');
  return new Promise(resolver => {
    const espera = { resolver };
    const sair = motivo => {
      const posicao = fila.indexOf(espera);
      if (posicao === -1) return;  // ja recebeu a vaga
      fila.splice(posicao, 1);
      clearTimeout(espera.prazo);
      resolver(motivo);
    };
    espera.prazo = setTimeout(() => sair('espera esgotada'), ESPERA_MAXIMA_MS);
    res.once('close', () => sair('cliente desistiu'));
    fila.push(espera);
  });
}

// Quem termina passa a vaga ao mais antigo da fila; sem fila, a vaga volta a faixa do tenant.
function devolverVaga(tenant, faixa) {
  const chave = tenant + ' ' + faixa;
  const proximo = (filas[chave] || []).shift();
  if (!proximo) { emAndamento[chave]--; return; }
  clearTimeout(proximo.prazo);
  proximo.resolver('vaga');
}

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

  const faixa = faixaDe(caminho);
  const vaga = await pedirVaga(tenant, faixa, res);
  if (vaga === 'cliente desistiu') return;
  if (vaga !== 'vaga') {
    log(S, `req=${rid} tenant=${tenant} faixa=${faixa} RECUSADO (${vaga}) apos ${Date.now() - inicio} ms`);
    res.setHeader('Retry-After', '1');  // em segundos: quando vale tentar de novo
    return responder(res, 429, {
      erro: `limite do tenant ${tenant}, faixa ${faixa}: ${vaga} (teto de ${FAIXAS[faixa].max} requisicoes em andamento)`,
      esperou_ms: Date.now() - inicio,
    });
  }

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
    devolverVaga(tenant, faixa);
  }
}).listen(8080, () => log(S, 'produto na porta 8080'));

// ---------------- Painel do laboratorio (8081) ----------------
// GET  /chaves               -> estado de todas as chaves
// POST /chaves/<nome>/<on|off>
// GET  /fila                 -> eventos da outbox ainda nao entregues
// GET  /limite               -> limite por tenant e por faixa: configuracao, pedidos em andamento e na fila
const DONO = { 'limite-tenant': null, 'filtro-app': PRODUCAO, 'relay-duplica': PRODUCAO, 'idempotencia': COBRANCA };

http.createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://x').pathname;
  try {
    if (caminho === '/fila') {
      const r = await chamar(PRODUCAO + '/interno/fila');
      return responder(res, 200, r.corpo);
    }
    if (caminho === '/limite') {
      const tenants = {};
      const faixas = {};
      for (const [faixa, { max, fila }] of Object.entries(FAIXAS)) faixas[faixa] = { max_simultaneas: max, fila_maxima: fila };
      faixas.pesada.rotas = ROTAS_PESADAS;
      for (const { tenant } of Object.values(TOKENS)) {
        tenants[tenant] = {};
        for (const faixa of Object.keys(FAIXAS)) {
          const chave = tenant + ' ' + faixa;
          tenants[tenant][faixa] = { em_andamento: emAndamento[chave] || 0, na_fila: (filas[chave] || []).length };
        }
      }
      return responder(res, 200, { espera_maxima_ms: ESPERA_MAXIMA_MS, faixas, tenants });
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
    responder(res, 404, { erro: 'painel: use /chaves, /fila ou /limite' });
  } catch (erro) {
    responder(res, 503, { erro: 'servico dono da chave esta fora do ar' });
  }
}).listen(8081, () => log(S, 'painel do laboratorio na porta 8081'));
