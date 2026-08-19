import { GameState, GamePhase, Player, PlayerType, SpaceType, ActionCard, CardActionType, CardDeck, HouseRules } from '../types';
import { generateInitialPropertyStates, SPACES } from './board';
import { CHANCE_DECK, COMMUNITY_CHEST_DECK, shuffleDeck } from './cards';

export const DEFAULT_RULES: HouseRules = {
  freeParkingJackpot: false,
  doubleGo: false,
  noRentInJail: false,
  propertyAuctions: false,
  highRollerStart: false,
  snakeEyesBonus: false,
  buildWithoutMonopoly: false,
  ignoreEvenBuild: false,
  firstLapLockdown: false,
  wealthTax: false,
  mercyRule: false,
  rentControl: false,
  forcedJailBail: false,
};

export const createInitialGameState = (): GameState => ({
  players: [],
  currentPlayerIndex: 0,
  phase: GamePhase.LOBBY,
  propertyStates: generateInitialPropertyStates(),
  chanceDeck: shuffleDeck(CHANCE_DECK),
  communityChestDeck: shuffleDeck(COMMUNITY_CHEST_DECK),
  turnCount: 0,
  pot: 0,
  houseRules: DEFAULT_RULES,
  lastDiceRoll: null,
  doublesRolledCount: 0,
  logs: ['Game created. Waiting for players...'],
  lastCardDrawn: null,
});

export const updateHouseRules = (state: GameState, rules: Partial<HouseRules>): GameState => {
  return { ...state, houseRules: { ...state.houseRules, ...rules } };
};

export const addPlayer = (state: GameState, name: string, type: PlayerType, token: string): GameState => {
  if (state.players.length >= 8) return state;
  const newPlayer: Player = {
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    token,
    position: 0,
    money: 1500,
    loan: 0,
    properties: [],
    getOutOfJailFreeCards: 0,
    inJail: false,
    jailTurns: 0,
    hasPassedGo: false,
    isBankrupt: false,
    stats: {
      totalRolls: 0,
      rentCollected: 0,
    }
  };
  return { ...state, players: [...state.players, newPlayer] };
};

export const takeLoan = (state: GameState, playerId: string, amount: number): GameState => {
  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  if (pIndex === -1) return state;

  const p = { ...players[pIndex] };
  p.money += amount;
  p.loan += Math.floor(amount * 1.1); // 10% interest applied to loan balance

  players[pIndex] = p;
  
  return {
    ...state,
    players,
    logs: [...state.logs, `${p.name} took a $${amount} loan from the bank (Owes $${Math.floor(amount * 1.1)}).`]
  };
};

export const repayLoan = (state: GameState, playerId: string, amount: number): GameState => {
  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  if (pIndex === -1) return state;

  const p = { ...players[pIndex] };
  if (p.money < amount || p.loan < amount) return state;

  p.money -= amount;
  p.loan -= amount;

  players[pIndex] = p;

  return {
    ...state,
    players,
    logs: [...state.logs, `${p.name} repaid $${amount} of their bank loan.`]
  };
};

export const startGame = (state: GameState): GameState => {
  if (state.players.length < 1) return state;
  const startCash = state.houseRules.highRollerStart ? 2500 : 1500;
  return { 
    ...state, 
    phase: GamePhase.TURN_START, 
    players: state.players.map(p => ({ ...p, money: startCash })),
    logs: [...state.logs, `The game has started! Players start with $${startCash}.`] 
  };
};

