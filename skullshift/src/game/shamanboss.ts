import Phaser from 'phaser';
import { DEPTH } from '../config';
import { Boss, type BossHost } from './boss';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { sfx } from './settings';

/** Ecos dos reis derrotados que o Xamã chama de volta (variantes e inimigos de cada área). */
const ECHOES: CharId[] = ['shark_coral', 'goblin_pirate', 'lizard_tide', 'gnoll_wreck', 'spider', 'imp', 'torchgob', 'shark_hammer'] as CharId[];

/**
 * Xamã Hex, livre dos selos. Luta final, com a caveira de volta ao corpo de aldeão.
 * Padrões: rajada de feitiços miradas, ecos dos reis, salto do alto com onda roxa no chão e
 * correntes varrendo a arena (pule as de baixo, agache nas de cima). Com metade da vida fica
 * mais rápido e combina os padrões.
 */
export class ShamanBoss extends Boss {
  private hoverY: number;
  private echoes: Fighter[] = [];
  private aura: Phaser.GameObjects.Image;

  constructor(host: BossHost) {
    super(host, 24, 'shaman_idle', 2.2, 133, 192, 120, 170, 'XAMÃ HEX', 'Barqueiro das Almas', 0x9b6bf0);
    this.hoverY = host.floor - 40;
    this.feet = this.hoverY;
    this.aura = host.scene.add.image(0, -400, 'aura').setTint(0x9b6bf0).setScale(2.4, 2).setAlpha(0.45).setDepth(DEPTH.fighters - 0.6).setBlendMode(Phaser.BlendModes.ADD);
  }

  protected get idleAnim(): string {
    return 'shaman_idle';
  }
  protected get roarAnim(): string {
    return 'shaman_attack';
  }
  protected patternCount(): number {
    return 4;
  }

  protected bob(time: number): number {
    return Math.sin(time / 340) * 10;
  }

  private flyTo(x: number, feet: number, ms: number): Promise<void> {
    return new Promise((r) => this.scene.tweens.add({ targets: this, x, feet, duration: ms, ease: 'Sine.easeInOut', onComplete: () => r() }));
  }

  protected defeatText(): string {
    return 'Os selos voltaram. O mundo está livre.';
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (this.phase2 && Math.random() < 0.4) {
      await this.bolts(t);
      if (this.ok(t)) await this.chains(t);
      return;
    }
    if (k === 0) await this.bolts(t);
    else if (k === 1) await this.echo(t);
    else if (k === 2) await this.slam(t);
    else await this.chains(t);
  }

