# Skullshift

Jogo de duelo 2D de ação, feito com Phaser 3, TypeScript e Vite. Você começa como um esqueleto e corre até o fim do mapa. Qualquer golpe mata. Pegue o item de outro personagem para se transformar nele.

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Importe os sprites (eles não ficam no Git, veja **Sprites** abaixo):

   ```bash
   scripts/import-assets.sh caminho/Tiny_Swords_Enemy_Pack.zip caminho/Tiny_Swords_Free_Pack.zip caminho/anak_manja.zip caminho/matcha_style.zip
   ```

   O terceiro zip é a fonte **Anak Manja** (títulos), e o quarto, opcional, é a **Matcha Style** (textos de instrução). A Anak Manja é da Khurasan Studio e é livre para uso pessoal e comercial. O script gera uma versão com os acentos do português, que a fonte original não tem, e para isso precisa do `fonttools` (`pip install fonttools`). Sem a fonte, o jogo usa Arial Black.

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

O comando `npm run build` gera a versão final em `dist/`. Os caminhos são relativos, então o build pode ser hospedado na web ou empacotado com Electron para a Steam.

### Logo

A logo (`public/assets/logo/logo.svg`) é montada a partir dos SVGs do Esqueleto e do Xamã e da fonte Anak Manja. O nome vira contorno, então a logo não depende da fonte instalada. Para gerar, copie `Skull_frame1.svg` e `Hex_Shaman_frame1.svg` para `public/assets/logo/` e rode:

```bash
python3 scripts/build-logo.py public/assets/logo/skull.svg public/assets/logo/shaman.svg public/fonts/anak-manja-pt.ttf
```

Sem a logo, a tela inicial mostra o nome em texto.

## Fases

Cada fase tem **5 cenários** (telas; o voo tem 6): o central, 2 à direita e 2 à esquerda. A câmera desliza de um cenário para o outro. No versus, a fase é escolhida no menu (◀ ▶); no modo história, no mapa-múndi, que é uma faixa larga que rola acompanhando o esqueleto.

O modo história tem **22 fases** em ordem (o número é a posição na lista `LEVELS`), mais **1 secreta**:

| # | Fase | Tipo | O que tem |
|---|---|---|---|
| 1 | Ilhas da Maré | Plataforma (o básico) | Praia e água; vidas infinitas |
| 2 | Caverna Úmida | Plataforma | Aranhas penduradas no teto. **Segredo:** um rolo de filme no alto de uma plataforma |
| 3 | Oficina da Chave | **Chave e porta** | Escada, molas; ensina a carregar a chave |
| 4 | Ninho das Teias | Plataforma | Teto cheio de aranhas; dá para passar sem derrotar todas |
| 5 | Covil da Rainha | Plataforma + **chefe** | Aranha-Rainha no fim |
| 6 | Pradaria dos Ossos | **Corrida e tiro** | Segurar ATACAR dispara ossos; inimigos em ondas |
| 7 | Blocos Trocados | **Chave e porta** | Alavancas de cor: só os blocos da cor ativa são sólidos |
| 8 | Forja Vulcânica | Áreas travadas + **chefe** | Minotauro Rubro no fim |
| 9 | Fuga da Forja | **Perseguição** | Onda gigante de lava, chão que desaba, tirolesas, meteoros |
| 10 | Mina Rachada | **Chave e porta** | Pedras de ouro que só caem com o martelo |
| 11 | Duelo no Céu | **Avião + chefe** | Montado no Abelhão; no fim, o Diabrete Gigante (barra de vida, leque de tiros, rajadas miradas, bote, morcegos) |
| 12 | Santuário das Nuvens | Plataforma | Nuvens encantadas |
| 13 | Correntes do Céu | Ventos e planar | Colunas de vento; segurar PULAR plana |
| 14 | Bosque do Lenhador | **Chave e porta** | Machado derruba árvore que vira ponte; ovelha na placa abre o portão |
| 15 | Voo Noturno | Voo com tiro | Montado no morcego gigante |
| 16 | Mina de Ouro | **Corrida e tiro** | Tochas, aranhas e morcegos em ondas |
| 17 | Escadaria da Maré | Combinações | Pulo duplo, pique + pulo duplo |
| 18 | Torre do Escalador | **Chave e porta** | A chave no alto da torre (picareta) e escada para descer |
| 19 | Mausoléu do Xamã | **Desafio do mausoléu** | Proteger a urna de 6 ondas de assombrações vindas dos dois lados (3 toques e ela quebra) |
| 20–22 | Casa das Portas, Biblioteca Assombrada, Casa Sem Luz | Quebra-cabeças | Portas, chave e alavancas, escuridão e velas |
| ★ | Desenho Perdido (1930) | **Secreta**, corrida e tiro | Em **preto e branco**, com grão de película, vinheta, riscos e tremido de projetor. Aparece no mapa (ilha de filme, ligada à caverna) depois de achar o rolo de filme |

