/**
 * Métodos 4 e 5: juízes cegos.
 *
 * Método 4 (autorrelato causal): pares (A, B) em que A aconteceu antes de B.
 * Parte são ligações causadoPor declaradas pelo modelo gerador (reais) e
 * parte são distratores: pares da mesma sessão, com a mesma ordem temporal,
 * que o gerador NÃO ligou. Os juízes não sabem qual é qual nem qual modelo
 * gerou a sessão. Se o autorrelato causal tem conteúdo, as reais devem
 * receber notas maiores que os distratores (AUC > 0,5).
 *
 * Método 5 (fidelidade dos relatos): para cada relato, o evento real e a
 * versão contada; o juiz classifica em fiel, omissão, distorção, contradição
 * ou invenção e dá uma nota de fidelidade.
 *
 *   npx tsx sim/validacao/juizes.ts --metodo causal|relatos --fontes <dirs> \
 *     --juizes claude-opus-4-8,claude-haiku-4-5-20251001 --por-modelo 60 --lote 8 \
 *     --saida experimentos/validacao/m4-juiz-causal
 */

import { join } from 'node:path';
import { z } from 'zod';
import { criarProvedor } from '../../core/llm/registro';
import type { NomeProvedor, ProvedorLLM } from '../../core/llm/provedor';
import { criarRng, hashTexto } from '../../core/util/aleatorio';
import { lerArgs, numero, texto } from '../args';
import { carregarMundo } from '../arquivos';
import { chamarAuditado, embaralhar, executarLote, lerSessoes, modeloGerador } from './comum';

const AvaliacaoCausal = z.object({
  avaliacoes: z.array(z.object({ id: z.string(), nota: z.number().int().min(1).max(5), plausivel: z.boolean() })),
});
const AvaliacaoRelato = z.object({
  avaliacoes: z.array(
    z.object({
      id: z.string(),
      categoria: z.enum(['fiel', 'omissao', 'distorcao', 'contradicao', 'invencao']),
      fidelidade: z.number().int().min(1).max(5),
    })
  ),
});

const SISTEMA_CAUSAL = `Você avalia ligações de causa e efeito entre acontecimentos de uma história.
Em cada par, o acontecimento A ocorreu antes do acontecimento B.
Julgue se A plausivelmente contribuiu para B: tornou B possível, motivou B ou mudou as condições em que B aconteceu.
Dê uma nota de 1 (nenhuma relação) a 5 (A claramente contribuiu para B) e diga se a ligação é plausível.
Responda apenas com JSON no formato {"avaliacoes": [{"id", "nota", "plausivel"}]}, com um item para cada par.`;

const SISTEMA_RELATOS = `Você compara o que realmente aconteceu com o que um personagem contou a outro.
Para cada item, classifique a versão contada em uma categoria:
- fiel: conta o essencial do que aconteceu, sem distorcer;
- omissao: é verdadeira, mas deixa de fora algo importante;
- distorcao: muda o sentido, exagera ou atenua o que aconteceu;
- contradicao: afirma algo incompatível com o que aconteceu;
- invencao: fala de algo que não tem relação com o que aconteceu.
Dê também uma nota de fidelidade de 1 (nada fiel) a 5 (totalmente fiel).
Responda apenas com JSON no formato {"avaliacoes": [{"id", "categoria", "fidelidade"}]}, com um item para cada item recebido.`;

