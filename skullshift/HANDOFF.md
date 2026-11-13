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
  **Contra-golpe**: tocar para trás até 170 ms antes do golpe (`Fighter.parries`, `PARRY_MS`) quebra a
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
- **Água**: texturas `water_top` (espuma ondulada) e `water_grad` (profundidade) em `BootScene`; camadas e
  brilhos em `Level.water`. **Farol**: `SeaSystem.drawLighthouse` empilha duas `bld_red_tower` + fogueira.
- **Música** (`music.ts`): instrumentos sintetizados no espírito de Ocarina of Time — sopro (ocarina, flauta:
  `wind`), corda dedilhada por Karplus-Strong (harpa, violão, pizzicato: `pluck`), naipe/trompa/contrabaixo
  (`bowed`), marimba/celesta/órgão (`tone`), tímpano e tambores (`drum`), sala com reverberação e passa-baixa
  geral (sem agudos). Cada tema é um `Style` em `STYLES`; **cada fase tem a sua música**:
  `playMusic(tema, idDaFase)` → `variantOf` deriva tom, andamento, progressão (`PROGS`), solista e melodia.
  `jingle('win'|'seal'|'lose'|'flash')`, `duckMusic(ms)`. Volume em Configurações → Áudio → Música.
- **Ouro e Empório** (`upgrades.ts`, `ShopScene`): ouro em `progress.coins` (inimigo 1, presente 3, fase 5, rei 15;
  `GameScene.earn`). Loja no mapa do mundo (botão EMPÓRIO / tecla B). Aprimoramentos em `UPGRADES`
  (`hasUpgrade`): Osso Teimoso (golpe fatal transformado → volta a ser caveira, em `killFighter`), Vela Extra
  (`deathLimit` +1), Reflexo de Osso (`Fighter.parryBonus`), Manto de Nuvem (invulnerável em dobro ao renascer),
  Ímã de Ossos (reserva cai reto e rápido), Dente de Ouro (ouro em dobro). Lore: a dona é a ovelha de orelha
  preta das lembranças; não fala, responde por placas. Novo aprimoramento: entrada em `UPGRADES` + efeito.
- **Construções no fundo**: `DecoKind` ganhou castle/monastery/barracks/archery; cor por tileset
  (`BUILDING_COLOR`), base assentada no chão (`BUILDING_FOOT`) com sombra; `EXTRA_BUILDINGS[idDaFase]` põe
  prédios no trecho de chão mais largo do cenário.
- **História dentro das fases** (`data/beats.ts`): `BEATS[idDaFase] = [[cenário, 's'|'x'|'f', texto], ...]`.
  's' caveira (balão), 'x' Xamã de longe (balão no alto), 'f' lampejo de memória (tela sépia, vulto do aldeão,
  `GameScene.memoryFlash`). Dispara ao chegar ao cenário (`GameScene.updateBeats`; no voo, por tempo).
  Toda fase nova precisa de: capítulo em `lore.ts` (≥4 falas) + entradas em `beats.ts`.

## Ideias para continuar

- Balancear dificuldade jogando de verdade (os testes automatizados tiram vida dos chefes direto).
- Mais variedade visual por área (decorações próprias), mais segredos/presentes nas fases.
