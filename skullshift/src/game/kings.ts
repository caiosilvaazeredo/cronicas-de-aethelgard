import Phaser from 'phaser';
import { DEPTH } from '../config';
import { Boss, type BossHost } from './boss';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { recolorSheet } from './sheets';
import { sfx } from './settings';

/** Folhas recoloridas de um rei (idle/run/attack) e as animações. */
function royal(scene: Phaser.Scene, base: string, key: string, counts: [number, number, number], palette: Record<number, number>): void {
  if (scene.textures.exists(`${key}_idle`)) return;
  (['idle', 'run', 'attack'] as const).forEach((part, i) => {
    recolorSheet(scene, `${base}_${part}`, `${key}_${part}`, 192, 192, palette);
    scene.anims.create({
      key: `${key}_${part}`,
      frames: scene.anims.generateFrameNumbers(`${key}_${part}`, { start: 0, end: counts[i] - 1 }),
      frameRate: part === 'attack' ? 14 : 10,
      repeat: part === 'attack' ? 0 : -1,
    });
  });
}

export function makeKings(scene: Phaser.Scene): void {
  // Rei Gnomo: chapéu roxo com faixa dourada (as cores do Xamã), barba branca.
  royal(scene, 'sgnome', 'king_gnome', [10, 6, 9], { 0xe09844: 0x7a2a8a, 0x9c664b: 0x4a1a5a, 0xf2ec7d: 0xd8a530, 0x9cbeaa: 0x2a4a6a });
  // Rei Goblin da Tocha: capuz preto e ouro, chama vermelha.
  royal(scene, 'torchgob', 'king_torchgob', [8, 6, 8], { 0x714646: 0x2a1a3a, 0xcf8935: 0xd8a530, 0xffdc00: 0xff5a2a, 0x955c3c: 0x8a1a1a, 0x8d6e52: 0x5a3a6a });
  // Rei Lagarto: verde-água e ouro, saia roxa.
  royal(scene, 'lizard', 'king_lizard', [7, 6, 9], { 0x3cbe57: 0x2a8a7a, 0x4b867b: 0x1a5a5a, 0xffed44: 0xffd36b, 0x693d5b: 0x6a2a7a });
}

/** Base comum: coroa sobre a cabeça e capangas chamados na luta. */
abstract class KingBoss extends Boss {
  protected crown: Phaser.GameObjects.Image;
  protected minions: Fighter[] = [];
  protected crownY = 0;

  constructor(host: BossHost, hp: number, key: string, scale: number, feetY: number, hurtW: number, hurtH: number, name: string, title: string, color: number) {
    super(host, hp, `${key}_idle`, scale, feetY, 192, hurtW, hurtH, name, title, color);
    this.crown = host.scene.add.image(0, -400, 'queen_crown').setAlpha(0).setScale(1).setDepth(DEPTH.fighters - 0.4).setVisible(false);
  }

  /** Chama capangas (no máximo `max` vivos). */
  protected async summon(t: number, char: string, n: number, max = 3): Promise<boolean> {
    this.minions = this.minions.filter((m) => m.alive);
    if (this.minions.length >= max) return false;
    this.play(this.roarAnim);
    this.exclaim();
    for (let i = 0; i < n && this.ok(t); i++) {
      await this.wait(350);
      const x = i % 2 ? this.host.x0 + 90 : this.host.x1 - 90;
      this.minions.push(this.host.spawnEnemy(char as CharId, x, this.host.floor));
    }
    await this.wait(600);
    this.play(this.idleAnim);
    return true;
  }

  /** Coisas caindo do céu em pontos marcados no chão. */
  protected async rain(t: number, tex: string, n: number, scale = 1.2): Promise<void> {
    const s = this.scene;
    const xs: number[] = [this.player.x];
    for (let i = 0; i < n; i++) xs.push(Phaser.Math.Between(this.host.x0 + 60, this.host.x1 - 60));
    for (const x of xs) this.warnMark(x, 700);
    await this.wait(700);
    if (!this.ok(t)) return;
    for (const x of xs) {
      const o = s.add.image(x, this.host.ceiling, tex).setScale(scale).setDepth(DEPTH.projectiles);
      this.addHazard({
        x,
        y: this.host.ceiling,
        w: 34,
        h: 34,
        until: s.time.now + 2500,
        obj: o,
        step: (dt, h) => {
          h.y += 680 * dt;
          o.setPosition(h.x, h.y).setAngle(o.angle + 300 * dt);
          if (h.y > this.host.floor - 12) {
            h.dead = true;
            this.dust(h.x, this.host.floor, 0.8);
          }
        },
      });
    }
    await this.wait(800);
  }

