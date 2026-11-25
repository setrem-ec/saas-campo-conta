# SLO — CampoConta

Entregável 3.4 da Etapa 3. As metas são do dono do produto (o professor, no papel de cliente), ditas em 12/11/2026 e registradas no ADR 012: "300 ms é o ideal; até 2 s numa consulta comum e até 5 s num relatório pesado está bom". Os mesmos números são os limiares do k6 em `carga-enc14.md`.

| Métrica | Fórmula | Meta | Justificativa de negócio |
|---|---|---|---|
| latência da consulta de cotas (`GET /cotas`) | p95 do tempo de resposta, por cooperativa | < 2.000 ms | O balanceiro consulta a cota do associado com o caminhão na balança. Acima de 2 s, a fila de caminhões cresce no pátio, e a safra não espera. 300 ms é o ideal, não a meta |
| latência do relatório pesado (`GET /relatorio-pesado`) | p95 do tempo de resposta, por cooperativa | < 5.000 ms | O gestor pede o fechamento da safra poucas vezes por dia e espera alguns segundos. Acima de 5 s, ele pede de novo e dobra a carga |
| erro das duas rotas | pedidos com falha / total (falha: código 400 ou mais, o 429 incluído, ou sem resposta) | < 1% | Uma consulta perdida é um caminhão parado ou uma entrega registrada sem conferir a cota. O 429 conta como falha: para o balanceiro, é um pedido perdido |

**O que não é meta.** A disponibilidade do produto (o serviço no ar) e o tempo de registrar uma entrega (`POST /entregas`) ainda não têm meta própria. Estão nos cenários Q1 e Q4 de `atributos-qualidade.md` e entram aqui quando o dono do produto disser um número.

## Pico

Na safra, a maior cooperativa tem **10 balanças ativas ao mesmo tempo**, e cada balança é um usuário (premissa do dono do produto). Para o relatório pesado, o pior caso medido é o fechamento de safra: **100 usuários**, 50 de cada cooperativa (cenário Q7 de `atributos-qualidade.md`).

## Limiar no k6

```javascript
// consulta de cotas
http_req_duration: ['p(95)<2000'], http_req_failed: ['rate<0.01']
// relatório pesado
http_req_duration: ['p(95)<5000'], http_req_failed: ['rate<0.01']
```

O roteiro `ferramentas/carga.k6.js` recebe a meta por `-e META_P95=...`. O padrão dele, 300 ms, é o ideal da consulta e não a meta: o teste da meta passa o número desta tabela.

**Mudou em relação à primeira versão:** não houve primeira versão em 21/11. Esta é a primeira, de 24/11/2026.
