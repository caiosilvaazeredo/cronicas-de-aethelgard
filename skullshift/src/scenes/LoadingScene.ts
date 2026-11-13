import Phaser from 'phaser';
import { BODY_FONT, FONT, H, W } from '../config';
import { LEVELS } from '../game/level';
import { areaOfLevel, areaTitle } from '../game/areas';
import { loadingVignette, tipCard } from '../ui/loading';

/**
 * Tela de entrada de fase (como um "carregando"): nome da área e da fase, uma cena curtinha
 * com os personagens e uma dica, curiosidade ou boato. Segue sozinha; qualquer tecla pula.
 */
export class LoadingScene extends Phaser.Scene {
  lastData: { next?: string; data?: Record<string, unknown> } = {};
  private leaving = false;

  constructor() {
    super('loading');
  }

  init(data: { next?: string; data?: Record<string, unknown> }): void {
    this.lastData = data;
    this.leaving = false;
  }

  create(): void {
    const { next = 'game', data = {} } = this.lastData;
    const level = typeof data.level === 'number' ? data.level : 0;
    const def = LEVELS[level];
    const area = areaOfLevel(level);
    const t = area ? areaTitle(area) : undefined;
    const HH = this.scale.height;
    const P = HH > H;
    const color = t?.color ?? 0x2f86e0;
    const c = Phaser.Display.Color.IntegerToColor(color);
    const dark = Phaser.Display.Color.GetColor(c.red * 0.22, c.green * 0.22, c.blue * 0.22);
    this.add.rectangle(0, 0, W, HH, dark).setOrigin(0);
    // Faixas diagonais bem leves, na cor da área, deslizando.
    const stripes = this.add.graphics().setAlpha(0.08);
    stripes.fillStyle(color);
    for (let x = -HH; x < W + HH; x += 90) stripes.fillPoints([new Phaser.Math.Vector2(x, 0), new Phaser.Math.Vector2(x + 40, 0), new Phaser.Math.Vector2(x + 40 + HH, HH), new Phaser.Math.Vector2(x + HH, HH)], true);
    this.tweens.add({ targets: stripes, x: -90, duration: 2200, repeat: -1 });

    const idx = area ? area.levels.indexOf(def.id) + 1 : 0;
    const top = P ? HH * 0.16 : 92;
    const hex = '#' + color.toString(16).padStart(6, '0');
    this.add
      .text(W / 2, top, area ? `${t!.name.toUpperCase()}  ·  FASE ${idx}` : 'CARREGANDO', { fontFamily: FONT, fontSize: P ? '44px' : '26px', color: hex, stroke: '#0b1626', strokeThickness: 8 })
      .setOrigin(0.5);
    const title = this.add
      .text(W / 2, top + (P ? 80 : 52), def?.name ?? '', { fontFamily: FONT, fontSize: P ? '84px' : '54px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 12 })
      .setOrigin(0.5)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    const king = def && area && area.levels[area.levels.length - 1] === def.id ? t!.kingAnim : undefined;
    loadingVignette(this, W / 2, P ? HH * 0.44 : 340, P ? 1100 : 760, { area: area?.id, king, scale: P ? 1.3 : 1 });
    tipCard(this, W / 2, P ? HH * 0.62 : 510, P ? 1120 : 900, area?.id, P ? 1.5 : 1);

    // Barra que enche sozinha; no fim, a fase começa.
    const by = P ? HH * 0.76 : 628;
    this.add.rectangle(W / 2, by, 424, 26, 0x10223a).setStrokeStyle(3, 0xfff7dc, 0.8);
    const bar = this.add.rectangle(W / 2 - 206, by, 0, 14, color).setOrigin(0, 0.5);
    const ms = 3200;
    this.tweens.add({ targets: bar, width: 412, duration: ms, ease: 'Sine.easeInOut', onComplete: () => this.go(next, data) });
    const hint = this.add
      .text(W / 2, by + (P ? 60 : 40), 'qualquer tecla ou toque para pular', { fontFamily: BODY_FONT, fontSize: P ? '30px' : '17px', color: '#9fb4c8' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.time.delayedCall(500, () => {
      hint.setAlpha(1);
      this.input.keyboard?.once('keydown', () => this.go(next, data));
      this.input.once('pointerdown', () => this.go(next, data));
      this.input.gamepad?.once('down', () => this.go(next, data));
    });
    this.cameras.main.fadeIn(250, 14, 26, 43);
  }

  private go(next: string, data: Record<string, unknown>): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(220, 14, 26, 43);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next, data));
  }
}
