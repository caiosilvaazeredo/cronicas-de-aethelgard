import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { addCoins, addStat, addXp, getLevel, getStat } from '../game/progress';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';
import { levelUpBanner } from '../ui/levelup';

const INK = 0x10223a;
type Kind = 'fish' | 'targets' | 'sheep';

/** Contador do dia (para as recompensas caírem quando se joga muitas vezes seguidas). */
function todayKey(kind: Kind): string {
  const d = new Date();
  return `mg_${kind}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Jogos da vila:
 * - Pesca: lança a linha, espera a fisgada e aperta na hora do "!" (peixes grandes dão menos tempo).
 * - Tiro ao alvo: 30 segundos de alvos surgindo; clique/toque neles (ou mire com as setas e Espaço).
 * - Pega-ovelha: 40 segundos para encostar em ovelhas que fogem pelo pasto.
 * Rendem ouro e um pouco de XP (cada vez menos se jogar muitas vezes no mesmo dia).
 */
export class MinigameScene extends Phaser.Scene {
  private kind: Kind = 'fish';
  private score = 0;
  private done = false;
  private info!: Phaser.GameObjects.Text;
  private HH = 720;

  constructor() {
    super('minigame');
  }

  init(data: { kind?: Kind }): void {
    this.kind = data.kind ?? 'fish';
    this.score = 0;
    this.done = false;
  }

  create(): void {
    this.HH = this.scale.height;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, this.HH);
    const P = VIEW.portrait;
    const titles: Record<Kind, string> = { fish: 'PESCARIA NO LAGO', targets: 'TIRO AO ALVO', sheep: 'PEGA-OVELHA' };
    this.add.text(W / 2, P ? 160 : 40, titles[this.kind], { fontFamily: FONT, fontSize: P ? '56px' : '34px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5).setDepth(50);
    this.info = this.add
      .text(W / 2, P ? 230 : 84, '', { fontFamily: FONT, fontSize: P ? '32px' : '20px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6, align: 'center' })
      .setOrigin(0.5)
      .setDepth(50);
    pillButton(this, P ? 150 : 100, P ? 80 : 36, '◀ VILA', () => this.scene.start('village', {}), 170).setScale(P ? 1.1 : 0.75).setDepth(50);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('village', {}));
    if (this.kind === 'fish') this.fish();
    else if (this.kind === 'targets') this.targets();
    else this.sheep();
  }

  // ---------- pesca ----------

  private fish(): void {
    const HH = this.HH;
    const gy = HH * 0.55;
    const g = this.add.graphics();
    g.fillStyle(0x6fb86a, 1).fillRect(0, gy - 40, W, 60);
    g.fillStyle(INK, 1).fillEllipse(W / 2 + 100, gy + 120, W * 0.95, 260);
    g.fillStyle(0x2f9ad8, 1).fillEllipse(W / 2 + 100, gy + 120, W * 0.94, 250);
    g.fillStyle(0x6cc6f5, 1).fillEllipse(W / 2 + 60, gy + 90, W * 0.7, 120);
    // Píer e a caveira com a vara.
    g.fillStyle(INK, 1).fillRect(80, gy - 14, 330, 22);
    g.fillStyle(0x8a5a35, 1).fillRect(84, gy - 11, 322, 16);
    for (const x of [120, 240, 360]) g.fillStyle(0x6a4428, 1).fillRect(x, gy + 5, 12, 70);
    const hero = this.add.sprite(330, gy - 12, 'skull_idle').setOrigin(0.5, 0.82).setScale(0.9).play('skull_idle');
    const rod = this.add.graphics();
    const bob = this.add.graphics();
    const bx = 760;
    const by = gy + 90;
    const drawLine = (y: number, out: boolean) => {
      rod.clear();
      rod.lineStyle(5, 0x6a4428, 1).lineBetween(360, gy - 70, 470, gy - 150);
      if (!out) return;
      rod.lineStyle(2, 0xfff7dc, 0.9).lineBetween(470, gy - 150, bx, y);
      bob.clear().fillStyle(INK, 1).fillCircle(bx, y, 11).fillStyle(0xff5a3a, 1).fillCircle(bx, y - 2, 8).fillStyle(0xffffff, 1).fillCircle(bx, y + 4, 5);
    };
    drawLine(0, false);
    const bang = this.add.text(bx, by - 70, '!', { fontFamily: FONT, fontSize: '64px', color: '#ffe066', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5).setVisible(false);
    const FISH = [
      { name: 'Lambari', gold: 3, window: 700, w: 5 },
      { name: 'Tilápia', gold: 6, window: 520, w: 4 },
      { name: 'Peixe-Osso', gold: 12, window: 380, w: 2 },
      { name: 'Bota velha', gold: 0, window: 800, w: 1 },
    ];
    let casts = 5;
    let state: 'ready' | 'wait' | 'bite' | 'pause' = 'ready';
    let biteAt = 0;
    let current = FISH[0];
    const caught: string[] = [];
    const say = () => this.info.setText(`Lançamentos: ${casts}   ·   Peixes: ${caught.filter((c) => c !== 'Bota velha').length}\n${state === 'ready' ? 'Aperte (Espaço / toque) para lançar' : state === 'wait' ? 'Espere a fisgada... não apresse!' : ''}`);
    say();
    const pickFish = () => {
      const total = FISH.reduce((s, f) => s + f.w, 0);
      let x = Math.random() * total;
      for (const f of FISH) if ((x -= f.w) < 0) return f;
      return FISH[0];
    };
    let waitEv: Phaser.Time.TimerEvent | undefined;
    const press = () => {
      if (this.done) return;
      if (state === 'ready') {
        if (casts <= 0) return;
        casts--;
        state = 'wait';
        sfx('jump');
        hero.play('skull_attack');
        drawLine(by, true);
        this.tweens.add({ targets: bob, y: 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        current = pickFish();
        waitEv = this.time.delayedCall(Phaser.Math.Between(1200, 3600), () => {
          state = 'bite';
          biteAt = this.time.now;
          bang.setVisible(true).setScale(0.4);
          this.tweens.add({ targets: bang, scale: 1, duration: 120 });
          sfx('select');
          this.time.delayedCall(current.window, () => {
            if (state !== 'bite') return;
            state = 'pause';
            bang.setVisible(false);
            this.flash('Escapou!', '#ff9a8a');
            reel();
          });
        });
      } else if (state === 'wait') {
        waitEv?.remove();
        state = 'pause';
        this.flash('Cedo demais! O peixe fugiu.', '#ff9a8a');
        reel();
      } else if (state === 'bite') {
        state = 'pause';
        bang.setVisible(false);
        caught.push(current.name);
        this.score += current.gold;
        sfx('pick');
        const fishImg = this.add.text(bx, by, current.name === 'Bota velha' ? 'Uma bota velha...' : `${current.name}! (${current.gold} ouro)`, { fontFamily: FONT, fontSize: '28px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 7 }).setOrigin(0.5);
        this.tweens.add({ targets: fishImg, y: by - 140, alpha: 0, duration: 1400, onComplete: () => fishImg.destroy() });
        void biteAt;
        reel();
      }
      say();
    };
    const reel = () => {
      this.tweens.killTweensOf(bob);
      bob.y = 0;
      this.time.delayedCall(700, () => {
        bob.clear();
        drawLine(0, false);
        hero.play('skull_idle');
        state = 'ready';
        say();
        if (casts <= 0) this.finish(caught.length, `Pescou: ${caught.join(', ') || 'nada'}`);
      });
    };
    this.input.keyboard?.on('keydown-SPACE', press);
    this.input.keyboard?.on('keydown-ENTER', press);
    this.input.keyboard?.on('keydown-E', press);
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => !over.length && press());
  }

  // ---------- alvos ----------

  private targets(): void {
    const HH = this.HH;
    const P = VIEW.portrait;
    const top = P ? 320 : 130;
    const bottom = P ? HH - 200 : HH - 40;
    const g = this.add.graphics();
    g.fillStyle(0x8a5a35, 1).fillRoundedRect(40, top, W - 80, bottom - top, 18);
    for (let y = top + 30; y < bottom; y += 42) g.fillStyle(0x7a4e2e, 1).fillRect(50, y, W - 100, 4);
    let left = 30;
    const cross = this.add.graphics().setDepth(20);
    const cx = { x: W / 2, y: (top + bottom) / 2 };
    const drawCross = () => {
      cross.clear().lineStyle(4, INK, 1).strokeCircle(cx.x, cx.y, 18).lineBetween(cx.x - 26, cx.y, cx.x + 26, cx.y).lineBetween(cx.x, cx.y - 26, cx.x, cx.y + 26);
    };
    drawCross();
    const live: Array<{ c: Phaser.GameObjects.Container; gold: boolean; r: number }> = [];
    const spawn = () => {
      if (this.done) return;
      const gold = Math.random() < 0.15;
      const r = gold ? 30 : Phaser.Math.Between(34, 48);
      const x = Phaser.Math.Between(90, W - 90);
      const y = Phaser.Math.Between(top + 60, bottom - 60);
      const t = this.add.graphics();
      const rings = gold ? [0xffe066, 0xffffff, 0xffb02e] : [0xe8463a, 0xffffff, 0xe8463a];
      t.fillStyle(INK, 1).fillCircle(0, 0, r + 4);
      rings.forEach((col, i) => t.fillStyle(col, 1).fillCircle(0, 0, r * (1 - i * 0.3)));
      const c = this.add.container(x, y, [t]).setSize(r * 2, r * 2).setScale(0).setDepth(10);
      c.setInteractive({ useHandCursor: true }).on('pointerdown', () => hit(entry));
      const entry = { c, gold, r };
      live.push(entry);
      this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' });
      const life = Math.max(700, 1500 - (30 - left) * 25);
      this.time.delayedCall(life, () => {
        if (!c.active) return;
        live.splice(live.indexOf(entry), 1);
        this.tweens.add({ targets: c, scale: 0, duration: 120, onComplete: () => c.destroy() });
      });
    };
    const hit = (e: { c: Phaser.GameObjects.Container; gold: boolean }) => {
      if (this.done || !e.c.active) return;
      live.splice(live.indexOf(e as never), 1);
      this.score += e.gold ? 3 : 1;
      sfx('hit');
      const t = this.add.text(e.c.x, e.c.y, e.gold ? '+3' : '+1', { fontFamily: FONT, fontSize: '30px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 600, onComplete: () => t.destroy() });
      this.tweens.add({ targets: e.c, scale: 1.4, alpha: 0, duration: 160, onComplete: () => e.c.destroy() });
    };
    const shoot = () => {
      const e = live.find((t) => Math.hypot(t.c.x - cx.x, t.c.y - cx.y) <= t.r + 6);
      if (e) hit(e);
      else sfx('select');
    };
    const timer = this.time.addEvent({ delay: 650, loop: true, callback: spawn });
    const clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        left--;
        if (left <= 0) {
          timer.remove();
          clock.remove();
          live.forEach((e) => e.c.destroy());
          this.finish(this.score, `Pontos: ${this.score}`);
        }
      },
    });
    const kb = this.input.keyboard!;
    const keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', shoot);
    kb.on('keydown-ENTER', shoot);
    this.onUpdate((_t: number, dt: number) => {
      if (this.done) return;
      const v = 0.6 * dt;
      if (keys.LEFT.isDown || keys.A.isDown) cx.x -= v;
      if (keys.RIGHT.isDown || keys.D.isDown) cx.x += v;
      if (keys.UP.isDown || keys.W.isDown) cx.y -= v;
      if (keys.DOWN.isDown || keys.S.isDown) cx.y += v;
      cx.x = Phaser.Math.Clamp(cx.x, 60, W - 60);
      cx.y = Phaser.Math.Clamp(cx.y, top + 20, bottom - 20);
      drawCross();
      this.info.setText(`Tempo: ${left}   ·   Pontos: ${this.score}\nClique/toque nos alvos (ou mire com as setas e Espaço). Dourado vale 3.`);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      cx.x = p.x;
      cx.y = p.y;
    });
  }

  // ---------- ovelhas ----------

  private sheep(): void {
    const HH = this.HH;
    const gy = HH * (VIEW.portrait ? 0.62 : 0.8);
    // Morros e a cerca do pasto ao fundo.
    const bg = this.add.graphics();
    for (let i = 0; i < 6; i++) bg.fillStyle(0x6fb86a, 1).fillEllipse(i * 260 + 60, gy + 10, 420, 260);
    for (let i = 0; i < 6; i++) bg.fillStyle(0x5aa257, 1).fillEllipse(i * 260 + 190, gy + 40, 380, 190);
    for (let x = 20; x < W; x += 34) bg.fillStyle(INK, 1).fillRect(x - 3, gy - 56, 10, 56).fillStyle(0xb07a45, 1).fillRect(x - 1, gy - 54, 6, 52);
    bg.fillStyle(INK, 1).fillRect(0, gy - 44, W, 8).fillRect(0, gy - 22, W, 8);
    bg.fillStyle(0xc89058, 1).fillRect(0, gy - 43, W, 5).fillRect(0, gy - 21, W, 5);
    const n = Math.ceil(W / 64);
    for (let i = 0; i < n; i++) {
      this.add.image(i * 64, gy - 6, 'tilemap', 27 + (i === 0 ? 5 : i === n - 1 ? 7 : 6)).setOrigin(0);
      this.add.image(i * 64, gy + 58, 'tilemap', 45 + (i === 0 ? 5 : i === n - 1 ? 7 : 6)).setOrigin(0);
    }
    const hero = this.add.sprite(W / 2, gy, 'skull_idle').setOrigin(0.5, 0.82).setScale(1).play('skull_idle').setDepth(5);
    let vy = 0;
    let ground = true;
    let left = 40;
    let target: number | null = null;
    const flock: Array<{ s: Phaser.GameObjects.Sprite; v: number; vy: number; until: number }> = [];
    const addSheep = () => {
      const s = this.add.sprite(Phaser.Math.Between(60, W - 60), gy, 'sheep_move').setOrigin(0.5, 0.8).setScale(1.1).play('sheep_move').setDepth(4);
      flock.push({ s, v: (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(90, 170), vy: 0, until: 0 });
    };
    for (let i = 0; i < 5; i++) addSheep();
    const kb = this.input.keyboard!;
    const keys = kb.addKeys('LEFT,RIGHT,A,D,UP,W,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    const jump = () => {
      if (!ground || this.done) return;
      vy = -650;
      ground = false;
      sfx('jump');
    };
    kb.on('keydown-UP', jump);
    kb.on('keydown-W', jump);
    kb.on('keydown-SPACE', jump);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length) return;
      if (p.y < hero.y - 140) jump();
      target = p.x;
    });
    const clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        left--;
        if (left <= 0) {
          clock.remove();
          this.finish(this.score, `Ovelhas pegas: ${this.score}`);
        }
      },
    });
    this.onUpdate((time: number, dtMs: number) => {
      if (this.done) return;
      const dt = Math.min(0.05, dtMs / 1000);
      let move = 0;
      if (keys.LEFT.isDown || keys.A.isDown) move -= 1;
      if (keys.RIGHT.isDown || keys.D.isDown) move += 1;
      if (move) target = null;
      else if (target !== null) {
        const d = target - hero.x;
        if (Math.abs(d) < 10) target = null;
        else move = Math.sign(d);
      }
      hero.x = Phaser.Math.Clamp(hero.x + move * 330 * dt, 30, W - 30);
      if (move) hero.setFlipX(move < 0);
      if (!ground) {
        vy += 1700 * dt;
        hero.y += vy * dt;
        if (hero.y >= gy) {
          hero.y = gy;
          vy = 0;
          ground = true;
        }
      }
      const anim = move ? 'skull_run' : 'skull_idle';
      if (hero.anims.currentAnim?.key !== anim) hero.play(anim);
      for (const f of flock) {
        // Fogem da caveira quando ela chega perto; às vezes dão um pulinho.
        const away = Math.sign(f.s.x - hero.x) || 1;
        if (Math.abs(f.s.x - hero.x) < 180 && time > f.until) {
          f.v = away * Phaser.Math.Between(150, 230);
          f.until = time + 600;
          if (Math.random() < 0.3 && f.s.y >= gy) f.vy = -420;
        }
        f.s.x += f.v * dt;
        if (f.s.x < 40 || f.s.x > W - 40) {
          f.v = -f.v;
          f.s.x = Phaser.Math.Clamp(f.s.x, 40, W - 40);
        }
        if (f.vy || f.s.y < gy) {
          f.vy += 1500 * dt;
          f.s.y = Math.min(gy, f.s.y + f.vy * dt);
          if (f.s.y >= gy) f.vy = 0;
        }
        f.s.setFlipX(f.v < 0);
        if (Math.abs(f.s.x - hero.x) < 40 && Math.abs(f.s.y - hero.y) < 50 && f.s.visible) {
          this.score++;
          sfx('pick');
          const t = this.add.text(f.s.x, f.s.y - 80, '+1', { fontFamily: FONT, fontSize: '30px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5);
          this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
          f.s.setVisible(false);
          this.time.delayedCall(900, () => {
            if (!f.s.active) return;
            f.s.setPosition(hero.x < W / 2 ? W - 60 : 60, gy).setVisible(true);
          });
        }
      }
      this.info.setText(`Tempo: ${left}   ·   Ovelhas: ${this.score}\nEncoste nas ovelhas! Setas para andar, ↑/Espaço pula (ou toque no pasto).`);
    });
  }

  /** Passo por quadro que some quando a cena sai (ou reinicia). */
  private onUpdate(fn: (time: number, dt: number) => void): void {
    this.events.on('update', fn);
    this.events.once('shutdown', () => this.events.off('update', fn));
  }

  // ---------- fim ----------

  private flash(text: string, color: string): void {
    const t = this.add.text(W / 2, this.HH * 0.4, text, { fontFamily: FONT, fontSize: '32px', color, stroke: '#10223a', strokeThickness: 7 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  /** Recompensa: ouro e um pouco de XP, cada vez menos se jogar muitas vezes no mesmo dia. */
  private finish(points: number, summary: string): void {
    if (this.done) return;
    this.done = true;
    const key = todayKey(this.kind);
    const plays = getStat(key);
    addStat(key);
    const k = Math.max(0.25, 1 - plays * 0.25);
    const per = this.kind === 'fish' ? { xp: 6, gold: 1 } : this.kind === 'targets' ? { xp: 2, gold: 1 } : { xp: 5, gold: 4 };
    // Na pesca a pontuação já é o ouro dos peixes; o XP conta os peixes.
    const goldBase = this.kind === 'fish' ? this.score : points * per.gold;
    const xpBase = (this.kind === 'fish' ? points : points) * per.xp;
    const gold = Math.round(goldBase * k);
    const xp = Math.round(xpBase * k);
    addCoins(gold);
    const ups = addXp(xp);
    const P = VIEW.portrait;
    const HH = this.HH;
    const pw = P ? W - 120 : 640;
    const ph = P ? 520 : 330;
    const g = this.add.graphics().setDepth(60);
    g.fillStyle(0x000000, 0.5).fillRect(0, 0, W, HH);
    g.fillStyle(INK, 1).fillRoundedRect(W / 2 - pw / 2 - 6, HH / 2 - ph / 2 - 6, pw + 12, ph + 12, 22);
    g.fillStyle(0xfff7dc, 1).fillRoundedRect(W / 2 - pw / 2, HH / 2 - ph / 2, pw, ph, 18);
    const note = k < 1 ? `\n(Recompensa reduzida: você já jogou ${plays}x hoje.)` : '';
    this.add.text(W / 2, HH / 2 - ph / 2 + 50, 'FIM DE JOGO!', { fontFamily: FONT, fontSize: P ? '50px' : '32px', color: '#7a3ad0' }).setOrigin(0.5).setDepth(61);
    this.add
      .text(W / 2, HH / 2 - ph / 2 + (P ? 120 : 90), `${summary}\nOuro: +${gold}   ·   XP: +${xp}${note}`, { fontFamily: BODY_FONT, fontSize: P ? '30px' : '20px', color: '#10223a', align: 'center', wordWrap: { width: pw - 60 } })
      .setOrigin(0.5, 0)
      .setDepth(61);
    pillButton(this, W / 2 - (P ? 230 : 160), HH / 2 + ph / 2 - (P ? 80 : 54), 'DE NOVO', () => this.scene.restart({ kind: this.kind }), 240, 0xbfe9ff).setScale(P ? 1.3 : 1).setDepth(62);
    pillButton(this, W / 2 + (P ? 230 : 160), HH / 2 + ph / 2 - (P ? 80 : 54), 'VILA', () => this.scene.start('village', {}), 240, 0xffe066).setScale(P ? 1.3 : 1).setDepth(62);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('village', {}));
    if (ups > 0) levelUpBanner(this, getLevel(), 400);
  }
}
