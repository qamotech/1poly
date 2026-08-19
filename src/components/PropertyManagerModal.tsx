import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, Player, PropertyId } from '../types';
import { SPACES } from '../engine/board';

interface PropertyManagerModalProps {
  gameState: GameState;
  currentPlayer: Player;
  onBuildHouse: (playerId: string, propertyId: string) => void;
  onTakeLoan: (playerId: string, amount: number) => void;
  onRepayLoan: (playerId: string, amount: number) => void;
  onClose: () => void;
}

export const PropertyManagerModal: React.FC<PropertyManagerModalProps> = ({ gameState, currentPlayer, onBuildHouse, onTakeLoan, onRepayLoan, onClose }) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'loans' | 'stats'>(currentPlayer.money < 0 ? 'loans' : 'properties');

  // Group player properties by color
  const groups: Record<string, typeof SPACES> = {};
  
  // First, map out all standard colored properties they own
  currentPlayer.properties.forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (space && space.groupColor) {
      if (!groups[space.groupColor]) groups[space.groupColor] = [];
      groups[space.groupColor].push(space);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl max-w-3xl w-full flex flex-col gap-6 max-h-[90vh]"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 shrink-0 gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🏘️</span> Game Dashboard
          </h2>
          
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'properties' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              Build Houses
            </button>
            <button 
              onClick={() => setActiveTab('loans')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'loans' ? 'bg-yellow-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              Bank
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              Player Stats
            </button>
          </div>

          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto pr-2 flex-1 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'properties' ? (
              <motion.div 
                key="properties"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {Object.keys(groups).length === 0 && (
                  <div className="text-center p-8 text-slate-500">
                    You don't own any colored properties yet.
                  </div>
                )}

                {Object.entries(groups).map(([color, spaces]) => {
                  // Check if player has monopoly of this color
                  const allSpacesInGroup = SPACES.filter(s => s.groupColor === color);
                  const hasMonopoly = allSpacesInGroup.every(s => gameState.propertyStates[s.id]?.ownerId === currentPlayer.id);
                  
                  // Calculate min houses for even build rule
                  const minHousesInGroup = Math.min(...allSpacesInGroup.map(s => {
                     const ps = gameState.propertyStates[s.id];
                     return ps ? (ps.hasHotel ? 5 : ps.houses) : 0;
                  }));

                  return (
                    <div key={color} className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
                      <div className="h-4 w-full shadow-inner" style={{ backgroundColor: color }}></div>
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-white font-bold text-lg uppercase tracking-wider flex items-center gap-2">
                            Color Group {hasMonopoly && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Monopoly</span>}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {spaces.map(space => {
                            const propState = gameState.propertyStates[space.id];
                            const currentLevel = propState.hasHotel ? 5 : propState.houses;
                            const canAfford = space.houseCost && currentPlayer.money >= space.houseCost;
                            const isMaxed = currentLevel >= 5;
                            const obeysEvenBuild = currentLevel <= minHousesInGroup;
                            
                            const canBuild = hasMonopoly && canAfford && !isMaxed && obeysEvenBuild;
                            
                            return (
                              <div key={space.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between font-bold text-slate-200">
                                  <span>{space.name}</span>
                                  <span className="text-blue-400 font-mono">
                                    {propState.hasHotel ? '🏨 Hotel' : `${propState.houses} 🏠`}
                                  </span>
                                </div>
                                
                                {hasMonopoly && space.houseCost && (
                                  <button
                                    onClick={() => {
                                      // We could trigger a sound here, but let the action trigger it or just use simple button click
                                      onBuildHouse(currentPlayer.id, space.id);
                                    }}
                                    disabled={!canBuild}
                                    className={`w-full py-2 rounded font-bold text-sm transition-colors ${
                                      canBuild 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    }`}
                                  >
                                    {isMaxed 
                                      ? 'Max Level Reached' 
                                      : obeysEvenBuild 
                                        ? `Build ${currentLevel === 4 ? 'Hotel' : 'House'} ($${space.houseCost})`
                                        : `Must build evenly`}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : activeTab === 'loans' ? (
              <motion.div
                key="loans"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 p-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                    🏦
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">First National Bank</h3>
                  <p className="text-slate-400 text-center mb-6 max-w-md">
                    Low on cash? Take out a bank loan in increments of $500. A 10% interest fee is applied immediately to your loan balance.
                  </p>

                  <div className="flex w-full gap-8 mt-4 border-t border-slate-700 pt-6">
                    <div className="flex-1 flex flex-col items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">Current Cash</span>
                      <span className="text-3xl font-mono font-black text-emerald-400">${currentPlayer.money}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center bg-slate-900 p-4 rounded-xl border border-red-900/50">
                      <span className="text-sm text-red-400 font-bold uppercase tracking-wider mb-2">Current Debt</span>
                      <span className="text-3xl font-mono font-black text-red-500">${currentPlayer.loan || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full mt-8">
                    <button
                      onClick={() => onTakeLoan(currentPlayer.id, 500)}
                      className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                      Borrow $500
                    </button>
                    
                    <button
                      onClick={() => onRepayLoan(currentPlayer.id, 500)}
                      disabled={currentPlayer.loan < 500 || currentPlayer.money < 500}
                      className={`flex-1 py-4 font-bold rounded-xl shadow-lg transition-all ${
                        currentPlayer.loan >= 500 && currentPlayer.money >= 500
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Repay $500
                    </button>
                  </div>
                  
                  {currentPlayer.loan > 0 && currentPlayer.loan < 500 && (
                    <button
                      onClick={() => onRepayLoan(currentPlayer.id, currentPlayer.loan)}
                      disabled={currentPlayer.money < currentPlayer.loan}
                      className={`w-full mt-4 py-3 font-bold rounded-xl shadow transition-all ${
                        currentPlayer.money >= currentPlayer.loan
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Repay Remaining ${currentPlayer.loan}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700"
              >
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800 border-b border-slate-700 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Properties Owned</th>
                      <th className="px-4 py-3">Total Rolls</th>
                      <th className="px-4 py-3 text-right">Rent Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameState.players.map(player => (
                      <tr key={player.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${player.id === currentPlayer.id ? 'bg-slate-700/50' : ''}`}>
                        <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                          <span className="text-xl">{player.token}</span>
                          <span>{player.name}</span>
                          {player.isBankrupt && <span className="text-red-500 text-xs uppercase ml-1">Bankrupt</span>}
                        </td>
                        <td className="px-4 py-4 font-mono text-emerald-400 font-bold">
                          {player.properties.length}
                        </td>
                        <td className="px-4 py-4 font-mono text-blue-400 font-bold">
                          {player.stats?.totalRolls || 0}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-yellow-400 font-bold">
                          ${player.stats?.rentCollected || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
