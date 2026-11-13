import Phaser from 'phaser';
import { BODY_FONT, FONT, PORTRAIT, VIEW } from '../config';
import { chapterFor } from '../data/lore';
import type { DeviceId } from '../game/controls';
import { currentSlot, getPact, giftsOf, hasPact, hasSecret, isDone, isFreePlay } from '../game/progress';
import { LEVELS, type LevelDef } from '../game/level';
import { AREAS, AREA_GOAL, areaById, areaCleared, areaOfLevel, areaTitle, levelIndex, levelUnlocked, type AreaDef } from '../game/areas';
import { unlockedBy } from '../game/abilities';
import { pillButton } from '../ui/devices';

const MW = 1280;
const MH = 720;
const COLS = 9;
const INK = 0x1d1a2b;

/** Vaga de fase ainda não construída (a área tem meta de 10 fases). */
type Slot = LevelDef | null;

/**
 * Seleção de fase do modo história, como um mapa-múndi de plataforma: ilhas da maré,
 * a boca da caverna, o vulcão e o santuário nas nuvens, ligados por uma trilha.
 * Fases ainda não liberadas ficam trancadas; o esqueleto anda pelo caminho.
 */
export class MapScene extends Phaser.Scene {
  private devices: DeviceId[] = ['kb-full'];
  /** Área deste mapa e as vagas de fase (as fases prontas e as que ainda faltam). */
  private area!: AreaDef;
  private MAIN: Slot[] = [];
  private PATH: Array<[number, number]> = [];
  private NODE_AT: number[] = [];
  private WORLD_W = MW;
  /** Quantas vagas têm fase de verdade. */
  private built = 0;
  private justCleared = false;

  /**
   * Posição de cada fase no mapa: uma faixa que segue para a direita (o céu mais alto, o
   * casarão embaixo). O mapa rola acompanhando o esqueleto.
   */
  private spot(i: number): [number, number] {
    const l = this.MAIN[i];
    const x = 250 + i * 300;
    if (l?.theme === 'sky') return [x, l.shmup ? 170 : 230];
    if (l?.theme === 'haunted') return [x, 500];
    return [x, i % 2 ? 430 : 490];
  }

  /** Índice em LEVELS da fase na vaga i (−1 se a vaga ainda está vazia). */
  private levelAt(i: number): number {
    const l = this.MAIN[i];
    return l ? levelIndex(l.id) : -1;
  }
  private unlocked = 0;
  private current = 0;
  private walking = false;
  private hero!: Phaser.GameObjects.Sprite;
  private heroAura!: Phaser.GameObjects.Image;
  private info!: Phaser.GameObjects.Text;
  private infoTitle!: Phaser.GameObjects.Text;
  private nodes: Phaser.GameObjects.Container[] = [];
  private prevPad = { l: false, r: false, a: true, b: true };
  lastData: { devices?: DeviceId[]; justCompleted?: number; area?: string; level?: number } = {};

  constructor() {
    super('map');
  }

  init(data: { devices?: DeviceId[]; justCompleted?: number; area?: string; level?: number }): void {
    this.lastData = data;
    this.devices = data.devices ?? ['kb-full'];
    const ref = data.justCompleted ?? data.level;
    this.area = (data.area ? areaById(data.area) : undefined) ?? (ref !== undefined ? areaOfLevel(ref) : undefined) ?? AREAS[0];
    const real = this.area.levels.map((id) => LEVELS[levelIndex(id)]).filter(Boolean);
    this.built = real.length;
    this.MAIN = [...real, ...Array<Slot>(Math.max(0, AREA_GOAL - real.length)).fill(null)];
    this.PATH = this.MAIN.map((_, i) => this.spot(i));
    this.NODE_AT = this.MAIN.map((_, i) => i);
    this.WORLD_W = this.PATH[this.PATH.length - 1][0] + 320;
    // Liberadas: em sequência dentro da área (no modo livre, todas as prontas).
    let u = 0;
    while (u + 1 < this.built && levelUnlocked(this.area, u + 1)) u++;
    this.unlocked = u;
    const pos = (idx?: number) => (idx === undefined ? -1 : this.MAIN.findIndex((l) => l && levelIndex(l.id) === idx));
    const from = pos(data.justCompleted);
    const at = pos(data.level);
    // Recém-concluída a última fase da área: o selo do rei cai e voltamos ao mundo.
    this.justCleared = from >= 0 && from === this.built - 1 && areaCleared(this.area);
    this.current = from >= 0 ? Math.min(from, this.unlocked) : at >= 0 ? at : this.unlocked;
    this.walking = false;
    this.popupOpen = false;
    this.closePopup = undefined;
    this.uiCam = undefined;
    this.nodes = [];
    this.prevPad = { l: false, r: false, a: true, b: true };
  }

