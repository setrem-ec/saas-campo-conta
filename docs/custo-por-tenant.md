# Custo por tenant — CampoConta

Entregável 4.4 (a defesa de custo da Etapa 4), no formato do workshop de 26/11/2026. **Os valores são do CampoConta: o seu produto tem outras linhas, outro volume e outra decisão de tenancy.** O CampoConta roda local: os números são **cotação equivalente, não fatura**. Fonte: a referência de preços da disciplina (`precificacao-referencia.md`, Google Cloud, preços e PTAX venda de 25/11/2026, R$ 5,8825/US$).

**Atualizado em 25/11/2026:** o câmbio passou de R$ 5,1217 (29/07/2026) para R$ 5,8825. Só o banco é cotado em dólar, e o custo por tenant foi de R$ 47,75 para R$ 49,23. É a premissa que o fornecedor não controla. Em 26/11, o e-mail passou de R$ 45 para R$ 46, para o total fechar em R$ 1.970: o custo por tenant ficou em R$ 49,25.

## Decomposição (40 tenants, pool)

| Linha de custo | R$/mês | Tipo | Fonte e data |
|---|---|---|---|
| Aplicação (compute) | 780 | fixo | premissa declarada |
| Banco de dados (configuração A, 1 banco para todos) | 457 | fixo (pool, em degraus) | referência seção 3.4: 1 vCPU, 3,75 GiB, 10 GiB SSD, 10 GiB backup, São Paulo, 730 h = R$ 457,39; preço e câmbio de 25/11/2026 |
| Storage de arquivos | 95 | fixo | premissa declarada |
| Tráfego de saída | 60 | fixo | premissa declarada |
| E-mail transacional | 46 | fixo | premissa declarada (R$ 46 desde 26/11/2026, para o total fechar em R$ 1.970) |
| Gateway de pagamento (3,5% da receita) | 532 | variável | premissa declarada: 3,5% × R$ 15.200 |
| **Total** | **1.970** | | |

**As esquecidas:**
- **Engenharia, suporte e incidentes:** fora da tabela, embora sejam o maior custo do primeiro ano. A conta honesta diz isso.
- **Ambientes de teste e pipeline:** R$ 0 hoje, no GitHub Actions gratuito de repositório público.
- **Backup e retenção de dados pessoais (LGPD, arts. 16 e 46):** o backup de 10 GiB está na linha do banco. A retenção por tenant, depois do fim do contrato, ainda não existe (`lgpd.md`, lacunas).

## Memória de cálculo

Refaça a conta nesta ordem:

1. **Custo fixo:** 780 + 457 + 95 + 60 + 46 = R$ 1.438.
2. **Receita:** 40 cooperativas × R$ 380 = R$ 15.200 por mês.
3. **Custo variável:** 3,5% × 15.200 = R$ 532.
4. **Total:** 1.438 + 532 = R$ 1.970.
5. **Custo por tenant:** 1.970 ÷ 40 = R$ 49,25.
6. **Margem bruta:** (380 − 49,25) ÷ 380 = 87,0%.

## Custo unitário e escala (3×: de 40 para 120 cooperativas)

O múltiplo de 3× vem do gatilho de revisão do ADR 002: com 120 cooperativas, a decisão do banco é reaberta.

| | Hoje (40 tenants) | Projetado (120 tenants) |
|---|---|---|
| Custo fixo | R$ 1.438 | R$ 1.895 (banco na configuração B: + R$ 457) |
| Custo variável | R$ 532 | R$ 1.596 (3,5% × 120 × 380) |
| **Custo por tenant** | **R$ 49,25** | **R$ 29,09** |
| Preço por tenant | R$ 380 | R$ 380 |
| **Margem bruta** | **87,0%** | **92,3%** |

O fixo por tenant cai de R$ 35,95 para R$ 15,79. O variável acompanha a receita.

**Onde está o próximo degrau.** No banco, da configuração A para a B: de R$ 457,39 para R$ 914,77, o dobro (referência, seção 4). A premissa é que a A não comporta 120 cooperativas. O número exato da troca não foi medido: medir é parte do gatilho do ADR 002.

**A decisão de tenancy aparece na tabela.** Em pool, um banco serve todos, e o custo por tenant cai com a escala. Em silo, cada cooperativa teria o seu: R$ 457 × 40 = R$ 18.280 só de banco, mais que a receita inteira. Por isso o silo é plano pago à parte (ADR 002): quem pede banco próprio paga o custo de operá-lo.

