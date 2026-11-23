# Skullshift — manual para continuar o desenvolvimento

Este arquivo existe para que outra sessão (ou outro agente) retome o trabalho de onde parou.
Mantenha-o atualizado a cada etapa concluída (seção "Estado atual" e "Próximos passos").

## Como rodar e testar

- Projeto: `skullshift/` (Phaser 3.90 + TypeScript + Vite). `npm install`, `npx vite --port 5173`.
- Typecheck: `npx tsc --noEmit`. Build: `npm run build` (gera `dist/`).
- Sprites do Tiny Swords **não vão para o git** (licença). Importe com
  `scripts/import-assets.sh <Enemy_Pack.zip> <Free_Pack.zip> [fonte.zip]`. Sem eles o jogo não carrega.
- Testes: scripts Playwright (Chromium já instalado: `require('playwright')`). O jogo expõe
  `window.__skullshift` (Phaser.Game). Padrão usado:
  ```js
  await p.evaluate(() => window.__skullshift.scene.getScenes(true)[0].scene.start('game', { mode: 'story', devices: ['kb-full'], level: 31 }));
  const G = (f) => p.evaluate(`(()=>{const s=window.__skullshift.scene.getScene('game');${f}})()`);
  await G(`s.players[0].invulnUntil=1e12; s.players[0].body.reset(2*1280+230, 200); return 1`);
  ```
  O navegador headless é lento: use esperas generosas. Screenshots sempre fora do repositório.
- Publicação: o build vai para o artifact `https://claude.ai/artifact/96uAumw96ztrwHyGgi2pLh`
  (publicar `dist/index.html` com `files: {"assets/index-XXXX.js": "dist/assets/index-XXXX.js", "<js antigo>": null}`).
- Branch de trabalho: `claude/gallant-ride-fznqjf`.

## Pedidos do usuário que guiam tudo (resumo)

- Mundo dividido em **9 áreas** + **ilha central** (Santuário do Xamã), estilo mapa do Super Mario Wonder.
  Cada área: **pelo menos 10 fases**, um **rei** (personagem do Enemy Pack) com luta de estilo próprio,
  **variantes de inimigos** (paleta à mão, elite maior com armadura, acessórios em pixel art, habilidades).
- Ordem: Ilhas da Maré → Pradaria dos Ossos (fixas), depois as outras em qualquer ordem. O reino
  das asas (Colmeia Real / Reino da Noite) só abre depois do acordo dos Príncipes.
- **Lore estilo Shadow of the Colossus**: o Xamã Hex diz que cada rei guarda um fragmento da Coroa dos
  Ossos; na verdade cada rei é um **selo** da prisão dele. Pistas **sutis** (correntes partindo no mapa,
  céu escurecendo sobre o santuário, falas ambíguas). Só a caveira (Ossian) e o Xamã conversam na história
  (exceção: falas de chefes durante a luta, como os Príncipes).
- **Memórias**: além dos fragmentos, a caveira recupera a memória aos poucos (uma memória por rei).
- **Final**: a caveira vira o **aldeão (Pawn do Free Pack)**. Escolha: **enfrentar o Xamã** (se vencer,
  volta a ser a caveira — preso, mas o mundo livre) ou **voltar para casa com a ajuda do Xamã**
  (e o mundo todo fica dominado por ele).
- Arte: sempre o mais próximo possível da estética do Tiny Swords. Se algo gerado ficar ruim,
  não forçar: trocar por recolor de uma arte existente ou algo mais simples.
- O usuário pediu para **não fazer perguntas por enquanto** e construir os mundos completos.

## Arquitetura (onde está cada coisa)

| Arquivo | O quê |
|---|---|
| `src/game/level.ts` | `LevelDef` e todas as fases (`LEVELS`). Secretas sempre no fim. `levelFor()` troca o último cenário pela arena do chefe no modo história. |
| `src/game/areas.ts` | As 9 áreas + centro: fases (ids), rei, posição no mapa do mundo, regra de liberação. `AREA_GOAL = 10`. |
| `src/scenes/WorldScene.ts` | Mapa do mundo (ilha central, áreas, correntes/selos). |
| `src/scenes/MapScene.ts` | Mapa de uma área (faixa rolando com as fases; vagas vazias "em construção"). |
| `src/game/progress.ts` | Saves (3 slots, `done` = ids concluídos, `pact`, `gifts`, `secrets`). |
| `src/game/variants.ts` | Variantes de inimigos (paleta, elite, acessórios, habilidade). Ids em `VariantId` (`characters.ts`). |
| `src/game/ai.ts` | IA dos inimigos (habilidades `charge`, `burrow`; nado livre). |
| `src/game/sea.ts` | Maré (automática/alavancas/manual), caixotes, tábuas, canhões, águas-vivas, corais, casco, mastro, farol; tilesets `tiles_sand` e `tiles_ship` (recolor do `tilemap`). |
| `src/game/boss.ts` | Base dos chefes (entrada Mega Man, barra, padrões, perigos, derrota). |
| `src/game/sharkking.ts` | Rei Tubarão-Arpão (arena da maré). |
| `src/game/princes.ts` | Luta dos Príncipes + acordo. |
| `src/game/puzzle.ts` | Chave e porta (escadas, molas, blocos de cor, pedras, árvores, ovelhas, placas, portões, **caranguejos**). |
| `src/game/shmup.ts` | Fases de voo (montaria e poderes conforme o acordo). |
| `src/data/lore.ts` | Capítulos (`CHAPTER_BY_ID`), variantes por acordo (`<id>_bee`), epílogo. |
| `src/scenes/GameScene.ts` | Junta tudo (fase, inimigos, sistemas, chefes, maré `this.level.waterY`). |

Convenções: água tem altura dinâmica (`level.tide`, `level.waterY`, `level.deathY`); nunca usar
`WATER_Y`/`DEATH_Y` direto no `GameScene`. Pixel art em código usa `Px` (`src/ui/pixelart.ts`)
com escala 2 ou 3 e contorno `0x1d1a2b`. Recolor à mão: `recolorSheet` com a tabela de cores
originais (extraídas com PIL do PNG).

