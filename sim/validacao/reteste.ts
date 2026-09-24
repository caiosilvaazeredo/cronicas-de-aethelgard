/**
 * Método 3: teste-reteste. O mesmo estado do mundo (o prompt exato de ações
 * dos agentes de um dia de uma sessão já gravada) é reenviado R vezes a cada
 * modelo. Mede, por resposta: validade do esquema, cobertura (uma ação por
 * agente), ids e locais válidos, referências causais válidas (só ids que
 * aparecem no prompt), ligações por ação e tensão; e, entre repetições,
 * a estabilidade (Jaccard das ligações causais e do vocabulário das ações).
 *
 *   npx tsx sim/validacao/reteste.ts --fontes experimentos/2026-09-24-claude-sonnet-5 \
 *     --dias 4,10 --modelos claude-haiku-4-5-20251001,claude-sonnet-5 --repeticoes 12 \
 *     --saida experimentos/validacao/m3-reteste
 */

import { join } from 'node:path';
import { AcoesDoDia } from '../../core/llm/esquemas';
import { criarProvedor } from '../../core/llm/registro';
import type { NomeProvedor, ProvedorLLM } from '../../core/llm/provedor';
import { MAX_TOKENS_PADRAO } from '../../core/mundo/motor';
import { lerArgs, numero, texto } from '../args';
import { carregarMundo } from '../arquivos';
import { chamarAuditado, executarLote, lerSessoes } from './comum';

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const fontes = texto(args, 'fontes')!.split(',');
  const dias = texto(args, 'dias', '4,10')!.split(',').map(Number);
  const modelos = texto(args, 'modelos')!.split(',');
  const provedorNome = texto(args, 'provedor', 'claude-cli') as NomeProvedor;
  const R = numero(args, 'repeticoes', 12);
  const saida = texto(args, 'saida', 'experimentos/validacao/m3-reteste')!;
  const concorrencia = numero(args, 'concorrencia', 6);

  const sessoes = (await lerSessoes(fontes, true)).filter((s) => !s.condicao.controle);
  const snapshots: any[] = [];
  for (const s of sessoes) {
    const mundo = await carregarMundo(s.condicao.mundo);
    for (const d of dias) {
      const c = s.chamadas.find((x: any) => x.papel === 'agentes' && x.dia === d && !x.erro);
      if (!c) continue;
      snapshots.push({
        snapshot: `${s.nome}@dia${d}`,
        sistema: c.sistema,
        usuario: c.usuario,
        agentes: s.condicao.agentesAtivos,
        locais: mundo.locais.map((l) => l.id),
        visiveis: [...new Set([...c.usuario.matchAll(/\((D\d+\.[\w-]+)\)/g)].map((m: RegExpMatchArray) => m[1]))],
        estadoTramas: s.condicao.estadoTramas,
      });
    }
  }
  process.stderr.write(`${snapshots.length} estados congelados\n`);

  const provedores = new Map<string, ProvedorLLM>();
  for (const m of modelos) provedores.set(m, await criarProvedor({ provedor: provedorNome, modelo: m }));

  const itens = snapshots.flatMap((sn) =>
    modelos.flatMap((m) => Array.from({ length: R }, (_, r) => ({ id: `${sn.snapshot}|${m}|r${r + 1}`, sn, modelo: m, rep: r + 1 })))
  );

  await executarLote(
    itens,
    async ({ sn, modelo, rep }) => {
      const { resposta, registro } = await chamarAuditado(provedores.get(modelo)!, {
        sistema: sn.sistema,
        usuario: sn.usuario,
        esquema: AcoesDoDia,
        temperatura: 0.7,
        maxTokens: MAX_TOKENS_PADRAO.agentes,
        meta: { tarefa: 'reteste', papel: 'agentes' },
      });
      const json = resposta.json as AcoesDoDia | undefined;
      const acoes = json?.acoes ?? [];
      const visiveis = new Set(sn.visiveis);
      const refs = acoes.flatMap((a) => a.causadoPor);
      const agentesComAcao = new Set(acoes.filter((a) => sn.agentes.includes(a.agenteId)).map((a) => a.agenteId));
      return {
        snapshot: sn.snapshot,
        estadoTramas: sn.estadoTramas,
        modelo,
        rep,
        valido: !!json,
        numAcoes: acoes.length,
        cobertura: agentesComAcao.size / sn.agentes.length,
        idsInvalidos: acoes.filter((a) => !sn.agentes.includes(a.agenteId)).length,
        locaisInvalidos: acoes.filter((a) => !sn.locais.includes(a.local)).length,
        referencias: refs.length,
        referenciasValidas: refs.filter((r) => visiveis.has(r)).length,
        ligacoesPorAcao: acoes.length ? refs.length / acoes.length : 0,
        tensaoMedia: acoes.length ? acoes.reduce((n, a) => n + a.tensao, 0) / acoes.length : null,
        acoes: acoes.map((a) => ({ agenteId: a.agenteId, local: a.local, acao: a.acao, causadoPor: a.causadoPor, tensao: a.tensao })),
        chamada: registro,
      };
    },
    { arquivo: join(saida, 'reteste.jsonl'), concorrencia, rotulo: 'reteste' }
  );
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
