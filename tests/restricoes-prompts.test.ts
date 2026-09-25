/**
 * Testes 1 e 2 do manual: nenhum prompt menciona estrutura narrativa fixa nem
 * instrui convergência. Varre (a) o código-fonte de core/prompts/, (b) os
 * mundos, que entram nos prompts, e (c) os prompts efetivamente enviados numa
 * sessão simulada de cada mundo. O controle de três atos
 * (core/experimento/controle-tres-atos.ts) é a única exceção, por definição.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { executarSessao } from '../core/experimento/execucao';
import { criarProvedor } from '../core/llm/registro';
import { condicao, mundo, SIMULADO } from './auxiliares';

// \b do JS não entende acentos; estas fronteiras usam classes Unicode.
const palavra = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${p})(?![\\p{L}\\p{N}])`, 'iu');

export const TERMOS_ESTRUTURA: [string, RegExp][] = [
  ['ato/atos', palavra('atos?')],
  ['fase', palavra('fases?')],
  ['estágio', palavra('est[aá]gios?')],
  ['etapa', palavra('etapas?')],
  ['capítulo', palavra('cap[ií]tulos?')],
  ['jornada do herói/heroína', /jornada\s+d[ao]s?\s+her[oó]i/iu],
  ['clímax', palavra('cl[ií]max')],
  ['desfecho', /desfech/iu],
  ['três atos / estrutura narrativa', /estrutura\s+narrativa|tr[eê]s\s+atos/iu],
  ['arco narrativo', /arcos?\s+narrativ/iu],
];

export const TERMOS_CONVERGENCIA: [string, RegExp][] = [
  ['amarrar', /amarr/iu],
  ['concluir', /conclu[ií]/iu],
  ['resolver', /resolv|resolu[cç]/iu],
  ['fechar', /fech/iu],
  ['encerrar', /encerr/iu],
  ['finalizar', /finaliz/iu],
  ['arrematar', /arremat/iu],
  ['evitar novas', /evit\w*[^.\n]{0,40}nov[ao]s?/iu],
  ['não abrir/criar', /n[ãa]o\s+(abra|abrir|crie|criar|inicie|iniciar|comece|comecar|começar)/iu],
];

function violacoes(texto: string, termos: [string, RegExp][]): string[] {
  return termos
    .filter(([, re]) => re.test(texto))
    .map(([nome, re]) => {
      const m = texto.match(re)!;
      const i = m.index ?? 0;
      return `${nome}: "...${texto.slice(Math.max(0, i - 30), i + 30).replace(/\n/g, ' ')}..."`;
    });
}

const dirPrompts = join(process.cwd(), 'core', 'prompts');
const arquivosPrompts = readdirSync(dirPrompts).filter((f) => f.endsWith('.ts'));
const arquivosMundos = readdirSync(join(process.cwd(), 'mundos')).filter((f) => f.endsWith('.json'));

test('há arquivos de prompt para auditar', () => {
  assert.ok(arquivosPrompts.length >= 4, `esperava ao menos 4 arquivos em core/prompts, achei ${arquivosPrompts.length}`);
});

for (const [rotulo, termos] of [
  ['estrutura narrativa (teste 1)', TERMOS_ESTRUTURA],
  ['instrução de convergência (teste 2)', TERMOS_CONVERGENCIA],
] as const) {
  test(`core/prompts sem ${rotulo}`, () => {
    for (const f of arquivosPrompts) {
      const v = violacoes(readFileSync(join(dirPrompts, f), 'utf8'), termos);
      assert.deepEqual(v, [], `core/prompts/${f}`);
    }
  });

  test(`mundos sem ${rotulo}`, () => {
    for (const f of arquivosMundos) {
      const v = violacoes(readFileSync(join(process.cwd(), 'mundos', f), 'utf8'), termos);
      assert.deepEqual(v, [], `mundos/${f}`);
    }
  });

  test(`prompts efetivamente enviados sem ${rotulo}`, async () => {
    const papeis = new Set<string>();
    for (const id of ['porto-das-brumas', 'vale-silente']) {
      for (const estadoTramas of ['informa', 'nao-informa'] as const) {
        const p = await criarProvedor(SIMULADO);
        const reg = await executarSessao(
          condicao({ mundo: id, dias: 20, estadoTramas, numAgentes: estadoTramas === 'informa' ? 8 : 4, ligacoesTipadas: estadoTramas === 'nao-informa' }),
          mundo(id),
          { agentes: p, jogador: p, curador: p }
        );
        reg.chamadas.forEach((c) => papeis.add(c.papel));
        for (const c of reg.chamadas) {
          const v = violacoes(`${c.sistema}\n${c.usuario}`, termos);
          assert.deepEqual(v, [], `${id}/${estadoTramas}/${c.papel} dia ${c.dia}`);
        }
      }
    }
    assert.deepEqual([...papeis].sort(), ['agentes', 'curador', 'jogador', 'relatos'], 'todos os papéis foram auditados');
  });
}

test('o detector reconhece os termos proibidos (controle do próprio teste)', () => {
  assert.ok(violacoes('Estamos no Ato 2, rumo ao clímax.', TERMOS_ESTRUTURA).length >= 2);
  assert.ok(violacoes('Tente amarrar as tramas e evite abrir novas.', TERMOS_CONVERGENCIA).length >= 2);
  assert.deepEqual(violacoes('O contato do retrato foi pago em ducados.', TERMOS_ESTRUTURA), []);
  const controle = readFileSync(join(process.cwd(), 'core', 'experimento', 'controle-tres-atos.ts'), 'utf8');
  assert.ok(violacoes(controle, TERMOS_ESTRUTURA).length > 0, 'o controle deve conter a estrutura de atos');
});
