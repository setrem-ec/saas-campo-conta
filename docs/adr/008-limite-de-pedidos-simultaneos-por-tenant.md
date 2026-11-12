# ADR 008 — Limite de pedidos simultâneos por tenant, no gateway

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

No modelo pool (ADR 002) as cooperativas dividem o mesmo serviço e as mesmas **5 conexões** de banco da Produção. No fechamento de safra, uma cooperativa grande dispara relatórios pesados (0,5 s cada). Medido no experimento 6: sem limite, 60 relatórios da Alvorada fazem a Buricá esperar cerca de 6 s por uma consulta que leva 5 ms.

## Decisão

O gateway permite no máximo **3 pedidos em andamento por tenant**; o quarto recebe a resposta 429 na hora, com a mensagem do limite.

## Alternativas descartadas

- **Limite por taxa no tempo** (pedidos por segundo). Não segura pedidos lentos: 3 relatórios de 0,5 s por segundo ainda ocupam as conexões. Descartada para este caso.
- **Limite dentro de cada serviço.** Repete a regra em cada serviço, e o pedido já chegou longe antes de ser recusado. Descartada.
- **Sem limite.** É o vizinho barulhento do experimento 6. Descartada.

## Consequências

- **Melhora:** com o limite, a Alvorada recebe 429 em 57 dos 60 pedidos e a Buricá volta a responder em cerca de 5 ms.
- **Piora:** o limite só protege porque 3 é menor que 5 e só um tenant abusa. Dois tenants no teto ocupam 6 conexões (defeito C4, ADR 010).
- **Piora:** a contagem fica na memória de um gateway; com dois gateways, o teto dobra (defeito C10).
- **Piora:** o mesmo teto vale para todas as cooperativas. Plano por tamanho de cliente exigiria teto por tenant, o que liga este ADR ao encontro de precificação.

**Histórico:** 12/11/2026: a referência ao encontro de precificação perdeu o número.
