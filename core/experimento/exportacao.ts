/**
 * Serializa uma sessão nos arquivos de exportação. É lógica pura: devolve um
 * mapa nome -> conteúdo, e quem grava no disco é o simulador (sim/), para que
 * o núcleo continue sem I/O e possa rodar no navegador.
 *
 *   eventos.jsonl    um StoryEvent por linha (com dia, autor, local, testemunhas)
 *   relatos.jsonl    relatos, ligados ao evento real
 *   metricas.jsonl   uma MetricaConvergencia por dia
 *   tramas.json      estado final das tramas
 *   narracoes.jsonl  narração de cada trama fechada, com a cadeia causal usada
 *   chamadas.jsonl   toda chamada de IA: prompt, resposta bruta, tokens, latência, tentativas
 *   resumo.json      indicadores da sessão
 */

import type { RegistroChamada } from '../mundo/motor';
import { chavePreco, type PrecoModelo } from './condicoes';
import type { RegistroSessao } from './execucao';
import { contarDescartes } from './reanalise';

const jsonl = (linhas: unknown[]) => linhas.map((l) => JSON.stringify(l)).join('\n') + (linhas.length ? '\n' : '');

function custoDaChamada(c: RegistroChamada, precos: Record<string, PrecoModelo>): number | null {
  if (c.doCache) return 0;
  if (c.provedor === 'simulado') return 0;
  if (typeof c.custoUsd === 'number') return c.custoUsd;
  const p = precos[chavePreco({ provedor: c.provedor, modelo: c.modeloSolicitado })];
  if (!p) return null;
  return (c.tokensEntrada * p.entradaPorMTok + c.tokensSaida * p.saidaPorMTok) / 1_000_000;
}

export function custoDasChamadas(chamadas: RegistroChamada[], precos: Record<string, PrecoModelo> = {}) {
  let usd = 0;
  let semPreco = 0;
  chamadas.forEach((c) => {
    const v = custoDaChamada(c, precos);
    if (v === null) semPreco += 1;
    else usd += v;
  });
  return { usd, chamadasSemPreco: semPreco };
}

export interface ResumoSessao {
  sessao: string;
  celula: string;
  dias: number;
  eventos: number;
  relatos: number;
  tramasSurgidas: number;
  tramasFechadas: number;
  proporcaoTramasFechadas: number;
  curvaTramasAbertas: number[];
  curvaRazaoAmarracao: number[];
  razaoAmarracaoFinal: number;
  eventosFundadores: number;
  narracoes: number;
  narracoesComFalha: number;
  causadoPor: { referencias: number; arestas: number; descartadas: number };
  estrutura: {
    chamadasComEsquema: number;
    falhas: number;
    taxaFalha: number;
    tentativasMedias: number;
    porPapel: Record<string, { chamadas: number; falhas: number; taxaFalha: number }>;
  };
  errosDeChamada: number;
  acoesDescartadas: number;
  agentesSemAcao: number;
  locaisInvalidos: number;
  tokens: { entrada: number; saida: number; porPapel: Record<string, { entrada: number; saida: number }> };
  custoUsd: number;
  chamadasSemPreco: number;
  chamadasDoCache: number;
  modelosEfetivos: Record<string, string[]>;
  latenciaTotalMs: number;
}

