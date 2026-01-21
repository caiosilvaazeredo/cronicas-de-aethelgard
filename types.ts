
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
    currentAct: number;
    newStatus?: StatusEffect[];
    learnSkill?: boolean;
  };
  itemsFound?: Item[];
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

export interface GameState {
  storyText: string;
  choices: GameChoice[];
  currentImage?: string;
  isGameOver: boolean;
  history: string[];
  activeQuests: any[];
  currentAct: number;
  rejectionMessage: {
    text: string;
    motive: string;
  } | null;
  skillsLearnedCount: number;
}
