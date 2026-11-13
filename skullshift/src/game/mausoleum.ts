import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import type { BossBar } from './boss';
import type { Fighter } from './Fighter';
import { sfx } from './settings';

export interface MausoleumHost {
  scene: Phaser.Scene;
  player(): Fighter;
  x0: number;
  x1: number;
  floor: number;
  waves: number;
  failed(): void;
  win(): void;
  popText(x: number, y: number, text: string, color: string): void;
  bar(): BossBar | undefined;
  killPlayer?: () => void;
}

interface Ghost {
  sprite: Phaser.GameObjects.Sprite;
  dir: 1 | -1;
  speed: number;
  baseY: number;
  t: number;
  zig: boolean;
  dead: boolean;
}

/**
 * Desafio do mausoléu: a urna fica no meio da sala e assombrações chegam voando dos dois
 * lados, em ondas cada vez maiores. Um golpe derruba cada uma. Se três tocarem a urna,
 * ela quebra e o desafio recomeça. Sobreviver a todas as ondas vence.
 */
export class MausoleumSystem {
  private urn: Phaser.GameObjects.Image;
  private hearts: Phaser.GameObjects.Graphics;
  private hp = 3;
  private wave = 0;
  private ghosts: Ghost[] = [];
  private toSpawn = 0;
  private nextSpawn = 0;
  private between = 0;
  private done = false;
  private lastAttackId = -1;

  constructor(private host: MausoleumHost) {
    const s = host.scene;
    const cx = (host.x0 + host.x1) / 2;
    this.urn = s.add.image(cx, host.floor + 4, 'urn').setOrigin(0.5, 1).setDepth(DEPTH.deco + 1);
    s.add.ellipse(cx, host.floor - 40, 160, 160, 0xb9a6ff, 0.12).setDepth(DEPTH.deco);
    this.hearts = s.add.graphics().setDepth(DEPTH.fx + 2);
    this.drawHearts();
    this.between = s.time.now + 2200;
    host.bar()?.showBossBar('URNA DO XAMÃ', `Onda 0 de ${host.waves}`, 0x9b6bf0);
    host.bar()?.setBossHp(0);
  }

  private drawHearts(): void {
    const g = this.hearts;
    g.clear();
    const cx = this.urn.x;
    const y = this.urn.y - 120;
    for (let i = 0; i < 3; i++) {
      const x = cx - 36 + i * 36;
      const on = i < this.hp;
      g.fillStyle(0x1d1a2b).fillRect(x - 12, y - 10, 24, 20);
      g.fillStyle(on ? 0xe04848 : 0x5f6872).fillRect(x - 10, y - 8, 8, 8).fillRect(x + 2, y - 8, 8, 8).fillRect(x - 8, y, 16, 6).fillRect(x - 4, y + 6, 8, 2);
    }
  }

  update(time: number, dt: number): void {
    if (this.done) return;
    const s = this.host.scene;
    const p = this.host.player();
    // Próxima onda.
    if (this.toSpawn === 0 && this.ghosts.length === 0 && time >= this.between) {
      if (this.wave >= this.host.waves) {
        this.done = true;
        this.host.bar()?.hideBossBar();
        this.host.popText(this.urn.x, this.urn.y - 200, 'A URNA SOBREVIVEU!', '#9dffb0');
        s.time.delayedCall(1200, () => this.host.win());
        return;
      }
      this.wave++;
      this.toSpawn = 3 + this.wave * 2;
      this.nextSpawn = time + 600;
      this.host.popText(this.urn.x, this.urn.y - 230, `ONDA ${this.wave}`, '#d8ccff');
      this.host.bar()?.showBossBar('URNA DO XAMÃ', `Onda ${this.wave} de ${this.host.waves}`, 0x9b6bf0);
      this.host.bar()?.setBossHp(this.wave / this.host.waves);
    }
    if (this.toSpawn > 0 && time >= this.nextSpawn && p.alive) {
      this.toSpawn--;
      this.nextSpawn = time + Math.max(380, 1100 - this.wave * 110);
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const x = dir > 0 ? this.host.x0 - 40 : this.host.x1 + 40;
      const baseY = this.host.floor - Phaser.Math.Between(40, 260);
      const sprite = s.add.sprite(x, baseY, 'skull_idle').setScale(0.9).setTint(0xc8b8ff).setAlpha(0.85).setFlipX(dir < 0).setDepth(DEPTH.fighters).play('skull_idle');
      this.ghosts.push({ sprite, dir, speed: Phaser.Math.Between(90, 140) + this.wave * 12, baseY, t: 0, zig: Math.random() < 0.4, dead: false });
      if (this.toSpawn === 0) this.between = 0;
    }
    // Assombrações voando até a urna.
    const hb = p.alive ? p.activeHitBox() : null;
    const newHit = hb && p.attackId !== this.lastAttackId;
    for (const g of this.ghosts) {
      if (g.dead) continue;
      g.t += dt;
      g.sprite.x += g.dir * g.speed * dt;
      g.sprite.y = g.baseY + (g.zig ? Math.sin(g.t * 3) * 60 : Math.sin(g.t * 2) * 10);
      // Golpe do jogador derruba.
      if (newHit && hb && g.sprite.x > hb.x1 - 30 && g.sprite.x < hb.x2 + 30 && g.sprite.y > hb.y1 - 90 && g.sprite.y < hb.y2 + 40) {
        this.lastAttackId = p.attackId;
        this.kill(g);
        continue;
      }
      // Encostar no jogador machuca (como qualquer inimigo).
      if (p.alive && !p.invulnerable && Math.abs(g.sprite.x - p.x) < 30 && Math.abs(g.sprite.y - (p.feet - 40)) < 50) {
        this.host.killPlayer?.();
        this.kill(g);
        continue;
      }
      // Chegou na urna.
      if (Math.abs(g.sprite.x - this.urn.x) < 30) {
        g.dead = true;
        this.hp--;
        this.drawHearts();
        sfx('hit');
        s.cameras.main.shake(200, 0.008);
        s.tweens.add({ targets: this.urn, angle: { from: -8, to: 8 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => this.urn.setAngle(0) });
        s.tweens.add({ targets: g.sprite, alpha: 0, scale: 1.4, duration: 300, onComplete: () => g.sprite.destroy() });
        if (this.hp <= 0) {
          this.done = true;
          this.host.bar()?.hideBossBar();
          this.urn.setTint(0x5f6872);
          this.host.failed();
          return;
        }
      }
    }
    this.ghosts = this.ghosts.filter((g) => !g.dead);
    if (this.toSpawn === 0 && this.ghosts.length === 0 && this.between === 0) this.between = time + 1800;
  }

  private kill(g: Ghost): void {
    const s = this.host.scene;
    g.dead = true;
    sfx('hit');
    s.tweens.add({ targets: g.sprite, alpha: 0, y: g.sprite.y - 40, scale: 0.4, duration: 300, onComplete: () => g.sprite.destroy() });
    const t = s.add.text(g.sprite.x, g.sprite.y - 30, 'BUU!', { fontFamily: FONT, fontSize: '18px', color: '#d8ccff', stroke: '#1d1a2b', strokeThickness: 5 }).setOrigin(0.5).setDepth(DEPTH.fx + 2);
    s.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }
}
