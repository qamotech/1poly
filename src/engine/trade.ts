import { GameState, TradeOffer, Player, SpaceType, PropertyId } from '../types';
import { SPACES } from './board';

export interface TradeValuation {
  giveValue: number; // Value of what the evaluatee is giving up
  getValue: number;  // Value of what the evaluatee is receiving
  netValue: number;  // getValue - giveValue
  isAcceptable: boolean;
  reason: string;
}

/**
 * Calculates the strategic value of a property for a specific player.
 * Takes into account base price, color monopolies, railroads, utilities, and whether the opponent gets a monopoly.
 */
export function calculatePropertyStrategicValue(
  state: GameState,
  propId: PropertyId,
  forPlayerId: string,
  receiving: boolean,
  counterpartId?: string
): number {
  const space = SPACES.find(s => s.id === propId);
  if (!space || !space.price) return 0;

  const basePrice = space.price;
  const propState = state.propertyStates[propId];
  
  // If property is mortgaged, base value is reduced
  const mortgagePenalty = propState?.isMortgaged ? 0.7 : 1.0;
  let multiplier = 1.0;

  // 1. Color Group / Monopoly Analysis
  if (space.type === SpaceType.PROPERTY && space.groupColor) {
    const groupSpaces = SPACES.filter(s => s.groupColor === space.groupColor);
    const groupTotal = groupSpaces.length;

    // Count how many properties of this group the player currently owns
    const playerOwnedCount = groupSpaces.filter(
      s => state.propertyStates[s.id]?.ownerId === forPlayerId
    ).length;

    if (receiving) {
      // If receiving this property completes a monopoly for this player
      if (playerOwnedCount === groupTotal - 1) {
        multiplier = 2.8; // High value: completes monopoly!
      } else if (playerOwnedCount === 1 && groupTotal === 3) {
        multiplier = 1.5; // Good value: 2 out of 3
      } else {
        multiplier = 1.1;
      }

      // Check if receiving this blocks the counterpart from getting a monopoly
      if (counterpartId) {
        const counterpartOwnedCount = groupSpaces.filter(
          s => state.propertyStates[s.id]?.ownerId === counterpartId
        ).length;
        if (counterpartOwnedCount === groupTotal - 1) {
          multiplier = Math.max(multiplier, 1.6); // Bonus: blocks opponent monopoly!
        }
      }
    } else {
      // If giving this property away
      // Giving away a property from an existing monopoly is catastrophic
      if (playerOwnedCount === groupTotal) {
        multiplier = 3.5; // Very reluctant to break a full monopoly
      } else if (playerOwnedCount === groupTotal - 1 && groupTotal > 2) {
        multiplier = 1.8; // Reluctant: breaking 2/3 progress
      } else {
        multiplier = 1.0;
      }

      // If giving this completes a monopoly for the counterpart, charge extra!
      if (counterpartId) {
        const counterpartOwnedCount = groupSpaces.filter(
          s => state.propertyStates[s.id]?.ownerId === counterpartId
        ).length;
        if (counterpartOwnedCount === groupTotal - 1) {
          multiplier *= 1.8; // Dangerous: grants opponent monopoly!
        }
      }
    }
  } else if (space.type === SpaceType.RAILROAD) {
    const rrSpaces = SPACES.filter(s => s.type === SpaceType.RAILROAD);
    const playerRRCount = rrSpaces.filter(
      s => state.propertyStates[s.id]?.ownerId === forPlayerId
    ).length;

    if (receiving) {
      // 2nd RR, 3rd RR, 4th RR scale in value
      if (playerRRCount === 3) multiplier = 2.2;
      else if (playerRRCount === 2) multiplier = 1.7;
      else if (playerRRCount === 1) multiplier = 1.3;
      else multiplier = 1.0;
    } else {
      if (playerRRCount >= 3) multiplier = 1.8;
      else if (playerRRCount === 2) multiplier = 1.3;
      else multiplier = 1.0;
    }
  } else if (space.type === SpaceType.UTILITY) {
    const utilSpaces = SPACES.filter(s => s.type === SpaceType.UTILITY);
    const playerUtilCount = utilSpaces.filter(
      s => state.propertyStates[s.id]?.ownerId === forPlayerId
    ).length;

    if (receiving) {
      if (playerUtilCount === 1) multiplier = 1.5; // Completing utility pair
      else multiplier = 1.0;
    } else {
      if (playerUtilCount === 2) multiplier = 1.4;
      else multiplier = 1.0;
    }
  }

  return Math.round(basePrice * multiplier * mortgagePenalty);
}

/**
 * Evaluates a trade offer from the perspective of the recipient (target player, usually AI).
 */
