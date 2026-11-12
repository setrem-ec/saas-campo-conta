# Visão do produto — CampoConta

**Entregável que exemplifica:** Etapa 1, item 1.1 (problema, cliente fictício, personas de tenant).

> **Isto não é o seu PI.** É o exemplo público do CampoConta, material de aula. Um artefato de PI que reproduza este problema e estas personas é avaliado como cópia. Use o **formato**; o conteúdo do seu produto é seu.

**Reescrito em 10/11/2026 e fechado em 12/11/2026 (decisões 97, 98 e 104).** Este documento mostra dois momentos:
- **Hoje** é o que roda no tronco `setrem-ec/saas-campo-conta`, commit `0deac2a`.
- **Alvo** é o que o produto vai ter, fatia a fatia. Nada do alvo existe ainda em código.

As especificações ("spec NN") e as decisões numeradas citadas aqui são do caderno de construção do professor. As especificações entram no tronco na fatia 1.

## Problema

Uma cooperativa agrícola quer que o associado **participe**: que entregue a safra nela e compre nela os insumos. Para isso, mantém um **programa de fidelidade**. Quem participa o bastante no ano fica em situação regular e tem benefícios. Hoje isso vive em planilha: ninguém sabe quem está abaixo do mínimo até o fim do ano, e a compra feita no balcão não chega à conta do associado.

A participação nasce no recebimento. O associado leva a safra à balança, e cada entrega gera uma **taxa** para a cooperativa. Na safra, a balança não pode parar: um caminhão parado na fila custa frete e produto.

## Produto

O CampoConta é um **SaaS multi-tenant de programas de fidelidade para cooperativas, com recebimento de safra**. Várias cooperativas usam o mesmo sistema, cada uma vê só o que é dela, e quem mantém o produto opera uma instalação só.

**Hoje (`0deac2a`)** ele faz três coisas:
1. Registra a entrega contra uma cota em kg e recusa a que passaria do limite.
2. Gera a taxa da entrega (R$ 0,05 por kg), mesmo que a parte de cobrança esteja fora do ar na hora.
3. Mostra ao gestor cotas e taxas juntas.

**No alvo** ele vai fazer:
1. **Receber a safra.** A entrega é registrada por cultura, na safra daquela cultura. Entrega depois do encerramento da safra é aceita e paga uma taxa extra.
2. **Taxar a entrega**, com a política de cada cooperativa: alíquota e mínimo, em centavos.
3. **Dar pontos.** Cada cooperativa configura o seu programa: quantos pontos vale cada produto, o mínimo do ano e os benefícios. Os pontos vêm da entrega e da compra de insumo.
4. **Receber a compra de insumo** de duas formas: o ERP da cooperativa envia a venda por webhook, ou o gestor a digita.
5. **Apurar a situação no ano civil.** Abaixo do mínimo, o associado fica irregular e perde benefícios. Compra a prazo eleva o mínimo do ano. Acima de 3 vezes o mínimo, o gestor recebe um aviso para planejar o recebimento.
6. **Abrir uma cooperativa nova** sem editar arquivo, com plano e papéis.

**De onde vêm as regras.** Um programa real pontua a compra de insumos (Coamo Fideliza, 2018). Pontuar a **entrega** é regra das cooperativas fictícias deste exemplo, não prática de mercado. O estudo está em `estudo-dominio-cooperativas.md`.

## Clientes (tenants) fictícios

| Tenant | Perfil | Associados nos dados de exemplo | Programa no alvo |
|---|---|---|---|
| Cooperativa Alvorada | Cooperativa de grãos, a maior das duas; dispara relatórios pesados no fechamento de safra | A-017, A-023 | Mínimo de 1.000 pontos no ano. Por saca de 60 kg: soja 2 pontos, milho e trigo 1, canola 1,5. Insumo: 1 ponto por R$ 100,00. Cada R$ 100,00 comprados a prazo somam 1 ponto ao mínimo |
| Cooperativa Buricá | Cooperativa menor; usa o sistema o dia todo, com consultas curtas. No alvo, recebe só leite, em coleta diária | B-101, B-102 | Mínimo de 1.000 pontos no ano. Leite: 0,007 ponto por litro. Insumo: 1 ponto por R$ 100,00. Cada R$ 100,00 comprados a prazo somam 1 ponto ao mínimo |

A terceira, a **Cooperativa Coxilha**, nasce pela rota de abertura de cooperativa (specs 02 e 09), no plano básico. Gestora: `cida`.

Todas são fictícias.

## Personas

| Persona | Quem é | O que precisa do sistema |
|---|---|---|
| **Balanceiro** | Opera a balança no recebimento e registra a entrega (não confundir com balanceador de carga) | Resposta imediata. Não pode esperar a taxa nem os pontos |
| **Gestor da cooperativa** | Cuida da safra e do programa de fidelidade da **sua** cooperativa | Configurar o programa, as safras e a política de taxa. Digitar a compra que não vem do ERP. Ver quem está irregular e receber o aviso de 3 vezes o mínimo |
| **Admin da plataforma** | Mantém o CampoConta para todas as cooperativas | Abrir cooperativas, definir planos e ver o uso. Que nenhuma cooperativa veja a outra e que nenhuma monopolize o sistema |

O associado não usa o sistema. Ele aparece só nos dados.

**Sistema externo:** o **ERP da cooperativa**, que vende os insumos e avisa o CampoConta de cada venda.

## Fora do produto (no alvo)

Estes limites valem para o alvo. Hoje não há medição de uso, situação de associado, tela nem login: o token é fixo.

- **Venda de insumo, barter, CPR e cobrança da dívida:** são do ERP. O CampoConta só recebe o fato da venda.
- **Eliminação do associado:** é decisão do Conselho de Administração. O sistema só mostra a situação.
- **Aplicar o benefício:** o gestor lista os benefícios do programa, e o sistema diz quem é regular. O desconto ou o crédito acontece no ERP.
- **Fatura da assinatura e uso:** o sistema mede o uso de cada cooperativa, mas não emite fatura.
- **Boleto da taxa**, balança física, e-mail e provedor de identidade: o peso é digitado, o aviso aparece na tela e o login é do próprio produto.
