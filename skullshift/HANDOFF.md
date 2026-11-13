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

- Área 1 **Ilhas da Maré completa**: 10 fases (`shore, crabs, hightide, wreck, deck, undersea,
  floodgates, masts, reef, sharkking`), 9 variantes, Rei Tubarão-Arpão (`sharkking.ts`).
- Mapa do mundo como continente (`WorldScene`, máscara `LAND` + chão por área), construções do Free Pack.
- Memórias (`MEMORIES` em `lore.ts`, cena `MemoryScene`): uma a cada fragmento (ordem de `sealsBroken()`).
- Final: fase `finale` (último do centro) → `StoryScene` mostra `REVELATION` + escolha.
  Enfrentar → `ShamanBoss` (jogador vira `villager`) → epílogo `ENDING_FREE`. Voltar para casa →
  `ENDING_HOME`. Save guarda `ending`; o mapa do mundo muda conforme o final.
- Voo: morcego solta ondas sônicas, abelha solta ferrões (`shmup.ts`).
- Áreas completas (10 fases + rei): Maré, Pradaria (Rei Gnoll, `gnollking.ts`), Teias (Aranha-Rainha),
  Forja (Minotauro), Bosque (Rei Gnomo), Minas (Rei Goblin da Tocha). Reis Gnomo/Goblin/Lagarto em `kings.ts`.
- Mecânicas genéricas: `FieldSystem` (manada, rochas/toras rolando, gêiseres, cogumelos, desabamento),
  `SeaSystem` (maré de água/lava, caixotes/basalto/toras, tábuas/teia/obsidiana, canhões, casulos, corais),
  escuridão com tochas (`haunt.torches`).
- Faltam: Lagoa (10 fases novas + Rei Lagarto já escrito), Céu de Brasa (+7, tons vermelhos), Reino das Asas (+9).

## Próximos passos (em ordem)

1. Completar cada área com 10 fases, variantes e rei, nesta ordem: Pradaria (Rei Gnoll),
   Teias (Aranha-Rainha já existe), Forja (Minotauro já existe), Bosque (Rei Gnomo),
   Minas (Rei Goblin da Tocha), Lagoa (Rei Lagarto), Céu de Brasa (Diabrete, fases em tons
   vermelhos), Reino das Asas (reis já existem no voo).
2. Para cada área: variantes em `variants.ts` (+ `VariantId`), fases em `level.ts` (+ `LEVELS`),
   ids em `areas.ts`, capítulos em `lore.ts`, enfeite da ilha em `MapScene.drawIsland`, teste no navegador.
3. README e publicação a cada área concluída.
