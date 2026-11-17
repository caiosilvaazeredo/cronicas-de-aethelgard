import Phaser from 'phaser';
import { BODY_FONT, FONT, W } from '../config';
import { playMusic } from '../game/music';
import { loadingVignette } from '../ui/loading';

/**
 * Créditos: curtos e diretos. O logo, o nome do autor e o estúdio entram em sequência rápida
 * sobre o céu de fim de tarde, com os personagens correndo lá embaixo. Depois de alguns segundos
 * segue sozinho; qualquer tecla ou toque pula.
 */
const AUTHOR = 'Msc Caio Azeredo';
const STUDIO = 'Sapo Papão Games';

export class CreditsScene extends Phaser.Scene {
  lastData: { next?: string; data?: Record<string, unknown> } = {};
  private leaving = false;

  constructor() {
    super('credits');
  }

  init(data: { next?: string; data?: Record<string, unknown> }): void {
    this.lastData = data;
    this.leaving = false;
  }

  create(): void {
    playMusic('memory');
    const HH = this.scale.height;
    const P = HH > 720;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HH);
    this.add.rectangle(0, 0, W, HH, 0x2a1640, 0.45).setOrigin(0);
    const ground = HH - (P ? 260 : 120);
    let show = loadingVignette(this, W / 2, ground, W, { scale: P ? 1.3 : 0.9 });
    this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        show.destroy();
        show = loadingVignette(this, W / 2, ground, W, { scale: P ? 1.3 : 0.9 });
      },
    });

    // Logo, autor e estúdio, um depois do outro.
    const s = P ? 1.5 : 1;
    const top = P ? HH * 0.2 : 70;
    const items: Phaser.GameObjects.Components.Transform[] = [];
    let y = top;
    if (this.textures.exists('logo')) {
      const lw = P ? 820 : 470;
      items.push(this.add.image(W / 2, y + (lw * 640) / 1200 / 2, 'logo').setDisplaySize(lw, (lw * 640) / 1200));
      y += (lw * 640) / 1200 + 24 * s;
    }
    const author = this.add.text(W / 2, y, AUTHOR, { fontFamily: FONT, fontSize: `${Math.round(46 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5, 0);
    items.push(author);
    y += author.height + 14 * s;
    items.push(this.add.text(W / 2, y, STUDIO, { fontFamily: FONT, fontSize: `${Math.round(30 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0.5, 0));
    items.forEach((o, i) => {
      const go = o as unknown as Phaser.GameObjects.Image;
      const sx = go.scaleX;
      const sy = go.scaleY;
      go.setAlpha(0).setScale(sx * 0.85, sy * 0.85);
      go.y += 16;
      this.tweens.add({ targets: go, alpha: 1, scaleX: sx, scaleY: sy, y: go.y - 16, duration: 380, delay: 150 + i * 260, ease: 'Back.easeOut' });
    });
    // Fica um pouco na tela e segue.
    this.time.delayedCall(5200, () => this.leave());

    const hint = this.add
      .text(W - 20, HH - 16, 'qualquer tecla ou toque para pular', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#bfd0e0' })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.time.delayedCall(400, () => {
      hint.setAlpha(1);
      this.input.keyboard?.once('keydown', () => this.leave());
      this.input.once('pointerdown', () => this.leave());
      this.input.gamepad?.once('down', () => this.leave());
    });
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.lastData.next ?? 'menu', this.lastData.data ?? {}));
  }
}