**Fases de chave e porta:** leve a **chave dourada** até a **porta trancada** (com ela na mão não dá pulo duplo nem escalar). Cada uma tem **3 presentes** opcionais (carne, madeira e ouro, dos recursos do Tiny Swords) para os 100%; ficam salvos no save e aparecem sob o medalhão no mapa. Mecânicas: escadas (↑ / ▼), molas, alavancas de cor, pedras de ouro, árvores, ovelhas que andam sozinhas (e podem ser carregadas e arremessadas), placas de pressão e portões.

### Habilidades da caveira

Liberadas ao concluir certas fases (um painel "NOVA HABILIDADE!" aparece no mapa); ícones das ferramentas do Tiny Swords:

| Habilidade | Liberada depois de | Como usar |
|---|---|---|
| Mãos de Osso | Caverna Úmida | PEGAR levanta chave/ovelha; PEGAR de novo solta; ATACAR arremessa |
| Cambalhota e Parada de Mão | Oficina da Chave | Agachado + PULAR: salto de parada de mão; virar e pular: cambalhota para trás (ambos mais altos) |
| Martelo | Forja Vulcânica | No ar, ▼ + ATACAR: martelada no chão (quebra pedras de ouro, atordoa inimigos) |
| Machado | Santuário das Nuvens | ATACAR numa árvore: ela cai e vira ponte |
| Picareta | Escadaria da Maré | Encostar numa parede no ar: sobe sozinha (como a aranha) |

No modo livre, todas as habilidades e a fase secreta ficam liberadas.

Casas assombradas, perseguição, voo, chave e porta, corrida e tiro, mausoléu e a secreta são só do modo história; o versus usa as fases de plataforma.

### Chefes (estilo Mega Man)

Ao entrar na arena, um portão de ferro desce atrás do jogador, a tela pisca **"! PERIGO !"**, o chefe cai do teto e a **barra de vida enche gomo por gomo**. Cada golpe tira um gomo; com metade da vida o chefe pisca em vermelho, fica mais rápido e passa a **combinar padrões**. Se o jogador cai, o chefe volta com a vida cheia (como nos clássicos).

- **Minotauro Rubro, Senhor da Forja** (paleta trocada à mão: carmim, chifres de ouro, olhos vermelhos): investida até a parede (que derruba pedras do teto avisadas no chão), salto esmagador com ondas de choque pelo chão, marretada tripla avançando, chuva de brasas.
- **Aranha-Rainha, Mãe do Covil** (paleta de viúva-negra, com coroa): sobe pelo fio e despenca em cima do jogador, cospe bolas de teia que **prendem** (dá para atacar e defender, mas não andar), chama filhotes, anda pelo teto soltando fios de teia como lanças, bote rasteiro.
- **Derrota:** congelamento no golpe final, a barra esvazia, explosões em cadeia pelo corpo piscando em branco, clarão na tela e **orbes de energia em estrela** em dois anéis.

