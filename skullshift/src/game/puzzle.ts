import Phaser from 'phaser';
import { BODY_FONT, DEPTH, FLOOR_Y, TILE } from '../config';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import { sfx } from './settings';
import { Px } from '../ui/pixelart';

type At = [screen: number, tile: number, h: number];

/** Fase de chave e porta: leve a chave dourada até a porta trancada. 3 presentes opcionais. */
export interface PuzzleDef {
  key: At;
  door: At;
  /** Três presentes coloridos (carne, madeira, ouro): opcionais, para os 100%. */
  gifts: [At, At, At];
  /** Escadas: cenário, tile, altura de baixo, altura de cima. */
  ladders?: Array<[screen: number, tile: number, fromH: number, toH: number]>;
  springs?: At[];
  /** Alavancas de cor: um golpe troca a cor ativa (começa no vermelho). */
  switches?: At[];
  /** Blocos coloridos: só a cor ativa é sólida. */
  blocks?: Array<[screen: number, tile: number, h: number, color: 'red' | 'blue']>;
  /** Pedras de ouro: bloqueiam o caminho até uma martelada no chão (habilidade Martelo). */
  stones?: At[];
  /** Árvores: com o Machado, caem para o lado em que você olha e viram ponte de `len` tiles. */
  trees?: Array<[screen: number, tile: number, h: number, len: number]>;
  /** Ovelhas: andam sozinhas, dá para carregar e põem peso nas placas. */
  sheep?: At[];
  /** Placas de pressão: abrem o portão `gate` enquanto algo pesa sobre elas. */
  plates?: Array<[screen: number, tile: number, h: number, gate: string]>;
  /** Portões: cenário, tile, altura do chão, altura do portão em tiles, id. */
  gates?: Array<[screen: number, tile: number, h: number, height: number, id: string]>;
  /** Caranguejos: andam de lado num trecho de `range` tiles; encostar belisca (derruba). */
  crabs?: Array<[screen: number, tile: number, h: number, range: number]>;
  /** O primeiro caranguejo começa carregando a chave: um golpe o vira e ela cai. */
  keyOnCrab?: boolean;
}

interface Crab {
  sprite: Phaser.GameObjects.Sprite;
  x0: number;
  x1: number;
  floor: number;
  dir: number;
  carrying: boolean;
  stunUntil: number;
  hitBy: number;
}

