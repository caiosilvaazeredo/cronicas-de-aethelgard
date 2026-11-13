export type CharId =
  | 'skull' | 'lizard' | 'gnoll' | 'shark' | 'goblin' // fase 1
  | 'spider' | 'bat' | 'torchgob' // fase 2 (caverna)
  | 'imp' | 'minotaur' // fase 3 (vulcão)
  | 'bee' | 'sgnome' // fase 4 (céu)
  | 'villager'; // final: a forma humana da caveira (aldeão do Free Pack)
/** Variantes de inimigos (src/game/variants.ts): paleta, tamanho, acessórios e habilidade. */
export type VariantId =
  | 'shark_hammer' | 'shark_coral' | 'shark_elite'
  | 'lizard_sand' | 'lizard_tide'
  | 'goblin_pirate' | 'goblin_captain' | 'goblin_bomber'
  | 'gnoll_wreck'
  | 'gnoll_hunter' | 'gnoll_stalker' | 'gnoll_brute'
  | 'spider_jumper' | 'spider_web' | 'spider_widow' | 'bat_vampire';
/** Quem pode aparecer como inimigo numa fase. */
export type EnemyId = CharId | VariantId;
export type ItemId =
  | 'bone' | 'harpoon' | 'spear' | 'crest'
  | 'web' | 'wing' | 'torch'
  | 'honey' | 'ember' | 'acorn' | 'horn';

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
  /** Item em que o projétil vira ao cair no chão. */
  item?: ItemId;
  /** Arco: velocidade inicial para cima e gravidade. */
  arc?: { vy: number; g: number };
}

export interface CharDef {
  id: CharId;
  /** Variante de inimigo: o personagem original (para regras como o salto do tubarão). */
  base?: CharId;
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
  /** Ataque montado de várias folhas (ex.: início, repetição, fim). */
  attackSheets?: Array<{ key: string; n: number }>;
  /** Altura da cabeça acima dos pés (etiqueta e aura). */
  head: number;
  /** Voa (segurando pular no ar) por até este tempo, em ms, no lugar do pulo duplo. */
  fly?: number;
  /** Gruda nas paredes e sobe sozinho. */
  climb?: boolean;
  /** Nada (passiva): não morre na água, boia, mergulha e salta para fora. */
  swim?: boolean;
  /** Passiva: ao acionar a corrida, dá um dash (arrancada rápida). */
  dash?: boolean;
  speed: number;
  melee?: MeleeDef;
  projectile?: ProjectileDef;
  /** Item que este personagem solta ao morrer (quando é uma transformação). */
  drops?: ItemId;
}

