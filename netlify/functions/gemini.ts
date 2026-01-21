import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION_MASTER = `
Você é o MESTRE DE ALUGUEL. Humor metalinguístico (Knights of Pen and Paper), ranzinza e zoeiro.
Você deve narrar a história seguindo a Jornada do Herói.

ESTRUTURA DE ATOS (MUITO IMPORTANTE):
- O contexto incluirá "Turno: X" e "Ato Atual: Y".
- ATO 1 (O Chamado): Turnos 1-5. Apresente o cenário, o chamado à aventura.
- ATO 2 (As Provações): Turnos 6-12. Desafios crescentes, combates, descobertas.
- ATO 3 (O Clímax): Turnos 13+. Confronto final, resolução da história.

REGRA DE TRANSIÇÃO DE ATOS:
- NÃO mude o ato antes do turno mínimo.
- Quando for hora de mudar, coloque o NOVO número do ato em "currentAct".
- NUNCA volte para um ato anterior. Se está no Ato 2, só pode ir para Ato 3.
- Se a duração for "quick", comprima tudo: Ato 1 (turnos 1-2), Ato 2 (3-4), Ato 3 (5+).

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
3. O campo 'imagePrompt' deve ser uma descrição visual ÚNICA e ESPECÍFICA para PIXEL ART MEDIEVAL. 
   - SEMPRE descreva algo novo e diferente a cada turno.
   - Inclua detalhes visuais específicos (cores, iluminação, objetos, personagens).
   - Exemplo: "interior de taverna medieval com balcão de madeira escura, velas derretendo, um anão barbudo servindo cerveja, luz alaranjada"
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

const safeParseJson = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Erro ao processar JSON do modelo:", e);
    if (text.includes('"story":')) {
      try { return JSON.parse(text + '"}'); } catch (e2) { }
    }
    throw new Error("O Mestre se engasgou com os próprios pergaminhos (JSON Inválido)");
  }
};

// Armazenamento simples de histórico por sessão
const sessionHistory: Map<string, Array<{role: string, parts: Array<{text: string}>}>> = new Map();

export default async (request: Request) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    let result;

    switch (action) {
      case "validate": {
        const { actionText, context, mode } = payload;
        const instruction = mode === 'complete' 
          ? SYSTEM_INSTRUCTION_VALIDATOR_COMPLETE 
          : SYSTEM_INSTRUCTION_VALIDATOR_SIMPLE;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Contexto da Ficha e Jogo: ${context}\nAção sugerida pelo Jogador: ${actionText}`,
          config: {
            systemInstruction: instruction,
            responseMimeType: "application/json",
            responseSchema: VALIDATION_SCHEMA
          }
        });
        result = safeParseJson(response.text || "{}");
        break;
      }

      case "startGame": {
        const { playerInfo, config, initialSkillsList, sessionId } = payload;
        
        // Limpa histórico anterior
        sessionHistory.delete(sessionId);
        
        const systemPrompt = SYSTEM_INSTRUCTION_MASTER + `\nTema: ${config.theme}. Duração: ${config.length}. Use estética medieval clássica de pixel art.`;
        const userMessage = `Turno: 1. Ato Atual: 1. Inicie a aventura para um ${playerInfo}. Comece no Ato 1: O Chamado. O jogador possui EXATAMENTE estas Habilidades Iniciais: [${initialSkillsList}]. Lembre-se: currentAct DEVE ser 1 neste primeiro turno.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 2000
          }
        });

        // Salva no histórico
        sessionHistory.set(sessionId, [
          { role: "user", parts: [{ text: userMessage }] },
          { role: "model", parts: [{ text: response.text || "" }] }
        ]);

        result = safeParseJson(response.text || "{}");
        
        // Força ato 1 no início
        if (result.statusUpdate) {
          result.statusUpdate.currentAct = 1;
        }
        break;
      }

      case "makeChoice": {
        const { choiceText, context, sessionId, turnNumber, currentAct } = payload;
        
        const userMessage = `Turno: ${turnNumber || 1}. Ato Atual: ${currentAct || 1}. Ação do jogador: "${choiceText}". Contexto Atualizado: ${context}. Prossiga com a narrativa apenas para este turno. IMPORTANTE: currentAct deve ser >= ${currentAct || 1} (nunca menor).`;
        
        // Recupera histórico
        const history = sessionHistory.get(sessionId) || [];
        
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            ...history,
            { role: "user", parts: [{ text: userMessage }] }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_MASTER,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 2000
          }
        });

        // Atualiza histórico (mantém últimas 10 interações)
        history.push(
          { role: "user", parts: [{ text: userMessage }] },
          { role: "model", parts: [{ text: response.text || "" }] }
        );
        if (history.length > 20) {
          history.splice(0, 2);
        }
        sessionHistory.set(sessionId, history);

        result = safeParseJson(response.text || "{}");
        
        // Garante que o ato nunca volte para trás
        if (result.statusUpdate && currentAct) {
          if (result.statusUpdate.currentAct < currentAct) {
            result.statusUpdate.currentAct = currentAct;
          }
          // Limita ao ato 3
          if (result.statusUpdate.currentAct > 3) {
            result.statusUpdate.currentAct = 3;
          }
        }
        break;
      }

      case "generateImage": {
        const { prompt } = payload;
        try {
          // Modelo correto: gemini-2.5-flash-image (estável desde outubro 2025)
          // Documentação: https://ai.google.dev/gemini-api/docs/image-generation
          const imagePrompt = `High-quality medieval fantasy pixel art, 16-bit retro game aesthetic, isometric view, thick pixel lines, vibrant retro colors, high contrast. Scene: ${prompt}`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imagePrompt }] },
            config: {
              responseModalities: ["image", "text"],
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });
          
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              result = { image: `data:image/png;base64,${part.inlineData.data}` };
              break;
            }
          }
          
          if (!result) {
            // Fallback com imagem aleatória diferente a cada vez
            result = { image: `https://picsum.photos/800/450?random=${Date.now()}` };
          }
        } catch (e) {
          console.warn("Erro na geração de imagem:", e);
          result = { image: `https://picsum.photos/800/450?random=${Date.now()}` };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação desconhecida" }),
          { status: 400, headers }
        );
    }

    return new Response(JSON.stringify(result), { headers });

  } catch (error: any) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers }
    );
  }
};
