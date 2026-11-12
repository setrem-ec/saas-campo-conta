# Atributos de qualidade priorizados — CampoConta

**Entregável que exemplifica:** Etapa 1, item 1.4 (três ou mais cenários concretos, estímulo-resposta), e o checklist "cenários mensuráveis, não 'o sistema deve ser rápido'".

Os números abaixo foram **medidos** rodando o sistema em 10/10 e 12/10/2026, numa máquina com Windows 11. Em outra máquina podem mudar; o que não pode mudar é o cenário ter número.

## Prioridade

1. **Disponibilidade do registro de entrega:** a balança não para.
2. **Isolamento entre tenants:** nenhuma cooperativa vê a outra.
3. **Desempenho sob vizinho barulhento:** a cooperativa pequena não sente a grande.

## Cenários

| # | Atributo | Fonte e estímulo | Ambiente | Resposta esperada | Medida | Medido | ADR |
|---|---|---|---|---|---|---|---|
| Q1 | Disponibilidade | Balanceiro registra uma entrega | Serviço de cobrança fora do ar | A entrega é registrada; a taxa é gerada quando a cobrança voltar | 100% das entregas registradas; 0 taxas perdidas depois que a cobrança volta | 5 de 5 entregas registradas; fila de 5 eventos zerada em até 15 s após religar | 004 |
| Q2 | Isolamento | Usuário da Buricá pede a entrega 1, que é da Alvorada | Operação normal | Resposta "não encontrada", sem revelar que a entrega existe | 0 linhas de outro tenant em qualquer resposta | 404; e mesmo com o filtro do código desligado, 0 linhas da Alvorada | 001, 002 |
| Q3 | Desempenho | Alvorada dispara 60 relatórios pesados ao mesmo tempo | Fechamento de safra | A consulta de cotas da Buricá continua rápida | Mediana abaixo de 50 ms | Com limite: mediana de 5 ms (sem limite: cerca de 6.000 ms) | 008 |
| Q4 | Disponibilidade (leitura) | Gestor pede o relatório de cotas e taxas | Cobrança fora do ar | O relatório sai com a parte disponível, marcando o que faltou | Resposta em até 2,5 s | Cerca de 2,0 s, com a cobrança marcada como indisponível | 007 |
| Q5 | Correção | O mesmo evento de entrega chega duas vezes à cobrança | Relay reenviando | Uma taxa só | 0 taxas duplicadas | 1 taxa de R$ 100 para a entrega de 2.000 kg | 006 |

## O que ainda não tem cenário

- **Recuperação de falha do próprio gateway.** Hoje um endereço malformado o derruba e nada o sobe de volta (defeito C2 da lista em `adr/010`). Um cenário honesto seria "gateway volta sozinho em até N segundos", e hoje o sistema não cumpriria.
- **Custo por tenant.** Vem com a planilha de custo unitário (Etapa 4).
