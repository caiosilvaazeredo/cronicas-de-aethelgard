import { lang, tr } from '../i18n';
import type { DeviceId } from './controls';

/**
 * Placas, falas e textos de abertura citam as ações pelo nome ("segure PULAR para voar"). Com
 * um controle definido (o do jogador 1 no modo história), o nome vira o botão daquele controle:
 * [ESPAÇO] no teclado, [A] no controle, [PULA] na tela de toque. Funciona no texto já traduzido:
 * para cada idioma, as palavras que as traduções usam para cada ação.
 */
type Act = 'jump' | 'attack' | 'guard' | 'pick';
const ACTS: Act[] = ['jump', 'attack', 'guard', 'pick'];

const WORDS: Record<string, Record<Act, string[]>> = {
  'pt-BR': { jump: ['PULAR'], attack: ['ATACAR'], guard: ['DEFESA', 'DEFENDER'], pick: ['PEGAR'] },
  'pt-PT': { jump: ['SALTAR', 'PULAR'], attack: ['ATACAR'], guard: ['DEFESA', 'DEFENDER'], pick: ['APANHAR', 'PEGAR'] },
  en: { jump: ['JUMP'], attack: ['ATTACK'], guard: ['GUARD'], pick: ['GRAB'] },
  es: { jump: ['SALTAR'], attack: ['ATACAR'], guard: ['DEFENSA'], pick: ['AGARRAR'] },
  fr: { jump: ['SAUTER'], attack: ['ATTAQUER'], guard: ['GARDE'], pick: ['PRENDRE'] },
  de: { jump: ['SPRINGEN'], attack: ['ANGRIFF'], guard: ['DECKUNG'], pick: ['NEHMEN'] },
  it: { jump: ['SALTA'], attack: ['ATTACCA'], guard: ['DIFESA'], pick: ['PRENDI'] },
  ja: { jump: ['「ジャンプ」', 'ジャンプ'], attack: ['「こうげき」', '「攻撃」', 'こうげき'], guard: ['「ガード」', 'ガード'], pick: ['「ひろう」', 'ひろう'] },
  'zh-CN': { jump: ['“跳跃”', '跳跃'], attack: ['“攻击”', '攻击'], guard: ['“防御”', '防御'], pick: ['“拾取”', '拾取'] },
  ru: { jump: ['ПРЫЖОК'], attack: ['АТАКА'], guard: ['ЗАЩИТА'], pick: ['ВЗЯТЬ'] },
  pl: { jump: ['SKOK'], attack: ['ATAK'], guard: ['GARDA'], pick: ['WEŹ'] },
  tr: { jump: ['ZIPLA'], attack: ['SALDIR'], guard: ['SAVUNMA'], pick: ['AL'] },
};

/** Botão de cada ação por controle (a tela de toque usa o texto dos próprios botões). */
const KEYS: Partial<Record<DeviceId, Record<Act, string>>> = {
  'kb-full': { jump: 'ESPAÇO', attack: 'F', guard: 'Q', pick: 'E' },
  'kb-left': { jump: 'ESPAÇO', attack: 'F', guard: 'Q', pick: 'E' },
  'kb-right': { jump: '↑', attack: 'ENTER', guard: 'SHIFT', pick: '.' },
  pad0: { jump: 'A', attack: 'X', guard: 'B', pick: 'Y' },
  pad1: { jump: 'A', attack: 'X', guard: 'B', pick: 'Y' },
  touch: { jump: 'PULA', attack: 'ATQ', guard: 'DEF', pick: 'PEGA' },
};

let active: DeviceId | undefined;

/** Controle que os textos devem citar (undefined: deixa o nome da ação, como no versus). */
export function setButtonDevice(d: DeviceId | undefined): void {
  active = d;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Troca o nome de cada ação pelo botão do controle em uso. Recebe e devolve texto já traduzido. */
export function buttonize(text: string): string {
  const keys = active ? KEYS[active] : undefined;
  if (!keys) return text;
  const words = WORDS[lang()] ?? WORDS['pt-BR'];
  const cjk = lang() === 'ja' || lang() === 'zh-CN';
  let out = text;
  for (const a of ACTS) {
    const label = `[${tr(keys[a])}]`;
    for (const w of words[a]) {
      // Letras coladas antes/depois: é outra palavra ("ATACARAM"); em japonês/chinês não há espaços.
      const re = cjk ? new RegExp(esc(w), 'g') : new RegExp(`(?<![\\p{L}])${esc(w)}(?![\\p{L}])`, 'gu');
      out = out.replace(re, label);
    }
  }
  return out;
}

/** Traduz e troca as ações pelos botões (para textos criados com noTr). */
export const say = (text: string): string => buttonize(tr(text));
