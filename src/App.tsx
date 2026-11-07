import { useState, useEffect, useRef, lazy, Suspense, type ComponentType } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { GamePhase, PlayerType, GameState, TradeOffer, BankruptcyRecord, GameSpeed } from './types';
import { Lobby } from './components/Lobby';
import { RoomGate } from './components/RoomGate';
import type { DealGameState } from './deal/dealTypes';
import type { DealRemoteAction } from './components/deal/DealGame';
import { Board } from './components/Board';
import { HUD } from './components/HUD';
import { TradeModal } from './components/TradeModal';
import { TradeResponseModal } from './components/TradeResponseModal';
import { PropertyManagerModal } from './components/PropertyManagerModal';
import { CardDrawModal } from './components/CardDrawModal';
import { GameOverScreen } from './components/GameOverScreen';
import { TurnNotification } from './components/TurnNotification';
import { BankruptcyModal } from './components/BankruptcyModal';
import { AuctionModal } from './components/AuctionModal';
import { OpeningSequence } from './components/OpeningSequence';
import { RulesModal } from './components/RulesModal';
// Lazy-loaded: the 1poly Cards mode ships as its own chunk so the classic
// board game loads fast without paying for the card game up front.
// The Cards game code loads on demand the moment a match starts. If that
// one fetch hiccups (tablet wifi, sleepy server), retry once — then do
// exactly what a manual refresh does, automatically, at most once per
// 15s so it can never loop. Without this, a failed chunk = white screen.
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      try {
        return await factory();
      } catch (err) {
        const KEY = '1poly-chunk-reload-at';
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
        }
        throw err;
      }
    }
  });
}

const DealGame = lazyWithRetry(() => import('./components/deal/DealGame').then(m => ({ default: m.DealGame })));
import { ViewNavigationTabs } from './components/ViewNavigationTabs';
import { InstallButton } from './components/InstallButton';
import { HeaderPlayerStatus } from './components/HeaderPlayerStatus';
import { useGameView } from './context/GameViewContext';
import { audio, useGameAudio } from './audio';
import { Building2, Handshake, RotateCcw, Clapperboard, BookOpen, Sparkles } from 'lucide-react';

