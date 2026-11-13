import { LEVELS } from './level';
import { isDone, isFreePlay } from './progress';

/**
 * Habilidades da caveira, liberadas ao terminar certas fases do modo história. Como as áreas
 * abrem em qualquer ordem, cada uma é liberada nas áreas fixas (Maré, Pradaria) ou na própria
 * área que a exige.
 */
export type AbilityId = 'carry' | 'flip' | 'hammer' | 'axe' | 'pickaxe';

export interface Ability {
  id: AbilityId;
  name: string;
  /** Textura do ícone (ferramentas e recursos do Tiny Swords). */
  icon: string;
  /** Liberada ao concluir esta fase (id em LEVELS). */
  after: string;
  how: string;
}

export const ABILITIES: Ability[] = [
  {
    id: 'carry',
    name: 'Mãos de Osso',
    icon: 'key_item',
    after: 'shore',
    how: 'PEGAR levanta chaves, ovelhas e outros objetos sobre a cabeça. PEGAR de novo solta; ATACAR arremessa.',
  },
  {
    id: 'flip',
    name: 'Cambalhota e Parada de Mão',
    icon: 'tool_sword',
    after: 'key1',
    how: 'Agachado, aperte PULAR: salto de parada de mão (bem mais alto). Correndo, vire para o outro lado e pule: cambalhota para trás (também mais alta).',
  },
  {
    id: 'hammer',
    name: 'Martelo',
    icon: 'tool_hammer',
    after: 'chase',
    how: 'No ar, segure ▼ e aperte ATACAR: martelada no chão. Quebra pedras de ouro rachadas e atordoa quem estiver perto.',
  },
  {
    id: 'axe',
    name: 'Machado',
    icon: 'tool_axe',
    after: 'gun1',
    how: 'ATACAR perto de uma árvore a derruba para o lado em que você olha: ela vira uma ponte.',
  },
  {
    id: 'pickaxe',
    name: 'Picareta',
    icon: 'tool_pickaxe',
    after: 'key4',
    how: 'Encostar numa parede no ar crava a picareta: a caveira sobe sozinha pela parede, como a aranha.',
  },
];

/** A habilidade já foi liberada neste save? (no modo livre, todas.) */
export function hasAbility(id: AbilityId): boolean {
  if (isFreePlay()) return true;
  const a = ABILITIES.find((x) => x.id === id);
  if (!a) return false;
  return isDone(a.after);
}

/** Habilidades liberadas ao concluir a fase de índice `index`. */
export function unlockedBy(index: number): Ability[] {
  const id = LEVELS[index]?.id;
  return ABILITIES.filter((a) => a.after === id);
}
