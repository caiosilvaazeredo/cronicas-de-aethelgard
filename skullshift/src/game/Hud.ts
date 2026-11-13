import Phaser from 'phaser';
import { DEPTH, FONT, H, PORTRAIT, W } from '../config';

/** bottom: deitado (como o mockup) · top: deitado com botões de toque · portrait: em pé. */
export type HudStyle = 'bottom' | 'top' | 'portrait' | 'split';
import { ITEM_TEXTURE, type CharId, type ItemId } from './characters';

interface Slot {
  avatar: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  current: CharId;
  baseScale: number;
}

/**
 * HUD fixo: avatar + nome do jogador (embaixo, como no mockup; no celular sobe para o topo
 * para dar lugar aos botões), indicador dos 5 cenários e seta "VAI" de quem tem a vez.
 */
export class Hud {
  private slots: Array<Slot | undefined> = [];
  private goText: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Arc[] = [];
  private centeredGo = false;
  private discs: Phaser.GameObjects.Arc[] = [];
  /** Caixa de reserva de cada jogador (como no Mario): moldura + item guardado. */
  private boxes: Array<{ box: Phaser.GameObjects.Container; item: Phaser.GameObjects.Image; key: Phaser.GameObjects.Text; size: number; kind?: ItemId } | undefined> = [];