  create(): void {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#39b5fd');
    // O mapa é uma faixa larga: a câmera acompanha o esqueleto na horizontal.
    // Deitado, a faixa ocupa a tela. Em pé, ela fica ampliada no meio, com a interface
    // (painel da fase e botões grandes) numa câmera própria embaixo.
    const P = VIEW.portrait;
    const offY = 0;
    if (P) {
      const H = cam.height;
      const top = 250 + PORTRAIT.topPad;
      const band = Math.max(MH, H - top - 820);
      const zoom = Phaser.Math.Clamp(band / MH, 1, 2.2);
      cam.setViewport(0, top, MW, MH * zoom).setZoom(zoom);
      cam.setBounds(0, 0, this.WORLD_W, MH);
    } else cam.setBounds(0, 0, this.WORLD_W, MH);

    this.drawSea();
    this.drawIslands();
    this.drawPath();
    this.drawNodes();

    this.heroAura = this.add.image(0, 0, 'aura').setTint(0x2f86e0).setScale(0.7).setAlpha(0.8).setDepth(19);
    this.hero = this.add.sprite(0, 0, 'skull_idle').play('skull_idle').setScale(0.75).setDepth(20);
    this.placeHero(this.PATH[this.NODE_AT[this.current]]);
    cam.startFollow(this.hero, true, 0.1, 0.1);
    cam.centerOn(this.hero.x, MH / 2);
    const worldObjs = [...this.children.list];
    if (P) return this.createPortraitUI(worldObjs);
    // Interface presa na tela (não rola com o mapa).
    const ui = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Transform>(o: T): T => {
      o.setScrollFactor(0);
      o.y += offY;
      return o;
    };

    this.add
      .text(MW / 2, 40, this.headerText(), { fontFamily: FONT, fontSize: '42px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0)
      .setY(40 + offY);
    const g = ui(this.add.graphics().setDepth(29));
    g.fillStyle(0x10223a, 0.9).fillRoundedRect(30, MH - 118, 760, 100, 16);
    g.lineStyle(3, 0xfff7dc, 0.8).strokeRoundedRect(30, MH - 118, 760, 100, 16);
    this.infoTitle = ui(this.add.text(52, MH - 100, '', { fontFamily: FONT, fontSize: '26px', color: '#ffe066' }).setDepth(30));
    this.info = ui(
      this.add.text(52, MH - 64, '', { fontFamily: BODY_FONT, fontSize: '18px', color: '#fff7dc', wordWrap: { width: 720 } }).setDepth(30),
    );
    ui(pillButton(this, MW - 170, MH - 70 + offY, 'ENTRAR  ▶', () => this.enter(), 240, 0xffe066).setDepth(30)).y -= offY;
    ui(pillButton(this, 110, 40 + offY, '◀ MUNDO', () => this.toWorld(), 170).setScale(0.75).setDepth(30)).y -= offY;
    this.updateInfo();

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.step(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.step(1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.enter());
    kb.on('keydown-ESC', () => this.toWorld());

    // Acabou de concluir uma fase: a seguinte se abre e o esqueleto vai até ela.
    this.afterCompletion();
  }

  /**
   * Acabou de concluir uma fase: mostra as habilidades novas, abre a seguinte e o esqueleto
   * anda até ela. Se era a última da área, o selo do rei cai e voltamos ao mundo.
   */
  private afterCompletion(): void {
    const done = this.lastData.justCompleted;
    if (done === undefined) return;
    const pos = this.MAIN.findIndex((l) => l && levelIndex(l.id) === done);
    if (this.justCleared) {
      this.time.delayedCall(400, () =>
        this.showAbilities(unlockedBy(done), () => {
          this.popupOpen = true;
          this.cameras.main.flash(300, 255, 247, 220);
          this.time.delayedCall(300, () => this.scene.start('world', { devices: this.devices, area: this.area.id, cleared: this.area.id }));
        }),
      );
      return;
    }
    if (pos < 0 || this.unlocked <= pos) return void this.showAbilities(unlockedBy(done), () => undefined);
    const node = this.nodes[this.unlocked];
    this.cameras.main.flash(200, 255, 247, 220);
    this.tweens.add({ targets: node, scale: { from: 1.6, to: 1 }, duration: 600, ease: 'Back.easeOut' });
    this.burst(node.x, node.y);
    this.time.delayedCall(500, () => this.showAbilities(unlockedBy(done), () => this.walkTo(this.unlocked)));
  }

  /** Câmera da interface (só em pé): os objetos do mundo não aparecem nela. */
  private uiCam?: Phaser.Cameras.Scene2D.Camera;

  /** Em pé: título e MENU em cima; painel da fase e botões grandes ◀ ENTRAR ▶ embaixo. */
  private createPortraitUI(worldObjs: Phaser.GameObjects.GameObject[]): void {
    const H = this.scale.height;
    const uiCam = this.cameras.add(0, 0, MW, H);
    this.uiCam = uiCam;
    uiCam.ignore(worldObjs);
    const first = this.children.list.length;
    const top = PORTRAIT.topPad;
    this.add.rectangle(0, 0, MW, 250 + top, 0x10223a).setOrigin(0);
    this.add.text(MW / 2, 175 + top, this.headerText(), { fontFamily: FONT, fontSize: '52px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5);
    pillButton(this, 150, 80 + top, '◀ MUNDO', () => this.toWorld(), 200).setScale(1.1);
    const mapBottom = this.cameras.main.y + this.cameras.main.height;
    this.add.rectangle(0, mapBottom, MW, H - mapBottom, 0x10223a).setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0x1b3a78, 1).fillRoundedRect(40, mapBottom + 30, MW - 80, 240, 22);
    g.lineStyle(4, 0xfff7dc, 0.8).strokeRoundedRect(40, mapBottom + 30, MW - 80, 240, 22);
    this.infoTitle = this.add.text(76, mapBottom + 56, '', { fontFamily: FONT, fontSize: '42px', color: '#ffe066' });
    this.info = this.add.text(76, mapBottom + 120, '', { fontFamily: BODY_FONT, fontSize: '30px', color: '#fff7dc', wordWrap: { width: MW - 160 }, lineSpacing: 6 });
    const by = mapBottom + 400;
    pillButton(this, 190, by, '◀', () => this.step(-1), 200, 0xbfe9ff).setScale(1.6);
    pillButton(this, MW / 2, by, 'ENTRAR', () => this.enter(), 300, 0xffe066).setScale(1.6);
    pillButton(this, MW - 190, by, '▶', () => this.step(1), 200, 0xbfe9ff).setScale(1.6);
    this.add
      .text(MW / 2, by + 130, 'Arraste o mapa para os lados · toque 2× numa fase para correr até ela', { fontFamily: BODY_FONT, fontSize: '26px', color: '#bfd0e0' })
      .setOrigin(0.5);
    this.cameras.main.ignore(this.children.list.slice(first));
    this.updateInfo();

    // Arrastar o mapa para os lados troca de fase (um passo por arrastada).
    let startX = 0;
    let startY = -1;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const c = this.cameras.main;
      startY = p.y >= c.y && p.y <= c.y + c.height ? p.y : -1;
      startX = p.x;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (startY < 0) return;
      const dx = p.x - startX;
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(p.y - startY)) this.step(dx < 0 ? 1 : -1);
      startY = -1;
    });

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.step(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.step(1));
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.enter());
    kb.on('keydown-ESC', () => this.toWorld());
    this.afterCompletion();
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
    if (st.a && !this.prevPad.a) {
      if (this.closePopup) this.closePopup();
      else this.enter();
    }
    if (st.b && !this.prevPad.b) this.toWorld();
    this.prevPad = st;
  }

