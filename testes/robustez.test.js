// Um endereço malformado não pode derrubar o produto.
// Achado da verificação de segurança de 24/11/2026 (docs/seguranca-enc15.md, achado S1):
// um único pedido para "//", sem token, fazia o `new URL` lançar fora do try e o processo
// do gateway terminar. Nada o sobe de volta: o produto inteiro sai do ar para todas as cooperativas.
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test --test-concurrency=1
// O pedido vai pelo módulo http do Node, e não pelo fetch, para o endereço chegar ao
// servidor exatamente como foi escrito ("//"), sem normalização.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const GATEWAY = new URL(process.env.GATEWAY_URL || 'http://127.0.0.1:8080');

function pedirCru(caminho) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: GATEWAY.hostname, port: GATEWAY.port, path: caminho, method: 'GET', timeout: 5000 },
      res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('timeout', () => req.destroy(new Error('sem resposta em 5 s')));
    req.on('error', reject);
    req.end();
  });
}

test('endereço malformado', async (t) => {
  await t.test('"//" recebe 400, e não derruba o gateway', async () => {
    const status = await pedirCru('//');
    assert.equal(status, 400);
  });

  await t.test('depois do "//", o gateway continua respondendo', async () => {
    const status = await pedirCru('/saude');
    assert.equal(status, 200);
  });
});
