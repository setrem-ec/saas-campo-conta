# CampoConta de referência — um SaaS multi-tenant em três serviços

**Arquitetura de Software SAAS (8512) · EC7 · SETREM 2026-2**

- **O que é:** o exemplo da disciplina, em funcionamento. Duas cooperativas (os tenants) usam o mesmo sistema, feito de três serviços que conversam.
- **O que fazer:** subir e conferir (seção "Antes do encontro"). Os seis experimentos do Encontro 11 estão em `aula/enc11/experimentos.md`, e o registro em `aula/enc11/registro-enc11.md`. Ler o código fica para depois dos experimentos.
- **Pré-requisito:** Docker Desktop aberto, `git` e internet na primeira subida. Sem Docker? Siga o encontro com o `aula/enc11/registro-enc11.md`.

> **Isto não é o seu PI.** O CampoConta é material de aula. Copiar este código ou esta divisão de serviços para a Etapa 2 é avaliado como cópia. Use-o para entender; a decisão do seu produto é sua.

## Antes do encontro

No Windows, use `curl.exe` (com `.exe`). No macOS e no Linux, `curl`.

Crie uma pasta da disciplina, para este repositório, o do seu PI e as demos (no macOS e no Linux: `mkdir -p ~/saas-lab && cd ~/saas-lab`):

```powershell
mkdir $HOME\saas-lab ; cd $HOME\saas-lab
git clone https://github.com/setrem-ec/saas-campo-conta.git
cd saas-campo-conta
docker compose up -d --build
curl.exe -H "Authorization: Bearer tok-alvorada" http://localhost:8080/eu
```

Deu certo se voltar `{"tenant":"alvorada","usuario":"ana"}`. A primeira subida baixa imagens e leva alguns minutos; as seguintes, cerca de 10 segundos.

Pare aqui. O resto é no encontro, com `aula/enc11/experimentos.md`: quem roda antes perde a previsão, que é o que ensina. Para a Etapa 4, siga para `docs/demo.md`.

**Já mexeu no sistema?** Comece com `docker compose down -v`. Os números de `aula/enc11/experimentos.md` (entrega 1 da Alvorada, entrega 2 da Buricá) valem para os dados de exemplo.

## O que está em cada pasta

| Pasta | O que é |
|---|---|
| `gateway/`, `producao/`, `cobranca/`, `comum/` | O produto: um diretório por serviço e o código comum aos três |
| `compose.yaml`, `Dockerfile` | O ambiente que sobe tudo |
| `ferramentas/` | Scripts do laboratório, fora do produto |
| `aula/` | Material dos encontros, fora do produto |
| `testes/` | A suíte com o sistema no ar. Os testes de unidade ficam em `producao/testes/` |
| `.github/workflows/` | O pipeline: roda a suíte a cada push, numa máquina limpa; as execuções ficam na aba **Actions** |
| `docs/` | Visão, C4, mapa de contextos, ADRs, LGPD, SLO, carga, segurança, custo, demo e uso de IA: o exemplo das quatro Etapas. Comece por `docs/README.md` |

## O desenho

```
                 você (curl)
                      │  Authorization: Bearer tok-alvorada
                      ▼
              ┌───────────────┐   8080 = produto
              │    gateway    │   8081 = painel do laboratório
              └───┬───────┬───┘
     x-tenant-id  │       │  x-tenant-id
                  ▼       ▼
          ┌──────────┐   ┌──────────┐
          │ producao │──▶│ cobranca │    evento EntregaRegistrada
          └────┬─────┘   └────┬─────┘
               ▼              ▼
          producao-db    cobranca-db     um banco por serviço
```

| Peça | O que faz | Arquivo para ler |
|---|---|---|
| **gateway** | Porta única: troca o token pelo tenant, limita os pedidos por tenant, encaminha e monta o relatório que junta dois serviços | `gateway/server.js` |
| **producao** (core) | Registra a entrega contra a cota; grava entrega e evento na mesma transação | `producao/server.js`, `producao/cota.js` |
| **cobranca** | Recebe o evento e gera a taxa (R$ 0,05 por kg); ignora evento repetido | `cobranca/server.js` |
| **bancos** | Tabelas, trava de isolamento por tenant e dados de exemplo | `producao/init.sql`, `cobranca/init.sql` |

São cerca de 650 linhas, com comentários e SQL: dá para ler tudo em uma hora.

