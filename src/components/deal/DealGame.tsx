import React, { useState, useEffect, useRef } from 'react';
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
import { AnimatedMoney, CoinBurst } from '../Fx';

const FX_PLAYER_HUES = ['#f59e0b', '#38bdf8', '#e879f9', '#34d399', '#fb7185', '#a78bfa'];

// C16 — classify a log line for its icon chip (spotlight ticker + drawer).
const fxLogMeta = (log: string): string => {
  const s = log.toLowerCase();
  if (s.includes('won') || s.includes('wins')) return '🏆';
  if (s.includes('stole') || s.includes('steal') || s.includes('sly')) return '🥷';
  if (s.includes('rent')) return '💸';
  if (s.includes('complete') || s.includes('full set')) return '🎉';
  if (s.includes('bank')) return '🏦';
  if (s.includes('paid') || s.includes('pay')) return '💰';
  if (s.includes('drew') || s.includes('draw')) return '🎴';
  if (s.includes('house') || s.includes('hotel')) return '🏠';
  if (s.includes('discard')) return '🗑️';
  return '✨';
};
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

/** Actions a remote (multiplayer) client can ask the server to apply. */
export type DealRemoteAction =
  | { type: 'bank'; cardId: string }
  | { type: 'property'; cardId: string; targetColor?: DealColor }
  | {
      type: 'action';
      cardId: string;
      payload?: {
        targetPlayerId?: string;
        targetColor?: DealColor;
        targetCardId?: string;
        swapMyCardId?: string;
        isDoubled?: boolean;
      };
    }
  | { type: 'move_wildcard'; cardId: string; fromColor: DealColor; toColor: DealColor }
  | { type: 'just_say_no'; useNo: boolean }
  | { type: 'pay_debt'; bankCardIds: string[]; propertyCards: { color: DealColor; cardId: string }[] }
  | { type: 'discard'; cardId: string }
  | { type: 'end_turn' }
  | { type: 'restart' }
  | { type: 'end_match' };

interface DealGameProps {
  initialPlayers: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>;
  onBackToLobby: () => void;
  onSwitchToClassic: () => void;
  /**
   * Multiplayer room mode: the server owns the state (this client receives
   * a redacted view — other hands are stubs) and every move is sent as an
   * action for the server to referee. Absent = solo vs local AI, unchanged.
   */
  remote?: {
    state: DealGameState;
    myPlayerId: string | null;
    isHost: boolean;
    onAction: (action: DealRemoteAction) => void;
  };
}

