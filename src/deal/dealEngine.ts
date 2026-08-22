import {
  DealCard,
  DealCardType,
  DealColor,
  DealActionName,
  DealPlayer,
  DealPlayerId,
  DealGameState,
  DealGamePhase,
  PendingAction,
  PropertySet,
} from './dealTypes';
import {
  generateDealDeck,
  createEmptyPropertySets,
  ALL_PLAYABLE_COLORS,
  COLOR_CONFIG,
  calculateSetRent,
  recalculatePlayerPropertySets,
} from './dealCards';

export function createInitialDealGame(
  playersData: Array<{ id: string; name: string; type: 'USER' | 'CPU'; token: string }>
): DealGameState {
  let deck = generateDealDeck();

  const players: DealPlayer[] = playersData.map((pd) => {
    const hand: DealCard[] = deck.slice(0, 5);
    deck = deck.slice(5);

    return {
      id: pd.id,
      name: pd.name,
      type: pd.type,
      token: pd.token,
      hand,
      bank: [],
      propertySets: createEmptyPropertySets(),
      completedSetsCount: 0,
      stats: {
        cardsPlayed: 0,
        moneyBanked: 0,
        setsCompleted: 0,
        dealsBroken: 0,
        rentCollected: 0,
      },
    };
  });

  const state: DealGameState = {
    players,
    currentPlayerIndex: 0,
    phase: DealGamePhase.PLAYING,
    deck,
    discardPile: [],
    playsRemaining: 3,
    turnNumber: 1,
    pendingAction: null,
    winner: null,
    logs: ['🎮 Welcome to 1poly Cards! First player to collect 3 complete property sets wins!'],
    lastActionCard: null,
    lastActionMessage: null,
  };

  // Perform start-of-turn draw for player 0
  return startTurnForCurrentPlayer(state);
}

export function drawCards(state: DealGameState, count: number): { state: DealGameState; drawn: DealCard[] } {
  let currentDeck = [...state.deck];
  let discard = [...state.discardPile];

  // If deck doesn't have enough, shuffle discard pile back
  if (currentDeck.length < count) {
    if (discard.length > 0) {
      const reshuffled = [...discard].sort(() => Math.random() - 0.5);
      currentDeck = [...currentDeck, ...reshuffled];
      discard = [];
      state.logs.push('🔄 Reshuffled discard pile into the draw deck.');
    }
  }

  const drawn = currentDeck.slice(0, count);
  currentDeck = currentDeck.slice(count);

  return {
    state: {
      ...state,
      deck: currentDeck,
      discardPile: discard,
    },
    drawn,
  };
}

export function startTurnForCurrentPlayer(state: DealGameState): DealGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const drawCount = currentPlayer.hand.length === 0 ? 5 : 2;

  const { state: updatedDeckState, drawn } = drawCards(state, drawCount);

  const updatedPlayers = updatedDeckState.players.map((p, idx) => {
    if (idx === updatedDeckState.currentPlayerIndex) {
      return {
        ...p,
        hand: [...p.hand, ...drawn],
      };
    }
    return p;
  });

  const logs = [
    ...updatedDeckState.logs,
    `👉 ${currentPlayer.token} ${currentPlayer.name}'s turn (Drew ${drawn.length} cards. 3 plays left).`,
  ];

  return {
    ...updatedDeckState,
    players: updatedPlayers,
    phase: DealGamePhase.PLAYING,
    playsRemaining: 3,
    logs: logs.slice(-50),
    lastActionMessage: `${currentPlayer.name}'s turn`,
  };
}

