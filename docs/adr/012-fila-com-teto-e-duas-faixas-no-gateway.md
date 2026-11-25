# ADR 012 — O excedente espera numa fila com teto, em duas faixas por tenant

**Status:** proposto em 12/11/2026 · implementado no mesmo dia · escrito no dia da decisão · substitui o ADR 008

## Contexto

**Palavras deste ADR.** *Tenant* é a cooperativa cliente. *p95* é o tempo abaixo do qual ficam 95% das respostas. *Vizinho barulhento* é a cooperativa cujo uso pesado atrasa as outras. *Faixa* é um grupo de rotas que divide o mesmo teto e a mesma fila. *C4* e *C10* são defeitos da lista do [ADR 010](010-defeitos-conhecidos-nao-corrigidos-agora.md). O *experimento 6* está em `../../aula/enc11/experimentos.md`.

O [ADR 008](008-limite-de-pedidos-simultaneos-por-tenant.md) limitava cada cooperativa a 3 pedidos em andamento. O quarto recebia a resposta 429 na hora. Em 12/11/2026, um teste de carga com o k6 mostrou o custo dessa regra:

- 10 usuários de uma cooperativa pedindo o relatório pesado: 39% dos pedidos recusados.
- 1.000 usuários, divididos entre as duas cooperativas, listando cotas: de 41% a 60% recusados.

O dono do produto não aceitou. A frase dele: "se tiver limite, ele precisa ser maior e enfileirar os excedentes, não falhar". Ele também disse quanto de espera aceita: 300 ms é o ideal; até 2 s numa consulta comum e até 5 s num relatório pesado está bom.

Antes de escolher os números, a capacidade foi medida, com o limite desligado (`../evidencias/capacidade-2026-11-12.md`). A medição mostrou duas rotas muito diferentes:

- **A consulta de cotas** responde dentro do ideal até 80 pedidos simultâneos por cooperativa. O teto da máquina de teste fica perto de 740 pedidos por segundo. Quem limita é o processador: o gateway e a produção usam um núcleo inteiro cada um.
- **O relatório pesado** segura uma conexão do banco por 0,5 s. No CampoConta ele é uma espera de propósito (`pg_sleep(0.5)`), no lugar do cálculo de fechamento de safra. Com as 5 conexões do ADR 008, o produto inteiro fazia 10 relatórios por segundo. O processador ficava parado: quem limitava era o número 5.

As conexões do banco são divididas entre as cooperativas. Um limite alto que valesse para o relatório deixaria uma cooperativa ocupar todas. É o vizinho barulhento do ADR 008.

## Decisão

1. **O pedido excedente espera numa fila**, da própria cooperativa. Ele só recebe 429 se a fila estiver cheia ou se a espera passar de 5 s. O 429 leva o cabeçalho `Retry-After: 1`, que sugere tentar de novo em 1 s. O valor é fixo; o gateway não o calcula pelo tamanho da fila.
2. **Cada cooperativa tem duas faixas**, cada uma com o seu teto e a sua fila:

| Faixa | Rotas | Em andamento | Fila |
|---|---|---|---|
| Geral | todas, menos as pesadas | 40 | 80 |
| Pesada | `/relatorio-pesado` | 8 | 64 |

3. **A produção passa a ter 20 conexões de banco** para atender pedidos (eram 5).
4. **Os números são configuração**, por variável de ambiente no `compose.yaml`. Os valores acima são o padrão.

De onde saiu cada número:

- **40** é a metade do maior degrau que ainda coube no ideal. Com 80 por cooperativa, o p95 ficou em 292 ms, no limite, e um pedido levou 6 s. Com 40, o p95 foi de 152 ms.
- **80**, a fila da faixa geral, é o dobro do teto. É escolha, sem medição própria.
- **20 conexões** multiplicam por quatro a capacidade do banco para o relatório: de 10 para 40 por segundo, medido com o limite desligado.
- **8** vem de 20: duas cooperativas no teto da faixa pesada ocupam 16 conexões, e sobram 4 para as rotas rápidas. Com esse teto, o produto entrega até 32 relatórios por segundo, e não os 40 que o banco aguenta. É o preço da proteção.
- **64** vem dos 5 s: com 8 relatórios em andamento, de 0,5 s cada, o último da fila espera perto de 4 s. A folga é de 1 s; numa máquina mais lenta, o fim da fila pode esgotar a espera e receber 429.

## Alternativas descartadas

