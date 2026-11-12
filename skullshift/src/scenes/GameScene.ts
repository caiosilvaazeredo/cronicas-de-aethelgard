import Phaser from 'phaser';
import { DEATH_Y, DEPTH, FLOOR_Y, BODY_FONT, FONT, H, PORTRAIT, RESPAWN_DELAY, VIEW, W, WATER_Y } from '../config';
import { EnemyAI } from '../game/ai';
import { CHARS, ITEM_TEXTURE, ITEM_TO_CHAR, type CharId, type ItemId } from '../game/characters';
import { PICK_LABEL, PlayerController, emptyIntent, type Controller, type DeviceId } from '../game/controls';
import { Fighter, type HitBox } from '../game/Fighter';
import { LEVEL_1, Level } from '../game/level';
import { PLAYER_HEX, PLAYER_TINT } from '../ui/devices';
import type { UIScene, VictoryInfo } from './UIScene';

type Mode = 'story' | 'versus';

interface Item {
  kind: ItemId;
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Ellipse;
  /** Aviso "E pegar" que aparece quando um jogador está em cima. */
  prompt: Phaser.GameObjects.Text;
  home: boolean;
  active: boolean;
  respawnAt: number;
  /** Itens que caíram de arremessos somem depois de um tempo (0 = não somem). */
  expireAt: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  /** Item em que o projétil vira ao cair no chão (osso, arpão). */
  kind?: ItemId;
  gravity: number;
  glow?: Phaser.GameObjects.Image;
  owner: Fighter;
  vx: number;
  vy: number;
  life: number;
  bounced: boolean;
}

const ITEM_RESPAWN = 8000;
const FACE_RANGE = 460;
const SCREEN_TWEEN = 550;
/** Distância (entre os centros) em que o golpe quebra a defesa. */
const POINT_BLANK = 58;

export class GameScene extends Phaser.Scene {
  mode: Mode = 'story';
  devices: DeviceId[] = [];
  level!: Level;
  players: Fighter[] = [];
  private controllers: Controller[] = [];
  private enemies: Array<{ f: Fighter; ai: EnemyAI }> = [];
  private items: Item[] = [];
  private projectiles: Projectile[] = [];
  /** Versus: quem tem a vez de avançar (-1 = ninguém ainda). */
  leader = -1;
  /** Cenário (tela) atual da câmera. */
  screen = 0;
  /** Centro x da câmera (em pé, ela segue o jogador dentro do cenário). */
  private camX = 0;
  victoryInfo?: VictoryInfo;
  private transitioning = false;
  private checkpointX = 0;
  private deaths = 0;
  private startTime = 0;
  private ended = false;
  private winner?: Fighter;
  /** Recorta o que estiver abaixo da superfície da água (personagem afundando). */
  private aboveWater!: Phaser.Display.Masks.GeometryMask;

  /** Camada de interface (HUD, toque, vitória). */
  get ui(): UIScene | undefined {
    const u = this.scene.get('ui') as UIScene | undefined;
    return u && u.sys.isActive() ? u : undefined;
  }

  constructor() {
    super('game');
  }

  init(data: { mode?: Mode; devices?: DeviceId[] }): void {
    this.mode = data.mode ?? 'story';
    this.devices = data.devices ?? (this.mode === 'story' ? ['kb-full'] : ['kb-left', 'kb-right']);
    this.players = [];
    this.controllers = [];
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.leader = -1;
    this.deaths = 0;
    this.ended = false;
    this.transitioning = false;
    this.winner = undefined;
    this.victoryInfo = undefined;
  }