export const rollDice = (state: GameState): GameState => {
  if (state.phase !== GamePhase.TURN_START && state.phase !== GamePhase.ROLLING) return state;
  
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const isDouble = d1 === d2;
  
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Jail Roll Logic
  if (currentPlayer.inJail) {
    const players = [...state.players];
    const pIndex = players.findIndex(p => p.id === currentPlayer.id);
    const p = { ...players[pIndex] };
    let logs = [...state.logs];
    let pot = state.pot;

    if (state.houseRules.forcedJailBail && p.jailTurns === 0) {
      logs.push(`${p.name} paid $50 forced bail to exit Jail on their first turn.`);
      p.money -= 50;
      if (state.houseRules.freeParkingJackpot) pot += 50;
      p.inJail = false;
      p.jailTurns = 0;
      players[pIndex] = p;
      return movePlayerBy({ ...state, players, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: isDouble ? 1 : 0 }, p.id, d1 + d2, isDouble);
    }

    logs.push(`${p.name} rolled ${d1} and ${d2} from Jail.`);
    
    if (isDouble) {
      logs.push(`${p.name} rolled doubles and got out of Jail!`);
      p.inJail = false;
      p.jailTurns = 0;
      players[pIndex] = p;
      return movePlayerBy({ ...state, players, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: 0 }, p.id, d1 + d2, false); // Pass isDouble false so they don't roll again
    } else {
      p.jailTurns += 1;
      if (p.jailTurns >= 3) {
        logs.push(`${p.name} served 3 turns, paid $50 to get out of Jail.`);
        p.money -= 50;
        if (state.houseRules.freeParkingJackpot) pot += 50;
        p.inJail = false;
        p.jailTurns = 0;
        players[pIndex] = p;
        return movePlayerBy({ ...state, players, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: 0 }, p.id, d1 + d2, false);
      } else {
        logs.push(`${p.name} did not roll doubles and stays in Jail.`);
        players[pIndex] = p;
        return { ...state, players, logs, pot, lastDiceRoll: [d1, d2], phase: GamePhase.POST_ROLL, doublesRolledCount: 0 };
      }
    }
  }

  // Normal Roll Logic
  let newDoublesCount = isDouble ? state.doublesRolledCount + 1 : 0;
  
  // Track stats
  const updatedPlayers = [...state.players];
  updatedPlayers[state.currentPlayerIndex] = {
    ...currentPlayer,
    stats: {
      ...currentPlayer.stats,
      totalRolls: currentPlayer.stats.totalRolls + 1,
    }
  };
  
  const logs = [...state.logs, `${currentPlayer.name} rolled ${d1} and ${d2}.`];
  
  if (d1 === 1 && d2 === 1 && state.houseRules.snakeEyesBonus) {
    updatedPlayers[state.currentPlayerIndex].money += 500;
    logs.push(`${currentPlayer.name} got a $500 bonus for rolling Snake Eyes!`);
  }

  let newState: GameState = { 
    ...state, 
    players: updatedPlayers,
    lastDiceRoll: [d1, d2] as [number, number], 
    doublesRolledCount: newDoublesCount, 
    logs, 
    lastCardDrawn: null 
  };

  if (newDoublesCount === 3) {
    newState.logs.push(`${currentPlayer.name} rolled doubles 3 times in a row and goes to Jail!`);
    return sendToJail(newState, currentPlayer.id);
  }

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
    p.hasPassedGo = true;
    if (newPos === 0 && state.houseRules.doubleGo) {
      p.money += 400;
      logs.push(`${p.name} landed EXACTLY on GO and collected $400!`);
    } else {
      p.money += 200;
      logs.push(`${p.name} passed GO and collected $200.`);
    }
  }

  p.position = newPos;
  players[pIndex] = p;

  const newState = { 
    ...state, 
    players, 
    phase: GamePhase.POST_ROLL, 
    logs 
  };

  return handleSpaceLanding(newState, playerId, amount);
};

