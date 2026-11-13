import Phaser from 'phaser';
import { DEPTH } from '../config';
import { Boss, type BossHost } from './boss';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { recolorSheet } from './sheets';
import { sfx } from './settings';

/** Rei Gnoll: pelo dourado, manchas roxas (as cores do Xamã), olhos acesos. */
const GNOLL_KING_PALETTE: Record<number, number> = {
  0xefe054: 0xe0a83a,
  0xaf8c58: 0x8a5a2a,
  0xb492a7: 0x7a2a8a,
  0x6d5e51: 0x4a2a5a,
  0x514744: 0x2a1a3a,
};

export function makeGnollKing(scene: Phaser.Scene): void {
  if (scene.textures.exists('king_gnoll_idle')) return;
  for (const [part, n, fps, repeat] of [
    ['idle', 6, 10, -1],
    ['run', 8, 12, -1],
    ['attack', 8, 14, 0],
  ] as const) {
    const src = scene.textures.get(`gnoll_${part}`).getSourceImage() as HTMLImageElement;
    recolorSheet(scene, `gnoll_${part}`, `king_gnoll_${part}`, 192, 192, GNOLL_KING_PALETTE);
    const frames = Math.max(1, Math.floor(src.width / 192));
    scene.anims.create({ key: `king_gnoll_${part}`, frames: scene.anims.generateFrameNumbers(`king_gnoll_${part}`, { start: 0, end: Math.min(n, frames) - 1 }), frameRate: fps, repeat });
  }
}

/**
 * Rei Gnoll, Senhor da Pradaria. Osso gigante bumerangue (baixo: pule; alto: agache), salto
 * esmagador com ondas pelo chão, uivo que chama Gnolls Caçadores e chuva de ossos marcada no chão.
 */
export class GnollKingBoss extends Boss {
  private crown: Phaser.GameObjects.Image;
  private pack: Fighter[] = [];
  private landWave = false;

  constructor(host: BossHost) {
    super(host, 22, 'king_gnoll_idle', 2.2, 131, 192, 150, 170, 'REI GNOLL', 'Senhor da Pradaria', 0xe0a83a);
    this.crown = host.scene.add.image(0, -400, 'queen_crown').setScale(1.1).setDepth(DEPTH.fighters - 0.4).setVisible(false);
  }

  protected get idleAnim(): string {
    return 'king_gnoll_idle';
  }
  protected get roarAnim(): string {
    return 'king_gnoll_attack';
  }
  protected patternCount(): number {
    return 4;
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (this.phase2 && Math.random() < 0.4) {
      await this.boomerang(t);
      if (this.ok(t)) await this.leap(t);
      return;
    }
    if (k === 0) await this.boomerang(t);
    else if (k === 1) await this.leap(t);
    else if (k === 2) await this.howl(t);
    else await this.boneRain(t);
  }

  /** Osso gigante que vai até a parede e volta (alternando baixo e alto). */
  private async boomerang(t: number): Promise<void> {
    const s = this.scene;
    const throws = this.phase2 ? 2 : 1;
    for (let i = 0; i < throws && this.ok(t); i++) {
      this.faceToPlayer();
      this.sprite.play('king_gnoll_attack');
      await this.wait(300);
      if (!this.ok(t)) return;
      const low = Math.random() < 0.5;
      const y = low ? this.host.floor - 26 : this.host.floor - 92;
      const bone = s.add.sprite(this.x + this.facing * 60, y, 'bone').setScale(2.6).setDepth(DEPTH.projectiles).play('bone');
      const dir = this.facing;
      const far = dir > 0 ? this.host.x1 - 40 : this.host.x0 + 40;
      let back = false;
      sfx('attack');
      this.addHazard({
        x: bone.x,
        y,
        w: 70,
        h: low ? 40 : 46,
        until: s.time.now + 6000,
        obj: bone,
        step: (dt, h) => {
          const target = back ? this.x : far;
          const sp = this.phase2 ? 620 : 520;
          h.x += Math.sign(target - h.x) * sp * dt;
          bone.setPosition(h.x, h.y);
          if (!back && Math.abs(h.x - far) < 20) back = true;
          if (back && Math.abs(h.x - this.x) < 30) h.dead = true;
        },
      });
      await this.wait(this.phase2 ? 900 : 1300);
    }
    this.play('king_gnoll_idle');
    await this.wait(500);
  }

