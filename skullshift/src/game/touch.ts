import Phaser from 'phaser';
import { DEPTH, FONT, W } from '../config';

type ButtonId = 'left' | 'right' | 'jump' | 'guard' | 'attack';

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
  jumpPressed: boolean;
  attackPressed: boolean;
}

/**
 * Controle virtual na tela (multitoque). Desenhado em coordenadas de jogo, fixo na câmera.
 * side: 'full' (1 jogador: direcional à esquerda, ações à direita),
 * 'left' ou 'right' (versus: um bloco compacto para cada jogador).
 */
export class TouchPad {
  private buttons: Button[] = [];
  private prevJump = false;
  private prevAttack = false;
  visible = true;

  constructor(private scene: Phaser.Scene, side: 'full' | 'left' | 'right', tint = 0xfff7dc) {
    const L: Array<[ButtonId, number, number, number, string]> =
      side === 'full'
        ? [
            ['left', 86, 620, 62, '◀'],
            ['right', 236, 620, 62, '▶'],
            ['guard', 1000, 640, 50, 'DEF'],
            ['jump', 1110, 530, 54, 'PULA'],
            ['attack', 1190, 650, 64, 'ATQ'],
          ]
        : [
            ['left', 62, 640, 50, '◀'],
            ['right', 178, 640, 50, '▶'],
            ['guard', 62, 528, 42, 'DEF'],
            ['jump', 178, 528, 42, 'PULA'],
            ['attack', 294, 600, 54, 'ATQ'],
          ];
    for (const [id, x0, y, r, text] of L) {
      const x = side === 'right' ? W - x0 : x0;
      const bg = scene.add
        .circle(x, y, r, 0x10223a, 0.42)
        .setStrokeStyle(4, tint, 0.75)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 5);
      const label = scene.add
        .text(x, y, text, {
          fontFamily: FONT,
          fontStyle: 'bold',
          fontSize: text.length > 1 ? `${Math.round(r * 0.42)}px` : `${Math.round(r * 0.8)}px`,
          color: '#fff7dc',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 6);
      this.buttons.push({ id, x, y, r, bg, label, down: false });
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
    for (const b of this.buttons) {
      b.bg.setVisible(v);
      b.label.setVisible(v);
    }
  }

  /** Lê todos os dedos na tela e devolve o estado dos botões. */
  read(): TouchState {
    for (const b of this.buttons) b.down = false;
    if (this.visible) {
      for (const p of this.scene.input.manager.pointers) {
        if (!p || !p.isDown) continue;
        for (const b of this.buttons) {
          // Área de toque um pouco maior que o desenho.
          if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * 1.25) b.down = true;
        }
      }
    }
    for (const b of this.buttons) {
      b.bg.setFillStyle(b.down ? 0xfff7dc : 0x10223a, b.down ? 0.55 : 0.42);
    }
    const get = (id: ButtonId) => this.buttons.some((b) => b.id === id && b.down);
    const jump = get('jump');
    const attack = get('attack');
    const st: TouchState = {
      left: get('left'),
      right: get('right'),
      guard: get('guard'),
      jumpPressed: jump && !this.prevJump,
      attackPressed: attack && !this.prevAttack,
    };
    this.prevJump = jump;
    this.prevAttack = attack;
    return st;
  }
}
