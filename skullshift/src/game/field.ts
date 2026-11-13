import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, TILE, W } from '../config';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import { recolorSheet } from './sheets';
import { Px } from '../ui/pixelart';
import { sfx } from './settings';

/**
 * Elementos da Pradaria dos Ossos: estouro de manada (bois correndo pelo chão baixo, com aviso)
 * e rochas que rolam pelo terreno (caem nos buracos; um golpe as quebra).
 */
export interface FieldDef {
  /** Manada: a cada `every` ms, `count` bois atravessam a tela vindo de `from`, no chão baixo (h0). */
  stampede?: { every: number; count: number; from: 'left' | 'right' };
  /** Rochas: nascem em (cenário, tile, altura) e rolam na direção dir a cada `every` ms. */
  boulders?: Array<[screen: number, tile: number, h: number, dir: 1 | -1, every: number]>;
  /** Gêiseres de fogo: borbulham (aviso) e soltam uma coluna de fogo a cada `every` ms. */
  geysers?: Array<[screen: number, tile: number, h: number, every: number, offset?: number]>;
  /** Arte das rochas que rolam (ex.: 'log_roll', tora no bosque). */
  boulderTex?: string;
  /** Cogumelos saltitantes: quicam quem cai em cima (bem alto). */
  mushrooms?: Array<[screen: number, tile: number, h: number]>;
  /** Desabamento: pedras caem do teto em pontos marcados, a cada `every` ms. */
  rockfall?: Array<[screen: number, tile: number, every: number, offset?: number]>;
  /** Arte do que cai (ex.: 'meteor' no Céu de Brasa). */
  fallTex?: string;
}

/** Arte do bosque e da mina (pixel art em código). */
export function makeFieldArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('mushroom')) return;
  const INK = 0x1d1a2b;
  // Cogumelo vermelho de bolinhas (mola).
  const m = new Px(22, 18);
  for (let y = 0; y < 9; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 100 - (9 - y) * (9 - y) * 1.2)));
    for (let x = 11 - half; x <= 10 + half; x++) m.set(x, y, 0xd42a3c);
  }
  for (const [x, y] of [[6, 4], [14, 3], [10, 6], [17, 6]]) m.rect(x, y, 2, 2, 0xfff7dc);
  m.rect(1, 8, 20, 2, 0xa01e30);
  m.rect(8, 10, 6, 8, 0xf4ead0);
  m.rect(8, 10, 6, 1, 0xd8c8a0);
  m.outline(INK);
  m.toTexture(scene, 'mushroom', 3);
  // Tora rolando (vista de lado: anéis do tronco).
  const lg = new Px(18, 18);
  lg.disc(9, 9, 8, 0x8a5a2a);
  lg.disc(9, 9, 6, 0xc89a5a);
  lg.disc(9, 9, 4, 0xa0703a);
  lg.disc(9, 9, 2, 0xc89a5a);
  lg.outline(INK);
  lg.toTexture(scene, 'log_roll', 3);
  // Tora boiando (plataforma no rio).
  const lf = new Px(21, 10);
  lf.rect(0, 1, 21, 8, 0x8a5a2a);
  lf.rect(0, 1, 21, 2, 0xb07a40);
  lf.rect(2, 4, 6, 1, 0x6a4020);
  lf.rect(12, 6, 6, 1, 0x6a4020);
  lf.disc(20, 5, 3, 0xc89a5a);
  lf.outline(INK);
  lf.toTexture(scene, 'log_float', 3);
  // Meteoro (rocha em brasa com rastro).
  const met = new Px(16, 16);
  met.disc(9, 9, 6, 0x4a2a2a);
  met.disc(9, 9, 4, 0xd84a2a);
  met.disc(8, 8, 2, 0xffe066);
  for (let k = 0; k < 4; k++) met.set(2 + k, 2 + k, k % 2 ? 0xff7a1a : 0xffe066);
  met.outline(INK);
  met.toTexture(scene, 'meteor', 3);
  // Nuvem de brasa (se desfaz ao pisar).
  const cp = new Px(21, 7);
  for (let x = 0; x < 21; x++) {
    const h = 3 + Math.round(Math.sin((x / 20) * Math.PI) * 3);
    cp.rect(x, 7 - h, 1, h, 0xffd0b0);
  }
  cp.rect(0, 5, 21, 2, 0xe89070);
  cp.outline(INK);
  cp.toTexture(scene, 'cloud_plank', 3);
  // Vitória-régia (afunda ao pisar, na lagoa).
  const lily = new Px(21, 6);
  for (let x = 0; x < 21; x++) {
    const h = x < 3 || x > 17 ? 2 : 4;
    lily.rect(x, 5 - h, 1, h, x === 10 ? 0x2a5a2a : 0x5aa83a);
  }
  lily.rect(3, 1, 15, 1, 0x8ad86a);
  lily.set(15, 2, 0xff9ac0);
  lily.set(16, 2, 0xffd0e0);
  lily.outline(INK);
  lily.toTexture(scene, 'lily', 3);
}