const socket = io(); // Connects to the same origin (port 3000)

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameMode, setGameMode] = useState<'classic' | 'deal'>('classic');
  const [dealInitialPlayers, setDealInitialPlayers] = useState<Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>>([
    { id: 'p1', name: 'Player 1', type: 'USER', token: '🥷🏾' },
    { id: 'p2', name: 'The Tycoon', type: 'CPU', token: '🎩' }
  ]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesModalDefaultTab, setRulesModalDefaultTab] = useState<'classic' | 'deal'>('classic');

  // -- Multiplayer room identity -------------------------------------------
  // playerToken: persistent per-browser identity (survives refresh) that a
  // seat is bound to server-side. roomCode/myPlayerId: my room + my seat.
  const [playerToken] = useState<string>(() => {
    try {
      let t = localStorage.getItem('1poly-player-token');
      if (!t) {
        t =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('1poly-player-token', t);
      }
      return t;
    } catch {
      return `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  });
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [seatTaken, setSeatTaken] = useState<Record<string, boolean>>({});
  const [inRoom, setInRoom] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Denied-action toasts (seat rejected / not your turn) shake once on
  // arrival (fx-toast-shake); info toasts (game starting) do not.
  const [toastDenied, setToastDenied] = useState(false);
  // True while the join attempt in flight is the automatic rejoin of the
  // saved room (vs. a code the user typed). A dead saved room is expected —
  // servers restart and lobbies empty — so its failure stays quiet instead
  // of showing the "Room not found" error meant for hand-typed codes.
  const autoJoinRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // -- Room Cards match (server-hosted Deal game) ---------------------------
  const [dealView, setDealView] = useState<DealGameState | null>(null);
  const [dealActive, setDealActive] = useState(false);
  const [dealRemote, setDealRemote] = useState(false);
  const dealRemoteRef = useRef(false);
  useEffect(() => {
    dealRemoteRef.current = dealRemote;
  }, [dealRemote]);

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showOpeningSequence, setShowOpeningSequence] = useState(false);
  const [activeBankruptcyRecord, setActiveBankruptcyRecord] = useState<BankruptcyRecord | null>(null);
  const { activeView, setActiveView } = useGameView();
  const previousPhase = useRef<GamePhase | null>(null);

  // Hook up audio triggers based on gameState
  useGameAudio(gameState);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      // Rejoin my room first (reclaims my seat by token), then (re)sync
      // state: if the server's emit raced ahead of our listener
      // registration, this is what un-sticks the lobby.
      let savedCode: string | null = null;
      try {
        savedCode = localStorage.getItem('1poly-room-code');
      } catch {
        savedCode = null;
      }
      if (savedCode) {
        autoJoinRef.current = true;
        socket.emit('join_room', { code: savedCode, token: playerToken });
      }
      socket.emit('request_state');
    };
    socket.on('connect', handleConnect);
    socket.on('disconnect', () => setIsConnected(false));
    // Socket may already be connected before this effect runs (module-scope io()).
    if (socket.connected) {
      handleConnect();
    }

    socket.on('room_joined', ({ code, isHost: host, myPlayerId: seatId }) => {
      autoJoinRef.current = false;
      setRoomCode(code);
      setIsHost(!!host);
      setMyPlayerId(seatId ?? null);
      setInRoom(true);
      setGateError(null);
      try {
        localStorage.setItem('1poly-room-code', code);
      } catch {
        // storage unavailable — reconnect reclaim just won't persist
      }
    });

    socket.on('room_error', ({ message }) => {
      if (autoJoinRef.current) {
        // The saved room simply ended (server restart / everyone left).
        // Land quietly on the gate with a gentle note — the "not found"
        // error is reserved for codes the user types in by hand.
        autoJoinRef.current = false;
        setGateError('Your last room has ended — start a new one below, or join with a fresh code.');
      } else {
        setGateError(message || 'Could not join that room.');
      }
      setInRoom(false);
      setRoomCode(null);
      try {
        localStorage.removeItem('1poly-room-code');
      } catch {
        // ignore
      }
    });

    socket.on('room_closed', () => {
      setInRoom(false);
      setRoomCode(null);
      setMyPlayerId(null);
      setIsHost(false);
      setGameState(null);
      setGateError('The host closed this room.');
      try {
        localStorage.removeItem('1poly-room-code');
      } catch {
        // ignore
      }
    });

    socket.on('seat_update', ({ seats }) => {
      const map: Record<string, boolean> = {};
      (seats || []).forEach((s: { playerId: string; taken: boolean }) => {
        map[s.playerId] = !!s.taken;
      });
      setSeatTaken(map);
    });

    socket.on('seat_claimed', ({ playerId }) => {
      setMyPlayerId(playerId);
    });

    socket.on('seat_rejected', ({ message }) => {
      setToastDenied(true);
      setToast(message || 'That seat is taken.');
    });

    socket.on('action_denied', ({ message }) => {
      setToastDenied(true);
      setToast(message || 'Not your turn');
    });

    // Cards match lifecycle: the server pushes a fresh (redacted) view after
    // every move; deal_started pulls everyone in the room into the match.
    socket.on('game_starting', ({ by, mode }: { by: string; mode: string }) => {
      setToastDenied(false);
      setToast(mode === 'deal' ? `🃏 ${by} started a Cards match!` : `🎮 ${by} started the game!`);
    });

    socket.on('deal_started', () => {
      setDealActive(true);
      setDealRemote(true);
      setGameMode('deal');
    });

    socket.on('deal_state', ({ state }) => {
      setDealView(state);
      setDealActive(true);
    });

    socket.on('deal_ended', () => {
      setDealActive(false);
      setDealView(null);
      setDealRemote(false);
      if (dealRemoteRef.current) {
        setGameMode('classic');
      }
    });

    socket.on('game_state_update', (newState: GameState) => {
      // Check if transitioning from Lobby to playing
      if (previousPhase.current === GamePhase.LOBBY && newState.phase !== GamePhase.LOBBY) {
        setShowOpeningSequence(true);
      }
      previousPhase.current = newState.phase;

      setGameState(newState);
      // If phase changes and we were proposing a trade, close the modal
      if (newState.phase !== GamePhase.TURN_START && newState.phase !== GamePhase.POST_ROLL) {
        setIsTradeModalOpen(false);
      }
      
      // If a card was just drawn, show the modal
      if (newState.lastCardDrawn) {
        setShowCardModal(true);
      } else {
        setShowCardModal(false);
      }

      // If a player just went bankrupt, show the summary modal automatically
      if (newState.recentBankruptcy) {
        setActiveBankruptcyRecord(newState.recentBankruptcy);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state_update');
      socket.off('room_joined');
      socket.off('room_error');
      socket.off('room_closed');
      socket.off('seat_update');
      socket.off('seat_claimed');
      socket.off('seat_rejected');
      socket.off('action_denied');
      socket.off('deal_started');
      socket.off('deal_state');
      socket.off('deal_ended');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link (also the PWA shortcut target): onepoly.onrender.com/#cards
  // jumps straight into 1poly Cards, which runs locally — no server wait.
  useEffect(() => {
    const goCards = () => {
      if (window.location.hash === '#cards') setGameMode('deal');
    };
    goCards();
    window.addEventListener('hashchange', goCards);
    return () => window.removeEventListener('hashchange', goCards);
  }, []);

  // If the server takes a while to answer it's almost always the free host
  // waking from sleep — say so instead of leaving a bare spinner.
  const [showWakeHint, setShowWakeHint] = useState(false);
  useEffect(() => {
    if (gameState) {
      setShowWakeHint(false);
      return;
    }
    const t = setTimeout(() => setShowWakeHint(true), 3500);
    return () => clearTimeout(t);
  }, [gameState]);

  // -- Room actions ----------------------------------------------------------
  const handleCreateRoom = () => {
    setGateError(null);
    socket.emit('create_room', { token: playerToken });
  };

  const handleJoinRoom = (code: string) => {
    autoJoinRef.current = false;
    setGateError(null);
    socket.emit('join_room', { code, token: playerToken });
  };

  const handleClaimSeat = (playerId: string) => {
    socket.emit('claim_seat', { playerId });
  };

  // Self-join: I add MYSELF to the game with my own name + token (the
  // server creates my player and binds my seat). Calling again renames me.
  const handleJoinGame = (name: string, token: string) => {
    socket.emit('join_game', { name, token });
  };

  // -- Room Cards match actions ----------------------------------------------
  const handleStartRoomDealMatch = () => {
    socket.emit('start_deal_match');
  };

  // One-tap solo start: add a CPU bot, then start the Cards match once the
  // server has registered the bot (host-only path; add_player is host-gated).
  const handleAddCpuAndStartDeal = (name: string, token: string) => {
    socket.emit('add_player', { name, type: PlayerType.CPU, token });
    setTimeout(() => socket.emit('start_deal_match'), 500);
  };

  const handleDealAction = (action: DealRemoteAction) => {
    socket.emit('deal_action', { action });
  };

  const handleEnterDealMatch = () => {
    setDealRemote(true);
    setGameMode('deal');
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setInRoom(false);
    setRoomCode(null);
    setMyPlayerId(null);
    setIsHost(false);
    setGameState(null);
    try {
      localStorage.removeItem('1poly-room-code');
    } catch {
      // ignore
    }
  };

  const handleCloseRoom = () => {
    socket.emit('close_room');
  };

  const handleAddPlayer = (name: string, type: PlayerType, token: string) => {
    socket.emit('add_player', { name, type, token });
  };

  const handleUpdatePlayer = (playerId: string, updates: { name?: string; type?: PlayerType; token?: string }) => {
    socket.emit('update_player', { playerId, updates });
  };

  const handleRemovePlayer = (playerId: string) => {
    socket.emit('remove_player', { playerId });
  };

  const handleStartGame = () => {
    setGameMode('classic');
    socket.emit('start_game');
  };

  const handleStartDealGame = (players?: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>) => {
    // Solo Cards (local AI) — explicitly not the room match.
    setDealRemote(false);
    if (players && players.length >= 2) {
      setDealInitialPlayers(players);
    } else if (gameState && gameState.players.length >= 2) {
      setDealInitialPlayers(
        gameState.players.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type as 'USER' | 'CPU',
          token: p.token,
        }))
      );
    } else {
      setDealInitialPlayers([
        { id: 'p1', name: 'Player 1', type: 'USER', token: '🥷🏾' },
        { id: 'p2', name: 'The Tycoon', type: 'CPU', token: '🎩' },
      ]);
    }
    setGameMode('deal');
  };

  const handleOpenRules = (tab: 'classic' | 'deal' = 'classic') => {
    audio.playUiClick();
    setRulesModalDefaultTab(tab);
    setShowRulesModal(true);
  };

  const handleRoll = () => {
    socket.emit('roll');
  };

  const handleBuyProperty = () => {
    socket.emit('buy');
  };

  const handleDeclineProperty = () => {
    socket.emit('decline_property');
  };

  const handlePlaceBid = (playerId: string, bidAmount: number) => {
    socket.emit('place_bid', { playerId, bidAmount });
  };

  const handlePassAuction = (playerId: string) => {
    socket.emit('pass_auction', { playerId });
  };

  const handleSetGameSpeed = (speed: GameSpeed) => {
    socket.emit('set_game_speed', { speed });
  };

  const handleEndTurn = () => {
    socket.emit('end_turn');
  };

  const handleProposeTrade = (offer: TradeOffer) => {
    socket.emit('propose_trade', offer);
    setIsTradeModalOpen(false);
  };

  const handleResolveTrade = (accepted: boolean) => {
    socket.emit('resolve_trade', { accepted });
  };

  const handleMortgage = (playerId: string, propertyId: string) => {
    socket.emit('mortgage_property', { playerId, propertyId });
  };
  const handleUnmortgage = (playerId: string, propertyId: string) => {
    socket.emit('unmortgage_property', { playerId, propertyId });
  };
  const handlePayBail = (playerId: string) => {
    socket.emit('pay_bail', { playerId });
  };
  const handleUseJailCard = (playerId: string) => {
    socket.emit('use_jail_card', { playerId });
  };

  const handleBuildHouse = (playerId: string, propertyId: string) => {
    socket.emit('build_house', { playerId, propertyId });
  };

  const handleSellHouse = (playerId: string, propertyId: string) => {
    socket.emit('sell_house', { playerId, propertyId });
  };

  const handleTakeLoan = (playerId: string, amount: number) => {
    socket.emit('take_loan', { playerId, amount });
  };

  const handleRepayLoan = (playerId: string, amount: number) => {
    socket.emit('repay_loan', { playerId, amount });
  };

  const handleRestart = () => {
    socket.emit('restart_game');
    setGameMode('classic');
  };

  const handleUpdateRules = (rules: Partial<typeof gameState.houseRules>) => {
    socket.emit('update_rules', rules);
  };

  const handleDismissBankruptcy = () => {
    setActiveBankruptcyRecord(null);
    socket.emit('dismiss_bankruptcy');
  };

  // If currently playing 1poly Cards game
  const toastEl = toast ? (
    <div key={toast} className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[320] bg-slate-900/95 border border-amber-500/60 text-amber-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap fx-toast-in${toastDenied ? ' fx-toast-shake' : ''}`}>
      {toast}
    </div>
  ) : null;

  if (gameMode === 'deal') {
    // Room match: server-hosted, my view is redacted to my own hand.
    if (dealRemote && dealView) {
      return (
        <>
        {toastEl}
        <Suspense fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <p className="text-xl animate-pulse">Loading 1poly Cards...</p>
          </div>
        }>
          <DealGame
            initialPlayers={dealView.players.map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              token: p.token,
            }))}
            remote={{
              state: dealView,
              myPlayerId,
              isHost,
              onAction: handleDealAction,
            }}
            onBackToLobby={() => setGameMode('classic')}
            onSwitchToClassic={() => setGameMode('classic')}
          />
        </Suspense>
        </>
      );
    }
    if (dealRemote && !dealView) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <p className="text-xl animate-pulse">Joining Cards match…</p>
        </div>
      );
    }
    // Solo Cards vs local AI (unchanged).
    return (
      <>
      {toastEl}
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <p className="text-xl animate-pulse">Loading 1poly Cards...</p>
        </div>
      }>
        <DealGame
          initialPlayers={dealInitialPlayers}
          onBackToLobby={() => setGameMode('classic')}
          onSwitchToClassic={() => setGameMode('classic')}
        />
      </Suspense>
      </>
    );
  }

  if (!inRoom) {
    if (!isConnected) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-5 text-white p-6 text-center">
          <p className="text-xl animate-pulse">Connecting to server...</p>
          {showWakeHint && (
            <div className="max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-300">
                ☕ <strong className="text-white">Waking up the game server…</strong> The free
                host puts it to sleep after ~15 idle minutes, so the first load can take
                30–60 seconds. This screen moves on by itself once it's awake — no need
                to refresh.
              </p>
              <button
                onClick={() => setGameMode('deal')}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                🃏 Play 1poly Cards while you wait
              </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <>
        <InstallButton />
        <RoomGate
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
          onPlayCards={() => setGameMode('deal')}
          error={gateError}
        />
      </>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl animate-pulse">Joining room {roomCode}…</p>
      </div>
    );
  }

  const isLobby = gameState.phase === GamePhase.LOBBY;
  const isCpuTurn = !isLobby && gameState.players[gameState.currentPlayerIndex]?.type === PlayerType.CPU;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Find winner if game over
  const winner = gameState.phase === GamePhase.GAME_OVER 
    ? gameState.players.find(p => !p.isBankrupt) || null
    : null;

  // Multiplayer identity: my seat in this room (null = spectating).
  const myPlayer = myPlayerId
    ? gameState.players.find(p => p.id === myPlayerId) ?? null
    : null;
  const isMyTurn = !!myPlayer && currentPlayer?.id === myPlayer.id;
  // Board/HUD lock every control when it isn't this phone's turn (their
  // isCpuTurn prop already means "hands off"), and the server enforces it.
  const controlsLocked = isCpuTurn || !isMyTurn;

  // The trade response belongs to the phone holding the target seat.
  const isTargetPlayerHuman = gameState.pendingTrade
    ? gameState.pendingTrade.toPlayerId === myPlayerId
    : false;

  return (
    <div className="min-h-screen bg-slate-950 fx-aura-bg fx-view-in text-slate-50 font-sans selection:bg-blue-500/30">
      <InstallButton />
      {/* Soft notice from the server when an action isn't this phone's to make */}
      {toast && (
        <div key={toast} className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] bg-slate-900/95 border border-amber-500/60 text-amber-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-2xl pointer-events-none fx-toast-in${toastDenied ? ' fx-toast-shake' : ''}`}>
          {toast}
        </div>
      )}
      {/* Dynamic Turn Banner Notification */}
      {!isLobby && gameState.phase !== GamePhase.GAME_OVER && (
        <TurnNotification currentPlayer={currentPlayer} />
      )}

      {isLobby ? (
        <Lobby
          gameState={gameState}
          onAddPlayer={handleAddPlayer}
          onUpdatePlayer={handleUpdatePlayer}
          onRemovePlayer={handleRemovePlayer}
          onStartGame={handleStartGame}
          onStartDealGame={handleStartDealGame}
          onOpenRules={handleOpenRules}
          onUpdateRules={handleUpdateRules}
          roomCode={roomCode ?? ''}
          isHost={isHost}
          myPlayerId={myPlayerId}
          takenSeats={new Set(
            Object.entries(seatTaken)
              .filter(([pid, taken]) => taken && pid !== myPlayerId)
              .map(([pid]) => pid)
          )}
          onClaimSeat={handleClaimSeat}
          onJoinGame={handleJoinGame}
          onCloseRoom={handleCloseRoom}
          onLeaveRoom={handleLeaveRoom}
          dealActive={dealActive}
          onWatchDealMatch={handleEnterDealMatch}
          onStartRoomDealMatch={handleStartRoomDealMatch}
          onAddCpuAndStartDeal={handleAddCpuAndStartDeal}
        />
      ) : (
        <div className="flex flex-col min-h-screen lg:h-screen max-w-[1600px] mx-auto overflow-hidden">
          {/* Main Top Header Bar with Mobile View Switcher */}
          <header className="shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20">
            {/* Brand & Player Status Info Display */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xl sm:text-2xl animate-bounce">🏃🏾‍♂️</span>
                <span className="font-black text-sm sm:text-lg tracking-wider text-yellow-400 uppercase hidden xs:inline">
                  1poly
                </span>
              </div>

              {/* Enhanced Player Info Display with Subtle Color-Coded Status Rings */}
              {gameState && (
                <HeaderPlayerStatus
                  players={gameState.players}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  onOpenPortfolio={() => setIsPropertyModalOpen(true)}
                />
              )}

              {/* Room + my-seat identity */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-black tracking-[0.2em] bg-slate-800 border border-slate-700 text-amber-300 px-2 py-1 rounded-lg">
                  🏠 {roomCode}
                </span>
                <span className="text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg max-w-[140px] truncate">
                  {myPlayer ? `${myPlayer.token} You: ${myPlayer.name}` : '👀 Spectating'}
                </span>
              </div>
            </div>

            {/* View Switcher & Header Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Persistent Tab-Based Navigation (Visible on mobile & tablet, hidden on desktop) */}
              <ViewNavigationTabs
                activeView={activeView}
                onViewChange={setActiveView}
                gameState={gameState}
                variant="header"
                className="flex lg:hidden"
              />

              {/* Quick Actions (Rules / Deal Switcher / Portfolio / Trade / Reset) */}
              <div className="flex items-center gap-1">
                {/* Official Rules Modal Button */}
                <button
                  id="header-rules-btn"
                  onClick={() => handleOpenRules('classic')}
                  className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700/80 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                  title="View Official Rules & Guides"
                >
                  <BookOpen size={15} />
                  <span className="hidden xl:inline">Rules</span>
                </button>

                {/* Switch to 1poly Cards Fast Game */}
                <button
                  id="header-deal-btn"
                  onClick={() => handleStartDealGame()}
                  className="p-2 sm:px-2.5 sm:py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl border border-blue-500/60 text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  title="Switch to 1poly Cards (Fast 15-Min Card Game)"
                >
                  <Sparkles size={15} className="text-amber-300" />
                  <span className="hidden lg:inline">1poly Cards</span>
                </button>

                {myPlayer && (
                  <button
                    id="header-portfolio-btn"
                    onClick={() => {
                      audio.playUiClick();
                      setIsPropertyModalOpen(true);
                    }}
                    className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Open Property & Bank Manager"
                  >
                    <Building2 size={15} className="text-emerald-400" />
                    <span className="hidden md:inline">Portfolio</span>
                  </button>
                )}

                {myPlayer && gameState.players.filter(p => !p.isBankrupt).length > 1 && (
                  <button
                    id="header-trade-btn"
                    onClick={() => {
                      audio.playUiClick();
                      setIsTradeModalOpen(true);
                    }}
                    className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Propose Trade"
                  >
                    <Handshake size={15} className="text-purple-400" />
                    <span className="hidden md:inline">Trade</span>
                  </button>
                )}

                <button
                  id="header-intro-btn"
                  onClick={() => {
                    audio.playUiClick();
                    setShowOpeningSequence(true);
                  }}
                  className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700/80 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                  title="Replay Opening Sequence"
                >
                  <Clapperboard size={15} />
                  <span className="hidden xl:inline">Intro</span>
                </button>

                {isHost && (
                  <button
                    id="header-restart-btn"
                    onClick={() => {
                      audio.playUiClick();
                      if (window.confirm('Restart game and return to lobby?')) {
                        handleRestart();
                      }
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700/80 text-xs transition-colors cursor-pointer"
                    title="Reset Game & Return to Lobby"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col lg:flex-row p-1 sm:p-4 gap-2 sm:gap-4 overflow-y-auto lg:overflow-hidden relative pb-16 lg:pb-0">
            {/* Main Board Area (Visible on desktop OR when activeView === 'board') */}
            <motion.div 
              id="view-panel-board"
              role="tabpanel"
              aria-labelledby="header-nav-tab-board"
              key={`view-board-${activeView}`}
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full lg:flex-1 items-center justify-center p-0 sm:p-4 bg-slate-900 sm:rounded-3xl border-0 sm:border border-slate-800 sm:shadow-2xl relative ${
                activeView === 'board' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <Board 
                gameState={gameState} 
                onRoll={handleRoll} 
                onEndTurn={handleEndTurn}
                onPayBail={() => currentPlayer && handlePayBail(currentPlayer.id)}
                onUseJailCard={() => currentPlayer && handleUseJailCard(currentPlayer.id)}
                onBuyProperty={handleBuyProperty}
                onDeclineProperty={handleDeclineProperty}
                onOpenTradeModal={() => setIsTradeModalOpen(true)}
                onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
                isCpuTurn={controlsLocked}
              />
            </motion.div>

            {/* Sidebar HUD (Visible on desktop OR when activeView === 'hud') */}
            <motion.div 
              id="view-panel-hud"
              role="tabpanel"
              aria-labelledby="header-nav-tab-hud"
              key={`view-hud-${activeView}`}
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full lg:w-[400px] flex-col gap-4 pb-8 lg:pb-0 shrink-0 lg:overflow-y-auto lg:pr-2 ${
                activeView === 'hud' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <HUD 
                gameState={gameState} 
                onRoll={handleRoll} 
                onEndTurn={handleEndTurn} 
                onPayBail={() => currentPlayer && handlePayBail(currentPlayer.id)}
                onUseJailCard={() => currentPlayer && handleUseJailCard(currentPlayer.id)}
                onBuyProperty={handleBuyProperty}
                onOpenTradeModal={() => setIsTradeModalOpen(true)}
                onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
                onRestartGame={handleRestart}
                onSetGameSpeed={handleSetGameSpeed}
                onRemovePlayer={handleRemovePlayer}
                onViewBankruptcySummary={(record) => setActiveBankruptcyRecord(record)}
                isCpuTurn={controlsLocked}
              />
            </motion.div>
          </div>

          {/* Persistent Floating Bottom Nav for Mobile / Orientation Changes */}
          <ViewNavigationTabs
            activeView={activeView}
            onViewChange={setActiveView}
            gameState={gameState}
            variant="floating-bottom"
          />
        </div>
      )}

      {/* Auction Modal */}
      {gameState.phase === GamePhase.AUCTION && gameState.auction && (
        <AuctionModal
          gameState={gameState}
          onPlaceBid={handlePlaceBid}
          onPassAuction={handlePassAuction}
          myPlayerId={myPlayerId}
        />
      )}

      {isTradeModalOpen && myPlayer && (
        <TradeModal
          gameState={gameState}
          currentPlayer={myPlayer}
          onPropose={handleProposeTrade}
          onCancel={() => setIsTradeModalOpen(false)}
        />
      )}

      {isPropertyModalOpen && myPlayer && (
        <PropertyManagerModal
          gameState={gameState}
          currentPlayer={myPlayer}
          onBuildHouse={handleBuildHouse}
          onSellHouse={handleSellHouse}
          onMortgage={handleMortgage}
          onUnmortgage={handleUnmortgage}
          onTakeLoan={handleTakeLoan}
          onRepayLoan={handleRepayLoan}
          onClose={() => setIsPropertyModalOpen(false)}
        />
      )}

      {gameState.phase === GamePhase.TRADING && gameState.pendingTrade && (
        <TradeResponseModal 
          gameState={gameState}
          offer={gameState.pendingTrade}
          isTargetPlayer={isTargetPlayerHuman}
          onRespond={handleResolveTrade}
        />
      )}

      {showCardModal && (
        <CardDrawModal 
          gameState={gameState} 
          onClose={() => setShowCardModal(false)} 
        />
      )}

      {/* Bankruptcy Summary Modal */}
      {activeBankruptcyRecord && (
        <BankruptcyModal 
          bankruptcy={activeBankruptcyRecord} 
          onClose={handleDismissBankruptcy} 
        />
      )}

      {/* Opening Sequence Intro */}
      {showOpeningSequence && !isLobby && (
        <OpeningSequence 
          gameState={gameState} 
          onComplete={() => setShowOpeningSequence(false)} 
        />
      )}

      {/* Rules Modal for both Classic and Deal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        defaultTab={rulesModalDefaultTab}
      />

      {gameState.phase === GamePhase.GAME_OVER && (
        <GameOverScreen winner={winner} onRestart={handleRestart} canRestart={isHost} />
      )}
    </div>
  );
}
