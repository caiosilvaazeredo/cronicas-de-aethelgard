/**
 * Limite de taxa por provedor: intervalo mínimo entre o início de duas
 * chamadas ao mesmo provedor (60000 / chamadas por minuto). A espera
 * exponencial em 429/503 fica no ProvedorEstruturado.
 */
export class LimitadorTaxa {
  private proximo = new Map<string, number>();

  constructor(private readonly porMinuto: Record<string, number> = {}) {}

  para(provedor: string): (() => Promise<void>) | undefined {
    const rpm = this.porMinuto[provedor];
    if (!rpm || rpm <= 0) return undefined;
    const intervalo = 60000 / rpm;
    return async () => {
      const agora = Date.now();
      const quando = Math.max(agora, this.proximo.get(provedor) ?? 0);
      this.proximo.set(provedor, quando + intervalo);
      if (quando > agora) await new Promise((r) => setTimeout(r, quando - agora));
    };
  }
}
