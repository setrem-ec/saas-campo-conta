# Especificação do CampoConta (o sistema como está)

**Especificação escrita depois do código** (12/10/2026), para dizer o que a versão de 10/10 promete. É o ponto de partida do desenvolvimento orientado por especificação: cada mudança futura começa por uma especificação nova, no mesmo formato, antes do código. Onde o código não cumpre o que está aqui, o registro está em `adr/010-defeitos-conhecidos-nao-corrigidos-agora.md`. As decisões citadas abaixo estão justificadas nos ADRs (`adr/`).

## Problema

Uma cooperativa agrícola precisa registrar o que cada associado entrega, sem deixar passar da cota, e cobrar uma taxa administrativa por entrega. Várias cooperativas usam o mesmo sistema e nenhuma pode ver nada das outras. Na safra, a balança não pode parar porque a cobrança parou, e o fechamento de uma cooperativa grande não pode travar as pequenas.

## Solução

Um produto com uma porta só. Quem chama se identifica com um token; o sistema descobre a cooperativa a partir dele e, dali em diante, tudo o que aquele pedido toca pertence àquela cooperativa. Registrar a entrega é imediato. A taxa aparece instantes depois, e continua aparecendo mesmo que a cobrança tenha ficado fora do ar no meio.

## Histórias de usuário

**Balanceiro**

1. Como balanceiro, quero registrar a entrega de um associado informando código e peso, para que ela conte na cota dele.
2. Como balanceiro, quero ser impedido de registrar uma entrega que ultrapasse a cota, para não aceitar produto além do combinado.
3. Como balanceiro, quero uma mensagem clara quando o associado não tem cota na safra, para saber que o problema é de cadastro.
4. Como balanceiro, quero registrar entregas mesmo com a cobrança fora do ar, para a fila da balança não parar.
5. Como balanceiro, quero consultar as entregas já registradas da minha cooperativa, para conferir o dia.

**Gestor da cooperativa**

6. Como gestor, quero ver as cotas e o quanto cada associado já entregou, para acompanhar a safra.
7. Como gestor, quero ver as taxas geradas e o total, para saber quanto a cooperativa tem a receber.
8. Como gestor, quero um relatório com cotas e taxas juntas, para não consultar dois lugares.
9. Como gestor, quero que esse relatório saia mesmo sem a parte da cobrança, avisando o que faltou, para não ficar sem nada.
10. Como gestor, quero que cada entrega gere exatamente uma taxa, para não cobrar o associado duas vezes.
11. Como gestor, quero que nenhuma entrega fique sem taxa, para não perder receita.

**Cooperativa, como tenant**

12. Como cooperativa, quero que nenhuma outra veja minhas cotas, entregas ou taxas, para proteger dado comercial e dado de associado.
13. Como cooperativa, quero que pedir o identificador de uma entrega alheia devolva "não encontrada", para que ninguém descubra nem que ela existe.
14. Como cooperativa, quero que o isolamento não dependa de cada programador lembrar de um filtro, para estar protegida de um erro de código.
15. Como cooperativa, quero que o uso pesado de outra não deixe o meu sistema lento, para trabalhar na safra.

**Dono do produto**

16. Como dono do produto, quero que cada cooperativa tenha um teto de pedidos simultâneos, para que nenhuma monopolize o sistema.
17. Como dono do produto, quero que quem passa do teto receba uma resposta que diga isso, para saber que deve tentar depois.
18. Como dono do produto, quero que o mundo de fora só alcance o gateway, para ter um lugar só onde decidir quem é quem.
19. Como dono do produto, quero que cada pedido carregue um identificador nos logs dos três serviços, para seguir um problema de ponta a ponta. *(Hoje falta no caminho do evento: a cobrança registra o identificador no `GET /taxas`, mas não ao processar o evento. Defeito C14, ADR 010.)*

**Professor e aluno, no laboratório**

