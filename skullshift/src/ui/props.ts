import Phaser from 'phaser';
import { rng } from './pixelart';

/**
 * Objetos de cenário desenhados em vetor, no estilo do Tiny Swords: contorno escuro grosso,
 * três tons (luz, meio e sombra), brilho e pequenos detalhes. Viram texturas no carregamento
 * (makeProps) ou são desenhados direto num Graphics quando o tamanho muda (lago, parede, morros).
 */

export const INK = 0x1d1a2b;
type G = Phaser.GameObjects.Graphics;
type Pt = Phaser.Types.Math.Vector2Like;

const V = (p: number[]): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i < p.length; i += 2) o.push({ x: p[i], y: p[i + 1] });
  return o;
};

/** Polígono com contorno de tinta (o contorno sai para fora da forma). */
function poly(g: G, p: number[], fill: number, ink = 3): void {
  if (ink) {
    g.fillStyle(INK).fillPoints(V(p), true);
    g.lineStyle(ink * 2, INK).strokePoints(V(p), true, true);
  }
  g.fillStyle(fill).fillPoints(V(p), true);
}

/** Linha grossa com contorno (galhos, juncos, cordas). */
function inkLine(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: number): void {
  g.lineStyle(w + 4, INK).lineBetween(x0, y0, x1, y1);
  g.fillStyle(INK).fillCircle(x0, y0, (w + 4) / 2).fillCircle(x1, y1, (w + 4) / 2);
  g.lineStyle(w, color).lineBetween(x0, y0, x1, y1);
  g.fillStyle(color).fillCircle(x1, y1, w / 2);
}

const STONE = [0x7f7a8c, 0xb0aabc, 0x575263];
const BASALT = [0x4a3a3e, 0x6e585c, 0x2e2428];

/** Pedrinha com contorno, sombra embaixo e brilho no alto. */
export function rock(g: G, x: number, y: number, r: number, pal = STONE): void {
  g.fillStyle(INK).fillEllipse(x, y, r * 2 + 6, r * 1.5 + 6);
  g.fillStyle(pal[0]).fillEllipse(x, y, r * 2, r * 1.5);
  g.fillStyle(pal[2]).fillEllipse(x + r * 0.15, y + r * 0.38, r * 1.6, r * 0.6);
  g.fillStyle(pal[1]).fillEllipse(x - r * 0.3, y - r * 0.28, r * 0.95, r * 0.55);
}

/** Tufo de grama (três folhas pontudas). */
function tuft(g: G, x: number, y: number, s = 1): void {
  const blade = (dx: number, h: number, lean: number) => poly(g, [x + dx - 4 * s, y, x + dx + lean * s, y - h * s, x + dx + 4 * s, y], 0x5aa040, 2);
  blade(-6, 14, -6);
  blade(6, 12, 6);
  blade(0, 18, 1);
  g.fillStyle(0x8ad45a).fillTriangle(x - 1 * s, y - 2, x + 1 * s, y - 15 * s, x + 2 * s, y - 2);
}

/** Juncos com taboas, na beira da água. */
function reeds(g: G, x: number, y: number, n: number, R: () => number): void {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 8;
    const h = 30 + R() * 34;
    const lean = (R() - 0.5) * 12;
    inkLine(g, bx, y, bx - 14 + R() * 4, y - h * 0.55, 2.5, 0x7cc456);
    inkLine(g, bx, y, bx + lean, y - h, 3, 0x4f9a3c);
    if (R() < 0.65) {
      g.fillStyle(INK).fillEllipse(bx + lean, y - h + 4, 11, 22);
      g.fillStyle(0x7a4428).fillEllipse(bx + lean, y - h + 4, 7, 18);
      g.fillStyle(0xb07a45).fillEllipse(bx + lean - 1.5, y - h + 1, 2.5, 9);
    }
  }
}

/** Folha de vitória-régia (com flor de vez em quando). */
function lily(g: G, x: number, y: number, r: number, flower: boolean): void {
  g.fillStyle(INK).fillEllipse(x, y + 1, r * 2 + 5, r + 5);
  g.fillStyle(0x2f7a2c).fillEllipse(x, y + 1, r * 2, r);
  g.fillStyle(0x56aa40).fillEllipse(x - r * 0.1, y - 1, r * 1.8, r * 0.75);
  g.fillStyle(0x8ad45a).fillEllipse(x - r * 0.4, y - r * 0.15, r * 0.7, r * 0.25);
  g.lineStyle(2, 0x2f6a28).lineBetween(x, y, x + r * 0.95, y - r * 0.12);
  if (!flower) return;
  for (const [dx, dy] of [[-5, -2], [5, -2], [0, -6], [-3, 2], [3, 2]]) g.fillStyle(INK).fillCircle(x + dx - 2, y - 4 + dy, 5.5);
  for (const [dx, dy] of [[-5, -2], [5, -2], [0, -6], [-3, 2], [3, 2]]) g.fillStyle(0xff9ac8).fillCircle(x + dx - 2, y - 4 + dy, 3.8);
  g.fillStyle(0xffe066).fillCircle(x - 2, y - 5, 2.6);
}

