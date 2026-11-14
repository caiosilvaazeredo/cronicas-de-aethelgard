import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { LANGS, lang, setLang } from '../i18n';
import { sfx } from '../game/settings';
import { backdrop } from '../ui/backdrop';
import { pillButton } from '../ui/devices';

/** Escolha de idioma: cada língua aparece com o próprio nome (sem bandeiras). */
export class LanguageScene extends Phaser.Scene {
  private sel = 0;
  private items: Array<{ bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  lastData: object = {};

  constructor() {
    super('language');
  }

  create(): void {
    // Título nos idiomas mais falados entre os disponíveis, para qualquer um reconhecer a tela.
    backdrop(this, 'IDIOMA · LANGUAGE');
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const cols = P ? 1 : 2;
    const rows = Math.ceil(LANGS.length / cols);
    const cw = P ? 620 : 470;
    const top = P ? 230 : 150;
    const rh = Math.min(P ? 78 : 62, (HH - top - 130) / rows);
    this.items = [];
    this.sel = Math.max(0, LANGS.findIndex((l) => l.id === lang()));
    LANGS.forEach((l, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = W / 2 + (c - (cols - 1) / 2) * (cw + 24);
      const y = top + r * rh;
      const bg = this.add.rectangle(x, y, cw, rh - 10, 0x10223a, 0.75).setStrokeStyle(3, 0x6a7ab0).setInteractive({ useHandCursor: true });
      // Nome do idioma na fonte do aparelho quando a do jogo não tem o alfabeto.
      const label = this.add.text(x, y, l.name, { fontFamily: `${BODY_FONT}`, fontSize: `${Math.round(rh * 0.42)}px`, color: '#fff7dc' }).setOrigin(0.5);
      bg.on('pointerover', () => this.pick(i));
      bg.on('pointerdown', () => this.choose(i));
      this.items.push({ bg, label });
    });
    this.add.text(W / 2, HH - (P ? 150 : 96), '', { fontFamily: FONT, fontSize: '18px', color: '#9ab0d8' }).setOrigin(0.5);
    pillButton(this, W / 2, HH - (P ? 80 : 46), '◄', () => this.scene.start('menu'), 120);
    const kb = this.input.keyboard;
    const move = (d: number) => this.pick(Phaser.Math.Wrap(this.sel + d, 0, LANGS.length));
    kb?.on('keydown-UP', () => move(-cols));
    kb?.on('keydown-DOWN', () => move(cols));
    kb?.on('keydown-LEFT', () => move(-1));
    kb?.on('keydown-RIGHT', () => move(1));
    kb?.on('keydown-W', () => move(-cols));
    kb?.on('keydown-S', () => move(cols));
    kb?.on('keydown-A', () => move(-1));
    kb?.on('keydown-D', () => move(1));
    kb?.on('keydown-ENTER', () => this.choose(this.sel));
    kb?.on('keydown-SPACE', () => this.choose(this.sel));
    kb?.on('keydown-ESC', () => this.scene.start('menu'));
    this.pick(this.sel);
  }

  private pick(i: number): void {
    this.sel = i;
    this.items.forEach((it, k) => {
      const on = k === i;
      const cur = LANGS[k].id === lang();
      it.bg.setFillStyle(on ? 0x2f4fb8 : 0x10223a, on ? 0.95 : 0.75).setStrokeStyle(3, on ? 0xffe066 : cur ? 0x7ee08a : 0x6a7ab0);
      it.label.setColor(on ? '#ffe066' : cur ? '#7ee08a' : '#fff7dc');
    });
  }

  private choose(i: number): void {
    sfx('select');
    if (LANGS[i].id === lang()) this.scene.start('menu');
    else setLang(LANGS[i].id);
  }
}
