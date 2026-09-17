import { BLOCOS_HORARIO } from '../../../investigation/types';

// Agente Diretor: roda uma vez, na criação do caso. Gera a verdade
// inteira do caso (linha do tempo real de cada suspeito, culpado,
// motivo e mentiras).
//
// RESTRIÇÃO INEGOCIÁVEL: este prompt não menciona atos, fases dramáticas,
// jornada do herói/heroína ou qualquer ontologia de estágios narrativos.
// A geração é guiada apenas por fatos causais e temporais.
export function montarPromptDiretor(temaOpcional?: string): string {
  return `
Você é um gerador de casos de investigação no universo de Aethelgard.

Gere um caso de investigação (um assassinato, uma traição ou um
desaparecimento) com:
- Um local principal onde o caso se passa.
- Um culpado entre os suspeitos.
- Um motivo real para o crime.
- Entre 4 e 6 suspeitos.
- A linha do tempo REAL de cada suspeito naquela noite: para cada bloco
  de horário da lista [${BLOCOS_HORARIO.join(', ')}], defina onde aquele
  suspeito realmente estava e o que realmente fez.

Restrições de conteúdo:
- Gere apenas fatos: quem, onde, quando e o quê. Não organize a saída em
  atos, fases dramáticas, "início/meio/fim" ou qualquer estrutura de
  estágios narrativos. Não existe uma fase esperada da investigação -
  apenas uma cadeia de fatos causais e temporais que se encaixam ou não.
- Para o culpado, a linha do tempo real deve conter, em algum bloco de
  horário, a oportunidade e a ação que de fato cometeu o crime.
- Para CADA suspeito que não é o culpado, defina "temAlgoAEsconder": pode
  ser verdadeiro mesmo sem relação alguma com o crime (um caso amoroso, um
  furto pequeno, covardia, etc). Se temAlgoAEsconder for verdadeiro,
  preencha "mentiraInstrucao" descrevendo exatamente o que esse suspeito
  vai mentir se for perguntado sobre aquele fato específico (qual bloco de
  horário, o que ele vai dizer em vez da verdade). Se for falso, deixe
  "mentiraInstrucao" como string vazia.
- Para o culpado, "mentiraInstrucao" deve cobrir como ele disfarça sua
  real localização/ação no(s) bloco(s) de horário do crime.
- Cada suspeito deve ter uma linha do tempo real plausível cobrindo TODOS
  os blocos de horário listados, sem lacunas.
${temaOpcional ? `\nAmbientação sugerida (opcional, adapte livremente ao universo de Aethelgard): ${temaOpcional}\n` : ''}
Responda apenas em JSON conforme o schema fornecido.
`.trim();
}