/** Lago visto de lado: margem de terra com pedras, água em quatro tons, reflexos, plantas. */
export function drawPond(g: G, cx: number, cy: number, w: number, h: number, seed = 7, reedsToo = true): void {
  const R = rng(seed);
  // Margem.
  g.fillStyle(INK).fillEllipse(cx, cy, w + 18, h + 16);
  g.fillStyle(0x8a6440).fillEllipse(cx, cy, w + 10, h + 10);
  g.fillStyle(0x6a4a30).fillEllipse(cx, cy + 3, w + 4, h + 4);
  g.fillStyle(INK).fillEllipse(cx, cy + 2, w + 1, h + 1);
  // Água: escura no fundo (a margem faz sombra), clara perto da gente.
  g.fillStyle(0x1b5a96).fillEllipse(cx, cy + 2, w - 3, h - 3);
  g.fillStyle(0x2a7fc4).fillEllipse(cx, cy + h * 0.1, w - 18, h * 0.78);
  g.fillStyle(0x3d9de0).fillEllipse(cx + w * 0.02, cy + h * 0.16, w * 0.8, h * 0.56);
  g.fillStyle(0x68c2f2).fillEllipse(cx - w * 0.04, cy + h * 0.2, w * 0.5, h * 0.28);
  // Reflexos do céu e anéis de onda.
  for (let i = 0; i < Math.round(w / 50); i++) {
    const x = cx + (R() - 0.5) * w * 0.66;
    const y = cy + (R() - 0.3) * h * 0.5;
    g.fillStyle(0xffffff, 0.6).fillRoundedRect(x - 6 - R() * 18, y, 12 + R() * 36, 3, 1.5);
  }
  g.lineStyle(2, 0xbfe9ff, 0.55);
  for (let i = 0; i < Math.round(w / 110); i++) g.strokeEllipse(cx + (R() - 0.5) * w * 0.5, cy + h * (0.05 + R() * 0.25), 30 + R() * 20, 7);
  // Vitórias-régias.
  const pads = Math.max(2, Math.round(w / 90));
  for (let i = 0; i < pads; i++) {
    const t = (i + 0.5) / pads;
    const x = cx - w * 0.38 + w * 0.76 * t + (R() - 0.5) * 30;
    const y = cy + (R() - 0.3) * h * 0.4;
    lily(g, x, y, 9 + R() * 7, R() < 0.45);
  }
  // Pedras da margem (de trás e dos lados).
  for (let a = Math.PI * 0.85; a <= Math.PI * 2.15; a += 0.22 + R() * 0.16) {
    const x = cx + Math.cos(a) * (w / 2 + 2);
    const y = cy + Math.sin(a) * (h / 2 + 1);
    rock(g, x, y, 5 + R() * 6);
  }
  if (!reedsToo) return;
  reeds(g, cx - w / 2 + 14, cy + 2, 4, R);
  reeds(g, cx + w / 2 - 18, cy, 3, R);
}

/** Píer de tábuas com estacas entrando na água. */
export function drawDock(g: G, x: number, y: number, w: number, legs: number[], legH: number): void {
  for (const lx of legs) {
    g.fillStyle(INK).fillRect(x + lx - 9, y + 8, 18, legH + 3);
    g.fillStyle(0x5e3a20).fillRect(x + lx - 6, y + 8, 12, legH);
    g.fillStyle(0x7a4e2e).fillRect(x + lx - 6, y + 8, 4, legH);
    g.fillStyle(0x9a6438).fillRect(x + lx - 6, y + legH - 2, 12, 4);
  }
  g.fillStyle(INK).fillRoundedRect(x - 4, y - 4, w + 8, 26, 4);
  const pw = 20;
  for (let px = 0, i = 0; px < w; px += pw, i++) {
    const ww = Math.min(pw - 2, w - px);
    g.fillStyle(i % 2 ? 0xa8743f : 0x9a6838).fillRect(x + px, y, ww, 18);
    g.fillStyle(0xc89058).fillRect(x + px, y, ww, 4);
    g.fillStyle(0x6a4428).fillRect(x + px, y + 14, ww, 4);
    g.fillStyle(INK).fillCircle(x + px + 4, y + 9, 1.8).fillCircle(x + px + ww - 4, y + 9, 1.8);
  }
}

