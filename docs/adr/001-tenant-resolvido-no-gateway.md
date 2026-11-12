# ADR 001 — O tenant é descoberto no gateway, a partir do token

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

Duas cooperativas (Alvorada e Buricá) usam o mesmo sistema, feito de três serviços: `gateway`, `producao` e `cobranca`. Todo pedido precisa saber de qual cooperativa é, e todo serviço filtra por isso. Se cada serviço descobrir o tenant por conta própria, são três lugares onde errar. Se o cliente informar o tenant, quem quiser ver o dado de outra cooperativa só precisa mentir num cabeçalho.

## Decisão

O gateway troca o token do cabeçalho `Authorization` pelo tenant e monta do zero os cabeçalhos que seguem para dentro (`x-tenant-id`, `x-usuario`, `x-request-id`); o `x-tenant-id` que vier do cliente é descartado.

## Alternativas descartadas

- **Cada serviço valida o token.** Repete a regra em três lugares e obriga cada serviço a conhecer a autenticação. Descartada por duplicação.
- **O cliente informa o tenant.** Um cabeçalho escrito pelo cliente não prova nada. Descartada porque é o vazamento mais barato possível.

## Consequências

- **Melhora:** um lugar só decide quem é quem; os serviços de domínio não sabem o que é token. O experimento 2 mostra a Buricá mandando `x-tenant-id: alvorada` e recebendo só o próprio dado.
- **Piora:** os serviços confiam no `x-tenant-id` sem verificar quem o mandou; a garantia vem da rede (só o gateway é alcançável de fora), não do código. Registrado como defeito C6 no ADR 010.
- **Piora:** o token é fixo, de bancada. Num produto real ele seria um token assinado por um serviço de login; a regra "o tenant nasce no gateway" continua valendo.
