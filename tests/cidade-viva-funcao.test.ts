/** Modo jogável: a function Netlify roda o mesmo núcleo, com jogador humano. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.CIDADE_VIVA_PROVEDOR = 'simulado';

const chamar = async (handler: (r: Request) => Promise<Response>, action: string, payload: unknown) => {
  const res = await handler(new Request('http://x/', { method: 'POST', body: JSON.stringify({ action, payload }) }));
  const corpo = await res.json();
  assert.equal(res.status, 200, JSON.stringify(corpo));
  return corpo as any;
};

test('iniciar, agir por alguns dias e conversar com quem está no mesmo local', async () => {
  const { default: handler } = await import('../netlify/functions/cidade-viva');
  let s = await chamar(handler, 'iniciar', { mundoId: 'vale-silente', numAgentes: 4, estadoTramas: 'informa' });
  assert.equal(s.estado.dia, 0);
  assert.equal(s.config.agentesAtivos.length, 4);

  for (let d = 1; d <= 6; d++) {
    const conhecidos = s.estado.personagens.jogador.conhece;
    const r = await chamar(handler, 'avancar', {
      config: s.config,
      estado: s.estado,
      acao: { local: 'praca', acao: `Pergunto no poço o que houve (dia ${d}).`, causadoPor: conhecidos.slice(-1), tensao: 4 },
    });
    s = { ...s, estado: r.estado };
    assert.equal(s.estado.dia, d);
    assert.ok(r.eventosDoDia.some((e: any) => e.autorId === 'jogador' && e.local === 'praca'));
  }
  assert.equal(s.estado.metricas.length, 6);

  const alguem = Object.values<any>(s.estado.personagens).find((p) => p.id !== 'jogador' && p.local === 'praca');
  if (alguem) {
    const r = await chamar(handler, 'conversar', { config: s.config, estado: s.estado, agenteId: alguem.id, fala: 'Bom dia.' });
    assert.notEqual(r.fala, '(não responde)');
  }
});
