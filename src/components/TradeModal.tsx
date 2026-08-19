import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GameState, Player, PropertyId, TradeOffer } from '../types';
import { SPACES } from '../engine/board';

interface TradeModalProps {
  gameState: GameState;
  currentPlayer: Player;
  onPropose: (offer: TradeOffer) => void;
  onCancel: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ gameState, currentPlayer, onPropose, onCancel }) => {
  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [offerProperties, setOfferProperties] = useState<PropertyId[]>([]);
  const [requestProperties, setRequestProperties] = useState<PropertyId[]>([]);

  const otherPlayers = gameState.players.filter(p => p.id !== currentPlayer.id);
  const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);

  const handleToggleProperty = (propId: PropertyId, isOffer: boolean) => {
    if (isOffer) {
      setOfferProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
    } else {
      setRequestProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
    }
  };

  const handlePropose = () => {
    if (!targetPlayerId) return;
    onPropose({
      fromPlayerId: currentPlayer.id,
      toPlayerId: targetPlayerId,
      offerMoney,
      offerProperties,
      requestMoney,
      requestProperties
    });
  };

  const renderPropertyCheckboxes = (properties: PropertyId[], selectedIds: PropertyId[], isOffer: boolean) => {
    if (properties.length === 0) return <p className="text-slate-400 text-sm italic">No properties owned.</p>;
    
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {properties.map(propId => {
          const space = SPACES.find(s => s.id === propId)!;
          const isSelected = selectedIds.includes(propId);
          return (
            <label key={propId} className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${isSelected ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-700/50'}`}>
              <div 
                className="w-4 h-4 rounded-full shadow-inner flex-shrink-0"
                style={{ backgroundColor: space.groupColor || '#ccc' }}
              />
              <span className="flex-1 text-sm text-slate-200">{space.name}</span>
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => handleToggleProperty(propId, isOffer)}
                className="w-4 h-4 rounded text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-6"
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🤝</span> Propose a Trade
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-slate-400 font-bold text-sm uppercase">Select Trading Partner:</label>
          <select 
            value={targetPlayerId} 
            onChange={(e) => setTargetPlayerId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Choose a player --</option>
            {otherPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.token}</option>
            ))}
          </select>
        </div>

        {targetPlayer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
            {/* Offer Side */}
            <div className="flex flex-col gap-4">
              <h3 className="text-blue-400 font-bold border-b border-slate-700 pb-2">What you offer:</h3>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs">Cash ($0 - ${currentPlayer.money})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    min="0" 
                    max={currentPlayer.money}
                    value={offerMoney}
                    onChange={(e) => setOfferMoney(Math.min(currentPlayer.money, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 pl-7 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-slate-400 text-xs">Properties</label>
                {renderPropertyCheckboxes(currentPlayer.properties, offerProperties, true)}
              </div>
            </div>

            {/* Request Side */}
            <div className="flex flex-col gap-4">
              <h3 className="text-emerald-400 font-bold border-b border-slate-700 pb-2">What you want:</h3>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 text-xs">Cash ($0 - ${targetPlayer.money})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    min="0" 
                    max={targetPlayer.money}
                    value={requestMoney}
                    onChange={(e) => setRequestMoney(Math.min(targetPlayer.money, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 pl-7 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-slate-400 text-xs">Properties</label>
                {renderPropertyCheckboxes(targetPlayer.properties, requestProperties, false)}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <button 
            onClick={onCancel}
            className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handlePropose}
            disabled={!targetPlayerId || (offerMoney === 0 && requestMoney === 0 && offerProperties.length === 0 && requestProperties.length === 0)}
            className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            Send Trade Offer
          </button>
        </div>
      </motion.div>
    </div>
  );
};