/** Caranguejo em pixel art (2 quadros de passinho). */
function makeCrabArt(scene: Phaser.Scene): void {
  if (scene.textures.exists('crab')) return;
  const INK_C = 0x1d1a2b;
  const frame = (k: number) => {
    const c = new Px(26, 16);
    c.rect(6, 6, 14, 6, 0xd84a2a);
    c.rect(7, 5, 12, 1, 0xd84a2a);
    c.rect(8, 6, 10, 2, 0xff8a5a);
    for (const ex of [10, 15]) {
      c.rect(ex, 2, 1, 4, 0xd84a2a);
      c.rect(ex - 1, 1, 3, 2, 0xffffff);
      c.set(ex, 1, INK_C);
    }
    // Garras.
    c.rect(1, 4 - k, 4, 4, 0xe85a3a);
    c.rect(21, 4 - k, 4, 4, 0xe85a3a);
    c.set(1, 4 - k, 0xffb090);
    c.set(24, 4 - k, 0xffb090);
    c.rect(4, 8, 3, 1, 0xd84a2a);
    c.rect(19, 8, 3, 1, 0xd84a2a);
    // Perninhas.
    for (const [lx, side] of [[7, -1], [10, -1], [16, 1], [19, 1]]) c.rect(lx + (k ? side : 0), 12, 1, 3, 0xb83a1a);
    c.outline(INK_C);
    return c;
  };
  const cv = document.createElement('canvas');
  cv.width = 26 * 3 * 2;
  cv.height = 16 * 3;
  const ctx = cv.getContext('2d')!;
  [frame(0), frame(1)].forEach((f, i) => f.draw(ctx, i * 78, 0, 3));
  scene.textures.addSpriteSheet('crab', cv as unknown as HTMLImageElement, { frameWidth: 78, frameHeight: 48 });
  scene.anims.create({ key: 'crab', frames: scene.anims.generateFrameNumbers('crab', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
}

export interface PuzzleHost {
  scene: Phaser.Scene;
  level: Level;
  player(): Fighter;
  pickLabel(): string;
  /** Presentes já pegos antes (ficam translúcidos). */
  giftsBefore: number[];
  gift(i: number): void;
  win(gifts: number): void;
  popText(x: number, y: number, text: string, color: string): void;
  /** Beliscão do caranguejo. */
  killPlayer?(): void;
}

const topOf = (h: number) => FLOOR_Y - h * TILE;
const INK = '#10223a';

interface Block {
  zone: Phaser.GameObjects.Zone;
  img: Phaser.GameObjects.Image;
  color?: 'red' | 'blue';
  x: number;
  top: number;
  broken?: boolean;
}

/**
 * Quebra-cabeças de chave e porta (inspirados nos clássicos de levar a chave até a saída):
 * carregar objetos, escadas, molas, blocos de cor com alavanca, pedras de ouro (martelo),
 * árvores que viram ponte (machado), ovelhas e placas de pressão que abrem portões.
 */
export class PuzzleSystem {
  private key: Phaser.Physics.Arcade.Sprite;
  private keyHome: [number, number];
  private sheep: Phaser.Physics.Arcade.Sprite[] = [];
  private held?: Phaser.Physics.Arcade.Sprite;
  private door: Phaser.GameObjects.Image;
  private doorX: number;
  private doorFloor: number;
  private prompt: Phaser.GameObjects.Text;
  private gifts: Array<{ img: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image; x: number; y: number; got: boolean }> = [];
  private ladders: Array<{ x: number; top: number; bottom: number }> = [];
  private climbing?: { x: number; top: number; bottom: number };
  private springs: Array<{ x: number; top: number; img: Phaser.GameObjects.Image }> = [];
  private switches: Array<{ x: number; floor: number; img: Phaser.GameObjects.Image }> = [];
  private blocks: Block[] = [];
  private stones: Block[] = [];
  private gates: Array<Block & { id: string; open: boolean; height: number }> = [];
  private plates: Array<{ x: number; top: number; gate: string; img: Phaser.GameObjects.Image }> = [];
  private trees: Array<{ x: number; top: number; len: number; sprite: Phaser.GameObjects.Sprite; down: boolean }> = [];
  private active: 'red' | 'blue' = 'red';
  private prevAttack = false;
  private won = false;
  private got = 0;
  private wasAlive = true;
  private crabs: Crab[] = [];

  constructor(
    private host: PuzzleHost,
    private def: PuzzleDef,
  ) {
    const s = host.scene;
    const lvl = host.level;
    const X = (sc: number, t: number) => lvl.tileX(sc, t);

    // Escadas (atrás de tudo).
    for (const [sc, t, fromH, toH] of def.ladders ?? []) {
      const x = X(sc, t);
      const top = topOf(toH);
      const bottom = topOf(fromH);
      for (let y = top - 40; y < bottom; y += 64) s.add.image(x, y, 'ladder').setOrigin(0.5, 0).setDepth(DEPTH.deco);
      this.ladders.push({ x, top, bottom });
    }
    // Porta trancada.
    const [ds, dt, dh] = def.door;
    this.doorX = X(ds, dt);
    this.doorFloor = topOf(dh);
    this.door = s.add.image(this.doorX, this.doorFloor + 2, 'door_exit').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
    const lock = s.add.image(this.doorX, this.doorFloor - 56, 'key_item').setScale(0.7).setAlpha(0.35).setDepth(DEPTH.deco + 0.6);
    s.tweens.add({ targets: lock, alpha: 0.7, duration: 700, yoyo: true, repeat: -1 });
    this.prompt = s.add
      .text(this.doorX, this.doorFloor - 160, '', { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffffff', backgroundColor: `${INK}cc`, padding: { x: 8, y: 4 } })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 3)
      .setVisible(false);

    // Blocos de cor, pedras de ouro e portões.
    for (const [sc, t, h, color] of def.blocks ?? []) this.blocks.push({ ...this.solid(X(sc, t), topOf(h) - TILE, TILE, TILE, `block_${color}`), color });
    for (const [sc, t, h] of def.stones ?? []) {
      const b = this.solid(X(sc, t), topOf(h) - TILE, TILE, TILE, 'gold_stone_big');
      b.img.setScale(0.85).setY(topOf(h) - TILE / 2 - 4);
      this.stones.push(b);
    }
    for (const [sc, t, h, height, id] of def.gates ?? []) {
      const x = X(sc, t);
      const top = topOf(h) - height * TILE;
      const b = this.solid(x, top, TILE, height * TILE, 'gate');
      b.img.destroy();
      const imgs = s.add.container(0, 0);
      for (let k = 0; k < height; k++) imgs.add(s.add.image(x, top + k * TILE + TILE / 2, 'gate'));
      imgs.setDepth(DEPTH.terrain + 0.6);
      this.gates.push({ ...b, img: imgs as unknown as Phaser.GameObjects.Image, id, open: false, height });
    }
    for (const [sc, t, h, gate] of def.plates ?? []) {
      const x = X(sc, t);
      const img = s.add.image(x, topOf(h) + 2, 'plate_up').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.plates.push({ x, top: topOf(h), gate, img });
    }
    for (const [sc, t, h] of def.switches ?? []) {
      const x = X(sc, t);
      const img = s.add.image(x, topOf(h) + 2, 'switch_red').setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.switches.push({ x, floor: topOf(h), img });
    }
    for (const [sc, t, h] of def.springs ?? []) {
      const x = X(sc, t);
      const img = s.add.image(x, topOf(h) + 2, 'spring', 0).setOrigin(0.5, 1).setDepth(DEPTH.deco + 0.5);
      this.springs.push({ x, top: topOf(h) - 30, img });
    }
    for (const [sc, t, h, len] of def.trees ?? []) {
      const x = X(sc, t);
      const sprite = s.add.sprite(x, topOf(h) + 4, 'res_tree').setOrigin(0.5, 0.94).setScale((len * TILE) / 170).setDepth(DEPTH.deco + 0.4).play('res_tree');
      this.trees.push({ x, top: topOf(h), len, sprite, down: false });
    }

    // Chave dourada (com física: cai, pode ser arremessada).
    const [ks, kt, kh] = def.key;
    this.keyHome = [X(ks, kt), topOf(kh) - 30];
    this.key = this.carryable(this.keyHome[0], this.keyHome[1], 'key_item', 1.3, 40, 22);
    // Caranguejos (o primeiro pode começar com a chave nas costas).
    makeCrabArt(s);
    for (const [sc, t, h, range] of def.crabs ?? []) {
      const x = X(sc, t);
      const sprite = s.add.sprite(x, topOf(h), 'crab').setOrigin(0.5, 1).setDepth(DEPTH.items + 0.4).play('crab');
      this.crabs.push({ sprite, x0: x - (range * TILE) / 2, x1: x + (range * TILE) / 2, floor: topOf(h), dir: 1, carrying: false, stunUntil: 0, hitBy: -1 });
    }
    if (def.keyOnCrab && this.crabs[0]) this.crabTakes(this.crabs[0]);
    // Ovelhas.
    for (const [sc, t, h] of def.sheep ?? []) {
      const sh = this.carryable(X(sc, t), topOf(h) - 40, 'sheep_idle', 0.95, 56, 44);
      sh.play('sheep_move');
      sh.setData('dir', -1);
      this.sheep.push(sh);
    }
    // Presentes coloridos.
    const textures = ['meat', 'wood', 'gold'];
    def.gifts.forEach(([sc, t, h], i) => {
      const x = X(sc, t);
      const y = topOf(h) - 44;
      const before = host.giftsBefore.includes(i);
      const ring = s.add.image(x, y, 'gift_ring').setScale(0.9).setDepth(DEPTH.items).setAlpha(before ? 0.3 : 0.9);
      const img = s.add.image(x, y, textures[i]).setScale(i === 2 ? 0.55 : 0.9).setDepth(DEPTH.items + 0.1).setAlpha(before ? 0.45 : 1);
      s.tweens.add({ targets: [img, ring], y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      s.tweens.add({ targets: ring, angle: 360, duration: 4000, repeat: -1 });
      this.gifts.push({ img, ring, x, y, got: false });
    });
  }

  /** Bloco sólido com desenho (some/aparece trocando body.enable). */
  private solid(x: number, top: number, w: number, h: number, tex: string): Block {
    const s = this.host.scene;
    const zone = s.add.zone(x, top + h / 2, w, h);
    s.physics.add.existing(zone, true);
    this.host.level.ground.add(zone);
    const img = s.add.image(x, top + h / 2, tex).setDepth(DEPTH.terrain + 0.5);
    return { zone, img, x, top };
  }

  private setSolid(b: Block, on: boolean): void {
    (b.zone.body as Phaser.Physics.Arcade.StaticBody).enable = on;
  }

  private carryable(x: number, y: number, tex: string, scale: number, bw: number, bh: number): Phaser.Physics.Arcade.Sprite {
    const s = this.host.scene;
    const o = s.physics.add.sprite(x, y, tex).setScale(scale).setDepth(DEPTH.items + 0.5);
    const body = o.body as Phaser.Physics.Arcade.Body;
    body.setSize(bw / scale, bh / scale);
    body.setDrag(600, 0);
    s.physics.add.collider(o, this.host.level.ground);
    return o;
  }

  /** Martelada no chão: quebra pedras de ouro por perto. */
  pound(f: Fighter): void {
    const s = this.host.scene;
    s.cameras.main.shake(220, 0.01);
    for (const st of this.stones) {
      if (st.broken || Math.abs(st.x - f.x) > 130 || Math.abs(st.top + TILE - f.feet) > 140) continue;
      st.broken = true;
      this.setSolid(st, false);
      sfx('boom');
      for (let i = 0; i < 6; i++) {
        const g = s.add.image(st.x, st.top + 30, 'gold').setScale(0.3).setDepth(DEPTH.fx);
        s.tweens.add({ targets: g, x: g.x + Phaser.Math.Between(-80, 80), y: g.y - Phaser.Math.Between(40, 120), alpha: 0, angle: 360, duration: 600, onComplete: () => g.destroy() });
      }
      s.tweens.add({ targets: st.img, scale: 0, alpha: 0, duration: 250 });
    }
  }

  update(time: number, dt: number): void {
    if (this.won) return;
    const p = this.host.player();
    const attackEdge = p.intent.attack && !this.prevAttack;
    this.prevAttack = p.intent.attack;
    // Morreu: a chave e o que estava na mão voltam ao lugar.
    if (!p.alive && this.wasAlive) this.dropHeld(false);
    if (p.alive && !this.wasAlive) this.resetKey();
    this.wasAlive = p.alive;
    if (this.key.y > 700) this.resetKey();

    this.updateLadders(p, dt);
    this.updateCarry(p, attackEdge);
    this.updateSprings(p, time);
    this.updateSwitches(p, attackEdge);
    this.updatePlates();
    this.updateTrees(p, attackEdge);
    this.updateSheep(dt);
    this.updateCrabs(time, dt, p);
    this.updateGifts(p);
    this.updateDoor(p);
  }

  // ---------- escadas ----------

  private updateLadders(p: Fighter, dt: number): void {
    const it = p.intent;
    const up = it.jumpHeld;
    const down = it.crouch;
    if (this.climbing) {
      const l = this.climbing;
      if (!p.alive) {
        this.climbing = undefined;
        return;
      }
      let feet = p.feet;
      feet += ((down ? 1 : 0) - (up ? 1 : 0)) * 220 * dt;
      const leave = it.move !== 0 || (feet <= l.top && up) || (feet >= l.bottom && down);
      feet = Phaser.Math.Clamp(feet, l.top, l.bottom);
      p.body.reset(l.x, feet - (p.def.feetY - p.def.frame / 2));
      p.sprite.anims.timeScale = up || down ? 1.4 : 0;
      if (leave) {
        this.climbing = undefined;
        p.zipping = false;
        p.body.moves = true;
        p.sprite.anims.timeScale = 1;
        if (feet <= l.top) {
          // No topo: passa para o lado onde há chão nessa altura.
          const lvl = this.host.level;
          const dx = lvl.landingY(l.x + 48, l.top - 4, l.top + 4) !== null ? 48 : lvl.landingY(l.x - 48, l.top - 4, l.top + 4) !== null ? -48 : p.facing * 6;
          p.body.reset(l.x + dx, l.top - 2 - (p.def.feetY - p.def.frame / 2));
        }
        p.body.setVelocity(it.move * 160, feet <= l.top ? -120 : 0);
      }
      return;
    }
    if (!p.alive || p.zipping || (!up && !down)) return;
    for (const l of this.ladders) {
      if (Math.abs(p.x - l.x) > 26) continue;
      const canUp = up && p.feet > l.top + 6 && p.feet <= l.bottom + 4;
      const canDown = down && Math.abs(p.feet - l.top) < 10;
      if (!canUp && !canDown) continue;
      this.climbing = l;
      p.zipping = true;
      p.body.setVelocity(0, 0);
      p.body.moves = false;
      if (canDown) p.body.reset(l.x, l.top + 8 - (p.def.feetY - p.def.frame / 2));
      return;
    }
  }

  // ---------- carregar ----------

  private updateCarry(p: Fighter, attackEdge: boolean): void {
    if (this.held) {
      const o = this.held;
      o.setPosition(p.x, p.feet - p.labelHeight - 16 + Math.sin(this.host.scene.time.now / 120) * 2);
      o.setFlipX(p.facing < 0 && o !== this.key);
      if (p.intent.pick) this.dropHeld(true);
      else if (attackEdge) this.throwHeld(p);
      return;
    }
    if (!p.intent.pick || !p.alive || p.zipping) return;
    const candidates = [...(this.crabs.some((c) => c.carrying) ? [] : [this.key]), ...this.sheep];
    const near = candidates.find((o) => Math.abs(o.x - p.x) < 52 && Math.abs(o.y - (p.feet - 30)) < 70);
    if (!near) return;
    if (!p.abilities.has('carry')) {
      this.host.popText(p.x, p.feet - 150, 'Ainda não sabe carregar!', '#ffffff');
      return;
    }
    this.held = near;
    (near.body as Phaser.Physics.Arcade.Body).enable = false;
    p.carrying = true;
    sfx('pick');
  }

  private dropHeld(place: boolean): void {
    const o = this.held;
    if (!o) return;
    const p = this.host.player();
    this.held = undefined;
    p.carrying = false;
    const body = o.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    if (place) body.reset(p.x + p.facing * 34, p.feet - 30);
    body.setVelocity(0, 0);
  }

  private throwHeld(p: Fighter): void {
    const o = this.held;
    if (!o) return;
    this.held = undefined;
    p.carrying = false;
    const body = o.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(p.x + p.facing * 20, p.feet - p.labelHeight - 10);
    body.setVelocity(p.facing * 520, -380);
    sfx('attack');
  }

  private resetKey(): void {
    if (this.held === this.key) this.dropHeld(false);
    // Fase do caranguejo: a chave volta para as costas dele.
    if (this.def.keyOnCrab && this.crabs[0]) {
      for (const c of this.crabs) c.carrying = false;
      this.crabTakes(this.crabs[0]);
      return;
    }
    const body = this.key.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(this.keyHome[0], this.keyHome[1]);
    body.setVelocity(0, 0);
  }

  // ---------- molas, alavancas, placas e portões ----------

  private updateSprings(p: Fighter, time: number): void {
    for (const sp of this.springs) {
      const bounce = (body: Phaser.Physics.Arcade.Body, x: number, bottom: number, v: number) => {
        if (body.velocity.y <= 0 || Math.abs(x - sp.x) > 30 || bottom < sp.top - 10 || bottom > sp.top + 34) return false;
        body.setVelocityY(-v);
        sp.img.setFrame(1);
        sp.img.setData('until', time + 160);
        return true;
      };
      if (p.alive && !p.zipping && bounce(p.body, p.x, p.feet, 1080)) sfx('jump');
      for (const o of [this.key, ...this.sheep]) {
        const b = o.body as Phaser.Physics.Arcade.Body;
        if (b.enable) bounce(b, o.x, b.bottom, 900);
      }
      if (time > ((sp.img.getData('until') as number) ?? 0)) sp.img.setFrame(0);
    }
  }

  private updateSwitches(p: Fighter, attackEdge: boolean): void {
    if (attackEdge && p.alive) {
      for (const sw of this.switches) {
        if (Math.abs(p.x - sw.x) > 80 || Math.abs(p.feet - sw.floor) > 50) continue;
        this.active = this.active === 'red' ? 'blue' : 'red';
        sfx('select');
        this.host.scene.cameras.main.flash(90, this.active === 'red' ? 224 : 47, this.active === 'red' ? 72 : 134, this.active === 'red' ? 72 : 224);
        break;
      }
    }
    for (const sw of this.switches) sw.img.setTexture(`switch_${this.active}`);
    for (const b of this.blocks) {
      const on = b.color === this.active;
      this.setSolid(b, on);
      b.img.setTexture(on ? `block_${b.color}` : `block_${b.color}_off`);
    }
  }

  private updatePlates(): void {
    const p = this.host.player();
    const weights: Array<[number, number]> = [];
    if (p.alive && p.onGround) weights.push([p.x, p.feet]);
    for (const o of [this.key, ...this.sheep]) {
      const b = o.body as Phaser.Physics.Arcade.Body;
      if (b.enable) weights.push([o.x, b.bottom]);
    }
    const openGates = new Set<string>();
    for (const pl of this.plates) {
      const pressed = weights.some(([x, y]) => Math.abs(x - pl.x) < 34 && Math.abs(y - pl.top) < 14);
      pl.img.setTexture(pressed ? 'plate_down' : 'plate_up');
      if (pressed) openGates.add(pl.gate);
    }
    for (const g of this.gates) {
      const open = openGates.has(g.id);
      if (open === g.open) continue;
      g.open = open;
      this.setSolid(g, !open);
      sfx('door');
      this.host.scene.tweens.add({ targets: g.img, y: open ? -g.height * TILE : 0, alpha: open ? 0.25 : 1, duration: 260 });
    }
  }

  // ---------- árvores (machado) ----------

  private updateTrees(p: Fighter, attackEdge: boolean): void {
    if (!attackEdge || !p.alive) return;
    for (const t of this.trees) {
      if (t.down || Math.abs(p.x - t.x) > 90 || Math.abs(p.feet - t.top) > 40) continue;
      if (!p.abilities.has('axe')) {
        this.host.popText(t.x, t.top - 200, 'Precisa do MACHADO', '#ffffff');
        return;
      }
      t.down = true;
      const dir = p.x < t.x ? 1 : -1;
      sfx('boom');
      this.host.scene.tweens.add({
        targets: t.sprite,
        angle: dir * 90,
        duration: 700,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.host.scene.cameras.main.shake(200, 0.008);
          t.sprite.anims.stop();
          // Vira ponte: um piso que segura por cima, do pé da árvore até a copa.
          const w = t.len * TILE;
          const zone = this.host.scene.add.zone(t.x + (dir * w) / 2, t.top + 7, w, 14);
          this.host.scene.physics.add.existing(zone, true);
          const body = zone.body as Phaser.Physics.Arcade.StaticBody;
          body.checkCollision.down = false;
          body.checkCollision.left = false;
          body.checkCollision.right = false;
          this.host.level.ground.add(zone);
          this.host.popText(t.x + dir * w * 0.5, t.top - 60, 'PONTE!', '#9dffb0');
        },
      });
      return;
    }
  }

  // ---------- ovelhas ----------

  private updateSheep(dt: number): void {
    for (const sh of this.sheep) {
      if (sh === this.held) continue;
      const b = sh.body as Phaser.Physics.Arcade.Body;
      if (!b.enable) continue;
      if (b.blocked.down) {
        let dir = (sh.getData('dir') as number) ?? -1;
        const ahead = this.host.level.landingY(sh.x + dir * 40, b.bottom - 4, b.bottom + 6);
        const onPlate = this.plates.some((pl) => Math.abs(sh.x - pl.x) < 30 && Math.abs(b.bottom - pl.top) < 14);
        if (b.blocked.left || b.blocked.right || ahead === null) dir = -dir;
        sh.setData('dir', dir);
        // Em cima de uma placa, a ovelha fica pastando.
        b.setVelocityX(onPlate ? 0 : dir * 45);
        sh.setFlipX(dir > 0);
        const anim = onPlate ? 'sheep_idle' : 'sheep_move';
        if (sh.anims.currentAnim?.key !== anim) sh.play(anim);
      }
      if (sh.y > 700) {
        b.reset(this.keyHome[0], this.keyHome[1] - 40);
      }
      void dt;
    }
  }

  // ---------- caranguejos ----------

  private crabTakes(c: Crab): void {
    c.carrying = true;
    (this.key.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  private updateCrabs(time: number, dt: number, p: Fighter): void {
    const hb = p.alive ? p.activeHitBox() : null;
    for (const c of this.crabs) {
      const sp = c.sprite;
      const stunned = time < c.stunUntil;
      if (!stunned) {
        if (sp.flipY) {
          sp.setFlipY(false).play('crab');
        }
        sp.x += c.dir * (c.carrying ? 70 : 95) * dt;
        if (sp.x > c.x1) c.dir = -1;
        if (sp.x < c.x0) c.dir = 1;
      }
      // Leva a chave nas costas.
      if (c.carrying) this.key.setPosition(sp.x, c.floor - 52 + Math.sin(time / 90) * 2).setAngle(Math.sin(time / 200) * 8);
      // Um golpe vira o caranguejo de barriga para cima: a chave cai.
      if (hb && p.attackId !== c.hitBy && !stunned) {
        const box = { x1: sp.x - 34, x2: sp.x + 34, y1: c.floor - 44, y2: c.floor };
        if (hb.x1 < box.x2 && hb.x2 > box.x1 && hb.y1 < box.y2 && hb.y2 > box.y1) {
          c.hitBy = p.attackId;
          c.stunUntil = time + 2600;
          sp.setFlipY(true).anims.stop();
          sfx('hit');
          if (c.carrying) {
            c.carrying = false;
            const body = this.key.body as Phaser.Physics.Arcade.Body;
            body.enable = true;
            body.reset(sp.x, c.floor - 70);
            body.setVelocity(p.facing * 160, -320);
            this.key.setAngle(0);
            this.host.popText(sp.x, c.floor - 110, 'A CHAVE CAIU!', '#ffe066');
          }
          continue;
        }
      }
      if (stunned) continue;
      // Encostou na chave largada no chão: pega de volta.
      const kb = this.key.body as Phaser.Physics.Arcade.Body;
      if (!c.carrying && this.held !== this.key && kb.enable && kb.blocked.down && Math.abs(this.key.x - sp.x) < 30 && Math.abs(kb.bottom - c.floor) < 20) {
        this.crabTakes(c);
        this.host.popText(sp.x, c.floor - 110, 'O CARANGUEJO PEGOU A CHAVE!', '#ff9a8a');
      }
      // Beliscão.
      if (p.alive && !p.invulnerable && !p.zipping && Math.abs(p.x - sp.x) < 34 && p.feet > c.floor - 40 && p.feet <= c.floor + 6) this.host.killPlayer?.();
    }
  }

  // ---------- presentes e porta ----------

  private updateGifts(p: Fighter): void {
    if (!p.alive) return;
    this.gifts.forEach((g, i) => {
      if (g.got || Math.abs(p.x - g.x) > 40 || Math.abs(p.feet - 40 - g.y) > 60) return;
      g.got = true;
      this.got++;
      this.host.gift(i);
      sfx('pick');
      this.host.popText(g.x, g.y - 50, `PRESENTE ${this.got}/3`, '#ffe066');
      this.host.scene.tweens.add({ targets: [g.img, g.ring], scale: 0, alpha: 0, duration: 300 });
    });
  }

  private updateDoor(p: Fighter): void {
    const near = p.alive && Math.abs(p.x - this.doorX) < 50 && Math.abs(p.feet - this.doorFloor) < 20;
    if (!near) {
      this.prompt.setVisible(false);
      return;
    }
    if (this.held !== this.key) {
      this.prompt.setText('Traga a CHAVE dourada').setVisible(true);
      return;
    }
    // Chegou com a chave: a porta abre.
    this.won = true;
    this.prompt.setVisible(false);
    this.dropHeld(false);
    this.key.setVisible(false);
    this.door.setTexture('door_open');
    sfx('door');
    const s = this.host.scene;
    s.tweens.add({ targets: p.sprite, x: this.doorX, alpha: 0, duration: 500, delay: 150 });
    s.time.delayedCall(800, () => {
      p.sprite.setAlpha(1);
      this.host.win(this.got);
    });
  }
}
