import Phaser from 'phaser';
import { FONT } from '../config';

/** Cores dos jogadores (badges, metades do teclado, metade do controle). */
export const PLAYER_TINT = [0x2f86e0, 0xe5463a];
export const PLAYER_HEX = ['#2f86e0', '#e5463a'];

const INK = 0x1d1a2b;
const CAP = 0xe8dfcf;
const CAP_SHADOW = 0xa89c88;

/** Tecla desenhada (rótulo centralizado). */
export function keycap(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  w = 50,
  h = 50,
  tint?: number,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(INK).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 9, 10);
  g.fillStyle(tint !== undefined ? Phaser.Display.Color.ValueToColor(tint).darken(25).color : CAP_SHADOW)
    .fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 8);
  g.fillStyle(tint ?? CAP).fillRoundedRect(-w / 2, -h / 2, w, h - 2, 8);
  const t = scene.add
    .text(0, -2, label, {
      fontFamily: FONT,
      fontSize: label.length > 2 ? '15px' : '22px',
      color: tint !== undefined ? '#ffffff' : '#3a2f2a',
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [g, t]);
}

/**
 * Teclado inteiro. `half` destaca a parte usada: esquerda (P1), direita (P2),
 * ambas (cada metade numa cor) ou o teclado todo.
 */
export function keyboardArt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  half: 'left' | 'right' | 'both' | 'full' | 'none',
  tintLeft = PLAYER_TINT[0],
  tintRight = PLAYER_TINT[1],
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const W = 340;
  const H = 128;
  g.fillStyle(INK).fillRoundedRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 14, 16);
  const body = (side: 'l' | 'r', color: number) => {
    g.fillStyle(color);
    if (side === 'l') g.fillRoundedRect(-W / 2, -H / 2, W / 2, H, { tl: 12, bl: 12, tr: 0, br: 0 });
    else g.fillRoundedRect(0, -H / 2, W / 2, H, { tl: 0, bl: 0, tr: 12, br: 12 });
  };
  const grey = 0x8e98a3;
  const lc = half === 'left' || half === 'both' || half === 'full' ? (half === 'full' ? tintLeft : tintLeft) : grey;
  const rc = half === 'right' || half === 'both' ? tintRight : half === 'full' ? tintLeft : grey;
  body('l', lc);
  body('r', rc);
  // Teclas: 4 fileiras de 12.
  const kw = 22;
  const kh = 20;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) {
      const kx = -W / 2 + 16 + c * 26.5 + (r % 2) * 6;
      const ky = -H / 2 + 14 + r * 26;
      const left = kx < 0;
      const active = (left && lc !== grey) || (!left && rc !== grey);
      g.fillStyle(active ? 0x1d1a2b : 0x5f6872, active ? 0.35 : 0.45).fillRoundedRect(kx, ky + 2, kw, kh, 4);
      g.fillStyle(active ? 0xf4efe6 : 0xb8c0c8, active ? 0.92 : 0.8).fillRoundedRect(kx, ky, kw, kh - 2, 4);
    }
  }
  // Barra de espaço.
  g.fillStyle(0xf4efe6, 0.92).fillRoundedRect(-70, H / 2 - 22, 140, 14, 4);
  return scene.add.container(x, y, [g]);
}

/** Controle estilo moderno. `split` pinta cada metade com uma cor (como dividir um controle). */
export function gamepadArt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  enabled = true,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const body = enabled ? color : 0x9aa3ad;
  const dark = Phaser.Display.Color.ValueToColor(body).darken(30).color;
  // Contorno + corpo (duas alças + centro).
  g.fillStyle(INK);
  g.fillCircle(-92, 22, 58).fillCircle(92, 22, 58).fillRoundedRect(-120, -56, 240, 100, 40);
  g.fillStyle(body);
  g.fillCircle(-92, 22, 52).fillCircle(92, 22, 52).fillRoundedRect(-114, -50, 228, 90, 36);
  // Gatilhos.
  g.fillStyle(INK).fillRoundedRect(-118, -70, 66, 22, 10).fillRoundedRect(52, -70, 66, 22, 10);
  g.fillStyle(dark).fillRoundedRect(-114, -66, 58, 16, 8).fillRoundedRect(56, -66, 58, 16, 8);
  // Analógicos.
  for (const [sx, sy] of [[-70, -10], [36, 26]] as const) {
    g.fillStyle(INK).fillCircle(sx, sy, 22);
    g.fillStyle(dark).fillCircle(sx, sy, 18);
    g.fillStyle(0x2b2838).fillCircle(sx, sy, 12);
  }
  // Direcional.
  g.fillStyle(INK).fillRect(-46, 18, 36, 12).fillRect(-34, 6, 12, 36);
  // Botões ABXY.
  const btn: Array<[number, number, number]> = [
    [76, -2, 0x4caf50], // A (baixo)
    [96, -20, 0xe5533d], // B (direita)
    [56, -20, 0x3f7fd9], // X (esquerda)
    [76, -38, 0xf2c230], // Y (cima)
  ];
  for (const [bx, by, c] of btn) {
    g.fillStyle(INK).fillCircle(bx, by, 11);
    g.fillStyle(enabled ? c : 0xc5ccd3).fillCircle(bx, by, 8);
  }
  g.fillStyle(INK).fillCircle(0, -30, 9);
  g.fillStyle(enabled ? 0xf4efe6 : 0xc5ccd3).fillCircle(0, -30, 6);
  return scene.add.container(x, y, [g]);
}