20. Como professor, quero desligar o filtro da aplicação, para mostrar que a trava do banco segura.
21. Como professor, quero entregar o mesmo evento duas vezes, para mostrar o que a idempotência evita.
22. Como professor, quero desligar a idempotência, para mostrar a taxa em dobro.
23. Como professor, quero desligar o limite por tenant, para mostrar o vizinho barulhento.
24. Como professor, quero ver quantos eventos esperam entrega, para mostrar a fila enchendo e esvaziando.
25. Como aluno, quero subir tudo com um comando e sem instalar nada além do Docker, para explorar em casa.
26. Como aluno, quero voltar aos dados de exemplo com um comando, para repetir um experimento do zero.

## Decisões de implementação

- **Três processos, dois bancos.** Gateway, produção e cobrança; produção e cobrança têm cada uma o seu PostgreSQL. O gateway não tem banco.
- **O tenant nasce no gateway.** O token é trocado pelo tenant, e o gateway monta do zero os cabeçalhos que seguem para dentro. O que o cliente mandou é ignorado.
- **Dentro, o tenant viaja de duas formas:** em cabeçalho, nas chamadas síncronas; dentro do próprio evento, na comunicação assíncrona, porque ali não há pedido de usuário.
- **Isolamento em duas camadas.** A aplicação filtra por tenant; o banco aplica uma política por linha que consulta o tenant declarado no início de cada transação. O serviço conecta com um papel que não é dono das tabelas.
- **Evento na mesma transação da entrega** (outbox). Um laço dentro da produção entrega os eventos pendentes, em ordem, com recuo crescente quando a cobrança não responde. A entrega é "pelo menos uma vez".
- **Consumidor idempotente.** A cobrança registra o identificador de cada evento processado; a chave primária impede o segundo processamento.
- **Limite por tenant no gateway:** um teto de pedidos em andamento por tenant. O excedente é recusado na hora.
- **Composição no gateway** para o relatório, com prazo por chamada e resposta parcial.
- **Chaves de laboratório** em uma porta separada da do produto.

### Contrato das rotas do produto

Toda rota, exceto `/saude`, exige token: sem token válido, responde 401. Toda rota com token responde 429 quando o tenant já tem 3 pedidos em andamento. Toda rota encaminhada a um serviço responde 503 se ele não responde. A coluna de erros lista só os erros próprios de cada rota.

| Rota | Resposta de sucesso | Erros próprios |
|---|---|---|
| `GET /saude` | o gateway está no ar; não pede token | — |
| `GET /eu` | tenant e usuário do token | — |
| `GET /cotas` | cotas do tenant | — |
| `GET /entregas` | entregas do tenant | — |
| `GET /entregas/<id>` | a entrega, se for do tenant | 404 se não existe **ou** é de outro tenant |
| `POST /entregas` | 201 com identificadores da entrega e do evento, e o saldo da cota | 404 sem cota; 422 acima da cota |
| `GET /taxas` | taxas do tenant e o total | — |
| `GET /relatorio` | cotas e taxas; a parte indisponível vem marcada | — |
| `GET /relatorio-pesado` | resposta lenta de propósito (cerca de 0,5 s); existe para o experimento 6 e para o teste de carga | — |

### Contrato do evento `EntregaRegistrada`

| Campo | Sentido |
|---|---|
| `id` | Identificador único do evento. É a chave da idempotência |
| `tipo` | `EntregaRegistrada` |
| `tenant_id` | A cooperativa dona da entrega |
| `payload.entrega_id` | A entrega que originou o evento |
| `payload.associado`, `payload.safra`, `payload.kg` | O que a cobrança precisa para calcular e registrar a taxa |

## Decisões de teste

Hoje **não há teste automatizado**. A verificação é o roteiro dos seis experimentos, executado à mão em 10/10. Um bom teste, quando existir, exercita o sistema pela porta do gateway e observa só o que quem chama enxerga; não abre o banco nem conhece a outbox. Testes são assunto da Unidade 4.

## Fora de escopo

Login de verdade; cadastro de cooperativa, associado ou cota pela API; os contextos Associados e Relatórios; broker de mensagens; testes e pipeline; Kubernetes; cobrança real (boleto, pagamento).

## Notas

- A regra "entrega não ultrapassa a cota" é a única regra de negócio do núcleo e não tem experimento. Vale um sétimo, curto.
- O sistema não tem como criar um tenant sem editar arquivo e recriar o banco.