/** Arco de pedra em blocos (portal das dungeons e passagens do mapa). */
export function drawArch(
  g: G,
  cx: number,
  by: number,
  o: { outer: number; inner: number; pillar: number; block: number; stone?: number[]; void: number; gem: [number, number]; rune: number; moss?: boolean; seed?: number },
): void {
  const R = rng(o.seed ?? 3);
  const [mid, light, dark] = o.stone ?? STONE;
  const cy = by - o.pillar;
  const { outer, inner } = o;
  const k = outer / 86; // escala dos detalhes
  // Silhueta e vão.
  g.fillStyle(INK).slice(cx, cy, outer + 4, Math.PI, 0, false).fillPath();
  g.fillRect(cx - outer - 4, cy - 1, (outer + 4) * 2, o.pillar + 1);
  g.fillStyle(o.void).slice(cx, cy, inner - 4, Math.PI, 0, false).fillPath();
  g.fillRect(cx - inner + 4, cy - 1, (inner - 4) * 2, o.pillar + 1);
  // Brilho dentro do vão (de baixo para cima).
  for (let i = 0; i < 4; i++) g.fillStyle(o.gem[0], 0.12).fillEllipse(cx, by - 4, (inner - 4) * 2 * (1 - i * 0.18), o.pillar * (0.9 - i * 0.18));
  const block = (x: number, y: number, w: number, h: number) => {
    g.fillStyle(mid).fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle(light).fillRect(x + 2, y + 2, w - 4, Math.max(2, 4 * k));
    g.fillStyle(light).fillRect(x + 2, y + 2, Math.max(2, 3 * k), h - 4);
    g.fillStyle(dark).fillRect(x + 2, y + h - 2 - Math.max(2, 4 * k), w - 4, Math.max(2, 4 * k));
    if (R() < 0.35) g.lineStyle(Math.max(1, 2 * k), dark).lineBetween(x + w * 0.3, y + 4, x + w * 0.45, y + h * 0.55);
  };
  // Pilares em blocos alternados.
  const pw = outer - inner;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? cx - outer : cx + inner;
    let y = by;
    let n = 0;
    while (y > cy + 2) {
      const h = Math.min(o.block * (n % 2 ? 0.8 : 1), y - cy);
      y -= h;
      if (n % 2) block(x0, y, pw, h);
      else {
        block(x0, y, pw * 0.55, h);
        block(x0 + pw * 0.55, y, pw * 0.45, h);
      }
      n++;
    }
    // Runas acesas no pilar.
    g.lineStyle(Math.max(2, 3 * k), o.rune, 0.95);
    const rx = x0 + pw / 2;
    for (let i = 0; i < 2; i++) {
      const ry = cy + o.pillar * (0.3 + i * 0.32);
      const s = 7 * k;
      g.lineBetween(rx, ry - s, rx, ry + s);
      g.lineBetween(rx, ry - s * 0.3, rx + s * 0.7 * side, ry - s);
      g.lineBetween(rx, ry + s * 0.2, rx - s * 0.6 * side, ry + s * 0.7);
    }
  }
  // Aduelas do arco.
  const N = 7;
  const step = Math.PI / N;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI + i * step + 0.02;
    const a1 = Math.PI + (i + 1) * step - 0.02;
    const pts: number[] = [];
    const ring = (r: number, from: number, to: number) => {
      for (let s = 0; s <= 4; s++) {
        const a = from + ((to - from) * s) / 4;
        pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
    };
    ring(outer - 1, a0, a1);
    ring(inner + 1, a1, a0);
    g.fillStyle(mid).fillPoints(V(pts), true);
    const band = (r0: number, r1: number, c: number) => {
      const p: number[] = [];
      for (let s = 0; s <= 4; s++) {
        const a = a0 + ((a1 - a0) * s) / 4;
        p.push(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      }
      for (let s = 4; s >= 0; s--) {
        const a = a0 + ((a1 - a0) * s) / 4;
        p.push(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
      g.fillStyle(c).fillPoints(V(p), true);
    };
    band(outer - 1, outer - 1 - 5 * k, light);
    band(inner + 1, inner + 1 + 5 * k, dark);
  }
  // Pedra-chave com a gema.
  const kw = 18 * k;
  const ky = cy - outer;
  poly(g, [cx - kw, ky - 8 * k, cx + kw, ky - 8 * k, cx + kw * 0.75, ky + (outer - inner) + 4 * k, cx - kw * 0.75, ky + (outer - inner) + 4 * k], mid, 3);
  g.fillStyle(light).fillRect(cx - kw + 2, ky - 8 * k + 2, kw * 2 - 4, 4 * k);
  const gy = ky + (outer - inner) * 0.45;
  const gs = 10 * k;
  poly(g, [cx, gy - gs, cx + gs * 0.8, gy, cx, gy + gs, cx - gs * 0.8, gy], o.gem[0], 2);
  g.fillStyle(o.gem[1]).fillTriangle(cx, gy - gs + 2, cx - gs * 0.55, gy, cx, gy);
  g.fillStyle(0xffffff, 0.9).fillCircle(cx - gs * 0.25, gy - gs * 0.35, Math.max(1.5, 2 * k));
  // Capitéis (a pedra larga onde o arco começa).
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? cx - outer - 6 * k : cx + inner - 4 * k;
    g.fillStyle(INK).fillRect(x0 - 2, cy - 4 * k - 2, pw + 10 * k + 4, 12 * k + 4);
    g.fillStyle(mid).fillRect(x0, cy - 4 * k, pw + 10 * k, 12 * k);
    g.fillStyle(light).fillRect(x0, cy - 4 * k, pw + 10 * k, 3 * k);
  }
  // Base em degrau.
  const bw = outer + 14 * k;
  g.fillStyle(INK).fillRoundedRect(cx - bw - 3, by - 14 * k - 3, bw * 2 + 6, 14 * k + 6, 3);
  g.fillStyle(mid).fillRect(cx - bw, by - 14 * k, bw * 2, 14 * k);
  g.fillStyle(light).fillRect(cx - bw, by - 14 * k, bw * 2, 4 * k);
  g.fillStyle(dark).fillRect(cx - bw, by - 4 * k, bw * 2, 4 * k);
  // Musgo e trepadeiras.
  if (o.moss) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.08 + R() * 0.84);
      const r = outer - 2 - R() * 8 * k;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const s = (5 + R() * 6) * k;
      g.fillStyle(INK).fillCircle(x, y, s + 2.5).fillCircle(x + s, y + 2, s * 0.8 + 2.5);
      g.fillStyle(0x4f9a3c).fillCircle(x, y, s).fillCircle(x + s, y + 2, s * 0.8);
      g.fillStyle(0x8ad45a).fillCircle(x - s * 0.3, y - s * 0.3, s * 0.45);
    }
    for (const side of [-1, 1]) {
      const x = cx + side * (inner + 3);
      const top = cy - 4;
      let px = x;
      let py = top;
      for (let s = 0; s < 6; s++) {
        const nx = px + Math.sin(s * 1.7) * 4 * k;
        const ny = py + 10 * k;
        inkLine(g, px, py, nx, ny, 2, 0x4f9a3c);
        if (s % 2) {
          g.fillStyle(INK).fillEllipse(nx + side * 4, ny, 9 * k + 3, 5 * k + 3);
          g.fillStyle(0x6cbf4a).fillEllipse(nx + side * 4, ny, 9 * k, 5 * k);
        }
        px = nx;
        py = ny;
      }
    }
  }
}

