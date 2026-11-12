import Phaser from 'phaser';

/**
 * Pequeno "editor de pixels": desenha em baixa resolução (um pixel lógico por vez) e
 * depois amplia sem suavizar, para as artes geradas por código ficarem com o mesmo
 * pixel grosso, contorno escuro e sombreamento em degraus do resto do jogo.
 */
export class Px {
  readonly data: Int32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Int32Array(w * h).fill(-1);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.data[y * this.w + x];
  }

  set(x: number, y: number, c: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Disco "pixelado" (círculo de raio inteiro, sem serrilhado suave). */
  disc(cx: number, cy: number, r: number, c: number): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
  }

  /** Só pinta onde já existe algo (para sombras e brilhos dentro de uma forma). */
  paintIf(x: number, y: number, c: number): void {
    if (this.get(x, y) !== -1) this.set(x, y, c);
  }

  /** Contorno de 1 pixel em volta de tudo que foi desenhado. */
  outline(ink: number, diagonal = false): void {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== -1) continue;
        const n =
          this.get(x - 1, y) !== -1 ||
          this.get(x + 1, y) !== -1 ||
          this.get(x, y - 1) !== -1 ||
          this.get(x, y + 1) !== -1 ||
          (diagonal &&
            (this.get(x - 1, y - 1) !== -1 || this.get(x + 1, y - 1) !== -1 || this.get(x - 1, y + 1) !== -1 || this.get(x + 1, y + 1) !== -1));
        if (n) add.push(y * this.w + x);
      }
    for (const i of add) this.data[i] = ink;
  }

  /** Copia para um canvas real, ampliando cada pixel em `s`×`s`. */
  draw(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if (c === -1) continue;
        ctx.fillStyle = `#${c.toString(16).padStart(6, '0')}`;
        ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
  }

  /** Vira textura do Phaser (ampliada em `s`). */
  toTexture(scene: Phaser.Scene, key: string, s: number): void {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, this.w * s, this.h * s)!;
    this.draw(tex.getContext(), 0, 0, s);
    tex.refresh();
  }
}

