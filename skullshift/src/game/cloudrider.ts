import Phaser from 'phaser';

/**
 * O Xamã montado na nuvem, como quem está DENTRO dela: ele afunda até a cintura e uma segunda
 * camada da nuvem (só a metade de baixo, com a borda de cima em montinhos) passa na frente das
 * pernas. Assim ele não parece em pé em cima de um travesseiro.
 */
const FRONT = 'cloud_05_front';

/** Gera (uma vez) a metade da frente da nuvem, com a borda de cima fofa. */
function ensureFront(scene: Phaser.Scene): void {
  if (scene.textures.exists(FRONT)) return;
  const src = scene.textures.get('cloud_05').getSourceImage() as HTMLImageElement;
  const W = src.width;
  const H = src.height;
  const tex = scene.textures.createCanvas(FRONT, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  // Mantém só o que fica abaixo de uma linha de montinhos (a "beirada" da nuvem na frente dele).
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(0, H);
  const base = H * 0.5;
  const puffs = 7;
  ctx.lineTo(0, base);
  for (let i = 0; i < puffs; i++) {
    const x0 = (W / puffs) * i;
    const x1 = (W / puffs) * (i + 1);
    const r = (x1 - x0) / 2;
    const lift = i % 2 ? 10 : 22;
    ctx.quadraticCurveTo((x0 + x1) / 2, base - r * 0.9 - lift, x1, base);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // Sombra leve logo abaixo da beirada: dá volume e separa da roupa dele.
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, base - 30, 0, base + 40);
  g.addColorStop(0, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  tex.refresh();
}

export interface CloudRider {
  cloud: Phaser.GameObjects.Image;
  shaman: Phaser.GameObjects.Sprite;
  front: Phaser.GameObjects.Image;
  /** As três partes na ordem certa (fundo, xamã, frente), para pôr num container ou animar juntas. */
  parts: Phaser.GameObjects.GameObject[];
}

/**
 * Nuvem + Xamã centrados em (x, y) = centro da nuvem com escala 0.3 em (0, 46), como antes.
 * `scale` é a escala da nuvem (0.3 no tamanho normal); `dx` desloca o Xamã na nuvem.
 */
export function cloudRider(scene: Phaser.Scene, opts: { x?: number; y?: number; scale?: number; flip?: boolean; dx?: number } = {}): CloudRider {
  ensureFront(scene);
  const x = opts.x ?? 0;
  const y = opts.y ?? 46;
  const s = opts.scale ?? 0.3;
  const k = s / 0.3;
  const cloud = scene.add.image(x, y, 'cloud_05').setScale(s);
  // Afundado: os pés ficam perto do fundo da nuvem e a beirada da frente corta na cintura.
  const shaman = scene.add.sprite(x + (opts.dx ?? 0), y - 26 * k, 'shaman_idle').play('shaman_idle').setFlipX(!!opts.flip);
  const front = scene.add.image(x, y, scene.textures.exists(FRONT) ? FRONT : 'cloud_05').setScale(s);
  return { cloud, shaman, front, parts: [cloud, shaman, front] };
}
