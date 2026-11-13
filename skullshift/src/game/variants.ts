import Phaser from 'phaser';
import { CHARS, type CharDef, type CharId, type VariantId } from './characters';
import { SPIDER_QUEEN_PALETTE, recolorSheet, shrinkSheet } from './sheets';
import { Px } from '../ui/pixelart';

/**
 * Variantes de inimigos: o mesmo personagem do Enemy Pack com outra paleta (trocada à mão),
 * às vezes maior (elite, com mais vida), com um acessório desenhado por cima (bandana, chapéu,
 * capacete de concha, boia) e uma habilidade própria.
 *
 * Cada variante vira um personagem novo em CHARS (id próprio, animações próprias), então o
 * resto do jogo a trata como qualquer inimigo.
 */
export type Ability =
  /** Investida: corre em disparada até o jogador e golpeia de perto. */
  | 'charge'
  /** Arpão triplo em leque. */
  | 'triple'
  /** Enterra-se na areia e salta para fora quando o jogador chega perto. */
  | 'burrow'
  /** Cospe bolhas de água à distância. */
  | 'spit'
  /** Arremessa bombas em arco que explodem ao cair. */
  | 'bomb'
  /** Arremessa redes de pesca que prendem o jogador (como teia). */
  | 'net'
  /** Osso bumerangue: vai e volta. */
  | 'boomerang'
  /** Cospe bolas de teia que prendem o jogador. */
  | 'web'
  /** Cospe bolas de fogo. */
  | 'fire'
  /** Cospe veneno. */
  | 'poison';

export type Accessory = 'bandana' | 'eyepatch' | 'captain' | 'shellhelm' | 'buoy' | 'horns';

export interface VariantDef {
  id: VariantId;
  base: CharId;
  name: string;
  palette?: Record<number, number>;
  /** Elite: tamanho (1 = normal). */
  scale?: number;
  /** Golpes para derrotar (padrão 1). */
  hp?: number;
  speedMul?: number;
  ability?: Ability;
  accessories?: Accessory[];
  /** Cor do monte de quem se enterra (areia, capim...). */
  mound?: [number, number];
}

// ---------- paletas (cores originais do Enemy Pack → novas) ----------

