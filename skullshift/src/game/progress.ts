import { LEVELS } from './level';

/**
 * Progresso do modo história, em vários saves (slots). Cada save guarda: fases concluídas,
 * dificuldade, falas já vistas e a data do último jogo. Fica no navegador de quem joga
 * (localStorage); sem ele, vale só enquanto a página estiver aberta.
 *
 * Modo livre (temporário, para testes): todas as fases abertas, vidas infinitas e nada salvo.
 */

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SaveData {
  /** Quantas fases principais foram concluídas (para a tela de saves). */
  completed: number;
  /** Fases concluídas (ids). O mundo é dividido em áreas e a ordem é livre entre elas. */
  done?: string[];
  difficulty: Difficulty;
  seen: string[];
  /** Presentes pegos por fase (id da fase → índices 0..2). */
  gifts?: Record<string, number[]>;
  /** Segredos achados (ex.: 'retro' = rolo de filme da fase em preto e branco). */
  secrets?: string[];
  /** Fases secretas concluídas. */
  secretDone?: string[];
  /** Acordo feito na luta dos Príncipes: quem voa com a caveira. */
  pact?: 'bat' | 'bee';
  /** Final visto: 'free' (enfrentou e venceu o Xamã) ou 'home' (voltou para casa com ele). */
  ending?: 'free' | 'home';
  /** Item guardado na caixa de reserva (como no Mario), entre fases. */
  reserve?: string;
  /** Ouro para gastar no Empório e aprimoramentos comprados. */
  coins?: number;
  upgrades?: string[];
  /** Contadores (golpes, contras, transformações...) e conquistas desbloqueadas. */
  stats?: Record<string, number>;
  ach?: string[];
  /** Data do último jogo (ms). */
  updated: number;
}

export const SLOT_COUNT = 3;
const SLOT_KEY = 'skullshift.slot';
const saveKey = (n: number) => `skullshift.save.${n}`;
const TOTAL_LEVELS = LEVELS.filter((l) => !l.secret).length;

/** Reserva em memória, caso o navegador não deixe salvar. */
const memory = new Map<string, string>();
function read(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    /* sem armazenamento */
  }
  return memory.get(key) ?? null;
}
function write(key: string, value: string | null): void {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* vale só nesta sessão */
  }
}

/** Saves antigos (antes dos slots) viram o save 1. */
function migrate(): void {
  if (read(saveKey(1)) !== null) return;
  const old = read('skullshift.progress.v1');
  if (old === null) return;
  let seen: string[] = [];
  try {
    seen = JSON.parse(read('skullshift.seen.v1') ?? '[]') as string[];
  } catch {
    /* ignora */
  }
  const diff = read('skullshift.difficulty.v1') === 'hard' ? 'hard' : 'normal';
  write(saveKey(1), JSON.stringify({ completed: Number(old) || 0, difficulty: diff, seen, updated: Date.now() } satisfies SaveData));
}

export function loadSlot(n: number): SaveData | null {
  migrate();
  const raw = read(saveKey(n));
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    const completed = Math.max(0, Math.min(LEVELS.filter((l) => !l.secret).length, Number(d.completed) || 0));
    // Saves antigos (antes das áreas): as N primeiras fases da lista contam como concluídas.
    const done = Array.isArray(d.done) ? d.done : LEVELS.filter((l) => !l.secret).slice(0, completed).map((l) => l.id);
    return {
      completed: done.length,
      done,
      difficulty: d.difficulty === 'hard' || d.difficulty === 'easy' ? d.difficulty : 'normal',
      seen: Array.isArray(d.seen) ? d.seen : [],
      gifts: d.gifts && typeof d.gifts === 'object' ? d.gifts : {},
      secrets: Array.isArray(d.secrets) ? d.secrets : [],
      secretDone: Array.isArray(d.secretDone) ? d.secretDone : [],
      pact: d.pact === 'bat' || d.pact === 'bee' ? d.pact : undefined,
      ending: d.ending === 'free' || d.ending === 'home' ? d.ending : undefined,
      reserve: typeof d.reserve === 'string' ? d.reserve : undefined,
      coins: Math.max(0, Number(d.coins) || 0),
      upgrades: Array.isArray(d.upgrades) ? d.upgrades : [],
      stats: d.stats && typeof d.stats === 'object' ? d.stats : {},
      ach: Array.isArray(d.ach) ? d.ach : [],
      updated: Number(d.updated) || 0,
    };
  } catch {
    return null;
  }
}

function saveSlot(n: number, d: SaveData): void {
  write(saveKey(n), JSON.stringify({ ...d, updated: Date.now() }));
}

export function deleteSlot(n: number): void {
  write(saveKey(n), null);
}

/** Começa um jogo novo no save n (apaga o que havia). */
export function newSlot(n: number, difficulty: Difficulty): void {
  saveSlot(n, { completed: 0, difficulty, seen: [], updated: Date.now() });
  useSlot(n);
}

export function useSlot(n: number): void {
  free = false;
  write(SLOT_KEY, String(n));
}

export function currentSlot(): number {
  const n = Number(read(SLOT_KEY));
  return n >= 1 && n <= SLOT_COUNT ? n : 1;
}

/** Save em uso (cria um vazio se ainda não houver). */
function current(): SaveData {
  if (free) return freeSave;
  return loadSlot(currentSlot()) ?? { completed: 0, difficulty: 'normal', seen: [], updated: Date.now() };
}

// ---------- modo livre ----------