export function playCardToBank(state: DealGameState, cardId: string): DealGameState {
  if (state.phase !== DealGamePhase.PLAYING || state.playsRemaining <= 0) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = currentPlayer.hand[cardIndex];
  if (card.value <= 0) return state; // Only cards with monetary value can be banked

  const updatedHand = currentPlayer.hand.filter((_, i) => i !== cardIndex);
  const updatedBank = [...currentPlayer.bank, card];

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        hand: updatedHand,
        bank: updatedBank,
        stats: {
          ...p.stats,
          cardsPlayed: p.stats.cardsPlayed + 1,
          moneyBanked: p.stats.moneyBanked + card.value,
        },
      };
    }
    return p;
  });

  const logs = [
    ...state.logs,
    `🏦 ${currentPlayer.name} banked ${card.name} ($${card.value}M). Plays left: ${state.playsRemaining - 1}`,
  ];

  const nextState: DealGameState = {
    ...state,
    players: updatedPlayers,
    playsRemaining: state.playsRemaining - 1,
    logs: logs.slice(-50),
    lastActionCard: card,
    lastActionMessage: `${currentPlayer.name} banked $${card.value}M`,
  };

  return checkWinOrAutoCompleteTurn(nextState);
}

export function playCardToProperty(
  state: DealGameState,
  cardId: string,
  targetColor?: DealColor
): DealGameState {
  if (state.phase !== DealGamePhase.PLAYING || state.playsRemaining <= 0) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = currentPlayer.hand[cardIndex];

  // Must be property, wildcard, or building
  if (
    card.type !== DealCardType.PROPERTY &&
    card.type !== DealCardType.PROPERTY_WILD &&
    card.type !== DealCardType.BUILDING
  ) {
    return state;
  }

  const updatedHand = currentPlayer.hand.filter((_, i) => i !== cardIndex);
  const updatedPropertySets = { ...currentPlayer.propertySets };

  // Handle House or Hotel
  if (card.type === DealCardType.BUILDING) {
    if (!targetColor) return state;
    const targetSet = updatedPropertySets[targetColor];
    if (!targetSet || !targetSet.isComplete) return state; // Full set required

    if (card.actionName === DealActionName.HOUSE) {
      if (targetSet.hasHouse || targetColor === DealColor.RAILROAD || targetColor === DealColor.UTILITY) {
        return state;
      }
      targetSet.hasHouse = true;
      targetSet.cards.push(card);
    } else if (card.actionName === DealActionName.HOTEL) {
      if (!targetSet.hasHouse || targetSet.hasHotel) return state;
      targetSet.hasHotel = true;
      targetSet.cards.push(card);
    }
  } else {
    // Normal property or wildcard
    let destColor = card.color;
    if (card.type === DealCardType.PROPERTY_WILD) {
      destColor = targetColor || card.currentSelectedColor || card.colors?.[0] || DealColor.BROWN;
      card.currentSelectedColor = destColor;
    }

    if (!destColor || !updatedPropertySets[destColor]) return state;

    updatedPropertySets[destColor] = {
      ...updatedPropertySets[destColor],
      cards: [...updatedPropertySets[destColor].cards, card],
    };
  }

  const completedSets = recalculatePlayerPropertySets({ propertySets: updatedPropertySets });

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        hand: updatedHand,
        propertySets: updatedPropertySets,
        completedSetsCount: completedSets,
        stats: {
          ...p.stats,
          cardsPlayed: p.stats.cardsPlayed + 1,
          setsCompleted: completedSets,
        },
      };
    }
    return p;
  });

  const logs = [
    ...state.logs,
    `🏠 ${currentPlayer.name} played ${card.name} to ${targetColor || card.color} set. Plays left: ${state.playsRemaining - 1}`,
  ];

  const nextState: DealGameState = {
    ...state,
    players: updatedPlayers,
    playsRemaining: state.playsRemaining - 1,
    logs: logs.slice(-50),
    lastActionCard: card,
    lastActionMessage: `${currentPlayer.name} added ${card.name}`,
  };

  return checkWinOrAutoCompleteTurn(nextState);
}

