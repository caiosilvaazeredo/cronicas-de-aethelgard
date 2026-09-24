/** Provedores claude-cli e ollama, testados sem rede com substitutos locais. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { z } from 'zod';
import { criarProvedor, motivoRecusaModelo } from '../core/llm/registro';
import { dirTemporario } from './auxiliares';

const Esq = z.object({ valor: z.number() });

test('claude-cli: substitui o prompt de sistema, desliga ferramentas e lê a saída estruturada', async () => {
  const dir = await dirTemporario('cli');
  const falso = join(dir, 'claude-falso');
  const registro = join(dir, 'args.json');
  await writeFile(
    falso,
    `#!/usr/bin/env node
let entrada = '';
process.stdin.on('data', (d) => (entrada += d));
process.stdin.on('end', () => {
  require('fs').writeFileSync(${JSON.stringify(registro)}, JSON.stringify({ args: process.argv.slice(2), entrada }));
  process.stdout.write(JSON.stringify({
    is_error: false, result: '', structured_output: { valor: 7 }, num_turns: 2, total_cost_usd: 0.012,
    usage: { input_tokens: 10, cache_read_input_tokens: 5, cache_creation_input_tokens: 0, output_tokens: 3 },
    modelUsage: { 'claude-sonnet-5': {} },
  }));
});
`
  );
  await chmod(falso, 0o755);
  process.env.CLAUDE_CLI = falso;
  try {
    const p = await criarProvedor({ provedor: 'claude-cli', modelo: 'claude-sonnet-5' });
    const r = await p.chamar({ sistema: 'SISTEMA', usuario: 'USUARIO', esquema: Esq, temperatura: 0.7, maxTokens: 100 });
    assert.deepEqual(r.json, { valor: 7 });
    assert.equal(r.modeloEfetivo, 'claude-sonnet-5');
    assert.equal(r.custoUsd, 0.012);
    assert.equal(r.tokensEntrada, 15);
    assert.equal(r.parametrosEfetivos?.temperaturaOmitida, true);

    const { args, entrada } = JSON.parse(await readFile(registro, 'utf8'));
    assert.equal(entrada, 'USUARIO');
    const valor = (flag: string) => args[args.indexOf(flag) + 1];
    assert.equal(valor('--system-prompt'), 'SISTEMA');
    assert.equal(valor('--tools'), '');
    assert.equal(valor('--model'), 'claude-sonnet-5');
    assert.ok(args.includes('--no-session-persistence'));
    assert.ok(args.includes('--strict-mcp-config'));
    assert.match(valor('--json-schema'), /"valor"/);
  } finally {
    delete process.env.CLAUDE_CLI;
  }
});

test('claude-cli segue as mesmas regras de identificador da Anthropic', () => {
  assert.equal(motivoRecusaModelo({ provedor: 'claude-cli', modelo: 'claude-sonnet-5' }), null);
  assert.ok(motivoRecusaModelo({ provedor: 'claude-cli', modelo: 'sonnet' }));
  assert.ok(motivoRecusaModelo({ provedor: 'claude-cli', modelo: 'claude-haiku-4-5' }));
});

test('ollama: registra o digest, envia semente e temperatura e recusa :latest', async () => {
  const recebidos: any[] = [];
  const servidor = createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/tags') {
        res.end(JSON.stringify({ models: [{ name: 'modelo-teste:3b', digest: 'abc123def456', size: 1 }] }));
        return;
      }
      recebidos.push(JSON.parse(corpo));
      res.end(
        JSON.stringify({
          id: 'x', object: 'chat.completion', created: 0, model: 'modelo-teste:3b',
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '{"valor": 3}' } }],
          usage: { prompt_tokens: 20, completion_tokens: 4, total_tokens: 24 },
        })
      );
    });
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  try {
    const p = await criarProvedor({ provedor: 'ollama', modelo: 'modelo-teste:3b' });
    const r = await p.chamar({ sistema: 's', usuario: 'u', esquema: Esq, temperatura: 0.3, semente: 42, maxTokens: 50 });
    assert.deepEqual(r.json, { valor: 3 });
    assert.equal(r.parametrosEfetivos?.digest, 'abc123def456');
    assert.equal(recebidos[0].seed, 42);
    assert.equal(recebidos[0].temperature, 0.3);
    assert.equal(recebidos[0].response_format.type, 'json_schema');

    const ausente = await criarProvedor({ provedor: 'ollama', modelo: 'outro:7b' }, { retentativasRede: 0 });
    await assert.rejects(ausente.chamar({ sistema: 's', usuario: 'u', temperatura: 0, maxTokens: 5 }), /ollama pull outro:7b/);
    assert.ok(motivoRecusaModelo({ provedor: 'ollama', modelo: 'llama3.1:latest' }));
    assert.ok(motivoRecusaModelo({ provedor: 'ollama', modelo: 'llama3.1' }));
  } finally {
    delete process.env.OLLAMA_BASE_URL;
    servidor.close();
  }
});
