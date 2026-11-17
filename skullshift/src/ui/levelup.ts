import Phaser from 'phaser';
import { BODY_FONT, FONT, W } from '../config';
import { sfx } from '../game/settings';
import { jingle } from '../game/music';

/**
 * Faixa de "SUBIU DE NÍVEL!" que desce no alto da tela, com o nível novo e o que melhora
 * (corações e força nas dungeons). Serve para qualquer cena.
 */
export function levelUpBanner(scene: Phaser.Scene, level: number, delay = 0): void {
  scene.time.delayedCall(delay, () => {
    if (!scene.sys.isActive()) return;
    const g = scene.add.graphics();
    g.fillStyle(0x10223a, 1).fillRoundedRect(-263, -46, 526, 92, 16);
    g.fillStyle(0x7a3ad0, 1).fillRoundedRect(-260, -43, 520, 86, 14);
    g.fillStyle(0x9b6bf0, 1).fillRoundedRect(-254, -37, 508, 74, 12);
    const star = scene.add.image(-215, 0, 'spark').setTint(0xffe066).setScale(1.4);
    const t1 = scene.add.text(-180, -14, `SUBIU DE NÍVEL!  NÍVEL ${level}`, { fontFamily: FONT, fontSize: '24px', color: '#fff7dc', stroke: '#2a1640', strokeThickness: 6 }).setOrigin(0, 0.5);
    const t2 = scene.add.text(-180, 18, 'Mais corações e mais força nas dungeons.', { fontFamily: BODY_FONT, fontSize: '16px', color: '#f0e4ff' }).setOrigin(0, 0.5);
    const box = scene.add.container(W / 2, -70, [g, star, t1, t2]).setScrollFactor(0).setDepth(9999);
    const cam = scene.cameras.main;
    if (cam.zoom !== 1) box.setScale(1 / cam.zoom);
    jingle('seal');
    sfx('pick');
    scene.tweens.add({ targets: star, angle: 360, duration: 2200 });
    scene.tweens.add({ targets: box, y: 200, duration: 420, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: box, y: -70, delay: 2800, duration: 320, ease: 'Quad.easeIn', onComplete: () => box.destroy() });
  });
}
