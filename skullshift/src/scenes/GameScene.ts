import Phaser from 'phaser';
import { DEPTH, FLOOR_Y, BODY_FONT, FONT, H, PORTRAIT, RESPAWN_DELAY, SPLIT, TILE, VIEW, W, WATER_Y, computeSplit } from '../config';
import { EnemyAI } from '../game/ai';
import { CHARS, ITEM_TEXTURE, ITEM_TO_CHAR, type CharId, type EnemyId, type ItemId } from '../game/characters';
import { PICK_LABEL, PlayerController, emptyIntent, type Controller, type DeviceId } from '../game/controls';
import { Fighter, type HitBox } from '../game/Fighter';
import { LEVELS, Level, SKY_FALL_Y, levelFor } from '../game/level';
import { MinotaurBoss, SpiderQueenBoss, type Boss } from '../game/boss';
import { PrincesBoss } from '../game/princes';
import { SeaSystem } from '../game/sea';
import { FieldSystem } from '../game/field';
import { SharkKingBoss } from '../game/sharkking';
import { ShamanBoss } from '../game/shamanboss';
import { GnollKingBoss } from '../game/gnollking';
import { accessoryOffset, baseOf, variantOf, type Accessory } from '../game/variants';
import { CENTER, areaOfLevel, areaTitle } from '../game/areas';
import { completeLevel, deathLimit, findSecret, getPact, giftsOf, hasSecret, hasSeen, markGift, markSeen, setPact } from '../game/progress';
import { SpeechBubble } from '../game/speech';
import { HauntSystem } from '../game/haunt';
import { ShmupSystem } from '../game/shmup';
import { EscapeSystem } from '../game/escape';
import { PuzzleSystem } from '../game/puzzle';
import { MausoleumSystem } from '../game/mausoleum';
import { ABILITIES, hasAbility } from '../game/abilities';
import { playerName } from '../game/names';
import { settings, sfx } from '../game/settings';
import { FIRST_SHIFT, REVIVE_LINES, SHIFT_QUIPS, SPEAKER_NAME, type Line } from '../data/lore';
import { PLAYER_HEX, PLAYER_TINT } from '../ui/devices';
import type { UIScene, VictoryInfo } from './UIScene';

type Mode = 'story' | 'versus';

interface Item {
  kind: ItemId;
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Ellipse;
  /** Aviso "E pegar" que aparece quando um jogador está em cima. */
  prompt: Phaser.GameObjects.Text;
  /** Altura do chão onde o item está (para checar se o jogador está nele). */
  floor: number;
  home: boolean;
  active: boolean;
  respawnAt: number;
  /** Itens que caíram de arremessos somem depois de um tempo (0 = não somem). */
  expireAt: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  /** Bomba explode ao cair; rede prende o jogador em vez de derrubar. */
  effect?: 'bomb' | 'net';
  /** Osso bumerangue (Gnoll Caçador): depois de um tempo volta para quem jogou. */
  boomerang?: { t: number; back: boolean };
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
/** Caverna Submarina: quanto a água sobe (a superfície fica lá no alto). */
const UNDERSEA_TIDE = 400;
/** Aranha pendurada: altura dos pés enquanto está na teia. */
/** Impulso do tubarão saindo da água (bem mais alto que um pulo). */
const SHARK_LEAP_V = 1050;
const HANG_FEET = 236;

interface Hanger {
  f: Fighter;
  state: 'hang' | 'drop' | 'free';
  thread: Phaser.GameObjects.Graphics;
  bob?: Phaser.Tweens.Tween;
}
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
  private enemies: Array<{ f: Fighter; ai: EnemyAI; acc?: Array<{ img: Phaser.GameObjects.Image; a: Accessory }> }> = [];
  private hangers: Hanger[] = [];
  /** Cena de conversa: o jogo congela enquanto os balões aparecem. */
  private cutscene = false;
  private prevStart = true;
  /** Casa assombrada (portas, chave, alavancas, velas, escuridão). */
  private haunt?: HauntSystem;
  /** Chefe da fase (modo história) e estado da arena. */
  private boss?: Boss;
  private bossStarted = false;
  private rootedUntil = 0;
  /** Máscara "acima da água" (sobe junto com a maré). */
  private waterMaskG?: Phaser.GameObjects.Graphics;
  private rootWeb?: Phaser.GameObjects.Image;
  /** Fase de voo com tiro. */
  private shmup?: ShmupSystem;
  /** Fuga: onda de lava, chão desabando, tirolesas e meteoros. */
  private escape?: EscapeSystem;
  /** Fase de chave e porta. */
  private puzzle?: PuzzleSystem;
  sea?: SeaSystem;
  private field?: FieldSystem;
  /** Desafio do mausoléu. */
  private mausoleum?: MausoleumSystem;
  /** Corrida e tiro: próximo disparo e próxima onda de inimigos. */
  private nextGunShot = 0;
  private nextGunSpawn = 0;
  /** Correntes de vento (faixas x do mundo). */
  private winds: Array<[number, number]> = [];
  /** Barreira de fogo das áreas travadas (só libera sem inimigos). */
  private lockWall?: Phaser.GameObjects.Container;
  private lockedScreen = -1;
  private skipLine?: () => void;
  private prevSkip = true;
  private quip?: SpeechBubble;
  /** Teias fixas no teto (área de cada uma), onde o morcego gruda. */
  private webs: Phaser.Geom.Rectangle[] = [];
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
  ended = false;
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

  /** Fase atual (0, 1, 2). */
  levelIndex = 0;

  init(data: { mode?: Mode; devices?: DeviceId[]; level?: number }): void {
    this.levelIndex = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
    this.mode = data.mode ?? 'story';
    this.devices = data.devices ?? (this.mode === 'story' ? ['kb-full'] : ['kb-left', 'kb-right']);
    this.players = [];
    this.controllers = [];
    this.enemies = [];
    this.hangers = [];
    this.webs = [];
    this.items = [];
    this.projectiles = [];
    this.boss = undefined;
    this.shmup = undefined;
    this.escape = undefined;
    this.puzzle = undefined;
    this.sea = undefined;
    this.field = undefined;
    this.mausoleum = undefined;
    this.nextGunShot = 0;
    this.nextGunSpawn = 0;
    this.winds = [];
    this.bossStarted = false;
    this.rootedUntil = 0;
    this.lockWall = undefined;
    this.lockedScreen = -1;
    this.leader = -1;
    this.deaths = 0;
    this.ended = false;
    this.transitioning = false;
    this.winner = undefined;
    this.victoryInfo = undefined;
  }

