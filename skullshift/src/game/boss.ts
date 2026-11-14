import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { sfx } from './settings';

/** O que a cena do jogo oferece a um chefe. */
export interface BossHost {
  scene: Phaser.Scene;
  player(): Fighter;
  /** Limites da arena (x do mundo) e altura do chão (pés). */
  x0: number;
  x1: number;
  floor: number;
  /** Teto da arena (y), de onde a aranha desce. */
  ceiling: number;
  killPlayer(): void;
  /** Prende o jogador no lugar (teia) por ms. */
  rootPlayer(ms: number): void;
  spawnEnemy(char: CharId, x: number, feet: number): Fighter;
  /** Congela tudo menos o chefe (entrada) ou libera. */
  freeze(on: boolean): void;
  bar(): BossBar | undefined;
  defeated(text?: string): void;
  /** Fala num balão (a luta fica pausada); resolve quando o jogador passa a fala. */
  say?(anchor: () => { x: number; y: number }, text: string, name: string, color: number): Promise<void>;
  /** Escolha com botões; resolve com o índice escolhido. */
  choose?(title: string, options: string[]): Promise<number>;
  /** Empurra o jogador (rajada de asas). */
  push?(vx: number): void;
  /** Aliados que lutam ao lado do jogador (os golpes deles também acertam o chefe). */
  allies?(): Fighter[];
  /** Luta final: leva todo mundo para o próximo mundo. */
  teleport?(): void;
  /** A luta começou de fato (depois da entrada e das falas). */
  onFightStart?(): void;
}

/** Barra de vida do chefe (na interface). */
export interface BossBar {
  showBossBar(name: string, title: string, color: number): void;
  setBossHp(frac: number): void;
  hideBossBar(): void;
  bossWarning(): void;
  /** Segunda barra (um segundo chefe entrando na luta). */
  showBossBar2?(name: string, title: string, color: number): void;
  setBossHp2?(frac: number): void;
  hideBossBar2?(): void;
  choose?(title: string, options: string[]): Promise<number>;
}

interface Hazard {
  x: number;
  y: number;
  w: number;
  h: number;
  until: number;
  obj?: Phaser.GameObjects.GameObject & { destroy(): void };
  step?: (dt: number, h: Hazard) => void;
  /** 'kill' (padrão) ou 'root' (teia: prende). */
  effect?: 'kill' | 'root';
  dead?: boolean;
}

const SEGMENTS = 28;
const GRAV = 2200;

/**
 * Chefe: entrada com suspense (alerta, queda do teto, barra de vida enchendo), padrões de
 * ataque em sequência que ficam mais rápidos e combinados com metade da vida, e derrota em
 * cadeia de explosões, clarão e orbes de energia. Se o jogador cai, o chefe volta com a vida
 * cheia (como nos clássicos).
 */
export abstract class Boss {
  readonly sprite: Phaser.GameObjects.Sprite;
  x: number;
  feet: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = -1;
  hp: number;
  protected hazards: Hazard[] = [];
  /** Muda a cada interrupção (morte do jogador, derrota): padrões antigos param sozinhos. */
  protected gen = 0;
  protected fighting = false;
  protected dying = false;
  protected hurtUntil = 0;
  private lastAttackId = -1;
  private allyHits = new Map<Fighter, number>();
  private waitingRespawn = false;
  protected onGround = true;
  protected airborne = false;

  constructor(
    protected host: BossHost,
    readonly maxHp: number,
    texture: string,
    readonly scale: number,
    /** Pés no quadro (px do quadro original) e tamanho do quadro. */
    protected feetY: number,
    protected frame: number,
    /** Caixa de dano (largura, altura acima dos pés), já na escala do chefe. */
    protected hurtW: number,
    protected hurtH: number,
    readonly name: string,
    readonly title: string,
    readonly color: number,
  ) {
    this.hp = maxHp;
    this.x = host.x1 - 220;
    this.feet = host.floor;
    this.sprite = host.scene.add.sprite(this.x, -400, texture).setScale(scale).setOrigin(0.5, feetY / frame).setDepth(DEPTH.fighters - 0.5).setVisible(false);
  }