/** Redemoinho do portal (circular; a cena achata e gira). */
function swirl(g: G, size: number, pal: number[]): void {
  const c = size / 2;
  for (let i = 0; i < pal.length; i++) g.fillStyle(pal[i]).fillCircle(c, c, c * (1 - i * 0.2));
  for (let arm = 0; arm < 3; arm++) {
    let prev: [number, number] | undefined;
    for (let r = 4; r < c - 2; r += 2) {
      const a = (arm * Math.PI * 2) / 3 + r * 0.09;
      const p: [number, number] = [c + Math.cos(a) * r, c + Math.sin(a) * r];
      if (prev) g.lineStyle(2 + (r / c) * 6, 0xffffff, 0.35 * (1 - r / c) + 0.1).lineBetween(prev[0], prev[1], p[0], p[1]);
      prev = p;
    }
  }
  g.fillStyle(0xffffff, 0.6).fillCircle(c, c, c * 0.12);
}

/** Morros ao fundo com contorno só na silhueta e luz no alto. */
export function drawHills(g: G, xs: number[], y: number, w: number, h: number, fill: number, lightC: number): void {
  for (const x of xs) g.fillStyle(INK).fillEllipse(x, y, w + 8, h + 8);
  for (const x of xs) g.fillStyle(fill).fillEllipse(x, y, w, h);
  for (const x of xs) g.fillStyle(lightC).fillEllipse(x - w * 0.1, y - h * 0.3, w * 0.55, h * 0.28);
  for (const x of xs) {
    g.fillStyle(INK).fillCircle(x + w * 0.22, y - h * 0.36, 9).fillCircle(x + w * 0.22 + 12, y - h * 0.33, 8);
    g.fillStyle(0x3f8a3c).fillCircle(x + w * 0.22, y - h * 0.36, 6.5).fillCircle(x + w * 0.22 + 12, y - h * 0.33, 5.5);
  }
}

