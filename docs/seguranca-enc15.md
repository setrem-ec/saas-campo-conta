# Verificação de segurança — CampoConta

Entregável 3.5 da Etapa 3, no formato do roteiro de 19/11. Verificado em 24/11/2026, no commit `f5eb325` e nos seguintes. O "15" no nome vem da pasta do encontro: o nome do arquivo fica como o roteiro pede.

**Resumo:** foram 5 achados corrigidos (S1 a S5), 3 planejados (P1 a P3) e 4 falsos positivos explicados.

## 1. Acesso por tenant

Execução vermelha do pipeline: [RUN_VERMELHO] (o teste do achado S1, antes do conserto). Depois do conserto, a execução ficou verde: [RUN_VERDE].

| Rota | Exige identidade? | De onde vem o tenant? | Filtra por tenant? | Qual teste cobre? |
|------|-------------------|-----------------------|--------------------|-------------------|
| `GET /saude` | não, de propósito: diz só que o gateway está no ar | não tem tenant | não tem dado de tenant | `testes/robustez.test.js` |
| `GET /eu` | sim | do token | devolve só quem chamou | `testes/authz.test.js` |
| `GET /cotas` | sim | do token; o `x-tenant-id` do cliente é descartado | sim: `WHERE` no código e política por linha no banco (ADR 002) | `authz.test.js`, `fila.test.js` |
| `GET /entregas` | sim | do token | sim, nas duas camadas | `isolamento.test.js`, nos dois sentidos |
| `GET /entregas/<id>` | sim | do token | sim: `WHERE id = $1 AND tenant_id = $2` e a política por linha; o vizinho recebe 404 | `isolamento.test.js`, `integracao.test.js` |
| `POST /entregas` | sim | do token | grava com o tenant do token | `isolamento.test.js`, `integracao.test.js` |
| `GET /relatorio-pesado` | sim | do token | sim | `authz.test.js`, `fila.test.js` |
| `GET /taxas` | sim | do token | sim, nas duas camadas | `authz.test.js`, `integracao.test.js` |
| `GET /relatorio` (composição no gateway) | sim | do token | cada parte vem do serviço dono, já filtrada | `authz.test.js` |
| Painel do laboratório (porta 8081): `/chaves`, `/fila`, `/limite` | **não** | não tem tenant | não | nenhum: achado **P1** |
| Rotas internas (`/lab`, `/interno/fila`, `/eventos`), sem porta publicada | **não**: confiam no `x-tenant-id` e no tenant escrito no evento | do chamador | sim, mas pelo tenant que o chamador disser | nenhum: achado **P2** |

Duas linhas têm "não" na coluna da identidade, e as duas viraram achado planejado.

## 2. Segredos

**Comandos executados**, na raiz do repositório, em 24/11/2026:

```
git grep -n -i -E "senha|password|secret|api_key|token" -- ":!*.md" ":!testes/*"
git grep -n -E "postgres://|mysql://"
git check-ignore .env
```

Além disso, o pipeline varre o histórico inteiro com o TruffleHog a cada push, sem testar a chave no provedor (passo "Segredos no histórico"). Resultado em 24/11: 0 segredos.

| Achado | Tratamento |
|---|---|
| **S5.** `git check-ignore .env` não imprimia nada: o `.gitignore` não tinha o `.env`, e um `.env` com segredo de verdade iria para o commit | **corrigido**, commit `2405398` |
| Senha `lab` em `compose.yaml`, `producao/init.sql`, `cobranca/init.sql` e nos dois `server.js` | **falso positivo:** é senha de bancada, dita no próprio `compose.yaml`; os bancos não publicam porta (ADR 009). Num deploy, a senha vem de variável de ambiente |
| Tokens `tok-alvorada` e `tok-burica` em `gateway/server.js` e em `ferramentas/` | **falso positivo como segredo:** são tokens fixos de bancada, ditos no comentário do gateway. A autenticação real é o achado **P3** |
| `git grep` de `postgres://` e `mysql://` | nenhuma linha |

Nenhum segredo de verdade foi commitado: nada precisou ser trocado no provedor.

## 3. Dependências

**Comando:** `npm audit` (e `npm audit --audit-level=high` no pipeline, a cada push).

