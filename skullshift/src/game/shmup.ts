import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import type { Intent } from './controls';
import { sfx } from './settings';
import type { BossBar } from './boss';

/** O que a cena do jogo oferece à fase de voo. */
export interface ShmupHost {
  scene: Phaser.Scene;
  /** Comprimento da fase (px do mundo). */
  width: number;
  intent(): Intent;
  /** Metade da largura visível (em pé a câmera mostra menos). */
  halfView(): number;
  /** Faixa vertical jogável (topo e base). */
  top: number;
  bottom: number;
  color: number;
  /** Conta a morte; true = acabaram as vidas (a fase recomeça sozinha). */
  died(): boolean;
  win(): void;
  popText(x: number, y: number, text: string, color: string): void;
  /** Chefe no fim (Diabrete Gigante) e montaria (morcego ou abelhão). */
  boss?: boolean;
  mount?: 'bat' | 'bee';
  bar?: () => BossBar | undefined;
}

interface Foe {
  sprite: Phaser.GameObjects.Sprite;
  kind: 'bat' | 'bee' | 'imp';
  hp: number;
  t: number;
  baseY: number;
  vx: number;
  shootAt: number;
  r: number;
}

interface Shot {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  r: number;
  enemy: boolean;
}

const SCROLL = 150;
const SPEED = 330;

/**
 * Voo noturno (fase de tiro com rolagem automática): a caveira monta um morcego gigante.
 * A tela anda sozinha; dá para voar em todas as direções e atirar ossos para a frente.
 * Ondas de morcegos, abelhas atiradoras e diabretes em zigue-zague. Um toque derruba.
 */
export class ShmupSystem {
  camX: number;
  private x: number;
  private y: number;
  private rider: Phaser.GameObjects.Container;
  private bat: Phaser.GameObjects.Sprite;
  private foes: Foe[] = [];
  private shots: Shot[] = [];
  private waves: Array<{ at: number; spawn: () => void }> = [];
  private nextShot = 0;
  private alive = true;
  private invulnUntil = 0;
  private done = false;

  constructor(private host: ShmupHost) {
    const s = host.scene;
    this.camX = host.halfView();
    this.x = this.camX - host.halfView() + 220;
    this.y = (host.top + host.bottom) / 2;
    const mount = host.mount === 'bee' ? 'bee_idle' : 'bat_idle';
    this.bat = s.add.sprite(0, 0, mount).setScale(host.mount === 'bee' ? 1.25 : 1.35).play(mount);
    const skull = s.add.sprite(-4, -58, 'skull_idle').setScale(0.62).play('skull_idle');
    const aura = s.add.image(0, -30, 'aura').setTint(host.color).setScale(0.9, 0.8).setAlpha(0.5);
    this.rider = s.add.container(this.x, this.y, [aura, this.bat, skull]).setDepth(DEPTH.fighters + 1);
    this.planWaves();
  }

