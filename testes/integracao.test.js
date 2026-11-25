// Testes de integração: cada um confere UMA defesa sozinha, com a outra desligada de propósito.
// Usam as chaves do painel de laboratório (8081), as mesmas dos experimentos de aula.
//
//   1. Política por linha do banco (ADR 002). O teste de isolamento passa mesmo se o filtro do
//      código cair, porque o banco segura. Aqui o filtro do código é DESLIGADO: se a lista
//      continuar limpa, quem segurou foi o banco.
//   2. Consumidor idempotente (ADR 006). O relay é posto para entregar cada evento DUAS vezes:
//      a cobrança tem de gerar uma taxa só.
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test --test-concurrency=1
// Um arquivo por vez: estes testes mudam chaves que valem para o sistema inteiro.
// Cada teste devolve a chave ao padrão no fim, mesmo quando falha.
//
// Efeito de cada execução: duas entregas de 1 kg (uma por teste) e as taxas que elas geram.
const test = require('node:test');
const assert = require('node:assert/strict');

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const PAINEL = process.env.PAINEL_URL || 'http://127.0.0.1:8081';
const SAFRA = '2026';
const ALVORADA = { id: 'alvorada', nome: 'Alvorada', token: 'tok-alvorada', associado: 'A-023' };
const BURICA = { id: 'burica', nome: 'Buricá', token: 'tok-burica', associado: 'B-102' };

async function pedir(tenant, metodo, caminho, corpo) {
  const resposta = await fetch(GATEWAY + caminho, {
    method: metodo,
    headers: { authorization: 'Bearer ' + tenant.token, 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(10000), // nenhuma chamada sai sem limite
  });
  let dados = null;
  try { dados = await resposta.json(); } catch { /* resposta sem corpo JSON */ }
  return { status: resposta.status, dados };
}

async function chave(nome, valor) {
  const resposta = await fetch(`${PAINEL}/chaves/${nome}/${valor}`, { method: 'POST', signal: AbortSignal.timeout(5000) });
  const dados = await resposta.json();
  assert.equal(dados[nome], valor, `o painel não mudou a chave ${nome} para ${valor}: ${JSON.stringify(dados)}`);
}

const pausa = ms => new Promise(pronto => setTimeout(pronto, ms));

// Espera uma condição ficar verdadeira, conferindo a cada 250 ms, até o prazo.
async function esperar(oQue, prazoMs, condicao) {
  const limite = Date.now() + prazoMs;
  while (Date.now() < limite) {
    const valor = await condicao();
    if (valor) return valor;
    await pausa(250);
  }
  throw new Error(`${oQue}: não aconteceu em ${prazoMs / 1000} s`);
}

const eventosPendentes = async () =>
  (await (await fetch(PAINEL + '/fila', { signal: AbortSignal.timeout(5000) })).json()).pendentes;

test('integração: cada defesa sozinha', async (t) => {
  await esperar('o produto responder 200 em GET /cotas', 60000, async () => {
    try { return (await pedir(ALVORADA, 'GET', '/cotas')).status === 200; } catch { return false; }
  });

  await t.test('com o filtro do código desligado, a política do banco não deixa passar linha de outro tenant', async () => {
    const criada = await pedir(ALVORADA, 'POST', '/entregas', { associado: ALVORADA.associado, safra: SAFRA, kg: 1 });
    assert.equal(criada.status, 201, `a Alvorada não conseguiu registrar a entrega: ${JSON.stringify(criada.dados)}`);
    const id = criada.dados.entrega_id;

    try {
      await chave('filtro-app', 'off'); // dentro do try: se a troca falhar no meio, o finally ainda religa
      const lista = await pedir(BURICA, 'GET', '/entregas');
      assert.equal(lista.status, 200, `resposta inesperada: GET /entregas como Buricá respondeu ${lista.status}`);
      assert.ok(lista.dados.entregas.length > 0, 'a lista da Buricá veio vazia: o teste não prova nada sem as linhas dela');
      const alheias = lista.dados.entregas.filter(entrega => entrega.tenant_id !== BURICA.id);
      assert.equal(alheias.length, 0,
        `VAZAMENTO com o filtro do código desligado: a política do banco deixou passar ${alheias.length} entrega(s) de outro tenant; a primeira é a ${alheias[0] && alheias[0].id}`);

      const doVizinho = await pedir(BURICA, 'GET', '/entregas/' + id);
      assert.equal(doVizinho.status, 404,
        `com o filtro do código desligado, a Buricá recebeu ${doVizinho.status} ao pedir a entrega ${id}, que é da Alvorada`);
    } finally {
      await chave('filtro-app', 'on');
    }
  });

  await t.test('o mesmo evento entregue duas vezes gera uma taxa só', async () => {
    try {
      await chave('relay-duplica', 'on'); // dentro do try, pelo mesmo motivo
      const criada = await pedir(BURICA, 'POST', '/entregas', { associado: BURICA.associado, safra: SAFRA, kg: 1 });
      assert.equal(criada.status, 201, `a Buricá não conseguiu registrar a entrega: ${JSON.stringify(criada.dados)}`);
      const id = criada.dados.entrega_id;

      const taxasDaEntrega = async () => {
        const taxas = await pedir(BURICA, 'GET', '/taxas');
        assert.equal(taxas.status, 200, `resposta inesperada: GET /taxas respondeu ${taxas.status}`);
        return taxas.dados.taxas.filter(taxa => taxa.entrega_id === id);
      };
      await esperar(`a taxa da entrega ${id} aparecer`, 15000, async () => (await taxasDaEntrega()).length > 0);
      await esperar('a fila de eventos esvaziar', 15000, async () => (await eventosPendentes()) === 0);
      await pausa(500); // a segunda cópia do evento sai logo depois da primeira

      const taxas = await taxasDaEntrega();
      assert.equal(taxas.length, 1,
        `o evento da entrega ${id} foi entregue duas vezes e gerou ${taxas.length} taxas; devia gerar uma`);
    } finally {
      await chave('relay-duplica', 'off');
    }
  });
});