  constructor(
    private scene: Phaser.Scene,
    players: Array<{ name: string; char: CharId; color: number }>,
    screens: number,
    style: HudStyle,
    /**
     * Modo dividido (2 jogadores no mesmo celular em pé): mostra só este jogador, numa faixa
     * de 140 px que começa em y=0 local; 'place' posiciona/gira a faixa (o P2 fica de ponta-cabeça).
     */
    split?: { only: number; x: number; y: number; rotation: number },
    /** Caixa de reserva: tecla mostrada embaixo e o que fazer ao tocar nela. */
    reserve?: { labels: string[]; drop: (player: number) => void },
  ) {
    const before = scene.children.list.length;
    const touchLayout = style === 'top';
    const portrait = style === 'portrait';
    const sp = style === 'split';
    this.centeredGo = portrait;
    const pad = portrait ? PORTRAIT.topPad : 0;
    const y = sp ? 70 : touchLayout ? 64 : portrait ? 130 + pad : H - 86;
    const scale = sp ? 0.46 : touchLayout ? 0.36 : portrait ? 0.72 : 0.62;
    const fontSize = sp ? '40px' : touchLayout ? '28px' : portrait ? '54px' : '44px';
    const labelGap = sp ? 80 : touchLayout ? 62 : portrait ? 112 : 96;
    players.forEach((p, i) => {
      if (sp && split && i !== split.only) {
        this.slots.push(undefined);
        return;
      }
      const right = i === 1 && !sp;
      const ax = sp ? 90 : right ? W - (touchLayout ? 58 : portrait ? 104 : 92) : touchLayout ? 58 : portrait ? 104 : 92;
      // Disco na cor do jogador atrás do avatar.
      const r = sp ? 56 : touchLayout ? 46 : portrait ? 86 : 74;
      const rim = scene.add.circle(ax, y, r + 5, 0x10223a).setScrollFactor(0).setDepth(DEPTH.hud);
      const disc = scene.add.circle(ax, y, r, p.color).setScrollFactor(0).setDepth(DEPTH.hud);
      this.discs.push(rim, disc);
      scene.tweens.add({ targets: disc, alpha: { from: 1, to: 0.7 }, duration: 650, yoyo: true, repeat: -1 });
      const avatar = scene.add
        .image(ax, y, `${p.char}_avatar`)
        .setScale(scale)
        .setFlipX(right)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      const label = scene.add
        .text(right ? ax - labelGap : ax + labelGap, y, p.name, {
          fontFamily: FONT,
          fontSize,
          color: '#' + p.color.toString(16).padStart(6, '0'),
          stroke: '#10223a',
          strokeThickness: 8,
        })
        .setOrigin(right ? 1 : 0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      this.slots.push({ avatar, label, current: p.char, baseScale: scale });
    });

    // Indicador de cenários (o do meio é o central).
    const gap = portrait || sp ? 44 : 30;
    const x0 = sp ? W - 70 - (screens - 1) * gap : W / 2 - ((screens - 1) * gap) / 2;
    for (let i = 0; i < screens; i++) {
      const center = i === Math.floor(screens / 2);
      this.dots.push(
        scene.add
          .circle(x0 + i * gap, sp ? 44 : portrait ? 34 + pad : 26, (center ? 10 : 8) * (portrait || sp ? 1.5 : 1), 0x10223a, 0.6)
          .setStrokeStyle(3, 0xfff7dc, 0.9)
          .setScrollFactor(0)
          .setDepth(DEPTH.hud),
      );
    }

    // Caixa de reserva: uma moldura de madeira (como as placas do jogo) logo depois do nome de
    // cada jogador, na mesma faixa do avatar — nunca no meio da tela (onde ficam os pontos e o MENU).
    if (reserve && !sp) {
      const size = portrait ? 92 : touchLayout ? 62 : 70;
      players.forEach((p, i) => {
        const slot = this.slots[i];
        if (!slot) return;
        const right = i === 1;
        const gap = 22 + size / 2;
        let bx = right ? slot.label.x - slot.label.width - gap : slot.label.x + slot.label.width + gap;
        // Em pé o MENU fica no meio do topo: a caixa não pode encostar nele.
        // Em pé o nome ocupa a esquerda e o MENU o meio: a caixa vai entre o MENU e as vidas.
        if (portrait) bx = W / 2 + 150 + size / 2 + (right ? size + 30 : 0);
        const by = slot.label.y;
        const g = scene.add.graphics();
        const h = size / 2;
        // sombra, contorno escuro, madeira, madeira clara por dentro e um fundo escuro para o item
        g.fillStyle(0x10223a, 0.35).fillRoundedRect(-h + 3, -h + 5, size, size, 10);
        g.fillStyle(0x10223a, 1).fillRoundedRect(-h - 3, -h - 3, size + 6, size + 6, 12);
        g.fillStyle(0x9a6a36, 1).fillRoundedRect(-h, -h, size, size, 10);
        g.fillStyle(0xc89858, 1).fillRoundedRect(-h + 3, -h + 3, size - 6, size - 8, 8);
        g.fillStyle(0x3a2412, 0.85).fillRoundedRect(-h + 9, -h + 9, size - 18, size - 18, 6);
        // pregos nos cantos e a faixa na cor do jogador embaixo
        for (const [cx, cy] of [[-h + 6, -h + 6], [h - 6, -h + 6], [-h + 6, h - 8], [h - 6, h - 8]]) g.fillStyle(0x5a3a1c, 1).fillRect(cx - 2, cy - 2, 4, 4);
        g.fillStyle(p.color, 1).fillRect(-h + 12, h - 6, size - 24, 4);
        const item = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
        const tag = scene.add
          .text(0, -h - 4, 'RESERVA', { fontFamily: FONT, fontSize: portrait ? '20px' : '13px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 5 })
          .setOrigin(0.5, 1);
        const key = scene.add
          .text(0, h + 4, reserve.labels[i] ?? '', { fontFamily: FONT, fontSize: portrait ? '20px' : '13px', color: '#ffe066', stroke: '#10223a', strokeThickness: 5 })
          .setOrigin(0.5, 0)
          .setVisible(false);
        const box = scene.add.container(bx, by, [g, item, tag, key]).setScrollFactor(0).setDepth(DEPTH.hud).setSize(size, size);
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => reserve.drop(i));
        this.boxes[i] = { box, item, key, size };
      });
    }

    this.goText = scene.add
      .text(sp ? W - 160 : W / 2, sp ? 106 : touchLayout ? 128 : portrait ? 206 + pad : 74, '', {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setVisible(false);
    if (sp) this.centeredGo = true;

    if (split) {
      // Junta tudo numa faixa e posiciona/gira (o P2 vê de ponta-cabeça, do outro lado da mesa).
      const made = scene.children.list.slice(before);
      scene.add.container(split.x, split.y, made).setRotation(split.rotation).setDepth(DEPTH.hud);
    }
  }

  /** Troca o avatar com uma animação de "pop". */
  setChar(player: number, char: CharId): void {
    const slot = this.slots[player];
    if (!slot || slot.current === char) return;
    slot.current = char;
    slot.avatar.setTexture(`${char}_avatar`);
    this.scene.tweens.add({
      targets: slot.avatar,
      scale: { from: slot.baseScale * 1.4, to: slot.baseScale },
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  /** Mostra o item guardado (ou esvazia a caixa). */
  setReserve(player: number, kind: ItemId | undefined): void {
    const b = this.boxes[player];
    if (!b || b.kind === kind) return;
    b.kind = kind;
    b.key.setVisible(!!kind && !!b.key.text);
    if (!kind) {
      b.item.setVisible(false);
      return;
    }
    b.item.setTexture(ITEM_TEXTURE[kind], 0).setVisible(true).setAngle(kind === 'harpoon' ? 45 : 0);
    const fit = (b.size - 26) / Math.max(b.item.frame.width, b.item.frame.height);
    b.item.setScale(fit * (kind === 'harpoon' ? 1.25 : 1));
    this.scene.tweens.add({ targets: b.item, scale: { from: fit * 1.6, to: b.item.scale }, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: b.box, scale: { from: 1.2, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  setScreen(index: number, color = 0xfff7dc): void {
    this.dots.forEach((d, i) => d.setFillStyle(i === index ? color : 0x10223a, i === index ? 1 : 0.6));
  }

  /** Seta "VAI" de quem tem a vez (versus) ou para onde seguir (história). */
  setGo(dir: -1 | 0 | 1, color: string): void {
    if (dir === 0) {
      this.goText.setVisible(false);
      return;
    }
    this.goText.setText(dir > 0 ? 'VAI  ➜' : '⬅  VAI').setColor(color);
    if (!this.centeredGo) this.goText.setX(dir > 0 ? W - 170 : 170);
    this.goText.setVisible(Math.floor(this.scene.time.now / 300) % 2 === 0);
  }

  setVisible(v: boolean): void {
    for (const s of this.slots) {
      if (!s) continue;
      s.avatar.setVisible(v);
      s.label.setVisible(v);
    }
    this.dots.forEach((d) => d.setVisible(v));
    this.discs.forEach((d) => d.setVisible(v));
    this.boxes.forEach((b) => b?.box.setVisible(v));
    if (!v) this.goText.setVisible(false);
  }
}
