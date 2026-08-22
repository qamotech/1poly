export type PlayerId = string;
export type PropertyId = string;
export type CardId = string;

export enum PlayerType {
  USER = 'USER',
  CPU = 'CPU',
}

export interface Player {
  id: PlayerId;
  name: string;
  type: PlayerType;
  token: string; // ID of the chosen token (out of 16)
  position: number; // Index on the board (0-39)
  money: number;
  loan: number;
  properties: PropertyId[];
  getOutOfJailFreeCards: number;
  inJail: boolean;
  jailTurns: number;
  hasPassedGo?: boolean;
  isBankrupt: boolean;
  stats: {
    totalRolls: number;
    rentCollected: number;
  };
}

export enum SpaceType {
  PROPERTY = 'PROPERTY',
  RAILROAD = 'RAILROAD',
  UTILITY = 'UTILITY',
  CHANCE = 'CHANCE',
  COMMUNITY_CHEST = 'COMMUNITY_CHEST',
  TAX = 'TAX',
  GO = 'GO',
  JAIL = 'JAIL',
  FREE_PARKING = 'FREE_PARKING',
  GO_TO_JAIL = 'GO_TO_JAIL',
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  position: number; // 0-39
  price?: number;
  rent?: number[]; // [base, 1 house, 2 houses, 3 houses, 4 houses, hotel]
  houseCost?: number;
  groupColor?: string;
}

export interface PropertyState {
  propertyId: PropertyId;
  ownerId: PlayerId | null;
  houses: number; // 0-4
  hasHotel: boolean;
  isMortgaged: boolean;
}

export enum CardDeck {
  CHANCE = 'CHANCE',
  COMMUNITY_CHEST = 'COMMUNITY_CHEST',
}

export enum CardActionType {
  MOVE_TO = 'MOVE_TO',
  PAY_MONEY = 'PAY_MONEY',
  RECEIVE_MONEY = 'RECEIVE_MONEY',
  PAY_PLAYERS = 'PAY_PLAYERS',
  RECEIVE_FROM_PLAYERS = 'RECEIVE_FROM_PLAYERS',
  GET_OUT_OF_JAIL = 'GET_OUT_OF_JAIL',
  GO_TO_JAIL = 'GO_TO_JAIL',
  STEAL_PROPERTY = 'STEAL_PROPERTY', // Deal card mechanic
  FORCE_TRADE = 'FORCE_TRADE',       // Deal card mechanic
  RENT_MULTIPLIER = 'RENT_MULTIPLIER' // Deal card mechanic
}

export interface ActionCard {
  id: CardId;
  deck: CardDeck;
  description: string;
  actionType: CardActionType;
  value?: number;
  targetSpaceId?: string;
  isDealMechanic: boolean;
}

export enum GamePhase {
  SETUP = 'SETUP',
  LOBBY = 'LOBBY',
  TURN_START = 'TURN_START',
  ROLLING = 'ROLLING',
  POST_ROLL = 'POST_ROLL', // Buying, paying rent, acting on space
  AUCTION = 'AUCTION', // Active property bidding
  DEAL_ACTION = 'DEAL_ACTION', // Resolving a Deal card mechanic
  TRADING = 'TRADING',
  TURN_END = 'TURN_END',
  GAME_OVER = 'GAME_OVER',
}

export type GameSpeed = 'normal' | 'fast' | 'max';

export type BoardTheme = 'classic' | 'cyberpunk' | 'midnight' | 'sunset';

export interface DiceRollRecord {
  id: string;
  playerId: PlayerId;
  playerName: string;
  playerToken: string;
  dice: [number, number];
  total: number;
  isDouble: boolean;
  doublesStreak: number;
  timestamp: number;
  turn: number;
}

export interface TurnHistorySnapshot {
  turn: number;
  activePlayerId: PlayerId;
  netWorths: Record<PlayerId, number>;
  cashBalances: Record<PlayerId, number>;
  propertiesOwnedCount: Record<PlayerId, number>;
  timestamp: number;
}

export interface AuctionState {
  propertyId: PropertyId;
  currentBid: number;
  highestBidderId: PlayerId | null;
  highestBidderName: string | null;
  activeBidderIds: PlayerId[];
  passedBidderIds: PlayerId[];
  minBidIncrement: number;
  returnPhase: GamePhase;
}

export interface TradeOffer {
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  offerMoney: number;
  offerProperties: PropertyId[];
  requestMoney: number;
  requestProperties: PropertyId[];
  negotiationRound?: number;
  note?: string;
  counterOfferSuggestion?: TradeOffer;
}

export interface HouseRules {
  freeParkingJackpot: boolean;
  doubleGo: boolean;
  noRentInJail: boolean;
  propertyAuctions: boolean;
  highRollerStart: boolean;
  snakeEyesBonus: boolean;
  buildWithoutMonopoly: boolean;
  ignoreEvenBuild: boolean;
  firstLapLockdown: boolean;
  wealthTax: boolean;
  mercyRule: boolean;
  rentControl: boolean;
  forcedJailBail: boolean;
}

export interface BankruptcyRecord {
  player: Player;
  bankruptAtTurn: number;
  finalMoney: number;
  finalDebt: number;
  finalProperties: PropertyId[];
  totalHouses: number;
  totalHotels: number;
  rentCollected: number;
  totalRolls: number;
  liquidatedAssetsValue: number;
  cause: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  propertyStates: Record<PropertyId, PropertyState>;
  chanceDeck: ActionCard[];
  communityChestDeck: ActionCard[];
  turnCount: number;
  pot: number; // For Free Parking house rules, if any
  houseRules: HouseRules; // 13 custom game rules
  lastDiceRoll: [number, number] | null;
  doublesRolledCount: number;
  logs: string[];
  pendingTrade?: TradeOffer | null;
  auction?: AuctionState | null;
  gameSpeed: GameSpeed;
  boardTheme?: BoardTheme;
  diceRollHistory?: DiceRollRecord[];
  turnHistorySnapshots?: TurnHistorySnapshot[];
  spaceVisits?: Record<number, number>;
  activePresetName?: string;
  lastCardDrawn?: { card: ActionCard; playerId: PlayerId; deck: CardDeck } | null;
  bankruptcies?: Record<PlayerId, BankruptcyRecord>;
  recentBankruptcy?: BankruptcyRecord | null;
}