/** Várias imagens do mesmo tamanho lado a lado, viram uma folha com quadros 0..n-1. */
export function sheetTexture(scene: Phaser.Scene, key: string, frames: Px[], s: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const fw = frames[0].w * s;
  const fh = frames[0].h * s;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  const ctx = tex.getContext();
  frames.forEach((f, i) => {
    f.draw(ctx, i * fw, 0, s);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

/** Gerador pseudoaleatório com semente (a arte sai sempre igual). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído suave 1D (valor interpolado), bom para cristas de montanha. */
export function noise1(seed: number, period: number): (x: number) => number {
  const r = rng(seed);
  const pts: number[] = [];
  for (let i = 0; i < 512; i++) pts.push(r());
  return (x: number) => {
    const p = x / period;
    const i = Math.floor(p);
    const f = p - i;
    const a = pts[((i % 512) + 512) % 512];
    const b = pts[(((i + 1) % 512) + 512) % 512];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

/** Xadrez para transições em degrau (dithering). */
export const checker = (x: number, y: number): boolean => ((x + y) & 1) === 0;

// ------------------------------------------------------------------
// Vulcão (fase e mapa)
// ------------------------------------------------------------------

/** Paleta de rocha vulcânica: da face iluminada (esquerda) à sombra (direita). */
const ROCK = [0x8a4a3a, 0x6b3830, 0x522a28, 0x3e1f22, 0x2c151a];
const LAVA = { hot: 0xfff1a8, yellow: 0xffd36b, orange: 0xff9a2a, red: 0xe8501f, dark: 0xb8321a, crust: 0x7a1e16 };

interface ConeOpts {
  cx: number;
  peak: number;
  base: number;
  half: number;
  crater: number;
  seed: number;
  palette?: number[];
  rivers?: number;
  ink?: number;
}

/**
 * Cone vulcânico em pixel art: bordas irregulares, faces com sombreamento em degraus
 * (com xadrez na transição), estratos de rocha, pedrinhas iluminadas, cratera acesa
 * e rios de lava escorrendo em zigue-zague.
 */
export function drawCone(px: Px, o: ConeOpts): void {
  const pal = o.palette ?? ROCK;
  const r = rng(o.seed);
  const edgeL = noise1(o.seed + 1, 5);
  const edgeR = noise1(o.seed + 2, 5);
  const halfAt = (y: number) => {
    const t = (y - o.peak) / (o.base - o.peak);
    return o.crater / 2 + Math.pow(t, 0.85) * (o.half - o.crater / 2);
  };
  // Silhueta e sombreamento.
  for (let y = o.peak; y <= o.base; y++) {
    const hw = halfAt(y);
    const l = Math.round(o.cx - hw - edgeL(y) * 4);
    const rr = Math.round(o.cx + hw + edgeR(y) * 4);
    for (let x = l; x <= rr; x++) {
      const u = (x - o.cx) / Math.max(1, hw);
      // Luz vem da esquerda e de cima.
      let k = u < -0.6 ? 0 : u < -0.15 ? 1 : u < 0.35 ? 2 : u < 0.75 ? 3 : 4;
      // Transição em xadrez entre faixas.
      const edges = [-0.6, -0.15, 0.35, 0.75];
      for (const e of edges) if (Math.abs(u - e) < 2 / Math.max(1, hw) && checker(x, y)) k = Math.min(pal.length - 1, k + (u < e ? 1 : 0));
      px.set(x, y, pal[Math.min(pal.length - 1, k)]);
    }
  }
  // Estratos: rachaduras horizontais escuras com brilho logo abaixo.
  for (let y = o.peak + 6; y < o.base - 2; y += 5 + Math.floor(r() * 4)) {
    const hw = halfAt(y);
    let x = Math.round(o.cx - hw + 2 + r() * 4);
    while (x < o.cx + hw - 2) {
      const len = 2 + Math.floor(r() * 6);
      for (let i = 0; i < len; i++) {
        px.paintIf(x + i, y, pal[pal.length - 1]);
        if (r() < 0.6) px.paintIf(x + i, y + 1, pal[Math.max(0, Math.round(((x + i - (o.cx - hw)) / (2 * hw)) * (pal.length - 1)) - 1)]);
      }
      x += len + 2 + Math.floor(r() * 7);
    }
  }
  // Pedrinhas soltas iluminadas.
  for (let i = 0; i < (o.half * (o.base - o.peak)) / 60; i++) {
    const y = Math.round(o.peak + 4 + r() * (o.base - o.peak - 6));
    const hw = halfAt(y);
    const x = Math.round(o.cx - hw * 0.9 + r() * hw * 1.6);
    px.paintIf(x, y, pal[0]);
    px.paintIf(x + 1, y + 1, pal[pal.length - 1]);
  }
  // Rios de lava: saem da cratera e descem serpenteando.
  const rivers = o.rivers ?? 2;
  for (let k = 0; k < rivers; k++) {
    let x = o.cx + (k === 0 ? -o.crater / 4 : k === 1 ? o.crater / 4 : 0) + Math.round((r() - 0.5) * 2);
    const dir = k === 0 ? -1 : k === 1 ? 1 : r() < 0.5 ? -1 : 1;
    const stop = o.peak + (o.base - o.peak) * (0.55 + r() * 0.4);
    for (let y = o.peak + 1; y < stop; y++) {
      if (r() < 0.45) x += dir * (r() < 0.75 ? 1 : 0);
      if (r() < 0.1) x -= dir;
      const t = (y - o.peak) / (o.base - o.peak);
      const w = 1 + Math.round(t * 2);
      for (let i = -w; i <= w; i++) {
        const c = i === 0 ? LAVA.yellow : Math.abs(i) === w ? LAVA.dark : LAVA.orange;
        px.paintIf(Math.round(x) + i, y, c);
      }
      if (t < 0.25) px.paintIf(Math.round(x), y, LAVA.hot);
    }
    // Pocinha onde o rio esfria.
    const yy = Math.round(stop);
    for (let i = -3; i <= 3; i++) px.paintIf(Math.round(x) + i, yy, Math.abs(i) > 2 ? LAVA.crust : LAVA.dark);
  }
  // Cratera: boca escura com lava borbulhando.
  const cw = Math.round(o.crater / 2);
  for (let i = -cw; i <= cw; i++) {
    px.set(o.cx + i, o.peak - 1, Math.abs(i) >= cw - 1 ? pal[3] : LAVA.red);
    px.set(o.cx + i, o.peak, Math.abs(i) >= cw - 1 ? pal[2] : Math.abs(i) < cw / 2 ? LAVA.hot : LAVA.yellow);
    px.set(o.cx + i, o.peak + 1, Math.abs(i) >= cw ? pal[2] : LAVA.orange);
  }
  // Bordas da cratera (lábios de rocha).
  px.rect(o.cx - cw - 2, o.peak - 1, 2, 2, pal[1]);
  px.rect(o.cx + cw + 1, o.peak - 1, 2, 2, pal[3]);
  if (o.ink !== undefined) px.outline(o.ink);
}

/** Brilho da cratera: anéis em xadrez só sobre o céu (pixels vazios ou de céu). */
function craterGlow(px: Px, cx: number, cy: number, r: number, isSky: (c: number) => boolean): void {
  for (let y = cy - r; y <= cy + 2; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot((x - cx) * 0.8, (y - cy) * 1.3);
      if (d > r) continue;
      const c = px.get(x, y);
      if (!isSky(c)) continue;
      if (d < r * 0.35) px.set(x, y, d < r * 0.22 ? 0xff7a1a : checker(x, y) ? 0xff7a1a : 0xd65a22);
      else if (d < r * 0.6) px.set(x, y, checker(x, y) ? 0xd65a22 : 0xb9421f);
      else if (d < r * 0.85 && checker(x, y)) px.set(x, y, 0x962e1f);
    }
}

/** Fundo da fase do vulcão (pixel 3×): céu em faixas, cordilheira, dois vulcões e rochedos. */
export function makeVolcanoBackdrop(scene: Phaser.Scene, key: string, width: number, height: number): { craters: Array<[number, number]> } {
  const S = 3;
  const lw = Math.ceil(width / S);
  const lh = Math.ceil(height / S);
  const px = new Px(lw, lh);
  const horizon = Math.round(520 / S);
  // Céu em faixas com transição em xadrez.
  const sky = [0x1c0814, 0x260a17, 0x340d1a, 0x46121d, 0x5e181f, 0x7a2120, 0x972d1f, 0xb53d1f, 0xd2521f];
  const skySet = new Set(sky.concat([0xff7a1a, 0xd65a22, 0xb9421f, 0x962e1f, 0x6a5058]));
  const bandH = horizon / sky.length;
  for (let y = 0; y < lh; y++) {
    const f = y / bandH;
    let i = Math.min(sky.length - 1, Math.floor(f));
    const frac = f - Math.floor(f);
    for (let x = 0; x < lw; x++) {
      let k = i;
      if (frac > 0.75 && checker(x, y) && i < sky.length - 1) k = i + 1;
      px.set(x, y, sky[k]);
    }
  }
  // Pontinhos de cinza/estrelas apagadas no alto.
  const r = rng(77);
  for (let i = 0; i < 70; i++) px.set(Math.floor(r() * lw), Math.floor(r() * horizon * 0.5), r() < 0.3 ? 0x6a5058 : 0x4a2a34);

  // Cordilheira distante (sem contorno, cor de névoa).
  const far = noise1(5, 22);
  const far2 = noise1(6, 7);
  for (let x = 0; x < lw; x++) {
    const top = Math.round(horizon - 26 - far(x) * 22 - far2(x) * 6);
    for (let y = top; y < lh; y++) px.set(x, y, y === top ? 0x5a2230 : y < top + 3 && checker(x, y) ? 0x5a2230 : 0x42182a);
  }

  // Vulcão pequeno à esquerda (mais distante) e o grande ao centro-direita.
  const small = { cx: Math.round(lw * 0.17), peak: horizon - 78, base: horizon + 4, half: 70, crater: 14 };
  const big = { cx: Math.round(lw * 0.66), peak: horizon - 122, base: horizon + 6, half: 132, crater: 22 };
  craterGlow(px, small.cx, small.peak, 18, (c) => skySet.has(c));
  craterGlow(px, big.cx, big.peak, 30, (c) => skySet.has(c));
  const sub = new Px(lw, lh);
  drawCone(sub, { ...small, seed: 11, palette: [0x6a3434, 0x55292c, 0x452226, 0x371b20, 0x2a141a], rivers: 2, ink: 0x1f0a10 });
  drawCone(sub, { ...big, seed: 23, rivers: 3, ink: 0x1f0a10 });
  for (let i = 0; i < sub.data.length; i++) if (sub.data[i] !== -1) px.data[i] = sub.data[i];

  // Rochedos de basalto na frente, com topo iluminado e contorno.
  const fg = new Px(lw, lh);
  const ridge = noise1(9, 9);
  const spikes = rng(31);
  for (let x = 0; x < lw; x++) {
    let top = Math.round(horizon - 8 - ridge(x) * 12);
    if (spikes() < 0.04) top -= 6 + Math.floor(spikes() * 10);
    for (let y = top; y < lh; y++) {
      const c = y === top ? 0x5c2a2a : y === top + 1 && checker(x, y) ? 0x5c2a2a : y > horizon + 2 ? 0x2a1016 : 0x3a171c;
      fg.set(x, y, c);
    }
  }
  // Colunas de basalto (pilares) aqui e ali.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(spikes() * lw);
    const h = 10 + Math.floor(spikes() * 18);
    const w = 3 + Math.floor(spikes() * 3);
    for (let y = horizon - 8 - h; y < horizon; y++)
      for (let j = 0; j < w; j++) fg.set(x + j, y, j === 0 ? 0x5c2a2a : j === w - 1 ? 0x24101a : 0x3a171c);
  }
  fg.outline(0x1d1a2b);
  for (let i = 0; i < fg.data.length; i++) if (fg.data[i] !== -1) px.data[i] = fg.data[i];
  // Reflexo da lava no pé dos rochedos.
  for (let x = 0; x < lw; x++)
    for (let y = horizon - 3; y <= horizon + 2; y++) if (checker(x, y) && px.get(x, y) === 0x2a1016) px.set(x, y, 0x7a1e16);

  px.toTexture(scene, key, S);
  return { craters: [[small.cx * S + 1, small.peak * S - 4], [big.cx * S + 1, big.peak * S - 4]] };
}

/** Vulcão do mapa-múndi (pixel 3×), com contorno escuro como o resto do mapa. */
export function makeMapVolcano(scene: Phaser.Scene, key: string): void {
  const px = new Px(56, 42);
  drawCone(px, { cx: 28, peak: 5, base: 40, half: 26, crater: 10, seed: 4, rivers: 2, ink: 0x1d1a2b });
  px.toTexture(scene, key, 3);
}

/** Fumaça em pixel art: nuvenzinha de cinza com luz no alto e contorno (3 tamanhos). */
export function makeSmoke(scene: Phaser.Scene): void {
  const variants: Array<[string, number, number, Array<[number, number, number]>]> = [
    ['vsmoke_0', 22, 18, [[7, 10, 5], [13, 8, 6], [16, 12, 4], [10, 13, 4]]],
    ['vsmoke_1', 16, 14, [[6, 8, 4], [10, 6, 4], [11, 9, 3]]],
    ['vsmoke_2', 10, 9, [[4, 5, 3], [6, 4, 2]]],
  ];
  for (const [key, w, h, discs] of variants) {
    const px = new Px(w, h);
    for (const [x, y, r] of discs) px.disc(x, y, r, 0x8a7880);
    // Sombra embaixo/direita, brilho em cima/esquerda (em degraus).
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (px.get(x, y) === -1) continue;
        const below = px.get(x, y + 2) === -1 || px.get(x + 2, y) === -1;
        const above = px.get(x, y - 2) === -1 || px.get(x - 2, y) === -1;
        if (below) px.set(x, y, 0x5e4c56);
        else if (above) px.set(x, y, checker(x, y) ? 0xb4a4a8 : 0xa09096);
      }
    px.outline(0x2e2028);
    px.toTexture(scene, key, 3);
  }
}

// ------------------------------------------------------------------
// Lava animada
// ------------------------------------------------------------------

/** Superfície da lava (pixel 2×, emendável): crista clara ondulada e casca escura. */
export function makeLavaTextures(scene: Phaser.Scene): void {
  const TW = 64;
  // Topo com ondinhas.
  const top = new Px(TW, 16);
  for (let x = 0; x < TW; x++) {
    const crest = 4 + Math.round(Math.sin((x / TW) * Math.PI * 4) * 1.6 + Math.sin((x / TW) * Math.PI * 2) * 0.8);
    top.set(x, crest - 1, 0x5a1a14);
    for (let y = crest; y < 16; y++) {
      const d = y - crest;
      const c = d === 0 ? LAVA.hot : d === 1 ? LAVA.yellow : d === 2 ? (checker(x, y) ? LAVA.yellow : LAVA.orange) : d < 5 ? LAVA.orange : d < 7 && checker(x, y) ? LAVA.orange : LAVA.red;
      top.set(x, y, c);
    }
  }
  top.toTexture(scene, 'lava_top', 2);

  // Corpo da lava: veios escuros (casca esfriando) e veios quentes, emendável nos 4 lados.
  const BW = 64;
  const BH = 48;
  const body = new Px(BW, BH);
  const r = rng(91);
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < 14; i++) cells.push([r() * BW, r() * BH]);
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      // Distância às duas células mais próximas (com repetição nas bordas).
      let d1 = 1e9;
      let d2 = 1e9;
      for (const [cx, cy] of cells)
        for (const ox of [-BW, 0, BW])
          for (const oy of [-BH, 0, BH]) {
            const d = Math.hypot(x - cx - ox, (y - cy - oy) * 1.6);
            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) d2 = d;
          }
      const edge = d2 - d1;
      let c = LAVA.red;
      if (edge < 0.9) c = LAVA.orange;
      else if (edge < 1.8 && checker(x, y)) c = LAVA.orange;
      else if (d1 < 2.2) c = LAVA.dark;
      else if (d1 < 3.6 && checker(x, y)) c = LAVA.dark;
      body.set(x, y, c);
    }
  body.toTexture(scene, 'lava_body', 2);

  // Bolha que cresce e estoura (6 quadros, pixel 2×).
  const frames: Px[] = [];
  const radii = [1, 2, 3, 4];
  for (const rad of radii) {
    const f = new Px(14, 10);
    for (let y = -rad; y <= 0; y++)
      for (let x = -rad - 1; x <= rad + 1; x++) if ((x * x) / ((rad + 1) * (rad + 1)) + (y * y) / (rad * rad) <= 1) f.set(7 + x, 8 + y, LAVA.orange);
    f.set(7 - Math.max(1, rad - 1), 8 - rad + 1, LAVA.hot);
    if (rad > 1) f.set(7 - rad + 1, 8 - rad + 2, LAVA.yellow);
    f.outline(LAVA.dark);
    frames.push(f);
  }
  // Estouro: anel quebrado e gotinhas.
  const pop = new Px(14, 10);
  for (const [x, y] of [[2, 7], [3, 5], [5, 4], [9, 4], [11, 5], [12, 7]]) pop.set(x, y, LAVA.yellow);
  for (const [x, y] of [[1, 3], [7, 1], [13, 2]]) pop.set(x, y, LAVA.hot);
  pop.rect(5, 8, 5, 1, LAVA.orange);
  frames.push(pop);
  const drops = new Px(14, 10);
  for (const [x, y] of [[0, 2], [7, 0], [13, 1]]) drops.set(x, y, LAVA.orange);
  drops.rect(6, 8, 3, 1, LAVA.dark);
  frames.push(drops);
  sheetTexture(scene, 'lava_bubble', frames, 2);
}

