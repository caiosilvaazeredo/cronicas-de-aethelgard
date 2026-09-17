import React, { useState } from 'react';
import type { CasoCompleto } from '../types';
import * as api from '../api';

interface Props {
  onCriado: (caso: CasoCompleto) => void;
  onVoltar: () => void;
}

const CriarCaso: React.FC<Props> = ({ onCriado, onVoltar }) => {
  const [tema, setTema] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const caso = await api.criarCaso(tema.trim() || undefined);
      onCriado(caso);
    } catch (e: any) {
      setErro(e.message || 'Falha ao gerar o caso.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 flex flex-col gap-4 p-6 border border-zinc-700 rounded-lg bg-zinc-900/80">
      <h2 className="text-2xl font-bold text-amber-400">Nova Investigação</h2>
      <p className="text-zinc-400 text-sm">
        Um caso em Aethelgard será gerado agora: culpado, motivo, e a linha do tempo real
        de cada suspeito na noite do caso. Nada disso é revelado ainda — você vai descobrir
        através dos interrogatórios.
      </p>
      <input
        value={tema}
        onChange={(e) => setTema(e.target.value)}
        placeholder='Ambientação opcional (ex: "a guarnição de Aldenwatch")'
        className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white"
      />
      <div className="flex gap-2">
        <button
          onClick={criar}
          disabled={carregando}
          className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {carregando ? 'Gerando caso...' : 'Gerar Caso'}
        </button>
        <button
          onClick={onVoltar}
          disabled={carregando}
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
        >
          Voltar
        </button>
      </div>
      {erro && <div className="text-red-400 text-sm">{erro}</div>}
    </div>
  );
};

export default CriarCaso;
