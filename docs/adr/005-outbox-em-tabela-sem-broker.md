# ADR 005 — A outbox é uma tabela do banco, sem broker de mensagens

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

O ADR 004 exige um lugar onde os eventos esperam entre a Produção e a Cobrança. Existem produtos feitos para isso (os brokers de mensagens), mas cada um é mais um processo para subir, configurar e entender. Hoje há um produtor, um consumidor e poucos eventos por minuto. O sistema precisa subir com um comando, sem nada além do Docker (história 25 em `../especificacao.md`).

## Decisão

Os eventos pendentes ficam na tabela `outbox` do banco da Produção, lida pelo relay; não há broker.

## Alternativas descartadas

- **Broker de mensagens.** Resolve ordem, reentrega, fila morta e vários consumidores (publicar e assinar), mas acrescenta um processo para subir e operar antes de o problema existir. Descartada pelo volume atual. A escolha entre tabela e broker é decisão de arquitetura, e este ADR a registra; provisionar e operar um broker gerenciado é o que a Cloud Computing aprofunda.

## Consequências

- **Melhora:** o evento e a entrega moram no mesmo banco, e por isso cabem na mesma transação (ADR 004). Ver os eventos pendentes é uma consulta (`/fila` no painel do laboratório).
- **Piora:** a outbox disputa as conexões do banco da Produção (o relay tem um pool próprio de 1 conexão para não disputar com os pedidos).
- **Piora:** um segundo consumidor exigiria mudar o relay. Quando houver dois interessados no mesmo evento, este ADR deve ser revisto.

**Histórico:** 12/11/2026: título e texto trocaram "fila" por "outbox" e "eventos pendentes"; a decisão é a mesma.