  /** Salta até o jogador e cai com tudo: ondas de choque pelo chão (pule). */
  private async leap(t: number): Promise<void> {
    this.faceToPlayer();
    this.exclaim();
    await this.wait(this.phase2 ? 300 : 450);
    if (!this.ok(t)) return;
    const tx = Phaser.Math.Clamp(this.player.x, this.host.x0 + 90, this.host.x1 - 90);
    this.warnMark(tx, 700);
    this.airborne = true;
    this.vy = -1150;
    this.vx = (tx - this.x) / 1.05;
    this.landWave = true;
    sfx('jump');
    while (this.ok(t) && this.airborne) await this.wait(50);
    this.vx = 0;
    await this.wait(500);
  }

  protected onLand(): void {
    if (!this.landWave) return;
    this.landWave = false;
    const s = this.scene;
    s.cameras.main.shake(260, 0.012);
    this.dust(this.x, this.host.floor, 2.2);
    sfx('boom');
    for (const dir of [-1, 1]) {
      const g = s.add.graphics().setDepth(DEPTH.projectiles);
      this.addHazard({
        x: this.x,
        y: this.host.floor - 18,
        w: 40,
        h: 36,
        until: s.time.now + 2500,
        obj: g,
        step: (dt, h) => {
          h.x += dir * 440 * dt;
          g.clear();
          g.fillStyle(0x1d1a2b, 1).fillTriangle(h.x - 24, h.y + 18, h.x + 24, h.y + 18, h.x, h.y - 22);
          g.fillStyle(0xc8b85a, 1).fillTriangle(h.x - 18, h.y + 16, h.x + 18, h.y + 16, h.x, h.y - 14);
          if (h.x < this.host.x0 || h.x > this.host.x1) h.dead = true;
        },
      });
    }
  }

  /** Uivo: chama Gnolls Caçadores (no máximo 3 vivos). */
  private async howl(t: number): Promise<void> {
    this.pack = this.pack.filter((g) => g.alive);
    if (this.pack.length >= 3) return this.boneRain(t);
    this.sprite.play('king_gnoll_attack');
    this.scene.cameras.main.shake(500, 0.004);
    sfx('boss');
    for (let i = 0; i < (this.phase2 ? 2 : 1) && this.ok(t); i++) {
      await this.wait(350);
      const x = i % 2 ? this.host.x0 + 90 : this.host.x1 - 90;
      this.pack.push(this.host.spawnEnemy('gnoll_hunter' as CharId, x, this.host.floor));
    }
    this.play('king_gnoll_idle');
    await this.wait(700);
  }

  /** Chuva de ossos: marcas no chão e ossos caindo do céu. */
  private async boneRain(t: number): Promise<void> {
    const s = this.scene;
    this.sprite.play('king_gnoll_attack');
    const n = this.phase2 ? 7 : 5;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) xs.push(Phaser.Math.Between(this.host.x0 + 60, this.host.x1 - 60));
    xs.push(this.player.x);
    for (const x of xs) this.warnMark(x, 700);
    await this.wait(700);
    if (!this.ok(t)) return;
    for (const x of xs) {
      const b = s.add.sprite(x, this.host.ceiling, 'bone').setScale(1.4).setDepth(DEPTH.projectiles).play('bone');
      this.addHazard({
        x,
        y: this.host.ceiling,
        w: 30,
        h: 30,
        until: s.time.now + 2500,
        obj: b,
        step: (dt, h) => {
          h.y += 700 * dt;
          b.setPosition(h.x, h.y);
          if (h.y > this.host.floor - 10) {
            h.dead = true;
            this.dust(h.x, this.host.floor, 0.8);
          }
        },
      });
    }
    await this.wait(900);
    this.play('king_gnoll_idle');
  }

  update(time: number, dt: number): void {
    super.update(time, dt);
    if (this.sprite.active) this.crown.setVisible(this.sprite.visible && !this.dying).setPosition(this.sprite.x + this.facing * 6, this.sprite.y - this.hurtH + 18);
  }

  protected onPlayerDied(): void {
    for (const g of this.pack) if (g.alive) g.sprite.setVisible(false);
    this.landWave = false;
  }

  destroy(): void {
    super.destroy();
    this.crown.destroy();
  }
}
