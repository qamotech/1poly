import { DealCard, DealCardType, DealColor, DealActionName, PropertySet } from './dealTypes';

export const COLOR_CONFIG: Record<DealColor, { name: string; requiredCount: number; rentValues: number[]; hex: string; bgClass: string; textClass: string; borderClass: string }> = {
  [DealColor.BROWN]: {
    name: 'Brown',
    requiredCount: 2,
    rentValues: [1, 2],
    hex: '#8B4513',
    bgClass: 'bg-amber-900',
    textClass: 'text-amber-200',
    borderClass: 'border-amber-700',
  },
  [DealColor.DARK_BLUE]: {
    name: 'Dark Blue',
    requiredCount: 2,
    rentValues: [3, 8],
    hex: '#00008B',
    bgClass: 'bg-blue-900',
    textClass: 'text-blue-200',
    borderClass: 'border-blue-700',
  },
  [DealColor.GREEN]: {
    name: 'Green',
    requiredCount: 3,
    rentValues: [1, 4, 7],
    hex: '#008000',
    bgClass: 'bg-emerald-800',
    textClass: 'text-emerald-200',
    borderClass: 'border-emerald-600',
  },
  [DealColor.YELLOW]: {
    name: 'Yellow',
    requiredCount: 3,
    rentValues: [1, 4, 6],
    hex: '#FFD700',
    bgClass: 'bg-yellow-600',
    textClass: 'text-yellow-100',
    borderClass: 'border-yellow-500',
  },
  [DealColor.RED]: {
    name: 'Red',
    requiredCount: 3,
    rentValues: [1, 3, 6],
    hex: '#DC2626',
    bgClass: 'bg-red-700',
    textClass: 'text-red-100',
    borderClass: 'border-red-500',
  },
  [DealColor.ORANGE]: {
    name: 'Orange',
    requiredCount: 3,
    rentValues: [1, 3, 5],
    hex: '#EA580C',
    bgClass: 'bg-orange-700',
    textClass: 'text-orange-100',
    borderClass: 'border-orange-500',
  },
  [DealColor.PINK]: {
    name: 'Pink',
    requiredCount: 3,
    rentValues: [1, 2, 4],
    hex: '#DB2777',
    bgClass: 'bg-pink-700',
    textClass: 'text-pink-100',
    borderClass: 'border-pink-500',
  },
  [DealColor.LIGHT_BLUE]: {
    name: 'Light Blue',
    requiredCount: 3,
    rentValues: [1, 2, 3],
    hex: '#0284C7',
    bgClass: 'bg-sky-600',
    textClass: 'text-sky-100',
    borderClass: 'border-sky-400',
  },
  [DealColor.RAILROAD]: {
    name: 'Railroad',
    requiredCount: 4,
    rentValues: [1, 2, 3, 4],
    hex: '#1E293B',
    bgClass: 'bg-slate-800',
    textClass: 'text-slate-100',
    borderClass: 'border-slate-600',
  },
  [DealColor.UTILITY]: {
    name: 'Utility',
    requiredCount: 2,
    rentValues: [1, 2],
    hex: '#0D9488',
    bgClass: 'bg-teal-700',
    textClass: 'text-teal-100',
    borderClass: 'border-teal-500',
  },
  [DealColor.ANY]: {
    name: 'Wild (All Colors)',
    requiredCount: 0,
    rentValues: [0],
    hex: '#6366F1',
    bgClass: 'bg-gradient-to-r from-rose-600 via-amber-500 to-indigo-600',
    textClass: 'text-white',
    borderClass: 'border-yellow-400',
  }
};

export const ALL_PLAYABLE_COLORS: DealColor[] = [
  DealColor.BROWN,
  DealColor.DARK_BLUE,
  DealColor.GREEN,
  DealColor.YELLOW,
  DealColor.RED,
  DealColor.ORANGE,
  DealColor.PINK,
  DealColor.LIGHT_BLUE,
  DealColor.RAILROAD,
  DealColor.UTILITY,
];

