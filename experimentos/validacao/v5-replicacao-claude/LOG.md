# Log de sessões: experimentos/validacao/v5-replicacao-claude

Gerado por `npm run relatorio` em 2026-09-27T19:15:14.588Z.


## porto-das-brumas_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 601 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2194 s (109.7 s/dia) |
| chamadas | 32 (erros de provedor: 0) |
| falha de estrutura | 0/32 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/12 |
| tokens entrada / saída | 131870 / 144956 |
| custo | US$ 2.9653 |
| eventos / relatos | 120 / 61 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 4 3 3 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.908 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 229 / 229 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 1 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 229 / 15 / 5 / 16 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.14 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 7 (por `D7.bras`, `D7.iracema`, `D7.nuno`, `D7.tomas`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.lia`, `D3.odete`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.bras` no dia 4 (por `D4.bras`, `D4.nuno`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.bras` no dia 6 (por `D6.tomas`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D17.tomas` → `D18.tomas` (117 | 3); `D2.lia` → `D3.lia` (3 | 117); `D3.tomas` → `D4.tomas` (3 | 117); `D4.tomas` → `D5.tomas` (4 | 116); `D5.tomas` → `D6.tomas` (5 | 115)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 6): Odete deixa o Mercado e vai aos Armazéns da Ponta. Bate à porta de Iracema com um sorriso calculado e uma proposta de compra pelo armazém — propositalmente abaixo do valor real.
- `D1.bras` (alfandega, tensão 5): Brás percorre os registros da alfândega com ar indiferente, mas os olhos seguem cada passo do novo fiscal. Manda um guarda discreto averiguar nos armazéns a procedência e os contactos de Nuno.
- `D1.lia` (taverna, tensão 5): Lia manda um garoto de recados ao Mercado do Sal com um bilhete sem assinatura para Odete: 'A Névoa não esquece o que é devido. O prazo acabou.' Depois espera, jogando dados sozinha.
- `D1.tomas` (capela, tensão 4): Tomás celebra a missa da manhã com poucos presentes e recolhe moedas magras no prato. Ao fim, senta nos degraus de fora a olhar para o cais, pesando em silêncio o que sabe sobre a noite em que Vasco morreu.
- `D1.iracema` (armazens, tensão 7): Iracema vasculha caixotes e tábuas do armazém em busca dos papéis que o marido dizia guardar. As mãos tremem entre a madeira velha, mas os olhos estão secos e determinados.
- `D1.nuno` (cais, tensão 3): Nuno aborda um velho estivador no cais com um copo de vinho de oferta. Faz perguntas leves sobre o movimento recente dos navios, à espera que alguém diga mais do que deveria.
- `D2.odete` (armazens, tensão 7, causado por D1.iracema, D1.odete): Odete reaparece no armazém mais cedo do que o esperado. Ao ver Iracema ainda vasculhando caixotes, força um tom de urgência: 'Outros já perguntaram por este lugar, Iracema. Minha oferta é a mais segura — mas não espero p…
- `D2.bras` (alfandega, tensão 6, causado por D1.bras): O guarda enviado na véspera volta com um nome e uma cidade: Nuno veio da capital, sem ligações conhecidas no porto. Brás dobra o papel, guarda no bolso e manda o guarda não comentar com ninguém — depois senta à mesa fing…

**Últimos eventos**

- `D20.nuno` (armazens, tensão 8, causado por D19.iracema, D19.nuno): Gesticula para Iracema avançar e aponta para um canto afastado do galpão. Estende a mão para o papel dobrado sem dizer uma palavra — o nome nessa folha pode ligar tudo o que os livros não dizem.
- `D20.iracema` (armazens, tensão 9, causado por D19.iracema, D18.iracema, D19.nuno): Segue Nuno para o canto que ele indica e desdobra o papel com mãos firmes. Aponta o nome escrito sem hesitar. 'Este homem era sócio secreto do meu marido e estava presente na noite em que ele morreu.' Não treme.
- `D20.bras` (armazens, tensão 9, causado por D19.bras, D19.nuno): Quando Nuno vira as costas, Brás avança um passo e fala alto o suficiente para ser ouvido: 'Fiscal — o que sei sobre quem altera os livros não está nesses volumes. Ouve-me antes da viúva.' Aposta na última carta que lhe …
- `D20.lia` (armazens, tensão 8, causado por D18.odete, D19.lia, D19.odete): Desloca-se até Odete e fala baixo: 'Vi o que escreveste ontem. A Irmandade sabe o valor do teu acordo com o fiscal. Não escapes por cima de nós — ou a dívida deixa de ser só dinheiro.' Afasta-se antes de ser ouvida por N…
- `D20.odete` (armazens, tensão 10, causado por D19.odete, D19.lia, D18.odete): Ouve Lia e sente o chão mover-se sob os pés. Mantém a expressão fechada, mas os dedos apertam o casaco por dentro. Olha para Nuno no canto com Iracema e calcula se o acordo ainda vale — ou se precisa de mudar o que vai d…
- `D20.tomas` (armazens, tensão 7, causado por D19.tomas): Permanece sentado, breviário fechado nos joelhos. Quando os outros se agitam e falam alto, não se move. Aguarda a sua vez com a serenidade de quem já tomou a decisão. Desta vez dirá o nome completo — sem rodeios.

**Relatos: evento real × versão contada**

- dia 2, bras → nuno, sobre `D1.bras`
  - real: Brás percorre os registros da alfândega com ar indiferente, mas os olhos seguem cada passo do novo fiscal. Manda um guarda discreto averiguar nos armazéns a procedência e os contactos de Nuno.
  - contado: Movimento normal esta semana, fiscal. Dois carregamentos de sal do norte, barco de sardinha. Os livros estão em ordem — confira quando quiser. Porto das Brumas tem seus costumes, mas nada escapa à minha guarda. Vinte ano…
- dia 2, iracema → lia, sobre `D1.iracema`
  - real: Iracema vasculha caixotes e tábuas do armazém em busca dos papéis que o marido dizia guardar. As mãos tremem entre a madeira velha, mas os olhos estão secos e determinados.
  - contado: Estive no armazém hoje cedo. O Manel me disse uma vez, quando bebeu mais do que devia, que guardava papéis lá. Vasculhei tudo que pude, Lia — mas alguém passou antes de mim. Caixotes revirados, tábuas soltas. A Guilda? N…
- dia 2, lia → odete, sobre `D1.lia`
  - real: Lia manda um garoto de recados ao Mercado do Sal com um bilhete sem assinatura para Odete: 'A Névoa não esquece o que é devido. O prazo acabou.' Depois espera, jogando dados sozinha.
  - contado: Mandei recado ao Mercado do Sal hoje. Sem nome, mas você sabe de quem vem, Odete. O chefe adoece, mas a Névoa não. Vi que o prazo passou. Vi que você ainda está em Porto das Brumas, o que é sábio. O que prefiro não ver é…
- dia 2, nuno → bras, sobre `D1.nuno`
  - real: Nuno aborda um velho estivador no cais com um copo de vinho de oferta. Faz perguntas leves sobre o movimento recente dos navios, à espera que alguém diga mais do que deveria.
  - contado: Vi estivadores na madrugada descarregando cargueiro sem registro no livro de saída. O encarregado disse que foi atraso de anotação. Pode ser, capitão. Mas havia rasura recente num dos livros. Não acuso ninguém — só anoto…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r02

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 602 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2410 s (120.5 s/dia) |
| chamadas | 33 (erros de provedor: 0) |
| falha de estrutura | 0/33 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/13 |
| tokens entrada / saída | 128794 / 156970 |
| custo | US$ 3.1270 |
| eventos / relatos | 120 / 47 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 3 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.842 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 221 / 221 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 4 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 221 / 8 / 0 / 8 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.06 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 7 (por `D7.bras`, `D7.nuno`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 4 (por `D4.iracema`, `D4.lia`, `D4.odete`, `D4.tomas`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.bras` no dia 3 (por `D3.nuno`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.tomas`)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 7): Odete deixa o mercado e vai até os Armazéns da Ponta. Encontra Iracema entre as caixas do falecido marido e, com voz de condolências, propõe comprar o armazém por um preço que sabe ser muito abaixo do valor real.
- `D1.bras` (alfandega, tensão 7): Brás circula pela alfândega com ar de rotina, mas não tira os olhos de Nuno. Convida o novo fiscal para um café e faz perguntas casuais sobre sua origem e missão, tentando medir o quanto ele sabe.
- `D1.lia` (taverna, tensão 5): Lia chama um informante de confiança no quarto dos fundos da taverna e ordena que vigie Odete Marinho. Está certa de que a mercadora vai tentar sumir antes de pagar a dívida à Irmandade.
- `D1.tomas` (capela, tensão 4): Tomás acende velas e recebe os fiéis da manhã, recolhendo moedas para o telhado com um sorriso cansado. Por dentro, o peso do que sabe sobre a morte de Vasco não o deixa em paz.
- `D1.iracema` (armazens, tensão 8): Iracema vasculha caixotes e prateleiras empoeiradas no armazém do marido. Procura os papéis que acredita existirem, sobressaltando-se a cada barulho lá fora, sozinha entre o cheiro de sal e madeira velha.
- `D1.nuno` (cais, tensão 5): Nuno conversa com estivadores no cais, fingindo checar manifestos de carga. Escuta com atenção qualquer menção a cargas sem registro, tentando puxar o fio que explica as contas tortas da alfândega.
- `D2.odete` (armazens, tensão 7, causado por D1.odete, D1.iracema): Odete retorna ao armazém com uma proposta escrita, tentando pressionar Iracema a assinar antes do fim do dia. Invoca urgências de inventário e dívidas do falecido, fingindo fazer um favor à viúva.
- `D2.bras` (alfandega, tensão 6, causado por D1.bras): Brás convoca um subordinado de confiança e ordena, em voz baixa, que vasculhe os registros de viagem e credenciais de Nuno Calado. Quer saber quem o enviou antes que o fiscal cave fundo demais.

**Últimos eventos**

- `D20.odete` (armazens, tensão 8, causado por D19.lia, D19.iracema): Odete dá um passo à frente e coloca-se entre Lia e Iracema, falando baixo: 'Eu pago o que a Irmandade diz que você deve. Tudo. Agora. Em troca do armazém e dos papéis que ainda restam.' Não tira os olhos da viúva.
- `D20.bras` (taverna, tensão 9, causado por D19.nuno): Brás lê o documento devagar, dobra-o e devolve sem comentar o conteúdo. Diz com voz travada: 'Fui cooperativo com a capital até hoje.' Os olhos desviam para Tomás atrás de Nuno — calcula quanto o fiscal já sabe.
- `D20.lia` (armazens, tensão 8, causado por D19.iracema, D19.odete): Lia ignora Odete e fala direto a Iracema, quase sem voz: 'Esse homem morreu três dias antes do seu marido. Quem matou um matou o outro. Diga-me onde estão os papéis e entrego o nome a quem pode prender quem fez isso.'
- `D20.tomas` (taverna, tensão 9, causado por D19.nuno, D19.bras): Com Brás imobilizado pelo documento, Tomás levanta devagar e vira o corpo para Nuno. Diz quase sem mover os lábios: 'Senhor fiscal. Tenho algo que o capitão não pode saber que existe. Posso falar com o senhor a sós?'
- `D20.iracema` (armazens, tensão 8, causado por D19.lia, D19.odete): Iracema vira as costas para as duas e caminha para o fundo do galpão. Diz por cima do ombro: 'Esperem aqui.' Vai até a parede onde o marido escondia coisas e começa a apalpar as tábuas.
- `D20.nuno` (taverna, tensão 10, causado por D19.bras, D19.nuno): Nuno não recua. Fala em voz baixa e sem hesitar: 'Capitão, há irregularidades nos livros da alfândega há dois anos. Coopere agora e o inquérito fica discreto. Resista e o relatório completo parte para a capital ainda est…

**Relatos: evento real × versão contada**

- dia 2, bras → nuno, sobre `D1.bras`
  - real: Brás circula pela alfândega com ar de rotina, mas não tira os olhos de Nuno. Convida o novo fiscal para um café e faz perguntas casuais sobre sua origem e missão, tentando medir o quanto ele sabe.
  - contado: Novo por aqui, não é? Vi que o senhor andou pela alfândega de manhãzinha. Bom hábito, é preciso conhecer a casa. Tomamos um café? Esta cidade tem suas peculiaridades — é bom saber com quem se conta. Quanto tempo ficará, …
- dia 2, iracema → tomas, sobre `D1.odete`
  - real: Odete deixa o mercado e vai até os Armazéns da Ponta. Encontra Iracema entre as caixas do falecido marido e, com voz de condolências, propõe comprar o armazém por um preço que sabe ser muito abaixo do valor real.
  - contado: Pai Tomás, a Odete Marinho foi ao armazém hoje. Chegou com voz de pesar e saiu querendo comprar tudo por nada. O Manuel tinha algo guardado lá, estou certa disso. E ela sabe. Por que mais ofereceria tão pouco, com tanta …
- dia 2, nuno → bras, sobre `D1.nuno`
  - real: Nuno conversa com estivadores no cais, fingindo checar manifestos de carga. Escuta com atenção qualquer menção a cargas sem registro, tentando puxar o fio que explica as contas tortas da alfândega.
  - contado: Rotina, capitão. Havia divergência em uns manifestos de ontem, fui checar com os estivadores. Porto agitado, este. Muita gente, difícil manter tudo em ordem. Mas nada de grave, pode ficar sossegado. Só quero entender com…
- dia 2, odete → tomas, sobre `D1.iracema`
  - real: Iracema vasculha caixotes e prateleiras empoeiradas no armazém do marido. Procura os papéis que acredita existirem, sobressaltando-se a cada barulho lá fora, sozinha entre o cheiro de sal e madeira velha.
  - contado: A viúva do Vasco está revirando o armazém feito desesperada. Ofereci comprar o lugar, fazer um favor à pobre mulher — aquilo só vai dar despesa pra ela. Hesitou, mas vai ceder. Não tem como segurar aquilo sozinha. Deixei…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r03

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 603 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2219 s (111.0 s/dia) |
| chamadas | 37 (erros de provedor: 0) |
| falha de estrutura | 0/37 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/17 |
| tokens entrada / saída | 138217 / 143485 |
| custo | US$ 2.9698 |
| eventos / relatos | 120 / 49 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 1 1 1 |
| razão de amarração final | 1.717 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 206 / 206 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 206 / 9 / 3 / 10 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.12 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 18 (por `D18.bras`, `D18.nuno`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.lia`, `D3.odete`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.bras` no dia 3 (por `D3.bras`, `D3.nuno`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.iracema`, `D3.odete`, `D3.tomas`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D15.lia` → `D16.lia` (115 | 5); `D16.lia` → `D17.lia` (116 | 4); `D17.lia` → `D18.lia` (117 | 3)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 6): Deixa o Mercado do Sal e segue apressada aos Armazéns da Ponta. Pretende abordar Iracema ainda hoje com uma oferta pelo armazém, apostando que a viúva, ainda de luto, aceitará bem menos do que o imóvel vale.
- `D1.bras` (alfandega, tensão 5): Manda revirar um lote de especiarias recém-chegado, fazendo questão de ser visto a trabalhar. Discretamente, pede ao escrivão que lhe informe quem acompanhou o novo fiscal desde que ele chegou ao porto.
- `D1.lia` (taverna, tensão 4): Chama um dos seus ao quarto nos fundos da taverna e instrui-o a seguir Odete ao longo do dia. Qualquer sinal de que ela está a mover bens ou a preparar fuga deve ser relatado de imediato — a dívida não vai ser esquecida.
- `D1.tomas` (capela, tensão 7): Recolhe esmolas e varre o altar em silêncio. Enquanto trabalha, o rosto de quem viu sair do armazém de Vasco naquela noite volta-lhe à memória, e ele hesita entre o que é certo fazer e o que é mais seguro para si.
- `D1.iracema` (armazens, tensão 6): Com as portas do armazém fechadas, começa a revirar caixas e tábuas soltas à procura dos papéis que acredita estarem escondidos. Trabalha sozinha e em silêncio, sem querer testemunhas antes de saber o que vai encontrar.
- `D1.nuno` (cais, tensão 3): Circula pelo Cais Velho com ar despreocupado, fingindo inspecionar o registro de um barco de pesca. Aproveita para puxar conversa com um estivador mais velho, perguntando com jeito sobre quem manda nas descargas noturnas…
- `D2.odete` (armazens, tensão 7, causado por D1.odete, D1.iracema): Bate à porta do armazém e entra fingindo consternação pela morte de Vasco. Apresenta a Iracema uma oferta em moedas sonantes, calculadamente abaixo do valor real, apostando que a viúva aceitará por necessidade imediata.
- `D2.bras` (alfandega, tensão 7, causado por D1.bras): Informado pelo escrivão de que o fiscal andou a fazer perguntas no cais, instala-se na sala dos livros antes que Nuno apareça, pronto para escoltá-lo pessoalmente e garantir que só veja o que convém.

**Últimos eventos**

- `D20.odete` (alfandega, tensão 8, causado por D19.bras, D19.odete): Retira da bolsa uma segunda moeda e diz friamente: 'Há alguém no cais que pode ocupar o fiscal o dia inteiro com uma queixa de contrabando falsa. O senhor só precisa me dar o documento antes do meio-dia.'
- `D20.bras` (alfandega, tensão 7, causado por D19.odete, D19.bras, D19.nuno): Chama o guarda da porta em voz baixa: 'Manda o fiscal Calado inspecionar os armazéns sul — agora.' Fecha a porta e olha para a bolsa de Odete pela primeira vez com real interesse.
- `D20.lia` (taverna, tensão 7, causado por D19.lia): Escreve um bilhete sem assinatura e manda pelo tenente à alfândega: 'A névoa viu tudo. A dívida vence ao anoitecer.' Fecha os dedos sobre a mesa e espera que o medo faça o trabalho por ela.
- `D20.tomas` (armazens, tensão 9, causado por D19.tomas, D19.iracema): Fecha a porta devagar, respira fundo e diz o nome em voz baixa — o de quem estava no armazém na noite em que Vasco morreu. Sente as pernas afrouxarem enquanto fala, como se o segredo pesasse mais vivo do que guardado.
- `D20.iracema` (armazens, tensão 9, causado por D19.tomas, D18.iracema): Fica imóvel por um instante longo. Aperta o embrulho de couro contra o peito e pergunta com voz rouca: 'Alguém mais sabe esse nome?' Os papéis do marido ganham outro peso — ela começa a entender o perigo em que está.
- `D20.nuno` (alfandega, tensão 7, causado por D19.nuno): Sobe à alfândega com os dois nomes gravados na memória. Quer cruzar os registros antes que qualquer coisa desapareça — se as lacunas batem, tem o suficiente para o relatório que a capital espera.

**Relatos: evento real × versão contada**

- dia 2, bras → nuno, sobre `D1.bras`
  - real: Manda revirar um lote de especiarias recém-chegado, fazendo questão de ser visto a trabalhar. Discretamente, pede ao escrivão que lhe informe quem acompanhou o novo fiscal desde que ele chegou ao porto.
  - contado: O senhor chegou num momento movimentado, fiscal. Mandei revirar o lote de especiarias, tudo dentro da lei — gosto de transparência. Diga-me, fez a viagem só desde a capital? É que este porto tem gente curiosa, e convém s…
- dia 2, iracema → tomas, sobre `D1.odete`
  - real: Deixa o Mercado do Sal e segue apressada aos Armazéns da Ponta. Pretende abordar Iracema ainda hoje com uma oferta pelo armazém, apostando que a viúva, ainda de luto, aceitará bem menos do que o imóvel vale.
  - contado: Mal cheguei ao armazém, uma mulher do Mercado do Sal apareceu às pressas com uma oferta pelo lugar. Nem esperou o luto arrefecer. A Guilda nunca foi amiga da família — e aquela pressa me diz que há algo ali dentro que el…
- dia 2, nuno → bras, sobre `D1.nuno`
  - real: Circula pelo Cais Velho com ar despreocupado, fingindo inspecionar o registro de um barco de pesca. Aproveita para puxar conversa com um estivador mais velho, perguntando com jeito sobre quem manda nas descargas noturnas…
  - contado: Passei a manhã pelo Cais Velho — registros de pesca, rotina, capitão. Conversei com um estivador mais velho, Bento, acho. Perguntei sobre as descargas e ele disse que à noite o cais é outro mundo. Nada de concreto. O por…
- dia 2, odete → tomas, sobre `D1.odete`
  - real: Deixa o Mercado do Sal e segue apressada aos Armazéns da Ponta. Pretende abordar Iracema ainda hoje com uma oferta pelo armazém, apostando que a viúva, ainda de luto, aceitará bem menos do que o imóvel vale.
  - contado: Fui aos Armazéns da Ponta falar com a viúva. Levei uma oferta justa pelo lugar — ela está sozinha, ainda em luto. Seria um alívio pra ela, Tomás. Quis ser a primeira, antes que outros apareçam com propostas piores. É neg…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r01

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 601 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1414 s (70.7 s/dia) |
| chamadas | 35 (erros de provedor: 0) |
| falha de estrutura | 0/35 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/15 |
| tokens entrada / saída | 199206 / 123833 |
| custo | US$ 1.9404 |
| eventos / relatos | 120 / 58 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 3 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.708 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 205 / 205 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 6 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 205 / 5 / 0 / 7 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.13 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 5 (por `D5.bras`, `D5.lia`, `D5.nuno`, `D5.odete`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.bras` no dia 3 (por `D3.bras`, `D3.lia`, `D3.nuno`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.bras` no dia 3 (por `D3.bras`, `D3.nuno`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.odete` no dia 4 (por `D4.iracema`, `D4.odete`, `D4.tomas`)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 6): Odete visita Iracema nos Armazéns da Ponta sob pretexto de pêsames, mas sonda o valor real do armazém e insinua uma oferta baixa pela propriedade.
- `D1.bras` (alfandega, tensão 7): Brás revisa os livros de entrada da alfândega e apaga sutilmente indícios de cargas que deixou passar sem inspeção, receoso do novo fiscal vindo da capital.
- `D1.lia` (taverna, tensão 5): Lia espalha entre marinheiros o rumor de que Odete está com a dívida atrasada, medindo quem na Irmandade se agita, e prepara um bilhete anônimo para o capitão Brás.
- `D1.tomas` (capela, tensão 4): Tomás reza pelos que estão no mar e recolhe doações para as viúvas, guardando em silêncio o nome de quem viu no armazém de Vasco na noite de sua morte.
- `D1.iracema` (armazens, tensão 5): Iracema vasculha caixas e prateleiras à procura dos papéis que o marido escondia, temendo ser interrompida por algum mercador da Guilda.
- `D1.nuno` (cais, tensão 6): Nuno interroga discretamente estivadores no Cais Velho sobre cargas recentes, buscando pistas de quem altera os livros da alfândega.
- `D2.odete` (armazens, tensão 7, causado por D1.odete, D1.iracema): Odete volta aos Armazéns e oferece a Iracema um pagamento rápido em espécie pelo armazém, insistindo que decidir logo evitaria 'complicações com outros mercadores'.
- `D2.bras` (alfandega, tensão 6, causado por D1.bras): Brás reescreve mais páginas do livro de entradas e prepara uma versão 'limpa' para mostrar ao fiscal recém-chegado, temendo que suas trapaças sejam descobertas.

**Últimos eventos**

- `D20.odete` (alfandega, tensão 7, causado por D19.bras, D19.odete): Odete puxa Brás para um canto e oferece-lhe uma bolsa de moedas para que lhe entregue os papéis achados com Iracema e apresse a venda do armazém antes que a viúva perceba seu valor.
- `D20.bras` (alfandega, tensão 8, causado por D19.bras, D19.nuno): Brás encara Nuno e exige saber por que remexe os livros oficiais, insinuando que sabe de quem ele recebe ordens, enquanto esconde que já decidiu a quem vender os papéis de Iracema.
- `D20.lia` (taverna, tensão 6, causado por D18.lia, D19.lia): Lia diz aos apoiadores reunidos que a dívida atrasada de Odete prova a fraqueza da Guilda e anuncia que, com o chefe doente, é hora de a Irmandade ter um comando mais firme.
- `D20.tomas` (alfandega, tensão 9, causado por D19.tomas, D19.nuno): Tomás grita da cela apontando para Nuno, nomeando Odete e insinuando que Brás protege quem matou Vasco, na esperança de que o fiscal finalmente aja diante de todos.
- `D20.iracema` (alfandega, tensão 8, causado por D19.iracema, D19.bras): Enquanto Brás e Nuno discutem, Iracema recupera os papéis escondidos atrás da pilha de livros e os esconde de novo sob o xale, atenta a qualquer chance de fugir com eles.
- `D20.nuno` (alfandega, tensão 8, causado por D19.nuno, D19.tomas): Nuno finge organizar papéis rotineiros diante de Brás, mas aproveita os gritos de Tomás para anotar em segredo mais uma prova de que o próprio capitão altera os livros da alfândega.

**Relatos: evento real × versão contada**

- dia 2, bras → lia, sobre `D1.bras`
  - real: Brás revisa os livros de entrada da alfândega e apaga sutilmente indícios de cargas que deixou passar sem inspeção, receoso do novo fiscal vindo da capital.
  - contado: Brás avisa Lia que um novo fiscal da capital chegou para vigiá-lo, e pede que a Irmandade tenha cuidado nos próximos embarques, pois está revisando os livros da alfândega para que nada pareça suspeito aos olhos de fora.
- dia 2, lia → nuno, sobre `D1.lia`
  - real: Lia espalha entre marinheiros o rumor de que Odete está com a dívida atrasada, medindo quem na Irmandade se agita, e prepara um bilhete anônimo para o capitão Brás.
  - contado: Lia comenta com Nuno, como quem só repassa boato do cais, que Odete anda atrasada numa dívida grave e pode tentar fugir do porto, sugerindo que a guarda vigie os Armazéns da Ponta nos próximos dias.
- dia 2, nuno → lia, sobre `D1.nuno`
  - real: Nuno interroga discretamente estivadores no Cais Velho sobre cargas recentes, buscando pistas de quem altera os livros da alfândega.
  - contado: Nuno diz a Lia que anda perguntando aos estivadores do Cais Velho sobre as cargas recentes, pois desconfia que alguém dentro da alfândega esteja adulterando os livros de entrada, e pede que ela fique atenta a boatos.
- dia 2, odete → tomas, sobre `D1.odete`
  - real: Odete visita Iracema nos Armazéns da Ponta sob pretexto de pêsames, mas sonda o valor real do armazém e insinua uma oferta baixa pela propriedade.
  - contado: Odete conta a Tomás que foi consolar Iracema nos Armazéns da Ponta, e de passagem ajudou a viúva a entender o valor do lugar, oferecendo-se, por bondade, para cuidar dos arranjos de uma possível venda.

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r02

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 602 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1236 s (61.8 s/dia) |
| chamadas | 35 (erros de provedor: 0) |
| falha de estrutura | 0/35 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/15 |
| tokens entrada / saída | 215658 / 107290 |
| custo | US$ 1.7803 |
| eventos / relatos | 120 / 61 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.717 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 206 / 206 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 206 / 9 / 0 / 9 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.09 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.bras`, `D3.nuno`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.lia`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.bras`, `D3.nuno`, `D3.odete`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.iracema`, `D3.lia`, `D3.tomas`)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 4): Odete vai aos Armazéns da Ponta conversar com Iracema, oferecendo comprar o armazém de Vasco por um preço bem abaixo do valor real, alegando estar fazendo um favor à viúva.
- `D1.bras` (alfandega, tensão 5): Brás revisa os livros de entrada da alfândega diante do novo fiscal, corrigindo pequenos detalhes para parecer irrepreensível e evitar suspeitas.
- `D1.lia` (taverna, tensão 6): Lia leva um contato da guarda ao quarto dos fundos da taverna e sussurra o nome de um rival dentro da Irmandade, plantando dúvidas sobre sua lealdade.
- `D1.tomas` (capela, tensão 5): Tomás acende velas pelos mortos no mar, mas observa em silêncio quem se aproxima da capela, guardando para si o que sabe sobre a noite da morte de Vasco.
- `D1.iracema` (armazens, tensão 6): Iracema vasculha caixas e prateleiras do armazém atrás dos papéis que o marido pode ter escondido antes de morrer.
- `D1.nuno` (cais, tensão 5): Nuno puxa conversa com estivadores no Cais Velho, fingindo curiosidade casual enquanto tenta descobrir quem manipula os registros de carga.
- `D2.odete` (alfandega, tensão 7, causado por D1.odete): Odete vai à Casa da Alfândega e insinua a Brás que pode facilitar taxas e favores se ele agilizar o registro do armazém de Vasco em seu nome.
- `D2.bras` (alfandega, tensão 6, causado por D1.bras): Brás finge cordialidade com Odete mas observa de canto de olho o novo fiscal Nuno, tentando calcular o quanto ele já sabe.

**Últimos eventos**

- `D20.odete` (cais, tensão 8, causado por D19.lia, D19.iracema, D19.bras): Encurralada por Lia diante de testemunhas, Odete entrega parte do pagamento da dívida para ganhar tempo e volta a pressionar Iracema a assinar a venda do armazém ainda hoje.
- `D20.bras` (armazens, tensão 7, causado por D19.bras, D18.iracema): De posse do suborno de Odete, Brás deixa o Cais Velho e segue aos Armazéns da Ponta atrás de Nuno, decidido a arrancar dele os papéis que Iracema entregou.
- `D20.lia` (cais, tensão 6, causado por D19.lia, D19.odete): Lia aceita o pagamento parcial de Odete mas insinua diante dos presentes que a guarda saberá do resto da dívida se não for quitada até o anoitecer.
- `D20.tomas` (mercado, tensão 3, causado por D19.tomas): Tomás continua arrecadando moedas entre as barracas do mercado para o telhado da capela, atento aos rumores sobre a cobrança pública no cais.
- `D20.iracema` (armazens, tensão 8, causado por D19.bras, D19.odete): Temendo que Brás force Nuno a entregar os papéis, Iracema deixa o Cais Velho rumo aos Armazéns da Ponta para alertá-lo, recusando de vez a oferta de Odete.
- `D20.nuno` (armazens, tensão 7, causado por D19.nuno): Nuno enterra ainda mais os papéis de Iracema entre as cargas dos Armazéns da Ponta, fingindo rotina enquanto vigia sinais de passos vindos do cais.

**Relatos: evento real × versão contada**

- dia 2, bras → odete, sobre `D1.bras`
  - real: Brás revisa os livros de entrada da alfândega diante do novo fiscal, corrigindo pequenos detalhes para parecer irrepreensível e evitar suspeitas.
  - contado: Odete, o tal fiscal veio da capital de olho em mim, quer me pegar em erro. Por isso revisei os livros, deixei tudo em ordem diante dele. Fique tranquila, nada mudou entre nós, sigo cuidando dos navios como sempre.
- dia 2, iracema → tomas, sobre `D1.odete`
  - real: Odete vai aos Armazéns da Ponta conversar com Iracema, oferecendo comprar o armazém de Vasco por um preço bem abaixo do valor real, alegando estar fazendo um favor à viúva.
  - contado: Tomás, a Odete veio até o armazém me oferecer uma miséria pelo que era do meu marido, fingindo favor de viúva. Não confio nela nem na Guilda. Acho que ela quer é encontrar os papéis que Vasco escondeu lá dentro.
- dia 2, lia → iracema, sobre `D1.lia`
  - real: Lia leva um contato da guarda ao quarto dos fundos da taverna e sussurra o nome de um rival dentro da Irmandade, plantando dúvidas sobre sua lealdade.
  - contado: Iracema, ouvi dizer que o velho chefe da Irmandade anda doente, e há quem já queira o lugar dele. Fico de olho nos que puxam intrigas contra os fiéis. E a Odete... aposto que ela quer é sumir antes de pagar o que deve.
- dia 2, nuno → odete, sobre `D1.nuno`
  - real: Nuno puxa conversa com estivadores no Cais Velho, fingindo curiosidade casual enquanto tenta descobrir quem manipula os registros de carga.
  - contado: Odete, andei conversando com uns estivadores no Cais Velho, só por curiosidade mesmo. Parece que alguém anda mexendo nos livros de carga da alfândega. Estranho, não? Vale ficar de olho nisso.

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r03

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 603 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1192 s (59.6 s/dia) |
| chamadas | 36 (erros de provedor: 0) |
| falha de estrutura | 0/36 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/16 |
| tokens entrada / saída | 198298 / 104069 |
| custo | US$ 1.7334 |
| eventos / relatos | 120 / 70 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 3 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.783 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 214 / 214 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 214 / 15 / 3 / 16 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.06 / 0 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 7 (por `D7.bras`, `D7.nuno`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.lia`, `D3.odete`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.bras` no dia 3 (por `D3.bras`, `D3.nuno`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão
- `D1.tomas` (nasceu no dia 2): absorvida por `D1.odete` no dia 4 (por `D4.lia`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D11.bras` → `D12.bras` (117 | 3); `D17.tomas` → `D18.tomas` (117 | 3); `D3.tomas` → `D4.lia` (3 | 117)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 6): Odete deixa o mercado e vai até os Armazéns da Ponta oferecer à viúva Iracema uma quantia baixa pelo armazém de Vasco, insinuando que é um favor em tempos difíceis.
- `D1.bras` (alfandega, tensão 6): Brás tranca-se com os livros de entrada da alfândega, ajustando registros de cargas recentes antes que o novo fiscal possa examiná-los.
- `D1.lia` (taverna, tensão 5): Lia circula entre as mesas da taverna puxando conversa com marinheiros, buscando confirmar boatos sobre a saúde do velho chefe da Irmandade e sobre a dívida de Odete.
- `D1.tomas` (mercado, tensão 4): Tomás vai ao Mercado do Sal pedir doações para o telhado da capela, calando o que sabe sobre a noite da morte de Vasco enquanto observa quem se aproxima demais do assunto.
- `D1.iracema` (armazens, tensão 7): Iracema revira caixotes e prateleiras do armazém à procura dos papéis que acredita o marido ter escondido antes de morrer.
- `D1.nuno` (cais, tensão 5): Nuno aborda estivadores no Cais Velho com perguntas casuais sobre cargas recentes, tentando descobrir por que as contas da alfândega não fecham.
- `D2.odete` (armazens, tensão 7, causado por D1.odete, D1.iracema): Odete volta aos Armazéns da Ponta e pressiona Iracema a fechar a venda rapidamente, elevando um pouco a oferta mas insistindo que decida antes do fim do dia.
- `D2.bras` (cais, tensão 6, causado por D1.bras): Brás desce ao Cais Velho para observar de longe o novo fiscal Nuno, tentando avaliar o quanto ele já sabe antes de agir.

**Últimos eventos**

- `D20.odete` (taverna, tensão 8, causado por D19.lia, D19.odete, D19.bras): Fugindo do cerco de Nuno, Odete vai à Taverna do Arpão Torto tentar negociar em segredo o pagamento atrasado à Irmandade antes que Lia a exponha de vez.
- `D20.bras` (alfandega, tensão 8, causado por D19.nuno, D19.bras): Temendo o cerco de Nuno, Brás revira os livros de patrulha na Alfândega, apagando trechos que provariam seu trato com Odete antes de entregar qualquer registro.
- `D20.lia` (alfandega, tensão 6, causado por D19.lia, D19.nuno): Ainda detida, Lia oferece a Nuno provas do trato entre Brás e Odete em troca de sua soltura, consolidando-se como peça indispensável da investigação.
- `D20.tomas` (capela, tensão 7, causado por D19.tomas): Avisado pelo pescador de um homem estranho rondando a capela, Tomás tranca a porta e se esconde nos fundos, com medo de represália de Brás.
- `D20.iracema` (armazens, tensão 6, causado por D19.iracema): Sob uma tábua solta nos fundos do armazém, Iracema encontra um maço de papéis do marido com anotações de pagamentos suspeitos e os esconde no vestido, sem contar a ninguém.
- `D20.nuno` (alfandega, tensão 7, causado por D19.nuno, D19.bras): Nuno confronta Brás diretamente na Alfândega, exigindo os registros de patrulha e ameaçando levar o caso à capital se ele continuar protegendo Odete.

**Relatos: evento real × versão contada**

- dia 2, iracema → lia, sobre `D1.odete`
  - real: Odete deixa o mercado e vai até os Armazéns da Ponta oferecer à viúva Iracema uma quantia baixa pelo armazém de Vasco, insinuando que é um favor em tempos difíceis.
  - contado: Lia, vi com meus próprios olhos: Odete saiu do mercado direto pros Armazéns da Ponta, foi até mim oferecer uma ninharia pelo armazém do meu Vasco. Disse que era 'um favor', tempos difíceis... A Guilda nunca gostou de nós…
- dia 2, lia → iracema, sobre `D1.lia`
  - real: Lia circula entre as mesas da taverna puxando conversa com marinheiros, buscando confirmar boatos sobre a saúde do velho chefe da Irmandade e sobre a dívida de Odete.
  - contado: Iracema, andei pela taverna hoje, só ouvindo os marinheiros. Dizem que o velho chefe da Irmandade tá mal, quase não sai da cama. E essa dívida da Odete... aposto que ela vai tentar sumir antes de pagar. Fica de olho nela…
- dia 2, odete → lia, sobre `D1.iracema`
  - real: Iracema revira caixotes e prateleiras do armazém à procura dos papéis que acredita o marido ter escondido antes de morrer.
  - contado: Lia, fui até o armazém do falecido Vasco só de passagem e vi a Iracema lá dentro, feito louca, revirando caixote atrás de caixote, prateleira por prateleira. Parece que procura uns papéis que o marido escondeu. Coitada, …
- dia 3, bras → nuno, sobre `D2.bras`
  - real: Brás desce ao Cais Velho para observar de longe o novo fiscal Nuno, tentando avaliar o quanto ele já sabe antes de agir.
  - contado: Brás diz a Nuno: "Fiscal novo, vim só dar uma volta pelo Cais Velho, ver como as coisas andam por aqui. Não é nada contra o senhor, é rotina minha, sempre fiz assim. Imagino que ainda esteja se situando na função, não é?…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r01

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 601 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2578 s (128.9 s/dia) |
| chamadas | 37 (erros de provedor: 0) |
| falha de estrutura | 0/37 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/17 |
| tokens entrada / saída | 140164 / 164484 |
| custo | US$ 3.3079 |
| eventos / relatos | 120 / 76 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 6 5 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.900 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 228 / 228 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 6 / 0 / 5 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 228 / 11 / 2 / 13 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.08 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.anselmo`, `D4.benedita`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 5 (por `D5.anselmo`, `D5.benedita`, `D5.irma-clara`, `D5.rui`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.joaquim`, `D4.marta`)
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.anselmo`, `D3.marta`)
- `D1.rui` (nasceu no dia 2): absorvida por `D1.irma-clara` no dia 4 (por `D4.irma-clara`, `D4.rui`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D17.anselmo` → `D18.irma-clara` (117 | 3); `D3.irma-clara` → `D4.irma-clara` (3 | 117)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 4): Convoca os outros anciãos para uma reunião fechada, insistindo que é preciso uma palavra oficial antes que o pânico tome conta da aldeia. Declara, sem titubear, que são os lobos da montanha — e que cabe ao conselho decid…
- `D1.marta` (floresta, tensão 6): Ajoelha-se junto às carcaças e examina os ferimentos de perto, procurando marcas que não batem com dentes de lobo. Encontra um corte reto demais numa das gargantas e fica parada, olhando, sem tocar.
- `D1.irma-clara` (ermida, tensão 7): Sobe ao campanário e puxa a corda do sino com cuidado, apenas o bastante para fazê-lo soar pelo vale. Ouve um rangido diferente vindo do metal e solta a corda depressa, ficando imóvel até o eco sumir.
- `D1.joaquim` (moinho, tensão 7): Fecha as portas do moinho sob pretexto de vistoriar as mós. Leva pão seco e água ao forasteiro escondido no depósito dos fundos, sussurrando que precisa ficar quieto mais alguns dias — que a aldeia anda com os olhos aber…
- `D1.benedita` (praca, tensão 3): Fala em voz alta na praça para quem queira ouvir: a estrada está soterrada, mas a encosta norte tem trilha. Propõe montar um grupo ainda esta semana, antes da neve fechar tudo, e pede quem tem machado e corda disponíveis…
- `D1.rui` (praca, tensão 5): Fica perto de Benedita na praça, acenando com a cabeça enquanto ela fala da trilha, mas com o pensamento na figura que viu sair do moinho antes do amanhecer. Quando alguém olha para ele, sorri e desvia os olhos.
- `D2.anselmo` (praca, tensão 6, causado por D1.anselmo): Caminha até a praça e, postado junto ao poço, anuncia a decisão do conselho: são os lobos da montanha. Propõe rondas noturnas e pede que ninguém vá sozinho à floresta. Não deixa espaço para perguntas.
- `D2.marta` (praca, tensão 9, causado por D1.marta): Chega à praça ainda com o cheiro da floresta e interrompe Anselmo sem cerimônia: levanta a voz e diz que viu um corte reto demais num pescoço de ovelha — dente de lobo não deixa corte assim.

**Últimos eventos**

- `D20.anselmo` (moinho, tensão 10, causado por D19.anselmo, D19.marta, D19.joaquim, D19.benedita, D19.rui): Com a multidão dentro e a voz do forasteiro ainda no ar, baixa o cajado devagar. 'Vendi o grão antes do deslizamento — mas foi para garantir o transporte da aldeia. Se querem julgamento, que seja na Casa do Conselho, com…
- `D20.marta` (moinho, tensão 9, causado por D19.anselmo, D19.marta, D19.joaquim, D19.benedita): Deixa o braço cair e vira-se para os aldeões: 'Ouviram. Agora pergunto em nome de todos — quanto grão ficou, Anselmo? Conta certo, porque o inverno não aceita meias confissões.' Usa a multidão como testemunha e como pres…
- `D20.irma-clara` (praca, tensão 6, causado por D19.irma-clara): Desce a colina com o manto apertado ao corpo e para no meio da praça vazia. Ouve o rumor do moinho e ergue a voz para o caminho: 'O sino chamou. A ermida está aberta. Quando o julgamento acabar, subam — este vale precisa…
- `D20.joaquim` (moinho, tensão 7, causado por D19.joaquim, D19.benedita): Encosta-se ao forasteiro e fala-lhe baixo enquanto a multidão pressiona Anselmo: 'Disseste o que tinhas a dizer. Agora fica quieto e deixa-me à frente.' Interpõe o corpo entre o homem e os aldeões mais exaltados.
- `D20.benedita` (moinho, tensão 8, causado por D19.anselmo, D19.benedita, D19.rui): Quando Anselmo invoca a Casa do Conselho, vira-se para os aldeões que trouxe: 'Grão vendido, inverno a chegar, estrada fechada. Quem conhece a trilha da montanha? A confissão não nos aquece — precisamos de um plano hoje,…
- `D20.rui` (moinho, tensão 8, causado por D19.anselmo, D19.rui): Quando Anselmo invoca a 'lei da aldeia', Rui encontra os olhos dele e diz com voz que já não treme: 'Na Casa do Conselho a lei és tu. Aqui a lei somos todos.' Dois rapazes que ouviam da porta entram e ficam ao lado dele.

**Relatos: evento real × versão contada**

- dia 2, anselmo → irma-clara, sobre `D1.anselmo`
  - real: Convoca os outros anciãos para uma reunião fechada, insistindo que é preciso uma palavra oficial antes que o pânico tome conta da aldeia. Declara, sem titubear, que são os lobos da montanha — e que cabe ao conselho decid…
  - contado: É os lobos, irmã. Tenho visto isso antes — os sinais são claros. Mandei chamar os outros anciãos: não podemos deixar o povo tirar conclusões sozinho. Precisa de uma voz oficial, uma só. Marta já anda mexendo onde não dev…
- dia 2, irma-clara → marta, sobre `D1.irma-clara`
  - real: Sobe ao campanário e puxa a corda do sino com cuidado, apenas o bastante para fazê-lo soar pelo vale. Ouve um rangido diferente vindo do metal e solta a corda depressa, ficando imóvel até o eco sumir.
  - contado: Fui tocar o sino de manhã cedo, como faço quando algo pesa no ar. O vale ouviu. Mas o moleiro não apareceu — nunca vem à ermida, e nisso há razão. Essas mortes são aviso, Marta. Não de lobo, não de homem. De algo que esp…
- dia 2, marta → irma-clara, sobre `D1.marta`
  - real: Ajoelha-se junto às carcaças e examina os ferimentos de perto, procurando marcas que não batem com dentes de lobo. Encontra um corte reto demais numa das gargantas e fica parada, olhando, sem tocar.
  - contado: Irmã, vi de perto. Os ferimentos não batem com dente de lobo — tem uma garganta com corte reto, limpo demais. Lobo rasga, não corta assim. Perdi muitas ovelhas nesses ataques. Mais do que eu podia perder. E o ancião insi…
- dia 3, irma-clara → rui, sobre `D2.anselmo`
  - real: Caminha até a praça e, postado junto ao poço, anuncia a decisão do conselho: são os lobos da montanha. Propõe rondas noturnas e pede que ninguém vá sozinho à floresta. Não deixa espaço para perguntas.
  - contado: Vi o velho Conselho junto ao poço, Rui. Culparam os lobos, mandaram fazer rondas e não deixaram ninguém falar. Apressado demais. Quando a morte vem como aviso, não é pelo dente de lobo que Deus fala. E o moleiro nem apar…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r02

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 602 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2036 s (101.8 s/dia) |
| chamadas | 35 (erros de provedor: 0) |
| falha de estrutura | 0/35 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/15 |
| tokens entrada / saída | 128736 / 131324 |
| custo | US$ 2.7255 |
| eventos / relatos | 120 / 53 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 3 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.758 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 211 / 211 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 211 / 16 / 5 / 15 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.10 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.joaquim` no dia 3 (por `D3.benedita`, `D3.joaquim`, `D3.rui`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 7 (por `D7.anselmo`, `D7.benedita`, `D7.irma-clara`, `D7.joaquim`, `D7.marta`, `D7.rui`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.irma-clara` no dia 4 (por `D4.benedita`, `D4.joaquim`, `D4.rui`)
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.marta`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D14.irma-clara` → `D15.irma-clara` (114 | 6); `D15.irma-clara` → `D16.irma-clara` (115 | 5); `D16.irma-clara` → `D17.irma-clara` (116 | 4); `D17.irma-clara` → `D18.irma-clara` (117 | 3); `D3.irma-clara` → `D4.rui` (4 | 116)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 4): Anselmo convoca os demais anciãos para uma reunião informal, falando em voz alta sobre a volta dos lobos da montanha. Toma a cabeceira da mesa e não deixa pausa para que outros assumam a palavra.
- `D1.marta` (floresta, tensão 6): Marta se ajoelha ao lado de uma carcaça nova e examina as marcas no pescoço e no chão ao redor. Murmura para si mesma que dente de lobo não deixa esse tipo de corte.
- `D1.irma-clara` (ermida, tensão 5): Irmã Clara puxa a corda do sino com cuidado redobrado, segurando o balanço antes do pico, com medo de ouvir o tinido seco de metal partido. O toque sai fraco, mas chega ao vale.
- `D1.joaquim` (moinho, tensão 5): Joaquim mantém a mó girando e leva uma tigela de mingau ao forasteiro escondido no fundo do moinho, mandando-o ficar quieto enquanto ouve o sino da colina ao longe.
- `D1.benedita` (praca, tensão 4): Benedita gesticula ao redor do poço para quem quiser ouvir: o conselho vai debater enquanto o inverno chega. Afirma que viu rastros de botas nos pastos e que isso não tem nada de sobrenatural.
- `D1.rui` (praca, tensão 6): Rui fica na beirada do grupo que escuta Benedita, rindo quando os outros riem. Quando ela menciona rastros de botas, ele engole seco e desvia o olhar na direção do moinho.
- `D2.anselmo` (casa-conselho, tensão 4, causado por D1.anselmo): Anselmo dita a um escriba uma proclamação formal declarando ameaça de lobos e ordenando que nenhum aldeão se aproxime da orla sem escolta armada — sem consultar ninguém, tomando a decisão por conta própria.
- `D2.marta` (praca, tensão 7, causado por D1.marta): Marta abandona a floresta com as mãos ainda sujas de terra e vai à praça procurar Benedita, segurando no punho uma pena grande e escura colhida junto à última carcaça — não é de nenhum lobo.

