import Phaser from 'phaser';
import { FONT, H, W } from '../config';

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

  create(): void {
    this.texts = [];
    this.add.image(0, 0, 'sky').setOrigin(0);
    this.add.image(40, 70, 'cloud_01').setOrigin(0);
    this.add.image(560, 40, 'cloud_03').setOrigin(0);
    this.add.image(900, 110, 'cloud_05').setOrigin(0);
    this.add.rectangle(0, 500, W, H - 500, 0x39b5fd).setOrigin(0);
    for (let i = 0; i < 20; i++) {
      const col = i === 0 ? 5 : i === 19 ? 7 : 6;
      this.add.image(i * 64, 432, 'tilemap', 27 + col).setOrigin(0);
      this.add.image(i * 64, 496, 'tilemap', 45 + col).setOrigin(0);
    }
    this.add.sprite(330, 472 - 126 + 96, 'skull_idle').play('skull_idle');
    this.add.sprite(950, 472 - 148 + 96, 'lizard_idle').play('lizard_idle').setFlipX(true);

    this.add.image(W / 2 - 300, 140, 'skull_avatar').setScale(0.55).setAngle(-8);
    this.add
      .text(W / 2 + 60, 140, 'SKULLSHIFT', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '96px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 14,
      })
      .setOrigin(0.5);

    OPTIONS.forEach((o, i) => {
      const t = this.add
        .text(W / 2, 290 + i * 66, o.label, {
          fontFamily: FONT,
        fontStyle: 'bold',
          fontSize: '38px',
          color: '#fff7dc',
          stroke: '#10223a',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.start(i));
      this.texts.push(t);
    });

    this.add
      .text(
        W / 2,
        H - 100,
        [
          'História: A/D ou ←/→ mover · W/↑/Espaço pular · S/↓ defender · F/J atacar',
          'Versus — P1: A/D · W · S · F      P2: ←/→ · ↑ · ↓ · Enter ou 0',
          'Segure para TRÁS para andar defendendo. Pegue osso, arpão ou lança para se transformar.',
        ].join('\n'),
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '19px',
          color: '#0b2236',
          align: 'center',
          lineSpacing: 8,
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
    this.scene.start('game', { mode: OPTIONS[i].mode });
  }
}
