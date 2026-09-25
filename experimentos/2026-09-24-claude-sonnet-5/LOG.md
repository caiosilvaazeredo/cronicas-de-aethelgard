# Log de sessões: experimentos/2026-09-24-claude-sonnet-5

Gerado por `npm run relatorio` em 2026-09-25T14:29:12.860Z.


## porto-das-brumas_claude-cli_controle-tres-atos_jog-investigador_s1

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | porto-das-brumas |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 15 |
| semente | 1 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-sonnet-5<br>curador: claude-sonnet-5 |
| tempo total de chamadas | 558 s (37.2 s/dia) |
| chamadas | 31 (erros de provedor: 0) |
| falha de estrutura | 0/31 = 0.0%; tentativas médias 1.13 |
| falha por papel | jogador 0/15 · mestre 0/15 · curador 0/1 |
| tokens entrada / saída | 363604 / 41910 |
| custo | US$ 1.2825 |
| eventos / relatos | 15 / 0 |
| tramas surgidas / fechadas | 3 / 1 (33.3%) |
| tramas abertas por dia | 0 1 1 1 2 1 1 1 1 1 1 1 1 1 2 |
| razão de amarração final | 1.467 |
| eventos fundadores | 3 |
| causadoPor: referências / arestas / descartadas | 24 / 22 / 2 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 3 / 1 / 0 / 2 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 33.3% |
| grafo: ligações / pontes / pontes de fusão / articulações | 22 / 3 / 0 / 1 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.68 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): fechada por estabilidade no dia 6
- `D4.mestre` (nasceu no dia 5): aberta no fim da sessão
- `D14.mestre` (nasceu no dia 15): aberta no fim da sessão

**Primeiros eventos**

- `D1.mestre` (cais, tensão 2): O forasteiro chega às docas nevoentas de Porto das Brumas e tenta puxar conversa com os estivadores, mas é ignorado com desprezo e tem a bolsa roçada por um batedor de carteira, sendo 'apresentado' à cidade da pior forma…
- `D2.mestre` (taverna, tensão 0.4, causado por D1.mestre): O forasteiro entra na Taverna do Arpão Torto para ouvir marinheiros falando sobre roubos no cais, mas seu banquinho quebra no pior momento, derrubando a bebida sobre um marinheiro tatuado e atraindo a hostilidade de todo…
- `D3.mestre` (taverna, tensão 0.4, causado por D2.mestre): O forasteiro paga uma rodada ao marinheiro tatuado para acalmar os ânimos; a tensão baixa mas os informantes fogem, e o taverneiro, notando seu dinheiro, oferece um 'trabalhinho' suspeito.
- `D4.mestre` (taverna, tensão 0.35, causado por D3): O forasteiro convence o taverneiro a detalhar o 'trabalhinho de maré baixa': um carregamento de contrabando dos Corvos da Bruma que chegará ao Cais Sete na noite seguinte, sob o comando do Capitão Renn, obtendo mapa, loc…
- `D5.mestre` (alfandega, tensão 4, causado por D4.mestre): O forasteiro engana o escrivão da Casa da Alfândega para consultar os registros e descobre que uma inspeção no Cais Sete foi cancelada por ordem de um tal Sargento Voss, revelando que a guarda está corrompida e protegend…
- `D6.mestre` (mercado, tensão 0.55, causado por D5.mestre, D4.mestre): No Mercado do Sal, o forasteiro colhe fofocas valiosas sobre o Sargento Voss: seu horário de ronda 'esquecido' no Cais Sete, seus hábitos na Estalagem do Mastro Quebrado e sua reputação de corrupto, confirmando o esquema…
- `D7.mestre` (armazens, tensão 0.55, causado por D4.mestre): O forasteiro localiza o galpão de telhado furado nos Armazéns da Ponta e observa discretamente o Capitão Renn supervisionando os Corvos da Bruma, confirmando o local, o navio 'Dama da Bruma' e detalhes operacionais do co…
- `D8.mestre` (armazens, tensão 0.6, causado por D5.mestre, D6.mestre, D7.mestre): No Mastro Quebrado, o forasteiro flagra Sargento Voss recebendo suborno de um contato encapuzado dos Corvos, confirmando pagamento pela proteção e o horário exato (meia-noite, Cais Sete) do contrabando.

**Últimos eventos**