**Poderes especiais:**
- **Morcego:** no lugar do pulo duplo, voa subindo enquanto PULAR estiver apertado, por até 2 segundos. Uma barrinha de fôlego aparece sobre a cabeça e recarrega ao tocar o chão.
- **Aranha:** gruda em qualquer parede que encostar no ar e sobe sozinha. Passiva **sentido aranha**: ela nunca cai. No ar sem chão embaixo, aparecem rabiscos azuis e vermelhos ao redor da cabeça, o tempo desacelera, uma badge surge no canto da tela e ela se puxa com uma teia até o chão mais próximo. O efeito é discreto: dois rabisquinhos vermelhos sobre a cabeça e uma badge pequena vermelha.
- **Lagarto (passiva: nado):** na água (fases 1 e 2) ele não se afoga. Não anda: o corpo deita para a frente (encabeça) como quem nada, mais quanto mais rápido vai, com uma ondulação no ritmo das braçadas. Boia com a cabeça para fora, nada com aceleração macia deixando ondinhas e rastro, mergulha segurando ▼ (soltando bolhas) e salta para fora com PULAR. Uma camada translúcida na frente da água faz a parte submersa de qualquer personagem parecer dentro d'água.
- **Pique:** toque duas vezes na direção e segure para correr bem mais rápido, levantando poeira. No teclado de 1 jogador, Shift também ativa o pique.
- **Bolha de energia:** quem não tem escudo no sprite (todos menos o esqueleto) defende dentro de uma bolha na cor do jogador. Quando a defesa quebra, a bolha estoura.
- **Aranhas penduradas:** o fio balança no teto da caverna. Quando um jogador passa por baixo, a aranha salta em cima dele (a defesa não segura ataque de cima) e depois vira uma inimiga comum. No versus, ela ataca os dois.
- **Morcego × teia:** se o morcego encosta numa teia do teto, ele gruda. Uma aranha desce pelo fio, cospe teia até ele virar um casulo, a tela pisca e só sobra a aranha mastigando no lugar dele. Para jogador, a tela perde a cor e a faixa **"VIROU COMIDA DE ARANHA"** fica uns 3 segundos na tela antes de o Xamã trazê-lo de volta.

As plataformas altas são blocos maciços: dá para subir pulando, e elas bloqueiam pelos lados. Degraus de 2 tiles e as plataformas flutuantes mais altas pedem pulo duplo. As flutuantes se atravessam por baixo e seguram quem cai em cima, como num jogo de plataforma clássico. Ossos, arpões e bolotas arremessados caem no chão e viram item.

## Modos

- **História (1 jogador):** começa num **mapa-múndi** em pixel art com as 4 ilhas ligadas por uma trilha; a caveira anda até a fase escolhida e as seguintes se abrem ao vencer (o progresso fica salvo no navegador). Antes de cada fase há uma **visual novel** com retratos grandes; depois da última (fase 5), um epílogo. Em cada fase, comece na ponta esquerda e chegue ao fim do lado oposto, atravessando os 5 cenários contra inimigos controlados pela IA. Ao morrer, você volta ao último checkpoint. Quando o cenário fica sem inimigos, aparece "VAI ➜".
- **Versus (2 jogadores locais):** a partida começa no cenário central, como no mockup. Os dois começam como esqueleto. O P1 vai para a direita e o P2 para a esquerda. Quem mata ganha a vez: só ele pode sair pela borda da tela e levar a câmera para o próximo cenário. O outro renasce à frente dele. Vence quem chegar ao fim do lado oposto.

**Quem é quem:** o P1 é **azul** e o P2 é **vermelho**. Cada personagem tem:
- uma aura pulsando atrás do corpo;
- um anel no chão sob os pés;
- uma etiqueta "P1"/"P2" sobre a cabeça.

Também ficam na cor do jogador o disco do avatar e o nome no HUD, o efeito de transformação, o "P1!"/"P2!" ao renascer, o brilho dos projéteis, as metades do teclado e os botões de toque.

A chegada abre uma animação de vitória: holofote, confete, fogos, o vencedor comemorando e uma faixa com o avatar.

## Saves, dificuldade e vidas (modo história)

No mapa, clicar (ou tocar) duas vezes na fase de destino faz o esqueleto correr até ela, 4× mais rápido; Enter / A durante a caminhada também acelera.

