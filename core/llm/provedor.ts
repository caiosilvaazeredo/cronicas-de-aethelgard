/**
 * Camada multimodelo: interface comum a todos os provedores de IA.
 *
 * Cada provedor concreto implementa apenas um `Transporte` (uma chamada crua,
 * sem validação). A validação com zod, as novas tentativas com a mensagem de
 * erro e a espera exponencial em 429/503 ficam em `ProvedorEstruturado`, para
 * que todos os modelos sejam tratados exatamente da mesma forma: a taxa de
 * falha de estrutura por modelo é um dado do experimento.
 */

import { z } from 'zod';

export type NomeProvedor = 'gemini' | 'openai' | 'anthropic' | 'compativel-openai' | 'simulado';

export interface ChamadaLLM {
  sistema: string;
  usuario: string;
  esquema?: z.ZodType; // quando a resposta precisa ser estruturada
  temperatura: number;
  semente?: number; // usado quando o provedor aceita
  maxTokens: number;
  /**
   * Metadados que não entram no prompt. Servem ao registro (qual tarefa, qual
   * dia) e ao provedor simulado, que precisa saber o que gerar sem entender
   * linguagem natural. Provedores reais ignoram este campo.
   */
  meta?: MetaChamada;
}

export interface MetaChamada {
  tarefa: string;
  papel?: string;
  dia?: number;
  dadosSimulacao?: unknown;
}

export interface RespostaLLM {
  texto: string;
  json?: unknown; // já validado contra o esquema, se houver
  modeloEfetivo: string; // o identificador que o provedor informou ter usado
  tokensEntrada: number;
  tokensSaida: number;
  latenciaMs: number;
  tentativas: number; // quantas chamadas foram necessárias até um JSON válido
  bruto: unknown; // resposta crua do provedor, para auditoria
  /** preenchido quando o esquema não foi satisfeito depois de todas as tentativas */
  falhaEstrutura?: string;
  /** parâmetros efetivamente enviados (ex.: temperatura omitida por não ser aceita) */
  parametrosEfetivos?: Record<string, unknown>;
  /** true quando a resposta veio do cache e não custou nada */
  doCache?: boolean;
}

export interface ProvedorLLM {
  nome: string; // 'gemini' | 'openai' | 'anthropic' | 'compativel-openai' | 'simulado'
  modelo: string;
  chamar(c: ChamadaLLM): Promise<RespostaLLM>;
}

/** Uma chamada crua ao provedor, já com o esquema convertido para JSON Schema. */
export interface RequisicaoTransporte {
  sistema: string;
  usuario: string;
  jsonSchema?: Record<string, unknown>;
  temperatura: number;
  semente?: number;
  maxTokens: number;
  meta?: MetaChamada;
}

export interface SaidaTransporte {
  texto: string;
  modeloEfetivo: string;
  tokensEntrada: number;
  tokensSaida: number;
  bruto: unknown;
  parametrosEfetivos?: Record<string, unknown>;
}

export type Transporte = (r: RequisicaoTransporte) => Promise<SaidaTransporte>;

/** Erro de provedor com status HTTP, para decidir se vale esperar e repetir. */
export class ErroProvedor extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly bruto?: unknown
  ) {
    super(message);
    this.name = 'ErroProvedor';
  }
}

export function statusDoErro(e: unknown): number | null {
  if (e instanceof ErroProvedor) return e.status;
  const qualquer = e as { status?: unknown; code?: unknown } | null;
  if (qualquer && typeof qualquer.status === 'number') return qualquer.status;
  if (qualquer && typeof qualquer.code === 'number') return qualquer.code;
  return null;
}

export function ehErroTransitorio(e: unknown): boolean {
  const s = statusDoErro(e);
  return s === 429 || s === 503 || s === 502 || s === 500 || s === 529;
}

