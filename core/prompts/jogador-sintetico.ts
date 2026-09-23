/**
 * Prompt do jogador sintético: um agente que joga no lugar do humano.
 *
 * Recebe só o que um jogador saberia (o que viu e ouviu), nunca o registro
 * real. Os perfis descrevem comportamento, nunca um objetivo para a história.
 * Varrido pelo teste de restrições.
 */

import type { ConfigMundo, EventoCidade, Relato, PerfilJogador } from '../mundo/tipos';

export const DESCRICAO_PERFIL: Record<PerfilJogador, string> = {
  investigador: 'Você costuma fazer perguntas às pessoas e seguir as pistas do que viu e ouviu.',
  intrometido: 'Você costuma se meter nos assuntos dos outros, interferir e provocar reações.',
  passivo: 'Você costuma observar o que acontece ao seu redor sem se envolver muito.',
};

export function sistemaJogador(mundo: ConfigMundo, perfil: PerfilJogador): string {
  return `Você é um forasteiro que acabou de chegar a ${mundo.nome}. Você só sabe o que viu com os próprios olhos e o que ouviram lhe contar.
${DESCRICAO_PERFIL[perfil]}
A cada dia você escolhe uma ação: onde estar e o que fazer lá, em uma ou duas frases concretas (até 280 caracteres), em português.
Em "causadoPor", indique os ids dos eventos que você conhece e que motivaram a ação. Se nenhum motivou, deixe a lista vazia.
Em "tensao", indique de 0 a 10 o quão carregado é o momento para você.
Responda apenas com JSON no formato {"local", "acao", "causadoPor", "tensao"}.`;
}

export interface EntradaPromptJogador {
  mundo: ConfigMundo;
  dia: number;
  localAtual: string;
  presentes: string[]; // nomes de quem está no mesmo local
  eventosVistos: Pick<EventoCidade, 'id' | 'dia' | 'local' | 'conteudo'>[];
  relatosOuvidos: Relato[];
  propriasAcoes: Pick<EventoCidade, 'id' | 'dia' | 'conteudo'>[];
}

export function usuarioJogador(e: EntradaPromptJogador): string {
  const nomesLocais = new Map(e.mundo.locais.map((l) => [l.id, l.nome]));
  const locais = e.mundo.locais.map((l) => `- ${l.id}: ${l.nome}. ${l.descricao}`).join('\n');
  const vistos =
    e.eventosVistos.length > 0
      ? e.eventosVistos.map((ev) => `(${ev.id}) dia ${ev.dia}, ${nomesLocais.get(ev.local) ?? ev.local}: ${ev.conteudo}`).join('\n')
      : 'nada ainda';
  const ouvidos =
    e.relatosOuvidos.length > 0
      ? e.relatosOuvidos.map((r) => `(${r.eventoId}) dia ${r.dia}, alguém contou: "${r.versao}"`).join('\n')
      : 'nada ainda';
  const minhas =
    e.propriasAcoes.length > 0 ? e.propriasAcoes.map((ev) => `(${ev.id}) dia ${ev.dia}: ${ev.conteudo}`).join('\n') : 'nenhuma ainda';

  return `Locais:
${locais}

Você está em: ${nomesLocais.get(e.localAtual) ?? e.localAtual}
Pessoas aqui com você: ${e.presentes.join(', ') || 'ninguém'}

O que você viu:
${vistos}

O que lhe contaram:
${ouvidos}

O que você já fez:
${minhas}

Dia ${e.dia}. Escolha sua ação.`;
}