  get scene(): Phaser.Scene {
    return this.host.scene;
  }
  get player(): Fighter {
    return this.host.player();
  }
  get phase2(): boolean {
    return this.hp <= this.maxHp / 2;
  }
  get hurtBox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.hurtW / 2, this.feet - this.hurtH, this.hurtW, this.hurtH);
  }

  // ---------- tempo e cancelamento ----------

  protected wait(ms: number): Promise<void> {
    return new Promise((r) => this.scene.time.delayedCall(ms, r));
  }
  /** O padrão ainda vale? (o jogador não morreu e o chefe não foi derrotado no meio). */
  protected ok(token: number): boolean {
    return token === this.gen && !this.dying;
  }

  protected faceToPlayer(): void {
    this.facing = this.player.x < this.x ? -1 : 1;
    this.sprite.setFlipX(this.facing < 0);
  }

  /** Toca de novo do começo (ex.: cada tiro do Xamã), se o chefe ainda existe. */
  protected replay(anim: string): void {
    if (this.sprite.active && this.sprite.anims) this.sprite.play(anim);
  }

  protected play(anim: string): void {
    // A cena pode ter sido reiniciada (teleporte da luta final) com um padrão ainda no meio.
    if (!this.sprite.active || !this.sprite.anims) return;
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
  }

  // ---------- entrada ----------

  /** Alerta, queda do teto, rugido e a barra de vida enchendo, gomo por gomo. */
  async intro(): Promise<void> {
    const s = this.scene;
    const bar = this.host.bar();
    this.host.freeze(true);
    bar?.bossWarning();
    sfx('boss');
    await this.wait(1700);
    this.sprite.setVisible(true).setPosition(this.x, this.host.ceiling - 200);
    this.play(this.idleAnim);
    this.faceToPlayer();
    await new Promise<void>((r) =>
      s.tweens.add({ targets: this.sprite, y: this.feet, duration: 520, ease: 'Quad.easeIn', onComplete: () => r() }),
    );
    s.cameras.main.shake(380, 0.014);
    this.dust(this.x, this.feet, 2.2);
    await this.wait(300);
    this.play(this.roarAnim);
    s.cameras.main.shake(600, 0.006);
    bar?.showBossBar(this.name, this.title, this.color);
    for (let i = 1; i <= SEGMENTS; i++) {
      bar?.setBossHp(i / SEGMENTS);
      await this.wait(38);
    }
    this.play(this.idleAnim);
    await this.wait(250);
    await this.afterIntro();
    this.host.freeze(false);
    this.fighting = true;
    void this.loop();
  }

  /** Depois da entrada, antes de lutar (diálogos de abertura). */
  protected async afterIntro(): Promise<void> {}

  /** Começa (de novo) o laço de padrões, cancelando o anterior. */
  protected startLoop(): void {
    this.gen++;
    void this.loop();
  }

  /** Repete os padrões até a derrota; recomeça do zero se o jogador cair. */
  private async loop(): Promise<void> {
    const token = this.gen;
    let last = -1;
    while (this.ok(token)) {
      await this.wait(this.phase2 ? 380 : 650);
      if (!this.ok(token)) return;
      const n = this.patternCount();
      let k = Phaser.Math.Between(0, n - 1);
      if (k === last) k = (k + 1) % n;
      last = k;
      await this.pattern(k, token);
    }
  }

  protected abstract get idleAnim(): string;
  protected abstract get roarAnim(): string;
  protected abstract patternCount(): number;
  protected abstract pattern(k: number, token: number): Promise<void>;

  // ---------- quadro a quadro ----------

  update(time: number, dt: number): void {
    if (!this.sprite.visible) return;
    const p = this.player;
    // Jogador caiu: o chefe para, limpa a arena e espera; quando ele volta, a vida enche de novo.
    if (this.fighting && !this.dying && !p.alive && !this.waitingRespawn) {
      this.waitingRespawn = true;
      this.gen++;
      this.clearHazards();
      this.vx = 0;
      this.onPlayerDied();
    }
    if (this.waitingRespawn && p.alive && !p.reviving && !this.dying) {
      this.waitingRespawn = false;
      void this.refill();
    }
    this.physics(dt);
    this.sprite.setPosition(this.x, this.feet + this.bob(time));
    if (!this.dying) this.sprite.setTint(time < this.hurtUntil && Math.floor(time / 60) % 2 ? 0xffffff : 0xffffff).setAlpha(time < this.hurtUntil && Math.floor(time / 60) % 2 ? 0.45 : 1);
    this.updateHazards(dt, time);
    if (!this.fighting || this.dying || !p.alive) return;
    // Golpe do jogador.
    const hb = p.activeHitBox();
    if (hb && p.attackId !== this.lastAttackId && time >= this.hurtUntil) {
      const r = new Phaser.Geom.Rectangle(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1);
      if (Phaser.Geom.Rectangle.Overlaps(r, this.hurtBox)) {
        this.lastAttackId = p.attackId;
        this.hit(time);
      }
    }
    // Golpes dos aliados (reis libertados, na luta final).
    for (const a of this.host.allies?.() ?? []) {
      const ab = a.alive ? a.activeHitBox() : null;
      if (!ab || this.allyHits.get(a) === a.attackId || time < this.hurtUntil) continue;
      if (Phaser.Geom.Rectangle.Overlaps(new Phaser.Geom.Rectangle(ab.x1, ab.y1, ab.x2 - ab.x1, ab.y2 - ab.y1), this.hurtBox)) {
        this.allyHits.set(a, a.attackId);
        this.hit(time);
      }
    }
    // Encostar no chefe machuca.
    if (!p.invulnerable && !p.zipping && this.touches(p)) this.host.killPlayer();
  }

  /** Acompanha tweens de posição enquanto o jogo está parado numa fala. */
  syncVisual(_time: number): void {}

  protected bob(_time: number): number {
    return 0;
  }

  /** Movimento simples: velocidade, gravidade e paredes da arena. */
  protected physics(dt: number): void {
    if (this.airborne) {
      this.vy += GRAV * dt;
      this.feet += this.vy * dt;
      if (this.feet >= this.host.floor) {
        this.feet = this.host.floor;
        this.vy = 0;
        this.airborne = false;
        this.onLand();
      }
    }
    this.x += this.vx * dt;
    const m = this.hurtW / 2 + 10;
    if (this.x < this.host.x0 + m) {
      this.x = this.host.x0 + m;
      if (this.vx < 0) this.onWall();
      this.vx = 0;
    } else if (this.x > this.host.x1 - m) {
      this.x = this.host.x1 - m;
      if (this.vx > 0) this.onWall();
      this.vx = 0;
    }
  }

  protected onLand(): void {}
  protected onWall(): void {}
  protected onPlayerDied(): void {}

  protected touches(p: Fighter): boolean {
    const b = new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height);
    const hb = this.hurtBox;
    // A caixa de contato é um pouco menor que a de dano (mais justo).
    const c = new Phaser.Geom.Rectangle(hb.x + hb.width * 0.15, hb.y + hb.height * 0.25, hb.width * 0.7, hb.height * 0.75);
    return Phaser.Geom.Rectangle.Overlaps(b, c);
  }

  /** Tiro do jogador acertou? (osso, arpão, bolota...) */
  tryProjectile(r: Phaser.Geom.Rectangle): boolean {
    if (!this.fighting || this.dying || !Phaser.Geom.Rectangle.Overlaps(r, this.hurtBox)) return false;
    if (this.scene.time.now >= this.hurtUntil) this.hit(this.scene.time.now);
    return true;
  }

  /** Antes de levar dano: false bloqueia o golpe (ex.: um evento da luta vai acontecer). */
  protected beforeDamage(): boolean {
    return true;
  }

  protected hit(time: number): void {
    if (!this.beforeDamage()) return;
    this.hp--;
    sfx('hit');
    this.hurtUntil = time + 420;
    this.host.bar()?.setBossHp(this.hp / this.maxHp);
    this.scene.cameras.main.shake(90, 0.004);
    this.sparkAt(this.x, this.feet - this.hurtH * 0.55);
    if (this.hp === Math.floor(this.maxHp / 2)) this.enrage();
    if (this.hp <= 0) void this.defeat();
  }

  /** Metade da vida: pisca em vermelho e fica mais rápido. */
  protected enrage(): void {
    const s = this.scene;
    s.cameras.main.flash(220, 255, 60, 40);
    this.sprite.setTintFill(0xff5c5c);
    s.time.delayedCall(240, () => this.sprite.clearTint());
  }

  protected async refill(): Promise<void> {
    this.hp = this.maxHp;
    const bar = this.host.bar();
    this.fighting = false;
    this.x = this.host.x1 - 220;
    this.feet = this.host.floor;
    this.airborne = false;
    this.play(this.idleAnim);
    this.faceToPlayer();
    for (let i = 1; i <= SEGMENTS; i++) {
      bar?.setBossHp(i / SEGMENTS);
      await this.wait(22);
    }
    if (this.dying) return;
    this.fighting = true;
    void this.loop();
  }

  // ---------- perigos (golpes que matam ao tocar) ----------

  protected addHazard(h: Hazard): Hazard {
    this.hazards.push(h);
    return h;
  }

  private updateHazards(dt: number, time: number): void {
    const p = this.player;
    const pb = new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height);
    for (const h of this.hazards) {
      h.step?.(dt, h);
      if (time >= h.until) h.dead = true;
      if (h.dead) continue;
      if (!this.fighting || !p.alive || p.invulnerable || p.zipping) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(pb, new Phaser.Geom.Rectangle(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h))) continue;
      if (h.effect === 'root') {
        this.host.rootPlayer(1300);
        h.dead = true;
      } else this.host.killPlayer();
    }
    this.hazards = this.hazards.filter((h) => {
      if (!h.dead) return true;
      h.obj?.destroy();
      return false;
    });
  }

  protected clearHazards(): void {
    for (const h of this.hazards) h.obj?.destroy();
    this.hazards = [];
  }

  // ---------- efeitos ----------

  protected dust(x: number, y: number, scale: number): void {
    const d = this.scene.add.sprite(x, y - 10, 'dust').setScale(scale).setDepth(DEPTH.fx).play('dust');
    d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
  }

  protected boom(x: number, y: number, scale = 1): void {
    sfx('boom');
    const b = this.scene.add.sprite(x, y, 'boom').setScale(scale).setDepth(DEPTH.fx + 1).play('boom');
    b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
  }

  private sparkAt(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const s = this.scene.add.image(x, y, 'spark').setTint(0xfff1a8).setScale(0.5).setDepth(DEPTH.fx);
      const a = Math.random() * Math.PI * 2;
      this.scene.tweens.add({ targets: s, x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 60, scale: 0, duration: 260, onComplete: () => s.destroy() });
    }
  }

  /** Aviso no chão antes de algo cair ali. */
  protected warnMark(x: number, ms: number): void {
    const m = this.scene.add.ellipse(x, this.host.floor - 4, 70, 16, 0xff3030, 0.5).setDepth(DEPTH.deco + 1);
    this.scene.tweens.add({ targets: m, alpha: 0.1, duration: 120, yoyo: true, repeat: Math.floor(ms / 240), onComplete: () => m.destroy() });
  }

  protected exclaim(): void {
    const t = this.scene.add
      .text(this.x, this.feet - this.hurtH - 40, '!', { fontFamily: FONT, fontSize: '54px', color: '#ff5c5c', stroke: '#1d1a2b', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 2);
    this.scene.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 600, delay: 200, onComplete: () => t.destroy() });
  }

  // ---------- derrota (estilo Mega Man) ----------

  protected async defeat(): Promise<void> {
    if (this.dying) return;
    this.dying = true;
    this.fighting = false;
    this.gen++;
    const s = this.scene;
    this.clearHazards();
    this.onDefeatStart();
    this.vx = 0;
    // 1) Congela o quadro do golpe final (hitstop) e esvazia a barra.
    this.host.freeze(true);
    this.sprite.anims.pause();
    this.host.bar()?.setBossHp(0);
    s.cameras.main.shake(160, 0.012);
    await this.wait(260);
    // 2) Explosões em cadeia pelo corpo, piscando em branco.
    const bounds = this.hurtBox;
    for (let i = 0; i < 14; i++) {
      this.sprite.setTintFill(i % 2 ? 0xffffff : 0xff7a1a);
      this.boom(bounds.x + Math.random() * bounds.width, bounds.y + Math.random() * bounds.height, 1 + Math.random() * 0.8);
      if (i % 3 === 0) s.cameras.main.shake(100, 0.006);
      await this.wait(95);
    }
    // 3) Clarão branco e o chefe some.
    s.cameras.main.flash(500, 255, 255, 255);
    this.sprite.setVisible(false);
    const cx = this.x;
    const cy = this.feet - this.hurtH / 2;
    this.boom(cx, cy, 3);
    // 4) Orbes de energia em estrela, em dois anéis.
    for (const [n, speed, delay] of [[12, 420, 0], [8, 260, 160]] as const) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (delay ? Math.PI / n : 0);
        const o = s.add.image(cx, cy, 'orb').setDepth(DEPTH.fx + 2);
        s.tweens.add({
          targets: o,
          x: cx + Math.cos(a) * speed * 1.6,
          y: cy + Math.sin(a) * speed * 1.6,
          alpha: { from: 1, to: 0 },
          duration: 1600,
          delay,
          onComplete: () => o.destroy(),
        });
      }
    }
    this.host.bar()?.hideBossBar();
    await this.wait(1700);
    this.host.freeze(false);
    this.sprite.destroy();
    this.host.defeated(this.defeatText());
  }

  /** Frase da vitória (cada chefe pode ter a sua). */
  protected defeatText(): string | undefined {
    return undefined;
  }

  protected onDefeatStart(): void {}

  destroy(): void {
    this.gen++;
    this.clearHazards();
    this.sprite.destroy();
  }
}

