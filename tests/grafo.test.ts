/** Pontes, pontos de articulação, janela temporal e ligações tipadas (services/grafo.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarLigacoes, metricasDoGrafo, pontesDeFusao, pontesEArticulacoes, VARIANTES_DETECCAO, type EventoGrafo } from '../services/grafo';
import { reanalisar } from '../core/experimento/reanalise';
import { resumirLinhagem } from '../services/linhagem';

const ev = (id: string, turno: number, causadoPor: string[] = [], ligacoes?: EventoGrafo['ligacoes']): EventoGrafo => ({
  id, turno, conteudo: id, causadoPor, tramaId: null, tensao: 5, ehKernel: false, ...(ligacoes ? { ligacoes } : {}),
});

// duas linhas de 3 eventos (a1-a2-a3, b1-b2-b3), cada uma com um triângulo
// (sem pontes internas), unidas por uma única ligação a3 -> b3... via x
const duasLinhas = () => [
  ev('a1', 1), ev('a2', 2, ['a1']), ev('a3', 3, ['a1', 'a2']),
  ev('b1', 1), ev('b2', 2, ['b1']), ev('b3', 3, ['b1', 'b2']),
  ev('x', 4, ['a3']), ev('y', 5, ['x', 'b3']),
];

test('pontes e articulações: a ligação única entre duas linhas é ponte; os eventos das pontas são articulação', () => {
  const r = pontesEArticulacoes(duasLinhas());
  const chaves = r.pontes.map((p) => `${p.a}>${p.b}`);
  assert.deepEqual(chaves.sort(), ['a3>x', 'b3>y', 'x>y'].sort());
  assert.deepEqual(r.articulacoes, ['a3', 'b3', 'x', 'y']);
  const ax = r.pontes.find((p) => p.a === 'a3')!;
  assert.equal(ax.ladoA, 3);
  assert.equal(ax.ladoB, 5);
});

test('cadeia simples: toda ligação é ponte, mas nenhuma é ponte de fusão com minLado 3', () => {
  const cadeia = [ev('a', 1), ev('b', 2, ['a']), ev('c', 3, ['b']), ev('d', 4, ['c'])];
  assert.equal(pontesEArticulacoes(cadeia).pontes.length, 3);
  assert.equal(pontesDeFusao(cadeia, 3).length, 0);
  assert.equal(pontesDeFusao(duasLinhas(), 3).length, 3);
  assert.equal(pontesDeFusao(duasLinhas(), 4).length, 1, 'só x>y tem 4+ eventos dos dois lados');
});

test('sem pontes de fusão, as duas linhas voltam a ser tramas separadas', () => {
  const completo = reanalisar(duasLinhas(), 5, 3);
  const cortado = reanalisar(duasLinhas(), 5, 3, VARIANTES_DETECCAO['sem-pontes-de-fusao']);
  assert.equal(completo.tramas.length, 1);
  assert.ok(cortado.tramas.length >= 2);
  assert.equal(resumirLinhagem(completo.linhagem).fundidasAntesDeFechar, 1);
});

test('janela temporal: ligação longa vira eco e não une tramas', () => {
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 8), ev('d', 9, ['c', 'a'])];
  const { eventos: f, removidas } = filtrarLigacoes(eventos, { janelaMaxDias: 3 });
  assert.deepEqual(removidas, [{ origem: 'a', destino: 'd', motivo: 'janela' }]);
  assert.deepEqual(f.find((e) => e.id === 'd')!.causadoPor, ['c']);
  assert.equal(reanalisar(eventos, 9, 3).tramas.length, 1);
  assert.equal(reanalisar(eventos, 9, 3, { janelaMaxDias: 3 }).tramas.length, 2);
});

test('ligações tipadas: filtra por força e tipo; eventos sem tipo não são afetados', () => {
  const eventos = [
    ev('a', 1), ev('b', 1),
    ev('c', 2, ['a', 'b'], [{ id: 'a', tipo: 'motivou', forca: 3 }, { id: 'b', tipo: 'lembrou', forca: 1 }]),
    ev('d', 2, ['a']),
  ];
  const { eventos: f, removidas } = filtrarLigacoes(eventos, VARIANTES_DETECCAO.fortes);
  assert.deepEqual(f.find((e) => e.id === 'c')!.causadoPor, ['a']);
  assert.deepEqual(f.find((e) => e.id === 'd')!.causadoPor, ['a']);
  assert.equal(removidas.length, 1);
  const m = metricasDoGrafo(eventos);
  assert.deepEqual(m.porTipo, { motivou: 1, lembrou: 1 });
  assert.equal(m.forcaMedia, 2);
});

test('linhagem registra o evento que causou a fusão', () => {
  const r = reanalisar(duasLinhas(), 5, 3);
  const fundida = Object.values(r.linhagem.tramas).find((t) => t.fundiuEm !== null)!;
  assert.deepEqual(fundida.fundidaPorEventos, ['y']);
});

test('redução transitiva: remove A→C quando existe A→B→C, e só isso', async () => {
  const { ligacoesRedundantes } = await import('../services/grafo');
  const eventos = [ev('a', 1), ev('b', 2, ['a']), ev('c', 3, ['a', 'b']), ev('d', 4, ['c', 'a'])];
  assert.deepEqual([...ligacoesRedundantes(eventos)].sort(), ['a>c', 'a>d']);
  const { eventos: f } = filtrarLigacoes(eventos, VARIANTES_DETECCAO['reducao-transitiva']);
  assert.deepEqual(f.map((e) => e.causadoPor), [[], ['a'], ['b'], ['c']]);
  // a conectividade (e, portanto, as tramas) não muda
  assert.equal(reanalisar(eventos, 4, 3).tramas.length, reanalisar(eventos, 4, 3, VARIANTES_DETECCAO['reducao-transitiva']).tramas.length);
});

test('comunidades: dois grupos densos unidos por uma ligação viram duas tramas', async () => {
  const { comunidadesLouvain } = await import('../services/grafo');
  // dois grupos de 4 eventos totalmente ligados entre si, unidos por a4 -> b4
  const eventos = [
    ev('a1', 1), ev('a2', 2, ['a1']), ev('a3', 3, ['a1', 'a2']), ev('a4', 4, ['a1', 'a2', 'a3']),
    ev('b1', 1), ev('b2', 2, ['b1']), ev('b3', 3, ['b1', 'b2']), ev('b4', 5, ['b1', 'b2', 'b3', 'a4']),
  ];
  const c = comunidadesLouvain(eventos);
  assert.equal(new Set(['a1', 'a2', 'a3', 'a4'].map((id) => c.get(id))).size, 1);
  assert.equal(new Set(['b1', 'b2', 'b3', 'b4'].map((id) => c.get(id))).size, 1);
  assert.notEqual(c.get('a1'), c.get('b1'));
  assert.equal(reanalisar(eventos, 5, 3).tramas.length, 1);
  assert.equal(reanalisar(eventos, 5, 3, VARIANTES_DETECCAO.comunidades).tramas.length, 2);
  // determinismo
  assert.deepEqual([...comunidadesLouvain(eventos)], [...c]);
});
