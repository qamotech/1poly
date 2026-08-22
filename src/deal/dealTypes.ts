export type DealPlayerId = string;
export type DealCardId = string;

export enum DealColor {
  BROWN = 'BROWN',
  DARK_BLUE = 'DARK_BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
  ORANGE = 'ORANGE',
  PINK = 'PINK',
  LIGHT_BLUE = 'LIGHT_BLUE',
  RAILROAD = 'RAILROAD',
  UTILITY = 'UTILITY',
  ANY = 'ANY', // 10-color multi-color wildcard
}

export enum DealCardType {
  MONEY = 'MONEY',
  PROPERTY = 'PROPERTY',
  PROPERTY_WILD = 'PROPERTY_WILD',
  ACTION = 'ACTION',
  RENT = 'RENT',
  BUILDING = 'BUILDING', // House / Hotel
}

export enum DealActionName {
  PASS_GO = 'PASS_GO',
  DEAL_BREAKER = 'DEAL_BREAKER',
  SLY_DEAL = 'SLY_DEAL',
  FORCED_DEAL = 'FORCED_DEAL',
  DEBT_COLLECTOR = 'DEBT_COLLECTOR',
  ITS_MY_BIRTHDAY = 'ITS_MY_BIRTHDAY',
  JUST_SAY_NO = 'JUST_SAY_NO',
  DOUBLE_THE_RENT = 'DOUBLE_THE_RENT',
  HOUSE = 'HOUSE',
  HOTEL = 'HOTEL',
}

export interface DealCard {
  id: DealCardId;
  name: string;
  type: DealCardType;
  value: number; // Value in $M when banked
  color?: DealColor; // For single color property
  colors?: DealColor[]; // For wildcards / dual rent
  currentSelectedColor?: DealColor; // If wildcard, which set it is currently placed in
  actionName?: DealActionName;
  description: string;
  imageUrl?: string;
}

export interface PropertySet {
  color: DealColor;
  cards: DealCard[];
  hasHouse: boolean;
  hasHotel: boolean;
  isComplete: boolean;
  requiredCount: number;
}

export interface DealPlayer {
  id: DealPlayerId;
  name: string;
  type: 'USER' | 'CPU';
  token: string;
  hand: DealCard[];
  bank: DealCard[]; // Money cards & banked actions
  propertySets: Record<DealColor, PropertySet>;
  completedSetsCount: number;
  stats: {
    cardsPlayed: number;
    moneyBanked: number;
    setsCompleted: number;
    dealsBroken: number;
    rentCollected: number;
  };
}

export enum DealGamePhase {
  LOBBY = 'LOBBY',
  START_TURN = 'START_TURN',
  PLAYING = 'PLAYING',
  AWAITING_JUST_SAY_NO = 'AWAITING_JUST_SAY_NO',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  AWAITING_TARGET_SELECTION = 'AWAITING_TARGET_SELECTION',
  AWAITING_DISCARD = 'AWAITING_DISCARD',
  GAME_OVER = 'GAME_OVER',
}

export interface PendingAction {
  sourcePlayerId: DealPlayerId;
  card: DealCard;
  targetPlayerId?: DealPlayerId;
  targetColor?: DealColor;
  targetCardId?: DealCardId;
  swapMyCardId?: DealCardId;
  rentAmount?: number;
  isDoubled?: boolean;
  affectedPlayerIds: DealPlayerId[];
  pendingPaymentPlayerIds: DealPlayerId[];
  amountOwedByPlayer: Record<DealPlayerId, number>;
  justSayNoResponses: Record<DealPlayerId, boolean>;
  chainCount: number; // For counter-counter Just Say No
  lastJustSayNoPlayerId?: DealPlayerId;
}

export interface DealGameState {
  players: DealPlayer[];
  currentPlayerIndex: number;
  phase: DealGamePhase;
  deck: DealCard[];
  discardPile: DealCard[];
  playsRemaining: number; // Max 3 plays per turn
  turnNumber: number;
  pendingAction: PendingAction | null;
  winner: DealPlayer | null;
  logs: string[];
  lastActionCard?: DealCard | null;
  lastActionMessage?: string | null;
}
