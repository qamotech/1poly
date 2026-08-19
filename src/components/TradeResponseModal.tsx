import React from 'react';
import { motion } from 'motion/react';
import { GameState, TradeOffer } from '../types';
import { SPACES } from '../engine/board';

interface TradeResponseModalProps {
  gameState: GameState;
  offer: TradeOffer;
  isTargetPlayer: boolean;
  onRespond: (accepted: boolean) => void;
}

export const TradeResponseModal: React.FC<TradeResponseModalProps> = ({ gameState, offer, isTargetPlayer, onRespond }) => {
  const fromPlayer = gameState.players.find(p => p.id === offer.fromPlayerId)!;
  const toPlayer = gameState.players.find(p => p.id === offer.toPlayerId)!;

  const renderPropertyList = (propIds: string[]) => {
    if (propIds.length === 0) return <span className="text-slate-500 italic">No properties</span>;
    return (
      <ul className="space-y-1">
        {propIds.map(id => {
          const space = SPACES.find(s => s.id === id)!;
          return (
            <li key={id} className="flex items-center gap-2 text-sm bg-slate-800 p-1.5 rounded">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: space.groupColor || '#ccc' }} />
              <span className="text-slate-300">{space.name}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(59,130,246,0.2)] max-w-xl w-full flex flex-col gap-6"
      >
        <div className="text-center">
          <span className="text-4xl mb-2 block">🤝</span>
          <h2 className="text-2xl font-black text-white">Trade Proposal</h2>
          <p className="text-slate-400 mt-1">
            <span className="font-bold text-blue-400">{fromPlayer.name}</span> wants to trade with <span className="font-bold text-emerald-400">{toPlayer.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-xl">
          {/* What target gets */}
          <div className="flex flex-col gap-3">
            <h3 className="text-emerald-400 font-bold border-b border-slate-700 pb-2">{toPlayer.name} Gets:</h3>
            {offer.offerMoney > 0 && (
              <div className="font-mono text-xl text-green-400 font-bold">${offer.offerMoney}</div>
            )}
            {renderPropertyList(offer.offerProperties)}
          </div>

          {/* What target gives */}
          <div className="flex flex-col gap-3">
            <h3 className="text-red-400 font-bold border-b border-slate-700 pb-2">{toPlayer.name} Gives:</h3>
            {offer.requestMoney > 0 && (
              <div className="font-mono text-xl text-red-400 font-bold">${offer.requestMoney}</div>
            )}
            {renderPropertyList(offer.requestProperties)}
          </div>
        </div>

        {isTargetPlayer ? (
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => onRespond(false)}
              className="flex-1 bg-slate-800 hover:bg-red-900/50 text-white font-bold py-3 px-6 rounded-xl border border-slate-700 hover:border-red-500 transition-colors"
            >
              Reject
            </button>
            <button 
              onClick={() => onRespond(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-colors"
            >
              Accept Trade
            </button>
          </div>
        ) : (
          <div className="text-center p-4 bg-slate-800 rounded-xl text-slate-400 animate-pulse">
            Waiting for {toPlayer.name} to respond...
          </div>
        )}
      </motion.div>
    </div>
  );
};
