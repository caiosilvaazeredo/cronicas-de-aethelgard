/**
 * Detecção de arcos causais emergentes.
 *
 * Não contém, e não pode passar a conter, nenhuma noção de ato, fase, estágio
 * ou estrutura narrativa pré-definida. Início, meio e fim aqui são sempre
 * propriedades calculadas do grafo de causalidade entre eventos.
 */

import { StoryEvent, Trama, MetricaConvergencia, PapelCausal } from '../types';

export interface ResultadoDeteccao {
  eventos: StoryEvent[];
  tramas: Trama[];
  metrica: MetricaConvergencia;
}

/**
 * Constrói o mapa de arestas válidas. Uma aresta de `causadoPor` só é aceita
 * se aponta para um evento que existe e que aconteceu antes (ou no mesmo
 * turno). Isso descarta referências inventadas pelo modelo e impede ciclos,
 * já que o grafo resultante é sempre ordenado no tempo.
 */
export function construirArestas(eventos: StoryEvent[]): {
  entrada: Map<string, string[]>;
  saida: Map<string, string[]>;
  total: number;
} {
  const porId = new Map<string, StoryEvent>();
  eventos.forEach((e) => porId.set(e.id, e));

  const entrada = new Map<string, string[]>();
  const saida = new Map<string, string[]>();
  eventos.forEach((e) => {
    entrada.set(e.id, []);
    saida.set(e.id, []);
  });

  let total = 0;
  eventos.forEach((destino) => {
    const vistos = new Set<string>();
    (destino.causadoPor || []).forEach((origemId) => {
      if (origemId === destino.id) return;
      if (vistos.has(origemId)) return;
      const origem = porId.get(origemId);
      if (!origem) return;
      if (origem.turno > destino.turno) return;
      vistos.add(origemId);
      entrada.get(destino.id)!.push(origemId);
      saida.get(origemId)!.push(destino.id);
      total += 1;
    });
  });

  return { entrada, saida, total };
}

/** Union-find sobre os eventos kernel, para achar os componentes conectados. */
function agruparComponentes(
  kernels: StoryEvent[],
  entrada: Map<string, string[]>
): Map<string, string[]> {
  const pai = new Map<string, string>();
  kernels.forEach((e) => pai.set(e.id, e.id));

  function achar(x: string): string {
    let raiz = x;
    while (pai.get(raiz) !== raiz) raiz = pai.get(raiz)!;
    while (pai.get(x) !== raiz) {
      const prox = pai.get(x)!;
      pai.set(x, raiz);
      x = prox;
    }
    return raiz;
  }

  function unir(a: string, b: string): void {
    const ra = achar(a);
    const rb = achar(b);
    if (ra !== rb) pai.set(ra, rb);
  }

  kernels.forEach((e) => {
    (entrada.get(e.id) || []).forEach((origemId) => {
      if (pai.has(origemId)) unir(e.id, origemId);
    });
  });

  const grupos = new Map<string, string[]>();
  kernels.forEach((e) => {
    const raiz = achar(e.id);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz)!.push(e.id);
  });

  return grupos;
}

/**
 * O id de uma trama é o id do seu evento mais antigo. Quando dois componentes
 * se fundem (um evento novo liga duas linhas antes separadas), a trama
 * resultante herda o id do evento mais antigo entre as duas, o que mantém a
 * identidade estável ao longo da sessão.
 */
function idDaTrama(idsDoGrupo: string[], porId: Map<string, StoryEvent>): string {
  let maisAntigo = porId.get(idsDoGrupo[0])!;
  idsDoGrupo.forEach((id) => {
    const e = porId.get(id)!;
    if (e.turno < maisAntigo.turno) maisAntigo = e;
  });
  return maisAntigo.id;
}

export function papelDoEvento(
  evento: StoryEvent,
  entrada: Map<string, string[]>,
  saida: Map<string, string[]>,
  tramaFechada: boolean
): PapelCausal {
  if (!evento.ehKernel) return 'satelite';
  const grauEntrada = (entrada.get(evento.id) || []).length;
  const grauSaida = (saida.get(evento.id) || []).length;
  if (grauEntrada === 0 && grauSaida > 0) return 'origem';
  if (grauSaida === 0) return tramaFechada ? 'desfecho' : 'ponta';
  return 'desdobramento';
}

