import Phaser from 'phaser';

/** Copia uma folha de sprites para um canvas comum (para mexer nos pixels). */
function toCanvas(scene: Phaser.Scene, key: string): HTMLCanvasElement {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0);
  return c;
}

function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, frameWidth: number, frameHeight: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight });
}

const hex = (r: number, g: number, b: number) => ((r << 16) | (g << 8) | b) >>> 0;

/**
 * Troca de paleta feita à mão: cada cor original vira a cor escolhida (cores fora da tabela
 * ficam como estão). Mantém o pixel art intacto, sem tingir por cima.
 */
export function recolorSheet(
  scene: Phaser.Scene,
  src: string,
  dst: string,
  frameW: number,
  frameH: number,
  palette: Record<number, number>,
): void {
  const c = toCanvas(scene, src);
  const ctx = c.getContext('2d')!;
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const to = palette[hex(d[i], d[i + 1], d[i + 2])];
    if (to === undefined) continue;
    d[i] = (to >> 16) & 255;
    d[i + 1] = (to >> 8) & 255;
    d[i + 2] = to & 255;
  }
  ctx.putImageData(data, 0, 0);
  addSheet(scene, dst, c, frameW, frameH);
}

/**
 * Encolhe cada quadro da folha (vizinho mais próximo) em torno dos pés: o personagem fica
 * menor, os pés no mesmo lugar do quadro, e o tamanho do quadro não muda.
 */
export function shrinkSheet(scene: Phaser.Scene, key: string, frameW: number, frameH: number, k: number, feetY: number): void {
  const src = toCanvas(scene, key);
  const sctx = src.getContext('2d')!;
  const sd = sctx.getImageData(0, 0, src.width, src.height).data;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const octx = out.getContext('2d')!;
  const od = octx.createImageData(out.width, out.height);
  const frames = Math.floor(src.width / frameW);
  const cx = frameW / 2;
  for (let f = 0; f < frames; f++) {
    const ox = f * frameW;
    for (let y = 0; y < frameH; y++) {
      const sy = Math.round(feetY + (y - feetY) / k);
      if (sy < 0 || sy >= frameH) continue;
      for (let x = 0; x < frameW; x++) {
        const sx = Math.round(cx + (x - cx) / k);
        if (sx < 0 || sx >= frameW) continue;
        const si = (sy * src.width + ox + sx) * 4;
        const di = (y * out.width + ox + x) * 4;
        od.data[di] = sd[si];
        od.data[di + 1] = sd[si + 1];
        od.data[di + 2] = sd[si + 2];
        od.data[di + 3] = sd[si + 3];
      }
    }
  }
  octx.putImageData(od, 0, 0);
  addSheet(scene, key, out, frameW, frameH);
}

/** Paleta do chefe Minotauro Rubro (escolhida à mão a partir das 17 cores do original). */
export const MINO_BOSS_PALETTE: Record<number, number> = {
  0x161c2e: 0x1a0c10, // contorno: preto avermelhado
  0x78a7ab: 0xc8452e, // pelo claro: carmim
  0x789e9c: 0xa8321f, // pelo médio
  0xb8d2c3: 0xff8a4a, // brilho do pelo: laranja-brasa
  0x667279: 0x3a3440, // pedra do martelo: obsidiana
  0x576064: 0x2a2430,
  0x3e4151: 0x1e1820,
  0x435060: 0x2e2838,
  0x7a685d: 0x5a2a1a, // couro
  0x92806f: 0x7a3a22,
  0xcfbb85: 0xffd36b, // chifres: ouro
  0x9f976a: 0xd8a530,
  0xe9e5b2: 0xfff1a8,
  0xd3c08c: 0xffe066,
  0xac8aa0: 0xe05a6a, // focinho
  0xe1cbd1: 0xffb0b0,
  0xfff977: 0xff2d2d, // olhos: vermelho aceso
};

/** Paleta da chefe Aranha-Rainha (viúva-negra), escolhida à mão a partir das cores da aranha. */
export const SPIDER_QUEEN_PALETTE: Record<number, number> = {
  0x161c2e: 0x0a0608, // contorno
  0x764e7b: 0x2e2c3a, // corpo: preto lustroso
  0x4c375e: 0x18161f,
  0x2c283e: 0x0e0d14,
  0xb487a3: 0xd42a3c, // manchas: vermelho de viúva-negra
  0xdde678: 0xff2d2d, // olhos acesos
  0xbeb080: 0xc8b0ff, // presas: lilás pálido
};

