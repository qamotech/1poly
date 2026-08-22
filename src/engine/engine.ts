import { GameState, GamePhase, Player, PlayerType, SpaceType, PropertyState, ActionCard, CardActionType, CardDeck, HouseRules, BankruptcyRecord, AuctionState, GameSpeed, BoardTheme, DiceRollRecord, TurnHistorySnapshot } from '../types';
import { generateInitialPropertyStates, SPACES } from './board';
import { CHANCE_DECK, COMMUNITY_CHEST_DECK, shuffleDeck } from './cards';
import { RULES_PRESETS } from './rulesPresets';

export const DEFAULT_RULES: HouseRules = {
  freeParkingJackpot: false,
  doubleGo: false,
  noRentInJail: false,
  propertyAuctions: true,
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

export const calculatePlayerNetWorth = (player: Player, propertyStates: Record<string, PropertyState>): number => {
  let netWorth = player.money - (player.loan || 0);
  (player.properties || []).forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (!space) return;
    const ps = propertyStates[propId];
    if (ps?.isMortgaged) {
      netWorth += Math.floor((space.price || 0) * 0.5);
    } else {
      netWorth += (space.price || 0);
      if (ps?.houses) {
        netWorth += ps.houses * (space.houseCost || 50);
      }
      if (ps?.hasHotel) {
        netWorth += 5 * (space.houseCost || 50);
      }
    }
  });
  return netWorth;
};

export const createTurnSnapshot = (state: GameState, activePlayerId: string): TurnHistorySnapshot => {
  const netWorths: Record<string, number> = {};
  const cashBalances: Record<string, number> = {};
  const propertiesOwnedCount: Record<string, number> = {};

  state.players.forEach(p => {
    netWorths[p.id] = calculatePlayerNetWorth(p, state.propertyStates);
    cashBalances[p.id] = p.money;
    propertiesOwnedCount[p.id] = (p.properties || []).length;
  });

  return {
    turn: state.turnCount,
    activePlayerId,
    netWorths,
    cashBalances,
    propertiesOwnedCount,
    timestamp: Date.now(),
  };
};

export const setBoardTheme = (state: GameState, boardTheme: BoardTheme): GameState => {
  return {
    ...state,
    boardTheme,
    logs: [...state.logs, `Board visual theme changed to ${boardTheme.toUpperCase()}.`]
  };
};

export const applyHouseRulesPreset = (state: GameState, presetId: string): GameState => {
  const preset = RULES_PRESETS.find(p => p.id === presetId);
  if (!preset) return state;
  return {
    ...state,
    houseRules: { ...preset.rules },
    activePresetName: preset.name,
    logs: [...state.logs, `Applied House Rules Preset: "${preset.name}".`]
  };
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
  auction: null,
  gameSpeed: 'fast',
  boardTheme: 'classic',
  diceRollHistory: [],
  turnHistorySnapshots: [],
  spaceVisits: {},
  activePresetName: 'Official Tournament',
  bankruptcies: {},
  recentBankruptcy: null,
});

export const updateHouseRules = (state: GameState, rules: Partial<HouseRules>): GameState => {
  return { ...state, houseRules: { ...state.houseRules, ...rules }, activePresetName: 'Custom' };
};

export const setGameSpeed = (state: GameState, gameSpeed: GameSpeed): GameState => {
  return {
    ...state,
    gameSpeed,
    logs: [...state.logs, `Game speed set to ${gameSpeed.toUpperCase()}.`]
  };
};

