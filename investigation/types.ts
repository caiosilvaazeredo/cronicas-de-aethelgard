// Tipos do modo "Investigação" (fios narrativos paralelos).
// Nenhum tipo aqui carrega noção de ato, fase ou estágio narrativo -
// apenas fatos causais/temporais (quem, onde, quando, o quê).

export type TipoEvento = 'real' | 'alegacao';
export type StatusEvento = 'nao_verificado' | 'contraditorio' | 'corroborado';

// Blocos de tempo fixos da noite do caso, usados apenas para alinhar o
// tabuleiro (grade espaço x tempo), não representam fases da história.
export const BLOCOS_HORARIO = [
  '20h-21h',
  '21h-22h',
  '22h-23h',
  '23h-00h',
  '00h-01h',
] as const;
export type BlocoHorario = typeof BLOCOS_HORARIO[number];

export interface Caso {
  id: string;
  titulo: string;
  local: string;
  motivoReal: string;
  culpadoId: string;
  criadoEm: number;
}

export interface Suspeito {
  id: string;
  casoId: string;
  nome: string;
  papel: string;
  mentiraInstrucao: string;
}

export interface Evento {
  id: string;
  casoId: string;
  tipo: TipoEvento;
  suspeitoId: string;
  local: string;
  horario: string;
  conteudo: string;
  contradizComId: string | null;
  corroboraComId: string | null;
  status: StatusEvento;
  criadoEm: number;
}

export interface Sessao {
  id: string;
  casoId: string;
  turnoAtual: string;
  eventosRevelados: string[];
  acusacaoFinal: string | null;
  revelacao: string | null;
}

// ---- Formatos crus retornados pelos agentes (antes de persistir) ----

export interface LinhaTempoBlocoIA {
  horario: string;
  local: string;
  conteudo: string;
}

export interface SuspeitoGeradoIA {
  nome: string;
  papel: string;
  ehCulpado: boolean;
  temAlgoAEsconder: boolean;
  mentiraInstrucao: string;
  linhaTempoReal: LinhaTempoBlocoIA[];
}

export interface CasoGeradoIA {
  titulo: string;
  local: string;
  motivoReal: string;
  suspeitos: SuspeitoGeradoIA[];
}

export interface AlegacaoGeradaIA {
  local: string;
  horario: string;
  conteudo: string;
  verdadeiro: boolean;
}

export interface RespostaInterrogatorioIA {
  falaProsa: string;
  alegacao: AlegacaoGeradaIA;
}

export interface NoCadeiaCausal {
  eventoId: string;
  papel: 'kernel' | 'satelite';
}

export interface RevelacaoCuradorIA {
  culpadoId: string;
  textoRevelacao: string;
  cadeiaCausal: NoCadeiaCausal[];
}

// ---- Payloads da API ----

// Versão exposta ao jogador: nunca inclui motivoReal nem culpadoId.
export interface CasoPublico {
  id: string;
  titulo: string;
  local: string;
}

export interface CasoCompleto {
  caso: CasoPublico;
  suspeitos: Suspeito[];
  sessao: Sessao;
}

// Visão do mestre/pesquisador: inclui a verdade completa e os eventos reais.
export interface CasoMestre {
  caso: Caso;
  suspeitos: Suspeito[];
  eventos: Evento[];
  sessao: Sessao;
}

export interface PerguntarPayload {
  sessaoId: string;
  suspeitoId: string;
  pergunta: string;
  confrontoComContradicao?: string;
}

export interface PerguntarResposta {
  falaProsa: string;
  evento: Evento;
}

export interface AcusarPayload {
  sessaoId: string;
  suspeitoId: string;
}

export interface AcusarResposta {
  correto: boolean;
  revelacao: string;
  culpadoId: string;
  cadeiaCausal: NoCadeiaCausal[];
}
