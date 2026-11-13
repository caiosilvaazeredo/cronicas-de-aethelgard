import Phaser from 'phaser';
import { BODY_FONT, DEATH_Y, DEPTH, FLOOR_Y, GRASS_Y, H, TILE, W, WATER_Y } from '../config';
import type { CharId, EnemyId, ItemId } from './characters';
import type { PuzzleDef } from './puzzle';
import type { SeaDef } from './sea';
import type { FieldDef } from './field';

/**
 * Plataforma: início e comprimento em tiles de 64px (locais à tela, 0..19) e altura h
 * (em tiles acima do chão base). Plataformas altas são blocos maciços: dá para subir
 * pulando e elas bloqueiam pelos lados.
 */
export type Segment = [start: number, length: number, h?: number];

/** Cor das construções por tileset (o reino de cada área). */
const BUILDING_COLOR: Record<string, string> = {
  tilemap: 'blue',
  tiles_sand: 'blue',
  tiles_ship: 'blue',
  tiles_prairie: 'yellow',
  tiles_forest: 'purple',
  tiles_swamp: 'black',
  tiles_mine: 'yellow',
  tiles_volcano: 'red',
  tiles_sky: 'red',
  tiles_cave: 'black',
};
/** Onde fica a base de cada construção dentro do desenho (fração da altura). */
const BUILDING_FOOT: Record<string, number> = { castle: 249 / 256, tower: 230 / 256, house1: 173 / 192, house2: 178 / 192, house3: 172 / 192, monastery: 310 / 320, barracks: 245 / 256, archery: 240 / 256 };
/** Prédios a mais no fundo de algumas fases: [cenário, tipo]. */
const EXTRA_BUILDINGS: Record<string, Array<[number, DecoKind]>> = {
  crabs: [[2, 'house']],
  hightide: [[3, 'archery']],
  floodgates: [[2, 'barracks']],
  reef: [[0, 'house']],
  sharkking: [[0, 'castle']],
  farm: [[2, 'barracks']],
  caravan: [[1, 'archery']],
  windmill: [[3, 'monastery']],
  gnollking: [[0, 'castle']],
  swampedge: [[4, 'monastery']],
  fisherman: [[1, 'archery']],
  lizardking: [[0, 'castle']],
  woods: [[2, 'archery']],
  gnomevillage: [[2, 'monastery']],
  gnomeking: [[0, 'castle']],
  mineentry: [[0, 'barracks'], [2, 'house']],
  treasury: [[1, 'castle']],
  forgegate: [[0, 'barracks'], [3, 'tower']],
  anvil: [[1, 'archery']],
  sky: [[2, 'tower']],
  cloudcastle: [[1, 'castle'], [3, 'monastery']],
  wingsgate: [[1, 'castle']],
  wingcastle: [[0, 'barracks'], [2, 'castle']],
  wingguard: [[1, 'monastery']],
  stairs: [[0, 'monastery']],
};

export type DecoKind = 'tree' | 'dead_tree' | 'rock1' | 'rock2' | 'stump' | 'bones' | 'skull_spike' | 'crystal' | 'gold' | 'bush' | 'stone' | 'house' | 'hut' | 'tower' | 'castle' | 'monastery' | 'barracks' | 'archery';
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
  enemies?: Array<[tile: number, char: EnemyId]>;
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
  /** Tochas no lugar das velas (caverna escura). */
  torches?: boolean;
}

