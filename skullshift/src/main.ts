import Phaser from 'phaser';
import { GRAVITY, VIEW, W, computeView } from './config';
import { BootScene } from './scenes/BootScene';
import { ControlsScene } from './scenes/ControlsScene';
import { GameScene } from './scenes/GameScene';
import { HowToScene } from './scenes/HowToScene';
import { MenuScene } from './scenes/MenuScene';
import { UIScene } from './scenes/UIScene';
import { MapScene } from './scenes/MapScene';
import { StoryScene } from './scenes/StoryScene';
import { SlotsScene } from './scenes/SlotsScene';

Object.assign(VIEW, computeView());

/** Carrega a fonte antes de desenhar qualquer texto (sem ela, usa a reserva). */
async function loadFace(family: string, url: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const face = new FontFace(family, await res.arrayBuffer());
    await face.load();
    (document.fonts as unknown as { add(f: FontFace): void }).add(face);
  } catch {
    /* fonte reserva */
  }
}
async function loadFont(): Promise<void> {
  await Promise.all([
    loadFace('Anak Manja PT', './fonts/anak-manja-pt.ttf'),
    loadFace('Matcha Style', './fonts/matcha-style.ttf'),
  ]);
}
let game: Phaser.Game;

function boot(): void {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: VIEW.h,
    backgroundColor: '#0e1a2b',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY }, debug: false } },
    input: { gamepad: true, activePointers: 5 },
    scene: [BootScene, MenuScene, SlotsScene, ControlsScene, HowToScene, MapScene, StoryScene, GameScene, UIScene],
  });
  (window as unknown as { __skullshift: Phaser.Game }).__skullshift = game;
}
loadFont().finally(boot);

/**
 * Celular girou (ou a janela mudou de formato): troca o tamanho do canvas e reorganiza.
 * Menus são redesenhados; a partida continua, só a câmera e a interface mudam.
 */
let timer = 0;
function onResize(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (!game) return;
    const v = computeView();
    if (v.portrait === VIEW.portrait && Math.abs(v.h - VIEW.h) < 60) return;
    Object.assign(VIEW, v);
    game.scale.setGameSize(W, VIEW.h);
    for (const s of game.scene.getScenes(true)) {
      const key = s.scene.key;
      if (key === 'game') (s as GameScene).relayout();
      else if (key === 'menu' || key === 'slots' || key === 'controls' || key === 'howto' || key === 'map' || key === 'vn') {
        s.scene.restart((s as unknown as { lastData?: object }).lastData);
      }
    }
  }, 150);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

