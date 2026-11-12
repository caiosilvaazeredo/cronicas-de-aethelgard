import Phaser from 'phaser';
import { DEATH_Y, DEPTH, FLOOR_Y, FONT, H, RESPAWN_DELAY, W, WATER_Y } from '../config';
import { EnemyAI } from '../game/ai';
import { ITEM_TEXTURE, ITEM_TO_CHAR, CHARS, type ItemId } from '../game/characters';
import { LAYOUT_P1, LAYOUT_P2, LAYOUT_STORY, PlayerController, emptyIntent, type Controller } from '../game/controls';
import { Fighter, type HitBox } from '../game/Fighter';
import { Hud } from '../game/Hud';
import { LEVEL_1, Level } from '../game/level';

type Mode = 'story' | 'versus';

interface Item {
  kind: ItemId;
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Ellipse;
  home: boolean;
  active: boolean;
  respawnAt: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  owner: Fighter;
  vx: number;
  vy: number;
  life: number;
  bounced: boolean;
}

const PLAYER_COLORS = ['#fff7dc', '#9cff6b'];
const ITEM_RESPAWN = 8000;
const FACE_RANGE = 460;

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'story';
  private level!: Level;
  private players: Fighter[] = [];
  private controllers: Controller[] = [];
  private enemies: Array<{ f: Fighter; ai: EnemyAI }> = [];
  private items: Item[] = [];
  private projectiles: Projectile[] = [];
  private hud!: Hud;
  private leader = -1;
  private checkpointX = 0;
  private deaths = 0;
  private startTime = 0;
  private ended = false;

  constructor() {
    super('game');
  }

  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? 'story';
    this.players = [];
    this.controllers = [];
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.leader = -1;
    this.deaths = 0;
    this.ended = false;
  }

  create(): void {
    const def = LEVEL_1;
    this.level = new Level(this, def);
    this.physics.world.setBounds(0, -400, this.level.width, H + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.level.width, H);

    if (this.mode === 'story') {
      const x = this.level.tileX(def.storyStartTile);
      this.addPlayer(new Fighter(this, x, FLOOR_Y, 'skull', 0, 'Player 1'), new PlayerController(this, LAYOUT_STORY, 0));
      this.checkpointX = x;
      for (const [tile, char] of def.enemies) {
        const f = new Fighter(this, this.level.tileX(tile), FLOOR_Y, char, 1, 'enemy');
        f.facing = -1;
        f.onProjectile = (s) => this.spawnProjectile(s);
        this.physics.add.collider(f.sprite, this.level.ground);
        this.enemies.push({ f, ai: new EnemyAI(f, () => this.players[0], this.level) });
      }
      for (const [tile, kind] of def.storyItems) this.spawnItem(this.level.tileX(tile), kind, true);
      this.cameras.main.startFollow(this.players[0].sprite, true, 0.1, 0.1, -140, 0);
    } else {
      const [a, b] = def.versusStart;
      this.addPlayer(new Fighter(this, this.level.tileX(a), FLOOR_Y, 'skull', 0, 'Player 1'), new PlayerController(this, LAYOUT_P1, 0));
      this.addPlayer(new Fighter(this, this.level.tileX(b), FLOOR_Y, 'lizard', 1, 'Player 2'), new PlayerController(this, LAYOUT_P2, 1));
      this.players[1].facing = -1;
      for (const [tile, kind] of def.versusItems) this.spawnItem(this.level.tileX(tile), kind, true);
      this.cameras.main.scrollX = (this.players[0].x + this.players[1].x) / 2 - W / 2;
    }

    this.hud = new Hud(
      this,
      this.players.map((p) => ({ name: p.label, char: p.baseChar })),
      this.mode === 'story',
    );

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('menu'));
    this.input.keyboard!.on('keydown-R', () => {
      if (this.ended) this.scene.restart({ mode: this.mode });
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.ended) this.scene.start('menu');
    });

    this.startTime = this.time.now;
    this.banner(this.mode === 'story' ? LEVEL_1.name : 'VERSUS', 1600);
  }

  private addPlayer(f: Fighter, c: Controller): void {
    f.sprite.setCollideWorldBounds(true);
    f.onProjectile = (s) => this.spawnProjectile(s);
    this.physics.add.collider(f.sprite, this.level.ground);
    this.players.push(f);
    this.controllers.push(c);
  }

  private get fighters(): Fighter[] {
    return [...this.players, ...this.enemies.map((e) => e.f)];
  }

  update(time: number, delta: number): void {
    if (this.ended) {
      this.players.forEach((p) => (p.intent = emptyIntent()));
      this.fighters.forEach((f) => f.update(delta));
      return;
    }
    const dt = delta / 1000;
    const camMid = this.cameras.main.scrollX + W / 2;

    // Intenções.
    this.players.forEach((p, i) => {
      p.intent = p.alive ? this.controllers[i].read() : emptyIntent();
      p.faceTarget = this.nearestFoe(p)?.x ?? null;
    });
    for (const e of this.enemies) {
      const near = Math.abs(e.f.x - camMid) < W * 0.75;
      e.f.intent = near && e.f.alive ? e.ai.read() : emptyIntent();
    }

    this.fighters.forEach((f) => f.update(delta));

    if (this.mode === 'versus') this.updateVersusCamera();

    // Queda na água.
    for (const f of this.fighters) {
      if (f.alive && f.feet > DEATH_Y) this.killFighter(f, null, 'water');
    }

    this.resolveMelee();
    this.updateProjectiles(dt);
    this.updateItems(time);
    this.updateCheckpoint();
    this.checkGoal();

    if (this.mode === 'story') {
      this.hud.setProgress(this.players[0].x / this.level.width);
    } else {
      this.hud.setGo(this.leader === -1 ? 0 : this.leader === 0 ? 1 : -1, PLAYER_COLORS[this.leader] ?? '#fff');
    }
  }

  // ---------- combate ----------

  private nearestFoe(f: Fighter): Fighter | undefined {
    let best: Fighter | undefined;
    let bestD = FACE_RANGE;
    for (const o of this.fighters) {
      if (o === f || o.team === f.team || !o.alive) continue;
      const d = Math.abs(o.x - f.x);
      if (d < bestD && Math.abs(o.feet - f.feet) < 120) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private resolveMelee(): void {
    const all = this.fighters;
    for (const a of all) {
      if (!a.alive) continue;
      const hb = a.activeHitBox();
      if (!hb) continue;
      for (const b of all) {
        if (!b.alive || b.team === a.team || a.attackHits.has(b)) continue;
        if (!overlap(hb, bodyBox(b))) continue;
        a.attackHits.add(b);
        if (b.invulnerable) continue;
        const dir = Math.sign(b.x - a.x) || a.facing;
        if (b.blocksFrom(a.x)) {
          a.knockback(-dir, 360);
          b.knockback(dir, 180);
          this.sparks((a.x + b.x) / 2, b.feet - 34);
          continue;
        }
        this.killFighter(b, a, 'hit');
      }
      // Golpe corpo a corpo rebate projéteis inimigos.
      for (const p of this.projectiles) {
        if (p.bounced || p.owner.team === a.team) continue;
        if (overlap(hb, projBox(p))) this.deflect(p);
      }
    }
  }

  private spawnProjectile(f: Fighter): void {
    const pd = f.def.projectile;
    if (!pd) return;
    const s = this.add.sprite(f.x + f.facing * 30, f.feet - 36, pd.tex).setDepth(DEPTH.projectiles);
    if (pd.spin) s.play(pd.tex);
    s.setFlipX(f.facing < 0);
    s.setAngle(pd.angle * f.facing);
    this.projectiles.push({ sprite: s, owner: f, vx: pd.speed * f.facing, vy: 0, life: 1.6, bounced: false });
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      if (p.bounced) {
        p.vy += 1400 * dt;
        p.sprite.y += p.vy * dt;
        p.sprite.angle += 720 * dt;
        p.sprite.alpha = Math.max(0, p.life / 0.6);
        continue;
      }
      for (const b of this.fighters) {
        if (!b.alive || b.team === p.owner.team || b.invulnerable) continue;
        if (!overlap(projBox(p), bodyBox(b))) continue;
        if (b.blocksFrom(b.x - Math.sign(p.vx) * 10)) {
          this.sparks(p.sprite.x, p.sprite.y);
          this.deflect(p);
        } else {
          this.killFighter(b, p.owner, 'hit');
          p.life = 0;
        }
        break;
      }
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (p.life > 0 && p.sprite.y < H + 50) return true;
      p.sprite.destroy();
      return false;
    });
  }

  private deflect(p: Projectile): void {
    p.bounced = true;
    p.vx *= -0.25;
    p.vy = -380;
    p.life = 0.6;
  }

  private killFighter(victim: Fighter, killer: Fighter | null, cause: 'hit' | 'water'): void {
    if (!victim.alive) return;
    const dir = killer ? Math.sign(victim.x - killer.x) || 1 : 1;
    const dropped = cause === 'hit' ? victim.def.drops : undefined;
    const x = victim.x;
    victim.kill(cause, dir);

    if (cause === 'water') {
      this.fx('splash', x, WATER_Y - 50, 1);
    } else {
      this.fx('dust', x, victim.feet - 20, 1.6);
      this.sparks(x, victim.feet - 34);
      this.cameras.main.shake(120, 0.006);
    }
    if (dropped && this.level.isGround(x)) this.spawnItem(x, dropped, false);

    const pi = this.players.indexOf(victim);
    if (pi === -1) {
      this.time.delayedCall(700, () => {
        this.enemies = this.enemies.filter((e) => e.f !== victim);
        victim.destroy();
      });
      return;
    }

    if (this.mode === 'story') {
      this.deaths++;
      this.time.delayedCall(RESPAWN_DELAY, () => {
        if (this.ended) return;
        victim.respawn(this.checkpointX, FLOOR_Y);
        this.hud.setChar(0, victim.def.id);
        this.fx('transform', victim.x, FLOOR_Y - 40, 1);
      });
    } else {
      // Quem matou (ou o sobrevivente) ganha a vez de avançar.
      this.leader = 1 - pi;
      this.time.delayedCall(RESPAWN_DELAY, () => {
        if (this.ended) return;
        victim.respawn(this.versusRespawnX(pi), FLOOR_Y);
        this.hud.setChar(pi, victim.def.id);
        this.fx('transform', victim.x, FLOOR_Y - 40, 1);
      });
    }
  }

  /** Renasce à frente de quem tem a vez, como no gênero cabo-de-guerra. */
  private versusRespawnX(pi: number): number {
    const leader = this.players[1 - pi];
    const dir = leader.team === 0 ? 1 : -1;
    const base = leader.alive ? leader.x : this.cameras.main.scrollX + W / 2;
    let x = this.level.nearestGround(base + dir * 480, dir);
    if (Math.abs(x - base) < 160) x = this.level.nearestGround(base - dir * 360, -dir);
    return x;
  }

  private updateVersusCamera(): void {
    const cam = this.cameras.main;
    const alive = this.players.filter((p) => p.alive);
    let target: number;
    const lead = this.players[this.leader];
    if (lead && lead.alive) target = lead.x + (lead.team === 0 ? 1 : -1) * 180;
    else if (alive.length) target = alive.reduce((s, p) => s + p.x, 0) / alive.length;
    else target = cam.scrollX + W / 2;
    const desired = Phaser.Math.Clamp(target - W / 2, 0, this.level.width - W);
    cam.scrollX += (desired - cam.scrollX) * 0.08;

    // Quem não tem a vez fica preso dentro da tela.
    this.players.forEach((p, i) => {
      if (!p.alive || i === this.leader) return;
      const min = cam.scrollX + 24;
      const max = cam.scrollX + W - 24;
      if (p.x < min || p.x > max) {
        p.body.reset(Phaser.Math.Clamp(p.x, min, max), p.sprite.y);
      }
    });
  }

  // ---------- itens / transformação ----------

  private spawnItem(x: number, kind: ItemId, home: boolean): void {
    const y = FLOOR_Y - 24;
    const glow = this.add.ellipse(x, FLOOR_Y - 2, 46, 12, 0xfff7a8, 0.45).setDepth(DEPTH.items);
    const sprite = this.add.sprite(x, y, ITEM_TEXTURE[kind], 0).setDepth(DEPTH.items);
    if (kind === 'harpoon') sprite.setAngle(45);
    this.tweens.add({ targets: sprite, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    this.items.push({ kind, sprite, glow, home, active: true, respawnAt: 0 });
  }

  private updateItems(time: number): void {
    for (const it of this.items) {
      if (!it.active) {
        if (it.home && this.mode === 'versus' && time >= it.respawnAt) {
          it.active = true;
          it.sprite.setVisible(true);
          it.glow.setVisible(true);
        }
        continue;
      }
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.alive) continue;
        if (Math.abs(p.x - it.sprite.x) > 34 || Math.abs(p.feet - FLOOR_Y) > 30) continue;
        const char = ITEM_TO_CHAR[it.kind];
        if (p.def.id === char) continue;
        this.transform(i, char);
        it.active = false;
        it.sprite.setVisible(false);
        it.glow.setVisible(false);
        if (it.home && this.mode === 'versus') it.respawnAt = time + ITEM_RESPAWN;
        break;
      }
    }
    // Itens soltos por quem morreu somem quando pegos.
    this.items = this.items.filter((it) => {
      if (it.home || it.active) return true;
      it.sprite.destroy();
      it.glow.destroy();
      return false;
    });
  }

  private transform(pi: number, char: keyof typeof CHARS): void {
    const p = this.players[pi];
    this.fx('transform', p.x, p.feet - 40, 1);
    p.applyChar(char);
    this.hud.setChar(pi, char);
    const t = this.add
      .text(p.x, p.feet - 110, CHARS[char].name.toUpperCase() + '!', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '22px',
        color: '#ffe066',
        stroke: '#10223a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ---------- progresso ----------

  private updateCheckpoint(): void {
    if (this.mode !== 'story') return;
    const p = this.players[0];
    if (!p.alive || !p.onGround) return;
    const seg = this.level.segmentAt(p.x);
    if (!seg) return;
    const x = seg[0] * 64 + 48;
    if (x > this.checkpointX) this.checkpointX = x;
  }

  private checkGoal(): void {
    const end = this.level.width - 80;
    const [p1, p2] = this.players;
    if (p1.alive && p1.x >= end) {
      if (this.mode === 'story') {
        const secs = ((this.time.now - this.startTime) / 1000).toFixed(1);
        this.finish('FASE CONCLUÍDA!', `Tempo: ${secs}s   ·   Mortes: ${this.deaths}`, PLAYER_COLORS[0]);
      } else this.finish('PLAYER 1 VENCEU!', 'Chegou ao fim do mapa', PLAYER_COLORS[0]);
    } else if (p2 && p2.alive && p2.x <= 80) {
      this.finish('PLAYER 2 VENCEU!', 'Chegou ao fim do mapa', PLAYER_COLORS[1]);
    }
  }

  private finish(title: string, sub: string, color: string): void {
    this.ended = true;
    this.hud.setGo(0, '#fff');
    this.add.rectangle(0, 0, W, H, 0x0b1626, 0.6).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud + 1);
    const style = { fontFamily: FONT, fontStyle: 'bold', color, stroke: '#10223a', strokeThickness: 12 };
    this.add
      .text(W / 2, H / 2 - 60, title, { ...style, fontSize: '80px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 2);
    this.add
      .text(W / 2, H / 2 + 20, sub, { ...style, fontSize: '30px', color: '#fff7dc', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 2);
    this.add
      .text(W / 2, H / 2 + 90, 'Enter: menu   ·   R: jogar de novo', {
        ...style,
        fontSize: '24px',
        color: '#fff7dc',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 2);
  }

  // ---------- efeitos ----------

  private fx(key: string, x: number, y: number, scale: number): void {
    const s = this.add.sprite(x, y, key).setDepth(DEPTH.fx).setScale(scale).play(key);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  private sparks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(DEPTH.fx).setScale(0.5);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.Between(20, 44);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r,
        scale: 0,
        duration: 260,
        onComplete: () => s.destroy(),
      });
    }
  }

  private banner(text: string, ms: number): void {
    const t = this.add
      .text(W / 2, 110, text, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '46px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 500, onComplete: () => t.destroy() });
  }
}

function bodyBox(f: Fighter): HitBox {
  const b = f.body;
  return { x1: b.left, x2: b.right, y1: b.top, y2: b.bottom };
}

function projBox(p: Projectile): HitBox {
  return { x1: p.sprite.x - 12, x2: p.sprite.x + 12, y1: p.sprite.y - 8, y2: p.sprite.y + 8 };
}

function overlap(a: HitBox, b: HitBox): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}
