# CampoConta de referência — um SaaS multi-tenant em três serviços

**Arquitetura de Software SAAS (8512) · EC7 · SETREM 2026-2**

- **O que é:** o exemplo da disciplina rodando de verdade. Duas cooperativas (os tenants) usam o mesmo sistema, feito de três serviços que conversam.
- **O que fazer:** subir e conferir (seção "Antes do encontro"). Os seis experimentos do Encontro 11 ficam em `aula/enc11/experimentos.md`, com registro em `aula/enc11/registro-enc11.md`. Ler o código fica para depois.
- **Pré-requisito:** Docker Desktop instalado e aberto, `git` e internet na primeira subida. Sem Docker funcionando? Siga o encontro mesmo assim: o `aula/enc11/registro-enc11.md` diz o que fazer.

> **Isto não é o seu PI.** O CampoConta é material de aula. Copiar este código ou esta divisão de serviços para a Etapa 2 é avaliado como cópia de material de aula. Use-o para entender; a decisão do seu produto é sua.

## Antes do encontro

No Windows, use `curl.exe` (com `.exe`). No macOS e no Linux, `curl`.

Primeiro, uma pasta da disciplina, onde ficam lado a lado este repositório, o do seu PI e as demos das aulas (no macOS e no Linux: `mkdir -p ~/saas-lab && cd ~/saas-lab`):

```powershell
mkdir $HOME\saas-lab ; cd $HOME\saas-lab
git clone https://github.com/setrem-ec/saas-campo-conta.git
cd saas-campo-conta
docker compose up -d --build
curl.exe -H "Authorization: Bearer tok-alvorada" http://localhost:8080/eu
```

Deu certo se voltar `{"tenant":"alvorada","usuario":"ana"}`. A primeira subida baixa imagens e instala uma biblioteca: leva alguns minutos e precisa de internet. As seguintes levam cerca de 10 segundos.

Pare aqui. O resto se faz no encontro, com `aula/enc11/experimentos.md`: quem roda antes perde a previsão, que é a parte que ensina.

**Já mexeu no sistema antes?** Comece com `docker compose down -v`. Os números de `aula/enc11/experimentos.md` (entrega 1 da Alvorada, entrega 2 da Buricá) valem para os dados de exemplo.

## O que está em cada pasta

| Pasta | O que é |
|---|---|
| `gateway/`, `producao/`, `cobranca/`, `comum/` | O produto: um diretório por serviço, mais o código que os três compartilham |
| `compose.yaml`, `Dockerfile` | O ambiente que sobe tudo |
| `ferramentas/` | Scripts do laboratório (não fazem parte do produto) |
| `aula/` | Material dos encontros, uma pasta por encontro (não faz parte do produto) |
| `testes/` | A suíte de testes. Hoje, um teste: o de isolamento entre as duas cooperativas |
| `.github/workflows/` | O pipeline: roda a suíte a cada push, numa máquina limpa do GitHub |
| `docs/` | Documentação de arquitetura: visão, C4, mapa de contextos, ADRs, LGPD e declaração de uso de IA. É o exemplo do que as Etapas 1 e 2 pedem; comece por `docs/README.md` |

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
| **gateway** | Porta única. Troca o token pelo tenant, aplica o limite por tenant, encaminha, e monta o relatório que precisa de dois serviços | `gateway/server.js` |
| **producao** (core) | Registra a entrega contra a cota. Grava entrega e evento na mesma transação | `producao/server.js`, `producao/cota.js` |
| **cobranca** | Recebe o evento e gera a taxa (R$ 0,05 por kg). Ignora evento repetido | `cobranca/server.js` |
| **bancos** | Tabelas, trava de isolamento por tenant e dados de exemplo | `producao/init.sql`, `cobranca/init.sql` |

São cerca de 550 linhas ao todo, contando comentários e SQL. Dá para ler tudo em uma hora.

## Termos que você vai ver aqui