export interface LevelDef {
  /** Identificador estável (capítulo da história, saves de presentes, mapa). */
  id: string;
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
  /** Perseguição: uma onda de lava avança da esquerda; parar é morrer. */
  chase?: { speed: number; delay: number; zips?: Array<[screen: number, fromTile: number, fromH: number, toTile: number, toH: number]> };
  /** Correntes de vento (cenário, tile, largura em tiles): levantam quem entra; segurar pulo plana. */
  winds?: Array<[screen: number, tile: number, width: number]>;
  /** Fase de voo com tiro (rolagem automática, montado no morcego). */
  shmup?: boolean;
  /** Voo com chefe no fim (montado no Abelhão). */
  /** Chefe no fim do voo: o Diabrete Gigante ou o rei do reino inimigo (depende do acordo). */
  shmupBoss?: 'imp' | 'king';
  /** Modo história: cada cenário só libera depois de derrotar todos os inimigos dele. */
  clearToAdvance?: boolean;
  /** Modo história: o último cenário vira a arena do chefe. */
  boss?: { kind: 'minotaur' | 'spider' | 'princes' | 'sharkking' | 'shaman' | 'gnollking' | 'gnomeking' | 'goblinking' | 'lizardking'; arena: ScreenDef };
  /** Luta final: a caveira, de volta ao corpo, joga como o aldeão. */
  finale?: boolean;
  /** Fase secreta (fica no fim de LEVELS; aparece no mapa quando o segredo é achado). */
  secret?: boolean;
  /** Fase de chave e porta (quebra-cabeça). */
  puzzle?: PuzzleDef;
  /** Pradaria: estouro de manada e rochas rolando. */
  field?: FieldDef;
  /** Elementos do mar (maré, canhões, caixotes, águas-vivas...). */
  sea?: SeaDef;
  /** Fase debaixo d'água: a caveira vira Tubarão (ou `underseaAs`) e nada livre. */
  undersea?: boolean;
  underseaAs?: 'shark' | 'lizard';
  /** Água do pântano (verde-escura) em vez do mar azul. */
  swamp?: boolean;
  /** Céu de Brasa: céu e nuvens em tons de vermelho, com brasas subindo. */
  ember?: boolean;
  /** Voo: semente e densidade das ondas (1 = normal) e voo de dia (sem a noite). */
  shmupSeed?: string;
  shmupDensity?: number;
  shmupDay?: boolean;
  /** Corrida e tiro: segurar ATACAR atira ossos; inimigos chegam em ondas. */
  gun?: { spawns: EnemyId[]; every: number };
  /** Desafio do mausoléu: proteger a urna das assombrações. */
  mausoleum?: { waves: number };
  /** Filtro de desenho antigo (anos 1930): preto e branco, grão e vinheta. */
  retro?: boolean;
  /** Item secreto escondido nesta fase (rolo de filme). */
  secretItem?: { id: string; at: [screen: number, tile: number, h: number] };
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
  id: 'shore',
  name: 'Ilhas da Maré',
  theme: 'shore',
  tiles: 'tilemap',
  screens: [
    // Praia limpa (sem casas nem a árvore oca: ela vira a área bônus no mapa, mais adiante).
    { ...mirror(SHORE_R2), deco: [[6, 'rock2'], [17, 'tree']], enemies: [[13, 'gnoll']], storyItems: [[4, 'crest']] },
    { ...mirror(SHORE_R1), deco: [[2, 'tree'], [12, 'rock1']], enemies: [[11, 'lizard'], [17, 'goblin']], storyItems: [[2, 'bone']] },
    {
      segments: [[0, 13], [15, 3], [18, 2]],
      deco: [[6, 'rock1'], [11, 'rock2']],
      sign: [1, 'Para TRÁS na hora\ndo golpe: CONTRA!'],
      enemies: [[16, 'lizard'], [9, 'gnoll']],
      storyItems: [[4, 'spear']],
      versusItems: [[9, 'bone']],
    },
    { ...SHORE_R1, deco: [[3, 'rock2'], [16, 'tree']], enemies: [[8, 'shark'], [17, 'goblin']], storyItems: [[2, 'harpoon']] },
    { ...SHORE_R2, deco: [[2, 'tree'], [9, 'rock1']], enemies: [[5, 'lizard'], [12, 'shark'], [16, 'goblin']], storyItems: [] },
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
  id: 'cave',
  name: 'Caverna Úmida',
  // Segredo: um rolo de filme no alto de uma plataforma abre a fase em preto e branco.
  secretItem: { id: 'retro', at: [3, 10, 3] },
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
  id: 'sky',
  name: 'Santuário das Nuvens',
  intro: 'Só as nuvens encantadas pelo Xamã, as que brilham, aguentam o seu peso.',
  theme: 'sky',
  ember: true,
  tiles: 'tiles_volcano',
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
  id: 'volcano',
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
  id: 'stairs',
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
  id: 'doors',
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
  id: 'library',
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
  id: 'dark',
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
  id: 'nest',
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
  id: 'queen',
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

// ---------- Fases de outros tipos ----------

/** Fuga da Forja: a montanha desperta e a lava vem atrás. Correr (de verdade) é obrigatório. */
export const LEVEL_CHASE: LevelDef = {
  id: 'chase',
  name: 'Fuga da Forja',
  intro: 'Uma onda gigante de lava vem atrás! O chão desaba à frente dela: corra, pule, use a tirolesa.',
  theme: 'volcano',
  tiles: 'tiles_volcano',
  winText: 'Você escapou da onda de lava!',
  chase: {
    speed: 230,
    delay: 3000,
    // Tirolesas sobre os lagos de lava (cenários 2 e 4).
    zips: [
      [2, 3, 1, 16, 0],
      [4, 4, 2, 14, 0],
    ],
  },
  screens: [
    { segments: [[0, 8, 0], [10, 3, 0], [15, 5, 1]] },
    { segments: [[0, 3, 1], [5, 4, 0], [11, 2, 1], [15, 5, 0]], floats: [[9, 2, 2]], enemies: [[17, 'torchgob']] },
    // Lago de lava: só a tirolesa atravessa.
    { segments: [[0, 5, 1], [16, 4, 0]] },
    { segments: [[0, 4, 0], [6, 3, 1], [11, 3, 2], [16, 4, 0]], enemies: [[12, 'imp'], [17, 'torchgob']] },
    { segments: [[0, 6, 2], [14, 6, 0]] },
  ],
  storyStart: [0, 3],
  versusStart: [3, 16],
};

/** Correntes do Céu: vãos enormes entre nuvens, cruzados nas correntes de vento e planando. */
export const LEVEL_WINDS: LevelDef = {
  id: 'winds',
  name: 'Correntes do Céu',
  intro: 'Entre nas correntes de vento para subir. Segure PULAR no ar para planar.',
  theme: 'sky',
  ember: true,
  tiles: 'tiles_volcano',
  winText: 'O vento te levou até o outro lado!',
  winds: [
    [0, 8, 3],
    [1, 5, 3],
    [1, 13, 2],
    [2, 6, 3],
    [3, 5, 2],
    [3, 12, 2],
    [4, 7, 3],
  ],
  screens: [
    { segments: [[0, 7, 0], [12, 8, 3]], deco: [[2, 'crystal']], sign: [3, 'VENTO! Entre na corrente\ne segure PULAR\npara planar.'] },
    { segments: [[0, 4, 3], [9, 3, 1], [16, 4, 4]], enemies: [[17, 'bee']] },
    { segments: [[0, 5, 4], [10, 3, 2], [16, 4, 0]], floats: [[13, 2, 3]] },
    { segments: [[0, 4, 0], [8, 3, 3], [15, 5, 1]], enemies: [[9, 'sgnome']] },
    { segments: [[0, 6, 1], [11, 9, 0]], deco: [[17, 'crystal']], enemies: [[15, 'bee']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Voo Noturno: montado num morcego gigante, a tela rola sozinha e os ossos saem atirando. */
export const LEVEL_FLIGHT: LevelDef = {
  id: 'flight',
  name: 'Voo Noturno',
  intro: 'Montado no príncipe aliado, pela noite, até o rei do reino inimigo.',
  theme: 'sky',
  tiles: 'tiles_sky',
  winText: 'O rei caiu do céu da noite!',
  shmup: true,
  shmupBoss: 'king',
  screens: [{ segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }],
  storyStart: [0, 3],
  versusStart: [3, 16],
};

// ---------- Fases de chave e porta (quebra-cabeças) ----------

export const LEVEL_KEY1: LevelDef = {
  id: 'key1',
  name: 'Oficina da Chave',
  intro: 'PEGAR levanta a chave dourada. Leve até a porta trancada. Há 3 presentes escondidos.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'A chave abriu a porta!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 4, 3]], sign: [3, 'PEGAR levanta a chave.\nLeve até a PORTA.\n↑ sobe a escada.'] },
    { segments: [[0, 5, 0], [9, 11, 0]], floats: [[12, 2, 3]], sign: [2, 'Com a chave não dá\npara pulo duplo:\nuse a MOLA.'] },
  ],
  puzzle: {
    key: [0, 9, 3],
    door: [1, 17, 0],
    gifts: [[0, 2, 0], [0, 15, 5], [1, 12, 3]],
    ladders: [[0, 7, 0, 3]],
    springs: [[0, 15, 0], [1, 4, 0]],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

export const LEVEL_KEY2: LevelDef = {
  id: 'key2',
  name: 'Blocos Trocados',
  intro: 'Golpeie a alavanca para trocar os blocos: só a cor ativa é sólida.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'Blocos no lugar, porta aberta!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[3, 2, 3], [16, 3, 3]], sign: [7, 'Agachado + PULAR:\nparada de mão\n(salto mais alto).'] },
    { segments: [[0, 20, 0]], floats: [[14, 2, 4]] },
  ],
  puzzle: {
    key: [0, 17, 3],
    door: [1, 17, 0],
    gifts: [[0, 3, 3], [0, 1, 0], [1, 14, 4]],
    switches: [[0, 5, 0], [1, 3, 0], [1, 9, 0]],
    blocks: [
      [0, 10, 0, 'red'],
      [0, 10, 1, 'red'],
      [0, 10, 2, 'red'],
      [0, 10, 3, 'red'],
      [0, 13, 0, 'blue'],
      [0, 14, 0, 'blue'],
      [0, 14, 1, 'blue'],
      [1, 6, 0, 'red'],
      [1, 6, 1, 'red'],
      [1, 6, 2, 'red'],
      [1, 12, 0, 'blue'],
      [1, 12, 1, 'blue'],
      [1, 12, 2, 'blue'],
    ],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

export const LEVEL_KEY3: LevelDef = {
  id: 'key3',
  name: 'Mina Rachada',
  intro: 'Pedras de ouro bloqueiam a passagem. Martelo: no ar, segure ▼ e aperte ATACAR.',
  theme: 'volcano',
  tiles: 'tiles_volcano',
  winText: 'Pedras quebradas, porta aberta!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[2, 3, 3]], sign: [6, 'MARTELO: no ar,\n▼ + ATACAR\nquebra as pedras.'] },
    { segments: [[0, 7, 0], [11, 9, 0]], floats: [[12, 2, 4]] },
  ],
  puzzle: {
    key: [0, 16, 0],
    door: [1, 18, 0],
    gifts: [[0, 3, 3], [1, 12, 4], [1, 15, 0]],
    stones: [
      [0, 11, 0],
      [0, 11, 1],
      [0, 11, 2],
      [1, 13, 0],
      [1, 13, 1],
    ],
    springs: [[1, 6, 0]],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

export const LEVEL_KEY4: LevelDef = {
  id: 'key4',
  name: 'Bosque do Lenhador',
  intro: 'Derrube a árvore para fazer uma ponte. Uma ovelha numa placa abre o portão.',
  theme: 'shore',
  tiles: 'tiles_forest',
  winText: 'O bosque abriu caminho!',
  screens: [
    { segments: [[0, 7, 0], [12, 8, 0]], floats: [[1, 2, 3]], sign: [3, 'MACHADO: ATACAR\nna árvore a derruba\ne ela vira ponte.'] },
    { segments: [[0, 20, 0]], floats: [[8, 2, 3]], sign: [9, 'Carregue a OVELHA\naté a placa.'] },
  ],
  puzzle: {
    key: [0, 16, 0],
    door: [1, 17, 0],
    gifts: [[0, 1, 3], [1, 8, 3], [1, 19, 0]],
    trees: [[0, 6, 0, 6]],
    sheep: [[1, 3, 0]],
    plates: [[1, 6, 0, 'g']],
    gates: [[1, 12, 0, 4, 'g']],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

export const LEVEL_KEY5: LevelDef = {
  id: 'key5',
  name: 'Torre do Escalador',
  intro: 'A chave está no alto da torre. Picareta: encoste na parede no ar e suba.',
  theme: 'cave',
  tiles: 'tiles_forest',
  winText: 'Do alto da torre até a porta!',
  screens: [
    { segments: [[0, 6, 0], [6, 3, 5], [9, 11, 0]], floats: [[13, 2, 3]], sign: [2, 'PICARETA: pule na\nparede e a caveira\nsobe sozinha.'] },
    { segments: [[0, 4, 0], [4, 4, 3], [8, 3, 0], [11, 1, 5], [12, 8, 0]] },
  ],
  puzzle: {
    key: [0, 7, 5],
    door: [1, 17, 0],
    gifts: [[0, 8, 5], [0, 13, 3], [1, 11, 5]],
    ladders: [[1, 3, 0, 3]],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

// ---------- Fases estilo desenho de corrida e tiro, avião, mausoléu e o desenho perdido ----------

export const LEVEL_GUN1: LevelDef = {
  id: 'gun1',
  name: 'Pradaria dos Ossos',
  intro: 'Corrida e tiro! Segure ATACAR para disparar ossos. Os inimigos não param de chegar.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'Você atravessou a pradaria atirando!',
  gun: { spawns: ['gnoll', 'goblin', 'lizard'], every: 2100 },
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], floats: [[14, 3, 3]], deco: [[2, 'tree']], enemies: [[16, 'gnoll']] },
    { segments: [[0, 5, 0], [5, 4, 1], [11, 9, 0]], floats: [[9, 2, 2]], enemies: [[6, 'goblin'], [15, 'lizard']] },
    { segments: [[0, 7, 0], [9, 3, 1], [14, 6, 0]], floats: [[12, 2, 3]], enemies: [[10, 'gnoll'], [17, 'goblin']] },
    { segments: [[0, 4, 0], [6, 8, 0], [16, 4, 1]], floats: [[3, 3, 3]], enemies: [[8, 'lizard'], [12, 'gnoll'], [17, 'goblin']] },
    { segments: [[0, 20, 0]], deco: [[17, 'tree']], enemies: [[6, 'goblin'], [10, 'gnoll'], [14, 'lizard']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

export const LEVEL_GUN2: LevelDef = {
  id: 'gun2',
  name: 'Mina de Ouro',
  intro: 'Corrida e tiro na mina! Segure ATACAR: tochas, aranhas e morcegos vêm em ondas.',
  theme: 'cave',
  tiles: 'tiles_mine',
  winText: 'A mina foi limpa a tiros!',
  gun: { spawns: ['torchgob', 'spider', 'bat'], every: 1800 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[3, 'gold'], [15, 'gold']], enemies: [[14, 'torchgob']], hangers: [11] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], floats: [[6, 2, 3]], deco: [[17, 'gold']], enemies: [[9, 'spider'], [16, 'bat']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], deco: [[8, 'gold']], enemies: [[10, 'torchgob'], [17, 'spider']], hangers: [12] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], deco: [[2, 'gold']], enemies: [[5, 'bat'], [15, 'torchgob']] },
    { segments: [[0, 20, 0]], deco: [[4, 'gold'], [16, 'gold']], enemies: [[8, 'spider'], [12, 'torchgob'], [16, 'bat']], hangers: [10] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Ninho dos Príncipes: o Príncipe dos Morcegos (e, na metade da luta, o das Abelhas). */
export const LEVEL_PRINCES: LevelDef = {
  id: 'princes',
  name: 'Ninho dos Príncipes',
  intro: 'Uma caverna cheia de asas. No fundo, alguém com coroa espera por você.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'A luta dos Príncipes acabou!',
  screens: [
    { segments: [[0, 20, 0]], deco: [[2, 'rock2'], [17, 'rock1']], hangers: [8, 14], enemies: [[12, 'bat']], storyItems: [[3, 'wing']], versusItems: [[3, 'wing']] },
    { segments: [[0, 5, 0], [7, 4, 1], [13, 7, 0]], floats: [[5, 2, 3], [11, 2, 3]], hangers: [4, 16], enemies: [[9, 'bee'], [16, 'bat']], versusItems: [[15, 'web']] },
    { segments: [[0, 4, 0], [6, 3, 2], [11, 3, 1], [16, 4, 0]], floats: [[4, 2, 3], [9, 2, 4], [14, 2, 3]], hangers: [10], enemies: [[12, 'bat'], [17, 'bee']], storyItems: [[1, 'torch']], versusItems: [[10, 'torch', 1]] },
    { segments: [[0, 20, 0]], hangers: [5, 10, 15], enemies: [[8, 'bee'], [14, 'bat']], versusItems: [[17, 'wing']] },
  ],
  boss: {
    kind: 'princes',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'rock2'], [18, 'rock2']] },
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};

export const LEVEL_PLANE: LevelDef = {
  id: 'plane',
  name: 'Duelo no Céu',
  intro: 'Montado no príncipe aliado: ondas de inimigos e, no fim, o Diabrete Gigante em pessoa!',
  theme: 'sky',
  ember: true,
  tiles: 'tiles_sky',
  winText: 'O Diabrete Gigante caiu do céu!',
  shmup: true,
  shmupBoss: 'imp',
  screens: [{ segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }],
  storyStart: [0, 3],
  versusStart: [3, 16],
};

export const LEVEL_MAUSOLEUM: LevelDef = {
  id: 'mausoleum',
  name: 'Mausoléu do Xamã',
  intro: 'Proteja a urna! Assombrações vêm dos dois lados. Se tocarem a urna 3 vezes, recomeça.',
  theme: 'haunted',
  tiles: 'tilemap',
  winText: 'A urna está a salvo!',
  mausoleum: { waves: 6 },
  screens: [{ segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]] }],
  storyStart: [0, 9],
  versusStart: [3, 16],
};

/**
 * Área bônus das Ilhas da Maré: a Árvore Oca. Aparece no mapa da Maré depois da Maré Alta.
 * Fase curta de chave e porta dentro do tronco, com 3 presentes (ouro para o Empório).
 */
export const LEVEL_HOLLOW: LevelDef = {
  id: 'hollowtree',
  name: 'Árvore Oca',
  intro: 'Uma árvore enorme, oca por dentro. Leve a chave até a porta lá no alto. Os 3 presentes valem ouro.',
  theme: 'shore',
  tiles: 'tiles_forest',
  secret: true,
  winText: 'A árvore guardava um tesouro!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[5, 3, 2], [11, 3, 4]], deco: [[1, 'tree'], [18, 'bush']], sign: [2, 'Área bônus!\nPresentes valem ouro.'] },
    { segments: [[0, 8, 0], [10, 10, 1]], floats: [[3, 2, 3], [14, 3, 4]], deco: [[17, 'tree']] },
  ],
  puzzle: {
    key: [0, 12, 4],
    door: [1, 17, 1],
    gifts: [[0, 6, 2], [1, 3, 3], [1, 15, 4]],
    ladders: [[0, 9, 0, 4]],
    springs: [[1, 8, 0]],
  },
  storyStart: [0, 1],
  versusStart: [3, 16],
};

/** Fase secreta: um desenho perdido dos anos 1930 (preto e branco, grão de película). */
export const LEVEL_RETRO: LevelDef = {
  id: 'retro',
  name: 'Desenho Perdido (1930)',
  intro: 'Um rolo de filme antigo... A caveira entrou num desenho de 1930! Segure ATACAR para atirar.',
  theme: 'shore',
  tiles: 'tilemap',
  winText: 'FIM. (O desenho perdido foi salvo.)',
  secret: true,
  retro: true,
  gun: { spawns: ['gnoll', 'goblin', 'skull'], every: 2300 },
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], floats: [[12, 3, 3]], deco: [[2, 'tree']], enemies: [[15, 'skull']] },
    { segments: [[0, 6, 0], [6, 3, 1], [11, 9, 0]], floats: [[9, 2, 3]], enemies: [[7, 'gnoll'], [16, 'skull']] },
    { segments: [[0, 5, 0], [7, 3, 2], [12, 8, 0]], floats: [[10, 2, 3]], enemies: [[13, 'goblin'], [17, 'skull']] },
    { segments: [[0, 20, 0]], deco: [[16, 'tree']], enemies: [[6, 'skull'], [10, 'gnoll'], [14, 'goblin']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};


// ---------- Área 1: Ilhas da Maré ----------

/** Praia dos Caranguejos: um caranguejo leva a chave nas costas. Um golpe o vira e ela cai. */
export const LEVEL_CRABS: LevelDef = {
  id: 'crabs',
  name: 'Praia dos Caranguejos',
  intro: 'Um caranguejo fugiu com a chave! Acerte-o para a chave cair e leve-a até a porta.',
  theme: 'shore',
  tiles: 'tiles_sand',
  winText: 'A porta da praia abriu!',
  puzzle: {
    key: [1, 10, 0],
    keyOnCrab: true,
    crabs: [
      [1, 10, 0, 8],
      [0, 15, 0, 5],
      [2, 8, 1, 3],
    ],
    door: [2, 18, 2],
    gifts: [
      [0, 6, 2],
      [1, 15, 3],
      [2, 14, 3],
    ],
    springs: [[1, 12, 0]],
  },
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], floats: [[5, 3, 2]], deco: [[1, 'tree'], [18, 'rock1']] },
    { segments: [[0, 20, 0]], floats: [[3, 3, 2], [14, 3, 3]], deco: [[1, 'rock2'], [19, 'tree']], sign: [2, 'Acerte o caranguejo: a chave cai!'] },
    { segments: [[0, 6, 0], [6, 4, 1], [10, 4, 2], [16, 4, 2]], floats: [[14, 2, 3]], deco: [[2, 'skull_spike']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Maré Alta: a maré sobe e desce sozinha; o chão baixo fica debaixo d'água. */
export const LEVEL_HIGHTIDE: LevelDef = {
  id: 'hightide',
  name: 'Maré Alta',
  intro: 'A maré sobe e desce sozinha. Quando ela vier, fique no alto!',
  theme: 'shore',
  tiles: 'tiles_sand',
  winText: 'Você venceu a maré!',
  sea: {
    tide: { high: 80, hold: 4500, move: 2200 },
    crates: [
      [1, 9, 2],
      [3, 4, 2],
      [3, 9, 2],
      [3, 14, 2],
    ],
  },
  screens: [
    {
      segments: [[0, 7, 0], [7, 3, 1], [10, 5, 0], [15, 2, 2], [17, 3, 0]],
      floats: [[12, 2, 2]],
      deco: [[1, 'tree'], [16, 'rock1']],
      enemies: [[12, 'lizard_sand'], [18, 'goblin_pirate']],
      sign: [3, 'A maré sobe! Fique no alto quando ela vier.'],
    },
    { segments: [[0, 3, 1], [3, 6, 0], [11, 4, 0], [15, 5, 1]], floats: [[6, 2, 2]], deco: [[17, 'tree']], enemies: [[5, 'lizard_tide'], [13, 'gnoll']] },
    {
      segments: [[0, 5, 0], [5, 2, 2], [7, 6, 0], [13, 2, 2], [15, 5, 0]],
      floats: [[9, 3, 3]],
      deco: [[3, 'rock2']],
      enemies: [[10, 'lizard_sand'], [17, 'goblin_pirate']],
      storyItems: [[10, 'harpoon', 3]],
    },
    { segments: [[0, 4, 0], [6, 3, 1], [11, 3, 1], [16, 4, 0]], enemies: [[7, 'lizard_tide'], [12, 'goblin_pirate']] },
    { segments: [[0, 6, 0], [6, 3, 2], [9, 6, 0], [15, 5, 1]], floats: [[11, 3, 3]], deco: [[18, 'tree']], enemies: [[11, 'gnoll'], [17, 'lizard_sand'], [13, 'goblin_pirate']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Destroços do Naufrágio: tábuas soltas que afundam ao pisar e restos de um navio. */
export const LEVEL_WRECK: LevelDef = {
  id: 'wreck',
  name: 'Destroços do Naufrágio',
  intro: 'Tábuas soltas afundam logo depois de pisadas. Não pare em cima delas!',
  theme: 'shore',
  tiles: 'tiles_ship',
  winText: 'Você atravessou o naufrágio!',
  sea: {
    planks: [
      [0, 6, 3, 0],
      [1, 3, 2, 0],
      [1, 5, 2, 0],
      [1, 10, 2, 1],
      [1, 12, 2, 1],
      [2, 4, 2, 1],
      [2, 6, 2, 1],
      [2, 12, 2, 1],
      [2, 14, 2, 0],
      [3, 5, 2, 1],
      [3, 7, 2, 1],
      [3, 11, 3, 0],
      [4, 4, 3, 0],
      [4, 11, 3, 1],
    ],
    hulls: [
      [1, 7, 3, 1],
      [2, 8, 4, 2],
      [4, 7, 4, 1],
    ],
    masts: [[2, 10, 2, 3]],
  },
  screens: [
    { segments: [[0, 6, 0], [9, 3, 1], [15, 5, 0]], deco: [[2, 'dead_tree'], [17, 'bones']], enemies: [[17, 'gnoll_wreck']] },
    { segments: [[0, 3, 0], [7, 3, 1], [14, 6, 0]], enemies: [[8, 'shark_coral'], [17, 'gnoll_wreck']] },
    { segments: [[0, 4, 0], [8, 4, 2], [16, 4, 0]], enemies: [[10, 'gnoll_wreck'], [18, 'shark']], storyItems: [[2, 'harpoon']] },
    { segments: [[0, 5, 1], [9, 2, 0], [14, 6, 0]], enemies: [[10, 'shark_coral'], [16, 'goblin_pirate']] },
    { segments: [[0, 4, 0], [7, 4, 1], [14, 6, 0]], deco: [[18, 'skull_spike']], enemies: [[9, 'gnoll_wreck'], [17, 'shark_hammer']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Navio Pirata: Convés. Canhões, goblins piratas e bombardeiros; o capitão no tombadilho. */
export const LEVEL_DECK: LevelDef = {
  id: 'deck',
  name: 'Navio Pirata: Convés',
  intro: 'Suba a bordo! Canhões disparam pelo convés: pule as balas ou defenda.',
  theme: 'shore',
  tiles: 'tiles_ship',
  winText: 'O convés é seu!',
  sea: {
    hulls: [
      [0, 8, 12, 1],
      [1, 0, 20, 1],
      [2, 0, 8, 1],
      [2, 8, 4, 2],
      [2, 12, 8, 1],
      [3, 0, 6, 1],
      [3, 9, 11, 1],
      [4, 0, 5, 1],
      [4, 5, 3, 2],
      [4, 8, 12, 3],
    ],
    masts: [
      [0, 14, 1, 6],
      [1, 6, 1, 6],
      [1, 13, 1, 6],
      [2, 4, 1, 6],
      [3, 14, 1, 6],
    ],
    cannons: [
      [0, 18, 1, -1, 2600],
      [1, 10, 1, -1, 2400],
      [1, 19, 1, -1, 2400, 1200],
      [2, 11, 2, -1, 2200],
      [3, 18, 1, -1, 2000],
      [4, 19, 3, -1, 2600],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [8, 12, 1]], floats: [[6, 2, 1]], deco: [[2, 'tree']], enemies: [[12, 'goblin_pirate']], sign: [3, 'Balas de canhão: pule ou defenda!'] },
    { segments: [[0, 20, 1]], floats: [[5, 3, 3], [12, 3, 3]], enemies: [[8, 'goblin_bomber'], [15, 'goblin_pirate']] },
    { segments: [[0, 8, 1], [8, 4, 2], [12, 8, 1]], floats: [[16, 3, 3]], enemies: [[5, 'goblin_pirate'], [10, 'goblin_bomber'], [17, 'goblin_pirate']] },
    { segments: [[0, 6, 1], [9, 11, 1]], floats: [[7, 1, 2]], enemies: [[12, 'goblin_bomber'], [16, 'goblin_pirate']] },
    { segments: [[0, 5, 1], [5, 3, 2], [8, 12, 3]], enemies: [[13, 'goblin_captain'], [17, 'goblin_bomber']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Caverna Submarina: tudo debaixo d'água. A caveira vira Tubarão e nada livre. */
export const LEVEL_UNDERSEA: LevelDef = {
  id: 'undersea',
  name: 'Caverna Submarina',
  intro: 'Debaixo d\'água a caveira vira Tubarão! ↑ (ou PULAR) sobe, ▼ desce. Cuidado com as águas-vivas.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'Você atravessou a caverna submarina!',
  undersea: true,
  sea: {
    jellies: [
      [0, 12, 4, 1],
      [1, 9, 4, 1],
      [1, 11, 3, 0],
      [2, 8, 3, 0],
      [2, 10, 4, 2],
      [2, 16, 4, 1],
      [3, 9, 4, 1],
      [3, 11, 3, 0],
      [3, 18, 4, 2],
      [4, 5, 4, 1],
      [4, 13, 4, 0],
      [4, 15, 4, 1],
    ],
    corals: [
      [0, 10, 0],
      [0, 14, 0],
      [1, 8, 0],
      [1, 12, 0],
      [2, 7, 0],
      [2, 15, 0],
      [2, 18, 0],
      [3, 2, 0],
      [3, 15, 2],
      [4, 12, 0],
      [4, 17, 0],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [6, 2, 3], [8, 12, 0]], deco: [[2, 'rock2']], enemies: [[16, 'shark_coral']], sign: [2, '↑ ou PULAR sobe · ▼ desce'] },
    { segments: [[0, 4, 0], [4, 2, 4], [6, 8, 0], [14, 2, 3], [16, 4, 0]], enemies: [[18, 'shark_hammer']] },
    { segments: [[0, 3, 0], [3, 3, 3], [6, 6, 0], [12, 2, 4], [14, 6, 0]], enemies: [[9, 'shark_coral'], [17, 'lizard_tide']] },
    { segments: [[0, 5, 0], [5, 2, 4], [7, 6, 0], [13, 3, 2], [16, 4, 0]], enemies: [[10, 'shark_hammer'], [17, 'shark_coral']] },
    { segments: [[0, 8, 0], [8, 2, 4], [10, 10, 0]], deco: [[18, 'rock1']], enemies: [[14, 'shark_elite']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Comportas do Farol: alavancas abrem e fecham as comportas (maré alta ou baixa). */
export const LEVEL_FLOODGATES: LevelDef = {
  id: 'floodgates',
  name: 'Comportas do Farol',
  intro: 'Golpeie as alavancas: maré alta faz os caixotes subirem; maré baixa abre os caminhos de baixo.',
  theme: 'shore',
  tiles: 'tiles_sand',
  winText: 'O farol iluminou o caminho!',
  sea: {
    tide: { high: 200, hold: 0, move: 2500 },
    levers: [
      [0, 4, 0],
      [1, 2, 1],
      [2, 2, 4],
      [3, 1, 2],
    ],
    crates: [
      [0, 8, 2],
      [0, 10, 2],
      [1, 3, 2],
      [1, 5, 2],
      [3, 4, 3],
    ],
    lighthouse: [0, 16, 0],
  },
  screens: [
    { segments: [[0, 6, 0], [6, 2, 1], [12, 8, 0]], deco: [[1, 'tree']], sign: [2, 'Alavanca: maré alta / maré baixa'] },
    { segments: [[0, 3, 0], [7, 13, 4]], floats: [[1, 2, 1]], enemies: [[14, 'goblin_pirate']] },
    { segments: [[0, 4, 4], [4, 10, 0], [14, 6, 2]], floats: [[7, 2, 2]], enemies: [[10, 'lizard_tide']] },
    { segments: [[0, 4, 2], [7, 13, 4]], deco: [[18, 'tree']], enemies: [[15, 'gnoll_wreck']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Navio Pirata: Mastros. O convés está quebrado: o caminho é pelas vergas e cestos de gávea. */
export const LEVEL_MASTS: LevelDef = {
  id: 'masts',
  name: 'Navio Pirata: Mastros',
  intro: 'O convés afundou no meio. Atravesse pelas vergas e pelos cestos de gávea, lá no alto!',
  theme: 'shore',
  tiles: 'tiles_ship',
  winText: 'Você dominou os mastros!',
  sea: {
    hulls: [
      [0, 0, 20, 1],
      [1, 0, 4, 1],
      [1, 16, 4, 1],
      [2, 0, 7, 1],
      [2, 11, 9, 1],
      [3, 0, 3, 1],
      [3, 17, 3, 1],
      [4, 0, 6, 1],
      [4, 6, 14, 2],
    ],
    masts: [
      [0, 7, 1, 6],
      [0, 16, 1, 6],
      [1, 9, 1, 6],
      [2, 13, 1, 6],
      [3, 9, 1, 6],
      [4, 10, 2, 5],
    ],
    cannons: [
      [0, 19, 1, -1, 2200],
      [2, 18, 1, -1, 1800],
      [4, 19, 2, -1, 2000],
    ],
  },
  screens: [
    { segments: [[0, 20, 1]], floats: [[6, 3, 3], [11, 3, 4], [15, 3, 5]], enemies: [[9, 'goblin_pirate'], [14, 'goblin_bomber']] },
    { segments: [[0, 4, 1], [16, 4, 1]], floats: [[3, 3, 3], [7, 3, 4], [11, 3, 4], [14, 3, 3]], enemies: [[18, 'goblin_bomber']] },
    { segments: [[0, 7, 1], [11, 9, 1]], floats: [[6, 2, 3], [9, 2, 4], [12, 3, 5], [16, 3, 3]], enemies: [[3, 'goblin_pirate'], [15, 'goblin_bomber']] },
    { segments: [[0, 3, 1], [17, 3, 1]], floats: [[2, 3, 3], [5, 2, 4], [8, 3, 5], [12, 2, 4], [14, 3, 3]], enemies: [[18, 'goblin_pirate']] },
    { segments: [[0, 6, 1], [6, 14, 2]], enemies: [[9, 'goblin_captain'], [14, 'goblin_bomber'], [17, 'goblin_pirate']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Recife de Coral: corais de fogo, águas-vivas, maré e tubarões de todo tipo. */
export const LEVEL_REEF: LevelDef = {
  id: 'reef',
  name: 'Recife de Coral',
  intro: 'Corais de fogo queimam, águas-vivas boiam e a maré não para. O último passo antes do Rei.',
  theme: 'shore',
  tiles: 'tiles_sand',
  winText: 'O recife ficou para trás. O Rei espera!',
  sea: {
    tide: { high: 70, hold: 5000, move: 2000 },
    crates: [
      [0, 8, 2],
      [0, 14, 2],
      [1, 15, 2],
      [3, 5, 2],
      [3, 9, 2],
      [3, 13, 2],
    ],
    corals: [
      [0, 11, 0],
      [0, 13, 0],
      [1, 7, 0],
      [1, 9, 0],
      [2, 6, 0],
      [2, 17, 0],
      [3, 2, 0],
      [3, 17, 1],
      [4, 8, 0],
      [4, 10, 0],
    ],
    jellies: [
      [1, 15, 3, 1],
      [2, 10, 4, 2],
      [2, 14, 4, 1],
      [3, 10, 3, 1],
      [4, 13, 3, 1],
    ],
  },
  screens: [
    { segments: [[0, 5, 0], [5, 3, 1], [10, 4, 0], [16, 4, 1]], deco: [[1, 'tree']], enemies: [[17, 'shark_coral']] },
    { segments: [[0, 4, 1], [6, 5, 0], [13, 2, 2], [17, 3, 1]], enemies: [[8, 'lizard_tide'], [18, 'shark_hammer']] },
    { segments: [[0, 3, 1], [5, 4, 0], [11, 3, 2], [16, 4, 0]], floats: [[8, 3, 3]], enemies: [[12, 'shark_coral'], [18, 'lizard_sand']] },
    { segments: [[0, 5, 0], [7, 2, 1], [11, 2, 2], [15, 5, 1]], enemies: [[3, 'lizard_tide'], [18, 'shark_elite']] },
    { segments: [[0, 4, 1], [6, 6, 0], [14, 6, 1]], floats: [[8, 3, 2]], deco: [[18, 'skull_spike']], enemies: [[11, 'shark_hammer'], [17, 'goblin_captain']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Arena do Rei Tubarão: o chefe manda na maré. */
export const LEVEL_SHARKKING: LevelDef = {
  id: 'sharkking',
  name: 'Arena do Rei Tubarão',
  intro: 'O Rei Tubarão-Arpão manda na maré. Na maré baixa ele encalha: é a sua chance!',
  theme: 'shore',
  tiles: 'tiles_sand',
  winText: 'O Rei Tubarão-Arpão caiu! Fragmento da coroa recuperado!',
  sea: {
    tide: { high: 92, hold: 0, move: 1400, manual: true },
    crates: [[0, 8, 2]],
    corals: [[1, 10, 1]],
  },
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], deco: [[2, 'tree']], enemies: [[14, 'shark_coral'], [18, 'goblin_pirate']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], enemies: [[9, 'gnoll_wreck'], [17, 'shark_hammer']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'sharkking',
    arena: { segments: [[0, 4, 2], [4, 12, 0], [16, 4, 2]], floats: [[8, 4, 4]], deco: [[1, 'skull_spike'], [18, 'skull_spike']] },
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Trono do Xamã: a revelação, a escolha e, se o jogador escolher lutar, o Xamã. */
export const LEVEL_FINALE: LevelDef = {
  id: 'finale',
  name: 'Trono do Xamã',
  intro: 'A coroa devolveu o seu corpo. Agora, o Xamã.',
  theme: 'haunted',
  tiles: 'tilemap',
  winText: 'O Xamã caiu. Os selos voltaram.',
  finale: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 2], [12, 3, 3]], deco: [[3, 'skull_spike'], [16, 'skull_spike']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'shaman',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'skull_spike'], [18, 'skull_spike']] },
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};


// ---------- Área 2: Pradaria dos Ossos ----------

/** Estrada dos Ossos: a entrada da pradaria, terra dos Gnolls. */
export const LEVEL_ROAD: LevelDef = {
  id: 'road',
  name: 'Estrada dos Ossos',
  intro: 'A pradaria dos Gnolls. Os caçadores jogam ossos que voltam como bumerangue!',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'Você chegou à pradaria!',
  field: { boulders: [[2, 15, 1, -1, 4200]] },
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], deco: [[1, 'house'], [6, 'bush'], [17, 'tree']], enemies: [[15, 'gnoll']], sign: [3, 'Pradaria dos Ossos:\nterra dos Gnolls.'] },
    { segments: [[0, 6, 0], [6, 3, 1], [11, 9, 0]], deco: [[13, 'bush'], [18, 'stone']], enemies: [[8, 'gnoll_hunter'], [16, 'goblin']], storyItems: [[2, 'bone']] },
    { segments: [[0, 8, 0], [10, 4, 1], [16, 4, 0]], floats: [[8, 2, 2]], deco: [[3, 'bones'], [18, 'bush']], enemies: [[12, 'gnoll']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2], [13, 2, 2]], deco: [[9, 'stone']], enemies: [[9, 'gnoll_hunter'], [17, 'gnoll']] },
    { segments: [[0, 20, 0]], deco: [[3, 'house'], [12, 'bush'], [18, 'tree']], enemies: [[10, 'gnoll_brute']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Estouro da Manada: bois em disparada pelo chão baixo; quem está no alto escapa. */
export const LEVEL_STAMPEDE: LevelDef = {
  id: 'stampede',
  name: 'Estouro da Manada',
  intro: 'A manada vem em disparada pelo chão! Quando ouvir o aviso, suba no alto.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'A manada passou, e você também!',
  field: { stampede: { every: 7500, count: 6, from: 'left' } },
  screens: [
    { segments: [[0, 6, 0], [6, 2, 2], [8, 6, 0], [14, 2, 1], [16, 4, 0]], floats: [[11, 2, 2]], deco: [[2, 'bush']], enemies: [[18, 'gnoll']], sign: [3, 'Estouro da manada:\nsuba no alto!'] },
    { segments: [[0, 4, 0], [4, 2, 2], [6, 6, 0], [12, 3, 1], [15, 5, 0]], floats: [[8, 2, 2], [17, 2, 2]], enemies: [[10, 'gnoll_hunter']] },
    { segments: [[0, 5, 0], [5, 2, 1], [7, 5, 0], [12, 2, 2], [14, 6, 0]], floats: [[9, 2, 2], [16, 3, 2]], deco: [[18, 'bones']], enemies: [[9, 'goblin'], [18, 'gnoll']] },
    { segments: [[0, 6, 0], [8, 3, 1], [11, 5, 0], [16, 4, 0]], floats: [[4, 2, 2], [13, 2, 2]], enemies: [[12, 'gnoll_hunter']] },
    { segments: [[0, 5, 0], [5, 2, 2], [7, 8, 0], [15, 5, 1]], floats: [[10, 2, 2]], deco: [[18, 'house']], enemies: [[9, 'gnoll_brute']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Cemitério de Ossos: ladeiras e rochas rolando. */
export const LEVEL_BONEYARD: LevelDef = {
  id: 'boneyard',
  name: 'Cemitério de Ossos',
  intro: 'Rochas rolam ladeira abaixo. Pule por cima ou quebre com um golpe!',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'Você atravessou o cemitério!',
  field: {
    boulders: [
      [0, 18, 3, -1, 3800],
      [1, 3, 3, 1, 3200],
      [2, 18, 3, -1, 3000],
      [3, 18, 1, -1, 2800],
      [4, 19, 0, -1, 3000],
    ],
  },
  screens: [
    { segments: [[0, 8, 0], [8, 2, 1], [10, 2, 2], [12, 8, 3]], deco: [[2, 'bones'], [5, 'skull_spike']], enemies: [[15, 'gnoll_hunter']] },
    { segments: [[0, 6, 3], [6, 2, 2], [8, 2, 1], [10, 10, 0]], deco: [[13, 'skull_spike'], [17, 'bones']], enemies: [[14, 'gnoll_brute']] },
    { segments: [[0, 5, 0], [5, 3, 1], [8, 3, 2], [11, 3, 3], [14, 6, 3]], deco: [[2, 'dead_tree']], enemies: [[16, 'gnoll']] },
    { segments: [[0, 4, 3], [6, 4, 2], [12, 8, 1]], deco: [[15, 'bones']], enemies: [[8, 'gnoll_hunter']] },
    { segments: [[0, 20, 0]], deco: [[4, 'skull_spike'], [9, 'bones'], [17, 'skull_spike']], enemies: [[8, 'gnoll_brute'], [14, 'gnoll_hunter']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Fazenda dos Gnolls: ovelhas nas placas abrem os portões; a chave está no celeiro. */
export const LEVEL_FARM: LevelDef = {
  id: 'farm',
  name: 'Fazenda dos Gnolls',
  intro: 'Ponha as ovelhas nas placas para abrir os portões e leve a chave até a porta.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'A porta da fazenda abriu!',
  puzzle: {
    key: [1, 8, 2],
    door: [2, 17, 0],
    gifts: [
      [0, 14, 3],
      [1, 18, 0],
      [2, 6, 4],
    ],
    ladders: [[1, 5, 0, 2]],
    springs: [[2, 6, 0]],
    sheep: [
      [0, 4, 0],
      [1, 11, 0],
    ],
    plates: [
      [0, 8, 0, 'g1'],
      [1, 13, 0, 'g2'],
    ],
    gates: [
      [0, 11, 0, 4, 'g1'],
      [1, 16, 0, 4, 'g2'],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[13, 3, 3]], deco: [[1, 'house'], [18, 'bush']], sign: [2, 'Ovelha na placa:\no portão abre.'] },
    { segments: [[0, 6, 0], [6, 4, 2], [10, 10, 0]], deco: [[2, 'house']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 4]], deco: [[12, 'house'], [2, 'bush']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Capim Alto: Gnolls Espreitadores escondidos no capim. */
export const LEVEL_TALLGRASS: LevelDef = {
  id: 'tallgrass',
  name: 'Capim Alto',
  intro: 'Moitas que tremem não são vento: são Gnolls esperando você chegar perto.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'Nenhum Gnoll te pegou de surpresa!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[9, 3, 2]], deco: [[3, 'bush'], [11, 'bush'], [17, 'bush']], enemies: [[7, 'gnoll_stalker'], [14, 'gnoll_stalker']], sign: [2, 'No capim alto,\nalgo se mexe...'] },
    { segments: [[0, 7, 0], [9, 4, 1], [15, 5, 0]], deco: [[2, 'bush'], [16, 'bush']], enemies: [[5, 'gnoll_stalker'], [11, 'gnoll_hunter'], [17, 'gnoll_stalker']] },
    { segments: [[0, 5, 0], [5, 3, 2], [8, 12, 0]], floats: [[14, 2, 3]], deco: [[12, 'bush']], enemies: [[10, 'gnoll_stalker'], [13, 'gnoll_stalker'], [17, 'gnoll']] },
    { segments: [[0, 6, 0], [8, 6, 0], [16, 4, 1]], deco: [[1, 'bush'], [9, 'stone']], enemies: [[3, 'gnoll_stalker'], [10, 'gnoll_brute'], [12, 'gnoll_stalker']] },
    { segments: [[0, 20, 0]], deco: [[2, 'house'], [8, 'bush'], [15, 'bush']], enemies: [[6, 'gnoll_stalker'], [9, 'gnoll_stalker'], [12, 'gnoll_hunter'], [16, 'gnoll_stalker']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Caravana dos Gnolls: corrida e tiro contra a caravana. */
export const LEVEL_CARAVAN: LevelDef = {
  id: 'caravan',
  name: 'Caravana dos Gnolls',
  intro: 'Corrida e tiro! A caravana dos Gnolls não para de mandar caçadores.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'A caravana debandou!',
  gun: { spawns: ['gnoll_hunter', 'gnoll', 'goblin'] as CharId[], every: 1900 },
  field: { boulders: [[2, 19, 0, -1, 3500]] },
  screens: [
    { segments: [[0, 10, 0], [12, 8, 0]], floats: [[10, 2, 2]], deco: [[3, 'house']], enemies: [[16, 'gnoll']] },
    { segments: [[0, 5, 0], [5, 4, 1], [11, 9, 0]], deco: [[14, 'bush']], enemies: [[7, 'gnoll_hunter'], [15, 'gnoll']] },
    { segments: [[0, 20, 0]], floats: [[6, 3, 3], [13, 3, 3]], deco: [[2, 'stone']], enemies: [[10, 'gnoll_brute']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[17, 'house']], enemies: [[9, 'gnoll_hunter'], [17, 'goblin']] },
    { segments: [[0, 20, 0]], deco: [[4, 'bones'], [18, 'tower']], enemies: [[8, 'gnoll'], [12, 'gnoll_hunter'], [16, 'gnoll_brute']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Moinhos do Vento: vãos largos cruzados nas correntes de vento, planando. */
export const LEVEL_WINDMILL: LevelDef = {
  id: 'windmill',
  name: 'Moinhos do Vento',
  intro: 'O vento da pradaria levanta quem entra nele. Segure PULAR no ar para planar.',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'O vento te levou até o fim da pradaria!',
  winds: [
    [0, 8, 3],
    [1, 5, 3],
    [2, 6, 2],
    [2, 13, 2],
    [3, 5, 3],
    [3, 10, 2],
  ],
  screens: [
    { segments: [[0, 7, 0], [13, 7, 1]], floats: [[10, 2, 4]], deco: [[2, 'tower']], enemies: [[16, 'gnoll_hunter']], sign: [3, 'Entre no vento para subir.\nSegure PULAR para planar.'] },
    { segments: [[0, 4, 1], [12, 8, 0]], floats: [[8, 3, 4]], enemies: [[16, 'gnoll']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], enemies: [[10, 'gnoll_hunter'], [18, 'goblin']] },
    { segments: [[0, 4, 0], [14, 6, 1]], floats: [[8, 2, 5]], enemies: [[17, 'gnoll_brute']] },
    { segments: [[0, 20, 0]], deco: [[4, 'house'], [12, 'tower']], enemies: [[9, 'gnoll'], [13, 'gnoll_hunter']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Covil do Rei Gnoll. */
export const LEVEL_GNOLLKING: LevelDef = {
  id: 'gnollking',
  name: 'Covil do Rei Gnoll',
  intro: 'O Rei Gnoll guarda o segundo fragmento. Ele salta, uiva e joga um osso do tamanho de um tronco!',
  theme: 'shore',
  tiles: 'tiles_prairie',
  winText: 'O Rei Gnoll caiu! Fragmento da coroa recuperado!',
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], deco: [[2, 'bones'], [16, 'skull_spike']], enemies: [[14, 'gnoll_hunter'], [18, 'gnoll']] },
    { segments: [[0, 6, 0], [8, 6, 1], [16, 4, 0]], deco: [[3, 'bush']], enemies: [[10, 'gnoll_brute']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'gnollking',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'skull_spike'], [9, 'bones'], [18, 'skull_spike']] },
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};


// ---------- Área 4: Caverna das Teias (fases novas) ----------

/** Pontes de Teia: fios esticados que se rompem logo depois de pisados. */
export const LEVEL_WEBBRIDGE: LevelDef = {
  id: 'webbridge',
  name: 'Pontes de Teia',
  intro: 'As pontes são fios de teia: elas se rompem logo depois de pisadas. Não pare!',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'Você atravessou as pontes de teia!',
  sea: {
    plankTex: 'web_plank',
    planks: [
      [0, 6, 2, 0],
      [0, 8, 3, 1],
      [1, 4, 3, 1],
      [1, 7, 2, 2],
      [1, 9, 3, 1],
      [1, 12, 2, 0],
      [2, 5, 2, 1],
      [2, 7, 2, 1],
      [2, 12, 2, 1],
      [2, 14, 2, 0],
      [3, 3, 3, 0],
      [3, 6, 2, 1],
      [3, 8, 3, 2],
      [3, 11, 3, 1],
      [3, 14, 3, 0],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [11, 9, 0]], hangers: [3, 14], deco: [[1, 'rock2']], enemies: [[16, 'spider_jumper']], sign: [2, 'Pontes de teia:\nnão pare em cima!'] },
    { segments: [[0, 4, 1], [14, 6, 0]], hangers: [8], enemies: [[17, 'spider_web']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], hangers: [3], enemies: [[10, 'bat_vampire'], [18, 'spider']] },
    { segments: [[0, 3, 0], [17, 3, 0]], floats: [[9, 2, 4]], hangers: [10], enemies: [[18, 'spider_jumper']] },
    { segments: [[0, 20, 0]], hangers: [5, 10, 15], enemies: [[8, 'spider_web'], [14, 'spider_widow']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Caverna Escura: só se enxerga perto das tochas. */
export const LEVEL_DARKCAVE: LevelDef = {
  id: 'darkcave',
  name: 'Caverna Escura',
  intro: 'Breu total. Encoste nas tochas para acendê-las; as 3 grandes abrem a saída.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'As tochas mostraram a saída!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[8, 3, 2]], enemies: [[14, 'spider']], sign: [2, 'ESTÁ ESCURO...\nEncoste nas tochas\npara acendê-las.'] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'spider_jumper'], [16, 'bat']] },
    { segments: [[0, 5, 0], [7, 3, 2], [12, 8, 0]], floats: [[10, 2, 3]], enemies: [[15, 'spider_web']] },
    { segments: [[0, 7, 0], [9, 2, 1], [13, 7, 0]], enemies: [[4, 'bat_vampire'], [16, 'spider_jumper']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'spider_widow']], sign: [12, 'A saída só abre com\nas 3 TOCHAS GRANDES acesas.'] },
  ],
  haunt: {
    dark: true,
    torches: true,
    candles: [
      { screen: 0, tile: 5 },
      { screen: 0, tile: 15, big: true },
      { screen: 1, tile: 3 },
      { screen: 1, tile: 10, h: 1 },
      { screen: 1, tile: 17, big: true },
      { screen: 2, tile: 2 },
      { screen: 2, tile: 14 },
      { screen: 3, tile: 3 },
      { screen: 3, tile: 18, big: true },
      { screen: 4, tile: 5 },
    ],
    doors: [{ id: 'exit', screen: 4, tile: 17, exit: true }],
  },
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Salão dos Casulos: casulos pendurados balançam no caminho (encostar derruba). */
export const LEVEL_COCOONS: LevelDef = {
  id: 'cocoons',
  name: 'Salão dos Casulos',
  intro: 'Casulos pendurados sobem e descem nos fios. Encostar neles é virar comida!',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'Você passou pelo salão dos casulos!',
  sea: {
    jellyTex: 'cocoon',
    jellies: [
      [0, 8, 4, 1],
      [0, 13, 5, 2],
      [1, 6, 4, 2],
      [1, 14, 4, 1],
      [2, 9, 5, 1],
      [2, 16, 4, 1],
      [3, 5, 4, 1],
      [3, 10, 4, 1],
      [3, 15, 5, 2],
      [4, 6, 4, 1],
      [4, 10, 5, 1],
      [4, 14, 4, 1],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], hangers: [4, 16], enemies: [[17, 'spider']], sign: [2, 'Casulos balançando:\nnão encoste!'] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], hangers: [10], enemies: [[11, 'spider_web'], [17, 'spider_jumper']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 3], [12, 3, 3]], hangers: [3], enemies: [[14, 'spider_widow']] },
    { segments: [[0, 4, 0], [6, 3, 2], [11, 9, 0]], enemies: [[16, 'bat_vampire']] },
    { segments: [[0, 20, 0]], hangers: [8, 12], enemies: [[17, 'spider_widow']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Tiro na Teia: corrida e tiro pela caverna. */
export const LEVEL_WEBGUN: LevelDef = {
  id: 'webgun',
  name: 'Tiro na Teia',
  intro: 'Corrida e tiro! Aranhas saltadoras e morcegos vampiros vêm em ondas.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'A caverna foi limpa a tiros!',
  gun: { spawns: ['spider_jumper', 'bat_vampire', 'spider'] as CharId[], every: 1800 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], hangers: [11], enemies: [[14, 'spider']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'spider_web'], [16, 'bat']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], hangers: [12], enemies: [[10, 'spider_jumper']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], enemies: [[5, 'bat_vampire'], [15, 'spider_widow']] },
    { segments: [[0, 20, 0]], hangers: [10], enemies: [[8, 'spider_web'], [12, 'spider'], [16, 'spider_jumper']] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

/** Câmara dos Ovos: a chave está no ninho; uma parede de blocos de cor no caminho. */
export const LEVEL_EGGS: LevelDef = {
  id: 'eggs',
  name: 'Câmara dos Ovos',
  intro: 'A chave está no alto do ninho. Para passar a parede, troque a cor dos blocos.',
  theme: 'cave',
  tiles: 'tiles_cave',
  winText: 'A câmara dos ovos se abriu!',
  puzzle: {
    key: [1, 8, 3],
    door: [2, 17, 0],
    gifts: [
      [0, 15, 3],
      [1, 2, 0],
      [2, 13, 3],
    ],
    ladders: [[1, 5, 0, 3]],
    springs: [[0, 12, 0]],
    switches: [[2, 6, 0]],
    blocks: [
      [2, 10, 0, 'red'],
      [2, 10, 1, 'red'],
      [2, 10, 2, 'red'],
      [2, 10, 3, 'red'],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[14, 3, 3]], sign: [2, 'A chave está no ninho,\nlá em cima.'] },
    { segments: [[0, 6, 0], [6, 4, 3], [10, 10, 0]] },
    { segments: [[0, 20, 0]], floats: [[12, 3, 3]], sign: [3, 'Solte a chave (PEGAR),\ngolpeie a alavanca\ne pegue de novo.'] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};


// ---------- Área 5: Forja Vulcânica (fases novas) ----------

const VOLC = { theme: 'volcano' as const, tiles: 'tiles_volcano', storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };

/** Portões da Forja: a entrada da montanha, com os primeiros gêiseres. */
export const LEVEL_FORGEGATE: LevelDef = {
  ...VOLC,
  id: 'forgegate',
  name: 'Portões da Forja',
  intro: 'A montanha de fogo. Gêiseres borbulham antes de soltar a coluna de fogo: espere passar!',
  winText: 'Você passou pelos portões da forja!',
  field: {
    geysers: [
      [0, 12, 1, 3200],
      [1, 14, 0, 3000],
      [1, 17, 0, 3000, 1500],
      [3, 8, 0, 2800],
      [3, 10, 0, 2800, 1400],
      [4, 6, 0, 3000],
      [4, 12, 0, 3000, 1000],
    ],
  },
  screens: [
    { segments: [[0, 7, 0], [10, 4, 1], [16, 4, 0]], floats: [[8, 2, 2]], deco: [[2, 'rock2']], enemies: [[17, 'imp']], sign: [3, 'Gêiser borbulhando:\nespere o fogo passar!'] },
    { segments: [[0, 5, 0], [7, 3, 1], [12, 8, 0]], enemies: [[9, 'lizard_magma'], [15, 'imp']] },
    { segments: [[0, 6, 0], [8, 2, 2], [12, 8, 0]], floats: [[10, 2, 3]], deco: [[17, 'dead_tree']], enemies: [[14, 'minotaur_lava']] },
    { segments: [[0, 4, 1], [6, 6, 0], [14, 6, 1]], enemies: [[16, 'lizard_magma']] },
    { segments: [[0, 20, 0]], deco: [[18, 'skull_spike']], enemies: [[9, 'imp'], [15, 'minotaur_lava']] },
  ],
};

/** Maré de Lava: a lava sobe e desce; blocos de basalto boiam nela. */
export const LEVEL_LAVATIDE: LevelDef = {
  ...VOLC,
  id: 'lavatide',
  name: 'Maré de Lava',
  intro: 'A lava sobe e desce como maré. Quando ela vier, fique no alto ou em cima do basalto!',
  winText: 'Você venceu a maré de lava!',
  sea: {
    tide: { high: 80, hold: 4500, move: 2400 },
    crateTex: 'basalt',
    crates: [
      [1, 9, 2],
      [3, 4, 2],
      [3, 9, 2],
      [3, 14, 2],
    ],
  },
  screens: [
    { segments: [[0, 7, 0], [7, 3, 1], [10, 5, 0], [15, 2, 2], [17, 3, 0]], floats: [[12, 2, 2]], enemies: [[18, 'imp']], sign: [3, 'A lava sobe e desce.\nFique no alto!'] },
    { segments: [[0, 3, 1], [3, 6, 0], [11, 4, 0], [15, 5, 1]], floats: [[6, 2, 2]], enemies: [[5, 'lizard_magma'], [13, 'imp']] },
    { segments: [[0, 5, 0], [5, 2, 2], [7, 6, 0], [13, 2, 2], [15, 5, 0]], floats: [[9, 3, 3]], enemies: [[10, 'minotaur_lava']] },
    { segments: [[0, 4, 0], [6, 3, 1], [11, 3, 1], [16, 4, 0]], enemies: [[12, 'imp']] },
    { segments: [[0, 6, 0], [6, 3, 2], [9, 6, 0], [15, 5, 1]], floats: [[11, 3, 3]], enemies: [[11, 'lizard_magma'], [17, 'minotaur_obsidian']] },
  ],
};

/** Gêiseres de Fogo: campos inteiros de gêiseres em ritmo. */
export const LEVEL_GEYSERS: LevelDef = {
  ...VOLC,
  id: 'geysers',
  name: 'Gêiseres de Fogo',
  intro: 'Os gêiseres disparam em sequência. Observe o ritmo e passe entre as colunas de fogo.',
  winText: 'Nem um chamuscado!',
  field: {
    geysers: [
      [0, 6, 0, 2400],
      [0, 9, 0, 2400, 800],
      [0, 12, 0, 2400, 1600],
      [1, 3, 0, 2600],
      [1, 10, 1, 2200],
      [1, 16, 0, 2600, 1300],
      [2, 8, 0, 2000],
      [2, 10, 0, 2000, 700],
      [2, 12, 0, 2000, 1400],
      [3, 4, 0, 1800],
      [3, 8, 0, 1800, 600],
      [3, 11, 0, 1800, 1200],
      [3, 15, 0, 1800],
      [4, 5, 0, 2200],
      [4, 10, 0, 2200, 1100],
      [4, 15, 0, 2200],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[14, 3, 2]], enemies: [[17, 'imp']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[18, 'lizard_magma']] },
    { segments: [[0, 4, 0], [6, 8, 0], [16, 4, 0]], floats: [[4, 2, 2], [14, 2, 2]], enemies: [[17, 'minotaur_lava']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 3], [12, 3, 3]], enemies: [[18, 'imp']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'minotaur_obsidian']] },
  ],
};

/** Tiro na Forja: corrida e tiro entre diabretes e minotauros de lava. */
export const LEVEL_FORGEGUN: LevelDef = {
  ...VOLC,
  id: 'forgegun',
  name: 'Tiro na Forja',
  intro: 'Corrida e tiro! Diabretes, minotauros de lava e lagartos de magma vêm sem parar.',
  winText: 'A forja foi limpa a tiros!',
  gun: { spawns: ['imp', 'minotaur_lava', 'lizard_magma'] as CharId[], every: 2000 },
  field: { geysers: [[2, 10, 0, 2600]] },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], enemies: [[14, 'imp']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'lizard_magma'], [16, 'imp']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'minotaur_lava']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], enemies: [[5, 'imp'], [16, 'minotaur_obsidian']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'lizard_magma'], [12, 'imp'], [16, 'minotaur_lava']] },
  ],
};

/** Ponte de Obsidiana: lajes que afundam na lava e canhões da forja. */
export const LEVEL_OBSIDIAN: LevelDef = {
  ...VOLC,
  id: 'obsidian',
  name: 'Ponte de Obsidiana',
  intro: 'Lajes de obsidiana afundam na lava logo depois de pisadas. E os canhões da forja não param.',
  winText: 'Você atravessou a ponte de obsidiana!',
  sea: {
    plankTex: 'obsidian_plank',
    planks: [
      [0, 6, 2, 0],
      [0, 8, 3, 1],
      [1, 4, 3, 1],
      [1, 7, 2, 2],
      [1, 9, 3, 1],
      [1, 12, 2, 0],
      [2, 5, 2, 1],
      [2, 7, 2, 1],
      [2, 12, 2, 1],
      [2, 14, 2, 0],
      [3, 3, 3, 0],
      [3, 6, 2, 1],
      [3, 8, 3, 2],
      [3, 11, 3, 1],
      [3, 14, 3, 0],
    ],
    cannons: [
      [0, 18, 0, -1, 2600],
      [2, 19, 0, -1, 2400],
      [4, 19, 0, -1, 2200],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [11, 9, 0]], enemies: [[16, 'imp']] },
    { segments: [[0, 4, 1], [14, 6, 0]], enemies: [[17, 'lizard_magma']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], enemies: [[10, 'imp']] },
    { segments: [[0, 3, 0], [17, 3, 0]], floats: [[9, 2, 4]], enemies: [[18, 'minotaur_lava']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'lizard_magma'], [14, 'minotaur_obsidian']] },
  ],
};

/** Bigorna do Ferreiro: chave e porta com pedras de ouro (martelo). */
export const LEVEL_ANVIL: LevelDef = {
  ...VOLC,
  id: 'anvil',
  name: 'Bigorna do Ferreiro',
  intro: 'Pedras de ouro bloqueiam a oficina. Use o MARTELO (no ar, ▼ + ATACAR) e leve a chave até a porta.',
  winText: 'A porta da oficina abriu!',
  puzzle: {
    key: [1, 8, 3],
    door: [2, 17, 0],
    gifts: [
      [0, 14, 3],
      [1, 2, 0],
      [2, 5, 4],
    ],
    ladders: [[1, 5, 0, 3]],
    springs: [[2, 5, 0]],
    stones: [
      [0, 9, 0],
      [1, 14, 0],
      [1, 14, 1],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[13, 3, 3]], sign: [3, 'No ar: ▼ + ATACAR\nquebra as pedras.'] },
    { segments: [[0, 6, 0], [6, 4, 3], [10, 10, 0]] },
    { segments: [[0, 20, 0]], floats: [[4, 3, 4]] },
  ],
};

/** Coração de Magma: cada área só abre quando todos os inimigos dela caírem. */
export const LEVEL_MAGMA: LevelDef = {
  ...VOLC,
  id: 'magma',
  name: 'Coração de Magma',
  intro: 'O coração da montanha. Cada área só abre quando todos os inimigos dela caírem.',
  winText: 'O caminho até o Minotauro está aberto!',
  clearToAdvance: true,
  field: {
    geysers: [
      [0, 7, 0, 3000],
      [2, 6, 0, 2600],
      [2, 14, 0, 2600, 1300],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[5, 3, 3], [12, 3, 3]], enemies: [[9, 'imp'], [15, 'lizard_magma']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'minotaur_lava'], [16, 'imp']] },
    { segments: [[0, 20, 0]], enemies: [[10, 'minotaur_obsidian']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], enemies: [[9, 'lizard_magma'], [12, 'imp'], [17, 'minotaur_lava']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'minotaur_obsidian'], [13, 'imp'], [16, 'lizard_magma']] },
  ],
};


// ---------- Área 6: Bosque dos Gnomos ----------

const WOOD = { theme: 'shore' as const, tiles: 'tiles_forest', storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };

export const LEVEL_WOODS: LevelDef = {
  ...WOOD,
  id: 'woods',
  name: 'Entrada do Bosque',
  intro: 'O bosque dos gnomos. Eles atiram bolotas com estilingue e rolam toras ladeira abaixo.',
  winText: 'Você entrou no bosque!',
  field: { boulderTex: 'log_roll', boulders: [[2, 15, 1, -1, 4200]] },
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], deco: [[1, 'tree'], [6, 'bush'], [17, 'tree']], enemies: [[15, 'sgnome']], sign: [3, 'Bosque dos Gnomos.\nCuidado com as bolotas!'] },
    { segments: [[0, 6, 0], [6, 3, 1], [11, 9, 0]], deco: [[14, 'tree']], enemies: [[8, 'sgnome_red'], [16, 'goblin']] },
    { segments: [[0, 8, 0], [10, 4, 1], [16, 4, 0]], floats: [[8, 2, 2]], deco: [[3, 'tree']], enemies: [[12, 'sgnome']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2], [13, 2, 2]], deco: [[9, 'bush']], enemies: [[9, 'sgnome_red'], [17, 'sgnome']] },
    { segments: [[0, 20, 0]], deco: [[3, 'house'], [12, 'tree'], [18, 'tree']], enemies: [[10, 'sgnome_elder']] },
  ],
};

export const LEVEL_MUSHROOMS: LevelDef = {
  ...WOOD,
  id: 'mushrooms',
  name: 'Cogumelos Saltitantes',
  intro: 'Paredes altas demais para pular? Caia em cima dos cogumelos: eles te lançam lá no alto!',
  winText: 'Que pulos!',
  field: {
    mushrooms: [
      [0, 6, 0],
      [1, 7, 0],
      [2, 8, 0],
      [3, 4, 0],
      [4, 6, 0],
      [4, 12, 0],
    ],
  },
  screens: [
    { segments: [[0, 8, 0], [8, 4, 3], [12, 8, 0]], deco: [[1, 'tree']], enemies: [[16, 'sgnome']], sign: [3, 'Caia no cogumelo:\nele te lança no alto!'] },
    { segments: [[0, 9, 0], [9, 4, 4], [13, 7, 0]], enemies: [[17, 'sgnome_red']] },
    { segments: [[0, 4, 0], [7, 3, 0], [13, 7, 0]], floats: [[10, 2, 5]], enemies: [[16, 'sgnome_moss']] },
    { segments: [[0, 6, 0], [6, 3, 5], [9, 11, 0]], deco: [[15, 'bush']], enemies: [[14, 'sgnome_elder']] },
    { segments: [[0, 20, 0]], floats: [[8, 3, 5]], deco: [[2, 'tree'], [18, 'tree']], enemies: [[16, 'sgnome_red']] },
  ],
};

export const LEVEL_TREETOPS: LevelDef = {
  ...WOOD,
  id: 'treetops',
  name: 'Copas das Árvores',
  intro: 'O chão some no rio. O caminho é por cima, de copa em copa.',
  winText: 'Você atravessou pelas copas!',
  field: { mushrooms: [[1, 1, 0]] },
  screens: [
    { segments: [[0, 6, 0], [16, 4, 0]], floats: [[5, 3, 2], [9, 3, 3], [13, 3, 2]], deco: [[2, 'tree']], enemies: [[18, 'sgnome']] },
    { segments: [[0, 3, 0], [17, 3, 0]], floats: [[2, 3, 2], [6, 2, 3], [9, 3, 4], [13, 3, 3]], enemies: [[18, 'sgnome_red']] },
    { segments: [[0, 4, 0], [15, 5, 0]], floats: [[3, 3, 3], [7, 3, 4], [11, 3, 3]], enemies: [[17, 'sgnome_red']] },
    { segments: [[0, 3, 0], [16, 4, 0]], floats: [[2, 2, 2], [5, 3, 3], [9, 2, 4], [12, 3, 3]], enemies: [[18, 'sgnome_elder']] },
    { segments: [[0, 20, 0]], deco: [[4, 'tree'], [12, 'tree']], enemies: [[8, 'sgnome'], [14, 'sgnome_red']] },
  ],
};

export const LEVEL_LOGRIVER: LevelDef = {
  ...WOOD,
  id: 'logriver',
  name: 'Rio de Toras',
  intro: 'Toras boiam no rio: dá para pisar nelas. As tábuas soltas afundam.',
  winText: 'Você atravessou o rio de toras!',
  sea: {
    crateTex: 'log_float',
    crates: [
      [0, 6, 2],
      [0, 9, 2],
      [1, 3, 2],
      [1, 6, 2],
      [1, 12, 2],
      [1, 14, 2],
      [2, 4, 2],
      [2, 7, 2],
      [2, 10, 2],
      [3, 5, 2],
      [3, 8, 2],
      [3, 13, 2],
      [3, 15, 2],
    ],
    planks: [[2, 12, 2, 0]],
  },
  screens: [
    { segments: [[0, 6, 0], [12, 8, 0]], deco: [[2, 'tree']], enemies: [[16, 'sgnome']] },
    { segments: [[0, 3, 0], [9, 3, 1], [16, 4, 0]], enemies: [[10, 'sgnome_red']] },
    { segments: [[0, 4, 0], [14, 6, 0]], enemies: [[17, 'sgnome_moss']] },
    { segments: [[0, 5, 0], [11, 2, 1], [17, 3, 0]], enemies: [[18, 'sgnome']] },
    { segments: [[0, 20, 0]], deco: [[5, 'house'], [16, 'tree']], enemies: [[9, 'sgnome_elder'], [15, 'goblin']] },
  ],
};

export const LEVEL_ACORNGUN: LevelDef = {
  ...WOOD,
  id: 'acorngun',
  name: 'Tiro no Bosque',
  intro: 'Corrida e tiro! Gnomos de estilingue por toda parte.',
  winText: 'O bosque foi limpo a tiros!',
  gun: { spawns: ['sgnome', 'sgnome_red', 'goblin'] as CharId[], every: 1900 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], deco: [[2, 'tree']], enemies: [[14, 'sgnome']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'sgnome_red'], [16, 'goblin']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'sgnome_elder']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], deco: [[17, 'tree']], enemies: [[5, 'sgnome'], [16, 'sgnome_red']] },
    { segments: [[0, 20, 0]], deco: [[10, 'house']], enemies: [[8, 'sgnome_red'], [12, 'goblin'], [16, 'sgnome_elder']] },
  ],
};

export const LEVEL_MOSS: LevelDef = {
  ...WOOD,
  id: 'moss',
  name: 'Musgo Traiçoeiro',
  intro: 'Montinhos de musgo tremendo escondem gnomos. E as toras não param de rolar.',
  winText: 'Nenhum gnomo te pegou!',
  field: {
    boulderTex: 'log_roll',
    boulders: [
      [1, 18, 1, -1, 3600],
      [3, 18, 0, -1, 3200],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], deco: [[3, 'bush'], [12, 'bush']], enemies: [[7, 'sgnome_moss'], [14, 'sgnome_moss']], sign: [2, 'Musgo que treme\nnão é musgo...'] },
    { segments: [[0, 7, 0], [9, 4, 1], [15, 5, 1]], enemies: [[5, 'sgnome_moss'], [11, 'sgnome_red']] },
    { segments: [[0, 5, 0], [5, 3, 2], [8, 12, 0]], floats: [[14, 2, 3]], enemies: [[10, 'sgnome_moss'], [13, 'sgnome_moss'], [17, 'sgnome']] },
    { segments: [[0, 6, 0], [8, 12, 0]], deco: [[2, 'tree']], enemies: [[3, 'sgnome_moss'], [11, 'sgnome_elder']] },
    { segments: [[0, 20, 0]], deco: [[8, 'bush'], [15, 'tree']], enemies: [[6, 'sgnome_moss'], [10, 'sgnome_moss'], [14, 'sgnome_red']] },
  ],
};

export const LEVEL_GNOMEVILLAGE: LevelDef = {
  ...WOOD,
  id: 'gnomevillage',
  name: 'Vila dos Gnomos',
  intro: 'A vila dos gnomos. Cada área só abre quando todos os moradores caírem.',
  winText: 'A vila se rendeu!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[2, 'house'], [14, 'house']], enemies: [[9, 'sgnome'], [16, 'sgnome_red']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[3, 'house']], enemies: [[10, 'sgnome_moss'], [16, 'goblin']] },
    { segments: [[0, 20, 0]], deco: [[6, 'tower'], [15, 'house']], enemies: [[11, 'sgnome_elder']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], deco: [[2, 'house']], enemies: [[9, 'sgnome_red'], [12, 'sgnome'], [17, 'sgnome_moss']] },
    { segments: [[0, 20, 0]], deco: [[4, 'house'], [16, 'tower']], enemies: [[8, 'sgnome_elder'], [13, 'sgnome_red'], [16, 'goblin']] },
  ],
};

export const LEVEL_GNOMEKING: LevelDef = {
  ...WOOD,
  id: 'gnomeking',
  name: 'Árvore do Rei Gnomo',
  intro: 'O Rei Gnomo guarda o fragmento no pé da árvore mais velha do bosque.',
  winText: 'O Rei Gnomo caiu! Fragmento da coroa recuperado!',
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], deco: [[2, 'tree'], [16, 'tree']], enemies: [[14, 'sgnome_red'], [18, 'sgnome']] },
    { segments: [[0, 6, 0], [8, 6, 1], [16, 4, 0]], deco: [[3, 'bush']], enemies: [[10, 'sgnome_elder']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'gnomeking',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'tree'], [18, 'tree']] },
  },
};


// ---------- Área 7: Minas dos Goblins ----------

const MINE = { theme: 'cave' as const, tiles: 'tiles_mine', storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };

export const LEVEL_MINEENTRY: LevelDef = {
  ...MINE,
  id: 'mineentry',
  name: 'Boca da Mina',
  intro: 'As minas dos goblins. Tochas, ouro e pedras soltas no teto: olhe a poeira caindo!',
  winText: 'Você entrou nas minas!',
  field: {
    rockfall: [
      [2, 10, 3600],
      [4, 8, 3200],
      [4, 13, 3200, 1600],
    ],
  },
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], deco: [[3, 'gold'], [16, 'gold']], enemies: [[15, 'torchgob']], sign: [3, 'Poeira caindo do teto:\nlá vem pedra!'] },
    { segments: [[0, 6, 0], [6, 3, 1], [11, 9, 0]], deco: [[14, 'gold']], hangers: [9], enemies: [[16, 'torchgob_blue']] },
    { segments: [[0, 8, 0], [10, 4, 1], [16, 4, 0]], floats: [[8, 2, 2]], enemies: [[12, 'torchgob']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2], [13, 2, 2]], enemies: [[9, 'torchgob_miner'], [17, 'bat']] },
    { segments: [[0, 20, 0]], deco: [[4, 'gold'], [17, 'gold']], enemies: [[10, 'torchgob_chief']] },
  ],
};

export const LEVEL_CAVEIN: LevelDef = {
  ...MINE,
  id: 'cavein',
  name: 'Desabamento',
  intro: 'O teto da galeria está desabando! A poeira avisa onde a pedra vai cair.',
  winText: 'Você escapou do desabamento!',
  field: {
    rockfall: [
      [0, 6, 2400],
      [0, 10, 2400, 800],
      [0, 14, 2400, 1600],
      [1, 4, 2200],
      [1, 9, 2200, 700],
      [1, 15, 2200, 1400],
      [2, 7, 2000],
      [2, 11, 2000, 600],
      [2, 15, 2000, 1200],
      [3, 5, 1800],
      [3, 9, 1800, 600],
      [3, 13, 1800, 1200],
      [4, 6, 2000],
      [4, 12, 2000, 1000],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], deco: [[2, 'gold']], enemies: [[17, 'torchgob']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[18, 'torchgob_miner']] },
    { segments: [[0, 4, 0], [6, 8, 0], [16, 4, 0]], floats: [[4, 2, 2], [14, 2, 2]], enemies: [[17, 'torchgob_blue']] },
    { segments: [[0, 20, 0]], floats: [[6, 3, 3], [12, 3, 3]], enemies: [[18, 'torchgob']] },
    { segments: [[0, 20, 0]], deco: [[16, 'gold']], enemies: [[8, 'torchgob_chief']] },
  ],
};

export const LEVEL_DARKMINE: LevelDef = {
  ...MINE,
  id: 'darkmine',
  name: 'Galeria Escura',
  intro: 'As tochas da galeria se apagaram. Acenda-as; as 3 grandes abrem a saída.',
  winText: 'A galeria se iluminou!',
  screens: [
    { segments: [[0, 20, 0]], floats: [[8, 3, 2]], enemies: [[14, 'torchgob']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'bat'], [16, 'torchgob_blue']] },
    { segments: [[0, 5, 0], [7, 3, 2], [12, 8, 0]], floats: [[10, 2, 3]], enemies: [[15, 'torchgob_miner']] },
    { segments: [[0, 7, 0], [9, 2, 1], [13, 7, 0]], enemies: [[4, 'spider'], [16, 'torchgob']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'torchgob_chief']], sign: [12, 'A saída só abre com\nas 3 TOCHAS GRANDES acesas.'] },
  ],
  haunt: {
    dark: true,
    torches: true,
    candles: [
      { screen: 0, tile: 4 },
      { screen: 0, tile: 16, big: true },
      { screen: 1, tile: 2 },
      { screen: 1, tile: 10, h: 1 },
      { screen: 1, tile: 18, big: true },
      { screen: 2, tile: 3 },
      { screen: 2, tile: 15 },
      { screen: 3, tile: 2 },
      { screen: 3, tile: 17, big: true },
      { screen: 4, tile: 4 },
    ],
    doors: [{ id: 'exit', screen: 4, tile: 17, exit: true }],
  },
};

export const LEVEL_GOLDVEIN: LevelDef = {
  ...MINE,
  id: 'goldvein',
  name: 'Veio de Ouro',
  intro: 'Pedras de ouro fecham as galerias. Martelo nelas e leve a chave até a porta.',
  winText: 'O veio de ouro se abriu!',
  puzzle: {
    key: [1, 8, 3],
    door: [2, 17, 0],
    gifts: [
      [0, 15, 3],
      [1, 2, 0],
      [2, 6, 4],
    ],
    ladders: [[1, 5, 0, 3]],
    springs: [
      [0, 12, 0],
      [2, 6, 0],
    ],
    stones: [
      [0, 8, 0],
      [0, 8, 1],
      [1, 14, 0],
      [2, 11, 0],
      [2, 11, 1],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[14, 3, 3]], deco: [[2, 'gold']] },
    { segments: [[0, 6, 0], [6, 4, 3], [10, 10, 0]], deco: [[17, 'gold']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 4]] },
  ],
};

export const LEVEL_DYNAMITE: LevelDef = {
  ...MINE,
  id: 'dynamite',
  name: 'Dinamite',
  intro: 'Goblins mineiros jogam bombas em arco. E as pedras rolam pelos trilhos.',
  winText: 'Nenhuma explosão te pegou!',
  field: {
    boulders: [
      [1, 18, 1, -1, 3400],
      [3, 18, 0, -1, 3000],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[8, 3, 2]], enemies: [[12, 'torchgob_miner'], [17, 'torchgob']] },
    { segments: [[0, 7, 0], [9, 4, 1], [15, 5, 1]], enemies: [[11, 'torchgob_miner']] },
    { segments: [[0, 5, 0], [5, 3, 2], [8, 12, 0]], floats: [[14, 2, 3]], enemies: [[10, 'torchgob_miner'], [17, 'torchgob_blue']] },
    { segments: [[0, 6, 0], [8, 12, 0]], enemies: [[11, 'torchgob_miner'], [16, 'torchgob_miner']] },
    { segments: [[0, 20, 0]], deco: [[3, 'gold']], enemies: [[8, 'torchgob_chief'], [14, 'torchgob_miner']] },
  ],
};

export const LEVEL_FLOODED: LevelDef = {
  ...MINE,
  id: 'flooded',
  name: 'Mina Alagada',
  intro: 'A água da mina sobe e desce. Fique no alto, ou em cima dos caixotes.',
  winText: 'Você atravessou a mina alagada!',
  sea: {
    tide: { high: 80, hold: 4500, move: 2400 },
    crates: [
      [1, 9, 2],
      [3, 4, 2],
      [3, 9, 2],
      [3, 14, 2],
    ],
  },
  screens: [
    { segments: [[0, 7, 0], [7, 3, 1], [10, 5, 0], [15, 2, 2], [17, 3, 0]], floats: [[12, 2, 2]], enemies: [[18, 'torchgob']] },
    { segments: [[0, 3, 1], [3, 6, 0], [11, 4, 0], [15, 5, 1]], floats: [[6, 2, 2]], enemies: [[13, 'torchgob_blue']] },
    { segments: [[0, 5, 0], [5, 2, 2], [7, 6, 0], [13, 2, 2], [15, 5, 0]], floats: [[9, 3, 3]], enemies: [[10, 'torchgob_miner']] },
    { segments: [[0, 4, 0], [6, 3, 1], [11, 3, 1], [16, 4, 0]], enemies: [[12, 'torchgob']] },
    { segments: [[0, 6, 0], [6, 3, 2], [9, 6, 0], [15, 5, 1]], floats: [[11, 3, 3]], enemies: [[17, 'torchgob_chief']] },
  ],
};

export const LEVEL_BLUEFIRE: LevelDef = {
  ...MINE,
  id: 'bluefire',
  name: 'Fogo Azul',
  intro: 'O fogo aqui embaixo é azul e corre atrás de você. E os gêiseres não param.',
  winText: 'Você atravessou o fogo azul!',
  field: {
    geysers: [
      [0, 9, 0, 2600],
      [1, 6, 0, 2400],
      [1, 15, 0, 2400, 1200],
      [3, 8, 0, 2200],
      [3, 12, 0, 2200, 1100],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[12, 3, 3]], enemies: [[15, 'torchgob_blue']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'torchgob_blue'], [17, 'bat']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'torchgob_blue']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 3]], enemies: [[15, 'torchgob_blue'], [18, 'torchgob_miner']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'torchgob_blue'], [14, 'torchgob_chief']] },
  ],
};

