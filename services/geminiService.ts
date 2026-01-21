import { AIResponse, GameConfig, ValidationResponse, GameMode } from "../types";

// Gera um ID único para a sessão do jogo
let SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Contador de turnos
let TURN_NUMBER = 0;

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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}: Verifique se a função serverless está configurada`);
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
  // Gera novo ID de sessão para cada novo jogo
  SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Reseta contador de turnos
  TURN_NUMBER = 1;
  
  return callAPI("startGame", {
    playerInfo,
    config,
    initialSkillsList,
    sessionId: SESSION_ID
  });
};

export const makeChoice = async (
  choiceText: string, 
  context: string,
  currentAct: number = 1
): Promise<AIResponse> => {
  // Incrementa o turno
  TURN_NUMBER++;
  
  return callAPI("makeChoice", {
    choiceText,
    context,
    sessionId: SESSION_ID,
    turnNumber: TURN_NUMBER,
    currentAct
  });
};

export const generatePixelArt = async (
  prompt: string,
  characterClass?: string,
  previousImage?: string
): Promise<string> => {
  try {
    const result = await callAPI("generateImage", {
      prompt,
      characterClass: characterClass || "Guerreiro",
      previousImage: previousImage || null
    });
    return result.image || `https://picsum.photos/800/450?random=${Date.now()}`;
  } catch (e) {
    console.warn("Erro na geração de imagem:", e);
    return `https://picsum.photos/800/450?random=${Date.now()}`;
  }
};

// Exporta funções auxiliares para debug
export const getCurrentTurn = () => TURN_NUMBER;
export const getSessionId = () => SESSION_ID;