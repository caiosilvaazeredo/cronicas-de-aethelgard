import Phaser from 'phaser';
import { BODY_FONT, FONT } from '../config';
import { CHARS, type CharId } from '../game/characters';
import { tipsFor, type Tip } from '../data/tips';

/**
 * Cenas curtinhas das telas de carregamento: a caveira correndo, fugindo, se transformando,
 * voando com os Príncipes, encarando um rei... Usa só as texturas carregadas primeiro
 * (PreloadScene), então serve também para o carregamento inicial.
 */

/** Texturas que a PreloadScene carrega antes de tudo. */
export const LOADING_CHARS: CharId[] = ['skull', 'gnoll', 'shark', 'goblin', 'spider', 'bat', 'bee', 'lizard', 'torchgob', 'imp', 'sgnome', 'minotaur'];

/** Criatura típica de cada área (para as cenas da tela de entrada da fase). */
const AREA_CHAR: Record<string, CharId> = {
  mare: 'shark',
  pradaria: 'gnoll',
  lagoa: 'lizard',
  teias: 'spider',
  forja: 'minotaur',
  bosque: 'sgnome',
  minas: 'torchgob',
  ceu: 'imp',
  reino: 'bat',
  centro: 'goblin',
};

/** Item que transforma em cada criatura (só os que já estão carregados no início). */
const ITEM_OF: Partial<Record<CharId, string>> = { gnoll: 'bone', shark: 'harpoon' };

type Vignette = 'chase' | 'flee' | 'transform' | 'flight' | 'king' | 'sheep' | 'parade';

function anim(scene: Phaser.Scene, tex: string, n: number, fps: number): string {
  const key = `ld_${tex}`;
  if (!scene.anims.exists(key) && scene.textures.exists(tex)) {
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(tex, { start: 0, end: n - 1 }), frameRate: fps, repeat: -1 });
  }
  return key;
}

/** Sprite de um personagem correndo (ou parado), com os pés na linha do chão. */
function actor(scene: Phaser.Scene, id: CharId, x: number, ground: number, mode: 'run' | 'idle', scale: number): Phaser.GameObjects.Sprite {
  const d = CHARS[id];
  const tex = `${id}_${mode}`;
  const a = mode === 'run' ? d.run : d.idle;
  // No carregamento inicial o Minotauro ainda não foi encolhido.
  const k = id === 'minotaur' && !scene.textures.exists('boss_mino_run') ? 0.72 : 1;
  const s = scale * k;
  return scene.add
    .sprite(x, ground - (d.feetY - d.frame / 2) * s, tex)
    .setScale(s)
    .play(anim(scene, tex, a.n, a.fps));
}

export interface LoadingShow {
  destroy(): void;
}

/**
 * Monta uma cena de carregamento centrada em (cx, ground), com 'width' de palco.
 * area: tema da fase (escolhe a criatura e o rei). king: animação do rei (tela de entrada de fase).
 */
