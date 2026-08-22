import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DealGameState,
  DealCard,
  DealColor,
  DealPlayer,
  DealActionName,
  DealCardType,
  DealGamePhase,
} from '../../deal/dealTypes';
import {
  createInitialDealGame,
  playCardToBank,
  playCardToProperty,
  playActionCard,
  respondWithJustSayNo,
  payDebtWithCards,
  discardCardFromHand,
  endDealTurn,
  moveWildcard,
} from '../../deal/dealEngine';
import { processAIDealStep } from '../../deal/dealAI';
import { COLOR_CONFIG, ALL_PLAYABLE_COLORS } from '../../deal/dealCards';
import { DealCardView } from './DealCardView';
import { DealActionModal } from './DealActionModal';
import { DealGameOver } from './DealGameOver';
import { RulesModal } from '../RulesModal';
import { audio } from '../../audio';
import {
  Layers,
  Sparkles,
  BookOpen,
  RefreshCw,
  Volume2,
  VolumeX,
  ScrollText,
  DollarSign,
  Home,
  CheckCircle2,
  Shield,
  ArrowRight,
  Zap,
  Bot,
  User,
  ArrowRightLeft,
  Flame,
} from 'lucide-react';

interface DealGameProps {
  initialPlayers: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>;
  onBackToLobby: () => void;
  onSwitchToClassic: () => void;
}