// =====================================================================
// Minotauro Rubro, Senhor da Forja
// =====================================================================

export class MinotaurBoss extends Boss {
  private charging = false;
  private stunned = false;

  constructor(host: BossHost) {
    super(host, 24, 'boss_mino_idle', 1.75, 210, 320, 150, 210, 'MINOTAURO RUBRO', 'Senhor da Forja', 0xc8452e);
  }

  protected get idleAnim(): string {
    return 'boss_mino_idle';
  }
  protected get roarAnim(): string {
    return 'boss_mino_attack';
  }
  protected patternCount(): number {
    return 4;
  }

  protected async pattern(k: number, t: number): Promise<void> {
    // Com metade da vida, combina padrões.
    if (this.phase2 && Math.random() < 0.45) {
      if (k === 0) {
        await this.charge(t);
        if (this.ok(t)) await this.leap(t);
        return;
      }
      if (k === 1) {
        await this.leap(t);
        if (this.ok(t)) await this.leap(t);
        return;
      }
    }
    if (k === 0) await this.charge(t);
    else if (k === 1) await this.leap(t);
    else if (k === 2) await this.hammer(t);
    else await this.emberRain(t);
  }

  /** Investida: abaixa a cabeça, corre até a parede, bate, fica tonto e caem pedras do teto. */
  private async charge(t: number): Promise<void> {
    this.faceToPlayer();
    this.exclaim();
    this.play('boss_mino_idle');
    this.sprite.setScale(this.scale * 1.05, this.scale * 0.93);
    this.dust(this.x - this.facing * 60, this.feet, 1.2);
    await this.wait(this.phase2 ? 380 : 600);
    if (!this.ok(t)) return;
    this.sprite.setScale(this.scale);
    this.play('boss_mino_run');
    this.charging = true;
    this.vx = this.facing * (this.phase2 ? 1050 : 850);
    // Corre até bater (onWall zera vx).
    while (this.ok(t) && this.vx !== 0) {
      if (Math.random() < 0.3) this.dust(this.x - this.facing * 70, this.feet, 0.9);
      await this.wait(60);
    }
    this.charging = false;
    if (!this.ok(t)) return;
    this.stunned = true;
    this.play('boss_mino_idle');
    await this.wait(this.phase2 ? 800 : 1200);
    this.stunned = false;
  }