export interface FieldHost {
  scene: Phaser.Scene;
  level: Level;
  player(): Fighter;
  killPlayer(): void;
  popText(x: number, y: number, text: string, color: string): void;
}

/** Capim dourado (recolor do tileset de grama) para a Pradaria. */
export function makeFieldTiles(scene: Phaser.Scene): void {
  // Minas: terra e rocha em tons de ocre (a caverna das teias é azul-esverdeada).
  recolorSheet(scene, 'tiles_cave', 'tiles_mine', 64, 64, {
    0x569b8d: 0x9a7a4a,
    0x528e89: 0x8a6a3a,
    0x63a486: 0xb08a50,
    0x669d9d: 0x7a6a5a,
    0x506a69: 0x5a4a3a,
    0x3e4c56: 0x3a2e2a,
    0x3b6566: 0x4a3a2a,
    0x8cc3c4: 0xa89a8a,
    0xc6f0db: 0xe8d8b0,
    0x47777c: 0x6a5a3a,
  });
  // Bosque: grama verde-escura. Lagoa: verde-musgo, pedra limosa.
  recolorSheet(scene, 'tilemap', 'tiles_forest', 64, 64, { 0x9bb94e: 0x5a9a3a, 0x80ac5e: 0x3f7a32, 0xb8b958: 0x7ab84a, 0x618559: 0x2f5a2a });
  recolorSheet(scene, 'tilemap', 'tiles_swamp', 64, 64, {
    0x9bb94e: 0x7a8a3a,
    0x80ac5e: 0x5a6a32,
    0xb8b958: 0x9aa85a,
    0x618559: 0x3a4a2a,
    0x669d9d: 0x5a7a5a,
    0x506a69: 0x3a5a4a,
    0x8cc3c4: 0x7a9a7a,
    0xc6f0db: 0xa8c8a0,
  });
  recolorSheet(scene, 'tilemap', 'tiles_prairie', 64, 64, {
    0x9bb94e: 0xc8b85a,
    0x80ac5e: 0xa89a4a,
    0xb8b958: 0xe0d070,
    0x618559: 0x7a6a30,
  });
}

interface Runner {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
}

interface Boulder {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  r: number;
  dead?: boolean;
}

export class FieldSystem {
  private nextStampede = 0;
  private warned = false;
  private runners: Runner[] = [];
  private boulders: Boulder[] = [];
  private spawners: Array<{ x: number; y: number; dir: number; every: number; next: number }> = [];
  private mushrooms: Array<{ x: number; top: number; img: Phaser.GameObjects.Image }> = [];
  private falls: Array<{ x: number; every: number; next: number; warned: boolean }> = [];
  private rocks: Array<{ img: Phaser.GameObjects.Image; vy: number; dead?: boolean }> = [];
  private geysers: Array<{ x: number; floor: number; every: number; next: number; state: 'idle' | 'warn' | 'fire'; at: number; g: Phaser.GameObjects.Graphics }> = [];

