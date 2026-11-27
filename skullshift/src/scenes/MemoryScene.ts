import Phaser from 'phaser';
import { noTr, tr } from '../i18n';
import { playMusic } from '../game/music';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { MEMORIES, type Memory } from '../data/lore';
import type { DeviceId } from '../game/controls';
import { markSeen } from '../game/progress';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';
import { drawHills, drawMountains } from '../ui/props';

const INK = 0x1d1a2b;
const COLS = 9;
type Obj = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * Memória (uma a cada fragmento recuperado; o Diário deixa rever): uma lembrança antiga em sépia,
 * como um filme velho (faixas de cinema, grão, riscos e tremulação), com a câmera andando devagar.
 * Cada fala da caveira dispara uma ação na cena (o aldeão anda, a lanterna sobe, a figura de
 * roxo aparece...), então a memória "acontece" enquanto ela lembra.
 */
export class MemoryScene extends Phaser.Scene {
  private devices: DeviceId[] = ['kb-full'];
  private n = 1;
  private area?: string;
  private lines: string[] = [];
  private index = -1;
  private text!: Phaser.GameObjects.Text;
  private typing?: Phaser.Time.TimerEvent;
  private full = '';
  private prevA = true;
  private leaving = false;
  /** Tudo o que é da cena (a câmera "anda" movendo e aproximando este container). */
  private world!: Phaser.GameObjects.Container;
  private ground = 470;
  /** Topo da faixa de baixo (onde fica o texto). */
  private barY = 560;
  private H = 720;
  /** Quem é quem em cada cena (para as ações de cada fala). */
  private cast: Record<string, Obj> = {};
  lastData: { devices?: DeviceId[]; n?: number; area?: string } = {};

  constructor() {
    super('memory');
  }

  init(data: { devices?: DeviceId[]; n?: number; area?: string }): void {
    this.lastData = data;
    this.devices = data.devices ?? ['kb-full'];
    this.n = Phaser.Math.Clamp(data.n ?? 1, 1, MEMORIES.length);
    this.area = data.area;
    this.index = -1;
    this.typing = undefined;
    this.prevA = true;
    this.leaving = false;
    this.cast = {};
  }

