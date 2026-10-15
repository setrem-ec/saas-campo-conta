// PEDIDOS: chama o faturamento e libera o "caminhao".
// Resiliencia DESLIGADA por padrao - liga por variavel de ambiente:
//   TIMEOUT_MS  (0 = espera o quanto o outro quiser)
//   RETRIES     (tentativas extras, com recuo exponencial)
//   BREAKER     ('on' = circuit breaker: abre com 3 falhas seguidas, 15 s)
const http = require('http');
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '0');
const RETRIES = parseInt(process.env.RETRIES || '0');
const BREAKER = process.env.BREAKER === 'on';
const ALVO = process.env.ALVO || 'http://faturamento-svc';
let falhasSeguidas = 0, abertoAte = 0;

function chamaFaturamento() {
  return new Promise((resolve, reject) => {
    const req = http.get(ALVO + '/nf', res => {
      let corpo = '';
      res.on('data', c => corpo += c);
      res.on('end', () => resolve(JSON.parse(corpo)));
    });
    req.on('error', reject);
    if (TIMEOUT_MS > 0)
      req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('timeout apos ' + TIMEOUT_MS + 'ms')));
  });
}

async function comResiliencia() {
  if (BREAKER && Date.now() < abertoAte)
    throw new Error('circuito ABERTO - nem tentei (poupa o faturamento)');
  for (let tentativa = 0; ; tentativa++) {
    try {
      const nf = await chamaFaturamento();
      falhasSeguidas = 0;
      return nf;
    } catch (erro) {
      falhasSeguidas++;
      if (BREAKER && falhasSeguidas >= 3) {
        abertoAte = Date.now() + 15000;   // abre por 15 s; depois "meio-abre"
        console.log('BREAKER ABERTO por 15 s (3 falhas seguidas)');
      }
      if (tentativa >= RETRIES) throw erro;
      const recuo = 500 * Math.pow(2, tentativa);   // 0,5 s -> 1 s -> 2 s
      console.log('retry em ' + recuo + 'ms (tentativa ' + (tentativa + 1) + ')');
      await new Promise(r => setTimeout(r, recuo));
    }
  }
}

http.createServer(async (req, res) => {
  const inicio = Date.now();
  try {
    const nf = await comResiliencia();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ caminhao: 'LIBERADO', nf, total_ms: Date.now() - inicio }));
  } catch (erro) {
    // FALLBACK: o plano B declarado - caminhao sai, NF fica pendente
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ caminhao: 'LIBERADO (fallback)', nf: 'PENDENTE',
      motivo: erro.message, total_ms: Date.now() - inicio }));
  }
}).listen(3000, () => console.log('pedidos no ar (TIMEOUT_MS=' + TIMEOUT_MS +
  ' RETRIES=' + RETRIES + ' BREAKER=' + (BREAKER ? 'on' : 'off') + ')'));
