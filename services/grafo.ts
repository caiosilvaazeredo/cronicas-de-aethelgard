/**
 * Análises de grafo sobre o registro causal, complementares ao arcos.ts.
 *
 * Nada aqui altera o comportamento de services/arcos.ts: as variantes de
 * detecção apenas filtram as ligações causadoPor ANTES de chamar
 * detectarArcos, e a detecção de referência continua sendo a completa.
 *
 *  - pontes e pontos de articulação (Tarjan) do grafo não dirigido dos
 *    eventos ligados: um ponto de articulação é um evento que, sozinho,
 *    mantém duas partes da história unidas; uma ponte é uma ligação com a
 *    mesma propriedade;
 *  - "pontes de fusão": pontes cujos dois lados têm ao menos `minLado`
 *    eventos, isto é, uma única ligação unindo duas linhas substanciais
 *    (cadeias simples são feitas só de pontes, por isso o tamanho mínimo);
 *  - janela temporal: ligações que atravessam mais de N dias viram "ecos"
 *    (continuam registradas, mas não unem tramas);
 *  - ligações tipadas: filtrar por força mínima e por tipo;
 *  - redução transitiva: remove A→C quando já existe outro caminho A→…→C
 *    (a ligação direta é redundante para a conectividade causal);
 *  - comunidades (Louvain): remove as ligações entre comunidades, de modo que
 *    grupos densos unidos por poucas ligações contem como tramas distintas.
 */

import { construirArestas } from './arcos';
import type { StoryEvent } from '../types';

export type TipoLigacao = 'motivou' | 'possibilitou' | 'reagiu' | 'lembrou';

export interface LigacaoTipada {
  id: string;
  tipo: TipoLigacao;
  forca: number; // 1 fraca, 2 média, 3 forte
}

/** Evento que pode trazer a descrição tipada das suas ligações. */
export type EventoGrafo = StoryEvent & { ligacoes?: LigacaoTipada[] };

export interface OpcoesFiltro {
  /** ligações que atravessam mais dias que isto viram eco (não unem tramas) */
  janelaMaxDias?: number;
  /** força mínima (só vale para eventos com ligações tipadas) */
  forcaMin?: number;
  /** tipos ignorados na detecção (só para eventos com ligações tipadas) */
  excluirTipos?: TipoLigacao[];
  /** remove pontes cujos dois lados têm ao menos minLado eventos */
  removerPontesDeFusao?: { minLado: number };
  /** remove ligações redundantes (há outro caminho entre as mesmas pontas) */
  reducaoTransitiva?: boolean;
  /** remove ligações entre comunidades de Louvain (resolução padrão 1) */
  cortarEntreComunidades?: { resolucao?: number };
}

export interface LigacaoRemovida {
  origem: string;
  destino: string;
  motivo: 'janela' | 'forca' | 'tipo' | 'ponte-de-fusao' | 'transitiva' | 'entre-comunidades';
}

export const VARIANTES_DETECCAO: Record<string, OpcoesFiltro> = {
  completo: {},
  janela3: { janelaMaxDias: 3 },
  fortes: { forcaMin: 2, excluirTipos: ['lembrou'] },
  'fortes-janela3': { forcaMin: 2, excluirTipos: ['lembrou'], janelaMaxDias: 3 },
  'sem-pontes-de-fusao': { removerPontesDeFusao: { minLado: 3 } },
  'reducao-transitiva': { reducaoTransitiva: true },
  comunidades: { cortarEntreComunidades: {} },
};

// ------------------------------------------------------------ pontes e articulações

export interface PonteInfo {
  a: string; // origem (evento mais antigo)
  b: string; // destino
  ladoA: number; // eventos do lado de a ao remover a ponte
  ladoB: number;
}

export interface ResultadoPontes {
  pontes: PonteInfo[];
  articulacoes: string[];
}

/**
 * Pontes e pontos de articulação do grafo não dirigido formado pelas
 * ligações válidas (as mesmas que construirArestas aceita). Busca em
 * profundidade iterativa (Tarjan), sem risco de estourar a pilha.
 */
