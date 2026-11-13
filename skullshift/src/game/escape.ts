import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, TILE, W, WATER_Y } from '../config';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import { sfx } from './settings';

/** O que a cena do jogo oferece à fase de fuga. */
export interface EscapeHost {
  scene: Phaser.Scene;
  level: Level;
  player(): Fighter;
  checkpointX(): number;
  /** Mata o jogador queimado na lava. */
  burn(): void;
  popText(x: number, y: number, text: string, color: string): void;
  paused(): boolean;
}

export interface EscapeDef {
  speed: number;
  delay: number;
  /** Tirolesas: (cenário, tile de saída, altura de saída, tile de chegada, altura de chegada). */
  zips?: Array<[screen: number, fromTile: number, fromH: number, toTile: number, toH: number]>;
}

const topOf = (h: number) => FLOOR_Y - h * TILE;

interface Zip {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
  handle: Phaser.GameObjects.Graphics;
}

/**
 * Fuga da Forja: uma onda gigante de lava (pixel art animada) avança em surtos — corre, para
 * para "crescer" e dispara. À frente dela o chão treme e desaba coluna por coluna; atrás, tudo
 * vira lava. No caminho: meteoros avisados no chão, inimigos e tirolesas sobre lagos de lava.
 */
export class EscapeSystem {
  private waveX: number;
  private startAt: number;
  private phase: 'run' | 'gather' | 'surge' = 'run';
  private phaseUntil = 0;
  private wave: Phaser.GameObjects.Sprite;
  private flood: Phaser.GameObjects.TileSprite;
  private floodTop: Phaser.GameObjects.TileSprite;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private glow: Phaser.GameObjects.Ellipse;
  private zips: Zip[] = [];
  private riding?: { zip: Zip; t: number; v: number };
  private nextMeteor = 0;
  private meteors: Array<{ obj: Phaser.GameObjects.Image; x: number; y: number; vy: number }> = [];
  private wasAlive = true;
  private lastRumble = 0;

  constructor(
    private host: EscapeHost,
    private def: EscapeDef,
  ) {
    const s = host.scene;
    this.waveX = host.checkpointX() - 560;
    this.startAt = s.time.now + def.delay;
    this.phaseUntil = this.startAt + 4200;
    // Mar de lava que sobe atrás da onda (tudo o que ela já passou).
    this.flood = s.add.tileSprite(0, WATER_Y - 150, 2600, 900, 'lava_body').setOrigin(1, 0).setDepth(DEPTH.fighters + 1.5);
    this.floodTop = s.add.tileSprite(0, WATER_Y - 166, 2600, 32, 'lava_top').setOrigin(1, 0).setDepth(DEPTH.fighters + 1.6);
    this.glow = s.add.ellipse(0, WATER_Y - 120, 520, 420, 0xff7a1a, 0.18).setDepth(DEPTH.fighters + 1.4);
    this.wave = s.add.sprite(0, WATER_Y + 40, 'lava_wave', 0).setOrigin(1, 1).setDepth(DEPTH.fighters + 1.7).play('lava_wave');
    this.sparks = s.add.particles(0, 0, 'spark', {
      x: { min: -60, max: 10 },
      y: { min: -10, max: 40 },
      speedX: { min: 60, max: 260 },
      speedY: { min: -380, max: -160 },
      gravityY: 700,
      lifespan: 900,
      scale: { start: 0.55, end: 0 },
      tint: [0xfff1a8, 0xffd36b, 0xff7a1a],
      frequency: 28,
    });
    this.sparks.setDepth(DEPTH.fighters + 1.8);
    // Tirolesas: postes de madeira, corda e a roldana.
    for (const [sc, ft, fh, tt, th] of def.zips ?? []) {
      const x0 = host.level.tileX(sc, ft);
      const x1 = host.level.tileX(sc, tt);
      const y0 = topOf(fh) - 140;
      const y1 = topOf(th) - 100;
      const g = s.add.graphics().setDepth(DEPTH.deco + 1);
      for (const [x, y, h] of [[x0, y0, fh], [x1, y1, th]] as const) {
        const base = topOf(h);
        g.fillStyle(0x1d1a2b).fillRect(x - 6, y - 14, 12, base - y + 14);
        g.fillStyle(0x8a5a35).fillRect(x - 4, y - 12, 8, base - y + 12);
        g.fillStyle(0xb07a48).fillRect(x - 4, y - 12, 2, base - y + 12);
        g.fillStyle(0x1d1a2b).fillRect(x - 12, y - 6, 24, 8);
        g.fillStyle(0x6c7385).fillRect(x - 10, y - 4, 20, 4);
      }
      g.lineStyle(5, 0x1d1a2b, 1).lineBetween(x0, y0, x1, y1);
      g.lineStyle(2, 0xd8b88a, 1).lineBetween(x0, y0, x1, y1);
      const handle = s.add.graphics().setDepth(DEPTH.fighters + 0.4);
      this.zips.push({ x0, y0, x1, y1, len: Math.hypot(x1 - x0, y1 - y0), handle });
      this.drawHandle(this.zips[this.zips.length - 1], 0);
    }
    this.place();
  }

