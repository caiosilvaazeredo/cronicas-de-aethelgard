import {
  obterCaso,
  listarSuspeitosPorCaso,
  listarEventosPorCaso,
  obterSessao,
  sessoesRef,
} from '../lib/firestore';
import { ai, MODELO_TEXTO, safeParseJson } from '../lib/gemini';
import { REVELACAO_SCHEMA } from '../lib/schemas';
import { montarPromptCurador } from '../lib/prompts/curador';
import type { RevelacaoCuradorIA } from '../../investigation/types';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function acusar(payload: { sessaoId: string; suspeitoId: string }) {
  const { sessaoId, suspeitoId } = payload;

  const sessao = await obterSessao(sessaoId);
  if (!sessao) throw new Error('Sessão não encontrada.');

  const [caso, suspeitos, eventos] = await Promise.all([
    obterCaso(sessao.casoId),
    listarSuspeitosPorCaso(sessao.casoId),
    listarEventosPorCaso(sessao.casoId),
  ]);
  if (!caso) throw new Error('Caso não encontrado.');

  const prompt = montarPromptCurador({
    suspeitos,
    eventos,
    suspeitoAcusadoId: suspeitoId,
  });

  const response = await ai.models.generateContent({
    model: MODELO_TEXTO,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: REVELACAO_SCHEMA,
      maxOutputTokens: 3000,
    },
  });

  const revelacao = safeParseJson<RevelacaoCuradorIA>(response.text || '{}');
  const correto = suspeitoId === caso.culpadoId;

  await sessoesRef().doc(sessaoId).update({
    acusacaoFinal: suspeitoId,
    revelacao: revelacao.textoRevelacao,
  });

  return {
    correto,
    revelacao: revelacao.textoRevelacao,
    culpadoId: caso.culpadoId,
    cadeiaCausal: revelacao.cadeiaCausal,
  };
}

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;
    let result: any;

    switch (action) {
      case 'acusar': {
        result = await acusar(payload);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers });
    }

    return new Response(JSON.stringify(result), { headers });
  } catch (error: any) {
    console.error('Erro em investigacao-acusacao:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers }
    );
  }
};
