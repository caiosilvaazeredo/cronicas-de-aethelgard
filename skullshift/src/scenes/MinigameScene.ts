import { CHARS } from '../game/characters';
import { drawHills, drawMountains } from '../ui/props';
import { TouchPad } from '../game/touch';
import Phaser from 'phaser';
import { BODY_FONT, FONT, PORTRAIT, VIEW, W, portraitPanelTop } from '../config';
import { addCoins, addStat, addXp, getLevel, getStat } from '../game/progress';
import { sfx } from '../game/settings';
import { pillButton } from '../ui/devices';
import { levelUpBanner } from '../ui/levelup';

const INK = 0x10223a;
type Kind = 'sheep';

/** Contador do dia (para as recompensas caírem quando se joga muitas vezes seguidas). */
function todayKey(kind: Kind): string {
  const d = new Date();
  return `mg_${kind}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Pega-ovelha (jogo do curral da vila): 40 segundos para encostar nas ovelhas que fogem pelo pasto.
 * Os outros jogos da vila (arena e corrida) são fases de verdade: veja game/villagegames.ts.
 * Rende ouro e um pouco de XP (cada vez menos se jogar muitas vezes no mesmo dia).
 */
export class MinigameScene extends Phaser.Scene {
  private kind: Kind = 'sheep';
  private score = 0;
  private done = false;
  private info!: Phaser.GameObjects.Text;
  private HH = 720;

  constructor() {
    super('minigame');
  }

  init(data: { kind?: Kind }): void {
    this.kind = data.kind ?? 'sheep';
    this.score = 0;
    this.done = false;
    this.uiCam = undefined;
    this.uiMode = true;
  }

  /**
   * Em pé, o pega-ovelha usa uma câmera com zoom só para o jogo (como a vila e as fases) e
   * outra para a interface. Cada objeto novo vai para uma das duas conforme o modo atual.
   */
  private uiCam?: Phaser.Cameras.Scene2D.Camera;
  private uiMode = true;
  private route = (go: Phaser.GameObjects.GameObject): void => {
    if (!this.uiCam) return;
    if (this.uiMode) this.cameras.main.ignore(go);
    else this.uiCam.ignore(go);
  };

  private ui<T>(fn: () => T): T {
    const m = this.uiMode;
    this.uiMode = true;
    try {
      return fn();
    } finally {
      this.uiMode = m;
    }
  }

  private world<T>(fn: () => T): T {
    const m = this.uiMode;
    this.uiMode = false;
    try {
      return fn();
    } finally {
      this.uiMode = m;
    }
  }

  /** Topo da área do jogo em pé (abaixo do título e das instruções). */
  private get playTop(): number {
    return 470 + PORTRAIT.topPad;
  }

  create(): void {
    this.HH = this.scale.height;
    const P = VIEW.portrait;
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.route);
    this.events.once('shutdown', () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.route));
    const camMode = P;
    if (camMode) this.uiCam = this.cameras.add(0, 0, W, this.HH);
    this.world(() => this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDisplaySize(W, this.HH));
    const tp = P ? PORTRAIT.topPad : 0;
    if (camMode) this.add.rectangle(0, 0, W, this.playTop, INK).setOrigin(0);
    const titles: Record<Kind, string> = { sheep: 'PEGA-OVELHA' };
    this.add.text(W / 2, P ? 230 + tp : 40, titles[this.kind], { fontFamily: FONT, fontSize: P ? '84px' : '34px', color: '#fff7dc', stroke: '#10223a', strokeThickness: 10 }).setOrigin(0.5).setDepth(50);
    this.info = this.add
      .text(W / 2, P ? 300 + tp : 84, '', { fontFamily: FONT, fontSize: P ? '44px' : '20px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6, align: 'center', wordWrap: { width: W - 80 } })
      .setOrigin(0.5, P ? 0 : 0.5)
      .setDepth(50);
    pillButton(this, P ? 180 : 100, P ? 110 + tp : 36, '◀ VILA', () => this.scene.start('village', { from: 'sheep' }), 170).setScale(P ? 1.8 : 0.75).setDepth(50);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('village', { from: 'sheep' }));
    this.world(() => this.sheep());
  }

  // ---------- ovelhas ----------

  private sheep(): void {
    const HH = this.HH;
    const P = VIEW.portrait;
    // Em pé o pasto é mais estreito (a tela também é): as ovelhas não somem longe da câmera.
    const FW = P ? 760 : W;
    const gy = P ? 576 : HH * 0.8;
    const cam = this.cameras.main;
    let pad: TouchPad | undefined;
    if (P) {
      // Em pé: a câmera segue a caveira (como nas fases) e os botões ficam no painel de baixo.
      const top = this.playTop;
      const panel = portraitPanelTop();
      const h = panel - top;
      const zoom = Math.min(h / 440, W / 460);
      const visH = h / zoom;
      cam.setViewport(0, top, W, h).setZoom(zoom).setBounds(0, 700 - visH, FW, visH);
      this.ui(() => {
        this.add.rectangle(0, panel, W, VIEW.h - panel, 0x16304d).setOrigin(0);
        this.add.rectangle(0, panel, W, 8, 0x0b1626).setOrigin(0);
        pad = new TouchPad(this, 'full', 0xfff7dc, undefined, false, false, false, 'walk-jump');
      });
    } else if (this.sys.game.device.input.touch) pad = this.ui(() => new TouchPad(this, 'full', 0xfff7dc, undefined, false, false, false, 'walk-jump'));
    drawMountains(this.add.graphics(), -100, W + 100, gy - 20, 23);
    // Morros e a cerca do pasto ao fundo.
    const bg = this.add.graphics();
    const hx = (o: number) => Array.from({ length: 6 }, (_, i) => i * 260 + o);
    drawHills(bg, hx(60), gy + 10, 420, 260, 0x6fb86a, 0x8fd07a);
    drawHills(bg, hx(190), gy + 40, 380, 190, 0x5aa257, 0x78bf68);
    for (let x = -10; x < W; x += 64) this.add.image(x, gy + 4, 'prop_fence').setOrigin(0, 1);
    const n = Math.ceil(W / 64);
    for (let i = 0; i < n; i++) {
      // Grama acima da linha dos pés (como na vila): a caveira e as ovelhas pisam no gramado.
      this.add.image(i * 64, gy - 30, 'tilemap', 27 + (i === 0 ? 5 : i === n - 1 ? 7 : 6)).setOrigin(0);
      for (let r = 0; r < 3; r++) this.add.image(i * 64, gy + 34 + r * 64, 'tilemap', 45 + (i === 0 ? 5 : i === n - 1 ? 7 : 6)).setOrigin(0);
    }
    // Em pé a câmera já dá o zoom: tudo no tamanho normal.
    const K = 1;
    const hero = this.add.sprite(FW / 2, gy, 'skull_idle').setOrigin(0.5, CHARS.skull.feetY / CHARS.skull.frame).setScale(K).play('skull_idle').setDepth(5);
    if (P) cam.startFollow(hero, true, 0.15, 0.15);
    let vy = 0;
    let ground = true;
    let left = 40;
    let target: number | null = null;
    const flock: Array<{ s: Phaser.GameObjects.Sprite; v: number; vy: number; until: number }> = [];
    const addSheep = () => {
      const s = this.add.sprite(Phaser.Math.Between(60, FW - 60), gy, 'sheep_move').setOrigin(0.5, 0.66).setScale(1.1 * K).play('sheep_move').setDepth(4);
      flock.push({ s, v: (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(90, 170), vy: 0, until: 0 });
    };
    for (let i = 0; i < 5; i++) addSheep();
    const kb = this.input.keyboard!;
    const keys = kb.addKeys('LEFT,RIGHT,A,D,UP,W,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    const jump = () => {
      if (!ground || this.done) return;
      vy = -650;
      ground = false;
      sfx('jump');
    };
    kb.on('keydown-UP', jump);
    kb.on('keydown-W', jump);
    kb.on('keydown-SPACE', jump);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || this.done || pad?.hits(p.x, p.y)) return;
      if (P && (p.y < cam.y || p.y > cam.y + cam.height)) return;
      const wp = cam.getWorldPoint(p.x, p.y);
      if (wp.y < hero.y - 140) jump();
      target = wp.x;
    });
    const clock = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        left--;
        if (left <= 0) {
          clock.remove();
          this.finish(this.score, `Ovelhas pegas: ${this.score}`);
        }
      },
    });
    this.onUpdate((time: number, dtMs: number) => {
      if (this.done) return;
      const dt = Math.min(0.05, dtMs / 1000);
      let move = 0;
      if (keys.LEFT.isDown || keys.A.isDown) move -= 1;
      if (keys.RIGHT.isDown || keys.D.isDown) move += 1;
      if (pad) {
        const t = pad.read();
        if (t.left) move = -1;
        if (t.right) move = 1;
        if (t.jumpPressed) jump();
      }
      if (move) target = null;
      else if (target !== null) {
        const d = target - hero.x;
        if (Math.abs(d) < 10) target = null;
        else move = Math.sign(d);
      }
      hero.x = Phaser.Math.Clamp(hero.x + move * 330 * (K > 1 ? 1.5 : 1) * dt, 30, FW - 30);
      if (move) hero.setFlipX(move < 0);
      if (!ground) {
        vy += 1700 * dt;
        hero.y += vy * dt;
        if (hero.y >= gy) {
          hero.y = gy;
          vy = 0;
          ground = true;
        }
      }
      const anim = move ? 'skull_run' : 'skull_idle';
      if (hero.anims.currentAnim?.key !== anim) hero.play(anim);
      for (const f of flock) {
        // Fogem da caveira quando ela chega perto; às vezes dão um pulinho.
        const away = Math.sign(f.s.x - hero.x) || 1;
        if (Math.abs(f.s.x - hero.x) < 180 * K && time > f.until) {
          f.v = away * Phaser.Math.Between(150, 230);
          f.until = time + 600;
          if (Math.random() < 0.3 && f.s.y >= gy) f.vy = -420;
        }
        f.s.x += f.v * dt;
        if (f.s.x < 40 || f.s.x > FW - 40) {
          f.v = -f.v;
          f.s.x = Phaser.Math.Clamp(f.s.x, 40, FW - 40);
        }
        if (f.vy || f.s.y < gy) {
          f.vy += 1500 * dt;
          f.s.y = Math.min(gy, f.s.y + f.vy * dt);
          if (f.s.y >= gy) f.vy = 0;
        }
        f.s.setFlipX(f.v < 0);
        if (Math.abs(f.s.x - hero.x) < 40 * K && Math.abs(f.s.y - hero.y) < 50 * K && f.s.visible) {
          this.score++;
          sfx('pick');
          const t = this.world(() => this.add.text(f.s.x, f.s.y - 80, '+1', { fontFamily: FONT, fontSize: '30px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5));
          this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
          f.s.setVisible(false);
          this.time.delayedCall(900, () => {
            if (!f.s.active) return;
            f.s.setPosition(hero.x < FW / 2 ? FW - 60 : 60, gy).setVisible(true);
          });
        }
      }
      this.info.setText(
        pad
          ? `Tempo: ${left}   ·   Ovelhas: ${this.score}\nEncoste nas ovelhas! ◀ ▶ para andar, PULA para pular (ou toque no pasto).`
          : `Tempo: ${left}   ·   Ovelhas: ${this.score}\nEncoste nas ovelhas! Setas para andar, ↑/Espaço pula (ou toque no pasto).`,
      );
    });
  }

  /** Passo por quadro que some quando a cena sai (ou reinicia). */
  private onUpdate(fn: (time: number, dt: number) => void): void {
    this.events.on('update', fn);
    this.events.once('shutdown', () => this.events.off('update', fn));
  }

  // ---------- fim ----------

  private flash(text: string, color: string): void {
    const t = this.ui(() => this.add.text(W / 2, this.HH * 0.4, text, { fontFamily: FONT, fontSize: '32px', color, stroke: '#10223a', strokeThickness: 7 }).setOrigin(0.5).setDepth(40));
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  /** Recompensa: ouro e um pouco de XP, cada vez menos se jogar muitas vezes no mesmo dia. */
  private finish(points: number, summary: string): void {
    if (this.done) return;
    this.ui(() => this.finishPanel(points, summary));
  }

  private finishPanel(points: number, summary: string): void {
    this.done = true;
    const key = todayKey(this.kind);
    const plays = getStat(key);
    addStat(key);
    const k = Math.max(0.25, 1 - plays * 0.25);
    const per = { xp: 5, gold: 4 };
    const goldBase = points * per.gold;
    const xpBase = points * per.xp;
    const gold = Math.round(goldBase * k);
    const xp = Math.round(xpBase * k);
    addCoins(gold);
    const ups = addXp(xp);
    const P = VIEW.portrait;
    const HH = this.HH;
    const pw = P ? W - 120 : 640;
    const ph = P ? 680 : 330;
    const g = this.add.graphics().setDepth(60);
    g.fillStyle(0x000000, 0.5).fillRect(0, 0, W, HH);
    g.fillStyle(INK, 1).fillRoundedRect(W / 2 - pw / 2 - 6, HH / 2 - ph / 2 - 6, pw + 12, ph + 12, 22);
    g.fillStyle(0xfff7dc, 1).fillRoundedRect(W / 2 - pw / 2, HH / 2 - ph / 2, pw, ph, 18);
    const note = k < 1 ? `\n(Recompensa reduzida: você já jogou ${plays}x hoje.)` : '';
    this.add.text(W / 2, HH / 2 - ph / 2 + 50, 'FIM DE JOGO!', { fontFamily: FONT, fontSize: P ? '76px' : '32px', color: '#7a3ad0' }).setOrigin(0.5).setDepth(61);
    this.add
      .text(W / 2, HH / 2 - ph / 2 + (P ? 150 : 90), `${summary}\nOuro: +${gold}   ·   XP: +${xp}${note}`, { fontFamily: BODY_FONT, fontSize: P ? '46px' : '20px', color: '#10223a', align: 'center', wordWrap: { width: pw - 60 } })
      .setOrigin(0.5, 0)
      .setDepth(61);
    pillButton(this, W / 2 - (P ? 260 : 160), HH / 2 + ph / 2 - (P ? 100 : 54), 'DE NOVO', () => this.scene.restart({ kind: this.kind }), 240, 0xbfe9ff).setScale(P ? 1.8 : 1).setDepth(62);
    pillButton(this, W / 2 + (P ? 260 : 160), HH / 2 + ph / 2 - (P ? 100 : 54), 'VILA', () => this.scene.start('village', { from: 'sheep' }), 240, 0xffe066).setScale(P ? 1.8 : 1).setDepth(62);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('village', { from: 'sheep' }));
    if (ups > 0) levelUpBanner(this, getLevel(), 400);
  }
}
