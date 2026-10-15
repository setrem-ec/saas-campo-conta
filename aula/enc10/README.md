# Encontro 10 (08/10) — a demo de resiliência

**O que é:** os três arquivos da demo do Encontro 10: `pedidos` chama `faturamento` para emitir a nota e liberar o caminhão. Por padrão, a resiliência fica desligada; você a liga por variável de ambiente e vê a diferença.
**O que não é:** o roteiro. Os passos, as perguntas e o que entregar estão no roteiro do Lab 10, publicado no Logos. Lá os arquivos são criados à mão; aqui eles já estão prontos, para quem quiser ir direto ao que importa: **variar o tempo e as defesas e observar**.

## Rodar

Do terminal, **nesta pasta** (`aula/enc10`):

```powershell
docker compose up -d
curl.exe http://localhost:30090
```

O CampoConta (portas 8080 e 8081) e esta demo (porta 30090) podem ficar no ar ao mesmo tempo.

## As quatro variáveis

| Variável | Em quem | Padrão | O que muda |
|---|---|---|---|
| `SLOW_MS` | `faturamento-svc` | 100 | Quanto o faturamento demora (100 = dia bom; 30000 = dia de SEFAZ lenta) |
| `TIMEOUT_MS` | `pedidos` | 0 | Quanto o pedidos espera (0 = espera para sempre) |
| `RETRIES` | `pedidos` | 0 | Tentativas extras, com recuo de 0,5 s, 1 s, 2 s |
| `BREAKER` | `pedidos` | off | `on` = disjuntor: abre com 3 falhas seguidas, por 15 s |

Exemplo, no PowerShell (no macOS e no Linux, `export SLOW_MS=30000` e o mesmo `docker compose`):

```powershell
$env:SLOW_MS="30000"; docker compose up -d faturamento-svc
$env:TIMEOUT_MS="2000"; $env:RETRIES="2"; $env:BREAKER="on"; docker compose up -d pedidos
```

Para ver o que o `pedidos` decidiu: `docker compose logs pedidos --tail=5`. Para desligar: `docker compose down`.

## Onde isso aparece no seu PI

O degrau alto de "Serviços" na Etapa 2 é exatamente isto no seu produto: pare o serviço B e mostre o A respondendo com o plano B dentro do timeout que você escolheu.
