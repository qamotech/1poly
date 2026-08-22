import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GamePhase, PlayerType, GameState, TradeOffer, BankruptcyRecord, GameSpeed } from './types';
import { Lobby } from './components/Lobby';
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
import { DealGame } from './components/deal/DealGame';
import { ViewNavigationTabs, usePersistentActiveView } from './components/ViewNavigationTabs';
import { audio, useGameAudio } from './audio';
import { Building2, Handshake, RotateCcw, Clapperboard, BookOpen, Sparkles } from 'lucide-react';

const socket = io(); // Connects to the same origin (port 3000)

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameMode, setGameMode] = useState<'classic' | 'deal'>('classic');
  const [dealInitialPlayers, setDealInitialPlayers] = useState<Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>>([
    { id: 'p1', name: 'N8', type: 'USER', token: '🥷🏾' },
    { id: 'p2', name: 'The Tycoon', type: 'CPU', token: '🎩' }
  ]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesModalDefaultTab, setRulesModalDefaultTab] = useState<'classic' | 'deal'>('classic');

  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showOpeningSequence, setShowOpeningSequence] = useState(false);
  const [activeBankruptcyRecord, setActiveBankruptcyRecord] = useState<BankruptcyRecord | null>(null);
  const [activeView, setActiveView] = usePersistentActiveView('board');
  const previousPhase = useRef<GamePhase | null>(null);

  // Hook up audio triggers based on gameState
  useGameAudio(gameState);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
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
    };
  }, []);

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
        { id: 'p1', name: 'N8', type: 'USER', token: '🥷🏾' },
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
  if (gameMode === 'deal') {
    return (
      <DealGame
        initialPlayers={dealInitialPlayers}
        onBackToLobby={() => setGameMode('classic')}
        onSwitchToClassic={() => setGameMode('classic')}
      />
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-xl animate-pulse">Connecting to server...</p>
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

  // In a true multiplayer scenario, we'd check if THIS client is the target player.
  const isTargetPlayerHuman = gameState.pendingTrade 
    ? gameState.players.find(p => p.id === gameState.pendingTrade!.toPlayerId)?.type === PlayerType.USER 
    : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
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
        />
      ) : (
        <div className="flex flex-col min-h-screen lg:h-screen max-w-[1600px] mx-auto overflow-hidden">
          {/* Main Top Header Bar with Mobile View Switcher */}
          <header className="shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20">
            {/* Brand & Active Player Quick Info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xl sm:text-2xl animate-bounce">🏃🏾‍♂️</span>
                <span className="font-black text-sm sm:text-lg tracking-wider text-yellow-400 uppercase hidden xs:inline">
                  1poly
                </span>
              </div>

              {currentPlayer && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-slate-800/90 rounded-xl border border-slate-700/70 min-w-0 shadow-inner">
                  <span className="text-sm sm:text-base shrink-0">{currentPlayer.token}</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[85px] sm:max-w-[140px]">
                    {currentPlayer.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ${currentPlayer.money}
                  </span>
                  {currentPlayer.type === PlayerType.CPU && (
                    <span className="text-[9px] bg-blue-600/80 text-white font-bold px-1 rounded uppercase">CPU</span>
                  )}
                  {currentPlayer.inJail && (
                    <span className="text-[9px] bg-orange-700 text-white font-bold px-1 rounded uppercase">Jail</span>
                  )}
                </div>
              )}
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

                {currentPlayer && (
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

                {currentPlayer && gameState.players.filter(p => !p.isBankrupt).length > 1 && (
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
              </div>
            </div>
          </header>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col lg:flex-row p-1 sm:p-4 gap-2 sm:gap-4 overflow-y-auto lg:overflow-hidden relative pb-16 lg:pb-0">
            {/* Main Board Area (Visible on desktop OR when activeView === 'board') */}
            <div 
              id="view-panel-board"
              role="tabpanel"
              aria-labelledby="header-nav-tab-board"
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
                isCpuTurn={isCpuTurn}
              />
            </div>

            {/* Sidebar HUD (Visible on desktop OR when activeView === 'hud') */}
            <div 
              id="view-panel-hud"
              role="tabpanel"
              aria-labelledby="header-nav-tab-hud"
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
                isCpuTurn={isCpuTurn}
              />
            </div>
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
        />
      )}

      {isTradeModalOpen && currentPlayer && (
        <TradeModal 
          gameState={gameState}
          currentPlayer={currentPlayer}
          onPropose={handleProposeTrade}
          onCancel={() => setIsTradeModalOpen(false)}
        />
      )}

      {isPropertyModalOpen && currentPlayer && (
        <PropertyManagerModal 
          gameState={gameState}
          currentPlayer={currentPlayer}
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
        <GameOverScreen winner={winner} onRestart={handleRestart} />
      )}
    </div>
  );
}
