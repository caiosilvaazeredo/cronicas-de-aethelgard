/**
 * Provedor falso e determinístico: sem rede, sem custo, sem chave.
 *
 * Gera respostas válidas a partir da semente e do próprio prompt (via hash),
 * guiado pelos `meta.dadosSimulacao` que o motor anexa a cada chamada. Serve
 * aos testes automatizados e à depuração do motor. Não tenta produzir boa
 * narrativa: só respostas estruturalmente plausíveis, com ligações causais,
 * movimentos entre locais e, às vezes, ids inexistentes (para exercitar o
 * descarte feito por `construirArestas`).
 */

import type { SaidaTransporte, Transporte, RequisicaoTransporte } from './provedor';
import { criarRng, hashTexto } from '../util/aleatorio';

export { criarRng, hashTexto };

export type ModoFalhaSimulado = 'nunca' | 'sempre' | 'primeira-tentativa' | { probabilidade: number };

export interface OpcoesSimulado {
  falha?: ModoFalhaSimulado;
}

export const MODELO_SIMULADO = 'simulado-v1';

const escolher = <T,>(rng: () => number, lista: T[]): T => lista[Math.floor(rng() * lista.length)];

function amostra<T>(rng: () => number, lista: T[], n: number): T[] {
  const copia = [...lista];
  const saida: T[] = [];
  while (copia.length > 0 && saida.length < n) {
    saida.push(copia.splice(Math.floor(rng() * copia.length), 1)[0]);
  }
  return saida;
}

const VERBOS = [
  'negocia com um desconhecido',
  'vigia a entrada',
  'esconde um pacote',
  'procura alguém',
  'discute em voz alta',
  'paga uma dívida antiga',
  'espalha um boato',
  'pede ajuda',
  'recusa uma oferta',
  'observa em silêncio',
  'faz uma ameaça velada',
  'entrega uma carta',
];

interface AgenteSim {
  id: string;
  nome: string;
  local: string;
}

const TIPOS = ['motivou', 'possibilitou', 'reagiu', 'lembrou'] as const;

/** Com ligações tipadas, troca causadoPor por causas com tipo e força. */
function tipar<T extends { causadoPor: string[] }>(rng: () => number, x: T, tipadas: boolean) {
  if (!tipadas) return x;
  const { causadoPor, ...resto } = x;
  return { ...resto, causas: causadoPor.map((id) => ({ id, tipo: escolher(rng, [...TIPOS]), forca: 1 + Math.floor(rng() * 3) })) };
}

function gerarAcoesAgentes(rng: () => number, d: any) {
  const agentes: AgenteSim[] = d?.agentes ?? [];
  const locais: string[] = d?.locais ?? [];
  const visiveis: string[] = d?.eventosVisiveis ?? [];
  return {
    acoes: agentes.map((a) => {
      const local = rng() < 0.3 && locais.length > 0 ? escolher(rng, locais) : a.local;
      const liga = visiveis.length > 0 && rng() < 0.65;
      const causadoPor = liga ? amostra(rng, visiveis, 1 + Math.floor(rng() * 2)) : [];
      if (rng() < 0.05) causadoPor.push('D999.inexistente');
      return tipar(
        rng,
        { agenteId: a.id, local, acao: `${a.nome} ${escolher(rng, VERBOS)}.`, causadoPor, tensao: Math.round(rng() * 10) },
        d?.tipadas === true
      );
    }),
  };
}

function gerarAcaoJogador(rng: () => number, d: any) {
  const locais: string[] = d?.locais ?? [];
  const conhecidos: string[] = d?.eventosConhecidos ?? [];
  const perfil: string = d?.perfil ?? 'passivo';
  const chanceMover = perfil === 'passivo' ? 0.15 : 0.4;
  const chanceLigar = perfil === 'passivo' ? 0.3 : 0.7;
  const verbo =
    perfil === 'investigador'
      ? 'pergunta sobre o que aconteceu'
      : perfil === 'intrometido'
        ? 'interfere na conversa alheia'
        : 'observa o movimento';
  return tipar(
    rng,
    {
      local: rng() < chanceMover && locais.length > 0 ? escolher(rng, locais) : d?.localAtual ?? locais[0] ?? '',
      acao: `O forasteiro ${verbo}.`,
      causadoPor: conhecidos.length > 0 && rng() < chanceLigar ? amostra(rng, conhecidos, 1) : [],
      tensao: Math.round(rng() * 10),
    },
    d?.tipadas === true
  );
}

