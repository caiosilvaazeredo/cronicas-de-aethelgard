
import React, { useState, useEffect, useCallback } from 'react';
import { Character, GameState, AIResponse, MusicMood, GameConfig, GameLength, GameTheme, CharacterClass, Skill, SkillTier } from './types';
import { startNewGame, makeChoice, generatePixelArt, validateAction } from './services/geminiService';
import CharacterCard from './components/CharacterCard';
import DiceRoll from './components/DiceRoll';
import Tutorial from './components/Tutorial';
import { music } from './services/audioService';
import { SKILL_DATABASE } from './data/skills';

const INITIAL_CHARACTER: Character = {
  name: "Herói",
  class: "Guerreiro",
  hp: 30,
  maxHp: 30,
  mp: 10,
  maxMp: 10,
  level: 1,
  gold: 20,
  xp: 0,
  strength: 14,
  defense: 8,
  inventory: [],
  equipment: {},
  status: [],
  skills: []
};

const LORE_CHAPTERS = [
  { 
    id: 1,
    icon: "🎲",
    title: "O Sistema de Jogo", 
    content: "Crônicas de Aethelgard é um RPG onde você interage com um Mestre (IA). O jogo flui em turnos: O Mestre descreve o cenário e você escolhe uma ação. Para toda ação de risco, um Dado de 20 faces (d20) é rolado automaticamente. \n\n• 20 Natural: Sucesso Crítico (O melhor resultado possível).\n• 1 Natural: Falha Crítica (Um desastre cômico ou trágico).\n• Improviso: Além das opções sugeridas, você pode digitar QUALQUER ação no campo de texto. Se for criativo e lógico, o Mestre aceitará." 
  },
  { 
    id: 2,
    icon: "⚖️",
    title: "Modos de Jogo", 
    content: "Você define a dificuldade nas Configurações:\n\nMODO NARRATIVO: Focado na história. A Mana (MP) não é gasta ao usar habilidades, e o 'Advogado de Regras' (o sistema de validação) é permissivo. Ideal para quem quer apenas relaxar e curtir a trama.\n\nMODO TÁTICO: O desafio real. Suas habilidades custam Mana. Se o MP acabar, você não solta magias. O Inventário é checado rigorosamente. O Advogado de Regras bloqueará ações impossíveis para sua classe ou estatísticas." 
  },
  { 
    id: 3,
    icon: "🛡️",
    title: "Classes e Poderes", 
    content: "Cada classe tem um estilo único:\n\nGUERREIRO: Tanque e Dano Físico. Usa MP como 'Estamina' para golpes pesados e defesa. Possui muita Vida (HP).\n\nMAGO: Dano em Área e Controle. Usa MP como 'Mana Arcana'. Pode resolver encontros inteiros com uma magia, mas é frágil e inútil sem Mana.\n\nLADINO: Crítico e Furtividade. Usa MP como 'Energia' para truques sujos e ataques letais. Especialista em resolver problemas sem combate direto." 
  },
  {
    id: 4,
    icon: "📈",
    title: "Progressão e Atos",
    content: "Uma partida é dividida em 3 Atos (início, meio e fim). \n\n• ATO 1: O Chamado. Equipamentos básicos.\n• ATO 2: O Desafio. Aqui você pode aprender NOVAS HABILIDADES se sobreviver a encontros difíceis. Fique atento às notificações de 'Nova Habilidade Aprendida'.\n• ATO 3: O Clímax. Onde suas escolhas e recursos acumulados definem o final.\n\nGerencie sua Vida e Mana com itens (Poções) ou descansando em momentos narrativos apropriados."
  }
];

