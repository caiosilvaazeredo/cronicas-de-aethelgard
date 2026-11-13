import { audio, settings } from './settings';

/**
 * Trilha gerada na hora (sem arquivos de áudio), com instrumentos sintetizados no espírito de
 * Ocarina of Time: ocarina e flauta (sopro com vibrato), harpa e violão (corda dedilhada por
 * Karplus-Strong), cordas (naipe com ataque lento), trompa, marimba, celesta, pizzicato e tímpano,
 * tudo numa sala com reverberação. Um passa-baixa geral tira os agudos estridentes.
 *
 * Cada tema é um "estilo" (andamento, tom, modo, progressão, instrumentos, percussão) e a melodia
 * é composta a partir de uma semente fixa. Cada FASE tem a sua música: `playMusic(tema, idDaFase)`
 * deriva do estilo da área um tom, um andamento, uma progressão, um instrumento solista e uma
 * melodia próprios (sempre os mesmos para a mesma fase). Forma A A B A, em laço.
 */

type Drums = 'none' | 'soft' | 'rock' | 'march' | 'tribal' | 'waltz' | 'gallop';
type Bass = 'root' | 'walk' | 'drive' | 'waltz' | 'pedal';
/** Solistas. */
type Lead = 'ocarina' | 'flute' | 'horn' | 'marimba' | 'celesta' | 'harp' | 'guitar' | 'strings' | 'organ';
/** Acompanhamento dedilhado. */
type Comp = 'harp' | 'guitar' | 'marimba' | 'celesta';

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
  /** Solistas possíveis: cada fase da área usa um deles. */
  leads: Lead[];
  comp: Comp;
  bass: Bass;
  /** Baixo: pizzicato (dedilhado) ou contrabaixo com arco. */
  bassInst: 'pizz' | 'bowed';
  /** Naipe de cordas sustentando o acorde (0 = sem). */
  pad: number;
  drums: Drums;
  /** 0 a 1: quantas colcheias têm nota. */
  density: number;
  seed: number;
  /** Arpejo de acompanhamento na seção B ou sempre. */
  arp?: 'B' | 'always';
  echo?: boolean;
  /** Atraso das colcheias fracas (balanço), 0 a 0.3. */
  swing?: number;
  /** Oitavas acima do baixo para a melodia. */
  leadOct?: number;
  /** Tímpano na cabeça do compasso. */
  timpani?: boolean;
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
  // Abertura: ocarina sobre harpa e cordas, em três tempos (como um tema de título).
  menu: { bpm: 96, root: 45, mode: AEOLIAN, progA: [0, 5, 2, 6, 0, 5, 3, 4], progB: [3, 4, 2, 5, 3, 4, 6, 4], beats: 3, leads: ['ocarina'], comp: 'harp', bass: 'root', bassInst: 'bowed', pad: 0.7, drums: 'none', density: 0.55, seed: 11, arp: 'always' },
  // Mapa do mundo: flauta e harpa, campo aberto.
  world: { bpm: 100, root: 48, mode: IONIAN, progA: [0, 3, 4, 0, 5, 3, 1, 4], progB: [5, 3, 0, 4, 5, 1, 3, 4], beats: 4, leads: ['flute'], comp: 'harp', bass: 'root', bassInst: 'pizz', pad: 0.6, drums: 'soft', density: 0.5, seed: 23, arp: 'always' },
  // Ilhas da Maré: marimba e violão num calipso de praia.
  mare: { bpm: 112, root: 50, mode: IONIAN, progA: [0, 0, 3, 4, 0, 5, 3, 4], progB: [3, 3, 0, 5, 1, 4, 0, 4], beats: 4, leads: ['marimba', 'flute', 'ocarina'], comp: 'guitar', bass: 'walk', bassInst: 'pizz', pad: 0.3, drums: 'soft', density: 0.62, seed: 37, swing: 0.18, arp: 'B' },
  // Pradaria: cantiga de rancho em três tempos, ocarina e violão.
  pradaria: { bpm: 132, root: 43, mode: MIXO, progA: [0, 6, 3, 0, 0, 6, 4, 0], progB: [3, 3, 0, 0, 6, 6, 4, 4], beats: 3, leads: ['ocarina', 'flute', 'guitar'], comp: 'guitar', bass: 'waltz', bassInst: 'pizz', pad: 0.35, drums: 'gallop', density: 0.7, seed: 41 },
  // Lagoa: harpa correndo como água, flauta ao longe.
  lagoa: { bpm: 84, root: 45, mode: DORIAN, progA: [0, 3, 0, 3, 6, 3, 4, 0], progB: [5, 3, 6, 0, 5, 3, 4, 4], beats: 4, leads: ['flute', 'ocarina', 'harp'], comp: 'harp', bass: 'pedal', bassInst: 'bowed', pad: 0.8, drums: 'none', density: 0.45, seed: 53, echo: true, arp: 'always' },
  // Caverna das Teias: celesta rarefeita sobre cordas graves.
  teias: { bpm: 92, root: 40, mode: HARMONIC, progA: [0, 0, 5, 4, 0, 3, 5, 4], progB: [3, 5, 1, 4, 3, 5, 4, 4], beats: 4, leads: ['celesta', 'harp', 'flute'], comp: 'celesta', bass: 'root', bassInst: 'bowed', pad: 0.9, drums: 'none', density: 0.4, seed: 67, arp: 'B', echo: true },
  // Forja: trompa e tímpano, tambores da montanha.
  forja: { bpm: 138, root: 40, mode: PHRYGIAN, progA: [0, 1, 0, 6, 0, 1, 5, 6], progB: [3, 1, 3, 4, 5, 1, 6, 6], beats: 4, leads: ['horn', 'strings', 'marimba'], comp: 'marimba', bass: 'drive', bassInst: 'pizz', pad: 0.6, drums: 'tribal', density: 0.6, seed: 71, timpani: true },
  // Bosque: ocarina saltitante com marimba (bosque perdido).
  bosque: { bpm: 116, root: 41, mode: LYDIAN, progA: [0, 1, 0, 1, 4, 3, 1, 4], progB: [3, 4, 2, 5, 3, 1, 4, 4], beats: 4, leads: ['ocarina', 'flute', 'marimba'], comp: 'marimba', bass: 'walk', bassInst: 'pizz', pad: 0.3, drums: 'soft', density: 0.66, seed: 83, arp: 'always' },
  // Minas: marimba e tambores (cidade de pedra).
  minas: { bpm: 120, root: 45, mode: [0, 3, 5, 7, 10], progA: [0, 0, 2, 1, 0, 0, 3, 3], progB: [2, 2, 0, 0, 3, 3, 1, 3], beats: 4, leads: ['marimba', 'horn', 'guitar'], comp: 'marimba', bass: 'drive', bassInst: 'pizz', pad: 0.3, drums: 'tribal', density: 0.6, seed: 97 },
  // Céu de Brasa: violão rasgado e trompa (vale do deserto).
  ceu: { bpm: 136, root: 40, mode: PHRYG_DOM, progA: [0, 1, 0, 6, 0, 1, 3, 4], progB: [3, 1, 6, 0, 3, 1, 4, 4], beats: 4, leads: ['horn', 'guitar', 'flute'], comp: 'guitar', bass: 'walk', bassInst: 'pizz', pad: 0.4, drums: 'march', density: 0.65, seed: 101, arp: 'always' },
  // Reino das Asas: valsa de corte com cordas.
  reino: { bpm: 120, root: 43, mode: HARMONIC, progA: [0, 3, 4, 0, 5, 3, 4, 4], progB: [5, 1, 4, 0, 5, 3, 4, 4], beats: 3, leads: ['strings', 'flute', 'celesta'], comp: 'harp', bass: 'waltz', bassInst: 'pizz', pad: 0.7, drums: 'waltz', density: 0.66, seed: 113, echo: true },
  // Santuário: órgão e cordas, quase parado (templo). Algo está errado aqui.
  centro: { bpm: 66, root: 42, mode: LOCRIAN, progA: [0, 1, 0, 4, 0, 1, 6, 4], progB: [4, 1, 4, 0, 6, 1, 4, 4], beats: 4, leads: ['organ', 'ocarina', 'celesta'], comp: 'harp', bass: 'pedal', bassInst: 'bowed', pad: 1, drums: 'none', density: 0.35, seed: 127, echo: true, arp: 'B' },
  // Chefes: cordas marcadas, trompa e tímpano.
  boss: { bpm: 152, root: 45, mode: AEOLIAN, progA: [0, 0, 5, 6, 0, 0, 3, 4], progB: [5, 6, 0, 0, 5, 6, 4, 4], beats: 4, leads: ['horn', 'strings'], comp: 'marimba', bass: 'drive', bassInst: 'pizz', pad: 0.8, drums: 'march', density: 0.72, seed: 131, timpani: true },
  // O Xamã: órgão, cordas e tímpano.
  final: { bpm: 158, root: 40, mode: HARMONIC, progA: [0, 5, 1, 4, 0, 5, 3, 4], progB: [3, 4, 5, 4, 3, 1, 4, 4], beats: 4, leads: ['organ'], comp: 'harp', bass: 'drive', bassInst: 'bowed', pad: 1, drums: 'march', density: 0.74, seed: 149, arp: 'always', timpani: true },
  // Memórias: caixinha de música (celesta) com cordas ao fundo.
  memory: { bpm: 70, root: 48, mode: IONIAN, progA: [0, 5, 3, 4, 0, 5, 1, 4], progB: [3, 4, 5, 0, 3, 4, 1, 4], beats: 3, leads: ['celesta'], comp: 'harp', bass: 'root', bassInst: 'bowed', pad: 0.6, drums: 'none', density: 0.55, seed: 157, arp: 'always', echo: true },
  // Conversas da história: harpa e flauta baixinho.
  story: { bpm: 78, root: 45, mode: DORIAN, progA: [0, 3, 0, 4, 5, 3, 1, 4], progB: [3, 4, 0, 5, 3, 4, 6, 4], beats: 4, leads: ['flute', 'ocarina'], comp: 'harp', bass: 'root', bassInst: 'bowed', pad: 0.6, drums: 'none', density: 0.4, seed: 163, echo: true, arp: 'always' },
  // Versus: violão e trompa, duelo.
  versus: { bpm: 136, root: 43, mode: DORIAN, progA: [0, 0, 6, 6, 3, 3, 4, 4], progB: [5, 5, 3, 3, 0, 0, 4, 4], beats: 4, leads: ['horn', 'guitar'], comp: 'guitar', bass: 'drive', bassInst: 'pizz', pad: 0.4, drums: 'march', density: 0.68, seed: 173, arp: 'always' },
  // Fases de voo: trompa e cordas, cavalgada.
  flight: { bpm: 148, root: 47, mode: MIXO, progA: [0, 6, 3, 4, 0, 6, 3, 0], progB: [3, 4, 5, 6, 3, 4, 6, 6], beats: 4, leads: ['horn', 'flute', 'strings'], comp: 'harp', bass: 'drive', bassInst: 'pizz', pad: 0.7, drums: 'gallop', density: 0.7, seed: 181, arp: 'always' },
};

