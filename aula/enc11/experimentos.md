# Os seis experimentos — Encontro de 15/10

**O que é:** os comandos e as perguntas dos experimentos do encontro de 15/10, que é **on-line**: chamada de abertura, experimentos por conta própria, cada um na sua máquina, e chamada de fechamento. **O que não é:** o lugar das respostas. Elas vão no `registro-enc11.md` (nesta mesma pasta), copiado para o repositório do seu PI como `docs/registro-enc11-<seu-primeiro-nome>.md`. Dúvida durante o encontro: no chat da chamada, que o professor responde por escrito.

- [ ] Sistema no ar (passo "Antes do encontro" do `README.md` da raiz do repositório).
- [ ] Dois terminais abertos na raiz do repositório (a pasta do `compose.yaml`): todos os comandos rodam de lá.
- [ ] `registro-enc11.md` copiado para o repositório do seu PI como `docs/registro-enc11-<seu-primeiro-nome>.md` (um por aluno: com o nome, dois colegas não sobrescrevem um ao outro).

**Regra:** cada experimento tem uma pergunta marcada **Previsão no registro**. A do experimento 1 você responde no chat da chamada de abertura, antes de o professor rodá-lo na tela, e depois copia para o registro. As outras cinco você responde no registro logo que a chamada de abertura terminar, faz o commit `previsoes` com push e **só então roda os experimentos 2 a 6**. Previsão errada vale; enviada depois de rodar, não. As outras perguntas são para pensar. A coluna "O nome disso" fecha na chamada de fechamento.

**Por que isso interessa ao seu projeto:** o produto que a sua equipe propôs no começo do semestre precisa chegar à Etapa 2 (29/10) com dois serviços no ar e um tenant sem enxergar o dado do outro. Cada experimento mostra uma decisão que você vai ter de tomar nele.

## Preparar

Terminal 1, só para os logs:

```powershell
docker compose logs -f gateway producao cobranca
```

Terminal 2, para os comandos. Cole primeiro:

```powershell
$A = "Authorization: Bearer tok-alvorada"
$B = "Authorization: Bearer tok-burica"
```

No macOS e no Linux: `A="Authorization: Bearer tok-alvorada"` (sem `$` e sem espaços em volta do `=`), o mesmo para `B`, e `curl` no lugar de `curl.exe`.

Algum comando deu "conexão recusada"? Veja "Se der errado" no `README.md` da raiz do repositório.

## 1 — Seguir uma requisição

Aquecimento: rode os dois e compare o que volta sem e com a identificação.

```powershell
curl.exe http://localhost:8080/cotas
curl.exe -H "$A" http://localhost:8080/cotas
```

**Previsão no registro:** a próxima linha registra uma entrega. Quantos serviços ela atravessa, e em que ordem?

```powershell
curl.exe -X POST -H "$A" "http://localhost:8080/entregas?associado=A-023&kg=400"
```

Olhe o Terminal 1: que serviços aparecem, e em que ordem? Conte até dois e peça as taxas:

```powershell
curl.exe -H "$A" http://localhost:8080/taxas
```

## 2 — A Buricá tenta ver o dado da Alvorada

A entrega 1 existe e é da Alvorada. Pense no que a Buricá recebe, e rode:

```powershell
curl.exe -H "$B" http://localhost:8080/entregas/1
curl.exe -H "$B" -H "x-tenant-id: alvorada" http://localhost:8080/entregas
```

**Previsão no registro:** a próxima linha desliga o filtro por tenant no código, como se o programador tivesse esquecido o `WHERE`. A Buricá passa a ver entrega da Alvorada?

```powershell
curl.exe -X POST http://localhost:8081/chaves/filtro-app/off
curl.exe -H "$B" http://localhost:8080/entregas
```

Agora desligue também a regra do banco e repita:

```powershell
docker compose exec producao-db psql -U postgres -d producao -c "ALTER TABLE entrega DISABLE ROW LEVEL SECURITY"
curl.exe -H "$B" http://localhost:8080/entregas
```

**Restaurar (não pule; se você se perdeu, `docker compose down -v` e `docker compose up -d` voltam tudo ao início):**

```powershell
docker compose exec producao-db psql -U postgres -d producao -c "ALTER TABLE entrega ENABLE ROW LEVEL SECURITY"
curl.exe -X POST http://localhost:8081/chaves/filtro-app/on
curl.exe -H "$B" http://localhost:8080/entregas
```

Deu certo se a última linha voltar a mostrar só a entrega 2. Se não, `docker compose down -v` e `docker compose up -d` antes do experimento 3.

## 3 — O relatório da diretoria