// ------------------------------------------------------------------
// Tocha (item do Goblin da Tocha)
// ------------------------------------------------------------------

/**
 * Tocha em pixel art: cabo de madeira com veio, faixas de couro, cesto de ferro com
 * rebites e chama em 4 quadros (tremulando). 'torch_item' é o quadro parado;
 * 'torch_item_anim' é a folha da chama.
 */
export function makeTorch(scene: Phaser.Scene): void {
  const INK = 0x1d1a2b;
  const frames: Px[] = [];
  // Formato da chama: meia-largura por linha (de cima para baixo) em cada quadro, e o balanço.
  const shapes: Array<{ rows: number[]; sway: number[] }> = [
    { rows: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 4], sway: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { rows: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 4], sway: [-1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { rows: [0, 1, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 4], sway: [-1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { rows: [1, 1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 4], sway: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];
  for (const shape of shapes) {
    const p = new Px(32, 32);
    const cx = 15;
    // Cabo (madeira com luz à esquerda e veio).
    for (let y = 16; y < 30; y++) {
      p.set(cx - 1, y, 0xb07a48);
      p.set(cx, y, 0x8a5a35);
      p.set(cx + 1, y, 0x5e3a22);
    }
    p.set(cx, 20, 0x5e3a22);
    p.set(cx, 25, 0x5e3a22);
    // Faixas de couro.
    for (const y of [18, 23]) p.rect(cx - 1, y, 3, 1, 0x6b3f2a);
    p.set(cx - 1, 28, 0x6b3f2a);
    // Ponta do cabo.
    p.rect(cx - 1, 30, 3, 1, 0x4a2c1a);
    // Cesto de ferro.
    p.rect(cx - 3, 13, 7, 3, 0x6c7385);
    p.rect(cx - 2, 16, 5, 1, 0x4c5262);
    p.rect(cx - 3, 13, 7, 1, 0x9aa3b5);
    p.set(cx - 2, 14, 0xc8d0dc);
    p.set(cx + 2, 14, 0x3a3f4c);
    p.set(cx, 15, 0x3a3f4c);
    // Chama.
    const rows = shape.rows;
    const top = 13 - rows.length;
    rows.forEach((hw, i) => {
      const y = top + i;
      const sx = cx + shape.sway[i];
      for (let x = -hw; x <= hw; x++) {
        const a = Math.abs(x);
        const inner = hw - a;
        const deep = i / rows.length;
        let c = 0xe8501f;
        if (inner >= 1) c = 0xff9f1c;
        if (inner >= 2 && deep > 0.35) c = 0xffe066;
        if (inner >= 3 && deep > 0.55) c = 0xfff7d6;
        p.set(sx + x, y, c);
      }
    });
    p.outline(INK);
    frames.push(p);
  }
  // Fagulhas soltas (fora do contorno), diferentes por quadro.
  const sparks: Array<Array<[number, number]>> = [[[19, 2]], [[11, 3], [20, 6]], [[18, 1]], [[12, 0], [10, 5]]];
  frames.forEach((f, i) => sparks[i].forEach(([x, y]) => f.set(x, y, 0xffd36b)));
  frames[0].toTexture(scene, 'torch_item', 2);
  sheetTexture(scene, 'torch_item_anim', frames, 2);
  if (!scene.anims.exists('torch_flame'))
    scene.anims.create({
      key: 'torch_flame',
      frames: [0, 1, 2, 3].map((frame) => ({ key: 'torch_item_anim', frame })),
      frameRate: 9,
      repeat: -1,
    });
}

// ------------------------------------------------------------------
// Casulo de teia (morcego enrolado pela aranha)
// ------------------------------------------------------------------

/** Bola de teia em pixel art: oval branco com voltas de fio cinza e contorno escuro. */
export function makeCocoon(scene: Phaser.Scene): void {
  const p = new Px(22, 28);
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 22; x++) {
      const dx = (x - 10.5) / 10;
      const dy = (y - 14) / 13;
      if (dx * dx + dy * dy <= 1) p.set(x, y, 0xeef6f8);
    }
  // Sombra à direita/embaixo e brilho à esquerda.
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 22; x++) {
      if (p.get(x, y) === -1) continue;
      if (p.get(x + 2, y) === -1 || p.get(x, y + 2) === -1) p.set(x, y, checker(x, y) ? 0xb9c6cc : 0xcfdbe0);
      else if (p.get(x - 2, y) === -1 && y < 16) p.set(x, y, 0xffffff);
    }
  // Voltas de fio em diagonal.
  for (let k = -24; k < 30; k += 5)
    for (let x = 0; x < 22; x++) {
      const y = k + Math.round(x * 0.5);
      if (p.get(x, y) !== -1) p.set(x, y, 0x9aa8b0);
    }
  for (let k = 4; k < 50; k += 9)
    for (let x = 0; x < 22; x++) {
      const y = k - Math.round(x * 0.7);
      if (p.get(x, y) !== -1 && checker(x, y)) p.set(x, y, 0xb9c6cc);
    }
  p.outline(0x1d1a2b);
  // Fiapos soltos em cima e embaixo.
  p.set(10, 0, 0xeef6f8);
  p.set(11, 27, 0xeef6f8);
  p.toTexture(scene, 'cocoon', 2);
}

// ------------------------------------------------------------------
// Casas assombradas (fases 6-8)
// ------------------------------------------------------------------

const HINK = 0x1d1a2b;

/** Tijolos de pedra arroxeada (com rejunte e luz em cima de cada tijolo). */
function bricks(px: Px, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 8);
      const off = row % 2 ? 8 : 0;
      const bx = (x - x0 + off) % 16;
      const by = (y - y0) % 8;
      let c = 0x4a4060;
      if (by === 7 || bx === 15) c = 0x2a2238;
      else if (by === 0) c = 0x5e5478;
      else if ((bx + by * 3 + row * 5) % 11 === 0) c = 0x423858;
      px.set(x, y, c);
    }
}

