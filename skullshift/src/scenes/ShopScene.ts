import Phaser from 'phaser';
import { BODY_FONT, FONT, H, PORTRAIT, VIEW, W } from '../config';
import type { DeviceId } from '../game/controls';
import { getCoins } from '../game/progress';
import { sfx } from '../game/settings';
import { playMusic } from '../game/music';
import { UPGRADES, buyUpgrade, hasUpgrade } from '../game/upgrades';
import { pillButton } from '../ui/devices';
import { announceAchievements } from '../game/achievements';

/**
 * Empório da Orelha-Preta: a loja de aprimoramentos (no espírito do Empório do Cuphead).
 * A dona é uma ovelha que não fala: responde por uma placa de madeira. Compra-se com o ouro
 * juntado nas fases. ←/→ escolhe, Enter/A compra, Esc/B volta ao mapa do mundo.
 */
export class ShopScene extends Phaser.Scene {
  lastData: { devices?: DeviceId[]; area?: string; from?: string } = {};
  private sel = 0;
  private cards: Array<{ box: Phaser.GameObjects.Container; frame: Phaser.GameObjects.Rectangle; tag: Phaser.GameObjects.Text }> = [];
  private coinText!: Phaser.GameObjects.Text;
  private signText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private howText!: Phaser.GameObjects.Text;
  private sheep!: Phaser.GameObjects.Sprite;
  private signBox?: { x: number; y: number; w: number; h: number; feet: number };
  /** Segredo: parado um tempo no Empório, a ovelha dá uma mordida na placa. */
  private idleAt = 0;
  private bitten = false;
  private prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };

  constructor() {
    super('shop');
  }

  init(data: { devices?: DeviceId[]; area?: string; from?: string }): void {
    this.idleAt = 0;
    this.bitten = false;
    this.lastData = data;
    this.cards = [];
    this.prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };
  }

  /** Escala de cada cartão (em pé os cartões ficam maiores, em grade). */
  private cardScale = 1;

  create(): void {
    playMusic('pradaria', 'emporio');
    const HH = this.scale.height;
    if (VIEW.portrait) return this.createPortrait(HH);
    const oy = Math.max(0, (HH - H) / 2);
    // Fim de tarde na pradaria: céu, colina, a loja e a dona.
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HH);
    this.add.rectangle(0, 0, W, HH, 0xffc98a, 0.18).setOrigin(0);
    this.add.image(120, oy + 60, 'cloud_02').setOrigin(0).setScale(0.8);
    this.add.image(820, oy + 30, 'cloud_04').setOrigin(0).setScale(0.7);
    const gy = oy + 250;
    for (let i = 0; i < 20; i++) {
      const col = i === 0 ? 5 : i === 19 ? 7 : 6;
      this.add.image(i * 64, gy, 'tilemap', 27 + col).setOrigin(0);
    }
    this.add.rectangle(0, gy + 60, W, HH - gy - 60, 0x18304a).setOrigin(0);
    const feet = gy + 40;
    this.add.ellipse(250, feet, 300, 30, 0x10223a, 0.25);
    this.add.image(250, feet, 'bld_yellow_house2').setOrigin(0.5, 178 / 192).setScale(1.7);
    if (this.textures.exists('res_tree')) this.add.sprite(70, feet, 'res_tree').setOrigin(0.5, 0.9).play('res_tree');
    // Letreiro da loja.
    this.board(250, gy - 210, 330, 54, 'EMPÓRIO DA ORELHA-PRETA', 20);
    // A dona: uma ovelha (a de orelha preta) e a sua placa.
    this.add.ellipse(470, feet, 80, 16, 0x10223a, 0.25);
    this.sheep = this.add.sprite(470, feet - 36, 'sheep_idle').play('sheep_idle').setFlipX(true);
    this.add.ellipse(455, feet - 46, 12, 8, 0x1d1a2b).setAngle(-20); // a orelha preta
    this.add.rectangle(700, feet - 20, 10, 70, 0x6b4423).setStrokeStyle(2, 0x10223a);
    this.board(700, feet - 84, 420, 76, '', 18);
    this.signBox = { x: 700, y: feet - 84, w: 420, h: 76, feet };
    this.signText = this.add.text(700, feet - 84, '', { fontFamily: BODY_FONT, fontSize: '19px', color: '#3a2412', align: 'center', wordWrap: { width: 390 } }).setOrigin(0.5);
    // Ouro.
    this.add.image(W - 400, oy + 44, 'gold').setScale(1.6);
    this.coinText = this.add.text(W - 368, oy + 44, '', { fontFamily: FONT, fontSize: '34px', color: '#ffd84a', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0, 0.5);
    pillButton(this, W - 110, oy + 44, this.lastData.from === 'village' ? '◀ VILA' : '◀ MAPA', () => this.back(), 180).setScale(0.8);

    // Prateleira: um cartão por aprimoramento.
    // Cartões cabem na largura, quantos forem os aprimoramentos.
    const cw = Math.min(190, Math.floor((W - 40) / UPGRADES.length) - 12);
    const x0 = W / 2 - ((UPGRADES.length - 1) * (cw + 12)) / 2;
    const cy = gy + 190;
    this.cardScale = 1;
    UPGRADES.forEach((u, i) => this.card(i, x0 + i * (cw + 12), cy, cw));
    this.descPanel(gy + 190 + 150);
    this.finishCreate();
  }

  /** Cartão de um aprimoramento na prateleira. */
  private card(i: number, x: number, cy: number, cw: number): void {
    const u = UPGRADES[i];
    {
      // Em pé as letras são maiores: ícone e prateleira sobem para o nome caber em 2 linhas.
      const P = VIEW.portrait;
      const frame = this.add.rectangle(0, 0, cw, 170, 0xf4e3bf).setStrokeStyle(5, 0x10223a);
      const shelf = this.add.rectangle(0, P ? 12 : 20, cw - 24, 8, 0x8a5a2b).setStrokeStyle(2, 0x10223a);
      const icon = this.add.image(0, P ? -28 : -22, u.icon, 0);
      // Alguns desenhos têm muita margem transparente: aumenta para encher o cartão.
      const boost: Record<string, number> = { gold: 3.2, skull_avatar: 1.7, cloud_05: 1.5, bone: 1.3, tool_sword: 2.6 };
      icon.setScale(Math.min((P ? 64 : 74) / icon.width, (P ? 64 : 74) / icon.height) * (boost[u.icon] ?? 1));
      if (u.icon === 'guard_arc') icon.setTint(0x6fb8ff);
      const name = this.add.text(0, P ? 37 : 44, u.name, { fontFamily: FONT, fontSize: P ? '19px' : '16px', color: '#10223a', align: 'center', wordWrap: { width: cw - 12 }, lineSpacing: P ? -4 : 0 }).setOrigin(0.5);
      const tag = this.add.text(0, P ? 72 : 70, '', { fontFamily: FONT, fontSize: P ? '21px' : '18px', color: '#8a5a00' }).setOrigin(0.5);
      const box = this.add.container(x, cy, [frame, shelf, icon, name, tag]).setScale(this.cardScale);
      frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.sel === i ? this.buy() : this.select(i)));
      this.cards.push({ box, frame, tag });
    }
  }

  /** Painel com o nome, o que faz e o botão de comprar. */
  private descPanel(py: number): void {
    this.add.rectangle(W / 2, py, 1000, 96, 0x10223a, 0.92).setStrokeStyle(3, 0xfff7dc, 0.8);
    this.nameText = this.add.text(W / 2 - 480, py - 34, '', { fontFamily: FONT, fontSize: '24px', color: '#ffe066' });
    this.howText = this.add.text(W / 2 - 480, py - 4, '', { fontFamily: BODY_FONT, fontSize: '18px', color: '#fff7dc', wordWrap: { width: 760 } });
    pillButton(this, W / 2 + 390, py, 'COMPRAR', () => this.buy(), 190, 0xffe066).setScale(0.85);
    this.add.text(W / 2, py + 70, '← → escolher  ·  Enter / A comprar  ·  Esc / B voltar', { fontFamily: BODY_FONT, fontSize: '16px', color: '#bfd0e0' }).setOrigin(0.5);
  }

  /**
   * Em pé: a loja e a dona em cima, maiores; os aprimoramentos em grade de 4 colunas; o painel
   * de compra largo embaixo, com o botão COMPRAR grande.
   */
  private createPortrait(HH: number): void {
    const tp = PORTRAIT.topPad;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HH);
    this.add.rectangle(0, 0, W, HH, 0xffc98a, 0.18).setOrigin(0);
    this.add.image(60, tp + 200, 'cloud_02').setOrigin(0).setScale(1.1);
    this.add.image(760, tp + 160, 'cloud_04').setOrigin(0).setScale(1);
    // Sobra de altura: espalha um pouco entre a cena e a prateleira.
    const extra = Math.max(0, HH - tp - 2050);
    const gy = tp + 620 + extra * 0.25;
    for (let i = 0; i < 20; i++) {
      const col = i === 0 ? 5 : i === 19 ? 7 : 6;
      this.add.image(i * 64, gy, 'tilemap', 27 + col).setOrigin(0);
    }
    this.add.rectangle(0, gy + 60, W, HH - gy - 60, 0x18304a).setOrigin(0);
    const feet = gy + 40;
    this.add.ellipse(300, feet, 420, 40, 0x10223a, 0.25);
    this.add.image(300, feet, 'bld_yellow_house2').setOrigin(0.5, 178 / 192).setScale(2.3);
    if (this.textures.exists('res_tree')) this.add.sprite(70, feet, 'res_tree').setOrigin(0.5, 0.9).setScale(1.3).play('res_tree');
    this.board(W / 2, tp + 210, 760, 90, 'EMPÓRIO DA ORELHA-PRETA', 40);
    this.add.ellipse(640, feet, 120, 22, 0x10223a, 0.25);
    this.sheep = this.add.sprite(640, feet - 54, 'sheep_idle').setScale(1.5).play('sheep_idle').setFlipX(true);
    this.add.ellipse(618, feet - 69, 18, 12, 0x1d1a2b).setAngle(-20);
    this.add.rectangle(960, feet - 40, 14, 110, 0x6b4423).setStrokeStyle(3, 0x10223a);
    this.board(960, feet - 170, 520, 150, '', 30);
    this.signBox = { x: 960, y: feet - 170, w: 520, h: 150, feet };
    this.signText = this.add.text(960, feet - 170, '', { fontFamily: BODY_FONT, fontSize: '32px', color: '#3a2412', align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5);
    // Ouro e voltar, no alto.
    this.add.image(W - 330, tp + 80, 'gold').setScale(2.4);
    this.coinText = this.add.text(W - 290, tp + 80, '', { fontFamily: FONT, fontSize: '60px', color: '#ffd84a', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0, 0.5);
    pillButton(this, 170, tp + 80, this.lastData.from === 'village' ? '◀ VILA' : '◀ MAPA', () => this.back(), 180).setScale(1.5);
    // Prateleira em grade: 4 por linha.
    this.cardScale = 1.62;
    const cols = 4;
    const cw = 180;
    const step = cw * this.cardScale + 16;
    const rowH = 170 * this.cardScale + 40;
    const top = gy + 120 + (170 * this.cardScale) / 2;
    UPGRADES.forEach((_, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, UPGRADES.length - r * cols);
      const c = i % cols;
      const x = W / 2 + (c - (inRow - 1) / 2) * step;
      this.card(i, x, top + r * rowH, cw);
    });
    const rows = Math.ceil(UPGRADES.length / cols);
    const py = top + (rows - 1) * rowH + 170 * this.cardScale / 2 + 60 + extra * 0.35;
    const pw = W - 80;
    this.add.rectangle(W / 2, py + 170, pw, 340, 0x10223a, 0.92).setStrokeStyle(4, 0xfff7dc, 0.8);
    this.nameText = this.add.text(W / 2 - pw / 2 + 36, py + 30, '', { fontFamily: FONT, fontSize: '46px', color: '#ffe066' });
    this.howText = this.add.text(W / 2 - pw / 2 + 36, py + 92, '', { fontFamily: BODY_FONT, fontSize: '34px', color: '#fff7dc', wordWrap: { width: pw - 72 }, lineSpacing: 4 });
    pillButton(this, W / 2, py + 280, 'COMPRAR', () => this.buy(), 190, 0xffe066).setScale(1.7);
    this.finishCreate();
  }

  /** Teclado, controle e o primeiro estado (comum aos dois layouts). */
  private finishCreate(): void {
    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.select(this.sel - 1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.select(this.sel + 1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.buy());
    kb.on('keydown-ESC', () => this.back());
    // Qualquer toque ou tecla conta como "mexer" (adia a mordida da ovelha).
    this.idleAt = -1;
    kb.on('keydown', () => (this.idleAt = this.time.now));
    this.input.on('pointerdown', () => (this.idleAt = this.time.now));
    this.say('Béé. (Aceito ouro. Não aceito conversa.)');
    this.select(this.sel);
    this.cameras.main.fadeIn(250, 14, 26, 43);
  }

  /** Placa de madeira. */
  private board(x: number, y: number, w: number, h: number, text: string, size: number): void {
    this.add.rectangle(x, y, w, h, 0xc89858).setStrokeStyle(4, 0x10223a);
    this.add.rectangle(x, y, w - 14, h - 14, 0xdcb06e).setStrokeStyle(2, 0x8a5a2b);
    if (text) this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: '#3a2412' }).setOrigin(0.5);
  }

  private say(text: string): void {
    this.signText.setText(text);
    this.tweens.add({ targets: this.sheep, y: this.sheep.y - 10, duration: 120, yoyo: true });
  }

  private select(i: number): void {
    this.sel = Phaser.Math.Wrap(i, 0, UPGRADES.length);
    const coins = getCoins();
    this.coinText.setText(String(coins));
    this.cards.forEach((c, k) => {
      const u = UPGRADES[k];
      const own = hasUpgrade(u.id);
      c.frame.setStrokeStyle(k === this.sel ? 8 : 5, k === this.sel ? 0xffb000 : 0x10223a).setFillStyle(own ? 0xcfe8c0 : 0xf4e3bf);
      c.tag.setText(own ? 'COMPRADO' : `${u.price} ouro`).setColor(own ? '#2e7d32' : coins >= u.price ? '#8a5a00' : '#b03030');
      c.box.setScale((k === this.sel ? 1.08 : 1) * this.cardScale).setDepth(k === this.sel ? 2 : 1);
    });
    const u = UPGRADES[this.sel];
    this.nameText.setText(u.name);
    this.howText.setText(u.how);
  }

  private buy(): void {
    const u = UPGRADES[this.sel];
    if (hasUpgrade(u.id)) {
      this.say('Béé. (Esse já é seu.)');
      sfx('select');
    } else if (buyUpgrade(u.id)) {
      sfx('pick');
      this.say(u.sign);
      announceAchievements(this);
      this.cameras.main.flash(120, 255, 240, 180);
      const c = this.cards[this.sel].box;
      this.tweens.add({ targets: c, angle: { from: -6, to: 0 }, duration: 300, ease: 'Back.easeOut' });
    } else {
      sfx('hit');
      this.say(`Béé. (Faltam ${u.price - getCoins()} de ouro.)`);
      this.cameras.main.shake(100, 0.004);
    }
    this.select(this.sel);
  }

  private back(): void {
    if (this.lastData.from === 'village') return void this.scene.start('village', {});
    this.scene.start('world', { devices: this.lastData.devices, area: this.lastData.area });
  }

  /** A ovelha vai até a placa, dá três mordidas no canto e volta (só uma vez por visita). */
  biteSign(): void {
    const b = this.signBox;
    if (!b || this.bitten) return;
    this.bitten = true;
    const sheep = this.sheep;
    const home = sheep.x;
    const P = VIEW.portrait;
    const cx = b.x - b.w / 2 + 6;
    const cy = b.y + b.h / 2 - 6;
    sheep.setFlipX(false).play('sheep_move');
    this.tweens.add({
      targets: sheep,
      x: cx - (P ? 90 : 60),
      duration: 1200,
      onComplete: () => {
        sheep.play('sheep_idle');
        const bite = this.add.graphics().setDepth(5);
        [0, 1, 2].forEach((i) => {
          this.time.delayedCall(i * 450, () => {
            sfx('clack', 0.6 + i * 0.05);
            this.tweens.add({ targets: sheep, angle: { from: 0, to: -12 }, duration: 110, yoyo: true });
            // Marca de mordida (meia-lua do céu) e farelos de madeira caindo.
            const r = (P ? 26 : 16) - i * 3;
            bite.fillStyle(0x7fcbd8, 1).fillCircle(cx + i * r * 0.9, cy - i * r * 0.5, r);
            this.add.particles(cx + i * r, cy, 'spark', { speed: { min: 40, max: 120 }, angle: { min: 60, max: 120 }, gravityY: 400, lifespan: 600, scale: { start: 0.25, end: 0.1 }, tint: 0xc89858, emitting: false }).setDepth(6).explode(6);
          });
        });
        this.time.delayedCall(1500, () => {
          this.say('Béé. (Nhac. Sua placa estava ótima.)');
          sheep.setFlipX(true).play('sheep_move');
          this.tweens.add({ targets: sheep, x: home, duration: 1200, onComplete: () => sheep.play('sheep_idle') });
        });
      },
    });
  }

  update(): void {
    if (this.idleAt < 0) this.idleAt = this.time.now;
    if (!this.bitten && this.time.now - this.idleAt > 25000) this.biteSign();
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const ax = pad.axes[0]?.getValue() ?? 0;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const st = { l: b(14) || ax < -0.5, r: b(15) || ax > 0.5, u: false, d: false, a: b(0), b: b(1) };
    const p = this.prevPad;
    if (st.l && !p.l) this.select(this.sel - 1);
    if (st.r && !p.r) this.select(this.sel + 1);
    if (st.a && !p.a) this.buy();
    if (st.b && !p.b) this.back();
    this.prevPad = st;
  }
}