const handleSpaceLanding = (state: GameState, playerId: string, diceTotal: number): GameState => {
  let players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  let p = { ...players[pIndex] };
  let logs = [...state.logs];
  let pot = state.pot;
  const space = SPACES[p.position];

  if (space.type === SpaceType.GO_TO_JAIL) {
    logs.push(`${p.name} landed on Go To Jail!`);
    return sendToJail({ ...state, players, logs, pot }, p.id);
  }

  if (space.type === SpaceType.TAX) {
    let amount = space.price || 0;
    
    if (space.name === "Income Tax" && state.houseRules.wealthTax) {
      let wealth = p.money;
      p.properties.forEach(propId => {
        const s = SPACES.find(x => x.id === propId);
        if (s && s.price) wealth += s.price;
        const ps = state.propertyStates[propId];
        if (ps && ps.houses > 0 && s && s.houseCost) wealth += ps.houses * s.houseCost;
      });
      amount = Math.floor(wealth * 0.1);
      logs.push(`${p.name} paid a 10% Wealth Tax of $${amount} based on total wealth of $${wealth}.`);
    } else {
      logs.push(`${p.name} landed on ${space.name} and paid $${amount}.`);
    }

    p.money -= amount;
    
    if (state.houseRules.freeParkingJackpot) {
      pot += amount;
      logs[logs.length - 1] += ` (added to Free Parking Pot).`;
    }
  }

  if (space.type === SpaceType.FREE_PARKING) {
    if (pot > 0) {
      p.money += pot;
      logs.push(`${p.name} landed on Free Parking and collected the $${pot} Pot!`);
      pot = 0;
    } else {
      logs.push(`${p.name} landed on Free Parking. The Pot is empty.`);
    }
  }

  if ([SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) {
    const propState = state.propertyStates[space.id];
    if (propState.ownerId && propState.ownerId !== p.id && !propState.isMortgaged) {
      const ownerIndex = players.findIndex(o => o.id === propState.ownerId);
      const owner = players[ownerIndex];
      
      let rent = 0;
      
      if (state.houseRules.noRentInJail && owner.inJail) {
        logs.push(`${owner.name} is in Jail and cannot collect rent for ${space.name}.`);
      } else {
        if (space.type === SpaceType.PROPERTY && space.rent) {
          const groupProps = SPACES.filter(s => s.groupColor === space.groupColor);
          const ownsAll = groupProps.every(s => state.propertyStates[s.id]?.ownerId === owner.id);
          
          if (propState.houses === 0 && ownsAll) {
            rent = space.rent[0] * 2;
          } else {
            rent = space.rent[propState.houses];
          }
        } else if (space.type === SpaceType.RAILROAD) {
          const rrCount = owner.properties.filter(propId => SPACES.find(s => s.id === propId)?.type === SpaceType.RAILROAD).length;
          rent = 25 * Math.pow(2, rrCount - 1);
        } else if (space.type === SpaceType.UTILITY) {
          const utilCount = owner.properties.filter(propId => SPACES.find(s => s.id === propId)?.type === SpaceType.UTILITY).length;
          rent = (utilCount === 2 ? 10 : 4) * diceTotal;
        }

        if (state.houseRules.rentControl && rent > 1000) {
          rent = 1000;
          logs.push(`Rent Control capped the rent at $1000!`);
        }
      }

      if (rent > 0) {
        p.money -= rent;
        players[ownerIndex] = { 
          ...owner, 
          money: owner.money + rent,
          stats: {
            ...owner.stats,
            rentCollected: owner.stats.rentCollected + rent,
          }
        };
        logs.push(`${p.name} paid $${rent} rent to ${owner.name} for ${space.name}.`);
      }
    }
  }

  players[pIndex] = p;
  const newState = { ...state, players, logs, pot };

  // Handle Card Drawing
  if (space.type === SpaceType.CHANCE || space.type === SpaceType.COMMUNITY_CHEST) {
    const isChance = space.type === SpaceType.CHANCE;
    let deck = isChance ? [...state.chanceDeck] : [...state.communityChestDeck];
    
    // Draw top card, cycle to bottom
    const card = deck.shift()!;
    deck.push(card);

    newState.logs.push(`${p.name} drew a ${isChance ? 'Chance' : 'Community Chest'} card: "${card.description}"`);
    
    if (isChance) newState.chanceDeck = deck;
    else newState.communityChestDeck = deck;

    newState.lastCardDrawn = { card, playerId: p.id, deck: isChance ? CardDeck.CHANCE : CardDeck.COMMUNITY_CHEST };

    return processCard(newState, card, p.id);
  }

  return newState;
};

const processCard = (state: GameState, card: ActionCard, playerId: string): GameState => {
  let players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  let p = { ...players[pIndex] };
  let logs = [...state.logs];
  let propertyStates = { ...state.propertyStates };
  let pot = state.pot;

  switch (card.actionType) {
    case CardActionType.RECEIVE_MONEY:
      if (card.value) p.money += card.value;
      players[pIndex] = p;
      return { ...state, players, logs, pot };

    case CardActionType.PAY_MONEY:
      if (card.value) {
        p.money -= card.value;
        pot += card.value;
        logs.push(`${p.name} paid $${card.value} (added to Free Parking Pot).`);
      }
      players[pIndex] = p;
      return { ...state, players, logs, pot };

    case CardActionType.RECEIVE_FROM_PLAYERS:
      if (card.value) {
        let totalCollected = 0;
        players = players.map(other => {
          if (other.id !== p.id) {
            other.money -= card.value!;
            totalCollected += card.value!;
          }
          return other;
        });
        p.money += totalCollected;
        players[pIndex] = p; // Ensure main player object is updated in the array
      }
      return { ...state, players, logs, pot };

    case CardActionType.GET_OUT_OF_JAIL:
      p.getOutOfJailFreeCards += 1;
      players[pIndex] = p;
      return { ...state, players, logs, pot };

    case CardActionType.GO_TO_JAIL:
      players[pIndex] = p;
      return sendToJail({ ...state, players, logs, pot }, p.id);

    case CardActionType.MOVE_TO:
      if (card.targetSpaceId) {
        const targetIndex = SPACES.findIndex(s => s.id === card.targetSpaceId);
        if (targetIndex !== -1) {
          // Check for passing Go
          if (targetIndex < p.position) {
            p.money += 200;
            logs.push(`${p.name} passed GO and collected $200.`);
          }
          p.position = targetIndex;
          players[pIndex] = p;
          
          // Re-trigger landing logic on the new space (simulate roll of 0 to avoid utility errors)
          return handleSpaceLanding({ ...state, players, logs, pot }, p.id, 0);
        }
      }
      players[pIndex] = p;
      return { ...state, players, logs, pot };

    // Deal Mechanics (Auto-resolve for now until UI is built)
    case CardActionType.STEAL_PROPERTY:
      // Find a random property owned by someone else
      const otherProperties = Object.values(propertyStates).filter(ps => ps.ownerId && ps.ownerId !== p.id);
      if (otherProperties.length > 0) {
        const targetProp = otherProperties[Math.floor(Math.random() * otherProperties.length)];
        const targetSpace = SPACES.find(s => s.id === targetProp.propertyId)!;
        const victimIndex = players.findIndex(pl => pl.id === targetProp.ownerId);
        
        targetProp.ownerId = p.id; // Transfer ownership
        
        // Update players' property arrays
        players[victimIndex].properties = players[victimIndex].properties.filter(id => id !== targetSpace.id);
        p.properties.push(targetSpace.id);

        logs.push(`DEAL MECHANIC: ${p.name} stole ${targetSpace.name} from ${players[victimIndex].name}!`);
      } else {
        logs.push(`DEAL MECHANIC: No properties to steal!`);
      }
      players[pIndex] = p;
      return { ...state, players, propertyStates, logs, pot };

    case CardActionType.FORCE_TRADE:
      const myProps = p.properties;
      const theirProps = Object.values(propertyStates).filter(ps => ps.ownerId && ps.ownerId !== p.id);
      
      if (myProps.length > 0 && theirProps.length > 0) {
        const giveId = myProps[Math.floor(Math.random() * myProps.length)];
        const targetPropState = theirProps[Math.floor(Math.random() * theirProps.length)];
        const getSpace = SPACES.find(s => s.id === targetPropState.propertyId)!;
        const giveSpace = SPACES.find(s => s.id === giveId)!;
        
        const victimId = targetPropState.ownerId!;
        const victimIndex = players.findIndex(pl => pl.id === victimId);

        // Swap owners in property state
        propertyStates[giveId].ownerId = victimId;
        propertyStates[getSpace.id].ownerId = p.id;

        // Swap properties in player arrays
        p.properties = p.properties.filter(id => id !== giveId);
        p.properties.push(getSpace.id);
        
        players[victimIndex].properties = players[victimIndex].properties.filter(id => id !== getSpace.id);
        players[victimIndex].properties.push(giveId);

        logs.push(`DEAL MECHANIC: ${p.name} forced a trade! They gave ${giveSpace.name} for ${players[victimIndex].name}'s ${getSpace.name}!`);
      } else {
        logs.push(`DEAL MECHANIC: Forced trade failed (someone lacks properties).`);
      }
      players[pIndex] = p;
      return { ...state, players, propertyStates, logs, pot };

    default:
      players[pIndex] = p;
      return { ...state, players, logs, pot };
  }
};

export const buyProperty = (state: GameState): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const space = SPACES[currentPlayer.position];
  
  if (![SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) return state;
  if (!space.price || currentPlayer.money < space.price) return state;
  if (state.houseRules.firstLapLockdown && !currentPlayer.hasPassedGo) return state;
  
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
  
  let players = [...state.players];
  let logs = [...state.logs];

  // Auto-bankrupt players with negative money at the end of their turn
  players = players.map(p => {
    if (p.money < 0 && !p.isBankrupt) {
      if (p.type === PlayerType.CPU) {
        // CPU tries to take a loan to survive
        while (p.money < 0 && p.loan < 2000) { // arbitrary cap to stop infinite loans
          p.money += 500;
          p.loan += 550;
          logs.push(`${p.name} automatically took a $500 Bank Loan to avoid bankruptcy!`);
        }
      }
      
      if (p.money < 0) {
        logs.push(`${p.name} could not pay their debts and went BANKRUPT!`);
        // Free properties
        p.properties.forEach(propId => {
          if (updatedPropertyStates[propId]) {
            updatedPropertyStates[propId] = { ownerId: null, houses: 0, hasHotel: false };
          }
        });
        p.properties = [];
        return { ...p, isBankrupt: true };
      }
    }
    return p;
  });

  const activePlayers = players.filter(p => !p.isBankrupt);

  let updatedPropertyStates = { ...state.propertyStates };

  // Property Auction Rule
  if (state.houseRules.propertyAuctions) {
    const currentPlayer = players[state.currentPlayerIndex];
    const space = SPACES[currentPlayer.position];
    
    // Only auction if it's a property, nobody owns it, and we aren't restricted by lap lockdown
    if ([SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type) && space.price) {
      if (!updatedPropertyStates[space.id].ownerId && (!state.houseRules.firstLapLockdown || currentPlayer.hasPassedGo)) {
        // Find other players who can afford a discounted price
        const auctionPrice = Math.floor(space.price * 0.7);
        const bidders = activePlayers.filter(p => p.id !== currentPlayer.id && p.money >= auctionPrice);
        
        if (bidders.length > 0) {
          const winner = bidders[Math.floor(Math.random() * bidders.length)];
          const wIndex = players.findIndex(p => p.id === winner.id);
          
          players[wIndex].money -= auctionPrice;
          players[wIndex].properties.push(space.id);
          updatedPropertyStates[space.id] = { ...updatedPropertyStates[space.id], ownerId: winner.id };
          logs.push(`The Bank auto-auctioned ${space.name}! ${winner.name} won it for $${auctionPrice}.`);
        } else {
          logs.push(`The Bank attempted to auction ${space.name}, but nobody could afford it.`);
        }
      }
    }
  }

  if (activePlayers.length <= 1 && players.length > 1) {
    const winner = activePlayers[0];
    return {
      ...state,
      players,
      propertyStates: updatedPropertyStates,
      phase: GamePhase.GAME_OVER,
      logs: [...logs, `GAME OVER! ${winner ? winner.name : 'Nobody'} wins!`],
      lastDiceRoll: null,
      lastCardDrawn: null,
    };
  }

  if (state.houseRules.mercyRule) {
    const winnerByMercy = activePlayers.find(p => p.money >= 5000);
    if (winnerByMercy) {
      return {
        ...state,
        players,
        propertyStates: updatedPropertyStates,
        phase: GamePhase.GAME_OVER,
        logs: [...logs, `MERCY RULE INVOKED! ${winnerByMercy.name} reached $5000 and wins!`],
        lastDiceRoll: null,
        lastCardDrawn: null,
      };
    }
  }

  let nextIndex = state.currentPlayerIndex;
  let nextDoublesCount = state.doublesRolledCount;

  if (!isDouble || players[state.currentPlayerIndex].inJail || players[state.currentPlayerIndex].isBankrupt) {
    // Find next non-bankrupt player
    do {
      nextIndex = (nextIndex + 1) % players.length;
    } while (players[nextIndex].isBankrupt && nextIndex !== state.currentPlayerIndex);
    
    nextDoublesCount = 0;
  }

  return {
    ...state,
    players,
    propertyStates: updatedPropertyStates,
    currentPlayerIndex: nextIndex,
    phase: GamePhase.TURN_START,
    lastDiceRoll: null,
    doublesRolledCount: nextDoublesCount,
    turnCount: state.turnCount + 1,
    logs: [...logs, `Turn ended. It is now ${players[nextIndex].name}'s turn.`],
    lastCardDrawn: null,
  };
};

export const sendToJail = (state: GameState, playerId: string): GameState => {
  const players = [...state.players];
  const pIndex = players.findIndex(p => p.id === playerId);
  players[pIndex] = { ...players[pIndex], inJail: true, position: 10, jailTurns: 0 };
  
  return { ...state, players, phase: GamePhase.POST_ROLL, doublesRolledCount: 0, lastDiceRoll: null };
};

export const buildHouse = (state: GameState, playerId: string, propertyId: string): GameState => {
  if (state.phase !== GamePhase.TURN_START && state.phase !== GamePhase.POST_ROLL) return state;
  if (state.players[state.currentPlayerIndex].id !== playerId) return state;

  const property = SPACES.find(s => s.id === propertyId);
  if (!property || !property.groupColor || !property.houseCost) return state;

  const propState = state.propertyStates[propertyId];
  if (propState.ownerId !== playerId) return state;

  // Check monopoly
  const groupSpaces = SPACES.filter(s => s.groupColor === property.groupColor);
  const hasMonopoly = groupSpaces.every(s => state.propertyStates[s.id]?.ownerId === playerId);
  if (!hasMonopoly && !state.houseRules.buildWithoutMonopoly) return state;

  // Check even build rule
  const currentHouses = propState.houses;
  if (currentHouses >= 4 && propState.hasHotel) return state; // Maxed out

  const minHousesInGroup = Math.min(...groupSpaces.map(s => state.propertyStates[s.id].hasHotel ? 5 : state.propertyStates[s.id].houses));

  const targetLevel = propState.hasHotel ? 5 : currentHouses;
  if (targetLevel > minHousesInGroup && !state.houseRules.ignoreEvenBuild) return state; // Must build evenly

  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];
  if (p.money < property.houseCost) return state; // Can't afford

  let newPlayers = [...state.players];
  newPlayers[pIndex] = { ...p, money: p.money - property.houseCost };

  let newPropStates = { ...state.propertyStates };
  let newHouses = currentHouses;
  let newHotel = propState.hasHotel;

  if (currentHouses === 4) {
    newHouses = 0;
    newHotel = true;
  } else {
    newHouses += 1;
  }

  newPropStates[propertyId] = { ...propState, houses: newHouses, hasHotel: newHotel };

  const actionDesc = newHotel ? 'a Hotel' : 'a House';
  const logs = [...state.logs, `${p.name} built ${actionDesc} on ${property.name} for $${property.houseCost}.`];

  return { ...state, players: newPlayers, propertyStates: newPropStates, logs };
};