function gerarRelatos(rng: () => number, d: any) {
  const pedidos: { indice: number; conteudoOriginal: string }[] = d?.pedidos ?? [];
  return {
    relatos: pedidos.map((p) => ({
      indice: p.indice,
      versao:
        rng() < 0.7
          ? `Dizem que ${p.conteudoOriginal.charAt(0).toLowerCase()}${p.conteudoOriginal.slice(1)}`
          : `Ouvi falar de algo parecido, mas não sei se foi bem assim: ${p.conteudoOriginal}`,
    })),
  };
}

function gerarNarracao(_rng: () => number, d: any) {
  const cadeia: { id: string; conteudo: string }[] = d?.cadeia ?? [];
  return { narracao: cadeia.map((e) => e.conteudo).join(' Depois disso, ') };
}

function gerarMestreControle(rng: () => number, d: any) {
  const visiveis: string[] = d?.eventosVisiveis ?? [];
  const atoAtual: number = d?.atoAtual ?? 1;
  const avancar = rng() < 0.2 && atoAtual < 3;
  return {
    story: 'O mestre resmunga e narra mais um trecho da aventura.',
    currentAct: avancar ? atoAtual + 1 : atoAtual,
    eventoGerado: {
      conteudo: `Algo acontece no dia ${d?.dia ?? '?'}.`,
      causadoPor: visiveis.length > 0 && rng() < 0.7 ? amostra(rng, visiveis, 1) : [],
      tensao: Math.round(rng() * 10),
    },
  };
}

const GERADORES: Record<string, (rng: () => number, d: any) => unknown> = {
  'acoes-agentes': gerarAcoesAgentes,
  'acao-jogador': gerarAcaoJogador,
  relatos: gerarRelatos,
  curador: gerarNarracao,
  'mestre-controle': gerarMestreControle,
  conversa: (rng) => ({ fala: rng() < 0.5 ? 'Não sei de nada, forasteiro.' : 'Dizem muita coisa por aqui. Tome cuidado.' }),
};

function deveFalhar(modo: ModoFalhaSimulado, tentativa: number, rng: () => number): boolean {
  if (modo === 'nunca') return false;
  if (modo === 'sempre') return true;
  if (modo === 'primeira-tentativa') return tentativa === 1;
  return rng() < modo.probabilidade;
}

export function transporteSimulado(opcoes: OpcoesSimulado = {}): Transporte {
  const modoFalha = opcoes.falha ?? 'nunca';
  return async (r: RequisicaoTransporte): Promise<SaidaTransporte> => {
    const tarefa = r.meta?.tarefa ?? 'texto';
    const dados = (r.meta?.dadosSimulacao ?? {}) as { tentativa?: number };
    const tentativa = dados.tentativa ?? 1;
    const rng = criarRng(hashTexto(`${r.semente ?? 0}|${tarefa}|${r.sistema}|${r.usuario}`));

    let texto: string;
    if (!r.jsonSchema) {
      texto = 'Texto simulado.';
    } else if (deveFalhar(modoFalha, tentativa, rng)) {
      // resposta que parece JSON mas viola o esquema
      texto = JSON.stringify({ resposta: 'fora do esquema', tentativa });
    } else {
      const gerador = GERADORES[tarefa];
      texto = JSON.stringify(gerador ? gerador(rng, dados) : {});
    }

    return {
      texto,
      modeloEfetivo: MODELO_SIMULADO,
      tokensEntrada: Math.ceil((r.sistema.length + r.usuario.length) / 4),
      tokensSaida: Math.ceil(texto.length / 4),
      bruto: { simulado: true, tarefa, tentativa },
      parametrosEfetivos: { temperatura: r.temperatura, semente: r.semente ?? null },
    };
  };
}
