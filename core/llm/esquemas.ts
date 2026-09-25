/**
 * Esquemas zod de toda resposta estruturada pedida a um modelo.
 *
 * Nenhum campo aqui representa ato, fase ou etapa narrativa: só fatos (quem,
 * onde, o quê), ligações causais declaradas e tensão.
 */

import { z } from 'zod';

export const AcoesDoDia = z.object({
  acoes: z.array(
    z.object({
      agenteId: z.string(),
      local: z.string(),
      acao: z.string().max(280),
      causadoPor: z.array(z.string()),
      tensao: z.number().min(0).max(10),
    })
  ),
});
export type AcoesDoDia = z.infer<typeof AcoesDoDia>;

/**
 * Ligações tipadas (opção ligacoesTipadas): em vez de uma lista de ids, cada
 * causa traz o tipo da relação e a força. O motor deriva causadoPor dos ids,
 * então a detecção do arcos.ts não muda.
 */
export const Causa = z.object({
  id: z.string(),
  tipo: z.enum(['motivou', 'possibilitou', 'reagiu', 'lembrou']),
  forca: z.number().int().min(1).max(3),
});
export type Causa = z.infer<typeof Causa>;

export const AcoesDoDiaTipadas = z.object({
  acoes: z.array(
    z.object({
      agenteId: z.string(),
      local: z.string(),
      acao: z.string().max(280),
      causas: z.array(Causa),
      tensao: z.number().min(0).max(10),
    })
  ),
});
export type AcoesDoDiaTipadas = z.infer<typeof AcoesDoDiaTipadas>;

export const AcaoDoJogador = z.object({
  local: z.string(),
  acao: z.string().max(280),
  causadoPor: z.array(z.string()),
  tensao: z.number().min(0).max(10),
});
export type AcaoDoJogador = z.infer<typeof AcaoDoJogador>;

export const AcaoDoJogadorTipada = z.object({
  local: z.string(),
  acao: z.string().max(280),
  causas: z.array(Causa),
  tensao: z.number().min(0).max(10),
});
export type AcaoDoJogadorTipada = z.infer<typeof AcaoDoJogadorTipada>;

export const RelatosDoDia = z.object({
  relatos: z.array(
    z.object({
      indice: z.number().int().min(0),
      versao: z.string().max(400),
    })
  ),
});
export type RelatosDoDia = z.infer<typeof RelatosDoDia>;

export const NarracaoCurador = z.object({
  narracao: z.string(),
});
export type NarracaoCurador = z.infer<typeof NarracaoCurador>;

export const FalaConversa = z.object({
  fala: z.string().max(600),
});
export type FalaConversa = z.infer<typeof FalaConversa>;

/**
 * Resposta do mestre no controle de três atos. Reproduz o contrato do modo
 * antigo (story + currentAct) e acrescenta `eventoGerado`, sem o qual o
 * controle não geraria o grafo causal e não seria comparável.
 */
export const RespostaMestreControle = z.object({
  story: z.string(),
  currentAct: z.number().int().min(1).max(3),
  eventoGerado: z.object({
    conteudo: z.string().max(280),
    causadoPor: z.array(z.string()),
    tensao: z.number().min(0).max(10),
  }),
});
export type RespostaMestreControle = z.infer<typeof RespostaMestreControle>;
