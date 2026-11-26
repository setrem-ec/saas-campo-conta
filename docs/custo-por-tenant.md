# Custo por tenant — CampoConta

Rascunho do entregável 4.4 (a defesa de custo da Etapa 4), no formato do workshop de 26/11/2026. **Os valores são do CampoConta: o seu produto tem outras linhas, outro volume e outra decisão de tenancy.** O CampoConta roda local, então os números são **cotação equivalente, não fatura**. A fonte é a referência de preços da disciplina (`precificacao-referencia.md`, Google Cloud, preços de 29/07/2026, PTAX venda de R$ 5,1217/US$ da mesma data).

## Decomposição (40 tenants, pool)

| Linha de custo | R$/mês | Tipo | Fonte e data |
|---|---|---|---|
| Aplicação (compute) | 780 | fixo | valor de aula, referência seção 3.1 |
| Banco de dados (configuração A, 1 banco para todos) | 398 | fixo (pool, em degraus) | referência seção 3.4: 1 vCPU, 3,75 GiB, 10 GiB SSD, 10 GiB backup, São Paulo, 730 h = R$ 398,23 |
| Storage de arquivos | 95 | fixo | premissa declarada |
| Tráfego de saída | 60 | fixo | referência seção 3.3 |
| E-mail transacional | 45 | fixo | premissa declarada |
| Gateway de pagamento (3,5% da receita) | 532 | variável | premissa declarada: 3,5% × R$ 15.200 |
| **Total** | **1.910** | | |

**As esquecidas:**
- **Engenharia, suporte e incidentes:** não entram na tabela. São o maior custo do primeiro ano, e a conta honesta diz que ficaram de fora.
- **Ambientes de teste e pipeline:** R$ 0 hoje. O pipeline roda no GitHub Actions gratuito de repositório público.
- **Backup e retenção de dados pessoais (LGPD, arts. 16 e 46):** o backup de 10 GiB já está na linha do banco. A retenção por tenant, depois do fim do contrato, ainda não existe (`lgpd.md`, lacunas).

## Memória de cálculo

Refaça a conta nesta ordem:

1. **Custo fixo:** 780 + 398 + 95 + 60 + 45 = R$ 1.378.
2. **Receita:** 40 cooperativas × R$ 380 = R$ 15.200 por mês.
3. **Custo variável:** 3,5% × 15.200 = R$ 532.
4. **Total:** 1.378 + 532 = R$ 1.910.
5. **Custo por tenant:** 1.910 ÷ 40 = R$ 47,75.
6. **Margem bruta:** (380 − 47,75) ÷ 380 = 87,4%.

## Custo unitário e escala (3×: de 40 para 120 cooperativas)

O múltiplo de 3× é plausível porque o gatilho de revisão do ADR 002 está em 120 cooperativas. É o volume em que a decisão do banco precisa ser reaberta.

| | Hoje (40 tenants) | Projetado (120 tenants) |
|---|---|---|
| Custo fixo | R$ 1.378 | R$ 1.776 (banco na configuração B: + R$ 398) |
| Custo variável | R$ 532 | R$ 1.596 (3,5% × 120 × 380) |
| **Custo por tenant** | **R$ 47,75** | **R$ 28,10** |
| Preço por tenant | R$ 380 | R$ 380 |
| **Margem bruta** | **87,4%** | **92,6%** |

O fixo por tenant cai de R$ 34,45 para R$ 14,80. O variável acompanha a receita.

**Onde está o próximo degrau.** É o banco, da configuração A para a B: de R$ 398,23 para R$ 796,46, o dobro exato (referência, seção 4). A premissa é que a configuração A não comporta 120 cooperativas. Em que número exato a troca acontece não foi medido: medir é parte do gatilho do ADR 002.

**A decisão de tenancy aparece na tabela.** Em pool, um banco serve todos, e o custo por tenant cai com a escala. Em silo, cada cooperativa teria o seu banco: R$ 398 × 40 = R$ 15.920 só de banco, mais do que a receita inteira. Por isso o silo fica como plano pago à parte (ADR 002): quem pede banco próprio paga o custo de operá-lo.

## Benchmark: São Paulo × us-central1