const App: React.FC = () => {
  const [character, setCharacter] = useState<Character>(INITIAL_CHARACTER);
  const [gameState, setGameState] = useState<GameState>({
    storyText: "",
    choices: [],
    history: [],
    isGameOver: false,
    activeQuests: [],
    currentAct: 1,
    rejectionMessage: null,
    skillsLearnedCount: 0
  });
  
  const [menuStep, setMenuStep] = useState<'title' | 'lore' | 'config' | 'class' | 'skills' | 'playing'>('title');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ length: 'medium', theme: 'classic_high', mode: 'complete' });
  const [loading, setLoading] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [customAction, setCustomAction] = useState("");
  const [currentMood, setCurrentMood] = useState<MusicMood>('menu');
  const [lastAction, setLastAction] = useState<{text: string, isCustom: boolean} | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedLoreChapter, setSelectedLoreChapter] = useState(LORE_CHAPTERS[0]);
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Dice State
  const [showDice, setShowDice] = useState(false);
  const [pendingAction, setPendingAction] = useState<{text: string, context: string} | null>(null);

  // States for Skill Selection
  const [tempClass, setTempClass] = useState<CharacterClass | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);

  // Music State
  const [isMuted, setIsMuted] = useState(false);

  // --- MUSIC MANAGEMENT SYSTEM ---
  useEffect(() => {
    // If we are in any menu step (Title, Lore, Config, Class Selection, Skills)
    if (['title', 'lore', 'config', 'class', 'skills'].includes(menuStep)) {
      music.playBgm('menu.mp3');
    } 
    // If we are actually playing the game
    else if (menuStep === 'playing') {
      if (gameState.isGameOver) {
        // Game Over - Return to Menu Music (as requested)
        music.playBgm('menu.mp3'); 
      } else {
        // Play Act specific music
        switch (gameState.currentAct) {
          case 1:
            music.playBgm('act1.mp3');
            break;
          case 2:
            music.playBgm('act2.mp3');
            break;
          case 3:
            music.playBgm('act3.mp3');
            break;
          default:
            music.playBgm('act1.mp3');
        }
      }
    }
  }, [menuStep, gameState.currentAct, gameState.isGameOver]);

  useEffect(() => {
    let interval: any;
    let timeout: any;

    if (loading) {
      setLoadingProgress(0);
      setShowRetry(false);
      
      interval = setInterval(() => {
        setLoadingProgress(prev => Math.min(98, prev + Math.floor(Math.random() * 20)));
      }, 300);

      timeout = setTimeout(() => {
        setShowRetry(true);
      }, 10000);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loading]);

  // Global Audio Initialization on first click
  const handleUserInteraction = () => {
    music.initializeAudio();
  };

  const toggleMute = (e: React.MouseEvent) => {
    // We let this event bubble so it also triggers initializeAudio if needed
    const newState = music.toggleMute();
    setIsMuted(newState);
  };

  const getSkillBudget = (length: GameLength): Record<SkillTier, number> => {
    if (length === 'quick') {
      return { simple: 1, medium: 1, advanced: 1 };
    } else if (length === 'medium') {
      return { simple: 1, medium: 1, advanced: 0 };
    } else {
      return { simple: 1, medium: 0, advanced: 0 };
    }
  };

  const learnNewSkill = (charClass: CharacterClass | string, currentSkills: Skill[]): Skill | null => {
    if (gameConfig.mode === 'simple') return null;

    const pClass = charClass as CharacterClass;
    const allClassSkills = SKILL_DATABASE.filter(s => s.class === pClass);
    const unlearned = allClassSkills.filter(s => !currentSkills.some(cs => cs.id === s.id));

    if (unlearned.length === 0) return null;

    const hasSimple = currentSkills.some(s => s.tier === 'simple');
    const hasMedium = currentSkills.some(s => s.tier === 'medium');

    let pool = unlearned.filter(s => s.tier === 'simple');
    if (pool.length === 0 || (hasSimple && Math.random() > 0.3)) {
       pool = unlearned.filter(s => s.tier === 'medium');
    }
    if (pool.length === 0 || (hasMedium && Math.random() > 0.3)) {
       pool = unlearned.filter(s => s.tier === 'advanced');
    }
    if (pool.length === 0) pool = unlearned;

    return pool[Math.floor(Math.random() * pool.length)];
  };

  const processResponse = useCallback(async (res: AIResponse) => {
    if (res.musicMood) setCurrentMood(res.musicMood as MusicMood);
    
    let newSkill: Skill | null = null;
    let maxEvents = 0;
    if (gameConfig.length === 'quick') maxEvents = 1;
    else if (gameConfig.length === 'medium') maxEvents = 2;
    else maxEvents = 3;

    if (res.statusUpdate?.learnSkill && gameState.skillsLearnedCount < maxEvents && gameState.currentAct === 2) {
       newSkill = learnNewSkill(character.class, character.skills);
    }

    setGameState(prev => ({
      ...prev,
      storyText: res.story,
      choices: res.choices || [],
      currentAct: res.statusUpdate?.currentAct || prev.currentAct,
      isGameOver: res.statusUpdate?.gameOver || false,
      rejectionMessage: null,
      history: [...prev.history, res.story].slice(-20),
      skillsLearnedCount: newSkill ? prev.skillsLearnedCount + 1 : prev.skillsLearnedCount
    }));

    if (newSkill) {
      setNotification(`NOVA HABILIDADE APRENDIDA: ${newSkill.name} (${newSkill.tier})!`);
      setTimeout(() => setNotification(null), 5000);
      music.playSfx('levelup');
    }

    if (res.statusUpdate) {
      const { hpChange = 0, mpChange = 0, goldChange = 0, xpChange = 0 } = res.statusUpdate;
      if (hpChange > 0) music.playSfx('heal');
      if (hpChange < 0) music.playSfx('hit');

      setCharacter(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, Math.max(0, prev.hp + hpChange)),
        mp: Math.min(prev.maxMp, Math.max(0, prev.mp + mpChange)),
        gold: prev.gold + goldChange,
        xp: prev.xp + xpChange,
        inventory: [...prev.inventory, ...(res.itemsFound || [])],
        skills: newSkill ? [...prev.skills, newSkill] : prev.skills
      }));
    }

    try {
      const img = await generatePixelArt(res.imagePrompt);
      setGameState(prev => ({ ...prev, currentImage: img }));
    } catch (e) {
      console.error("Image gen error", e);
    }
    setLoading(false);
    setShowRetry(false);
  }, [character.class, character.skills, gameConfig.length, gameState.currentAct, gameState.skillsLearnedCount, gameConfig.mode]);

  const handleAction = async (text: string, isCustom: boolean = false) => {
    if (!text.trim() || loading || showDice) return;
    music.playSfx('click');
    setLoading(true);
    setLastAction({text, isCustom});
    setGameState(prev => ({ ...prev, rejectionMessage: null }));

    const skillsText = character.skills.length > 0 
      ? character.skills.map(s => `${s.name} (Cost: ${s.manaCost} MP)`).join(", ") 
      : "Nenhuma (Modo Simples)";
    
    const inventoryText = character.inventory.length > 0 
      ? character.inventory.map(i => i.name).join(", ") 
      : "Bolsos vazios";
    
    const context = `Classe:${character.class}, HP:${character.hp}, MP:${character.mp}/${character.maxMp}, Ato:${gameState.currentAct}, Tema:${gameConfig.theme}, Habilidades: [${skillsText}], Inventário: [${inventoryText}]. Modo: ${gameConfig.mode}`;

    try {
      if (isCustom) {
        const validation = await validateAction(text, context, gameConfig.mode);
        if (!validation.isPlausible) {
          setLoading(false);
          setGameState(prev => ({
            ...prev,
            rejectionMessage: {
              text: validation.reason || "Ação negada por violação de regras.",
              motive: validation.motive || "O Advogado de Regras balança a cabeça negativamente."
            }
          }));
          return;
        }
      }

      setPendingAction({ text, context });
      setLoading(false); 
      setShowDice(true);
      
    } catch (e) {
      console.error("Action error:", e);
      setLoading(false);
      setShowRetry(true);
    }
  };

  const onDiceResult = async (rollValue: number) => {
    setShowDice(false);
    if (!pendingAction) return;

    setLoading(true);
    const textWithRoll = `${pendingAction.text} (Rolagem de Dado [d20]: ${rollValue})`;
    
    try {
      const res = await makeChoice(textWithRoll, pendingAction.context);
      await processResponse(res);
      setCustomAction("");
      setPendingAction(null);
    } catch (e) {
      console.error("AI Generation error:", e);
      setLoading(false);
      setShowRetry(true);
    }
  };

  const selectClassAndProceed = (pClass: CharacterClass) => {
    setTempClass(pClass);
    music.playSfx('click');
    
    if (gameConfig.mode === 'simple') {
      startGameSimple(pClass);
    } else {
      setSelectedSkills([]);
      setMenuStep('skills');
    }
  };

  const toggleSkillSelection = (skill: Skill, limit: number, currentCount: number) => {
    const isSelected = selectedSkills.some(s => s.id === skill.id);
    if (isSelected) {
      setSelectedSkills(prev => prev.filter(s => s.id !== skill.id));
      music.playSfx('click');
    } else {
      if (currentCount < limit) {
        setSelectedSkills(prev => [...prev, skill]);
        music.playSfx('click');
      }
    }
  };

  const startGameSimple = async (pClass: CharacterClass) => {
     setLoading(true);
     setMenuStep('playing');
     const newChar = { ...INITIAL_CHARACTER, class: pClass, skills: [] };
     setCharacter(newChar);
     setShowTutorial(true);

     try {
       const res = await startNewGame(`um ${pClass} herói iniciante`, gameConfig, "Nenhuma (Modo Simplificado)");
       await processResponse(res);
     } catch (e) {
       console.error("Start error:", e);
       setLoading(false);
       setMenuStep('title');
     }
  };

  const startGameWithSkills = async () => {
    if (!tempClass) return;
    
    music.playSfx('click');
    setLoading(true);
    setMenuStep('playing');
    
    const baseMp = tempClass === 'Mago' ? 30 : tempClass === 'Ladino' ? 15 : 10;
    
    const newChar = { 
      ...INITIAL_CHARACTER, 
      class: tempClass, 
      skills: selectedSkills,
      mp: baseMp,
      maxMp: baseMp
    };
    setCharacter(newChar);
    setShowTutorial(true);

    try {
      const skillsStr = selectedSkills.map(s => `${s.name} (Cost:${s.manaCost} MP)`).join(", ");
      const res = await startNewGame(`um ${tempClass} herói iniciante`, gameConfig, skillsStr);
      await processResponse(res);
    } catch (e) {
      console.error("Start error:", e);
      setLoading(false);
      setMenuStep('title');
    }
  };

  const handleRetry = () => {
    music.playSfx('click');
    if (lastAction) {
      handleAction(lastAction.text, lastAction.isCustom);
    } else if (gameState.history.length === 0 && tempClass) {
      if (gameConfig.mode === 'simple') {
         startGameSimple(tempClass);
      } else {
         startGameWithSkills();
      }
    } else {
      setLoading(false);
      setShowRetry(false);
    }
  };

  // Reusable Mute Button Component
  const MuteButton = () => (
    <button 
      onClick={toggleMute}
      className={`fixed bottom-4 right-4 z-[100] w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl transition-all duration-300 shadow-lg ${isMuted ? 'bg-red-900 border-red-500 text-red-200' : 'bg-[#c5a059] border-white text-black hover:scale-110'}`}
      title={isMuted ? "Ativar Som" : "Silenciar"}
    >
      {isMuted ? "🔇" : "🎵"}
    </button>
  );

  const renderMenu = () => {
    switch(menuStep) {
      case 'title':
        return (
          <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0f0f1b] p-4">
            {/* Ambient Background & Vignette (Shadow) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2d1b4d_0%,#0f0f1b_70%)] opacity-80 z-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#000000_100%)] z-20 pointer-events-none opacity-90"></div>
            
            {/* Dynamic Effects Container */}
            <div className="absolute inset-0 z-10 opacity-30 pointer-events-none overflow-hidden">
                {/* Wind Lines */}
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={`wind-${i}`} 
                        className="wind-line" 
                        style={{ 
                            top: `${10 + Math.random() * 80}%`, 
                            left: `-${Math.random() * 20}%`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    ></div>
                ))}
                
                {/* Dust Particles */}
                {[...Array(15)].map((_, i) => (
                   <div
                      key={`part-${i}`}
                      className="particle"
                      style={{
                         width: `${Math.random() * 3 + 1}px`,
                         height: `${Math.random() * 3 + 1}px`,
                         left: `${Math.random() * 100}%`,
                         animationDuration: `${10 + Math.random() * 20}s`,
                         animationDelay: `-${Math.random() * 10}s`,
                         opacity: Math.random() * 0.5
                      }}
                   ></div>
                ))}
            </div>

            {/* Static Grid Pattern */}
            <div className="absolute inset-0 opacity-5 z-0" style={{
               backgroundImage: `repeating-linear-gradient(60deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 40px), repeating-linear-gradient(-60deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 40px)`
            }}></div>
            
            {/* Main Title Content - Responsive Sizes */}
            <div className="z-30 flex flex-col items-center space-y-4 md:space-y-8 animate-in zoom-in duration-1000 scale-100 relative w-full">
               
               {/* Logo Area */}
               <div className="relative text-center group cursor-default">
                  <h1 className="text-4xl sm:text-6xl md:text-8xl font-title leading-tight text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] via-[#c5a059] to-[#8b4513] filter drop-shadow-[2px_2px_0_#2d1b4d] md:drop-shadow-[4px_4px_0_#2d1b4d] drop-shadow-[-1px_-1px_0_#000] relative z-10 transition-transform duration-500 hover:scale-105">
                     Crônicas de<br/>
                     <span className="text-white drop-shadow-[2px_2px_0_#000] md:drop-shadow-[4px_4px_0_#000] stroke-black text-5xl sm:text-7xl md:text-9xl">Aethelgard</span>
                  </h1>
                  
                  {/* Pixel Art Subtitle Underline */}
                  <div className="w-full h-1 md:h-2 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mt-2 md:mt-4 opacity-50"></div>
               </div>

               {/* Call to Action Buttons */}
               <div className="flex flex-col gap-4 mt-8 md:mt-12 w-full max-w-xs px-4">
                  <button 
                    onClick={() => { music.playSfx('click'); setMenuStep('config'); }} 
                    className="group relative bg-[#c5a059] text-[#0f0f1b] font-title font-bold text-lg md:text-xl py-3 md:py-4 px-6 md:px-8 border-4 border-[#fff] shadow-[0_0_20px_rgba(197,160,89,0.4)] hover:bg-[#fff] hover:border-[#c5a059] hover:scale-105 transition-all duration-200 uppercase tracking-wider w-full"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="group-hover:animate-shake">⚔️</span> Jogar <span className="group-hover:animate-shake scale-x-[-1] inline-block">⚔️</span>
                    </span>
                    {/* Button Glow Effect */}
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 animate-pulse"></div>
                  </button>

                  <button 
                    onClick={() => { music.playSfx('click'); setMenuStep('lore'); }} 
                    className="text-[#c5a059] font-title text-xs uppercase tracking-widest hover:text-white transition-colors py-2 border-b border-transparent hover:border-[#c5a059] text-center"
                  >
                    Manual do Jogo
                  </button>
               </div>
            </div>

            {/* Footer with Discreet Credit */}
            <div className="absolute bottom-4 text-center animate-in fade-in duration-1000 delay-500 z-30">
               <div className="text-zinc-600 font-sans text-[8px] opacity-40 hover:opacity-100 transition-opacity">
                   A Caio Azeredo game
               </div>
            </div>
          </div>
        );
      case 'lore':
        return (
          <div className="min-h-screen bg-[#0f0f1b] flex items-center justify-center p-2 md:p-10 relative overflow-hidden">
             {/* Background blur */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
             
             {/* Modal Container - Responsive Flex Direction */}
             <div className="relative z-10 w-full max-w-5xl h-[90vh] md:h-[80vh] bg-[#1e1e2e] border-4 md:border-8 border-[#2b1b3d] rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in duration-500">
                {/* Close Button */}
                <button 
                  onClick={() => { music.playSfx('click'); setMenuStep('title'); }} 
                  className="absolute top-2 right-2 md:top-4 md:right-4 z-50 text-[#c5a059] hover:text-white font-bold text-lg md:text-xl bg-[#2b1b3d] w-8 h-8 rounded-full flex items-center justify-center border border-[#c5a059]"
                >
                  ✕
                </button>

                {/* Left Side: Chapter List (Top on Mobile, Left on Desktop) */}
                <div className="w-full md:w-1/3 bg-[#14141f] border-b-4 md:border-b-0 md:border-r-4 border-[#2b1b3d] flex flex-col h-[30%] md:h-full">
                   <div className="p-4 md:p-6 border-b border-[#c5a059]/20 bg-[#0f0f1b]">
                      <h2 className="text-[#c5a059] font-title text-base md:text-xl uppercase tracking-widest">Manual</h2>
                      <p className="text-zinc-600 text-[8px] md:text-[10px] uppercase mt-1">Guia de Sobrevivência</p>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {LORE_CHAPTERS.map((chapter) => (
                         <button 
                           key={chapter.id}
                           onClick={() => { music.playSfx('click'); setSelectedLoreChapter(chapter); }}
                           className={`w-full p-3 md:p-4 text-left border-2 rounded transition-all flex items-center gap-3 group
                              ${selectedLoreChapter.id === chapter.id 
                                 ? 'bg-[#c5a059] border-[#fff] text-[#0f0f1b]' 
                                 : 'bg-[#1e1e2e] border-[#2b1b3d] text-zinc-400 hover:border-[#c5a059]/50 hover:text-[#c5a059]'
                              }`}
                         >
                            <span className="text-xl md:text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">{chapter.icon}</span>
                            <div>
                               <div className="font-title font-bold text-[10px] md:text-xs uppercase">{chapter.title}</div>
                               <div className="text-[8px] md:text-[9px] opacity-60">Seção {chapter.id}</div>
                            </div>
                         </button>
                      ))}
                   </div>
                </div>

                {/* Right Side: Content (Book Page) (Bottom on Mobile, Right on Desktop) */}
                <div className="w-full md:w-2/3 bg-[#eecfa1] p-6 md:p-12 relative flex flex-col shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] h-[70%] md:h-full">
                   {/* Book Binding Shadow */}
                   <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none hidden md:block"></div>
                   
                   {/* Bookmark Ribbon (Hidden on Mobile) */}
                   <div className="absolute right-12 top-0 w-8 h-24 bg-red-800 shadow-lg hidden md:flex items-end justify-center pb-2 clip-path-ribbon">
                      <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[10px] border-l-transparent border-r-transparent border-b-[#eecfa1] mb-[-10px]"></div>
                   </div>

                   {/* Content */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 md:pr-4 relative z-10">
                      <div className="flex justify-center mb-4 md:mb-6">
                         <span className="text-4xl md:text-5xl text-[#2d1b4d] opacity-80">{selectedLoreChapter.icon}</span>
                      </div>
                      <h2 className="text-xl md:text-3xl text-[#2d1b4d] font-title uppercase text-center mb-2 border-b-2 border-[#8b4513] pb-2 md:pb-4 mx-4 md:mx-10">
                         {selectedLoreChapter.title}
                      </h2>
                      <div className="mt-4 md:mt-6 text-[#2d1b4d] font-serif text-sm md:text-lg leading-relaxed text-justify space-y-4 whitespace-pre-wrap">
                         {selectedLoreChapter.content}
                      </div>
                   </div>

                   {/* Page Number */}
                   <div className="mt-2 md:mt-4 text-center text-[#8b4513] font-mono text-[10px] md:text-xs opacity-60">
                      - {selectedLoreChapter.id} -
                   </div>
                </div>
             </div>
          </div>
        );
      case 'config':
        return (
          <div className="max-w-4xl mx-auto mt-5 bg-[#1e1e2e] border-4 border-[#c5a059] p-8 rounded shadow-[0_0_100px_rgba(197,160,89,0.1)] animate-in fade-in duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
            
            <div className="text-center mb-10 relative">
               <h2 className="text-4xl text-[#c5a059] font-title uppercase tracking-tighter mb-2">Preparativos do Mestre</h2>
               <div className="w-48 h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mx-auto"></div>
               <p className="text-zinc-500 text-[10px] uppercase mt-2 tracking-widest">Defina as regras da sua aventura antes de rolar os dados</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 relative z-10">
              {/* Game Mode Selection */}
              <div className="lg:col-span-3 space-y-4 bg-black/30 p-6 border border-[#c5a059]/20 rounded-lg">
                 <p className="text-[#c5a059] font-title uppercase text-xs mb-4 flex items-center gap-2">
                   <span className="text-lg">⚖️</span> Estilo de Jogo
                 </p>
                 <div className="grid md:grid-cols-2 gap-4">
                    <button 
                       onClick={() => { music.playSfx('click'); setGameConfig({...gameConfig, mode: 'simple'}); }} 
                       className={`p-6 border-2 rounded-lg text-left transition-all group relative ${gameConfig.mode === 'simple' ? 'bg-[#c5a059] text-black border-white shadow-[0_0_20px_rgba(197,160,89,0.3)] scale-[1.02]' : 'bg-[#14141f] border-[#c5a059]/20 text-zinc-500 hover:border-[#c5a059]/50'}`}
                    >
                       <div className="font-bold font-title uppercase text-lg mb-1">Modo Narrativo</div>
                       <p className="text-[10px] leading-relaxed opacity-80 mb-2">Foco total na história e interpretação. O Mestre é mais permissivo e você não precisa se preocupar com custos de mana.</p>
                       <div className={`text-[8px] font-bold uppercase ${gameConfig.mode === 'simple' ? 'text-black' : 'text-zinc-600'}`}>✓ Sem Gestão de MP • ✓ RPG Casual</div>
                    </button>
                    <button 
                       onClick={() => { music.playSfx('click'); setGameConfig({...gameConfig, mode: 'complete'}); }} 
                       className={`p-6 border-2 rounded-lg text-left transition-all group relative ${gameConfig.mode === 'complete' ? 'bg-[#c5a059] text-black border-white shadow-[0_0_20px_rgba(197,160,89,0.3)] scale-[1.02]' : 'bg-[#14141f] border-[#c5a059]/20 text-zinc-500 hover:border-[#c5a059]/50'}`}
                    >
                       <div className="font-bold font-title uppercase text-lg mb-1">Modo Tático</div>
                       <p className="text-[10px] leading-relaxed opacity-80 mb-2">Rigor mecânico extremo. Suas habilidades têm custo, o inventário é limitado e o Advogado de Regras é impiedoso.</p>
                       <div className={`text-[8px] font-bold uppercase ${gameConfig.mode === 'complete' ? 'text-black' : 'text-zinc-600'}`}>✓ Gestão de Mana • ✓ Hardcore RPG</div>
                    </button>
                 </div>
              </div>

              {/* Theme Selection */}
              <div className="space-y-4 bg-black/20 p-5 border border-[#c5a059]/10 rounded-lg">
                <p className="text-[#c5a059] font-title uppercase text-[10px] mb-4 flex items-center gap-2 border-b border-[#c5a059]/20 pb-2">
                   <span className="text-sm">🌌</span> Universo
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {id: 'classic_high', label: 'Alta Fantasia', icon: '⚔️', desc: 'Dragões, Reis e Magia'},
                    {id: 'dark_fantasy', label: 'Fantasia Sombria', icon: '💀', desc: 'Mundo cruel e desesperador'},
                    {id: 'steampunk', label: 'Steampunk', icon: '⚙️', desc: 'Engrenagens e Vapor'},
                    {id: 'cosmic_horror', label: 'Horror Cósmico', icon: '👁️', desc: 'Mistérios de Lovecraft'}
                  ].map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => { music.playSfx('click'); setGameConfig({...gameConfig, theme: t.id as GameTheme}); }} 
                      className={`group w-full p-3 border-2 rounded text-left transition-all ${gameConfig.theme === t.id ? 'bg-[#2b1b3d] border-[#c5a059] text-[#c5a059]' : 'border-zinc-800 text-zinc-500 hover:bg-white/5'}`}
                    >
                       <div className="flex items-center justify-between">
                          <span className="font-title text-[10px] uppercase">{t.label}</span>
                          <span className="text-xs group-hover:scale-125 transition-transform">{t.icon}</span>
                       </div>
                       <p className="text-[8px] opacity-40 mt-1 uppercase tracking-tighter">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-4 bg-black/20 p-5 border border-[#c5a059]/10 rounded-lg">
                <p className="text-[#c5a059] font-title uppercase text-[10px] mb-4 flex items-center gap-2 border-b border-[#c5a059]/20 pb-2">
                   <span className="text-sm">⏳</span> Duração
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {id: 'quick', label: 'Sessão Rápida', desc: '1 Ato • 3-5 Rounds', icon: '⚡'},
                    {id: 'medium', label: 'Campanha Padrão', desc: '3 Atos • 10-15 Rounds', icon: '📖'},
                    {id: 'long', label: 'Épico', desc: '3 Atos Longos • 20+ Rounds', icon: '🏺'},
                    {id: 'endless', label: 'Infinito', desc: 'Sem fim definido', icon: '♾️'}
                  ].map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => { music.playSfx('click'); setGameConfig({...gameConfig, length: l.id as GameLength}); }} 
                      className={`group w-full p-3 border-2 rounded text-left transition-all ${gameConfig.length === l.id ? 'bg-[#2b1b3d] border-[#c5a059] text-[#c5a059]' : 'border-zinc-800 text-zinc-500 hover:bg-white/5'}`}
                    >
                       <div className="flex items-center justify-between">
                          <span className="font-title text-[10px] uppercase">{l.label}</span>
                          <span className="text-xs group-hover:rotate-12 transition-transform">{l.icon}</span>
                       </div>
                       <p className="text-[8px] opacity-40 mt-1 uppercase tracking-tighter">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* DM Note Card */}
              <div className="bg-[#c5a059]/5 border-2 border-dashed border-[#c5a059]/30 p-5 rounded-lg flex flex-col justify-center items-center text-center space-y-3">
                 <div className="w-12 h-12 bg-[#c5a059]/10 rounded-full flex items-center justify-center text-2xl">
                    🧙‍♂️
                 </div>
                 <h4 className="font-title text-[#c5a059] text-[10px] uppercase">Dica do Mestre</h4>
                 <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                   "A temática altera não só os monstros, mas a forma como a IA narra seus sucessos e falhas críticas. Escolha bem o clima da sua mesa!"
                 </p>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button 
                 onClick={() => { music.playSfx('click'); setMenuStep('title'); }} 
                 className="flex-1 p-4 border-2 border-[#c5a059]/20 rounded-lg font-title uppercase text-[10px] hover:border-white hover:text-white transition-all text-zinc-500"
              >
                 « Voltar ao Menu
              </button>
              <button 
                 onClick={() => { music.playSfx('click'); setMenuStep('class'); }} 
                 className="flex-[2] p-4 bg-[#c5a059] text-black rounded-lg font-title uppercase text-sm hover:bg-white transition-all shadow-[0_10px_30px_rgba(197,160,89,0.4)] active:translate-y-1 transform"
              >
                 Próximo Passo: O Herói »
              </button>
            </div>
          </div>
        );
      case 'class':
        return (
          <div className="max-w-md mx-auto mt-20 bg-[#1e1e2e] border-4 border-[#c5a059] p-10 text-center rounded animate-in zoom-in duration-300">
            <h2 className="text-2xl text-[#c5a059] mb-8 font-title uppercase tracking-widest">Sua Ficha de Personagem</h2>
            <div className="flex flex-col gap-4">
              {['Guerreiro', 'Mago', 'Ladino'].map(c => (
                <button key={c} onClick={() => selectClassAndProceed(c as CharacterClass)} className="p-4 border-2 border-[#c5a059]/40 hover:bg-[#c5a059] hover:text-black rounded font-title uppercase transition-all shadow-lg active:scale-95 group relative overflow-hidden">
                  <span className="relative z-10">{c}</span>
                  <div className="absolute inset-0 bg-[#c5a059] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
              ))}
            </div>
            <button onClick={() => { music.playSfx('click'); setMenuStep('config'); }} className="mt-6 text-zinc-500 text-xs hover:text-white uppercase">Voltar</button>
          </div>
        );
      case 'skills':
        const budget = getSkillBudget(gameConfig.length);
        const availableSkills = SKILL_DATABASE.filter(s => s.class === tempClass);
        const tiers: SkillTier[] = ['simple', 'medium', 'advanced'];

        const simpleCount = selectedSkills.filter(s => s.tier === 'simple').length;
        const mediumCount = selectedSkills.filter(s => s.tier === 'medium').length;
        const advancedCount = selectedSkills.filter(s => s.tier === 'advanced').length;
        
        const isReady = simpleCount === budget.simple && mediumCount === budget.medium && advancedCount === budget.advanced;

        return (
           <div className="max-w-4xl mx-auto mt-5 bg-[#1e1e2e] border-4 border-[#c5a059] p-6 rounded shadow-2xl flex flex-col h-[85vh]">
              <div className="text-center mb-4 border-b border-[#c5a059]/30 pb-4">
                 <h2 className="text-2xl text-[#c5a059] font-title uppercase">Grimório de {tempClass}</h2>
                 <p className="text-zinc-400 text-xs mt-1">Selecione suas habilidades iniciais.</p>
                 <div className="flex justify-center gap-6 mt-3 text-[10px] font-mono uppercase">
                    <span className={simpleCount === budget.simple ? 'text-green-400' : 'text-zinc-500'}>Simples: {simpleCount}/{budget.simple}</span>
                    <span className={mediumCount === budget.medium ? 'text-green-400' : 'text-zinc-500'}>Médias: {mediumCount}/{budget.medium}</span>
                    <span className={advancedCount === budget.advanced ? 'text-green-400' : 'text-zinc-500'}>Avançadas: {advancedCount}/{budget.advanced}</span>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-3 gap-4 pr-2">
                 {tiers.map(tier => {
                    if (budget[tier] === 0) return null;
                    return (
                       <div key={tier} className="space-y-2">
                          <h3 className="text-[#c5a059] font-title text-xs uppercase border-b border-[#c5a059]/20 pb-1">{tier === 'simple' ? 'Básicas' : tier === 'medium' ? 'Intermediárias' : 'Supremas'}</h3>
                          {availableSkills.filter(s => s.tier === tier).map(skill => {
                             const isSelected = selectedSkills.some(s => s.id === skill.id);
                             const currentTierCount = selectedSkills.filter(s => s.tier === tier).length;
                             const disabled = !isSelected && currentTierCount >= budget[tier];

                             return (
                                <div key={skill.id} className="relative group/skill-item">
                                  <button 
                                     onClick={() => toggleSkillSelection(skill, budget[tier], currentTierCount)}
                                     disabled={disabled}
                                     className={`w-full p-2 text-left border rounded text-[10px] uppercase transition-all relative
                                        ${isSelected 
                                           ? 'bg-[#c5a059] text-black border-white' 
                                           : disabled 
                                              ? 'opacity-30 border-zinc-800 cursor-not-allowed' 
                                              : 'bg-[#0f0f1b] text-zinc-400 border-zinc-700 hover:border-[#c5a059]'
                                        }`}
                                  >
                                     <div className="font-bold">{skill.name}</div>
                                  </button>
                                  
                                  {/* Tooltip on Hover in Skill Selection */}
                                  <div className="absolute left-full ml-2 top-0 w-56 p-3 bg-[#1e1e2e] border-2 border-[#c5a059] rounded shadow-[0_0_40px_rgba(0,0,0,0.9)] z-[100] hidden group-hover/skill-item:block pointer-events-none animate-in fade-in slide-in-from-left-2 duration-200">
                                     <div className="text-[#c5a059] font-title text-[11px] uppercase border-b border-[#c5a059]/30 pb-1 mb-2 flex justify-between">
                                        <span>{skill.name}</span>
                                        <span className="text-blue-400 font-mono text-[9px]">{skill.manaCost} MP</span>
                                     </div>
                                     <p className="text-[10px] text-zinc-300 italic mb-3 leading-relaxed">"{skill.description}"</p>
                                     <div className="grid grid-cols-1 gap-1.5 text-[9px] font-mono bg-black/40 p-2 rounded">
                                        {skill.damage && (
                                          <div className="flex justify-between border-b border-white/5 pb-1">
                                             <span className="text-zinc-500 uppercase text-[8px]">Potencial:</span>
                                             <span className="text-red-400 font-bold">{skill.damage}</span>
                                          </div>
                                        )}
                                        {skill.effect && (
                                          <div className="flex justify-between border-b border-white/5 pb-1">
                                             <span className="text-zinc-500 uppercase text-[8px]">Efeito:</span>
                                             <span className="text-purple-400">{skill.effect}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                           <span className="text-zinc-500 uppercase text-[8px]">Alvo:</span>
                                           <span className="text-zinc-300 uppercase">{skill.target}</span>
                                        </div>
                                     </div>
                                     {/* Tooltip Arrow */}
                                     <div className="absolute -left-1.5 top-3 w-3 h-3 bg-[#1e1e2e] border-l-2 border-b-2 border-[#c5a059] transform rotate-45"></div>
                                  </div>
                                </div>
                             );
                          })}
                       </div>
                    );
                 })}
              </div>

              <div className="mt-6 flex justify-between gap-4 pt-4 border-t border-[#c5a059]/30">
                 <button onClick={() => { music.playSfx('click'); setMenuStep('class'); }} className="px-6 py-3 border-2 border-[#c5a059]/30 rounded font-title uppercase text-xs hover:border-white transition-all text-zinc-400">Voltar</button>
                 <button 
                    onClick={startGameWithSkills} 
                    disabled={!isReady}
                    className={`flex-1 px-6 py-3 rounded font-title uppercase text-xs transition-all shadow-lg ${isReady ? 'bg-[#c5a059] text-black hover:bg-white cursor-pointer' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                 >
                    {isReady ? 'Iniciar Aventura' : 'Escolha suas Habilidades'}
                 </button>
              </div>
           </div>
        );
      default: return null;
    }
  };

  if (menuStep !== 'playing') {
     return (
        <div className="min-h-screen bg-[#0f0f1b] p-6" onClick={handleUserInteraction}>
           {renderMenu()}
           <MuteButton />
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1b] p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative overflow-hidden" onClick={handleUserInteraction}>
      {showTutorial && <Tutorial onComplete={() => { music.playSfx('click'); setShowTutorial(false); }} />}
      {showDice && <DiceRoll onComplete={onDiceResult} />}
      <MuteButton />

      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#d4af37] text-black border-4 border-white px-8 py-4 rounded shadow-[0_0_30px_rgba(212,175,55,0.6)] animate-in slide-in-from-top duration-500 font-title uppercase font-bold text-center">
          {notification}
        </div>
      )}

      {gameState.rejectionMessage && (
        <div className="fixed inset-y-0 left-0 w-80 bg-[#2d1b4d] border-r-4 border-red-600 z-50 p-6 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-2">
            <h3 className="text-red-400 font-title uppercase text-xs tracking-tighter">Advogado de Regras</h3>
            <button onClick={() => { music.playSfx('click'); setGameState(prev => ({...prev, rejectionMessage: null})); }} className="text-zinc-500 hover:text-white transition-colors">✕</button>
          </div>
          <div className="flex-1 space-y-4">
            <p className="text-red-200 italic text-sm leading-relaxed bg-red-950/20 p-3 rounded">"{gameState.rejectionMessage.motive}"</p>
            <div className="bg-black/40 p-4 border border-red-900/50 rounded shadow-inner">
               <span className="text-[10px] text-red-500 font-bold uppercase block mb-2 underline decoration-red-900">Parecer Técnico:</span>
               <p className="text-xs text-zinc-300 font-mono leading-relaxed">{gameState.rejectionMessage.text}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-center gap-4">
          {[1,2,3].map(a => (
            <div key={a} className={`px-4 py-1 rounded-full border-2 font-title text-[10px] uppercase transition-all duration-500 ${gameState.currentAct === a ? 'bg-[#c5a059] text-black border-white scale-110 shadow-[0_0_15px_rgba(197,160,89,0.5)]' : 'border-[#c5a059]/20 text-zinc-600'}`}>Ato {a}</div>
          ))}
        </div>

        <div className="relative aspect-video bg-black rounded border-4 border-[#c5a059]/30 overflow-hidden shadow-2xl">
          {loading && (
            <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-10 animate-in fade-in duration-300">
              <span className="font-title text-[#c5a059] animate-pulse mb-4 text-xs uppercase tracking-widest text-center">Consultando o Destino...</span>
              <div className="w-64 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-gradient-to-r from-[#c5a059]/50 to-[#c5a059] transition-all duration-300" style={{width: `${loadingProgress}%`}} />
              </div>
              
              {showRetry && (
                <div className="mt-8 animate-in zoom-in text-center">
                  <p className="text-zinc-500 text-[10px] uppercase mb-2">Parece que os dados caíram da mesa...</p>
                  <button 
                    onClick={handleRetry}
                    className="bg-[#c5a059] text-black px-6 py-2 rounded font-title uppercase text-xs hover:bg-white transition-all shadow-lg active:scale-95"
                  >
                    Tentar Novamente (Retry)
                  </button>
                </div>
              )}
            </div>
          )}
          {gameState.currentImage ? (
            <img src={gameState.currentImage} className="w-full h-full object-cover transition-opacity duration-1000" alt="Cena" />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-[#14141f]">
                <div className="text-zinc-800 font-title uppercase text-sm animate-pulse">Gerando Visual...</div>
             </div>
          )}
        </div>

        <div className="bg-[#1e1e2e] p-8 border-2 border-[#c5a059]/40 rounded relative min-h-[300px] flex flex-col justify-between shadow-inner">
          <div className="relative z-10 text-lg md:text-xl leading-relaxed italic text-zinc-200 first-letter:text-5xl first-letter:text-[#c5a059] first-letter:font-title first-letter:mr-3 drop-shadow-sm max-h-64 overflow-y-auto custom-scrollbar">
            {gameState.storyText || "O Mestre prepara os dados..."}
          </div>

          {!loading && !gameState.isGameOver && (
            <div className="mt-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {(gameState.choices && gameState.choices.length > 0 ? gameState.choices : [{text: "Explorar Adiante", action: "continue"}]).map((c, i) => (
                  <button key={i} onClick={() => handleAction(c.text)} className="p-4 bg-[#2b2b3d] border-2 border-[#c5a059]/20 rounded hover:border-[#c5a059] hover:bg-[#c5a059]/10 text-[10px] font-title uppercase transition-all active:scale-95 text-left flex justify-between items-center group">
                    <span>{c.text}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
              </div>
              <div className="relative pt-4 border-t border-[#c5a059]/10">
                <div className="absolute -top-3 left-4 bg-[#1e1e2e] px-2 text-[9px] text-[#c5a059] font-title uppercase tracking-widest">Improviso</div>
                <div className="flex gap-2">
                  <input onClick={(e) => e.stopPropagation()} type="text" value={customAction} onChange={e => setCustomAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAction(customAction, true)} placeholder="O que você quer tentar?" className="flex-1 bg-[#0f0f1b] border-2 border-[#c5a059]/30 p-3 rounded text-xs focus:border-[#c5a059] outline-none font-sans text-zinc-300 placeholder:text-zinc-700 transition-colors" />
                  <button onClick={() => handleAction(customAction, true)} disabled={!customAction.trim()} className="bg-[#c5a059] text-black px-6 rounded font-title uppercase text-[10px] hover:bg-white transition-all disabled:opacity-30">Tentar</button>
                </div>
              </div>
            </div>
          )}
          
          {gameState.isGameOver && (
             <div className="mt-8 text-center animate-in zoom-in">
                <p className="text-red-500 font-title uppercase text-2xl mb-4">A Jornada Terminou</p>
                <button onClick={() => window.location.reload()} className="bg-red-950 border-2 border-red-600 p-6 rounded font-title uppercase tracking-widest text-white hover:bg-red-900 transition-all shadow-[0_0_20px_rgba(255,0,0,0.2)]">Renascer na Taberna</button>
             </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <CharacterCard character={character} />
        
        <div className="bg-[#1e1e2e] border-2 border-[#c5a059]/30 p-4 rounded h-64 flex flex-col shadow-xl">
           <h4 className="text-[#c5a059] font-title text-[10px] uppercase mb-4 border-b border-[#c5a059]/20 pb-2">Log da Sessão</h4>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
             {gameState.history.map((h, i) => (
               <div key={i} className="text-[10px] text-zinc-500 mb-2 border-l-2 border-zinc-800 pl-2 leading-relaxed animate-in fade-in slide-in-from-left duration-300">
                 <span className="text-[#c5a059]/50 font-bold block mb-0.5 uppercase text-[8px]">Turno {i+1}</span>
                 {h.substring(0, 100)}...
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
