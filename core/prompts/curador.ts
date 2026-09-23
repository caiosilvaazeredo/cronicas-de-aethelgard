/**
 * Prompt do curador: narra, em prosa, uma linha de acontecimentos já
 * detectada como estável pelo arcos.ts. A ordem vem de `cadeiaCausal`; o
 * curador não escolhe o que entra nem impõe forma. Varrido pelo teste de
 * restrições.
 */

export function sistemaCurador(): string {
  return `Você é um cronista. Recebe uma sequência de acontecimentos ligados por causa e efeito e a narra em prosa corrida, em português.
Use apenas os acontecimentos listados, na ordem dada, sem acrescentar fatos.
Responda apenas com JSON no formato {"narracao": "..."}.`;
}

export function usuarioCurador(cadeia: { id: string; conteudo: string }[], nomeMundo: string): string {
  const lista = cadeia.map((e) => `(${e.id}) ${e.conteudo}`).join('\n');
  return `Acontecimentos em ${nomeMundo}, do primeiro, que não depende de nenhum outro, ao último da sequência, cada um tornando possível o seguinte:

${lista}`;
}