**Últimos eventos**

- `D20.anselmo` (praca, tensão 9, causado por D19.benedita, D19.rui): Sai da Casa do Conselho com passos firmes ao ouvir os gritos da praça. Para no meio do largo e levanta a mão. 'Em nome do conselho, ninguém fala nem vai a lugar nenhum antes de mim.'
- `D20.marta` (praca, tensão 9, causado por D19.marta, D19.joaquim): Ouve o nome dito pelo forasteiro e solta o ar devagar. Agarra o xale e parte para a praça sem olhar para trás — o nome que ouviu já estava em sua boca há dias.
- `D20.irma-clara` (praca, tensão 6, causado por D19.irma-clara): Não intervém no confronto. Fica de lado, o rosário enrolado nos dedos, e para cada pessoa que olha para ela devolve uma só frase: 'A ermida está aberta. Ainda.'
- `D20.joaquim` (praca, tensão 9, causado por D19.joaquim, D19.anselmo): Tranca o moinho pela primeira vez em semanas. Vem atrás de Marta à praça com o forasteiro ao lado. Quando avista Anselmo no largo, para — e não desvia o olhar.
- `D20.benedita` (praca, tensão 9, causado por D19.benedita, D19.rui): Com as tiras de pano ainda na mão, recua um passo quando Anselmo chega. Mas não guarda o pano. Diz, clara e firme: 'Não, Ancião. Desta vez a praça ouve primeiro.'
- `D20.rui` (praca, tensão 8, causado por D19.rui, D19.benedita): Permanece na borda do poço, suando frio. Quando Anselmo chega e toma a palavra, Rui ergue os olhos e não os baixa — pela primeira vez desde que tem memória, não foge.

