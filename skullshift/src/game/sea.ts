import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, TILE, W } from '../config';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import { sfx } from './settings';
import { Px } from '../ui/pixelart';
import { recolorSheet } from './sheets';

/**
 * Tilesets da Maré, feitos trocando as cores do tileset de grama: madeira de navio (convés
 * claro, casco escuro) e areia de praia.
 */
export function makeSeaTiles(scene: Phaser.Scene): void {
  recolorSheet(scene, 'tilemap', 'tiles_ship', 64, 64, {
    0x9bb94e: 0xb07a40,
    0x80ac5e: 0x8a5a2a,
    0xb8b958: 0xd09a5a,
    0x618559: 0x6a4020,
    0x669d9d: 0x7a4a22,
    0x506a69: 0x5a3416,
    0x354f59: 0x3a2210,
    0x3c7662: 0x4a2a14,
    0x8cc3c4: 0xa0703a,
    0xc6f0db: 0xc89a6a,
  });
  recolorSheet(scene, 'tilemap', 'tiles_sand', 64, 64, {
    0x9bb94e: 0xe8d090,
    0x80ac5e: 0xd8b870,
    0xb8b958: 0xf4e4b0,
    0x618559: 0xb89a58,
  });
}

type At = [screen: number, tile: number, h: number];

/**
 * Elementos do mar das Ilhas da Maré: maré (automática ou por alavancas), caixotes que boiam
 * na maré, tábuas que afundam ao pisar, canhões, águas-vivas, corais de fogo e o cenário de
 * navio e farol.
 */
export interface SeaDef {
  /**
   * Maré: até onde a água sobe (px acima do normal). Sem alavancas, sobe e desce sozinha:
   * fica `hold` ms parada em cada ponto e leva `move` ms para subir ou descer.
   */
  tide?: { high: number; hold: number; move: number; startHigh?: boolean; manual?: boolean };
  /** Alavancas: um golpe sobe ou baixa a maré (desliga o ciclo automático). */
  levers?: At[];
  /** Caixotes que boiam na superfície e sobem e descem com a maré (plataformas). */
  crates?: Array<[screen: number, tile: number, n: number]>;
  /** Tábuas soltas: afundam um instante depois de pisadas e voltam depois. */
  planks?: Array<[screen: number, tile: number, n: number, h: number]>;
  /** Canhões: disparam balas na direção dir a cada `every` ms. */
  cannons?: Array<[screen: number, tile: number, h: number, dir: 1 | -1, every: number, offset?: number]>;
  /** Águas-vivas: sobem e descem entre duas alturas (encostar derruba). */
  jellies?: Array<[screen: number, tile: number, hTop: number, hBottom: number]>;
  /** Corais de fogo: espinhos fixos no chão (encostar derruba). */
  corals?: At[];
  /** Casco do navio: madeira por baixo das plataformas de convés (só desenho). */
  hulls?: Array<[screen: number, tile: number, n: number, h: number]>;
  /** Mastros com vela (só desenho; os cestos de gávea são plataformas da fase). */
  masts?: Array<[screen: number, tile: number, h: number, height: number]>;
  /** Farol ao fundo, com o facho girando. */
  lighthouse?: At;
  /** Troca a arte dos caixotes (ex.: 'basalt' boiando na lava). */
  crateTex?: string;
  /** Troca a arte das tábuas (ex.: 'web_plank' nas pontes de teia). */
  plankTex?: string;
  /** Troca a arte das águas-vivas por uma imagem parada (ex.: 'cocoon' pendurado). */
  jellyTex?: string;
}

export interface SeaHost {
  scene: Phaser.Scene;
  level: Level;
  player(): Fighter;
  killPlayer(): void;
  popText(x: number, y: number, text: string, color: string): void;
}

const INK = 0x1d1a2b;
const topOf = (h: number) => FLOOR_Y - h * TILE;

