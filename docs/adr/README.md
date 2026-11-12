# Decisões de arquitetura (ADRs) do CampoConta

Cada arquivo registra uma decisão no formato do Encontro 02: **contexto** (com números), **decisão** (uma frase), **alternativas descartadas** (com o porquê) e **consequências** (o que melhora **e** o que piora).

| # | Decisão | Entregável que exemplifica |
|---|---|---|
| [001](001-tenant-resolvido-no-gateway.md) | O tenant é descoberto no gateway, a partir do token | 1.3 |
| [002](002-tenancy-pool-com-isolamento-em-duas-camadas.md) | **Tenancy:** pool por padrão, isolamento em duas camadas (aplicação e banco); schema ou banco próprio como plano pago à parte | 1.3 (obrigatório) |
| [003](003-banco-por-servico.md) | Um banco por serviço | 1.3 |
| [004](004-comunicacao-por-evento-com-outbox.md) | **Comunicação:** produção avisa a cobrança por evento, gravado na mesma transação da entrega | 1.3 e checklist da Etapa 2 (obrigatório) |
| [005](005-outbox-em-tabela-sem-broker.md) | A outbox é uma tabela do banco, sem broker de mensagens | 2.5 |
| [006](006-idempotencia-no-consumidor.md) | A cobrança descarta evento repetido pelo identificador | 2.5 |
| [007](007-relatorio-por-composicao-no-gateway.md) | Relatório por composição no gateway, com prazo e resposta parcial | 2.5 |
| [008](008-limite-de-pedidos-simultaneos-por-tenant.md) | Limite de pedidos simultâneos por tenant, no gateway | 2.5 |
| [009](009-ambiente-docker-compose-local.md) | Ambiente: Docker Compose local | 2.2 (escolha do ambiente em ADR) |
| [010](010-defeitos-conhecidos-nao-corrigidos-agora.md) | Defeitos conhecidos que decidimos não corrigir agora | 2.5 (ADR de "não fazer" também vale) |
| [011](011-a-suite-roda-a-cada-push.md) | A suíte roda a cada push, numa máquina limpa | 3.1 (suíte no pipeline) |

Os ADRs 001 a 010 descrevem o código do produto, que é o do commit `0deac2a`. O ADR 011 é o primeiro escrito no dia da decisão. O produto está sendo redesenhado; as decisões novas entram aqui como ADRs novos, no dia em que forem tomadas e depois de lidas por alguém de fora. Nenhum destes dez será apagado: o que for revisto ganha o status "substituído pelo ADR tal". Um ADR alterado depois de escrito diz isso na linha **Histórico**, no fim do arquivo.

## Uma confissão, que também é lição

O Encontro 02 diz que um ADR honesto é **escrito no momento da decisão**. Estes não foram: o código ficou pronto em 10/10/2026 e os ADRs foram registrados em 15/10/2026, depois de o sistema ter sido revisado. Cada um diz isso no campo **Status**.

O custo apareceu: ao escrever as alternativas descartadas, algumas decisões se mostraram mais frágeis do que pareciam (ver o ADR 010). Se tivessem sido escritas antes, uma parte desses defeitos não teria entrado no código. No seu PI, escreva o ADR **quando** decidir.

## Isto não é o seu PI

Estes ADRs são do CampoConta, que é material de aula. Copiar uma decisão daqui sem o contexto do seu produto é avaliado como cópia. Use o formato; a decisão é sua.
