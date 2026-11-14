import Phaser from 'phaser';
import { BODY_FONT, FONT, H, VIEW, W } from '../config';
import type { DeviceId } from '../game/controls';
import { MEMORIES } from '../data/lore';
import { AREAS, areaCleared, areaTitle, areaUnlocked } from '../game/areas';
import { LEVELS } from '../game/level';
import { getCoins, giftsOf, hasAch, hasSeen, isDone, isFreePlay, isSecretDone, ownedUpgrades } from '../game/progress';
import { ABILITIES, hasAbility } from '../game/abilities';
import { UPGRADES } from '../game/upgrades';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';
import { backdrop } from '../ui/backdrop';
import { ACHIEVEMENTS } from '../game/achievements';

/**
 * Diário de Ossian: as memórias recuperadas (dá para rever cada uma), o progresso de cada mundo
 * (fases, presentes, área bônus e rei) e o que a caveira já carrega (ouro, aprimoramentos,
 * habilidades). Abre pelo mapa do mundo (botão DIÁRIO ou tecla L).
 */
export class JournalScene extends Phaser.Scene {
  lastData: { devices?: DeviceId[]; area?: string; page?: number } = {};

  constructor() {
    super('journal');
  }

  init(data: { devices?: DeviceId[]; area?: string; page?: number }): void {
    this.lastData = data;
  }

  create(): void {
    const P = VIEW.portrait;
    const HH = this.scale.height;
    const s = P ? 1.35 : 1;
    // Página 2: conquistas.
    const page = this.lastData.page ?? 0;
    pillButton(this, P ? W / 2 : W - 150, P ? HH - 260 : 52, page ? '◀ DIÁRIO' : 'CONQUISTAS ▶', () => this.scene.restart({ ...this.lastData, page: page ? 0 : 1 }), 260, 0xffe066).setScale(P ? 1.1 : 0.7).setDepth(5);
    const kb0 = this.input.keyboard!;
    for (const k of ['RIGHT', 'LEFT', 'TAB']) kb0.on(`keydown-${k}`, () => this.scene.restart({ ...this.lastData, page: page ? 0 : 1 }));
    if (page) {
      backdrop(this, 'CONQUISTAS');
      this.drawAchievements(P, HH, s);
      pillButton(this, W / 2, P ? HH - 140 : 675, '◀  MAPA', () => this.back(), 220).setScale(P ? 1.4 : 0.85);
      for (const k of ['ESC', 'L', 'ENTER']) kb0.on(`keydown-${k}`, () => this.back());
      return;
    }
    backdrop(this, 'DIÁRIO DE OSSIAN');

    // ---- Memórias (esquerda; em pé, em cima) ----
    const mx = P ? 60 : 50;
    const my = P ? 240 : 110;
    this.add.text(mx, my, 'MEMÓRIAS', { fontFamily: FONT, fontSize: `${Math.round(24 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 7 });
    MEMORIES.forEach((m, i) => {
      const seen = hasSeen(`memory-${i + 1}`) || isFreePlay();
      const col = P ? i % 3 : i % 3;
      const row = Math.floor(i / 3);
      const cw = P ? 360 : 180;
      const ch = P ? 120 : 70;
      const x = mx + col * (cw + 12);
      const y = my + 40 * s + row * (ch + 10);
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 1).fillRoundedRect(x - 3, y - 3, cw + 6, ch + 6, 10);
      g.fillStyle(seen ? 0xd9b478 : 0x2a3446, 1).fillRoundedRect(x, y, cw, ch, 8);
      this.add.text(x + 10, y + 8, `${i + 1}`, { fontFamily: FONT, fontSize: `${Math.round(18 * s)}px`, color: seen ? '#5a3a1c' : '#5f6b7c' });
      this.add
        .text(x + cw / 2, y + ch / 2 + 6, seen ? m.title : '???', { fontFamily: FONT, fontSize: `${Math.round(15 * s)}px`, color: seen ? '#3a2412' : '#6a7888', align: 'center', wordWrap: { width: cw - 20 } })
        .setOrigin(0.5);
      if (!seen) return;
      // Rever a memória (volta para o mapa do mundo depois).
      this.add
        .zone(x + cw / 2, y + ch / 2, cw, ch)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          sfx('select');
          this.scene.start('memory', { devices: this.lastData.devices, n: i + 1, area: this.lastData.area });
        });
    });

    // ---- Mundos (direita; em pé, embaixo) ----
    const wx = P ? 60 : 640;
    const wy = P ? my + 40 * s + 3 * (120 + 10) + 50 : 110;
    this.add.text(wx, wy, 'MUNDOS', { fontFamily: FONT, fontSize: `${Math.round(24 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 7 });
    const rowH = P ? 74 : 44;
    AREAS.forEach((a, i) => {
      const t = areaTitle(a);
      const open = areaUnlocked(a);
      const y = wy + 40 * s + i * rowH;
      const levels = a.levels.map((id) => LEVELS.find((l) => l.id === id)).filter((l) => !!l);
      const done = levels.filter((l) => isDone(l!.id)).length;
      const giftsMax = levels.filter((l) => l!.puzzle).length * 3;
      const gifts = levels.reduce((n, l) => n + (l!.puzzle ? giftsOf(l!.id).length : 0), 0);
      const bonus = LEVELS.find((l) => l.bonus?.area === a.id);
      const bonusTxt = bonus ? (isSecretDone(bonus.id) ? 'bônus ✓' : 'bônus —') : '';
      const king = areaCleared(a);
      const w = P ? 1160 : 590;
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 0.9).fillRoundedRect(wx, y, w, rowH - 6, 8);
      g.fillStyle(open ? t.color : 0x3a4656, 1).fillRect(wx, y, 8, rowH - 6);
      const txt = open
        ? `${t.name.toUpperCase()}  ·  ${done}/${levels.length} fases  ·  ${gifts}/${giftsMax} presentes  ·  ${bonusTxt}  ·  ${king ? 'rei ✓' : 'rei —'}`
        : '???';
      this.add.text(wx + 20, y + (rowH - 6) / 2, txt, { fontFamily: BODY_FONT, fontSize: `${Math.round((P ? 15 : 13.5) * s)}px`, color: open ? '#fff7dc' : '#6a7888' }).setOrigin(0, 0.5);
    });

    // ---- O que a caveira carrega ----
    const abil = ABILITIES.filter((a) => hasAbility(a.id)).map((a) => a.name);
    const ups = UPGRADES.filter((u) => ownedUpgrades().includes(u.id)).map((u) => u.name);
    const by = P ? HH - 470 : 560;
    this.add
      .text(W / 2, by, `OURO: ${getCoins()}   ·   HABILIDADES: ${abil.length ? abil.join(', ') : 'nenhuma'}\nAPRIMORAMENTOS: ${ups.length ? ups.join(', ') : 'nenhum (veja o Empório)'}`, {
        fontFamily: BODY_FONT,
        fontSize: `${Math.round(16 * s)}px`,
        color: '#fff7dc',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: P ? 1150 : 1180 },
      })
      .setOrigin(0.5, 0);
    this.add
      .text(W / 2, P ? HH - 350 : 630, 'toque numa memória para revê-la', { fontFamily: BODY_FONT, fontSize: `${Math.round(14 * s)}px`, color: '#9fb4c8' })
      .setOrigin(0.5);
    pillButton(this, W / 2, P ? HH - 140 : 675, '◀  MAPA', () => this.back(), 220).setScale(P ? 1.4 : 0.85);
    const kb = this.input.keyboard!;
    for (const k of ['ESC', 'L', 'ENTER']) kb.on(`keydown-${k}`, () => this.back());
    void H;
  }

