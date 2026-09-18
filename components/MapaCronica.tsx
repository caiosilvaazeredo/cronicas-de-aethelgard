import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StoryEvent, Trama, PapelCausal } from '../types';
import { construirArestas, papelDoEvento, cadeiaCausal } from '../services/arcos';

interface Props {
  eventos: StoryEvent[];
  tramas: Trama[];
  onGerarFechamento: (tramaId: string) => void;
  gerandoTramaId: string | null;
  onFechar: () => void;
}

const CORES_TRAMA = ['#c5a059', '#7dd3fc', '#f472b6', '#86efac', '#fca5a5', '#c4b5fd', '#fdba74'];
const LABEL_PAPEL: Record<PapelCausal, string> = {
  origem: 'origem',
  desdobramento: 'desdobramento',
  desfecho: 'desfecho',
  ponta: 'ponta solta',
  satelite: 'satélite',
};

const LANE_HEIGHT = 130;
const X_POR_TURNO = 110;

const MapaCronica: React.FC<Props> = ({ eventos, tramas, onGerarFechamento, gerandoTramaId, onFechar }) => {
  const [selecionado, setSelecionado] = useState<StoryEvent | null>(null);
  const [tramaSelecionada, setTramaSelecionada] = useState<Trama | null>(null);

  const { entrada, saida } = useMemo(() => construirArestas(eventos), [eventos]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    tramas.forEach((trama, lane) => {
      const cor = CORES_TRAMA[lane % CORES_TRAMA.length];
      const cadeia = cadeiaCausal(eventos, trama.id);
      cadeia.forEach((e) => {
        const papel = papelDoEvento(e, entrada, saida, trama.status !== 'aberta');
        const tamanho = 34 + e.tensao * 5;
        nodes.push({
          id: e.id,
          position: { x: e.turno * X_POR_TURNO, y: lane * LANE_HEIGHT },
          data: { label: `${e.conteudo.slice(0, 40)}` },
          style: {
            width: tamanho,
            height: tamanho,
            borderRadius: '50%',
            background: papel === 'ponta' ? '#292524' : cor,
            color: papel === 'ponta' ? cor : '#0f0f1b',
            border: `2px solid ${cor}`,
            fontSize: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 2,
            cursor: 'pointer',
          },
        });
        (e.causadoPor || []).forEach((origemId) => {
          if (!(entrada.get(e.id) || []).includes(origemId)) return;
          const mesmaTrama = eventos.find((x) => x.id === origemId)?.tramaId === e.tramaId;
          edges.push({
            id: `${origemId}->${e.id}`,
            source: origemId,
            target: e.id,
            style: { stroke: mesmaTrama ? cor : '#f8fafc', strokeWidth: mesmaTrama ? 1.5 : 3 },
            animated: !mesmaTrama,
            markerEnd: { type: MarkerType.ArrowClosed, color: mesmaTrama ? cor : '#f8fafc' },
            label: mesmaTrama ? undefined : 'convergência',
          });
        });
      });
    });

    const satelites = eventos.filter((e) => !e.ehKernel);
    const ySatelites = tramas.length * LANE_HEIGHT + 40;
    satelites.forEach((e) => {
      nodes.push({
        id: e.id,
        position: { x: e.turno * X_POR_TURNO, y: ySatelites },
        data: { label: '' },
        style: {
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#52525b',
          border: '1px solid #71717a',
          opacity: 0.6,
          cursor: 'pointer',
        },
      });
    });

    return { nodes, edges };
  }, [eventos, tramas, entrada, saida]);

  const handleNodeClick = (_: any, node: Node) => {
    const evento = eventos.find((e) => e.id === node.id);
    if (evento) {
      setSelecionado(evento);
      setTramaSelecionada(tramas.find((t) => t.id === evento.tramaId) || null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0f1b] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b-2 border-[#c5a059]/30">
        <div>
          <h2 className="font-title text-[#c5a059] uppercase text-lg">Mapa da Crônica</h2>
          <p className="text-zinc-500 text-xs">
            {tramas.filter((t) => t.status !== 'aberta').length} trama(s) fechável(is) ·{' '}
            {tramas.filter((t) => t.status === 'aberta').length} em aberto — sem fim previsto.
          </p>
        </div>
        <button
          onClick={onFechar}
          className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-title uppercase"
        >
          Voltar à aventura
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#292524" gap={24} />
            <Controls />
          </ReactFlow>
        </div>

        <div className="w-80 border-l-2 border-[#c5a059]/20 p-4 overflow-y-auto space-y-4 bg-[#14141f]">
          <div>
            <h3 className="text-[#c5a059] font-title text-[10px] uppercase mb-2">Tramas</h3>
            <div className="space-y-2">
              {tramas.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setTramaSelecionada(t)}
                  className="w-full text-left p-2 rounded border text-xs"
                  style={{ borderColor: CORES_TRAMA[i % CORES_TRAMA.length] }}
                >
                  <span style={{ color: CORES_TRAMA[i % CORES_TRAMA.length] }}>● </span>
                  {t.id}{' '}
                  <span className="text-zinc-500">
                    ({t.status === 'aberta' ? 'ponta solta' : t.status === 'estavel' ? 'fechável' : 'fechada'})
                  </span>
                </button>
              ))}
              {tramas.length === 0 && (
                <p className="text-zinc-600 text-xs italic">Nenhuma trama detectada ainda.</p>
              )}
            </div>
          </div>

          {selecionado && (
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-[#c5a059] font-title text-[10px] uppercase mb-2">Evento</h3>
              <p className="text-zinc-300 text-xs leading-relaxed mb-2">{selecionado.conteudo}</p>
              <p className="text-zinc-500 text-[10px]">
                Turno {selecionado.turno} · tensão {selecionado.tensao}/10 · papel:{' '}
                {LABEL_PAPEL[
                  papelDoEvento(
                    selecionado,
                    entrada,
                    saida,
                    (tramas.find((t) => t.id === selecionado.tramaId)?.status ?? 'aberta') !== 'aberta'
                  )
                ]}
              </p>
            </div>
          )}

          {tramaSelecionada && (
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-[#c5a059] font-title text-[10px] uppercase mb-2">
                Trama {tramaSelecionada.id}
              </h3>
              {tramaSelecionada.status === 'aberta' && (
                <p className="text-zinc-500 text-xs italic">
                  Ainda em aberto. Sem fechamento inventado — a sessão acabou, a história não
                  necessariamente.
                </p>
              )}
              {tramaSelecionada.status === 'estavel' && (
                <button
                  onClick={() => onGerarFechamento(tramaSelecionada.id)}
                  disabled={gerandoTramaId === tramaSelecionada.id}
                  className="px-3 py-2 rounded bg-[#c5a059] text-black text-xs font-title uppercase hover:bg-white disabled:opacity-50"
                >
                  {gerandoTramaId === tramaSelecionada.id ? 'Narrando...' : 'Narrar fechamento'}
                </button>
              )}
              {tramaSelecionada.status === 'fechada' && tramaSelecionada.narracaoFechamento && (
                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">
                  {tramaSelecionada.narracaoFechamento}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapaCronica;
