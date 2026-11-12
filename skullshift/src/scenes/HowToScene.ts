import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { DEVICES, type DeviceId } from '../game/controls';
import { backdrop } from '../ui/backdrop';
import { PLAYER_TINT, gamepadArt, gestureArt, keycap, panel, phoneArt, pillButton, playerBadge } from '../ui/devices';

type Mode = 'story' | 'versus';

const CAPTION = { fontFamily: BODY_FONT, fontSize: '17px', color: '#10223a' };

/** Tela "Como jogar": mostra o mapa de botões do dispositivo escolhido por cada jogador. */
export class HowToScene extends Phaser.Scene {
  private mode: Mode = 'story';
  private devices: DeviceId[] = [];
  private prevPad = { a: false, b: false };

  constructor() {
    super('howto');
  }

  lastData?: { mode: Mode; devices: DeviceId[]; level?: number };
  private level = 0;

  init(data: { mode: Mode; devices: DeviceId[]; level?: number }): void {
    this.lastData = data;
    this.level = data.level ?? 0;
    this.mode = data.mode;
    this.devices = data.devices;
    // Evita que o botão "confirmar" da tela anterior pule esta tela.
    this.prevPad = { a: true, b: true };
  }

  create(): void {
    backdrop(this, 'COMO JOGAR');
    const n = this.devices.length;
    const P = VIEW.portrait;
    const HH = this.scale.height;
    this.devices.forEach((d, i) => {
      // Monta em coordenadas locais e posiciona/escala (lado a lado deitado, empilhado em pé).
      const before = this.children.list.length;
      this.playerPanel(0, 0, i, d);
      const made = this.children.list.slice(before);
      const px = P ? W / 2 : n === 1 ? W / 2 : i === 0 ? W / 2 - 300 : W / 2 + 300;
      const k = HH / 2770;
      const py = P ? (n === 1 ? 760 : 560 + i * 700) * k : 268;
      this.add.container(px, py, made).setScale(P ? (n === 1 ? 2.3 : 2.1) * Math.min(1, k * 1.1) : 1);
    });
    this.rules(P ? (n === 1 ? 1640 : 2080) * (HH / 2770) : 518);

    if (P) {
      pillButton(this, W / 2 - 290, HH - 150, '◀  VOLTAR', () => this.back(), 230).setScale(1.6);
      pillButton(this, W / 2 + 270, HH - 150, 'JOGAR  ▶', () => this.play(), 250, 0xffe066).setScale(1.6);
    } else {
      pillButton(this, 160, 668, '◀  VOLTAR', () => this.back(), 230);
      pillButton(this, W - 170, 668, 'JOGAR  ▶', () => this.play(), 250, 0xffe066);
    }

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.play());
    kb.on('keydown-SPACE', () => this.play());
    kb.on('keydown-ESC', () => this.back());
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const a = !!pad.buttons[0]?.pressed || !!pad.buttons[9]?.pressed;
    const b = !!pad.buttons[1]?.pressed;
    if (a && !this.prevPad.a) this.play();
    if (b && !this.prevPad.b) this.back();
    this.prevPad = { a, b };
  }

  private playerPanel(cx: number, cy: number, i: number, d: DeviceId): void {
    panel(this, cx, cy, 520, 300);
    playerBadge(this, cx - 222, cy - 112, i + 1);
    this.add
      .text(cx - 186, cy - 112, DEVICES[d].name, { ...CAPTION, fontSize: '20px' })
      .setOrigin(0, 0.5);
    const kind = DEVICES[d].kind;
    if (kind === 'keyboard') {
      if (this.textures.exists('keyboard_sil')) this.keyboardMap(cx, cy + 20, d, i);
      else this.keyMap(cx, cy + 20, d);
    }
    else if (kind === 'gamepad') this.padMap(cx, cy + 10, i);
    else if (kind === 'gesture') this.gestureMap(cx, cy + 10);
    else this.touchMap(cx, cy + 10);
  }

  /** Teclas em formato de cruz + tecla de ataque, com legendas e setas. */
  /**
   * Silhueta do teclado na cor do jogador: as teclas usadas acendem na cor da ação
   * (retângulos atrás dos furos) e linhas ligam cada ação à legenda.
   */
  private keyboardMap(cx: number, cy: number, d: DeviceId, i: number): void {
    // Teclas da silhueta (x, y, largura) no viewBox 280x120.
    const K: Record<string, [number, number, number]> = {
      Q: [41, 55, 11], W: [55, 55, 11], E: [69, 55, 11],
      A: [44, 69, 11], S: [58, 69, 11], D: [72, 69, 11], F: [86, 69, 11],
      J: [128, 69, 11], K: [142, 69, 11], L: [156, 69, 11], ENTER: [184, 69, 28],
      UP: [233, 69, 12], LEFT: [218, 83, 12], DOWN: [233, 83, 12], RIGHT: [248, 83, 12], SPACE: [73, 83, 86],
    };
    type Row = [string, number, string, string[]];
    const C = { move: 0x8e9aa6, jump: 0x4caf50, crouch: 0x9b6bf0, guard: 0x1ec8c8, atk: 0xff8c1a, pick: 0xd8a530 };
    const rows: Row[] =
      d === 'kb-left'
        ? [['Mover', C.move, 'A  D', ['A', 'D']], ['Pular', C.jump, 'W', ['W']], ['Agachar', C.crouch, 'S', ['S']],
           ['Defender', C.guard, 'Q', ['Q']], ['Atacar', C.atk, 'F', ['F']], ['Pegar item', C.pick, 'E', ['E']]]
        : d === 'kb-right'
          ? [['Mover', C.move, '←  →', ['LEFT', 'RIGHT']], ['Pular', C.jump, '↑', ['UP']], ['Agachar', C.crouch, '↓', ['DOWN']],
             ['Defender', C.guard, 'Shift', []], ['Atacar', C.atk, 'Enter', ['ENTER']], ['Pegar item', C.pick, '.', []]]
          : [['Mover', C.move, 'AD ←→', ['A', 'D', 'LEFT', 'RIGHT']], ['Pular', C.jump, 'W ↑ Esp', ['W', 'UP', 'SPACE']],
             ['Agachar', C.crouch, 'S  ↓', ['S', 'DOWN']], ['Defender', C.guard, 'Q  K', ['Q', 'K']],
             ['Atacar', C.atk, 'F  J', ['F', 'J']], ['Pegar item', C.pick, 'E  L', ['E', 'L']]];

    const k = 1.62;
    const px = cx;
    const py = cy - 44;
    const at = (x: number, y: number): [number, number] => [px + (x - 140) * k, py + (y - 60) * k];
    for (const [, color, , keys] of rows) {
      for (const key of keys) {
        const [x, y, w] = K[key];
        const [rx, ry] = at(x - 0.5, y - 0.5);
        this.add.rectangle(rx, ry, (w + 1) * k, 12 * k, color).setOrigin(0);
      }
    }
    this.add.image(px, py, 'keyboard_sil').setDisplaySize(280 * k, 120 * k).setTint(0x1d1a2b);

    // Legenda em 3 colunas: etiqueta na cor da tecla acesa + ação.
    rows.forEach(([label, color, chip], n) => {
      const x = cx - 245 + (n % 3) * 166;
      const y = cy + 50 + Math.floor(n / 3) * 36;
      const probe = this.add.text(0, 0, chip, { fontFamily: FONT, fontSize: '13px' });
      const cw = Math.max(28, probe.width + 14);
      probe.destroy();
      this.add.rectangle(x + cw / 2, y, cw, 24, color).setStrokeStyle(2, 0x1d1a2b);
      this.add.text(x + cw / 2, y, chip, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(x + cw + 7, y, label, { ...CAPTION, fontSize: '15px' }).setOrigin(0, 0.5);
    });
  }

  /** Teclas na posição real do teclado, com legendas e setas. */
  private keyMap(cx: number, cy: number, d: DeviceId): void {
    const right = d === 'kb-right';
    const ox = cx - 40;
    const RED = 0xd9534f;
    const GOLD = 0xd8a530;
    const BLUE = 0x4a7fc1;
    // [x, y, rótulo, largura, cor]
    const keys: Array<[number, number, string, number, number?]> = right
      ? [
          [ox - 78, cy - 30, 'Shift', 70, BLUE],
          [ox, cy - 30, '↑', 50],
          [ox + 58, cy - 30, '.', 50, GOLD],
          [ox - 58, cy + 28, '←', 50],
          [ox, cy + 28, '↓', 50],
          [ox + 58, cy + 28, '→', 50],
          [ox + 138, cy + 28, 'Enter', 84, RED],
        ]
      : [
          [ox - 58, cy - 30, 'Q', 50, BLUE],
          [ox, cy - 30, 'W', 50],
          [ox + 58, cy - 30, 'E', 50, GOLD],
          [ox - 58, cy + 28, 'A', 50],
          [ox, cy + 28, 'S', 50],
          [ox + 58, cy + 28, 'D', 50],
          [ox + 116, cy + 28, 'F', 50, RED],
        ];
    for (const [x, y, t, w, c] of keys) keycap(this, x, y, t, w, 50, c);
    const atkX = right ? ox + 138 : ox + 116;
    const atkW = right ? 84 : 50;

    const g = this.add.graphics().lineStyle(3, 0xe67e22, 1);
    const label = (x: number, y: number, text: string, ax: number, ay: number, origin = 0.5) => {
      const t = this.add.text(x, y, text, CAPTION).setOrigin(origin, 0.5);
      const lx = origin === 0 ? x - 4 : origin === 1 ? x + 4 : x;
      const ly = origin === 0.5 ? y + (ay > y ? 12 : -12) : y;
      g.lineBetween(lx, ly, ax, ay);
      return t;
    };
    label(right ? ox + 6 : ox, cy - 104, 'Pular', ox, cy - 58);
    if (right) label(ox - 92, cy - 82, 'Defender', ox - 86, cy - 58);
    else label(ox - 100, cy - 70, 'Defender', ox - 62, cy - 52, 1);
    label(ox + 104, cy - 70, 'Pegar', ox + 76, cy - 52, 0);
    label(ox - 100, cy + 28, 'Mover', ox - 86, cy + 28, 1);
    label(ox, cy + 98, 'Agachar', ox, cy + 58);
    label(atkX + atkW / 2 + 14, cy + 28, 'Atacar', atkX + atkW / 2 + 4, cy + 28, 0);
    if (d === 'kb-full') {
      this.add
        .text(cx + 120, cy + 98, 'Também: setas, Espaço,\nJ (atacar), K (defender), L (pegar)', {
          fontFamily: BODY_FONT,
          fontSize: '12px',
          color: '#3c5368',
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  /**
   * Silhueta do controle na cor do jogador. Os furos dos botões mostram as cores A/B/X/Y
   * (círculos desenhados atrás) e linhas ligam cada comando à sua legenda.
   */
  private padMap(cx: number, cy: number, i: number): void {
    const k = 1.25; // 240x160 (viewBox do SVG) -> 300x200
    const px = cx - 105;
    const py = cy + 8;
    const at = (x: number, y: number): [number, number] => [px + (x - 120) * k, py + (y - 80) * k];

    // Cores que aparecem pelos furos.
    const holes: Array<[number, number, number, number]> = [
      [174, 67, 5.2, 0x4caf50], // A
      [185, 56, 5.2, 0xe5533d], // B
      [163, 56, 5.2, 0x3f7fd9], // X
      [174, 45, 5.2, 0xf2c230], // Y
      [66, 56, 13, 0x1d1a2b], // analógico esquerdo
      [150, 82, 13, 0x1d1a2b], // analógico direito
      [88, 82, 9, 0x1d1a2b], // direcional
      [120, 40, 8.5, 0x1d1a2b], // botão central
    ];
    for (const [x, y, r, c] of holes) {
      const [hx, hy] = at(x, y);
      this.add.circle(hx, hy, r * k, c);
    }
    if (this.textures.exists('xbox')) {
      this.add.image(px, py, 'xbox').setDisplaySize(240 * k, 160 * k).setTint(PLAYER_TINT[i]);
    } else {
      gamepadArt(this, px, py, PLAYER_TINT[i]).setScale(0.85);
    }

    // Legendas à direita, com linha até o botão.
    const g = this.add.graphics().lineStyle(2.5, 0xe67e22, 1);
    const lx = cx + 92;
    const rows: Array<[[number, number], number, string, string]> = [
      [[174, 45], 0xf2c230, 'Y', 'Pegar item'],
      [[185, 56], 0xe5533d, 'B', 'Defender'],
      [[163, 56], 0x3f7fd9, 'X', 'Atacar'],
      [[174, 67], 0x4caf50, 'A', 'Pular'],
      [[66, 56], 0x5a6472, '◉', 'Mover'],
      [[88, 92], 0x5a6472, '▼', 'Agachar (baixo)'],
    ];
    rows.forEach(([[bx, by], c, glyph, text], n) => {
      const y = cy - 86 + n * 33;
      const [ax, ay] = at(bx, by);
      g.lineBetween(ax, ay, lx - 16, y);
      g.fillStyle(0xe67e22).fillCircle(ax, ay, 2.5);
      this.add.circle(lx, y, 13, c).setStrokeStyle(3, 0x1d1a2b);
      this.add.text(lx, y, glyph, { fontFamily: FONT, fontSize: '13px', color: '#fff' }).setOrigin(0.5);
      this.add.text(lx + 20, y, text, { ...CAPTION, fontSize: '16px' }).setOrigin(0, 0.5);
    });
    this.add
      .text(px, cy + 118, 'LB / RB também defendem', { fontFamily: BODY_FONT, fontSize: '13px', color: '#3c5368' })
      .setOrigin(0.5);
  }

  /** Gestos: arrastar, deslizar, tocar, segurar; mouse: esquerdo, direito, meio. */
  private gestureMap(cx: number, cy: number): void {
    gestureArt(this, cx - 150, cy - 10).setScale(0.62);
    const rows: Array<[string, string]> = [
      ['↔', 'Arrastar: andar (longe: pique)'],
      ['↑', 'Deslizar p/ cima: pular'],
      ['↓', 'Arrastar p/ baixo: agachar'],
      ['•', 'Toque/clique rápido: atacar'],
      ['⏱', 'Segurar parado: pegar'],
      ['✌', '2 dedos ou botão dir.: defender'],
    ];
    rows.forEach(([glyph, text], k) => {
      const y = cy - 92 + k * 32;
      const x = cx - 10;
      this.add.circle(x, y, 15, 0x10223a, 0.85).setStrokeStyle(3, 0xfff7dc);
      this.add.text(x, y, glyph, { fontFamily: BODY_FONT, fontSize: '15px', color: '#fff7dc' }).setOrigin(0.5);
      this.add.text(x + 26, y, text, { ...CAPTION, fontSize: '15px' }).setOrigin(0, 0.5);
    });
    this.add
      .text(cx, cy + 112, 'Funciona com o dedo na tela ou só com o mouse (meio também pega).', {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: '#3c5368',
      })
      .setOrigin(0.5);
  }

  private touchMap(cx: number, cy: number): void {
    phoneArt(this, cx - 100, cy).setScale(0.85);
    const rows: Array<[string, string]> = [
      ['◀ ▶', 'Mover'],
      ['PULA', 'Pular'],
      ['DEF', 'Defender'],
      ['ATQ', 'Atacar'],
      ['PEGA', 'Pegar item'],
      ['▼', 'Agachar'],
    ];
    rows.forEach(([glyph, text], k) => {
      const y = cy - 84 + k * 32;
      const x = cx + 90;
      this.add.circle(x, y, 16, 0x10223a, 0.85).setStrokeStyle(3, 0xfff7dc);
      this.add.text(x, y, glyph, { fontFamily: FONT, fontSize: '11px', color: '#fff7dc' }).setOrigin(0.5);
      this.add.text(x + 30, y, text, { ...CAPTION, fontSize: '16px' }).setOrigin(0, 0.5);
    });
    this.add
      .text(cx, cy + 112, 'Celular deitado ou em pé. Dá para usar vários dedos ao mesmo tempo.', {
        fontFamily: BODY_FONT,
        fontSize: '14px',
        color: '#3c5368',
      })
      .setOrigin(0.5);
  }

  /** Regras em grade: 3 colunas deitado, 2 colunas em pé. */
  private rules(y: number): void {
    const P = VIEW.portrait;
    const cols = P ? 2 : 3;
    const tips: Array<[string, string]> = [
      ['skull_avatar', 'Um golpe mata.\nVocê também!'],
      ['shield', 'Segure para TRÁS: defesa.\nColado no rival, o golpe\nQUEBRA a defesa.'],
      ['crouch', 'Agachado: desvia de tiros\ne dá golpe baixo.'],
      ['double', 'Aperte pular no ar:\npulo duplo.'],
      ['items', 'Item de outro personagem\nno chão: PEGAR transforma.'],
      ['goal', this.mode === 'story' ? '5 cenários: chegue ao\nfim do lado oposto.' : 'Matou? Ganhou a vez.\nChegue ao seu fim!'],
    ];
    const rows = Math.ceil(tips.length / cols);
    const w = P ? 1180 : 1080;
    const cellH = P ? 170 : 74;
    const h = rows * cellH + (P ? 40 : 14);
    const g = this.add.graphics();
    g.fillStyle(0x10223a, 0.88).fillRoundedRect(W / 2 - w / 2, y - h / 2, w, h, 18);
    tips.forEach(([icon, text], k) => {
      const before = this.children.list.length;
      if (icon === 'items') {
        this.add.image(2, -16, 'bone', 0).setScale(0.6);
        this.add.image(22, -2, 'harpoon').setScale(0.5).setAngle(45);
        this.add.image(12, 16, 'spear_item').setScale(0.6);
        this.add.image(-14, 4, 'crest_item').setScale(0.45);
      } else if (icon === 'goal') {
        this.add.image(18, 26, 'skull_spike').setOrigin(0.5, 1).setScale(0.55);
      } else if (icon === 'shield') {
        this.add.image(18, 0, 'shield').setScale(1.4);
      } else if (icon === 'crouch') {
        this.add.sprite(18, -6, 'skull_idle', 0).setScale(0.55, 0.36);
      } else if (icon === 'double') {
        this.add.text(18, 0, '▲\n▲', { fontFamily: FONT, fontSize: '16px', color: '#ffe066', align: 'center', lineSpacing: -6 }).setOrigin(0.5);
      } else {
        this.add.image(18, 0, icon).setScale(0.26);
      }
      this.add
        .text(46, 0, text, { fontFamily: BODY_FONT, fontSize: '13px', color: '#fff7dc', lineSpacing: 2 })
        .setOrigin(0, 0.5);
      const made = this.children.list.slice(before);
      const cx = W / 2 - w / 2 + (P ? 40 : 30) + (k % cols) * (w / cols);
      const cy = y - h / 2 + (P ? 20 : 7) + cellH / 2 + Math.floor(k / cols) * cellH;
      this.add.container(cx, cy, made).setScale(P ? 1.85 : 1);
    });
  }

  private play(): void {
    // História: mapa de fases (com a visual novel antes de cada uma). Versus: direto para a partida.
    if (this.mode === 'story') this.scene.start('map', { devices: this.devices });
    else this.scene.start('game', { mode: this.mode, devices: this.devices, level: this.level });
  }

  private back(): void {
    this.scene.start('controls', { mode: this.mode, devices: this.devices, level: this.level });
  }
}