export const proposeTrade = (state: GameState, offer: import('../types').TradeOffer): GameState => {
  if (state.phase !== GamePhase.POST_ROLL && state.phase !== GamePhase.TURN_START) return state;
  const fromPlayer = state.players.find(p => p.id === offer.fromPlayerId);
  const toPlayer = state.players.find(p => p.id === offer.toPlayerId);
  
  if (!fromPlayer || !toPlayer) return state;
  
  return {
    ...state,
    phase: GamePhase.TRADING,
    pendingTrade: offer,
    logs: [...state.logs, `${fromPlayer.name} proposed a trade to ${toPlayer.name}.`]
  };
};

export const resolveTrade = (state: GameState, accepted: boolean): GameState => {
  if (state.phase !== GamePhase.TRADING || !state.pendingTrade) return state;
  
  const offer = state.pendingTrade;
  const fromIndex = state.players.findIndex(p => p.id === offer.fromPlayerId);
  const toIndex = state.players.findIndex(p => p.id === offer.toPlayerId);
  
  if (fromIndex === -1 || toIndex === -1) {
    // Players not found, abort
    return {
      ...state,
      phase: state.lastDiceRoll ? GamePhase.POST_ROLL : GamePhase.TURN_START,
      pendingTrade: null,
      logs: [...state.logs, `Trade aborted due to missing players.`]
    };
  }
  
  let players = [...state.players];
  let propertyStates = { ...state.propertyStates };
  let logs = [...state.logs];

  const fromPlayerName = players[fromIndex].name;
  const toPlayerName = players[toIndex].name;
  
  if (accepted) {
    // 1. Transfer Money
    players[fromIndex] = { ...players[fromIndex], money: players[fromIndex].money - offer.offerMoney + offer.requestMoney };
    players[toIndex] = { ...players[toIndex], money: players[toIndex].money - offer.requestMoney + offer.offerMoney };
    
    // 2. Transfer Properties
    offer.offerProperties.forEach(propId => {
      propertyStates[propId] = { ...propertyStates[propId], ownerId: offer.toPlayerId };
      players[fromIndex].properties = players[fromIndex].properties.filter(id => id !== propId);
      players[toIndex].properties.push(propId);
    });
    
    offer.requestProperties.forEach(propId => {
      propertyStates[propId] = { ...propertyStates[propId], ownerId: offer.fromPlayerId };
      players[toIndex].properties = players[toIndex].properties.filter(id => id !== propId);
      players[fromIndex].properties.push(propId);
    });
    
    logs.push(`${toPlayerName} ACCEPTED the trade from ${fromPlayerName}!`);
  } else {
    logs.push(`${toPlayerName} REJECTED the trade from ${fromPlayerName}.`);
  }
  
  return {
    ...state,
    players,
    propertyStates,
    phase: state.lastDiceRoll ? GamePhase.POST_ROLL : GamePhase.TURN_START,
    pendingTrade: null,
    logs
  };
};

