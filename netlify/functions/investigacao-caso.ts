import {
  casosRef,
  suspeitosRef,
  eventosRef,
  sessoesRef,
  obterCaso as obterCasoDb,
  listarSuspeitosPorCaso,
  listarEventosPorCaso,
  obterSessao,
} from '../lib/firestore';
import { ai, MODELO_TEXTO, safeParseJson } from '../lib/gemini';
import { CASO_SCHEMA, ALEGACOES_INICIAIS_SCHEMA } from '../lib/schemas';
import { montarPromptDiretor } from '../lib/prompts/diretor';
import { montarPromptAlegacaoInicial } from '../lib/prompts/suspeito';
import { detectarContradicao } from '../lib/contradiction';
import type {
  Caso,
  Suspeito,
  Evento,
  Sessao,
  CasoGeradoIA,
  AlegacaoGeradaIA,
} from '../../investigation/types';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function validarCasoGerado(caso: CasoGeradoIA) {
  if (!caso.suspeitos || caso.suspeitos.length < 2) {
    throw new Error('Caso gerado com suspeitos insuficientes.');
  }
  const culpados = caso.suspeitos.filter((s) => s.ehCulpado);
  if (culpados.length !== 1) {
    throw new Error(`Caso gerado deve ter exatamente 1 culpado, veio ${culpados.length}.`);
  }
  for (const s of caso.suspeitos) {
    if (!s.linhaTempoReal || s.linhaTempoReal.length === 0) {
      throw new Error(`Suspeito ${s.nome} veio sem linha do tempo real.`);
    }
  }
}

