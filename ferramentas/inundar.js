// Vizinho barulhento: o tenant ALVORADA dispara 60 relatorios pesados de uma vez,
// e medimos quanto o tenant BURICA espera por uma consulta simples enquanto isso.
// Uso: docker compose run --rm ferramentas node inundar.js
const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8080';
const pedir = (caminho, token) => fetch(GATEWAY + caminho, { headers: { Authorization: 'Bearer ' + token } });

async function main() {
  const contagem = {};
  const inundacao = Array.from({ length: 60 }, () =>
    pedir('/relatorio-pesado', 'tok-alvorada').then(r => { contagem[r.status] = (contagem[r.status] || 0) + 1; }));

  const esperas = [];
  let terminou = false;
  Promise.all(inundacao).then(() => { terminou = true; });
  while (!terminou) {
    const inicio = Date.now();
    const r = await pedir('/cotas', 'tok-burica');
    await r.text();
    esperas.push(Date.now() - inicio);
    await new Promise(x => setTimeout(x, 200));
  }

  esperas.sort((a, b) => a - b);
  console.log('ALVORADA (60 relatorios pesados de uma vez) - respostas por status:', contagem);
  console.log(`BURICA (GET /cotas durante a inundacao) - ${esperas.length} medidas: ` +
    `menor ${esperas[0]} ms | mediana ${esperas[Math.floor(esperas.length / 2)]} ms | maior ${esperas[esperas.length - 1]} ms`);
}
main();
