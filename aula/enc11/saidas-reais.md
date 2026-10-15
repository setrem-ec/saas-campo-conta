# Saídas reais dos seis experimentos

**Só abra este arquivo depois do commit `previsoes`.** Ele é para quem não conseguiu subir o sistema: traz o que a tela mostrou quando os experimentos foram rodados em 10/10 e 12/10/2026, em Windows 11. Não traz explicação; o "porquê" você escreve na parte 3 do registro.

Números de identificação (entrega 3, evento 1…) e tempos mudam de máquina para máquina. `…` marca trecho cortado.

## 1 — Seguir uma requisição

Sem identificação:

```
{"erro":"token ausente ou invalido"}
```

Com `$A`: as duas cotas da Alvorada (A-017 com 1200 de 10000 kg; A-023 com 0 de 6000 kg).

O `POST` da entrega:

```
{"tenant":"alvorada","entrega_id":3,"evento_id":1,"entregue_kg":400,"limite_kg":6000}
```

Terminal 1, nesta ordem:

```
[gateway] req=7c84cf tenant=alvorada POST /entregas -> producao
[producao] req=7c84cf tenant=alvorada entrega 3 gravada + evento 1 na outbox (mesma transacao)
[cobranca] evento 1 (tenant=alvorada) -> taxa de R$ 20.00 gerada
[producao/relay] evento 1 (tenant=alvorada) entregue a cobranca
```

`/taxas`: duas taxas, total 80.

## 2 — A Buricá tenta ver o dado da Alvorada

```
curl.exe -H "$B" http://localhost:8080/entregas/1
{"erro":"entrega nao encontrada"}
```

Com o cabeçalho `x-tenant-id: alvorada`: só a entrega 2, que é da Buricá.

Filtro do código desligado: continua só a entrega 2.

Filtro do código e regra do banco desligados:

```
{"tenant":"burica","entregas":[{"id":1,"tenant_id":"alvorada",…,"kg":1200},{"id":2,"tenant_id":"burica",…},{"id":3,"tenant_id":"alvorada",…,"kg":400}]}
```

## 3 — O relatório da diretoria

```
ERROR:  relation "taxa" does not exist
```

`/relatorio`: um JSON com `producao` (as cotas) e `cobranca` (total e taxas), `total_ms` em torno de 17.

## 4 — A cobrança sai do ar

O `POST` com a cobrança parada:

```
{"tenant":"alvorada","entrega_id":4,"evento_id":2,"entregue_kg":1300,"limite_kg":10000}
```

Depois de cinco `POST`:

```
{"pendentes":5}
```

Terminal 1:

```
[producao/relay] cobranca indisponivel (The operation was aborted due to timeout); evento fica na fila; nova tentativa em 500 ms
[producao/relay] cobranca indisponivel (…); evento fica na fila; nova tentativa em 1000 ms
```

`/taxas`: `{"erro":"servico indisponivel",…}`, depois de 3 a 5 segundos.
`/relatorio`: as cotas e `"cobranca":"INDISPONIVEL (relatorio parcial)"`, com `total_ms` em torno de 2000.

Cobrança religada, 15 segundos depois: `{"pendentes":0}` e cinco taxas novas de R$ 5 na lista (total 105).

## 5 — O mesmo evento chega duas vezes

Com a conferência desligada: a entrega de 1000 kg aparece **duas vezes** em `/taxas`, R$ 50 cada.

Com a conferência religada: a entrega de 2000 kg aparece uma vez, R$ 100. Terminal 1:

```
[cobranca] evento 8 (tenant=burica) -> taxa de R$ 100.00 gerada
[cobranca] evento 8 (tenant=burica) JA PROCESSADO - ignorado
```

## 6 — O vizinho barulhento

Limite desligado:

```
ALVORADA (60 relatorios pesados de uma vez) - respostas por status: { '200': 60 }
BURICA (GET /cotas durante a inundacao) - 1 medidas: menor 6105 ms | mediana 6105 ms | maior 6105 ms
```

Limite ligado:

```
ALVORADA (60 relatorios pesados de uma vez) - respostas por status: { '200': 3, '429': 57 }
BURICA (GET /cotas durante a inundacao) - 3 medidas: menor 5 ms | mediana 5 ms | maior 95 ms
```