**Relatos: evento real × versão contada**

- dia 2, benedita → joaquim, sobre `D1.rui`
  - real: Rui fica na beirada do grupo que escuta Benedita, rindo quando os outros riem. Quando ela menciona rastros de botas, ele engole seco e desvia o olhar na direção do moinho.
  - contado: Chamei os homens e falei dos rastros de bota perto dos rebanhos mortos. O Rui ficou na beira rindo feito não fosse com ele — até eu mencionar os rastros. Aí engoliu seco e virou o olhar pro seu lado do vale. Pro seu lado…
- dia 2, irma-clara → marta, sobre `D1.irma-clara`
  - real: Irmã Clara puxa a corda do sino com cuidado redobrado, segurando o balanço antes do pico, com medo de ouvir o tinido seco de metal partido. O toque sai fraco, mas chega ao vale.
  - contado: Toquei o sino esta manhã. O chamado desceu pelo vale — quem tem ouvidos, ouve. Essas mortes são aviso, Marta, não acidente. E repara: o moleiro nunca sobe até a ermida. Faz quanto tempo? Quem tem a consciência em paz não…
- dia 2, joaquim → benedita, sobre `D1.joaquim`
  - real: Joaquim mantém a mó girando e leva uma tigela de mingau ao forasteiro escondido no fundo do moinho, mandando-o ficar quieto enquanto ouve o sino da colina ao longe.
  - contado: Estava na mó quando o sino tocou lá da colina. Parei um instante só pra ouvir. Sei que vão me olhar torto de qualquer jeito — sempre olharam. Mas estava trabalhando, como de costume. A farinha mal chega pro inverno e ago…
