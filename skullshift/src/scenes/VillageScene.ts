import { prepareVillageGame, takeVillageResult, type VillageGame } from '../game/villagegames';
import { soloDevices } from '../game/controls';
import { TouchPad } from '../game/touch';
import { CHARS, type CharId } from '../game/characters';
import { drawHills, drawMountains } from '../ui/props';
import { SMITH, smithCost } from '../game/dungeon';
import { noTr, tr, trf } from '../i18n';
import Phaser from 'phaser';
import { BODY_FONT, FONT, PORTRAIT, VIEW, W } from '../config';
import { AREAS, areaTitle, areaUnlocked, recommendedLevel } from '../game/areas';
import { getRun, heartsFor, startRun } from '../game/dungeon';
import { musicNotesSince, playMusic } from '../game/music';
import { buySmith, getCoins, getLevel, hasSeen, isDone, isDungeonDone, isFreePlay, isSecretDone, levelProgress, smithLevel } from '../game/progress';
import { LEVELS, PROLOGUE_LEVELS, TRIAL_LEVELS } from '../game/level';
import { buzz, sfx } from '../game/settings';
import { rollNumber } from '../ui/juice';
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
      'Bom dia, ossudinho! A vila inteira fala do escolhido.',
      'Dizem que as dungeons mudam toda vez que alguém entra. Eu é que não vou conferir.',
      'Ossian... engraçado. O último que o Hex trouxe também se chamava assim.',
    ],
  },
  kid: {
    name: 'Pipo, o ossinho',
    lines: [
      'Você é o escolhido? Posso contar suas costelas?',
      'Fiz a Corrida do Goblin em menos de vinte segundos! Duvido você.',
      'Eu não lembro de ter nascido. Você lembra? A mamãe diz que ninguém aqui lembra.',
    ],
  },
  bard: {
    name: 'Bardo Teodoro',
    lines: [
      'Toda dungeon tem um guardião no fim. Toda canção também.',
      'Ando compondo sobre uma ponte cheia de lanternas. Não sei de onde tirei isso. Nunca vi um rio.',
      'Desistir de uma dungeon não é vergonha. Perder tudo lá dentro é só... caro.',
    ],
  },
  walker: {
    name: 'Seu Joaquim',
    lines: [
      'Lá na Pradaria os gnolls ficaram mais fortes. Ou eu fiquei mais velho.',
      'O Hex sempre aparece quando alguém cai. Sempre. Nunca atrasa nem um minuto.',
      'Precisando de ouro? O Mestre Rufo paga por inimigo derrubado na arena.',
    ],
  },
};

/**
 * A Vila dos Ossos: onde Ossian desperta, entre outros esqueletos (cada morador de uma cor).
 * Um lugar pacífico, andável, entre as aventuras. A caveira anda pela rua (setas/A-D,
 * pulo, E para usar; no toque, toca onde quer ir) e encontra: a placa do mapa, o Empório, o
 * treinador (nível, XP e a arena), o lago, o portal das dungeons, a barraca da corrida do Goblin,
 * o curral das ovelhas, a estalagem, o ferreiro e moradores para conversar.
 */