export function moveWildcard(
  state: DealGameState,
  cardId: string,
  fromColor: DealColor,
  toColor: DealColor
): DealGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const fromSet = currentPlayer.propertySets[fromColor];
  const toSet = currentPlayer.propertySets[toColor];

  if (!fromSet || !toSet) return state;

  const cardIndex = fromSet.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = fromSet.cards[cardIndex];
  if (card.type !== DealCardType.PROPERTY_WILD) return state;

  // Verify toColor is allowed
  if (card.colors && !card.colors.includes(toColor) && !card.colors.includes(DealColor.ANY)) {
    return state;
  }

  card.currentSelectedColor = toColor;
  const newFromCards = fromSet.cards.filter((_, i) => i !== cardIndex);
  const newToCards = [...toSet.cards, card];

  const updatedPropertySets = {
    ...currentPlayer.propertySets,
    [fromColor]: { ...fromSet, cards: newFromCards },
    [toColor]: { ...toSet, cards: newToCards },
  };

  const completedSets = recalculatePlayerPropertySets({ propertySets: updatedPropertySets });

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        propertySets: updatedPropertySets,
        completedSetsCount: completedSets,
      };
    }
    return p;
  });

  const logs = [
    ...state.logs,
    `🔀 ${currentPlayer.name} shifted wildcard ${card.name} from ${fromColor} to ${toColor}.`,
  ];

  return checkWinOrAutoCompleteTurn({
    ...state,
    players: updatedPlayers,
    logs: logs.slice(-50),
  });
}

export function playActionCard(
  state: DealGameState,
  cardId: string,
  payload?: {
    targetPlayerId?: DealPlayerId;
    targetColor?: DealColor;
    targetCardId?: string;
    swapMyCardId?: string;
    isDoubled?: boolean;
  }
): DealGameState {
  if (state.phase !== DealGamePhase.PLAYING || state.playsRemaining <= 0) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = currentPlayer.hand[cardIndex];
  const updatedHand = currentPlayer.hand.filter((_, i) => i !== cardIndex);

  // 1. Pass Go
  if (card.actionName === DealActionName.PASS_GO) {
    const { state: drewState, drawn } = drawCards(state, 2);

    const updatedPlayers = drewState.players.map((p, idx) => {
      if (idx === drewState.currentPlayerIndex) {
        return {
          ...p,
          hand: [...updatedHand, ...drawn],
          stats: { ...p.stats, cardsPlayed: p.stats.cardsPlayed + 1 },
        };
      }
      return p;
    });

    const logs = [
      ...drewState.logs,
      `🎯 ${currentPlayer.name} played Pass Go and drew 2 cards! Plays left: ${state.playsRemaining - 1}`,
    ];

    const nextState: DealGameState = {
      ...drewState,
      players: updatedPlayers,
      discardPile: [...drewState.discardPile, card],
      playsRemaining: state.playsRemaining - 1,
      logs: logs.slice(-50),
      lastActionCard: card,
      lastActionMessage: `${currentPlayer.name} played Pass Go`,
    };

    return checkWinOrAutoCompleteTurn(nextState);
  }

  // 2. Double The Rent alone (played alongside a rent card)
  if (card.actionName === DealActionName.DOUBLE_THE_RENT) {
    // If played standalone, just discard or bank
    return playCardToBank(state, cardId);
  }

  // Determine affected players
  let affectedPlayerIds: DealPlayerId[] = [];
  const otherPlayers = state.players.filter((p) => p.id !== currentPlayer.id);

  if (card.type === DealCardType.RENT) {
    const isWildRent = card.colors?.length === ALL_PLAYABLE_COLORS.length;
    if (isWildRent) {
      if (payload?.targetPlayerId) {
        affectedPlayerIds = [payload.targetPlayerId];
      } else if (otherPlayers.length > 0) {
        affectedPlayerIds = [otherPlayers[0].id];
      }
    } else {
      // Dual rent affects ALL opponents
      affectedPlayerIds = otherPlayers.map((p) => p.id);
    }
  } else if (card.actionName === DealActionName.ITS_MY_BIRTHDAY) {
    affectedPlayerIds = otherPlayers.map((p) => p.id);
  } else if (payload?.targetPlayerId) {
    affectedPlayerIds = [payload.targetPlayerId];
  } else if (otherPlayers.length > 0) {
    affectedPlayerIds = [otherPlayers[0].id];
  }

  // Calculate rent or debt amounts
  let baseAmount = 0;
  if (card.type === DealCardType.RENT && payload?.targetColor) {
    const set = currentPlayer.propertySets[payload.targetColor];
    if (set) {
      baseAmount = calculateSetRent(set);
    }
    if (payload.isDoubled) {
      baseAmount *= 2;
    }
  } else if (card.actionName === DealActionName.DEBT_COLLECTOR) {
    baseAmount = 5;
  } else if (card.actionName === DealActionName.ITS_MY_BIRTHDAY) {
    baseAmount = 2;
  }

  const amountOwedByPlayer: Record<DealPlayerId, number> = {};
  for (const pid of affectedPlayerIds) {
    amountOwedByPlayer[pid] = baseAmount;
  }

  const pendingAction: PendingAction = {
    sourcePlayerId: currentPlayer.id,
    card,
    targetPlayerId: payload?.targetPlayerId,
    targetColor: payload?.targetColor,
    targetCardId: payload?.targetCardId,
    swapMyCardId: payload?.swapMyCardId,
    rentAmount: baseAmount,
    isDoubled: payload?.isDoubled,
    affectedPlayerIds,
    pendingPaymentPlayerIds: affectedPlayerIds,
    amountOwedByPlayer,
    justSayNoResponses: {},
    chainCount: 0,
  };

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return {
        ...p,
        hand: updatedHand,
        stats: { ...p.stats, cardsPlayed: p.stats.cardsPlayed + 1 },
      };
    }
    return p;
  });

  const logs = [
    ...state.logs,
    `⚡ ${currentPlayer.name} launched ${card.name}! Plays left: ${state.playsRemaining - 1}`,
  ];

  // Check if any target has "Just Say No" in hand to allow counter reaction
  const hasJustSayNoTarget = affectedPlayerIds.some((pid) => {
    const target = state.players.find((p) => p.id === pid);
    return target && target.hand.some((c) => c.actionName === DealActionName.JUST_SAY_NO);
  });

  const nextPhase = hasJustSayNoTarget
    ? DealGamePhase.AWAITING_JUST_SAY_NO
    : baseAmount > 0
    ? DealGamePhase.AWAITING_PAYMENT
    : DealGamePhase.PLAYING;

  const nextState: DealGameState = {
    ...state,
    players: updatedPlayers,
    discardPile: [...state.discardPile, card],
    playsRemaining: state.playsRemaining - 1,
    pendingAction,
    phase: nextPhase,
    logs: logs.slice(-50),
    lastActionCard: card,
    lastActionMessage: `${currentPlayer.name} played ${card.name}`,
  };

  if (!hasJustSayNoTarget && baseAmount === 0) {
    // Immediate resolution for direct steal actions without debt
    return resolveStealOrSwapAction(nextState);
  }

  return checkWinOrAutoCompleteTurn(nextState);
}

