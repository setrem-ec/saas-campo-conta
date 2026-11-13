// Testes de unidade da Cota: a regra sozinha, sem banco, sem rede e sem o sistema no ar.
// "A soma do entregue nunca passa da cota." Roda em milissegundos, em qualquer máquina:
//   node --test "producao/testes/*.test.js"
// Cada teste confere duas coisas: o que a regra responde e o que ela deixa na cota.
// Uma entrega recusada não pode mudar o total entregue.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Cota } = require('../cota');

const cotaCom = entregueKg => new Cota({ associado: 'A-023', safra: '2026', limiteKg: 10000, entregueKg });

test('a entrega que fecha a cota no limite exato é aceita', () => {
  const cota = cotaCom(9000);
  cota.registrarEntrega(1000);
  assert.equal(cota.entregueKg, 10000, 'o total entregue devia chegar exatamente ao limite');
});

test('1 kg acima do limite é recusado, e a cota não muda', () => {
  const cota = cotaCom(9000);
  assert.throws(() => cota.registrarEntrega(1001), /estoura a cota/,
    'a entrega de 1001 kg passaria de 10000 e devia ser recusada');
  assert.equal(cota.entregueKg, 9000, 'a entrega recusada mudou o total entregue');
});

test('com a cota cheia, até 1 kg é recusado', () => {
  const cota = cotaCom(10000);
  assert.throws(() => cota.registrarEntrega(1), /estoura a cota/);
  assert.equal(cota.entregueKg, 10000);
});

// Peso inválido: zero, negativo, fração e o que não é número. Um caso por linha da tabela.
for (const [nome, kg] of [['zero', 0], ['negativo', -5], ['fração', 0.5], ['texto', '100'], ['ausente', undefined]]) {
  test(`peso inválido (${nome}) é recusado, e a cota não muda`, () => {
    const cota = cotaCom(2000);
    assert.throws(() => cota.registrarEntrega(kg), /inteiro positivo/,
      `registrarEntrega(${JSON.stringify(kg)}) devia ser recusado`);
    assert.equal(cota.entregueKg, 2000, 'a entrega recusada mudou o total entregue');
  });
}

test('entregas seguidas somam', () => {
  const cota = cotaCom(0);
  cota.registrarEntrega(300);
  cota.registrarEntrega(700);
  assert.equal(cota.entregueKg, 1000);
});