function lotes<T>(lista: T[], n: number): T[][] {
  const saida: T[][] = [];
  for (let i = 0; i < lista.length; i += n) saida.push(lista.slice(i, i + n));
  return saida;
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const metodo = texto(args, 'metodo', 'causal')!;
  const fontes = texto(args, 'fontes')!.split(',');
  const juizes = texto(args, 'juizes', 'claude-opus-4-8,claude-haiku-4-5-20251001')!.split(',');
  const provedorNome = texto(args, 'provedor', 'claude-cli') as NomeProvedor;
  const porModelo = numero(args, 'por-modelo', 60);
  const fracDistratores = numero(args, 'distratores', 0.33);
  const tamLote = numero(args, 'lote', 8);
  const semente = numero(args, 'semente', 7);
  const saida = texto(args, 'saida')!;
  const concorrencia = numero(args, 'concorrencia', 4);
  const rng = criarRng(semente);

  const sessoes = (await lerSessoes(fontes)).filter((s) => metodo === 'relatos' || s.eventos.length > 0);
  const nomesMundo = new Map<string, string>();
  for (const s of sessoes) nomesMundo.set(s.condicao.mundo, (await carregarMundo(s.condicao.mundo)).nome);

  // itens por modelo gerador
  const porGerador = new Map<string, any[]>();
  for (const s of sessoes) {
    const gerador = `${modeloGerador(s.condicao)}${s.condicao.controle ? ' [controle]' : ''}`;
    const lista = porGerador.get(gerador) ?? [];
    if (metodo === 'causal') {
      const porId = new Map(s.eventos.map((e: any) => [e.id, e]));
      const ligados = new Set<string>();
      for (const b of s.eventos) {
        for (const aId of new Set<string>(b.causadoPor)) {
          const a: any = porId.get(aId);
          if (!a || a.turno > b.turno || aId === b.id) continue;
          ligados.add(`${aId}>${b.id}`);
          lista.push({ tipo: 'real', sessao: s.nome, mundo: s.condicao.mundo, a, b });
        }
      }
      // distratores: A anterior a B, na mesma sessão, sem ligação declarada
      const candidatos: any[] = [];
      for (const b of s.eventos)
        for (const a of s.eventos)
          if (a.turno < b.turno && b.turno - a.turno <= 4 && !ligados.has(`${a.id}>${b.id}`))
            candidatos.push({ tipo: 'distrator', sessao: s.nome, mundo: s.condicao.mundo, a, b });
      lista.push(...embaralhar(candidatos, rng).slice(0, Math.ceil(ligados.size * 0.6) + 5));
    } else {
      const porId = new Map(s.eventos.map((e: any) => [e.id, e]));
      for (const r of s.relatos) {
        const real: any = porId.get(r.eventoId);
        if (real) lista.push({ tipo: 'relato', sessao: s.nome, mundo: s.condicao.mundo, real, r });
      }
    }
    porGerador.set(gerador, lista);
  }

  // amostra estratificada por modelo gerador
  const amostra: any[] = [];
  for (const [gerador, lista] of [...porGerador.entries()].sort()) {
    if (metodo === 'causal') {
      const reais = embaralhar(lista.filter((x) => x.tipo === 'real'), rng);
      const dist = embaralhar(lista.filter((x) => x.tipo === 'distrator'), rng);
      const nDist = Math.round(porModelo * fracDistratores);
      amostra.push(...reais.slice(0, porModelo - nDist).map((x) => ({ ...x, gerador })));
      amostra.push(...dist.slice(0, nDist).map((x) => ({ ...x, gerador })));
    } else {
      amostra.push(...embaralhar(lista, rng).slice(0, porModelo).map((x) => ({ ...x, gerador })));
    }
  }
  const itens = embaralhar(amostra, rng).map((x, i) => ({ ...x, item: `I${String(i + 1).padStart(4, '0')}` }));
  process.stderr.write(
    `${metodo}: ${itens.length} itens de ${sessoes.length} sessões; por gerador: ${[...new Set(itens.map((i) => i.gerador))]
      .map((g) => `${g}=${itens.filter((i) => i.gerador === g).length}`)
      .join(', ')}\n`
  );

  const provedores = new Map<string, ProvedorLLM>();
  for (const j of juizes) provedores.set(j, await criarProvedor({ provedor: provedorNome, modelo: j }));

  // lotes agrupados por mundo (o juiz recebe o nome do mundo como contexto)
  const tarefas: { id: string; juiz: string; itens: any[] }[] = [];
  for (const mundo of [...new Set(itens.map((i) => i.mundo))].sort()) {
    const doMundo = itens.filter((i) => i.mundo === mundo);
    lotes(doMundo, tamLote).forEach((l, k) => {
      for (const j of juizes) tarefas.push({ id: `${mundo}|lote${k + 1}|${j}`, juiz: j, itens: l });
    });
  }

  await executarLote(
    tarefas,
    async ({ juiz, itens: lote }) => {
      const mundo = nomesMundo.get(lote[0].mundo) ?? lote[0].mundo;
      const usuario =
        metodo === 'causal'
          ? `História passada em ${mundo}.\n\n` +
            lote.map((x: any) => `[${x.item}]\nA (dia ${x.a.dia}): ${x.a.conteudo}\nB (dia ${x.b.dia}): ${x.b.conteudo}`).join('\n\n')
          : `História passada em ${mundo}.\n\n` +
            lote.map((x: any) => `[${x.item}]\nO que aconteceu (dia ${x.real.dia}): ${x.real.conteudo}\nO que foi contado (dia ${x.r.dia}): ${x.r.versao}`).join('\n\n');
      const { resposta, registro } = await chamarAuditado(provedores.get(juiz)!, {
        sistema: metodo === 'causal' ? SISTEMA_CAUSAL : SISTEMA_RELATOS,
        usuario,
        esquema: metodo === 'causal' ? AvaliacaoCausal : AvaliacaoRelato,
        temperatura: 0,
        maxTokens: 4000,
        meta: { tarefa: `juiz-${metodo}` },
      });
      const avaliacoes = ((resposta.json as any)?.avaliacoes ?? []) as any[];
      const porItem = new Map(avaliacoes.map((a) => [a.id.replace(/[\[\]]/g, ''), a]));
      return {
        juiz,
        chamada: registro,
        julgamentos: lote.map((x: any) => ({
          item: x.item,
          tipo: x.tipo,
          gerador: x.gerador,
          sessao: x.sessao,
          mundo: x.mundo,
          ...(metodo === 'causal'
            ? { a: x.a.id, b: x.b.id, distanciaDias: x.b.dia - x.a.dia }
            : { relato: x.r.id, evento: x.real.id, de: x.r.deId, para: x.r.paraId }),
          avaliacao: porItem.get(x.item) ?? null,
        })),
      };
    },
    { arquivo: join(saida, 'julgamentos.jsonl'), concorrencia, rotulo: `juiz-${metodo}` }
  );
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
