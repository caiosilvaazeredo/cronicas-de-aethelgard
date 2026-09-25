/**
 * Prompt da chamada diária que decide as ações de todos os agentes.
 *
 * Informa o estado do mundo; não direciona a forma da história. Este arquivo
 * é varrido pelo teste de restrições (tests/restricoes-prompts.test.ts).
 */

import type { ConfigMundo, EventoCidade, Relato, EstadoPersonagem } from '../mundo/tipos';
import type { TramaAbertaResumo } from '../../services/arcos';
import { INSTRUCAO_CAUSAS } from './causas';

export type EstadoTramasNoPrompt = 'informa' | 'nao-informa';

export interface EntradaPromptAgentes {
  mundo: ConfigMundo;
  agentesAtivos: string[];
  personagens: Record<string, EstadoPersonagem>;
  dia: number;
  eventosRecentes: EventoCidade[];
  relatosRecentes: Relato[];
  condicao: EstadoTramasNoPrompt;
  /** usado só na condição 'informa' */
  tramasAbertas: TramaAbertaResumo[];
}

export function sistemaAgentes(mundo: ConfigMundo, ligacoesTipadas = false): string {
  const causas = ligacoesTipadas
    ? INSTRUCAO_CAUSAS
    : 'Em "causadoPor", indique os ids dos eventos listados que tornaram a ação possível. Se a ação não decorre de nenhum deles, deixe a lista vazia.';
  const campo = ligacoesTipadas ? '"causas"' : '"causadoPor"';
  return `Você simula os habitantes de ${mundo.nome}. A cada dia, decide o que cada personagem listado faz.

Cada personagem age de acordo com o que quer, o que esconde, no que acredita e o que sabe. Um personagem só age sobre o que ele próprio sabe.
Cada ação acontece em um dos locais do mundo; o personagem pode permanecer onde está ou ir para outro local.
Descreva cada ação em uma ou duas frases concretas (até 280 caracteres), em português.
${causas}
Em "tensao", indique de 0 a 10 o quão carregado é o momento para quem age.
Responda apenas com JSON no formato {"acoes": [{"agenteId", "local", "acao", ${campo}, "tensao"}]}, com uma ação para cada personagem listado.`;
}

function linhaEvento(e: EventoCidade, nomes: Map<string, string>): string {
  return `(${e.id}) dia ${e.dia}, ${nomes.get(e.local) ?? e.local}: ${e.conteudo}`;
}

export function blocoEventos(
  entrada: Pick<EntradaPromptAgentes, 'condicao' | 'eventosRecentes' | 'tramasAbertas' | 'mundo'>
): string {
  const nomesLocais = new Map(entrada.mundo.locais.map((l) => [l.id, l.nome]));
  if (entrada.condicao === 'nao-informa') {
    if (entrada.eventosRecentes.length === 0) return 'Eventos recentes: nenhum ainda.';
    return `Eventos recentes:\n${entrada.eventosRecentes.map((e) => linhaEvento(e, nomesLocais)).join('\n')}`;
  }

  const partes: string[] = [];
  const idsEmTramas = new Set<string>();
  if (entrada.tramasAbertas.length === 0) {
    partes.push('Tramas em andamento: nenhuma ainda.');
  } else {
    const blocos = entrada.tramasAbertas.map((t) => {
      t.eventosRecentes.forEach((e) => idsEmTramas.add(e.id));
      const eventos = t.eventosRecentes.map((e) => `    (${e.id}) ${e.conteudo}`).join('\n');
      return `- [trama ${t.id}] tensão atual ${t.tensaoAtual}/10. Eventos mais recentes:\n${eventos}`;
    });
    partes.push(`Tramas em andamento (acontecimentos ligados entre si):\n${blocos.join('\n')}`);
  }
  const soltos = entrada.eventosRecentes.filter((e) => !idsEmTramas.has(e.id));
  if (soltos.length > 0) {
    partes.push(`Outros eventos recentes:\n${soltos.map((e) => linhaEvento(e, nomesLocais)).join('\n')}`);
  }
  return partes.join('\n\n');
}

export function usuarioAgentes(entrada: EntradaPromptAgentes): string {
  const { mundo } = entrada;
  const nomesLocais = new Map(mundo.locais.map((l) => [l.id, l.nome]));
  const faccoes = new Map(mundo.faccoes.map((f) => [f.id, f]));

  const locais = mundo.locais.map((l) => `- ${l.id}: ${l.nome}. ${l.descricao}`).join('\n');
  const listaFaccoes = mundo.faccoes.map((f) => `- ${f.id}: ${f.nome}. Interesse: ${f.interesse}`).join('\n');

  const relatosPorOuvinte = new Map<string, Relato[]>();
  entrada.relatosRecentes.forEach((r) => {
    if (!relatosPorOuvinte.has(r.paraId)) relatosPorOuvinte.set(r.paraId, []);
    relatosPorOuvinte.get(r.paraId)!.push(r);
  });

  const agentes = mundo.agentes
    .filter((a) => entrada.agentesAtivos.includes(a.id))
    .map((a) => {
      const estado = entrada.personagens[a.id];
      const faccao = a.faccao ? faccoes.get(a.faccao)?.nome ?? a.faccao : 'nenhuma';
      const conhecidosRecentes = entrada.eventosRecentes
        .filter((e) => estado?.conhece.includes(e.id))
        .map((e) => e.id);
      const ouviu = (relatosPorOuvinte.get(a.id) ?? []).map((r) => `"${r.versao}" (sobre ${r.eventoId})`);
      return [
        `- ${a.id}: ${a.nome}`,
        `  facção: ${faccao}`,
        `  está em: ${nomesLocais.get(estado?.local ?? a.localInicial) ?? estado?.local}`,
        `  quer: ${a.objetivo}`,
        `  esconde: ${a.segredo ?? 'nada'}`,
        `  acredita: ${a.crencas.join('; ') || 'nada em particular'}`,
        `  sabe dos eventos recentes: ${conhecidosRecentes.join(', ') || 'nenhum'}`,
        ouviu.length > 0 ? `  ouviu contar: ${ouviu.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `${mundo.descricao ? `${mundo.descricao}\n\n` : ''}Locais:
${locais}

Facções:
${listaFaccoes}

Personagens:
${agentes}

${blocoEventos(entrada)}

Dia ${entrada.dia}. Decida uma ação para cada personagem listado.`;
}
