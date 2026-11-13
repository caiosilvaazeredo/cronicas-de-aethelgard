import Phaser from 'phaser';
import { AREAS } from '../game/areas';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { CHAPTERS } from '../data/lore';
import { SLOT_COUNT, deleteSlot, loadSlot, newSlot, useSlot, type Difficulty } from '../game/progress';
import { backdrop } from '../ui/backdrop';
import { panel, pillButton } from '../ui/devices';

const INK = 0x1d1a2b;

/**
 * Escolha do save do modo história: 3 slots. Cada um mostra até onde chegou, a dificuldade
 * e a data do último jogo; CONTINUAR ou APAGAR. Slot vazio: NOVO JOGO em Normal ou Difícil.
 */
const CARD_W = 370;
const CARD_H = 400;
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
    pillButton(this, P ? W / 2 : 160, P ? HH - 150 : 668, '◀  VOLTAR', () => this.back(), 230).setScale(P ? 1.6 : 1);
    this.add
      .text(W / 2, P ? HH - 270 : 612, '◀ ▶ escolher  ·  Enter / A: jogar  ·  Delete / X: apagar  ·  Esc / B: voltar', {
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
    const top = 250;
    const bottom = HH - 330;
    const sc = Math.min(1.7, (bottom - top) / (SLOT_COUNT * (CARD_H + 30)), (W - 60) / (CARD_W + 20));
    for (let i = 0; i < SLOT_COUNT; i++) {
      const c = this.card(i);
      if (P) c.setPosition(W / 2, top + (CARD_H + 30) * sc * (i + 0.5)).setScale(sc);
      else c.setPosition(W / 2 + (i - 1) * 400, 330);
      this.cards.push(c);
    }
  }

  private card(i: number): Phaser.GameObjects.Container {
    const n = i + 1;
    const data = loadSlot(n);
    const on = i === this.sel;
    const items: Phaser.GameObjects.GameObject[] = [];
    const w = CARD_W;
    const h = CARD_H;
    if (on) {
      const glow = this.add.graphics();
      glow.fillStyle(0xffe066, 1).fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 26);
      items.push(glow);
    }
    items.push(panel(this, 0, 0, w, h));
    items.push(this.add.text(0, -h / 2 + 36, `SAVE ${n}`, { fontFamily: FONT, fontSize: '34px', color: '#10223a' }).setOrigin(0.5));
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.sel !== i) {
        this.sel = i;
        this.confirmDelete = -1;
        this.refresh();
      }
    });
    items.push(hit);

    if (!data) {
      items.push(this.add.text(0, -118, 'VAZIO', { fontFamily: FONT, fontSize: '28px', color: '#8a95a3' }).setOrigin(0.5));
      items.push(this.add.text(0, -84, 'Novo jogo — escolha a dificuldade:', { fontFamily: BODY_FONT, fontSize: '17px', color: '#3c5368' }).setOrigin(0.5));
      // Um botão por dificuldade, com a regra embaixo (espaço de sobra entre eles).
      DIFFS.forEach(([d, label, note, color], k) => {
        const y = -40 + k * 80;
        items.push(pillButton(this, 0, y, label, () => this.start(n, d), 240, color).setScale(0.85));
        items.push(this.add.text(0, y + 34, note, { fontFamily: BODY_FONT, fontSize: '14px', color: '#3c5368' }).setOrigin(0.5));
      });
      return this.add.container(0, 0, items);
    }

    const done = data.completed;
    const total = CHAPTERS.length;
    const frags = AREAS.filter((a) => a.levels.length > 0 && a.levels.every((id) => (data.done ?? []).includes(id))).length;
    const where = done >= total ? 'HISTÓRIA COMPLETA' : `${done} FASES · ${frags}/${AREAS.length} FRAGMENTOS`;
    items.push(this.add.image(-120, -70, 'skull_avatar').setScale(0.22));
    items.push(
      this.add.text(-70, -92, where, { fontFamily: FONT, fontSize: '19px', color: '#10223a', wordWrap: { width: 220 } }).setOrigin(0, 0),
    );
    // Medalhões das fases (como no mapa).
    const g = this.add.graphics();
    for (let k = 0; k < total; k++) {
      const x = -60 + k * 40;
      g.fillStyle(INK).fillCircle(x, -26, 15);
      g.fillStyle(k < done ? 0xd8a530 : 0x8a95a3).fillCircle(x, -26, 12);
      g.fillStyle(k < done ? 0x58b947 : 0x5f6872).fillCircle(x, -26, 6);
    }
    items.push(g);
    const diff = DIFFS.find(([d]) => d === data.difficulty) ?? DIFFS[1];
    items.push(this.add.text(0, 12, diff[1], { fontFamily: FONT, fontSize: '20px', color: diff[4] }).setOrigin(0.5));
    const date = data.updated ? new Date(data.updated).toLocaleDateString('pt-BR') : '—';
    items.push(this.add.text(0, 40, `último jogo: ${date}`, { fontFamily: BODY_FONT, fontSize: '15px', color: '#3c5368' }).setOrigin(0.5));
    items.push(pillButton(this, 0, 96, done >= total ? 'REVER  ▶' : 'CONTINUAR  ▶', () => this.continue(n), 250, 0xffe066));
    const confirm = this.confirmDelete === i;
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
