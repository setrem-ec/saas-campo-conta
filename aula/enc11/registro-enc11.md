# Registro do encontro de 15/10 (on-line)

**O que é:** a folha de registro do encontro, em arquivo. Substitui a folha impressa.
**Onde vai:** copie este arquivo para o repositório do **seu PI**, como `docs/registro-enc11-<seu-primeiro-nome>.md`. Um arquivo por aluno.

## Checklist de entrega

- [ ] **Commit 1, `previsoes`:** partes 1 e 2 preenchidas, com push, até 20h05 e **antes** de rodar qualquer comando dos experimentos 2 a 6.
- [ ] **Commit 2, `observacoes`:** parte 3 preenchida, com push, antes da chamada de fechamento (21h35).
- [ ] **Commit 3, `reescrita`:** parte 4 preenchida, com push, logo depois da chamada de fechamento.
- [ ] **Até sábado, 17/10, 23h59:** `docs/servicos-rascunho.md` da sua unidade de PI (ver `experimentos.md`, "Ao terminar").

**Dúvida durante o encontro:** no chat da chamada; o professor responde por escrito.

**Por que a ordem dos commits importa:** no presencial, ninguém rodava antes do sinal do professor. Aqui quem faz esse papel é o `git log`. **Previsão errada vale. Previsão enviada depois de rodar não vale.** Hoje a sua presença também é conferida pelo commit `previsoes`.

**Por que isso interessa ao seu projeto:** na Etapa 2 (29/10) o seu produto precisa ter dois serviços no ar e um tenant sem enxergar o dado do outro. Cada previsão abaixo é uma decisão que você vai ter de tomar nele.

## Parte 1 — Antes de tudo (2 min, sem consulta)

O que é um microsserviço? E o que muda nele quando o produto é multi-tenant?

> 

## Parte 2 — As seis previsões

Leia a pergunta marcada **Previsão no registro** em cada experimento de `experimentos.md` e responda aqui em uma linha, com número quando a pergunta pede número. Na linha 1, copie o que você respondeu no chat da abertura, antes de o professor rodar o experimento 1.

| Exp. | Previsão |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |

Agora, **no terminal aberto na pasta do repositório do seu PI** (não no do CampoConta), troque `<seu-primeiro-nome>` e rode:

```
git add docs/registro-enc11-<seu-primeiro-nome>.md
git commit -m "previsoes"
git push
```

Push recusado porque um colega enviou antes? `git pull --rebase` e `git push` de novo. Confira no GitHub que o commit apareceu. Só depois rode os experimentos 2 a 6.

## Parte 3 — O que aconteceu

Para cada experimento: o que a saída mostrou (o número, a mensagem, a linha do log) e se a sua previsão acertou. A coluna "O nome disso" você preenche na chamada de fechamento, ou antes, se souber o nome.

| Exp. | O que a saída mostrou | Acertei? | O nome disso |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |

**O sistema não subiu na sua máquina?** Use a tabela "Se der errado" do `README.md` da raiz do repositório por no máximo 10 minutos. Não resolveu: pare de consertar. Faça as previsões e o commit `previsoes` normalmente, e só então abra `saidas-reais.md` e preencha esta parte a partir dele. Nesse caso, escreva "Preenchido pelas saídas reais" na linha logo acima da tabela.

Agora, **no terminal aberto na pasta do repositório do seu PI** (não no do CampoConta), troque `<seu-primeiro-nome>` e rode:

```
git add docs/registro-enc11-<seu-primeiro-nome>.md
git commit -m "observacoes"
git push
```

Push recusado porque um colega enviou antes? `git pull --rebase` e `git push` de novo. Confira no GitHub que o commit apareceu.

## Parte 4 — Reescrita (depois da chamada de fechamento)

Releia a sua resposta da parte 1 e reescreva-a aqui, sem apagar a original. Termine com uma linha: o que mudou.

> 

Agora, **no terminal aberto na pasta do repositório do seu PI** (não no do CampoConta), troque `<seu-primeiro-nome>` e rode:

```
git add docs/registro-enc11-<seu-primeiro-nome>.md
git commit -m "reescrita"
git push
```

Push recusado porque um colega enviou antes? `git pull --rebase` e `git push` de novo. Confira no GitHub que o commit apareceu.
