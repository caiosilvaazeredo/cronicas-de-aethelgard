/** Teste 5 (esquemas e novas tentativas) e regras de identificador de modelo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ProvedorEstruturado, esquemaParaJsonSchema, ErroProvedor } from '../core/llm/provedor';
import { criarProvedor, motivoRecusaModelo } from '../core/llm/registro';
import { transporteSimulado } from '../core/llm/simulado';
import { AcoesDoDia } from '../core/llm/esquemas';
import { executarSessao } from '../core/experimento/execucao';
import { calcularResumo } from '../core/experimento/exportacao';
import { condicao, mundo, SIMULADO } from './auxiliares';

const Esq = z.object({ valor: z.number().max(10) });

test('resposta inválida é reenviada com o erro de validação e, corrigida, é aceita', async () => {
  const prompts: string[] = [];
  let n = 0;
  const p = new ProvedorEstruturado('teste', 'teste-1', async (r) => {
    prompts.push(r.usuario);
    n += 1;
    const texto = n === 1 ? '{"valor": 99}' : n === 2 ? 'isto não é json' : '```json\n{"valor": 3}\n```';
    return { texto, modeloEfetivo: 'teste-1', tokensEntrada: 10, tokensSaida: 5, bruto: n };
  });
  const r = await p.chamar({ sistema: 's', usuario: 'u', esquema: Esq, temperatura: 0, maxTokens: 10 });
  assert.equal(r.tentativas, 3);
  assert.deepEqual(r.json, { valor: 3 });
  assert.equal(r.falhaEstrutura, undefined);
  assert.equal(r.tokensEntrada, 30, 'tokens de todas as tentativas são somados');
  assert.equal(prompts[0], 'u');
  assert.match(prompts[1], /valor/);
  assert.match(prompts[1], /não seguiu o esquema/);
  assert.match(prompts[2], /JSON inválido/);
});

test('depois de 2 novas tentativas inválidas, registra falha sem lançar', async () => {
  const p = new ProvedorEstruturado('teste', 'teste-1', async () => ({
    texto: '{"outro": 1}',
    modeloEfetivo: 'teste-1',
    tokensEntrada: 1,
    tokensSaida: 1,
    bruto: null,
  }));
  const r = await p.chamar({ sistema: 's', usuario: 'u', esquema: Esq, temperatura: 0, maxTokens: 10 });
  assert.equal(r.tentativas, 3);
  assert.equal(r.json, undefined);
  assert.ok(r.falhaEstrutura);
});

test('espera exponencial em 429/503 e desiste em erro não transitório', async () => {
  const esperas: number[] = [];
  let n = 0;
  const p = new ProvedorEstruturado(
    'teste',
    'teste-1',
    async () => {
      n += 1;
      if (n <= 2) throw new ErroProvedor('limite', n === 1 ? 429 : 503);
      return { texto: '{"valor": 1}', modeloEfetivo: 'teste-1', tokensEntrada: 1, tokensSaida: 1, bruto: null };
    },
    { esperaBaseMs: 100, esperar: async (ms) => void esperas.push(ms) }
  );
  const r = await p.chamar({ sistema: 's', usuario: 'u', esquema: Esq, temperatura: 0, maxTokens: 10 });
  assert.deepEqual(esperas, [100, 200]);
  assert.equal(r.tentativas, 1, 'erros de rede não contam como tentativa de estrutura');

  const q = new ProvedorEstruturado('teste', 'teste-1', async () => {
    throw new ErroProvedor('chave inválida', 401);
  }, { esperar: async () => assert.fail('não deveria esperar') });
  await assert.rejects(q.chamar({ sistema: 's', usuario: 'u', temperatura: 0, maxTokens: 10 }), /chave inválida/);
});

test('simulado com falha na primeira tentativa: todas as chamadas se recuperam na segunda', async () => {
  const p = await criarProvedor(SIMULADO, { simulado: { falha: 'primeira-tentativa' } });
  const reg = await executarSessao(condicao({ dias: 6 }), mundo(), { agentes: p, jogador: p, curador: p });
  assert.ok(reg.chamadas.length > 0);
  for (const c of reg.chamadas) {
    assert.equal(c.tentativas, 2, `${c.papel} dia ${c.dia}`);
    assert.equal(c.falhaEstrutura, null);
    assert.match(c.usuario, /./);
  }
  assert.ok(reg.estado.eventos.length > 0);
});

test('simulado com falha forçada permanente: a sessão termina e a falha é exportada', async () => {
  const p = await criarProvedor(SIMULADO, { simulado: { falha: 'sempre' } });
  const reg = await executarSessao(condicao({ dias: 5 }), mundo(), { agentes: p, jogador: p, curador: p });
  assert.equal(reg.estado.dia, 5);
  assert.equal(reg.estado.eventos.length, 0);
  assert.equal(reg.estado.metricas.length, 5);
  for (const c of reg.chamadas) {
    assert.equal(c.tentativas, 3);
    assert.ok(c.falhaEstrutura);
  }
  const resumo = calcularResumo(reg);
  assert.equal(resumo.estrutura.taxaFalha, 1);
  assert.equal(resumo.estrutura.falhas, reg.chamadas.length);
  assert.equal(resumo.agentesSemAcao, 5 * 6);
});

test('simulado gera JSON que valida contra os esquemas', async () => {
  const t = transporteSimulado();
  const s = await t({
    sistema: 's',
    usuario: 'u',
    jsonSchema: esquemaParaJsonSchema(AcoesDoDia),
    temperatura: 0,
    maxTokens: 10,
    meta: { tarefa: 'acoes-agentes', dadosSimulacao: { agentes: [{ id: 'a', nome: 'A', local: 'x' }], locais: ['x', 'y'], eventosVisiveis: ['e1'] } },
  });
  assert.ok(AcoesDoDia.safeParse(JSON.parse(s.texto)).success);
});

test('esquema enviado aos provedores não carrega palavras-chave não portáveis', () => {
  const js = JSON.stringify(esquemaParaJsonSchema(AcoesDoDia));
  assert.doesNotMatch(js, /maxLength|minimum|maximum/);
  assert.match(js, /"additionalProperties":false/);
});

test('aliases móveis e nomes sem versão são recusados', () => {
  const recusa = (provedor: any, modelo: string, fixadoConfirmado?: boolean) =>
    motivoRecusaModelo({ provedor, modelo, fixadoConfirmado });
  assert.ok(recusa('gemini', 'gemini-flash-latest'));
  assert.ok(recusa('gemini', 'gemini-flash-lite-latest'));
  assert.equal(recusa('gemini', 'gemini-3.5-flash'), null, 'nome estável é fixo segundo a documentação');
  assert.equal(recusa('gemini', 'gemini-3.5-flash-lite'), null);
  assert.ok(recusa('gemini', 'gemini-2.0-flash'), 'antes da 2.5 o nome sem sufixo era alias');
  assert.equal(recusa('gemini', 'gemini-2.0-flash-001'), null);
  assert.ok(recusa('gemini', 'gemini-3-flash-preview'), 'prévia exige confirmação explícita');
  assert.equal(recusa('gemini', 'gemini-3-flash-preview', true), null);
  assert.ok(recusa('openai', 'gpt-4o'));
  assert.ok(recusa('openai', 'chatgpt-4o-latest'));
  assert.equal(recusa('openai', 'gpt-4o-2024-08-06'), null);
  assert.ok(recusa('anthropic', 'claude-3-5-sonnet-latest'));
  assert.ok(recusa('anthropic', 'claude-haiku-4-5'));
  assert.equal(recusa('anthropic', 'claude-haiku-4-5-20251001'), null);
  assert.equal(recusa('anthropic', 'claude-sonnet-5'), null);
  assert.ok(recusa('compativel-openai', 'llama3.1'));
  assert.ok(recusa('compativel-openai', 'llama3.1:latest'));
  assert.equal(recusa('compativel-openai', 'llama3.1:8b-instruct-q4_K_M'), null);
  assert.equal(recusa('simulado', 'simulado-v1'), null);
});

test('criarProvedor recusa alias móvel antes de qualquer chamada', async () => {
  await assert.rejects(criarProvedor({ provedor: 'gemini', modelo: 'gemini-flash-latest' }), /alias móvel/);
});
