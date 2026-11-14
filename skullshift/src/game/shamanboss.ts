import Phaser from 'phaser';
import { DEPTH } from '../config';
import { Boss, type BossHost } from './boss';
import type { CharId } from './characters';
import type { Fighter } from './Fighter';
import { sfx } from './settings';
import { FINALE_WORLDS } from './finale';
import { makeFlightArt } from './shmup';

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

  /** Mundo atual da luta final (0 a 8): uma barra de vida por mundo. */
  private world: number;

  constructor(host: BossHost, world = 0) {
    const w = FINALE_WORLDS[world];
    super(host, 6, 'shaman_idle', 2.2, 133, 192, 120, 170, 'XAMÃ HEX', `Barra ${world + 1}/${FINALE_WORLDS.length} · ${w.name}`, w.color);
    this.world = world;
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
    // O 5º padrão é o poder do mundo da vez.
    return 5;
  }

  protected bob(time: number): number {
    return Math.sin(time / 340) * 10;
  }

  private flyTo(x: number, feet: number, ms: number): Promise<void> {
    return new Promise((r) => this.scene.tweens.add({ targets: this, x, feet, duration: ms, ease: 'Sine.easeInOut', onComplete: () => r() }));
  }

  /** Fala de abertura em cada mundo (no primeiro, o desafio; nos outros, a chegada). */
  protected async afterIntro(): Promise<void> {
    const w = FINALE_WORLDS[this.world];
    const text =
      this.world === 0
        ? 'Nove selos, nove mundos. Vou arrastar-te por todos eles, Ossian. E em cada um serás um dos MEUS.'
        : `${w.name}. ${w.kingName()} voltou para te ajudar? Que comovente.`;
    await this.host.say?.(() => ({ x: this.x, y: this.feet - 200 }), text, 'Xamã Hex', 0x9b6bf0);
    this.host.onFightStart?.();
  }

  /** Barra do mundo derrubada: fala, ergue o cajado, abre um vórtice e leva todos para o próximo. */
  protected async defeat(): Promise<void> {
    if (this.world >= FINALE_WORLDS.length - 1 || !this.host.teleport) return super.defeat();
    if (this.dying) return;
    this.dying = true;
    this.fighting = false;
    this.gen++;
    this.clearHazards();
    for (const e of this.echoes) if (e.alive) e.sprite.setVisible(false);
    const s = this.scene;
    this.host.freeze(true);
    this.host.bar()?.setBossHp(0);
    this.sprite.setTintFill(0xffffff);
    s.cameras.main.shake(200, 0.01);
    await this.wait(200);
    this.sprite.clearTint();
    this.play('shaman_idle');
    await this.host.say?.(() => ({ x: this.x, y: this.feet - 200 }), FINALE_WORLDS[this.world].line, 'Xamã Hex', 0x9b6bf0);
    // Ergue o cajado: um vórtice roxo cresce em volta dele e engole a arena.
    this.replay('shaman_attack');
    sfx('boss');
    const cx = this.x;
    const cy = this.feet - 90;
    const vortex = s.add.graphics().setDepth(DEPTH.fx + 3);
    const t0 = s.time.now;
    await new Promise<void>((done) => {
      const tick = () => {
        const t = (s.time.now - t0) / 1400;
        vortex.clear();
        for (let r = 0; r < 4; r++) {
          const R = (40 + r * 70) * (0.3 + t * 2.2);
          vortex.lineStyle(10 - r * 2, r % 2 ? 0xb46bff : 0x7a3ad0, 0.7).beginPath();
          for (let k = 0; k <= 40; k++) {
            const a = (k / 40) * Math.PI * 2 + t * 9 * (r % 2 ? -1 : 1);
            const rr = R * (1 + Math.sin(a * 3 + t * 6) * 0.08);
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr * 0.6;
            if (k === 0) vortex.moveTo(x, y);
            else vortex.lineTo(x, y);
          }
          vortex.strokePath();
        }
        if (t >= 1) {
          s.events.off('update', tick);
          done();
        }
      };
      s.events.on('update', tick);
    });
    s.cameras.main.flash(300, 190, 140, 255);
    this.host.teleport();
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
    else if (k === 3) await this.chains(t);
    else await this.worldPower(t);
  }

  /** Rajada de feitiços roxos mirados no jogador. */
  private async bolts(t: number): Promise<void> {
    const s = this.scene;
    const n = this.phase2 ? 5 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      this.faceToPlayer();
      this.replay('shaman_attack');
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

  /**
   * O poder do mundo da vez, feito com a arte daquele mundo:
   * chuva marcada no chão (água, veneno, teia que prende, bolotas, pedras, meteoros), toras rolando
   * (pule), gêiseres de fogo e rajadas do reino das asas em duas alturas (pule ou agache).
   */
  private async worldPower(t: number): Promise<void> {
    const area = FINALE_WORLDS[this.world].area;
    const bees = FINALE_WORLDS[this.world].minion() === 'bee';
    this.replay('shaman_attack');
    this.exclaim();
    await this.wait(350);
    if (!this.ok(t)) return;
    switch (area) {
      case 'mare':
        return this.rain(t, 'water_ball', 'kill', false);
      case 'lagoa':
        return this.rain(t, 'poison_ball', 'kill', false);
      case 'teias':
        return this.rain(t, 'web_ball', 'root', false);
      case 'bosque':
        return this.rain(t, 'acorn', 'kill', false);
      case 'minas':
        return this.rain(t, 'meteor', 'kill', false);
      case 'ceu':
        return this.rain(t, 'meteor', 'kill', true);
      case 'pradaria':
        return this.roll(t, 'log_roll');
      case 'forja':
        return this.geysers(t);
      default:
        return this.gusts(t, bees ? 'stinger' : 'sonic_wave');
    }
  }

  /** Coisas caindo do céu, cada uma com um aviso no chão antes. */
  private async rain(t: number, tex: string, effect: 'kill' | 'root', diagonal: boolean): Promise<void> {
    const s = this.scene;
    const n = this.phase2 ? 7 : 5;
    for (let i = 0; i < n && this.ok(t); i++) {
      const x = i === 0 ? Phaser.Math.Clamp(this.player.x, this.host.x0 + 60, this.host.x1 - 60) : Phaser.Math.Between(this.host.x0 + 60, this.host.x1 - 60);
      this.warnMark(x, 600);
      const startX = diagonal ? x - 260 : x;
      const o = s.add.image(startX, this.host.ceiling - 60, tex, 0).setScale(tex === 'meteor' ? 1.2 : 1.4).setDepth(DEPTH.projectiles);
      const vx = diagonal ? 260 / 0.9 : 0;
      let vy = 0;
      let wait = 0.55;
      this.addHazard({
        x: startX,
        y: o.y,
        w: 36,
        h: 36,
        effect,
        until: s.time.now + 4000,
        obj: o,
        step: (dt, h) => {
          if (wait > 0) {
            wait -= dt;
            return;
          }
          vy = diagonal ? 520 : vy + 1800 * dt;
          h.x += vx * dt;
          h.y += vy * dt;
          o.setPosition(h.x, h.y).setAngle(o.angle + 300 * dt);
          if (h.y >= this.host.floor - 10) {
            h.dead = true;
            this.dust(h.x, this.host.floor, 1.1);
          }
        },
      });
      await this.wait(this.phase2 ? 260 : 360);
    }
    this.play('shaman_idle');
    await this.wait(700);
  }

  /** Toras rolando pelo chão, uma de cada lado: pule por cima. */
  private async roll(t: number, tex: string): Promise<void> {
    const s = this.scene;
    const n = this.phase2 ? 3 : 2;
    for (let i = 0; i < n && this.ok(t); i++) {
      const fromLeft = i % 2 === 0;
      const dir = fromLeft ? 1 : -1;
      const o = s.add.image(fromLeft ? this.host.x0 : this.host.x1, this.host.floor - 22, tex, 0).setDepth(DEPTH.projectiles);
      this.addHazard({
        x: o.x,
        y: o.y,
        w: 44,
        h: 40,
        until: s.time.now + 4000,
        obj: o,
        step: (dt, h) => {
          h.x += dir * 420 * dt;
          o.setPosition(h.x, h.y).setAngle(o.angle + dir * 500 * dt);
          if (h.x < this.host.x0 - 30 || h.x > this.host.x1 + 30) h.dead = true;
        },
      });
      await this.wait(this.phase2 ? 700 : 950);
    }
    this.play('shaman_idle');
    await this.wait(500);
  }

  /** Gêiseres: o chão borbulha onde vai subir uma coluna de fogo. */
  private async geysers(t: number): Promise<void> {
    const s = this.scene;
    const n = this.phase2 ? 4 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      const x = i === 0 ? Phaser.Math.Clamp(this.player.x, this.host.x0 + 60, this.host.x1 - 60) : Phaser.Math.Between(this.host.x0 + 60, this.host.x1 - 60);
      this.warnMark(x, 700);
      await this.wait(this.phase2 ? 500 : 650);
      if (!this.ok(t)) return;
      const col = s.add.container(x, this.host.floor).setDepth(DEPTH.projectiles);
      for (let k = 0; k < 5; k++) col.add(s.add.image(0, -k * 34, 'fire_ball').setScale(1.6 - k * 0.15));
      col.setScale(1, 0.1);
      s.tweens.add({ targets: col, scaleY: 1, duration: 140, yoyo: true, hold: 520 });
      sfx('boom');
      this.addHazard({ x, y: this.host.floor - 80, w: 44, h: 160, until: s.time.now + 760, obj: col });
    }
    this.play('shaman_idle');
    await this.wait(600);
  }

  /** Rajadas do reino das asas em duas alturas: as baixas se pula, as altas se agacha. */
  private async gusts(t: number, tex: string): Promise<void> {
    const s = this.scene;
    makeFlightArt(s);
    const n = this.phase2 ? 5 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      const low = Math.random() < 0.5;
      const fromLeft = this.player.x > this.x;
      const dir = fromLeft ? 1 : -1;
      const o = s.add.image(fromLeft ? this.host.x0 : this.host.x1, this.host.floor - (low ? 20 : 80), tex, 0).setScale(1.4).setFlipX(dir < 0).setDepth(DEPTH.projectiles);
      this.addHazard({
        x: o.x,
        y: o.y,
        w: 50,
        h: 26,
        until: s.time.now + 3000,
        obj: o,
        step: (dt, h) => {
          h.x += dir * 560 * dt;
          o.setPosition(h.x, h.y);
          if (h.x < this.host.x0 - 40 || h.x > this.host.x1 + 40) h.dead = true;
        },
      });
      await this.wait(this.phase2 ? 420 : 600);
    }
    this.play('shaman_idle');
    await this.wait(500);
  }

  /** Chama ecos dos reis derrotados (no máximo 3 vivos). */
  private async echo(t: number): Promise<void> {
    this.echoes = this.echoes.filter((e) => e.alive);
    if (this.echoes.length >= 3) return this.slam(t);
    this.replay('shaman_attack');
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
    this.replay('shaman_attack');
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
