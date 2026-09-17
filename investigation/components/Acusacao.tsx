import React, { useState } from 'react';
import type { Suspeito, AcusarResposta } from '../types';
import * as api from '../api';

interface Props {
  sessaoId: string;
  suspeitos: Suspeito[];
  onRevelado: (resp: AcusarResposta) => void;
}

const Acusacao: React.FC<Props> = ({ sessaoId, suspeitos, onRevelado }) => {
  const [suspeitoId, setSuspeitoId] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const acusar = async () => {
    if (!suspeitoId) return;
    setCarregando(true);
    setErro(null);
    try {
      const resp = await api.acusar({ sessaoId, suspeitoId });
      onRevelado(resp);
    } catch (e: any) {
      setErro(e.message || 'Falha ao processar acusação.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="border border-red-800 rounded-lg bg-red-950/20 p-4 flex flex-col gap-3">
      <h3 className="text-lg font-bold text-red-400">Fazer a Acusação Final</h3>
      <p className="text-zinc-400 text-sm">
        Escolha com cuidado: a acusação encerra o caso e revela a verdade.
      </p>
      <select
        value={suspeitoId}
        onChange={(e) => setSuspeitoId(e.target.value)}
        className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white"
      >
        <option value="">Selecione um suspeito...</option>
        {suspeitos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome} — {s.papel}
          </option>
        ))}
      </select>

      {!confirmando ? (
        <button
          disabled={!suspeitoId}
          onClick={() => setConfirmando(true)}
          className="px-4 py-2 rounded bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold"
        >
          Acusar
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={carregando}
            onClick={acusar}
            className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {carregando ? 'Revelando...' : 'Confirmar acusação'}
          </button>
          <button
            disabled={carregando}
            onClick={() => setConfirmando(false)}
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {erro && <div className="text-red-400 text-sm">{erro}</div>}
    </div>
  );
};

export default Acusacao;
