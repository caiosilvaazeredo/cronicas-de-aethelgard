import Phaser from 'phaser';
import { CROUCH_SCALE } from './crouch';
import { DEPTH, FONT, GUARD_WALK_SPEED, INVULN_TIME, JUMP_V } from '../config';
import { CHARS, type CharDef, type CharId } from './characters';
import { emptyIntent, type Intent } from './controls';

type State = 'idle' | 'run' | 'guard' | 'attack' | 'stun' | 'dead';


/** Dash do Goblin Lanceiro. */
const DASH_V = 900;
const DASH_MS = 200;
const DASH_COOLDOWN = 650;
const BODY_W = 30;
const BODY_H = 50;
/** Agachado: o desenho e a caixa de colisão encolhem na altura (estilo Metal Slug). */
const CROUCH_SPEED = 120;
/** O segundo pulo (no ar) é um pouco mais fraco. */
const DOUBLE_JUMP = 0.88;
/** Pique: multiplicador de velocidade. */
const SPRINT = 1.6;

export interface HitBox {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  /** Golpe baixo (dado agachado): só a defesa agachada segura. */
  low?: boolean;
}

/**
 * Um lutador: jogador ou inimigo. Morre com um golpe; defende pela frente
 * (segurando para trás, estilo jogo de luta, ou com o botão de defesa).
 * Também agacha (e anda agachado), dá pulo duplo e pode ficar atordoado.
 */
export class Fighter {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  def: CharDef;
  facing: 1 | -1 = 1;
  state: State = 'idle';
  alive = true;
  /** Sendo trazido de volta pelo xamã (não pode ser revivido de novo). */
  reviving = false;
  /** Puxada pela teia (sentido aranha): ignora mortes por queda enquanto dura. */
  zipping = false;
  crouching = false;
  intent: Intent = emptyIntent();
  /** Posição x do oponente a encarar (null = encara para onde anda). */
  faceTarget: number | null = null;

  private attackT = 0;
  private attackLow = false;
  private cooldown = 0;
  private knockT = 0;
  private knockV = 0;
  private invulnUntil = 0;
  private stunUntil = 0;
  private stars: Phaser.GameObjects.Image[] = [];
  private jumps = 0;
  private lastDust = 0;
  /** Voo do morcego: tempo restante (ms) até tocar o chão de novo. */
  private flightLeft = 0;
  private flightBar?: Phaser.GameObjects.Graphics;
  /** Aranha grudada numa parede (-1 esquerda, 1 direita, 0 não). */
  private climbDir = 0;
  private climbHop = 0;
  /** A cena diz se há uma parede de poço ao lado (para a aranha grudar sozinha). */
  wallProbe?: (x: number, feet: number) => number;
  /** Superfície da água (a cena define; ausente = sem água em que dê para nadar). */
  waterY?: number;
  /** Nadando (passiva do lagarto). */
  swimming = false;
  /** Efeitos de nado (ondinha, respingo, bolha), desenhados pela cena. */
  onSwimFx?: (f: Fighter, kind: 'enter' | 'exit' | 'wake' | 'bubble') => void;
  private lastWake = 0;
  private released = false;
  private shield: Phaser.GameObjects.Image;
  /** Alvos já atingidos/bloqueados neste golpe. */
  readonly attackHits = new Set<Fighter>();
  /** Identificador do golpe atual (a IA usa para reagir uma vez por golpe). */
  attackId = 0;