A diretoria quer ver, lado a lado, o que cada associado entregou e o que foi cobrado.

**Previsão no registro:** um `JOIN` entre `entrega` e `taxa` resolve?

```powershell
docker compose exec producao-db psql -U postgres -d producao -c "SELECT e.id, e.kg, t.valor FROM entrega e JOIN taxa t ON t.entrega_id = e.id"
curl.exe -H "$A" http://localhost:8080/relatorio
```

## 4 — A cobrança sai do ar

O balanceiro é quem opera a balança da cooperativa e registra a entrega.

```powershell
docker compose stop cobranca
```

**Previsão no registro:** com a cobrança parada, o balanceiro consegue registrar uma entrega?

```powershell
curl.exe -X POST -H "$A" "http://localhost:8080/entregas?associado=A-017&kg=100"
```

Repita o `POST` mais quatro vezes. Depois:

```powershell
curl.exe http://localhost:8081/fila
curl.exe -H "$A" http://localhost:8080/taxas
curl.exe -H "$A" http://localhost:8080/relatorio
```

O segundo comando pode demorar até 10 segundos: espere. Compare o `total_ms` das duas últimas respostas. Religue, espere 15 segundos e confira:

```powershell
docker compose start cobranca
curl.exe http://localhost:8081/fila
curl.exe -H "$A" http://localhost:8080/taxas
```

## 5 — O mesmo evento chega duas vezes

As duas primeiras linhas fazem o aviso da entrega chegar em dobro à cobrança e desligam a conferência de repetição.

**Previsão no registro:** a taxa é de R$ 0,05 por kg. Quantas taxas aparecem para uma entrega de 1000 kg da Buricá, e de quanto cada uma?

```powershell
curl.exe -X POST http://localhost:8081/chaves/relay-duplica/on
curl.exe -X POST http://localhost:8081/chaves/idempotencia/off
curl.exe -X POST -H "$B" "http://localhost:8080/entregas?associado=B-102&kg=1000"
```

Conte até dois:

```powershell
curl.exe -H "$B" http://localhost:8080/taxas
```

Religue a conferência e registre outra entrega. Conte até dois antes de pedir as taxas e olhe o Terminal 1:

```powershell
curl.exe -X POST http://localhost:8081/chaves/idempotencia/on
curl.exe -X POST -H "$B" "http://localhost:8080/entregas?associado=B-102&kg=2000"
curl.exe -H "$B" http://localhost:8080/taxas
```

**Restaurar:**

```powershell
curl.exe -X POST http://localhost:8081/chaves/relay-duplica/off
```

## 6 — O vizinho barulhento

O script abaixo faz a Alvorada pedir 60 relatórios pesados de uma vez, enquanto a Buricá lista as próprias cotas, o que leva cerca de 5 ms.

**Previsão no registro:** quanto a Buricá espera? (A linha `BURICA` da saída traz o tempo medido.)

```powershell
curl.exe -X POST http://localhost:8081/chaves/limite-tenant/off
docker compose run --rm ferramentas node inundar.js
```

Religue o limite e rode de novo:

```powershell
curl.exe -X POST http://localhost:8081/chaves/limite-tenant/on
docker compose run --rm ferramentas node inundar.js
```

## Ao terminar

`docker compose down -v` volta aos dados de exemplo. Faça o commit `observacoes` (parte 3 do registro) com push, até 20h55. Depois, `git pull` neste repositório e leia `o-que-e-microsservico.md`, nesta mesma pasta, antes da chamada de fechamento (21h15).

**Agora o seu produto (por unidade de PI; comece hoje se sobrar tempo, prazo no sábado).** Crie `docs/servicos-rascunho.md` no repositório do PI (um arquivo por unidade) com:

1. As caixas do seu produto, no formato das cinco caixas do CampoConta no `README.md` da raiz do repositório: a porta de entrada, os dois serviços e onde cada um guarda dado. Pode ser lista ou desenho em texto.
2. Uma linha para cada pergunta:
   - Qual é o segundo serviço, e o que ele recebe do primeiro?
   - Onde o tenant é descoberto, e como chega ao segundo serviço?
   - Se alguém esquecer o filtro no código, o que segura o vazamento?
   - Se o segundo serviço cair, o que o usuário ainda consegue fazer?
   - Das características de microsserviço (ver `o-que-e-microsservico.md`), qual cada um dos seus dois serviços cumpre, e qual não cumpre?

"Ainda não sei" vale, desde que escrito: vira a pendência nº 1 da unidade até 29/10. Prazo do commit com push: **sábado, 17/10, 23h59**. É o rascunho do ADR de comunicação que a Etapa 2 pede.
