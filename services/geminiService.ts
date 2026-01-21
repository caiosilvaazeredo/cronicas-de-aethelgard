
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AIResponse, GameConfig, ValidationResponse, GameMode } from "../types";

// Reutilizamos a instância para evitar overhead e problemas de estado
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_MASTER = `
Você é o MESTRE DE ALUGUEL. Humor metalinguístico (Knights of Pen and Paper), ranzinza e zoeiro.
Você deve narrar a história seguindo a Jornada do Herói (Ato 1: Chamado, Ato 2: Provações, Ato 3: Retorno).

DADOS E RESULTADOS:
- O input do usuário conterá o resultado de uma rolagem de dado (d20).
- USE ESSE VALOR para determinar o sucesso ou falha da ação.
- 20 = Sucesso Épico/Crítico (Narração exageradamente boa).
- 1 = Falha Crítica (Desastre cômico).
- 2-9 = Falha ou Sucesso parcial com custo.
- 10-19 = Sucesso.

REGRAS DE HABILIDADES & MANA:
- Se o jogador usou uma habilidade listada no contexto (ex: "Bola de Fogo (Cost: 10 MP)"):
- VOCÊ DEVE deduzir a Mana no campo "mpChange" do JSON (ex: "mpChange": -10).
- Se for apenas um ataque básico ou ação simples, não gaste Mana.

REGRAS GERAIS:
1. Retorne APENAS o próximo trecho da história (máximo 3 parágrafos). 
2. Não repita o que já aconteceu no campo 'story'.
3. O campo 'imagePrompt' deve ser uma descrição visual para PIXEL ART MEDIEVAL. Descreva a cena focando em elementos visuais (ex: 'interior de masmorra escura com tochas azuis e um baú mímico').
4. Sempre responda no formato JSON válido conforme o esquema.
`;

const SYSTEM_INSTRUCTION_VALIDATOR_COMPLETE = `
Você é o GATEKEEPER (O Fiscal de Regras, Habilidades e Inventário).
Sua função é validar a ação do jogador com rigor extremo baseado na FICHA DO PERSONAGEM.

REGRAS DE VALIDAÇÃO (MODO COMPLETO):
1. VERIFICAÇÃO DE HABILIDADE: Se o jogador tentar usar um ataque especial ou magia, verifique a lista de "Habilidades" no Contexto. Se não tiver: isPlausible: false.
2. VERIFICAÇÃO DE MANA: Se a habilidade tem custo de Mana (indicado no contexto como "Cost: X MP") e o jogador tem MP insuficiente, NEGUE A AÇÃO. Motivo: "Você tenta concentrar a energia, mas só sai uma faísca. (Mana insuficiente)".
3. VERIFICAÇÃO DE INVENTÁRIO: Se usar item, verifique se possui.
4. CONSISTÊNCIA DE CLASSE: Guerreiro não solta magia arcana complexa.

Se for plausível: isPlausible: true.
Se não: isPlausible: false, com 'reason' e 'motive'.
`;

const SYSTEM_INSTRUCTION_VALIDATOR_SIMPLE = `
Você é o FISCAL DA REALIDADE (Versão Light).
Sua função é impedir absurdos lógicos, mas permitir diversão narrativa.

REGRAS DE VALIDAÇÃO (MODO SIMPLES):
1. CONSISTÊNCIA FÍSICA E LÓGICA: Se o jogador tentar fazer algo fisicamente impossível no cenário (ex: voar agitando os braços, respirar na lua sem capacete, matar o rei estando em outra cidade): isPlausible: false.
2. NÃO VERIFIQUE HABILIDADES ESPECÍFICAS: No modo simples, assuma que o herói sabe fazer o básico de sua classe.
3. NÃO VERIFIQUE INVENTÁRIO RIGOROSAMENTE.

Se for plausível: isPlausible: true.
Se não: isPlausible: false, com 'reason' e 'motive'.
`;

const VALIDATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPlausible: { type: Type.BOOLEAN },
    reason: { type: Type.STRING },
    motive: { type: Type.STRING }
  },
  required: ["isPlausible"]
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    story: { type: Type.STRING },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          action: { type: Type.STRING }
        },
        required: ["text", "action"]
      }
    },
    imagePrompt: { type: Type.STRING },
    musicMood: { type: Type.STRING },
    statusUpdate: {
      type: Type.OBJECT,
      properties: {
        hpChange: { type: Type.NUMBER },
        mpChange: { type: Type.NUMBER },
        goldChange: { type: Type.NUMBER },
        xpChange: { type: Type.NUMBER },
        gameOver: { type: Type.BOOLEAN },
        currentAct: { type: Type.NUMBER },
        learnSkill: { type: Type.BOOLEAN }
      },
      required: ["currentAct"]
    }
  },
  required: ["story", "choices", "imagePrompt", "statusUpdate"]
};

// Utilitário para extrair JSON de strings possivelmente sujas ou truncadas
const safeParseJson = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao processar JSON do modelo:", e);
    if (text.includes('"story":')) {
       try { return JSON.parse(text + '"}'); } catch(e2) {}
    }
    throw new Error("O Mestre se engasgou com os próprios pergaminhos (JSON Inválido)");
  }
};

let gameChat: Chat | null = null;

export const validateAction = async (action: string, context: string, mode: GameMode): Promise<ValidationResponse> => {
  const instruction = mode === 'complete' ? SYSTEM_INSTRUCTION_VALIDATOR_COMPLETE : SYSTEM_INSTRUCTION_VALIDATOR_SIMPLE;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Contexto da Ficha e Jogo: ${context}\nAção sugerida pelo Jogador: ${action}`,
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: VALIDATION_SCHEMA
    }
  });
  return safeParseJson(response.text);
};

export const startNewGame = async (playerInfo: string, config: GameConfig, initialSkillsList: string): Promise<AIResponse> => {
  gameChat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_MASTER + `\nTema: ${config.theme}. Duração: ${config.length}. Use estética medieval clássica de pixel art.`,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 2000,
      thinkingConfig: { thinkingBudget: 1000 }
    }
  });

  const response = await gameChat.sendMessage({
    message: `Inicie a aventura para um ${playerInfo}. Comece no Ato 1: O Chamado. O jogador possui EXATAMENTE estas Habilidades Iniciais: [${initialSkillsList}].`
  });
  return safeParseJson(response.text);
};

export const makeChoice = async (choiceText: string, context: string): Promise<AIResponse> => {
  if (!gameChat) throw new Error("Sessão não iniciada");
  const response = await gameChat.sendMessage({
    message: `Ação do jogador: "${choiceText}". Contexto Atualizado: ${context}. Prossiga com a narrativa apenas para este turno.`
  });
  return safeParseJson(response.text);
};

export const generatePixelArt = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High-quality medieval fantasy pixel art, 16-bit retro game aesthetic, isometric view, thick pixel lines, vibrant retro colors, high contrast. Scene: ${prompt}` }] },
      config: { 
        imageConfig: { 
          aspectRatio: "16:9"
        } 
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { 
    console.warn("Erro na geração de imagem pixel art", e); 
  }
  return "https://picsum.photos/800/450?grayscale";
};
