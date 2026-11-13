import Phaser from 'phaser';
import { BODY_FONT, FONT, H, W } from '../config';
import type { DeviceId } from '../game/controls';
import { getCoins } from '../game/progress';
import { sfx } from '../game/settings';
import { playMusic } from '../game/music';
import { UPGRADES, buyUpgrade, hasUpgrade } from '../game/upgrades';
import { pillButton } from '../ui/devices';

/**
 * Empório da Orelha-Preta: a loja de aprimoramentos (no espírito do Empório do Cuphead).
 * A dona é uma ovelha que não fala: responde por uma placa de madeira. Compra-se com o ouro
 * juntado nas fases. ←/→ escolhe, Enter/A compra, Esc/B volta ao mapa do mundo.
 */
export class ShopScene extends Phaser.Scene {
  lastData: { devices?: DeviceId[]; area?: string } = {};
  private sel = 0;
  private cards: Array<{ box: Phaser.GameObjects.Container; frame: Phaser.GameObjects.Rectangle; tag: Phaser.GameObjects.Text }> = [];
  private coinText!: Phaser.GameObjects.Text;
  private signText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private howText!: Phaser.GameObjects.Text;
  private sheep!: Phaser.GameObjects.Sprite;
  private prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };

  constructor() {
    super('shop');
  }

  init(data: { devices?: DeviceId[]; area?: string }): void {
    this.lastData = data;
    this.cards = [];
    this.prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };
  }

  create(): void {
    playMusic('pradaria', 'emporio');
    const HH = this.scale.height;
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
    this.signText = this.add.text(700, feet - 84, '', { fontFamily: BODY_FONT, fontSize: '19px', color: '#3a2412', align: 'center', wordWrap: { width: 390 } }).setOrigin(0.5);
    // Ouro.
    this.add.image(W - 400, oy + 44, 'gold').setScale(1.6);
    this.coinText = this.add.text(W - 368, oy + 44, '', { fontFamily: FONT, fontSize: '34px', color: '#ffd84a', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0, 0.5);
    pillButton(this, W - 110, oy + 44, '◀ MAPA', () => this.back(), 180).setScale(0.8);

    // Prateleira: um cartão por aprimoramento.
    // Cartões cabem na largura, quantos forem os aprimoramentos.
    const cw = Math.min(190, Math.floor((W - 40) / UPGRADES.length) - 12);
    const x0 = W / 2 - ((UPGRADES.length - 1) * (cw + 12)) / 2;
    const cy = gy + 190;
    UPGRADES.forEach((u, i) => {
      const x = x0 + i * (cw + 12);
      const frame = this.add.rectangle(0, 0, cw, 170, 0xf4e3bf).setStrokeStyle(5, 0x10223a);
      const shelf = this.add.rectangle(0, 20, cw - 24, 8, 0x8a5a2b).setStrokeStyle(2, 0x10223a);
      const icon = this.add.image(0, -22, u.icon, 0);
      // Alguns desenhos têm muita margem transparente: aumenta para encher o cartão.
      const boost: Record<string, number> = { gold: 3.2, skull_avatar: 1.7, cloud_05: 1.5, bone: 1.3, tool_sword: 2.6 };
      icon.setScale(Math.min(74 / icon.width, 74 / icon.height) * (boost[u.icon] ?? 1));
      if (u.icon === 'guard_arc') icon.setTint(0x6fb8ff);
      const name = this.add.text(0, 44, u.name, { fontFamily: FONT, fontSize: '16px', color: '#10223a', align: 'center', wordWrap: { width: cw - 12 } }).setOrigin(0.5);
      const tag = this.add.text(0, 70, '', { fontFamily: FONT, fontSize: '18px', color: '#8a5a00' }).setOrigin(0.5);
      const box = this.add.container(x, cy, [frame, shelf, icon, name, tag]);
      frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.sel === i ? this.buy() : this.select(i)));
      this.cards.push({ box, frame, tag });
    });
    // Painel de descrição.
    const py = cy + 150;
    this.add.rectangle(W / 2, py, 1000, 96, 0x10223a, 0.92).setStrokeStyle(3, 0xfff7dc, 0.8);
    this.nameText = this.add.text(W / 2 - 480, py - 34, '', { fontFamily: FONT, fontSize: '24px', color: '#ffe066' });
    this.howText = this.add.text(W / 2 - 480, py - 4, '', { fontFamily: BODY_FONT, fontSize: '18px', color: '#fff7dc', wordWrap: { width: 760 } });
    pillButton(this, W / 2 + 390, py, 'COMPRAR', () => this.buy(), 190, 0xffe066).setScale(0.85);
    this.add.text(W / 2, py + 70, '← → escolher  ·  Enter / A comprar  ·  Esc / B voltar', { fontFamily: BODY_FONT, fontSize: '16px', color: '#bfd0e0' }).setOrigin(0.5);

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.select(this.sel - 1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.select(this.sel + 1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.buy());
    kb.on('keydown-ESC', () => this.back());
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
      c.box.setScale(k === this.sel ? 1.08 : 1).setDepth(k === this.sel ? 2 : 1);
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
    this.scene.start('world', { devices: this.lastData.devices, area: this.lastData.area });
  }

  update(): void {
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