/**
 * Roda a cada turno. Recebe todos os eventos da sessão e devolve os eventos
 * anotados (ehKernel, tramaId), as tramas detectadas e a métrica do turno.
 *
 * `tramasAnteriores` só é usado para preservar o status 'fechada' de tramas
 * cujo fechamento já foi narrado pelo curador: uma trama fechada não volta a
 * ser aberta mesmo que um evento novo se ligue a ela; nesse caso o evento novo
 * inicia um desdobramento posterior, mas o arco já narrado permanece narrado.
 */
export function detectarArcos(
  eventos: StoryEvent[],
  turnoAtual: number,
  tramasAnteriores: Trama[] = [],
  limiarEstabilidade = 3
): ResultadoDeteccao {
  const porId = new Map<string, StoryEvent>();
  eventos.forEach((e) => porId.set(e.id, e));

  const { entrada, saida, total: totalArestas } = construirArestas(eventos);

  // 1. kernel = tem pelo menos uma aresta causal (de entrada ou de saída)
  const anotados: StoryEvent[] = eventos.map((e) => ({
    ...e,
    ehKernel:
      (entrada.get(e.id) || []).length > 0 || (saida.get(e.id) || []).length > 0,
    tramaId: null,
  }));
  const anotadosPorId = new Map<string, StoryEvent>();
  anotados.forEach((e) => anotadosPorId.set(e.id, e));

  const kernels = anotados.filter((e) => e.ehKernel);

  // 2. componentes conectados sobre o subgrafo de kernels
  const grupos = agruparComponentes(kernels, entrada);

  const fechadasAntes = new Set(
    tramasAnteriores.filter((t) => t.status === 'fechada').map((t) => t.id)
  );

  const tramas: Trama[] = [];

  grupos.forEach((idsDoGrupo) => {
    const tramaId = idDaTrama(idsDoGrupo, anotadosPorId);
    idsDoGrupo.forEach((id) => {
      anotadosPorId.get(id)!.tramaId = tramaId;
    });

    // 3. candidatos a início e fim, por grau dentro do componente
    let origemId: string | null = null;
    let origemTurno = Infinity;
    let desfechoId: string | null = null;
    let desfechoTurno = -Infinity;
    let ultimoTurno = -Infinity;

    idsDoGrupo.forEach((id) => {
      const e = anotadosPorId.get(id)!;
      const grauEntrada = (entrada.get(id) || []).length;
      const grauSaida = (saida.get(id) || []).length;

      if (grauEntrada === 0 && e.turno < origemTurno) {
        origemTurno = e.turno;
        origemId = id;
      }
      if (grauSaida === 0 && e.turno > desfechoTurno) {
        desfechoTurno = e.turno;
        desfechoId = id;
      }
      if (e.turno > ultimoTurno) ultimoTurno = e.turno;
    });

    // 4. estabilidade: o candidato a fim precisa ficar sem consequência por
    //    `limiarEstabilidade` turnos seguidos para virar desfecho de verdade
    const turnosSemNovoEvento = Math.max(0, turnoAtual - ultimoTurno);
    const estavel =
      origemId !== null &&
      desfechoId !== null &&
      turnosSemNovoEvento >= limiarEstabilidade;

    let status: Trama['status'];
    if (fechadasAntes.has(tramaId)) {
      status = 'fechada';
    } else if (estavel) {
      status = 'estavel';
    } else {
      status = 'aberta';
    }

    const tramaAnterior = tramasAnteriores.find((t) => t.id === tramaId);

    tramas.push({
      id: tramaId,
      eventoInicialId: origemId!,
      eventoFinalId: status === 'aberta' ? null : desfechoId,
      turnosSemNovoEvento,
      status,
      narracaoFechamento: tramaAnterior?.narracaoFechamento ?? null,
    });
  });

  const metrica = calcularMetrica(anotados, tramas, entrada, saida, totalArestas, turnoAtual);

  return { eventos: anotados, tramas, metrica };
}