  /** Onda pelo chão saindo de x para os dois lados (pule). */
  protected groundWave(x: number, color: number, speed = 440): void {
    const s = this.scene;
    for (const dir of [-1, 1]) {
      const g = s.add.graphics().setDepth(DEPTH.projectiles);
      this.addHazard({
        x,
        y: this.host.floor - 18,
        w: 40,
        h: 36,
        until: s.time.now + 2600,
        obj: g,
        step: (dt, h) => {
          h.x += dir * speed * dt;
          g.clear();
          g.fillStyle(0x1d1a2b, 1).fillTriangle(h.x - 24, h.y + 18, h.x + 24, h.y + 18, h.x, h.y - 24);
          g.fillStyle(color, 1).fillTriangle(h.x - 18, h.y + 16, h.x + 18, h.y + 16, h.x, h.y - 16);
          if (h.x < this.host.x0 || h.x > this.host.x1) h.dead = true;
        },
      });
    }
  }

  /** Projéteis mirados no jogador, em arco. */
  protected lob(tex: string, n: number, tint?: number, anim?: string): void {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const ox = this.x + this.facing * 40;
      const oy = this.feet - this.hurtH * 0.7;
      const tx = this.player.x + (i - (n - 1) / 2) * 90;
      // Cai em (tx, chão) em `time` segundos, com gravidade fixa.
      const time = 0.9;
      const g = 1400;
      const vx = (tx - ox) / time;
      let vy = (this.host.floor - 20 - oy - 0.5 * g * time * time) / time;
      const o = anim ? s.add.sprite(ox, oy, tex).setScale(1.3).play(anim) : s.add.image(ox, oy, tex).setScale(1.3);
      o.setDepth(DEPTH.projectiles);
      if (tint !== undefined) o.setTint(tint);
      this.addHazard({
        x: ox,
        y: oy,
        w: 26,
        h: 26,
        until: s.time.now + 2400,
        obj: o,
        step: (dt, h) => {
          vy += g * dt;
          h.x += vx * dt;
          h.y += vy * dt;
          o.setPosition(h.x, h.y);
          if (h.y > this.host.floor - 8) h.dead = true;
        },
      });
    }
  }

  update(time: number, dt: number): void {
    super.update(time, dt);
    if (this.sprite.active) this.crown.setVisible(this.sprite.visible && !this.dying).setPosition(this.sprite.x + this.facing * 4, this.sprite.y - this.hurtH + this.crownY);
  }

  protected onPlayerDied(): void {
    for (const m of this.minions) if (m.alive) m.sprite.setVisible(false);
  }

  destroy(): void {
    super.destroy();
    this.crown.destroy();
  }
}

/**
 * Rei Gnomo, Guardião do Bosque: chuva de bolotas em arco, tora gigante rolando pelo chão
 * (pule), chama Gnomos de Chapéu Vermelho e sacode as árvores (galhos caindo).
 */
export class GnomeKingBoss extends KingBoss {
  constructor(host: BossHost) {
    super(host, 22, 'king_gnome', 2.6, 134, 140, 150, 'REI GNOMO', 'Guardião do Bosque', 0x7a2a8a);
    this.crownY = 4;
  }
  protected get idleAnim(): string {
    return 'king_gnome_idle';
  }
  protected get roarAnim(): string {
    return 'king_gnome_attack';
  }
  protected patternCount(): number {
    return 4;
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (k === 0) {
      for (let i = 0; i < (this.phase2 ? 3 : 2) && this.ok(t); i++) {
        this.faceToPlayer();
        this.sprite.play('king_gnome_attack');
        await this.wait(380);
        if (!this.ok(t)) return;
        this.lob('acorn', this.phase2 ? 4 : 3, undefined, 'acorn');
        sfx('attack');
        await this.wait(700);
      }
      this.play('king_gnome_idle');
    } else if (k === 1) await this.logRoll(t);
    else if (k === 2) {
      if (!(await this.summon(t, 'sgnome_red', this.phase2 ? 2 : 1))) await this.logRoll(t);
    } else {
      this.scene.cameras.main.shake(600, 0.005);
      this.sprite.play('king_gnome_attack');
      await this.rain(t, 'wood', this.phase2 ? 6 : 4, 0.9);
      this.play('king_gnome_idle');
    }
  }