/** Tábuas de madeira escura (piso do casarão). */
function planks(px: Px, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const seam = (x - x0 + (y - y0 > 2 ? 5 : 0)) % 12 === 0;
      let c = y === y0 ? 0x9a7050 : y === y0 + h - 1 ? 0x3a2418 : 0x6b4a3a;
      if (seam && y > y0) c = 0x3a2418;
      if (y === y0 + 1 && !seam) c = 0x7e5a44;
      px.set(x, y, c);
    }
}

export function makeHauntArt(scene: Phaser.Scene): void {
  // Piso: tábuas em cima, tijolos embaixo (tile 64x64).
  const top = new Px(32, 32);
  planks(top, 0, 0, 32, 6);
  bricks(top, 0, 6, 32, 26);
  top.toTexture(scene, 'hfloor_top', 2);
  const body = new Px(32, 32);
  bricks(body, 0, 0, 32, 32);
  body.toTexture(scene, 'hfloor_body', 2);
  // Piso que desaba: igualzinho, só com rachaduras finas (quem olha com atenção percebe).
  const crack = new Px(32, 32);
  planks(crack, 0, 0, 32, 6);
  bricks(crack, 0, 6, 32, 26);
  for (const [x, y] of [[9, 1], [10, 2], [10, 3], [11, 4], [22, 2], [21, 3], [21, 4], [12, 8], [13, 9], [13, 10], [20, 12], [19, 13]]) crack.set(x, y, 0x1a1020);
  crack.toTexture(scene, 'hfloor_crack', 2);
  // Prateleira flutuante (tábua com mãos-francesas).
  const shelf = new Px(32, 12);
  planks(shelf, 0, 0, 32, 5);
  for (const bx of [4, 26]) for (let k = 0; k < 6; k++) shelf.set(bx + Math.min(k, 2) - 1, 5 + k, 0x3a2418), shelf.set(bx + Math.min(k, 2), 5 + k, 0x5a3826);
  shelf.outline(HINK);
  shelf.toTexture(scene, 'hplank', 2);
  // Ponte-fantasma: ligada (brilho lilás) e desligada (só o contorno tracejado).
  const gon = new Px(32, 8);
  for (let y = 1; y < 7; y++) for (let x = 0; x < 32; x++) gon.set(x, y, y === 1 ? 0xffffff : y < 3 ? 0xe2d6ff : checker(x, y) ? 0xb9a6ff : 0x9d86f0);
  for (let x = 0; x < 32; x += 6) gon.set(x, 4, 0xffffff);
  gon.toTexture(scene, 'gplank_on', 2);
  const goff = new Px(32, 8);
  for (let x = 0; x < 32; x++) if (x % 4 < 2) goff.set(x, 1, 0x8a7ad0), goff.set(x, 6, 0x8a7ad0);
  goff.toTexture(scene, 'gplank_off', 2);

  // Porta: arco de pedra, tábuas, faixas de ferro e maçaneta. Saída com moldura dourada.
  const door = (gold: boolean, open: boolean) => {
    const p = new Px(24, 38);
    for (let y = 0; y < 38; y++)
      for (let x = 0; x < 24; x++) {
        const dx = x - 11.5;
        const inArch = y >= 8 || dx * dx + (y - 8) * (y - 8) * 1.4 <= 132;
        if (!inArch) continue;
        const inner = (y >= 10 || dx * dx + (y - 9) * (y - 9) * 1.6 <= 72) && x >= 3 && x <= 20 && y >= 3;
        if (!inner) p.set(x, y, gold ? (x + y) % 5 === 0 ? 0xffe066 : 0xd8a530 : (x + y) % 6 === 0 ? 0x6e6488 : 0x5c5276);
        else if (open) p.set(x, y, y > 30 ? 0xfff1a8 : checker(x, y) ? 0xffe9a0 : 0xfff7dc);
        else {
          const seam = (x - 3) % 5 === 0;
          p.set(x, y, seam ? 0x3a2418 : x % 5 === 1 ? 0x7a5236 : 0x5a3826);
        }
      }
    if (!open) {
      for (const y of [14, 28]) for (let x = 3; x <= 20; x++) p.set(x, y, 0x3a3f4c);
      p.rect(16, 21, 2, 2, 0xd8a530);
      p.set(16, 21, 0xffe066);
      if (gold) {
        // Janelinha com luz esverdeada (é a saída).
        p.rect(9, 6, 6, 4, 0x9dffb0);
        p.rect(10, 7, 4, 2, 0xe8fff0);
      }
    }
    p.outline(HINK);
    return p;
  };
  door(false, false).toTexture(scene, 'door', 3);
  door(true, false).toTexture(scene, 'door_exit', 3);
  door(true, true).toTexture(scene, 'door_open', 3);

  // Símbolos das plaquinhas das portas.
  const sym = (key: string, draw: (p: Px) => void) => {
    const p = new Px(11, 11);
    draw(p);
    p.outline(HINK);
    p.toTexture(scene, key, 3);
  };
  const moon = (c: number, c2: number) => (p: Px) => {
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 11; x++) {
        const a = (x - 5) ** 2 + (y - 5) ** 2 <= 20;
        const b = (x - 7.5) ** 2 + (y - 3.5) ** 2 <= 16;
        if (a && !b) p.set(x, y, x < 4 ? c2 : c);
      }
  };
  sym('sym_moon', moon(0xf4f0d0, 0xffffff));
  sym('sym_redmoon', moon(0xe04848, 0xff8a7a));
  sym('sym_sun', (p) => {
    p.disc(5, 5, 3, 0xffd36b);
    p.set(4, 4, 0xfff1a8);
    for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [1, 1], [9, 1], [1, 9], [9, 9]]) p.set(x, y, 0xffb347);
  });
  sym('sym_star', (p) => {
    const pts = [[5, 0], [5, 1], [4, 2], [5, 2], [6, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [3, 6], [4, 6], [6, 6], [7, 6], [2, 7], [3, 7], [7, 7], [8, 7], [2, 8], [8, 8]];
    for (const [x, y] of pts) p.set(x, y + 1, y < 4 ? 0xfff1a8 : 0xffd36b);
  });
  sym('sym_skull', (p) => {
    p.disc(5, 4, 3, 0xeee3c8);
    p.rect(3, 7, 5, 2, 0xeee3c8);
    p.set(4, 4, HINK);
    p.set(6, 4, HINK);
    p.set(5, 6, 0x8a7a66);
  });

  // Chave dourada.
  const key = new Px(18, 9);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) if ((x - 3) ** 2 + (y - 4) ** 2 <= 10 && (x - 3) ** 2 + (y - 4) ** 2 > 2) key.set(x, y, y < 4 ? 0xffe066 : 0xd8a530);
  key.rect(7, 3, 10, 2, 0xd8a530);
  key.rect(7, 3, 10, 1, 0xffe066);
  key.rect(13, 5, 2, 2, 0xd8a530);
  key.rect(16, 5, 1, 3, 0xd8a530);
  key.outline(HINK);
  key.toTexture(scene, 'key_item', 3);

  // Alavanca: base de pedra e haste com bola vermelha (desligada inclinada à esquerda).
  const lever = (on: boolean) => {
    const p = new Px(14, 16);
    p.rect(2, 12, 10, 4, 0x5c5276);
    p.rect(2, 12, 10, 1, 0x6e6488);
    for (let k = 0; k < 9; k++) p.set(7 + (on ? 1 : -1) * Math.floor(k / 2), 11 - k, 0x8a95a3);
    const tipX = 7 + (on ? 1 : -1) * 4;
    p.disc(tipX, 2, 2, on ? 0x58b947 : 0xe04848);
    p.set(tipX - 1, 1, 0xffffff);
    p.outline(HINK);
    return p;
  };
  lever(false).toTexture(scene, 'lever_off', 3);
  lever(true).toTexture(scene, 'lever_on', 3);

  // Velas: pequena (castiçal) e grande (candelabro de 3 velas). Quadro 0 apagada, 1-3 acesas.
  const flameAt = (p: Px, cx: number, top: number, f: number) => {
    const shapes = [[0, 1, 1, 2, 2, 2, 1], [1, 1, 2, 2, 2, 1], [0, 1, 1, 1, 2, 2, 1]];
    const sway = [[0, 0, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0], [-1, 0, 0, 0, 0, 0, 0]];
    const rows = shapes[f];
    rows.forEach((hw, i) => {
      for (let x = -hw; x <= hw; x++) {
        const inner = hw - Math.abs(x);
        const c = inner >= 2 ? 0xfff7d6 : inner >= 1 ? 0xffe066 : 0xff9f1c;
        p.set(cx + x + sway[f][i], top + i - rows.length + 1, c);
      }
    });
  };
  const candleFrames = (big: boolean): Px[] => {
    const out: Px[] = [];
    for (let f = 0; f < 4; f++) {
      const p = new Px(big ? 26 : 12, big ? 34 : 24);
      const stick = (cx: number, top: number, h: number) => {
        p.rect(cx - 1, top, 3, h, 0xf2e8d0);
        p.set(cx - 1, top, 0xffffff);
        p.rect(cx + 1, top + 1, 1, h - 1, 0xc8b89a);
        p.set(cx, top - 1, 0x3a2418);
        if (f > 0) flameAt(p, cx, top - 2, f - 1);
      };
      if (big) {
        p.rect(4, 30, 18, 3, 0xd8a530);
        p.rect(12, 18, 2, 12, 0xd8a530);
        p.rect(4, 17, 18, 2, 0xd8a530);
        p.rect(4, 15, 2, 2, 0xd8a530);
        p.rect(20, 15, 2, 2, 0xd8a530);
        p.rect(11, 14, 4, 2, 0xd8a530);
        stick(5, 9, 6);
        stick(21, 9, 6);
        stick(13, 6, 8);
      } else {
        p.rect(2, 20, 8, 3, 0xd8a530);
        p.rect(5, 18, 2, 2, 0xd8a530);
        stick(6, 10, 8);
      }
      p.outline(HINK);
      out.push(p);
    }
    return out;
  };
  sheetTexture(scene, 'candle', candleFrames(false), 3);
  sheetTexture(scene, 'candelabra', candleFrames(true), 3);
  for (const k of ['candle', 'candelabra'])
    if (!scene.anims.exists(`${k}_lit`))
      scene.anims.create({ key: `${k}_lit`, frames: [1, 2, 3, 2].map((frame) => ({ key: k, frame })), frameRate: 8, repeat: -1 });

  // Luz em degraus (anéis de alpha), para "apagar" a escuridão em volta de quem ilumina.
  if (scene.textures.exists('light_px')) scene.textures.remove('light_px');
  const lt = scene.textures.createCanvas('light_px', 128, 128)!;
  const lc = lt.getContext();
  for (const [r, a] of [[64, 0.25], [54, 0.5], [44, 0.75], [34, 1]] as const) {
    lc.fillStyle = `rgba(255,255,255,${a})`;
    lc.beginPath();
    lc.arc(64, 64, r, 0, Math.PI * 2);
    lc.fill();
  }
  lt.refresh();
}