- **Gateway:** o único serviço que o mundo de fora enxerga. Ele descobre quem está chamando e repassa o pedido ao serviço certo.
- **Token (`Bearer`):** a "credencial" que vai no cabeçalho `Authorization`. Aqui é um texto fixo; num produto real é um JWT, um token assinado por um serviço de login.
- **`x-tenant-id`:** o cabeçalho com que o gateway avisa aos serviços de qual tenant é o pedido. Se o cliente mandar esse cabeçalho por conta própria, o gateway descarta: quem define o tenant é o token.
- **RLS (Row-Level Security):** uma regra **dentro do banco** que só devolve as linhas do tenant da vez, mesmo que o código peça todas.
- **Evento, outbox e relay:** quando uma entrega é gravada, a produção anota na tabela `outbox` um aviso ("evento") de que isso aconteceu. Um laço chamado relay lê essa tabela e entrega cada aviso à cobrança. É a fila do caso SafraLog feita com uma tabela, sem um produto de mensageria (broker).

## Tenants, rotas e logs

| Tenant | Token | Associados com cota |
|---|---|---|
| Cooperativa Alvorada | `tok-alvorada` | A-017, A-023 |
| Cooperativa Buricá | `tok-burica` | B-101, B-102 |

Os dados de exemplo já trazem a entrega 1 (Alvorada) e a entrega 2 (Buricá).

| Rota (porta 8080) | Quem atende |
|---|---|
| `GET /eu` | gateway |
| `GET /cotas` · `GET /entregas` · `GET /entregas/<id>` · `POST /entregas` | producao |
| `GET /taxas` | cobranca |
| `GET /relatorio` | gateway, juntando producao e cobranca (não existe `JOIN` entre dois bancos) |
| `GET /relatorio-pesado` | producao (lento de propósito, 0,5 s; usado em aula) |

Para ver um pedido atravessando os serviços, deixe um segundo terminal com:

```powershell
docker compose logs -f gateway producao cobranca
```

## O painel do laboratório (porta 8081)

Chaves que desligam uma defesa, para você ver o que ela evita. Não fazem parte do produto. Para mudar: `curl.exe -X POST http://localhost:8081/chaves/<nome>/<on ou off>`. Para ver o estado: `curl.exe http://localhost:8081/chaves`.

| Chave | Padrão | O que acontece quando você inverte |
|---|---|---|
| `filtro-app` | on | off: as duas listagens da produção (`/cotas` e `/entregas`) deixam de filtrar pelo tenant. É o experimento 2 |
| `relay-duplica` | off | on: cada evento é entregue à cobrança **duas vezes**, como se o relay tivesse caído no meio do envio |
| `idempotencia` | on | off: a cobrança para de conferir se já processou o evento. Só mostra efeito junto com `relay-duplica` on: registre uma entrega e a taxa aparece em dobro em `/taxas` |
| `limite-tenant` | on | off: o gateway deixa de limitar os pedidos simultâneos de cada tenant, e ninguém mais espera na fila. Usado em aula com `ferramentas/inundar.js` |

`curl.exe http://localhost:8081/fila` mostra quantos eventos ainda esperam entrega.

`curl.exe http://localhost:8081/limite` mostra o limite de cada tenant: o teto e a fila das duas faixas, e quantos pedidos estão em andamento e esperando agora.

### Os números do limite

Cada cooperativa tem um teto de pedidos em andamento. O excedente espera numa fila e só recebe erro 429 se a fila encher ou a espera passar do teto (ADR 012). Os números são variáveis de ambiente, com padrão no `compose.yaml`:

| Variável | Padrão | O que é |
|---|---|---|
| `MAX_SIMULTANEAS` | 40 | Pedidos em andamento por tenant, nas rotas comuns |
| `FILA_MAXIMA` | 80 | Lugares na fila das rotas comuns |
| `MAX_PESADAS` | 8 | Pedidos em andamento por tenant, nas rotas pesadas |
| `FILA_PESADAS` | 64 | Lugares na fila das rotas pesadas |
| `ROTAS_PESADAS` | `/relatorio-pesado` | Quais rotas são pesadas, separadas por vírgula |
| `ESPERA_MAXIMA_MS` | 5000 | Espera máxima na fila, em milissegundos |
| `POOL_MAX` | 20 | Conexões de banco da produção |

