import Phaser from 'phaser';
import { GRAVITY, H, W } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0e1a2b',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY }, debug: false } },
  input: { gamepad: true },
  scene: [BootScene, MenuScene, GameScene],
});

// Acesso para testes automatizados.
(window as unknown as { __skullshift: Phaser.Game }).__skullshift = game;
