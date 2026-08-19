import { GameState, GamePhase, Player, PlayerType, SpaceType } from '../types';
import { generateInitialPropertyStates, SPACES } from './board';
import { CHANCE_DECK, COMMUNITY_CHEST_DECK, shuffleDeck } from './cards';

export const createInitialGameState = (): GameState => ({
  players: [],
  currentPlayerIndex: 0,
  phase: GamePhase.LOBBY,
  propertyStates: generateInitialPropertyStates(),
  chanceDeck: shuffleDeck(CHANCE_DECK),
  communityChestDeck: shuffleDeck(COMMUNITY_CHEST_DECK),
  turnCount: 0,
  pot: 0,
  lastDiceRoll: null,
  doublesRolledCount: 0,
  logs: ['Game created. Waiting for players...'],
});

export const addPlayer = (state: GameState, name: string, type: PlayerType, token: string): GameState => {
  if (state.players.length >= 8) return state;
  const newPlayer: Player = {
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    token,
    position: 0,
    money: 1500,
    properties: [],
    getOutOfJailFreeCards: 0,
    inJail: false,
    jailTurns: 0,
    isBankrupt: false,
  };
  return { ...state, players: [...state.players, newPlayer] };
};

export const startGame = (state: GameState): GameState => {
  if (state.players.length < 1) return state;
  return { 
    ...state, 
    phase: GamePhase.TURN_START, 
    logs: [...state.logs, 'The game has started!'] 
  };
};

export const rollDice = (state: GameState): GameState => {
  if (state.phase !== GamePhase.TURN_START && state.phase !== GamePhase.ROLLING) return state;
  
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const isDouble = d1 === d2;
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  let newDoublesCount = isDouble ? state.doublesRolledCount + 1 : 0;
  
  const logs = [...state.logs, `${currentPlayer.name} rolled ${d1} and ${d2}.`];
  
  let newState = { ...state, lastDiceRoll: [d1, d2] as [number, number], doublesRolledCount: newDoublesCount, logs };

  if (newDoublesCount === 3) {
    // Go to jail
    newState.logs.push(`${currentPlayer.name} rolled doubles 3 times and goes to Jail!`);
    return sendToJail(newState, currentPlayer.id);
  }

  // Move player
  return movePlayerBy(newState, currentPlayer.id, d1 + d2, isDouble);
};

const movePlayerBy = (state: GameState, playerId: string, amount: number, isDouble: boolean): GameState => {
  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  const p = { ...players[pIndex] };
  
  let newPos = p.position + amount;
  let logs = [...state.logs];

  if (newPos >= 40) {
    newPos -= 40;
    p.money += 200;
    logs.push(`${p.name} passed GO and collected $200.`);
  }

  p.position = newPos;
  players[pIndex] = p;

  return { 
    ...state, 
    players, 
    phase: GamePhase.POST_ROLL, 
    logs 
  };
};

export const buyProperty = (state: GameState): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const space = SPACES[currentPlayer.position];
  
  if (![SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) return state;
  if (!space.price || currentPlayer.money < space.price) return state;
  
  const propState = state.propertyStates[space.id];
  if (propState.ownerId) return state; // Already owned

  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === currentPlayer.id);
  players[pIndex] = { 
    ...players[pIndex], 
    money: players[pIndex].money - space.price,
    properties: [...players[pIndex].properties, space.id]
  };
  
  const propertyStates = { ...state.propertyStates };
  propertyStates[space.id] = { ...propertyStates[space.id], ownerId: currentPlayer.id };
  
  return {
    ...state,
    players,
    propertyStates,
    logs: [...state.logs, `${currentPlayer.name} bought ${space.name} for $${space.price}.`]
  };
};

export const endTurn = (state: GameState): GameState => {
  const isDouble = state.lastDiceRoll ? state.lastDiceRoll[0] === state.lastDiceRoll[1] : false;
  
  let nextIndex = state.currentPlayerIndex;
  let nextDoublesCount = state.doublesRolledCount;

  if (!isDouble || state.players[state.currentPlayerIndex].inJail) {
    nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    nextDoublesCount = 0;
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    phase: GamePhase.TURN_START,
    lastDiceRoll: null,
    doublesRolledCount: nextDoublesCount,
    turnCount: state.turnCount + 1,
    logs: [...state.logs, `Turn ended. It is now ${state.players[nextIndex].name}'s turn.`]
  };
};

export const sendToJail = (state: GameState, playerId: string): GameState => {
  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  players[pIndex] = { ...players[pIndex], inJail: true, position: 10, jailTurns: 0 };
  
  return { ...state, players, phase: GamePhase.POST_ROLL, doublesRolledCount: 0 };
};
