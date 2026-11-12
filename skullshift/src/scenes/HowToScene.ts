import Phaser from 'phaser';
import { FONT, W } from '../config';
import { DEVICES, type DeviceId } from '../game/controls';
import { backdrop } from '../ui/backdrop';
import { PLAYER_TINT, gamepadArt, keycap, panel, phoneArt, pillButton, playerBadge } from '../ui/devices';

type Mode = 'story' | 'versus';

const CAPTION = { fontFamily: FONT, fontStyle: 'bold', fontSize: '17px', color: '#10223a' };

/** Tela "Como jogar": mostra o mapa de botões do dispositivo escolhido por cada jogador. */
export class HowToScene extends Phaser.Scene {
  private mode: Mode = 'story';
  private devices: DeviceId[] = [];
  private prevPad = { a: false, b: false };

  constructor() {
    super('howto');
  }

  init(data: { mode: Mode; devices: DeviceId[] }): void {
    this.mode = data.mode;
    this.devices = data.devices;
    // Evita que o botão "confirmar" da tela anterior pule esta tela.
    this.prevPad = { a: true, b: true };
  }

  create(): void {
    backdrop(this, 'COMO JOGAR');
    const n = this.devices.length;
    this.devices.forEach((d, i) => {
      const cx = n === 1 ? W / 2 : i === 0 ? W / 2 - 300 : W / 2 + 300;
      this.playerPanel(cx, 268, i, d);
    });
    this.rules(520);

    pillButton(this, 160, 668, '◀  VOLTAR', () => this.back(), 230);
    pillButton(this, W - 170, 668, 'JOGAR  ▶', () => this.play(), 250, 0xffe066);

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.play());
    kb.on('keydown-SPACE', () => this.play());
    kb.on('keydown-ESC', () => this.back());
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const a = !!pad.buttons[0]?.pressed || !!pad.buttons[9]?.pressed;
    const b = !!pad.buttons[1]?.pressed;
    if (a && !this.prevPad.a) this.play();
    if (b && !this.prevPad.b) this.back();
    this.prevPad = { a, b };
  }

  private playerPanel(cx: number, cy: number, i: number, d: DeviceId): void {
    panel(this, cx, cy, 520, 300);
    playerBadge(this, cx - 222, cy - 112, i + 1);
    this.add
      .text(cx - 186, cy - 112, DEVICES[d].name, { ...CAPTION, fontSize: '20px' })
      .setOrigin(0, 0.5);
    const kind = DEVICES[d].kind;
    if (kind === 'keyboard') this.keyMap(cx, cy + 20, d);
    else if (kind === 'gamepad') this.padMap(cx, cy + 10, i);
    else this.touchMap(cx, cy + 10);
  }

  /** Teclas em formato de cruz + tecla de ataque, com legendas e setas. */
  private keyMap(cx: number, cy: number, d: DeviceId): void {
    const k =
      d === 'kb-left'
        ? { up: 'W', left: 'A', down: 'S', right: 'D', atk: 'F', atkW: 54 }
        : d === 'kb-right'
          ? { up: '↑', left: '←', down: '↓', right: '→', atk: 'Enter', atkW: 92 }
          : { up: 'W', left: 'A', down: 'S', right: 'D', atk: 'F', atkW: 54 };
    const ox = cx - 90;
    keycap(this, ox, cy - 30, k.up);
    keycap(this, ox - 58, cy + 28, k.left);
    keycap(this, ox, cy + 28, k.down);
    keycap(this, ox + 58, cy + 28, k.right);
    keycap(this, cx + 140, cy + 28, k.atk, k.atkW, 50, 0xd9534f);

    const g = this.add.graphics().lineStyle(3, 0xe67e22, 1);
    const label = (x: number, y: number, text: string, ax: number, ay: number) => {
      this.add.text(x, y, text, CAPTION).setOrigin(0.5);
      g.lineBetween(x, y + (ay > y ? 12 : -12), ax, ay);
    };
    label(ox + 110, cy - 72, 'Pular', ox + 26, cy - 40);
    label(ox - 116, cy - 40, 'Mover', ox - 70, cy + 4);
    this.add.text(ox + 104, cy + 28, '▶', { ...CAPTION, color: '#e67e22' }).setOrigin(0.5);
    this.add.text(ox - 104, cy + 28, '◀', { ...CAPTION, color: '#e67e22' }).setOrigin(0.5);
    label(ox, cy + 96, 'Defender', ox, cy + 58);
    label(cx + 140, cy - 40, 'Atacar', cx + 140, cy);
    if (d === 'kb-full') {
      this.add
        .text(cx + 140, cy + 92, 'também: setas, Espaço\ne J para atacar', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#3c5368',
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  private padMap(cx: number, cy: number, i: number): void {
    gamepadArt(this, cx - 110, cy, PLAYER_TINT[i]).setScale(0.85);
    const rows: Array<[number, string, string]> = [
      [0x4caf50, 'A', 'Pular'],
      [0x3f7fd9, 'X', 'Atacar'],
      [0xe5533d, 'B', 'Defender (ou LB/RB)'],
      [0x5a6472, '◉', 'Mover (analógico ou direcional)'],
    ];
    rows.forEach(([c, glyph, text], k) => {
      const y = cy - 66 + k * 44;
      const x = cx + 50;
      this.add.circle(x, y, 15, c).setStrokeStyle(3, 0x1d1a2b);
      this.add.text(x, y, glyph, { fontFamily: FONT, fontStyle: 'bold', fontSize: '15px', color: '#fff' }).setOrigin(0.5);
      this.add.text(x + 26, y, text, { ...CAPTION, fontSize: '16px' }).setOrigin(0, 0.5);
    });
  }

  private touchMap(cx: number, cy: number): void {
    phoneArt(this, cx - 100, cy).setScale(0.85);
    const rows: Array<[string, string]> = [
      ['◀ ▶', 'Mover'],
      ['PULA', 'Pular'],
      ['DEF', 'Defender'],
      ['ATQ', 'Atacar'],
    ];
    rows.forEach(([glyph, text], k) => {
      const y = cy - 66 + k * 44;
      const x = cx + 90;
      this.add.circle(x, y, 19, 0x10223a, 0.85).setStrokeStyle(3, 0xfff7dc);
      this.add.text(x, y, glyph, { fontFamily: FONT, fontStyle: 'bold', fontSize: '11px', color: '#fff7dc' }).setOrigin(0.5);
      this.add.text(x + 30, y, text, { ...CAPTION, fontSize: '16px' }).setOrigin(0, 0.5);
    });
    this.add
      .text(cx, cy + 112, 'Deite o celular. Dá para usar vários dedos ao mesmo tempo.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#3c5368',
      })
      .setOrigin(0.5);
  }

  /** Regras em uma faixa: golpe único, escudo, transformação, objetivo. */
  private rules(y: number): void {
    const g = this.add.graphics();
    const w = 1060;
    g.fillStyle(0x10223a, 0.88).fillRoundedRect(W / 2 - w / 2, y - 46, w, 92, 18);
    const tips: Array<[string, string]> = [
      ['skull_avatar', 'Um golpe mata.\nVocê também!'],
      ['shield', 'Segure para TRÁS\npara defender'],
      ['items', 'Osso, arpão ou lança:\npegue e se transforme'],
      ['goal', this.mode === 'story' ? '5 cenários: chegue ao\nfim do lado oposto' : 'Matou? Ganhou a vez.\nChegue ao seu fim!'],
    ];
    tips.forEach(([icon, text], k) => {
      const x = W / 2 - w / 2 + 40 + k * (w / 4);
      if (icon === 'items') {
        this.add.image(x + 2, y - 16, 'bone', 0).setScale(0.6);
        this.add.image(x + 22, y - 2, 'harpoon').setScale(0.5).setAngle(45);
        this.add.image(x + 12, y + 16, 'spear_item').setScale(0.6);
      } else if (icon === 'goal') {
        this.add.image(x + 18, y + 26, 'skull_spike').setOrigin(0.5, 1).setScale(0.55);
      } else if (icon === 'shield') {
        this.add.image(x + 18, y, 'shield').setScale(1.4);
      } else {
        this.add.image(x + 18, y, icon).setScale(0.26);
      }
      this.add
        .text(x + 54, y, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: '15px', color: '#fff7dc', lineSpacing: 4 })
        .setOrigin(0, 0.5);
    });
  }

  private play(): void {
    this.scene.start('game', { mode: this.mode, devices: this.devices });
  }

  private back(): void {
    this.scene.start('controls', { mode: this.mode, devices: this.devices });
  }
}
