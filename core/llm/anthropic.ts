import Anthropic from '@anthropic-ai/sdk';
import { ErroProvedor, type Transporte } from './provedor';

// Modelos em que a API da Anthropic recusa `temperature` (erro 400). Nesses
// a temperatura é omitida e o fato fica registrado em `parametrosEfetivos`,
// porque afeta a comparação entre modelos. Conferido na documentação da API
// em 2026-09; revisar ao incluir um modelo novo.
const PREFIXOS_SEM_TEMPERATURA = [
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-sonnet-5',
];

export function anthropicAceitaTemperatura(modelo: string): boolean {
  return !PREFIXOS_SEM_TEMPERATURA.some((p) => modelo.startsWith(p));
}

/** Transporte pela Messages API (SDK oficial). Chave: ANTHROPIC_API_KEY. */
export function transporteAnthropic(modelo: string, apiKey = process.env.ANTHROPIC_API_KEY): Transporte {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida.');
  const cliente = new Anthropic({ apiKey, maxRetries: 0 });
  const aceitaTemperatura = anthropicAceitaTemperatura(modelo);

  return async (r) => {
    try {
      const resposta = await cliente.messages.create({
        model: modelo,
        max_tokens: r.maxTokens,
        system: r.sistema,
        messages: [{ role: 'user', content: r.usuario }],
        ...(aceitaTemperatura ? { temperature: r.temperatura } : {}),
        ...(r.jsonSchema
          ? { output_config: { format: { type: 'json_schema' as const, schema: r.jsonSchema } } }
          : {}),
      });
      const texto = resposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return {
        texto,
        modeloEfetivo: resposta.model ?? modelo,
        tokensEntrada: resposta.usage?.input_tokens ?? 0,
        tokensSaida: resposta.usage?.output_tokens ?? 0,
        bruto: resposta,
        parametrosEfetivos: {
          temperatura: aceitaTemperatura ? r.temperatura : null,
          temperaturaOmitida: !aceitaTemperatura,
          semente: null, // a API não aceita semente
          stopReason: resposta.stop_reason,
        },
      };
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        throw new ErroProvedor(e.message, e.status ?? null, e.error);
      }
      throw e;
    }
  };
}