- `D10.mestre` (cais, tensão 8, causado por D9.mestre, D7.mestre, D8.mestre): O forasteiro guia com sucesso a Capitã Draeger e sua guarnição discreta até o Cais Sete, posicionando-os em emboscada perto do galpão do telhado furado momentos antes da meia-noite, prontos para flagrar Voss e o Capitão …
- `D11.mestre` (armazens, tensão 8, causado por D10.mestre, D9.mestre): O forasteiro mantém posição e silêncio perfeitos ao lado da Capitã Draeger durante a espera; à meia-noite, Sargento Voss chega ao Cais Sete e é recebido abertamente por dois homens de Renn na porta do galpão, confirmando…
- `D12.mestre` (armazens, tensão 0.8, causado por D11.mestre, D10.mestre): Um deslize barulhento do forasteiro alerta os homens de Renn, forçando Draeger a antecipar o ataque; a guarda avança sobre Voss no Cais Sete, mas o alarme precoce dá tempo para agitação dentro do galpão.
- `D13.mestre` (armazens, tensão 8.5, causado por D12.mestre, D11.mestre): O forasteiro derruba e captura o Sargento Voss em flagrante com o saquinho de suborno, forçando a rendição dos homens de Renn, enquanto Draeger avança sobre o galpão atrás do próprio Capitão Renn.
- `D14.mestre` (armazens, tensão 0.92, causado por D13): O forasteiro corta pelo galpão e intercepta o Capitão Renn antes que ele alcance o 'Dama da Bruma', encurralando-o no cais entre si e a Capitã Draeger, que chega pela porta dos fundos e bloqueia a última rota de fuga.
- `D15.mestre` (armazens, tensão 0.85, causado por D14.mestre): O grito de rendição do forasteiro quase convence Renn, mas o capitão reage com um ataque desesperado direto contra ele em vez de se render, iniciando um confronto de espadas no cais enquanto Draeger avança para fechar o …

**Narrações do curador (1)**

- trama `D1.mestre`, dia 6, 3 eventos na cadeia:
  > O forasteiro chegou às docas nevoentas de Porto das Brumas e tentou puxar conversa com os estivadores, mas foi ignorado com desprezo, e para completar a má recepção, um batedor de carteiras roçou-lhe a bolsa — assim foi 'apresentado' à cidade da pior forma possível.  Ainda abalado por esse início, entrou na Taverna do Arpão Torto na esperança de ouvir, dissimuladamente, os marinheiros que comentavam sobre os roubos no cais. Mal se sentou, porém, seu banquinho quebrou no pior momento possível, derrubando a bebida sobre um marinheiro tatuado. O acidente atraiu a hostilidade de todo o recinto, e ele nada conseguiu apurar sobre os tais roubos.  Para apaziguar os ânimos, o forasteiro pagou uma rodada ao marinheiro tatuado. A tensão de fato diminuiu, mas o preço foi alto: os informantes que antes falavam sobre os roubos aproveitaram a distração para desaparecer. E foi justamente ao ver o dinheiro do forasteiro que o taverneiro, de olhar atento, se aproximou e lhe ofereceu um 'trabalhinho' de aparência bastante suspeita.


## porto-das-brumas_claude-cli_informa_6ag_jog-investigador_s1

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | investigador |
| dias | 15 |
| semente | 1 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>jogador: claude-sonnet-5<br>relatos: claude-sonnet-5 |
| tempo total de chamadas | 1066 s (71.1 s/dia) |
| chamadas | 43 (erros de provedor: 0) |
| falha de estrutura | 0/43 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/15 · jogador 0/15 · relatos 0/13 |
| tokens entrada / saída | 308657 / 109598 |
| custo | US$ 1.9611 |
| eventos / relatos | 105 / 48 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 4 2 1 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.829 |
| eventos fundadores | 7 |
| causadoPor: referências / arestas / descartadas | 192 / 192 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 4 / 0 / 3 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 192 / 12 / 1 / 12 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.39 / 5 |

**Linhagem das tramas**

- `D1.bras` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.jogador`)
- `D1.lia` (nasceu no dia 2): absorvida por `D1.odete` no dia 4 (por `D4.bras`, `D4.odete`)
- `D1.nuno` (nasceu no dia 2): absorvida por `D1.odete` no dia 3 (por `D3.bras`, `D3.jogador`, `D3.nuno`, `D3.tomas`)
- `D1.odete` (nasceu no dia 2): aberta no fim da sessão

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D2.jogador` → `D3.jogador` (102 | 3)

**Primeiros eventos**

