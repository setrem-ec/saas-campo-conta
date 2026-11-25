# Demo com dois tenants — CampoConta

Entregável 4.3 da Etapa 4: o fluxo completo, com as duas cooperativas, ao vivo. Na defesa, a demo tem 3 minutos. **Copie o formato, não o conteúdo:** o fluxo do seu produto é outro.

O que a banca precisa ver acontecer, não ouvir: **A cria e B não vê; B cria e A não vê.**

## Antes de começar

Aviso: o `down -v` apaga as entregas que você registrou. Os números abaixo valem para os dados de exemplo.

1. Abra o Docker Desktop e espere ficar verde.
2. Na pasta do repositório, zere e suba o sistema:

```powershell
docker compose down -v
docker compose up -d --build --wait
```

3. No mesmo terminal, guarde as duas credenciais:

```powershell
$A = "Authorization: Bearer tok-alvorada"
$B = "Authorization: Bearer tok-burica"
```

Para mostrar A e B ao mesmo tempo, abra dois terminais lado a lado e cole as duas linhas nos dois.

## O roteiro

| # | O que mostrar | Comando | Resposta esperada |
|---|---|---|---|
| 1 | Quem é cada um: o token define o tenant | `curl.exe -H "$A" http://localhost:8080/eu` e o mesmo com `$B` | `"tenant":"alvorada"` e `"tenant":"burica"` |
| 2 | A registra uma entrega | `curl.exe -X POST -H "$A" "http://localhost:8080/entregas?associado=A-017&kg=100"` | `"entrega_id":3`, `"entregue_kg":1300` |
| 3 | B lista e não vê a entrega de A | `curl.exe -H "$B" http://localhost:8080/entregas` | só a entrega `2`, da Buricá |
| 4 | B pede a entrega de A pelo número | `curl.exe -H "$B" http://localhost:8080/entregas/3` | `{"erro":"entrega nao encontrada"}` (404) |
| 5 | B registra uma entrega | `curl.exe -X POST -H "$B" "http://localhost:8080/entregas?associado=B-101&kg=200"` | `"entrega_id":4`, `"entregue_kg":1100` |
| 6 | A lista e não vê a entrega de B | `curl.exe -H "$A" http://localhost:8080/entregas` | as entregas `1` e `3`, as duas da Alvorada |
| 7 | A pede a entrega de B pelo número | `curl.exe -H "$A" http://localhost:8080/entregas/4` | `{"erro":"entrega nao encontrada"}` (404) |
| 8 | A entrega virou taxa, em outro serviço | `curl.exe -H "$A" http://localhost:8080/taxas` e o mesmo com `$B` | Alvorada `"total":65`; Buricá `"total":55` |
| 9 | O relatório junta os dois serviços | `curl.exe -H "$A" http://localhost:8080/relatorio` | cotas e taxas só da Alvorada |
| 10 | B tenta se passar por A | `curl.exe -H "$B" -H "x-tenant-id: alvorada" http://localhost:8080/entregas` | as entregas `2` e `4`, da Buricá: o cabeçalho forjado não muda o tenant |
| 11 | A regra do negócio segura | `curl.exe -X POST -H "$A" "http://localhost:8080/entregas?associado=A-023&kg=7000"` | `entrega estoura a cota do associado (7000 > 6000 kg)` (422) |

No passo 8, a taxa pode levar meio segundo para aparecer: a entrega chega à cobrança por evento, e o relay confere a fila a cada 0,5 s (ADR 004). Se `/taxas` ainda não mostrar a entrega nova, espere e repita. Esse atraso é a consistência eventual, e vale dizer isso à banca.

## O que cada passo prova

- **Passos 1 a 7:** o isolamento, nos dois sentidos. O tenant vem do token (ADR 001), e o banco só devolve as linhas do tenant da vez (ADR 002).
- **Passos 8 e 9:** o fluxo completo atravessa os três serviços: o gateway, a produção e a cobrança (`c4.md`, nível 2).
- **Passo 10:** o cliente não escolhe o tenant (`seguranca-enc15.md`, e o teste `testes/authz.test.js`).
- **Passo 11:** a regra da cota, a mesma dos testes de unidade (`producao/testes/`).

## Se der errado na hora

| Sintoma | O que fazer |
|---|---|
| `curl: (2) no URL specified` | Faltam `$A` e `$B` neste terminal: cole as duas linhas de novo |
| `entrega_id` diferente de 3 | O sistema não estava zerado. Siga com os números que apareceram, ou rode o `down -v` |
| Conexão recusada | `docker compose ps`; se faltar um serviço, `docker compose up -d` |

Reserva: grave a demo em vídeo antes da defesa e avise o professor que vai usá-lo. Vídeo sem aviso prévio não conta como demo ao vivo.

**Conferido em 25/11/2026**, do zero, com os comandos desta página: as respostas da tabela são as que o sistema deu.
