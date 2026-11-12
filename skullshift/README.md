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

Cada fase tem **5 cenários** (telas): o central, 2 à direita e 2 à esquerda. A câmera desliza de um cenário para o outro. A fase é escolhida no menu, depois do modo (◀ ▶, A/D ou ←/→). No modo história, a vitória leva à fase seguinte.

| Fase | Ambiente | Personagens (item que transforma) |
|---|---|---|
| 1 · Ilhas da Maré | Praia com ilhas; os buracos dão na água | Lagarto (crista), Gnoll (osso), Tubarão-Arpão (arpão), Goblin Lanceiro (lança) |
| 2 · Caverna Úmida | Degraus que sobem e descem, poços d'água, plataformas de pedra flutuantes, estalactites, gotas e brilhos; **aranhas penduradas em teias no teto saltam em quem passa por baixo** | Aranha (teia: gruda nas paredes e sobe sozinha), Morcego Gigante (asa: voa até 2 s), Goblin da Tocha (tocha) |
| 3 · Forja Vulcânica | A casa do Diabrete: lava no lugar da água, céu vermelho com vulcões ao fundo, brasas subindo e cinzas caindo; pedras flutuantes sobre poços de lava | Diabrete (brasa: baforada de fogo), Minotauro (chifre: marretada lenta e longa), Goblin da Tocha (tocha) |
| 4 · Santuário das Nuvens | O santuário flutuante do Xamã. Só as **nuvens encantadas** (lilás, com runas e faíscas) aguentam peso; as brancas são só enfeite. Cristais mágicos no lugar de árvores; cair no vazio mata | Abelhão (favo de mel), Gnomo do Estilingue (bolota) |

**Poderes especiais:**
- **Morcego:** no lugar do pulo duplo, voa subindo enquanto PULAR estiver apertado, por até 2 segundos. Uma barrinha de fôlego aparece sobre a cabeça e recarrega ao tocar o chão.
- **Aranha:** gruda em qualquer parede que encostar no ar e sobe sozinha. Passiva **sentido aranha**: ela nunca cai. No ar sem chão embaixo, aparecem rabiscos azuis e vermelhos ao redor da cabeça, o tempo desacelera, uma badge surge no canto da tela e ela se puxa com uma teia até o chão mais próximo.
- **Lagarto (passiva: nado):** na água (fases 1 e 2) ele não se afoga. Boia com a cabeça para fora, balançando, nada com aceleração macia deixando ondinhas e rastro, mergulha segurando ▼ (soltando bolhas) e salta para fora com PULAR. Uma camada translúcida na frente da água faz a parte submersa de qualquer personagem parecer dentro d'água.
- **Pique:** toque duas vezes na direção e segure para correr bem mais rápido, levantando poeira. No teclado de 1 jogador, Shift também ativa o pique.
- **Bolha de energia:** quem não tem escudo no sprite (todos menos o esqueleto) defende dentro de uma bolha na cor do jogador. Quando a defesa quebra, a bolha estoura.
- **Aranhas penduradas:** o fio balança no teto da caverna. Quando um jogador passa por baixo, a aranha salta em cima dele (a defesa não segura ataque de cima) e depois vira uma inimiga comum. No versus, ela ataca os dois.

As plataformas altas são blocos maciços: dá para subir pulando, e elas bloqueiam pelos lados. Degraus de 2 tiles e as plataformas flutuantes mais altas pedem pulo duplo. As flutuantes se atravessam por baixo e seguram quem cai em cima, como num jogo de plataforma clássico. Ossos, arpões e bolotas arremessados caem no chão e viram item.

## Modos

- **História (1 jogador):** comece na ponta esquerda e chegue ao fim do lado oposto, atravessando os 5 cenários contra inimigos controlados pela IA. Ao morrer, você volta ao último checkpoint. Quando o cenário fica sem inimigos, aparece "VAI ➜".
- **Versus (2 jogadores locais):** a partida começa no cenário central, como no mockup. Os dois começam como esqueleto. O P1 vai para a direita e o P2 para a esquerda. Quem mata ganha a vez: só ele pode sair pela borda da tela e levar a câmera para o próximo cenário. O outro renasce à frente dele. Vence quem chegar ao fim do lado oposto.

**Quem é quem:** o P1 é **azul** e o P2 é **vermelho**. Cada personagem tem:
- uma aura pulsando atrás do corpo;
- um anel no chão sob os pés;
- uma etiqueta "P1"/"P2" sobre a cabeça.

Também ficam na cor do jogador o disco do avatar e o nome no HUD, o efeito de transformação, o "P1!"/"P2!" ao renascer, o brilho dos projéteis, as metades do teclado e os botões de toque.

A chegada abre uma animação de vitória: holofote, confete, fogos, o vencedor comemorando e uma faixa com o avatar.

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

## Transformações (fase 1)

| Item | Vira | Ataque |
|---|---|---|
| Osso | Gnoll | Arremessa ossos |
| Arpão | Tubarão-Arpão | Arremessa arpão (rápido) |
| Lança | Goblin Lanceiro | Golpe de lança de longo alcance (frente e trás) |
| Crista | Lagarto | Abre a crista e golpeia dos dois lados |

Pegar é **opcional**. Em cima de um item aparece um balão na cor do jogador, com o botão e o personagem ("E pegar · Gnoll"), e a transformação só acontece se o jogador apertar **Pegar**. Os itens aparecem no mapa e também caem de inimigos ou jogadores transformados quando eles morrem; o lagarto, por exemplo, solta a crista. Ao morrer, você volta ao personagem base. O avatar do HUD acompanha a transformação.

## Estrutura

- `src/config.ts` — medidas do mundo e constantes de física.
- `src/game/characters.ts` — dados de cada personagem: quadros, velocidade, golpe ou projétil e item que solta.
- `src/game/level.ts` — as 3 fases (5 cenários cada) em tiles, com altura das plataformas, flutuantes e tema (praia, caverna, céu). Novas fases entram aqui.
- `src/game/Fighter.ts` — estados, ataque, defesa, morte e transformação.
- `src/game/ai.ts` — IA dos inimigos.
- `src/game/Hud.ts` — avatares, indicador dos 5 cenários e seta "VAI".
- `src/game/touch.ts` — botões virtuais com multitoque.
- `src/ui/` — desenhos de teclado, controle e celular, além dos botões das telas de menu.
- `src/scenes/` — carregamento, menu, escolha de controle, como jogar, partida e `UIScene` (HUD, toque e vitória, por cima da câmera do mundo).

## Sprites

Os sprites vêm do pacote **Tiny Swords** de Pixel Frog (Free Pack e Enemy Pack). A licença permite usar os sprites em projetos, inclusive comerciais, mas não permite redistribuir os arquivos. Por isso `public/assets/` está no `.gitignore` e os sprites são importados pelo script.