export function respondWithJustSayNo(
  state: DealGameState,
  respondingPlayerId: DealPlayerId,
  playJustSayNo: boolean
): DealGameState {
  if (!state.pendingAction) return state;

  const pending = { ...state.pendingAction };
  const respondingPlayer = state.players.find((p) => p.id === respondingPlayerId);
  if (!respondingPlayer) return state;

  if (playJustSayNo) {
    const noCardIndex = respondingPlayer.hand.findIndex((c) => c.actionName === DealActionName.JUST_SAY_NO);
    if (noCardIndex === -1) return state;

    const noCard = respondingPlayer.hand[noCardIndex];
    const updatedHand = respondingPlayer.hand.filter((_, i) => i !== noCardIndex);

    const updatedPlayers = state.players.map((p) => {
      if (p.id === respondingPlayerId) {
        return { ...p, hand: updatedHand };
      }
      return p;
    });

    const logs = [
      ...state.logs,
      `🛑 ${respondingPlayer.token} ${respondingPlayer.name} shouted JUST SAY NO to block ${pending.card.name}!`,
    ];

    // Check if source player has a Just Say No to counter-counter!
    const sourcePlayer = updatedPlayers.find((p) => p.id === pending.sourcePlayerId);
    const sourceHasNo = sourcePlayer?.hand.some((c) => c.actionName === DealActionName.JUST_SAY_NO);

    pending.lastJustSayNoPlayerId = respondingPlayerId;
    pending.chainCount += 1;

    if (sourceHasNo) {
      return {
        ...state,
        players: updatedPlayers,
        discardPile: [...state.discardPile, noCard],
        pendingAction: pending,
        phase: DealGamePhase.AWAITING_JUST_SAY_NO,
        logs: logs.slice(-50),
      };
    } else {
      // Action is completely blocked for this player
      pending.pendingPaymentPlayerIds = pending.pendingPaymentPlayerIds.filter((id) => id !== respondingPlayerId);
      logs.push(`🛡️ ${respondingPlayer.name} was saved by Just Say No!`);

      if (pending.pendingPaymentPlayerIds.length === 0) {
        return {
          ...state,
          players: updatedPlayers,
          discardPile: [...state.discardPile, noCard],
          pendingAction: null,
          phase: DealGamePhase.PLAYING,
          logs: logs.slice(-50),
        };
      }
    }
  } else {
    // Player declined or passed Just Say No
    state.logs.push(`⚠️ ${respondingPlayer.name} accepted the action ${pending.card.name}.`);
  }

  // If debt owed, proceed to payment
  if (pending.rentAmount && pending.rentAmount > 0) {
    return {
      ...state,
      pendingAction: pending,
      phase: DealGamePhase.AWAITING_PAYMENT,
      logs: state.logs.slice(-50),
    };
  }

  // Otherwise resolve steal/swap
  return resolveStealOrSwapAction({
    ...state,
    pendingAction: pending,
  });
}

