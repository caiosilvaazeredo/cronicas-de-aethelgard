/**
 * Motor da Cidade Viva: avança o mundo um dia.
 *
 * 1. uma chamada decide a ação de todos os agentes;
 * 2. o jogador (humano ou sintético) age, se houver;
 * 3. relatos se espalham entre quem está no mesmo local;
 * 4. detectarArcos + métrica do dia (services/arcos.ts, sem alteração);
 * 5. o curador narra cada trama que ficou estável no dia.
 *
 * Nada aqui conhece a duração da sessão: o motor só sabe avançar um dia.
 */

import { cadeiaCausal, detectarArcos, resumoTramasAbertas } from '../../services/arcos';
import type { Trama } from '../../types';
import { AcaoDoJogador, AcoesDoDia, NarracaoCurador, RelatosDoDia } from '../llm/esquemas';
import type { ChamadaLLM, ProvedorLLM, RespostaLLM } from '../llm/provedor';
import { sistemaAgentes, usuarioAgentes, type EstadoTramasNoPrompt } from '../prompts/agente';
import { sistemaCurador, usuarioCurador } from '../prompts/curador';
import { sistemaJogador, usuarioJogador } from '../prompts/jogador-sintetico';
import { sistemaRelatos, usuarioRelatos, type PedidoRelato } from '../prompts/relatos';
import { hashTexto } from '../util/aleatorio';
import { escolherRelatos } from './relatos';
import {
  ID_JOGADOR,
  type ConfigMundo,
  type EstadoMundo,
  type EstadoPersonagem,
  type EventoCidade,
  type Narracao,
  type PerfilJogador,
  type Relato,
} from './tipos';

export interface ConfigMotor {
  mundo: ConfigMundo;
  agentesAtivos: string[];
  estadoTramas: EstadoTramasNoPrompt;
  /** null = sem jogador; 'humano' = ação vem de fora; perfil = jogador sintético */
  jogador: null | { tipo: 'humano' } | { tipo: 'sintetico'; perfil: PerfilJogador };
  temperatura: number;
  semente: number;
  limiarEstabilidade: number;
  /** quantos dias de eventos entram como "recentes" no prompt */
  janelaDias: number;
  maxTokens: { agentes: number; jogador: number; relatos: number; curador: number };
}

// Folgados de propósito: em modelos com raciocínio (Gemini 3.x, Claude com
// thinking adaptativo) os tokens de pensamento contam dentro do limite, e uma
// resposta cortada vira falha de estrutura. Só se paga o que é gerado.
export const MAX_TOKENS_PADRAO: ConfigMotor['maxTokens'] = {
  agentes: 12000,
  jogador: 4000,
  relatos: 8000,
  curador: 6000,
};

export interface ProvedoresMotor {
  /** gera a narrativa: ações dos agentes e relatos (variável experimental) */
  agentes: ProvedorLLM;
  jogador?: ProvedorLLM;
  curador: ProvedorLLM;
}

export type PapelIA = 'agentes' | 'relatos' | 'jogador' | 'curador' | 'mestre';

export interface RegistroChamada {
  papel: PapelIA;
  tarefa: string;
  dia: number;
  provedor: string;
  modeloSolicitado: string;
  modeloEfetivo: string | null;
  sistema: string;
  usuario: string;
  temperatura: number;
  semente: number | null;
  maxTokens: number;
  texto: string | null;
  json: unknown;
  bruto: unknown;
  tokensEntrada: number;
  tokensSaida: number;
  latenciaMs: number;
  tentativas: number;
  falhaEstrutura: string | null;
  erro: string | null;
  doCache: boolean;
  parametrosEfetivos: Record<string, unknown> | null;
  /** custo informado pelo provedor, quando ele informa (claude-cli) */
  custoUsd: number | null;
}

export interface EstatisticasDia {
  acoesDescartadas: number; // agente desconhecido, inativo ou repetido
  agentesSemAcao: number;
  locaisInvalidos: number;
}

export type Registrador = (r: RegistroChamada) => void;

/** Erro que interrompe a sessão (ex.: chave inválida em todas as chamadas). */
export class ErroSessao extends Error {}

