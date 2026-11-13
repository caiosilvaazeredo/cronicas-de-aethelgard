import Phaser from 'phaser';
import { DEPTH, BODY_FONT, FONT, PORTRAIT, SPLIT, VIEW, W } from '../config';
import { Hud } from '../game/Hud';
import { LEVELS } from '../game/level';
import { TouchPad } from '../game/touch';
import { PLAYER_TINT, pillButton } from '../ui/devices';
import { sfx } from '../game/settings';
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
type HudLike = Pick<Hud, 'setChar' | 'setScreen' | 'setGo' | 'setVisible'>;

export class UIScene extends Phaser.Scene {
  hud?: HudLike;
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

  /** Centro vertical da faixa do mundo (para faixas e vitória). No modo dividido, a do P1. */
  private get worldMidY(): number {
    if (this.g.split) return VIEW.h / 2 + SPLIT.hudS + SPLIT.bandH / 2;
    return VIEW.portrait ? PORTRAIT.hudH + PORTRAIT.worldH / 2 : 360;
  }

  /**
   * Monta algo para o P1 e, no modo dividido, uma cópia girada 180° para o P2
   * (que está do outro lado da mesa).
   */
  private mirrored(build: () => void): void {
    build();
    if (!this.g.split) return;
    const before = this.children.list.length;
    build();
    const made = this.children.list.slice(before);
    this.add.container(W, VIEW.h, made).setRotation(Math.PI).setDepth(DEPTH.hud + 3);
  }

  /** Modo dividido: faixas, HUD de cada lado, botões nas pontas, P2 de ponta-cabeça. */
  private createSplit(): void {
    const g = this.g;
    const half = VIEW.h / 2;
    const panelTop = half + SPLIT.hudS + SPLIT.bandH;
    for (const flip of [false, true]) {
      const rect = (y0: number, h: number, c: number) =>
        this.add.rectangle(0, flip ? VIEW.h - y0 - h : y0, W, h, c).setOrigin(0).setDepth(DEPTH.hud - 1);
      rect(half, SPLIT.hudS, 0x10223a);
      rect(panelTop, VIEW.h - panelTop, 0x16304d);
      rect(panelTop, 8, 0x0b1626);
    }
    this.add.rectangle(0, half - 3, W, 6, 0xfff7dc, 0.6).setOrigin(0).setDepth(DEPTH.hud);
    const players = g.players.map((p, i) => ({ name: p.label, char: p.def.id, color: PLAYER_TINT[i] }));
    const h1 = new Hud(this, players, g.level.screenCount, 'split', { only: 0, x: 0, y: half, rotation: 0 });
    const h2 = new Hud(this, players, g.level.screenCount, 'split', { only: 1, x: W, y: half, rotation: Math.PI });
    this.hud = {
      setChar: (pl, c) => (h1.setChar(pl, c), h2.setChar(pl, c)),
      setScreen: (n, c) => (h1.setScreen(n, c), h2.setScreen(n, c)),
      setGo: (d, c) => (h1.setGo(d, c), h2.setGo(d, c)),
      setVisible: (v) => (h1.setVisible(v), h2.setVisible(v)),
    };
    const area = { top: panelTop, h: VIEW.h - panelTop };
    this.pads = [new TouchPad(this, 'full', PLAYER_TINT[0], area, false), new TouchPad(this, 'full', PLAYER_TINT[1], area, true)];
    this.menuButton = pillButton(this, W / 2, half, 'MENU', () => this.togglePause(), 120)
      .setScale(1)
      .setDepth(DEPTH.hud + 4)
      .setAlpha(0.9);
  }

  create(): void {
    this.input.addPointer(4);
    this.pauseBox = undefined;
    const kb = this.input.keyboard!;
    for (const k of ['UP', 'W']) kb.on(`keydown-${k}`, () => this.pauseBox && this.selectPause(this.pauseSel - 1));
    for (const k of ['DOWN', 'S']) kb.on(`keydown-${k}`, () => this.pauseBox && this.selectPause(this.pauseSel + 1));
    for (const k of ['ENTER', 'SPACE']) kb.on(`keydown-${k}`, () => this.pauseBox && this.pauseRows[this.pauseSel]?.act());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    const g = this.g;
    if (g.split) {
      this.createSplit();
      this.hud?.setScreen(g.screen, g.leader >= 0 ? PLAYER_TINT[g.leader] : 0xfff7dc);
      if (g.victoryInfo) this.showVictory(g.victoryInfo, true);
      return;
    }
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
    // Fases de voo: manche e TIRO no lugar dos botões de sempre.
    const flight = g.mode === 'story' && !!LEVELS[g.levelIndex]?.shmup;
    this.pads = g.devices.map((d, i) => (d === 'touch' ? new TouchPad(this, sides[i], PLAYER_TINT[i], undefined, false, flight) : undefined));

    const menuY = VIEW.portrait ? 120 + PORTRAIT.topPad : 720 - 34;
    this.menuButton = pillButton(this, W / 2, menuY, 'MENU', () => this.togglePause(), 120)
      .setScale(VIEW.portrait ? 1.2 : 0.7)
      .setDepth(DEPTH.hud + 4)
      .setAlpha(0.9);

    if (g.victoryInfo) this.showVictory(g.victoryInfo, true);
  }

