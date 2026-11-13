import { audio, settings } from './settings';

/**
 * Trilha 8-bit gerada na hora (sem arquivos de áudio). Cada tema é descrito por um "estilo"
 * (andamento, tom, modo, progressão de acordes, timbres, bateria) e a melodia é composta a partir
 * de uma semente fixa: o mesmo tema sempre toca igual. Forma A A B A, em laço.
 *
 * Uso: `playMusic('mare')` (repete o tema atual se for o mesmo), `stopMusic()`, `jingle('win')`.
 */

type Drums = 'none' | 'soft' | 'rock' | 'march' | 'tribal' | 'waltz' | 'gallop';
type Bass = 'root' | 'walk' | 'drive' | 'waltz' | 'pedal';
type Voice = 'pulse12' | 'pulse25' | 'square' | 'triangle' | 'sine' | 'sawtooth';

interface Style {
  bpm: number;
  /** Nota MIDI da tônica (oitava do baixo). */
  root: number;
  /** Intervalos da escala. */
  mode: number[];
  /** Grau (índice na escala) de cada compasso da seção A e da B. */
  progA: number[];
  progB: number[];
  beats: 3 | 4;
  lead: Voice;
  bassVoice: Voice;
  bass: Bass;
  drums: Drums;
  /** 0 a 1: quantas colcheias têm nota. */
  density: number;
  seed: number;
  /** Arpejo de acompanhamento (semicolcheias) na seção B ou sempre. */
  arp?: 'B' | 'always';
  echo?: boolean;
  /** Atraso das colcheias fracas (balanço), 0 a 0.3. */
  swing?: number;
  /** Oitavas acima do baixo para a melodia. */
  leadOct?: number;
}

const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const LOCRIAN = [0, 1, 3, 5, 6, 8, 10];

export type Track =
  | 'menu' | 'world' | 'mare' | 'pradaria' | 'lagoa' | 'teias' | 'forja' | 'bosque' | 'minas' | 'ceu' | 'reino'
  | 'centro' | 'boss' | 'final' | 'memory' | 'story' | 'versus' | 'flight';