/**
 * Interior do casarão (pixel 3×): papel de parede listrado com arabescos, lambris de madeira,
 * janelas em arco com lua e céu noturno, cortinas rasgadas, quadros com olhos e teias.
 */
export function makeHauntBackdrop(scene: Phaser.Scene, key: string, width: number, height: number): void {
  const S = 3;
  const lw = Math.ceil(width / S);
  const lh = Math.ceil(height / S);
  const px = new Px(lw, lh);
  const floor = Math.round(520 / S);
  // Papel de parede.
  for (let y = 0; y < lh; y++)
    for (let x = 0; x < lw; x++) {
      const stripe = Math.floor(x / 10) % 2;
      let c = stripe ? 0x2c1c3c : 0x34224a;
      if (stripe && (x % 10 === 5) && (y % 14 === 3 || y % 14 === 4)) c = 0x452e5e;
      if (!stripe && (x % 10 === 5) && y % 14 === 10) c = 0x3e2954;
      px.set(x, y, c);
    }
  // Sombra no alto (teto escuro).
  for (let y = 0; y < 22; y++) for (let x = 0; x < lw; x++) if (y < 12 || checker(x, y)) px.set(x, y, y < 6 ? 0x150c1e : 0x1e1229);
  // Lambris de madeira na parte de baixo.
  const wain = floor - 46;
  for (let y = wain; y < lh; y++)
    for (let x = 0; x < lw; x++) {
      let c = 0x3e2a22;
      if (y === wain) c = 0x6b4a3a;
      else if (y === wain + 1) c = 0x24160f;
      else if (x % 28 === 0 || x % 28 === 27) c = 0x2a1a12;
      else if ((y - wain) % 40 === 6 || (y - wain) % 40 === 36) c = 0x2a1a12;
      else if (x % 28 === 1) c = 0x54392c;
      px.set(x, y, c);
    }
  // Janelas em arco com lua.
  const r = rng(13);
  const windows = [Math.round(lw * 0.18), Math.round(lw * 0.5), Math.round(lw * 0.82)];
  windows.forEach((wx, i) => {
    const ww = 34;
    const wt = 34;
    const wb = wain - 10;
    for (let y = wt - 18; y <= wb; y++)
      for (let x = wx - ww / 2; x <= wx + ww / 2; x++) {
        const dx = x - wx;
        const arch = y >= wt || dx * dx + (y - wt) * (y - wt) <= (ww / 2) ** 2;
        if (!arch) continue;
        const frame = Math.abs(dx) >= ww / 2 - 2 || y >= wb - 1 || (y < wt && dx * dx + (y - wt) * (y - wt) >= (ww / 2 - 2) ** 2);
        const bar = Math.abs(dx) <= 0 || y === wt + 14;
        let c = frame || bar ? 0x24160f : y < wt + 6 ? 0x1c2a52 : 0x22346a;
        if (!frame && !bar && r() < 0.02) c = 0xcfd8ff;
        px.set(x, y, c);
      }
    if (i === 1) {
      // Lua cheia atrás do vidro do meio.
      px.disc(wx + 8, wt + 4, 5, 0xf4f0d0);
      px.set(wx + 6, wt + 3, 0xd8d0b0);
      px.set(wx + 10, wt + 6, 0xd8d0b0);
    }
    // Cortinas rasgadas.
    for (const side of [-1, 1])
      for (let y = wt - 20; y < wb + 4; y++) {
        const wdt = 5 + Math.round(Math.sin(y / 5) * 1.5) + (y > wb - 10 ? -2 : 0);
        for (let k = 0; k < wdt; k++) {
          const x = wx + side * (ww / 2 + 1) - side * k + side * 3;
          if (y > wb - 4 && (x + y) % 3 === 0) continue;
          px.set(x, y, k === 0 ? 0x4a1020 : k < 2 ? 0x8a2034 : 0x6e1a2a);
        }
      }
  });
  // Quadros com olhos (entre as janelas).
  for (const qx of [Math.round(lw * 0.34), Math.round(lw * 0.66)]) {
    const qy = 46;
    for (let y = qy - 14; y <= qy + 14; y++)
      for (let x = qx - 10; x <= qx + 10; x++) {
        const edge = Math.abs(x - qx) >= 9 || Math.abs(y - qy) >= 13;
        px.set(x, y, edge ? ((x + y) % 4 === 0 ? 0xffe066 : 0xd8a530) : 0x1a1426);
      }
    px.disc(qx, qy - 1, 6, 0x2e2440);
    px.set(qx - 2, qy - 2, 0xff5c5c);
    px.set(qx + 2, qy - 2, 0xff5c5c);
  }
  // Teias nos cantos de cima.
  for (const [cx, dir] of [[0, 1], [lw - 1, -1]] as const)
    for (let k = 0; k < 18; k++) {
      px.set(cx + dir * k, 22 + Math.round(k * 0.2), 0x8a7ad0);
      px.set(cx + dir * Math.round(k * 0.6), 22 + k, 0x8a7ad0);
    }
  // Vazio escuro embaixo (o chão do casarão é feito de plataformas; entre elas, o breu).
  for (let y = floor - 4; y < lh; y++) for (let x = 0; x < lw; x++) if (y > floor || checker(x, y)) px.set(x, y, y > floor + 6 ? 0x07040c : 0x120a1a);
  px.toTexture(scene, key, S);
}