export const DealGame: React.FC<DealGameProps> = ({
  initialPlayers,
  onBackToLobby,
  onSwitchToClassic,
  remote,
}) => {
  // Solo mode owns its state locally; remote mode renders the server's view.
  const [localState, setLocalState] = useState<DealGameState>(() => {
    return createInitialDealGame(initialPlayers);
  });
  const gameState = remote ? remote.state : localState;
  const setGameState = (updater: (prev: DealGameState) => DealGameState) => {
    if (!remote) setLocalState(updater);
  };

  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [pendingCardForActionModal, setPendingCardForActionModal] = useState<DealCard | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  // Reflects the shared audio engine's mute state (which is remembered
  // across visits) — the header toggle below drives both.
  const [isMuted, setIsMuted] = useState<boolean>(() => audio.isMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
  };
  const [screenFlash, setScreenFlash] = useState(false);

  // Wildcard reassignment modal state
  const [wildcardToMove, setWildcardToMove] = useState<{ card: DealCard; fromColor: DealColor } | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  // Solo: the (single) human player. Remote: my seat's player — or nobody,
  // when I'm spectating a match I have no seat in.
  const remotePlayer = remote
    ? gameState.players.find((p) => p.id === remote.myPlayerId) ?? null
    : null;
  const spectating = !!remote && !remotePlayer;
  const localPlayer =
    remotePlayer || gameState.players.find((p) => p.type === 'USER') || gameState.players[0];
  const isMyTurn =
    !spectating && currentPlayer?.id === localPlayer?.id && gameState.phase === DealGamePhase.PLAYING;
  const turnsAreUp = isMyTurn && gameState.playsRemaining === 0;

  // R3-15 — remember the newest hand card so it can flip in (draws only,
  // not the initial deal).
  const prevHandLenRef = useRef(localPlayer.hand.length);
  const [freshCardId, setFreshCardId] = useState<string | null>(null);
  useEffect(() => {
    const len = localPlayer.hand.length;
    if (len > prevHandLenRef.current) {
      setFreshCardId(localPlayer.hand[len - 1]?.id ?? null);
      const t = setTimeout(() => setFreshCardId(null), 650);
      prevHandLenRef.current = len;
      return () => clearTimeout(t);
    }
    prevHandLenRef.current = len;
  }, [localPlayer.hand]);

  // C16 — deck riffle: bump the shuffle key when the deck jumps back up
  // (a reshuffle), so the draw pile replays its riffle animation. The key
  // starts at 1 so the pile also riffles once on match start.
  const prevDeckLenRef = useRef(gameState.deck.length);
  const [shuffleKey, setShuffleKey] = useState(1);
  useEffect(() => {
    const len = gameState.deck.length;
    if (len - prevDeckLenRef.current > 3) setShuffleKey((k) => k + 1);
    prevDeckLenRef.current = len;
  }, [gameState.deck.length]);

  // C16 — YOUR TURN sweep across the table when your turn begins.
  const prevMyTurnRef = useRef(false);
  const [showTurnSweep, setShowTurnSweep] = useState(false);
  useEffect(() => {
    if (isMyTurn && !prevMyTurnRef.current) {
      setShowTurnSweep(true);
      const t = setTimeout(() => setShowTurnSweep(false), 1400);
      prevMyTurnRef.current = isMyTurn;
      return () => clearTimeout(t);
    }
    prevMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // Flash screen effect when turn plays reach 0.
  // The not-turnsAreUp branch MUST clear the flash: ending the turn inside
  // the 900ms window runs this effect's cleanup, which used to cancel the
  // off-timer and strand the red overlay on screen into the next turn.
  useEffect(() => {
    if (!turnsAreUp) {
      setScreenFlash(false);
      return;
    }
    setScreenFlash(true);
    const timer = setTimeout(() => {
      setScreenFlash(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [turnsAreUp]);

  // AI Turn automation loop (solo only — in remote matches the server
  // drives CPUs and empty seats)
  useEffect(() => {
    if (remote) return;
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

  // Handlers for Human Player — solo applies the engine locally; remote
  // sends the same move to the server, which referees and broadcasts back.
  const handleBankCard = (cardId: string) => {
    audio.playBuy();
    if (remote) remote.onAction({ type: 'bank', cardId });
    else setGameState((prev) => playCardToBank(prev, cardId));
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
    if (remote) remote.onAction({ type: 'property', cardId: card.id, targetColor });
    else setGameState((prev) => playCardToProperty(prev, card.id, targetColor));
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
      if (remote) remote.onAction({ type: 'action', cardId: card.id });
      else setGameState((prev) => playActionCard(prev, card.id));
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
      if (remote) remote.onAction({ type: 'property', cardId: card.id, targetColor: payload.targetColor });
      else setGameState((prev) => playCardToProperty(prev, card.id, payload.targetColor));
    } else {
      audio.playDice();
      if (remote) remote.onAction({ type: 'action', cardId: card.id, payload });
      else setGameState((prev) => playActionCard(prev, card.id, payload));
    }
    setPendingCardForActionModal(null);
  };

  const handleMoveWildcardColor = (toColor: DealColor) => {
    if (!wildcardToMove) return;
    audio.playUiClick();
    if (remote) {
      remote.onAction({
        type: 'move_wildcard',
        cardId: wildcardToMove.card.id,
        fromColor: wildcardToMove.fromColor,
        toColor,
      });
    } else {
      setGameState((prev) =>
        moveWildcard(prev, wildcardToMove.card.id, wildcardToMove.fromColor, toColor)
      );
    }
    setWildcardToMove(null);
  };

  const handleEndTurn = () => {
    audio.playUiClick();
    if (remote) remote.onAction({ type: 'end_turn' });
    else setGameState((prev) => endDealTurn(prev));
    setSelectedHandCardId(null);
  };

  const handleRestart = () => {
    audio.playUiClick();
    if (remote) {
      if (remote.isHost) remote.onAction({ type: 'restart' });
    } else {
      setLocalState(createInitialDealGame(initialPlayers));
    }
    setSelectedHandCardId(null);
    setPendingCardForActionModal(null);
  };

  return (
    <div className="flex flex-col h-dvh bg-slate-950 fx-aura-bg fx-view-in text-slate-100 select-none overflow-hidden font-sans relative">
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
      <header className="shrink-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-3 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl fx-joker-wobble">🃏</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider fx-shimmer-text uppercase">
                  1poly Cards
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 border border-blue-600 fx-fast-badge">
                  Fast Cards
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="fx-turn-label">Turn <span key={gameState.turnNumber} className="fx-turn-num">{gameState.turnNumber}</span></span>
                <span>•</span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/60 ring-1 ring-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse fx-turn-dot" />
                  <span className="text-xs fx-turn-token">{currentPlayer.token}</span>
                  <strong className="text-emerald-200 font-bold fx-turn-name">{currentPlayer.name}</strong>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold fx-turn-bank">${currentPlayer.bankValue}M</span>
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
          <span className={`text-xs font-bold fx-plays-pill ${turnsAreUp ? 'text-red-400 font-black' : 'text-slate-400'}`}>
            {turnsAreUp ? 'Turns Up!' : 'Plays Left:'}
          </span>
          <div key={gameState.playsRemaining} className="flex gap-1.5">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black fx-pip-pop ${
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
            onClick={handleToggleMute}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX size={16} className="fx-volume-glow" /> : <Volume2 size={16} className="fx-volume-glow" />}
          </button>
          <button
            onClick={() => {
              audio.playUiClick();
              setShowRulesModal(true);
            }}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Deal & Classic Rules"
          >
            <BookOpen size={16} className="fx-rules-glow" />
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
            <ScrollText size={16} className="fx-logs-glow" />
          </button>

          <button
            onClick={onSwitchToClassic}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch to Classic Board 1poly"
          >
            <Layers size={16} className="fx-classic-glow" />
            <span className="hidden lg:inline">Classic 1poly</span>
          </button>

          {(!remote || remote.isHost) && (
            <button
              onClick={handleRestart}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Restart Deal Match"
            >
              <RefreshCw size={16} className="fx-restart-glow" />
            </button>
          )}

          {remote && remote.isHost && (
            <button
              onClick={() => {
                audio.playUiClick();
                if (window.confirm('End this Cards match for everyone?')) {
                  remote.onAction({ type: 'end_match' });
                }
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-red-200 rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="End Cards match for everyone (host)"
            >
              <Home size={16} />
            </button>
          )}
        </div>
      </header>

      {/* C16 — Sets race bar: first to 3 full sets wins the match */}
      <div className="fx-race w-full max-w-7xl mx-auto px-3 sm:px-5 mt-1.5" aria-hidden="true">
        <div className="fx-race-track">
          <div
            className="fx-race-fill"
            style={{ width: `${(Math.max(0, ...gameState.players.map((p) => p.completedSetsCount)) / 3) * 100}%` }}
          />
        </div>
        {gameState.players.map((p) => (
          <span
            key={p.id}
            className="fx-race-marker fx-race-marker-bob"
            style={{ left: `${2 + (p.completedSetsCount / 3) * 94}%` }}
            title={`${p.name}: ${p.completedSetsCount}/3 sets`}
          >
            {p.token}
          </span>
        ))}
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] z-[1] fx-flag-wave">🏁</span>
      </div>

      {/* Main Playing Arena — the middle region scrolls internally only when it
          truly can't fit; the hand dock at the bottom never scrolls away */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto flex flex-col gap-2 p-2 sm:p-4">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-0.5">
        {/* Opponents Area (Top Row) */}
        <section className="flex flex-col gap-2">
          {gameState.players
            .filter((p) => p.id !== localPlayer.id)
            .map((opponent, opponentIdx) => {
              const isOpponentTurn = currentPlayer.id === opponent.id;
              const totalBank = opponent.bank.reduce((sum, c) => sum + c.value, 0);

              return (
                <div
                  key={opponent.id}
                  className={`bg-slate-900/90 rounded-xl p-2 sm:p-3 border transition-all ${
                    isOpponentTurn
                      ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] fx-thinking-breathe'
                      : 'border-slate-800'
                  }`}
                  style={isOpponentTurn ? undefined : { boxShadow: `0 0 16px ${FX_PLAYER_HUES[opponentIdx % FX_PLAYER_HUES.length]}33, inset 0 0 0 1px ${FX_PLAYER_HUES[opponentIdx % FX_PLAYER_HUES.length]}44` }}
                >
                  {/* Opponent Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl fx-opp-token" style={{ animationDelay: `${opponentIdx * 0.35}s` }}>{opponent.token}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-sm fx-opp-name">{opponent.name}</span>
                          {opponent.type === 'CPU' ? (
                            <Bot size={13} className="text-blue-400 fx-opp-type" />
                          ) : (
                            <User size={13} className="text-emerald-400 fx-opp-type fx-opp-type-human" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 fx-opp-hand">
                          <span key={opponent.hand.length} className="fx-count-pop">{opponent.hand.length}</span> cards in hand
                        </span>
                        <span className="fx-fan" aria-hidden="true">
                          {Array.from({ length: Math.min(opponent.hand.length, 5) }).map((_, i, arr) => (
                            <i
                              key={i}
                              className="fx-fan-card fx-fan-sway"
                              style={{ transform: `rotate(${(i - (arr.length - 1) / 2) * 10}deg)` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Sets count badge */}
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border fx-opp-sets ${
                          opponent.completedSetsCount >= 2
                            ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                            : 'bg-slate-800 text-amber-300 border-slate-700'
                        }`}
                      >
                        {opponent.completedSetsCount}/3 Full Sets
                      </span>
                      {opponent.completedSetsCount > 0 && (
                        <span key={opponent.completedSetsCount} className="fx-fanfare-badge">🎉 SET!</span>
                      )}
                      {opponent.completedSetsCount >= 2 && (
                        <span className="fx-crown-bounce" title="Match point — one more set wins!">👑</span>
                      )}
                      <span className={`relative text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800 fx-opp-bank${totalBank >= 10 ? ' fx-bank-milestone' : ''}`}><AnimatedMoney value={totalBank} />M<CoinBurst amount={totalBank} /></span>
                    </div>
                  </div>

                  {/* Opponent Property Sets (only rendered once they hold cards —
                      an empty frame here was pure scroll height) */}
                  {ALL_PLAYABLE_COLORS.some((col) => (opponent.propertySets[col]?.cards.length ?? 0) > 0) && (
                  <div className="grid grid-cols-5 gap-1 mt-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                    {ALL_PLAYABLE_COLORS.map((col) => {
                      const set = opponent.propertySets[col];
                      if (!set || set.cards.length === 0) return null;
                      const config = COLOR_CONFIG[col];

                      return (
                        <div
                          key={col}
                          className={`relative p-1 rounded-md border flex flex-col items-center justify-between text-center transition-all ${
                            set.isComplete
                              ? `${config.bgClass} border-amber-400 ring-2 ring-amber-400/40 shadow-sm`
                              : set.cards.length === config.requiredCount - 1
                              ? 'bg-slate-900 fx-one-away'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                          style={{ boxShadow: `0 0 ${set.isComplete ? 14 : 9}px ${config.hex}${set.isComplete ? 'aa' : '55'}` }}
                        >
                          <span className="text-[9px] font-black uppercase text-white truncate max-w-full">
                            {config.name.slice(0, 5)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-200">
                            {set.cards.length}/{config.requiredCount}
                          </span>
                          {set.isComplete && (
                            <span key={`${col}:${set.cards.length}`} className="fx-set-burst" aria-hidden="true">✨</span>
                          )}
                          {set.hasHouse && <span className="text-[8px] text-emerald-300">🏠</span>}
                          {set.hasHotel && <span className="text-[8px] text-red-300">🏨</span>}
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
        </section>

        {/* Center Table Arena (Deck, Discard Pile & Action Announcement) */}
        <section className="bg-slate-900/60 rounded-2xl p-2.5 sm:p-4 border border-slate-800 flex flex-row flex-wrap items-center justify-between gap-2 sm:gap-4 relative overflow-hidden backdrop-blur-xs shrink-0">
          {showTurnSweep && (
            <div className="fx-turn-sweep" aria-hidden="true"><span>⚡ YOUR TURN ⚡</span></div>
          )}
          {gameState.lastActionMessage && (
            <span key={gameState.lastActionMessage + ':' + gameState.logs.length} className="fx-spotlight" aria-hidden="true" />
          )}
          {/* Deck Piles */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {/* Draw Deck */}
            <div className="flex flex-col items-center">
              <div key={shuffleKey} className={`w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-blue-500/50 bg-gradient-to-br from-blue-950 to-indigo-950 flex flex-col items-center justify-center text-center shadow-lg relative fx-riffle ${gameState.deck.length <= 10 ? 'fx-deck-low' : ''}`}>
                <span className="text-2xl mb-1 fx-deck-bob">🎴</span>
                <span key={gameState.deck.length} className={`text-xs font-mono font-bold fx-draw-pop ${gameState.deck.length <= 10 ? 'text-amber-300' : 'text-blue-300'}`}>
                  {gameState.deck.length}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 fx-draw-label">Draw Pile</span>
                {gameState.deck.length <= 10 && (
                  <span className="text-[8px] font-black text-amber-400 tracking-widest">LOW!</span>
                )}
              </div>
            </div>

            {/* Discard / Action Center Pile */}
            <div className="flex flex-col items-center">
              {gameState.discardPile.length > 0 ? (
                <div key={gameState.discardPile[gameState.discardPile.length - 1].id} className={`relative fx-slap fx-discard-flash ${gameState.discardPile[gameState.discardPile.length - 1].type === DealCardType.ACTION || gameState.discardPile[gameState.discardPile.length - 1].type === DealCardType.RENT ? 'fx-action-zoom' : ''}`}>
                  <span className="fx-stack-back" style={{ transform: 'translate(5px, 4px) rotate(2.5deg)' }} aria-hidden="true" />
                  <span className="fx-stack-back" style={{ transform: 'translate(2.5px, 2px) rotate(1.2deg)' }} aria-hidden="true" />
                  <DealCardView
                    card={gameState.discardPile[gameState.discardPile.length - 1]}
                    size="sm"
                    isPlayable={false}
                  />
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full shadow fx-discard-badge">
                    Discard ({gameState.discardPile.length})
                  </div>
                </div>
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 flex flex-col items-center justify-center text-center fx-empty-discard">
                  <span className="text-slate-600 text-xs italic fx-empty-label">Empty Discard</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Spotlight Banner */}
          <div className="flex-1 min-w-0 text-center sm:text-left px-1 sm:px-2">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-400 flex items-center justify-center sm:justify-start gap-1.5 fx-actionlog-glow">
              <Sparkles size={13} className="fx-sparkle-twinkle" /> Action Log
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5 fx-action-msg">
              {gameState.lastActionMessage || 'Game in progress'}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {gameState.logs.length > 0 && (
                <>
                  <span className="fx-log-chip">{fxLogMeta(gameState.logs[gameState.logs.length - 1])}</span>
                  {gameState.logs[gameState.logs.length - 1]}
                </>
              )}
            </p>
          </div>

          {/* Turn status & End Turn button — full-width row under the piles on
              phones so the wide "Turns Up" state never crowds the action log */}
          <div key={gameState.currentPlayerIndex} className="flex flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto fx-banner-in">
            {isMyTurn ? (
              <button
                onClick={handleEndTurn}
                className={`px-4 py-2.5 font-black text-sm rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  turnsAreUp
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 ring-4 ring-red-500/70 animate-pulse'
                    : 'fx-neon-btn'
                }`}
              >
                <span className="fx-endturn-label">{turnsAreUp ? 'Turns Up • End Turn' : 'End Turn'}</span>
                <ArrowRight size={16} className={turnsAreUp ? 'animate-bounce' : 'fx-endturn-arrow'} />
              </button>
            ) : (
              <div className="px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{currentPlayer.name}'s turn...</span>
              </div>
            )}
          </div>
        </section>

        {/* Local Player Zone (Bank & Property Sets; the hand lives in the dock below) */}
        <section>
          {/* Bank & Property Sets Header */}
          <div className="bg-slate-900/90 rounded-2xl p-2.5 sm:p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2 border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl fx-you-token">{localPlayer.token}</span>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-1.5">
                    <span className="fx-you-name">{localPlayer.name}{spectating ? '' : ' (You)'}</span>
                    <span className="text-xs font-normal text-slate-400 fx-sets-progress">
                      • {localPlayer.completedSetsCount} / 3 Full Sets
                    </span>
                    {localPlayer.completedSetsCount > 0 && (
                      <span key={localPlayer.completedSetsCount} className="fx-fanfare-badge">🎉 SET!</span>
                    )}
                    {localPlayer.completedSetsCount >= 2 && (
                      <span className="fx-crown-bounce" title="Match point — one more set wins!">👑</span>
                    )}
                  </h2>
                </div>
              </div>

              {/* Local Player Bank Summary */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 fx-bank-label">Your Bank:</span>
                <span className={`relative text-base font-mono font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-700/60 shadow-sm fx-bank-glow${localPlayer.bank.reduce((sum, c) => sum + c.value, 0) >= 10 ? ' fx-bank-milestone' : ''}`}><AnimatedMoney value={localPlayer.bank.reduce((sum, c) => sum + c.value, 0)} />M ({localPlayer.bank.length} cards)<CoinBurst amount={localPlayer.bank.reduce((sum, c) => sum + c.value, 0)} /></span>
              </div>
            </div>

            {/* Local Player Property Sets — 5-up on phones too (was 2-up: five tall rows) */}
            <div className="grid grid-cols-5 gap-1.5">
              {ALL_PLAYABLE_COLORS.map((color) => {
                const set = localPlayer.propertySets[color];
                const config = COLOR_CONFIG[color];
                const hasCards = set && set.cards.length > 0;

                return (
                  <div
                    key={color}
                    className={`relative p-1.5 rounded-lg border transition-all flex flex-col justify-between ${
                      set.isComplete
                        ? `${config.bgClass} border-amber-400 ring-2 ring-amber-400/40 shadow-md`
                        : hasCards
                        ? set.cards.length === config.requiredCount - 1
                          ? 'bg-slate-950 fx-one-away'
                          : 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                    style={hasCards ? { boxShadow: `0 0 ${set.isComplete ? 15 : 9}px ${config.hex}${set.isComplete ? 'aa' : '55'}` } : undefined}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-black uppercase truncate fx-set-name ${config.textClass}`}>
                        {config.name}
                      </span>
                      <span className="text-[10px] font-bold text-white font-mono fx-set-count">
                        {set.cards.length}/{config.requiredCount}
                      </span>
                    </div>
                    {set.isComplete && (
                      <span key={`${color}:${set.cards.length}`} className="fx-set-burst" aria-hidden="true">✨</span>
                    )}
                    {hasCards && (
                      <div className="fx-set-chip" style={{ background: `linear-gradient(90deg, ${config.hex}, ${config.hex}55)` }} aria-hidden="true" />
                    )}

                    {/* Cards list in set */}
                    <div className="flex flex-wrap gap-0.5 my-0.5">
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
        </section>
        </div>

        {/* Interactive Hand Dock — pinned below the table, always on screen */}
        <div className="shrink-0 bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-800 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="fx-hand-label">{spectating ? '👀 Spectating — hands are hidden' : <>Your Hand (<span key={localPlayer.hand.length} className="fx-hand-count">{localPlayer.hand.length} cards</span>)</>}</span>
                {!spectating && localPlayer.hand.length > 0 && (
                  <span className="fx-hand-value text-[10px] font-black font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/70 px-1.5 py-0.5 rounded-md">
                    <span className="fx-briefcase-bob">💼</span> <span key={localPlayer.hand.reduce((s, c) => s + c.value, 0)} className="fx-count-pop">${localPlayer.hand.reduce((s, c) => s + c.value, 0)}M</span>
                  </span>
                )}
                {isMyTurn && !turnsAreUp && (
                  <span className="text-amber-400 font-bold fx-pick-prompt">• Pick a card to play!</span>
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
                  {!turnsAreUp && <span className="fx-turn-arrow" aria-hidden="true">👇</span>}
                  <span className="text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                    {turnsAreUp ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                        <span className="text-red-400">Plays Left: 0 (Turns Up!)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 fx-plays-dot" />
                        <span className="fx-plays-label">Plays Left: {gameState.playsRemaining}/3</span>
                      </>
                    )}
                  </span>
                  <div key={gameState.playsRemaining} className="flex gap-1">
                    {[1, 2, 3].map((num) => (
                      <div
                        key={num}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black fx-pip-pop ${
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

            {spectating ? (
              <div className="py-4 text-center text-slate-400 italic text-xs">
                You're watching this match — claim a seat in the lobby to play in the next one!
              </div>
            ) : localPlayer.hand.length > 0 ? (
              <div className={`flex gap-2.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar rounded-xl ${localPlayer.hand.length <= 2 ? 'fx-low-hand' : ''} ${localPlayer.completedSetsCount >= 2 ? 'fx-gold-edge' : ''}`}>
                {localPlayer.hand.map((card, cardIdx) => {
                  const isSelected = selectedHandCardId === card.id;

                  return (
                    <div key={card.id} className={`relative shrink-0 rounded-xl fx-holo ${isSelected ? 'fx-selected-lift' : ''} ${card.id === freshCardId ? 'fx-flip-in' : 'fx-deal-in'}`} style={{ animationDelay: `${Math.min(cardIdx, 7) * 45}ms` }}>
                      {card.id === freshCardId && (
                        <span className="fx-new-ribbon" aria-hidden="true">✨ NEW</span>
                      )}
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
              <div className="py-4 text-center text-slate-500 italic text-xs">
                Hand is empty! (You will draw 5 cards at the start of your next turn).
              </div>
            )}
        </div>
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
                    <span className="fx-log-chip">{fxLogMeta(log)}</span>{log}
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

      {/* Action Target & Debt Resolution Modal (never for spectators) */}
      {!spectating && (
        <DealActionModal
          gameState={gameState}
          localPlayer={localPlayer}
          pendingCardToPlay={pendingCardForActionModal}
          onCancelCardPlay={() => setPendingCardForActionModal(null)}
          onResolveJustSayNo={(useNo) => {
            if (remote) remote.onAction({ type: 'just_say_no', useNo });
            else setGameState((prev) => respondWithJustSayNo(prev, localPlayer.id, useNo));
          }}
          onPayDebt={(bankIds, propCards) => {
            audio.playBuy();
            if (remote) remote.onAction({ type: 'pay_debt', bankCardIds: bankIds, propertyCards: propCards });
            else setGameState((prev) => payDebtWithCards(prev, localPlayer.id, bankIds, propCards));
          }}
          onDiscard={(cardId) => {
            audio.playUiClick();
            if (remote) remote.onAction({ type: 'discard', cardId });
            else setGameState((prev) => discardCardFromHand(prev, cardId));
          }}
          onSelectActionTargets={handleActionModalTargets}
        />
      )}

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
          canRestart={remote ? remote.isHost : true}
        />
      )}
    </div>
  );
};
