import Phaser from 'phaser';
import type { Controller, Intent } from './controls';
import type { Fighter } from './Fighter';
import type { Level } from './level';
import type { Ability } from './variants';

const AGGRO = 520;

/** IA simples: corpo a corpo se aproxima e golpeia; à distância mantém espaço e arremessa. */
export class EnemyAI implements Controller {
  private attackDelay = 0;
  private guardT = 0;
  private lastSeenAttack = -1;
  private thinkT = 0;
  private aggro = false;

  /** Lagarto de Areia: monte de areia que treme enquanto ele está enterrado. */
  private mound?: Phaser.GameObjects.Graphics;
  private surfacedAt = 0;

  constructor(
    private self: Fighter,
    private getTarget: () => Fighter | null,
    private level: Level,
    /** Habilidade da variante (investida, enterrar...). */
    private ability?: Ability,
    /** Cores do monte de quem se enterra (escuro, claro). */
    private moundColor: [number, number] = [0xd8b070, 0xfff1a8],
  ) {
    if (ability === 'burrow') this.self.buried = true;
  }

  /** Enterrado: espera o jogador chegar perto e salta para fora atacando. */
  private burrow(it: Intent, dist: number, dy: number): boolean {
    const me = this.self;
    const s = me.sprite.scene;
    const now = s.time.now;
    if (!me.alive) {
      this.mound?.destroy();
      this.mound = undefined;
      return false;
    }
    if (me.buried) {
      if (!this.mound) this.mound = s.add.graphics().setDepth(me.sprite.depth - 0.1);
      const g = this.mound;
      const wob = Math.sin(now / 90) * 2;
      g.clear();
      g.fillStyle(0x1d1a2b, 1).fillEllipse(me.x, me.feet - 4, 64 + wob, 22);
      g.fillStyle(this.moundColor[0], 1).fillEllipse(me.x, me.feet - 5, 58 + wob, 17);
      g.fillStyle(this.moundColor[1], 1).fillEllipse(me.x - 8, me.feet - 9, 18, 5);
      // No capim, a "moita" tem folhas pontudas.
      if (this.moundColor[0] !== 0xd8b070) for (let k = -24; k <= 24; k += 8) g.fillStyle(this.moundColor[1], 1).fillTriangle(me.x + k - 4, me.feet - 8, me.x + k + 4, me.feet - 8, me.x + k + wob, me.feet - 24);
      if (dist < 170 && dy < 80) {
        me.buried = false;
        this.surfacedAt = now;
        g.clear();
        it.jump = true;
        it.attack = true;
        this.attackDelay = 0.6;
      }
      return true;
    }
    this.mound?.clear();
    // Longe do jogador por um tempo: volta para baixo da areia.
    if (now - this.surfacedAt > 3500 && dist > 320 && me.onGround && me.state !== 'attack') me.buried = true;
    return false;
  }

  read(): Intent {
    const me = this.self;
    const dt = me.sprite.scene.game.loop.delta / 1000;
    const it: Intent = { move: 0, jump: false, guard: false, attack: false, pick: false, crouch: false, jumpHeld: false, sprint: false };
    const t = this.getTarget();
    this.attackDelay -= dt;
    this.guardT -= dt;
    this.thinkT -= dt;

    if (!t || !t.alive) {
      me.faceTarget = null;
      return it;
    }
    const dx = t.x - me.x;
    const dist = Math.abs(dx);
    const dy = Math.abs(t.feet - me.feet);
    if (this.ability === 'burrow') {
      me.faceTarget = t.x;
      if (this.burrow(it, dist, dy)) return it;
    }
    if (dist > AGGRO || (dy > 140 && !me.freeSwim)) {
      this.aggro = false;
      me.faceTarget = null;
      if (me.facing !== -1 && dist > AGGRO) me.facing = dx < 0 ? -1 : 1;
      return it;
    }
    me.faceTarget = t.x;
    if (!this.aggro) {
      // Tempo de reação ao avistar o jogador.
      this.aggro = true;
      this.attackDelay = Math.max(this.attackDelay, Phaser.Math.FloatBetween(0.45, 0.75));
    }
    const dir = Math.sign(dx);

    // Reage ao golpe do jogador: às vezes defende.
    const d = t.def;
    const threatReach = (d.melee?.reach ?? 0) + 40;
    if (t.state === 'attack' && t.attackId !== this.lastSeenAttack) {
      this.lastSeenAttack = t.attackId;
      const incoming = d.projectile ? dist < 600 : dist < threatReach;
      if (incoming && Math.random() < 0.3) this.guardT = 0.45;
    }
    if (this.guardT > 0) {
      it.guard = true;
      return it;
    }

    // Só anda onde há chão na mesma altura (não despenca de degraus nem cai em buracos).
    // Debaixo d'água: segue o jogador também na altura.
    if (me.freeSwim) {
      it.up = t.feet < me.feet - 24;
      it.crouch = t.feet > me.feet + 24;
    }
    const safe = (step: number) => {
      if (me.freeSwim) return true;
      const g = this.level.groundY(me.x + step * 28);
      return g !== null && Math.abs(g - me.feet) < 12;
    };

    if (me.def.projectile) {
      if (dist < 200 && safe(-dir)) it.move = -dir * 0.8;
      else if (dist > 430 && safe(dir)) it.move = dir * 0.7;
      if (dist < 560 && dy < 50 && this.attackDelay <= 0 && me.state !== 'attack') {
        it.attack = true;
        it.move = 0;
        this.attackDelay = Phaser.Math.FloatBetween(1.5, 2.4);
      }
    } else {
      const reach = me.def.melee!.reach;
      // Tubarão-Martelo: de média distância, dispara em linha reta até o jogador.
      const charging = this.ability === 'charge' && dist > reach && dist < 460 && dy < 50 && this.attackDelay <= 0.3;
      if (charging) {
        if (safe(dir)) {
          it.move = dir;
          it.sprint = true;
        }
      } else if (dist > reach * 0.85) {
        if (safe(dir)) it.move = dir * 0.75;
        if (this.attackDelay < 0.3) this.attackDelay = 0.3; // tempo de reação ao chegar
      } else if (this.attackDelay <= 0 && me.state !== 'attack') {
        it.attack = true;
        this.attackDelay = Phaser.Math.FloatBetween(0.9, 1.5);
      } else if (this.thinkT <= 0 && dist < reach * 0.5 && safe(-dir)) {
        // Recua um passo de vez em quando para não ficar colado.
        this.thinkT = 0.8;
        it.move = -dir;
      }
    }
    return it;
  }
}