  create(): void {
    playMusic('memory');
    const P = VIEW.portrait;
    const H = (this.H = this.scale.height);
    const m = MEMORIES[this.n - 1];
    markSeen(`memory-${this.n}`);
    const cam = this.cameras.main;
    const fx = cam.postFX?.addColorMatrix();
    fx?.sepia();
    cam.postFX?.addVignette(0.5, 0.5, 0.85, 0.5);
    cam.fadeIn(1100, 0, 0, 0);

    const topBar = P ? 200 : 64;
    this.barY = P ? H - 560 : H - 160;
    this.ground = P ? Math.min(H * 0.55, this.barY - 120) : 470;
    this.world = this.add.container(0, 0);
    this.drawScene(m);
    this.filmEffects(topBar);

    // Faixas de cinema: entram por cima e por baixo.
    const top = this.add.rectangle(0, -topBar, W, topBar, 0x050308).setOrigin(0).setDepth(30);
    const bot = this.add.rectangle(0, H, W, H - this.barY, 0x050308).setOrigin(0).setDepth(30);
    this.tweens.add({ targets: top, y: 0, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: bot, y: this.barY, duration: 900, ease: 'Cubic.easeOut' });

    // Título: aparece no meio, como cartão de filme mudo, e sobe para a faixa de cima.
    const title = this.add
      .text(W / 2, H * 0.4, `MEMÓRIA ${this.n}/${MEMORIES.length} · ${m.title.toUpperCase()}`, { fontFamily: FONT, fontSize: P ? '44px' : '34px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(32)
      .setAlpha(0);
    if (title.width > W - 60) title.setScale((W - 60) / title.width);
    const ts = title.scale;
    this.tweens.chain({
      targets: title,
      tweens: [
        { alpha: 1, scale: { from: ts * 1.15, to: ts }, duration: 700, ease: 'Cubic.easeOut' },
        { y: topBar / 2, scale: ts * (P ? 0.8 : 0.72), duration: 700, delay: 900, ease: 'Cubic.easeInOut' },
      ],
    });

    this.text = this.add
      .text(P ? 60 : 110, this.barY + (P ? 40 : 26), '', { fontFamily: BODY_FONT, fontSize: P ? '38px' : '25px', color: '#fff7dc', fontStyle: 'italic', wordWrap: { width: W - (P ? 120 : 420) }, lineSpacing: 8 })
      .setDepth(32);
    pillButton(this, P ? W / 2 : W - 170, P ? H - 140 : this.barY + 80, 'CONTINUAR ▶', () => this.advance(), 230, 0xffe066)
      .setScale(P ? 1.3 : 0.8)
      .setDepth(33);
    this.lines = m.lines;
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.advance();
    });
    const kb = this.input.keyboard!;
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.advance());
    kb.on('keydown-ESC', () => this.leave());
    this.time.delayedCall(2300, () => this.advance());
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const a = !!pad.buttons[0]?.pressed;
    if (a && !this.prevA) this.advance();
    this.prevA = a;
  }

  private advance(): void {
    if (this.leaving) return;
    if (this.typing) {
      this.typing.remove();
      this.typing = undefined;
      this.text.setText(this.full);
      return;
    }
    this.index++;
    if (this.index >= this.lines.length) return this.leave();
    this.beat(MEMORIES[this.n - 1].scene, this.index);
    this.full = `"${tr(this.lines[this.index])}"`;
    let k = 0;
    this.text.setText('');
    this.typing = this.time.addEvent({
      delay: 30,
      repeat: this.full.length - 1,
      callback: () => {
        k++;
        noTr(this.text);
        this.text.setText(this.full.slice(0, k));
        if (k % 4 === 0 && this.full[k - 1] !== ' ') sfx('click', 1.6);
        if (k >= this.full.length) this.typing = undefined;
      },
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    const cam = this.cameras.main;
    // A lembrança se apaga: clareia e some.
    this.tweens.add({ targets: this.world, scale: this.world.scale * 1.08, duration: 900, ease: 'Sine.easeIn' });
    cam.fadeOut(900, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.start('world', { devices: this.devices, area: this.area }));
  }

  // ---------- filme velho ----------

  private filmEffects(topBar: number): void {
    const H = this.H;
    // Tremulação da luz do projetor.
    const flick = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(25);
    this.time.addEvent({ delay: 90, loop: true, callback: () => flick.setFillStyle(0x000000, Math.random() < 0.08 ? 0.12 : Math.random() * 0.04) });
    // Grão: pontinhos claros e escuros piscando pela tela.
    this.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: W },
        y: { min: topBar, max: this.barY },
        lifespan: 90,
        scale: { min: 0.04, max: 0.1 },
        alpha: { min: 0.2, max: 0.55 },
        tint: [0xffffff, 0x2a1a0a],
        frequency: 14,
      })
      .setDepth(26);
    // Riscos verticais que aparecem e somem.
    const scratch = this.add.rectangle(0, topBar, 2, this.barY - topBar, 0xfff7dc, 0).setOrigin(0).setDepth(26);
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const on = Math.random() < 0.3;
        scratch.setPosition(Math.random() * W, topBar).setFillStyle(Math.random() < 0.5 ? 0xfff7dc : 0x1a1008, on ? 0.35 : 0).setSize(on ? 1 + Math.random() * 2 : 2, this.barY - topBar);
      },
    });
    // Câmera andando devagar: aproxima e desliza um pouco durante a memória toda.
    this.world.setScale(1);
    this.tweens.add({ targets: this.world, scale: 1.06, x: -W * 0.03, y: -this.ground * 0.04, duration: 16000, ease: 'Sine.easeInOut' });
  }

  // ---------- peças do cenário ----------

  private put<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.world.add(o);
    return o;
  }

  private img(x: number, y: number, key: string, scale = 1, oy = 1): Phaser.GameObjects.Image {
    return this.put(this.add.image(x, y, key).setOrigin(0.5, oy).setScale(scale));
  }

  private sky(night: boolean, moon = true): void {
    const H = this.H;
    const X0 = -W;
    const WW = W * 3;
    const g = this.put(this.add.graphics());
    // Céu em faixas (mais claro perto do horizonte).
    const bands = night ? [0x10162a, 0x161f38, 0x1d2946, 0x243456] : [0x7fc4ec, 0x8fcff0, 0xa6dbf4, 0xbfe6f8];
    bands.forEach((c, i) => g.fillStyle(c, 1).fillRect(X0, i === 0 ? -H : (i * this.ground) / bands.length, WW, this.ground / bands.length + 1 + (i === 0 ? H : 0)));
    g.fillStyle(bands[bands.length - 1], 1).fillRect(X0, this.ground, WW, H - this.ground);
    if (night && !moon) {
      // Céu de chuva: nuvens pesadas em vez da lua.
      for (let i = 0; i < 5; i++) this.img(i * 300, 70 + (i % 2) * 30, `cloud_0${(i % 4) + 5}`, 1.1, 0.5).setTint(0x50586a);
    } else if (night) {
      const moon = this.put(this.add.graphics());
      moon.fillStyle(0xfff7dc, 0.18).fillCircle(W * 0.8, 130, 70);
      moon.fillStyle(0xf4f0d0, 1).fillCircle(W * 0.8, 130, 40);
      moon.fillStyle(0xd8d0b0, 1).fillCircle(W * 0.8 + 12, 122, 8).fillCircle(W * 0.8 - 10, 140, 5);
      for (let i = 0; i < 40; i++) {
        const s = this.put(this.add.rectangle(((i * 337) % W) + 10, 70 + ((i * 89) % (this.ground - 160)), 3, 3, 0xfff7dc));
        this.tweens.add({ targets: s, alpha: 0.2, duration: 600 + ((i * 131) % 900), yoyo: true, repeat: -1 });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const c = this.img(150 + i * 340, 110 + (i % 2) * 50, `cloud_0${i + 1}`, 0.8, 0.5).setAlpha(0.95);
        this.tweens.add({ targets: c, x: c.x + 60, duration: 14000 + i * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  /** Montanhas e morros ao fundo (dia). */
  private far(seed = 13): void {
    // Cordilheira baixinha ao longe (achatada) e morros mais perto.
    const k = 0.5;
    const g = this.put(this.add.graphics());
    drawMountains(g, -W, W * 2.2, this.ground + 6, seed);
    g.setScale(1, k).setY((this.ground + 6) * (1 - k));
    const h = this.put(this.add.graphics());
    drawHills(h, [-W * 0.3, W * 0.12, W * 0.5, W * 0.88, W * 1.3, W * 1.7], this.ground + 30, 520, 160, 0x5fae55, 0x86c873);
  }

  /** Chão de grama até a faixa de baixo. */
  private strip(y: number, key = 'tilemap', tint = 0xffffff): void {
    for (let x = -W; x < W * 2; x += 64) {
      this.put(this.add.image(x, y, key, 1).setOrigin(0).setTint(tint));
      for (let r = 1; y + r * 64 < this.H; r++) this.put(this.add.image(x, y + r * 64, key, (r === 1 ? 1 : 2) * COLS + 1).setOrigin(0).setTint(tint));
    }
  }

  private villager(x: number, feet: number, anim = 'villager_idle', scale = 2, flip = false): Phaser.GameObjects.Sprite {
    return this.put(this.add.sprite(x, feet, anim).setOrigin(0.5, 134 / 192).setScale(scale).setFlipX(flip).play(anim));
  }

  /** Anda até x (correndo) e para. */
  private walk(s: Phaser.GameObjects.Sprite, x: number, ms: number, then?: () => void): void {
    s.setFlipX(x < s.x).play('villager_run');
    this.tweens.add({
      targets: s,
      x,
      duration: ms,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (s.active) s.play('villager_idle');
        then?.();
      },
    });
  }

  private river(y: number, night: boolean): void {
    this.put(this.add.rectangle(-W, y, W * 3, this.H - y, night ? 0x1d3a5a : 0x39b5fd).setOrigin(0));
    const w = this.put(this.add.tileSprite(-W, y + 6, W * 3, this.H - y, 'waves').setOrigin(0).setAlpha(0.5));
    this.tweens.add({ targets: w, tilePositionX: 256, duration: 8000, repeat: -1 });
  }

  /** Ponte de tábuas (a da Vila da Ponte), sobre o rio, de x0 a x1. */
  private bridge(y: number, x0 = 140, x1 = W - 140): void {
    const g = this.put(this.add.graphics());
    g.fillStyle(INK, 1).fillRect(x0, y - 4, x1 - x0, 22);
    g.fillStyle(0x9a6a3a, 1).fillRect(x0 + 4, y, x1 - x0 - 8, 14);
    for (let x = x0 + 10; x < x1 - 10; x += 40) g.fillStyle(0x6a4020, 1).fillRect(x, y, 3, 14);
    for (let x = x0 + 20; x < x1; x += 120) {
      g.fillStyle(INK, 1).fillRect(x - 3, y - 70, 10, 74);
      g.fillStyle(0x8a5a2a, 1).fillRect(x - 1, y - 68, 6, 70);
      g.fillStyle(INK, 1).fillRect(x - 3, y + 18, 10, 140);
      g.fillStyle(0x6a4020, 1).fillRect(x - 1, y + 18, 6, 140);
    }
    g.fillStyle(INK, 1).fillRect(x0 + 10, y - 64, x1 - x0 - 20, 6);
    g.fillStyle(0xa0703a, 1).fillRect(x0 + 12, y - 63, x1 - x0 - 24, 4);
  }

  private lantern(x: number, y: number): Phaser.GameObjects.Container {
    const glow = this.add.image(0, 0, 'aura').setTint(0xffc060).setScale(0.55).setAlpha(0.65).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRect(-8, -10, 16, 20);
    g.fillStyle(0xffd36b, 1).fillRect(-6, -8, 12, 16);
    g.fillStyle(0xd84a2a, 1).fillRect(-6, -8, 12, 3);
    const c = this.put(this.add.container(x, y, [glow, g]));
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 500 + Math.random() * 400, yoyo: true, repeat: -1 });
    return c;
  }

  /** Brilho quente na janela/porta de uma casa. */
  private windowGlow(x: number, y: number, scale = 0.6): Phaser.GameObjects.Image {
    const g = this.put(this.add.image(x, y, 'aura').setTint(0xffb347).setScale(scale).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.tweens.add({ targets: g, alpha: 0.75, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return g;
  }

  /** Balãozinho com um símbolo (♪, !, ...) que sobe e some. */
  private mark(x: number, y: number, s: string, size = 46): void {
    const t = noTr(this.put(this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 8 }).setOrigin(0.5)));
    t.setScale(0);
    this.tweens.chain({ targets: t, tweens: [{ scale: 1, duration: 260, ease: 'Back.easeOut' }, { y: y - 30, alpha: 0, delay: 1300, duration: 700 }], onComplete: () => t.destroy() });
  }

  /** Escurece (ou clareia) a cena aos poucos: o fim da tarde, a lembrança apagando. */
  private dim(alpha: number, ms: number, color = 0x0a0614): Phaser.GameObjects.Rectangle {
    const r = this.put(this.add.rectangle(-W, -this.H, W * 3, this.H * 3, color, 0).setOrigin(0));
    this.tweens.add({ targets: r, fillAlpha: alpha, duration: ms });
    return r;
  }

  // ---------- o quadro de cada memória ----------

  private drawScene(m: Memory): void {
    const night = ['lanterns', 'rain', 'purple', 'water', 'name'].includes(m.scene);
    const G = this.ground;
    const c = this.cast;
    if (m.scene !== 'water' && m.scene !== 'name') this.sky(night, !['rain', 'purple'].includes(m.scene));
    switch (m.scene) {
      case 'home': {
        // A casa azul perto do mar: o mar ao fundo, à direita.
        this.far(7);
        this.put(this.add.rectangle(W * 0.62, G - 26, W * 0.5, 34, 0x39b5fd).setOrigin(0));
        this.strip(G);
        this.put(this.add.sprite(W * 0.14, G + 10, 'tree').setOrigin(0.5, 1).setScale(1).play('tree'));
        c.house = this.img(W * 0.36, G + 10, 'bld_blue_house1', 1.6);
        c.glow = this.windowGlow(W * 0.36 - 28, G - 80, 0.5);
        c.v = this.villager(W * 0.78, G + 18, 'villager_idle', 2, false);
        break;
      }
      case 'wood': {
        this.far(21);
        this.strip(G);
        this.put(this.add.sprite(W * 0.22, G + 10, 'tree').setOrigin(0.5, 1).setScale(1.15).play('tree'));
        this.put(this.add.sprite(W * 0.86, G + 10, 'tree').setOrigin(0.5, 1).setScale(0.9).play('tree'));
        c.stump = this.img(W * 0.5, G + 16, 'stump', 1.6);
        for (let i = 0; i < 3; i++) this.img(W * 0.66 + i * 26, G + 16 - (i % 2) * 18, 'wood', 1.2);
        c.v = this.villager(W * 0.57, G + 18, 'villager_idle', 2, true);
        break;
      }
      case 'sheep': {
        c.sun = this.put(this.add.circle(W * 0.82, 150, 46, 0xfff1a8));
        this.far(33);
        this.strip(G, 'tilemap', 0xf0e0a0);
        this.img(W * 0.08, G + 10, 'bld_blue_house3', 1.1);
        const sheep: Array<[number, boolean]> = [[0.24, false], [0.4, true], [0.82, false]];
        sheep.forEach(([x, f], i) => {
          const s = this.put(this.add.sprite(W * x, G + 12, 'sheep_move').setOrigin(0.5, 0.85).setScale(1.4).setFlipX(f).play('sheep_move'));
          this.tweens.add({ targets: s, x: s.x + (f ? -60 : 60), duration: 2600 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => s.toggleFlipX(), onRepeat: () => s.toggleFlipX() });
        });
        c.v = this.villager(W * 0.56, G + 18, 'villager_idle', 2);
        c.sis = this.villager(W * 0.66, G + 18, 'villager_idle', 1.3, true);
        break;
      }
      case 'village': {
        this.far(5);
        // O rio e a ponte velha ficam à direita (a câmera chega lá na segunda fala).
        this.strip(G);
        const houses: Array<[number, string, number]> = [[0.1, 'bld_blue_house2', 1.25], [0.28, 'bld_blue_house3', 1.25], [0.48, 'bld_blue_tower', 1.1], [0.66, 'bld_blue_house1', 1.25]];
        for (const [x, k, sc] of houses) this.img(W * x, G + 10, k, sc);
        this.windowGlow(W * 0.28, G - 60, 0.45);
        for (const [x, f] of [[0.38, false], [0.58, true]] as const) this.villager(W * x, G + 18, 'villager_idle', 1.6, f).setTint(0xd8c0a0);
        this.put(this.add.rectangle(W * 0.82, G, W * 1.2, this.H, 0x39b5fd).setOrigin(0));
        const w = this.put(this.add.tileSprite(W * 0.82, G + 6, W * 1.2, this.H, 'waves').setOrigin(0).setAlpha(0.5));
        this.tweens.add({ targets: w, tilePositionX: 256, duration: 8000, repeat: -1 });
        this.bridge(G - 4, W * 0.8, W * 1.4);
        c.v = this.villager(W * 0.02, G + 18, 'villager_idle', 2);
        break;
      }
      case 'lanterns': {
        this.river(G - 40, true);
        this.bridge(G - 60);
        c.v = this.villager(W * 0.44, G - 52, 'villager_idle', 1.9);
        c.sis = this.villager(W * 0.52, G - 52, 'villager_idle', 1.25, true);
        for (const x of [0.22, 0.7, 0.8]) this.villager(W * x, G - 52, 'villager_idle', 1.6, x > 0.5).setTint(0x9a8a7a);
        // Algumas lanternas já no rio.
        for (let i = 0; i < 5; i++) {
          const l = this.lantern(90 + i * 260, G + 40 + (i % 2) * 40);
          this.tweens.add({ targets: l, x: l.x + 80, y: l.y + 8, duration: 5000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        break;
      }
      case 'rain': {
        this.river(G - 40, true);
        this.bridge(G - 60);
        c.v = this.villager(W * 0.2, G - 52, 'villager_idle', 1.9);
        c.sis = this.villager(W * 0.86, G - 52, 'villager_idle', 1.2, true).setAlpha(0);
        this.put(this.add.particles(0, -20, 'streak', { x: { min: -100, max: W + 100 }, speedY: { min: 700, max: 900 }, speedX: -80, lifespan: 1200, scaleX: 0.05, scaleY: 0.5, rotate: 80, alpha: 0.6, frequency: 10 }));
        // Pingos batendo no rio.
        this.put(this.add.particles(0, G - 20, 'spark', { x: { min: 0, max: W }, y: { min: 0, max: 120 }, lifespan: 300, scale: { start: 0.25, end: 0 }, alpha: 0.6, tint: 0xbfe9ff, frequency: 30 }));
        this.time.addEvent({ delay: 3400, loop: true, callback: () => this.cameras.main.flash(120, 255, 255, 255) });
        break;
      }
      case 'purple': {
        this.river(G - 40, true);
        this.bridge(G - 60);
        this.put(this.add.particles(0, -20, 'streak', { x: { min: -100, max: W + 100 }, speedY: { min: 600, max: 800 }, speedX: -60, lifespan: 1200, scaleX: 0.04, scaleY: 0.4, rotate: 80, alpha: 0.4, frequency: 30 }));
        c.v = this.villager(W * 0.4, G - 52, 'villager_idle', 1.9);
        // Uma figura de roxo, sem rosto: chega aos poucos.
        c.aura = this.put(this.add.image(W * 0.62, G - 130, 'aura').setTint(0x9b6bf0).setScale(0.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
        c.sh = this.put(this.add.sprite(W * 0.62, G - 52, 'shaman_idle').setOrigin(0.5, 133 / 192).setScale(1.9).setFlipX(true).play('shaman_idle').setTintFill(0x4a2a6a).setAlpha(0));
        break;
      }
      case 'water': {
        // Debaixo d'água: escuro, raios de luz da superfície e bolhas.
        const H = this.H;
        const g = this.put(this.add.graphics());
        [0x1a4a6a, 0x143a58, 0x0f2c46, 0x0a1f34, 0x061424].forEach((col, i) => g.fillStyle(col, 1).fillRect(0, (i * H) / 5, W, H / 5 + 1));
        for (let i = 0; i < 5; i++) {
          const ray = this.put(this.add.rectangle(W * (0.15 + i * 0.18), -40, 60 + (i % 2) * 40, H * 0.9, 0xbfe9ff, 0.07).setOrigin(0.5, 0).setAngle(12).setBlendMode(Phaser.BlendModes.ADD));
          this.tweens.add({ targets: ray, alpha: 0.4, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        const surf = this.put(this.add.tileSprite(0, 0, W, 40, 'waves').setOrigin(0).setAlpha(0.35));
        this.tweens.add({ targets: surf, tilePositionX: 256, duration: 6000, repeat: -1 });
        c.v = this.villager(W * 0.5, 120, 'villager_idle', 1.9).setAngle(60).setAlpha(0.85);
        c.bub = this.put(this.add.particles(0, 0, 'spark', { follow: c.v, followOffset: { x: 0, y: -40 }, speedY: { min: -90, max: -50 }, speedX: { min: -20, max: 20 }, lifespan: 2200, scale: { start: 0.3, end: 0.08 }, alpha: { start: 0.8, end: 0 }, tint: 0xbfe9ff, frequency: 160 }));
        break;
      }
      case 'name': {
        const H = this.H;
        this.put(this.add.rectangle(0, 0, W, H, 0x1a1424).setOrigin(0));
        // Páginas soltas de lembranças passando ao fundo.
        for (let i = 0; i < 8; i++) {
          const p = this.put(this.add.rectangle(((i * 211) % W) + 40, 120 + ((i * 97) % (G - 80)), 90, 60, 0xd9b478, 0.12).setAngle(-10 + ((i * 7) % 20)));
          this.tweens.add({ targets: p, y: p.y - 40, angle: p.angle + 8, duration: 4000 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        c.glow = this.put(this.add.image(W / 2, G - 150, 'aura').setTint(0xffe0a0).setScale(2).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD));
        c.ava = this.put(this.add.image(W / 2, G - 150, 'villager_avatar').setScale(VIEW.portrait ? 1.6 : 1.25).setAlpha(0.85));
        this.tweens.add({ targets: c.ava, y: c.ava.y - 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        // O nome que o Xamã deu, em letras que vão rachar.
        const letters = 'OSSIAN'.split('');
        letters.forEach((ch, i) => {
          const t = noTr(this.put(this.add.text(W / 2 + (i - 2.5) * 62, G - 330, ch, { fontFamily: FONT, fontSize: '68px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 10 }).setOrigin(0.5).setAlpha(0)));
          this.tweens.add({ targets: t, alpha: 1, y: t.y + 10, delay: 1200 + i * 120, duration: 400 });
          c[`l${i}`] = t;
        });
        break;
      }
    }
  }

  /** O que acontece em cada fala (i = 0, 1, ...). */
  private beat(scene: Memory['scene'], i: number): void {
    const c = this.cast;
    const G = this.ground;
    const v = c.v as Phaser.GameObjects.Sprite | undefined;
    switch (scene) {
      case 'home':
        if (i === 0) {
          // Olha o mar, depois a casa.
          this.time.delayedCall(1400, () => v?.setFlipX(true));
        } else {
          // Alguém chama lá de dentro: a janela acende e ele vai até a porta.
          this.tweens.add({ targets: c.glow, scale: 0.9, alpha: 1, duration: 600 });
          this.mark(W * 0.36 + 40, G - 190, '!');
          this.time.delayedCall(500, () => v && this.walk(v, W * 0.46, 1800, () => this.mark(v.x + 30, G - 150, '?', 40)));
        }
        break;
      case 'wood':
        if (i === 0) {
          // Racha lenha: cada golpe solta lascas.
          let n = 0;
          const chop = () => {
            if (!v?.active || n++ > 5) return void v?.play('villager_idle');
            v.play('villager_attack');
            v.once('animationcomplete', () => {
              for (let k = 0; k < 4; k++) {
                const ch = this.img(W * 0.5, G - 10, 'wood', 0.4, 0.5);
                this.tweens.add({ targets: ch, x: ch.x + Phaser.Math.Between(-80, 80), y: ch.y - Phaser.Math.Between(30, 80), angle: Phaser.Math.Between(-200, 200), alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => ch.destroy() });
              }
              this.cameras.main.shake(80, 0.002);
              chop();
            });
          };
          chop();
        } else {
          // Para e respira fundo: o cheiro da madeira sobe.
          v?.play('villager_idle');
          this.put(this.add.particles(W * 0.5, G - 10, 'spark', { x: { min: -40, max: 40 }, speedY: { min: -40, max: -20 }, speedX: { min: -10, max: 10 }, lifespan: 2600, scale: { start: 0.18, end: 0.4 }, alpha: { start: 0.5, end: 0 }, tint: 0xfff7dc, frequency: 140 }));
          this.time.delayedCall(800, () => v && this.mark(v.x, G - 150, '...', 40));
        }
        break;
      case 'sheep':
        if (i === 0) {
          // A irmã vai atrás dele, colada.
          const sis = c.sis as Phaser.GameObjects.Sprite;
          v && this.walk(v, W * 0.42, 2000);
          this.time.delayedCall(300, () => {
            sis.setFlipX(true).play('villager_run');
            this.tweens.add({ targets: sis, x: W * 0.5, duration: 2000, ease: 'Sine.easeInOut', onComplete: () => sis.play('villager_idle') });
          });
        } else {
          // O sol se põe; os dois voltam para casa antes de escurecer.
          this.tweens.add({ targets: c.sun, y: G + 40, duration: 5000, ease: 'Sine.easeIn' });
          this.dim(0.45, 5000);
          this.time.delayedCall(900, () => {
            const sis = c.sis as Phaser.GameObjects.Sprite;
            v && this.walk(v, W * 0.14, 3200);
            sis.setFlipX(true).play('villager_run');
            this.tweens.add({ targets: sis, x: W * 0.2, duration: 3300, ease: 'Sine.easeInOut', onComplete: () => sis.play('villager_idle') });
          });
        }
        break;
      case 'village':
        if (i === 0) {
          v && this.walk(v, W * 0.76, 3600);
        } else {
          // A câmera vai até o rio e a ponte velha.
          this.tweens.killTweensOf(this.world);
          this.tweens.add({ targets: this.world, x: -W * 0.42, scale: 1.08, duration: 2600, ease: 'Sine.easeInOut' });
          this.time.delayedCall(400, () => v && this.walk(v, W * 0.96, 2400));
        }
        break;
      case 'lanterns':
        if (i === 0) {
          // Os dois soltam lanternas da ponte, uma de cada vez.
          for (let k = 0; k < 3; k++) {
            this.time.delayedCall(400 + k * 1100, () => {
              const from = k % 2 ? (c.sis as Obj) : (c.v as Obj);
              const l = this.lantern(from.x, G - 110);
              this.tweens.add({ targets: l, y: G + 50 + k * 20, x: from.x + 60 + k * 40, duration: 1600, ease: 'Sine.easeInOut' });
              this.tweens.add({ targets: l, x: `+=${300 + k * 80}`, delay: 1600, duration: 9000, ease: 'Sine.easeInOut' });
            });
          }
        } else {
          // Uma luz quente enche a tela: a mesma de quando ele cai.
          const g = this.put(this.add.image(W / 2, G, 'aura').setTint(0xffc060).setScale(1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
          this.tweens.add({ targets: g, scale: 9, alpha: 0.8, duration: 3500, ease: 'Sine.easeIn' });
        }
        break;
      case 'rain':
        if (i === 0) {
          // Atravessa devagar; escorrega no meio e se equilibra.
          if (!v) break;
          this.walk(v, W * 0.46, 2600, () => {
            this.tweens.add({ targets: v, angle: { from: -18, to: 14 }, duration: 220, yoyo: true, repeat: 2, onComplete: () => v.setAngle(0) });
            this.mark(v.x, G - 200, '!');
          });
        } else {
          // Um raio mostra a irmã do outro lado; ele corre até ela.
          this.cameras.main.flash(260, 255, 255, 255);
          this.tweens.add({ targets: c.sis, alpha: 1, duration: 300 });
          this.time.delayedCall(700, () => v && this.walk(v, W * 0.68, 2000));
        }
        break;
      case 'purple':
        if (i === 0) {
          // A figura surge da chuva e estende a mão.
          this.tweens.add({ targets: c.aura, scale: 2.2, alpha: 0.55, duration: 2200, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: c.sh, alpha: 0.95, duration: 2200 });
          this.time.delayedCall(2300, () => {
            const sh = c.sh as Phaser.GameObjects.Sprite;
            if (!sh.active) return;
            sh.play('shaman_attack');
            sh.once('animationcomplete', () => sh.active && sh.play('shaman_idle'));
          });
          v && this.time.delayedCall(1600, () => this.walk(v, W * 0.36, 600, () => v.setFlipX(false)));
        } else {
          // Não se sabe: um clarão, a tela gira, e ele cai.
          this.time.delayedCall(600, () => {
            this.cameras.main.flash(300, 200, 160, 255);
            this.cameras.main.shake(400, 0.01);
            if (v) this.tweens.add({ targets: v, y: G + 200, angle: 80, alpha: 0, duration: 1400, ease: 'Quad.easeIn' });
            this.dim(0.6, 1800);
          });
        }
        break;
      case 'water':
        if (i === 0) {
          // Afunda devagar.
          this.tweens.add({ targets: v, y: G - 10, angle: 85, duration: 5500, ease: 'Sine.easeInOut' });
        } else {
          // Uma nuvem roxa desce até ele; tudo fica roxo.
          const cl = this.put(this.add.image(W / 2, -120, 'cloud_05').setScale(0.9).setTint(0xb48aff).setAlpha(0.9));
          this.tweens.add({ targets: cl, y: G - 160, duration: 3000, ease: 'Sine.easeOut' });
          const glow = this.put(this.add.image(W / 2, G - 100, 'aura').setTint(0x9b6bf0).setScale(1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
          this.tweens.add({ targets: glow, scale: 8, alpha: 0.7, delay: 1200, duration: 2600 });
          this.tweens.add({ targets: v, y: G - 120, angle: 20, delay: 1500, duration: 2600, ease: 'Sine.easeInOut' });
        }
        break;
      case 'name':
        if (i === 0) {
          // O nome racha: as letras caem uma a uma; fica a pergunta.
          for (let k = 0; k < 6; k++) {
            const t = c[`l${k}`] as Phaser.GameObjects.Text;
            this.tweens.add({ targets: t, y: t.y + 260, angle: Phaser.Math.Between(-60, 60), alpha: 0, delay: 900 + k * 180, duration: 900, ease: 'Quad.easeIn' });
          }
          this.time.delayedCall(2200, () => {
            const q = noTr(this.put(this.add.text(W / 2 + 160, G - 280, '?', { fontFamily: FONT, fontSize: '110px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 12 }).setOrigin(0.5).setScale(0)));
            this.tweens.add({ targets: q, scale: 1, duration: 400, ease: 'Back.easeOut' });
            this.tweens.add({ targets: q, angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1, delay: 400 });
          });
        } else {
          // Falta pouco: o rosto fica mais nítido e a luz cresce.
          this.tweens.add({ targets: c.ava, alpha: 1, scale: (c.ava as Obj).scale * 1.15, duration: 2400 });
          this.tweens.add({ targets: c.glow, scale: 4, alpha: 0.5, duration: 2400 });
        }
        break;
    }
  }
}
