/**
 * CLI de campanha: roda a matriz condições x modelos x repetições.
 *
 *   npm run campanha -- --config campanhas/convergencia-v1.json            (só estima)
 *   npm run campanha -- --config campanhas/convergencia-v1.json --confirmar
 *
 * Opções: --saida saida  --orcamento-usd 50 (sobrepõe o da config)
 *         --concorrencia 4  --sem-cache  --limite-sessoes N (para testes)
 *
 * Retomável: uma sessão só é gravada quando termina (diretório temporário
 * renomeado no fim), e sessões com resumo.json são puladas ao retomar.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  chavePreco,
  estimarSessao,
  expandirCampanha,
  type ConfigCampanha,
  type CondicaoSessao,
} from '../core/experimento/condicoes';
import { custoDasChamadas } from '../core/experimento/exportacao';
import { motivoRecusaModelo } from '../core/llm/registro';
import type { ConfigMundo } from '../core/mundo/tipos';
import { lerArgs, numero, texto } from './args';
import { carregarMundo, existe, infoGit, sessaoConcluida, versoesDependencias } from './arquivos';
import { LimitadorTaxa } from './limite';
import { DIRETORIO_CACHE_PADRAO, rodarSessaoNoDisco } from './sessao';

class OrcamentoEsgotado extends Error {}

function refsDaCampanha(c: ConfigCampanha) {
  return [...c.dimensoes.modelosAgentes, c.modelosFixos.jogador, c.modelosFixos.curador];
}

export interface OpcoesCampanha {
  saida: string;
  confirmar: boolean;
  orcamentoUsd?: number;
  concorrencia?: number;
  cache: boolean;
  limiteSessoes?: number;
  log?: (msg: string) => void;
  /** para testes: interrompe a campanha depois de N sessões concluídas nesta execução */
  pararDepoisDe?: number;
}

export interface ResultadoCampanha {
  diretorio: string;
  total: number;
  jaConcluidas: number;
  executadas: number;
  falharam: { sessao: string; erro: string }[];
  interrompidaPorOrcamento: boolean;
  custoUsd: number;
  estimativa: { chamadas: number; usd: number | null };
}