export const mortgageProperty = (state: GameState, playerId: string, propertyId: string): GameState => {
  const property = SPACES.find(s => s.id === propertyId);
  const propState = state.propertyStates[propertyId];
  if (!property || !property.price || propState?.ownerId !== playerId || propState.isMortgaged) return state;
  if (propState.houses > 0 || propState.hasHotel) return state; // Must sell houses first

  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];
  
  const mortgageValue = Math.floor(property.price / 2);
  let newPlayers = [...state.players];
  newPlayers[pIndex] = { ...p, money: p.money + mortgageValue };

  return {
    ...state,
    players: newPlayers,
    propertyStates: {
      ...state.propertyStates,
      [propertyId]: { ...propState, isMortgaged: true }
    },
    logs: [...state.logs, `${p.name} mortgaged ${property.name} for $${mortgageValue}.`]
  };
};

export const unmortgageProperty = (state: GameState, playerId: string, propertyId: string): GameState => {
  const property = SPACES.find(s => s.id === propertyId);
  const propState = state.propertyStates[propertyId];
  if (!property || !property.price || propState?.ownerId !== playerId || !propState.isMortgaged) return state;

  const unmortgageCost = Math.floor((property.price / 2) * 1.1); // 10% interest
  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];
  
  if (p.money < unmortgageCost) return state;

  let newPlayers = [...state.players];
  newPlayers[pIndex] = { ...p, money: p.money - unmortgageCost };

  return {
    ...state,
    players: newPlayers,
    propertyStates: {
      ...state.propertyStates,
      [propertyId]: { ...propState, isMortgaged: false }
    },
    logs: [...state.logs, `${p.name} unmortgaged ${property.name} for $${unmortgageCost}.`]
  };
};

export const payBail = (state: GameState, playerId: string): GameState => {
  if (state.phase !== GamePhase.TURN_START) return state;
  if (state.players[state.currentPlayerIndex].id !== playerId) return state;

  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];
  if (!p.inJail || p.money < 50) return state;

  let newPlayers = [...state.players];
  newPlayers[pIndex] = { ...p, money: p.money - 50, inJail: false, jailTurns: 0 };
  
  let newPot = state.pot;
  if (state.houseRules.freeParkingJackpot) newPot += 50;

  return {
    ...state,
    players: newPlayers,
    pot: newPot,
    logs: [...state.logs, `${p.name} paid $50 bail to exit Jail.`]
  };
};
