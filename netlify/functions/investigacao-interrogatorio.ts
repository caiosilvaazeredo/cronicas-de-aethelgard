import {
  suspeitosRef,
  eventosRef,
  listarEventosPorCaso,
  sessoesRef,
  obterSessao,
  obterCaso,
} from '../lib/firestore';
import { ai, MODELO_TEXTO, extrairProsaEJson } from '../lib/gemini';
import { montarPromptInterrogatorio } from '../lib/prompts/suspeito';
import { detectarContradicao } from '../lib/contradiction';
import type { Evento, Suspeito, AlegacaoGeradaIA } from '../../investigation/types';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function reconstruirLinhaTempoReal(casoId: string, suspeitoId: string) {
  const eventos = await listarEventosPorCaso(casoId);
  return eventos
    .filter((e) => e.tipo === 'real' && e.suspeitoId === suspeitoId)
    .map((e) => ({ horario: e.horario, local: e.local, conteudo: e.conteudo }));
}

async function perguntar(payload: {
  sessaoId: string;
  suspeitoId: string;
  pergunta: string;
  confrontoComContradicao?: string;
}) {
  const { sessaoId, suspeitoId, pergunta, confrontoComContradicao } = payload;

  const sessao = await obterSessao(sessaoId);
  if (!sessao) throw new Error('Sessão não encontrada.');

  const suspeitoDoc = await suspeitosRef().doc(suspeitoId).get();
  if (!suspeitoDoc.exists) throw new Error('Suspeito não encontrado.');
  const suspeito = suspeitoDoc.data() as Suspeito;

  const linhaTempoReal = await reconstruirLinhaTempoReal(sessao.casoId, suspeitoId);
  const caso = await obterCaso(sessao.casoId);
  const ehCulpado = caso?.culpadoId === suspeitoId;

  const prompt = montarPromptInterrogatorio(
    {
      nome: suspeito.nome,
      papel: suspeito.papel,
      mentiraInstrucao: suspeito.mentiraInstrucao,
      linhaTempoReal,
      ehCulpado,
    },
    pergunta,
    confrontoComContradicao
  );

  const response = await ai.models.generateContent({
    model: MODELO_TEXTO,
    contents: prompt,
    config: { maxOutputTokens: 1200 },
  });

  const { prosa, json: alegacao } = extrairProsaEJson<AlegacaoGeradaIA>(response.text || '');

  const eventosExistentes = await listarEventosPorCaso(sessao.casoId);
  const deteccao = detectarContradicao(
    { suspeitoId, local: alegacao.local, horario: alegacao.horario },
    eventosExistentes
  );

  const eventoRef = eventosRef().doc();
  const evento: Evento = {
    id: eventoRef.id,
    casoId: sessao.casoId,
    tipo: 'alegacao',
    suspeitoId,
    local: alegacao.local,
    horario: alegacao.horario,
    conteudo: alegacao.conteudo,
    contradizComId: deteccao.contradizComId,
    corroboraComId: deteccao.corroboraComId,
    status: deteccao.status,
    criadoEm: Date.now(),
  };
  await eventoRef.set(evento);

  if (deteccao.corroboraComId) {
    await eventosRef().doc(deteccao.corroboraComId).update({
      corroboraComId: evento.id,
      status: 'corroborado',
    }).catch(() => {});
  }

  await sessoesRef()
    .doc(sessaoId)
    .update({ eventosRevelados: [...sessao.eventosRevelados, evento.id] });

  return { falaProsa: prosa, evento };
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
      case 'perguntar': {
        result = await perguntar(payload);
        break;
      }

      case 'listarEventosRevelados': {
        const { sessaoId } = payload;
        const sessao = await obterSessao(sessaoId);
        if (!sessao) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), { status: 404, headers });
        }
        const eventos = await listarEventosPorCaso(sessao.casoId);
        // O jogador só vê alegações (nunca eventos reais) que já foram reveladas.
        result = eventos.filter(
          (e) => e.tipo === 'alegacao' && sessao.eventosRevelados.includes(e.id)
        );
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers });
    }

    return new Response(JSON.stringify(result), { headers });
  } catch (error: any) {
    console.error('Erro em investigacao-interrogatorio:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers }
    );
  }
};