- dia 2, marta → irma-clara, sobre `D1.marta`
  - real: Marta se ajoelha ao lado de uma carcaça nova e examina as marcas no pescoço e no chão ao redor. Murmura para si mesma que dente de lobo não deixa esse tipo de corte.
  - contado: Fui cedo até a carcaça nova. Examinei o pescoço, as marcas no chão ao redor. Irmã Clara, não é lobo. Dente de lobo não deixa corte assim. Perdi ovelhas demais nessas semanas — arrancadas uma a uma desse jeito. Quem está …

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-4-6_informa_6ag_jog-nenhum_r03

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 603 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-4-6<br>relatos: claude-sonnet-4-6 |
| tempo total de chamadas | 2480 s (124.0 s/dia) |
| chamadas | 35 (erros de provedor: 0) |
| falha de estrutura | 0/35 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/15 |
| tokens entrada / saída | 133092 / 159580 |
| custo | US$ 3.1754 |
| eventos / relatos | 120 / 64 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 4 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.925 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 231 / 231 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 231 / 7 / 0 / 8 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.14 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.benedita`, `D4.irma-clara`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.anselmo`, `D4.benedita`, `D4.irma-clara`, `D4.joaquim`, `D4.rui`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.joaquim`)
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.marta`)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 3): Manda um menino chamar os outros anciãos e prepara o discurso que já ensaiou: os lobos voltaram das montanhas, é preciso organizar uma vigília armada. Mantém a fala firme para que ninguém pense em questionar sua lideranç…
- `D1.marta` (floresta, tensão 7): Ajoelha-se sobre a carcaça mais recente e examina as feridas com os dedos. Nenhuma marca de canino — os cortes são limpos demais. Levanta-se com a certeza de que o que matou o rebanho tem mãos.
- `D1.irma-clara` (ermida, tensão 6): Puxa a corda do sino para convocar a aldeia; o som que sai é rouco e curto. Ela solta a corda depressa, olha para cima com o coração apertado, e decide descer à praça para pregar de viva voz antes que o sino a traia.
- `D1.joaquim` (moinho, tensão 7): Leva um caldo ralo ao forasteiro escondido entre os sacos do depósito, verifica a janela antes de entrar. Em seguida, conta os sacos de farinha restantes pela terceira vez nesta semana, esperando que os números mudem.
- `D1.benedita` (praca, tensão 4): Cerca os homens ao redor do poço e aponta para os picos ainda sem neve: há tempo, mas pouco. Fala em abrir uma trilha de mulas pela encosta leste antes que o frio feche tudo. Pede quem a acompanha amanhã de madrugada.
- `D1.rui` (praca, tensão 5): Fica na borda do grupo em volta de Benedita, ouvindo sem realmente ouvir. Os olhos voltam sempre para o caminho do moinho. A figura que viu sair na madrugada não sai da cabeça — mas contar parece mais perigoso que calar.
- `D2.anselmo` (casa-conselho, tensão 6, causado por D1.anselmo): Reúne os anciãos na Casa do Conselho e expõe o plano da vigília armada, falando alto o suficiente para não deixar espaço a perguntas. Precisa que a decisão seja tomada antes que vozes discordantes apareçam.
- `D2.marta` (praca, tensão 7, causado por D1.marta): Sai da orla da floresta e vai direto à praça com o olhar de quem achou o que procurava. Conta ao primeiro que encontra: as feridas nos animais são cortes de faca, não marcas de dente. Quer que a notícia chegue aos ancião…

