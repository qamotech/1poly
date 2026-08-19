import { useState, useEffect } from 'react';
import { GamePhase, PlayerType } from './types';
import { createInitialGameState, addPlayer, startGame, rollDice, endTurn, buyProperty } from './engine/engine';
import { processAITurn } from './engine/ai';
import { Lobby } from './components/Lobby';
import { Board } from './components/Board';
import { HUD } from './components/HUD';

export default function App() {
  const [gameState, setGameState] = useState(createInitialGameState());

  useEffect(() => {
    if (gameState.phase !== GamePhase.LOBBY && gameState.phase !== GamePhase.GAME_OVER) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer?.type === PlayerType.CPU) {
        const timer = setTimeout(() => {
          setGameState(prev => processAITurn(prev));
        }, 1500); // 1.5s delay for realistic CPU pacing
        return () => clearTimeout(timer);
      }
    }
  }, [gameState]);

  const handleAddPlayer = (name: string, type: PlayerType, token: string) => {
    setGameState(prev => addPlayer(prev, name, type, token));
  };

  const handleStartGame = () => {
    setGameState(prev => startGame(prev));
  };

  const handleRoll = () => {
    setGameState(prev => rollDice(prev));
  };

  const handleBuyProperty = () => {
    setGameState(prev => buyProperty(prev));
  };

  const handleEndTurn = () => {
    setGameState(prev => endTurn(prev));
  };

  const isLobby = gameState.phase === GamePhase.LOBBY;
  const isCpuTurn = !isLobby && gameState.players[gameState.currentPlayerIndex]?.type === PlayerType.CPU;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      {isLobby ? (
        <Lobby 
          gameState={gameState} 
          onAddPlayer={handleAddPlayer} 
          onStartGame={handleStartGame} 
        />
      ) : (
        <div className="flex flex-col lg:flex-row h-screen p-4 gap-4 max-w-[1600px] mx-auto">
          {/* Main Board Area (Left/Top) */}
          <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
            <Board gameState={gameState} />
          </div>

          {/* Sidebar HUD (Right/Bottom) */}
          <div className="w-full lg:w-[400px] flex flex-col gap-4">
            <HUD 
              gameState={gameState} 
              onRoll={handleRoll} 
              onEndTurn={handleEndTurn} 
              onBuyProperty={handleBuyProperty}
              isCpuTurn={isCpuTurn}
            />
          </div>
        </div>
      )}
    </div>
  );
}