  constructor(
    private host: FieldHost,
    private def: FieldDef,
  ) {
    const s = host.scene;
    const now = s.time.now;
    makeFieldArt(s);
    for (const [sc, t, h] of def.mushrooms ?? []) {
      const x = host.level.tileX(sc, t);
      const top = FLOOR_Y - h * TILE;
      const img = s.add.image(x, top + 4, 'mushroom').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.6);
      this.mushrooms.push({ x, top, img });
    }
    for (const [sc, t, every, offset] of def.rockfall ?? []) this.falls.push({ x: host.level.tileX(sc, t), every, next: now + 1500 + (offset ?? 0), warned: false });
    this.nextStampede = now + (def.stampede?.every ?? 0);
    for (const [sc, t, h, every, offset] of def.geysers ?? []) {
      const x = host.level.tileX(sc, t);
      const floor = FLOOR_Y - h * TILE;
      // Boca do gêiser: uma rachadura brilhante no chão.
      const mouth = s.add.graphics().setDepth(DEPTH.deco + 0.6);
      mouth.fillStyle(0x1d1a2b, 1).fillEllipse(x, floor + 2, 46, 12);
      mouth.fillStyle(0xff6a1a, 1).fillEllipse(x, floor + 2, 36, 7);
      const g = s.add.graphics().setDepth(DEPTH.fighters + 0.3);
      this.geysers.push({ x, floor, every, next: now + 1500 + (offset ?? 0), state: 'idle', at: 0, g });
    }
    for (const [sc, t, h, dir, every] of def.boulders ?? []) {
      this.spawners.push({ x: host.level.tileX(sc, t), y: FLOOR_Y - h * TILE - 34, dir, every, next: now + 1200 });
    }
  }

  update(time: number, dt: number): void {
    const p = this.host.player();
    this.updateStampede(time, dt, p);
    this.updateBoulders(time, dt, p);
    this.updateGeysers(time, p);
    this.updateMushrooms(p);
    this.updateRockfall(time, dt, p);
  }

  // ---------- cogumelos e desabamento ----------

  private updateMushrooms(p: Fighter): void {
    for (const m of this.mushrooms) {
      if (!p.alive || p.zipping || p.body.velocity.y <= 0) continue;
      if (Math.abs(p.x - m.x) > 34 || p.feet < m.top - 60 || p.feet > m.top - 20) continue;
      p.body.setVelocityY(-1050);
      sfx('jump');
      this.host.scene.tweens.add({ targets: m.img, scaleY: 0.7, scaleX: 1.2, duration: 80, yoyo: true });
    }
  }

  private updateRockfall(time: number, dt: number, p: Fighter): void {
    const s = this.host.scene;
    const lvl = this.host.level;
    const screen = lvl.screenOf(p.x);
    for (const f of this.falls) {
      if (lvl.screenOf(f.x) !== screen) continue;
      if (!f.warned && time > f.next - 700) {
        f.warned = true;
        // Poeirinha caindo do teto avisa onde a pedra vai cair.
        for (let i = 0; i < 4; i++) {
          const d = s.add.image(f.x + Phaser.Math.Between(-16, 16), 20, 'spark').setTint(0xc8b8a0).setScale(0.25).setDepth(DEPTH.fx);
          s.tweens.add({ targets: d, y: 160 + i * 20, alpha: 0, duration: 650, onComplete: () => d.destroy() });
        }
      }
      if (time > f.next) {
        f.next = time + f.every;
        f.warned = false;
        this.rocks.push({ img: s.add.image(f.x, -30, this.def.fallTex ?? 'stone2').setScale(this.def.fallTex ? 1.6 : 1.1).setDepth(DEPTH.fighters - 0.1), vy: 200 });
      }
    }
    for (const r of this.rocks) {
      const prev = r.img.y;
      r.vy += 1600 * dt;
      r.img.y += r.vy * dt;
      r.img.angle += 200 * dt;
      const land = lvl.landingY(r.img.x, prev + 24, r.img.y + 24);
      if (land !== null || r.img.y > 800) {
        r.dead = true;
        if (land !== null) {
          s.cameras.main.shake(90, 0.004);
          const d = s.add.sprite(r.img.x, land - 10, 'dust').setScale(1).setDepth(DEPTH.fx).play('dust');
          d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
        }
        continue;
      }
      if (p.alive && !p.invulnerable && Math.abs(p.x - r.img.x) < 30 && Math.abs(p.feet - 40 - r.img.y) < 44) this.host.killPlayer();
    }
    this.rocks = this.rocks.filter((r) => {
      if (r.dead) r.img.destroy();
      return !r.dead;
    });
  }

  // ---------- gêiseres de fogo ----------

  private updateGeysers(time: number, p: Fighter): void {
    const s = this.host.scene;
    const H = 230;
    for (const gy of this.geysers) {
      const g = gy.g;
      if (gy.state === 'idle' && time > gy.next - 800) {
        gy.state = 'warn';
        gy.at = time;
      }
      if (gy.state === 'warn') {
        // Borbulha: chamas baixinhas tremendo.
        g.clear();
        const k = Math.sin(time / 50) * 3;
        g.fillStyle(0xff6a1a, 0.9).fillTriangle(gy.x - 14, gy.floor, gy.x + 14, gy.floor, gy.x + k, gy.floor - 22);
        g.fillStyle(0xffe066, 1).fillTriangle(gy.x - 6, gy.floor, gy.x + 6, gy.floor, gy.x - k, gy.floor - 12);
        if (time > gy.next) {
          gy.state = 'fire';
          gy.at = time;
          if (Math.abs(p.x - gy.x) < W) sfx('boom');
        }
      } else if (gy.state === 'fire') {
        const t = (time - gy.at) / 1100;
        const h = H * Math.min(1, t * 5) * (t > 0.8 ? (1 - t) * 5 : 1);
        g.clear();
        for (const [w, c] of [[44, 0xd84a2a], [32, 0xff7a1a], [18, 0xffe066]] as const) {
          const wob = Math.sin(time / 40 + w) * 4;
          g.fillStyle(c, 1).fillRect(gy.x - w / 2 + wob, gy.floor - h, w, h);
          g.fillStyle(c, 1).fillTriangle(gy.x - w / 2 + wob, gy.floor - h, gy.x + w / 2 + wob, gy.floor - h, gy.x + wob, gy.floor - h - w * 0.8);
        }
        if (Math.random() < 0.3) {
          const e = s.add.image(gy.x + Phaser.Math.Between(-14, 14), gy.floor - h, 'spark').setTint(0xffb040).setScale(0.3).setDepth(DEPTH.fx);
          s.tweens.add({ targets: e, y: e.y - 60, alpha: 0, duration: 500, onComplete: () => e.destroy() });
        }
        if (p.alive && !p.invulnerable && Math.abs(p.x - gy.x) < 26 && p.feet > gy.floor - h - 10 && p.feet <= gy.floor + 4) this.host.killPlayer();
        if (t >= 1) {
          g.clear();
          gy.state = 'idle';
          gy.next = time + gy.every;
        }
      }
    }
  }

  // ---------- estouro da manada ----------

  private updateStampede(time: number, dt: number, p: Fighter): void {
    const st = this.def.stampede;
    const s = this.host.scene;
    const cam = s.cameras.main;
    if (st) {
      if (!this.warned && time > this.nextStampede - 1800) {
        this.warned = true;
        this.host.popText(p.x, p.feet - 170, 'ESTOURO DA MANADA! SUBA!', '#ffe066');
        sfx('boss');
        cam.shake(1600, 0.002);
      }
      if (time > this.nextStampede) {
        this.nextStampede = time + st.every;
        this.warned = false;
        const fromLeft = st.from === 'left';
        const x0 = fromLeft ? cam.scrollX - 80 : cam.scrollX + cam.width + 80;
        for (let i = 0; i < st.count; i++) {
          const sprite = s.add
            .sprite(x0 - (fromLeft ? 1 : -1) * i * 110, FLOOR_Y + 6, 'sheep_move')
            .setOrigin(0.5, 0.82)
            .setScale(1.25)
            .setFlipX(fromLeft)
            .setTint(0xa0704a)
            .setDepth(DEPTH.terrain - 0.1)
            .play('sheep_move');
          sprite.anims.timeScale = 2.2;
          this.runners.push({ sprite, vx: (fromLeft ? 1 : -1) * 560 });
        }
      }
    }
    for (const r of this.runners) {
      r.sprite.x += r.vx * dt;
      r.sprite.y = FLOOR_Y + 6 + Math.abs(Math.sin(r.sprite.x / 30)) * -6;
      if (Math.random() < 0.15) {
        const d = s.add.sprite(r.sprite.x - Math.sign(r.vx) * 30, FLOOR_Y, 'dust').setScale(0.6).setDepth(DEPTH.terrain - 0.05).play('dust');
        d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
      }
      // Só quem está no chão baixo é atropelado (no alto ou em plataforma, a manada passa por baixo).
      if (p.alive && !p.invulnerable && Math.abs(p.x - r.sprite.x) < 44 && p.feet > FLOOR_Y - 30) this.host.killPlayer();
    }
    this.runners = this.runners.filter((r) => {
      const out = r.vx > 0 ? r.sprite.x > cam.scrollX + cam.width + 300 : r.sprite.x < cam.scrollX - 300;
      if (out) r.sprite.destroy();
      return !out;
    });
  }

  // ---------- rochas rolando ----------

  private updateBoulders(time: number, dt: number, p: Fighter): void {
    const s = this.host.scene;
    const lvl = this.host.level;
    const screen = lvl.screenOf(p.x);
    for (const sp of this.spawners) {
      if (lvl.screenOf(sp.x) !== screen || time < sp.next) continue;
      sp.next = time + sp.every;
      const img = s.add.image(sp.x, sp.y, this.def.boulderTex ?? 'stone1').setScale(this.def.boulderTex ? 1 : 1.1).setDepth(DEPTH.fighters - 0.2);
      this.boulders.push({ img, vx: sp.dir * 230, vy: 0, r: 30 });
    }
    const hb = p.alive ? p.activeHitBox() : null;
    for (const b of this.boulders) {
      b.vy += 1500 * dt;
      const prevY = b.img.y;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      const land = lvl.landingY(b.img.x, prevY + b.r - 2, b.img.y + b.r);
      if (land !== null && b.vy > 0) {
        b.img.y = land - b.r;
        if (b.vy > 500) s.cameras.main.shake(80, 0.003);
        b.vy = 0;
      }
      b.img.angle += (b.vx * dt * 180) / (Math.PI * b.r);
      if (b.img.y > 900 || Math.abs(b.img.x - p.x) > W * 1.5) b.dead = true;
      // Um golpe quebra a rocha.
      if (hb && hb.x1 < b.img.x + b.r && hb.x2 > b.img.x - b.r && hb.y1 < b.img.y + b.r && hb.y2 > b.img.y - b.r) {
        b.dead = true;
        sfx('hit');
        for (let i = 0; i < 5; i++) {
          const c = s.add.image(b.img.x, b.img.y, 'stone2').setScale(0.35).setDepth(DEPTH.fx);
          s.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-70, 70), y: c.y - Phaser.Math.Between(20, 90), alpha: 0, angle: 200, duration: 500, onComplete: () => c.destroy() });
        }
        continue;
      }
      if (p.alive && !p.invulnerable && Math.abs(p.x - b.img.x) < b.r + 10 && Math.abs(p.feet - 30 - b.img.y) < b.r + 20) this.host.killPlayer();
    }
    this.boulders = this.boulders.filter((b) => {
      if (b.dead) b.img.destroy();
      return !b.dead;
    });
  }
}
