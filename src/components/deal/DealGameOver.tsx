import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { DealPlayer } from '../../deal/dealTypes';
import { Trophy, Sparkles, RefreshCw, Home, DollarSign, Swords } from 'lucide-react';
import { audio } from '../../audio';

interface DealGameOverProps {
  winner: DealPlayer | null;
  onRestart: () => void;
  onSwitchToClassic: () => void;
}

export const DealGameOver: React.FC<DealGameOverProps> = ({
  winner,
  onRestart,
  onSwitchToClassic,
}) => {
  useEffect(() => {
    // Sound & Confetti blast
    audio.playGo();

    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            <Trophy size={14} /> 1poly Cards Champion
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            {winner?.name} Wins!
          </h2>
          <div className="text-5xl my-3 filter drop-shadow-lg">{winner?.token}</div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
            Successfully collected <strong>3 Complete Property Sets</strong> and conquered the 1poly Cards arena!
          </p>
        </div>

        {/* Stats card */}
        {winner && (
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sets Done</span>
              <span className="text-base font-bold text-amber-400 flex items-center gap-1">
                <Home size={14} /> {winner.completedSetsCount} / 3
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cards Played</span>
              <span className="text-base font-bold text-blue-400 flex items-center gap-1">
                <Sparkles size={14} /> {winner.stats.cardsPlayed}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rent Made</span>
              <span className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <DollarSign size={14} /> ${winner.stats.rentCollected}M
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => {
              audio.playUiClick();
              onRestart();
            }}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={16} /> Deal Again (Rematch)
          </button>
          <button
            onClick={() => {
              audio.playUiClick();
              onSwitchToClassic();
            }}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            Classic Board Game
          </button>
        </div>
      </motion.div>
    </div>
  );
};
