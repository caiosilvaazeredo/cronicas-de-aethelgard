import type {
  CasoCompleto,
  CasoMestre,
  Sessao,
  Evento,
  PerguntarPayload,
  PerguntarResposta,
  AcusarPayload,
  AcusarResposta,
  Suspeito,
  CasoPublico,
} from './types';

async function chamar<T>(fn: string, action: string, payload?: any): Promise<T> {
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Falha ao chamar ${fn}/${action}`);
  }
  return data as T;
}

export function criarCaso(tema?: string): Promise<CasoCompleto> {
  return chamar('investigacao-caso', 'criarCaso', { tema });
}

export function obterCaso(casoId: string): Promise<{ caso: CasoPublico; suspeitos: Suspeito[] }> {
  return chamar('investigacao-caso', 'obterCaso', { casoId });
}

export function obterCasoMestre(casoId: string): Promise<CasoMestre> {
  return chamar('investigacao-caso', 'obterCasoMestre', { casoId });
}

export function obterSessao(sessaoId: string): Promise<Sessao> {
  return chamar('investigacao-caso', 'obterSessao', { sessaoId });
}

export function atualizarTurno(sessaoId: string, turnoAtual: string): Promise<{ ok: true }> {
  return chamar('investigacao-caso', 'atualizarTurno', { sessaoId, turnoAtual });
}

export function perguntar(payload: PerguntarPayload): Promise<PerguntarResposta> {
  return chamar('investigacao-interrogatorio', 'perguntar', payload);
}

export function listarEventosRevelados(sessaoId: string): Promise<Evento[]> {
  return chamar('investigacao-interrogatorio', 'listarEventosRevelados', { sessaoId });
}

export function acusar(payload: AcusarPayload): Promise<AcusarResposta> {
  return chamar('investigacao-acusacao', 'acusar', payload);
}
