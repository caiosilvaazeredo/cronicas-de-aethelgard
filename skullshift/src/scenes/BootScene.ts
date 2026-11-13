import Phaser from 'phaser';
import { makeCrouchAnims } from '../game/crouch';
import { BAT_KING_PALETTE, BAT_PRINCE_PALETTE, BEE_KING_PALETTE, BEE_PRINCE_PALETTE, MINO_BOSS_PALETTE, SPIDER_QUEEN_PALETTE, recolorSheet, shrinkSheet } from '../game/sheets';
import { MINO_SCALE } from '../game/characters';
import { makeVariants } from '../game/variants';
import { makeSeaArt, makeSeaTiles } from '../game/sea';
import { makeFieldTiles } from '../game/field';
import { makeKingShark } from '../game/sharkking';
import { makeGnollKing } from '../game/gnollking';
import { makeBossFx, makeCocoon, makeLavaWave, makePuzzleArt, makeHauntArt, makeHauntBackdrop, makeMapMansion, makeLavaTextures, makeMapVolcano, makeSmoke, makeTorch, makeVolcanoBackdrop } from '../ui/pixelart';
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
      if (d.attackSheets) for (const p of d.attackSheets) this.load.spritesheet(p.key, `chars/${p.key}.png`, fs);
      else this.load.spritesheet(`${id}_attack`, `chars/${id}_attack.png`, fs);
      if (id !== 'villager') this.load.image(`${id}_avatar`, `chars/${id}_avatar.png`);
    }
    // Free Pack: construções (mapa do mundo e cenários), pedras e arbustos animados.
    for (const c of ['blue', 'red', 'yellow', 'purple', 'black'])
      for (const n of ['castle', 'monastery', 'tower', 'house1', 'house2', 'house3', 'barracks', 'archery']) this.load.image(`bld_${c}_${n}`, `bld/${c}_${n}.png`);
    for (let i = 1; i <= 4; i++) {
      this.load.image(`stone${i}`, `terrain/stone${i}.png`);
      this.load.spritesheet(`bush${i}`, `terrain/bush${i}.png`, { frameWidth: 128, frameHeight: 128 });
    }
    this.load.spritesheet('tiles_meadow', 'terrain/tiles_meadow.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('skull_guard', 'chars/skull_guard.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('bone', 'chars/bone.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('harpoon', 'chars/harpoon.png');

    this.load.spritesheet('tilemap', 'terrain/tilemap.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('tiles_cave', 'terrain/tiles_cave.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('tiles_sky', 'terrain/tiles_sky.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('tiles_volcano', 'terrain/tiles_volcano.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('acorn', 'chars/acorn.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('water_rocks', 'terrain/water_rocks.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('bush', 'terrain/bush.png', { frameWidth: 128, frameHeight: 128 });
    for (let i = 1; i <= 8; i++) this.load.image(`cloud_0${i}`, `terrain/cloud_0${i}.png`);
    this.load.image('skull_spike', 'terrain/skull_spike.png');
    this.load.image('bones', 'terrain/bones.png');
    this.load.spritesheet('tree', 'terrain/tree.png', { frameWidth: 192, frameHeight: 256 });
    this.load.image('dead_tree', 'terrain/dead_tree.png');
    this.load.image('rock1', 'terrain/rock1.png');
    // Recursos (Tiny Swords): ferramentas das habilidades, presentes e objetos das fases de chave.
    for (const k of ['tool_hammer', 'tool_axe', 'tool_sword', 'tool_pickaxe', 'meat', 'wood', 'gold', 'gold_stone', 'gold_stone_big', 'stump']) this.load.image(k, `res/${k}.png`);
    this.load.spritesheet('sheep_idle', 'res/sheep_idle.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('sheep_move', 'res/sheep_move.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('res_tree', 'res/tree.png', { frameWidth: 192, frameHeight: 192 });
    this.load.image('rock2', 'terrain/rock2.png');
    this.load.image('stump', 'terrain/stump.png');
    // Logo (opcional: gerada por scripts/build-logo.py). Carregada em 2x para ficar nítida em pé.
    this.load.svg('logo', 'logo/logo.svg', { width: 2400, height: 1280 });
    // Silhueta do controle (tela Como jogar): fica fora de assets/ porque é arte própria.
    this.load.svg('xbox', '../ui/xbox-controller.svg', { width: 960, height: 640 });
    this.load.svg('keyboard_sil', '../ui/keyboard.svg', { width: 1120, height: 480 });

    this.load.spritesheet('splash', 'fx/splash.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('dust', 'fx/dust.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('transform', 'fx/transform.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('shaman_idle', 'chars/shaman_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('shaman_attack', 'chars/shaman_attack.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('water_foam', 'terrain/water_foam.png', { frameWidth: 192, frameHeight: 192 });
  }

  create(): void {
    // Chefes: folhas recoloridas à mão (antes de encolher o Minotauro comum).
    for (const k of ['idle', 'run', 'attack']) {
      recolorSheet(this, `minotaur_${k}`, `boss_mino_${k}`, 320, 320, MINO_BOSS_PALETTE);
      recolorSheet(this, `spider_${k}`, `boss_spider_${k}`, 192, 192, SPIDER_QUEEN_PALETTE);
      // Príncipes e reis (morcegos e abelhas), também com paletas feitas à mão.
      recolorSheet(this, `bat_${k}`, `prince_bat_${k}`, 192, 192, BAT_PRINCE_PALETTE);
      recolorSheet(this, `bat_${k}`, `king_bat_${k}`, 192, 192, BAT_KING_PALETTE);
      recolorSheet(this, `bee_${k}`, `prince_bee_${k}`, 192, 192, BEE_PRINCE_PALETTE);
      recolorSheet(this, `bee_${k}`, `king_bee_${k}`, 192, 192, BEE_KING_PALETTE);
    }
    // O Minotauro comum fica menor (72%), com os pés no mesmo lugar.
    for (const k of ['idle', 'run', 'attack']) shrinkSheet(this, `minotaur_${k}`, 320, 320, MINO_SCALE, CHARS.minotaur.feetY);
    for (const id of Object.keys(CHARS) as CharId[]) {
      const d = CHARS[id];
      this.anim(`${id}_idle`, d.idle.n, d.idle.fps, -1);
      this.anim(`${id}_run`, d.run.n, d.run.fps, -1);
      if (d.attackSheets) {
        // Ataque montado de várias folhas, em sequência.
        this.anims.create({
          key: `${id}_attack`,
          frames: d.attackSheets.flatMap((p) => this.anims.generateFrameNumbers(p.key, { start: 0, end: p.n - 1 })),
          frameRate: d.attack.fps,
          repeat: 0,
        });
      } else this.anim(`${id}_attack`, d.attack.n, d.attack.fps, 0);
    }
    this.anim('skull_guard', 7, 10, -1);
    this.anim('sheep_idle', 6, 8, -1);
    this.anim('sheep_move', 4, 10, -1);
    this.anim('res_tree', 8, 8, -1);
    this.anim('boss_mino_idle', 16, 12, -1);
    this.anim('boss_mino_run', 8, 12, -1);
    this.anim('boss_mino_attack', 12, 14, 0);
    this.anim('boss_spider_idle', 8, 10, -1);
    this.anim('boss_spider_run', 5, 14, -1);
    this.anim('boss_spider_attack', 8, 16, 0);
    this.anim('prince_bat_idle', CHARS.bat.idle.n, CHARS.bat.idle.fps, -1);
    this.anim('prince_bat_attack', CHARS.bat.attack.n, CHARS.bat.attack.fps, 0);
    this.anim('king_bat_idle', CHARS.bat.idle.n, CHARS.bat.idle.fps, -1);
    this.anim('king_bat_attack', CHARS.bat.attack.n, CHARS.bat.attack.fps, 0);
    this.anim('prince_bee_idle', CHARS.bee.idle.n, CHARS.bee.idle.fps, -1);
    this.anim('prince_bee_attack', CHARS.bee.attack.n, CHARS.bee.attack.fps, 0);
    this.anim('king_bee_idle', CHARS.bee.idle.n, CHARS.bee.idle.fps, -1);
    this.anim('king_bee_attack', CHARS.bee.attack.n, CHARS.bee.attack.fps, 0);
    makeCrouchAnims(this);
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
    this.makeCaveAndHighSky();
    this.anim('acorn', 4, 14, -1);
    this.makeShield();
    this.makeSpear();
    this.makeCrest();
    this.makeNewItems();
    this.makePixelWebs();
    this.makeBubble();
    this.makeVolcano();
    makeTorch(this);
    makeCocoon(this);
    makeBossFx(this);
    makeLavaWave(this);
    makePuzzleArt(this);
    makeVariants(this);
    for (let i = 1; i <= 4; i++) this.anim(`bush${i}`, 8, 8, -1);
    this.makeVillagerAvatar();
    makeSeaTiles(this);
    makeFieldTiles(this);
    makeSeaArt(this);
    makeKingShark(this);
    makeGnollKing(this);
    makeHauntArt(this);
    makeHauntBackdrop(this, 'haunt_bg', W, H);
    makeMapMansion(this, 'map_mansion');
    this.makeSpark();
    this.makeConfetti();
    this.makeAura();
    this.makePuff();
    this.makeWindAndWaves();

    this.scene.start('menu');
  }

  /** Retrato do aldeão (o pacote não tem): o rosto recortado do primeiro quadro, ampliado. */
  private makeVillagerAvatar(): void {
    const src = this.textures.get('villager_idle').getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 62, 56, 68, 68, 0, 0, 256, 256);
    this.textures.addCanvas('villager_avatar', c);
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
  /** Fundo da caverna (estalactites) e céu alto (fase 3), mais a gota que pinga. */
  private makeCaveAndHighSky(): void {
    const cave = this.textures.createCanvas('cave_bg', W, H)!;
    const c = cave.getContext();
    const g = c.createLinearGradient(0, 0, 0, 520);
    g.addColorStop(0, '#0b1d24');
    g.addColorStop(0.6, '#163a44');
    g.addColorStop(1, '#0f2a32');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // Estalactites (silhuetas penduradas do teto) em duas camadas.
    const rnd = new Phaser.Math.RandomDataGenerator(['stalactites']);
    for (const [color, maxH] of [['#1e4a55', 260], ['#0e252d', 170]] as const) {
      c.fillStyle = color;
      for (let x = -20; x < W; x += rnd.between(40, 90)) {
        const w = rnd.between(30, 70);
        const h = rnd.between(60, maxH);
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + w, 0);
        c.quadraticCurveTo(x + w * 0.65, h * 0.6, x + w / 2, h);
        c.quadraticCurveTo(x + w * 0.35, h * 0.6, x, 0);
        c.fill();
      }
    }
    cave.refresh();

    const sky = this.textures.createCanvas('sky_high', W, H)!;
    const k = sky.getContext();
    const sg = k.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#7fd3ff');
    sg.addColorStop(0.55, '#a9e2ff');
    sg.addColorStop(1, '#e3f6ff');
    k.fillStyle = sg;
    k.fillRect(0, 0, W, H);
    sky.refresh();

    const d = this.make.graphics({}, false);
    d.fillStyle(0xbfe9ff).fillEllipse(3, 6, 5, 10);
    d.generateTexture('drop', 6, 12);
    d.destroy();
  }

  /**
   * Teias em pixel art (linhas de 1px com contorno escuro, como o resto do jogo):
   * 'web_px' para o teto da caverna e 'web_item' para o item.
   */
  private makePixelWebs(): void {
    const draw = (key: string, w: number, h: number, cx: number, cy: number, radius: number, rings: number[]) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, w, h)!;
      const c = tex.getContext();
      const px = new Set<string>();
      const line = (x0: number, y0: number, x1: number, y1: number) => {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          px.add(`${x0},${y0}`);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      };
      const spokes = 8;
      const pt = (i: number, r: number) => {
        const a = (i / spokes) * Math.PI * 2 + 0.2;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85];
      };
      for (let i = 0; i < spokes; i++) {
        const [x, y] = pt(i, radius);
        line(cx, cy, x, y);
      }
      for (const r of rings) {
        for (let i = 0; i < spokes; i++) {
          const [x0, y0] = pt(i, r);
          const [x1, y1] = pt(i + 1, r * 0.92);
          line(x0, y0, x1, y1);
        }
      }
      // Contorno escuro (vizinhos de cada pixel de seda), depois a seda clara por cima.
      c.fillStyle = '#1d1a2b';
      for (const k of px) {
        const [x, y] = k.split(',').map(Number);
        c.fillRect(x - 1, y - 1, 3, 3);
      }
      c.fillStyle = '#eef6f8';
      for (const k of px) {
        const [x, y] = k.split(',').map(Number);
        c.fillRect(x, y, 1, 1);
      }
      // Gotinhas de orvalho.
      c.fillStyle = '#9fe3ff';
      for (let i = 0; i < spokes; i += 2) {
        const [x, y] = pt(i, rings[1] ?? rings[0]);
        c.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      tex.refresh();
    };
    draw('web_px', 112, 84, 56, 36, 50, [12, 24, 37]);
    draw('web_item', 64, 64, 32, 32, 27, [8, 16, 24]);
  }

  /** Bolha de energia (defesa de quem não tem escudo), tingida com a cor do jogador. */
  private makeBubble(): void {
    const tex = this.textures.createCanvas('bubble', 128, 128)!;
    const c = tex.getContext();
    const g = c.createRadialGradient(64, 64, 20, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.04)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.93, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(64, 64, 58, 0, Math.PI * 2);
    c.stroke();
    // Brilho no canto de cima.
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(64, 64, 46, Math.PI * 1.1, Math.PI * 1.4);
    c.stroke();
    tex.refresh();
  }

  /** Fundo do vulcão e o chifre do Minotauro. */
  private makeVolcano(): void {
    const { craters } = makeVolcanoBackdrop(this, 'volcano_bg', W, H);
    this.registry.set('volcanoCraters', craters);
    makeSmoke(this);
    makeLavaTextures(this);
    this.anims.create({ key: 'lava_bubble', frames: [0, 1, 2, 3, 4, 5].map((frame) => ({ key: 'lava_bubble', frame })), frameRate: 11 });
    makeMapVolcano(this, 'map_volcano');

    const h = this.make.graphics({}, false);
    h.fillStyle(0x1d1a2b);
    h.fillPoints([{ x: 10, y: 54 }, { x: 22, y: 30 }, { x: 40, y: 14 }, { x: 56, y: 8 }, { x: 46, y: 20 }, { x: 34, y: 36 }, { x: 28, y: 58 }], true);
    h.fillStyle(0xeee3c8);
    h.fillPoints([{ x: 14, y: 52 }, { x: 25, y: 31 }, { x: 41, y: 17 }, { x: 52, y: 11 }, { x: 43, y: 21 }, { x: 31, y: 37 }, { x: 25, y: 54 }], true);
    h.fillStyle(0xc9b88f).fillRect(14, 46, 12, 6);
    h.generateTexture('horn_item', 64, 64);
    h.destroy();
  }

  /** Itens das fases 2 e 3: teia, asa, tocha, favo de mel e brasa. */
  private makeNewItems(): void {
    const ink = 0x1d1a2b;
    const g = this.make.graphics({}, false);
    // Teia (Aranha)
    g.lineStyle(4, ink).strokeCircle(32, 32, 22).strokeCircle(32, 32, 12);
    g.lineStyle(2, 0xf2f2f2);
    g.strokeCircle(32, 32, 22).strokeCircle(32, 32, 12);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.lineStyle(4, ink).lineBetween(32, 32, 32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
      g.lineStyle(2, 0xf2f2f2).lineBetween(32, 32, 32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
    }
    g.generateTexture('web_item', 64, 64);
    g.clear();
    // Asa (Morcego): membrana roxa com pontas
    const wing = [8, 24, 30, 12, 56, 18, 50, 30, 42, 26, 36, 38, 28, 30, 18, 40];
    g.fillStyle(ink).fillPoints(wing.reduce<Phaser.Types.Math.Vector2Like[]>((acc, v, i) => (i % 2 ? (acc[acc.length - 1].y = v + 2, acc) : [...acc, { x: v, y: 0 }]), []), true);
    g.fillStyle(0x7a57a8).fillPoints(wing.reduce<Phaser.Types.Math.Vector2Like[]>((acc, v, i) => (i % 2 ? (acc[acc.length - 1].y = v, acc) : [...acc, { x: v, y: 0 }]), []), true);
    g.lineStyle(2, 0x4a3470).lineBetween(30, 14, 30, 30).lineBetween(30, 14, 44, 26);
    g.generateTexture('wing_item', 64, 64);
    g.clear();
    // Tocha (Goblin da Tocha)
    g.fillStyle(ink).fillRect(27, 26, 10, 32);
    g.fillStyle(0x8a5a35).fillRect(29, 28, 6, 28);
    g.fillStyle(ink).fillCircle(32, 20, 12);
    g.fillStyle(0xff9f1c).fillCircle(32, 20, 10);
    g.fillStyle(0xffe066).fillCircle(32, 23, 6);
    g.fillStyle(0xff9f1c).fillTriangle(24, 18, 40, 18, 32, 2);
    g.generateTexture('torch_item', 64, 64);
    g.clear();
    // Favo de mel (Abelhão)
    const hex = (cx: number, cy: number, r: number, color: number) => {
      const pts = [];
      for (let i = 0; i < 6; i++) pts.push({ x: cx + Math.cos((i * Math.PI) / 3) * r, y: cy + Math.sin((i * Math.PI) / 3) * r });
      g.fillStyle(color).fillPoints(pts, true);
    };
    for (const [x, y] of [[24, 24], [40, 24], [32, 38], [16, 38], [48, 38]]) {
      hex(x, y, 10, ink);
      hex(x, y, 8, 0xf2c230);
      hex(x, y - 1, 4, 0xffe28a);
    }
    g.generateTexture('honey_item', 64, 64);
    g.clear();
    // Brasa (Diabrete): chama viva
    g.fillStyle(ink).fillCircle(32, 38, 15).fillTriangle(17, 36, 47, 36, 32, 6);
    g.fillStyle(0xe5533d).fillCircle(32, 38, 13).fillTriangle(20, 36, 44, 36, 32, 10);
    g.fillStyle(0xff9f1c).fillCircle(32, 41, 9).fillTriangle(25, 40, 39, 40, 32, 20);
    g.fillStyle(0xffe066).fillCircle(32, 44, 5);
    g.generateTexture('ember_item', 64, 64);
    g.destroy();
  }

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