export function createEmptyPropertySets(): Record<DealColor, PropertySet> {
  const sets: Partial<Record<DealColor, PropertySet>> = {};
  for (const color of ALL_PLAYABLE_COLORS) {
    sets[color] = {
      color,
      cards: [],
      hasHouse: false,
      hasHotel: false,
      isComplete: false,
      requiredCount: COLOR_CONFIG[color].requiredCount,
    };
  }
  // Wild set placeholder
  sets[DealColor.ANY] = {
    color: DealColor.ANY,
    cards: [],
    hasHouse: false,
    hasHotel: false,
    isComplete: false,
    requiredCount: 0,
  };
  return sets as Record<DealColor, PropertySet>;
}

export function generateDealDeck(): DealCard[] {
  let cards: DealCard[] = [];
  let cardCount = 1;

  const makeId = (prefix: string) => `card_${prefix}_${cardCount++}`;

  // 1. Money Cards (20 cards)
  // 1x $10M
  cards.push({ id: makeId('m10'), name: '$10M Money', type: DealCardType.MONEY, value: 10, description: 'Bank $10M into your bank pile to pay future debts.' });
  // 2x $5M
  for (let i = 0; i < 2; i++) cards.push({ id: makeId('m5'), name: '$5M Money', type: DealCardType.MONEY, value: 5, description: 'Bank $5M into your bank pile.' });
  // 3x $4M
  for (let i = 0; i < 3; i++) cards.push({ id: makeId('m4'), name: '$4M Money', type: DealCardType.MONEY, value: 4, description: 'Bank $4M into your bank pile.' });
  // 3x $3M
  for (let i = 0; i < 3; i++) cards.push({ id: makeId('m3'), name: '$3M Money', type: DealCardType.MONEY, value: 3, description: 'Bank $3M into your bank pile.' });
  // 5x $2M
  for (let i = 0; i < 5; i++) cards.push({ id: makeId('m2'), name: '$2M Money', type: DealCardType.MONEY, value: 2, description: 'Bank $2M into your bank pile.' });
  // 6x $1M
  for (let i = 0; i < 6; i++) cards.push({ id: makeId('m1'), name: '$1M Money', type: DealCardType.MONEY, value: 1, description: 'Bank $1M into your bank pile.' });

  // 2. Standard Property Cards (28 cards)
  // Brown (2)
  cards.push({ id: makeId('p_br1'), name: 'Mediterranean Avenue', type: DealCardType.PROPERTY, value: 1, color: DealColor.BROWN, description: 'Brown Property (Set requires 2).' });
  cards.push({ id: makeId('p_br2'), name: 'Baltic Avenue', type: DealCardType.PROPERTY, value: 1, color: DealColor.BROWN, description: 'Brown Property (Set requires 2).' });

  // Dark Blue (2)
  cards.push({ id: makeId('p_db1'), name: 'Boardwalk', type: DealCardType.PROPERTY, value: 4, color: DealColor.DARK_BLUE, description: 'Dark Blue Property (Set requires 2).' });
  cards.push({ id: makeId('p_db2'), name: 'Park Place', type: DealCardType.PROPERTY, value: 4, color: DealColor.DARK_BLUE, description: 'Dark Blue Property (Set requires 2).' });

  // Green (3)
  cards.push({ id: makeId('p_gr1'), name: 'North Carolina Avenue', type: DealCardType.PROPERTY, value: 4, color: DealColor.GREEN, description: 'Green Property (Set requires 3).' });
  cards.push({ id: makeId('p_gr2'), name: 'Pacific Avenue', type: DealCardType.PROPERTY, value: 4, color: DealColor.GREEN, description: 'Green Property (Set requires 3).' });
  cards.push({ id: makeId('p_gr3'), name: 'Pennsylvania Avenue', type: DealCardType.PROPERTY, value: 4, color: DealColor.GREEN, description: 'Green Property (Set requires 3).' });

  // Yellow (3)
  cards.push({ id: makeId('p_yl1'), name: 'Atlantic Avenue', type: DealCardType.PROPERTY, value: 3, color: DealColor.YELLOW, description: 'Yellow Property (Set requires 3).' });
  cards.push({ id: makeId('p_yl2'), name: 'Ventnor Avenue', type: DealCardType.PROPERTY, value: 3, color: DealColor.YELLOW, description: 'Yellow Property (Set requires 3).' });
  cards.push({ id: makeId('p_yl3'), name: 'Marvin Gardens', type: DealCardType.PROPERTY, value: 3, color: DealColor.YELLOW, description: 'Yellow Property (Set requires 3).' });

  // Red (3)
  cards.push({ id: makeId('p_rd1'), name: 'Illinois Avenue', type: DealCardType.PROPERTY, value: 3, color: DealColor.RED, description: 'Red Property (Set requires 3).' });
  cards.push({ id: makeId('p_rd2'), name: 'Indiana Avenue', type: DealCardType.PROPERTY, value: 3, color: DealColor.RED, description: 'Red Property (Set requires 3).' });
  cards.push({ id: makeId('p_rd3'), name: 'Kentucky Avenue', type: DealCardType.PROPERTY, value: 3, color: DealColor.RED, description: 'Red Property (Set requires 3).' });

  // Orange (3)
  cards.push({ id: makeId('p_or1'), name: 'New York Avenue', type: DealCardType.PROPERTY, value: 2, color: DealColor.ORANGE, description: 'Orange Property (Set requires 3).' });
  cards.push({ id: makeId('p_or2'), name: 'St. James Place', type: DealCardType.PROPERTY, value: 2, color: DealColor.ORANGE, description: 'Orange Property (Set requires 3).' });
  cards.push({ id: makeId('p_or3'), name: 'Tennessee Avenue', type: DealCardType.PROPERTY, value: 2, color: DealColor.ORANGE, description: 'Orange Property (Set requires 3).' });

  // Pink (3)
  cards.push({ id: makeId('p_pk1'), name: 'St. Charles Place', type: DealCardType.PROPERTY, value: 2, color: DealColor.PINK, description: 'Pink Property (Set requires 3).' });
  cards.push({ id: makeId('p_pk2'), name: 'States Avenue', type: DealCardType.PROPERTY, value: 2, color: DealColor.PINK, description: 'Pink Property (Set requires 3).' });
  cards.push({ id: makeId('p_pk3'), name: 'Virginia Avenue', type: DealCardType.PROPERTY, value: 2, color: DealColor.PINK, description: 'Pink Property (Set requires 3).' });

  // Light Blue (3)
  cards.push({ id: makeId('p_lb1'), name: 'Connecticut Avenue', type: DealCardType.PROPERTY, value: 1, color: DealColor.LIGHT_BLUE, description: 'Light Blue Property (Set requires 3).' });
  cards.push({ id: makeId('p_lb2'), name: 'Oriental Avenue', type: DealCardType.PROPERTY, value: 1, color: DealColor.LIGHT_BLUE, description: 'Light Blue Property (Set requires 3).' });
  cards.push({ id: makeId('p_lb3'), name: 'Vermont Avenue', type: DealCardType.PROPERTY, value: 1, color: DealColor.LIGHT_BLUE, description: 'Light Blue Property (Set requires 3).' });

  // Railroad (4)
  cards.push({ id: makeId('p_rr1'), name: 'Reading Railroad', type: DealCardType.PROPERTY, value: 2, color: DealColor.RAILROAD, description: 'Railroad Property (Set requires 4).' });
  cards.push({ id: makeId('p_rr2'), name: 'Pennsylvania Railroad', type: DealCardType.PROPERTY, value: 2, color: DealColor.RAILROAD, description: 'Railroad Property (Set requires 4).' });
  cards.push({ id: makeId('p_rr3'), name: 'B. & O. Railroad', type: DealCardType.PROPERTY, value: 2, color: DealColor.RAILROAD, description: 'Railroad Property (Set requires 4).' });
  cards.push({ id: makeId('p_rr4'), name: 'Short Line', type: DealCardType.PROPERTY, value: 2, color: DealColor.RAILROAD, description: 'Railroad Property (Set requires 4).' });

  // Utility (2)
  cards.push({ id: makeId('p_ut1'), name: 'Electric Company', type: DealCardType.PROPERTY, value: 2, color: DealColor.UTILITY, description: 'Utility Property (Set requires 2).' });
  cards.push({ id: makeId('p_ut2'), name: 'Water Works', type: DealCardType.PROPERTY, value: 2, color: DealColor.UTILITY, description: 'Utility Property (Set requires 2).' });

  // 3. Property Wildcards (11 cards)
  // 2x Multi-Color Wildcard (all 10 colors)
  for (let i = 0; i < 2; i++) {
    cards.push({
      id: makeId('pw_multi'),
      name: 'Multi-Color Property Wildcard',
      type: DealCardType.PROPERTY_WILD,
      value: 0,
      colors: ALL_PLAYABLE_COLORS,
      currentSelectedColor: DealColor.DARK_BLUE,
      description: 'Can be placed in any property set. Can be swapped between sets during your turn.',
    });
  }

  // Dual Color Wildcards
  // 1x Dark Blue / Green
  cards.push({ id: makeId('pw_db_gr'), name: 'Dark Blue / Green Wildcard', type: DealCardType.PROPERTY_WILD, value: 4, colors: [DealColor.DARK_BLUE, DealColor.GREEN], currentSelectedColor: DealColor.DARK_BLUE, description: 'Play in either Dark Blue or Green property set.' });
  // 2x Pink / Orange
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('pw_pk_or'), name: 'Pink / Orange Wildcard', type: DealCardType.PROPERTY_WILD, value: 2, colors: [DealColor.PINK, DealColor.ORANGE], currentSelectedColor: DealColor.ORANGE, description: 'Play in either Pink or Orange property set.' });
  }
  // 2x Red / Yellow
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('pw_rd_yl'), name: 'Red / Yellow Wildcard', type: DealCardType.PROPERTY_WILD, value: 3, colors: [DealColor.RED, DealColor.YELLOW], currentSelectedColor: DealColor.RED, description: 'Play in either Red or Yellow property set.' });
  }
  // 1x Light Blue / Brown
  cards.push({ id: makeId('pw_lb_br'), name: 'Light Blue / Brown Wildcard', type: DealCardType.PROPERTY_WILD, value: 1, colors: [DealColor.LIGHT_BLUE, DealColor.BROWN], currentSelectedColor: DealColor.LIGHT_BLUE, description: 'Play in either Light Blue or Brown property set.' });
  // 1x Light Blue / Railroad
  cards.push({ id: makeId('pw_lb_rr'), name: 'Light Blue / Railroad Wildcard', type: DealCardType.PROPERTY_WILD, value: 4, colors: [DealColor.LIGHT_BLUE, DealColor.RAILROAD], currentSelectedColor: DealColor.RAILROAD, description: 'Play in either Light Blue or Railroad set.' });
  // 1x Green / Railroad
  cards.push({ id: makeId('pw_gr_rr'), name: 'Green / Railroad Wildcard', type: DealCardType.PROPERTY_WILD, value: 4, colors: [DealColor.GREEN, DealColor.RAILROAD], currentSelectedColor: DealColor.GREEN, description: 'Play in either Green or Railroad set.' });
  // 1x Utility / Railroad
  cards.push({ id: makeId('pw_ut_rr'), name: 'Railroad / Utility Wildcard', type: DealCardType.PROPERTY_WILD, value: 2, colors: [DealColor.RAILROAD, DealColor.UTILITY], currentSelectedColor: DealColor.RAILROAD, description: 'Play in either Railroad or Utility set.' });

  // 4. Action Cards (34 cards)
  // 10x Pass Go
  for (let i = 0; i < 10; i++) {
    cards.push({ id: makeId('act_go'), name: 'Pass Go', type: DealCardType.ACTION, value: 1, actionName: DealActionName.PASS_GO, description: 'Draw 2 extra cards immediately.' });
  }
  // 2x Deal Breaker
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('act_db'), name: 'Deal Breaker', type: DealCardType.ACTION, value: 5, actionName: DealActionName.DEAL_BREAKER, description: 'Steal an entire completed property set from any player (includes buildings!).' });
  }
  // 3x Sly Deal
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('act_sly'), name: 'Sly Deal', type: DealCardType.ACTION, value: 3, actionName: DealActionName.SLY_DEAL, description: 'Steal 1 property card from an opponent (cannot be from a completed set).' });
  }
  // 3x Forced Deal
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('act_force'), name: 'Forced Deal', type: DealCardType.ACTION, value: 3, actionName: DealActionName.FORCED_DEAL, description: 'Swap 1 of your properties for 1 of an opponent\'s properties (cannot be from full sets).' });
  }
  // 3x Debt Collector
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('act_debt'), name: 'Debt Collector', type: DealCardType.ACTION, value: 3, actionName: DealActionName.DEBT_COLLECTOR, description: 'Demand $5M from any one player.' });
  }
  // 3x It's My Birthday
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('act_bday'), name: "It's My Birthday", type: DealCardType.ACTION, value: 2, actionName: DealActionName.ITS_MY_BIRTHDAY, description: 'All players must pay you $2M as a birthday gift.' });
  }
  // 3x Just Say No
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('act_no'), name: 'Just Say No', type: DealCardType.ACTION, value: 4, actionName: DealActionName.JUST_SAY_NO, description: 'Cancel any Action card played against you! Can be played at any time.' });
  }
  // 3x House
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('bld_house'), name: 'House', type: DealCardType.BUILDING, value: 3, actionName: DealActionName.HOUSE, description: 'Add to a full set for +$3M rent. (Limit 1 House per set, except Railroad/Utility).' });
  }
  // 2x Hotel
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('bld_hotel'), name: 'Hotel', type: DealCardType.BUILDING, value: 4, actionName: DealActionName.HOTEL, description: 'Add to a full set with a House for +$4M rent. (Limit 1 Hotel per set).' });
  }
  // 2x Double The Rent
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('act_double'), name: 'Double The Rent', type: DealCardType.ACTION, value: 1, actionName: DealActionName.DOUBLE_THE_RENT, description: 'Play alongside a Rent card to double the total rent charged to players.' });
  }

  // 5. Rent Cards (17 cards)
  // 2x Dark Blue / Green
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('rent_db_gr'), name: 'Rent (Dark Blue / Green)', type: DealCardType.RENT, value: 1, colors: [DealColor.DARK_BLUE, DealColor.GREEN], description: 'Charge all players rent for either Dark Blue or Green properties you own.' });
  }
  // 2x Red / Yellow
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('rent_rd_yl'), name: 'Rent (Red / Yellow)', type: DealCardType.RENT, value: 1, colors: [DealColor.RED, DealColor.YELLOW], description: 'Charge all players rent for either Red or Yellow properties you own.' });
  }
  // 2x Pink / Orange
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('rent_pk_or'), name: 'Rent (Pink / Orange)', type: DealCardType.RENT, value: 1, colors: [DealColor.PINK, DealColor.ORANGE], description: 'Charge all players rent for either Pink or Orange properties you own.' });
  }
  // 2x Light Blue / Brown
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('rent_lb_br'), name: 'Rent (Light Blue / Brown)', type: DealCardType.RENT, value: 1, colors: [DealColor.LIGHT_BLUE, DealColor.BROWN], description: 'Charge all players rent for either Light Blue or Brown properties you own.' });
  }
  // 2x Railroad / Utility
  for (let i = 0; i < 2; i++) {
    cards.push({ id: makeId('rent_rr_ut'), name: 'Rent (Railroad / Utility)', type: DealCardType.RENT, value: 1, colors: [DealColor.RAILROAD, DealColor.UTILITY], description: 'Charge all players rent for either Railroad or Utility properties you own.' });
  }
  // 3x Wild Rent (Target 1 player with any color you own)
  for (let i = 0; i < 3; i++) {
    cards.push({ id: makeId('rent_wild'), name: 'Wild Rent', type: DealCardType.RENT, value: 3, colors: ALL_PLAYABLE_COLORS, description: 'Force ONE player to pay rent on ANY single color property set you own.' });
  }

  return shuffleDeck(cards);
}

export function shuffleDeck(deck: DealCard[]): DealCard[] {
  const array = [...deck];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function calculateSetRent(set: PropertySet): number {
  if (set.cards.length === 0) return 0;
  const config = COLOR_CONFIG[set.color];
  const count = Math.min(set.cards.length, config.requiredCount);
  let baseRent = config.rentValues[count - 1] || 0;

  if (set.isComplete) {
    if (set.hasHouse) baseRent += 3;
    if (set.hasHotel) baseRent += 4;
  }
  return baseRent;
}

export function recalculatePlayerPropertySets(player: { propertySets: Record<DealColor, PropertySet> }): number {
  let completedCount = 0;
  for (const color of ALL_PLAYABLE_COLORS) {
    const set = player.propertySets[color];
    const required = COLOR_CONFIG[color].requiredCount;
    set.isComplete = set.cards.length >= required;
    if (set.isComplete) {
      completedCount++;
    } else {
      // If no longer complete, houses/hotels must be removed/returned
      set.hasHouse = false;
      set.hasHotel = false;
    }
  }
  return completedCount;
}