export const LEVEL_TREASURY: LevelDef = {
  ...MINE,
  id: 'treasury',
  name: 'Tesouro dos Goblins',
  intro: 'O tesouro do Rei. Cada área só abre quando todos os guardas caírem.',
  winText: 'O caminho até o Rei Goblin está aberto!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[2, 'gold'], [15, 'gold']], enemies: [[9, 'torchgob'], [16, 'torchgob_blue']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[3, 'gold']], enemies: [[10, 'torchgob_miner'], [16, 'torchgob']] },
    { segments: [[0, 20, 0]], deco: [[6, 'gold'], [14, 'gold']], enemies: [[11, 'torchgob_chief']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], deco: [[2, 'gold']], enemies: [[9, 'torchgob_blue'], [12, 'torchgob_miner'], [17, 'torchgob']] },
    { segments: [[0, 20, 0]], deco: [[4, 'gold'], [10, 'gold'], [16, 'gold']], enemies: [[8, 'torchgob_chief'], [13, 'torchgob_blue'], [16, 'torchgob_miner']] },
  ],
};

export const LEVEL_GOBLINKING: LevelDef = {
  ...MINE,
  id: 'goblinking',
  name: 'Trono do Rei Goblin',
  intro: 'O Rei Goblin da Tocha conta cada pepita. E guarda o fragmento no meio do ouro.',
  winText: 'O Rei Goblin caiu! Fragmento da coroa recuperado!',
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], deco: [[2, 'gold'], [16, 'gold']], enemies: [[14, 'torchgob_miner'], [18, 'torchgob']] },
    { segments: [[0, 6, 0], [8, 6, 1], [16, 4, 0]], enemies: [[10, 'torchgob_chief']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'goblinking',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'gold'], [18, 'gold']] },
  },
};


