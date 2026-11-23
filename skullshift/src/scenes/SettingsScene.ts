import Phaser from 'phaser';
import { BODY_FONT, FONT, VIEW, W } from '../config';
import { DEFAULTS, resetSettings, setSetting, settings, sfx, type Settings } from '../game/settings';
import { backdrop } from '../ui/backdrop';
import { pillButton } from '../ui/devices';
import { noTr, tr } from '../i18n';
import { applyResolution, isDesktop } from '../game/platform';

const INK = 0x1d1a2b;
/** Em pé: altura da primeira linha de abas e distância entre as linhas. */
const TAB_Y = 270;
const TAB_STEP = 140;

type Row =
  | { key: keyof Settings; label: string; help: string; kind: 'slider'; min: number; max: number; fmt?: (v: number) => string }
  | { key: keyof Settings; label: string; help: string; kind: 'toggle' }
  | { key: keyof Settings; label: string; help: string; kind: 'choice'; options: string[]; desktop?: boolean }
  | { key: 'fullscreen'; label: string; help: string; kind: 'fullscreen' };

const TABS: Array<{ name: string; rows: Row[] }> = [
  {
    name: 'JOGO',
    rows: [
      { key: 'textSpeed', label: 'Velocidade do texto', help: 'Quão rápido as falas da história aparecem.', kind: 'choice', options: ['LENTO', 'NORMAL', 'RÁPIDO', 'INSTANTÂNEO'] },
      { key: 'quips', label: 'Comentários da caveira', help: 'Balão sarcástico na primeira vez em cada forma.', kind: 'toggle' },
      { key: 'shake', label: 'Tremor da tela', help: 'Intensidade do tremor em impactos e explosões.', kind: 'slider', min: 0, max: 10, fmt: (v) => `${v * 10}%` },
    ],
  },
  {
    name: 'TELA',
    rows: [
      { key: 'fullscreen', label: 'Tela cheia', help: 'Liga ou desliga a tela cheia.', kind: 'fullscreen' },
      { key: 'resolution', label: 'Resolução da janela', help: 'Tamanho da janela do jogo no computador (fora da tela cheia).', kind: 'choice', options: ['ATUAL', '1280 × 720', '1600 × 900', '1920 × 1080', '2560 × 1440'], desktop: true },
      { key: 'brightness', label: 'Brilho', help: 'Clareia ou escurece a imagem do jogo.', kind: 'slider', min: 5, max: 15, fmt: (v) => `${v * 10}%` },
    ],
  },
  {
    name: 'ÁUDIO',
    rows: [
      { key: 'master', label: 'Volume geral', help: 'Volume de todos os sons.', kind: 'slider', min: 0, max: 10 },
      { key: 'sfx', label: 'Efeitos sonoros', help: 'Pulos, golpes, portas, explosões (sons 8-bit).', kind: 'slider', min: 0, max: 10 },
      { key: 'music', label: 'Música', help: 'Trilha 8-bit: um tema para cada área, chefes e memórias.', kind: 'slider', min: 0, max: 10 },
    ],
  },
  {
    name: 'CONTROLES',
    rows: [
      { key: 'doubleTapSprint', label: 'Correr com toque duplo', help: 'Tocar 2× na direção e segurar para correr.', kind: 'toggle' },
      { key: 'touchSize', label: 'Botões de toque: tamanho', help: 'Tamanho dos botões na tela do celular.', kind: 'choice', options: ['PEQUENO', 'MÉDIO', 'GRANDE'] },
      { key: 'touchOpacity', label: 'Botões de toque: opacidade', help: 'Quanto os botões de toque aparecem.', kind: 'slider', min: 2, max: 10, fmt: (v) => `${v * 10}%` },
      { key: 'vibrate', label: 'Vibração', help: 'Vibração curta no celular ao acertar, levar dano e pegar itens.', kind: 'toggle' },
    ],
  },
  {
    name: 'ACESSIBILIDADE',
    rows: [
      { key: 'colorblind', label: 'Cores para daltonismo', help: 'Jogador 2 em laranja em vez de vermelho.', kind: 'toggle' },
      { key: 'flashes', label: 'Clarões na tela', help: 'Desligue para evitar flashes (relâmpagos, explosões).', kind: 'toggle' },
      { key: 'motionFx', label: 'Efeitos de movimento', help: 'Esticar e achatar ao pular e o rastro na corrida.', kind: 'toggle' },
      { key: 'simpleTransition', label: 'Transição simples', help: 'Troca de tela só escurecendo, sem as transições temáticas.', kind: 'toggle' },
    ],
  },
];

