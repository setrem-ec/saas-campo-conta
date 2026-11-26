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
| [008](008-limite-de-pedidos-simultaneos-por-tenant.md) | Limite de pedidos simultâneos por tenant, no gateway. **Substituído pelo 012** | 2.5 |
| [009](009-ambiente-docker-compose-local.md) | Ambiente: Docker Compose local | 2.2 (escolha do ambiente em ADR) |
| [010](010-defeitos-conhecidos-nao-corrigidos-agora.md) | Defeitos conhecidos que decidimos não corrigir agora | 2.5 (ADR de "não fazer" também vale) |
| [011](011-a-suite-roda-a-cada-push.md) | A suíte roda a cada push, numa máquina limpa | 3.1 (suíte no pipeline) |
| [012](012-fila-com-teto-e-duas-faixas-no-gateway.md) | O excedente espera numa fila com teto, em duas faixas por tenant. Decisão revista com medição | 3.3 e 3.4 (carga e meta), e o nível Excelente de "Carga e SLO": gargalo com hipótese de correção |

Os ADRs 001 a 010 descrevem o código como ele era no commit `0deac2a`. O 011 é o primeiro escrito no dia da decisão. O 012 é o primeiro que muda o código e o primeiro que substitui outro (o 008).

Decisão nova entra como ADR novo, no dia em que é tomada. Nenhum ADR é apagado: o revisto ganha o status "substituído pelo ADR tal". O ADR alterado depois de escrito diz isso na linha **Histórico**, no fim do arquivo.

## Uma confissão, que também é lição

O Encontro 02 diz que o ADR honesto é **escrito no momento da decisão**. Estes não foram: o código ficou pronto em 10/10/2026, e os ADRs, em 15/10/2026, depois da revisão do sistema. Cada um diz isso no campo **Status**.

O custo apareceu: ao escrever as alternativas descartadas, algumas decisões se mostraram frágeis (ADR 010). Escritas antes, parte desses defeitos não teria entrado no código. No seu PI, escreva o ADR **quando** decidir.

## Isto não é o seu PI

Estes ADRs são material de aula. Copiar uma decisão daqui sem o contexto do seu produto é avaliado como cópia. Use o formato; a decisão é sua.