export function calcularResumo(reg: RegistroSessao, precos: Record<string, PrecoModelo> = {}): ResumoSessao {
  const { estado, chamadas } = reg;
  const tramasFechadas = estado.tramas.filter((t) => t.status !== 'aberta').length;
  const ultima = estado.metricas[estado.metricas.length - 1];

  const comEsquema = chamadas.filter((c) => !c.erro);
  const falhas = comEsquema.filter((c) => c.falhaEstrutura);
  const porPapel: ResumoSessao['estrutura']['porPapel'] = {};
  comEsquema.forEach((c) => {
    porPapel[c.papel] ??= { chamadas: 0, falhas: 0, taxaFalha: 0 };
    porPapel[c.papel].chamadas += 1;
    if (c.falhaEstrutura) porPapel[c.papel].falhas += 1;
  });
  Object.values(porPapel).forEach((p) => (p.taxaFalha = p.chamadas ? p.falhas / p.chamadas : 0));

  const tokensPorPapel: Record<string, { entrada: number; saida: number }> = {};
  const modelosEfetivos: Record<string, Set<string>> = {};
  chamadas.forEach((c) => {
    tokensPorPapel[c.papel] ??= { entrada: 0, saida: 0 };
    tokensPorPapel[c.papel].entrada += c.tokensEntrada;
    tokensPorPapel[c.papel].saida += c.tokensSaida;
    if (c.modeloEfetivo) (modelosEfetivos[c.papel] ??= new Set()).add(c.modeloEfetivo);
  });

  const custo = custoDasChamadas(chamadas, precos);
  const soma = (k: 'acoesDescartadas' | 'agentesSemAcao' | 'locaisInvalidos') =>
    reg.estatisticasDias.reduce((n, d) => n + d[k], 0);

  return {
    sessao: reg.condicao.id,
    celula: reg.condicao.celula,
    dias: estado.dia,
    eventos: estado.eventos.length,
    relatos: estado.relatos.length,
    tramasSurgidas: estado.tramas.length,
    tramasFechadas,
    proporcaoTramasFechadas: estado.tramas.length ? tramasFechadas / estado.tramas.length : 0,
    curvaTramasAbertas: estado.metricas.map((m) => m.componentesAbertos),
    curvaRazaoAmarracao: estado.metricas.map((m) => m.razaoAmarracao),
    razaoAmarracaoFinal: ultima?.razaoAmarracao ?? 0,
    eventosFundadores: ultima?.eventosFundadores ?? 0,
    narracoes: estado.narracoes.length,
    narracoesComFalha: estado.narracoes.filter((n) => n.texto === null).length,
    causadoPor: contarDescartes(estado.eventos),
    estrutura: {
      chamadasComEsquema: comEsquema.length,
      falhas: falhas.length,
      taxaFalha: comEsquema.length ? falhas.length / comEsquema.length : 0,
      tentativasMedias: comEsquema.length ? comEsquema.reduce((n, c) => n + c.tentativas, 0) / comEsquema.length : 0,
      porPapel,
    },
    errosDeChamada: chamadas.filter((c) => c.erro).length,
    acoesDescartadas: soma('acoesDescartadas'),
    agentesSemAcao: soma('agentesSemAcao'),
    locaisInvalidos: soma('locaisInvalidos'),
    tokens: {
      entrada: chamadas.reduce((n, c) => n + c.tokensEntrada, 0),
      saida: chamadas.reduce((n, c) => n + c.tokensSaida, 0),
      porPapel: tokensPorPapel,
    },
    custoUsd: custo.usd,
    chamadasSemPreco: custo.chamadasSemPreco,
    chamadasDoCache: chamadas.filter((c) => c.doCache).length,
    modelosEfetivos: Object.fromEntries(Object.entries(modelosEfetivos).map(([k, v]) => [k, [...v].sort()])),
    latenciaTotalMs: chamadas.reduce((n, c) => n + c.latenciaMs, 0),
  };
}

export function arquivosDaSessao(reg: RegistroSessao, precos: Record<string, PrecoModelo> = {}): Record<string, string> {
  const { estado } = reg;
  const arquivos: Record<string, string> = {
    'condicao.json': JSON.stringify({ ...reg.condicao, agentesAtivos: reg.agentesAtivos }, null, 2) + '\n',
    'eventos.jsonl': jsonl(estado.eventos),
    'relatos.jsonl': jsonl(estado.relatos),
    'metricas.jsonl': jsonl(estado.metricas),
    'tramas.json': JSON.stringify(estado.tramas, null, 2) + '\n',
    'narracoes.jsonl': jsonl(estado.narracoes),
    'chamadas.jsonl': jsonl(reg.chamadas),
    'resumo.json': JSON.stringify(calcularResumo(reg, precos), null, 2) + '\n',
  };
  if (reg.historiasControle) arquivos['mestre.jsonl'] = jsonl(reg.historiasControle);
  return arquivos;
}