**HISTÓRIA** abre a tela de saves: 3 slots, cada um com a fase em que parou, os medalhões das fases concluídas, a dificuldade e a data do último jogo. CONTINUAR segue de onde parou; APAGAR pede confirmação. Slot vazio: NOVO JOGO em Normal ou Difícil (cada save tem a sua dificuldade e as suas falas já vistas). Saves antigos viram o Save 1.

- **Normal:** se morrer mais de 5 vezes na mesma fase, a fase recomeça do início.
- **Difícil:** na 3ª morte, a fase recomeça do início.
- **Fase 1:** vidas infinitas em qualquer dificuldade (o Xamã sempre traz de volta ao checkpoint).

As vidas restantes aparecem como caveirinhas no canto da tela; quando acabam, a tela perde a cor, aparece "A FASE RECOMEÇA" e a fase reinicia (sem repetir a visual novel).

**Mundo 1 = o básico:** a primeira fase só ensina o essencial (andar, pular, atacar, defender, pegar itens) e tem vidas infinitas. As combinações de ações ficam para a fase 5.

**Modo livre (temporário, para testes):** a terceira opção do menu abre o mapa com todas as fases liberadas, entra direto na fase (sem visual novel), com vidas infinitas e sem salvar nada.

**Tubarão (passiva):** a água é um trampolim. Ao cair nela, ele mergulha inclinando o focinho para baixo, vira para cima e é lançado bem alto, com controle no ar.

**Goblin Lanceiro (passiva):** ao começar a correr, dá um **dash**: uma arrancada rápida em linha reta, com rastro na cor do jogador (recarrega em ~0,65 s).

**Agachar:** cada personagem tem uma pose agachada desenhada a partir do próprio sprite: a cabeça (e armas, cristas, chifres) fica intacta e só o corpo de baixo perde linhas de pixel, como joelhos dobrando. Morcego e abelha, que voam, só descem. A aranha continua como antes.

## Lore

Só dois personagens conversam: a **caveira** (o Xamã a batiza de "Ossian") e o **Xamã Hex**. Na superfície, Hex é um conselheiro: a Coroa dos Ossos foi quebrada em quatro e, inteira, abre o Portão da Maré, o caminho de casa. Ele dá à caveira o dom de tomar a forma das criaturas e a busca na sua nuvem toda vez que ela cai.

Por baixo, fase a fase, as pistas sugerem outra coisa: a caveira lembra de lanternas sobre um rio e de uma queda; a cada morte vê uma luz morna e ouve o seu nome verdadeiro, mas a nuvem de Hex chega sempre antes; na caverna há nomes "Ossian" riscados na pedra; o Xamã não chega perto do fogo; no santuário há coroas quebradas e lanternas apagadas. Na **primeira transformação** do modo história, o jogo congela, Hex desce na nuvem e explica o dom em balões de fala ("tua alma está solta dos ossos"). Depois, **na primeira vez em cada forma**, a caveira solta um comentário sarcástico num balão, sem pausar. Isso fica salvo no navegador e só acontece uma vez; atacar, pular ou tocar na tela passa a fala. No modo história, Hex murmura frases como "Ainda não." ao reviver a caveira. Nada é dito com todas as letras. O epílogo deixa a escolha em aberto: atravessar a luz e esquecer tudo, ou ficar e reinar no lugar de Hex. O texto está em `src/data/lore.ts`.

## Controles

Depois de escolher o modo, cada jogador escolhe o dispositivo na tela **Escolha o controle**:

- **Teclado:** no versus, o teclado se divide em duas predefinições, a esquerda para o P1 e a direita para o P2.
- **Controle 1 / Controle 2:** aparecem cinza enquanto não estão conectados. O navegador só detecta o controle depois que você aperta um botão nele.
- **Toque:** botões virtuais na tela, já selecionados por padrão no celular. No versus, cada jogador fica com um lado da tela.

