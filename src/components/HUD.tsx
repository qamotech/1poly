import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GameState, GamePhase, SpaceType } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';

const getLogStyle = (log: string) => {
  const lower = log.toLowerCase();
  if (lower.includes('rolled')) return { icon: '🎲', color: 'text-slate-200', bg: 'bg-slate-800/60', border: 'border-slate-700/50' };
  if (lower.includes('bought')) return { icon: '🏷️', color: 'text-emerald-300', bg: 'bg-emerald-900/30', border: 'border-emerald-800/50' };
  if (lower.includes('rent')) return { icon: '💸', color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-800/50' };
  if (lower.includes('passed go') || lower.includes('landed on go')) return { icon: '🏁', color: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50' };
  if (lower.includes('jail')) return { icon: '🚓', color: 'text-orange-300', bg: 'bg-orange-900/30', border: 'border-orange-800/50' };
  if (lower.includes('chance') || lower.includes('community chest') || lower.includes('drew')) return { icon: '🃏', color: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-800/50' };
  if (lower.includes('steal') || lower.includes('trade')) return { icon: '🥷', color: 'text-pink-300', bg: 'bg-pink-900/30', border: 'border-pink-800/50' };
  if (lower.includes('tax')) return { icon: '🏦', color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-800/50' };
  if (lower.includes('pot') || lower.includes('free parking')) return { icon: '🚗', color: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50' };
  if (lower.includes('won')) return { icon: '🏆', color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-500' };
  if (lower.includes('bankrupt')) return { icon: '💀', color: 'text-slate-400', bg: 'bg-slate-900', border: 'border-slate-800' };
  return { icon: '📢', color: 'text-slate-300', bg: 'bg-slate-800/30', border: 'border-slate-800/50' };
};

interface HUDProps {
  gameState: GameState;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyProperty: () => void;
  onOpenTradeModal: () => void;
  onOpenPropertyModal: () => void;
  isCpuTurn: boolean;
}

export const HUD: React.FC<HUDProps> = ({ gameState, onRoll, onEndTurn, onBuyProperty, onOpenTradeModal, onOpenPropertyModal, isCpuTurn }) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Turn Timer Logic
  const TURN_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  useEffect(() => {
    // Reset timer when it becomes a human's turn or their phase changes
    if (!isCpuTurn && (gameState.phase === GamePhase.TURN_START || gameState.phase === GamePhase.POST_ROLL)) {
      setTimeLeft(TURN_TIME_LIMIT);
    } else {
      setTimeLeft(0);
    }
  }, [gameState.currentPlayerIndex, gameState.phase, isCpuTurn]);

  useEffect(() => {
    if (isCpuTurn || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up! Auto-force the required action
          if (gameState.phase === GamePhase.TURN_START) {
            onRoll();
          } else if (gameState.phase === GamePhase.POST_ROLL) {
            onEndTurn();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCpuTurn, timeLeft, gameState.phase, onRoll, onEndTurn]);

  const progressPercent = (timeLeft / TURN_TIME_LIMIT) * 100;

  // Edge case logic for Buy button
  const currentSpace = currentPlayer ? SPACES[currentPlayer.position] : null;
  const propertyState = currentSpace ? gameState.propertyStates[currentSpace.id] : null;
  
  const canBuyProperty = 
    gameState.phase === GamePhase.POST_ROLL && 
    !isCpuTurn && 
    currentSpace && 
    [SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(currentSpace.type) &&
    propertyState && 
    !propertyState.ownerId &&
    currentSpace.price !== undefined &&
    currentPlayer.money >= currentSpace.price;

  // We use logs.length combined with turn state to ensure a unique key every time the dice are rolled
  const rollAnimationKey = `${gameState.turnCount}-${gameState.doublesRolledCount}-${gameState.logs.length}`;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Bar: Player Info & Pot */}
      <div className="flex flex-col gap-4">
        {/* Current Player Info */}
        <motion.div 
          animate={{ 
            boxShadow: ['0px 0px 0px 0px rgba(59, 130, 246, 0)', '0px 0px 20px 2px rgba(59, 130, 246, 0.4)', '0px 0px 0px 0px rgba(59, 130, 246, 0)'],
            borderColor: ['rgba(51, 65, 85, 1)', 'rgba(59, 130, 246, 0.8)', 'rgba(51, 65, 85, 1)']
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="bg-slate-800 p-4 rounded-2xl shadow-xl border-2 relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-slate-400 text-xs uppercase tracking-wider">Current Turn</h3>
            {!isCpuTurn && timeLeft > 0 && (
              <span className={`text-xs font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                {timeLeft}s
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 overflow-hidden z-10 relative">
            <span className="text-2xl lg:text-4xl bg-slate-700 p-2 lg:p-3 rounded-full shrink-0">{currentPlayer?.token || '🎲'}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                <span className="truncate">{currentPlayer?.name || 'Waiting...'}</span>
                {isCpuTurn && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold shrink-0">CPU</span>}
              </h2>
              <p className="text-green-400 font-mono text-lg">${currentPlayer?.money || 0}</p>
            </div>
          </div>

          {/* Turn Timer Progress Bar */}
          {!isCpuTurn && (
            <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Activity Log */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 flex-1 overflow-hidden flex flex-col min-h-[200px] shadow-inner relative">
        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Live Activity
        </h3>
        
        {/* Scroll mask for smooth top fade out */}
        <div className="absolute top-[40px] left-0 right-0 h-6 bg-gradient-to-b from-slate-900/80 to-transparent z-10 pointer-events-none" />
        
        <div className="overflow-y-auto flex-1 space-y-2 flex flex-col pr-2 pb-2 custom-scrollbar">
          {[...gameState.logs].reverse().map((log, id) => {
            const style = getLogStyle(log);
            return (
              <motion.div 
                key={gameState.logs.length - 1 - id} 
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                className={`text-sm p-3 rounded-xl flex gap-3 items-start border ${style.bg} ${style.color} ${style.border} shadow-sm backdrop-blur-sm`}
              >
                <span className="text-lg shrink-0 drop-shadow-md leading-none mt-0.5">{style.icon}</span>
                <span className="leading-snug font-medium">{log}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