export const addPlayer = (state: GameState, name: string, type: PlayerType, token: string): GameState => {
  if (state.players.length >= 8) return state;
  
  // Ensure unique name
  let finalName = name.trim();
  const existingNames = state.players.map(p => p.name.toLowerCase());
  if (existingNames.includes(finalName.toLowerCase())) {
    let suffix = 2;
    while (existingNames.includes(`${finalName} ${suffix}`.toLowerCase())) {
      suffix++;
    }
    finalName = `${finalName} ${suffix}`;
  }

  // Ensure unique token
  let finalToken = token;
  const existingTokens = state.players.map(p => p.token);
  if (existingTokens.includes(finalToken)) {
    const ALL_TOKENS = ['🥷🏾', '🚗', '🎩', '🐕', '👞', '🚢', '🚂', '🚜', '🏎️', '✈️', '🚀', '👽', '🤖', '🦄', '🦖', '🍕'];
    const available = ALL_TOKENS.find(t => !existingTokens.includes(t));
    if (available) finalToken = available;
  }

  const newPlayer: Player = {
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: finalName,
    type,
    token: finalToken,
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
  return { 
    ...state, 
    players: [...state.players, newPlayer],
    logs: [...state.logs, `${finalName} (${type === PlayerType.USER ? 'Human' : 'CPU'}) joined the lobby.`]
  };
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

export const updatePlayer = (
  state: GameState, 
  playerId: string, 
  updates: { name?: string; type?: PlayerType; token?: string }
): GameState => {
  if (state.phase !== GamePhase.LOBBY) return state;
  const pIndex = state.players.findIndex(p => p.id === playerId);
  if (pIndex === -1) return state;

  const players = [...state.players];
  const oldPlayer = players[pIndex];
  players[pIndex] = {
    ...oldPlayer,
    name: updates.name?.trim() || oldPlayer.name,
    type: updates.type || oldPlayer.type,
    token: updates.token || oldPlayer.token
  };

  return {
    ...state,
    players,
    logs: [...state.logs, `Player ${oldPlayer.name} details were updated.`]
  };
};

export const removePlayer = (state: GameState, playerId: string): GameState => {
  const removed = state.players.find(p => p.id === playerId);
  if (!removed) return state;

  if (state.phase === GamePhase.LOBBY) {
    const players = state.players.filter(p => p.id !== playerId);
    return {
      ...state,
      players,
      logs: [...state.logs, `${removed.name} was removed from the lobby.`]
    };
  }

  // Active game removal / forfeit
  let updatedPropertyStates = { ...state.propertyStates };
  removed.properties.forEach(propId => {
    if (updatedPropertyStates[propId]) {
      updatedPropertyStates[propId] = {
        propertyId: propId,
        ownerId: null,
        houses: 0,
        hasHotel: false,
        isMortgaged: false
      };
    }
  });

  const updatedPlayers = state.players.map(p => {
    if (p.id === playerId) {
      return { ...p, isBankrupt: true, money: 0, properties: [] };
    }
    return p;
  });

  const activePlayers = updatedPlayers.filter(p => !p.isBankrupt);
  let nextIndex = state.currentPlayerIndex;
  if (updatedPlayers[nextIndex]?.id === playerId || updatedPlayers[nextIndex]?.isBankrupt) {
    nextIndex = (nextIndex + 1) % updatedPlayers.length;
    while (updatedPlayers[nextIndex]?.isBankrupt && activePlayers.length > 0) {
      nextIndex = (nextIndex + 1) % updatedPlayers.length;
    }
  }

  const isGameOver = activePlayers.length <= 1 && updatedPlayers.length > 1;

  return {
    ...state,
    players: updatedPlayers,
    propertyStates: updatedPropertyStates,
    currentPlayerIndex: nextIndex,
    phase: isGameOver ? GamePhase.GAME_OVER : state.phase,
    logs: [
      ...state.logs,
      `${removed.name} was removed / forfeited the match. Their properties were liquidated to the bank.`,
      ...(isGameOver && activePlayers[0] ? [`GAME OVER! ${activePlayers[0].name} wins the match!`] : [])
    ]
  };
};

export const startGame = (state: GameState): GameState => {
  if (state.players.length < 2) return state;
  const startCash = state.houseRules.highRollerStart ? 2500 : 1500;
  return { 
    ...state, 
    phase: GamePhase.TURN_START, 
    players: state.players.map(p => ({ ...p, money: startCash })),
    logs: [...state.logs, `The game has started! ${state.players.length} players start with $${startCash}.`] 
  };
};

export const rollDice = (state: GameState): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isBankrupt) return state;

  const isEligibleDoublesRoll = state.phase === GamePhase.POST_ROLL && 
    state.doublesRolledCount > 0 && 
    state.doublesRolledCount < 3 && 
    !currentPlayer.inJail && 
    state.lastDiceRoll !== null && 
    state.lastDiceRoll[0] === state.lastDiceRoll[1];

  if (state.phase !== GamePhase.TURN_START && state.phase !== GamePhase.ROLLING && !isEligibleDoublesRoll) {
    return state;
  }
  
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const isDouble = d1 === d2;

  // Track stats
  const updatedPlayers = [...state.players];
  const pIndex = updatedPlayers.findIndex(p => p.id === currentPlayer.id);
  const p = { ...updatedPlayers[pIndex] };
  p.stats = {
    ...p.stats,
    totalRolls: (p.stats?.totalRolls || 0) + 1,
  };

  let logs = [...state.logs];
  let pot = state.pot;

  // Jail Roll Logic
  if (p.inJail) {
    if (state.houseRules.forcedJailBail && p.jailTurns === 0) {
      logs.push(`⚖️ ${p.name} paid $50 forced bail to exit Jail on their first turn.`);
      p.money -= 50;
      if (state.houseRules.freeParkingJackpot) pot += 50;
      p.inJail = false;
      p.jailTurns = 0;
      updatedPlayers[pIndex] = p;
      return movePlayerBy({ ...state, players: updatedPlayers, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: isDouble ? 1 : 0 }, p.id, d1 + d2, isDouble);
    }

    logs.push(`🎲 ${p.name} rolled ${d1} & ${d2} from Jail.`);
    
    if (isDouble) {
      if (d1 === 1 && d2 === 1 && state.houseRules.snakeEyesBonus) {
        p.money += 500;
        logs.push(`🐍 SNAKE EYES BONUS! ${p.name} earned an instant $500 cash bonus!`);
      }
      logs.push(`🔓 DOUBLES (${d1} & ${d2})! ${p.name} was released from Jail and moved ${d1 + d2} spaces!`);
      p.inJail = false;
      p.jailTurns = 0;
      updatedPlayers[pIndex] = p;
      // In standard monopoly rules, rolling doubles to get out of jail releases you and moves you, but does not grant a consecutive extra roll
      return movePlayerBy({ ...state, players: updatedPlayers, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: 0 }, p.id, d1 + d2, false);
    } else {
      p.jailTurns += 1;
      if (p.jailTurns >= 3) {
        logs.push(`⏱️ ${p.name} served 3 turns in Jail and paid $50 bail to be released.`);
        p.money -= 50;
        if (state.houseRules.freeParkingJackpot) pot += 50;
        p.inJail = false;
        p.jailTurns = 0;
        updatedPlayers[pIndex] = p;
        return movePlayerBy({ ...state, players: updatedPlayers, logs, pot, lastDiceRoll: [d1, d2], doublesRolledCount: 0 }, p.id, d1 + d2, false);
      } else {
        logs.push(`🔒 ${p.name} did not roll doubles (${d1}+${d2}) and remains in Jail (Turn ${p.jailTurns}/3).`);
        updatedPlayers[pIndex] = p;
        return { ...state, players: updatedPlayers, logs, pot, lastDiceRoll: [d1, d2], phase: GamePhase.POST_ROLL, doublesRolledCount: 0 };
      }
    }
  }

  // Normal Roll Logic
  let newDoublesCount = isDouble ? state.doublesRolledCount + 1 : 0;
  
  if (d1 === 1 && d2 === 1 && state.houseRules.snakeEyesBonus) {
    p.money += 500;
    logs.push(`🐍 SNAKE EYES BONUS! ${p.name} earned an instant $500 bonus!`);
  }

  logs.push(`🎲 ${p.name} rolled ${d1} & ${d2} (Total: ${d1 + d2})${isDouble ? ' — DOUBLES! (Roll Again)' : ''}.`);
  updatedPlayers[pIndex] = p;

  let newState: GameState = { 
    ...state, 
    players: updatedPlayers, 
    lastDiceRoll: [d1, d2] as [number, number], 
    doublesRolledCount: newDoublesCount, 
    logs, 
    lastCardDrawn: null 
  };

  if (newDoublesCount === 3) {
    newState.logs.push(`🚨 ${p.name} rolled doubles 3 times in a row and is sent to Jail for speeding!`);
    return sendToJail(newState, p.id);
  }

  return movePlayerBy(newState, p.id, d1 + d2, isDouble);
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

export const createBankruptcyRecord = (
  player: Player,
  turnCount: number,
  propertyStates: Record<string, any>,
  cause: string = 'Debts exceeded cash and liquidation assets'
): BankruptcyRecord => {
  let totalHouses = 0;
  let totalHotels = 0;
  let liquidatedAssetsValue = 0;

  player.properties.forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (space?.price) liquidatedAssetsValue += space.price;
    const ps = propertyStates[propId];
    if (ps) {
      totalHouses += ps.houses || 0;
      if (ps.hasHotel) totalHotels += 1;
      if (space?.houseCost) {
        liquidatedAssetsValue += (ps.houses || 0) * space.houseCost;
        if (ps.hasHotel) liquidatedAssetsValue += 5 * space.houseCost;
      }
    }
  });

  return {
    player: { ...player },
    bankruptAtTurn: turnCount,
    finalMoney: player.money,
    finalDebt: player.loan,
    finalProperties: [...player.properties],
    totalHouses,
    totalHotels,
    rentCollected: player.stats?.rentCollected || 0,
    totalRolls: player.stats?.totalRolls || 0,
    liquidatedAssetsValue,
    cause
  };
};