## Estado atual

- **Todas as 9 áreas completas** (10 fases + rei cada) e o centro (6 fases, final com o Xamã). 96 fases + 1 secreta.
- Reis: Tubarão (`sharkking.ts`), Gnoll (`gnollking.ts`), Gnomo/Goblin/Lagarto (`kings.ts`), Aranha-Rainha e
  Minotauro (`boss.ts`), Príncipes (`princes.ts`), Diabrete e reis das asas (voo, `shmup.ts`), Xamã (`shamanboss.ts`).
- Variantes: ~30 em `variants.ts` (todas as áreas). Inimigos 'wing' dependem do acordo (`GameScene.resolveWing`).
- Mecânicas genéricas: `FieldSystem` (manada, rochas/toras, gêiseres, cogumelos, desabamento/meteoros),
  `SeaSystem` (maré de água/lava, caixotes, tábuas, canhões, casulos/águas-vivas, corais/espinhos),
  escuridão com tochas (`haunt.torches`), submerso (`undersea` + `underseaAs`), pântano (`swamp`), céu de brasa (`ember`).
- Memórias (`MemoryScene`) e final (`StoryScene` + `REVELATION`/`ENDING_FREE`/`ENDING_HOME`).
- Varredura automática: todas as fases carregam sem erro.
- `scripts/check-reach.cjs`: verificador de alcance (pulo/pulo duplo/molas/cogumelos/vento/escadas/caixotes) em
  todas as fases de plataforma. Com pique, todas passam; sem pique, só a Escadaria (exige pique, de propósito)
  e a Biblioteca (pontes-fantasma de alavanca, que o verificador não simula). Rode depois de mexer em fases.
- Fundos por área em parallax (`Level.areaBackdrop`, escolhido pelo tileset).
- Defesa sem escudo: **meia-lua** (`guard_arc`, `BootScene.makeGuardArc`) que só protege a frente.
  **Contra-golpe**: apertar ATAQUE até 170 ms antes do golpe (`Fighter.parries`, `PARRY_MS`) quebra a
  defesa do atacante corpo a corpo (`GameScene.resolveMelee` → `guardBreak`) e devolve projéteis
  (laço de projéteis em `GameScene`). Efeito em `GameScene.parryFx`. Placa de dica na fase 1.
- **Caixa de reserva** (como no Mario): `GameScene.reserves/dropReserve/updateReserve`, HUD em `Hud.setReserve`
  (caixa tocável no topo), tecla em `controls.ts` (`reserve`: R/Tab, vírgula, SELECT), salva em `progress.reserve`.
  Agachar + pegar guarda; pegar item já transformado manda a forma atual para a caixa (se vazia); ao renascer
  o item cai sozinho. Desligada em voo, submerso, final e secreta (`reserveOn`).
- **Carregamento**: `PreloadScene` (carrega o mínimo) → `BootScene` (cena animada + dica + barra) → menu.
  `LoadingScene` é a tela de entrada de fase (MapScene/HowTo → `loading` → `vn`/`game`). Cenas em
  `ui/loading.ts` (`loadingVignette`: perseguição, fuga, transformação, voo, desfile, ovelha, rei) e textos em
  `data/tips.ts` (DICA / CURIOSIDADE / BOATO, gerais ou por área). A tela inicial reutiliza `loadingVignette`.
- **Transformação**: `GameScene.shiftSpin` (clone do corpo gira e acelera, três raios roxos em espiral, clarão
  no meio com a troca, anel e faíscas no fim). O corpo real fica com `Fighter.shiftHide`.
- **Água**: textura `waves` = reflexos retos de pixel (nada de arcos); duas camadas correm devagar em sentidos opostos e cintilam em contratempo; texturas `water_top` (espuma ondulada) e `water_grad` (profundidade) em `BootScene`; camadas e
  brilhos em `Level.water`. **Farol**: `SeaSystem.drawLighthouse` empilha duas `bld_red_tower` + fogueira.
- **Música** (`music.ts`): só FLAUTA, VIOLÃO e HARPA, com amostras reais (soundfont FluidR3_GM recortada em
  `public/assets/sf/*-mp3.js`, licença em `sf/LICENSE.txt`; essa pasta VAI para o git) tocadas pela lib `smplr`.
  Famílias de arranjo: 'storm' (valsa em menor, oom-pah-pah — clima de Song of Storms), 'gerudo' (rasgueado
  flamenco, cadência andaluza — clima de Gerudo Valley) e 'calm' (dedilhado). Cada fase tem a sua música
  (`variantOf` pelo id). **Troca sem corte**: um relógio só; `playMusic` agenda a música nova para o próximo
  compasso e o andamento desliza (nunca reinicia). `jingle`/`duckMusic` só abaixam a música, não param.
- **Defesa**: só no botão (o jogador NÃO defende andando para trás; a IA sim). Contra: toque NOVO de ATAQUE
  no tempo certo (`Fighter.parries`, `attackPressAt`, janela `PARRY_MS` + aprimoramento). Recuar ou defender não conta;
  apertar sem parar (toques a menos de 0,3 s) não abre a janela. Nas fases de tiro, `noteAttack` registra o disparo.
- **Versus** (`GameScene.updateChaos`): itens caem do céu a cada ~10 s; eventos aleatórios a cada 20–30 s
  (VENTANIA, CHUVA DE OSSOS com sombra no chão, CHUVA DE ITENS, GRAVIDADE BAIXA, AJUDANTES); orbe roxo
  chama um ajudante (criatura do time de quem pegou, 12 s, `summonAssist`). P1 (WASD) também pula no Espaço.