export function evaluateTradeOffer(state: GameState, offer: TradeOffer): TradeValuation {
  const toPlayer = state.players.find(p => p.id === offer.toPlayerId);
  const fromPlayer = state.players.find(p => p.id === offer.fromPlayerId);

  if (!toPlayer || !fromPlayer) {
    return {
      giveValue: 0,
      getValue: 0,
      netValue: 0,
      isAcceptable: false,
      reason: 'Invalid players involved in trade.'
    };
  }

  // 1. Calculate cash value
  // If target has low cash (<$200), cash received is worth up to 1.35x
  const cashNeedMultiplier = toPlayer.money < 200 ? 1.35 : toPlayer.money < 400 ? 1.15 : 1.0;
  const cashReceivedValue = offer.offerMoney * cashNeedMultiplier;

  // If asked to give more cash than target owns, automatic rejection
  if (offer.requestMoney > toPlayer.money) {
    return {
      giveValue: offer.requestMoney,
      getValue: cashReceivedValue,
      netValue: cashReceivedValue - offer.requestMoney,
      isAcceptable: false,
      reason: `${toPlayer.name} cannot afford to pay $${offer.requestMoney}.`
    };
  }

  // If asked to give more than 60% of liquid cash, add reluctance weight
  const cashGiveMultiplier = offer.requestMoney > toPlayer.money * 0.6 ? 1.3 : 1.0;
  const cashGivenValue = offer.requestMoney * cashGiveMultiplier;

  // 2. Calculate property values given up by target (requested by fromPlayer)
  let propertiesGivenValue = 0;
  for (const propId of offer.requestProperties) {
    propertiesGivenValue += calculatePropertyStrategicValue(
      state,
      propId,
      toPlayer.id,
      false, // giving
      fromPlayer.id
    );
  }

  // 3. Calculate property values received by target (offered by fromPlayer)
  let propertiesReceivedValue = 0;
  for (const propId of offer.offerProperties) {
    propertiesReceivedValue += calculatePropertyStrategicValue(
      state,
      propId,
      toPlayer.id,
      true, // receiving
      fromPlayer.id
    );
  }

  const totalGiveValue = Math.round(cashGivenValue + propertiesGivenValue);
  const totalGetValue = Math.round(cashReceivedValue + propertiesReceivedValue);
  const netValue = totalGetValue - totalGiveValue;

  // Acceptance criteria:
  // - Fair or profitable trade: getValue >= giveValue * 0.90 (allows ~10% flexibility for reasonable mutual trades)
  // - If giving up 0 properties/cash, auto-accept any non-empty offer
  if (totalGiveValue === 0 && totalGetValue > 0) {
    return {
      giveValue: 0,
      getValue: totalGetValue,
      netValue: totalGetValue,
      isAcceptable: true,
      reason: 'Free gift or completely one-sided benefit!'
    };
  }

  const ratio = totalGiveValue > 0 ? totalGetValue / totalGiveValue : 1;
  const isAcceptable = ratio >= 0.90;

  let reason = '';
  if (isAcceptable) {
    if (ratio >= 1.2) {
      reason = `Great deal! Valued at +$${netValue} gain.`;
    } else {
      reason = `Fair and balanced trade (value ratio ${(ratio * 100).toFixed(0)}%).`;
    }
  } else {
    reason = `Offer undervalued (offered ~$${totalGetValue} vs requested ~$${totalGiveValue}).`;
  }

  return {
    giveValue: totalGiveValue,
    getValue: totalGetValue,
    netValue,
    isAcceptable,
    reason
  };
}

export interface MonopolyImpact {
  type: 'completes_monopoly' | 'blocks_monopoly' | 'breaks_monopoly';
  playerId: string;
  playerName: string;
  colorName: string;
  colorHex: string;
  description: string;
}

