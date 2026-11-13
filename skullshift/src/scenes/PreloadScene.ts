import Phaser from 'phaser';
import { CHARS } from '../game/characters';
import { LOADING_CHARS } from '../ui/loading';

/**
 * Carrega primeiro só o necessário para a animação do carregamento (caveira, algumas criaturas,
 * chão e ovelha). Depois a BootScene carrega o resto mostrando essa animação.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload(): void {
    this.load.setPath('assets');
    for (const id of LOADING_CHARS) {
      const fs = { frameWidth: CHARS[id].frame, frameHeight: CHARS[id].frame };
      this.load.spritesheet(`${id}_run`, `chars/${id}_run.png`, fs);
    }
    const fs = { frameWidth: 192, frameHeight: 192 };
    this.load.spritesheet('skull_idle', 'chars/skull_idle.png', fs);
    this.load.spritesheet('tilemap', 'terrain/tilemap.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('sheep_move', 'res/sheep_move.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('bone', 'chars/bone.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('harpoon', 'chars/harpoon.png');
    this.load.spritesheet('transform', 'fx/transform.png', fs);
  }

  create(): void {
    this.scene.start('boot');
  }
}