A mesma conta, com o banco cotado nas duas regiões da referência (seção 3). As outras linhas ficam iguais, e a coluna "Por quê" diz o motivo de cada uma.

| Linha | São Paulo (R$/mês) | us-central1 (R$/mês) | Por quê |
|---|---|---|---|
| Banco, 40 tenants (configuração A) | 398 | 265,36 | Calculado com a tabela 3.2, coluna us-central1: 1 × 0,0413 × 730 + 3,75 × 0,007 × 730 + 10 × 0,000232877 × 730 + 10 × 0,000109589 × 730 = US$ 51,81 × 5,1217. A mesma conta, para a configuração B, dá os R$ 530,73 que a referência traz pronto |
| Banco, 120 tenants (configuração B) | 796 | 530,73 | Referência, seção 3.4 |
| Aplicação (compute) | 780 | de 557,14 a 780 | É valor de aula, sem a parte de CPU, de memória e de requisição. O prêmio de 1,4× do Cloud Run incide só em CPU e memória (seção 3.1). Se os 780 fossem só CPU e memória, us-central1 custaria 780 ÷ 1,4 = 557,14. Como há requisição, que custa igual, o valor real fica entre os dois |
| Tráfego de saída | 60 | 60 | É cobrado pelo destino, e o destino é o mesmo: as cooperativas, na América do Sul (seção 3.3) |
| Storage, e-mail e gateway de pagamento | 95 + 45 + 532 | 95 + 45 + 532 | Premissas sem região |

| | São Paulo | us-central1 |
|---|---|---|
| Custo por tenant, 40 tenants | R$ 47,75 | de R$ 38,86 (1.554,50 ÷ 40) a R$ 44,43 (1.777,36 ÷ 40) |
| Custo por tenant, 120 tenants | R$ 28,10 | de R$ 24,03 (2.883,87 ÷ 120) a R$ 25,89 (3.106,73 ÷ 120) |
| Margem bruta, 40 tenants | 87,4% | de 88,3% a 89,8% |

**A decisão: o CampoConta fica em São Paulo.** Ir para os EUA economiza de R$ 3,32 a R$ 8,89 por cooperativa por mês, de 7% a 19% do custo. Em troca, o código e o peso entregue de cada associado, que são dados pessoais (`lgpd.md`), passam a ficar fora do país. Quem decide sobre esses dados é cada cooperativa, a controladora deles (`lgpd.md`, "Papéis"). Para defender os EUA, faltaria a regra da LGPD sobre dado pessoal no exterior: [FALTA: fonte datada].

## Cobrança

1. **Modelo:** assinatura, R$ 380 por cooperativa por mês.
2. **O que a arquitetura precisa medir:** só o tenant ativo no mês, que o gateway já conhece pelo token. Se o CampoConta passasse a cobrar por entrega, precisaria contar cada entrega por tenant. O registro já existe: a tabela `entrega` tem `tenant_id`.
3. **Piso:** na assinatura, o piso é o custo por tenant, R$ 47,75. Por entrega, seria R$ 1.910 ÷ 2.400 entregas (60 por cooperativa) = cerca de R$ 0,80. Para render os mesmos R$ 380 com 60 entregas no mês, o preço seria R$ 6,33 por entrega.

## Premissas e fontes

```
PREMISSA 1: 40 tenants ativos; cenário (o CampoConta tem 2 nos dados de exemplo); fonte: decisão de aula
PREMISSA 2: R$ 380 por tenant por mês; arbitrado em aula, sem pesquisa de mercado
PREMISSA 3: banco = Cloud SQL PostgreSQL Enterprise, southamerica-east1, 1 vCPU, 3,75 GiB, 10 GiB SSD,
            10 GiB backup, 730 h/mês = R$ 398,23/mês.
            Preço de 29/07/2026; PTAX R$ 5,1217/US$ de 29/07/2026.
            COTAÇÃO EQUIVALENTE (rodamos local)
PREMISSA 4: 60 entregas por cooperativa por mês (2.400 no total); estimativa
PREMISSA 5: a configuração A não comporta 120 tenants no pool; estimativa, sem medição
PREMISSA 6: no benchmark, a linha de compute vai de 557,14 (só CPU e memória, ÷ 1,4) a 780 (sem prêmio); o valor de aula não separa CPU, memória e requisição
```
