import React, { useState } from 'react';
import { GameState, PlayerType } from '../types';

const TOKENS = ['🚗', '🎩', '🐕', '👞', '🚢', '🚂', '🚜', '🏎️', '✈️', '🚀', '👽', '🤖', '🦄', '🦖', '🍕', '🍔'];

interface LobbyProps {
  gameState: GameState;
  onAddPlayer: (name: string, type: PlayerType, token: string) => void;
  onStartGame: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ gameState, onAddPlayer, onStartGame }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PlayerType>(PlayerType.USER);
  const [token, setToken] = useState(TOKENS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddPlayer(name, type, token);
    setName('');
    // Auto-select next available token
    const nextToken = TOKENS.find(t => t !== token && !gameState.players.some(p => p.token === t));
    if (nextToken) setToken(nextToken);
  };

  const availableTokens = TOKENS.filter(t => !gameState.players.some(p => p.token === t));

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-8 overflow-y-auto">
      <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg tracking-widest uppercase">
        Monopoly
      </h1>
      
      <div className="bg-slate-800/80 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl backdrop-blur-sm">
        <h2 className="text-2xl text-white mb-6 font-semibold">Players ({gameState.players.length}/8)</h2>
        
        <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2">
          {gameState.players.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded-xl">
              <span className="text-white font-medium text-lg">{p.name} ({p.type})</span>
              <span className="text-3xl">{p.token}</span>
            </div>
          ))}
          
          {gameState.players.length === 0 && (
            <p className="text-slate-400 italic text-center py-4">No players added yet.</p>
          )}
        </div>

        {gameState.players.length < 8 && (
          <div className="bg-slate-900/50 p-4 rounded-xl mb-6 space-y-4 border border-slate-700">
            <div className="flex gap-4">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Player Name" 
                className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
              />
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as PlayerType)}
                className="bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value={PlayerType.USER}>USER</option>
                <option value={PlayerType.CPU}>CPU</option>
              </select>
            </div>
            
            <div>
              <p className="text-sm text-slate-400 mb-2">Choose Token:</p>
              <div className="flex flex-wrap gap-2">
                {availableTokens.map(t => (
                  <button
                    key={t}
                    onClick={() => setToken(t)}
                    className={`text-3xl p-2 rounded-lg border-2 transition-all ${token === t ? 'border-blue-500 bg-blue-500/20 scale-110' : 'border-transparent hover:bg-slate-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleAdd}
              disabled={!name.trim() || !token}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
            >
              Add Player
            </button>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button 
            onClick={onStartGame}
            disabled={gameState.players.length < 2}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-lg text-xl"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};