**Últimos eventos**

- `D20.anselmo` (moinho, tensão 9, causado por D19.anselmo, D19.marta, D19.joaquim): Entra pelo portão do moinho com os dois anciãos atrás, finca o cajado no chão de pedra e eleva a voz acima de todos: 'Por autoridade do conselho, este homem fala primeiro para mim. Afasta-te, Marta Pedregal.'
- `D20.marta` (moinho, tensão 9, causado por D19.marta, D19.benedita, D19.anselmo): Não recua quando Anselmo entra. Mantém-se de pé a um palmo de Davi e vira-se para o ancião com os olhos frios: 'Já sei que foram homens — faca, não garra. Queres ouvir isso em conselho fechado, ou preferes que eu grite d…
- `D20.irma-clara` (ermida, tensão 6, causado por D19.irma-clara): Solta a corda e corre os dedos pela fresta do sino — a rachadura alargou, o badalo soou rouco na última badalada. Ajoelha-se e reza, não por quem virá, mas para que o sino aguente até ser necessário outra vez.
- `D20.joaquim` (moinho, tensão 9, causado por D19.joaquim, D19.anselmo, D19.marta): Não sai do lugar entre Anselmo e Davi quando o ancião entra. Diz com voz seca, sem erguer os olhos: 'Ele conta o que viu — não o que o conselho quer ouvir. Deixa o homem falar.'
- `D20.benedita` (moinho, tensão 8, causado por D19.benedita, D19.anselmo): Quando Anselmo tenta tomar o lugar, abre a palma e corta o ar: 'Há rastros de botas nos pastos onde o gado morreu. O ferido tem marca de faca no ombro. Se há lobos neste vale, calçam botas como homens.'
- `D20.rui` (moinho, tensão 8, causado por D19.rui, D19.irma-clara): Ouve as três badaladas da ermida e para na soleira com a mão na maçaneta. Entra mesmo assim — mas hesita no meio da sala, e a culpa no rosto diz que há algo que só ele sabe e que não consegue guardar mais.

