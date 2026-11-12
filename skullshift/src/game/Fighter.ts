import Phaser from 'phaser';
import { DEPTH, FONT, GUARD_WALK_SPEED, INVULN_TIME, JUMP_V } from '../config';
import { CHARS, type CharDef, type CharId } from './characters';
import { emptyIntent, type Intent } from './controls';

type State = 'idle' | 'run' | 'guard' | 'attack' | 'dead';

/** Altura aproximada da cabeça acima dos pés (para a etiqueta e a aura). */
const HEAD_HEIGHT: Record<CharId, number> = { skull: 72, lizard: 118, gnoll: 76, shark: 76, goblin: 108 };

const BODY_W = 30;
const BODY_H = 50;

export interface HitBox {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Um lutador: jogador ou inimigo. Morre com um golpe; defende pela frente
 * (segurando para trás, estilo jogo de luta, ou com o botão de defesa).
 */
export class Fighter {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  def: CharDef;
  facing: 1 | -1 = 1;
  state: State = 'idle';
  alive = true;
  intent: Intent = emptyIntent();
  /** Posição x do oponente a encarar (null = encara para onde anda). */
  faceTarget: number | null = null;

  private attackT = 0;
  private cooldown = 0;
  private knockT = 0;
  private knockV = 0;
  private invulnUntil = 0;
  private released = false;
  private shield: Phaser.GameObjects.Image;
  /** Alvos já atingidos/bloqueados neste golpe. */
  readonly attackHits = new Set<Fighter>();
  /** Identificador do golpe atual (a IA usa para reagir uma vez por golpe). */
  attackId = 0;

  onProjectile?: (f: Fighter) => void;

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
  get isTransformed(): boolean {
    return this.def.id !== this.baseChar;
  }

  /** Troca o personagem mantendo a posição dos pés. */
  applyChar(id: CharId, feetY = this.feet): void {
    this.def = CHARS[id];
    const d = this.def;
    this.sprite.setTexture(`${id}_idle`, 0);
    this.body.setSize(BODY_W, BODY_H, false);
    this.body.setOffset(d.frame / 2 - BODY_W / 2, d.feetY - BODY_H);
    const y = feetY - d.feetY + d.frame / 2;
    this.body.reset(this.sprite.x, y);
    this.sprite.play(`${id}_idle`);
    this.state = 'idle';
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
      y1: this.feet - 64,
      y2: this.feet + 4,
    };
  }

  /** Bloqueia algo vindo de fromX? */
  blocksFrom(fromX: number): boolean {
    if (!this.isGuarding) return false;
    const dir = Math.sign(fromX - this.x) || this.facing;
    return dir === this.facing;
  }

  knockback(dir: number, power = 320): void {
    this.knockT = 0.16;
    this.knockV = dir * power;
  }

  update(dtMs: number): void {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    const d = this.def;
    const it = this.intent;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const grounded = this.onGround;

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

    if (this.state !== 'attack') {
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

      if (it.attack && this.cooldown <= 0) {
        this.startAttack();
      } else {
        if (it.jump && grounded) this.body.setVelocityY(-JUMP_V);
        const speed = guarding ? GUARD_WALK_SPEED : d.speed;
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
      this.shield.setPosition(this.x + this.facing * 20, this.feet - 26).setFlipX(this.facing < 0);
    }

    // Pisca enquanto invulnerável.
    this.sprite.setAlpha(this.invulnerable ? (Math.floor(this.scene.time.now / 80) % 2 ? 0.35 : 1) : 1);
    this.updateMarkers();
  }

  private attackFrame(): number {
    return Math.floor(this.attackT * this.def.attack.fps);
  }

  private startAttack(): void {
    this.state = 'attack';
    this.attackT = 0;
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
  }

  /** Morte. Retorna a posição onde caiu. */
  kill(cause: 'hit' | 'water', fromDir: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'dead';
    this.shield.setVisible(false);
    this.setMarkersVisible(false);
    this.body.setVelocity(0, 0);
    this.body.setEnable(false);
    this.sprite.anims.stop();
    if (cause === 'water') {
      this.sprite.setVisible(false);
      return;
    }
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

  respawn(x: number, feetY: number): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setVisible(true).setAlpha(1).setAngle(0).clearTint();
    this.body.setEnable(true);
    this.alive = true;
    this.knockT = 0;
    this.cooldown = 0.2;
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

    const hex = '#' + color.toString(16).padStart(6, '0');
    const label = s.add
      .text(0, 0, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5);
    const w = label.width + 14;
    const g = s.add.graphics();
    g.fillStyle(0x10223a, 1).fillRoundedRect(-w / 2 - 2, -12, w + 4, 24, 8);
    g.fillStyle(color, 1).fillRoundedRect(-w / 2, -10, w, 20, 7);
    g.fillStyle(0x10223a, 1).fillTriangle(-7, 12, 7, 12, 0, 20);
    g.fillStyle(color, 1).fillTriangle(-5, 10, 5, 10, 0, 16);
    this.tag = s.add.container(0, 0, [g, label]).setDepth(DEPTH.fx + 1);
    this.tag.setData('hex', hex);
  }

  private updateMarkers(): void {
    if (!this.aura || !this.ring || !this.tag) return;
    const head = HEAD_HEIGHT[this.def.id];
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
    this.aura?.destroy();
    this.ring?.destroy();
    this.tag?.destroy();
    this.shield.destroy();
    this.sprite.destroy();
  }
}
