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
export const DEATH_Y = 508;

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

/** Fonte do jogo: Anak Manja (com acentos do português) e reserva para setas e símbolos. */
export const FONT = '"Anak Manja PT", "Arial Black", "Arial Bold", Arial, sans-serif';
/** Fonte das instruções (textos explicativos, legendas, avisos): Matcha Style. */
export const BODY_FONT = '"Matcha Style", "Trebuchet MS", Arial, sans-serif';

/** Mostra os controles na tela: aparelho com toque, ou ?touch=1 na URL (para testar no PC). */
export function wantsTouchControls(): boolean {
  try {
    if (new URLSearchParams(location.search).get('touch') === '1') return true;
  } catch {
    /* sem URL */
  }
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

/**
 * Tamanho do canvas. Deitado: 1280x720. Em pé: 1280 de largura e altura proporcional à tela,
 * com o mundo numa faixa no meio (com zoom) e os botões de toque embaixo.
 */
export const VIEW = { portrait: false, w: 1280, h: 720 };

/** Faixas do layout em pé (coordenadas do canvas). */
export const PORTRAIT = {
  hudH: 250, // topo: avatares, cenários, menu (inclui a folga do topo)
  /** Folga no topo para a barra do sistema/app não cobrir o HUD. */
  topPad: 0,
  worldH: 1300, // faixa do mundo (ajustada à altura da tela)
  zoom: 1.9, // mundo visível: ~674 px de largura
};

export function computeView(): { portrait: boolean; h: number } {
  const iw = Math.max(1, window.innerWidth);
  const ih = Math.max(1, window.innerHeight);
  const portrait = ih > iw * 1.1;
  const h = portrait ? Math.round(Math.min(2900, Math.max(1700, (1280 * ih) / iw))) : 720;
  // Folga no topo: área segura do aparelho (notch, barra de status) + uma margem para a barra do app.
  if (portrait) {
    let inset = 0;
    try {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';
      document.body.appendChild(probe);
      inset = probe.offsetHeight;
      probe.remove();
    } catch {
      /* sem suporte */
    }
    PORTRAIT.topPad = Math.round((inset + 36) * (1280 / iw));
  } else PORTRAIT.topPad = 0;
  PORTRAIT.hudH = 250 + PORTRAIT.topPad;
  // O resto da altura fica para os botões (no mínimo ~700 px).
  PORTRAIT.worldH = Math.round(Math.min(1500, Math.max(900, h - PORTRAIT.hudH - 700)));
  PORTRAIT.zoom = PORTRAIT.worldH / 680;
  return { portrait, h };
}

/** Topo da área dos botões (em pé). */
export function portraitPanelTop(): number {
  return PORTRAIT.hudH + PORTRAIT.worldH;
}
