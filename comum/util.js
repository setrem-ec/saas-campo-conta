// Utilitarios compartilhados pelos tres servicos: log, leitura de requisicao,
// resposta JSON e chamada HTTP com TIMEOUT (nenhuma chamada entre servicos sai sem limite).

function log(servico, msg) {
  const hora = new Date().toISOString().slice(11, 23);
  console.log(`${hora} [${servico}] ${msg}`);
}

// Aceita parametros na URL (?kg=400) ou corpo JSON. A URL existe para o curl do
// PowerShell, que estraga aspas de JSON.
async function lerEntrada(req) {
  const url = new URL(req.url, 'http://x');
  const dados = Object.fromEntries(url.searchParams);
  let corpo = '';
  for await (const pedaco of req) corpo += pedaco;
  if (corpo.trim()) {
    try { Object.assign(dados, JSON.parse(corpo)); } catch { /* corpo nao-JSON: ignora */ }
  }
  return { caminho: url.pathname, dados };
}

function responder(res, status, objeto) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(objeto) + '\n');
}

// Chamada a outro servico. Estourou timeoutMs, desiste e lanca erro: quem chamou decide o plano B.
async function chamar(url, { metodo = 'GET', cabecalhos = {}, corpo, timeoutMs = 2000 } = {}) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let json = null;
  try { json = await resposta.json(); } catch { /* sem corpo */ }
  return { status: resposta.status, corpo: json };
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

module.exports = { log, lerEntrada, responder, chamar, dormir };