  create(): void {
    const def = LEVEL_1;
    this.level = new Level(this, def);
    this.physics.world.setBounds(0, -400, this.level.width, H + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.input.addPointer(4); // multitoque
    const mg = this.make.graphics({}, false);
    mg.fillStyle(0xffffff).fillRect(-W, -2000, this.level.width + 2 * W, 2000 + WATER_Y + 3);
    this.aboveWater = mg.createGeometryMask();

    if (this.mode === 'story') {
      const [sc, tile] = def.storyStart;
      this.screen = sc;
      const x = this.level.tileX(sc, tile);
      this.addPlayer(new Fighter(this, x, FLOOR_Y, 'skull', 0, 'Player 1', PLAYER_TINT[0], 'P1'), this.devices[0]);
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
      // Em pé a câmera mostra menos: os dois começam mais perto, na plataforma longa.
      const [a, b] = VIEW.portrait ? [4, 10] : def.versusStart;
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, a), FLOOR_Y, 'skull', 0, 'Player 1', PLAYER_TINT[0], 'P1'), this.devices[0]);
      // Os dois começam como esqueleto; cor, aura e etiqueta diferenciam.
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, b), FLOOR_Y, 'skull', 1, 'Player 2', PLAYER_TINT[1], 'P2'), this.devices[1]);
      this.players[1].facing = -1;
      def.screens.forEach((s, si) => {
        for (const [t, kind] of s.versusItems ?? []) this.spawnItem(this.level.tileX(si, t), kind, true);
      });
    }
    this.camX = this.cameraTarget();
    this.setupCamera();

    // Interface em uma cena por cima (sem o zoom da câmera do mundo).
    this.scene.launch('ui', { game: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('ui'));
    this.time.delayedCall(0, () => this.ui?.banner(this.mode === 'story' ? def.name : 'VERSUS', 1600));

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('menu', { stage: 'modes' }));
    kb.on('keydown-R', () => this.ended && this.restartMatch());
    kb.on('keydown-ENTER', () => this.ended && this.scene.start('menu', { stage: 'modes' }));

    this.startTime = this.time.now;
  }

  // ---------- câmera / orientação ----------

  /** Deitado: o cenário inteiro. Em pé: faixa do meio com zoom, seguindo o jogador. */
  private setupCamera(): void {
    const cam = this.cameras.main;
    if (VIEW.portrait) cam.setViewport(0, PORTRAIT.hudH, W, PORTRAIT.worldH).setZoom(PORTRAIT.zoom);
    // (zoom em pé: a faixa mostra ~680 px de altura do mundo, do céu até a água)
    else cam.setViewport(0, 0, W, H).setZoom(1);
    this.applyCamera();
  }

  private get halfView(): number {
    return VIEW.portrait ? W / PORTRAIT.zoom / 2 : W / 2;
  }

  private applyCamera(): void {
    const cy = VIEW.portrait ? 655 - PORTRAIT.worldH / PORTRAIT.zoom / 2 : H / 2;
    this.cameras.main.centerOn(this.camX, cy);
  }

  /** Para onde a câmera quer olhar, presa ao cenário atual. */
  private cameraTarget(screen = this.screen): number {
    const a = screen * W;
    if (!VIEW.portrait) return a + W / 2;
    let x: number;
    const lead = this.players[this.leader];
    const alive = this.players.filter((p) => p.alive);
    if (this.mode === 'story') x = this.players[0].x;
    else if (lead && lead.alive) x = lead.x + (lead.team === 0 ? 1 : -1) * 120;
    else x = alive.length ? alive.reduce((s, p) => s + p.x, 0) / alive.length : a + W / 2;
    return Phaser.Math.Clamp(x, a + this.halfView, a + W - this.halfView);
  }

  /** Chamado quando o celular gira: reposiciona a câmera e recria a interface. */
  relayout(): void {
    this.setupCamera();
    this.scene.stop('ui');
    this.scene.launch('ui', { game: this });
  }

  private addPlayer(f: Fighter, device: DeviceId): void {
    f.sprite.setCollideWorldBounds(true);
    f.onProjectile = (s) => this.spawnProjectile(s);
    f.onDoubleJump = (ff) => this.fx('dust', ff.x, ff.feet - 4, 1.3, ff.color);
    this.physics.add.collider(f.sprite, this.level.ground);
    const i = this.players.length;
    this.players.push(f);
    this.controllers.push(new PlayerController(this, device, () => this.ui?.pads[i]));
  }

  private get fighters(): Fighter[] {
    return [...this.players, ...this.enemies.map((e) => e.f)];
  }

  restartMatch(): void {
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
    this.level.update(time, delta);

    if (this.mode === 'story') this.updateStoryScreens();
    else this.updateVersusScreens();
    if (!this.transitioning) this.camX += (this.cameraTarget() - this.camX) * 0.12;
    this.applyCamera();

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
      this.ui?.hud?.setGo(this.leader === -1 ? 0 : this.leader === 0 ? 1 : -1, PLAYER_HEX[this.leader] ?? '#fff');
    } else {
      const cleared = !this.enemies.some((e) => e.f.alive && this.level.screenOf(e.f.x) === this.screen);
      this.ui?.hud?.setGo(cleared && this.screen < this.level.screenCount - 1 ? 1 : 0, '#fff7dc');
    }
  }

  // ---------- cenários e transições ----------

  /** Muda a câmera para outro cenário com um deslize. */
  private goScreen(n: number): void {
    if (n === this.screen || n < 0 || n >= this.level.screenCount) return;
    const dir = Math.sign(n - this.screen);
    this.screen = n;
    this.transitioning = true;
    this.ui?.hud?.setScreen(n, this.mode === 'versus' && this.leader >= 0 ? PLAYER_TINT[this.leader] : 0xfff7dc);
    // Em pé, entra pela borda de onde veio.
    const a = n * W;
    const to = VIEW.portrait ? (dir > 0 ? a + this.halfView : a + W - this.halfView) : a + W / 2;
    this.tweens.add({
      targets: this,
      camX: to,
      duration: SCREEN_TWEEN,
      ease: 'Sine.easeInOut',
      onComplete: () => (this.transitioning = false),
    });

    if (this.mode === 'story') {
      // Checkpoint na entrada do novo cenário.
      const entry = dir > 0 ? a + 70 : a + W - 70;
      this.checkpointX = this.level.nearestGround(entry, -dir, a + 40, a + W - 40);
      return;
    }
    // Versus: quem não tem a vez reaparece no novo cenário, à frente de quem tem.
    const other = this.players[1 - this.leader];
    if (other && other.alive) {
      other.vanish();
      this.revive(1 - this.leader, () => this.versusSpawnX(1 - this.leader));
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
      // Presos à parte visível (em pé a câmera mostra só um pedaço do cenário).
      const va = Math.max(a, this.camX - this.halfView);
      const vb = Math.min(b, this.camX + this.halfView);
      const min = isLeader && dir < 0 ? -Infinity : va + 22;
      const max = isLeader && dir > 0 ? Infinity : vb - 22;
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
        if (b.blocksFrom(a.x, hb.low)) {
          if (Math.abs(a.x - b.x) <= POINT_BLANK) {
            // À queima-roupa: o golpe quebra a defesa e deixa o outro tonto.
            this.guardBreak(b, dir);
            continue;
          }
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

  private guardBreak(b: Fighter, dir: number): void {
    b.stun(950);
    b.knockback(dir, 260);
    this.cameras.main.shake(140, 0.008);
    // Pedaços do escudo voando.
    for (let i = 0; i < 5; i++) {
      const piece = this.add.image(b.x + dir * 14, b.feet - 30, 'shield').setScale(0.45).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: piece,
        x: piece.x + dir * Phaser.Math.Between(30, 90),
        y: piece.y - Phaser.Math.Between(20, 70),
        angle: Phaser.Math.Between(-300, 300),
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
    }
    this.sparks(b.x, b.feet - 34);
    this.popText(b.x, b.feet - 120, 'QUEBROU!', '#ffe066');
  }

  private popText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '30px', color, stroke: '#10223a', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 2)
      .setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 650, duration: 450, onComplete: () => t.destroy() });
  }

  private spawnProjectile(f: Fighter): void {
    const pd = f.def.projectile;
    if (!pd) return;
    // Altura do peito: quem está agachado escapa por baixo.
    const s = this.add.sprite(f.x + f.facing * 30, f.feet - 42, pd.tex).setDepth(DEPTH.projectiles);
    if (pd.spin) s.play(pd.tex);
    s.setFlipX(f.facing < 0);
    s.setAngle(pd.angle * f.facing);
    // Brilho na cor de quem atirou (jogadores).
    const glow =
      f.color !== undefined
        ? this.add.image(s.x, s.y, 'aura').setTint(f.color).setScale(0.55, 0.4).setDepth(DEPTH.projectiles - 1).setBlendMode(Phaser.BlendModes.ADD)
        : undefined;
    // Osso sai em arco e cai; o arpão vai quase reto. Os dois viram item ao cair no chão.
    const arc = pd.tex === 'bone' ? { vy: -150, g: 430 } : { vy: -30, g: 110 };
    const kind: ItemId | undefined = pd.tex === 'bone' ? 'bone' : pd.tex === 'harpoon' ? 'harpoon' : undefined;
    this.projectiles.push({ sprite: s, glow, kind, gravity: arc.g, owner: f, vx: pd.speed * f.facing, vy: arc.vy, life: 3, bounced: false });
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      p.vy += (p.bounced ? 1400 : p.gravity) * dt;
      p.sprite.y += p.vy * dt;
      if (p.bounced) p.sprite.angle += 720 * dt;
      else if (p.kind === 'harpoon') p.sprite.setAngle(45 * Math.sign(p.vx) + Math.atan2(p.vy, Math.abs(p.vx)) * (180 / Math.PI) * Math.sign(p.vx));
      p.glow?.setPosition(p.sprite.x, p.sprite.y).setVisible(!p.bounced);
      // Caiu: no chão vira item que dá para pegar; na água, some com um respingo.
      if (p.vy > 0 && p.sprite.y >= FLOOR_Y - 10 && this.level.isGround(p.sprite.x)) {
        if (p.kind) this.spawnItem(p.sprite.x, p.kind, false, 9000);
        else this.fx('dust', p.sprite.x, FLOOR_Y - 8, 0.8);
        p.life = 0;
        continue;
      }
      if (p.sprite.y > WATER_Y + 4) {
        const sp = this.add.sprite(p.sprite.x, WATER_Y + 2, 'splash').setScale(0.5).setDepth(DEPTH.fx).play('splash');
        sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
        p.life = 0;
        continue;
      }
      if (p.bounced) continue;
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
      p.glow?.destroy();
      return false;
    });
  }

  private deflect(p: Projectile): void {
    p.bounced = true;
    p.vx *= -0.25;
    p.vy = -380;
    p.life = 2;
  }

  private killFighter(victim: Fighter, killer: Fighter | null, cause: 'hit' | 'water'): void {
    if (!victim.alive) return;
    const dir = killer ? Math.sign(victim.x - killer.x) || 1 : 1;
    const dropped = cause === 'hit' ? victim.def.drops : undefined;
    const x = victim.x;
    victim.kill(cause, dir);

    if (cause === 'water') {
      this.waterSplash(x, victim);
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
      this.time.delayedCall(RESPAWN_DELAY / 2, () => {
        if (!this.ended) this.revive(0, () => this.checkpointX);
      });
    } else {
      this.leader = 1 - pi;
      this.ui?.hud?.setScreen(this.screen, PLAYER_TINT[this.leader]);
      this.time.delayedCall(RESPAWN_DELAY / 2, () => {
        if (!this.ended && !victim.alive) this.revive(pi, () => this.versusSpawnX(pi));
      });
    }
  }

  /** Queda na água: respingo na superfície, ondas, bolhas e o corpo afundando (recortado). */
  private waterSplash(x: number, victim: Fighter): void {
    victim.sprite.setMask(this.aboveWater);
    const s = this.add.sprite(x, WATER_Y + 2, 'splash').setScale(1.35).setDepth(DEPTH.fx).play('splash');
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    for (let i = 0; i < 3; i++) {
      const ring = this.add.ellipse(x, WATER_Y + 8, 60, 14).setStrokeStyle(3, 0xd8f4ff, 0.9).setDepth(DEPTH.waterRocks).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 2 + i * 0.6, alpha: 0, delay: i * 180, duration: 900, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    }
    // Gotas para cima.
    for (let i = 0; i < 8; i++) {
      const d = this.add.circle(x, WATER_Y, Phaser.Math.Between(2, 4), 0xd8f4ff).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: d,
        x: x + Phaser.Math.Between(-50, 50),
        y: WATER_Y - Phaser.Math.Between(30, 80),
        duration: 300,
        ease: 'Quad.easeOut',
        yoyo: true,
        onComplete: () => d.destroy(),
      });
    }
    // Bolhas subindo enquanto ele afunda.
    for (let i = 0; i < 6; i++) {
      const b = this.add.circle(x + Phaser.Math.Between(-12, 12), WATER_Y + 70, Phaser.Math.Between(3, 6)).setStrokeStyle(2, 0xffffff, 0.8).setDepth(DEPTH.waterRocks);
      this.tweens.add({
        targets: b,
        y: WATER_Y + 6,
        x: b.x + Phaser.Math.Between(-10, 10),
        delay: 200 + i * 130,
        duration: 600,
        ease: 'Sine.easeOut',
        onComplete: () => b.destroy(),
      });
    }
    this.cameras.main.shake(90, 0.004);
  }

  /**
   * O xamã chega numa nuvem trazendo o espírito do personagem pendurado (como o juiz de
   * pista que resgata o piloto), conjura, o corpo inteiro se forma no chão e ele vai embora
   * flutuando devagar.
   */
  private revive(pi: number, spawnX: () => number): void {
    const p = this.players[pi];
    if (p.reviving || p.alive) return;
    p.reviving = true;
    const color = PLAYER_TINT[pi];
    const from = p.team === 0 ? -1 : 1; // chega por trás de quem vai renascer
    const x = spawnX();
    const hoverY = FLOOR_Y - 190;
    const d = CHARS[p.baseChar];
    const ghostFeet = 150; // pés do espírito abaixo do centro da nuvem
    const ghostY = ghostFeet - (d.feetY - d.frame / 2);

    const rope = this.add.graphics();
    rope.lineStyle(2, 0xfff7dc, 0.8).lineBetween(14 * -from, -10, 0, ghostFeet - 70);
    const ghost = this.add.sprite(0, ghostY, `${p.baseChar}_idle`).play(`${p.baseChar}_idle`);
    ghost.setAlpha(0.6).setTint(0xcfefff).setFlipX(from > 0);
    const glow = this.add.image(0, ghostY - 10, 'aura').setTint(color).setScale(0.9, 1).setAlpha(0.6);
    const cloud = this.add.image(0, 46, 'cloud_05').setScale(0.3);
    const shaman = this.add.sprite(0, -6, 'shaman_idle').play('shaman_idle').setFlipX(from > 0);
    // Atrás dos personagens: o xamã nunca cobre ninguém.
    const rig = this.add.container(x + from * 420, hoverY - 300, [rope, glow, ghost, cloud, shaman]).setDepth(DEPTH.fighters - 2).setAlpha(0);
    const bob = this.tweens.add({ targets: [cloud, shaman], y: '+=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [ghost, glow], angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 1) Chega planando.
    this.tweens.add({
      targets: rig,
      alpha: 1,
      x,
      y: hoverY,
      duration: 750,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // 2) Conjura: o espírito desce e vira o corpo inteiro.
        shaman.play('shaman_attack');
        this.time.delayedCall(320, () => {
          if (this.ended) return;
          rope.setVisible(false);
          this.tweens.killTweensOf([ghost, glow]);
          ghost.setAngle(0);
          this.tweens.add({
            targets: [ghost, glow],
            y: `+=${FLOOR_Y - hoverY - ghostFeet}`,
            duration: 240,
            ease: 'Quad.easeIn',
            onComplete: () => {
              ghost.setVisible(false);
              glow.setVisible(false);
              p.respawn(rig.x, FLOOR_Y);
              p.sprite.setTintFill(0xffffff);
              this.time.delayedCall(140, () => p.sprite.clearTint());
              this.ui?.hud?.setChar(pi, p.def.id);
              this.announce(pi);
            },
          });
        });
        // 3) Vai embora flutuando, sem pressa.
        shaman.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          shaman.play('shaman_idle');
          this.tweens.add({
            targets: rig,
            x: rig.x + from * 160,
            y: hoverY - 340,
            alpha: 0,
            duration: 1300,
            ease: 'Sine.easeIn',
            onComplete: () => {
              bob.stop();
              rig.destroy();
            },
          });
        });
      },
    });
  }

  // ---------- itens / transformação ----------

  private spawnItem(x: number, kind: ItemId, home: boolean, ttl = 0): void {
    const y = FLOOR_Y - 24;
    const glow = this.add.ellipse(x, FLOOR_Y - 2, 46, 12, 0xfff7a8, 0.45).setDepth(DEPTH.items);
    const sprite = this.add.sprite(x, y, ITEM_TEXTURE[kind], 0).setDepth(DEPTH.items);
    if (kind === 'harpoon') sprite.setAngle(45);
    this.tweens.add({ targets: sprite, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    const prompt = this.add
      .text(x, y - 46, '', {
        fontFamily: BODY_FONT,
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#10223a',
        strokeThickness: 4,
        align: 'center',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 1)
      .setVisible(false);
    this.items.push({ kind, sprite, glow, prompt, home, active: true, respawnAt: 0, expireAt: ttl ? this.time.now + ttl : 0 });
  }

  /**
   * Pegar é opcional: em cima do item aparece "[botão] pegar → personagem" na cor do jogador,
   * e a transformação só acontece se ele apertar o botão de pegar.
   */
  private updateItems(time: number): void {
    for (const it of this.items) {
      if (!it.active) {
        it.prompt.setVisible(false);
        if (it.home && this.mode === 'versus' && time >= it.respawnAt) {
          it.active = true;
          it.sprite.setVisible(true);
          it.glow.setVisible(true);
        }
        continue;
      }
      // Item de arremesso: pisca no fim e some.
      if (it.expireAt) {
        const left = it.expireAt - time;
        const blink = left < 2000 && Math.floor(time / 120) % 2 === 0;
        it.sprite.setAlpha(blink ? 0.3 : 1);
        if (left <= 0) {
          it.active = false;
          it.sprite.setVisible(false);
          it.glow.setVisible(false);
          it.prompt.setVisible(false);
          continue;
        }
      }
      const char = ITEM_TO_CHAR[it.kind];
      let shown = false;
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.alive || p.def.id === char) continue;
        if (Math.abs(p.x - it.sprite.x) > 40 || Math.abs(p.feet - FLOOR_Y) > 30) continue;
        if (p.intent.pick) {
          this.transform(i, char);
          it.active = false;
          it.sprite.setVisible(false);
          it.glow.setVisible(false);
          it.prompt.setVisible(false);
          if (it.home && this.mode === 'versus') it.respawnAt = time + ITEM_RESPAWN;
          shown = true;
          break;
        }
        if (!shown) {
          it.prompt
            .setText(`${PICK_LABEL[this.devices[i]]}  pegar\n${CHARS[char].name}`)
            .setBackgroundColor(PLAYER_HEX[i])
            .setPosition(it.sprite.x, FLOOR_Y + 46)
            .setVisible(true);
          shown = true;
        }
      }
      if (!shown) it.prompt.setVisible(false);
    }
    this.items = this.items.filter((it) => {
      if (it.home || it.active) return true;
      it.sprite.destroy();
      it.glow.destroy();
      it.prompt.destroy();
      return false;
    });
  }

  private transform(pi: number, char: CharId): void {
    const p = this.players[pi];
    // Nuvem de fumaça cobre o personagem; a troca acontece escondida nela.
    this.smokeBurst(p.x, p.feet, PLAYER_TINT[pi], 1);
    this.time.delayedCall(90, () => {
      if (!p.alive) return;
      p.applyChar(char);
      p.sprite.setTintFill(0xffffff);
      this.time.delayedCall(120, () => p.sprite.clearTint());
      this.ui?.hud?.setChar(pi, char);
    });
    const t = this.add
      .text(p.x, p.feet - 110, CHARS[char].name.toUpperCase() + '!', {
        fontFamily: FONT,
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
    this.fighters.forEach((f) => (f.intent = emptyIntent()));

    // Escurece o mundo e destaca o vencedor.
    const dim = this.add.rectangle(-W, -H, W * 3, H * 3, 0x0b1626, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 500 });
    const glow = this.add.ellipse(win.x, win.feet - 2, 150, 34, 0xfff7a8, 0).setDepth(55);
    this.tweens.add({ targets: glow, fillAlpha: 0.55, duration: 500 });
    this.tweens.add({ targets: glow, scaleX: 1.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    win.sprite.setDepth(60);
    win.faceTarget = null;
    win.facing = win.team === 0 ? -1 : 1; // vira para o mapa que atravessou
    this.cameras.main.flash(250, 255, 247, 220);

    // Comemoração: pula e ataca em loop.
    this.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        if (!win.alive) return;
        win.intent = { move: 0, jump: true, attack: false, guard: false, pick: false, crouch: false };
        this.time.delayedCall(220, () => (win.intent = { move: 0, jump: false, attack: true, guard: false, pick: false, crouch: false }));
      },
    });

    this.victoryInfo = { pi, title, sub };
    this.ui?.showVictory(this.victoryInfo);
  }

  private updateVictory(delta: number): void {
    this.applyCamera();
    this.level.update(this.time.now, delta);
    for (const f of this.fighters) {
      if (f !== this.winner) f.intent = emptyIntent();
      f.update(delta);
    }
    if (this.winner) this.winner.intent = { ...this.winner.intent, jump: false, attack: false };
  }

  // ---------- efeitos ----------

  private fx(key: string, x: number, y: number, scale: number, tint?: number): void {
    const s = this.add.sprite(x, y, key).setDepth(DEPTH.fx).setScale(scale).play(key);
    if (tint !== undefined) s.setTint(tint);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  /** Renascimento: efeito na cor do jogador + "P1!"/"P2!" saltando sobre ele. */
  private announce(pi: number): void {
    const p = this.players[pi];
    this.smokeBurst(p.x, p.feet, PLAYER_TINT[pi], 0.7);
    const t = this.add
      .text(p.x, p.feet - 120, `P${pi + 1}!`, {
        fontFamily: FONT,
        fontSize: '34px',
        color: PLAYER_HEX[pi],
        stroke: '#10223a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 2)
      .setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 700, duration: 500, onComplete: () => t.destroy() });
  }

  /** Fumaça (bolinhas cinza que crescem e sobem) + faíscas na cor do jogador + anel no chão. */
  private smokeBurst(x: number, feet: number, tint: number, size: number): void {
    const n = Math.round(14 * size);
    for (let i = 0; i < n; i++) {
      const px = x + Phaser.Math.Between(-30, 30) * size;
      const py = feet - Phaser.Math.Between(4, 70) * size;
      const shade = Phaser.Math.RND.pick([0xf2f2ee, 0xdde3e6, 0xc9d1d6, 0xe9e4da]);
      const puff = this.add.image(px, py, 'puff').setTint(shade).setDepth(DEPTH.fighters + 2).setScale(0.15).setAlpha(0.95);
      this.tweens.add({
        targets: puff,
        x: px + (px - x) * 0.8 + Phaser.Math.Between(-10, 10),
        y: py - Phaser.Math.Between(25, 60) * size,
        scale: Phaser.Math.FloatBetween(0.8, 1.35) * size,
        alpha: 0,
        delay: Phaser.Math.Between(0, 90),
        duration: Phaser.Math.Between(650, 950),
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
    for (let i = 0; i < Math.round(10 * size); i++) {
      const s = this.add.image(x, feet - 36, 'spark').setTint(tint).setDepth(DEPTH.fighters + 3).setScale(0.45);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.Between(40, 80) * size;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * r,
        y: feet - 36 + Math.sin(a) * r * 0.7,
        scale: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
    const ring = this.add.ellipse(x, feet - 2, 50, 14).setStrokeStyle(3, tint, 0.9).setDepth(DEPTH.fighters - 1).setScale(0.4);
    this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
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

}

function bodyBox(f: Fighter): HitBox {
  const b = f.body;
  return { x1: b.left, x2: b.right, y1: b.top, y2: b.bottom };
}

function projBox(p: Projectile): HitBox {
  return { x1: p.sprite.x - 12, x2: p.sprite.x + 12, y1: p.sprite.y - 6, y2: p.sprite.y + 6 };
}

function overlap(a: HitBox, b: HitBox): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}
