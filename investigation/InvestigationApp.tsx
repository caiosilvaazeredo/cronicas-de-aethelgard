import React, { useEffect, useState } from 'react';
import type { CasoCompleto, Evento, AcusarResposta, CasoMestre } from './types';
import { BLOCOS_HORARIO } from './types';
import * as api from './api';
import CriarCaso from './components/CriarCaso';
import Board from './components/Board';
import Interrogatorio from './components/Interrogatorio';
import AuditGraph from './components/AuditGraph';
import Acusacao from './components/Acusacao';

interface Props {
  onVoltarMenu: () => void;
}

type Tela = 'criar' | 'jogando' | 'revelacao';

const InvestigationApp: React.FC<Props> = ({ onVoltarMenu }) => {
  const [tela, setTela] = useState<Tela>('criar');
  const [casoCompleto, setCasoCompleto] = useState<CasoCompleto | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [turnoAtual, setTurnoAtual] = useState<string>(BLOCOS_HORARIO[0]);
  const [modoMestre, setModoMestre] = useState(false);
  const [casoMestre, setCasoMestre] = useState<CasoMestre | null>(null);
  const [revelacao, setRevelacao] = useState<AcusarResposta | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(false);

  const handleCriado = async (caso: CasoCompleto) => {
    setCasoCompleto(caso);
    setTurnoAtual(caso.sessao.turnoAtual);
    setCarregandoInicial(true);
    try {
      const revelados = await api.listarEventosRevelados(caso.sessao.id);
      setEventos(revelados);
    } finally {
      setCarregandoInicial(false);
    }
    setTela('jogando');
  };

  const carregarModoMestre = async () => {
    if (!casoCompleto) return;
    const m = await api.obterCasoMestre(casoCompleto.caso.id);
    setCasoMestre(m);
  };

  useEffect(() => {
    if (modoMestre) carregarModoMestre();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoMestre]);

  const handleNovoEvento = (evento: Evento) => {
    setEventos((prev) => [...prev, evento]);
    if (modoMestre) carregarModoMestre();
  };

  const mudarTurno = async (novoTurno: string) => {
    setTurnoAtual(novoTurno);
    if (casoCompleto) {
      await api.atualizarTurno(casoCompleto.sessao.id, novoTurno).catch(() => {});
    }
  };

  const handleRevelado = (resp: AcusarResposta) => {
    setRevelacao(resp);
    setTela('revelacao');
  };

  if (tela === 'criar' || !casoCompleto) {
    return <CriarCaso onCriado={handleCriado} onVoltar={onVoltarMenu} />;
  }

  if (tela === 'revelacao' && revelacao) {
    const acusado = casoCompleto.suspeitos.find((s) => s.id === casoCompleto.sessao.acusacaoFinal);
    const culpado = casoCompleto.suspeitos.find((s) => s.id === revelacao.culpadoId);
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 border border-amber-700 rounded-lg bg-zinc-900/90 flex flex-col gap-4">
        <h2 className={`text-3xl font-bold ${revelacao.correto ? 'text-emerald-400' : 'text-red-400'}`}>
          {revelacao.correto ? 'Acusação correta!' : 'Acusação incorreta.'}
        </h2>
        <p className="text-zinc-400 text-sm">
          O verdadeiro culpado era <span className="text-amber-400 font-semibold">{culpado?.nome}</span>.
        </p>
        <div className="whitespace-pre-wrap text-zinc-200 leading-relaxed bg-zinc-950/60 p-4 rounded border border-zinc-800">
          {revelacao.revelacao}
        </div>
        <button
          onClick={onVoltarMenu}
          className="self-start px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
        >
          Voltar ao menu
        </button>
      </div>
    );
  }

  const eventosDoTurno = eventos.filter((e) => e.horario === turnoAtual);

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">{casoCompleto.caso.titulo}</h1>
          <p className="text-zinc-400 text-sm">{casoCompleto.caso.local}</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={modoMestre}
              onChange={(e) => setModoMestre(e.target.checked)}
            />
            Visão do mestre (grafo de auditoria)
          </label>
          <button onClick={onVoltarMenu} className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm">
            Sair
          </button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {BLOCOS_HORARIO.map((h) => (
          <button
            key={h}
            onClick={() => mudarTurno(h)}
            className={`px-3 py-1 rounded text-sm border ${
              h === turnoAtual
                ? 'bg-amber-700 border-amber-400 text-white'
                : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-2">Tabuleiro — {turnoAtual}</h2>
        {carregandoInicial ? (
          <div className="text-zinc-500 text-sm">Carregando alegações iniciais...</div>
        ) : (
          <Board suspeitos={casoCompleto.suspeitos} eventosDoTurno={eventosDoTurno} />
        )}
      </section>

      {modoMestre && casoMestre && (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-2">
            Grafo de auditoria (mestre/pesquisador)
          </h2>
          <AuditGraph suspeitos={casoMestre.suspeitos} eventos={casoMestre.eventos} />
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Interrogatorio
          sessaoId={casoCompleto.sessao.id}
          suspeitos={casoCompleto.suspeitos}
          eventos={eventos}
          onNovoEvento={handleNovoEvento}
        />
        <Acusacao
          sessaoId={casoCompleto.sessao.id}
          suspeitos={casoCompleto.suspeitos}
          onRevelado={handleRevelado}
        />
      </div>
    </div>
  );
};

export default InvestigationApp;