export async function rodarCampanha(config: ConfigCampanha, o: OpcoesCampanha): Promise<ResultadoCampanha> {
  const log = o.log ?? ((m: string) => process.stderr.write(m + '\n'));

  for (const ref of refsDaCampanha(config)) {
    const motivo = motivoRecusaModelo(ref);
    if (motivo) throw new Error(`Modelo recusado (${ref.provedor}): ${motivo}.`);
  }

  const todas = expandirCampanha(config);
  const sessoes = o.limiteSessoes ? todas.slice(0, o.limiteSessoes) : todas;
  const diretorio = join(o.saida, config.nome);
  const precos = config.precos ?? {};

  const pendentes: CondicaoSessao[] = [];
  for (const s of sessoes) {
    if (!(await sessaoConcluida(join(diretorio, s.id)))) pendentes.push(s);
  }

  // estimativa de custo
  let chamadasPrevistas = 0;
  let usd = 0;
  let precoFaltando = false;
  pendentes.forEach((s) => {
    const est = estimarSessao(s);
    chamadasPrevistas += est.chamadas;
    Object.entries(est.porModelo).forEach(([chave, m]) => {
      if (chave.startsWith('simulado/')) return;
      const p = precos[chave];
      if (!p) precoFaltando = true;
      else usd += (m.tokensEntrada * p.entradaPorMTok + m.tokensSaida * p.saidaPorMTok) / 1e6;
    });
  });
  const estimativa = { chamadas: chamadasPrevistas, usd: precoFaltando ? null : usd };
  log(
    `Campanha ${config.nome}: ${sessoes.length} sessões (${sessoes.length - pendentes.length} já concluídas, ${pendentes.length} pendentes).`
  );
  log(
    `Estimativa para as pendentes: ~${chamadasPrevistas} chamadas de IA (sem contar novas tentativas), ` +
      (estimativa.usd === null ? 'custo desconhecido (falta preço declarado para algum modelo).' : `~US$ ${usd.toFixed(2)}.`)
  );

  const orcamento = o.orcamentoUsd ?? config.orcamentoUsd;
  const resultadoBase: ResultadoCampanha = {
    diretorio,
    total: sessoes.length,
    jaConcluidas: sessoes.length - pendentes.length,
    executadas: 0,
    falharam: [],
    interrompidaPorOrcamento: false,
    custoUsd: 0,
    estimativa,
  };
  if (!o.confirmar) {
    log('Nada foi executado. Repita com --confirmar para rodar.');
    return resultadoBase;
  }
  if (orcamento !== undefined) {
    const semPreco = refsDaCampanha(config).filter((r) => r.provedor !== 'simulado' && !precos[chavePreco(r)]);
    if (semPreco.length > 0) {
      throw new Error(
        `Há orçamento, mas falta preço declarado para: ${semPreco.map(chavePreco).join(', ')}. Declare em "precos".`
      );
    }
  }

  // manifesto e pré-registro
  await mkdir(diretorio, { recursive: true });
  const manifestoPath = join(diretorio, 'manifesto.json');
  const anterior = (await existe(manifestoPath)) ? JSON.parse(await readFile(manifestoPath, 'utf8')) : null;
  const execucao = { data: new Date().toISOString(), git: infoGit(), versoes: versoesDependencias() };
  const manifesto = {
    campanha: config.nome,
    config,
    criadoEm: anterior?.criadoEm ?? execucao.data,
    execucoes: [...(anterior?.execucoes ?? []), execucao],
    sessoes: sessoes.map((s) => ({
      id: s.id,
      celula: s.celula,
      semente: s.semente,
      temperatura: s.temperatura,
      modelos: s.modelos,
    })),
    modelosEfetivos: anterior?.modelosEfetivos ?? {},
  };
  await writeFile(manifestoPath, JSON.stringify(manifesto, null, 2) + '\n');

  const preRegistro = join(process.cwd(), 'pre-registro.md');
  if (await existe(preRegistro)) {
    const destino = join(diretorio, 'pre-registro.md');
    if (!(await existe(destino))) {
      await copyFile(preRegistro, destino);
    } else if ((await readFile(destino, 'utf8')) !== (await readFile(preRegistro, 'utf8'))) {
      const alternativo = join(diretorio, `pre-registro-${execucao.data.slice(0, 10)}.md`);
      await copyFile(preRegistro, alternativo);
      log(`AVISO: pre-registro.md mudou desde o início da campanha; a versão atual foi copiada para ${alternativo}.`);
    }
  } else {
    log('AVISO: pre-registro.md não encontrado na raiz; a campanha segue sem a cópia.');
  }

  // execução com concorrência limitada
  const limitador = new LimitadorTaxa(config.limitesTaxa);
  const mundos = new Map<string, ConfigMundo>();
  for (const s of pendentes) if (!mundos.has(s.mundo)) mundos.set(s.mundo, await carregarMundo(s.mundo));

  let gasto = 0;
  let parar = false;
  let concluidasAqui = 0;
  const efetivos: Record<string, Set<string>> = {};
  Object.entries(manifesto.modelosEfetivos as Record<string, string[]>).forEach(([k, v]) => (efetivos[k] = new Set(v)));
  const fila = [...pendentes];
  const concorrencia = Math.max(1, o.concorrencia ?? config.concorrencia ?? 2);

  const trabalhador = async () => {
    while (!parar && fila.length > 0) {
      const s = fila.shift()!;
      let gastoSessao = 0;
      try {
        const registro = await rodarSessaoNoDisco(s, mundos.get(s.mundo)!, {
          diretorioSessao: join(diretorio, s.id),
          cache: o.cache && config.cache !== false ? DIRETORIO_CACHE_PADRAO : null,
          limitador,
          precos,
          aoTerminarDia: (_d, chamadas) => {
            const custo = custoDasChamadas(chamadas, precos).usd;
            gastoSessao += custo;
            gasto += custo;
            if (orcamento !== undefined && gasto >= orcamento) {
              parar = true;
              throw new OrcamentoEsgotado(`orçamento de US$ ${orcamento} atingido`);
            }
          },
        });
        registro.chamadas.forEach((c) => {
          if (c.modeloEfetivo) (efetivos[`${c.provedor}/${c.modeloSolicitado}`] ??= new Set()).add(c.modeloEfetivo);
        });
        resultadoBase.executadas += 1;
        concluidasAqui += 1;
        log(`ok ${s.id} (US$ ${gastoSessao.toFixed(4)})`);
        if (o.pararDepoisDe !== undefined && concluidasAqui >= o.pararDepoisDe) parar = true;
      } catch (e) {
        if (e instanceof OrcamentoEsgotado) {
          resultadoBase.interrompidaPorOrcamento = true;
          log(`interrompida: ${e.message}; ${s.id} não foi gravada e será refeita ao retomar.`);
        } else {
          resultadoBase.falharam.push({ sessao: s.id, erro: (e as Error).message });
          log(`FALHOU ${s.id}: ${(e as Error).message}`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: concorrencia }, trabalhador));

  manifesto.modelosEfetivos = Object.fromEntries(Object.entries(efetivos).map(([k, v]) => [k, [...v].sort()]));
  await writeFile(manifestoPath, JSON.stringify(manifesto, null, 2) + '\n');
  resultadoBase.custoUsd = gasto;
  return resultadoBase;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const caminho = texto(args, 'config');
  if (!caminho) throw new Error('Use --config <arquivo.json>');
  const config = JSON.parse(await readFile(caminho, 'utf8')) as ConfigCampanha;
  const orcamento = texto(args, 'orcamento-usd');
  const r = await rodarCampanha(config, {
    saida: texto(args, 'saida', 'saida')!,
    confirmar: args.confirmar === true,
    orcamentoUsd: orcamento !== undefined ? Number(orcamento) : undefined,
    concorrencia: args.concorrencia ? numero(args, 'concorrencia', 2) : undefined,
    cache: args['sem-cache'] !== true,
    limiteSessoes: args['limite-sessoes'] ? numero(args, 'limite-sessoes', 0) : undefined,
  });
  console.log(JSON.stringify(r, null, 2));
  if (r.falharam.length > 0) process.exitCode = 1;
}

if (process.argv[1] && /campanha\.ts$/.test(process.argv[1])) {
  principal().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
