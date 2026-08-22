import React from 'react';
import { motion } from 'motion/react';
import { GameState, TradeOffer, PlayerType } from '../types';
import { SPACES } from '../engine/board';

interface TradeResponseModalProps {
  gameState: GameState;
  offer: TradeOffer;
  isTargetPlayer: boolean;
  onRespond: (accepted: boolean) => void;
}

export const TradeResponseModal: React.FC<TradeResponseModalProps> = ({ gameState, offer, isTargetPlayer, onRespond }) => {
  const fromPlayer = gameState.players.find(p => p.id === offer.fromPlayerId);
  const toPlayer = gameState.players.find(p => p.id === offer.toPlayerId);

  if (!fromPlayer || !toPlayer) return null;

  const renderPropertyList = (propIds: string[]) => {
    if (propIds.length === 0) return <span className="text-slate-500 text-xs italic">No properties</span>;
    return (
      <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
        {propIds.map(id => {
          const space = SPACES.find(s => s.id === id);
          if (!space) return null;
          return (
            <li key={id} className="flex items-center gap-2 text-xs bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
              <div 
                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40" 
                style={{ backgroundColor: space.groupColor || '#94a3b8' }} 
              />
              <div className="flex-1 min-w-0">
                <span className="text-slate-200 font-bold block truncate">{space.name}</span>
                <span className="text-slate-400 font-mono text-[10px]">${space.price || 0}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div id="trade-response-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div 
        id="trade-response-modal-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(59,130,246,0.25)] max-w-xl w-full flex flex-col gap-5 text-white"
      >
        <div className="text-center">
          <span className="text-4xl mb-1 block">🤝</span>
          <h2 className="text-2xl font-black text-white">Trade Proposal</h2>
          <p className="text-slate-400 text-xs mt-1">
            <span className="font-bold text-blue-400">{fromPlayer.name}</span> wants to trade with{' '}
            <span className="font-bold text-emerald-400">{toPlayer.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60">
          {/* What target gets */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-slate-700 pb-1.5">
              {toPlayer.name} Receives:
            </h3>
            {offer.offerMoney > 0 && (
              <div className="font-mono text-lg text-green-400 font-black">
                +${offer.offerMoney}
              </div>
            )}
            {renderPropertyList(offer.offerProperties)}
          </div>

          {/* What target gives */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-red-400 font-bold text-xs uppercase tracking-wider border-b border-slate-700 pb-1.5">
              {toPlayer.name} Gives:
            </h3>
            {offer.requestMoney > 0 && (
              <div className="font-mono text-lg text-red-400 font-black">
                -${offer.requestMoney}
              </div>
            )}
            {renderPropertyList(offer.requestProperties)}
          </div>
        </div>

        {isTargetPlayer && toPlayer.type !== PlayerType.CPU ? (
          <div className="flex gap-3 mt-1">
            <button 
              id="trade-reject-btn"
              onClick={() => onRespond(false)}
              className="flex-1 bg-slate-800 hover:bg-red-900/60 text-white font-bold py-3 px-5 rounded-xl border border-slate-700 hover:border-red-500 transition-all text-sm"
            >
              Reject Offer
            </button>
            <button 
              id="trade-accept-btn"
              onClick={() => onRespond(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all text-sm"
            >
              Accept Trade
            </button>
          </div>
        ) : (
          <div className="text-center p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 text-xs flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>
              {toPlayer.type === PlayerType.CPU 
                ? `AI (${toPlayer.name}) is evaluating property synergies & fair value...`
                : `Waiting for ${toPlayer.name} to respond...`
              }
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
