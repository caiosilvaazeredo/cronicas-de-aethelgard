import Phaser from 'phaser';

/**
 * Jogar só com gestos (dedo na tela) ou só com o mouse.
 *
 * Um "manche flutuante": onde o dedo/clique encosta vira o centro.
 * - Arrastar para os lados: anda; arrastar longe: pique.
 * - Deslizar rápido para cima: pula (de novo no ar: pulo duplo; segurar depois: voo do morcego).
 * - Arrastar para baixo: agacha.
 * - Toque/clique rápido: ataca.
 * - Segurar parado: pega o item do chão.
 * - Defender: segundo dedo na tela, ou botão direito do mouse.
 * - Mouse: botão do meio também pega o item.
 */
export interface GestureState {
  move: number;
  sprint: boolean;
  jump: boolean;
  jumpHeld: boolean;
  crouch: boolean;
  guard: boolean;
  attack: boolean;
  pick: boolean;
}

const DEAD = 22; // px de arrasto antes de andar
const RUN = 100; // px de arrasto para o pique
const LEASH = 130; // o centro acompanha o dedo além disso
const FLICK = 42; // px para cima em pouco tempo = pulo
const FLICK_MS = 320;
const TAP_MS = 230;
const TAP_MOVE = 16;
const HOLD_MS = 380;

export class GestureInput {
  private main?: Phaser.Input.Pointer;
  private anchor = { x: 0, y: 0 };
  private downAt = 0;
  private moved = 0;
  private jumped = false;
  private longFired = false;
  private flickY = 0;
  private flickT = 0;
  private prevMiddle = false;
  private wasDown = new Set<Phaser.Input.Pointer>();
  private ring?: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    scene.input.mouse?.disableContextMenu();
  }

  /** O ponteiro caiu em cima de um botão da interface (MENU etc.)? */
  private overUi(p: Phaser.Input.Pointer): boolean {
    const ui = this.scene.scene.get('ui');
    if (!ui || !ui.sys.isActive()) return false;
    return ui.input.hitTestPointer(p).length > 0;
  }

  private isMouse(p: Phaser.Input.Pointer): boolean {
    return p === this.scene.input.mousePointer && !p.wasTouch;
  }

  /** Dedo/botão principal apertado? (no mouse, só o botão esquerdo move/ataca). */
  private primaryDown(p: Phaser.Input.Pointer): boolean {
    return this.isMouse(p) ? p.leftButtonDown() : p.isDown;
  }

  read(): GestureState {
    const now = this.scene.time.now;
    const out: GestureState = { move: 0, sprint: false, jump: false, jumpHeld: false, crouch: false, guard: false, attack: false, pick: false };
    const pointers = this.scene.input.manager.pointers.filter(Boolean);
    const mouse = this.scene.input.mousePointer;

    // Soltou o principal: toque curto e parado é ataque.
    if (this.main && !this.primaryDown(this.main)) {
      if (now - this.downAt < TAP_MS && this.moved < TAP_MOVE && !this.jumped) out.attack = true;
      this.main = undefined;
    }
    // Novo toque/clique principal.
    if (!this.main) {
      const p = pointers.find((q) => this.primaryDown(q) && !this.wasDown.has(q) && !this.overUi(q));
      if (p) {
        this.main = p;
        this.anchor = { x: p.x, y: p.y };
        this.downAt = now;
        this.moved = 0;
        this.jumped = false;
        this.longFired = false;
        this.flickY = p.y;
        this.flickT = now;
      }
    }

    const m = this.main;
    if (m) {
      let dx = m.x - this.anchor.x;
      // O centro "segue" o dedo para não precisar voltar até lá para trocar de lado.
      if (Math.abs(dx) > LEASH) {
        this.anchor.x = m.x - Math.sign(dx) * LEASH;
        dx = m.x - this.anchor.x;
      }
      const dy = m.y - this.anchor.y;
      this.moved = Math.max(this.moved, Math.hypot(m.x - m.downX, m.y - m.downY));
      if (Math.abs(dx) > DEAD) out.move = Math.sign(dx);
      out.sprint = Math.abs(dx) > RUN;
      out.crouch = dy > 55 && dy > Math.abs(dx) * 0.8;
      // Deslizada rápida para cima: pulo. A janela anda junto com o dedo.
      if (this.flickY - m.y > FLICK && now - this.flickT <= FLICK_MS) {
        out.jump = true;
        this.jumped = true;
        this.anchor.y = m.y;
        this.flickY = m.y;
        this.flickT = now;
      } else if (m.y > this.flickY || now - this.flickT > FLICK_MS) {
        this.flickY = m.y;
        this.flickT = now;
      }
      out.jumpHeld = this.jumped;
      // Segurar parado: pegar o item.
      if (!this.longFired && this.moved < TAP_MOVE && now - this.downAt > HOLD_MS) {
        out.pick = true;
        this.longFired = true;
      }
    }

    // Defesa: segundo dedo na tela, ou botão direito do mouse.
    out.guard = pointers.some((p) => p !== m && p.isDown && !this.isMouse(p) && !this.overUi(p)) || (!mouse.wasTouch && mouse.rightButtonDown());
    // Botão do meio: pegar.
    const middle = !mouse.wasTouch && mouse.middleButtonDown();
    if (middle && !this.prevMiddle) out.pick = true;
    this.prevMiddle = middle;

    this.wasDown = new Set(pointers.filter((p) => this.primaryDown(p)));
    this.drawStick();
    return out;
  }

  /** Manche translúcido na tela enquanto arrasta (desenhado na interface, sem rolar com a câmera). */
  private drawStick(): void {
    const ui = this.scene.scene.get('ui');
    if (!ui || !ui.sys.isActive()) return;
    if (!this.ring || !this.ring.active || this.ring.scene !== ui) this.ring = ui.add.graphics().setDepth(1000);
    const g = this.ring;
    g.clear();
    const m = this.main;
    if (!m) return;
    const dx = Phaser.Math.Clamp(m.x - this.anchor.x, -LEASH, LEASH);
    const dy = Phaser.Math.Clamp(m.y - this.anchor.y, -LEASH, LEASH);
    g.lineStyle(4, 0xfff7dc, 0.35).strokeCircle(this.anchor.x, this.anchor.y, 60);
    g.fillStyle(0x10223a, 0.18).fillCircle(this.anchor.x, this.anchor.y, 60);
    g.fillStyle(0xfff7dc, 0.4).fillCircle(this.anchor.x + dx * 0.5, this.anchor.y + dy * 0.5, 24);
  }
}
