import Phaser from 'phaser';
import { settings, sfx } from '../game/settings';

/**
 * "Juice": pequenos efeitos que não mudam as regras, só deixam cada ação mais viva.
 * Ficam aqui os que várias telas usam (contadores que rolam, moedas voando, rastro).
 */

/** Número que sobe (ou desce) rolando até o valor novo, com um pulinho no fim. */
export function rollNumber(scene: Phaser.Scene, text: Phaser.GameObjects.Text, from: number, to: number, fmt: (v: number) => string, ms = 500): void {
  const o = { v: from };
  scene.tweens.killTweensOf(o);
  if (from === to) return void text.setText(fmt(to));
  scene.tweens.add({
    targets: o,
    v: to,
    duration: Math.min(900, ms + Math.abs(to - from) * 8),
    ease: 'Cubic.easeOut',
    onUpdate: () => text.setText(fmt(Math.round(o.v))),
    onComplete: () => {
      text.setText(fmt(to));
      const sy = text.scaleY;
      scene.tweens.add({ targets: text, scaleX: text.scaleX * 1.18, scaleY: sy * 1.18, duration: 90, yoyo: true });
    },
  });
}

/**
 * Moedas saltam de (x, y), giram e voam até (tx, ty); cada uma que chega toca um tim mais agudo
 * que a anterior e chama onArrive (para o contador pular).
 */
export function flyCoins(scene: Phaser.Scene, x: number, y: number, tx: number, ty: number, n: number, onArrive: (i: number) => void, depth = 1000): void {
  const count = Math.min(6, Math.max(1, n));
  for (let i = 0; i < count; i++) {
    const c = scene.add.image(x, y, 'gold').setScale(0.3).setDepth(depth);
    const midX = x + Phaser.Math.Between(-60, 60);
    const midY = y - Phaser.Math.Between(50, 110);
    const delay = i * 70;
    // Salto para cima, depois uma curva rápida até o contador.
    scene.tweens.add({ targets: c, x: midX, y: midY, scaleX: { from: 0.3, to: -0.3 }, duration: 260, delay, ease: 'Quad.easeOut', yoyo: false });
    scene.tweens.add({
      targets: c,
      x: tx,
      y: ty,
      scale: 0.2,
      duration: 420,
      delay: delay + 260,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        c.destroy();
        sfx('coin', 1 + i * 0.08);
        onArrive(i);
      },
    });
  }
}

/** Rastro translúcido (afterimage) de um sprite: uma cópia parada que some. */
export function ghost(scene: Phaser.Scene, s: Phaser.GameObjects.Sprite, tint: number, depth: number): void {
  if (!settings().motionFx || !s.frame) return;
  const g = scene.add
    .image(s.x, s.y, s.texture.key, s.frame.name)
    .setOrigin(s.originX, s.originY)
    .setScale(s.scaleX, s.scaleY)
    .setFlipX(s.flipX)
    .setTintFill(tint)
    .setAlpha(0.35)
    .setDepth(depth);
  scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
}