// ---------- Área 3: Lagoa dos Lagartos ----------

const SWAMP = { theme: 'shore' as const, tiles: 'tiles_swamp', swamp: true, storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };

export const LEVEL_SWAMPEDGE: LevelDef = {
  ...SWAMP,
  id: 'swampedge',
  name: 'Margem do Pântano',
  intro: 'A lagoa dos lagartos. Água parada, musgo e lagartos que cospem veneno.',
  winText: 'Você chegou à lagoa!',
  sea: { plankTex: 'lily', planks: [[2, 8, 2, 0], [3, 6, 2, 0]] },
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], deco: [[2, 'dead_tree'], [15, 'bush']], enemies: [[15, 'lizard']], sign: [3, 'Lagoa dos Lagartos.\nCuidado com o veneno!'] },
    { segments: [[0, 6, 0], [6, 3, 1], [11, 9, 0]], deco: [[14, 'bush']], enemies: [[8, 'lizard_poison'], [16, 'lizard']] },
    { segments: [[0, 8, 0], [10, 10, 0]], floats: [[13, 2, 2]], enemies: [[14, 'lizard_tide']] },
    { segments: [[0, 6, 0], [8, 12, 0]], deco: [[12, 'stone']], enemies: [[12, 'lizard_poison'], [17, 'gnoll_wreck']] },
    { segments: [[0, 20, 0]], deco: [[3, 'dead_tree'], [16, 'bush']], enemies: [[10, 'lizard_croc']] },
  ],
};

