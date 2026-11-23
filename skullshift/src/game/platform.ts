/**
 * Ponte com a versão de computador (Electron + Steamworks, pasta `desktop/`).
 *
 * O `preload.cjs` do Electron expõe `window.skullshiftSteam`. No navegador ela não existe e
 * tudo aqui vira "não faz nada": o mesmo build roda na web, no celular (PWA) e na Steam.
 */
export interface DesktopBridge {
  /** Nome da conta Steam (quando a Steam está aberta). */
  personaName?: string;
  /** Destrava uma conquista na Steam pelo nome de API (ex.: `ACH_WAKE`). */
  activateAchievement?: (api: string) => void;
  /** Muda o tamanho da janela (fora da tela cheia). */
  setResolution?: (w: number, h: number) => void;
  /** Fecha o jogo. */
  quit?: () => void;
}

export function desktop(): DesktopBridge | null {
  return (window as unknown as { skullshiftSteam?: DesktopBridge }).skullshiftSteam ?? null;
}

/** Rodando como app de computador (Electron), com ou sem Steam. */
export const isDesktop = (): boolean => !!desktop();

/** Nome de API da conquista na Steam (o mesmo que vai no painel do Steamworks). */
export const steamAchId = (id: string): string => `ACH_${id.toUpperCase()}`;

/** Avisa a Steam de uma conquista ganha (sem Steam, nada acontece). */
export function steamAchievement(id: string): void {
  try {
    desktop()?.activateAchievement?.(steamAchId(id));
  } catch {
    /* Steam fechada */
  }
}

/** Resoluções da janela no computador (a primeira é "a atual": não mexe). */
export const RESOLUTIONS: Array<[number, number]> = [
  [0, 0],
  [1280, 720],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
];

export function applyResolution(i: number): void {
  const r = RESOLUTIONS[i];
  if (!r || !r[0]) return;
  try {
    desktop()?.setResolution?.(r[0], r[1]);
  } catch {
    /* sem janela */
  }
}

export function quitGame(): void {
  desktop()?.quit?.();
}
