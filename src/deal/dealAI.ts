import {
  DealGameState,
  DealGamePhase,
  DealCardType,
  DealActionName,
  DealColor,
  DealPlayer,
} from './dealTypes';
import {
  playCardToBank,
  playCardToProperty,
  playActionCard,
  respondWithJustSayNo,
  payDebtWithCards,
  discardCardFromHand,
  endDealTurn,
} from './dealEngine';
import { ALL_PLAYABLE_COLORS, COLOR_CONFIG, calculateSetRent } from './dealCards';

export function processAIDealStep(state: DealGameState): DealGameState {
  if (state.phase === DealGamePhase.GAME_OVER) return state;

  // 1. Handle AI Just Say No response if prompted
  if (state.phase === DealGamePhase.AWAITING_JUST_SAY_NO && state.pendingAction) {
    const targetPlayer = state.players.find((p) =>
      state.pendingAction!.pendingPaymentPlayerIds.includes(p.id) ||
      p.id === state.pendingAction!.targetPlayerId ||
      (state.pendingAction!.lastJustSayNoPlayerId && p.id === state.pendingAction!.sourcePlayerId)
    );

    if (targetPlayer && targetPlayer.type === 'CPU') {
      const hasJustSayNo = targetPlayer.hand.some((c) => c.actionName === DealActionName.JUST_SAY_NO);
      // AI will almost always use Just Say No against high-threat actions
      const shouldPlay = hasJustSayNo;
      return respondWithJustSayNo(state, targetPlayer.id, shouldPlay);
    }
  }

  // 2. Handle AI Debt Payment if prompted
  if (state.phase === DealGamePhase.AWAITING_PAYMENT && state.pendingAction) {
    const payingPlayer = state.players.find(
      (p) => p.type === 'CPU' && state.pendingAction!.pendingPaymentPlayerIds.includes(p.id)
    );

    if (payingPlayer) {
      const amountOwed = state.pendingAction.amountOwedByPlayer[payingPlayer.id] || 0;
      return executeAIDebtPayment(state, payingPlayer, amountOwed);
    }
  }

  // 3. Handle AI Discard down to 7
  if (state.phase === DealGamePhase.AWAITING_DISCARD) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer && currentPlayer.type === 'CPU' && currentPlayer.hand.length > 7) {
      // Find lowest value card in hand
      const sortedHand = [...currentPlayer.hand].sort((a, b) => a.value - b.value);
      const cardToDiscard = sortedHand[0];
      return discardCardFromHand(state, cardToDiscard.id);
    }
  }

  // 4. Handle Normal AI Turn Play
  if (state.phase === DealGamePhase.PLAYING) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer && currentPlayer.type === 'CPU') {
      if (state.playsRemaining > 0 && currentPlayer.hand.length > 0) {
        return executeAICardPlay(state, currentPlayer);
      } else {
        // No plays remaining or empty hand -> End turn
        return endDealTurn(state);
      }
    }
  }

  return state;
}