/** Príncipe dos Morcegos: azul-meia-noite com detalhes dourados. */
export const BAT_PRINCE_PALETTE: Record<number, number> = {
  0x4d4162: 0x1e2a6a,
  0x71568d: 0x2f4fb8,
  0x5d657c: 0x2a2f55,
  0x8f9eae: 0x4a5590,
  0x464554: 0x1a1d3a,
  0xca8451: 0xffd36b,
  0x8d4848: 0xe04848,
  0xe4ee67: 0xffe066,
};
/** Rei dos Morcegos: preto e carmim. */
export const BAT_KING_PALETTE: Record<number, number> = {
  0x4d4162: 0x5a1020,
  0x71568d: 0xa01e30,
  0x5d657c: 0x2a2a30,
  0x8f9eae: 0x4a4a52,
  0x464554: 0x1a1a1e,
  0xca8451: 0xd8a530,
  0xe4ee67: 0xff2d2d,
};
/** Príncipe das Abelhas: azul-gelo e prata. */
export const BEE_PRINCE_PALETTE: Record<number, number> = {
  0xefe054: 0x8fd9ff,
  0xb28d5a: 0x2f86e0,
  0x9f866e: 0x1c4f8a,
  0x6c554b: 0x10223a,
  0xdad9bb: 0xf4fbff,
  0xc6b799: 0xbfe9ff,
};
/** Rei das Abelhas: magenta e ouro. */
export const BEE_KING_PALETTE: Record<number, number> = {
  0xefe054: 0xffd36b,
  0xb28d5a: 0xb0306a,
  0x9f866e: 0x7a1e4a,
  0x6c554b: 0x3a0a24,
  0xdad9bb: 0xfff1d8,
  0xc6b799: 0xffb0d0,
};

/**
 * Folha de NADO feita a partir de uma folha em pé (o Tubarão do pacote só existe andando):
 * 1) tira a sombra do chão (pixels translúcidos);
 * 2) deita o corpo 90° (cabeça para a frente, barriga para baixo) e o alonga um pouco;
 * 3) ondula o corpo como um peixe (a cauda balança mais que a cabeça);
 * Usa os quadros de corrida: os pés e o braço do próprio desenho já se mexem e, com o corpo
 * deitado, viram a batida de pernas do nado.
 */
export function swimSheet(scene: Phaser.Scene, src: string, dst: string, frame: number, pivot: [number, number], wiggle: number): void {
  const from = toCanvas(scene, src);
  const n = Math.floor(from.width / frame);
  const out = document.createElement('canvas');
  out.width = from.width;
  out.height = frame;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = false;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = frame;
    c.height = frame;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    return [c, x] as const;
  };
  const [tmp, tctx] = mk();
  const [rot, rctx] = mk();
  const [body, bctx] = mk();
  const [px, py] = pivot;

  for (let i = 0; i < n; i++) {
    // 1) quadro em pé, sem a sombra
    tctx.clearRect(0, 0, frame, frame);
    tctx.drawImage(from, i * frame, 0, frame, frame, 0, 0, frame, frame);
    const img = tctx.getImageData(0, 0, frame, frame);
    for (let q = 3; q < img.data.length; q += 4) if (img.data[q] < 200) img.data[q] = 0;
    tctx.putImageData(img, 0, 0);
    // 2) deita 90° (sentido horário): a cabeça, que estava em cima, passa a apontar para a direita
    rctx.clearRect(0, 0, frame, frame);
    rctx.save();
    rctx.translate(px, py);
    // Mais comprido e mais baixo (corpo de peixe), respirando de leve a cada braçada.
    const breathe = Math.sin((i / n) * Math.PI * 2);
    rctx.scale(1.2 + breathe * 0.04, 0.88 - breathe * 0.03);
    rctx.rotate(Math.PI / 2);
    rctx.drawImage(tmp, -px, -py);
    rctx.restore();
    // 3) ondulação: cada coluna sobe/desce numa onda que corre da cabeça para a cauda
    const r = rctx.getImageData(0, 0, frame, frame);
    const o = bctx.createImageData(frame, frame);
    const phase = (i / n) * Math.PI * 2;
    for (let x = 0; x < frame; x++) {
      const tail = Math.max(0, Math.min(1, (px + 34 - x) / 80)); // 0 na cabeça, 1 na cauda
      const dy = Math.round(Math.sin(phase - tail * 3.2) * wiggle * tail);
      for (let y = 0; y < frame; y++) {
        const sy = y - dy;
        if (sy < 0 || sy >= frame) continue;
        const a = (sy * frame + x) * 4;
        const b = (y * frame + x) * 4;
        o.data[b] = r.data[a];
        o.data[b + 1] = r.data[a + 1];
        o.data[b + 2] = r.data[a + 2];
        o.data[b + 3] = r.data[a + 3];
      }
    }
    bctx.putImageData(o, 0, 0);

    // Sem membros desenhados por cima (ficaram feios): só o corpo do próprio sprite, cujos pés
    // e braço de verdade já se mexem nos quadros de corrida e, deitados, viram a batida do nado.
    octx.drawImage(body, i * frame, 0);
  }
  addSheet(scene, dst, out, frame, frame);
}

