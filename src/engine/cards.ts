import { ActionCard, CardActionType, CardDeck } from '../types';

export const CHANCE_DECK: ActionCard[] = [
  { id: 'c1', deck: CardDeck.CHANCE, description: 'Advance to GO. (Collect $200)', actionType: CardActionType.MOVE_TO, targetSpaceId: 'go', isDealMechanic: false },
  { id: 'c2', deck: CardDeck.CHANCE, description: 'Advance to Boardwalk.', actionType: CardActionType.MOVE_TO, targetSpaceId: 'prop_22', isDealMechanic: false },
  { id: 'c3', deck: CardDeck.CHANCE, description: 'Speeding fine $15.', actionType: CardActionType.PAY_MONEY, value: 15, isDealMechanic: false },
  { id: 'c4', deck: CardDeck.CHANCE, description: 'Your building loan matures. Collect $150.', actionType: CardActionType.RECEIVE_MONEY, value: 150, isDealMechanic: false },
  { id: 'c5', deck: CardDeck.CHANCE, description: 'Sly Deal: Steal a property from any player.', actionType: CardActionType.STEAL_PROPERTY, isDealMechanic: true },
  { id: 'c6', deck: CardDeck.CHANCE, description: 'Forced Deal: Swap any property with another player.', actionType: CardActionType.FORCE_TRADE, isDealMechanic: true },
  { id: 'c7', deck: CardDeck.CHANCE, description: 'Go directly to Jail.', actionType: CardActionType.GO_TO_JAIL, isDealMechanic: false },
  { id: 'c8', deck: CardDeck.CHANCE, description: 'Double Rent: The next rent you charge is doubled.', actionType: CardActionType.RENT_MULTIPLIER, value: 2, isDealMechanic: true },
];

export const COMMUNITY_CHEST_DECK: ActionCard[] = [
  { id: 'cc1', deck: CardDeck.COMMUNITY_CHEST, description: 'Bank error in your favor. Collect $200.', actionType: CardActionType.RECEIVE_MONEY, value: 200, isDealMechanic: false },
  { id: 'cc2', deck: CardDeck.COMMUNITY_CHEST, description: 'Doctor\'s fee. Pay $50.', actionType: CardActionType.PAY_MONEY, value: 50, isDealMechanic: false },
  { id: 'cc3', deck: CardDeck.COMMUNITY_CHEST, description: 'It is your birthday. Collect $10 from every player.', actionType: CardActionType.RECEIVE_FROM_PLAYERS, value: 10, isDealMechanic: false },
  { id: 'cc4', deck: CardDeck.COMMUNITY_CHEST, description: 'Get Out of Jail Free.', actionType: CardActionType.GET_OUT_OF_JAIL, isDealMechanic: false },
  { id: 'cc5', deck: CardDeck.COMMUNITY_CHEST, description: 'Deal Breaker: Steal a full property set!', actionType: CardActionType.STEAL_PROPERTY, isDealMechanic: true },
  { id: 'cc6', deck: CardDeck.COMMUNITY_CHEST, description: 'Debt Collector: Force one player to pay you $50.', actionType: CardActionType.RECEIVE_FROM_PLAYERS, value: 50, isDealMechanic: true }, // Simplified to target 1 player logic or all for now
  { id: 'cc7', deck: CardDeck.COMMUNITY_CHEST, description: 'Go directly to Jail.', actionType: CardActionType.GO_TO_JAIL, isDealMechanic: false },
  { id: 'cc8', deck: CardDeck.COMMUNITY_CHEST, description: 'Income tax refund. Collect $20.', actionType: CardActionType.RECEIVE_MONEY, value: 20, isDealMechanic: false },
];

export const shuffleDeck = (deck: ActionCard[]): ActionCard[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};
