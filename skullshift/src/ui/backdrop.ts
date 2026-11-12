import Phaser from 'phaser';
import { FONT, VIEW, W } from '../config';

/** Fundo das telas de menu: céu + faixas diagonais de mar nas laterais. */
export function backdrop(scene: Phaser.Scene, title: string): void {
  const H = scene.scale.height;
  scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H);
  scene.add.rectangle(0, 0, W, H, 0x10223a, 0.35).setOrigin(0);
  const g = scene.add.graphics();
  // Bordas em zigue-zague com listras, lembrando ondas.
  for (const side of [0, 1]) {
    const x0 = side === 0 ? 0 : W;
    const dir = side === 0 ? 1 : -1;
    g.fillStyle(0x2a8fd1, 1);
    g.beginPath();
    g.moveTo(x0, 0);
    for (let y = 0; y <= H; y += 40) g.lineTo(x0 + dir * (y % 80 === 0 ? 34 : 54), y);
    g.lineTo(x0, H);
    g.closePath();
    g.fillPath();
    g.lineStyle(6, 0x1c6aa3, 0.8);
    for (let y = -40; y < H + 40; y += 28) g.lineBetween(x0, y, x0 + dir * 30, y + 30);
  }
  scene.add
    .text(W / 2, VIEW.portrait ? 130 : 56, title, {
      fontFamily: FONT,
      fontStyle: 'bold',
      fontSize: VIEW.portrait ? '76px' : '52px',
      color: '#fff7dc',
      stroke: '#10223a',
      strokeThickness: 12,
    })
    .setOrigin(0.5);
}
