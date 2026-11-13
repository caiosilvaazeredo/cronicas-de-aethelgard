import { LEVELS } from './level';
import { getPact, hasPact, isDone, isFreePlay } from './progress';

/**
 * O mundo é dividido em áreas em volta de uma ilha central (o Santuário do Xamã).
 * Cada área tem as suas fases e um rei no fim. O Xamã diz que cada rei guarda um fragmento da
 * Coroa dos Ossos; na verdade cada rei é um selo da prisão dele (só revelado no final).
 *
 * Liberação: Ilhas da Maré e depois Pradaria dos Ossos (fixas, ensinam o básico); vencida a
 * Pradaria, as outras áreas abrem em qualquer ordem. O reino das abelhas ou dos morcegos só
 * aparece depois do acordo com os Príncipes. A ilha central abre quando todas as áreas caem.
 */
export interface AreaDef {
  id: string;
  name: string;
  /** Frase curta da área (contada pelo Xamã, com a versão "oficial" da história). */
  blurb: string;
  king: string;
  /** Sprite (animação) do rei, mostrado no mapa do mundo. */
  kingAnim: string;
  /** Cor da área (bandeira, contorno e trilha). */
  color: number;
  /** Fases, em ordem (ids de LEVELS). A última é a do rei. */
  levels: string[];
  /** Posição no mapa do mundo (1280×720). */
  pos: [number, number];
  unlock: 'start' | 'after-mare' | 'after-pradaria' | 'pact' | 'all';
}

/** Meta de fases por área (as que faltam aparecem como "em construção" no mapa da área). */
export const AREA_GOAL = 10;

export const AREAS: AreaDef[] = [
  {
    id: 'mare',
    name: 'Ilhas da Maré',
    blurb: 'A praia onde a caveira desperta. O Tubarão-Arpão guarda o primeiro fragmento.',
    king: 'Rei Tubarão-Arpão',
    kingAnim: 'shark_idle',
    color: 0x2f86e0,
    levels: ['shore', 'crabs', 'hightide', 'wreck', 'deck', 'undersea', 'floodgates', 'masts', 'reef', 'sharkking'],
    pos: [210, 490],
    unlock: 'start',
  },
  {
    id: 'pradaria',
    name: 'Pradaria dos Ossos',
    blurb: 'Campos de capim e ossos antigos. Os Gnolls caçam em bando.',
    king: 'Rei Gnoll',
    kingAnim: 'gnoll_idle',
    color: 0xd8a530,
    levels: ['road', 'key1', 'stampede', 'gun1', 'boneyard', 'farm', 'tallgrass', 'caravan', 'windmill', 'gnollking'],
    pos: [170, 300],
    unlock: 'after-mare',
  },
  {
    id: 'lagoa',
    name: 'Lagoa dos Lagartos',
    blurb: 'Um pântano morno de água verde. Lá no meio, o Rei Lagarto nunca dorme.',
    king: 'Rei Lagarto',
    kingAnim: 'lizard_idle',
    color: 0x58b947,
    levels: ['swampedge', 'lilypads', 'swamptide', 'poisonmarsh', 'fisherman', 'deeplagoon', 'swampgun', 'mangrove', 'lizardvillage', 'lizardking'],
    pos: [430, 205],
    unlock: 'after-pradaria',
  },
  {
    id: 'teias',
    name: 'Caverna das Teias',
    blurb: 'Túneis cobertos de teia. No fundo, a Aranha-Rainha e o ninho dos Príncipes.',
    king: 'Aranha-Rainha',
    kingAnim: 'spider_idle',
    color: 0x8a6ad0,
    levels: ['cave', 'nest', 'webbridge', 'key2', 'darkcave', 'cocoons', 'webgun', 'princes', 'eggs', 'queen'],
    pos: [470, 505],
    unlock: 'after-pradaria',
  },
  {
    id: 'forja',
    name: 'Forja Vulcânica',
    blurb: 'A montanha de fogo onde o Minotauro Rubro martela a lava.',
    king: 'Minotauro Rubro',
    kingAnim: 'minotaur_idle',
    color: 0xe0542e,
    levels: ['forgegate', 'chase', 'key3', 'lavatide', 'geysers', 'forgegun', 'obsidian', 'anvil', 'magma', 'volcano'],
    pos: [860, 505],
    unlock: 'after-pradaria',
  },
  {
    id: 'bosque',
    name: 'Bosque dos Gnomos',
    blurb: 'Árvores velhas, cogumelos e portões que só abrem com peso. O Rei Gnomo não gosta de visitas.',
    king: 'Rei Gnomo',
    kingAnim: 'sgnome_idle',
    color: 0x3f9a5a,
    levels: ['woods', 'key4', 'mushrooms', 'treetops', 'key5', 'logriver', 'acorngun', 'moss', 'gnomevillage', 'gnomeking'],
    pos: [1085, 455],
    unlock: 'after-pradaria',
  },
  {
    id: 'minas',
    name: 'Minas dos Goblins',
    blurb: 'Túneis de ouro iluminados por tochas. O Rei Goblin conta cada pepita.',
    king: 'Rei Goblin da Tocha',
    kingAnim: 'torchgob_idle',
    color: 0xc8823a,
    levels: ['mineentry', 'gun2', 'cavein', 'darkmine', 'goldvein', 'dynamite', 'flooded', 'bluefire', 'treasury', 'goblinking'],
    pos: [1100, 255],
    unlock: 'after-pradaria',
  },
  {
    id: 'ceu',
    name: 'Céu de Brasa',
    blurb: 'Ilhas de nuvem e ventos fortes. O Diabrete Gigante quer o céu só para ele.',
    king: 'Diabrete Gigante',
    kingAnim: 'imp_idle',
    color: 0xd84a3a,
    levels: ['sky', 'emberclouds', 'winds', 'meteor', 'embergun', 'firewinds', 'cloudcastle', 'emberbees', 'skykey', 'plane'],
    pos: [900, 128],
    unlock: 'after-pradaria',
  },
  {
    id: 'reino',
    name: 'Reino das Asas',
    blurb: 'O reino inimigo do teu aliado. Só se abre depois do acordo com os Príncipes.',
    king: 'Rei das Asas',
    kingAnim: 'bat_idle',
    color: 0x2f4fb8,
    levels: ['flight'],
    pos: [640, 118],
    unlock: 'pact',
  },
];

