import Phaser from 'phaser';
import { BODY_FONT, FONT, H, VIEW, W } from '../config';
import type { DeviceId } from '../game/controls';
import { CRACKS, MEMORIES } from '../data/lore';
import { AREAS, areaCleared, areaOfLevel, areaTitle, areaUnlocked, levelIndex } from '../game/areas';
import { LEVELS } from '../game/level';
import { getCoins, giftsOf, hasAch, hasSeen, isDone, isFreePlay, isSecretDone, ownedUpgrades } from '../game/progress';
import { ABILITIES, hasAbility } from '../game/abilities';
import { UPGRADES } from '../game/upgrades';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';
import { noTr, tr, trf } from '../i18n';
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
    // Em pé a largura virtual é 1280, mas o celular é estreito: letras bem maiores.
    const s = P ? 2 : 1;
    // Páginas: 0 diário, 1 sonhos (rachaduras), 2 conquistas. Em pé, os botões ficam lado a lado no rodapé.
    const page = this.lastData.page ?? 0;
    const go = (d: number) => this.scene.restart({ ...this.lastData, page: Phaser.Math.Wrap(page + d, 0, 3) });
    const next = ['SONHOS ▶', 'CONQUISTAS ▶', '◀ DIÁRIO'][page];
    pillButton(this, P ? W / 2 - 250 : W - 150, P ? HH - 110 : 52, next, () => go(1), 260, 0xffe066).setScale(P ? 1.55 : 0.7).setDepth(5);
    const kb0 = this.input.keyboard!;
    kb0.on('keydown-RIGHT', () => go(1));
    kb0.on('keydown-TAB', () => go(1));
    kb0.on('keydown-LEFT', () => go(-1));
    if (page === 1) {
      backdrop(this, 'SONHOS');
      this.drawDreams(P, HH, s);
      pillButton(this, P ? W / 2 + 280 : W / 2, P ? HH - 110 : 675, '◀  MAPA', () => this.back(), 220).setScale(P ? 1.55 : 0.85);
      for (const k of ['ESC', 'L', 'ENTER']) kb0.on(`keydown-${k}`, () => this.back());
      return;
    }
    if (page === 2) {
      backdrop(this, 'CONQUISTAS');
      this.drawAchievements(P, HH, s);
      pillButton(this, P ? W / 2 + 280 : W / 2, P ? HH - 110 : 675, '◀  MAPA', () => this.back(), 220).setScale(P ? 1.55 : 0.85);
      for (const k of ['ESC', 'L', 'ENTER']) kb0.on(`keydown-${k}`, () => this.back());
      return;
    }
    backdrop(this, 'DIÁRIO DE OSSIAN');

    // ---- Memórias (esquerda; em pé, em cima) ----
    const mx = P ? 50 : 50;
    const my = P ? 230 : 110;
    this.add.text(mx, my, 'MEMÓRIAS', { fontFamily: FONT, fontSize: `${Math.round((P ? 20 : 24) * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 7 });
    MEMORIES.forEach((m, i) => {
      const seen = hasSeen(`memory-${i + 1}`) || isFreePlay();
      const col = P ? i % 3 : i % 3;
      const row = Math.floor(i / 3);
      const cw = P ? 382 : 180;
      const ch = P ? 140 : 70;
      const x = mx + col * (cw + 12);
      const y = my + (P ? 70 : 40) + row * (ch + 10);
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 1).fillRoundedRect(x - 3, y - 3, cw + 6, ch + 6, 10);
      g.fillStyle(seen ? 0xd9b478 : 0x2a3446, 1).fillRoundedRect(x, y, cw, ch, 8);
      this.add.text(x + 10, y + 8, `${i + 1}`, { fontFamily: FONT, fontSize: `${Math.round((P ? 14 : 18) * s)}px`, color: seen ? '#5a3a1c' : '#5f6b7c' });
      this.add
        .text(x + cw / 2, y + ch / 2 + 6, seen ? m.title : '???', { fontFamily: FONT, fontSize: `${Math.round((P ? 16 : 15) * s)}px`, color: seen ? '#3a2412' : '#6a7888', align: 'center', wordWrap: { width: cw - 20 } })
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
    const wx = P ? 50 : 640;
    const wy = P ? my + 70 + 3 * (140 + 10) + 40 : 110;
    this.add.text(wx, wy, 'MUNDOS', { fontFamily: FONT, fontSize: `${Math.round((P ? 20 : 24) * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 7 });
    // Em pé as linhas dividem a altura livre até o rodapé (ouro, dica e botões).
    const listTop = wy + (P ? 70 : 40);
    const rowH = P ? Phaser.Math.Clamp((HH - listTop - 420) / AREAS.length, 96, 130) : 44;
    AREAS.forEach((a, i) => {
      const t = areaTitle(a);
      const open = areaUnlocked(a);
      const y = listTop + i * rowH;
      const levels = a.levels.map((id) => LEVELS.find((l) => l.id === id)).filter((l) => !!l);
      const done = levels.filter((l) => isDone(l!.id)).length;
      const giftsMax = levels.filter((l) => l!.puzzle).length * 3;
      const gifts = levels.reduce((n, l) => n + (l!.puzzle ? giftsOf(l!.id).length : 0), 0);
      const bonus = LEVELS.find((l) => l.bonus?.area === a.id);
      // (sem "✓": a fonte do jogo não tem esse símbolo e ele sumia)
      const bonusTxt = bonus ? (isSecretDone(bonus.id) ? 'bônus feito' : 'bônus —') : '';
      const king = areaCleared(a);
      const w = P ? W - 100 : 590;
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 0.9).fillRoundedRect(wx, y, w, rowH - 6, 8);
      g.fillStyle(open ? t.color : 0x3a4656, 1).fillRect(wx, y, 8, rowH - 6);
      const txt = open
        ? `${t.name.toUpperCase()}  ·  ${done}/${levels.length} fases  ·  ${gifts}/${giftsMax} presentes  ·  ${bonusTxt}  ·  ${king ? 'rei vencido' : 'rei —'}`
        : '???';
      if (P && open) {
        // Em pé: nome em cima, números embaixo (numa linha só a letra ficaria miúda).
        const mid = y + (rowH - 6) / 2;
        noTr(this.add.text(wx + 24, mid - 4, '', { fontFamily: FONT, fontSize: '32px', color: '#fff7dc' }).setOrigin(0, 1)).setText(tr(t.name).toUpperCase());
        const stats = [trf('{0}/{1} fases  ·  {2}/{3} presentes', done, levels.length, gifts, giftsMax), bonusTxt ? tr(bonusTxt) : '', tr(king ? 'rei vencido' : 'rei —')].filter(Boolean).join('  ·  ');
        const st = noTr(this.add.text(wx + 24, mid + 4, '', { fontFamily: BODY_FONT, fontSize: '28px', color: '#d8e4f0' }).setOrigin(0, 0)).setText(stats);
        if (st.width > w - 40) st.setScale((w - 40) / st.width);
      } else {
        const line = this.add.text(wx + 22, y + (rowH - 6) / 2, txt, { fontFamily: BODY_FONT, fontSize: `${Math.round((P ? 16 : 13.5) * s)}px`, color: open ? '#fff7dc' : '#6a7888' }).setOrigin(0, 0.5);
        if (line.width > w - 36) line.setScale((w - 36) / line.width);
      }
    });

    // ---- O que a caveira carrega ----
    const abil = ABILITIES.filter((a) => hasAbility(a.id)).map((a) => a.name);
    const ups = UPGRADES.filter((u) => ownedUpgrades().includes(u.id)).map((u) => u.name);
    const by = P ? HH - 380 : 560;
    this.add
      .text(W / 2, by, `OURO: ${getCoins()}   ·   HABILIDADES: ${abil.length ? abil.join(', ') : 'nenhuma'}\nAPRIMORAMENTOS: ${ups.length ? ups.join(', ') : 'nenhum (veja o Empório)'}`, {
        fontFamily: BODY_FONT,
        fontSize: `${Math.round((P ? 14 : 16) * s)}px`,
        color: '#fff7dc',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: P ? 1150 : 1180 },
      })
      .setOrigin(0.5, 0);
    this.add
      .text(W / 2, P ? HH - 210 : 630, 'toque numa memória para revê-la', { fontFamily: BODY_FONT, fontSize: `${Math.round(14 * s)}px`, color: '#9fb4c8' })
      .setOrigin(0.5);
    pillButton(this, P ? W / 2 + 280 : W / 2, P ? HH - 110 : 675, '◀  MAPA', () => this.back(), 220).setScale(P ? 1.55 : 0.85);
    const kb = this.input.keyboard!;
    for (const k of ['ESC', 'L', 'ENTER']) kb.on(`keydown-${k}`, () => this.back());
    void H;
  }

  /**
   * Sonhos: cada memória que o Xamã plantou no prólogo, ao lado do que o mundo de verdade mostrou
   * (a rachadura). O que ainda não foi visto aparece como ???.
   */
  private drawDreams(P: boolean, HH: number, s: number): void {
    const list = Object.entries(CRACKS);
    const found = list.filter(([id]) => hasSeen(`crack-${id}`)).length;
    const y0 = P ? 300 : 128;
    this.add.text(W / 2, y0 - (P ? 60 : 22), trf('Rachaduras encontradas: {0}/{1}', found, list.length), { fontFamily: FONT, fontSize: `${Math.round((P ? 16 : 18) * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5);
    const rowH = P ? Phaser.Math.Clamp((HH - y0 - 260) / list.length, 120, 190) : (HH - y0 - 96) / list.length;
    const w = P ? W - 80 : W - 80;
    const x = 40;
    const half = P ? w : (w - 200) / 2;
    list.forEach(([id, c], i) => {
      const y = y0 + i * rowH;
      const a = areaOfLevel(levelIndex(id));
      const t = a ? areaTitle(a) : undefined;
      const dreamt = isDone(c.dream) || isFreePlay();
      const seen = hasSeen(`crack-${id}`) || isFreePlay();
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 0.92).fillRoundedRect(x, y, w, rowH - 6, 8);
      g.fillStyle(t?.color ?? 0x3a4656, 1).fillRect(x, y, 8, rowH - 6);
      const fs = `${Math.round((P ? 13 : 12.5) * s)}px`;
      // Já traduzidos aqui (o texto do sonho/rachadura entra no molde inteiro).
      const line = (tx: number, ty: number, text: string, color: string, ww: number) => noTr(this.add.text(tx, ty, '', { fontFamily: BODY_FONT, fontSize: fs, color, wordWrap: { width: ww } })).setText(text);
      const dreamTxt = dreamt ? trf('Sonho: {0}', tr(c.said)) : tr('Sonho: ???');
      const seenTxt = seen ? trf('Lá fora: {0}', tr(c.text)) : tr('Lá fora: ???');
      if (P) {
        noTr(this.add.text(x + 22, y + 10, '', { fontFamily: FONT, fontSize: '26px', color: '#fff7dc' })).setText(t ? tr(t.name).toUpperCase() : '');
        line(x + 22, y + 44, dreamTxt, '#c8b8ff', w - 40);
        line(x + 22, y + 44 + (rowH - 60) / 2, seenTxt, seen ? '#ffe9b8' : '#6a7888', w - 40);
        return;
      }
      const nm = noTr(this.add.text(x + 22, y + (rowH - 6) / 2, '', { fontFamily: FONT, fontSize: '15px', color: '#fff7dc', wordWrap: { width: 170 } }).setOrigin(0, 0.5)).setText(t ? tr(t.name).toUpperCase() : '');
      if (nm.height > rowH - 10) nm.setScale((rowH - 10) / nm.height);
      const fit = (o: Phaser.GameObjects.Text) => o.height > rowH - 10 && o.setScale((rowH - 10) / o.height);
      fit(line(x + 200, y + (rowH - 6) / 2, dreamTxt, '#c8b8ff', half - 20).setOrigin(0, 0.5));
      fit(line(x + 200 + half, y + (rowH - 6) / 2, seenTxt, seen ? '#ffe9b8' : '#6a7888', half - 10).setOrigin(0, 0.5));
    });
  }

  private drawAchievements(P: boolean, HH: number, s: number): void {
    const cols = P ? 2 : 3;
    const cw = P ? 580 : 380;
    const y0 = P ? 280 : 124;
    // Em pé os cartões dividem a altura livre (até o rodapé com os botões).
    const rows = Math.ceil(ACHIEVEMENTS.length / cols);
    const ch = P ? Phaser.Math.Clamp((HH - y0 - 240) / rows - 8, 100, 190) : Math.min(52, (HH - y0 - 92) / rows - 8);
    const x0 = W / 2 - (cols * (cw + 12) - 12) / 2;
    const got = ACHIEVEMENTS.filter((a) => hasAch(a.id)).length;
    this.add.text(W / 2, y0 - (P ? 44 : 14), `${got}/${ACHIEVEMENTS.length} conquistadas`, { fontFamily: FONT, fontSize: `${Math.round((P ? 16 : 18) * s)}px`, color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5);
    ACHIEVEMENTS.forEach((a, i) => {
      const on = hasAch(a.id);
      const x = x0 + (i % cols) * (cw + 12);
      const y = y0 + Math.floor(i / cols) * (ch + 8);
      const g = this.add.graphics();
      g.fillStyle(0x10223a, 1).fillRoundedRect(x - 2, y - 2, cw + 4, ch + 4, 10);
      g.fillStyle(on ? 0xdcb06e : 0x243246, 1).fillRoundedRect(x, y, cw, ch, 8);
      this.add.image(x + (P ? 34 : 24), y + ch / 2, 'spark').setTint(on ? 0xffe066 : 0x4a586a).setScale(P ? 1.2 : 0.6);
      const tx = x + (P ? 68 : 48);
      const nm = this.add.text(tx, y + ch * 0.3, on ? a.name.toUpperCase() : '???', { fontFamily: FONT, fontSize: `${Math.round((P ? 16 : 14) * s)}px`, color: on ? '#3a2412' : '#6a7888' }).setOrigin(0, 0.5);
      if (nm.width > cw - (tx - x) - 12) nm.setScale((cw - (tx - x) - 12) / nm.width);
      this.add.text(tx, y + ch * 0.68, a.desc, { fontFamily: BODY_FONT, fontSize: `${Math.round((P ? 14.5 : 12) * s)}px`, color: on ? '#5a3a1c' : '#7f8ea0', wordWrap: { width: cw - (tx - x) - 12 } }).setOrigin(0, 0.5);
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
