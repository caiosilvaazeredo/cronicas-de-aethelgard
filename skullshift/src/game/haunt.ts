import Phaser from 'phaser';
import { BODY_FONT, DEPTH, FLOOR_Y, FONT, TILE, W } from '../config';
import type { Fighter } from './Fighter';
import type { DoorDef, HauntDef, Level } from './level';
import { sfx } from './settings';

/** O que a cena do jogo oferece para as casas assombradas. */
export interface HauntHost {
  scene: Phaser.Scene;
  level: Level;
  player(): Fighter;
  /** Nome do botão de pegar (para os avisos "PEGA: entrar"). */
  pickLabel(): string;
  /** Teletransporte (porta): põe os pés em (x, feet), troca o cenário e a câmera. */
  moveTo(x: number, feet: number, checkpoint: boolean): void;
  win(sub: string): void;
  popText(x: number, y: number, text: string, color: string): void;
}

const topOf = (h = 0) => FLOOR_Y - h * TILE;
const PLAYER_LIGHT = 140;

interface Door {
  def: DoorDef;
  x: number;
  floor: number;
  sprite: Phaser.GameObjects.Image;
  prompt: Phaser.GameObjects.Text;
}

interface Tile {
  zone: Phaser.GameObjects.Zone;
  img: Phaser.GameObjects.Image;
  x: number;
  top: number;
}

/**
 * Casas assombradas: portas que levam a outras portas (e portas falsas que devolvem ao começo),
 * chave e porta trancada, alavancas que acendem pontes-fantasma por alguns segundos, pisos que
 * desabam, velas que se acendem ao encostar e a escuridão que só a luz desfaz.
 */
export class HauntSystem {
  private doors: Door[] = [];
  private busy = false;
  private keyHome?: { x: number; y: number };
  private keySprite?: Phaser.GameObjects.Image;
  private hasKey = false;
  private levers: Array<{ x: number; floor: number; group: string; ms: number; sprite: Phaser.GameObjects.Image; until: number }> = [];
  private ghosts = new Map<string, Tile[]>();
  private ghostUntil = new Map<string, number>();
  private crumbles: Array<Tile & { touchedAt: number; fallen: boolean; backAt: number }> = [];
  private candles: Array<{ x: number; y: number; big: boolean; lit: boolean; sprite: Phaser.GameObjects.Sprite }> = [];
  private dark?: Phaser.GameObjects.RenderTexture;
  private brush?: Phaser.GameObjects.Image;
  private prevAttack = false;