## Termos que você vai ver aqui

- **Gateway:** o único serviço visível de fora. Descobre quem chama e repassa o pedido ao serviço certo.
- **Token (`Bearer`):** a credencial do cabeçalho `Authorization`. Aqui é um texto fixo; num produto real, um JWT assinado por um serviço de login.
- **`x-tenant-id`:** o cabeçalho com que o gateway diz aos serviços de qual tenant é o pedido. Se o cliente o mandar, o gateway descarta: quem define o tenant é o token.
- **RLS (Row-Level Security):** regra **dentro do banco** que só devolve as linhas do tenant da vez, mesmo que o código peça todas.
- **Evento, outbox e relay:** ao gravar uma entrega, a produção anota um aviso (o evento) na tabela `outbox`. Um laço, o relay, lê a tabela e entrega cada aviso à cobrança. É a fila do caso SafraLog, feita com uma tabela em vez de um broker de mensagens.

## Tenants, rotas e logs

| Tenant | Token | Associados com cota |
|---|---|---|
| Cooperativa Alvorada | `tok-alvorada` | A-017, A-023 |
| Cooperativa Buricá | `tok-burica` | B-101, B-102 |

Os dados de exemplo trazem a entrega 1 (Alvorada) e a entrega 2 (Buricá).

| Rota (porta 8080) | Quem atende |
|---|---|
| `GET /eu` | gateway |
| `GET /cotas` · `GET /entregas` · `GET /entregas/<id>` · `POST /entregas` | producao |
| `GET /taxas` | cobranca |
| `GET /relatorio` | gateway, que junta producao e cobranca (não existe `JOIN` entre dois bancos) |
| `GET /relatorio-pesado` | producao, lento de propósito (0,5 s), para a aula |

Para ver um pedido atravessar os serviços, deixe um segundo terminal com:

```powershell
docker compose logs -f gateway producao cobranca
```

## O painel do laboratório (porta 8081)

Chaves que desligam uma defesa, para você ver o que ela evita. Não fazem parte do produto. Mudar: `curl.exe -X POST http://localhost:8081/chaves/<nome>/<on ou off>`. Ver: `curl.exe http://localhost:8081/chaves`.

| Chave | Padrão | Ao inverter |
|---|---|---|
| `filtro-app` | on | off: `/cotas` e `/entregas` deixam de filtrar pelo tenant. É o experimento 2 |
| `relay-duplica` | off | on: cada evento chega à cobrança **duas vezes**, como se o relay caísse no meio do envio |
| `idempotencia` | on | off: a cobrança não confere se já processou o evento. Só tem efeito com `relay-duplica` on: a taxa da entrega nova aparece em dobro em `/taxas` |
| `limite-tenant` | on | off: o gateway não limita mais os pedidos de cada tenant, e ninguém espera na fila. Usado em aula com `ferramentas/inundar.js` |

`curl.exe http://localhost:8081/fila` mostra os eventos que esperam entrega. `curl.exe http://localhost:8081/limite` mostra, por tenant, o teto e a fila das duas faixas, e os pedidos em andamento e esperando.

### Os números do limite

Cada cooperativa tem um teto de pedidos em andamento. O excedente espera numa fila e só recebe 429 se a fila encher ou a espera passar do teto (ADR 012). Os números são variáveis de ambiente, com padrão no `compose.yaml`:

| Variável | Padrão | O que é |
|---|---|---|
| `MAX_SIMULTANEAS` | 40 | Pedidos em andamento por tenant, nas rotas comuns |
| `FILA_MAXIMA` | 80 | Lugares na fila das rotas comuns |
| `MAX_PESADAS` | 8 | Pedidos em andamento por tenant, nas rotas pesadas |
| `FILA_PESADAS` | 64 | Lugares na fila das rotas pesadas |
| `ROTAS_PESADAS` | `/relatorio-pesado` | Rotas pesadas, separadas por vírgula |
| `ESPERA_MAXIMA_MS` | 5000 | Espera máxima na fila, em milissegundos |
| `POOL_MAX` | 20 | Conexões de banco da produção |

Para testar outro número sem editar, no PowerShell: `$env:MAX_PESADAS = "2"; docker compose up -d`. Os números dependem uns dos outros: leia o ADR 012 antes de mudar o padrão.

## O que ficou de fora, de propósito

