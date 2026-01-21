
import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
}

const Tutorial: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo a Aethelgard!",
      text: "Esta é uma aventura de RPG 'Old School' gerada por IA. Você joga como um personagem sentado em uma mesa de RPG virtual.",
      position: "center"
    },
    {
      title: "A Narrativa",
      text: "O Mestre (IA) descreverá a cena aqui. Leia com atenção para encontrar pistas e decidir seu próximo passo.",
      position: "center", 
      highlight: "story-box"
    },
    {
      title: "Suas Escolhas",
      text: "Você pode escolher uma das opções pré-definidas ou digitar qualquer coisa no campo 'Improviso'. A criatividade é recompensada!",
      position: "bottom",
      highlight: "action-box"
    },
    {
      title: "O Dado (D20)",
      text: "Toda ação exige uma rolagem de dado. 20 é Sucesso Crítico, 1 é Falha Crítica. O resultado define se você acerta ou erra.",
      position: "center"
    },
    {
      title: "Ficha & Habilidades",
      text: "Gerencie seu HP (Vermelho) e Mana (Azul). Clique nas habilidades para ver Dano e Custo. Se a Mana acabar, você não poderá usar a habilidade!",
      position: "right",
      highlight: "character-card"
    },
    {
      title: "O Advogado de Regras",
      text: "Cuidado! Um agente de IA verifica se suas ações são possíveis. Não tente voar se você for um Guerreiro sem asas!",
      position: "left"
    }
  ];

  const currentStep = steps[step];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1e1e2e] border-4 border-[#d4af37] max-w-md w-full p-6 rounded shadow-[0_0_50px_rgba(212,175,55,0.3)] animate-in zoom-in duration-300 relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#d4af37] text-black px-4 py-1 rounded font-title font-bold border-2 border-white uppercase text-sm">
          Tutorial {step + 1}/{steps.length}
        </div>

        <h3 className="text-2xl text-[#d4af37] font-title mb-4 text-center">{currentStep.title}</h3>
        <p className="text-zinc-300 text-center mb-8 leading-relaxed font-serif text-sm">
          {currentStep.text}
        </p>

        <div className="flex gap-4 justify-center">
          <button onClick={onComplete} className="text-zinc-500 hover:text-white text-xs uppercase font-title underline">
            Pular
          </button>
          <button onClick={next} className="bg-[#d4af37] text-black px-8 py-2 rounded font-title uppercase font-bold hover:bg-white transition-colors">
            {step === steps.length - 1 ? "Começar Jogo" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