/** Tubarão: corpo 289092/195d6b/40ac92, barriga bfc3bf/e0dbcf/9ec9be, olho fef07c. */
const SHARK_HAMMER = { 0x289092: 0x7a7f8a, 0x195d6b: 0x4a4f5a, 0x40ac92: 0xa8b0b8, 0xfef07c: 0xff5a3a };
const SHARK_CORAL = { 0x289092: 0xe0607a, 0x195d6b: 0xa03050, 0x40ac92: 0xffa0b0, 0xbfc3bf: 0xfff0d8, 0xe0dbcf: 0xffffff, 0x9ec9be: 0xffd0c0, 0xfef07c: 0x7fd8ff };
const SHARK_ELITE = { 0x289092: 0x2a3a8a, 0x195d6b: 0x18204a, 0x40ac92: 0x4a6ad0, 0x9ec9be: 0x9ab0e0, 0xfef07c: 0xffe066 };
/** Lagarto: corpo 3cbe57/4b867b, crista ffed44, saia 693d5b. */
const LIZARD_SAND = { 0x3cbe57: 0xd8b070, 0x4b867b: 0xa07a40, 0xffed44: 0xfff1a8, 0x693d5b: 0x6a4a2a };
const LIZARD_TIDE = { 0x3cbe57: 0x3aa8e0, 0x4b867b: 0x1f5f9a, 0xffed44: 0xbfe9ff, 0x693d5b: 0x2a3a6a };
/** Goblin: pele 95d562, túnica b65555, capacete 688c8a/9cbeaa/417168. */
const GOBLIN_PIRATE = { 0xb65555: 0x3a5ad0, 0x688c8a: 0x8a6a4a, 0x9cbeaa: 0xb89a70, 0x417168: 0x5a4030 };
const GOBLIN_CAPTAIN = { 0x95d562: 0x7ab84a, 0xb65555: 0x7a1e2a, 0x688c8a: 0x2a2a3a, 0x9cbeaa: 0x4a4a5a, 0x417168: 0x1a1a24 };
const GOBLIN_BOMBER = { 0xb65555: 0x3a3a3a, 0x688c8a: 0x7a5a3a, 0x9cbeaa: 0xa07a50, 0x417168: 0x4a3020 };
/** Gnoll: pelo efe054, juba 6d5e51/514744, manchas b492a7, couro af8c58. */
/** Gnolls da Pradaria: caçador (hiena cinza-escura), espreitador (capim verde), brutamontes (marrom-escuro). */
const GNOLL_HUNTER = { 0xefe054: 0xa89a7a, 0xaf8c58: 0x6a5a4a, 0xb492a7: 0x3a3030, 0x6d5e51: 0x3a3030, 0x514744: 0x221c1c };
const GNOLL_STALKER = { 0xefe054: 0x9ac85a, 0xaf8c58: 0x5a8a3a, 0xb492a7: 0x3a6a2a, 0x6d5e51: 0x4a6a2a, 0x514744: 0x2a4a1a };
const GNOLL_BRUTE = { 0xefe054: 0xc87a3a, 0xaf8c58: 0x8a4a22, 0xb492a7: 0x5a2a1a, 0x6d5e51: 0x3a2018, 0x514744: 0x22140e };
/** Caverna das Teias: aranha saltadora (verde), tecelã (branca), viúva-negra; morcego vampiro (carmim). */
const SPIDER_JUMPER = { 0x764e7b: 0x3a8a4a, 0x4c375e: 0x2a6a3a, 0x2c283e: 0x1a4a2a, 0xb487a3: 0x9ae06a, 0xdde678: 0xffe066 };
const SPIDER_WEB = { 0x764e7b: 0xc8c8d8, 0x4c375e: 0x9a9ab0, 0x2c283e: 0x6a6a80, 0xb487a3: 0xffffff, 0xdde678: 0xff5a5a };
const BAT_VAMPIRE = { 0x4d4162: 0x5a1020, 0x71568d: 0xa01e30, 0x5d657c: 0x3a2a30, 0x8f9eae: 0x6a4a52, 0x464554: 0x2a1a1e, 0xe4ee67: 0xffe066 };
/** Forja: minotauro de lava (brasa), de obsidiana (preto com chifres roxos); lagarto de magma. */
const MINO_LAVA = { 0x78a7ab: 0xd8642e, 0x789e9c: 0xb84a22, 0xb8d2c3: 0xffb060, 0x667279: 0x3a2a2a, 0x576064: 0x2a1e1e, 0x3e4151: 0x1a1414, 0x435060: 0x2e2222, 0xfff977: 0xffe066 };
const MINO_OBSIDIAN = {
  0x78a7ab: 0x3a3a4a,
  0x789e9c: 0x2a2a38,
  0xb8d2c3: 0x6a6a8a,
  0x667279: 0x1a1a24,
  0x576064: 0x121218,
  0x3e4151: 0x0a0a10,
  0xcfbb85: 0x9a7aff,
  0x9f976a: 0x6a4ad0,
  0xe9e5b2: 0xc8b0ff,
  0xd3c08c: 0xa88aff,
  0xfff977: 0xc8b0ff,
};
const LIZARD_MAGMA = { 0x3cbe57: 0xd84a2a, 0x4b867b: 0x8a2a1a, 0xffed44: 0xffd36b, 0x693d5b: 0x2a1a1a };
/** Bosque: gnomos de chapéu vermelho, de musgo e ancião (roxo). */
const GNOME_RED = { 0xe09844: 0xd42a3c, 0x9c664b: 0x8a1a2a, 0xf2ec7d: 0xff8a8a };
const GNOME_MOSS = { 0xe09844: 0x5a8a3a, 0x9c664b: 0x3a5a2a, 0xf2ec7d: 0x9ac85a, 0x9cbeaa: 0x6a8a5a };
const GNOME_ELDER = { 0xe09844: 0x7a4ab8, 0x9c664b: 0x4a2a7a, 0xf2ec7d: 0xb48aff, 0x9cbeaa: 0x3a6a8a };
/** Minas: goblin da tocha de fogo azul, mineiro (capacete cinza), chefe (capuz dourado). */
const TORCH_BLUE = { 0xffdc00: 0x7fd8ff, 0xcf8935: 0x3a8ad8, 0x955c3c: 0x1f5f9a, 0x714646: 0x2a3a6a };
const TORCH_MINER = { 0x714646: 0x6a6a7a, 0x8d6e52: 0x5a4a3a, 0x9a7655: 0x7a6a5a };
const TORCH_CHIEF = { 0x714646: 0xd8a530, 0x8abc61: 0x6a9a4a, 0x417168: 0x3a6a2a };
/** Lagoa: lagarto venenoso (roxo) e crocodilo (elite, verde-escuro). */
const LIZARD_POISON = { 0x3cbe57: 0x9a4ad0, 0x4b867b: 0x5a2a8a, 0xffed44: 0xc8f05a, 0x693d5b: 0x2a1a3a };
const LIZARD_CROC = { 0x3cbe57: 0x3a6a2a, 0x4b867b: 0x2a4a1a, 0xffed44: 0xa8c85a, 0x693d5b: 0x4a3a1a };
/** Céu de Brasa: abelha de brasa (vermelha) e abelha da tempestade (elite, cinza). */
const BEE_EMBER = { 0xefe054: 0xff6a3a, 0xb28d5a: 0xa01e30, 0x9f866e: 0x6a1020, 0x6c554b: 0x3a0a10, 0xdad9bb: 0xffd0a0, 0xc6b799: 0xffb070 };
const BEE_STORM = { 0xefe054: 0xc8c8e0, 0xb28d5a: 0x4a4a6a, 0x9f866e: 0x2a2a4a, 0x6c554b: 0x1a1a2a, 0xdad9bb: 0xe0f0ff, 0xc6b799: 0x9ab0ff };
const GNOLL_WRECK = { 0xefe054: 0xb8c8a0, 0xaf8c58: 0x7a8a6a, 0xb492a7: 0x4a8a9a, 0x6d5e51: 0x4a5a5a, 0x514744: 0x2e3a3a };