- `D1.odete` (armazens, tensão 4): Odete vai até os Armazéns da Ponta e procura Iracema, oferecendo-se para 'ajudar' com as dívidas do falecido Vasco enquanto sonda por baixo quanto ela aceitaria pelo armazém.
- `D1.bras` (alfandega, tensão 6): Brás tranca-se com os livros de entrada da alfândega, ajustando registros de cargas que deixou passar sem inspeção, atento a passos na porta.
- `D1.lia` (taverna, tensão 5): Lia circula entre as mesas do Arpão Torto puxando conversa com marinheiros, coletando fofocas sobre rivais na Irmandade para depois repassar à guarda.
- `D1.tomas` (armazens, tensão 5): Tomás deixa a capela e vai aos Armazéns da Ponta visitar Iracema, oferecendo condolências e observando com cuidado o local onde Vasco morreu.
- `D1.iracema` (armazens, tensão 6): Iracema revira caixotes e baús no armazém do marido, procurando os papéis que ele guardava escondidos antes que alguém chegue primeiro.
- `D1.nuno` (cais, tensão 5): Nuno interroga discretamente estivadores no Cais Velho sobre cargas recentes, tentando achar a origem das contas que não batem na alfândega.
- `D1.jogador` (cais, tensão 1): Puxo conversa com Nuno Calado no Cais Velho, dizendo que acabei de chegar à cidade e perguntando o que ele pode me contar sobre Porto das Brumas.
- `D2.odete` (armazens, tensão 7, causado por D1.odete): Odete pressiona Iracema com uma oferta rapida e baixa pelo armazem, alegando urgencia antes que 'outros mercadores' aparecam, escondendo o desespero pela divida atrasada.

**Últimos eventos**

- `D15.odete` (alfandega, tensão 9, causado por D14.nuno, D14.jogador): Encurralada pelas acusações de Nuno, nega tudo com voz firme, insinua que os papéis foram forjados e lança um olhar urgente a Brás, pedindo que ele intervenha por ela.
- `D15.bras` (alfandega, tensão 9, causado por D14.nuno, D14.jogador): Percebendo que proteger Odete agora pode custar-lhe a promoção, vira o jogo diante de Nuno e sugere que investigue mais a fundo os negócios da Guilda, distanciando-se dela publicamente.
- `D15.lia` (taverna, tensão 6, causado por D14.lia): No quarto dos fundos da taverna, fecha acordo com seu contato da Irmandade para usar os papéis de Vasco como arma contra Odete, movendo peças para ocupar o lugar do chefe doente.
- `D15.tomas` (capela, tensão 4, causado por D14.tomas): Na Capela da Maré, começa com as próprias mãos o conserto do telhado usando o dinheiro doado, tentando afastar da mente o medo do que sua revelação a Nuno possa lhe custar.
- `D15.iracema` (cais, tensão 7, causado por D14.iracema): A bordo do navio que se afasta do Cais Velho, aperta os filhos contra si e observa o porto sumir na neblina, aliviada por ter escapado antes que Nuno a detivesse.
- `D15.jogador` (alfandega, tensão 9, causado por D13.lia, D14.jogador, D14.bras, D14.odete): Chego ofegante à Alfândega, mas vendo Brás e Odete ali, disfarço o alarme e peço baixinho a Nuno para revisarmos juntos uns "registros" em particular, mantendo os papéis escondidos sob a capa.

**Relatos: evento real × versão contada**

- dia 2, bras → jogador, sobre `D1.bras`
  - real: Brás tranca-se com os livros de entrada da alfândega, ajustando registros de cargas que deixou passar sem inspeção, atento a passos na porta.
  - contado: Brás desconfia que o novo fiscal foi mandado pela capital só pra vigiá-lo de perto. Diz ao forasteiro que a Irmandade da Névoa é gente mais confiável que a Guilda, cheia de intrigas. Sobre os livros da alfândega e os nav…
- dia 2, iracema → lia, sobre `D1.odete`
  - real: Odete vai até os Armazéns da Ponta e procura Iracema, oferecendo-se para 'ajudar' com as dívidas do falecido Vasco enquanto sonda por baixo quanto ela aceitaria pelo armazém.
  - contado: Iracema conta a Lia que Odete apareceu no armazém oferecendo ajuda com as dívidas de Vasco, mas ficou puxando conversa pra saber quanto ela aceitaria pelo lugar. Não confia: acha que o marido guardava papéis escondidos a…