/** Desenhos do mar (pixel art em código). */
export function makeSeaArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('cannon')) return;
  // Canhão de ferro numa carreta de madeira (olhando para a direita).
  const c = new Px(28, 18);
  c.rect(4, 3, 20, 8, 0x3a3a48);
  c.rect(4, 3, 20, 2, 0x6a6a7a);
  c.rect(22, 2, 4, 10, 0x2a2a34);
  c.rect(1, 5, 4, 4, 0x2a2a34);
  c.rect(3, 11, 18, 4, 0x8a5a2a);
  c.disc(7, 15, 3, 0x5a3a1a);
  c.disc(18, 15, 3, 0x5a3a1a);
  c.set(7, 15, 0xd8a530);
  c.set(18, 15, 0xd8a530);
  c.outline(INK);
  c.toTexture(scene, 'cannon', 3);
  const ball = new Px(8, 8);
  ball.disc(4, 4, 3, 0x2a2a34);
  ball.rect(2, 2, 2, 1, 0x8a8a9a);
  ball.outline(INK);
  ball.toTexture(scene, 'cannonball', 3);
  // Água-viva: sino lilás translúcido e tentáculos (2 quadros: contrai e solta).
  const jelly = (k: number) => {
    const j = new Px(18, 22);
    for (let y = 0; y < 9; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, 64 - (8 - y) * (8 - y))) * (k ? 0.85 : 1));
      for (let x = 9 - half; x <= 8 + half; x++) j.set(x, y + 1, y < 3 ? 0xf0c8ff : 0xc890f0);
    }
    j.rect(5, 3, 2, 2, 0xffffff);
    for (const tx of [4, 7, 10, 13]) for (let y = 10; y < 20 - k * 3; y++) j.set(tx + ((y + tx + k) % 4 < 2 ? 0 : 1), y, 0xa070d0);
    j.outline(INK);
    return j;
  };
  const sheet = [jelly(0), jelly(1)];
  const cv = document.createElement('canvas');
  cv.width = 18 * 3 * 2;
  cv.height = 22 * 3;
  const ctx = cv.getContext('2d')!;
  sheet.forEach((f, i) => f.draw(ctx, i * 18 * 3, 0, 3));
  scene.textures.addSpriteSheet('jelly', cv as unknown as HTMLImageElement, { frameWidth: 54, frameHeight: 66 });
  scene.anims.create({ key: 'jelly', frames: scene.anims.generateFrameNumbers('jelly', { start: 0, end: 1 }), frameRate: 3, repeat: -1 });
  // Coral de fogo: galhos laranja com pontas brancas.
  const coral = new Px(20, 16);
  const branch = (x: number, top: number) => {
    for (let y = top; y < 16; y++) coral.set(x + (y % 3 === 0 ? 1 : 0), y, 0xff6a3a);
    coral.set(x, top, 0xfff7dc);
  };
  [[3, 4], [6, 1], [9, 6], [12, 2], [15, 5], [17, 8]].forEach(([x, t]) => branch(x, t));
  coral.rect(1, 13, 18, 3, 0xd84a2a);
  coral.outline(INK);
  coral.toTexture(scene, 'coral', 3);
  // Caixote de madeira.
  const crate = new Px(21, 14);
  crate.rect(0, 0, 21, 14, 0xb87a3a);
  crate.rect(0, 0, 21, 2, 0xd89a5a);
  for (const x of [0, 10, 20]) crate.rect(x, 0, 1, 14, 0x7a4a1a);
  crate.rect(0, 13, 21, 1, 0x7a4a1a);
  for (let i = 0; i < 10; i++) crate.set(i, Math.round(i * 1.3), 0x7a4a1a);
  crate.outline(INK);
  crate.toTexture(scene, 'crate', 3);
  // Bloco de basalto (boia na lava) e laje de obsidiana (afunda).
  const bas = new Px(21, 14);
  bas.rect(0, 0, 21, 14, 0x4a3a3a);
  bas.rect(0, 0, 21, 2, 0x7a5a4a);
  for (const [x, y] of [[4, 5], [12, 8], [17, 4]]) bas.rect(x, y, 2, 2, 0x2a1e1e);
  bas.rect(0, 12, 21, 2, 0xd84a2a);
  bas.outline(INK);
  bas.toTexture(scene, 'basalt', 3);
  const obs = new Px(21, 5);
  obs.rect(0, 0, 21, 5, 0x2a2a38);
  obs.rect(0, 0, 21, 1, 0x6a5aa0);
  obs.set(6, 2, 0x9a7aff);
  obs.set(15, 3, 0x9a7aff);
  obs.outline(INK);
  obs.toTexture(scene, 'obsidian_plank', 3);
  // Fio de teia esticado (ponte que se rompe).
  const wp = new Px(21, 5);
  for (let x = 0; x < 21; x++) {
    wp.set(x, 1 + (x % 7 === 3 ? 1 : 0), 0xe8e8f0);
    wp.set(x, 3, 0xc8c8d8);
    if (x % 4 === 0) wp.rect(x, 1, 1, 3, 0xffffff);
  }
  wp.outline(INK);
  wp.toTexture(scene, 'web_plank', 3);
  // Tábua solta.
  const plank = new Px(21, 5);
  plank.rect(0, 0, 21, 5, 0x9a6a3a);
  plank.rect(0, 0, 21, 1, 0xc89a6a);
  plank.set(4, 2, 0x5a3a1a);
  plank.set(16, 2, 0x5a3a1a);
  plank.outline(INK);
  plank.toTexture(scene, 'plank', 3);
}

