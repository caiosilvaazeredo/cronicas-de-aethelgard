import Phaser from 'phaser';
import { settings } from './settings';
import { DEPTH, FONT, VIEW, W, portraitPanelTop } from '../config';

type ButtonId = 'left' | 'right' | 'crouch' | 'jump' | 'guard' | 'attack' | 'pick' | 'stick';

interface Button {
  id: ButtonId;
  x: number;
  y: number;
  r: number;
  bg: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  down: boolean;
}

export interface TouchState {
  left: boolean;
  right: boolean;
  guard: boolean;
  crouch: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  attackHeld: boolean;
  pickPressed: boolean;
  jumpHeld: boolean;
  /** Manche de voo puxado para cima. */
  up: boolean;
}

type Spec = [ButtonId, number, number, number, string];

const LABELS: Record<ButtonId, string> = {
  left: '◀',
  right: '▶',
  crouch: '▼',
  guard: 'DEF',
  jump: 'PULA',
  attack: 'ATQ',
  pick: 'PEGA',
  stick: '',
};

/** Fases de voo: manche analógico à esquerda e botão de TIRO à direita. */
const FLIGHT_LANDSCAPE: Spec[] = [
  ['stick', 190, 540, 110, ''],
  ['attack', 1110, 560, 90, ''],
];
const FLIGHT_PORTRAIT: Spec[] = [
  ['stick', 0.27, 0.5, 0.17, ''],
  ['attack', 0.76, 0.5, 0.14, ''],
];

/** Deitado: posições absolutas no canvas 1280x720. */
const LANDSCAPE_FULL: Spec[] = [
  ['left', 80, 590, 56, ''],
  ['right', 240, 590, 56, ''],
  ['crouch', 160, 672, 40, ''],
  ['guard', 1000, 640, 50, ''],
  ['jump', 1110, 530, 54, ''],
  ['attack', 1190, 650, 64, ''],
  ['pick', 880, 650, 46, ''],
];
const LANDSCAPE_HALF: Spec[] = [
  ['left', 58, 610, 46, ''],
  ['right', 178, 610, 46, ''],
  ['crouch', 118, 682, 32, ''],
  ['guard', 58, 500, 40, ''],
  ['jump', 178, 500, 40, ''],
  ['attack', 294, 600, 54, ''],
  ['pick', 294, 484, 40, ''],
];

/** Em pé: frações da área do painel (x da largura, y da altura; raio da largura). */
const PORTRAIT_FULL: Spec[] = [
  ['left', 0.13, 0.42, 0.1, ''],
  ['right', 0.37, 0.42, 0.1, ''],
  ['crouch', 0.25, 0.76, 0.085, ''],
  ['pick', 0.62, 0.26, 0.07, ''],
  ['guard', 0.62, 0.66, 0.08, ''],
  ['jump', 0.84, 0.28, 0.09, ''],
  ['attack', 0.85, 0.66, 0.11, ''],
];
/** Em pé, versus: cada jogador usa metade da largura (P2 espelhado). */
const PORTRAIT_HALF: Spec[] = [
  ['left', 0.09, 0.6, 0.065, ''],
  ['right', 0.25, 0.6, 0.065, ''],
  ['crouch', 0.17, 0.84, 0.055, ''],
  ['guard', 0.1, 0.33, 0.055, ''],
  ['jump', 0.25, 0.33, 0.055, ''],
  ['attack', 0.4, 0.52, 0.075, ''],
  ['pick', 0.4, 0.18, 0.05, ''],
];

/**
 * Controle virtual na tela (multitoque), fixo na tela.
 * side: 'full' (1 jogador) ou 'left'/'right' (versus: uma metade para cada jogador).
 */
export class TouchPad {
  private buttons: Button[] = [];
  private prevJump = false;
  private prevAttack = false;
  private prevPick = false;
  visible = true;

