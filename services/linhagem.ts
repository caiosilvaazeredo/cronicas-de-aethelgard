/**
 * Linhagem das tramas: separa FUSÃO de FECHAMENTO.
 *
 * services/arcos.ts agrupa eventos em tramas por componentes conectados. Uma
 * trama pode sair da lista de tramas abertas de duas formas muito diferentes:
 *
 *  - fechamento: ficou estável (sem consequência por k dias) e foi narrada;
 *  - fusão: um evento novo ligou duas linhas e o componente dela foi absorvido
 *    por outro (o id da trama resultante é o do evento mais antigo).
 *
 * A contagem de tramas abertas (MetricaConvergencia.componentesAbertos) cai
 * nos dois casos. Este módulo compara a atribuição de tramas de um dia com a
 * do dia anterior e registra cada nascimento, fusão e fechamento, sem alterar
 * o comportamento do arcos.ts. Lógica pura, sem I/O.
 *
 * Definições (emenda 1 do pre-registro.md, 2026-09-25):
 *  - nascimento: aparece uma trama cujos eventos não pertenciam a nenhuma
 *    trama no dia anterior (uma linha de acontecimento nova);
 *  - fusão: uma trama do dia anterior deixa de existir porque seus eventos
 *    passaram a pertencer a outra trama; a trama que a contém é a absorvedora;
 *  - fechamento: a trama passa a 'estavel' ou 'fechada' pela primeira vez;
 *  - renomeação: surge um id novo que contém eventos de tramas anteriores
 *    (acontece quando um evento antigo, antes satélite, passa a ser o mais
 *    antigo do componente); é contada como fusão das tramas anteriores, e não
 *    como nascimento.
 */

import type { StoryEvent, Trama } from '../types';

export type DesfechoLinhagem = 'aberta' | 'fechada' | 'fundida';

export interface RegistroTrama {
  id: string;
  nasceuEm: number; // dia
  /** 'nascimento' = linha nova; 'renomeacao' = id novo herdado de fusão */
  origem: 'nascimento' | 'renomeacao';
  fechouEm: number | null; // primeiro dia como estável/fechada
  fundiuEm: number | null; // dia em que foi absorvida
  absorvidaPor: string | null;
  /** tramas que ela absorveu, com o dia */
  absorveu: { id: string; dia: number }[];
}

export interface MetricaLinhagem {
  dia: number;
  nascidas: number; // linhas novas no dia
  fundidas: number; // tramas absorvidas no dia
  fechadas: number; // tramas que fecharam por estabilidade no dia
  abertas: number; // tramas abertas ao fim do dia (igual a componentesAbertos)
  nascidasAcum: number;
  fundidasAcum: number;
  fechadasAcum: number;
  /** tramas que fundiram depois de já estarem fechadas (acumulado) */
  fundidasAposFecharAcum: number;
}

export interface Linhagem {
  tramas: Record<string, RegistroTrama>;
  dias: MetricaLinhagem[];
}

export function linhagemVazia(): Linhagem {
  return { tramas: {}, dias: [] };
}

/** eventoId -> tramaId, só para eventos kernel atribuídos a alguma trama */
export function mapaDeTramas(eventos: StoryEvent[]): Map<string, string> {
  const m = new Map<string, string>();
  eventos.forEach((e) => {
    if (e.tramaId) m.set(e.id, e.tramaId);
  });
  return m;
}

/**
 * Atualiza a linhagem com o resultado da detecção de um dia.
 *
 * @param antes   atribuição evento -> trama do dia anterior (mapaDeTramas)
 * @param depois  eventos anotados pela detecção do dia
 * @param tramas  tramas detectadas no dia (status já calculado)
 */