export function calcularMetrica(
  eventos: StoryEvent[],
  tramas: Trama[],
  entrada: Map<string, string[]>,
  saida: Map<string, string[]>,
  totalArestas: number,
  turno: number
): MetricaConvergencia {
  const abertas = tramas.filter((t) => t.status === 'aberta');

  let pontasSoltas = 0;
  const idsDeTramaAberta = new Set(abertas.map((t) => t.id));
  eventos.forEach((e) => {
    if (!e.ehKernel) return;
    if (!e.tramaId || !idsDeTramaAberta.has(e.tramaId)) return;
    if ((saida.get(e.id) || []).length === 0) pontasSoltas += 1;
  });

  const eventosFundadores = eventos.filter(
    (e) => (entrada.get(e.id) || []).length === 0
  ).length;

  return {
    turno,
    componentesAbertos: abertas.length,
    componentesFechados: tramas.filter((t) => t.status !== 'aberta').length,
    pontasSoltas,
    eventosFundadores,
    razaoAmarracao: eventos.length > 0 ? totalArestas / eventos.length : 0,
  };
}

/**
 * Ordena os eventos kernel de uma trama em ordem causal, para o curador.
 *
 * Entre os eventos disponíveis a cada passo, prefere o que continua a cadeia
 * recém-emitida. Sem isso, duas linhas que se fundiram saem intercaladas, o
 * que é topologicamente correto mas ilegível como narração.
 */
export function cadeiaCausal(eventos: StoryEvent[], tramaId: string): StoryEvent[] {
  const daTrama = eventos.filter((e) => e.tramaId === tramaId && e.ehKernel);
  const porId = new Map<string, StoryEvent>();
  daTrama.forEach((e) => porId.set(e.id, e));

  const pendentes = new Map<string, number>();
  daTrama.forEach((e) => {
    pendentes.set(e.id, (e.causadoPor || []).filter((id) => porId.has(id)).length);
  });

  const ordenados: StoryEvent[] = [];
  const restantes = new Set(daTrama.map((e) => e.id));
  let ultimoId: string | null = null;

  while (restantes.size > 0) {
    const disponiveis = daTrama.filter(
      (e) => restantes.has(e.id) && pendentes.get(e.id) === 0
    );

    // se o grafo estiver travado (não deveria: as arestas são ordenadas no
    // tempo), libera o mais antigo que restou para não entrar em laço infinito
    const candidatos =
      disponiveis.length > 0
        ? disponiveis
        : daTrama.filter((e) => restantes.has(e.id));

    let escolhido = candidatos[0];
    let melhorChave: [number, number] = [1, escolhido.turno];
    candidatos.forEach((e) => {
      const continuaCadeia =
        ultimoId !== null && (e.causadoPor || []).includes(ultimoId) ? 0 : 1;
      const chave: [number, number] = [continuaCadeia, e.turno];
      if (chave[0] < melhorChave[0] || (chave[0] === melhorChave[0] && chave[1] < melhorChave[1])) {
        melhorChave = chave;
        escolhido = e;
      }
    });

    ordenados.push(escolhido);
    restantes.delete(escolhido.id);
    ultimoId = escolhido.id;

    daTrama.forEach((e) => {
      if (!restantes.has(e.id)) return;
      if (!(e.causadoPor || []).includes(escolhido.id)) return;
      pendentes.set(e.id, Math.max(0, (pendentes.get(e.id) || 1) - 1));
    });
  }

  return ordenados;
}

export interface TramaAbertaResumo {
  id: string;
  tensaoAtual: number;
  eventosRecentes: { id: string; conteudo: string }[];
}

/**
 * Resume as tramas 'aberta' e 'estavel' (tudo que ainda não foi narrado
 * pelo curador) para injeção no prompt do mestre, no lugar da antiga
 * instrução de ato. Tramas 'fechada' são omitidas: já foram narradas e não
 * devem voltar a orientar a geração.
 */
export function resumoTramasAbertas(
  eventos: StoryEvent[],
  tramas: Trama[],
  maxEventosPorTrama = 3
): TramaAbertaResumo[] {
  return tramas
    .filter((t) => t.status === 'aberta' || t.status === 'estavel')
    .map((t) => {
      const daTrama = eventos
        .filter((e) => e.tramaId === t.id && e.ehKernel)
        .sort((a, b) => a.turno - b.turno);
      const recentes = daTrama.slice(-maxEventosPorTrama);
      const tensaoAtual = recentes.length > 0 ? recentes[recentes.length - 1].tensao : 0;
      return {
        id: t.id,
        tensaoAtual,
        eventosRecentes: recentes.map((e) => ({ id: e.id, conteudo: e.conteudo })),
      };
    });
}