/** Progressões de 8 compassos (graus da escala) para variar de fase para fase. */
const PROGS: number[][] = [
  [0, 3, 4, 0, 5, 3, 1, 4],
  [0, 5, 3, 4, 0, 5, 1, 4],
  [0, 4, 5, 3, 0, 4, 3, 4],
  [0, 2, 3, 4, 5, 3, 1, 4],
  [0, 6, 5, 4, 0, 6, 3, 4],
  [5, 3, 0, 4, 5, 3, 1, 4],
  [3, 4, 0, 5, 3, 4, 1, 4],
  [0, 0, 3, 3, 5, 4, 3, 4],
  [0, 1, 0, 6, 0, 1, 3, 4],
  [3, 0, 4, 5, 3, 0, 1, 4],
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A música de uma fase: mesma "cara" da área, mas tom, andamento, progressão, solista e melodia próprios. */
function variantOf(base: Style, id: string): Style {
  const h = hash(id);
  const r = rng(h);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)];
  const penta = base.mode.length === 5;
  const leads = [...base.leads];
  // O solista roda pela lista da área (o primeiro é o mais comum).
  const lead = leads[Math.floor(r() * (leads.length + 1)) % leads.length];
  return {
    ...base,
    seed: (h % 99991) + 7,
    root: base.root + pick([-3, -2, 0, 0, 2, 3, 5]),
    bpm: Math.round(base.bpm * (0.9 + r() * 0.2)),
    progA: penta ? base.progA.map((d, i) => base.progA[(i + (h % 4) * 2) % 8] ?? d) : r() < 0.3 ? base.progA : pick(PROGS),
    progB: penta ? base.progB : r() < 0.3 ? base.progB : pick(PROGS),
    density: Math.max(0.3, Math.min(0.8, base.density + (r() - 0.5) * 0.2)),
    arp: r() < 0.25 ? (base.arp === 'always' ? 'B' : 'always') : base.arp,
    leads: [lead],
  };
}

