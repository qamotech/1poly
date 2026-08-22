import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Player } from '../types';
import { audio } from '../audio';
import { Trophy, Sparkles, RotateCcw, Award, DollarSign, Home, Building } from 'lucide-react';

interface GameOverScreenProps {
  winner: Player | null;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ winner, onRestart }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboard'>('stats');

  // Trigger high-impact celebratory particle bursts using canvas-confetti
  const triggerCelebrationConfetti = () => {
    // Center big burst
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#00E5FF', '#76FF03', '#D500F9']
    });

    // Left cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: ['#FFD700', '#FFDF00', '#FFA500', '#FFFFFF']
      });
    }, 250);

    // Right cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: ['#FFD700', '#FFDF00', '#FFA500', '#FFFFFF']
      });
    }, 450);

    // Continuous fireworks interval for 4 seconds
    const end = Date.now() + 3500;
    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: {
          x: Math.random(),
          y: Math.random() - 0.2
        },
        colors: ['#FFD700', '#F59E0B', '#10B981', '#3B82F6', '#EC4899']
      });
    }, 400);
  };

  useEffect(() => {
    // Sound fanfare
    audio.playGo(0);
    setTimeout(() => audio.playBuy(0), 300);
    setTimeout(() => audio.playRailroad(0), 800);

    // Launch celebratory particle confetti
    triggerCelebrationConfetti();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto overflow-hidden p-4">
      {/* Dimmed background with gold radial tint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
      />
      
      {/* Sunburst rotating luxury background */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-[200vw] h-[200vw] rounded-full pointer-events-none opacity-40"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg 15deg, rgba(245, 158, 11, 0.18) 15deg 30deg, transparent 30deg 45deg, rgba(245, 158, 11, 0.18) 45deg 60deg, transparent 60deg 75deg, rgba(245, 158, 11, 0.18) 75deg 90deg, transparent 90deg 105deg, rgba(245, 158, 11, 0.18) 105deg 120deg, transparent 120deg 135deg, rgba(245, 158, 11, 0.18) 135deg 150deg, transparent 150deg 165deg, rgba(245, 158, 11, 0.18) 165deg 180deg, transparent 180deg 195deg, rgba(245, 158, 11, 0.18) 195deg 210deg, transparent 210deg 225deg, rgba(245, 158, 11, 0.18) 225deg 240deg, transparent 240deg 255deg, rgba(245, 158, 11, 0.18) 255deg 270deg, transparent 270deg 285deg, rgba(245, 158, 11, 0.18) 285deg 300deg, transparent 300deg 315deg, rgba(245, 158, 11, 0.18) 315deg 330deg, transparent 330deg 345deg, rgba(245, 158, 11, 0.18) 345deg 360deg)'
        }}
      />

      {/* Center Trophy Modal Card */}
      <motion.div 
        initial={{ scale: 0.6, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.45, duration: 0.9 }}
        className="relative z-10 bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 p-1.5 rounded-3xl shadow-[0_0_90px_rgba(245,158,11,0.5)] max-w-lg w-full"
      >
        <div className="bg-slate-900 rounded-[22px] p-6 sm:p-8 flex flex-col items-center border border-amber-400/50 shadow-2xl relative overflow-hidden">
          
          {/* Top Floating Trophy Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
            <Trophy size={14} className="text-amber-400" />
            <span>Grand Champion</span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-sm mb-4 text-center tracking-tight">
            VICTORY!
          </h1>

          {winner ? (
            <div className="flex flex-col items-center w-full">
              {/* Winner Token Showcase */}
              <motion.div 
                animate={{ 
                  y: [-8, 8, -8], 
                  rotate: [-4, 4, -4],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl sm:text-8xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] mb-2 select-none"
              >
                {winner.token}
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center">
                {winner.name}
              </h2>
              
              <div className="mt-1 flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-emerald-300 font-mono font-black text-xl">
                  ${winner.money.toLocaleString()} Cash
                </span>
              </div>
              
              {/* Stat Highlights Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mt-5">
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700 text-center">
                  <p className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                    {winner.properties.length}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Properties</p>
                </div>
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700 text-center">
                  <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                    ${winner.stats.rentCollected.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Rent Earned</p>
                </div>
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700 text-center">
                  <p className="text-xl sm:text-2xl font-mono font-black text-blue-400">
                    ${winner.stats.highestMoney.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Peak Net Worth</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <span className="text-6xl mb-3 block">💀</span>
              <h3 className="text-xl font-bold text-slate-300">
                All players went bankrupt. The Bank wins!
              </h3>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
            <button
              onClick={() => {
                audio.playUiClick();
                triggerCelebrationConfetti();
              }}
              className="w-full sm:w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-sm rounded-xl transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles size={16} /> More Confetti!
            </button>
            <button 
              onClick={() => {
                audio.playUiClick();
                onRestart();
              }}
              className="w-full sm:w-1/2 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={16} /> Play Again
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
