# Visão do produto — CampoConta

**Entregável que exemplifica:** Etapa 1, item 1.1 (problema, cliente fictício, personas de tenant).

> **Isto não é o seu PI.** É o exemplo público do CampoConta, material de aula. Um artefato de PI que reproduza este problema e estas personas é avaliado como cópia. Use o **formato**; o conteúdo do seu produto é seu.

**Escrito em 12/11/2026.** Descreve o que roda no tronco `setrem-ec/saas-campo-conta`. O código do produto é o do commit `0deac2a`. O que o sistema ainda não faz está na seção "Fora do produto".

## Problema

Uma cooperativa agrícola precisa registrar o que cada associado entrega, sem deixar passar da cota, e cobrar uma taxa por entrega. Várias cooperativas usam o mesmo sistema, e nenhuma pode ver nada das outras.

Na safra, a balança não pode parar: um caminhão parado na fila custa frete e produto. Ela não pode parar porque a cobrança parou, e o fechamento de uma cooperativa grande não pode travar as pequenas.

## Produto

O CampoConta é um **SaaS multi-tenant de recebimento de safra para cooperativas**. Várias cooperativas usam o mesmo sistema, cada uma vê só o que é dela, e quem mantém o produto opera uma instalação só.

Ele faz três coisas:
1. Registra a entrega contra uma cota em kg e recusa a que passaria do limite.
2. Gera a taxa da entrega (R$ 0,05 por kg), mesmo que a parte de cobrança esteja fora do ar na hora.
3. Mostra ao gestor cotas e taxas juntas.

## Clientes (tenants) fictícios

| Tenant | Perfil | Associados nos dados de exemplo |
|---|---|---|
| Cooperativa Alvorada | Cooperativa de grãos; dispara relatórios pesados no fechamento de safra | A-017, A-023 |
| Cooperativa Buricá | Usa o sistema o dia todo, com consultas curtas | B-101, B-102 |

As duas são fictícias.

## Personas

| Persona | Quem é | O que precisa do sistema |
|---|---|---|
| **Balanceiro** | Opera a balança no recebimento e registra a entrega (não confundir com balanceador de carga) | Resposta imediata: "cabe na cota?". Não pode esperar a taxa |
| **Gestor da cooperativa** | Acompanha a safra da **sua** cooperativa | Ver as cotas, o que já foi entregue e as taxas geradas |
| **Dono do produto** | Mantém o CampoConta para todas as cooperativas | Que nenhuma cooperativa veja a outra e que nenhuma monopolize o sistema |

Hoje as personas não têm papel no sistema: cada cooperativa tem um token fixo, e quem tem o token faz tudo.

O associado não usa o sistema. Ele aparece só nos dados, como um código.

## Fora do produto

- **Login de verdade.** O token é fixo, de bancada.
- **Cadastro de cooperativa, de associado ou de cota pela API.** Criar um tenant exige editar arquivo e recriar o banco.
- **Papéis.** Qualquer token faz tudo, e o painel do laboratório não pede nada.
- **Boleto e pagamento da taxa.**
- **Balança física.** O peso é digitado.
- **Suíte de testes completa.** Há um teste, o de isolamento, e o pipeline que o roda a cada push (ADR 011). Teste de unidade, de contrato e de segurança ainda não existem.

## Para onde o produto vai

O CampoConta está sendo redesenhado como programa de fidelidade para cooperativas. O desenho novo ainda está em revisão e não está neste repositório. Quando entrar, cada decisão virá num ADR novo, a partir do 011, sem apagar os dez que descrevem o sistema de hoje.
