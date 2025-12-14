import { CardUpgrade, HouseDebuff, Consumable, Passive } from './types';

export const INITIAL_CREDITS = 100;
export const INITIAL_ESSENCE = 0;
// Increased threshold base to slow down difficulty ramp
export const CORRUPTION_THRESHOLD_BASE = 8;

export const STARTING_UPGRADE_IDS = ['midas_touch', 'soul_siphon', 'firewall_shard'];

export const UPGRADES: CardUpgrade[] = [
  // --- STARTER SET ---
  {
    id: 'midas_touch',
    name: 'Midas Touch',
    description: '+5 Credits when dealt.',
    cost: 50,
    effectType: 'bonus_credits',
    value: 5
  },
  {
    id: 'soul_siphon',
    name: 'Soul Siphon',
    description: '+2 Essence when dealt.',
    cost: 30,
    effectType: 'bonus_essence',
    value: 2
  },
  {
    id: 'firewall_shard',
    name: 'Firewall Shard',
    description: 'If Bust, 50% chance to refund 50% bet.',
    cost: 75,
    effectType: 'shield',
    value: 0.5
  },
  
  // --- UNLOCKABLE SET ---
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    description: 'Wins with this card grant +25% payout.',
    cost: 100,
    effectType: 'critical',
    value: 0.25
  },
  {
    id: 'credit_cache',
    name: 'Credit Cache',
    description: '+15 Credits when dealt.',
    cost: 120,
    effectType: 'bonus_credits',
    value: 15
  },
  {
    id: 'essence_well',
    name: 'Essence Well',
    description: '+4 Essence when dealt.',
    cost: 80,
    effectType: 'bonus_essence',
    value: 4
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Wins with this card grant +50% payout.',
    cost: 200,
    effectType: 'critical',
    value: 0.50
  },
  {
    id: 'emergency_breaker',
    name: 'Emergency Breaker',
    description: 'If Bust, 90% chance to refund 50% bet.',
    cost: 150,
    effectType: 'shield',
    value: 0.9
  },
  {
    id: 'cooling_fan',
    name: 'Cooling Fan',
    description: 'Reduces Threat by 1 when dealt.',
    cost: 100,
    effectType: 'reduce_corruption',
    value: 1
  },
  {
    id: 'recycler',
    name: 'Recycler',
    description: 'If you Bust with this card, gain 5 Essence.',
    cost: 60,
    effectType: 'on_bust_essence',
    value: 5
  },
  {
    id: 'jackpot_protocol',
    name: 'Jackpot Protocol',
    description: 'If this card completes a 21, gain 50 Credits.',
    cost: 110,
    effectType: 'on_21_credits',
    value: 50
  },
  {
    id: 'hybrid_chip',
    name: 'Hybrid Chip',
    description: '+3 Credits and +1 Essence when dealt.',
    cost: 60,
    effectType: 'bonus_credits', // We'll handle this as a composite or just primary effect for display, but logic needs to know? 
    // Wait, array upgrades allows multiple effects, but here we define single Upgrade objects. 
    // Let's keep it simple: It's a bonus_credits upgrade that acts as both? 
    // No, cleaner to make it just one primary type for categorization or create a new type.
    // For simplicity in this architecture, let's make it primarily credits but we'll hardcode the secondary effect in App.tsx or use a special ID check.
    // actually, let's just make it a big credit booster for now to avoid complexity, or just swap it for something else.
    // Let's swap for "Risk Processor"
    value: 3
  },
  {
    id: 'risk_processor',
    name: 'Risk Processor',
    description: '+15 Credits when dealt, but +1 Threat.',
    cost: 80,
    effectType: 'risk_corruption',
    value: 15 // Credits value
  },
  {
    id: 'essence_converter',
    name: 'Essence Converter',
    description: '-5 Credits but +3 Essence when dealt.',
    cost: 70,
    effectType: 'bonus_essence',
    value: 3
  },
  {
    id: 'parity_bit',
    name: 'Parity Bit',
    description: '+10 Credits when dealt.',
    cost: 90,
    effectType: 'bonus_credits',
    value: 10
  }
];

export const CONSUMABLES: Consumable[] = [
  {
    id: 'data_spike',
    name: 'Data Spike',
    description: 'Reveal the Dealer\'s hidden card.',
    cost: 15,
    type: 'reveal_dealer'
  },
  {
    id: 'coolant',
    name: 'System Coolant',
    description: 'Reduces Threat Level progress by 2.',
    cost: 25,
    type: 'reduce_threat'
  },
  {
    id: 'override_chip',
    name: 'Override Chip',
    description: 'The next card you Hit will be a 10 or Face card.',
    cost: 40,
    type: 'guarantee_10'
  }
];

export const PASSIVES: Passive[] = [
  // BOONS
  {
    id: 'auto_miner',
    name: 'Auto-Miner',
    description: 'Gain +1 Essence at the start of every hand.',
    type: 'boon',
    cost: 100,
    rarity: 'common'
  },
  {
    id: 'vip_protocol',
    name: 'VIP Protocol',
    description: 'Start with 110 Credits after a Game Over (Permanent reset bonus not implemented yet, just +10 Max Bet cap maybe?). Actually: +10% Payouts.',
    type: 'boon',
    cost: 150,
    rarity: 'rare'
  },
  {
    id: 'backup_battery',
    name: 'Backup Battery',
    description: 'If you have 0 Essence, gain 5 Essence.',
    type: 'boon',
    cost: 80,
    rarity: 'common'
  },
  
  // CURSES
  {
    id: 'memory_leak',
    name: 'Memory Leak',
    description: '-1 Credit every time you Hit.',
    type: 'curse'
  },
  {
    id: 'encryption_error',
    name: 'Encryption Error',
    description: 'Shop prices +20%.',
    type: 'curse'
  },
  {
    id: 'power_surge',
    name: 'Power Surge',
    description: 'Take 1 damage to Corruption Threshold (It lowers!)',
    type: 'curse'
  }
];

// REBALANCED DEBUFFS
export const HOUSE_DEBUFFS: Record<number, HouseDebuff> = {
  1: { level: 1, name: "The Awakening", description: "The House is watching. No effects yet." },
  2: { level: 2, name: "Surveillance", description: "Standard security. No adverse effects." },
  3: { level: 3, name: "Essence Tax", description: "Essence gain reduced by 1 per card." },
  4: { level: 4, name: "Inflation", description: "Upgrade costs increased by 50%." },
  // Boss Level
  5: { level: 5, name: "BOSS: The Architect", description: "Dealer starts with a Face Card (K). Dealer wins Ties." },
  6: { level: 6, name: "Void Stare", description: "Dealer hides both cards until turn end." },
  7: { level: 7, name: "Rigged Table", description: "Dealer wins ties (Permanent)." },
};