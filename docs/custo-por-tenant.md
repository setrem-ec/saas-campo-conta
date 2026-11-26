# Custo por tenant — CampoConta

Entregável 4.4 (a defesa de custo da Etapa 4), no formato do workshop de 26/11/2026. **Os valores são do CampoConta: o seu produto tem outras linhas, outro volume e outra decisão de tenancy.** O CampoConta roda local: os números são **cotação equivalente, não fatura**. Fonte: a referência de preços da disciplina (`precificacao-referencia.md`, Google Cloud, preços e PTAX venda de 25/11/2026, R$ 5,8825/US$).

**Atualizado em 25/11/2026:** o câmbio passou de R$ 5,1217 (29/07/2026) para R$ 5,8825. Só o banco é cotado em dólar, e o custo por tenant foi de R$ 47,75 para R$ 49,23. É a premissa que o fornecedor não controla. Em 26/11, duas decisões do dono do produto: o e-mail passou de R$ 45 para R$ 46, para o total fechar redondo; e o banco passou a HA (alta disponibilidade: uma cópia em outra zona assume se a primeira cair), de R$ 457 para R$ 907, para a queda de uma zona não parar as 40 cooperativas. O custo por tenant ficou em R$ 60,50.

## Decomposição (40 tenants, pool)

| Linha de custo | R$/mês | Tipo | Fonte e data |
|---|---|---|---|
| Aplicação (compute) | 780 | fixo | premissa declarada |
| Banco de dados (configuração A em HA, 1 banco para todos) | 907 | fixo (pool, em degraus) | referência seção 3.4: 1 vCPU, 3,75 GiB, 10 GiB SSD, 10 GiB backup, em HA, São Paulo, 730 h = R$ 907,28; SSD em HA lido em 26/11/2026, câmbio de 25/11/2026 |
| Storage de arquivos | 95 | fixo | premissa declarada |
| Tráfego de saída | 60 | fixo | premissa declarada |
| E-mail transacional | 46 | fixo | premissa declarada (R$ 46 desde 26/11/2026, para o total fechar redondo) |
| Gateway de pagamento (3,5% da receita) | 532 | variável | premissa declarada: 3,5% × R$ 15.200 |
| **Total** | **2.420** | | |

**As esquecidas:**
- **Engenharia, suporte e incidentes:** fora da tabela, embora sejam o maior custo do primeiro ano. A conta honesta diz isso.
- **Ambientes de teste e pipeline:** R$ 0 hoje, no GitHub Actions gratuito de repositório público.
- **Backup e retenção de dados pessoais (LGPD, arts. 16 e 46):** o backup de 10 GiB está na linha do banco. A retenção por tenant, depois do fim do contrato, ainda não existe (`lgpd.md`, lacunas).

## Memória de cálculo

Refaça a conta nesta ordem:

1. **Custo fixo:** 780 + 907 + 95 + 60 + 46 = R$ 1.888.
2. **Receita:** 40 cooperativas × R$ 380 = R$ 15.200 por mês.
3. **Custo variável:** 3,5% × 15.200 = R$ 532.
4. **Total:** 1.888 + 532 = R$ 2.420.
5. **Custo por tenant:** 2.420 ÷ 40 = R$ 60,50.
6. **Margem bruta:** (380 − 60,50) ÷ 380 = 84,1%.

## Custo unitário e escala (3×: de 40 para 120 cooperativas)

O múltiplo de 3× vem do gatilho de revisão do ADR 002: com 120 cooperativas, a decisão do banco é reaberta.

| | Hoje (40 tenants) | Projetado (120 tenants) |
|---|---|---|
| Custo fixo | R$ 1.888 | R$ 2.795 (banco na configuração B em HA: + R$ 907) |
| Custo variável | R$ 532 | R$ 1.596 (3,5% × 120 × 380) |
| **Custo por tenant** | **R$ 60,50** | **R$ 36,59** |
| Preço por tenant | R$ 380 | R$ 380 |
| **Margem bruta** | **84,1%** | **90,4%** |

O fixo por tenant cai de R$ 47,20 para R$ 23,29. O variável acompanha a receita.

**Onde está o próximo degrau.** No banco, da configuração A para a B: em HA, de R$ 907,28 para R$ 1.814,57, o dobro (referência, seções 3.4 e 4). A premissa é que a A não comporta 120 cooperativas. O número exato da troca não foi medido: medir é parte do gatilho do ADR 002.

**A decisão de tenancy aparece na tabela.** Em pool, um banco serve todos, e o custo por tenant cai com a escala. Em silo, cada cooperativa teria o seu: R$ 907 × 40 = R$ 36.280 só de banco, em HA, mais que a receita inteira. Por isso o silo é plano pago à parte (ADR 002): quem pede banco próprio paga o custo de operá-lo.

