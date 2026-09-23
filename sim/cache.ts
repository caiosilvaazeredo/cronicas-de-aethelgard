/**
 * Cache de respostas por hash de (provedor, modelo, prompt, temperatura,
 * semente, esquema, maxTokens). Permite reexecutar análises sem pagar de
 * novo. Um acerto de cache é marcado em chamadas.jsonl (doCache: true).
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { esquemaParaJsonSchema, type ChamadaLLM, type ProvedorLLM, type RespostaLLM } from '../core/llm/provedor';

export function chaveCache(p: { nome: string; modelo: string }, c: ChamadaLLM): string {
  const material = JSON.stringify({
    provedor: p.nome,
    modelo: p.modelo,
    sistema: c.sistema,
    usuario: c.usuario,
    temperatura: c.temperatura,
    semente: c.semente ?? null,
    maxTokens: c.maxTokens,
    esquema: c.esquema ? esquemaParaJsonSchema(c.esquema) : null,
  });
  return createHash('sha256').update(material).digest('hex');
}

export function comCache(provedor: ProvedorLLM, diretorio: string): ProvedorLLM {
  return {
    nome: provedor.nome,
    modelo: provedor.modelo,
    async chamar(c: ChamadaLLM): Promise<RespostaLLM> {
      const chave = chaveCache(provedor, c);
      const pasta = join(diretorio, chave.slice(0, 2));
      const arquivo = join(pasta, `${chave}.json`);
      try {
        const salvo = JSON.parse(await readFile(arquivo, 'utf8')) as RespostaLLM;
        return { ...salvo, doCache: true, latenciaMs: 0 };
      } catch {
        // sem cache: segue para a chamada real
      }
      const r = await provedor.chamar(c);
      await mkdir(pasta, { recursive: true });
      const tmp = `${arquivo}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(r));
      await rename(tmp, arquivo);
      return r;
    },
  };
}
