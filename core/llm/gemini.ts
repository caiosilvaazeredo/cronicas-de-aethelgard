import { GoogleGenAI } from '@google/genai';
import { ErroProvedor, type Transporte } from './provedor';

/** Transporte Gemini pelo SDK oficial (@google/genai). Chave: GEMINI_API_KEY. */
export function transporteGemini(modelo: string, apiKey = process.env.GEMINI_API_KEY): Transporte {
  if (!apiKey) throw new Error('GEMINI_API_KEY não definida.');
  const ai = new GoogleGenAI({ apiKey });
  return async (r) => {
    try {
      const resposta = await ai.models.generateContent({
        model: modelo,
        contents: r.usuario,
        config: {
          systemInstruction: r.sistema,
          temperature: r.temperatura,
          seed: r.semente,
          maxOutputTokens: r.maxTokens,
          ...(r.jsonSchema
            ? { responseMimeType: 'application/json', responseJsonSchema: r.jsonSchema }
            : {}),
        },
      });
      return {
        texto: resposta.text ?? '',
        modeloEfetivo: resposta.modelVersion ?? modelo,
        tokensEntrada: resposta.usageMetadata?.promptTokenCount ?? 0,
        tokensSaida:
          (resposta.usageMetadata?.candidatesTokenCount ?? 0) +
          (resposta.usageMetadata?.thoughtsTokenCount ?? 0),
        bruto: resposta,
        parametrosEfetivos: { temperatura: r.temperatura, semente: r.semente ?? null },
      };
    } catch (e) {
      const status = (e as { status?: number }).status ?? null;
      throw new ErroProvedor((e as Error).message, typeof status === 'number' ? status : null, e);
    }
  };
}
