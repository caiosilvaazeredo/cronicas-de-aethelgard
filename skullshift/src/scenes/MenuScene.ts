import Phaser from 'phaser';
import { playMusic } from '../game/music';
import { BODY_FONT, FONT, H, VIEW, W } from '../config';
import { pillButton } from '../ui/devices';
import { loadingVignette } from '../ui/loading';
import { LEVELS } from '../game/level';
import { setFreePlay } from '../game/progress';
import { sfx } from '../game/settings';

const OPTIONS = [
  { label: 'HISTÓRIA  ·  1 jogador', mode: 'story' },
  { label: 'VERSUS  ·  2 jogadores', mode: 'versus' },
  { label: 'LIVRE  ·  testes', mode: 'free' },
  { label: 'CONFIGURAÇÕES', mode: 'settings' },
] as const;

export class MenuScene extends Phaser.Scene {
  private index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private prevPad = { up: false, down: false, ok: true };
  /** Tela inicial (logo + JOGAR) ou escolha de modo. */
  private stage: 'title' | 'modes' = 'title';

  constructor() {
    super('menu');
  }

  /** Dados para recriar a cena quando o celular gira. */
  lastData: { stage?: 'title' | 'modes'; level?: number } = {};
  /** Fase escolhida (0, 1, 2). */
  private level = 0;
  private prevLR = { l: false, r: false };
  private levelText?: Phaser.GameObjects.Text;
  private levelRow: Phaser.GameObjects.Text[] = [];

  init(data: { stage?: 'title' | 'modes'; level?: number }): void {
    this.lastData = data;
    this.level = data.level ?? this.level;
    this.stage = data.stage ?? 'title';
    this.prevPad = { up: false, down: false, ok: true };
  }

