import { Soundfont } from 'smplr';
import { audio, settings } from './settings';

/**
 * Trilha do jogo: só FLAUTA, VIOLÃO e HARPA, com amostras de instrumentos de verdade
 * (soundfont FluidR3_GM, em public/assets/sf) tocadas pela biblioteca `smplr`.
 *
 * Três "famílias" de arranjo, inspiradas no clima (não nas melodias) de Zelda:
 *  - 'storm'  (à la Song of Storms): valsa em menor; o violão faz "baixo-acorde-acorde"
 *             (oom-pah-pah), a flauta canta frases sincopadas e a harpa fecha cada frase.
 *  - 'gerudo' (à la Gerudo Valley): rasgueado flamenco no violão (batidas rápidas com acento),
 *             cadência andaluza (i–VII–VI–V), flauta ágil por cima e harpa arpejando.
 *  - 'calm'   (vales, memórias, conversas): violão dedilhado, harpa em arpejo lento e flauta longa.
 *
 * Cada fase tem a sua música (tom, andamento, progressão e melodia derivados do id da fase), mas a
 * troca NUNCA corta: a música é um relógio só. `playMusic` não reinicia nada — agenda a mudança
 * para o próximo início de compasso, o andamento desliza até o novo e a harmonia continua com os
 * mesmos instrumentos. Parece sempre a mesma música, mudando de humor.
 */

type Family = 'storm' | 'gerudo' | 'calm';

interface Style {
  family: Family;
  bpm: number;
  /** Tônica (nota MIDI do baixo do violão). */
  root: number;
  mode: number[];
  /** Graus (índice na escala) de cada compasso das seções A e B. */
  progA: number[];
  progB: number[];
  density: number;
  seed: number;
  /** Harpa: 0 (quase nada) a 1 (arpejo constante). */
  harp: number;
}

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

export type Track =
  | 'menu' | 'world' | 'mare' | 'pradaria' | 'lagoa' | 'teias' | 'forja' | 'bosque' | 'minas' | 'ceu' | 'reino'
  | 'centro' | 'boss' | 'final' | 'memory' | 'story' | 'versus' | 'flight';

// Cadência andaluza (i, VII, VI, V) em graus da escala menor harmônica / frígia dominante.
const ANDALUZ = [0, 6, 5, 4, 0, 6, 5, 4];

