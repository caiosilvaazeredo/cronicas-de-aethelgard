/**
 * CLI de uma sessão.
 *
 *   npm run sim -- --mundo porto-das-brumas --provedor simulado --dias 40 --semente 1
 *   npm run sim -- --mundo porto-das-brumas --provedor gemini --modelo <id-versionado> --dias 40
 *
 * Opções: --estado-tramas informa|nao-informa  --agentes 4|6|8
 *         --jogador nenhum|investigador|intrometido|passivo  --controle
 *         --temperatura 0.7  --limiar 3  --janela 3  --saida saida/avulsas
 *         --provedor-jogador/--modelo-jogador  --provedor-curador/--modelo-curador
 *         --fixado-confirmado  --sem-cache  --falha-simulada sempre|primeira-tentativa|0.2
 *         --ligacoes-tipadas (cada causa com tipo e força)
 */

import { join } from 'node:path';
import type { CondicaoSessao, OpcaoJogador } from '../core/experimento/condicoes';
import type { NomeProvedor } from '../core/llm/provedor';
import type { RefModelo } from '../core/llm/registro';
import { MODELO_SIMULADO, type ModoFalhaSimulado } from '../core/llm/simulado';
import type { EstadoTramasNoPrompt } from '../core/prompts/agente';
import { lerArgs, numero, texto } from './args';
import { carregarMundo } from './arquivos';
import { DIRETORIO_CACHE_PADRAO, rodarSessaoNoDisco } from './sessao';

function refDe(provedor: string, modelo: string | undefined, fixado: boolean): RefModelo {
  const p = provedor as NomeProvedor;
  if (p !== 'simulado' && !modelo) throw new Error(`--modelo é obrigatório para o provedor ${p}`);
  return { provedor: p, modelo: modelo ?? MODELO_SIMULADO, fixadoConfirmado: fixado || undefined };
}

function lerFalha(v: string | undefined): ModoFalhaSimulado | undefined {
  if (!v) return undefined;
  if (v === 'sempre' || v === 'nunca' || v === 'primeira-tentativa') return v;
  return { probabilidade: Number(v) };
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const mundoId = texto(args, 'mundo', 'porto-das-brumas')!;
  const fixado = args['fixado-confirmado'] === true;
  const agentes = refDe(texto(args, 'provedor', 'simulado')!, texto(args, 'modelo'), fixado);
  const jogadorRef = texto(args, 'provedor-jogador')
    ? refDe(texto(args, 'provedor-jogador')!, texto(args, 'modelo-jogador'), fixado)
    : agentes;
  const curadorRef = texto(args, 'provedor-curador')
    ? refDe(texto(args, 'provedor-curador')!, texto(args, 'modelo-curador'), fixado)
    : agentes;

  const controle = args.controle === true;
  const jogador = texto(args, 'jogador', 'investigador') as OpcaoJogador;
  const estadoTramas = texto(args, 'estado-tramas', 'informa') as EstadoTramasNoPrompt;
  const numAgentes = numero(args, 'agentes', 6);
  const semente = numero(args, 'semente', 1);
  const dias = numero(args, 'dias', 40);

  const celula = controle
    ? `${mundoId}_${agentes.provedor}_controle-tres-atos_jog-${jogador}`
    : `${mundoId}_${agentes.provedor}_${estadoTramas}_${numAgentes}ag_jog-${jogador}`;
  const condicao: CondicaoSessao = {
    id: `${celula}_s${semente}`,
    celula,
    repeticao: 1,
    mundo: mundoId,
    numAgentes: controle ? 0 : numAgentes,
    estadoTramas: controle ? 'nao-informa' : estadoTramas,
    jogador,
    controle,
    modelos: { agentes, jogador: jogadorRef, curador: curadorRef },
    dias,
    temperatura: numero(args, 'temperatura', 0.7),
    semente,
    limiarEstabilidade: numero(args, 'limiar', 3),
    janelaDias: numero(args, 'janela', 3),
    ...(args['ligacoes-tipadas'] === true ? { ligacoesTipadas: true } : {}),
  };

  const mundo = await carregarMundo(mundoId);
  const diretorio = join(texto(args, 'saida', 'saida/avulsas')!, condicao.id);
  const inicio = Date.now();
  const registro = await rodarSessaoNoDisco(condicao, mundo, {
    diretorioSessao: diretorio,
    cache: args['sem-cache'] === true ? null : DIRETORIO_CACHE_PADRAO,
    falhaSimulada: lerFalha(texto(args, 'falha-simulada')),
    aoTerminarDia: (d, chamadas) => {
      const falhas = chamadas.filter((c) => c.falhaEstrutura || c.erro).length;
      process.stderr.write(`dia ${d}/${dias}: ${chamadas.length} chamadas${falhas ? `, ${falhas} com falha` : ''}\n`);
    },
  });

  const e = registro.estado;
  const ult = e.metricas[e.metricas.length - 1];
  console.log(
    JSON.stringify(
      {
        sessao: condicao.id,
        diretorio,
        segundos: Math.round((Date.now() - inicio) / 1000),
        eventos: e.eventos.length,
        relatos: e.relatos.length,
        tramas: e.tramas.length,
        fechadas: e.tramas.filter((t) => t.status !== 'aberta').length,
        abertasNoFim: ult?.componentesAbertos,
        razaoAmarracao: ult?.razaoAmarracao,
        chamadas: registro.chamadas.length,
        falhasEstrutura: registro.chamadas.filter((c) => c.falhaEstrutura).length,
      },
      null,
      2
    )
  );
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
