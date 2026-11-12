# ADR 007 — Relatório por composição no gateway, com prazo e resposta parcial

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

O gestor quer cotas e taxas juntas (história 8 em `../especificacao.md`). Pelo ADR 003, elas moram em dois bancos e não há `JOIN`. Se o relatório esperar os dois serviços sem limite, a lentidão de um vira a lentidão do relatório, e o gestor fica sem nada. O cenário Q4 (`../atributos-qualidade.md`) pede o relatório em até 2,5 s mesmo com a Cobrança fora do ar.

## Decisão

O gateway chama a Produção e a Cobrança em paralelo, dá **2 segundos** a cada chamada e junta as respostas; se uma não responder no prazo, o relatório sai com a parte que veio e a outra marcada como indisponível.

## Alternativas descartadas

- **Serviço de relatórios com cópia dos dados.** Resolve o cruzamento e a lentidão, mas é um terceiro serviço e uma terceira cópia do dado para manter atualizada. Descartada pelo tamanho atual; volta se o relatório precisar cruzar por associado.
- **Consulta direta aos dois bancos.** Quebra o ADR 003. Descartada.

## Consequências

- **Melhora:** com a Cobrança parada, o relatório sai em cerca de 2 s com `"cobranca":"INDISPONIVEL (relatorio parcial)"`, em vez de travar (experimento 4).
- **Piora:** o relatório só junta as duas listas; não cruza entrega com taxa por associado.
- **Piora:** responde sucesso (200) mesmo com os dois serviços fora. Quem consome precisa ler o conteúdo, não só o código de resposta.
- **Piora:** o gateway passou a ter lógica de negócio de leitura, e não só roteamento. Se aparecer um segundo relatório composto, vale um serviço próprio.

**Histórico:** 12/11/2026: o Contexto ganhou o número do cenário Q4.