export function resolveStealOrSwapAction(state: DealGameState): DealGameState {
  if (!state.pendingAction) return state;
  const pending = state.pendingAction;
  const sourcePlayer = state.players.find((p) => p.id === pending.sourcePlayerId);
  const targetPlayer = state.players.find((p) => p.id === pending.targetPlayerId);

  if (!sourcePlayer || !targetPlayer) {
    return { ...state, pendingAction: null, phase: DealGamePhase.PLAYING };
  }

  let updatedSourceSets = { ...sourcePlayer.propertySets };
  let updatedTargetSets = { ...targetPlayer.propertySets };
  const logs = [...state.logs];

  // 1. Deal Breaker - Steal complete set
  if (pending.card.actionName === DealActionName.DEAL_BREAKER && pending.targetColor) {
    const targetSet = updatedTargetSets[pending.targetColor];
    if (targetSet && targetSet.isComplete) {
      // Transfer set to source
      updatedSourceSets[pending.targetColor] = {
        ...updatedSourceSets[pending.targetColor],
        cards: [...updatedSourceSets[pending.targetColor].cards, ...targetSet.cards],
        hasHouse: targetSet.hasHouse,
        hasHotel: targetSet.hasHotel,
      };
      updatedTargetSets[pending.targetColor] = {
        ...targetSet,
        cards: [],
        hasHouse: false,
        hasHotel: false,
      };
      logs.push(`💥 ${sourcePlayer.name} BROKE the deal and stole ${targetPlayer.name}'s complete ${pending.targetColor} set!`);
      sourcePlayer.stats.dealsBroken += 1;
    }
  }

  // 2. Sly Deal - Steal single property (not full set)
  if (pending.card.actionName === DealActionName.SLY_DEAL && pending.targetColor && pending.targetCardId) {
    const targetSet = updatedTargetSets[pending.targetColor];
    if (targetSet && !targetSet.isComplete) {
      const cardToSteal = targetSet.cards.find((c) => c.id === pending.targetCardId);
      if (cardToSteal) {
        updatedTargetSets[pending.targetColor] = {
          ...targetSet,
          cards: targetSet.cards.filter((c) => c.id !== pending.targetCardId),
        };
        const destColor = cardToSteal.color || pending.targetColor;
        updatedSourceSets[destColor] = {
          ...updatedSourceSets[destColor],
          cards: [...updatedSourceSets[destColor].cards, cardToSteal],
        };
        logs.push(`🕵️ ${sourcePlayer.name} slyly stole ${cardToSteal.name} from ${targetPlayer.name}!`);
      }
    }
  }

  // 3. Forced Deal - Swap single properties
  if (
    pending.card.actionName === DealActionName.FORCED_DEAL &&
    pending.targetColor &&
    pending.targetCardId &&
    pending.swapMyCardId
  ) {
    const targetSet = updatedTargetSets[pending.targetColor];
    let myCardToSwap: DealCard | undefined;
    let myCardColor: DealColor | undefined;

    for (const color of ALL_PLAYABLE_COLORS) {
      const found = updatedSourceSets[color].cards.find((c) => c.id === pending.swapMyCardId);
      if (found && !updatedSourceSets[color].isComplete) {
        myCardToSwap = found;
        myCardColor = color;
        break;
      }
    }

    if (targetSet && !targetSet.isComplete && myCardToSwap && myCardColor) {
      const targetCard = targetSet.cards.find((c) => c.id === pending.targetCardId);
      if (targetCard) {
        // Remove from target, add to source
        updatedTargetSets[pending.targetColor] = {
          ...targetSet,
          cards: targetSet.cards.filter((c) => c.id !== pending.targetCardId),
        };
        updatedSourceSets[pending.targetColor] = {
          ...updatedSourceSets[pending.targetColor],
          cards: [...updatedSourceSets[pending.targetColor].cards, targetCard],
        };

        // Remove from source, add to target
        updatedSourceSets[myCardColor] = {
          ...updatedSourceSets[myCardColor],
          cards: updatedSourceSets[myCardColor].cards.filter((c) => c.id !== myCardToSwap!.id),
        };
        updatedTargetSets[myCardColor] = {
          ...updatedTargetSets[myCardColor],
          cards: [...updatedTargetSets[myCardColor].cards, myCardToSwap],
        };

        logs.push(`🤝 ${sourcePlayer.name} forced a property swap with ${targetPlayer.name}!`);
      }
    }
  }

  const sourceCompleted = recalculatePlayerPropertySets({ propertySets: updatedSourceSets });
  const targetCompleted = recalculatePlayerPropertySets({ propertySets: updatedTargetSets });

  const updatedPlayers = state.players.map((p) => {
    if (p.id === sourcePlayer.id) {
      return {
        ...p,
        propertySets: updatedSourceSets,
        completedSetsCount: sourceCompleted,
      };
    }
    if (p.id === targetPlayer.id) {
      return {
        ...p,
        propertySets: updatedTargetSets,
        completedSetsCount: targetCompleted,
      };
    }
    return p;
  });

  return checkWinOrAutoCompleteTurn({
    ...state,
    players: updatedPlayers,
    pendingAction: null,
    phase: DealGamePhase.PLAYING,
    logs: logs.slice(-50),
  });
}

