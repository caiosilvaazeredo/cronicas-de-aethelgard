/// <reference types="vite/client" />
import Phaser from 'phaser';

/**
 * Idiomas do jogo. O texto de origem é o português do Brasil: cada idioma é um dicionário
 * "texto em português" → "tradução" (src/i18n/locales/<id>.json, gerado por scripts/i18n).
 * Todo texto desenhado passa por tr() automaticamente (gancho em Text.setText), então as cenas
 * continuam escritas em português. Textos montados com `${...}` viram moldes com {0}, {1}...
 */
export interface Lang {
  id: string;
  /** Nome do idioma escrito nele mesmo (sem bandeira: idioma não é país). */
  name: string;
  /** Fonte dos títulos e do texto corrido (arquivo em public/fonts) quando a padrão não cobre o alfabeto. */
  display?: string;
  body?: string;
}

export const LANGS: Lang[] = [
  { id: 'pt-BR', name: 'Português (Brasil)' },
  { id: 'pt-PT', name: 'Português (Portugal)' },
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español', display: 'lilita-one.ttf' },
  { id: 'fr', name: 'Français', display: 'lilita-one.ttf' },
  { id: 'de', name: 'Deutsch', display: 'lilita-one.ttf' },
  { id: 'it', name: 'Italiano', display: 'lilita-one.ttf' },
  { id: 'pl', name: 'Polski', display: 'rubik-900.ttf', body: 'rubik-600.ttf' },
  { id: 'tr', name: 'Türkçe', display: 'rubik-900.ttf', body: 'rubik-600.ttf' },
  { id: 'ru', name: 'Русский', display: 'rubik-900.ttf', body: 'rubik-600.ttf' },
  // Japonês e chinês usam a fonte do próprio aparelho (as fontes do jogo não têm esses alfabetos).
  { id: 'ja', name: '日本語', display: '', body: '' },
  { id: 'zh-CN', name: '简体中文', display: '', body: '' },
];

const KEY = 'skullshift.lang';
let current = 'pt-BR';
let dict: Record<string, string> = {};
let lower: Record<string, string> = {};
let molds: Array<[RegExp, string]> = [];
const cache = new Map<string, string>();
/** Textos que apareceram na tela sem tradução (para o verificador de scripts/i18n). */
export const missing = new Set<string>();

function detect(): string {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.some((l) => l.id === q)) return q;
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS.some((l) => l.id === saved)) return saved;
  } catch {
    /* sem armazenamento */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'pt-BR';
  const exact = LANGS.find((l) => l.id.toLowerCase() === nav.toLowerCase());
  if (exact) return exact.id;
  const base = nav.split('-')[0].toLowerCase();
  if (base === 'pt') return 'pt-BR';
  if (base === 'zh') return 'zh-CN';
  return LANGS.find((l) => l.id.toLowerCase() === base)?.id ?? 'en';
}

export const lang = (): string => current;
export const langInfo = (): Lang => LANGS.find((l) => l.id === current) ?? LANGS[0];

/** Troca o idioma: grava e recarrega (as fontes e o dicionário entram no carregamento). */
export function setLang(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* sem armazenamento */
  }
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  location.href = u.toString();
  if (location.href === u.toString()) location.reload();
}

const loaders = import.meta.glob('./locales/*.json') as Record<string, () => Promise<{ default: Record<string, string> }>>;

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Marca um Text que recebe texto já traduzido aos poucos (efeito de máquina de escrever). */
/** Traduz um modelo com {0}, {1}... e preenche (para textos curtos que os moldes não pegam). */
export function trf(template: string, ...args: Array<string | number>): string {
  return tr(template).replace(/\{(\d+)\}/g, (_, k) => String(args[Number(k)] ?? ''));
}

export function noTr<T extends Phaser.GameObjects.Text>(t: T): T {
  (t as T & { __noTr?: boolean }).__noTr = true;
  return t;
}