## Benchmark: São Paulo × us-central1

A mesma conta, com o banco cotado nas duas regiões da referência (seção 3). A coluna "Por quê" diz o motivo de cada linha.

| Linha | São Paulo (R$/mês) | us-central1 (R$/mês) | Por quê |
|---|---|---|---|
| Banco, 40 tenants (configuração A em HA) | 907 | 604,86 | Referência, seção 3.4: 1 × 0,0826 × 730 + 3,75 × 0,014 × 730 + 10 × 0,000465753 × 730 + 10 × 0,000109589 × 730 = US$ 102,82 × 5,8825 |
| Banco, 120 tenants (configuração B em HA) | 1.814 | 1.209,71 | Referência, seção 3.4 |
| Aplicação (compute) | 780 | de 557,14 a 780 | Valor de aula, que não separa CPU, memória e requisição. O prêmio de 1,4× do Cloud Run incide só em CPU e memória (seção 3.1): se os 780 fossem só isso, us-central1 custaria 780 ÷ 1,4 = 557,14. Como a requisição custa igual, o valor real fica entre os dois |
| Tráfego de saída | 60 | 60 | Cobrado pelo destino, que é o mesmo: as cooperativas, na América do Sul (seção 3.3) |
| Storage, e-mail e gateway de pagamento | 95 + 46 + 532 | 95 + 46 + 532 | Premissas sem região |

| | São Paulo | us-central1 |
|---|---|---|
| Custo por tenant, 40 tenants | R$ 60,50 | de R$ 47,38 (1.895,00 ÷ 40) a R$ 52,95 (2.117,86 ÷ 40) |
| Custo por tenant, 120 tenants | R$ 36,59 | de R$ 29,70 (3.563,85 ÷ 120) a R$ 31,56 (3.786,71 ÷ 120) |
| Margem bruta, 40 tenants | 84,1% | de 86,1% a 87,5% |

**A decisão: o CampoConta fica em São Paulo.** Ir para os EUA economiza de R$ 7,55 a R$ 13,12 por cooperativa por mês, de 12% a 22% do custo. Em troca, o código e o peso entregue de cada associado, dados pessoais (`lgpd.md`), passam a ficar fora do país. Quem decide sobre eles é cada cooperativa, a controladora (`lgpd.md`, "Papéis"). Para defender os EUA, faltaria a regra da LGPD sobre dado pessoal no exterior: [FALTA: fonte datada].

## Cobrança

1. **Modelo:** assinatura, R$ 380 por cooperativa por mês.
2. **O que a arquitetura precisa medir:** só o tenant ativo no mês, que o gateway conhece pelo token. Cobrar por entrega exigiria contar as entregas por tenant, e o registro já existe: a tabela `entrega` tem `tenant_id`.
3. **Piso:** na assinatura, o custo por tenant, R$ 60,50. Por entrega, R$ 2.420 ÷ 2.400 entregas (60 por cooperativa) = cerca de R$ 1,01. Para render os mesmos R$ 380 com 60 entregas no mês, o preço seria R$ 6,33 por entrega.

## Premissas e fontes

```
PREMISSA 1: 40 tenants ativos; cenário (o CampoConta tem 2 nos dados de exemplo); fonte: decisão de aula
PREMISSA 2: R$ 380 por tenant por mês; arbitrado em aula, sem pesquisa de mercado
PREMISSA 3: banco = Cloud SQL PostgreSQL Enterprise, southamerica-east1, 1 vCPU, 3,75 GiB, 10 GiB SSD,
            10 GiB backup, em HA, 730 h/mês = R$ 907,28/mês (sem HA, R$ 457,39).
            Preço de 25/11/2026, SSD em HA de 26/11/2026; PTAX R$ 5,8825/US$ de 25/11/2026 (era R$ 5,1217 de 29/07/2026).
            Aplicação (780), tráfego (60), storage (95) e e-mail (46): premissas declaradas, em R$.
            COTAÇÃO EQUIVALENTE (rodamos local)
PREMISSA 4: 60 entregas por cooperativa por mês (2.400 no total); estimativa
PREMISSA 5: a configuração A não comporta 120 tenants no pool; estimativa, sem medição
PREMISSA 6: no benchmark, a linha de compute vai de 557,14 (só CPU e memória, ÷ 1,4) a 780 (sem prêmio); o valor de aula não separa CPU, memória e requisição
PREMISSA 7: no benchmark, SSD, SSD em HA e backup de us-central1 conferidos em 26/11/2026 (cloud.google.com/sql/pricing)
PREMISSA 8: o banco em HA é decisão do dono do produto (26/11/2026); a meta de disponibilidade que o justifica ainda não existe: [FALTA: meta de disponibilidade em slo.md]
```