interface Note { midi: number; len: number }
interface Step {
  lead?: Note;
  /** Acorde sustentado pelas cordas (notas MIDI) durante 'padLen' colcheias. */
  pad?: number[];
  padLen?: number;
  timp?: number;
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
          // Teto no Lá5: a melodia fica na região cantável da ocarina.
          let midi = midiOf(d, leadOct - 1);
          while (midi > 81) midi -= 12;
          return { midi, len };
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
        if (variant === 1 && step.lead && bi % 2 === 1 && s === 0 && step.lead.midi <= 60) step.lead = { ...step.lead, midi: step.lead.midi + 12 };
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
          const tones = chordTones(c).map((t) => midiOf(t, 1));
          step.arp = [tones[s % 3], tones[(s + 1) % 3]];
        }
        // Cordas: o acorde inteiro, sustentado pelo compasso.
        if (s === 0 && st.pad > 0) {
          step.pad = chordTones(c).map((t) => midiOf(t, 1));
          step.padLen = spb;
        }
        if (s === 0 && st.timpani && bi % 2 === 0) step.timp = root - 12 < 36 ? root : root - 12;
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
// Instrumentos
// ------------------------------------------------------------------

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const waves = new Map<string, PeriodicWave>();

function wave(a: AudioContext, key: string, harmonics: number[]): PeriodicWave {
  let w = waves.get(key);
  if (!w) {
    const re = new Float32Array(harmonics.length + 1);
    const im = new Float32Array(harmonics.length + 1);
    harmonics.forEach((x, i) => (im[i + 1] = x));
    w = a.createPeriodicWave(re, im);
    waves.set(key, w);
  }
  return w;
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Sopro (ocarina, flauta): tom quase puro, ataque macio, vibrato que entra depois e um fio de ar. */
function wind(a: AudioContext, dest: AudioNode, kind: 'ocarina' | 'flute', f: number, t: number, dur: number, v: number): void {
  const o = a.createOscillator();
  o.setPeriodicWave(kind === 'ocarina' ? wave(a, 'ocarina', [1, 0.1, 0.05]) : wave(a, 'flute', [1, 0.32, 0.1, 0.04]));
  o.frequency.setValueAtTime(f * 0.985, t);
  o.frequency.linearRampToValueAtTime(f, t + 0.05); // a nota "chega" de baixo, como no sopro
  const lfo = a.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = a.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(dur > 0.3 ? f * 0.007 : 0, t + Math.min(dur, 0.35));
  lfo.connect(depth).connect(o.frequency);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.045);
  g.gain.setValueAtTime(v * 0.92, t + Math.max(0.05, dur - 0.06));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.07);
  o.connect(g).connect(dest);
  // Ar do sopro: ruído estreito em volta da nota, só no ataque.
  const n = a.createBufferSource();
  n.buffer = noiseBuffer(a);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(1800, f * 2);
  bp.Q.value = 3;
  const ng = a.createGain();
  ng.gain.setValueAtTime(v * (kind === 'flute' ? 0.5 : 0.3), t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  n.connect(bp).connect(ng).connect(dest);
  n.start(t, Math.random() * 0.5, 0.15);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.1);
  lfo.stop(t + dur + 0.1);
}

