import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Evento, Suspeito } from '../types';

interface Props {
  suspeitos: Suspeito[];
  eventos: Evento[];
}

const COL_X = { suspeito: 0, local: 280, real: 560, alegacao: 860 };

const AuditGraph: React.FC<Props> = ({ suspeitos, eventos }) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    suspeitos.forEach((s, i) => {
      nodes.push({
        id: `suspeito:${s.id}`,
        position: { x: COL_X.suspeito, y: i * 100 },
        data: { label: `🕵️ ${s.nome}\n${s.papel}` },
        style: {
          background: '#3f3f46',
          color: 'white',
          border: '1px solid #a1a1aa',
          borderRadius: 8,
          fontSize: 11,
          whiteSpace: 'pre-line',
          width: 180,
        },
      });
    });

    const locais = Array.from(new Set(eventos.map((e) => e.local)));
    locais.forEach((local, i) => {
      nodes.push({
        id: `local:${local}`,
        position: { x: COL_X.local, y: i * 80 },
        data: { label: `📍 ${local}` },
        style: {
          background: '#292524',
          color: '#fde68a',
          border: '1px dashed #a8a29e',
          borderRadius: 8,
          fontSize: 11,
          width: 160,
        },
      });
    });

    const reais = eventos.filter((e) => e.tipo === 'real');
    reais.forEach((e, i) => {
      nodes.push({
        id: `evento:${e.id}`,
        position: { x: COL_X.real, y: i * 90 },
        data: { label: `✅ REAL · ${e.horario}\n${e.conteudo.slice(0, 60)}` },
        style: {
          background: '#052e16',
          color: '#bbf7d0',
          border: '1px solid #22c55e',
          borderRadius: 8,
          fontSize: 10,
          whiteSpace: 'pre-line',
          width: 200,
        },
      });
      edges.push({
        id: `ocorre:${e.id}`,
        source: `evento:${e.id}`,
        target: `local:${e.local}`,
        style: { stroke: '#57534e' },
        type: 'straight',
      });
    });

    const alegacoes = eventos.filter((e) => e.tipo === 'alegacao');
    alegacoes.forEach((e, i) => {
      nodes.push({
        id: `evento:${e.id}`,
        position: { x: COL_X.alegacao, y: i * 90 },
        data: { label: `💬 ${e.horario}\n${e.conteudo.slice(0, 60)}` },
        style: {
          background:
            e.status === 'contraditorio' ? '#450a0a' : e.status === 'corroborado' ? '#052e16' : '#1c1917',
          color:
            e.status === 'contraditorio' ? '#fca5a5' : e.status === 'corroborado' ? '#bbf7d0' : '#e7e5e4',
          border: `1px solid ${
            e.status === 'contraditorio' ? '#ef4444' : e.status === 'corroborado' ? '#22c55e' : '#78716c'
          }`,
          borderRadius: 8,
          fontSize: 10,
          whiteSpace: 'pre-line',
          width: 200,
        },
      });

      edges.push({
        id: `afirma:${e.id}`,
        source: `suspeito:${e.suspeitoId}`,
        target: `evento:${e.id}`,
        label: 'afirma',
        style: { stroke: '#a1a1aa' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa' },
      });

      edges.push({
        id: `ocorre:${e.id}`,
        source: `evento:${e.id}`,
        target: `local:${e.local}`,
        style: { stroke: '#57534e' },
        type: 'straight',
      });

      if (e.contradizComId) {
        edges.push({
          id: `contradiz:${e.id}`,
          source: `evento:${e.id}`,
          target: `evento:${e.contradizComId}`,
          label: 'contradiz',
          animated: true,
          style: { stroke: '#ef4444', strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        });
      }
      if (e.corroboraComId) {
        edges.push({
          id: `corrobora:${e.id}`,
          source: `evento:${e.id}`,
          target: `evento:${e.corroboraComId}`,
          label: 'corrobora',
          style: { stroke: '#22c55e' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        });
      }
    });

    return { nodes, edges };
  }, [suspeitos, eventos]);

  return (
    <div className="w-full h-[520px] rounded-lg border border-zinc-700 bg-zinc-950">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#3f3f46" gap={20} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={() => '#71717a'}
        />
      </ReactFlow>
    </div>
  );
};

export default AuditGraph;