/** Casarão do mapa-múndi (pixel 3×): torre, telhado torto e janelas acesas. */
export function makeMapMansion(scene: Phaser.Scene, key: string): void {
  const p = new Px(60, 52);
  // Corpo.
  p.rect(6, 22, 40, 28, 0x4a4060);
  for (let y = 22; y < 50; y += 5) for (let x = 6; x < 46; x++) if ((x + (y % 10 ? 4 : 0)) % 9 === 0) p.set(x, y, 0x2a2238);
  // Telhado torto.
  for (let y = 10; y < 22; y++) for (let x = 2 + (22 - y); x < 50 - (22 - y) + 2; x++) p.set(x, y, y % 3 === 0 ? 0x2a1a3a : 0x3a2650);
  // Torre.
  p.rect(42, 12, 12, 38, 0x544a6e);
  for (let y = 0; y < 12; y++) for (let x = 48 - Math.floor(y / 2); x <= 48 + Math.floor(y / 2); x++) p.set(x, y, 0x2a1a3a);
  // Janelas acesas.
  for (const [x, y] of [[11, 28], [21, 28], [31, 28], [11, 38], [31, 38], [46, 20], [46, 32]]) {
    p.rect(x, y, 5, 6, 0xd8ff8a);
    p.rect(x, y, 5, 1, 0xf4ffd0);
    p.set(x + 2, y + 2, 0x2a2238);
  }
  // Porta.
  p.rect(20, 40, 8, 10, 0x3a2418);
  p.set(26, 45, 0xd8a530);
  p.outline(HINK);
  p.toTexture(scene, key, 3);
}

