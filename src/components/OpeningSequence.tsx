import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from '../types';
import { audio } from '../audio';
import { Sparkles, Flag, Play, FastForward, Shield, Trophy } from 'lucide-react';

interface OpeningSequenceProps {
  gameState: GameState;
  onComplete: () => void;
}

export const OpeningSequence: React.FC<OpeningSequenceProps> = ({ gameState, onComplete }) => {
  const [step, setStep] = useState<number>(0);
  const startingPlayer = gameState.players[gameState.currentPlayerIndex] || gameState.players[0];

  useEffect(() => {
    // Play initial fanfare sound
    audio.playGo(0);
    const timer1 = setTimeout(() => {
      audio.playDice(0);
      setStep(1);
    }, 1400);

    const timer2 = setTimeout(() => {
      audio.playBuy(0);
      setStep(2);
    }, 2800);

    const timer3 = setTimeout(() => {
      audio.playGo(0);
      setStep(3);
    }, 4200);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  const handleSkip = () => {
    audio.playUiClick();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950 flex flex-col items-center justify-center overflow-hidden p-4 select-none">
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.25)_0%,rgba(15,23,42,0.95)_70%,rgba(2,6,23,1)_100%)] pointer-events-none" />

      {/* Floating Gold Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: `${Math.random() * 100}vw`, 
              y: `${Math.random() * 100}vh`, 
              opacity: Math.random() * 0.7 + 0.3,
              scale: Math.random() * 1.5 + 0.5
            }}
            animate={{ 
              y: ['-10vh', '110vh'],
              x: [`${Math.random() * 100}vw`, `${(Math.random() * 20 - 10) + 50}vw`]
            }}
            transition={{ 
              duration: Math.random() * 4 + 3, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          />
        ))}
      </div>

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-30 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-full font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
      >
        <span>Skip Intro</span>
        <FastForward size={14} />
      </button>

      {/* Cinematic Sequence Stages */}
      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {/* STEP 0: Grand Title Banner Unveil */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.7, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-4"
            >
              <div className="px-8 py-3 bg-red-600 border-4 border-white shadow-[0_10px_35px_rgba(220,38,38,0.5)] rounded-2xl transform -rotate-2">
                <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-widest drop-shadow-md">
                  1POLY
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-px w-12 bg-amber-400/50" />
                <p className="text-amber-300 font-mono tracking-widest text-xs uppercase font-bold">
                  Official Deluxe Edition
                </p>
                <span className="h-px w-12 bg-amber-400/50" />
              </div>
            </motion.div>
          )}

          {/* STEP 1: All Player Tokens Assembling */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5 w-full"
            >
              <div className="flex items-center gap-2 text-amber-400 text-xs uppercase font-bold tracking-widest">
                <Sparkles size={16} />
                <span>Competitors Assemble</span>
                <Sparkles size={16} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {gameState.players.length} Players on the Grid
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 max-w-lg">
                {gameState.players.map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 30, scale: 0 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.4, type: "spring" }}
                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 shadow-xl min-w-[90px]"
                  >
                    <span className="text-4xl filter drop-shadow-md">{p.token}</span>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      ${p.money}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: The Rules & Board Stakes */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
                <Flag size={32} />
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Collect $200 at GO!
              </h2>

              <p className="text-slate-300 text-sm max-w-md leading-relaxed">
                Acquire color groups, build houses & hotels, manage mortgages, negotiate trades, and drive rivals into bankruptcy to claim victory!
              </p>

              <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-2">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-amber-400 font-mono text-base font-bold">$1,500</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Starting Cash</p>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-blue-400 font-mono text-base font-bold">40</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Board Spaces</p>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-emerald-400 font-mono text-base font-bold">28</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Title Deeds</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: First Turn Announcement */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="flex flex-col items-center gap-4"
            >
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span>🎲</span> Game Starting!
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-3">
                <span className="text-5xl sm:text-6xl">{startingPlayer.token}</span>
                <span>{startingPlayer.name} Goes First!</span>
              </h2>

              <p className="text-slate-400 text-sm">
                Get ready to roll the dice and claim your empire.
              </p>

              <button
                onClick={handleSkip}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play size={18} className="fill-slate-950" /> Roll to Start!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots at Bottom */}
      <div className="absolute bottom-8 flex items-center gap-2 z-20">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              step === i ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