let free = false;
const freeSave: SaveData = { completed: TOTAL_LEVELS - 1, difficulty: 'normal', seen: ['first-shift'], coins: 300, updated: 0 };

export function setFreePlay(on: boolean): void {
  free = on;
}

export function isFreePlay(): boolean {
  return free;
}

// ---------- consultas do jogo ----------

export function completedCount(): number {
  return current().done?.length ?? 0;
}

/** A fase (id) já foi concluída neste save? */
export function isSecretDone(id: string): boolean {
  return !!current().secretDone?.includes(id);
}

export function isDone(id: string): boolean {
  return (current().done ?? []).includes(id);
}

/** Fases principais (as secretas ficam no fim de LEVELS e não contam na sequência). */
export const MAIN_COUNT = LEVELS.filter((l) => !l.secret).length;

/** Marca a fase como concluída (libera a seguinte). No modo livre, não salva nada. */
export function completeLevel(index: number): void {
  if (free) return;
  const d = current();
  const lv = LEVELS[index];
  if (lv?.secret) d.secretDone = [...new Set([...(d.secretDone ?? []), lv.id])];
  else {
    d.done = [...new Set([...(d.done ?? []), lv.id])];
    d.completed = d.done.length;
  }
  saveSlot(currentSlot(), d);
}

/** Presentes já pegos nesta fase. */
export function giftsOf(levelId: string): number[] {
  return current().gifts?.[levelId] ?? [];
}

export function markGift(levelId: string, i: number): void {
  const d = current();
  const g = { ...(d.gifts ?? {}) };
  g[levelId] = [...new Set([...(g[levelId] ?? []), i])];
  d.gifts = g;
  if (!free) saveSlot(currentSlot(), d);
}

/** Segredos (o rolo de filme abre a fase em preto e branco). */
export function hasSecret(id: string): boolean {
  return isFreePlay() || (current().secrets ?? []).includes(id);
}

export function findSecret(id: string): void {
  const d = current();
  if ((d.secrets ?? []).includes(id)) return;
  d.secrets = [...(d.secrets ?? []), id];
  if (!free) saveSlot(currentSlot(), d);
}

/** Acordo dos Príncipes ('bat' = poupou o morcego, 'bee' = derrotou o morcego). Modo livre: morcego. */
export function getPact(): 'bat' | 'bee' {
  return current().pact ?? 'bat';
}

export function getEnding(): 'free' | 'home' | undefined {
  return current().ending;
}

export function setEnding(e: 'free' | 'home'): void {
  const d = current();
  d.ending = e;
  if (!free) saveSlot(currentSlot(), d);
}

export function getCoins(): number {
  return current().coins ?? 0;
}

/** Soma (ou gasta, se negativo) ouro. No modo livre vale só enquanto a página está aberta. */
export function addCoins(n: number): void {
  const d = current();
  d.coins = Math.max(0, (d.coins ?? 0) + n);
  if (!free) saveSlot(currentSlot(), d);
}

export function ownedUpgrades(): string[] {
  return current().upgrades ?? [];
}

export function saveUpgrade(id: string): void {
  const d = current();
  d.upgrades = [...new Set([...(d.upgrades ?? []), id])];
  if (!free) saveSlot(currentSlot(), d);
}

export function getStat(k: string): number {
  return current().stats?.[k] ?? 0;
}

/** Soma um contador (não salva no modo livre). */
export function addStat(k: string, n = 1): void {
  if (free) return;
  const d = current();
  d.stats = { ...(d.stats ?? {}), [k]: (d.stats?.[k] ?? 0) + n };
  saveSlot(currentSlot(), d);
}

export function hasAch(id: string): boolean {
  return !!current().ach?.includes(id);
}

/** Marca a conquista; devolve true se é nova. */
export function unlockAch(id: string): boolean {
  if (free || hasAch(id)) return false;
  const d = current();
  d.ach = [...(d.ach ?? []), id];
  saveSlot(currentSlot(), d);
  return true;
}

export function getReserve(): string | undefined {
  return current().reserve;
}

export function setReserve(item: string | undefined): void {
  const d = current();
  d.reserve = item;
  if (!free) saveSlot(currentSlot(), d);
}

export function hasPact(): boolean {
  return !!current().pact;
}

export function setPact(p: 'bat' | 'bee'): void {
  const d = current();
  d.pact = p;
  if (!free) saveSlot(currentSlot(), d);
}

/** Falas que só aparecem uma vez (primeira transformação, primeira vez em cada forma). */
export function hasSeen(key: string): boolean {
  return current().seen.includes(key);
}

export function markSeen(key: string): void {
  const d = current();
  if (d.seen.includes(key)) return;
  d.seen.push(key);
  if (!free) saveSlot(currentSlot(), d);
}

export function getDifficulty(): Difficulty {
  return current().difficulty;
}

/**
 * Quantas mortes a fase aguenta antes de recomeçar do início (Infinity = vidas infinitas).
 * Normal: na 6ª morte ("morreu mais de 5 vezes"). Difícil: na 3ª.
 * A fase 1 é de aprendizado e o modo livre é para testes: nunca recomeçam.
 */
export function deathLimit(level: number, d: Difficulty = getDifficulty()): number {
  if (level === 0 || free) return Infinity;
  // Vela Extra (Empório): uma vida a mais.
  // Fácil: 10 vidas · Padrão: 6 · Difícil: 3.
  return (d === 'hard' ? 3 : d === 'easy' ? 10 : 6) + (current().upgrades?.includes('candle') ? 1 : 0);
}