export function estadoInicial(config: Pick<ConfigMotor, 'mundo' | 'agentesAtivos' | 'jogador'>): EstadoMundo {
  const personagens: Record<string, EstadoPersonagem> = {};
  config.mundo.agentes
    .filter((a) => config.agentesAtivos.includes(a.id))
    .forEach((a) => {
      personagens[a.id] = { id: a.id, local: a.localInicial, conhece: [], ouviu: [] };
    });
  if (config.jogador) {
    personagens[ID_JOGADOR] = { id: ID_JOGADOR, local: config.mundo.locais[0].id, conhece: [], ouviu: [] };
  }
  return { dia: 0, personagens, eventos: [], relatos: [], tramas: [], metricas: [], narracoes: [] };
}

export function sementeDaChamada(semente: number, dia: number, tarefa: string): number {
  return hashTexto(`${semente}|${dia}|${tarefa}`) % 2147483647;
}

function clonar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/**
 * Faz uma chamada e a registra, com ou sem sucesso. Erros de rede que
 * sobraram depois das novas tentativas viram registro com `erro`, e a sessão
 * segue; o chamador decide se muitos erros seguidos interrompem a sessão.
 */
export async function chamarERegistrar(
  provedor: ProvedorLLM,
  chamada: ChamadaLLM,
  papel: PapelIA,
  registrar: Registrador
): Promise<RespostaLLM | null> {
  const base = {
    papel,
    tarefa: chamada.meta?.tarefa ?? papel,
    dia: chamada.meta?.dia ?? 0,
    provedor: provedor.nome,
    modeloSolicitado: provedor.modelo,
    sistema: chamada.sistema,
    usuario: chamada.usuario,
    temperatura: chamada.temperatura,
    semente: chamada.semente ?? null,
    maxTokens: chamada.maxTokens,
  };
  try {
    const r = await provedor.chamar(chamada);
    registrar({
      ...base,
      modeloEfetivo: r.modeloEfetivo,
      texto: r.texto,
      json: r.json ?? null,
      bruto: r.bruto,
      tokensEntrada: r.tokensEntrada,
      tokensSaida: r.tokensSaida,
      latenciaMs: r.latenciaMs,
      tentativas: r.tentativas,
      falhaEstrutura: r.falhaEstrutura ?? null,
      erro: null,
      doCache: r.doCache === true,
      parametrosEfetivos: r.parametrosEfetivos ?? null,
      custoUsd: r.doCache ? 0 : r.custoUsd ?? null,
    });
    return r;
  } catch (e) {
    registrar({
      ...base,
      modeloEfetivo: null,
      texto: null,
      json: null,
      bruto: null,
      tokensEntrada: 0,
      tokensSaida: 0,
      latenciaMs: 0,
      tentativas: 0,
      falhaEstrutura: null,
      erro: (e as Error).message ?? String(e),
      doCache: false,
      parametrosEfetivos: null,
      custoUsd: null,
    });
    return null;
  }
}

function eventosRecentes(eventos: EventoCidade[], dia: number, janelaDias: number): EventoCidade[] {
  return eventos.filter((e) => e.dia >= dia - janelaDias && e.dia < dia);
}

function localValido(mundo: ConfigMundo, local: string): boolean {
  return mundo.locais.some((l) => l.id === local);
}