  /**
   * area: faixa da tela onde ficam os botões (padrão: o painel de baixo, em pé).
   * flip: gira tudo 180° (o P2 sentado do outro lado da mesa, no modo dividido).
   */
  constructor(
    private scene: Phaser.Scene,
    side: 'full' | 'left' | 'right',
    tint = 0xfff7dc,
    area?: { top: number; h: number },
    flip = false,
    flight = false,
  ) {
    const specs: Array<[ButtonId, number, number, number]> = [];
    if (flight) {
      // Voo: só o manche e o tiro (1 jogador).
      if (VIEW.portrait) {
        const top = area?.top ?? portraitPanelTop();
        const h = area?.h ?? VIEW.h - top;
        for (const [id, u, v, r] of FLIGHT_PORTRAIT) specs.push([id, u * W, top + v * h, r * W]);
      } else for (const [id, x, y, r] of FLIGHT_LANDSCAPE) specs.push([id, x, y, r]);
    } else if (VIEW.portrait) {
      const top = area?.top ?? portraitPanelTop();
      const h = area?.h ?? VIEW.h - top;
      for (const [id, u, v, r] of side === 'full' ? PORTRAIT_FULL : PORTRAIT_HALF) {
        const x = side === 'right' ? W - u * W : u * W;
        specs.push([id, x, top + v * h, r * W]);
      }
      // Divisória entre os dois jogadores.
      if (side === 'left') {
        scene.add.rectangle(W / 2, top + h / 2, 6, h * 0.8, 0xfff7dc, 0.25).setDepth(DEPTH.hud + 4);
      }
    } else {
      for (const [id, x0, y, r] of side === 'full' ? LANDSCAPE_FULL : LANDSCAPE_HALF) {
        specs.push([id, side === 'right' ? W - x0 : x0, y, r]);
      }
    }
    // No lado espelhado (P2), as setas não podem ficar invertidas: ◀ sempre à esquerda de ▶.
    if (side === 'right') {
      const l = specs.find((b) => b[0] === 'left')!;
      const r = specs.find((b) => b[0] === 'right')!;
      [l[1], r[1]] = [r[1], l[1]];
    }
    if (flip) {
      // Gira 180° em torno do centro da tela: o layout fica de frente para quem está do outro lado.
      for (const sp of specs) {
        sp[1] = W - sp[1];
        sp[2] = VIEW.h - sp[2];
      }
    }
    const st = settings();
    const op = st.touchOpacity / 10;
    const size = [0.82, 1, 1.15][st.touchSize] ?? 1;
    for (const [id, x, y, r0] of specs) {
      const r = r0 * size;
      const text = flight && id === 'attack' ? 'TIRO' : LABELS[id];
      const bg = scene.add
        .circle(x, y, r, 0x10223a, 0.42 * op)
        .setStrokeStyle(Math.max(4, r * 0.07), tint, 0.8 * op)
        .setDepth(DEPTH.hud + 5);
      const label = scene.add
        .text(x, y, text, {
          fontFamily: FONT,
          fontSize: text.length > 1 ? `${Math.round(r * 0.42)}px` : `${Math.round(r * 0.8)}px`,
          color: '#fff7dc',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud + 6)
        .setAlpha(Math.max(0.35, op))
        .setRotation(flip ? Math.PI : 0);
      this.buttons.push({ id, x, y, r, bg, label, down: false });
      if (id === 'stick') {
        // Bolinha do manche (segue o dedo) e marcas das 4 direções.
        this.knob = scene.add.circle(x, y, r * 0.42, tint, 0.55 * op).setStrokeStyle(4, 0x10223a, 0.8).setDepth(DEPTH.hud + 6);
        for (const [dx, dy, t] of [[0, -1, '▲'], [0, 1, '▼'], [-1, 0, '◀'], [1, 0, '▶']] as const) {
          scene.add
            .text(x + dx * r * 0.72, y + dy * r * 0.72, t, { fontFamily: FONT, fontSize: `${Math.round(r * 0.24)}px`, color: '#fff7dc' })
            .setOrigin(0.5)
            .setAlpha(0.6 * op)
            .setDepth(DEPTH.hud + 6);
        }
      }
    }
  }

  private knob?: Phaser.GameObjects.Arc;
  private stickDir = { x: 0, y: 0 };

  setVisible(v: boolean): void {
    this.visible = v;
    for (const b of this.buttons) {
      b.bg.setVisible(v);
      b.label.setVisible(v);
    }
    this.knob?.setVisible(v);
  }

  /** Lê todos os dedos na tela e devolve o estado dos botões. */
  read(): TouchState {
    for (const b of this.buttons) b.down = false;
    this.stickDir = { x: 0, y: 0 };
    if (this.visible) {
      for (const p of this.scene.input.manager.pointers) {
        if (!p || !p.isDown) continue;
        for (const b of this.buttons) {
          if (b.id === 'stick') {
            // Manche: a posição do dedo em relação ao centro dá a direção (8 direções).
            const dx = p.x - b.x;
            const dy = p.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d > b.r * 1.7) continue;
            b.down = true;
            const k = Math.min(1, d / (b.r * 0.6));
            this.stickDir = { x: d ? (dx / d) * k : 0, y: d ? (dy / d) * k : 0 };
            continue;
          }
          // Área de toque um pouco maior que o desenho.
          if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * 1.25) b.down = true;
        }
      }
    }
    const stick = this.buttons.find((b) => b.id === 'stick');
    if (stick && this.knob) this.knob.setPosition(stick.x + this.stickDir.x * stick.r * 0.6, stick.y + this.stickDir.y * stick.r * 0.6);
    const sx = this.stickDir.x;
    const sy = this.stickDir.y;
    for (const b of this.buttons) {
      b.bg.setFillStyle(b.down ? 0xfff7dc : 0x10223a, b.down ? 0.55 : 0.42);
    }
    const get = (id: ButtonId) => this.buttons.some((b) => b.id === id && b.down);
    const jump = get('jump');
    const attack = get('attack');
    const pick = get('pick');
    const st: TouchState = {
      left: get('left') || sx < -0.35,
      right: get('right') || sx > 0.35,
      guard: get('guard'),
      crouch: get('crouch') || sy > 0.35,
      up: sy < -0.35,
      jumpPressed: jump && !this.prevJump,
      attackPressed: attack && !this.prevAttack,
      attackHeld: attack,
      pickPressed: pick && !this.prevPick,
      jumpHeld: jump,
    };
    this.prevJump = jump;
    this.prevAttack = attack;
    this.prevPick = pick;
    return st;
  }
}
