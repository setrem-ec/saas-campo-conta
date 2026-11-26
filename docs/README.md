# Documentação de arquitetura do CampoConta

O que a sua unidade de PI entrega nas quatro Etapas, feito para o CampoConta. **Copie o formato, não o conteúdo:** o seu produto tem outro problema, outros números e outras decisões. Copiar uma decisão daqui sem o contexto do seu produto é avaliado como cópia.

## O que o seu repositório precisa ter, e o exemplo de cada item

| Etapa | Item | No CampoConta |
|---|---|---|
| 1 | 1.1 Visão do produto (problema, cliente fictício, personas de tenant) | `visao.md` |
| 1 | 1.2 C4 níveis 1 e 2, esboço do 3 | `c4.md` |
| 1 | 1.3 ADRs iniciais, no mínimo 3: tenancy (obrigatório), stack, comunicação | `adr/002` (tenancy), `adr/009` (stack e ambiente), `adr/004` (comunicação) |
| 1 | 1.4 Três ou mais cenários de qualidade com número | `atributos-qualidade.md` |
| 1 | 1.5 Mapeamento LGPD (dados, finalidade, medidas) | `lgpd.md` |
| 2 | 2.1 Repositório estruturado, com README de como rodar | o `README.md` da raiz do repositório |
| 2 | 2.2 Dois ou mais serviços rodando, com o ambiente escolhido em ADR | `adr/009` |
| 2 | 2.3 Isolamento entre tenants, demonstrado ao vivo | `adr/002` e o experimento 2 |
| 2 | 2.4 Mapa de contextos coerente com o C4, com as divergências | `mapa-contextos.md` |
| 2 | 2.5 ADRs atualizados, no mínimo mais 2, incluindo a comunicação entre os serviços | `adr/004` (comunicação) e `adr/005` a `adr/010` |
| 2 | Declaração de uso de IA, junto com a entrega | `uso-de-ia.md` |
| 3 | Plano de testes em três colunas (Encontro 12) | `plano-de-testes.md` |
| 3 | 3.1 Suíte de testes rodando a cada push | `adr/011`, `.github/workflows/testes.yml` e a aba Actions do repositório: unidade (`producao/testes/`), integração e ponta a ponta (`testes/`). A execução vermelha causada por teste está no histórico: o commit `red:` do achado S1 |
| 3 | 3.2 Teste automatizado que prova o isolamento | `testes/isolamento.test.js` (leitura de entregas, nos dois sentidos), `testes/integracao.test.js` (a política do banco sozinha) e `testes/authz.test.js` (cabeçalho de tenant forjado) |
| 3 | 3.3 Relatório de carga (k6) | `carga-enc14.md` |
| 3 | 3.4 SLO de produto | `slo.md`: os mesmos números dos limiares do k6 |
| 3 | 3.5 Verificação de segurança | `seguranca-enc15.md`: rotas, segredos, dependências, achados com tratamento e LGPD |
| 3 | "O pipeline falha se um teste quebra", demonstrado | `evidencias/pipeline-vermelho-2026-11-12.md` e a branch `demo/isolamento-quebrado` |
| 3 | Gatilho de revisão num ADR (26/11) | `adr/002`, seção "Gatilho de revisão" |
| 4 | 4.2 Repositório final: tag ou release, README completo | o `README.md` da raiz e a release `etapa-4`, na página **Releases** do repositório |
| 4 | 4.3 Demo com 2 tenants, isolamento nos dois sentidos | `demo.md` |
| 4 | 4.4 Custo com memória de cálculo e benchmark São Paulo × us-central1 | `custo-por-tenant.md` |

A `especificacao.md` não é cobrada: mostra como descrever o que o sistema promete antes de mudá-lo.

## Se você tem uma hora

Leia `adr/README.md`, `adr/002` (tenancy), `adr/004` (comunicação) e `mapa-contextos.md`, nesta ordem. São os que a defesa da Etapa 2 mais pergunta.

## Os seis experimentos, que os documentos citam

| Exp. | O que aconteceu |
|---|---|
| 1 | Uma entrega atravessa gateway → produção → cobrança |
| 2 | A Buricá tenta ver a entrega da Alvorada, com e sem as duas camadas de isolamento |
| 3 | O `JOIN` entre entrega e taxa falha, porque são dois bancos |
| 4 | A cobrança cai e a entrega continua sendo registrada |
| 5 | O mesmo evento chega duas vezes à cobrança |
| 6 | A Alvorada dispara 60 relatórios pesados e a Buricá espera |

## Termos que aparecem aqui

RLS, outbox e relay estão no `README.md` da raiz, seção "Termos que você vai ver aqui".

- **Recuo crescente:** depois de cada falha, esperar mais antes de tentar de novo (0,5 s, 1 s, 2 s…), para não martelar quem está fora do ar.
- **Consistência eventual:** o dado fica certo em todos os lugares, mas não no mesmo instante: a taxa aparece pouco depois da entrega.
- **Idempotência:** receber a mesma mensagem duas vezes tem o mesmo efeito que receber uma.
- **Saga:** passos em serviços diferentes; se um falha, uma ação de compensação desfaz os anteriores.
- **Cliente-fornecedor / conformista:** relações entre contextos (Encontro 08). Na primeira, quem consome negocia o contrato; na segunda, aceita o formato do outro.
- **Defeito C1, C2…:** numeração da lista de defeitos conhecidos, no `adr/010`.