const STYLES: Record<Track, Style> = {
  // Abertura: aventura com um fundo melancólico.
  menu: { bpm: 104, root: 45, mode: AEOLIAN, progA: [0, 5, 2, 6, 0, 5, 3, 4], progB: [3, 4, 2, 5, 3, 4, 6, 4], beats: 4, lead: 'pulse25', bassVoice: 'triangle', bass: 'walk', drums: 'soft', density: 0.55, seed: 11, arp: 'B' },
  // Mapa do mundo: calmo, andando de ilha em ilha.
  world: { bpm: 92, root: 48, mode: IONIAN, progA: [0, 3, 4, 0, 5, 3, 1, 4], progB: [5, 3, 0, 4, 5, 1, 3, 4], beats: 4, lead: 'triangle', bassVoice: 'triangle', bass: 'root', drums: 'soft', density: 0.5, seed: 23, arp: 'always' },
  // Ilhas da Maré: calipso balançado.
  mare: { bpm: 116, root: 50, mode: IONIAN, progA: [0, 0, 3, 4, 0, 5, 3, 4], progB: [3, 3, 0, 5, 1, 4, 0, 4], beats: 4, lead: 'pulse25', bassVoice: 'triangle', bass: 'walk', drums: 'soft', density: 0.62, seed: 37, swing: 0.18, arp: 'B' },
  // Pradaria: galope folclórico em 6/8.
  pradaria: { bpm: 138, root: 43, mode: MIXO, progA: [0, 6, 3, 0, 0, 6, 4, 0], progB: [3, 3, 0, 0, 6, 6, 4, 4], beats: 3, lead: 'pulse12', bassVoice: 'triangle', bass: 'waltz', drums: 'gallop', density: 0.7, seed: 41 },
  // Lagoa: dórico lento, com eco de pântano.
  lagoa: { bpm: 84, root: 45, mode: DORIAN, progA: [0, 3, 0, 3, 6, 3, 4, 0], progB: [5, 3, 6, 0, 5, 3, 4, 4], beats: 4, lead: 'triangle', bassVoice: 'sine', bass: 'pedal', drums: 'tribal', density: 0.45, seed: 53, echo: true },
  // Caverna das Teias: menor harmônica, dedilhada e rarefeita.
  teias: { bpm: 96, root: 40, mode: HARMONIC, progA: [0, 0, 5, 4, 0, 3, 5, 4], progB: [3, 5, 1, 4, 3, 5, 4, 4], beats: 4, lead: 'pulse12', bassVoice: 'triangle', bass: 'root', drums: 'soft', density: 0.4, seed: 67, arp: 'always', echo: true },
  // Forja: frígio pesado, baixo martelando.
  forja: { bpm: 152, root: 40, mode: PHRYGIAN, progA: [0, 1, 0, 6, 0, 1, 5, 6], progB: [3, 1, 3, 4, 5, 1, 6, 6], beats: 4, lead: 'square', bassVoice: 'sawtooth', bass: 'drive', drums: 'rock', density: 0.6, seed: 71 },
  // Bosque: lídio, curioso e leve.
  bosque: { bpm: 108, root: 41, mode: LYDIAN, progA: [0, 1, 0, 1, 4, 3, 1, 4], progB: [3, 4, 2, 5, 3, 1, 4, 4], beats: 4, lead: 'triangle', bassVoice: 'triangle', bass: 'walk', drums: 'soft', density: 0.58, seed: 83, arp: 'always' },
  // Minas: pentatônica menor com tambores de túnel.
  minas: { bpm: 124, root: 45, mode: [0, 3, 5, 7, 10], progA: [0, 0, 2, 1, 0, 0, 3, 3], progB: [2, 2, 0, 0, 3, 3, 1, 3], beats: 4, lead: 'pulse25', bassVoice: 'triangle', bass: 'drive', drums: 'tribal', density: 0.6, seed: 97 },
  // Céu de Brasa: frígio dominante, rápido e quente.
  ceu: { bpm: 146, root: 40, mode: PHRYG_DOM, progA: [0, 1, 0, 6, 0, 1, 3, 4], progB: [3, 1, 6, 0, 3, 1, 4, 4], beats: 4, lead: 'pulse25', bassVoice: 'sawtooth', bass: 'drive', drums: 'rock', density: 0.65, seed: 101, arp: 'B' },
  // Reino das Asas: valsa de corte, menor harmônica.
  reino: { bpm: 126, root: 43, mode: HARMONIC, progA: [0, 3, 4, 0, 5, 3, 4, 4], progB: [5, 1, 4, 0, 5, 3, 4, 4], beats: 3, lead: 'pulse12', bassVoice: 'triangle', bass: 'waltz', drums: 'waltz', density: 0.66, seed: 113, echo: true },
  // Santuário: lócrio, quase parado. Algo está errado aqui.
  centro: { bpm: 72, root: 42, mode: LOCRIAN, progA: [0, 1, 0, 4, 0, 1, 6, 4], progB: [4, 1, 4, 0, 6, 1, 4, 4], beats: 4, lead: 'triangle', bassVoice: 'sine', bass: 'pedal', drums: 'none', density: 0.35, seed: 127, echo: true, arp: 'B' },
  // Chefes: urgência.
  boss: { bpm: 164, root: 45, mode: AEOLIAN, progA: [0, 0, 5, 6, 0, 0, 3, 4], progB: [5, 6, 0, 0, 5, 6, 4, 4], beats: 4, lead: 'square', bassVoice: 'sawtooth', bass: 'drive', drums: 'rock', density: 0.72, seed: 131 },
  // O Xamã.
  final: { bpm: 172, root: 40, mode: HARMONIC, progA: [0, 5, 1, 4, 0, 5, 3, 4], progB: [3, 4, 5, 4, 3, 1, 4, 4], beats: 4, lead: 'sawtooth', bassVoice: 'sawtooth', bass: 'drive', drums: 'rock', density: 0.74, seed: 149, arp: 'always' },
  // Memórias: caixinha de música.
  memory: { bpm: 70, root: 53, mode: IONIAN, progA: [0, 5, 3, 4, 0, 5, 1, 4], progB: [3, 4, 5, 0, 3, 4, 1, 4], beats: 3, lead: 'sine', bassVoice: 'triangle', bass: 'root', drums: 'none', density: 0.55, seed: 157, arp: 'always', echo: true, leadOct: 3 },
  // Conversas da história.
  story: { bpm: 80, root: 45, mode: DORIAN, progA: [0, 3, 0, 4, 5, 3, 1, 4], progB: [3, 4, 0, 5, 3, 4, 6, 4], beats: 4, lead: 'triangle', bassVoice: 'triangle', bass: 'root', drums: 'none', density: 0.4, seed: 163, echo: true },
  // Versus: duelo.
  versus: { bpm: 140, root: 43, mode: DORIAN, progA: [0, 0, 6, 6, 3, 3, 4, 4], progB: [5, 5, 3, 3, 0, 0, 4, 4], beats: 4, lead: 'pulse25', bassVoice: 'sawtooth', bass: 'drive', drums: 'rock', density: 0.68, seed: 173 },
  // Fases de voo.
  flight: { bpm: 156, root: 47, mode: MIXO, progA: [0, 6, 3, 4, 0, 6, 3, 0], progB: [3, 4, 5, 6, 3, 4, 6, 6], beats: 4, lead: 'pulse12', bassVoice: 'triangle', bass: 'drive', drums: 'rock', density: 0.7, seed: 181, arp: 'always' },
};

