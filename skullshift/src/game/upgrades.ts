import { addCoins, getCoins, ownedUpgrades, saveUpgrade } from './progress';

/**
 * Aprimoramentos comprados no Empório da Orelha-Preta (como a loja do Cuphead): custam ouro, que
 * a caveira junta derrotando inimigos (1), pegando presentes (3), terminando fases (5) e
 * derrubando reis (15). Valem só no modo história.
 *
 * Lore: a loja é de uma ovelha de orelha preta que não fala (só a caveira e o Xamã conversam):
 * ela "responde" por placas de madeira. É a ovelha que sempre fugia, nas lembranças do aldeão.
 */
export type UpgradeId = 'stubborn' | 'candle' | 'reflex' | 'goldtooth' | 'cloak' | 'magnet' | 'deflect';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  /** Textura do ícone (itens e recursos que já existem no jogo). */
  icon: string;
  price: number;
  how: string;
  /** O que a placa da ovelha diz depois da compra. */
  sign: string;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'stubborn',
    name: 'Osso Teimoso',
    icon: 'skull_avatar',
    price: 60,
    how: 'Transformado, o golpe que te mataria só desfaz a transformação: você volta a ser a caveira e continua de pé.',
    sign: 'Béé. (Cai a pele, fica o osso.)',
  },
  {
    id: 'deflect',
    name: 'Espada Rebatedora',
    icon: 'tool_sword',
    price: 70,
    how: 'O golpe de espada rebate QUALQUER projétil que encostar nela: ossos, arpões, bolotas, fogo... e ele volta para quem atirou.',
    sign: 'Béé. (Bata no que voa.)',
  },
  {
    id: 'candle',
    name: 'Vela Extra',
    icon: 'torch_item',
    price: 40,
    how: 'Uma vida a mais em cada fase antes de ela recomeçar.',
    sign: 'Béé. (Não deixe apagar.)',
  },
  {
    id: 'reflex',
    name: 'Reflexo de Osso',
    icon: 'guard_arc',
    price: 35,
    how: 'A janela do CONTRA (tocar para trás na hora do golpe) fica bem maior.',
    sign: 'Béé. (Para trás, depressa.)',
  },
  {
    id: 'cloak',
    name: 'Manto de Nuvem',
    icon: 'cloud_05',
    price: 30,
    how: 'Ao renascer, você fica intocável pelo dobro do tempo.',
    sign: 'Béé. (Feito da nuvem dele. Não conte.)',
  },
  {
    id: 'magnet',
    name: 'Ímã de Ossos',
    icon: 'bone',
    price: 25,
    how: 'O item da caixa de reserva cai reto e duas vezes mais rápido, direto em você.',
    sign: 'Béé. (O que é seu volta.)',
  },
  {
    id: 'goldtooth',
    name: 'Dente de Ouro',
    icon: 'gold',
    price: 45,
    how: 'Inimigos derrotados dão o dobro de ouro.',
    sign: 'Béé. (Bom negócio. Para mim.)',
  },
];

export function hasUpgrade(id: UpgradeId): boolean {
  return ownedUpgrades().includes(id);
}

/** Compra, se houver ouro. Devolve true se comprou. */
export function buyUpgrade(id: UpgradeId): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || hasUpgrade(id) || getCoins() < u.price) return false;
  addCoins(-u.price);
  saveUpgrade(id);
  return true;
}
