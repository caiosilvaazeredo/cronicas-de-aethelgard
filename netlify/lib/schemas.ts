import { Type } from '@google/genai';
import { BLOCOS_HORARIO } from '../../investigation/types';

// Schemas JSON estruturados enviados ao Gemini. Nenhum campo aqui
// representa ato/fase narrativa - apenas fatos (quem, onde, quando, o quê)
// e, no caso do curador, a distinção causal kernel/satélite.

const LINHA_TEMPO_BLOCO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    horario: { type: Type.STRING, enum: [...BLOCOS_HORARIO] },
    local: { type: Type.STRING },
    conteudo: { type: Type.STRING },
  },
  required: ['horario', 'local', 'conteudo'],
};

export const CASO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titulo: { type: Type.STRING },
    local: { type: Type.STRING },
    motivoReal: { type: Type.STRING },
    suspeitos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          papel: { type: Type.STRING },
          ehCulpado: { type: Type.BOOLEAN },
          temAlgoAEsconder: { type: Type.BOOLEAN },
          mentiraInstrucao: { type: Type.STRING },
          linhaTempoReal: {
            type: Type.ARRAY,
            items: LINHA_TEMPO_BLOCO_SCHEMA,
          },
        },
        required: [
          'nome',
          'papel',
          'ehCulpado',
          'temAlgoAEsconder',
          'mentiraInstrucao',
          'linhaTempoReal',
        ],
      },
    },
  },
  required: ['titulo', 'local', 'motivoReal', 'suspeitos'],
};

export const ALEGACAO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    local: { type: Type.STRING },
    horario: { type: Type.STRING, enum: [...BLOCOS_HORARIO] },
    conteudo: { type: Type.STRING },
    verdadeiro: { type: Type.BOOLEAN },
  },
  required: ['local', 'horario', 'conteudo', 'verdadeiro'],
};

export const ALEGACOES_INICIAIS_SCHEMA = {
  type: Type.ARRAY,
  items: ALEGACAO_SCHEMA,
};

export const REVELACAO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    culpadoId: { type: Type.STRING },
    textoRevelacao: { type: Type.STRING },
    cadeiaCausal: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          eventoId: { type: Type.STRING },
          papel: { type: Type.STRING, enum: ['kernel', 'satelite'] },
        },
        required: ['eventoId', 'papel'],
      },
    },
  },
  required: ['culpadoId', 'textoRevelacao', 'cadeiaCausal'],
};
