import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, GRASS_Y, H, TILE, W, WATER_Y } from '../config';
import type { CharId, ItemId } from './characters';

/** Plataforma: início e comprimento em tiles de 64px (locais à tela, 0..19). */
export type Segment = [start: number, length: number];

export type DecoKind = 'tree' | 'dead_tree' | 'rock1' | 'rock2' | 'stump' | 'bones' | 'skull_spike';

/** Um cenário = uma tela de 1280px (20 tiles). */
export interface ScreenDef {
  segments: Segment[];
  deco?: Array<[tile: number, kind: DecoKind]>;
  /** Modo história. */
  enemies?: Array<[tile: number, char: CharId]>;
  storyItems?: Array<[tile: number, item: ItemId]>;
  /** Modo versus (os itens reaparecem depois de um tempo). */
  versusItems?: Array<[tile: number, item: ItemId]>;
}

export interface LevelDef {
  name: string;
  /** 5 cenários, da esquerda para a direita. O do meio (índice 2) é o central. */
  screens: ScreenDef[];
  /** Modo história: cenário e tile de início (o fim é a ponta oposta). */
  storyStart: [screen: number, tile: number];
  /** Modo versus: tiles de início no cenário central. */
  versusStart: [p1Tile: number, p2Tile: number];
}

export const SCREEN_TILES = W / TILE; // 20

/** Espelha um cenário (para o lado esquerdo ser justo com o P2 no versus). */
function mirror(s: ScreenDef): ScreenDef {
  const m = (t: number) => SCREEN_TILES - 1 - t;
  return {
    segments: s.segments.map(([a, n]) => [SCREEN_TILES - a - n, n] as Segment).sort((x, y) => x[0] - y[0]),
    deco: s.deco?.map(([t, k]) => [m(t), k]),
    versusItems: s.versusItems?.map(([t, k]) => [m(t), k]),
  };
}

