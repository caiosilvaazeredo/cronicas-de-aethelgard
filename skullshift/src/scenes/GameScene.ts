import Phaser from 'phaser';
import { DEATH_Y, DEPTH, FLOOR_Y, FONT, H, RESPAWN_DELAY, W, WATER_Y } from '../config';
import { EnemyAI } from '../game/ai';
import { CHARS, ITEM_TEXTURE, ITEM_TO_CHAR, type CharId, type ItemId } from '../game/characters';
import { PlayerController, emptyIntent, type Controller, type DeviceId } from '../game/controls';
import { Fighter, type HitBox } from '../game/Fighter';
import { Hud } from '../game/Hud';
import { LEVEL_1, Level } from '../game/level';
import { TouchPad } from '../game/touch';
import { PLAYER_HEX, PLAYER_TINT, pillButton } from '../ui/devices';

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

const ITEM_RESPAWN = 8000;
const FACE_RANGE = 460;
const SCREEN_TWEEN = 550;

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'story';
  private devices: DeviceId[] = [];
  private level!: Level;
  private players: Fighter[] = [];
  private controllers: Controller[] = [];
  private pads: TouchPad[] = [];
  private enemies: Array<{ f: Fighter; ai: EnemyAI }> = [];
  private items: Item[] = [];
  private projectiles: Projectile[] = [];
  private hud!: Hud;
  /** Versus: quem tem a vez de avançar (-1 = ninguém ainda). */
  private leader = -1;
  /** Cenário (tela) atual da câmera. */
  private screen = 0;
  private transitioning = false;
  private checkpointX = 0;
  private deaths = 0;
  private startTime = 0;
  private ended = false;
  private winner?: Fighter;
  private menuButton?: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  init(data: { mode?: Mode; devices?: DeviceId[] }): void {
    this.mode = data.mode ?? 'story';
    this.devices = data.devices ?? (this.mode === 'story' ? ['kb-full'] : ['kb-left', 'kb-right']);
    this.players = [];
    this.controllers = [];
    this.pads = [];
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.leader = -1;
    this.deaths = 0;
    this.ended = false;
    this.transitioning = false;
    this.winner = undefined;
  }

  create(): void {
    const def = LEVEL_1;
    this.level = new Level(this, def);
    this.physics.world.setBounds(0, -400, this.level.width, H + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.level.width, H);
    this.input.addPointer(4); // multitoque

    if (this.mode === 'story') {
      const [sc, tile] = def.storyStart;
      this.screen = sc;
      const x = this.level.tileX(sc, tile);
      this.addPlayer(new Fighter(this, x, FLOOR_Y, 'skull', 0, 'Player 1'), this.devices[0], 'full');
      this.checkpointX = x;
      def.screens.forEach((s, si) => {
        for (const [t, char] of s.enemies ?? []) {
          const f = new Fighter(this, this.level.tileX(si, t), FLOOR_Y, char, 1, 'enemy');
          f.facing = -1;
          f.onProjectile = (ff) => this.spawnProjectile(ff);
          this.physics.add.collider(f.sprite, this.level.ground);
          this.enemies.push({ f, ai: new EnemyAI(f, () => this.players[0], this.level) });
        }
        for (const [t, kind] of s.storyItems ?? []) this.spawnItem(this.level.tileX(si, t), kind, true);
      });
    } else {
      this.screen = Math.floor(def.screens.length / 2);
      const [a, b] = def.versusStart;
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, a), FLOOR_Y, 'skull', 0, 'Player 1'), this.devices[0], 'left');
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, b), FLOOR_Y, 'lizard', 1, 'Player 2'), this.devices[1], 'right');
      this.players[1].facing = -1;
      def.screens.forEach((s, si) => {
        for (const [t, kind] of s.versusItems ?? []) this.spawnItem(this.level.tileX(si, t), kind, true);
      });
    }
    this.cameras.main.scrollX = this.screen * W;

    const touchLayout = this.pads.length > 0;
    this.hud = new Hud(
      this,
      this.players.map((p) => ({ name: p.label, char: p.baseChar })),
      this.level.screenCount,
      touchLayout,
    );
    this.hud.setScreen(this.screen);

    // Botão de menu (útil no celular, onde não há Esc).
    this.menuButton = pillButton(this, W / 2, H - 34, 'MENU', () => this.scene.start('menu'), 120)
      .setScale(0.7)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 4)
      .setAlpha(0.85);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('menu'));
    kb.on('keydown-R', () => this.ended && this.restart());
    kb.on('keydown-ENTER', () => this.ended && this.scene.start('menu'));

    this.startTime = this.time.now;
    this.banner(this.mode === 'story' ? def.name : 'VERSUS', 1600);
  }

  private addPlayer(f: Fighter, device: DeviceId, side: 'full' | 'left' | 'right'): void {
    f.sprite.setCollideWorldBounds(true);
    f.onProjectile = (s) => this.spawnProjectile(s);
    this.physics.add.collider(f.sprite, this.level.ground);
    let pad: TouchPad | undefined;
    if (device === 'touch') {
      pad = new TouchPad(this, side, PLAYER_TINT[this.players.length]);
      this.pads.push(pad);
    }
    this.players.push(f);
    this.controllers.push(new PlayerController(this, device, pad));
  }

  private get fighters(): Fighter[] {
    return [...this.players, ...this.enemies.map((e) => e.f)];
  }

  private restart(): void {
    this.scene.restart({ mode: this.mode, devices: this.devices });
  }

  update(time: number, delta: number): void {
    if (this.ended) {
      this.updateVictory(delta);
      return;
    }
    const dt = delta / 1000;

    this.players.forEach((p, i) => {
      p.intent = p.alive ? this.controllers[i].read() : emptyIntent();
      p.faceTarget = this.nearestFoe(p)?.x ?? null;
    });
    for (const e of this.enemies) {
      const active = e.f.alive && !this.transitioning && this.level.screenOf(e.f.x) === this.screen;
      e.f.intent = active ? e.ai.read() : emptyIntent();
    }

    this.fighters.forEach((f) => f.update(delta));

    if (this.mode === 'story') this.updateStoryScreens();
    else this.updateVersusScreens();

    for (const f of this.fighters) {
      if (f.alive && f.feet > DEATH_Y) this.killFighter(f, null, 'water');
    }

    this.resolveMelee();
    this.updateProjectiles(dt);
    this.updateItems(time);
    this.updateCheckpoint();
    this.checkGoal();
    if (this.ended) return;

    if (this.mode === 'versus') {
      this.hud.setGo(this.leader === -1 ? 0 : this.leader === 0 ? 1 : -1, PLAYER_HEX[this.leader] ?? '#fff');
    } else {
      const cleared = !this.enemies.some((e) => e.f.alive && this.level.screenOf(e.f.x) === this.screen);
      this.hud.setGo(cleared && this.screen < this.level.screenCount - 1 ? 1 : 0, '#fff7dc');
    }
  }

  // ---------- cenários e transições ----------

  /** Muda a câmera para outro cenário com um deslize. */
  private goScreen(n: number): void {
    if (n === this.screen || n < 0 || n >= this.level.screenCount) return;
    const dir = Math.sign(n - this.screen);
    this.screen = n;
    this.transitioning = true;
    this.hud.setScreen(n, this.mode === 'versus' && this.leader >= 0 ? PLAYER_TINT[this.leader] : 0xfff7dc);
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: n * W,
      duration: SCREEN_TWEEN,
      ease: 'Sine.easeInOut',
      onComplete: () => (this.transitioning = false),
    });

    if (this.mode === 'story') {
      // Checkpoint na entrada do novo cenário.
      const a = n * W;
      const entry = dir > 0 ? a + 70 : a + W - 70;
      this.checkpointX = this.level.nearestGround(entry, -dir, a + 40, a + W - 40);
      return;
    }
    // Versus: quem não tem a vez reaparece no novo cenário, à frente de quem tem.
    const other = this.players[1 - this.leader];
    if (other && other.alive) {
      other.respawn(this.versusSpawnX(1 - this.leader), FLOOR_Y);
      this.hud.setChar(1 - this.leader, other.def.id);
      this.fx('transform', other.x, FLOOR_Y - 40, 1);
    }
  }

  private updateStoryScreens(): void {
    const p = this.players[0];
    if (!p.alive || this.transitioning) return;
    if (p.x > (this.screen + 1) * W) this.goScreen(this.screen + 1);
    else if (p.x < this.screen * W) this.goScreen(this.screen - 1);
  }

  private updateVersusScreens(): void {
    const a = this.screen * W;
    const b = a + W;
    this.players.forEach((p, i) => {
      if (!p.alive) return;
      const isLeader = i === this.leader;
      const dir = p.team === 0 ? 1 : -1;
      // Quem tem a vez sai pela borda da frente e leva a câmera junto.
      if (isLeader && !this.transitioning) {
        if (dir > 0 && p.x > b + 10 && this.screen < this.level.screenCount - 1) return this.goScreen(this.screen + 1);
        if (dir < 0 && p.x < a - 10 && this.screen > 0) return this.goScreen(this.screen - 1);
      }
      if (this.transitioning) return;
      const min = isLeader && dir < 0 ? -Infinity : a + 22;
      const max = isLeader && dir > 0 ? Infinity : b - 22;
      if (p.x < min || p.x > max) p.body.reset(Phaser.Math.Clamp(p.x, min, max), p.sprite.y);
    });
  }

  /** Versus: ponto de renascer à frente de quem tem a vez, dentro do cenário atual. */
  private versusSpawnX(pi: number): number {
    const a = this.screen * W;
    const b = a + W;
    const lead = this.players[1 - pi];
    const dir = lead.team === 0 ? 1 : -1;
    const base = lead.alive ? lead.x : a + W / 2;
    let x = base + dir * 460;
    x = Phaser.Math.Clamp(x, a + 90, b - 90);
    return this.level.nearestGround(x, -dir, a + 60, b - 60);
  }

  private updateCheckpoint(): void {
    if (this.mode !== 'story') return;
    const p = this.players[0];
    if (!p.alive || !p.onGround || this.transitioning) return;
    // Avança o checkpoint conforme o jogador progride dentro do cenário.
    if (p.x > this.checkpointX + 320 && this.level.screenOf(p.x) === this.screen && this.level.isGround(p.x)) {
      this.checkpointX = p.x;
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
      this.leader = 1 - pi;
      this.hud.setScreen(this.screen, PLAYER_TINT[this.leader]);
      this.time.delayedCall(RESPAWN_DELAY, () => {
        if (this.ended || victim.alive) return;
        victim.respawn(this.versusSpawnX(pi), FLOOR_Y);
        this.hud.setChar(pi, victim.def.id);
        this.fx('transform', victim.x, FLOOR_Y - 40, 1);
      });
    }
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
    this.items = this.items.filter((it) => {
      if (it.home || it.active) return true;
      it.sprite.destroy();
      it.glow.destroy();
      return false;
    });
  }

  private transform(pi: number, char: CharId): void {
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

  // ---------- fim de fase ----------

  private checkGoal(): void {
    const end = this.level.width - 70;
    const [p1, p2] = this.players;
    if (p1.alive && p1.x >= end) {
      if (this.mode === 'story') {
        const secs = ((this.time.now - this.startTime) / 1000).toFixed(1);
        this.victory(0, 'FASE CONCLUÍDA!', `Tempo: ${secs}s   ·   Mortes: ${this.deaths}`);
      } else this.victory(0, 'PLAYER 1 VENCEU!', 'Chegou ao fim do lado oposto');
    } else if (p2 && p2.alive && p2.x <= 70) {
      this.victory(1, 'PLAYER 2 VENCEU!', 'Chegou ao fim do lado oposto');
    }
  }

  /** Animação de vitória: holofote, comemoração do vencedor, confete, fogos e faixa. */
  private victory(pi: number, title: string, sub: string): void {
    this.ended = true;
    const win = this.players[pi];
    this.winner = win;
    this.hud.setVisible(false);
    this.menuButton?.setVisible(false);
    this.pads.forEach((p) => p.setVisible(false));
    this.fighters.forEach((f) => (f.intent = emptyIntent()));
    const color = PLAYER_TINT[pi];

    // Escurece o mundo e destaca o vencedor.
    const dim = this.add.rectangle(0, 0, W, H, 0x0b1626, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 500 });
    const glow = this.add.ellipse(win.x, win.feet - 2, 150, 34, 0xfff7a8, 0).setDepth(55);
    this.tweens.add({ targets: glow, fillAlpha: 0.55, duration: 500 });
    this.tweens.add({ targets: glow, scaleX: 1.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    win.sprite.setDepth(60);
    win.faceTarget = null;
    win.facing = win.team === 0 ? -1 : 1; // vira para o mapa que atravessou
    this.cameras.main.flash(250, 255, 247, 220);

    // Confete caindo do topo.
    const colors = [0xffe066, 0xe5533d, 0x3d8bd9, 0x58b947, 0xfff7dc, 0xb07de0];
    this.add
      .particles(0, -20, 'confetti', {
        x: { min: 0, max: W },
        speedY: { min: 140, max: 280 },
        speedX: { min: -70, max: 70 },
        rotate: { min: 0, max: 360 },
        scaleX: { min: 0.6, max: 1.2 },
        lifespan: 4200,
        quantity: 2,
        frequency: 45,
        tint: colors,
        gravityY: 60,
      })
      .setScrollFactor(0)
      .setDepth(70);

    // Fogos de artifício.
    const fireworks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 120, max: 300 },
        lifespan: 800,
        scale: { start: 0.5, end: 0 },
        gravityY: 220,
        tint: colors,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(65);
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => fireworks.explode(26, Phaser.Math.Between(160, W - 160), Phaser.Math.Between(90, 300)),
    });

    // Comemoração: pula e ataca em loop.
    this.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        if (!win.alive) return;
        win.intent = { move: 0, jump: true, attack: false, guard: false };
        this.time.delayedCall(220, () => (win.intent = { move: 0, jump: false, attack: true, guard: false }));
      },
    });

    // Faixa com avatar e título.
    const avatar = this.add
      .image(W / 2, 150, `${win.def.id}_avatar`)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 2)
      .setScale(0);
    this.tweens.add({ targets: avatar, scale: 0.75, duration: 600, ease: 'Back.easeOut', delay: 200 });
    this.tweens.add({ targets: avatar, angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const ribbon = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 1);
    ribbon.fillStyle(0x10223a, 1).fillRect(W / 2 - 420, 262, 840, 104);
    ribbon.fillStyle(color, 1).fillRect(W / 2 - 410, 270, 820, 88);
    ribbon.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(30).color, 1);
    ribbon.fillTriangle(W / 2 - 470, 280, W / 2 - 410, 280, W / 2 - 410, 370).fillTriangle(W / 2 - 470, 380, W / 2 - 410, 340, W / 2 - 410, 380);
    ribbon.fillTriangle(W / 2 + 470, 280, W / 2 + 410, 280, W / 2 + 410, 370).fillTriangle(W / 2 + 470, 380, W / 2 + 410, 340, W / 2 + 410, 380);
    ribbon.setAlpha(0);
    this.tweens.add({ targets: ribbon, alpha: 1, duration: 300, delay: 350 });

    const titleT = this.add
      .text(W / 2, 314, title, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '62px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 3)
      .setScale(0);
    this.tweens.add({ targets: titleT, scale: 1, duration: 650, ease: 'Elastic.easeOut', delay: 450 });

    const subT = this.add
      .text(W / 2, 400, sub, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '26px',
        color: '#fff7dc',
        stroke: '#10223a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 3)
      .setAlpha(0);
    this.tweens.add({ targets: subT, alpha: 1, duration: 400, delay: 900 });

    this.time.delayedCall(1200, () => {
      pillButton(this, W / 2 - 160, 640, 'JOGAR DE NOVO', () => this.restart(), 280, 0xffe066)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 4);
      pillButton(this, W / 2 + 160, 640, 'MENU', () => this.scene.start('menu'), 200)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 4);
    });
  }

  private updateVictory(delta: number): void {
    for (const f of this.fighters) {
      if (f !== this.winner) f.intent = emptyIntent();
      f.update(delta);
    }
    if (this.winner) this.winner.intent = { ...this.winner.intent, jump: false, attack: false };
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
      .text(W / 2, 130, text, {
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