// ------------------------------------------------------------------
// Chefes: explosão em pixel, orbe de energia e bola de teia
// ------------------------------------------------------------------

/** Explosão 8-bit em 6 quadros (pixel 3×): núcleo branco, anel amarelo, laranja e fumaça. */
export function makeBossFx(scene: Phaser.Scene): void {
  const frames: Px[] = [];
  const steps: Array<[number, number, number]> = [
    [2, 0, 0],
    [4, 2, 0],
    [6, 4, 2],
    [8, 6, 4],
    [9, 8, 7],
    [10, 10, 9],
  ];
  steps.forEach(([outer, mid, inner], f) => {
    const p = new Px(22, 22);
    const c = 11;
    for (let y = 0; y < 22; y++)
      for (let x = 0; x < 22; x++) {
        const d = Math.hypot(x - c + 0.5, y - c + 0.5);
        if (d > outer) continue;
        let col = f < 4 ? 0xff7a1a : 0x5c4a52;
        if (d <= mid) col = f < 4 ? 0xffd36b : 0x7e6a70;
        if (d <= inner) col = f < 3 ? 0xfff7dc : -1;
        if (f >= 4 && (x + y) % 2 === 0 && d > mid) col = -1;
        if (col !== -1) p.set(x, y, col);
      }
    if (f < 4) p.outline(0x1d1a2b);
    frames.push(p);
  });
  sheetTexture(scene, 'boom', frames, 3);
  if (!scene.anims.exists('boom')) scene.anims.create({ key: 'boom', frames: [0, 1, 2, 3, 4, 5].map((frame) => ({ key: 'boom', frame })), frameRate: 18 });

  // Orbe de energia (anéis em degrau).
  const orb = new Px(12, 12);
  orb.disc(6, 6, 5, 0x7fd8ff);
  orb.disc(6, 6, 3, 0xd8f4ff);
  orb.disc(5, 5, 1, 0xffffff);
  orb.outline(0x1d1a2b);
  orb.toTexture(scene, 'orb', 3);

  // Bola de teia (cuspe da Aranha-Rainha).
  const web = new Px(14, 14);
  web.disc(7, 7, 6, 0xeef6f8);
  for (let k = -6; k <= 6; k++) {
    web.paintIf(7 + k, 7, 0xb9c6cc);
    web.paintIf(7, 7 + k, 0xb9c6cc);
    web.paintIf(7 + k, 7 + k, 0xcfdbe0);
  }
  web.outline(0x1d1a2b);
  web.toTexture(scene, 'web_ball', 3);

  // Coroa da Rainha-Aranha.
  const crown = new Px(16, 10);
  crown.rect(1, 5, 14, 5, 0xd8a530);
  for (const x of [1, 7, 13]) crown.rect(x, 1, 2, 4, 0xd8a530), crown.set(x, 0, 0xffe066);
  crown.rect(1, 5, 14, 1, 0xffe066);
  crown.set(4, 7, 0xd42a3c);
  crown.set(11, 7, 0xd42a3c);
  crown.set(8, 7, 0x7fd8ff);
  crown.outline(0x1d1a2b);
  crown.toTexture(scene, 'queen_crown', 3);
}