  // ---------- desenho ----------

  private drawSea(): void {
    const s = this.add.tileSprite(-MW, -MH * 2, this.WORLD_W + MW * 2, MH * 5, 'waves').setOrigin(0).setAlpha(0.35).setDepth(0);
    this.tweens.add({ targets: s, tilePositionX: 256, duration: 9000, repeat: -1 });
    const rng = new Phaser.Math.RandomDataGenerator(['map-rocks']);
    for (let i = 0; i < Math.round(this.WORLD_W / 70); i++) {
      this.add
        .sprite(rng.between(20, this.WORLD_W - 20), rng.between(90, MH - 140), 'water_rocks')
        .setScale(rng.realInRange(1, 1.5))
        .setDepth(1)
        .play({ key: 'water_rocks', startFrame: rng.between(0, 15) });
    }
    for (let i = 0; i < Math.round(this.WORLD_W / 320); i++) {
      this.add.image(rng.between(0, this.WORLD_W), rng.between(60, 260), `cloud_0${(i % 8) + 1}`).setAlpha(0.5).setScale(0.6).setDepth(25);
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
    this.MAIN.forEach((l, i) => (l ? this.drawIsland(l, i) : this.drawFog(i)));
    // Ilha do casarão: uma só para as casas assombradas seguidas, com o casarão no meio.
    const haunted = this.MAIN.map((l, i) => (l?.theme === 'haunted' ? i : -1)).filter((i) => i >= 0);
    if (haunted.length) {
      const xs = haunted.map((i) => this.spot(i)[0]);
      const a = Math.min(...xs) - 130;
      const b = Math.max(...xs) + 130;
      this.island(a / 64, 6.5, Math.ceil((b - a) / 64), 3, 'tiles_cave', 0x8a7aa8);
      const mid = (a + b) / 2;
      this.add.image(mid, 452, 'bld_purple_monastery').setOrigin(0.5, 1).setScale(0.62).setDepth(5);
      this.add.image(mid - 120, 456, 'bld_purple_tower').setOrigin(0.5, 1).setScale(0.48).setDepth(5);
      this.add.image(mid + 120, 456, 'bld_purple_tower').setOrigin(0.5, 1).setScale(0.48).setDepth(5);
      this.add
        .particles(mid, 470, 'vsmoke_0', { x: { min: -(b - a) / 2, max: (b - a) / 2 }, speedX: { min: 4, max: 12 }, speedY: { min: -8, max: -3 }, lifespan: 4000, scale: { start: 0.5, end: 1 }, alpha: { start: 0.35, end: 0 }, tint: 0x8a6ad0, frequency: 500 })
        .setDepth(6);
    }
    // Ilha secreta do desenho perdido (aparece só depois de achar o rolo de filme).
    const sec = LEVELS.findIndex((l) => l.secret);
    if (sec >= 0 && hasSecret(LEVELS[sec].id) && this.area.levels.includes('cave')) {
      const [x, y] = this.secretSpot();
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0x2a2a2a, 0.9).fillRoundedRect(x - 90, y - 50, 180, 110, 18);
      g.lineStyle(4, 0xd8d0c0, 1).strokeRoundedRect(x - 90, y - 50, 180, 110, 18);
      for (let k = 0; k < 8; k++) g.fillStyle(0xd8d0c0, 1).fillRect(x - 80 + k * 22, y - 44, 10, 8).fillRect(x - 80 + k * 22, y + 46, 10, 8);
      const reel = this.add.image(x + 60, y - 40, 'film_reel').setDepth(6);
      this.tweens.add({ targets: reel, angle: 360, duration: 3000, repeat: -1 });
    }
  }

