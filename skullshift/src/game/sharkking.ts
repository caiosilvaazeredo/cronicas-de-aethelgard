import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, FONT, TILE } from '../config';
import { Boss, type BossHost } from './boss';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { recolorSheet } from './sheets';
import { sfx } from './settings';

/** Rei Tubarão-Arpão: azul-real e ouro (espinhos dourados, olhos vermelhos). */
const KING_SHARK_PALETTE: Record<number, number> = {
  0x289092: 0x1e3a8a,
  0x195d6b: 0x10204a,
  0x40ac92: 0x3a6ad8,
  0xbfc3bf: 0xf4e4b0,
  0xe0dbcf: 0xfff1c8,
  0x9ec9be: 0xd8c890,
  0xfef07c: 0xff3a3a,
  0x6f9193: 0xd8a530,
  0x365862: 0x8a6a20,
};

export function makeKingShark(scene: Phaser.Scene): void {
  if (scene.textures.exists('king_shark_idle')) return;
  const parts: Array<[string, number, number, number]> = [
    ['idle', 8, 10, -1],
    ['run', 6, 12, -1],
    ['attack', 8, 16, 0],
  ];
  for (const [part, n, fps, repeat] of parts) {
    recolorSheet(scene, `shark_${part}`, `king_shark_${part}`, 192, 192, KING_SHARK_PALETTE);
    scene.anims.create({ key: `king_shark_${part}`, frames: scene.anims.generateFrameNumbers(`king_shark_${part}`, { start: 0, end: n - 1 }), frameRate: fps, repeat });
  }
}

/** O que a arena da maré oferece além do básico. */
export interface TideArena {
  /** Bacia de areia no meio (x do mundo): onde a maré cobre e o rei encalha. */
  basin: [number, number];
  /** Altura das plataformas laterais (pés) e da maré alta (px). */
  sideFeet: number;
  high: number;
  setTide(px: number): void;
  waterY(): number;
  /** Cria uma plataforma temporária (arpão cravado); devolve quem a remove. */
  addLedge(x: number, top: number, w: number): () => void;
}

/**
 * Rei Tubarão-Arpão, Senhor da Maré. O chefe comanda a maré da arena:
 * - Maré baixa: encalha na areia, se debatendo; é quando dá para bater nele (ele morde quem
 *   chega perto).
 * - Maré alta: só a barbatana aparece. Salta em arco por cima do jogador, atira arpões que se
 *   cravam no ar e viram plataformas por um tempo, e chama Tubarões de Coral.
 */
export class SharkKingBoss extends Boss {
  private fin: Phaser.GameObjects.Graphics;
  private crown: Phaser.GameObjects.Image;
  private submerged = false;
  private leaping = false;
  private cycle: 'low' | 'high' = 'low';
  private cycleAt = 0;
  private warned = false;
  private ledges: Array<() => void> = [];
  private minions: Fighter[] = [];

  constructor(
    host: BossHost,
    private arena: TideArena,
  ) {
    super(host, 18, 'king_shark_idle', 2.3, 132, 192, 160, 130, 'REI TUBARÃO-ARPÃO', 'Senhor da Maré', 0x1e3a8a);
    this.x = (arena.basin[0] + arena.basin[1]) / 2;
    const s = host.scene;
    this.fin = s.add.graphics().setDepth(DEPTH.fighters + 0.7);
    this.crown = s.add.image(0, -400, 'queen_crown').setAlpha(0).setScale(1.1).setDepth(DEPTH.fighters - 0.4).setVisible(false);
  }

  protected get idleAnim(): string {
    return 'king_shark_idle';
  }
  protected get roarAnim(): string {
    return 'king_shark_attack';
  }
  protected patternCount(): number {
    return 3;
  }

  private get basinMid(): number {
    return (this.arena.basin[0] + this.arena.basin[1]) / 2;
  }

  protected async afterIntro(): Promise<void> {
    this.cycle = 'low';
    this.cycleAt = this.scene.time.now;
    this.banner('MARÉ BAIXA: ATAQUE AGORA!', '#ffe066');
  }

  // ---------- maré ----------