interface Note { midi: number; len: number }
interface Step {
  lead?: Note;
  bass?: Note;
  arp?: number[];
  kick?: boolean;
  snare?: boolean;
  hat?: boolean;
  tom?: boolean;
}

function rng(seed: number): () => number {
  let s = seed * 2654435761 >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const DRUMS: Record<Drums, string[]> = {
  // k bumbo · s caixa · h chimbal · t tambor
  none: ['........'],
  soft: ['k.h.s.h.', 'k.h.s.hh'],
  rock: ['khhksh.h', 'khkhshkh'],
  march: ['k.ssk.s.', 'k.sskss.'],
  tribal: ['t..t..th', 't..t.tth'],
  waltz: ['k.h.h.', 'k.h.hh'],
  gallop: ['k.hsh.', 'k.hshh'],
};

/** Compõe a música inteira (lista de colcheias). */
function compose(st: Style): Step[] {
  const r = rng(st.seed);
  const n = st.mode.length;
  const spb = st.beats * 2; // colcheias por compasso
  const midiOf = (deg: number, oct: number) => st.root + 12 * (oct + Math.floor(deg / n)) + st.mode[((deg % n) + n) % n];
  const leadOct = st.leadOct ?? 2;
  const chordTones = (c: number) => (n === 5 ? [c, c + 2, c + 3] : [c, c + 2, c + 4]);

  const melody = (prog: number[]): (Note | undefined)[][] => {
    const bars: (Note | undefined)[][] = [];
    let cur = prog[0] + n; // começa no meio da extensão
    const motif: (number | undefined)[][] = [];
    prog.forEach((c, bi) => {
      const bar: (number | undefined)[] = new Array(spb).fill(undefined);
      const cadence = bi === prog.length - 1;
      // Compassos 4 a 6 repetem 0 a 2 (transpostos pelo acorde): a frase fica memorável.
      if (bi >= 4 && bi <= 6 && motif[bi - 4]) {
        const shift = c - prog[bi - 4];
        motif[bi - 4].forEach((d, s) => (bar[s] = d === undefined ? undefined : d + shift));
      } else {
        for (let s = 0; s < spb; s++) {
          if (cadence && s > 1) break;
          const strong = s === 0;
          const on = s % 2 === 0;
          const p = strong ? 0.95 : on ? st.density : st.density * 0.55;
          if (r() > p) continue;
          if (on || cadence) {
            const tones = chordTones(c).flatMap((t) => [t, t + n, t + 2 * n]);
            const near = tones.filter((t) => Math.abs(t - cur) <= 3);
            cur = cadence ? c + n : (near.length ? near[Math.floor(r() * near.length)] : tones.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)));
          } else {
            cur += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
          }
          cur = Math.max(n - 2, Math.min(2 * n + 4, cur));
          bar[s] = cur;
        }
        if (bi <= 2) motif[bi] = bar.slice();
      }
      bars.push(
        bar.map((d, s) => {
          if (d === undefined) return undefined;
          let len = 1;
          while (s + len < spb && bar[s + len] === undefined && len < 4) len++;
          if (cadence) len = spb - s;
          return { midi: midiOf(d, leadOct - 1), len };
        }),
      );
    });
    return bars;
  };

  const section = (prog: number[], withArp: boolean, mel: (Note | undefined)[][], variant: number): Step[] => {
    const out: Step[] = [];
    const pats = DRUMS[st.drums];
    prog.forEach((c, bi) => {
      const pat = pats[(bi % 4 === 3 ? 1 : 0) % pats.length];
      const root = midiOf(c, 0);
      const fifth = midiOf(c + (n === 5 ? 3 : 4), 0);
      for (let s = 0; s < spb; s++) {
        const step: Step = {};
        step.lead = mel[bi][s];
        // Na repetição, a última colcheia de cada compasso par ganha um floreio uma oitava acima.
        if (variant === 1 && step.lead && bi % 2 === 1 && s === 0) step.lead = { ...step.lead, midi: step.lead.midi + 12 };
        switch (st.bass) {
          case 'root':
            if (s === 0) step.bass = { midi: root, len: spb / 2 };
            if (s === spb / 2) step.bass = { midi: st.beats === 3 ? fifth : root, len: spb / 2 };
            break;
          case 'pedal':
            if (s === 0) step.bass = { midi: midiOf(prog[0], 0), len: spb };
            break;
          case 'walk':
            if (s % 2 === 0) step.bass = { midi: [root, fifth, root + 12, fifth][(s / 2) % 4], len: 2 };
            break;
          case 'drive':
            step.bass = { midi: s % 4 === 3 ? root + 12 : root, len: 1 };
            break;
          case 'waltz':
            if (s === 0) step.bass = { midi: root, len: 2 };
            if (s === 2 || s === 4) step.arp = chordTones(c).map((t) => midiOf(t, 1));
            break;
        }
        if (withArp && st.bass !== 'waltz') {
          const tones = chordTones(c).map((t) => midiOf(t, 2));
          step.arp = [tones[s % 3], tones[(s + 1) % 3]];
        }
        const ch = pat[s % pat.length];
        if (ch === 'k') step.kick = true;
        if (ch === 's') step.snare = true;
        if (ch === 'h') step.hat = true;
        if (ch === 't') step.tom = true;
        out.push(step);
      }
    });
    return out;
  };

  const A = melody(st.progA);
  const B = melody(st.progB);
  const arpA = st.arp === 'always';
  const arpB = st.arp === 'always' || st.arp === 'B';
  return [
    ...section(st.progA, arpA, A, 0),
    ...section(st.progA, arpA, A, 1),
    ...section(st.progB, arpB, B, 0),
    ...section(st.progA, arpA, A, 1),
  ];
}