**Resumo:** 0 críticas, 0 altas, 0 moderadas. São 14 pacotes no `package-lock.json`: o `pg` 8.23.1 e as dependências dele.

| Achado | Tratamento |
|---|---|
| **S4.** O produto não tinha manifesto de dependências: o `pg` só aparecia no `Dockerfile`, sem versão travada (`npm install pg@8`). Não havia o que auditar, e cada imagem nova podia trazer outra versão | **corrigido**, commit `200fab9`: `package.json` e `package-lock.json` com o `pg` 8.23.1, `npm ci` no `Dockerfile` e o audit no pipeline |
| **S2.** O pipeline usava `actions/checkout@v4` e `actions/setup-node@v4`. Uma tag pode ser movida para outro código, e esse é o ataque de cadeia de suprimento do caso npm/Shai-Hulud (Semgrep: `github-actions-mutable-action-tag`) | **corrigido**, commit `f5eb325`: as duas actions travadas pelo hash do commit (v4.4.0), e a imagem do TruffleHog pelo digest |

## 4. O que mais a verificação achou

O Semgrep (regras `p/default`) e um teste de robustez acharam outros problemas:

| Achado | Tratamento |
|---|---|
| **S1.** Um pedido para `//`, **sem token**, derrubava o gateway: o `new URL` lançava fora do `try`, o processo terminava e nada o subia de volta. Uma linha de `curl` tirava o produto do ar para todas as cooperativas | **corrigido** com teste antes: `ac2762e` (red, o pipeline ficou vermelho) e `c72b2ad` (green). `lerUrl` responde 400 nos três serviços |
| **S3.** `lerEntrada` copiava o corpo JSON com `Object.assign`: um corpo `{"__proto__": {...}}` trocava o protótipo do objeto de entrada (Semgrep: `insecure-object-assign`) | **corrigido**, commit `f5eb325`: cópia campo a campo, sem `__proto__` |
| `http.createServer` sem TLS, em 7 lugares: os três serviços, o painel e três em `aula/enc10/` (Semgrep: `using-http-server`) | **falso positivo aqui:** o produto só escuta em `127.0.0.1` (ADR 009). Num deploy, o TLS termina no balanceador do provedor, antes do gateway. `aula/enc10/` é material de aula e não faz parte do produto |

## 5. Planejados

| Achado | Prazo e responsável |
|---|---|
| **P1.** O painel do laboratório (8081) liga e desliga as defesas sem pedir identidade. Na bancada, ele só escuta em `127.0.0.1` | Sai do produto antes de qualquer implantação fora da máquina. Revisão na Etapa 4, 10/12/2026. Responsável: o dono do produto |
| **P2.** Produção e cobrança confiam no `x-tenant-id` e no tenant escrito no evento, venha de quem vier (defeitos C1 e C6 do ADR 010). Hoje só o gateway é alcançável de fora | Assinar o evento e o cabeçalho com um segredo compartilhado, ou usar rede interna com autenticação entre serviços. ADR novo na Etapa 4, 10/12/2026. Responsável: o dono do produto |
| **P3.** A autenticação é um mapa fixo de tokens de bancada, no código do gateway | Trocar por JWT emitido por um provedor de identidade, com expiração. Fica para depois da disciplina, registrado aqui e no comentário do gateway. Responsável: o dono do produto |

## Ligação com a LGPD

O art. 46 da LGPD manda o operador adotar medidas de segurança técnicas aptas a proteger os dados pessoais de acesso não autorizado. No CampoConta, os dados pessoais são o código do associado, o peso entregue e a taxa de cada cooperativa (`lgpd.md`). Três medidas desta verificação protegem esses dados:
- **A autorização rota a rota** impede que uma cooperativa leia o dado de outra: o tenant vem só do token, e o teste prova isso a cada push.
- **O conserto do S1** fecha uma falha de disponibilidade que qualquer pessoa, sem login, explorava com uma linha.
- **A varredura de segredos e a auditoria de dependências** no pipeline impedem que uma senha vazada ou um pacote comprometido abra a porta para os bancos.

O que ainda falta é planejado, com prazo: os achados P1 a P3 e as lacunas de `lgpd.md` (a `outbox` sem política por linha e a exclusão por tenant).
