import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { DealPlayer } from '../../deal/dealTypes';
import { Trophy, Sparkles, RefreshCw, Home, DollarSign, Swords } from 'lucide-react';
import { audio } from '../../audio';
import { WaveText, Confetti, OrbitSparkles } from '../Fx';

interface DealGameOverProps {
  winner: DealPlayer | null;
  onRestart: () => void;
  onSwitchToClassic: () => void;
  /** Multiplayer: only the host can deal the rematch. */
  canRestart?: boolean;
}

export const DealGameOver: React.FC<DealGameOverProps> = ({
  winner,
  onRestart,
  onSwitchToClassic,
  canRestart = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Grand victory fanfare & a celebration that runs the whole time the
    // champion screen is up: opening explosion, side cannons, money rain
    // (bills & coins dropping from the top) and fresh explosions every few
    // seconds — on EVERY win, not just the first.
    audio.playVictory();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dedicated confetti canvas rendered inside this overlay at z-[400].
    // The shared default confetti canvas lives at z-index 100 — underneath
    // this screen's z-[300] 90%-opaque backdrop — which is why the old
    // 4-second blast was barely visible behind the dim.
    const fire = confetti.create(canvas, { resize: true });
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    const moneyShapes = ['💵', '🪙', '💰'].map((text) =>
      confetti.shapeFromText({ text, scalar: 2 })
    );

    // Opening explosion
    fire({
      particleCount: 90,
      spread: 110,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.45 },
      colors,
    });

    // Side cannons for the first few seconds
    const cannonEnd = Date.now() + 3000;
    let raf = 0;
    const frame = () => {
      fire({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      fire({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < cannonEnd) {
        raf = requestAnimationFrame(frame);
      }
    };
    frame();

    // Money rain — bills and coins dropping from the top
    const rain = setInterval(() => {
      fire({
        shapes: moneyShapes,
        scalar: 1.8,
        particleCount: 9,
        angle: 270,
        spread: 35,
        startVelocity: 12,
        gravity: 0.55,
        ticks: 260,
        origin: { x: 0.15 + Math.random() * 0.7, y: 0 },
      });
    }, 1500);

    // A fresh explosion every few seconds
    const boom = setInterval(() => {
      fire({
        particleCount: 70,
        spread: 100,
        startVelocity: 38,
        origin: { x: 0.25 + Math.random() * 0.5, y: 0.35 + Math.random() * 0.2 },
        colors,
      });
    }, 2800);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(rain);
      clearInterval(boom);
      fire.reset();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      {/* Celebration canvas — above the backdrop and the card, clicks pass through */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[400] w-full h-full pointer-events-none"
      />
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-6 relative overflow-hidden fx-chase-frame"
      >
        <span className="fx-rays" aria-hidden="true" />
        <Confetti />
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            <Trophy size={14} /> 1poly Cards Champion
          </div>
          <h2 className="text-3xl sm:text-4xl font-black fx-shimmer-text">
            <WaveText text={winner?.name ?? ''} /> Wins!
          </h2>
          <div className="fx-orbit-wrap text-5xl my-3 filter drop-shadow-lg fx-trophy-bounce"><OrbitSparkles />{winner?.token}</div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
            Successfully collected <strong>3 Complete Property Sets</strong> and conquered the 1poly Cards arena!
          </p>
        </div>

        {/* Stats card */}
        {winner && (
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left">
            <div className="space-y-1 fx-standing-row" style={{ animationDelay: '0ms' }}>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sets Done</span>
              <span className="text-base font-bold text-amber-400 flex items-center gap-1">
                <Home size={14} /> {winner.completedSetsCount} / 3
              </span>
            </div>
            <div className="space-y-1 fx-standing-row" style={{ animationDelay: '110ms' }}>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cards Played</span>
              <span className="text-base font-bold text-blue-400 flex items-center gap-1">
                <Sparkles size={14} /> {winner.stats.cardsPlayed}
              </span>
            </div>
            <div className="space-y-1 fx-standing-row" style={{ animationDelay: '220ms' }}>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rent Made</span>
              <span className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <DollarSign size={14} /> ${winner.stats.rentCollected}M
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {canRestart ? (
            <button
              onClick={() => {
                audio.playUiClick();
                onRestart();
              }}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer fx-rematch-heartbeat"
            >
              <RefreshCw size={16} /> Deal Again (Rematch)
            </button>
          ) : (
            <div className="flex-1 py-3 px-4 bg-slate-800/60 text-slate-400 font-bold text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2">
              ⏳ Waiting for the host to deal the rematch…
            </div>
          )}
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