  create(): void {
    const def = levelFor(LEVELS[this.levelIndex], this.mode === 'story');
    this.level = new Level(this, def);
    this.physics.world.setBounds(0, -400, this.level.width, H + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.input.addPointer(4); // multitoque
    const ground = (x: number) => this.level.groundY(x) ?? FLOOR_Y;
    const mg = this.make.graphics({}, false);
    this.waterMaskG = mg;
    mg.fillStyle(0xffffff).fillRect(-W, -2000, this.level.width + 2 * W, 2000 + WATER_Y + 3);
    this.aboveWater = mg.createGeometryMask();

    if (this.mode === 'story') {
      const [sc, tile] = def.storyStart;
      this.screen = sc;
      const x = this.level.tileX(sc, tile);
      this.addPlayer(new Fighter(this, x, ground(x), 'skull', 0, playerName(0), PLAYER_TINT[0], 'P1'), this.devices[0]);
      this.checkpointX = x;
      def.screens.forEach((s, si) => {
        for (const [t, char] of s.enemies ?? []) {
          const ex = this.level.tileX(si, t);
          const f = new Fighter(this, ex, ground(ex), char as CharId, 1, 'enemy');
          this.setupSwim(f);
          f.facing = -1;
          f.onProjectile = (ff) => this.spawnProjectile(ff);
          this.physics.add.collider(f.sprite, this.level.ground);
          // Casa assombrada: os inimigos são assombrações (lilás e translúcidos).
          if (def.haunt) f.sprite.setTint(0xc8b8ff);
          this.enemies.push({ f, ai: new EnemyAI(f, () => this.players[0], this.level, variantOf(char)?.ability, variantOf(char)?.mound), acc: this.setupVariant(f) });
        }
        for (const [t, kind, h] of s.storyItems ?? []) this.spawnItem(this.level.tileX(si, t), kind, true, 0, h);
      });
      // Trono do Xamã: a caveira, de volta ao corpo, é o aldeão.
      if (def.finale) this.time.delayedCall(10, () => this.becomeVillager(this.players[0]));
      // Caverna Submarina: tudo debaixo d'água e a caveira vira Tubarão (nada livre).
      if (def.undersea) {
        this.level.tide = UNDERSEA_TIDE;
        for (const e of this.enemies) e.f.freeSwim = true;
        this.time.delayedCall(10, () => this.becomeShark(this.players[0]));
      }
      // Habilidades liberadas no save (no modo livre, todas).
      const p0 = this.players[0];
      for (const a of ABILITIES) if (hasAbility(a.id)) p0.abilities.add(a.id);
      p0.onPound = (f) => this.pound(f);
      if (def.puzzle) {
        const levelId = def.id;
        this.puzzle = new PuzzleSystem(
          {
            scene: this,
            level: this.level,
            player: () => this.players[0],
            pickLabel: () => PICK_LABEL[this.devices[0]],
            giftsBefore: giftsOf(levelId),
            gift: (i) => markGift(levelId, i),
            win: (n) => this.storyWin(`${def.winText ?? 'Porta aberta!'}   ·   Presentes: ${n}/3`),
            popText: (x, y, text, color) => this.popText(x, y, text, color),
            killPlayer: () => this.killFighter(this.players[0], null, 'hit'),
          },
          def.puzzle,
        );
      }
      if (def.field) {
        this.field = new FieldSystem(
          {
            scene: this,
            level: this.level,
            player: () => this.players[0],
            killPlayer: () => this.killFighter(this.players[0], null, 'hit'),
            popText: (x, y, text, color) => this.popText(x, y, text, color),
          },
          def.field,
        );
      }
      if (def.sea) {
        this.sea = new SeaSystem(
          {
            scene: this,
            level: this.level,
            player: () => this.players[0],
            killPlayer: () => this.killFighter(this.players[0], null, 'hit'),
            popText: (x, y, text, color) => this.popText(x, y, text, color),
          },
          def.sea,
        );
      }
      if (def.mausoleum) {
        this.mausoleum = new MausoleumSystem({
          scene: this,
          player: () => this.players[0],
          x0: 40,
          x1: this.level.width - 40,
          floor: FLOOR_Y,
          waves: def.mausoleum.waves,
          failed: () => {
            if (this.ended) return;
            this.ended = true;
            this.wasted(0, 'A URNA QUEBROU', 2800);
            this.time.delayedCall(3000, () => this.restartMatch());
          },
          win: () => this.storyWin(def.winText ?? 'A urna está a salvo!'),
          popText: (x, y, text, color) => this.popText(x, y, text, color),
          bar: () => this.ui,
          killPlayer: () => this.killFighter(this.players[0], null, 'hit'),
        });
      }
      if (def.retro) this.setupRetro();
      if (def.secretItem && !hasSecret(def.secretItem.id)) this.placeSecret(def.secretItem);
      if (def.shmup) this.setupShmup();
      if (def.chase)
        this.escape = new EscapeSystem(
          {
            scene: this,
            level: this.level,
            player: () => this.players[0],
            checkpointX: () => this.checkpointX,
            burn: () => this.killFighter(this.players[0], null, 'water'),
            popText: (x, y, text, color) => text && this.popText(x, y, text, color),
            paused: () => this.cutscene || this.ended,
          },
          def.chase,
        );
      if (def.winds) this.setupWinds(def.winds);
      if (def.haunt) {
        this.haunt = new HauntSystem(
          {
            scene: this,
            level: this.level,
            player: () => this.players[0],
            pickLabel: () => PICK_LABEL[this.devices[0]],
            moveTo: (x, feet, checkpoint) => this.teleport(x, feet, checkpoint),
            win: (sub) => this.storyWin(sub),
            popText: (x, y, text, color) => this.popText(x, y, text, color),
          },
          def.haunt,
        );
      }
    } else {
      this.screen = Math.floor(def.screens.length / 2);
      // Em pé a câmera mostra menos: os dois começam mais perto, na plataforma longa.
      const [a, b] = VIEW.portrait ? [4, 10] : def.versusStart;
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, a), ground(this.level.tileX(this.screen, a)), 'skull', 0, playerName(0), PLAYER_TINT[0], 'P1'), this.devices[0]);
      // Os dois começam como esqueleto; cor, aura e etiqueta diferenciam.
      this.addPlayer(new Fighter(this, this.level.tileX(this.screen, b), ground(this.level.tileX(this.screen, b)), 'skull', 1, playerName(1), PLAYER_TINT[1], 'P2'), this.devices[1]);
      this.players[1].facing = -1;
      def.screens.forEach((s, si) => {
        for (const [t, kind, h] of s.versusItems ?? []) this.spawnItem(this.level.tileX(si, t), kind, true, 0, h);
      });
    }
    def.screens.forEach((s, si) => {
      for (const t of s.hangers ?? []) this.addHanger(this.level.tileX(si, t));
    });

    this.camX = this.cameraTarget();
    this.setupCamera();

    // Interface em uma cena por cima (sem o zoom da câmera do mundo).
    this.scene.launch('ui', { game: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('ui'));
    if (this.mode === 'story') {
      const limit = deathLimit(this.levelIndex);
      this.time.delayedCall(0, () => this.ui?.setLives(limit === Infinity ? null : limit - 1, limit - 1));
    }
    this.time.delayedCall(0, () => this.ui?.banner(this.mode === 'story' ? `${this.levelTag()} — ${def.name}` : `VERSUS · ${def.name}`, 1600, def.intro));

    const kb = this.input.keyboard!;
    kb.on('keydown-R', () => this.ended && this.restartMatch());
    kb.on('keydown-ENTER', () => {
      if (!this.ended) return;
      if (this.hasNextLevel) this.nextLevel();
      else this.scene.start('menu', { stage: 'modes' });
    });

    this.startTime = this.time.now;
  }

  // ---------- câmera / orientação ----------

  /** Deitado: o cenário inteiro. Em pé: faixa do meio com zoom, seguindo o jogador. */
  /** 2 jogadores no toque com o celular em pé: tela dividida, P2 de ponta-cabeça. */
  get split(): boolean {
    return VIEW.portrait && this.mode === 'versus' && this.devices.length === 2 && this.devices.every((d) => d === 'touch');
  }

  private cam2?: Phaser.Cameras.Scene2D.Camera;

  private setupCamera(): void {
    const cam = this.cameras.main;
    if (this.split) {
      computeSplit(VIEW.h);
      const half = VIEW.h / 2;
      cam.setViewport(0, half + SPLIT.hudS, W, SPLIT.bandH).setZoom(SPLIT.zoom).setRotation(0);
      // Segunda câmera: mesma ação, girada 180° para quem está do outro lado.
      if (!this.cam2) this.cam2 = this.cameras.add(0, 0, W, SPLIT.bandH);
      this.cam2.setViewport(0, half - SPLIT.hudS - SPLIT.bandH, W, SPLIT.bandH).setZoom(SPLIT.zoom).setRotation(Math.PI);
      this.cam2.setBackgroundColor('#0e1a2b');
    } else {
      if (this.cam2) {
        this.cameras.remove(this.cam2);
        this.cam2 = undefined;
      }
      if (VIEW.portrait) cam.setViewport(0, PORTRAIT.hudH, W, PORTRAIT.worldH).setZoom(PORTRAIT.zoom);
      // (zoom em pé: a faixa mostra ~680 px de altura do mundo, do céu até a água)
      else cam.setViewport(0, 0, W, H).setZoom(1);
    }
    this.applyCamera();
  }

  private get viewZoom(): number {
    return this.split ? SPLIT.zoom : VIEW.portrait ? PORTRAIT.zoom : 1;
  }

  private get halfView(): number {
    return VIEW.portrait ? W / this.viewZoom / 2 : W / 2;
  }

  private applyCamera(): void {
    const band = this.split ? SPLIT.bandH : PORTRAIT.worldH;
    const cy = VIEW.portrait ? 655 - band / this.viewZoom / 2 : H / 2;
    this.cameras.main.centerOn(this.camX, cy);
    this.cam2?.centerOn(this.camX, cy);
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
    this.setupSwim(f);
    this.physics.add.collider(f.sprite, this.level.ground);
    const i = this.players.length;
    this.players.push(f);
    this.controllers.push(new PlayerController(this, device, () => this.ui?.pads[i]));
  }

  private get fighters(): Fighter[] {
    return [...this.players, ...this.enemies.map((e) => e.f)];
  }

  /** Modo história: segue para a próxima fase com os mesmos controles. */
  get hasNextLevel(): boolean {
    return this.mode === 'story';
  }

  /** História: volta ao mapa (a próxima fase já foi liberada na vitória). */
  nextLevel(): void {
    // A última fase do Santuário (ilha central) leva ao epílogo.
    if (LEVELS[this.levelIndex].id === CENTER.levels[CENTER.levels.length - 1]) this.scene.start('vn', { devices: this.devices, epilogue: true });
    else this.scene.start('map', { devices: this.devices, justCompleted: this.levelIndex });
  }

  restartMatch(): void {
    this.scene.restart({ mode: this.mode, devices: this.devices, level: this.levelIndex });
  }

  update(time: number, delta: number): void {
    if (this.ended) {
      this.updateVictory(delta);
      return;
    }
    // Start do controle: pausa.
    const anyStart = (this.input.gamepad?.gamepads ?? []).some((p) => p && p.connected && p.buttons[9]?.pressed);
    if (anyStart && !this.prevStart) this.ui?.openPause();
    this.prevStart = anyStart;
    if (this.cutscene) {
      // Tudo parado; só o cenário respira. Atacar/pular (ou tocar) passa a fala.
      const it = this.controllers[0].read();
      const skip = it.attack || it.jump || it.pick;
      if (skip && !this.prevSkip) this.skipLine?.();
      this.prevSkip = skip;
      this.level.update(time, delta);
      this.boss?.syncVisual(time);
      this.applyCamera();
      return;
    }
    const dt = delta / 1000;

    this.players.forEach((p, i) => {
      p.intent = p.alive ? this.controllers[i].read() : emptyIntent();
      // Corrida e tiro: ATACAR dispara ossos em vez do golpe corpo a corpo.
      if (i === 0 && this.mode === 'story' && LEVELS[this.levelIndex].gun) p.intent = { ...p.intent, attack: false };
      // Preso na teia da Aranha-Rainha: não anda nem pula (dá para atacar e defender).
      if (i === 0 && time < this.rootedUntil) p.intent = { ...p.intent, move: 0, jump: false, jumpHeld: false, sprint: false };
      p.faceTarget = this.nearestFoe(p)?.x ?? null;
    });
    for (const e of this.enemies) {
      const active = e.f.alive && !this.transitioning && this.level.screenOf(e.f.x) === this.screen;
      const hanging = this.hangers.some((h) => h.f === e.f && h.state !== 'free');
      e.f.intent = active && !hanging ? e.ai.read() : emptyIntent();
    }
    this.updateHangers();
    this.updateWebTraps();
    this.updateRoot(time);

    this.fighters.forEach((f) => f.update(delta));
    this.updateAccessories();
    this.level.update(time, delta);

    if (this.mode === 'story') this.updateStoryScreens();
    else this.updateVersusScreens();
    if (!this.transitioning) this.camX += (this.cameraTarget() - this.camX) * 0.12;
    this.applyCamera();

    this.updateSpiderSense();
    if (this.waterMaskG) this.waterMaskG.y = -Math.round(this.level.tide);
    for (const f of this.fighters) {
      if (!f.alive || f.zipping) continue;
      if (f.waterY !== undefined) f.waterY = this.level.waterY;
      if (f.freeSwim) continue; // debaixo d'água: nada livre
      if (f.def.swim && f.waterY !== undefined) continue; // o lagarto nada
      if (baseOf(f.def) === 'shark' && this.level.hasWater && !this.level.isLava) {
        // O tubarão nunca se afoga: ao cair (descendo) na água, afunda e é lançado para cima.
        if (f.feet > this.level.waterY + 4 && f.body.velocity.y >= 0) this.sharkLeap(f);
        continue;
      }
      if (this.level.hasWater && f.feet > this.level.deathY) this.killFighter(f, null, 'water');
      else if (!this.level.hasWater && f.feet > SKY_FALL_Y) this.killFighter(f, null, 'fall');
    }

    this.resolveMelee();
    this.updateProjectiles(dt);
    this.updateItems(time);
    this.haunt?.update(time);
    this.updateBossArena(time, dt);
    this.escape?.update(time, dt);
    this.puzzle?.update(time, dt);
    this.sea?.update(time, dt);
    this.field?.update(time, dt);
    this.mausoleum?.update(time, dt);
    this.updateGun(time);
    this.updateWinds(dt);
    if (this.shmup) {
      this.shmup.update(time, dt);
      this.camX = this.shmup.camX;
      const n = this.level.screenOf(this.camX);
      if (n !== this.screen) {
        this.screen = n;
        this.ui?.hud?.setScreen(n, 0xfff7dc);
      }
      this.applyCamera();
    }
    this.updateLockWall();
    this.updateCheckpoint();
    this.checkGoal();
    if (this.ended) return;

    if (this.mode === 'versus') {
      this.ui?.hud?.setGo(this.leader === -1 ? 0 : this.leader === 0 ? 1 : -1, PLAYER_HEX[this.leader] ?? '#fff');
    } else {
      const cleared = !this.enemies.some((e) => e.f.alive && this.level.screenOf(e.f.x) === this.screen);
      this.ui?.hud?.setGo(cleared && !this.shmup && !this.puzzle && !this.mausoleum && this.screen < this.level.screenCount - 1 ? 1 : 0, '#fff7dc');
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
    // Área travada: a barreira de fogo segura o jogador até derrotar todos os inimigos dela.
    if (this.lockedScreen === this.screen) {
      const edge = (this.screen + 1) * W - 30;
      if (p.x > edge) p.body.reset(edge, p.sprite.y);
    }
    // Arena do chefe: não dá para voltar.
    if (this.bossStarted && p.x < this.screen * W + 50) p.body.reset(this.screen * W + 50, p.sprite.y);
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
    if (!b.def.guard) {
      // Bolha de energia estourando.
      const pop = this.add.image(b.x, b.feet - b.def.head * 0.5, 'bubble').setTint(b.color ?? 0x9fe3ff).setDepth(DEPTH.fx);
      pop.setScale((b.def.head + 34) / 116);
      this.tweens.add({ targets: pop, scale: pop.scale * 1.6, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => pop.destroy() });
    }
    // Pedaços do escudo (ou da bolha) voando.
    for (let i = 0; i < 5; i++) {
      const piece = this.add.image(b.x + dir * 14, b.feet - 30, b.def.guard ? 'shield' : 'spark').setScale(0.45).setDepth(DEPTH.fx);
      if (!b.def.guard) piece.setTint(b.color ?? 0x9fe3ff);
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
    const arc = pd.arc ?? (pd.tex === 'bone' ? { vy: -150, g: 430 } : { vy: -30, g: 110 });
    const kind: ItemId | undefined = pd.tex === 'bone' ? 'bone' : pd.tex === 'harpoon' ? 'harpoon' : undefined;
    const effect = pd.tex === 'bomb' ? 'bomb' : pd.tex === 'net_ball' ? 'net' : undefined;
    // Bomba: mira mais ou menos onde o jogador está (a força do arco depende da distância).
    let vx = pd.speed * f.facing;
    if (effect === 'bomb') {
      const t = this.players[0];
      const dist = t ? Math.min(520, Math.abs(t.x - f.x)) : 300;
      vx = f.facing * Math.max(120, dist * 0.95);
    }
    const boomerang = variantOf(f.def.id)?.ability === 'boomerang';
    this.projectiles.push({
      sprite: s,
      glow,
      kind: boomerang ? undefined : kind,
      effect,
      gravity: boomerang ? 40 : arc.g,
      owner: f,
      vx,
      vy: boomerang ? -30 : arc.vy,
      life: 3,
      bounced: false,
      boomerang: boomerang ? { t: 0, back: false } : undefined,
    });
    // Tubarão de Coral: mais dois arpões em leque.
    if (variantOf(f.def.id)?.ability === 'triple') {
      for (const dvy of [-170, 120]) {
        const s2 = this.add.sprite(s.x, s.y, pd.tex).setDepth(DEPTH.projectiles).setFlipX(f.facing < 0).setAngle(pd.angle * f.facing);
        this.projectiles.push({ sprite: s2, kind: undefined, gravity: arc.g, owner: f, vx: pd.speed * f.facing * 0.9, vy: arc.vy + dvy, life: 3, bounced: false });
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.boomerang && !p.bounced) {
        p.boomerang.t += dt;
        // Freia, dá meia-volta e acelera de volta.
        if (!p.boomerang.back && p.boomerang.t > 0.45) p.vx *= Math.pow(0.02, dt);
        if (!p.boomerang.back && p.boomerang.t > 0.75) {
          p.boomerang.back = true;
          p.vx = -Math.sign(p.vx || 1) * 560;
          p.vy = -20;
        }
      }
      p.sprite.x += p.vx * dt;
      p.vy += (p.bounced ? 1400 : p.gravity) * dt;
      p.sprite.y += p.vy * dt;
      if (p.bounced) p.sprite.angle += 720 * dt;
      else if (p.kind === 'harpoon') p.sprite.setAngle(45 * Math.sign(p.vx) + Math.atan2(p.vy, Math.abs(p.vx)) * (180 / Math.PI) * Math.sign(p.vx));
      p.glow?.setPosition(p.sprite.x, p.sprite.y).setVisible(!p.bounced);
      // Caiu: no chão vira item que dá para pegar; na água, some com um respingo.
      const landY = p.vy > 0 ? this.level.landingY(p.sprite.x, p.sprite.y - p.vy * dt + 10, p.sprite.y + 10) : null;
      if (landY !== null) {
        if (p.effect === 'bomb') this.explode(p.sprite.x, landY, p.owner);
        else if (p.kind) this.spawnItem(p.sprite.x, p.kind, false, 9000, undefined, landY);
        else this.fx('dust', p.sprite.x, landY - 8, 0.8);
        p.life = 0;
        continue;
      }
      if (!this.level.hasWater && p.sprite.y > SKY_FALL_Y) {
        p.life = 0;
        continue;
      }
      if (this.level.hasWater && !LEVELS[this.levelIndex].undersea && p.sprite.y > this.level.waterY + 4) {
        const sp = this.add.sprite(p.sprite.x, this.level.waterY + 2, 'splash').setScale(0.5).setDepth(DEPTH.fx).play('splash');
        sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
        p.life = 0;
        continue;
      }
      if (p.bounced) continue;
      if (this.boss && p.owner.team === 0) {
        const r = projBox(p);
        if (this.boss.tryProjectile(new Phaser.Geom.Rectangle(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1))) {
          this.sparks(p.sprite.x, p.sprite.y);
          p.life = 0;
          continue;
        }
      }
      for (const b of this.fighters) {
        if (!b.alive || b.team === p.owner.team || b.invulnerable) continue;
        if (!overlap(projBox(p), bodyBox(b))) continue;
        if (b.blocksFrom(b.x - Math.sign(p.vx) * 10)) {
          this.sparks(p.sprite.x, p.sprite.y);
          this.deflect(p);
        } else if (p.effect === 'net' && b === this.players[0] && this.mode === 'story') {
          // Rede de pesca: prende o jogador por um tempo em vez de derrubar.
          this.rootPlayer(1600, 'net_ball', 'PRESO NA REDE!');
          p.life = 0;
        } else if (p.effect === 'bomb') {
          this.explode(p.sprite.x, p.sprite.y + 20, p.owner);
          p.life = 0;
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

  private killFighter(victim: Fighter, killer: Fighter | null, cause: 'hit' | 'water' | 'fall' | 'eaten'): void {
    if (!victim.alive) return;
    const dir = killer ? Math.sign(victim.x - killer.x) || 1 : 1;
    // Elite: o golpe tira uma "camada" de armadura em vez de derrubar.
    if (cause === 'hit' && victim.armor > 0) {
      victim.armor--;
      sfx('hit');
      victim.knockback(dir, 420);
      victim.sprite.setTintFill(0xffffff);
      this.time.delayedCall(90, () => victim.sprite.active && victim.sprite.clearTint());
      this.sparks(victim.x, victim.feet - victim.def.head * 0.5);
      this.popText(victim.x, victim.feet - victim.def.head - 30, victim.armor ? `${victim.armor + 1}` : '!', '#ffe066');
      return;
    }
    // No final (o aldeão) ninguém deixa item: o corpo não troca mais de forma.
    const dropped = cause === 'hit' && !LEVELS[this.levelIndex].finale ? victim.def.drops : undefined;
    const x = victim.x;
    sfx(victim.isPlayer ? 'death' : 'hit');
    victim.kill(cause === 'water' ? 'water' : 'hit', dir);

    if (cause === 'water' && this.level.isLava) {
      this.lavaBurn(x, victim);
    } else if (cause === 'water') {
      this.waterSplash(x, victim);
    } else if (cause === 'eaten') {
      // Sem efeito: a aranha já fez o show.
    } else if (cause === 'fall') {
      // Caiu do céu: some num sopro de nuvem.
      this.smokeBurst(x, SKY_FALL_Y - 20, 0xffffff, 1.2);
    } else {
      this.fx('dust', x, victim.feet - 20, 1.6);
      this.sparks(x, victim.feet - 34);
      this.cameras.main.shake(120, 0.006);
    }
    const dropY = this.level.landingY(x, victim.feet - 40, victim.feet + 4);
    if (dropped && dropY !== null) this.spawnItem(x, dropped, false, 0, undefined, dropY);

    const pi = this.players.indexOf(victim);
    if (pi === -1) {
      this.time.delayedCall(700, () => {
        for (const e of this.enemies) if (e.f === victim) e.acc?.forEach(({ img }) => img.destroy());
        this.enemies = this.enemies.filter((e) => e.f !== victim);
        victim.destroy();
      });
      return;
    }

    if (this.mode === 'story') {
      if (this.countStoryDeath(cause === 'eaten' ? 3400 : 700)) return;
      // Virou comida de aranha: dá tempo de ler a faixa antes de o Xamã voltar.
      this.time.delayedCall(cause === 'eaten' ? 3600 : RESPAWN_DELAY / 2, () => {
        if (!this.ended) this.revive(0, () => this.checkpointX);
      });
    } else {
      this.leader = 1 - pi;
      this.ui?.hud?.setScreen(this.screen, PLAYER_TINT[this.leader]);
      this.time.delayedCall(cause === 'eaten' ? 3600 : RESPAWN_DELAY / 2, () => {
        if (!this.ended && !victim.alive) this.revive(pi, () => this.versusSpawnX(pi));
      });
    }
  }

  /** Caiu na lava: o corpo afunda em brasa, sobe fumaça e fagulhas. */
  private lavaBurn(x: number, victim: Fighter): void {
    victim.sprite.setMask(this.aboveWater);
    victim.sprite.setTint(0xff6a1a);
    const s = this.add.sprite(x, this.level.waterY + 2, 'splash').setScale(1.3).setTint(0xffa040).setDepth(DEPTH.fx).play('splash');
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    this.smokeBurst(x, this.level.waterY - 4, 0xff6a1a, 1);
    for (let i = 0; i < 10; i++) {
      const e = this.add.image(x, this.level.waterY, 'spark').setTint(Phaser.Math.RND.pick([0xffe066, 0xff9f1c, 0xff5a1a])).setScale(0.35).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: e,
        x: x + Phaser.Math.Between(-40, 40),
        y: this.level.waterY - Phaser.Math.Between(40, 110),
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        onComplete: () => e.destroy(),
      });
    }
    this.cameras.main.shake(110, 0.005);
  }

  /** Queda na água: respingo na superfície, ondas, bolhas e o corpo afundando (recortado). */
  private waterSplash(x: number, victim: Fighter): void {
    victim.sprite.setMask(this.aboveWater);
    const s = this.add.sprite(x, this.level.waterY + 2, 'splash').setScale(1.35).setDepth(DEPTH.fx).play('splash');
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    for (let i = 0; i < 3; i++) {
      const ring = this.add.ellipse(x, this.level.waterY + 8, 60, 14).setStrokeStyle(3, 0xd8f4ff, 0.9).setDepth(DEPTH.waterRocks).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 2 + i * 0.6, alpha: 0, delay: i * 180, duration: 900, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    }
    // Gotas para cima.
    for (let i = 0; i < 8; i++) {
      const d = this.add.circle(x, this.level.waterY, Phaser.Math.Between(2, 4), 0xd8f4ff).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: d,
        x: x + Phaser.Math.Between(-50, 50),
        y: this.level.waterY - Phaser.Math.Between(30, 80),
        duration: 300,
        ease: 'Quad.easeOut',
        yoyo: true,
        onComplete: () => d.destroy(),
      });
    }
    // Bolhas subindo enquanto ele afunda.
    for (let i = 0; i < 6; i++) {
      const b = this.add.circle(x + Phaser.Math.Between(-12, 12), this.level.waterY + 70, Phaser.Math.Between(3, 6)).setStrokeStyle(2, 0xffffff, 0.8).setDepth(DEPTH.waterRocks);
      this.tweens.add({
        targets: b,
        y: this.level.waterY + 6,
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
    const floor = this.level.groundY(x) ?? FLOOR_Y;
    const hoverY = floor - 190;
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
        // No modo história, o Xamã murmura algo ao buscar a caveira (pista da lore).
        if (this.mode === 'story') {
          const line = Phaser.Utils.Array.GetRandom(REVIVE_LINES);
          const t = this.add
            .text(x, hoverY - 96, `"${line}"`, { fontFamily: BODY_FONT, fontSize: '18px', color: '#e2d2ff', stroke: '#1d1a2b', strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(DEPTH.fx + 1)
            .setAlpha(0);
          this.tweens.add({ targets: t, alpha: 1, y: t.y - 8, duration: 300 });
          this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
        }
        // 2) Conjura: o espírito desce e vira o corpo inteiro.
        shaman.play('shaman_attack');
        this.time.delayedCall(320, () => {
          if (this.ended) return;
          rope.setVisible(false);
          this.tweens.killTweensOf([ghost, glow]);
          ghost.setAngle(0);
          this.tweens.add({
            targets: [ghost, glow],
            y: `+=${floor - hoverY - ghostFeet}`,
            duration: 240,
            ease: 'Quad.easeIn',
            onComplete: () => {
              ghost.setVisible(false);
              glow.setVisible(false);
              p.respawn(rig.x, this.level.groundY(rig.x) ?? floor);
              if (LEVELS[this.levelIndex].undersea && this.mode === 'story') this.becomeShark(p);
              if (LEVELS[this.levelIndex].finale && this.mode === 'story') this.becomeVillager(p);
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

  // ---------- nado (passiva do lagarto) ----------

  /** Água em que dá para nadar (não vale para a lava nem para o céu). */
  private setupSwim(f: Fighter): void {
    f.waterY = this.level.hasWater && !this.level.isLava ? this.level.waterY : undefined;
    f.onSwimFx = (ff, kind) => this.swimFx(ff, kind);
  }

  private swimFx(f: Fighter, kind: 'enter' | 'exit' | 'wake' | 'bubble'): void {
    const x = f.x;
    const ring = (rx: number, delay: number, size: number) => {
      const r = this.add.ellipse(rx, this.level.waterY + 8, 46, 12).setStrokeStyle(3, 0xd8f4ff, 0.9).setDepth(DEPTH.fighters + 0.6).setScale(0.3);
      this.tweens.add({ targets: r, scale: size, alpha: 0, delay, duration: 700, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    };
    if (kind === 'enter' || kind === 'exit') {
      const sp = this.add.sprite(x, this.level.waterY + 2, 'splash').setScale(kind === 'enter' ? 0.9 : 0.6).setDepth(DEPTH.fighters + 0.6).play('splash');
      sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
      ring(x, 0, 2);
      ring(x, 120, 2.6);
      for (let i = 0; i < 6; i++) {
        const d = this.add.circle(x, this.level.waterY, Phaser.Math.Between(2, 4), 0xd8f4ff).setDepth(DEPTH.fx);
        this.tweens.add({ targets: d, x: x + Phaser.Math.Between(-36, 36), y: this.level.waterY - Phaser.Math.Between(20, 55), duration: 260, yoyo: true, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
      }
      return;
    }
    if (kind === 'wake') {
      // Ondinha atrás e um "V" de rastro na superfície.
      ring(x - f.facing * 18, 0, 1.6);
      const v = this.add.graphics().setDepth(DEPTH.fighters + 0.6);
      v.lineStyle(2, 0xe8f8ff, 0.9);
      v.lineBetween(x - f.facing * 10, this.level.waterY + 10, x - f.facing * 40, this.level.waterY + 4);
      v.lineBetween(x - f.facing * 10, this.level.waterY + 12, x - f.facing * 40, this.level.waterY + 20);
      this.tweens.add({ targets: v, alpha: 0, duration: 450, onComplete: () => v.destroy() });
      return;
    }
    // Bolhas subindo de quem mergulha.
    for (let i = 0; i < 2; i++) {
      const b = this.add
        .circle(x + f.facing * 14 + Phaser.Math.Between(-6, 6), f.feet - f.def.head * 0.6, Phaser.Math.Between(3, 5))
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setDepth(DEPTH.fighters + 0.6);
      this.tweens.add({
        targets: b,
        y: this.level.waterY + 6,
        x: b.x + Phaser.Math.Between(-8, 8),
        duration: Phaser.Math.Between(500, 800),
        ease: 'Sine.easeOut',
        onComplete: () => b.destroy(),
      });
    }
  }

  // ---------- sentido aranha (passiva da aranha) ----------

  /** A aranha nunca cai: no ar sem chão embaixo, o sentido aranha dispara. */
  private updateSpiderSense(): void {
    for (const f of this.fighters) {
      if (f.def.id !== 'spider' || !f.alive || f.zipping || !f.body.moves) continue;
      if (f.onGround || f.body.velocity.y <= 0) continue;
      if (this.level.landingY(f.x, f.feet, 5000) !== null) continue;
      this.spiderSense(f);
    }
  }

  private spiderSense(f: Fighter): void {
    f.zipping = true;
    f.body.setVelocity(0, 0);
    f.body.moves = false;
    const pi = this.players.indexOf(f);
    if (pi >= 0) this.ui?.showSpiderBadge(pi);

    // Sentido aranha: dois rabisquinhos vermelhos tremendo sobre a cabeça.
    const g = this.add.graphics().setDepth(DEPTH.fx + 2);
    const squiggles = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        g.clear();
        const hx = f.x;
        const hy = f.feet - f.def.head - 6;
        for (const side of [-1, 1]) {
          const pts: Phaser.Types.Math.Vector2Like[] = [];
          for (let i = 0; i < 4; i++) pts.push({ x: hx + side * (10 + i * 5), y: hy - i * 4 + (i % 2 ? -3 : 3) + Phaser.Math.Between(-1, 1) });
          g.lineStyle(5, 0x1d1a2b, 1).strokePoints(pts);
          g.lineStyle(3, 0xff2d2d, 1).strokePoints(pts);
        }
      },
    });
    this.cameras.main.flash(90, 255, 40, 40);
    // Câmera lenta rápida para o "momento" do sentido.
    this.physics.world.timeScale = 2.5;
    this.anims.globalTimeScale = 0.5;
    window.setTimeout(() => {
      this.physics.world.timeScale = 1;
      this.anims.globalTimeScale = 1;
    }, 280);

    // Chão seguro mais próximo, para um lado ou para o outro.
    const opts = [-1, 1]
      .map((d) => this.level.nearestGround(f.x, d))
      .filter((x) => this.level.groundY(x) !== null)
      .sort((a, b) => Math.abs(a - f.x) - Math.abs(b - f.x));
    const tx = opts[0] ?? this.checkpointX;
    const tyFeet = this.level.groundY(tx) ?? FLOOR_Y;
    const x0 = f.sprite.x;
    const y0 = f.sprite.y;
    const y1 = tyFeet - (f.def.feetY - f.def.frame / 2);
    const anchor = { x: (x0 + tx) / 2, y: Math.max(20, Math.min(y0, y1) - 160) };
    const web = this.add.graphics().setDepth(DEPTH.fighters - 1);

    this.time.delayedCall(220, () => {
      if (!f.alive) return;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 460,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          f.sprite.x = x0 + (tx - x0) * t;
          f.sprite.y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 90;
          web.clear();
          web.lineStyle(4, 0x1d1a2b, 1).lineBetween(anchor.x, anchor.y, f.x, f.feet - f.def.head * 0.6);
          web.lineStyle(2, 0xeef6f8, 1).lineBetween(anchor.x, anchor.y, f.x, f.feet - f.def.head * 0.6);
        },
        onComplete: () => {
          web.destroy();
          squiggles.remove();
          g.destroy();
          f.body.moves = true;
          f.body.reset(tx, y1);
          f.zipping = false;
          this.fx('dust', tx, tyFeet - 6, 1);
        },
      });
    });
  }

  // ---------- aranhas penduradas ----------

  /** Aranha numa teia no teto, de cabeça para baixo, balançando no fio. */
  private addHanger(x: number): void {
    const f = new Fighter(this, x, HANG_FEET, 'spider', 2, 'enemy');
    f.body.setAllowGravity(false);
    f.body.moves = false;
    f.sprite.setFlipY(true);
    f.onProjectile = (ff) => this.spawnProjectile(ff);
    this.physics.add.collider(f.sprite, this.level.ground);
    // Teia no teto e o fio até a aranha.
    this.add.image(x, 0, 'web_px').setOrigin(0.5, 0).setScale(2).setDepth(DEPTH.clouds + 0.5);
    this.webs.push(new Phaser.Geom.Rectangle(x - 100, 0, 200, 168));
    const thread = this.add.graphics().setDepth(DEPTH.fighters - 1);
    const bob = this.tweens.add({ targets: f.sprite, y: '+=10', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ai = new EnemyAI(f, () => this.nearestPlayer(f), this.level);
    this.enemies.push({ f, ai });
    this.hangers.push({ f, state: 'hang', thread, bob });
  }

  /** Morcego que encosta numa teia do teto gruda nela, e uma aranha desce para comê-lo. */
  private updateWebTraps(): void {
    for (const f of this.players) {
      if (f.def.id !== 'bat' || !f.alive || f.zipping || f.invulnerable) continue;
      const web = this.webs.find((w) => Phaser.Geom.Rectangle.Overlaps(w, new Phaser.Geom.Rectangle(f.body.x, f.body.y, f.body.width, f.body.height)));
      if (web) this.webEat(f, web);
    }
  }

  /**
   * Morcego preso na teia: a aranha desce, cospe teia até ele virar um casulo,
   * a tela pisca, o morcego some e só sobra a aranha mastigando no lugar dele.
   * Para jogador, a tela fica em preto e branco com "VIROU COMIDA DE ARANHA".
   */
  private webEat(f: Fighter, web: Phaser.Geom.Rectangle): void {
    f.zipping = true;
    f.body.setVelocity(0, 0);
    f.body.moves = false;
    const bx = f.x;
    const by = f.body.center.y;
    this.popText(bx, f.feet - f.def.head - 30, 'GRUDOU!', '#ffffff');
    const shake = this.tweens.add({ targets: f.sprite, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: -1 });

    const spider = this.add.sprite(bx, -60, 'spider_idle').setFlipY(true).setDepth(DEPTH.fighters + 1).play('spider_idle');
    const thread = this.add.graphics().setDepth(DEPTH.fighters);
    const drawThread = () => {
      thread.clear();
      const len = spider.y - 30 - web.y;
      if (len <= 0) return;
      thread.fillStyle(0x1d1a2b, 1).fillRect(Math.round(spider.x) - 2, web.y, 4, len);
      thread.fillStyle(0xeef6f8, 1).fillRect(Math.round(spider.x) - 1, web.y, 2, len);
    };
    const strands = this.add.graphics().setDepth(DEPTH.fighters + 2);
    const cocoon = this.add.image(bx, by, 'cocoon').setDepth(DEPTH.fighters + 1).setAlpha(0).setScale(0.4);
    const spinY = () => spider.y + 26;

    this.tweens.add({
      targets: spider,
      y: by - 90,
      duration: 700,
      ease: 'Quad.easeIn',
      onUpdate: drawThread,
      onComplete: () => {
        spider.play('spider_attack');
        // Jatos de teia: fios em pixel indo da aranha até pontos em volta do morcego.
        const shots = this.time.addEvent({
          delay: 110,
          repeat: 10,
          callback: () => {
            strands.clear();
            for (let i = 0; i < 3; i++) {
              const tx = bx + Phaser.Math.Between(-26, 26);
              const ty = by + Phaser.Math.Between(-30, 30);
              const steps = 10;
              for (let k = 0; k <= steps; k++) {
                const x = Math.round(Phaser.Math.Linear(spider.x, tx, k / steps) / 2) * 2;
                const y = Math.round(Phaser.Math.Linear(spinY(), ty, k / steps) / 2) * 2;
                strands.fillStyle(0x1d1a2b, 1).fillRect(x - 2, y - 2, 6, 6);
                strands.fillStyle(0xeef6f8, 1).fillRect(x, y, 2, 2);
              }
            }
          },
        });
        this.tweens.add({ targets: cocoon, alpha: 1, scale: 1, duration: 1200, ease: 'Quad.easeIn' });
        // O morcego vai sumindo dentro do casulo.
        this.time.delayedCall(650, () => {
          f.sprite.setVisible(false);
          f.setMarkersVisible(false);
        });
        this.tweens.add({ targets: cocoon, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 7, delay: 300 });
        this.time.delayedCall(1300, () => {
          shots.remove();
          strands.destroy();
          shake.stop();
          // Pisca: o casulo some e a aranha aparece no lugar, mastigando.
          this.cameras.main.flash(260, 255, 255, 255);
          this.cam2?.flash(260, 255, 255, 255);
          cocoon.destroy();
          spider.setPosition(bx, by - 10).play('spider_idle');
          drawThread();
          this.tweens.add({ targets: spider, scaleY: { from: 1, to: 0.9 }, duration: 140, yoyo: true, repeat: 6 });
          const pi = this.players.indexOf(f);
          if (f.alive) {
            f.zipping = false;
            f.body.moves = true;
            this.killFighter(f, null, 'eaten');
            f.sprite.setVisible(false);
          }
          if (pi !== -1) this.wasted(pi, 'VIROU COMIDA DE ARANHA');
          else this.popText(bx, by - 60, 'NHAC!', '#ff5c5c');
          this.tweens.add({
            targets: spider,
            y: -80,
            duration: 900,
            delay: 2000,
            ease: 'Quad.easeIn',
            onUpdate: drawThread,
            onComplete: () => {
              spider.destroy();
              thread.destroy();
            },
          });
        });
      },
    });
  }

  /**
   * Tubarão caiu na água: a água vira trampolim. Ele mergulha inclinando o focinho para
   * baixo, vira para cima e é lançado alto, mantendo o controle no ar (cai onde o jogador levar).
   */
  private sharkLeap(f: Fighter): void {
    f.zipping = true;
    const vx = f.body.velocity.x;
    f.body.setVelocity(0, 0);
    f.body.moves = false;
    this.fx('splash', f.x, this.level.waterY - 40, 0.9);
    const dir = f.facing;
    const y0 = f.sprite.y;
    // 1) Mergulho: desce inclinando o focinho alguns graus para baixo, soltando bolhas.
    this.tweens.add({ targets: f.sprite, y: y0 + 60, x: f.sprite.x + dir * 24, angle: dir * 35, duration: 360, ease: 'Quad.easeOut' });
    const bubbles = this.add
      .particles(0, 0, 'bubble', { x: { min: -14, max: 14 }, speedY: { min: -90, max: -50 }, lifespan: 500, scale: { start: 0.12, end: 0.04 }, alpha: { start: 0.8, end: 0 }, frequency: 60 })
      .setDepth(DEPTH.fighters + 0.6);
    bubbles.startFollow(f.sprite);
    // 2) No fundo, vira o focinho para cima.
    this.time.delayedCall(380, () => {
      this.tweens.add({ targets: f.sprite, angle: -dir * 30, duration: 160, ease: 'Sine.easeInOut' });
    });
    // 3) Sai da água com tudo (física normal a partir daqui).
    this.time.delayedCall(560, () => {
      bubbles.stop();
      this.time.delayedCall(600, () => bubbles.destroy());
      if (!f.alive) return;
      this.fx('splash', f.x, this.level.waterY - 40, 1.2);
      f.body.moves = true;
      f.body.reset(f.sprite.x, f.sprite.y);
      f.body.setVelocity(vx * 0.5, -SHARK_LEAP_V);
      f.zipping = false;
      this.tweens.add({ targets: f.sprite, angle: 0, duration: 520, ease: 'Sine.easeOut' });
    });
  }

  /** Estilo "wasted": a tela perde a cor por um instante e a faixa de morte aparece. */
  private wasted(pi: number, text: string, hold = 3200): void {
    const cams = [this.cameras.main, this.cam2].filter((c): c is Phaser.Cameras.Scene2D.Camera => !!c);
    for (const cam of cams) {
      const fx = cam.postFX?.addColorMatrix();
      if (!fx) continue;
      fx.grayscale(1);
      this.time.delayedCall(hold + 100, () => cam.postFX.remove(fx as unknown as Phaser.FX.Controller));
    }
    this.ui?.showWasted(pi, text, hold);
  }

  private nearestPlayer(f: Fighter): Fighter | null {
    let best: Fighter | null = null;
    for (const p of this.players) {
      if (p.alive && (!best || Math.abs(p.x - f.x) < Math.abs(best.x - f.x))) best = p;
    }
    return best;
  }

  private updateHangers(): void {
    for (const h of this.hangers) {
      const f = h.f;
      h.thread.clear();
      if (!f.alive) continue;
      if (h.state === 'hang') {
        // Fio em pixel art: contorno escuro + seda clara.
        const tx = Math.round(f.x);
        h.thread.fillStyle(0x1d1a2b, 1).fillRect(tx - 2, 60, 4, f.feet - f.def.head - 50);
        h.thread.fillStyle(0xeef6f8, 1).fillRect(tx - 1, 60, 2, f.feet - f.def.head - 50);
        // Alguém passou por baixo? Salta em cima dele.
        const target = this.players.find((p) => p.alive && Math.abs(p.x - f.x) < 110 && p.feet > f.feet + 60);
        if (target) {
          h.state = 'drop';
          h.bob?.stop();
          f.sprite.setFlipY(false);
          f.body.moves = true;
          f.body.setAllowGravity(true);
          f.body.setVelocity(Math.sign(target.x - f.x) * 140, 120);
          this.popText(f.x, f.feet - 20, '!', '#ff5c5c');
        }
      } else if (h.state === 'drop') {
        // Caindo: quem estiver embaixo é esmagado (a defesa não segura ataque de cima).
        for (const p of this.players) {
          if (!p.alive || p.invulnerable) continue;
          if (overlap(bodyBox(f), bodyBox(p))) this.killFighter(p, f, 'hit');
        }
        if (f.onGround) h.state = 'free';
      }
    }
  }

  // ---------- itens / transformação ----------

  private spawnItem(x: number, kind: ItemId, home: boolean, ttl = 0, h?: number, floorY?: number): void {
    const floor = floorY ?? (h !== undefined ? FLOOR_Y - h * 64 : this.level.groundY(x) ?? FLOOR_Y);
    const y = floor - 24;
    const glow = this.add.ellipse(x, floor - 2, 46, 12, 0xfff7a8, 0.45).setDepth(DEPTH.items);
    const sprite = this.add.sprite(x, y, ITEM_TEXTURE[kind], 0).setDepth(DEPTH.items);
    if (kind === 'harpoon') sprite.setAngle(45);
    if (kind === 'torch') sprite.play('torch_flame');
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
    this.items.push({ kind, sprite, glow, prompt, floor, home, active: true, respawnAt: 0, expireAt: ttl ? this.time.now + ttl : 0 });
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
        if (Math.abs(p.x - it.sprite.x) > 40 || Math.abs(p.feet - it.floor) > 30) continue;
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
            .setPosition(it.sprite.x, it.floor + 46)
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

  /** Primeira transformação: o Xamã explica. Depois, cada forma nova ganha um comentário. */
  private firstShift(p: Fighter, char: CharId): void {
    if (!hasSeen('first-shift')) {
      markSeen('first-shift');
      markSeen(`shift-${char}`);
      void this.shamanExplains(p, char);
      return;
    }
    if (hasSeen(`shift-${char}`) || !settings().quips) return;
    markSeen(`shift-${char}`);
    const text = SHIFT_QUIPS[char];
    if (!text) return;
    this.quip?.close();
    const b = new SpeechBubble(this, () => ({ x: p.x, y: p.feet - p.labelHeight - 56 }), text, SPEAKER_NAME.skull, PLAYER_TINT[0]);
    this.quip = b;
    this.time.delayedCall(Math.max(2600, text.length * 55), () => {
      b.close();
      if (this.quip === b) this.quip = undefined;
    });
  }

  /** O Xamã desce na nuvem, conversa em balões com o jogo congelado e vai embora. */
  private async shamanExplains(p: Fighter, char: CharId): Promise<void> {
    this.cutscene = true;
    this.prevSkip = true;
    this.physics.world.pause();
    this.quip?.close();
    const side = p.facing; // chega à frente da caveira
    const cloud = this.add.image(0, 46, 'cloud_05').setScale(0.3);
    const shaman = this.add.sprite(0, -6, 'shaman_idle').play('shaman_idle').setFlipX(side > 0);
    const hx = p.x + side * 170;
    const hy = p.feet - 150;
    const rig = this.add.container(hx + side * 500, hy - 260, [cloud, shaman]).setDepth(DEPTH.fighters - 2).setAlpha(0);
    const bob = this.tweens.add({ targets: [cloud, shaman], y: '+=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.tweenP({ targets: rig, x: hx, y: hy, alpha: 1, duration: 800, ease: 'Sine.easeOut' });

    const lines: Line[] = [...FIRST_SHIFT];
    const quip = SHIFT_QUIPS[char];
    if (quip) lines.push({ who: 'skull', side: 'left', text: quip });
    for (const line of lines) {
      if (!this.scene.isActive()) return;
      const shamanLine = line.who === 'shaman';
      const bubble = shamanLine
        ? new SpeechBubble(this, () => ({ x: rig.x, y: rig.y - 74 }), line.text, SPEAKER_NAME.shaman, 0x9b6bf0)
        : new SpeechBubble(this, () => ({ x: p.x, y: p.feet - p.labelHeight - 56 }), line.text, SPEAKER_NAME.skull, PLAYER_TINT[0]);
      if (shamanLine) shaman.play('shaman_attack').once('animationcomplete', () => shaman.play('shaman_idle'));
      await this.lineWait(Math.max(2400, line.text.length * 60));
      bubble.close();
      await this.waitP(140);
    }
    await this.tweenP({ targets: rig, x: hx - side * 500, y: hy - 300, alpha: 0, duration: 800, ease: 'Sine.easeIn' });
    bob.stop();
    rig.destroy();
    this.physics.world.resume();
    this.cutscene = false;
  }

  private waitP(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  /** Espera o tempo da fala, ou menos se o jogador apertar para passar. */
  private lineWait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        timer.remove();
        this.input.off('pointerdown', finish);
        this.skipLine = undefined;
        resolve();
      };
      const timer = this.time.delayedCall(ms, finish);
      this.input.once('pointerdown', finish);
      this.skipLine = finish;
    });
  }

  private transform(pi: number, char: CharId): void {
    const p = this.players[pi];
    sfx('pick');
    // Nuvem de fumaça cobre o personagem; a troca acontece escondida nela.
    this.smokeBurst(p.x, p.feet, PLAYER_TINT[pi], 1);
    this.time.delayedCall(90, () => {
      if (!p.alive) return;
      p.applyChar(char);
      p.sprite.setTintFill(0xffffff);
      this.time.delayedCall(120, () => p.sprite.clearTint());
      this.ui?.hud?.setChar(pi, char);
      if (this.mode === 'story' && pi === 0 && char !== 'skull') this.firstShift(p, char);
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
    // Dica do poder especial.
    const tip = CHARS[char].fly
      ? 'Segure PULAR no ar para voar'
      : CHARS[char].climb
        ? 'Gruda nas paredes e sobe'
        : CHARS[char].swim
          ? 'Nada! ▼ mergulha, PULAR sai da água'
          : '';
    if (tip) {
      const h = this.add
        .text(p.x, p.feet - 80, tip, { fontFamily: BODY_FONT, fontSize: '16px', color: '#ffffff', stroke: '#10223a', strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx);
      this.tweens.add({ targets: h, y: h.y - 30, alpha: 0, delay: 1400, duration: 700, onComplete: () => h.destroy() });
    }
  }

  // ---------- fim de fase ----------

  /**
   * Conta uma morte no modo história e atualiza as vidas. Devolve true se acabaram as vidas
   * (a fase recomeça do início, sem a visual novel).
   */
  countStoryDeath(delay = 700): boolean {
    this.deaths++;
    const limit = deathLimit(this.levelIndex);
    this.ui?.setLives(limit === Infinity ? null : limit - this.deaths, limit - 1);
    if (this.deaths < limit) return false;
    this.ended = true;
    this.time.delayedCall(delay, () => {
      this.wasted(0, 'A FASE RECOMEÇA', 3000);
      this.time.delayedCall(3200, () => this.restartMatch());
    });
    return true;
  }

  // ---------- fases de outros tipos ----------

  /** Martelada no chão: treme, levanta poeira, quebra pedras de ouro e atordoa quem está perto. */
  private pound(f: Fighter): void {
    this.cameras.main.shake(220, 0.01);
    sfx('boom');
    this.fx('dust', f.x - 40, f.feet - 6, 1.4);
    this.fx('dust', f.x + 40, f.feet - 6, 1.4);
    this.puzzle?.pound(f);
    for (const e of this.enemies) {
      if (e.f.alive && Math.abs(e.f.x - f.x) < 150 && Math.abs(e.f.feet - f.feet) < 60) e.f.stun(1400);
    }
  }

  /** Corrida e tiro: segurar ATACAR solta ossos retos; inimigos chegam pela frente em ondas. */
  private updateGun(time: number): void {
    const g = LEVELS[this.levelIndex].gun;
    if (!g || this.mode !== 'story' || this.ended || this.cutscene) return;
    const p = this.players[0];
    if (p.alive && p.intent.attackHeld && time >= this.nextGunShot && !p.zipping) {
      this.nextGunShot = time + 170;
      const s = this.add.sprite(p.x + p.facing * 34, p.feet - p.labelHeight * 0.55, 'bone').setDepth(DEPTH.projectiles).setScale(0.8).play('bone');
      this.projectiles.push({ sprite: s, gravity: 0, owner: p, vx: 860 * p.facing, vy: 0, life: 1.2, bounced: false });
      sfx('attack');
    }
    if (time >= this.nextGunSpawn && p.alive) {
      this.nextGunSpawn = time + g.every;
      const near = this.enemies.filter((e) => e.f.alive && Math.abs(e.f.x - p.x) < W).length;
      const x = this.camX + this.halfView + 30;
      const ground = this.level.groundY(x);
      if (near < 6 && ground !== null && x < this.level.width - 80) {
        const f = this.spawnEnemy(Phaser.Utils.Array.GetRandom(g.spawns), x, ground);
        f.facing = -1;
        if (LEVELS[this.levelIndex].retro) f.sprite.setTint(0xffffff);
      }
    }
  }

  /** Desenho perdido de 1930: preto e branco, contraste alto, vinheta, grão e riscos de película. */
  private setupRetro(): void {
    const cam = this.cameras.main;
    const fx = cam.postFX?.addColorMatrix();
    fx?.grayscale(1);
    fx?.contrast(0.35, true);
    cam.postFX?.addVignette(0.5, 0.5, 0.9, 0.45);
    const grain = this.add.tileSprite(0, 0, W, H, 'film_grain').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.fx + 9).setAlpha(0.5);
    const scratches = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.fx + 9);
    this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        grain.tilePositionX = Phaser.Math.Between(0, 256);
        grain.tilePositionY = Phaser.Math.Between(0, 256);
        grain.setAlpha(Phaser.Math.FloatBetween(0.35, 0.6));
        scratches.clear();
        for (let i = 0; i < 2; i++) {
          if (Math.random() < 0.5) continue;
          const x = Phaser.Math.Between(0, W);
          scratches.fillStyle(Math.random() < 0.5 ? 0xffffff : 0x000000, 0.35).fillRect(x, 0, 2, H);
        }
        // Tremido de projetor.
        cam.setAlpha(Math.random() < 0.06 ? 0.85 : 1);
      },
    });
  }

  /** Item secreto escondido na fase (rolo de filme). */
  private placeSecret(sec: { id: string; at: [number, number, number] }): void {
    const [sc, t, h] = sec.at;
    const x = this.level.tileX(sc, t);
    const y = FLOOR_Y - h * TILE - 44;
    const reel = this.add.image(x, y, 'film_reel').setDepth(DEPTH.items);
    this.tweens.add({ targets: reel, angle: 360, duration: 3000, repeat: -1 });
    this.tweens.add({ targets: reel, y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ev = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const p = this.players[0];
        if (!p.alive || Math.abs(p.x - x) > 40 || Math.abs(p.feet - 40 - y) > 60) return;
        ev.remove();
        findSecret(sec.id);
        sfx('pick');
        reel.destroy();
        this.popText(x, y - 60, 'ROLO DE FILME!', '#ffe066');
        this.time.delayedCall(700, () => this.popText(p.x, p.feet - 200, 'Uma fase secreta apareceu no mapa...', '#d8d0c0'));
      },
    });
  }

  /** Voo: a caveira some do chão e passa a voar montada no morcego. */
  private setupShmup(): void {
    const p = this.players[0];
    p.sprite.setVisible(false);
    p.setMarkersVisible(false);
    p.body.setEnable(false);
    this.shmup = new ShmupSystem({
      scene: this,
      width: this.level.width,
      intent: () => this.players[0].intent,
      halfView: () => this.halfView,
      top: 70,
      bottom: 560,
      color: PLAYER_TINT[0],
      died: () => this.countStoryDeath(1200),
      win: () => this.storyWin(LEVELS[this.levelIndex].winText ?? 'Céu limpo!'),
      popText: (x, y, text, color) => this.popText(x, y, text, color),
      boss: LEVELS[this.levelIndex].shmupBoss,
      pact: getPact(),
      bar: () => this.ui,
    });
    this.time.delayedCall(400, () => this.shmup?.hint());
    if (LEVELS[this.levelIndex].shmupBoss === 'imp') return; // duelo de dia
    // Noite: céu escurecido e estrelas piscando.
    this.add.rectangle(0, -400, W, H + 800, 0x0b1030, 0.55).setOrigin(0).setScrollFactor(0, 1).setDepth(DEPTH.clouds + 0.5);
    const rng = new Phaser.Math.RandomDataGenerator(['night']);
    for (let i = 0; i < 40; i++) {
      const st = this.add.image(rng.between(0, W), rng.between(20, 420), 'spark').setScale(rng.realInRange(0.15, 0.3)).setTint(0xfff7dc).setScrollFactor(0, 1).setDepth(DEPTH.clouds + 0.6);
      this.tweens.add({ targets: st, alpha: 0.2, duration: rng.between(500, 1400), yoyo: true, repeat: -1 });
    }
    const moon = this.add.graphics().setScrollFactor(0, 1).setDepth(DEPTH.clouds + 0.6);
    moon.fillStyle(0xfff7dc, 0.18).fillCircle(W - 220, 150, 90);
    moon.fillStyle(0xf4f0d0, 1).fillCircle(W - 220, 150, 56);
    moon.fillStyle(0xd8d0b0, 1).fillCircle(W - 238, 136, 10).fillCircle(W - 200, 170, 7);
  }

  /** Correntes de vento: colunas translúcidas com riscos subindo. */
  private setupWinds(list: Array<[number, number, number]>): void {
    for (const [sc, tile, w] of list) {
      const x0 = sc * W + tile * TILE;
      const x1 = x0 + w * TILE;
      this.winds.push([x0, x1]);
      this.add.rectangle(x0, -200, x1 - x0, 900, 0xdff6ff, 0.12).setOrigin(0).setDepth(DEPTH.deco);
      this.add
        .particles(0, 0, 'streak', {
          x: { min: x0 + 8, max: x1 - 8 },
          y: { min: 520, max: 620 },
          speedY: { min: -520, max: -380 },
          lifespan: 1300,
          scaleX: 0.25,
          scaleY: { start: 1.4, end: 0.6 },
          rotate: 90,
          alpha: { start: 0.7, end: 0 },
          frequency: 60,
        })
        .setDepth(DEPTH.deco + 0.5);
    }
  }

  private updateWinds(dt: number): void {
    if (!this.winds.length) return;
    for (const p of this.players) {
      if (!p.alive || p.zipping) continue;
      const vy = p.body.velocity.y;
      const inWind = this.winds.some(([a, b]) => p.x > a && p.x < b) && p.feet > 150;
      if (inWind) p.body.setVelocityY(Math.max(vy - 2600 * dt, -460));
      // Planar: segurando pulo no ar, a queda fica lenta.
      else if (!p.onGround && p.intent.jumpHeld && vy > 80) p.body.setVelocityY(80);
    }
  }

  /** Inimigos vivos num cenário. */
  private enemiesIn(screen: number): number {
    return this.enemies.filter((e) => e.f.alive && this.level.screenOf(e.f.x) === screen).length;
  }

  /** Fases "limpe a área": barreira de fogo na borda até não sobrar inimigo no cenário. */
  private updateLockWall(): void {
    const def = LEVELS[this.levelIndex];
    if (this.mode !== 'story' || !def.clearToAdvance) return;
    const last = this.level.screenCount - 1;
    const locked = this.screen < last && this.enemiesIn(this.screen) > 0 ? this.screen : -1;
    if (locked === this.lockedScreen) return;
    if (this.lockedScreen !== -1 && locked === -1) {
      this.popText(this.players[0].x, this.players[0].feet - 170, 'ÁREA LIMPA!', '#9dffb0');
      const w = this.lockWall;
      if (w) this.tweens.add({ targets: w, alpha: 0, duration: 400, onComplete: () => w.destroy() });
      this.lockWall = undefined;
    }
    this.lockedScreen = locked;
    if (locked === -1) return;
    // Barreira: coluna de chamas em pixel (tochas) e um véu vermelho.
    this.lockWall?.destroy();
    const x = (locked + 1) * W - 18;
    const items: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, -260, 36, 560, 0xff3a1a, 0.22)];
    for (let y = 0; y > -520; y -= 64) {
      const f = this.add.sprite(0, y, 'torch_item_anim', 0).setOrigin(0.5, 1).setScale(1.3).play({ key: 'torch_flame', startFrame: Math.abs(y / 64) % 4 });
      items.push(f);
    }
    this.lockWall = this.add.container(x, FLOOR_Y + 20, items).setDepth(DEPTH.fighters + 1);
  }

  /** Arena do chefe: ao entrar, o portão fecha atrás e o chefe aparece. */
  private updateBossArena(time: number, dt: number): void {
    const def = LEVELS[this.levelIndex];
    if (this.mode !== 'story' || !def.boss) return;
    const p = this.players[0];
    const last = this.level.screenCount - 1;
    if (!this.bossStarted && this.screen === last && !this.transitioning && p.alive && p.x > last * W + 220) {
      this.bossStarted = true;
      const a = last * W;
      // Portão de ferro desce atrás do jogador.
      const gate = this.add.graphics().setDepth(DEPTH.fighters + 1);
      gate.fillStyle(0x1d1a2b).fillRect(-22, -560, 44, 560);
      for (let k = -16; k <= 16; k += 10) gate.fillStyle(0x6c7385).fillRect(k - 3, -560, 6, 560);
      for (let y = -540; y < 0; y += 70) gate.fillStyle(0x4c5262).fillRect(-20, y, 40, 8);
      gate.setPosition(a + 24, FLOOR_Y - 600);
      this.tweens.add({ targets: gate, y: FLOOR_Y, duration: 420, ease: 'Bounce.easeOut' });
      this.cameras.main.shake(200, 0.006);
      this.checkpointX = a + 160;
      const host = {
        scene: this as Phaser.Scene,
        player: () => this.players[0],
        x0: a + 50,
        x1: a + W - 10,
        floor: FLOOR_Y,
        ceiling: 30,
        killPlayer: () => this.killFighter(this.players[0], null, 'hit'),
        rootPlayer: (ms: number) => this.rootPlayer(ms),
        spawnEnemy: (char: CharId, x: number, feet: number) => this.spawnEnemy(char, x, feet),
        freeze: (on: boolean) => {
          this.cutscene = on;
          if (on) this.players[0].body.setVelocityX(0);
        },
        bar: () => this.ui,
        defeated: (text?: string) => this.storyWin(text ?? def.winText ?? 'Chefe derrotado!'),
        say: async (anchor: () => { x: number; y: number }, text: string, name: string, color: number) => {
          if (!this.scene.isActive() || this.ended) return;
          // Abaixo das barras de vida do chefe.
          const low = () => {
            const a = anchor();
            return { x: a.x, y: Math.max(a.y, this.cameras.main.worldView.y + 250) };
          };
          const b = new SpeechBubble(this, low, text, name, color);
          await this.lineWait(Math.max(2400, text.length * 60));
          b.close();
          await this.waitP(140);
        },
        choose: (title: string, options: string[]) => this.ui?.choose(title, options) ?? Promise.resolve(0),
        push: (vx: number) => {
          const pl = this.players[0];
          if (pl.alive && pl.body.blocked.down) pl.knockback(Math.sign(vx), Math.abs(vx));
        },
      };
      const k = def.boss.kind;
      if (k === 'sharkking') {
        // Arena da maré: bacia de areia no meio (tiles 4 a 15), plataformas altas nos lados.
        this.boss = new SharkKingBoss(host, {
          basin: [a + 4 * TILE + 20, a + 16 * TILE - 20],
          sideFeet: FLOOR_Y - 2 * TILE,
          high: 92,
          setTide: (px) => this.sea?.setTide(px),
          waterY: () => this.level.waterY,
          addLedge: (x, top, w) => {
            const zone = this.add.zone(x, top + 8, w, 16);
            this.physics.add.existing(zone, true);
            const body = zone.body as Phaser.Physics.Arcade.StaticBody;
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
            this.level.ground.add(zone);
            return () => zone.active && zone.destroy();
          },
        });
      } else if (k === 'shaman') this.boss = new ShamanBoss(host);
      else if (k === 'gnollking') this.boss = new GnollKingBoss(host);
      else this.boss = k === 'minotaur' ? new MinotaurBoss(host) : k === 'spider' ? new SpiderQueenBoss(host) : new PrincesBoss(host, (pact) => setPact(pact));
      void this.boss.intro();
    }
    this.boss?.update(time, dt);
  }

  /** Teia (ou rede) prendendo o jogador: segue o corpo até soltar. */
  private updateRoot(time: number): void {
    if (!this.rootWeb) return;
    const p = this.players[0];
    if (time >= this.rootedUntil || !p?.alive) {
      this.rootWeb.destroy();
      this.rootWeb = undefined;
    } else this.rootWeb.setPosition(p.x, p.feet - 40);
  }

  private rootPlayer(ms: number, tex = 'web_ball', text = 'PRESO!'): void {
    this.rootedUntil = this.time.now + ms;
    this.rootWeb?.destroy();
    const p = this.players[0];
    this.rootWeb = this.add.image(p.x, p.feet - 40, tex).setScale(tex === 'web_ball' ? 2.2 : 1.6).setAlpha(0.85).setDepth(DEPTH.fighters + 0.5);
    this.popText(p.x, p.feet - 150, text, '#ffffff');
  }

  /** "Ilhas da Maré 3": a área e o número da fase dentro dela. */
  private levelTag(): string {
    const a = areaOfLevel(this.levelIndex);
    if (!a) return `Fase ${this.levelIndex + 1}`;
    return `${areaTitle(a).name} ${a.levels.indexOf(LEVELS[this.levelIndex].id) + 1}`;
  }

  /** Final: o corpo de aldeão (não troca de forma com itens). */
  private becomeVillager(p: Fighter): void {
    if (!p.alive) return;
    p.applyChar('villager', p.feet);
    this.ui?.hud?.setChar(0, 'villager');
  }

  /** Caverna Submarina: vira Tubarão (com fumaça) e passa a nadar livre. */
  private becomeShark(p: Fighter): void {
    if (!p.alive) return;
    p.applyChar('shark', p.feet);
    p.freeSwim = true;
    p.waterY = this.level.waterY;
    this.smokeBurst(p.x, p.feet, PLAYER_TINT[0], 0.8);
    this.ui?.hud?.setChar(0, 'shark');
  }

  /** Variante: vida extra (elite) e acessórios desenhados que acompanham a cabeça. */
  private setupVariant(f: Fighter): Array<{ img: Phaser.GameObjects.Image; a: Accessory }> | undefined {
    const v = variantOf(f.def.id);
    if (!v) return undefined;
    f.armor = (v.hp ?? 1) - 1;
    const k = v.scale ?? 1;
    return (v.accessories ?? []).map((a) => ({ a, img: this.add.image(f.x, f.feet, `acc_${a}`).setScale(k).setDepth(DEPTH.fighters + (a === 'buoy' ? 0.1 : 0.2)) }));
  }

  /** Acessórios seguem a cabeça (ou a cintura, no caso da boia) de quem os usa. */
  private updateAccessories(): void {
    for (const e of this.enemies) {
      if (!e.acc) continue;
      const v = variantOf(e.f.def.id);
      for (const { img, a } of e.acc) {
        if (!v || !e.f.alive) {
          img.setVisible(false);
          continue;
        }
        const o = accessoryOffset(v.base, a, v.scale ?? 1);
        img.setPosition(e.f.x + e.f.facing * o.dx, e.f.feet - o.dy).setFlipX(e.f.facing < 0).setVisible(e.f.sprite.visible).setAlpha(e.f.sprite.alpha);
      }
    }
  }

  /** Bomba do Goblin Bombardeiro: explode e derruba quem estiver perto (menos o dono). */
  private explode(x: number, y: number, owner: Fighter): void {
    const b = this.add.sprite(x, y - 20, 'boom').setScale(1.4).setDepth(DEPTH.fx).play('boom');
    b.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => b.destroy());
    sfx('boom');
    this.cameras.main.shake(160, 0.008);
    for (const f of this.fighters) {
      if (!f.alive || f.team === owner.team || f.invulnerable) continue;
      if (Math.abs(f.x - x) < 80 && Math.abs(f.feet - 30 - y) < 90) this.killFighter(f, owner, 'hit');
    }
  }

  /** Inimigo criado no meio da fase (filhotes da Aranha-Rainha). */
  private spawnEnemy(char: EnemyId, x: number, feet: number): Fighter {
    const f = new Fighter(this, x, feet, char as CharId, 1, 'enemy');
    f.facing = -1;
    f.onProjectile = (ff) => this.spawnProjectile(ff);
    this.physics.add.collider(f.sprite, this.level.ground);
    this.enemies.push({ f, ai: new EnemyAI(f, () => this.players[0], this.level, variantOf(char)?.ability, variantOf(char)?.mound), acc: this.setupVariant(f) });
    this.smokeBurst(x, feet, 0x8a6ad0, 0.7);
    return f;
  }

  /** Vitória no modo história (fim do mapa, porta de saída ou chefe derrotado). */
  private storyWin(sub: string): void {
    if (this.ended) return;
    const secs = ((this.time.now - this.startTime) / 1000).toFixed(1);
    completeLevel(this.levelIndex);
    this.victory(0, `${this.levelTag().toUpperCase()} CONCLUÍDA!`, `${sub}   ·   Tempo: ${secs}s   ·   Mortes: ${this.deaths}`);
  }

  /** Porta da casa assombrada: leva o jogador a outro ponto (e outro cenário) na hora. */
  private teleport(x: number, feet: number, checkpoint: boolean): void {
    const p = this.players[0];
    p.body.reset(x, feet - (p.def.feetY - p.def.frame / 2));
    p.body.setVelocity(0, 0);
    const n = this.level.screenOf(x);
    if (n !== this.screen) {
      this.screen = n;
      this.ui?.hud?.setScreen(n, 0xfff7dc);
    }
    this.camX = this.cameraTarget();
    this.applyCamera();
    if (checkpoint) this.checkpointX = x;
  }

  private checkGoal(): void {
    if (LEVELS[this.levelIndex].haunt) return; // casa assombrada: só pela porta de saída
    if (this.mode === 'story' && LEVELS[this.levelIndex].boss) return; // vence derrotando o chefe
    if (this.shmup) return; // voo: vence quando a rolagem termina
    if (this.puzzle || this.mausoleum) return; // chave e porta / mausoléu: vitória própria
    const end = this.level.width - 70;
    const [p1, p2] = this.players;
    if (p1.alive && p1.x >= end) {
      if (this.mode === 'story') this.storyWin(LEVELS[this.levelIndex].winText ?? 'Fragmento da coroa recuperado!');
      else this.victory(0, `${playerName(0).toUpperCase()} VENCEU!`, 'Chegou ao fim do lado oposto');
    } else if (p2 && p2.alive && p2.x <= 70) {
      this.victory(1, `${playerName(1).toUpperCase()} VENCEU!`, 'Chegou ao fim do lado oposto');
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
        win.intent = { move: 0, jump: true, attack: false, guard: false, pick: false, crouch: false, jumpHeld: false, sprint: false };
        this.time.delayedCall(220, () => (win.intent = { move: 0, jump: false, attack: true, guard: false, pick: false, crouch: false, jumpHeld: false, sprint: false }));
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