/** Gera as texturas dos objetos de cenário (chamado no carregamento). */
export function makeProps(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  const done = (key: string, w: number, h: number) => {
    g.generateTexture(key, w, h);
    g.clear();
  };

  // ---------- Vila ----------
  // Lago (centro da água em 170,80).
  drawPond(g, 170, 80, 300, 62, 11);
  done('prop_pond', 340, 130);

  // Píer curto.
  drawDock(g, 6, 6, 96, [16, 84], 30);
  done('prop_dock', 110, 50);

  // Portal das dungeons (base em y=236).
  drawArch(g, 104, 236, { outer: 86, inner: 56, pillar: 112, block: 30, void: 0x1a0e2c, gem: [0x9b6bf0, 0xe0c8ff], rune: 0xd8b8ff, moss: true, seed: 4 });
  for (const x of [8, 196]) tuft(g, x, 236, 1);
  done('prop_portal', 208, 240);
  swirl(g, 128, [0x2a1240, 0x4a2280, 0x7a46d0, 0x9b6bf0, 0xc8a8ff]);
  done('prop_swirl', 128, 128);
  swirl(g, 128, [0x0e2a50, 0x1e5aa0, 0x2f86e0, 0x6cc6f5, 0xbfe9ff]);
  done('prop_swirl_blue', 128, 128);

  // Cerca (um vão de 64 px, emenda com o próximo) e o mourão solto do fim.
  const post = (x: number) => {
    poly(g, [x, 70, x, 12, x + 8, 2, x + 16, 12, x + 16, 70], 0xb07a45, 3);
    g.fillStyle(0xd09a60).fillPoints(V([x + 2, 68, x + 2, 13, x + 8, 5, x + 8, 68]), true);
    g.fillStyle(0x8a5a35).fillRect(x + 12, 14, 4, 54);
    g.lineStyle(1.5, 0x8a5a35).lineBetween(x + 5, 24, x + 5, 34).lineBetween(x + 10, 46, x + 10, 60);
  };
  for (const ry of [20, 44]) {
    g.fillStyle(INK).fillRect(0, ry - 3, 64, 16);
    g.fillStyle(0xc89058).fillRect(0, ry, 64, 10);
    g.fillStyle(0xe8b878).fillRect(0, ry, 64, 3);
    g.fillStyle(0x9a6a3a).fillRect(0, ry + 7, 64, 3);
    g.lineStyle(1.5, 0xa87440).lineBetween(26, ry + 5, 44, ry + 5).lineBetween(50, ry + 4, 60, ry + 4);
  }
  post(6);
  for (const ry of [25, 49]) {
    g.fillStyle(INK).fillCircle(10, ry, 2.2).fillCircle(18, ry, 2.2);
    g.fillStyle(0xc4beca).fillCircle(10, ry - 0.5, 1).fillCircle(18, ry - 0.5, 1);
  }
  tuft(g, 14, 72, 0.8);
  done('prop_fence', 64, 74);
  post(4);
  tuft(g, 12, 72, 0.8);
  done('prop_fencepost', 26, 74);

  // Placa de madeira com ponta de seta (texto vai por cima, centro em 80,42).
  poly(g, [76, 40, 92, 40, 92, 126, 76, 126], 0x8a5a35, 3);
  g.fillStyle(0xa8743f).fillRect(76, 40, 5, 86);
  g.fillStyle(0x6a4428).fillRect(88, 40, 4, 86);
  poly(g, [8, 12, 138, 12, 162, 42, 138, 72, 8, 72], 0xc89058, 4);
  g.fillStyle(0xe8b878).fillRect(10, 14, 128, 4).fillRect(10, 44, 128, 4);
  g.fillStyle(0xa0703f).fillRect(10, 37, 128, 4).fillRect(10, 66, 128, 4);
  g.lineStyle(3, 0x6a4428).lineBetween(8, 42, 152, 42);
  g.lineStyle(1.5, 0xa87440).lineBetween(30, 26, 70, 26).lineBetween(96, 30, 126, 30).lineBetween(24, 56, 56, 56).lineBetween(90, 58, 130, 58);
  for (const [nx, ny] of [[18, 27], [18, 57], [128, 27], [128, 57]]) {
    g.fillStyle(INK).fillCircle(nx, ny, 3.5);
    g.fillStyle(0xc4beca).fillCircle(nx - 0.5, ny - 0.5, 2);
  }
  tuft(g, 72, 128, 1);
  tuft(g, 98, 128, 0.8);
  done('prop_sign', 170, 132);

  // Bigorna sobre o toco, com uma barra em brasa.
  g.fillStyle(0x000000, 0.2).fillEllipse(60, 98, 92, 12);
  g.fillStyle(INK).fillRect(27, 58, 66, 40).fillEllipse(60, 97, 66, 14);
  g.fillStyle(0x8a5a35).fillRect(30, 60, 60, 36).fillEllipse(60, 96, 60, 10);
  g.fillStyle(0xa8743f).fillRect(30, 60, 10, 36);
  g.fillStyle(0x6a4428).fillRect(78, 60, 12, 36);
  g.lineStyle(2, 0x6a4428).lineBetween(50, 66, 50, 92).lineBetween(64, 64, 64, 90);
  g.fillStyle(INK).fillEllipse(60, 60, 66, 16);
  g.fillStyle(0xc89058).fillEllipse(60, 60, 60, 11);
  g.lineStyle(1.5, 0xa0703f).strokeEllipse(60, 60, 40, 7).strokeEllipse(60, 60, 20, 3.5);
  const A = (p: number[]) => p.map((v, i) => (i % 2 ? v + 2 : v + 2));
  poly(g, A([4, 22, 30, 12, 106, 12, 110, 16, 110, 30, 88, 32, 80, 42, 94, 50, 94, 56, 24, 56, 24, 50, 38, 42, 34, 32, 30, 30]), 0x6a6470, 3);
  g.fillStyle(0xa8a2b4).fillPoints(V(A([8, 22, 30, 14, 106, 14, 108, 18, 30, 19])), true);
  g.fillStyle(0x4a4652).fillPoints(V(A([60, 32, 88, 32, 80, 42, 94, 50, 94, 56, 60, 56])), true);
  g.fillStyle(0x8a8494).fillRect(28, 51, 66, 3);
  g.fillStyle(INK).fillRoundedRect(50, 4, 40, 12, 4);
  g.fillStyle(0xff7a1a).fillRoundedRect(52, 6, 36, 8, 3);
  g.fillStyle(0xffe066).fillRoundedRect(56, 7, 22, 3, 1.5);
  done('prop_anvil', 120, 104);

  // ---------- Mapa do mundo ----------
  // Boca de caverna vulcânica (leva às Terras de Fogo).
  {
    g.fillStyle(0x000000, 0.2).fillEllipse(92, 124, 170, 18);
    const mound = [8, 122, 12, 96, 24, 70, 44, 50, 62, 40, 72, 30, 94, 22, 114, 26, 130, 38, 148, 52, 162, 74, 170, 98, 174, 122];
    poly(g, mound, 0x7a4a3c, 4);
    g.fillStyle(0xa0644e).fillPoints(V([12, 120, 14, 96, 26, 72, 46, 52, 64, 42, 74, 32, 94, 24, 78, 50, 58, 74, 44, 120]), true);
    g.fillStyle(0xc88a6a).fillPoints(V([22, 86, 30, 70, 48, 54, 64, 44, 74, 34, 66, 50, 44, 68]), true);
    g.fillStyle(0x52302a).fillPoints(V([118, 30, 130, 40, 148, 54, 160, 76, 168, 98, 170, 120, 140, 120, 138, 82]), true);
    g.lineStyle(3, 0x3a201c).lineBetween(30, 104, 44, 92).lineBetween(150, 66, 158, 86).lineBetween(100, 36, 110, 48);
    // Rachaduras em brasa.
    const crack = (p: number[]) => {
      g.lineStyle(5, 0xff6a1a);
      for (let i = 2; i < p.length; i += 2) g.lineBetween(p[i - 2], p[i - 1], p[i], p[i + 1]);
      g.lineStyle(2, 0xffe066);
      for (let i = 2; i < p.length; i += 2) g.lineBetween(p[i - 2], p[i - 1], p[i], p[i + 1]);
    };
    crack([124, 44, 132, 56, 128, 66, 138, 80]);
    crack([56, 60, 48, 70, 52, 82]);
    // Boca: arco escuro com fogo lá dentro.
    const mx = 92;
    const mb = 122;
    const mr = 34;
    g.fillStyle(INK).slice(mx, mb - 40, mr + 4, Math.PI, 0, false).fillPath();
    g.fillRect(mx - mr - 4, mb - 41, (mr + 4) * 2, 41);
    g.fillStyle(0x1a0806).slice(mx, mb - 40, mr, Math.PI, 0, false).fillPath();
    g.fillRect(mx - mr, mb - 41, mr * 2, 41);
    for (const [w, h, c] of [[66, 50, 0x5a1a0a], [58, 38, 0xa0300e], [46, 26, 0xff5a1a], [30, 14, 0xffb02e], [16, 6, 0xfff1a8]] as const) g.fillStyle(c).fillEllipse(mx, mb - 4, w, h);
    // Dentes de pedra no alto da boca.
    for (const [tx, tw, th] of [[-22, 9, 14], [-6, 8, 20], [10, 9, 12], [24, 7, 10]]) poly(g, [mx + tx - tw, mb - 40 - mr * 0.6 + (Math.abs(tx) / mr) * 18, mx + tx + tw, mb - 40 - mr * 0.6 + (Math.abs(tx) / mr) * 18, mx + tx, mb - 40 - mr * 0.6 + th + (Math.abs(tx) / mr) * 18], 0x5a3430, 2);
    // Fio de lava escorrendo pra fora.
    g.fillStyle(INK).fillEllipse(mx + 6, mb + 2, 72, 14);
    g.fillStyle(0xff6a1a).fillEllipse(mx + 6, mb + 1, 66, 10);
    g.fillStyle(0xffc23a).fillEllipse(mx + 2, mb, 40, 5);
    rock(g, 26, 120, 10, BASALT);
    rock(g, 158, 120, 12, BASALT);
    rock(g, 140, 126, 7, BASALT);
  }
  done('prop_cave', 182, 134);

  // Arco azul de volta ao continente (base em y=118).
  drawArch(g, 60, 118, { outer: 40, inner: 25, pillar: 46, block: 16, void: 0x0a1a30, gem: [0x2f86e0, 0xbfe9ff], rune: 0x8fd9ff, moss: true, seed: 9 });
  done('prop_arch_blue', 120, 122);

  // Lago de lava com crosta (centro em 150,56).
  {
    const R = rng(21);
    const cx = 150;
    const cy = 56;
    const w = 254;
    const h = 70;
    g.fillStyle(INK).fillEllipse(cx, cy, w + 20, h + 18);
    g.fillStyle(BASALT[0]).fillEllipse(cx, cy, w + 12, h + 12);
    g.fillStyle(BASALT[1]).fillEllipse(cx - 8, cy - 4, w, h);
    g.fillStyle(INK).fillEllipse(cx, cy + 2, w + 1, h - 1);
    g.fillStyle(0x9a2414).fillEllipse(cx, cy + 2, w - 3, h - 4);
    g.fillStyle(0xe8461a).fillEllipse(cx, cy + 5, w - 16, h - 18);
    g.fillStyle(0xff8a2a).fillEllipse(cx - 6, cy + 6, w * 0.72, h * 0.46);
    g.fillStyle(0xffc23a).fillEllipse(cx - 12, cy + 6, w * 0.4, h * 0.22);
    g.fillStyle(0xfff1a8).fillEllipse(cx - 20, cy + 5, w * 0.14, h * 0.07);
    // Placas de crosta boiando, com borda acesa.
    for (const [px, py, s] of [[-86, -6, 16], [70, -10, 14], [96, 10, 10], [-40, 18, 9], [36, 20, 11], [-104, 12, 8]]) {
      const pts: number[] = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.4;
        const r = s * (0.75 + R() * 0.4);
        pts.push(cx + px + Math.cos(a) * r * 1.6, cy + py + Math.sin(a) * r * 0.7);
      }
      g.lineStyle(5, 0xffd060).strokePoints(V(pts), true, true);
      g.fillStyle(0x4a1a12).fillPoints(V(pts), true);
      g.fillStyle(0x7a3020).fillEllipse(cx + px - s * 0.3, cy + py - s * 0.15, s * 1.4, s * 0.45);
    }
    // Pedras da borda.
    for (let a = Math.PI * 0.9; a <= Math.PI * 2.1; a += 0.3 + R() * 0.2) rock(g, cx + Math.cos(a) * (w / 2 + 6), cy + Math.sin(a) * (h / 2 + 4), 6 + R() * 6, BASALT);
    for (const a of [0.3, 0.75, 2.4, 2.8]) rock(g, cx + Math.cos(a) * (w / 2 + 2), cy + Math.sin(a) * (h / 2 + 2), 7 + R() * 5, BASALT);
  }
  done('prop_lava', 300, 112);

  // ---------- Dungeon ----------
  // Lajotas de pedra escura (repete sem emenda a cada 128 px).
  {
    const R = rng(33);
    g.fillStyle(0x070c14).fillRect(0, 0, 128, 128);
    const rows = [[40, 48, 40], [32, 56, 40], [48, 32, 48], [36, 44, 48]];
    rows.forEach((ws, ri) => {
      const y = ri * 32;
      let x = (ri * 22) % 128;
      for (const w of ws) {
        for (const ox of [x, x - 128]) {
          const tone = [0x182233, 0x1b2638, 0x16202f][Math.floor(R() * 3)];
          g.fillStyle(tone).fillRoundedRect(ox + 2, y + 2, w - 4, 28, 4);
          g.fillStyle(0x26344a).fillRoundedRect(ox + 3, y + 3, w - 6, 4, 2);
          g.fillStyle(0x0f1724).fillRect(ox + 4, y + 24, w - 8, 4);
          if (R() < 0.3) g.lineStyle(1.5, 0x0c121c).lineBetween(ox + w * 0.3, y + 8, ox + w * 0.5, y + 20);
          if (R() < 0.15) g.fillStyle(0x2a4a3a).fillCircle(ox + 6, y + 26, 3);
        }
        x += w;
      }
    });
  }
  done('dn_floor', 128, 128);

  // Medalhão de pedra (aro com rebites) + disco em cinza que a cena tinge com a cor da sala.
  g.lineStyle(5, INK).strokeCircle(56, 56, 50);
  g.lineStyle(12, 0x7a7484).strokeCircle(56, 56, 43);
  g.lineStyle(4, 0xb4aec0).beginPath().arc(56, 56, 45.5, Math.PI * 0.95, Math.PI * 1.7).strokePath();
  g.lineStyle(4, 0x4e4a58).beginPath().arc(56, 56, 40.5, Math.PI * 0.05, Math.PI * 0.75).strokePath();
  g.lineStyle(3, INK).strokeCircle(56, 56, 36.5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.fillStyle(INK).fillCircle(56 + Math.cos(a) * 43, 56 + Math.sin(a) * 43, 3.6);
    g.fillStyle(0xd4cedc).fillCircle(56 + Math.cos(a) * 43 - 0.6, 56 + Math.sin(a) * 43 - 0.6, 1.8);
  }
  g.fillStyle(0xffffff, 0.35).fillEllipse(44, 38, 30, 14);
  g.fillStyle(0xffffff, 0.6).fillEllipse(40, 35, 10, 5);
  done('dn_ring', 112, 112);
  g.fillStyle(0x8a8a8a).fillCircle(40, 40, 36);
  g.fillStyle(0xc8c8c8).fillCircle(38, 37, 32);
  g.fillStyle(0xf0f0f0).fillCircle(35, 32, 21);
  done('dn_disc', 80, 80);

  g.destroy();
}