export const dismissRecentBankruptcy = (state: GameState): GameState => {
  return {
    ...state,
    recentBankruptcy: null,
  };
};

export const endTurn = (state: GameState): GameState => {
  const isDouble = state.lastDiceRoll ? state.lastDiceRoll[0] === state.lastDiceRoll[1] : false;
  
  let players = [...state.players];
  let logs = [...state.logs];
  let updatedPropertyStates = { ...state.propertyStates };
  let bankruptcies = { ...(state.bankruptcies || {}) };
  let recentBankruptcy = state.recentBankruptcy || null;

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
        logs.push(`💀 BANKRUPT: ${p.name} could not pay their debts of $${Math.abs(p.money)} and was eliminated!`);
        
        // Capture snapshot before freeing properties
        const record = createBankruptcyRecord(
          p,
          state.turnCount,
          updatedPropertyStates,
          `Insolvent with $${p.money} debt and $${p.loan} unpaid loans.`
        );
        bankruptcies[p.id] = record;
        recentBankruptcy = record;

        // Free properties back to the bank
        p.properties.forEach(propId => {
          if (updatedPropertyStates[propId]) {
            updatedPropertyStates[propId] = { 
              propertyId: propId,
              ownerId: null, 
              houses: 0, 
              hasHotel: false,
              isMortgaged: false 
            };
          }
        });
        
        p.properties = [];
        return { ...p, isBankrupt: true };
      }
    }
    return p;
  });

  const activePlayers = players.filter(p => !p.isBankrupt);

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
  do {
    nextIndex = (nextIndex + 1) % players.length;
  } while (players[nextIndex].isBankrupt && nextIndex !== state.currentPlayerIndex);

  return {
    ...state,
    players,
    propertyStates: updatedPropertyStates,
    bankruptcies,
    recentBankruptcy,
    currentPlayerIndex: nextIndex,
    phase: GamePhase.TURN_START,
    lastDiceRoll: state.lastDiceRoll,
    doublesRolledCount: 0,
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

export const startAuction = (state: GameState, propertyId: string): GameState => {
  const property = SPACES.find(s => s.id === propertyId);
  if (!property || !property.price) return state;

  const activePlayers = state.players.filter(p => !p.isBankrupt);
  if (activePlayers.length === 0) return state;

  const auction: AuctionState = {
    propertyId,
    currentBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    activeBidderIds: activePlayers.map(p => p.id),
    passedBidderIds: [],
    minBidIncrement: 10,
    returnPhase: state.phase === GamePhase.AUCTION ? GamePhase.POST_ROLL : state.phase
  };

  return {
    ...state,
    phase: GamePhase.AUCTION,
    auction,
    logs: [...state.logs, `🔨 AUCTION STARTED: The Banker opened bidding for ${property.name} (Valued at $${property.price})!`]
  };
};

export const placeBid = (state: GameState, playerId: string, bidAmount: number): GameState => {
  if (state.phase !== GamePhase.AUCTION || !state.auction) return state;
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.isBankrupt || player.money < bidAmount) return state;
  if (bidAmount <= state.auction.currentBid) return state;

  const property = SPACES.find(s => s.id === state.auction!.propertyId);
  const updatedAuction: AuctionState = {
    ...state.auction,
    currentBid: bidAmount,
    highestBidderId: playerId,
    highestBidderName: player.name,
    // If they were in passed, placing a higher bid brings them back
    passedBidderIds: state.auction.passedBidderIds.filter(id => id !== playerId)
  };

  return {
    ...state,
    auction: updatedAuction,
    logs: [...state.logs, `🔨 ${player.name} bid $${bidAmount} for ${property ? property.name : 'the property'}.`]
  };
};

