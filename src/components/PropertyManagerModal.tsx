import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, Player } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';
import { Building2, Landmark, BarChart3, Home, ShieldAlert, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';

interface PropertyManagerModalProps {
  gameState: GameState;
  currentPlayer: Player;
  onBuildHouse: (playerId: string, propertyId: string) => void;
  onSellHouse?: (playerId: string, propertyId: string) => void;
  onMortgage?: (playerId: string, propertyId: string) => void;
  onUnmortgage?: (playerId: string, propertyId: string) => void;
  onTakeLoan: (playerId: string, amount: number) => void;
  onRepayLoan: (playerId: string, amount: number) => void;
  onClose: () => void;
}

export const PropertyManagerModal: React.FC<PropertyManagerModalProps> = ({ 
  gameState, 
  currentPlayer, 
  onBuildHouse, 
  onSellHouse,
  onMortgage, 
  onUnmortgage,
  onTakeLoan, 
  onRepayLoan, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'loans' | 'stats'>(currentPlayer.money < 0 ? 'loans' : 'properties');

  // Group player properties by color/type
  const groups: Record<string, typeof SPACES> = {};
  
  currentPlayer.properties.forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (space) {
      const groupKey = space.groupColor || (space.type === 'RAILROAD' ? '#444' : '#888');
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(space);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        className="bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-slate-800 shrink-0 gap-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xl shadow-md">
              🏘️
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">Property & Bank Manager</h2>
              <p className="text-xs text-slate-400">
                {currentPlayer.name} • Cash: <span className="font-mono text-emerald-400 font-bold">${currentPlayer.money}</span>
                {currentPlayer.loan > 0 && <span className="text-red-400 font-bold ml-2">• Debt: ${currentPlayer.loan}</span>}
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-950/80 rounded-xl p-1 border border-slate-800 w-full sm:w-auto justify-center">
            <button 
              onClick={() => {
                audio.playUiClick();
                setActiveTab('properties');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${activeTab === 'properties' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Building2 size={16} /> Portfolio ({currentPlayer.properties.length})
            </button>
            <button 
              onClick={() => {
                audio.playUiClick();
                setActiveTab('loans');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${activeTab === 'loans' ? 'bg-yellow-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Landmark size={16} /> Bank Loan
            </button>
            <button 
              onClick={() => {
                audio.playUiClick();
                setActiveTab('stats');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <BarChart3 size={16} /> Stats
            </button>
          </div>

          <button 
            onClick={() => {
              audio.playUiClick();
              onClose();
            }} 
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 flex-1 custom-scrollbar space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'properties' ? (
              <motion.div 
                key="properties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                {Object.keys(groups).length === 0 && (
                  <div className="text-center py-12 px-4 bg-slate-950/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center gap-3">
                    <span className="text-4xl opacity-50">🏘️</span>
                    <p className="text-slate-400 font-medium">You don't own any properties yet.</p>
                    <p className="text-xs text-slate-500 max-w-sm">Roll the dice to land on unowned properties and purchase them to build your real estate empire!</p>
                  </div>
                )}

                {Object.entries(groups).map(([color, spaces]) => {
                  const isRailroad = color === '#444';
                  const isUtility = color === '#888';
                  const isColorGroup = !isRailroad && !isUtility;
                  
                  const allSpacesInGroup = isColorGroup ? SPACES.filter(s => s.groupColor === color) : [];
                  const hasMonopoly = isColorGroup && allSpacesInGroup.length > 0 && allSpacesInGroup.every(s => gameState.propertyStates[s.id]?.ownerId === currentPlayer.id);
                  
                  const minHousesInGroup = isColorGroup ? Math.min(...allSpacesInGroup.map(s => {
                     const ps = gameState.propertyStates[s.id];
                     return ps ? (ps.hasHotel ? 5 : ps.houses) : 0;
                  })) : 0;

                  const maxHousesInGroup = isColorGroup ? Math.max(...allSpacesInGroup.map(s => {
                     const ps = gameState.propertyStates[s.id];
                     return ps ? (ps.hasHotel ? 5 : ps.houses) : 0;
                  })) : 0;

                  const groupHasBuildings = isColorGroup && allSpacesInGroup.some(s => {
                    const ps = gameState.propertyStates[s.id];
                    return ps && (ps.houses > 0 || ps.hasHotel);
                  });

                  return (
                    <div key={color} className="bg-slate-950/60 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
                      <div className="h-3 w-full shadow-inner" style={{ backgroundColor: color }}></div>
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            {isRailroad ? '🚂 Railroads' : isUtility ? '💡 Utilities' : 'Color Group'} 
                            {hasMonopoly && <span className="text-[10px] bg-emerald-600/80 border border-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Full Set Owned</span>}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {spaces.map(space => {
                            const propState = gameState.propertyStates[space.id] || { houses: 0, hasHotel: false, isMortgaged: false };
                            const currentLevel = propState.hasHotel ? 5 : propState.houses;
                            const canAfford = Boolean(space.houseCost && currentPlayer.money >= space.houseCost);
                            const isMaxed = currentLevel >= 5;
                            const obeysEvenBuild = currentLevel <= minHousesInGroup || gameState.houseRules.ignoreEvenBuild;
                            const obeysEvenSell = currentLevel >= maxHousesInGroup || gameState.houseRules.ignoreEvenBuild;
                            
                            const canBuild = (hasMonopoly || gameState.houseRules.buildWithoutMonopoly) && canAfford && !isMaxed && obeysEvenBuild && !propState.isMortgaged;
                            const canSellBuilding = (propState.houses > 0 || propState.hasHotel) && obeysEvenSell;

                            const canMortgage = !propState.isMortgaged && !groupHasBuildings && onMortgage;
                            const mortgageValue = space.price ? Math.floor(space.price / 2) : 0;
                            
                            const unmortgageCost = space.price ? Math.floor((space.price / 2) * 1.1) : 0;
                            const canUnmortgage = propState.isMortgaged && currentPlayer.money >= unmortgageCost && onUnmortgage;

                            return (
                              <div key={space.id} className={`bg-slate-900/90 border rounded-xl p-3.5 flex flex-col gap-3 relative transition-all ${
                                propState.isMortgaged ? 'border-red-900/50 bg-red-950/10' : 'border-slate-800 hover:border-slate-700'
                              }`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-slate-100 text-sm">{space.name}</h4>
                                      {propState.isMortgaged && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-red-900/80 border border-red-700 text-red-300 font-bold uppercase rounded">
                                          Mortgaged
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">Cost: ${space.price}</p>
                                  </div>

                                  {isColorGroup && (
                                    <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-xs font-bold font-mono">
                                      {propState.hasHotel ? (
                                        <span className="text-red-400">🏨 Hotel</span>
                                      ) : propState.houses > 0 ? (
                                        <span className="text-emerald-400">{propState.houses} 🏠</span>
                                      ) : (
                                        <span className="text-slate-400">0 Houses</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Building Controls (Houses / Hotel) */}
                                {isColorGroup && space.houseCost && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        audio.playUiClick();
                                        onBuildHouse(currentPlayer.id, space.id);
                                      }}
                                      disabled={!canBuild}
                                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                        canBuild 
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                      }`}
                                    >
                                      <Home size={14} />
                                      {isMaxed 
                                        ? 'Max Level' 
                                        : !hasMonopoly && !gameState.houseRules.buildWithoutMonopoly
                                        ? 'Need Full Set'
                                        : !obeysEvenBuild
                                        ? 'Build Evenly'
                                        : `+ ${currentLevel === 4 ? 'Hotel' : 'House'} ($${space.houseCost})`}
                                    </button>

                                    <button
                                      onClick={() => {
                                        audio.playUiClick();
                                        onSellHouse && onSellHouse(currentPlayer.id, space.id);
                                      }}
                                      disabled={!canSellBuilding}
                                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                        canSellBuilding 
                                          ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-md' 
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                      }`}
                                      title={!canSellBuilding ? (currentLevel === 0 ? 'No buildings to sell' : 'Must sell from property with most houses first') : 'Sell building for 50% refund'}
                                    >
                                      <ArrowDownLeft size={14} />
                                      {currentLevel === 0 
                                        ? 'No Buildings' 
                                        : !obeysEvenSell 
                                        ? 'Sell Evenly'
                                        : `- Sell ($${Math.floor(space.houseCost / 2)})`}
                                    </button>
                                  </div>
                                )}

                                {/* Mortgage / Unmortgage Controls */}
                                <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                                  {!propState.isMortgaged ? (
                                    <button
                                      onClick={() => {
                                        audio.playUiClick();
                                        onMortgage && onMortgage(currentPlayer.id, space.id);
                                      }}
                                      disabled={!canMortgage}
                                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                        canMortgage 
                                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                                          : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                      }`}
                                      title={groupHasBuildings ? 'Must sell all houses/hotels in group before mortgaging' : `Mortgage for $${mortgageValue}`}
                                    >
                                      <ShieldAlert size={14} />
                                      {groupHasBuildings ? 'Sell Buildings First' : `Mortgage (+$${mortgageValue})`}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        audio.playUiClick();
                                        onUnmortgage && onUnmortgage(currentPlayer.id, space.id);
                                      }}
                                      disabled={!canUnmortgage}
                                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                        canUnmortgage 
                                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md' 
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                                      }`}
                                      title={currentPlayer.money < unmortgageCost ? `Need $${unmortgageCost} to unmortgage` : `Unmortgage for $${unmortgageCost}`}
                                    >
                                      <ArrowUpRight size={14} />
                                      Unmortgage (-${unmortgageCost})
                                    </button>
                                  )}
                                </div>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                    🏦
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">First National Bank of 1poly</h3>
                  <p className="text-slate-400 text-center mb-6 max-w-md text-sm">
                    Low on cash or need to avoid bankruptcy? Take out an emergency bank loan in increments of $500. A 10% loan processing fee is added to your debt balance.
                  </p>

                  <div className="flex w-full gap-4 sm:gap-6 mt-2 border-t border-slate-800 pt-6">
                    <div className="flex-1 flex flex-col items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Available Cash</span>
                      <span className={`text-2xl sm:text-3xl font-mono font-black ${currentPlayer.money < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ${currentPlayer.money}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center bg-slate-900 p-4 rounded-2xl border border-red-900/40">
                      <span className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Current Bank Debt</span>
                      <span className="text-2xl sm:text-3xl font-mono font-black text-red-500">${currentPlayer.loan || 0}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                    <button
                      onClick={() => {
                        audio.playUiClick();
                        onTakeLoan(currentPlayer.id, 500);
                      }}
                      className="flex-1 py-3.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <span>💰</span> Borrow $500 (+$550 Debt)
                    </button>
                    
                    <button
                      onClick={() => {
                        audio.playUiClick();
                        onRepayLoan(currentPlayer.id, 500);
                      }}
                      disabled={currentPlayer.loan < 500 || currentPlayer.money < 500}
                      className={`flex-1 py-3.5 font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${
                        currentPlayer.loan >= 500 && currentPlayer.money >= 500
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <span>💳</span> Repay $500
                    </button>
                  </div>
                  
                  {currentPlayer.loan > 0 && currentPlayer.loan < 500 && (
                    <button
                      onClick={() => {
                        audio.playUiClick();
                        onRepayLoan(currentPlayer.id, currentPlayer.loan);
                      }}
                      disabled={currentPlayer.money < currentPlayer.loan}
                      className={`w-full mt-3 py-3 font-bold rounded-xl shadow transition-all text-sm ${
                        currentPlayer.money >= currentPlayer.loan
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      Repay Remaining Full Balance (${currentPlayer.loan})
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-slate-950/60 rounded-2xl overflow-hidden border border-slate-800 shadow-md"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Cash</th>
                        <th className="px-4 py-3">Properties</th>
                        <th className="px-4 py-3">Total Rolls</th>
                        <th className="px-4 py-3 text-right">Rent Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameState.players.map(player => (
                        <tr key={player.id} className={`border-b border-slate-800/60 hover:bg-slate-800/30 ${player.id === currentPlayer.id ? 'bg-blue-950/30' : ''}`}>
                          <td className="px-4 py-3.5 font-bold text-white flex items-center gap-2">
                            <span className="text-xl">{player.token}</span>
                            <span className="truncate">{player.name}</span>
                            {player.isBankrupt && <span className="text-red-500 text-[10px] font-black uppercase ml-1">Bankrupt</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                            ${player.money}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-blue-400 font-bold">
                            {player.properties.length}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-300 font-bold">
                            {player.stats?.totalRolls || 0}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-yellow-400 font-bold">
                            ${player.stats?.rentCollected || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