  /** Tora gigante rolando pelo chão, de um lado ao outro. */
  private async logRoll(t: number): Promise<void> {
    const s = this.scene;
    this.faceToPlayer();
    this.exclaim();
    await this.wait(450);
    if (!this.ok(t)) return;
    const dir = this.facing;
    const lg = s.add.image(this.x + dir * 70, this.host.floor - 36, 'log_roll').setScale(2.2).setDepth(DEPTH.projectiles);
    sfx('boom');
    this.addHazard({
      x: lg.x,
      y: lg.y,
      w: 70,
      h: 70,
      until: s.time.now + 5000,
      obj: lg,
      step: (dt, h) => {
        h.x += dir * (this.phase2 ? 520 : 420) * dt;
        lg.setPosition(h.x, h.y).setAngle(lg.angle + dir * 400 * dt);
        if (h.x < this.host.x0 - 60 || h.x > this.host.x1 + 60) h.dead = true;
      },
    });
    await this.wait(900);
  }
}

/**
 * Rei Goblin da Tocha, Senhor das Minas: tocha no chão solta ondas de fogo (pule), joga tochas
 * em arco, chama Goblins Mineiros (bombas), desabamento do teto e investida pela arena.
 */
export class GoblinKingBoss extends KingBoss {
  constructor(host: BossHost) {
    super(host, 24, 'king_torchgob', 2.3, 130, 130, 160, 'REI GOBLIN DA TOCHA', 'Senhor das Minas', 0xd8a530);
    this.crownY = 12;
  }
  protected get idleAnim(): string {
    return 'king_torchgob_idle';
  }
  protected get roarAnim(): string {
    return 'king_torchgob_attack';
  }
  protected patternCount(): number {
    return 5;
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (k === 0) {
      for (let i = 0; i < (this.phase2 ? 2 : 1) && this.ok(t); i++) {
        this.faceToPlayer();
        this.sprite.play('king_torchgob_attack');
        await this.wait(420);
        if (!this.ok(t)) return;
        this.scene.cameras.main.shake(180, 0.008);
        this.groundWave(this.x, 0xff7a1a, this.phase2 ? 520 : 440);
        sfx('boom');
        await this.wait(800);
      }
    } else if (k === 1) {
      this.faceToPlayer();
      this.sprite.play('king_torchgob_attack');
      await this.wait(350);
      if (!this.ok(t)) return;
      this.lob('fire_ball', this.phase2 ? 4 : 3);
      await this.wait(900);
    } else if (k === 2) {
      if (!(await this.summon(t, 'torchgob_miner', this.phase2 ? 2 : 1))) await this.dash(t);
    } else if (k === 3) {
      this.scene.cameras.main.shake(700, 0.006);
      await this.rain(t, 'stone2', this.phase2 ? 6 : 4, 1);
    } else await this.dash(t);
    this.play('king_torchgob_idle');
  }

  /** Investida: corre de um lado da arena ao outro. */
  private async dash(t: number): Promise<void> {
    this.faceToPlayer();
    this.exclaim();
    await this.wait(this.phase2 ? 350 : 500);
    if (!this.ok(t)) return;
    this.play('king_torchgob_run');
    this.vx = this.facing * (this.phase2 ? 720 : 600);
    const until = this.scene.time.now + 1600;
    while (this.ok(t) && this.vx !== 0 && this.scene.time.now < until) await this.wait(50);
    this.vx = 0;
    this.scene.cameras.main.shake(150, 0.006);
    await this.wait(400);
  }

  protected onWall(): void {
    this.dust(this.x, this.host.floor, 1.4);
  }
}

/**
 * Rei Lagarto, Senhor da Lagoa: rajada de veneno mirada, língua comprida varrendo na altura do
 * peito (agache ou pule), salto que espalha poças de veneno e chama Lagartos Venenosos.
 */
