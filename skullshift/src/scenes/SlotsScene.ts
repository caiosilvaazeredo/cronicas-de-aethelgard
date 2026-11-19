import Phaser from 'phaser';
import { AREAS } from '../game/areas';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { CHAPTERS } from '../data/lore';
import { SLOT_COUNT, deleteSlot, loadSlot, newSlot, useSlot, type Difficulty } from '../game/progress';
import { backdrop } from '../ui/backdrop';
import { panel, pillButton } from '../ui/devices';
import { noTr, trf } from '../i18n';

const INK = 0x1d1a2b;

/**
 * Escolha do save do modo história: 3 slots. Cada um mostra até onde chegou, a dificuldade
 * e a data do último jogo; CONTINUAR ou APAGAR. Slot vazio: NOVO JOGO em Normal ou Difícil.
 */
const CARD_W = 370;
const CARD_H = 400;
/** Em pé: cartões largos e baixos (botões lado a lado), para ocupar a largura da tela. */
const WIDE_W = 600;
const WIDE_H = 310;
/** Dificuldades: id, nome no botão, regra, cor do botão e cor do texto no save. */
const DIFFS: Array<[Difficulty, string, string, number, string]> = [
  ['easy', 'FÁCIL', 'recomeça a fase após 9 mortes', 0xb8f0b0, '#2e7d32'],
  ['normal', 'PADRÃO', 'recomeça a fase após 5 mortes', 0xbfe9ff, '#2f86e0'],
  ['hard', 'DIFÍCIL', 'recomeça a fase na 3ª morte', 0xff9a8a, '#c0392b'],
];

