import { GameState, GamePhase, PlayerType, SpaceType } from '../types';
import { rollDice, endTurn, buyProperty, resolveTrade, buildHouse, sellHouse, mortgageProperty, useGetOutOfJailCard, payBail, placeBid, passAuction } from './engine';
import { evaluateTradeOffer } from './trade';
import { SPACES } from './board';

// A robust AI turn processing engine
export const processAITurn = (state: GameState): GameState => {
  let nextState = { ...state };
  
  // If there's a pending trade and the target is a CPU, the CPU evaluates it.
  if (nextState.phase === GamePhase.TRADING && nextState.pendingTrade) {
    const targetPlayer = nextState.players.find(p => p.id === nextState.pendingTrade!.toPlayerId);
    if (targetPlayer && targetPlayer.type === PlayerType.CPU) {
      const valuation = evaluateTradeOffer(nextState, nextState.pendingTrade);
      return resolveTrade(nextState, valuation.isAcceptable); 
    }
  }

  // If in AUCTION phase, process next eligible CPU bidder
  if (nextState.phase === GamePhase.AUCTION && nextState.auction) {
    const auction = nextState.auction;
    const property = SPACES.find(s => s.id === auction.propertyId);
    
    // Find active CPU bidders who haven't passed and aren't highest bidder
    const eligibleCpu = nextState.players.find(p => 
      p.type === PlayerType.CPU && 
      !p.isBankrupt && 
      !auction.passedBidderIds.includes(p.id) && 
      p.id !== auction.highestBidderId
    );

    if (eligibleCpu && property && property.price) {
      const minBid = auction.currentBid === 0 ? 10 : auction.currentBid + 10;
      const maxWillingToPay = Math.floor(property.price * 0.85); // willing to bid up to 85% of market value
      
      if (minBid <= maxWillingToPay && eligibleCpu.money >= minBid + 100) {
        return placeBid(nextState, eligibleCpu.id, minBid);
      } else {
        return passAuction(nextState, eligibleCpu.id);
      }
    }
    return nextState;
  }

  const currentPlayer = nextState.players[nextState.currentPlayerIndex];
  
  // Safety check
  if (!currentPlayer || currentPlayer.type !== PlayerType.CPU || currentPlayer.isBankrupt) return nextState;

  if (nextState.phase === GamePhase.TURN_START) {
    // If CPU is in jail, prioritize Get Out of Jail Free card
    if (currentPlayer.inJail) {
      if (currentPlayer.getOutOfJailFreeCards > 0) {
        nextState = useGetOutOfJailCard(nextState, currentPlayer.id);
      } else if (currentPlayer.money >= 300) {
        // If wealthy, pay bail to get moving immediately
        nextState = payBail(nextState, currentPlayer.id);
      }
    }

    // CPU rolls
    nextState = rollDice(nextState);
    return nextState; // Let the UI render the roll, then process next phase
  }

  if (nextState.phase === GamePhase.POST_ROLL) {
    const space = SPACES[currentPlayer.position];
    
    // Auto-buy if unowned and can afford
    if ([SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) {
      const propState = nextState.propertyStates[space.id];
      if (!propState.ownerId && space.price && currentPlayer.money >= space.price) {
        nextState = buyProperty(nextState);
      }
    }

    // AI House Building logic: If AI has >= $250 safety buffer, try to build on monopolies
    const activePlayer = nextState.players[nextState.currentPlayerIndex];
    if (activePlayer && activePlayer.money >= 250) {
      for (const propId of activePlayer.properties) {
        const prop = SPACES.find(s => s.id === propId);
        if (prop?.groupColor && prop.houseCost && activePlayer.money >= prop.houseCost + 150) {
          const beforeState = nextState;
          const candidateState = buildHouse(nextState, activePlayer.id, propId);
          if (candidateState !== beforeState) {
            nextState = candidateState;
            break; // Build 1 house per turn to pace upgrades
          }
        }
      }
    }

    // Emergency Liquidation if CPU is underwater (< 0 cash)
    let p = nextState.players[nextState.currentPlayerIndex];
    if (p && p.money < 0) {
      // 1. Try selling houses first
      for (const propId of p.properties) {
        const ps = nextState.propertyStates[propId];
        if (ps && (ps.houses > 0 || ps.hasHotel)) {
          nextState = sellHouse(nextState, p.id, propId);
          p = nextState.players[nextState.currentPlayerIndex];
          if (p.money >= 0) break;
        }
      }

      // 2. Try mortgaging properties
      if (p.money < 0) {
        for (const propId of p.properties) {
          const ps = nextState.propertyStates[propId];
          if (ps && !ps.isMortgaged && ps.houses === 0 && !ps.hasHotel) {
            nextState = mortgageProperty(nextState, p.id, propId);
            p = nextState.players[nextState.currentPlayerIndex];
            if (p.money >= 0) break;
          }
        }
      }
    }

    // If CPU rolled doubles and is eligible to roll again, roll again instead of ending turn
    const canRollAgain = nextState.doublesRolledCount > 0 && 
      nextState.doublesRolledCount < 3 && 
      !currentPlayer.inJail && 
      !currentPlayer.isBankrupt &&
      nextState.lastDiceRoll !== null && 
      nextState.lastDiceRoll[0] === nextState.lastDiceRoll[1];

    if (canRollAgain) {
      nextState = rollDice(nextState);
    } else {
      nextState = endTurn(nextState);
    }
  }

  return nextState;
};
