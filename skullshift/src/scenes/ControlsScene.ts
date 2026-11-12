import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W, wantsTouchControls } from '../config';
import { DEVICES, connectedPads, padOrdinal, type DeviceId } from '../game/controls';
import { backdrop } from '../ui/backdrop';
import {
  PLAYER_TINT,
  gamepadArt,
  keyboardArt,
  panel,
  phoneArt,
  pillButton,
  playerBadge,
} from '../ui/devices';

type Mode = 'story' | 'versus';

const STORY_DEVICES: DeviceId[] = ['kb-full', 'pad0', 'pad1', 'touch'];
const VERSUS_DEVICES: DeviceId[] = ['kb-left', 'kb-right', 'pad0', 'pad1', 'touch'];

/**
 * Tela de escolha de controle: uma coluna por jogador com ◀ ▶ para trocar o dispositivo.
 * Controles não conectados aparecem cinza na bandeja de baixo e não podem ser escolhidos.
 */
export class ControlsScene extends Phaser.Scene {
  private mode: Mode = 'story';
  private choice: DeviceId[] = [];
  private columns: Phaser.GameObjects.Container[] = [];
  private tray?: Phaser.GameObjects.Container;
  private padCount = -1;
  private prevPad: Array<{ l: boolean; r: boolean; a: boolean; b: boolean }> = [];

  constructor() {
    super('controls');
  }

  lastData: { mode?: Mode; devices?: DeviceId[] } = {};

  init(data: { mode?: Mode; devices?: DeviceId[] }): void {
    this.lastData = data;
    this.mode = data.mode ?? 'story';
    this.columns = [];
    this.tray = undefined;
    this.padCount = -1;
    this.prevPad = [];
    this.choice = data.devices ?? this.defaults();
  }

  private get players(): number {
    return this.mode === 'story' ? 1 : 2;
  }

  private get list(): DeviceId[] {
    return this.mode === 'story' ? STORY_DEVICES : VERSUS_DEVICES;
  }

  private enabled(d: DeviceId): boolean {
    const ord = padOrdinal(d);
    if (ord !== null) return connectedPads(this).length > ord;
    if (d === 'touch') return wantsTouchControls();
    return true;
  }

  /** Dispositivos que o jogador i pode escolher agora (o toque pode ser dividido entre os dois). */
  private options(i: number): DeviceId[] {
    return this.list.filter(
      (d) => this.enabled(d) && (d === 'touch' || !this.choice.some((c, j) => j !== i && c === d)),
    );
  }

  private defaults(): DeviceId[] {
    const pads = connectedPads(this).length;
    const touch = wantsTouchControls();
    if (this.mode === 'story') return [pads > 0 ? 'pad0' : touch ? 'touch' : 'kb-full'];
    if (pads >= 2) return ['pad0', 'pad1'];
    if (touch && pads === 0) return ['touch', 'touch'];
    return ['kb-left', pads === 1 ? 'pad0' : 'kb-right'];
  }

  create(): void {
    backdrop(this, 'ESCOLHA O CONTROLE');

    const P = VIEW.portrait;
    const HH = this.scale.height;
    this.add
      .text(W / 2, P ? 1560 * (HH / 2770) : 512, 'Controle não aparece? Conecte e aperte qualquer botão nele.', {
        fontFamily: BODY_FONT,
        fontSize: P ? '30px' : '18px',
        color: '#fff7dc',
        wordWrap: { width: 1100 },
        align: 'center',
      })
      .setOrigin(0.5);

    if (P) {
      pillButton(this, W / 2 - 290, HH - 150, '◀  VOLTAR', () => this.back(), 230).setScale(1.6);
      pillButton(this, W / 2 + 270, HH - 150, 'CONFIRMAR  ▶', () => this.confirm(), 250, 0xffe066).setScale(1.6);
    } else {
      pillButton(this, 160, 668, '◀  VOLTAR', () => this.back(), 230);
      pillButton(this, W - 170, 668, 'CONFIRMAR  ▶', () => this.confirm(), 250, 0xffe066);
    }

    const kb = this.input.keyboard!;
    if (this.mode === 'story') {
      kb.on('keydown-A', () => this.cycle(0, -1));
      kb.on('keydown-LEFT', () => this.cycle(0, -1));
      kb.on('keydown-D', () => this.cycle(0, 1));
      kb.on('keydown-RIGHT', () => this.cycle(0, 1));
    } else {
      kb.on('keydown-A', () => this.cycle(0, -1));
      kb.on('keydown-D', () => this.cycle(0, 1));
      kb.on('keydown-LEFT', () => this.cycle(1, -1));
      kb.on('keydown-RIGHT', () => this.cycle(1, 1));
    }
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.back());

