# Atributos de qualidade priorizados — CampoConta

**Entregável que exemplifica:** Etapa 1, item 1.4 (três ou mais cenários concretos, estímulo-resposta), e o checklist "cenários mensuráveis, não 'o sistema deve ser rápido'".

Os números abaixo foram **medidos** rodando o sistema em 10/10 e 12/10/2026, numa máquina com Windows 11; os dos cenários Q3, Q6 e Q7, em 12/11/2026. Em outra máquina podem mudar; o que não pode mudar é o cenário ter número.

## Prioridade

1. **Disponibilidade do registro de entrega:** a balança não para.
2. **Isolamento entre tenants:** nenhuma cooperativa vê a outra.
3. **Desempenho sob vizinho barulhento:** a cooperativa pequena não sente a grande.

## Cenários

| # | Atributo | Fonte e estímulo | Ambiente | Resposta esperada | Medida | Medido | ADR |
|---|---|---|---|---|---|---|---|
| Q1 | Disponibilidade | Balanceiro registra uma entrega | Serviço de cobrança fora do ar | A entrega é registrada; a taxa é gerada quando a cobrança voltar | 100% das entregas registradas; 0 taxas perdidas depois que a cobrança volta | 5 de 5 entregas registradas; fila de 5 eventos zerada em até 15 s após religar | 004 |
| Q2 | Isolamento | Usuário da Buricá pede a entrega 1, que é da Alvorada | Operação normal | Resposta "não encontrada", sem revelar que a entrega existe | 0 linhas de outro tenant em qualquer resposta | 404; e mesmo com o filtro do código desligado, 0 linhas da Alvorada | 001, 002 |
| Q3 | Desempenho | Alvorada dispara 60 relatórios pesados ao mesmo tempo | Fechamento de safra | A consulta de cotas da Buricá continua rápida, e os 60 relatórios são atendidos | Mediana abaixo de 50 ms; 0 relatórios recusados | Com limite: mediana de 4 a 7 ms e 60 de 60 atendidos (sem limite: cerca de 1.600 ms) | 012 |
| Q4 | Disponibilidade (leitura) | Gestor pede o relatório de cotas e taxas | Cobrança fora do ar | O relatório sai com a parte disponível, marcando o que faltou | Resposta em até 2,5 s | Cerca de 2,0 s, com a cobrança marcada como indisponível | 007 |
| Q5 | Correção | O mesmo evento de entrega chega duas vezes à cobrança | Relay reenviando | Uma taxa só | 0 taxas duplicadas | 1 taxa de R$ 100 para a entrega de 2.000 kg | 006 |
| Q6 | Desempenho | 100 usuários, 50 de cada cooperativa, listam cotas, um pedido por segundo cada | Pico de safra | Todos são atendidos, rápido | p95 abaixo de 300 ms (ideal) e nunca acima de 2 s; menos de 1% de erro | p95 de 13 ms; 0% de erro | 012 |
| Q7 | Desempenho | 100 usuários, 50 de cada cooperativa, pedem o relatório pesado, um pedido por segundo cada | Fechamento de safra | Todos são atendidos; quem excede o teto espera a vez | p95 abaixo de 5 s; menos de 1% de erro | p95 de 2,2 s; 0% de erro | 012 |

## O que ainda não tem cenário

- **Recuperação de falha do próprio gateway.** Hoje um endereço malformado o derruba e nada o sobe de volta (defeito C2 da lista em `adr/010`). Um cenário honesto seria "gateway volta sozinho em até N segundos", e hoje o sistema não cumpriria.
- **Custo por tenant.** Vem com a planilha de custo unitário (Etapa 4).
- **1.000 usuários ao mesmo tempo.** Medido em 12/11/2026: 13% dos pedidos recusados, porque a chegada passa do teto de uma máquina. Um cenário honesto pede mais de uma cópia do gateway, e isso depende de tirar a fila da memória (ADR 012).
