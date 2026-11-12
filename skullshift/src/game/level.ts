import Phaser from 'phaser';
import { BODY_FONT, DEPTH, FLOOR_Y, GRASS_Y, H, TILE, W, WATER_Y } from '../config';
import type { CharId, ItemId } from './characters';

/**
 * Plataforma: início e comprimento em tiles de 64px (locais à tela, 0..19) e altura h
 * (em tiles acima do chão base). Plataformas altas são blocos maciços: dá para subir
 * pulando e elas bloqueiam pelos lados.
 */
export type Segment = [start: number, length: number, h?: number];

export type DecoKind = 'tree' | 'dead_tree' | 'rock1' | 'rock2' | 'stump' | 'bones' | 'skull_spike' | 'crystal';
export type Theme = 'shore' | 'cave' | 'volcano' | 'sky' | 'haunted';

/** A fase como é jogada no modo escolhido (na história, o último cenário pode virar arena de chefe). */
export function levelFor(def: LevelDef, story: boolean): LevelDef {
  if (!story || !def.boss) return def;
  return { ...def, screens: [...def.screens.slice(0, -1), def.boss.arena] };
}

/** Um cenário = uma tela de 1280px (20 tiles). */
export interface ScreenDef {
  segments: Segment[];
  /** Plataformas flutuantes: dá para atravessar por baixo e subir em cima. */
  floats?: Segment[];
  deco?: Array<[tile: number, kind: DecoKind]>;
  /** Modo história. */
  enemies?: Array<[tile: number, char: CharId]>;
  storyItems?: Array<[tile: number, item: ItemId, h?: number]>;
  /** Modo versus (os itens reaparecem depois de um tempo). */
  versusItems?: Array<[tile: number, item: ItemId, h?: number]>;
  /** Aranhas penduradas em teias no teto (saltam em quem passa por baixo). */
  hangers?: number[];
  /** Placa de madeira com uma dica (tile, texto). */
  sign?: [tile: number, text: string];
}

/** Símbolo na plaquinha de uma porta. */
export type DoorSymbol = 'moon' | 'redmoon' | 'sun' | 'star' | 'skull';

/** Porta de casa assombrada: leva até outra porta (to), é a saída, ou é só a entrada. */
export interface DoorDef {
  id: string;
  screen: number;
  tile: number;
  h?: number;
  to?: string;
  symbol?: DoorSymbol;
  /** Porta errada: devolve ao começo com uma risada. */
  trick?: boolean;
  exit?: boolean;
}

/** Mecânicas de quebra-cabeça das casas assombradas (só no modo história). */
export interface HauntDef {
  doors?: DoorDef[];
  /** Chave que abre a porta de saída. */
  key?: [screen: number, tile: number, h: number];
  /** Alavancas: um golpe liga a ponte-fantasma do grupo por ms milissegundos. */
  levers?: Array<{ screen: number; tile: number; h?: number; group: string; ms: number }>;
  ghostFloors?: Array<{ screen: number; tile: number; n: number; h?: number; group: string }>;
  /** Pisos falsos: cada tile desaba um instante depois de pisado e volta depois. */
  crumbles?: Array<{ screen: number; tile: number; n: number; h?: number }>;
  /** Velas: encostar acende. As grandes abrem a porta de saída. */
  candles?: Array<{ screen: number; tile: number; h?: number; big?: boolean }>;
  /** Fase no escuro: só se enxerga perto de luz. */
  dark?: boolean;
}

export interface LevelDef {
  name: string;
  /** Frase de abertura (a narrativa da fase). */
  intro?: string;
  theme: Theme;
  /** Spritesheet do tileset (variação de cor). */
  tiles: string;
  /** 5 cenários, da esquerda para a direita. O do meio (índice 2) é o central. */
  screens: ScreenDef[];
  /** Modo história: cenário e tile de início (o fim é a ponta oposta). */
  storyStart: [screen: number, tile: number];
  /** Modo história: cada cenário só libera depois de derrotar todos os inimigos dele. */
  clearToAdvance?: boolean;
  /** Modo história: o último cenário vira a arena do chefe. */
  boss?: { kind: 'minotaur' | 'spider'; arena: ScreenDef };
  /** Frase da tela de vitória (modo história). */
  winText?: string;
  /** Casa assombrada (quebra-cabeça): sai pela porta de saída, não pela ponta do mapa. */
  haunt?: HauntDef;
  /** Modo versus: tiles de início no cenário central. */
  versusStart: [p1Tile: number, p2Tile: number];
}

export const SCREEN_TILES = W / TILE; // 20
/** Pés abaixo disto, numa fase do céu, = caiu no vazio. */
export const SKY_FALL_Y = 640;

const topOf = (h = 0) => FLOOR_Y - h * TILE;

/** Espelha um cenário (para o lado esquerdo ser justo com o P2 no versus). */
function mirror(s: ScreenDef): ScreenDef {
  const m = (t: number) => SCREEN_TILES - 1 - t;
  const ms = (list?: Segment[]) =>
    list?.map(([a, n, h]) => [SCREEN_TILES - a - n, n, h ?? 0] as Segment).sort((x, y) => x[0] - y[0]);
  return {
    segments: ms(s.segments)!,
    floats: ms(s.floats),
    deco: s.deco?.map(([t, k]) => [m(t), k]),
    versusItems: s.versusItems?.map(([t, k, h]) => [m(t), k, h]),
  };
}

// ---------- Fase 1: Ilhas da Maré ----------