  onProjectile?: (f: Fighter) => void;
  onDoubleJump?: (f: Fighter) => void;
  /** Dash do Goblin Lanceiro: até quando dura, direção e quando pode de novo. */
  private dashUntil = 0;
  private dashDir = 1;
  private dashReady = 0;
  private prevSprint = false;
  private dashGravityOff = false;
  private lastGhost = 0;
  /** Cor do rastro do dash (cor do jogador). */
  ghostTint = 0xffffff;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    feetY: number,
    readonly baseChar: CharId,
    readonly team: number,
    readonly label: string,
    /** Cor do jogador (aura, anel e etiqueta). Inimigos não têm. */
    readonly color?: number,
    /** Texto da etiqueta sobre a cabeça ("P1", "P2"). */
    tagText?: string,
  ) {
    this.def = CHARS[baseChar];
    this.sprite = scene.physics.add.sprite(x, 0, `${baseChar}_idle`, 0);
    this.sprite.setDepth(DEPTH.fighters);
    // Quem não tem escudo no sprite defende com uma bolha de energia (estilo jogo de luta de plataforma).
    this.shield = scene.add.image(x, feetY, 'bubble').setDepth(DEPTH.fighters + 1).setVisible(false).setTint(color ?? 0x9fe3ff);
    if (color !== undefined) {
      this.ghostTint = color;
      this.buildMarkers(color, tagText ?? label);
    }
    this.applyChar(baseChar, feetY);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }
  get x(): number {
    return this.sprite.x;
  }
  get feet(): number {
    return this.body.bottom;
  }
  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }
  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil;
  }
  get isGuarding(): boolean {
    return this.state === 'guard';
  }
  get isStunned(): boolean {
    return this.state === 'stun';
  }
  get isTransformed(): boolean {
    return this.def.id !== this.baseChar;
  }

  /** Troca o personagem mantendo a posição dos pés. */
  applyChar(id: CharId, feetY = this.feet): void {
    this.def = CHARS[id];
    const d = this.def;
    this.crouching = false;
    this.climbDir = 0;
    this.dashUntil = 0;
    if (this.dashGravityOff) {
      this.dashGravityOff = false;
      this.body.setAllowGravity(true);
    }
    this.climbHop = 0;
    this.sprite.setAngle(0);
    this.flightLeft = this.def.fly ?? 0;
    if (this.swimming) {
      this.swimming = false;
      this.body.setAllowGravity(true);
    }
    this.sprite.setScale(1, 1);
    this.sprite.setTexture(`${id}_idle`, 0);
    this.body.setSize(BODY_W, BODY_H, false);
    this.body.setOffset(d.frame / 2 - BODY_W / 2, d.feetY - BODY_H);
    const y = feetY - d.feetY + d.frame / 2;
    this.body.reset(this.sprite.x, y);
    this.sprite.play(`${id}_idle`);
    this.state = 'idle';
  }

  /** Agacha/levanta mantendo os pés no lugar (o corpo encolhe junto com o desenho). */
  private setCrouch(v: boolean): void {
    if (v === this.crouching) return;
    const feet = this.feet;
    this.crouching = v;
    if (this.hasCrouchPose) {
      // Pose agachada em pixel art: o desenho já vem encolhido; só a caixa de colisão baixa.
      const h = v ? Math.round(BODY_H * CROUCH_SCALE) : BODY_H;
      this.sprite.setScale(1, 1);
      this.body.setSize(BODY_W, h, false);
      this.body.setOffset(this.def.frame / 2 - BODY_W / 2, this.def.feetY - h);
      this.sprite.y = feet - (this.def.feetY - this.def.frame / 2);
      this.body.updateFromGameObject();
      if (this.state === 'idle' || this.state === 'run' || this.state === 'guard') this.setState(this.state);
    } else {
      const s = v ? CROUCH_SCALE : 1;
      this.sprite.setScale(1, s);
      this.sprite.y = feet - s * (this.def.feetY - this.def.frame / 2);
      this.body.updateFromGameObject();
    }
    // Mantém o apoio no chão sem "cair" no quadro seguinte.
    this.body.prev.y = this.body.y;
    this.body.prevFrame.y = this.body.y;
  }

  /** Este personagem tem pose agachada desenhada (todos menos a aranha). */
  private get hasCrouchPose(): boolean {
    return this.scene.anims.exists(`${this.def.id}_crouch_idle`);
  }

  /** Caixa de acerto do golpe corpo a corpo, se estiver nos quadros ativos. */
  activeHitBox(): HitBox | null {
    const m = this.def.melee;
    if (!m || this.state !== 'attack') return null;
    const frame = this.attackFrame();
    if (frame < m.from || frame > m.to) return null;
    const front = this.x + this.facing * m.reach;
    const back = this.x - this.facing * m.back;
    return {
      x1: Math.min(front, back),
      x2: Math.max(front, back),
      y1: this.attackLow ? this.feet - 32 : this.feet - 64,
      y2: this.feet + 4,
      low: this.attackLow,
    };
  }

  /** Bloqueia algo vindo de fromX? Golpe baixo só é bloqueado agachado. */
  blocksFrom(fromX: number, low = false): boolean {
    if (!this.isGuarding) return false;
    if (low && !this.crouching) return false;
    const dir = Math.sign(fromX - this.x) || this.facing;
    return dir === this.facing;
  }

  knockback(dir: number, power = 320): void {
    this.knockT = 0.16;
    this.knockV = dir * power;
  }

  /** Defesa quebrada: fica tonto por um tempo, sem poder agir nem defender. */
  stun(ms: number): void {
    this.stunUntil = this.scene.time.now + ms;
    this.state = 'stun';
    this.setCrouch(false);
    this.shield.setVisible(false);
    this.sprite.play(`${this.def.id}_idle`);
    this.clearStars();
    for (let i = 0; i < 3; i++) {
      this.stars.push(this.scene.add.image(this.x, this.feet, 'star').setDepth(DEPTH.fx).setTint(0xffe066));
    }
  }

  private clearStars(): void {
    this.stars.forEach((s) => s.destroy());
    this.stars = [];
  }

  update(dtMs: number): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    const d = this.def;
    const it = this.intent;
    const now = this.scene.time.now;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const grounded = this.onGround;
    if (grounded && this.body.velocity.y >= 0) {
      this.jumps = 0;
      if (d.fly) this.flightLeft = d.fly;
    }

    if (this.state === 'stun') {
      this.body.setVelocityX(this.body.velocity.x * 0.85);
      // Estrelinhas girando sobre a cabeça.
      const head = d.head;
      this.stars.forEach((s, i) => {
        const a = now / 160 + (i * Math.PI * 2) / 3;
        s.setPosition(this.x + Math.cos(a) * 22, this.feet - head - 6 + Math.sin(a) * 6).setAngle(now / 3);
      });
      if (now >= this.stunUntil) {
        this.clearStars();
        this.state = 'idle';
      }
    }

    if (this.state === 'attack') {
      this.attackT += dt;
      const frame = this.attackFrame();
      if (d.projectile && !this.released && frame >= d.projectile.release) {
        this.released = true;
        this.onProjectile?.(this);
      }
      if (frame >= d.attack.n) {
        this.state = 'idle';
        this.cooldown = 0.12;
      } else if (grounded) {
        this.body.setVelocityX(this.body.velocity.x * 0.75);
      }
    }

    if (this.state !== 'attack' && this.state !== 'stun') {
      // Para onde olhar: oponente próximo (estilo luta) ou direção do movimento.
      // Fugindo de um oponente longe, corre normalmente; perto, anda de costas defendendo.
      const near = this.faceTarget !== null && Math.abs(this.faceTarget - this.x) < 220;
      if (this.faceTarget !== null && (near || it.move === 0)) {
        const dir = Math.sign(this.faceTarget - this.x);
        if (dir !== 0) this.facing = dir as 1 | -1;
      } else if (it.move !== 0) {
        this.facing = it.move > 0 ? 1 : -1;
      }

      const backing = it.move !== 0 && Math.sign(it.move) !== this.facing;
      const guarding = it.guard || (backing && near);
      // Agachar só no chão (ao encolher, o corpo perde o contato por um quadro; por isso
      // quem já está agachado continua, até soltar o botão ou pular).
      this.setCrouch(it.crouch && (grounded || this.crouching) && this.body.velocity.y >= 0);

      if (it.attack && this.cooldown <= 0) {
        this.startAttack();
      } else {
        if (it.jump) {
          if (grounded) {
            this.setCrouch(false);
            this.body.setVelocityY(-JUMP_V);
            this.jumps = 1;
          } else if (this.jumps < 2 && !d.fly && !this.swimming) {
            // Pulo duplo: um segundo impulso no ar, com uma cambalhota.
            this.body.setVelocityY(-JUMP_V * DOUBLE_JUMP);
            this.jumps = 2;
            this.onDoubleJump?.(this);
            this.scene.tweens.add({
              targets: this.sprite,
              angle: { from: 0, to: 360 * this.facing },
              duration: 380,
              ease: 'Cubic.easeOut',
              onComplete: () => this.sprite.setAngle(0),
            });
          }
        }
        const sprinting = it.sprint && !this.crouching && !guarding;
        // Passiva do Goblin Lanceiro: começar a correr = arrancada (dash) com rastro.
        if (d.dash && sprinting && !this.prevSprint && now >= this.dashReady && it.move !== 0) {
          this.dashUntil = now + DASH_MS;
          this.dashReady = now + DASH_COOLDOWN;
          this.dashDir = it.move > 0 ? 1 : -1;
          this.body.setAllowGravity(false);
          this.dashGravityOff = true;
          this.body.setVelocityY(0);
          this.scene.cameras.main.shake(80, 0.003);
          const puff = this.scene.add.sprite(this.x - this.dashDir * 20, this.feet - 10, 'dust').setScale(1.2).setDepth(DEPTH.fighters - 1).setFlipX(this.dashDir < 0).play('dust');
          puff.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => puff.destroy());
        }
        this.prevSprint = sprinting;
        const dashing = now < this.dashUntil;
        if (!dashing && this.dashGravityOff) {
          this.dashGravityOff = false;
          this.body.setAllowGravity(true);
        }
        const speed = this.crouching ? CROUCH_SPEED : guarding ? GUARD_WALK_SPEED : d.speed * (sprinting ? SPRINT : 1);
        this.body.setVelocityX(dashing ? this.dashDir * DASH_V : it.move * speed);
        if (dashing) {
          this.body.setVelocityY(0);
          if (now - this.lastGhost > 30) {
            this.lastGhost = now;
            const g = this.scene.add
              .image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name)
              .setFlipX(this.sprite.flipX)
              .setScale(this.sprite.scaleX, this.sprite.scaleY)
              .setDepth(DEPTH.fighters - 0.5)
              .setTintFill(this.ghostTint)
              .setAlpha(0.55);
            this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
          }
        }
        this.setState(guarding ? 'guard' : it.move !== 0 ? 'run' : 'idle');
        if (sprinting) {
          this.sprite.anims.timeScale = 1.6;
          // Poeira saindo dos pés.
          if (grounded && now - this.lastDust > 130) {
            this.lastDust = now;
            const dust = this.scene.add.sprite(this.x - this.facing * 18, this.feet - 8, 'dust').setScale(0.8).setDepth(DEPTH.fighters - 1).play('dust');
            dust.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => dust.destroy());
          }
        }
        // Morcego: segurando pular no ar, voa subindo (até acabar o fôlego).
        if (d.fly && !grounded && it.jumpHeld && this.flightLeft > 0) {
          this.flightLeft -= dtMs;
          this.body.setVelocityY(Math.max(this.body.velocity.y - 2600 * dt, -190));
          this.sprite.anims.timeScale = 1.8;
        }
      }
    }

    if (d.climb && this.state !== 'stun') this.updateClimb(dt, grounded);
    if (d.swim) this.updateSwim(dt, now);

    if (this.knockT > 0) {
      this.knockT -= dt;
      this.body.setVelocityX(this.knockV);
    }
    this.updateFlightBar();

    this.sprite.setFlipX(this.facing < 0);

    // Bolha de energia para quem não tem animação própria de defesa: envolve o corpo e pulsa.
    const showShield = this.state === 'guard' && !d.guard;
    this.shield.setVisible(showShield);
    if (showShield) {
      const head = d.head * (this.crouching ? CROUCH_SCALE : 1);
      const size = (head + 34) / 116;
      const pulse = 1 + Math.sin(now / 90) * 0.03;
      this.shield
        .setPosition(this.x, this.feet - head * 0.5 - 4)
        .setScale(size * pulse)
        .setAlpha(0.85);
    }

    // Pisca enquanto invulnerável.
    this.sprite.setAlpha(this.invulnerable ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1);
    this.updateMarkers();
  }

  /**
   * Aranha: encostou numa parede no ar → gruda e sobe sozinha; ao chegar no topo,
   * dá um impulso por cima da borda. Sobre um poço, é puxada para a parede mais próxima.
   */
  private updateClimb(dt: number, grounded: boolean): void {
    const b = this.body;
    if (this.climbHop > 0) {
      this.climbHop -= dt;
      return;
    }
    const wall = b.blocked.left ? -1 : b.blocked.right ? 1 : 0;
    if (!grounded && wall !== 0) {
      this.climbDir = wall;
      this.facing = wall as 1 | -1;
      b.setVelocity(wall * 60, -260);
      this.sprite.setAngle(-90 * wall);
      if (this.sprite.anims.currentAnim?.key !== `${this.def.id}_run`) this.sprite.play(`${this.def.id}_run`);
      return;
    }
    if (this.climbDir !== 0) {
      // Passou da borda: impulso para cima do degrau.
      b.setVelocity(this.climbDir * 170, -230);
      this.climbHop = 0.22;
      this.climbDir = 0;
      this.sprite.setAngle(0);
      return;
    }
    if (!grounded && b.velocity.y > 0 && this.wallProbe) {
      const dir = this.wallProbe(this.x, this.feet);
      if (dir !== 0) b.setVelocity(dir * 280, Math.min(b.velocity.y, 120));
    }
  }

  /**
   * Nado do lagarto: na água ele boia com a cabeça para fora (uma mola suave puxa os pés
   * para a linha de flutuação), nada com aceleração macia, mergulha segurando ▼ e salta
   * para fora com PULAR. O corpo balança e inclina conforme nada.
   */
  private updateSwim(dt: number, now: number): void {
    const b = this.body;
    const wy = this.waterY;
    const inWater = wy !== undefined && this.feet > wy + 4;
    if (!inWater) {
      if (this.swimming) {
        this.swimming = false;
        b.setAllowGravity(true);
        this.sprite.setAngle(0);
        this.onSwimFx?.(this, 'exit');
      }
      return;
    }
    if (!this.swimming) {
      this.swimming = true;
      b.setAllowGravity(false);
      // Amortece a entrada (sem parar seco).
      b.setVelocityY(Math.min(b.velocity.y, 260) * 0.45);
      this.onSwimFx?.(this, 'enter');
    }
    const it = this.intent;
    const diving = it.crouch;
    const floatFeet = wy + 34; // cabeça e ombros para fora
    const target = diving ? wy + 140 : floatFeet;
    // Mola amortecida até a profundidade alvo + leve balanço na superfície.
    const bob = diving ? 0 : Math.sin(now / 320) * 4;
    const desiredVy = (target + bob - this.feet) * (diving ? 2.2 : 4.5);
    b.setVelocityY(Phaser.Math.Linear(b.velocity.y, desiredVy, Math.min(1, dt * 6)));
    // Braçadas: aceleração macia, um pouco mais lenta que correr.
    if (this.state !== 'attack' && this.state !== 'stun') {
      const want = it.move * this.def.speed * (diving ? 0.7 : 0.85);
      b.setVelocityX(Phaser.Math.Linear(b.velocity.x, want, Math.min(1, dt * 5)));
      if (it.move !== 0) this.facing = it.move > 0 ? 1 : -1;
      // Salto para fora d'água (perto da superfície).
      if (it.jump && this.feet < wy + 70) {
        b.setAllowGravity(true);
        b.setVelocityY(-JUMP_V * 1.08);
        this.swimming = false;
        this.jumps = 1;
        this.sprite.setAngle(0);
        this.onSwimFx?.(this, 'exit');
        return;
      }
      // Nada sem "andar": usa o corpo parado (sem passos) e só ondula.
      const anim = `${this.def.id}_idle`;
      if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
      this.sprite.anims.timeScale = 0.6;
    }
    // Encabeça: o corpo deita para a frente como quem nada, mais quanto mais rápido vai;
    // mergulhando, a cabeça aponta para baixo. Uma ondulação leve dá o ritmo das braçadas.
    const speed01 = Math.min(1, Math.abs(b.velocity.x) / this.def.speed);
    const lean = this.facing * (18 + 42 * speed01) + (diving ? 22 * this.facing : 0);
    const stroke = Math.sin(now / (speed01 > 0.2 ? 140 : 300)) * (4 + 6 * speed01);
    this.sprite.setAngle(Phaser.Math.Linear(this.sprite.angle, lean + stroke, Math.min(1, dt * 6)));
    if (now - this.lastWake > (diving ? 260 : 170)) {
      this.lastWake = now;
      if (diving) this.onSwimFx?.(this, 'bubble');
      else if (Math.abs(b.velocity.x) > 30) this.onSwimFx?.(this, 'wake');
    }
  }

  /** Barrinha de fôlego do voo sobre a cabeça (só aparece enquanto gasta). */
  private updateFlightBar(): void {
    const max = this.def.fly;
    if (!max || this.flightLeft >= max || !this.alive) {
      this.flightBar?.setVisible(false);
      return;
    }
    if (!this.flightBar) this.flightBar = this.scene.add.graphics().setDepth(DEPTH.fx + 1);
    const f = Math.max(0, this.flightLeft / max);
    const x = this.x - 24;
    const y = this.feet - this.def.head - 44;
    this.flightBar.clear().setVisible(true);
    this.flightBar.fillStyle(0x10223a, 0.85).fillRoundedRect(x - 2, y - 2, 52, 10, 4);
    this.flightBar.fillStyle(f > 0.3 ? 0x9fe3ff : 0xff8c1a, 1).fillRoundedRect(x, y, 48 * f, 6, 3);
  }

  private attackFrame(): number {
    return Math.floor(this.attackT * this.def.attack.fps);
  }

  private startAttack(): void {
    this.state = 'attack';
    this.attackT = 0;
    this.attackLow = this.crouching;
    this.released = false;
    this.attackHits.clear();
    this.attackId++;
    this.sprite.play(this.crouching && this.hasCrouchPose ? `${this.def.id}_crouch_attack` : `${this.def.id}_attack`);
  }

  private setState(s: State): void {
    const id = this.def.id;
    let anim = `${id}_idle`;
    if (s === 'run') anim = `${id}_run`;
    if (s === 'guard') anim = this.def.guard ? `${id}_guard` : `${id}_idle`;
    if (!this.onGround && s !== 'guard') anim = `${id}_run`;
    if (this.crouching && this.hasCrouchPose) anim = s === 'run' ? `${id}_crouch_run` : `${id}_crouch_idle`;
    this.state = s;
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
    // Andando agachado: passos mais lentos.
    this.sprite.anims.timeScale = this.crouching && s === 'run' ? 0.6 : 1;
  }

  /** Morte. Na água, afunda devagar (a cena recorta o que fica abaixo da superfície). */
  kill(cause: 'hit' | 'water', fromDir: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'dead';
    this.clearStars();
    this.setCrouch(false);
    this.shield.setVisible(false);
    this.setMarkersVisible(false);
    const vy = this.body.velocity.y;
    this.body.setVelocity(0, 0);
    this.body.setEnable(false);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0);
    if (cause === 'water') {
      this.sprite.anims.timeScale = 0.5;
      this.sprite.setTint(0x7fb8e6);
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y + 90 + Math.min(60, vy * 0.05),
        angle: 12 * (fromDir || 1),
        duration: 900,
        ease: 'Quad.easeOut',
      });
      return;
    }
    this.sprite.anims.stop();
    this.sprite.setTint(0xff6b6b);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 90 * (fromDir || 1),
      y: this.sprite.y - 30,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
    });
  }

  /** Some da tela (para o xamã trazer de volta em outro lugar). */
  vanish(): void {
    if (!this.alive) return;
    this.kill('hit', 1);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setVisible(false);
  }

  respawn(x: number, feetY: number): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.clearMask();
    this.sprite.setVisible(true).setAlpha(1).setAngle(0).clearTint();
    this.sprite.anims.timeScale = 1;
    this.body.setEnable(true);
    this.alive = true;
    this.reviving = false;
    this.knockT = 0;
    this.cooldown = 0.2;
    this.jumps = 0;
    this.sprite.setX(x);
    this.applyChar(this.baseChar, feetY);
    this.body.setVelocity(0, 0);
    this.invulnUntil = this.scene.time.now + INVULN_TIME;
    this.setMarkersVisible(true);
    this.updateMarkers();
  }

  // ---------- identificação do jogador ----------

  private aura?: Phaser.GameObjects.Image;
  private ring?: Phaser.GameObjects.Ellipse;
  private tag?: Phaser.GameObjects.Container;

  /** Aura atrás do corpo, anel nos pés e etiqueta "P1/P2" sobre a cabeça. */
  private buildMarkers(color: number, text: string): void {
    const s = this.scene;
    this.aura = s.add.image(0, 0, 'aura').setTint(color).setDepth(DEPTH.fighters - 1);
    s.tweens.add({ targets: this.aura, alpha: { from: 0.9, to: 0.55 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ring = s.add.ellipse(0, 0, 58, 16).setStrokeStyle(3, color, 0.95).setFillStyle(color, 0.22).setDepth(DEPTH.fighters - 1);

    const label = s.add
      .text(0, 0, text, { fontFamily: FONT, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    const w = label.width + 14;
    const g = s.add.graphics();
    g.fillStyle(0x10223a, 1).fillRoundedRect(-w / 2 - 2, -12, w + 4, 24, 8);
    g.fillStyle(color, 1).fillRoundedRect(-w / 2, -10, w, 20, 7);
    g.fillStyle(0x10223a, 1).fillTriangle(-7, 12, 7, 12, 0, 20);
    g.fillStyle(color, 1).fillTriangle(-5, 10, 5, 10, 0, 16);
    this.tag = s.add.container(0, 0, [g, label]).setDepth(DEPTH.fx + 1);
  }

  /** Topo real do desenho (pixels opacos) de cada folha 'idle', medido uma vez. */
  private static tops = new Map<string, number>();

  /** Quantos px acima dos pés fica o topo visível do personagem (crista, chifres, orelhas...). */
  private visualHeight(): number {
    const key = `${this.def.id}_idle`;
    let top = Fighter.tops.get(key);
    if (top === undefined) {
      top = this.def.feetY - this.def.head;
      try {
        const tex = this.scene.textures.get(key);
        const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        const c = document.createElement('canvas');
        c.width = src.width;
        c.height = src.height;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(src, 0, 0);
        let best = Infinity;
        for (const name of tex.getFrameNames()) {
          const f = tex.get(name);
          const data = ctx.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight).data;
          for (let y = 0; y < f.cutHeight && y < best; y++) {
            let hit = false;
            for (let x = 0; x < f.cutWidth; x++) if (data[(y * f.cutWidth + x) * 4 + 3] > 40) { hit = true; break; }
            if (hit) best = Math.min(best, y);
          }
        }
        if (Number.isFinite(best)) top = best;
      } catch {
        /* sem leitura de pixels: usa a altura da cabeça */
      }
      Fighter.tops.set(key, top);
    }
    return Math.max(this.def.head, this.def.feetY - top) * Math.abs(this.sprite.scaleY);
  }

  /** Altura (acima dos pés) onde cabem etiquetas e balões sem cobrir o personagem. */
  get labelHeight(): number {
    // Agachado com pose desenhada: o desenho encolhe sem mudar a escala do sprite.
    return this.visualHeight() * (this.crouching && this.hasCrouchPose ? CROUCH_SCALE : 1);
  }

  private updateMarkers(): void {
    if (!this.aura || !this.ring || !this.tag) return;
    const head = this.def.head * (this.crouching ? CROUCH_SCALE : 1);
    const visible = this.sprite.visible && this.alive;
    this.aura.setPosition(this.x, this.feet - head * 0.45).setScale(1.05, (head + 40) / 100).setVisible(visible);
    this.ring.setPosition(this.x, this.feet - 2).setVisible(visible);
    const bob = Math.sin(this.scene.time.now / 220) * 3;
    this.tag.setPosition(this.x, this.feet - Math.max(head, this.labelHeight) - 22 + bob).setVisible(visible);
  }

  setMarkersVisible(v: boolean): void {
    this.aura?.setVisible(v);
    this.ring?.setVisible(v);
    this.tag?.setVisible(v);
  }

  destroy(): void {
    this.flightBar?.destroy();
    this.clearStars();
    this.aura?.destroy();
    this.ring?.destroy();
    this.tag?.destroy();
    this.shield.destroy();
    this.sprite.destroy();
  }
}
