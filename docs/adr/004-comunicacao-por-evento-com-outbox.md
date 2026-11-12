# ADR 004 — Comunicação: a Produção avisa a Cobrança por evento, gravado na mesma transação da entrega

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

Na safra, o balanceiro registra uma entrega atrás da outra, com caminhão na fila. Quem registra precisa da resposta **agora** ("cabe na cota?"); a taxa da entrega, não: o gestor confere as taxas no fim do dia. Pela régua do Encontro 09, para cada seta pergunte quem está esperando. Aqui, ninguém espera a Cobrança. Se a Produção chamar a Cobrança e esperar, a balança para quando a Cobrança parar.

## Decisão

Ao registrar a entrega, a Produção grava na **mesma transação** a cota atualizada, a entrega e um evento `EntregaRegistrada` na tabela `outbox`; um laço dentro da Produção (o relay) lê os eventos pendentes a cada 0,5 s e os entrega à Cobrança, tentando de novo com recuo crescente (0,5 s, 1 s, 2 s… até 8 s) enquanto ela não confirmar.

## Alternativas descartadas

- **Chamada síncrona à Cobrança dentro do registro.** A entrega passaria a depender de dois serviços no ar. Descartada pelo cenário de disponibilidade (Q1 em `../atributos-qualidade.md`).
- **Gravar a entrega e publicar o evento depois, em outro passo.** Se o processo cair entre os dois, a entrega existe e a taxa nunca é gerada. Descartada porque perde receita sem deixar rastro.

## Consequências

- **Melhora:** com a Cobrança parada, a entrega continua sendo registrada; os eventos esperam e são entregues quando ela volta (experimento 4: fila de 5, depois 0, e nenhuma taxa perdida).
- **Piora:** a taxa aparece instantes depois da entrega, não junto (consistência eventual). Quem pede `/taxas` logo após o `POST` pode não vê-la ainda.
- **Piora:** a entrega é "pelo menos uma vez": se o relay cair entre enviar e anotar, o evento vai de novo. Por isso existe o ADR 006.
- **Piora:** o relay roda dentro da Produção e conhece o endereço da Cobrança; um segundo interessado no evento exigiria mudar o produtor (defeito C11, ADR 010).
- **Piora:** um evento que a Cobrança sempre recuse trava a fila inteira; não há fila de rejeitados.
