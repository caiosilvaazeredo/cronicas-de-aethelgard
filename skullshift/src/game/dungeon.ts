import Phaser from 'phaser';
import { LEVELS, type DecoKind, type LevelDef, type ScreenDef, type Segment } from './level';
import { areaById, areaTier, recommendedLevel, type AreaDef } from './areas';
import { getLevel } from './progress';
import { variantOf } from './variants';
import type { EnemyId } from './characters';

/**
 * Dungeons geradas (estilo For the King): um mapa de salas em colunas, ligadas por caminhos que
 * se cruzam. A cada passo o jogador escolhe a próxima sala entre as ligadas à atual:
 *
 *   luta · elite · baú · evento (com rolagem de dados) · armadilha · acampamento · santuário
 *   e, na última coluna, o guardião da dungeon.
 *
 * As salas de luta viram uma fase de plataforma em tempo real gerada na hora (terreno, cenário e
 * inimigos da área), jogada no slot DUNGEON_SLOT de LEVELS. Dificuldade: a área tem um nível
 * sugerido; quanto mais abaixo dele o jogador estiver, mais armadura os inimigos têm (golpes a
 * mais) e mais corações cada golpe tira. Acima dele, os golpes da caveira derrubam mais rápido.
 *
 * Morrer (zerar os corações) perde tudo o que a run juntou (ouro e XP). Vencer o guardião entrega
 * tudo e conta a dungeon como limpa (abre o selo do rei daquela área).
 */

export type NodeKind = 'start' | 'fight' | 'elite' | 'chest' | 'event' | 'trap' | 'camp' | 'shrine' | 'boss';

export interface DNode {
  id: number;
  col: number;
  row: number;
  /** Quantas salas tem a coluna (para desenhar). */
  rows: number;
  kind: NodeKind;
  next: number[];
  /** Evento sorteado para esta sala (índice em EVENTS). */
  event?: number;
}

export type Blessing = 'heart' | 'fury' | 'luck';

export interface DungeonRun {
  area: string;
  seed: number;
  tier: number;
  /** Nível sugerido da área. */
  rec: number;
  nodes: DNode[];
  /** Sala atual. */
  at: number;
  /** Salas já visitadas. */
  visited: number[];
  hearts: number;
  maxHearts: number;
  /** O que a run juntou (só é entregue se o guardião cair). */
  gold: number;
  xp: number;
  blessings: Blessing[];
  /** A dungeon já tinha sido limpa antes (recompensa menor). */
  replay: boolean;
  /** Para onde voltar no fim. */
  from: 'village' | 'map';
  /** Resultado da última sala de luta (a cena da dungeon mostra e limpa). */
  lastFight?: 'win';
  over?: 'win' | 'lose';
}

export const DUNGEON_SLOT = LEVELS.length;
// Lugar fixo no fim de LEVELS: a sala de luta da vez é escrita aqui antes de começar.
LEVELS.push({
  id: 'dungeon_room',
  name: 'Dungeon',
  theme: 'cave',
  tiles: 'tiles_cave',
  secret: true,
  screens: [{ segments: [[0, 20]] }],
  storyStart: [0, 1],
  versusStart: [3, 16],
});

let run: DungeonRun | undefined;
export const getRun = (): DungeonRun | undefined => run;
export function endRun(): void {
  run = undefined;
}

/** Gerador simples e repetível (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const between = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

/** Corações da caveira numa dungeon: 3 + 1 a cada 3 níveis. */
export const heartsFor = (level: number): number => 3 + Math.floor(level / 3);

/** Começa uma run nova na dungeon da área. */
export function startRun(areaId: string, from: 'village' | 'map', replay: boolean): DungeonRun {
  const a = areaById(areaId)!;
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const max = heartsFor(getLevel());
  run = {
    area: areaId,
    seed,
    tier: areaTier(a),
    rec: recommendedLevel(a),
    nodes: generateMap(seed, areaTier(a)),
    at: 0,
    visited: [0],
    hearts: max,
    maxHearts: max,
    gold: 0,
    xp: 0,
    blessings: [],
    replay,
    from,
  };
  return run;
}

/** Quantos tipos de evento existem (o texto fica na cena da dungeon). */
export const EVENT_COUNT = 6;