/** Carrega o dicionário do idioma escolhido (antes do jogo começar). */
export async function initI18n(): Promise<void> {
  current = detect();
  document.documentElement.lang = current;
  if (current === 'pt-BR') return;
  try {
    const mod = await loaders[`./locales/${current}.json`]?.();
    dict = mod?.default ?? {};
    // O que ainda não foi traduzido neste idioma aparece em inglês (e não em português).
    if (current !== 'en' && current !== 'pt-PT') {
      const en = await loaders['./locales/en.json']?.();
      dict = { ...(en?.default ?? {}), ...dict };
    }
  } catch {
    dict = {};
  }
  lower = {};
  const list: Array<[RegExp, string, number]> = [];
  for (const [pt, t] of Object.entries(dict)) {
    lower[pt.toLowerCase()] = t;
    if (!/\{\d+\}/.test(pt)) continue;
    const literal = pt.replace(/\{\d+\}/g, '');
    if (literal.replace(/[^\p{L}]/gu, '').length < 2) continue;
    const order: number[] = [];
    const src = pt
      .split(/(\{\d+\})/)
      .map((part) => {
        const m = /^\{(\d+)\}$/.exec(part);
        if (!m) return esc(part);
        order.push(Number(m[1]));
        return '([\\s\\S]+?)';
      })
      .join('');
    // A tradução usa {0}, {1}... na numeração do molde; guardamos a ordem dos grupos.
    list.push([new RegExp(`^${src}$`), t.replace(/\{(\d+)\}/g, (_, k) => `{${order.indexOf(Number(k))}}`), literal.length]);
  }
  list.sort((a, b) => b[2] - a[2]);
  molds = list.map(([r, t]) => [r, t]);
}

function upper(s: string): string {
  return s.toLocaleUpperCase(current);
}

function lookup(s: string): string | undefined {
  const d = dict[s];
  if (d !== undefined) return d;
  const l = lower[s.toLowerCase()];
  if (l !== undefined) return s === s.toUpperCase() && s !== s.toLowerCase() ? upper(l) : l;
  return undefined;
}

function one(s: string, depth: number): string | undefined {
  const lead = /^\s*/.exec(s)![0];
  const trail = /\s*$/.exec(s)![0];
  const core = s.slice(lead.length, s.length - trail.length);
  if (!core) return undefined;
  const hit = lookup(core);
  if (hit !== undefined) return lead + hit + trail;
  // Entre aspas ("Eu te seguro."): traduz o que está dentro.
  const q = /^(["“«「])([\s\S]+)(["”»」])$/u.exec(core);
  if (q) {
    const mid = lookup(q[2]);
    if (mid !== undefined) return lead + (current === 'ja' ? '「' + mid + '」' : q[1] + mid + q[3]) + trail;
  }
  // Com enfeites nas pontas (setas, cadeado, estrela...): traduz só o miolo.
  const deco = /^([^\p{L}\p{N}"'(¿¡{]+)?([\s\S]*?)([^\p{L}\p{N}.!?…)"'%}]+)?$/u.exec(core);
  if (deco && (deco[1] || deco[3]) && deco[2]) {
    const mid = lookup(deco[2]);
    if (mid !== undefined) return lead + (deco[1] ?? '') + mid + (deco[3] ?? '') + trail;
  }
  if (depth < 3)
    for (const [re, t] of molds) {
      const m = re.exec(core);
      if (!m) continue;
      const allUp = core === core.toUpperCase();
      const out = t.replace(/\{(\d+)\}/g, (_, k) => tr(m[Number(k) + 1] ?? '', depth + 1));
      return lead + (allUp ? upper(out) : out) + trail;
    }
  return undefined;
}

/** Traduz um texto do jogo (português → idioma atual). Sem tradução, devolve o original. */
export function tr(s: string, depth = 0): string {
  if (current === 'pt-BR' || !s || !/\p{L}{2,}/u.test(s)) return s;
  const c = cache.get(s);
  if (c !== undefined) return c;
  let out: string | undefined = dict[s] ?? one(s, depth);
  if (out === undefined && s.includes('\n')) {
    let any = false;
    const lines = s.split('\n').map((line) => {
      const t = one(line, depth);
      if (t !== undefined) any = true;
      return t ?? line;
    });
    if (any) out = lines.join('\n');
  }
  if (out === undefined) {
    // Textos montados por partes ("Área 3 — Nome", "A · B", "Rótulo: valor"): traduz cada pedaço.
    // Primeiro em pedaços grandes (· — e quebras de linha); só o que não sair inteiro é cortado
    // de novo em ": " e ", " (assim uma frase com vírgula, ao lado de "· 5/6 fases", continua inteira).
    const piece = (part: string): string | undefined => {
      const num = /^(.*\S)(\s+\d+)$/.exec(part);
      const pre = /^(\d+\s+)(\S.*)$/.exec(part);
      if (pre) {
        const tp = one(pre[2], depth);
        if (tp !== undefined) return pre[1] + tp;
      }
      const whole = one(part, depth);
      if (whole !== undefined) return whole;
      const t = num ? one(num[1], depth) : undefined;
      return t === undefined ? undefined : t + num![2];
    };
    // Cada nível só corta o que o anterior não traduziu inteiro.
    const LEVELS_SPLIT = [/( — | · |\n)/, /(: )/, /(, )/];
    let any = false;
    const split = (text: string, lv: number): string => {
      if (lv > 0) {
        const t = piece(text);
        if (t !== undefined) {
          any = true;
          return t;
        }
      }
      if (lv >= LEVELS_SPLIT.length) {
        if (current !== 'pt-PT' && /\p{L}{3,}/u.test(text) && missing.size < 5000) missing.add(text);
        return text;
      }
      const parts = text.split(LEVELS_SPLIT[lv]);
      if (parts.length === 1) return split(text, lv + 1);
      return parts.map((part, i) => (i % 2 ? part : split(part, lv + 1))).join('');
    };
    if (/( — | · |\n|: |, )/.test(s) || /\s\d+$/.test(s) || /^\d+\s/.test(s)) {
      const joined = split(s, 0);
      if (any) out = joined;
    }
  }
  if (out === undefined) {
    if (current !== 'pt-PT' && depth === 0 && missing.size < 5000) missing.add(s);
    out = s;
  }
  if (cache.size > 4000) cache.clear();
  cache.set(s, out);
  return out;
}

/**
 * Gancho: todo Text do Phaser traduz o que recebe. Se a tradução ficar mais larga que o original
 * (alemão, russo...), a fonte encolhe para caber no mesmo espaço; texto com quebra de linha só quebra.
 */
/** Japonês e chinês não separam palavras com espaço: quebra a linha por caractere, sem deixar pontuação no começo. */
const NO_START = /^[、。，．・：；？！」』）〕】〉》”’…ー々ゃゅょっぁぃぅぇぉャュョッァィゥェォ,.!?:;)\]}]/u;
function cjkWrap(text: string, obj: Phaser.GameObjects.Text): string[] {
  const max = (obj.style as unknown as { wordWrapWidth: number }).wordWrapWidth;
  const ctx = obj.context;
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of [...para]) {
      if (line && ctx.measureText(line + ch).width > max && !NO_START.test(ch)) {
        out.push(line);
        line = ch === ' ' ? '' : ch;
      } else line += ch;
    }
    out.push(line);
  }
  return out;
}
let CJK = false;