/** Cores da chama roxa que o Xamã segura (branco, rosa e lilás), tiradas do sprite original. */
const FLAME = new Set([0xffffff, 0xfdb2fc, 0xa479cd]);
/** Região da chama dentro do quadro de 192 px (acima da mão esquerda, sem pegar o rosto). */
const FLAME_BOX = { x: 28, y: 34, w: 44, h: 56 };

/**
 * A chama da mão do Xamã vira uma folha própria ('shaman_orb', recortada quadro a quadro de
 * 'shaman_idle') e o Xamã ganha uma versão com a mão vazia ('shaman_idle_noorb'): assim a chama
 * de verdade pode sair da mão dele e voar até alguém, e depois "renascer" na mão.
 */
export function makeShamanOrb(scene: Phaser.Scene): void {
  if (scene.textures.exists('shaman_orb')) return;
  const src = toCanvas(scene, 'shaman_idle');
  const n = Math.floor(src.width / 192);
  const orb = document.createElement('canvas');
  orb.width = FLAME_BOX.w * n;
  orb.height = FLAME_BOX.h;
  const empty = document.createElement('canvas');
  empty.width = src.width;
  empty.height = src.height;
  const ectx = empty.getContext('2d')!;
  ectx.drawImage(src, 0, 0);
  const all = ectx.getImageData(0, 0, src.width, src.height);
  const octx = orb.getContext('2d')!;
  const out = octx.createImageData(orb.width, orb.height);
  for (let i = 0; i < n; i++) {
    for (let y = 0; y < FLAME_BOX.h; y++)
      for (let x = 0; x < FLAME_BOX.w; x++) {
        const sx = i * 192 + FLAME_BOX.x + x;
        const sy = FLAME_BOX.y + y;
        const k = (sy * src.width + sx) * 4;
        const d = all.data;
        if (d[k + 3] === 0 || !FLAME.has(hex(d[k], d[k + 1], d[k + 2]))) continue;
        // copia o pixel para a folha da chama e apaga da folha do Xamã (mão vazia)
        const o = (y * orb.width + i * FLAME_BOX.w + x) * 4;
        out.data[o] = d[k];
        out.data[o + 1] = d[k + 1];
        out.data[o + 2] = d[k + 2];
        out.data[o + 3] = d[k + 3];
        d[k + 3] = 0;
      }
  }
  octx.putImageData(out, 0, 0);
  ectx.putImageData(all, 0, 0);
  addSheet(scene, 'shaman_orb', orb, FLAME_BOX.w, FLAME_BOX.h);
  addSheet(scene, 'shaman_idle_noorb', empty, 192, 192);
  scene.anims.create({ key: 'shaman_orb', frames: scene.anims.generateFrameNumbers('shaman_orb', { start: 0, end: n - 1 }), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: 'shaman_idle_noorb', frames: scene.anims.generateFrameNumbers('shaman_idle_noorb', { start: 0, end: n - 1 }), frameRate: 10, repeat: -1 });
}

/** Centro da chama dentro do quadro (relativo ao centro do quadro de 192 px). */
export const SHAMAN_ORB_OFFSET = { x: FLAME_BOX.x + FLAME_BOX.w / 2 - 96, y: FLAME_BOX.y + FLAME_BOX.h / 2 - 96 };