/** Cordilheira distante: picos com contorno, face iluminada à esquerda e neve no topo. */
export function drawMountains(g: G, x0: number, x1: number, baseY: number, seed = 13, pal = [0x6f8fb8, 0x9ab8dc, 0x52709a]): void {
  const R = rng(seed);
  const peaks: Array<[number, number, number]> = [];
  for (let x = x0; x < x1; x += 150 + R() * 120) peaks.push([x, 150 + R() * 140, 110 + R() * 70]);
  for (const [px, h, w] of peaks) poly(g, [px - w * 1.3, baseY, px, baseY - h, px + w * 1.3, baseY], pal[0], 4);
  for (const [px, h, w] of peaks) {
    g.fillStyle(pal[0]).fillTriangle(px - w * 1.3 + 6, baseY, px, baseY - h + 4, px + w * 1.3 - 6, baseY);
    g.fillStyle(pal[1]).fillTriangle(px - w * 1.3 + 8, baseY, px, baseY - h + 4, px - w * 0.15, baseY);
    g.fillStyle(pal[2]).fillTriangle(px + w * 0.35, baseY, px, baseY - h + 4, px + w * 1.3 - 8, baseY);
    // Neve.
    const s = 0.28;
    poly(g, [px - w * 1.3 * s, baseY - h * (1 - s), px, baseY - h, px + w * 1.3 * s, baseY - h * (1 - s), px + w * 0.18, baseY - h * (1 - s) + 10, px, baseY - h * (1 - s) + 2, px - w * 0.2, baseY - h * (1 - s) + 12], 0xf4f8ff, 2);
    g.fillStyle(0xc8d8ee).fillTriangle(px + 2, baseY - h + 4, px + w * 1.3 * s - 2, baseY - h * (1 - s), px + w * 0.16, baseY - h * (1 - s) + 8);
  }
}
