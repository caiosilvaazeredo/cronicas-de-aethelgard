# Log de sessões: experimentos/validacao/v2-controle-tres-atos-claude

Gerado por `npm run relatorio` em 2026-09-25T14:29:13.110Z.


## porto-das-brumas_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | porto-das-brumas |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"}<br>{"temperatura":null,"semente":"por chamada","via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-haiku-4-5-20251001 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-haiku-4-5-20251001 |
| tempo total de chamadas | 523 s (43.6 s/dia) |
| chamadas | 24 (erros de provedor: 4) |
| falha de estrutura | 1/20 = 5.0%; tentativas médias 1.45 |
| falha por papel | jogador 0/10 · mestre 1/10 |
| tokens entrada / saída | 155140 / 45377 |
| custo | US$ 0.6268 |
| eventos / relatos | 9 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.667 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 15 / 15 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 15 / 0 / 0 / 1 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.73 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Falhas registradas**

- dia 6, mestre: - eventoGerado.conteudo: Too big: expected string to have <=280 characters
- dia 11, jogador: claude -p: You've hit your session limit · resets 2pm (UTC)
- dia 11, mestre: claude -p: You've hit your session limit · resets 2pm (UTC)
- dia 12, jogador: claude -p: You've hit your session limit · resets 2pm (UTC)
- dia 12, mestre: claude -p: You've hit your session limit · resets 2pm (UTC)

**Primeiros eventos**

- `D1.mestre` (cais, tensão 3.5): Ruben, um estivador do Cais Velho, revela a chegada de um navio misterioso no Cais Negro três noites atrás, transportando um caixão lacrado com correntes de ferro. O capitão desapareceu, e a Guarda Portuária investiga.
- `D2.mestre` (taverna, tensão 7, causado por D1.mestre): Na Taverna do Arpão Torto, o marinheiro Otis revela detalhes sobre o navio misterioso: capitão estranho, caixão pesado com sons humanoides, armazenado no Cais Negro sala 7.
- `D3.mestre` (taverna, tensão 8.5, causado por D1.mestre, D2.mestre): Falha Crítica no Suborno: Você oferece suborno à Magistrada Vera em voz alta dentro da Taverna do Arpão Torto, na presença de guardas portuários. Vera te expõe publicamente e dá um ultimato: saia do Porto das Brumas em 3…
- `D4.mestre` (mercado, tensão 8.2, causado por D3.mestre): Perseguição no Mercado do Sal. Um guarda portuário persegue você após você ser reconhecido. Seu tempo está acabando.
- `D5.mestre` (mercado, tensão 9, causado por D3.mestre, D4.mestre): Falha Crítica na Fuga: Você desaba sob montanha de sal no Mercado, completamente visível. Deixa rastro branco óbvio enquanto corre. Quatro guardas agora o perseguem. Seu tempo se esgota.
- `D7.mestre` (armazens, tensão 7.5, causado por D4.mestre, D5.mestre): Camuflado entre sacos de estopa, você escapa dos guardas. Perseguição arrefece, mas o tempo com Vera continua implacável.
- `D8.mestre` (armazens, tensão 8, causado por D5.mestre, D7.mestre): Guardas perdidos, mas o Cais Negro tem patrulhas misteriosas vigiando o Armazém 7. Tempo crítico: 2 horas restantes até a ameaça de Vera se concretizar.
- `D9.mestre` (cais, tensão 8.5, causado por D7.mestre, D8.mestre): Infiltração bem-sucedida no Armazém 7. Tocha verde detectada no interior—possível atividade mágica/contrabando. Pressão temporal: ~100 minutos até ultimato de Vera.

**Últimos eventos**