// Cenários da direita; os da esquerda são o espelho (com inimigos próprios no modo história).
const RIGHT_1: ScreenDef = {
  segments: [[0, 4], [6, 4], [12, 2], [15, 5]],
  deco: [[1, 'tree'], [8, 'rock1'], [13, 'stump'], [18, 'tree']],
  versusItems: [[7, 'spear']],
};
const RIGHT_2: ScreenDef = {
  segments: [[0, 8], [11, 2], [14, 6]],
  deco: [[3, 'dead_tree'], [12, 'rock2'], [15, 'bones'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[5, 'harpoon']],
};

/**
 * Fase 1 — Ilhas da Maré. O cenário central reproduz o mockup.
 * Vão de água = buraco: cair nele mata.
 */
export const LEVEL_1: LevelDef = {
  name: 'Fase 1 — Ilhas da Maré',
  screens: [
    {
      ...mirror(RIGHT_2),
      enemies: [[13, 'gnoll']],
      storyItems: [],
    },
    {
      ...mirror(RIGHT_1),
      enemies: [[11, 'lizard'], [17, 'goblin']],
      storyItems: [[2, 'bone']],
    },
    {
      // Central (mockup): plataforma longa, vão, ilha e pilar.
      segments: [[0, 13], [15, 3], [18, 2]],
      deco: [[6, 'rock1'], [11, 'stump']],
      enemies: [[16, 'lizard'], [9, 'gnoll']],
      storyItems: [[4, 'spear']],
      versusItems: [[9, 'bone']],
    },
    {
      ...RIGHT_1,
      enemies: [[8, 'shark'], [17, 'goblin']],
      storyItems: [[2, 'harpoon']],
    },
    {
      ...RIGHT_2,
      enemies: [[5, 'lizard'], [12, 'shark'], [16, 'goblin']],
      storyItems: [],
    },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

export class Level {
  readonly def: LevelDef;
  readonly width: number;
  readonly ground: Phaser.Physics.Arcade.StaticGroup;
  /** Plataformas em tiles globais. */
  readonly segments: Segment[];

  constructor(private scene: Phaser.Scene, def: LevelDef) {
    this.def = def;
    this.width = def.screens.length * W;
    this.ground = scene.physics.add.staticGroup();
    this.segments = def.screens.flatMap((s, i) =>
      s.segments.map(([a, n]) => [a + i * SCREEN_TILES, n] as Segment),
    );
    this.buildBackground();
    this.buildTerrain();
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

  isGround(x: number): boolean {
    return this.segments.some(([s, n]) => x >= s * TILE + 6 && x <= (s + n) * TILE - 6);
  }

  /** Ponto de chão mais próximo de x, de preferência na direção dir e dentro de [min,max]. */
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

  private buildBackground(): void {
    const s = this.scene;
    s.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);

    // Nuvens em parallax.
    const rng = new Phaser.Math.RandomDataGenerator(['skullshift-clouds']);
    const span = W + (this.width - W) * 0.25 + 600;
    for (let x = -200, i = 0; x < span; x += rng.between(330, 460), i++) {
      s.add
        .image(x, rng.between(70, 190), `cloud_0${(i % 8) + 1}`)
        .setOrigin(0, 0)
        .setScrollFactor(0.25, 0)
        .setDepth(DEPTH.clouds);
    }

    s.add.rectangle(0, WATER_Y, W, H - WATER_Y, 0x39b5fd).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.water);
    s.add.rectangle(0, WATER_Y, W, 4, 0x8fd9ff).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.water);

    // Pedras na água, inclusive dentro dos buracos.
    const rr = new Phaser.Math.RandomDataGenerator(['skullshift-rocks']);
    for (let x = 300; x < this.width; x += rr.between(300, 560)) {
      const rock = s.add
        .sprite(x, rr.between(WATER_Y + 60, H - 30), 'water_rocks')
        .setDepth(DEPTH.waterRocks)
        .setScale(rr.realInRange(1.1, 1.5));
      rock.play({ key: 'water_rocks', startFrame: rr.between(0, 15) });
    }
    for (let i = 0; i < this.segments.length - 1; i++) {
      const [s0, n0] = this.segments[i];
      const [s1] = this.segments[i + 1];
      if (s1 - (s0 + n0) >= 2) {
        const gx = ((s0 + n0) * TILE + s1 * TILE) / 2;
        s.add.sprite(gx, WATER_Y + 18, 'water_rocks').setDepth(DEPTH.waterRocks).setScale(1.3).play('water_rocks');
      }
    }
  }

  private buildTerrain(): void {
    const s = this.scene;
    const COLS = 9;
    // Plataformas que tocam a borda de um cenário continuam no seguinte: junta para desenhar.
    const merged: Segment[] = [];
    for (const seg of this.segments) {
      const last = merged[merged.length - 1];
      if (last && last[0] + last[1] === seg[0]) last[1] += seg[1];
      else merged.push([seg[0], seg[1]]);
    }
    for (const [start, n] of merged) {
      for (let i = 0; i < n; i++) {
        const col = n === 1 ? 8 : i === 0 ? 5 : i === n - 1 ? 7 : 6;
        const x = (start + i) * TILE;
        s.add.image(x, GRASS_Y, 'tilemap', 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
        s.add.image(x, GRASS_Y + TILE, 'tilemap', 5 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
      }
      for (let t = start + 0.9; t < start + n - 0.4; t += 2.45) {
        s.add
          .sprite(t * TILE, GRASS_Y + 44, 'bush')
          .setScale(0.42)
          .setDepth(DEPTH.deco)
          .play({ key: 'bush', startFrame: Math.floor(t) % 8 });
      }
      const w = n * TILE;
      const zone = s.add.zone(start * TILE + w / 2, FLOOR_Y + 12, w, 24);
      s.physics.add.existing(zone, true);
      this.ground.add(zone);
    }

    // Decoração de cada cenário.
    this.def.screens.forEach((sc, i) => {
      for (const [tile, kind] of sc.deco ?? []) this.addDeco(this.tileX(i, tile), kind, tile);
    });

    // Marcos de chegada nas duas pontas.
    for (const x of [TILE / 2 + 8, this.width - TILE / 2 - 8]) {
      this.addDeco(x - 22, 'skull_spike', 0);
      this.addDeco(x + 22, 'skull_spike', 0);
      this.addDeco(x, 'bones', 0);
    }
  }

  private addDeco(x: number, kind: DecoKind, seed: number): void {
    const s = this.scene;
    const base = FLOOR_Y - 6; // um pouco atrás da linha dos pés
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
      default:
        s.add.image(x, base + 8, kind).setOrigin(0.5, 1).setDepth(DEPTH.deco);
    }
  }
}
