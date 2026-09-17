import type { LinhaTempoBlocoIA } from '../../../investigation/types';

// Agente de Suspeito: um agente independente por suspeito. Cada instância
// só recebe a linha do tempo real DAQUELE suspeito e sua própria
// instrução de mentira - nunca a linha do tempo de outros suspeitos, nem
// quem é o culpado (a menos que o próprio suspeito seja o culpado).
//
// RESTRIÇÃO INEGOCIÁVEL: nenhuma menção a atos, fases ou estágios
// narrativos. O suspeito só sabe da própria noite.

function contextoBase(params: {
  nome: string;
  papel: string;
  mentiraInstrucao: string;
  linhaTempoReal: LinhaTempoBlocoIA[];
  ehCulpado: boolean;
}): string {
  const { nome, papel, mentiraInstrucao, linhaTempoReal, ehCulpado } = params;
  const linhaTempoTexto = linhaTempoReal
    .map((b) => `- ${b.horario}: em "${b.local}", ${b.conteudo}`)
    .join('\n');

  return `
Você é ${nome} (${papel}), um suspeito num caso de investigação em Aethelgard.

Sua linha do tempo REAL nessa noite foi:
${linhaTempoTexto}

${
  mentiraInstrucao
    ? `Você especificamente mente sobre: ${mentiraInstrucao}`
    : 'Você não tem nada de relevante a esconder nesta noite, então conta a verdade quando perguntado, salvo se achar necessário se defender emocionalmente.'
}
${ehCulpado ? '\nVocê é o verdadeiro culpado do caso. Você tem forte motivação para esconder sua real localização e ações no(s) horário(s) do crime.' : ''}

Regras de personagem:
- Você só sabe da sua própria noite, não do caso como um todo, não sabe
  quem é o culpado (${ehCulpado ? 'exceto que é você mesmo' : 'nem imagina quem seja'}) e não deve mencionar estrutura de atos, fases ou estágios da investigação.
- Responda sempre na sua própria voz, como alguém sendo interrogado.
`.trim();
}

export function montarPromptAlegacaoInicial(params: {
  nome: string;
  papel: string;
  mentiraInstrucao: string;
  linhaTempoReal: LinhaTempoBlocoIA[];
  ehCulpado: boolean;
}): string {
  return `
${contextoBase(params)}

Tarefa: gere sua versão ALEGADA (o que você diria se fosse perguntado
diretamente, agora, sobre onde esteve) para CADA bloco de horário da sua
linha do tempo real. Onde você tem algo a esconder naquele bloco, aplique
sua mentira; nos demais blocos, conte a verdade.

Responda apenas em JSON, um array de objetos no formato:
[{ "local": string, "horario": string, "conteudo": string, "verdadeiro": boolean }]
um item por bloco de horário, cobrindo TODOS os blocos da sua linha do
tempo real.
`.trim();
}

export function montarPromptInterrogatorio(
  params: {
    nome: string;
    papel: string;
    mentiraInstrucao: string;
    linhaTempoReal: LinhaTempoBlocoIA[];
    ehCulpado: boolean;
  },
  pergunta: string,
  confrontoComContradicao?: string
): string {
  return `
${contextoBase(params)}

O detetive pergunta: "${pergunta}"
${
  confrontoComContradicao
    ? `\nO detetive está confrontando você com uma contradição: ${confrontoComContradicao}\nReaja emocionalmente e de forma coerente com seu personagem (pode admitir parcialmente, se enrolar, ficar defensivo, ou dobrar a mentira - o que fizer sentido para quem você é).`
    : ''
}

Responda à pergunta do detetive na sua voz, em prosa (1 a 3 parágrafos
curtos). Depois da resposta em prosa, em uma nova linha, inclua um bloco
JSON separado (e apenas um) com o fato alegado nessa resposta específica,
no formato:
{"local": string, "horario": string (escolha um dos blocos da sua linha do tempo relevante à pergunta), "conteudo": string, "verdadeiro": boolean}

Não mencione estrutura de atos ou fases da investigação em nenhum momento.
`.trim();
}