- **Luta final pelos 9 mundos** (`game/finale.ts`): o Xamã tem uma barra (6 golpes) por mundo. Cada mundo é uma
  arena própria (`finaleWorldDef`: chão/céu/clima do mundo); a caveira vira um lacaio daquele mundo
  (`GameScene.becomeMinion`) e o rei daquele mundo luta ao lado (`spawnFinaleAlly`, personagens `ally_*` feitos
  com a arte dos reis por `makeFinaleAllies`; o alvo da IA é um "fantasma" invisível que segue o Xamã; os golpes
  dos aliados acertam o chefe via `BossHost.allies`). Barra derrubada: `ShamanBoss.defeat` fala a linha do
  mundo, abre um vórtice e chama `host.teleport` → `GameScene.finaleTeleport` reinicia a cena com
  `finalePhase + 1` (vidas cheias a cada mundo; se as vidas acabam, recomeça no MESMO mundo). Golpes por barra:
  Fácil 4, Padrão 6, Difícil 8. No 9º mundo a derrota é a normal (epílogo livre).
  Reis aliados em tamanho de chefe (`FinaleWorld.size`: um boneco maior copia o desenho; o corpo real fica
  invisível) e com golpe especial a cada 7 s (salto que cai sobre o Xamã: `FinaleWorld.special`). Chegam
  depois da fala de entrada (`BossHost.onFightStart`).
- **Diário de Ossian** (`JournalScene`, botão DIÁRIO ou tecla L no mapa do mundo): rever memórias vistas
  (`memory-N` em `seen`), progresso por mundo (fases, presentes, bônus, rei) e ouro/habilidades/aprimoramentos.
- **Conquistas** (`achievements.ts`): 24, conferidas pelo save (`check`); contadores em `progress.stats`
  (`addStat`: kills, parries, shifts) e lista em `progress.ach`. `announceAchievements(scene)` mostra o aviso
  (fases, Empório, mapa do mundo). Página 2 do Diário. No modo livre nada é marcado.
- **Créditos** (`CreditsScene`): depois de qualquer final (StoryScene → credits → world) e pelo botão CRÉDITOS na
  tela inicial. Lista arte (Tiny Swords/Pixel Frog), fontes, Phaser, soundfont FluidR3/smplr e inspirações.
- **Empório no mapa**: casinha amarela com a ovelha entre a Maré e a Pradaria (`WorldScene.drawShop`).
  Cada mundo tem um 5º padrão do Xamã (`ShamanBoss.worldPower`): chuva marcada (água, veneno, teia, bolotas,
  pedras, meteoros na diagonal), toras rolando, gêiseres de fogo ou rajadas em duas alturas (ondas/ferrões).
- **Poderes por jogador** (`GameScene.perks`, `hasPerk`, `applyPerks`): na história vêm do save (habilidades
  liberadas + aprimoramentos comprados); no versus vêm da `LoadoutScene` (HowTo → loadout → loading → game,
  `data.loadouts`), até 3 por jogador entre as habilidades e os aprimoramentos de luta já conquistados.
  MODO TESTE (tecla T / botão): tudo liberado, sem limite.
- **Espada Rebatedora** (`deflect`, Empório, 70 ouro): o golpe de espada rebate qualquer projétil de volta
  para quem atirou (laço de projéteis em `updateProjectiles`).
- **HUD**: caixa de reserva é uma moldura de madeira logo depois do nome do jogador (em pé: entre o MENU e as
  vidas), com "RESERVA" em cima e a tecla embaixo.
- **Dificuldade**: Fácil (10 vidas), Padrão (6), Difícil (3) — `deathLimit`. Tela de saves responsiva em pé.
- **Teclado no celular**: `config.hasKeyboard()` — só aparece depois de uma tecla física ser apertada.
- **Mapa do mundo**: áreas trancadas no escuro; o Santuário fica numa ilha num mar interno (LAND), coberto
  por tempestade com relâmpagos até ser liberado.
- **Áreas bônus (uma por mundo)**: fases `secret` com `bonus: { area, after, landmark, scale }` (Árvore Oca + `BONUS_LEVELS`
  feitas por `bonusLevel` a partir de 3 plantas em `BONUS_PLANS`). Aparecem no mapa da área depois da fase `after`
  (`MapScene`, trilha dourada + desenho do lugar); `areaOfLevel` devolve a área do bônus. Presentes = ouro.
- **Área bônus**: `LEVEL_HOLLOW` ('hollowtree', secret) — Árvore Oca, no mapa da Maré depois da Maré Alta.
  ATENÇÃO: código antigo usa `LEVELS.findIndex(l => l.secret)` para a fase 'retro'; ela tem de continuar
  sendo a primeira secreta da lista.
- **Tela inicial**: vila só de casinhas; o Xamã escolhe um morador e o transforma de longe. A chama da mão dele foi recortada do próprio sprite (`sheets.makeShamanOrb`: folha `shaman_orb` + `shaman_idle_noorb` com a mão vazia); na animação de ataque ela sai da mão e voa até o alvo (`MenuScene.zap`:
  raio roxo, giro de raios, mesmo sprite troca de forma).
- **História dentro das fases** (`data/beats.ts`): `BEATS[idDaFase] = [[cenário, 's'|'x'|'f', texto], ...]`.
  's' caveira (balão), 'x' Xamã de longe (balão no alto), 'f' lampejo de memória (tela sépia, vulto do aldeão,
  `GameScene.memoryFlash`). Dispara ao chegar ao cenário (`GameScene.updateBeats`; no voo, por tempo).
  Toda fase nova precisa de: capítulo em `lore.ts` (≥4 falas) + entradas em `beats.ts`.

## Ideias para continuar

- Balancear dificuldade jogando de verdade (os testes automatizados tiram vida dos chefes direto).
- Mais variedade visual por área (decorações próprias), mais segredos/presentes nas fases.

## Robôs de teste (scripts/bots)
- `node scripts/bots/bot.cjs <perfil> <segundos> <offset> [quantas] [tag]` com o servidor `npx vite --port 5173` no ar.
  Perfis: agressivo, cauteloso (defende e tenta o contra com um ataque isolado), explorador (pulo duplo, itens, reserva), caotico (teclas aleatórias), retrato (iPhone em pé).
