import React, { useMemo } from 'react';
import type { Evento, Suspeito } from '../types';

interface Props {
  suspeitos: Suspeito[];
  eventosDoTurno: Evento[]; // alegações (tipo 'alegacao') já reveladas, filtradas pelo horário atual
}

const CORES = [
  'bg-amber-600 border-amber-400',
  'bg-sky-600 border-sky-400',
  'bg-rose-600 border-rose-400',
  'bg-emerald-600 border-emerald-400',
  'bg-violet-600 border-violet-400',
  'bg-orange-600 border-orange-400',
];

function corDoSuspeito(suspeitoId: string, suspeitos: Suspeito[]): string {
  const idx = suspeitos.findIndex((s) => s.id === suspeitoId);
  return CORES[idx % CORES.length] || CORES[0];
}

const Board: React.FC<Props> = ({ suspeitos, eventosDoTurno }) => {
  const porLocal = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of eventosDoTurno) {
      const lista = mapa.get(e.local) || [];
      lista.push(e);
      mapa.set(e.local, lista);
    }
    return mapa;
  }, [eventosDoTurno]);

  const locais = Array.from(porLocal.keys());

  if (locais.length === 0) {
    return (
      <div className="text-zinc-500 italic text-sm p-4 border border-zinc-800 rounded-lg bg-zinc-900/40">
        Nenhuma alegação registrada para este horário ainda. Interrogue os suspeitos para
        preencher o tabuleiro.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {locais.map((local) => {
        const eventos = porLocal.get(local)!;
        const suspeitosDistintos = new Set(eventos.map((e) => e.suspeitoId));
        const emConflito = suspeitosDistintos.size >= 2;

        return (
          <div
            key={local}
            className={`rounded-lg border p-3 bg-zinc-900/60 transition-shadow ${
              emConflito
                ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : 'border-zinc-700'
            }`}
          >
            <div className="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-2">
              📍 {local}
              {emConflito && (
                <span className="text-[10px] uppercase tracking-wide text-red-400 border border-red-500 rounded px-1">
                  conflito
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {eventos.map((e) => {
                const suspeito = suspeitos.find((s) => s.id === e.suspeitoId);
                return (
                  <span
                    key={e.id}
                    title={e.conteudo}
                    className={`text-xs px-2 py-1 rounded-full border text-white ${corDoSuspeito(
                      e.suspeitoId,
                      suspeitos
                    )}`}
                  >
                    {suspeito?.nome || e.suspeitoId}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Board;
