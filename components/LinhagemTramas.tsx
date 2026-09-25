import React, { useMemo } from 'react';
import { desfechoDaTrama, type Linhagem, type RegistroTrama } from '../services/linhagem';

// Linha do tempo da linhagem das tramas: uma faixa por trama, do dia em que
// nasceu até o dia em que fechou por estabilidade (verde), foi absorvida por
// fusão (âmbar, com seta até a absorvedora) ou até o fim da sessão (cinza).

interface Props {
  linhagem: Linhagem;
}

const COR = { fechada: '#4ade80', fundida: '#f59e0b', aberta: '#a1a1aa' };
const ALTURA = 22;
const MARGEM_ESQ = 120;
const PX_DIA = 34;

const LinhagemTramas: React.FC<Props> = ({ linhagem }) => {
  const regs = useMemo(
    () => (Object.values(linhagem.tramas) as RegistroTrama[]).sort((a, b) => a.nasceuEm - b.nasceuEm || a.id.localeCompare(b.id)),
    [linhagem]
  );
  const ultimoDia = linhagem.dias.length;
  const linha = new Map<string, number>(regs.map((r, i) => [r.id, i] as [string, number]));
  const x = (dia: number) => MARGEM_ESQ + (dia - 0.5) * PX_DIA;
  const y = (i: number) => 24 + i * ALTURA;
  const largura = MARGEM_ESQ + (ultimoDia + 1) * PX_DIA;
  const altura = y(regs.length) + 8;

  return (
    <div className="p-3">
      <div className="flex gap-4 text-[10px] text-zinc-400 mb-1">
        <span style={{ color: COR.fechada }}>■ fechada por estabilidade</span>
        <span style={{ color: COR.fundida }}>■ absorvida por fusão</span>
        <span style={{ color: COR.aberta }}>■ aberta</span>
        <span>tracejado = id herdado de fusão (renomeação)</span>
      </div>
      <svg width={largura} height={altura} role="img" aria-label="Linhagem das tramas">
        {Array.from({ length: ultimoDia }, (_, d) => (
          <g key={d}>
            <line x1={x(d + 1)} x2={x(d + 1)} y1={14} y2={altura} stroke="#27272a" />
            <text x={x(d + 1)} y={10} fontSize={9} fill="#71717a" textAnchor="middle">
              {d + 1}
            </text>
          </g>
        ))}
        {regs.map((r, i) => {
          const desfecho = desfechoDaTrama(r);
          const fim = desfecho === 'fundida' ? r.fundiuEm! : desfecho === 'fechada' ? r.fechouEm! : ultimoDia;
          const cor = COR[desfecho];
          const alvo = r.absorvidaPor !== null ? linha.get(r.absorvidaPor) : undefined;
          return (
            <g key={r.id}>
              <text x={MARGEM_ESQ - 6} y={y(i) + 4} fontSize={9} fill="#d4d4d8" textAnchor="end">
                {r.id}
              </text>
              <line
                x1={x(r.nasceuEm)}
                x2={x(fim)}
                y1={y(i)}
                y2={y(i)}
                stroke={cor}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={r.origem === 'renomeacao' ? '4 3' : undefined}
              >
                <title>
                  {`${r.id}: nasceu no dia ${r.nasceuEm}` +
                    (r.fechouEm !== null ? `, fechou no dia ${r.fechouEm}` : '') +
                    (r.fundiuEm !== null ? `, absorvida por ${r.absorvidaPor} no dia ${r.fundiuEm}` : '') +
                    (r.fundidaPorEventos.length ? ` (por ${r.fundidaPorEventos.join(', ')})` : '')}
                </title>
              </line>
              {r.fechouEm !== null && desfecho !== 'fechada' && (
                <circle cx={x(r.fechouEm)} cy={y(i)} r={4} fill={COR.fechada} />
              )}
              {desfecho === 'fundida' && alvo !== undefined && (
                <path
                  d={`M ${x(fim)} ${y(i)} C ${x(fim) + 14} ${y(i)}, ${x(fim) + 14} ${y(alvo)}, ${x(fim)} ${y(alvo)}`}
                  fill="none"
                  stroke={COR.fundida}
                  strokeWidth={1.5}
                  markerEnd="url(#seta-linhagem)"
                />
              )}
            </g>
          );
        })}
        <defs>
          <marker id="seta-linhagem" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COR.fundida} />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

export default LinhagemTramas;
