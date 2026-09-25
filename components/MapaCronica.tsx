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
import { pontesEArticulacoes, type EventoGrafo, type TipoLigacao } from '../services/grafo';
import { desfechoDaTrama, type Linhagem, type RegistroTrama } from '../services/linhagem';
import LinhagemTramas from './LinhagemTramas';

interface Props {
  eventos: StoryEvent[];
  tramas: Trama[];
  onGerarFechamento: (tramaId: string) => void;
  gerandoTramaId: string | null;
  onFechar: () => void;
  /** nascimento, fusão e fechamento das tramas (Cidade Viva); opcional */
  linhagem?: Linhagem | null;
  /** o que mostrar no rodapé do botão de fechar (padrão: voltar à aventura) */
  rotuloFechar?: string;
}

const CORES_TRAMA = ['#c5a059', '#7dd3fc', '#f472b6', '#86efac', '#fca5a5', '#c4b5fd', '#fdba74'];
const LABEL_PAPEL: Record<PapelCausal, string> = {
  origem: 'origem',
  desdobramento: 'desdobramento',
  desfecho: 'desfecho',
  ponta: 'ponta solta',
  satelite: 'satélite',
};
const LABEL_TIPO: Record<TipoLigacao, string> = {
  motivou: 'motivou',
  possibilitou: 'possibilitou',
  reagiu: 'reagiu',
  lembrou: 'lembrou',
};

const LANE_HEIGHT = 130;
const X_POR_TURNO = 110;
const MIN_LADO_FUSAO = 3;