const SHORE_R1: ScreenDef = {
  segments: [[0, 4], [6, 4], [12, 2], [15, 5]],
  deco: [[1, 'tree'], [8, 'rock1'], [13, 'stump'], [18, 'tree']],
  versusItems: [[7, 'spear'], [17, 'crest']],
};
const SHORE_R2: ScreenDef = {
  segments: [[0, 8], [11, 2], [14, 6]],
  deco: [[3, 'dead_tree'], [12, 'rock2'], [15, 'rock1'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[5, 'harpoon']],
};

/** Fase 1 — o cenário central reproduz o mockup. Vão de água = buraco: cair nele mata. */
export const LEVEL_1: LevelDef = {
  name: 'Ilhas da Maré',
  theme: 'shore',
  tiles: 'tilemap',
  screens: [
    { ...mirror(SHORE_R2), enemies: [[13, 'gnoll']], storyItems: [[4, 'crest']] },
    { ...mirror(SHORE_R1), enemies: [[11, 'lizard'], [17, 'goblin']], storyItems: [[2, 'bone']] },
    {
      segments: [[0, 13], [15, 3], [18, 2]],
      deco: [[6, 'rock1'], [11, 'stump']],
      enemies: [[16, 'lizard'], [9, 'gnoll']],
      storyItems: [[4, 'spear']],
      versusItems: [[9, 'bone']],
    },
    { ...SHORE_R1, enemies: [[8, 'shark'], [17, 'goblin']], storyItems: [[2, 'harpoon']] },
    { ...SHORE_R2, enemies: [[5, 'lizard'], [12, 'shark'], [16, 'goblin']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

// ---------- Fase 2: Caverna Úmida (sobe e desce, estilo plataforma clássico) ----------

const CAVE_R1: ScreenDef = {
  // Degraus subindo até um bloco alto, poço de água e ponte flutuante por cima.
  segments: [[0, 4, 0], [4, 3, 1], [7, 3, 2], [12, 3, 1], [15, 5, 0]],
  floats: [[10, 2, 3]],
  deco: [[1, 'rock2'], [17, 'stump']],
  versusItems: [[8, 'web', 2]],
};
const CAVE_R2: ScreenDef = {
  segments: [[0, 3, 0], [3, 2, 1], [7, 4, 0], [11, 3, 2], [14, 6, 1]],
  floats: [[5, 2, 2], [8, 3, 4]],
  deco: [[9, 'rock1'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[9, 'wing', 4]],
};
export const LEVEL_2: LevelDef = {
  name: 'Caverna Úmida',
  intro: 'Olhe para cima: aranhas esperam nas teias do teto.',
  theme: 'cave',
  tiles: 'tiles_cave',
  screens: [
    { ...mirror(CAVE_R2), enemies: [[11, 'bat']], storyItems: [[4, 'web']], hangers: [6] },
    { ...mirror(CAVE_R1), enemies: [[6, 'spider'], [17, 'torchgob']], storyItems: [[11, 'wing', 2]], hangers: [9] },
    {
      // Central: chão com dois degraus e uma plataforma flutuante no meio.
      segments: [[0, 5, 0], [5, 3, 1], [8, 4, 0], [12, 3, 1], [15, 5, 0]],
      floats: [[8, 4, 3]],
      deco: [[2, 'rock1'], [17, 'rock2']],
      enemies: [[9, 'spider'], [13, 'bat']],
      storyItems: [[2, 'torch']],
      versusItems: [[9, 'torch', 3]],
      hangers: [6, 14],
    },
    { ...CAVE_R1, enemies: [[3, 'torchgob'], [13, 'spider']], storyItems: [[8, 'web', 2]], hangers: [10] },
    { ...CAVE_R2, enemies: [[8, 'bat'], [12, 'torchgob'], [17, 'spider']], storyItems: [], hangers: [6] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

// ---------- Fase 3: Reino das Nuvens (ilhas no céu; cair no vazio mata) ----------

const SKY_R1: ScreenDef = {
  segments: [[0, 4, 0], [7, 3, 1], [13, 2, 2], [15, 5, 0]],
  floats: [[4, 3, 1], [10, 3, 2]],
  deco: [[1, 'crystal'], [17, 'crystal']],
  versusItems: [[11, 'honey', 2]],
};
const SKY_R2: ScreenDef = {
  segments: [[0, 5, 0], [8, 3, 1], [14, 6, 0]],
  floats: [[5, 3, 0], [11, 3, 2], [9, 2, 4]],
  deco: [[2, 'crystal'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[9, 'acorn', 4]],
};
export const LEVEL_3: LevelDef = {
  name: 'Santuário das Nuvens',
  intro: 'Só as nuvens encantadas pelo Xamã, as que brilham, aguentam o seu peso.',
  theme: 'sky',
  tiles: 'tiles_sky',
  screens: [
    { ...mirror(SKY_R2), enemies: [[16, 'sgnome']], storyItems: [[3, 'acorn']] },
    { ...mirror(SKY_R1), enemies: [[11, 'bee'], [17, 'sgnome']], storyItems: [[2, 'honey']] },
    {
      // Central: duas ilhas ligadas por uma ponte de nuvem e uma nuvem alta no meio.
      segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]],
      floats: [[6, 2, 0], [12, 2, 0], [9, 2, 3]],
      deco: [[3, 'crystal'], [17, 'crystal']],
      enemies: [[9, 'sgnome'], [16, 'bee']],
      storyItems: [[4, 'honey']],
      versusItems: [[10, 'honey', 1]],
    },
    { ...SKY_R1, enemies: [[2, 'bee'], [8, 'sgnome']], storyItems: [[16, 'acorn']] },
    { ...SKY_R2, enemies: [[3, 'sgnome'], [9, 'bee'], [16, 'bee']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

// ---------- Fase 3: Forja Vulcânica (a casa do Diabrete) ----------

const VOL_R1: ScreenDef = {
  // Pedras flutuantes sobre poços de lava, subindo e descendo.
  segments: [[0, 5, 0], [7, 2, 1], [11, 2, 2], [15, 5, 0]],
  floats: [[5, 2, 1], [9, 2, 2], [13, 2, 1]],
  deco: [[2, 'rock2'], [17, 'dead_tree']],
  versusItems: [[16, 'horn']],
};
const VOL_R2: ScreenDef = {
  segments: [[0, 4, 0], [4, 3, 1], [9, 3, 0], [14, 6, 1]],
  floats: [[7, 2, 2], [12, 2, 2]],
  deco: [[1, 'bones'], [10, 'rock1'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[10, 'torch']],
};
export const LEVEL_VOLCANO: LevelDef = {
  name: 'Forja Vulcânica',
  intro: 'A casa do Diabrete. Cada área só abre quando todos os inimigos dela caírem.',
  theme: 'volcano',
  tiles: 'tiles_volcano',
  clearToAdvance: true,
  winText: 'O Minotauro Rubro caiu! Fragmento recuperado!',
  boss: {
    kind: 'minotaur',
    // Arena: chão inteiro de pedra com duas saliências para escapar das investidas.
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'skull_spike'], [18, 'skull_spike']] },
  },
  screens: [
    { ...mirror(VOL_R2), enemies: [[9, 'imp']], storyItems: [[3, 'ember']] },
    { ...mirror(VOL_R1), enemies: [[11, 'imp'], [16, 'minotaur']], storyItems: [[8, 'horn', 2]] },
    {
      segments: [[0, 5, 0], [5, 2, 1], [9, 2, 2], [13, 2, 1], [15, 5, 0]],
      floats: [[7, 2, 2], [11, 2, 2]],
      deco: [[2, 'dead_tree'], [17, 'rock2']],
      enemies: [[10, 'imp'], [16, 'torchgob']],
      storyItems: [[2, 'torch']],
      versusItems: [[10, 'ember', 2]],
    },
    { ...VOL_R1, enemies: [[2, 'minotaur'], [8, 'imp']], storyItems: [[12, 'horn', 2]] },
    { ...VOL_R2, enemies: [[5, 'torchgob'], [10, 'minotaur'], [16, 'imp']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Ordem das fases: praia, caverna, vulcão e, no fim, o santuário do Xamã no céu. */
// ---------- Fase 5: Escadaria da Maré (combinações de ações) ----------

/** Bloco de 2 tiles: só se sobe com pulo duplo. */
const STAIR_JUMP: ScreenDef = {
  segments: [[0, 9], [9, 3, 2], [12, 8]],
  deco: [[1, 'rock2'], [15, 'rock1'], [18, 'stump']],
  versusItems: [[16, 'spear']],
};
/** Vão de 7 tiles: o pulo duplo andando não alcança; só correndo + pulo duplo. */
const STAIR_DASH: ScreenDef = {
  segments: [[0, 7], [14, 6]],
  deco: [[1, 'dead_tree'], [16, 'rock1'], [19, 'skull_spike']],
  versusItems: [[17, 'harpoon']],
};
const SIGN_JUMP = 'PULO DUPLO!\npule e, no ar,\npule de novo';
const SIGN_DASH = 'CORRA!\n2× na direção e segure\n+ pulo duplo';

/**
 * Fase 5 — o caminho até o Portão da Maré. Cada cenário pede uma combinação:
 * pulo duplo para subir, pique + pulo duplo para os vãos largos, e um centro que mistura tudo.
 */
export const LEVEL_STAIRS: LevelDef = {
  name: 'Escadaria da Maré',
  winText: 'O Portão da Maré está diante de você!',
  intro: 'Até o Portão da Maré, só passa quem combina corrida, pulo duplo e coragem.',
  theme: 'shore',
  tiles: 'tilemap',
  screens: [
    { ...STAIR_JUMP, sign: [5, SIGN_JUMP], enemies: [[16, 'gnoll']], storyItems: [[3, 'spear']] },
    { ...STAIR_DASH, sign: [4, SIGN_DASH], enemies: [[17, 'lizard']], storyItems: [] },
    {
      // Central: degraus subindo, um poço entre dois blocos altos (pique + pulo) e a ponte por cima.
      segments: [[0, 4, 0], [4, 2, 1], [6, 2, 2], [11, 3, 2], [14, 2, 1], [16, 4, 0]],
      floats: [[8, 3, 4]],
      deco: [[1, 'tree'], [18, 'tree']],
      enemies: [[12, 'goblin'], [17, 'shark']],
      storyItems: [[2, 'harpoon']],
      versusItems: [[9, 'bone', 4]],
    },
    { ...mirror(STAIR_DASH), sign: [15, SIGN_DASH], enemies: [[16, 'minotaur']], storyItems: [[2, 'horn']] },
    { ...mirror(STAIR_JUMP), sign: [14, SIGN_JUMP], enemies: [[15, 'goblin'], [4, 'imp']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

// ---------- Fases 6-8: casas assombradas (quebra-cabeças, só no modo história) ----------

/** Parede alta entre os cômodos (não dá para pular): só se passa pelas portas. */
const WALL = 6;

/**
 * Casa das Portas: cada cômodo é fechado por paredes. Portas com a LUA levam adiante; as
 * outras (sol, estrela, caveira e a lua VERMELHA, a ilusão) devolvem ao começo.
 */
export const LEVEL_DOORS: LevelDef = {
  name: 'Casa das Portas',
  intro: 'A casa engana. Siga a lua, e desconfie dela também.',
  theme: 'haunted',
  tiles: 'tilemap',
  winText: 'Você achou a saída do labirinto de portas!',
  screens: [
    { segments: [[0, 19, 0], [19, 1, WALL]], sign: [4, 'A CASA ENGANA.\nSiga sempre a LUA.\n(PEGAR: entrar)'] },
    { segments: [[0, 1, WALL], [1, 10, 0], [11, 3, 2], [14, 5, 0], [19, 1, WALL]], enemies: [[8, 'skull']] },
    { segments: [[0, 1, WALL], [1, 6, 0], [11, 8, 0], [19, 1, WALL]], floats: [[8, 2, 2]], sign: [5, 'Nem toda lua\ndiz a verdade.'], enemies: [[4, 'bat'], [15, 'skull']] },
    { segments: [[0, 1, WALL], [1, 4, 3], [5, 3, 1], [8, 11, 0], [19, 1, WALL]], enemies: [[11, 'skull'], [15, 'skull']] },
    { segments: [[0, 1, WALL], [1, 19, 0]], sign: [6, 'A SAÍDA!'], enemies: [[11, 'skull']] },
  ],
  haunt: {
    doors: [
      { id: 'start', screen: 0, tile: 1 },
      { id: 'a0', screen: 0, tile: 9, symbol: 'moon', to: 'b1' },
      { id: 't0', screen: 0, tile: 14, symbol: 'sun', to: 'start', trick: true },
      { id: 'b1', screen: 1, tile: 3, to: 'a0' },
      { id: 't1a', screen: 1, tile: 7, symbol: 'star', to: 'start', trick: true },
      { id: 'a1', screen: 1, tile: 12, h: 2, symbol: 'moon', to: 'b2' },
      { id: 't1b', screen: 1, tile: 16, symbol: 'skull', to: 'start', trick: true },
      { id: 'b2', screen: 2, tile: 3, to: 'a1' },
      { id: 't2', screen: 2, tile: 13, symbol: 'redmoon', to: 'start', trick: true },
      { id: 'a2', screen: 2, tile: 17, symbol: 'moon', to: 'b3' },
      { id: 'b3', screen: 3, tile: 17, to: 'a2' },
      { id: 't3a', screen: 3, tile: 10, symbol: 'star', to: 'start', trick: true },
      { id: 't3b', screen: 3, tile: 13, symbol: 'redmoon', to: 'start', trick: true },
      { id: 'a3', screen: 3, tile: 2, h: 3, symbol: 'moon', to: 'b4' },
      { id: 'b4', screen: 4, tile: 2, to: 'a3' },
      { id: 'exit', screen: 4, tile: 17, symbol: 'moon', exit: true },
    ],
  },
  storyStart: [0, 3],
  versusStart: [3, 16],
};

/**
 * Biblioteca Assombrada: a saída está trancada. Alavancas acendem pontes-fantasma por pouco
 * tempo; uma parede só se cruza por portas; a chave fica no alto das prateleiras.
 */
export const LEVEL_LIBRARY: LevelDef = {
  name: 'Biblioteca Assombrada',
  intro: 'A saída está trancada. Em algum lugar entre as estantes, uma chave espera.',
  theme: 'haunted',
  tiles: 'tilemap',
  winText: 'A chave girou na fechadura!',
  screens: [
    { segments: [[0, 20, 0]], sign: [5, 'A SAÍDA ESTÁ TRANCADA.\nAche a CHAVE.'], enemies: [[15, 'skull']] },
    { segments: [[0, 6, 0], [14, 6, 0]], sign: [2, 'GOLPEIE A ALAVANCA.\nA ponte some rápido!'] },
    { segments: [[0, 9, 0], [9, 2, WALL], [11, 9, 0]], enemies: [[3, 'skull'], [17, 'skull']] },
    { segments: [[0, 20, 0]], floats: [[4, 3, 2], [9, 3, 4], [14, 3, 2]], enemies: [[7, 'skull'], [17, 'skull']] },
    { segments: [[0, 4, 0], [12, 8, 0]] },
  ],
  haunt: {
    levers: [
      { screen: 1, tile: 4, group: 'g1', ms: 6000 },
      { screen: 1, tile: 16, group: 'g1', ms: 6000 },
      { screen: 4, tile: 2, group: 'g2', ms: 4500 },
      { screen: 4, tile: 13, group: 'g2', ms: 4500 },
    ],
    ghostFloors: [
      { screen: 1, tile: 6, n: 8, group: 'g1' },
      { screen: 4, tile: 4, n: 8, group: 'g2' },
    ],
    doors: [
      { id: 'w1', screen: 2, tile: 6, symbol: 'star', to: 'w2' },
      { id: 'w2', screen: 2, tile: 13, symbol: 'star', to: 'w1' },
      { id: 'exit', screen: 4, tile: 17, exit: true },
    ],
    key: [3, 10, 4],
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/**
 * Casa Sem Luz: escuridão quase total. Encostar nas velas acende a luz; pisos rachados desabam
 * logo depois de pisados (não pare em cima deles!). A saída só abre com as 3 velas grandes acesas.
 */
export const LEVEL_DARK: LevelDef = {
  name: 'Casa Sem Luz',
  intro: 'Não dá para ver nada. Acenda as velas, e não pare em pisos rachados.',
  theme: 'haunted',
  tiles: 'tilemap',
  winText: 'As velas acesas mostraram o caminho!',
  screens: [
    { segments: [[0, 20, 0]], sign: [3, 'ESTÁ ESCURO...\nEncoste nas velas\npara acendê-las.'] },
    { segments: [[0, 5, 0], [9, 3, 0], [15, 5, 0]] },
    { segments: [[0, 6, 0], [14, 6, 0]], floats: [[7, 2, 2], [11, 2, 2]], enemies: [[17, 'skull']] },
    { segments: [[0, 7, 0], [16, 4, 0]], floats: [[9, 2, 3], [12, 2, 3]], enemies: [[3, 'skull']] },
    { segments: [[0, 20, 0]], sign: [10, 'A porta só abre com\nas 3 VELAS GRANDES acesas.'], enemies: [[6, 'skull']] },
  ],
  haunt: {
    dark: true,
    crumbles: [
      { screen: 1, tile: 5, n: 4 },
      { screen: 1, tile: 12, n: 3 },
      { screen: 3, tile: 7, n: 9 },
    ],
    candles: [
      { screen: 0, tile: 7 },
      { screen: 0, tile: 15, big: true },
      { screen: 1, tile: 2 },
      { screen: 1, tile: 10 },
      { screen: 1, tile: 17, big: true },
      { screen: 2, tile: 3 },
      { screen: 2, tile: 16 },
      { screen: 3, tile: 2 },
      { screen: 3, tile: 18, big: true },
      { screen: 4, tile: 5 },
    ],
    doors: [{ id: 'exit', screen: 4, tile: 17, exit: true }],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

// ---------- Fases de aranhas (antes da lava) ----------

/** Ninho das Teias: o teto é cheio de aranhas penduradas; dá para passar sem derrotar todas. */
export const LEVEL_NEST: LevelDef = {
  name: 'Ninho das Teias',
  intro: 'O teto está cheio de aranhas. Olhe para cima, e não pare de andar.',
  theme: 'cave',
  tiles: 'tiles_cave',
  screens: [
    { segments: [[0, 7, 0], [9, 4, 1], [15, 5, 0]], floats: [[7, 2, 2]], deco: [[1, 'rock2']], hangers: [4, 11, 16], enemies: [[17, 'spider']], storyItems: [[2, 'web']], versusItems: [[2, 'web']] },
    { segments: [[0, 3, 0], [3, 3, 2], [8, 3, 1], [13, 7, 0]], floats: [[6, 2, 3], [11, 2, 3]], hangers: [5, 9, 15], enemies: [[9, 'bat'], [16, 'spider']], versusItems: [[16, 'wing']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2], [13, 2, 2]], deco: [[17, 'stump']], hangers: [3, 10, 17], enemies: [[10, 'spider'], [17, 'torchgob']], storyItems: [[8, 'wing']], versusItems: [[9, 'torch']] },
    { segments: [[0, 4, 1], [6, 3, 0], [11, 2, 2], [15, 5, 0]], floats: [[4, 2, 3], [9, 2, 3], [13, 2, 4]], hangers: [7, 12, 18], enemies: [[6, 'bat'], [16, 'spider']], versusItems: [[7, 'web']] },
    { segments: [[0, 6, 0], [8, 12, 0]], deco: [[18, 'rock1']], hangers: [4, 10, 14, 17], enemies: [[12, 'spider'], [16, 'spider']], versusItems: [[2, 'web']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Covil da Rainha: aranhas pelo caminho e, no fundo, a Aranha-Rainha (chefe). */
export const LEVEL_QUEEN: LevelDef = {
  name: 'Covil da Rainha',
  intro: 'No fundo do covil, a Rainha guarda o fragmento entre os ovos.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'A Aranha-Rainha caiu! Fragmento recuperado!',
  screens: [
    { segments: [[0, 20, 0]], deco: [[2, 'rock2'], [18, 'rock1']], hangers: [6, 12, 17], enemies: [[15, 'spider']], storyItems: [[3, 'web']], versusItems: [[3, 'web']] },
    { segments: [[0, 4, 0], [4, 3, 1], [9, 2, 2], [13, 7, 0]], floats: [[7, 2, 3], [11, 2, 3]], hangers: [5, 14], enemies: [[14, 'spider'], [18, 'bat']], versusItems: [[15, 'wing']] },
    { segments: [[0, 6, 0], [9, 5, 1], [16, 4, 0]], floats: [[6, 3, 2], [14, 2, 2]], hangers: [3, 11, 17], enemies: [[11, 'spider']], storyItems: [[2, 'torch']], versusItems: [[10, 'torch', 1]] },
    { segments: [[0, 3, 0], [5, 3, 0], [10, 3, 1], [15, 5, 0]], floats: [[3, 2, 2], [8, 2, 2], [13, 2, 2]], hangers: [6, 12], enemies: [[17, 'spider']], versusItems: [[16, 'web']] },
    { segments: [[0, 20, 0]], hangers: [5, 10, 15], enemies: [[10, 'spider']], versusItems: [[17, 'wing']] },
  ],
  boss: {
    kind: 'spider',
    arena: { segments: [[0, 20, 0]], floats: [[4, 3, 3], [13, 3, 3]], deco: [[1, 'rock2'], [18, 'rock2']] },
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};

export const LEVELS: LevelDef[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_NEST,
  LEVEL_QUEEN,
  LEVEL_VOLCANO,
  LEVEL_3,
  LEVEL_STAIRS,
  LEVEL_DOORS,
  LEVEL_LIBRARY,
  LEVEL_DARK,
];

export class Level {
  readonly def: LevelDef;
  readonly width: number;
  readonly ground: Phaser.Physics.Arcade.StaticGroup;
  /** Plataformas maciças e flutuantes em tiles globais. */
  readonly segments: Segment[];
  readonly floats: Segment[];
  private clouds: Array<{ img: Phaser.GameObjects.Image; speed: number }> = [];
  private waves: Phaser.GameObjects.TileSprite[] = [];
  private lavaBody?: Phaser.GameObjects.TileSprite;
  private lavaTop: Phaser.GameObjects.TileSprite[] = [];
  private cloudSpan = 0;

  constructor(private scene: Phaser.Scene, def: LevelDef) {
    this.def = def;
    this.width = def.screens.length * W;
    this.ground = scene.physics.add.staticGroup();
    const glob = (list: Segment[] | undefined, i: number) =>
      (list ?? []).map(([a, n, h]) => [a + i * SCREEN_TILES, n, h ?? 0] as Segment);
    this.segments = def.screens.flatMap((s, i) => glob(s.segments, i));
    this.floats = def.screens.flatMap((s, i) => glob(s.floats, i));
    this.buildBackground();
    this.buildTerrain();
  }

  get theme(): Theme {
    return this.def.theme;
  }
  get hasWater(): boolean {
    return this.def.theme !== 'sky' && this.def.theme !== 'haunted';
  }
  get screenCount(): number {
    return this.def.screens.length;
  }

  /** x central de um tile local de um cenário. */
  tileX(screen: number, tile: number): number {
    return screen * W + tile * TILE + TILE / 2;
  }

  screenOf(x: number): number {
    return Phaser.Math.Clamp(Math.floor(x / W), 0, this.screenCount - 1);
  }

  /** Altura dos pés no chão maciço sob x (null = buraco). */
  groundY(x: number): number | null {
    const seg = this.segments.find(([s, n]) => x >= s * TILE + 6 && x <= (s + n) * TILE - 6);
    return seg ? topOf(seg[2]) : null;
  }

  isGround(x: number): boolean {
    return this.groundY(x) !== null;
  }

  /** Superfície (chão ou flutuante) que algo caindo de prevY até y atravessou em x. */
  landingY(x: number, prevY: number, y: number): number | null {
    let best: number | null = null;
    for (const [s, n, h] of [...this.segments, ...this.floats]) {
      if (x < s * TILE || x > (s + n) * TILE) continue;
      const t = topOf(h);
      if (t >= prevY - 2 && t <= y && (best === null || t < best)) best = t;
    }
    return best;
  }

  /** Ponto de chão maciço mais próximo de x, de preferência na direção dir e dentro de [min,max]. */
  nearestGround(x: number, dir: number, min = 48, max = this.width - 48): number {
    const cx0 = Phaser.Math.Clamp(x, min, max);
    if (this.isGround(cx0)) return cx0;
    let best = cx0;
    let bestDist = Infinity;
    for (const [s, n] of this.segments) {
      const a = Math.max(s * TILE + 36, min);
      const b = Math.min((s + n) * TILE - 36, max);
      if (a > b) continue;
      const cx = Phaser.Math.Clamp(cx0, a, b);
      const d = Math.abs(cx - cx0) + (Math.sign(cx - cx0) === -dir ? 300 : 0);
      if (d < bestDist) {
        bestDist = d;
        best = cx;
      }
    }
    return best;
  }

  /** Movimento contínuo do cenário: nuvens com o vento e ondas na água. */
  update(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const c of this.clouds) {
      c.img.x += c.speed * dt;
      if (c.img.x > this.cloudSpan) c.img.x = -600;
    }
    if (this.waves.length) {
      const camX = this.scene.cameras.main.scrollX;
      const [a, b] = this.waves;
      a.tilePositionX = camX + time * 0.02;
      a.tilePositionY = Math.sin(time / 900) * 3;
      b.tilePositionX = (camX * 0.8 - time * 0.015) / 1.6;
      b.tilePositionY = Math.cos(time / 1100) * 3;
    }
    if (this.lavaBody) {
      const camX = this.scene.cameras.main.scrollX;
      // Veios fluindo devagar e ondas de calor na crista (em passos de pixel).
      this.lavaBody.tilePositionX = Math.round((camX + time * 0.012) / 2) * 2;
      this.lavaBody.tilePositionY = Math.round(Math.sin(time / 1400) * 4 + time * 0.004);
      const [a, b] = this.lavaTop;
      a.tilePositionX = Math.round((camX * 0.9 - time * 0.03) / 2) * 2;
      a.y = WATER_Y - 10 + Math.round(Math.sin(time / 520) * 2) * 2;
      b.tilePositionX = Math.round((camX + time * 0.045) / 2) * 2;
      b.y = WATER_Y - 6 + Math.round(Math.cos(time / 610)) * 2;
    }
  }

  // ---------- fundo ----------

  /** Pedra chamuscada no vulcão. */
  private get rockTint(): number {
    return this.isLava ? 0xd28e78 : 0xffffff;
  }

  get isLava(): boolean {
    return this.def.theme === 'volcano';
  }

  private buildBackground(): void {
    const t = this.def.theme;
    if (t === 'cave') this.caveBackground();
    else if (t === 'volcano') this.volcanoBackground();
    else if (t === 'haunted') this.hauntedBackground();
    else this.skyBackground(t === 'sky');
    if (this.hasWater) this.water(t);
    else if (t === 'haunted') this.hauntedVoid();
    else this.cloudSea();
  }

  /** Casarão por dentro: parede, janelas com lua, relâmpagos de vez em quando e poeira no ar. */
  private hauntedBackground(): void {
    const s = this.scene;
    s.add.rectangle(0, -500, W, 500, 0x150c1e).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    s.add.image(0, 0, 'haunt_bg').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    // Relâmpago lá fora: as janelas clareiam por um instante.
    const flash = s.add.rectangle(0, 0, W, 420, 0xcfd8ff, 0).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky + 0.2);
    s.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        if (Math.random() < 0.6) s.tweens.add({ targets: flash, fillAlpha: { from: 0.18, to: 0 }, duration: 380, yoyo: false, repeat: 1 });
      },
    });
    s.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: W },
        y: { min: 60, max: 460 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -6, max: 6 },
        lifespan: 5000,
        scale: { start: 0.12, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: [0xb9a6ff, 0xfff1a8],
        frequency: 260,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
  }

  /** Breu sob o casarão, com névoa lilás subindo (cair aqui = cair no vazio). */
  private hauntedVoid(): void {
    const s = this.scene;
    s.add.rectangle(0, 540, W, 600, 0x07040c).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water);
    s.add
      .particles(0, 0, 'vsmoke_0', {
        x: { min: -40, max: W },
        y: { min: 560, max: 640 },
        speedX: { min: 4, max: 14 },
        speedY: { min: -10, max: -4 },
        lifespan: 6000,
        scale: { start: 0.8, end: 1.6 },
        alpha: { start: 0.35, end: 0 },
        tint: 0x8a6ad0,
        frequency: 380,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.waterRocks);
  }

  /** Vulcão: céu vermelho, vulcões ao fundo, brasas subindo e cinzas caindo. */
  private volcanoBackground(): void {
    const s = this.scene;
    s.add.rectangle(0, -500, W, 500, 0x1a0b14).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    s.add.image(0, 0, 'volcano_bg').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    // Fumaça em pixel art saindo das crateras, levada pelo vento.
    const craters = (s.registry.get('volcanoCraters') as Array<[number, number]>) ?? [];
    craters.forEach(([cx, cy], i) => {
      for (const [key, freq, scale] of [['vsmoke_0', 1500, 1], ['vsmoke_1', 900, 1], ['vsmoke_2', 700, 1]] as const) {
        s.add
          .particles(cx, cy - (i ? 26 : 16), key, {
            speedY: { min: -26, max: -14 },
            speedX: { min: 4, max: 14 },
            accelerationX: 3,
            lifespan: i ? 9000 : 6000,
            scale: { start: scale * (i ? 1 : 0.67), end: scale * (i ? 2 : 1.33) },
            alpha: { start: 0.85, end: 0 },
            frequency: freq * (i ? 1.3 : 1.8),
            x: { min: -8, max: 8 },
          })
          .setScrollFactor(0, 1)
          .setDepth(DEPTH.sky + 0.5);
      }
    });
    s.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: W },
        y: 520,
        speedY: { min: -120, max: -60 },
        speedX: { min: -20, max: 30 },
        lifespan: 4500,
        scale: { start: 0.3, end: 0 },
        tint: [0xffb347, 0xff6a1a, 0xffe066],
        frequency: 90,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
    s.add
      .particles(0, 0, 'leaf', {
        x: { min: -100, max: W },
        y: -10,
        speedY: { min: 30, max: 60 },
        speedX: { min: 20, max: 60 },
        rotate: { start: 0, end: 360 },
        lifespan: 9000,
        tint: [0x5a4a48, 0x7a6a66, 0x3a2e2e],
        alpha: 0.8,
        frequency: 260,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
  }

  private skyBackground(high: boolean): void {
    const s = this.scene;
    s.add.rectangle(0, -500, W, 500, high ? 0x7fd3ff : 0x59e3b5).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    s.add.image(0, 0, high ? 'sky_high' : 'sky').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);

    const rng = new Phaser.Math.RandomDataGenerator(['skullshift-clouds']);
    const span = W + (this.width - W) * 0.25 + 600;
    this.cloudSpan = span + 400;
    const step = high ? [220, 320] : [330, 460];
    for (let x = -200, i = 0; x < span; x += rng.between(step[0], step[1]), i++) {
      const img = s.add
        .image(x, rng.between(high ? 30 : 70, high ? 330 : 190), `cloud_0${(i % 8) + 1}`)
        .setOrigin(0, 0)
        .setScrollFactor(0.25, 1)
        .setDepth(DEPTH.clouds)
        .setAlpha(high ? 0.9 : 1)
        .setScale(high ? rng.realInRange(0.6, 1.1) : 1);
      this.clouds.push({ img, speed: rng.realInRange(8, 22) });
    }

    if (high) this.sanctuary();

    // Vento: rajadas finas (e folhas, perto do mar).
    s.add
      .particles(0, 0, 'streak', {
        x: { min: -120, max: W - 200 },
        y: { min: 40, max: 400 },
        speedX: { min: 650, max: 950 },
        lifespan: 900,
        alpha: { start: 0.55, end: 0 },
        scaleX: { min: 0.6, max: 1.4 },
        frequency: high ? 160 : 240,
        quantity: 1,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
    if (!high) {
      s.add
        .particles(0, 0, 'leaf', {
          x: { min: -60, max: W / 2 },
          y: { min: 200, max: 470 },
          speedX: { min: 140, max: 260 },
          speedY: { min: -40, max: 30 },
          rotate: { start: 0, end: 540 },
          lifespan: 6500,
          gravityY: 8,
          tint: [0x7ccf4f, 0x9fd65a, 0x5ea845],
          frequency: 700,
          quantity: 1,
        })
        .setScrollFactor(0, 1)
        .setDepth(DEPTH.deco);
    }
  }

  /** Ao longe: o santuário flutuante do Xamã (silhuetas lilás em parallax). */
  private sanctuary(): void {
    const g = this.scene.add.graphics().setScrollFactor(0.15, 1).setDepth(DEPTH.sky + 0.5);
    const rng = new Phaser.Math.RandomDataGenerator(['sanctuary']);
    for (let x = 80; x < W + this.width * 0.15; x += rng.between(380, 560)) {
      const y = rng.between(150, 260);
      const w = rng.between(120, 200);
      g.fillStyle(0xb9a6ee, 0.45);
      g.fillEllipse(x, y, w, 34);
      g.fillTriangle(x - w / 2 + 10, y, x + w / 2 - 10, y, x + rng.between(-10, 10), y + rng.between(60, 90));
      // Torres e cúpula.
      g.fillRect(x - 26, y - 70, 16, 70).fillRect(x + 10, y - 54, 16, 54);
      g.fillTriangle(x - 30, y - 70, x - 6, y - 70, x - 18, y - 96);
      g.fillTriangle(x + 6, y - 54, x + 30, y - 54, x + 18, y - 78);
      g.fillCircle(x - 2, y - 30, 22);
      g.fillStyle(0xf2c6ff, 0.5).fillCircle(x - 18, y - 60, 4).fillCircle(x + 18, y - 44, 4);
    }
  }

  /** Caverna: fundo escuro com estalactites, brilhos piscando e gotas caindo. */
  private caveBackground(): void {
    const s = this.scene;
    s.add.rectangle(0, -500, W, 500, 0x0b1d24).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    s.add.image(0, 0, 'cave_bg').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    // Pilares distantes em parallax.
    const rng = new Phaser.Math.RandomDataGenerator(['skullshift-cave']);
    for (let x = 0; x < W + (this.width - W) * 0.4; x += rng.between(240, 380)) {
      const w = rng.between(70, 130);
      const g = s.add.graphics().setScrollFactor(0.4, 1).setDepth(DEPTH.clouds);
      g.fillStyle(0x16343d, 1).fillRoundedRect(x, -40, w, rng.between(260, 380), 30);
      g.fillStyle(0x1b3e48, 1).fillRoundedRect(x + 10, -40, w - 30, rng.between(200, 300), 24);
    }
    // Brilhos (como cristais/vagalumes) piscando.
    s.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: W },
        y: { min: 20, max: 420 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1600,
        frequency: 140,
        tint: [0xdffcff, 0xbfe9ff, 0xfff7dc],
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
    // Gotas pingando do teto.
    s.add
      .particles(0, 0, 'drop', {
        x: { min: 0, max: W },
        y: 0,
        speedY: { min: 300, max: 420 },
        gravityY: 600,
        lifespan: 1100,
        alpha: { start: 0.8, end: 0.4 },
        frequency: 260,
      })
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.clouds);
  }

  private water(theme: Theme): void {
    const s = this.scene;
    const dark = theme === 'cave';
    const lava = theme === 'volcano';
    const body = lava ? 0xe8501f : dark ? 0x1d5d6b : 0x39b5fd;
    const edge = lava ? 0xffd36b : dark ? 0x5fa9b5 : 0x8fd9ff;
    s.add.rectangle(0, WATER_Y, W, H - WATER_Y + 200, body).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water);
    if (lava) s.add.rectangle(0, WATER_Y + 40, W, H, 0xb8321a).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(0.6);
    s.add.rectangle(0, WATER_Y, W, 4, edge).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water);
    // Camada translúcida NA FRENTE dos personagens: o que está abaixo da linha parece submerso.
    s.add
      .rectangle(0, WATER_Y + 14, W, H, body)
      .setOrigin(0)
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.fighters + 0.5)
      .setAlpha(lava ? 0.55 : 0.38);
    s.add.rectangle(0, WATER_Y + 12, W, 3, edge).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.5).setAlpha(0.7);
    this.waves = [
      s.add.tileSprite(0, WATER_Y + 8, W, 260, 'waves').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(dark ? 0.3 : 0.55),
      s.add.tileSprite(0, WATER_Y + 30, W, 240, 'waves').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(dark ? 0.18 : 0.3).setTileScale(1.6, 1.3),
    ];
    if (lava) {
      this.waves.forEach((w) => w.destroy());
      // Lava viva: corpo com veios de casca escura que correm devagar e uma crista clara
      // ondulando na superfície; bolhas crescem e estouram em pixel art.
      this.lavaBody = s.add.tileSprite(0, WATER_Y + 6, W, H - WATER_Y + 200, 'lava_body').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water);
      this.lavaTop = [
        s.add.tileSprite(0, WATER_Y - 10, W, 32, 'lava_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setTint(0xffb08a),
        s.add.tileSprite(0, WATER_Y - 6, W, 32, 'lava_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water),
      ];
      this.waves = [];
      s.time.addEvent({
        delay: 140,
        loop: true,
        callback: () => {
          const b = s.add
            .sprite(Phaser.Math.Between(0, W), WATER_Y + Phaser.Math.Between(0, 60), 'lava_bubble', 0)
            .setOrigin(0.5, 1)
            .setScrollFactor(0, 1)
            .setDepth(DEPTH.water);
          b.play('lava_bubble');
          b.once('animationcomplete', () => b.destroy());
        },
      });
      return;
    }
    const rr = new Phaser.Math.RandomDataGenerator(['skullshift-rocks']);
    for (let x = 300; x < this.width; x += rr.between(300, 560)) {
      s.add
        .sprite(x, rr.between(WATER_Y + 60, H - 30), 'water_rocks')
        .setDepth(DEPTH.waterRocks)
        .setScale(rr.realInRange(1.1, 1.5))
        .setTint(dark ? 0x8fb4bd : 0xffffff)
        .play({ key: 'water_rocks', startFrame: rr.between(0, 15) });
    }
  }

  /** Céu: mar de nuvens embaixo (cair nele = cair no vazio). */
  private cloudSea(): void {
    const s = this.scene;
    for (const [sf, y, alpha, depth] of [
      [0.5, 560, 0.55, DEPTH.water],
      [1, 610, 0.7, DEPTH.waterRocks],
    ] as const) {
      for (let x = -300, i = 0; x < (sf === 1 ? this.width : W + this.width * 0.5) + 300; x += 260, i++) {
        const img = s.add
          .image(x, y + (i % 3) * 14, `cloud_0${(i % 8) + 1}`)
          .setOrigin(0, 0.5)
          .setScale(sf === 1 ? 0.9 : 0.7)
          .setAlpha(alpha)
          .setScrollFactor(sf, 1)
          .setDepth(depth);
        this.clouds.push({ img, speed: sf === 1 ? 0 : 6 });
      }
    }
  }

  // ---------- terreno ----------

  private buildTerrain(): void {
    const s = this.scene;
    const COLS = 9;
    const key = this.def.tiles;
    // Junta plataformas contíguas de mesma altura para desenhar.
    const merged: Segment[] = [];
    for (const seg of this.segments) {
      const last = merged[merged.length - 1];
      if (last && last[0] + last[1] === seg[0] && (last[2] ?? 0) === (seg[2] ?? 0)) last[1] += seg[1];
      else merged.push([seg[0], seg[1], seg[2] ?? 0]);
    }
    for (const [start, n, hh] of merged) {
      const h = hh ?? 0;
      const gy = GRASS_Y - h * TILE;
      if (this.theme === 'sky') {
        this.enchantedCloud(start, n, topOf(h), 548);
        this.addSolid(start, n, h);
        continue;
      }
      if (this.theme === 'haunted') {
        // Casarão: tábuas por cima e tijolos até a base, com contorno escuro nas pontas.
        for (let i = 0; i < n; i++) {
          const x = (start + i) * TILE;
          s.add.image(x, gy + 40, 'hfloor_top').setOrigin(0).setDepth(DEPTH.terrain);
          for (let r = 1; r <= h + 1; r++) s.add.image(x, gy + 40 + r * TILE, 'hfloor_body').setOrigin(0).setDepth(DEPTH.terrain);
        }
        const g = s.add.graphics().setDepth(DEPTH.terrain);
        g.fillStyle(0x1d1a2b).fillRect(start * TILE - 4, gy + 36, 4, (h + 2) * TILE + 8);
        g.fillStyle(0x1d1a2b).fillRect((start + n) * TILE, gy + 36, 4, (h + 2) * TILE + 8);
        g.fillStyle(0x1d1a2b).fillRect(start * TILE - 4, gy + 36, n * TILE + 8, 4);
        this.addSolid(start, n, h);
        continue;
      }
      if (this.hasWater) {
        for (let i = 0; i < n; i++) {
          s.add
            .sprite((start + i) * TILE + TILE / 2, GRASS_Y + TILE + 28, 'water_foam')
            .setDepth(DEPTH.waterRocks)
            .setTint(this.theme === 'cave' ? 0x9fc6cc : this.isLava ? 0xff8c3a : 0xffffff)
            .play({ key: 'water_foam', startFrame: (start + i) % 16 });
        }
      }
      for (let i = 0; i < n; i++) {
        const col = n === 1 ? 8 : i === 0 ? 5 : i === n - 1 ? 7 : 6;
        const x = (start + i) * TILE;
        s.add.image(x, gy, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint);
        // Rocha até a base (a última fileira tem a borda com espuma).
        for (let r = 1; r <= h + 1; r++) {
          const row = r === h + 1 ? 5 : 4;
          s.add.image(x, gy + r * TILE, key, row * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint);
        }
      }
      if (this.theme === 'shore') {
        for (let t = start + 0.9; t < start + n - 0.4; t += 2.45) {
          s.add
            .sprite(t * TILE, gy + 44, 'bush')
            .setScale(0.42)
            .setDepth(DEPTH.deco)
            .play({ key: 'bush', startFrame: Math.floor(t) % 8 });
        }
      }
      this.addSolid(start, n, h);
    }

    // Plataformas flutuantes (só seguram por cima).
    for (const [start, n, hh] of this.floats) {
      const h = hh ?? 0;
      const top = topOf(h);
      if (this.theme === 'sky') this.enchantedCloud(start, n, top, top + 30);
      else if (this.theme === 'haunted') {
        for (let i = 0; i < n; i++) s.add.image((start + i) * TILE, top - 2, 'hplank').setOrigin(0).setDepth(DEPTH.terrain);
      } else {
        for (let i = 0; i < n; i++) {
          const col = n === 1 ? 3 : i === 0 ? 0 : i === n - 1 ? 2 : 1;
          s.add.image((start + i) * TILE, top - 40, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint);
        }
      }
      const w = n * TILE;
      const zone = s.add.zone(start * TILE + w / 2, top + 7, w, 14);
      s.physics.add.existing(zone, true);
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      this.ground.add(zone);
    }

    this.def.screens.forEach((sc, i) => {
      for (const [tile, kind] of sc.deco ?? []) {
        const x = this.tileX(i, tile);
        this.addDeco(x, kind, tile, this.groundY(x) ?? FLOOR_Y);
      }
      if (sc.sign) {
        const x = this.tileX(i, sc.sign[0]);
        this.addSign(x, this.groundY(x) ?? FLOOR_Y, sc.sign[1]);
      }
    });

    // Marcos de chegada nas duas pontas.
    for (const x of [TILE / 2 + 8, this.width - TILE / 2 - 8]) {
      const y = this.groundY(x) ?? FLOOR_Y;
      this.addDeco(x - 22, 'skull_spike', 0, y);
      this.addDeco(x + 22, 'skull_spike', 0, y);
    }
  }

  /** Bloco maciço: o topo é o chão e os lados são paredes. */
  private addSolid(start: number, n: number, h: number): void {
    const top = topOf(h);
    const w = n * TILE;
    const zh = 600 - top;
    const zone = this.scene.add.zone(start * TILE + w / 2, top + zh / 2, w, zh);
    this.scene.physics.add.existing(zone, true);
    this.ground.add(zone);
  }

  /**
   * Nuvem encantada pelo Xamã (fase do céu): a única que aguenta peso. Lilás, com borda de
   * magia, runas que pulsam e faíscas subindo, bem diferente das nuvens brancas de enfeite.
   */
  private enchantedCloud(start: number, n: number, top: number, bottom: number): void {
    const s = this.scene;
    const x0 = start * TILE;
    const w = n * TILE;
    const g = s.add.graphics().setDepth(DEPTH.terrain);
    const hgt = bottom - top;
    g.fillStyle(0xb27cff, 0.22).fillRoundedRect(x0 - 8, top - 18, w + 16, hgt + 30, 26);
    g.fillStyle(0xb9a6ee, 1).fillRoundedRect(x0, top - 6, w, hgt + 6, 20);
    g.fillStyle(0xf4eeff, 1).fillRoundedRect(x0 + 3, top - 10, w - 6, hgt - 4, 18);
    // Bordas fofas em cima e embaixo.
    for (let x = x0 + 16; x <= x0 + w - 16; x += 24) {
      g.fillStyle(0xffffff, 1).fillCircle(x, top - 6, 13 + ((x / 24) % 2) * 3);
      g.fillStyle(0xd7c8ff, 1).fillCircle(x + 6, bottom - 4, 12);
    }
    g.lineStyle(3, 0x9b6bf0, 0.9).strokeRoundedRect(x0, top - 14, w, hgt + 10, 20);
    g.lineStyle(2, 0xffffff, 0.9).lineBetween(x0 + 14, top - 2, x0 + w - 14, top - 2);
    // Runas do Xamã no meio da nuvem, pulsando.
    const runes = s.add.graphics().setDepth(DEPTH.terrain + 0.1);
    const ry = top + Math.min(hgt * 0.45, 40);
    for (let x = x0 + 28; x <= x0 + w - 24; x += 48) {
      runes.lineStyle(2.5, 0xa86bff, 1);
      runes.strokeTriangle(x - 7, ry + 6, x + 7, ry + 6, x, ry - 8);
      runes.fillStyle(0xe3c8ff, 1).fillCircle(x, ry + 1, 2.5);
    }
    s.tweens.add({ targets: runes, alpha: { from: 1, to: 0.35 }, duration: 900 + start * 13, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Faíscas mágicas subindo do topo.
    s.add
      .particles(0, 0, 'spark', {
        x: { min: x0 + 8, max: x0 + w - 8 },
        y: top - 4,
        speedY: { min: -40, max: -20 },
        lifespan: 1200,
        scale: { start: 0.22, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xd9b3ff, 0xfff7dc, 0xb27cff],
        frequency: Math.max(120, 900 / n),
      })
      .setDepth(DEPTH.deco);
  }

  /** Cristal mágico flutuando (decoração do céu, no lugar de árvores). */
  private crystal(x: number, ground: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    g.fillStyle(0xb27cff, 0.25).fillCircle(0, 0, 26);
    g.fillStyle(0x1d1a2b, 1).fillPoints([{ x: 0, y: -34 }, { x: 14, y: 0 }, { x: 0, y: 30 }, { x: -14, y: 0 }], true);
    g.fillStyle(0xc58cff, 1).fillPoints([{ x: 0, y: -30 }, { x: 11, y: 0 }, { x: 0, y: 26 }, { x: -11, y: 0 }], true);
    g.fillStyle(0xf2dcff, 1).fillPoints([{ x: 0, y: -30 }, { x: 5, y: -2 }, { x: 0, y: 8 }, { x: -6, y: -2 }], true);
    g.setPosition(x, ground - 70);
    s.tweens.add({ targets: g, y: ground - 82, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.add.ellipse(x, ground - 4, 34, 8, 0x9b6bf0, 0.35).setDepth(DEPTH.deco);
  }

  /** Placa de madeira em pixel art (poste, tábuas com veio e pregos) com a dica escrita. */
  private addSign(x: number, ground: number, text: string): void {
    const s = this.scene;
    const label = s.add
      .text(0, 0, text, { fontFamily: BODY_FONT, fontSize: '14px', color: '#fff7dc', align: 'center', lineSpacing: 2, stroke: '#3a2416', strokeThickness: 3 })
      .setOrigin(0.5);
    const w = Math.ceil((label.width + 24) / 4) * 4;
    const h = Math.ceil((label.height + 16) / 4) * 4;
    const g = s.add.graphics();
    const INK = 0x1d1a2b;
    // Poste.
    g.fillStyle(INK).fillRect(-6, -46 - 4, 12, 50);
    g.fillStyle(0x8a5a35).fillRect(-4, -46, 8, 46);
    g.fillStyle(0xb07a48).fillRect(-4, -46, 2, 46);
    // Tábuas.
    g.fillStyle(INK).fillRect(-w / 2 - 4, -46 - h - 4, w + 8, h + 8);
    g.fillStyle(0x9a6438).fillRect(-w / 2, -46 - h, w, h);
    for (let y = -46 - h + 12; y < -46; y += 12) g.fillStyle(0x7a4a2a).fillRect(-w / 2, y, w, 2);
    g.fillStyle(0xc08a52).fillRect(-w / 2, -46 - h, w, 3);
    g.fillStyle(0x5e3a22).fillRect(-w / 2, -50, w, 4);
    for (const px of [-w / 2 + 6, w / 2 - 10]) g.fillStyle(0xd8d0c0).fillRect(px, -46 - h + 6, 4, 4);
    label.setPosition(0, -46 - h / 2 + 1);
    s.add.container(x, ground, [g, label]).setDepth(DEPTH.deco);
  }

  private addDeco(x: number, kind: DecoKind, seed: number, ground: number): void {
    const s = this.scene;
    const base = ground - 6; // um pouco atrás da linha dos pés
    const tint = this.theme === 'cave' ? 0x9fb7bd : 0xffffff;
    switch (kind) {
      case 'tree':
        s.add.sprite(x, base + 18, 'tree').setOrigin(0.5, 1).setScale(0.8).setDepth(DEPTH.deco).play({ key: 'tree', startFrame: seed % 8 });
        break;
      case 'dead_tree':
        s.add.image(x, base + 30, 'dead_tree').setOrigin(0.5, 1).setScale(0.62).setDepth(DEPTH.deco);
        break;
      case 'skull_spike':
        s.add.image(x, base + 10, 'skull_spike').setOrigin(0.5, 1).setDepth(DEPTH.deco);
        break;
      case 'crystal':
        this.crystal(x, ground);
        break;
      default:
        s.add.image(x, base + 8, kind).setOrigin(0.5, 1).setDepth(DEPTH.deco).setTint(tint);
    }
  }
}
