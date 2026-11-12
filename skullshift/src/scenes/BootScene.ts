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

    this.load.spritesheet('splash', 'fx/splash.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('dust', 'fx/dust.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('transform', 'fx/transform.png', { frameWidth: 192, frameHeight: 192 });
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

    this.makeSky();
    this.makeShield();
    this.makeSpear();
    this.makeSpark();
    this.makeConfetti();

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

  private makeConfetti(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 10, 6);
    g.generateTexture('confetti', 10, 6);
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