- `scripts/bots/run.sh` roda os 5 em duas levas (no máx. 3 navegadores juntos: cada um usa ~1,6 GB). `python3 scripts/bots/resumo.py` junta os `rel_*.json`.
- Nas fases de voo o "progresso" sai 0 e "parado" alto: o robô lê `players[0]`, mas quem voa é o `shmup` (artefato da medição, não trava).
- Achado da rodada: nas fases de voo densas dava para morrer no primeiro segundo; agora o voo começa com 2 s de invencibilidade.

## Idiomas (src/i18n)
- 12 idiomas: pt-BR (origem), pt-PT, en, es, fr, de, it, pl, tr, ru, ja, zh-CN. Tela `language` (botão com o nome do idioma no menu, sem bandeiras). `?lang=xx` força um idioma. Trocar idioma recarrega a página.
- As cenas continuam escritas em português: `hookText()` faz todo `Text.setText` passar por `tr()` (dicionário "texto pt → tradução", moldes `{0}` para textos com `${...}`, pedaços separados por ` · `, ` — `, `: `, `, `). Texto digitado aos poucos (StoryScene/MemoryScene) usa `tr()` + `noTr()`.
- Fontes: a Anak Manja só cobre pt/en. es/fr/de/it usam Lilita One; pl/tr/ru usam Rubik; ja/zh usam a fonte do aparelho (mesmo nome de família, arquivo trocado em `main.ts`).
- Fluxo: `python3 scripts/i18n/extract.py` (novos textos entram no fim de `strings.json`) → traduções numeradas em `scripts/i18n/tr/<idioma>/*.txt` → `python3 scripts/i18n/merge.py` gera `src/i18n/locales/*.json`. `node scripts/i18n/check.cjs <idioma> [pasta]` percorre telas e fases e lista o que ficou sem tradução. `ptpt_rules.py` gera o pt-PT dos textos de interface por regras.
- Estado: os 12 idiomas estão completos (interface, fases, história e memórias). O pt-PT só lista o que difere do pt-BR (o resto usa o texto-fonte). Ficam sem tradução de propósito: nomes próprios de fontes/créditos e "IDIOMA · LANGUAGE". Japonês e chinês usam fonte do sistema e quebra de linha por caractere (`cjkWrap` em `src/i18n/index.ts`, sem pontuação no começo da linha). Textos com moldes ambíguos (`{1}{2}` colados) devem ser montados no código com `tr()` por partes, como o aviso de pegar item em `GameScene.pickPrompt`.
- Não editar arquivos do projeto enquanto grava vídeo pelo servidor de desenvolvimento (a página recarrega).

## Transições e carregamento

- `src/ui/transition.ts`: todo `this.scene.start(...)` passa por uma cortina (cena `fade`, sempre por cima). Ela escurece (170 ms), a próxima tela é criada por trás e a cortina só abre (280 ms) depois de 3 quadros desenhados — o "tranco" de montar a tela fica escondido. Se a tela de origem já escureceu a própria câmera, a cortina assume na mesma cor. Pedido duplo no meio da troca é ignorado (vale o primeiro); redirecionamento feito pela tela que está abrindo segue com a cortina fechada. `game.scene.start` (do SceneManager, usado pelos scripts de teste) não passa pela cortina.
- `BootScene.create` gera as artes em etapas (`runTasks`, ~12 ms por quadro), e a barra mostra 75% download + 25% preparo. Variantes, agachados e nado dos tubarões são uma etapa por personagem (`variantTasks`, `crouchTasks`). Antes era um bloco único de ~2 s que congelava a animação.

## Fim de fase e tradução por partes

- Fases que terminam no fim do mapa (modo história): a nuvem do Hex espera em `level.width - 240` (`GameScene.makeGoalCloud`). Perto dela, `goalFinale` congela a fase, some com inimigos próximos, faz a caveira comemorar, andar, subir na nuvem e sair voando com o Hex; só então chama `storyWin(..., quiet)`. Chefes, portas/chaves, mausoléu, casas e voos seguem com a vitória própria.
- `tr()` traduz textos montados por partes em níveis: primeiro corta em ` — `, ` · ` e quebras de linha; o que não sair inteiro é cortado em `: ` e, por último, em `, `. Assim uma frase com vírgula ao lado de "· 5/6 fases" continua inteira.

## Nível, dungeons e a Vila

