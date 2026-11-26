# Plano de testes — CampoConta

**Entregável que exemplifica:** o plano de testes em três colunas do Encontro 12 e os itens 3.1 e 3.2 da Etapa 3.

> **Isto não é o seu PI.** É o exemplo público do CampoConta, material de aula. Use o **formato**: o que cada teste prova, de que tipo é e se já existe. Os testes do seu produto são seus.

**Escrito em 12/11/2026, atualizado em 24/11/2026** (Etapa 3: autorização, robustez, carga e segurança no pipeline). Vale para o tronco deste repositório.

## O retrato de hoje, sem enfeite

- **A pirâmide tem os três andares, e ainda é fina.** Unidade: 9 testes da cota. Integração: 2 testes, cada um com uma defesa desligada de propósito. Ponta a ponta: o isolamento e a fila do gateway.
- **Os testes de integração entram pelo gateway.** Desligam uma defesa pelas chaves de laboratório, em vez de subir um serviço sozinho. Dizem qual defesa segurou, não em que linha está o defeito.
- **Pela rubrica da Etapa 3:** o teste de isolamento e a suíte no pipeline estão no nível Satisfatório ("automatizado, cobre o cenário principal"; "unidade + integração a cada push"). O nível acima pede teste de contrato, que não existe.

## Os tipos de teste, em uma linha cada

| Tipo | O que testa | Precisa do sistema no ar? |
|---|---|---|
| **Unidade** | Uma regra sozinha, sem banco e sem rede | Não |
| **Integração** | Um serviço com algo real: o banco, outro serviço | Em parte |
| **Ponta a ponta** | O fluxo inteiro, pelo gateway, como quem usa o produto | Sim |
| **Contrato** | Só o acordo entre dois serviços: os campos que um envia e o outro usa | Não |

Fora da pirâmide ficam os testes que não conferem regra de negócio: **segurança**, **robustez** e **carga**.

## O plano

| Tipo | Teste | O que prova | Estado | Nasce por TDD? |
|---|---|---|---|---|
| Unidade | Cota no limite exato | Até o limite passa; 1 kg a mais é recusado, e a cota não muda | **Existe:** `producao/testes/cota.test.js` | Não: a regra já funciona |
| Unidade | Cota com peso inválido | Zero, negativo, fração e texto são recusados, e a cota não muda | **Existe:** o mesmo arquivo | Não |
| Unidade | Regra da taxa | Entra depois do encontro de 19/11 | Falta | Sim |
| Integração | Política por linha do banco | Sem o filtro do código, a lista não traz linha de outra cooperativa. **Isolamento** | **Existe:** `testes/integracao.test.js` | Não |
| Integração | Evento repetido | O mesmo evento, entregue duas vezes, gera uma taxa só. Sem a idempotência, o teste falha (conferido em 13/11/2026) | **Existe:** o mesmo arquivo | Não |
| Ponta a ponta | Isolamento na leitura de entregas | A Buricá não vê a entrega da Alvorada, pela busca nem pela lista; e o inverso. **Isolamento** | **Existe:** `testes/isolamento.test.js` | Não |
| Ponta a ponta | Fila do gateway | O pedido acima do limite espera e é atendido; com a fila cheia, recebe 429 com `Retry-After`; a fila cheia de uma cooperativa não segura a outra | **Existe:** `testes/fila.test.js`. Enche só a faixa pesada | Não |
| Ponta a ponta | Entrega vira taxa | A entrega registrada aparece como taxa em poucos segundos | Falta | Não |
| Contrato | Evento `EntregaRegistrada` | Tem os campos que a cobrança usa; um campo renomeado quebra o teste | Falta | Não |
| Segurança | Token ausente ou inválido | Toda rota do produto responde 401 | **Existe:** `testes/authz.test.js` (24/11) | Não: o gateway já recusava |
| Segurança | Cabeçalho de tenant forjado | Um `x-tenant-id` do cliente não troca o tenant em `/eu`, `/cotas` e `/relatorio`. **Isolamento** | **Existe:** o mesmo arquivo | Não |
| Segurança | Segredos e dependências | Nenhum segredo no histórico (TruffleHog), nenhuma vulnerabilidade alta (`npm audit`) | **Existe:** dois passos do pipeline, antes dos testes (24/11) | Não se aplica |
| Segurança | Evento forjado (defeito C1) | A cobrança recusa evento que não veio da produção | Falta | **Sim:** o teste falha hoje |
| Robustez | Endereço malformado (defeito C2, achado S1) | O gateway responde 400 e continua no ar | **Existe:** `testes/robustez.test.js` | **Sim:** `ac2762e` (red, pipeline vermelho) e `c72b2ad` (green) |
| Carga | k6 em `/cotas` e em `/relatorio-pesado` | O p95 e a taxa de erro contra o limiar | À mão: capacidade em 12/11 (`evidencias/capacidade-2026-11-12.md`), metas do SLO em 24/11 (`carga-enc14.md`) | Não se aplica |

Os defeitos C1 e C2 estão em `adr/010-defeitos-conhecidos-nao-corrigidos-agora.md`.

## Onde entra o isolamento

Em dois lugares, de propósito. O teste de ponta a ponta confere o que quem usa o produto enxerga. O de integração confere sozinha a segunda camada, a política por linha do banco (ADR 002).

Os dois são necessários. Em 12/11/2026, com o filtro do código removido, o teste de ponta a ponta continuou verde: o banco segurou, e o teste não tinha como dizer que uma camada tinha caído. O de integração, de 13/11, confere o banco sozinho. O código sozinho ainda não tem teste: falta uma chave que desligue a política do banco. O registro está em `evidencias/pipeline-vermelho-2026-11-12.md`.

## O que é TDD aqui, e o que não é

TDD é escrever o teste antes do código, vê-lo falhar e só então fazê-lo passar. Só serve para o que ainda não existe ou está quebrado.

- **É TDD:** a regra da taxa, que não existe; e os defeitos C1 e C2, em que o teste nasce vermelho. O C2 já foi assim, em 24/11: veja os commits `red:` e `green:` no histórico.
- **Não é TDD:** os testes da cota, do isolamento e do evento repetido. Nascem passando, porque o código já funciona, e servem para travar o comportamento.

Teste que nunca falhou não provou que consegue falhar. O de isolamento provou à parte, numa branch que quebra o isolamento.

## O plano e o pipeline

O plano diz **o quê**: que testes existem e o que cada um prova. O pipeline diz **quando**: a cada push (ADR 011).

A ordem segue o custo: segredos no histórico, dependências auditadas, unidade, e só então o produto sobe para a integração e a ponta a ponta. Se a unidade falha, não vale subir o resto.

## O que este plano não cobre

- **Teste manual.** Os seis experimentos (`aula/enc11/experimentos.md`) conferem o que ainda não tem teste.
- **Quanto do código os testes exercitam.** A cobertura não é medida.
- **O produto redesenhado.** Este plano é do sistema que roda hoje.
