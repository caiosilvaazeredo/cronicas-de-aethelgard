import Phaser from 'phaser';
import { playMusic } from '../game/music';
import { BODY_FONT, FONT, PORTRAIT, VIEW } from '../config';
import type { DeviceId } from '../game/controls';
import { ALL_AREAS, AREAS, AREA_GOAL, CENTER, areaCleared, areaTitle, areaUnlocked, sealsBroken, type AreaDef } from '../game/areas';
import { currentSlot, getEnding, hasSeen, isDone, isFreePlay } from '../game/progress';
import { MEMORIES } from '../data/lore';
import { pillButton } from '../ui/devices';

const MW = 1280;
const MH = 720;
const COLS = 9;
const INK = 0x1d1a2b;

/**
 * Mapa do mundo: a ilha central (Santuário do Xamã) e as áreas em volta, cada uma com o seu
 * rei. Correntes roxas ligam o santuário a cada área: são os selos. Cada rei derrotado parte
 * uma corrente e o céu sobre o santuário escurece um pouco (pista sutil do que o Xamã quer).
 * Escolher uma área abre o mapa dela, com as suas fases.
 */
export class WorldScene extends Phaser.Scene {
  private devices: DeviceId[] = ['kb-full'];
  private sel = 0;
  private hero!: Phaser.GameObjects.Sprite;
  private ring!: Phaser.GameObjects.Graphics;
  private infoTitle!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private uiCam?: Phaser.Cameras.Scene2D.Camera;
  private busy = false;
  private prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };
  lastData: { devices?: DeviceId[]; area?: string; cleared?: string } = {};

  constructor() {
    super('world');
  }

  init(data: { devices?: DeviceId[]; area?: string; cleared?: string }): void {
    this.lastData = data;
    this.devices = data.devices ?? ['kb-full'];
    const i = ALL_AREAS.findIndex((a) => a.id === data.area);
    this.sel = i >= 0 ? i : this.firstOpen();
    this.busy = false;
    this.uiCam = undefined;
    this.prevPad = { l: true, r: true, u: true, d: true, a: true, b: true };
  }

  /** Área sugerida: a primeira aberta e ainda não vencida. */
  private firstOpen(): number {
    const i = ALL_AREAS.findIndex((a) => areaUnlocked(a) && a.levels.length > 0 && !areaCleared(a));
    return i >= 0 ? i : 0;
  }

  create(): void {
    playMusic('world');
    const cam = this.cameras.main;
    cam.setBackgroundColor('#39b5fd');
    const P = VIEW.portrait;
    if (P) {
      const top = 250 + PORTRAIT.topPad;
      const band = Math.max(MH, this.scale.height - top - 760);
      const zoom = Phaser.Math.Clamp(band / MH, 1, 1.5);
      cam.setViewport(0, top, MW, MH * zoom).setZoom(zoom);
    }
    cam.setBounds(0, 0, MW, MH);

    this.drawSea();
    this.drawChains();
    ALL_AREAS.forEach((a, i) => this.drawArea(a, i));
    this.drawGloom();

    this.ring = this.add.graphics().setDepth(18);
    this.hero = this.add.sprite(0, 0, 'skull_idle').play('skull_idle').setScale(0.6).setDepth(20);
    const [hx, hy] = this.anchor(ALL_AREAS[this.sel]);
    this.hero.setPosition(hx, hy);
    cam.centerOn(hx, MH / 2);
    if (P) cam.startFollow(this.hero, true, 0.1, 0.1);

    const worldObjs = [...this.children.list];
    if (P) this.createPortraitUI(worldObjs);
    else this.createLandscapeUI();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.nav(-1, 0));
    kb.on('keydown-A', () => this.nav(-1, 0));
    kb.on('keydown-RIGHT', () => this.nav(1, 0));
    kb.on('keydown-D', () => this.nav(1, 0));
    kb.on('keydown-UP', () => this.nav(0, -1));
    kb.on('keydown-W', () => this.nav(0, -1));
    kb.on('keydown-DOWN', () => this.nav(0, 1));
    kb.on('keydown-S', () => this.nav(0, 1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.enter());
    kb.on('keydown-ESC', () => this.scene.start('menu', { stage: 'modes' }));
    this.select(this.sel, true);

    if (this.lastData.cleared) this.sealBreak(this.lastData.cleared);
  }

  update(time: number): void {
    // Anel pulsando em volta da área escolhida.
    const a = ALL_AREAS[this.sel];
    const [x, y] = a.pos;
    const r = (a === CENTER ? 150 : 112) + Math.sin(time / 220) * 6;
    this.ring.clear();
    this.ring.lineStyle(8, INK, 0.6).strokeEllipse(x, y + 6, r * 2, r * 1.2);
    this.ring.lineStyle(4, 0xffe066, 1).strokeEllipse(x, y + 6, r * 2, r * 1.2);

    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const ax = pad.axes[0]?.getValue() ?? 0;
    const ay = pad.axes[1]?.getValue() ?? 0;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const st = { l: b(14) || ax < -0.5, r: b(15) || ax > 0.5, u: b(12) || ay < -0.5, d: b(13) || ay > 0.5, a: b(0), b: b(1) };
    const p = this.prevPad;
    if (st.l && !p.l) this.nav(-1, 0);
    if (st.r && !p.r) this.nav(1, 0);
    if (st.u && !p.u) this.nav(0, -1);
    if (st.d && !p.d) this.nav(0, 1);
    if (st.a && !p.a) this.enter();
    if (st.b && !p.b) this.scene.start('menu', { stage: 'modes' });
    this.prevPad = st;
  }

  // ---------- interface ----------

  private createLandscapeUI(): void {
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor>(o: T): T => o.setScrollFactor(0);
    fix(
      this.add
        .text(MW / 2, 30, this.header(), { fontFamily: FONT, fontSize: '28px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 9 })
        .setOrigin(0.5)
        .setDepth(30),
    );
    const g = fix(this.add.graphics().setDepth(29));
    g.fillStyle(0x10223a, 0.92).fillRoundedRect(20, MH - 112, 900, 100, 16);
    g.lineStyle(3, 0xfff7dc, 0.8).strokeRoundedRect(20, MH - 112, 900, 100, 16);
    this.infoTitle = fix(this.add.text(40, MH - 100, '', { fontFamily: FONT, fontSize: '24px', color: '#ffe066' }).setDepth(30));
    this.info = fix(this.add.text(40, MH - 66, '', { fontFamily: BODY_FONT, fontSize: '17px', color: '#fff7dc', wordWrap: { width: 860 }, lineSpacing: 2 }).setDepth(30));
    fix(pillButton(this, MW - 170, MH - 62, 'ENTRAR  ▶', () => this.enter(), 240, 0xffe066).setDepth(30));
    fix(pillButton(this, 100, 36, '◀ MENU', () => this.scene.start('menu', { stage: 'modes' }), 170).setScale(0.75).setDepth(30));
  }

  /** Em pé: título e MENU em cima, painel e botões grandes embaixo (câmera própria). */
  private createPortraitUI(worldObjs: Phaser.GameObjects.GameObject[]): void {
    const H = this.scale.height;
    const uiCam = this.cameras.add(0, 0, MW, H);
    this.uiCam = uiCam;
    uiCam.ignore(worldObjs);
    const first = this.children.list.length;
    const top = PORTRAIT.topPad;
    this.add.rectangle(0, 0, MW, 250 + top, 0x10223a).setOrigin(0);
    this.add.text(MW / 2, 175 + top, this.header(), { fontFamily: FONT, fontSize: '46px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5);
    pillButton(this, 150, 80 + top, '◀ MENU', () => this.scene.start('menu', { stage: 'modes' }), 200).setScale(1.1);
    const mapBottom = this.cameras.main.y + this.cameras.main.height;
    this.add.rectangle(0, mapBottom, MW, H - mapBottom, 0x10223a).setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0x1b3a78, 1).fillRoundedRect(40, mapBottom + 30, MW - 80, 280, 22);
    g.lineStyle(4, 0xfff7dc, 0.8).strokeRoundedRect(40, mapBottom + 30, MW - 80, 280, 22);
    this.infoTitle = this.add.text(76, mapBottom + 56, '', { fontFamily: FONT, fontSize: '40px', color: '#ffe066' });
    this.info = this.add.text(76, mapBottom + 116, '', { fontFamily: BODY_FONT, fontSize: '28px', color: '#fff7dc', wordWrap: { width: MW - 160 }, lineSpacing: 6 });
    const by = mapBottom + 430;
    pillButton(this, 190, by, '◀', () => this.cycle(-1), 200, 0xbfe9ff).setScale(1.6);
    pillButton(this, MW / 2, by, 'ENTRAR', () => this.enter(), 300, 0xffe066).setScale(1.6);
    pillButton(this, MW - 190, by, '▶', () => this.cycle(1), 200, 0xbfe9ff).setScale(1.6);
    this.add.text(MW / 2, by + 130, 'Toque numa área para escolher · toque de novo para entrar', { fontFamily: BODY_FONT, fontSize: '26px', color: '#bfd0e0' }).setOrigin(0.5);
    this.cameras.main.ignore(this.children.list.slice(first));
  }

  private header(): string {
    const n = AREAS.length;
    const e = getEnding();
    if (e === 'home') return 'O MUNDO PERTENCE AO XAMÃ';
    if (e === 'free') return 'O MUNDO ESTÁ LIVRE';
    return `${isFreePlay() ? 'MODO LIVRE' : `SAVE ${currentSlot()}`} · FRAGMENTOS DA COROA ${sealsBroken()}/${n}`;
  }

  private select(i: number, instant = false): void {
    this.sel = i;
    const a = ALL_AREAS[i];
    const open = areaUnlocked(a);
    const t = areaTitle(a);
    const done = a.levels.filter((id) => isDone(id)).length;
    if (!open) {
      this.infoTitle.setText('???');
      this.info.setText(this.lockedHint(a));
    } else {
      const status = areaCleared(a) ? 'Fragmento da coroa recuperado!' : `${done}/${a.levels.length} fases vencidas (meta: ${AREA_GOAL} fases)`;
      this.infoTitle.setText(`${t.name.toUpperCase()} · ${t.king.toUpperCase()}`);
      this.info.setText(`${a.blurb}  ·  ${a === CENTER ? `${done}/${a.levels.length} fases` : status}`);
    }
    const [x, y] = this.anchor(a);
    if (instant) this.hero.setPosition(x, y);
    else {
      this.tweens.killTweensOf(this.hero);
      this.hero.play('skull_run', true).setFlipX(x < this.hero.x);
      this.tweens.add({
        targets: this.hero,
        x,
        y,
        duration: Math.min(700, Math.max(200, Phaser.Math.Distance.Between(this.hero.x, this.hero.y, x, y) * 1.4)),
        ease: 'Sine.easeInOut',
        onComplete: () => this.hero.play('skull_idle'),
      });
    }
  }

  private lockedHint(a: AreaDef): string {
    if (a.unlock === 'after-mare') return 'Uma área ainda coberta de névoa. Vença as Ilhas da Maré para chegar até ela.';
    if (a.unlock === 'pact') return 'Um reino que só aparece depois do acordo com os Príncipes (na Caverna das Teias).';
    if (a.unlock === 'all') return 'O Santuário do Xamã. Ele só abre quando todos os fragmentos da coroa estiverem reunidos.';
    return 'Uma área ainda coberta de névoa. Vença a Pradaria dos Ossos para abrir o caminho.';
  }

  /** Setas: escolhe a área mais próxima naquela direção. */
  private nav(dx: number, dy: number): void {
    if (this.busy) return;
    const [x0, y0] = ALL_AREAS[this.sel].pos;
    let best = -1;
    let bestScore = Infinity;
    ALL_AREAS.forEach((a, i) => {
      if (i === this.sel) return;
      const vx = a.pos[0] - x0;
      const vy = a.pos[1] - y0;
      const d = Math.hypot(vx, vy);
      const along = (vx * dx + vy * dy) / d;
      if (along < 0.35) return;
      const score = d * (2 - along);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) this.select(best);
  }

  private cycle(dir: number): void {
    if (this.busy) return;
    this.select(Phaser.Math.Wrap(this.sel + dir, 0, ALL_AREAS.length));
  }

  private enter(): void {
    if (this.busy) return;
    const a = ALL_AREAS[this.sel];
    if (!areaUnlocked(a) || a.levels.length === 0) {
      this.cameras.main.shake(160, 0.004);
      if (areaUnlocked(a)) this.info.setText(`${a.blurb}  ·  As fases desta área ainda estão sendo construídas.`);
      return;
    }
    this.busy = true;
    this.cameras.main.fadeOut(250, 16, 34, 58);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', { devices: this.devices, area: a.id }));
  }

  // ---------- desenho ----------

  /** Onde o esqueleto fica em cada área. */
  private anchor(a: AreaDef): [number, number] {
    return [a.pos[0] - (a === CENTER ? 70 : 50), a.pos[1] - 6];
  }

  /**
   * O continente: uma máscara de terra (20×11 células de 64px) montada com o tileset do jogo
   * (bordas escolhidas pelos vizinhos, espuma na beira). Cada célula pega o chão da área mais
   * perto (areia na Maré, rocha roxa nas Teias, rocha vulcânica na Forja, e assim por diante).
   */
  private static readonly LAND = [
    '....................',
    '....................',
    '...#######...####...',
    '..##########.#####..',
    '.##################.',
    '.##################.',
    '.##################.',
    '..################..',
    '..#######..#######..',
    '...#####....#####...',
    '....................',
  ];

  private isLand(c: number, r: number): boolean {
    return WorldScene.LAND[r]?.[c] === '#';
  }

  /** Chão de cada área no mapa do mundo (tileset e tom). */
  private static readonly GROUND: Record<string, [string, number]> = {
    mare: ['tiles_sand', 0xffffff],
    pradaria: ['tilemap', 0xf0e0a0],
    lagoa: ['tilemap', 0xb0e8a8],
    teias: ['tiles_cave', 0xc8b8e0],
    forja: ['tiles_volcano', 0xe8a890],
    bosque: ['tilemap', 0x8fcf80],
    minas: ['tiles_cave', 0xf0d8a0],
    centro: ['tilemap', 0xd8c8f0],
  };

  private drawSea(): void {
    const s = this.add.tileSprite(-MW, -MH, MW * 3, MH * 3, 'waves').setOrigin(0).setAlpha(0.35).setDepth(0);
    this.tweens.add({ targets: s, tilePositionX: 256, duration: 9000, repeat: -1 });
    const rng = new Phaser.Math.RandomDataGenerator(['world-rocks']);
    // Pedrinhas só na água (fora do continente).
    for (let i = 0; i < 40; i++) {
      const c = rng.between(0, 19);
      const r = rng.between(0, 10);
      if (this.isLand(c, r) || this.isLand(c, r + 1) || this.isLand(c, r - 1)) continue;
      this.add.sprite(c * 64 + 32, r * 64 + 32, 'water_rocks').setScale(1.1).setDepth(1).play({ key: 'water_rocks', startFrame: rng.between(0, 15) });
    }
    this.drawLand();
  }

  private drawLand(): void {
    const land = ALL_AREAS.filter((a) => WorldScene.GROUND[a.id]);
    for (let r = 0; r < WorldScene.LAND.length; r++)
      for (let c = 0; c < 20; c++) {
        if (!this.isLand(c, r)) continue;
        const up = !this.isLand(c, r - 1);
        const down = !this.isLand(c, r + 1);
        const left = !this.isLand(c - 1, r);
        const right = !this.isLand(c + 1, r);
        const x = c * 64;
        const y = r * 64;
        if (up || down || left || right) this.add.sprite(x + 32, y + 32, 'water_foam').setDepth(2).play({ key: 'water_foam', startFrame: (c + r) % 16 });
        // Área mais perto desta célula decide o chão.
        let best = land[0];
        let bd = Infinity;
        for (const a of land) {
          const d = Phaser.Math.Distance.Between(x + 32, y + 32, a.pos[0], a.pos[1]);
          if (d < bd) {
            bd = d;
            best = a;
          }
        }
        const [key, tint] = WorldScene.GROUND[best.id];
        const row = up ? 0 : down ? 2 : 1;
        const col = left ? 0 : right ? 2 : 1;
        this.add.image(x, y, key, row * COLS + col).setOrigin(0).setDepth(3).setTint(tint);
      }
  }

  /** Planalto de 3 tiles (penhasco do tileset), centrado em x, com o topo em y. */
  private plateau(x: number, y: number, w: number, key: string, tint: number): void {
    for (let i = 0; i < w; i++) {
      const col = i === 0 ? 5 : i === w - 1 ? 7 : 6;
      const px = x - (w * 64) / 2 + i * 64;
      this.add.image(px, y, key, 3 * COLS + col).setOrigin(0).setDepth(4).setTint(tint);
      this.add.image(px, y + 64, key, 5 * COLS + col).setOrigin(0).setDepth(4).setTint(tint);
    }
  }

  /** Nuvem flutuante (áreas do céu), com o tom pedido. */
  private cloudIsland(cx: number, cy: number, rim: number, top: number): Phaser.GameObjects.Graphics {
    const c = this.add.graphics().setDepth(4);
    c.fillStyle(INK, 1).fillRoundedRect(cx - 104, cy - 30, 208, 70, 26);
    c.fillStyle(rim, 1).fillRoundedRect(cx - 100, cy - 26, 200, 62, 24);
    c.fillStyle(top, 1).fillRoundedRect(cx - 96, cy - 30, 192, 54, 22);
    for (let k = cx - 80; k <= cx + 80; k += 24) c.fillStyle(top, 1).fillCircle(k, cy - 30, 13);
    this.tweens.add({ targets: c, y: -5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  private drawArea(a: AreaDef, i: number): void {
    const [x, y] = a.pos;
    const open = areaUnlocked(a);
    const deco = (key: string, dx: number, dy: number, sc = 1) => this.add.image(x + dx, y + dy, key).setOrigin(0.5, 1).setScale(sc).setDepth(6 + (y + dy) / 1000);
    const bush = (dx: number, dy: number, k = 1) => this.add.sprite(x + dx, y + dy, `bush${k}`).setOrigin(0.5, 0.75).setScale(0.45).setDepth(6 + (y + dy) / 1000).play({ key: `bush${k}`, startFrame: (dx + 99) % 8 });
    const tree = (dx: number, dy: number, sc = 0.42) => this.add.sprite(x + dx, y + dy, 'tree').setOrigin(0.5, 1).setScale(sc).setDepth(6 + (y + dy) / 1000).play({ key: 'tree', startFrame: Math.abs(dx) % 4 });
    switch (a.id) {
      case 'mare':
        deco('bld_blue_house1', -30, 4, 0.5);
        tree(-80, 10);
        deco('skull_spike', 70, 22, 0.5);
        deco('stone2', 40, 30, 0.7);
        break;
      case 'pradaria':
        deco('bld_yellow_house2', -40, 0, 0.5);
        deco('bld_yellow_house3', 10, 14, 0.42);
        deco('bones', 70, 30, 0.6);
        bush(-80, 30, 2);
        break;
      case 'lagoa': {
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(INK, 1).fillEllipse(x + 6, y + 8, 168, 72);
        g.fillStyle(0x2f9ad8, 1).fillEllipse(x + 6, y + 8, 160, 64);
        g.fillStyle(0x39b5fd, 1).fillEllipse(x + 6, y + 4, 150, 52);
        g.fillStyle(0x8fd9ff, 0.8).fillEllipse(x - 20, y - 4, 50, 8).fillEllipse(x + 40, y + 14, 34, 6);
        this.add.sprite(x + 30, y + 8, 'water_rocks').setScale(0.8).setDepth(5.5).play('water_rocks');
        bush(-90, 4, 3);
        bush(96, 10, 4);
        break;
      }
      case 'teias': {
        this.plateau(x + 10, y - 66, 3, 'tiles_cave', 0xc8b8e0);
        const cave = this.add.graphics().setDepth(5);
        cave.fillStyle(INK, 1).fillEllipse(x + 10, y + 26, 70, 54);
        cave.fillStyle(0x08141a, 1).fillEllipse(x + 10, y + 30, 58, 44);
        this.add.image(x - 54, y - 40, 'web_px').setScale(0.5).setDepth(6);
        deco('stone4', 84, 34, 0.7);
        break;
      }
      case 'forja':
        this.add.image(x + 10, y + 30, 'map_volcano').setOrigin(0.5, 1).setScale(0.8).setDepth(5);
        this.add
          .particles(x + 10, y - 86, 'vsmoke_1', { speedY: { min: -22, max: -12 }, speedX: { min: 4, max: 12 }, lifespan: 3000, scale: { start: 0.5, end: 1 }, alpha: { start: 0.9, end: 0 }, frequency: 800 })
          .setDepth(6);
        deco('stone3', -80, 30, 0.7);
        break;
      case 'bosque':
        tree(-80, 6);
        tree(-30, -14, 0.38);
        tree(80, 0);
        deco('bld_blue_house3', 24, 24, 0.45);
        bush(-60, 34, 1);
        break;
      case 'minas': {
        this.plateau(x - 10, y - 66, 3, 'tiles_cave', 0xf0d8a0);
        const cave = this.add.graphics().setDepth(5);
        cave.fillStyle(INK, 1).fillEllipse(x - 10, y + 26, 66, 52);
        cave.fillStyle(0x1a1208, 1).fillEllipse(x - 10, y + 30, 54, 42);
        deco('gold_stone_big', 70, 34, 0.42);
        deco('bld_black_tower', -92, 30, 0.4);
        this.add.sprite(x + 30, y + 10, 'torch_item_anim', 0).setDepth(6.5).play('torch_flame');
        break;
      }
      case 'ceu': {
        // Céu de Brasa: brilho vermelho, nuvem em brasa e um castelo vermelho em cima.
        const glow = this.add.graphics().setDepth(3.5);
        for (let k = 0; k < 4; k++) glow.fillStyle(0xff4a2a, 0.08).fillCircle(x, y - 10, 150 - k * 28);
        this.cloudIsland(x, y, 0xd84a3a, 0xffb090);
        deco('bld_red_castle', 0, 0, 0.34);
        this.add
          .particles(x, y + 20, 'spark', { x: { min: -100, max: 100 }, speedY: { min: -40, max: -20 }, lifespan: 1600, scale: { start: 0.25, end: 0 }, tint: [0xffe066, 0xff7a1a, 0xff4a2a], frequency: 160 })
          .setDepth(5);
        break;
      }
      case 'reino': {
        const t = areaTitle(a);
        const moon = this.add.graphics().setDepth(3);
        moon.fillStyle(0xfff7dc, 0.25).fillCircle(x + 92, y - 26, 40);
        moon.fillStyle(0xf4f0d0, 1).fillCircle(x + 92, y - 26, 24);
        this.cloudIsland(x, y, t.color, 0xe8e0f8);
        deco(t.kingAnim.includes('bee') ? 'bld_yellow_castle' : 'bld_black_castle', 0, 0, 0.34);
        break;
      }
      case 'centro':
        deco('bld_purple_monastery', 10, 20, 0.6);
        deco('bld_purple_tower', -90, 34, 0.45);
        deco('bld_purple_tower', 110, 34, 0.45);
        this.add.sprite(x - 60, y + 30, 'shaman_idle').setScale(0.6).setDepth(7).play('shaman_idle');
        break;
    }
    // Rei da área (silhueta enquanto trancada).
    if (a !== CENTER) {
      const t = areaTitle(a);
      const k = this.add.sprite(x + 56, y - 34, t.kingAnim).setScale(0.55).setFlipX(true).setDepth(8).play(t.kingAnim);
      if (!open) k.setTintFill(0x10223a).setAlpha(0.5);
      if (areaCleared(a)) k.setAlpha(0.35).setAngle(90).setY(y);
    }
    // Névoa e "???" nas áreas trancadas.
    if (!open) {
      const fog = this.add.graphics().setDepth(9);
      fog.fillStyle(0xdfe7ee, 0.78).fillEllipse(x, y, 230, 130);
      fog.fillStyle(0xffffff, 0.5).fillEllipse(x - 40, y - 20, 120, 60).fillEllipse(x + 50, y + 16, 110, 50);
      this.tweens.add({ targets: fog, alpha: 0.85, duration: 2000 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Plaquinha com o nome.
    const t = areaTitle(a);
    const label = open ? t.name.toUpperCase() : '???';
    const txt = this.add.text(x, y + (a === CENTER ? 76 : 66), label, { fontFamily: FONT, fontSize: '17px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5).setDepth(12);
    const plate = this.add.graphics().setDepth(11);
    plate.fillStyle(INK, 1).fillRoundedRect(txt.x - txt.width / 2 - 12, txt.y - 15, txt.width + 24, 30, 10);
    plate.fillStyle(open ? t.color : 0x5f6872, 1).fillRoundedRect(txt.x - txt.width / 2 - 9, txt.y - 12, txt.width + 18, 24, 8);
    // Fragmento (selo) já recuperado: estrelinha dourada ao lado do nome.
    if (areaCleared(a) && a !== CENTER) {
      const st = this.add.image(txt.x + txt.width / 2 + 22, txt.y, 'spark').setTint(0xffe066).setScale(0.55).setDepth(12);
      this.tweens.add({ targets: st, angle: 360, duration: 4000, repeat: -1 });
    }
    // Toque/clique: escolhe; de novo, entra.
    const zone = this.add.zone(x, y, 230, 170).setInteractive({ useHandCursor: true }).setDepth(15);
    zone.on('pointerdown', () => {
      if (this.busy) return;
      if (this.sel === i) this.enter();
      else this.select(i);
    });
  }

  /** Correntes roxas do santuário até cada área (os selos). Rei derrotado: corrente partida. */
  private chainG?: Phaser.GameObjects.Graphics;

  private drawChains(): void {
    const g = this.add.graphics().setDepth(1.5);
    this.chainG = g;
    // Final livre: os selos voltaram (correntes inteiras de novo).
    for (const a of AREAS) this.chain(g, a, areaCleared(a) && getEnding() !== 'free');
  }

  private chain(g: Phaser.GameObjects.Graphics, a: AreaDef, broken: boolean): void {
    const [x0, y0] = CENTER.pos;
    const [x1, y1] = a.pos;
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 110; d < len - 80; d += 18) {
      // Partida: falta o pedaço do meio e os elos ficam apagados.
      if (broken && d > len * 0.42 && d < len * 0.58) continue;
      const x = x0 + ((x1 - x0) * d) / len;
      const y = y0 + ((y1 - y0) * d) / len;
      const odd = Math.round(d / 18) % 2;
      g.fillStyle(INK, broken ? 0.25 : 0.55).fillEllipse(x, y, odd ? 14 : 10, odd ? 10 : 14);
      g.fillStyle(broken ? 0x6a6078 : 0x9b6bf0, broken ? 0.35 : 0.7).fillEllipse(x, y, odd ? 10 : 6, odd ? 6 : 10);
    }
  }

  /** O céu sobre o santuário escurece um pouco a cada selo partido (sem explicar por quê). */
  private gloom?: Phaser.GameObjects.Graphics;

  private drawGloom(): void {
    // Final "voltar para casa": o Xamã tomou tudo (o mapa inteiro fica roxo e escuro).
    if (getEnding() === 'home') {
      this.add.rectangle(-MW, -MH, MW * 3, MH * 3, 0x2a0a4a, 0.42).setOrigin(0).setDepth(13);
      this.add
        .particles(0, MH, 'spark', { x: { min: 0, max: MW }, speedY: { min: -60, max: -30 }, lifespan: 5000, scale: { start: 0.3, end: 0 }, tint: [0x9b6bf0, 0xb48aff], alpha: { start: 0.8, end: 0 }, frequency: 90 })
        .setDepth(13);
      return;
    }
    if (getEnding() === 'free') return;
    const n = sealsBroken();
    if (!n) return;
    const g = this.add.graphics().setDepth(2.5);
    this.gloom = g;
    const [x, y] = CENTER.pos;
    for (let k = 0; k < 6; k++) g.fillStyle(0x3a1a5a, 0.035 * n * (1 - k / 7)).fillCircle(x, y, 140 + k * 45);
    this.tweens.add({ targets: g, alpha: 0.7, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Voltou de uma área vencida: a corrente dela parte com faíscas e a tela treme. */
  private sealBreak(id: string): void {
    const a = AREAS.find((x) => x.id === id);
    if (!a) return;
    this.busy = true;
    const [x0, y0] = CENTER.pos;
    const [x1, y1] = a.pos;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    this.time.delayedCall(600, () => {
      this.cameras.main.shake(400, 0.008);
      this.cameras.main.flash(250, 200, 160, 255);
      for (let i = 0; i < 16; i++) {
        const s = this.add.image(mx, my, 'spark').setTint(i % 2 ? 0x9b6bf0 : 0xffe066).setScale(0.6).setDepth(40);
        const ang = (i / 16) * Math.PI * 2;
        this.tweens.add({ targets: s, x: mx + Math.cos(ang) * 90, y: my + Math.sin(ang) * 90, scale: 0, duration: 700, onComplete: () => s.destroy() });
      }
      const fx = this.uiCam ? MW / 2 : this.cameras.main.scrollX + MW / 2;
      const fy = this.uiCam ? this.scale.height * 0.2 : 140;
      const t = this.add
        .text(fx, fy, `FRAGMENTO DA COROA ${sealsBroken()}/${AREAS.length}!`, { fontFamily: FONT, fontSize: this.uiCam ? '56px' : '44px', color: '#ffe066', stroke: '#1d1a2b', strokeThickness: 10 })
        .setOrigin(0.5)
        .setDepth(50)
        .setScale(0.4);
      if (this.uiCam) this.cameras.main.ignore(t);
      this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
      // Um pedaço da memória volta junto com o fragmento.
      const n = sealsBroken();
      if (n >= 1 && n <= MEMORIES.length && !hasSeen(`memory-${n}`) && !isFreePlay()) {
        this.time.delayedCall(2400, () => {
          this.cameras.main.fadeOut(600, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('memory', { devices: this.devices, n, area: a.id }));
        });
      } else this.time.delayedCall(900, () => (this.busy = false));
    });
  }
}