export const VARIANTS: VariantDef[] = [
  { id: 'shark_hammer', base: 'shark', name: 'Tubarão-Martelo', palette: SHARK_HAMMER, ability: 'charge', speedMul: 1.25 },
  { id: 'shark_coral', base: 'shark', name: 'Tubarão de Coral', palette: SHARK_CORAL, ability: 'triple' },
  { id: 'shark_elite', base: 'shark', name: 'Tubarão Couraçado', palette: SHARK_ELITE, scale: 1.35, hp: 3, accessories: ['shellhelm'] },
  { id: 'lizard_sand', base: 'lizard', name: 'Lagarto de Areia', palette: LIZARD_SAND, ability: 'burrow' },
  { id: 'lizard_tide', base: 'lizard', name: 'Lagarto da Maré', palette: LIZARD_TIDE, ability: 'spit' },
  { id: 'goblin_pirate', base: 'goblin', name: 'Goblin Pirata', palette: GOBLIN_PIRATE, accessories: ['bandana', 'eyepatch'] },
  { id: 'goblin_captain', base: 'goblin', name: 'Capitão Goblin', palette: GOBLIN_CAPTAIN, scale: 1.3, hp: 3, speedMul: 0.9, accessories: ['captain', 'eyepatch'] },
  { id: 'goblin_bomber', base: 'goblin', name: 'Goblin Bombardeiro', palette: GOBLIN_BOMBER, ability: 'bomb', accessories: ['bandana'] },
  { id: 'gnoll_wreck', base: 'gnoll', name: 'Gnoll Náufrago', palette: GNOLL_WRECK, ability: 'net', accessories: ['buoy'] },
  { id: 'spider_jumper', base: 'spider', name: 'Aranha Saltadora', palette: SPIDER_JUMPER, ability: 'charge', speedMul: 1.15 },
  { id: 'spider_web', base: 'spider', name: 'Aranha Tecelã', palette: SPIDER_WEB, ability: 'web' },
  { id: 'spider_widow', base: 'spider', name: 'Viúva-Negra', palette: SPIDER_QUEEN_PALETTE, scale: 1.4, hp: 3 },
  { id: 'bat_vampire', base: 'bat', name: 'Morcego Vampiro', palette: BAT_VAMPIRE, ability: 'charge', speedMul: 1.2 },
  { id: 'minotaur_lava', base: 'minotaur', name: 'Minotauro de Lava', palette: MINO_LAVA, ability: 'charge', speedMul: 1.2 },
  { id: 'minotaur_obsidian', base: 'minotaur', name: 'Minotauro de Obsidiana', palette: MINO_OBSIDIAN, scale: 1.2, hp: 3, speedMul: 0.9 },
  { id: 'lizard_magma', base: 'lizard', name: 'Lagarto de Magma', palette: LIZARD_MAGMA, ability: 'fire' },
  { id: 'sgnome_red', base: 'sgnome', name: 'Gnomo de Chapéu Vermelho', palette: GNOME_RED, ability: 'triple' },
  { id: 'sgnome_moss', base: 'sgnome', name: 'Gnomo do Musgo', palette: GNOME_MOSS, ability: 'burrow', mound: [0x3a5a2a, 0x6a9a4a] },
  { id: 'sgnome_elder', base: 'sgnome', name: 'Gnomo Ancião', palette: GNOME_ELDER, scale: 1.35, hp: 3 },
  { id: 'torchgob_blue', base: 'torchgob', name: 'Goblin do Fogo Azul', palette: TORCH_BLUE, ability: 'charge', speedMul: 1.2 },
  { id: 'torchgob_miner', base: 'torchgob', name: 'Goblin Mineiro', palette: TORCH_MINER, ability: 'bomb' },
  { id: 'torchgob_chief', base: 'torchgob', name: 'Chefe Goblin', palette: TORCH_CHIEF, scale: 1.35, hp: 3 },
  { id: 'lizard_poison', base: 'lizard', name: 'Lagarto Venenoso', palette: LIZARD_POISON, ability: 'poison' },
  { id: 'lizard_croc', base: 'lizard', name: 'Lagarto-Crocodilo', palette: LIZARD_CROC, scale: 1.3, hp: 3, speedMul: 0.9 },
  { id: 'bee_ember', base: 'bee', name: 'Abelha de Brasa', palette: BEE_EMBER, ability: 'charge', speedMul: 1.2 },
  { id: 'bee_storm', base: 'bee', name: 'Abelha da Tempestade', palette: BEE_STORM, scale: 1.3, hp: 3 },
  { id: 'gnoll_hunter', base: 'gnoll', name: 'Gnoll Caçador', palette: GNOLL_HUNTER, ability: 'boomerang', speedMul: 1.1 },
  { id: 'gnoll_stalker', base: 'gnoll', name: 'Gnoll Espreitador', palette: GNOLL_STALKER, ability: 'burrow', mound: [0x5a8a3a, 0x9ac85a] },
  { id: 'gnoll_brute', base: 'gnoll', name: 'Gnoll Brutamontes', palette: GNOLL_BRUTE, scale: 1.35, hp: 3, speedMul: 0.85, accessories: ['horns'] },
];

