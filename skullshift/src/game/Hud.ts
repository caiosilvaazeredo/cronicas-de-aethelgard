import Phaser from 'phaser';
import { DEPTH, FONT, H, W } from '../config';
import type { CharId } from './characters';

interface Slot {
  avatar: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  current: CharId;
  baseScale: number;
}

/**
 * HUD fixo: avatar + nome do jogador (embaixo, como no mockup; no celular sobe para o topo
 * para dar lugar aos botões), indicador dos 5 cenários e seta "VAI" de quem tem a vez.
 */
export class Hud {
  private slots: Slot[] = [];
  private goText: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Arc[] = [];

  constructor(
    private scene: Phaser.Scene,
    players: Array<{ name: string; char: CharId }>,
    screens: number,
    touchLayout: boolean,
  ) {
    const y = touchLayout ? 64 : H - 86;
    const scale = touchLayout ? 0.36 : 0.62;
    const fontSize = touchLayout ? '28px' : '44px';
    const labelGap = touchLayout ? 70 : 98;
    players.forEach((p, i) => {
      const right = i === 1;
      const ax = right ? W - (touchLayout ? 58 : 92) : touchLayout ? 58 : 92;
      const avatar = scene.add
        .image(ax, y, `${p.char}_avatar`)
        .setScale(scale)
        .setFlipX(right)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      const label = scene.add
        .text(right ? ax - labelGap : ax + labelGap, y, p.name, {
          fontFamily: FONT,
          fontStyle: 'bold',
          fontSize,
          color: touchLayout ? '#fff7dc' : '#0b0b0b',
          stroke: '#10223a',
          strokeThickness: touchLayout ? 6 : 0,
        })
        .setOrigin(right ? 1 : 0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      this.slots.push({ avatar, label, current: p.char, baseScale: scale });
    });

    // Indicador de cenários (o do meio é o central).
    const gap = 30;
    const x0 = W / 2 - ((screens - 1) * gap) / 2;
    for (let i = 0; i < screens; i++) {
      const center = i === Math.floor(screens / 2);
      this.dots.push(
        scene.add
          .circle(x0 + i * gap, 26, center ? 10 : 8, 0x10223a, 0.6)
          .setStrokeStyle(3, 0xfff7dc, 0.9)
          .setScrollFactor(0)
          .setDepth(DEPTH.hud),
      );
    }

    this.goText = scene.add
      .text(W / 2, touchLayout ? 128 : 74, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '40px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setVisible(false);
  }

  /** Troca o avatar com uma animação de "pop". */
  setChar(player: number, char: CharId): void {
    const slot = this.slots[player];
    if (!slot || slot.current === char) return;
    slot.current = char;
    slot.avatar.setTexture(`${char}_avatar`);
    this.scene.tweens.add({
      targets: slot.avatar,
      scale: { from: slot.baseScale * 1.4, to: slot.baseScale },
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  setScreen(index: number, color = 0xfff7dc): void {
    this.dots.forEach((d, i) => d.setFillStyle(i === index ? color : 0x10223a, i === index ? 1 : 0.6));
  }

  /** Seta "VAI" de quem tem a vez (versus) ou para onde seguir (história). */
  setGo(dir: -1 | 0 | 1, color: string): void {
    if (dir === 0) {
      this.goText.setVisible(false);
      return;
    }
    this.goText.setText(dir > 0 ? 'VAI  ➜' : '⬅  VAI').setColor(color);
    this.goText.setX(dir > 0 ? W - 170 : 170);
    this.goText.setVisible(Math.floor(this.scene.time.now / 300) % 2 === 0);
  }

  setVisible(v: boolean): void {
    for (const s of this.slots) {
      s.avatar.setVisible(v);
      s.label.setVisible(v);
    }
    this.dots.forEach((d) => d.setVisible(v));
    if (!v) this.goText.setVisible(false);
  }
}
