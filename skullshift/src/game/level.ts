import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, GRASS_Y, H, TILE, W, WATER_Y } from '../config';
import type { CharId, ItemId } from './characters';

/**
 * Plataforma: início e comprimento em tiles de 64px (locais à tela, 0..19) e altura h
 * (em tiles acima do chão base). Plataformas altas são blocos maciços: dá para subir
 * pulando e elas bloqueiam pelos lados.
 */
export type Segment = [start: number, length: number, h?: number];

export type DecoKind = 'tree' | 'dead_tree' | 'rock1' | 'rock2' | 'stump' | 'bones' | 'skull_spike';
export type Theme = 'shore' | 'cave' | 'sky';

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
}

export interface LevelDef {
  name: string;
  theme: Theme;
  /** Spritesheet do tileset (variação de cor). */
  tiles: string;
  /** 5 cenários, da esquerda para a direita. O do meio (índice 2) é o central. */
  screens: ScreenDef[];
  /** Modo história: cenário e tile de início (o fim é a ponta oposta). */
  storyStart: [screen: number, tile: number];
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
  name: 'Fase 1 — Ilhas da Maré',
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
  name: 'Fase 2 — Caverna Úmida',
  theme: 'cave',
  tiles: 'tiles_cave',
  screens: [
    { ...mirror(CAVE_R2), enemies: [[11, 'bat']], storyItems: [[4, 'web']] },
    { ...mirror(CAVE_R1), enemies: [[6, 'spider'], [17, 'torchgob']], storyItems: [[11, 'wing', 2]] },
    {
      // Central: chão com dois degraus e uma plataforma flutuante no meio.
      segments: [[0, 5, 0], [5, 3, 1], [8, 4, 0], [12, 3, 1], [15, 5, 0]],
      floats: [[8, 4, 3]],
      deco: [[2, 'rock1'], [17, 'rock2']],
      enemies: [[9, 'spider'], [13, 'bat']],
      storyItems: [[2, 'torch']],
      versusItems: [[9, 'torch', 3]],
    },
    { ...CAVE_R1, enemies: [[3, 'torchgob'], [13, 'spider']], storyItems: [[8, 'web', 2]] },
    { ...CAVE_R2, enemies: [[8, 'bat'], [12, 'torchgob'], [17, 'spider']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

// ---------- Fase 3: Reino das Nuvens (ilhas no céu; cair no vazio mata) ----------

const SKY_R1: ScreenDef = {
  segments: [[0, 4, 0], [7, 3, 1], [13, 2, 2], [15, 5, 0]],
  floats: [[4, 3, 1], [10, 3, 2]],
  deco: [[1, 'tree'], [17, 'tree']],
  versusItems: [[11, 'honey', 2]],
};
const SKY_R2: ScreenDef = {
  segments: [[0, 5, 0], [8, 3, 1], [14, 6, 0]],
  floats: [[5, 3, 0], [11, 3, 2], [9, 2, 4]],
  deco: [[2, 'tree'], [18, 'skull_spike'], [19, 'skull_spike']],
  versusItems: [[9, 'acorn', 4]],
};
export const LEVEL_3: LevelDef = {
  name: 'Fase 3 — Reino das Nuvens',
  theme: 'sky',
  tiles: 'tiles_sky',
  screens: [
    { ...mirror(SKY_R2), enemies: [[16, 'imp']], storyItems: [[3, 'acorn']] },
    { ...mirror(SKY_R1), enemies: [[11, 'bee'], [17, 'sgnome']], storyItems: [[2, 'honey']] },
    {
      // Central: duas ilhas ligadas por uma ponte de nuvem e uma nuvem alta no meio.
      segments: [[0, 6, 0], [8, 4, 1], [14, 6, 0]],
      floats: [[6, 2, 0], [12, 2, 0], [9, 2, 3]],
      deco: [[3, 'tree'], [17, 'tree']],
      enemies: [[9, 'sgnome'], [16, 'bee']],
      storyItems: [[4, 'ember']],
      versusItems: [[10, 'ember', 1]],
    },
    { ...SKY_R1, enemies: [[2, 'bee'], [8, 'imp']], storyItems: [[16, 'acorn']] },
    { ...SKY_R2, enemies: [[3, 'sgnome'], [9, 'imp'], [16, 'bee']], storyItems: [] },
  ],
  storyStart: [0, 2],
  versusStart: [3, 16],
};

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];

export class Level {
  readonly def: LevelDef;
  readonly width: number;
  readonly ground: Phaser.Physics.Arcade.StaticGroup;
  /** Plataformas maciças e flutuantes em tiles globais. */
  readonly segments: Segment[];
  readonly floats: Segment[];
  private clouds: Array<{ img: Phaser.GameObjects.Image; speed: number }> = [];
  private waves: Phaser.GameObjects.TileSprite[] = [];
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
    return this.def.theme !== 'sky';
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
  }

  // ---------- fundo ----------

  private buildBackground(): void {
    const t = this.def.theme;
    if (t === 'cave') this.caveBackground();
    else this.skyBackground(t === 'sky');
    if (this.hasWater) this.water(t === 'cave');
    else this.cloudSea();
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

  private water(dark: boolean): void {
    const s = this.scene;
    s.add
      .rectangle(0, WATER_Y, W, H - WATER_Y + 200, dark ? 0x1d5d6b : 0x39b5fd)
      .setOrigin(0)
      .setScrollFactor(0, 1)
      .setDepth(DEPTH.water);
    s.add.rectangle(0, WATER_Y, W, 4, dark ? 0x5fa9b5 : 0x8fd9ff).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water);
    this.waves = [
      s.add.tileSprite(0, WATER_Y + 8, W, 260, 'waves').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(dark ? 0.3 : 0.55),
      s.add.tileSprite(0, WATER_Y + 30, W, 240, 'waves').setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.water).setAlpha(dark ? 0.18 : 0.3).setTileScale(1.6, 1.3),
    ];
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
      [0.5, 560, 0.85, DEPTH.water],
      [1, 600, 1, DEPTH.waterRocks],
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
      if (this.hasWater) {
        for (let i = 0; i < n; i++) {
          s.add
            .sprite((start + i) * TILE + TILE / 2, GRASS_Y + TILE + 28, 'water_foam')
            .setDepth(DEPTH.waterRocks)
            .setTint(this.theme === 'cave' ? 0x9fc6cc : 0xffffff)
            .play({ key: 'water_foam', startFrame: (start + i) % 16 });
        }
      }
      for (let i = 0; i < n; i++) {
        const col = n === 1 ? 8 : i === 0 ? 5 : i === n - 1 ? 7 : 6;
        const x = (start + i) * TILE;
        s.add.image(x, gy, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
        // Rocha até a base (a última fileira tem a borda com espuma).
        for (let r = 1; r <= h + 1; r++) {
          const row = r === h + 1 ? 5 : 4;
          s.add.image(x, gy + r * TILE, key, row * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
        }
      }
      if (this.theme === 'sky') {
        // Nuvens sob as ilhas, para parecer que flutuam.
        for (let x = start * TILE - 40; x < (start + n) * TILE; x += 150) {
          s.add.image(x, GRASS_Y + TILE * 2 + 6, 'cloud_05').setOrigin(0, 0.5).setScale(0.4).setDepth(DEPTH.terrain + 0.5);
        }
      }
      if (this.theme !== 'cave') {
        for (let t = start + 0.9; t < start + n - 0.4; t += 2.45) {
          s.add
            .sprite(t * TILE, gy + 44, 'bush')
            .setScale(0.42)
            .setDepth(DEPTH.deco)
            .play({ key: 'bush', startFrame: Math.floor(t) % 8 });
        }
      }
      // Bloco maciço: o topo é o chão e os lados são paredes.
      const top = topOf(h);
      const w = n * TILE;
      const zh = 600 - top;
      const zone = s.add.zone(start * TILE + w / 2, top + zh / 2, w, zh);
      s.physics.add.existing(zone, true);
      this.ground.add(zone);
    }

    // Plataformas flutuantes (só seguram por cima).
    for (const [start, n, hh] of this.floats) {
      const h = hh ?? 0;
      const top = topOf(h);
      if (this.theme === 'sky') this.cloudPlatform(start, n, top);
      else {
        for (let i = 0; i < n; i++) {
          const col = n === 1 ? 3 : i === 0 ? 0 : i === n - 1 ? 2 : 1;
          s.add.image((start + i) * TILE, top - 40, key, 3 * COLS + col).setOrigin(0).setDepth(DEPTH.terrain);
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
    });

    // Marcos de chegada nas duas pontas.
    for (const x of [TILE / 2 + 8, this.width - TILE / 2 - 8]) {
      const y = this.groundY(x) ?? FLOOR_Y;
      this.addDeco(x - 22, 'skull_spike', 0, y);
      this.addDeco(x + 22, 'skull_spike', 0, y);
    }
  }

  /** Nuvem fofa que serve de plataforma (fase do céu). */
  private cloudPlatform(start: number, n: number, top: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.terrain);
    const x0 = start * TILE;
    const w = n * TILE;
    g.fillStyle(0xb9d4e6, 1);
    for (let x = x0 + 14; x <= x0 + w - 14; x += 22) g.fillCircle(x, top + 18, 18);
    g.fillStyle(0xffffff, 1);
    for (let x = x0 + 14; x <= x0 + w - 14; x += 22) g.fillCircle(x, top + 10, 16 + ((x / 22) % 2) * 4);
    g.fillRect(x0 + 14, top + 4, w - 28, 18);
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
      default:
        s.add.image(x, base + 8, kind).setOrigin(0.5, 1).setDepth(DEPTH.deco).setTint(tint);
    }
  }
}
