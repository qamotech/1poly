import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { GamePhase, PlayerType, GameState, TradeOffer } from './types';
import { Lobby } from './components/Lobby';
import { Board } from './components/Board';
import { HUD } from './components/HUD';
import { TradeModal } from './components/TradeModal';
import { TradeResponseModal } from './components/TradeResponseModal';
import { PropertyManagerModal } from './components/PropertyManagerModal';
import { CardDrawModal } from './components/CardDrawModal';
import { GameOverScreen } from './components/GameOverScreen';
import { TurnNotification } from './components/TurnNotification';
import { useGameAudio } from './audio';

const socket = io(); // Connects to the same origin (port 3000)

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  // Hook up audio triggers based on gameState
  useGameAudio(gameState);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('game_state_update', (newState: GameState) => {
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

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleRoll = () => {
    socket.emit('roll');
  };

  const handleBuyProperty = () => {
    socket.emit('buy');
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

  const handleBuildHouse = (playerId: string, propertyId: string) => {
    socket.emit('build_house', { playerId, propertyId });
  };

  const handleTakeLoan = (playerId: string, amount: number) => {
    socket.emit('take_loan', { playerId, amount });
  };

  const handleRepayLoan = (playerId: string, amount: number) => {
    socket.emit('repay_loan', { playerId, amount });
  };

  const handleRestart = () => {
    socket.emit('restart_game');
  };

  const handleUpdateRules = (rules: Partial<typeof gameState.houseRules>) => {
    socket.emit('update_rules', rules);
  };

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
  // For this shared-screen / hybrid setup, if it's not a CPU's turn, we'll allow human response.
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
          onStartGame={handleStartGame} 
          onUpdateRules={handleUpdateRules}
        />
      ) : (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen p-0 sm:p-4 gap-0 sm:gap-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden">
          {/* Main Board Area (Left/Top) */}
          <div className="w-full lg:flex-1 flex items-center justify-center p-0 sm:p-4 bg-slate-900 sm:rounded-3xl border-0 sm:border border-slate-800 sm:shadow-2xl relative">
            <Board 
              gameState={gameState} 
              onRoll={handleRoll}
              onEndTurn={handleEndTurn}
              onPayBail={() => currentPlayer && handlePayBail(currentPlayer.id)}
              onBuyProperty={handleBuyProperty}
              onOpenTradeModal={() => setIsTradeModalOpen(true)}
              onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
              isCpuTurn={isCpuTurn}
            />
          </div>

          {/* Sidebar HUD (Right/Bottom) */}
          <div className="w-full lg:w-[400px] flex flex-col gap-4 pb-8 lg:pb-0 shrink-0 lg:overflow-y-auto lg:pr-2">
            <HUD 
              gameState={gameState} 
              onRoll={handleRoll} 
              onEndTurn={handleEndTurn} 
              onBuyProperty={handleBuyProperty}
              onOpenTradeModal={() => setIsTradeModalOpen(true)}
              onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
              isCpuTurn={isCpuTurn}
            />
          </div>
        </div>
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

      {gameState.phase === GamePhase.GAME_OVER && (
        <GameOverScreen winner={winner} onRestart={handleRestart} />
      )}
    </div>
  );
}
