/**
 * Gera um LOG.md legível a partir das sessões exportadas num diretório.
 *
 *   npm run relatorio -- --dir experimentos/2026-09-24-claude-sonnet-5
 *
 * Para cada sessão: condição, modelos pedidos e efetivos, tempo, chamadas,
 * falhas de estrutura, tokens, custo, grafo (eventos, tramas, descartes) e
 * amostras do texto gerado (eventos, relatos contra o evento real, narrações).
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lerArgs, texto } from './args';
import { sessaoConcluida } from './arquivos';

const lerJsonl = (t: string) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const cortar = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n)}…` : s).replace(/\n/g, ' ');

export async function gerarRelatorio(dir: string): Promise<string> {
  const partes: string[] = [`# Log de sessões: ${dir}\n`, `Gerado por \`npm run relatorio\` em ${new Date().toISOString()}.\n`];
  const nomes = (await readdir(dir)).sort();
  for (const nome of nomes) {
    const s = join(dir, nome);
    if (!(await sessaoConcluida(s))) continue;
    const ler = (f: string) => readFile(join(s, f), 'utf8');
    const condicao = JSON.parse(await ler('condicao.json'));
    const resumo = JSON.parse(await ler('resumo.json'));
    const eventos = lerJsonl(await ler('eventos.jsonl'));
    const relatos = lerJsonl(await ler('relatos.jsonl'));
    const narracoes = lerJsonl(await ler('narracoes.jsonl'));
    const chamadas = lerJsonl(await ler('chamadas.jsonl'));
    const porId = new Map(eventos.map((e: any) => [e.id, e]));
    const m = condicao.modelos;
    const params = [...new Set(chamadas.map((c: any) => JSON.stringify({
      temperatura: c.parametrosEfetivos?.temperatura ?? null,
      semente: c.parametrosEfetivos?.semente === null ? null : 'por chamada',
      via: c.parametrosEfetivos?.via ?? c.provedor,
    })))];

    partes.push(
      `\n## ${nome}\n`,
      `| campo | valor |\n|---|---|`,
      `| tipo | ${condicao.controle ? 'controle de três atos' : 'Cidade Viva'} |`,
      `| mundo | ${condicao.mundo} |`,
      `| agentes | ${condicao.controle ? '(mestre)' : `${condicao.numAgentes}: ${condicao.agentesAtivos.join(', ')}`} |`,
      `| estado das tramas no prompt | ${condicao.estadoTramas} |`,
      `| jogador | ${condicao.jogador} |`,
      `| dias | ${resumo.dias} |`,
      `| semente | ${condicao.semente} |`,
      `| temperatura declarada | ${condicao.temperatura} |`,
      `| parâmetros efetivos | ${params.join('<br>')} |`,
      `| modelo agentes / jogador / curador | ${m.agentes.provedor}/${m.agentes.modelo} · ${m.jogador.provedor}/${m.jogador.modelo} · ${m.curador.provedor}/${m.curador.modelo} |`,
      `| modelos efetivos | ${Object.entries(resumo.modelosEfetivos).map(([p, v]) => `${p}: ${(v as string[]).join(', ')}`).join('<br>')} |`,
      `| tempo total de chamadas | ${(resumo.latenciaTotalMs / 1000).toFixed(0)} s (${(resumo.latenciaTotalMs / 1000 / Math.max(1, resumo.dias)).toFixed(1)} s/dia) |`,
      `| chamadas | ${chamadas.length} (erros de provedor: ${resumo.errosDeChamada}) |`,
      `| falha de estrutura | ${resumo.estrutura.falhas}/${resumo.estrutura.chamadasComEsquema} = ${pct(resumo.estrutura.taxaFalha)}; tentativas médias ${resumo.estrutura.tentativasMedias.toFixed(2)} |`,
      `| falha por papel | ${Object.entries(resumo.estrutura.porPapel).map(([p, v]: any) => `${p} ${v.falhas}/${v.chamadas}`).join(' · ')} |`,
      `| tokens entrada / saída | ${resumo.tokens.entrada} / ${resumo.tokens.saida} |`,
      `| custo | US$ ${resumo.custoUsd.toFixed(4)}${resumo.chamadasSemPreco ? ` (+${resumo.chamadasSemPreco} chamadas sem preço declarado)` : ''} |`,
      `| eventos / relatos | ${resumo.eventos} / ${resumo.relatos} |`,
      `| tramas surgidas / fechadas | ${resumo.tramasSurgidas} / ${resumo.tramasFechadas} (${pct(resumo.proporcaoTramasFechadas)}) |`,
      `| tramas abertas por dia | ${resumo.curvaTramasAbertas.join(' ')} |`,
      `| razão de amarração final | ${resumo.razaoAmarracaoFinal.toFixed(3)} |`,
      `| eventos fundadores | ${resumo.eventosFundadores} |`,
      `| causadoPor: referências / arestas / descartadas | ${resumo.causadoPor.referencias} / ${resumo.causadoPor.arestas} / ${resumo.causadoPor.descartadas} |`,
      `| ações descartadas / agentes sem ação / locais inválidos | ${resumo.acoesDescartadas} / ${resumo.agentesSemAcao} / ${resumo.locaisInvalidos} |`,
      ''
    );

    const falhas = chamadas.filter((c: any) => c.falhaEstrutura || c.erro);
    if (falhas.length) {
      partes.push('**Falhas registradas**\n');
      falhas.slice(0, 5).forEach((c: any) =>
        partes.push(`- dia ${c.dia}, ${c.papel}: ${cortar(c.erro ?? c.falhaEstrutura, 300)}`)
      );
      partes.push('');
    }

    partes.push('**Primeiros eventos**\n');
    eventos.slice(0, 8).forEach((e: any) =>
      partes.push(`- \`${e.id}\` (${e.local}, tensão ${e.tensao}${e.causadoPor.length ? `, causado por ${e.causadoPor.join(', ')}` : ''}): ${cortar(e.conteudo)}`)
    );
    partes.push('\n**Últimos eventos**\n');
    eventos.slice(-6).forEach((e: any) =>
      partes.push(`- \`${e.id}\` (${e.local}, tensão ${e.tensao}${e.causadoPor.length ? `, causado por ${e.causadoPor.join(', ')}` : ''}): ${cortar(e.conteudo)}`)
    );

    if (relatos.length) {
      partes.push('\n**Relatos: evento real × versão contada**\n');
      relatos.slice(0, 4).forEach((r: any) => {
        const real: any = porId.get(r.eventoId);
        partes.push(`- dia ${r.dia}, ${r.deId} → ${r.paraId}, sobre \`${r.eventoId}\``, `  - real: ${cortar(real?.conteudo ?? '?')}`, `  - contado: ${cortar(r.versao)}`);
      });
    }

    partes.push(`\n**Narrações do curador (${narracoes.length})**\n`);
    if (!narracoes.length) partes.push('- nenhuma trama ficou estável nesta sessão');
    narracoes.slice(0, 3).forEach((n: any) =>
      partes.push(`- trama \`${n.tramaId}\`, dia ${n.dia}, ${n.cadeia.length} eventos na cadeia:`, `  > ${cortar(n.texto ?? `(falha: ${n.falhaEstrutura})`, 1200)}`)
    );
    partes.push('');
  }
  const conteudo = partes.join('\n') + '\n';
  await writeFile(join(dir, 'LOG.md'), conteudo);
  return conteudo;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const dir = texto(args, 'dir');
  if (!dir) throw new Error('Use --dir <diretório com sessões>');
  await gerarRelatorio(dir);
  console.log(`LOG.md gravado em ${dir}`);
}

if (process.argv[1] && /relatorio\.ts$/.test(process.argv[1])) {
  principal().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
