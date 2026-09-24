/**
 * Modelos locais via Ollama (https://ollama.com), pela API compatível com a
 * OpenAI que o Ollama expõe em /v1. Servidor em OLLAMA_BASE_URL (padrão
 * http://localhost:11434).
 *
 * Reprodutibilidade: o identificador precisa ter tag explícita
 * (ex.: qwen3:8b, llama3.1:8b-instruct-q4_K_M; ":latest" é recusado), e o
 * digest do modelo instalado (consultado em /api/tags) é gravado em
 * parametrosEfetivos de cada chamada: se alguém atualizar o modelo com o
 * mesmo nome, a diferença aparece no registro.
 *
 * O Ollama aceita temperatura e semente, e saída estruturada por JSON Schema.
 */

import { ErroProvedor, type Transporte } from './provedor';
import { transporteOpenAI } from './openai';

export function urlOllama(): string {
  return (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '').replace(/\/v1$/, '');
}

export interface ModeloOllama {
  name: string;
  digest: string;
  size: number;
  details?: Record<string, unknown>;
}

export async function listarModelosOllama(base = urlOllama()): Promise<ModeloOllama[]> {
  let res: Response;
  try {
    res = await fetch(`${base}/api/tags`);
  } catch (e) {
    throw new ErroProvedor(`Ollama não respondeu em ${base} (${(e as Error).message}). O servidor está rodando? (ollama serve)`, null);
  }
  if (!res.ok) throw new ErroProvedor(`Ollama respondeu ${res.status} em ${base}/api/tags`, res.status);
  const d = (await res.json()) as { models?: ModeloOllama[] };
  return d.models ?? [];
}

export function transporteOllama(modelo: string): Transporte {
  const base = urlOllama();
  const openai = transporteOpenAI(modelo, {
    baseURL: `${base}/v1`,
    apiKey: 'ollama',
    saidaEstruturada: process.env.OLLAMA_SAIDA === 'json_object' ? 'json_object' : 'json_schema',
  });
  let digest: Promise<string | null> | null = null;
  const obterDigest = () =>
    (digest ??= listarModelosOllama(base).then((ms) => {
      const m = ms.find((x) => x.name === modelo || x.name === `${modelo}:latest`);
      if (!m) {
        throw new ErroProvedor(
          `Modelo ${modelo} não está instalado no Ollama em ${base}. Rode: ollama pull ${modelo}`,
          404
        );
      }
      return m.digest;
    }));

  return async (r) => {
    const d = await obterDigest();
    const saida = await openai(r);
    return {
      ...saida,
      parametrosEfetivos: { ...saida.parametrosEfetivos, via: 'ollama', baseURL: base, digest: d },
    };
  };
}