export const LEVEL_LILYPADS: LevelDef = {
  ...SWAMP,
  id: 'lilypads',
  name: 'Vitórias-Régias',
  intro: 'Folhas gigantes boiam na lagoa. Elas afundam logo depois de pisadas!',
  winText: 'Você atravessou as vitórias-régias!',
  sea: {
    plankTex: 'lily',
    planks: [
      [0, 6, 2, 0],
      [0, 9, 2, 0],
      [1, 4, 2, 0],
      [1, 7, 2, 0],
      [1, 10, 2, 0],
      [1, 13, 2, 0],
      [2, 5, 2, 0],
      [2, 8, 2, 0],
      [2, 12, 2, 0],
      [3, 3, 2, 0],
      [3, 6, 2, 0],
      [3, 9, 2, 0],
      [3, 12, 2, 0],
      [3, 15, 2, 0],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [12, 8, 0]], deco: [[2, 'bush']], enemies: [[16, 'lizard']], sign: [3, 'Folhas afundam:\nnão pare em cima!'] },
    { segments: [[0, 3, 0], [16, 4, 0]], enemies: [[18, 'lizard_poison']] },
    { segments: [[0, 4, 0], [15, 5, 0]], enemies: [[17, 'lizard_tide']] },
    { segments: [[0, 2, 0], [18, 2, 0]] },
    { segments: [[0, 20, 0]], deco: [[6, 'dead_tree']], enemies: [[9, 'lizard_poison'], [15, 'lizard_croc']] },
  ],
};

export const LEVEL_SWAMPTIDE: LevelDef = {
  ...SWAMP,
  id: 'swamptide',
  name: 'Cheia do Pântano',
  intro: 'A água do pântano sobe e desce. Fique no alto ou em cima das toras.',
  winText: 'A cheia passou!',
  sea: {
    tide: { high: 80, hold: 4500, move: 2400 },
    crateTex: 'log_float',
    crates: [
      [1, 9, 2],
      [3, 4, 2],
      [3, 9, 2],
      [3, 14, 2],
    ],
  },
  screens: [
    { segments: [[0, 7, 0], [7, 3, 1], [10, 5, 0], [15, 2, 2], [17, 3, 0]], floats: [[12, 2, 2]], enemies: [[18, 'lizard']] },
    { segments: [[0, 3, 1], [3, 6, 0], [11, 4, 0], [15, 5, 1]], floats: [[6, 2, 2]], enemies: [[13, 'lizard_poison']] },
    { segments: [[0, 5, 0], [5, 2, 2], [7, 6, 0], [13, 2, 2], [15, 5, 0]], floats: [[9, 3, 3]], enemies: [[10, 'lizard_tide']] },
    { segments: [[0, 4, 0], [6, 3, 1], [11, 3, 1], [16, 4, 0]], enemies: [[12, 'lizard_poison']] },
    { segments: [[0, 6, 0], [6, 3, 2], [9, 6, 0], [15, 5, 1]], floats: [[11, 3, 3]], enemies: [[17, 'lizard_croc']] },
  ],
};