const STYLES: Record<Track, Style> = {
  menu: { family: 'storm', bpm: 112, root: 50, mode: DORIAN, progA: [0, 0, 3, 3, 0, 0, 4, 4], progB: [6, 6, 3, 3, 0, 5, 4, 4], density: 0.6, seed: 11, harp: 0.5 },
  world: { family: 'calm', bpm: 96, root: 48, mode: IONIAN, progA: [0, 3, 4, 0, 5, 3, 1, 4], progB: [5, 3, 0, 4, 5, 1, 3, 4], density: 0.5, seed: 23, harp: 0.8 },
  mare: { family: 'storm', bpm: 120, root: 50, mode: AEOLIAN, progA: [0, 0, 5, 6, 0, 0, 3, 4], progB: [3, 3, 0, 0, 5, 6, 4, 4], density: 0.62, seed: 37, harp: 0.4 },
  pradaria: { family: 'gerudo', bpm: 132, root: 47, mode: MIXO, progA: [0, 6, 3, 0, 0, 6, 4, 0], progB: [3, 3, 0, 0, 6, 6, 4, 4], density: 0.66, seed: 41, harp: 0.3 },
  lagoa: { family: 'calm', bpm: 84, root: 45, mode: DORIAN, progA: [0, 3, 0, 3, 6, 3, 4, 0], progB: [5, 3, 6, 0, 5, 3, 4, 4], density: 0.45, seed: 53, harp: 1 },
  teias: { family: 'storm', bpm: 104, root: 45, mode: HARMONIC, progA: [0, 0, 5, 4, 0, 3, 5, 4], progB: [3, 5, 1, 4, 3, 5, 4, 4], density: 0.5, seed: 67, harp: 0.6 },
  forja: { family: 'gerudo', bpm: 144, root: 45, mode: PHRYG_DOM, progA: ANDALUZ, progB: [0, 1, 0, 1, 6, 5, 4, 4], density: 0.68, seed: 71, harp: 0.3 },
  bosque: { family: 'storm', bpm: 126, root: 48, mode: LYDIAN, progA: [0, 1, 0, 1, 4, 3, 1, 4], progB: [3, 4, 2, 5, 3, 1, 4, 4], density: 0.64, seed: 83, harp: 0.5 },
  minas: { family: 'gerudo', bpm: 128, root: 45, mode: HARMONIC, progA: ANDALUZ, progB: [3, 3, 0, 0, 5, 5, 4, 4], density: 0.6, seed: 97, harp: 0.3 },
  ceu: { family: 'gerudo', bpm: 150, root: 47, mode: PHRYG_DOM, progA: [0, 1, 0, 6, 0, 1, 5, 4], progB: [3, 1, 6, 0, 3, 1, 4, 4], density: 0.68, seed: 101, harp: 0.4 },
  reino: { family: 'storm', bpm: 132, root: 47, mode: HARMONIC, progA: [0, 3, 4, 0, 5, 3, 4, 4], progB: [5, 1, 4, 0, 5, 3, 4, 4], density: 0.64, seed: 113, harp: 0.6 },
  centro: { family: 'calm', bpm: 72, root: 46, mode: HARMONIC, progA: [0, 5, 0, 4, 0, 5, 1, 4], progB: [5, 1, 4, 0, 5, 1, 4, 4], density: 0.35, seed: 127, harp: 0.9 },
  boss: { family: 'gerudo', bpm: 156, root: 45, mode: HARMONIC, progA: ANDALUZ, progB: [5, 6, 0, 0, 5, 6, 4, 4], density: 0.72, seed: 131, harp: 0.4 },
  final: { family: 'gerudo', bpm: 164, root: 46, mode: PHRYG_DOM, progA: ANDALUZ, progB: [0, 1, 0, 1, 5, 6, 4, 4], density: 0.74, seed: 149, harp: 0.6 },
  memory: { family: 'calm', bpm: 70, root: 48, mode: IONIAN, progA: [0, 5, 3, 4, 0, 5, 1, 4], progB: [3, 4, 5, 0, 3, 4, 1, 4], density: 0.5, seed: 157, harp: 1 },
  story: { family: 'calm', bpm: 80, root: 45, mode: DORIAN, progA: [0, 3, 0, 4, 5, 3, 1, 4], progB: [3, 4, 0, 5, 3, 4, 6, 4], density: 0.4, seed: 163, harp: 0.8 },
  versus: { family: 'gerudo', bpm: 146, root: 47, mode: DORIAN, progA: [0, 0, 6, 6, 3, 3, 4, 4], progB: [5, 5, 3, 3, 0, 0, 4, 4], density: 0.68, seed: 173, harp: 0.3 },
  flight: { family: 'storm', bpm: 150, root: 47, mode: MIXO, progA: [0, 6, 3, 4, 0, 6, 3, 0], progB: [3, 4, 5, 6, 3, 4, 6, 6], density: 0.7, seed: 181, harp: 0.5 },
};

function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PROGS_MINOR = [ANDALUZ, [0, 5, 3, 4, 0, 5, 3, 4], [0, 3, 0, 4, 5, 3, 4, 4], [0, 6, 3, 4, 0, 6, 5, 4]];
const PROGS_MAJOR = [[0, 3, 4, 0, 5, 3, 1, 4], [0, 4, 5, 3, 0, 4, 3, 4], [0, 5, 3, 4, 0, 5, 1, 4], [0, 3, 0, 4, 5, 3, 4, 4]];

/** A música de uma fase: mesma família da área, com tom, andamento, progressão e melodia próprios. */
function variantOf(base: Style, id: string): Style {
  const h = hash(id);
  const r = rng(h);
  const minor = base.mode[2] === 3;
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)];
  return {
    ...base,
    seed: (h % 99991) + 7,
    root: base.root + pick([-2, 0, 0, 2, 3]),
    bpm: Math.round(base.bpm * (0.93 + r() * 0.14)),
    progA: r() < 0.4 ? base.progA : pick(minor ? PROGS_MINOR : PROGS_MAJOR),
    progB: r() < 0.5 ? base.progB : pick(minor ? PROGS_MINOR : PROGS_MAJOR),
    density: Math.max(0.35, Math.min(0.78, base.density + (r() - 0.5) * 0.16)),
  };
}