export function loadingVignette(
  scene: Phaser.Scene,
  cx: number,
  ground: number,
  width: number,
  opts: { area?: string; king?: string; scale?: number; ground?: boolean; depth?: number } = {},
): LoadingShow {
  const scale = opts.scale ?? 0.75;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const objs: Phaser.GameObjects.GameObject[] = [];
  // Quem anda no palco só aparece dentro dele (entra e sai pelas bordas da ilha).
  const maskG = scene.make.graphics({}, false);
  maskG.fillStyle(0xffffff).fillRect(left, ground - 420, width, 440);
  const mask = maskG.createGeometryMask();
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objs.push(o);
    (o as unknown as Phaser.GameObjects.Components.Mask).setMask?.(mask);
    if (opts.depth !== undefined) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(opts.depth);
    return o;
  };
  const addFixed = <T extends Phaser.GameObjects.GameObject>(o: T): T => (objs.push(o), o);

  // Chão: uma ilhota de grama e pedra do Tiny Swords.
  if (opts.ground === false) {
    /* o palco já tem chão (tela inicial) */
  } else if (scene.textures.exists('tilemap')) {
    const n = Math.ceil(width / 64);
    for (let i = 0; i < n; i++) {
      const col = i === 0 ? 5 : i === n - 1 ? 7 : 6;
      addFixed(scene.add.image(left + i * 64, ground - 8, 'tilemap', 27 + col).setOrigin(0));
      addFixed(scene.add.image(left + i * 64, ground + 56, 'tilemap', 45 + col).setOrigin(0));
    }
  } else addFixed(scene.add.rectangle(cx, ground + 24, width, 48, 0x4f9d4a));

  const foe: CharId = (opts.area && AREA_CHAR[opts.area]) || Phaser.Utils.Array.GetRandom(['gnoll', 'shark', 'goblin', 'spider', 'lizard', 'torchgob', 'imp', 'sgnome', 'minotaur'] as CharId[]);
  const pool: Vignette[] = ['chase', 'flee', 'transform', 'flight', 'parade'];
  if (scene.textures.exists('sheep_move')) pool.push('sheep');
  if (opts.king && scene.anims.exists(opts.king)) pool.push('king', 'king');
  const kind: Vignette = Phaser.Utils.Array.GetRandom(pool);
  const tweens: Phaser.Tweens.Tween[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const tw = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => {
    const t = scene.tweens.add(cfg);
    tweens.push(t);
    return t;
  };
  const span = width + 200;
  const dur = 3600;

  // Poeirinha atrás de quem corre.
  const dust = (who: Phaser.GameObjects.Sprite, dir: number) =>
    timers.push(
      scene.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => {
          if (!who.active || who.x < left || who.x > right) return;
          const p = add(scene.add.circle(who.x - dir * 22, ground - 6, 6, 0xfff7dc, 0.7));
          tw({ targets: p, alpha: 0, scale: 2, y: ground - 16, duration: 380, onComplete: () => p.destroy() });
        },
      }),
    );

  switch (kind) {
    case 'chase': {
      // A criatura persegue a caveira.
      const sk = add(actor(scene, 'skull', left - 60, ground, 'run', scale));
      const en = add(actor(scene, foe, left - 210, ground, 'run', scale));
      tw({ targets: sk, x: `+=${span}`, duration: dur, repeat: -1 });
      tw({ targets: en, x: `+=${span}`, duration: dur, repeat: -1 });
      dust(sk, 1);
      dust(en, 1);
      break;
    }
    case 'flee': {
      // A caveira com osso na mão persegue a criatura (agora ela foge).
      const en = add(actor(scene, foe, right + 60, ground, 'run', scale).setFlipX(true));
      const sk = add(actor(scene, 'skull', right + 230, ground, 'run', scale).setFlipX(true));
      tw({ targets: en, x: `-=${span}`, duration: dur, repeat: -1 });
      tw({ targets: sk, x: `-=${span}`, duration: dur, repeat: -1 });
      const sweat = add(scene.add.text(en.x, en.y - 70, '!', { fontFamily: FONT, fontSize: '28px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5));
      scene.events.on('update', function follow() {
        if (!sweat.active) return scene.events.off('update', follow);
        sweat.setPosition(en.x, en.y - 70 * scale * 1.4 + Math.sin(scene.time.now / 120) * 4);
      });
      dust(sk, -1);
      break;
    }
    case 'transform': {
      // A caveira pega o item no meio e vira a criatura, sem parar de correr.
      const target: CharId = ITEM_OF[foe] ? foe : Phaser.Utils.Array.GetRandom(['gnoll', 'shark'] as CharId[]);
      const itemTex = ITEM_OF[target]!;
      const item = add(scene.add.sprite(cx, ground - 30, itemTex, 0).setScale(0.8));
      if (target === 'shark') item.setAngle(45);
      tw({ targets: item, y: ground - 42, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      let runner = add(actor(scene, 'skull', left - 60, ground, 'run', scale));
      const loop = () => {
        runner.destroy();
        runner = add(actor(scene, 'skull', left - 60, ground, 'run', scale));
        item.setVisible(true);
        let shifted = false;
        tw({
          targets: runner,
          x: right + 80,
          duration: dur,
          onUpdate: () => {
            if (shifted || runner.x < cx) return;
            shifted = true;
            item.setVisible(false);
            const fx = scene.textures.exists('transform') ? add(scene.add.sprite(runner.x, runner.y, 'transform').setScale(scale)) : undefined;
            if (fx) fx.play(anim(scene, 'transform', 11, 22)).once('animationrepeat', () => fx.destroy());
            const x = runner.x;
            const t = (runner.x - left + 60) / (right + 80 - left + 60);
            runner.destroy();
            runner = add(actor(scene, target, x, ground, 'run', scale));
            const rest = dur * (1 - t);
            tw({ targets: runner, x: right + 80, duration: rest, onComplete: loop });
            const pop = add(scene.add.text(x, ground - 130 * scale, CHARS[target].name.toUpperCase() + '!', { fontFamily: FONT, fontSize: '24px', color: '#ffe066', stroke: '#10223a', strokeThickness: 6 }).setOrigin(0.5));
            tw({ targets: pop, y: pop.y - 30, alpha: 0, duration: 900, onComplete: () => pop.destroy() });
          },
        });
      };
      loop();
      break;
    }
    case 'flight': {
      // Os dois Príncipes cruzando o céu; a caveira olha de baixo.
      for (const [id, dy, delay] of [['bat', -150, 0], ['bee', -100, 700]] as [CharId, number, number][]) {
        const f = add(actor(scene, id, left - 80, ground + dy, 'run', scale * 0.9));
        tw({ targets: f, x: right + 80, duration: dur, delay, repeat: -1 });
        tw({ targets: f, y: f.y - 18, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      const sk = add(actor(scene, 'skull', cx, ground, 'idle', scale));
      timers.push(scene.time.addEvent({ delay: 1800, loop: true, callback: () => sk.setFlipX(!sk.flipX) }));
      break;
    }
    case 'parade': {
      // Desfile: várias criaturas em fila, a caveira no fim tentando acompanhar.
      const line: CharId[] = Phaser.Utils.Array.Shuffle(['gnoll', 'goblin', 'lizard', 'sgnome', 'torchgob', 'imp'] as CharId[]).slice(0, 3);
      [...line, 'skull' as CharId].forEach((id, i) => {
        const f = add(actor(scene, id, left - 60 - i * 120, ground, 'run', scale * 0.85));
        tw({ targets: f, x: `+=${span + 360}`, duration: dur * 1.4, repeat: -1 });
      });
      break;
    }
    case 'sheep': {
      // Ovelha fugindo, caveira atrás (e tropeçando).
      const sh = add(scene.add.sprite(left - 60, ground - 34, 'sheep_move').setScale(scale).play(anim(scene, 'sheep_move', 4, 10)));
      const sk = add(actor(scene, 'skull', left - 200, ground, 'run', scale));
      tw({ targets: sh, x: `+=${span}`, duration: dur * 1.1, repeat: -1 });
      tw({ targets: sh, y: sh.y - 14, duration: 180, yoyo: true, repeat: -1 });
      tw({ targets: sk, x: `+=${span}`, duration: dur * 1.1, repeat: -1 });
      dust(sk, 1);
      break;
    }
    case 'king': {
      // O rei da área esperando; a caveira chega, para e o encara.
      const king = add(scene.add.sprite(right - 120, ground, opts.king!.replace(/_idle$/, '_idle')).play(opts.king!));
      const fh = king.frame.height;
      king.setOrigin(0.5, 0.78).setScale(Math.min(1.1, (190 / fh) * 1.4) * scale * 1.2).setFlipX(true);
      const sk = add(actor(scene, 'skull', left - 60, ground, 'run', scale));
      tw({
        targets: sk,
        x: cx - 40,
        duration: 1700,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (!sk.active) return;
          sk.play(anim(scene, 'skull_idle', CHARS.skull.idle.n, CHARS.skull.idle.fps));
          const bang = add(scene.add.text(sk.x, sk.y - 80, '!', { fontFamily: FONT, fontSize: '40px', color: '#ffe066', stroke: '#10223a', strokeThickness: 8 }).setOrigin(0.5).setScale(0));
          tw({ targets: bang, scale: 1, duration: 260, ease: 'Back.easeOut' });
        },
      });
      dust(sk, 1);
      break;
    }
  }

  return {
    destroy: () => {
      tweens.forEach((t) => t.remove());
      timers.forEach((t) => t.remove());
      objs.forEach((o) => o.active && o.destroy());
      maskG.destroy();
    },
  };
}

/** Cartão com dica/curiosidade/boato, trocando sozinho a cada alguns segundos. */
export function tipCard(scene: Phaser.Scene, cx: number, cy: number, width: number, area?: string, size = 1): { next(): void; destroy(): void } {
  const tips = tipsFor(area);
  let i = 0;
  const h = 120 * size;
  const bg = scene.add.rectangle(cx, cy, width, h, 0x10223a, 0.85).setStrokeStyle(4 * size, 0xfff7dc, 0.8);
  const chip = scene.add.text(cx - width / 2 + 18 * size, cy - h / 2, '', { fontFamily: FONT, fontSize: `${20 * size}px`, color: '#10223a', padding: { x: 12 * size, y: 4 * size } }).setOrigin(0, 0.5);
  const text = scene.add
    .text(cx, cy + 8 * size, '', { fontFamily: BODY_FONT, fontSize: `${23 * size}px`, color: '#fff7dc', align: 'center', wordWrap: { width: width - 60 * size } })
    .setOrigin(0.5);
  const COLORS: Record<Tip['kind'], string> = { DICA: '#ffe066', CURIOSIDADE: '#9fe8ff', BOATO: '#d8b8ff' };
  const show = () => {
    const t = tips[i % tips.length];
    chip.setText(t.kind).setBackgroundColor(COLORS[t.kind]);
    text.setText(t.text).setAlpha(0);
    scene.tweens.add({ targets: text, alpha: 1, duration: 300 });
    i++;
  };
  show();
  const timer = scene.time.addEvent({ delay: 4200, loop: true, callback: show });
  return {
    next: show,
    destroy: () => {
      timer.remove();
      [bg, chip, text].forEach((o) => o.destroy());
    },
  };
}
