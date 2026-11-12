# ADR 009 — Ambiente: Docker Compose local

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

O sistema tem cinco peças (três serviços e dois bancos) e precisa subir na máquina de qualquer aluno da turma, em Windows, macOS ou Linux, sem conta paga e sem instalar nada além do Docker (história 25 em `../especificacao.md`). A Etapa 2 aceita três caminhos: o cluster `saas` do Lab 0, Docker Compose local ou provedor gerenciado.

## Decisão

Tudo sobe com `docker compose up -d --build`, a partir de um `compose.yaml` com as cinco peças, mais o contêiner `ferramentas`, que só sobe sob demanda (a carga do experimento 6), e uma imagem Node comum aos três serviços; só o gateway publica portas, e só em `127.0.0.1` (8080 para o produto, 8081 para o painel do laboratório).

## Alternativas descartadas

- **Cluster `saas` (kind) do Lab 0.** Mais próximo de produção, mas exige o cluster funcionando em cada máquina antes de qualquer experimento. Descartada para o sistema de aula. Orquestração é assunto de Cloud Computing.
- **Provedor gerenciado.** Exige conta e conexão, e os experimentos de derrubar serviço não cabem num ambiente que não controlamos. Descartada.

## Consequências

- **Melhora:** um comando sobe tudo; `docker compose down -v` volta aos dados de exemplo (história 26).
- **Melhora:** só o gateway é alcançável de fora; os serviços ficam numa rede interna do Compose.
- **Piora:** a garantia de que "só o gateway fala com os serviços" é da rede do Compose, não do código (defeito C6, ADR 010).
- **Piora:** os três serviços dividem a mesma imagem e o código de `comum/`, o que tira parte da independência de implantação (defeito C11).
- **Piora:** o sistema não recarrega o código sozinho; mudou um `.js`, é preciso `docker compose restart <servico>`.

**Histórico:** 12/11/2026: a Decisão passou a citar o contêiner `ferramentas`, que o `compose.yaml` também declara; a alternativa do cluster ficou só com o motivo técnico.
