# ADR 006 — A Cobrança descarta evento repetido pelo identificador

**Status:** aceito · decidido no código em 10/10/2026, registrado em 15/10/2026

## Contexto

Pelo ADR 004, o mesmo evento pode chegar duas vezes à Cobrança. Cada evento gera uma taxa; um evento repetido cobraria o associado em dobro. É o problema do caso SafraLog (Encontro 09), em que um aviso reenviado gerou notas fiscais em dobro.

## Decisão

Antes de gerar a taxa, a Cobrança grava o identificador do evento na tabela `evento_processado`, cuja chave primária é esse identificador; se a gravação não acontecer porque o identificador já existe, o evento é confirmado e ignorado.

## Alternativas descartadas

- **Garantir entrega única no produtor.** Exigiria que enviar e anotar fossem uma coisa só, entre dois processos e dois bancos. Não existe forma barata de garantir. Descartada.
- **Aceitar a duplicata e corrigir depois.** Cobrança indevida a associado, descoberta pelo associado. Descartada.

## Consequências

- **Melhora:** o experimento 5 entrega o mesmo evento duas vezes e só uma taxa aparece; com a conferência desligada, aparecem duas.
- **Melhora:** a trava é do banco (chave primária), então vale mesmo com dois eventos iguais chegando ao mesmo tempo.
- **Piora:** a idempotência existe só no consumidor. No registro da entrega, onde o balanceiro pode repetir o clique, não existe (defeito C9, ADR 010).
- **Piora:** quem alcança a rede interna pode mandar um evento com um identificador futuro e "queimá-lo", e o legítimo é descartado depois (defeito C1, ADR 010).