  private drawHandle(z: Zip, t: number): void {
    const x = Phaser.Math.Linear(z.x0, z.x1, t);
    const y = Phaser.Math.Linear(z.y0, z.y1, t);
    const g = z.handle;
    g.clear();
    g.fillStyle(0x1d1a2b).fillCircle(x, y, 8);
    g.fillStyle(0x9aa3b5).fillCircle(x, y, 6);
    g.fillStyle(0x1d1a2b).fillRect(x - 2, y, 4, 26);
    g.fillStyle(0x1d1a2b).fillRect(x - 14, y + 24, 28, 7);
    g.fillStyle(0xb07a48).fillRect(x - 12, y + 26, 24, 3);
  }

  private place(): void {
    this.wave.setX(this.waveX);
    this.flood.setX(this.waveX - 250);
    this.floodTop.setX(this.waveX - 250);
    this.glow.setPosition(this.waveX - 120, WATER_Y - 140);
    this.sparks.setPosition(this.waveX - 60, WATER_Y - 230);
  }

  update(time: number, dt: number): void {
    const s = this.host.scene;
    const p = this.host.player();
    this.flood.tilePositionX += 30 * dt;
    this.flood.tilePositionY -= 12 * dt;
    this.floodTop.tilePositionX -= 90 * dt;
    // Renasceu: a onda recua para trás do checkpoint e o chão dali para a frente volta.
    if (p.alive && !this.wasAlive) {
      this.waveX = this.host.checkpointX() - 560;
      this.host.level.restoreFrom(Math.floor((this.waveX + 60) / TILE));
      this.startAt = time + 1500;
      this.phase = 'run';
      this.phaseUntil = this.startAt + 4200;
      this.riding = undefined;
      for (const m of this.meteors) m.obj.destroy();
      this.meteors = [];
    }
    this.wasAlive = p.alive;
    const going = p.alive && !p.reviving && time >= this.startAt && !this.host.paused();

    // Ritmo da onda: corre, para e cresce (aviso), dispara.
    if (going) {
      if (time >= this.phaseUntil) {
        this.phase = this.phase === 'run' ? 'gather' : this.phase === 'gather' ? 'surge' : 'run';
        this.phaseUntil = time + (this.phase === 'run' ? 4200 : this.phase === 'gather' ? 1500 : 1600);
        if (this.phase === 'gather') this.host.popText(this.waveX + 80, WATER_Y - 330, 'A ONDA ESTÁ CRESCENDO!', '#ff9a2a');
      }
      const k = this.phase === 'gather' ? 0.05 : this.phase === 'surge' ? 1.55 : 1 + Math.sin(time / 700) * 0.2;
      this.waveX += this.def.speed * k * dt;
      // Nunca fica longe demais (sempre há pressão).
      this.waveX = Math.max(this.waveX, p.x - W * 0.9);
      if (time - this.lastRumble > 450) {
        this.lastRumble = time;
        s.cameras.main.shake(180, this.phase === 'surge' ? 0.004 : 0.0018);
      }
    }
    const grow = this.phase === 'gather' ? 1.12 + Math.sin(time / 60) * 0.02 : this.phase === 'surge' ? 1.18 : 1;
    this.wave.setScale(Phaser.Math.Linear(this.wave.scaleX, grow, 0.1));
    this.place();

    // À frente da onda o chão treme; logo antes dela, desaba.
    const lvl = this.host.level;
    lvl.shakeTo(Math.floor((this.waveX + 300) / TILE));
    for (const x of lvl.collapseTo(Math.floor((this.waveX + 40) / TILE))) {
      sfx('boom');
      const d = s.add.sprite(x, FLOOR_Y - 10, 'dust').setScale(1.4).setDepth(DEPTH.fx).play('dust');
      d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
      for (let i = 0; i < 4; i++) {
        const r = s.add.image(x + Phaser.Math.Between(-24, 24), FLOOR_Y - Phaser.Math.Between(0, 30), 'rock1').setScale(0.35).setDepth(DEPTH.fx);
        s.tweens.add({ targets: r, x: r.x + Phaser.Math.Between(-60, 80), y: r.y + 300, angle: 360, duration: 900, ease: 'Quad.easeIn', onComplete: () => r.destroy() });
      }
    }

    // Pega quem a onda alcançou.
    if (p.alive && !p.reviving && p.x < this.waveX - 20 && p.feet > WATER_Y - 290 * this.wave.scaleY) this.host.burn();

    this.updateZips(p, dt);
    this.updateMeteors(p, time, dt, going);
  }

