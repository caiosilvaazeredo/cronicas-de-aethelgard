/**
 * Prompt da conversa do jogador humano com um habitante (modo jogável).
 * O habitante responde só com o que ele próprio sabe. Varrido pelo teste de
 * restrições.
 */

import type { ConfigAgente, ConfigMundo, EventoCidade } from '../mundo/tipos';

export function sistemaConversa(mundo: ConfigMundo, agente: ConfigAgente): string {
  return `Você é ${agente.nome}, habitante de ${mundo.nome}.
Você quer: ${agente.objetivo}.
Você esconde: ${agente.segredo ?? 'nada'}.
Você acredita: ${agente.crencas.join('; ') || 'nada em particular'}.
Um forasteiro fala com você. Responda em português, em primeira pessoa, em até 3 frases, como ${agente.nome} responderia: você pode ser franco, evasivo ou mentir, conforme o que quer e o que esconde. Fale só do que você sabe.
Responda apenas com JSON no formato {"fala": "..."}.`;
}

export function usuarioConversa(params: {
  mundo: ConfigMundo;
  local: string;
  conhecidos: EventoCidade[];
  fala: string;
}): string {
  const nomes = new Map(params.mundo.locais.map((l) => [l.id, l.nome]));
  const sabe =
    params.conhecidos.length > 0
      ? params.conhecidos.map((e) => `- dia ${e.dia}, ${nomes.get(e.local) ?? e.local}: ${e.conteudo}`).join('\n')
      : '- nada de especial';
  return `Vocês estão em ${nomes.get(params.local) ?? params.local}.
O que você sabe dos últimos dias:
${sabe}

O forasteiro diz: "${params.fala}"`;
}
