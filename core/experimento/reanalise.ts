/**
 * Reaplica a detecção sobre os eventos exportados de uma sessão com outro
 * limiar de estabilidade k, dia a dia, como se a sessão tivesse rodado com
 * ele. Usa o próprio services/arcos.ts, para que a análise nunca divirja da
 * lógica de detecção.
 *
 * Semântica igual à do motor: toda trama que fica estável num dia é narrada
 * pelo curador e passa a 'fechada' daí em diante. Com o mesmo k da geração,
 * reproduz exatamente as métricas gravadas (há teste para isso).
 */

import { construirArestas, detectarArcos } from '../../services/arcos';
import type { MetricaConvergencia, StoryEvent, Trama } from '../../types';
import { atualizarLinhagem, linhagemVazia, mapaDeTramas, type Linhagem } from '../../services/linhagem';

export interface ResultadoReanalise {
  k: number;
  metricas: MetricaConvergencia[];
  tramas: Trama[];
  linhagem: Linhagem;
}

export function reanalisar(eventos: StoryEvent[], dias: number, k: number): ResultadoReanalise {
  const limpos = eventos.map((e) => ({ ...e, tramaId: null, ehKernel: false }));
  let tramas: Trama[] = [];
  const metricas: MetricaConvergencia[] = [];
  let linhagem = linhagemVazia();
  let anotados: StoryEvent[] = [];
  for (let d = 1; d <= dias; d++) {
    const ate = limpos.filter((e) => e.turno <= d);
    const antes = mapaDeTramas(anotados);
    const r = detectarArcos(ate, d, tramas, k);
    metricas.push(r.metrica);
    linhagem = atualizarLinhagem(linhagem, d, antes, r.eventos, r.tramas);
    anotados = r.eventos;
    tramas = r.tramas.map((t) => (t.status === 'estavel' ? { ...t, status: 'fechada' as const } : t));
  }
  return { k, metricas, tramas, linhagem };
}

/** Referências em causadoPor que não viraram aresta (id inexistente, futuro, repetido ou o próprio evento). */
export function contarDescartes(eventos: StoryEvent[]): { referencias: number; arestas: number; descartadas: number } {
  const referencias = eventos.reduce((n, e) => n + (e.causadoPor?.length ?? 0), 0);
  const { total } = construirArestas(eventos);
  return { referencias, arestas: total, descartadas: referencias - total };
}