- dia 2, lia → odete, sobre `D1.lia`
  - real: Lia circula entre as mesas do Arpão Torto puxando conversa com marinheiros, coletando fofocas sobre rivais na Irmandade para depois repassar à guarda.
  - contado: Lia diz a Odete que só estava no Arpão Torto trocando conversa à toa com os marinheiros, nada demais. Comenta que soube por aí que o velho chefe da Irmandade anda doente, e pergunta se Odete não estaria pensando em sumir…
- dia 2, odete → lia, sobre `D1.odete`
  - real: Odete vai até os Armazéns da Ponta e procura Iracema, oferecendo-se para 'ajudar' com as dívidas do falecido Vasco enquanto sonda por baixo quanto ela aceitaria pelo armazém.
  - contado: Odete conta a Lia que foi visitar Iracema nos Armazéns da Ponta, só pra oferecer ajuda com as dívidas que o falecido Vasco deixou. Diz que a viúva não faz ideia do real valor do lugar, e que talvez valha a pena tentar co…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli_nao-informa_6ag_jog-nenhum_s1

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | vale-silente |
| agentes | 6: anselmo, marta, irma-clara, joaquim, benedita, rui |
| estado das tramas no prompt | nao-informa |
| jogador | nenhum |
| dias | 15 |
| semente | 1 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | agentes: claude-sonnet-5<br>relatos: claude-sonnet-5<br>curador: claude-sonnet-5 |
| tempo total de chamadas | 802 s (53.5 s/dia) |
| chamadas | 27 (erros de provedor: 0) |
| falha de estrutura | 0/27 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/15 · relatos 0/11 · curador 0/1 |
| tokens entrada / saída | 178836 / 79455 |
| custo | US$ 1.3612 |
| eventos / relatos | 90 / 42 |
| tramas surgidas / fechadas | 2 / 1 (50.0%) |
| tramas abertas por dia | 0 5 3 2 2 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.778 |
| eventos fundadores | 6 |
| causadoPor: referências / arestas / descartadas | 160 / 160 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 5 / 1 / 3 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 20.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 160 / 7 / 0 / 6 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.13 / 0 |

**Linhagem das tramas**

- `D1.anselmo` (nasceu no dia 2): fechada por estabilidade no dia 6
- `D1.benedita` (nasceu no dia 2): absorvida por `D1.marta` no dia 4 (por `D4.anselmo`, `D4.benedita`, `D4.marta`, `D4.rui`)
- `D1.irma-clara` (nasceu no dia 2): absorvida por `D1.marta` no dia 3 (por `D3.irma-clara`, `D3.joaquim`)
- `D1.joaquim` (nasceu no dia 2): absorvida por `D1.marta` no dia 3 (por `D3.irma-clara`, `D3.joaquim`, `D3.marta`)
- `D1.marta` (nasceu no dia 2): aberta no fim da sessão

**Primeiros eventos**

- `D1.anselmo` (casa-conselho, tensão 6): Anselmo convoca os anciãos para debater as mortes no rebanho, insistindo que são obra de lobos vindos da montanha, e evita qualquer menção ao estoque de grão.
- `D1.marta` (floresta, tensão 7): Marta examina a orla da floresta em busca de pistas nas carcaças, reforça a cerca do que resta do rebanho e resmunga que o ancião esconde algo sobre o grão.
- `D1.irma-clara` (ermida, tensão 5): Irmã Clara toca o sino rachado com cuidado, chamando os aldeões para uma vigília antes da neve, temendo que o som falhe diante de todos.
- `D1.joaquim` (moinho, tensão 6): Joaquim trava a porta dos fundos onde esconde o forasteiro ferido e segue moendo grão, evitando visitas e olhando o estoque de farinha com preocupação.
- `D1.benedita` (praca, tensão 4): Benedita reúne machados e cordas na praça, anunciando que vai abrir uma trilha pela montanha e que primeiro quer checar os rastros de botas perto dos rebanhos mortos.
- `D1.rui` (praca, tensão 5): Rui fica perto do poço ouvindo os boatos sobre os rebanhos, quase contando o que viu saindo do moinho de madrugada, mas engole as palavras para não parecer estranho aos outros rapazes.
- `D2.anselmo` (casa-conselho, tensão 6, causado por D1.anselmo): Anselmo propõe formar uma guarda armada contra os lobos da montanha, reforçando sua autoridade e desviando qualquer pergunta sobre o estoque de grão.
- `D2.marta` (moinho, tensão 7, causado por D1.marta): Marta vai ao moinho sob pretexto de trocar lã por farinha, mas na verdade quer ver com os próprios olhos quanto grão Anselmo realmente escondeu.

