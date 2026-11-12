/**
 * Nomes dos jogadores (como na seleção do FIFA): o padrão ("Player 1"), o nome da conta Steam
 * (quando o jogo roda pela Steam) ou um nome novo temporário, que vale só nesta sessão.
 *
 * Na versão Steam (Electron + Steamworks), o processo do jogo expõe o nome do usuário em
 * `window.skullshiftSteam.personaName` (ou via greenworks/steamworks.js). No navegador não há
 * conta Steam, e a opção simplesmente não aparece.
 */
export type NameMode = 'default' | 'steam' | 'temp';

const MAX = 12;
const chosen: Array<{ mode: NameMode; temp: string }> = [
  { mode: 'default', temp: '' },
  { mode: 'default', temp: '' },
];

interface SteamWindow {
  skullshiftSteam?: { personaName?: string };
  steamworks?: { localplayer?: { getName?: () => string } };
  greenworks?: { getSteamId?: () => { screenName?: string } };
}

/** Nome da conta Steam, se o jogo estiver rodando pela Steam. */
export function steamName(): string | null {
  const w = window as unknown as SteamWindow;
  try {
    const n = w.skullshiftSteam?.personaName ?? w.steamworks?.localplayer?.getName?.() ?? w.greenworks?.getSteamId?.().screenName;
    return n ? n.slice(0, MAX) : null;
  } catch {
    return null;
  }
}

export const defaultName = (i: number) => `Player ${i + 1}`;

/** Opções disponíveis para o jogador i, na ordem do ◀ ▶. */
export function nameModes(): NameMode[] {
  return steamName() ? ['default', 'steam', 'temp'] : ['default', 'temp'];
}

export function nameMode(i: number): NameMode {
  return chosen[i].mode;
}

export function setNameMode(i: number, mode: NameMode, temp?: string): void {
  chosen[i] = { mode, temp: temp !== undefined ? temp.trim().slice(0, MAX) : chosen[i].temp };
}

export function tempName(i: number): string {
  return chosen[i].temp;
}

/** Nome que aparece no HUD, na etiqueta da vitória etc. */
export function playerName(i: number): string {
  const c = chosen[i];
  if (c.mode === 'steam') return steamName() ?? defaultName(i);
  if (c.mode === 'temp' && c.temp) return c.temp;
  return defaultName(i);
}

/**
 * Caixinha de texto por cima do jogo (abre o teclado do celular). Resolve com o nome
 * digitado, ou null se cancelar.
 */
export function askName(title: string, initial: string): Promise<string | null> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(7,4,12,.6);padding:16px;';
    const box = document.createElement('div');
    box.style.cssText =
      'background:#10223a;border:4px solid #fff7dc;border-radius:16px;padding:18px;width:min(420px,100%);display:flex;flex-direction:column;gap:12px;font-family:"Matcha Style","Anak Manja PT",sans-serif;color:#fff7dc;';
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-family:"Anak Manja PT",sans-serif;font-size:22px;color:#ffe066;';
    const input = document.createElement('input');
    input.value = initial;
    input.maxLength = MAX;
    input.placeholder = 'Seu nome';
    input.style.cssText = 'font-size:22px;padding:10px 12px;border-radius:10px;border:3px solid #1d1a2b;background:#fff7dc;color:#10223a;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    const mk = (label: string, bg: string) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `font-family:"Anak Manja PT",sans-serif;font-size:18px;padding:8px 16px;border-radius:10px;border:3px solid #1d1a2b;background:${bg};color:#10223a;cursor:pointer;`;
      return b;
    };
    const cancel = mk('CANCELAR', '#e7eef2');
    const ok = mk('OK', '#ffe066');
    row.append(cancel, ok);
    box.append(h, input, row);
    wrap.append(box);
    document.body.append(wrap);
    const done = (v: string | null) => {
      wrap.remove();
      resolve(v && v.trim() ? v.trim().slice(0, MAX) : null);
    };
    ok.onclick = () => done(input.value);
    cancel.onclick = () => done(null);
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(input.value);
      if (e.key === 'Escape') done(null);
    };
    input.onkeyup = (e) => e.stopPropagation();
    setTimeout(() => input.focus(), 30);
  });
}