export function payDebtWithCards(
  state: DealGameState,
  payingPlayerId: DealPlayerId,
  selectedBankCardIds: string[],
  selectedPropertyCardIds: { color: DealColor; cardId: string }[]
): DealGameState {
  if (!state.pendingAction) return state;

  const pending = state.pendingAction;
  const payingPlayer = state.players.find((p) => p.id === payingPlayerId);
  const receivingPlayer = state.players.find((p) => p.id === pending.sourcePlayerId);

  if (!payingPlayer || !receivingPlayer) return state;

  const amountOwed = pending.amountOwedByPlayer[payingPlayerId] || 0;

  // Extract bank cards to transfer
  const bankCardsToTransfer = payingPlayer.bank.filter((c) => selectedBankCardIds.includes(c.id));
  const remainingBank = payingPlayer.bank.filter((c) => !selectedBankCardIds.includes(c.id));

  // Extract property cards to transfer
  const updatedPayingSets = { ...payingPlayer.propertySets };
  const updatedReceivingSets = { ...receivingPlayer.propertySets };

  for (const item of selectedPropertyCardIds) {
    const set = updatedPayingSets[item.color];
    if (set) {
      const card = set.cards.find((c) => c.id === item.cardId);
      if (card) {
        set.cards = set.cards.filter((c) => c.id !== item.cardId);
        const destColor = card.color || item.color;
        if (updatedReceivingSets[destColor]) {
          updatedReceivingSets[destColor].cards.push(card);
        }
      }
    }
  }

  // Transfer bank cards into receiving player's bank
  const updatedReceivingBank = [...receivingPlayer.bank, ...bankCardsToTransfer];

  const payingCompleted = recalculatePlayerPropertySets({ propertySets: updatedPayingSets });
  const receivingCompleted = recalculatePlayerPropertySets({ propertySets: updatedReceivingSets });

  const transferredTotal = bankCardsToTransfer.reduce((sum, c) => sum + c.value, 0);

  const logs = [
    ...state.logs,
    `💰 ${payingPlayer.name} paid $${amountOwed}M debt to ${receivingPlayer.name} ($${transferredTotal}M bank + ${selectedPropertyCardIds.length} properties).`,
  ];

  const updatedPlayers = state.players.map((p) => {
    if (p.id === payingPlayer.id) {
      return {
        ...p,
        bank: remainingBank,
        propertySets: updatedPayingSets,
        completedSetsCount: payingCompleted,
      };
    }
    if (p.id === receivingPlayer.id) {
      return {
        ...p,
        bank: updatedReceivingBank,
        propertySets: updatedReceivingSets,
        completedSetsCount: receivingCompleted,
        stats: {
          ...p.stats,
          rentCollected: p.stats.rentCollected + amountOwed,
        },
      };
    }
    return p;
  });

  const remainingOwedIds = pending.pendingPaymentPlayerIds.filter((id) => id !== payingPlayerId);

  if (remainingOwedIds.length > 0) {
    return {
      ...state,
      players: updatedPlayers,
      pendingAction: {
        ...pending,
        pendingPaymentPlayerIds: remainingOwedIds,
      },
      logs: logs.slice(-50),
    };
  }

  return checkWinOrAutoCompleteTurn({
    ...state,
    players: updatedPlayers,
    pendingAction: null,
    phase: DealGamePhase.PLAYING,
    logs: logs.slice(-50),
  });
}

