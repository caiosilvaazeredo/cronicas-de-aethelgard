/**
 * Reaplica a detecção com k = 2, 3 e 5 (ou --k 2,3,5) sobre todas as
 * sessões de uma campanha, usando o próprio services/arcos.ts.
 *
 *   npm run reanalisar -- --campanha saida/convergencia-v1
 *
 * Com --variantes todas (ou uma lista), também reaplica as variantes de
 * detecção de services/grafo.ts (janela temporal, ligações fortes, sem
 * pontes de fusão).
 *
 * Grava <campanha>/analise/reanalise.jsonl: uma linha por (sessão, variante, k), com a
 * condição da sessão, a métrica de cada dia e o total de tramas surgidas e
 * fechadas. É a entrada de analise/convergencia.py.
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { reanalisar } from '../core/experimento/reanalise';
import { resumirLinhagem } from '../services/linhagem';
import { VARIANTES_DETECCAO } from '../services/grafo';
import type { StoryEvent } from '../types';
import { lerArgs, texto } from './args';
import { sessaoConcluida } from './arquivos';

/**
 * @param variantes variantes de detecção de services/grafo.ts; 'completo' é
 *   a detecção de referência (sem filtro).
 */
export async function reanalisarCampanha(dir: string, ks: number[], variantes: string[] = ['completo']): Promise<number> {
  const linhas: string[] = [];
  for (const nome of (await readdir(dir)).sort()) {
    const sessao = join(dir, nome);
    if (nome === 'analise' || !(await sessaoConcluida(sessao))) continue;
    const condicao = JSON.parse(await readFile(join(sessao, 'condicao.json'), 'utf8'));
    const eventos = (await readFile(join(sessao, 'eventos.jsonl'), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as StoryEvent);
    for (const variante of variantes) {
    const filtro = VARIANTES_DETECCAO[variante];
    if (!filtro) throw new Error(`Variante desconhecida: ${variante} (conhecidas: ${Object.keys(VARIANTES_DETECCAO).join(', ')})`);
    for (const k of ks) {
      const r = reanalisar(eventos, condicao.dias, k, variante === 'completo' ? undefined : filtro);
      const fechadas = r.tramas.filter((t) => t.status !== 'aberta').length;
      linhas.push(
        JSON.stringify({
          sessao: nome,
          k,
          variante,
          condicao,
          tramasSurgidas: r.tramas.length,
          tramasFechadas: fechadas,
          proporcaoTramasFechadas: r.tramas.length ? fechadas / r.tramas.length : 0,
          metricas: r.metricas,
          // emenda 1: fusão separada de fechamento
          linhagem: resumirLinhagem(r.linhagem),
          linhagemDias: r.linhagem.dias,
        })
      );
    }
    }
  }
  await mkdir(join(dir, 'analise'), { recursive: true });
  await writeFile(join(dir, 'analise', 'reanalise.jsonl'), linhas.join('\n') + (linhas.length ? '\n' : ''));
  return linhas.length;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const dir = texto(args, 'campanha');
  if (!dir) throw new Error('Use --campanha <diretório da campanha>');
  const ks = (texto(args, 'k', '2,3,5') as string).split(',').map(Number);
  const v = texto(args, 'variantes', 'completo') as string;
  const variantes = v === 'todas' ? Object.keys(VARIANTES_DETECCAO) : v.split(',');
  const n = await reanalisarCampanha(dir, ks, variantes);
  console.log(`${n} linhas gravadas em ${join(dir, 'analise', 'reanalise.jsonl')}`);
}

if (process.argv[1] && /reanalisar\.ts$/.test(process.argv[1])) {
  principal().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
