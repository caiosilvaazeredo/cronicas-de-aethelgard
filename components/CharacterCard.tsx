
import React, { useState } from 'react';
import { Character, StatusType, SkillTier, CharacterClass } from '../types';

interface Props {
  character: Character;
}

const getStatusColor = (type: StatusType) => {
  switch (type) {
    case 'poison': return 'text-green-400 border-green-900 bg-green-950/30';
    case 'stun': return 'text-yellow-200 border-yellow-800 bg-yellow-950/30';
    case 'buff_str': return 'text-red-400 border-red-900 bg-red-950/30';
    case 'buff_def': return 'text-blue-400 border-blue-900 bg-blue-950/30';
    case 'regen': return 'text-pink-400 border-pink-900 bg-pink-950/30';
    default: return 'text-white border-zinc-700';
  }
};

const getSkillColor = (tier: SkillTier) => {
  switch (tier) {
    case 'simple': return 'border-zinc-600 bg-zinc-800/50';
    case 'medium': return 'border-blue-600 bg-blue-900/30';
    case 'advanced': return 'border-amber-600 bg-amber-900/30';
    default: return 'text-white';
  }
};

const getSkillIcon = (name: string, charClass: CharacterClass | string): string => {
  const lowerName = name.toLowerCase();
  if (charClass === 'Guerreiro') {
    if (lowerName.includes('grito') || lowerName.includes('rugido')) return '🗣️';
    if (lowerName.includes('escudo') || lowerName.includes('bloqueio')) return '🛡️';
    if (lowerName.includes('corte') || lowerName.includes('lâmina')) return '⚔️';
    return '🗡️';
  }
  if (charClass === 'Mago') {
    if (lowerName.includes('fogo') || lowerName.includes('chama')) return '🔥';
    if (lowerName.includes('gelo') || lowerName.includes('frio')) return '❄️';
    if (lowerName.includes('raio')) return '⚡';
    if (lowerName.includes('cura')) return '💚';
    return '🔮';
  }
  if (charClass === 'Ladino') {
    if (lowerName.includes('roubo') || lowerName.includes('punga')) return '💰';
    if (lowerName.includes('veneno')) return '🧪';
    if (lowerName.includes('tiro')) return '🏹';
    return '🗡️';
  }
  return '✨';
};

