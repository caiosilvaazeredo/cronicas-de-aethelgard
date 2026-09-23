/**
 * Tipos do modo Cidade Viva. O mundo não conhece duração, fases nem metas
 * narrativas: só lugares, pessoas, o que querem, o que escondem e no que
 * acreditam.
 */

import type { StoryEvent, Trama, MetricaConvergencia } from '../../types';

export interface Local {
  id: string;
  nome: string;
  descricao: string;
}

export interface ConfigAgente {
  id: string;
  nome: string;
  faccao: string | null;
  objetivo: string; // o que ele quer; não o que vai acontecer
  segredo: string | null;
  localInicial: string;
  crencas: string[]; // o que ele acredita no início
}

export interface Faccao {
  id: string;
  nome: string;
  interesse: string;
}

export interface ConfigMundo {
  id: string;
  nome: string;
  descricao?: string;
  locais: Local[];
  agentes: ConfigAgente[];
  faccoes: Faccao[];
  /**
   * Subconjuntos de agentes para o experimento de número de agentes. A chave
   * é o número de agentes; o valor, os ids. Sem variante, usa todos.
   */
  variantes?: Record<string, string[]>;
}

export const ID_JOGADOR = 'jogador';

export type PerfilJogador = 'investigador' | 'intrometido' | 'passivo';

/** Um StoryEvent do grafo, com o que o motor sabe além do que o arcos.ts usa. */
export interface EventoCidade extends StoryEvent {
  dia: number;
  autorId: string; // id do agente, ou 'jogador'
  local: string;
  testemunhas: string[]; // quem estava no mesmo local ao fim do dia
}

/** A versão contada de um evento real, de um agente a outro. */
export interface Relato {
  id: string;
  dia: number;
  eventoId: string; // o evento real
  deId: string;
  paraId: string;
  local: string;
  versao: string; // o que foi dito
  falhaEstrutura?: boolean;
}

export interface EstadoPersonagem {
  id: string;
  local: string;
  /** ids de eventos que viu ou ouviu, na ordem em que soube */
  conhece: string[];
  /** ids de relatos que ouviu */
  ouviu: string[];
}

export interface Narracao {
  tramaId: string;
  dia: number;
  cadeia: { id: string; conteudo: string }[];
  texto: string | null;
  falhaEstrutura?: string;
}

export interface EstadoMundo {
  dia: number; // último dia concluído (0 = nenhum)
  personagens: Record<string, EstadoPersonagem>;
  eventos: EventoCidade[];
  relatos: Relato[];
  tramas: Trama[];
  metricas: MetricaConvergencia[];
  narracoes: Narracao[];
}