export const passAuction = (state: GameState, playerId: string): GameState => {
  if (state.phase !== GamePhase.AUCTION || !state.auction) return state;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return state;

  const passedBidderIds = Array.from(new Set([...state.auction.passedBidderIds, playerId]));
  const property = SPACES.find(s => s.id === state.auction!.propertyId);

  // Check if all active bidders have passed or only the highest bidder remains
  const activeNonBankrupt = state.players.filter(p => !p.isBankrupt);
  const remainingBidders = activeNonBankrupt.filter(p => !passedBidderIds.includes(p.id));

  const shouldConclude = 
    (state.auction.highestBidderId !== null && remainingBidders.length <= 1) || 
    (state.auction.highestBidderId === null && passedBidderIds.length >= activeNonBankrupt.length) ||
    remainingBidders.length === 0;

  if (!shouldConclude) {
    return {
      ...state,
      auction: {
        ...state.auction,
        passedBidderIds
      },
      logs: [...state.logs, `${player.name} passed on the auction for ${property ? property.name : 'the property'}.`]
    };
  }

  // Conclude auction
  if (state.auction.highestBidderId && state.auction.currentBid > 0 && property) {
    const winnerId = state.auction.highestBidderId;
    const winnerIndex = state.players.findIndex(p => p.id === winnerId);
    const winBid = state.auction.currentBid;

    let updatedPlayers = [...state.players];
    let updatedPropertyStates = { ...state.propertyStates };

    if (winnerIndex !== -1 && updatedPlayers[winnerIndex].money >= winBid) {
      updatedPlayers[winnerIndex] = {
        ...updatedPlayers[winnerIndex],
        money: updatedPlayers[winnerIndex].money - winBid,
        properties: [...updatedPlayers[winnerIndex].properties, property.id]
      };
      updatedPropertyStates[property.id] = {
        ...updatedPropertyStates[property.id],
        ownerId: winnerId
      };

      return {
        ...state,
        players: updatedPlayers,
        propertyStates: updatedPropertyStates,
        phase: state.auction.returnPhase || GamePhase.POST_ROLL,
        auction: null,
        logs: [
          ...state.logs,
          `🎉 AUCTION WON: ${updatedPlayers[winnerIndex].name} won ${property.name} for $${winBid}!`
        ]
      };
    }
  }

  // No winner or couldn't afford
  return {
    ...state,
    phase: state.auction.returnPhase || GamePhase.POST_ROLL,
    auction: null,
    logs: [
      ...state.logs,
      `🔨 Auction for ${property ? property.name : 'the property'} concluded with no sales.`
    ]
  };
};

