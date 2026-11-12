# Declaração de uso de IA — CampoConta

**Entregável que exemplifica:** a declaração que acompanha cada entrega de Etapa (`docs/uso-de-ia.md`), no formato da política da disciplina: por artefato, a ferramenta, para quê, como foi usada e o que foi aceito, rejeitado ou corrigido.

> **Isto não é o seu PI.** É o exemplo público do CampoConta, material de aula. Use o **formato**; a sua declaração conta o que aconteceu no seu produto.

**Escrita em 12/11/2026.** Vale para o tronco no commit `0deac2a` e para esta pasta `docs/`.

## Quem fez o quê

O professor não programa. Ele decide o que o produto faz, escolhe entre as alternativas, roda o sistema e dá o aceite. A IA escreve o código e redige os documentos. A ferramenta é uma só em todos os artefatos: **Claude**, da Anthropic, usado pelo Claude Code.

## Por artefato

| Artefato | Para quê a IA foi usada | Como | Aceito, rejeitado ou corrigido |
|---|---|---|---|
| Código dos três serviços, SQL e `compose.yaml` | Escrever o sistema inteiro | O professor pediu um SaaS multi-tenant pequeno, que mostrasse microsserviços em seis experimentos. A IA escreveu e rodou os seis experimentos de ponta a ponta em 10/10/2026 | **Aceito** depois de rodar. **Corrigido:** uma revisão de código achou erros nas instruções de `git` e um exemplo errado no README. **Não corrigido, de propósito:** os defeitos C1 a C17, registrados no `adr/010` |
| `README.md` da raiz | Redigir o "como rodar" e os limites do sistema | Rascunho da IA, lido pelo professor | **Rejeitado e reescrito:** a IA escreveu que mensageria gerenciada era assunto de outra disciplina. O professor corrigiu: escolher entre tabela, fila e publicar/assinar é decisão de arquitetura desta disciplina |
| ADRs 001 a 010 | Registrar as decisões que o código já tinha tomado | A IA redigiu em 15/10/2026, depois do código pronto. Cada ADR confessa isso no campo Status | **Aceitos** pelo professor. **Efeito colateral registrado:** escrever as alternativas depois mostrou decisões frágeis, que viraram o `adr/010` |
| `visao.md`, `c4.md`, `mapa-contextos.md` (parte "Hoje") | Descrever o sistema como está | A IA redigiu a partir do código. Um revisor automático sem contexto conferiu cada afirmação contra o commit `0deac2a` | **Corrigido** o que não batia com o código publicado: 11 imprecisões em 12/11/2026 (ex.: a lista de rotas omitia duas, e o mapeamento LGPD dizia que o sistema sabe quem registrou cada entrega, o que ele ainda não sabe) |
| `visao.md`, `c4.md`, `mapa-contextos.md` (parte "Alvo") | Propor a arquitetura-alvo | A IA apresentou alternativas com custo e risco. O professor escolheu cada uma | **Decidido contra a recomendação da IA:** o contexto Cobrança virou Taxação; o CampoConta virou produto com critério de aceite, e não só exemplo lido. **Decidido a favor:** banco próprio para a Plataforma; Relatórios deixa de ser contexto |
| `estudo-dominio-cooperativas.md` | Levantar como cooperativas reais tratam cota, pontos e benefícios | A IA buscou e leu estatutos e programas públicos | **Corrigiu uma hipótese do professor:** quem entrega muito não perde benefício. **Corrigiu um erro da IA:** a eliminação do associado é do Conselho de Administração, não da Assembleia. A base é fraca e o estudo diz isso |
| `atributos-qualidade.md`, `lgpd.md`, `especificacao.md` | Redigir cenários, mapeamento de dados e o que o sistema promete | Rascunho da IA sobre números medidos nos experimentos | **Aceitos** pelo professor |

## O que a IA não decidiu

- O que o produto é, para quem e o que fica de fora.
- A ordem em que as partes entram.
- O que vai a público neste repositório: cada publicação passa pelo aceite do professor.

## Como o resultado é conferido

- **Hoje:** rodando o sistema. Os seis experimentos têm saída real registrada. Não há teste automatizado.
- **Daqui em diante:** uma suíte de testes, um roteiro de comandos com a saída esperada e um revisor que lê a mudança contra a especificação, antes de cada aceite.
- [assim: resultado do ensaio do professor de 13/10/2026, rodando o sistema como aluno, e o que ele mudou por causa disso]

## O que isto ensina para o seu PI

Declarar o uso não diminui a entrega. O que pesa é o que você **conferiu**, o que **rejeitou** e se consegue **explicar** o que entregou na defesa.
