import Phaser from 'phaser';
import { DEPTH } from '../config';
import { Boss, type BossHost } from './boss';
import type { Fighter } from './Fighter';
import { sfx } from './settings';

const BAT = { name: 'PRÍNCIPE DOS MORCEGOS', color: 0x2f4fb8 };
const BEE = { name: 'PRÍNCIPE DAS ABELHAS', color: 0x5fb8e8 };
const SKULL = { name: 'OSSIAN', color: 0x2f86e0 };

/** Escolha feita no fim da luta: aliado das asas de morcego ou de abelha. */
export type Pact = 'bat' | 'bee';

/**
 * Ninho dos Príncipes: o Príncipe dos Morcegos (forte, cinco ataques) e, na metade da vida
 * dele, o Príncipe das Abelhas entra na luta. A luta para para os diálogos; quase no fim, o
 * morcego oferece um acordo: poupá-lo e derrotar a abelha (ele vira aliado) ou recusar e
 * derrotá-lo (a abelha vira aliada). A escolha decide as fases de voo.
 */
export class PrincesBoss extends Boss {
  private hoverY: number;
  private bee: Phaser.GameObjects.Sprite;
  private crown: Phaser.GameObjects.Image;
  private beeCrown: Phaser.GameObjects.Image;
  private beeHp = 12;
  private readonly beeMax = 12;
  private beeActive = false;
  private beeGen = 0;
  private beeHurt = 0;
  private beeLastAttack = -1;
  private beeJoined = false;
  private beeIntroShown = false;
  private offered = false;
  private accepted?: boolean;
  private busy = false;
  private babies: Fighter[] = [];

  constructor(
    host: BossHost,
    private onPact: (p: Pact) => void,
  ) {
    super(host, 30, 'prince_bat_idle', 2.2, 140, 192, 170, 150, BAT.name, 'Senhor do Ninho', BAT.color);
    this.hoverY = host.floor - 30;
    this.feet = this.hoverY;
    const s = host.scene;
    this.crown = s.add.image(0, -400, 'queen_crown').setDepth(DEPTH.fighters - 0.4).setVisible(false);
    this.bee = s.add.sprite(-400, -400, 'prince_bee_idle').setScale(1.6).setDepth(DEPTH.fighters - 0.5).setVisible(false).play('prince_bee_idle');
    this.beeCrown = s.add.image(0, -400, 'queen_crown').setScale(0.7).setTint(0xbfe9ff).setDepth(DEPTH.fighters - 0.4).setVisible(false);
  }

  protected get idleAnim(): string {
    return 'prince_bat_idle';
  }
  protected get roarAnim(): string {
    return 'prince_bat_attack';
  }
  protected patternCount(): number {
    return 5;
  }

  protected bob(time: number): number {
    return Math.sin(time / 260) * 8;
  }

  private batAnchor = () => ({ x: this.x, y: this.feet - this.hurtH - 30 });
  private beeAnchor = () => ({ x: this.bee.x, y: this.bee.y - 90 });
  private skullAnchor = () => ({ x: this.player.x, y: this.player.feet - this.player.labelHeight - 56 });

  private async talk(who: 'bat' | 'bee' | 'skull', text: string): Promise<void> {
    const say = this.host.say;
    if (!say) return;
    const [anchor, info] = who === 'bat' ? [this.batAnchor, BAT] : who === 'bee' ? [this.beeAnchor, BEE] : [this.skullAnchor, SKULL];
    await say(anchor, text, info.name, info.color);
  }

  // ---------- eventos da luta ----------

  protected async afterIntro(): Promise<void> {
    await this.flyTo(this.x, this.hoverY, 400);
    await this.talk('bat', 'Um saco de ossos no meu ninho? Que petisco mais sem graça.');
    await this.talk('skull', 'Só estou de passagem. Me deixa passar e ninguém se machuca.');
    await this.talk('bat', 'Ninguém passa pelo Príncipe dos Morcegos!');
  }

  /** Pausa a luta: cancela ataques, limpa a arena e congela tudo. */
  private pause(): void {
    this.busy = true;
    this.gen++;
    this.beeGen++;
    this.clearHazards();
    this.vx = 0;
    this.host.freeze(true);
  }

  private resume(): void {
    this.busy = false;
    this.host.freeze(false);
    this.startLoop();
    if (this.beeActive) void this.beeLoop();
  }