- **Nível/XP** (`progress.ts`): `xp` no save; nível = `levelOf(xp)` com curva `30·(L−1)·L` (máx. 30). XP: fases da história (`GameScene.storyWin`: 20 + 8×ordem da área, chefe ×3, repetição 25%), dungeons e minigames. `ui/levelup.ts` mostra a faixa de "subiu de nível".
- **Dungeons** (`game/dungeon.ts` + `scenes/DungeonScene.ts`), estilo For the King: mapa de colunas com caminhos (luta, elite, baú, evento com dados, armadilha, acampamento, santuário com bênçãos Vigor/Fúria/Sorte, guardião). As salas de luta são fases geradas na hora (`prepareRoom`) com tileset/tema e inimigos da própria área, escritas em `LEVELS[DUNGEON_SLOT]` (marcada `secret` e `dungeon`). Dificuldade: nível sugerido da área `1 + 2×ordem` (+1 a cada 3 colunas); diferença para o nível do jogador vira armadura extra dos inimigos (`ceil(gap/3)`, até 4), 2 corações por golpe se gap ≥ 6 e golpes que tiram 2 camadas se o jogador estiver 6+ níveis acima (ou com Fúria). Corações da run: `5 + nível/3`; cada sala de luta vencida devolve 1 coração. Robô de calibração: `node scripts/bots/dungeon-bot.cjs mare,pradaria,forja 50` (joga abaixo, no e acima do nível sugerido). Morrer zera a run (perde ouro e XP juntados); vencer o guardião entrega tudo + bônus e marca `dungeons` no save. A run fica só na memória (fechar a página = perder a run).
- **Selo de área** (`areas.kingSealed`): a última fase (rei) de cada área só abre com a dungeon da área limpa; saves com o rei já vencido ficam livres. No mapa da área: correntes roxas no medalhão, aviso e botão `DUNGEON · NV n`.
- **Vila** (`scenes/VillageScene.ts`): andável (setas/pulo/E; no toque, botões grandes e toque-para-ir). Placa do mundo, Empório (`shop` com `from: 'village'`), Mestre Rufo (nível/XP/corações), Portal das Dungeons (lista as áreas abertas mais próximas do nível), lago, alvos, curral, estalagem e moradores. No mapa-múndi o Empório virou a Vila; depois da 1ª fase o modo história começa nela.
- **Jogos da vila**: fazem parte do jogo de verdade.
  - **Arena do Mestre Rufo** (no Treino) e **Corrida do Goblin** (na barraca): fases geradas como as salas da dungeon (`game/villagegames.ts`, `LevelDef.village`, mesmo espaço `DUNGEON_SLOT`). Sem vidas: morrer encerra a tentativa. A arena paga por inimigo derrotado (`GameScene.kills`) e a corrida pelo tempo. `finishVillageGame` paga, e a vila mostra o resultado ao voltar (`takeVillageResult`).
  - **Pega-ovelha** (`scenes/MinigameScene.ts`), no curral.
  - A recompensa cai 25% a cada partida do mesmo jogo no mesmo dia (contador `mg_<tipo>_<data>` nas estatísticas).
  - Em pé, o pega-ovelha usa uma câmera com zoom e outra para a interface. Os botões de toque são o `TouchPad` das fases com o preset `walk`/`walk-jump`.
  - Pega-ovelha em pé: o pasto tem 760 px de largura em vez de 1280. A câmera fica mais próxima (cerca de 460 px de mundo visíveis) e segue a caveira. Com os botões na tela, as instruções falam dos botões e não do teclado.
  - No topo aparece um placar (`UIScene.setVillageInfo`): inimigos derrotados/total na arena e o cronômetro na corrida.
  - Em pé, a câmera desses jogos fica 20% mais afastada (`GameScene.viewZoom`) para mostrar mais da arena e do percurso.
- **Faixa de abertura em pé** (`UIScene.bannerFace`): letras maiores, texto quebrado na largura da tela e título reduzido se não couber.
- **Dispositivo fora do menu de controles**: `soloDevices(scene)` (controle, toque ou teclado), usado ao entrar numa sala de dungeon ou num jogo da vila.
- Verificador de alcance com salas geradas: `DUNGEON=90 node scripts/check-reach.cjs`.
- Tradução: moldes com pelo menos 2 letras fixas (antes 3) para pegar "{0}/{1} XP" e "NV {0}"; `trf(modelo, ...)` traduz e preenche direto.

- **Ferreiro** (Vila, `SMITH` em `dungeon.ts`, níveis em `save.smith`): Coração de Ferro (+1 coração), Lâmina Afiada (−1 camada de armadura dos inimigos), Dado Viciado (+4%/dado), Fôlego (+1 coração por sala vencida), Bolsa Costurada (guarda 15% do ouro se cair). Preço = base × (nível+1).
- **Run salva**: a dungeon em andamento fica em `localStorage` (`skullshift.run.<save>`); `getRun()` recarrega. Se a página fechar no meio de uma luta (`run.fighting`), a luta reabre obrigatória.
- **Mapa-múndi em duas regiões** (estilo Super Mario World): o continente e as **Terras de Fogo** (`AreaDef.region = 'fire'`: Forja e Céu de Brasa). `WorldScene` recebe `region` (ou deduz pela área) e usa `this.list` (áreas da região + uma passagem `LINK_FIRE`/`LINK_BACK`). No continente, a fenda vermelha leva às Terras de Fogo; lá, o mar inteiro é lava (o mesmo `waves` tingido), grade `FIRE_LAND`, trilhas pontilhadas e o arco azul de volta. A corrente do Santuário vai até a passagem.

