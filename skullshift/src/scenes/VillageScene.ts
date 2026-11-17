import { drawHills } from '../ui/props';
import { SMITH, smithCost } from '../game/dungeon';
import { noTr, tr, trf } from '../i18n';
import Phaser from 'phaser';
import { BODY_FONT, FONT, PORTRAIT, VIEW, W } from '../config';
import { AREAS, areaTitle, areaUnlocked, recommendedLevel } from '../game/areas';
import { getRun, heartsFor, startRun } from '../game/dungeon';
import { playMusic } from '../game/music';
import { buySmith, getCoins, getLevel, isDungeonDone, levelProgress, smithLevel } from '../game/progress';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';

const INK = 0x10223a;
/** Largura da vila (3 telas). */
const VW = 4000;
const VH = 720;
const GY = 560;

interface Spot {
  x: number;
  /** Nome curto no balão de "aperte E". */
  label: string;
  use: () => void;
}

/** Falas dos moradores (rodam a cada conversa). */
const NPC_LINES: Record<string, { name: string; lines: string[] }> = {
  farmer: {
    name: 'Dona Margarida',
    lines: [
      'Bom dia, ossudinho! A vila anda tranquila desde que você chegou.',
      'Dizem que as dungeons mudam toda vez que alguém entra. Eu é que não vou conferir.',
      'Quem treina com o Mestre Rufo sobe de nível rapidinho. Ou cai rapidinho.',
    ],
  },
  kid: {
    name: 'Pipo, o gnominho',
    lines: [
      'Você é um esqueleto de verdade? Posso contar suas costelas?',
      'Eu acertei três alvos seguidos na barraca do Grilo! Duvido você.',
      'As ovelhas fogem de você porque você é muito magro. Minha mãe disse.',
    ],
  },
  bard: {
    name: 'Bardo Teodoro',
    lines: [
      'Toda dungeon tem um guardião no fim. Toda canção também.',
      'Desistir de uma dungeon não é vergonha. Perder tudo lá dentro é só... caro.',
      'Os acampamentos das dungeons são os melhores lugares para compor. E para não morrer.',
    ],
  },
  walker: {
    name: 'Seu Joaquim',
    lines: [
      'Lá na Pradaria os gnolls ficaram mais fortes. Ou eu fiquei mais velho.',
      'Nas dungeons, os dados decidem muita coisa. A sorte ajuda quem tem nível.',
      'Precisando de ouro? Pesque no lago. Os peixes daqui são gordinhos.',
    ],
  },
};

/**
 * A Vila: um lugar pacífico, andável, entre as aventuras. A caveira anda pela rua (setas/A-D,
 * pulo, E para usar; no toque, toca onde quer ir) e encontra: a placa do mapa, o Empório, o
 * treinador (nível e XP), o lago de pesca, o portal das dungeons, a barraca de alvos, o curral
 * das ovelhas e moradores para conversar.
 */