  banner(text: string, ms: number, sub?: string): void {
    this.mirrored(() => this.bannerFace(text, ms, sub));
  }

  private bannerFace(text: string, ms: number, sub?: string): void {
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

  /** Badge pequena no canto quando a passiva da aranha dispara. */
  showSpiderBadge(pi: number): void {
    const flip = this.g.split && pi === 1;
    const right = pi === 1 && !this.g.split;
    const y = this.g.split ? VIEW.h / 2 + SPLIT.hudS + 50 : VIEW.portrait ? PORTRAIT.hudH + 50 : 128;
    const x = right ? W - 24 : 24;
    const label = this.add.text(0, 0, 'SENTIDO ARANHA', { fontFamily: FONT, fontSize: VIEW.portrait ? '24px' : '14px', color: '#ffffff' }).setOrigin(right ? 1 : 0, 0.5);
    const icon = this.add.image(0, 0, 'spider_avatar').setScale(VIEW.portrait ? 0.2 : 0.12);
    const iw = icon.displayWidth;
    const w = label.width + iw + 26;
    const h = VIEW.portrait ? 48 : 30;
    const g = this.add.graphics();
    const x0 = right ? -w : 0;
    g.fillStyle(0xc81e1e, 0.95).fillRoundedRect(x0, -h / 2, w, h, 8);
    g.lineStyle(2, 0x1d1a2b, 1).strokeRoundedRect(x0, -h / 2, w, h, 8);
    icon.setPosition(right ? -w + 10 + iw / 2 : 10 + iw / 2, 0);
    label.setPosition(right ? -12 : iw + 18, 0);
    const c = this.add.container(right ? W + w : -w, y, [g, icon, label]).setDepth(DEPTH.hud + 6);
    if (flip) {
      // P2 do outro lado da mesa: a badge aparece na metade dele, de ponta-cabeça.
      c.setPosition(W + w, VIEW.h - y).setRotation(Math.PI);
      this.tweens.add({ targets: c, x: W - x, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 400, onComplete: () => c.destroy() });
      return;
    }
    this.tweens.add({ targets: c, x, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 400, onComplete: () => c.destroy() });
  }

  /** Faixa escura atravessando a tela com o texto de morte em vermelho (estilo "wasted"). */
  showWasted(pi: number, text: string, hold = 3200): void {
    const split = this.g.split;
    const y = split ? (pi === 0 ? VIEW.h * 0.72 : VIEW.h * 0.28) : VIEW.h / 2;
    const band = this.add.rectangle(0, 0, W + 40, VIEW.portrait ? 120 : 110, 0x000000, 0.6);
    const label = this.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: VIEW.portrait ? '58px' : '64px',
        color: '#d6262b',
        stroke: '#1a0507',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    if (label.width > W - 60) label.setScale((W - 60) / label.width);
    const c = this.add.container(W / 2, y, [band, label]).setDepth(DEPTH.hud + 8).setAlpha(0);
    if (split && pi === 1) c.setRotation(Math.PI);
    const s0 = label.scale;
    label.setScale(s0 * 1.4);
    this.tweens.add({ targets: c, alpha: 1, duration: 200, delay: 250 });
    this.tweens.add({ targets: label, scale: s0, duration: 300, delay: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: hold, duration: 400, onComplete: () => c.destroy() });
  }

  // ---------- pausa ----------

  private pauseBox?: Phaser.GameObjects.Container;
  private pauseSel = 0;
  private pauseRows: Array<{ label: string; act: () => void; t?: Phaser.GameObjects.Text; bg?: Phaser.GameObjects.Graphics }> = [];
  private prevPausePad = { u: true, d: true, a: true, b: true, s: true };

  get paused(): boolean {
    return !!this.pauseBox;
  }

  togglePause(): void {
    if (this.pauseBox) this.closePause();
    else this.openPause();
  }

  /** Pausa: o jogo congela e abre o menu (continuar, configurações, reiniciar, sair). */
  openPause(): void {
    const g = this.g;
    if (this.pauseBox || g.ended) return;
    g.scene.pause();
    sfx('select');
    const P = VIEW.portrait;
    const H = this.scale.height;
    const story = g.mode === 'story';
    this.pauseRows = [
      { label: 'CONTINUAR', act: () => this.closePause() },
      {
        label: 'CONFIGURAÇÕES',
        act: () => {
          this.scene.launch('settings', { from: 'pause' });
          this.scene.bringToTop('settings');
          this.scene.pause();
        },
      },
      { label: 'REINICIAR FASE', act: () => g.restartMatch() },
      { label: story ? 'SAIR PARA O MAPA' : 'SAIR PARA O MENU', act: () => (story ? g.scene.start('map', { devices: g.devices }) : g.scene.start('menu', { stage: 'modes' })) },
    ];
    const items: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, W * 2, H * 3, 0x07040c, 0.65).setInteractive()];
    const pw = P ? 760 : 520;
    const rh = P ? 110 : 74;
    const ph = this.pauseRows.length * rh + (P ? 200 : 140);
    const panel = this.add.graphics();
    panel.fillStyle(0x1d1a2b, 1).fillRoundedRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12, 26);
    panel.fillStyle(0x10223a, 0.97).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    panel.lineStyle(4, 0xfff7dc, 0.8).strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    items.push(panel);
    items.push(this.add.text(0, -ph / 2 + (P ? 70 : 48), 'PAUSA', { fontFamily: FONT, fontSize: P ? '64px' : '46px', color: '#ffe066', stroke: '#1d1a2b', strokeThickness: 10 }).setOrigin(0.5));
    this.pauseRows.forEach((r, i) => {
      const y = -ph / 2 + (P ? 170 : 116) + i * rh + rh / 2;
      const bg = this.add.graphics();
      const t = this.add.text(0, y, r.label, { fontFamily: FONT, fontSize: P ? '40px' : '28px', color: '#fff7dc' }).setOrigin(0.5);
      const z = this.add
        .zone(0, y, pw - 60, rh - 12)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.selectPause(i))
        .on('pointerdown', () => r.act());
      r.t = t;
      r.bg = bg;
      bg.setData('y', y).setData('w', pw - 60).setData('h', rh - 12);
      items.push(bg, t, z);
    });
    const cy = P ? PORTRAIT.hudH + PORTRAIT.worldH / 2 : 360;
    this.pauseBox = this.add.container(W / 2, cy, items).setDepth(DEPTH.hud + 20);
    this.pauseSel = 0;
    this.prevPausePad = { u: true, d: true, a: true, b: true, s: true };
    this.selectPause(0);
  }

  private selectPause(i: number): void {
    this.pauseSel = Phaser.Math.Wrap(i, 0, this.pauseRows.length);
    this.pauseRows.forEach((r, k) => {
      const on = k === this.pauseSel;
      const bg = r.bg!;
      const w = bg.getData('w') as number;
      const h = bg.getData('h') as number;
      const y = bg.getData('y') as number;
      bg.clear();
      if (on) bg.fillStyle(0xffe066, 1).fillRoundedRect(-w / 2, y - h / 2, w, h, 14);
      r.t?.setColor(on ? '#10223a' : '#fff7dc');
    });
  }

  closePause(): void {
    if (!this.pauseBox) return;
    this.pauseBox.destroy();
    this.pauseBox = undefined;
    this.g.scene.resume();
  }

  /** Navegação da pausa pelo teclado e controle (o jogo está parado, então a interface lê). */
  update(): void {
    if (!this.pauseBox || this.scene.isActive('settings')) return;
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const ay = pad.axes[1]?.getValue() ?? 0;
    const st = { u: b(12) || ay < -0.5, d: b(13) || ay > 0.5, a: b(0), b: b(1), s: b(9) };
    const p = this.prevPausePad;
    if (st.u && !p.u) this.selectPause(this.pauseSel - 1);
    if (st.d && !p.d) this.selectPause(this.pauseSel + 1);
    if (st.a && !p.a) this.pauseRows[this.pauseSel]?.act();
    if ((st.b && !p.b) || (st.s && !p.s)) this.closePause();
    this.prevPausePad = st;
  }

  private bossBox?: Phaser.GameObjects.Container;
  private bossCells: Phaser.GameObjects.Rectangle[] = [];

  /** Alerta antes do chefe: faixa vermelha piscando "PERIGO" (com a tela tremendo de leve). */
  bossWarning(): void {
    const y = VIEW.portrait ? PORTRAIT.hudH + PORTRAIT.worldH * 0.35 : 300;
    const band = this.add.rectangle(W / 2, y, W + 40, 110, 0x7a0a12, 0.85);
    const t = this.add
      .text(W / 2, y, '!  PERIGO  !', { fontFamily: FONT, fontSize: '72px', color: '#ffe066', stroke: '#1a0507', strokeThickness: 10 })
      .setOrigin(0.5);
    const c = this.add.container(0, 0, [band, t]).setDepth(DEPTH.hud + 9).setAlpha(0);
    this.tweens.add({ targets: c, alpha: { from: 0, to: 1 }, duration: 160, yoyo: true, hold: 120, repeat: 3, onComplete: () => c.destroy() });
  }

  /** Barra de vida do chefe em gomos (enche na entrada, esvazia a cada golpe). */
  showBossBar(name: string, title: string, color: number): void {
    this.bossBox?.destroy();
    this.bossCells = [];
    const P = VIEW.portrait;
    const n = 28;
    const cw = P ? 30 : 18;
    const gap = 4;
    const w = n * (cw + gap) + 16;
    const items: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    g.fillStyle(0x1d1a2b, 0.92).fillRect(-w / 2 - 4, -8, w + 8, (P ? 50 : 34) + 12);
    g.fillStyle(0x3a2a44, 1).fillRect(-w / 2, -4, w, (P ? 50 : 34) + 4);
    items.push(g);
    for (let i = 0; i < n; i++) {
      const cell = this.add.rectangle(-w / 2 + 8 + i * (cw + gap), 2, cw, P ? 40 : 26, color).setOrigin(0, 0).setVisible(false);
      this.bossCells.push(cell);
      items.push(cell);
    }
    items.push(
      this.add
        .text(-w / 2, -14, `${name}  ·  ${title}`, { fontFamily: FONT, fontSize: P ? '30px' : '20px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 6 })
        .setOrigin(0, 1),
    );
    const y = P ? PORTRAIT.topPad + PORTRAIT.hudH - 70 : 74;
    this.bossBox = this.add.container(W / 2, y, items).setDepth(DEPTH.hud + 3);
  }

  setBossHp(frac: number): void {
    const on = Math.ceil(frac * this.bossCells.length);
    this.bossCells.forEach((c, i) => c.setVisible(i < on));
  }

  hideBossBar(): void {
    const b = this.bossBox;
    if (!b) return;
    this.tweens.add({ targets: b, alpha: 0, duration: 600, delay: 900, onComplete: () => b.destroy() });
    this.bossBox = undefined;
  }

  private livesBox?: Phaser.GameObjects.Container;

  /** Vidas da fase (modo história): caveirinhas no canto; null = infinitas (∞). */
  setLives(left: number | null, max: number): void {
    this.livesBox?.destroy();
    const P = VIEW.portrait;
    const items: Phaser.GameObjects.GameObject[] = [];
    const s = P ? 0.2 : 0.14;
    if (left === null) {
      items.push(this.add.image(0, 0, 'skull_avatar').setScale(s));
      items.push(this.add.text(26, 0, 'x ∞', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: P ? '34px' : '24px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0, 0.5));
    } else {
      for (let i = 0; i < max; i++) {
        const on = i < left;
        items.push(this.add.image(-i * (P ? 46 : 32), 0, 'skull_avatar').setScale(s).setAlpha(on ? 1 : 0.25).setTint(on ? 0xffffff : 0x445566));
      }
    }
    const x = left === null ? W - (P ? 130 : 96) : W - (P ? 40 : 30);
    const y = P ? PORTRAIT.topPad + 60 : 30;
    this.livesBox = this.add.container(x, y, items).setDepth(DEPTH.hud + 2);
    if (left !== null && left < max) this.tweens.add({ targets: this.livesBox, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.easeOut' });
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

    this.mirrored(() => this.victoryFace(v, mid, color, d));

    // Botões: deitado, embaixo da tela; em pé, no painel de baixo (maiores).
    const split = g.split;
    const by = split ? VIEW.h / 2 + SPLIT.hudS + SPLIT.bandH + 110 : VIEW.portrait ? PORTRAIT.hudH + PORTRAIT.worldH + 200 : 640;
    const sc = split ? 1.15 : VIEW.portrait ? 1.5 : 1;
    this.time.delayedCall(d(1200), () => {
      this.mirrored(() => {
        const next = g.hasNextLevel;
        const side = !VIEW.portrait || split;
        pillButton(this, side ? W / 2 - 170 : W / 2, by, next ? 'CONTINUAR' : 'JOGAR DE NOVO', () => (next ? g.nextLevel() : g.restartMatch()), 280, 0xffe066)
          .setScale(sc)
          .setDepth(DEPTH.hud + 4);
        pillButton(this, side ? W / 2 + 170 : W / 2, side ? by : by + 150, 'MENU', () => g.scene.start('menu', { stage: 'modes' }), 200)
          .setScale(sc)
          .setDepth(DEPTH.hud + 4);
      });
    });
  }

  private victoryFace(v: VictoryInfo, mid: number, color: number, d: (ms: number) => number): void {
    const g = this.g;
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

  }
}