export const LEVEL_POISONMARSH: LevelDef = {
  ...SWAMP,
  id: 'poisonmarsh',
  name: 'Brejo Venenoso',
  intro: 'Espinhos venenosos no chão e lagartos roxos cuspindo veneno de todo lado.',
  winText: 'Você saiu do brejo inteiro!',
  sea: {
    corals: [
      [0, 8, 0],
      [0, 12, 0],
      [1, 4, 0],
      [1, 13, 0],
      [2, 9, 0],
      [3, 3, 0],
      [3, 15, 0],
      [4, 7, 0],
      [4, 12, 0],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[9, 3, 2]], deco: [[2, 'dead_tree']], enemies: [[16, 'lizard_poison']] },
    { segments: [[0, 6, 0], [8, 4, 1], [12, 8, 0]], enemies: [[10, 'lizard_poison'], [17, 'lizard_poison']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2]], enemies: [[12, 'lizard_croc']] },
    { segments: [[0, 20, 0]], floats: [[6, 3, 3], [12, 3, 3]], enemies: [[9, 'lizard_poison'], [18, 'lizard_tide']] },
    { segments: [[0, 20, 0]], deco: [[16, 'dead_tree']], enemies: [[9, 'lizard_poison'], [14, 'lizard_croc']] },
  ],
};

export const LEVEL_FISHERMAN: LevelDef = {
  ...SWAMP,
  id: 'fisherman',
  name: 'Casa do Pescador',
  intro: 'A chave da casa do pescador sumiu com um caranguejo do brejo. Acerte-o e leve a chave!',
  winText: 'A porta do pescador abriu!',
  puzzle: {
    key: [1, 10, 0],
    keyOnCrab: true,
    crabs: [
      [1, 10, 0, 8],
      [0, 14, 0, 4],
    ],
    door: [2, 17, 0],
    gifts: [
      [0, 6, 3],
      [1, 15, 3],
      [2, 9, 4],
    ],
    springs: [
      [0, 3, 0],
      [2, 7, 0],
    ],
    ladders: [[2, 12, 0, 2]],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[5, 3, 3]], deco: [[1, 'hut'], [18, 'bush']] },
    { segments: [[0, 20, 0]], floats: [[14, 3, 3]], sign: [3, 'O caranguejo do brejo\nlevou a chave!'] },
    { segments: [[0, 12, 0], [12, 8, 2]], floats: [[8, 3, 4]], deco: [[2, 'hut']] },
  ],
};

export const LEVEL_DEEPLAGOON: LevelDef = {
  ...SWAMP,
  id: 'deeplagoon',
  name: 'Fundo da Lagoa',
  intro: 'No fundo da lagoa, a caveira vira Lagarto e nada livre. ↑ (ou PULAR) sobe, ▼ desce.',
  winText: 'Você atravessou o fundo da lagoa!',
  undersea: true,
  underseaAs: 'lizard',
  sea: {
    corals: [
      [0, 10, 0],
      [1, 8, 0],
      [1, 12, 0],
      [2, 7, 0],
      [2, 15, 0],
      [3, 2, 0],
      [4, 12, 0],
    ],
    jellies: [
      [0, 13, 4, 1],
      [1, 10, 4, 1],
      [2, 9, 3, 0],
      [2, 16, 4, 1],
      [3, 10, 4, 1],
      [4, 6, 4, 1],
      [4, 15, 4, 1],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [6, 2, 3], [8, 12, 0]], enemies: [[16, 'lizard_tide']], sign: [2, '↑ ou PULAR sobe · ▼ desce'] },
    { segments: [[0, 4, 0], [4, 2, 4], [6, 8, 0], [14, 2, 3], [16, 4, 0]], enemies: [[18, 'lizard_poison']] },
    { segments: [[0, 3, 0], [3, 3, 3], [6, 6, 0], [12, 2, 4], [14, 6, 0]], enemies: [[9, 'lizard_tide']] },
    { segments: [[0, 5, 0], [5, 2, 4], [7, 6, 0], [13, 3, 2], [16, 4, 0]], enemies: [[17, 'lizard_poison']] },
    { segments: [[0, 8, 0], [8, 2, 4], [10, 10, 0]], enemies: [[14, 'lizard_croc']] },
  ],
};

export const LEVEL_SWAMPGUN: LevelDef = {
  ...SWAMP,
  id: 'swampgun',
  name: 'Tiro no Brejo',
  intro: 'Corrida e tiro! Lagartos e náufragos saem do brejo sem parar.',
  winText: 'O brejo foi limpo a tiros!',
  gun: { spawns: ['lizard', 'lizard_poison', 'gnoll_wreck'] as CharId[], every: 1900 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], enemies: [[14, 'lizard']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'lizard_poison'], [16, 'gnoll_wreck']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'lizard_croc']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], enemies: [[5, 'lizard_tide'], [16, 'lizard_poison']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'lizard_poison'], [12, 'gnoll_wreck'], [16, 'lizard_croc']] },
  ],
};

export const LEVEL_MANGROVE: LevelDef = {
  ...SWAMP,
  id: 'mangrove',
  name: 'Mangue',
  intro: 'Raízes e galhos sobre a água. Toras rolam pelos troncos caídos.',
  winText: 'Você atravessou o mangue!',
  field: {
    boulderTex: 'log_roll',
    boulders: [
      [1, 18, 2, -1, 3600],
      [3, 18, 1, -1, 3200],
    ],
    mushrooms: [[2, 3, 0]],
  },
  screens: [
    { segments: [[0, 5, 0], [8, 3, 1], [14, 6, 0]], floats: [[5, 3, 2], [11, 3, 2]], deco: [[2, 'dead_tree']], enemies: [[17, 'lizard_croc']] },
    { segments: [[0, 4, 0], [7, 3, 2], [13, 7, 2]], floats: [[4, 3, 1]], enemies: [[16, 'lizard_poison']] },
    { segments: [[0, 6, 0], [11, 3, 2], [16, 4, 0]], floats: [[7, 3, 4]], enemies: [[17, 'lizard_tide']] },
    { segments: [[0, 3, 0], [6, 4, 1], [13, 7, 1]], floats: [[3, 3, 2], [10, 3, 3]], enemies: [[16, 'lizard_croc']] },
    { segments: [[0, 20, 0]], deco: [[4, 'dead_tree'], [15, 'dead_tree']], enemies: [[9, 'lizard_poison'], [14, 'lizard_croc']] },
  ],
};

export const LEVEL_LIZARDVILLAGE: LevelDef = {
  ...SWAMP,
  id: 'lizardvillage',
  name: 'Aldeia dos Lagartos',
  intro: 'A aldeia dos lagartos. Cada área só abre quando todos os moradores caírem.',
  winText: 'O caminho até o Rei Lagarto está aberto!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[2, 'hut'], [15, 'hut']], enemies: [[9, 'lizard'], [16, 'lizard_poison']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[3, 'hut']], enemies: [[10, 'lizard_tide'], [16, 'lizard']] },
    { segments: [[0, 20, 0]], deco: [[6, 'hut'], [15, 'hut']], enemies: [[11, 'lizard_croc']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], deco: [[2, 'hut']], enemies: [[9, 'lizard_poison'], [12, 'lizard'], [17, 'lizard_tide']] },
    { segments: [[0, 20, 0]], deco: [[4, 'hut'], [16, 'hut']], enemies: [[8, 'lizard_croc'], [13, 'lizard_poison'], [16, 'lizard']] },
  ],
};

export const LEVEL_LIZARDKING: LevelDef = {
  ...SWAMP,
  id: 'lizardking',
  name: 'Trono do Rei Lagarto',
  intro: 'O Rei Lagarto nunca dorme. Ele cospe veneno, estica a língua e salta espalhando poças.',
  winText: 'O Rei Lagarto caiu! Fragmento da coroa recuperado!',
  screens: [
    { segments: [[0, 8, 0], [10, 10, 0]], deco: [[2, 'dead_tree']], enemies: [[14, 'lizard_poison'], [18, 'lizard']] },
    { segments: [[0, 6, 0], [8, 6, 1], [16, 4, 0]], enemies: [[10, 'lizard_croc']] },
    { segments: [[0, 20, 0]] },
  ],
  boss: {
    kind: 'lizardking',
    arena: { segments: [[0, 20, 0]], floats: [[3, 3, 3], [14, 3, 3]], deco: [[1, 'dead_tree'], [18, 'dead_tree']] },
  },
};


// ---------- Área 8: Céu de Brasa ----------

const EMBER = { theme: 'sky' as const, tiles: 'tiles_volcano', ember: true, storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };

export const LEVEL_EMBERCLOUDS: LevelDef = {
  ...EMBER,
  id: 'emberclouds',
  name: 'Nuvens de Brasa',
  intro: 'Nuvens em brasa se desfazem logo depois de pisadas. E cair daqui é cair no vazio.',
  winText: 'Você atravessou as nuvens de brasa!',
  sea: {
    plankTex: 'cloud_plank',
    planks: [
      [0, 6, 2, 0],
      [0, 8, 3, 1],
      [1, 4, 3, 1],
      [1, 7, 2, 2],
      [1, 9, 3, 1],
      [1, 12, 2, 0],
      [2, 5, 2, 1],
      [2, 7, 2, 1],
      [2, 12, 2, 1],
      [2, 14, 2, 0],
      [3, 3, 3, 0],
      [3, 6, 2, 1],
      [3, 8, 3, 2],
      [3, 11, 3, 1],
      [3, 14, 3, 0],
    ],
  },
  screens: [
    { segments: [[0, 6, 0], [11, 9, 0]], enemies: [[16, 'imp']], sign: [2, 'Nuvens de brasa\nse desfazem: corra!'] },
    { segments: [[0, 4, 1], [14, 6, 0]], enemies: [[17, 'bee_ember']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], enemies: [[10, 'imp']] },
    { segments: [[0, 3, 0], [17, 3, 0]], floats: [[9, 2, 4]], enemies: [[18, 'bee_ember']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'imp'], [14, 'bee_storm']] },
  ],
};

export const LEVEL_METEOR: LevelDef = {
  ...EMBER,
  id: 'meteor',
  name: 'Chuva de Meteoros',
  intro: 'Meteoros em brasa caem do céu. Fagulhas avisam onde eles vão cair.',
  winText: 'Nenhum meteoro te acertou!',
  field: {
    fallTex: 'meteor',
    rockfall: [
      [0, 7, 2600],
      [0, 13, 2600, 1300],
      [1, 5, 2400],
      [1, 10, 2400, 800],
      [1, 15, 2400, 1600],
      [2, 8, 2200],
      [2, 12, 2200, 1100],
      [3, 4, 2000],
      [3, 9, 2000, 700],
      [3, 14, 2000, 1400],
      [4, 6, 2200],
      [4, 11, 2200, 1100],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[9, 3, 3]], enemies: [[16, 'imp']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[17, 'bee_ember']] },
    { segments: [[0, 4, 0], [6, 8, 0], [16, 4, 0]], floats: [[4, 2, 2], [14, 2, 2]], enemies: [[11, 'imp']] },
    { segments: [[0, 20, 0]], floats: [[6, 3, 3], [12, 3, 3]], enemies: [[17, 'bee_storm']] },
    { segments: [[0, 20, 0]], enemies: [[9, 'imp'], [15, 'bee_ember']] },
  ],
};

export const LEVEL_EMBERGUN: LevelDef = {
  ...EMBER,
  id: 'embergun',
  name: 'Tiro no Céu de Brasa',
  intro: 'Corrida e tiro nas ilhas do céu! Diabretes e abelhas de brasa sem parar.',
  winText: 'O céu foi limpo a tiros!',
  gun: { spawns: ['imp', 'bee_ember', 'bee'] as CharId[], every: 1900 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], enemies: [[14, 'imp']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'bee_ember'], [16, 'imp']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'bee_storm']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], enemies: [[5, 'imp'], [16, 'bee_ember']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'bee_ember'], [12, 'imp'], [16, 'bee_storm']] },
  ],
};

export const LEVEL_FIREWINDS: LevelDef = {
  ...EMBER,
  id: 'firewinds',
  name: 'Ventos de Fogo',
  intro: 'Correntes de vento quente entre as ilhas, e jatos de fogo saindo das pedras.',
  winText: 'O vento quente te levou até o fim!',
  winds: [
    [0, 8, 3],
    [1, 5, 3],
    [2, 6, 2],
    [2, 13, 2],
    [3, 5, 3],
    [3, 10, 2],
  ],
  field: {
    geysers: [
      [0, 15, 1, 2800],
      [2, 10, 2, 2600],
      [4, 8, 0, 2400],
      [4, 13, 0, 2400, 1200],
    ],
  },
  screens: [
    { segments: [[0, 7, 0], [13, 7, 1]], floats: [[10, 2, 4]], enemies: [[18, 'imp']], sign: [3, 'Entre no vento para subir.\nSegure PULAR para planar.'] },
    { segments: [[0, 4, 1], [12, 8, 0]], floats: [[8, 3, 4]], enemies: [[16, 'bee_ember']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], enemies: [[18, 'imp']] },
    { segments: [[0, 4, 0], [14, 6, 1]], floats: [[8, 2, 5]], enemies: [[17, 'bee_storm']] },
    { segments: [[0, 20, 0]], enemies: [[10, 'imp'], [16, 'bee_ember']] },
  ],
};

export const LEVEL_CLOUDCASTLE: LevelDef = {
  ...EMBER,
  id: 'cloudcastle',
  name: 'Castelo nas Nuvens',
  intro: 'O castelo dos diabretes. Cada área só abre quando todos os guardas caírem.',
  winText: 'O castelo nas nuvens caiu!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[2, 'tower'], [15, 'tower']], enemies: [[9, 'imp'], [16, 'bee_ember']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[3, 'tower']], enemies: [[10, 'imp'], [16, 'imp']] },
    { segments: [[0, 20, 0]], deco: [[6, 'tower'], [15, 'tower']], enemies: [[11, 'bee_storm']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], deco: [[2, 'tower']], enemies: [[9, 'imp'], [12, 'bee_ember'], [17, 'imp']] },
    { segments: [[0, 20, 0]], deco: [[4, 'tower'], [16, 'tower']], enemies: [[8, 'bee_storm'], [13, 'imp'], [16, 'bee_ember']] },
  ],
};

export const LEVEL_EMBERBEES: LevelDef = {
  ...EMBER,
  id: 'emberbees',
  name: 'Enxame de Brasa',
  intro: 'Um enxame de abelhas de brasa, e canhões do castelo varrendo as ilhas.',
  winText: 'Você atravessou o enxame!',
  sea: {
    cannons: [
      [0, 19, 0, -1, 2600],
      [2, 19, 0, -1, 2400],
      [4, 19, 0, -1, 2200],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[8, 3, 3]], enemies: [[10, 'bee_ember'], [15, 'bee_ember']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'bee_ember'], [16, 'bee_storm']] },
    { segments: [[0, 4, 0], [6, 8, 0], [16, 4, 0]], floats: [[4, 2, 2], [14, 2, 2]], enemies: [[10, 'bee_ember'], [17, 'bee']] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 3], [12, 3, 3]], enemies: [[9, 'bee_storm'], [16, 'bee_ember']] },
    { segments: [[0, 20, 0]], enemies: [[8, 'bee_ember'], [12, 'bee_storm'], [16, 'bee_ember']] },
  ],
};

export const LEVEL_SKYKEY: LevelDef = {
  ...EMBER,
  id: 'skykey',
  name: 'Cofre das Nuvens',
  intro: 'O cofre dos diabretes. Leve a chave pelas ilhas, usando as molas e a alavanca de cor.',
  winText: 'O cofre das nuvens abriu!',
  puzzle: {
    key: [1, 8, 3],
    door: [2, 17, 0],
    gifts: [
      [0, 15, 3],
      [1, 2, 0],
      [2, 13, 3],
    ],
    ladders: [[1, 5, 0, 3]],
    springs: [
      [0, 12, 0],
      [2, 4, 0],
    ],
    switches: [[2, 6, 0]],
    blocks: [
      [2, 10, 0, 'red'],
      [2, 10, 1, 'red'],
      [2, 10, 2, 'red'],
      [2, 10, 3, 'red'],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[14, 3, 3]] },
    { segments: [[0, 6, 0], [6, 4, 3], [10, 10, 0]] },
    { segments: [[0, 20, 0]], floats: [[12, 3, 3]] },
  ],
};


// ---------- Área 9: Reino das Asas (o reino inimigo do aliado do acordo) ----------

const WINGS = { theme: 'sky' as const, tiles: 'tiles_sky', storyStart: [0, 2] as [number, number], versusStart: [3, 16] as [number, number] };
const FLY = [{ segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }, { segments: [] }] as ScreenDef[];

export const LEVEL_WINGSGATE: LevelDef = {
  ...WINGS,
  id: 'wingsgate',
  name: 'Portal das Asas',
  intro: 'A entrada do reino inimigo do seu aliado. Os guardas voam e mergulham.',
  winText: 'Você passou pelo portal das asas!',
  screens: [
    { segments: [[0, 9, 0], [11, 9, 0]], floats: [[9, 2, 2]], enemies: [[15, 'wing']], sign: [3, 'O reino inimigo\ndo seu aliado.'] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'wing'], [16, 'wing_fast']] },
    { segments: [[0, 5, 0], [7, 6, 0], [15, 5, 0]], floats: [[5, 2, 2], [13, 2, 2]], enemies: [[12, 'wing']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[10, 'wing_fast'], [17, 'wing']] },
    { segments: [[0, 20, 0]], deco: [[4, 'tower'], [16, 'tower']], enemies: [[10, 'wing_elite']] },
  ],
};

export const LEVEL_SKYROUTE: LevelDef = {
  ...WINGS,
  id: 'skyroute',
  name: 'Rota do Vento',
  intro: 'Voo de dia, montado no seu aliado, cruzando o céu do reino inimigo.',
  winText: 'A rota do vento ficou para trás!',
  shmup: true,
  shmupDay: true,
  shmupSeed: 'rota-do-vento',
  shmupDensity: 0.9,
  screens: FLY,
};