export interface OpcoesEstruturado {
  /** novas tentativas quando o JSON não valida (o manual fixa 2) */
  retentativasEsquema?: number;
  /** tentativas extras em erro transitório (429/503) */
  retentativasRede?: number;
  /** espera base em ms para o backoff exponencial */
  esperaBaseMs?: number;
  /** função de espera, substituível nos testes */
  esperar?: (ms: number) => Promise<void>;
  /** relógio, substituível para testes de determinismo */
  agora?: () => number;
  /** chamado antes de cada chamada de rede (limite de taxa) */
  antesDeChamar?: () => Promise<void>;
}

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Extrai o primeiro objeto JSON de um texto (modelos às vezes cercam com prosa ou ```). */
export function extrairJson(texto: string): unknown {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(limpo.slice(inicio, fim + 1));
    }
    throw new Error('A resposta não contém um objeto JSON.');
  }
}

// Palavras-chave que nem todo modo de saída estruturada aceita (o modo
// estrito da OpenAI e o da Anthropic recusam parte delas). São removidas do
// esquema enviado a TODOS os provedores, para que nenhum modelo receba um
// esquema mais informativo que outro; a restrição continua sendo verificada
// pelo zod, e a violação conta como falha de estrutura.
const PALAVRAS_NAO_PORTAVEIS = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'pattern',
  'format',
]);

function limparEsquema(no: unknown): unknown {
  if (Array.isArray(no)) return no.map(limparEsquema);
  if (!no || typeof no !== 'object') return no;
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(no as Record<string, unknown>)) {
    if (PALAVRAS_NAO_PORTAVEIS.has(chave)) continue;
    saida[chave] = limparEsquema(valor);
  }
  return saida;
}

export function esquemaParaJsonSchema(esquema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(esquema, { target: 'draft-7' }) as Record<string, unknown>;
  delete js.$schema;
  return limparEsquema(js) as Record<string, unknown>;
}

function descreverErroZod(e: z.ZodError): string {
  return e.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('\n');
}

export function mensagemDeCorrecao(erro: string): string {
  return `\n\nSua resposta anterior não seguiu o esquema JSON exigido. Erros de validação:\n${erro}\nResponda novamente apenas com um objeto JSON válido conforme o esquema.`;
}

/**
 * Envolve um transporte cru com: conversão de esquema, validação zod,
 * reenvio com a mensagem de erro (até `retentativasEsquema` vezes) e espera
 * exponencial em 429/503. Nunca lança por falha de estrutura: devolve a
 * resposta com `falhaEstrutura` preenchido e deixa a sessão seguir.
 */
export class ProvedorEstruturado implements ProvedorLLM {
  private readonly retentativasEsquema: number;
  private readonly retentativasRede: number;
  private readonly esperaBaseMs: number;
  private readonly esperar: (ms: number) => Promise<void>;
  private readonly agora: () => number;
  private readonly antesDeChamar?: () => Promise<void>;

  constructor(
    public readonly nome: string,
    public readonly modelo: string,
    private readonly transporte: Transporte,
    opcoes: OpcoesEstruturado = {}
  ) {
    this.retentativasEsquema = opcoes.retentativasEsquema ?? 2;
    this.retentativasRede = opcoes.retentativasRede ?? 6;
    this.esperaBaseMs = opcoes.esperaBaseMs ?? 2000;
    this.esperar = opcoes.esperar ?? esperarPadrao;
    this.agora = opcoes.agora ?? Date.now;
    this.antesDeChamar = opcoes.antesDeChamar;
  }

  private async chamarComEspera(r: RequisicaoTransporte): Promise<SaidaTransporte> {
    let tentativa = 0;
    for (;;) {
      if (this.antesDeChamar) await this.antesDeChamar();
      try {
        return await this.transporte(r);
      } catch (e) {
        if (!ehErroTransitorio(e) || tentativa >= this.retentativasRede) throw e;
        const espera = this.esperaBaseMs * 2 ** tentativa;
        tentativa += 1;
        await this.esperar(espera);
      }
    }
  }

  async chamar(c: ChamadaLLM): Promise<RespostaLLM> {
    const inicio = this.agora();
    const jsonSchema = c.esquema ? esquemaParaJsonSchema(c.esquema) : undefined;
    const brutos: unknown[] = [];
    let tokensEntrada = 0;
    let tokensSaida = 0;
    let usuario = c.usuario;
    let ultima: SaidaTransporte | null = null;
    let ultimoErro = '';
    const maxTentativas = c.esquema ? 1 + this.retentativasEsquema : 1;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      const saida = await this.chamarComEspera({
        sistema: c.sistema,
        usuario,
        jsonSchema,
        temperatura: c.temperatura,
        semente: c.semente,
        maxTokens: c.maxTokens,
        meta: c.meta ? { ...c.meta, dadosSimulacao: { ...(c.meta.dadosSimulacao as object), tentativa } } : undefined,
      });
      ultima = saida;
      brutos.push(saida.bruto);
      tokensEntrada += saida.tokensEntrada;
      tokensSaida += saida.tokensSaida;

      const base = {
        texto: saida.texto,
        modeloEfetivo: saida.modeloEfetivo,
        tokensEntrada,
        tokensSaida,
        latenciaMs: this.agora() - inicio,
        tentativas: tentativa,
        bruto: brutos.length === 1 ? brutos[0] : brutos,
        parametrosEfetivos: saida.parametrosEfetivos,
      };

      if (!c.esquema) return base;

      let candidato: unknown;
      try {
        candidato = extrairJson(saida.texto);
      } catch (e) {
        ultimoErro = `- (raiz): JSON inválido (${(e as Error).message})`;
        usuario = c.usuario + mensagemDeCorrecao(ultimoErro);
        continue;
      }
      const validado = c.esquema.safeParse(candidato);
      if (validado.success) return { ...base, json: validado.data };
      ultimoErro = descreverErroZod(validado.error);
      usuario = c.usuario + mensagemDeCorrecao(ultimoErro);
    }

    return {
      texto: ultima?.texto ?? '',
      modeloEfetivo: ultima?.modeloEfetivo ?? this.modelo,
      tokensEntrada,
      tokensSaida,
      latenciaMs: this.agora() - inicio,
      tentativas: maxTentativas,
      bruto: brutos,
      parametrosEfetivos: ultima?.parametrosEfetivos,
      falhaEstrutura: ultimoErro || 'resposta inválida',
    };
  }
}