interface Lever {
  x: number;
  floor: number;
  img: Phaser.GameObjects.Image;
}

export class SeaSystem {
  private tideTarget = 0;
  private tidePhase: 'low' | 'rising' | 'high' | 'falling' = 'low';
  private phaseAt = 0;
  private warned = false;
  private levers: Lever[] = [];
  private crates: Array<{ x: number; w: number; zone: Phaser.GameObjects.Zone; imgs: Phaser.GameObjects.Image[]; phase: number }> = [];
  private planks: Array<{ x: number; w: number; top: number; zone: Phaser.GameObjects.Zone; imgs: Phaser.GameObjects.Image[]; state: 'up' | 'shaking' | 'down'; at: number }> = [];
  private cannons: Array<{ x: number; y: number; dir: number; every: number; next: number; img: Phaser.GameObjects.Image }> = [];
  private balls: Array<{ img: Phaser.GameObjects.Image; vx: number; vy: number; life: number }> = [];
  private jellies: Array<{ sprite: Phaser.GameObjects.Sprite; top: number; bottom: number; t: number }> = [];
  private corals: Array<{ x: number; top: number }> = [];
  private prevAttack = false;
  private beam?: Phaser.GameObjects.Graphics;
  private beamAt?: [number, number];

  constructor(
    private host: SeaHost,
    private def: SeaDef,
  ) {
    const s = host.scene;
    const lvl = host.level;
    makeSeaArt(s);
    const X = (sc: number, t: number) => lvl.tileX(sc, t);
    const now = s.time.now;

    if (def.tide?.startHigh) {
      lvl.tide = def.tide.high;
      this.tideTarget = def.tide.high;
      this.tidePhase = 'high';
    }
    this.phaseAt = now;

    if (def.lighthouse) this.drawLighthouse(X(def.lighthouse[0], def.lighthouse[1]), topOf(def.lighthouse[2]));
    for (const [sc, t, n, h] of def.hulls ?? []) this.drawHull(X(sc, t) - TILE / 2, n * TILE, topOf(h));
    for (const [sc, t, h, height] of def.masts ?? []) this.drawMast(X(sc, t), topOf(h), height * TILE);

    for (const [sc, t, h] of def.levers ?? []) {
      const x = X(sc, t);
      const img = s.add.image(x, topOf(h) + 2, 'lever_off').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.levers.push({ x, floor: topOf(h), img });
    }
    for (const [sc, t, n] of def.crates ?? []) {
      const x = X(sc, t) - TILE / 2 + (n * TILE) / 2;
      const w = n * TILE;
      const zone = this.ledge(x, 0, w);
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let k = 0; k < n; k++) imgs.push(s.add.image(0, 0, def.crateTex ?? 'crate').setOrigin(0, 0).setDepth(DEPTH.terrain + 0.4));
      this.crates.push({ x, w, zone, imgs, phase: Math.random() * 6 });
    }
    for (const [sc, t, n, h] of def.planks ?? []) {
      const x = X(sc, t) - TILE / 2 + (n * TILE) / 2;
      const w = n * TILE;
      const top = topOf(h);
      const zone = this.ledge(x, top, w);
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let k = 0; k < n; k++) imgs.push(s.add.image(x - w / 2 + k * TILE, top - 2, def.plankTex ?? 'plank').setOrigin(0, 0).setDepth(DEPTH.terrain + 0.4));
      this.planks.push({ x, w, top, zone, imgs, state: 'up', at: 0 });
    }
    for (const [sc, t, h, dir, every, offset] of def.cannons ?? []) {
      const x = X(sc, t);
      const y = topOf(h);
      const img = s.add.image(x, y + 2, 'cannon').setOrigin(0.5, 1).setFlipX(dir < 0).setDepth(DEPTH.deco + 0.6);
      this.cannons.push({ x, y, dir, every, next: now + 1500 + (offset ?? 0), img });
    }
    for (const [sc, t, hTop, hBottom] of def.jellies ?? []) {
      const sprite = def.jellyTex
        ? s.add.sprite(X(sc, t), topOf(hBottom), def.jellyTex).setScale(1.4).setDepth(DEPTH.fighters + 0.2)
        : s.add.sprite(X(sc, t), topOf(hBottom), 'jelly').setDepth(DEPTH.fighters + 0.2).play({ key: 'jelly', startFrame: t % 2 });
      // Casulo pendurado: um fio de teia até o teto.
      if (def.jellyTex === 'cocoon') {
        const thread = s.add.graphics().setDepth(DEPTH.fighters + 0.1);
        const draw = () => {
          if (!sprite.active || !thread.active) return;
          thread.clear().lineStyle(2, 0xe8e8f0, 0.8).lineBetween(sprite.x, 0, sprite.x, sprite.y - 30);
        };
        s.events.on('update', draw);
        s.events.once('shutdown', () => s.events.off('update', draw));
      }
      this.jellies.push({ sprite, top: topOf(hTop) - 40, bottom: topOf(hBottom) - 40, t: (sc * 7 + t) * 0.9 });
    }
    for (const [sc, t, h] of def.corals ?? []) {
      const x = X(sc, t);
      s.add.image(x, topOf(h) + 4, 'coral').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.6);
      this.corals.push({ x, top: topOf(h) });
    }
  }

  /** Plataforma que só segura por cima (dá para subir por baixo). */
  private ledge(x: number, top: number, w: number): Phaser.GameObjects.Zone {
    const s = this.host.scene;
    const zone = s.add.zone(x, top + 8, w, 16);
    s.physics.add.existing(zone, true);
    const b = zone.body as Phaser.Physics.Arcade.StaticBody;
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    this.host.level.ground.add(zone);
    return zone;
  }

  private moveLedge(zone: Phaser.GameObjects.Zone, x: number, top: number): void {
    zone.setPosition(x, top + 8);
    (zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  /** Maré subindo: alguém de fora (o chefe) pode mandar na maré. */
  setTide(target: number): void {
    this.tideTarget = target;
  }

  update(time: number, dt: number): void {
    const p = this.host.player();
    const attackEdge = p.intent.attack && !this.prevAttack;
    this.prevAttack = p.intent.attack;
    this.updateTide(time, dt, p, attackEdge);
    this.updateCrates(time);
    this.updatePlanks(time, p);
    this.updateCannons(time, dt, p);
    this.updateJellies(dt, p);
    this.updateCorals(p);
    if (this.beam && this.beamAt) {
      const [bx, by] = this.beamAt;
      const a = time / 1400;
      const g = this.beam;
      g.clear();
      const spread = 0.16;
      const len = 900;
      const side = Math.cos(a);
      // Facho morno em três camadas (miolo mais forte), sem tapar o céu.
      for (const [k, al] of [[1, 0.05], [0.62, 0.06], [0.3, 0.08]] as const) {
        const w = len * spread * Math.abs(side) * k;
        g.fillStyle(0xffe2a0, al * (0.5 + Math.abs(side) * 0.5));
        g.fillTriangle(bx, by, bx + side * len, by - w, bx + side * len, by + w);
      }
    }
  }

  // ---------- maré ----------

  private updateTide(time: number, dt: number, p: Fighter, attackEdge: boolean): void {
    const lvl = this.host.level;
    const td = this.def.tide;
    if (td && !this.levers.length && !td.manual) {
      // Ciclo automático, com aviso antes de subir.
      const since = time - this.phaseAt;
      if (this.tidePhase === 'low') {
        if (!this.warned && since > td.hold - 1800) {
          this.warned = true;
          this.host.popText(p.x, p.feet - 170, 'A MARÉ VAI SUBIR!', '#bfe9ff');
          sfx('select');
        }
        if (since > td.hold) this.go('rising', time);
      } else if (this.tidePhase === 'rising') {
        lvl.tide = td.high * Phaser.Math.Easing.Sine.InOut(Math.min(1, since / td.move));
        if (since >= td.move) this.go('high', time);
      } else if (this.tidePhase === 'high') {
        if (since > td.hold) this.go('falling', time);
      } else {
        lvl.tide = td.high * (1 - Phaser.Math.Easing.Sine.InOut(Math.min(1, since / td.move)));
        if (since >= td.move) {
          this.go('low', time);
          this.warned = false;
        }
      }
      return;
    }
    // Sem maré nesta fase (a água fica onde a fase deixou, ex.: Caverna Submarina).
    if (!td) return;
    // Alavancas (ou o chefe): a maré vai até o alvo.
    if (attackEdge && p.alive) {
      for (const l of this.levers) {
        if (Math.abs(p.x - l.x) > 80 || Math.abs(p.feet - l.floor) > 50) continue;
        this.tideTarget = this.tideTarget > 0 ? 0 : td.high;
        sfx('door');
        this.host.scene.cameras.main.shake(300, 0.004);
        this.host.popText(l.x, l.floor - 120, this.tideTarget > 0 ? 'COMPORTAS ABERTAS: MARÉ ALTA!' : 'COMPORTAS FECHADAS: MARÉ BAIXA', '#bfe9ff');
        break;
      }
    }
    for (const l of this.levers) l.img.setTexture(this.tideTarget > 0 ? 'lever_on' : 'lever_off');
    const speed = td.high / (td.move / 1000);
    const d = this.tideTarget - lvl.tide;
    lvl.tide += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
  }

  private go(phase: SeaSystem['tidePhase'], time: number): void {
    this.tidePhase = phase;
    this.phaseAt = time;
    if (phase === 'rising') this.host.scene.cameras.main.shake(400, 0.003);
  }

  /** Maré atual chegou ao alto? (para quem quiser saber) */
  get tideHigh(): boolean {
    return this.host.level.tide > (this.def.tide?.high ?? 0) * 0.5;
  }

  // ---------- caixotes e tábuas ----------

  private updateCrates(time: number): void {
    const wy = this.host.level.waterY;
    for (const c of this.crates) {
      const bob = Math.round(Math.sin(time / 500 + c.phase) * 2);
      const top = wy - 30 + bob;
      this.moveLedge(c.zone, c.x, top);
      c.imgs.forEach((img, k) => img.setPosition(c.x - c.w / 2 + k * TILE + 1, top - 2));
    }
  }

  private updatePlanks(time: number, p: Fighter): void {
    for (const pl of this.planks) {
      const on = p.alive && p.onGround && Math.abs(p.x - pl.x) < pl.w / 2 + 10 && Math.abs(p.feet - pl.top) < 6;
      if (pl.state === 'up' && on) {
        pl.state = 'shaking';
        pl.at = time;
      }
      if (pl.state === 'shaking') {
        const dx = Math.round(Math.sin(time / 30) * 2);
        pl.imgs.forEach((img, k) => img.setX(pl.x - pl.w / 2 + k * TILE + dx));
        if (time - pl.at > 650) {
          pl.state = 'down';
          pl.at = time;
          (pl.zone.body as Phaser.Physics.Arcade.StaticBody).enable = false;
          sfx('hit');
          this.host.scene.tweens.add({ targets: pl.imgs, y: '+=90', alpha: 0, duration: 600, ease: 'Quad.easeIn' });
        }
      } else if (pl.state === 'down' && time - pl.at > 3200) {
        pl.state = 'up';
        (pl.zone.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        pl.imgs.forEach((img, k) => img.setPosition(pl.x - pl.w / 2 + k * TILE, pl.top - 2).setAlpha(0));
        this.host.scene.tweens.add({ targets: pl.imgs, alpha: 1, duration: 300 });
      } else if (pl.state === 'up') {
        const bob = Math.round(Math.sin(time / 600 + pl.x) * 1.5);
        pl.imgs.forEach((img) => img.setY(pl.top - 2 + bob));
      }
    }
  }

  // ---------- canhões ----------

  private updateCannons(time: number, dt: number, p: Fighter): void {
    const s = this.host.scene;
    const lvl = this.host.level;
    const screen = lvl.screenOf(p.x);
    for (const c of this.cannons) {
      if (lvl.screenOf(c.x) !== screen) {
        c.next = Math.max(c.next, time + 900);
        continue;
      }
      // Aviso: o canhão treme e solta uma fagulha antes do tiro.
      if (time > c.next - 450) c.img.setX(c.x + Math.round(Math.sin(time / 25) * 1.5));
      if (time < c.next) continue;
      c.next = time + c.every;
      c.img.setX(c.x);
      const mx = c.x + c.dir * 44;
      const my = c.y - 30;
      const ball = s.add.image(mx, my, 'cannonball').setDepth(DEPTH.projectiles);
      this.balls.push({ img: ball, vx: c.dir * 430, vy: -40, life: 5 });
      const puff = s.add.sprite(mx, my, 'dust').setScale(1.1).setDepth(DEPTH.fx).play('dust');
      puff.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => puff.destroy());
      sfx('boom');
      s.tweens.add({ targets: c.img, x: c.x - c.dir * 8, duration: 80, yoyo: true });
    }
    for (const b of this.balls) {
      b.life -= dt;
      b.vy += 90 * dt;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      const land = lvl.landingY(b.img.x, b.img.y - b.vy * dt - 12, b.img.y + 12);
      if (land !== null || b.img.y > lvl.waterY + 10) b.life = 0;
      if (p.alive && !p.invulnerable && Math.abs(p.x - b.img.x) < 26 && Math.abs(p.feet - 34 - b.img.y) < 34) {
        if (p.blocksFrom(b.img.x - Math.sign(b.vx) * 10)) {
          b.vx = -b.vx * 0.4;
          b.vy = -260;
          sfx('hit');
        } else {
          b.life = 0;
          this.host.killPlayer();
        }
      }
    }
    this.balls = this.balls.filter((b) => {
      if (b.life > 0 && Math.abs(b.img.x - p.x) < W * 1.5) return true;
      b.img.destroy();
      return false;
    });
  }

  // ---------- águas-vivas e corais ----------

  private updateJellies(dt: number, p: Fighter): void {
    for (const j of this.jellies) {
      j.t += dt;
      const k = (Math.sin(j.t * 0.9) + 1) / 2;
      j.sprite.y = Phaser.Math.Linear(j.top, j.bottom, k);
      j.sprite.x += Math.sin(j.t * 1.7) * 0.3;
      if (p.alive && !p.invulnerable && Math.abs(p.x - j.sprite.x) < 30 && Math.abs(p.feet - 30 - j.sprite.y) < 40) this.host.killPlayer();
    }
  }

  private updateCorals(p: Fighter): void {
    if (!p.alive || p.invulnerable) return;
    for (const c of this.corals) {
      if (Math.abs(p.x - c.x) < 26 && p.feet > c.top - 40 && p.feet <= c.top + 4) {
        this.host.killPlayer();
        return;
      }
    }
  }

  // ---------- cenário ----------

  /** Casco de madeira por baixo do convés, com tábuas, escotilhas e uma faixa pintada. */
  private drawHull(x0: number, w: number, top: number): void {
    const s = this.host.scene;
    const g = s.add.graphics().setDepth(DEPTH.terrain - 0.2);
    const bottom = 760;
    g.fillStyle(INK, 1).fillRect(x0 - 4, top + 26, w + 8, bottom - top);
    g.fillStyle(0x7a4a22, 1).fillRect(x0, top + 30, w, bottom - top);
    for (let y = top + 30; y < bottom; y += 22) g.fillStyle(0x5a3416, 1).fillRect(x0, y, w, 3);
    for (let x = x0 + 40; x < x0 + w; x += 96) g.fillStyle(0x5a3416, 1).fillRect(x, top + 30, 3, bottom - top);
    g.fillStyle(0xb02a2a, 1).fillRect(x0, top + 60, w, 10);
    g.fillStyle(0xe8d9a8, 1).fillRect(x0, top + 70, w, 3);
    for (let x = x0 + 70; x < x0 + w - 40; x += 160) {
      g.fillStyle(INK, 1).fillCircle(x, top + 110, 15);
      g.fillStyle(0xd8a530, 1).fillCircle(x, top + 110, 12);
      g.fillStyle(0x10223a, 1).fillCircle(x, top + 110, 8);
    }
    // Amurada (corrimão) em cima do convés.
    const r = s.add.graphics().setDepth(DEPTH.deco - 0.1);
    r.fillStyle(INK, 1).fillRect(x0, top - 34, w, 6);
    r.fillStyle(0xa0703a, 1).fillRect(x0, top - 33, w, 4);
    for (let x = x0 + 8; x < x0 + w; x += 32) {
      r.fillStyle(INK, 1).fillRect(x - 1, top - 30, 6, 30);
      r.fillStyle(0x8a5a2a, 1).fillRect(x, top - 30, 4, 30);
    }
  }

  /** Mastro com vela listrada e bandeira de caveira no topo. */
  private drawMast(x: number, base: number, height: number): void {
    const s = this.host.scene;
    const top = base - height;
    const g = s.add.graphics().setDepth(DEPTH.terrain - 0.4);
    g.fillStyle(INK, 1).fillRect(x - 9, top, 18, height);
    g.fillStyle(0x8a5a2a, 1).fillRect(x - 7, top, 14, height);
    g.fillStyle(0xa0703a, 1).fillRect(x - 7, top, 4, height);
    // Vela.
    const sw = 220;
    const sy = top + 60;
    const sh = Math.min(260, height - 120);
    g.fillStyle(INK, 1).fillRect(x - sw / 2 - 3, sy - 3, sw + 6, sh + 6);
    g.fillStyle(0xf4ead0, 1).fillRect(x - sw / 2, sy, sw, sh);
    for (let k = 0; k < sh; k += 40) g.fillStyle(0xd8c8a0, 1).fillRect(x - sw / 2, sy + k + 20, sw, 20);
    g.fillStyle(0x2a2a3a, 1).fillCircle(x, sy + sh / 2, 26);
    g.fillStyle(0xf4ead0, 1).fillCircle(x, sy + sh / 2 - 4, 13).fillRect(x - 8, sy + sh / 2 + 6, 16, 8);
    g.fillStyle(0x2a2a3a, 1).fillRect(x - 7, sy + sh / 2 - 6, 5, 5).fillRect(x + 2, sy + sh / 2 - 6, 5, 5);
    // Bandeira.
    const flag = s.add.graphics().setDepth(DEPTH.terrain - 0.3);
    flag.fillStyle(INK, 1).fillRect(x + 7, top - 2, 48, 30);
    flag.fillStyle(0x1d1a2b, 1).fillRect(x + 9, top, 44, 26);
    flag.fillStyle(0xf4ead0, 1).fillCircle(x + 31, top + 11, 6).fillRect(x + 27, top + 16, 8, 4);
    s.tweens.add({ targets: flag, scaleX: 0.9, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Farol listrado ao fundo, com o facho de luz girando. */
  private drawLighthouse(x: number, base: number): void {
    const s = this.host.scene;
    // Feito com a torre do próprio Tiny Swords: uma torre larga embaixo, outra menor em cima
    // (a lanterna) e uma fogueira acesa no topo, de onde sai o facho.
    const d = DEPTH.terrain - 0.5;
    const FEET = 230 / 256; // base da torre dentro do quadro
    const DECK = 149; // altura do chão ao terraço, em px do sprite
    const s1 = 1.7;
    const s2 = 1.05;
    const deck1 = base - DECK * s1;
    const deck2 = deck1 + 18 - DECK * s2;
    s.add.ellipse(x, base - 2, 250, 26, 0x10223a, 0.25).setDepth(d);
    s.add.image(x, base, 'bld_red_tower').setOrigin(0.5, FEET).setScale(s1).setDepth(d);
    s.add.image(x, deck1 + 18, 'bld_red_tower').setOrigin(0.5, FEET).setScale(s2).setDepth(d);
    const fy = deck2 + 2;
    const glow = s.add.image(x, fy - 14, 'aura').setTint(0xffd36b).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setDepth(d).setAlpha(0.8);
    s.tweens.add({ targets: glow, alpha: 0.45, scale: 1.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const fire = s.add.sprite(x, fy, 'torch_item', 0).setOrigin(0.5, 0.85).setScale(1.7).setDepth(d);
    if (s.anims.exists('torch_flame')) fire.play('torch_flame');
    this.beam = s.add.graphics().setDepth(DEPTH.terrain - 0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.beamAt = [x, fy - 22];
  }
}