const MapaCronica: React.FC<Props> = ({ eventos, tramas, onGerarFechamento, gerandoTramaId, onFechar, linhagem, rotuloFechar }) => {
  const [selecionado, setSelecionado] = useState<StoryEvent | null>(null);
  const [tramaSelecionada, setTramaSelecionada] = useState<Trama | null>(null);
  const [verLinhagem, setVerLinhagem] = useState(false);
  const [destacarPontes, setDestacarPontes] = useState(true);

  const { entrada, saida } = useMemo(() => construirArestas(eventos), [eventos]);
  const estrutura = useMemo(() => pontesEArticulacoes(eventos), [eventos]);
  const articulacoes = useMemo(() => new Set(estrutura.articulacoes), [estrutura]);
  const pontes = useMemo(() => {
    const m = new Map<string, boolean>(); // chave origem>destino -> é ponte de fusão
    estrutura.pontes.forEach((p) => m.set(`${p.a}>${p.b}`, p.ladoA >= MIN_LADO_FUSAO && p.ladoB >= MIN_LADO_FUSAO));
    return m;
  }, [estrutura]);
  const eventosDeFusao = useMemo(() => {
    const m = new Map<string, string[]>(); // evento -> tramas que ele fundiu
    (Object.values(linhagem?.tramas ?? {}) as RegistroTrama[]).forEach((t) =>
      t.fundidaPorEventos.forEach((e) => m.set(e, [...(m.get(e) ?? []), t.id]))
    );
    return m;
  }, [linhagem]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    tramas.forEach((trama, lane) => {
      const cor = CORES_TRAMA[lane % CORES_TRAMA.length];
      const cadeia = cadeiaCausal(eventos, trama.id);
      cadeia.forEach((e) => {
        const papel = papelDoEvento(e, entrada, saida, trama.status !== 'aberta');
        const tamanho = 34 + e.tensao * 5;
        const fundiu = eventosDeFusao.has(e.id);
        const articula = destacarPontes && articulacoes.has(e.id);
        nodes.push({
          id: e.id,
          position: { x: e.turno * X_POR_TURNO, y: lane * LANE_HEIGHT },
          data: { label: `${fundiu ? '⨝ ' : ''}${e.conteudo.slice(0, 40)}` },
          style: {
            width: tamanho,
            height: tamanho,
            borderRadius: '50%',
            background: papel === 'ponta' ? '#292524' : cor,
            color: papel === 'ponta' ? cor : '#0f0f1b',
            border: fundiu ? '4px double #f8fafc' : articula ? '3px dashed #f8fafc' : `2px solid ${cor}`,
            fontSize: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 2,
            cursor: 'pointer',
          },
        });
        const tipos = new Map(((e as EventoGrafo).ligacoes ?? []).map((l) => [l.id, l]));
        (e.causadoPor || []).forEach((origemId) => {
          if (!(entrada.get(e.id) || []).includes(origemId)) return;
          const mesmaTrama = eventos.find((x) => x.id === origemId)?.tramaId === e.tramaId;
          const ponte = pontes.get(`${origemId}>${e.id}`);
          const ehPonteDeFusao = destacarPontes && ponte === true;
          const lig = tipos.get(origemId);
          const corAresta = ehPonteDeFusao ? '#ef4444' : mesmaTrama ? cor : '#f8fafc';
          const rotulo = ehPonteDeFusao ? 'ponte de fusão' : lig ? `${LABEL_TIPO[lig.tipo]} · ${lig.forca}` : mesmaTrama ? undefined : 'convergência';
          edges.push({
            id: `${origemId}->${e.id}`,
            source: origemId,
            target: e.id,
            style: {
              stroke: corAresta,
              strokeWidth: lig ? 0.8 + lig.forca : ehPonteDeFusao ? 3 : mesmaTrama ? 1.5 : 3,
              strokeDasharray: lig?.tipo === 'lembrou' ? '2 4' : destacarPontes && ponte !== undefined && !ehPonteDeFusao ? '6 3' : undefined,
            },
            animated: !mesmaTrama || ehPonteDeFusao,
            markerEnd: { type: MarkerType.ArrowClosed, color: corAresta },
            label: rotulo,
            labelStyle: { fontSize: 8 },
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
  }, [eventos, tramas, entrada, saida, pontes, articulacoes, eventosDeFusao, destacarPontes]);

  const handleNodeClick = (_: any, node: Node) => {
    const evento = eventos.find((e) => e.id === node.id);
    if (evento) {
      setSelecionado(evento);
      setTramaSelecionada(tramas.find((t) => t.id === evento.tramaId) || null);
    }
  };

  const registrosLinhagem = useMemo(
    () => (Object.values(linhagem?.tramas ?? {}) as RegistroTrama[]).sort((a, b) => a.nasceuEm - b.nasceuEm || a.id.localeCompare(b.id)),
    [linhagem]
  );
  const ultimaLinhagem = linhagem?.dias[linhagem.dias.length - 1];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0f1b] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b-2 border-[#c5a059]/30 gap-3 flex-wrap">
        <div>
          <h2 className="font-title text-[#c5a059] uppercase text-lg">Mapa da Crônica</h2>
          <p className="text-zinc-500 text-xs">
            {tramas.filter((t) => t.status !== 'aberta').length} trama(s) fechável(is) ·{' '}
            {tramas.filter((t) => t.status === 'aberta').length} em aberto — sem fim previsto.
            {ultimaLinhagem && (
              <>
                {' '}
                · linhagem: {ultimaLinhagem.nascidasAcum} nascidas, {ultimaLinhagem.fechadasAcum} fechadas por
                estabilidade, {ultimaLinhagem.fundidasAcum} absorvidas por fusão
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDestacarPontes((v) => !v)}
            className={`px-3 py-2 rounded text-xs font-title uppercase ${destacarPontes ? 'bg-[#2b1b3d] text-white' : 'bg-zinc-800 text-zinc-400'}`}
            title="Pontes (tracejado), pontes de fusão (vermelho) e pontos de articulação (borda tracejada)"
          >
            Pontes
          </button>
          {linhagem && (
            <button
              onClick={() => setVerLinhagem((v) => !v)}
              className={`px-3 py-2 rounded text-xs font-title uppercase ${verLinhagem ? 'bg-[#2b1b3d] text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >
              Linhagem
            </button>
          )}
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-title uppercase"
          >
            {rotuloFechar ?? 'Voltar à aventura'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0">
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
          {verLinhagem && linhagem && (
            <div className="border-t-2 border-[#c5a059]/20 bg-[#14141f] max-h-[40%] overflow-auto">
              <LinhagemTramas linhagem={linhagem} />
            </div>
          )}
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
                  {linhagem?.tramas[t.id]?.absorveu.length ? (
                    <span className="block text-zinc-500 text-[10px]">
                      absorveu {linhagem.tramas[t.id].absorveu.map((a) => `${a.id} (dia ${a.dia})`).join(', ')}
                    </span>
                  ) : null}
                </button>
              ))}
              {tramas.length === 0 && (
                <p className="text-zinc-600 text-xs italic">Nenhuma trama detectada ainda.</p>
              )}
            </div>
          </div>

          {registrosLinhagem.some((r) => desfechoDaTrama(r) === 'fundida') && (
            <div>
              <h3 className="text-[#c5a059] font-title text-[10px] uppercase mb-2">Absorvidas por fusão</h3>
              <ul className="space-y-1 text-xs text-zinc-400">
                {registrosLinhagem
                  .filter((r) => desfechoDaTrama(r) === 'fundida')
                  .map((r) => (
                    <li key={r.id}>
                      {r.id} → {r.absorvidaPor} no dia {r.fundiuEm}
                      {r.fundidaPorEventos.length > 0 && (
                        <span className="text-zinc-600"> (por {r.fundidaPorEventos.join(', ')})</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

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
                {articulacoes.has(selecionado.id) && ' · ponto de articulação'}
                {eventosDeFusao.has(selecionado.id) && ` · fundiu ${eventosDeFusao.get(selecionado.id)!.join(', ')}`}
              </p>
              {((selecionado as EventoGrafo).ligacoes ?? []).length > 0 && (
                <ul className="mt-2 text-[10px] text-zinc-400 space-y-0.5">
                  {(selecionado as EventoGrafo).ligacoes!.map((l) => (
                    <li key={l.id}>
                      {l.id}: {LABEL_TIPO[l.tipo]}, força {l.forca}
                    </li>
                  ))}
                </ul>
              )}
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

          <div className="border-t border-zinc-800 pt-4 text-[10px] text-zinc-500 space-y-1">
            <p>⨝ e borda dupla: evento que fundiu tramas.</p>
            <p>Borda tracejada: ponto de articulação (sozinho, mantém duas partes unidas).</p>
            <p>Seta vermelha: ponte de fusão (ligação única entre duas linhas com {MIN_LADO_FUSAO}+ eventos).</p>
            <p>Com ligações tipadas: espessura = força; pontilhado = só lembrou.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapaCronica;