**2 jogadores no mesmo celular:** com os dois no "Toque" e o celular em pé sobre a mesa, a tela se divide. O P1 joga na metade de baixo e o P2 na de cima, que mostra o jogo de ponta-cabeça (cada um vê a mesma partida do seu lado, com o HUD e os botões de frente para si). Faixas de abertura, badges e a vitória aparecem para os dois. Com controle ou teclado conectado, o celular em pé usa a tela única normal.

**Celular deitado ou em pé:** com o celular deitado, o jogo ocupa a tela inteira e os botões ficam por cima. Em pé, o topo mostra avatares, cenários e o menu, o meio mostra o mundo com zoom (a câmera segue o personagem dentro do cenário) e embaixo fica um painel grande de botões. No versus em pé, o painel se divide ao meio, metade para cada jogador. Girar o aparelho reorganiza a tela sem reiniciar a partida.

Em seguida, a tela **Como jogar** mostra os botões do dispositivo escolhido.

| Ação | Teclado (1 jogador) | Predefinição 1 | Predefinição 2 | Controle | Toque |
|---|---|---|---|---|---|
| Mover | A/D ou ←/→ | A/D | ←/→ | Analógico ou direcional | ◀ ▶ |
| Pular | W, ↑ ou Espaço | W | ↑ | A | PULA |
| Defender | Q ou K | Q | Shift ou / | B, LB ou RB | DEF |
| Agachar | S ou ↓ | S | ↓ | Para baixo | ▼ |
| Atacar | F ou J | F | Enter ou 0 (numérico) | X | ATQ |
| Pegar item | E ou L | E | . ou 1 (numérico) | Y | PEGA |

Com um oponente perto, segurar para **trás** faz o personagem andar devagar com o escudo levantado, como em jogo de luta. O escudo bloqueia golpes e projéteis que vêm pela frente.

**Movimentos:**
- **Agachar:** o personagem anda agachado, mais devagar. Ossos e arpões passam por cima dele, e o golpe dado agachado é **baixo**: só a defesa agachada segura.
- **Pulo duplo:** aperte pular de novo no ar para dar uma cambalhota com um segundo impulso.
- **Quebra de defesa:** um golpe à queima-roupa, com os dois colados, quebra o escudo. O defensor fica tonto por quase 1 segundo, com estrelinhas girando sobre a cabeça.
- **Revivendo:** o xamã chega numa nuvem trazendo o espírito do personagem pendurado numa linha, conjura, o corpo inteiro se forma no chão e ele vai embora flutuando devagar.
- **Água:** respingo na superfície, ondas, gotas e bolhas, e o corpo afunda recortado pela linha d'água. Também há espuma batendo nos penhascos, ondas correndo, nuvens à deriva, rajadas de vento e folhas voando. Para testar os botões de toque no PC, abra o jogo com `?touch=1` na URL.

### Gestos ou mouse

Na tela de controles há a opção **Gestos ou mouse**: joga-se só com o dedo na tela (sem botões virtuais) ou só com o mouse. Onde o dedo/clique encosta vira o centro de um manche flutuante (aparece translúcido na tela):

| Gesto | Ação |
|---|---|
| Arrastar para os lados | Andar (arrastar longe: pique) |
| Deslizar rápido para cima | Pular (de novo no ar: pulo duplo; segurar depois: voo do morcego) |
| Arrastar para baixo | Agachar |
| Toque/clique rápido | Atacar |
| Segurar parado | Pegar o item |
| Segundo dedo na tela / botão direito do mouse | Defender |
| Botão do meio do mouse | Pegar o item |

No versus, só um jogador pode usar gestos, e não junto com os botões de toque (os dois usariam a tela inteira).

## Transformações (fase 1)

| Item | Vira | Ataque |
|---|---|---|
| Osso | Gnoll | Arremessa ossos |
| Arpão | Tubarão-Arpão | Arremessa arpão (rápido) |
| Lança | Goblin Lanceiro | Golpe de lança de longo alcance (frente e trás) |
| Crista | Lagarto | Abre a crista e golpeia dos dois lados |

