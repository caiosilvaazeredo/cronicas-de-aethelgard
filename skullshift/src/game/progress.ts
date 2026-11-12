/**
 * Progresso do modo história: quantas fases já foram concluídas.
 * Fica no navegador de quem joga (localStorage); sem ele, começa do zero.
 */
const KEY = 'skullshift.progress.v1';
/** Reserva em memória, caso o navegador não deixe salvar. */
let memory = 0;

export function completedCount(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY) ?? '0');
    return Math.max(memory, Number.isFinite(n) ? Math.max(0, n) : 0);
  } catch {
    return memory;
  }
}

/** Marca a fase como concluída (libera a seguinte). */
export function completeLevel(index: number): void {
  const n = Math.max(completedCount(), index + 1);
  memory = n;
  try {
    window.localStorage.setItem(KEY, String(n));
  } catch {
    /* sem armazenamento: o progresso vale só nesta sessão */
  }
}

/** Falas que só aparecem uma vez (primeira transformação, primeira vez em cada forma). */
const SEEN_KEY = 'skullshift.seen.v1';
let seenMemory = new Set<string>();

function loadSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (raw) for (const k of JSON.parse(raw) as string[]) seenMemory.add(k);
  } catch {
    /* sem armazenamento */
  }
  return seenMemory;
}

export function hasSeen(key: string): boolean {
  return loadSeen().has(key);
}

export function markSeen(key: string): void {
  seenMemory = loadSeen();
  seenMemory.add(key);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seenMemory]));
  } catch {
    /* vale só nesta sessão */
  }
}

/** Dificuldade do modo história. Normal: até 5 mortes por fase. Difícil: na 3ª, a fase recomeça. */
export type Difficulty = 'normal' | 'hard';
const DIFF_KEY = 'skullshift.difficulty.v1';
let diffMemory: Difficulty = 'normal';

export function getDifficulty(): Difficulty {
  try {
    const v = window.localStorage.getItem(DIFF_KEY);
    if (v === 'normal' || v === 'hard') diffMemory = v;
  } catch {
    /* reserva em memória */
  }
  return diffMemory;
}

export function setDifficulty(d: Difficulty): void {
  diffMemory = d;
  try {
    window.localStorage.setItem(DIFF_KEY, d);
  } catch {
    /* vale só nesta sessão */
  }
}

/**
 * Quantas mortes a fase aguenta antes de recomeçar do início (Infinity = vidas infinitas).
 * A fase 1 é de aprendizado: nunca recomeça.
 */
export function deathLimit(level: number, d: Difficulty = getDifficulty()): number {
  if (level === 0) return Infinity;
  return d === 'hard' ? 3 : 6; // normal: "morreu mais de 5 vezes" = na 6ª
}