export class LizardKingBoss extends KingBoss {
  private landPuddles = false;

  constructor(host: BossHost) {
    super(host, 22, 'king_lizard', 2.0, 148, 130, 200, 'REI LAGARTO', 'Senhor da Lagoa', 0x2a8a7a);
    this.crownY = 26;
  }
  protected get idleAnim(): string {
    return 'king_lizard_idle';
  }
  protected get roarAnim(): string {
    return 'king_lizard_attack';
  }
  protected patternCount(): number {
    return 4;
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (k === 0) {
      for (let i = 0; i < (this.phase2 ? 4 : 3) && this.ok(t); i++) {
        this.faceToPlayer();
        this.sprite.play('king_lizard_attack');
        this.lob('poison_ball', 1);
        await this.wait(380);
      }
    } else if (k === 1) await this.tongue(t);
    else if (k === 2) await this.leap(t);
    else if (!(await this.summon(t, 'lizard_poison', this.phase2 ? 2 : 1))) await this.tongue(t);
    this.play('king_lizard_idle');
  }

  /** Língua comprida varrendo à frente, na altura do peito (baixa: pule; alta: agache). */
  private async tongue(t: number): Promise<void> {
    const s = this.scene;
    this.faceToPlayer();
    this.exclaim();
    await this.wait(this.phase2 ? 350 : 500);
    if (!this.ok(t)) return;
    this.sprite.play('king_lizard_attack');
    const low = Math.random() < 0.5;
    const y = low ? this.host.floor - 24 : this.host.floor - 86;
    const g = s.add.graphics().setDepth(DEPTH.projectiles);
    const dir = this.facing;
    const ox = this.x + dir * 50;
    const len = { v: 0 };
    const h = this.addHazard({ x: ox, y, w: 30, h: 22, until: s.time.now + 1400, obj: g });
    sfx('attack');
    s.tweens.add({
      targets: len,
      v: 620,
      duration: 360,
      yoyo: true,
      hold: 120,
      onUpdate: () => {
        const tipX = ox + dir * len.v;
        g.clear();
        g.lineStyle(10, 0x1d1a2b, 1).lineBetween(ox, y, tipX, y);
        g.lineStyle(6, 0xff8ab0, 1).lineBetween(ox, y, tipX, y);
        g.fillStyle(0x1d1a2b, 1).fillCircle(tipX, y, 11);
        g.fillStyle(0xff5a8a, 1).fillCircle(tipX, y, 8);
        h.x = (ox + tipX) / 2;
        h.w = Math.max(30, len.v);
      },
    });
    await this.wait(1000);
  }

  /** Salto sobre o jogador: ao cair, espalha poças de veneno. */
  private async leap(t: number): Promise<void> {
    this.faceToPlayer();
    await this.wait(300);
    if (!this.ok(t)) return;
    const tx = Phaser.Math.Clamp(this.player.x, this.host.x0 + 90, this.host.x1 - 90);
    this.warnMark(tx, 700);
    this.airborne = true;
    this.vy = -1100;
    this.vx = (tx - this.x) / 1.0;
    this.landPuddles = true;
    while (this.ok(t) && this.airborne) await this.wait(50);
    this.vx = 0;
    await this.wait(500);
  }

  protected onLand(): void {
    if (!this.landPuddles) return;
    this.landPuddles = false;
    const s = this.scene;
    s.cameras.main.shake(220, 0.01);
    for (const dx of [-160, 160]) {
      const x = Phaser.Math.Clamp(this.x + dx, this.host.x0 + 40, this.host.x1 - 40);
      const g = s.add.graphics().setDepth(DEPTH.deco + 0.7);
      g.fillStyle(0x1d1a2b, 1).fillEllipse(x, this.host.floor - 2, 110, 18);
      g.fillStyle(0x8ad84a, 1).fillEllipse(x, this.host.floor - 3, 100, 12);
      g.fillStyle(0xc8f05a, 1).fillEllipse(x - 20, this.host.floor - 5, 30, 4);
      this.addHazard({ x, y: this.host.floor - 8, w: 90, h: 16, until: s.time.now + 2600, obj: g });
    }
  }
}
