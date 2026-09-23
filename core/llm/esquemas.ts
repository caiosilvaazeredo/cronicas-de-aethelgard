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

export const AcaoDoJogador = z.object({
  local: z.string(),
  acao: z.string().max(280),
  causadoPor: z.array(z.string()),
  tensao: z.number().min(0).max(10),
});
export type AcaoDoJogador = z.infer<typeof AcaoDoJogador>;

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
