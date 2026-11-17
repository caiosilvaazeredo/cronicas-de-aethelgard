import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { areaById, areaTitle } from '../game/areas';
import { playMusic, type Track } from '../game/music';
import { addCoins, addXp, getLevel, markDungeonDone, smithLevel } from '../game/progress';
import { sfx } from '../game/settings';
import {
  clearReward,
  endRun,
  getRun,
  saveRun,
  levelGap,
  prepareRoom,
  roomLevel,
  successChance,
  type Blessing,
  type DNode,
  type DungeonRun,
} from '../game/dungeon';
import { pillButton } from '../ui/devices';
import { levelUpBanner } from '../ui/levelup';

const INK = 0x10223a;

/** Eventos das salas de "?" (o índice vem do mapa gerado). */
interface EventChoice {
  label: string;
  /** Quantos dados rolar (0 = sem rolagem). */
  dice: number;
  /** Ouro pago antes (se não tiver, a escolha fica apagada). */
  cost?: number;
  /** Efeito conforme os acertos (0..dice). Devolve o texto do resultado. */
  run: (hits: number, rn: DungeonRun) => string;
}
interface DungeonEvent {
  title: string;
  text: string;
  choices: EventChoice[];
}

const heal = (rn: DungeonRun, n: number) => {
  const before = rn.hearts;
  rn.hearts = Math.min(rn.maxHearts, rn.hearts + n);
  return rn.hearts - before;
};
const hurt = (rn: DungeonRun, n: number) => {
  rn.hearts = Math.max(0, rn.hearts - n);
};
const goldOf = (rn: DungeonRun, base: number) => Math.round(base + base * 0.5 * rn.tier);

const EVENTS: DungeonEvent[] = [
  {
    title: 'Altar de Ossos',
    text: 'Um altar coberto de velas apagadas. Alguém ainda reza aqui.',
    choices: [
      {
        label: 'Rezar',
        dice: 2,
        run: (h, rn) => {
          if (h === 2) {
            rn.maxHearts++;
            rn.hearts++;
            return 'As velas acendem sozinhas. Coração extra!';
          }
          if (h === 1) return heal(rn, 1) ? 'Um calor leve. Recuperou um coração.' : 'Um calor leve, mas você já estava inteiro.';
          hurt(rn, 1);
          return 'As velas sopram fumaça fria. Perdeu um coração.';
        },
      },
      { label: 'Seguir em frente', dice: 0, run: () => 'Melhor não mexer com o que não se conhece.' },
    ],
  },
  {
    title: 'Mercador Encapuzado',
    text: 'Um vulto oferece um frasco vermelho. "Para quem ainda tem pele... ou osso."',
    choices: [
      { label: 'Comprar poção', dice: 0, cost: 15, run: (_h, rn) => (heal(rn, 2) ? 'Bebeu a poção. Recuperou corações.' : 'Bebeu a poção, mas não fez diferença.') },
      { label: 'Seguir em frente', dice: 0, run: () => 'O vulto some no escuro, resmungando.' },
    ],
  },
  {
    title: 'Poço dos Desejos',
    text: 'Moedas brilham no fundo de um poço. Dizem que ele devolve em dobro.',
    choices: [
      {
        label: 'Jogar moedas',
        dice: 1,
        cost: 10,
        run: (h, rn) => {
          if (!h) return 'Plim. Nada aconteceu.';
          const g = goldOf(rn, 25);
          rn.gold += g;
          return `O poço devolveu ouro: ${g}`;
        },
      },
      { label: 'Seguir em frente', dice: 0, run: () => 'Você guarda as moedas.' },
    ],
  },
  {
    title: 'Viajante Ferido',
    text: 'Um aventureiro caído pede ajuda. Ele parece conhecer bem estas salas.',
    choices: [
      {
        label: 'Ajudar',
        dice: 1,
        run: (h, rn) => {
          const x = 15 + rn.tier * 6;
          rn.xp += h ? x * 2 : x;
          return h ? 'Ele mostra atalhos e segredos. Ganhou muita experiência!' : 'Ele agradece e conta histórias. Ganhou experiência.';
        },
      },
      { label: 'Seguir em frente', dice: 0, run: () => 'Você deixa o viajante para trás.' },
    ],
  },
  {
    title: 'Livro Proibido',
    text: 'Um livro acorrentado a um púlpito. As letras se mexem quando você olha.',
    choices: [
      {
        label: 'Ler',
        dice: 2,
        run: (h, rn) => {
          const x = (20 + rn.tier * 8) * h;
          rn.xp += x;
          if (h === 0) {
            hurt(rn, 1);
            return 'As letras mordem. Perdeu um coração.';
          }
          return h === 2 ? 'Você entendeu tudo! Muita experiência.' : 'Você entendeu metade. Ganhou experiência.';
        },
      },
      { label: 'Seguir em frente', dice: 0, run: () => 'Alguns livros ficam melhor fechados.' },
    ],
  },
  {
    title: 'Ponte Rachada',
    text: 'Uma ponte velha sobre um buraco sem fundo. Do outro lado, um saco de ouro.',
    choices: [
      {
        label: 'Atravessar',
        dice: 2,
        run: (h, rn) => {
          if (h === 0) {
            hurt(rn, 1);
            return 'A ponte cedeu! Perdeu um coração.';
          }
          const g = goldOf(rn, h === 2 ? 30 : 15);
          rn.gold += g;
          return `Pegou o ouro: ${g}`;
        },
      },
      { label: 'Seguir em frente', dice: 0, run: () => 'O ouro fica para o próximo corajoso.' },
    ],
  },
];

