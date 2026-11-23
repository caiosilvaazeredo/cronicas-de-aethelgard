import Phaser from 'phaser';
import { BODY_FONT, FONT, W } from '../config';
import { playMusic } from '../game/music';
import { loadingVignette } from '../ui/loading';

/**
 * Créditos: curtos e diretos. O logo, o nome do autor e o estúdio entram em sequência rápida
 * sobre o céu de fim de tarde, com os personagens correndo lá embaixo. Depois de alguns segundos
 * segue sozinho; qualquer tecla ou toque pula.
 */
const AUTHOR = 'Msc Caio Azeredo';
const STUDIO = 'Sapo Papão Games';

/** Créditos finais (depois do fim da história): sobem devagar, seção por seção. */
const ROLL: Array<[string, string[]]> = [
  ['Criação, roteiro e programação', [AUTHOR]],
  ['Estúdio', [STUDIO]],
  ['Elenco', ['Ossian, a caveira', 'Hex, o Xamã', 'O aldeão da casa azul', 'Os nove reis', 'Os moradores da Vila dos Ossos']],
  ['Arte', ['Tiny Swords (Free Pack e Enemy Pack) — Pixel Frog']],
  ['Música', ['Amostras FluidR3_GM — Frank Wen', 'midi-js-soundfonts — Benjamin Gleitzman', 'smplr']],
  ['Fontes', ['Anak Manja — Khurasan Studio', 'Matcha Style', 'Lilita One e Rubik (Google Fonts)']],
  ['Feito com', ['Phaser 3', 'TypeScript e Vite']],
  ['Agradecimentos', ['A quem testou cada fase', 'E a você, que jogou até aqui']],
];

export class CreditsScene extends Phaser.Scene {
  lastData: { next?: string; data?: Record<string, unknown> } = {};
  private leaving = false;

  constructor() {
    super('credits');
  }

  init(data: { next?: string; data?: Record<string, unknown> }): void {
    this.lastData = data;
    this.leaving = false;
  }

  create(): void {
    playMusic('memory');
    if ((this.lastData.data as { ending?: boolean } | undefined)?.ending) return this.roll();
    const HH = this.scale.height;
    const P = HH > 720;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HH);
    this.add.rectangle(0, 0, W, HH, 0x2a1640, 0.45).setOrigin(0);
    const ground = HH - (P ? 260 : 120);
    let show = loadingVignette(this, W / 2, ground, W, { scale: P ? 1.3 : 0.9 });
    this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        show.destroy();
        show = loadingVignette(this, W / 2, ground, W, { scale: P ? 1.3 : 0.9 });
      },
    });

    // Logo, autor e estúdio, um depois do outro.
    const s = P ? 1.5 : 1;
    const top = P ? HH * 0.2 : 70;
    const items: Phaser.GameObjects.Components.Transform[] = [];
    let y = top;
    if (this.textures.exists('logo')) {
      const lw = P ? 820 : 470;
      items.push(this.add.image(W / 2, y + (lw * 640) / 1200 / 2, 'logo').setDisplaySize(lw, (lw * 640) / 1200));
      y += (lw * 640) / 1200 + 24 * s;
    }
    const author = this.add.text(W / 2, y, AUTHOR, { fontFamily: FONT, fontSize: `${Math.round(46 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5, 0);
    items.push(author);
    y += author.height + 14 * s;
    items.push(this.add.text(W / 2, y, STUDIO, { fontFamily: FONT, fontSize: `${Math.round(30 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0.5, 0));
    items.forEach((o, i) => {
      const go = o as unknown as Phaser.GameObjects.Image;
      const sx = go.scaleX;
      const sy = go.scaleY;
      go.setAlpha(0).setScale(sx * 0.85, sy * 0.85);
      go.y += 16;
      this.tweens.add({ targets: go, alpha: 1, scaleX: sx, scaleY: sy, y: go.y - 16, duration: 380, delay: 150 + i * 260, ease: 'Back.easeOut' });
    });
    // Fica um pouco na tela e segue.
    this.time.delayedCall(5200, () => this.leave());

    const hint = this.add
      .text(W - 20, HH - 16, 'qualquer tecla ou toque para pular', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#bfd0e0' })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.time.delayedCall(400, () => {
      hint.setAlpha(1);
      this.input.keyboard?.once('keydown', () => this.leave());
      this.input.once('pointerdown', () => this.leave());
      this.input.gamepad?.once('down', () => this.leave());
    });
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  /** Fim do jogo: o logo e depois os nomes sobem pela tela; no último, segue para o mapa. */
  private roll(): void {
    const HH = this.scale.height;
    const P = HH > 720;
    const s = P ? 1.5 : 1;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HH);
    this.add.rectangle(0, 0, W, HH, 0x10102a, 0.7).setOrigin(0);
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    if (this.textures.exists('logo')) {
      const lw = P ? 760 : 420;
      const lh = (lw * 640) / 1200;
      items.push(this.add.image(W / 2, y + lh / 2, 'logo').setDisplaySize(lw, lh));
      y += lh + 70 * s;
    }
    for (const [title, names] of ROLL) {
      items.push(this.add.text(W / 2, y, title.toUpperCase(), { fontFamily: FONT, fontSize: `${Math.round(24 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5, 0));
      y += 44 * s;
      for (const n of names) {
        const t = this.add.text(W / 2, y, n, { fontFamily: BODY_FONT, fontSize: `${Math.round(24 * s)}px`, color: '#fff7dc', align: 'center', wordWrap: { width: W - 80 } }).setOrigin(0.5, 0);
        items.push(t);
        y += t.height + 10 * s;
      }
      y += 50 * s;
    }
    const end = this.add.text(W / 2, y + 40 * s, 'Obrigado por jogar!', { fontFamily: FONT, fontSize: `${Math.round(44 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5, 0);
    items.push(end);
    // Começa com o logo já aparecendo na metade de baixo (sem tela vazia no início).
    const y0 = HH * 0.5;
    const box = this.add.container(0, y0, items);
    const total = y + 40 * s + end.height;
    // Sobe até "Obrigado por jogar!" parar no meio da tela; fica um pouco e segue.
    const dist = y0 - (HH / 2 - total + end.height / 2);
    this.tweens.add({ targets: box, y: HH / 2 - total + end.height / 2, duration: (dist / (P ? 75 : 55)) * 1000, ease: 'Linear', onComplete: () => this.time.delayedCall(3500, () => this.leave()) });
    // Segurar uma tecla/toque acelera; Esc ou B pula.
    let fast = false;
    this.input.on('pointerdown', () => (fast = true));
    this.input.on('pointerup', () => (fast = false));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.key === 'Escape' ? this.leave() : (fast = true)));
    this.input.keyboard?.on('keyup', () => (fast = false));
    this.events.on('update', () => this.tweens.getTweensOf(box).forEach((tw) => (tw.timeScale = fast ? 4 : 1)));
    this.add
      .text(W - 20, HH - 16, 'segure para acelerar · Esc para pular', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#bfd0e0' })
      .setOrigin(1, 1);
    this.cameras.main.fadeIn(600, 255, 247, 220);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.lastData.next ?? 'menu', this.lastData.data ?? {}));
  }
}
