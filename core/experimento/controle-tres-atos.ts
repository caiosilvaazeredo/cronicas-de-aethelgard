/**
 * Adaptador do controle: o modo RPG de três atos, rodado pelo mesmo
 * simulador, com o jogador sintético, gerando o mesmo formato de exportação.
 *
 * ESTE ARQUIVO CONTÉM, DE PROPÓSITO, A ESTRUTURA DE ATOS. Ele é a condição de
 * controle e por isso fica fora de core/prompts/ (o diretório auditado pelo
 * teste de restrições). O prompt do mestre abaixo é cópia literal do
 * SYSTEM_INSTRUCTION_MASTER do modo de três atos (branch main,
 * netlify/functions/gemini.ts), com duas adaptações necessárias para que o
 * controle gere o mesmo grafo que a Cidade Viva, marcadas com [ADAPTAÇÃO]:
 *
 *  1. a resposta inclui "eventoGerado" (conteudo, causadoPor, tensao), com a
 *     mesma instrução de evento usada no RPG clássico de arcos emergentes;
 *  2. em vez do histórico de chat em memória do servidor (as 10 últimas
 *     interações), o prompt recebe o recapitulado das últimas narrações e a
 *     lista de eventos recentes com ids, para que causadoPor tenha a que
 *     apontar.
 *
 * As regras de atos do modo antigo são mantidas no código: o ato começa em 1,
 * nunca volta e é limitado a 3. Não há dados de ficha (HP, mana, inventário):
 * o controle mede a narrativa, não o combate; a rolagem d20 é sorteada com a
 * semente da sessão.
 */

import type { ConfigMundo, EstadoMundo, EventoCidade, PerfilJogador } from '../mundo/tipos';
import { ID_JOGADOR } from '../mundo/tipos';
import { AcaoDoJogador, RespostaMestreControle } from '../llm/esquemas';
import type { ProvedorLLM } from '../llm/provedor';
import {
  chamarERegistrar,
  detectarECurar,
  sementeDaChamada,
  MAX_TOKENS_PADRAO,
  type Registrador,
} from '../mundo/motor';
import { sistemaJogador, usuarioJogador } from '../prompts/jogador-sintetico';
import { criarRng, hashTexto } from '../util/aleatorio';

export const ID_MESTRE = 'mestre';

// Cópia literal do modo de três atos (main). O texto é mantido inteiro,
// inclusive as regras de mana e de imagem, para que o controle seja o modo
// antigo; o esquema do controle só não pede esses campos.
const SYSTEM_INSTRUCTION_MASTER_TRES_ATOS = `
Você é o MESTRE DE ALUGUEL. Humor metalinguístico (Knights of Pen and Paper), ranzinza e zoeiro.
Você deve narrar a história seguindo a Jornada do Herói.

ESTRUTURA DE ATOS (MUITO IMPORTANTE):
- O contexto incluirá "Turno: X" e "Ato Atual: Y".
- ATO 1 (O Chamado): Turnos 1-5. Apresente o cenário, o chamado à aventura.
- ATO 2 (As Provações): Turnos 6-12. Desafios crescentes, combates, descobertas.
- ATO 3 (O Clímax): Turnos 13+. Confronto final, resolução da história.

REGRA DE TRANSIÇÃO DE ATOS:
- NÃO mude o ato antes do turno mínimo.
- Quando for hora de mudar, coloque o NOVO número do ato em "currentAct".
- NUNCA volte para um ato anterior. Se está no Ato 2, só pode ir para Ato 3.
- Se a duração for "quick", comprima tudo: Ato 1 (turnos 1-2), Ato 2 (3-4), Ato 3 (5+).

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
   - Exemplo: "interior de taverna medieval com balcão de madeira escura, velas derretendo, um anão barbudo servindo cerveja, luz alaranjada"
4. Sempre responda no formato JSON válido conforme o esquema.
`;

// [ADAPTAÇÃO 1] mesma instrução de evento do RPG clássico de arcos emergentes
const INSTRUCAO_EVENTO = `Ao final, informe o evento que acabou de acontecer no campo "eventoGerado", indicando em "causadoPor" os ids dos eventos acima que tornaram este evento possível. Se o evento não decorre de nenhum deles, deixe "causadoPor" vazio.`;

export function sistemaMestreControle(mundo: ConfigMundo, duracao: string): string {
  return `${SYSTEM_INSTRUCTION_MASTER_TRES_ATOS}\nTema: ${mundo.nome}. ${mundo.descricao ?? ''} Duração: ${duracao}. Use estética medieval clássica de pixel art.`;
}

export interface ConfigControle {
  mundo: ConfigMundo;
  perfil: PerfilJogador;
  temperatura: number;
  semente: number;
  limiarEstabilidade: number;
  janelaDias: number;
  /** duração declarada ao mestre, como no seletor do modo antigo */
  duracao: 'quick' | 'medium' | 'long';
}

export interface EstadoControle extends EstadoMundo {
  atoAtual: number;
  historias: { dia: number; texto: string; ato: number }[];
  acoesJogador: { id: string; dia: number; conteudo: string }[];
}

export function estadoInicialControle(mundo: ConfigMundo): EstadoControle {
  return {
    dia: 0,
    personagens: { [ID_JOGADOR]: { id: ID_JOGADOR, local: mundo.locais[0].id, conhece: [], ouviu: [] } },
    eventos: [],
    relatos: [],
    tramas: [],
    metricas: [],
    narracoes: [],
    atoAtual: 1,
    historias: [],
    acoesJogador: [],
  };
}

