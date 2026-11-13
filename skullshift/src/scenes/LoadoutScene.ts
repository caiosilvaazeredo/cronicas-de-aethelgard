import Phaser from 'phaser';
import { BODY_FONT, FONT, H, VIEW, W } from '../config';
import type { DeviceId } from '../game/controls';
import { ABILITIES, hasAbility } from '../game/abilities';
import { UPGRADES, hasUpgrade } from '../game/upgrades';
import { sfx } from '../game/settings';
import { PLAYER_HEX, PLAYER_TINT, pillButton } from '../ui/devices';
import { backdrop } from '../ui/backdrop';

/**
 * Versus: cada jogador escolhe até 3 poderes para levar à partida, entre as habilidades
 * (martelo, machado, picareta...) e os aprimoramentos de luta (Osso Teimoso, Espada Rebatedora...).
 * Só aparecem liberados os que já foram conquistados no modo história (no save em uso).
 * MODO TESTE: tudo liberado e sem limite, para experimentar.
 */
interface Opt {
  id: string;
  name: string;
  icon: string;
  how: string;
  unlocked: () => boolean;
}

const COMBAT = ['deflect', 'stubborn', 'reflex', 'cloak', 'magnet'];
const OPTS: Opt[] = [
  ...ABILITIES.map((a) => ({ id: a.id, name: a.name, icon: a.icon, how: a.how, unlocked: () => hasAbility(a.id) })),
  ...UPGRADES.filter((u) => COMBAT.includes(u.id)).map((u) => ({ id: u.id, name: u.name, icon: u.icon, how: u.how, unlocked: () => hasUpgrade(u.id) })),
];
const MAX = 3;

export class LoadoutScene extends Phaser.Scene {
  lastData: { devices?: DeviceId[]; level?: number } = {};
  private picks: Array<Set<string>> = [new Set(), new Set()];
  private cursor = [0, 0];
  private test = false;
  private cols: Phaser.GameObjects.Container[] = [];
  private help!: Phaser.GameObjects.Text;
  private testBtn?: Phaser.GameObjects.Container;
  private prevPad: Array<{ u: boolean; d: boolean; a: boolean; s: boolean }> = [];

  constructor() {
    super('loadout');
  }

  init(data: { devices?: DeviceId[]; level?: number }): void {
    this.lastData = data;
    this.cols = [];
    this.prevPad = [];
  }

