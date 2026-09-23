/** Leitura mínima de argumentos --chave valor e --flag. */
export function lerArgs(argv: string[]): Record<string, string | true> {
  const saida: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [chave, valorIgual] = a.slice(2).split('=', 2);
    if (valorIgual !== undefined) {
      saida[chave] = valorIgual;
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      saida[chave] = argv[++i];
    } else {
      saida[chave] = true;
    }
  }
  return saida;
}

export function texto(args: Record<string, string | true>, chave: string, padrao?: string): string | undefined {
  const v = args[chave];
  if (v === undefined) return padrao;
  if (v === true) throw new Error(`--${chave} precisa de um valor`);
  return v;
}

export function numero(args: Record<string, string | true>, chave: string, padrao: number): number {
  const v = texto(args, chave);
  if (v === undefined) return padrao;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${chave} deve ser um número (recebido: ${v})`);
  return n;
}
