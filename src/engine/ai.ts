import { GameState, GamePhase, PlayerType, SpaceType } from '../types';
import { rollDice, endTurn, buyProperty, resolveTrade } from './engine';
import { SPACES } from './board';

// A simple hook or function to run the AI if it's a CPU's turn
export const processAITurn = (state: GameState): GameState => {
  let nextState = { ...state };
  
  // If there's a pending trade and the target is a CPU, the CPU evaluates it.
  if (nextState.phase === GamePhase.TRADING && nextState.pendingTrade) {
    const targetPlayer = nextState.players.find(p => p.id === nextState.pendingTrade!.toPlayerId);
    if (targetPlayer && targetPlayer.type === PlayerType.CPU) {
      // For now, CPUs always reject trades to prevent human players from stealing all their money/properties.
      // In the future, we could add valuation logic.
      return resolveTrade(nextState, false); 
    }
  }

  const currentPlayer = nextState.players[nextState.currentPlayerIndex];
  
  // Safety check
  if (!currentPlayer || currentPlayer.type !== PlayerType.CPU) return nextState;

  if (nextState.phase === GamePhase.TURN_START) {
    // CPU always rolls
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

    // After acting on post-roll, end turn
    nextState = endTurn(nextState);
  }

  return nextState;
};