  create(): void {
    backdrop(this, 'PODERES DO DUELO');
    const P = VIEW.portrait;
    const HH = this.scale.height;
    this.help = this.add
      .text(W / 2, P ? HH - 420 : 578, '', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '16px', color: '#fff7dc', align: 'center', wordWrap: { width: P ? 1100 : 1000 } })
      .setOrigin(0.5);
    this.testBtn = pillButton(this, P ? W / 2 : 250, P ? HH - 270 : 662, '', () => this.toggleTest(), 400, 0xd8b8ff).setScale(P ? 1.3 : 0.85);
    pillButton(this, P ? W / 2 + 280 : W - 200, P ? HH - 120 : 662, 'LUTAR  ▶', () => this.go(), 240, 0xffe066).setScale(P ? 1.4 : 1);
    pillButton(this, P ? W / 2 - 280 : 640, P ? HH - 120 : 662, '◀ VOLTAR', () => this.scene.start('menu', { stage: 'modes' }), 220).setScale(P ? 1.3 : 0.8);
    this.add
      .text(W / 2, P ? HH - 500 : 612, 'P1: W/S escolhe, E marca  ·  P2: ↑/↓ escolhe, . marca  ·  T: modo teste  ·  Enter: lutar  ·  toque marca', {
        fontFamily: BODY_FONT,
        fontSize: P ? '22px' : '14px',
        color: '#bfd0e0',
        align: 'center',
        wordWrap: { width: P ? 1100 : 1200 },
      })
      .setOrigin(0.5);
    const kb = this.input.keyboard!;
    kb.on('keydown-W', () => this.move(0, -1));
    kb.on('keydown-S', () => this.move(0, 1));
    kb.on('keydown-E', () => this.toggle(0, this.cursor[0]));
    kb.on('keydown-UP', () => this.move(1, -1));
    kb.on('keydown-DOWN', () => this.move(1, 1));
    kb.on('keydown-PERIOD', () => this.toggle(1, this.cursor[1]));
    kb.on('keydown-T', () => this.toggleTest());
    kb.on('keydown-ENTER', () => this.go());
    kb.on('keydown-ESC', () => this.scene.start('menu', { stage: 'modes' }));
    this.redraw();
  }

  private available(o: Opt): boolean {
    return this.test || o.unlocked();
  }

  private toggleTest(): void {
    this.test = !this.test;
    sfx('select');
    if (!this.test) for (const set of this.picks) for (const id of [...set]) if (!OPTS.find((o) => o.id === id)?.unlocked()) set.delete(id);
    this.redraw();
  }

  private move(pi: number, d: number): void {
    this.cursor[pi] = Phaser.Math.Wrap(this.cursor[pi] + d, 0, OPTS.length);
    sfx('select');
    this.redraw();
  }

  private toggle(pi: number, k: number): void {
    const o = OPTS[k];
    this.cursor[pi] = k;
    const set = this.picks[pi];
    if (!this.available(o)) {
      sfx('hit');
      this.help.setText(`${o.name}: ainda bloqueado. Libere no modo história (ou ligue o MODO TESTE).`);
      return;
    }
    if (set.has(o.id)) set.delete(o.id);
    else if (this.test || set.size < MAX) set.add(o.id);
    else {
      sfx('hit');
      this.help.setText(`Máximo de ${MAX} poderes por jogador (no MODO TESTE não há limite).`);
      return;
    }
    sfx('pick');
    this.redraw();
  }

  private redraw(): void {
    this.cols.forEach((c) => c.destroy());
    this.cols = [];
    const P = VIEW.portrait;
    const HH = this.scale.height;
    for (let pi = 0; pi < 2; pi++) {
      const items: Phaser.GameObjects.GameObject[] = [];
      const rowH = P ? 92 : 38;
      const w = P ? 560 : 540;
      const top = P ? 280 : 122;
      const x0 = P ? (pi === 0 ? 30 : W / 2 + 10) : pi === 0 ? 70 : W / 2 + 30;
      const sc = P ? 1 : 1;
      const head = this.add.text(w / 2, 0, `${pi === 0 ? 'PLAYER 1' : 'PLAYER 2'}  ·  ${this.picks[pi].size}${this.test ? '' : '/' + MAX}`, { fontFamily: FONT, fontSize: P ? '32px' : '24px', color: PLAYER_HEX[pi], stroke: '#10223a', strokeThickness: 7 }).setOrigin(0.5, 0);
      items.push(head);
      OPTS.forEach((o, k) => {
        const y = (P ? 56 : 40) + k * rowH;
        const on = this.picks[pi].has(o.id);
        const avail = this.available(o);
        const sel = this.cursor[pi] === k;
        const g = this.add.graphics();
        g.fillStyle(0x10223a, 1).fillRoundedRect(-3, y - 3, w + 6, rowH - 2, 10);
        g.fillStyle(on ? 0xc89858 : avail ? 0x2a4a6a : 0x1a2636, 1).fillRoundedRect(0, y, w, rowH - 8, 8);
        if (sel) g.lineStyle(4, PLAYER_TINT[pi], 1).strokeRoundedRect(-3, y - 3, w + 6, rowH - 2, 10);
        items.push(g);
        const ic = this.add.image(P ? 40 : 26, y + (rowH - 8) / 2, o.icon, 0);
        // Os desenhos das ferramentas têm muita margem: aumenta para encher a linha.
        const boost = o.icon.startsWith('tool_') ? 2.4 : o.icon === 'skull_avatar' ? 1.5 : o.icon === 'cloud_05' ? 1.6 : 1;
        const box = Math.min(rowH - 12, 30);
        ic.setScale(Math.min(box / ic.width, box / ic.height) * boost * (P ? 1.6 : 1));
        if (o.icon === 'guard_arc') ic.setTint(0x6fb8ff);
        if (!avail) ic.setTintFill(0x3a4a5a);
        items.push(ic);
        items.push(
          this.add
            .text(P ? 84 : 56, y + (rowH - 8) / 2, avail ? o.name : `${o.name}  🔒`, { fontFamily: FONT, fontSize: P ? '23px' : '17px', color: on ? '#3a2412' : avail ? '#fff7dc' : '#6a7888' })
            .setOrigin(0, 0.5),
        );
        items.push(this.add.text(w - 14, y + (rowH - 8) / 2, on ? '✔' : '', { fontFamily: FONT, fontSize: P ? '30px' : '22px', color: '#2e7d32' }).setOrigin(1, 0.5));
        const zone = this.add.zone(w / 2, y + (rowH - 8) / 2, w, rowH - 4).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.toggle(pi, k));
        items.push(zone);
      });
      this.cols.push(this.add.container(x0, top, items).setScale(sc));
    }
    const o = OPTS[this.cursor[0]];
    this.help.setText(`${o.name}: ${o.how}`);
    const label = this.testBtn?.list.find((c) => c instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    label?.setText(this.test ? 'MODO TESTE: LIGADO' : 'MODO TESTE: DESLIGADO');
    void HH;
    void H;
  }

  private go(): void {
    sfx('select');
    const loadouts = this.picks.map((s) => [...s]);
    this.scene.start('loading', { next: 'game', data: { mode: 'versus', devices: this.lastData.devices, level: this.lastData.level, loadouts } });
  }

  update(): void {
    const pads = (this.input.gamepad?.gamepads ?? []).filter((p) => p && p.connected);
    pads.slice(0, 2).forEach((pad, pi) => {
      const ay = pad.axes[1]?.getValue() ?? 0;
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const st = { u: b(12) || ay < -0.5, d: b(13) || ay > 0.5, a: b(0), s: b(9) };
      const pv = this.prevPad[pi] ?? { u: true, d: true, a: true, s: true };
      if (st.u && !pv.u) this.move(pi, -1);
      if (st.d && !pv.d) this.move(pi, 1);
      if (st.a && !pv.a) this.toggle(pi, this.cursor[pi]);
      if (st.s && !pv.s) this.go();
      this.prevPad[pi] = st;
    });
  }
}