**Relatos: evento real × versão contada**

- dia 2, irma-clara → marta, sobre `D1.irma-clara`
  - real: Puxa a corda do sino para convocar a aldeia; o som que sai é rouco e curto. Ela solta a corda depressa, olha para cima com o coração apertado, e decide descer à praça para pregar de viva voz antes que o sino a traia.
  - contado: Puxei a corda esta manhã e o sino gemeu — um som abafado, como alerta de Deus. Desci logo à praça pra falar de viva voz antes que o aviso se perdesse. Reparou que o moleiro nunca pisa na ermida? Quem tem a consciência li…
- dia 2, marta → irma-clara, sobre `D1.marta`
  - real: Ajoelha-se sobre a carcaça mais recente e examina as feridas com os dedos. Nenhuma marca de canino — os cortes são limpos demais. Levanta-se com a certeza de que o que matou o rebanho tem mãos.
  - contado: Ajoelhei sobre a ovelha e passei os dedos nas feridas. Clara, não há marca de canino — os cortes são limpos, certeiros. Isso tem mão, não focinho. Perdi mais da metade do rebanho assim. E o ancião com o grão dele... algo…
- dia 2, rui → marta, sobre `D1.rui`
  - real: Fica na borda do grupo em volta de Benedita, ouvindo sem realmente ouvir. Os olhos voltam sempre para o caminho do moinho. A figura que viu sair na madrugada não sai da cabeça — mas contar parece mais perigoso que calar.
  - contado: Tava lá na roda da Benedita, mas juro que não ouvi nada — a cabeça tava no moinho. Aquela coisa que anda por lá não é gente de verdade, Marta. Eu vi... brilho, de madrugada. Só um brilho. A Irmã Clara sabe o que vem aí, …