/** Corda dedilhada (harpa, violão, pizzicato): Karplus-Strong, uma amostra por nota (guardada). */
const plucks = new Map<string, AudioBuffer>();
function pluckBuffer(a: AudioContext, midi: number, kind: 'harp' | 'guitar' | 'pizz'): { buf: AudioBuffer; rate: number } {
  const sr = a.sampleRate;
  const f = freq(midi);
  const N = Math.max(2, Math.round(sr / f));
  const key = `${kind}${midi}`;
  let buf = plucks.get(key);
  if (!buf) {
    const dur = kind === 'pizz' ? 0.7 : kind === 'guitar' ? 1.3 : 1.8;
    const decay = kind === 'pizz' ? 0.988 : kind === 'guitar' ? 0.995 : 0.997;
    const len = Math.floor(sr * dur);
    buf = a.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    // Dedo macio: suaviza a excitação (harpa mais redonda que o violão).
    for (let k = 0; k < (kind === 'guitar' ? 2 : 4); k++) for (let i = 0; i < N; i++) ring[i] = (ring[i] + ring[(i + 1) % N]) / 2;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const j = i % N;
      const v = ring[j];
      d[i] = v;
      ring[j] = decay * 0.5 * (v + ring[(j + 1) % N]);
      peak = Math.max(peak, Math.abs(v));
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < len; i++) d[i] = (d[i] / (peak || 1)) * (i > len - fade ? (len - i) / fade : 1);
    plucks.set(key, buf);
  }
  return { buf, rate: f / (sr / N) };
}

