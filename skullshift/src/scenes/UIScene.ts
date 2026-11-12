import Phaser from 'phaser';
import { DEPTH, BODY_FONT, FONT, PORTRAIT, VIEW, W } from '../config';
import { Hud } from '../game/Hud';
import { TouchPad } from '../game/touch';
import { PLAYER_TINT, pillButton } from '../ui/devices';
import type { GameScene } from './GameScene';

export interface VictoryInfo {
  pi: number;
  title: string;
  sub: string;
}

/**
 * Camada de interface da partida, desenhada por cima do mundo e sem o zoom da câmera:
 * HUD, botões de toque, botão de menu, faixas e a parte de tela da animação de vitória.
 * É recriada quando o celular gira (o estado vem do GameScene).
 */
export class UIScene extends Phaser.Scene {
  hud?: Hud;
  pads: Array<TouchPad | undefined> = [];
  private g!: GameScene;
  private menuButton?: Phaser.GameObjects.Container;

  constructor() {
    super('ui');
  }

  init(data: { game: GameScene }): void {
    this.g = data.game;
    this.pads = [];
    this.hud = undefined;
  }

  /** Centro vertical da faixa do mundo (para faixas e vitória). */
  private get worldMidY(): number {
    return VIEW.portrait ? PORTRAIT.hudH + PORTRAIT.worldH / 2 : 360;
  }

  create(): void {
    this.input.addPointer(4);
    const g = this.g;
    const touch = g.devices.map((d) => d === 'touch');
    const anyTouch = touch.some(Boolean);
    const style = VIEW.portrait ? 'portrait' : anyTouch ? 'top' : 'bottom';

    if (VIEW.portrait) {
      // Fundo do topo e do painel de botões.
      this.add.rectangle(0, 0, W, PORTRAIT.hudH, 0x10223a).setOrigin(0).setDepth(DEPTH.hud - 1);
      const top = PORTRAIT.hudH + PORTRAIT.worldH;
      this.add.rectangle(0, top, W, VIEW.h - top, 0x16304d).setOrigin(0).setDepth(DEPTH.hud - 1);
      this.add.rectangle(0, top, W, 8, 0x0b1626).setOrigin(0).setDepth(DEPTH.hud - 1);
      if (!anyTouch) {
        this.add
          .text(W / 2, top + (VIEW.h - top) / 2, 'Escolha "Toque na tela"\nna tela de controles\npara jogar pelo celular', {
            fontFamily: BODY_FONT,
            fontSize: '40px',
            color: '#9fb4c8',
            align: 'center',
          })
          .setOrigin(0.5);
      }
    }

    this.hud = new Hud(
      this,
      g.players.map((p, i) => ({ name: p.label, char: p.def.id, color: PLAYER_TINT[i] })),
      g.level.screenCount,
      style,
    );
    this.hud.setScreen(g.screen, g.mode === 'versus' && g.leader >= 0 ? PLAYER_TINT[g.leader] : 0xfff7dc);

    const sides = g.mode === 'story' ? (['full'] as const) : (['left', 'right'] as const);
    this.pads = g.devices.map((d, i) => (d === 'touch' ? new TouchPad(this, sides[i], PLAYER_TINT[i]) : undefined));

    const menuY = VIEW.portrait ? 120 : 720 - 34;
    this.menuButton = pillButton(this, W / 2, menuY, 'MENU', () => g.scene.start('menu', { stage: 'modes' }), 120)
      .setScale(VIEW.portrait ? 1.2 : 0.7)
      .setDepth(DEPTH.hud + 4)
      .setAlpha(0.9);

    if (g.victoryInfo) this.showVictory(g.victoryInfo, true);
  }

