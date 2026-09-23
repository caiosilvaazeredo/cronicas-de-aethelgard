/**
 * Fábrica de provedores: nome do provedor + modelo -> ProvedorLLM.
 *
 * Também é aqui que se recusa identificador de modelo com cara de alias
 * móvel (`-latest`, nome sem versão). O manifesto de cada campanha registra o
 * identificador pedido e o `modeloEfetivo` que o provedor devolveu.
 */

import { ProvedorEstruturado, type NomeProvedor, type OpcoesEstruturado, type ProvedorLLM } from './provedor';
import { transporteSimulado, MODELO_SIMULADO, type OpcoesSimulado } from './simulado';

export interface RefModelo {
  provedor: NomeProvedor;
  modelo: string;
  /**
   * Declaração explícita, registrada no manifesto, de que um identificador
   * sem data ou sufixo de versão é, segundo a documentação do provedor
   * consultada, um modelo fixo e não um alias. Sem ela, a execução é recusada.
   */
  fixadoConfirmado?: boolean;
}

// Identificadores da Anthropic sem data que a documentação da API descreve
// como o identificador exato (não alias) do modelo. Conferido em 2026-09.
// Para modelos anteriores (ex.: claude-haiku-4-5, claude-sonnet-4-5) o nome
// sem data é alias de um snapshot datado, e o datado deve ser usado.
const ANTHROPIC_SEM_DATA_FIXOS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-opus-5',
  'claude-opus-5-5',
  'claude-sonnet-5',
  'claude-fable-5',
  'claude-fable-5-1',
]);

const DATA_AAAA_MM_DD = /-\d{4}-\d{2}-\d{2}$/;
const DATA_AAAAMMDD = /-\d{8}$/;
const VERSAO_GEMINI = /(-\d{3}|-\d{2}-\d{2}|-\d{2}-\d{4})$/;

/** Devolve null se o identificador é aceitável, ou o motivo da recusa. */
export function motivoRecusaModelo(ref: RefModelo): string | null {
  const { provedor, modelo } = ref;
  if (provedor === 'simulado') return null;
  if (!modelo || !modelo.trim()) return 'modelo vazio';
  if (/latest/i.test(modelo)) return `"${modelo}" é um alias móvel (contém "latest")`;
  if (!/\d/.test(modelo)) return `"${modelo}" não tem nenhum número de versão`;
  if (/(^|[-_:.])(stable|current|default|auto)$/i.test(modelo)) {
    return `"${modelo}" termina com um marcador de alias`;
  }

  const confirmado = ref.fixadoConfirmado === true;
  switch (provedor) {
    case 'openai':
      if (DATA_AAAA_MM_DD.test(modelo) || confirmado) return null;
      return `"${modelo}" não tem snapshot datado (ex.: -2025-08-07); use o identificador datado ou declare fixadoConfirmado`;
    case 'anthropic':
      if (DATA_AAAAMMDD.test(modelo) || ANTHROPIC_SEM_DATA_FIXOS.has(modelo) || confirmado) return null;
      return `"${modelo}" parece alias de um snapshot datado; use o identificador datado ou declare fixadoConfirmado`;
    case 'gemini':
      if (VERSAO_GEMINI.test(modelo) || confirmado) return null;
      return `"${modelo}" não tem sufixo de versão (ex.: -001); confirme na documentação que é estável e declare fixadoConfirmado`;
    case 'compativel-openai':
      if (/@sha256:[0-9a-f]+$/i.test(modelo)) return null;
      if (/:[^:]+$/.test(modelo) && !/:latest$/i.test(modelo)) return null;
      if (confirmado) return null;
      return `"${modelo}" não tem tag nem digest (ex.: llama3.1:8b-instruct-q4_K_M); declare fixadoConfirmado se a revisão estiver fixada no servidor`;
    default:
      return `provedor desconhecido: ${provedor}`;
  }
}

export function validarModelo(ref: RefModelo): void {
  const motivo = motivoRecusaModelo(ref);
  if (motivo) throw new Error(`Modelo recusado (${ref.provedor}): ${motivo}.`);
}

export interface OpcoesCriacao extends OpcoesEstruturado {
  simulado?: OpcoesSimulado;
}

export async function criarProvedor(ref: RefModelo, opcoes: OpcoesCriacao = {}): Promise<ProvedorLLM> {
  validarModelo(ref);
  switch (ref.provedor) {
    case 'simulado':
      return new ProvedorEstruturado('simulado', ref.modelo || MODELO_SIMULADO, transporteSimulado(opcoes.simulado), {
        esperaBaseMs: 0,
        ...opcoes,
      });
    case 'gemini': {
      const { transporteGemini } = await import('./gemini');
      return new ProvedorEstruturado('gemini', ref.modelo, transporteGemini(ref.modelo), opcoes);
    }
    case 'openai': {
      const { transporteOpenAI } = await import('./openai');
      return new ProvedorEstruturado('openai', ref.modelo, transporteOpenAI(ref.modelo), opcoes);
    }
    case 'anthropic': {
      const { transporteAnthropic } = await import('./anthropic');
      return new ProvedorEstruturado('anthropic', ref.modelo, transporteAnthropic(ref.modelo), opcoes);
    }
    case 'compativel-openai': {
      const { transporteCompativelOpenAI } = await import('./compativel-openai');
      return new ProvedorEstruturado('compativel-openai', ref.modelo, transporteCompativelOpenAI(ref.modelo), opcoes);
    }
    default:
      throw new Error(`Provedor desconhecido: ${(ref as RefModelo).provedor}`);
  }
}
