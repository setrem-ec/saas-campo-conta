// Teste de isolamento entre tenants, pela porta do gateway (8080).
// É o experimento 2 escrito como teste: uma cooperativa cria uma entrega e a outra
// não pode vê-la, nem pela busca por identificador, nem pela lista. Nos dois sentidos.
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test --test-concurrency=1
// O teste só usa o que vem no Node 22: o executor de testes e o fetch. Ele não abre
// o banco e não conhece a outbox: enxerga só o que quem chama enxerga.
//
// Efeito de cada execução: duas entregas de 1 kg (uma por cooperativa) e as duas taxas
// que elas geram. A cota de exemplo comporta milhares de execuções.
const test = require('node:test');
const assert = require('node:assert/strict');

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';
const SAFRA = '2026';

// Os dois tenants dos dados de exemplo. O `id` é o que o sistema deve devolver como tenant:
// o esperado vem daqui, do teste, nunca da resposta que está sendo conferida.
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

// "Subiu" não quer dizer "pronto": espera o gateway responder e a produção alcançar o banco.
async function esperarSistema() {
  const limite = Date.now() + 60000;
  let ultimo = 'sem resposta';
  while (Date.now() < limite) {
    try {
      const r = await pedir(ALVORADA, 'GET', '/cotas');
      if (r.status === 200) return;
      ultimo = 'GET /cotas respondeu ' + r.status;
    } catch (erro) {
      ultimo = erro.message;
    }
    await new Promise(pronto => setTimeout(pronto, 1000));
  }
  throw new Error(`o sistema não ficou pronto em 60 s em ${GATEWAY} (${ultimo})`);
}

// O que o dono cria, o vizinho não vê. A mensagem de falha diz quem viu dado de quem.
// Só chama de VAZAMENTO o que é vazamento: uma resposta "ocupado" ou "fora do ar" não
// prova que alguém viu nada, e a mensagem diz isso.
async function conferirIsolamento(dono, vizinho) {
  const criada = await pedir(dono, 'POST', '/entregas', { associado: dono.associado, safra: SAFRA, kg: 1 });
  assert.equal(criada.status, 201, `${dono.nome} não conseguiu registrar a entrega: ${JSON.stringify(criada.dados)}`);
  const id = criada.dados.entrega_id;

  const doDono = await pedir(dono, 'GET', '/entregas/' + id);
  assert.equal(doDono.status, 200, `${dono.nome} não achou a própria entrega ${id} (status ${doDono.status})`);

  // 1. Busca por identificador: o vizinho tem de receber 404.
  const doVizinho = await pedir(vizinho, 'GET', '/entregas/' + id);
  assert.notEqual(doVizinho.status, 200,
    `VAZAMENTO: ${vizinho.nome} viu a entrega ${id}, que é da ${dono.nome} (GET /entregas/${id} respondeu 200)`);
  assert.equal(doVizinho.status, 404,
    `resposta inesperada: GET /entregas/${id} como ${vizinho.nome} respondeu ${doVizinho.status}. Não dá para concluir sobre o isolamento`);

  // 2. Lista: a do vizinho não pode trazer a entrega do dono, nem linha de outro tenant.
  const lista = await pedir(vizinho, 'GET', '/entregas');
  assert.equal(lista.status, 200,
    `resposta inesperada: GET /entregas como ${vizinho.nome} respondeu ${lista.status}. Não dá para concluir sobre o isolamento`);
  assert.ok(lista.dados && Array.isArray(lista.dados.entregas),
    `resposta inesperada: GET /entregas como ${vizinho.nome} não trouxe uma lista de entregas`);
  assert.equal(lista.dados.tenant, vizinho.id,
    `a lista pedida pela ${vizinho.nome} veio em nome de outro tenant: ${lista.dados.tenant}`);

  assert.ok(!lista.dados.entregas.some(entrega => entrega.id === id),
    `VAZAMENTO: a lista da ${vizinho.nome} trouxe a entrega ${id}, que é da ${dono.nome}`);
  const alheias = lista.dados.entregas.filter(entrega => entrega.tenant_id !== vizinho.id);
  assert.equal(alheias.length, 0,
    `VAZAMENTO: a lista da ${vizinho.nome} trouxe ${alheias.length} entrega(s) de outro tenant; a primeira é a ${alheias[0] && alheias[0].id}, do tenant ${alheias[0] && alheias[0].tenant_id}`);
}

test('isolamento entre tenants', async (t) => {
  await esperarSistema();

  await t.test('a Buricá não vê a entrega que a Alvorada criou', async () => {
    await conferirIsolamento(ALVORADA, BURICA);
  });

  await t.test('a Alvorada não vê a entrega que a Buricá criou', async () => {
    await conferirIsolamento(BURICA, ALVORADA);
  });
});