  protected onWall(): void {
    if (!this.charging) return;
    const s = this.scene;
    s.cameras.main.shake(320, 0.016);
    this.dust(this.x + this.facing * 60, this.feet, 1.8);
    // Pedras caem do teto em lugares avisados.
    const n = this.phase2 ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(this.host.x0 + 80, this.host.x1 - 80);
      this.warnMark(x, 700);
      s.time.delayedCall(700 + i * 120, () => {
        if (!this.fighting) return;
        const rock = s.add.image(x, this.host.ceiling, 'rock1').setScale(1.2).setDepth(DEPTH.projectiles);
        let vy = 200;
        this.addHazard({
          x,
          y: this.host.ceiling,
          w: 44,
          h: 40,
          until: s.time.now + 2500,
          obj: rock,
          step: (dt, h) => {
            vy += 1600 * dt;
            h.y += vy * dt;
            rock.setPosition(h.x, h.y).setAngle(rock.angle + 200 * dt);
            if (h.y >= this.host.floor - 20) {
              h.dead = true;
              this.dust(h.x, this.host.floor, 1);
            }
          },
        });
      });
    }
  }

  /** Salto esmagador: pula até onde o jogador está e solta ondas de choque pelo chão. */
  private async leap(t: number): Promise<void> {
    this.faceToPlayer();
    this.sprite.setScale(this.scale * 1.06, this.scale * 0.9);
    await this.wait(this.phase2 ? 220 : 340);
    if (!this.ok(t)) return;
    this.sprite.setScale(this.scale);
    this.play('boss_mino_run');
    const target = Phaser.Math.Clamp(this.player.x, this.host.x0 + 120, this.host.x1 - 120);
    const air = 0.85;
    this.vy = -GRAV * air * 0.5;
    this.vx = (target - this.x) / air;
    this.airborne = true;
    while (this.ok(t) && this.airborne) await this.wait(30);
    if (!this.ok(t)) return;
    this.play('boss_mino_idle');
    await this.wait(this.phase2 ? 300 : 500);
  }

  protected onLand(): void {
    this.vx = 0;
    const s = this.scene;
    s.cameras.main.shake(300, 0.014);
    this.dust(this.x, this.feet, 2);
    if (!this.fighting) return;
    for (const dir of [-1, 1]) {
      let last = 0;
      this.addHazard({
        x: this.x + dir * 90,
        y: this.host.floor - 22,
        w: 46,
        h: 44,
        until: s.time.now + 2400,
        step: (dt, h) => {
          h.x += dir * (this.phase2 ? 620 : 480) * dt;
          last += dt;
          if (last > 0.06) {
            last = 0;
            this.boom(h.x, h.y + 4, 0.7);
          }
          if (h.x < this.host.x0 || h.x > this.host.x1) h.dead = true;
        },
      });
    }
  }

  /** Marretada tripla: anda até o jogador e bate três vezes, avançando a cada golpe. */
  private async hammer(t: number): Promise<void> {
    this.play('boss_mino_run');
    const until = this.scene.time.now + 1600;
    while (this.ok(t) && this.scene.time.now < until && Math.abs(this.player.x - this.x) > 230) {
      this.faceToPlayer();
      this.vx = this.facing * 300;
      await this.wait(40);
    }
    this.vx = 0;
    const hits = this.phase2 ? 4 : 3;
    for (let i = 0; i < hits && this.ok(t); i++) {
      this.faceToPlayer();
      this.sprite.play('boss_mino_attack');
      await this.wait(380);
      if (!this.ok(t)) return;
      // Quadros de impacto: a área à frente da marreta mata.
      this.addHazard({ x: this.x + this.facing * 170, y: this.feet - 100, w: 220, h: 200, until: this.scene.time.now + 200 });
      this.scene.cameras.main.shake(120, 0.008);
      this.dust(this.x + this.facing * 200, this.feet, 1.4);
      this.x += this.facing * 40;
      await this.wait(this.phase2 ? 280 : 420);
    }
    this.play('boss_mino_idle');
  }

  /** Chuva de brasas: ruge e brasas caem do teto em pontos avisados. */
  private async emberRain(t: number): Promise<void> {
    const s = this.scene;
    this.play('boss_mino_attack');
    s.cameras.main.shake(500, 0.005);
    s.cameras.main.flash(160, 255, 90, 30);
    await this.wait(400);
    const n = this.phase2 ? 12 : 8;
    for (let i = 0; i < n && this.ok(t); i++) {
      // Metade mira o jogador, metade cai ao acaso.
      const x = i % 2 ? Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-60, 60), this.host.x0 + 40, this.host.x1 - 40) : Phaser.Math.Between(this.host.x0 + 40, this.host.x1 - 40);
      this.warnMark(x, 600);
      s.time.delayedCall(600, () => {
        if (!this.fighting) return;
        const e = s.add.image(x, this.host.ceiling, 'spark').setTint(0xff7a1a).setScale(1.3).setDepth(DEPTH.projectiles);
        this.addHazard({
          x,
          y: this.host.ceiling,
          w: 30,
          h: 30,
          until: s.time.now + 2500,
          obj: e,
          step: (dt, h) => {
            h.y += 620 * dt;
            e.setPosition(h.x, h.y).setAngle(e.angle + 400 * dt);
            if (h.y >= this.host.floor - 10) {
              h.dead = true;
              this.boom(h.x, this.host.floor - 14, 0.8);
            }
          },
        });
      });
      await this.wait(this.phase2 ? 140 : 200);
    }
    this.play('boss_mino_idle');
    await this.wait(700);
  }

  protected bob(time: number): number {
    return this.stunned ? Math.sin(time / 50) * 2 : 0;
  }
}

