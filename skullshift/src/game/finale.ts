import Phaser from 'phaser';
import { CHARS, type CharDef, type CharId } from './characters';
import type { LevelDef, Theme } from './level';
import { recolorSheet } from './sheets';
import { getPact } from './progress';

/**
 * A luta final contra o Xamã Hex atravessa os nove mundos. Ele tem uma barra de vida por mundo;
 * a cada barra derrubada ele fala, ergue o cajado e teleporta todo mundo para o próximo mundo.
 * Em cada mundo:
 *  - a arena tem o chão e o céu daquele mundo;
 *  - o REI daquele mundo (já libertado) luta do lado da caveira;
 *  - a caveira é transformada num LACAIO daquele mundo (uma das criaturas que o Xamã usava).
 */
export interface FinaleWorld {
  area: string;
  name: string;
  tiles: string;
  theme: Theme;
  swamp?: boolean;
  ember?: boolean;
  /** Lacaio em que a caveira se transforma. */
  minion: () => CharId;
  /** Rei aliado: id do personagem base e prefixo das texturas do rei. */
  kingBase: () => CharId;
  kingTex: () => string;
  kingName: () => string;
  color: number;
  /** Tamanho do rei aliado (eles são chefes: maiores que a criatura comum). */
  size: number;
  /** Nome do golpe especial do rei. */
  special: string;
  /** O que o Xamã diz quando a barra deste mundo cai. */
  line: string;
}

const beesWorld = () => getPact() === 'bat';

export const FINALE_WORLDS: FinaleWorld[] = [
  { area: 'mare', size: 1.45, special: 'ARPÃO REAL', name: 'Ilhas da Maré', tiles: 'tiles_sand', theme: 'shore', minion: () => 'shark', kingBase: () => 'shark', kingTex: () => 'king_shark', kingName: () => 'Rei Tubarão-Arpão', color: 0x2f86e0, line: 'A maré foi a primeira a esquecer o teu nome, Ossian. Vamos ver se a pradaria lembra.' },
  { area: 'pradaria', size: 1.4, special: 'UIVO DO BANDO', name: 'Pradaria dos Ossos', tiles: 'tiles_prairie', theme: 'shore', minion: () => 'gnoll', kingBase: () => 'gnoll', kingTex: () => 'king_gnoll', kingName: () => 'Rei Gnoll', color: 0xd8a530, line: 'Ossos e capim. Foi daqui que tirei o teu corpo, sabias? Não. Ninguém lembra.' },
  { area: 'lagoa', size: 1.4, special: 'BOTE DO PÂNTANO', name: 'Lagoa dos Lagartos', tiles: 'tiles_swamp', theme: 'shore', swamp: true, minion: () => 'lizard', kingBase: () => 'lizard', kingTex: () => 'king_lizard', kingName: () => 'Rei Lagarto', color: 0x58b947, line: 'O lagarto nunca fechou os olhos porque me vigiava. Tu fechaste os dele por mim.' },
  { area: 'teias', size: 1.35, special: 'TEIA DA RAINHA', name: 'Caverna das Teias', tiles: 'tiles_cave', theme: 'cave', minion: () => 'spider', kingBase: () => 'spider', kingTex: () => 'boss_spider', kingName: () => 'Aranha-Rainha', color: 0x8a6ad0, line: 'Os nomes riscados na pedra... eram todos Ossian. Tu és só o último.' },
  { area: 'forja', size: 1.0, special: 'MARTELO RUBRO', name: 'Forja Vulcânica', tiles: 'tiles_volcano', theme: 'volcano', minion: () => 'minotaur', kingBase: () => 'minotaur', kingTex: () => 'boss_mino', kingName: () => 'Minotauro Rubro', color: 0xe0542e, line: 'Ele forjava a minha corrente. Agora forja o teu fim. Que ironia de bigorna.' },
  { area: 'bosque', size: 1.6, special: 'BOLOTA GIGANTE', name: 'Bosque dos Gnomos', tiles: 'tiles_forest', theme: 'shore', minion: () => 'sgnome', kingBase: () => 'sgnome', kingTex: () => 'king_gnome', kingName: () => 'Rei Gnomo', color: 0x3f9a5a, line: 'O bosque foi plantado em volta da minha prisão. Cada árvore, um guarda. Nenhuma ficou.' },
  { area: 'minas', size: 1.45, special: 'TOCHA DO REI', name: 'Minas dos Goblins', tiles: 'tiles_mine', theme: 'cave', minion: () => 'torchgob', kingBase: () => 'torchgob', kingTex: () => 'king_torchgob', kingName: () => 'Rei Goblin da Tocha', color: 0xc8823a, line: 'Ouro, ouro, ouro. Eles contavam pepitas enquanto eu contava os dias. Mais um mundo.' },
  { area: 'ceu', size: 1.9, special: 'BRASA GIGANTE', name: 'Céu de Brasa', tiles: 'tiles_sky', theme: 'sky', ember: true, minion: () => 'imp', kingBase: () => 'imp', kingTex: () => 'imp', kingName: () => 'Diabrete Gigante', color: 0xd84a3a, line: 'O céu queima porque eu respiro. Lá em cima, só falta o último reino.' },
  {
    area: 'reino', size: 1.5, special: 'RASANTE REAL',
    name: 'Reino das Asas',
    tiles: 'tiles_sky',
    theme: 'sky',
    minion: () => (beesWorld() ? 'bee' : 'bat'),
    kingBase: () => (beesWorld() ? 'bee' : 'bat'),
    kingTex: () => (beesWorld() ? 'king_bee' : 'king_bat'),
    kingName: () => (beesWorld() ? 'Rei das Abelhas' : 'Rei dos Morcegos'),
    color: 0x2f4fb8,
    line: 'Não... os nove juntos? Isso não estava na barca. Isso NÃO estava na barca!',
  },
];

