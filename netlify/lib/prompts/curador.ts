import type { Evento, Suspeito } from '../../../investigation/types';

// Agente Curador: roda uma vez, na acusação final. Recebe todo o grafo de
// eventos (reais e alegados, já com contradições/corroborações marcadas)
// e escreve a revelação final.
//
// RESTRIÇÃO INEGOCIÁVEL: a curadoria aplica os critérios já definidos na
// proposta de tese - distinção kernel/satélite e grau causal (início tem
// grau de entrada zero, fim tem grau de saída zero no subgrafo de
// kernels), opcionalmente a curva de tensão como sinal auxiliar. Isso é
// análise sobre o registro bruto já ocorrido, nunca uma instrução prévia
// de estrutura de atos ou fases da narrativa injetada antes da geração.
export function montarPromptCurador(params: {
  suspeitos: Suspeito[];
  eventos: Evento[];
  suspeitoAcusadoId: string;
}): string {
  const { suspeitos, eventos, suspeitoAcusadoId } = params;

  const suspeitosTexto = suspeitos
    .map((s) => `- ${s.id}: ${s.nome} (${s.papel})`)
    .join('\n');

  const eventosTexto = eventos
    .map((e) => {
      const marcas = [
        e.status !== 'nao_verificado' ? `status=${e.status}` : null,
        e.contradizComId ? `contradiz=${e.contradizComId}` : null,
        e.corroboraComId ? `corrobora=${e.corroboraComId}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `[${e.id}] tipo=${e.tipo} suspeito=${e.suspeitoId} horario=${e.horario} local="${e.local}" conteudo="${e.conteudo}"${marcas ? ` (${marcas})` : ''}`;
    })
    .join('\n');

  const acusado = suspeitos.find((s) => s.id === suspeitoAcusadoId);

  return `
Você é o agente curador de um caso de investigação em Aethelgard. Sua
tarefa é escrever a revelação final a partir do REGISTRO BRUTO de eventos
abaixo (fatos reais e alegações dos suspeitos, já com contradições e
corroborações marcadas pelo sistema).

Suspeitos:
${suspeitosTexto}

Registro de eventos (não ordene por nenhuma fase pré-definida; a ordem
aqui é apenas de inserção):
${eventosTexto}

O detetive acusou: ${acusado ? `${acusado.nome} (${acusado.id})` : suspeitoAcusadoId}.

Tarefa de curadoria (aplique estes critérios ANALÍTICOS sobre o registro
acima, não use qualquer estrutura de atos ou fases pré-definida):
1. Identifique quais eventos são KERNELS (fatos causalmente necessários:
   removê-los quebraria a cadeia que leva ao crime e sua resolução) e
   quais são SATÉLITES (detalhes que enriquecem mas não são causalmente
   necessários).
2. No subgrafo formado apenas pelos kernels, identifique o evento de
   ABERTURA (grau de entrada causal zero - nada o causa dentro do
   subgrafo) e o evento de FECHAMENTO (grau de saída causal zero - não
   causa mais nada dentro do subgrafo). Use isso para estruturar a
   revelação, não uma fase narrativa esperada a priori.
3. Opcionalmente, use a curva de tensão (quão grave/reveladora é cada
   contradição) como sinal auxiliar de ênfase, nunca como critério
   substituto do causal.
4. Determine se a acusação do detetive está correta (compare com o
   culpado real implícito nos eventos reais e nas contradições).
5. Escreva "textoRevelacao": um texto corrido (não dividido em atos) que
   narra a cadeia causal dos kernels do início ao fim, explicando como as
   contradições descobertas pelo detetive desmontam os álibis, e revela
   se a acusação estava certa.

Responda apenas em JSON conforme o schema fornecido, com "cadeiaCausal"
listando cada evento kernel/satélite relevante e seu papel.
`.trim();
}
