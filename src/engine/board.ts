import { Space, SpaceType, PropertyState } from '../types';

export const GAME_TOKENS = [
  '🥷🏾', // Ninja (N8 / Default)
  '🚗', // Vintage Car
  '🎩', // Top Hat
  '🐕', // Scottie Dog
  '👞', // Classic Shoe
  '🚢', // Battleship
  '🚂', // Steam Train
  '🚜', // Tractor
  '🏎️', // Race Car
  '✈️', // Jet Airplane
  '🚀', // Rocket Ship
  '🛸', // Flying Saucer
  '🤖', // Robot
  '🦄', // Unicorn
  '🦖', // T-Rex Dinosaur
  '🍕', // Pizza
  '🍔', // Burger
  '🤠', // Cowboy
  '👻', // Ghost
  '👾', // Space Alien
  '🤡', // Jester / Clown
  '🦊', // Fox
  '🦁', // Lion
  '🐼', // Panda
  '🐸', // Frog
  '🐙', // Octopus
  '🦋', // Butterfly
  '🎸', // Electric Guitar
  '🛹', // Skateboard
  '🏀', // Basketball
  '⚽', // Soccer Ball
  '🎱', // 8-Ball
  '💎', // Diamond
  '👑', // Royal Crown
  '🔥', // Flame
  '🧊', // Ice Cube
];

export const SPACES: Space[] = [
  { id: 'go', name: 'GO', type: SpaceType.GO, position: 0 },
  { id: 'prop_1', name: 'Mediterranean Ave', type: SpaceType.PROPERTY, position: 1, price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, groupColor: '#8B4513' },
  { id: 'cc_1', name: 'Community Chest', type: SpaceType.COMMUNITY_CHEST, position: 2 },
  { id: 'prop_2', name: 'Baltic Ave', type: SpaceType.PROPERTY, position: 3, price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, groupColor: '#8B4513' },
  { id: 'tax_1', name: 'Income Tax', type: SpaceType.TAX, position: 4, price: 200 },
  { id: 'rr_1', name: 'Reading Railroad', type: SpaceType.RAILROAD, position: 5, price: 200 },
  { id: 'prop_3', name: 'Oriental Ave', type: SpaceType.PROPERTY, position: 6, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, groupColor: '#87CEEB' },
  { id: 'chance_1', name: 'Chance', type: SpaceType.CHANCE, position: 7 },
  { id: 'prop_4', name: 'Vermont Ave', type: SpaceType.PROPERTY, position: 8, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, groupColor: '#87CEEB' },
  { id: 'prop_5', name: 'Connecticut Ave', type: SpaceType.PROPERTY, position: 9, price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, groupColor: '#87CEEB' },
  { id: 'jail', name: 'Just Visiting', type: SpaceType.JAIL, position: 10 },
  { id: 'prop_6', name: 'St. Charles Place', type: SpaceType.PROPERTY, position: 11, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, groupColor: '#FF1493' },
  { id: 'util_1', name: 'Electric Company', type: SpaceType.UTILITY, position: 12, price: 150 },
  { id: 'prop_7', name: 'States Ave', type: SpaceType.PROPERTY, position: 13, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, groupColor: '#FF1493' },
  { id: 'prop_8', name: 'Virginia Ave', type: SpaceType.PROPERTY, position: 14, price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, groupColor: '#FF1493' },
  { id: 'rr_2', name: 'Pennsylvania Railroad', type: SpaceType.RAILROAD, position: 15, price: 200 },
  { id: 'prop_9', name: 'St. James Place', type: SpaceType.PROPERTY, position: 16, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, groupColor: '#FFA500' },
  { id: 'cc_2', name: 'Community Chest', type: SpaceType.COMMUNITY_CHEST, position: 17 },
  { id: 'prop_10', name: 'Tennessee Ave', type: SpaceType.PROPERTY, position: 18, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, groupColor: '#FFA500' },
  { id: 'prop_11', name: 'New York Ave', type: SpaceType.PROPERTY, position: 19, price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, groupColor: '#FFA500' },
  { id: 'parking', name: 'Free Parking', type: SpaceType.FREE_PARKING, position: 20 },
  { id: 'prop_12', name: 'Kentucky Ave', type: SpaceType.PROPERTY, position: 21, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, groupColor: '#FF0000' },
  { id: 'chance_2', name: 'Chance', type: SpaceType.CHANCE, position: 22 },
  { id: 'prop_13', name: 'Indiana Ave', type: SpaceType.PROPERTY, position: 23, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, groupColor: '#FF0000' },
  { id: 'prop_14', name: 'Illinois Ave', type: SpaceType.PROPERTY, position: 24, price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, groupColor: '#FF0000' },
  { id: 'rr_3', name: 'B. & O. Railroad', type: SpaceType.RAILROAD, position: 25, price: 200 },
  { id: 'prop_15', name: 'Atlantic Ave', type: SpaceType.PROPERTY, position: 26, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, groupColor: '#FFFF00' },
  { id: 'prop_16', name: 'Ventnor Ave', type: SpaceType.PROPERTY, position: 27, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, groupColor: '#FFFF00' },
  { id: 'util_2', name: 'Water Works', type: SpaceType.UTILITY, position: 28, price: 150 },
  { id: 'prop_17', name: 'Marvin Gardens', type: SpaceType.PROPERTY, position: 29, price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, groupColor: '#FFFF00' },
  { id: 'go_to_jail', name: 'Go To Jail', type: SpaceType.GO_TO_JAIL, position: 30 },
  { id: 'prop_18', name: 'Pacific Ave', type: SpaceType.PROPERTY, position: 31, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, groupColor: '#008000' },
  { id: 'prop_19', name: 'North Carolina Ave', type: SpaceType.PROPERTY, position: 32, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, groupColor: '#008000' },
  { id: 'cc_3', name: 'Community Chest', type: SpaceType.COMMUNITY_CHEST, position: 33 },
  { id: 'prop_20', name: 'Pennsylvania Ave', type: SpaceType.PROPERTY, position: 34, price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, groupColor: '#008000' },
  { id: 'rr_4', name: 'Short Line', type: SpaceType.RAILROAD, position: 35, price: 200 },
  { id: 'chance_3', name: 'Chance', type: SpaceType.CHANCE, position: 36 },
  { id: 'prop_21', name: 'Park Place', type: SpaceType.PROPERTY, position: 37, price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, groupColor: '#0000FF' },
  { id: 'tax_2', name: 'Luxury Tax', type: SpaceType.TAX, position: 38, price: 100 },
  { id: 'prop_22', name: 'Boardwalk', type: SpaceType.PROPERTY, position: 39, price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, groupColor: '#0000FF' }
];

export const generateInitialPropertyStates = (): Record<string, PropertyState> => {
  const states: Record<string, PropertyState> = {};
  SPACES.forEach(space => {
    if ([SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(space.type)) {
      states[space.id] = {
        propertyId: space.id,
        ownerId: null,
        houses: 0,
        hasHotel: false,
        isMortgaged: false
      };
    }
  });
  return states;
};
