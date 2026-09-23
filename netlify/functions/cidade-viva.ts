/**
 * Modo jogável da Cidade Viva: usa o mesmo núcleo (core/) do simulador em
 * lote, com o jogador humano no lugar do sintético.
 *
 * Sem estado no servidor: o cliente guarda o EstadoMundo e o reenvia a cada
 * chamada. Provedor e modelo vêm de CIDADE_VIVA_PROVEDOR (padrão gemini) e
 * CIDADE_VIVA_MODELO (identificador versionado; aliases móveis são recusados
 * pela camada core/llm). Com CIDADE_VIVA_PROVEDOR=simulado roda sem chave.
 *
 * Ações:
 *   iniciar   { mundoId, numAgentes, estadoTramas } -> { config, estado }
 *   avancar   { config, estado, acao }              -> { estado, eventosDoDia }
 *   conversar { config, estado, agenteId, fala }    -> { fala }
 */

import porto from '../../mundos/porto-das-brumas.json';
import vale from '../../mundos/vale-silente.json';
import { agentesDaVariante } from '../../core/experimento/execucao';
import { FalaConversa } from '../../core/llm/esquemas';
import { criarProvedor } from '../../core/llm/registro';
import type { NomeProvedor, ProvedorLLM } from '../../core/llm/provedor';
import { MODELO_SIMULADO } from '../../core/llm/simulado';
import {
  avancarDia,
  estadoInicial,
  MAX_TOKENS_PADRAO,
  type AcaoJogadorEntrada,
  type ConfigMotor,
} from '../../core/mundo/motor';
import { ID_JOGADOR, type ConfigMundo, type EstadoMundo } from '../../core/mundo/tipos';
import { sistemaConversa, usuarioConversa } from '../../core/prompts/conversa';
import type { EstadoTramasNoPrompt } from '../../core/prompts/agente';

const MUNDOS: Record<string, ConfigMundo> = {
  'porto-das-brumas': porto as ConfigMundo,
  'vale-silente': vale as ConfigMundo,
};

const PROVEDOR = (process.env.CIDADE_VIVA_PROVEDOR || 'gemini') as NomeProvedor;
const MODELO =
  process.env.CIDADE_VIVA_MODELO || (PROVEDOR === 'simulado' ? MODELO_SIMULADO : 'gemini-3.5-flash');

let provedorCache: ProvedorLLM | null = null;
async function provedor(): Promise<ProvedorLLM> {
  provedorCache ??= await criarProvedor({ provedor: PROVEDOR, modelo: MODELO }, { retentativasRede: 2, esperaBaseMs: 1000 });
  return provedorCache;
}

/** O cliente manda só o id do mundo na config; o mundo é resolvido aqui. */
interface ConfigCliente extends Omit<ConfigMotor, 'mundo'> {
  mundoId: string;
}

function configDoCliente(c: ConfigCliente): ConfigMotor {
  const mundo = MUNDOS[c.mundoId];
  if (!mundo) throw new Error(`Mundo desconhecido: ${c.mundoId}`);
  return { ...c, mundo, jogador: { tipo: 'humano' } };
}

const nada = () => {};

export default async (request: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });

  try {
    const { action, payload } = await request.json();
    let result: unknown;

    switch (action) {
      case 'iniciar': {
        const { mundoId, numAgentes, estadoTramas } = payload as {
          mundoId: string;
          numAgentes: number;
          estadoTramas: EstadoTramasNoPrompt;
        };
        const mundo = MUNDOS[mundoId];
        if (!mundo) throw new Error(`Mundo desconhecido: ${mundoId}`);
        const config: ConfigCliente = {
          mundoId,
          agentesAtivos: agentesDaVariante(mundo, numAgentes ?? 6),
          estadoTramas: estadoTramas ?? 'informa',
          jogador: { tipo: 'humano' },
          temperatura: 0.7,
          semente: Math.floor(Math.random() * 1_000_000),
          limiarEstabilidade: 3,
          janelaDias: 3,
          maxTokens: MAX_TOKENS_PADRAO,
        };
        const estado = estadoInicial({ mundo, agentesAtivos: config.agentesAtivos, jogador: { tipo: 'humano' } });
        result = { config, estado, mundo, modelo: `${PROVEDOR}/${MODELO}` };
        break;
      }

      case 'avancar': {
        const { config, estado, acao } = payload as { config: ConfigCliente; estado: EstadoMundo; acao: AcaoJogadorEntrada };
        const p = await provedor();
        const r = await avancarDia(estado, configDoCliente(config), { agentes: p, curador: p }, nada, acao);
        result = { estado: r.estado, eventosDoDia: r.eventosDoDia };
        break;
      }

      case 'conversar': {
        const { config, estado, agenteId, fala } = payload as {
          config: ConfigCliente;
          estado: EstadoMundo;
          agenteId: string;
          fala: string;
        };
        const mundo = MUNDOS[config.mundoId];
        const agente = mundo?.agentes.find((a) => a.id === agenteId);
        const npc = estado.personagens[agenteId];
        if (!agente || !npc) throw new Error('Habitante desconhecido.');
        if (npc.local !== estado.personagens[ID_JOGADOR]?.local) throw new Error(`${agente.nome} não está aqui.`);
        const conhecidos = estado.eventos.filter((e) => npc.conhece.includes(e.id) && e.dia >= estado.dia - 3);
        const p = await provedor();
        const r = await p.chamar({
          sistema: sistemaConversa(mundo, agente),
          usuario: usuarioConversa({ mundo, local: npc.local, conhecidos, fala: String(fala).slice(0, 500) }),
          esquema: FalaConversa,
          temperatura: config.temperatura,
          maxTokens: 800,
          meta: { tarefa: 'conversa', papel: 'agentes', dia: estado.dia },
        });
        result = { fala: (r.json as FalaConversa | undefined)?.fala ?? '(não responde)' };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers });
    }

    return new Response(JSON.stringify(result), { headers });
  } catch (error: any) {
    console.error('Erro na função cidade-viva:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor' }), { status: 500, headers });
  }
};