  // ---------- tirolesa ----------

  private updateZips(p: Fighter, dt: number): void {
    const s = this.host.scene;
    if (this.riding) {
      const r = this.riding;
      const z = r.zip;
      r.v = Math.min(780, r.v + 900 * dt);
      r.t += (r.v * dt) / z.len;
      const done = r.t >= 1;
      const t = Math.min(1, r.t);
      const x = Phaser.Math.Linear(z.x0, z.x1, t);
      const y = Phaser.Math.Linear(z.y0, z.y1, t);
      this.drawHandle(z, t);
      const feet = y + 30 + p.labelHeight * 0.85;
      p.body.reset(x, feet - (p.def.feetY - p.def.frame / 2));
      p.sprite.setAngle(Math.sign(z.x1 - z.x0) * 8);
      if (!p.alive) {
        this.riding = undefined;
        return;
      }
      if (done || p.intent.jump) {
        this.riding = undefined;
        p.zipping = false;
        p.body.moves = true;
        p.sprite.setAngle(0);
        const dir = Math.sign(z.x1 - z.x0);
        p.body.setVelocity(dir * r.v * 0.55, p.intent.jump ? -560 : -120);
        if (done) this.drawHandle(z, 0);
      }
      return;
    }
    if (!p.alive || p.zipping) return;
    for (const z of this.zips) {
      // Encostou na corda (perto do começo) no ar ou apertando PULAR: agarra.
      const hx = p.x;
      const hy = p.feet - p.labelHeight * 0.9;
      const t = Phaser.Math.Clamp(((hx - z.x0) * (z.x1 - z.x0) + (hy - z.y0) * (z.y1 - z.y0)) / (z.len * z.len), 0, 1);
      if (t > 0.3) continue;
      const cx = Phaser.Math.Linear(z.x0, z.x1, t);
      const cy = Phaser.Math.Linear(z.y0, z.y1, t);
      if (Math.hypot(hx - cx, hy - cy) > 40) continue;
      if (p.onGround && !p.intent.jump) continue;
      this.riding = { zip: z, t, v: 260 };
      p.zipping = true;
      p.body.setVelocity(0, 0);
      p.body.moves = false;
      p.facing = (Math.sign(z.x1 - z.x0) || 1) as 1 | -1;
      p.sprite.setFlipX(p.facing < 0);
      sfx('pick');
      this.host.popText(cx, cy - 60, 'TIROLESA!', '#ffe066');
      void s;
      return;
    }
  }

  // ---------- meteoros ----------

  private updateMeteors(p: Fighter, time: number, dt: number, going: boolean): void {
    const s = this.host.scene;
    if (going && time >= this.nextMeteor && !this.riding) {
      this.nextMeteor = time + Phaser.Math.Between(2200, 3200);
      const x = p.x + Phaser.Math.Between(180, 520) * (p.facing || 1);
      const ground = this.host.level.groundY(x) ?? WATER_Y;
      const mark = s.add.ellipse(x, ground - 4, 70, 16, 0xff3030, 0.5).setDepth(DEPTH.deco + 1);
      s.tweens.add({ targets: mark, alpha: 0.1, duration: 140, yoyo: true, repeat: 3, onComplete: () => mark.destroy() });
      s.time.delayedCall(900, () => {
        if (!p.alive) return;
        const obj = s.add.image(x, -60, 'rock1').setScale(1.1).setTint(0xff9a5a).setDepth(DEPTH.projectiles);
        this.meteors.push({ obj, x, y: -60, vy: 500 });
      });
    }
    this.meteors = this.meteors.filter((m) => {
      m.vy += 1500 * dt;
      m.y += m.vy * dt;
      m.obj.setPosition(m.x, m.y).setAngle(m.obj.angle + 300 * dt);
      if (Math.random() < 0.5) {
        const t = s.add.image(m.x + Phaser.Math.Between(-8, 8), m.y - 20, 'spark').setTint(0xff7a1a).setScale(0.6).setDepth(DEPTH.projectiles - 1);
        s.tweens.add({ targets: t, alpha: 0, scale: 0, y: t.y - 30, duration: 300, onComplete: () => t.destroy() });
      }
      if (p.alive && !p.reviving && !p.invulnerable && Math.abs(p.x - m.x) < 34 && m.y > p.feet - p.labelHeight && m.y < p.feet + 10) {
        this.host.burn();
      }
      const ground = this.host.level.groundY(m.x) ?? WATER_Y + 20;
      if (m.y >= ground - 10) {
        const b = s.add.sprite(m.x, ground - 20, 'boom').setDepth(DEPTH.fx).play('boom');
        b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
        sfx('boom');
        m.obj.destroy();
        return false;
      }
      return true;
    });
  }
}
