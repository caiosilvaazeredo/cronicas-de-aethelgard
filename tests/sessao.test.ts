/** Testes 3 (determinismo) e 4 (fumaça do simulador), mais o controle de três atos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { reanalisar } from '../core/experimento/reanalise';
import { carregarMundo } from '../sim/arquivos';
import { rodarSessaoNoDisco } from '../sim/sessao';
import { condicao, dirTemporario, lerJsonl } from './auxiliares';

const ARQUIVOS = [
  'condicao.json',
  'eventos.jsonl',
  'relatos.jsonl',
  'metricas.jsonl',
  'tramas.json',
  'linhagem.json',
  'narracoes.jsonl',
  'chamadas.jsonl',
  'resumo.json',
];

// "exceto carimbos de data": latência medida em relógio real
const semTempo = (texto: string) => texto.replace(/"(latenciaMs|latenciaTotalMs)":\s*\d+/g, '"$1":0');

async function rodar(dir: string, parcial = {}) {
  const c = condicao(parcial);
  const destino = join(dir, c.id);
  await rodarSessaoNoDisco(c, await carregarMundo(c.mundo), { diretorioSessao: destino, cache: null });
  return destino;
}

test('determinismo: mesma semente, exportações idênticas', async () => {
  for (const parcial of [
    { dias: 15, semente: 7 },
    { dias: 15, semente: 7, estadoTramas: 'nao-informa' as const, jogador: 'intrometido' as const, mundo: 'vale-silente' },
    { dias: 15, semente: 7, controle: true, numAgentes: 0 },
  ]) {
    const a = await rodar(await dirTemporario('det-a'), parcial);
    const b = await rodar(await dirTemporario('det-b'), parcial);
    for (const f of ARQUIVOS) {
      assert.equal(semTempo(await readFile(join(a, f), 'utf8')), semTempo(await readFile(join(b, f), 'utf8')), f);
    }
  }
});

test('sementes diferentes geram sessões diferentes', async () => {
  const a = await rodar(await dirTemporario('sem-a'), { semente: 1 });
  const b = await rodar(await dirTemporario('sem-b'), { semente: 2 });
  assert.notEqual(await readFile(join(a, 'eventos.jsonl'), 'utf8'), await readFile(join(b, 'eventos.jsonl'), 'utf8'));
});

test('fumaça: sessão de 10 dias gera todos os arquivos e métricas coerentes', async () => {
  const dir = await rodar(await dirTemporario('fumaca'), { dias: 10 });
  assert.deepEqual((await readdir(dir)).sort(), [...ARQUIVOS].sort());

  const ler = (f: string) => readFile(join(dir, f), 'utf8');
  const eventos = lerJsonl(await ler('eventos.jsonl'));
  const relatos = lerJsonl(await ler('relatos.jsonl'));
  const metricas = lerJsonl(await ler('metricas.jsonl'));
  const narracoes = lerJsonl(await ler('narracoes.jsonl'));
  const chamadas = lerJsonl(await ler('chamadas.jsonl'));
  const tramas = JSON.parse(await ler('tramas.json'));
  const resumo = JSON.parse(await ler('resumo.json'));

  assert.equal(metricas.length, 10);
  metricas.forEach((m: any, i: number) => {
    assert.equal(m.turno, i + 1);
    assert.ok(m.componentesAbertos >= 0 && m.componentesFechados >= 0);
    assert.ok(m.razaoAmarracao >= 0);
    assert.ok(m.eventosFundadores <= eventos.filter((e: any) => e.dia <= i + 1).length);
  });
  const ult = metricas[9];
  assert.equal(ult.componentesAbertos + ult.componentesFechados, tramas.length);

  const ids = new Set(eventos.map((e: any) => e.id));
  assert.equal(ids.size, eventos.length, 'ids de evento únicos');
  eventos.forEach((e: any) => {
    assert.ok(e.dia >= 1 && e.dia <= 10);
    assert.equal(e.turno, e.dia);
    assert.ok(e.testemunhas.includes(e.autorId));
    assert.ok(e.tensao >= 0 && e.tensao <= 10);
  });
  assert.ok(eventos.some((e: any) => e.autorId === 'jogador'), 'o jogador sintético agiu');
  relatos.forEach((r: any) => {
    assert.ok(ids.has(r.eventoId), 'relato ligado a evento real');
    assert.notEqual(r.deId, r.paraId);
    assert.ok(r.versao.length > 0);
  });
  assert.ok(relatos.length > 0);
  narracoes.forEach((n: any) => {
    const t = tramas.find((x: any) => x.id === n.tramaId);
    assert.ok(t, 'narração de trama existente');
    assert.equal(t.status, 'fechada');
    assert.ok(n.cadeia.length > 0);
  });
  chamadas.forEach((c: any) => {
    assert.ok(c.sistema && c.usuario, 'prompt completo registrado');
    assert.ok(c.modeloEfetivo);
    assert.ok(c.tentativas >= 1);
  });

  assert.equal(resumo.eventos, eventos.length);
  assert.equal(resumo.relatos, relatos.length);
  assert.equal(resumo.curvaTramasAbertas.length, 10);
  assert.equal(resumo.tramasSurgidas, tramas.length);
  assert.ok(resumo.proporcaoTramasFechadas >= 0 && resumo.proporcaoTramasFechadas <= 1);
  assert.equal(resumo.estrutura.taxaFalha, 0);
  assert.equal(resumo.custoUsd, 0);
  assert.equal(resumo.causadoPor.referencias - resumo.causadoPor.arestas, resumo.causadoPor.descartadas);

  // a reanálise com o mesmo k reproduz exatamente as métricas e a linhagem gravadas
  const re = reanalisar(eventos, 10, 3);
  assert.deepEqual(re.metricas, metricas);
  const linhagem = JSON.parse(await ler('linhagem.json'));
  assert.deepEqual(re.linhagem, linhagem);

  // invariantes da linhagem: abertas coincide com a métrica do arcos.ts e as
  // contagens batem com os registros por trama
  linhagem.dias.forEach((d: any, i: number) => assert.equal(d.abertas, metricas[i].componentesAbertos));
  const regs: any[] = Object.values(linhagem.tramas);
  const ultLin = linhagem.dias[9];
  assert.equal(ultLin.nascidasAcum, regs.filter((r) => r.origem === 'nascimento').length);
  assert.equal(ultLin.fundidasAcum, regs.filter((r) => r.fundiuEm !== null).length);
  assert.equal(ultLin.fechadasAcum, regs.filter((r) => r.fechouEm !== null).length);
  assert.ok(resumo.linhagem.proporcaoFechadasPorEstabilidade >= 0 && resumo.linhagem.proporcaoFechadasPorEstabilidade <= 1);
});

test('sem jogador: o mundo roda sozinho', async () => {
  const dir = await rodar(await dirTemporario('sem-jog'), { jogador: 'nenhum', numAgentes: 4 });
  const eventos = lerJsonl(await readFile(join(dir, 'eventos.jsonl'), 'utf8'));
  const chamadas = lerJsonl(await readFile(join(dir, 'chamadas.jsonl'), 'utf8'));
  assert.ok(!eventos.some((e: any) => e.autorId === 'jogador'));
  assert.ok(!chamadas.some((c: any) => c.papel === 'jogador'));
  assert.deepEqual([...new Set(eventos.map((e: any) => e.autorId))].sort(), ['bras', 'lia', 'odete', 'tomas']);
});

test('condição A inclui tramas no prompt; condição B só eventos brutos', async () => {
  const a = await rodar(await dirTemporario('cond-a'), { estadoTramas: 'informa', dias: 8 });
  const b = await rodar(await dirTemporario('cond-b'), { estadoTramas: 'nao-informa', dias: 8 });
  const prompts = async (d: string) =>
    lerJsonl(await readFile(join(d, 'chamadas.jsonl'), 'utf8'))
      .filter((c: any) => c.papel === 'agentes')
      .map((c: any) => c.usuario)
      .join('\n');
  assert.match(await prompts(a), /Tramas em andamento/);
  assert.doesNotMatch(await prompts(b), /[Tt]rama/);
});

test('controle de três atos roda pelo simulador e exporta o mesmo formato', async () => {
  const dir = await rodar(await dirTemporario('controle'), { controle: true, numAgentes: 0, dias: 16 });
  const arquivos = (await readdir(dir)).sort();
  for (const f of ARQUIVOS) assert.ok(arquivos.includes(f), f);
  const mestre = lerJsonl(await readFile(join(dir, 'mestre.jsonl'), 'utf8'));
  const atos = mestre.map((m: any) => m.ato);
  assert.equal(atos[0], 1);
  atos.forEach((a: number, i: number) => i > 0 && assert.ok(a >= atos[i - 1], 'o ato nunca volta'));
  const chamadas = lerJsonl(await readFile(join(dir, 'chamadas.jsonl'), 'utf8'));
  assert.ok(chamadas.some((c: any) => c.papel === 'mestre' && /ESTRUTURA DE ATOS/.test(c.sistema)));
  assert.ok(chamadas.some((c: any) => c.papel === 'jogador'));
});
