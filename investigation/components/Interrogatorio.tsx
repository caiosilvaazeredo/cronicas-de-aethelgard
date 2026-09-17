import React, { useState } from 'react';
import type { Evento, Suspeito } from '../types';
import * as api from '../api';

interface Props {
  sessaoId: string;
  suspeitos: Suspeito[];
  eventos: Evento[];
  onNovoEvento: (evento: Evento) => void;
}

interface Turno {
  suspeitoId: string;
  pergunta: string;
  falaProsa: string;
  evento: Evento;
}

const Interrogatorio: React.FC<Props> = ({ sessaoId, suspeitos, eventos, onNovoEvento }) => {
  const [suspeitoId, setSuspeitoId] = useState(suspeitos[0]?.id || '');
  const [pergunta, setPergunta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const enviarPergunta = async (
    perguntaTexto: string,
    confrontoComContradicao?: string
  ) => {
    if (!suspeitoId || !perguntaTexto.trim()) return;
    setCarregando(true);
    setErro(null);
    try {
      const resp = await api.perguntar({
        sessaoId,
        suspeitoId,
        pergunta: perguntaTexto,
        confrontoComContradicao,
      });
      setHistorico((h) => [
        ...h,
        { suspeitoId, pergunta: perguntaTexto, falaProsa: resp.falaProsa, evento: resp.evento },
      ]);
      onNovoEvento(resp.evento);
      setPergunta('');
    } catch (e: any) {
      setErro(e.message || 'Falha ao interrogar suspeito.');
    } finally {
      setCarregando(false);
    }
  };

  const suspeitoAtual = suspeitos.find((s) => s.id === suspeitoId);

  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-900/60 p-4 flex flex-col gap-3">
      <h3 className="text-lg font-bold text-amber-400">Interrogatório</h3>

      <div className="flex gap-2 flex-wrap">
        {suspeitos.map((s) => (
          <button
            key={s.id}
            onClick={() => setSuspeitoId(s.id)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              s.id === suspeitoId
                ? 'bg-amber-700 border-amber-400 text-white'
                : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {s.nome}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 text-sm">
        {historico
          .filter((t) => t.suspeitoId === suspeitoId)
          .map((t, i) => (
            <div key={i} className="bg-zinc-800/60 rounded p-2">
              <div className="text-zinc-400 italic mb-1">Você: {t.pergunta}</div>
              <div className="text-zinc-100 whitespace-pre-wrap">{t.falaProsa}</div>
              {t.evento.status === 'contraditorio' && (
                <button
                  onClick={() =>
                    enviarPergunta(
                      `Confronto você com uma contradição sobre "${t.evento.local}" às ${t.evento.horario}: seu relato não bate com outro fato registrado.`,
                      `Alegação anterior do próprio suspeito: local="${t.evento.local}", horário=${t.evento.horario}, conteúdo="${t.evento.conteudo}". Isso contradiz um fato já verificado.`
                    )
                  }
                  className="mt-2 text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
                >
                  ⚔️ Confrontar com a contradição
                </button>
              )}
            </div>
          ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviarPergunta(pergunta);
        }}
        className="flex gap-2"
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder={suspeitoAtual ? `Pergunte a ${suspeitoAtual.nome}...` : 'Pergunte...'}
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white"
          disabled={carregando}
        />
        <button
          type="submit"
          disabled={carregando || !pergunta.trim()}
          className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {carregando ? '...' : 'Perguntar'}
        </button>
      </form>

      {erro && <div className="text-red-400 text-sm">{erro}</div>}
    </div>
  );
};

export default Interrogatorio;
