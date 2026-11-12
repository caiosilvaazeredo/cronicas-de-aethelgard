import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, GRASS_Y, H, TILE, W, WATER_Y } from '../config';
import type { CharId, ItemId } from './characters';

/** Plataforma: início e comprimento em tiles de 64px. */
export type Segment = [start: number, length: number];

export interface LevelDef {
  name: string;
  widthTiles: number;
  segments: Segment[];
  /** Modo história: inimigos (tile, personagem). */
  enemies: Array<[tile: number, char: CharId]>;
  /** Itens no mapa no modo história. */
  storyItems: Array<[tile: number, item: ItemId]>;
  /** Itens no mapa no modo versus (reaparecem após um tempo). */
  versusItems: Array<[tile: number, item: ItemId]>;
  storyStartTile: number;
  versusStart: [p1Tile: number, p2Tile: number];
}

/**
 * Fase 1 — baseada no mockup: plataforma longa, vão de água, ilha pequena e um pilar.
 * O mapa é quase simétrico para o versus (P1 corre para a direita, P2 para a esquerda).
 */
export const LEVEL_1: LevelDef = {
  name: 'Fase 1 — Ilhas da Maré',
  widthTiles: 100,
  segments: [
    [0, 13], [15, 3], [18, 1], [21, 10], [33, 2],
    [37, 26],
    [65, 2], [69, 10], [81, 1], [82, 3], [87, 13],
  ],
  enemies: [
    [16, 'lizard'],
    [27, 'gnoll'],
    [43, 'goblin'],
    [52, 'lizard'],
    [59, 'shark'],
    [74, 'gnoll'],
    [83, 'shark'],
    [91, 'goblin'],
    [96, 'lizard'],
  ],
  storyItems: [
    [9, 'bone'],
    [34, 'spear'],
    [66, 'harpoon'],
  ],
  versusItems: [
    [50, 'bone'],
    [34, 'spear'],
    [66, 'spear'],
    [23, 'harpoon'],
    [77, 'harpoon'],
  ],
  storyStartTile: 4,
  versusStart: [46, 54],
};

export class Level {
  readonly def: LevelDef;
  readonly width: number;
  readonly ground: Phaser.Physics.Arcade.StaticGroup;

  constructor(private scene: Phaser.Scene, def: LevelDef) {
    this.def = def;
    this.width = def.widthTiles * TILE;
    this.ground = scene.physics.add.staticGroup();
    this.buildBackground();
    this.buildTerrain();
  }

  tileX(tile: number): number {
    return tile * TILE + TILE / 2;
  }

  /** Há chão sob esta coordenada x? */
  isGround(x: number): boolean {
    return this.def.segments.some(([s, n]) => x >= s * TILE + 6 && x <= (s + n) * TILE - 6);
  }

  segmentAt(x: number): Segment | undefined {
    return this.def.segments.find(([s, n]) => x >= s * TILE && x <= (s + n) * TILE);
  }

  /** Ponto de chão mais próximo de x na direção dir (usado no respawn). */
  nearestGround(x: number, dir: number): number {
    const clampX = Phaser.Math.Clamp(x, 48, this.width - 48);
    if (this.isGround(clampX)) return clampX;
    let best = clampX;
    let bestDist = Infinity;
    for (const [s, n] of this.def.segments) {
      const a = s * TILE + 40;
      const b = (s + n) * TILE - 40;
      const cx = Phaser.Math.Clamp(clampX, Math.min(a, b), Math.max(a, b));
      // Prefere chão na direção pedida.
      const d = Math.abs(cx - clampX) + (Math.sign(cx - clampX) === -dir ? 400 : 0);
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
      const key = `cloud_0${(i % 8) + 1}`;
      s.add
        .image(x, rng.between(70, 190), key)
        .setOrigin(0, 0)
        .setScrollFactor(0.25, 0)
        .setDepth(DEPTH.clouds)
        .setAlpha(0.97);
    }

    // Água fixa na tela + reflexos simples.
    s.add
      .rectangle(0, WATER_Y, W, H - WATER_Y, 0x39b5fd)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.water);
    s.add
      .rectangle(0, WATER_Y, W, 4, 0x8fd9ff)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.water);

    // Pedras na água (animadas), espalhadas pelo mundo.
    const rr = new Phaser.Math.RandomDataGenerator(['skullshift-rocks']);
    for (let x = 300; x < this.width; x += rr.between(260, 520)) {
      const y = rr.between(WATER_Y + 40, H - 40);
      const rock = s.add.sprite(x, y, 'water_rocks').setDepth(DEPTH.waterRocks).setScale(rr.realInRange(1.1, 1.5));
      rock.play({ key: 'water_rocks', startFrame: rr.between(0, 15) });
    }
    // Pedras junto aos vãos, como no mockup.
    for (let i = 0; i < this.def.segments.length - 1; i++) {
      const [s0, n0] = this.def.segments[i];
      const [s1] = this.def.segments[i + 1];
      if (s1 - (s0 + n0) >= 2) {
        const gx = ((s0 + n0) * TILE + s1 * TILE) / 2;
        s.add.sprite(gx, WATER_Y + 16, 'water_rocks').setDepth(DEPTH.waterRocks).setScale(1.3).play('water_rocks');
      }
    }
  }

  private buildTerrain(): void {
    const s = this.scene;
    const COLS = 9;
    for (const [start, n] of this.def.segments) {
      for (let i = 0; i < n; i++) {
        const col = n === 1 ? 8 : i === 0 ? 5 : i === n - 1 ? 7 : 6;
        const x = (start + i) * TILE;
        s.add.image(x, GRASS_Y, 'tilemap', 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
        s.add.image(x, GRASS_Y + TILE, 'tilemap', 5 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
      }
      // Arbustos a cada ~2.5 tiles, como no mockup.
      for (let t = start + 0.9; t < start + n - 0.4; t += 2.45) {
        s.add
          .sprite(t * TILE, GRASS_Y + 44, 'bush')
          .setScale(0.42)
          .setDepth(DEPTH.deco)
          .play({ key: 'bush', startFrame: Math.floor(t) % 8 });
      }
      // Colisor físico (fino) na linha dos pés.
      const w = n * TILE;
      const zone = s.add.zone(start * TILE + w / 2, FLOOR_Y + 12, w, 24);
      s.physics.add.existing(zone, true);
      this.ground.add(zone);
    }

    // Marcos de chegada nas duas pontas.
    const endX = this.width - TILE / 2;
    for (const x of [TILE / 2 + 8, endX - 8]) {
      s.add.image(x - 22, FLOOR_Y + 4, 'skull_spike').setOrigin(0.5, 1).setDepth(DEPTH.deco);
      s.add.image(x + 22, FLOOR_Y + 4, 'skull_spike').setOrigin(0.5, 1).setDepth(DEPTH.deco);
      s.add.image(x, FLOOR_Y - 2, 'bones').setOrigin(0.5, 1).setDepth(DEPTH.deco);
    }
  }
}
