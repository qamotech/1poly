import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Player } from '../types';
import { audio } from '../audio';

interface GameOverScreenProps {
  winner: Player | null;
  onRestart: () => void;
}

const COLORS = ['#FFC700', '#FF0000', '#2E3192', '#1BFFFF', '#FF00FF'];

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ winner, onRestart }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate random confetti particles
    const newParticles = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage vw
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 2,
    }));
    setParticles(newParticles);
    
    // Play celebratory sound if engine supports it, or just an arpeggio
    setTimeout(() => {
      audio.playGo(0);
      setTimeout(() => audio.playGo(0), 400);
      setTimeout(() => audio.playBuy(0), 1000);
    }, 100);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto overflow-hidden">
      {/* Dimmed background with gold tint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-yellow-900/40 backdrop-blur-md"
      />
      
      {/* Sunburst rotating background */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-[200vw] h-[200vw] rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg 15deg, rgba(255, 215, 0, 0.15) 15deg 30deg, transparent 30deg 45deg, rgba(255, 215, 0, 0.15) 45deg 60deg, transparent 60deg 75deg, rgba(255, 215, 0, 0.15) 75deg 90deg, transparent 90deg 105deg, rgba(255, 215, 0, 0.15) 105deg 120deg, transparent 120deg 135deg, rgba(255, 215, 0, 0.15) 135deg 150deg, transparent 150deg 165deg, rgba(255, 215, 0, 0.15) 165deg 180deg, transparent 180deg 195deg, rgba(255, 215, 0, 0.15) 195deg 210deg, transparent 210deg 225deg, rgba(255, 215, 0, 0.15) 225deg 240deg, transparent 240deg 255deg, rgba(255, 215, 0, 0.15) 255deg 270deg, transparent 270deg 285deg, rgba(255, 215, 0, 0.15) 285deg 300deg, transparent 300deg 315deg, rgba(255, 215, 0, 0.15) 315deg 330deg, transparent 330deg 345deg, rgba(255, 215, 0, 0.15) 345deg 360deg)'
        }}
      />

      {/* Confetti container */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -100, x: `${p.x}vw`, opacity: 0, rotateX: 0, rotateY: 0 }}
            animate={{ 
              y: '100vh', 
              opacity: [0, 1, 1, 0],
              rotateX: 720,
              rotateY: 360,
              x: `${p.x + (Math.random() * 10 - 5)}vw`
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 w-3 h-6"
            style={{ 
              backgroundColor: p.color,
              transform: `scale(${p.size})`
            }}
          />
        ))}
      </div>

      {/* Center Modal Card */}
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
        className="relative z-10 bg-gradient-to-b from-yellow-100 to-yellow-300 p-1 rounded-3xl shadow-[0_0_100px_rgba(255,215,0,0.6)]"
      >
        <div className="bg-white rounded-[22px] px-12 py-10 flex flex-col items-center border-4 border-yellow-400">
          
          <h2 className="text-xl font-bold text-slate-500 uppercase tracking-[0.3em] mb-2">Game Over</h2>
          
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 drop-shadow-sm mb-6 text-center leading-tight">
            VICTORY!
          </h1>

          {winner ? (
            <div className="flex flex-col items-center">
              <motion.div 
                animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-8xl drop-shadow-2xl mb-4"
              >
                {winner.token}
              </motion.div>
              <h3 className="text-3xl font-bold text-slate-800 text-center">{winner.name}</h3>
              <p className="text-emerald-600 font-mono font-bold text-2xl mt-2">${winner.money.toLocaleString()}</p>
              
              <div className="mt-4 flex gap-4 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                <div className="text-center">
                  <p className="text-2xl text-slate-800">{winner.properties.length}</p>
                  <p>Properties</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl text-slate-800">${winner.stats.rentCollected}</p>
                  <p>Rent Earned</p>
                </div>
              </div>
            </div>
          ) : (
            <h3 className="text-2xl font-bold text-slate-800 text-center">It's a draw! Everyone went bankrupt.</h3>
          )}

          <button 
            onClick={onRestart}
            className="mt-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xl py-4 px-12 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
};