- **Manter o ADR 008** (3 em andamento, sem fila). É a regra mais simples, e protege o vizinho. Mas recusa pedido que o produto tinha como atender meio segundo depois. Descartada pelo dono do produto.
- **Fila sem teto.** Nunca recusa. Mas a espera cresce sem fim quando chega mais do que sai, e quem espera 30 s já desistiu. Descartada: recusar cedo, dizendo quando voltar, é melhor que atender tarde demais.
- **Sem limite nenhum.** Medido em 12/11: com 60 relatórios de uma cooperativa, a consulta da outra levou 1,6 s, contra 7 ms com o limite. Descartada.
- **Um limite só, maior, para todas as rotas.** Era o pedido inicial do dono do produto ("10 ou 20"). Com 20 valendo para o relatório, uma cooperativa ocupa todas as conexões e a outra espera. Descartada depois da medição.
- **Duas cópias do gateway, com balanceamento.** Passaria do teto de 740 pedidos por segundo. Mas a contagem e a fila ficam na memória de um gateway: com duas cópias, cada uma conta sozinha. Antes, esse estado precisa sair da memória. Fica para um ADR próprio.

## Consequências

Medidas em 12/11/2026, numa máquina só, com o k6 rodando ao lado do produto. Os comandos e os números completos estão na evidência. A primeira linha dos 60 relatórios vem do ADR 008.

| Cenário | Com o ADR 008 | Com este ADR |
|---|---|---|
| 10 usuários no relatório pesado | 39% recusados | 0% recusados; p95 de 509 ms |
| 100 usuários no relatório pesado | 87% recusados | 0% recusados; p95 de 2,2 s |
| 100 usuários listando cotas | 0,17% recusados | 0% recusados; p95 de 13 ms |
| 1.000 usuários listando cotas | 41% a 60% recusados | 13% recusados; p95 de 855 ms |
| 60 relatórios de uma cooperativa, de uma vez | 3 atendidos, 57 recusados | 60 atendidos |
| A outra cooperativa, durante esses 60 | cerca de 5 ms | mediana de 4 a 7 ms |

- **Melhora:** onde há capacidade, ninguém é recusado. A recusa vira espera, e a espera fica dentro do que o dono do produto aceita.
- **Melhora:** a recusa que sobra sugere quando tentar de novo.
- **Melhora:** o relatório pesado de uma cooperativa não segura as rotas rápidas dela mesma. São faixas separadas.
- **Melhora:** o defeito C4 do ADR 010 deixa de valer para duas cooperativas: 8 + 8 é menor que 20.
- **Piora:** com 1.000 usuários, 13% ainda são recusados. A chegada passa do teto da máquina. Fila absorve pico curto; não resolve excesso contínuo. Para isso é preciso mais capacidade.
- **Piora:** o tempo de resposta ficou menos previsível. Antes, o pedido era atendido ou recusado na hora. Agora ele pode levar até cerca de 15 s: 5 s na fila, mais os 10 s de prazo que o gateway dá ao serviço. Num dos testes, um pedido levou 16 s.
- **Piora:** o limite não cancela o trabalho já enviado. Se o gateway desiste aos 10 s, a vaga volta, mas a produção segue com a conexão do banco presa até o relatório acabar.
- **Piora:** com uma terceira cooperativa, três tetos da faixa pesada somam 24 conexões, e há 20. O C4 volta. O teto por cooperativa teria de sair de uma conta com o número de cooperativas.
- **Piora:** a contagem e a fila continuam na memória de um gateway (defeito C10). Se o gateway reinicia, quem estava na fila perde o pedido.
- **Piora:** o gateway precisa saber quais rotas são pesadas. É uma lista mantida à mão. Uma rota pesada nova, esquecida fora da lista, entra na faixa geral e ocupa o banco.
- **Piora:** há seis números para manter, onde havia um. Eles dependem uns dos outros: mudar as conexões sem refazer a conta da faixa pesada tira a proteção do vizinho.
- **Piora:** o relatório do CampoConta espera, não calcula. Num relatório de verdade, o banco gastaria processador, e 20 conexões renderiam menos que quatro vezes.
- **Piora:** o teste automatizado enche só a faixa pesada. A geral usa o mesmo mecanismo, e nenhum teste a encheu.
- **O que muda na aula:** o experimento 6 dá outro resultado. Sem o limite, a outra cooperativa espera cerca de 1,6 s (eram 6 s). Com o limite, os 60 relatórios são atendidos (eram 3).
