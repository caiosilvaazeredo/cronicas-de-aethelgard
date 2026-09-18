import { GoogleGenAI, Type } from "@google/genai";
import { cadeiaCausal } from "../../services/arcos";
import type { StoryEvent } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// gemini-flash-latest está com alta demanda/instável no momento (503s
// frequentes); gemini-flash-lite-latest responde de forma rápida e
// confiável com o mesmo contrato de JSON estruturado.
const MODELO_TEXTO = "gemini-flash-lite-latest";
const MODELO_IMAGEM = "gemini-3-pro-image-preview";

// Arcos causais emergentes: início, meio e fim são propriedades calculadas
// do grafo de causalidade entre eventos (services/arcos.ts), nunca fases
// declaradas de antemão. Este prompt não menciona, e não pode passar a
// mencionar, atos, estágios ou qualquer catálogo de estruturas narrativas.
// Ele também não instrui o modelo a amarrar tramas nem a evitar abrir
// novas - isso contaminaria a medição de convergência do experimento.
const SYSTEM_INSTRUCTION_MASTER = `
Você é o MESTRE DE ALUGUEL. Humor metalinguístico (Knights of Pen and Paper), ranzinza e zoeiro.

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
4. Não resolva definitivamente uma trama em andamento a menos que o jogador,
   através de suas próprias ações, tenha criado as condições causais para
   isso. Você pode abrir novas tramas livremente a qualquer momento.
5. Sempre responda no formato JSON válido conforme o esquema, incluindo o
   campo "eventoGerado" com o evento que acabou de acontecer neste turno.
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
        learnSkill: { type: Type.BOOLEAN }
      },
      required: []
    },
    eventoGerado: {
      type: Type.OBJECT,
      properties: {
        conteudo: { type: Type.STRING },
        causadoPor: { type: Type.ARRAY, items: { type: Type.STRING } },
        tensao: { type: Type.NUMBER }
      },
      required: ["conteudo", "causadoPor", "tensao"]
    }
  },
  required: ["story", "choices", "imagePrompt", "statusUpdate", "eventoGerado"]
};

const CURADOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    textoFechamento: { type: Type.STRING }
  },
  required: ["textoFechamento"]
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

interface TramaAbertaResumo {
  id: string;
  tensaoAtual: number;
  eventosRecentes: { id: string; conteudo: string }[];
}

// Camada que injeta o estado causal no prompt, no lugar da antiga instrução
// de ato. Informa o estado; não direciona a forma da narrativa.
function montarBlocoTramas(tramasAbertas: TramaAbertaResumo[] | undefined): string {
  if (!tramasAbertas || tramasAbertas.length === 0) {
    return "Nenhuma trama em andamento ainda.";
  }
  const blocos = tramasAbertas.map((t) => {
    const eventos = t.eventosRecentes
      .map((e) => `    (${e.id}) ${e.conteudo}`)
      .join("\n");
    return `- [id: ${t.id}] tensão atual ${t.tensaoAtual}/10. Eventos recentes:\n${eventos}`;
  });
  return `Tramas em andamento:\n${blocos.join("\n")}`;
}

function montarInstrucaoEvento(): string {
  return `Ao final, informe o evento que acabou de acontecer no campo "eventoGerado", indicando em "causadoPor" os ids dos eventos acima que tornaram este evento possível. Se o evento não decorre de nenhum deles, deixe "causadoPor" vazio.`;
}

export default async (request: Request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

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
          model: MODELO_TEXTO,
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
        const { playerInfo, config, initialSkillsList } = payload;

        const userMessage = `Turno: 1. Inicie a aventura para um ${playerInfo}. O jogador possui EXATAMENTE estas Habilidades Iniciais: [${initialSkillsList}]. Nenhuma trama em andamento ainda: este é o evento fundador, então "causadoPor" deve vir vazio em "eventoGerado". ${montarInstrucaoEvento()}`;

        const response = await ai.models.generateContent({
          model: MODELO_TEXTO,
          contents: userMessage,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_MASTER + `\nTema: ${config.theme}. Duração: ${config.length}. Use estética medieval clássica de pixel art.`,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 2000,
          }
        });
        result = safeParseJson(response.text || "{}");
        break;
      }

      case "makeChoice": {
        // Cada chamada é independente (sem estado de chat guardado no
        // servidor entre invocações, que não é confiável em Netlify
        // Functions): o cliente reenvia o recap recente da história a cada
        // turno, e é isso que dá continuidade à narrativa.
        const { choiceText, context, turno, tramasAbertas, historiaRecente, config } = payload;

        const recap = (historiaRecente as string[] | undefined)?.length
          ? `Recapitulando os últimos acontecimentos:\n${(historiaRecente as string[]).map((h: string) => `- ${h}`).join("\n")}`
          : "Este é o começo da crônica.";

        const userMessage = `Turno: ${turno}. ${recap}\n\nAção do jogador: "${choiceText}". Contexto Atualizado: ${context}. Prossiga com a narrativa apenas para este turno, sem repetir o recap acima.\n\n${montarBlocoTramas(tramasAbertas)}\n\nContinue a narrativa considerando essas tramas em aberto. ${montarInstrucaoEvento()}`;

        const response = await ai.models.generateContent({
          model: MODELO_TEXTO,
          contents: userMessage,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_MASTER + (config ? `\nTema: ${config.theme}. Duração: ${config.length}. Use estética medieval clássica de pixel art.` : ""),
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 2000,
          }
        });
        result = safeParseJson(response.text || "{}");
        break;
      }

      case "curador": {
        const { eventos, tramaId } = payload as { eventos: StoryEvent[]; tramaId: string };
        const cadeia = cadeiaCausal(eventos, tramaId);
        if (cadeia.length === 0) {
          return new Response(
            JSON.stringify({ error: "Nenhum evento kernel encontrado para esta trama." }),
            { status: 400, headers }
          );
        }
        const listaEventos = cadeia.map((e) => `(${e.id}) ${e.conteudo}`).join("\n");
        const prompt = `Narre o fechamento desta linha de acontecimentos. Comece pelo evento que não depende de nenhum outro para fazer sentido, siga pelos eventos que dependem do anterior e tornam possível o seguinte, e termine no evento que encerra a sequência sem exigir nada depois. Use apenas a cadeia causal abaixo. Não mencione atos, fases, capítulos ou estruturas narrativas.\n\n${listaEventos}`;

        const response = await ai.models.generateContent({
          model: MODELO_TEXTO,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: CURADOR_SCHEMA,
            maxOutputTokens: 1500
          }
        });
        result = safeParseJson(response.text || "{}");
        break;
      }

      case "generateImage": {
        const { prompt } = payload;
        try {
          const imagePrompt = `High-quality medieval fantasy pixel art, 16-bit retro game aesthetic, isometric view, thick pixel lines, vibrant retro colors, high contrast. Scene: ${prompt}`;

          const response = await ai.models.generateContent({
            model: MODELO_IMAGEM,
            contents: { parts: [{ text: imagePrompt }] },
            config: {
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
