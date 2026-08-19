import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCard, CardDeck, GameState } from '../types';

interface CardDrawModalProps {
  gameState: GameState;
  onClose: () => void;
}

export const CardDrawModal: React.FC<CardDrawModalProps> = ({ gameState, onClose }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const data = gameState.lastCardDrawn;

  // Auto flip after a short delay
  useEffect(() => {
    if (data) {
      setIsFlipped(false);
      const timer = setTimeout(() => setIsFlipped(true), 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) return null;

  const { card, playerId, deck } = data;
  const player = gameState.players.find(p => p.id === playerId);
  const isChance = deck === CardDeck.CHANCE;

  // Styling maps
  const cardStyles = isChance 
    ? { bg: 'bg-orange-500', icon: '❓', title: 'Chance' } 
    : { bg: 'bg-blue-500', icon: '🎁', title: 'Community Chest' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()} style={{ perspective: '1200px' }}>
        
        {/* The Card Container */}
        <motion.div
          animate={{ rotateY: isFlipped ? 0 : 180 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 60, damping: 12 }}
          className="relative w-full aspect-[2.5/3.5] transform-style-3d cursor-pointer shadow-2xl"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Card Front (The actual text) */}
          <div className="absolute inset-0 backface-hidden bg-white border-8 border-white rounded-2xl flex flex-col items-center p-6 text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className={`w-full h-2 ${cardStyles.bg} absolute top-0 left-0`}></div>
            <div className="text-4xl mt-2 mb-4">{cardStyles.icon}</div>
            <h2 className={`text-2xl font-black uppercase mb-4 ${isChance ? 'text-orange-600' : 'text-blue-600'}`}>
              {cardStyles.title}
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-800 text-lg font-bold leading-snug">
                {card.description}
              </p>
            </div>
            
            <div className={`w-full h-2 ${cardStyles.bg} absolute bottom-0 left-0`}></div>
            {/* Holographic metallic overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none opacity-50 mix-blend-overlay"></div>
          </div>

          {/* Card Back (The design) */}
          <div className={`absolute inset-0 backface-hidden ${cardStyles.bg} border-8 border-white rounded-2xl flex items-center justify-center shadow-inner`} style={{ transform: 'rotateY(180deg)' }}>
            <div className="border-[6px] border-white/30 rounded-xl w-5/6 h-5/6 flex flex-col items-center justify-center p-4">
               <span className="text-8xl text-white drop-shadow-md mb-2">{cardStyles.icon}</span>
               <h2 className="text-white text-3xl font-black uppercase tracking-widest text-center shadow-black drop-shadow-lg">
                 {cardStyles.title}
               </h2>
            </div>
          </div>
        </motion.div>

        {/* Floating Player Info */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-20 left-0 right-0 flex flex-col items-center gap-4"
            >
              <div className="bg-slate-900 text-white px-6 py-2 rounded-full border border-slate-700 shadow-xl flex items-center gap-3 font-bold">
                <span className="text-2xl">{player?.token}</span>
                {player?.name} drew a card!
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Click anywhere to dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