/** Passo 1: uma chamada devolve uma ação por agente. */
async function passoAgentes(
  estado: EstadoMundo,
  dia: number,
  config: ConfigMotor,
  provedor: ProvedorLLM,
  registrar: Registrador,
  stats: EstatisticasDia
): Promise<EventoCidade[]> {
  const recentes = eventosRecentes(estado.eventos, dia, config.janelaDias);
  const relatosRecentes = estado.relatos.filter((r) => r.dia === dia - 1);
  const tramasAbertas = config.estadoTramas === 'informa' ? resumoTramasAbertas(estado.eventos, estado.tramas) : [];

  const usuario = usuarioAgentes({
    mundo: config.mundo,
    agentesAtivos: config.agentesAtivos,
    personagens: estado.personagens,
    dia,
    eventosRecentes: recentes,
    relatosRecentes,
    condicao: config.estadoTramas,
    tramasAbertas,
  });

  const idsVisiveis = new Set(recentes.map((e) => e.id));
  tramasAbertas.forEach((t) => t.eventosRecentes.forEach((e) => idsVisiveis.add(e.id)));

  const resposta = await chamarERegistrar(
    provedor,
    {
      sistema: sistemaAgentes(config.mundo),
      usuario,
      esquema: AcoesDoDia,
      temperatura: config.temperatura,
      semente: sementeDaChamada(config.semente, dia, 'acoes-agentes'),
      maxTokens: config.maxTokens.agentes,
      meta: {
        tarefa: 'acoes-agentes',
        papel: 'agentes',
        dia,
        dadosSimulacao: {
          agentes: config.agentesAtivos.map((id) => ({
            id,
            nome: config.mundo.agentes.find((a) => a.id === id)?.nome ?? id,
            local: estado.personagens[id].local,
          })),
          locais: config.mundo.locais.map((l) => l.id),
          eventosVisiveis: [...idsVisiveis].sort(),
        },
      },
    },
    'agentes',
    registrar
  );

  const json = resposta?.json as AcoesDoDia | undefined;
  if (!json) {
    stats.agentesSemAcao += config.agentesAtivos.length;
    return [];
  }

  const novos: EventoCidade[] = [];
  const jaAgiram = new Set<string>();
  json.acoes.forEach((a) => {
    if (!config.agentesAtivos.includes(a.agenteId) || jaAgiram.has(a.agenteId)) {
      stats.acoesDescartadas += 1;
      return;
    }
    jaAgiram.add(a.agenteId);
    const personagem = estado.personagens[a.agenteId];
    if (localValido(config.mundo, a.local)) {
      personagem.local = a.local;
    } else {
      stats.locaisInvalidos += 1;
    }
    novos.push({
      id: `D${dia}.${a.agenteId}`,
      turno: dia,
      dia,
      conteudo: a.acao,
      causadoPor: a.causadoPor,
      tensao: a.tensao,
      tramaId: null,
      ehKernel: false,
      autorId: a.agenteId,
      local: personagem.local,
      testemunhas: [],
    });
  });
  stats.agentesSemAcao += config.agentesAtivos.filter((id) => !jaAgiram.has(id)).length;
  return novos;
}

/** Monta o prompt do jogador sintético só com o que ele viu e ouviu. */
export function montarPromptJogador(estado: EstadoMundo, dia: number, config: ConfigMotor, perfil: PerfilJogador) {
  const eu = estado.personagens[ID_JOGADOR];
  const porId = new Map(estado.eventos.map((e) => [e.id, e]));
  const vistos = eu.conhece
    .map((id) => porId.get(id))
    .filter((e): e is EventoCidade => !!e && e.autorId !== ID_JOGADOR && e.testemunhas.includes(ID_JOGADOR))
    .slice(-20);
  const relatosPorId = new Map(estado.relatos.map((r) => [r.id, r]));
  const ouvidos = eu.ouviu.map((id) => relatosPorId.get(id)).filter((r): r is Relato => !!r).slice(-10);
  const minhas = estado.eventos.filter((e) => e.autorId === ID_JOGADOR).slice(-5);
  const presentes = Object.values(estado.personagens)
    .filter((p) => p.id !== ID_JOGADOR && p.local === eu.local)
    .map((p) => config.mundo.agentes.find((a) => a.id === p.id)?.nome ?? p.id);

  return {
    sistema: sistemaJogador(config.mundo, perfil),
    usuario: usuarioJogador({
      mundo: config.mundo,
      dia,
      localAtual: eu.local,
      presentes,
      eventosVistos: vistos,
      relatosOuvidos: ouvidos,
      propriasAcoes: minhas,
    }),
    conhecidos: [...new Set([...vistos.map((e) => e.id), ...ouvidos.map((r) => r.eventoId), ...minhas.map((e) => e.id)])].sort(),
  };
}

export interface AcaoJogadorEntrada {
  local: string;
  acao: string;
  causadoPor: string[];
  tensao: number;
}

function eventoDoJogador(
  estado: EstadoMundo,
  dia: number,
  config: ConfigMotor,
  a: AcaoJogadorEntrada,
  stats: EstatisticasDia
): EventoCidade {
  const eu = estado.personagens[ID_JOGADOR];
  if (localValido(config.mundo, a.local)) eu.local = a.local;
  else stats.locaisInvalidos += 1;
  return {
    id: `D${dia}.${ID_JOGADOR}`,
    turno: dia,
    dia,
    conteudo: a.acao.slice(0, 280),
    causadoPor: a.causadoPor,
    tensao: Math.max(0, Math.min(10, a.tensao)),
    tramaId: null,
    ehKernel: false,
    autorId: ID_JOGADOR,
    local: eu.local,
    testemunhas: [],
  };
}

