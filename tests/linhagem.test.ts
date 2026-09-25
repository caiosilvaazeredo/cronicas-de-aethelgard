/** Linhagem das tramas: fusão separada de fechamento (emenda 1 do pré-registro). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectarArcos } from '../services/arcos';
import { atualizarLinhagem, desfechoDaTrama, linhagemVazia, mapaDeTramas, resumirLinhagem, type Linhagem } from '../services/linhagem';
import type { StoryEvent, Trama } from '../types';

const ev = (id: string, turno: number, causadoPor: string[] = []): StoryEvent => ({
  id, turno, conteudo: id, causadoPor, tramaId: null, tensao: 5, ehKernel: false,
});

/** Roda a detecção dia a dia, como o motor, marcando estáveis como fechadas. */
function simular(eventos: StoryEvent[], dias: number, k = 3): Linhagem {
  let lin = linhagemVazia();
  let tramas: Trama[] = [];
  let anotados: StoryEvent[] = [];
  for (let d = 1; d <= dias; d++) {
    const antes = mapaDeTramas(anotados);
    const r = detectarArcos(eventos.filter((e) => e.turno <= d), d, tramas, k);
    lin = atualizarLinhagem(lin, d, antes, r.eventos, r.tramas);
    anotados = r.eventos;
    tramas = r.tramas.map((t) => (t.status === 'estavel' ? { ...t, status: 'fechada' as const } : t));
  }
  return lin;
}

test('duas linhas que se fundem: uma fusão, nenhum fechamento', () => {
  // linhas a->b e c->d nascem nos dias 1-2; no dia 3, e liga b e d
  const lin = simular([ev('a', 1), ev('b', 2, ['a']), ev('c', 1), ev('d', 2, ['c']), ev('e', 3, ['b', 'd'])], 3);
  const r = resumirLinhagem(lin);
  assert.equal(r.nascidas, 2);
  assert.equal(r.fundidasAntesDeFechar, 1);
  assert.equal(r.fechadasPorEstabilidade, 0);
  assert.equal(lin.dias[2].fundidas, 1);
  assert.equal(lin.dias[2].abertas, 1, 'a contagem de abertas cai de 2 para 1 por fusão');
  const absorvida = Object.values(lin.tramas).find((t) => t.fundiuEm !== null)!;
  assert.equal(absorvida.fundiuEm, 3);
  assert.ok(['a', 'c'].includes(absorvida.absorvidaPor!));
  assert.equal(lin.tramas[absorvida.absorvidaPor!].absorveu.length, 1);
});

test('linha que fica estável: um fechamento, nenhuma fusão', () => {
  const lin = simular([ev('a', 1), ev('b', 2, ['a'])], 6, 3);
  const r = resumirLinhagem(lin);
  assert.equal(r.nascidas, 1);
  assert.equal(r.fechadasPorEstabilidade, 1);
  assert.equal(r.fundidasAntesDeFechar, 0);
  assert.equal(r.proporcaoFechadasPorEstabilidade, 1);
  assert.equal(r.fracaoSaidaPorFechamento, 1);
  assert.equal(lin.tramas.a.fechouEm, 5);
  assert.equal(desfechoDaTrama(lin.tramas.a), 'fechada');
});

test('fechamento e fusão na mesma sessão são contados separadamente', () => {
  const lin = simular(
    [
      ev('a', 1), ev('b', 2, ['a']), // fecha no dia 5
      ev('c', 1), ev('d', 2, ['c']), ev('x', 1), ev('y', 2, ['x']), ev('z', 3, ['d', 'y']), // funde no dia 3
      ev('w', 4, ['z']), ev('v', 5, ['w']), ev('u', 6, ['v']), ev('t', 7, ['u']),
    ],
    7
  );
  const r = resumirLinhagem(lin);
  assert.equal(r.nascidas, 3);
  assert.equal(r.fechadasPorEstabilidade, 1);
  assert.equal(r.fundidasAntesDeFechar, 1);
  assert.equal(r.abertasNoFim, 1);
  assert.equal(r.proporcaoFechadasPorEstabilidade, 1 / 3);
  assert.equal(r.fracaoSaidaPorFechamento, 0.5);
});

test('satélite antigo que passa a ligar duas linhas: renomeação, não nascimento', () => {
  // s é satélite desde o dia 1; no dia 3, f liga s às linhas a->b e c->d
  const lin = simular([ev('s', 1), ev('a', 2), ev('b', 2, ['a']), ev('c', 2), ev('d', 2, ['c']), ev('f', 3, ['s', 'b', 'd'])], 3);
  const r = resumirLinhagem(lin);
  assert.equal(r.nascidas, 2);
  assert.equal(lin.tramas.s.origem, 'renomeacao');
  assert.equal(r.fundidasAntesDeFechar, 2, 'as duas linhas foram absorvidas pela trama renomeada');
  assert.equal(lin.dias[2].nascidas, 0);
  assert.equal(r.abertasNoFim, 1);
});