  /** Rajada de feitiços roxos mirados no jogador. */
  private async bolts(t: number): Promise<void> {
    const s = this.scene;
    const n = this.phase2 ? 5 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      this.faceToPlayer();
      this.sprite.play('shaman_attack');
      const ox = this.x + this.facing * 50;
      const oy = this.feet - 110;
      const p = this.player;
      const a = Phaser.Math.Angle.Between(ox, oy, p.x, p.feet - 30);
      const o = s.add.image(ox, oy, 'orb').setTint(0xb48aff).setScale(1.1).setDepth(DEPTH.projectiles);
      sfx('attack');
      this.addHazard({
        x: ox,
        y: oy,
        w: 26,
        h: 26,
        until: s.time.now + 3000,
        obj: o,
        step: (dt, h) => {
          h.x += Math.cos(a) * 470 * dt;
          h.y += Math.sin(a) * 470 * dt;
          o.setPosition(h.x, h.y).setAngle(o.angle + 400 * dt);
        },
      });
      await this.wait(this.phase2 ? 300 : 420);
    }
    this.play('shaman_idle');
    await this.wait(400);
  }

  /** Chama ecos dos reis derrotados (no máximo 3 vivos). */
  private async echo(t: number): Promise<void> {
    this.echoes = this.echoes.filter((e) => e.alive);
    if (this.echoes.length >= 3) return this.slam(t);
    this.sprite.play('shaman_attack');
    this.exclaim();
    const s = this.scene;
    for (let i = 0; i < (this.phase2 ? 2 : 1) && this.ok(t); i++) {
      const x = Phaser.Math.Between(this.host.x0 + 120, this.host.x1 - 120);
      const ring = s.add.image(x, this.host.floor - 40, 'aura').setTint(0x9b6bf0).setScale(0.2).setDepth(DEPTH.fx);
      s.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
      await this.wait(400);
      if (!this.ok(t)) return;
      const f = this.host.spawnEnemy(Phaser.Utils.Array.GetRandom(ECHOES), x, this.host.floor);
      f.sprite.setTint(0xc8a8ff);
      this.echoes.push(f);
    }
    this.play('shaman_idle');
    await this.wait(600);
  }

  /** Some, reaparece sobre o jogador e desce com tudo: onda roxa pelo chão (pule). */
  private async slam(t: number): Promise<void> {
    const s = this.scene;
    s.tweens.add({ targets: this.sprite, alpha: 0, duration: 200 });
    await this.wait(260);
    if (!this.ok(t)) return;
    const tx = Phaser.Math.Clamp(this.player.x, this.host.x0 + 80, this.host.x1 - 80);
    this.x = tx;
    this.feet = this.host.ceiling + 220;
    this.warnMark(tx, 500);
    s.tweens.add({ targets: this.sprite, alpha: 1, duration: 200 });
    await this.wait(this.phase2 ? 380 : 520);
    if (!this.ok(t)) return;
    await this.flyTo(tx, this.host.floor, 260);
    s.cameras.main.shake(220, 0.012);
    this.dust(tx, this.host.floor, 2);
    sfx('boom');
    for (const dir of [-1, 1]) {
      const g = s.add.graphics().setDepth(DEPTH.projectiles);
      this.addHazard({
        x: tx,
        y: this.host.floor - 20,
        w: 40,
        h: 40,
        until: s.time.now + 2400,
        obj: g,
        step: (dt, h) => {
          h.x += dir * 480 * dt;
          g.clear();
          g.fillStyle(0x1d1a2b, 1).fillTriangle(h.x - 22, h.y + 20, h.x + 22, h.y + 20, h.x, h.y - 26);
          g.fillStyle(0x9b6bf0, 1).fillTriangle(h.x - 16, h.y + 18, h.x + 16, h.y + 18, h.x, h.y - 18);
          g.fillStyle(0xe2d2ff, 1).fillTriangle(h.x - 6, h.y + 16, h.x + 6, h.y + 16, h.x, h.y - 6);
          if (h.x < this.host.x0 || h.x > this.host.x1) h.dead = true;
        },
      });
    }
    await this.wait(500);
    if (!this.ok(t)) return;
    await this.flyTo(this.x, this.hoverY, 400);
  }

  /** Correntes roxas varrendo a arena: as baixas se pula, as altas se agacha. */
  private async chains(t: number): Promise<void> {
    const s = this.scene;
    this.sprite.play('shaman_attack');
    const n = this.phase2 ? 4 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      const low = i % 2 === 0;
      const fromLeft = this.player.x > this.x;
      const dir = fromLeft ? 1 : -1;
      const y = low ? this.host.floor - 18 : this.host.floor - 78;
      const g = s.add.graphics().setDepth(DEPTH.projectiles);
      this.addHazard({
        x: fromLeft ? this.host.x0 : this.host.x1,
        y,
        w: 50,
        h: low ? 30 : 40,
        until: s.time.now + 3600,
        obj: g,
        step: (dt, h) => {
          h.x += dir * 380 * dt;
          g.clear();
          for (let k = 0; k < 5; k++) {
            const cx = h.x - dir * k * 18;
            g.fillStyle(0x1d1a2b, 1).fillEllipse(cx, h.y, k % 2 ? 18 : 12, k % 2 ? 12 : 18);
            g.fillStyle(0x9b6bf0, 1).fillEllipse(cx, h.y, k % 2 ? 12 : 7, k % 2 ? 7 : 12);
          }
          if (h.x < this.host.x0 - 40 || h.x > this.host.x1 + 40) h.dead = true;
        },
      });
      await this.wait(this.phase2 ? 520 : 700);
    }
    this.play('shaman_idle');
  }

  update(time: number, dt: number): void {
    super.update(time, dt);
    if (this.sprite.active) this.aura.setVisible(this.sprite.visible && !this.dying).setPosition(this.sprite.x, this.sprite.y - 90).setAlpha(this.sprite.alpha * 0.45);
  }

  protected onPlayerDied(): void {
    for (const e of this.echoes) if (e.alive) e.sprite.setVisible(false);
    this.scene.tweens.killTweensOf(this);
    this.feet = this.hoverY;
    this.sprite.setAlpha(1);
  }

  destroy(): void {
    super.destroy();
    this.aura.destroy();
  }
}
