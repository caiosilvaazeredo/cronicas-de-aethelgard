import Phaser from 'phaser';
import { playMusic } from '../game/music';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { ENDING_FREE, ENDING_HOME, chapterFor, SPEAKER_NAME, type Line, type Speaker } from '../data/lore';
import { completeLevel, setEnding } from '../game/progress';
import { areaOfLevel, areaTitle } from '../game/areas';
import { CHARS } from '../game/characters';
import type { DeviceId } from '../game/controls';
import { LEVELS } from '../game/level';
import { PLAYER_TINT, pillButton } from '../ui/devices';
import { typeDelay } from '../game/settings';

const INK = 0x1d1a2b;

/** Folha, quadro e onde ficam os pés/cabeça de cada retrato. */
function portraitOf(who: Speaker): { key: string; frame: number; feetY: number; head: number } {
  if (who === 'shaman') return { key: 'shaman_idle', frame: 192, feetY: 133, head: 80 };
  const id = who === 'human' ? 'villager' : who;
  const d = CHARS[id];
  return { key: `${id}_idle`, frame: d.frame, feetY: d.feetY, head: d.head };
}

/** Cor da plaquinha de nome. */
function nameColor(who: Speaker): number {
  if (who === 'skull') return PLAYER_TINT[0];
  if (who === 'shaman') return 0x9b6bf0;
  if (who === 'human') return 0x58b947;
  return 0xc0392b;
}

const BG: Record<string, string> = { shore: 'sky', cave: 'cave_bg', volcano: 'volcano_bg', sky: 'sky_high', haunted: 'haunt_bg' };

/**
 * Visual novel antes de cada fase (modo história): fundo da fase, retratos grandes dos
 * personagens em pixel art (ampliação inteira, pixels nítidos), quem fala em destaque,
 * caixa de diálogo com nome e texto letra a letra. Próximo / Pular.
 */
export class StoryScene extends Phaser.Scene {
  private devices: DeviceId[] = ['kb-full'];
  private level = 0;
  private lines: Line[] = [];
  private index = -1;
  private typing?: Phaser.Time.TimerEvent;
  private full = '';
  private text!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private namePlate!: Phaser.GameObjects.Graphics;
  private arrow!: Phaser.GameObjects.Text;
  private slots: Record<'left' | 'right', { who?: Speaker; sprite?: Phaser.GameObjects.Sprite }> = { left: {}, right: {} };
  private prevPad = { a: true, b: true };
  private boxTop = 0;
  private epilogue = false;
  /** Final escolhido no Trono do Xamã (o texto que está passando agora). */
  private ending?: 'home';
  private chose = false;
  private choiceSel = 0;
  private choiceRows: Array<{ bg: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text; w: number; y: number }> = [];
  private choiceBox?: Phaser.GameObjects.Container;
  lastData: { devices?: DeviceId[]; level?: number; epilogue?: boolean } = {};

  constructor() {
    super('vn');
  }

  init(data: { devices?: DeviceId[]; level?: number; epilogue?: boolean }): void {
    this.lastData = data;
    this.devices = data.devices ?? ['kb-full'];
    this.level = data.level ?? 0;
    this.epilogue = !!data.epilogue;
    this.ending = undefined;
    this.chose = false;
    // Epílogo (depois de vencer o Xamã): o final em que o mundo fica livre.
    this.lines = (this.epilogue ? ENDING_FREE : chapterFor(this.level))?.lines ?? [];
    this.index = -1;
    this.slots = { left: {}, right: {} };
    this.prevPad = { a: true, b: true };
  }

  create(): void {
    playMusic(this.epilogue ? 'memory' : LEVELS[this.level]?.id === 'finale' ? 'centro' : 'story');
    const H = VIEW.h;
    const theme = this.epilogue ? 'shore' : LEVELS[this.level].theme;
    this.add.image(0, 0, BG[theme]).setOrigin(0).setDisplaySize(W, H);
    // Escurece a base para destacar os retratos e a caixa.
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x0b1626, 0x0b1626, 0x0b1626, 0x0b1626, 0, 0, 0.75, 0.75).fillRect(0, H * 0.35, W, H * 0.65);