async function criarCaso(temaOpcional?: string) {
  const promptDiretor = montarPromptDiretor(temaOpcional);
  const respDiretor = await ai.models.generateContent({
    model: MODELO_TEXTO,
    contents: promptDiretor,
    config: {
      responseMimeType: 'application/json',
      responseSchema: CASO_SCHEMA,
      maxOutputTokens: 4000,
    },
  });
  const casoGerado = safeParseJson<CasoGeradoIA>(respDiretor.text || '{}');
  validarCasoGerado(casoGerado);

  const culpadoGerado = casoGerado.suspeitos.find((s) => s.ehCulpado)!;

  const casoDocRef = casosRef().doc();
  const casoId = casoDocRef.id;

  // Cria refs de suspeitos primeiro para resolver o culpadoId.
  const suspeitosComRef = casoGerado.suspeitos.map((sg) => ({
    ref: suspeitosRef().doc(),
    gerado: sg,
  }));
  const culpadoRef = suspeitosComRef.find((s) => s.gerado === culpadoGerado)!.ref;

  const caso: Caso = {
    id: casoId,
    titulo: casoGerado.titulo,
    local: casoGerado.local,
    motivoReal: casoGerado.motivoReal,
    culpadoId: culpadoRef.id,
    criadoEm: Date.now(),
  };
  await casoDocRef.set(caso);

  const suspeitos: Suspeito[] = [];
  const eventosReaisPorSuspeito: Record<string, Evento[]> = {};

  const batchWrites: Promise<any>[] = [];

  for (const { ref, gerado } of suspeitosComRef) {
    const suspeito: Suspeito = {
      id: ref.id,
      casoId,
      nome: gerado.nome,
      papel: gerado.papel,
      mentiraInstrucao: gerado.mentiraInstrucao || '',
    };
    suspeitos.push(suspeito);
    batchWrites.push(ref.set(suspeito));

    const eventosReais: Evento[] = gerado.linhaTempoReal.map((bloco) => {
      const eventoRef = eventosRef().doc();
      const evento: Evento = {
        id: eventoRef.id,
        casoId,
        tipo: 'real',
        suspeitoId: suspeito.id,
        local: bloco.local,
        horario: bloco.horario,
        conteudo: bloco.conteudo,
        contradizComId: null,
        corroboraComId: null,
        status: 'nao_verificado',
        criadoEm: Date.now(),
      };
      batchWrites.push(eventoRef.set(evento));
      return evento;
    });
    eventosReaisPorSuspeito[suspeito.id] = eventosReais;
  }

  await Promise.all(batchWrites);

  // Agentes de suspeito: cada um gera sua alegação inicial vendo apenas a
  // própria linha do tempo real e a própria instrução de mentira.
  const eventosAcumulados: Evento[] = Object.values(eventosReaisPorSuspeito).flat();
  const alegacoesIniciaisIds: string[] = [];

  for (const { ref: suspeitoRef, gerado } of suspeitosComRef) {
    const suspeitoId = suspeitoRef.id;
    const promptSuspeito = montarPromptAlegacaoInicial({
      nome: gerado.nome,
      papel: gerado.papel,
      mentiraInstrucao: gerado.mentiraInstrucao || '',
      linhaTempoReal: gerado.linhaTempoReal,
      ehCulpado: gerado.ehCulpado,
    });

    const respSuspeito = await ai.models.generateContent({
      model: MODELO_TEXTO,
      contents: promptSuspeito,
      config: {
        responseMimeType: 'application/json',
        responseSchema: ALEGACOES_INICIAIS_SCHEMA,
        maxOutputTokens: 2000,
      },
    });
    const alegacoes = safeParseJson<AlegacaoGeradaIA[]>(respSuspeito.text || '[]');

    for (const alegacao of alegacoes) {
      const deteccao = detectarContradicao(
        { suspeitoId, local: alegacao.local, horario: alegacao.horario },
        eventosAcumulados
      );
      const eventoRef = eventosRef().doc();
      const evento: Evento = {
        id: eventoRef.id,
        casoId,
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
      eventosAcumulados.push(evento);
      alegacoesIniciaisIds.push(evento.id);

      if (deteccao.corroboraComId) {
        await eventosRef().doc(deteccao.corroboraComId).update({
          corroboraComId: evento.id,
          status: 'corroborado',
        }).catch(() => {});
      }
    }
  }

  const sessaoRef = sessoesRef().doc();
  const sessao: Sessao = {
    id: sessaoRef.id,
    casoId,
    turnoAtual: '20h-21h',
    eventosRevelados: alegacoesIniciaisIds,
    acusacaoFinal: null,
    revelacao: null,
  };
  await sessaoRef.set(sessao);

  return {
    caso: { id: caso.id, titulo: caso.titulo, local: caso.local },
    suspeitos,
    sessao,
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
      case 'criarCaso': {
        result = await criarCaso(payload?.tema);
        break;
      }

      case 'obterCaso': {
        const { casoId } = payload;
        const caso = await obterCasoDb(casoId);
        if (!caso) {
          return new Response(JSON.stringify({ error: 'Caso não encontrado' }), { status: 404, headers });
        }
        const suspeitos = await listarSuspeitosPorCaso(casoId);
        result = { caso: { id: caso.id, titulo: caso.titulo, local: caso.local }, suspeitos };
        break;
      }

      case 'obterCasoMestre': {
        const { casoId } = payload;
        const caso = await obterCasoDb(casoId);
        if (!caso) {
          return new Response(JSON.stringify({ error: 'Caso não encontrado' }), { status: 404, headers });
        }
        const [suspeitos, eventos] = await Promise.all([
          listarSuspeitosPorCaso(casoId),
          listarEventosPorCaso(casoId),
        ]);
        result = { caso, suspeitos, eventos };
        break;
      }

      case 'obterSessao': {
        const { sessaoId } = payload;
        const sessao = await obterSessao(sessaoId);
        if (!sessao) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), { status: 404, headers });
        }
        result = sessao;
        break;
      }

      case 'atualizarTurno': {
        const { sessaoId, turnoAtual } = payload;
        await sessoesRef().doc(sessaoId).update({ turnoAtual });
        result = { ok: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers });
    }

    return new Response(JSON.stringify(result), { headers });
  } catch (error: any) {
    console.error('Erro em investigacao-caso:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers }
    );
  }
};