/** Cria (uma vez) os personagens "rei aliado" de cada mundo, com a arte de cada rei. */
export function makeFinaleAllies(scene: Phaser.Scene): void {
  for (const w of FINALE_WORLDS) {
    const id = `ally_${w.area}_${w.kingTex()}` as CharId;
    if (CHARS[id]) continue;
    const base = CHARS[w.kingBase()];
    for (const part of ['idle', 'run', 'attack'] as const) {
      const src = `${w.kingTex()}_${part}`;
      const dst = `${id}_${part}`;
      if (!scene.textures.exists(src)) continue;
      if (!scene.textures.exists(dst)) recolorSheet(scene, src, dst, base.frame, base.frame, {});
      const total = scene.textures.get(dst).frameTotal - 1;
      const a = base[part];
      if (!scene.anims.exists(dst))
        scene.anims.create({ key: dst, frames: scene.anims.generateFrameNumbers(dst, { start: 0, end: Math.max(0, Math.min(a.n, total) - 1) }), frameRate: a.fps, repeat: part === 'attack' ? 0 : -1 });
    }
    // O golpe alcança mais longe, do tamanho do rei.
    const def: CharDef = { ...base, id, base: base.id, name: w.kingName(), attackSheets: undefined, head: Math.round(base.head * w.size) };
    if (base.melee) def.melee = { ...base.melee, reach: Math.round(base.melee.reach * w.size), back: Math.round(base.melee.back * w.size) };
    (CHARS as Record<string, CharDef>)[id] = def;
  }
}

export function allyId(w: FinaleWorld): CharId {
  return `ally_${w.area}_${w.kingTex()}` as CharId;
}

/** A arena de cada mundo (um cenário só, com o chão e o céu daquele mundo). */
export function finaleWorldDef(base: LevelDef, phase: number): LevelDef {
  const w = FINALE_WORLDS[Math.min(phase, FINALE_WORLDS.length - 1)];
  const arena = { segments: [[0, 20, 0]] as Array<[number, number, number]>, floats: [[3, 3, 3], [14, 3, 3]] as Array<[number, number, number]> };
  return {
    ...base,
    name: `Trono do Xamã · ${w.name}`,
    tiles: w.tiles,
    theme: w.theme,
    swamp: w.swamp,
    ember: w.ember,
    screens: [arena],
    boss: { kind: 'shaman', arena },
    storyStart: [0, 3],
  };
}