  private drawAchievements(P: boolean, HH: number, s: number): void {
    const cols = P ? 2 : 3;
    const cw = P ? 560 : 380;
    const ch = P ? 96 : 52;
    const x0 = W / 2 - (cols * (cw + 12) - 12) / 2;
    const y0 = P ? 260 : 124;
    const got = ACHIEVEMENTS.filter((a) => hasAch(a.id)).length;
    this.add.text(W / 2, y0 - (P ? 36 : 14), `${got}/${ACHIEVEMENTS.length} conquistadas`, { fontFamily: FONT, fontSize: `${Math.round(18 * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5);
    ACHIEVEMENTS.forEach((a, i) => {
      const on = hasAch(a.id);
      const x = x0 + (i % cols) * (cw + 12);
      const y = y0 + Math.floor(i / cols) * (ch + 8);
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 1).fillRoundedRect(x - 2, y - 2, cw + 4, ch + 4, 10);
      g.fillStyle(on ? 0xdcb06e : 0x243246, 1).fillRoundedRect(x, y, cw, ch, 8);
      this.add.image(x + 24, y + ch / 2, 'spark').setTint(on ? 0xffe066 : 0x4a586a).setScale(P ? 0.9 : 0.6);
      this.add.text(x + 48, y + ch * 0.32, on ? a.name.toUpperCase() : '???', { fontFamily: FONT, fontSize: `${Math.round((P ? 15 : 14) * s)}px`, color: on ? '#3a2412' : '#6a7888' }).setOrigin(0, 0.5);
      this.add.text(x + 48, y + ch * 0.7, a.desc, { fontFamily: BODY_FONT, fontSize: `${Math.round((P ? 13 : 12) * s)}px`, color: on ? '#5a3a1c' : '#7f8ea0', wordWrap: { width: cw - 60 } }).setOrigin(0, 0.5);
    });
    void HH;
  }

  private back(): void {
    this.scene.start('world', { devices: this.lastData.devices, area: this.lastData.area });
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (pad && (pad.buttons[1]?.pressed || pad.buttons[0]?.pressed)) this.back();
  }
}