// Opções só da versão de computador (resolução da janela) somem no navegador e no celular.
for (const t of TABS) t.rows = t.rows.filter((r) => !('desktop' in r && r.desktop) || isDesktop());

/**
 * Configurações: abas na lateral (Jogo, Tela, Áudio, Controles, Acessibilidade) e, à direita,
 * cada opção com sua explicação e controle (− / +, DESLIGADO/LIGADO ou ◀ ▶). Salva sozinho.
 * Abre pelo menu inicial e pela pausa.
 */
export class SettingsScene extends Phaser.Scene {
  private tab = 0;
  private row = 0;
  private from: 'menu' | 'pause' = 'menu';
  private panel?: Phaser.GameObjects.Container;
  private tabs: Phaser.GameObjects.Container[] = [];
  private prevPad = { u: true, d: true, l: true, r: true, a: true, b: true, lb: true, rb: true };
  lastData: { from?: 'menu' | 'pause' } = {};

  constructor() {
    super('settings');
  }

  init(data: { from?: 'menu' | 'pause' }): void {
    this.lastData = data;
    this.from = data.from ?? 'menu';
    this.row = 0;
    this.tabs = [];
    this.prevPad = { u: true, d: true, l: true, r: true, a: true, b: true, lb: true, rb: true };
  }

  create(): void {
    backdrop(this, 'CONFIGURAÇÕES');
    const P = VIEW.portrait;
    const HH = this.scale.height;
    // Abas.
    TABS.forEach((t, i) => {
      // Em pé: três por linha, cada linha centralizada.
      const perRow = 3;
      const line = Math.floor(i / perRow);
      const inLine = Math.min(perRow, TABS.length - line * perRow);
      const x = P ? W / 2 + ((i % perRow) - (inLine - 1) / 2) * 400 : 170;
      const y = P ? TAB_Y + line * TAB_STEP : 150 + i * 72;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      // Já traduzido (sem o encaixe automático na largura da palavra original, que encolhia "ANZEIGE").
      const txt = noTr(this.add.text(0, 0, '', { fontFamily: FONT, fontSize: P ? '42px' : '22px', color: '#fff7dc' }).setOrigin(0.5)).setText(tr(t.name));
      // Nome longo (outros idiomas): encolhe só o necessário para caber na aba.
      const maxW = (P ? 380 : 250) - 28;
      if (txt.width > maxW) txt.setScale(maxW / txt.width);
      c.add([g, txt]);
      c.setSize(P ? 380 : 250, P ? 116 : 56).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(i));
      this.tabs.push(c);
    });
    const by = P ? HH - 150 : 668;
    pillButton(this, P ? 330 : 400, by, 'RESTAURAR PADRÃO', () => this.reset(), 300, 0xe7eef2).setScale(P ? 1.7 : 0.85);
    pillButton(this, P ? 960 : W - 170, by, '◀  VOLTAR', () => this.back(), 230, 0xffe066).setScale(P ? 1.7 : 1);
    // A dica de teclado só faz sentido deitado (no celular em pé, tudo é por toque).
    if (!P) this.add
      .text(820, 612, '↑ ↓ opção  ·  ← → ajustar  ·  Q / E (LB / RB) aba  ·  Esc / B voltar', {
        fontFamily: BODY_FONT,
        fontSize: P ? '26px' : '15px',
        color: '#fff7dc',
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.moveRow(-1));
    kb.on('keydown-W', () => this.moveRow(-1));
    kb.on('keydown-DOWN', () => this.moveRow(1));
    kb.on('keydown-S', () => this.moveRow(1));
    kb.on('keydown-LEFT', () => this.adjust(-1));
    kb.on('keydown-A', () => this.adjust(-1));
    kb.on('keydown-RIGHT', () => this.adjust(1));
    kb.on('keydown-D', () => this.adjust(1));
    kb.on('keydown-ENTER', () => this.adjust(1));
    kb.on('keydown-Q', () => this.setTab(this.tab - 1));
    kb.on('keydown-E', () => this.setTab(this.tab + 1));
    kb.on('keydown-TAB', () => this.setTab(this.tab + 1));
    kb.on('keydown-ESC', () => this.back());
    this.setTab(this.tab);
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find((p) => p && p.connected);
    if (!pad) return;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const ax = pad.axes[0]?.getValue() ?? 0;
    const ay = pad.axes[1]?.getValue() ?? 0;
    const st = { u: b(12) || ay < -0.5, d: b(13) || ay > 0.5, l: b(14) || ax < -0.5, r: b(15) || ax > 0.5, a: b(0), b: b(1) || b(9), lb: b(4), rb: b(5) };
    const p = this.prevPad;
    if (st.u && !p.u) this.moveRow(-1);
    if (st.d && !p.d) this.moveRow(1);
    if (st.l && !p.l) this.adjust(-1);
    if (st.r && !p.r) this.adjust(1);
    if (st.a && !p.a) this.adjust(1);
    if (st.lb && !p.lb) this.setTab(this.tab - 1);
    if (st.rb && !p.rb) this.setTab(this.tab + 1);
    if (st.b && !p.b) this.back();
    this.prevPad = st;
  }

