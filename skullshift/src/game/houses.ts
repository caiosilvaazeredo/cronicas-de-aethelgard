import Phaser from 'phaser';
import { DEPTH } from '../config';

/**
 * Casas de verdade: as construções do Free Pack com a porta na proporção do Ossian (dá para
 * entrar). Cada uma sabe onde fica a própria porta, para a fase saber onde o jogador bate ou entra.
 *
 * Medidas em pixels do desenho original. `crop` corta parte do desenho: a arquearia é vista de
 * cima e o pátio dela (cerca e alvos) parecia pendurado no ar na visão de lado; fica só a casinha.
 */
interface Spec {
  foot: number;
  door: [x0: number, y0: number, x1: number, y1: number];
  scale: number;
  crop?: [x0: number, w: number];
}

export const HOUSE_SPECS: Record<string, Spec> = {
  house1: { foot: 173, door: [50, 124, 78, 163], scale: 2 },
  barracks: { foot: 245, door: [78, 190, 114, 230], scale: 1.75 },
  archery: { foot: 240, door: [122, 196, 155, 230], scale: 2.2, crop: [88, 104] },
};

/** Onde ficou a porta de uma casa desenhada. */
export interface HouseDoor {
  x: number;
  top: number;
  bottom: number;
  w: number;
  /** Linha do chão em que se fica para bater ou entrar. */
  ground: number;
  img: Phaser.GameObjects.Image;
  /** Saída da fase (entrar termina a fase). */
  exit?: boolean;
  /** Já aberta (porta escura por dentro). */
  open?: Phaser.GameObjects.Graphics;
}

/** Largura visível da casa nesta escala. */
export function houseWidth(name: string, texW: number, scale?: number): number {
  const sp = HOUSE_SPECS[name];
  const w = sp?.crop ? sp.crop[1] : texW;
  return w * (scale ?? sp?.scale ?? 1);
}

/**
 * Desenha a casa com a base no chão e devolve a porta. `doorAt`: centraliza a PORTA nesse x
 * (em vez da casa), como na casa de saída das fases de chave.
 */
export function drawHouse(scene: Phaser.Scene, key: string, name: string, x: number, ground: number, opts: { scale?: number; tint?: number; doorAt?: number } = {}): HouseDoor {
  const sp = HOUSE_SPECS[name];
  const img = scene.add.image(0, 0, key);
  const sc = opts.scale ?? sp.scale;
  const W = img.width;
  const cx0 = sp.crop ? sp.crop[0] : 0;
  const cw = sp.crop ? sp.crop[1] : W;
  if (sp.crop) img.setCrop(cx0, 0, cw, img.height);
  const midPx = cx0 + cw / 2;
  const doorMid = (sp.door[0] + sp.door[2]) / 2;
  const cx = opts.doorAt !== undefined ? opts.doorAt - (doorMid - midPx) * sc : x;
  img.setOrigin(midPx / W, sp.foot / img.height).setPosition(cx, ground + 6).setScale(sc).setDepth(DEPTH.deco - 0.2);
  if (opts.tint !== undefined) img.setTint(opts.tint);
  scene.add.ellipse(cx, ground + 2, cw * sc * 0.8, 18, 0x10223a, 0.22).setDepth(DEPTH.deco - 0.25);
  const doorX = cx + (doorMid - midPx) * sc;
  return {
    x: doorX,
    top: ground + 6 - (sp.foot - sp.door[1]) * sc,
    bottom: ground + 6 - (sp.foot - sp.door[3]) * sc,
    w: (sp.door[2] - sp.door[0]) * sc,
    ground,
    img,
  };
}

/** Abre a porta: o vão fica escuro, com a luz quente lá de dentro. */
export function openDoor(scene: Phaser.Scene, d: HouseDoor): void {
  if (d.open) return;
  const g = scene.add.graphics().setDepth(DEPTH.deco + 0.4);
  const w = d.w * 0.86;
  const h = d.bottom - d.top;
  g.fillStyle(0x1a1018, 1).fillRoundedRect(d.x - w / 2, d.top + 2, w, h - 2, { tl: w / 2, tr: w / 2, bl: 0, br: 0 });
  g.fillStyle(0xffb347, 0.35).fillRoundedRect(d.x - w / 2 + 6, d.top + h * 0.35, w - 12, h * 0.65 - 2, 6);
  g.setAlpha(0);
  scene.tweens.add({ targets: g, alpha: 1, duration: 220 });
  d.open = g;
}

/** Falas de quem mora nas casas trancadas (o Ossian bate e é expulso). */
export const GRUMPY_LINES = [
  'Não compramos nada! Muito menos ossos.',
  'Já tenho esqueleto no armário, obrigado.',
  'Se for o Hex de novo, diz que eu não estou!',
  'Limpa os pés! ...Ah, você não tem pé. Mesmo assim, não.',
  'Fechado para caveiras. Aberto para gente com pele.',
  'O dono saiu. Quem está falando é a porta.',
  'Quem é? Ninguém? Então vai embora, ninguém.',
  'Aqui só entra quem tem carne no osso.',
  'Shhh! O bebê acabou de dormir. Bate no vizinho.',
  'Esqueleto na porta dá sete anos de azar. Xô!',
  'Deixa a correspondência debaixo do tapete. E vai.',
  'Se é a vacina, eu já tomei. Se é o fim do mundo, já sei.',
];