export const DealGame: React.FC<DealGameProps> = ({
  initialPlayers,
  onBackToLobby,
  onSwitchToClassic,
}) => {
  // Deal Game State
  const [gameState, setGameState] = useState<DealGameState>(() => {
    return createInitialDealGame(initialPlayers);
  });

  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [pendingCardForActionModal, setPendingCardForActionModal] = useState<DealCard | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  // Wildcard reassignment modal state
  const [wildcardToMove, setWildcardToMove] = useState<{ card: DealCard; fromColor: DealColor } | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const localPlayer = gameState.players.find((p) => p.type === 'USER') || gameState.players[0];
  const isMyTurn = currentPlayer?.id === localPlayer?.id && gameState.phase === DealGamePhase.PLAYING;
  const turnsAreUp = isMyTurn && gameState.playsRemaining === 0;

  // Flash screen effect when turn plays reach 0
  useEffect(() => {
    if (turnsAreUp) {
      setScreenFlash(true);
      const timer = setTimeout(() => {
        setScreenFlash(false);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [turnsAreUp]);

  // AI Turn automation loop
  useEffect(() => {
    if (gameState.phase === DealGamePhase.GAME_OVER) return;

    const isCpuTurn = currentPlayer?.type === 'CPU';
    const isCpuAwaitingNo =
      gameState.phase === DealGamePhase.AWAITING_JUST_SAY_NO &&
      gameState.pendingAction &&
      gameState.players.some(
        (p) =>
          p.type === 'CPU' &&
          (gameState.pendingAction!.pendingPaymentPlayerIds.includes(p.id) ||
            p.id === gameState.pendingAction!.targetPlayerId ||
            (gameState.pendingAction!.lastJustSayNoPlayerId && p.id === gameState.pendingAction!.sourcePlayerId))
      );

    const isCpuAwaitingPayment =
      gameState.phase === DealGamePhase.AWAITING_PAYMENT &&
      gameState.pendingAction &&
      gameState.players.some(
        (p) => p.type === 'CPU' && gameState.pendingAction!.pendingPaymentPlayerIds.includes(p.id)
      );

    const isCpuAwaitingDiscard =
      gameState.phase === DealGamePhase.AWAITING_DISCARD && currentPlayer?.type === 'CPU';

    if (isCpuTurn || isCpuAwaitingNo || isCpuAwaitingPayment || isCpuAwaitingDiscard) {
      const timer = setTimeout(() => {
        setGameState((prevState) => {
          const nextState = processAIDealStep(prevState);
          audio.playCard();
          return nextState;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentPlayer]);

  // Handlers for Human Player
  const handleBankCard = (cardId: string) => {
    audio.playBuy();
    setGameState((prev) => playCardToBank(prev, cardId));
    setSelectedHandCardId(null);
  };

  const handlePlayProperty = (card: DealCard, targetColor?: DealColor) => {
    // If it is a wildcard or building and has multiple color options, prompt user for color target
    if (
      card.type === DealCardType.PROPERTY_WILD ||
      card.type === DealCardType.BUILDING
    ) {
      setPendingCardForActionModal(card);
      setSelectedHandCardId(null);
      return;
    }

    audio.playUiClick();
    setGameState((prev) => playCardToProperty(prev, card.id, targetColor));
    setSelectedHandCardId(null);
  };

  const handlePlayAction = (card: DealCard) => {
    audio.playCard();
    // Check if card requires a modal target selection (Deal Breaker, Sly Deal, Rent, Forced Deal, Debt Collector, etc.)
    const needsModal =
      card.actionName === DealActionName.DEAL_BREAKER ||
      card.actionName === DealActionName.SLY_DEAL ||
      card.actionName === DealActionName.FORCED_DEAL ||
      card.actionName === DealActionName.DEBT_COLLECTOR ||
      card.type === DealCardType.RENT;

    if (needsModal) {
      setPendingCardForActionModal(card);
      setSelectedHandCardId(null);
    } else {
      // Pass Go, Birthday, etc.
      setGameState((prev) => playActionCard(prev, card.id));
      setSelectedHandCardId(null);
    }
  };

  const handleActionModalTargets = (payload: {
    targetPlayerId?: string;
    targetColor?: DealColor;
    targetCardId?: string;
    swapMyCardId?: string;
    isDoubled?: boolean;
  }) => {
    if (!pendingCardForActionModal) return;
    const card = pendingCardForActionModal;

    if (card.type === DealCardType.PROPERTY || card.type === DealCardType.PROPERTY_WILD || card.type === DealCardType.BUILDING) {
      audio.playUiClick();
      setGameState((prev) => playCardToProperty(prev, card.id, payload.targetColor));
    } else {
      audio.playDice();
      setGameState((prev) => playActionCard(prev, card.id, payload));
    }
    setPendingCardForActionModal(null);
  };

  const handleMoveWildcardColor = (toColor: DealColor) => {
    if (!wildcardToMove) return;
    audio.playUiClick();
    setGameState((prev) =>
      moveWildcard(prev, wildcardToMove.card.id, wildcardToMove.fromColor, toColor)
    );
    setWildcardToMove(null);
  };

  const handleEndTurn = () => {
    audio.playUiClick();
    setGameState((prev) => endDealTurn(prev));
    setSelectedHandCardId(null);
  };

  const handleRestart = () => {
    audio.playUiClick();
    setGameState(createInitialDealGame(initialPlayers));
    setSelectedHandCardId(null);
    setPendingCardForActionModal(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 select-none overflow-x-hidden font-sans relative">
      {/* Screen Flash Indicator when plays are up */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-50 bg-red-600/25 ring-8 ring-inset ring-red-500 shadow-[inset_0_0_100px_rgba(239,68,68,0.5)]"
          />
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 uppercase">
                  1poly Cards
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 border border-blue-600">
                  Fast Cards
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Turn {gameState.turnNumber}</span>
                <span>•</span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/60 ring-1 ring-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs">{currentPlayer.token}</span>
                  <strong className="text-emerald-200 font-bold">{currentPlayer.name}</strong>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">${currentPlayer.bankValue}M</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plays Indicator and Center Turn Status */}
        <div
          className={`hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
            turnsAreUp
              ? 'bg-red-950/90 border-red-500/80 text-red-300 ring-2 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
              : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}
        >
          <span className={`text-xs font-bold ${turnsAreUp ? 'text-red-400 font-black' : 'text-slate-400'}`}>
            {turnsAreUp ? 'Turns Up!' : 'Plays Left:'}
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  turnsAreUp
                    ? 'bg-red-900/80 border border-red-500 text-red-300'
                    : num <= gameState.playsRemaining
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playUiClick();
              setShowRulesModal(true);
            }}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Deal & Classic Rules"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            onClick={() => {
              audio.playUiClick();
              setShowLogsDrawer(!showLogsDrawer);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Activity Logs"
          >
            <ScrollText size={16} />
          </button>

          <button
            onClick={onSwitchToClassic}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch to Classic Board 1poly"
          >
            <Layers size={16} />
            <span className="hidden lg:inline">Classic 1poly</span>
          </button>

          <button
            onClick={handleRestart}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Restart Deal Match"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Playing Arena */}
      <main className="flex-1 p-3 sm:p-5 flex flex-col justify-between max-w-7xl w-full mx-auto space-y-4">
        {/* Opponents Area (Top Row) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gameState.players
            .filter((p) => p.id !== localPlayer.id)
            .map((opponent) => {
              const isOpponentTurn = currentPlayer.id === opponent.id;
              const totalBank = opponent.bank.reduce((sum, c) => sum + c.value, 0);

              return (
                <div
                  key={opponent.id}
                  className={`bg-slate-900/90 rounded-2xl p-3 sm:p-4 border transition-all ${
                    isOpponentTurn
                      ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Opponent Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{opponent.token}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-sm">{opponent.name}</span>
                          {opponent.type === 'CPU' ? (
                            <Bot size={13} className="text-blue-400" />
                          ) : (
                            <User size={13} className="text-emerald-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {opponent.hand.length} cards in hand
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sets count badge */}
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                          opponent.completedSetsCount >= 2
                            ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                            : 'bg-slate-800 text-amber-300 border-slate-700'
                        }`}
                      >
                        {opponent.completedSetsCount}/3 Full Sets
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                        ${totalBank}M
                      </span>
                    </div>
                  </div>

                  {/* Opponent Property Sets */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    {ALL_PLAYABLE_COLORS.map((col) => {
                      const set = opponent.propertySets[col];
                      if (!set || set.cards.length === 0) return null;
                      const config = COLOR_CONFIG[col];

                      return (
                        <div
                          key={col}
                          className={`p-1.5 rounded-lg border flex flex-col items-center justify-between text-center transition-all ${
                            set.isComplete
                              ? `${config.bgClass} border-amber-400 ring-2 ring-amber-400/40 shadow-sm`
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <span className="text-[9px] font-black uppercase text-white truncate max-w-full">
                            {config.name.slice(0, 5)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-200">
                            {set.cards.length}/{config.requiredCount}
                          </span>
                          {set.hasHouse && <span className="text-[8px] text-emerald-300">🏠</span>}
                          {set.hasHotel && <span className="text-[8px] text-red-300">🏨</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </section>

        {/* Center Table Arena (Deck, Discard Pile & Action Announcement) */}
        <section className="bg-slate-900/60 rounded-3xl p-4 sm:p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-xs">
          {/* Deck Piles */}
          <div className="flex items-center gap-4">
            {/* Draw Deck */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-blue-500/50 bg-gradient-to-br from-blue-950 to-indigo-950 flex flex-col items-center justify-center text-center shadow-lg relative">
                <span className="text-2xl mb-1">🎴</span>
                <span className="text-xs font-mono font-bold text-blue-300">
                  {gameState.deck.length}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Draw Pile</span>
              </div>
            </div>

            {/* Discard / Action Center Pile */}
            <div className="flex flex-col items-center">
              {gameState.discardPile.length > 0 ? (
                <div className="relative">
                  <DealCardView
                    card={gameState.discardPile[gameState.discardPile.length - 1]}
                    size="sm"
                    isPlayable={false}
                  />
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full shadow">
                    Discard ({gameState.discardPile.length})
                  </div>
                </div>
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 flex flex-col items-center justify-center text-center">
                  <span className="text-slate-600 text-xs italic">Empty Discard</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Spotlight Banner */}
          <div className="flex-1 text-center sm:text-left px-2">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles size={13} /> Action Log
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              {gameState.lastActionMessage || 'Game in progress'}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {gameState.logs[gameState.logs.length - 1]}
            </p>
          </div>

          {/* Turn status & End Turn button */}
          <div className="flex flex-col items-center sm:items-end gap-2">
            {isMyTurn ? (
              <button
                onClick={handleEndTurn}
                className={`px-6 py-3 font-black text-sm rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer ${
                  turnsAreUp
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 ring-4 ring-red-500/70 animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <span>{turnsAreUp ? 'Turns Up • End Turn' : 'End Turn'}</span>
                <ArrowRight size={16} className={turnsAreUp ? 'animate-bounce' : ''} />
              </button>
            ) : (
              <div className="px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{currentPlayer.name}'s turn...</span>
              </div>
            )}
          </div>
        </section>

        {/* Local Player Zone (Bank, Properties, and Interactive Hand) */}
        <section className="space-y-3">
          {/* Bank & Property Sets Header */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{localPlayer.token}</span>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>{localPlayer.name} (You)</span>
                    <span className="text-xs font-normal text-slate-400">
                      • {localPlayer.completedSetsCount} / 3 Full Sets
                    </span>
                  </h2>
                </div>
              </div>

              {/* Local Player Bank Summary */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Your Bank:</span>
                <span className="text-base font-mono font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-700/60 shadow-sm">
                  ${localPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M ({localPlayer.bank.length} cards)
                </span>
              </div>
            </div>

            {/* Local Player Property Sets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {ALL_PLAYABLE_COLORS.map((color) => {
                const set = localPlayer.propertySets[color];
                const config = COLOR_CONFIG[color];
                const hasCards = set && set.cards.length > 0;

                return (
                  <div
                    key={color}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[90px] ${
                      set.isComplete
                        ? `${config.bgClass} border-amber-400 ring-2 ring-amber-400/40 shadow-md`
                        : hasCards
                        ? 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase ${config.textClass}`}>
                        {config.name}
                      </span>
                      <span className="text-[10px] font-bold text-white font-mono">
                        {set.cards.length}/{config.requiredCount}
                      </span>
                    </div>

                    {/* Cards list in set */}
                    <div className="flex flex-wrap gap-1 my-1">
                      {set.cards.map((card) => {
                        const isWildcard = card.type === DealCardType.PROPERTY_WILD;
                        return (
                          <div
                            key={card.id}
                            onClick={() => {
                              if (isWildcard && isMyTurn) {
                                audio.playUiClick();
                                setWildcardToMove({ card, fromColor: color });
                              }
                            }}
                            className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold truncate max-w-full border flex items-center gap-1 ${
                              isWildcard
                                ? 'bg-indigo-950/90 border-indigo-500 cursor-pointer hover:border-amber-400'
                                : 'bg-slate-900/90 border-slate-700'
                            }`}
                            title={
                              isWildcard && isMyTurn
                                ? `${card.name} (Click to move to another color)`
                                : card.name
                            }
                          >
                            <span>{card.name}</span>
                            {isWildcard && isMyTurn && (
                              <span className="text-[8px] text-amber-300 font-mono">🔀</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span>{set.hasHouse ? '🏠' : ''}{set.hasHotel ? '🏨' : ''}</span>
                      {set.isComplete && (
                        <span className="font-extrabold text-amber-300 text-[9px] uppercase tracking-wider">
                          COMPLETE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Hand Area */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Your Hand ({localPlayer.hand.length} cards)</span>
                {isMyTurn && !turnsAreUp && (
                  <span className="text-amber-400 font-bold">• Pick a card to play!</span>
                )}
              </span>

              {/* Hand-Zone Turn & Plays Counter (Prominently visible when scrolled down) */}
              {isMyTurn && (
                <div
                  id="hand-turn-counter-banner"
                  className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold transition-all shadow-md ${
                    turnsAreUp
                      ? 'bg-red-950/80 border-red-500/80 text-red-300 ring-2 ring-red-400/60 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
                      : 'bg-slate-950/80 border-slate-700/80 text-slate-300'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                    {turnsAreUp ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                        <span className="text-red-400">Plays Left: 0 (Turns Up!)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Plays Left: {gameState.playsRemaining}/3</span>
                      </>
                    )}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((num) => (
                      <div
                        key={num}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                          turnsAreUp
                            ? 'bg-red-900/60 border border-red-500 text-red-400'
                            : num <= gameState.playsRemaining
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-600'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  {turnsAreUp && (
                    <button
                      onClick={handleEndTurn}
                      className="ml-1 px-2.5 py-0.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-[11px] uppercase transition-all shadow cursor-pointer active:scale-95 flex items-center gap-1"
                    >
                      <span>End Turn</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {localPlayer.hand.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 custom-scrollbar">
                {localPlayer.hand.map((card) => {
                  const isSelected = selectedHandCardId === card.id;

                  return (
                    <div key={card.id} className="relative shrink-0">
                      <DealCardView
                        card={card}
                        isSelected={isSelected}
                        showActionButtons={isSelected && isMyTurn}
                        onClick={() => {
                          if (isMyTurn) {
                            audio.playUiClick();
                            setSelectedHandCardId(isSelected ? null : card.id);
                          }
                        }}
                        onBank={() => handleBankCard(card.id)}
                        onPlayProperty={() => handlePlayProperty(card)}
                        onPlayAction={() => handlePlayAction(card)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 italic text-xs">
                Hand is empty! (You will draw 5 cards at the start of your next turn).
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Activity Logs Slide-over Drawer */}
      <AnimatePresence>
        {showLogsDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-5 flex flex-col h-full shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ScrollText className="text-amber-400" /> Match Activity History
                </h3>
                <button
                  onClick={() => setShowLogsDrawer(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                {gameState.logs.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300">
                    {log}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        defaultTab="deal"
      />

      {/* Action Target & Debt Resolution Modal */}
      <DealActionModal
        gameState={gameState}
        localPlayer={localPlayer}
        pendingCardToPlay={pendingCardForActionModal}
        onCancelCardPlay={() => setPendingCardForActionModal(null)}
        onResolveJustSayNo={(useNo) => {
          setGameState((prev) => respondWithJustSayNo(prev, localPlayer.id, useNo));
        }}
        onPayDebt={(bankIds, propCards) => {
          audio.playBuy();
          setGameState((prev) => payDebtWithCards(prev, localPlayer.id, bankIds, propCards));
        }}
        onDiscard={(cardId) => {
          audio.playUiClick();
          setGameState((prev) => discardCardFromHand(prev, cardId));
        }}
        onSelectActionTargets={handleActionModalTargets}
      />

      {/* Reassign Wildcard Color Modal */}
      {wildcardToMove && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="text-indigo-400" /> Shift Wildcard Color
            </h3>
            <p className="text-xs text-slate-300">
              In 1poly Cards, you can move wildcards between valid color sets on your turn freely (costs 0 plays):
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(wildcardToMove.card.colors || ALL_PLAYABLE_COLORS)
                .filter((c) => c !== wildcardToMove.fromColor)
                .map((col) => (
                  <button
                    key={col}
                    onClick={() => handleMoveWildcardColor(col)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${COLOR_CONFIG[col].bgClass} border-slate-700 hover:border-white hover:scale-102`}
                  >
                    <span className="text-xs font-black uppercase text-white">
                      {COLOR_CONFIG[col].name}
                    </span>
                    <span className="text-[11px] font-bold text-white/90 mt-1">
                      Set has {localPlayer.propertySets[col]?.cards.length || 0}/{COLOR_CONFIG[col].requiredCount}
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWildcardToMove(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState.phase === DealGamePhase.GAME_OVER && (
        <DealGameOver
          winner={gameState.winner}
          onRestart={handleRestart}
          onSwitchToClassic={onSwitchToClassic}
        />
      )}
    </div>
  );
};
