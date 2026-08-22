import { HouseRules } from '../types';

export interface RulesPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  rules: HouseRules;
}

export const RULES_PRESETS: RulesPreset[] = [
  {
    id: 'official',
    name: 'Official Tournament',
    badge: '🏆 Strict & Balanced',
    description: 'Standard championship rules. Property auctions enabled, no Free Parking jackpot, standard $1500 start.',
    rules: {
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
    }
  },
  {
    id: 'family',
    name: 'Classic Family Night',
    badge: '👨‍👩‍👧‍👦 Fun & Generous',
    description: 'Generous house favorites! Free Parking jackpot accumulates fees, double payout on GO, snake eyes bonus, and safe jail.',
    rules: {
      freeParkingJackpot: true,
      doubleGo: true,
      noRentInJail: true,
      propertyAuctions: false,
      highRollerStart: false,
      snakeEyesBonus: true,
      buildWithoutMonopoly: false,
      ignoreEvenBuild: false,
      firstLapLockdown: false,
      wealthTax: false,
      mercyRule: false,
      rentControl: false,
      forcedJailBail: false,
    }
  },
  {
    id: 'tycoon',
    name: 'High Roller Tycoon',
    badge: '💰 Rapid Expansion',
    description: 'Start with $2500, develop houses without needing full monopolies, build unevenly, and collect massive pots.',
    rules: {
      freeParkingJackpot: true,
      doubleGo: true,
      noRentInJail: false,
      propertyAuctions: true,
      highRollerStart: true,
      snakeEyesBonus: true,
      buildWithoutMonopoly: true,
      ignoreEvenBuild: true,
      firstLapLockdown: false,
      wealthTax: true,
      mercyRule: false,
      rentControl: false,
      forcedJailBail: false,
    }
  },
  {
    id: 'speedrun',
    name: 'Speed Run Blitz',
    badge: '⚡ Fast 15-Min Action',
    description: 'Accelerated pacing with $2500 start, mandatory auctions, immediate jail exits, and $5000 Mercy Rule victory.',
    rules: {
      freeParkingJackpot: true,
      doubleGo: true,
      noRentInJail: false,
      propertyAuctions: true,
      highRollerStart: true,
      snakeEyesBonus: true,
      buildWithoutMonopoly: false,
      ignoreEvenBuild: true,
      firstLapLockdown: false,
      wealthTax: false,
      mercyRule: true,
      rentControl: false,
      forcedJailBail: true,
    }
  },
  {
    id: 'hardcore',
    name: 'No Mercy Hardcore',
    badge: '🔥 Ruthless Survival',
    description: 'Wealth taxes active, first lap purchase lockdown, forced instant bail, and aggressive property auctioning.',
    rules: {
      freeParkingJackpot: false,
      doubleGo: false,
      noRentInJail: false,
      propertyAuctions: true,
      highRollerStart: false,
      snakeEyesBonus: false,
      buildWithoutMonopoly: false,
      ignoreEvenBuild: false,
      firstLapLockdown: true,
      wealthTax: true,
      mercyRule: false,
      rentControl: false,
      forcedJailBail: true,
    }
  }
];