function pluck(a: AudioContext, dest: AudioNode, kind: 'harp' | 'guitar' | 'pizz', midi: number, t: number, v: number): void {
  const { buf, rate } = pluckBuffer(a, midi, kind);
  const src = a.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = a.createGain();
  g.gain.value = v;
  src.connect(g).connect(dest);
  src.start(t);
}

/** Naipe de cordas / trompa / contrabaixo: dentes de serra desafinados por um filtro, com arco lento. */
function bowed(a: AudioContext, dest: AudioNode, kind: 'strings' | 'horn' | 'bass' | 'pad', f: number, t: number, dur: number, v: number): void {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = kind === 'horn' ? 1.2 : 0.6;
  const cut = kind === 'horn' ? Math.min(1500, f * 3.2) : kind === 'bass' ? 420 : kind === 'pad' ? Math.min(1100, f * 3) : Math.min(1900, f * 4);
  const attack = kind === 'pad' ? 0.3 : kind === 'strings' ? 0.09 : kind === 'horn' ? 0.06 : 0.04;
  // O filtro abre com o ataque (metais e arco "acendem" o timbre).
  lp.frequency.setValueAtTime(cut * 0.45, t);
  lp.frequency.linearRampToValueAtTime(cut, t + attack * 1.5);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + attack);
  g.gain.setValueAtTime(v * 0.9, t + Math.max(attack + 0.01, dur - 0.08));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + (kind === 'pad' ? 0.5 : 0.14));
  const end = t + dur + (kind === 'pad' ? 0.55 : 0.18);
  for (const cents of kind === 'horn' ? [0] : [-7, 6]) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = cents;
    o.connect(lp);
    o.start(t);
    o.stop(end);
  }
  if (kind === 'strings') {
    const lfo = a.createOscillator();
    lfo.frequency.value = 5.6;
    const dg = a.createGain();
    dg.gain.value = 0.06;
    lfo.connect(dg).connect(g.gain);
    lfo.start(t);
    lfo.stop(end);
  }
  lp.connect(g).connect(dest);
}

