# Documentação de arquitetura do CampoConta

Esta pasta é o exemplo do que a sua unidade de PI entrega nas Etapas 1 e 2, e do começo da Etapa 3, feito para o CampoConta. **Copie o formato, não o conteúdo:** o seu produto tem outro problema, outros números e outras decisões. Copiar uma decisão daqui sem o contexto do seu produto é avaliado como cópia de material de aula.

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
| 3 | 3.1 Suíte de testes rodando a cada push | `adr/011`, `.github/workflows/testes.yml` e a aba Actions do repositório |
| 3 | 3.2 Teste automatizado que prova o isolamento | `testes/isolamento.test.js` |
| 3 | "O pipeline falha se um teste quebra", demonstrado | A branch `demo/isolamento-quebrado`, com ✗ na aba Actions |

A `especificacao.md` não é cobrada; mostra como descrever o que o sistema promete antes de mudá-lo.

## Se você tem uma hora

Leia nesta ordem: `adr/README.md`, `adr/002` (tenancy), `adr/004` (comunicação) e `mapa-contextos.md`. São os quatro que a defesa da Etapa 2 mais pergunta.

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

- **RLS (segurança por linha):** regra dentro do banco que só devolve as linhas do tenant da vez, mesmo que o código peça todas.
- **Outbox:** tabela onde o serviço grava o aviso ("evento") na mesma transação do dado, para o aviso não se perder.
- **Relay:** laço que lê a outbox e entrega cada evento ao outro serviço.
- **Recuo crescente:** depois de uma falha, esperar mais a cada nova tentativa (0,5 s, 1 s, 2 s…), para não martelar quem está fora do ar.
- **Consistência eventual:** o dado fica certo em todos os lugares, mas não no mesmo instante. A taxa aparece instantes depois da entrega.
- **Idempotência:** receber a mesma mensagem duas vezes tem o mesmo efeito que receber uma.
- **Saga:** sequência de passos em serviços diferentes em que, se um falha, os anteriores são desfeitos por uma ação de compensação.
- **Cliente-fornecedor / conformista:** tipos de relação entre contextos (Encontro 08). No primeiro, quem consome negocia o contrato; no segundo, aceita o formato do outro como está.
- **Defeito C1, C2…:** numeração da lista de defeitos conhecidos, no `adr/010`.
