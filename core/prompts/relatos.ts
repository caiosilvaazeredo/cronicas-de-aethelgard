/**
 * Prompt dos relatos: cada habitante conta a outro, do seu jeito, algo que
 * viu. A versão contada é guardada ao lado do evento real. Varrido pelo teste
 * de restrições.
 */

import type { ConfigMundo } from '../mundo/tipos';

export interface PedidoRelato {
  indice: number;
  narrador: { nome: string; crencas: string[]; segredo: string | null; faccao: string | null };
  ouvinte: string;
  conteudoOriginal: string;
}

export function sistemaRelatos(mundo: ConfigMundo): string {
  return `Você dá voz aos habitantes de ${mundo.nome} quando contam uns aos outros o que viram.
Cada pessoa conta do seu jeito: com as palavras dela, a partir do que acredita, do que quer proteger e de quem está ouvindo. A versão contada pode ser fiel, incompleta ou distorcida, conforme a pessoa.
Para cada pedido, escreva em português, em até 400 caracteres, o que o narrador diz ao ouvinte.
Responda apenas com JSON no formato {"relatos": [{"indice", "versao"}]}, com um item para cada pedido.`;
}

export function usuarioRelatos(pedidos: PedidoRelato[]): string {
  return pedidos
    .map(
      (p) =>
        `[${p.indice}] ${p.narrador.nome} (acredita: ${p.narrador.crencas.join('; ') || 'nada em particular'}; esconde: ${p.narrador.segredo ?? 'nada'}) conta a ${p.ouvinte} sobre o que viu: "${p.conteudoOriginal}"`
    )
    .join('\n');
}
