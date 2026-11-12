# ADR 002 — Tenancy: pool por padrão, com isolamento em duas camadas; schema ou banco próprio como plano à parte

**Status:** aceito · pool decidido no código em 10/10/2026; plano à parte para clientes maiores decidido em 15/10/2026, ao registrar este ADR

## Contexto

O produto atende cooperativas agrícolas, a maioria de porte parecido, com poucos milhares de entregas por safra cada. Hoje são 2 tenants; o plano é chegar a dezenas. Algumas cooperativas grandes podem exigir, por contrato, que os dados delas fiquem separados das demais. Dado comercial e dado de associado de uma cooperativa não podem aparecer para outra (ver `../lgpd.md`). A equipe que mantém o produto é pequena e não tem tempo para operar um banco por cliente.

## Decisão

**Por padrão, pool:** todas as cooperativas dividem as mesmas tabelas, com a coluna `tenant_id` em toda tabela que guarda dado de tenant (a `evento_processado`, da idempotência, guarda só o identificador do evento), e o isolamento tem duas camadas: o filtro por tenant no código **e** uma política de segurança por linha (RLS) no banco, que só devolve as linhas do tenant declarado no início de cada transação. **Para clientes maiores, schema ou banco próprio como plano à parte**, com o custo de operar pago pelo cliente (modelo híbrido). Hoje nenhum cliente está nesse plano, e ele não está implementado.

## Alternativas descartadas

| Modelo | Por que perdeu aqui |
|---|---|
| **Silo para todos** (um banco por tenant) | Isolamento mais forte, mas cada cooperativa nova é um banco a criar, migrar e fazer cópia de segurança. Com dezenas de tenants pequenos, o custo de operar passa do valor do contrato. **Fica como opção paga para os grandes** |
| **Schema por tenant para todos** | Meio-termo, mas cada mudança de tabela vira N migrações e a consulta precisa trocar de schema a cada pedido. Não compensa para tenants deste tamanho. **Também cabe no plano à parte** |
| **Pool só com o filtro no código** | Basta um `WHERE` esquecido para vazar. É o que o experimento 2 mostra |

## Consequências

- **Melhora:** um banco por serviço atende todos os tenants; cooperativa nova não exige infraestrutura nova. Para vazar é preciso errar duas vezes: o experimento 2 desliga o filtro e o banco segura, e só vaza quando as duas camadas caem.
- **Melhora:** o serviço conecta com um papel (`app_producao`, `app_cobranca`) que não é dono das tabelas, então a política vale para ele.
- **Piora:** tenants dividem as mesmas conexões, e um tenant pesado atrasa os outros (vizinho barulhento). Tratado no ADR 008.
- **Piora:** a tabela `outbox` guarda dado de tenant e não tem política por linha (defeito C7, ADR 010).
- **Melhora:** o plano à parte transforma isolamento em produto: quem precisa de mais paga pelo custo de operar, e o preço do pool continua baixo para os demais (liga com a precificação do Encontro 18).
- **Piora:** o modelo híbrido exige que o serviço descubra **onde** os dados de cada tenant moram antes de consultar (uma tabela "tenant → conexão"). Hoje o código conecta sempre no mesmo banco. Quando o primeiro cliente contratar o plano à parte, isso vira trabalho e um ADR próprio.
- **Piora:** com dois modelos convivendo, toda mudança de tabela precisa ser aplicada no pool e em cada schema ou banco dedicado.
