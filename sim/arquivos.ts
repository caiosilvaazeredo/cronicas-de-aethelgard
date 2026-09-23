import { execSync } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import type { ConfigMundo } from '../core/mundo/tipos';

export async function existe(caminho: string): Promise<boolean> {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grava os arquivos da sessão num diretório temporário e o renomeia no fim.
 * Uma sessão só existe no disco se estiver completa: é isso que torna a
 * campanha retomável sem duplicar nem deixar sessões pela metade.
 */
export async function gravarSessao(diretorio: string, arquivos: Record<string, string>): Promise<void> {
  const tmp = `${diretorio}.tmp-${process.pid}`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    await writeFile(join(tmp, nome), conteudo);
  }
  await rm(diretorio, { recursive: true, force: true });
  await mkdir(dirname(diretorio), { recursive: true });
  await rename(tmp, diretorio);
}

export async function sessaoConcluida(diretorio: string): Promise<boolean> {
  return existe(join(diretorio, 'resumo.json'));
}

export async function carregarMundo(id: string, raiz = process.cwd()): Promise<ConfigMundo> {
  const caminho = id.endsWith('.json') ? id : join(raiz, 'mundos', `${id}.json`);
  return JSON.parse(await readFile(caminho, 'utf8')) as ConfigMundo;
}

export function infoGit(): { commit: string | null; modificado: boolean | null } {
  try {
    const commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const status = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return { commit, modificado: status.length > 0 };
  } catch {
    return { commit: null, modificado: null };
  }
}

export function versoesDependencias(): Record<string, string | null> {
  const require = createRequire(import.meta.url);
  const versao = (pacote: string) => {
    try {
      // alguns pacotes não exportam package.json; lê direto do node_modules
      const caminho = require.resolve(pacote);
      const idx = caminho.lastIndexOf(`node_modules/${pacote}`);
      const pkg = join(caminho.slice(0, idx), 'node_modules', pacote, 'package.json');
      return (require(pkg) as { version: string }).version;
    } catch {
      return null;
    }
  };
  return {
    node: process.version,
    zod: versao('zod'),
    '@google/genai': versao('@google/genai'),
    openai: versao('openai'),
    '@anthropic-ai/sdk': versao('@anthropic-ai/sdk'),
  };
}
