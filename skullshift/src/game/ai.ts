import Phaser from 'phaser';
import type { Controller, Intent } from './controls';
import type { Fighter } from './Fighter';
import type { Level } from './level';

const AGGRO = 520;

/** IA simples: corpo a corpo se aproxima e golpeia; à distância mantém espaço e arremessa. */
export class EnemyAI implements Controller {
  private attackDelay = 0;
  private guardT = 0;
  private lastSeenAttack = -1;
  private thinkT = 0;
  private aggro = false;

  constructor(
    private self: Fighter,
    private getTarget: () => Fighter | null,
    private level: Level,
  ) {}

  read(): Intent {
    const me = this.self;
    const dt = me.sprite.scene.game.loop.delta / 1000;
    const it: Intent = { move: 0, jump: false, guard: false, attack: false };
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
    if (dist > AGGRO || dy > 140) {
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

    const safe = (step: number) => this.level.isGround(me.x + step * 28);

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
      if (dist > reach * 0.85) {
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