  private banner(text: string, color: string): void {
    const s = this.scene;
    const cam = s.cameras.main;
    const t = s.add
      .text(cam.scrollX + cam.width / 2, cam.scrollY + 150, text, { fontFamily: FONT, fontSize: '34px', color, stroke: '#1d1a2b', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 5)
      .setScale(0.5);
    s.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    s.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  }

  private updateCycle(time: number): void {
    const lowMs = this.phase2 ? 4200 : 5200;
    const highMs = this.phase2 ? 7500 : 6500;
    const since = time - this.cycleAt;
    if (this.cycle === 'low') {
      this.arena.setTide(0);
      if (!this.warned && since > lowMs - 1600) {
        this.warned = true;
        this.banner('A MARÉ VAI SUBIR! SUBA!', '#bfe9ff');
        this.scene.cameras.main.shake(500, 0.003);
      }
      if (since > lowMs) {
        this.cycle = 'high';
        this.cycleAt = time;
        this.warned = false;
      }
    } else {
      this.arena.setTide(this.arena.high);
      if (since > highMs && !this.leaping) {
        this.cycle = 'low';
        this.cycleAt = time;
        this.banner('MARÉ BAIXA: ATAQUE AGORA!', '#ffe066');
      }
    }
    // Afunda quando a água cobre a bacia; encalha quando ela vai embora.
    const covered = this.arena.waterY() < FLOOR_Y - 30;
    if (covered && !this.submerged) this.dive();
    else if (!covered && this.submerged && !this.leaping) this.beach();
  }

  private dive(): void {
    this.submerged = true;
    this.sprite.setAngle(0);
    this.scene.tweens.killTweensOf(this.sprite);
    this.dust(this.x, this.arena.waterY(), 1.4);
    sfx('hit');
  }

  private beach(): void {
    this.submerged = false;
    this.x = Phaser.Math.Clamp(this.x, this.arena.basin[0] + 60, this.arena.basin[1] - 60);
    this.feet = this.host.floor;
    this.vx = 0;
    this.play('king_shark_idle');
    this.sprite.anims.timeScale = 0.5;
    // Se debate na areia.
    this.scene.tweens.add({ targets: this.sprite, angle: { from: -10, to: 10 }, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------- regras de dano ----------

  protected beforeDamage(): boolean {
    // Debaixo d'água não leva dano; no salto e encalhado, sim.
    return !this.submerged || this.leaping;
  }

  protected touches(p: Fighter): boolean {
    if (this.submerged && !this.leaping) return false;
    return super.touches(p);
  }

  // ---------- padrões ----------

  protected async pattern(k: number, t: number): Promise<void> {
    if (!this.submerged) return this.flop(t);
    if (k === 0) await this.leap(t);
    else if (k === 1) await this.harpoons(t);
    else await this.summon(t);
  }

  /** Encalhado: abocanha quem chega perto. */
  private async flop(t: number): Promise<void> {
    const p = this.player;
    if (Math.abs(p.x - this.x) < 190 && Math.abs(p.feet - this.feet) < 60) {
      this.faceToPlayer();
      this.exclaim();
      await this.wait(this.phase2 ? 280 : 420);
      if (!this.ok(t) || this.submerged) return;
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAngle(0);
      this.sprite.play('king_shark_attack');
      const s = this.scene;
      const lunge = { x: this.x };
      await new Promise<void>((r) =>
        s.tweens.add({
          targets: lunge,
          x: Phaser.Math.Clamp(this.x + this.facing * 120, this.arena.basin[0] + 40, this.arena.basin[1] - 40),
          duration: 180,
          onUpdate: () => (this.x = lunge.x),
          onComplete: () => r(),
        }),
      );
      this.addHazard({ x: this.x + this.facing * 60, y: this.feet - 40, w: 90, h: 70, until: s.time.now + 160 });
      await this.wait(500);
      if (!this.ok(t) || this.submerged) return;
      this.beach();
    } else await this.wait(500);
  }

  /** Salto em arco por cima do jogador, saindo e voltando para a água. */
  private async leap(t: number): Promise<void> {
    const s = this.scene;
    const p = this.player;
    const [bl, br] = this.arena.basin;
    const px = p.x;
    const x0 = Phaser.Math.Clamp(px < this.basinMid ? bl + 40 : br - 40, bl, br);
    // A barbatana vai até o ponto de partida.
    await this.swimTo(x0, t);
    if (!this.ok(t) || !this.submerged) return;
    this.warnMark(px, 500);
    await this.wait(this.phase2 ? 380 : 520);
    if (!this.ok(t) || !this.submerged) return;
    const wy = this.arena.waterY();
    const y0 = wy + 60;
    const x2 = Phaser.Math.Clamp(2 * px - x0, bl + 40, br - 40);
    const midY = p.feet - 30;
    const xc = 2 * px - 0.5 * (x0 + x2);
    const yc = 2 * midY - 0.5 * (y0 + y0);
    this.leaping = true;
    this.sprite.play('king_shark_attack');
    sfx('jump');
    this.dust(x0, wy, 1.6);
    const k = { t: 0 };
    await new Promise<void>((r) =>
      s.tweens.add({
        targets: k,
        t: 1,
        duration: this.phase2 ? 900 : 1100,
        onUpdate: () => {
          const u = k.t;
          const a = (1 - u) * (1 - u);
          const b = 2 * (1 - u) * u;
          const c = u * u;
          const nx = a * x0 + b * xc + c * x2;
          this.facing = nx >= this.x ? 1 : -1;
          this.sprite.setFlipX(this.facing < 0);
          this.x = nx;
          this.feet = a * y0 + b * yc + c * y0;
          this.sprite.setAngle(this.facing * (u - 0.5) * 70);
        },
        onComplete: () => r(),
      }),
    );
    this.leaping = false;
    this.sprite.setAngle(0);
    this.dust(this.x, this.arena.waterY(), 1.6);
    s.cameras.main.shake(160, 0.006);
    this.play('king_shark_idle');
  }

  /** Põe a cabeça para fora e atira arpões que se cravam no ar (viram plataformas). */
  private async harpoons(t: number): Promise<void> {
    const s = this.scene;
    const [bl, br] = this.arena.basin;
    await this.swimTo(this.basinMid, t);
    if (!this.ok(t) || !this.submerged) return;
    const n = this.phase2 ? 4 : 3;
    const top = FLOOR_Y - TILE * 1.6;
    for (let i = 0; i < n && this.ok(t) && this.submerged; i++) {
      const tx = bl + ((i + 0.5) / n) * (br - bl);
      const from = { x: this.x, y: this.arena.waterY() };
      const img = s.add.image(from.x, from.y, 'harpoon').setDepth(DEPTH.projectiles).setScale(1.3);
      this.addHazard({
        x: from.x,
        y: from.y,
        w: 30,
        h: 30,
        until: s.time.now + 700,
        obj: undefined,
        step: (_dt, h) => {
          h.x = img.x;
          h.y = img.y;
        },
      });
      sfx('attack');
      s.tweens.add({
        targets: img,
        x: tx,
        y: top - 20,
        angle: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Cravado: vira um degrau por alguns segundos e depois cai.
          img.setAngle(0).setY(top + 6);
          this.ledges.push(this.arena.addLedge(tx, top, 92));
          const remove = this.ledges[this.ledges.length - 1];
          s.tweens.add({ targets: img, alpha: 0.3, delay: 5200, duration: 400, yoyo: true, repeat: 1 });
          s.time.delayedCall(6200, () => {
            remove();
            s.tweens.add({ targets: img, y: img.y + 200, alpha: 0, duration: 500, onComplete: () => img.destroy() });
          });
        },
      });
      await this.wait(260);
    }
    await this.wait(500);
  }

  /** Chama Tubarões de Coral para as plataformas laterais. */
  private async summon(t: number): Promise<void> {
    this.minions = this.minions.filter((m) => m.alive);
    if (this.minions.length >= 2) return this.leap(t);
    const side = this.player.x < this.basinMid ? this.host.x1 - 110 : this.host.x0 + 110;
    this.exclaim();
    await this.wait(400);
    if (!this.ok(t)) return;
    this.minions.push(this.host.spawnEnemy('shark_coral' as CharId, side, this.arena.sideFeet));
    await this.wait(600);
  }

  /** A barbatana nada até x (ou até a maré baixar). */
  private async swimTo(x: number, t: number): Promise<void> {
    const speed = this.phase2 ? 360 : 260;
    while (this.ok(t) && this.submerged && Math.abs(this.x - x) > 10) {
      this.x += Math.sign(x - this.x) * Math.min(Math.abs(x - this.x), speed * 0.05);
      this.facing = x < this.x ? -1 : 1;
      await this.wait(50);
    }
  }

  // ---------- quadro a quadro ----------

  update(time: number, dt: number): void {
    if (this.fighting && !this.dying) this.updateCycle(time);
    super.update(time, dt);
    if (!this.sprite.active) return;
    const wy = this.arena.waterY();
    if (this.submerged && !this.leaping && !this.dying) {
      this.feet = wy + 140;
      this.sprite.setAlpha(0);
      // Barbatana cortando a água.
      const g = this.fin;
      g.clear();
      const x = Math.round(this.x);
      const y = Math.round(wy) + 4;
      const f = this.facing;
      g.fillStyle(0x1d1a2b, 1).fillTriangle(x - 26 * f, y, x + 18 * f, y, x - 4 * f, y - 48);
      g.fillStyle(0x1e3a8a, 1).fillTriangle(x - 20 * f, y - 2, x + 12 * f, y - 2, x - 4 * f, y - 40);
      g.fillStyle(0x3a6ad8, 1).fillTriangle(x - 8 * f, y - 4, x + 8 * f, y - 4, x - 4 * f, y - 32);
      g.fillStyle(0xd8a530, 1).fillRect(x - 6, y - 46, 4, 4);
      g.lineStyle(2, 0xe8f8ff, 0.8).lineBetween(x - 34 * f, y + 6, x - 60 * f, y + 2);
    } else this.fin.clear();
    this.crown
      .setVisible(this.sprite.visible && this.sprite.alpha > 0 && !this.dying)
      .setPosition(this.sprite.x - this.facing * 4, this.sprite.y - this.hurtH - 2)
      .setAngle(this.sprite.angle);
  }

  protected onPlayerDied(): void {
    this.leaping = false;
    for (const r of this.ledges) r();
    this.ledges = [];
    this.cycle = 'low';
    this.cycleAt = this.scene.time.now;
    this.warned = false;
    this.arena.setTide(0);
  }

  protected async refill(): Promise<void> {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0);
    this.submerged = false;
    this.feet = this.host.floor;
    this.x = this.basinMid;
    await super.refill();
    this.cycleAt = this.scene.time.now;
    this.beach();
  }

  destroy(): void {
    super.destroy();
    this.fin.destroy();
    this.crown.destroy();
    for (const r of this.ledges) r();
  }
}
