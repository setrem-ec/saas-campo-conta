# Plano de testes — CampoConta

**Entregável que exemplifica:** o plano de testes em três colunas do Encontro 12 e os itens 3.1 e 3.2 da Etapa 3.

> **Isto não é o seu PI.** É o exemplo público do CampoConta, material de aula. Use o **formato**: o que cada teste prova, de que tipo ele é e se já existe. Os testes do seu produto são seus.

**Escrito em 12/11/2026.** Vale para o tronco deste repositório. O código do produto é o do commit `0deac2a`.

## O retrato de hoje, sem enfeite

- **Existe um teste automatizado.** Ele entra pelo gateway, então é de ponta a ponta: o tipo mais caro e o que menos diz onde está o defeito.
- **Não há teste de unidade nem de integração.** A pirâmide está de cabeça para baixo. É o começo do "cone de sorvete" do Encontro 12.
- **Pela rubrica da Etapa 3:** o teste de isolamento está no nível Satisfatório ("automatizado, cobre o cenário principal"). A suíte no pipeline ainda não: a rubrica pede "unidade + integração a cada push", e só há ponta a ponta.

## Os tipos de teste, em uma linha cada

| Tipo | O que testa | Precisa do sistema no ar? |
|---|---|---|
| **Unidade** | Uma regra sozinha, sem banco e sem rede | Não |
| **Integração** | Um serviço conversando com algo real: o banco, outro serviço | Em parte |
| **Ponta a ponta** | O fluxo inteiro, pela porta do gateway, como quem usa o produto | Sim |
| **Contrato** | Só o acordo entre dois serviços: os campos que um envia e o outro usa | Não |

Fora da pirâmide ficam os testes que não conferem regra de negócio: **segurança**, **robustez** e **carga**.

## O plano

| Tipo | Teste | O que prova | Estado | Nasce por TDD? |
|---|---|---|---|---|
| Unidade | Cota no limite exato | Entregar até o limite passa; 1 kg a mais é recusado | Falta | Não: a regra já funciona |
| Unidade | Cota com peso inválido | Zero, negativo e fração são recusados, e a cota não muda | Falta | Não |
| Unidade | Regra da taxa | Entra depois do encontro de 19/11 | Falta | Sim |
| Integração | Política por linha do banco | Com o filtro do código desligado, a lista não traz linha de outra cooperativa. **Isolamento** | Falta | Não |
| Integração | Evento repetido | O mesmo evento, entregue duas vezes, gera uma taxa só | Falta | Não |
| Ponta a ponta | Isolamento na leitura de entregas | A Buricá não vê a entrega da Alvorada, nem pela busca nem pela lista; e o inverso. **Isolamento** | **Existe:** `testes/isolamento.test.js` | Não |
| Ponta a ponta | Entrega vira taxa | A entrega registrada aparece como taxa em poucos segundos | Falta | Não |
| Contrato | Evento `EntregaRegistrada` | Tem os campos que a cobrança usa; um campo renomeado quebra o teste | Falta | Não |
| Segurança | Token ausente ou inválido | Toda rota do produto responde 401 | Falta | Não |
| Segurança | Evento forjado (defeito C1) | A cobrança recusa evento que não veio da produção | Falta | **Sim:** o teste falha hoje |
| Robustez | Endereço malformado (defeito C2) | O gateway responde erro e continua no ar | Falta | **Sim:** o teste falha hoje |
| Carga | k6 em `/cotas` e em `/relatorio-pesado` | O p95 e a taxa de erro contra o limiar | Rodado à mão, em aula | Não se aplica |

Os defeitos C1 e C2 estão descritos em `adr/010-defeitos-conhecidos-nao-corrigidos-agora.md`.

## Onde entra o isolamento

Em dois lugares, de propósito. O teste de ponta a ponta confere o que quem usa o produto enxerga. O de integração confere a segunda camada sozinha, a política por linha do banco (ADR 002).

Os dois são necessários. Em 12/11/2026, com o filtro do código removido de propósito, o teste de ponta a ponta continuou verde: o banco segurou, e o teste não tinha como dizer que uma das duas camadas tinha caído. O registro está em `evidencias/pipeline-vermelho-2026-11-12.md`.

## O que é TDD aqui, e o que não é

TDD é escrever o teste antes do código, vê-lo falhar e só então fazê-lo passar. Por isso ele só serve para o que ainda não existe ou está quebrado.

- **É TDD:** a regra da taxa, que ainda não existe; e os defeitos C1 e C2, em que o teste nasce vermelho e o conserto o deixa verde.
- **Não é TDD:** os testes da cota, do isolamento e do evento repetido. O código já funciona, e o teste nasce passando. Eles servem para travar o comportamento: se alguém o quebrar depois, o teste acusa.

Um teste que nunca foi visto falhando não provou que consegue falhar. Para o teste de isolamento, essa prova foi feita à parte, quebrando o isolamento numa branch.

## O plano e o pipeline

O plano diz **o quê**: que testes existem e o que cada um prova. O pipeline diz **quando**: roda a suíte a cada push (ADR 011).

A ordem certa no pipeline segue o custo. Primeiro a unidade, que termina em segundos e não sobe nada. Depois a integração e a ponta a ponta, com o sistema no ar. Se a unidade falha, não vale a pena subir o resto.

Hoje o pipeline tem um passo só de teste, porque só há um teste. Ele ganha o passo da unidade quando os testes da cota entrarem.

## O que este plano não cobre

- **Teste manual.** Os seis experimentos (`aula/enc11/experimentos.md`) continuam sendo a conferência do que ainda não tem teste.
- **Quanto do código os testes exercitam.** Com um teste só, a medida não diria nada.
- **O produto redesenhado.** Este plano é do sistema que roda hoje.
