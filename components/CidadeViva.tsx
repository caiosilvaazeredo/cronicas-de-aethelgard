import React, { useMemo, useState } from 'react';
import MapaCronica from './MapaCronica';
import type { ConfigMundo, EstadoMundo, EstadoPersonagem, EventoCidade } from '../core/mundo/tipos';
import { ID_JOGADOR } from '../core/mundo/tipos';

// Modo jogável da Cidade Viva: o mundo age sozinho, dia após dia; o jogador
// humano é só mais um agente. Usa o mesmo núcleo (core/) do simulador em
// lote, via netlify/functions/cidade-viva.ts.

interface Props {
  onVoltarMenu: () => void;
}

interface Sessao {
  config: any;
  estado: EstadoMundo;
  mundo: ConfigMundo;
  modelo: string;
}

async function chamar<T>(action: string, payload: unknown): Promise<T> {
  const res = await fetch('/.netlify/functions/cidade-viva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Falha em cidade-viva/${action}`);
  return data as T;
}

const MUNDOS = [
  { id: 'porto-das-brumas', nome: 'Porto das Brumas', desc: 'Cidade portuária de intriga, contrabando e dívidas.' },
  { id: 'vale-silente', nome: 'Vale Silente', desc: 'Aldeia isolada nas montanhas, com o inverno chegando.' },
];

const CidadeViva: React.FC<Props> = ({ onVoltarMenu }) => {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [mundoId, setMundoId] = useState('porto-das-brumas');
  const [numAgentes, setNumAgentes] = useState(6);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [acao, setAcao] = useState('');
  const [destino, setDestino] = useState<string>('');
  const [motivos, setMotivos] = useState<string[]>([]);
  const [conversaCom, setConversaCom] = useState<string>('');
  const [fala, setFala] = useState('');
  const [conversas, setConversas] = useState<{ dia: number; quem: string; eu: string; resposta: string }[]>([]);
  const [mostrarCronica, setMostrarCronica] = useState(false);

  const iniciar = async () => {
    setErro(null);
    setCarregando('Despertando a cidade...');
    try {
      const s = await chamar<Sessao>('iniciar', { mundoId, numAgentes, estadoTramas: 'informa' });
      setSessao(s);
      setDestino(s.estado.personagens[ID_JOGADOR].local);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(null);
    }
  };

  const eu = sessao?.estado.personagens[ID_JOGADOR];
  const nomeLocal = (id: string) => sessao?.mundo.locais.find((l) => l.id === id)?.nome ?? id;
  const nomeAgente = (id: string) =>
    id === ID_JOGADOR ? 'Você' : sessao?.mundo.agentes.find((a) => a.id === id)?.nome ?? id;

  // o jogador só vê o que presenciou e o que lhe contaram
  const conhecidos = useMemo<EventoCidade[]>(() => {
    if (!sessao || !eu) return [];
    return sessao.estado.eventos.filter((e) => eu.conhece.includes(e.id));
  }, [sessao, eu]);
  const relatosOuvidos = useMemo(
    () => (sessao && eu ? sessao.estado.relatos.filter((r) => eu.ouviu.includes(r.id)) : []),
    [sessao, eu]
  );
  const presentes = useMemo<EstadoPersonagem[]>(
    () =>
      sessao && eu
        ? (Object.values(sessao.estado.personagens) as EstadoPersonagem[]).filter((p) => p.id !== ID_JOGADOR && p.local === eu.local)
        : [],
    [sessao, eu]
  );

  const avancar = async () => {
    if (!sessao || !acao.trim()) return;
    setErro(null);
    setCarregando('A cidade vive mais um dia...');
    try {
      const r = await chamar<{ estado: EstadoMundo }>('avancar', {
        config: sessao.config,
        estado: sessao.estado,
        acao: { local: destino, acao: acao.trim(), causadoPor: motivos, tensao: 5 },
      });
      setSessao({ ...sessao, estado: r.estado });
      setAcao('');
      setMotivos([]);
      setDestino(r.estado.personagens[ID_JOGADOR].local);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(null);
    }
  };

  const conversar = async () => {
    if (!sessao || !conversaCom || !fala.trim()) return;
    setErro(null);
    setCarregando(`${nomeAgente(conversaCom)} pensa no que dizer...`);
    try {
      const r = await chamar<{ fala: string }>('conversar', {
        config: sessao.config,
        estado: sessao.estado,
        agenteId: conversaCom,
        fala: fala.trim(),
      });
      setConversas((c) => [...c, { dia: sessao.estado.dia, quem: conversaCom, eu: fala.trim(), resposta: r.fala }]);
      setFala('');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(null);
    }
  };

  const exportar = () => {
    if (!sessao) return;
    const blob = new Blob([JSON.stringify({ config: sessao.config, modelo: sessao.modelo, estado: sessao.estado }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cidade-viva-${sessao.config.mundoId}-dia${sessao.estado.dia}.json`;
    a.click();
  };

  if (!sessao) {
    return (
      <div className="min-h-screen bg-[#0f0f1b] text-zinc-200 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#1e1e2e] border-4 border-[#2b1b3d] rounded-lg p-6 space-y-5">
          <h2 className="font-title text-[#c5a059] uppercase text-xl text-center">🏘️ Cidade Viva</h2>
          <p className="text-zinc-400 text-sm">
            A cidade age sozinha, dia após dia. Você é só mais um habitante: vê o que acontece onde está, ouve o que
            contam e escolhe o que fazer. As tramas e seus fechamentos aparecem depois, na crônica.
          </p>
          <div className="space-y-2">
            {MUNDOS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMundoId(m.id)}
                className={`w-full text-left p-3 rounded border-2 ${mundoId === m.id ? 'border-[#c5a059] bg-[#c5a059]/10' : 'border-zinc-700'}`}
              >
                <div className="font-title text-sm text-[#c5a059]">{m.nome}</div>
                <div className="text-xs text-zinc-400">{m.desc}</div>
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between text-sm">
            Habitantes
            <select
              value={numAgentes}
              onChange={(e) => setNumAgentes(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
            >
              {[4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
          <div className="flex gap-3">
            <button onClick={onVoltarMenu} className="flex-1 px-4 py-2 rounded bg-zinc-800 text-xs font-title uppercase">
              Voltar
            </button>
            <button
              onClick={iniciar}
              disabled={!!carregando}
              className="flex-1 px-4 py-2 rounded bg-[#c5a059] text-black text-xs font-title uppercase disabled:opacity-50"
            >
              {carregando ?? 'Entrar na cidade'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { estado, mundo } = sessao;
  const diasComEventos = [...new Set([...conhecidos.map((e) => e.dia), ...relatosOuvidos.map((r) => r.dia)])].sort(
    (a, b) => b - a
  );

  return (
    <div className="min-h-screen bg-[#0f0f1b] text-zinc-200 p-4">
      {mostrarCronica && (
        <MapaCronica
          eventos={estado.eventos}
          tramas={estado.tramas}
          onGerarFechamento={() => {}}
          gerandoTramaId={null}
          onFechar={() => setMostrarCronica(false)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-title text-[#c5a059] uppercase text-lg">{mundo.nome}</h2>
            <p className="text-xs text-zinc-500">
              Dia {estado.dia} · você está em {nomeLocal(eu!.local)} · modelo {sessao.modelo}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMostrarCronica(true)} className="px-3 py-2 rounded bg-[#2b1b3d] text-xs font-title uppercase">
              🗺️ Crônica ({estado.narracoes.length})
            </button>
            <button onClick={exportar} className="px-3 py-2 rounded bg-zinc-800 text-xs font-title uppercase">
              Exportar
            </button>
            <button onClick={onVoltarMenu} className="px-3 py-2 rounded bg-zinc-800 text-xs font-title uppercase">
              Menu
            </button>
          </div>
        </div>

        {erro && <p className="text-red-400 text-xs">{erro}</p>}

        <div className="grid md:grid-cols-3 gap-4">
          <section className="md:col-span-2 bg-[#14141f] border border-[#2b1b3d] rounded p-4 max-h-[70vh] overflow-y-auto">
            <h3 className="font-title text-[10px] uppercase text-[#c5a059] mb-3">Diário</h3>
            {diasComEventos.length === 0 && (
              <p className="text-zinc-500 text-sm italic">Nada aconteceu diante de você ainda. Escolha o que fazer no primeiro dia.</p>
            )}
            {diasComEventos.map((dia) => (
              <div key={dia} className="mb-4">
                <div className="text-xs text-zinc-500 mb-1">Dia {dia}</div>
                <ul className="space-y-1">
                  {conhecidos
                    .filter((e) => e.dia === dia)
                    .map((e) => (
                      <li key={e.id} className="text-sm">
                        <span className="text-[#c5a059]">{nomeAgente(e.autorId)}</span>{' '}
                        <span className="text-zinc-500 text-xs">({nomeLocal(e.local)})</span>: {e.conteudo}
                      </li>
                    ))}
                  {relatosOuvidos
                    .filter((r) => r.dia === dia)
                    .map((r) => (
                      <li key={r.id} className="text-sm text-zinc-400 italic">
                        {nomeAgente(r.deId)} lhe contou: “{r.versao}”
                      </li>
                    ))}
                  {conversas
                    .filter((c) => c.dia === dia)
                    .map((c, i) => (
                      <li key={`c${i}`} className="text-sm text-sky-300">
                        Você a {nomeAgente(c.quem)}: “{c.eu}” — “{c.resposta}”
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <div className="bg-[#14141f] border border-[#2b1b3d] rounded p-4">
              <h3 className="font-title text-[10px] uppercase text-[#c5a059] mb-2">Aqui com você</h3>
              {presentes.length === 0 && <p className="text-xs text-zinc-500">Ninguém.</p>}
              <div className="flex flex-wrap gap-2 mb-3">
                {presentes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setConversaCom(p.id)}
                    className={`px-2 py-1 rounded text-xs border ${conversaCom === p.id ? 'border-[#c5a059] text-[#c5a059]' : 'border-zinc-700'}`}
                  >
                    {nomeAgente(p.id)}
                  </button>
                ))}
              </div>
              {conversaCom && presentes.some((p) => p.id === conversaCom) && (
                <div className="flex gap-2">
                  <input
                    value={fala}
                    onChange={(e) => setFala(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && conversar()}
                    placeholder={`Dizer a ${nomeAgente(conversaCom)}...`}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                  />
                  <button onClick={conversar} disabled={!!carregando} className="px-2 rounded bg-zinc-700 text-xs disabled:opacity-50">
                    Falar
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#14141f] border border-[#2b1b3d] rounded p-4 space-y-2">
              <h3 className="font-title text-[10px] uppercase text-[#c5a059]">Sua ação no dia {estado.dia + 1}</h3>
              <label className="block text-xs text-zinc-400">
                Onde
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                >
                  {mundo.locais.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                value={acao}
                onChange={(e) => setAcao(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="O que você faz?"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
              />
              {conhecidos.length > 0 && (
                <details className="text-xs text-zinc-400">
                  <summary className="cursor-pointer">Por causa de... ({motivos.length})</summary>
                  <div className="max-h-40 overflow-y-auto mt-1 space-y-1">
                    {conhecidos.slice(-15).map((e) => (
                      <label key={e.id} className="flex gap-2 items-start">
                        <input
                          type="checkbox"
                          checked={motivos.includes(e.id)}
                          onChange={(ev) =>
                            setMotivos((m) => (ev.target.checked ? [...m, e.id] : m.filter((x) => x !== e.id)))
                          }
                        />
                        <span>
                          dia {e.dia}: {e.conteudo}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
              <button
                onClick={avancar}
                disabled={!!carregando || !acao.trim()}
                className="w-full px-4 py-2 rounded bg-[#c5a059] text-black text-xs font-title uppercase disabled:opacity-50"
              >
                {carregando ?? 'Agir e passar o dia'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CidadeViva;
