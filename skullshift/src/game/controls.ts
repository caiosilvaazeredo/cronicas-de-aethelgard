import Phaser from 'phaser';

/** O que o personagem quer fazer neste quadro (vem do teclado, do controle ou da IA). */
export interface Intent {
  move: number; // -1..1
  jump: boolean; // apertou agora
  guard: boolean; // segurando defesa
  attack: boolean; // apertou agora
}

export const emptyIntent = (): Intent => ({ move: 0, jump: false, guard: false, attack: false });

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
}

export const LAYOUT_STORY: KeyLayout = {
  left: [KC.A, KC.LEFT],
  right: [KC.D, KC.RIGHT],
  jump: [KC.W, KC.UP, KC.SPACE],
  guard: [KC.S, KC.DOWN],
  attack: [KC.F, KC.J, KC.K],
};

export const LAYOUT_P1: KeyLayout = {
  left: [KC.A],
  right: [KC.D],
  jump: [KC.W],
  guard: [KC.S],
  attack: [KC.F, KC.G],
};

export const LAYOUT_P2: KeyLayout = {
  left: [KC.LEFT],
  right: [KC.RIGHT],
  jump: [KC.UP],
  guard: [KC.DOWN],
  attack: [KC.ENTER, KC.NUMPAD_ZERO, KC.PERIOD, KC.FORWARD_SLASH],
};

/** Teclado + (opcionalmente) um controle físico pelo índice. */
export class PlayerController implements Controller {
  private keys: Record<keyof KeyLayout, Phaser.Input.Keyboard.Key[]>;
  private prevPadJump = false;
  private prevPadAttack = false;

  constructor(private scene: Phaser.Scene, layout: KeyLayout, private padIndex: number) {
    const kb = scene.input.keyboard!;
    const mk = (codes: number[]) => codes.map((c) => kb.addKey(c, true, false));
    this.keys = {
      left: mk(layout.left),
      right: mk(layout.right),
      jump: mk(layout.jump),
      guard: mk(layout.guard),
      attack: mk(layout.attack),
    };
  }

  read(): Intent {
    const down = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
    const just = (ks: Phaser.Input.Keyboard.Key[]) =>
      ks.some((k) => Phaser.Input.Keyboard.JustDown(k));

    let move = (down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0);
    let jump = just(this.keys.jump);
    let attack = just(this.keys.attack);
    let guard = down(this.keys.guard);

    const pad = this.pad();
    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const b = (i: number) => (pad.buttons[i] ? pad.buttons[i].pressed : false);
      if (move === 0) {
        if (b(14) || ax < -0.4) move = -1;
        else if (b(15) || ax > 0.4) move = 1;
      }
      const padJump = b(0) || b(12);
      const padAttack = b(2) || b(3);
      if (padJump && !this.prevPadJump) jump = true;
      if (padAttack && !this.prevPadAttack) attack = true;
      this.prevPadJump = padJump;
      this.prevPadAttack = padAttack;
      if (b(1) || b(4) || b(5) || b(13) || ay > 0.6) guard = true;
    }
    return { move, jump, guard, attack };
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return undefined;
    return gp.gamepads.filter(Boolean)[this.padIndex];
  }
}
