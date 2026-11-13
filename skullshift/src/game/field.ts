import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, TILE, W } from '../config';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import { recolorSheet } from './sheets';
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
  private geysers: Array<{ x: number; floor: number; every: number; next: number; state: 'idle' | 'warn' | 'fire'; at: number; g: Phaser.GameObjects.Graphics }> = [];

  constructor(
    private host: FieldHost,
    private def: FieldDef,
  ) {
    const s = host.scene;
    const now = s.time.now;
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
      const img = s.add.image(sp.x, sp.y, 'stone1').setScale(1.1).setDepth(DEPTH.fighters - 0.2);
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
