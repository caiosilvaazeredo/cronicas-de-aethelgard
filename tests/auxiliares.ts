import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { CondicaoSessao } from '../core/experimento/condicoes';
import type { ConfigMundo } from '../core/mundo/tipos';
import { MODELO_SIMULADO } from '../core/llm/simulado';

export const SIMULADO = { provedor: 'simulado' as const, modelo: MODELO_SIMULADO };

export function mundo(id = 'porto-das-brumas'): ConfigMundo {
  return JSON.parse(readFileSync(join(process.cwd(), 'mundos', `${id}.json`), 'utf8'));
}

export function condicao(parcial: Partial<CondicaoSessao> = {}): CondicaoSessao {
  return {
    id: 'teste',
    celula: 'teste',
    repeticao: 1,
    mundo: 'porto-das-brumas',
    numAgentes: 6,
    estadoTramas: 'informa',
    jogador: 'investigador',
    controle: false,
    modelos: { agentes: SIMULADO, jogador: SIMULADO, curador: SIMULADO },
    dias: 10,
    temperatura: 0.7,
    semente: 1,
    limiarEstabilidade: 3,
    janelaDias: 3,
    ...parcial,
  };
}

export async function dirTemporario(prefixo: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `cidade-viva-${prefixo}-`));
}

export const lerJsonl = (texto: string) =>
  texto
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
