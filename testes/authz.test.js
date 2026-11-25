// Autorização por tenant, rota a rota (docs/seguranca-enc15.md, seção 1).
// authz é autorização: quem pode acessar o quê. Três perguntas para cada rota do produto:
//   1. sem token, a rota recusa (401)?
//   2. com token inválido, a rota recusa (401)?
//   3. um cabeçalho x-tenant-id forjado troca o tenant? (não pode: o tenant vem do token)
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test --test-concurrency=1
// Só leitura: nenhuma rota daqui grava (o POST /entregas sem token é recusado antes).
const test = require('node:test');
const assert = require('node:assert/strict');

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';

// Todas as rotas do produto que mostram ou gravam dado de tenant (a tabela da seção 1).
const ROTAS = [
  ['GET', '/eu'],
  ['GET', '/cotas'],
  ['GET', '/entregas'],
  ['GET', '/entregas/1'],
  ['POST', '/entregas'],
  ['GET', '/relatorio-pesado'],
  ['GET', '/taxas'],
  ['GET', '/relatorio'],
];

async function pedir(metodo, caminho, cabecalhos = {}) {
  const r = await fetch(GATEWAY + caminho, {
    method: metodo, headers: cabecalhos, signal: AbortSignal.timeout(10000),
  });
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo JSON */ }
  return { status: r.status, corpo };
}

test('autorização por tenant', async (t) => {
  for (const [metodo, rota] of ROTAS) {
    await t.test(`${metodo} ${rota} sem token responde 401`, async () => {
      assert.equal((await pedir(metodo, rota)).status, 401);
    });
    await t.test(`${metodo} ${rota} com token inválido responde 401`, async () => {
      assert.equal((await pedir(metodo, rota, { authorization: 'Bearer tok-inventado' })).status, 401);
    });
  }

  // O esperado vem daqui ('burica'), nunca da resposta que está sendo conferida.
  const forjado = { authorization: 'Bearer tok-burica', 'x-tenant-id': 'alvorada' };

  await t.test('cabeçalho x-tenant-id forjado não troca o tenant (/eu)', async () => {
    const r = await pedir('GET', '/eu', forjado);
    assert.equal(r.status, 200);
    assert.equal(r.corpo.tenant, 'burica');
  });

  await t.test('cabeçalho forjado não traz cota de outro tenant (/cotas)', async () => {
    const r = await pedir('GET', '/cotas', forjado);
    assert.equal(r.status, 200);
    assert.equal(r.corpo.tenant, 'burica');
    assert.ok(r.corpo.cotas.length > 0, 'a Buricá tem cotas nos dados de exemplo');
    assert.ok(r.corpo.cotas.every(c => c.tenant_id === 'burica'),
      'VAZAMENTO: /cotas com cabeçalho forjado trouxe cota de outro tenant');
  });

  await t.test('o relatório composto só traz o próprio tenant (/relatorio)', async () => {
    const r = await pedir('GET', '/relatorio', forjado);
    assert.equal(r.status, 200);
    assert.equal(r.corpo.tenant, 'burica');
    assert.ok(Array.isArray(r.corpo.producao), 'a parte da produção veio indisponível');
    assert.ok(r.corpo.producao.every(c => c.tenant_id === 'burica'),
      'VAZAMENTO: /relatorio trouxe cota de outro tenant');
  });
});