## Objetos de cenário desenhados (src/ui/props.ts)
- Estilo Tiny Swords: contorno de tinta grosso, três tons, brilho e detalhes. `makeProps` gera as texturas no carregamento (junto do vulcão do mapa).
- Texturas: `prop_pond`, `prop_dock`, `prop_portal` + `prop_swirl` (redemoinho que gira num contêiner achatado), `prop_fence`/`prop_fencepost` (emendam a cada 64 px), `prop_sign`, `prop_anvil`, `prop_cave` e `prop_arch_blue` + `prop_swirl_blue` (passagens do mapa), `prop_lava`, `dn_floor` (lajotas que repetem), `dn_ring` + `dn_disc` (medalhão; o disco é cinza e a cena tinge com a cor da sala).
- Funções para tamanhos livres: `drawPond`, `drawDock`, `drawArch`, `drawHills`, `drawMountains`.
- **Empório em pé** (`ShopScene.createPortrait`): cena maior no alto, cartões em grade de 4 colunas (escala 1,62, ícone e prateleira mais altos) e painel largo com COMPRAR grande. Deitado continua igual.
- **Ferreiro** (`VillageScene.smith`): painel próprio com uma linha por melhoria (nome, bolinhas de nível, descrição e botão com o preço). ↑ ↓ escolhem, Enter compra e tocar no botão também compra. Em pé as linhas crescem até ocupar a altura livre. Os botões de toque da vila somem enquanto qualquer janela está aberta.
- **Painel de lista da vila** (`VillageScene.listPanel`, linhas `PanelRow`): usado pelo Ferreiro e pelo Portal das Dungeons. O Portal lista a dungeon em andamento (CONTINUAR) e as mais próximas do seu nível (5 deitado, 6 em pé). O botão ENTRAR fica amarelo no seu nível, laranja até 3 níveis acima e vermelho além disso. O painel sempre tem SAIR; antes, o portal não tinha como fechar no toque.
- **Mapa do mundo em pé** (`WorldScene.createPortraitUI`): o mapa ocupa a altura menos ~680 px, com zoom de até 1,8. No alto, MENU, DIÁRIO e VILA ficam sem sobreposição e o título encolhe se não couber. Embaixo vêm o painel de informação com letra grande e os botões ◀ ENTRAR ▶. A altura que sobra é dividida entre esses blocos.
- **Diário em pé** (`JournalScene`): letras 2x, memórias em cartões maiores, cada mundo em duas linhas (nome e números) com a altura dividida pela tela, conquistas com cartões que ocupam a altura e CONQUISTAS/MAPA lado a lado no rodapé. Nada de "✓" no Diário (palavras no lugar).
- **Aviso de conquista** (`achievements.ts`, `toast`): a caixa cresce com o texto, dobra de tamanho em pé e fica logo abaixo do cabeçalho. Em cenas com câmera de interface separada (como o mapa em pé), só a última câmera mostra o aviso.
- **Configurações em pé** (`SettingsScene`): abas maiores (3 + 2, nome traduzido sem o encaixe automático na largura do original), setas ◀ ▶ sempre dentro do painel e botões RESTAURAR/VOLTAR maiores.
- **Tela de controles em pé** (`ControlsScene.layout`): painéis (1 ou 2 empilhados), dica e bandeja de dispositivos centralizados entre o título e os botões. A escala garante que as setas ◀ ▶ fiquem dentro da tela.
- **Saves em pé** (`SlotsScene`): fichas largas com letra e botões maiores, sem a dica de teclado (mais altura para as fichas), título "SAVE n" traduzido sem encolher.
- **Menu inicial em pé** (`MenuScene`): CRÉDITOS, idioma e AJUSTES numa linha só no topo, abaixo da folga do celular; JOGAR, as opções de modo e o texto de ajuda maiores. O nome do idioma vai em maiúsculas, porque a fonte do título não tem minúsculas.

## Juice e plussing (sensação, sem mudar regras)
- **Opções** (`settings.ts`): `vibrate` (aba Controles), `motionFx` e `simpleTransition` (aba Acessibilidade). `buzz(ms)` faz a vibração do celular; `sfx(kind, pitch)` aceita uma altura, e cada som varia ±4% sozinho. Sons novos: `click`, `clack`, `coin` e `step`.
- **Interface**:
  - `pillButton` afunda e achata ao apertar e volta com um quique e um clique.
  - Transição em íris de caveira (`transition.ts`, textura `iris_skull` feita em canvas em `props.ts`, máscara invertida; só com WebGL).
  - Corações da dungeon (`UIScene.setHearts`): o coração perdido racha e cai, e o último pulsa.
  - Contadores que rolam (`ui/juice.ts`: `rollNumber`, `flyCoins`). Nas fases, as moedas voam até um contador de ouro (`UIScene.flyCoins`, chamado em `GameScene.earn`).
- **Movimento** (`Fighter`):
  - `squash(sx, sy, ms)` para esticar e achatar, só no visual e só nos jogadores.
  - Cuidado: a física move o desenho depois do `update`, então `applySquash` põe o sprite em "pés − dy" e não mexe no corpo. Mexer no corpo fazia a caveira afundar no chão.
  - Ganchos `onStep` (passo, derrapada, pouso), `onHurt` e `onSwing`, ligados em `GameScene.addPlayer`.
  - Rastro na corrida e "clac" da mandíbula no pulo e nas quedas grandes.
- **Combate** (`GameScene`):
  - `swingWind`: o vento da espadada empurra as partículas vivas por perto, balança arbustos, árvores e tochas e solta folhas.
  - `comboPitch`: golpes seguidos (até 1,2 s entre eles) sobem pela escala maior.
  - `hurtFx`: um ossinho solto quica no chão.
- **Mundo**:
  - Na vila (`VillageScene.plussing`): moradores e ovelhas olham para a caveira, pássaros levantam voo, tufos de grama se abrem e as tochas inclinam quando ela passa correndo.
  - O bardo solta uma nota (♪) para cada nota do violão da música, e o ferreiro martela nas notas graves (`music.ts`: `musicNotesSince`).
- **Segredos**:
  - Cochilo depois de 20 s parada (fase e vila).
  - A ovelha do Empório morde a placa depois de 25 s parado (`ShopScene.biteSign`).
  - Estrela cadente rara no mapa (`WorldScene.shootingStars`).
  - Depois de 10 min parado no menu inicial, a ovelha come o menu inteiro em 1 min, a câmera dá um super zoom na cara dela e aparece um dizer. Qualquer comando devolve o menu (`MenuScene.munch`; `MenuScene.IDLE_MS`/`EAT_MS`).

## Correções de jogabilidade (rodada de bugs)
- **Porta trancada** (`puzzle.ts`): cadeado desenhado no lugar da chave translúcida, que parecia uma segunda chave por cima da verdadeira. O cadeado abre e cai quando a porta destranca.
- **Caranguejo** (`puzzle.ts`):
  - `crabKnockDown`: o golpe joga o caranguejo para o alto girando; ele cai de barriga para cima com poeira e estrelas, e `crabRecover` o desvira com um pulo.
  - `crabAttack`: com a caveira perto no mesmo chão, ele levanta as garras piscando vermelho (aviso) e avança de lado.
  - Fora de pulos e quiques, o y do caranguejo é sempre o do chão (antes ele podia ficar flutuando).