  constructor(
    private host: HauntHost,
    private def: HauntDef,
  ) {
    const s = host.scene;
    const lvl = host.level;
    // Portas.
    for (const d of def.doors ?? []) {
      const x = lvl.tileX(d.screen, d.tile);
      const floor = topOf(d.h);
      const sprite = s.add.image(x, floor + 2, d.exit ? 'door_exit' : 'door').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      if (d.symbol) {
        const plaque = s.add.graphics().setDepth(DEPTH.deco + 0.6);
        plaque.fillStyle(0x1d1a2b).fillRect(x - 21, floor - 152, 42, 40);
        plaque.fillStyle(0x6e6488).fillRect(x - 18, floor - 149, 36, 34);
        s.add.image(x, floor - 132, `sym_${d.symbol}`).setDepth(DEPTH.deco + 0.7);
      }
      const prompt = s.add
        .text(x, floor - 170, '', { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#10223acc', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx + 3)
        .setVisible(false);
      this.doors.push({ def: d, x, floor, sprite, prompt });
    }
    // Chave.
    if (def.key) {
      const [sc, tile, h] = def.key;
      this.keyHome = { x: lvl.tileX(sc, tile), y: topOf(h) - 40 };
      this.keySprite = s.add.image(this.keyHome.x, this.keyHome.y, 'key_item').setDepth(DEPTH.items);
      s.tweens.add({ targets: this.keySprite, y: '-=8', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Pontes-fantasma (desligadas no começo).
    for (const g of def.ghostFloors ?? []) {
      const list = this.ghosts.get(g.group) ?? [];
      for (let i = 0; i < g.n; i++) {
        const x = lvl.tileX(g.screen, g.tile + i);
        const top = topOf(g.h);
        list.push(this.tile(x, top, 'gplank_off', false));
      }
      this.ghosts.set(g.group, list);
    }
    // Alavancas.
    for (const l of def.levers ?? []) {
      const x = lvl.tileX(l.screen, l.tile);
      const floor = topOf(l.h);
      const sprite = s.add.image(x, floor + 2, 'lever_off').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.levers.push({ x, floor, group: l.group, ms: l.ms, sprite, until: 0 });
    }
    // Pisos que desabam (um por tile).
    for (const c of def.crumbles ?? []) {
      for (let i = 0; i < c.n; i++) {
        const x = lvl.tileX(c.screen, c.tile + i);
        const t = this.tile(x, topOf(c.h), 'hfloor_crack', true);
        this.crumbles.push({ ...t, touchedAt: 0, fallen: false, backAt: 0 });
      }
    }
    // Velas.
    for (const c of def.candles ?? []) {
      const x = lvl.tileX(c.screen, c.tile);
      const y = topOf(c.h) + 2;
      const sprite = s.add.sprite(x, y, c.big ? 'candelabra' : 'candle', 0).setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.candles.push({ x, y, big: !!c.big, lit: false, sprite });
    }
    // Escuridão: uma camada preta que segue a câmera, com "furos" onde há luz.
    if (def.dark) {
      this.dark = s.add.renderTexture(0, 0, W + 200, 1400).setOrigin(0).setDepth(DEPTH.fx + 1.5);
      this.brush = s.make.image({ key: 'light_px' }, false);
    }
  }

  /** Um tile de piso com colisão (ponte-fantasma ou piso que desaba). */
  private tile(x: number, top: number, key: string, solid: boolean): Tile {
    const s = this.host.scene;
    const img = s.add.image(x, top - 2, key).setOrigin(0.5, 0).setDepth(DEPTH.terrain + 0.5);
    const zone = s.add.zone(x, top + 7, TILE, 14);
    s.physics.add.existing(zone, true);
    const body = zone.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    body.enable = solid;
    this.host.level.ground.add(zone);
    return { zone, img, x, top };
  }

  private setSolid(t: Tile, on: boolean): void {
    (t.zone.body as Phaser.Physics.Arcade.StaticBody).enable = on;
  }

  get needsBigCandles(): number {
    return this.candles.filter((c) => c.big).length;
  }

  update(time: number): void {
    const p = this.host.player();
    const attackEdge = p.intent.attack && !this.prevAttack;
    this.prevAttack = p.intent.attack;
    this.updateDoors(p);
    this.updateKey(p);
    this.updateLevers(p, time, attackEdge);
    this.updateGhosts(time);
    this.updateCrumbles(p, time);
    this.updateCandles(p);
    this.updateDark(p, time);
  }

  // ---------- portas ----------

  private updateDoors(p: Fighter): void {
    for (const d of this.doors) {
      const near = p.alive && !this.busy && Math.abs(p.x - d.x) < 34 && Math.abs(p.feet - d.floor) < 12;
      if (!near || (!d.def.to && !d.def.exit)) {
        d.prompt.setVisible(false);
        continue;
      }
      let text = `${this.host.pickLabel()}: entrar`;
      let locked = false;
      if (d.def.exit) {
        if (this.def.key && !this.hasKey) {
          text = 'TRANCADA · ache a chave';
          locked = true;
        } else if (this.needsBigCandles) {
          const left = this.candles.filter((c) => c.big && !c.lit).length;
          if (left > 0) {
            text = `FECHADA · faltam ${left} ${left > 1 ? 'velas grandes' : 'vela grande'}`;
            locked = true;
          }
        }
      }
      d.prompt.setText(text).setVisible(true);
      if (!p.intent.pick) continue;
      if (locked) {
        this.host.scene.tweens.add({ targets: d.sprite, x: d.x + 4, duration: 50, yoyo: true, repeat: 3, onComplete: () => d.sprite.setX(d.x) });
        continue;
      }
      d.prompt.setVisible(false);
      if (d.def.exit) this.exitThrough(d, p);
      else this.enter(d, p);
      return;
    }
  }

  private enter(d: Door, p: Fighter): void {
    const target = this.doors.find((o) => o.def.id === d.def.to);
    if (!target) return;
    const s = this.host.scene;
    this.busy = true;
    p.zipping = true;
    p.body.setVelocity(0, 0);
    p.body.moves = false;
    d.sprite.setTexture('door_open');
    sfx('door');
    const cam = s.cameras.main;
    s.tweens.add({ targets: p.sprite, alpha: 0, duration: 200 });
    cam.fadeOut(220, 7, 4, 12);
    cam.once('camerafadeoutcomplete', () => {
      d.sprite.setTexture(d.def.exit ? 'door_exit' : 'door');
      // Porta certa vira checkpoint; a falsa devolve ao começo.
      this.host.moveTo(target.x, target.floor, !d.def.trick);
      p.body.moves = true;
      p.zipping = false;
      p.sprite.setAlpha(1);
      cam.fadeIn(260, 7, 4, 12);
      this.busy = false;
      if (d.def.trick) {
        cam.shake(260, 0.006);
        this.host.popText(target.x, target.floor - 150, 'HIHIHI! PORTA ERRADA', '#c9a6ff');
      }
    });
  }

  private exitThrough(d: Door, p: Fighter): void {
    const s = this.host.scene;
    this.busy = true;
    p.zipping = true;
    p.body.setVelocity(0, 0);
    p.body.moves = false;
    d.sprite.setTexture('door_open');
    const glow = s.add.ellipse(d.x, d.floor - 50, 90, 130, 0xfff1a8, 0.5).setDepth(DEPTH.fx);
    s.tweens.add({ targets: glow, scale: 1.4, alpha: 0, duration: 700, repeat: 1 });
    s.tweens.add({ targets: p.sprite, x: d.x, alpha: 0, duration: 500, delay: 200 });
    s.time.delayedCall(800, () => {
      p.sprite.setAlpha(1);
      p.body.moves = true;
      p.zipping = false;
      this.host.win('A porta se abriu!');
    });
  }

  // ---------- chave ----------

  private updateKey(p: Fighter): void {
    const k = this.keySprite;
    if (!k || !this.keyHome) return;
    if (!this.hasKey) {
      if (p.alive && Math.abs(p.x - k.x) < 36 && Math.abs(p.feet - 40 - k.y) < 60) {
        this.hasKey = true;
        sfx('pick');
        this.host.scene.tweens.killTweensOf(k);
        this.host.popText(k.x, k.y - 40, 'CHAVE!', '#ffe066');
      }
      return;
    }
    if (!p.alive) {
      // Morreu: a chave volta para o lugar.
      this.hasKey = false;
      k.setPosition(this.keyHome.x, this.keyHome.y).setAngle(0);
      this.host.scene.tweens.add({ targets: k, y: '-=8', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return;
    }
    // Carregada: flutua sobre a cabeça.
    const tx = p.x - p.facing * 20;
    const ty = p.feet - p.labelHeight - 50 + Math.sin(this.host.scene.time.now / 200) * 3;
    k.setPosition(Phaser.Math.Linear(k.x, tx, 0.3), Phaser.Math.Linear(k.y, ty, 0.3)).setAngle(-20);
  }

  // ---------- alavancas e pontes-fantasma ----------

  private updateLevers(p: Fighter, time: number, attackEdge: boolean): void {
    for (const l of this.levers) {
      const on = time < l.until;
      l.sprite.setTexture(on ? 'lever_on' : 'lever_off');
      if (!attackEdge || on || !p.alive) continue;
      if (Math.abs(p.x - l.x) > 80 || Math.abs(p.feet - l.floor) > 40) continue;
      l.until = time + l.ms;
      // Todas as alavancas do mesmo grupo ligam juntas.
      for (const o of this.levers) if (o.group === l.group) o.until = l.until;
      this.ghostUntil.set(l.group, l.until);
      this.host.scene.cameras.main.flash(120, 185, 166, 255);
      this.host.popText(l.x, l.floor - 80, `PONTE! ${Math.round(l.ms / 1000)}s`, '#d8ccff');
    }
  }

  private updateGhosts(time: number): void {
    for (const [group, tiles] of this.ghosts) {
      const until = this.ghostUntil.get(group) ?? 0;
      const on = time < until;
      const left = until - time;
      const blink = on && left < 1500 && Math.floor(time / 100) % 2 === 0;
      for (const t of tiles) {
        this.setSolid(t, on);
        t.img.setTexture(on ? 'gplank_on' : 'gplank_off').setAlpha(blink ? 0.35 : on ? 0.95 : 0.8);
      }
    }
  }

  // ---------- pisos falsos ----------

  private updateCrumbles(p: Fighter, time: number): void {
    for (const c of this.crumbles) {
      if (c.fallen) {
        if (time >= c.backAt && !(Math.abs(p.x - c.x) < 40 && Math.abs(p.feet - c.top) < 30)) {
          c.fallen = false;
          c.touchedAt = 0;
          this.setSolid(c, true);
          c.img.setPosition(c.x, c.top - 2).setAlpha(0).setAngle(0);
          this.host.scene.tweens.add({ targets: c.img, alpha: 1, duration: 300 });
        }
        continue;
      }
      const on = p.alive && p.onGround && Math.abs(p.x - c.x) < TILE / 2 + 10 && Math.abs(p.feet - c.top) < 6;
      if (on && !c.touchedAt) c.touchedAt = time;
      if (!c.touchedAt) continue;
      const t = time - c.touchedAt;
      c.img.setX(c.x + (t < 340 ? Math.sin(t / 18) * 2 : 0));
      if (t >= 340) {
        c.fallen = true;
        c.backAt = time + 3000;
        this.setSolid(c, false);
        this.host.scene.tweens.add({ targets: c.img, y: c.top + 220, angle: Phaser.Math.Between(-30, 30), alpha: 0, duration: 650, ease: 'Quad.easeIn' });
      }
    }
  }

  // ---------- velas e escuridão ----------

  private updateCandles(p: Fighter): void {
    for (const c of this.candles) {
      if (c.lit || !p.alive) continue;
      if (Math.abs(p.x - c.x) > 44 || Math.abs(p.feet - c.y) > 90) continue;
      c.lit = true;
      c.sprite.play(c.big ? 'candelabra_lit' : 'candle_lit');
      this.host.scene.cameras.main.flash(120, 255, 210, 140);
      if (c.big) {
        const total = this.needsBigCandles;
        const lit = this.candles.filter((o) => o.big && o.lit).length;
        this.host.popText(c.x, c.y - 140, `VELA GRANDE ${lit}/${total}`, '#ffe066');
        if (lit === total) this.host.popText(p.x, p.feet - 200, 'A SAÍDA SE ABRIU!', '#9dffb0');
      }
    }
  }

  private updateDark(p: Fighter, time: number): void {
    const rt = this.dark;
    const brush = this.brush;
    if (!rt || !brush) return;
    const view = this.host.scene.cameras.main.worldView;
    rt.setPosition(view.x - 100, view.y - 300);
    rt.clear();
    rt.fill(0x07040c, 0.94);
    const hole = (x: number, y: number, r: number) => {
      brush.setScale(r / 64);
      rt.erase(brush, x - rt.x, y - rt.y);
    };
    const flick = Math.sin(time / 90) * 4 + Math.sin(time / 37) * 2;
    if (p.alive || p.reviving) hole(p.x, p.feet - 50, PLAYER_LIGHT + flick);
    for (const c of this.candles) if (c.lit) hole(c.x, c.y - 50, (c.big ? 260 : 180) + flick);
    for (const d of this.doors) if (d.def.exit) hole(d.x, d.floor - 60, 70);
  }

  destroy(): void {
    this.dark?.destroy();
    this.brush?.destroy();
  }
}