// ------------------------------------------------------------------
// Composição: cada compasso vira uma lista de notas com o instante (em colcheias) dentro dele.
// ------------------------------------------------------------------

type Inst = 'flute' | 'guitar' | 'harp';
interface Ev {
  inst: Inst;
  /** Instante em colcheias desde o início do compasso (pode ter frações). */
  at: number;
  midi: number;
  /** Duração em colcheias. */
  len: number;
  vel: number;
}
interface Bar {
  events: Ev[];
  /** Colcheias no compasso. */
  size: number;
}

function compose(st: Style): Bar[] {
  const r = rng(st.seed);
  const n = st.mode.length;
  const beats = st.family === 'storm' ? 3 : 4;
  const spb = beats * 2;
  const midiOf = (deg: number, oct: number) => st.root + 12 * (oct + Math.floor(deg / n)) + st.mode[((deg % n) + n) % n];
  const chord = (c: number) => [c, c + 2, c + 4];
  /** Acorde de violão em posição fechada (5 cordas), sem passar de Mi4. */
  const guitarChord = (c: number) => {
    const notes = [midiOf(c, 0), midiOf(c + 4, 0), midiOf(c, 1), midiOf(c + 2, 1), midiOf(c + 4, 1)];
    return notes.map((m) => (m > 76 ? m - 12 : m)).sort((a, b) => a - b);
  };

  const melody = (prog: number[]): Array<Array<{ s: number; d: number; len: number }>> => {
    let cur = prog[0] + n + 2;
    const motif: Array<Array<{ s: number; d: number; len: number }>> = [];
    return prog.map((c, bi) => {
      const cadence = bi === prog.length - 1;
      if (bi >= 4 && bi <= 6 && motif[bi - 4]) return motif[bi - 4].map((x) => ({ ...x, d: x.d + c - prog[bi - 4] }));
      const out: Array<{ s: number; d: number; len: number }> = [];
      for (let s = 0; s < spb; s++) {
        if (cadence && s > 0) break;
        const strong = s === 0 || (st.family === 'storm' && s === 3);
        const p = strong ? 0.92 : s % 2 === 0 ? st.density : st.density * 0.6;
        if (r() > p) continue;
        if (strong || cadence) {
          const tones = chord(c).flatMap((t) => [t + n, t + 2 * n]);
          const near = tones.filter((t) => Math.abs(t - cur) <= 3);
          cur = cadence ? c + n : near.length ? near[Math.floor(r() * near.length)] : tones[0];
        } else cur += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
        cur = Math.max(n, Math.min(2 * n + 3, cur));
        out.push({ s, d: cur, len: 1 });
      }
      for (let i = 0; i < out.length; i++) out[i].len = Math.min(4, (out[i + 1]?.s ?? spb) - out[i].s);
      if (cadence && out[0]) out[0].len = spb;
      if (bi <= 2) motif[bi] = out;
      return out;
    });
  };

  const section = (prog: number[], variant: number): Bar[] => {
    const mel = melody(prog);
    return prog.map((c, bi) => {
      const ev: Ev[] = [];
      const add = (inst: Inst, at: number, midi: number, len: number, vel: number) => ev.push({ inst, at, midi, len, vel });
      // Flauta: na região média (nunca estridente).
      for (const m of mel[bi]) {
        let midi = midiOf(m.d, 1);
        while (midi > 86) midi -= 12;
        while (midi < 62) midi += 12;
        add('flute', m.s, midi, m.len * 0.95, variant === 2 ? 70 : 82);
      }
      const gc = guitarChord(c);
      const bass = midiOf(c, 0) > 52 ? midiOf(c, 0) - 12 : midiOf(c, 0);
      const strum = (at: number, vel: number, down = true, spread = 0.06) =>
        (down ? gc : [...gc].reverse()).forEach((m, k) => add('guitar', at + k * spread, m, 1.6, vel - k * 3));
      if (st.family === 'storm') {
        // Valsa: baixo no 1, acorde no 2 e no 3 (oom-pah-pah).
        add('guitar', 0, bass, 2, 92);
        strum(2, 66, true, 0.05);
        strum(4, 60, false, 0.05);
        if (bi % 2 === 1) add('guitar', 5, midiOf(c + 4, 0) > 52 ? midiOf(c + 4, 0) - 12 : midiOf(c + 4, 0), 1, 70);
      } else if (st.family === 'gerudo') {
        // Rasgueado: batidas em semicolcheia com acentos (3+3+2), baixo no tempo forte.
        add('guitar', 0, bass, 2, 96);
        const accents = [0, 1.5, 3, 4.5, 6];
        for (let h = 0; h < 8; h += 0.5) {
          const acc = accents.includes(h);
          if (!acc && r() < 0.35) continue;
          strum(h, acc ? 74 : 44, Math.round(h * 2) % 2 === 0, acc ? 0.035 : 0.02);
        }
      } else {
        // Dedilhado: baixo e as cordas de cima em sequência.
        const pat = [bass, gc[2], gc[3], gc[4], gc[3], gc[2], bass + 7, gc[3]];
        pat.forEach((m, k) => add('guitar', k, m, 1.8, k === 0 ? 84 : 58));
      }
      // Harpa: arpejo subindo (e um glissando no fim de cada frase de 4 compassos).
      if (r() < st.harp || bi % 4 === 3) {
        const up = chord(c).map((t) => midiOf(t, 2)).concat(midiOf(c, 3));
        if (bi % 4 === 3) up.forEach((m, k) => add('harp', spb - 2 + k * 0.25, Math.min(84, m), 3, 64 - k * 4));
        else up.forEach((m, k) => add('harp', k * (spb / 4), Math.min(84, m), 2.5, 52));
      }
      return { events: ev.sort((x, y) => x.at - y.at), size: spb };
    });
  };

  return [...section(st.progA, 0), ...section(st.progA, 1), ...section(st.progB, 2), ...section(st.progA, 1)];
}