// ------------------------------------------------------------------
// Tocador
// ------------------------------------------------------------------

const waves = new Map<string, PeriodicWave>();
function pulse(a: AudioContext, duty: number): PeriodicWave {
  const key = `p${duty}`;
  let w = waves.get(key);
  if (!w) {
    const N = 32;
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let k = 1; k < N; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = a.createPeriodicWave(re, im);
    waves.set(key, w);
  }
  return w;
}

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let bus: GainNode | null = null;
let leadBus: GainNode | null = null;
let playing: { track: Track; style: Style; steps: Step[]; i: number; next: number } | null = null;
let timer: number | undefined;
let noiseBuf: AudioBuffer | null = null;

function musicVol(): number {
  const s = settings();
  return (s.master / 10) * (s.music / 10);
}

function osc(a: AudioContext, dest: AudioNode, voice: Voice, f: number, t: number, dur: number, v: number): void {
  const o = a.createOscillator();
  if (voice === 'pulse12') o.setPeriodicWave(pulse(a, 0.125));
  else if (voice === 'pulse25') o.setPeriodicWave(pulse(a, 0.25));
  else o.type = voice;
  o.frequency.setValueAtTime(f, t);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.008);
  g.gain.exponentialRampToValueAtTime(v * 0.6, t + Math.min(0.12, dur * 0.5));
  g.gain.setValueAtTime(v * 0.6, t + Math.max(0.01, dur - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(a: AudioContext, dest: AudioNode, t: number, dur: number, v: number, hp: number): void {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

function drum(a: AudioContext, dest: AudioNode, t: number, f0: number, f1: number, dur: number, v: number): void {
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function schedule(): void {
  const a = audio();
  if (!a || !playing || !bus || !leadBus) return;
  if (a.state === 'suspended') {
    void a.resume();
    return;
  }
  bus.gain.setTargetAtTime(musicVol() * 0.9, a.currentTime, 0.05);
  const { style: st, steps } = playing;
  const eighth = 60 / st.bpm / 2;
  // Aba escondida ou travada: não despeja um monte de notas atrasadas de uma vez.
  if (playing.next < a.currentTime - 0.1) playing.next = a.currentTime + 0.05;
  while (playing.next < a.currentTime + 0.25) {
    const step = steps[playing.i % steps.length];
    const odd = playing.i % 2 === 1;
    const t = playing.next + (odd ? (st.swing ?? 0) * eighth : 0);
    if (step.lead) osc(a, leadBus, st.lead, freq(step.lead.midi), t, step.lead.len * eighth * 0.92, st.lead === 'sawtooth' || st.lead === 'square' ? 0.045 : 0.07);
    if (step.bass) osc(a, bus, st.bassVoice, freq(step.bass.midi), t, step.bass.len * eighth * 0.9, st.bassVoice === 'sawtooth' ? 0.045 : 0.09);
    if (step.arp) step.arp.forEach((m, k) => osc(a, bus!, 'pulse12', freq(m), t + k * eighth * 0.5, eighth * 0.45, 0.022));
    if (step.kick) drum(a, bus, t, 150, 45, 0.16, 0.22);
    if (step.tom) drum(a, bus, t, 210, 90, 0.18, 0.16);
    if (step.snare) noise(a, bus, t, 0.11, 0.09, 1200);
    if (step.hat) noise(a, bus, t, 0.03, 0.04, 6000);
    playing.i++;
    playing.next += eighth;
  }
}

function buses(a: AudioContext): void {
  if (bus) return;
  bus = a.createGain();
  bus.gain.value = musicVol();
  bus.connect(a.destination);
  leadBus = a.createGain();
  leadBus.connect(bus);
}

/** Toca um tema (se já estiver tocando, continua de onde está). */
export function playMusic(track: Track): void {
  if (playing?.track === track) return;
  const a = audio();
  if (!a) return;
  buses(a);
  const style = STYLES[track];
  // Eco só nos temas que pedem (pântano, cavernas, memórias).
  leadBus!.disconnect();
  leadBus = a.createGain();
  leadBus.connect(bus!);
  if (style.echo) {
    const d = a.createDelay(1);
    d.delayTime.value = (60 / style.bpm) * 0.75;
    const fb = a.createGain();
    fb.gain.value = 0.32;
    const wet = a.createGain();
    wet.gain.value = 0.5;
    leadBus.connect(d);
    d.connect(fb).connect(d);
    d.connect(wet).connect(bus!);
  }
  playing = { track, style, steps: compose(style), i: 0, next: a.currentTime + 0.12 };
  if (timer === undefined) timer = window.setInterval(schedule, 40);
  schedule();
}

/** Para a música (as notas já agendadas terminam sozinhas). */
export function stopMusic(): void {
  playing = null;
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

export const currentTrack = (): Track | undefined => playing?.track;

/** Vinhetas curtas: vitória de fase, selo quebrado, derrota. */
export function jingle(kind: 'win' | 'seal' | 'lose'): void {
  stopMusic();
  const a = audio();
  if (!a) return;
  buses(a);
  const v = musicVol();
  if (v <= 0) return;
  const t = a.currentTime + 0.05;
  const seq: [number, number, number][] =
    kind === 'win'
      ? [[60, 0, 0.12], [64, 0.12, 0.12], [67, 0.24, 0.12], [72, 0.36, 0.5], [67, 0.36, 0.5]]
      : kind === 'seal'
        ? [[57, 0, 0.3], [60, 0.3, 0.3], [63, 0.6, 0.3], [66, 0.9, 0.9], [54, 0.9, 0.9]]
        : [[64, 0, 0.2], [63, 0.2, 0.2], [62, 0.4, 0.2], [61, 0.6, 0.6]];
  for (const [m, dt, d] of seq) osc(a, bus!, kind === 'seal' ? 'triangle' : 'pulse25', freq(m), t + dt, d, 0.08);
}
