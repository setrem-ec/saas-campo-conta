// Teste de isolamento entre tenants, pela porta do gateway (8080).
// E o experimento 2 escrito como teste: uma cooperativa cria uma entrega e a outra
// nao pode ve-la, nem pela busca por identificador, nem pela lista. Nos dois sentidos.
//
// Como rodar, com o sistema no ar (docker compose up -d --build --wait):
//   node --test
// O teste so usa o que vem no Node 22: o executor de testes e o fetch. Ele nao abre
// o banco e nao conhece a outbox: enxerga so o que quem chama enxerga.
const test = require('node:test');
const assert = require('node:assert/strict');

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8080';

// Os dois tenants dos dados de exemplo. Cada execucao registra 1 kg para um associado
// de cada cooperativa; a cota de exemplo comporta milhares de execucoes.
const ALVORADA = { nome: 'Alvorada', token: 'tok-alvorada', associado: 'A-023' };
const BURICA = { nome: 'Buricá', token: 'tok-burica', associado: 'B-102' };

async function pedir(tenant, metodo, caminho, corpo) {
  const resposta = await fetch(GATEWAY + caminho, {
    method: metodo,
    headers: { authorization: 'Bearer ' + tenant.token, 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados = null;
  try { dados = await resposta.json(); } catch { /* resposta sem corpo JSON */ }
  return { status: resposta.status, dados };
}

// "Subiu" nao quer dizer "pronto": espera o gateway responder e a producao alcancar o banco.
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
  throw new Error(`o sistema nao ficou pronto em 60 s em ${GATEWAY} (${ultimo})`);
}

// O que o dono cria, o vizinho nao ve. A mensagem de falha diz quem viu dado de quem.
async function conferirIsolamento(dono, vizinho) {
  const criada = await pedir(dono, 'POST', '/entregas', { associado: dono.associado, kg: 1 });
  assert.equal(criada.status, 201, `${dono.nome} nao conseguiu registrar a entrega: ${JSON.stringify(criada.dados)}`);
  const id = criada.dados.entrega_id;

  const doDono = await pedir(dono, 'GET', '/entregas/' + id);
  assert.equal(doDono.status, 200, `${dono.nome} nao achou a propria entrega ${id}`);

  const doVizinho = await pedir(vizinho, 'GET', '/entregas/' + id);
  assert.equal(doVizinho.status, 404,
    `VAZAMENTO: ${vizinho.nome} viu a entrega ${id}, que e da ${dono.nome} (GET /entregas/${id} respondeu ${doVizinho.status})`);

  const lista = await pedir(vizinho, 'GET', '/entregas');
  assert.equal(lista.status, 200, `${vizinho.nome} nao conseguiu listar as proprias entregas`);
  const alheias = lista.dados.entregas.filter(entrega => entrega.tenant_id !== lista.dados.tenant);
  assert.equal(alheias.length, 0,
    `VAZAMENTO: a lista da ${vizinho.nome} trouxe ${alheias.length} entrega(s) de outra cooperativa, entre elas a ${alheias[0] && alheias[0].id}`);
  assert.ok(!lista.dados.entregas.some(entrega => entrega.id === id),
    `VAZAMENTO: a lista da ${vizinho.nome} trouxe a entrega ${id}, que e da ${dono.nome}`);
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
