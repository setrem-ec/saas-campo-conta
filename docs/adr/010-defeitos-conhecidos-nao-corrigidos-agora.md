# ADR 010 — Defeitos conhecidos que decidimos não corrigir agora

**Status:** aceito · 15/10/2026

## Contexto

Uma revisão independente do código (12/10) e uma revisão de código de 15/10 acharam defeitos no CampoConta. A turma usa o sistema hoje, 15/10, pela primeira vez. Mexer no código no dia da aula traria o risco de quebrar o que já foi testado de ponta a ponta. Nenhum dos defeitos abaixo atrapalha os seis experimentos quando os comandos são seguidos como estão escritos.

## Decisão

Os defeitos abaixo ficam registrados e **não são corrigidos antes de 15/10**; cada um tem um contorno documentado ou não afeta a aula, e as correções entram uma a uma, cada uma no seu commit, a partir de 20/10.

| # | Defeito | Contorno hoje |
|---|---|---|
| C1 | A cobrança aceita evento de qualquer chamador interno e confia no tenant escrito nele; dá para "queimar" o identificador de um evento futuro | Só o gateway é alcançável de fora (ADR 009) |
| C2 | Um endereço terminado em `//` derruba o gateway (a leitura do endereço fica fora do tratamento de erro, também na produção e na cobrança), e nada o sobe de volta | `docker compose up -d gateway`, na tabela "Se der errado" do `README.md` da raiz do repositório |
| C4 | O limite de 3 pedidos por tenant só protege porque 3 < 5 conexões e um tenant só abusa | Nenhum: é limite de desenho, e vira experimento quando houver um terceiro tenant |
| C6 | Produção e cobrança aceitam `x-tenant-id` de qualquer chamador interno | Igual a C1 |
| C7 | A `outbox` guarda dado de associado sem política por linha | Igual a C1 |
| C9 | 503 não quer dizer "não gravou"; repetir o registro pode criar a entrega duas vezes | Não repetir o `POST` nos experimentos |
| C10 | O limite por tenant é contado na memória de um gateway | Só existe um gateway |
| C11 | Os serviços dividem imagem e código comum; o relay mora na produção e conhece o endereço da cobrança | Nenhum: custo aceito (ADRs 005 e 009) |
| C12 | Dinheiro passa por número de ponto flutuante no cálculo da taxa | Valores da aula são exatos |
| C14 | O evento não carrega o identificador da requisição: o log da cobrança perde o `req=` (a especificação promete o identificador nos três serviços) | Seguir pelo número do evento, que aparece na produção e na cobrança |
| C15 | Os bancos sem tratamento de erro de conexão ociosa: reiniciar só um banco pode derrubar o serviço | `docker compose down -v` e `up -d`, como o roteiro manda |
| C16 | O script do experimento 6 morre sem imprimir resultado se o gateway cair no meio | Subir o gateway e rodar de novo |
| C17 | O painel aceita nomes de chave herdados do JavaScript (`constructor`) e responde um diagnóstico falso | Usar só os nomes da tabela do painel |

A numeração pula de propósito: C3, C5 e C8 eram defeitos do roteiro e do README, já corrigidos no texto. C13 (o roteiro registra a entrega por parâmetros no endereço; o código aceita também o corpo em JSON) é escolha consciente: assim o comando cabe numa linha no PowerShell, que estraga aspas de JSON.

## Alternativas descartadas

- **Corrigir tudo antes da aula.** Treze correções sem teste automatizado, no dia, sem tempo de rodar os seis experimentos de novo. Descartada pelo risco.
- **Corrigir só o C2.** É o único que um erro de digitação dispara. Foi a recomendação da revisão de 12/10; não deu tempo de corrigir e testar antes de 15/10. O contorno está no README.
- **Não registrar.** O defeito existiria do mesmo jeito, só que escondido. Descartada.

## Consequências

- **Melhora:** quem lê o sistema sabe onde ele mente; a lista vira trabalho futuro com ordem clara (C2 primeiro, depois C1, que é o furo de isolamento mais sério).
- **Melhora:** C1 e C4 são material de aula melhor que qualquer experimento pronto: um furo real e um limite que falha.
- **Piora:** até a correção, a frase "só o gateway fala com os serviços" é garantida pela rede, não pelo código.
- **Piora:** quem digitar `//` sozinho em casa perde alguns minutos até achar a linha do README.

## Situação em 12/11/2026

O texto acima é a foto de 15/10 e fica como foi escrito. O que mudou desde então:

- **Nenhum defeito desta lista foi corrigido.** A lista vale inteira para o commit `0deac2a`.
- **As correções não começaram em 20/10.** Elas passaram a entrar junto com a evolução do produto, nesta ordem: C2 primeiro; depois a suíte de testes e o pipeline; depois C1; depois C12, com a taxa em centavos.
- **Cada correção ganha o seu ADR** quando for feita, e esta lista é atualizada no mesmo commit.

**Histórico:** 12/11/2026: nasceu a seção "Situação em 12/11/2026"; o texto do C13 passou a dizer que o código aceita também o corpo em JSON.
