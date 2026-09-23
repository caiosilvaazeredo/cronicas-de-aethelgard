import type { Transporte } from './provedor';
import { transporteOpenAI } from './openai';

/**
 * Qualquer servidor com API no formato OpenAI (Ollama, vLLM, llama.cpp...).
 * URL em OPENAI_COMPAT_BASE_URL; chave opcional em OPENAI_COMPAT_API_KEY
 * (servidores locais costumam aceitar qualquer valor).
 *
 * O modo json_schema é o padrão; se o servidor não o suportar, use
 * OPENAI_COMPAT_SAIDA=json_object. A validação zod vale do mesmo jeito.
 */
export function transporteCompativelOpenAI(
  modelo: string,
  baseURL = process.env.OPENAI_COMPAT_BASE_URL
): Transporte {
  if (!baseURL) throw new Error('OPENAI_COMPAT_BASE_URL não definida.');
  return transporteOpenAI(modelo, {
    baseURL,
    apiKey: process.env.OPENAI_COMPAT_API_KEY || 'sem-chave',
    saidaEstruturada: process.env.OPENAI_COMPAT_SAIDA === 'json_object' ? 'json_object' : 'json_schema',
  });
}
