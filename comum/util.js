// Utilitarios compartilhados pelos tres servicos: log, leitura de requisicao,
// resposta JSON e chamada HTTP com TIMEOUT (nenhuma chamada entre servicos sai sem limite).

function log(servico, msg) {
  const hora = new Date().toISOString().slice(11, 23);
  console.log(`${hora} [${servico}] ${msg}`);
}

// Endereco malformado (ex.: "//") faz o new URL lancar. Aqui vira null, e quem chamou
// responde 400: uma excecao fora do try derrubaria o processo, e nada o sobe de volta
// (achado S1 de docs/seguranca-enc15.md).
function lerUrl(req) {
  try { return new URL(req.url, 'http://x'); } catch { return null; }
}

// Aceita parametros na URL (?kg=400) ou corpo JSON. A URL existe para o curl do
// PowerShell, que estraga aspas de JSON. Endereco malformado: caminho null.
async function lerEntrada(req) {
  const url = lerUrl(req);
  if (!url) return { caminho: null, dados: {} };
  const dados = Object.fromEntries(url.searchParams);
  let corpo = '';
  for await (const pedaco of req) corpo += pedaco;
  if (corpo.trim()) {
    // Copia campo a campo, sem "__proto__": com Object.assign, um corpo {"__proto__": {...}}
    // trocaria o prototipo de "dados" (achado S3 de docs/seguranca-enc15.md).
    try {
      for (const [chave, valor] of Object.entries(JSON.parse(corpo)))
        if (chave !== '__proto__') dados[chave] = valor;
    } catch { /* corpo nao-JSON (ou JSON que nao e objeto): ignora */ }
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

module.exports = { log, lerUrl, lerEntrada, responder, chamar, dormir };
