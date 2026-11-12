import Phaser from 'phaser';
import { BODY_FONT, FONT } from '../config';
import { CHAPTERS } from '../data/lore';
import type { DeviceId } from '../game/controls';
import { completedCount, currentSlot, isFreePlay } from '../game/progress';
import { pillButton } from '../ui/devices';

const MW = 1280;
const MH = 720;
const COLS = 9;
const INK = 0x1d1a2b;

/** Trilha do mapa (pontos por onde o esqueleto anda) e em qual ponto fica cada fase. */
const PATH: Array<[number, number]> = [
  [270, 548], [400, 610], [540, 590], [662, 520],
  [800, 540], [930, 470], [1050, 392],
  [1010, 270], [830, 205], [648, 162],
];
const NODE_AT = [0, 3, 6, 9];

/**
 * Seleção de fase do modo história, como um mapa-múndi de plataforma: ilhas da maré,
 * a boca da caverna, o vulcão e o santuário nas nuvens, ligados por uma trilha.
 * Fases ainda não liberadas ficam trancadas; o esqueleto anda pelo caminho.
 */
export class MapScene extends Phaser.Scene {
  private devices: DeviceId[] = ['kb-full'];
  private unlocked = 0;
  private current = 0;
  private walking = false;
  private hero!: Phaser.GameObjects.Sprite;
  private heroAura!: Phaser.GameObjects.Image;
  private info!: Phaser.GameObjects.Text;
  private infoTitle!: Phaser.GameObjects.Text;
  private nodes: Phaser.GameObjects.Container[] = [];
  private prevPad = { l: false, r: false, a: true, b: true };
  lastData: { devices?: DeviceId[]; justCompleted?: number } = {};

  constructor() {
    super('map');
  }

  init(data: { devices?: DeviceId[]; justCompleted?: number }): void {
    this.lastData = data;
    this.devices = data.devices ?? ['kb-full'];
    this.unlocked = Math.min(CHAPTERS.length - 1, completedCount());
    const from = data.justCompleted;
    this.current = from !== undefined ? Math.min(from, this.unlocked) : this.unlocked;
    this.walking = false;
    this.nodes = [];
    this.prevPad = { l: false, r: false, a: true, b: true };
  }