export class VillageScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private vy = 0;
  private onGround = true;
  private targetX: number | null = null;
  private targetSpot: Spot | null = null;
  private spots: Spot[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private near: Spot | null = null;
  private dialog?: Phaser.GameObjects.Container;
  private talkIndex: Record<string, number> = {};
  private walkers: Array<{ spr: Phaser.GameObjects.Sprite; min: number; max: number; dir: number }> = [];
  private uiCam?: Phaser.Cameras.Scene2D.Camera;
  private uiObjs: Phaser.GameObjects.GameObject[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prevPad = { a: true, b: true };

  constructor() {
    super('village');
  }

  init(): void {
    this.vy = 0;
    this.onGround = true;
    this.targetX = null;
    this.targetSpot = null;
    this.spots = [];
    this.near = null;
    this.dialog = undefined;
    this.walkers = [];
    this.uiCam = undefined;
    this.uiObjs = [];
    this.prevPad = { a: true, b: true };
  }

  create(): void {
    playMusic('pradaria', 'vila');
    this.drawWorld();
    this.hero = this.add.sprite(420, GY, 'skull_idle').setOrigin(0.5, 0.82).setScale(0.75).setDepth(10).play('skull_idle');
    const cam = this.cameras.main;
    cam.setBounds(0, 0, VW, VH);
    const P = VIEW.portrait;
    if (P) {
      const HH = this.scale.height;
      const top = 250 + PORTRAIT.topPad;
      const zoom = Phaser.Math.Clamp((HH - top - 520) / VH, 1, 2.2);
      cam.setViewport(0, top, W, VH * zoom).setZoom(zoom);
    }
    cam.startFollow(this.hero, true, 0.12, 0.12);
    this.prompt = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: '#10223a', backgroundColor: '#fff7dc', padding: { x: 10, y: 5 } })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);
    this.createUI();

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,A,D,UP,W,SPACE,E,ENTER,F,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ['E', 'ENTER', 'F']) kb.on(`keydown-${k}`, () => this.action());
    kb.on('keydown-UP', () => (this.near ? this.action() : this.jump()));
    kb.on('keydown-W', () => this.jump());
    kb.on('keydown-SPACE', () => (this.dialog ? this.action() : this.jump()));
    kb.on('keydown-ESC', () => (this.dialog ? this.closeDialog() : this.toWorld()));
    // Toque/clique: anda até o ponto (e usa o lugar, se tocou num).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.dialog || over.length) return;
      if (VIEW.portrait && p.y < cam.y) return;
      const wp = cam.getWorldPoint(p.x, p.y);
      const spot = this.spots.find((s) => Math.abs(s.x - wp.x) < 90);
      this.targetX = spot ? spot.x : wp.x;
      this.targetSpot = spot ?? null;
    });
  }

  // ---------- cenário ----------

  private drawWorld(): void {
    const sky = this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
    sky.setDisplaySize(W, this.scale.height);
    // Morros ao fundo (parallax leve).
    const hills = this.add.graphics().setScrollFactor(0.4).setDepth(-5);
    const row = (o: number) => Array.from({ length: 9 }, (_, i) => i * 360 + o);
    drawHills(hills, row(120), GY + 30, 520, 260, 0x6fb86a, 0x8fd07a);
    drawHills(hills, row(300), GY + 60, 460, 200, 0x5aa257, 0x78bf68);
    for (let i = 0; i < 7; i++) {
      const c = this.add.image(Phaser.Math.Between(0, VW), Phaser.Math.Between(60, 220), `cloud_0${Phaser.Math.Between(1, 8)}`).setScrollFactor(0.2).setDepth(-6).setScale(0.5).setAlpha(0.9);
      this.tweens.add({ targets: c, x: c.x + 200, duration: 30000, yoyo: true, repeat: -1 });
    }
    // Chão de grama do Tiny Swords.
    const n = Math.ceil(VW / 64);
    for (let i = 0; i < n; i++) {
      const col = i === 0 ? 5 : i === n - 1 ? 7 : 6;
      this.add.image(i * 64, GY - 6, 'tilemap', 27 + col).setOrigin(0).setDepth(2);
      this.add.image(i * 64, GY + 58, 'tilemap', 45 + col).setOrigin(0).setDepth(2);
      this.add.image(i * 64, GY + 122, 'tilemap', 45 + col).setOrigin(0).setDepth(2);
    }
    const tree = (x: number, s = 0.8) => this.add.sprite(x, GY, 'res_tree').setOrigin(0.5, 0.9).setScale(s).setDepth(3).play({ key: 'res_tree', startFrame: (x >> 4) % 8 });
    for (const x of [60, 820, 1180, 1600, 2050, 2480, 2950, 3420, 3940]) tree(x, Phaser.Math.FloatBetween(0.7, 0.95));
    const stand = (x: number, key: string, foot: number, s: number) => {
      this.add.ellipse(x, GY - 2, 120 * s, 18, INK, 0.2).setDepth(2.5);
      return this.add.image(x, GY, key).setOrigin(0.5, foot).setScale(s).setDepth(4);
    };

    // 1) Placa do mapa-múndi.
    this.sign(240, 'MUNDO');
    this.addSpot(240, 'MAPA DO MUNDO', () => this.toWorld());

    // 2) Empório da Orelha-Preta.
    stand(600, 'bld_yellow_house2', 178 / 192, 0.9);
    this.npc(690, 'villager', 0xffd0a0, false);
    this.add.sprite(520, GY, 'sheep_idle').setOrigin(0.5, 0.8).setScale(0.95).setDepth(6).play('sheep_idle');
    this.label(600, 'EMPÓRIO');
    this.addSpot(640, 'EMPÓRIO', () => this.scene.start('shop', { devices: ['kb-full'], from: 'village' }));

    // 3) Treinador (nível e XP).
    stand(1000, 'bld_blue_barracks', 240 / 256, 0.75);
    this.npc(1090, 'gnoll', undefined, true);
    this.label(1000, 'TREINO');
    this.addSpot(1060, 'MESTRE RUFO', () => this.trainer());

    // 4) Lago de pesca.
    this.add.image(1400, GY + 26, 'prop_pond').setOrigin(0.5, 80 / 130).setDepth(2.6);
    this.add.image(1290, GY - 4, 'prop_dock').setOrigin(0, 0.12).setDepth(2.65);
    const shine = this.add.graphics().setDepth(2.7);
    shine.fillStyle(0xffffff, 0.7).fillEllipse(1450, GY + 30, 40, 4).fillEllipse(1380, GY + 40, 26, 3);
    this.tweens.add({ targets: shine, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });
    this.npc(1310, 'villager', 0xa0c8ff, false);
    this.label(1400, 'LAGO');
    this.addSpot(1360, 'PESCAR', () => this.scene.start('minigame', { kind: 'fish' }));

    // 5) Portal das dungeons, com o Xamã cuidando dele.
    this.portal(1840);
    const cloud = this.add.image(1960, GY - 150, 'cloud_05').setScale(0.3).setDepth(5);
    const hex = this.add.sprite(1960, GY - 196, 'shaman_idle').setFlipX(true).setDepth(5.1).play('shaman_idle');
    this.tweens.add({ targets: [cloud, hex], y: '-=8', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.label(1840, 'PORTAL DAS DUNGEONS');
    this.addSpot(1860, 'PORTAL', () => this.dungeonList());

    // 6) Barraca de alvos.
    stand(2290, 'bld_yellow_archery', 240 / 256, 0.75);
    this.npc(2380, 'goblin', undefined, true);
    this.label(2290, 'ALVOS');
    this.addSpot(2340, 'TIRO AO ALVO', () => this.scene.start('minigame', { kind: 'targets' }));

    // 7) Curral das ovelhas.
    for (let x = 2626; x < 2626 + 64 * 0.8 * 5; x += 64 * 0.8) this.add.image(x, GY + 4, 'prop_fence').setOrigin(0, 1).setScale(0.8).setDepth(5);
    this.add.image(2626 + 64 * 0.8 * 5 + 3, GY + 4, 'prop_fencepost').setOrigin(0, 1).setScale(0.8).setDepth(5);
    for (const x of [2690, 2770, 2850]) {
      const sh = this.add.sprite(x, GY - 4, 'sheep_move').setOrigin(0.5, 0.8).setScale(0.95).setDepth(4.5).play('sheep_move');
      this.walkers.push({ spr: sh, min: 2660, max: 2880, dir: x % 2 ? 1 : -1 });
    }
    this.npc(2950, 'villager', 0xc8f0a0, true);
    this.label(2770, 'CURRAL');
    this.addSpot(2900, 'PEGA-OVELHA', () => this.scene.start('minigame', { kind: 'sheep' }));

    // 9) Ferreiro: melhorias permanentes para as dungeons (como a mansão do Rogue Legacy).
    stand(3640, 'bld_red_barracks', 240 / 256, 0.75);
    this.add.image(3766, GY + 4, 'prop_anvil').setOrigin(0.5, 1).setScale(0.62).setDepth(5);
    const glow = this.add.ellipse(3766, GY - 58, 40, 18, 0xff8a2a, 0.35).setDepth(5.05);
    this.tweens.add({ targets: glow, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
    this.add.image(3800, GY - 66, 'tool_hammer').setScale(0.6).setAngle(-40).setDepth(5.1);
    const smith = this.npc(3720, 'villager', 0x9a8070, true);
    this.time.addEvent({ delay: 1400, loop: true, callback: () => smith.active && this.add.particles(3770, GY - 60, 'spark', { speed: { min: 60, max: 140 }, angle: { min: 220, max: 320 }, lifespan: 400, scale: { start: 0.25, end: 0 }, tint: [0xffe066, 0xff8a2a], quantity: 6, emitting: false }).setDepth(6).explode(6) });
    this.label(3640, 'FERREIRO');
    this.addSpot(3700, 'FERREIRO', () => this.smith());

    // 8) Estalagem e moradores.
    stand(3260, 'bld_red_house1', 173 / 192, 0.9);
    this.label(3260, 'ESTALAGEM');
    this.talker(3160, 'bard', 'villager', 0xe0b0ff);
    this.talker(3360, 'kid', 'sgnome', undefined);
    this.talker(780, 'farmer', 'villager', 0xffe0a0);
    // Morador que passeia pela rua.
    const w = this.npc(2100, 'villager', 0xb0e0c0, false);
    w.play('villager_run');
    this.walkers.push({ spr: w, min: 2000, max: 2600, dir: 1 });
    this.addSpot(2100, 'CONVERSAR', () => this.talk('walker'), () => w.x);
  }

  private label(x: number, text: string): void {
    const t = this.add.text(x, GY + 70, text, { fontFamily: FONT, fontSize: '17px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5).setDepth(8);
    const g = this.add.graphics().setDepth(7.9);
    g.fillStyle(INK, 0.85).fillRoundedRect(t.x - t.width / 2 - 10, t.y - 14, t.width + 20, 28, 9);
  }

  private sign(x: number, text: string): void {
    this.add.image(x, GY + 4, 'prop_sign').setOrigin(0.5, 1).setDepth(5);
    const t = this.add.text(x - 10, GY + 4 - 132 + 42, text, { fontFamily: FONT, fontSize: '20px', color: '#3a2412' }).setOrigin(0.5).setDepth(5.1);
    if (t.width > 116) t.setScale(116 / t.width);
  }

  private portal(x: number): void {
    // Redemoinho dentro do arco: gira dentro de um contêiner achatado na vertical.
    const spin = this.add.image(0, 0, 'prop_swirl').setScale(0.78);
    const swirl = this.add.container(x, GY - 82, [spin]).setScale(1, 1.42).setDepth(4.1);
    this.tweens.add({ targets: spin, angle: 360, duration: 4000, repeat: -1 });
    this.tweens.add({ targets: swirl, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(x, GY + 4, 'prop_portal').setOrigin(0.5, 236 / 240).setDepth(4);
    this.add
      .particles(x, GY - 80, 'spark', { x: { min: -40, max: 40 }, y: { min: -60, max: 60 }, speedY: { min: -30, max: -10 }, lifespan: 1200, scale: { start: 0.3, end: 0 }, tint: [0xd8b8ff, 0x9b6bf0], frequency: 140 })
      .setDepth(4.2);
  }

  /** Personagem parado (ou andando) na rua. */
  private npc(x: number, id: string, tint: number | undefined, flip: boolean): Phaser.GameObjects.Sprite {
    const s = this.add.sprite(x, GY, `${id}_idle`).setOrigin(0.5, 0.8).setScale(0.62).setDepth(6).setFlipX(flip).play(`${id}_idle`);
    if (tint !== undefined) s.setTint(tint);
    return s;
  }

  private talker(x: number, who: string, id: string, tint?: number): void {
    this.npc(x, id, tint, x > 2000);
    this.addSpot(x, 'CONVERSAR', () => this.talk(who));
  }

  private dynamicX = new Map<Spot, () => number>();

  private addSpot(x: number, label: string, use: () => void, follow?: () => number): void {
    const s: Spot = { x, label, use };
    this.spots.push(s);
    if (follow) this.dynamicX.set(s, follow);
  }

  // ---------- interface ----------

  private createUI(): void {
    const first = this.children.list.length;
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const k = P ? 2 : 1;
    const top = P ? 80 + PORTRAIT.topPad : 36;
    if (P) this.add.rectangle(0, 0, W, 250 + PORTRAIT.topPad, INK).setOrigin(0);
    this.add.text(W / 2, P ? 222 + PORTRAIT.topPad : 34, 'A VILA', { fontFamily: FONT, fontSize: P ? '56px' : '32px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 9 }).setOrigin(0.5);
    pillButton(this, P ? 150 : 100, top, '◀ MUNDO', () => this.toWorld(), 180).setScale(0.75 * k);
    // Nível e barra de XP, e o ouro.
    const lp = levelProgress();
    const bx = P ? W - 700 : W - 360;
    const g = this.add.graphics();
    g.fillStyle(INK, 0.9).fillRoundedRect(bx - 10, top - 26 * k, 340 * k, 52 * k, 12);
    g.fillStyle(0x2a3a52, 1).fillRoundedRect(bx + 100 * k, top - 6 * k, 210 * k, 16 * k, 6);
    g.fillStyle(0x9b6bf0, 1).fillRoundedRect(bx + 100 * k, top - 6 * k, Math.max(8, 210 * k * lp.frac), 16 * k, 6);
    this.add.text(bx, top, `NÍVEL ${lp.level}`, { fontFamily: FONT, fontSize: `${Math.round(20 * k)}px`, color: '#ffe066' }).setOrigin(0, 0.5);
    noTr(this.add
      .text(bx + 100 * k, top - 16 * k, lp.need ? trf('{0}/{1} XP', lp.into, lp.need) : tr('NÍVEL MÁXIMO'), { fontFamily: BODY_FONT, fontSize: `${Math.round(13 * k)}px`, color: '#d8b8ff' })
      .setOrigin(0, 0.5));
    this.goldText = this.add.text(bx, top + 40 * k, `Ouro: ${getCoins()}`, { fontFamily: FONT, fontSize: `${Math.round(18 * k)}px`, color: '#ffd84a', stroke: '#10223a', strokeThickness: 5 }).setOrigin(0, 0.5);
    if (P) this.touchPad(HH);
    else this.add
      .text(W / 2, VH - 20, '◀ ▶ andar · ↑/W pular · E usar/conversar · toque para ir até lá', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 4 })
      .setOrigin(0.5, 1);
    this.uiObjs = this.children.list.slice(first);
    this.fixUI(this.uiObjs);
  }

  /** Em pé: botões grandes embaixo (segurar ◀ ▶ anda; PULAR; USAR). */
  private touchMove = 0;

  private touchPad(HH: number): void {
    const y = HH - 330;
    const hold = (x: number, label: string, dir: number) => {
      const g = this.add.graphics();
      g.fillStyle(INK, 1).fillRoundedRect(x - 130, y - 110, 260, 220, 40);
      g.fillStyle(0xbfe9ff, 1).fillRoundedRect(x - 122, y - 102, 244, 204, 34);
      this.add.text(x, y, label, { fontFamily: FONT, fontSize: '96px', color: '#10223a' }).setOrigin(0.5);
      this.add
        .zone(x, y, 260, 220)
        .setInteractive()
        .on('pointerdown', () => (this.touchMove = dir))
        .on('pointerup', () => this.touchMove === dir && (this.touchMove = 0))
        .on('pointerout', () => this.touchMove === dir && (this.touchMove = 0));
    };
    hold(180, '◀', -1);
    hold(470, '▶', 1);
    pillButton(this, W - 470, y - 50, 'PULAR', () => this.jump(), 300, 0xffe066).setScale(1.6);
    pillButton(this, W - 230, y + 70, 'USAR', () => this.action(), 300, 0xc8a8ff).setScale(1.6);
    this.add.text(W / 2, HH - 120, 'Toque no cenário para andar até um lugar', { fontFamily: BODY_FONT, fontSize: '30px', color: '#bfd0e0' }).setOrigin(0.5);
  }

  /** Objetos de interface: presos na tela (deitado) ou só na câmera da interface (em pé). */
  private fixUI(objs: Phaser.GameObjects.GameObject[]): void {
    if (!VIEW.portrait) {
      for (const o of objs) (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
      for (const o of objs) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(Math.max(40, (o as unknown as { depth: number }).depth ?? 0));
      return;
    }
    if (!this.uiCam) {
      this.uiCam = this.cameras.add(0, 0, W, this.scale.height);
      this.uiCam.ignore(this.children.list.filter((o) => !objs.includes(o)));
    }
    this.cameras.main.ignore(objs);
    for (const o of objs) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(40);
  }

  /** Câmera da interface (em pé) não deve ver objetos do mundo criados depois. */
  private worldAdd<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.uiCam?.ignore(o);
    return o;
  }

  private openDialog(name: string, text: string, choices: Array<{ label: string; act: () => void; raw?: boolean }> = []): void {
    this.closeDialog();
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const k = P ? 2 : 1;
    const pw = P ? W - 80 : 980;
    const rows = Math.max(1, choices.length);
    const ph = (150 + rows * 62) * k;
    const x = W / 2 - pw / 2;
    const y = (P ? HH - 140 : VH - 40) - ph;
    const first = this.children.list.length;
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(x - 6, y - 6, pw + 12, ph + 12, 22);
    g.fillStyle(0xfff7dc, 1).fillRoundedRect(x, y, pw, ph, 18);
    this.add.text(x + 28, y + 22 * k, name, { fontFamily: FONT, fontSize: `${Math.round(24 * k)}px`, color: '#7a3ad0' });
    this.add.text(x + 28, y + 62 * k, text, { fontFamily: BODY_FONT, fontSize: `${Math.round(19 * k)}px`, color: '#10223a', wordWrap: { width: choices.length ? pw - 56 - 420 * k : pw - 56 }, lineSpacing: 4 });
    const list = choices.length ? choices : [{ label: 'OK', act: () => this.closeDialog() }];
    list.forEach((c, i) => {
      const btn = pillButton(this, x + pw - 230 * k, y + ph - (list.length - i) * 64 * k + 20 * k, c.label, () => c.act(), 500, i === 0 ? 0xffe066 : 0xe7eef2).setScale(0.78 * k);
      if ((c as { raw?: boolean }).raw) noTr(btn.list[1] as Phaser.GameObjects.Text).setText(c.label);
    });
    const objs = this.children.list.slice(first);
    this.fixUI(objs);
    this.dialog = this.add.container(0, 0, objs as Phaser.GameObjects.GameObject[]);
    this.fixUI([this.dialog]);
    this.dialogFirst = list[0].act;
    sfx('select');
  }

  private dialogFirst?: () => void;

  private closeDialog(): void {
    this.dialog?.destroy(true);
    this.dialog = undefined;
    this.dialogFirst = undefined;
  }

  // ---------- lugares ----------

  private talk(who: string): void {
    const n = NPC_LINES[who];
    const i = this.talkIndex[who] ?? 0;
    this.talkIndex[who] = (i + 1) % n.lines.length;
    this.openDialog(n.name, n.lines[i]);
  }

  private trainer(): void {
    const lp = levelProgress();
    const hearts = heartsFor(lp.level);
    const next = lp.need ? `Faltam ${lp.need - lp.into} XP para o nível ${lp.level + 1}.` : 'Você chegou ao nível máximo!';
    this.openDialog(
      'Mestre Rufo',
      `Nível ${lp.level}. ${next}\nNas dungeons você entra com ${hearts} corações (+1 a cada 3 níveis). Abaixo do nível sugerido, os inimigos aguentam mais golpes; bem acima, você bate em dobro.\nXP vem das fases, das dungeons e até dos jogos da vila.`,
    );
  }

  private dungeonList(): void {
    const run = getRun();
    const open = AREAS.filter((a) => a.levels.length && areaUnlocked(a));
    const choices: Array<{ label: string; act: () => void }> = [];
    if (run) choices.push({ label: 'CONTINUAR A DUNGEON', act: () => this.scene.start('dungeon', {}) });
    // As 4 mais próximas do nível do jogador (para caber no painel).
    const L = getLevel();
    const best = [...open].sort((a, b) => Math.abs(recommendedLevel(a) - L) - Math.abs(recommendedLevel(b) - L)).slice(0, run ? 3 : 4);
    best.sort((a, b) => recommendedLevel(a) - recommendedLevel(b));
    for (const a of best) {
      const done = isDungeonDone(a.id);
      choices.push({
        label: `${areaTitle(a).name} · NV ${recommendedLevel(a)}${done ? ' ✓' : ''}`,
        act: () => {
          startRun(a.id, 'village', done);
          this.scene.start('dungeon', {});
        },
      });
    }
    this.openDialog(
      'Portal das Dungeons',
      `Seu nível: ${L}. Escolha uma dungeon (o número é o nível sugerido). Dá para entrar acima do seu nível, mas vai doer.${run ? '\nVocê tem uma dungeon em andamento.' : ''}`,
      choices,
    );
  }

  private goldText?: Phaser.GameObjects.Text;

  /** Ferreiro: lista as melhorias com nível e preço; comprar reabre a lista atualizada. */
  private smith(): void {
    const choices = SMITH.map((u) => {
      const lvl = smithLevel(u.id);
      const maxed = lvl >= u.max;
      const cost = smithCost(u.id, lvl);
      return {
        // Montado já traduzido (o nome tem espaços e o molde "{0} {1}/{2}" cortaria no lugar errado).
        label: maxed ? trf('{0} · MÁX', tr(u.name)) : trf('{0} {1}/{2} · {3} ouro', tr(u.name), lvl + 1, u.max, cost),
        raw: true,
        act: () => {
          if (maxed) return;
          if (!buySmith(u.id, cost)) {
            this.cameras.main.shake(120, 0.004);
            return;
          }
          sfx('pick');
          this.goldText?.setText(`Ouro: ${getCoins()}`);
          this.smith();
        },
      };
    });
    const lines = SMITH.map((u) => `${u.name}: ${u.desc}`).join('\n');
    this.openDialog('Ferreiro Bruno', `Ouro: ${getCoins()}. Melhorias que ficam para sempre, em toda dungeon:\n${lines}`, [...choices, { label: 'SAIR', act: () => this.closeDialog() }]);
  }

  private toWorld(): void {
    this.scene.start('world', { devices: ['kb-full'] });
  }

  // ---------- movimento ----------

  private jump(): void {
    if (this.dialog || !this.onGround) return;
    this.vy = -620;
    this.onGround = false;
    sfx('jump');
  }

  private action(): void {
    if (this.dialog) {
      const f = this.dialogFirst;
      if (f) f();
      else this.closeDialog();
      return;
    }
    if (this.near) {
      sfx('select');
      this.near.use();
    }
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const k = this.keys;
    let move = 0;
    if (!this.dialog) {
      if (k.LEFT.isDown || k.A.isDown) move -= 1;
      if (k.RIGHT.isDown || k.D.isDown) move += 1;
      if (this.touchMove) move = this.touchMove;
      const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
      if (pad) {
        const ax = pad.axes[0]?.getValue() ?? 0;
        if (Math.abs(ax) > 0.4) move = Math.sign(ax);
        if (pad.buttons[14]?.pressed) move = -1;
        if (pad.buttons[15]?.pressed) move = 1;
        const a = !!pad.buttons[0]?.pressed;
        const b = !!pad.buttons[1]?.pressed;
        if (a && !this.prevPad.a) this.near ? this.action() : this.jump();
        if (b && !this.prevPad.b) this.toWorld();
        this.prevPad = { a, b };
      }
    } else {
      const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
      if (pad) {
        const a = !!pad.buttons[0]?.pressed;
        const b = !!pad.buttons[1]?.pressed;
        if (a && !this.prevPad.a) this.action();
        if (b && !this.prevPad.b) this.closeDialog();
        this.prevPad = { a, b };
      }
    }
    if (move !== 0) {
      this.targetX = null;
      this.targetSpot = null;
    } else if (this.targetX !== null && !this.dialog) {
      const d = this.targetX - this.hero.x;
      if (Math.abs(d) < 8) {
        this.targetX = null;
        const s = this.targetSpot;
        this.targetSpot = null;
        if (s) s.use();
      } else move = Math.sign(d);
    }
    this.hero.x = Phaser.Math.Clamp(this.hero.x + move * 300 * dt, 40, VW - 40);
    if (move) this.hero.setFlipX(move < 0);
    // Pulo.
    if (!this.onGround) {
      this.vy += 1700 * dt;
      this.hero.y += this.vy * dt;
      if (this.hero.y >= GY) {
        this.hero.y = GY;
        this.vy = 0;
        this.onGround = true;
      }
    }
    const anim = move ? 'skull_run' : 'skull_idle';
    if (this.hero.anims.currentAnim?.key !== anim) this.hero.play(anim);

    // Quem passeia pela rua.
    for (const w of this.walkers) {
      w.spr.x += w.dir * 50 * dt;
      if (w.spr.x < w.min || w.spr.x > w.max) w.dir = -w.dir;
      w.spr.setFlipX(w.dir < 0);
    }
    for (const [s, f] of this.dynamicX) s.x = f();

    // Lugar mais perto: balão "E: ...".
    let best: Spot | null = null;
    for (const s of this.spots) if (Math.abs(s.x - this.hero.x) < 70 && (!best || Math.abs(s.x - this.hero.x) < Math.abs(best.x - this.hero.x))) best = s;
    this.near = best;
    if (best && !this.dialog) {
      this.prompt.setText(`E · ${best.label}`).setPosition(this.hero.x, this.hero.y - 120).setVisible(true);
    } else this.prompt.setVisible(false);
    void this.worldAdd;
  }
}
