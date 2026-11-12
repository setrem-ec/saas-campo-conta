# ADR 003 — Um banco por serviço

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

Produção e Cobrança são contextos diferentes (ver `../mapa-contextos.md`): a primeira fala de cota e entrega, a segunda de taxa. A Cobrança precisa saber de cada entrega para calcular a taxa (R$ 0,05 por kg). Se os dois serviços lerem as mesmas tabelas, qualquer mudança no modelo de entrega quebra a Cobrança sem aviso, e os dois deixam de poder mudar separados.

## Decisão

Cada serviço é dono do seu banco (`producao-db` e `cobranca-db`, PostgreSQL 16) e nenhum lê o banco do outro; o que a Cobrança sabe de uma entrega chega por evento (ADR 004) e é copiado para a tabela `taxa`.

## Alternativas descartadas

- **Banco único, tabelas compartilhadas.** Permite `JOIN`, mas acopla os dois modelos: renomear uma coluna de `entrega` quebra a Cobrança. Descartada porque anula a separação em serviços.
- **Banco único, um schema por serviço.** Separa no papel, mas o `JOIN` entre schemas continua possível e alguém acaba fazendo. Descartada porque a fronteira depende de disciplina.

## Consequências

- **Melhora:** a Produção pode mudar suas tabelas sem combinar com ninguém, desde que mantenha o contrato do evento (`../especificacao.md`).
- **Piora:** o `JOIN` entre `entrega` e `taxa` deixou de existir; o experimento 3 mostra o erro `relation "taxa" does not exist`. O relatório que precisa dos dois vira composição (ADR 007).
- **Piora:** não existe transação entre os dois bancos. Se a Cobrança recusar uma entrega que a Produção já gravou, algo precisa desfazer. Hoje nada desfaz (o nome disso é saga).
- **Piora:** dois bancos para subir, acompanhar e copiar, em vez de um.

**Histórico:** 12/11/2026: saiu a data em que a saga seria retomada em aula.