    this.refresh();
  }

  update(): void {
    // Controle conectado/desconectado: atualiza a tela.
    const pads = connectedPads(this);
    if (pads.length !== this.padCount) {
      this.padCount = pads.length;
      this.choice = this.choice.map((c, i) => (this.enabled(c) ? c : this.options(i)[0] ?? 'kb-full'));
      this.refresh();
    }
    pads.forEach((pad, k) => {
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const ax = pad.axes[0]?.getValue() ?? 0;
      const st = { l: b(14) || ax < -0.5, r: b(15) || ax > 0.5, a: b(0) || b(9), b: b(1) };
      const prev = this.prevPad[k] ?? { l: false, r: false, a: false, b: false };
      // O controle mexe na coluna de quem já o escolheu; senão, na coluna do seu número.
      const own = this.choice.findIndex((c) => padOrdinal(c) === k);
      const col = own !== -1 ? own : Math.min(k, this.players - 1);
      if (st.l && !prev.l) this.cycle(col, -1);
      if (st.r && !prev.r) this.cycle(col, 1);
      if (st.a && !prev.a) this.confirm();
      if (st.b && !prev.b) this.back();
      this.prevPad[k] = st;
    });
  }

  private cycle(i: number, dir: number): void {
    if (i >= this.players) return;
    const opts = this.options(i);
    if (opts.length === 0) return;
    const at = opts.indexOf(this.choice[i]);
    this.choice[i] = opts[Phaser.Math.Wrap(at + dir, 0, opts.length)];
    this.refresh();
  }

  private refresh(): void {
    this.columns.forEach((c) => c.destroy());
    this.columns = [];
    for (let i = 0; i < this.players; i++) this.columns.push(this.column(i));
    this.tray?.destroy();
    this.tray = this.buildTray();
  }

  private column(i: number): Phaser.GameObjects.Container {
    // Monta em coordenadas locais e posiciona/escala o grupo (lado a lado deitado, empilhado em pé).
    const cx = 0;
    const cy = 0;
    const P = VIEW.portrait;
    const px = P ? W / 2 : this.players === 1 ? W / 2 : i === 0 ? W / 2 - 300 : W / 2 + 300;
    const k = this.scale.height / 2770;
    const py = P ? (this.players === 1 ? 800 : 580 + i * 620) * k : 300;
    const sc = P ? (this.players === 1 ? 2.1 : 1.65) * Math.min(1, k * 1.1) : 1;
    const d = this.choice[i];
    const info = DEVICES[d];
    const items: Phaser.GameObjects.GameObject[] = [panel(this, cx, cy, 500, 340)];

    let art: Phaser.GameObjects.Container;
    if (info.kind === 'keyboard') {
      const half = d === 'kb-left' ? 'left' : d === 'kb-right' ? 'right' : 'full';
      art = keyboardArt(this, cx, cy - 30, half, PLAYER_TINT[i], PLAYER_TINT[i]);
    } else if (info.kind === 'gamepad') {
      art = gamepadArt(this, cx, cy - 26, PLAYER_TINT[i]);
    } else {
      art = phoneArt(this, cx, cy - 30);
    }
    items.push(art);
    items.push(playerBadge(this, cx - 210, cy - 132, i + 1));
    items.push(
      this.add
        .text(cx, cy + 82, info.name, { fontFamily: FONT, fontSize: '26px', color: '#10223a' })
        .setOrigin(0.5),
    );
    items.push(
      this.add
        .text(cx, cy + 116, info.detail, { fontFamily: BODY_FONT, fontSize: '19px', color: '#3c5368' })
        .setOrigin(0.5),
    );
    // Setas para trocar.
    for (const dir of [-1, 1]) {
      const a = this.add
        .text(cx + dir * 285, cy - 26, dir < 0 ? '◀' : '▶', {
          fontFamily: FONT,
          fontSize: '46px',
          color: '#fff7dc',
          stroke: '#10223a',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setPadding(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.cycle(i, dir));
      items.push(a);
    }
    const hint = this.mode === 'story' ? 'A / D' : i === 0 ? 'A / D' : '← / →';
    items.push(
      this.add
        .text(cx, cy + 150, `trocar: ${hint}`, { fontFamily: BODY_FONT, fontSize: '15px', color: '#6b7f90' })
        .setOrigin(0.5),
    );
    return this.add.container(px, py, items).setScale(sc);
  }

  /** Bandeja com todos os dispositivos: cinza quando não conectado. */
  private buildTray(): Phaser.GameObjects.Container {
    const cy = 0;
    const P = VIEW.portrait;
    const slots: Array<{ ids: DeviceId[]; label: string; art: (x: number, y: number, on: boolean) => Phaser.GameObjects.Container }> = [
      {
        ids: this.mode === 'story' ? ['kb-full'] : ['kb-left', 'kb-right'],
        label: 'Teclado',
        art: (x, y) => keyboardArt(this, x, y, this.mode === 'story' ? 'full' : 'both'),
      },
      { ids: ['pad0'], label: 'Controle 1', art: (x, y, on) => gamepadArt(this, x, y, 0x5a6472, on) },
      { ids: ['pad1'], label: 'Controle 2', art: (x, y, on) => gamepadArt(this, x, y, 0x5a6472, on) },
      { ids: ['touch'], label: 'Toque', art: (x, y, on) => phoneArt(this, x, y, on) },
    ];
    const g = this.add.graphics();
    const tw = 600;
    g.fillStyle(0x10223a, 0.9).fillRoundedRect(-tw / 2 - 4, cy - 52, tw + 8, 112, 22);
    g.fillStyle(0xe7eef2, 0.95).fillRoundedRect(-tw / 2, cy - 48, tw, 104, 18);
    const items: Phaser.GameObjects.GameObject[] = [g];
    slots.forEach((s, k) => {
      const x = -tw / 2 + 75 + k * 150;
      const on = s.ids.some((id) => this.enabled(id));
      const art = s.art(x, cy - 10, on).setScale(0.3).setAlpha(on ? 1 : 0.4);
      items.push(art);
      items.push(
        this.add
          .text(x, cy + 34, s.label, {
            fontFamily: FONT,
            fontSize: '15px',
            color: on ? '#10223a' : '#9aa3ad',
          })
          .setOrigin(0.5),
      );
      // Números de quem escolheu este dispositivo.
      const owners = this.choice.map((c, i) => (s.ids.includes(c) ? i : -1)).filter((i) => i >= 0);
      owners.forEach((o, n) => items.push(playerBadge(this, x - 40 + n * 26 + (owners.length === 1 ? 14 : 0), cy - 44, o + 1, 11)));
    });
    const k = this.scale.height / 2770;
    return this.add.container(W / 2, P ? 1780 * k : 588, items).setScale(P ? 1.85 * Math.min(1, k * 1.1) : 1);
  }

  private confirm(): void {
    this.scene.start('howto', { mode: this.mode, devices: [...this.choice] });
  }

  private back(): void {
    this.scene.start('menu', { stage: 'modes' });
  }
}

