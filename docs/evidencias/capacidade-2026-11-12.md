# Evidência — a medição de capacidade que deu os números do ADR 012

**Registrado em 12/11/2026.** Mede uma máquina só (um notebook com 12 núcleos lógicos e Windows 11), com o k6 rodando ao lado do produto. Em outra máquina os números mudam; o método não.

## Como foi medido

O roteiro é `ferramentas/capacidade.k6.js`. Cada execução mede um degrau: N pedidos simultâneos por cooperativa, sem pausa, por 15 s. O limite fica desligado, para medir o produto e não a regra.

```powershell
curl.exe -X POST http://localhost:8081/chaves/limite-tenant/off
docker run --rm -v "${PWD}/ferramentas:/s" -e CAMINHO=/cotas -e POR_COOPERATIVA=20 grafana/k6:0.50.0 run --quiet /s/capacidade.k6.js
curl.exe -X POST http://localhost:8081/chaves/limite-tenant/on
```

Foi uma execução por degrau. Não houve repetição para medir a variação.

## Com 5 conexões de banco (como no ADR 008)

| Rota | Simultâneos por cooperativa | Pedidos por segundo | Mediana | p95 | Máximo | Erro |
|---|---|---|---|---|---|---|
| `/cotas` | 5 | 588 | 15 ms | 27 ms | 140 ms | 0% |
| `/cotas` | 10 | 724 | 26 ms | 38 ms | 74 ms | 0% |
| `/cotas` | 20 | 760 | 50 ms | 72 ms | 318 ms | 0% |
| `/cotas` | 40 | 741 | 102 ms | 152 ms | 625 ms | 0% |
| `/cotas` | 80 | 690 | 203 ms | 292 ms | 6.207 ms | 0% |
| `/relatorio-pesado` | 5 | 10 | 1.005 ms | 1.009 ms | 1.021 ms | 0% |
| `/relatorio-pesado` | 10 | 10 | 2.011 ms | 2.016 ms | 2.024 ms | 0% |
| `/relatorio-pesado` | 20 | 10 | 4.020 ms | 4.023 ms | 4.028 ms | 0% |
| `/relatorio-pesado` | 40 | 10 | 8.042 ms | 8.055 ms | 8.090 ms | 0% |
| `/relatorio-pesado` | 80 | 15 | 10.004 ms | 10.228 ms | 10.262 ms | 72,6% |

- **A consulta de cotas tem teto perto de 740 pedidos por segundo.** Acima de 10 simultâneos por cooperativa, a vazão não sobe; só o tempo sobe.
- **O relatório pesado tem teto de 10 por segundo, para o produto inteiro:** 5 conexões, 0,5 s cada.
- Com 80 por cooperativa, os relatórios passam do prazo de 10 s do gateway e falham.

## Com 20 conexões de banco

| Rota | Simultâneos por cooperativa | Pedidos por segundo | p95 | Erro |
|---|---|---|---|---|
| `/relatorio-pesado` | 5 | 19 | 541 ms | 0% |
| `/relatorio-pesado` | 10 | 39 | 517 ms | 0% |
| `/relatorio-pesado` | 20 | 40 | 1.011 ms | 0% |
| `/relatorio-pesado` | 40 | 39 | 2.029 ms | 0% |
| `/relatorio-pesado` | 80 | 39 | 4.033 ms | 0% |
| `/cotas` | 40 | 770 | 146 ms | 0% |
| `/cotas` | 80 | 764 | 266 ms | 0% |

O teto do relatório foi de 10 para 40 por segundo. A consulta de cotas não mudou.

## Quanto o produto gastou

Leitura do `docker stats`, uma por cenário. 100% é um núcleo inteiro.

| Contêiner | Parado | Cotas, 40 por cooperativa | Relatório, 100 usuários |
|---|---|---|---|
| gateway | 0% | 107% | 7% |
| producao | 0% | 100% | 8% |
| banco da produção | 6% | 73% | 8% |
| Memória, os cinco contêineres | 160 MB | 250 MB | 260 MB |

O teto da consulta de cotas é o processador: o gateway e a produção são processos de um núcleo só. O teto do relatório era o número de conexões.

## Com o limite ligado: antes e depois do ADR 012

Roteiros: `ferramentas/carga.k6.js` (10 usuários de uma cooperativa) e `ferramentas/carga-cooperativas.k6.js` (`-e USUARIOS=N`, divididos entre as duas). Cada usuário faz um pedido, espera 1 s e repete, por 35 s. O "antes" é o código do commit `0deac2a`; o "depois" é o padrão do ADR 012.

```powershell
docker run --rm -v "${PWD}/ferramentas:/s" -e CAMINHO=/relatorio-pesado grafana/k6:0.50.0 run --quiet /s/carga.k6.js
docker run --rm -v "${PWD}/ferramentas:/s" -e USUARIOS=100 -e CAMINHO=/relatorio-pesado grafana/k6:0.50.0 run --quiet /s/carga-cooperativas.k6.js
```

| Cenário | Antes: erro | Antes: p95 | Depois: erro | Depois: p95 |
|---|---|---|---|---|
| 10 usuários no relatório pesado | 39,44% | 508 ms | 0,00% | 509 ms |
| 100 usuários no relatório pesado | 86,99% | 534 ms | 0,00% | 2,22 s |
| 100 usuários listando cotas | 0,17% | 9 ms | 0,00% | 13 ms |
| 1.000 usuários listando cotas | 41,12%, 60,16% e 56,08% em três execuções | 26 a 91 ms | 13,13% | 855 ms; um pedido levou 16,2 s |

- No "antes", o p95 baixo engana: a maior parte das respostas era um 429, que volta em 2 ms.
- A linha de 1.000 usuários no "depois" foi medida com a faixa pesada em 2 e 5 conexões, antes do ajuste final. A faixa geral, que é a que essa rota usa, já era de 40.
- A terceira execução do "antes" com 1.000 usuários (56,08%) já tinha uma fila de 6 lugares, com o teto de 3.

O vizinho barulhento (`docker compose run --rm ferramentas node inundar.js`: 60 relatórios da Alvorada de uma vez, enquanto a Buricá lista cotas), no padrão do ADR 012:

| Chave `limite-tenant` | Relatórios da Alvorada | Buricá: mediana | Buricá: maior |
|---|---|---|---|
| off | 60 atendidos | 1.620 ms (uma medida só) | 1.620 ms |
| on | 60 atendidos | 4 ms e 7 ms, em duas execuções | 74 ms e 139 ms |

## O que esta medição não diz

- Não mede um servidor, nem a rede entre o usuário e o produto.
- O relatório pesado é uma espera de 0,5 s no banco (`pg_sleep`). Um relatório de verdade gastaria processador.
- A meta de 2 s para a consulta de cotas ficou acima do maior degrau medido.