Para testar outro número sem editar nada, no PowerShell: `$env:MAX_PESADAS = "2"; docker compose up -d`. Os números dependem uns dos outros: leia o ADR 012 antes de mudar o padrão.

## O que ficou de fora, de propósito

- **Login de verdade.** O token é fixo.
- **Broker de mensagens.** A fila é uma tabela (a `outbox`), porque há um produtor e um consumidor. Quando trocar a tabela por um broker é decisão de arquitetura, discutida em `aula/enc11/o-que-e-microsservico.md`. Operar um broker gerenciado é assunto de Cloud Computing.
- **Os contextos Associados e Relatórios** do mapa do Encontro 08. Dois serviços de domínio bastam para mostrar a conversa.
- **A suíte completa.** Há dois testes, o de isolamento e o da fila do gateway, e o pipeline que os roda (seção "Rodar os testes"). Teste de unidade, de contrato e de segurança entram na Unidade 4, sobre este mesmo sistema.
- **Kubernetes.** O Compose é só a bancada.

## Rodar os testes

Com o sistema no ar, a suíte confere duas coisas: que uma cooperativa não vê a entrega da outra, nos dois sentidos, e que o pedido acima do limite espera na fila em vez de falhar.

```powershell
node --test --test-concurrency=1
```

O `--test-concurrency=1` roda um arquivo de teste por vez. Sem ele, os dois arquivos rodam juntos e um enche a fila que o outro está medindo.

Não tem o Node 22 instalado? Rode por dentro do Compose, só com o Docker:

```powershell
docker compose run --rm -v "./testes:/app/testes:ro" -w /app/testes ferramentas node --test --test-concurrency=1
```

O esperado é `pass 7` e `fail 0`, em cerca de 10 segundos. Cada execução registra duas entregas de 1 kg e as duas taxas que elas geram; `docker compose down -v` volta aos dados de exemplo.

O GitHub roda essa mesma suíte a cada push: veja a aba **Actions** do repositório. A decisão está em `docs/adr/011-a-suite-roda-a-cada-push.md`. O que já tem teste e o que ainda falta está em `docs/plano-de-testes.md`.

## Desligar e zerar

```powershell
docker compose down        # desliga e mantém os dados
docker compose down -v     # desliga e volta aos dados de exemplo
```

## Se der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `error during connect` ou `connection refused` no docker | Docker Desktop fechado | Abrir, esperar ficar verde, repetir |
| A primeira subida falha no meio | Sem internet, ou rede que bloqueia downloads | Tentar em outra rede; repetir o `up` |
| `port is already allocated`, `Ports are not available` ou `Only one usage of each socket address` | Outro programa usa a 8080 ou a 8081 | Em `compose.yaml`, trocar `127.0.0.1:8080:8080` por `127.0.0.1:9080:8080` (só o número do meio), rodar `docker compose up -d` de novo e usar 9080 no lugar de 8080 em todos os comandos, inclusive os de `aula/enc11/experimentos.md`. Se a ocupada for a 8081, o mesmo com `127.0.0.1:9081:8081` |
| `curl: (2) no URL specified` | `$A` ou `$B` não existe neste terminal (cada terminal novo começa sem elas) | Colar de novo as duas linhas `$A = ...` e `$B = ...` do início de `aula/enc11/experimentos.md` |
| `{"erro":"token ausente ou invalido"}` | Faltou o cabeçalho, ou o token foi digitado errado | Copiar o comando inteiro; os tokens não têm acento |
| `curl` responde conexão recusada (`Failed to connect` ou `Connection refused`) | O gateway parou (`docker compose ps` não mostra o `gateway`). Um endereço terminado em duas barras, como `http://localhost:8080//`, faz isso | `docker compose up -d gateway` e repetir o comando |
| `{"erro":"servico indisponivel"}` | Um serviço caiu | `docker compose ps` e `docker compose up -d` |
| Mudei um `.js` e nada mudou | O serviço não recarrega sozinho | `docker compose restart <servico>` |
| Mudei um `init.sql` e nada mudou | O SQL só roda quando o banco é criado | `docker compose down -v` e subir de novo |