export async function avancarDiaControle(
  anterior: EstadoControle,
  config: ConfigControle,
  provedores: { mestre: ProvedorLLM; jogador: ProvedorLLM; curador: ProvedorLLM },
  registrar: Registrador
): Promise<EstadoControle> {
  const estado = JSON.parse(JSON.stringify(anterior)) as EstadoControle;
  const dia = estado.dia + 1;
  const eu = estado.personagens[ID_JOGADOR];

  // O jogador sintético lê o que o mestre narrou (tudo que ele viu).
  const vistos = estado.historias.slice(-10).map((h) => ({
    id: `D${h.dia}.${ID_MESTRE}`,
    dia: h.dia,
    local: eu.local,
    conteudo: h.texto,
  }));
  const respJogador = await chamarERegistrar(
    provedores.jogador,
    {
      sistema: sistemaJogador(config.mundo, config.perfil),
      usuario: usuarioJogador({
        mundo: config.mundo,
        dia,
        localAtual: eu.local,
        presentes: [],
        eventosVistos: vistos,
        relatosOuvidos: [],
        propriasAcoes: estado.acoesJogador.slice(-5),
      }),
      esquema: AcaoDoJogador,
      temperatura: config.temperatura,
      semente: sementeDaChamada(config.semente, dia, 'acao-jogador'),
      maxTokens: MAX_TOKENS_PADRAO.jogador,
      meta: {
        tarefa: 'acao-jogador',
        papel: 'jogador',
        dia,
        dadosSimulacao: {
          locais: config.mundo.locais.map((l) => l.id),
          localAtual: eu.local,
          eventosConhecidos: vistos.map((v) => v.id),
          perfil: config.perfil,
        },
      },
    },
    'jogador',
    registrar
  );
  const acaoJogador = (respJogador?.json as AcaoDoJogador | undefined) ?? {
    local: eu.local,
    acao: 'O jogador hesita e não faz nada.',
    causadoPor: [],
    tensao: 0,
  };
  if (config.mundo.locais.some((l) => l.id === acaoJogador.local)) eu.local = acaoJogador.local;
  estado.acoesJogador.push({ id: `D${dia}.${ID_JOGADOR}`, dia, conteudo: acaoJogador.acao });

  // [ADAPTAÇÃO 2] recap e eventos recentes com ids no lugar do chat em memória
  const d20 = 1 + Math.floor(criarRng(hashTexto(`${config.semente}|d20|${dia}`))() * 20);
  const recap = estado.historias.slice(-5).map((h) => `- ${h.texto}`).join('\n');
  const recentes = estado.eventos.filter((e) => e.dia >= dia - config.janelaDias);
  const listaEventos =
    recentes.length > 0 ? recentes.map((e) => `(${e.id}) ${e.conteudo}`).join('\n') : 'Nenhum evento ainda.';

  const usuario =
    dia === 1
      ? `Turno: 1. Ato Atual: 1. Inicie a aventura para um forasteiro. Comece no Ato 1: O Chamado. Ação do jogador: "${acaoJogador.acao}" (Rolagem d20: ${d20}). Lembre-se: currentAct DEVE ser 1 neste primeiro turno. Este é o evento fundador, então "causadoPor" deve vir vazio em "eventoGerado". ${INSTRUCAO_EVENTO}`
      : `Turno: ${dia}. Ato Atual: ${estado.atoAtual}. ${recap ? `Recapitulando os últimos acontecimentos:\n${recap}\n\n` : ''}Ação do jogador: "${acaoJogador.acao}" (Rolagem d20: ${d20}). Prossiga com a narrativa apenas para este turno. IMPORTANTE: currentAct deve ser >= ${estado.atoAtual} (nunca menor).\n\nEventos recentes:\n${listaEventos}\n\n${INSTRUCAO_EVENTO}`;

  const respMestre = await chamarERegistrar(
    provedores.mestre,
    {
      sistema: sistemaMestreControle(config.mundo, config.duracao),
      usuario,
      esquema: RespostaMestreControle,
      temperatura: config.temperatura,
      semente: sementeDaChamada(config.semente, dia, 'mestre-controle'),
      maxTokens: 8000,
      meta: {
        tarefa: 'mestre-controle',
        papel: 'mestre',
        dia,
        dadosSimulacao: { atoAtual: estado.atoAtual, dia, eventosVisiveis: recentes.map((e) => e.id) },
      },
    },
    'mestre',
    registrar
  );
  const mestre = respMestre?.json as RespostaMestreControle | undefined;
  if (mestre) {
    // regras de ato do modo antigo: começa em 1, nunca volta, máximo 3
    let ato = dia === 1 ? 1 : Math.max(estado.atoAtual, mestre.currentAct);
    ato = Math.min(3, ato);
    estado.atoAtual = ato;
    estado.historias.push({ dia, texto: mestre.story, ato });
    const ev: EventoCidade = {
      id: `D${dia}.${ID_MESTRE}`,
      turno: dia,
      dia,
      conteudo: mestre.eventoGerado.conteudo,
      causadoPor: mestre.eventoGerado.causadoPor,
      tensao: mestre.eventoGerado.tensao,
      tramaId: null,
      ehKernel: false,
      autorId: ID_MESTRE,
      local: eu.local,
      testemunhas: [ID_JOGADOR],
    };
    estado.eventos.push(ev);
    eu.conhece.push(ev.id);
  }

  await detectarECurar(
    estado,
    dia,
    {
      limiarEstabilidade: config.limiarEstabilidade,
      temperatura: config.temperatura,
      semente: config.semente,
      maxTokensCurador: MAX_TOKENS_PADRAO.curador,
      nomeMundo: config.mundo.nome,
    },
    provedores.curador,
    registrar
  );
  estado.dia = dia;
  return estado;
}