  private setTab(i: number): void {
    this.tab = Phaser.Math.Wrap(i, 0, TABS.length);
    this.row = Math.min(this.row, TABS[this.tab].rows.length - 1);
    const P = VIEW.portrait;
    this.tabs.forEach((c, k) => {
      const g = c.list[0] as Phaser.GameObjects.Graphics;
      const t = c.list[1] as Phaser.GameObjects.Text;
      const on = k === this.tab;
      const w = P ? 380 : 250;
      const h = P ? 116 : 56;
      g.clear();
      g.fillStyle(INK, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 18);
      g.fillStyle(on ? 0xffe066 : 0x10223a, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      t.setColor(on ? '#10223a' : '#fff7dc');
    });
    sfx('select');
    this.drawPanel();
  }

  private moveRow(d: number): void {
    const n = TABS[this.tab].rows.length;
    this.row = Phaser.Math.Wrap(this.row + d, 0, n);
    sfx('select');
    this.drawPanel();
  }

  private value(r: Row): number | boolean {
    if (r.kind === 'fullscreen') return this.scale.isFullscreen;
    return settings()[r.key];
  }

  private adjust(d: number, row = this.row): void {
    const r = TABS[this.tab].rows[row];
    if (!r) return;
    if (r.kind === 'fullscreen') {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
      this.time.delayedCall(250, () => this.drawPanel());
    } else if (r.kind === 'toggle') setSetting(r.key, !settings()[r.key] as never);
    else if (r.kind === 'slider') setSetting(r.key, Phaser.Math.Clamp((settings()[r.key] as number) + d, r.min, r.max) as never);
    else {
      setSetting(r.key, Phaser.Math.Wrap((settings()[r.key] as number) + d, 0, r.options.length) as never);
      if (r.key === 'resolution') applyResolution(settings().resolution);
    }
    this.row = row;
    sfx('select');
    this.drawPanel();
  }

  private drawPanel(): void {
    this.panel?.destroy();
    const P = VIEW.portrait;
    const px = P ? 50 : 330;
    const py = P ? TAB_Y + Math.ceil(TABS.length / 3) * TAB_STEP - 20 : 110;
    const pw = P ? W - 100 : W - 380;
    const tab = TABS[this.tab];
    // Em pé: as linhas crescem para ocupar a altura livre (até os botões de baixo), e tudo
    // dentro delas cresce junto (k), na mesma proporção para todas as abas.
    const free = this.scale.height - 300 - py - 30;
    // Deitado: até 3 opções com folga; com 4, as linhas encolhem para caber acima dos botões.
    const rowH = P ? Phaser.Math.Clamp(free / tab.rows.length, 250, 460) : Math.min(150, 440 / tab.rows.length);
    // Sobrou espaço (abas com poucas opções): o painel fica no meio do vão.
    const top = P ? py + Math.max(0, (free - tab.rows.length * rowH) / 2) : py;
    const k = P ? rowH / 250 : 1;
    const fs = (n: number) => `${Math.round(n * k)}px`;
    const items: Phaser.GameObjects.GameObject[] = [];
    const bg = this.add.graphics();
    bg.fillStyle(INK, 0.92).fillRoundedRect(0, 0, pw, tab.rows.length * rowH + 30, 20);
    bg.lineStyle(3, 0xfff7dc, 0.7).strokeRoundedRect(0, 0, pw, tab.rows.length * rowH + 30, 20);
    items.push(bg);
    tab.rows.forEach((r, i) => {
      const y = 20 + i * rowH;
      const on = i === this.row;
      if (on) {
        const hl = this.add.graphics();
        hl.fillStyle(0x2a5bb8, 0.55).fillRoundedRect(10, y, pw - 20, rowH - 10, 14);
        items.push(hl);
      }
      const hit = this.add.zone(pw / 2, y + rowH / 2, pw - 20, rowH - 10).setInteractive().on('pointerdown', () => {
        this.row = i;
        this.drawPanel();
      });
      items.push(hit);
      items.push(this.add.text(30, y + 14, r.label, { fontFamily: FONT, fontSize: P ? fs(40) : '24px', color: on ? '#ffe066' : '#fff7dc' }));
      items.push(this.add.text(30, y + (P ? 64 * k : 44 * (rowH / 150)), r.help, { fontFamily: BODY_FONT, fontSize: P ? fs(28) : '16px', color: '#bfd0e0', wordWrap: { width: pw - 60 } }));
      const cy = y + (P ? 170 * k : 104 * (rowH / 150));
      const v = this.value(r);
      if (r.kind === 'toggle' || r.kind === 'fullscreen') {
        // DESLIGADO | LIGADO
        const ww = P ? 250 * k : 140;
        const bh = P ? 56 * k : 44;
        for (const [k, lab] of [[0, 'DESLIGADO'], [1, 'LIGADO']] as const) {
          const sel = (k === 1) === !!v;
          const x = pw / 2 - ww + k * ww;
          const g = this.add.graphics();
          g.fillStyle(sel ? (k ? 0x58b947 : 0x8a95a3) : 0x10223a, 1).fillRoundedRect(x, cy - bh / 2, ww - 6, bh, 10);
          items.push(g);
          items.push(this.add.text(x + (ww - 6) / 2, cy, lab, { fontFamily: FONT, fontSize: P ? fs(28) : '17px', color: sel ? '#10223a' : '#8a95a3' }).setOrigin(0.5));
          items.push(
            this.add.zone(x + (ww - 6) / 2, cy, ww - 6, bh).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
              if ((k === 1) !== !!this.value(r)) this.adjust(0, i);
            }),
          );
        }
      } else if (r.kind === 'slider') {
        // − ●●●○○○ +
        const steps = r.max - r.min;
        const x0 = P ? 120 * k : 110;
        const x1 = pw - (P ? 120 * k : 110);
        const dot = P ? k * 1.3 : 1;
        const g = this.add.graphics();
        g.fillStyle(0xfff7dc, 0.35).fillRect(x0, cy - 2, x1 - x0, 4);
        for (let k = 0; k <= steps; k++) {
          const x = x0 + ((x1 - x0) * k) / steps;
          const filled = k <= (v as number) - r.min;
          g.fillStyle(INK, 1).fillCircle(x, cy, 10 * dot);
          g.fillStyle(filled ? 0xffe066 : 0x5f6872, 1).fillCircle(x, cy, 7 * dot);
        }
        const kx = x0 + ((x1 - x0) * ((v as number) - r.min)) / steps;
        g.fillStyle(INK, 1).fillCircle(kx, cy, 17 * dot);
        g.fillStyle(0xfff7dc, 1).fillCircle(kx, cy, 13 * dot);
        items.push(g);
        items.push(this.add.text(kx, cy + 30 * dot, r.fmt ? r.fmt(v as number) : String(v), { fontFamily: FONT, fontSize: P ? fs(32) : '18px', color: '#ffe066' }).setOrigin(0.5, 0));
        for (const [dx, lab] of [[-1, '−'], [1, '+']] as const) {
          const bx = dx < 0 ? (P ? 62 * k : 55) : pw - (P ? 62 * k : 55);
          const b = this.add.circle(bx, cy, P ? 38 * k : 22, 0xffe066).setStrokeStyle(4, INK).setInteractive({ useHandCursor: true });
          b.on('pointerdown', () => this.adjust(dx, i));
          items.push(b);
          items.push(this.add.text(bx, cy, lab, { fontFamily: FONT, fontSize: P ? fs(44) : '26px', color: '#10223a' }).setOrigin(0.5));
        }
      } else {
        // ◀ VALOR ▶
        items.push(this.add.text(pw / 2, cy, r.options[v as number] ?? '', { fontFamily: FONT, fontSize: P ? fs(38) : '22px', color: '#ffe066' }).setOrigin(0.5));
        for (const dx of [-1, 1]) {
          items.push(
            this.add
              .text(pw / 2 + dx * (P ? Math.min(330 * k, pw / 2 - 70) : 170), cy, dx < 0 ? '◀' : '▶', { fontFamily: FONT, fontSize: P ? fs(48) : '28px', color: '#fff7dc' })
              .setOrigin(0.5)
              .setPadding(12)
              .setInteractive({ useHandCursor: true })
              .on('pointerdown', () => this.adjust(dx, i)),
          );
        }
      }
    });
    this.panel = this.add.container(px, top, items);
  }

  private reset(): void {
    resetSettings();
    void DEFAULTS;
    this.drawPanel();
  }

  private back(): void {
    sfx('select');
    if (this.from === 'pause') {
      this.scene.stop();
      this.scene.resume('ui');
    } else this.scene.start('menu', { stage: 'modes' });
  }
}