export function pontesEArticulacoes(eventos: StoryEvent[]): ResultadoPontes {
  const { entrada } = construirArestas(eventos);
  const vizinhos = new Map<string, string[]>();
  eventos.forEach((e) => vizinhos.set(e.id, []));
  const turno = new Map(eventos.map((e) => [e.id, e.turno]));
  entrada.forEach((origens, destino) => {
    origens.forEach((o) => {
      vizinhos.get(destino)!.push(o);
      vizinhos.get(o)!.push(destino);
    });
  });

  const ordem = new Map<string, number>();
  const baixo = new Map<string, number>();
  const tamanho = new Map<string, number>(); // tamanho da subárvore da DFS
  const pontes: PonteInfo[] = [];
  const articulacoes = new Set<string>();
  let contador = 0;

  for (const raiz of eventos.map((e) => e.id)) {
    if (ordem.has(raiz) || vizinhos.get(raiz)!.length === 0) continue;
    // componente: para saber o tamanho do outro lado de cada ponte
    const pilha: { v: string; pai: string | null; i: number; filhos: number }[] = [{ v: raiz, pai: null, i: 0, filhos: 0 }];
    ordem.set(raiz, contador);
    baixo.set(raiz, contador);
    tamanho.set(raiz, 1);
    contador += 1;
    const visitadosNoComponente: string[] = [raiz];
    const pontesDoComponente: { pai: string; filho: string }[] = [];

    while (pilha.length > 0) {
      const topo = pilha[pilha.length - 1];
      const viz = vizinhos.get(topo.v)!;
      if (topo.i < viz.length) {
        const w = viz[topo.i++];
        if (w === topo.pai) continue;
        if (ordem.has(w)) {
          baixo.set(topo.v, Math.min(baixo.get(topo.v)!, ordem.get(w)!));
        } else {
          ordem.set(w, contador);
          baixo.set(w, contador);
          tamanho.set(w, 1);
          contador += 1;
          topo.filhos += 1;
          visitadosNoComponente.push(w);
          pilha.push({ v: w, pai: topo.v, i: 0, filhos: 0 });
        }
      } else {
        pilha.pop();
        if (topo.pai !== null) {
          const pai = topo.pai;
          baixo.set(pai, Math.min(baixo.get(pai)!, baixo.get(topo.v)!));
          tamanho.set(pai, tamanho.get(pai)! + tamanho.get(topo.v)!);
          if (baixo.get(topo.v)! > ordem.get(pai)!) pontesDoComponente.push({ pai, filho: topo.v });
          const paiEhRaiz = pilha.length === 1 && pilha[0].v === pai;
          if (!paiEhRaiz && baixo.get(topo.v)! >= ordem.get(pai)!) articulacoes.add(pai);
        } else if (topo.filhos > 1) {
          articulacoes.add(topo.v);
        }
      }
    }

    const total = visitadosNoComponente.length;
    pontesDoComponente.forEach(({ pai, filho }) => {
      const ladoFilho = tamanho.get(filho)!;
      const [a, b] = turno.get(pai)! <= turno.get(filho)! ? [pai, filho] : [filho, pai];
      pontes.push({ a, b, ladoA: a === pai ? total - ladoFilho : ladoFilho, ladoB: b === pai ? total - ladoFilho : ladoFilho });
    });
  }

  return {
    pontes: pontes.sort((x, y) => (x.a + x.b).localeCompare(y.a + y.b)),
    articulacoes: [...articulacoes].sort(),
  };
}

/** Pontes que unem duas partes com ao menos `minLado` eventos cada. */
export function pontesDeFusao(eventos: StoryEvent[], minLado: number): PonteInfo[] {
  return pontesEArticulacoes(eventos).pontes.filter((p) => p.ladoA >= minLado && p.ladoB >= minLado);
}

// ------------------------------------------------------------ filtros de ligação

/**
 * Devolve cópias dos eventos com causadoPor filtrado segundo as opções, e a
 * lista do que foi removido e por quê. Eventos sem ligações tipadas não são
 * afetados pelos filtros de força e tipo.
 */