  private async beeJoin(): Promise<void> {
    this.beeJoined = true;
    this.pause();
    const s = this.scene;
    this.bee.setVisible(true).setPosition(this.host.x1 + 100, this.host.ceiling + 60).setFlipX(true);
    this.beeCrown.setVisible(true);
    s.cameras.main.shake(300, 0.005);
    await new Promise<void>((r) => s.tweens.add({ targets: this.bee, x: this.host.x1 - 180, y: this.host.floor - 160, duration: 900, ease: 'Sine.easeOut', onComplete: () => r() }));
    this.host.bar()?.showBossBar2?.(BEE.name, 'Herdeiro da Colmeia', BEE.color);
    this.host.bar()?.setBossHp2?.(this.beeHp / this.beeMax);
    if (!this.beeIntroShown) {
      this.beeIntroShown = true;
      await this.talk('bee', 'Primo! Eu sabia que você não daria conta de um esqueleto sozinho.');
      await this.talk('bat', 'Fica fora disso, zangão!');
      await this.talk('bee', 'E perder a diversão? Dois príncipes contra um ossinho!');
      await this.talk('skull', 'Ótimo. Agora são dois.');
    }
    this.beeActive = true;
    this.resume();
  }

  private async offer(): Promise<void> {
    this.offered = true;
    this.pause();
    // O morcego, ferido, desce até o chão.
    await this.flyTo(this.x, this.host.floor, 500);
    this.sprite.anims.timeScale = 0.4;
    await this.talk('bat', 'Espera! Espera... chega.');
    await this.talk('bat', 'Poupa minha vida, caveira. Derrota o Príncipe das Abelhas e eu serei teu maior aliado: voarei contigo até o Rei das Abelhas.');
    await this.talk('bee', 'Não escuta esse morcego traiçoeiro! Acaba com ele e EU voo contigo até o Rei dos Morcegos!');
    await this.talk('skull', 'Hex sempre diz que todo acordo tem um preço...');
    const pick = (await this.host.choose?.('O ACORDO DO PRÍNCIPE DOS MORCEGOS', ['ACEITAR: poupar o morcego e derrotar a abelha', 'RECUSAR: derrotar o morcego'])) ?? 1;
    this.sprite.anims.timeScale = 1;
    if (pick === 0) {
      this.accepted = true;
      await this.talk('bat', 'Sábia escolha. A partir de hoje, minhas asas são tuas.');
      await this.talk('bee', 'TRAIDORES! Vou picar vocês dois!');
      // O morcego se recolhe num canto alto e assiste.
      this.host.bar()?.hideBossBar();
      this.host.bar()?.showBossBar(BEE.name, 'Herdeiro da Colmeia', BEE.color);
      this.host.bar()?.setBossHp(this.beeHp / this.beeMax);
      this.host.bar()?.hideBossBar2?.();
      await this.flyTo(this.host.x0 + 140, this.host.ceiling + 130, 700);
      this.sprite.setAlpha(0.85);
      this.busy = false;
      this.host.freeze(false);
      this.gen++; // o morcego não ataca mais
      if (this.beeActive) void this.beeLoop();
    } else {
      this.accepted = false;
      await this.talk('skull', 'Nada de acordo com quem tentou me comer.');
      await this.talk('bee', 'Hahaha! Gosto de ti, ossinho. Te espero lá fora.');
      this.beeActive = false;
      this.host.bar()?.hideBossBar2?.();
      await new Promise<void>((r) => this.scene.tweens.add({ targets: [this.bee], x: this.host.x1 + 200, y: this.host.ceiling - 100, duration: 800, onComplete: () => r() }));
      this.bee.setVisible(false);
      this.beeCrown.setVisible(false);
      await this.talk('bat', 'Então cairemos juntos!');
      this.enrage();
      await this.flyTo(this.x, this.hoverY, 400);
      this.resume();
    }
  }

  protected beforeDamage(): boolean {
    if (this.busy || this.accepted === true) return false;
    // A um passo da derrota, o morcego para e oferece o acordo (uma vez).
    if (!this.offered && this.hp <= 4) {
      void this.offer();
      return false;
    }
    return true;
  }

  protected defeatText(): string {
    this.onPact('bee');
    return 'O Príncipe das Abelhas agora voa com você!';
  }

