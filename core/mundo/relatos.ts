/**
 * Propagação mínima de relatos: o suficiente para existir o par evento real
 * e versão contada, necessário ao experimento de contradição.
 *
 * Regra: cada agente pode, por dia, contar a outro personagem que está no
 * mesmo local um evento recente que ele conhece (viu ou ouviu) e que o outro
 * ainda não conhece. A escolha de quem conta o quê a quem é sorteada com a
 * semente da sessão, para ser reprodutível.
 */

import { criarRng, hashTexto } from '../util/aleatorio';
import type { EstadoPersonagem, EventoCidade } from './tipos';

export interface CandidatoRelato {
  deId: string;
  paraId: string;
  eventoId: string;
  local: string;
}

export function escolherRelatos(params: {
  dia: number;
  semente: number;
  contadores: string[]; // quem pode contar (agentes ativos)
  personagens: Record<string, EstadoPersonagem>;
  eventos: EventoCidade[];
  janelaDias: number;
}): CandidatoRelato[] {
  const { dia, semente, contadores, personagens, eventos, janelaDias } = params;
  const rng = criarRng(hashTexto(`${semente}|relatos|${dia}`));
  const recentes = new Map(eventos.filter((e) => e.dia > dia - janelaDias).map((e) => [e.id, e]));
  const escolhidos: CandidatoRelato[] = [];

  [...contadores].sort().forEach((deId) => {
    const narrador = personagens[deId];
    if (!narrador) return;
    const ouvintes = Object.values(personagens)
      .filter((p) => p.id !== deId && p.local === narrador.local)
      .map((p) => p.id)
      .sort();
    if (ouvintes.length === 0) return;

    const pares: { paraId: string; eventoId: string }[] = [];
    narrador.conhece.forEach((eventoId) => {
      const ev = recentes.get(eventoId);
      if (!ev) return;
      ouvintes.forEach((paraId) => {
        if (!personagens[paraId].conhece.includes(eventoId)) pares.push({ paraId, eventoId });
      });
    });
    if (pares.length === 0) return;
    const par = pares[Math.floor(rng() * pares.length)];
    escolhidos.push({ deId, paraId: par.paraId, eventoId: par.eventoId, local: narrador.local });
  });

  return escolhidos;
}