export const LEVEL_WINGCASTLE: LevelDef = {
  ...WINGS,
  id: 'wingcastle',
  name: 'Castelo das Asas',
  intro: 'O castelo do reino. Cada área só abre quando todos os guardas caírem.',
  winText: 'O castelo das asas caiu!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], floats: [[6, 3, 3]], deco: [[2, 'tower'], [15, 'tower']], enemies: [[9, 'wing'], [16, 'wing']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], deco: [[3, 'tower']], enemies: [[10, 'wing_fast'], [16, 'wing']] },
    { segments: [[0, 20, 0]], deco: [[6, 'tower'], [15, 'tower']], enemies: [[11, 'wing_elite']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], deco: [[2, 'tower']], enemies: [[9, 'wing'], [12, 'wing_fast'], [17, 'wing']] },
    { segments: [[0, 20, 0]], deco: [[4, 'tower'], [16, 'tower']], enemies: [[8, 'wing_elite'], [13, 'wing_fast'], [16, 'wing']] },
  ],
};

export const LEVEL_STORMFLIGHT: LevelDef = {
  ...WINGS,
  id: 'stormflight',
  name: 'Voo na Tempestade',
  intro: 'Um voo noturno no meio da tempestade. As ondas de inimigos vêm mais juntas.',
  winText: 'Você atravessou a tempestade!',
  shmup: true,
  shmupSeed: 'voo-na-tempestade',
  shmupDensity: 1.25,
  screens: FLY,
};

export const LEVEL_WINGKEY: LevelDef = {
  ...WINGS,
  id: 'wingkey',
  name: 'Câmara Real',
  intro: 'A câmara real. Leve a chave pelas molas e escadas até a porta.',
  winText: 'A câmara real se abriu!',
  puzzle: {
    key: [1, 8, 3],
    door: [2, 17, 0],
    gifts: [
      [0, 15, 3],
      [1, 2, 0],
      [2, 6, 4],
    ],
    ladders: [[1, 5, 0, 3]],
    springs: [
      [0, 12, 0],
      [2, 6, 0],
    ],
  },
  screens: [
    { segments: [[0, 20, 0]], floats: [[14, 3, 3]], deco: [[2, 'tower']] },
    { segments: [[0, 6, 0], [6, 4, 3], [10, 10, 0]] },
    { segments: [[0, 20, 0]], floats: [[5, 3, 4]], deco: [[12, 'tower']] },
  ],
};

export const LEVEL_WINGWINDS: LevelDef = {
  ...WINGS,
  id: 'wingwinds',
  name: 'Correntes Reais',
  intro: 'Correntes de vento entre as torres do reino, e guardas mergulhando.',
  winText: 'O vento te levou até as torres!',
  winds: [
    [0, 8, 3],
    [1, 5, 3],
    [2, 6, 2],
    [2, 13, 2],
    [3, 5, 3],
    [3, 10, 2],
  ],
  screens: [
    { segments: [[0, 7, 0], [13, 7, 1]], floats: [[10, 2, 4]], enemies: [[17, 'wing']] },
    { segments: [[0, 4, 1], [12, 8, 0]], floats: [[8, 3, 4]], enemies: [[16, 'wing_fast']] },
    { segments: [[0, 5, 0], [9, 3, 2], [16, 4, 0]], enemies: [[18, 'wing']] },
    { segments: [[0, 4, 0], [14, 6, 1]], floats: [[8, 2, 5]], enemies: [[17, 'wing_elite']] },
    { segments: [[0, 20, 0]], deco: [[6, 'tower'], [14, 'tower']], enemies: [[10, 'wing'], [16, 'wing_fast']] },
  ],
};

export const LEVEL_DUSKFLIGHT: LevelDef = {
  ...WINGS,
  id: 'duskflight',
  name: 'Voo ao Entardecer',
  intro: 'O último voo de dia antes da noite do rei. Muitos inimigos, e mais fortes.',
  winText: 'O sol se pôs atrás de você!',
  shmup: true,
  shmupDay: true,
  shmupSeed: 'voo-ao-entardecer',
  shmupDensity: 1.4,
  screens: FLY,
};

export const LEVEL_WINGGUN: LevelDef = {
  ...WINGS,
  id: 'winggun',
  name: 'Tiro Real',
  intro: 'Corrida e tiro nas muralhas do reino! Os guardas não param de chegar.',
  winText: 'As muralhas foram limpas a tiros!',
  gun: { spawns: ['wing', 'wing_fast', 'wing'], every: 1800 },
  screens: [
    { segments: [[0, 20, 0]], floats: [[7, 3, 3]], deco: [[2, 'tower']], enemies: [[14, 'wing']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[9, 'wing_fast'], [16, 'wing']] },
    { segments: [[0, 4, 1], [6, 8, 0], [16, 4, 0]], floats: [[14, 2, 2]], enemies: [[11, 'wing_elite']] },
    { segments: [[0, 7, 0], [9, 3, 2], [14, 6, 0]], enemies: [[5, 'wing'], [16, 'wing_fast']] },
    { segments: [[0, 20, 0]], deco: [[16, 'tower']], enemies: [[8, 'wing_fast'], [12, 'wing'], [16, 'wing_elite']] },
  ],
};

export const LEVEL_WINGGUARD: LevelDef = {
  ...WINGS,
  id: 'wingguard',
  name: 'Guarda Real',
  intro: 'A guarda real defende a última ponte antes do voo até o rei.',
  winText: 'A guarda real caiu. O rei espera no céu da noite!',
  clearToAdvance: true,
  screens: [
    { segments: [[0, 20, 0]], deco: [[3, 'tower'], [16, 'tower']], enemies: [[10, 'wing_elite'], [15, 'wing']] },
    { segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]], enemies: [[10, 'wing_fast'], [16, 'wing_elite']] },
    { segments: [[0, 20, 0]], floats: [[6, 3, 3], [12, 3, 3]], enemies: [[9, 'wing_elite'], [15, 'wing_fast']] },
    { segments: [[0, 5, 0], [7, 6, 1], [15, 5, 0]], enemies: [[9, 'wing'], [12, 'wing_elite'], [17, 'wing_fast']] },
    { segments: [[0, 20, 0]], deco: [[4, 'tower'], [16, 'tower']], enemies: [[8, 'wing_elite'], [12, 'wing_elite'], [16, 'wing_fast']] },
  ],
};