// ------------------------------------------------------------------
// Tocador: um relógio contínuo. Trocar de música não para nada.
// ------------------------------------------------------------------

let bus: GainNode | null = null;
let duckGain: GainNode | null = null;
const inst: Partial<Record<Inst, Soundfont>> = {};
let ready = false;
let timer: number | undefined;

interface Song {
  key: string;
  track: Track;
  style: Style;
  bars: Bar[];
}
let current: Song | null = null;
let pending: Song | null = null;
/** Compasso tocando e o instante (no relógio do áudio) em que ele começou. */
let barIdx = 0;
let barStart = 0;
/** Andamento atual (desliza até o da música nova). */
let bpm = 100;
/** Próximo evento ainda não agendado dentro do compasso atual. */
let evIdx = 0;

function musicVol(): number {
  const s = settings();
  return (s.master / 10) * (s.music / 10);
}

function setup(a: AudioContext): void {
  if (bus) return;
  bus = a.createGain();
  bus.gain.value = musicVol();
  duckGain = a.createGain();
  // Sem agudos: passa-baixa suave na saída.
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3600;
  lp.Q.value = 0.4;
  duckGain.connect(bus).connect(lp).connect(a.destination);
  const url = (name: string) => `./assets/sf/${name}-mp3.js`;
  inst.guitar = new Soundfont(a, { instrumentUrl: url('acoustic_guitar_nylon'), destination: duckGain, volume: 105 });
  inst.harp = new Soundfont(a, { instrumentUrl: url('orchestral_harp'), destination: duckGain, volume: 78 });
  inst.flute = new Soundfont(a, { instrumentUrl: url('flute'), destination: duckGain, volume: 88 });
  void Promise.all([inst.guitar.load, inst.harp.load, inst.flute.load])
    .then(() => {
      ready = true;
      barStart = a.currentTime + 0.1;
      evIdx = 0;
    })
    .catch(() => {
      /* sem amostras: fica em silêncio */
    });
}

function eighth(): number {
  return 60 / bpm / 2;
}

