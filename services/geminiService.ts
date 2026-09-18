import { AIResponse, GameConfig, ValidationResponse, GameMode, StoryEvent } from "../types";
import { TramaAbertaResumo } from "./arcos";

// Todas as chamadas ao Gemini passam pela Netlify Function
// (netlify/functions/gemini.ts). Nada de chave de API aqui: o cliente só
// fala com o nosso próprio backend.
async function chamarFuncao<T>(action: string, payload: any): Promise<T> {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Falha ao chamar ${action}`);
  }
  return data as T;
}

export const validateAction = (
  action: string,
  context: string,
  mode: GameMode
): Promise<ValidationResponse> =>
  chamarFuncao("validate", { actionText: action, context, mode });

export const startNewGame = (
  playerInfo: string,
  config: GameConfig,
  initialSkillsList: string
): Promise<AIResponse> =>
  chamarFuncao("startGame", { playerInfo, config, initialSkillsList });

// Sem estado guardado no servidor entre turnos (não é confiável em Netlify
// Functions - cada invocação pode cair num worker diferente): cada chamada
// reenvia um recap curto da história recente para dar continuidade.
export const makeChoice = (
  choiceText: string,
  context: string,
  turno: number,
  tramasAbertas: TramaAbertaResumo[],
  historiaRecente: string[],
  config: GameConfig
): Promise<AIResponse> =>
  chamarFuncao("makeChoice", { choiceText, context, turno, tramasAbertas, historiaRecente, config });

export const gerarFechamentoTrama = (
  eventos: StoryEvent[],
  tramaId: string
): Promise<{ textoFechamento: string }> =>
  chamarFuncao("curador", { eventos, tramaId });

export const generatePixelArt = async (prompt: string): Promise<string> => {
  try {
    const data = await chamarFuncao<{ image: string }>("generateImage", { prompt });
    return data.image;
  } catch (e) {
    console.warn("Erro na geração de imagem pixel art", e);
    return "https://picsum.photos/800/450?grayscale";
  }
};