    // Título do capítulo no alto.
    const ch = this.epilogue ? ENDING_FREE : chapterFor(this.level);
    // Título: área e número da fase dentro dela (as áreas têm ordem livre).
    const area = areaOfLevel(this.level);
    const k = area ? area.levels.indexOf(LEVELS[this.level].id) + 1 : this.level + 1;
    const where = this.epilogue ? 'EPÍLOGO' : area ? `${areaTitle(area).name.toUpperCase()} ${k}` : `CAPÍTULO ${k}`;
    this.add
      .text(W / 2, VIEW.portrait ? 120 : 46, `${where} · ${ch.title.toUpperCase()}`, {
        fontFamily: FONT,
        fontSize: VIEW.portrait ? '48px' : '34px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Caixa de diálogo em estilo pixel: contorno escuro, borda clara, fundo azul translúcido.
    const bw = W - 120;
    const bh = VIEW.portrait ? 360 : 190;
    const bx = 60;
    const by = H - bh - (VIEW.portrait ? 160 : 26);
    this.boxTop = by;
    const box = this.add.graphics().setDepth(10);
    box.fillStyle(INK, 1).fillRect(bx - 6, by - 6, bw + 12, bh + 12);
    box.fillStyle(0xfff7dc, 1).fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    box.fillStyle(0x1b3a78, 0.94).fillRect(bx, by, bw, bh);
    box.fillStyle(0x2a5bb8, 0.55).fillRect(bx, by, bw, bh * 0.38);
    box.fillStyle(0x7fb8ff, 0.35).fillRect(bx + 8, by + 8, bw - 16, 4);
    // Cantos em degrau (pixel).
    for (const [cx, cy] of [[bx, by], [bx + bw - 8, by], [bx, by + bh - 8], [bx + bw - 8, by + bh - 8]]) {
      box.fillStyle(INK, 1).fillRect(cx, cy, 8, 8);
    }

    this.namePlate = this.add.graphics().setDepth(11);
    this.nameText = this.add
      .text(bx + 34, by - 4, '', { fontFamily: FONT, fontSize: VIEW.portrait ? '40px' : '26px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setDepth(12);
    this.text = this.add
      .text(bx + 34, by + (VIEW.portrait ? 60 : 40), '', {
        fontFamily: BODY_FONT,
        fontSize: VIEW.portrait ? '40px' : '27px',
        color: '#ffffff',
        lineSpacing: 8,
        wordWrap: { width: bw - 300 },
      })
      .setDepth(12);
    this.arrow = this.add
      .text(bx + bw - 30, by + bh - 28, '▼', { fontFamily: FONT, fontSize: '22px', color: '#ffe066' })
      .setOrigin(0.5)
      .setDepth(12);
    this.tweens.add({ targets: this.arrow, y: this.arrow.y + 6, duration: 400, yoyo: true, repeat: -1 });

    const sc = VIEW.portrait ? 1.3 : 0.85;
    pillButton(this, bx + bw - 150, by + bh - (VIEW.portrait ? 180 : 112), 'PRÓXIMO  ▶', () => this.advance(), 230, 0xffe066)
      .setScale(sc)
      .setDepth(13);
    pillButton(this, bx + bw - 150, by + bh - (VIEW.portrait ? 70 : 46), 'PULAR', () => this.play(), 160)
      .setScale(sc * 0.85)
      .setDepth(13);

    // Toque/clique fora dos botões também avança.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.advance();
    });
    const kb = this.input.keyboard!;
    for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.advance());
    kb.on('keydown-ESC', () => this.play());

    this.advance();
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const a = !!pad.buttons[0]?.pressed;
    const b = !!pad.buttons[1]?.pressed || !!pad.buttons[9]?.pressed;
    if (a && !this.prevPad.a) this.advance();
    if (b && !this.prevPad.b) this.play();
    this.prevPad = { a, b };
  }