const KIND_NAME: Record<string, string> = {
  start: 'Entrada',
  fight: 'Luta',
  elite: 'Elite',
  chest: 'Baú',
  event: 'Evento',
  trap: 'Armadilha',
  camp: 'Acampamento',
  shrine: 'Santuário',
  boss: 'Guardião',
};
const KIND_COLOR: Record<string, number> = {
  start: 0x8a95a3,
  fight: 0xd8604a,
  elite: 0xb03a8a,
  chest: 0xd8a530,
  event: 0x4aa0d8,
  trap: 0x8a6a4a,
  camp: 0x58b947,
  shrine: 0x9b6bf0,
  boss: 0x7a1e2a,
};

/**
 * Mapa da dungeon (estilo For the King): salas em colunas, caminhos entre elas, a caveira na sala
 * atual. Escolhe a próxima sala entre as ligadas (setas/clique); lutas viram uma fase gerada, o
 * resto se resolve aqui com painéis e rolagem de dados.
 */
export class DungeonScene extends Phaser.Scene {
  private choice = 0;
  private busy = false;
  private layer?: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;
  private pos = new Map<number, [number, number]>();
  private token?: Phaser.GameObjects.Image;
  private hud?: Phaser.GameObjects.Container;

  constructor() {
    super('dungeon');
  }

  init(): void {
    this.choice = 0;
    this.busy = false;
    this.modal = undefined;
    this.pos = new Map();
  }

