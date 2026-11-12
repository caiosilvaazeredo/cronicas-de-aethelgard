import Phaser from 'phaser';
import { BODY_FONT, FONT, H, VIEW, W } from '../config';
import { pillButton } from '../ui/devices';
import { LEVELS } from '../game/level';

const OPTIONS = [
  { label: 'HISTÓRIA  ·  1 jogador', mode: 'story' },
  { label: 'VERSUS  ·  2 jogadores', mode: 'versus' },
] as const;

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private prevPad = { up: false, down: false, ok: true };
  /** Tela inicial (logo + JOGAR) ou escolha de modo. */
  private stage: 'title' | 'modes' = 'title';

  constructor() {
    super('menu');
  }

  /** Dados para recriar a cena quando o celular gira. */
  lastData: { stage?: 'title' | 'modes'; level?: number } = {};
  /** Fase escolhida (0, 1, 2). */
  private level = 0;
  private prevLR = { l: false, r: false };
  private levelText?: Phaser.GameObjects.Text;
  private levelRow: Phaser.GameObjects.Text[] = [];

  init(data: { stage?: 'title' | 'modes'; level?: number }): void {
    this.lastData = data;
    this.level = data.level ?? this.level;
    this.stage = data.stage ?? 'title';
    this.prevPad = { up: false, down: false, ok: true };
  }

  create(): void {
    this.texts = [];
    this.levelRow = [];
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

    const hasLogo = this.textures.exists('logo');
    if (this.stage === 'title') {
      // Tela inicial: logo grande respirando + JOGAR.
      if (hasLogo) {
        const lw = P ? 1180 : 700;
        const logo = this.add.image(W / 2, P ? Math.round(HH * 0.24) : 196, 'logo').setDisplaySize(lw, (lw * 640) / 1200);
        const sc = logo.scale;
        logo.setScale(0);
        this.tweens.add({ targets: logo, scale: sc, duration: 700, ease: 'Back.easeOut' });
        this.tweens.add({ targets: logo, y: logo.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });
      } else {
        this.add
          .text(W / 2, P ? 500 : 180, 'SKULLSHIFT', { fontFamily: FONT, fontSize: P ? '128px' : '96px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 14 })
          .setOrigin(0.5);
      }
      const play = pillButton(this, W / 2, P ? (gy + 140 + HH) / 2 - 60 : 618, 'JOGAR', () => this.toModes(), 300, 0xffe066).setScale(P ? 2 : 1.3);
      this.tweens.add({ targets: play, scale: play.scale * 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add
        .text(W / 2, P ? (gy + 140 + HH) / 2 + 110 : 690, 'Enter · Espaço · botão A · toque', {
          fontFamily: BODY_FONT,
          fontSize: P ? '34px' : '18px',
          color: '#0b2236',
        })
        .setOrigin(0.5);
      const kb = this.input.keyboard!;
      for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.toModes());
      return;
    }

    if (hasLogo) {
      const lw = P ? 900 : 430;
      this.add.image(W / 2, P ? 320 : 128, 'logo').setDisplaySize(lw, (lw * 640) / 1200);
    } else {
      this.add
        .text(W / 2, P ? 400 : 140, 'SKULLSHIFT', { fontFamily: FONT, fontSize: P ? '128px' : '96px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 14 })
        .setOrigin(0.5);
    }
    OPTIONS.forEach((o, i) => {
      const t = this.add
        .text(W / 2, P ? 680 + i * 130 : 268 + i * 58, o.label, {
          fontFamily: FONT,
          fontSize: P ? '58px' : '36px',
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

    // Escolha da fase: ◀ FASE 1 · ILHAS DA MARÉ ▶
    const ly = P ? 980 : 388;
    this.levelText = this.add
      .text(W / 2, ly, '', { fontFamily: FONT, fontSize: P ? '44px' : '26px', color: '#bfe9ff', stroke: '#10223a', strokeThickness: P ? 10 : 7 })
      .setOrigin(0.5);
    this.levelRow = [this.levelText!];
    for (const dir of [-1, 1]) {
      const arrow = this.add
        .text(W / 2 + dir * (P ? 520 : 330), ly, dir < 0 ? '◀' : '▶', { fontFamily: FONT, fontSize: P ? '56px' : '34px', color: '#ffe066', stroke: '#10223a', strokeThickness: 8 })
        .setOrigin(0.5)
        .setPadding(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLevel(this.level + dir));
      this.levelRow.push(arrow);
    }
    this.setLevel(this.level);

    this.add
      .text(
        W / 2,
        P ? (gy + 140 + HH) / 2 : H - 100,
        [
          'Na próxima tela, cada jogador escolhe teclado, controle ou toque.',
          'P1 = azul  ·  P2 = vermelho. Os dois começam como esqueleto.',
          'Segure para TRÁS para andar defendendo. Sobre o item de outro personagem, aperte PEGAR para se transformar.',
        ].join('\n'),
        {
          fontFamily: BODY_FONT,
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
    kb.on('keydown-ESC', () => this.scene.restart({ stage: 'title' }));
    kb.on('keydown-SPACE', () => this.start(this.index));
    kb.on('keydown-F', () => this.start(this.index));
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.setLevel(this.level - 1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.setLevel(this.level + 1));
    kb.on('keydown-ONE', () => this.start(0));
    kb.on('keydown-TWO', () => this.start(1));

    this.select(this.index);
  }

  private toModes(): void {
    this.scene.restart({ stage: 'modes' });
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find(Boolean);
    if (!pad) return;
    if (this.stage === 'title') {
      const ok = !!pad.buttons[0]?.pressed || !!pad.buttons[9]?.pressed;
      if (ok && !this.prevPad.ok) this.toModes();
      this.prevPad.ok = ok;
      return;
    }
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const up = b(12) || (pad.axes[1]?.getValue() ?? 0) < -0.5;
    const down = b(13) || (pad.axes[1]?.getValue() ?? 0) > 0.5;
    const ok = b(0) || b(9);
    if (up && !this.prevPad.up) this.select(this.index - 1);
    if (down && !this.prevPad.down) this.select(this.index + 1);
    if (ok && !this.prevPad.ok) this.start(this.index);
    const lr = (pad.axes[0]?.getValue() ?? 0);
    const left = !!pad.buttons[14]?.pressed || lr < -0.5;
    const right = !!pad.buttons[15]?.pressed || lr > 0.5;
    if (left && !this.prevLR.l) this.setLevel(this.level - 1);
    if (right && !this.prevLR.r) this.setLevel(this.level + 1);
    this.prevLR = { l: left, r: right };
    this.prevPad = { up, down, ok };
  }

  private select(i: number): void {
    this.index = Phaser.Math.Wrap(i, 0, OPTIONS.length);
    // A fase só se escolhe aqui no versus; na história ela vem do mapa.
    this.levelRow.forEach((o) => o.setVisible(this.index === 1));
    this.texts.forEach((t, j) => {
      const on = j === this.index;
      t.setColor(on ? '#ffe066' : '#fff7dc').setScale(on ? 1.08 : 1);
      t.setText((on ? '▶  ' : '') + OPTIONS[j].label + (on ? '  ◀' : ''));
    });
  }

  private setLevel(n: number): void {
    this.level = Phaser.Math.Wrap(n, 0, LEVELS.length);
    const name = LEVELS[this.level].name.split('—')[1]?.trim() ?? '';
    this.levelText?.setText(`FASE ${this.level + 1} · ${name}`);
  }

  private start(i: number): void {
    this.scene.start('controls', { mode: OPTIONS[i].mode, level: this.level });
  }
}
