import Phaser from 'phaser';
import { noTr, tr } from '../i18n';
import { playMusic } from '../game/music';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { MEMORIES, type Memory } from '../data/lore';
import type { DeviceId } from '../game/controls';
import { markSeen } from '../game/progress';
import { pillButton } from '../ui/devices';

const INK = 0x1d1a2b;
const COLS = 9;

/**
 * Memória (uma a cada fragmento recuperado): um quadro em sépia, como uma lembrança antiga,
 * mostrando quem a caveira era — um aldeão (Pawn do Free Pack) — e os pensamentos dela.
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
  }

  create(): void {
    playMusic('memory');
    const H = this.scale.height;
    const m = MEMORIES[this.n - 1];
    markSeen(`memory-${this.n}`);
    const cam = this.cameras.main;
    // A lembrança em sépia, com bordas escuras.
    const fx = cam.postFX?.addColorMatrix();
    fx?.sepia();
    cam.postFX?.addVignette(0.5, 0.5, 0.85, 0.5);
    cam.fadeIn(900, 0, 0, 0);

    const ground = VIEW.portrait ? H * 0.55 : 470;
    this.drawScene(m, ground);

    this.add
      .text(W / 2, VIEW.portrait ? 160 : 44, `MEMÓRIA ${this.n}/${MEMORIES.length} · ${m.title.toUpperCase()}`, { fontFamily: FONT, fontSize: VIEW.portrait ? '44px' : '32px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(20);
    const by = VIEW.portrait ? H - 520 : H - 170;
    const bh = VIEW.portrait ? 300 : 140;
    const g = this.add.graphics().setDepth(19);
    g.fillStyle(0x07040c, 0.78).fillRect(60, by, W - 120, bh);
    g.lineStyle(3, 0xfff7dc, 0.6).strokeRect(60, by, W - 120, bh);
    this.text = this.add
      .text(100, by + 26, '', { fontFamily: BODY_FONT, fontSize: VIEW.portrait ? '38px' : '26px', color: '#fff7dc', fontStyle: 'italic', wordWrap: { width: W - 220 }, lineSpacing: 8 })
      .setDepth(20);
    pillButton(this, W - 190, by + bh + (VIEW.portrait ? 120 : 0) - (VIEW.portrait ? 0 : 30), 'CONTINUAR ▶', () => this.advance(), 230, 0xffe066)
      .setScale(VIEW.portrait ? 1.3 : 0.8)
      .setDepth(21);
    this.lines = m.lines;
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.advance();
    });
    const kb = this.input.keyboard!;
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.advance());
    kb.on('keydown-ESC', () => this.leave());
    this.time.delayedCall(700, () => this.advance());
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const a = !!pad.buttons[0]?.pressed;
    if (a && !this.prevA) this.advance();
    this.prevA = a;
  }

  private advance(): void {
    if (this.typing) {
      this.typing.remove();
      this.typing = undefined;
      this.text.setText(this.full);
      return;
    }
    this.index++;
    if (this.index >= this.lines.length) return this.leave();
    this.full = `"${tr(this.lines[this.index])}"`;
    let k = 0;
    this.text.setText('');
    this.typing = this.time.addEvent({
      delay: 28,
      repeat: this.full.length - 1,
      callback: () => {
        k++;
        noTr(this.text);
        this.text.setText(this.full.slice(0, k));
        if (k >= this.full.length) this.typing = undefined;
      },
    });
  }

  private leave(): void {
    const cam = this.cameras.main;
    cam.fadeOut(700, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.start('world', { devices: this.devices, area: this.area }));
  }

  // ---------- o quadro de cada memória ----------

  private strip(y: number, key = 'tilemap', tint = 0xffffff): void {
    for (let x = 0; x < W; x += 64) {
      this.add.image(x, y, key, 1).setOrigin(0).setTint(tint);
      this.add.image(x, y + 64, key, COLS + 1).setOrigin(0).setTint(tint);
      this.add.image(x, y + 128, key, 2 * COLS + 1).setOrigin(0).setTint(tint);
    }
  }

  private villager(x: number, feet: number, anim = 'villager_idle', scale = 1.6, flip = false): Phaser.GameObjects.Sprite {
    return this.add.sprite(x, feet, anim).setOrigin(0.5, 134 / 192).setScale(scale).setFlipX(flip).play(anim);
  }

  private river(y: number, h: number, night: boolean): void {
    this.add.rectangle(0, y, W, h, night ? 0x1d3a5a : 0x39b5fd).setOrigin(0);
    const w = this.add.tileSprite(0, y + 6, W, h, 'waves').setOrigin(0).setAlpha(0.5);
    this.tweens.add({ targets: w, tilePositionX: 256, duration: 8000, repeat: -1 });
  }

  /** Ponte de tábuas (a da Vila da Ponte), sobre o rio. */
  private bridge(y: number): void {
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRect(140, y - 4, W - 280, 22);
    g.fillStyle(0x9a6a3a, 1).fillRect(144, y, W - 288, 14);
    for (let x = 150; x < W - 150; x += 40) g.fillStyle(0x6a4020, 1).fillRect(x, y, 3, 14);
    for (let x = 160; x < W - 140; x += 120) {
      g.fillStyle(INK, 1).fillRect(x - 3, y - 70, 10, 74);
      g.fillStyle(0x8a5a2a, 1).fillRect(x - 1, y - 68, 6, 70);
    }
    g.fillStyle(INK, 1).fillRect(150, y - 64, W - 300, 6);
    g.fillStyle(0xa0703a, 1).fillRect(152, y - 63, W - 304, 4);
  }

  private lanterns(y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const x = 80 + ((i * 197) % (W - 160));
      const ly = y + ((i * 53) % 90);
      const glow = this.add.image(x, ly, 'aura').setTint(0xffc060).setScale(0.5).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
      const g = this.add.graphics();
      g.fillStyle(INK, 1).fillRect(x - 7, ly - 9, 14, 18);
      g.fillStyle(0xffd36b, 1).fillRect(x - 5, ly - 7, 10, 14);
      g.fillStyle(0xd84a2a, 1).fillRect(x - 5, ly - 7, 10, 3);
      this.tweens.add({ targets: [g, glow], y: '-=14', x: '+=10', duration: 1800 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private drawScene(m: Memory, ground: number): void {
    const night = ['lanterns', 'rain', 'purple', 'water'].includes(m.scene);
    const H = this.scale.height;
    this.add.rectangle(0, 0, W, H, night ? 0x1a2238 : 0x8fcff0).setOrigin(0);
    if (!night) for (let i = 0; i < 3; i++) this.add.image(200 + i * 420, 120 + (i % 2) * 40, `cloud_0${i + 1}`).setScale(0.8).setAlpha(0.9);
    switch (m.scene) {
      case 'home':
        this.river(ground + 40, H, false);
        this.strip(ground, 'tilemap');
        this.add.image(W * 0.38, ground + 8, 'bld_blue_house1').setOrigin(0.5, 1).setScale(1.3);
        this.add.sprite(W * 0.18, ground + 10, 'tree').setOrigin(0.5, 1).setScale(0.9).play('tree');
        this.villager(W * 0.62, ground + 18, 'villager_idle', 1.7, true);
        break;
      case 'wood':
        this.strip(ground, 'tilemap');
        this.add.sprite(W * 0.3, ground + 10, 'tree').setOrigin(0.5, 1).setScale(1).play('tree');
        this.add.image(W * 0.52, ground + 14, 'stump').setOrigin(0.5, 1).setScale(1.4);
        this.add.image(W * 0.7, ground + 14, 'wood').setOrigin(0.5, 1).setScale(1.2);
        this.villager(W * 0.58, ground + 18, 'villager_attack', 1.7, true);
        break;
      case 'sheep':
        this.strip(ground, 'tilemap', 0xf0e0a0);
        for (const [x, f] of [[0.2, false], [0.34, true], [0.78, false]] as const) this.add.sprite(W * x, ground + 12, 'sheep_move').setOrigin(0.5, 0.85).setScale(1.2).setFlipX(f).play('sheep_move');
        this.villager(W * 0.5, ground + 18, 'villager_idle', 1.7);
        this.villager(W * 0.6, ground + 18, 'villager_idle', 1.1, true);
        break;
      case 'village':
        this.strip(ground, 'tilemap');
        for (const [x, k, sc] of [[0.14, 'bld_blue_house2', 1.1], [0.32, 'bld_blue_house3', 1.1], [0.66, 'bld_blue_tower', 1], [0.84, 'bld_blue_house1', 1.1]] as const)
          this.add.image(W * x, ground + 10, k).setOrigin(0.5, 1).setScale(sc);
        this.villager(W * 0.5, ground + 18, 'villager_run', 1.7);
        break;
      case 'lanterns':
        this.river(ground - 40, H, true);
        this.bridge(ground - 60);
        this.lanterns(ground - 10, 9);
        this.villager(W * 0.46, ground - 52, 'villager_idle', 1.6);
        this.villager(W * 0.54, ground - 52, 'villager_idle', 1.05, true);
        break;
      case 'rain':
        this.river(ground - 40, H, true);
        this.bridge(ground - 60);
        this.villager(W * 0.4, ground - 52, 'villager_run', 1.6);
        this.add.particles(0, -20, 'streak', { x: { min: 0, max: W }, speedY: { min: 700, max: 900 }, speedX: -80, lifespan: 1200, scaleX: 0.05, scaleY: 0.5, rotate: 80, alpha: 0.6, frequency: 12 });
        this.time.addEvent({ delay: 3200, loop: true, callback: () => this.cameras.main.flash(120, 255, 255, 255) });
        break;
      case 'purple': {
        this.river(ground - 40, H, true);
        this.bridge(ground - 60);
        this.villager(W * 0.42, ground - 52, 'villager_idle', 1.6);
        // Uma figura de roxo, sem rosto, estendendo a mão.
        const sh = this.add.sprite(W * 0.6, ground - 52, 'shaman_idle').setOrigin(0.5, 133 / 192).setScale(1.7).setFlipX(true).play('shaman_idle');
        sh.setTintFill(0x6a4a8a).setAlpha(0.95);
        this.add.image(sh.x, sh.y - 80, 'aura').setTint(0x9b6bf0).setScale(1.6).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
        break;
      }
      case 'water': {
        this.add.rectangle(0, 0, W, H, 0x10304a).setOrigin(0);
        const v = this.villager(W * 0.5, ground - 40, 'villager_idle', 1.6).setAngle(70).setAlpha(0.8);
        this.tweens.add({ targets: v, y: v.y + 30, angle: 85, duration: 4000, ease: 'Sine.easeInOut' });
        this.add.particles(W * 0.5, ground - 80, 'spark', { speedY: { min: -80, max: -40 }, speedX: { min: -20, max: 20 }, lifespan: 2400, scale: { start: 0.3, end: 0.1 }, alpha: { start: 0.8, end: 0 }, tint: 0xbfe9ff, frequency: 200 });
        this.add.image(W * 0.5, 90, 'cloud_05').setScale(1).setTint(0xb48aff).setAlpha(0.8);
        break;
      }
      case 'name': {
        this.add.rectangle(0, 0, W, H, 0x2a2238).setOrigin(0);
        const a = this.add.image(W / 2, ground - 120, 'villager_avatar').setScale(VIEW.portrait ? 1.6 : 1.2);
        this.tweens.add({ targets: a, alpha: 0.6, duration: 1200, yoyo: true, repeat: -1 });
        this.add.text(W / 2 + 150, ground - 220, '?', { fontFamily: FONT, fontSize: '96px', color: '#fff7dc', stroke: '#1d1a2b', strokeThickness: 10 }).setOrigin(0.5);
        break;
      }
    }
  }
}