const CharacterCard: React.FC<Props> = ({ character }) => {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const hpPercent = (character.hp / character.maxHp) * 100;
  const mpPercent = (character.mp / character.maxMp) * 100;

  const toggleSkill = (id: string) => {
    setExpandedSkill(expandedSkill === id ? null : id);
  };

  return (
    <div className="bg-[#1e1e2e] p-5 border-2 border-[#d4af37] rounded shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between border-b border-[#d4af37]/30 pb-2 items-center sticky top-0 bg-[#1e1e2e] z-10">
        <span className="font-title text-[#d4af37] text-lg uppercase tracking-wider">{character.name}</span>
        <span className="bg-[#d4af37] text-[#0f0f1b] px-2 py-0.5 rounded text-xs font-bold">LVL {character.level}</span>
      </div>
      
      <div className="space-y-4">
        {/* Vitals */}
        <div className="space-y-2">
          {/* HP Bar */}
          <div className="space-y-1">
             <div className="flex justify-between text-xs uppercase tracking-tighter">
              <span className="text-zinc-400 font-title">Vitalidade</span>
              <span className={character.hp < 5 ? 'text-red-500 animate-pulse font-bold' : 'text-zinc-200'}>
                {character.hp} / {character.maxHp}
              </span>
            </div>
            <div className="w-full h-3 bg-[#0f0f1b] border border-[#d4af37]/20 rounded-sm overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-700 ease-out rounded-sm" 
                style={{ width: `${Math.max(0, hpPercent)}%` }}
              />
            </div>
          </div>

          {/* MP Bar */}
          <div className="space-y-1">
             <div className="flex justify-between text-xs uppercase tracking-tighter">
              <span className="text-zinc-400 font-title">Mana / Energia</span>
              <span className="text-blue-200">
                {character.mp} / {character.maxMp}
              </span>
            </div>
            <div className="w-full h-3 bg-[#0f0f1b] border border-[#d4af37]/20 rounded-sm overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-blue-900 to-blue-500 transition-all duration-700 ease-out rounded-sm" 
                style={{ width: `${Math.max(0, mpPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] uppercase">
          <div className="bg-[#0f0f1b]/50 p-2 border border-zinc-800 flex justify-between rounded">
            <span className="text-red-400">Ataque</span>
            <span className="text-white font-bold">{character.strength}</span>
          </div>
          <div className="bg-[#0f0f1b]/50 p-2 border border-zinc-800 flex justify-between rounded">
            <span className="text-blue-400">Defesa</span>
            <span className="text-white font-bold">{character.defense}</span>
          </div>
        </div>

        {/* Status Effects */}
        {character.status && character.status.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {character.status.map((s, i) => (
              <div key={i} className={`text-[9px] px-2 py-1 border rounded flex items-center gap-1 ${getStatusColor(s.type)}`}>
                <span className="uppercase font-bold">{s.name}</span>
                <span className="opacity-70">({s.duration}T)</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills Section */}
        <div className="space-y-2 pt-2 border-t border-[#d4af37]/10">
          <span className="text-zinc-500 font-title text-[10px] uppercase tracking-widest">Habilidades Conhecidas</span>
          <div className="space-y-1.5">
            {character.skills.map((skill) => {
              const isExpanded = expandedSkill === skill.id;
              const hasMana = character.mp >= skill.manaCost;
              return (
                <div key={skill.id} className={`border rounded transition-all duration-300 ${getSkillColor(skill.tier)} ${!hasMana ? 'opacity-50 grayscale' : ''}`}>
                  <div 
                    className="flex justify-between items-center p-2 cursor-pointer hover:bg-white/5"
                    onClick={() => toggleSkill(skill.id)}
                  >
                     <div className="flex items-center gap-2">
                       <span className="text-lg filter drop-shadow-md">{getSkillIcon(skill.name, character.class)}</span>
                       <div className="flex flex-col relative group/tooltip">
                         <span className="text-[10px] font-bold uppercase text-zinc-200 border-b border-dotted border-white/20 group-hover/tooltip:border-[#d4af37] transition-colors w-fit">{skill.name}</span>
                         
                         {/* Tooltip on Hover */}
                         <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1e1e2e] border-2 border-[#d4af37] p-3 rounded shadow-[0_0_20px_rgba(0,0,0,0.8)] z-50 hidden group-hover/tooltip:block pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                             <div className="flex justify-between items-center border-b border-[#d4af37]/30 pb-1 mb-2">
                                <span className="text-[#d4af37] font-title text-[10px]">{skill.name}</span>
                                <span className={hasMana ? 'text-blue-400 font-bold text-[9px]' : 'text-red-500 font-bold text-[9px]'}>{skill.manaCost} MP</span>
                             </div>
                             <p className="text-[9px] text-zinc-300 italic leading-relaxed mb-2">"{skill.description}"</p>
                             <div className="grid grid-cols-1 gap-1 text-[9px]">
                                {skill.damage && (
                                   <div className="flex justify-between bg-black/20 px-1 rounded">
                                      <span className="text-zinc-500 uppercase">Dano</span>
                                      <span className="text-red-400 font-mono">{skill.damage}</span>
                                   </div>
                                )}
                                {skill.effect && (
                                   <div className="flex justify-between bg-black/20 px-1 rounded">
                                      <span className="text-zinc-500 uppercase">Efeito</span>
                                      <span className="text-purple-400 font-mono">{skill.effect}</span>
                                   </div>
                                )}
                                <div className="flex justify-between bg-black/20 px-1 rounded">
                                   <span className="text-zinc-500 uppercase">Alvo</span>
                                   <span className="text-zinc-300 uppercase">{skill.target}</span>
                                </div>
                             </div>
                             <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-[#1e1e2e] border-b-2 border-r-2 border-[#d4af37] transform rotate-45"></div>
                         </div>

                         <span className="text-[8px] opacity-60 uppercase tracking-wider flex gap-2">
                           {skill.tier} 
                           <span className={hasMana ? 'text-blue-400' : 'text-red-500'}>{skill.manaCost} MP</span>
                         </span>
                       </div>
                     </div>
                     <button className="text-[#c5a059] font-serif font-bold text-lg leading-none px-2 transform transition-transform duration-300">
                       {isExpanded ? '−' : '+'}
                     </button>
                  </div>
                  
                  {/* Expanded Detail View (D&D Book Style) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-[#f0e6d2] text-[#2b1b3d] p-3 rounded-sm border-2 border-[#8b4513] shadow-[inset_0_0_10px_rgba(139,69,19,0.2)] font-serif relative overflow-hidden">
                        
                        <div className="flex justify-between items-start mb-2 border-b border-[#8b4513]/30 pb-1">
                          <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#8b4513]">
                             {skill.type}
                          </span>
                          <span className="text-[9px] font-bold text-blue-900 bg-blue-200/50 px-1 rounded border border-blue-900/20">
                             Custo: {skill.manaCost}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed italic font-medium mb-3">
                          "{skill.description}"
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono bg-[#8b4513]/5 p-2 rounded border border-[#8b4513]/10">
                           {skill.damage && (
                             <div className="flex justify-between">
                               <span>Dano:</span>
                               <span className="font-bold text-red-900">{skill.damage}</span>
                             </div>
                           )}
                           <div className="flex justify-between">
                             <span>Alvo:</span>
                             <span className="font-bold uppercase">{skill.target}</span>
                           </div>
                           {skill.effect && (
                             <div className="col-span-2 flex justify-between border-t border-[#8b4513]/20 pt-1 mt-1">
                               <span>Efeito:</span>
                               <span className="font-bold text-purple-900">{skill.effect}</span>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {character.skills.length === 0 && (
              <div className="p-4 border-2 border-dashed border-zinc-700 rounded text-center">
                 <span className="text-zinc-600 text-[10px] italic">Modo Simplificado: Sem Habilidades Ativas.</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center pt-2 border-t border-[#d4af37]/10">
        <span className="text-[10px] text-zinc-500 font-title tracking-widest uppercase">{character.class} de Elite</span>
      </div>
    </div>
  );
};

export default CharacterCard;
