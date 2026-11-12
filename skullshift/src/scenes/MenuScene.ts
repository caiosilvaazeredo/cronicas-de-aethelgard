import Phaser from 'phaser';
import { FONT, H, VIEW, W } from '../config';

const OPTIONS = [
  { label: 'HISTÓRIA  ·  1 jogador', mode: 'story' },
  { label: 'VERSUS  ·  2 jogadores', mode: 'versus' },
] as const;

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private prevPad = { up: false, down: false, ok: false };

  constructor() {
    super('menu');
  }

  /** Dados para recriar a cena quando o celular gira. */
  lastData = {};

  create(): void {
    this.texts = [];
    const P = VIEW.portrait;
    const HH = this.scale.height;
    // Linha do chão: deitado como no jogo; em pé, um pouco abaixo do meio.
    const gy = P ? Math.round(HH * 0.6) : 432;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, ((gy + 68) * 720) / 500);
    this.add.image(40, P ? 470 : 70, 'cloud_01').setOrigin(0);
    this.add.image(560, P ? 40 + gy * 0.45 : 40, 'cloud_03').setOrigin(0);
    this.add.image(900, P ? 110 + gy * 0.6 : 110, 'cloud_05').setOrigin(0);
    this.add.rectangle(0, gy + 68, W, HH - gy - 68, 0x39b5fd).setOrigin(0);
    for (let i = 0; i < 20; i++) {
      const col = i === 0 ? 5 : i === 19 ? 7 : 6;
      this.add.image(i * 64, gy, 'tilemap', 27 + col).setOrigin(0);
      this.add.image(i * 64, gy + 64, 'tilemap', 45 + col).setOrigin(0);
    }
    // Dois esqueletos: azul (P1) e vermelho (P2).
    const sk = P ? 1.6 : 1;
    [
      [P ? 300 : 330, 0x2f86e0, false],
      [P ? 980 : 950, 0xe5463a, true],
    ].forEach(([x, color, flip]) => {
      const feet = gy + 40;
      const aura = this.add.image(x as number, feet - 32 * sk, 'aura').setTint(color as number).setScale(1.05 * sk, 1.1 * sk);
      this.tweens.add({ targets: aura, alpha: { from: 0.95, to: 0.55 }, duration: 650, yoyo: true, repeat: -1 });
      this.add.ellipse(x as number, feet - 2, 58 * sk, 16 * sk).setStrokeStyle(3, color as number).setFillStyle(color as number, 0.22);
      this.add.sprite(x as number, feet + (96 - 126) * sk, 'skull_idle').setScale(sk).play('skull_idle').setFlipX(flip as boolean);
    });

    if (P) this.add.image(W / 2, 190, 'skull_avatar').setScale(0.75).setAngle(-8);
    else this.add.image(W / 2 - 300, 140, 'skull_avatar').setScale(0.55).setAngle(-8);
    this.add
      .text(P ? W / 2 : W / 2 + 60, P ? 400 : 140, 'SKULLSHIFT', {
        fontFamily: FONT,
        fontSize: P ? '128px' : '96px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: P ? 18 : 14,
      })
      .setOrigin(0.5);

    OPTIONS.forEach((o, i) => {
      const t = this.add
        .text(W / 2, P ? 620 + i * 130 : 290 + i * 66, o.label, {
          fontFamily: FONT,
          fontSize: P ? '58px' : '38px',
          color: '#fff7dc',
          stroke: '#10223a',
          strokeThickness: P ? 12 : 8,
        })
        .setOrigin(0.5)
        .setPadding(P ? 24 : 8)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.start(i));
      this.texts.push(t);
    });

    this.add
      .text(
        W / 2,
        P ? (gy + 140 + HH) / 2 : H - 100,
        [
          'Na próxima tela, cada jogador escolhe teclado, controle ou toque.',
          'P1 = azul  ·  P2 = vermelho. Os dois começam como esqueleto.',
          'Segure para TRÁS para andar defendendo. Sobre osso, arpão, lança ou crista, aperte PEGAR para se transformar.',
        ].join('\n'),
        {
          fontFamily: FONT,
          fontSize: P ? '36px' : '19px',
          color: '#0b2236',
          align: 'center',
          lineSpacing: P ? 16 : 8,
          wordWrap: { width: P ? 1100 : 1240 },
        },
      )
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select(this.index - 1));
    kb.on('keydown-W', () => this.select(this.index - 1));
    kb.on('keydown-DOWN', () => this.select(this.index + 1));
    kb.on('keydown-S', () => this.select(this.index + 1));
    kb.on('keydown-ENTER', () => this.start(this.index));
    kb.on('keydown-SPACE', () => this.start(this.index));
    kb.on('keydown-F', () => this.start(this.index));
    kb.on('keydown-ONE', () => this.start(0));
    kb.on('keydown-TWO', () => this.start(1));

    this.select(this.index);
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find(Boolean);
    if (!pad) return;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const up = b(12) || (pad.axes[1]?.getValue() ?? 0) < -0.5;
    const down = b(13) || (pad.axes[1]?.getValue() ?? 0) > 0.5;
    const ok = b(0) || b(9);
    if (up && !this.prevPad.up) this.select(this.index - 1);
    if (down && !this.prevPad.down) this.select(this.index + 1);
    if (ok && !this.prevPad.ok) this.start(this.index);
    this.prevPad = { up, down, ok };
  }

  private select(i: number): void {
    this.index = Phaser.Math.Wrap(i, 0, OPTIONS.length);
    this.texts.forEach((t, j) => {
      const on = j === this.index;
      t.setColor(on ? '#ffe066' : '#fff7dc').setScale(on ? 1.08 : 1);
      t.setText((on ? '▶  ' : '') + OPTIONS[j].label + (on ? '  ◀' : ''));
    });
  }

  private start(i: number): void {
    this.scene.start('controls', { mode: OPTIONS[i].mode });
  }
}
