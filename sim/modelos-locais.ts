/**
 * Lista os modelos instalados no Ollama (OLLAMA_BASE_URL, padrão
 * http://localhost:11434), com o digest que vai para o registro das sessões,
 * e testa uma chamada estruturada curta em cada um (ou só em --modelo).
 *
 *   npm run modelos-locais
 *   npm run modelos-locais -- --modelo qwen2.5:1.5b
 */

import { z } from 'zod';
import { criarProvedor, motivoRecusaModelo } from '../core/llm/registro';
import { listarModelosOllama, urlOllama } from '../core/llm/ollama';
import { lerArgs, texto } from './args';

const Teste = z.object({ cidade: z.string(), numero: z.number() });

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const so = texto(args, 'modelo');
  const modelos = await listarModelosOllama();
  console.log(`Ollama em ${urlOllama()}: ${modelos.length} modelo(s)`);
  for (const m of modelos) {
    if (so && m.name !== so) continue;
    const motivo = motivoRecusaModelo({ provedor: 'ollama', modelo: m.name });
    console.log(`\n- ${m.name}  digest ${m.digest.slice(0, 12)}  ${(m.size / 1e9).toFixed(2)} GB`);
    if (motivo) {
      console.log(`  recusado pelo simulador: ${motivo}`);
      continue;
    }
    const p = await criarProvedor({ provedor: 'ollama', modelo: m.name });
    const r = await p.chamar({
      sistema: 'Responda apenas com JSON.',
      usuario: 'Dê o nome de uma cidade portuária e um número de 1 a 10, no formato {"cidade", "numero"}.',
      esquema: Teste,
      temperatura: 0,
      semente: 1,
      maxTokens: 200,
    });
    console.log(
      r.json
        ? `  ok em ${r.latenciaMs} ms, ${r.tentativas} tentativa(s): ${JSON.stringify(r.json)}`
        : `  falha de estrutura após ${r.tentativas} tentativas: ${r.falhaEstrutura}`
    );
  }
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
