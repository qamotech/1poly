import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GameState, PlayerType, HouseRules } from '../types';
import { User, Bot, Play, Users, PlusCircle, Zap } from 'lucide-react';
import { audio } from '../audio';

const TOKENS = [
  '🚗', '🎩', '🐕', '👞', '🚢', '🚂', '🚜', '🏎️', '✈️', '🚀', '👽', '🤖', '🦄', '🦖', '🍕', '🍔',
  '🥷🏾', '😇', '🧐', '😎', '🤠', '👻', '💩', '👾', '🤡', '🦊', '🦁', '🐼', '🐸', '🐙', '🦋', '🎸',
  '🛹', '🏀', '⚽', '🎱', '💎', '👑', '🔥', '🧊'
];

const PRESET_NAMES = [
  "Rich Uncle Pennybags", "The Tycoon", "High Roller", "Boardwalk Boss",
  "Thimble Tommy", "Racecar Ricky", "Top Hat Terry", "Scottie Dog",
  "Battleship Betty", "Iron Irene", "Wheelbarrow Will", "Boot Bert",
  "Banker Bob", "Mogul Mary", "Landlord Larry", "Capitalist Cathy",
  "Baron Von Rent", "Duke of Dice"
];

const RULE_DESCRIPTIONS: Record<keyof HouseRules, string> = {
  freeParkingJackpot: "Taxes and fees go to a pot awarded on Free Parking.",
  doubleGo: "Landing EXACTLY on GO pays $400 instead of $200.",
  noRentInJail: "Players cannot collect rent while in Jail.",
  propertyAuctions: "Unowned properties not bought are auctioned.",
  highRollerStart: "Start with $2500 instead of the standard $1500.",
  snakeEyesBonus: "Rolling a 1 and 1 pays out an instant $500 bonus.",
  buildWithoutMonopoly: "Build houses without owning the full color group.",
  ignoreEvenBuild: "Build hotels on one property while others have 0 houses.",
  firstLapLockdown: "No properties can be bought until passing GO once.",
  wealthTax: "Income Tax charges 10% of total wealth instead of $200 flat.",
  mercyRule: "Game instantly ends if a player reaches $5000 cash.",
  rentControl: "Maximum rent is capped at $1000 globally."
};

const RULE_LABELS: Record<keyof HouseRules, string> = {
  freeParkingJackpot: "Free Parking Jackpot",
  doubleGo: "Double GO ($400)",
  noRentInJail: "No Rent In Jail",
  propertyAuctions: "Property Auctions",
  highRollerStart: "High Roller Start",
  snakeEyesBonus: "Snake Eyes Bonus",
  buildWithoutMonopoly: "No Monopoly Needed to Build",
  ignoreEvenBuild: "Ignore Even Build Rule",
  firstLapLockdown: "First Lap Lockdown",
  wealthTax: "True Wealth Tax",
  mercyRule: "Mercy Rule ($5000 Win)",
  rentControl: "Rent Control ($1000 Cap)"
};

// Helper to get random unused name
const getRandomName = (usedNames: string[]) => {
  const available = PRESET_NAMES.filter(n => !usedNames.includes(n));
  return available.length > 0 
    ? available[Math.floor(Math.random() * available.length)]
    : `Player ${Math.floor(Math.random() * 1000)}`;
};

