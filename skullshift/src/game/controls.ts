import Phaser from 'phaser';
import type { TouchPad } from './touch';

/** O que o personagem quer fazer neste quadro (vem do teclado, do controle, do toque ou da IA). */
export interface Intent {
  move: number; // -1..1
  jump: boolean; // apertou agora
  guard: boolean; // segurando defesa
  attack: boolean; // apertou agora
  pick: boolean; // apertou agora: pegar item do chão
  crouch: boolean; // segurando para baixo: agachar
  jumpHeld: boolean; // segurando pular (voo do morcego)
}

export const emptyIntent = (): Intent => ({ move: 0, jump: false, guard: false, attack: false, pick: false, crouch: false, jumpHeld: false });

export interface Controller {
  read(): Intent;
}

const KC = Phaser.Input.Keyboard.KeyCodes;

export interface KeyLayout {
  left: number[];
  right: number[];
  jump: number[];
  guard: number[];
  attack: number[];
  pick: number[];
  crouch: number[];
}

/** Dispositivos que um jogador pode escolher na tela de controles. */
export type DeviceId = 'kb-full' | 'kb-left' | 'kb-right' | 'pad0' | 'pad1' | 'touch';

export interface DeviceInfo {
  id: DeviceId;
  name: string;
  detail: string;
  kind: 'keyboard' | 'gamepad' | 'touch';
}

export const DEVICES: Record<DeviceId, DeviceInfo> = {
  'kb-full': { id: 'kb-full', name: 'Teclado', detail: 'WASD ou setas', kind: 'keyboard' },
  'kb-left': { id: 'kb-left', name: 'Teclado · Predefinição 1', detail: 'Lado esquerdo: WASD + F', kind: 'keyboard' },
  'kb-right': { id: 'kb-right', name: 'Teclado · Predefinição 2', detail: 'Lado direito: setas + Enter', kind: 'keyboard' },
  pad0: { id: 'pad0', name: 'Controle 1', detail: 'Xbox, PlayStation ou similar', kind: 'gamepad' },
  pad1: { id: 'pad1', name: 'Controle 2', detail: 'Xbox, PlayStation ou similar', kind: 'gamepad' },
  touch: { id: 'touch', name: 'Toque na tela', detail: 'Botões virtuais', kind: 'touch' },
};

export const KEY_LAYOUTS: Partial<Record<DeviceId, KeyLayout>> = {
  'kb-full': {
    left: [KC.A, KC.LEFT],
    right: [KC.D, KC.RIGHT],
    jump: [KC.W, KC.UP, KC.SPACE],
    guard: [KC.Q, KC.K],
    attack: [KC.F, KC.J],
    pick: [KC.E, KC.L],
    crouch: [KC.S, KC.DOWN],
  },
  'kb-left': {
    left: [KC.A],
    right: [KC.D],
    jump: [KC.W],
    guard: [KC.Q],
    attack: [KC.F, KC.G],
    pick: [KC.E],
    crouch: [KC.S],
  },
  'kb-right': {
    left: [KC.LEFT],
    right: [KC.RIGHT],
    jump: [KC.UP],
    guard: [KC.SHIFT, KC.FORWARD_SLASH, KC.NUMPAD_TWO],
    attack: [KC.ENTER, KC.NUMPAD_ZERO],
    pick: [KC.PERIOD, KC.NUMPAD_ONE],
    crouch: [KC.DOWN],
  },
};

/** Controles físicos conectados (o navegador só mostra depois de apertar um botão). */
export function connectedPads(scene: Phaser.Scene): Phaser.Input.Gamepad.Gamepad[] {
  const gp = scene.input.gamepad;
  if (!gp) return [];
  return gp.gamepads.filter((p) => p && p.connected);
}

export function padOrdinal(id: DeviceId): number | null {
  return id === 'pad0' ? 0 : id === 'pad1' ? 1 : null;
}

/** Lê um único dispositivo escolhido: teclado (predefinição), controle físico ou toque. */
export class PlayerController implements Controller {
  private keys?: Record<keyof KeyLayout, Phaser.Input.Keyboard.Key[]>;
  private padIndex: number | null;
  private prevPadJump = false;
  private prevPadAttack = false;
  private prevPadPick = false;

  constructor(
    private scene: Phaser.Scene,
    device: DeviceId,
    /** Botões de toque deste jogador (recriados quando a tela gira, por isso é uma função). */
    private touch?: () => TouchPad | undefined,
  ) {
    const layout = KEY_LAYOUTS[device];
    if (layout) {
      const kb = scene.input.keyboard!;
      const mk = (codes: number[]) => codes.map((c) => kb.addKey(c, true, false));
      this.keys = {
        left: mk(layout.left),
        right: mk(layout.right),
        jump: mk(layout.jump),
        guard: mk(layout.guard),
        attack: mk(layout.attack),
        pick: mk(layout.pick),
        crouch: mk(layout.crouch),
      };
    }
    this.padIndex = padOrdinal(device);
  }

  read(): Intent {
    let move = 0;
    let jump = false;
    let attack = false;
    let guard = false;
    let pick = false;
    let crouch = false;
    let jumpHeld = false;

    if (this.keys) {
      const down = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
      const just = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => Phaser.Input.Keyboard.JustDown(k));
      move = (down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0);
      jump = just(this.keys.jump);
      attack = just(this.keys.attack);
      guard = down(this.keys.guard);
      pick = just(this.keys.pick);
      crouch = down(this.keys.crouch);
      jumpHeld = down(this.keys.jump);
    }

    const pad = this.padIndex === null ? undefined : connectedPads(this.scene)[this.padIndex];
    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const b = (i: number) => (pad.buttons[i] ? pad.buttons[i].pressed : false);
      if (b(14) || ax < -0.4) move = -1;
      else if (b(15) || ax > 0.4) move = 1;
      const padJump = b(0) || b(12);
      const padAttack = b(2);
      const padPick = b(3);
      if (padPick && !this.prevPadPick) pick = true;
      this.prevPadPick = padPick;
      if (padJump && !this.prevPadJump) jump = true;
      if (padJump) jumpHeld = true;
      if (padAttack && !this.prevPadAttack) attack = true;
      this.prevPadJump = padJump;
      this.prevPadAttack = padAttack;
      if (b(1) || b(4) || b(5) || b(6) || b(7)) guard = true;
      if (b(13) || ay > 0.6) crouch = true;
    }

    const tp = this.touch?.();
    if (tp) {
      const t = tp.read();
      move = (t.right ? 1 : 0) - (t.left ? 1 : 0);
      jump = t.jumpPressed;
      attack = t.attackPressed;
      guard = t.guard;
      pick = t.pickPressed;
      crouch = t.crouch;
      jumpHeld = t.jumpHeld;
    }
    return { move, jump, guard, attack, pick, crouch, jumpHeld };
  }
}

/** Nome curto do botão de pegar, para o aviso sobre o item. */
export const PICK_LABEL: Record<DeviceId, string> = {
  'kb-full': 'E',
  'kb-left': 'E',
  'kb-right': '.',
  pad0: 'Y',
  pad1: 'Y',
  touch: 'PEGA',
};

/** Nome curto do botão de defesa, para a tela Como jogar. */
export const GUARD_LABEL: Record<DeviceId, string> = {
  'kb-full': 'Q',
  'kb-left': 'Q',
  'kb-right': 'Shift',
  pad0: 'B',
  pad1: 'B',
  touch: 'DEF',
};