export function discardCardFromHand(state: DealGameState, cardId: string): DealGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return state;

  const card = currentPlayer.hand[cardIndex];
  const updatedHand = currentPlayer.hand.filter((_, i) => i !== cardIndex);

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.currentPlayerIndex) {
      return { ...p, hand: updatedHand };
    }
    return p;
  });

  const logs = [...state.logs, `🗑️ ${currentPlayer.name} discarded ${card.name}.`];

  const nextState: DealGameState = {
    ...state,
    players: updatedPlayers,
    discardPile: [...state.discardPile, card],
    logs: logs.slice(-50),
  };

  // If hand count <= 7 now, can end turn
  if (updatedHand.length <= 7) {
    return advanceToNextPlayer(nextState);
  }

  return nextState;
}

export function endDealTurn(state: DealGameState): DealGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Must discard if holding more than 7 cards
  if (currentPlayer.hand.length > 7) {
    return {
      ...state,
      phase: DealGamePhase.AWAITING_DISCARD,
      logs: [
        ...state.logs,
        `⚠️ ${currentPlayer.name} has ${currentPlayer.hand.length} cards in hand. Must discard down to 7!`,
      ],
    };
  }

  return advanceToNextPlayer(state);
}

export function advanceToNextPlayer(state: DealGameState): DealGameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextTurnNumber = nextIndex === 0 ? state.turnNumber + 1 : state.turnNumber;

  const nextState: DealGameState = {
    ...state,
    currentPlayerIndex: nextIndex,
    turnNumber: nextTurnNumber,
    playsRemaining: 3,
    phase: DealGamePhase.PLAYING,
    pendingAction: null,
  };

  return startTurnForCurrentPlayer(nextState);
}

export function checkWinOrAutoCompleteTurn(state: DealGameState): DealGameState {
  // Check if any player has 3 or more completed sets
  for (const p of state.players) {
    if (p.completedSetsCount >= 3) {
      const logs = [
        ...state.logs,
        `👑 VICTORY! ${p.token} ${p.name} has collected 3 FULL PROPERTY SETS and won 1poly Cards!`,
      ];
      return {
        ...state,
        winner: p,
        phase: DealGamePhase.GAME_OVER,
        logs: logs.slice(-50),
        lastActionMessage: `${p.name} WON THE GAME!`,
      };
    }
  }

  return state;
}
