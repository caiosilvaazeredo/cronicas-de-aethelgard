import Phaser from 'phaser';
import { DEPTH, FONT, H, W } from '../config';
import type { CharId } from './characters';

interface Slot {
  avatar: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  current: CharId;
}

/** HUD fixo: avatar + nome do jogador nos cantos inferiores, como no mockup. */
export class Hud {
  private slots: Slot[] = [];
  private goText: Phaser.GameObjects.Text;
  private progress?: { bar: Phaser.GameObjects.Rectangle; marker: Phaser.GameObjects.Image };

  constructor(private scene: Phaser.Scene, players: Array<{ name: string; char: CharId }>, story: boolean) {
    players.forEach((p, i) => {
      const right = i === 1;
      const ax = right ? W - 92 : 92;
      const avatar = scene.add
        .image(ax, H - 86, `${p.char}_avatar`)
        .setScale(0.62)
        .setFlipX(right)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      const label = scene.add
        .text(right ? W - 190 : 190, H - 86, p.name, {
          fontFamily: FONT,
        fontStyle: 'bold',
          fontSize: '44px',
          color: '#0b0b0b',
        })
        .setOrigin(right ? 1 : 0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      this.slots.push({ avatar, label, current: p.char });
    });

    this.goText = scene.add
      .text(W / 2, 46, '', {
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

    if (story) {
      const bw = 360;
      scene.add.rectangle(W / 2, 30, bw + 8, 16, 0x10223a, 0.8).setScrollFactor(0).setDepth(DEPTH.hud);
      const bar = scene.add
        .rectangle(W / 2 - bw / 2, 30, 0, 8, 0xfff7dc)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      const marker = scene.add
        .image(W / 2 - bw / 2, 30, 'skull_avatar')
        .setScale(0.16)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      this.progress = { bar, marker };
    }
  }

  /** Troca o avatar com uma animação de "pop". */
  setChar(player: number, char: CharId): void {
    const slot = this.slots[player];
    if (!slot || slot.current === char) return;
    slot.current = char;
    slot.avatar.setTexture(`${char}_avatar`);
    this.scene.tweens.add({
      targets: slot.avatar,
      scale: { from: 0.85, to: 0.62 },
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  /** Indicador "VAI" de quem tem a vez (versus). */
  setGo(dir: -1 | 0 | 1, color: string): void {
    if (dir === 0) {
      this.goText.setVisible(false);
      return;
    }
    this.goText.setText(dir > 0 ? 'VAI  ➜' : '⬅  VAI').setColor(color);
    this.goText.setX(dir > 0 ? W - 150 : 150);
    this.goText.setVisible(Math.floor(this.scene.time.now / 300) % 2 === 0);
  }

  setProgress(frac: number): void {
    if (!this.progress) return;
    const f = Phaser.Math.Clamp(frac, 0, 1);
    this.progress.bar.width = 360 * f;
    this.progress.marker.x = W / 2 - 180 + 360 * f;
  }
}