// =====================================================================
// Aranha-Rainha, Mãe do Covil
// =====================================================================

export class SpiderQueenBoss extends Boss {
  private crown: Phaser.GameObjects.Image;
  private thread: Phaser.GameObjects.Graphics;
  private hanging = false;
  private onCeiling = false;
  private babies: Fighter[] = [];

  constructor(host: BossHost) {
    super(host, 22, 'boss_spider_idle', 2.6, 133, 192, 190, 150, 'ARANHA-RAINHA', 'Mãe do Covil', 0xd42a3c);
    this.crown = host.scene.add.image(0, -400, 'queen_crown').setAlpha(0).setDepth(DEPTH.fighters - 0.4).setVisible(false);
    this.thread = host.scene.add.graphics().setDepth(DEPTH.fighters - 0.6);
  }

  protected get idleAnim(): string {
    return 'boss_spider_idle';
  }
  protected get roarAnim(): string {
    return 'boss_spider_attack';
  }
  protected patternCount(): number {
    return 5;
  }

  update(time: number, dt: number): void {
    super.update(time, dt);
    // Coroa na cabeça e fio até o teto quando está pendurada.
    const top = this.onCeiling ? this.feet + this.hurtH * 0.2 : this.feet - this.hurtH - 6;
    this.crown.setVisible(this.sprite.visible).setPosition(this.x + this.facing * 30, top).setFlipY(this.onCeiling);
    this.thread.clear();
    if (this.hanging && this.sprite.visible) {
      const yb = this.feet - this.hurtH + 10;
      this.thread.fillStyle(0x1d1a2b, 1).fillRect(this.x - 3, this.host.ceiling, 6, yb - this.host.ceiling);
      this.thread.fillStyle(0xeef6f8, 1).fillRect(this.x - 1, this.host.ceiling, 2, yb - this.host.ceiling);
    }
    this.babies = this.babies.filter((b) => b.alive);
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (this.phase2 && Math.random() < 0.4) {
      await this.spit(t);
      if (this.ok(t)) await this.drop(t);
      return;
    }
    if (k === 0) await this.drop(t);
    else if (k === 1) await this.spit(t);
    else if (k === 2) await this.summon(t);
    else if (k === 3) await this.ceilingSweep(t);
    else await this.lunge(t);
  }

