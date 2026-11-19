import Phaser from 'phaser';
import { settings } from '../game/settings';

/**
 * Transição suave entre telas, para o jogo todo.
 *
 * Todo `this.scene.start(...)` passa por aqui: uma cortina (cena 'fade', sempre por cima) escurece,
 * a próxima tela é criada por trás dela e a cortina só abre depois que a tela nova já desenhou
 * alguns quadros. Assim o "tranco" de montar a tela (texturas, textos, cenário) fica escondido,
 * e a cortina anima com o relógio limpo, sem pular.
 *
 * Se a tela de origem já escureceu a própria câmera (algumas fazem fade próprio), a cortina
 * assume na mesma cor, sem segundo escurecimento.
 */

const COLOR = 0x0e1a2b;
const OUT_MS = 170;
const IN_MS = 280;
/** Quadros desenhados pela tela nova antes de abrir a cortina. */
const SETTLE_FRAMES = 3;

class FadeScene extends Phaser.Scene {
  curtain!: Phaser.GameObjects.Rectangle;
  /** Íris em forma de caveira: o buraco na cortina por onde a tela aparece. */
  iris?: Phaser.GameObjects.Image;
  /** A troca atual usa a íris (abre pela íris também). */
  irisOn = false;

  constructor() {
    super({ key: 'fade', active: true });
  }

  create(): void {
    this.curtain = this.add.rectangle(-2000, -2000, 8000, 8000, COLOR).setOrigin(0).setAlpha(0).setScrollFactor(0);
  }

  /**
   * Transição temática (íris de caveira, como nos desenhos antigos)? Só com WebGL (máscara),
   * com a textura já carregada e sem a opção "Transição simples".
   */
  themed(): boolean {
    if (settings().simpleTransition || this.game.renderer.type !== Phaser.WEBGL || !this.textures.exists('iris_skull')) return false;
    if (!this.iris) {
      this.iris = this.make.image({ x: 0, y: 0, key: 'iris_skull', add: false });
      const mask = this.iris.createBitmapMask();
      mask.invertAlpha = true;
      this.curtain.setMask(mask);
    }
    this.iris.setPosition(this.scale.width / 2, this.scale.height / 2);
    return true;
  }

  /** Escala em que a caveira cobre a tela inteira (buraco do tamanho da tela). */
  irisOpen(): number {
    const t = this.iris!;
    return (Math.max(this.scale.width, this.scale.height) / Math.min(t.width, t.height)) * 3.2;
  }

  /** Sem íris: a cortina volta a ser um escurecer simples. */
  plain(): void {
    this.irisOn = false;
    if (this.iris) this.iris.setScale(0.0001);
  }
}

type Plugin = Phaser.Scenes.ScenePlugin & { key: string; scene: Phaser.Scene };

export const TRANSITION_SCENE = FadeScene;

export function installTransitions(game: Phaser.Game): void {
  const proto = Phaser.Scenes.ScenePlugin.prototype as unknown as { start(this: Plugin, key: string | Phaser.Scene, data?: object): Plugin };
  const orig = proto.start;
  /** Troca em andamento: para qual tela vai (pode mudar se ela redirecionar ao abrir). */
  let pending: string | undefined;
  let token = 0;

  const fadeScene = () => game.scene.getScene('fade') as FadeScene | null;

  /** Espera a tela 'key' ser criada e desenhar alguns quadros; então abre a cortina. */
  const openAfter = (key: string, my: number) => {
    const fade = fadeScene()!;
    let frames = 0;
    const tick = () => {
      if (my !== token || pending !== key) return void game.events.off(Phaser.Core.Events.POST_RENDER, tick);
      if (++frames < SETTLE_FRAMES) return;
      game.events.off(Phaser.Core.Events.POST_RENDER, tick);
      pending = undefined;
      if (fade.irisOn && fade.iris && fade.curtain.alpha > 0.98) {
        // Íris de caveira abrindo: a tela nova aparece pelo buraco que cresce.
        fade.tweens.add({
          targets: fade.iris,
          scale: fade.irisOpen(),
          duration: IN_MS * 1.6,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            fade.curtain.setAlpha(0);
            fade.plain();
          },
        });
      } else fade.tweens.add({ targets: fade.curtain, alpha: 0, duration: IN_MS, ease: 'Sine.easeOut' });
    };
    const scene = game.scene.getScene(key);
    if (scene) scene.sys.events.once(Phaser.Scenes.Events.CREATE, () => game.events.on(Phaser.Core.Events.POST_RENDER, tick));
    else game.events.on(Phaser.Core.Events.POST_RENDER, tick);
  };

  proto.start = function (this: Plugin, key: string | Phaser.Scene, data?: object): Plugin {
    const from = this.key;
    const target = typeof key === 'string' ? key : undefined;
    const fade = fadeScene();
    // Sem cortina: primeira troca (pré-carregamento), reinício da mesma tela, ou cortina ainda não pronta.
    if (!target || !fade?.curtain || from === 'preload' || from === 'fade' || target === from) return orig.call(this, key, data);
    if (pending) {
      // A tela que está abrindo já manda para outra (redirecionamento): segue com a cortina fechada.
      if (from === pending && fade.curtain.alpha > 0.98) {
        pending = target;
        orig.call(this, key, data);
        openAfter(target, token);
      }
      // Senão é um segundo pedido no meio da troca (clique duplo): vale o primeiro.
      return this;
    }
    pending = target;
    const my = ++token;
    const src = this.scene;
    const input = src.input;
    if (input) {
      input.enabled = false;
      // Se a cena for encerrada no meio da troca (por outro caminho), o controle volta ligado.
      src.sys.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (input.enabled = true));
    }
    game.scene.bringToTop('fade');
    const curtain = fade.curtain;
    fade.tweens.killTweensOf(curtain);
    if (fade.iris) fade.tweens.killTweensOf(fade.iris);

    const go = () => {
      if (my !== token) return;
      orig.call(this, key, data);
      if (input) input.enabled = true;
      openAfter(target, my);
      // Garantia: se algo der errado na criação, a cortina não fica fechada para sempre.
      fade.time.delayedCall(5000, () => {
        if (my !== token || !pending) return;
        pending = undefined;
        fade.plain();
        fade.tweens.add({ targets: curtain, alpha: 0, duration: IN_MS });
      });
    };

    // A tela de origem já escureceu a câmera? A cortina entra na mesma cor, de uma vez.
    const fx = src.cameras?.main?.fadeEffect as (Phaser.Cameras.Scene2D.Effects.Fade & { alpha: number; red: number; green: number; blue: number }) | undefined;
    if (fx && fx.direction && (fx.isRunning || fx.isComplete) && fx.alpha > 0.95) {
      fade.plain();
      curtain.setFillStyle(Phaser.Display.Color.GetColor(fx.red, fx.green, fx.blue)).setAlpha(1);
      go();
      return this;
    }
    curtain.setFillStyle(COLOR);
    // Íris de caveira fechando (só se a cortina ainda estiver aberta; senão, o escurecer simples).
    if (curtain.alpha < 0.02 && fade.themed()) {
      const iris = fade.iris!;
      fade.irisOn = true;
      iris.setScale(fade.irisOpen()).setAngle(0);
      curtain.setAlpha(1);
      fade.tweens.add({ targets: iris, scale: 0.0001, angle: 25, duration: OUT_MS * 1.9, ease: 'Cubic.easeOut', onComplete: go });
      return this;
    }
    fade.plain();
    fade.tweens.add({ targets: curtain, alpha: 1, duration: OUT_MS * (1 - curtain.alpha), ease: 'Sine.easeIn', onComplete: go });
    return this;
  };
}
