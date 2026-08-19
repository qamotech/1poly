import React from 'react';
import { GameState, GamePhase, SpaceType } from '../types';
import { SPACES } from '../engine/board';

interface HUDProps {
  gameState: GameState;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyProperty: () => void;
  isCpuTurn: boolean;
}

export const HUD: React.FC<HUDProps> = ({ gameState, onRoll, onEndTurn, onBuyProperty, isCpuTurn }) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
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

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Current Player Info */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Current Turn</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl bg-slate-700 p-3 rounded-full">{currentPlayer?.token || '🎲'}</span>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {currentPlayer?.name || 'Waiting...'} 
                {isCpuTurn && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">CPU</span>}
              </h2>
              <p className="text-green-400 font-mono text-xl">${currentPlayer?.money || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex flex-col gap-4">
        {gameState.phase === GamePhase.TURN_START && (
          <button 
            onClick={onRoll}
            disabled={isCpuTurn}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors text-xl shadow-lg"
          >
            Roll Dice
          </button>
        )}
        
        {gameState.lastDiceRoll && (
          <div className="flex justify-center gap-4 py-4">
            <div className="w-16 h-16 bg-white rounded-xl shadow-inner flex items-center justify-center text-4xl font-bold text-slate-800 border-b-4 border-slate-300">
              {gameState.lastDiceRoll[0]}
            </div>
            <div className="w-16 h-16 bg-white rounded-xl shadow-inner flex items-center justify-center text-4xl font-bold text-slate-800 border-b-4 border-slate-300">
              {gameState.lastDiceRoll[1]}
            </div>
          </div>
        )}

        {canBuyProperty && (
          <button 
            onClick={onBuyProperty}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg flex flex-col items-center justify-center"
          >
            <span>Buy {currentSpace.name}</span>
            <span className="text-sm font-normal text-emerald-200">${currentSpace.price}</span>
          </button>
        )}

        {gameState.phase === GamePhase.POST_ROLL && (
          <button 
            onClick={onEndTurn}
            disabled={isCpuTurn}
            className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors text-xl shadow-lg"
          >
            End Turn
          </button>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex-1 overflow-hidden flex flex-col min-h-[200px]">
        <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-2">Activity Log</h3>
        <div className="overflow-y-auto flex-1 space-y-2 flex flex-col-reverse pr-2">
          {[...gameState.logs].reverse().map((log, i) => (
            <p key={i} className="text-sm text-slate-300 border-b border-slate-800/50 pb-1">
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
