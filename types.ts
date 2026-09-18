
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable';
export type MusicMood = 'menu' | 'exploration' | 'combat' | 'boss' | 'town' | 'dungeon' | 'mystery' | 'victory' | 'defeat';
export type StatusType = 'poison' | 'stun' | 'buff_str' | 'buff_def' | 'regen';
export type GameLength = 'quick' | 'medium' | 'long' | 'endless';
export type GameTheme = 'dark_fantasy' | 'steampunk' | 'cosmic_horror' | 'classic_high';
export type GameMode = 'simple' | 'complete';
export type SkillTier = 'simple' | 'medium' | 'advanced';
export type CharacterClass = 'Guerreiro' | 'Mago' | 'Ladino';
export type SkillType = 'physical' | 'magical' | 'utility' | 'heal';
export type SkillTarget = 'single' | 'aoe' | 'self' | 'ally';

export interface Skill {
  id: string;
  name: string;
  tier: SkillTier;
  description: string;
  class: CharacterClass;
  manaCost: number;
  damage?: string; // e.g., "1d8 + 2"
  type: SkillType;
  target: SkillTarget;
  effect?: string; // e.g., "Stun", "Burn"
}

export interface StatusEffect {
  name: string;
  type: StatusType;
  duration: number;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  effect?: {
    hp?: number;
    str?: number;
    def?: number;
  };
  value: number;
}

export interface Character {
  name: string;
  class: CharacterClass | string;
  hp: number;
  maxHp: number;
  mp: number;     // Mana Points
  maxMp: number;  // Max Mana Points
  level: number;
  gold: number;
  xp: number;
  strength: number;
  defense: number;
  inventory: Item[];
  equipment: any;
  status: StatusEffect[];
  skills: Skill[];
}

export interface GameChoice {
  text: string;
  action: string;
  type?: 'normal' | 'aoe' | 'custom';
}

export interface GameConfig {
  length: GameLength;
  theme: GameTheme;
  mode: GameMode;
}

export interface AIResponse {
  story: string;
  choices: GameChoice[];
  imagePrompt: string;
  musicMood?: MusicMood;
  statusUpdate: {
    hpChange?: number;
    mpChange?: number; // MP change tracking
    goldChange?: number;
    xpChange?: number;
    gameOver?: boolean;
    newStatus?: StatusEffect[];
    learnSkill?: boolean;
  };
  itemsFound?: Item[];
  eventoGerado: {
    conteudo: string;
    causadoPor: string[]; // ids entre os eventos recentes fornecidos no prompt
    tensao: number;
  };
}

export interface ValidationResponse {
  isPlausible: boolean;
  reason?: string;
  motive?: string;
}

export interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

// Arcos causais emergentes: início, meio e fim são propriedades calculadas
// do grafo de causalidade entre eventos (ver services/arcos.ts), nunca
// fases declaradas de antemão. Nenhum tipo abaixo carrega noção de ato,
// estágio ou estrutura narrativa pré-definida.
export type PapelCausal = 'origem' | 'desdobramento' | 'desfecho' | 'ponta' | 'satelite';

export interface StoryEvent {
  id: string;
  turno: number;
  conteudo: string; // resumo curto do que aconteceu, não a prosa inteira
  causadoPor: string[]; // ids de StoryEvent anteriores; vazio = evento fundador
  tramaId: string | null; // atribuído pela detecção de componentes, não pela IA
  tensao: number; // 0 a 10, declarado pela IA no turno
  ehKernel: boolean; // calculado: true se tem alguma aresta causal
}

export interface Trama {
  id: string;
  eventoInicialId: string;
  eventoFinalId: string | null; // null enquanto aberta
  turnosSemNovoEvento: number; // para o limiar de estabilidade
  status: 'aberta' | 'estavel' | 'fechada';
  narracaoFechamento?: string | null; // gerada pelo curador quando a trama fecha
}

export interface MetricaConvergencia {
  turno: number;
  componentesAbertos: number; // tramas ainda produzindo desdobramento
  componentesFechados: number; // com origem e desfecho estável
  pontasSoltas: number; // eventos de grau de saída zero em tramas abertas
  eventosFundadores: number; // acumulado de eventos com causadoPor vazio
  razaoAmarracao: number; // arestas causais / total de eventos
}

export interface GameState {
  storyText: string;
  choices: GameChoice[];
  currentImage?: string;
  isGameOver: boolean;
  history: string[];
  activeQuests: any[];
  eventos: StoryEvent[];
  tramas: Trama[];
  metricas: MetricaConvergencia[];
  rejectionMessage: {
    text: string;
    motive: string;
  } | null;
  skillsLearnedCount: number;
}