export function filtrarLigacoes(
  eventos: EventoGrafo[],
  opcoes: OpcoesFiltro
): { eventos: EventoGrafo[]; removidas: LigacaoRemovida[] } {
  const turno = new Map(eventos.map((e) => [e.id, e.turno]));
  const removidas: LigacaoRemovida[] = [];

  let filtrados = eventos.map((e) => {
    const tipos = new Map((e.ligacoes ?? []).map((l) => [l.id, l]));
    const manter = e.causadoPor.filter((origem) => {
      const t0 = turno.get(origem);
      if (opcoes.janelaMaxDias !== undefined && t0 !== undefined && e.turno - t0 > opcoes.janelaMaxDias) {
        removidas.push({ origem, destino: e.id, motivo: 'janela' });
        return false;
      }
      const lig = tipos.get(origem);
      if (lig && opcoes.forcaMin !== undefined && lig.forca < opcoes.forcaMin) {
        removidas.push({ origem, destino: e.id, motivo: 'forca' });
        return false;
      }
      if (lig && opcoes.excluirTipos?.includes(lig.tipo)) {
        removidas.push({ origem, destino: e.id, motivo: 'tipo' });
        return false;
      }
      return true;
    });
    return { ...e, causadoPor: manter };
  });

  if (opcoes.removerPontesDeFusao) {
    const cortar = new Set(pontesDeFusao(filtrados, opcoes.removerPontesDeFusao.minLado).map((p) => `${p.a}>${p.b}`));
    filtrados = filtrados.map((e) => ({
      ...e,
      causadoPor: e.causadoPor.filter((o) => {
        if (!cortar.has(`${o}>${e.id}`)) return true;
        removidas.push({ origem: o, destino: e.id, motivo: 'ponte-de-fusao' });
        return false;
      }),
    }));
  }

  if (opcoes.reducaoTransitiva) {
    const redundantes = ligacoesRedundantes(filtrados);
    filtrados = filtrados.map((e) => ({
      ...e,
      causadoPor: e.causadoPor.filter((o) => {
        if (!redundantes.has(`${o}>${e.id}`)) return true;
        removidas.push({ origem: o, destino: e.id, motivo: 'transitiva' });
        return false;
      }),
    }));
  }

  if (opcoes.cortarEntreComunidades) {
    const comunidade = comunidadesLouvain(filtrados, opcoes.cortarEntreComunidades.resolucao ?? 1);
    filtrados = filtrados.map((e) => ({
      ...e,
      causadoPor: e.causadoPor.filter((o) => {
        const a = comunidade.get(o);
        const b = comunidade.get(e.id);
        if (a === undefined || b === undefined || a === b) return true;
        removidas.push({ origem: o, destino: e.id, motivo: 'entre-comunidades' });
        return false;
      }),
    }));
  }

  return { eventos: filtrados, removidas };
}

// ------------------------------------------------------------ redução transitiva

/**
 * Ligações A→B para as quais existe outro caminho dirigido A→…→B (com duas ou
 * mais ligações). Busca a partir de cada origem, sem usar a ligação direta.
 */
export function ligacoesRedundantes(eventos: StoryEvent[]): Set<string> {
  const { saida } = construirArestas(eventos);
  const redundantes = new Set<string>();
  saida.forEach((destinos, a) => {
    if (destinos.length < 2) return;
    const alvos = new Set(destinos);
    // alcançáveis a partir de a por caminhos de comprimento >= 2
    const visitados = new Set<string>();
    const pilha = [...destinos];
    const primeiroPasso = new Set(destinos);
    while (pilha.length) {
      const v = pilha.pop()!;
      for (const w of saida.get(v) ?? []) {
        if (visitados.has(w)) continue;
        visitados.add(w);
        pilha.push(w);
      }
    }
    alvos.forEach((b) => {
      if (visitados.has(b) && primeiroPasso.has(b)) redundantes.add(`${a}>${b}`);
    });
  });
  return redundantes;
}

// ------------------------------------------------------------ comunidades (Louvain)

/**
 * Comunidades de Louvain no grafo não dirigido das ligações válidas.
 * Implementação determinística (ordem fixa dos vértices, desempate pelo
 * menor id de comunidade), com as duas fases clássicas: mover vértices
 * enquanto a modularidade sobe e agregar comunidades em supervértices.
 * Devolve evento -> id da comunidade (só eventos com alguma ligação).
 */
