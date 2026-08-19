import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player } from '../types';
import { audio } from '../audio';

interface TurnNotificationProps {
  currentPlayer: Player | null;
}

export const TurnNotification: React.FC<TurnNotificationProps> = ({ currentPlayer }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (currentPlayer) {
      setIsVisible(true);
      
      // Optional: Give a little subtle ui click when the turn banner appears
      audio.playUiClick(0);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Display for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [currentPlayer?.id]); // Re-run whenever the current player ID changes

  return (
    <AnimatePresence>
      {isVisible && currentPlayer && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.9 }}
          animate={{ y: 24, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl px-8 py-4 flex items-center gap-6 overflow-hidden relative">
            
            {/* Color accent bar reflecting the player token color if applicable, or generic emerald */}
            <div className={`absolute top-0 left-0 w-2 h-full ${currentPlayer.token === '🚗' ? 'bg-red-500' : currentPlayer.token === '🎩' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />

            <motion.span 
              initial={{ rotate: -15, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
              className="text-5xl drop-shadow-xl"
            >
              {currentPlayer.token}
            </motion.span>
            
            <div className="flex flex-col pr-4">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Active Player</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {currentPlayer.name}'s Turn
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