  /** Sobe pelo fio e despenca em cima do jogador. */
  private async drop(t: number): Promise<void> {
    const s = this.scene;
    this.hanging = true;
    this.play('boss_spider_idle');
    await new Promise<void>((r) => s.tweens.add({ targets: this, feet: this.host.ceiling + 40, duration: 520, ease: 'Quad.easeOut', onComplete: () => r() }));
    if (!this.ok(t)) return this.land();
    // Persegue o jogador pelo teto.
    const until = s.time.now + (this.phase2 ? 900 : 1300);
    while (this.ok(t) && s.time.now < until) {
      this.x = Phaser.Math.Linear(this.x, this.player.x, 0.08);
      this.faceToPlayer();
      await this.wait(30);
    }
    if (!this.ok(t)) return this.land();
    this.warnMark(this.x, 400);
    this.exclaim();
    await this.wait(400);
    await new Promise<void>((r) => s.tweens.add({ targets: this, feet: this.host.floor, duration: 260, ease: 'Quad.easeIn', onComplete: () => r() }));
    s.cameras.main.shake(260, 0.012);
    this.dust(this.x, this.host.floor, 2);
    this.land();
    await this.wait(this.phase2 ? 400 : 700);
  }

  private land(): void {
    this.hanging = false;
    this.feet = this.host.floor;
  }