export function hookText(): void {
  if (current === 'pt-BR') return;
  CJK = current === 'ja' || current === 'zh-CN';
  const proto = Phaser.GameObjects.Text.prototype as unknown as { setText(v: string | string[]): Phaser.GameObjects.Text; __i18n?: boolean };
  if (proto.__i18n) return;
  proto.__i18n = true;
  const orig = proto.setText;
  proto.setText = function (this: Phaser.GameObjects.Text, v: string | string[]) {
    const self = this as Phaser.GameObjects.Text & { __base?: number; __noTr?: boolean };
    const st = this.style as Phaser.GameObjects.TextStyle & { wordWrapWidth?: number | null; wordWrapCallback?: unknown; wordWrapCallbackScope?: unknown };
    if (CJK && st.wordWrapWidth && !st.wordWrapCallback) {
      st.wordWrapCallback = cjkWrap;
      st.wordWrapCallbackScope = null;
    }
    if (self.__noTr) return orig.call(this, v);
    const src = Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : String(v ?? '');
    const out = tr(src);
    if (out === src) {
      if (self.__base) {
        this.setFontSize(self.__base);
        self.__base = undefined;
      }
      return orig.call(this, v);
    }
    const style = this.style as Phaser.GameObjects.TextStyle & { wordWrapWidth?: number | null };
    if (style.wordWrapWidth) return orig.call(this, out);
    const base = self.__base ?? (parseFloat(String(style.fontSize)) || 16);
    if (self.__base) this.setFontSize(base);
    orig.call(this, src);
    const w0 = this.width;
    orig.call(this, out);
    const w1 = this.width;
    if (w0 > 0 && w1 > w0 * 1.12) {
      self.__base = base;
      this.setFontSize(Math.max(base * 0.58, (base * w0 * 1.12) / w1));
    } else self.__base = undefined;
    return this;
  };
}
