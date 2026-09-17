import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const MODELO_TEXTO = 'gemini-2.0-flash';

export function safeParseJson<T = any>(text: string): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error('Erro ao processar JSON do modelo:', e, text);
    throw new Error('A IA retornou um JSON inválido.');
  }
}

// Extrai o bloco JSON ao final de uma resposta em prosa + JSON (usado
// pelos agentes de suspeito durante o interrogatório).
export function extrairProsaEJson<T = any>(text: string): { prosa: string; json: T } {
  const jsonMatch = text.match(/\{[\s\S]*\}\s*$/);
  if (!jsonMatch) {
    throw new Error('A resposta do suspeito não incluiu o bloco JSON esperado.');
  }
  const prosa = text.slice(0, jsonMatch.index).trim();
  const json = JSON.parse(jsonMatch[0]) as T;
  return { prosa, json };
}