  create(): void {
    playMusic('menu');
    this.texts = [];
    this.levelRow = [];
    const P = VIEW.portrait;
    const HH = this.scale.height;
    // Linha do chão: deitado como no jogo; em pé, um pouco abaixo do meio.
    const gy = P ? Math.round(HH * 0.6) : 432;
    // Cenário vivo: céu, nuvens passando, castelo e torre ao fundo, mar com espuma, árvores e
    // arbustos balançando. No chão, os personagens passam em cenas curtas (perseguições,
    // transformações, desfile...) e, lá no alto, o Xamã observa da sua nuvem.
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, ((gy + 68) * 720) / 500);
    const clouds: Array<[string, number, number, number, number]> = [
      ['cloud_01', 40, P ? 470 : 70, 1, 9],
      ['cloud_03', 560, P ? 40 + gy * 0.45 : 40, 0.9, 14],
      ['cloud_05', 900, P ? 110 + gy * 0.6 : 110, 1, 7],
      ['cloud_02', 1300, P ? gy * 0.3 : 230, 0.6, 18],
      ['cloud_04', 260, P ? gy * 0.72 : 290, 0.5, 22],
    ];
    const drifting = clouds.map(([k, x, y, sc, v]) => ({ img: this.add.image(x, y, k).setOrigin(0).setScale(sc).setAlpha(sc < 0.8 ? 0.8 : 1), v }));
    this.events.on('update', (_t: number, dt: number) => {
      for (const c of drifting) {
        c.img.x += (c.v * dt) / 1000;
        if (c.img.x > W + 40) c.img.x = -c.img.displayWidth - 40;
      }
    });
    // Mar: corpo, degradê de profundidade, cristas e espuma ondulada.
    this.add.rectangle(0, gy + 68, W, HH - gy - 68, 0x39b5fd).setOrigin(0);
    this.add.image(0, gy + 68, 'water_grad').setOrigin(0).setDisplaySize(W, Math.max(200, HH - gy - 68));
    const wavesA = this.add.tileSprite(0, gy + 80, W, HH - gy - 80, 'waves').setOrigin(0).setAlpha(0.5);
    const foam = this.add.tileSprite(0, gy + 100, W, 28, 'water_top').setOrigin(0).setAlpha(0.8).setDepth(6);
    this.events.on('update', (t: number) => {
      wavesA.tilePositionX = t * 0.02;
      wavesA.tilePositionY = Math.sin(t / 900) * 3;
      foam.tilePositionX = Math.round((t * 0.03) / 2) * 2;
      foam.tilePositionY = Math.round(Math.sin(t / 560) * 1.5) * 2;
    });
    // Construções do reino ao fundo (atrás da grama).
    const bs = P ? 1.5 : 1;
    // Assentadas na grama: a base do desenho na linha do chão, com sombra embaixo.
    const base = gy + 30;
    const stand = (x: number, key: string, foot: number, sc: number) => {
      const img = this.add.image(x, base, key).setOrigin(0.5, foot).setScale(sc * bs).setDepth(3);
      this.add.ellipse(x, base - 2, img.displayWidth * 0.82, 20 * bs, 0x10223a, 0.25).setDepth(2.5);
    };
    stand(P ? 250 : 200, 'bld_blue_castle', 249 / 256, 0.9);
    stand(P ? 1090 : 1110, 'bld_red_tower', 230 / 256, 1);
    stand(P ? 860 : 930, 'bld_blue_house1', 173 / 192, 0.9);
    if (!P) stand(520, 'bld_blue_house3', 172 / 192, 0.8);
    for (const [x, sc] of [[40, 0.9], [400, 0.8], [790, 0.85], [1240, 0.95]] as const) {
      if (!this.textures.exists('res_tree')) continue;
      this.add.ellipse(x, base - 2, 70 * sc * bs, 14 * bs, 0x10223a, 0.25).setDepth(2.5);
      this.add.sprite(x, base, 'res_tree').setOrigin(0.5, 0.9).setScale(sc * bs).setDepth(3).play({ key: 'res_tree', startFrame: (x >> 5) % 8 });
    }
    for (let i = 0; i < 20; i++) {
      const col = i === 0 ? 5 : i === 19 ? 7 : 6;
      this.add.image(i * 64, gy, 'tilemap', 27 + col).setOrigin(0).setDepth(2);
      this.add.image(i * 64, gy + 64, 'tilemap', 45 + col).setOrigin(0).setDepth(2);
    }
    for (const [x, k] of [[330, 'bush1'], [700, 'bush2'], [1020, 'bush3']] as const) {
      if (!this.textures.exists(k)) continue;
      if (!this.anims.exists(`menu_${k}`)) this.anims.create({ key: `menu_${k}`, frames: this.anims.generateFrameNumbers(k, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
      this.add.sprite(x, gy + 44, k).setOrigin(0.5, 0.78).setScale(0.8 * bs).setDepth(3).play(`menu_${k}`);
    }
    // Personagens em cena no gramado: troca de cena de tempos em tempos.
    const feet = gy + 40;
    let show = loadingVignette(this, W / 2, feet, W, { ground: false, depth: 4, scale: P ? 1.5 : 1 });
    this.time.addEvent({
      delay: 7600,
      loop: true,
      callback: () => {
        show.destroy();
        show = loadingVignette(this, W / 2, feet, W, { ground: false, depth: 4, scale: P ? 1.5 : 1 });
      },
    });
    // O Xamã na nuvem, olhando tudo de cima (só na tela de título).
    if (this.stage === 'title') {
      const sx = P ? W - 230 : 990;
      const sy = P ? Math.round(HH * 0.4) : 205;
      const glow = this.add.image(0, -10, 'aura').setTint(0x9b6bf0).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5, 1.3).setAlpha(0.6);
      const cl = this.add.image(0, 52, 'cloud_05').setScale(0.34);
      const sh = this.add.sprite(0, 0, 'shaman_idle').play('shaman_idle').setFlipX(true);
      const rig = this.add.container(sx, sy, [glow, cl, sh]).setScale(P ? 1.5 : 1).setDepth(5);
      this.tweens.add({ targets: rig, y: sy - 12, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glow, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      this.time.addEvent({
        delay: 5200,
        loop: true,
        callback: () => {
          // De vez em quando ele conjura: faíscas roxas descem até o gramado.
          sh.play('shaman_attack').once('animationcomplete', () => sh.play('shaman_idle'));
          for (let i = 0; i < 8; i++) {
            const sp = this.add.image(rig.x - 30, rig.y, 'spark').setTint(i % 2 ? 0xb46bff : 0xe8d4ff).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
            this.tweens.add({ targets: sp, x: rig.x - Phaser.Math.Between(120, 520), y: feet - Phaser.Math.Between(10, 90), alpha: 0, scale: 0.15, delay: 250 + i * 50, duration: 900, ease: 'Quad.easeIn', onComplete: () => sp.destroy() });
          }
        },
      });
    }
    // Folhas ao vento.
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const lf = this.add.image(-20, Phaser.Math.Between(80, gy), 'leaf').setTint(Phaser.Math.RND.pick([0x8fd14f, 0xc8e06a, 0xffd36b])).setDepth(5).setScale(1.4);
        this.tweens.add({ targets: lf, x: W + 40, y: lf.y + Phaser.Math.Between(-60, 120), angle: 720, duration: Phaser.Math.Between(5000, 8000), onComplete: () => lf.destroy() });
      },
    });

    // Tudo o que vem depois (logo, botões, opções) fica na frente do cenário.
    const bgCount = this.children.list.length;
    this.time.delayedCall(0, () => {
      for (const o of this.children.list.slice(bgCount)) {
        const d = o as unknown as Phaser.GameObjects.Components.Depth;
        if (d.depth === 0) d.setDepth(10);
      }
    });
    const hasLogo = this.textures.exists('logo');
    if (this.stage === 'title') {
      // Tela inicial: logo grande respirando + JOGAR.
      if (hasLogo) {
        const lw = P ? 1180 : 700;
        const logo = this.add.image(W / 2, P ? Math.round(HH * 0.24) : 196, 'logo').setDisplaySize(lw, (lw * 640) / 1200);
        const sc = logo.scale;
        logo.setScale(0);
        this.tweens.add({ targets: logo, scale: sc, duration: 700, ease: 'Back.easeOut' });
        this.tweens.add({ targets: logo, y: logo.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });
      } else {
        this.add
          .text(W / 2, P ? 500 : 180, 'SKULLSHIFT', { fontFamily: FONT, fontSize: P ? '128px' : '96px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 14 })
          .setOrigin(0.5);
      }
      const play = pillButton(this, W / 2, P ? (gy + 140 + HH) / 2 - 60 : 618, 'JOGAR', () => this.toModes(), 300, 0xffe066).setScale(P ? 2 : 1.3);
      // Engrenagem: configurações direto da tela inicial.
      pillButton(this, P ? W - 170 : W - 120, P ? 120 : 50, '⚙ AJUSTES', () => this.scene.start('settings', { from: 'menu' }), 190).setScale(P ? 1.4 : 0.85);
      this.tweens.add({ targets: play, scale: play.scale * 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add
        .text(W / 2, P ? (gy + 140 + HH) / 2 + 110 : 690, 'Enter · Espaço · botão A · toque', {
          fontFamily: BODY_FONT,
          fontSize: P ? '34px' : '18px',
          color: '#0b2236',
        })
        .setOrigin(0.5);
      const kb = this.input.keyboard!;
      for (const k of ['ENTER', 'SPACE', 'F']) kb.on(`keydown-${k}`, () => this.toModes());
      return;
    }

    if (hasLogo) {
      const lw = P ? 900 : 360;
      this.add.image(W / 2, P ? 320 : 112, 'logo').setDisplaySize(lw, (lw * 640) / 1200);
    } else {
      this.add
        .text(W / 2, P ? 400 : 140, 'SKULLSHIFT', { fontFamily: FONT, fontSize: P ? '128px' : '96px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 14 })
        .setOrigin(0.5);
    }
    OPTIONS.forEach((o, i) => {
      const t = this.add
        .text(W / 2, P ? 660 + i * 120 : 270 + i * 46, o.label, {
          fontFamily: FONT,
          fontSize: P ? '58px' : '36px',
          color: '#fff7dc',
          stroke: '#10223a',
          strokeThickness: P ? 12 : 8,
        })
        .setOrigin(0.5)
        .setPadding(P ? 24 : 8)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.start(i));
      this.texts.push(t);
    });

    // Escolha da fase: ◀ FASE 1 · ILHAS DA MARÉ ▶
    const ly = P ? 1170 : 470;
    this.levelText = this.add
      .text(W / 2, ly, '', { fontFamily: FONT, fontSize: P ? '44px' : '26px', color: '#bfe9ff', stroke: '#10223a', strokeThickness: P ? 10 : 7 })
      .setOrigin(0.5);
    this.levelRow = [this.levelText!];
    for (const dir of [-1, 1]) {
      const arrow = this.add
        .text(W / 2 + dir * (P ? 520 : 330), ly, dir < 0 ? '◀' : '▶', { fontFamily: FONT, fontSize: P ? '56px' : '34px', color: '#ffe066', stroke: '#10223a', strokeThickness: 8 })
        .setOrigin(0.5)
        .setPadding(16)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.shift(dir));
      this.levelRow.push(arrow);
    }
    this.setLevel(this.level);

    this.add
      .text(
        W / 2,
        P ? (gy + 140 + HH) / 2 : H - 100,
        [
          'Na próxima tela, cada jogador escolhe teclado, controle ou toque.',
          'P1 = azul  ·  P2 = vermelho. Os dois começam como esqueleto.',
          'Segure para TRÁS para andar defendendo. Sobre o item de outro personagem, aperte PEGAR para se transformar.',
        ].join('\n'),
        {
          fontFamily: BODY_FONT,
          fontSize: P ? '36px' : '19px',
          color: '#0b2236',
          align: 'center',
          lineSpacing: P ? 16 : 8,
          wordWrap: { width: P ? 1100 : 1240 },
        },
      )
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select(this.index - 1));
    kb.on('keydown-W', () => this.select(this.index - 1));
    kb.on('keydown-DOWN', () => this.select(this.index + 1));
    kb.on('keydown-S', () => this.select(this.index + 1));
    kb.on('keydown-ENTER', () => this.start(this.index));
    kb.on('keydown-ESC', () => this.scene.restart({ stage: 'title' }));
    kb.on('keydown-SPACE', () => this.start(this.index));
    kb.on('keydown-F', () => this.start(this.index));
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.shift(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.shift(1));
    kb.on('keydown-ONE', () => this.start(0));
    kb.on('keydown-TWO', () => this.start(1));

    this.select(this.index);
  }

  private toModes(): void {
    this.scene.restart({ stage: 'modes' });
  }

  update(): void {
    const pad = this.input.gamepad?.gamepads.find(Boolean);
    if (!pad) return;
    if (this.stage === 'title') {
      const ok = !!pad.buttons[0]?.pressed || !!pad.buttons[9]?.pressed;
      if (ok && !this.prevPad.ok) this.toModes();
      this.prevPad.ok = ok;
      return;
    }
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const up = b(12) || (pad.axes[1]?.getValue() ?? 0) < -0.5;
    const down = b(13) || (pad.axes[1]?.getValue() ?? 0) > 0.5;
    const ok = b(0) || b(9);
    if (up && !this.prevPad.up) this.select(this.index - 1);
    if (down && !this.prevPad.down) this.select(this.index + 1);
    if (ok && !this.prevPad.ok) this.start(this.index);
    const lr = (pad.axes[0]?.getValue() ?? 0);
    const left = !!pad.buttons[14]?.pressed || lr < -0.5;
    const right = !!pad.buttons[15]?.pressed || lr > 0.5;
    if (left && !this.prevLR.l) this.shift(-1);
    if (right && !this.prevLR.r) this.shift(1);
    this.prevLR = { l: left, r: right };
    this.prevPad = { up, down, ok };
  }

  private select(i: number): void {
    if (this.index !== Phaser.Math.Wrap(i, 0, OPTIONS.length)) sfx('select');
    this.index = Phaser.Math.Wrap(i, 0, OPTIONS.length);
    // Versus: escolhe a fase aqui. História: escolhe a dificuldade (a fase vem do mapa).
    this.refreshRow();
    this.texts.forEach((t, j) => {
      const on = j === this.index;
      t.setColor(on ? '#ffe066' : '#fff7dc').setScale(on ? 1.08 : 1);
      t.setText((on ? '▶  ' : '') + OPTIONS[j].label + (on ? '  ◀' : ''));
    });
  }

  /** ◀ ▶: troca a fase (só no versus). */
  private shift(dir: number): void {
    if (this.index !== 1) return;
    // Casas assombradas são quebra-cabeças do modo história: não entram no versus.
    const ok = LEVELS.map((_, i) => i).filter((i) => {
      const l = LEVELS[i];
      return !l.haunt && !l.shmup && !l.chase && !l.puzzle && !l.mausoleum && !l.secret && !l.gun && !l.sea && !l.undersea;
    });
    const at = Math.max(0, ok.indexOf(this.level));
    this.level = ok[Phaser.Math.Wrap(at + dir, 0, ok.length)];
    this.refreshRow();
  }

  private setLevel(n: number): void {
    this.level = Phaser.Math.Wrap(n, 0, LEVELS.length);
    this.refreshRow();
  }

  private refreshRow(): void {
    if (!this.levelText) return;
    // Versus: escolhe a fase aqui. História: a dificuldade é do save. Livre: todas abertas no mapa.
    this.levelRow.forEach((o) => o.setVisible(this.index === 1));
    const name = LEVELS[this.level].name.toUpperCase();
    this.levelText.setText(`FASE ${this.level + 1} · ${name}`).setColor('#bfe9ff');
    // Setas afastadas o bastante para o texto mais longo.
    const half = this.levelText.width / 2 + (VIEW.portrait ? 60 : 40);
    this.levelRow.slice(1).forEach((a, k) => a.setX(W / 2 + (k === 0 ? -1 : 1) * half));
  }

  private start(i: number): void {
    const mode = OPTIONS[i].mode;
    if (mode === 'settings') {
      this.scene.start('settings', { from: 'menu' });
      return;
    }
    if (mode === 'story') {
      setFreePlay(false);
      this.scene.start('slots');
    } else if (mode === 'free') {
      // Modo livre (temporário): mapa com todas as fases abertas, nada é salvo.
      setFreePlay(true);
      this.scene.start('controls', { mode: 'story', level: this.level });
    } else {
      setFreePlay(false);
      this.scene.start('controls', { mode, level: this.level });
    }
  }
}