/** A ilha central: o Santuário do Xamã. É o caminho para o final. */
export const CENTER: AreaDef = {
  id: 'centro',
  name: 'Santuário do Xamã',
  blurb: 'A ilha de Hex, no meio de tudo. O Portão da Maré espera a coroa inteira.',
  king: 'Xamã Hex',
  kingAnim: 'shaman_idle',
  color: 0x9b6bf0,
  levels: ['stairs', 'mausoleum', 'doors', 'library', 'dark', 'finale'],
  pos: [640, 345],
  unlock: 'all',
};

export const ALL_AREAS: AreaDef[] = [...AREAS, CENTER];

/** Nome e rei do reino das asas mudam conforme o acordo. */
export function areaTitle(a: AreaDef): { name: string; king: string; kingAnim: string; color: number } {
  if (a.id !== 'reino' || !hasPact()) return a;
  // Com o morcego aliado, a caveira vai atrás do Rei das Abelhas (e vice-versa).
  return getPact() === 'bat'
    ? { name: 'Colmeia Real', king: 'Rei das Abelhas', kingAnim: 'king_bee_idle', color: 0xb0306a }
    : { name: 'Reino da Noite', king: 'Rei dos Morcegos', kingAnim: 'king_bat_idle', color: 0xa01e30 };
}

export const areaById = (id: string): AreaDef | undefined => ALL_AREAS.find((a) => a.id === id);

/** Área de uma fase (pelo índice em LEVELS). */
export function areaOfLevel(index: number): AreaDef | undefined {
  const id = LEVELS[index]?.id;
  return ALL_AREAS.find((a) => a.levels.includes(id));
}

export const levelIndex = (id: string): number => LEVELS.findIndex((l) => l.id === id);

/** Todas as fases da área concluídas (o selo do rei foi quebrado). */
export function areaCleared(a: AreaDef): boolean {
  return a.levels.length > 0 && a.levels.every((id) => isDone(id));
}

export function areaUnlocked(a: AreaDef): boolean {
  if (isFreePlay()) return true;
  const mare = areaById('mare')!;
  const pradaria = areaById('pradaria')!;
  switch (a.unlock) {
    case 'start':
      return true;
    case 'after-mare':
      return areaCleared(mare);
    case 'after-pradaria':
      return areaCleared(pradaria);
    case 'pact':
      return hasPact() && areaCleared(pradaria);
    case 'all':
      return AREAS.filter((x) => x.levels.length > 0).every(areaCleared);
  }
}

/** Fase liberada: a área está aberta e a anterior da área foi concluída. */
export function levelUnlocked(a: AreaDef, i: number): boolean {
  if (!areaUnlocked(a)) return false;
  if (isFreePlay() || i === 0) return true;
  return isDone(a.levels[i - 1]);
}

/** Quantos selos (reis) já caíram. */
export function sealsBroken(): number {
  return AREAS.filter(areaCleared).length;
}
