/**
 * Teste 6: regressão do services/arcos.ts. O branch base não tinha testes;
 * estes fixam o comportamento atual, que o manual manda preservar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cadeiaCausal,
  construirArestas,
  detectarArcos,
  papelDoEvento,
  resumoTramasAbertas,
} from '../services/arcos';
import type { StoryEvent } from '../types';

const ev = (id: string, turno: number, causadoPor: string[] = [], tensao = 5): StoryEvent => ({
  id,
  turno,
  conteudo: `evento ${id}`,
  causadoPor,
  tramaId: null,
  tensao,
  ehKernel: false,
});

test('construirArestas descarta id inexistente, futuro, repetido e o próprio evento', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a', 'a', 'b', 'x', 'c']), ev('c', 3, ['a'])];
  const { entrada, saida, total } = construirArestas(eventos);
  assert.equal(total, 2);
  assert.deepEqual(entrada.get('b'), ['a']);
  assert.deepEqual(saida.get('a'), ['b', 'c']);
});

test('aceita causa no mesmo turno', () => {
  const { total } = construirArestas([ev('a', 1), ev('b', 1, ['a'])]);
  assert.equal(total, 1);
});

test('detectarArcos: componentes, ids pelo evento mais antigo e satélites', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('s', 2), ev('c', 3), ev('d', 4, ['c', 'b'])];
  const r = detectarArcos(eventos, 4, [], 3);
  assert.equal(r.tramas.length, 1, 'd funde as duas linhas');
  assert.equal(r.tramas[0].id, 'a');
  assert.equal(r.eventos.find((e) => e.id === 's')!.ehKernel, false);
  assert.equal(r.eventos.find((e) => e.id === 's')!.tramaId, null);
  assert.equal(r.eventos.find((e) => e.id === 'c')!.tramaId, 'a');
  assert.equal(r.tramas[0].status, 'aberta');
  assert.equal(r.tramas[0].eventoFinalId, null);
});

test('estabilidade depende do limiar k', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a'])];
  assert.equal(detectarArcos(eventos, 4, [], 3).tramas[0].status, 'aberta');
  const r = detectarArcos(eventos, 5, [], 3);
  assert.equal(r.tramas[0].status, 'estavel');
  assert.equal(r.tramas[0].eventoInicialId, 'a');
  assert.equal(r.tramas[0].eventoFinalId, 'b');
  assert.equal(detectarArcos(eventos, 4, [], 2).tramas[0].status, 'estavel');
});

test('trama fechada não reabre e mantém a narração', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 9, ['b'])];
  const r = detectarArcos(eventos, 9, [
    { id: 'a', eventoInicialId: 'a', eventoFinalId: 'b', turnosSemNovoEvento: 3, status: 'fechada', narracaoFechamento: 'texto' },
  ]);
  assert.equal(r.tramas[0].status, 'fechada');
  assert.equal(r.tramas[0].narracaoFechamento, 'texto');
});

test('métrica: abertos, fechados, pontas soltas, fundadores e razão de amarração', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 5), ev('d', 6, ['c']), ev('s', 6)];
  const m = detectarArcos(eventos, 6, [], 3).metrica;
  assert.deepEqual(m, {
    turno: 6,
    componentesAbertos: 1,
    componentesFechados: 1,
    pontasSoltas: 1,
    eventosFundadores: 3,
    razaoAmarracao: 2 / 5,
  });
});

test('papelDoEvento', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 3, ['b'])];
  const r = detectarArcos(eventos, 3, [], 3);
  const { entrada, saida } = construirArestas(r.eventos);
  const papel = (id: string, fechada: boolean) => papelDoEvento(r.eventos.find((e) => e.id === id)!, entrada, saida, fechada);
  assert.equal(papel('a', false), 'origem');
  assert.equal(papel('b', false), 'desdobramento');
  assert.equal(papel('c', false), 'ponta');
  assert.equal(papel('c', true), 'desfecho');
  assert.equal(papelDoEvento(ev('z', 1), entrada, saida, false), 'satelite');
});

test('cadeiaCausal prefere continuar a cadeia recém-emitida', () => {
  const eventos = [ev('a', 1), ev('x', 1), ev('b', 2, ['a']), ev('y', 2, ['x']), ev('c', 3, ['b']), ev('m', 4, ['c', 'y'])];
  const r = detectarArcos(eventos, 4, [], 3);
  assert.deepEqual(
    cadeiaCausal(r.eventos, 'a').map((e) => e.id),
    ['a', 'b', 'c', 'x', 'y', 'm']
  );
});

test('resumoTramasAbertas omite fechadas e limita eventos recentes', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 3, ['b']), ev('d', 4, ['c'], 8)];
  const r = detectarArcos(eventos, 4, [], 3);
  const resumo = resumoTramasAbertas(r.eventos, r.tramas, 2);
  assert.equal(resumo.length, 1);
  assert.equal(resumo[0].tensaoAtual, 8);
  assert.deepEqual(resumo[0].eventosRecentes.map((e) => e.id), ['c', 'd']);
  const fechadas = r.tramas.map((t) => ({ ...t, status: 'fechada' as const }));
  assert.deepEqual(resumoTramasAbertas(r.eventos, fechadas), []);
});