- **Login de verdade.** O token é fixo.
- **Broker de mensagens.** A fila é a tabela `outbox`, porque há um produtor e um consumidor. Quando trocar por um broker é decisão de arquitetura (`aula/enc11/o-que-e-microsservico.md`); operar um broker gerenciado é assunto de Cloud Computing.
- **Os contextos Associados e Relatórios** do mapa do Encontro 08. Dois serviços de domínio bastam para mostrar a conversa.
- **A suíte completa.** Faltam a regra da taxa, o contrato do evento e o evento forjado (`docs/plano-de-testes.md`).
- **Kubernetes.** O Compose é só a bancada.

## Demo com as duas cooperativas

O roteiro da demo da Etapa 4 é o `docs/demo.md`: onze comandos, do sistema zerado ao isolamento nos dois sentidos. Na defesa, a demo tem 3 minutos.

## Rodar os testes

A suíte tem dois andares.

**Unidade:** a regra da cota, sem banco e sem rede. Não precisa do sistema no ar e leva 1 segundo. O esperado é `pass 9`.

```powershell
node --test "producao/testes/*.test.js"
```

**Com o sistema no ar:** cinco arquivos, um por pergunta. O esperado é `pass 33`, em cerca de 12 segundos.

| Arquivo | Confere que |
|---|---|
| isolamento | uma cooperativa não vê a entrega da outra |
| integração | cada defesa segura sozinha: a política do banco sem o filtro do código; a cobrança com o mesmo evento duas vezes |
| fila | o pedido acima do limite espera em vez de falhar |
| autorização | toda rota recusa pedido sem token válido, e o cabeçalho de tenant forjado não muda o tenant |
| robustez | o endereço malformado recebe 400, e o gateway continua no ar |

```powershell
node --test --test-concurrency=1 "testes/*.test.js"
```

O `--test-concurrency=1` roda um arquivo por vez. Sem ele, um arquivo enche a fila que o outro está medindo.

Sem o Node 22? Rode por dentro do Compose, só com o Docker:

```powershell
docker compose run --rm -v "./testes:/app/testes:ro" -w /app/testes ferramentas node --test --test-concurrency=1
```

Cada execução registra quatro entregas de 1 kg e as taxas delas; `docker compose down -v` volta aos dados de exemplo.

A decisão do pipeline está em `docs/adr/011-a-suite-roda-a-cada-push.md`; o que tem teste e o que falta, em `docs/plano-de-testes.md`.

## Desligar e zerar

```powershell
docker compose down        # desliga e mantém os dados
docker compose down -v     # desliga e volta aos dados de exemplo
```

## Se der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `error during connect` ou `connection refused` no docker | Docker Desktop fechado | Abrir, esperar ficar verde, repetir |
| A primeira subida falha no meio | Sem internet, ou rede que bloqueia downloads | Repetir o `up`, ou tentar em outra rede |
| `port is already allocated`, `Ports are not available` ou `Only one usage of each socket address` | Outro programa usa a 8080 ou a 8081 | Em `compose.yaml`, trocar `127.0.0.1:8080:8080` por `127.0.0.1:9080:8080` (só o número do meio), rodar `docker compose up -d` e usar 9080 em todos os comandos, inclusive os de `aula/enc11/experimentos.md`. Para a 8081, o mesmo com `127.0.0.1:9081:8081` |
| `curl: (2) no URL specified` | `$A` ou `$B` não existe neste terminal (terminal novo começa sem elas) | Colar de novo as linhas `$A = ...` e `$B = ...` do início de `aula/enc11/experimentos.md` ou do `docs/demo.md` |
| `{"erro":"token ausente ou invalido"}` | Faltou o cabeçalho, ou o token está errado | Copiar o comando inteiro; os tokens não têm acento |
| Conexão recusada (`Failed to connect` ou `Connection refused`) | O gateway parou (`docker compose ps` não mostra o `gateway`). Até 24/11/2026, um endereço com duas barras no fim, como `http://localhost:8080//`, derrubava o gateway; hoje recebe 400 (`docs/seguranca-enc15.md`, achado S1) | `docker compose up -d gateway` e repetir |
| `{"erro":"servico indisponivel"}` | Um serviço caiu | `docker compose ps` e `docker compose up -d` |
| Mudei um `.js` e nada mudou | O serviço não recarrega sozinho | `docker compose restart <servico>` |
| Mudei um `init.sql` e nada mudou | O SQL só roda quando o banco é criado | `docker compose down -v` e subir de novo |
