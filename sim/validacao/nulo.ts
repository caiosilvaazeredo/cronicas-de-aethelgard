/**
 * Modelo nulo (complemento dos métodos 1 e 2): para cada sessão, reembaralha
 * as ligações causais mantendo o número de causas de cada evento e a ordem no
 * tempo (cada causa sorteada entre os eventos de dias anteriores), N vezes, e
 * recalcula as métricas com o próprio services/arcos.ts. Se a estrutura
 * observada vem do conteúdo das ligações e não só da quantidade delas, as
 * métricas observadas devem cair fora da distribuição nula.
 *
 *   npx tsx sim/validacao/nulo.ts --fontes experimentos/validacao --n 200 --saida experimentos/validacao/nulo
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { construirArestas } from '../../services/arcos';
import { reanalisar } from '../../core/experimento/reanalise';
import { criarRng, hashTexto } from '../../core/util/aleatorio';
import { lerArgs, numero, texto } from '../args';
import { lerSessoes, modeloGerador } from './comum';

function metricas(eventos: any[], dias: number, k: number) {
  const r = reanalisar(eventos, dias, k);
  const fechadas = r.tramas.filter((t) => t.status !== 'aberta').length;
  // tamanho da maior trama (fração dos eventos kernel)
  const ult = r.metricas[r.metricas.length - 1];
  const { entrada, saida } = construirArestas(eventos);
  const kernels = eventos.filter((e) => (entrada.get(e.id)?.length ?? 0) + (saida.get(e.id)?.length ?? 0) > 0).length;
  const abertasUltimoTerco = r.metricas.slice(Math.ceil((2 * dias) / 3) - 1).map((m) => m.componentesAbertos);
  return {
    tramas: r.tramas.length,
    fechadas,
    proporcaoFechadas: r.tramas.length ? fechadas / r.tramas.length : 0,
    fracaoKernel: eventos.length ? kernels / eventos.length : 0,
    abertasFinal: ult?.componentesAbertos ?? 0,
    abertasMediaUltimoTerco: abertasUltimoTerco.reduce((a, b) => a + b, 0) / Math.max(1, abertasUltimoTerco.length),
  };
}

function reembaralhar(eventos: any[], rng: () => number): any[] {
  const { entrada } = construirArestas(eventos);
  return eventos.map((e) => {
    const k = entrada.get(e.id)?.length ?? 0;
    const anteriores = eventos.filter((x) => x.turno < e.turno);
    const escolhidos = new Set<string>();
    while (escolhidos.size < Math.min(k, anteriores.length)) {
      escolhidos.add(anteriores[Math.floor(rng() * anteriores.length)].id);
    }
    return { ...e, causadoPor: [...escolhidos] };
  });
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const fontes = texto(args, 'fontes')!.split(',');
  const n = numero(args, 'n', 200);
  const k = numero(args, 'k', 3);
  const saida = texto(args, 'saida', 'experimentos/validacao/nulo')!;
  const linhas: string[] = [];
  for (const s of await lerSessoes(fontes)) {
    const dias = s.condicao.dias;
    const obs = metricas(s.eventos, dias, k);
    const rng = criarRng(hashTexto(`nulo|${s.nome}`));
    const nulos = Array.from({ length: n }, () => metricas(reembaralhar(s.eventos, rng), dias, k));
    const resumo: Record<string, unknown> = {};
    for (const chave of Object.keys(obs) as (keyof typeof obs)[]) {
      const vals = nulos.map((x) => x[chave]).sort((a, b) => a - b);
      const media = vals.reduce((a, b) => a + b, 0) / n;
      const dp = Math.sqrt(vals.reduce((a, b) => a + (b - media) ** 2, 0) / n);
      const maiorIgual = vals.filter((v) => v >= obs[chave]).length;
      const menorIgual = vals.filter((v) => v <= obs[chave]).length;
      resumo[chave] = {
        observado: obs[chave],
        mediaNula: media,
        dpNulo: dp,
        ic95Nulo: [vals[Math.floor(0.025 * n)], vals[Math.ceil(0.975 * n) - 1]],
        pBilateral: Math.min(1, (2 * Math.min(maiorIgual + 1, menorIgual + 1)) / (n + 1)),
      };
    }
    linhas.push(
      JSON.stringify({
        sessao: s.nome,
        gerador: modeloGerador(s.condicao),
        controle: s.condicao.controle,
        estadoTramas: s.condicao.estadoTramas,
        mundo: s.condicao.mundo,
        eventos: s.eventos.length,
        n,
        k,
        metricas: resumo,
      })
    );
    process.stderr.write(`nulo: ${s.nome}\n`);
  }
  await mkdir(saida, { recursive: true });
  await writeFile(join(saida, 'nulo.jsonl'), linhas.join('\n') + '\n');
  console.log(`${linhas.length} sessões em ${join(saida, 'nulo.jsonl')}`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
