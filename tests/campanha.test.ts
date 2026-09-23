/** Teste 7: retomada da campanha sem duplicar sessões; e orçamento. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expandirCampanha, type ConfigCampanha } from '../core/experimento/condicoes';
import { rodarCampanha } from '../sim/campanha';
import { reanalisarCampanha } from '../sim/reanalisar';
import { dirTemporario, SIMULADO } from './auxiliares';

const config = (nome: string): ConfigCampanha => ({
  nome,
  dimensoes: {
    modelosAgentes: [SIMULADO],
    estadoTramas: ['informa', 'nao-informa'],
    numAgentes: [4],
    jogador: ['nenhum', 'passivo'],
    mundos: ['porto-das-brumas'],
    incluirControle: true,
  },
  modelosFixos: { jogador: SIMULADO, curador: SIMULADO },
  repeticoes: 2,
  dias: 6,
  temperatura: 0.7,
  sementeBase: 100,
  concorrencia: 2,
});

const silencio = () => {};

test('expandirCampanha: produto das dimensões x repetições, sementes pareadas', () => {
  const s = expandirCampanha(config('x'));
  // 2 estados x 1 nº de agentes x 2 jogadores + 1 controle (perfil passivo) = 5 células
  assert.equal(s.length, 5 * 2);
  assert.equal(new Set(s.map((x) => x.id)).size, s.length);
  assert.deepEqual([...new Set(s.map((x) => x.semente))].sort(), [101, 102]);
  assert.equal(s.filter((x) => x.controle).length, 2);
});

test('sem --confirmar, só estima e não executa nada', async () => {
  const saida = await dirTemporario('camp-est');
  const r = await rodarCampanha(config('est'), { saida, confirmar: false, cache: false, log: silencio });
  assert.equal(r.executadas, 0);
  assert.ok(r.estimativa.chamadas > 0);
  assert.deepEqual(await readdir(saida), []);
});

test('retomada: interromper no meio e retomar não duplica sessões', async () => {
  const saida = await dirTemporario('camp-ret');
  const c = config('ret');
  const total = expandirCampanha(c).length;

  const r1 = await rodarCampanha(c, { saida, confirmar: true, cache: false, log: silencio, pararDepoisDe: 1 });
  assert.ok(r1.executadas >= 1 && r1.executadas < total);
  const dir = join(saida, 'ret');
  const sessoes1 = (await readdir(dir)).filter((f) => f.includes('_r'));
  const mtimes = new Map(
    await Promise.all(sessoes1.map(async (s) => [s, (await stat(join(dir, s, 'resumo.json'))).mtimeMs] as const))
  );

  // simula uma sessão que caiu no meio: diretório temporário sem resumo
  await mkdir(join(dir, `${expandirCampanha(c).at(-1)!.id}.tmp-99999`), { recursive: true });
  await writeFile(join(dir, `${expandirCampanha(c).at(-1)!.id}.tmp-99999`, 'eventos.jsonl'), '');

  const r2 = await rodarCampanha(c, { saida, confirmar: true, cache: false, log: silencio });
  assert.equal(r2.jaConcluidas, r1.executadas);
  assert.equal(r2.executadas, total - r1.executadas);
  assert.equal(r2.falharam.length, 0);

  const concluidas = (await readdir(dir)).filter((f) => /_r\d+$/.test(f));
  assert.equal(concluidas.length, total);
  for (const [s, m] of mtimes) {
    assert.equal((await stat(join(dir, s, 'resumo.json'))).mtimeMs, m, `${s} não deveria ser refeita`);
  }

  const r3 = await rodarCampanha(c, { saida, confirmar: true, cache: false, log: silencio });
  assert.equal(r3.executadas, 0);
  assert.equal(r3.jaConcluidas, total);

  const manifesto = JSON.parse(await readFile(join(dir, 'manifesto.json'), 'utf8'));
  assert.equal(manifesto.execucoes.length, 3);
  assert.equal(manifesto.sessoes.length, total);
  assert.ok(manifesto.modelosEfetivos['simulado/simulado-v1']);
  assert.ok(await readFile(join(dir, 'pre-registro.md'), 'utf8'));

  const linhas = await reanalisarCampanha(dir, [2, 3, 5]);
  assert.equal(linhas, total * 3);
});

test('campanha recusa modelo com alias móvel', async () => {
  const c = config('alias');
  c.dimensoes.modelosAgentes = [{ provedor: 'openai', modelo: 'gpt-4o' }];
  await assert.rejects(rodarCampanha(c, { saida: await dirTemporario('alias'), confirmar: false, cache: false, log: silencio }), /recusado/);
});

test('orçamento sem preço declarado para modelo real é recusado', async () => {
  const c = config('orc');
  c.modelosFixos.curador = { provedor: 'openai', modelo: 'gpt-4o-2024-08-06' };
  await assert.rejects(
    rodarCampanha(c, { saida: await dirTemporario('orc'), confirmar: true, orcamentoUsd: 1, cache: false, log: silencio }),
    /falta preço/
  );
});
