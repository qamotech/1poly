import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DealGameState,
  DealCard,
  DealColor,
  DealPlayer,
  DealActionName,
  DealCardType,
} from '../../deal/dealTypes';
import { COLOR_CONFIG, ALL_PLAYABLE_COLORS } from '../../deal/dealCards';
import { DealCardView } from './DealCardView';
import { audio } from '../../audio';
import { Shield, Swords, DollarSign, Trash2, ArrowRightLeft, Sparkles, Check, X, Home } from 'lucide-react';

interface DealActionModalProps {
  gameState: DealGameState;
  localPlayer: DealPlayer;
  onResolveJustSayNo: (useJustSayNo: boolean) => void;
  onPayDebt: (selectedBankIds: string[], selectedPropertyCards: { color: DealColor; cardId: string }[]) => void;
  onDiscard: (cardId: string) => void;
  onSelectActionTargets: (payload: {
    targetPlayerId?: string;
    targetColor?: DealColor;
    targetCardId?: string;
    swapMyCardId?: string;
    isDoubled?: boolean;
  }) => void;
  pendingCardToPlay: DealCard | null;
  onCancelCardPlay: () => void;
}

export const DealActionModal: React.FC<DealActionModalProps> = ({
  gameState,
  localPlayer,
  onResolveJustSayNo,
  onPayDebt,
  onDiscard,
  onSelectActionTargets,
  pendingCardToPlay,
  onCancelCardPlay,
}) => {
  // 1. Debt Payment Selection state
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [selectedPropCards, setSelectedPropCards] = useState<{ color: DealColor; cardId: string }[]>([]);

  // 2. Target Selection state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<DealColor | ''>('');
  const [selectedTargetCardId, setSelectedTargetCardId] = useState<string>('');
  const [selectedMySwapCardId, setSelectedMySwapCardId] = useState<string>('');
  const [isDoubledRent, setIsDoubledRent] = useState<boolean>(false);

  const pending = gameState.pendingAction;
  const opponents = gameState.players.filter((p) => p.id !== localPlayer.id);

  // ----------------------------------------------------
  // SCENARIO 1: Just Say No Reaction Prompt
  // ----------------------------------------------------
  const isAwaitingJustSayNo =
    gameState.phase === 'AWAITING_JUST_SAY_NO' &&
    pending &&
    (pending.pendingPaymentPlayerIds.includes(localPlayer.id) ||
      pending.targetPlayerId === localPlayer.id ||
      (pending.lastJustSayNoPlayerId && localPlayer.id === pending.sourcePlayerId));

  const hasJustSayNoCard = localPlayer.hand.some((c) => c.actionName === DealActionName.JUST_SAY_NO);

  if (isAwaitingJustSayNo) {
    const attacker = gameState.players.find((p) => p.id === pending.sourcePlayerId);

    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center relative"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center mx-auto text-2xl shadow-inner">
            <Shield size={32} />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Incoming Action Attack!</span>
            <h3 className="text-xl font-black text-white mt-1">
              {attacker?.name} played <span className="text-amber-400">{pending.card.name}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {pending.card.description}
            </p>
          </div>

          {hasJustSayNoCard ? (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
              ✨ You hold a <strong>Just Say No</strong> card in hand! You can block this attack.
            </div>
          ) : (
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-400">
              You do not have a Just Say No card. Press Accept to proceed.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                audio.playUiClick();
                onResolveJustSayNo(false);
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Accept Action
            </button>
            {hasJustSayNoCard && (
              <button
                onClick={() => {
                  audio.playUiClick();
                  onResolveJustSayNo(true);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Shield size={16} /> JUST SAY NO!
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCENARIO 2: Debt Payment Screen
  // ----------------------------------------------------
  const isAwaitingPayment =
    gameState.phase === 'AWAITING_PAYMENT' &&
    pending &&
    pending.pendingPaymentPlayerIds.includes(localPlayer.id);

  if (isAwaitingPayment) {
    const amountOwed = pending.amountOwedByPlayer[localPlayer.id] || 0;
    const attacker = gameState.players.find((p) => p.id === pending.sourcePlayerId);

    // Calculate current selected value
    const selectedBankValue = localPlayer.bank
      .filter((c) => selectedBankIds.includes(c.id))
      .reduce((sum, c) => sum + c.value, 0);

    const selectedPropValue = selectedPropCards.reduce((sum, item) => {
      const card = localPlayer.propertySets[item.color]?.cards.find((c) => c.id === item.cardId);
      return sum + (card ? card.value : 0);
    }, 0);

    const totalSelectedValue = selectedBankValue + selectedPropValue;

    // Check if player has enough total assets in play
    const totalAssetsInPlay =
      localPlayer.bank.reduce((s, c) => s + c.value, 0) +
      ALL_PLAYABLE_COLORS.reduce(
        (s, col) => s + (localPlayer.propertySets[col]?.cards.reduce((sum, c) => sum + c.value, 0) || 0),
        0
      );

    const isSufficientPayment = totalSelectedValue >= amountOwed || totalSelectedValue >= totalAssetsInPlay;

    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border-2 border-red-500/80 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">Payment Required</span>
              <h3 className="text-xl font-black text-white">
                You owe <span className="text-emerald-400">${amountOwed}M</span> to {attacker?.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Selected Payment:</span>
              <span className={`text-lg font-mono font-bold ${totalSelectedValue >= amountOwed ? 'text-emerald-400' : 'text-amber-400'}`}>
                ${totalSelectedValue}M / ${amountOwed}M
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Select cards from your <strong>Bank</strong> or <strong>Property Collection</strong> to satisfy your debt. No change is given.
          </p>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {/* Bank Cards Picker */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <DollarSign size={14} /> Your Bank (${localPlayer.bank.reduce((s, c) => s + c.value, 0)}M available)
              </h4>
              {localPlayer.bank.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {localPlayer.bank.map((card) => {
                    const isSelected = selectedBankIds.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          audio.playUiClick();
                          setSelectedBankIds((prev) =>
                            isSelected ? prev.filter((id) => id !== card.id) : [...prev, card.id]
                          );
                        }}
                      >
                        <DealCardView card={card} size="sm" isSelected={isSelected} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No cards in bank.</p>
              )}
            </div>

            {/* Property Cards Picker */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                Your Properties in Play
              </h4>
              <div className="flex flex-wrap gap-2">
                {ALL_PLAYABLE_COLORS.flatMap((color) => {
                  const set = localPlayer.propertySets[color];
                  return set.cards.map((card) => {
                    const isSelected = selectedPropCards.some((item) => item.cardId === card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          audio.playUiClick();
                          setSelectedPropCards((prev) =>
                            isSelected
                              ? prev.filter((item) => item.cardId !== card.id)
                              : [...prev, { color, cardId: card.id }]
                          );
                        }}
                      >
                        <DealCardView card={card} size="sm" isSelected={isSelected} />
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                audio.playUiClick();
                onPayDebt(selectedBankIds, selectedPropCards);
              }}
              disabled={!isSufficientPayment && totalAssetsInPlay > 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} /> Confirm Payment (${totalSelectedValue}M)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCENARIO 3: Discard Down to 7 Screen
  // ----------------------------------------------------
  const isAwaitingDiscard = gameState.phase === 'AWAITING_DISCARD' && gameState.players[gameState.currentPlayerIndex]?.id === localPlayer.id;

  if (isAwaitingDiscard) {
    const excess = localPlayer.hand.length - 7;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Hand Limit Exceeded</h3>
              <p className="text-xs text-slate-300">
                You have {localPlayer.hand.length} cards. Discard <strong>{excess} more</strong> card(s) to end your turn.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1 custom-scrollbar">
            {localPlayer.hand.map((card) => (
              <div
                key={card.id}
                onClick={() => {
                  audio.playUiClick();
                  onDiscard(card.id);
                }}
              >
                <DealCardView card={card} size="sm" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCENARIO 4: Interactive Target Selection for Played Action Cards
  // (Deal Breaker, Sly Deal, Forced Deal, Rent, Wildcards)
  // ----------------------------------------------------
  if (pendingCardToPlay) {
    const card = pendingCardToPlay;

    // 1. DEAL BREAKER: Choose which opponent's complete set to steal
    if (card.actionName === DealActionName.DEAL_BREAKER) {
      const opponentsWithSets: { player: DealPlayer; color: DealColor }[] = [];
      opponents.forEach((opp) => {
        ALL_PLAYABLE_COLORS.forEach((col) => {
          if (opp.propertySets[col]?.isComplete) {
            opponentsWithSets.push({ player: opp, color: col });
          }
        });
      });

      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-red-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Swords className="text-red-500" /> Choose Complete Set to Steal
            </h3>
            <p className="text-xs text-slate-400">
              Select any opponent's full property set to steal into your collection:
            </p>

            {opponentsWithSets.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {opponentsWithSets.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      audio.playUiClick();
                      onSelectActionTargets({
                        targetPlayerId: item.player.id,
                        targetColor: item.color,
                      });
                    }}
                    className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.player.token}</span>
                      <span className="font-bold text-white text-sm">{item.player.name}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-xs font-bold text-white ${COLOR_CONFIG[item.color].bgClass}`}>
                      {COLOR_CONFIG[item.color].name} Set ({item.player.propertySets[item.color].cards.length} cards)
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-400 bg-amber-950/60 p-3 rounded-xl border border-amber-600/50">
                No opponents currently have a completed set! You can bank this card or wait.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 2. SLY DEAL: Steal single property
    if (card.actionName === DealActionName.SLY_DEAL) {
      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Swords className="text-amber-500" /> Choose Single Property to Steal
            </h3>
            <p className="text-xs text-slate-400">
              Pick an opponent and one of their uncompleted property cards:
            </p>

            <div className="max-h-72 overflow-y-auto space-y-4 custom-scrollbar pr-1">
              {opponents.map((opp) => (
                <div key={opp.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{opp.token}</span>
                    <span className="text-sm font-bold text-white">{opp.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PLAYABLE_COLORS.flatMap((color) => {
                      const set = opp.propertySets[color];
                      if (!set || set.isComplete) return [];
                      return set.cards.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            audio.playUiClick();
                            onSelectActionTargets({
                              targetPlayerId: opp.id,
                              targetColor: color,
                              targetCardId: c.id,
                            });
                          }}
                        >
                          <DealCardView card={c} size="sm" />
                        </div>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 3. FORCED DEAL: Swap a single property with an opponent
    if (card.actionName === DealActionName.FORCED_DEAL) {
      // Find my uncompleted properties
      const myIncompleteProps: { color: DealColor; card: DealCard }[] = [];
      ALL_PLAYABLE_COLORS.forEach((col) => {
        const set = localPlayer.propertySets[col];
        if (set && !set.isComplete) {
          set.cards.forEach((c) => myIncompleteProps.push({ color: col, card: c }));
        }
      });

      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="text-emerald-400" /> Forced Deal (Swap Properties)
            </h3>
            <p className="text-xs text-slate-400">
              Select one card to GIVE from your properties and one card to TAKE from an opponent (neither from complete sets):
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* 1. What you give */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  1. Choose Your Card to Give:
                </span>
                {myIncompleteProps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {myIncompleteProps.map((item) => (
                      <div
                        key={item.card.id}
                        onClick={() => {
                          audio.playUiClick();
                          setSelectedMySwapCardId(item.card.id);
                        }}
                      >
                        <DealCardView
                          card={item.card}
                          size="sm"
                          isSelected={selectedMySwapCardId === item.card.id}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-400 italic">
                    You have no properties in incomplete sets to trade!
                  </p>
                )}
              </div>

              {/* 2. What you take */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                  2. Choose Opponent Card to Take:
                </span>
                <div className="space-y-3">
                  {opponents.map((opp) => (
                    <div key={opp.id} className="border-t border-slate-800 pt-2 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{opp.token}</span>
                        <span className="text-xs font-bold text-white">{opp.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_PLAYABLE_COLORS.flatMap((color) => {
                          const set = opp.propertySets[color];
                          if (!set || set.isComplete) return [];
                          return set.cards.map((c) => {
                            const isSelected = selectedTargetCardId === c.id;
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  audio.playUiClick();
                                  setSelectedPlayerId(opp.id);
                                  setSelectedColor(color);
                                  setSelectedTargetCardId(c.id);
                                }}
                              >
                                <DealCardView card={c} size="sm" isSelected={isSelected} />
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedPlayerId && selectedColor && selectedTargetCardId && selectedMySwapCardId) {
                    audio.playUiClick();
                    onSelectActionTargets({
                      targetPlayerId: selectedPlayerId,
                      targetColor: selectedColor as DealColor,
                      targetCardId: selectedTargetCardId,
                      swapMyCardId: selectedMySwapCardId,
                    });
                  }
                }}
                disabled={!selectedPlayerId || !selectedColor || !selectedTargetCardId || !selectedMySwapCardId}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Check size={15} /> Execute Swap
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 4. DEBT COLLECTOR: Choose target opponent
    if (card.actionName === DealActionName.DEBT_COLLECTOR) {
      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <DollarSign className="text-amber-400" /> Debt Collector ($5M)
            </h3>
            <p className="text-xs text-slate-400">
              Demand $5M from any single player of your choice:
            </p>

            <div className="space-y-2">
              {opponents.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => {
                    audio.playUiClick();
                    onSelectActionTargets({ targetPlayerId: opp.id });
                  }}
                  className="w-full p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{opp.token}</span>
                    <div>
                      <span className="font-bold text-white text-sm block">{opp.name}</span>
                      <span className="text-[11px] text-slate-400">
                        Bank: ${opp.bank.reduce((s, c) => s + c.value, 0)}M
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs rounded-lg">
                    Demand $5M
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 5. BUILDING (House / Hotel): Choose complete color set to place on
    if (card.type === DealCardType.BUILDING) {
      const isHouse = card.actionName === DealActionName.HOUSE;
      const validSets: DealColor[] = ALL_PLAYABLE_COLORS.filter((col) => {
        const set = localPlayer.propertySets[col];
        if (!set || !set.isComplete) return false;
        if (col === DealColor.RAILROAD || col === DealColor.UTILITY) return false;
        if (isHouse) return !set.hasHouse;
        return set.hasHouse && !set.hasHotel;
      });

      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Home className="text-emerald-400" /> Place {isHouse ? 'House (+ $3M Rent)' : 'Hotel (+ $4M Rent)'}
            </h3>
            <p className="text-xs text-slate-400">
              {isHouse
                ? 'Select a completed color set (excluding Railroads & Utilities) to add a House:'
                : 'Select a completed color set that already has a House to upgrade to a Hotel:'}
            </p>

            {validSets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {validSets.map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      audio.playUiClick();
                      onSelectActionTargets({ targetColor: col });
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${COLOR_CONFIG[col].bgClass} border-amber-400 hover:scale-102`}
                  >
                    <span className="text-xs font-black uppercase text-white">
                      {COLOR_CONFIG[col].name}
                    </span>
                    <span className="text-xs font-bold text-white mt-1">
                      {localPlayer.propertySets[col].cards.length} Cards
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-400 bg-amber-950/60 p-3 rounded-xl border border-amber-600/50">
                {isHouse
                  ? 'You need a completed color set (with no house) to place a House.'
                  : 'You need a completed color set with a House already on it to place a Hotel.'}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 6. WILDCARD: Select which color set to place into
    if (card.type === DealCardType.PROPERTY_WILD) {
      const validColors = card.colors || ALL_PLAYABLE_COLORS;
      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-indigo-400" /> Choose Color for Wildcard
            </h3>
            <p className="text-xs text-slate-400">
              Select which color group to add this wildcard property to:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {validColors.map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    audio.playUiClick();
                    onSelectActionTargets({ targetColor: col });
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${COLOR_CONFIG[col].bgClass} border-slate-700 hover:border-white hover:scale-102`}
                >
                  <span className="text-xs font-black uppercase text-white">
                    {COLOR_CONFIG[col].name}
                  </span>
                  <span className="text-[11px] font-bold text-white/90 mt-1">
                    Currently: {localPlayer.propertySets[col]?.cards.length || 0}/{COLOR_CONFIG[col].requiredCount}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // 3. RENT: Choose target color and optional Double Rent
    if (card.type === DealCardType.RENT) {
      const validColors = card.colors || ALL_PLAYABLE_COLORS;
      const playableColors = validColors.filter((col) => (localPlayer.propertySets[col]?.cards.length || 0) > 0);
      const hasDoubleRentInHand = localPlayer.hand.some((c) => c.actionName === DealActionName.DOUBLE_THE_RENT);
      const isWildRent = card.colors?.length === ALL_PLAYABLE_COLORS.length;

      return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <DollarSign className="text-cyan-400" /> Charge Rent on Property Set
            </h3>
            <p className="text-xs text-slate-400">
              Choose which of your matching color groups to charge rent for:
            </p>

            {playableColors.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {playableColors.map((col) => {
                  const set = localPlayer.propertySets[col];
                  const rentVal = COLOR_CONFIG[col].rentValues[Math.min(set.cards.length, COLOR_CONFIG[col].requiredCount) - 1] || 0;
                  return (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedColor === col ? 'border-cyan-400 bg-cyan-950/50 scale-102' : 'border-slate-700 bg-slate-800/60'
                      }`}
                    >
                      <span className={`text-xs font-bold ${COLOR_CONFIG[col].textClass}`}>
                        {COLOR_CONFIG[col].name}
                      </span>
                      <span className="text-lg font-mono font-bold text-white mt-1">
                        ${rentVal}M Rent ({set.cards.length} cards)
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-amber-400 bg-amber-950/60 p-3 rounded-xl border border-amber-600/50">
                You do not own any properties matching this Rent card!
              </p>
            )}

            {/* If Wild Rent, select target player */}
            {isWildRent && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-slate-400 font-bold">Target Opponent:</span>
                <div className="flex flex-wrap gap-2">
                  {opponents.map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => setSelectedPlayerId(opp.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        selectedPlayerId === opp.id ? 'border-cyan-400 bg-cyan-950 text-cyan-200' : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>{opp.token}</span>
                      <span>{opp.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Double Rent Toggle */}
            {hasDoubleRentInHand && (
              <label className="flex items-center gap-2 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDoubledRent}
                  onChange={(e) => setIsDoubledRent(e.target.checked)}
                  className="rounded text-cyan-500"
                />
                <span className="text-xs font-bold text-amber-300">
                  🔥 Play "Double The Rent" together (2x Rent multiplier!)
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={onCancelCardPlay}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedColor) {
                    audio.playUiClick();
                    onSelectActionTargets({
                      targetColor: selectedColor as DealColor,
                      targetPlayerId: selectedPlayerId || undefined,
                      isDoubled: isDoubledRent,
                    });
                  }
                }}
                disabled={!selectedColor || (isWildRent && !selectedPlayerId)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Launch Rent!
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
  }

  return null;
};
