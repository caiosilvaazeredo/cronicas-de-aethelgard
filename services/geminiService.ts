import { AIResponse, GameConfig, ValidationResponse, GameMode } from "../types";

// Gera um ID único para a sessão do jogo
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// URL da API - funciona tanto local quanto em produção
const API_URL = "/.netlify/functions/gemini";

const callAPI = async (action: string, payload: any) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return response.json();
};

export const validateAction = async (
  action: string, 
  context: string, 
  mode: GameMode
): Promise<ValidationResponse> => {
  return callAPI("validate", {
    actionText: action,
    context,
    mode
  });
};

export const startNewGame = async (
  playerInfo: string, 
  config: GameConfig, 
  initialSkillsList: string
): Promise<AIResponse> => {
  return callAPI("startGame", {
    playerInfo,
    config,
    initialSkillsList,
    sessionId: SESSION_ID
  });
};

export const makeChoice = async (
  choiceText: string, 
  context: string
): Promise<AIResponse> => {
  return callAPI("makeChoice", {
    choiceText,
    context,
    sessionId: SESSION_ID
  });
};

export const generatePixelArt = async (prompt: string): Promise<string> => {
  try {
    const result = await callAPI("generateImage", { prompt });
    return result.image || "https://picsum.photos/800/450?grayscale";
  } catch (e) {
    console.warn("Erro na geração de imagem:", e);
    return "https://picsum.photos/800/450?grayscale";
  }
};