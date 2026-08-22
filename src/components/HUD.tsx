import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, GamePhase, BankruptcyRecord, GameSpeed } from '../types';
import { audio } from '../audio';
import { RotateCcw, Key, ShieldCheck, Zap, UserX, Trash2 } from 'lucide-react';

const getLogStyle = (log: string) => {
  const lower = log.toLowerCase();
  if (lower.includes('rolled')) return { icon: '🎲', color: 'text-slate-200', bg: 'bg-slate-800/60', border: 'border-slate-700/50' };
  if (lower.includes('bought')) return { icon: '🏷️', color: 'text-emerald-300', bg: 'bg-emerald-900/30', border: 'border-emerald-800/50' };
  if (lower.includes('auction') || lower.includes('bid')) return { icon: '🔨', color: 'text-amber-300', bg: 'bg-amber-900/30', border: 'border-amber-800/50' };
  if (lower.includes('rent')) return { icon: '💸', color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-800/50' };
  if (lower.includes('passed go') || lower.includes('landed on go')) return { icon: '🏁', color: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50' };
  if (lower.includes('jail')) return { icon: '🚓', color: 'text-orange-300', bg: 'bg-orange-900/30', border: 'border-orange-800/50' };
  if (lower.includes('chance') || lower.includes('community chest') || lower.includes('drew')) return { icon: '🃏', color: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-800/50' };
  if (lower.includes('steal') || lower.includes('trade')) return { icon: '🥷', color: 'text-pink-300', bg: 'bg-pink-900/30', border: 'border-pink-800/50' };
  if (lower.includes('tax')) return { icon: '🏦', color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-800/50' };
  if (lower.includes('pot') || lower.includes('free parking')) return { icon: '🚗', color: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50' };
  if (lower.includes('won')) return { icon: '🏆', color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-500' };
  if (lower.includes('bankrupt') || lower.includes('forfeited') || lower.includes('removed')) return { icon: '💀', color: 'text-red-400', bg: 'bg-red-950/60', border: 'border-red-800/60' };
  return { icon: '📢', color: 'text-slate-300', bg: 'bg-slate-800/30', border: 'border-slate-800/50' };
};

interface HUDProps {
  gameState: GameState;
  onRoll: () => void;
  onEndTurn: () => void;
  onPayBail?: () => void;
  onUseJailCard?: () => void;
  onBuyProperty: () => void;
  onOpenTradeModal: () => void;
  onOpenPropertyModal: () => void;
  onRestartGame?: () => void;
  onSetGameSpeed?: (speed: GameSpeed) => void;
  onRemovePlayer?: (playerId: string) => void;
  onViewBankruptcySummary?: (record: BankruptcyRecord) => void;
  isCpuTurn: boolean;
}

export const HUD: React.FC<HUDProps> = ({ 
  gameState, 
  onRoll, 
  onEndTurn, 
  onPayBail,
  onUseJailCard,
  onOpenPropertyModal,
  onRestartGame,
  onSetGameSpeed,
  onRemovePlayer,
  onViewBankruptcySummary,
  isCpuTurn 
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const [forfeitTarget, setForfeitTarget] = useState<typeof gameState.players[0] | null>(null);
  
  // Turn Timer Logic
  const TURN_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !isCpuTurn && gameState.phase === GamePhase.TURN_START) {
      audio.playUiClick(); // Ticking sound
    }
  }, [timeLeft, isCpuTurn, gameState.phase]);

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
          const hasDoublesRollAgain = 
            gameState.phase === GamePhase.POST_ROLL &&
            !currentPlayer?.inJail &&
            !currentPlayer?.isBankrupt &&
            gameState.doublesRolledCount > 0 &&
            gameState.doublesRolledCount < 3 &&
            gameState.lastDiceRoll !== null &&
            gameState.lastDiceRoll[0] === gameState.lastDiceRoll[1];

          if (gameState.phase === GamePhase.TURN_START || hasDoublesRollAgain) {
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
  }, [isCpuTurn, timeLeft, gameState.phase, gameState.doublesRolledCount, gameState.lastDiceRoll, currentPlayer?.inJail, currentPlayer?.isBankrupt, onRoll, onEndTurn]);

  const progressPercent = (timeLeft / TURN_TIME_LIMIT) * 100;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Bar: Active Player Card & Game Speed Controls */}
      <div className="flex flex-col gap-2">
        {/* Game Speed Switcher */}
        {onSetGameSpeed && (
          <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex items-center justify-between gap-1 shadow-inner">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1.5 flex items-center gap-1">
              <Zap size={11} className="text-yellow-400" /> Speed:
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onSetGameSpeed('normal')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  gameState.gameSpeed === 'normal' || !gameState.gameSpeed
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1x Normal
              </button>
              <button
                onClick={() => onSetGameSpeed('fast')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  gameState.gameSpeed === 'fast'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2x Fast
              </button>
              <button
                onClick={() => onSetGameSpeed('max')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  gameState.gameSpeed === 'max'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ultra-fast automated turns"
              >
                ⚡ Max Speed
              </button>
            </div>
          </div>
        )}

        <motion.div 
          animate={{ 
            boxShadow: ['0px 0px 0px 0px rgba(59, 130, 246, 0)', '0px 0px 18px 2px rgba(59, 130, 246, 0.35)', '0px 0px 0px 0px rgba(59, 130, 246, 0)'],
            borderColor: ['rgba(51, 65, 85, 1)', 'rgba(59, 130, 246, 0.8)', 'rgba(51, 65, 85, 1)']
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="bg-slate-800/95 p-3.5 rounded-2xl shadow-xl border-2 relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Current Turn</h3>
            <div className="flex items-center gap-2">
              {!isCpuTurn && timeLeft > 0 && (
                <span className={`text-xs font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                  {timeLeft}s
                </span>
              )}
              {onRestartGame && (
                <button
                  onClick={() => {
                    audio.playUiClick();
                    if (window.confirm('Restart game and return to lobby?')) {
                      onRestartGame();
                    }
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 text-[10px] flex items-center gap-1 transition-colors"
                  title="Reset Game"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 overflow-hidden z-10 relative">
            <span className="text-2xl bg-slate-700 p-2 rounded-full shrink-0 drop-shadow">{currentPlayer?.token || '🎲'}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2 whitespace-nowrap">
                <span className="truncate">{currentPlayer?.name || 'Waiting...'}</span>
                {isCpuTurn && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold shrink-0">CPU</span>}
                {currentPlayer?.inJail && <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">In Jail</span>}
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-green-400 font-mono text-base font-bold">${currentPlayer?.money || 0}</p>
                {currentPlayer?.loan ? (
                  <span className="text-[10px] text-red-400 font-medium">Loan: ${currentPlayer.loan}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* If In Jail, Quick Jail Actions in HUD */}
          {currentPlayer?.inJail && !isCpuTurn && gameState.phase === GamePhase.TURN_START && (
            <div className="mt-3 pt-2.5 border-t border-slate-700 flex gap-2">
              <button
                onClick={() => {
                  audio.playUiClick();
                  onPayBail && onPayBail();
                }}
                disabled={currentPlayer.money < 50}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  currentPlayer.money >= 50 ? 'bg-orange-600 hover:bg-orange-500 text-white shadow' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Key size={13} /> Pay Bail ($50)
              </button>
              {currentPlayer.getOutOfJailFreeCards > 0 && onUseJailCard && (
                <button
                  onClick={() => {
                    audio.playUiClick();
                    onUseJailCard();
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow flex items-center justify-center gap-1 transition-all"
                >
                  <ShieldCheck size={13} /> Use Card ({currentPlayer.getOutOfJailFreeCards})
                </button>
              )}
            </div>
          )}

          {/* Turn Timer Progress Bar */}
          {!isCpuTurn && (
            <div className="w-full bg-slate-700 h-1 mt-2.5 rounded-full overflow-hidden">
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

      {/* Players Roster & Bankrupt Visual Indicators */}
      <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/60 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span>👥</span> Players ({gameState.players.length})
          </h3>
          <span className="text-[10px] text-slate-500">
            {gameState.players.filter(p => !p.isBankrupt).length} Active
          </span>
        </div>

        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
          {gameState.players.map((p, idx) => {
            const isTurn = idx === gameState.currentPlayerIndex;
            const isBankrupt = p.isBankrupt || p.money < 0;
            const bankruptcyRecord = gameState.bankruptcies?.[p.id];

            if (isBankrupt) {
              return (
                <div
                  key={p.id}
                  id={`hud-player-${p.id}`}
                  className="p-2 rounded-xl bg-slate-950/80 border border-red-900/40 opacity-55 hover:opacity-100 transition-all flex items-center justify-between gap-2 shadow-inner group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-slate-900 border border-red-900/80 flex items-center justify-center text-sm filter grayscale shrink-0 relative">
                      <span>{p.token}</span>
                      <span className="absolute -bottom-1 -right-1 text-[10px]">💀</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 line-through truncate">{p.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-red-950 text-red-400 border border-red-800 rounded font-black tracking-wider uppercase">
                          BANKRUPT
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-red-400/80">
                        Eliminated {p.money < 0 ? `(-$${Math.abs(p.money)})` : '($0)'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Modal Trigger Button */}
                  {bankruptcyRecord && onViewBankruptcySummary && (
                    <button
                      id={`view-bankruptcy-btn-${p.id}`}
                      onClick={() => {
                        audio.playUiClick();
                        onViewBankruptcySummary(bankruptcyRecord);
                      }}
                      className="px-2 py-1 bg-red-900/60 hover:bg-red-800 border border-red-700/60 text-white rounded-lg text-[10px] font-bold transition-colors shrink-0 flex items-center gap-1"
                      title="View final score and liquidated assets"
                    >
                      <span>📜</span> Assets
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={p.id}
                id={`hud-player-${p.id}`}
                className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  isTurn 
                    ? 'bg-emerald-950/40 border-emerald-500/70 ring-2 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.25)]' 
                    : p.inJail
                    ? 'bg-amber-950/30 border-amber-500/60 ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                    : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 relative ${
                    isTurn 
                      ? 'bg-emerald-600/80 text-white ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.35)]' 
                      : p.inJail
                      ? 'bg-amber-700/80 text-white ring-2 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                      : 'bg-slate-700 text-slate-200 ring-1 ring-slate-600/50'
                  }`}>
                    {p.token}
                    {isTurn && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-pulse" />
                    )}
                    {p.inJail && !isTurn && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${isTurn ? 'text-emerald-200' : 'text-slate-200'}`}>
                        {p.name}
                      </span>
                      {p.type === 'CPU' && (
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded font-bold">CPU</span>
                      )}
                      {p.inJail && (
                        <span className="text-[9px] bg-amber-900/80 text-amber-300 border border-amber-600 px-1 rounded font-bold flex items-center gap-0.5">
                          <Key size={9} /> Jail
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="text-emerald-400 font-mono font-bold">${p.money}</span>
                      <span>•</span>
                      <span>{p.properties.length} props</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isTurn && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 rounded-md animate-pulse shrink-0">
                      Turn
                    </span>
                  )}
                  {onRemovePlayer && (
                    <button
                      onClick={() => {
                        audio.playUiClick();
                        setForfeitTarget(p);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors opacity-40 group-hover:opacity-100 cursor-pointer"
                      title={`Remove or forfeit ${p.name}`}
                    >
                      <UserX size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forfeit Confirmation Modal */}
      <AnimatePresence>
        {forfeitTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-900 border-2 border-red-500/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl">
                  <UserX size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Forfeit / Remove Player</h3>
                  <p className="text-xs text-slate-400">Eliminate {forfeitTarget.name} from match</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                All of <span className="font-bold text-white">{forfeitTarget.name}'s</span> properties will be liquidated and returned to the Bank, and turn order will advance immediately.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setForfeitTarget(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onRemovePlayer) {
                      onRemovePlayer(forfeitTarget.id);
                    }
                    setForfeitTarget(null);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors shadow flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Confirm Forfeit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Log */}
      <div className="bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/50 flex-1 overflow-hidden flex flex-col min-h-[160px] shadow-inner relative">
        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Live Activity
        </h3>
        
        {/* Scroll mask for smooth top fade out */}
        <div className="absolute top-[38px] left-0 right-0 h-5 bg-gradient-to-b from-slate-900/80 to-transparent z-10 pointer-events-none" />
        
        <div className="overflow-y-auto flex-1 space-y-2 flex flex-col pr-2 pb-2 custom-scrollbar">
          {[...gameState.logs].reverse().map((log, id) => {
            const style = getLogStyle(log);
            return (
              <motion.div 
                key={gameState.logs.length - 1 - id} 
                initial={{ opacity: 0, x: -15, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.25, type: "spring", bounce: 0.3 }}
                className={`text-xs p-2.5 rounded-xl flex gap-2.5 items-start border ${style.bg} ${style.color} ${style.border} shadow-sm backdrop-blur-sm`}
              >
                <span className="text-base shrink-0 drop-shadow-md leading-none mt-0.5">{style.icon}</span>
                <span className="leading-snug font-medium">{log}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
