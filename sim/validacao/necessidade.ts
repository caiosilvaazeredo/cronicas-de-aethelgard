/**
 * Teste de necessidade causal por intervenção (proposta 6).
 *
 * O grau no grafo diz quais eventos TÊM ligações; este teste pergunta se elas
 * são NECESSÁRIAS. Para uma amostra de pares (A, B), com A anterior a B, um
 * modelo recebe a história que leva a B e responde: "se A não tivesse
 * acontecido, qual a chance de B acontecer mesmo assim?". A necessidade de A
 * para B é 100 menos essa chance.
 *
 * Tipos de par:
 *  - 'direta': A está em causadoPor de B (ligação declarada pelo gerador);
 *  - 'indireta': A é ancestral de B por um caminho de 2+ ligações;
 *  - 'nao-ligado': A é anterior a B, na mesma sessão, sem caminho até B
 *    (controle: a necessidade deveria ser baixa).
 *
 * Se as ligações declaradas carregam causalidade de fato, a necessidade
 * esperada é direta > indireta > não ligado. O script também relaciona a
 * necessidade com o grau de saída de A (eventos "kernel" pelo grau devem ser
 * mais necessários) e grava um resumo.
 *
 *   npx tsx sim/validacao/necessidade.ts --fontes experimentos/validacao/v1-cidade-viva-claude \
 *     --modelo claude-sonnet-5 --por-tipo 30 --lote 4 --saida experimentos/validacao/m6-necessidade
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { construirArestas } from '../../services/arcos';
import { criarProvedor } from '../../core/llm/registro';
import type { NomeProvedor } from '../../core/llm/provedor';
import { criarRng } from '../../core/util/aleatorio';
import { lerArgs, numero, texto } from '../args';
import { carregarMundo } from '../arquivos';
import { chamarAuditado, embaralhar, executarLote, lerJsonl, lerSessoes, modeloGerador } from './comum';

const Resposta = z.object({
  avaliacoes: z.array(z.object({ id: z.string(), chance: z.number().min(0).max(100) })),
});

const SISTEMA = `Você avalia histórias por raciocínio contrafactual.
Para cada item, você recebe acontecimentos em ordem, um acontecimento A marcado e um acontecimento B posterior.
Suponha que A NÃO tivesse acontecido, e todo o resto da situação fosse o mesmo até onde A não interfere.
Estime a chance, de 0 a 100, de que B acontecesse mesmo assim, do mesmo modo.
0 significa que B certamente não aconteceria sem A; 100 significa que A não faz diferença para B.
Responda apenas com JSON no formato {"avaliacoes": [{"id", "chance"}]}, com um item para cada item recebido.`;

function ancestrais(id: string, entrada: Map<string, string[]>): Map<string, number> {
  // distância mínima (em ligações) de cada ancestral até id
  const dist = new Map<string, number>();
  let fronteira = [id];
  let d = 0;
  while (fronteira.length) {
    d += 1;
    const prox: string[] = [];
    for (const v of fronteira)
      for (const o of entrada.get(v) ?? [])
        if (!dist.has(o)) {
          dist.set(o, d);
          prox.push(o);
        }
    fronteira = prox;
  }
  return dist;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const fontes = texto(args, 'fontes')!.split(',');
  const modelo = texto(args, 'modelo', 'claude-sonnet-5')!;
  const provedorNome = texto(args, 'provedor', 'claude-cli') as NomeProvedor;
  const porTipo = numero(args, 'por-tipo', 30);
  const tamLote = numero(args, 'lote', 4);
  const contexto = numero(args, 'contexto', 8);
  const saida = texto(args, 'saida', 'experimentos/validacao/m6-necessidade')!;
  const rng = criarRng(numero(args, 'semente', 11));

  const sessoes = (await lerSessoes(fontes)).filter((s) => s.eventos.length > 0);
  const pool: Record<string, any[]> = { direta: [], indireta: [], 'nao-ligado': [] };
  const nomesMundo = new Map<string, string>();
  for (const s of sessoes) {
    nomesMundo.set(s.condicao.mundo, (await carregarMundo(s.condicao.mundo)).nome);
    const { entrada, saida: saidaG } = construirArestas(s.eventos);
    const porId = new Map(s.eventos.map((e: any) => [e.id, e]));
    for (const b of s.eventos) {
      if ((entrada.get(b.id) ?? []).length === 0 || b.dia < 3) continue;
      const anc = ancestrais(b.id, entrada);
      // contexto: os ancestrais mais próximos no tempo, em ordem
      const ctx = [...anc.keys()].map((id) => porId.get(id)).sort((x: any, y: any) => x.turno - y.turno).slice(-contexto);
      const base = { sessao: s.nome, gerador: modeloGerador(s.condicao), controle: s.condicao.controle, mundo: s.condicao.mundo, b };
      for (const [aId, d] of anc) {
        const a = porId.get(aId);
        const tipo = d === 1 ? 'direta' : 'indireta';
        pool[tipo].push({ ...base, tipo, a, ctx, grauSaidaA: (saidaG.get(aId) ?? []).length, distancia: d });
      }
      const naoLigados = s.eventos.filter((a: any) => a.turno < b.turno && b.turno - a.turno <= 4 && !anc.has(a.id));
      for (const a of naoLigados) pool['nao-ligado'].push({ ...base, tipo: 'nao-ligado', a, ctx, grauSaidaA: (saidaG.get(a.id) ?? []).length, distancia: null });
    }
  }
  const amostra = Object.values(pool).flatMap((lista) => embaralhar(lista, rng).slice(0, porTipo));
  const itens = embaralhar(amostra, rng).map((x, i) => ({ ...x, item: `N${String(i + 1).padStart(4, '0')}` }));
  process.stderr.write(`necessidade: ${itens.length} pares (${Object.entries(pool).map(([k, v]) => `${k}: ${v.length} disponíveis`).join(', ')})\n`);

  const provedor = await criarProvedor({ provedor: provedorNome, modelo });
  const lotes: { id: string; itens: any[] }[] = [];
  for (let i = 0; i < itens.length; i += tamLote) lotes.push({ id: `lote${lotes.length + 1}`, itens: itens.slice(i, i + tamLote) });

  const arquivo = join(saida, 'julgamentos.jsonl');
  await executarLote(
    lotes,
    async ({ itens: lote }) => {
      const usuario = lote
        .map((x: any) => {
          // o contexto de um par não ligado inclui A, para que o juiz saiba o que é A
          const ctx = x.ctx.some((e: any) => e.id === x.a.id) ? x.ctx : [...x.ctx, x.a].sort((p: any, q: any) => p.turno - q.turno);
          const linhas = ctx.map((e: any) => `${e.id === x.a.id ? '[A] ' : ''}dia ${e.dia}: ${e.conteudo}`).join('\n');
          return `[${x.item}] História em ${nomesMundo.get(x.mundo)}:\n${linhas}\n[B] dia ${x.b.dia}: ${x.b.conteudo}`;
        })
        .join('\n\n');
      const { resposta, registro } = await chamarAuditado(provedor, {
        sistema: SISTEMA,
        usuario,
        esquema: Resposta,
        temperatura: 0,
        maxTokens: 3000,
        meta: { tarefa: 'necessidade', dadosSimulacao: { ids: lote.map((x: any) => x.item) } },
      });
      const porItem = new Map(((resposta.json as any)?.avaliacoes ?? []).map((a: any) => [String(a.id).replace(/[[\]]/g, ''), a.chance]));
      return {
        juiz: modelo,
        chamada: registro,
        julgamentos: lote.map((x: any) => ({
          item: x.item, tipo: x.tipo, gerador: x.gerador, controle: x.controle, sessao: x.sessao,
          a: x.a.id, b: x.b.id, distancia: x.distancia, grauSaidaA: x.grauSaidaA,
          chance: porItem.get(x.item) ?? null,
          necessidade: porItem.has(x.item) ? 100 - (porItem.get(x.item) as number) : null,
        })),
      };
    },
    { arquivo, concorrencia: numero(args, 'concorrencia', 3), rotulo: 'necessidade' }
  );

  // resumo
  const js = lerJsonl(await readFile(arquivo, 'utf8')).filter((l: any) => l.julgamentos).flatMap((l: any) => l.julgamentos).filter((j: any) => j.necessidade !== null);
  const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const porTipoRes = Object.fromEntries(['direta', 'indireta', 'nao-ligado'].map((t) => {
    const v = js.filter((j: any) => j.tipo === t).map((j: any) => j.necessidade);
    return [t, { n: v.length, necessidadeMedia: media(v) }];
  }));
  const auc = (pos: number[], neg: number[]) => {
    if (!pos.length || !neg.length) return null;
    let s = 0;
    for (const p of pos) for (const q of neg) s += p > q ? 1 : p === q ? 0.5 : 0;
    return s / (pos.length * neg.length);
  };
  const dir = js.filter((j: any) => j.tipo === 'direta').map((j: any) => j.necessidade);
  const nl = js.filter((j: any) => j.tipo === 'nao-ligado').map((j: any) => j.necessidade);
  const ind = js.filter((j: any) => j.tipo === 'indireta').map((j: any) => j.necessidade);
  const postos = (v: number[]) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const spearman = (x: number[], y: number[]) => { if (x.length < 3) return null; const rx = postos(x), ry = postos(y); const mx = media(rx)!, my = media(ry)!; let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; } return dx && dy ? n / Math.sqrt(dx * dy) : null; };
  const ligados = js.filter((j: any) => j.tipo !== 'nao-ligado');
  const resumo = {
    juiz: modelo,
    pares: js.length,
    porTipo: porTipoRes,
    aucDiretaVsNaoLigado: auc(dir, nl),
    aucIndiretaVsNaoLigado: auc(ind, nl),
    aucDiretaVsIndireta: auc(dir, ind),
    spearmanGrauSaidaNecessidade: spearman(ligados.map((j: any) => j.grauSaidaA), ligados.map((j: any) => j.necessidade)),
    porGerador: Object.fromEntries([...new Set(js.map((j: any) => j.gerador))].map((g) => [g, Object.fromEntries(['direta', 'indireta', 'nao-ligado'].map((t) => [t, media(js.filter((j: any) => j.gerador === g && j.tipo === t).map((j: any) => j.necessidade))]))])),
  };
  await writeFile(join(saida, 'resumo.json'), JSON.stringify(resumo, null, 2) + '\n');
  console.log(JSON.stringify(resumo, null, 2));
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