/** Passo 2 (sintético): escolhe a ação do jogador. */
async function passoJogadorSintetico(
  estado: EstadoMundo,
  dia: number,
  config: ConfigMotor,
  perfil: PerfilJogador,
  provedor: ProvedorLLM,
  registrar: Registrador,
  stats: EstatisticasDia
): Promise<EventoCidade | null> {
  const p = montarPromptJogador(estado, dia, config, perfil);
  const resposta = await chamarERegistrar(
    provedor,
    {
      sistema: p.sistema,
      usuario: p.usuario,
      esquema: AcaoDoJogador,
      temperatura: config.temperatura,
      semente: sementeDaChamada(config.semente, dia, 'acao-jogador'),
      maxTokens: config.maxTokens.jogador,
      meta: {
        tarefa: 'acao-jogador',
        papel: 'jogador',
        dia,
        dadosSimulacao: {
          locais: config.mundo.locais.map((l) => l.id),
          localAtual: estado.personagens[ID_JOGADOR].local,
          eventosConhecidos: p.conhecidos,
          perfil,
        },
      },
    },
    'jogador',
    registrar
  );
  const json = resposta?.json as AcaoDoJogador | undefined;
  if (!json) return null;
  return eventoDoJogador(estado, dia, config, json, stats);
}

/** Quem estava no mesmo local ao fim das ações do dia vê o que aconteceu lá. */
function registrarTestemunhas(estado: EstadoMundo, novos: EventoCidade[]): void {
  novos.forEach((e) => {
    const presentes = Object.values(estado.personagens)
      .filter((p) => p.local === e.local || p.id === e.autorId)
      .map((p) => p.id)
      .sort();
    e.testemunhas = presentes;
    presentes.forEach((id) => {
      if (!estado.personagens[id].conhece.includes(e.id)) estado.personagens[id].conhece.push(e.id);
    });
  });
}

/** Passo 3: relatos entre personagens no mesmo local. */
async function passoRelatos(
  estado: EstadoMundo,
  dia: number,
  config: ConfigMotor,
  provedor: ProvedorLLM,
  registrar: Registrador
): Promise<void> {
  const candidatos = escolherRelatos({
    dia,
    semente: config.semente,
    contadores: config.agentesAtivos,
    personagens: estado.personagens,
    eventos: estado.eventos,
    janelaDias: config.janelaDias,
  });
  if (candidatos.length === 0) return;

  const porId = new Map(estado.eventos.map((e) => [e.id, e]));
  const nomeDe = (id: string) =>
    id === ID_JOGADOR ? 'um forasteiro' : config.mundo.agentes.find((a) => a.id === id)?.nome ?? id;
  const pedidos: PedidoRelato[] = candidatos.map((c, indice) => {
    const narrador = config.mundo.agentes.find((a) => a.id === c.deId)!;
    return {
      indice,
      narrador: { nome: narrador.nome, crencas: narrador.crencas, segredo: narrador.segredo, faccao: narrador.faccao },
      ouvinte: nomeDe(c.paraId),
      conteudoOriginal: porId.get(c.eventoId)!.conteudo,
    };
  });

  const resposta = await chamarERegistrar(
    provedor,
    {
      sistema: sistemaRelatos(config.mundo),
      usuario: usuarioRelatos(pedidos),
      esquema: RelatosDoDia,
      temperatura: config.temperatura,
      semente: sementeDaChamada(config.semente, dia, 'relatos'),
      maxTokens: config.maxTokens.relatos,
      meta: {
        tarefa: 'relatos',
        papel: 'relatos',
        dia,
        dadosSimulacao: { pedidos: pedidos.map((p) => ({ indice: p.indice, conteudoOriginal: p.conteudoOriginal })) },
      },
    },
    'relatos',
    registrar
  );
  const json = resposta?.json as RelatosDoDia | undefined;
  if (!json) return;

  const versoes = new Map<number, string>();
  json.relatos.forEach((r) => {
    if (!versoes.has(r.indice)) versoes.set(r.indice, r.versao);
  });
  candidatos.forEach((c, indice) => {
    const versao = versoes.get(indice);
    if (versao === undefined) return;
    const relato: Relato = {
      id: `R${dia}.${indice}`,
      dia,
      eventoId: c.eventoId,
      deId: c.deId,
      paraId: c.paraId,
      local: c.local,
      versao,
    };
    estado.relatos.push(relato);
    const ouvinte = estado.personagens[c.paraId];
    ouvinte.ouviu.push(relato.id);
    if (!ouvinte.conhece.includes(c.eventoId)) ouvinte.conhece.push(c.eventoId);
  });
}

