/**
 * Log consolidado de todos os experimentos: percorre experimentos/ (ou
 * --raiz), regenera o LOG.md de cada pasta de sessões e grava
 * <raiz>/LOG-GERAL.md com uma linha por sessão e o resumo dos métodos de
 * validação que não são sessões (reteste, juízes, necessidade).
 *
 *   npm run log-experimentos
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { reanalisar } from '../core/experimento/reanalise';
import { resumirLinhagem, type Linhagem } from '../services/linhagem';
import { metricasDoGrafo } from '../services/grafo';
import { lerArgs, texto } from './args';
import { existe, sessaoConcluida } from './arquivos';
import { gerarRelatorio } from './relatorio';

const lerJsonl = (t: string) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pct = (x: number | null | undefined) => (x === null || x === undefined ? '–' : `${(100 * x).toFixed(0)}%`);

async function pastasDeSessao(raiz: string): Promise<{ pasta: string; sessoes: string[] }[]> {
  const saida: { pasta: string; sessoes: string[] }[] = [];
  const visitar = async (dir: string, nivel: number) => {
    let filhos: string[] = [];
    try {
      filhos = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.includes('.tmp-')).map((d) => d.name).sort();
    } catch {
      return;
    }
    const sessoes: string[] = [];
    for (const f of filhos) {
      if (await sessaoConcluida(join(dir, f))) sessoes.push(join(dir, f));
      else if (nivel < 3) await visitar(join(dir, f), nivel + 1);
    }
    if (sessoes.length) saida.push({ pasta: dir, sessoes });
  };
  await visitar(raiz, 0);
  return saida;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const raiz = texto(args, 'raiz', 'experimentos')!;
  const L: string[] = [
    '# Log geral dos experimentos',
    '',
    `Gerado por \`npm run log-experimentos\` em ${new Date().toISOString()}. Cada pasta tem o seu LOG.md com o detalhe de cada sessão (condição, modelos, chamadas, falhas, custo, grafo, linhagem das tramas, amostras de eventos, relatos e narrações).`,
    '',
    'Colunas: **nasc./fech./fund.** = tramas nascidas / fechadas por estabilidade / absorvidas por fusão (emenda 1 do pré-registro); **pontes F** = pontes de fusão.',
    '',
  ];
  let totalSessoes = 0;
  let totalChamadas = 0;
  let totalCusto = 0;

  for (const { pasta, sessoes } of await pastasDeSessao(raiz)) {
    await gerarRelatorio(pasta);
    L.push(`## ${relative(raiz, pasta) || '.'}`, '', `Detalhe: [${relative(raiz, join(pasta, 'LOG.md'))}](${relative(raiz, join(pasta, 'LOG.md'))})`, '');
    L.push('| sessão | modelo (agentes) | tipo | cond. | dias | eventos | relatos | chamadas | falha estr. | custo US$ | nasc./fech./fund. | fechadas (em. 1) | ligações | pontes F | tipadas |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const s of sessoes) {
      const ler = (f: string) => readFile(join(s, f), 'utf8');
      const c = JSON.parse(await ler('condicao.json'));
      const r = JSON.parse(await ler('resumo.json'));
      const eventos = lerJsonl(await ler('eventos.jsonl'));
      const linhagem: Linhagem = (await existe(join(s, 'linhagem.json')))
        ? JSON.parse(await ler('linhagem.json'))
        : reanalisar(eventos, c.dias, c.limiarEstabilidade ?? 3).linhagem;
      const lr = resumirLinhagem(linhagem);
      const g = metricasDoGrafo(eventos);
      const chamadas = r.estrutura.chamadasComEsquema + r.errosDeChamada;
      totalSessoes += 1;
      totalChamadas += chamadas;
      totalCusto += r.custoUsd;
      L.push(
        `| ${s.split('/').pop()} | ${c.modelos.agentes.provedor}/${c.modelos.agentes.modelo} | ${c.controle ? 'três atos' : 'Cidade Viva'} | ${c.estadoTramas} | ${r.dias} | ${r.eventos} | ${r.relatos} | ${chamadas} | ${pct(r.estrutura.taxaFalha)} | ${r.custoUsd.toFixed(2)} | ${lr.nascidas}/${lr.fechadasPorEstabilidade}/${lr.fundidasAntesDeFechar} | ${pct(lr.proporcaoFechadasPorEstabilidade)} | ${g.ligacoes} | ${g.pontesDeFusao} | ${c.ligacoesTipadas ? 'sim' : 'não'} |`
      );
    }
    L.push('');
  }

  // métodos de validação que não são sessões
  const extras: [string, string][] = [
    ['validacao/m3-reteste/reteste.jsonl', 'Método 3: teste-reteste'],
    ['validacao/m4-juiz-causal/julgamentos.jsonl', 'Método 4: juiz cego do autorrelato causal'],
    ['validacao/m5-juiz-relatos/julgamentos.jsonl', 'Método 5: fidelidade dos relatos'],
    ['validacao/m6-necessidade/julgamentos.jsonl', 'Método 6: necessidade causal por intervenção'],
    ['validacao/m6b-necessidade-tipadas/julgamentos.jsonl', 'Método 6b: necessidade × tipo e força das ligações'],
  ];
  L.push('## Métodos de validação que não são sessões', '', '| método | arquivo | chamadas | itens julgados | custo US$ |', '|---|---|---|---|---|');
  for (const [arq, nome] of extras) {
    const caminho = join(raiz, arq);
    if (!(await existe(caminho))) continue;
    const linhas = lerJsonl(await readFile(caminho, 'utf8')).filter((l: any) => !l.erro);
    const custo = linhas.reduce((n: number, l: any) => n + (l.chamada?.custoUsd ?? 0), 0);
    const itens = linhas.reduce((n: number, l: any) => n + (l.julgamentos?.length ?? 0), 0);
    totalChamadas += linhas.length;
    totalCusto += custo;
    L.push(`| ${nome} | \`${arq}\` | ${linhas.length} | ${itens || '–'} | ${custo.toFixed(2)} |`);
  }
  L.push('', `**Total:** ${totalSessoes} sessões, ${totalChamadas} chamadas de IA registradas, US$ ${totalCusto.toFixed(2)} (custo informado pelos provedores; sessões com provedor sem preço declarado contam 0).`, '');
  await writeFile(join(raiz, 'LOG-GERAL.md'), L.join('\n'));
  console.log(`LOG-GERAL.md gravado em ${raiz} (${totalSessoes} sessões, ${totalChamadas} chamadas)`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