export function analyzeTradeMonopolyImpacts(state: GameState, offer: TradeOffer): MonopolyImpact[] {
  const impacts: MonopolyImpact[] = [];
  const fromPlayer = state.players.find(p => p.id === offer.fromPlayerId);
  const toPlayer = state.players.find(p => p.id === offer.toPlayerId);
  if (!fromPlayer || !toPlayer) return impacts;

  // Check what fromPlayer receives (offered by toPlayer in requestProperties)
  for (const propId of offer.requestProperties) {
    const space = SPACES.find(s => s.id === propId);
    if (space?.groupColor && space.type === SpaceType.PROPERTY) {
      const groupSpaces = SPACES.filter(s => s.groupColor === space.groupColor);
      const fromCount = groupSpaces.filter(s => state.propertyStates[s.id]?.ownerId === fromPlayer.id).length;
      if (fromCount === groupSpaces.length - 1) {
        impacts.push({
          type: 'completes_monopoly',
          playerId: fromPlayer.id,
          playerName: fromPlayer.name,
          colorName: space.groupColor,
          colorHex: space.groupColor,
          description: `⚡ Completes ${fromPlayer.name}'s ${space.name} color monopoly!`
        });
      }
    }
  }

  // Check what toPlayer receives (offered by fromPlayer in offerProperties)
  for (const propId of offer.offerProperties) {
    const space = SPACES.find(s => s.id === propId);
    if (space?.groupColor && space.type === SpaceType.PROPERTY) {
      const groupSpaces = SPACES.filter(s => s.groupColor === space.groupColor);
      const toCount = groupSpaces.filter(s => state.propertyStates[s.id]?.ownerId === toPlayer.id).length;
      if (toCount === groupSpaces.length - 1) {
        impacts.push({
          type: 'completes_monopoly',
          playerId: toPlayer.id,
          playerName: toPlayer.name,
          colorName: space.groupColor,
          colorHex: space.groupColor,
          description: `⚡ Completes ${toPlayer.name}'s ${space.name} color monopoly!`
        });
      }
    }
  }

  return impacts;
}

/**
 * Generates an intelligent counter-offer when the AI rejects a proposal.
 */
export function generateAICounterOffer(state: GameState, offer: TradeOffer): TradeOffer | null {
  const valuation = evaluateTradeOffer(state, offer);
  if (valuation.isAcceptable) return null; // No counter needed if already acceptable

  const toPlayer = state.players.find(p => p.id === offer.toPlayerId);
  const fromPlayer = state.players.find(p => p.id === offer.fromPlayerId);
  if (!toPlayer || !fromPlayer) return null;

  // Don't counter if it's wildly absurd (giveValue is 4x getValue)
  if (valuation.giveValue > (valuation.getValue + 1) * 3.5 && valuation.giveValue > 800) {
    return null;
  }

  const deficit = valuation.giveValue - valuation.getValue;
  const targetSweetener = Math.round(deficit * 1.15);

  // Strategy A: If fromPlayer has enough liquid cash to bridge the gap
  if (fromPlayer.money >= offer.offerMoney + targetSweetener && (offer.offerMoney + targetSweetener) <= fromPlayer.money) {
    return {
      fromPlayerId: toPlayer.id, // Counter-offer is now from toPlayer to fromPlayer
      toPlayerId: fromPlayer.id,
      offerMoney: offer.requestMoney,
      offerProperties: [...offer.requestProperties],
      requestMoney: offer.offerMoney + targetSweetener,
      requestProperties: [...offer.offerProperties],
      negotiationRound: (offer.negotiationRound || 1) + 1,
      note: `I can accept if you include an extra $${targetSweetener} cash to balance strategic value!`
    };
  }

  // Strategy B: If fromPlayer has additional properties that toPlayer wants
  const otherFromProps = fromPlayer.properties.filter(id => !offer.offerProperties.includes(id));
  for (const candidateId of otherFromProps) {
    const candidateVal = calculatePropertyStrategicValue(state, candidateId, toPlayer.id, true, fromPlayer.id);
    if (candidateVal >= deficit * 0.8 && candidateVal <= deficit * 1.5) {
      const space = SPACES.find(s => s.id === candidateId);
      return {
        fromPlayerId: toPlayer.id,
        toPlayerId: fromPlayer.id,
        offerMoney: offer.requestMoney,
        offerProperties: [...offer.requestProperties],
        requestMoney: Math.max(0, offer.offerMoney - 50),
        requestProperties: [...offer.offerProperties, candidateId],
        negotiationRound: (offer.negotiationRound || 1) + 1,
        note: `Include ${space?.name || 'an extra property'} and we have a deal!`
      };
    }
  }

  // Fallback cash adjustment with max available
  if (fromPlayer.money > offer.offerMoney + 50) {
    const affordableCash = Math.min(fromPlayer.money, offer.offerMoney + Math.min(deficit, fromPlayer.money - offer.offerMoney));
    return {
      fromPlayerId: toPlayer.id,
      toPlayerId: fromPlayer.id,
      offerMoney: offer.requestMoney,
      offerProperties: [...offer.requestProperties],
      requestMoney: affordableCash,
      requestProperties: [...offer.offerProperties],
      negotiationRound: (offer.negotiationRound || 1) + 1,
      note: `Counter-offer: Increase cash offer to $${affordableCash}.`
    };
  }

  return null;
}

/**
 * Boolean helper for AI trade decision
 */
export function evaluateTradeForAI(state: GameState, offer: TradeOffer): boolean {
  const valuation = evaluateTradeOffer(state, offer);
  return valuation.isAcceptable;
}