  create(): void {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#39b5fd');
    // Em pé, o mapa (1280x720) fica centralizado na tela alta.
    cam.centerOn(MW / 2, MH / 2);

    this.drawSea();
    this.drawIslands();
    this.drawPath();
    this.drawNodes();

    this.heroAura = this.add.image(0, 0, 'aura').setTint(0x2f86e0).setScale(0.7).setAlpha(0.8).setDepth(19);
    this.hero = this.add.sprite(0, 0, 'skull_idle').play('skull_idle').setScale(0.75).setDepth(20);
    this.placeHero(PATH[NODE_AT[this.current]]);

    this.add
      .text(MW / 2, 40, isFreePlay() ? 'MODO LIVRE · TESTES' : `SELECIONAR FASE · SAVE ${currentSlot()}`, { fontFamily: FONT, fontSize: '42px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(30);
    const g = this.add.graphics().setDepth(29);
    g.fillStyle(0x10223a, 0.9).fillRoundedRect(30, MH - 118, 760, 100, 16);
    g.lineStyle(3, 0xfff7dc, 0.8).strokeRoundedRect(30, MH - 118, 760, 100, 16);
    this.infoTitle = this.add.text(52, MH - 100, '', { fontFamily: FONT, fontSize: '26px', color: '#ffe066' }).setDepth(30);
    this.info = this.add
      .text(52, MH - 64, '', { fontFamily: BODY_FONT, fontSize: '18px', color: '#fff7dc', wordWrap: { width: 720 } })
      .setDepth(30);
    pillButton(this, MW - 170, MH - 70, 'ENTRAR  ▶', () => this.enter(), 240, 0xffe066).setDepth(30);
    pillButton(this, 110, 40, '◀ MENU', () => this.scene.start('menu', { stage: 'modes' }), 170).setScale(0.75).setDepth(30);
    this.updateInfo();

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.step(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.step(1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.enter());
    kb.on('keydown-ESC', () => this.scene.start('menu', { stage: 'modes' }));

    // Acabou de concluir uma fase: a seguinte se abre e o esqueleto vai até ela.
    const done = this.lastData.justCompleted;
    if (done !== undefined && this.unlocked > done) {
      const node = this.nodes[this.unlocked];
      this.cameras.main.flash(200, 255, 247, 220);
      this.tweens.add({ targets: node, scale: { from: 1.6, to: 1 }, duration: 600, ease: 'Back.easeOut' });
      this.burst(node.x, node.y);
      this.time.delayedCall(500, () => this.walkTo(this.unlocked));
    }
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const ax = pad.axes[0]?.getValue() ?? 0;
    const st = {
      l: !!pad.buttons[14]?.pressed || ax < -0.5,
      r: !!pad.buttons[15]?.pressed || ax > 0.5,
      a: !!pad.buttons[0]?.pressed,
      b: !!pad.buttons[1]?.pressed,
    };
    if (st.l && !this.prevPad.l) this.step(-1);
    if (st.r && !this.prevPad.r) this.step(1);
    if (st.a && !this.prevPad.a) this.enter();
    if (st.b && !this.prevPad.b) this.scene.start('menu', { stage: 'modes' });
    this.prevPad = st;
  }

  // ---------- desenho ----------

  private drawSea(): void {
    const s = this.add.tileSprite(-MW, -MH * 2, MW * 3, MH * 5, 'waves').setOrigin(0).setAlpha(0.35).setDepth(0);
    this.tweens.add({ targets: s, tilePositionX: 256, duration: 9000, repeat: -1 });
    const rng = new Phaser.Math.RandomDataGenerator(['map-rocks']);
    for (let i = 0; i < 18; i++) {
      this.add
        .sprite(rng.between(20, MW - 20), rng.between(90, MH - 140), 'water_rocks')
        .setScale(rng.realInRange(1, 1.5))
        .setDepth(1)
        .play({ key: 'water_rocks', startFrame: rng.between(0, 15) });
    }
    for (let i = 0; i < 4; i++) {
      this.add.image(rng.between(0, MW), rng.between(60, 260), `cloud_0${i + 1}`).setAlpha(0.5).setScale(0.6).setDepth(25);
    }
  }

  /** Ilha plana (nove-fatias do bloco de grama do tileset), com espuma em volta. */
  private island(tx: number, ty: number, w: number, h: number, key = 'tilemap', tint = 0xffffff): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.add
          .sprite(tx * 64 + i * 64 + 32, ty * 64 + j * 64 + 32, 'water_foam')
          .setDepth(2)
          .play({ key: 'water_foam', startFrame: (i + j) % 16 });
      }
    }
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const col = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const row = j === 0 ? 0 : j === h - 1 ? 2 : 1;
        this.add.image(tx * 64 + i * 64, ty * 64 + j * 64, key, row * COLS + col).setOrigin(0).setDepth(3).setTint(tint);
      }
    }
  }

  /** Planalto elevado (bloco com penhasco do tileset). */
  private plateau(tx: number, ty: number, w: number, key: string, tint = 0xffffff): void {
    for (let i = 0; i < w; i++) {
      const col = w === 1 ? 8 : i === 0 ? 5 : i === w - 1 ? 7 : 6;
      const x = tx * 64 + i * 64;
      this.add.image(x, ty * 64, key, 3 * COLS + col).setOrigin(0).setDepth(4).setTint(tint);
      this.add.image(x, ty * 64 + 64, key, 5 * COLS + col).setOrigin(0).setDepth(4).setTint(tint);
    }
  }

  private drawIslands(): void {
    // 1) Ilhas da Maré: ilha verde com árvores e os marcos de caveira.
    this.island(2, 7, 5, 3);
    for (const [x, y] of [[170, 500], [430, 520]] as const) {
      this.add.sprite(x, y, 'tree').setOrigin(0.5, 1).setScale(0.55).setDepth(6).play('tree');
    }
    this.add.image(210, 600, 'skull_spike').setOrigin(0.5, 1).setScale(0.7).setDepth(6);
    this.add.image(360, 640, 'rock1').setDepth(6);

    // 2) Caverna Úmida: planalto de pedra com a boca escura da caverna.
    this.island(8, 7, 5, 3, 'tiles_cave');
    this.plateau(9, 6, 3, 'tiles_cave');
    const cave = this.add.graphics().setDepth(5);
    cave.fillStyle(INK, 1).fillEllipse(672, 470, 74, 62);
    cave.fillStyle(0x08141a, 1).fillEllipse(672, 474, 60, 50);
    this.add.image(632, 432, 'web_px').setScale(0.6).setDepth(5);

    // 3) Forja Vulcânica: ilha chamuscada com um vulcão de pixels e lava.
    this.island(14, 5, 5, 4, 'tiles_volcano', 0xd28e78);
    this.add.image(1055, 388, 'map_volcano').setOrigin(0.5, 1).setDepth(5);
    this.add
      .particles(1055, 262, 'vsmoke_1', {
        speedY: { min: -22, max: -12 },
        speedX: { min: 4, max: 12 },
        lifespan: 3600,
        scale: { start: 0.67, end: 1.33 },
        alpha: { start: 0.95, end: 0 },
        frequency: 700,
      })
      .setDepth(6);
    this.add
      .particles(1055, 264, 'spark', {
        speedY: { min: -60, max: -30 },
        speedX: { min: -12, max: 12 },
        lifespan: 1200,
        scale: { start: 0.3, end: 0 },
        tint: [0xffb347, 0xff6a1a],
        frequency: 160,
      })
      .setDepth(6);

    // 4) Santuário das Nuvens: nuvem encantada flutuando no alto, com o santuário.
    const c = this.add.graphics().setDepth(5);
    c.fillStyle(0xb27cff, 0.22).fillRoundedRect(520, 120, 260, 92, 30);
    c.fillStyle(0xb9a6ee, 1).fillRoundedRect(530, 140, 240, 62, 24);
    c.fillStyle(0xf4eeff, 1).fillRoundedRect(534, 134, 232, 58, 22);
    for (let x = 548; x <= 752; x += 24) c.fillStyle(0xffffff, 1).fillCircle(x, 136, 13);
    c.lineStyle(3, 0x9b6bf0, 0.9).strokeRoundedRect(530, 126, 240, 76, 22);
    const t = this.add.graphics().setDepth(5);
    t.fillStyle(0xb9a6ee, 1);
    t.fillRect(600, 84, 18, 50).fillRect(688, 96, 16, 38).fillCircle(650, 116, 26);
    t.fillTriangle(596, 84, 622, 84, 609, 58).fillTriangle(684, 96, 708, 96, 696, 74);
    this.tweens.add({ targets: [c, t], y: -6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Trilha de pontinhos (com contorno escuro) ligando as fases. */
  private drawPath(): void {
    const g = this.add.graphics().setDepth(7);
    const reach = NODE_AT[this.unlocked];
    for (let i = 0; i < PATH.length - 1; i++) {
      const [x0, y0] = PATH[i];
      const [x1, y1] = PATH[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const open = i < reach;
      for (let d = 0; d < len; d += 20) {
        const x = Math.round(x0 + ((x1 - x0) * d) / len);
        const y = Math.round(y0 + ((y1 - y0) * d) / len);
        g.fillStyle(INK, 1).fillRect(x - 6, y - 6, 12, 12);
        g.fillStyle(open ? 0xe8d9a8 : 0x8a95a3, 1).fillRect(x - 4, y - 4, 8, 8);
      }
    }
  }

  /** Medalhão de cada fase: dourado; concluída com ✓, liberada pulsando, trancada com cadeado. */
  private drawNodes(): void {
    const done = completedCount();
    NODE_AT.forEach((pi, i) => {
      const [x, y] = PATH[pi];
      const g = this.add.graphics();
      const locked = i > this.unlocked;
      const cleared = i < done;
      g.fillStyle(INK, 1).fillCircle(0, 0, 30);
      g.fillStyle(locked ? 0x8a95a3 : 0xd8a530, 1).fillCircle(0, 0, 26);
      g.fillStyle(locked ? 0x5f6872 : 0xffe066, 1).fillCircle(0, -2, 20);
      g.fillStyle(locked ? 0x3b4450 : cleared ? 0x58b947 : 0x2f86e0, 1).fillCircle(0, 0, 14);
      const items: Phaser.GameObjects.GameObject[] = [g];
      if (locked) {
        // Cadeado em pixels.
        g.fillStyle(INK, 1).fillRect(-9, -2, 18, 14);
        g.lineStyle(4, INK, 1).strokeRect(-6, -11, 12, 10);
        g.fillStyle(0xcfd6dc, 1).fillRect(-7, 0, 14, 10);
      } else {
        items.push(this.add.text(0, 0, cleared ? '✓' : String(i + 1), { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
      }
      items.push(
        this.add
          .text(0, 44, CHAPTERS[i].title.toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: locked ? '#c9d1d8' : '#fff7dc', stroke: '#10223a', strokeThickness: 6 })
          .setOrigin(0.5),
      );
      const node = this.add.container(x, y, items).setDepth(10).setSize(70, 70);
      node.setInteractive({ useHandCursor: !locked }).on('pointerdown', () => {
        if (locked) return;
        if (i === this.current) this.enter();
        else this.walkTo(i);
      });
      if (!locked && !cleared) this.tweens.add({ targets: node, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.nodes.push(node);
    });
  }

  private burst(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(x, y, 'spark').setTint(0xffe066).setScale(0.5).setDepth(40);
      const a = (i / 14) * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 70, y: y + Math.sin(a) * 70, scale: 0, duration: 600, onComplete: () => s.destroy() });
    }
  }

  // ---------- movimento ----------

  private placeHero([x, y]: [number, number]): void {
    this.hero.setPosition(x, y - 34);
    this.heroAura.setPosition(x, y - 44);
  }

  private step(dir: number): void {
    const to = Phaser.Math.Clamp(this.current + dir, 0, this.unlocked);
    if (to !== this.current) this.walkTo(to);
  }

  /** O esqueleto anda pela trilha, ponto a ponto, até a fase escolhida. */
  private walkTo(to: number): void {
    if (this.walking || to === this.current) return;
    this.walking = true;
    const a = NODE_AT[this.current];
    const b = NODE_AT[to];
    const dir = Math.sign(b - a);
    const pts: Array<[number, number]> = [];
    for (let i = a + dir; dir > 0 ? i <= b : i >= b; i += dir) pts.push(PATH[i]);
    this.hero.play('skull_run');
    const next = (k: number) => {
      if (k >= pts.length) {
        this.walking = false;
        this.current = to;
        this.hero.play('skull_idle');
        this.updateInfo();
        return;
      }
      const [x, y] = pts[k];
      this.hero.setFlipX(x < this.hero.x);
      const dist = Math.hypot(x - this.hero.x, y - 34 - this.hero.y);
      this.tweens.add({
        targets: [this.hero, this.heroAura],
        x,
        y: (t: Phaser.GameObjects.GameObject) => (t === this.hero ? y - 34 : y - 44),
        duration: Math.max(120, dist * 4),
        onComplete: () => next(k + 1),
      });
    };
    next(0);
  }

  private updateInfo(): void {
    const ch = CHAPTERS[this.current];
    this.infoTitle.setText(`FASE ${this.current + 1} · ${ch.title.toUpperCase()}`);
    this.info.setText(`${ch.blurb}   ◀ ▶ escolher · Enter / A / toque: entrar`);
  }

  private enter(): void {
    if (this.walking) return;
    // Modo livre (testes): direto para a fase, sem a visual novel.
    if (isFreePlay()) this.scene.start('game', { mode: 'story', devices: this.devices, level: this.current });
    else this.scene.start('vn', { devices: this.devices, level: this.current });
  }
}