- **Maré**: `GameScene.safeSpawnX` faz a caveira renascer num chão que fica acima da água mesmo com a maré no máximo. Nessas fases, as construções ficam sobre um patamar de fundo acima da maré (`Level.backLedge`, com `lift`).
- **Segunda camada de piso**: toda construção ganha `backLedge`, um patamar mais escuro atrás do chão jogável e inacessível, do tamanho do prédio, para nada ficar flutuando. Casas só usam `house1`.
- **Tiros**: `shotBox` usa a altura do corpo desenhado (antes, a caixa de 50 px fazia o osso em arco passar por cima do lagarto).
- **Reviver**: `Fighter.reviveGraceUntil` dá 1 s imune a tudo, e `killFighter` também respeita esse tempo. No início da fase, `clearSpawnArea` afasta inimigos e aranhas penduradas colados na caveira, e os inimigos só agem depois de 2 s.
- **Vida implícita**: as barras dos chefes não aparecem (só o nome, que some depois de alguns segundos), e o número de golpes que faltam nos inimigos de elite saiu. No último golpe, o clarão do acerto é vermelho.
- **Variantes**:
  - Soltam o item do personagem base recolorido no tom delas (`variantTexture`, troca de matiz em canvas; `variantColor`).
  - Pegar o item transforma a caveira na própria variante (`Item.form`), com o ataque dela (o lagarto azul cospe água, por exemplo).
  - O retrato do HUD também é recolorido.
  - As passivas de aranha e morcego valem para as variantes delas (`def.base`).
- **Menu inicial**:
  - A vila tem casas de quatro cores, uma torre, montanhas e um castelo ao longe, uma ovelha num quintal com cerca, tufos de grama e pedras no mar.
  - Árvores e arbustos só entram nos vãos entre as construções (`taken`/`free`).
  - Em pé, a escala é 2,2.

## Toque e mapa (correções)
- **Leitura dos dedos** (`touch.ts`): `TouchPad` lê os dedos direto dos eventos do navegador (`liveTouches`, a partir de `TouchEvent.touches`) e não mais do `isDown` dos ponteiros do Phaser, que podia ficar preso.
  - Um "soltar" perdido (dedo que sai da página, gesto do sistema, app em segundo plano) se corrige no toque seguinte.
  - Ao perder o foco (`blur`/`visibilitychange`), a lista de dedos é limpa.
  - O mouse só conta enquanto não houve toque de dedo.
- **Um botão por dedo**: cada dedo aperta só o botão mais próximo. Antes, um dedo entre PULA e ATQ apertava os dois.
- **Botões sem sobreposição**: `fitRadii` encolhe os pares de botões que se sobreporiam (tela baixa com botões grandes).
- **Mapa, Praia dos Caranguejos**:
  - Só uma chave: a decoração genérica de fase de porta trancada já desenha uma.
  - O quadrado preto era a textura `crab` faltando, porque ela só era criada dentro da fase. Agora o mapa chama `makeCrabArt`.

## Chefes em 3 partes, teia da aranha, aranha pendurada
- **Barra dos chefes visível** (`UIScene.showBossBar`):
  - Fica no alto da tela: em pé, logo abaixo do HUD; deitado, em y=88.
  - São 30 gomos em 3 partes (I, II, III). A última parte fica vermelha.
  - Quando uma parte acaba, os gomos dela caem num clarão e a barra treme.
  - O parâmetro `parts` (padrão 3) muda a divisão; a Urna do Mausoléu usa 1, porque conta ondas.
  - A segunda barra (Príncipe Abelha) também aparece, abaixo da primeira.
  - Os inimigos de elite continuam com vida implícita.
- **Ataques por parte** (`boss.ts`):
  - `stageOf(hp, max)` dá a parte da vida (0/1/2).
  - `stagePool(n, stage)`: a parte I usa a primeira metade dos padrões, a parte II a segunda metade (ataques novos), e a parte III todos, mais rápidos e combinados (`phase2` agora é a parte III).
  - Ao mudar de parte, o chefe pisca vermelho (`enrage`) e, antes do próximo padrão, para e ruge (`stageRoar`).
  - O chefe das fases de voo (`shmup.ts`) segue a mesma divisão.
  - Para trocar a divisão de um chefe, sobrescreva `stagePatterns(stage)`.
- **Aranha pendurada** (`addHanger`/`unflipHanger`):
  - De cabeça para baixo, o corpo físico agora acompanha o desenho virado (antes ficava ~70 px abaixo).
  - Ao soltar do fio, desvira sem o desenho pular. Era o "teletransporte" ao bater nela.
  - `clearSpawnArea` não mexe mais nas aranhas penduradas (antes podia jogá-las para o chão).

## Teia desfeita e renascimento na maré
- A teia da forma de aranha (▼ + ATAQUE) foi removida a pedido: a aranha volta a ter só o golpe.
  - A string "▼ + ATAQUE: TEIA" ficou sem uso em `strings.json`.
- **`safeSpawnX`** (maré):
  - Se o ponto de volta está seco agora (`deathY - 20`) ou mesmo com a maré cheia, renasce nele.
  - Senão, procura só no cenário atual: o chão seco mais perto, com andar para a frente custando o dobro de voltar. Sem chão seco, usa o chão mais alto do cenário.
  - Antes a busca ia para a fase inteira e jogava a caveira até ~400 px para a frente sem precisar.
- **`updateCheckpoint`**: em fase de maré, o checkpoint só avança para chão que fica seco com a maré cheia.

## Escadas, mapa até a área bônus, Maré Alta sem arquearia
- A cabana de arquearia saiu da fase Maré Alta (`EXTRA_BUILDINGS`).
- **Subir escada é uma ação própria**, separada do pulo:
  - Novo `Intent.climb`: ↑/W no teclado (`KeyLayout.up`), direcional para cima ou analógico no controle, e o botão ▲ do toque.
  - O botão ▲ (`TouchPad.showClimb`) só aparece perto de uma escada.
  - Perto de uma escada, ↑/W não pula: o `GameScene` zera o pulo desse quadro. Longe dela, ↑/W continua pulando, e ESPAÇO e PULA sempre pulam.
