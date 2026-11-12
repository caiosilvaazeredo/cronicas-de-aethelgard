import Phaser from 'phaser';
import { BODY_FONT, DEPTH, FONT } from '../config';

const INK = 0x1d1a2b;

/**
 * Balão de fala em pixel art que segue alguém no mundo: borda escura, fundo creme,
 * rabicho em degraus apontando para quem fala e plaquinha com o nome.
 */
export class SpeechBubble {
  readonly box: Phaser.GameObjects.Container;
  private follow: () => void;

  constructor(
    private scene: Phaser.Scene,
    private anchor: () => { x: number; y: number },
    text: string,
    name: string,
    color: number,
  ) {
    const body = scene.add
      .text(0, 0, text, { fontFamily: BODY_FONT, fontSize: '17px', color: '#1d1a2b', lineSpacing: 4, wordWrap: { width: 300 } })
      .setOrigin(0.5, 1);
    const w = Math.max(160, body.width + 28);
    const h = body.height + 26;
    const g = scene.add.graphics();
    const tail = scene.add.graphics();
    const x0 = -w / 2;
    const y0 = -h - 14;
    g.fillStyle(INK, 1).fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
    g.fillStyle(0xfff7dc, 1).fillRect(x0, y0, w, h);
    g.fillStyle(0xe8d9a8, 1).fillRect(x0, y0 + h - 4, w, 4);
    // Rabicho em degraus.
    for (let i = 0; i < 4; i++) {
      tail.fillStyle(INK, 1).fillRect(-8 + i * 2 - 3, y0 + h + i * 4, 16 - i * 4 + 6, 4);
      tail.fillStyle(0xe8d9a8, 1).fillRect(-8 + i * 2, y0 + h + i * 4 - (i === 0 ? 4 : 0), 16 - i * 4, i === 0 ? 8 : 4);
    }
    body.setPosition(0, y0 + h - 12);
    const tag = scene.add.text(x0 + 12, y0 - 2, name.toUpperCase(), { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5);
    const plate = scene.add.graphics();
    plate.fillStyle(INK, 1).fillRect(tag.x - 8, tag.y - 13, tag.width + 16, 26);
    plate.fillStyle(color, 1).fillRect(tag.x - 6, tag.y - 11, tag.width + 12, 22);
    const panel = scene.add.container(0, 0, [g, body, plate, tag]);
    this.box = scene.add.container(0, 0, [tail, panel]).setDepth(DEPTH.fx + 3).setScale(0.6).setAlpha(0);
    scene.tweens.add({ targets: this.box, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.follow = () => {
      const a = this.anchor();
      this.box.setPosition(Math.round(a.x), Math.round(a.y));
      // O balão não sai da tela: desliza para dentro e o rabicho continua apontando para quem fala.
      const view = scene.cameras.main.worldView;
      const half = w / 2 + 12;
      const cx = Phaser.Math.Clamp(a.x, view.x + half, view.right - half);
      panel.x = Math.round(Phaser.Math.Clamp(cx - a.x, -w / 2 + 20, w / 2 - 20));
    };
    this.follow();
    scene.events.on('update', this.follow);
  }

  close(): void {
    this.scene.events.off('update', this.follow);
    this.scene.tweens.add({ targets: this.box, alpha: 0, scale: 0.8, duration: 160, onComplete: () => this.box.destroy() });
  }
}
