# ADR 011 — A suíte roda a cada push, numa máquina limpa

**Status:** proposto em 12/11/2026 · implementado no mesmo dia · escrito no dia da decisão

## Contexto

O CampoConta tem 3 serviços e 2 bancos, e desde 10/10/2026 o isolamento entre cooperativas só era conferido à mão, pelo experimento 2. Não havia nenhum teste automatizado. Quem mudasse o código podia quebrar o isolamento sem ninguém perceber.

A Etapa 3 cobra das unidades de PI, em 26/11/2026, uma suíte rodando a cada push, um teste que prove o isolamento e a demonstração de que o pipeline falha quando um teste quebra. O repositório de referência cobrava isso sem mostrar.

O primeiro teste existe desde hoje: `testes/isolamento.test.js`. Ele entra pela porta do gateway, como quem usa o produto, e por isso só roda com o sistema inteiro no ar.

## Decisão

A suíte roda a cada push, em qualquer branch, numa máquina limpa do GitHub Actions, que sobe o produto inteiro com o Docker Compose, roda os testes e não publica nada.

## Alternativas descartadas

- **Rodar só na máquina de quem programa.** Não depende de serviço nenhum. Mas depende de alguém lembrar de rodar, e a máquina de quem programa nunca está limpa: um banco com dados velhos esconde defeito. Descartada.
- **Rodar no pipeline sem subir o sistema,** só com testes de unidade. Termina em segundos. Mas o isolamento mora em duas camadas, o código e o banco (ADR 002), e teste de unidade não alcança o banco. Descartada como única suíte; os testes de unidade entram depois, ao lado deste (`../plano-de-testes.md`).
- **Publicar a cada push,** além de testar. É o passo seguinte de um pipeline. Mas não há para onde publicar: o ambiente é o Docker Compose local (ADR 009). Descartada.
- **Rodar só no ramo principal.** Menos execuções. Mas o defeito só apareceria depois de entrar no tronco, quando o conserto é mais caro. Descartada.
- **Impedir o merge quando o pipeline está vermelho.** É a proteção de branch do GitHub. Ela faz o pipeline barrar, e não só avisar. Não foi configurada: pede decisão de quem administra o repositório. Fica como próximo passo.

## Consequências

- **Melhora:** o isolamento passa a ser conferido em todo push, sem depender de memória. Um ✓ ou um ✗ aparece ao lado de cada commit.
- **Melhora:** a máquina limpa sobe tudo do zero. Se o `compose.yaml` ou o `init.sql` quebrarem, o pipeline acusa, mesmo que os testes estejam certos.
- **Melhora, medida em 12/11:** o resultado sai cerca de 27 segundos depois do push.
- **Melhora, demonstrada em 12/11:** na branch `demo/isolamento-quebrado`, que não entra no tronco, o pipeline ficou vermelho com a mensagem "VAZAMENTO: Buricá viu a entrega 3, que é da Alvorada". O registro está em `../evidencias/pipeline-vermelho-2026-11-12.md`.
- **O que a mesma branch mostrou sobre o ADR 002:** com só o filtro do código removido, a suíte continuou verde, porque a política por linha do banco segurou. Só com as duas camadas fora ela ficou vermelha. As duas camadas funcionam; e este teste, sozinho, não diz qual delas segurou.
- **Piora:** o vermelho avisa, não impede. Um push vermelho entra no repositório do mesmo jeito, e um merge vermelho também. Impedir exige a proteção de branch, que não foi configurada.
- **Piora:** o verde vale pelo que está escrito. No dia desta decisão era um teste, da leitura de entregas, em duas direções (o que existe hoje está em `../plano-de-testes.md`). Ele não cobre a lista de cotas, o relatório, a escrita em nome de outra cooperativa, a taxa, o evento, o cabeçalho forjado nem cada camada em separado. Um vazamento em qualquer um desses passa verde.
- **Piora:** o pipeline depende de um serviço de fora. Se o GitHub Actions estiver fora do ar, ninguém fica sabendo se o push quebrou algo.
- **Piora:** o pipeline roda no push para este repositório. Uma proposta vinda de uma cópia (fork) roda na cópia, se o dono dela ligar o Actions; aqui ela chega sem ✓ nem ✗.
- **Piora:** rodar a suíte na própria máquina pede o Node 22, ou o comando mais longo que a roda por dentro do Compose (`README.md` da raiz).
- **Piora:** o arquivo do pipeline aponta para a versão 4 de duas ações do GitHub. A execução de 12/11 já traz um aviso: essas ações foram feitas para o Node 20, que saiu de linha, e estão sendo forçadas a rodar no Node 24. O arquivo precisa de manutenção.

**Histórico:** 13/11/2026: a consequência "o verde vale pelo que está escrito" passou a apontar para o plano de testes, porque a suíte ganhou testes de unidade e de integração. A decisão não mudou.