  private secretSpot(): [number, number] {
    const cave = Math.max(0, this.MAIN.findIndex((l) => l?.id === 'cave'));
    return [this.spot(cave)[0] + 150, 170];
  }

  /** Ilha de uma fase, conforme o tema e o tipo. */
  private drawIsland(l: (typeof LEVELS)[number], i: number): void {
    const [x, y] = this.spot(i);
    const tx = (x - 130) / 64;
    const ty = (y - 70) / 64;
    const deco = (key: string, dx: number, dy: number, sc = 1) => this.add.image(x + dx, y + dy, key).setScale(sc).setDepth(6);
    if (l.theme === 'haunted') {
      if (l.mausoleum) deco('urn', 0, -50, 0.8);
      return;
    }
    if (l.theme === 'sky') {
      const c = this.add.graphics().setDepth(4);
      const tint = l.id === 'sky' ? 0xb9a6ee : 0xf4f8ff;
      c.fillStyle(0xb27cff, l.id === 'sky' ? 0.22 : 0).fillRoundedRect(x - 130, y - 40, 260, 92, 30);
      c.fillStyle(tint, 1).fillRoundedRect(x - 120, y - 20, 240, 62, 24);
      c.fillStyle(0xffffff, 1).fillRoundedRect(x - 116, y - 26, 232, 58, 22);
      for (let k = x - 102; k <= x + 102; k += 24) c.fillStyle(0xffffff, 1).fillCircle(k, y - 24, 13);
      this.tweens.add({ targets: c, y: -6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (l.id === 'sky') {
        const t = this.add.graphics().setDepth(5);
        t.fillStyle(0xb9a6ee, 1).fillRect(x - 50, y - 76, 18, 50).fillRect(x + 38, y - 64, 16, 38).fillCircle(x, y - 44, 26);
        t.fillTriangle(x - 54, y - 76, x - 28, y - 76, x - 41, y - 102).fillTriangle(x + 34, y - 64, x + 58, y - 64, x + 46, y - 86);
      }
      if (l.winds) {
        this.add
          .particles(x, y + 40, 'streak', { x: { min: -30, max: 30 }, speedY: { min: -160, max: -110 }, lifespan: 900, scaleX: 0.15, scaleY: 0.8, rotate: 90, alpha: { start: 0.8, end: 0 }, frequency: 120 })
          .setDepth(6);
      }
      if (l.shmup) {
        const moon = this.add.graphics().setDepth(3);
        if (l.shmupBoss !== 'imp') {
          moon.fillStyle(0xfff7dc, 0.25).fillCircle(x + 40, y - 40, 70);
          moon.fillStyle(0xf4f0d0, 1).fillCircle(x + 40, y - 40, 46);
        }
        // A montaria é o príncipe do acordo (antes do acordo, um morcego qualquer).
        const mount = hasPact() ? `prince_${getPact()}_idle` : 'bat_idle';
        const rider = this.add.sprite(x - 60, y - 30, mount).setScale(0.55).setDepth(6).play(mount);
        this.tweens.add({ targets: rider, x: x + 100, y: y - 10, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (l.shmupBoss === 'imp') this.add.sprite(x + 90, y - 50, 'imp_idle').setScale(0.7).setFlipX(true).setDepth(6).play('imp_idle');
        else if (hasPact()) this.add.sprite(x + 90, y - 50, `king_${getPact() === 'bat' ? 'bee' : 'bat'}_idle`).setScale(0.6).setFlipX(true).setDepth(6).play(`king_${getPact() === 'bat' ? 'bee' : 'bat'}_idle`);
      }
      return;
    }
    const key = ['tiles_sand', 'tiles_ship', 'tiles_prairie', 'tiles_forest', 'tiles_swamp', 'tiles_mine'].includes(l.tiles) ? l.tiles : l.theme === 'cave' ? 'tiles_cave' : l.theme === 'volcano' ? 'tiles_volcano' : 'tilemap';
    const tint = l.theme === 'volcano' ? 0xd28e78 : l.id === 'nest' ? 0x8a9aa8 : l.id === 'queen' ? 0x7a7088 : 0xffffff;
    this.island(tx, ty, 4, 3, key, tint);
    if (l.id === 'shore') {
      this.add.sprite(x - 90, y - 20, 'tree').setOrigin(0.5, 1).setScale(0.5).setDepth(6).play('tree');
      deco('skull_spike', 80, 30, 0.6);
    }
    if (l.id === 'cave') {
      this.plateau(tx + 0.5, ty - 1, 3, 'tiles_cave');
      const cave = this.add.graphics().setDepth(5);
      cave.fillStyle(INK, 1).fillEllipse(x + 20, y - 64, 74, 62);
      cave.fillStyle(0x08141a, 1).fillEllipse(x + 20, y - 60, 60, 50);
    }
    if (l.id === 'nest') for (const [dx, dy] of [[-60, -40], [60, -30]]) deco('web_px', dx, dy, 0.5);
    if (l.id === 'queen') {
      deco('web_px', 0, -60, 1);
      const crown = deco('queen_crown', 0, -80);
      this.tweens.add({ targets: crown, y: crown.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (l.id === 'volcano') {
      this.add.image(x, y - 20, 'map_volcano').setOrigin(0.5, 1).setDepth(5);
      this.add
        .particles(x, y - 146, 'vsmoke_1', { speedY: { min: -22, max: -12 }, speedX: { min: 4, max: 12 }, lifespan: 3600, scale: { start: 0.67, end: 1.33 }, alpha: { start: 0.95, end: 0 }, frequency: 700 })
        .setDepth(6);
    }
    if (l.chase) {
      const lava = this.add.graphics().setDepth(5);
      lava.fillStyle(INK, 1).fillRect(x - 120, y + 34, 240, 18);
      lava.fillStyle(0xff7a1a, 1).fillRect(x - 116, y + 37, 232, 12);
      for (const dx of [-90, -50]) this.add.sprite(x + dx, y + 10, 'torch_item_anim', 0).setDepth(6).play('torch_flame');
    }
    if (l.id === 'stairs') {
      this.plateau(tx, ty - 1, 1, 'tilemap');
      this.plateau(tx + 3, ty - 1, 1, 'tilemap');
      const gate = this.add.graphics().setDepth(6);
      gate.fillStyle(0xfff1a8, 0.25).fillEllipse(x, y - 60, 70, 84);
      gate.fillStyle(0x7fd8ff, 0.85).fillRect(x - 16, y - 90, 32, 42);
      for (const px of [x - 26, x + 14]) {
        gate.fillStyle(INK).fillRect(px - 2, y - 100, 16, 56);
        gate.fillStyle(0xb8c4cc).fillRect(px, y - 98, 12, 52);
      }
      gate.fillStyle(INK).fillRect(x - 30, y - 112, 60, 16);
      gate.fillStyle(0xd8e0e6).fillRect(x - 28, y - 110, 56, 12);
    }
    if (l.puzzle) {
      // Fase de chave e porta: porta dourada e a chave girando.
      deco('door_exit', 60, -10, 0.55);
      const k = deco('key_item', -50, -40, 1);
      this.tweens.add({ targets: k, angle: { from: -15, to: 15 }, duration: 800, yoyo: true, repeat: -1 });
    }
    // Minas dos Goblins.
    if (['mineentry', 'cavein', 'dynamite', 'treasury', 'goblinking', 'bluefire', 'flooded'].includes(l.id)) deco('gold_stone_big', 50, -6, 0.4);
    if (l.id === 'bluefire') this.add.sprite(x - 40, y - 10, 'torch_item_anim', 0).setTint(0x7fd8ff).setDepth(6).play('torch_flame');
    if (l.id === 'goblinking') {
      this.add.sprite(x - 10, y - 10, 'king_torchgob_idle').setScale(0.55).setFlipX(true).setDepth(6).play('king_torchgob_idle');
      const crown = deco('queen_crown', -10, -70, 0.6);
      this.tweens.add({ targets: crown, y: crown.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Bosque dos Gnomos.
    if (l.tiles === 'tiles_forest') this.add.sprite(x - 70, y - 14, 'tree').setOrigin(0.5, 1).setScale(0.4).setDepth(6).play('tree');
    if (l.field?.mushrooms) deco('mushroom', 40, 0, 0.8);
    if (l.sea?.crateTex === 'log_float') deco('log_float', 30, 0, 0.7);
    if (l.id === 'gnomevillage') this.add.image(x + 40, y + 4, 'bld_blue_house2').setOrigin(0.5, 1).setScale(0.45).setDepth(6);
    if (l.id === 'gnomeking') {
      this.add.sprite(x + 10, y - 10, 'king_gnome_idle').setScale(0.6).setFlipX(true).setDepth(6).play('king_gnome_idle');
      const crown = deco('queen_crown', 10, -66, 0.6);
      this.tweens.add({ targets: crown, y: crown.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Forja Vulcânica (fases novas).
    if (l.field?.geysers) {
      const f = this.add.graphics().setDepth(6);
      f.fillStyle(0xff7a1a, 1).fillTriangle(x + 30, y + 4, x + 50, y + 4, x + 40, y - 50);
      f.fillStyle(0xffe066, 1).fillTriangle(x + 34, y + 4, x + 46, y + 4, x + 40, y - 30);
      this.tweens.add({ targets: f, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    }
    if (l.sea?.crateTex === 'basalt') deco('basalt', 40, -4, 0.6);
    if (l.sea?.plankTex === 'obsidian_plank') deco('obsidian_plank', 0, -10, 0.9);
    // Caverna das Teias (fases novas).
    if (l.id === 'webbridge') deco('web_plank', 0, -10, 0.9);
    if (l.id === 'cocoons') {
      const c = deco('cocoon', -30, -40, 1.2);
      this.tweens.add({ targets: c, y: c.y + 10, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (l.id === 'darkcave') this.add.sprite(x - 40, y - 10, 'torch_item_anim', 0).setDepth(6).play('torch_flame');
    // Pradaria dos Ossos.
    if (l.id === 'road' || l.id === 'farm') this.add.image(x - 50, y + 4, 'bld_yellow_house1').setOrigin(0.5, 1).setScale(0.45).setDepth(6);
    if (l.id === 'stampede' || l.id === 'farm') {
      const sh = this.add.sprite(x + 30, y + 6, 'sheep_move').setOrigin(0.5, 0.85).setScale(0.5).setDepth(6).play('sheep_move');
      if (l.id === 'stampede') sh.setTint(0xa0704a);
    }
    if (l.id === 'boneyard') {
      deco('skull_spike', -40, -20, 0.5);
      deco('bones', 40, -6, 0.6);
    }
    if (l.id === 'tallgrass') for (const dx of [-50, 10, 60]) this.add.sprite(x + dx, y + 10, 'bush1').setOrigin(0.5, 0.75).setScale(0.4).setDepth(6).play({ key: 'bush1', startFrame: (dx + 60) % 8 });
    if (l.id === 'gnollking') {
      this.add.sprite(x, y - 10, 'king_gnoll_idle').setScale(0.55).setFlipX(true).setDepth(6).play('king_gnoll_idle');
      const crown = deco('queen_crown', 0, -70, 0.6);
      this.tweens.add({ targets: crown, y: crown.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Ilhas da Maré.
    if (l.id === 'crabs') {
      const c = this.add.sprite(x - 40, y - 10, 'crab').setOrigin(0.5, 1).setScale(0.8).setDepth(6).play('crab');
      this.tweens.add({ targets: c, x: x + 40, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      deco('key_item', -40, -44, 0.8);
    }
    if (l.id === 'hightide' || l.id === 'reef' || l.id === 'floodgates') {
      const w = this.add.graphics().setDepth(5);
      w.fillStyle(0x39b5fd, 0.85).fillRect(x - 120, y + 18, 240, 26);
      w.fillStyle(0x8fd9ff, 1).fillRect(x - 120, y + 18, 240, 4);
      this.tweens.add({ targets: w, y: -22, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      deco('crate', 50, -6, 0.6);
    }
    if (l.id === 'reef') {
      deco('coral', -50, -6, 0.8);
      deco('coral', 70, -10, 0.6);
    }
    if (l.id === 'floodgates') {
      const lh = this.add.graphics().setDepth(6);
      for (let k = 0; k < 6; k++) {
        lh.fillStyle(INK, 1).fillRect(x - 64, y - 30 - k * 14, 30, 14);
        lh.fillStyle(k % 2 ? 0xd42a3c : 0xf4ead0, 1).fillRect(x - 62, y - 30 - k * 14, 26, 14);
      }
      lh.fillStyle(0xfff1a8, 1).fillRect(x - 60, y - 124, 22, 14);
      lh.fillStyle(0xd42a3c, 1).fillTriangle(x - 68, y - 124, x - 30, y - 124, x - 49, y - 144);
    }
    if (l.tiles === 'tiles_ship') {
      const m = this.add.graphics().setDepth(6);
      m.fillStyle(INK, 1).fillRect(x - 5, y - 130, 10, 120);
      m.fillStyle(0x8a5a2a, 1).fillRect(x - 3, y - 130, 6, 120);
      m.fillStyle(INK, 1).fillRect(x - 46, y - 116, 92, 66);
      m.fillStyle(0xf4ead0, 1).fillRect(x - 43, y - 113, 86, 60);
      m.fillStyle(0x2a2a3a, 1).fillCircle(x, y - 84, 12);
      m.fillStyle(0xf4ead0, 1).fillCircle(x, y - 86, 6);
      if (l.id === 'wreck') m.setAngle(-14);
      if (l.sea?.cannons) deco('cannon', 70, -10, 0.55);
    }
    if (l.undersea) {
      this.add
        .particles(x, y + 10, 'spark', { x: { min: -60, max: 60 }, speedY: { min: -50, max: -30 }, lifespan: 1800, scale: { start: 0.25, end: 0.1 }, alpha: { start: 0.9, end: 0 }, tint: 0xbfe9ff, frequency: 260 })
        .setDepth(6);
      this.add.sprite(x - 50, y - 30, 'shark_idle').setScale(0.45).setDepth(6).play('shark_idle');
    }
    if (l.id === 'sharkking') {
      this.add.sprite(x, y - 16, 'king_shark_idle').setScale(0.55).setFlipX(true).setDepth(6).play('king_shark_idle');
      const crown = deco('queen_crown', 0, -78, 0.7);
      this.tweens.add({ targets: crown, y: crown.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (l.gun) {
      deco('bone', -60, -30, 0.9);
      deco('bone', 50, -40, 0.9).setAngle(40);
      if (l.theme === 'cave') deco('gold_stone_big', 70, -20, 0.5);
    }
  }

  /** Vaga de fase ainda não construída: ilhota coberta de névoa. */
  private drawFog(i: number): void {
    const [x, y] = this.spot(i);
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x7a8a9a, 0.55).fillEllipse(x, y + 10, 230, 90);
    g.fillStyle(0xc9d1d8, 0.35).fillEllipse(x - 30, y - 6, 150, 60).fillEllipse(x + 50, y + 4, 120, 50);
    this.tweens.add({ targets: g, alpha: 0.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Medalhão de vaga vazia: cinza, com "?" (fase em construção). */
  private drawPlannedNode(x: number, y: number, i: number): void {
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillCircle(0, 0, 26);
    g.fillStyle(0x5f6872, 1).fillCircle(0, 0, 22);
    const q = this.add.text(0, 0, '?', { fontFamily: FONT, fontSize: '20px', color: '#c9d1d8' }).setOrigin(0.5);
    const t = this.add.text(0, 40, 'EM CONSTRUÇÃO', { fontFamily: FONT, fontSize: '13px', color: '#c9d1d8', stroke: '#10223a', strokeThickness: 5 }).setOrigin(0.5);
    const node = this.add.container(x, y, [g, q, t]).setDepth(10).setAlpha(0.8);
    this.nodes.push(node);
    void i;
  }

  /** Trilha de pontinhos (com contorno escuro) ligando as fases. */
  private drawPath(): void {
    const g = this.add.graphics().setDepth(7);
    const reach = this.NODE_AT[this.unlocked];
    for (let i = 0; i < this.PATH.length - 1; i++) {
      const [x0, y0] = this.PATH[i];
      const [x1, y1] = this.PATH[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const open = i < reach;
      const planned = !this.MAIN[i + 1];
      for (let d = 0; d < len; d += 20) {
        const x = Math.round(x0 + ((x1 - x0) * d) / len);
        const y = Math.round(y0 + ((y1 - y0) * d) / len);
        if (planned && (d / 20) % 2 >= 1) continue;
        g.fillStyle(INK, planned ? 0.4 : 1).fillRect(x - 6, y - 6, 12, 12);
        g.fillStyle(open ? 0xe8d9a8 : 0x8a95a3, planned ? 0.5 : 1).fillRect(x - 4, y - 4, 8, 8);
      }
    }
  }

  /** Medalhão de cada fase: dourado; concluída com ✓, liberada pulsando, trancada com cadeado. */
  private drawNodes(): void {
    this.NODE_AT.forEach((pi, i) => {
      const [x, y] = this.PATH[pi];
      const lv = this.MAIN[i];
      if (!lv) return this.drawPlannedNode(x, y, i);
      const g = this.add.graphics();
      const locked = i > this.unlocked;
      const cleared = isDone(lv.id);
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
          .text(0, 44, chapterFor(this.levelAt(i)).title.toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: locked ? '#c9d1d8' : '#fff7dc', stroke: '#10223a', strokeThickness: 6 })
          .setOrigin(0.5),
      );
      // Fases de chave: os 3 presentes (aceso = já pego).
      if (lv.puzzle && !locked) {
        const got = giftsOf(lv.id);
        ['meat', 'wood', 'gold'].forEach((tex, k) => items.push(this.add.image(-22 + k * 22, 66, tex).setScale(k === 2 ? 0.2 : 0.32).setAlpha(got.includes(k) ? 1 : 0.25)));
      }
      const node = this.add.container(x, y, items).setDepth(10).setSize(70, 70);
      node.setInteractive({ useHandCursor: !locked }).on('pointerdown', () => {
        if (locked) return;
        // Segundo clique na fase para onde já está indo: o esqueleto acelera.
        if (this.walking && i === this.walkTarget) this.hurry();
        else if (i === this.current && !this.walking) this.enter();
        else this.walkTo(i);
      });
      if (!locked && !cleared) this.tweens.add({ targets: node, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.nodes.push(node);
    });
    // Nó secreto (em preto e branco), ligado à caverna por uma trilha cinza.
    const sec = LEVELS.findIndex((l) => l.secret);
    if (sec >= 0 && hasSecret(LEVELS[sec].id) && this.area.levels.includes('cave')) {
      const [x, y] = this.secretSpot();
      const cave = Math.max(0, this.MAIN.findIndex((l) => l?.id === 'cave'));
      const [cx, cy] = this.spot(cave);
      const path = this.add.graphics().setDepth(7);
      const len = Math.hypot(x - cx, y - cy);
      for (let d = 30; d < len - 30; d += 20) {
        const px = cx + ((x - cx) * d) / len;
        const py = cy + ((y - cy) * d) / len;
        path.fillStyle(INK, 1).fillRect(px - 6, py - 6, 12, 12);
        path.fillStyle(0xd8d0c0, 1).fillRect(px - 4, py - 4, 8, 8);
      }
      const g = this.add.graphics();
      g.fillStyle(INK, 1).fillCircle(0, 0, 30);
      g.fillStyle(0x8a8478, 1).fillCircle(0, 0, 26);
      g.fillStyle(0xd8d0c0, 1).fillCircle(0, -2, 20);
      g.fillStyle(0x2a2a2a, 1).fillCircle(0, 0, 14);
      const t = this.add.text(0, 44, chapterFor(sec).title.toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: '#d8d0c0', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5);
      const q = this.add.text(0, 0, '?', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
      const node = this.add.container(x, y, [g, q, t]).setDepth(10).setSize(70, 70);
      node.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.walking) return;
        this.scene.start(isFreePlay() ? 'game' : 'vn', { mode: 'story', devices: this.devices, level: sec });
      });
      this.tweens.add({ targets: node, angle: { from: -4, to: 4 }, duration: 500, yoyo: true, repeat: -1 });
    }
  }

  /** Concluiu uma fase que libera habilidade: painel "NOVA HABILIDADE!" antes de andar. */
  private popupOpen = false;
  private closePopup?: () => void;

  private showAbilities(list: ReturnType<typeof unlockedBy>, then: () => void): void {
    if (!list.length) {
      // Solta a trava um instante depois (o mesmo Enter não deve entrar na fase).
      this.time.delayedCall(150, () => (this.popupOpen = false));
      return then();
    }
    this.popupOpen = true;
    const a = list[0];
    const cam = this.cameras.main;
    const W2 = cam.width;
    const H2 = cam.height;
    const items: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, W2 * 2, H2 * 2, 0x07040c, 0.7).setInteractive()];
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(-330, -170, 660, 340, 26);
    g.fillStyle(0x10223a, 1).fillRoundedRect(-322, -162, 644, 324, 22);
    g.lineStyle(4, 0xffe066, 1).strokeRoundedRect(-322, -162, 644, 324, 22);
    items.push(g);
    items.push(this.add.text(0, -128, 'NOVA HABILIDADE!', { fontFamily: FONT, fontSize: '40px', color: '#ffe066', stroke: '#1d1a2b', strokeThickness: 8 }).setOrigin(0.5));
    const icon = this.add.image(-220, 10, a.icon).setScale(a.icon === 'key_item' ? 2 : 2.4);
    items.push(icon);
    this.tweens.add({ targets: icon, angle: { from: -10, to: 10 }, duration: 600, yoyo: true, repeat: -1 });
    items.push(this.add.text(-140, -70, a.name.toUpperCase(), { fontFamily: FONT, fontSize: '28px', color: '#fff7dc' }));
    items.push(this.add.text(-140, -28, a.how, { fontFamily: BODY_FONT, fontSize: '19px', color: '#bfd0e0', wordWrap: { width: 440 }, lineSpacing: 4 }));
    const ok = pillButton(this, 0, 120, 'ENTENDI', () => close(), 200, 0xffe066);
    items.push(ok);
    const box = this.uiCam
      ? this.add.container(MW / 2, this.scale.height / 2, items).setDepth(60).setScale(1.5 * 0.6).setAlpha(0)
      : this.add.container(cam.scrollX + W2 / 2, cam.scrollY + H2 / 2, items).setDepth(60).setScale(0.6).setAlpha(0);
    if (this.uiCam) cam.ignore(box);
    this.tweens.add({ targets: box, scale: this.uiCam ? 1.5 : 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    if (!this.uiCam) this.burst(box.x, box.y - 120);
    const kb = this.input.keyboard!;
    const close = () => {
      kb.off('keydown-ENTER', close);
      kb.off('keydown-SPACE', close);
      box.destroy();
      this.closePopup = undefined;
      this.showAbilities(list.slice(1), then);
    };
    kb.once('keydown-ENTER', close);
    kb.once('keydown-SPACE', close);
    this.closePopup = close;
  }

  private burst(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(x, y, 'spark').setTint(0xffe066).setScale(0.5).setDepth(40);
      this.uiCam?.ignore(s);
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
    if (this.popupOpen) return;
    const to = Phaser.Math.Clamp(this.current + dir, 0, this.unlocked);
    if (to !== this.current) this.walkTo(to);
  }

  /** O esqueleto anda pela trilha, ponto a ponto, até a fase escolhida. */
  /** Destino da caminhada atual e se está correndo (clique duplo / Enter durante a caminhada). */
  private walkTarget = -1;
  private fast = false;
  private walkTween?: Phaser.Tweens.Tween;

  private hurry(): void {
    if (this.fast) return;
    this.fast = true;
    this.hero.anims.timeScale = 2.5;
    if (this.walkTween) this.walkTween.timeScale = 4;
  }

  private walkTo(to: number): void {
    if (this.walking || to === this.current) return;
    this.walking = true;
    this.walkTarget = to;
    this.fast = false;
    const a = this.NODE_AT[this.current];
    const b = this.NODE_AT[to];
    const dir = Math.sign(b - a);
    const pts: Array<[number, number]> = [];
    for (let i = a + dir; dir > 0 ? i <= b : i >= b; i += dir) pts.push(this.PATH[i]);
    this.hero.play('skull_run');
    const next = (k: number) => {
      if (k >= pts.length) {
        this.walking = false;
        this.walkTarget = -1;
        this.fast = false;
        this.walkTween = undefined;
        this.hero.anims.timeScale = 1;
        this.current = to;
        this.hero.play('skull_idle');
        this.updateInfo();
        return;
      }
      const [x, y] = pts[k];
      this.hero.setFlipX(x < this.hero.x);
      const dist = Math.hypot(x - this.hero.x, y - 34 - this.hero.y);
      this.walkTween = this.tweens.add({
        targets: [this.hero, this.heroAura],
        x,
        y: (t: Phaser.GameObjects.GameObject) => (t === this.hero ? y - 34 : y - 44),
        duration: Math.max(120, dist * 4),
        onComplete: () => next(k + 1),
      });
      if (this.fast) this.walkTween.timeScale = 4;
    };
    next(0);
  }

  private headerText(): string {
    const t = areaTitle(this.area);
    return `${t.name.toUpperCase()}${isFreePlay() ? ' · LIVRE' : ` · SAVE ${currentSlot()}`}`;
  }

  private toWorld(): void {
    if (this.popupOpen) return;
    this.scene.start('world', { devices: this.devices, area: this.area.id });
  }

  private updateInfo(): void {
    const ch = chapterFor(this.levelAt(this.current));
    this.infoTitle.setText(`FASE ${this.current + 1}/${this.MAIN.length} · ${ch.title.toUpperCase()}`);
    this.info.setText(`${ch.blurb}   ◀ ▶ escolher · Enter / A / toque: entrar · Esc: mundo`);
  }

  private enter(): void {
    if (this.popupOpen) return;
    // Enter / A durante a caminhada: acelera em vez de entrar.
    if (this.walking) return this.hurry();
    // Modo livre (testes): direto para a fase, sem a visual novel.
    const level = this.levelAt(this.current);
    if (level < 0) return;
    if (isFreePlay()) this.scene.start('game', { mode: 'story', devices: this.devices, level });
    else this.scene.start('vn', { devices: this.devices, level });
  }
}

