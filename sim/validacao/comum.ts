/**
 * Infraestrutura comum dos métodos de validação 3, 4 e 5: leitura das sessões
 * exportadas, execução em lote com concorrência limitada e retomada (itens já
 * gravados no JSONL de saída são pulados) e registro de cada chamada.
 */

import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ChamadaLLM, ProvedorLLM } from '../../core/llm/provedor';
import { sessaoConcluida } from '../arquivos';

export const lerJsonl = (t: string) =>
  t
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

export interface SessaoLida {
  dir: string;
  nome: string;
  condicao: any;
  eventos: any[];
  relatos: any[];
  chamadas: any[];
}

/** Todas as sessões concluídas sob as raízes dadas (busca em até 2 níveis). */
export async function lerSessoes(raizes: string[], comChamadas = false): Promise<SessaoLida[]> {
  const saida: SessaoLida[] = [];
  const visitar = async (dir: string, nivel: number) => {
    if (await sessaoConcluida(dir)) {
      const ler = (f: string) => readFile(join(dir, f), 'utf8');
      saida.push({
        dir,
        nome: dir.split('/').pop()!,
        condicao: JSON.parse(await ler('condicao.json')),
        eventos: lerJsonl(await ler('eventos.jsonl')),
        relatos: lerJsonl(await ler('relatos.jsonl')),
        chamadas: comChamadas ? lerJsonl(await ler('chamadas.jsonl')) : [],
      });
      return;
    }
    if (nivel >= 2) return;
    let filhos: string[] = [];
    try {
      filhos = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return;
    }
    for (const f of filhos.sort()) if (!f.includes('.tmp-')) await visitar(join(dir, f), nivel + 1);
  };
  for (const r of raizes) await visitar(r, 0);
  return saida;
}

export function modeloGerador(condicao: any): string {
  return condicao.modelos.agentes.modelo;
}

export async function idsJaGravados(arquivo: string): Promise<Set<string>> {
  try {
    return new Set(lerJsonl(await readFile(arquivo, 'utf8')).map((l: any) => l.id));
  } catch {
    return new Set();
  }
}

/** Executa `fn` para cada item pendente, com concorrência limitada, gravando cada resultado ao terminar. */
export async function executarLote<T extends { id: string }>(
  itens: T[],
  fn: (item: T) => Promise<Record<string, unknown>>,
  opcoes: { arquivo: string; concorrencia: number; rotulo: string }
): Promise<void> {
  await mkdir(dirname(opcoes.arquivo), { recursive: true });
  const feitos = await idsJaGravados(opcoes.arquivo);
  const fila = itens.filter((i) => !feitos.has(i.id));
  process.stderr.write(`${opcoes.rotulo}: ${itens.length} itens, ${feitos.size} já feitos, ${fila.length} pendentes\n`);
  let n = 0;
  const trabalhador = async () => {
    while (fila.length > 0) {
      const item = fila.shift()!;
      try {
        const r = await fn(item);
        await appendFile(opcoes.arquivo, JSON.stringify({ id: item.id, ...r }) + '\n');
      } catch (e) {
        await appendFile(opcoes.arquivo, JSON.stringify({ id: item.id, erro: (e as Error).message }) + '\n');
      }
      n += 1;
      if (n % 10 === 0) process.stderr.write(`${opcoes.rotulo}: ${n}/${itens.length - feitos.size}\n`);
    }
  };
  await Promise.all(Array.from({ length: opcoes.concorrencia }, trabalhador));
}

/** Chama o provedor e devolve os campos de auditoria que vão para o JSONL. */
export async function chamarAuditado(p: ProvedorLLM, c: ChamadaLLM) {
  const r = await p.chamar(c);
  return {
    resposta: r,
    registro: {
      provedor: p.nome,
      modeloSolicitado: p.modelo,
      modeloEfetivo: r.modeloEfetivo,
      tentativas: r.tentativas,
      falhaEstrutura: r.falhaEstrutura ?? null,
      tokensEntrada: r.tokensEntrada,
      tokensSaida: r.tokensSaida,
      latenciaMs: r.latenciaMs,
      custoUsd: r.custoUsd ?? null,
      sistema: c.sistema,
      usuario: c.usuario,
      texto: r.texto,
    },
  };
}

/** Embaralhamento determinístico (Fisher-Yates com mulberry32). */
export function embaralhar<T>(lista: T[], rng: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