  /** Termina de escrever a fala atual ou passa para a próxima. */
  private advance(): void {
    if (this.choiceBox) return this.confirmChoice();
    if (this.typing) {
      this.typing.remove();
      this.typing = undefined;
      this.text.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    this.index++;
    if (this.index >= this.lines.length) {
      this.play();
      return;
    }
    this.show(this.lines[this.index]);
  }

  private show(line: Line): void {
    this.setPortrait(line.side, line.who);
    // Quem fala fica em destaque; o outro escurece.
    for (const side of ['left', 'right'] as const) {
      const sp = this.slots[side].sprite;
      if (!sp) continue;
      const active = side === line.side;
      sp.setTint(active ? 0xffffff : 0x4a5570);
      this.tweens.add({ targets: sp, alpha: active ? 1 : 0.85, duration: 180 });
    }
    // Plaquinha do nome.
    const name = SPEAKER_NAME[line.who].toUpperCase();
    this.nameText.setText(name);
    const pw = this.nameText.width + 50;
    const px = this.nameText.x - 20;
    const py = this.boxTop - 4;
    const ph = VIEW.portrait ? 64 : 44;
    this.namePlate.clear();
    this.namePlate.fillStyle(INK, 1).fillRect(px - 4, py - ph / 2 - 4, pw + 8, ph + 8);
    this.namePlate.fillStyle(0xfff7dc, 1).fillRect(px - 2, py - ph / 2 - 2, pw + 4, ph + 4);
    this.namePlate.fillStyle(nameColor(line.who), 1).fillRect(px, py - ph / 2, pw, ph);
    // Texto letra a letra.
    this.full = line.text;
    this.text.setText('');
    this.arrow.setVisible(false);
    let n = 0;
    if (typeDelay() === 0) {
      this.text.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    this.typing = this.time.addEvent({
      delay: typeDelay(),
      repeat: this.full.length - 1,
      callback: () => {
        n++;
        this.text.setText(this.full.slice(0, n));
        if (n >= this.full.length) {
          this.typing = undefined;
          this.arrow.setVisible(true);
        }
      },
    });
  }

  /** Retrato grande: o sprite do personagem ampliado em múltiplo inteiro (pixels nítidos). */
  private setPortrait(side: 'left' | 'right', who: Speaker): void {
    const slot = this.slots[side];
    if (slot.who === who && slot.sprite) {
      this.tweens.add({ targets: slot.sprite, y: slot.sprite.y - 10, duration: 120, yoyo: true });
      return;
    }
    const old = slot.sprite;
    if (old) {
      this.tweens.add({ targets: old, x: old.x + (side === 'left' ? -200 : 200), alpha: 0, duration: 220, onComplete: () => old.destroy() });
    }
    const p = portraitOf(who);
    const target = VIEW.portrait ? 560 : 330; // altura desejada do personagem
    const scale = Math.max(2, Math.round(target / (p.head + 40)));
    const x = side === 'left' ? W * (VIEW.portrait ? 0.3 : 0.24) : W * (VIEW.portrait ? 0.7 : 0.76);
    const feet = this.boxTop + 30;
    const sp = this.add
      .sprite(x + (side === 'left' ? -220 : 220), feet, p.key)
      .setOrigin(0.5, p.feetY / p.frame)
      .setScale(scale)
      .setDepth(6)
      .setAlpha(0)
      .setFlipX(side === 'right')
      .play(p.key);
    this.tweens.add({ targets: sp, x, alpha: 1, duration: 260, ease: 'Cubic.easeOut' });
    this.slots[side] = { who, sprite: sp };
  }

  /** Trono do Xamã: depois da revelação, a escolha (enfrentar ou voltar para casa). */
  private get isFinale(): boolean {
    return LEVELS[this.level]?.id === 'finale' && !this.epilogue;
  }

  private showChoice(): void {
    this.chose = true;
    const H = this.scale.height;
    const P = VIEW.portrait;
    const opts = ['ENFRENTAR O XAMÃ', 'VOLTAR PARA CASA COM A AJUDA DELE'];
    const sub = ['Se vencer, o mundo fica livre... e você volta a ser osso.', 'Você volta inteiro para casa. O mundo fica com o Xamã.'];
    const items: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, W * 2, H * 3, 0x07040c, 0.7).setInteractive()];
    const pw = P ? 1000 : 820;
    const rh = P ? 170 : 116;
    const ph = rh * 2 + (P ? 200 : 150);
    const g = this.add.graphics();
    g.fillStyle(INK, 1).fillRoundedRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12, 26);
    g.fillStyle(0x10223a, 0.97).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    g.lineStyle(4, 0x9b6bf0, 1).strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    items.push(g);
    items.push(this.add.text(0, -ph / 2 + (P ? 60 : 44), 'A ESCOLHA', { fontFamily: FONT, fontSize: P ? '52px' : '38px', color: '#ffe066', stroke: '#1d1a2b', strokeThickness: 8 }).setOrigin(0.5));
    this.choiceRows = [];
    opts.forEach((label, i) => {
      const y = -ph / 2 + (P ? 140 : 100) + i * rh + rh / 2;
      const w = pw - 60;
      const bg = this.add.graphics();
      const t = this.add.text(0, y - (P ? 22 : 16), label, { fontFamily: FONT, fontSize: P ? '36px' : '26px', color: '#fff7dc' }).setOrigin(0.5);
      const st = this.add.text(0, y + (P ? 28 : 20), sub[i], { fontFamily: BODY_FONT, fontSize: P ? '26px' : '18px', color: '#bfd0e0' }).setOrigin(0.5);
      const z = this.add
        .zone(0, y, w, rh - 14)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.selectChoice(i))
        .on('pointerdown', () => {
          this.selectChoice(i);
          this.confirmChoice();
        });
      this.choiceRows.push({ bg, t, w, y });
      items.push(bg, t, st, z);
    });
    this.choiceBox = this.add.container(W / 2, H / 2, items).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: this.choiceBox, alpha: 1, duration: 300 });
    this.selectChoice(0);
    const kb = this.input.keyboard!;
    for (const k of ['UP', 'LEFT', 'W', 'A']) kb.on(`keydown-${k}`, () => this.selectChoice(this.choiceSel - 1));
    for (const k of ['DOWN', 'RIGHT', 'S', 'D']) kb.on(`keydown-${k}`, () => this.selectChoice(this.choiceSel + 1));
  }

  private selectChoice(i: number): void {
    if (!this.choiceBox) return;
    this.choiceSel = Phaser.Math.Wrap(i, 0, this.choiceRows.length);
    const rh = VIEW.portrait ? 170 : 116;
    this.choiceRows.forEach((r, k) => {
      const on = k === this.choiceSel;
      r.bg.clear();
      r.bg.fillStyle(on ? 0x9b6bf0 : 0x2a3a5a, 1).fillRoundedRect(-r.w / 2, r.y - (rh - 14) / 2, r.w, rh - 14, 14);
      r.t.setColor(on ? '#ffffff' : '#fff7dc');
    });
  }

  private confirmChoice(): void {
    const box = this.choiceBox;
    if (!box) return;
    this.choiceBox = undefined;
    box.destroy();
    if (this.choiceSel === 0) {
      // Enfrentar: a luta final (o final livre vem depois da vitória).
      this.scene.start('game', { mode: 'story', devices: this.devices, level: this.level });
      return;
    }
    // Voltar para casa: o Xamã vence sem lutar.
    setEnding('home');
    completeLevel(this.level);
    this.ending = 'home';
    this.lines = ENDING_HOME.lines;
    this.index = -1;
    this.advance();
  }

  private play(): void {
    if (this.choiceBox) return this.confirmChoice();
    if (this.isFinale && !this.chose) return this.showChoice();
    if (this.ending === 'home' || this.epilogue) {
      // Fim: a tela some num branco morno e volta ao mapa do mundo (agora livre ou dominado).
      if (this.epilogue) setEnding('free');
      this.cameras.main.fadeOut(1600, 255, 247, 220);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('credits', { next: 'world', data: { devices: this.devices, ending: true } }));
      return;
    }
    if (this.epilogue) {
      // Fim em aberto: a tela some num branco morno, e a escolha fica com quem joga.
      this.cameras.main.fadeOut(1400, 255, 247, 220);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', { devices: this.devices, level: this.level }));
      return;
    }
    this.scene.start('game', { mode: 'story', devices: this.devices, level: this.level });
  }
}
