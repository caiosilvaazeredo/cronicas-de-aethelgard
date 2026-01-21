
import React, { useEffect, useState } from 'react';
import { music } from '../services/audioService';

interface Props {
  onComplete: (value: number) => void;
}

const DiceRoll: React.FC<Props> = ({ onComplete }) => {
  const [value, setValue] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    // Intro animation
    setTimeout(() => setScale(1), 50);

    const rollInterval = setInterval(() => {
      setValue(Math.floor(Math.random() * 20) + 1);
      music.playSfx('click'); // Click sound mimics dice clatter
    }, 100);

    // Stop rolling after 1.5s
    setTimeout(() => {
      clearInterval(rollInterval);
      const finalValue = Math.floor(Math.random() * 20) + 1;
      setValue(finalValue);
      setIsRolling(false);
      
      // Play result sound
      if (finalValue === 20) music.playSfx('levelup');
      else if (finalValue === 1) music.playSfx('hit');
      else music.playSfx('click');

      // Wait a bit to show result before closing
      setTimeout(() => {
        onComplete(finalValue);
      }, 1000);
    }, 1500);

    return () => clearInterval(rollInterval);
  }, [onComplete]);

  const getColor = () => {
    if (isRolling) return 'text-white border-white';
    if (value === 20) return 'text-yellow-400 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]';
    if (value === 1) return 'text-red-500 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]';
    return 'text-[#d4af37] border-[#d4af37]';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
      <div 
        className={`relative w-32 h-32 flex items-center justify-center bg-[#1e1e2e] border-4 rounded-xl transform transition-all duration-500 ${getColor()} ${scale === 0 ? 'scale-0 rotate-180' : 'scale-100 rotate-0'} ${isRolling ? 'animate-shake' : 'scale-110'}`}
        style={{ imageRendering: 'pixelated' }}
      >
        <div className="font-title text-5xl font-bold">{value}</div>
        
        {/* Decorative corners */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-current opacity-50"></div>
        <div className="absolute top-1 right-1 w-2 h-2 bg-current opacity-50"></div>
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-current opacity-50"></div>
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-current opacity-50"></div>
        
        {isRolling && (
          <div className="absolute -bottom-10 text-white text-xs font-title uppercase tracking-widest animate-pulse">
            Rolando Dados...
          </div>
        )}
        
        {!isRolling && (
          <div className={`absolute -bottom-10 text-xs font-title uppercase tracking-widest animate-in slide-in-from-top-2 ${value === 20 ? 'text-yellow-400' : value === 1 ? 'text-red-500' : 'text-zinc-400'}`}>
            {value === 20 ? 'CRÍTICO!' : value === 1 ? 'FALHA CRÍTICA!' : 'Resultado'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiceRoll;