function executeAICardPlay(state: DealGameState, ai: DealPlayer): DealGameState {
  const hand = ai.hand;

  // Priority 1: Play Pass Go to get more cards
  const passGoCard = hand.find((c) => c.actionName === DealActionName.PASS_GO);
  if (passGoCard) {
    return playActionCard(state, passGoCard.id);
  }

  // Priority 2: Steal a complete set with Deal Breaker
  const dealBreaker = hand.find((c) => c.actionName === DealActionName.DEAL_BREAKER);
  if (dealBreaker) {
    for (const opponent of state.players.filter((p) => p.id !== ai.id)) {
      for (const color of ALL_PLAYABLE_COLORS) {
        if (opponent.propertySets[color]?.isComplete) {
          return playActionCard(state, dealBreaker.id, {
            targetPlayerId: opponent.id,
            targetColor: color,
          });
        }
      }
    }
  }

  // Priority 3: Play House or Hotel on existing complete sets
  const houseCard = hand.find((c) => c.actionName === DealActionName.HOUSE);
  if (houseCard) {
    for (const color of ALL_PLAYABLE_COLORS) {
      const set = ai.propertySets[color];
      if (set?.isComplete && !set.hasHouse && color !== DealColor.RAILROAD && color !== DealColor.UTILITY) {
        return playCardToProperty(state, houseCard.id, color);
      }
    }
  }

  const hotelCard = hand.find((c) => c.actionName === DealActionName.HOTEL);
  if (hotelCard) {
    for (const color of ALL_PLAYABLE_COLORS) {
      const set = ai.propertySets[color];
      if (set?.isComplete && set.hasHouse && !set.hasHotel) {
        return playCardToProperty(state, hotelCard.id, color);
      }
    }
  }

  // Priority 4: Play property cards and wildcards to complete sets
  const propertyCards = hand.filter(
    (c) => c.type === DealCardType.PROPERTY || c.type === DealCardType.PROPERTY_WILD
  );

  if (propertyCards.length > 0) {
    // Sort property cards: prefer colors closest to completion
    propertyCards.sort((a, b) => {
      const colorA = a.color || a.colors?.[0] || DealColor.BROWN;
      const colorB = b.color || b.colors?.[0] || DealColor.BROWN;
      const countA = ai.propertySets[colorA]?.cards.length || 0;
      const countB = ai.propertySets[colorB]?.cards.length || 0;
      return countB - countA;
    });

    const chosenCard = propertyCards[0];
    let targetColor = chosenCard.color;

    if (chosenCard.type === DealCardType.PROPERTY_WILD) {
      // Find best color among wildcard colors
      const validColors = chosenCard.colors || ALL_PLAYABLE_COLORS;
      let bestColor = validColors[0];
      let maxProgress = -1;

      for (const col of validColors) {
        const set = ai.propertySets[col];
        if (set && !set.isComplete) {
          const progress = set.cards.length / COLOR_CONFIG[col].requiredCount;
          if (progress > maxProgress) {
            maxProgress = progress;
            bestColor = col;
          }
        }
      }
      targetColor = bestColor;
    }

    return playCardToProperty(state, chosenCard.id, targetColor);
  }

  // Priority 5: Play Sly Deal to grab missing property
  const slyDeal = hand.find((c) => c.actionName === DealActionName.SLY_DEAL);
  if (slyDeal) {
    for (const opponent of state.players.filter((p) => p.id !== ai.id)) {
      for (const color of ALL_PLAYABLE_COLORS) {
        const oppSet = opponent.propertySets[color];
        if (oppSet && !oppSet.isComplete && oppSet.cards.length > 0) {
          return playActionCard(state, slyDeal.id, {
            targetPlayerId: opponent.id,
            targetColor: color,
            targetCardId: oppSet.cards[0].id,
          });
        }
      }
    }
  }

  // Priority 6: Play Rent cards if holding decent sets
  const rentCard = hand.find((c) => c.type === DealCardType.RENT);
  if (rentCard) {
    const validColors = rentCard.colors || ALL_PLAYABLE_COLORS;
    let bestRentColor: DealColor | null = null;
    let highestRent = 0;

    for (const col of validColors) {
      const set = ai.propertySets[col];
      if (set && set.cards.length > 0) {
        const rent = calculateSetRent(set);
        if (rent > highestRent) {
          highestRent = rent;
          bestRentColor = col;
        }
      }
    }

    if (bestRentColor && highestRent >= 2) {
      const hasDoubleRent = hand.some((c) => c.actionName === DealActionName.DOUBLE_THE_RENT);
      return playActionCard(state, rentCard.id, {
        targetColor: bestRentColor,
        isDoubled: hasDoubleRent,
      });
    }
  }

  // Priority 7: Play Debt Collector or Birthday
  const debtCard = hand.find(
    (c) => c.actionName === DealActionName.DEBT_COLLECTOR || c.actionName === DealActionName.ITS_MY_BIRTHDAY
  );
  if (debtCard) {
    const richestOpponent = state.players
      .filter((p) => p.id !== ai.id)
      .sort((a, b) => (b.bank.reduce((s, c) => s + c.value, 0)) - (a.bank.reduce((s, c) => s + c.value, 0)))[0];

    return playActionCard(state, debtCard.id, {
      targetPlayerId: richestOpponent?.id,
    });
  }

  // Priority 8: Bank Money or spare action cards
  const bankableCard = hand.find(
    (c) => c.type === DealCardType.MONEY || (c.value > 0 && c.actionName !== DealActionName.JUST_SAY_NO)
  );
  if (bankableCard) {
    return playCardToBank(state, bankableCard.id);
  }

  // Nothing useful to play -> end turn
  return endDealTurn(state);
}

function executeAIDebtPayment(state: DealGameState, ai: DealPlayer, amountOwed: number): DealGameState {
  const selectedBankIds: string[] = [];
  const selectedPropCards: { color: DealColor; cardId: string }[] = [];
  let collectedAmount = 0;

  // 1. Pay with small bank cards first
  const sortedBank = [...ai.bank].sort((a, b) => a.value - b.value);
  for (const card of sortedBank) {
    if (collectedAmount >= amountOwed) break;
    selectedBankIds.push(card.id);
    collectedAmount += card.value;
  }

  // 2. If bank wasn't enough, pay with properties from incomplete sets
  if (collectedAmount < amountOwed) {
    for (const color of ALL_PLAYABLE_COLORS) {
      if (collectedAmount >= amountOwed) break;
      const set = ai.propertySets[color];
      if (set && !set.isComplete && set.cards.length > 0) {
        for (const prop of set.cards) {
          if (collectedAmount >= amountOwed) break;
          selectedPropCards.push({ color, cardId: prop.id });
          collectedAmount += prop.value;
        }
      }
    }
  }

  // 3. If still not enough, sacrifice complete set properties if necessary
  if (collectedAmount < amountOwed) {
    for (const color of ALL_PLAYABLE_COLORS) {
      if (collectedAmount >= amountOwed) break;
      const set = ai.propertySets[color];
      if (set && set.cards.length > 0) {
        for (const prop of set.cards) {
          if (collectedAmount >= amountOwed) break;
          selectedPropCards.push({ color, cardId: prop.id });
          collectedAmount += prop.value;
        }
      }
    }
  }

  return payDebtWithCards(state, ai.id, selectedBankIds, selectedPropCards);
}