export const CHARS: Record<CharId, CharDef> = {
  skull: {
    id: 'skull',
    head: 72,
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
  villager: {
    id: 'villager',
    head: 74,
    name: 'Aldeão',
    frame: 192,
    feetY: 134,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 4, fps: 12 },
    speed: 245,
    melee: { from: 1, to: 2, reach: 78, back: 10 },
  },
  lizard: {
    id: 'lizard',
    head: 118,
    name: 'Lagarto',
    frame: 192,
    feetY: 148,
    idle: { n: 7, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 9, fps: 16 },
    speed: 235,
    melee: { from: 2, to: 6, reach: 72, back: 64 },
    swim: true,
    drops: 'crest',
  },
  gnoll: {
    id: 'gnoll',
    head: 76,
    name: 'Gnoll',
    frame: 192,
    feetY: 131,
    idle: { n: 6, fps: 10 },
    run: { n: 8, fps: 14 },
    attack: { n: 8, fps: 16 },
    speed: 225,
    projectile: { release: 5, tex: 'bone', speed: 520, angle: 0, spin: true, item: 'bone', arc: { vy: -150, g: 430 } },
    drops: 'bone',
  },
  shark: {
    id: 'shark',
    head: 76,
    name: 'Tubarão-Arpão',
    frame: 192,
    feetY: 132,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 8, fps: 16 },
    speed: 245,
    projectile: { release: 3, tex: 'harpoon', speed: 680, angle: 45, spin: false, item: 'harpoon', arc: { vy: -30, g: 110 } },
    drops: 'harpoon',
  },
  goblin: {
    id: 'goblin',
    head: 108,
    name: 'Goblin Lanceiro',
    frame: 256,
    feetY: 172,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 7, fps: 16 },
    speed: 230,
    melee: { from: 2, to: 4, reach: 112, back: 70 },
    drops: 'spear',
    dash: true,
  },
  // ---------- Fase 2: caverna ----------
  spider: {
    id: 'spider',
    head: 80,
    name: 'Aranha',
    frame: 192,
    feetY: 133,
    idle: { n: 8, fps: 10 },
    run: { n: 5, fps: 14 },
    attack: { n: 8, fps: 16 },
    speed: 255,
    melee: { from: 4, to: 6, reach: 80, back: 0 },
    climb: true,
    drops: 'web',
  },
  bat: {
    id: 'bat',
    head: 100,
    name: 'Morcego Gigante',
    frame: 192,
    feetY: 140,
    idle: { n: 6, fps: 12 },
    run: { n: 4, fps: 12 },
    attack: { n: 7, fps: 16 },
    speed: 265,
    melee: { from: 3, to: 5, reach: 68, back: 30 },
    fly: 2000,
    drops: 'wing',
  },
  torchgob: {
    id: 'torchgob',
    head: 68,
    name: 'Goblin da Tocha',
    frame: 192,
    feetY: 130,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 8, fps: 16 },
    speed: 235,
    melee: { from: 2, to: 5, reach: 66, back: 62 },
    drops: 'torch',
  },
  // ---------- Fase 3: vulcão (Diabrete) / Fase 4: céu ----------
  bee: {
    id: 'bee',
    head: 104,
    name: 'Abelhão',
    frame: 192,
    feetY: 150,
    idle: { n: 8, fps: 12 },
    run: { n: 4, fps: 14 },
    attack: { n: 11, fps: 18 },
    speed: 260,
    melee: { from: 5, to: 8, reach: 58, back: 30 },
    drops: 'honey',
  },
  imp: {
    id: 'imp',
    head: 104,
    name: 'Diabrete',
    frame: 192,
    feetY: 149,
    idle: { n: 8, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 12, fps: 16 },
    attackSheets: [
      { key: 'imp_attack_start', n: 4 },
      { key: 'imp_attack_loop', n: 4 },
      { key: 'imp_attack_end', n: 4 },
    ],
    speed: 240,
    // Baforada de fogo comprida à frente.
    melee: { from: 3, to: 8, reach: 94, back: 0 },
    drops: 'ember',
  },
  minotaur: {
    id: 'minotaur',
    // Desenho encolhido para 72% ao carregar (ver MINO_SCALE).
    head: 90,
    name: 'Minotauro',
    frame: 320,
    feetY: 210,
    idle: { n: 16, fps: 12 },
    run: { n: 8, fps: 10 },
    attack: { n: 12, fps: 14 },
    speed: 200,
    // Marretada de pedra: lenta, mas de alcance enorme.
    melee: { from: 6, to: 8, reach: 100, back: 0 },
    drops: 'horn',
  },
  sgnome: {
    id: 'sgnome',
    head: 64,
    name: 'Gnomo do Estilingue',
    frame: 192,
    feetY: 134,
    idle: { n: 10, fps: 10 },
    run: { n: 6, fps: 12 },
    attack: { n: 9, fps: 16 },
    speed: 235,
    projectile: { release: 6, tex: 'acorn', speed: 560, angle: 0, spin: true, item: 'acorn', arc: { vy: -190, g: 520 } },
    drops: 'acorn',
  },
};

/** Pegar o item transforma no personagem correspondente. */
export const ITEM_TO_CHAR: Record<ItemId, CharId> = {
  bone: 'gnoll',
  harpoon: 'shark',
  spear: 'goblin',
  crest: 'lizard',
  web: 'spider',
  wing: 'bat',
  torch: 'torchgob',
  honey: 'bee',
  ember: 'imp',
  acorn: 'sgnome',
  horn: 'minotaur',
};

export const ITEM_TEXTURE: Record<ItemId, string> = {
  bone: 'bone',
  harpoon: 'harpoon',
  spear: 'spear_item',
  crest: 'crest_item',
  web: 'web_item',
  wing: 'wing_item',
  torch: 'torch_item',
  honey: 'honey_item',
  ember: 'ember_item',
  acorn: 'acorn',
  horn: 'horn_item',
};

/** O Minotauro comum é desenhado menor que a folha original. */
export const MINO_SCALE = 0.72;