  banner(text: string, ms: number, sub?: string): void {
    if (sub) {
      // Frase de abertura (a narrativa da fase), embaixo do nome.
      const st = this.add
        .text(W / 2, this.worldMidY - 176, sub, {
          fontFamily: BODY_FONT,
          fontSize: '24px',
          color: '#ffffff',
          stroke: '#10223a',
          strokeThickness: 6,
          align: 'center',
          wordWrap: { width: 1000 },
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      this.tweens.add({ targets: st, alpha: 0, delay: ms + 1400, duration: 600, onComplete: () => st.destroy() });
    }
    const t = this.add
      .text(W / 2, this.worldMidY - 230, text, {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 500, onComplete: () => t.destroy() });
  }

  /** Parte de tela da vitória: confete, fogos, avatar, faixa e botões. */
  showVictory(v: VictoryInfo, instant = false): void {
    const g = this.g;
    this.hud?.setVisible(false);
    this.menuButton?.setVisible(false);
    this.pads.forEach((p) => p?.setVisible(false));
    const color = PLAYER_TINT[v.pi];
    const mid = this.worldMidY;
    const d = (ms: number) => (instant ? 0 : ms);

    const colors = [0xffe066, 0xe5533d, 0x3d8bd9, 0x58b947, 0xfff7dc, 0xb07de0];
    this.add
      .particles(0, -20, 'confetti', {
        x: { min: 0, max: W },
        speedY: { min: 140, max: 280 },
        speedX: { min: -70, max: 70 },
        rotate: { min: 0, max: 360 },
        scaleX: { min: 0.6, max: 1.2 },
        lifespan: VIEW.portrait ? 9000 : 4200,
        quantity: 2,
        frequency: 45,
        tint: colors,
        gravityY: 60,
      })
      .setDepth(70);
    const fireworks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 120, max: 300 },
        lifespan: 800,
        scale: { start: 0.5, end: 0 },
        gravityY: 220,
        tint: colors,
        emitting: false,
      })
      .setDepth(65);
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => fireworks.explode(26, Phaser.Math.Between(160, W - 160), Phaser.Math.Between(mid - 270, mid - 60)),
    });

    const avatar = this.add.image(W / 2, mid - 210, `${g.players[v.pi].def.id}_avatar`).setDepth(DEPTH.hud + 2).setScale(0);
    this.tweens.add({ targets: avatar, scale: 0.75, duration: 600, ease: 'Back.easeOut', delay: d(200) });
    this.tweens.add({ targets: avatar, angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const ry = mid - 98;
    const ribbon = this.add.graphics().setDepth(DEPTH.hud + 1);
    ribbon.fillStyle(0x10223a, 1).fillRect(W / 2 - 420, ry, 840, 104);
    ribbon.fillStyle(color, 1).fillRect(W / 2 - 410, ry + 8, 820, 88);
    ribbon.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(30).color, 1);
    ribbon.fillTriangle(W / 2 - 470, ry + 18, W / 2 - 410, ry + 18, W / 2 - 410, ry + 108).fillTriangle(W / 2 - 470, ry + 118, W / 2 - 410, ry + 78, W / 2 - 410, ry + 118);
    ribbon.fillTriangle(W / 2 + 470, ry + 18, W / 2 + 410, ry + 18, W / 2 + 410, ry + 108).fillTriangle(W / 2 + 470, ry + 118, W / 2 + 410, ry + 78, W / 2 + 410, ry + 118);
    ribbon.setAlpha(0);
    this.tweens.add({ targets: ribbon, alpha: 1, duration: 300, delay: d(350) });

    const title = this.add
      .text(W / 2, ry + 52, v.title, {
        fontFamily: FONT,
        fontSize: '62px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 3)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 650, ease: 'Elastic.easeOut', delay: d(450) });

    const sub = this.add
      .text(W / 2, ry + 138, v.sub, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 3)
      .setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: d(900) });

    // Botões: deitado, embaixo da tela; em pé, no painel de baixo (maiores).
    const by = VIEW.portrait ? PORTRAIT.hudH + PORTRAIT.worldH + 200 : 640;
    const sc = VIEW.portrait ? 1.5 : 1;
    this.time.delayedCall(d(1200), () => {
      const next = g.hasNextLevel;
      pillButton(this, VIEW.portrait ? W / 2 : W / 2 - 160, by, next ? 'PRÓXIMA FASE' : 'JOGAR DE NOVO', () => (next ? g.nextLevel() : g.restartMatch()), 280, 0xffe066)
        .setScale(sc)
        .setDepth(DEPTH.hud + 4);
      pillButton(this, VIEW.portrait ? W / 2 : W / 2 + 160, VIEW.portrait ? by + 150 : by, 'MENU', () => g.scene.start('menu', { stage: 'modes' }), 200)
        .setScale(sc)
        .setDepth(DEPTH.hud + 4);
    });
  }
}
