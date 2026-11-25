# Evidência — o pipeline fica vermelho quando o isolamento quebra

**Registrado em 12/11/2026.** Os registros do GitHub Actions expiram em 90 dias. Este arquivo guarda o que eles mostraram.

## O que foi feito

Na branch `demo/isolamento-quebrado`, que **não entra no tronco**, o isolamento foi quebrado de propósito, em dois passos, no arquivo `producao/server.js`. A suíte é a mesma do tronco: `testes/isolamento.test.js`.

| Passo | O que mudou no código | Resultado do pipeline |
|---|---|---|
| 0 | Nada: o tronco como está | ✓ verde |
| 1 | Saiu o filtro de tenant do código: a lista e a busca de entregas deixaram de filtrar | ✓ **verde** |
| 2 | Além disso, o serviço passou a conectar no banco como dono das tabelas, e a política por linha deixou de valer para ele | ✗ **vermelho** |

## O que o passo 1 ensina

Com uma das duas camadas de isolamento fora, a suíte continuou verde. A política por linha do banco segurou sozinha (ADR 002). Isso é bom, porque o produto não vazou. E é um limite do teste: ele entra pela porta do gateway e não tem como dizer que uma camada caiu. Por isso o plano de testes pede também um teste de integração, só da camada do banco (`../plano-de-testes.md`).

Só foi medido o caso "sem o filtro do código". O caso inverso, sem a política do banco e com o filtro, não foi medido.

## O que o passo 2 mostrou

Trecho do registro da execução vermelha:

```text
    not ok 1 - a Buricá não vê a entrega que a Alvorada criou
      error: 'VAZAMENTO: Buricá viu a entrega 3, que é da Alvorada (GET /entregas/3 respondeu 200)'
    not ok 2 - a Alvorada não vê a entrega que a Buricá criou
      error: 'VAZAMENTO: Alvorada viu a entrega 4, que é da Buricá (GET /entregas/4 respondeu 200)'
not ok 1 - isolamento entre tenants
# tests 3
# pass 0
# fail 3
```

## As execuções

| O quê | Commit | Resultado | Duração | Endereço |
|---|---|---|---|---|
| Suíte na branch do teste | `dba8c9c` | ✓ | 26 s | https://github.com/setrem-ec/saas-campo-conta/actions/runs/43283487249 |
| Passo 1: sem o filtro do código | `b804e99` | ✓ | 39 s | https://github.com/setrem-ec/saas-campo-conta/actions/runs/43274856550 |
| Passo 2: sem as duas camadas | `4717296` | ✗ | 21 s | https://github.com/setrem-ec/saas-campo-conta/actions/runs/43283501069 |

A execução do passo 1 usou a primeira versão do teste. A do passo 2 usou a versão corrigida, que é a do tronco.

## Outra conferência, feita fora do GitHub

O teste só chama de "VAZAMENTO" a resposta 200 ao vizinho. Com um gateway de mentira respondendo "ocupado" (429), a mensagem foi: "resposta inesperada: GET /entregas/1 como Buricá respondeu 429. Não dá para concluir sobre o isolamento".