export const variantOf = (id: string): VariantDef | undefined => VARIANTS.find((v) => v.id === id);

/** Personagem original de uma ficha (a própria, se não for variante). */
export const baseOf = (def: CharDef): CharId => def.base ?? def.id;

/**
 * Onde cada acessório fica: deslocamento do centro (para a frente, olhando para a direita) e
 * altura acima dos pés, medidos na arte original de cada personagem.
 */
export function accessoryOffset(base: CharId, a: Accessory, k: number): { dx: number; dy: number } {
  const at: Partial<Record<CharId, Partial<Record<Accessory, [number, number]>>>> = {
    goblin: { bandana: [-4, 60], eyepatch: [10, 47], captain: [-4, 68] },
    shark: { shellhelm: [2, 70] },
    gnoll: { buoy: [-2, 32], horns: [8, 62] },
  };
  const [dx, dy] = at[base]?.[a] ?? [0, CHARS[base].head];
  return { dx: dx * k, dy: dy * k };
}

// ---------- texturas ----------

/** Desenha os acessórios e os projéteis novos (pixel art em código). */
function makeArt(scene: Phaser.Scene): void {
  const INK = 0x1d1a2b;
  // Bandana vermelha com bolinhas e as pontas soltas para trás.
  const band = new Px(22, 10);
  band.rect(2, 3, 16, 5, 0xd42a3c);
  band.rect(2, 3, 16, 1, 0xff6a6a);
  for (const x of [5, 10, 15]) band.set(x, 5, 0xfff7dc);
  band.rect(0, 5, 3, 2, 0xd42a3c);
  band.rect(0, 7, 2, 2, 0xa01e30);
  band.outline(INK);
  band.toTexture(scene, 'acc_bandana', 2);
  // Tapa-olho.
  const patch = new Px(10, 6);
  patch.rect(0, 1, 10, 1, INK);
  patch.disc(5, 3, 2, 0x10101a);
  patch.toTexture(scene, 'acc_eyepatch', 2);
  // Chapéu de capitão (tricórnio) com caveira e pena.
  const hat = new Px(30, 16);
  hat.rect(1, 10, 28, 4, 0x2a2a3a);
  hat.rect(5, 4, 20, 7, 0x2a2a3a);
  hat.rect(5, 4, 20, 1, 0x4a4a5a);
  hat.rect(1, 13, 28, 1, 0xd8a530);
  hat.disc(15, 7, 2, 0xfff7dc);
  hat.set(14, 7, INK);
  hat.set(16, 7, INK);
  hat.rect(22, 0, 2, 5, 0xd42a3c);
  hat.rect(24, 1, 2, 3, 0xd42a3c);
  hat.outline(INK);
  hat.toTexture(scene, 'acc_captain', 2);
  // Capacete de concha (vieira) com listras.
  const shell = new Px(26, 16);
  for (let y = 0; y < 14; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 169 - (13 - y) * (13 - y))));
    for (let x = 13 - half; x <= 13 + half; x++) shell.set(x, y, (x - 13 + 26) % 5 === 0 ? 0xd88a6a : 0xffd0b0);
  }
  shell.rect(9, 13, 8, 3, 0xd88a6a);
  shell.outline(INK);
  shell.toTexture(scene, 'acc_shellhelm', 2);
  // Boia salva-vidas (anel vermelho e branco).
  const buoy = new Px(30, 12);
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 30; x++) {
      const dx = (x - 14.5) / 14.5;
      const dy = (y - 5.5) / 5.5;
      const r = dx * dx + dy * dy;
      if (r <= 1 && r >= 0.35) buoy.set(x, y, Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 3)) % 2 ? 0xffffff : 0xd42a3c);
    }
  buoy.outline(INK);
  buoy.toTexture(scene, 'acc_buoy', 2);
  // Capacete de chifres (ferro e chifres de osso).
  const horns = new Px(30, 14);
  horns.rect(8, 6, 14, 7, 0x6a6a7a);
  horns.rect(8, 6, 14, 2, 0x9a9aaa);
  horns.rect(14, 3, 2, 3, 0x6a6a7a);
  for (let k = 0; k < 6; k++) {
    horns.set(7 - k, 7 - k, 0xf4ead0);
    horns.set(6 - k, 7 - k, 0xf4ead0);
    horns.set(22 + k, 7 - k, 0xf4ead0);
    horns.set(23 + k, 7 - k, 0xf4ead0);
  }
  horns.outline(INK);
  horns.toTexture(scene, 'acc_horns', 2);
  // Bolha d'água (cuspe do Lagarto da Maré).
  const ball = new Px(10, 10);
  ball.disc(5, 5, 4, 0x3aa8e0);
  ball.disc(5, 5, 3, 0x7fd8ff);
  ball.rect(3, 3, 2, 2, 0xffffff);
  ball.outline(INK);
  ball.toTexture(scene, 'water_ball', 2);
  // Bola de fogo (cuspe do Lagarto de Magma).
  const fire = new Px(12, 10);
  fire.disc(7, 5, 4, 0xff6a1a);
  fire.disc(7, 5, 2, 0xffe066);
  fire.rect(1, 4, 3, 2, 0xff9a3a);
  fire.set(0, 5, 0xd84a2a);
  fire.outline(INK);
  fire.toTexture(scene, 'fire_ball', 2);
  // Gota de veneno (Lagarto Venenoso).
  const poison = new Px(10, 10);
  poison.disc(5, 6, 4, 0x8ad84a);
  poison.disc(5, 6, 2, 0xc8f05a);
  poison.rect(4, 0, 2, 3, 0x8ad84a);
  poison.set(3, 4, 0xffffff);
  poison.outline(INK);
  poison.toTexture(scene, 'poison_ball', 2);
  // Bomba redonda com pavio.
  const bomb = new Px(12, 13);
  bomb.disc(6, 8, 4, 0x2a2a3a);
  bomb.rect(4, 6, 2, 2, 0x6a6a7a);
  bomb.rect(6, 1, 1, 3, 0xb89a70);
  bomb.set(7, 0, 0xffe066);
  bomb.set(6, 0, 0xff7a1a);
  bomb.outline(INK);
  bomb.toTexture(scene, 'bomb', 2);
  // Rede de pesca enrolada.
  const net = new Px(14, 14);
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 14; x++) {
      const r = Math.hypot(x - 6.5, y - 6.5);
      if (r <= 6.5 && (x % 3 === 0 || y % 3 === 0)) net.set(x, y, 0xd8c8a0);
    }
  net.outline(INK);
  net.toTexture(scene, 'net_ball', 2);
}