  /** Roteiro das ondas ao longo da fase (fica mais apertado no fim). */
  private planWaves(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['skullshift-night-flight']);
    const end = this.host.width - 900;
    let at = 900;
    let k = 0;
    while (at < end) {
      const level = at / end;
      const kind = k % 5;
      const y0 = rng.between(this.host.top + 80, this.host.bottom - 80);
      if (kind === 0) this.waves.push({ at, spawn: () => this.line('bat', 3 + Math.round(level * 2), y0) });
      else if (kind === 1) this.waves.push({ at, spawn: () => this.vee(y0) });
      else if (kind === 2) this.waves.push({ at, spawn: () => this.pair('bee') });
      else if (kind === 3) this.waves.push({ at, spawn: () => this.line('imp', 2 + Math.round(level * 2), y0) });
      else this.waves.push({ at, spawn: () => (this.pair('bee'), this.line('bat', 3, y0)) });
      at += rng.between(380, 520) - level * 120;
      k++;
    }
  }

  private spawn(kind: Foe['kind'], x: number, y: number, delay = 0): void {
    const s = this.host.scene;
    s.time.delayedCall(delay, () => {
      if (this.done) return;
      const key = kind === 'bat' ? 'bat_idle' : kind === 'bee' ? 'bee_idle' : 'imp_idle';
      const sprite = s.add.sprite(x, y, key).setScale(kind === 'bat' ? 0.8 : 0.75).setFlipX(true).setDepth(DEPTH.fighters).play(key);
      this.foes.push({ sprite, kind, hp: kind === 'bee' ? 3 : 1, t: 0, baseY: y, vx: kind === 'bee' ? -SCROLL * 0.2 : kind === 'imp' ? -260 : -200, shootAt: s.time.now + 900, r: kind === 'bee' ? 36 : 28 });
    });
  }

  private get right(): number {
    return this.camX + this.host.halfView();
  }
  private get left(): number {
    return this.camX - this.host.halfView();
  }

  private line(kind: Foe['kind'], n: number, y: number): void {
    for (let i = 0; i < n; i++) this.spawn(kind, this.right + 60, y, i * 280);
  }
  private vee(y: number): void {
    for (let i = 0; i < 5; i++) this.spawn('bat', this.right + 60 + Math.abs(i - 2) * 60, y + (i - 2) * 60);
  }
  private pair(kind: Foe['kind']): void {
    const t = this.host.top + 90;
    const b = this.host.bottom - 90;
    this.spawn(kind, this.right + 60, t);
    this.spawn(kind, this.right + 60, b, 300);
  }

  update(time: number, dt: number): void {
    const s = this.host.scene;
    // Rolagem automática até o fim.
    const maxCam = this.host.width - this.host.halfView();
    if (!this.done) this.camX = Math.min(maxCam, this.camX + SCROLL * dt);
    while (this.waves.length && this.waves[0].at <= this.right) this.waves.shift()!.spawn();

    // Jogador.
    if (this.alive) {
      const it = this.host.intent();
      const up = it.jumpHeld || it.jump;
      const dy = (it.crouch ? 1 : 0) - (up ? 1 : 0);
      this.x += it.move * SPEED * dt + SCROLL * dt * (this.done ? 0 : 1);
      this.y += dy * SPEED * dt;
      this.x = Phaser.Math.Clamp(this.x, this.left + 60, this.right - 80);
      this.y = Phaser.Math.Clamp(this.y, this.host.top + 40, this.host.bottom - 20);
      this.bat.setAngle(Phaser.Math.Linear(this.bat.angle, dy * 12 + it.move * 6, 0.2));
      // Tiro automático para a frente; apertar ATACAR solta um osso na hora.
      if (it.attack || time >= this.nextShot) {
        this.nextShot = time + 300;
        this.fire();
      }
      this.rider.setPosition(this.x, this.y + Math.sin(time / 160) * 4);
      this.rider.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 ? 0.35 : 1);
    }

    // Inimigos.
    for (const f of this.foes) {
      f.t += dt;
      if (f.kind === 'bat') {
        f.sprite.x += f.vx * dt;
        f.sprite.y = f.baseY + Math.sin(f.t * 3) * 70;
      } else if (f.kind === 'imp') {
        f.sprite.x += f.vx * dt;
        // Zigue-zague (onda triangular).
        f.sprite.y = f.baseY + 60 * (2 * Math.abs(((f.t * 1.2) % 2) - 1) - 1);
      } else {
        // Abelha: entra e para perto da borda, atirando no jogador.
        const stop = this.right - 160;
        if (f.sprite.x > stop) f.sprite.x -= 220 * dt;
        else f.sprite.x += SCROLL * dt;
        f.sprite.y = f.baseY + Math.sin(f.t * 2) * 30;
        if (time >= f.shootAt && this.alive) {
          f.shootAt = time + 1300;
          const a = Phaser.Math.Angle.Between(f.sprite.x, f.sprite.y, this.x, this.y);
          const o = s.add.image(f.sprite.x - 30, f.sprite.y, 'spark').setTint(0xffd36b).setScale(0.9).setDepth(DEPTH.projectiles);
          this.shots.push({ obj: o, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 12, enemy: true });
        }
      }
      if (f.sprite.x < this.left - 120) f.hp = -1;
    }

    // Tiros.
    for (const sh of this.shots) {
      sh.obj.x += sh.vx * dt;
      sh.obj.y += sh.vy * dt;
      if (sh.obj.x > this.right + 80 || sh.obj.x < this.left - 80 || sh.obj.y < -100 || sh.obj.y > 900) sh.r = -1;
      if (sh.r < 0) continue;
      if (!sh.enemy) {
        for (const f of this.foes) {
          if (f.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(sh.obj.x, sh.obj.y, f.sprite.x, f.sprite.y) < f.r + sh.r) {
            f.hp--;
            sh.r = -1;
            f.sprite.setTintFill(0xffffff);
            s.time.delayedCall(70, () => f.sprite.active && f.sprite.clearTint());
            if (f.hp <= 0) this.pop(f.sprite.x, f.sprite.y);
            break;
          }
        }
      } else if (this.hits(sh.obj.x, sh.obj.y, sh.r, time)) sh.r = -1;
    }
    for (const f of this.foes) if (f.hp > 0 && this.hits(f.sprite.x, f.sprite.y, f.r - 6, time)) f.hp = 0, this.pop(f.sprite.x, f.sprite.y);

    this.foes = this.foes.filter((f) => {
      if (f.hp > 0) return true;
      f.sprite.destroy();
      return false;
    });
    this.shots = this.shots.filter((sh) => {
      if (sh.r >= 0) return true;
      sh.obj.destroy();
      return false;
    });

    // Chefe: no fim da rolagem, o Diabrete Gigante entra.
    if (this.host.boss && !this.bossSpawned && this.camX >= maxCam && this.waves.length === 0 && this.foes.length === 0) this.spawnBoss();
    if (this.boss) this.updateBoss(time, dt);

    // Fim da fase: a rolagem chegou ao fim e o céu ficou limpo.
    if (!this.done && !this.host.boss && this.camX >= maxCam && this.waves.length === 0 && this.foes.length === 0 && this.alive) {
      this.done = true;
      this.host.popText(this.x, this.y - 90, 'CÉU LIMPO!', '#9dffb0');
      s.time.delayedCall(900, () => this.host.win());
    }
  }

  // ---------- chefe: Diabrete Gigante ----------

  private bossSpawned = false;
  private boss?: { sprite: Phaser.GameObjects.Sprite; hp: number; max: number; t: number; next: number; k: number; dashing: number; hurt: number; dying: boolean };

  private spawnBoss(): void {
    const s = this.host.scene;
    this.bossSpawned = true;
    const sprite = s.add.sprite(this.right + 200, (this.host.top + this.host.bottom) / 2, 'imp_idle').setScale(3).setFlipX(true).setDepth(DEPTH.fighters).play('imp_idle');
    this.boss = { sprite, hp: 40, max: 40, t: 0, next: s.time.now + 2200, k: 0, dashing: 0, hurt: 0, dying: false };
    s.cameras.main.shake(400, 0.006);
    sfx('boss');
    this.host.bar?.()?.bossWarning();
    s.time.delayedCall(1200, () => {
      this.host.bar?.()?.showBossBar('DIABRETE GIGANTE', 'Senhor dos Céus', 0xe05a2a);
      this.host.bar?.()?.setBossHp(1);
    });
  }

  private updateBoss(time: number, dt: number): void {
    const b = this.boss!;
    const s = this.host.scene;
    if (b.dying) return;
    b.t += dt;
    const homeX = this.right - 200;
    // Entra pela direita e flutua; no bote avança até o jogador e volta.
    if (b.dashing > 0) {
      b.dashing -= dt;
      b.sprite.x += -900 * dt;
      if (b.dashing <= 0) b.sprite.x = Math.max(b.sprite.x, this.left + 200);
    } else b.sprite.x = Phaser.Math.Linear(b.sprite.x, homeX, 0.04);
    b.sprite.y = (this.host.top + this.host.bottom) / 2 + Math.sin(b.t * 1.3) * 150;
    b.sprite.setAlpha(time < b.hurt ? 0.6 : 1);
    // Padrões em sequência (mais rápidos com metade da vida).
    if (time >= b.next && b.dashing <= 0 && this.alive) {
      const angry = b.hp <= b.max / 2;
      b.next = time + (angry ? 1500 : 2200);
      const k = b.k++ % 4;
      const shoot = (a: number, speed: number) => {
        const o = s.add.image(b.sprite.x - 80, b.sprite.y, 'spark').setTint(0xff7a1a).setScale(1.1).setDepth(DEPTH.projectiles);
        this.shots.push({ obj: o, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 14, enemy: true });
      };
      if (k === 0) for (let i = -3; i <= 3; i++) shoot(Math.PI + i * 0.18, 360);
      else if (k === 1) {
        for (let i = 0; i < (angry ? 5 : 3); i++)
          s.time.delayedCall(i * 160, () => {
            if (!this.boss || this.boss.dying) return;
            shoot(Phaser.Math.Angle.Between(b.sprite.x, b.sprite.y, this.x, this.y), 480);
          });
      } else if (k === 2) {
        b.dashing = 0.9;
        this.host.popText(b.sprite.x, b.sprite.y - 140, '!', '#ff5c5c');
      } else {
        const y = Phaser.Math.Between(this.host.top + 60, this.host.bottom - 60);
        this.line('bat', angry ? 4 : 3, y);
      }
    }
    // Tiros do jogador acertam o chefe.
    for (const sh of this.shots) {
      if (sh.enemy || sh.r < 0) continue;
      if (Phaser.Math.Distance.Between(sh.obj.x, sh.obj.y, b.sprite.x, b.sprite.y) < 110) {
        sh.r = -1;
        b.hp--;
        b.hurt = time + 90;
        this.host.bar?.()?.setBossHp(b.hp / b.max);
        if (b.hp <= 0) return this.bossDown();
      }
    }
    // Encostar no chefe derruba.
    this.hits(b.sprite.x, b.sprite.y, 90, time);
  }

  /** Derrota em cadeia: explosões pelo corpo, clarão e orbes em estrela. */
  private bossDown(): void {
    const b = this.boss!;
    const s = this.host.scene;
    b.dying = true;
    for (const sh of this.shots) if (sh.enemy) sh.r = -1;
    this.host.bar?.()?.setBossHp(0);
    for (let i = 0; i < 14; i++) {
      s.time.delayedCall(i * 100, () => {
        b.sprite.setTintFill(i % 2 ? 0xffffff : 0xff7a1a);
        this.pop(b.sprite.x + Phaser.Math.Between(-90, 90), b.sprite.y + Phaser.Math.Between(-90, 90));
      });
    }
    s.time.delayedCall(1500, () => {
      s.cameras.main.flash(500, 255, 255, 255);
      const cx = b.sprite.x;
      const cy = b.sprite.y;
      b.sprite.destroy();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const o = s.add.image(cx, cy, 'orb').setDepth(DEPTH.fx + 2);
        s.tweens.add({ targets: o, x: cx + Math.cos(a) * 600, y: cy + Math.sin(a) * 600, alpha: 0, duration: 1500, onComplete: () => o.destroy() });
      }
      this.host.bar?.()?.hideBossBar();
      this.done = true;
      s.time.delayedCall(1700, () => this.host.win());
    });
  }

  private fire(): void {
    const s = this.host.scene;
    const o = s.add.sprite(this.x + 50, this.y - 40, 'bone').setScale(0.8).setDepth(DEPTH.projectiles).play('bone');
    this.shots.push({ obj: o, vx: 900, vy: 0, r: 14, enemy: false });
  }

  /** Algo encostou no jogador? (com o tempo de invencibilidade depois de renascer). */
  private hits(x: number, y: number, r: number, time: number): boolean {
    if (!this.alive || time < this.invulnUntil || this.done) return false;
    if (Phaser.Math.Distance.Between(x, y, this.x, this.y - 20) > r + 26) return false;
    this.die(time);
    return true;
  }

  private die(time: number): void {
    const s = this.host.scene;
    this.alive = false;
    sfx('death');
    for (let i = 0; i < 5; i++) {
      const b = s.add.sprite(this.x + Phaser.Math.Between(-30, 30), this.y + Phaser.Math.Between(-50, 10), 'boom').setDepth(DEPTH.fx).play('boom');
      b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
    }
    s.cameras.main.shake(200, 0.01);
    this.rider.setVisible(false);
    if (this.host.died()) return;
    s.time.delayedCall(1400, () => {
      this.x = this.left + 200;
      this.y = (this.host.top + this.host.bottom) / 2;
      this.rider.setVisible(true).setPosition(this.x, this.y);
      this.alive = true;
      this.invulnUntil = s.time.now + 2200;
      void time;
    });
  }

  private pop(x: number, y: number): void {
    const s = this.host.scene;
    sfx('hit');
    const b = s.add.sprite(x, y, 'boom').setScale(0.8).setDepth(DEPTH.fx).play('boom');
    b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
  }

  /** Dica no começo da fase. */
  hint(): void {
    const s = this.host.scene;
    const t = s.add
      .text(this.camX, this.host.top + 40, '↑ ↓ ← →  voar  ·  os ossos saem sozinhos (ATACAR atira na hora)', { fontFamily: FONT, fontSize: '22px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 3);
    s.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 600, onComplete: () => t.destroy() });
    s.events.on('update', () => t.active && t.setX(this.camX));
  }
}