/** Celular deitado com os botões virtuais. */
export function phoneArt(scene: Phaser.Scene, x: number, y: number, enabled = true): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(INK).fillRoundedRect(-150, -76, 300, 152, 24);
  g.fillStyle(enabled ? 0x39b5fd : 0x9aa3ad).fillRoundedRect(-136, -64, 272, 128, 12);
  g.fillStyle(enabled ? 0x8fbf4a : 0xb8c0c8).fillRect(-136, -6, 272, 18);
  const ring = (cx: number, cy: number, r: number) => {
    g.lineStyle(3, 0xfff7dc, 0.9).strokeCircle(cx, cy, r);
    g.fillStyle(0x10223a, 0.4).fillCircle(cx, cy, r);
  };
  ring(-108, 36, 16);
  ring(-70, 36, 16);
  ring(68, 40, 13);
  ring(96, 14, 14);
  ring(112, 44, 17);
  return scene.add.container(x, y, [g]);
}

/** Mouse e uma tela com o rastro de um arrasto: o controle por gestos. */
export function gestureArt(scene: Phaser.Scene, x: number, y: number, enabled = true): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const on = (c: number) => (enabled ? c : 0x9aa3ad);
  // Telinha com o rastro do dedo (arrastar e deslizar para cima).
  g.fillStyle(INK).fillRoundedRect(-150, -70, 190, 140, 20);
  g.fillStyle(on(0x39b5fd)).fillRoundedRect(-138, -58, 166, 116, 10);
  g.lineStyle(3, 0xfff7dc, 0.8).strokeCircle(-70, 20, 26);
  g.fillStyle(0xfff7dc, 0.9).fillCircle(-46, 20, 10);
  for (let i = 0; i < 5; i++) g.fillStyle(0xffe066, 0.4 + i * 0.12).fillCircle(-30 + i * 6, 6 - i * 12, 3 + i);
  // Mouse.
  g.fillStyle(INK).fillRoundedRect(60, -62, 96, 132, 46);
  g.fillStyle(on(0xe7eef2)).fillRoundedRect(68, -54, 80, 116, 40);
  g.fillStyle(on(0xd8a530)).fillRoundedRect(68, -54, 40, 50, { tl: 36, tr: 0, bl: 0, br: 0 });
  g.fillStyle(on(0x2f86e0)).fillRoundedRect(108, -54, 40, 50, { tl: 0, tr: 36, bl: 0, br: 0 });
  g.fillStyle(INK).fillRect(106, -54, 4, 50).fillRect(68, -6, 80, 4);
  g.fillStyle(INK).fillRoundedRect(102, -40, 12, 22, 6);
  // Fio.
  g.lineStyle(4, INK).beginPath().moveTo(108, -62).lineTo(108, -76).lineTo(140, -84).strokePath();
  return scene.add.container(x, y, [g]);
}

/** Círculo numerado do jogador (1, 2). */
export function playerBadge(scene: Phaser.Scene, x: number, y: number, n: number, r = 26): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(INK).fillCircle(0, 2, r + 4);
  g.fillStyle(PLAYER_TINT[n - 1]).fillCircle(0, 0, r);
  const t = scene.add
    .text(0, 0, String(n), { fontFamily: FONT, fontSize: `${Math.round(r * 1.2)}px`, color: '#ffffff' })
    .setOrigin(0.5);
  return scene.add.container(x, y, [g, t]);
}

/** Botão de texto clicável/tocável no estilo do jogo. */
export function pillButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  w = 260,
  color = 0xfff7dc,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const h = 58;
  g.fillStyle(INK).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 14, 16);
  g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 12);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  const t = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '26px', color: '#10223a' })
    .setOrigin(0.5);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h + 10);
  c.setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      c.y = y + 4;
    })
    .on('pointerout', () => {
      c.y = y;
    })
    .on('pointerup', () => {
      c.y = y;
      onClick();
    });
  return c;
}

/** Painel claro com cantos arredondados (fundo das colunas). */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.94): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(INK, 0.9).fillRoundedRect(x - w / 2 - 5, y - h / 2 - 5, w + 10, h + 16, 26);
  g.fillStyle(0xe7eef2, alpha).fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  return g;
}
