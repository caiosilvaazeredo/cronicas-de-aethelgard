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