export const declineProperty = (state: GameState): GameState => {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const space = SPACES[currentPlayer.position];
  if (![SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) return state;
  if (!space.price) return state;

  const propState = state.propertyStates[space.id];
  if (propState.ownerId) return state;

  // If house rule disables auction, just proceed
  if (!state.houseRules.propertyAuctions) {
    return {
      ...state,
      logs: [...state.logs, `${currentPlayer.name} declined to buy ${space.name}.`]
    };
  }

  return startAuction(state, space.id);
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

  // Official Rule: Cannot build if ANY property in the color group is mortgaged
  const anyMortgaged = groupSpaces.some(s => state.propertyStates[s.id]?.isMortgaged);
  if (anyMortgaged && !state.houseRules.buildWithoutMonopoly) return state;

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

export const sellHouse = (state: GameState, playerId: string, propertyId: string): GameState => {
  if (state.phase !== GamePhase.TURN_START && state.phase !== GamePhase.POST_ROLL) return state;
  if (state.players[state.currentPlayerIndex].id !== playerId) return state;

  const property = SPACES.find(s => s.id === propertyId);
  if (!property || !property.groupColor || !property.houseCost) return state;

  const propState = state.propertyStates[propertyId];
  if (propState.ownerId !== playerId) return state;
  if (propState.houses === 0 && !propState.hasHotel) return state;

  const groupSpaces = SPACES.filter(s => s.groupColor === property.groupColor);
  
  // Check even selling rule: must sell from the property with the most houses
  const maxHousesInGroup = Math.max(...groupSpaces.map(s => state.propertyStates[s.id].hasHotel ? 5 : state.propertyStates[s.id].houses));
  const currentLevel = propState.hasHotel ? 5 : propState.houses;

  if (currentLevel < maxHousesInGroup && !state.houseRules.ignoreEvenBuild) return state;

  const refund = Math.floor(property.houseCost / 2);
  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];

  let newPlayers = [...state.players];
  newPlayers[pIndex] = { ...p, money: p.money + refund };

  let newPropStates = { ...state.propertyStates };
  let newHouses = propState.houses;
  let newHotel = propState.hasHotel;

  if (propState.hasHotel) {
    newHotel = false;
    newHouses = 4;
  } else {
    newHouses = Math.max(0, propState.houses - 1);
  }

  newPropStates[propertyId] = { ...propState, houses: newHouses, hasHotel: newHotel };

  const actionDesc = propState.hasHotel ? 'a Hotel' : 'a House';
  const logs = [...state.logs, `${p.name} sold ${actionDesc} on ${property.name} back to the bank for $${refund}.`];

  return { ...state, players: newPlayers, propertyStates: newPropStates, logs };
};

export const useGetOutOfJailCard = (state: GameState, playerId: string): GameState => {
  if (state.phase !== GamePhase.TURN_START) return state;
  if (state.players[state.currentPlayerIndex].id !== playerId) return state;

  const pIndex = state.players.findIndex(p => p.id === playerId);
  const p = state.players[pIndex];
  if (!p.inJail || p.getOutOfJailFreeCards <= 0) return state;

  let newPlayers = [...state.players];
  newPlayers[pIndex] = {
    ...p,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: p.getOutOfJailFreeCards - 1
  };

  return {
    ...state,
    players: newPlayers,
    logs: [...state.logs, `${p.name} used a Get Out of Jail Free Card!`]
  };
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

  // Official Rule: All buildings on all properties of that color group must be sold first
  if (property.groupColor) {
    const groupSpaces = SPACES.filter(s => s.groupColor === property.groupColor);
    const anyBuildingsInGroup = groupSpaces.some(s => {
      const ps = state.propertyStates[s.id];
      return ps && (ps.houses > 0 || ps.hasHotel);
    });
    if (anyBuildingsInGroup) return state;
  } else if (propState.houses > 0 || propState.hasHotel) {
    return state;
  }

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