- `D4.mestre` (mercado, tensão 8.2, causado por D3.mestre): Perseguição no Mercado do Sal. Um guarda portuário persegue você após você ser reconhecido. Seu tempo está acabando.
- `D5.mestre` (mercado, tensão 9, causado por D3.mestre, D4.mestre): Falha Crítica na Fuga: Você desaba sob montanha de sal no Mercado, completamente visível. Deixa rastro branco óbvio enquanto corre. Quatro guardas agora o perseguem. Seu tempo se esgota.
- `D7.mestre` (armazens, tensão 7.5, causado por D4.mestre, D5.mestre): Camuflado entre sacos de estopa, você escapa dos guardas. Perseguição arrefece, mas o tempo com Vera continua implacável.
- `D8.mestre` (armazens, tensão 8, causado por D5.mestre, D7.mestre): Guardas perdidos, mas o Cais Negro tem patrulhas misteriosas vigiando o Armazém 7. Tempo crítico: 2 horas restantes até a ameaça de Vera se concretizar.
- `D9.mestre` (cais, tensão 8.5, causado por D7.mestre, D8.mestre): Infiltração bem-sucedida no Armazém 7. Tocha verde detectada no interior—possível atividade mágica/contrabando. Pressão temporal: ~100 minutos até ultimato de Vera.
- `D10.mestre` (armazens, tensão 8.5, causado por D7.mestre, D8.mestre, D9.mestre): Infiltração falha catastroficamente. Personagem descoberto no Armazém 7 por figura encapuzada armada. Confrontação direta iminente.

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | porto-das-brumas |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-opus-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-opus-5 |
| tempo total de chamadas | 681 s (56.7 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 0/24 = 0.0%; tentativas médias 1.46 |
| falha por papel | jogador 0/12 · mestre 0/12 |
| tokens entrada / saída | 365484 / 45370 |
| custo | US$ 2.3800 |
| eventos / relatos | 12 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 2.333 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 28 / 28 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 28 / 0 / 0 / 0 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.86 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Primeiros eventos**

- `D1.mestre` (cais, tensão 0.3): No Cais Velho, o forasteiro nota o navio Gaivota Cega com carga irregular. Um garoto planta em seu bolso um bilhete com âncora a carvão: "Maré alta. Venha." Uma mulher de couro salgado o observa e indica a taverna O Ânco…
- `D2.mestre` (taverna, tensão 0.4, causado por D1.mestre): Na taverna O Âncora Torta, o taverneiro maneta revela que "maré alta" é um túnel de contrabando sob o Cais Velho que abre às 3h da madrugada. Identifica a mulher de couro salgado como "a Corva" e entrega ao forasteiro um…
- `D3.mestre` (taverna, tensão 0.35, causado por D1.mestre, D2.mestre): No porão da taverna, o forasteiro erra a contagem das portas, cai da escada e é encharcado por um barril de salmoura com arenque. A Corva o encontra e o acolhe: o fedor de peixe vira disfarce involuntário contra a guarda…
- `D4.mestre` (taverna, tensão 0.5, causado por D1.mestre, D2.mestre, D3.mestre): Vestido de estivador, o forasteiro insiste em perguntas e a Corva só responde uma: quer suas mãos e seu rosto desconhecido, ainda não comprado por ninguém no cais. Chegam a um alçapão com três cadeados; a maré sobe ao lo…
- `D5.mestre` (taverna, tensão 0.75, causado por D2.mestre, D3.mestre, D4.mestre): Ao abrir os cadeados, o forasteiro balança a lamparina e derruba o terceiro cadeado, fazendo estrondo. A guarda invade a taverna para 'inspeção de maré'. A Corva apaga a luz, esconde os dois no porão e cobre o alçapão — …
- `D6.mestre` (taverna, tensão 0.75, causado por D3.mestre, D4.mestre, D5.mestre): Imóvel atrás das redes, o forasteiro engana a guarda: o fedor de arenque convence o soldado de que o porão só tem barris estragados. A tropa vai embora, a Corva o aprova, o terceiro cadeado cede e ambos descem ao túnel. …
- `D7.mestre` (taverna, tensão 0.8, causado por D4.mestre, D5.mestre, D6.mestre): Descendo ao túnel da maré, o forasteiro encontra por acaso uma comporta imperial esquecida e abre uma passagem seca acima da linha d'água. A Corva admite que o lugar não consta em mapa algum. Nos degraus secos há pegadas…
- `D8.mestre` (taverna, tensão 0.8, causado por D7.mestre, D6.mestre, D5.mestre): O forasteiro lê bem as pegadas (8+ pessoas ainda no alto), mas tropeça num fio-armadilha ligado a um sino. O alarme soa, tochas se acendem acima e a comporta se fecha com a maré: sem rota de fuga. A Corva saca uma faca e…

**Últimos eventos**

- `D7.mestre` (taverna, tensão 0.8, causado por D4.mestre, D5.mestre, D6.mestre): Descendo ao túnel da maré, o forasteiro encontra por acaso uma comporta imperial esquecida e abre uma passagem seca acima da linha d'água. A Corva admite que o lugar não consta em mapa algum. Nos degraus secos há pegadas…
- `D8.mestre` (taverna, tensão 0.8, causado por D7.mestre, D6.mestre, D5.mestre): O forasteiro lê bem as pegadas (8+ pessoas ainda no alto), mas tropeça num fio-armadilha ligado a um sino. O alarme soa, tochas se acendem acima e a comporta se fecha com a maré: sem rota de fuga. A Corva saca uma faca e…
- `D9.mestre` (cais, tensão 0.85, causado por D6.mestre, D7.mestre, D8.mestre): Bancando estivador bêbado, o forasteiro é capturado no lugar da Corva, que some no escuro. Levado a um armazém imperial secreto, descobre barris da Guilda do Sal cheios de pó azulado fumegante e o mestre-portuário no com…
- `D10.mestre` (armazens, tensão 0.85, causado por D9.mestre, D8.mestre): O disfarce falha: o mestre-portuário percebe o forasteiro memorizando saídas e nota os calos de arrombador. Em vez de matá-lo, aceita-o à força — amarra suas mãos e o droga com o pó azulado (Cinza de Maré) para o embarqu…
- `D11.mestre` (armazens, tensão 0.75, causado por D9.mestre, D10.mestre): Fingindo apagão, o forasteiro mapeia pelo som o 'embarque das quatro': uma doca secreta dentro da rocha, ligada direto à baía sem passar pela guarda. Há outros dois drogados e só dois vigias. Sob o estrado, a Corva começ…
- `D12.mestre` (armazens, tensão 0.85, causado por D9.mestre, D10.mestre, D11.mestre): O forasteiro mapeia a doca pelo som e descobre que um dos outros drogados está acordado e é aliado. A corda é cortada, mas a mão dormente cai e denuncia: o vigia de botas de ferro vem checar. A Corva manda acordar no toq…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | porto-das-brumas |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-sonnet-4-6 |
| tempo total de chamadas | 788 s (65.7 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 0/24 = 0.0%; tentativas médias 1.38 |
| falha por papel | jogador 0/12 · mestre 0/12 |
| tokens entrada / saída | 215343 / 38957 |
| custo | US$ 1.3017 |
| eventos / relatos | 12 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.583 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 19 / 19 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 19 / 2 / 0 / 3 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.47 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Primeiros eventos**

- `D1.mestre` (cais, tensão 0.3): Uma garota desconhecida deixou cair um embrulho de couro encerado misterioso no Cais Velho e fugiu, deixando-o nas mãos do forasteiro.
- `D2.mestre` (cais, tensão 0.45, causado por D1.mestre): O forasteiro abriu o embrulho e encontrou um mapa do píer oeste com marcações secretas e uma lista de nomes, com 'Harwick, o Calafate' em destaque — que agora o observa com suspeita.
- `D3.mestre` (cais, tensão 0.72, causado por D1.mestre, D2.mestre): O forasteiro abordou Harwick de forma completamente desastrosa, pronunciando o nome dele em voz alta com o embrulho comprometedor à vista — agora Harwick está de pé, ameaçador, e dois estivadores testemunharam a cena no …
- `D4.mestre` (cais, tensão 0.65, causado por D2.mestre, D3.mestre): Harwick pegou o embrulho mas não acreditou completamente no forasteiro; arrastou-o para dentro de um armazém para interrogá-lo longe dos estivadores, revelando que a garota 'não deveria ter isso'.
- `D5.mestre` (armazens, tensão 0.87, causado por D2.mestre, D3.mestre, D4.mestre): O forasteiro confessou ter visto a lista. Harwick revelou que os cinco nomes riscados são pessoas mortas por tentar vender segredos à Guarda do Porto — e agora desconfia abertamente se o forasteiro é espião ou apenas idi…
- `D6.mestre` (armazens, tensão 0.65, causado por D5.mestre): Com rolagem 18, o forasteiro convenceu Harwick com lógica e a oferta de vigilância. Harwick verificou a história, confirmou o primeiro dia do forasteiro e aceitou mantê-lo sob custódia — revelando que a garota Mira é fil…
- `D7.mestre` (armazens, tensão 8.5, causado por D5.mestre, D6.mestre): Com rolagem 20, Harwick revelou tudo: os armazéns pertencem à Companhia do Sal Cinza, o capitão Vorren da Guarda do Porto assina os manifestos falsos, e o pai de Mira (Edric) foi morto por tentar denunciar o esquema.
- `D8.mestre` (armazens, tensão 0.72, causado por D6.mestre, D7.mestre): Com rolagem 7, Harwick levou o forasteiro até Mira, mas a garota está hostil — faca na mão, sem disposição para confiar em mais um adulto desconhecido. O acesso foi conquistado, mas a confiança de Mira ainda precisa ser …

**Últimos eventos**

- `D7.mestre` (armazens, tensão 8.5, causado por D5.mestre, D6.mestre): Com rolagem 20, Harwick revelou tudo: os armazéns pertencem à Companhia do Sal Cinza, o capitão Vorren da Guarda do Porto assina os manifestos falsos, e o pai de Mira (Edric) foi morto por tentar denunciar o esquema.
- `D8.mestre` (armazens, tensão 0.72, causado por D6.mestre, D7.mestre): Com rolagem 7, Harwick levou o forasteiro até Mira, mas a garota está hostil — faca na mão, sem disposição para confiar em mais um adulto desconhecido. O acesso foi conquistado, mas a confiança de Mira ainda precisa ser …
- `D9.mestre` (armazens, tensão 0.65, causado por D7.mestre, D8.mestre): Com rolagem 12, o forasteiro sentou no chão, manteve distância e mencionou Edric e a missão pelo nome. Mira baixou a faca parcialmente e fez uma pergunta-teste sobre o mapa — verificando se o forasteiro sabe a resposta o…
- `D10.mestre` (armazens, tensão 0.78, causado por D8.mestre, D9.mestre): Com rolagem 3, a admissão de ignorância convenceu Mira de que o forasteiro é inútil. Ela virou as costas e fechou a conversa — a confiança tentativa se desfez. O forasteiro foi rejeitado como irrelevante.
- `D11.mestre` (armazens, tensão 0.78, causado por D10.mestre): Com rolagem 13, o forasteiro propõe ir sozinho ao píer sete à noite. Harwick aceita relutantemente e revela a marca. Mira, de costas, entrega o sinal secreto do pai — três batidas na viga.
- `D12.mestre` (cais, tensão 8.5, causado por D11.mestre): Com rolagem 12, o forasteiro chegou ao píer sete sem ser detectado, encontrou a viga com a âncora riscada e deu as três batidas. Algo respondeu de baixo do deque — duas batidas deliberadas, indicando que alguém vivo conh…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## porto-das-brumas_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | porto-das-brumas |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-sonnet-5 |
| tempo total de chamadas | 412 s (34.4 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 0/24 = 0.0%; tentativas médias 1.04 |
| falha por papel | jogador 0/12 · mestre 0/12 |
| tokens entrada / saída | 305914 / 35989 |
| custo | US$ 1.0261 |
| eventos / relatos | 12 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.250 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 15 / 15 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 15 / 6 / 3 / 7 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.33 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D6.mestre` → `D7.mestre` (6 | 6); `D7.mestre` → `D8.mestre` (7 | 5); `D8.mestre` → `D9.mestre` (8 | 4)

**Primeiros eventos**

- `D1.mestre` (cais, tensão 2): O forasteiro chega ao Cais Velho de Porto das Brumas e testemunha um descarregamento suspeito sendo ignorado propositalmente pela guarda, perto de um navio sem bandeira ligado à misteriosa 'Maré Cega'.
- `D2.mestre` (taverna, tensão 0.35, causado por D1.mestre): O forasteiro investiga a Taverna do Arpão Torto e descobre pistas sobre a Maré Cega e o Capitão Vess, recebendo um mapa secreto de um armazém suspeito no cais desenhado pela taverneira.
- `D3.mestre` (armazens, tensão 6, causado por D2.mestre): Ao se aproximar furtivamente do armazém suspeito indicado no mapa, o forasteiro tropeça em correntes enferrujadas e faz barulho, sendo quase descoberto por contrabandistas armados que agora vasculham a área.
- `D4.mestre` (armazens, tensão 8, causado por D3.mestre): O forasteiro tenta se esconder e escapar em silêncio, mas um chute acidental em um caixote reacende a suspeita dos contrabandistas, que agora se aproximam de duas direções diferentes pelo beco.
- `D5.mestre` (armazens, tensão 8.5, causado por D3.mestre, D4.mestre): A pedra arremessada pelo forasteiro atinge um sino de alarme no beco, ampliando o alvoroço; ao tentar fugir pela parede molhada, ele escorrega e é flagrado por um segundo contrabandista armado com uma faca curva, que gri…
- `D6.mestre` (armazens, tensão 8, causado por D3.mestre, D4.mestre, D5.mestre): O forasteiro empurra o contrabandista armado e foge gritando por socorro até o cais aberto, mas os dois guardas municipais reagem com hesitação suspeita ao vê-lo, sugerindo cumplicidade com os contrabandistas em vez de o…
- `D7.mestre` (alfandega, tensão 8, causado por D6.mestre): Ignorando a hesitação suspeita dos guardas municipais, o forasteiro corre até a Casa da Alfândega e denuncia o contrabando nos Armazéns da Ponta; o Inspetor-Chefe, já desconfiado há tempos, mobiliza imediatamente toda a …
- `D8.mestre` (alfandega, tensão 0.75, causado por D7.mestre): Ao guiar a guarnição até os Armazéns da Ponta, o barulho da tropa em marcha alerta os contrabandistas com antecedência; eles começam a fugir pelos fundos e ameaçam incendiar a carga, forçando o Inspetor-Chefe a cercar o …

**Últimos eventos**

- `D7.mestre` (alfandega, tensão 8, causado por D6.mestre): Ignorando a hesitação suspeita dos guardas municipais, o forasteiro corre até a Casa da Alfândega e denuncia o contrabando nos Armazéns da Ponta; o Inspetor-Chefe, já desconfiado há tempos, mobiliza imediatamente toda a …
- `D8.mestre` (alfandega, tensão 0.75, causado por D7.mestre): Ao guiar a guarnição até os Armazéns da Ponta, o barulho da tropa em marcha alerta os contrabandistas com antecedência; eles começam a fugir pelos fundos e ameaçam incendiar a carga, forçando o Inspetor-Chefe a cercar o …
- `D9.mestre` (armazens, tensão 8, causado por D8.mestre): Avisado sobre o óleo, o Inspetor-Chefe manda arrombar a porta com um ariete improvisado; o forasteiro ajuda no golpe, que racha mas não derruba a porta, revelando fumaça e pânico dentro do armazém.
- `D10.mestre` (armazens, tensão 0.85, causado por D9.mestre): Ao tentar arrombar a porta pela segunda vez, a viga rachada se parte e o forasteiro e lancado sozinho para dentro do armazem em chamas, separado dos soldados; o ar que entra alimenta o fogo e ele se ve cercado por contra…
- `D11.mestre` (armazens, tensão 0.7, causado por D10.mestre, D9.mestre): O forasteiro desvia do contrabandista dentro do armazém em chamas e corre até a porta dos fundos, avisando o Inspetor-Chefe a tempo; os soldados chegam e cercam a saída bem quando os contrabandistas tentam escapar por al…
- `D12.mestre` (armazens, tensão 6, causado por D11.mestre): Os soldados invadem o armazém pelos fundos e capturam vivo, mas desacordado, o contrabandista da cicatriz; em meio à fumaça, o forasteiro resgata um manifesto de carga selado com um brasão de âncora quebrada citando o no…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-haiku-4-5-20251001_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | vale-silente |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-haiku-4-5-20251001 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-haiku-4-5-20251001 |
| tempo total de chamadas | 499 s (41.6 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 1/24 = 4.2%; tentativas médias 1.50 |
| falha por papel | jogador 0/12 · mestre 1/12 |
| tokens entrada / saída | 214298 / 89220 |
| custo | US$ 0.5429 |
| eventos / relatos | 11 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 2.364 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 26 / 26 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 26 / 0 / 0 / 0 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.88 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Falhas registradas**

- dia 12, mestre: - eventoGerado.conteudo: Too big: expected string to have <=280 characters

**Primeiros eventos**

- `D1.mestre` (praca, tensão 2): Você descobre os primeiros rumores: rebanhos mortos aparecem na floresta. A mulher do poço fala com cautela, como se guardasse segredos. A desconfiança permeia Vale Silente.
- `D2.mestre` (floresta, tensão 7, causado por D1.mestre): Rebanhos mortos exibem marcas de garras estranhas e símbolos rituais. Algo deliberado e inteligente está caçando em Vale Silente.
- `D3.mestre` (casa-conselho, tensão 8.5, causado por D1.mestre, D2.mestre): Os anciãos reagem com terror e hostilidade à revelação dos símbolos rituais. Sussurros de um 'ritual acionado' sugerem que eles sabem exatamente o que está acontecendo em Vale Silente — e podem estar diretamente envolvid…
- `D4.mestre` (ermida, tensão 8.5, causado por D1.mestre, D2.mestre, D3.mestre): Torvin te intercepta na trilha da Ermida. 'Não vá lá.' Com força de morsa, te arrasta de volta. Você vê luz intermitente na Ermida. Ele sussurra ameaça: 'Se contar, desaparece como os carneiros. Os anciãos decidem.'
- `D5.mestre` (ermida, tensão 7, causado por D2.mestre, D3.mestre, D4.mestre): Você escorrega no gelo, cai em galhos, e a porta da Ermida explode como mola, atirando-o para trás. Sua cabeça acerta uma pedra. Os anciãos vêm investigando o estrondo.
- `D6.mestre` (ermida, tensão 9, causado por D4.mestre, D5.mestre): Você espia a Ermida antes dos anciãos chegarem: símbolos rituais, velas em padrão geométrico, criatura multi-ocular empalada no altar. Enganá-los com perfeição é fácil quando está genuinamente apavorado. O segredo perigo…
- `D7.mestre` (praca, tensão 8.5, causado por D4.mestre, D5.mestre, D6.mestre): Velha Solange revela o pacto: há sete gerações, os anciãos aprisionaram a Coisa da Floresta na Ermida, alimentando-a com gado e sangue ritual. O pacto se quebra. O rebanho é insuficiente. Os anciãos enfrentam escolhas de…
- `D8.mestre` (praca, tensão 8, causado por D5.mestre, D6.mestre, D7.mestre): Solange revela fragmento crítico sobre renovação do pacto no solstício, mas é interrompida. Pacto requer sangue antes do inverno ou Ermida abre completamente. Você agora é peça importante neste jogo.

**Últimos eventos**

- `D6.mestre` (ermida, tensão 9, causado por D4.mestre, D5.mestre): Você espia a Ermida antes dos anciãos chegarem: símbolos rituais, velas em padrão geométrico, criatura multi-ocular empalada no altar. Enganá-los com perfeição é fácil quando está genuinamente apavorado. O segredo perigo…
- `D7.mestre` (praca, tensão 8.5, causado por D4.mestre, D5.mestre, D6.mestre): Velha Solange revela o pacto: há sete gerações, os anciãos aprisionaram a Coisa da Floresta na Ermida, alimentando-a com gado e sangue ritual. O pacto se quebra. O rebanho é insuficiente. Os anciãos enfrentam escolhas de…
- `D8.mestre` (praca, tensão 8, causado por D5.mestre, D6.mestre, D7.mestre): Solange revela fragmento crítico sobre renovação do pacto no solstício, mas é interrompida. Pacto requer sangue antes do inverno ou Ermida abre completamente. Você agora é peça importante neste jogo.
- `D9.mestre` (praca, tensão 8.5, causado por D6.mestre, D7.mestre, D8.mestre): Solange revela duas alternativas ao sacrifício: encontrar um bode expiatório voluntário ou banir completamente a Coisa. Ambas requerem ação antes do solstício de inverno. Você agora conhece caminhos arriscados.
- `D10.mestre` (casa-conselho, tensão 9, causado por D7.mestre, D8.mestre, D9.mestre): Aldric e os anciãos revelam conhecimento de sua investigação. Você é agora suspeito. Eles iniciam um ritual antigo enquanto o confronto escala para situação letal.
- `D11.mestre` (casa-conselho, tensão 9, causado por D8.mestre, D9.mestre, D10.mestre): Aldric pausa o ritual e negocia: herói oferece-se voluntariamente como bode expiatório em troca de acesso aos papéis e conhecimento arcano para banição. Anciãos dividem-se internamente, mas veem oportunidade de silenciar…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-opus-5_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | vale-silente |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-opus-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-opus-5 |
| tempo total de chamadas | 16999 s (1416.6 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 0/24 = 0.0%; tentativas médias 1.50 |
| falha por papel | jogador 0/12 · mestre 0/12 |
| tokens entrada / saída | 343199 / 42263 |
| custo | US$ 2.5149 |
| eventos / relatos | 12 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 2.500 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 30 / 30 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 30 / 0 / 0 / 0 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.93 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Primeiros eventos**

- `D1.mestre` (praca, tensão 0.3): No poço do Vale Silente, o forasteiro colhe rumores: ovelhas mortas e dessangradas, a rixa antiga entre Ilse e Harald, e a suspeita do pastor Gunnar sobre como ele entrou no vale isolado. Ao anoitecer, todos se trancam e…
- `D2.mestre` (floresta, tensão 0.6, causado por D1.mestre): Na orla, o forasteiro acha ovelhas em triângulo com cortes de lâmina e sem sangue, pegadas de bota manca da aldeia seguidas por marcas de garras, lã azul do moinho e uma sepultura rúnica raspada. Anoitece e ele está sozi…
- `D3.mestre` (moinho, tensão 0.6, causado por D1.mestre, D2.mestre): No moinho, o forasteiro acusa mal e é expulso. O moleiro Otmar manca do pé direito e tem botas com barro da orla, mas Bruna grita "era o outro pé" antes de ser trancada dentro. Marcas de garras frescas surgem entre ele e…
- `D4.mestre` (casa-conselho, tensão 0.75, causado por D1.mestre, D2.mestre, D3.mestre): Perseguido por algo que desliza sem passos, o forasteiro é puxado para dentro da Casa do Conselho. Os três anciãos estavam reunidos à noite. Abrigam-no, mas se calam sobre a sepultura rúnica. Na mesa, um mapa com três no…
- `D5.mestre` (casa-conselho, tensão 0.85, causado por D2.mestre, D3.mestre, D4.mestre): Harald confessa ter escrito as runas da pedra há 40 anos e a lista atual. Três nomes riscados (Torvald, Magda, um com E) e um quarto curto, não humano. Batidas na porta: a voz de Bruna pede abrigo — mas Ilse diz que Brun…
- `D6.mestre` (casa-conselho, tensão 0.85, causado por D3.mestre, D4.mestre, D5.mestre): Ilse revela: Bruna morreu no açude e Otmar a enterrou junto à pedra rúnica, oferecendo-a à Coisa — que a recusou. A lista é um pacto de 40 anos. O quarto nome, 'Ase', é o da própria Coisa: escrevê-lo significa tomar seu …
- `D7.mestre` (casa-conselho, tensão 0.85, causado por D4.mestre, D5.mestre, D6.mestre): O forasteiro descobre que as runas CONTÊM Ase, e a lista é que a mantém acordada. Harald queima o carvão; ninguém assina. Sobrevivem à noite até o sino do amanhecer. Otmar é achado vivo e embranquecido no degrau, e a ter…
- `D8.mestre` (casa-conselho, tensão 0.85, causado por D5.mestre, D6.mestre, D7.mestre): Otmar acorda mudo — a Coisa levou sua voz — e confessa por desenho: enterrou Bruna sob a pedra não como oferenda, mas como cela, raspando as runas para abri-la. Sem pacto, a terra sobre a pedra se abre: pegadas descalças…

**Últimos eventos**

- `D7.mestre` (casa-conselho, tensão 0.85, causado por D4.mestre, D5.mestre, D6.mestre): O forasteiro descobre que as runas CONTÊM Ase, e a lista é que a mantém acordada. Harald queima o carvão; ninguém assina. Sobrevivem à noite até o sino do amanhecer. Otmar é achado vivo e embranquecido no degrau, e a ter…
- `D8.mestre` (casa-conselho, tensão 0.85, causado por D5.mestre, D6.mestre, D7.mestre): Otmar acorda mudo — a Coisa levou sua voz — e confessa por desenho: enterrou Bruna sob a pedra não como oferenda, mas como cela, raspando as runas para abri-la. Sem pacto, a terra sobre a pedra se abre: pegadas descalças…
- `D9.mestre` (floresta, tensão 0.88, causado por D6.mestre, D7.mestre, D8.mestre): Na pedra aberta o forasteiro acha a vala forrada de lã azul e a marca de algo grande que saiu. Bruna aparece viva-morta, mas aliada: ela segurava Ase. Quem foi à aldeia é a Coisa — e foi buscar o sino da capela, que marc…
- `D10.mestre` (ermida, tensão 0.9, causado por D7.mestre, D8.mestre, D9.mestre): O forasteiro escorrega na encosta e chega tarde. Ase toca o sino da Ermida seis vezes, sem sétima badalada, desfazendo o amanhecer: às nove da manhã o Vale Silente começa a anoitecer. Bruna tapa os ouvidos, derrotada.
- `D11.mestre` (ermida, tensão 0.92, causado por D8.mestre, D9.mestre, D10.mestre): O forasteiro arranca a sétima badalada e devolve o amanhecer ao vale. Mas a corda arrebenta e Ase desce do campanário: corpórea, com as runas raspadas gravadas no peito, falando com as vozes dos anciãos. Ela agora sabe o…
- `D12.mestre` (ermida, tensão 0.88, causado por D9.mestre, D10.mestre, D11.mestre): Na soleira da Ermida a luz das sete badaladas barra Ase, que para sem atacar. Bruna revela: as runas raspadas da pedra estão gravadas no peito da criatura. Otmar e os três anciãos sobem a colina com pá, mapa e carvão.

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-4-6_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | vale-silente |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-4-6 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-sonnet-4-6 |
| tempo total de chamadas | 960 s (80.0 s/dia) |
| chamadas | 24 (erros de provedor: 0) |
| falha de estrutura | 0/24 = 0.0%; tentativas médias 1.46 |
| falha por papel | jogador 0/12 · mestre 0/12 |
| tokens entrada / saída | 229306 / 50582 |
| custo | US$ 1.5013 |
| eventos / relatos | 12 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.667 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 20 / 20 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 20 / 0 / 0 / 2 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.55 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Primeiros eventos**

- `D1.mestre` (praca, tensão 2): O forasteiro conversa com Marta, a lavadeira, no poço central. Ela revela: três rebanhos mortos sem sangue na orla da floresta, a estrada soterrada há 10 dias e o sumiço do velho Aldric desde a segunda morte.
- `D2.mestre` (floresta, tensão 0.65, causado por D1.mestre): Na orla da floresta: carcaças arrastadas de dentro pra fora, marcas em espiral gravadas nas árvores e uma única pegada humana (homem velho) apontando para o interior da floresta. Não foi predador — parece ritual.
- `D3.mestre` (casa-conselho, tensão 0.6, causado por D1.mestre, D2.mestre): No Conselho, os anciãos negam saber do sumiço de Aldric. Ao ouvir 'marcas em espiral', Pela (curandeira) reage visivelmente antes de se controlar. O forasteiro é dispensado, mas fica claro que alguém mente.
- `D4.mestre` (casa-conselho, tensão 0.65, causado por D2.mestre, D3.mestre): Pela, interceptada a sós, sussurra 'Rito do Silêncio' e revela que Aldric 'foi' por vontade própria. Antes de continuar, avista Oswyn na esquina e recua, encerrando a conversa.
- `D5.mestre` (ermida, tensão 0.65, causado por D4.mestre): Na Ermida da Colina, o guardião Eremund reagiu com pânico ao ouvir 'Rito do Silêncio', gritando se Aldric havia enviado o forasteiro, antes de trancar a porta. Eremund claramente conhece o Rito e tem ligação com Aldric.
- `D6.mestre` (ermida, tensão 0.65, causado por D4.mestre, D5.mestre): Eremund revela o Rito do Silêncio: pacto antigo com criatura da floresta. Aldric foi quebrá-lo contra a vontade do Conselho. Os rebanhos mortos confirmam que o pacto foi rompido e a criatura não está mais contida.
- `D7.mestre` (floresta, tensão 0.87, causado por D4.mestre, D6.mestre): Seguindo o rastro com precisão crítica, o forasteiro alcança clareira ritual no coração da floresta. Aldric está vivo mas imóvel entre dois planos. Mensagem gravada revela: quebrar o pacto exige testemunha que saiba o ve…
- `D8.mestre` (ermida, tensão 8.5, causado por D6.mestre, D7.mestre): Eremund revela o nome verdadeiro da criatura: 'Vael'Sithren'. Ao pronunciá-lo em voz alta pela primeira vez em trinta anos, sofre colapso físico. O forasteiro tem o nome, mas Eremund está incapacitado e Aldric espera na …

**Últimos eventos**

- `D7.mestre` (floresta, tensão 0.87, causado por D4.mestre, D6.mestre): Seguindo o rastro com precisão crítica, o forasteiro alcança clareira ritual no coração da floresta. Aldric está vivo mas imóvel entre dois planos. Mensagem gravada revela: quebrar o pacto exige testemunha que saiba o ve…
- `D8.mestre` (ermida, tensão 8.5, causado por D6.mestre, D7.mestre): Eremund revela o nome verdadeiro da criatura: 'Vael'Sithren'. Ao pronunciá-lo em voz alta pela primeira vez em trinta anos, sofre colapso físico. O forasteiro tem o nome, mas Eremund está incapacitado e Aldric espera na …
- `D9.mestre` (floresta, tensão 0.88, causado por D7.mestre, D8.mestre): O forasteiro pronuncia 'Vael'Sithren' na clareira como testemunha do fim do pacto. Aldric desperta do transe e reconhece a testemunha como válida. A criatura se manifesta na borda da clareira — o ritual foi aceito, mas a…
- `D10.mestre` (floresta, tensão 0.87, causado por D9.mestre): O forasteiro mantém a posição de testemunha mas falha em manter a compostura diante de Vael'Sithren. A criatura avança e avalia a fraqueza humana do testemunho. O ritual não quebra, mas a criatura registra o custo da tes…
- `D11.mestre` (floresta, tensão 0.82, causado por D9.mestre, D10.mestre): O forasteiro sustenta o olhar de Vael'Sithren com firmeza e é reconhecido como testemunha legítima. A criatura se volta para Aldric para a fase final do ritual. O pacto aguarda apenas a palavra de encerramento.
- `D12.mestre` (floresta, tensão 0.88, causado por D9.mestre, D10.mestre, D11.mestre): Vael'Sithren conclui o pacto com Aldric na presença do forasteiro como testemunha válida, mas revela que a aldeia de Vale Silente possui uma conta ainda em aberto com ela — uma dívida coletiva anterior ao pacto de Aldric…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão


## vale-silente_claude-cli-claude-sonnet-5_controle-tres-atos_jog-investigador_r01

| campo | valor |
|---|---|
| tipo | controle de três atos |
| mundo | vale-silente |
| agentes | (mestre) |
| estado das tramas no prompt | nao-informa |
| jogador | investigador |
| dias | 12 |
| semente | 501 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":null,"semente":null,"via":"claude-cli"}<br>{"temperatura":null,"semente":"por chamada","via":"claude-cli"} |
| modelo agentes / jogador / curador | claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 · claude-cli/claude-sonnet-5 |
| modelos efetivos | jogador: claude-sonnet-5<br>mestre: claude-sonnet-5 |
| tempo total de chamadas | 508 s (42.3 s/dia) |
| chamadas | 24 (erros de provedor: 1) |
| falha de estrutura | 0/23 = 0.0%; tentativas médias 1.39 |
| falha por papel | jogador 0/12 · mestre 0/11 |
| tokens entrada / saída | 337134 / 44845 |
| custo | US$ 1.1717 |
| eventos / relatos | 11 / 0 |
| tramas surgidas / fechadas | 1 / 0 (0.0%) |
| tramas abertas por dia | 0 1 1 1 1 1 1 1 1 1 1 1 |
| razão de amarração final | 1.364 |
| eventos fundadores | 1 |
| causadoPor: referências / arestas / descartadas | 15 / 15 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 0 |
| linhagem: nascidas / fechadas por estabilidade / absorvidas por fusão / abertas no fim | 1 / 0 / 0 / 1 (recalculada pela reanálise) |
| proporção fechadas por estabilidade (emenda 1) | 0.0% |
| grafo: ligações / pontes / pontes de fusão / articulações | 15 / 4 / 1 / 4 |
| grafo: distância média das ligações (dias) / além de 3 dias | 1.40 / 0 |

**Linhagem das tramas**

- `D1.mestre` (nasceu no dia 2): aberta no fim da sessão

**Pontes de fusão** (ligação única entre duas linhas com 3+ eventos): `D3.mestre` → `D4.mestre` (3 | 8)

**Falhas registradas**

- dia 12, mestre: claude -p: You've hit your session limit · resets 2pm (UTC)

**Primeiros eventos**

- `D1.mestre` (praca, tensão 2): O forasteiro chega ao Vale Silente e, junto ao poço da praça, conhece Ottilie, uma moradora que revela pistas sobre o deslizamento que isolou a estrada e os ataques misteriosos aos rebanhos, além de mencionar o comportam…
- `D2.mestre` (floresta, tensão 0.35, causado por D1.mestre): O forasteiro examina os rebanhos mortos na orla da floresta: sem sangue, lã arrancada em tufos, marcas de garra que se arrastam para dentro da mata e um símbolo espiral entalhado numa árvore. Um galho estala nas sombras …
- `D3.mestre` (praca, tensão 0.55, causado por D2.mestre): O forasteiro tropeça ao recuar da floresta, alertando algo nas sombras, e chega desajeitado à praça. Pastor Alrik, ao vê-lo, entra em pânico e se tranca na capela, murmurando sobre 'o espiral'.
- `D4.mestre` (ermida, tensão 0.5, causado por D3.mestre): O forasteiro bate insistentemente na porta da capela exigindo respostas sobre o espiral. Alrik, em pânico, barra a porta por dentro e sussurra 'o espiral voltou', sem revelar nada. Ottilie observa tudo de longe, de braço…
- `D5.mestre` (praca, tensão 0.4, causado por D4.mestre): O forasteiro pressiona Ottilie sobre o espiral, mas a abordagem rude a fecha. Ela nega saber, mas escapa uma pista: os gêmeos Bartholt desenhavam espirais na lama quando crianças, antes de tudo mudar.
- `D6.mestre` (praca, tensão 0.55, causado por D5.mestre): O forasteiro localiza os gêmeos Bartholt consertando uma cerca; ao ouvir sobre o espiral, um deles reage com pesar, revelando que temiam que um segredo antigo enterrado viesse à tona novamente.
- `D7.mestre` (praca, tensão 0.75, causado por D4.mestre, D5.mestre, D6.mestre): Os gêmeos Bartholt revelam a origem do espiral: viajantes forasteiros de 30 anos atrás, o desaparecimento de 3 moradores (incluindo o irmão de Alrik) e a suspeita de que a estrada foi soterrada de propósito para selar o …
- `D8.mestre` (ermida, tensão 8, causado por D6.mestre, D7.mestre): O forasteiro grita o nome do irmão desaparecido de Alrik, forçando-o a abrir a porta em pânico; no confronto, um relicário se quebra revelando um selo em espiral escondido na capela — mas o segredo agora é público, expos…

**Últimos eventos**

- `D6.mestre` (praca, tensão 0.55, causado por D5.mestre): O forasteiro localiza os gêmeos Bartholt consertando uma cerca; ao ouvir sobre o espiral, um deles reage com pesar, revelando que temiam que um segredo antigo enterrado viesse à tona novamente.
- `D7.mestre` (praca, tensão 0.75, causado por D4.mestre, D5.mestre, D6.mestre): Os gêmeos Bartholt revelam a origem do espiral: viajantes forasteiros de 30 anos atrás, o desaparecimento de 3 moradores (incluindo o irmão de Alrik) e a suspeita de que a estrada foi soterrada de propósito para selar o …
- `D8.mestre` (ermida, tensão 8, causado por D6.mestre, D7.mestre): O forasteiro grita o nome do irmão desaparecido de Alrik, forçando-o a abrir a porta em pânico; no confronto, um relicário se quebra revelando um selo em espiral escondido na capela — mas o segredo agora é público, expos…
- `D9.mestre` (ermida, tensão 7, causado por D8.mestre, D7.mestre): Alrik, abalado pela exposição pública do segredo, conta a verdade: seu irmão Theodric seguiu os viajantes do espiral há 30 anos, e o relicário quebrado era um selo feito para conter o que os levou.
- `D10.mestre` (ermida, tensão 0.8, causado por D9.mestre, D8.mestre): Alrik colapsa ao ser questionado sobre o selo: revela que ele mesmo é a única barreira há 30 anos. Um sino toca sozinho lá fora e a aldeia se tranca em pânico, sugerindo que algo já despertou.
- `D11.mestre` (ermida, tensão 0.8, causado por D10.mestre): O forasteiro sai correndo da capela e localiza a origem do sino: a terra treme perto do curral e uma névoa cinza-esverdeada com um símbolo espiral se forma na orla da floresta. Alrik confirma, horrorizado: a barreira sel…

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão

