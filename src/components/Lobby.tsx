import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, PlayerType, HouseRules } from '../types';
import { GAME_TOKENS } from '../engine/board';
import { User, Bot, Play, Users, PlusCircle, Zap, Trash2, Edit2, Check, X, Sparkles, BookOpen, Layers } from 'lucide-react';
import { audio } from '../audio';

const TOKENS = GAME_TOKENS;

const PRESET_NAMES = [
  "N8", "Pennybags", "The Tycoon", "High Roller", "Boardwalk Boss",
  "Thimble Tommy", "Racecar Ricky", "Top Hat Terry", "Scottie Dog",
  "Battleship Betty", "Iron Irene", "Wheelbarrow Will", "Boot Bert",
  "Banker Bob", "Mogul Mary", "Landlord Larry", "Capitalist Cathy",
  "Baron Von Rent", "Duke of Dice", "Jeeves", "Cortana", "Siri", 
  "Alexa", "Hal 9000", "GLaDOS", "C-3PO", "R2-D2", "Data", "JARVIS", 
  "1poly Tycoon", "Jake the Jailbird", "Officer Edgar", "Marvin Gardens", 
  "B. & O. Railroad", "Short Line", "Water Works", "Electric Company", 
  "Luxury Tax", "Fortune", "City Chest", "Free Parking", "Go To Jail", 
  "Just Visiting", "Boardwalk", "Park Place", "Pennsylvania Ave", 
  "North Carolina Ave", "Pacific Ave", "Ventnor Ave", "Atlantic Ave", 
  "Illinois Ave", "Indiana Ave", "Kentucky Ave", "New York Ave", 
  "Tennessee Ave", "St. James Place", "Virginia Ave", "States Ave", 
  "St. Charles Place", "Connecticut Ave", "Vermont Ave", "Oriental Ave", 
  "Baltic Ave", "Mediterranean Ave", "Reading Railroad", "Pennsylvania Railroad"
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
  rentControl: "Maximum rent is capped at $1000 globally.",
  forcedJailBail: "Players must pay $50 to exit Jail immediately on their first turn."
};

const RULE_LABELS: Record<keyof HouseRules, string> = {
  freeParkingJackpot: "Free Parking Jackpot",
  doubleGo: "Double GO ($400)",
  noRentInJail: "No Rent In Jail",
  propertyAuctions: "Property Auctions",
  highRollerStart: "High Roller Start",
  snakeEyesBonus: "Snake Eyes Bonus",
  buildWithoutMonopoly: "No Full Set Needed to Build",
  ignoreEvenBuild: "Ignore Even Build Rule",
  firstLapLockdown: "First Lap Lockdown",
  wealthTax: "True Wealth Tax",
  mercyRule: "Mercy Rule ($5000 Win)",
  rentControl: "Rent Control ($1000 Cap)",
  forcedJailBail: "Forced Jail Bail ($50)"
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
  onUpdatePlayer?: (playerId: string, updates: { name?: string; type?: PlayerType; token?: string }) => void;
  onRemovePlayer: (playerId: string) => void;
  onStartGame: () => void;
  onStartDealGame?: (players?: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>) => void;
  onOpenRules?: (tab: 'classic' | 'deal') => void;
  onUpdateRules: (rules: Partial<HouseRules>) => void;
  // Multiplayer room context (optional; defaults keep single-host behavior)
  roomCode?: string;
  isHost?: boolean;
  myPlayerId?: string | null;
  takenSeats?: Set<string>;
  onClaimSeat?: (playerId: string) => void;
  onJoinGame?: (name: string, token: string) => void;
  onCloseRoom?: () => void;
  onLeaveRoom?: () => void;
  // Room Cards match (server-hosted Deal game in this room)
  dealActive?: boolean;
  onWatchDealMatch?: () => void;
  onStartRoomDealMatch?: () => void;
  onAddCpuAndStartDeal?: (name: string, token: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  onAddPlayer,
  onUpdatePlayer,
  onRemovePlayer,
  onStartGame,
  onStartDealGame,
  onOpenRules,
  onUpdateRules,
  roomCode = '',
  isHost = true,
  myPlayerId = null,
  takenSeats,
  onClaimSeat,
  onJoinGame,
  onCloseRoom,
  onLeaveRoom,
  dealActive = false,
  onWatchDealMatch,
  onAddCpuAndStartDeal,
  onStartRoomDealMatch
}) => {
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // clipboard unavailable — the code is big on screen to read aloud
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  // Nobody is pre-named: the name field starts blank and every player
  // picks their own name + token (see the self-join panel below).
  const [name, setName] = useState('');
  const [type, setType] = useState<PlayerType>(PlayerType.USER);
  const [token, setToken] = useState(TOKENS[0]);

  // Self-join panel state (room mode): my own name + character token.
  const myPlayer = myPlayerId ? gameState.players.find(p => p.id === myPlayerId) ?? null : null;
  const [joinName, setJoinName] = useState('');
  const [joinToken, setJoinToken] = useState<string>('');
  React.useEffect(() => {
    // Once I'm in, the panel mirrors my player so I can rename / re-pick.
    if (myPlayer) {
      setJoinName(myPlayer.name);
      setJoinToken(myPlayer.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPlayer?.id]);

  // Streamline: never let the token be the reason Join stays greyed out —
  // preselect the first free token (still fully changeable in the grid).
  React.useEffect(() => {
    if (!roomCode) return;
    const taken = new Set(gameState.players.filter(p => p.id !== myPlayerId).map(p => p.token));
    if (!joinToken || taken.has(joinToken)) {
      const free = TOKENS.find(t => !taken.has(t));
      if (free && free !== joinToken) setJoinToken(free);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, gameState.players, myPlayerId]);

  // Player being edited inline
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<PlayerType>(PlayerType.USER);
  const [editToken, setEditToken] = useState('');

  // Confirmation state for deleting a player
  const [playerToDelete, setPlayerToDelete] = useState<typeof gameState.players[0] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartEdit = (player: typeof gameState.players[0]) => {
    audio.playUiClick();
    setEditingPlayerId(player.id);
    setEditName(player.name);
    setEditType(player.type);
    setEditToken(player.token);
  };

  const handleSaveEdit = (playerId: string) => {
    audio.playUiClick();
    if (!editName.trim()) return;
    if (onUpdatePlayer) {
      onUpdatePlayer(playerId, {
        name: editName.trim(),
        type: editType,
        token: editToken
      });
    }
    setEditingPlayerId(null);
  };

  const handleCancelEdit = () => {
    audio.playUiClick();
    setEditingPlayerId(null);
  };

  const handlePromptDelete = (player: typeof gameState.players[0]) => {
    audio.playUiClick();
    setPlayerToDelete(player);
  };

  const handleConfirmDelete = () => {
    if (playerToDelete) {
      audio.playUiClick();
      onRemovePlayer(playerToDelete.id);
      setPlayerToDelete(null);
    }
  };

  const handleAdd = () => {
    audio.playUiClick();
    const cleanName = name.trim();
    if (!cleanName) return;

    if (gameState.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`A player named "${cleanName}" already exists. Adding as "${cleanName} 2".`);
      setTimeout(() => setErrorMessage(null), 3000);
    }

    onAddPlayer(cleanName, type, token);
    const usedNames = [...gameState.players.map(p => p.name), cleanName];
    setName(getRandomName(usedNames));
    
    // Auto-select next available token
    const nextToken = TOKENS.find(t => t !== token && !gameState.players.some(p => p.token === t));
    if (nextToken) setToken(nextToken);
  };

  const handleQuickStart = (cpuCount: number) => {
    audio.playUiClick();
    
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

  const handleQuickDeal = (opponentCount: number) => {
    audio.playUiClick();
    const dealPlayers: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }> = [];
    const usedNames = [...gameState.players.map(p => p.name)];
    const usedTokens = [...gameState.players.map(p => p.token)];

    // Add Human
    const humanName = name.trim() || 'Player 1';
    const humanToken = token || TOKENS[0];
    dealPlayers.push({
      id: 'player_human_1',
      name: humanName,
      type: 'USER',
      token: humanToken,
    });
    usedNames.push(humanName);
    usedTokens.push(humanToken);

    // Add CPUs
    for (let i = 0; i < opponentCount; i++) {
      const cpuName = getRandomName(usedNames);
      usedNames.push(cpuName);
      const avail = TOKENS.filter(t => !usedTokens.includes(t));
      const t = avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : TOKENS[(i + 1) % TOKENS.length];
      usedTokens.push(t);

      dealPlayers.push({
        id: `player_cpu_${i + 1}`,
        name: cpuName,
        type: 'CPU',
        token: t,
      });
    }

    if (onStartDealGame) {
      onStartDealGame(dealPlayers);
    }
  };

  const handleStartDealWithCurrentPlayers = () => {
    audio.playUiClick();
    let playersToUse = gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type as 'USER' | 'CPU',
      token: p.token,
    }));

    if (playersToUse.length < 2) {
      // Auto-add 1 CPU if only 1 player in lobby
      playersToUse = [
        ...playersToUse,
        {
          id: 'cpu_bot_deal',
          name: 'The Tycoon (CPU)',
          type: 'CPU',
          token: '🎩',
        }
      ];
    }

    if (onStartDealGame) {
      onStartDealGame(playersToUse);
    }
  };

  const availableTokens = TOKENS.filter(t => !gameState.players.some(p => p.token === t));

  // In a room, starting is not the host's privilege: anyone who has joined
  // the game (picked a name + token) can tap START GAME.
  const inRoom = !!roomCode;
  const canStart = !inRoom || isHost || !!myPlayerId;
  // C3-2 — with 2+ players in, every START button glows ready-green.
  const startReady = gameState.players.length >= 2;
  const scrollToJoin = () => document.getElementById('self-join-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 md:space-y-8 p-4 md:p-8 overflow-y-auto pb-20">
      {/* Top Rules Shortcut Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Game Modes: Classic Board & Fast Cards</span>
        </div>
        <button
          onClick={() => {
            audio.playUiClick();
            onOpenRules?.('classic');
          }}
          className="px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
        >
          <BookOpen size={15} />
          <span>Full Rules & Guides</span>
        </button>
      </div>

      <h1 
        id="lobby-main-title" 
        className="relative text-4xl sm:text-6xl md:text-7xl font-black fx-shimmer-text drop-shadow-[0_4px_12px_rgba(217,70,239,0.35)] tracking-wider sm:tracking-widest uppercase text-center max-w-full break-words flex items-center justify-center gap-3 sm:gap-4 py-1"
      >
        <motion.span 
          animate={{ 
            y: [0, -12, 0],
            rotate: [0, -8, 8, 0]
          }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block text-3xl sm:text-5xl md:text-6xl -scale-x-100 origin-bottom select-none filter drop-shadow-md"
        >
          🏃🏾‍♂️
        </motion.span> 
        <span className="font-extrabold tracking-tight sm:tracking-normal drop-shadow-sm">
          1poly
        </span>
        <span className="hidden sm:inline-block text-xs uppercase tracking-widest font-black px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner self-start mt-2">
          Deluxe
        </span>
      </h1>

      {/* QUICK GAME LAUNCH BAR: 1POLY CARDS CARD GAME PROMOTION */}
      <div className="w-full max-w-2xl bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-slate-900/90 p-5 rounded-3xl border-2 border-blue-500/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🃏
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">Quick 15-Min Game</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">NEW</span>
            </div>
            <h3 className="text-lg font-black text-white leading-tight">1poly Cards (Card Game)</h3>
            <p className="text-xs text-slate-300">Fast-paced card battles! Steal property sets, charge wild rent & collect 3 full sets to win.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              if (roomCode) {
                if (!canStart) { scrollToJoin(); return; }
                if (gameState.players.length >= 2) { audio.playUiClick(); onStartRoomDealMatch?.(); }
                return;
              }
              handleStartDealWithCurrentPlayers();
            }}
            disabled={!!roomCode && canStart && gameState.players.length < 2}
            className={`px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${startReady ? 'fx-start-ready' : ''}`}
          >
            <Sparkles size={15} /> {roomCode ? (canStart ? (gameState.players.length >= 2 ? 'Start Room Cards Match' : 'Cards — need 2 players') : 'Join to Play Cards') : 'Play 1poly Cards'}
          </button>
          {!roomCode && (
          <button
            onClick={() => handleQuickDeal(1)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Zap size={14} /> Quick 1v1 Cards
          </button>
          )}
        </div>
      </div>
      
      {/* ROOM BANNER: code to share + how seats work */}
      {roomCode && (
        <div className="w-full max-w-2xl bg-slate-900/90 border-2 border-amber-500/60 rounded-3xl p-4 md:p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                {isHost ? '👑 Your room — share this code' : '🏠 You joined this room'}
              </p>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <span className="flex items-center gap-1.5 sm:gap-2">
                  {roomCode.split('').map((ch, i) => (
                    <span key={i} className="fx-code-tile text-3xl md:text-4xl font-black text-white font-mono" style={{ animationDelay: `${i * 95}ms` }}>{ch}</span>
                  ))}
                </span>
                <button
                  onClick={handleCopyCode}
                  className={`px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-600 transition-all cursor-pointer ${codeCopied ? 'fx-copied-glow' : ''}`}
                >
                  {codeCopied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2">
              <p className="text-xs text-slate-400 text-center sm:text-right max-w-[240px]">
                {isHost
                  ? 'Family opens 1poly, taps Join a game, enters the code — then everyone picks their own name + token below.'
                  : 'Pick your name + character token in the green box below to join — anyone in the game can start it.'}
              </p>
              {dealActive && onWatchDealMatch && (
                <button
                  onClick={() => {
                    audio.playUiClick();
                    onWatchDealMatch();
                  }}
                  className="text-[11px] font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
                >
                  🃏 Cards match live — jump in!
                </button>
              )}
              {isHost ? (
                <button
                  onClick={() => {
                    if (window.confirm('Close this room for everyone?')) onCloseRoom?.();
                  }}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-950 border border-red-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Close room
                </button>
              ) : (
                <button
                  onClick={() => onLeaveRoom?.()}
                  className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Leave room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETUP CHECKLIST: everyone can see exactly what's missing */}
      {roomCode && !dealActive && (
        <div className="w-full max-w-2xl flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-600 text-slate-200">✅ 1. In the room</span>
          <span key={myPlayer ? 'joined' : 'not-joined'} className={`px-2.5 py-1 rounded-full border fx-check-pop ${myPlayer ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-amber-950/70 border-amber-600 text-amber-300'}`}>{myPlayer ? `✅ 2. In the game as ${myPlayer.name}` : '👉 2. Join the game below'}</span>
          <span key={gameState.players.length >= 2 ? 'ready' : 'waiting'} className={`px-2.5 py-1 rounded-full border fx-check-pop ${gameState.players.length >= 2 ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-slate-800/90 border-slate-600 text-slate-300'}`}>{gameState.players.length >= 2 ? '✅' : '⏳'} 3. {gameState.players.length}/2 players in{gameState.players.length < 2 && (<span className="fx-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>)}</span>
        </div>
      )}

      {/* STICKY START BAR (room mode): the way in + START are always one tap away */}
      {roomCode && (
        <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2">
            {dealActive && onWatchDealMatch ? (
              <button onClick={() => { audio.playUiClick(); onWatchDealMatch(); }} className="fx-neon-btn-blue flex-1 py-2.5 rounded-xl font-black text-sm cursor-pointer">
                🃏 Cards match live — Jump in 👀
              </button>
            ) : !myPlayer ? (
              <button onClick={scrollToJoin} className="fx-neon-btn flex-1 py-2.5 rounded-xl font-black text-sm cursor-pointer">
                👆 Join the game to play — tap here
              </button>
            ) : gameState.players.length >= 2 ? (
              <>
                <span className="text-[11px] font-black text-emerald-300 whitespace-nowrap">{gameState.players.length} in 🎮</span>
                <button onClick={() => { audio.playUiClick(); onStartGame(); }} className="fx-neon-btn fx-start-ready flex-1 py-2.5 rounded-xl font-black text-sm cursor-pointer">▶ Classic</button>
                <button onClick={() => { audio.playUiClick(); onStartRoomDealMatch?.(); }} className="fx-neon-btn-blue fx-start-ready flex-1 py-2.5 rounded-xl font-black text-sm cursor-pointer">🃏 Cards</button>
              </>
            ) : isHost && onAddCpuAndStartDeal ? (
              <>
                <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">Just you so far</span>
                <button
                  onClick={() => { audio.playUiClick(); const free = TOKENS.find(t => !gameState.players.some(p => p.token === t)) ?? TOKENS[0]; onAddCpuAndStartDeal('CPU Buddy', free); }}
                  className="fx-neon-btn-blue flex-1 py-2.5 rounded-xl font-black text-sm cursor-pointer"
                >
                  🤖 Add CPU & Start Cards
                </button>
              </>
            ) : (
              <span className="flex-1 text-center text-[11px] font-bold text-slate-300 py-1">⏳ Waiting for 1 more player to join the game…</span>
            )}
          </div>
        </div>
      )}

      {/* SELF-JOIN: everyone picks their own name + character token */}
      {roomCode && onJoinGame && (
        <div id="self-join-panel" className="w-full max-w-2xl bg-slate-900/90 border-2 border-emerald-500/50 rounded-3xl p-4 md:p-5 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300">
              {myPlayer ? `✅ You're in as ${myPlayer.name}` : '🎮 Join this game'}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 text-right">
              Anyone in the game can tap START GAME
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinName.trim() && joinToken) {
                  audio.playUiClick();
                  onJoinGame(joinName.trim(), joinToken);
                }
              }}
              placeholder="Your name"
              maxLength={24}
              className="flex-1 min-w-0 bg-slate-800 text-white px-4 py-2.5 rounded-lg border-2 border-slate-600 focus:border-emerald-400 outline-none font-bold placeholder:text-slate-500"
            />
            <button
              onClick={() => {
                audio.playUiClick();
                onJoinGame(joinName.trim(), joinToken);
              }}
              disabled={!joinName.trim() || !joinToken}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-lg shadow transition-colors cursor-pointer whitespace-nowrap"
            >
              {myPlayer ? '💾 Update' : !joinName.trim() ? '✍️ Type your name first' : '🎮 Join Game'}
            </button>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 mb-1.5 font-semibold">Pick your character token:</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
              {TOKENS.map(t => {
                const takenByOther = gameState.players.some(p => p.id !== myPlayerId && p.token === t);
                return (
                  <button
                    key={t}
                    disabled={takenByOther}
                    onClick={() => {
                      audio.playUiClick();
                      setJoinToken(t);
                    }}
                    title={takenByOther ? 'Already taken' : t}
                    className={`text-2xl p-1.5 rounded-lg border-2 transition-all ${
                      takenByOther
                        ? 'opacity-25 cursor-not-allowed border-transparent'
                        : joinToken === t
                          ? 'border-emerald-400 bg-emerald-400/20 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.45)] fx-token-selected'
                          : 'border-transparent hover:bg-slate-700 hover:scale-105'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          {!myPlayer && (
            <p className="text-[11px] text-slate-500">
              Nobody is added for you — your name and token are yours to pick. The host can still add 🤖 CPU bots for everyone.
            </p>
          )}
        </div>
      )}

      <div className="bg-slate-800/80 p-4 md:p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-2xl backdrop-blur-sm fx-glass">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl text-white font-semibold flex items-center gap-2">
            <Users className="text-blue-400" />
            Game Players ({gameState.players.length}/8)
          </h2>
          {gameState.players.length >= 2 && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-full">
              Ready to Start!
            </span>
          )}
        </div>
        
        {/* Players List */}
        <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
          {gameState.players.map((p, idx) => {
            const isEditing = editingPlayerId === p.id;

            if (isEditing) {
              return (
                <div key={p.id} className="bg-slate-900 p-4 rounded-xl border-2 border-yellow-500/80 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Edit Player Details</span>
                    <span className="text-2xl">{editToken}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Player Name"
                      className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-yellow-400 outline-none flex-1 text-sm font-bold"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as PlayerType)}
                      className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-yellow-400 outline-none text-sm font-bold cursor-pointer"
                    >
                      <option value={PlayerType.USER}>User (Human)</option>
                      <option value={PlayerType.CPU}>CPU (Bot)</option>
                    </select>
                  </div>

                  {/* Token selector for edit */}
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1">Pick Token:</p>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar p-1">
                      {TOKENS.filter(t => t === p.token || !gameState.players.some(other => other.id !== p.id && other.token === t)).map(t => (
                        <button
                          key={t}
                          onClick={() => setEditToken(t)}
                          className={`text-xl p-1 rounded-md border transition-all ${editToken === t ? 'border-yellow-400 bg-yellow-400/20 scale-110' : 'border-transparent hover:bg-slate-800'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      disabled={!editName.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow"
                    >
                      <Check size={14} /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-3 md:p-4 rounded-xl border border-slate-600/50 group hover:border-slate-500 transition-all fx-join-pop" style={{ boxShadow: `0 0 14px ${p.color}2e, inset 0 0 0 1px ${p.color}38`, animationDelay: `${Math.min(idx, 7) * 60}ms` }}>
                <div className="flex items-center gap-3">
                  {p.type === PlayerType.USER ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                  <span className="text-white font-medium text-base md:text-lg">
                    {p.name} <span className="text-xs text-slate-400 ml-1">({p.type})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-2xl md:text-3xl filter drop-shadow-md">{p.token}</span>

                  {/* Seat claim: this phone controls exactly one human player */}
                  {p.type === PlayerType.USER && onClaimSeat && (
                    myPlayerId === p.id ? (
                      <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/80 border border-emerald-600/70 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                        ✅ This is you
                      </span>
                    ) : takenSeats?.has(p.id) ? (
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                        📱 Taken
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          audio.playUiClick();
                          onClaimSeat(p.id);
                        }}
                        className="text-[11px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-lg shadow transition-colors cursor-pointer whitespace-nowrap"
                      >
                        📱 I am {p.name}
                      </button>
                    )
                  )}

                  {isHost && (
                    <>
                      {/* Edit Player Button */}
                      <button
                        onClick={() => handleStartEdit(p)}
                        title={`Edit ${p.name}`}
                        className="text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* Remove Player Button with Confirmation */}
                      <button
                        onClick={() => handlePromptDelete(p)}
                        title={`Remove ${p.name}`}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {gameState.players.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2 border-2 border-dashed border-slate-600 rounded-xl">
              <Users size={32} className="opacity-50" />
              <p className="italic">{roomCode ? 'No players yet — be the first to join in the green box above!' : 'No players added yet. Add players below or pick Quick Play!'}</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal Dialog */}
        <AnimatePresence>
          {playerToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-slate-900 border-2 border-red-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Remove Player?</h3>
                    <p className="text-xs text-slate-400">Confirm player removal from game setup.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{playerToDelete.token}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{playerToDelete.name}</h4>
                      <p className="text-xs text-slate-400">
                        {playerToDelete.type === PlayerType.USER ? '👤 Human Player' : '🤖 CPU Bot'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-red-950/80 text-red-400 border border-red-800">
                    Will be deleted
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Removing this player will free their token <span className="font-bold text-white">{playerToDelete.token}</span> and adjust the starting turn order automatically.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      audio.playUiClick();
                      setPlayerToDelete(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={16} /> Confirm Remove
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Validation / Error Toast */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs font-semibold rounded-xl flex items-center gap-2">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {/* Add Player Box (host sets the roster) */}
        {isHost && gameState.players.length < 8 && (
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
                <option value={PlayerType.USER}>User (Human)</option>
                <option value={PlayerType.CPU}>CPU (Bot)</option>
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
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 md:py-3 rounded-lg transition-colors shadow-lg cursor-pointer"
            >
              <PlusCircle size={20} /> Add Player Manually
            </button>
          </div>
        )}
        
        {/* Interactive House Rules & Customizations */}
        <div className="mb-6 p-4 md:p-6 bg-slate-900/60 rounded-xl border border-slate-700/80 shadow-inner">
           <h3 className="text-slate-300 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
             <span className="text-yellow-500">⚙️</span> Custom House Rules (Classic 1poly)
             {!isHost && <span className="text-slate-500 normal-case tracking-normal">(set by the host)</span>}
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
                       disabled={!isHost}
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

        {canStart ? (
        <div className="flex flex-col gap-4 mt-6">
          {gameState.players.length < 2 && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-center">
              <p className="text-xs text-amber-300 font-semibold">
                {inRoom
                  ? '⚠️ Need at least 2 players in the game to start. Once 2+ players have joined, anyone can tap START GAME.'
                  : '⚠️ Need at least 2 players to start a Classic 1poly match. Add another player above or choose a Quick Play option below.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => {
                audio.playUiClick();
                onStartGame();
              }}
              disabled={gameState.players.length < 2}
              className={`flex items-center justify-center gap-3 fx-neon-btn disabled:opacity-50 disabled:cursor-not-allowed font-black py-3 md:py-4 px-4 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-base md:text-lg cursor-pointer ${startReady ? 'fx-start-ready' : ''}`}
            >
              <Play fill="currentColor" size={18} /> Start Classic 1poly ({gameState.players.length})
            </button>

            <button
              onClick={() => {
                if (roomCode && onStartRoomDealMatch) {
                  audio.playUiClick();
                  onStartRoomDealMatch();
                } else {
                  handleStartDealWithCurrentPlayers();
                }
              }}
              disabled={!!roomCode && gameState.players.length < 2}
              className={`flex items-center justify-center gap-3 fx-neon-btn-blue disabled:opacity-50 disabled:cursor-not-allowed font-black py-3 md:py-4 px-4 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-base md:text-lg cursor-pointer ${startReady ? 'fx-start-ready' : ''}`}
            >
              <Sparkles size={20} /> {roomCode ? 'Start 1poly Cards — Room Match 🌐' : 'Start 1poly Cards'}
            </button>
          </div>

          {inRoom && gameState.players.length >= 2 && (
            <p className="text-center text-[11px] font-bold text-emerald-300/90 -mb-1">
              ✋ Everyone's in? Anyone in the game can tap START — no waiting on the host.
            </p>
          )}

          {/* Quick Play Section (host / local only) */}
          {isHost && (
          <div className="w-full flex flex-col items-center mt-2 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Quick Play vs AI Bots</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button 
                onClick={() => handleQuickStart(1)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg shadow transition-colors cursor-pointer"
              >
                <Zap size={16} /> 1v1 Classic
              </button>
              <button 
                onClick={() => handleQuickStart(3)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg shadow transition-colors cursor-pointer"
              >
                <Zap size={16} /> 1v3 Classic
              </button>
              <button 
                onClick={() => handleQuickStart(7)}
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg shadow transition-colors cursor-pointer"
              >
                <Zap size={16} /> 1v7 Classic
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              (Auto-fills remaining slots with AI bots and starts immediately)
            </p>
          </div>
          )}
        </div>
        ) : (
          <div className="mt-6 p-4 md:p-5 bg-slate-900/60 border border-slate-700 rounded-xl text-center space-y-2">
            <p className="text-sm font-bold text-slate-200">👆 Join the game first — then YOU can start it</p>
            <p className="text-xs text-slate-400">
              Pick your name + character token in the green box above and tap Join Game. Once you're in,
              the START GAME buttons appear for you too — nobody has to wait for the host.
            </p>
            {dealActive && onWatchDealMatch && (
              <button
                onClick={() => {
                  audio.playUiClick();
                  onWatchDealMatch();
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                🃏 A Cards match is live — jump in!
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