/** Barras e sinos (marimba, celesta) e órgão: soma de senoides. */
function tone(a: AudioContext, dest: AudioNode, kind: 'marimba' | 'celesta' | 'organ', f: number, t: number, dur: number, v: number): void {
  const o = a.createOscillator();
  o.setPeriodicWave(kind === 'marimba' ? wave(a, 'marimba', [1, 0, 0, 0.3]) : kind === 'celesta' ? wave(a, 'celesta', [1, 0, 0.18, 0, 0, 0.06]) : wave(a, 'organ', [1, 0.6, 0.25, 0.35, 0, 0.1]));
  o.frequency.value = f;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  if (kind === 'organ') {
    g.gain.linearRampToValueAtTime(v, t + 0.05);
    g.gain.setValueAtTime(v, t + Math.max(0.06, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.15);
    return;
  }
  const tail = kind === 'celesta' ? Math.max(dur, 0.5) + 0.7 : Math.max(dur, 0.2) + 0.22;
  g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(v * 0.3, t + Math.min(0.18, tail * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + tail + 0.02);
}

function playLead(a: AudioContext, dest: AudioNode, inst: Lead, midi: number, t: number, dur: number): void {
  const f = freq(midi);
  switch (inst) {
    case 'ocarina':
    case 'flute':
      return wind(a, dest, inst, f, t, dur, 0.16);
    case 'horn':
      return bowed(a, dest, 'horn', f / 2, t, dur, 0.2);
    case 'strings':
      return bowed(a, dest, 'strings', f, t, dur, 0.11);
    case 'harp':
    case 'guitar':
      return pluck(a, dest, inst, midi, t, 0.42);
    default:
      return tone(a, dest, inst, inst === 'organ' ? f / 2 : f, t, dur, inst === 'organ' ? 0.09 : 0.17);
  }
}

function noiseHit(a: AudioContext, dest: AudioNode, t: number, dur: number, v: number, center: number): void {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = center;
  f.Q.value = 0.9;
  const g = a.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

/** Tambores de pele (bumbo, tom, tímpano): senoide que cai de altura. */
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

// ------------------------------------------------------------------
// Tocador
// ------------------------------------------------------------------

let bus: GainNode | null = null;
let leadBus: GainNode | null = null;
let playing: { key: string; track: Track; style: Style; steps: Step[]; i: number; next: number } | null = null;
let timer: number | undefined;

function musicVol(): number {
  const s = settings();
  return (s.master / 10) * (s.music / 10);
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
  const lead = st.leads[0];
  // Aba escondida ou travada: não despeja um monte de notas atrasadas de uma vez.
  if (playing.next < a.currentTime - 0.1) playing.next = a.currentTime + 0.05;
  while (playing.next < a.currentTime + 0.25) {
    const step = steps[playing.i % steps.length];
    const odd = playing.i % 2 === 1;
    const t = playing.next + (odd ? (st.swing ?? 0) * eighth : 0);
    if (step.lead) playLead(a, leadBus, lead, step.lead.midi, t, step.lead.len * eighth * 0.94);
    if (step.bass) {
      if (st.bassInst === 'pizz') pluck(a, bus, 'pizz', step.bass.midi, t, 0.55);
      else bowed(a, bus, 'bass', freq(step.bass.midi), t, step.bass.len * eighth * 0.95, 0.2);
    }
    if (step.pad && st.pad > 0) for (const m of step.pad) bowed(a, bus, 'pad', freq(m), t, (step.padLen ?? 8) * eighth * 0.98, 0.035 * st.pad);
    if (step.arp)
      step.arp.forEach((m, k) => {
        const at = t + k * eighth * 0.5;
        if (st.comp === 'harp' || st.comp === 'guitar') pluck(a, bus!, st.comp, m, at, st.comp === 'guitar' ? 0.2 : 0.24);
        else tone(a, bus!, st.comp, freq(m), at, eighth * 0.45, 0.06);
      });
    if (step.timp !== undefined) drum(a, bus, t, freq(step.timp) * 1.25, freq(step.timp), 0.7, 0.3);
    if (step.kick) drum(a, bus, t, 130, 48, 0.18, 0.2);
    if (step.tom) drum(a, bus, t, 200, 95, 0.22, 0.17);
    if (step.snare) noiseHit(a, bus, t, 0.13, 0.09, 650);
    if (step.hat) noiseHit(a, bus, t, 0.05, 0.035, 1400);
    playing.i++;
    playing.next += eighth;
  }
}

/** Sala: reverberação feita de ruído que decai (sem arquivo de impulso). */
function room(a: AudioContext): AudioBuffer {
  const len = Math.floor(a.sampleRate * 2.2);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 3);
      lp += ((Math.random() * 2 - 1) - lp) * 0.25; // cauda abafada
      d[i] = lp * env;
    }
  }
  return buf;
}