  /** Cospe bolas de teia em leque: quem é atingido fica preso por um instante. */
  private async spit(t: number): Promise<void> {
    const s = this.scene;
    this.faceToPlayer();
    const volleys = this.phase2 ? 2 : 1;
    for (let v = 0; v < volleys && this.ok(t); v++) {
      this.sprite.play('boss_spider_attack');
      await this.wait(300);
      const n = this.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const ball = s.add.image(this.x + this.facing * 90, this.feet - 100, 'web_ball').setDepth(DEPTH.projectiles);
        let vx = this.facing * Phaser.Math.Between(300, 620);
        let vy = -Phaser.Math.Between(300, 620);
        this.addHazard({
          x: ball.x,
          y: ball.y,
          w: 34,
          h: 34,
          until: s.time.now + 3000,
          obj: ball,
          effect: 'root',
          step: (dt, h) => {
            vy += 900 * dt;
            h.x += vx * dt;
            h.y += vy * dt;
            if (h.y > this.host.floor - 16) {
              h.y = this.host.floor - 16;
              vx *= 0.4;
              vy = 0;
            }
            ball.setPosition(h.x, h.y).setAngle(ball.angle + 300 * dt);
          },
        });
      }
      await this.wait(500);
    }
    this.play('boss_spider_idle');
  }

  /** Chama filhotes: aranhas pequenas descem do teto. */
  private async summon(t: number): Promise<void> {
    if (this.babies.length >= 3) return this.lunge(t);
    this.play('boss_spider_attack');
    this.scene.cameras.main.shake(300, 0.004);
    const n = this.phase2 ? 3 : 2;
    for (let i = 0; i < n && this.ok(t); i++) {
      const x = Phaser.Math.Between(this.host.x0 + 100, this.host.x1 - 100);
      this.warnMark(x, 500);
      await this.wait(250);
      const f = this.host.spawnEnemy('spider', x, this.host.floor);
      this.babies.push(f);
    }
    this.play('boss_spider_idle');
    await this.wait(600);
  }

  /** Anda de ponta-cabeça pelo teto soltando fios de teia que caem como lanças. */
  private async ceilingSweep(t: number): Promise<void> {
    const s = this.scene;
    this.hanging = true;
    await new Promise<void>((r) => s.tweens.add({ targets: this, feet: this.host.ceiling + 30, duration: 420, onComplete: () => r() }));
    if (!this.ok(t)) return this.land();
    this.onCeiling = true;
    this.hanging = false;
    this.sprite.setFlipY(true);
    this.play('boss_spider_run');
    const dir = this.x > (this.host.x0 + this.host.x1) / 2 ? -1 : 1;
    this.facing = dir as 1 | -1;
    this.sprite.setFlipX(dir < 0);
    this.vx = dir * (this.phase2 ? 520 : 400);
    let lastDrop = 0;
    while (this.ok(t) && this.vx !== 0) {
      if (s.time.now - lastDrop > (this.phase2 ? 240 : 340)) {
        lastDrop = s.time.now;
        const x = this.x;
        this.warnMark(x, 350);
        s.time.delayedCall(350, () => {
          if (!this.fighting) return;
          const g = s.add.graphics().setDepth(DEPTH.projectiles);
          let len = 0;
          this.addHazard({
            x,
            y: this.host.ceiling,
            w: 14,
            h: 10,
            until: s.time.now + 900,
            obj: g,
            step: (dt, h) => {
              len = Math.min(this.host.floor - this.host.ceiling, len + 1500 * dt);
              h.h = len * 2;
              h.y = this.host.ceiling;
              g.clear();
              g.fillStyle(0x1d1a2b, 1).fillRect(x - 5, this.host.ceiling, 10, len);
              g.fillStyle(0xeef6f8, 1).fillRect(x - 2, this.host.ceiling, 4, len);
            },
          });
        });
      }
      await this.wait(40);
    }
    // Desce de volta ao chão.
    this.sprite.setFlipY(false);
    this.onCeiling = false;
    this.hanging = true;
    if (this.ok(t)) await new Promise<void>((r) => s.tweens.add({ targets: this, feet: this.host.floor, duration: 420, ease: 'Quad.easeIn', onComplete: () => r() }));
    this.land();
    this.play('boss_spider_idle');
  }

  /** Bote rasteiro: arranca pelo chão até o outro lado. */
  private async lunge(t: number): Promise<void> {
    this.faceToPlayer();
    this.exclaim();
    this.sprite.setScale(this.scale * 1.08, this.scale * 0.9);
    await this.wait(this.phase2 ? 300 : 480);
    if (!this.ok(t)) return;
    this.sprite.setScale(this.scale);
    this.play('boss_spider_run');
    this.vx = this.facing * (this.phase2 ? 1100 : 900);
    while (this.ok(t) && this.vx !== 0) await this.wait(40);
    this.play('boss_spider_idle');
    await this.wait(500);
  }

  protected onPlayerDied(): void {
    this.sprite.setFlipY(false);
    this.onCeiling = false;
    this.hanging = false;
    this.feet = this.host.floor;
    this.scene.tweens.killTweensOf(this);
    for (const b of this.babies) b.alive && b.sprite.setVisible(false);
  }

  protected onDefeatStart(): void {
    this.scene.tweens.killTweensOf(this);
    this.sprite.setFlipY(false);
    this.onCeiling = false;
    this.hanging = false;
    this.thread.clear();
    this.crown.setVisible(false);
  }

  protected touches(p: Fighter): boolean {
    if (this.onCeiling) {
      const b = new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height);
      return Phaser.Geom.Rectangle.Overlaps(b, new Phaser.Geom.Rectangle(this.x - 60, this.feet, 120, 100));
    }
    return super.touches(p);
  }

  get hurtBox(): Phaser.Geom.Rectangle {
    // No teto, o corpo fica abaixo da linha dos "pés".
    if (this.onCeiling) return new Phaser.Geom.Rectangle(this.x - this.hurtW / 2, this.feet, this.hurtW, this.hurtH);
    return super.hurtBox;
  }

  destroy(): void {
    super.destroy();
    this.crown.destroy();
    this.thread.destroy();
  }
}
