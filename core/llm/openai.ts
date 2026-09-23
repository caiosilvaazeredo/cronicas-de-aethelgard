import OpenAI from 'openai';
import { ErroProvedor, type Transporte } from './provedor';

export interface OpcoesOpenAI {
  apiKey?: string;
  baseURL?: string;
  /** o modo json_schema estrito nem sempre existe em servidores compatíveis */
  saidaEstruturada?: 'json_schema' | 'json_object';
}

/**
 * Transporte pela API Chat Completions da OpenAI (SDK oficial). Também serve
 * de base para `compativel-openai`, que só troca a URL e a chave.
 */
export function transporteOpenAI(modelo: string, opcoes: OpcoesOpenAI = {}): Transporte {
  const apiKey = opcoes.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não definida.');
  const cliente = new OpenAI({ apiKey, baseURL: opcoes.baseURL, maxRetries: 0 });
  const modo = opcoes.saidaEstruturada ?? 'json_schema';

  return async (r) => {
    try {
      const resposta = await cliente.chat.completions.create({
        model: modelo,
        messages: [
          { role: 'system', content: r.sistema },
          { role: 'user', content: r.usuario },
        ],
        temperature: r.temperatura,
        seed: r.semente,
        max_completion_tokens: r.maxTokens,
        ...(r.jsonSchema
          ? {
              response_format:
                modo === 'json_schema'
                  ? {
                      type: 'json_schema' as const,
                      json_schema: { name: 'resposta', schema: r.jsonSchema, strict: true },
                    }
                  : { type: 'json_object' as const },
            }
          : {}),
      });
      return {
        texto: resposta.choices[0]?.message?.content ?? '',
        modeloEfetivo: resposta.model ?? modelo,
        tokensEntrada: resposta.usage?.prompt_tokens ?? 0,
        tokensSaida: resposta.usage?.completion_tokens ?? 0,
        bruto: resposta,
        parametrosEfetivos: {
          temperatura: r.temperatura,
          semente: r.semente ?? null,
          systemFingerprint: resposta.system_fingerprint ?? null,
          saidaEstruturada: r.jsonSchema ? modo : null,
        },
      };
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        throw new ErroProvedor(e.message, e.status ?? null, e.error);
      }
      throw e;
    }
  };
}
