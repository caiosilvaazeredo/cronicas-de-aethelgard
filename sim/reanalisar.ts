/**
 * Reaplica a detecção com k = 2, 3 e 5 (ou --k 2,3,5) sobre todas as
 * sessões de uma campanha, usando o próprio services/arcos.ts.
 *
 *   npm run reanalisar -- --campanha saida/convergencia-v1
 *
 * Grava <campanha>/analise/reanalise.jsonl: uma linha por (sessão, k), com a
 * condição da sessão, a métrica de cada dia e o total de tramas surgidas e
 * fechadas. É a entrada de analise/convergencia.py.
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { reanalisar } from '../core/experimento/reanalise';
import type { StoryEvent } from '../types';
import { lerArgs, texto } from './args';
import { sessaoConcluida } from './arquivos';

export async function reanalisarCampanha(dir: string, ks: number[]): Promise<number> {
  const linhas: string[] = [];
  for (const nome of (await readdir(dir)).sort()) {
    const sessao = join(dir, nome);
    if (nome === 'analise' || !(await sessaoConcluida(sessao))) continue;
    const condicao = JSON.parse(await readFile(join(sessao, 'condicao.json'), 'utf8'));
    const eventos = (await readFile(join(sessao, 'eventos.jsonl'), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as StoryEvent);
    for (const k of ks) {
      const r = reanalisar(eventos, condicao.dias, k);
      const fechadas = r.tramas.filter((t) => t.status !== 'aberta').length;
      linhas.push(
        JSON.stringify({
          sessao: nome,
          k,
          condicao,
          tramasSurgidas: r.tramas.length,
          tramasFechadas: fechadas,
          proporcaoTramasFechadas: r.tramas.length ? fechadas / r.tramas.length : 0,
          metricas: r.metricas,
        })
      );
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
  const n = await reanalisarCampanha(dir, ks);
  console.log(`${n} linhas gravadas em ${join(dir, 'analise', 'reanalise.jsonl')}`);
}

if (process.argv[1] && /reanalisar\.ts$/.test(process.argv[1])) {
  principal().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
