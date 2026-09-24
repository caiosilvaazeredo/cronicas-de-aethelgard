/**
 * Condições experimentais. Uma campanha é o produto das dimensões escolhidas
 * vezes o número de repetições.
 *
 * O limiar de estabilidade k não é dimensão de geração: a geração usa um k
 * (padrão 3, necessário para a curadoria acontecer durante a sessão) e a
 * análise reaplica k = 2, 3 e 5 sobre as mesmas sessões (ver reanalise.ts).
 */

import type { RefModelo } from '../llm/registro';
import type { PerfilJogador } from '../mundo/tipos';
import type { EstadoTramasNoPrompt } from '../prompts/agente';

export type OpcaoJogador = 'nenhum' | PerfilJogador;

export interface CondicaoSessao {
  id: string; // id da sessão (célula + repetição)
  celula: string;
  repeticao: number;
  mundo: string;
  /** 0 no controle de três atos, que não tem agentes */
  numAgentes: number;
  estadoTramas: EstadoTramasNoPrompt;
  jogador: OpcaoJogador;
  controle: boolean;
  modelos: { agentes: RefModelo; jogador: RefModelo; curador: RefModelo };
  dias: number;
  temperatura: number;
  semente: number;
  limiarEstabilidade: number;
  janelaDias: number;
}

export interface PrecoModelo {
  entradaPorMTok: number;
  saidaPorMTok: number;
}

export interface ConfigCampanha {
  nome: string;
  descricao?: string;
  dimensoes: {
    modelosAgentes: RefModelo[];
    estadoTramas: EstadoTramasNoPrompt[];
    numAgentes: number[];
    jogador: OpcaoJogador[];
    mundos: string[];
    /** inclui, para cada modelo x mundo x perfil de jogador, a condição de controle de três atos */
    incluirControle?: boolean;
    /** gera só as células de controle (para campanhas separadas do controle) */
    somenteControle?: boolean;
  };
  /** jogador sintético e curador ficam fixos em todas as condições */
  modelosFixos: { jogador: RefModelo; curador: RefModelo };
  repeticoes: number;
  dias: number;
  temperatura: number;
  sementeBase: number;
  limiarEstabilidade?: number;
  janelaDias?: number;
  /** preços declarados por "provedor/modelo", em USD por milhão de tokens */
  precos?: Record<string, PrecoModelo>;
  concorrencia?: number;
  /** chamadas por minuto por provedor */
  limitesTaxa?: Record<string, number>;
  orcamentoUsd?: number;
  cache?: boolean;
}

export function chavePreco(ref: { provedor: string; modelo: string }): string {
  return `${ref.provedor}/${ref.modelo}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Expande a campanha em sessões. A semente depende só da repetição
 * (sementeBase + r), de modo que a repetição r de todas as células usa a
 * mesma semente: comparações entre condições ficam pareadas.
 */
export function expandirCampanha(c: ConfigCampanha): CondicaoSessao[] {
  const sessoes: CondicaoSessao[] = [];
  const limiar = c.limiarEstabilidade ?? 3;
  const janela = c.janelaDias ?? 3;
  const base = {
    dias: c.dias,
    temperatura: c.temperatura,
    limiarEstabilidade: limiar,
    janelaDias: janela,
  };

  const adicionar = (celula: string, parcial: Omit<CondicaoSessao, 'id' | 'celula' | 'repeticao' | 'semente' | keyof typeof base>) => {
    for (let r = 1; r <= c.repeticoes; r++) {
      sessoes.push({
        ...parcial,
        ...base,
        id: `${celula}_r${String(r).padStart(2, '0')}`,
        celula,
        repeticao: r,
        semente: c.sementeBase + r,
      });
    }
  };

  for (const modelo of c.dimensoes.modelosAgentes) {
    const modelos = { agentes: modelo, jogador: c.modelosFixos.jogador, curador: c.modelosFixos.curador };
    for (const mundo of c.dimensoes.mundos) {
      for (const estadoTramas of c.dimensoes.somenteControle ? [] : c.dimensoes.estadoTramas) {
        for (const numAgentes of c.dimensoes.numAgentes) {
          for (const jogador of c.dimensoes.jogador) {
            const celula = [slug(mundo), slug(`${modelo.provedor}-${modelo.modelo}`), estadoTramas, `${numAgentes}ag`, `jog-${jogador}`].join('_');
            adicionar(celula, { mundo, numAgentes, estadoTramas, jogador, controle: false, modelos });
          }
        }
      }
      if (c.dimensoes.incluirControle || c.dimensoes.somenteControle) {
        const perfis = c.dimensoes.jogador.filter((j): j is PerfilJogador => j !== 'nenhum');
        for (const perfil of perfis.length > 0 ? perfis : (['investigador'] as PerfilJogador[])) {
          const celula = [slug(mundo), slug(`${modelo.provedor}-${modelo.modelo}`), 'controle-tres-atos', `jog-${perfil}`].join('_');
          adicionar(celula, { mundo, numAgentes: 0, estadoTramas: 'nao-informa', jogador: perfil, controle: true, modelos });
        }
      }
    }
  }
  return sessoes;
}

/** Estimativa grosseira de chamadas e tokens por sessão, para o aviso de custo. */
export function estimarSessao(s: CondicaoSessao): {
  chamadas: number;
  porModelo: Record<string, { chamadas: number; tokensEntrada: number; tokensSaida: number }>;
} {
  const porModelo: Record<string, { chamadas: number; tokensEntrada: number; tokensSaida: number }> = {};
  const somar = (ref: RefModelo, n: number, entrada: number, saida: number) => {
    const k = chavePreco(ref);
    porModelo[k] ??= { chamadas: 0, tokensEntrada: 0, tokensSaida: 0 };
    porModelo[k].chamadas += n;
    porModelo[k].tokensEntrada += n * entrada;
    porModelo[k].tokensSaida += n * saida;
  };
  const d = s.dias;
  const temJogador = s.jogador !== 'nenhum';
  if (s.controle) {
    somar(s.modelos.agentes, d, 2500, 700);
  } else {
    somar(s.modelos.agentes, d, 800 + 350 * s.numAgentes, 90 * s.numAgentes); // ações
    somar(s.modelos.agentes, d, 400 + 120 * s.numAgentes, 110 * s.numAgentes); // relatos
  }
  if (temJogador) somar(s.modelos.jogador, d, 1500, 150);
  somar(s.modelos.curador, Math.ceil(d * 0.4), 600, 400); // curadoria: nº de tramas estáveis é desconhecido
  const chamadas = Object.values(porModelo).reduce((a, m) => a + m.chamadas, 0);
  return { chamadas, porModelo };
}
