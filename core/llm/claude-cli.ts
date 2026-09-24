/**
 * Transporte pelo CLI do Claude Code (`claude -p`), para ambientes que têm o
 * CLI autenticado mas não uma ANTHROPIC_API_KEY. Só roda em Node.
 *
 * Isolamento do experimento: o prompt de sistema do Claude Code é SUBSTITUÍDO
 * pelo do simulador (--system-prompt), todas as ferramentas são desligadas
 * (--tools ""), configurações e MCP do usuário são ignorados e a sessão não é
 * persistida. A saída estruturada usa --json-schema e é validada com zod
 * depois, como nos demais provedores.
 *
 * Limitações registradas em parametrosEfetivos de cada chamada: o CLI não
 * aceita temperatura nem semente, e cada chamada inicia um processo (mais
 * lenta que a API direta). O custo informado pelo CLI é usado como custo da
 * chamada.
 */

import { spawn } from 'node:child_process';
import { ErroProvedor, type Transporte } from './provedor';

export interface OpcoesClaudeCli {
  executavel?: string;
  /** esforço de raciocínio (low, medium, high...), se o modelo aceitar */
  esforco?: string;
  timeoutMs?: number;
}

function executar(cmd: string, args: string[], entrada: string, timeoutMs: number): Promise<{ saida: string; erro: string; codigo: number | null }> {
  return new Promise((resolve, reject) => {
    const filho = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: process.env.TMPDIR || '/tmp' });
    let saida = '';
    let erro = '';
    const timer = setTimeout(() => {
      filho.kill('SIGKILL');
      reject(new ErroProvedor(`claude -p excedeu ${timeoutMs} ms`, 503));
    }, timeoutMs);
    filho.stdout.on('data', (d) => (saida += d));
    filho.stderr.on('data', (d) => (erro += d));
    filho.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    filho.on('close', (codigo) => {
      clearTimeout(timer);
      resolve({ saida, erro, codigo });
    });
    filho.stdin.end(entrada);
  });
}

/**
 * Quando o plano atinge o limite de uso, o CLI responde "You've hit your
 * session limit · resets 2pm (UTC)". Devolve quantos ms faltam para o reset
 * (com 1 min de folga), ou null se a mensagem não for de limite.
 */
export function esperaAteReset(texto: string, agora = new Date()): number | null {
  if (!/hit your .*limit/i.test(texto)) return null;
  const m = texto.match(/resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return 30 * 60_000;
  let hora = Number(m[1]) % 12;
  if ((m[3] ?? '').toLowerCase() === 'pm') hora += 12;
  if (!m[3] && Number(m[1]) >= 12) hora = Number(m[1]);
  const alvo = new Date(agora);
  alvo.setUTCHours(hora, Number(m[2] ?? 0), 0, 0);
  if (alvo.getTime() <= agora.getTime()) alvo.setUTCDate(alvo.getUTCDate() + 1);
  return alvo.getTime() - agora.getTime() + 60_000;
}

export function transporteClaudeCli(modelo: string, opcoes: OpcoesClaudeCli = {}): Transporte {
  const executavel = opcoes.executavel ?? process.env.CLAUDE_CLI ?? 'claude';
  const timeoutMs = opcoes.timeoutMs ?? 300_000;
  const esforco = opcoes.esforco ?? process.env.CLAUDE_CLI_ESFORCO;

  const umaVez = async (r: Parameters<Transporte>[0]) => {
    const args = [
      '-p',
      '--output-format', 'json',
      '--model', modelo,
      '--system-prompt', r.sistema,
      '--tools', '',
      '--strict-mcp-config',
      '--setting-sources', '',
      '--no-session-persistence',
      ...(esforco ? ['--effort', esforco] : []),
      ...(r.jsonSchema ? ['--json-schema', JSON.stringify(r.jsonSchema)] : []),
    ];
    // o prompt do usuário vai pela entrada padrão, sem limite de tamanho de argv
    const { saida, erro, codigo } = await executar(executavel, args, r.usuario, timeoutMs);

    let d: any;
    try {
      d = JSON.parse(saida);
    } catch {
      throw new ErroProvedor(`claude -p não devolveu JSON (código ${codigo}): ${(erro || saida).slice(0, 500)}`, codigo === 0 ? 500 : 503);
    }
    if (d.is_error) {
      const texto = String(d.result ?? d.error ?? 'erro');
      const status = /rate|limit|overload|529|429/i.test(texto) ? 429 : 500;
      throw new ErroProvedor(`claude -p: ${texto.slice(0, 500)}`, status, d);
    }

    const modelos = Object.keys(d.modelUsage ?? {});
    const texto = d.structured_output !== undefined && d.structured_output !== null
      ? JSON.stringify(d.structured_output)
      : String(d.result ?? '');
    const u = d.usage ?? {};
    return {
      texto,
      modeloEfetivo: modelos.join(',') || modelo,
      tokensEntrada: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
      tokensSaida: u.output_tokens ?? 0,
      bruto: d,
      custoUsd: typeof d.total_cost_usd === 'number' ? d.total_cost_usd : undefined,
      parametrosEfetivos: {
        via: 'claude-cli',
        temperatura: null,
        temperaturaOmitida: true,
        semente: null,
        esforco: esforco ?? null,
        numTurns: d.num_turns ?? null,
      },
    };
  };

  // Limite de uso do plano: espera o reset e repete (até 3 vezes), em vez
  // de acumular erros e derrubar a sessão.
  return async (r) => {
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await umaVez(r);
      } catch (e) {
        const espera = esperaAteReset((e as Error).message);
        if (espera === null || tentativa >= 3) throw e;
        process.stderr.write(`claude-cli: limite de uso atingido; aguardando ${Math.round(espera / 60000)} min até o reset\n`);
        await new Promise((ok) => setTimeout(ok, espera));
      }
    }
  };
}
