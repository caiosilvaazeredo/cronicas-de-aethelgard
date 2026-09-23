/** Roda uma condição e grava a exportação: usado por rodar.ts e campanha.ts. */

import { join } from 'node:path';
import type { CondicaoSessao, PrecoModelo } from '../core/experimento/condicoes';
import { executarSessao, type OpcoesExecucao, type RegistroSessao } from '../core/experimento/execucao';
import { arquivosDaSessao } from '../core/experimento/exportacao';
import { criarProvedor, type RefModelo } from '../core/llm/registro';
import type { ProvedorLLM } from '../core/llm/provedor';
import type { ModoFalhaSimulado } from '../core/llm/simulado';
import type { ConfigMundo } from '../core/mundo/tipos';
import { gravarSessao } from './arquivos';
import { comCache } from './cache';
import type { LimitadorTaxa } from './limite';

export interface OpcoesSessaoDisco {
  diretorioSessao: string;
  cache: string | null; // diretório do cache, ou null para desligar
  limitador?: LimitadorTaxa;
  precos?: Record<string, PrecoModelo>;
  falhaSimulada?: ModoFalhaSimulado;
  aoTerminarDia?: OpcoesExecucao['aoTerminarDia'];
}

async function provedor(ref: RefModelo, o: OpcoesSessaoDisco): Promise<ProvedorLLM> {
  const p = await criarProvedor(ref, {
    antesDeChamar: o.limitador?.para(ref.provedor),
    simulado: { falha: o.falhaSimulada },
  });
  return o.cache && ref.provedor !== 'simulado' ? comCache(p, o.cache) : p;
}

export async function rodarSessaoNoDisco(
  condicao: CondicaoSessao,
  mundo: ConfigMundo,
  o: OpcoesSessaoDisco
): Promise<RegistroSessao> {
  const provedores = {
    agentes: await provedor(condicao.modelos.agentes, o),
    jogador: await provedor(condicao.modelos.jogador, o),
    curador: await provedor(condicao.modelos.curador, o),
  };
  const registro = await executarSessao(condicao, mundo, provedores, { aoTerminarDia: o.aoTerminarDia });
  await gravarSessao(o.diretorioSessao, arquivosDaSessao(registro, o.precos));
  return registro;
}

export const DIRETORIO_CACHE_PADRAO = join(process.cwd(), '.cache-llm');
