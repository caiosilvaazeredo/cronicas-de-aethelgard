import { AREAS } from './areas';
import { DUNGEON_SLOT, baseLevel, enemyPools, genScreen } from './dungeon';
import { LEVELS, type LevelDef, type ScreenDef } from './level';
import { addCoins, addStat, addXp, getLevel, getStat } from './progress';
import { rng } from '../ui/pixelart';
import type { EnemyId } from './characters';

/**
 * Jogos da vila feitos com as fases de verdade (mesmo combate e mesmos pulos):
 * - Arena do Mestre Rufo: três telas de inimigos da Pradaria; cada uma só abre depois de limpa.
 * - Corrida do Goblin: um percurso de buracos e plataformas; quanto mais rápido, mais ouro.
 * Sem vidas: cair ou morrer encerra a tentativa e volta para a vila.
 */
export type VillageGame = 'arena' | 'race';

export interface VillageResult {
  title: string;
  text: string;
}

/** Resultado para a vila mostrar quando voltar. */
let pending: VillageResult | undefined;
export function takeVillageResult(): VillageResult | undefined {
  const r = pending;
  pending = undefined;
  return r;
}

function todayKey(kind: string): string {
  const d = new Date();
  return `mg_${kind}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Fator da recompensa: cai 25% a cada vez que se joga o mesmo jogo no dia (mínimo 25%). */
export function dailyFactor(kind: string): { k: number; plays: number } {
  const plays = getStat(todayKey(kind));
  return { k: Math.max(0.25, 1 - plays * 0.25), plays };
}

export function countPlay(kind: string): void {
  addStat(todayKey(kind));
}

/** Escreve a fase do jogo no espaço reservado e devolve o índice para jogar. */
export function prepareVillageGame(kind: VillageGame): number {
  const area = AREAS.find((a) => a.id === 'pradaria') ?? AREAS[0];
  const base = baseLevel(area);
  const pools = enemyPools(area);
  const r = rng(Date.now() & 0xffff);
  const pick = <T,>(list: T[]): T => list[Math.floor(r() * list.length)];
  const screens: ScreenDef[] = [];
  if (kind === 'arena') {
    // Mais inimigos conforme o nível da caveira (sem armadura extra: é treino).
    const extra = Math.min(2, Math.floor(getLevel() / 4));
    for (let i = 0; i < 3; i++) {
      const list: EnemyId[] = [];
      for (let k = 0; k < 2 + i + extra; k++) list.push(pick(pools.normal));
      if (i === 2) list[0] = pick(pools.elite);
      screens.push(genScreen(r, base.theme, list, i === 0));
    }
  } else {
    // Percurso: quatro telas de pulos e um inimigo de vez em quando.
    for (let i = 0; i < 4; i++) screens.push(genScreen(r, base.theme, i > 0 && r() < 0.6 ? [pick(pools.normal)] : [], i === 0));
  }
  const def: LevelDef = {
    id: kind === 'arena' ? 'village_arena' : 'village_race',
    name: kind === 'arena' ? 'Arena do Mestre Rufo' : 'Corrida do Goblin',
    theme: base.theme,
    tiles: base.tiles,
    swamp: base.swamp,
    ember: base.ember,
    secret: true,
    screens,
    clearToAdvance: kind === 'arena',
    storyStart: [0, 1],
    versusStart: [3, 16],
    intro: kind === 'arena' ? 'Limpe as três telas! Cada inimigo vale ouro.' : 'Chegue ao fim o mais rápido que puder!',
    village: { kind },
  };
  LEVELS[DUNGEON_SLOT] = def;
  return DUNGEON_SLOT;
}

/** Fim do jogo: paga o prêmio (menor se já jogou muito hoje) e guarda o texto para a vila. */
export function finishVillageGame(kind: VillageGame, won: boolean, stats: { secs: number; kills: number }): { gold: number; xp: number; ups: number } {
  const { k, plays } = dailyFactor(kind);
  countPlay(kind);
  let gold: number;
  let xp: number;
  let line: string;
  if (kind === 'arena') {
    gold = stats.kills * 3 + (won ? 10 : 0);
    xp = stats.kills * 4 + (won ? 15 : 0);
    line = won ? `Inimigos derrotados: ${stats.kills}\nArena limpa!` : `Inimigos derrotados: ${stats.kills}`;
  } else {
    gold = won ? Math.max(5, Math.round(45 - stats.secs)) : 0;
    xp = won ? 15 : 0;
    line = won ? `Tempo: ${stats.secs.toFixed(1)}s` : 'Não chegou ao fim.';
  }
  gold = Math.round(gold * k);
  xp = Math.round(xp * k);
  addCoins(gold);
  const ups = addXp(xp);
  const note = k < 1 ? `\n(Recompensa reduzida: você já jogou ${plays}x hoje.)` : '';
  pending = {
    title: kind === 'arena' ? 'MESTRE RUFO' : 'GOBLIN DA BARRACA',
    text: `${line}\nOuro: +${gold}   ·   XP: +${xp}${note}`,
  };
  return { gold, xp, ups };
}