export function comunidadesLouvain(eventos: StoryEvent[], resolucao = 1): Map<string, number> {
  const { entrada } = construirArestas(eventos);
  const ids = eventos.map((e) => e.id).filter((id) => (entrada.get(id)?.length ?? 0) > 0 || [...entrada.values()].some((o) => o.includes(id)));
  const indice = new Map(ids.map((id, i) => [id, i]));
  // pesos não dirigidos
  let adj: Map<number, number>[] = ids.map(() => new Map());
  entrada.forEach((origens, destino) => {
    const b = indice.get(destino);
    if (b === undefined) return;
    origens.forEach((o) => {
      const a = indice.get(o)!;
      if (a === b) return;
      adj[a].set(b, (adj[a].get(b) ?? 0) + 1);
      adj[b].set(a, (adj[b].get(a) ?? 0) + 1);
    });
  });
  let membro = ids.map((_, i) => i); // vértice original -> comunidade final
  for (let nivel = 0; nivel < 20; nivel++) {
    const n = adj.length;
    const grau = adj.map((m) => [...m.values()].reduce((s, w) => s + w, 0) + (m.get(-1) ?? 0));
    const m2 = grau.reduce((s, g) => s + g, 0);
    if (m2 === 0) break;
    const com = Array.from({ length: n }, (_, i) => i);
    const totCom = [...grau];
    let melhorou = true;
    let moveu = false;
    for (let volta = 0; volta < 50 && melhorou; volta++) {
      melhorou = false;
      for (let v = 0; v < n; v++) {
        const cv = com[v];
        const pesos = new Map<number, number>();
        adj[v].forEach((w, u) => {
          if (u < 0 || u === v) return;
          pesos.set(com[u], (pesos.get(com[u]) ?? 0) + w);
        });
        totCom[cv] -= grau[v];
        let melhor = cv;
        let ganhoMelhor = (pesos.get(cv) ?? 0) - (resolucao * totCom[cv] * grau[v]) / m2;
        [...pesos.keys()].sort((x, y) => x - y).forEach((c) => {
          const ganho = (pesos.get(c) ?? 0) - (resolucao * totCom[c] * grau[v]) / m2;
          if (ganho > ganhoMelhor + 1e-12) {
            ganhoMelhor = ganho;
            melhor = c;
          }
        });
        totCom[melhor] += grau[v];
        if (melhor !== cv) {
          com[v] = melhor;
          melhorou = true;
          moveu = true;
        }
      }
    }
    if (!moveu) break;
    // renumera e agrega
    const novos = new Map<number, number>();
    com.forEach((c) => {
      if (!novos.has(c)) novos.set(c, novos.size);
    });
    membro = membro.map((c) => novos.get(com[c])!);
    const agregado: Map<number, number>[] = Array.from({ length: novos.size }, () => new Map());
    adj.forEach((m, v) => {
      const cv = novos.get(com[v])!;
      m.forEach((w, u) => {
        if (u < 0) {
          agregado[cv].set(-1, (agregado[cv].get(-1) ?? 0) + w);
          return;
        }
        const cu = novos.get(com[u])!;
        if (cu === cv) agregado[cv].set(-1, (agregado[cv].get(-1) ?? 0) + w); // laço interno (conta no grau)
        else agregado[cv].set(cu, (agregado[cv].get(cu) ?? 0) + w);
      });
    });
    adj = agregado;
  }
  return new Map(ids.map((id, i) => [id, membro[i]]));
}

// ------------------------------------------------------------ métricas estruturais

export interface MetricasGrafo {
  eventos: number;
  ligacoes: number;
  pontes: number;
  pontesDeFusao: number;
  articulacoes: number;
  /** fração das ligações que são pontes */
  fracaoPontes: number;
  /** distribuição da distância em dias das ligações */
  distanciaMedia: number;
  ligacoesAlemDe3Dias: number;
  /** por tipo, quando há ligações tipadas */
  porTipo: Record<string, number>;
  forcaMedia: number | null;
}

export function metricasDoGrafo(eventos: EventoGrafo[], minLadoFusao = 3): MetricasGrafo {
  const { entrada, total } = construirArestas(eventos);
  const turno = new Map(eventos.map((e) => [e.id, e.turno]));
  const distancias: number[] = [];
  entrada.forEach((origens, destino) => origens.forEach((o) => distancias.push(turno.get(destino)! - turno.get(o)!)));
  const pa = pontesEArticulacoes(eventos);
  const porTipo: Record<string, number> = {};
  const forcas: number[] = [];
  eventos.forEach((e) =>
    (e.ligacoes ?? []).forEach((l) => {
      if (!(entrada.get(e.id) ?? []).includes(l.id)) return;
      porTipo[l.tipo] = (porTipo[l.tipo] ?? 0) + 1;
      forcas.push(l.forca);
    })
  );
  return {
    eventos: eventos.length,
    ligacoes: total,
    pontes: pa.pontes.length,
    pontesDeFusao: pa.pontes.filter((p) => p.ladoA >= minLadoFusao && p.ladoB >= minLadoFusao).length,
    articulacoes: pa.articulacoes.length,
    fracaoPontes: total ? pa.pontes.length / total : 0,
    distanciaMedia: distancias.length ? distancias.reduce((a, b) => a + b, 0) / distancias.length : 0,
    ligacoesAlemDe3Dias: distancias.filter((d) => d > 3).length,
    porTipo,
    forcaMedia: forcas.length ? forcas.reduce((a, b) => a + b, 0) / forcas.length : null,
  };
}