/** Passos 4 e 5: detecção e curadoria. Compartilhado com o controle de três atos. */
export async function detectarECurar(
  estado: EstadoMundo,
  dia: number,
  params: {
    limiarEstabilidade: number;
    temperatura: number;
    semente: number;
    maxTokensCurador: number;
    nomeMundo: string;
  },
  curador: ProvedorLLM,
  registrar: Registrador
): Promise<void> {
  const r = detectarArcos(estado.eventos, dia, estado.tramas, params.limiarEstabilidade);
  estado.eventos = r.eventos as EventoCidade[];
  estado.tramas = r.tramas;
  estado.metricas.push(r.metrica);

  const estaveis = r.tramas.filter((t) => t.status === 'estavel').sort((a, b) => a.id.localeCompare(b.id));
  for (const trama of estaveis) {
    const cadeia = cadeiaCausal(estado.eventos, trama.id).map((e) => ({ id: e.id, conteudo: e.conteudo }));
    const resposta = await chamarERegistrar(
      curador,
      {
        sistema: sistemaCurador(),
        usuario: usuarioCurador(cadeia, params.nomeMundo),
        esquema: NarracaoCurador,
        temperatura: params.temperatura,
        semente: sementeDaChamada(params.semente, dia, `curador|${trama.id}`),
        maxTokens: params.maxTokensCurador,
        meta: { tarefa: 'curador', papel: 'curador', dia, dadosSimulacao: { cadeia } },
      },
      'curador',
      registrar
    );
    const json = resposta?.json as NarracaoCurador | undefined;
    const narracao: Narracao = {
      tramaId: trama.id,
      dia,
      cadeia,
      texto: json?.narracao ?? null,
      ...(json ? {} : { falhaEstrutura: resposta?.falhaEstrutura ?? 'erro na chamada' }),
    };
    estado.narracoes.push(narracao);
    // a trama estável passa a 'fechada' (narrada), como no modo jogável
    const alvo = estado.tramas.find((t) => t.id === trama.id) as Trama;
    alvo.status = 'fechada';
    alvo.narracaoFechamento = narracao.texto;
  }
}

export interface ResultadoDia {
  estado: EstadoMundo;
  eventosDoDia: EventoCidade[];
  stats: EstatisticasDia;
}

/**
 * Avança um dia. `acaoHumana` só é usada quando o jogador é humano (modo
 * jogável); no simulador, o jogador é sintético ou não existe.
 */
export async function avancarDia(
  estadoAnterior: EstadoMundo,
  config: ConfigMotor,
  provedores: ProvedoresMotor,
  registrar: Registrador,
  acaoHumana?: AcaoJogadorEntrada
): Promise<ResultadoDia> {
  const estado = clonar(estadoAnterior);
  const dia = estado.dia + 1;
  const stats: EstatisticasDia = { acoesDescartadas: 0, agentesSemAcao: 0, locaisInvalidos: 0 };

  // 1. ações dos agentes
  const novos = await passoAgentes(estado, dia, config, provedores.agentes, registrar, stats);

  // 2. ação do jogador
  if (config.jogador?.tipo === 'sintetico') {
    const provedorJogador = provedores.jogador;
    if (!provedorJogador) throw new Error('Jogador sintético sem provedor configurado.');
    const ev = await passoJogadorSintetico(estado, dia, config, config.jogador.perfil, provedorJogador, registrar, stats);
    if (ev) novos.push(ev);
  } else if (config.jogador?.tipo === 'humano' && acaoHumana) {
    novos.push(eventoDoJogador(estado, dia, config, acaoHumana, stats));
  }

  registrarTestemunhas(estado, novos);
  estado.eventos.push(...novos);

  // 3. relatos
  await passoRelatos(estado, dia, config, provedores.agentes, registrar);

  // 4 e 5. detecção e curadoria
  await detectarECurar(
    estado,
    dia,
    {
      limiarEstabilidade: config.limiarEstabilidade,
      temperatura: config.temperatura,
      semente: config.semente,
      maxTokensCurador: config.maxTokens.curador,
      nomeMundo: config.mundo.nome,
    },
    provedores.curador,
    registrar
  );

  estado.dia = dia;
  return { estado, eventosDoDia: novos, stats };
}