**Últimos eventos**

- `D15.anselmo` (floresta, tensão 8, causado por D14.anselmo, D14.marta): Fugindo da cobrança de Marta sobre o grão, Anselmo anuncia que partirá ele mesmo à frente da caçada e sai apressado da Casa do Conselho rumo à Orla da Floresta.
- `D15.marta` (moinho, tensão 8, causado por D14.marta, D14.anselmo): Vendo Anselmo escapar para a caçada, Marta arrasta os vizinhos e os sacos contados até o Moinho do Riacho para conferir o estoque de farinha com os próprios olhos.
- `D15.irma-clara` (ermida, tensão 8, causado por D14.irma-clara): Com o forasteiro exposto na orla, Clara conduz os fiéis colina acima até a Ermida, decidida a tocar o sino e chamar toda a aldeia à penitência antes da neve.
- `D15.joaquim` (floresta, tensão 9, causado por D14.joaquim, D14.irma-clara): Sem mais como escondê-lo, Joaquim se ajoelha junto ao forasteiro e implora aos fiéis que não o machuquem, jurando que é só um viajante ferido, não um presságio.
- `D15.benedita` (floresta, tensão 8, causado por D14.benedita, D14.joaquim): Lembrando dos rastros de botas junto aos rebanhos mortos, Benedita encara o forasteiro ferido e exige que Joaquim diga se foi ele quem andou pelos pastos à noite.
- `D15.rui` (floresta, tensão 6, causado por D14.rui, D14.irma-clara): Apontando para o forasteiro caído, Rui grita aos fiéis que era ele a figura que viu sair do moinho de madrugada, orgulhoso por finalmente ser acreditado.

**Relatos: evento real × versão contada**

- dia 2, irma-clara → joaquim, sobre `D1.irma-clara`
  - real: Irmã Clara toca o sino rachado com cuidado, chamando os aldeões para uma vigília antes da neve, temendo que o som falhe diante de todos.
  - contado: Joaquim, vi sinais nas encostas que não são de bom agouro — essas mortes são um aviso, tenho certeza. E você, que nunca pisa na ermida... o que teme encontrar lá? Convoco uma vigília antes da neve chegar, e espero que to…
- dia 2, joaquim → irma-clara, sobre `D1.joaquim`
  - real: Joaquim trava a porta dos fundos onde esconde o forasteiro ferido e segue moendo grão, evitando visitas e olhando o estoque de farinha com preocupação.
  - contado: Irmã Clara, a senhora sabe como esta aldeia sempre desconfiou de mim. Ando trancando os fundos do moinho porque não quero visitas — a farinha mal vai durar o inverno e não posso perder tempo com quem só vem julgar. Deixe…
- dia 2, marta → joaquim, sobre `D1.marta`
  - real: Marta examina a orla da floresta em busca de pistas nas carcaças, reforça a cerca do que resta do rebanho e resmunga que o ancião esconde algo sobre o grão.
  - contado: Joaquim, essas carcaças na orla da floresta não são obra de lobo nenhum, eu examinei bem. Reforcei a cerca do que sobrou do rebanho, mas o estrago já tá feito. E o ancião, sempre calado sobre o grão... ele esconde alguma…
- dia 3, anselmo → benedita, sobre `D2.anselmo`
  - real: Anselmo propõe formar uma guarda armada contra os lobos da montanha, reforçando sua autoridade e desviando qualquer pergunta sobre o estoque de grão.
  - contado: Anselmo diz a Benedita que os lobos desceram da montanha de novo e que é preciso formar uma guarda armada, sob seu comando, para proteger a aldeia. Insinua que certa gente anda querendo tomar seu lugar em tempos de perig…

**Narrações do curador (1)**

- trama `D1.anselmo`, dia 6, 3 eventos na cadeia:
  > Anselmo convocou os anciãos para debater as mortes que assolavam o rebanho, insistindo com veemência que a culpa era dos lobos vindos da montanha, e cuidou de evitar qualquer menção ao estoque de grão. Dali, propôs formar uma guarda armada contra os lobos da montanha, o que reforçava sua autoridade perante os demais e, de quebra, desviava toda pergunta que pudesse surgir sobre o estoque de grão. Em seguida, reuniu os homens mais fortes da aldeia para compor essa guarda, falando com firmeza para calar quem ainda ousasse questionar o destino do estoque de grão.

