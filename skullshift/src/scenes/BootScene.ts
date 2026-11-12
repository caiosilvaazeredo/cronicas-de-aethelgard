import Phaser from 'phaser';
import { H, W } from '../config';
import { CHARS, type CharId } from '../game/characters';

/** Carrega os sprites, cria animações e gera as texturas desenhadas por código. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    const bar = this.add.rectangle(W / 2 - 200, H / 2, 0, 12, 0xfff7dc).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => (bar.width = 400 * p));

    this.load.setPath('assets');
    for (const id of Object.keys(CHARS) as CharId[]) {
      const d = CHARS[id];
      const fs = { frameWidth: d.frame, frameHeight: d.frame };
      this.load.spritesheet(`${id}_idle`, `chars/${id}_idle.png`, fs);
      this.load.spritesheet(`${id}_run`, `chars/${id}_run.png`, fs);
      this.load.spritesheet(`${id}_attack`, `chars/${id}_attack.png`, fs);
      this.load.image(`${id}_avatar`, `chars/${id}_avatar.png`);
    }
    this.load.spritesheet('skull_guard', 'chars/skull_guard.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('bone', 'chars/bone.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('harpoon', 'chars/harpoon.png');

    this.load.spritesheet('tilemap', 'terrain/tilemap.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('water_rocks', 'terrain/water_rocks.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('bush', 'terrain/bush.png', { frameWidth: 128, frameHeight: 128 });
    for (let i = 1; i <= 8; i++) this.load.image(`cloud_0${i}`, `terrain/cloud_0${i}.png`);
    this.load.image('skull_spike', 'terrain/skull_spike.png');
    this.load.image('bones', 'terrain/bones.png');
    this.load.spritesheet('tree', 'terrain/tree.png', { frameWidth: 192, frameHeight: 256 });
    this.load.image('dead_tree', 'terrain/dead_tree.png');
    this.load.image('rock1', 'terrain/rock1.png');
    this.load.image('rock2', 'terrain/rock2.png');
    this.load.image('stump', 'terrain/stump.png');
    // Logo (opcional: gerada por scripts/build-logo.py). Carregada em 2x para ficar nítida em pé.
    this.load.svg('logo', 'logo/logo.svg', { width: 2400, height: 1280 });

    this.load.spritesheet('splash', 'fx/splash.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('dust', 'fx/dust.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('transform', 'fx/transform.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('shaman_idle', 'chars/shaman_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('shaman_attack', 'chars/shaman_attack.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('water_foam', 'terrain/water_foam.png', { frameWidth: 192, frameHeight: 192 });
  }

  create(): void {
    for (const id of Object.keys(CHARS) as CharId[]) {
      const d = CHARS[id];
      this.anim(`${id}_idle`, d.idle.n, d.idle.fps, -1);
      this.anim(`${id}_run`, d.run.n, d.run.fps, -1);
      this.anim(`${id}_attack`, d.attack.n, d.attack.fps, 0);
    }
    this.anim('skull_guard', 7, 10, -1);
    this.anim('bone', 4, 16, -1);
    this.anim('water_rocks', 16, 8, -1);
    this.anim('bush', 8, 8, -1);
    this.anim('tree', 8, 8, -1);
    this.anim('splash', 9, 18, 0);
    this.anim('dust', 8, 18, 0);
    this.anim('transform', 11, 22, 0);
    this.anim('shaman_idle', 8, 10, -1);
    this.anim('shaman_attack', 10, 14, 0);
    this.anim('water_foam', 16, 10, -1);

    this.makeSky();
    this.makeShield();
    this.makeSpear();
    this.makeCrest();
    this.makeSpark();
    this.makeConfetti();
    this.makeAura();
    this.makePuff();
    this.makeWindAndWaves();

    this.scene.start('menu');
  }

  private anim(key: string, n: number, fps: number, repeat: number): void {
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(key, { start: 0, end: n - 1 }),
      frameRate: fps,
      repeat,
    });
  }

  /** Céu em degradê como no mockup: verde-água no topo, azul-noite no horizonte. */
  private makeSky(): void {
    const tex = this.textures.createCanvas('sky', W, H)!;
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 500);
    g.addColorStop(0, '#59e3b5');
    g.addColorStop(0.3, '#4bb8b0');
    g.addColorStop(0.55, '#3f86a8');
    g.addColorStop(0.8, '#244a6c');
    g.addColorStop(1, '#16263f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
  }

  /** Escudo redondo de madeira (para quem não tem animação de defesa). */
  private makeShield(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x1d1a2b);
    g.fillEllipse(12, 17, 22, 32);
    g.fillStyle(0x8a5a35);
    g.fillEllipse(12, 17, 17, 27);
    g.fillStyle(0x6b4126);
    g.fillRect(11, 4, 2, 26);
    g.fillStyle(0x9fb7b9);
    g.fillCircle(12, 17, 4);
    g.generateTexture('shield', 24, 34);
    g.destroy();
  }

  /** Lança caída no chão (item que vira o Goblin Lanceiro). */
  private makeSpear(): void {
    const g = this.make.graphics({}, false);
    const outline = 0x1d1a2b;
    g.fillStyle(outline);
    g.fillRect(4, 29, 46, 6);
    g.fillTriangle(48, 25, 62, 32, 48, 39);
    g.fillStyle(0x4f7a5a);
    g.fillRect(5, 30, 44, 4);
    g.fillStyle(0x3b5c46);
    g.fillRect(5, 33, 44, 1);
    g.fillStyle(0xbfd6d0);
    g.fillTriangle(49, 27, 60, 32, 49, 37);
    g.fillStyle(0x7fa39b);
    g.fillTriangle(49, 32, 60, 32, 49, 37);
    g.fillStyle(0xd1a35c);
    g.fillRect(44, 29, 3, 6);
    g.generateTexture('spear_item', 64, 64);
    g.destroy();
  }

  /** Texturas de movimento: rajada de vento, folha, cristas de onda e estrela (tontura). */
  private makeWindAndWaves(): void {
    const streak = this.textures.createCanvas('streak', 90, 3)!;
    const sc = streak.getContext();
    const sg = sc.createLinearGradient(0, 0, 90, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = sg;
    sc.fillRect(0, 0, 90, 3);
    streak.refresh();

    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff).fillEllipse(5, 3, 10, 5);
    g.generateTexture('leaf', 10, 6);
    g.clear();

    // Cristas: arcos curtos espalhados num ladrilho que se repete sem emenda.
    const waves = this.textures.createCanvas('waves', 256, 96)!;
    const wc = waves.getContext();
    wc.strokeStyle = 'rgba(220,245,255,0.9)';
    wc.lineWidth = 3;
    wc.lineCap = 'round';
    const crests = [
      [20, 10, 30], [110, 30, 22], [190, 14, 34], [60, 52, 26], [160, 66, 20], [230, 82, 24], [10, 86, 18],
    ];
    for (const [x, y, w] of crests) {
      wc.beginPath();
      for (let i = 0; i <= w; i++) {
        const px = (x + i) % 256;
        const py = y + Math.sin((i / w) * Math.PI) * -4;
        if (i === 0 || px === 0) wc.moveTo(px, py);
        else wc.lineTo(px, py);
      }
      wc.stroke();
    }
    waves.refresh();

    g.fillStyle(0xffffff);
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 8 : 3.5;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
    }
    g.fillPoints(pts.reduce<Phaser.Types.Math.Vector2Like[]>((acc, v, i) => (i % 2 ? (acc[acc.length - 1].y = v, acc) : [...acc, { x: v, y: 0 }]), []), true);
    g.generateTexture('star', 16, 16);
    g.destroy();
  }

  /** Bolinha de fumaça macia (tingida de cinza claro na transformação). */
  private makePuff(): void {
    const tex = this.textures.createCanvas('puff', 64, 64)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(32, 30, 4, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.refresh();
  }

  /** Brilho radial branco (tingido com a cor do jogador). */
  private makeAura(): void {
    const tex = this.textures.createCanvas('aura', 110, 110)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(55, 55, 4, 55, 55, 54);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 110, 110);
    tex.refresh();
  }

  private makeConfetti(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 10, 6);
    g.generateTexture('confetti', 10, 6);
    g.destroy();
  }

  /** Crista do lagarto (item que vira o Lagarto): leque verde com bordas douradas e pontas. */
  private makeCrest(): void {
    const g = this.make.graphics({}, false);
    const cx = 32;
    const cy = 44;
    const ink = 0x1d1a2b;
    const spikes = 7;
    // pontas brancas
    for (let i = 0; i < spikes; i++) {
      const a = Math.PI + (Math.PI * i) / (spikes - 1);
      const x = cx + Math.cos(a) * 30;
      const y = cy + Math.sin(a) * 30;
      g.fillStyle(ink).fillCircle(x, y, 4.5);
      g.fillStyle(0xf4efe6).fillCircle(x, y, 3);
    }
    g.fillStyle(ink).slice(cx, cy, 28, Math.PI, 0, false).fillPath();
    g.fillStyle(0xd8c24a).slice(cx, cy, 25, Math.PI, 0, false).fillPath();
    g.fillStyle(0x3f9a46).slice(cx, cy, 21, Math.PI, 0, false).fillPath();
    g.lineStyle(2, 0xd8c24a, 1);
    for (let i = 1; i < spikes - 1; i++) {
      const a = Math.PI + (Math.PI * i) / (spikes - 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * 21, cy + Math.sin(a) * 21);
    }
    g.fillStyle(ink).fillCircle(cx, cy, 6);
    g.fillStyle(0x7ccf4f).fillCircle(cx, cy, 4);
    g.generateTexture('crest_item', 64, 64);
    g.destroy();
  }

  private makeSpark(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff);
    g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }
}
