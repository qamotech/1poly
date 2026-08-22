import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BankruptcyRecord } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';

interface BankruptcyModalProps {
  bankruptcy: BankruptcyRecord | null;
  onClose: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({ bankruptcy, onClose }) => {
  if (!bankruptcy) return null;

  const player = bankruptcy.player;

  return (
    <AnimatePresence>
      <div 
        id="bankruptcy-modal-overlay"
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div 
          id="bankruptcy-modal-card"
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-slate-900 border-2 border-red-800/80 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.35)] max-w-lg w-full overflow-hidden text-white flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 p-6 border-b border-red-800/50 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl pointer-events-none select-none font-serif">
              💀
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-slate-950/80 border-4 border-red-600 flex items-center justify-center text-4xl shadow-lg mb-3">
                <span className="filter grayscale">{player.token}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-700 text-red-300 text-xs font-black uppercase tracking-widest mb-1 shadow-inner">
                <span>💀</span> BANKRUPT & ELIMINATED
              </div>

              <h2 className="text-3xl font-black text-white tracking-wide">
                {player.name}
              </h2>
              
              <p className="text-red-300/80 text-xs mt-1 font-medium max-w-xs">
                {bankruptcy.cause}
              </p>
            </div>
          </div>

          {/* Stats & Asset Breakdown Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-900/90">
            {/* Net Score & Liquidation Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Final Cash</span>
                <span className={`text-xl font-bold font-mono ${bankruptcy.finalMoney < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ${bankruptcy.finalMoney}
                </span>
                {bankruptcy.finalDebt > 0 && (
                  <span className="text-[11px] text-red-400/90 mt-0.5 font-medium">
                    Debt: ${bankruptcy.finalDebt}
                  </span>
                )}
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Liquidated Asset Value</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  ${bankruptcy.liquidatedAssetsValue}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Surrendered to Bank
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Rent Collected</span>
                <span className="text-lg font-bold font-mono text-blue-300">
                  ${bankruptcy.rentCollected}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Lifetime earnings
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Lifespan</span>
                <span className="text-lg font-bold font-mono text-purple-300">
                  Turn {bankruptcy.bankruptAtTurn}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {bankruptcy.totalRolls} total rolls
                </span>
              </div>
            </div>

            {/* Properties Liquidated Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏘️</span> Liquidated Properties ({bankruptcy.finalProperties.length})
                </h4>
                {(bankruptcy.totalHouses > 0 || bankruptcy.totalHotels > 0) && (
                  <span className="text-xs text-amber-400 font-medium">
                    {bankruptcy.totalHouses} 🏠 {bankruptcy.totalHotels} 🏨 destroyed
                  </span>
                )}
              </div>

              {bankruptcy.finalProperties.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-4 text-center text-slate-500 text-xs">
                  No title deeds were owned at the time of bankruptcy.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {bankruptcy.finalProperties.map(propId => {
                    const space = SPACES.find(s => s.id === propId);
                    if (!space) return null;
                    return (
                      <div 
                        key={propId} 
                        className="bg-slate-800 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5 overflow-hidden shadow-sm"
                      >
                        {space.groupColor ? (
                          <div 
                            className="w-3 h-8 rounded-md shrink-0 border border-black/30" 
                            style={{ backgroundColor: space.groupColor }} 
                          />
                        ) : (
                          <div className="w-3 h-8 rounded-md shrink-0 bg-slate-600 border border-black/30 flex items-center justify-center text-[10px]">
                            🏛️
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">{space.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">${space.price || 0}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button
              id="close-bankruptcy-summary-btn"
              onClick={() => {
                audio.playUiClick();
                onClose();
              }}
              className="w-full py-3 px-6 bg-red-800 hover:bg-red-700 active:scale-[0.98] text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm tracking-wide uppercase"
            >
              <span>💀</span> Acknowledge & Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