## Benchmark: São Paulo × us-central1

A mesma conta, com o banco cotado nas duas regiões da referência (seção 3). A coluna "Por quê" diz o motivo de cada linha.

| Linha | São Paulo (R$/mês) | us-central1 (R$/mês) | Por quê |
|---|---|---|---|
| Banco, 40 tenants (configuração A) | 457 | 304,78 | Calculado com a tabela 3.2, coluna us-central1: 1 × 0,0413 × 730 + 3,75 × 0,007 × 730 + 10 × 0,000232877 × 730 + 10 × 0,000109589 × 730 = US$ 51,81 × 5,8825, sem arredondamento intermediário |
| Banco, 120 tenants (configuração B) | 914 | 609,54 | Referência, seção 3.4 |
| Aplicação (compute) | 780 | de 557,14 a 780 | Valor de aula, que não separa CPU, memória e requisição. O prêmio de 1,4× do Cloud Run incide só em CPU e memória (seção 3.1): se os 780 fossem só isso, us-central1 custaria 780 ÷ 1,4 = 557,14. Como a requisição custa igual, o valor real fica entre os dois |
| Tráfego de saída | 60 | 60 | Cobrado pelo destino, que é o mesmo: as cooperativas, na América do Sul (seção 3.3) |
| Storage, e-mail e gateway de pagamento | 95 + 46 + 532 | 95 + 46 + 532 | Premissas sem região |

| | São Paulo | us-central1 |
|---|---|---|
| Custo por tenant, 40 tenants | R$ 49,25 | de R$ 39,87 (1.594,92 ÷ 40) a R$ 45,44 (1.817,78 ÷ 40) |
| Custo por tenant, 120 tenants | R$ 29,09 | de R$ 24,70 (2.963,68 ÷ 120) a R$ 26,55 (3.186,54 ÷ 120) |
| Margem bruta, 40 tenants | 87,0% | de 88,0% a 89,5% |

**A decisão: o CampoConta fica em São Paulo.** Ir para os EUA economiza de R$ 3,81 a R$ 9,38 por cooperativa por mês, de 8% a 19% do custo. Em troca, o código e o peso entregue de cada associado, dados pessoais (`lgpd.md`), passam a ficar fora do país. Quem decide sobre eles é cada cooperativa, a controladora (`lgpd.md`, "Papéis"). Para defender os EUA, faltaria a regra da LGPD sobre dado pessoal no exterior: [FALTA: fonte datada].

## Cobrança

1. **Modelo:** assinatura, R$ 380 por cooperativa por mês.
2. **O que a arquitetura precisa medir:** só o tenant ativo no mês, que o gateway conhece pelo token. Cobrar por entrega exigiria contar as entregas por tenant, e o registro já existe: a tabela `entrega` tem `tenant_id`.
3. **Piso:** na assinatura, o custo por tenant, R$ 49,25. Por entrega, R$ 1.970 ÷ 2.400 entregas (60 por cooperativa) = cerca de R$ 0,82. Para render os mesmos R$ 380 com 60 entregas no mês, o preço seria R$ 6,33 por entrega.

## Premissas e fontes

```
PREMISSA 1: 40 tenants ativos; cenário (o CampoConta tem 2 nos dados de exemplo); fonte: decisão de aula
PREMISSA 2: R$ 380 por tenant por mês; arbitrado em aula, sem pesquisa de mercado
PREMISSA 3: banco = Cloud SQL PostgreSQL Enterprise, southamerica-east1, 1 vCPU, 3,75 GiB, 10 GiB SSD,
            10 GiB backup, 730 h/mês = R$ 457,39/mês.
            Preço de 25/11/2026; PTAX R$ 5,8825/US$ de 25/11/2026 (era R$ 5,1217 de 29/07/2026).
            Aplicação (780), tráfego (60), storage (95) e e-mail (46): premissas declaradas, em R$.
            COTAÇÃO EQUIVALENTE (rodamos local)
PREMISSA 4: 60 entregas por cooperativa por mês (2.400 no total); estimativa
PREMISSA 5: a configuração A não comporta 120 tenants no pool; estimativa, sem medição
PREMISSA 6: no benchmark, a linha de compute vai de 557,14 (só CPU e memória, ÷ 1,4) a 780 (sem prêmio); o valor de aula não separa CPU, memória e requisição
PREMISSA 7: no benchmark, SSD e backup de us-central1 são os preços de 29/07/2026, não reconferidos em 25/11/2026
```