  create(): void {
    const rn = getRun();
    const HH = this.scale.height;
    this.add.rectangle(0, 0, W, HH, 0x0c1422).setOrigin(0);
    if (!rn) {
      this.scene.start('world', {});
      return;
    }
    const a = areaById(rn.area)!;
    const t = areaTitle(a);
    playMusic(rn.area as Track, 'dungeon');
    // Fundo: pedra escura com a cor da área ao longe.
    this.add.tileSprite(0, 0, W, HH, 'dn_floor').setOrigin(0);
    const g = this.add.graphics();
    for (let k = 0; k < 6; k++) g.fillStyle(t.color, 0.06).fillEllipse(W / 2, HH / 2, W * (1.2 - k * 0.15), HH * (1.1 - k * 0.14));
    // Bordas escurecidas (vinheta) para o mapa ficar no centro da luz.
    const edge = Math.max(W, HH);
    for (let k = 0; k < 8; k++) g.lineStyle(edge * 0.08, 0x03060c, 0.14).strokeEllipse(W / 2, HH / 2, W * (1.15 + k * 0.1), HH * (1.15 + k * 0.1));
    // Tochas nos cantos de cima.
    const P0 = VIEW.portrait;
    for (const tx of [P0 ? 70 : 46, P0 ? W - 70 : W - 46]) {
      const ty = P0 ? 120 : 64;
      const halo = this.add.ellipse(tx, ty - 10, 120, 120, 0xff8a2a, 0.12);
      this.tweens.add({ targets: halo, scale: 1.15, alpha: 0.06, duration: 500 + tx % 200, yoyo: true, repeat: -1 });
      this.add.image(tx, ty, 'torch_item').setScale(P0 ? 1.2 : 0.9);
      this.add.particles(tx, ty - 26 * (P0 ? 1.2 : 0.9), 'spark', { speedY: { min: -50, max: -20 }, x: { min: -6, max: 6 }, lifespan: 500, scale: { start: 0.35, end: 0 }, tint: [0xffe066, 0xff7a1a], frequency: 70 });
    }
    const P = VIEW.portrait;
    this.add
      .text(W / 2, P ? 150 : 34, `DUNGEON · ${t.name.toUpperCase()}`, { fontFamily: FONT, fontSize: P ? '48px' : '30px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 9 })
      .setOrigin(0.5);
    const gapNow = rn.rec - getLevel();
    const levelInfo = `Nível sugerido: ${rn.rec}  ·  Seu nível: ${getLevel()}`;
    this.add
      .text(W / 2, P ? 210 : 70, levelInfo, { fontFamily: BODY_FONT, fontSize: P ? '30px' : '18px', color: gapNow > 0 ? '#ff9a8a' : '#bfe9ff' })
      .setOrigin(0.5);
    this.drawHud();
    this.drawMap();

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'UP', 'A', 'W']) kb.on(`keydown-${k}`, () => this.cycle(-1));
    for (const k of ['RIGHT', 'DOWN', 'D', 'S']) kb.on(`keydown-${k}`, () => this.cycle(1));
    for (const k of ['ENTER', 'SPACE', 'F'])
      kb.on(`keydown-${k}`, () => {
        // Painel aberto: Enter escolhe a primeira opção possível; senão, vai para a sala marcada.
        if (this.modal) {
          const f = this.modalKey;
          this.modalKey = undefined;
          f?.();
        } else this.confirm();
      });
    kb.on('keydown-ESC', () => this.askAbandon());
    // Volta de uma sala de luta.
    if (rn.over === 'lose') return this.showLose();
    if (rn.lastFight === 'win') {
      rn.lastFight = undefined;
      saveRun();
      const node = rn.nodes[rn.at];
      if (node.kind === 'boss') return this.showWin();
    } else if (rn.fighting !== undefined && rn.fighting === rn.at) {
      // A página fechou no meio de uma luta: ela continua obrigatória.
      this.time.delayedCall(300, () => this.resolve(rn.nodes[rn.at]));
    }

    pillButton(this, P ? W / 2 : 150, P ? HH - 140 : HH - 40, 'DESISTIR', () => this.askAbandon(), 200, 0xe7eef2).setScale(P ? 1.4 : 0.8);
    this.add
      .text(W / 2, P ? HH - 240 : HH - 40, 'Escolha a próxima sala: setas ou toque · Enter para ir', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '16px', color: '#9fb4c8' })
      .setOrigin(0.5);
    this.highlight();
  }

  // ---------- desenho ----------

  private drawHud(): void {
    const rn = getRun()!;
    this.hud?.destroy();
    const P = VIEW.portrait;
    const k = P ? 1.5 : 1;
    const items: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    const r = 9 * k;
    for (let i = 0; i < rn.maxHearts; i++) {
      const x = i * 30 * k;
      const on = i < rn.hearts;
      g.fillStyle(INK, 1).fillCircle(x - r * 0.62, -r * 0.2, r + 3).fillCircle(x + r * 0.62, -r * 0.2, r + 3).fillTriangle(x - r * 1.75, 0, x + r * 1.75, 0, x, r * 2.1);
      g.fillStyle(on ? 0xe8463a : 0x445566, 1).fillCircle(x - r * 0.62, -r * 0.2, r).fillCircle(x + r * 0.62, -r * 0.2, r).fillTriangle(x - r * 1.45, 0, x + r * 1.45, 0, x, r * 1.75);
    }
    items.push(g);
    const tx = rn.maxHearts * 30 * k + 10;
    items.push(this.add.text(tx, -2, `Ouro da run: ${rn.gold}   ·   XP da run: ${rn.xp}`, { fontFamily: FONT, fontSize: `${Math.round(18 * k)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 5 }).setOrigin(0, 0.5));
    if (rn.blessings.length) {
      const names: Record<Blessing, string> = { heart: 'Vigor', fury: 'Fúria', luck: 'Sorte' };
      items.push(
        this.add.text(tx, 26 * k, `Bênçãos: ${rn.blessings.map((b) => names[b]).join(', ')}`, { fontFamily: BODY_FONT, fontSize: `${Math.round(15 * k)}px`, color: '#d8b8ff' }).setOrigin(0, 0.5),
      );
    }
    this.hud = this.add.container(P ? 60 : 40, P ? 290 : 112, items).setDepth(20);
  }

  private drawMap(): void {
    const rn = getRun()!;
    this.layer?.destroy();
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const cols = Math.max(...rn.nodes.map((n) => n.col)) + 1;
    const items: Phaser.GameObjects.GameObject[] = [];
    // Em pé: o mapa desce (colunas viram linhas, de cima para baixo).
    const x0 = P ? 140 : 110;
    const x1 = P ? W - 140 : W - 110;
    const top = P ? 380 : 170;
    const bottom = P ? HH - 330 : HH - 110;
    for (const n of rn.nodes) {
      const along = cols === 1 ? 0.5 : n.col / (cols - 1);
      const across = (n.row + 1) / (n.rows + 1);
      const x = P ? x0 + (x1 - x0) * across : x0 + (x1 - x0) * along;
      const y = P ? top + (bottom - top) * along : top + (bottom - top) * across;
      this.pos.set(n.id, [x, y]);
    }
    const lines = this.add.graphics();
    items.push(lines);
    for (const n of rn.nodes) {
      const [ax, ay] = this.pos.get(n.id)!;
      for (const m of n.next) {
        const [bx, by] = this.pos.get(m)!;
        const walked = rn.visited.includes(n.id) && rn.visited.includes(m);
        const steps = Math.floor(Math.hypot(bx - ax, by - ay) / 16);
        for (let s = 1; s < steps; s++) {
          const u = s / steps;
          const px = ax + (bx - ax) * u;
          const py = ay + (by - ay) * u;
          lines.fillStyle(INK, 1).fillCircle(px, py, walked ? 6.5 : 5.5);
          lines.fillStyle(walked ? 0xffe066 : 0x6f7884, 1).fillCircle(px, py, walked ? 4.5 : 3.5);
          lines.fillStyle(0xffffff, walked ? 0.6 : 0.25).fillCircle(px - 1, py - 1.2, 1.4);
        }
      }
    }
    const R = P ? 46 : 32;
    for (const n of rn.nodes) {
      const [x, y] = this.pos.get(n.id)!;
      const seen = rn.visited.includes(n.id);
      // Medalhão de pedra: disco tingido com a cor da sala, aro com rebites por cima.
      const s = (R + 8) / 52;
      items.push(this.add.ellipse(x + 3, y + R + 4, R * 2, R * 0.5, 0x000000, 0.3));
      items.push(this.add.image(x, y, 'dn_disc').setScale(s).setTint(seen ? 0x3a4656 : KIND_COLOR[n.kind]));
      items.push(this.add.image(x, y, 'dn_ring').setScale(s).setTint(seen ? 0x8a8a9a : 0xffffff));
      items.push(this.icon(n, x, y, R, seen));
      const zone = this.add.zone(x, y, R * 2.4, R * 2.4).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.tapNode(n.id));
      items.push(zone);
    }
    this.layer = this.add.container(0, 0, items);
    const [sx, sy] = this.pos.get(rn.at)!;
    this.token?.destroy();
    this.token = this.add.image(sx, sy - R - 18, 'skull_avatar').setScale(P ? 0.3 : 0.2).setDepth(15);
    this.tweens.add({ targets: this.token, y: this.token.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Ícone da sala: desenhado com o que o jogo já tem (espada, baú, fogueira, rei...). */
  private icon(n: DNode, x: number, y: number, R: number, seen: boolean): Phaser.GameObjects.GameObject {
    const alpha = seen ? 0.45 : 1;
    const img = (key: string, s: number, frame?: number) => this.add.image(x, y, key, frame).setScale(s * (R / 32)).setAlpha(alpha);
    switch (n.kind) {
      case 'fight':
        return img('tool_sword', 0.9).setAngle(-30);
      case 'elite':
        return img('horn_item', 0.75);
      case 'chest':
        return img('gold_stone', 0.9);
      case 'trap':
        return img('skull_spike', 0.8);
      case 'camp':
        return img('meat', 0.9);
      case 'shrine':
        return img('spark', 1.5).setTint(0xe8d4ff);
      case 'start':
        return img('skull_avatar', 0.16);
      case 'boss': {
        const t = areaTitle(areaById(getRun()!.area)!);
        return this.add.sprite(x, y + 4, t.kingAnim, 0).setScale(0.32 * (R / 32)).setAlpha(alpha);
      }
      default:
        return this.add.text(x, y, '?', { fontFamily: FONT, fontSize: `${Math.round(R * 1.1)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5).setAlpha(alpha);
    }
  }

  // ---------- escolha do caminho ----------

  private options(): number[] {
    const rn = getRun()!;
    return rn.nodes[rn.at].next;
  }

  private ring?: Phaser.GameObjects.Graphics;

  private highlight(): void {
    const opts = this.options();
    this.ring?.destroy();
    if (!opts.length) return;
    const P = VIEW.portrait;
    const R = (P ? 46 : 32) + 12;
    this.ring = this.add.graphics().setDepth(14);
    opts.forEach((id, i) => {
      const [x, y] = this.pos.get(id)!;
      const on = i === this.choice;
      this.ring!.lineStyle(on ? 6 : 3, on ? 0xffe066 : 0xfff7dc, on ? 1 : 0.5).strokeCircle(x, y, R);
    });
    const id = opts[this.choice];
    const rn = getRun()!;
    const n = rn.nodes[id];
    this.tip?.destroy();
    const [x, y] = this.pos.get(id)!;
    const fightish = n.kind === 'fight' || n.kind === 'elite' || n.kind === 'boss';
    const label = fightish ? `${KIND_NAME[n.kind]} · nível ${roomLevel(rn, n)}` : KIND_NAME[n.kind];
    this.tip = this.add
      .text(x, y + R + 18, label, { fontFamily: FONT, fontSize: P ? '28px' : '17px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 6, backgroundColor: '#10223acc', padding: { x: 8, y: 3 } })
      .setOrigin(0.5, 0)
      .setDepth(16);
  }

  private tip?: Phaser.GameObjects.Text;

  private cycle(d: number): void {
    if (this.busy || this.modal) return;
    const n = this.options().length;
    if (!n) return;
    this.choice = Phaser.Math.Wrap(this.choice + d, 0, n);
    sfx('select');
    this.highlight();
  }

  private tapNode(id: number): void {
    if (this.busy || this.modal) return;
    const i = this.options().indexOf(id);
    if (i < 0) return;
    if (i === this.choice) this.confirm();
    else {
      this.choice = i;
      sfx('select');
      this.highlight();
    }
  }

  private confirm(): void {
    if (this.busy || this.modal) return;
    const opts = this.options();
    if (!opts.length) return;
    const rn = getRun()!;
    const id = opts[this.choice];
    this.busy = true;
    this.ring?.destroy();
    this.tip?.destroy();
    const [x, y] = this.pos.get(id)!;
    const R = VIEW.portrait ? 46 : 32;
    this.tweens.killTweensOf(this.token!);
    sfx('jump');
    this.tweens.add({
      targets: this.token,
      x,
      y: y - R - 18,
      duration: 520,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        rn.at = id;
        if (!rn.visited.includes(id)) rn.visited.push(id);
        saveRun();
        this.choice = 0;
        this.busy = false;
        this.drawMap();
        this.resolve(rn.nodes[id]);
      },
    });
  }

  // ---------- salas ----------

  private resolve(n: DNode): void {
    const rn = getRun()!;
    switch (n.kind) {
      case 'fight':
      case 'elite':
      case 'boss': {
        const gap = levelGap(rn, n);
        const warn = gap >= 6 ? 'Cuidado: aqui cada golpe tira 2 corações.' : gap > 0 ? 'Os inimigos estão acima do seu nível (mais resistentes).' : gap <= -6 ? 'Você está bem acima desta sala: seus golpes valem em dobro.' : 'Uma luta justa.';
        const title = n.kind === 'boss' ? 'O GUARDIÃO' : n.kind === 'elite' ? 'SALA DA ELITE' : 'SALA DE LUTA';
        this.openModal(title, `Nível da sala: ${roomLevel(rn, n)}  ·  Seu nível: ${getLevel()}\n${warn}`, [{ label: 'LUTAR!', act: () => this.fight(n) }]);
        break;
      }
      case 'chest':
        this.rollPanel('BAÚ', 'Um baú velho, com a fechadura enferrujada. Pode ter ouro... ou dentes.', 3, (hits) => {
          if (hits === 0) {
            hurt(rn, 1);
            return 'Era um baú-mímico! Ele mordeu: perdeu um coração.';
          }
          const g = goldOf(rn, 8) * hits;
          rn.gold += g;
          return `Ouro encontrado: ${g}`;
        });
        break;
      case 'trap':
        this.rollPanel('ARMADILHA!', 'O chão estala. Lâminas saem das paredes!', 2, (hits) => {
          const lost = 2 - hits;
          hurt(rn, lost);
          return lost ? `Não escapou de todas: perdeu corações (${lost}).` : 'Desviou de tudo!';
        });
        break;
      case 'camp':
        this.rollPanel('ACAMPAMENTO', 'Uma fogueira ainda quente. Um bom lugar para descansar.', 1, (hits) => {
          const got = heal(rn, 2 + hits);
          return got ? `Descansou e recuperou corações (${got}).` : 'Descansou um pouco. Já estava inteiro.';
        });
        break;
      case 'shrine':
        this.openModal('SANTUÁRIO', 'Uma estátua do Xamã, de braços abertos. Escolha uma bênção para o resto da dungeon.', [
          { label: 'VIGOR (+1 coração)', act: () => this.bless('heart') },
          { label: 'FÚRIA (golpes mais fortes)', act: () => this.bless('fury') },
          { label: 'SORTE (dados melhores)', act: () => this.bless('luck') },
        ]);
        break;
      case 'event': {
        const ev = EVENTS[(n.event ?? 0) % EVENTS.length];
        this.openModal(
          ev.title.toUpperCase(),
          ev.text,
          ev.choices.map((c) => ({
            label: c.cost ? `${c.label} (${c.cost} ouro)` : c.label,
            disabled: !!c.cost && rn.gold < c.cost,
            act: () => {
              if (c.cost) rn.gold -= c.cost;
              if (!c.dice) return this.result(c.run(0, rn));
              this.closeModal();
              this.rollPanel(ev.title.toUpperCase(), ev.text, c.dice, (h) => c.run(h, rn));
            },
          })),
        );
        break;
      }
      default:
        break;
    }
  }

  private bless(b: Blessing): void {
    const rn = getRun()!;
    rn.blessings.push(b);
    if (b === 'heart') {
      rn.maxHearts++;
      rn.hearts++;
    }
    this.result(b === 'heart' ? 'Coração extra!' : b === 'fury' ? 'Seus golpes ficam mais fortes.' : 'Os dados vão sorrir para você.');
  }

  private fight(n: DNode): void {
    const rn = getRun()!;
    const idx = prepareRoom(rn, n);
    this.closeModal();
    this.scene.start('loading', { next: 'game', data: { mode: 'story', devices: ['kb-full'], level: idx } });
  }

  // ---------- painéis ----------

  private openModal(title: string, text: string, choices: Array<{ label: string; act: () => void; disabled?: boolean }>): void {
    this.closeModal();
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const pw = P ? W - 120 : 760;
    const ph = (P ? 360 : 220) + choices.length * (P ? 110 : 70);
    const items: Phaser.GameObjects.GameObject[] = [];
    const shade = this.add.rectangle(0, 0, W, HH, 0x000000, 0.55).setOrigin(0).setInteractive();
    items.push(shade);
    const g = this.add.graphics();
    const x = W / 2 - pw / 2;
    const y = HH / 2 - ph / 2;
    g.fillStyle(INK, 1).fillRoundedRect(x - 6, y - 6, pw + 12, ph + 12, 24);
    g.fillStyle(0x1b2e4a, 1).fillRoundedRect(x, y, pw, ph, 20);
    g.lineStyle(3, 0xfff7dc, 0.6).strokeRoundedRect(x, y, pw, ph, 20);
    items.push(g);
    items.push(this.add.text(W / 2, y + (P ? 60 : 40), title, { fontFamily: FONT, fontSize: P ? '48px' : '30px', color: '#ffe066' }).setOrigin(0.5));
    items.push(
      this.add
        .text(W / 2, y + (P ? 120 : 80), text, { fontFamily: BODY_FONT, fontSize: P ? '30px' : '19px', color: '#fff7dc', align: 'center', wordWrap: { width: pw - 80 }, lineSpacing: 6 })
        .setOrigin(0.5, 0),
    );
    const by = y + ph - (P ? 90 : 60) - (choices.length - 1) * (P ? 110 : 70);
    choices.forEach((c, i) => {
      const b = pillButton(this, W / 2, by + i * (P ? 110 : 70), c.label, () => !c.disabled && c.act(), P ? 560 : 420, c.disabled ? 0x8a95a3 : i === 0 ? 0xffe066 : 0xe7eef2).setScale(P ? 1.3 : 1);
      if (c.disabled) b.setAlpha(0.6);
      items.push(b);
    });
    this.modal = this.add.container(0, 0, items).setDepth(50);
    this.modal.setAlpha(0);
    this.tweens.add({ targets: this.modal, alpha: 1, duration: 160 });
    // Teclado: Enter escolhe a primeira opção possível.
    this.modalKey = choices.find((c) => !c.disabled)?.act;
  }

  private modalKey?: () => void;

  private closeModal(): void {
    this.modal?.destroy();
    this.modal = undefined;
    this.modalKey = undefined;
  }

  /** Painel com dados no estilo FTK: cada dado rola e acende verde (acerto) ou vermelho. */
  private rollPanel(title: string, text: string, dice: number, done: (hits: number) => string): void {
    const rn = getRun()!;
    const n = rn.nodes[rn.at];
    const chance = successChance(rn, n);
    this.openModal(title, `${text}\n\nChance de cada dado: ${Math.round(chance * 100)}%`, [
      {
        label: 'ROLAR OS DADOS',
        act: () => {
          this.closeModal();
          const P = VIEW.portrait;
          const HH = this.scale.height;
          const items: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, W, HH, 0x000000, 0.55).setOrigin(0).setInteractive()];
          const size = P ? 120 : 84;
          const gapX = size + 24;
          const results: boolean[] = [];
          for (let i = 0; i < dice; i++) results.push(Math.random() < chance);
          const boxes: Phaser.GameObjects.Graphics[] = [];
          for (let i = 0; i < dice; i++) {
            const x = W / 2 + (i - (dice - 1) / 2) * gapX;
            const b = this.add.graphics();
            boxes.push(b);
            items.push(b);
          }
          const drawBox = (i: number, color: number) => {
            const x = W / 2 + (i - (dice - 1) / 2) * gapX;
            boxes[i].clear().fillStyle(INK, 1).fillRoundedRect(x - size / 2 - 5, HH / 2 - size / 2 - 5, size + 10, size + 10, 16);
            boxes[i].fillStyle(color, 1).fillRoundedRect(x - size / 2, HH / 2 - size / 2, size, size, 12);
          };
          for (let i = 0; i < dice; i++) drawBox(i, 0x5f6872);
          this.modal = this.add.container(0, 0, items).setDepth(50);
          let i = 0;
          const next = () => {
            if (i >= dice) {
              const hits = results.filter(Boolean).length;
              this.time.delayedCall(500, () => this.result(done(hits)));
              return;
            }
            let flick = 0;
            const ev = this.time.addEvent({
              delay: 60,
              repeat: 7,
              callback: () => {
                drawBox(i, flick++ % 2 ? 0x8a95a3 : 0x5f6872);
                sfx('select');
              },
            });
            this.time.delayedCall(520, () => {
              ev.remove();
              drawBox(i, results[i] ? 0x58b947 : 0xd8463a);
              // Marca desenhada: visto (acerto) ou xis (erro).
              const cx = W / 2 + (i - (dice - 1) / 2) * gapX;
              const cy = HH / 2;
              const q = size * 0.22;
              boxes[i].lineStyle(Math.max(6, size * 0.1), 0xfff7dc, 1);
              if (results[i]) boxes[i].lineBetween(cx - q * 1.2, cy, cx - q * 0.2, cy + q).lineBetween(cx - q * 0.2, cy + q, cx + q * 1.4, cy - q * 1.1);
              else boxes[i].lineBetween(cx - q, cy - q, cx + q, cy + q).lineBetween(cx + q, cy - q, cx - q, cy + q);
              sfx(results[i] ? 'pick' : 'hit');
              i++;
              this.time.delayedCall(180, next);
            });
          };
          next();
        },
      },
    ]);
  }

  /** Mostra o resultado e volta ao mapa (ou acaba a run, se os corações zeraram). */
  private result(text: string): void {
    const rn = getRun()!;
    saveRun();
    this.drawHud();
    if (rn.hearts <= 0) {
      rn.over = 'lose';
      this.closeModal();
      return this.showLose();
    }
    this.openModal('RESULTADO', text, [{ label: 'CONTINUAR', act: () => (this.closeModal(), this.highlight()) }]);
  }

  // ---------- fim ----------

  private showWin(): void {
    const rn = getRun()!;
    const bonus = clearReward(rn);
    const xp = rn.xp + bonus.xp;
    const gold = rn.gold + bonus.gold;
    const ups = addXp(xp);
    addCoins(gold);
    markDungeonDone(rn.area);
    const back = rn.from;
    const area = rn.area;
    endRun();
    sfx('pick');
    this.openModal('DUNGEON LIMPA!', `O guardião caiu. O selo do rei desta área está aberto.\n\nExperiência: +${xp}\nOuro: +${gold}`, [{ label: 'VOLTAR', act: () => this.leave(back, area) }]);
    if (ups > 0) levelUpBanner(this, getLevel(), 600);
  }

  private showLose(): void {
    const rn = getRun()!;
    const back = rn.from;
    const area = rn.area;
    // Bolsa Costurada (Ferreiro): guarda uma parte do ouro mesmo caindo.
    const kept = Math.floor(rn.gold * 0.15 * smithLevel('purse'));
    if (kept > 0) addCoins(kept);
    const lost = `Ouro perdido: ${rn.gold - kept}\nExperiência perdida: ${rn.xp}${kept ? `\nA Bolsa Costurada guardou: ${kept}` : ''}`;
    endRun();
    this.openModal('VOCÊ CAIU NA DUNGEON', `O Xamã te trouxe de volta, mas tudo o que você achou ficou lá embaixo.\n\n${lost}`, [{ label: 'VOLTAR', act: () => this.leave(back, area) }]);
  }

  private askAbandon(): void {
    if (this.busy) return;
    if (this.modal) {
      // Esc fecha o painel de luta/resultado sem escolher (só onde não há perda).
      return;
    }
    this.openModal('DESISTIR DA DUNGEON?', 'Você volta agora, mas perde tudo o que juntou nesta dungeon.', [
      { label: 'CONTINUAR EXPLORANDO', act: () => (this.closeModal(), this.highlight()) },
      {
        label: 'DESISTIR',
        act: () => {
          const rn = getRun()!;
          const back = rn.from;
          const area = rn.area;
          endRun();
          this.leave(back, area);
        },
      },
    ]);
  }

  private leave(back: 'village' | 'map', area: string): void {
    if (back === 'village' && this.scene.get('village')) this.scene.start('village', {});
    else this.scene.start('map', { devices: ['kb-full'], area });
  }

}