export class SlotsScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Container[] = [];
  private sel = 0;
  private confirmDelete = -1;
  private prevPad = { l: true, r: true, a: true, b: true, x: true };
  lastData: object = {};

  constructor() {
    super('slots');
  }

  init(): void {
    this.cards = [];
    this.confirmDelete = -1;
    this.prevPad = { l: true, r: true, a: true, b: true, x: true };
  }

  create(): void {
    backdrop(this, 'ESCOLHA O SAVE');
    const P = VIEW.portrait;
    const HH = this.scale.height;
    pillButton(this, P ? W / 2 : 160, P ? HH - 120 : 668, '◀  VOLTAR', () => this.back(), 230).setScale(P ? 1.8 : 1);
    // A dica de teclado só deitado (em pé, tudo é por toque).
    if (!P) this.add
      .text(W / 2, 612, '◀ ▶ escolher  ·  Enter / A: jogar  ·  Delete / X: apagar  ·  Esc / B: voltar', {
        fontFamily: BODY_FONT,
        fontSize: P ? '28px' : '17px',
        color: '#fff7dc',
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A', 'UP', 'W']) kb.on(`keydown-${k}`, () => this.move(-1));
    for (const k of ['RIGHT', 'D', 'DOWN', 'S']) kb.on(`keydown-${k}`, () => this.move(1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.primary(this.sel));
    kb.on('keydown-DELETE', () => this.erase(this.sel));
    kb.on('keydown-BACKSPACE', () => this.erase(this.sel));
    kb.on('keydown-ESC', () => this.back());
    this.refresh();
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const ax = pad.axes[0]?.getValue() ?? 0;
    const st = { l: b(14) || ax < -0.5, r: b(15) || ax > 0.5, a: b(0) || b(9), b: b(1), x: b(2) };
    if (st.l && !this.prevPad.l) this.move(-1);
    if (st.r && !this.prevPad.r) this.move(1);
    if (st.a && !this.prevPad.a) this.primary(this.sel);
    if (st.x && !this.prevPad.x) this.erase(this.sel);
    if (st.b && !this.prevPad.b) this.back();
    this.prevPad = st;
  }

  private move(dir: number): void {
    this.sel = Phaser.Math.Wrap(this.sel + dir, 0, SLOT_COUNT);
    this.confirmDelete = -1;
    this.refresh();
  }

  private refresh(): void {
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    const P = VIEW.portrait;
    // Em pé: os três cartões empilhados no espaço entre o título e os botões de baixo,
    // na maior escala que couber (sem encostar um no outro).
    const HH = this.scale.height;
    const top = 260;
    const bottom = HH - 230;
    const gap = 26;
    const sc = Math.min((bottom - top) / (SLOT_COUNT * (WIDE_H + gap)), (W - 70) / (WIDE_W + 20));
    for (let i = 0; i < SLOT_COUNT; i++) {
      const c = this.card(i);
      const y0 = top + Math.max(0, (bottom - top - SLOT_COUNT * (WIDE_H + gap) * sc) / 2);
      if (P) c.setPosition(W / 2, y0 + (WIDE_H + gap) * sc * (i + 0.5)).setScale(sc);
      else c.setPosition(W / 2 + (i - 1) * 400, 330);
      this.cards.push(c);
    }
  }

  private card(i: number): Phaser.GameObjects.Container {
    const n = i + 1;
    const data = loadSlot(n);
    const on = i === this.sel;
    const wide = VIEW.portrait;
    const items: Phaser.GameObjects.GameObject[] = [];
    const w = wide ? WIDE_W : CARD_W;
    const h = wide ? WIDE_H : CARD_H;
    if (on) {
      const glow = this.add.graphics();
      glow.fillStyle(0xffe066, 1).fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 26);
      items.push(glow);
    }
    items.push(panel(this, 0, 0, w, h));
    const title = wide
      ? this.add.text(-w / 2 + 30, -h / 2 + 38, '', { fontFamily: FONT, fontSize: '38px', color: '#10223a' }).setOrigin(0, 0.5)
      : this.add.text(0, -h / 2 + 36, '', { fontFamily: FONT, fontSize: '34px', color: '#10223a' }).setOrigin(0.5);
    // Já traduzido (sem o encaixe na largura de "SAVE 1", que encolhia "SPIELSTAND 1").
    noTr(title).setText(trf('SAVE {0}', n));
    items.push(title);
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.sel !== i) {
        this.sel = i;
        this.confirmDelete = -1;
        this.refresh();
      }
    });
    items.push(hit);

    if (!data) {
      if (wide) {
        items.push(this.add.text(title.x + title.width + 18, title.y, 'VAZIO', { fontFamily: FONT, fontSize: '30px', color: '#8a95a3' }).setOrigin(0, 0.5));
        items.push(this.add.text(0, -66, 'Novo jogo — escolha a dificuldade:', { fontFamily: BODY_FONT, fontSize: '23px', color: '#3c5368' }).setOrigin(0.5));
        // Três botões lado a lado, cada um com a regra embaixo.
        DIFFS.forEach(([d, label, note, color], k) => {
          const x = (k - 1) * 192;
          items.push(pillButton(this, x, 4, label, () => this.start(n, d), 180, color).setScale(1));
          items.push(this.add.text(x, 46, note, { fontFamily: BODY_FONT, fontSize: '18px', color: '#3c5368', align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5, 0));
        });
        return this.add.container(0, 0, items);
      }
      items.push(this.add.text(0, -122, 'VAZIO', { fontFamily: FONT, fontSize: '28px', color: '#8a95a3' }).setOrigin(0.5));
      items.push(this.add.text(0, -90, 'Novo jogo — escolha a dificuldade:', { fontFamily: BODY_FONT, fontSize: '17px', color: '#3c5368' }).setOrigin(0.5));
      // Um botão por dificuldade, com a regra embaixo (sem encostar no botão de baixo).
      DIFFS.forEach(([d, label, note, color], k) => {
        const y = -46 + k * 86;
        items.push(pillButton(this, 0, y, label, () => this.start(n, d), 240, color).setScale(0.78));
        items.push(this.add.text(0, y + 31, note, { fontFamily: BODY_FONT, fontSize: '14px', color: '#3c5368' }).setOrigin(0.5, 0));
      });
      return this.add.container(0, 0, items);
    }

    const done = data.completed;
    const total = CHAPTERS.length;
    const areas = AREAS.filter((a) => a.levels.length > 0);
    const got = areas.map((a) => a.levels.every((id) => (data.done ?? []).includes(id)));
    const frags = got.filter(Boolean).length;
    const where = done >= total ? 'HISTÓRIA COMPLETA' : `${done} FASES · ${frags}/${AREAS.length} FRAGMENTOS`;
    const diff = DIFFS.find(([d]) => d === data.difficulty) ?? DIFFS[1];
    const date = data.updated ? new Date(data.updated).toLocaleDateString('pt-BR') : '—';
    const confirm = this.confirmDelete === i;
    // Medalhões: um por fragmento, sempre cabendo na largura dada.
    const medals = (cx: number, cy: number, span: number) => {
      const g = this.add.graphics();
      const step = Math.min(40, span / Math.max(1, got.length - 1));
      const r = Math.min(15, step * 0.42);
      const x0 = cx - (step * (got.length - 1)) / 2;
      got.forEach((ok, k) => {
        const x = x0 + k * step;
        g.fillStyle(INK).fillCircle(x, cy, r);
        g.fillStyle(ok ? 0xd8a530 : 0x8a95a3).fillCircle(x, cy, r * 0.8);
        g.fillStyle(ok ? 0x58b947 : 0x5f6872).fillCircle(x, cy, r * 0.4);
      });
      return g;
    };

    if (wide) {
      items.push(this.add.image(-w / 2 + 70, 10, 'skull_avatar').setScale(0.3));
      const left = -w / 2 + 130;
      const wt = this.add.text(left, -70, where, { fontFamily: FONT, fontSize: '25px', color: '#10223a' }).setOrigin(0, 0.5);
      if (wt.width > w / 2 - 30 - left) wt.setScale((w / 2 - 30 - left) / wt.width);
      items.push(wt);
      items.push(medals(left + 200, -20, 380));
      const dt = this.add.text(left, 28, diff[1], { fontFamily: FONT, fontSize: '24px', color: diff[4] }).setOrigin(0, 0.5);
      items.push(dt);
      items.push(this.add.text(dt.x + dt.width + 14, 28, `último jogo: ${date}`, { fontFamily: BODY_FONT, fontSize: '19px', color: '#3c5368' }).setOrigin(0, 0.5));
      items.push(pillButton(this, -50, 104, done >= total ? 'REVER  ▶' : 'CONTINUAR  ▶', () => this.continue(n), 270, 0xffe066).setScale(1.05));
      items.push(pillButton(this, 205, 104, confirm ? 'APAGAR MESMO?' : 'APAGAR', () => this.erase(i), confirm ? 220 : 170, confirm ? 0xff6b5a : 0xe7eef2).setScale(0.9));
      return this.add.container(0, 0, items);
    }

    items.push(this.add.image(-120, -70, 'skull_avatar').setScale(0.22));
    items.push(this.add.text(-70, -92, where, { fontFamily: FONT, fontSize: '19px', color: '#10223a', wordWrap: { width: 220 } }).setOrigin(0, 0));
    items.push(medals(0, -22, 300));
    items.push(this.add.text(0, 12, diff[1], { fontFamily: FONT, fontSize: '20px', color: diff[4] }).setOrigin(0.5));
    items.push(this.add.text(0, 40, `último jogo: ${date}`, { fontFamily: BODY_FONT, fontSize: '15px', color: '#3c5368' }).setOrigin(0.5));
    items.push(pillButton(this, 0, 96, done >= total ? 'REVER  ▶' : 'CONTINUAR  ▶', () => this.continue(n), 250, 0xffe066));
    items.push(pillButton(this, 0, 160, confirm ? 'APAGAR MESMO?' : 'APAGAR', () => this.erase(i), confirm ? 250 : 170, confirm ? 0xff6b5a : 0xe7eef2).setScale(0.8));
    return this.add.container(0, 0, items);
  }

  /** Enter / A: continua o save ou, se vazio, começa no Padrão. */
  private primary(i: number): void {
    if (loadSlot(i + 1)) this.continue(i + 1);
    else this.start(i + 1, 'normal');
  }

  private continue(n: number): void {
    useSlot(n);
    this.scene.start('controls', { mode: 'story' });
  }

  private start(n: number, d: Difficulty): void {
    newSlot(n, d);
    this.scene.start('controls', { mode: 'story' });
  }

  /** Apagar pede confirmação (segundo toque). */
  private erase(i: number): void {
    if (!loadSlot(i + 1)) return;
    if (this.confirmDelete === i) {
      deleteSlot(i + 1);
      this.confirmDelete = -1;
    } else this.confirmDelete = i;
    this.sel = i;
    this.refresh();
  }

  private back(): void {
    this.scene.start('menu', { stage: 'modes' });
  }
}
