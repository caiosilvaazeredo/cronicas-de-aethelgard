/**
 * Roda uma sessão completa e devolve o registro. A duração (dias) é um
 * parâmetro de coleta do simulador; o mundo nunca a conhece.
 */

import type { ProvedorLLM } from '../llm/provedor';
import {
  avancarDia,
  estadoInicial,
  ErroSessao,
  MAX_TOKENS_PADRAO,
  type ConfigMotor,
  type EstatisticasDia,
  type RegistroChamada,
} from '../mundo/motor';
import type { ConfigMundo, EstadoMundo } from '../mundo/tipos';
import type { CondicaoSessao } from './condicoes';
import { avancarDiaControle, estadoInicialControle, type EstadoControle } from './controle-tres-atos';

export interface ProvedoresSessao {
  agentes: ProvedorLLM;
  jogador: ProvedorLLM;
  curador: ProvedorLLM;
}

export interface RegistroSessao {
  condicao: CondicaoSessao;
  mundo: ConfigMundo;
  agentesAtivos: string[];
  estado: EstadoMundo;
  chamadas: RegistroChamada[];
  estatisticasDias: (EstatisticasDia & { dia: number })[];
  /** só no controle: narração do mestre e ato de cada dia */
  historiasControle?: EstadoControle['historias'];
}

export interface OpcoesExecucao {
  /** chamado ao fim de cada dia (progresso, orçamento) */
  aoTerminarDia?: (dia: number, chamadasDoDia: RegistroChamada[]) => void | Promise<void>;
  /** interrompe a sessão após N chamadas seguidas com erro de provedor */
  maxErrosSeguidos?: number;
}

export function agentesDaVariante(mundo: ConfigMundo, numAgentes: number): string[] {
  const variante = mundo.variantes?.[String(numAgentes)];
  if (variante) return variante;
  if (numAgentes > mundo.agentes.length) {
    throw new Error(`O mundo ${mundo.id} tem só ${mundo.agentes.length} agentes (pedido: ${numAgentes}).`);
  }
  return mundo.agentes.slice(0, numAgentes).map((a) => a.id);
}

export function configMotorDaCondicao(c: CondicaoSessao, mundo: ConfigMundo): ConfigMotor {
  return {
    mundo,
    agentesAtivos: agentesDaVariante(mundo, c.numAgentes),
    estadoTramas: c.estadoTramas,
    jogador: c.jogador === 'nenhum' ? null : { tipo: 'sintetico', perfil: c.jogador },
    temperatura: c.temperatura,
    semente: c.semente,
    limiarEstabilidade: c.limiarEstabilidade,
    janelaDias: c.janelaDias,
    maxTokens: MAX_TOKENS_PADRAO,
  };
}

export async function executarSessao(
  condicao: CondicaoSessao,
  mundo: ConfigMundo,
  provedores: ProvedoresSessao,
  opcoes: OpcoesExecucao = {}
): Promise<RegistroSessao> {
  const chamadas: RegistroChamada[] = [];
  const estatisticasDias: RegistroSessao['estatisticasDias'] = [];
  const maxErros = opcoes.maxErrosSeguidos ?? 5;
  let errosSeguidos = 0;
  let doDia: RegistroChamada[] = [];

  const registrar = (r: RegistroChamada) => {
    chamadas.push(r);
    doDia.push(r);
    errosSeguidos = r.erro ? errosSeguidos + 1 : 0;
    if (errosSeguidos >= maxErros) {
      throw new ErroSessao(`${maxErros} chamadas seguidas falharam; última: ${r.erro}`);
    }
  };

  if (condicao.controle) {
    if (condicao.jogador === 'nenhum') throw new Error('O controle de três atos exige jogador sintético.');
    let estado = estadoInicialControle(mundo);
    for (let d = 1; d <= condicao.dias; d++) {
      doDia = [];
      estado = await avancarDiaControle(
        estado,
        {
          mundo,
          perfil: condicao.jogador,
          temperatura: condicao.temperatura,
          semente: condicao.semente,
          limiarEstabilidade: condicao.limiarEstabilidade,
          janelaDias: condicao.janelaDias,
          duracao: 'long',
        },
        { mestre: provedores.agentes, jogador: provedores.jogador, curador: provedores.curador },
        registrar
      );
      estatisticasDias.push({ dia: d, acoesDescartadas: 0, agentesSemAcao: 0, locaisInvalidos: 0 });
      await opcoes.aoTerminarDia?.(d, doDia);
    }
    const { historias, atoAtual: _ato, acoesJogador: _acoes, ...base } = estado;
    return { condicao, mundo, agentesAtivos: [], estado: base, chamadas, estatisticasDias, historiasControle: historias };
  }

  const config = configMotorDaCondicao(condicao, mundo);
  let estado = estadoInicial(config);
  for (let d = 1; d <= condicao.dias; d++) {
    doDia = [];
    const r = await avancarDia(estado, config, provedores, registrar);
    estado = r.estado;
    estatisticasDias.push({ dia: d, ...r.stats });
    await opcoes.aoTerminarDia?.(d, doDia);
  }
  return { condicao, mundo, agentesAtivos: config.agentesAtivos, estado, chamadas, estatisticasDias };
}