/** Cria as folhas, as animações e as fichas (CHARS) de todas as variantes. */
export function makeVariants(scene: Phaser.Scene): void {
  makeArt(scene);
  for (const v of VARIANTS) {
    const b = CHARS[v.base];
    const k = v.scale ?? 1;
    for (const part of ['idle', 'run', 'attack'] as const) {
      const src = `${v.base}_${part}`;
      const dst = `${v.id}_${part}`;
      recolorSheet(scene, src, dst, b.frame, b.frame, v.palette ?? {});
      if (k !== 1) shrinkSheet(scene, dst, b.frame, b.frame, k, b.feetY);
      const a = b[part];
      scene.anims.create({
        key: dst,
        frames: scene.anims.generateFrameNumbers(dst, { start: 0, end: a.n - 1 }),
        frameRate: a.fps,
        repeat: part === 'attack' ? 0 : -1,
      });
    }
    const def: CharDef = {
      ...b,
      id: v.id as CharId,
      base: v.base,
      name: v.name,
      head: Math.round(b.head * k),
      speed: Math.round(b.speed * (v.speedMul ?? 1)),
      // Variantes não viram transformação do jogador (soltam o item do personagem base).
      drops: b.drops,
    };
    if (b.melee) def.melee = { ...b.melee, reach: Math.round(b.melee.reach * k), back: Math.round(b.melee.back * k) };
    // Habilidades que trocam o tipo de ataque.
    if (v.ability === 'charge') {
      def.projectile = undefined;
      def.melee = { from: 2, to: 6, reach: 110, back: 40 };
    } else if (v.ability === 'spit') {
      def.melee = undefined;
      def.projectile = { release: 3, tex: 'water_ball', speed: 560, angle: 0, spin: false, arc: { vy: -60, g: 260 } };
    } else if (v.ability === 'bomb') {
      def.melee = undefined;
      def.projectile = { release: 3, tex: 'bomb', speed: 360, angle: 0, spin: false, arc: { vy: -420, g: 900 } };
    } else if (v.ability === 'poison') {
      def.melee = undefined;
      def.projectile = { release: 3, tex: 'poison_ball', speed: 520, angle: 0, spin: false, arc: { vy: -90, g: 300 } };
    } else if (v.ability === 'fire') {
      def.melee = undefined;
      def.projectile = { release: 3, tex: 'fire_ball', speed: 540, angle: 0, spin: false, arc: { vy: -80, g: 300 } };
    } else if (v.ability === 'web') {
      def.melee = undefined;
      def.projectile = { release: 4, tex: 'web_ball', speed: 440, angle: 0, spin: false, arc: { vy: -120, g: 380 } };
    } else if (v.ability === 'net') {
      def.projectile = { release: 3, tex: 'net_ball', speed: 480, angle: 0, spin: false, arc: { vy: -160, g: 420 } };
    }
    (CHARS as Record<string, CharDef>)[v.id] = def;
  }
}
