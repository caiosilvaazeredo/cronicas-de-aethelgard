import Phaser from 'phaser';
import { BODY_FONT, FONT, W } from '../config';
import { getEnding } from '../game/progress';
import { playMusic } from '../game/music';
import { loadingVignette } from '../ui/loading';

/**
 * Créditos: o texto sobe devagar sobre um céu de fim de tarde, enquanto os personagens passam
 * correndo lá embaixo (cenas que trocam sozinhas). Aparece depois de qualquer final e pelo menu.
 * Qualquer tecla ou toque (depois de um instante) pula.
 */
const CREDITS: Array<[string, string]> = [
  ['', 'SKULLSHIFT'],
  ['Ideia, direção e testes', 'a equipe do Skullshift'],
  ['Código, textos e trilha', 'feitos com Claude Code (Anthropic)'],
  ['Arte', 'Tiny Swords, de Pixel Frog\nFree Pack e Enemy Pack'],
  ['Fontes', 'Anak Manja, de Khurasan Studio\nMatcha Style'],
  ['Motor', 'Phaser 3'],
  ['Instrumentos', 'flauta, violão e harpa do soundfont FluidR3_GM (Frank Wen)\nconvertidos por midi-js-soundfonts (Benjamin Gleitzman)\ntocados com a biblioteca smplr'],
  ['Inspirações', 'Nidhogg · Super Mario Wonder · Shadow of the Colossus\nZelda: Ocarina of Time · Cuphead · Super Smash Bros.'],
  ['Elenco', 'Ossian, a caveira · Xamã Hex\nRei Tubarão-Arpão · Rei Gnoll · Rei Lagarto · Aranha-Rainha\nMinotauro Rubro · Rei Gnomo · Rei Goblin da Tocha\nDiabrete Gigante · Rei das Asas · os Príncipes\ne a ovelha de orelha preta'],
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

    // A coluna de créditos (com o final que a pessoa viu, no fim).
    const ending = getEnding();
    const last =
      ending === 'free' ? 'Os selos voltaram. O mundo está livre.\nE Ossian ficou, de guarda.' : ending === 'home' ? 'Ossian voltou para casa.\nE o mundo agora é de Hex.' : 'A história ainda espera por você.';
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    const s = P ? 1.5 : 1;
    for (const [role, who] of CREDITS) {
      if (!role) {
        if (this.textures.exists('logo')) {
          const lw = P ? 900 : 560;
          items.push(this.add.image(0, y + lw * 0.27, 'logo').setDisplaySize(lw, (lw * 640) / 1200));
          y += lw * 0.6;
        } else {
          items.push(this.add.text(0, y, who, { fontFamily: FONT, fontSize: `${Math.round(64 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 12 }).setOrigin(0.5, 0));
          y += 110 * s;
        }
        continue;
      }
      items.push(this.add.text(0, y, role.toUpperCase(), { fontFamily: FONT, fontSize: `${Math.round(22 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 7 }).setOrigin(0.5, 0));
      y += 36 * s;
      const t = this.add.text(0, y, who, { fontFamily: BODY_FONT, fontSize: `${Math.round(20 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 5, align: 'center', lineSpacing: 6 * s }).setOrigin(0.5, 0);
      items.push(t);
      y += t.height + 46 * s;
    }
    const end = this.add.text(0, y + 40 * s, last, { fontFamily: FONT, fontSize: `${Math.round(26 * s)}px`, color: '#d8b8ff', stroke: '#10223a', strokeThickness: 8, align: 'center' }).setOrigin(0.5, 0);
    items.push(end);
    y += end.height + 120 * s;
    const thanks = this.add.text(0, y, 'OBRIGADO POR JOGAR!', { fontFamily: FONT, fontSize: `${Math.round(40 * s)}px`, color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5, 0);
    items.push(thanks);
    const col = this.add.container(W / 2, HH + 20, items);
    // Sobe até o "obrigado" ficar no meio da tela, para e espera.
    const stopAt = HH * 0.35 - y;
    const duration = ((HH + 20 - stopAt) / (P ? 70 : 55)) * 1000;
    this.tweens.add({ targets: col, y: stopAt, duration, ease: 'Linear', onComplete: () => this.time.delayedCall(4000, () => this.leave()) });
    // O texto só aparece acima do gramado (entra por baixo dele, sem passar por cima dos personagens).
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(0xffffff).fillRect(0, 0, W, ground - (P ? 200 : 110));
    col.setMask(maskG.createGeometryMask());

    const hint = this.add
      .text(W - 20, HH - 16, 'qualquer tecla ou toque para pular', { fontFamily: BODY_FONT, fontSize: P ? '26px' : '15px', color: '#bfd0e0' })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.time.delayedCall(1200, () => {
      hint.setAlpha(1);
      this.input.keyboard?.once('keydown', () => this.leave());
      this.input.once('pointerdown', () => this.leave());
      this.input.gamepad?.once('down', () => this.leave());
    });
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.lastData.next ?? 'menu', this.lastData.data ?? {}));
  }
}
