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

  // Exclude current player and bankrupt players
  const otherPlayers = gameState.players.filter(p => p.id !== currentPlayer.id && !p.isBankrupt && p.money >= 0);
  const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);

  const handleToggleProperty = (propId: PropertyId, isOffer: boolean) => {
    if (isOffer) {
      setOfferProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
    } else {
      setRequestProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
    }
  };

  // Calculate rough market value for transparency
  const calculateTotalValue = (money: number, propIds: PropertyId[]) => {
    let total = money;
    propIds.forEach(id => {
      const space = SPACES.find(s => s.id === id);
      if (space?.price) total += space.price;
    });
    return total;
  };

  const totalOfferedValue = calculateTotalValue(offerMoney, offerProperties);
  const totalRequestedValue = calculateTotalValue(requestMoney, requestProperties);

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
    if (properties.length === 0) return <p className="text-slate-400 text-xs italic p-2">No properties owned.</p>;
    
    return (
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
        {properties.map(propId => {
          const space = SPACES.find(s => s.id === propId)!;
          const isSelected = selectedIds.includes(propId);

          // Check if any property in this color group has houses or hotels
          let hasGroupBuildings = false;
          if (space.groupColor) {
            const groupSpaces = SPACES.filter(s => s.groupColor === space.groupColor);
            hasGroupBuildings = groupSpaces.some(s => {
              const ps = gameState.propertyStates[s.id];
              return ps && (ps.houses > 0 || ps.hasHotel);
            });
          }

          return (
            <label 
              key={propId} 
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                hasGroupBuildings
                  ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                  : isSelected 
                  ? 'bg-blue-950/60 border-blue-500 shadow-sm cursor-pointer' 
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-700/50 cursor-pointer'
              }`}
            >
              <div 
                className="w-3.5 h-3.5 rounded-full shadow-inner flex-shrink-0 border border-black/40"
                style={{ backgroundColor: space.groupColor || '#94a3b8' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{space.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">${space.price || 0}</span>
                  {hasGroupBuildings && (
                    <span className="text-[9px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800">
                      Sell buildings first
                    </span>
                  )}
                </div>
              </div>
              <input 
                type="checkbox" 
                disabled={hasGroupBuildings}
                checked={isSelected}
                onChange={() => !hasGroupBuildings && handleToggleProperty(propId, isOffer)}
                className="w-4 h-4 rounded text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div id="trade-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        id="trade-modal-card"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-5 text-white"
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🤝</span> Propose a Trade
          </h2>
          <button 
            id="trade-cancel-x-btn"
            onClick={onCancel} 
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-bold text-xs uppercase tracking-wider">Select Trading Partner:</label>
          <select 
            id="trade-partner-select"
            value={targetPlayerId} 
            onChange={(e) => setTargetPlayerId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="">-- Choose an active player --</option>
            {otherPlayers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type === 'CPU' ? 'AI' : 'Human'}) - Cash: ${p.money}, Props: {p.properties.length}
              </option>
            ))}
          </select>
        </div>

        {targetPlayer && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60">
              {/* Offer Side */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <h3 className="text-blue-400 font-bold text-sm">What you offer:</h3>
                  <span className="text-xs font-mono text-blue-300 font-bold">~${totalOfferedValue}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-xs">Cash ($0 - ${currentPlayer.money})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      id="trade-offer-money-input"
                      type="number" 
                      min="0" 
                      max={currentPlayer.money}
                      value={offerMoney}
                      onChange={(e) => setOfferMoney(Math.min(currentPlayer.money, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 pl-7 text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-slate-400 text-xs">Properties ({offerProperties.length} selected)</label>
                  {renderPropertyCheckboxes(currentPlayer.properties, offerProperties, true)}
                </div>
              </div>

              {/* Request Side */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <h3 className="text-emerald-400 font-bold text-sm">What you want:</h3>
                  <span className="text-xs font-mono text-emerald-300 font-bold">~${totalRequestedValue}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-xs">Cash ($0 - ${targetPlayer.money})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      id="trade-request-money-input"
                      type="number" 
                      min="0" 
                      max={targetPlayer.money}
                      value={requestMoney}
                      onChange={(e) => setRequestMoney(Math.min(targetPlayer.money, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 pl-7 text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-slate-400 text-xs">Properties ({requestProperties.length} selected)</label>
                  {renderPropertyCheckboxes(targetPlayer.properties, requestProperties, false)}
                </div>
              </div>
            </div>

            {/* Trade Balance Insight */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimated Trade Balance:</span>
              <span className={`font-mono font-bold ${
                totalOfferedValue >= totalRequestedValue * 0.9 
                  ? 'text-emerald-400' 
                  : 'text-amber-400'
              }`}>
                {totalOfferedValue >= totalRequestedValue 
                  ? `+${totalOfferedValue - totalRequestedValue} in partner's favor (Likely Accepted)` 
                  : totalOfferedValue >= totalRequestedValue * 0.9
                  ? `Fair value balance (Acceptable)`
                  : `-$${totalRequestedValue - totalOfferedValue} deficit (Offer more cash/props)`
                }
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button 
            id="trade-cancel-btn"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button 
            id="trade-submit-btn"
            onClick={handlePropose}
            disabled={!targetPlayerId || (offerMoney === 0 && requestMoney === 0 && offerProperties.length === 0 && requestProperties.length === 0)}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg text-sm"
          >
            Send Trade Offer
          </button>
        </div>
      </motion.div>
    </div>
  );
};