function buses(a: AudioContext): void {
  if (bus) return;
  bus = a.createGain();
  bus.gain.value = musicVol();
  // Passa-baixa em tudo: nenhuma frequência estridente chega à saída.
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  lp.Q.value = 0.5;
  const lp2 = a.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.frequency.value = 4200;
  lp2.Q.value = 0.5;
  lp.connect(lp2).connect(a.destination);
  bus.connect(lp);
  const verb = a.createConvolver();
  verb.buffer = room(a);
  const wet = a.createGain();
  wet.gain.value = 0.55;
  bus.connect(verb).connect(wet).connect(lp);
  leadBus = a.createGain();
  leadBus.connect(bus);
}

/**
 * Toca um tema (se já estiver tocando, continua de onde está). Com 'variant' (o id da fase),
 * a música é a versão daquela fase: outro tom, andamento, progressão, solista e melodia.
 */
export function playMusic(track: Track, variant?: string): void {
  const key = variant ? `${track}:${variant}` : track;
  if (playing?.key === key) return;
  const a = audio();
  if (!a) return;
  buses(a);
  const style = variant ? variantOf(STYLES[track], variant) : STYLES[track];
  // Eco só nos temas que pedem (pântano, cavernas, memórias).
  leadBus!.disconnect();
  leadBus = a.createGain();
  leadBus.connect(bus!);
  if (style.echo) {
    const d = a.createDelay(1);
    d.delayTime.value = Math.min(0.95, (60 / style.bpm) * 0.75);
    const fb = a.createGain();
    fb.gain.value = 0.3;
    const wet = a.createGain();
    wet.gain.value = 0.4;
    leadBus.connect(d);
    d.connect(fb).connect(d);
    d.connect(wet).connect(bus!);
  }
  playing = { key, track, style, steps: compose(style), i: 0, next: a.currentTime + 0.12 };
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

/** Abaixa a música por um instante (lembranças) e volta. */
export function duckMusic(ms: number): void {
  const a = audio();
  if (!a || !leadBus) return;
  const g = leadBus.gain;
  g.cancelScheduledValues(a.currentTime);
  g.setTargetAtTime(0.25, a.currentTime, 0.08);
  g.setTargetAtTime(1, a.currentTime + ms / 1000, 0.3);
}

/** Vinhetas curtas: vitória de fase, selo quebrado, derrota, lembrança. */
export function jingle(kind: 'win' | 'seal' | 'lose' | 'flash'): void {
  const a = audio();
  if (!a) return;
  buses(a);
  if (musicVol() <= 0) return;
  const t = a.currentTime + 0.05;
  if (kind === 'flash') {
    // Lembrança: três notas de caixinha de música por cima da música (que continua).
    [76, 72, 79].forEach((m, i) => tone(a, bus!, 'celesta', freq(m), t + i * 0.22, 0.6, 0.16));
    return;
  }
  stopMusic();
  const seq: [number, number, number][] =
    kind === 'win'
      ? [[60, 0, 0.14], [64, 0.14, 0.14], [67, 0.28, 0.14], [72, 0.42, 0.9], [67, 0.42, 0.9], [64, 0.42, 0.9]]
      : kind === 'seal'
        ? [[57, 0, 0.3], [60, 0.3, 0.3], [63, 0.6, 0.3], [66, 0.9, 1.2], [54, 0.9, 1.2]]
        : [[64, 0, 0.2], [63, 0.2, 0.2], [62, 0.4, 0.2], [61, 0.6, 0.8]];
  for (const [m, dt, d] of seq) {
    if (kind === 'win') {
      bowed(a, bus!, 'horn', freq(m) / 2, t + dt, d, 0.18);
      pluck(a, bus!, 'harp', m, t + dt, 0.35);
    } else bowed(a, bus!, 'strings', freq(m), t + dt, d, 0.12);
  }
}
