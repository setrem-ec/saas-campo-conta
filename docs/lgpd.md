# Mapeamento LGPD — CampoConta

**Entregável que exemplifica:** Etapa 1, item 1.5 (dados pessoais por tenant, finalidade, primeiro esboço de medidas).

## Papéis

Cada **cooperativa** é a **controladora** dos dados dos seus associados: é ela quem decide coletar e para quê. O **CampoConta** é **operador**: trata os dados em nome de cada cooperativa e não pode usá-los para outra finalidade, nem misturá-los entre cooperativas.

## Dados tratados

| Dado | Onde está | Pessoal? | Finalidade | Base legal provável |
|---|---|---|---|---|
| Código do associado (`A-017`) | `cota`, `entrega`, `taxa`, `outbox` | **Sim**: identifica o produtor dentro da cooperativa, que sabe quem é | Contar a entrega na cota e cobrar a taxa | Execução de contrato (entre associado e cooperativa) |
| Peso entregue por safra | `cota` (acumulado), `entrega`, `taxa`, `outbox` | Sim, quando ligado ao código: revela produção e renda do associado | Idem | Idem |
| Valor da taxa | `taxa` | Sim, ligado ao código | Cobrança | Idem |
| Usuário do sistema (`ana`, `beto`) | Token, no gateway | Sim | Identificar quem chama. Hoje o usuário viaja num cabeçalho e **não é gravado**: o sistema ainda não permite saber quem registrou cada entrega | Legítimo interesse da cooperativa (rastreabilidade) |

O sistema **não** guarda nome, CPF ou endereço do associado. A tabela de-para entre código e pessoa fica com a cooperativa. É uma decisão de minimização: o que não está aqui não vaza daqui.

## Medidas existentes

- Isolamento por tenant em duas camadas em `cota`, `entrega` e `taxa` (ADR 002).
- O tenant nasce no gateway; o cliente não consegue se passar por outra cooperativa (ADR 001).
- Pedido de dado alheio responde "não encontrado", sem confirmar que o dado existe (cenário Q2 em `atributos-qualidade.md`).
- Bancos e serviços fora do alcance de fora; só o gateway publica porta, e só na própria máquina (ADR 009).

## Lacunas conhecidas

- **A `outbox` guarda código e peso do associado sem política por linha** (defeito C7, ADR 010).
- **A cobrança aceita evento de qualquer chamador interno** e confia no tenant escrito nele (defeito C1). Quem alcança a rede interna cria taxa em nome de qualquer cooperativa.
- **Não há exclusão por tenant:** cooperativa que encerra o contrato não tem como ter seus dados apagados sem intervenção manual. O encerramento de um tenant com exclusão dos dados dele (offboarding, Encontro 06) ainda não existe.
- **Não há registro de quem acessou o quê** além dos logs de requisição.
- A mensagem de erro do banco vai inteira para quem chamou, e pode expor estrutura interna.