/** Mapa em colunas: início, 5 a 8 colunas de salas e o guardião. */
function generateMap(seed: number, tier: number): DNode[] {
  const r = rng(seed);
  const cols = 7 + Math.min(3, Math.floor(tier / 3));
  const nodes: DNode[] = [];
  const byCol: DNode[][] = [];
  const weights: Array<[NodeKind, number]> = [
    ['fight', 40],
    ['event', 16],
    ['chest', 12],
    ['trap', 10],
    ['elite', 9],
    ['shrine', 7],
    ['camp', 6],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const roll = (): NodeKind => {
    let x = r() * total;
    for (const [k, w] of weights) if ((x -= w) < 0) return k;
    return 'fight';
  };
  for (let c = 0; c < cols; c++) {
    const n = c === 0 || c === cols - 1 ? 1 : c === 1 ? 2 : between(r, 2, 3);
    const col: DNode[] = [];
    for (let i = 0; i < n; i++) {
      let kind: NodeKind = c === 0 ? 'start' : c === cols - 1 ? 'boss' : roll();
      // Primeira coluna: nada de elite; a penúltima tem sempre um acampamento antes do guardião.
      if (c === 1 && kind === 'elite') kind = 'fight';
      if (c === cols - 2 && i === 0) kind = 'camp';
      const node: DNode = { id: nodes.length, col: c, row: i, rows: n, kind, next: [] };
      if (kind === 'event') node.event = Math.floor(r() * EVENT_COUNT);
      nodes.push(node);
      col.push(node);
    }
    byCol.push(col);
  }
  // Pelo menos uma luta comum nas primeiras colunas (aquecimento).
  if (!byCol[1].some((n) => n.kind === 'fight')) byCol[1][0].kind = 'fight';
  // Caminhos: cada sala liga a 1 ou 2 salas vizinhas da coluna seguinte; toda sala tem entrada.
  for (let c = 0; c < cols - 1; c++) {
    const a = byCol[c];
    const b = byCol[c + 1];
    for (const n of a) {
      const center = Math.round(((n.row + 0.5) / a.length) * b.length - 0.5);
      const t1 = Phaser.Math.Clamp(center, 0, b.length - 1);
      n.next.push(b[t1].id);
      if (b.length > 1 && r() < 0.55) {
        const t2 = Phaser.Math.Clamp(t1 + (r() < 0.5 ? -1 : 1), 0, b.length - 1);
        if (!n.next.includes(b[t2].id)) n.next.push(b[t2].id);
      }
    }
    for (const m of b) {
      if (a.some((n) => n.next.includes(m.id))) continue;
      const near = a.reduce((best, n) => (Math.abs(n.row / a.length - m.row / b.length) < Math.abs(best.row / a.length - m.row / b.length) ? n : best), a[0]);
      near.next.push(m.id);
    }
  }
  return nodes;
}

// ---------- dificuldade ----------

/** Nível "efetivo" da sala: o sugerido da área, um pouco mais fundo a cada 3 colunas. */
export function roomLevel(rn: DungeonRun, node: DNode): number {
  return rn.rec + Math.floor(node.col / 3);
}

/** Diferença entre a sala e o jogador (positivo = sala mais forte). */
export function levelGap(rn: DungeonRun, node: DNode): number {
  return roomLevel(rn, node) - getLevel();
}

/** Chance (0..1) de cada dado dar certo nos eventos: sorte, nível e bênçãos. */
export function successChance(rn: DungeonRun, node: DNode): number {
  const luck = rn.blessings.filter((b) => b === 'luck').length * 0.12;
  return Phaser.Math.Clamp(0.62 - levelGap(rn, node) * 0.035 + luck, 0.2, 0.92);
}

/** Força da caveira: golpes que tiram mais de uma camada de armadura (nível alto ou Fúria). */
export function playerPower(rn: DungeonRun, node: DNode): number {
  const fury = rn.blessings.filter((b) => b === 'fury').length;
  return 1 + (levelGap(rn, node) <= -6 ? 1 : 0) + fury;
}

/** XP de uma sala de luta vencida. */
export function roomXp(rn: DungeonRun, node: DNode): number {
  const base = (10 + 5 * rn.tier) * (node.kind === 'boss' ? 4 : node.kind === 'elite' ? 2 : 1);
  const gap = levelGap(rn, node);
  // Sala fraca demais para o jogador rende metade; sala acima do nível rende mais.
  const k = gap <= -5 ? 0.5 : gap >= 3 ? 1.3 : 1;
  return Math.round(base * k * (rn.replay ? 0.6 : 1));
}

/** Recompensa ao vencer o guardião (além do que a run juntou). */
export function clearReward(rn: DungeonRun): { xp: number; gold: number } {
  const k = rn.replay ? 0.6 : 1;
  return { xp: Math.round((100 + 50 * rn.tier) * k), gold: Math.round((30 + 15 * rn.tier) * k) };
}

// ---------- salas de luta (fase gerada) ----------

/** Fase-base da área: cenário (tileset, tema, água) para as salas. */
function baseLevel(a: AreaDef): LevelDef {
  const defs = a.levels.map((id) => LEVELS.find((l) => l.id === id)!).filter(Boolean);
  return defs.find((l) => !l.shmup && !l.undersea && !l.haunt && !l.boss && !l.puzzle && !l.chase && !l.mausoleum) ?? defs[0] ?? LEVELS[0];
}

/** Inimigos que aparecem nas fases da área (comuns e elites). */
function enemyPools(a: AreaDef): { normal: EnemyId[]; elite: EnemyId[] } {
  const normal = new Set<EnemyId>();
  const elite = new Set<EnemyId>();
  for (const id of a.levels) {
    const l = LEVELS.find((x) => x.id === id);
    for (const s of l?.screens ?? []) for (const [, e] of s.enemies ?? []) ((variantOf(e)?.hp ?? 1) > 1 ? elite : normal).add(e);
  }
  const n = [...normal];
  return { normal: n.length ? n : (['gnoll', 'goblin'] as EnemyId[]), elite: elite.size ? [...elite] : n.length ? n : (['gnoll_brute'] as EnemyId[]) };
}

const DECO: Record<string, DecoKind[]> = {
  shore: ['tree', 'bush', 'rock1', 'stump', 'rock2'],
  cave: ['crystal', 'rock2', 'bones', 'rock1'],
  volcano: ['rock1', 'skull_spike', 'dead_tree', 'bones'],
  sky: ['rock1', 'bush'],
  haunted: ['dead_tree', 'bones', 'skull_spike'],
};

/** Um cenário (20 tiles) de chão gerado: trechos com buracos curtos e degraus de 1 tile. */
function genScreen(r: () => number, theme: string, enemies: EnemyId[], first: boolean): ScreenDef {
  const segments: Segment[] = [];
  const floats: Segment[] = [];
  let t = 0;
  let h = 0;
  while (t < 20) {
    let len = between(r, 3, 7);
    if (first && t === 0) len = Math.max(len, 6);
    len = Math.min(len, 20 - t);
    // Sem pedacinho de 1 ou 2 tiles sobrando no fim da tela: o trecho vai até a borda.
    if (20 - t - len < 4) len = 20 - t;
    segments.push([t, len, h]);
    t += len;
    if (t >= 20) break;
    if (r() < 0.6) {
      const gap = between(r, 1, 2);
      // De vez em quando uma plataforma solta por cima do buraco.
      if (r() < 0.35) floats.push([Math.max(0, t - 1), 3, h + 2]);
      t += gap;
      h = Phaser.Math.Clamp(h + between(r, -1, 1), 0, 2);
    } else {
      h = Phaser.Math.Clamp(h + (r() < 0.5 ? -1 : 1), 0, 2);
    }
  }
  // Inimigos em pé sobre o chão (longe do começo, no primeiro cenário).
  const spots: number[] = [];
  for (const [a, n] of segments) for (let k = a; k < a + n; k++) if (!(first && k < 6)) spots.push(k);
  const used = new Set<number>();
  const list: Array<[number, EnemyId]> = [];
  for (const e of enemies) {
    let tile = pick(r, spots);
    for (let tries = 0; tries < 8 && [...used].some((u) => Math.abs(u - tile) < 2); tries++) tile = pick(r, spots);
    used.add(tile);
    list.push([tile, e]);
  }
  const deco: Array<[number, DecoKind]> = [];
  const kinds = DECO[theme] ?? DECO.shore;
  for (let i = 0; i < 3; i++) deco.push([pick(r, spots.length ? spots : [10]), pick(r, kinds)]);
  return { segments, floats: floats.length ? floats : undefined, enemies: list, deco };
}

/** Escreve no slot da dungeon a fase da sala de luta `node` e devolve o índice para jogar. */
export function prepareRoom(rn: DungeonRun, node: DNode): number {
  const a = areaById(rn.area)!;
  const base = baseLevel(a);
  const pools = enemyPools(a);
  const r = rng(rn.seed + node.id * 7919);
  const gap = levelGap(rn, node);
  const perScreen = Math.min(5, 2 + Math.floor(rn.tier / 3) + (gap > 0 ? 1 : 0));
  const nScreens = node.kind === 'fight' ? 2 : 3;
  const screens: ScreenDef[] = [];
  for (let i = 0; i < nScreens; i++) {
    const list: EnemyId[] = [];
    for (let k = 0; k < perScreen; k++) list.push(pick(r, pools.normal));
    if (node.kind === 'elite' && i === nScreens - 1) list.splice(0, 2, pick(r, pools.elite), pick(r, pools.elite));
    if (node.kind === 'boss' && i === nScreens - 1) list.splice(0, 3, pick(r, pools.elite), pick(r, pools.elite), pick(r, pools.elite));
    screens.push(genScreen(r, base.theme, list, i === 0));
  }
  const armor = Phaser.Math.Clamp(Math.ceil(gap / 3), 0, 4) + (node.kind === 'boss' ? 1 : 0);
  const names: Record<string, string> = { fight: 'Sala de Luta', elite: 'Sala da Elite', boss: 'Covil do Guardião' };
  const def: LevelDef = {
    id: 'dungeon_room',
    name: names[node.kind] ?? 'Dungeon',
    theme: base.theme,
    tiles: base.tiles,
    swamp: base.swamp,
    ember: base.ember,
    secret: true,
    screens,
    clearToAdvance: true,
    storyStart: [0, 1],
    versusStart: [3, 16],
    dungeon: { kind: node.kind, armor, dmg: gap >= 6 ? 2 : 1, power: playerPower(rn, node), xp: roomXp(rn, node) },
  };
  LEVELS[DUNGEON_SLOT] = def;
  return DUNGEON_SLOT;
}
