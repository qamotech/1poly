import { GameState, GamePhase, PlayerType, SpaceType } from '../types';
import { rollDice, endTurn, buyProperty } from './engine';
import { SPACES } from './board';

// A simple hook or function to run the AI if it's a CPU's turn
export const processAITurn = (state: GameState): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  
  // Safety check
  if (currentPlayer.type !== PlayerType.CPU) return state;

  let nextState = { ...state };

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