Pegar é **opcional**. Em cima de um item aparece um balão na cor do jogador, com o botão e o personagem ("E pegar · Gnoll"), e a transformação só acontece se o jogador apertar **Pegar**. Os itens aparecem no mapa e também caem de inimigos ou jogadores transformados quando eles morrem; o lagarto, por exemplo, solta a crista. Ao morrer, você volta ao personagem base. O avatar do HUD acompanha a transformação.

## Pausa e configurações

**Esc**, **P**, o botão **MENU** da tela ou **Start** do controle pausam o jogo: CONTINUAR, CONFIGURAÇÕES, REINICIAR FASE e SAIR (para o mapa ou o menu). As configurações também abrem pelo menu inicial (opção CONFIGURAÇÕES ou o botão ⚙ AJUSTES na tela de título). Abas na lateral, tudo salvo no navegador:

- **Jogo:** velocidade do texto da história (lento, normal, rápido, instantâneo), comentários da caveira, intensidade do tremor da tela.
- **Tela:** tela cheia, brilho.
- **Áudio:** volume geral e dos efeitos. Os efeitos são sons 8-bit sintetizados na hora (pulo, golpe, morte, transformação, portas, explosões, alerta do chefe, menus).
- **Controles:** correr com toque duplo, tamanho e opacidade dos botões de toque.
- **Acessibilidade:** cores para daltonismo (P2 laranja em vez de vermelho) e desligar clarões.

## Nome dos jogadores

Na tela de escolha de controle, cada jogador escolhe o nome (◀ ▶ na plaquinha, ✎ para digitar, ou as teclas N / M): **PADRÃO** ("Player 1"), **STEAM** (o nome da conta, quando o jogo roda pela Steam) ou **NOVO** (um nome temporário, só nesta sessão). O nome aparece no HUD e na faixa de vitória. A versão Steam deve expor o nome em `window.skullshiftSteam.personaName` (ou via greenworks / steamworks.js); no navegador essa opção não aparece.

## Estrutura

- `src/config.ts` — medidas do mundo e constantes de física.
- `src/game/characters.ts` — dados de cada personagem: quadros, velocidade, golpe ou projétil e item que solta.
- `src/game/level.ts` — as fases (5 cenários cada) em tiles: plataformas, flutuantes, tema, inimigos, itens, placas, arena de chefe, perseguição, ventos, voo e casas assombradas. A ordem está em `LEVELS`; novas fases entram aqui (e um capítulo em `src/data/lore.ts` e uma posição em `SPOTS` no mapa).
- `src/game/boss.ts` — chefes (entrada, barra de vida, padrões, perigos e derrota).
- `src/game/haunt.ts` — casas assombradas (portas, chave, alavancas, pontes-fantasma, pisos falsos, velas, escuridão).
- `src/game/shmup.ts` — fase de voo com tiro.
- `src/game/escape.ts` — fuga (onda de lava, chão que desaba, tirolesas, meteoros).
- `src/game/puzzle.ts` — fases de chave e porta (carregar, escadas, molas, blocos de cor, pedras, árvores, ovelhas, placas, portões, presentes).
- `src/game/mausoleum.ts` — desafio do mausoléu; `src/game/abilities.ts` — habilidades liberadas por fase.
- `src/game/settings.ts` — configurações e sons 8-bit; `src/game/names.ts` — nomes dos jogadores; `src/game/progress.ts` — saves.
- `src/game/Fighter.ts` — estados, ataque, defesa, morte e transformação.
- `src/game/ai.ts` — IA dos inimigos.
- `src/game/Hud.ts` — avatares, indicador dos 5 cenários e seta "VAI".
- `src/game/touch.ts` — botões virtuais com multitoque.
- `src/ui/` — desenhos de teclado, controle e celular, além dos botões das telas de menu.
- `src/scenes/` — carregamento, menu, escolha de controle, como jogar, partida e `UIScene` (HUD, toque e vitória, por cima da câmera do mundo).

## Sprites

Os sprites vêm do pacote **Tiny Swords** de Pixel Frog (Free Pack e Enemy Pack). A licença permite usar os sprites em projetos, inclusive comerciais, mas não permite redistribuir os arquivos. Por isso `public/assets/` está no `.gitignore` e os sprites são importados pelo script.
