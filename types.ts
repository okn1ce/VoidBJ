export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effectType: 'bonus_credits' | 'bonus_essence' | 'shield' | 'critical' | 'reduce_corruption' | 'on_bust_essence' | 'on_21_credits' | 'risk_corruption';
  value: number;
}

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number; // Data Fragments cost
}

export interface GlobalState {
  fragments: number;
  unlockedHacks: string[];
  totalRuns: number;
}

export type ConsumableType = 'reveal_dealer' | 'reduce_threat' | 'guarantee_10';

export interface Consumable {
  id: string;
  name: string;
  description: string;
  cost: number; // Essence cost
  type: ConsumableType;
}

export type PassiveType = 'boon' | 'curse';

export interface Passive {
  id: string;
  name: string;
  description: string;
  type: PassiveType;
  cost?: number; // Boons have cost in shop
  rarity?: 'common' | 'rare' | 'legendary';
}

export interface PlayingCard {
  id: string; // Unique ID to track upgrades per specific card
  suit: Suit;
  rank: Rank;
  value: number; // Numeric blackjack value
  upgrades: CardUpgrade[];
}

export type GamePhase = 'betting' | 'playing' | 'dealer_turn' | 'round_over' | 'forge' | 'game_over' | 'upgrade_selection';

export interface HouseDebuff {
  level: number;
  name: string;
  description: string;
}

export interface GameState {
  credits: number;
  essence: number;
  
  // Deck Management
  playerDeck: PlayingCard[]; // The persistent "master" deck
  drawPile: PlayingCard[];
  discardPile: PlayingCard[];
  
  // Inventory & Passives
  inventory: Consumable[];
  activePassives: Passive[];
  
  // Unlocks
  unlockedUpgrades: string[]; // List of Upgrade IDs currently in the shop
  offeredUpgradeIds: string[]; // IDs of upgrades offered during level up

  // Current Hand
  playerHand: PlayingCard[];
  dealerHand: PlayingCard[];
  currentBet: number;
  dealerCardRevealed: boolean; // For the reveal item
  
  // Progression
  houseLevel: number;
  corruptionTokens: number;
  corruptionThreshold: number;
  
  // State
  phase: GamePhase;
  message: string;
}