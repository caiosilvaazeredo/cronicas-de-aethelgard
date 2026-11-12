// Dimensões e constantes de mundo. A fase é desenhada em 1280x720 (escala 1:1 com os sprites).
export const W = 1280;
export const H = 720;
export const TILE = 64;

/** Topo da faixa de grama (linha de tiles). */
export const GRASS_Y = 432;
/** Altura onde os pés dos personagens pisam (meio da grama, pela perspectiva do tileset). */
export const FLOOR_Y = 472;
/** Superfície da água. */
export const WATER_Y = 500;
/** Pés abaixo desta linha = caiu na água. */
export const DEATH_Y = 530;

export const GRAVITY = 1500;
export const JUMP_V = 580;
export const GUARD_WALK_SPEED = 110;

export const RESPAWN_DELAY = 1200; // ms
export const INVULN_TIME = 1200; // ms

export const DEPTH = {
  sky: 0,
  clouds: 1,
  water: 2,
  waterRocks: 3,
  terrain: 4,
  deco: 5,
  items: 8,
  fighters: 10,
  projectiles: 12,
  fx: 14,
  hud: 100,
} as const;

export const FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';

/** Mostra os controles na tela: aparelho com toque, ou ?touch=1 na URL (para testar no PC). */
export function wantsTouchControls(): boolean {
  try {
    if (new URLSearchParams(location.search).get('touch') === '1') return true;
  } catch {
    /* sem URL */
  }
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}
