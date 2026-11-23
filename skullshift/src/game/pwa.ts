import { isDesktop } from './platform';

/**
 * PWA: registra o service worker (jogo offline) e guarda o pedido de instalação do navegador
 * (Android/Chrome/Edge), para o menu mostrar o botão "INSTALAR". No iPhone não há pedido: a
 * instalação é pelo Compartilhar → "Adicionar à Tela de Início", e o menu mostra essa dica.
 */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function initPwa(): void {
  if (isDesktop()) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || (location.protocol !== 'https:' && location.hostname !== 'localhost')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

/** Já está aberto como app instalado (sem barra do navegador)? */
export function isInstalled(): boolean {
  try {
    return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export const canInstall = (): boolean => !!deferred && !isInstalled();

/** iPhone/iPad no Safari, fora do app instalado: só dá para instalar pelo menu Compartilhar. */
export function iosHint(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && !isInstalled() && !isDesktop();
}

export async function install(): Promise<boolean> {
  if (!deferred) return false;
  const d = deferred;
  deferred = null;
  await d.prompt();
  const r = await d.userChoice;
  listeners.forEach((f) => f());
  return r.outcome === 'accepted';
}

/** Chamado quando o botão de instalar deve aparecer/sumir. Devolve como cancelar. */
export function onInstallChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