- **Na escada** (`puzzle.ts`):
  - `ladderFor(p)` diz se dá para subir (no pé) ou descer (no alto), e uma seta ▲/▼ amarela pisca sobre a escada.
  - Agarrada, a caveira só sai no pé, no alto ou pulando: apertar para o lado não solta mais no meio.
  - No alto, ela procura a plataforma mais perto (até 180 px de cada lado) e passa para ela num passo em arco animado. Antes caía no vão da Árvore Oca.
- **Mapa** (`MapScene`):
  - Na fase de onde sai a trilha dourada da área bônus aparece uma seta grande (▲/▼), que se pode tocar.
  - ↑/↓ (W/S, direcional) levam o esqueleto até a área bônus e de volta; ENTRAR entra nela.
  - ◀ ▶ a partir da área bônus voltam à trilha principal.
  - O painel mostra o nome da área bônus.

## Prólogo na Vila dos Ossos (tutorial + história)
- **Área nova `PROLOGUE`** (`areas.ts`), fora de `AREAS` como o Santuário (não tem rei nem fragmento). `areaTier` = 0.
  - `unlock: 'start'`, e as Ilhas da Maré passaram a `after-prologo`. Saves antigos que já têm fase da Maré vencida continuam com ela aberta.
  - Sem selo de rei e sem botão de dungeon no mapa.
  - No mapa do mundo, o nó fica na própria vila (`pos` [360,392]): a plaquinha "VILA DOS OSSOS", cercas com caveiras e ossos. A vila em si continua no botão VILA do alto.
  - Jogo novo (`HowToScene`) vai direto para o mapa do prólogo.
- **10 fases** `p_vila … p_asas` (`PROLOGUE_LEVELS` em `level.ts`, no fim de `LEVELS` para não mudar índices de saves):
  - Feitas com `dream()`: 4 cenários curtos, a aparência do mundo, poucos inimigos fracos e o objeto da criatura no caminho.
  - Novo campo `LevelDef.prologue = { world, char }`: `world` escolhe a música, `char` é a forma ensinada.
  - Mundos e formas: Vila (caveira), Maré (tubarão), Pradaria (gnoll), Lagoa (lagarto), Teias (aranha), Forja (minotauro), Bosque (gnomo), Minas (goblin da tocha), Terras de Fogo (diabrete), Asas (morcego).
- **Cena dentro da fase** (`GameScene.prologueScene`, textos em `PROLOGUE_SCENES` no `lore.ts`):
  - O Xamã desce na nuvem e fala do mundo (`before`).
  - Num estalo de fumaça roxa ele vira a criatura e mostra o que ela faz (`self`).
  - Um raio roxo transforma o Ossian (`ossian`: como jogar e a piada da forma). Depois Hex volta a ser Hex e vai embora.
  - A cena marca `first-shift` como visto, para a explicação genérica da 1ª transformação não aparecer depois.
  - No prólogo, ao renascer, o Ossian volta direto para a forma da lição.
  - Em `p_vila`, cinco esqueletos coloridos da vila assistem à cena.
- **Narrativa** (capítulos `p_*` em `CHAPTER_BY_ID`, na visual novel antes de cada fase):
  - Hex trata Ossian como o escolhido nascido na Vila dos Ossos e planta memórias falsas: o pai pescador, o avô contra o Rei Gnoll, a mãe da vela, o estilingue feito por Hex, "tu és filho único".
  - As memórias falsas falham de leve: o estilingue que a irmã deu, quem deixava a vela acesa, o medo de água "como se tivesse afundado".
  - A fala da praia (`shore`) foi reescrita para depois do prólogo, já que o nome Ossian é dado na vila.
- **Vila dos Ossos** (`VillageScene`):
  - Todo morador virou esqueleto, cada um de uma cor (`npc()` sempre usa `skull`; o "gnominho" virou Pipo, o ossinho, menor).
  - Título "VILA DOS OSSOS". Estacas com caveiras, montinhos de ossos e um varal de lanternas.
  - Falas novas com pistas sutis: "o último que o Hex trouxe também se chamava Ossian", "ninguém aqui lembra de ter nascido", a ponte com lanternas do bardo, "o Hex nunca atrasa".
- Traduções em `scripts/i18n/tr/*/027.txt` (159 textos).

## Prólogo mais longo, com desafios do poder
- Cada sonho tem 6 cenários (`dream()` em `level.ts`):
  - o cenário 0 é a conversa com o Xamã (rochas no lugar de árvores fora da praia);
  - os cenários 1 a 4 são desafios do poder ensinado;
  - o 5 é a chegada.
  - O objeto da criatura aparece no 2º cenário.
- **Movimento (obrigatório):**
  - Lagoa: canais de 7 a 8 tiles, só a nado.
  - Teias: paredes de 4 a 6 tiles, só escalando.
  - Asas: abismos de 6 a 8 tiles, só voando.
  - Minas: galeria escura (`haunt.dark`) com 2 tochas grandes que abrem a porta de saída. A tocha do Goblin da Tocha ilumina 300 px, contra 140 da caveira.
- **Combate (`clearToAdvance`):** a barreira de fogo só abre limpando o cenário.
  - Maré: inimigos no alto e tubarões arpoando.
  - Pradaria: inimigos atrás de muros e morros, para o osso em arco.
  - Forja: inimigos com armadura e minotauros.
  - Bosque: gnomos em morros e pirâmides, para a bolota.
  - Terras de Fogo: ilhas no céu e abelhas.
- O Despertar ensina, como caveira: pulos, defesa contra osso, contra-ataque, degraus e vãos largos.
- A aranha do jogador também gruda andando contra a parede (`Fighter.updateClimb`, só jogador). Antes precisava pular na parede.
- Durante a conversa do prólogo, a escuridão das Minas some (`HauntSystem.setDarkVisible`).
- `scripts/check-reach.cjs` simula a forma ensinada nas fases do prólogo:
  - escalar sobe qualquer parede colada;
  - voar cruza até 540 px;
  - nadar liga chãos baixos numa fase com água.
- As placas do prólogo agora têm quebra de linha real (antes mostravam "\n"). Traduções em `028.txt`.
