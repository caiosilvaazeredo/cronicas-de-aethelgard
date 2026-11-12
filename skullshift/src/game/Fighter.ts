import Phaser from 'phaser';
import { DEPTH, FONT, GUARD_WALK_SPEED, INVULN_TIME, JUMP_V } from '../config';
import { CHARS, type CharDef, type CharId } from './characters';
import { emptyIntent, type Intent } from './controls';

type State = 'idle' | 'run' | 'guard' | 'attack' | 'stun' | 'dead';


const BODY_W = 30;
const BODY_H = 50;
/** Agachado: o desenho e a caixa de colisão encolhem na altura (estilo Metal Slug). */
const CROUCH_SCALE = 0.66;
const CROUCH_SPEED = 120;
/** O segundo pulo (no ar) é um pouco mais fraco. */
const DOUBLE_JUMP = 0.88;

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
  private released = false;
  private shield: Phaser.GameObjects.Image;
  /** Alvos já atingidos/bloqueados neste golpe. */
  readonly attackHits = new Set<Fighter>();
  /** Identificador do golpe atual (a IA usa para reagir uma vez por golpe). */
  attackId = 0;

  onProjectile?: (f: Fighter) => void;
  onDoubleJump?: (f: Fighter) => void;

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
    this.shield = scene.add.image(x, feetY, 'shield').setDepth(DEPTH.fighters + 1).setVisible(false);
    if (color !== undefined) this.buildMarkers(color, tagText ?? label);
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
    const s = v ? CROUCH_SCALE : 1;
    this.crouching = v;
    this.sprite.setScale(1, s);
    this.sprite.y = feet - s * (this.def.feetY - this.def.frame / 2);
    this.body.updateFromGameObject();
    // Mantém o apoio no chão sem "cair" no quadro seguinte.
    this.body.prev.y = this.body.y;
    this.body.prevFrame.y = this.body.y;
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
    if (grounded && this.body.velocity.y >= 0) this.jumps = 0;

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
          } else if (this.jumps < 2) {
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
        const speed = this.crouching ? CROUCH_SPEED : guarding ? GUARD_WALK_SPEED : d.speed;
        this.body.setVelocityX(it.move * speed);
        this.setState(guarding ? 'guard' : it.move !== 0 ? 'run' : 'idle');
      }
    }

    if (this.knockT > 0) {
      this.knockT -= dt;
      this.body.setVelocityX(this.knockV);
    }

    this.sprite.setFlipX(this.facing < 0);

    // Escudo genérico para quem não tem animação própria de defesa.
    const showShield = this.state === 'guard' && !d.guard;
    this.shield.setVisible(showShield);
    if (showShield) {
      const h = this.crouching ? 16 : 26;
      this.shield.setPosition(this.x + this.facing * 20, this.feet - h).setFlipX(this.facing < 0);
    }

    // Pisca enquanto invulnerável.
    this.sprite.setAlpha(this.invulnerable ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1);
    this.updateMarkers();
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
    this.sprite.play(`${this.def.id}_attack`);
  }

  private setState(s: State): void {
    const id = this.def.id;
    let anim = `${id}_idle`;
    if (s === 'run') anim = `${id}_run`;
    if (s === 'guard') anim = this.def.guard ? `${id}_guard` : `${id}_idle`;
    if (!this.onGround && s !== 'guard') anim = `${id}_run`;
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

  private updateMarkers(): void {
    if (!this.aura || !this.ring || !this.tag) return;
    const head = this.def.head * (this.crouching ? CROUCH_SCALE : 1);
    const visible = this.sprite.visible && this.alive;
    this.aura.setPosition(this.x, this.feet - head * 0.45).setScale(1.05, (head + 40) / 100).setVisible(visible);
    this.ring.setPosition(this.x, this.feet - 2).setVisible(visible);
    const bob = Math.sin(this.scene.time.now / 220) * 3;
    this.tag.setPosition(this.x, this.feet - head - 26 + bob).setVisible(visible);
  }

  private setMarkersVisible(v: boolean): void {
    this.aura?.setVisible(v);
    this.ring?.setVisible(v);
    this.tag?.setVisible(v);
  }

  destroy(): void {
    this.clearStars();
    this.aura?.destroy();
    this.ring?.destroy();
    this.tag?.destroy();
    this.shield.destroy();
    this.sprite.destroy();
  }
}
