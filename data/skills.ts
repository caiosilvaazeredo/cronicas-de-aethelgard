
import { Skill } from '../types';

export const SKILL_DATABASE: Skill[] = [
  // --- GUERREIRO (WARRIOR) - Uses Stamina (MP) for Physical Feats ---
  // Simple (Cost: 3-5 MP)
  { id: 'w_s_1', name: 'Golpe Pesado', tier: 'simple', description: 'Um ataque básico com força total.', class: 'Guerreiro', manaCost: 3, damage: '1d8+Str', type: 'physical', target: 'single' },
  { id: 'w_s_2', name: 'Bloqueio', tier: 'simple', description: 'Reduz o dano do próximo ataque.', class: 'Guerreiro', manaCost: 2, type: 'utility', target: 'self', effect: 'Defesa +5' },
  { id: 'w_s_3', name: 'Empurrão', tier: 'simple', description: 'Afasta o inimigo.', class: 'Guerreiro', manaCost: 3, damage: '1d4', type: 'physical', target: 'single', effect: 'Knockback' },
  { id: 'w_s_4', name: 'Grito de Guerra', tier: 'simple', description: 'Aumenta levemente o ataque.', class: 'Guerreiro', manaCost: 5, type: 'utility', target: 'self', effect: 'Força +2' },
  { id: 'w_s_5', name: 'Investida', tier: 'simple', description: 'Corre em direção ao alvo.', class: 'Guerreiro', manaCost: 4, damage: '1d6', type: 'physical', target: 'single' },
  { id: 'w_s_6', name: 'Corte Lateral', tier: 'simple', description: 'Atinge inimigos adjacentes.', class: 'Guerreiro', manaCost: 5, damage: '1d6 (x2)', type: 'physical', target: 'aoe' },
  { id: 'w_s_7', name: 'Postura Defensiva', tier: 'simple', description: 'Troca ataque por defesa.', class: 'Guerreiro', manaCost: 0, type: 'utility', target: 'self' },
  { id: 'w_s_8', name: 'Cabeçada', tier: 'simple', description: 'Pode atordoar, mas causa dano a si.', class: 'Guerreiro', manaCost: 4, damage: '1d6', type: 'physical', target: 'single', effect: 'Stun' },
  { id: 'w_s_9', name: 'Chute Espartano', tier: 'simple', description: 'Empurra o inimigo para longe.', class: 'Guerreiro', manaCost: 4, damage: '1d8', type: 'physical', target: 'single' },
  { id: 'w_s_10', name: 'Provocação', tier: 'simple', description: 'Atrai a atenção dos inimigos.', class: 'Guerreiro', manaCost: 2, type: 'utility', target: 'aoe' },
  
  // Medium (Cost: 8-12 MP)
  { id: 'w_m_1', name: 'Torvelinho', tier: 'medium', description: 'Gira atingindo todos ao redor.', class: 'Guerreiro', manaCost: 10, damage: '2d6 Aoe', type: 'physical', target: 'aoe' },
  { id: 'w_m_2', name: 'Golpe Sísmico', tier: 'medium', description: 'Racha o chão e atordoa.', class: 'Guerreiro', manaCost: 12, damage: '1d10', type: 'physical', target: 'aoe', effect: 'Stun' },
  { id: 'w_m_3', name: 'Berserker', tier: 'medium', description: 'Dobra dano, zera defesa.', class: 'Guerreiro', manaCost: 10, type: 'utility', target: 'self', effect: 'Dano x2' },
  { id: 'w_m_4', name: 'Pele de Ferro', tier: 'medium', description: 'Reduz muito o dano físico.', class: 'Guerreiro', manaCost: 8, type: 'utility', target: 'self', effect: 'Defesa +10' },
  { id: 'w_m_5', name: 'Execução', tier: 'medium', description: 'Mata inimigos com pouco HP.', class: 'Guerreiro', manaCost: 12, damage: '4d8', type: 'physical', target: 'single' },
  
  // Advanced (Cost: 15-25 MP)
  { id: 'w_a_1', name: 'Avatar da Guerra', tier: 'advanced', description: 'Torna-se imbatível por 3 turnos.', class: 'Guerreiro', manaCost: 20, type: 'utility', target: 'self', effect: 'Invulnerável' },
  { id: 'w_a_2', name: 'Lâmina do Julgamento', tier: 'advanced', description: 'Dano massivo sagrado.', class: 'Guerreiro', manaCost: 25, damage: '10d10', type: 'magical', target: 'single' },
  { id: 'w_a_3', name: 'Terremoto', tier: 'advanced', description: 'Dano em área global.', class: 'Guerreiro', manaCost: 25, damage: '6d8', type: 'physical', target: 'aoe' },
  { id: 'w_a_4', name: 'Imortalidade', tier: 'advanced', description: 'Não morre por 5 turnos.', class: 'Guerreiro', manaCost: 30, type: 'utility', target: 'self' },
  { id: 'w_a_5', name: 'Golpe Dimensional', tier: 'advanced', description: 'Corta o tecido da realidade.', class: 'Guerreiro', manaCost: 22, damage: '8d8', type: 'magical', target: 'single' },

  // --- MAGO (MAGE) - High MP Costs, High Effect ---
  // Simple (Cost: 2-6 MP)
  { id: 'm_s_1', name: 'Míssil Mágico', tier: 'simple', description: 'Dano arcano básico e teleguiado.', class: 'Mago', manaCost: 2, damage: '1d4+1', type: 'magical', target: 'single' },
  { id: 'm_s_2', name: 'Toque Chocante', tier: 'simple', description: 'Dano elétrico ao tocar.', class: 'Mago', manaCost: 3, damage: '1d8', type: 'magical', target: 'single' },
  { id: 'm_s_3', name: 'Luz', tier: 'simple', description: 'Ilumina áreas escuras.', class: 'Mago', manaCost: 1, type: 'utility', target: 'aoe' },
  { id: 'm_s_4', name: 'Escudo Arcano', tier: 'simple', description: 'Bloqueia um pouco de dano.', class: 'Mago', manaCost: 5, type: 'utility', target: 'self', effect: '+5 Def' },
  { id: 'm_s_5', name: 'Rajada de Vento', tier: 'simple', description: 'Empurra inimigos.', class: 'Mago', manaCost: 4, damage: '1d6', type: 'magical', target: 'aoe' },
  { id: 'm_s_6', name: 'Chama Pequena', tier: 'simple', description: 'Acende tochas ou queima leve.', class: 'Mago', manaCost: 1, damage: '1d4', type: 'magical', target: 'single' },
  { id: 'm_s_7', name: 'Raio de Gelo', tier: 'simple', description: 'Lentidão no alvo.', class: 'Mago', manaCost: 3, damage: '1d6', type: 'magical', target: 'single', effect: 'Slow' },
  { id: 'm_s_15', name: 'Dardo de Fogo', tier: 'simple', description: 'Ataque de fogo à distância.', class: 'Mago', manaCost: 4, damage: '1d10', type: 'magical', target: 'single' },
  { id: 'm_s_17', name: 'Graxa', tier: 'simple', description: 'Cria chão escorregadio.', class: 'Mago', manaCost: 5, type: 'utility', target: 'aoe', effect: 'Prone' },
  { id: 'm_s_20', name: 'Faísca', tier: 'simple', description: 'Dano elétrico leve.', class: 'Mago', manaCost: 2, damage: '1d6', type: 'magical', target: 'single' },

  // Medium (Cost: 10-18 MP)
  { id: 'm_m_1', name: 'Bola de Fogo', tier: 'medium', description: 'Clássica explosão em área.', class: 'Mago', manaCost: 15, damage: '8d6', type: 'magical', target: 'aoe' },
  { id: 'm_m_2', name: 'Relâmpago', tier: 'medium', description: 'Dano em linha reta.', class: 'Mago', manaCost: 12, damage: '6d6', type: 'magical', target: 'aoe' },
  { id: 'm_m_3', name: 'Voo', tier: 'medium', description: 'Permite voar por um tempo.', class: 'Mago', manaCost: 10, type: 'utility', target: 'self' },
  { id: 'm_m_4', name: 'Invisibilidade', tier: 'medium', description: 'Fica invisível até atacar.', class: 'Mago', manaCost: 10, type: 'utility', target: 'self' },
  { id: 'm_m_27', name: 'Curar Ferimentos', tier: 'medium', description: 'Magia de cura média.', class: 'Mago', manaCost: 10, damage: '-4d4', type: 'heal', target: 'single' },
  
  // Advanced (Cost: 25-50 MP)
  { id: 'm_a_1', name: 'Chuva de Meteoros', tier: 'advanced', description: 'Destruição total em área.', class: 'Mago', manaCost: 40, damage: '20d6', type: 'magical', target: 'aoe' },
  { id: 'm_a_2', name: 'Parar o Tempo', tier: 'advanced', description: 'Ganha 3 turnos extras.', class: 'Mago', manaCost: 50, type: 'utility', target: 'self' },
  { id: 'm_a_3', name: 'Desejo', tier: 'advanced', description: 'Altera a realidade (limitado).', class: 'Mago', manaCost: 60, type: 'utility', target: 'aoe' },
  { id: 'm_a_4', name: 'Palavra de Poder: Morte', tier: 'advanced', description: 'Mata inimigo instantaneamente.', class: 'Mago', manaCost: 45, damage: 'Infinity', type: 'magical', target: 'single' },
  { id: 'm_a_5', name: 'Ressurreição Verdadeira', tier: 'advanced', description: 'Traz alguém de volta à vida.', class: 'Mago', manaCost: 50, type: 'heal', target: 'single' },

  // --- LADINO (ROGUE) - Uses Energy/Tricks (MP) ---
  // Simple (Cost: 2-4 MP)
  { id: 'r_s_1', name: 'Ataque Furtivo', tier: 'simple', description: 'Dano extra se estiver escondido.', class: 'Ladino', manaCost: 3, damage: '2d6', type: 'physical', target: 'single' },
  { id: 'r_s_2', name: 'Punga', tier: 'simple', description: 'Rouba ouro ou item.', class: 'Ladino', manaCost: 2, type: 'utility', target: 'single' },
  { id: 'r_s_3', name: 'Adaga Venenosa', tier: 'simple', description: 'Envenena o alvo.', class: 'Ladino', manaCost: 3, damage: '1d4', type: 'physical', target: 'single', effect: 'Poison' },
  { id: 'r_s_4', name: 'Esconder-se', tier: 'simple', description: 'Torna-se difícil de ver.', class: 'Ladino', manaCost: 2, type: 'utility', target: 'self' },
  { id: 'r_s_5', name: 'Tiro Certeiro', tier: 'simple', description: 'Flecha com alta precisão.', class: 'Ladino', manaCost: 3, damage: '1d8+2', type: 'physical', target: 'single' },
  { id: 'r_s_6', name: 'Desarmar Armadilha', tier: 'simple', description: 'Lida com mecanismos.', class: 'Ladino', manaCost: 1, type: 'utility', target: 'single' },
  { id: 'r_s_7', name: 'Cegueira', tier: 'simple', description: 'Joga areia nos olhos.', class: 'Ladino', manaCost: 3, type: 'utility', target: 'single', effect: 'Blind' },
  { id: 'r_s_8', name: 'Acrobacia', tier: 'simple', description: 'Esquiva ou move rápido.', class: 'Ladino', manaCost: 2, type: 'utility', target: 'self' },
  
  // Medium (Cost: 6-10 MP)
  { id: 'r_m_1', name: 'Chuva de Flechas', tier: 'medium', description: 'Atira em múltiplos alvos.', class: 'Ladino', manaCost: 8, damage: '3d6', type: 'physical', target: 'aoe' },
  { id: 'r_m_2', name: 'Golpe na Jugular', tier: 'medium', description: 'Causa sangramento forte.', class: 'Ladino', manaCost: 7, damage: '1d8', type: 'physical', target: 'single', effect: 'Bleed' },
  { id: 'r_m_3', name: 'Bomba de Fumaça', tier: 'medium', description: 'Foge do combate ou confunde.', class: 'Ladino', manaCost: 6, type: 'utility', target: 'aoe' },
  { id: 'r_m_4', name: 'Assassinato', tier: 'medium', description: 'Dano massivo fora de combate.', class: 'Ladino', manaCost: 10, damage: '6d6', type: 'physical', target: 'single' },
  
  // Advanced (Cost: 12-20 MP)
  { id: 'r_a_1', name: 'Sombra Dançante', tier: 'advanced', description: 'Ataca todos os inimigos.', class: 'Ladino', manaCost: 15, damage: '5d8', type: 'physical', target: 'aoe' },
  { id: 'r_a_2', name: 'Toque da Morte', tier: 'advanced', description: 'Chance de matar instantaneamente.', class: 'Ladino', manaCost: 18, damage: '10d6', type: 'physical', target: 'single' },
  { id: 'r_a_3', name: 'Mestre dos Disfarces', tier: 'advanced', description: 'Torna-se qualquer pessoa.', class: 'Ladino', manaCost: 12, type: 'utility', target: 'self' },
  { id: 'r_a_4', name: 'Roubo Lendário', tier: 'advanced', description: 'Rouba até o que está equipado.', class: 'Ladino', manaCost: 20, type: 'utility', target: 'single' }
];
