export type CharId = 'skull' | 'lizard' | 'gnoll' | 'shark' | 'goblin';
export type ItemId = 'bone' | 'harpoon' | 'spear' | 'crest';

interface AnimDef {
  n: number;
  fps: number;
}

export interface MeleeDef {
  /** Primeiro e último quadro (índice) em que o golpe acerta. */
  from: number;
  to: number;
  /** Alcance à frente e atrás do centro do personagem, em px. */
  reach: number;
  back: number;
}

export interface ProjectileDef {
  /** Quadro da animação em que o projétil sai da mão. */
  release: number;
  tex: string;
  speed: number;
  /** Ângulo base do sprite apontando para a direita. */
  angle: number;
  spin: boolean;
}

export interface CharDef {
  id: CharId;
  name: string;
  /** Tamanho do quadro (quadrado) na spritesheet. */
  frame: number;
  /** Y (dentro do quadro) onde ficam os pés. */
  feetY: number;
  idle: AnimDef;
  run: AnimDef;
  attack: AnimDef;
  /** Animação própria de defesa (só o esqueleto tem). */
  guard?: AnimDef;
  speed: number;
  melee?: MeleeDef;
  projectile?: ProjectileDef;
  /** Item que este personagem solta ao morrer (quando é uma transformação). */
  drops?: ItemId;
}

export const CHARS: Record<CharId, CharDef> = {
  skull: {
    id: 'skull',
    name: 'Esqueleto',
    frame: 192,
    feetY: 126,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 7, fps: 18 },
    guard: { n: 7, fps: 10 },
    speed: 240,
    melee: { from: 2, to: 4, reach: 80, back: 0 },
  },
  lizard: {
    id: 'lizard',
    name: 'Lagarto',
    frame: 192,
    feetY: 148,
    idle: { n: 7, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 9, fps: 16 },
    speed: 235,
    melee: { from: 2, to: 6, reach: 72, back: 64 },
    drops: 'crest',
  },
  gnoll: {
    id: 'gnoll',
    name: 'Gnoll',
    frame: 192,
    feetY: 131,
    idle: { n: 6, fps: 10 },
    run: { n: 8, fps: 14 },
    attack: { n: 8, fps: 16 },
    speed: 225,
    projectile: { release: 5, tex: 'bone', speed: 520, angle: 0, spin: true },
    drops: 'bone',
  },
  shark: {
    id: 'shark',
    name: 'Tubarão-Arpão',
    frame: 192,
    feetY: 132,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 8, fps: 16 },
    speed: 245,
    projectile: { release: 3, tex: 'harpoon', speed: 680, angle: 45, spin: false },
    drops: 'harpoon',
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin Lanceiro',
    frame: 256,
    feetY: 172,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 7, fps: 16 },
    speed: 230,
    melee: { from: 2, to: 4, reach: 112, back: 70 },
    drops: 'spear',
  },
};

/** Pegar o item transforma no personagem correspondente. */
export const ITEM_TO_CHAR: Record<ItemId, CharId> = {
  bone: 'gnoll',
  harpoon: 'shark',
  spear: 'goblin',
  crest: 'lizard',
};

export const ITEM_TEXTURE: Record<ItemId, string> = {
  bone: 'bone',
  harpoon: 'harpoon',
  spear: 'spear_item',
  crest: 'crest_item',
};