/** Linha de um painel de lista (textos já traduzidos). */
interface PanelRow {
  name: string;
  pips?: { on: number; max: number };
  desc: string;
  btn: string;
  color: number;
  act: () => void;
}

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

  private from?: string;

  init(data: { from?: string } = {}): void {
    this.from = data.from;
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
    this.lookers = [];
    this.birds = [];
    this.tufts = [];
    this.torches = [];
    this.bard = undefined;
    this.hammer = undefined;
    this.noteClock = 0;
    this.idleSince = -1;
    this.napEv = undefined;
    this.prevPad = { a: true, b: true };
  }

  create(): void {
    playMusic('pradaria', 'vila');
    const cam = this.cameras.main;
    const P = VIEW.portrait;
    this.skyTop = 0;
    if (P) {
      // Em pé: a vila ocupa todo o espaço entre o cabeçalho e os botões; mostra ~720 px de rua
      // de largura e, se sobrar altura, mais céu por cima.
      const HH = this.scale.height;
      // Mesma divisão das fases: cabeçalho, faixa do mundo e painel de botões embaixo.
      const top = PORTRAIT.hudH;
      const h = PORTRAIT.worldH;
      void HH;
      const zoom = Phaser.Math.Clamp(W / 560, 1, h / (VH - 330));
      cam.setViewport(0, top, W, h).setZoom(zoom);
      this.skyTop = Math.min(0, VH - h / zoom);
    }
    cam.setBounds(0, this.skyTop, VW, VH - this.skyTop);
    this.drawWorld();
    const back: Record<string, number> = { arena: 1060, race: 2340, sheep: 2900 };
    this.hero = this.add.sprite(back[this.from ?? ''] ?? 420, GY, 'skull_idle').setOrigin(0.5, CHARS.skull.feetY / CHARS.skull.frame).setScale(0.75).setDepth(10).play('skull_idle');
    cam.startFollow(this.hero, true, 0.12, 0.12);
    this.prompt = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: '#10223a', backgroundColor: '#fff7dc', padding: { x: 10, y: 5 } })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);
    this.createUI();
    // Voltando de um jogo da vila: mostra o prêmio.
    const res = takeVillageResult();
    if (res) this.time.delayedCall(250, () => this.openDialog(res.title, res.text));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,A,D,UP,W,SPACE,E,ENTER,F,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ['E', 'ENTER', 'F']) kb.on(`keydown-${k}`, () => this.action());
    kb.on('keydown-UP', () => (this.dialogNav ? this.dialogNav(-1) : this.near ? this.action() : this.jump()));
    kb.on('keydown-DOWN', () => this.dialogNav?.(1));
    kb.on('keydown-W', () => (this.dialogNav ? this.dialogNav(-1) : this.jump()));
    kb.on('keydown-S', () => this.dialogNav?.(1));
    kb.on('keydown-SPACE', () => (this.dialog ? this.action() : this.jump()));
    kb.on('keydown-ESC', () => (this.dialog ? this.closeDialog() : this.toWorld()));
    // Toque/clique: anda até o ponto (e usa o lugar, se tocou num).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.dialog || over.length) return;
      if (VIEW.portrait && (p.y < cam.y || p.y > cam.y + cam.height)) return;
      if (this.pad?.hits(p.x, p.y)) return;
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
    // Parallax feito à mão (segue a área visível), assim funciona igual com zoom no modo em pé.
    const peaks = this.add.graphics().setDepth(-5.5);
    drawMountains(peaks, -200, 1900, GY - 40);
    const hills = this.add.graphics().setDepth(-5);
    this.parallax = [{ obj: hills, k: 0.6 }, { obj: peaks, k: 0.85 }];
    const row = (o: number) => Array.from({ length: 9 }, (_, i) => i * 360 + o);
    drawHills(hills, row(120), GY + 30, 520, 260, 0x6fb86a, 0x8fd07a);
    drawHills(hills, row(300), GY + 60, 460, 200, 0x5aa257, 0x78bf68);
    const clouds = this.add.container(0, 0).setDepth(-6);
    this.parallax.push({ obj: clouds, k: 0.8 });
    const skyTop = Math.min(60, this.skyTop + 60);
    for (let i = 0; i < 7 + Math.round((60 - skyTop) / 90); i++) {
      const c = this.add.image(Phaser.Math.Between(0, VW * 0.4), Phaser.Math.Between(skyTop, 220), `cloud_0${Phaser.Math.Between(1, 8)}`).setScale(0.5).setAlpha(0.9);
      clouds.add(c);
      this.tweens.add({ targets: c, x: c.x + 200, duration: 30000, yoyo: true, repeat: -1 });
    }
    // Chão de grama do Tiny Swords.
    const n = Math.ceil(VW / 64);
    for (let i = 0; i < n; i++) {
      const col = i === 0 ? 5 : i === n - 1 ? 7 : 6;
      // A grama começa acima da linha dos pés: casas e gente ficam EM CIMA do gramado
      // (não pousadas na borda de cima, contra os morros).
      this.add.image(i * 64, GY - 30, 'tilemap', 27 + col).setOrigin(0).setDepth(2);
      for (let r = 0; r < 3; r++) this.add.image(i * 64, GY + 34 + r * 64, 'tilemap', 45 + col).setOrigin(0).setDepth(2);
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
    const shopSheep = this.add.sprite(520, GY, 'sheep_idle').setOrigin(0.5, 0.66).setScale(0.95).setDepth(6).play('sheep_idle');
    this.lookers.push({ spr: shopSheep, flip: false });
    this.label(600, 'EMPÓRIO');
    this.addSpot(640, 'EMPÓRIO', () => this.scene.start('shop', { devices: ['kb-full'], from: 'village' }));

    // 3) Treinador (nível e XP).
    stand(1000, 'bld_blue_barracks', 240 / 256, 0.75);
    this.npc(1090, 'gnoll', 0xff9a6a, true);
    this.label(1000, 'TREINO');
    this.addSpot(1060, 'MESTRE RUFO', () => this.trainer());

    // 4) Lago (só enfeite: a pesca saiu, não fazia sentido no jogo).
    // Lago achatado no gramado, atrás de quem passa pela rua.
    this.add.image(1400, GY - 8, 'prop_pond').setOrigin(0.5, 80 / 130).setScale(1, 0.62).setDepth(2.6);
    this.add.image(1292, GY - 18, 'prop_dock').setOrigin(0, 0.12).setScale(0.9, 0.7).setDepth(2.65);
    const shine = this.add.graphics().setDepth(2.7);
    shine.fillStyle(0xffffff, 0.7).fillEllipse(1450, GY - 4, 40, 3).fillEllipse(1380, GY + 4, 26, 3);
    this.tweens.add({ targets: shine, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });
    this.npc(1310, 'villager', 0xa0c8ff, false);
    this.label(1400, 'LAGO');

    // 4b) Pedra das Provas: as provas de domínio de cada forma (depois do sonho dela).
    this.add.image(1610, GY + 6, 'stone4').setOrigin(0.5, 1).setScale(2.2).setDepth(4.9);
    this.add.image(1610, GY - 52, 'skull_avatar').setScale(0.22).setDepth(4.95);
    this.label(1610, 'PROVAS');
    this.addSpot(1610, 'PEDRA DAS PROVAS', () => this.trials());

    // 5) Portal das dungeons, com o Xamã cuidando dele.
    this.portal(1840);
    const cloud = this.add.image(1960, GY - 150, 'cloud_05').setScale(0.3).setDepth(5);
    const hex = this.add.sprite(1960, GY - 196, 'shaman_idle').setFlipX(true).setDepth(5.1).play('shaman_idle');
    this.tweens.add({ targets: [cloud, hex], y: '-=8', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.label(1840, 'PORTAL DAS DUNGEONS');
    this.addSpot(1860, 'PORTAL', () => this.dungeonList());

    // 6) Barraca do Goblin (a corrida).
    stand(2290, 'bld_yellow_archery', 240 / 256, 0.75);
    this.npc(2380, 'goblin', 0x9ae07a, true);
    this.label(2290, 'CORRIDA');
    this.addSpot(2340, 'CORRIDA DO GOBLIN', () => this.raceDesk());

    // 7) Curral das ovelhas.
    for (let x = 2626; x < 2626 + 64 * 0.8 * 5; x += 64 * 0.8) this.add.image(x, GY + 4, 'prop_fence').setOrigin(0, 1).setScale(0.8).setDepth(5);
    this.add.image(2626 + 64 * 0.8 * 5 + 3, GY + 4, 'prop_fencepost').setOrigin(0, 1).setScale(0.8).setDepth(5);
    for (const x of [2690, 2770, 2850]) {
      const sh = this.add.sprite(x, GY - 3, 'sheep_move').setOrigin(0.5, 0.66).setScale(0.95).setDepth(4.5).play('sheep_move');
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
    // O martelo bate no tempo da música (veja strike); o cabo fica preso pela ponta.
    this.hammer = this.add.image(3790, GY - 50, 'tool_hammer').setOrigin(0.8, 0.8).setScale(0.6).setAngle(-40).setDepth(5.1);
    this.npc(3720, 'villager', 0x9a8070, true);
    this.label(3640, 'FERREIRO');
    this.addSpot(3700, 'FERREIRO', () => this.smith());

    // 8) Estalagem e moradores.
    stand(3260, 'bld_red_house1', 173 / 192, 0.9);
    this.label(3260, 'ESTALAGEM');
    this.bard = this.talker(3160, 'bard', 'villager', 0xe0b0ff);
    this.talker(3360, 'kid', 'sgnome', 0xffe066);
    this.talker(780, 'farmer', 'villager', 0xffe0a0);
    // Morador que passeia pela rua.
    const w = this.npc(2100, 'villager', 0xb0e0c0, false);
    w.play('skull_run');
    this.walkers.push({ spr: w, min: 2000, max: 2600, dir: 1 });
    this.addSpot(2100, 'CONVERSAR', () => this.talk('walker'), () => w.x);
    this.dressStreet();
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
    // Vila dos Ossos: todo morador é um esqueleto como o Ossian; a cor diferencia cada um.
    // (O id antigo só decide o tamanho: o gnominho virou uma criança-esqueleto.)
    const small = id === 'sgnome';
    id = 'skull';
    const s = this.add.sprite(x, GY, `${id}_idle`).setOrigin(0.5, CHARS[id as CharId].feetY / CHARS[id as CharId].frame).setScale(small ? 0.46 : 0.62).setDepth(6).setFlipX(flip).play({ key: `${id}_idle`, startFrame: Math.floor(x / 97) % 8 });
    s.setTint(tint ?? 0xffffff);
    this.lookers.push({ spr: s, flip });
    return s;
  }

  private talker(x: number, who: string, id: string, tint?: number): Phaser.GameObjects.Sprite {
    const s = this.npc(x, id, tint, x > 2000);
    this.addSpot(x, 'CONVERSAR', () => this.talk(who));
    return s;
  }

  // ---------- plussing: o mundo repara na caveira ----------

  /** Quem vira a cabeça para a caveira quando ela passa perto (e o lado de antes). */
  private lookers: Array<{ spr: Phaser.GameObjects.Sprite; flip: boolean }> = [];
  private birds: Array<{ spr: Phaser.GameObjects.Image; home: [number, number]; away: boolean }> = [];
  private tufts: Phaser.GameObjects.Image[] = [];
  private torches: Phaser.GameObjects.Sprite[] = [];
  private bard?: Phaser.GameObjects.Sprite;
  private hammer?: Phaser.GameObjects.Image;
  private noteClock = 0;
  private heroVx = 0;

  /** Pássaros, tufos de grama e tochas espalhados pela rua. */
  private dressStreet(): void {
    // Tufos de grama que se abrem quando a caveira passa.
    for (let x = 140; x < VW - 100; x += Phaser.Math.Between(70, 130)) {
      this.tufts.push(this.add.image(x, GY + 2, 'prop_tuft').setOrigin(0.5, 0.95).setDepth(6.5).setScale(Phaser.Math.FloatBetween(0.9, 1.3)));
    }
    // Passarinhos no chão e nos telhados: levantam voo quando a caveira chega perto.
    for (const [x, y] of [[420, GY - 2], [900, GY - 2], [1700, GY - 2], [2470, GY - 2], [3020, GY - 2], [600, GY - 150], [3260, GY - 175]] as Array<[number, number]>) {
      const b = this.add.image(x, y, 'prop_bird').setOrigin(0.5, 1).setScale(0.8).setDepth(6.6).setFlipX(Math.random() < 0.5);
      this.birds.push({ spr: b, home: [x, y], away: false });
      // Bica o chão de vez em quando.
      this.tweens.add({ targets: b, angle: { from: 0, to: b.flipX ? -18 : 18 }, duration: 140, yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(900, 2400) });
    }
    // Vila dos Ossos: estacas com caveiras e montinhos de ossos pela rua.
    for (const x of [120, 400, 1560, 2580, 3480, 3900]) {
      this.add.image(x - 22, GY + 6, 'skull_spike').setOrigin(0.5, 1).setScale(0.62).setDepth(4.8);
      this.add.image(x + 22, GY + 6, 'skull_spike').setOrigin(0.5, 1).setScale(0.62).setDepth(4.8).setFlipX(true);
    }
    for (const x of [330, 1200, 1720, 2240, 3060]) this.add.image(x, GY + 8, 'bones').setOrigin(0.5, 1).setScale(0.9).setDepth(6.4);
    // Varal de lanternas de osso entre a estalagem e o ferreiro.
    const line = this.add.graphics().setDepth(5.2);
    line.lineStyle(2, 0x3a2412, 1);
    const [lx0, lx1, ly] = [3120, 3560, GY - 150];
    line.beginPath();
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const xx = lx0 + (lx1 - lx0) * t;
      const yy = ly + Math.sin(Math.PI * t) * 40;
      if (k === 0) line.moveTo(xx, yy);
      else line.lineTo(xx, yy);
    }
    line.strokePath();
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const xx = lx0 + (lx1 - lx0) * t;
      const yy = ly + Math.sin(Math.PI * t) * 40;
      const lamp = this.add.ellipse(xx, yy + 14, 16, 20, [0xffd84a, 0xb46bff, 0xff9a6a][k % 3], 0.95).setStrokeStyle(2, INK).setDepth(5.3);
      this.tweens.add({ targets: lamp, angle: { from: -8, to: 8 }, duration: 900 + k * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Tochas na porta da estalagem e na forja.
    for (const x of [3175, 3345, 3600]) {
      this.add.rectangle(x, GY, 8, 56, 0x6a4428).setOrigin(0.5, 1).setStrokeStyle(2, INK).setDepth(4.9);
      const t = this.add.sprite(x, GY - 52, 'torch_item_anim').setOrigin(0.5, 0.95).setScale(1.3).setDepth(5).play('torch_flame');
      this.torches.push(t);
    }
  }

  /** O mundo reage: olhares, pássaros, grama, tochas, o bardo e o martelo no ritmo da música. */
  private plussing(dt: number): void {
    const hx = this.hero.x;
    const fast = Math.abs(this.heroVx) > 150;
    // Olhares: perto, vira para a caveira; longe, volta para onde olhava.
    for (const l of this.lookers) {
      if (this.walkers.some((w) => w.spr === l.spr)) continue;
      const near = Math.abs(l.spr.x - hx) < 240;
      l.spr.setFlipX(near ? hx < l.spr.x : l.flip);
    }
    // Pássaros: voam para longe da caveira e voltam um tempo depois.
    for (const b of this.birds) {
      if (b.away || Math.abs(b.spr.x - hx) > 150 || Math.abs(b.home[1] - this.hero.y) > 220) continue;
      b.away = true;
      const dir = b.spr.x >= hx ? 1 : -1;
      this.tweens.killTweensOf(b.spr);
      b.spr.setTexture('prop_bird_fly').setFlipX(dir < 0).setAngle(0);
      sfx('click', 1.6);
      const flap = this.tweens.add({ targets: b.spr, scaleY: { from: 0.8, to: 0.45 }, duration: 90, yoyo: true, repeat: -1 });
      this.tweens.add({
        targets: b.spr,
        x: b.spr.x + dir * 520,
        y: b.home[1] - 420,
        duration: 1600,
        ease: 'Sine.easeIn',
        onComplete: () => {
          flap.remove();
          b.spr.setVisible(false);
          this.time.delayedCall(Phaser.Math.Between(6000, 11000), () => {
            if (!b.spr.active) return;
            b.spr.setTexture('prop_bird').setScale(0.8).setPosition(b.home[0], b.home[1]).setVisible(true).setAlpha(0);
            this.tweens.add({ targets: b.spr, alpha: 1, duration: 400, onComplete: () => (b.away = false) });
          });
        },
      });
    }
    // Grama: abre para os lados dos pés da caveira e volta balançando.
    for (const t of this.tufts) {
      const dx = t.x - hx;
      if (Math.abs(dx) < 34 && this.onGround) {
        const want = (dx < 0 ? -1 : 1) * 32;
        if (!this.tweens.isTweening(t)) this.tweens.add({ targets: t, angle: want, duration: 90, onComplete: () => this.tweens.add({ targets: t, angle: 0, duration: 900, ease: 'Elastic.easeOut' }) });
      }
    }
    // Tochas: a chama inclina para trás quando a caveira passa correndo.
    for (const t of this.torches) {
      const near = Math.abs(t.x - hx) < 130;
      const lean = near && fast ? -Math.sign(this.heroVx) * 22 : Math.sin(this.time.now / 300 + t.x) * 3;
      t.angle += (lean - t.angle) * Math.min(1, dt * 8);
    }
    // Música tocada de verdade: cada nota do violão sai do alaúde do bardo, e o baixo
    // (as notas graves) é a martelada do ferreiro.
    const { now, notes } = musicNotesSince(this.noteClock);
    // Primeira leitura: só marca o relógio (sem despejar as notas antigas de uma vez).
    if (!this.noteClock) notes.length = 0;
    this.noteClock = now;
    for (const n of notes) {
      if (n.inst === 'guitar' && n.midi < 52) this.strike();
      else if (this.bard && Math.random() < 0.6) this.note(n.midi);
    }
  }

  /** Cochilo: 20 s parada, a caveira solta "z"s; ao se mexer, acorda com um susto. */
  private idleSince = 0;
  private napEv?: Phaser.Time.TimerEvent;

  private napCheck(busy: boolean): void {
    const now = this.time.now;
    if (busy) {
      if (this.napEv) {
        this.napEv.remove();
        this.napEv = undefined;
        sfx('clack', 1.2);
        const t = this.worldAdd(noTr(this.add.text(this.hero.x, this.hero.y - 130, '!', { fontFamily: FONT, fontSize: '40px', color: '#ffe066', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0.5).setDepth(12)));
        this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
      }
      this.idleSince = now;
      return;
    }
    // Primeiro quadro: começa a contar daqui (o relógio da cena ainda não andou antes).
    if (this.idleSince < 0) this.idleSince = now;
    if (this.napEv || now - this.idleSince < 20000) return;
    this.napEv = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const z = this.worldAdd(noTr(this.add.text(this.hero.x + 10, this.hero.y - 90, 'z', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#10223a', strokeThickness: 5 }).setOrigin(0.5).setDepth(12)));
        this.tweens.add({ targets: z, x: z.x + 40, y: z.y - 70, scale: 1.8, alpha: 0, duration: 1600, ease: 'Sine.easeOut', onComplete: () => z.destroy() });
      },
    });
  }

  private lastNoteAt = 0;

  /** Uma nota (♪) sai do alaúde do bardo: mais aguda = sobe mais. */
  private note(midi: number): void {
    const b = this.bard!;
    if (this.time.now - this.lastNoteAt < 120 || Math.abs(b.x - this.hero.x) > 900) return;
    this.lastNoteAt = this.time.now;
    const hue = Phaser.Display.Color.HSVToRGB(((midi * 37) % 360) / 360, 0.5, 1) as Phaser.Types.Display.ColorObject;
    const t = this.worldAdd(noTr(this.add.text(b.x + (b.flipX ? -18 : 18), b.y - 70, midi % 2 ? '♪' : '♫', { fontFamily: 'Arial, sans-serif', fontSize: '26px', color: Phaser.Display.Color.RGBToString(hue.r, hue.g, hue.b), stroke: '#10223a', strokeThickness: 4 }).setOrigin(0.5).setDepth(9)));
    const rise = 60 + (midi - 50) * 4;
    this.tweens.add({ targets: t, y: t.y - rise, x: t.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
    // O bardo balança junto com a nota.
    this.tweens.add({ targets: b, angle: { from: b.flipX ? 5 : -5, to: 0 }, duration: 220 });
  }

  /** Martelada do ferreiro no tempo da música: o martelo cai, faíscas saltam da bigorna. */
  private strike(): void {
    const h = this.hammer;
    if (!h || this.tweens.isTweening(h) || Math.abs(h.x - this.hero.x) > 900) return;
    this.tweens.add({
      targets: h,
      angle: { from: -80, to: -20 },
      duration: 110,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.worldAdd(this.add.particles(3770, GY - 60, 'spark', { speed: { min: 60, max: 160 }, angle: { min: 210, max: 330 }, lifespan: 380, scale: { start: 0.25, end: 0 }, tint: [0xffe066, 0xff8a2a], emitting: false }).setDepth(6)).explode(5);
        this.tweens.add({ targets: h, angle: -40, duration: 220, ease: 'Sine.easeOut' });
      },
    });
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
    if (P) this.add.rectangle(0, 0, W, PORTRAIT.hudH, INK).setOrigin(0);
    const title = this.add.text(P ? 432 : W / 2, P ? 80 + PORTRAIT.topPad : 34, 'VILA DOS OSSOS', { fontFamily: FONT, fontSize: P ? '50px' : '32px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 9 }).setOrigin(0.5);
    if (P && title.width > 260) title.setScale(260 / title.width);
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
    this.goldText = noTr(this.add.text(bx, top + 40 * k, '', { fontFamily: FONT, fontSize: `${Math.round(18 * k)}px`, color: '#ffd84a', stroke: '#10223a', strokeThickness: 5 }).setOrigin(0, 0.5)).setText(trf('Ouro: {0}', getCoins()));
    const touch = P || this.sys.game.device.input.touch;
    if (touch) this.touchPad();
    if (!touch) this.add
      .text(W / 2, VH - 20, '◀ ▶ andar · ↑/W pular · E usar/conversar · toque para ir até lá', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 4 })
      .setOrigin(0.5, 1);
    this.uiObjs = this.children.list.slice(first);
    this.fixUI(this.uiObjs);
  }

  /** Controle de toque igual ao das fases (◀ ▶ PULA USAR), no painel de baixo quando em pé. */
  private pad?: TouchPad;

  private touchPad(): void {
    const P = VIEW.portrait;
    if (P) {
      const top = PORTRAIT.hudH + PORTRAIT.worldH;
      this.add.rectangle(0, top, W, VIEW.h - top, 0x16304d).setOrigin(0);
      this.add.rectangle(0, top, W, 8, 0x0b1626).setOrigin(0);
      this.add.text(W / 2, VIEW.h - 70 - PORTRAIT.topPad * 0.3, 'Toque no cenário para andar até um lugar', { fontFamily: BODY_FONT, fontSize: '28px', color: '#9fb4c8' }).setOrigin(0.5);
    }
    this.pad = new TouchPad(this, 'full', 0xfff7dc, undefined, false, false, false, 'walk');
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
    // Em pé: letra bem maior (a tela tem 1280 de largura virtual, mas o celular é estreito).
    const k = P ? 2.6 : 1;
    const pw = P ? W - 60 : 980;
    const x = W / 2 - pw / 2;
    const first = this.children.list.length;
    const g = this.add.graphics();
    const title = this.add.text(x + 28, 0, name, { fontFamily: FONT, fontSize: `${Math.round(24 * k)}px`, color: '#7a3ad0' });
    const body = this.add.text(x + 28, 0, text, { fontFamily: BODY_FONT, fontSize: `${Math.round(19 * k)}px`, color: '#10223a', wordWrap: { width: choices.length && !P ? pw - 56 - 420 * k : pw - 56 }, lineSpacing: 4 });
    // Altura pelo texto: com escolhas, os botões ficam na coluna da direita; só "OK", embaixo do texto.
    const rows = Math.max(1, choices.length);
    const textH = 62 * k + body.height + 22 * k;
    // Em pé a tela é estreita: os botões sempre vão embaixo do texto.
    const ph = choices.length && !P ? Math.max(textH, (40 + rows * 64) * k) : P ? textH + (rows * 64 + 10) * k : textH + 70 * k;
    const y = (P ? HH - 120 : VH - 40) - ph;
    title.setY(y + 22 * k);
    body.setY(y + 62 * k);
    g.fillStyle(INK, 1).fillRoundedRect(x - 6, y - 6, pw + 12, ph + 12, 22);
    g.fillStyle(0xfff7dc, 1).fillRoundedRect(x, y, pw, ph, 18);
    const list = choices.length ? choices : [{ label: 'OK', act: () => this.closeDialog() }];
    list.forEach((c, i) => {
      const btn = pillButton(this, P ? W / 2 : x + pw - 230 * k, y + ph - (list.length - i) * 64 * k + 20 * k, c.label, () => c.act(), 500, i === 0 ? 0xffe066 : 0xe7eef2).setScale(0.78 * k);
      if ((c as { raw?: boolean }).raw) noTr(btn.list[1] as Phaser.GameObjects.Text).setText(c.label);
    });
    const objs = this.children.list.slice(first);
    this.fixUI(objs);
    this.dialog = this.add.container(0, 0, objs as Phaser.GameObjects.GameObject[]);
    this.fixUI([this.dialog]);
    this.dialogFirst = list[0].act;
    // Os botões de toque somem enquanto a janela está aberta (não ficam por cima dela).
    this.pad?.setVisible(false);
    sfx('select');
  }

  private dialogFirst?: () => void;

  private closeDialog(): void {
    this.dialog?.destroy(true);
    this.dialog = undefined;
    this.dialogFirst = undefined;
    this.dialogNav = undefined;
    this.pad?.setVisible(true);
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
      [
        { label: 'LUTAR NA ARENA', act: () => this.playGame('arena') },
        { label: 'SAIR', act: () => this.closeDialog() },
      ],
    );
  }

  /**
   * Pedra das Provas: uma prova por forma, aberta depois do sonho dela no prólogo. Mostra 5 por
   * página (a última linha passa a página), com a meta de tempo e a medalha.
   */
  private trials(page = 0, sel = 0): void {
    const all = TRIAL_LEVELS.filter((_t, i) => isFreePlay() || isDone(PROLOGUE_LEVELS[i].id));
    const won = TRIAL_LEVELS.filter((t) => isSecretDone(t.id)).length;
    const medals = TRIAL_LEVELS.filter((t) => hasSeen(`medal-${t.id}`)).length;
    const per = 5;
    const pages = Math.max(1, Math.ceil(all.length / per));
    page = Phaser.Math.Wrap(page, 0, pages);
    const rows: PanelRow[] = all.slice(page * per, page * per + per).map((t) => {
      const medal = hasSeen(`medal-${t.id}`);
      const done = isSecretDone(t.id);
      return {
        name: tr(t.name) + (medal ? ' ★' : done ? ' ✓' : ''),
        desc: medal ? trf('Medalha! Meta: {0}s', t.trial!.par) : done ? trf('Vencida. Medalha abaixo de {0}s.', t.trial!.par) : trf('1ª vez: 60 de ouro · medalha abaixo de {0}s: +40', t.trial!.par),
        btn: tr('JOGAR'),
        color: medal ? 0xcfe8c0 : 0xffe066,
        act: () => this.scene.start('loading', { next: 'game', data: { mode: 'story', devices: soloDevices(this), level: LEVELS.indexOf(t) } }),
      };
    });
    if (pages > 1) rows.push({ name: trf('Página {0} de {1}', page + 1, pages), desc: tr('Mais provas.'), btn: tr('PRÓXIMA ▶'), color: 0xe7eef2, act: () => this.trials(page + 1, 0) });
    this.listPanel({
      title: tr('Pedra das Provas'),
      right: trf('★ {0}/{1}', medals, TRIAL_LEVELS.length),
      sub: all.length ? trf('Provas vencidas: {0} de {1}. Cada sonho do prólogo abre a prova da sua forma.', won, TRIAL_LEVELS.length) : tr('Termine os sonhos da Vila dos Ossos para abrir as provas.'),
      rows,
      sel,
      rowMinP: 210,
      reopen: (n) => this.trials(page, n),
    });
  }

  /** Barraca do Goblin: a corrida contra o relógio. */
  private raceDesk(): void {
    this.openDialog('Goblin da Barraca', 'Um percurso de buracos e plataformas. Chegue ao fim o mais rápido que puder: quanto menos tempo, mais ouro. Cair encerra a corrida.', [
      { label: 'CORRER', act: () => this.playGame('race') },
      { label: 'SAIR', act: () => this.closeDialog() },
    ]);
  }

  /** Jogos da vila são fases de verdade (mesmo combate e mesmos pulos das áreas). */
  private playGame(kind: VillageGame): void {
    this.scene.start('loading', { next: 'game', data: { mode: 'story', devices: soloDevices(this), level: prepareVillageGame(kind) } });
  }

  /**
   * Portal: uma linha por dungeon (nome, nível sugerido, se já foi vencida) e o botão ENTRAR,
   * colorido pela dificuldade em relação ao seu nível. A dungeon em andamento vem primeiro.
   */
  private dungeonList(sel = 0): void {
    const run = getRun();
    const L = getLevel();
    const rows: PanelRow[] = [];
    if (run) {
      const ra = AREAS.find((a) => a.id === run.area);
      rows.push({
        name: ra ? tr(areaTitle(ra).name) : tr('Dungeon'),
        desc: tr('Você tem uma dungeon em andamento.'),
        btn: tr('CONTINUAR'),
        color: 0xffe066,
        act: () => this.scene.start('dungeon', {}),
      });
    }
    // As mais próximas do seu nível (quantas couberem), em ordem de dificuldade.
    const open = AREAS.filter((a) => a.levels.length && areaUnlocked(a));
    const fit = (VIEW.portrait ? 6 : 5) - rows.length;
    const best = [...open].sort((a, b) => Math.abs(recommendedLevel(a) - L) - Math.abs(recommendedLevel(b) - L)).slice(0, fit);
    best.sort((a, b) => recommendedLevel(a) - recommendedLevel(b));
    for (const a of best) {
      const done = isDungeonDone(a.id);
      const rec = recommendedLevel(a);
      const gap = rec - L;
      rows.push({
        name: tr(areaTitle(a).name),
        desc: done ? trf('Nível sugerido: {0} · já vencida', rec) : trf('Nível sugerido: {0}', rec),
        btn: tr('ENTRAR'),
        // Amarelo: no seu nível; laranja: um pouco acima; vermelho: vai doer.
        color: gap <= 0 ? 0xffe066 : gap <= 3 ? 0xffb46a : 0xff8a7a,
        act: () => {
          startRun(a.id, 'village', done);
          this.scene.start('dungeon', {});
        },
      });
    }
    this.listPanel({
      title: tr('Portal das Dungeons'),
      right: trf('Nível {0}', L),
      sub: trf('Seu nível: {0}. Dá para entrar acima do seu nível, mas vai doer.', L),
      rows,
      sel,
      rowMinP: 210,
      reopen: (n) => this.dungeonList(n),
    });
  }

  private goldText?: Phaser.GameObjects.Text;

  /** Ferreiro: uma linha por melhoria (nome, nível em bolinhas, o que faz e o botão com o preço). */
  private smith(sel = 0): void {
    const coins = getCoins();
    const rows: PanelRow[] = SMITH.map((u, i) => {
      const lvl = smithLevel(u.id);
      const maxed = lvl >= u.max;
      const cost = smithCost(u.id, lvl);
      return {
        name: tr(u.name),
        pips: { on: lvl, max: u.max },
        desc: tr(u.desc),
        btn: maxed ? tr('MÁX') : trf('{0} ouro', cost),
        color: maxed ? 0xcfe8c0 : coins >= cost ? 0xffe066 : 0xe7eef2,
        act: () => this.buyUpgradeAt(i),
      };
    });
    this.listPanel({
      title: tr('Ferreiro Bruno'),
      right: trf('Ouro: {0}', coins),
      sub: tr('Melhorias que ficam para sempre, em toda dungeon.'),
      rows,
      sel,
      rowMinP: 250,
      reopen: (n) => this.smith(n),
    });
  }

  /**
   * Painel de lista (Ferreiro, Portal): título, um texto, linhas com nome, bolinhas opcionais,
   * descrição e um botão; SAIR embaixo. Em pé tudo cresce e as linhas ocupam a altura livre.
   * Teclado: ↑ ↓ escolhem a linha, Enter aperta o botão dela, Esc fecha. Os textos já vêm traduzidos.
   */
  private listPanel(o: { title: string; right?: string; sub: string; rows: PanelRow[]; sel: number; rowMinP: number; reopen: (sel: number) => void }): void {
    this.closeDialog();
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const k = P ? 2.5 : 1;
    const n = o.rows.length;
    const sel = Phaser.Math.Clamp(o.sel, 0, Math.max(0, n - 1));
    const pw = P ? W - 60 : 1000;
    const head = P ? 250 : 96;
    const foot = P ? 190 : 74;
    const rowH = P ? Phaser.Math.Clamp((HH - PORTRAIT.hudH - 60 - head - foot) / Math.max(1, n), o.rowMinP, 300) : Math.min(92, (VH - 16 - head - foot) / Math.max(1, n));
    const ph = head + n * rowH + foot;
    const x = W / 2 - pw / 2;
    const y = P ? Math.max(PORTRAIT.hudH + 20, (HH - ph) / 2) : Math.max(8, (VH - ph) / 2);
    const first = this.children.list.length;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRect(0, 0, W, HH);
    g.fillStyle(INK, 1).fillRoundedRect(x - 6, y - 6, pw + 12, ph + 12, 22);
    g.fillStyle(0xfff7dc, 1).fillRoundedRect(x, y, pw, ph, 18);
    const txt = (tx: number, ty: number, value: string, style: Phaser.Types.GameObjects.Text.TextStyle) => noTr(this.add.text(tx, ty, '', style)).setText(value);
    txt(x + 28, y + 20 * k, o.title, { fontFamily: FONT, fontSize: `${Math.round(26 * k)}px`, color: '#7a3ad0' });
    if (o.right) txt(x + pw - 28, y + 24 * k, o.right, { fontFamily: FONT, fontSize: `${Math.round(21 * k)}px`, color: '#8a5a00' }).setOrigin(1, 0);
    txt(x + 28, y + (P ? 140 : 58), o.sub, { fontFamily: BODY_FONT, fontSize: `${Math.round(17 * k)}px`, color: '#3a2412', wordWrap: { width: pw - 56 } });
    const btnS = P ? 1.55 : 0.8;
    const btnW = 240 * btnS;
    o.rows.forEach((row, i) => {
      const ry = y + head + i * rowH;
      const on = i === sel;
      g.fillStyle(on ? 0xffe9a8 : 0xf4e3bf, 1).fillRoundedRect(x + 16, ry + 4, pw - 32, rowH - 8, 14);
      if (on) g.lineStyle(4, 0xffb000, 1).strokeRoundedRect(x + 16, ry + 4, pw - 32, rowH - 8, 14);
      const textW = pw - 72 - btnW - 30;
      const nameT = txt(x + 36, ry + (P ? 22 : 12), row.name, { fontFamily: FONT, fontSize: `${Math.round(20 * k)}px`, color: '#10223a' });
      if (nameT.width > textW) nameT.setScale(textW / nameT.width);
      let descY = ry + (P ? 100 : 44);
      if (row.pips) {
        // Nível: uma bolinha por estágio (cheia = já comprada).
        const r = 7 * k;
        for (let p = 0; p < row.pips.max; p++) {
          const cx = x + 36 + r + p * r * 2.8;
          const cy = ry + (P ? 112 : 50);
          g.fillStyle(INK, 1).fillCircle(cx, cy, r + 2);
          g.fillStyle(p < row.pips.on ? 0xe8463a : 0xd8c8a0, 1).fillCircle(cx, cy, r);
        }
        descY = ry + (P ? 148 : 64);
      }
      txt(x + 36, descY, row.desc, { fontFamily: BODY_FONT, fontSize: `${Math.round(16 * k)}px`, color: '#3a2412', wordWrap: { width: textW }, lineSpacing: P ? 2 : 0 });
      const btn = pillButton(this, x + pw - 36 - btnW / 2, ry + rowH / 2, '', () => row.act(), 240, row.color).setScale(btnS);
      noTr(btn.list[1] as Phaser.GameObjects.Text).setText(row.btn);
      // Tocar na linha escolhe; tocar no botão age.
      this.add
        .zone(x + 16 + (pw - 32 - btnW - 40) / 2, ry + rowH / 2, pw - 32 - btnW - 40, rowH - 8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => i !== sel && o.reopen(i));
    });
    pillButton(this, W / 2, y + ph - foot / 2, 'SAIR', () => this.closeDialog(), 240, 0xe7eef2).setScale(P ? 1.7 : 0.85);
    const objs = this.children.list.slice(first);
    this.fixUI(objs);
    this.dialog = this.add.container(0, 0, objs as Phaser.GameObjects.GameObject[]);
    this.fixUI([this.dialog]);
    this.pad?.setVisible(false);
    this.dialogFirst = () => o.rows[sel]?.act();
    this.dialogNav = (d) => o.reopen(Phaser.Math.Wrap(sel + d, 0, n));
  }

  private buyUpgradeAt(i: number): void {
    const u = SMITH[i];
    const lvl = smithLevel(u.id);
    if (lvl >= u.max) return;
    if (!buySmith(u.id, smithCost(u.id, lvl))) {
      sfx('hit');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    sfx('pick');
    buzz(20);
    // O ouro do canto desce rolando até o valor novo.
    if (this.goldText) rollNumber(this, this.goldText, getCoins() + smithCost(u.id, lvl), getCoins(), (v) => trf('Ouro: {0}', v));
    this.smith(i);
  }

  /** ↑ ↓ dentro de um painel de lista (Ferreiro, Portal). */
  private dialogNav?: (d: number) => void;

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

  private parallax: Array<{ obj: Phaser.GameObjects.Graphics | Phaser.GameObjects.Container; k: number }> = [];
  /** Topo do mundo visível (negativo em pé: mostra mais céu acima da vila). */
  private skyTop = 0;

  update(_t: number, delta: number): void {
    const view = this.cameras.main.worldView;
    for (const p of this.parallax) p.obj.x = view.x * p.k;
    const dt = Math.min(0.05, delta / 1000);
    const k = this.keys;
    let move = 0;
    if (!this.dialog) {
      if (k.LEFT.isDown || k.A.isDown) move -= 1;
      if (k.RIGHT.isDown || k.D.isDown) move += 1;
      if (this.pad) {
        const t = this.pad.read();
        if (t.left) move = -1;
        if (t.right) move = 1;
        if (t.jumpPressed) this.jump();
        if (t.pickPressed) this.action();
      }
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

    this.heroVx = move * 300;
    this.plussing(dt);
    this.napCheck(move !== 0 || !this.onGround || !!this.dialog);

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