export const LEVELS: LevelDef[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_KEY1,
  LEVEL_NEST,
  LEVEL_QUEEN,
  LEVEL_GUN1,
  LEVEL_KEY2,
  LEVEL_VOLCANO,
  LEVEL_CHASE,
  LEVEL_KEY3,
  LEVEL_PRINCES,
  LEVEL_PLANE,
  LEVEL_3,
  LEVEL_WINDS,
  LEVEL_KEY4,
  LEVEL_FLIGHT,
  LEVEL_GUN2,
  LEVEL_STAIRS,
  LEVEL_KEY5,
  LEVEL_MAUSOLEUM,
  LEVEL_DOORS,
  LEVEL_LIBRARY,
  LEVEL_DARK,
  LEVEL_FINALE,
  // Área 1 (Ilhas da Maré).
  LEVEL_CRABS,
  LEVEL_HIGHTIDE,
  LEVEL_WRECK,
  LEVEL_DECK,
  LEVEL_UNDERSEA,
  LEVEL_FLOODGATES,
  LEVEL_MASTS,
  LEVEL_REEF,
  LEVEL_SHARKKING,
  // Área 2 (Pradaria dos Ossos).
  LEVEL_ROAD,
  LEVEL_STAMPEDE,
  LEVEL_BONEYARD,
  LEVEL_FARM,
  LEVEL_TALLGRASS,
  LEVEL_CARAVAN,
  LEVEL_WINDMILL,
  LEVEL_GNOLLKING,
  // Área 4 (Caverna das Teias), fases novas.
  LEVEL_WEBBRIDGE,
  LEVEL_DARKCAVE,
  LEVEL_COCOONS,
  LEVEL_WEBGUN,
  LEVEL_EGGS,
  // Área 5 (Forja Vulcânica), fases novas.
  LEVEL_FORGEGATE,
  LEVEL_LAVATIDE,
  LEVEL_GEYSERS,
  LEVEL_FORGEGUN,
  LEVEL_OBSIDIAN,
  LEVEL_ANVIL,
  LEVEL_MAGMA,
  // Área 6 (Bosque dos Gnomos).
  LEVEL_WOODS,
  LEVEL_MUSHROOMS,
  LEVEL_TREETOPS,
  LEVEL_LOGRIVER,
  LEVEL_ACORNGUN,
  LEVEL_MOSS,
  LEVEL_GNOMEVILLAGE,
  LEVEL_GNOMEKING,
  // Área 7 (Minas dos Goblins).
  LEVEL_MINEENTRY,
  LEVEL_CAVEIN,
  LEVEL_DARKMINE,
  LEVEL_GOLDVEIN,
  LEVEL_DYNAMITE,
  LEVEL_FLOODED,
  LEVEL_BLUEFIRE,
  LEVEL_TREASURY,
  LEVEL_GOBLINKING,
  // Área 3 (Lagoa dos Lagartos).
  LEVEL_SWAMPEDGE,
  LEVEL_LILYPADS,
  LEVEL_SWAMPTIDE,
  LEVEL_POISONMARSH,
  LEVEL_FISHERMAN,
  LEVEL_DEEPLAGOON,
  LEVEL_SWAMPGUN,
  LEVEL_MANGROVE,
  LEVEL_LIZARDVILLAGE,
  LEVEL_LIZARDKING,
  // Área 8 (Céu de Brasa).
  LEVEL_EMBERCLOUDS,
  LEVEL_METEOR,
  LEVEL_EMBERGUN,
  LEVEL_FIREWINDS,
  LEVEL_CLOUDCASTLE,
  LEVEL_EMBERBEES,
  LEVEL_SKYKEY,
  // Área 9 (Reino das Asas).
  LEVEL_WINGSGATE,
  LEVEL_SKYROUTE,
  LEVEL_WINGCASTLE,
  LEVEL_STORMFLIGHT,
  LEVEL_WINGKEY,
  LEVEL_WINGWINDS,
  LEVEL_DUSKFLIGHT,
  LEVEL_WINGGUN,
  LEVEL_WINGGUARD,
  // Secretas (sempre no fim).
  LEVEL_RETRO,
  LEVEL_HOLLOW,
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
  /** Opacidade base de cada camada de ondas (a cintilação varia em cima disso). */
  private waveAlpha: [number, number] = [0.55, 0.3];
  private crest?: Phaser.GameObjects.TileSprite;
  /** Linhas d'água onduladas (atrás e na frente dos personagens). */
  private waterTops: Phaser.GameObjects.TileSprite[] = [];
  private lavaBody?: Phaser.GameObjects.TileSprite;
  private lavaTop: Phaser.GameObjects.TileSprite[] = [];
  private cloudSpan = 0;
  /** Fases de fuga: o chão desaba coluna por coluna (guardamos as peças de cada coluna). */
  private readonly collapsible: boolean;
  private colObjs = new Map<number, Array<Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>>();
  private home = new Map<Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, [number, number]>();
  private solidZones: Phaser.GameObjects.Zone[] = [];
  private origSegments: Segment[] = [];
  private origFloats: Segment[] = [];
  /** Colunas (tiles globais) à esquerda disto já caíram; até shakingBefore estão tremendo. */
  collapsedBefore = 0;
  shakingBefore = 0;
  /** Maré: quanto a água subiu (px). Tudo o que é água acompanha. */
  tide = 0;
  /** Camadas de água e a altura de cada uma com a maré em zero. */
  private waterLayers: Array<{ o: Phaser.GameObjects.Components.Transform; y: number }> = [];

  /** Superfície da água agora (com a maré). */
  get waterY(): number {
    return WATER_Y - this.tide;
  }
  /** Pés abaixo disto = caiu na água. */
  get deathY(): number {
    return DEATH_Y - this.tide;
  }

  constructor(private scene: Phaser.Scene, def: LevelDef) {
    this.def = def;
    this.width = def.screens.length * W;
    this.ground = scene.physics.add.staticGroup();
    const glob = (list: Segment[] | undefined, i: number) =>
      (list ?? []).map(([a, n, h]) => [a + i * SCREEN_TILES, n, h ?? 0] as Segment);
    this.segments = def.screens.flatMap((s, i) => glob(s.segments, i));
    this.floats = def.screens.flatMap((s, i) => glob(s.floats, i));
    this.collapsible = !!def.chase;
    this.origSegments = this.segments.map((x) => [...x] as Segment);
    this.origFloats = this.floats.map((x) => [...x] as Segment);
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
    const t = Math.round(this.tide);
    for (const l of this.waterLayers) l.o.y = l.y - t;
    for (const c of this.clouds) {
      c.img.x += c.speed * dt;
      if (c.img.x > this.cloudSpan) c.img.x = -600;
    }
    if (this.waves.length) {
      const camX = this.scene.cameras.main.scrollX;
      const [a, b] = this.waves;
      // Ondas presas ao mar (acompanham a câmera), só balançando e cintilando: as duas camadas
      // trocam de força em contratempo, então as cristas aparecem e somem como água de verdade,
      // em vez de deslizar todas juntas para o lado.
      a.tilePositionX = camX + Math.sin(time / 2300) * 9;
      a.tilePositionY = Math.sin(time / 1300) * 2.5;
      b.tilePositionX = (camX * 0.8) / 1.6 + Math.cos(time / 2900) * 12;
      b.tilePositionY = Math.cos(time / 1700) * 2.5;
      const pulse = 0.5 + 0.5 * Math.sin(time / 1400);
      a.setAlpha(this.waveAlpha[0] * (0.35 + 0.65 * pulse));
      b.setAlpha(this.waveAlpha[1] * (0.35 + 0.65 * (1 - pulse)));
      if (this.crest) this.crest.tilePositionX = camX * 1.1 + Math.sin(time / 1500) * 12;
      // Espuma: duas linhas correndo em sentidos opostos e balançando (em passos de pixel).
      const [ta, tb] = this.waterTops;
      if (ta && tb) {
        ta.tilePositionX = Math.round((camX + Math.sin(time / 1700) * 14) / 2) * 2;
        ta.tilePositionY = Math.round(Math.sin(time / 900) * 1.5) * 2;
        tb.tilePositionX = Math.round((camX * 1.05 + Math.cos(time / 2100) * 16) / 2) * 2;
        tb.tilePositionY = Math.round(Math.cos(time / 1100) * 1.5) * 2;
      }
    }
    if (this.lavaBody) {
      const camX = this.scene.cameras.main.scrollX;
      // Veios fluindo devagar e ondas de calor na crista (em passos de pixel).
      this.lavaBody.tilePositionX = Math.round((camX + time * 0.012) / 2) * 2;
      this.lavaBody.tilePositionY = Math.round(Math.sin(time / 1400) * 4 + time * 0.004);
      const [a, b] = this.lavaTop;
      a.tilePositionX = Math.round((camX * 0.9 - time * 0.03) / 2) * 2;
      a.y = this.waterY - 10 + Math.round(Math.sin(time / 520) * 2) * 2;
      b.tilePositionX = Math.round((camX + time * 0.045) / 2) * 2;
      b.y = this.waterY - 6 + Math.round(Math.cos(time / 610)) * 2;
      const c = this.lavaTop[2];
      if (c) {
        c.tilePositionX = Math.round((camX - time * 0.02) / 2) * 2;
        c.y = this.waterY - 14 + Math.round(Math.sin(time / 480) * 2) * 2;
      }
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
    this.areaBackdrop();
    if (this.hasWater) this.water(t);
    else if (t === 'haunted') this.hauntedVoid();
    else this.cloudSea();
  }

  /**
   * Fundo próprio de cada área (silhuetas em parallax, feitas com sprites do jogo tingidos):
   * colinas e casas na Pradaria, fileiras de árvores no Bosque, árvores mortas e névoa na Lagoa,
   * velas de navio na Maré, escoras de madeira e lanternas nas Minas, teias gigantes nas Teias.
   */
  private areaBackdrop(): void {
    const s = this.scene;
    const tiles = this.def.tiles;
    const span = (f: number) => W + (this.width - W) * f + 200;
    const rng = new Phaser.Math.RandomDataGenerator([`backdrop-${this.def.id}`]);
    const D = DEPTH.clouds + 0.3;
    if (tiles === 'tiles_prairie') {
      const g = s.add.graphics().setScrollFactor(0.15, 1).setDepth(D);
      for (let x = -200; x < span(0.15); x += rng.between(220, 320)) {
        const w = rng.between(320, 520);
        g.fillStyle(0xd8e0a0, 0.3).fillEllipse(x, 480, w, rng.between(150, 220));
      }
      for (let x = 120; x < span(0.3); x += rng.between(420, 620)) {
        s.add.image(x, 452, `bld_yellow_house${1 + rng.between(0, 2)}`).setOrigin(0.5, 1).setScale(0.45).setTint(0x8a8a5a).setAlpha(0.6).setScrollFactor(0.3, 1).setDepth(D + 0.1);
      }
    } else if (tiles === 'tiles_forest') {
      for (const [f, tint, sc, y, a] of [
        [0.2, 0x2f5a4a, 0.7, 470, 0.55],
        [0.4, 0x3f7a4a, 0.95, 490, 0.7],
      ] as const) {
        for (let x = -100; x < span(f); x += rng.between(70, 120)) {
          s.add.sprite(x, y, 'tree').setOrigin(0.5, 1).setScale(sc * rng.realInRange(0.85, 1.15)).setTint(tint).setAlpha(a).setScrollFactor(f, 1).setDepth(D + f).play({ key: 'tree', startFrame: rng.between(0, 7) });
        }
      }
    } else if (tiles === 'tiles_swamp') {
      for (let x = -100; x < span(0.3); x += rng.between(160, 260)) {
        s.add.image(x, 470, 'dead_tree').setOrigin(0.5, 1).setScale(rng.realInRange(0.5, 0.8)).setTint(0x3a5a4a).setAlpha(0.55).setScrollFactor(0.3, 1).setDepth(D);
      }
      for (let i = 0; i < 3; i++) {
        const mist = s.add.rectangle(0, 380 + i * 34, W, 30, 0xd8f0e0, 0.12).setOrigin(0).setScrollFactor(0, 1).setDepth(D + 0.4);
        s.tweens.add({ targets: mist, alpha: 0.04, duration: 2400 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else if (tiles === 'tiles_sand' || tiles === 'tiles_ship') {
      // Velas de navios no horizonte.
      const g = s.add.graphics().setScrollFactor(0.12, 1).setDepth(D);
      for (let x = 160; x < span(0.12); x += rng.between(380, 600)) {
        const h = rng.between(50, 80);
        g.fillStyle(0x5a7a9a, 0.5).fillRect(x - 2, 470 - h, 4, h);
        g.fillStyle(0xe8f0f8, 0.55).fillTriangle(x + 3, 470 - h, x + 3, 462, x + h * 0.6, 462);
        g.fillStyle(0xd0dce8, 0.5).fillTriangle(x - 3, 470 - h + 10, x - 3, 462, x - h * 0.4, 462);
        g.fillStyle(0x6a5a4a, 0.5).fillRect(x - h * 0.45, 462, h * 1.1, 8);
      }
    } else if (tiles === 'tiles_mine') {
      // Escoras de madeira da mina e lanternas penduradas.
      const g = s.add.graphics().setScrollFactor(0.5, 1).setDepth(D);
      for (let x = 60; x < span(0.5); x += 300) {
        g.fillStyle(0x3a2a1a, 0.7).fillRect(x, 120, 16, 360);
        g.fillStyle(0x3a2a1a, 0.7).fillRect(x + 160, 120, 16, 360);
        g.fillStyle(0x4a3420, 0.75).fillRect(x - 10, 110, 196, 20);
        const glow = s.add.image(x + 88, 160, 'aura').setTint(0xffb040).setScale(0.6).setAlpha(0.35).setScrollFactor(0.5, 1).setDepth(D + 0.05).setBlendMode(Phaser.BlendModes.ADD);
        s.tweens.add({ targets: glow, alpha: 0.2, duration: 900 + (x % 400), yoyo: true, repeat: -1 });
        g.fillStyle(0x1d1a2b, 0.8).fillRect(x + 82, 130, 12, 18);
        g.fillStyle(0xffc060, 0.8).fillRect(x + 84, 133, 8, 12);
      }
    } else if (this.def.theme === 'cave' && tiles === 'tiles_cave' && !this.def.undersea) {
      for (let x = 100; x < span(0.35); x += rng.between(380, 560)) {
        s.add.image(x, rng.between(60, 140), 'web_px').setScale(rng.realInRange(1.6, 2.4)).setTint(0x9fc6cc).setAlpha(0.12).setScrollFactor(0.35, 1).setDepth(D);
      }
    }
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
    const ember = !!this.def.ember;
    s.add.rectangle(0, -500, W, 500, ember ? 0xc8503a : high ? 0x7fd3ff : 0x59e3b5).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    const bg = s.add.image(0, 0, high ? 'sky_high' : 'sky').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.sky);
    if (ember) {
      // Céu de Brasa: o céu inteiro em brasa, com fagulhas subindo.
      bg.setTint(0xff9a7a, 0xff9a7a, 0xffc08a, 0xffc08a);
      // Degradê de brasa por cima do céu: vermelho no alto, laranja perto das nuvens.
      s.add.graphics().setScrollFactor(0, 1).setDepth(DEPTH.sky + 0.1).fillGradientStyle(0xb8281a, 0xb8281a, 0xff8a3a, 0xff8a3a, 0.62, 0.62, 0.45, 0.45).fillRect(0, -500, W, 1300);
      s.add
        .particles(0, 0, 'spark', {
          x: { min: 0, max: W },
          y: { min: 500, max: 720 },
          speedY: { min: -80, max: -40 },
          speedX: { min: -10, max: 20 },
          lifespan: 5000,
          scale: { start: 0.3, end: 0 },
          tint: [0xffe066, 0xff7a1a, 0xff4a2a],
          alpha: { start: 0.9, end: 0 },
          frequency: 140,
        })
        .setScrollFactor(0, 1)
        .setDepth(DEPTH.clouds + 0.2);
    }

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
      if (ember) img.setTint(0xffb090);
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
    const swamp = !!this.def.swamp;
    const body = lava ? 0xe8501f : swamp ? 0x3a6a4a : dark ? 0x1d5d6b : 0x39b5fd;
    // Tudo o que é criado aqui com rolagem só no Y é "água" e sobe/desce com a maré.
    const before = new Set(s.children.list);
    const edge = lava ? 0xffd36b : swamp ? 0x8ac89a : dark ? 0x5fa9b5 : 0x8fd9ff;
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
    this.waveAlpha = dark ? [0.3, 0.18] : [0.6, 0.38];
    if (!lava) {
      // Profundidade em degradê, espuma ondulada na superfície e brilhos de sol piscando.
      s.add.image(0, WATER_Y, 'water_grad').setOrigin(0).setDisplaySize(W, 300).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(dark ? 0.6 : 1);
      this.waterTops = [
        s.add.tileSprite(0, WATER_Y - 12, W, 28, 'water_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setTint(edge).setAlpha(0.9),
        s.add.tileSprite(0, WATER_Y + 2, W, 28, 'water_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.52).setAlpha(dark || swamp ? 0.5 : 0.85).setTint(dark || swamp ? edge : 0xffffff),
      ];
      const glints = dark ? 8 : 16;
      for (let i = 0; i < glints; i++) {
        const gl = s.add
          .rectangle(Phaser.Math.Between(0, W), WATER_Y + Phaser.Math.Between(26, 170), Phaser.Math.Between(8, 22), 3, 0xffffff)
          .setScrollFactor(0, 1)
          .setDepth(DEPTH.water)
          .setAlpha(0);
        s.tweens.add({
          targets: gl,
          alpha: dark || swamp ? 0.35 : 0.75,
          scaleX: 1.6,
          duration: Phaser.Math.Between(500, 900),
          delay: Phaser.Math.Between(0, 3000),
          yoyo: true,
          repeat: -1,
          repeatDelay: Phaser.Math.Between(600, 2600),
          onRepeat: () => (gl.x = Phaser.Math.Between(0, W)),
        });
      }
    }
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
      // Maré de lava: crista de lava na frente do cenário (a lava subindo fica bem visível).
      if (this.def.sea?.tide) {
        this.lavaTop.push(s.add.tileSprite(0, WATER_Y - 14, W, 32, 'lava_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.55));
      }
      this.trackWater(before);
      s.time.addEvent({
        delay: 140,
        loop: true,
        callback: () => {
          const b = s.add
            .sprite(Phaser.Math.Between(0, W), this.waterY + Phaser.Math.Between(0, 60), 'lava_bubble', 0)
            .setOrigin(0.5, 1)
            .setScrollFactor(0, 1)
            .setDepth(DEPTH.water);
          b.play('lava_bubble');
          b.once('animationcomplete', () => b.destroy());
        },
      });
      return;
    }
    // Fases com maré: crista de ondas na frente do cenário (a água subindo fica bem visível).
    if (this.def.sea?.tide) {
      const crest = lava
        ? s.add.tileSprite(0, WATER_Y - 14, W, 32, 'lava_top').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.55)
        : s.add.tileSprite(0, WATER_Y - 6, W, 22, 'waves').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.55).setAlpha(0.75);
      if (!lava) s.add.rectangle(0, WATER_Y - 2, W, 4, 0xe8f8ff).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.56).setAlpha(0.85);
      s.add.rectangle(0, WATER_Y + 2, W, H, body).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.fighters + 0.54).setAlpha(0.32);
      this.crest = crest;
    }
    this.trackWater(before);
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

  /** Guarda as camadas de água criadas desde `before` (para a maré mover). */
  private trackWater(before: Set<Phaser.GameObjects.GameObject>): void {
    for (const o of this.scene.children.list) {
      if (before.has(o) || !o.active) continue;
      const t = o as unknown as Phaser.GameObjects.Components.Transform;
      if (typeof t.y === 'number' && !this.waterLayers.some((l) => l.o === t)) this.waterLayers.push({ o: t, y: t.y });
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
        if (this.def.ember) img.setTint(0xff9a6a);
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
      if (this.hasWater && !this.collapsible) {
        for (let i = 0; i < n; i++) {
          const foam = s.add
            .sprite((start + i) * TILE + TILE / 2, GRASS_Y + TILE + 28, 'water_foam')
            .setDepth(DEPTH.waterRocks)
            .setTint(this.theme === 'cave' ? 0x9fc6cc : this.isLava ? 0xff8c3a : 0xffffff)
            .play({ key: 'water_foam', startFrame: (start + i) % 16 });
          this.reg(start + i, foam);
        }
      }
      for (let i = 0; i < n; i++) {
        const col = n === 1 ? 8 : i === 0 ? 5 : i === n - 1 ? 7 : 6;
        const x = (start + i) * TILE;
        this.reg(start + i, s.add.image(x, gy, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint));
        // Rocha até a base (a última fileira tem a borda com espuma).
        for (let r = 1; r <= h + 1; r++) {
          const row = r === h + 1 ? 5 : 4;
          this.reg(start + i, s.add.image(x, gy + r * TILE, key, row * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint));
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
          this.reg(start + i, s.add.image((start + i) * TILE, top - 40, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain).setTint(this.rockTint));
        }
      }
      this.addFloatZone(start, n, h);
    }

    this.def.screens.forEach((sc, i) => {
      for (const [tile, kind] of sc.deco ?? []) {
        const x = this.tileX(i, tile);
        this.addDeco(x, kind, tile, this.groundY(x) ?? FLOOR_Y);
      }
      // Prédios extras do reino (quartel, arquearia, mosteiro, castelo...) em algumas fases:
      // vão no trecho de chão mais largo do cenário, se couberem.
      for (const [scr, kind] of EXTRA_BUILDINGS[this.def.id] ?? []) {
        if (scr !== i) continue;
        const need = kind === 'castle' ? 6 : 4;
        const spot = this.segments
          .filter(([a, n]) => Math.floor(a / 20) === i && n >= need)
          .sort((p, q) => q[1] - p[1])[0];
        if (!spot) continue;
        const [a, n, h] = spot;
        const taken = new Set((sc.deco ?? []).map(([t]) => t));
        // Longe da placa e das outras decorações: ponta direita ou esquerda do trecho.
        const right = a - i * 20 + n - need / 2 - 0.5;
        const left = a - i * 20 + need / 2 - 0.5;
        const tile = [...taken].some((t) => Math.abs(t - right) < 3) || (sc.sign && Math.abs(sc.sign[0] - right) < 3) ? left : right;
        this.addDeco(this.tileX(i, tile), kind, tile | 0, FLOOR_Y - (h ?? 0) * TILE);
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
    this.solidZones.push(zone);
  }

  private addFloatZone(start: number, n: number, h: number): void {
    const top = topOf(h);
    const w = n * TILE;
    const zone = this.scene.add.zone(start * TILE + w / 2, top + 7, w, 14);
    this.scene.physics.add.existing(zone, true);
    const body = zone.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    this.ground.add(zone);
    this.solidZones.push(zone);
  }

  /** Guarda uma peça do desenho na sua coluna (para desabar junto). */
  private reg(col: number, o: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite): void {
    if (!this.collapsible) return;
    const list = this.colObjs.get(col) ?? [];
    list.push(o);
    this.colObjs.set(col, list);
    this.home.set(o, [o.x, o.y]);
  }

  /** As colunas até `col` (exclusive) começam a tremer: aviso de que vão cair. */
  shakeTo(col: number): void {
    for (let c = this.shakingBefore; c < col; c++) {
      for (const o of this.colObjs.get(c) ?? []) {
        const [hx] = this.home.get(o)!;
        this.scene.tweens.add({ targets: o, x: { from: hx - 2, to: hx + 2 }, duration: 55, yoyo: true, repeat: -1 });
      }
    }
    this.shakingBefore = Math.max(this.shakingBefore, col);
  }

  /**
   * As colunas até `col` (exclusive) desabam: as peças caem girando na lava e a colisão some.
   * Devolve o x central das colunas que caíram agora (para poeira e pedrinhas).
   */
  collapseTo(col: number): number[] {
    const fallen: number[] = [];
    for (let c = this.collapsedBefore; c < col; c++) {
      const objs = this.colObjs.get(c) ?? [];
      if (objs.length) fallen.push(c * TILE + TILE / 2);
      objs.forEach((o, k) => {
        this.scene.tweens.killTweensOf(o);
        this.scene.tweens.add({
          targets: o,
          y: o.y + 420,
          angle: Phaser.Math.Between(-35, 35),
          alpha: 0,
          duration: 900 + k * 40,
          ease: 'Quad.easeIn',
          onComplete: () => o.setVisible(false),
        });
      });
    }
    if (col > this.collapsedBefore) {
      this.collapsedBefore = col;
      this.shakingBefore = Math.max(this.shakingBefore, col);
      this.rebuildSolids();
    }
    return fallen;
  }

  /** Renascimento: tudo a partir da coluna `col` volta ao lugar (o resto continua caído). */
  restoreFrom(col: number): void {
    for (const [c, objs] of this.colObjs) {
      if (c < col) continue;
      for (const o of objs) {
        this.scene.tweens.killTweensOf(o);
        const [hx, hy] = this.home.get(o)!;
        o.setPosition(hx, hy).setAngle(0).setAlpha(1).setVisible(true);
      }
    }
    this.collapsedBefore = Math.min(this.collapsedBefore, col);
    this.shakingBefore = this.collapsedBefore;
    this.rebuildSolids();
  }

  /** Recria a colisão do chão só nas colunas que ainda estão de pé. */
  private rebuildSolids(): void {
    for (const z of this.solidZones) z.destroy();
    this.solidZones = [];
    const clip = (list: Segment[]) =>
      list
        .map(([a, n, h]) => {
          const a2 = Math.max(a, this.collapsedBefore);
          return [a2, a + n - a2, h ?? 0] as Segment;
        })
        .filter(([, n]) => n > 0);
    // Junta pedaços vizinhos de mesma altura (evita "degraus" invisíveis entre colisões).
    const merge = (list: Segment[]) =>
      list.reduce<Segment[]>((acc, seg) => {
        const last = acc[acc.length - 1];
        if (last && last[0] + last[1] === seg[0] && (last[2] ?? 0) === (seg[2] ?? 0)) last[1] += seg[1];
        else acc.push([...seg] as Segment);
        return acc;
      }, []);
    const segs = merge(clip(this.origSegments));
    const fls = clip(this.origFloats);
    this.segments.splice(0, this.segments.length, ...segs);
    this.floats.splice(0, this.floats.length, ...fls);
    for (const [a, n, h] of segs) this.addSolid(a, n, h ?? 0);
    for (const [a, n, h] of fls) this.addFloatZone(a, n, h ?? 0);
  }

  /**
   * Nuvem encantada pelo Xamã (fase do céu): a única que aguenta peso. Lilás, com borda de
   * magia, runas que pulsam e faíscas subindo, bem diferente das nuvens brancas de enfeite.
   */
  private enchantedCloud(start: number, n: number, top: number, bottom: number): void {
    const s = this.scene;
    // No Céu de Brasa, as nuvens encantadas ficam em tons de brasa.
    const EMBER: Record<number, number> = { 0xb27cff: 0xff5a2a, 0xb9a6ee: 0xe8907a, 0xf4eeff: 0xffe8d8, 0xd7c8ff: 0xffc8b0, 0x9b6bf0: 0xd84a3a, 0xa86bff: 0xd84a2a, 0xe3c8ff: 0xffd0a0 };
    const c = (col: number) => (this.def.ember ? (EMBER[col] ?? col) : col);
    const x0 = start * TILE;
    const w = n * TILE;
    const g = s.add.graphics().setDepth(DEPTH.terrain);
    const hgt = bottom - top;
    g.fillStyle(c(0xb27cff), 0.22).fillRoundedRect(x0 - 8, top - 18, w + 16, hgt + 30, 26);
    g.fillStyle(c(0xb9a6ee), 1).fillRoundedRect(x0, top - 6, w, hgt + 6, 20);
    g.fillStyle(c(0xf4eeff), 1).fillRoundedRect(x0 + 3, top - 10, w - 6, hgt - 4, 18);
    // Bordas fofas em cima e embaixo.
    for (let x = x0 + 16; x <= x0 + w - 16; x += 24) {
      g.fillStyle(0xffffff, 1).fillCircle(x, top - 6, 13 + ((x / 24) % 2) * 3);
      g.fillStyle(c(0xd7c8ff), 1).fillCircle(x + 6, bottom - 4, 12);
    }
    g.lineStyle(3, c(0x9b6bf0), 0.9).strokeRoundedRect(x0, top - 14, w, hgt + 10, 20);
    g.lineStyle(2, 0xffffff, 0.9).lineBetween(x0 + 14, top - 2, x0 + w - 14, top - 2);
    // Runas do Xamã no meio da nuvem, pulsando.
    const runes = s.add.graphics().setDepth(DEPTH.terrain + 0.1);
    const ry = top + Math.min(hgt * 0.45, 40);
    for (let x = x0 + 28; x <= x0 + w - 24; x += 48) {
      runes.lineStyle(2.5, c(0xa86bff), 1);
      runes.strokeTriangle(x - 7, ry + 6, x + 7, ry + 6, x, ry - 8);
      runes.fillStyle(c(0xe3c8ff), 1).fillCircle(x, ry + 1, 2.5);
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
      case 'gold':
        // Pedra de ouro (recursos do Tiny Swords): decoração da mina.
        s.add.image(x, base + 30, 'gold_stone_big').setOrigin(0.5, 1).setScale(0.7).setDepth(DEPTH.deco);
        break;
      case 'bush':
        // Arbustos animados do Free Pack.
        s.add.sprite(x, base + 44, `bush${1 + (seed % 4)}`).setOrigin(0.5, 1).setScale(0.75).setDepth(DEPTH.deco).setTint(tint).play({ key: `bush${1 + (seed % 4)}`, startFrame: seed % 8 });
        break;
      case 'stone':
        s.add.image(x, base + 14, `stone${1 + (seed % 4)}`).setOrigin(0.5, 1).setScale(0.9).setDepth(DEPTH.deco).setTint(tint);
        break;
      case 'house':
      case 'hut':
      case 'tower':
      case 'castle':
      case 'monastery':
      case 'barracks':
      case 'archery': {
        // Construções do Free Pack ao fundo, na cor do reino da área, assentadas no chão
        // (a base do desenho fica na linha da grama, com uma sombra embaixo).
        const color = BUILDING_COLOR[this.def.tiles ?? 'tilemap'] ?? 'blue';
        const name = kind === 'house' || kind === 'hut' ? `house${1 + (seed % 3)}` : kind;
        const img = s.add.image(x, 0, `bld_${kind === 'tower' && color === 'blue' ? 'black' : color}_${name}`);
        const foot = BUILDING_FOOT[name] ?? 0.9;
        const sc = kind === 'castle' ? 0.95 : 0.85;
        s.add.ellipse(x, ground + 2, img.width * sc * 0.8, 18, 0x10223a, 0.22).setDepth(DEPTH.deco - 0.25);
        img.setOrigin(0.5, foot).setPosition(x, ground + 6).setScale(sc).setDepth(DEPTH.deco - 0.2).setTint(tint);
        break;
      }
      default:
        s.add.image(x, base + 8, kind).setOrigin(0.5, 1).setDepth(DEPTH.deco).setTint(tint);
    }
  }
}