interface LobbyProps {
  gameState: GameState;
  onAddPlayer: (name: string, type: PlayerType, token: string) => void;
  onStartGame: () => void;
  onUpdateRules: (rules: Partial<HouseRules>) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ gameState, onAddPlayer, onStartGame, onUpdateRules }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PlayerType>(PlayerType.USER);
  const [token, setToken] = useState(TOKENS[0]);

  // Set initial random name if empty
  React.useEffect(() => {
    if (!name) {
      const usedNames = gameState.players.map(p => p.name);
      setName(getRandomName(usedNames));
    }
  }, [gameState.players.length]);

  const handleAdd = () => {
    audio.init();
    if (!name.trim()) return;
    onAddPlayer(name, type, token);
    const usedNames = [...gameState.players.map(p => p.name), name];
    setName(getRandomName(usedNames));
    
    // Auto-select next available token
    const nextToken = TOKENS.find(t => t !== token && !gameState.players.some(p => p.token === t));
    if (nextToken) setToken(nextToken);
  };

  const handleQuickStart = (cpuCount: number) => {
    audio.init();
    
    const usedNames = [...gameState.players.map(p => p.name)];
    const usedTokens = [...gameState.players.map(p => p.token)];
    let currentCount = gameState.players.length;
    
    // If no human player exists, add the currently configured one in the inputs
    const hasHuman = gameState.players.some(p => p.type === PlayerType.USER);
    if (!hasHuman && currentCount < 8) {
      const humanName = name.trim() || getRandomName(usedNames);
      onAddPlayer(humanName, PlayerType.USER, token);
      usedNames.push(humanName);
      usedTokens.push(token);
      currentCount++;
    }

    // Calculate how many CPUs we can add without exceeding the 8 player limit
    const availableSlots = 8 - currentCount;
    const cpusToAdd = Math.min(cpuCount, availableSlots);

    for (let i = 0; i < cpusToAdd; i++) {
      const cpuName = getRandomName(usedNames);
      usedNames.push(cpuName);
      
      const availableTokens = TOKENS.filter(t => !usedTokens.includes(t));
      const t = availableTokens.length > 0 ? availableTokens[Math.floor(Math.random() * availableTokens.length)] : TOKENS[Math.floor(Math.random() * TOKENS.length)];
      usedTokens.push(t);
      
      onAddPlayer(cpuName, PlayerType.CPU, t);
    }
    
    // Start game after socket has had a moment to process the batch of new players
    setTimeout(() => {
      onStartGame();
    }, 400);
  };

  const availableTokens = TOKENS.filter(t => !gameState.players.some(p => p.token === t));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 md:space-y-8 p-4 md:p-8 overflow-y-auto pb-20">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-yellow-400 drop-shadow-lg tracking-wider md:tracking-widest uppercase text-center max-w-full break-words flex items-center gap-4">
        <motion.span 
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, -10, 10, 0]
          }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block -scale-x-100 origin-bottom"
        >
          🏃🏾‍♂️
        </motion.span> 
        Monopoly
      </h1>
      
      <div className="bg-slate-800/80 p-4 md:p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl text-white font-semibold flex items-center gap-2">
            <Users className="text-blue-400" /> 
            Players ({gameState.players.length}/8)
          </h2>
        </div>
        
        <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {gameState.players.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-3 md:p-4 rounded-xl border border-slate-600/50">
              <div className="flex items-center gap-3">
                {p.type === PlayerType.USER ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                <span className="text-white font-medium text-base md:text-lg">
                  {p.name} <span className="text-xs text-slate-400 ml-1">({p.type})</span>
                </span>
              </div>
              <span className="text-2xl md:text-3xl filter drop-shadow-md">{p.token}</span>
            </div>
          ))}
          
          {gameState.players.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2 border-2 border-dashed border-slate-600 rounded-xl">
              <Users size={32} className="opacity-50" />
              <p className="italic">No players added yet.</p>
            </div>
          )}
        </div>

        {gameState.players.length < 8 && (
          <div className="bg-slate-900/50 p-3 md:p-4 rounded-xl mb-6 space-y-4 border border-slate-700">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Player Name" 
                  list="preset-names"
                  className="bg-slate-800 text-white pl-4 pr-10 py-2 md:py-3 rounded-lg border-2 border-slate-600 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 focus:bg-slate-700 outline-none w-full transition-all duration-200 ease-in-out font-medium"
                />
                <datalist id="preset-names">
                  {PRESET_NAMES.map(n => <option key={n} value={n} />)}
                </datalist>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  {type === PlayerType.USER ? <User size={18} /> : <Bot size={18} />}
                </div>
              </div>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as PlayerType)}
                className="bg-slate-800 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value={PlayerType.USER}>User</option>
                <option value={PlayerType.CPU}>CPU</option>
              </select>
            </div>
            
            <div>
              <p className="text-sm text-slate-400 mb-2 font-medium">Choose Token:</p>
              <div className="flex flex-wrap gap-1 md:gap-2 justify-center sm:justify-start max-h-32 overflow-y-auto custom-scrollbar p-1">
                {availableTokens.map(t => (
                  <button
                    key={t}
                    onClick={() => setToken(t)}
                    className={`text-2xl md:text-3xl p-1 md:p-2 rounded-lg border-2 transition-all ${token === t ? 'border-blue-500 bg-blue-500/20 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-transparent hover:bg-slate-700 hover:scale-105'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleAdd}
              disabled={!name.trim() || !token}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 md:py-3 rounded-lg transition-colors shadow-lg"
            >
              <PlusCircle size={20} /> Add Player Manually
            </button>
          </div>
        )}
        
        {/* Interactive House Rules & Customizations */}
        <div className="mb-6 p-4 md:p-6 bg-slate-900/60 rounded-xl border border-slate-700/80 shadow-inner">
           <h3 className="text-slate-300 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
             <span className="text-yellow-500">⚙️</span> Custom House Rules
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-h-64 overflow-y-auto custom-scrollbar pr-2 pb-2">
             {Object.entries(RULE_LABELS).map(([key, label]) => {
               const ruleKey = key as keyof HouseRules;
               const isChecked = gameState.houseRules[ruleKey];
               return (
                 <label 
                   key={key} 
                   className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                     isChecked 
                       ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                       : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                   }`}
                   title={RULE_DESCRIPTIONS[ruleKey]}
                 >
                   <div className="relative flex items-center justify-center mt-0.5">
                     <input 
                       type="checkbox" 
                       checked={isChecked}
                       onChange={(e) => onUpdateRules({ [ruleKey]: e.target.checked })}
                       className="peer appearance-none w-5 h-5 border-2 border-slate-500 rounded bg-slate-800 checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer" 
                     />
                     <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                     </svg>
                   </div>
                   <div className="flex flex-col select-none">
                     <span className={`text-sm font-bold ${isChecked ? 'text-blue-300' : 'text-slate-300'}`}>
                       {label}
                     </span>
                     <span className="text-[10px] md:text-xs text-slate-500 leading-tight mt-1">
                       {RULE_DESCRIPTIONS[ruleKey]}
                     </span>
                   </div>
                 </label>
               );
             })}
           </div>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <button 
            onClick={() => {
              audio.init();
              onStartGame();
            }}
            disabled={gameState.players.length < 2}
            className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-lg md:text-xl"
          >
            <Play fill="currentColor" /> Start Game With Current Players
          </button>

          {/* New Expanded Quick Play Section */}
          <div className="w-full flex flex-col items-center mt-2 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Quick Play vs AI</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button 
                onClick={() => handleQuickStart(1)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg shadow transition-colors"
              >
                <Zap size={16} /> 1v1
              </button>
              <button 
                onClick={() => handleQuickStart(3)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg shadow transition-colors"
              >
                <Zap size={16} /> 1v3
              </button>
              <button 
                onClick={() => handleQuickStart(7)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg shadow transition-colors"
              >
                <Zap size={16} /> 1v7
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              (This will add you if you aren't added yet, auto-fill the remaining slots with CPU bots, and start the game instantly)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
