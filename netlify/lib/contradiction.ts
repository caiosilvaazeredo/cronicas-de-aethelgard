import type { Evento } from '../../investigation/types';

export interface DeteccaoResultado {
  status: Evento['status'];
  contradizComId: string | null;
  corroboraComId: string | null;
}

// Compara uma nova alegação contra o registro de eventos já existente do
// caso (eventos reais nunca mostrados ao jogador + alegações de outros
// suspeitos), comparando local e horário, como descrito no manual.
export function detectarContradicao(
  novaAlegacao: Pick<Evento, 'suspeitoId' | 'local' | 'horario'>,
  eventosExistentes: Evento[]
): DeteccaoResultado {
  // 1) Confronta com o evento REAL do mesmo suspeito no mesmo horário
  //    (verdade oculta ao jogador, usada apenas para detecção interna).
  const eventoReal = eventosExistentes.find(
    (e) =>
      e.tipo === 'real' &&
      e.suspeitoId === novaAlegacao.suspeitoId &&
      e.horario === novaAlegacao.horario
  );

  if (eventoReal) {
    if (normaliza(eventoReal.local) !== normaliza(novaAlegacao.local)) {
      return {
        status: 'contraditorio',
        contradizComId: eventoReal.id,
        corroboraComId: null,
      };
    }
    return {
      status: 'corroborado',
      contradizComId: null,
      corroboraComId: eventoReal.id,
    };
  }

  // 2) Confronta com alegações de OUTROS suspeitos no mesmo horário.
  //    Mesmo local => corrobora (dois relatos independentes se alinham).
  //    Não há aqui contradição direta entre dois suspeitos distintos sem
  //    um evento-âncora, pois cada alegação descreve o próprio suspeito.
  const alegacaoCorroborante = eventosExistentes.find(
    (e) =>
      e.tipo === 'alegacao' &&
      e.suspeitoId !== novaAlegacao.suspeitoId &&
      e.horario === novaAlegacao.horario &&
      normaliza(e.local) === normaliza(novaAlegacao.local)
  );

  if (alegacaoCorroborante) {
    return {
      status: 'corroborado',
      contradizComId: null,
      corroboraComId: alegacaoCorroborante.id,
    };
  }

  return { status: 'nao_verificado', contradizComId: null, corroboraComId: null };
}

function normaliza(s: string): string {
  return s.trim().toLowerCase();
}
