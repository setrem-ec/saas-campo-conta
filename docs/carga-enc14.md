# Relatório de Carga — CampoConta

**Alvo:** CampoConta (commit `f5eb325`, branch da Etapa 3) · **Máquina e data:** notebook com 12 núcleos lógicos e Windows 11, Docker Desktop, k6 0.50.0 em contêiner na mesma máquina do produto; 24/11/2026

Entregável 3.3 da Etapa 3. As metas vêm de `slo.md`. Com o produto no ar (`docker compose up -d --build --wait`), cada execução foi rodada da raiz do repositório, no Git Bash. No PowerShell, troque o caminho por `"${PWD}/ferramentas:/s"`:

```
docker run --rm -v "$PWD/ferramentas:/s" grafana/k6:0.50.0 run --quiet -e CAMINHO=/cotas -e META_P95=2000 /s/carga.k6.js
docker run --rm -v "$PWD/ferramentas:/s" grafana/k6:0.50.0 run --quiet -e CAMINHO=/relatorio-pesado -e META_P95=5000 /s/carga.k6.js
docker run --rm -v "$PWD/ferramentas:/s" grafana/k6:0.50.0 run --quiet -e CAMINHO=/relatorio-pesado -e META_P95=5000 -e USUARIOS=100 /s/carga-cooperativas.k6.js
```

## Evidência

Resumo do k6, duas execuções de cada cenário, com o código de saída (0 = todos os limiares respeitados):

```
Cenário A, consulta de cotas, 10 usuários (carga.k6.js, META_P95=2000)
  1: ✓ http_req_duration p(95)=7.62ms   ✓ http_req_failed 0.00% (0 de 280)   exit 0
  2: ✓ http_req_duration p(95)=6.42ms   ✓ http_req_failed 0.00% (0 de 280)   exit 0
Cenário B, relatório pesado, 10 usuários (carga.k6.js, META_P95=5000)
  1: ✓ http_req_duration p(95)=508.58ms ✓ http_req_failed 0.00% (0 de 188)   exit 0
  2: ✓ http_req_duration p(95)=507.67ms ✓ http_req_failed 0.00% (0 de 189)   exit 0
Cenário C, relatório pesado, 100 usuários, 50 por cooperativa (carga-cooperativas.k6.js, META_P95=5000)
  1: ✓ http_req_duration p(95)=2.25s    ✓ http_req_failed 0.00% (0 de 1033)  exit 0
  2: ✓ http_req_duration p(95)=2.21s    ✓ http_req_failed 0.00% (0 de 1030)  exit 0
```

## Cenário de pico

Os três cenários têm a mesma forma: 10 s de rampa, 20 s no pico e 5 s de descida, com uma pausa de 1 s entre os pedidos de cada usuário.

- **A e B:** 10 usuários de uma cooperativa, porque a maior cooperativa tem 10 balanças ativas na safra (premissa do dono do produto, `slo.md`).
- **C:** 100 usuários, 50 de cada cooperativa, pedindo o relatório pesado ao mesmo tempo. É o fechamento de safra das duas, o pior caso do cenário Q7 de `atributos-qualidade.md`.

## SLO declarado

Do `slo.md`: na consulta de cotas, p95 < 2.000 ms; no relatório pesado, p95 < 5.000 ms; nas duas rotas, falhas / total < 1% (o 429 conta como falha).

## Resultado (pior de 2 execuções)

| Cenário | Métrica | Medido | Meta | Veredito |
|---|---|---|---|---|
| A, cotas, 10 usuários | p95 | 7,62 ms | < 2.000 ms | ✓ |
| A, cotas, 10 usuários | taxa de erro | 0% | < 1% | ✓ |
| B, relatório, 10 usuários | p95 | 508,58 ms | < 5.000 ms | ✓ |
| B, relatório, 10 usuários | taxa de erro | 0% | < 1% | ✓ |
| C, relatório, 100 usuários | p95 | 2,25 s | < 5.000 ms | ✓ |
| C, relatório, 100 usuários | taxa de erro | 0% | < 1% | ✓ |

## Interpretação

- **A consulta de cotas sobra:** 7 ms contra uma meta de 2 s. Com 10 balanças, ela nem chega perto do ideal de 300 ms.
- **O relatório pesado custa 0,5 s por pedido.** É uma espera de propósito, que faz o papel do cálculo de fechamento. Com 10 usuários, nenhum espera vaga: o p95 é o próprio meio segundo.
- **Com 100 usuários, o p95 sobe para 2,2 s e ninguém recebe 429.** Cada cooperativa tem no máximo 8 relatórios em andamento (ADR 012). Os outros esperam na fila da própria cooperativa e são atendidos dentro dos 5 s. O número bate com o do ADR 012, medido em 12/11 (p95 de 2,2 s).
- **Onde o SLO quebraria:** com 80 pedidos simultâneos por cooperativa e o limite desligado, 72,6% falham (`evidencias/capacidade-2026-11-12.md`). Com o limite ligado, a fila tem 64 vagas e espera no máximo 5 s: acima disso, o excedente recebe 429, e a taxa de erro passa de 1%. A hipótese é que o gargalo seria o pool de 20 conexões da produção. Para confirmar, mediríamos o cenário C com 200 e 400 usuários e veríamos em que degrau aparece o primeiro 429.

**Limites desta medição:** foi uma máquina só, com o k6 ao lado do produto, disputando o mesmo processador. Foram duas execuções por cenário, sem medir a variação, e o relatório pesado é uma espera fixa, não um cálculo real. Num provedor de nuvem, os números mudam; o método, não.