  protected onPlayerDied(): void {
    // Recomeça a luta inteira (o acordo também volta a ser oferecido).
    this.beeGen++;
    this.beeActive = false;
    this.beeJoined = false;
    this.offered = false;
    this.accepted = undefined;
    this.busy = false;
    this.beeHp = this.beeMax;
    this.bee.setVisible(false);
    this.beeCrown.setVisible(false);
    this.sprite.setAlpha(1);
    this.host.bar()?.hideBossBar2?.();
    this.host.bar()?.showBossBar(BAT.name, 'Senhor do Ninho', BAT.color);
    for (const b of this.babies) if (b.alive) b.sprite.setVisible(false);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.bee);
    this.flying = 0;
    this.feet = this.hoverY;
  }

  protected async refill(): Promise<void> {
    await super.refill();
    this.feet = this.hoverY;
  }

  // ---------- quadro a quadro ----------

  syncVisual(time: number): void {
    if (this.flying > 0) this.sprite.setPosition(this.x, this.feet + this.bob(time));
    this.crown.setVisible(this.sprite.visible).setPosition(this.sprite.x + this.facing * 6, this.sprite.y - this.hurtH - 6);
    this.beeCrown.setPosition(this.bee.x + (this.bee.flipX ? -4 : 4), this.bee.y - 58);
  }

  protected touches(p: Fighter): boolean {
    return this.accepted !== true && super.touches(p);
  }

  update(time: number, dt: number): void {
    super.update(time, dt);
    this.syncVisual(time);
    this.babies = this.babies.filter((b) => b.alive);
    if (!this.fighting || this.dying || this.busy) return;
    if (!this.beeJoined && this.hp <= this.maxHp / 2) void this.beeJoin();
    if (!this.beeActive) return;
    // Golpes do jogador na abelha.
    const p = this.player;
    this.bee.setAlpha(time < this.beeHurt && Math.floor(time / 60) % 2 ? 0.45 : 1);
    const hb = p.alive ? p.activeHitBox() : null;
    const beeBox = new Phaser.Geom.Rectangle(this.bee.x - 50, this.bee.y - 60, 100, 110);
    if (hb && p.attackId !== this.beeLastAttack && time >= this.beeHurt) {
      const r = new Phaser.Geom.Rectangle(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1);
      if (Phaser.Geom.Rectangle.Overlaps(r, beeBox)) {
        this.beeLastAttack = p.attackId;
        this.hitBee(time);
      }
    }
    if (p.alive && !p.invulnerable && !p.zipping) {
      const pb = new Phaser.Geom.Rectangle(p.body.x, p.body.y, p.body.width, p.body.height);
      if (Phaser.Geom.Rectangle.Overlaps(pb, new Phaser.Geom.Rectangle(beeBox.x + 20, beeBox.y + 20, 60, 70))) this.host.killPlayer();
    }
  }

  tryProjectile(r: Phaser.Geom.Rectangle): boolean {
    if (this.beeActive && !this.busy && Phaser.Geom.Rectangle.Overlaps(r, new Phaser.Geom.Rectangle(this.bee.x - 50, this.bee.y - 60, 100, 110))) {
      if (this.scene.time.now >= this.beeHurt) this.hitBee(this.scene.time.now);
      return true;
    }
    return super.tryProjectile(r);
  }

  private hitBee(time: number): void {
    // Antes do acordo a abelha não cai (ainda tem papel na história).
    if (!this.offered && this.beeHp <= 1) return;
    this.beeHp--;
    this.beeHurt = time + 380;
    sfx('hit');
    const frac = this.beeHp / this.beeMax;
    if (this.accepted) this.host.bar()?.setBossHp(frac);
    else this.host.bar()?.setBossHp2?.(frac);
    if (this.beeHp <= 0) void this.beeDown();
  }

  /** Aceitou o acordo e derrubou a abelha: explosões, clarão e o morcego vira aliado. */
  private async beeDown(): Promise<void> {
    this.beeActive = false;
    this.beeGen++;
    this.dying = true;
    this.fighting = false;
    const s = this.scene;
    this.clearHazards();
    this.host.freeze(true);
    this.host.bar()?.setBossHp(0);
    for (let i = 0; i < 12; i++) {
      this.bee.setTintFill(i % 2 ? 0xffffff : 0x8fd9ff);
      this.boom(this.bee.x + Phaser.Math.Between(-50, 50), this.bee.y + Phaser.Math.Between(-60, 40));
      await this.wait(90);
    }
    s.cameras.main.flash(500, 255, 255, 255);
    const cx = this.bee.x;
    const cy = this.bee.y;
    this.bee.setVisible(false);
    this.beeCrown.setVisible(false);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const o = s.add.image(cx, cy, 'orb').setDepth(DEPTH.fx + 2);
      s.tweens.add({ targets: o, x: cx + Math.cos(a) * 600, y: cy + Math.sin(a) * 600, alpha: 0, duration: 1500, onComplete: () => o.destroy() });
    }
    this.host.bar()?.hideBossBar();
    await this.wait(900);
    await this.talk('bat', 'Hah! Bom trabalho, aliado. O Rei das Abelhas vai ouvir falar de nós.');
    this.onPact('bat');
    this.host.freeze(false);
    this.host.defeated('O Príncipe dos Morcegos agora é seu aliado!');
  }

  // ---------- ataques do Príncipe dos Morcegos ----------

  private flying = 0;

  private flyTo(x: number, feet: number, ms: number): Promise<void> {
    this.flying++;
    return new Promise((r) =>
      this.scene.tweens.add({
        targets: this,
        x,
        feet,
        duration: ms,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.flying = Math.max(0, this.flying - 1);
          r();
        },
        onStop: () => {
          this.flying = Math.max(0, this.flying - 1);
          r();
        },
      }),
    );
  }

  protected async pattern(k: number, t: number): Promise<void> {
    if (this.accepted) return;
    if (this.phase2 && Math.random() < 0.35) {
      await this.swoop(t);
      if (this.ok(t)) await this.screech(t);
      return;
    }
    if (k === 0) await this.swoop(t);
    else if (k === 1) await this.screech(t);
    else if (k === 2) await this.swarm(t);
    else if (k === 3) await this.gust(t);
    else await this.barrage(t);
  }

  /** Rasante: sobe, mira e mergulha em cima do jogador, voltando a pairar. */
  private async swoop(t: number): Promise<void> {
    this.faceToPlayer();
    await this.flyTo(Phaser.Math.Clamp(this.player.x - this.facing * 260, this.host.x0 + 120, this.host.x1 - 120), this.host.ceiling + 200, 450);
    if (!this.ok(t)) return;
    this.exclaim();
    this.warnMark(this.player.x, 400);
    await this.wait(this.phase2 ? 250 : 400);
    if (!this.ok(t)) return;
    this.sprite.play('prince_bat_attack');
    await this.flyTo(Phaser.Math.Clamp(this.player.x, this.host.x0 + 100, this.host.x1 - 100), this.host.floor, this.phase2 ? 320 : 420);
    this.scene.cameras.main.shake(160, 0.008);
    this.dust(this.x, this.host.floor, 1.4);
    await this.wait(250);
    if (!this.ok(t)) return;
    await this.flyTo(this.x, this.hoverY, 500);
    this.play('prince_bat_idle');
  }

  /** Grito sônico: anéis de som pelo chão (pule) e no alto (agache), alternados. */
  private async screech(t: number): Promise<void> {
    const s = this.scene;
    this.faceToPlayer();
    this.sprite.play('prince_bat_attack');
    s.cameras.main.shake(300, 0.004);
    const n = this.phase2 ? 4 : 3;
    for (let i = 0; i < n && this.ok(t); i++) {
      const low = i % 2 === 0;
      const y = low ? this.host.floor - 22 : this.host.floor - 72;
      const dir = this.facing;
      const g = s.add.graphics().setDepth(DEPTH.projectiles);
      let r = 10;
      this.addHazard({
        x: this.x,
        y,
        w: 40,
        h: low ? 40 : 46,
        until: s.time.now + 3500,
        obj: g,
        step: (dt, h) => {
          h.x += dir * 420 * dt;
          r = Math.min(26, r + 60 * dt);
          g.clear();
          g.lineStyle(6, 0x1d1a2b, 1).strokeCircle(h.x, h.y, r);
          g.lineStyle(3, 0xbfe9ff, 1).strokeCircle(h.x, h.y, r);
          g.lineStyle(2, 0xffffff, 0.8).strokeCircle(h.x, h.y, r * 0.55);
          if (h.x < this.host.x0 || h.x > this.host.x1) h.dead = true;
        },
      });
      await this.wait(this.phase2 ? 420 : 560);
    }
    this.play('prince_bat_idle');
  }

  /** Enxame: chama morcegos pequenos. */
  private async swarm(t: number): Promise<void> {
    if (this.babies.length >= 3) return this.gust(t);
    this.sprite.play('prince_bat_attack');
    const n = this.phase2 ? 3 : 2;
    for (let i = 0; i < n && this.ok(t); i++) {
      const x = Phaser.Math.Between(this.host.x0 + 100, this.host.x1 - 100);
      this.babies.push(this.host.spawnEnemy('bat', x, this.host.floor - 200));
      await this.wait(260);
    }
    this.play('prince_bat_idle');
    await this.wait(400);
  }

  /** Rajada de asas: empurra o jogador e solta garras miradas. */
  private async gust(t: number): Promise<void> {
    const s = this.scene;
    this.faceToPlayer();
    for (let k = 0; k < 3 && this.ok(t); k++) {
      this.sprite.play('prince_bat_attack');
      this.host.push?.(this.facing * 520);
      for (let i = 0; i < 6; i++) {
        const st = s.add.image(this.x + Phaser.Math.Between(-40, 40), Phaser.Math.Between(this.host.floor - 260, this.host.floor - 10), 'streak').setScale(0.4, 0.2).setDepth(DEPTH.fx);
        s.tweens.add({ targets: st, x: st.x + this.facing * 500, alpha: 0, duration: 450, onComplete: () => st.destroy() });
      }
      const a = Phaser.Math.Angle.Between(this.x, this.feet - 80, this.player.x, this.player.feet - 30);
      const claw = s.add.image(this.x, this.feet - 80, 'spark').setTint(0xbfe9ff).setScale(0.9).setDepth(DEPTH.projectiles);
      this.addHazard({
        x: claw.x,
        y: claw.y,
        w: 24,
        h: 24,
        until: s.time.now + 2500,
        obj: claw,
        step: (dt, h) => {
          h.x += Math.cos(a) * 520 * dt;
          h.y += Math.sin(a) * 520 * dt;
          claw.setPosition(h.x, h.y).setAngle(claw.angle + 600 * dt);
        },
      });
      await this.wait(this.phase2 ? 380 : 520);
    }
    this.play('prince_bat_idle');
  }

  /** Chuva de orbes: sobe e solta um anel de orbes escuros em todas as direções. */
  private async barrage(t: number): Promise<void> {
    const s = this.scene;
    await this.flyTo((this.host.x0 + this.host.x1) / 2, this.host.ceiling + 220, 500);
    if (!this.ok(t)) return;
    const rings = this.phase2 ? 2 : 1;
    for (let k = 0; k < rings && this.ok(t); k++) {
      this.sprite.play('prince_bat_attack');
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * (Math.PI / n);
        const o = s.add.image(this.x, this.feet - 70, 'orb').setTint(0x6a4ad0).setDepth(DEPTH.projectiles);
        this.addHazard({
          x: o.x,
          y: o.y,
          w: 26,
          h: 26,
          until: s.time.now + 2600,
          obj: o,
          step: (dt, h) => {
            h.x += Math.cos(a) * 300 * dt;
            h.y += Math.sin(a) * 300 * dt;
            o.setPosition(h.x, h.y);
          },
        });
      }
      await this.wait(650);
    }
    await this.flyTo(this.x, this.hoverY, 500);
    this.play('prince_bat_idle');
  }

  // ---------- ataques do Príncipe das Abelhas (mais simples) ----------

  private async beeLoop(): Promise<void> {
    const token = ++this.beeGen;
    const s = this.scene;
    const alive = () => token === this.beeGen && this.beeActive && !this.busy;
    while (alive()) {
      await this.wait(this.accepted ? 900 : 1800);
      if (!alive()) return;
      const p = this.player;
      if (Math.random() < 0.5) {
        // Ferroada: mergulha até onde o jogador está e volta.
        const back = { x: this.bee.x, y: this.bee.y };
        this.bee.setFlipX(p.x < this.bee.x);
        this.warnMark(p.x, 350);
        await this.wait(350);
        if (!alive()) return;
        await new Promise<void>((r) => s.tweens.add({ targets: this.bee, x: p.x, y: this.host.floor - 40, duration: this.accepted ? 380 : 480, ease: 'Quad.easeIn', onComplete: () => r() }));
        await this.wait(200);
        if (!alive()) return;
        await new Promise<void>((r) => s.tweens.add({ targets: this.bee, x: back.x, y: back.y, duration: 600, ease: 'Sine.easeOut', onComplete: () => r() }));
      } else {
        // Gotas de mel caindo perto do jogador.
        for (let i = 0; i < 3; i++) {
          const x = p.x + (i - 1) * 90;
          this.warnMark(x, 500);
          s.time.delayedCall(500, () => {
            if (!alive()) return;
            const d = s.add.image(x, this.host.ceiling, 'spark').setTint(0xffd36b).setScale(1).setDepth(DEPTH.projectiles);
            this.addHazard({
              x,
              y: this.host.ceiling,
              w: 24,
              h: 24,
              until: s.time.now + 2500,
              obj: d,
              step: (dt, h) => {
                h.y += 560 * dt;
                d.setPosition(h.x, h.y);
                if (h.y > this.host.floor - 8) h.dead = true;
              },
            });
          });
        }
      }
    }
  }

  destroy(): void {
    super.destroy();
    this.bee.destroy();
    this.crown.destroy();
    this.beeCrown.destroy();
  }
}