export function atualizarLinhagem(
  linhagem: Linhagem,
  dia: number,
  antes: Map<string, string>,
  depois: StoryEvent[],
  tramas: Trama[]
): Linhagem {
  const agora = mapaDeTramas(depois);
  const idsAntes = new Set(antes.values());
  const idsAgora = new Set(tramas.map((t) => t.id));
  const tramasAtuais = { ...linhagem.tramas };
  let nascidas = 0;
  let fundidas = 0;
  let fechadas = 0;
  let fundidasAposFechar = 0;

  // membros de cada trama do dia anterior
  const membrosAntes = new Map<string, string[]>();
  antes.forEach((t, e) => {
    if (!membrosAntes.has(t)) membrosAntes.set(t, []);
    membrosAntes.get(t)!.push(e);
  });

  // 1. fusões: tramas de ontem que sumiram hoje
  [...idsAntes].sort().forEach((id) => {
    if (idsAgora.has(id)) return;
    const membro = membrosAntes.get(id)!.find((e) => agora.has(e));
    const absorvedora = membro ? agora.get(membro)! : null;
    const reg = tramasAtuais[id];
    if (!reg || reg.fundiuEm !== null) return;
    tramasAtuais[id] = { ...reg, fundiuEm: dia, absorvidaPor: absorvedora };
    fundidas += 1;
    if (reg.fechouEm !== null) fundidasAposFechar += 1;
  });

  // 2. nascimentos e renomeações: ids de hoje que não existiam ontem
  [...idsAgora].sort().forEach((id) => {
    if (tramasAtuais[id]) return;
    const herdou = [...agora.entries()].some(([e, t]) => t === id && antes.has(e));
    tramasAtuais[id] = {
      id,
      nasceuEm: dia,
      origem: herdou ? 'renomeacao' : 'nascimento',
      fechouEm: null,
      fundiuEm: null,
      absorvidaPor: null,
      absorveu: [],
    };
    if (!herdou) nascidas += 1;
  });

  // absorvedoras registram quem absorveram
  Object.values(tramasAtuais).forEach((r) => {
    if (r.fundiuEm === dia && r.absorvidaPor && tramasAtuais[r.absorvidaPor]) {
      const alvo = tramasAtuais[r.absorvidaPor];
      tramasAtuais[r.absorvidaPor] = { ...alvo, absorveu: [...alvo.absorveu, { id: r.id, dia }] };
    }
  });

  // 3. fechamentos: primeira vez estável/fechada
  tramas.forEach((t) => {
    const reg = tramasAtuais[t.id];
    if (t.status !== 'aberta' && reg.fechouEm === null) {
      tramasAtuais[t.id] = { ...reg, fechouEm: dia };
      fechadas += 1;
    }
  });

  const ant = linhagem.dias[linhagem.dias.length - 1];
  const metrica: MetricaLinhagem = {
    dia,
    nascidas,
    fundidas,
    fechadas,
    abertas: tramas.filter((t) => t.status === 'aberta').length,
    nascidasAcum: (ant?.nascidasAcum ?? 0) + nascidas,
    fundidasAcum: (ant?.fundidasAcum ?? 0) + fundidas,
    fechadasAcum: (ant?.fechadasAcum ?? 0) + fechadas,
    fundidasAposFecharAcum: (ant?.fundidasAposFecharAcum ?? 0) + fundidasAposFechar,
  };
  return { tramas: tramasAtuais, dias: [...linhagem.dias, metrica] };
}

export function desfechoDaTrama(r: RegistroTrama): DesfechoLinhagem {
  if (r.fundiuEm !== null && (r.fechouEm === null || r.fundiuEm <= r.fechouEm)) return 'fundida';
  if (r.fechouEm !== null) return 'fechada';
  return 'aberta';
}

export interface ResumoLinhagem {
  /** linhas de acontecimento que nasceram (sem contar renomeações) */
  nascidas: number;
  fechadasPorEstabilidade: number;
  fundidasAntesDeFechar: number;
  abertasNoFim: number;
  /** métrica principal da emenda 1: fechadas por estabilidade / nascidas */
  proporcaoFechadasPorEstabilidade: number;
  proporcaoFundidas: number;
  /** das tramas que deixaram de estar abertas, quantas foi por fechamento */
  fracaoSaidaPorFechamento: number | null;
}

export function resumirLinhagem(l: Linhagem): ResumoLinhagem {
  const regs = Object.values(l.tramas);
  const nascidas = regs.filter((r) => r.origem === 'nascimento').length;
  // renomeações contam no desfecho: a linha que continua sob o id novo
  const desfechos = regs.map(desfechoDaTrama);
  const fechadas = desfechos.filter((d) => d === 'fechada').length;
  const fundidas = regs.filter((r) => r.origem === 'nascimento' && desfechoDaTrama(r) === 'fundida').length;
  const abertas = desfechos.filter((d) => d === 'aberta').length;
  const saidas = fechadas + fundidas;
  return {
    nascidas,
    fechadasPorEstabilidade: fechadas,
    fundidasAntesDeFechar: fundidas,
    abertasNoFim: abertas,
    proporcaoFechadasPorEstabilidade: nascidas ? fechadas / nascidas : 0,
    proporcaoFundidas: nascidas ? fundidas / nascidas : 0,
    fracaoSaidaPorFechamento: saidas ? fechadas / saidas : null,
  };
}
