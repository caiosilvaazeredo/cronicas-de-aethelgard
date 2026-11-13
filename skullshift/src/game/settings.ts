import Phaser from 'phaser';
import { PLAYER_HEX, PLAYER_TINT } from '../ui/devices';

/**
 * Configurações do jogo (salvas no navegador). Cada opção tem efeito de verdade:
 * texto da visual novel, falas, tremor/clarões da câmera, tela cheia, brilho, volumes dos
 * efeitos sonoros, corrida com toque duplo, botões de toque e cores para daltonismo.
 */
export interface Settings {
  /** 0 lento · 1 normal · 2 rápido · 3 instantâneo */
  textSpeed: number;
  quips: boolean;
  /** Tremor da tela, 0 a 10 (10 = 100%). */
  shake: number;
  flashes: boolean;
  /** Brilho 5 a 15 (10 = 100%). */
  brightness: number;
  master: number;
  sfx: number;
  /** Volume da música, 0 a 10. */
  music: number;
  doubleTapSprint: boolean;
  /** Tamanho dos botões de toque: 0 pequeno · 1 médio · 2 grande */
  touchSize: number;
  /** Opacidade dos botões de toque, 2 a 10. */
  touchOpacity: number;
  colorblind: boolean;
}

export const DEFAULTS: Settings = {
  textSpeed: 1,
  quips: true,
  shake: 10,
  flashes: true,
  brightness: 10,
  master: 8,
  sfx: 8,
  music: 6,
  doubleTapSprint: true,
  touchSize: 1,
  touchOpacity: 10,
  colorblind: false,
};

const KEY = 'skullshift.settings.v1';
let current: Settings = load();

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* sem armazenamento */
  }
  return { ...DEFAULTS };
}

export function settings(): Settings {
  return current;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...current, [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* vale só nesta sessão */
  }
  applySettings();
}

export function resetSettings(): void {
  current = { ...DEFAULTS };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* vale só nesta sessão */
  }
  applySettings();
}

/** Milissegundos por letra na visual novel. */
export function typeDelay(): number {
  return [45, 22, 10, 0][current.textSpeed] ?? 22;
}

let patched = false;

/** Aplica o que é global: brilho do canvas, cores dos jogadores e o filtro de tremor/clarões. */
export function applySettings(): void {
  const canvas = document.querySelector('#game canvas') as HTMLCanvasElement | null;
  if (canvas) canvas.style.filter = current.brightness === 10 ? '' : `brightness(${current.brightness / 10})`;
  // Daltonismo: P2 laranja em vez de vermelho (azul × laranja se distinguem melhor).
  PLAYER_TINT[1] = current.colorblind ? 0xff9f1c : 0xe5463a;
  PLAYER_HEX[1] = current.colorblind ? '#ff9f1c' : '#e5463a';
  if (!patched) {
    patched = true;
    const proto = Phaser.Cameras.Scene2D.Camera.prototype;
    const shake = proto.shake;
    proto.shake = function (this: Phaser.Cameras.Scene2D.Camera, duration?: number, intensity?: number | Phaser.Math.Vector2, ...rest: unknown[]) {
      const k = current.shake / 10;
      if (k <= 0) return this;
      const i = typeof intensity === 'number' ? intensity * k : intensity;
      return (shake as (...a: unknown[]) => Phaser.Cameras.Scene2D.Camera).call(this, duration, i, ...rest);
    } as typeof proto.shake;
    const flash = proto.flash;
    proto.flash = function (this: Phaser.Cameras.Scene2D.Camera, ...args: unknown[]) {
      if (!current.flashes) return this;
      return (flash as (...a: unknown[]) => Phaser.Cameras.Scene2D.Camera).apply(this, args);
    } as typeof proto.flash;
  }
}

// ------------------------------------------------------------------
// Efeitos sonoros 8-bit (sintetizados na hora, sem arquivos de áudio)
// ------------------------------------------------------------------

let ctx: AudioContext | null = null;

/** Contexto de áudio compartilhado (efeitos e música). */
export function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export type Sfx = 'jump' | 'attack' | 'hit' | 'death' | 'pick' | 'door' | 'boom' | 'select' | 'boss';

/** Toca um efeito curto de chiptune (onda quadrada/ruído), no volume das configurações. */
export function sfx(kind: Sfx): void {
  const vol = (current.master / 10) * (current.sfx / 10);
  if (vol <= 0) return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  const t = a.currentTime;
  const gain = a.createGain();
  gain.connect(a.destination);
  const tone = (type: OscillatorType, f0: number, f1: number, dur: number, v = 0.12) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(v * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(gain);
    o.start(t);
    o.stop(t + dur);
  };
  const noise = (dur: number, v = 0.2) => {
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.setValueAtTime(v * vol, t);
    src.connect(g).connect(gain);
    src.start(t);
  };
  switch (kind) {
    case 'jump':
      tone('square', 330, 660, 0.12, 0.08);
      break;
    case 'attack':
      noise(0.08, 0.12);
      tone('square', 220, 110, 0.08, 0.06);
      break;
    case 'hit':
      tone('square', 520, 140, 0.15, 0.12);
      break;
    case 'death':
      tone('square', 440, 60, 0.5, 0.12);
      break;
    case 'pick':
      tone('square', 660, 1320, 0.18, 0.08);
      break;
    case 'door':
      tone('triangle', 180, 90, 0.3, 0.15);
      break;
    case 'boom':
      noise(0.35, 0.3);
      tone('square', 120, 40, 0.3, 0.1);
      break;
    case 'boss':
      tone('sawtooth', 110, 55, 0.6, 0.1);
      break;
    case 'select':
      tone('square', 880, 880, 0.05, 0.06);
      break;
  }
}