function schedule(): void {
  const a = audio();
  if (!a || !bus || !current || !ready) return;
  if (a.state === 'suspended') {
    void a.resume();
    return;
  }
  bus.gain.setTargetAtTime(musicVol(), a.currentTime, 0.05);
  // Aba escondida por muito tempo: retoma do compasso seguinte, sem despejar notas atrasadas.
  if (barStart < a.currentTime - 4) {
    barStart = a.currentTime + 0.1;
    evIdx = 0;
  }
  const horizon = a.currentTime + 0.3;
  for (let guard = 0; guard < 8; guard++) {
    const bar = current.bars[barIdx % current.bars.length];
    const e8 = eighth();
    while (evIdx < bar.events.length) {
      const ev = bar.events[evIdx];
      const t = barStart + ev.at * e8;
      if (t > horizon) return;
      if (t >= a.currentTime - 0.02)
        inst[ev.inst]?.start({ note: ev.midi, time: t, duration: ev.len * e8, velocity: ev.vel, decayTime: ev.inst === 'flute' ? 0.12 : 0.4 });
      evIdx++;
    }
    const end = barStart + bar.size * e8;
    if (end > horizon) return;
    // Fim do compasso: aqui (e só aqui) entra a música nova, e o andamento desliza até o dela.
    barStart = end;
    evIdx = 0;
    barIdx++;
    if (pending) {
      current = pending;
      pending = null;
      barIdx = 0;
    }
    const target = current.style.bpm;
    bpm += Math.max(-8, Math.min(8, target - bpm));
  }
}

/**
 * Toca a música de um lugar. Com 'variant' (o id da fase), é a versão daquela fase.
 * Nunca reinicia: a troca acontece no próximo compasso, com o andamento deslizando.
 */
export function playMusic(track: Track, variant?: string): void {
  const key = variant ? `${track}:${variant}` : track;
  if ((pending ?? current)?.key === key) return;
  const a = audio();
  if (!a) return;
  setup(a);
  const style = variant ? variantOf(STYLES[track], variant) : STYLES[track];
  const song: Song = { key, track, style, bars: compose(style) };
  if (!current) {
    current = song;
    bpm = style.bpm;
    barIdx = 0;
    barStart = a.currentTime + 0.15;
    evIdx = 0;
  } else pending = song;
  if (timer === undefined) timer = window.setInterval(schedule, 50);
}

/** Para a música (só usado ao sair do jogo). */
export function stopMusic(): void {
  current = null;
  pending = null;
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

export const currentTrack = (): Track | undefined => (pending ?? current)?.track;

/** Abaixa a música por um instante (lembranças, vitória) e volta, sem parar. */
export function duckMusic(ms: number, to = 0.3): void {
  const a = audio();
  if (!a || !duckGain) return;
  const g = duckGain.gain;
  g.cancelScheduledValues(a.currentTime);
  g.setTargetAtTime(to, a.currentTime, 0.12);
  g.setTargetAtTime(1, a.currentTime + ms / 1000, 0.5);
}

/** Vinhetas curtas por cima da música (que só abaixa): vitória, selo, derrota, lembrança. */
export function jingle(kind: 'win' | 'seal' | 'lose' | 'flash'): void {
  const a = audio();
  if (!a || !ready || musicVol() <= 0) return;
  const t = a.currentTime + 0.05;
  const harp = inst.harp!;
  const flute = inst.flute!;
  if (kind === 'flash') {
    [76, 72, 79].forEach((m, i) => harp.start({ note: m, time: t + i * 0.22, duration: 0.8, velocity: 70 }));
    return;
  }
  duckMusic(kind === 'seal' ? 2600 : 1500, 0.2);
  if (kind === 'win') {
    [60, 64, 67, 72].forEach((m, i) => harp.start({ note: m, time: t + i * 0.1, duration: 1.2, velocity: 80 }));
    flute.start({ note: 79, time: t + 0.4, duration: 0.9, velocity: 85 });
  } else if (kind === 'seal') {
    [57, 60, 63, 66, 69].forEach((m, i) => harp.start({ note: m, time: t + i * 0.18, duration: 1.8, velocity: 72 }));
    flute.start({ note: 74, time: t + 0.9, duration: 1.6, velocity: 75 });
  } else {
    [64, 63, 62, 61].forEach((m, i) => flute.start({ note: m, time: t + i * 0.22, duration: 0.3, velocity: 70 }));
  }
}