- dia 3, anselmo → marta, sobre `D2.anselmo`
  - real: Reúne os anciãos na Casa do Conselho e expõe o plano da vigília armada, falando alto o suficiente para não deixar espaço a perguntas. Precisa que a decisão seja tomada antes que vozes discordantes apareçam.
  - contado: Os lobos voltaram da montanha — vi os rastros eu mesmo, e não sou o único. Convoco os anciãos amanhã na Casa do Conselho. Aprovamos a vigília armada e encerramos o debate. A aldeia não pode esperar mais. Quem conhece est…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r01

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 601 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1129 s (56.5 s/dia) |
| chamadas | 35 (erros de provedor: 0) |
| falha de estrutura | 0/35 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/15 |
| tokens entrada / saída | 223534 / 99687 |
| custo | US$ 1.7254 |
| eventos / relatos | 120 / 62 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 4 3 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.725 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 207 / 207 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 207 / 17 / 5 / 18 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.09 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 5 (por `D5.benedita`, `D5.joaquim`, `D5.rui`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 6 (por `D6.anselmo`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.joaquim`, `D4.marta`)
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.anselmo`, `D3.marta`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D15.benedita` → `D16.benedita` (115 | 5); `D3.irma-clara` → `D4.irma-clara` (3 | 117); `D4.irma-clara` → `D5.irma-clara` (4 | 116); `D5.anselmo` → `D6.anselmo` (113 | 7); `D5.irma-clara` → `D6.anselmo` (5 | 115)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 4): Anselmo convoca os outros anciãos para discutir os ataques aos rebanhos, insistindo que são lobos vindos da montanha e desviando qualquer pergunta sobre o estoque de grão.
- `D1.marta` (floresta, tensão 6): Marta examina de novo a carcaça das ovelhas mortas na orla da floresta, procurando pegadas que não sejam de lobo para sustentar sua suspeita contra o ancião.
- `D1.irma-clara` (ermida, tensão 5): Irmã Clara testa o sino rachado em segredo antes de tocá-lo ao amanhecer, e depois reza sozinha pedindo que ele aguente até convencer a aldeia a subir à colina.
- `D1.joaquim` (moinho, tensão 7): Joaquim tranca a porta dos fundos do moinho, leva pão e água ao forasteiro escondido e depois volta a moer grão como se nada houvesse, evitando olhar para quem passa lá fora.
- `D1.benedita` (praca, tensão 3): Benedita reúne alguns vizinhos na praça do poço e propõe começarem já a abrir uma trilha alternativa pela montanha, sem esperar a decisão do conselho.
- `D1.rui` (praca, tensão 5): Rui fica junto aos outros rapazes na praça, contando histórias sobre o forasteiro-espírito do moinho para parecer corajoso, mas evita mencionar quem viu saindo de lá de madrugada.
- `D2.anselmo` (casa-conselho, tensão 7, causado por D1.anselmo): Anselmo reúne novamente os anciãos e reforça que os ataques são obra de lobos, insinuando que Marta espalha boatos para minar sua autoridade.
- `D2.marta` (casa-conselho, tensão 8, causado por D1.marta): Marta sobe até a Casa do Conselho e exige explicações de Anselmo sobre o estoque de grão, insistindo que as mortes escondem algo mais que lobos.

**Últimos eventos**

- `D20.anselmo` (moinho, tensão 8, causado por D19.rui, D19.anselmo): Vendo o forasteiro finalmente exposto atrás dos sacos, Anselmo avança e exige que Joaquim o entregue agora mesmo, erguendo a voz para calar Rui antes que ele conte mais.
- `D20.marta` (moinho, tensão 8, causado por D19.rui, D19.marta): Marta aponta para o forasteiro à vista de todos e grita que ali está a prova de que Joaquim e Anselmo escondem o mesmo segredo do grão sumido, exigindo respostas ali mesmo.
- `D20.irma-clara` (ermida, tensão 8, causado por D19.irma-clara): Com o sino mudo, Clara amarra um badalo improvisado à pressa e conclama os fiéis a redobrar a penitência, jurando que o próprio silêncio é o aviso mais grave.
- `D20.joaquim` (moinho, tensão 9, causado por D19.rui, D19.joaquim): Encurralado com o forasteiro exposto, Joaquim se põe na frente do homem ferido e implora que não o entreguem, negando com a voz trêmula que falte um grão sequer no estoque.
- `D20.benedita` (praca, tensão 6, causado por D19.benedita): Com as pegadas de botas confirmadas na neve, Benedita deixa os lenhadores na trilha e desce até a praça do poço para contar a quem quiser ouvir que não foram lobos que mataram o rebanho.
- `D20.rui` (moinho, tensão 7, causado por D19.rui): Trêmulo mas eufórico por finalmente ter visto o vulto com os próprios olhos, Rui grita que não mentiu e aponta o forasteiro para que Anselmo e Marta vejam.

**Relatos: evento real × versão contada**

- dia 2, anselmo → marta, sobre `D1.anselmo`
  - real: Anselmo convoca os outros anciãos para discutir os ataques aos rebanhos, insistindo que são lobos vindos da montanha e desviando qualquer pergunta sobre o estoque de grão.
  - contado: Anselmo diz a Marta que os ataques ao rebanho são obra de lobos descidos da montanha, como há anos não se via. Garante que os anciãos já discutem o assunto e evita comentar qualquer coisa sobre o estoque de grão da aldei…
- dia 2, marta → anselmo, sobre `D1.marta`
  - real: Marta examina de novo a carcaça das ovelhas mortas na orla da floresta, procurando pegadas que não sejam de lobo para sustentar sua suspeita contra o ancião.
  - contado: Marta conta a Anselmo que voltou à orla da floresta examinar as ovelhas mortas e não encontrou pegadas de lobo, só sinais estranhos. Diz suspeitar que o ancião esconde algo relacionado ao grão da aldeia.
- dia 3, joaquim → marta, sobre `D1.joaquim`
  - real: Joaquim tranca a porta dos fundos do moinho, leva pão e água ao forasteiro escondido e depois volta a moer grão como se nada houvesse, evitando olhar para quem passa lá fora.
  - contado: Marta, não foi nada demais — tranquei os fundos porque o vento derrubou a tranca, e levei pão e água pra mim mesmo, que a moagem toma a noite toda. Ninguém mais entra ali, e é bom que fique assim, com tanta gente já desc…
- dia 3, marta → joaquim, sobre `D1.anselmo`
  - real: Anselmo convoca os outros anciãos para discutir os ataques aos rebanhos, insistindo que são lobos vindos da montanha e desviando qualquer pergunta sobre o estoque de grão.
  - contado: Joaquim, vi Anselmo reunir os anciãos jurando que são lobos da montanha matando os rebanhos — o meu inteiro, arrasado! Mas repare: toda vez que alguém pergunta pelo estoque de grão, ele muda de assunto na hora. Esconde a…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r02

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 602 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5<br>curador: claude-sonnet-5 |
| tempo total de chamadas | 1091 s (54.5 s/dia) |
| chamadas | 37 (erros de provedor: 0) |
| falha de estrutura | 0/37 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/16 · curador 0/1 |
| tokens entrada / saída | 215537 / 95511 |
| custo | US$ 1.6724 |
| eventos / relatos | 120 / 68 |
| tramas surgidas / fechadas | 2 / 1 (50.0%) |
| tramas abertas por dia | 0 5 4 3 3 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.733 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 208 / 208 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 1 / 3 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 20.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 208 / 9 / 2 / 10 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.05 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 4 (por `D4.benedita`, `D4.joaquim`, `D4.marta`, `D4.rui`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 6 (por `D6.irma-clara`, `D6.rui`)
- `D1.joaquim` (nasceu no dia 2): fechada por estabilidade no dia 6
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.anselmo`, `D3.marta`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D3.irma-clara` → `D4.irma-clara` (3 | 114); `D4.irma-clara` → `D5.irma-clara` (4 | 113)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 6): Anselmo convoca os outros anciãos para discutir as mortes dos rebanhos, insistindo que são lobos vindos da montanha e reafirmando que só ele sabe conduzir a aldeia nesta crise.
- `D1.marta` (floresta, tensão 7): Marta caminha pela orla da floresta examinando as ovelhas mortas, procurando algo que ligue as mortes ao grão que desconfia estar sumindo do estoque de Anselmo.
- `D1.irma-clara` (ermida, tensão 6): Irmã Clara toca o sino com cuidado, temendo que rache de vez, chamando os aldeões à ermida para um chamado de penitência antes da neve.
- `D1.joaquim` (moinho, tensão 7): Joaquim tranca melhor a porta lateral do moinho e leva água e pão ao forasteiro escondido, evitando qualquer barulho que atraia visitas.
- `D1.benedita` (praca, tensão 5): Benedita reúne machado e cordas junto ao poço e anuncia aos presentes que começará sozinha a abrir uma trilha pela montanha, sem esperar decisão do conselho.
- `D1.rui` (praca, tensão 5): Rui fica junto ao poço tentando puxar conversa com os outros rapazes, soltando insinuações vagas sobre estranhezas no moinho sem contar o que realmente viu.
- `D2.anselmo` (casa-conselho, tensão 6, causado por D1.anselmo): Anselmo convoca homens para formar uma partida de caça aos lobos na floresta, reafirmando diante dos outros anciãos que só ele sabe proteger o vale e insinuando que Marta busca desacreditá-lo.
- `D2.marta` (casa-conselho, tensão 7, causado por D1.marta): Marta deixa a orla da floresta e vai até a Casa do Conselho exigir que Anselmo abra o estoque de grão diante de todos, convencida de que ele esconde algo além dos lobos.

**Últimos eventos**

- `D20.anselmo` (moinho, tensão 8, causado por D19.marta, D19.anselmo): Anselmo nega com veemência a acusação de Marta sobre o grão e ergue a voz, exigindo que só ele, como ancião, decida o que fazer com o forasteiro para desviar os olhares do estoque sumido.
- `D20.marta` (moinho, tensão 8, causado por D19.marta, D19.anselmo): Marta aproveita a confusão em torno do forasteiro para exigir que Anselmo abra os sacos da frente diante de todos, decidida a provar que ele mexeu no grão.
- `D20.irma-clara` (ermida, tensão 6, causado por D19.irma-clara): Deixando o moinho e o forasteiro para trás, Irmã Clara sobe sozinha à ermida para testar o sino antes de convocar a aldeia, temendo em segredo que ele não toque mais.
- `D20.joaquim` (moinho, tensão 7, causado por D19.benedita, D19.joaquim): Joaquim insiste a Benedita que o forasteiro chegou ferido antes do deslizamento e nada tem a ver com os rebanhos mortos, tentando salvar o segredo com farinha e súplicas.
- `D20.benedita` (moinho, tensão 7, causado por D19.benedita): Benedita ignora as súplicas de Joaquim e exige ver as botas do forasteiro, comparando-as mentalmente com os rastros que viu perto dos rebanhos mortos.
- `D20.rui` (ermida, tensão 7, causado por D19.rui): Sozinho e ainda trêmulo, Rui puxa a corda do sino da ermida na esperança de chamar Irmã Clara e afastar o medo do que confessou a Benedita.

**Relatos: evento real × versão contada**

- dia 2, anselmo → marta, sobre `D1.anselmo`
  - real: Anselmo convoca os outros anciãos para discutir as mortes dos rebanhos, insistindo que são lobos vindos da montanha e reafirmando que só ele sabe conduzir a aldeia nesta crise.
  - contado: Anselmo diz a Marta: 'Convoquei os anciãos, é urgente. São lobos da montanha atacando os rebanhos, tenho certeza. Só eu tenho experiência pra guiar a aldeia nessa crise, Marta. Espero que não pense em tomar decisões prec…
- dia 2, marta → anselmo, sobre `D1.marta`
  - real: Marta caminha pela orla da floresta examinando as ovelhas mortas, procurando algo que ligue as mortes ao grão que desconfia estar sumindo do estoque de Anselmo.
  - contado: Marta diz a Anselmo: 'Andei pela orla da floresta examinando as ovelhas mortas, Anselmo. Não me convenço de que foram lobos - há algo estranho nisso, quase como se estivesse ligado ao grão que sumiu do estoque. O senhor …
- dia 3, anselmo → benedita, sobre `D1.marta`
  - real: Marta caminha pela orla da floresta examinando as ovelhas mortas, procurando algo que ligue as mortes ao grão que desconfia estar sumindo do estoque de Anselmo.
  - contado: Benedita, vi Marta rondando a orla da floresta, cheirando as ovelhas mortas como um corvo. Ela quer achar prova contra mim pra tomar meu lugar no conselho. Os lobos desceram da montanha, isso é claro. Fique de olho nela,…
- dia 3, benedita → marta, sobre `D2.benedita`
  - real: Benedita adia a trilha por um dia e vai à orla da floresta examinar de perto os rastros de botas perto dos rebanhos mortos, lembrando das insinuações de Rui sobre o moinho.
  - contado: Marta, adiei a trilha e fui à orla examinar de perto os rastros de botas perto do rebanho morto. Não são lobos, tenho certeza. E lembrei das insinuações de Rui sobre o moinho... talvez valha a pena olhar pra lá também, e…

**Narrações do curador (1)**

- trama `D1.joaquim`, dia 6, 3 eventos na cadeia:
  > Joaquim trancou melhor a porta lateral do moinho e, em silêncio, levou água e pão ao forasteiro escondido, tomando cuidado para que nenhum barulho atraísse visitas. Depois, passou a moer grão abertamente na frente do moinho, de modo a parecer ocupado e afastar quem se aproximasse, enquanto mantinha a porta lateral trancada e continuava, à noite, levando comida ao forasteiro sem fazer ruído. Assim, voltou a moer grão na frente do moinho para os poucos que passavam, e, ao cair da noite, levava pão e água pela porta lateral trancada ao forasteiro escondido, sempre em silêncio.


## vale-silente_claude-cli-claude-sonnet-5_informa_6ag_jog-nenhum_r03

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | informa |
| jogador | nenhum |
| dias | 20 |
| semente | 603 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1031 s (51.6 s/dia) |
| chamadas | 34 (erros de provedor: 0) |
| falha de estrutura | 0/34 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/20 · relatos 0/14 |
| tokens entrada / saída | 214499 / 87404 |
| custo | US$ 1.5482 |
| eventos / relatos | 120 / 40 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 5 3 3 3 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 |
| razão de amarração final | 1.550 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 186 / 186 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 0 / 4 / 1 |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 186 / 12 / 4 / 14 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.05 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): aberta no fim da sessão
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.irma-clara` no dia 3 (por `D3.benedita`, `D3.rui`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 15 (por `D15.anselmo`, `D15.benedita`, `D15.irma-clara`, `D15.joaquim`, `D15.marta`, `D15.rui`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.irma-clara` no dia 6 (por `D6.joaquim`)
- `D1.marta` (nasceu no dia 2): absorvida por `D1.anselmo` no dia 3 (por `D3.anselmo`, `D3.marta`)

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D2.irma-clara` → `D3.rui` (3 | 117); `D3.joaquim` → `D4.joaquim` (3 | 117); `D4.joaquim` → `D5.joaquim` (4 | 116); `D5.joaquim` → `D6.joaquim` (5 | 115)

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 4): Anselmo reúne os outros anciãos e declara que os lobos desceram da montanha, pedindo guardas extras nos pastos à noite. Evita qualquer menção ao estoque de grão quando alguém pergunta se vai durar o inverno.
- `D1.marta` (floresta, tensão 6): Marta vasculha a orla da floresta ao redor das ovelhas mortas, procurando marcas que não sejam de garras de lobo, decidida a levar provas ao conselho contra Anselmo.
- `D1.irma-clara` (ermida, tensão 5): Irmã Clara toca o sino com cuidado, temendo que a rachadura piore, chamando os aldeões para uma vigília de penitência antes da primeira neve.
- `D1.joaquim` (moinho, tensão 6): Joaquim tranca a porta dos fundos e leva água e pão ao forasteiro ferido escondido, depois volta a moer grão como se nada estivesse acontecendo.
- `D1.benedita` (praca, tensão 3): Benedita reúne machados e cordas na praça, tentando convencer outros aldeões a começarem já a abrir uma trilha pela montanha, sem esperar pela decisão do conselho.
- `D1.rui` (praca, tensão 4): Rui fica junto aos rapazes na praça, rindo alto das piadas deles, mas guarda para si o que viu saindo do moinho de madrugada, com medo de parecer tolo ou de se meter em confusão.
- `D2.anselmo` (casa-conselho, tensão 6, causado por D1.anselmo): Anselmo reforça diante dos outros anciãos que os lobos são a causa das mortes e propõe racionar a farinha 'por precaução', desviando qualquer pergunta sobre o estoque de grão.
- `D2.marta` (casa-conselho, tensão 8, causado por D1.marta): Marta chega à Casa do Conselho com marcas de botas que encontrou na orla da floresta e exige diante de Anselmo que ele explique o que esconde sobre o grão.

**Últimos eventos**

- `D20.anselmo` (casa-conselho, tensão 8, causado por D19.anselmo, D19.marta): Anselmo abandona a discussão na orla e corre à Casa do Conselho, exigindo aos outros anciãos que anulem a votação de Marta até que Benedita, supostamente presa pelos intrusos, seja encontrada.
- `D20.marta` (floresta, tensão 6, causado por D19.marta): Assumindo-se a nova responsável pelos pastores, Marta ordena que o rebanho restante seja retirado da orla e levado para pastos mais próximos da aldeia, longe do alcance dos supostos lobos.
- `D20.irma-clara` (moinho, tensão 7, causado por D19.irma-clara, D19.rui): Clara reúne os fiéis na ermida e desce com eles até o moinho, determinada a expulsar o mal que, segundo Rui, saiu de lá na calada da noite.
- `D20.joaquim` (moinho, tensão 8, causado por D19.benedita): Ao notar um vulto espiando pelas frestas fechadas, Joaquim apaga a luz às pressas e tranca ainda mais o moinho, temendo que Benedita tenha finalmente descoberto o forasteiro escondido.
- `D20.benedita` (moinho, tensão 7, causado por D19.benedita, D19.joaquim): Vendo a luz sumir de repente atrás das frestas, Benedita bate com força na porta do moinho e exige que Joaquim explique o que esconde ali dentro.
- `D20.rui` (moinho, tensão 6, causado por D19.irma-clara, D19.rui): Ainda atordoado por ter dado o alarme, Rui segue Irmã Clara e os fiéis rumo ao moinho, apavorado com a ideia de que todos descubram que o vulto era apenas Joaquim.

**Relatos: evento real × versão contada**

- dia 2, anselmo → marta, sobre `D1.anselmo`
  - real: Anselmo reúne os outros anciãos e declara que os lobos desceram da montanha, pedindo guardas extras nos pastos à noite. Evita qualquer menção ao estoque de grão quando alguém pergunta se vai durar o inverno.
  - contado: Anselmo reúne os outros anciãos e declara, grave, que os lobos desceram da montanha, pedindo guardas extras nos pastos à noite. Quando Marta pergunta se o grão vai durar o inverno, ele desconversa e muda de assunto rapid…
- dia 2, marta → anselmo, sobre `D1.marta`
  - real: Marta vasculha a orla da floresta ao redor das ovelhas mortas, procurando marcas que não sejam de garras de lobo, decidida a levar provas ao conselho contra Anselmo.
  - contado: Marta vasculha a orla da floresta junto às ovelhas mortas, dizendo a Anselmo que as marcas não parecem de lobo. Afirma que perdeu apenas poucas cabeças nos ataques e que vai levar provas ao conselho contra ele.
- dia 3, irma-clara → rui, sobre `D2.irma-clara`
  - real: Irmã Clara desce até a Praça do Poço para convocar os aldeões a subirem à ermida antes da neve, insistindo que as mortes são um aviso divino, sem mencionar o sino rachado.
  - contado: Irmã Clara desce à Praça do Poço e chama os aldeões para subir à ermida antes da neve. Diz a Rui que as mortes são um aviso divino, e que é preciso rezar. Não fala do sino rachado, só insiste que o tempo urge e que ele d…
- dia 3, rui → irma-clara, sobre `D1.rui`
  - real: Rui fica junto aos rapazes na praça, rindo alto das piadas deles, mas guarda para si o que viu saindo do moinho de madrugada, com medo de parecer tolo ou de se meter em confusão.
  - contado: Rui conta a Irmã Clara que ficou com os rapazes na praça, rindo das piadas deles. Diz que nada de estranho aconteceu por lá. Não menciona a figura que viu saindo do moinho de madrugada, temendo parecer tolo ou se meter e…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão

