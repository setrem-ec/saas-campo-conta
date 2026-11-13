// Teste da fila do gateway (ADR 012), pela porta do produto (8080).
// A regra: cada cooperativa tem um teto de pedidos em andamento, em duas faixas: a geral
// (rotas rápidas, teto alto) e a pesada (rotas que seguram o banco, teto baixo). O pedido
// excedente espera numa fila da própria cooperativa e da própria faixa. Só é recusado, com
// 429 e o cabeçalho Retry-After, se a fila estiver cheia ou se a espera passar do teto.
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test --test-concurrency=1
// O teste usa a rota /relatorio-pesado, que leva cerca de meio segundo de propósito,
// para os pedidos se acumularem. Ela está na faixa pesada. Os números do limite vêm do
// painel de laboratório (8081, GET /limite): o teste não repete a configuração, ele a lê.
// A faixa geral usa o mesmo mecanismo, com outros números; este teste não a enche.
//
// Efeito de cada execução: nenhum dado é gravado. As três partes juntas levam perto de 10 s.
const test = require('node:test');
const assert = require('node:assert/strict');

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const PAINEL = process.env.PAINEL_URL || 'http://127.0.0.1:8081';

async function pedir(token, caminho) {
  const inicio = Date.now();
  const resposta = await fetch(GATEWAY + caminho, {
    headers: { authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(20000), // nenhuma chamada sai sem limite
  });
  await resposta.text();
  return { status: resposta.status, tentarDeNovo: resposta.headers.get('retry-after'), ms: Date.now() - inicio };
}

const pesados = quantos => Promise.all(Array.from({ length: quantos }, () => pedir('tok-alvorada', '/relatorio-pesado')));
const contar = (respostas, status) => respostas.filter(r => r.status === status).length;

// Espera a faixa pesada da Alvorada ficar sem pedido em andamento e sem fila, para uma parte não sujar a outra.
async function esperarVazio() {
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    const estado = await (await fetch(PAINEL + '/limite', { signal: AbortSignal.timeout(5000) })).json();
    const { em_andamento, na_fila } = estado.tenants.alvorada.pesada;
    if (em_andamento === 0 && na_fila === 0) return estado.faixas.pesada;
    await new Promise(pronto => setTimeout(pronto, 200));
  }
  throw new Error('a Alvorada não ficou sem pedidos em 15 s');
}

// Espera a faixa pesada da Alvorada ter alguém na fila: é a prova de que o limite lotou.
async function esperarFila() {
  const limite = Date.now() + 5000;
  while (Date.now() < limite) {
    const estado = await (await fetch(PAINEL + '/limite', { signal: AbortSignal.timeout(5000) })).json();
    if (estado.tenants.alvorada.pesada.na_fila > 0) return;
    await new Promise(pronto => setTimeout(pronto, 20));
  }
  throw new Error('a fila de relatórios da Alvorada não chegou a se formar em 5 s');
}

test('fila do gateway por tenant', async (t) => {
  const { max_simultaneas: maximo, fila_maxima: fila } = await esperarVazio();

  await t.test('o pedido acima do limite espera na fila e é atendido', async () => {
    const respostas = await pesados(maximo + 1);
    assert.equal(contar(respostas, 200), maximo + 1,
      `com ${maximo + 1} pedidos simultâneos (limite ${maximo}), todos deviam ser atendidos; os status foram ${respostas.map(r => r.status)}`);
  });

  // As contagens abaixo não são exatas de propósito: numa máquina lenta, os pedidos chegam
  // aos poucos e alguém da fila pode esgotar a espera. O teste afirma só o que vale sempre.
  await t.test('com a fila cheia, o excedente recebe 429 com Retry-After', async () => {
    await esperarVazio();
    const total = maximo + fila + 10;
    const respostas = await pesados(total);
    const estranhos = respostas.filter(r => r.status !== 200 && r.status !== 429);
    assert.equal(estranhos.length, 0, `resposta inesperada: status ${estranhos.map(r => r.status)}`);
    assert.ok(contar(respostas, 200) > maximo,
      `a fila devia atender mais que os ${maximo} do limite; foram atendidos ${contar(respostas, 200)} de ${total}`);
    const recusados = respostas.filter(r => r.status === 429);
    assert.ok(recusados.length >= 1, `com ${total} pedidos para ${maximo + fila} lugares, alguém devia ser recusado; ninguém foi`);
    for (const recusado of recusados) {
      assert.ok(recusado.tentarDeNovo, 'a recusa veio sem o cabeçalho Retry-After');
    }
  });

  await t.test('a fila cheia de relatórios da Alvorada não segura a Buricá nem as rotas rápidas da Alvorada', async () => {
    await esperarVazio();
    const inundacao = pesados(maximo + fila);
    inundacao.catch(() => {}); // se uma conferência abaixo falhar, a inundação não vira erro solto
    await esperarFila();       // só mede depois que a Alvorada lotou o limite e tem gente na fila
    const [vizinha, propria] = await Promise.all([pedir('tok-burica', '/cotas'), pedir('tok-alvorada', '/cotas')]);
    assert.equal(vizinha.status, 200, `a Buricá recebeu ${vizinha.status} enquanto a Alvorada estava com a fila cheia`);
    assert.ok(vizinha.ms < 1000, `a Buricá esperou ${vizinha.ms} ms por GET /cotas enquanto a Alvorada estava com a fila cheia`);
    assert.equal(propria.status, 200, `a Alvorada recebeu ${propria.status} em GET /cotas com a fila de relatórios cheia`);
    assert.ok(propria.ms < 1000, `a Alvorada esperou ${propria.ms} ms por GET /cotas com a fila de relatórios cheia`);
    await inundacao;
  });
});
