import { KNOWN_IDS } from './knownIds.js';

/**
 * Catalog of known PRNG-based chance boosts in Sunflower Land
 * Verified directly from official game logic and dictionary definitions.
 */
export const PROC_PRESETS = [
  {
    id: 'astrolabe-fish-oil',
    name: 'Fish Oil (Astrolabe 2x)',
    boostName: 'Astrolabe',
    itemName: 'Fish Oil',
    itemId: KNOWN_IDS['Fish Oil'] || 2724,
    chance: 15,
    description: '15% chance to double Fermentation & Spice Rack output',
    effect: 'x2 Double Output',
    building: 'Aging Shed (Fermentation Rack)',
    activityKey: 'Fish Oil Processed',
    category: 'aging',
    icon: '🔭',
    procMultiplier: 2,
    isAdditive: false
  },
  {
    id: 'bubble-aura-fish-oil',
    name: 'Fish Oil (Bubble Aura +1)',
    boostName: 'Bubble Aura',
    itemName: 'Fish Oil',
    itemId: KNOWN_IDS['Fish Oil'] || 2724,
    chance: 20,
    description: '20% chance for +1 yield from Fish Processing (Fish Market)',
    effect: '+1 Extra Fish Oil',
    building: 'Fish Market',
    activityKey: 'Fish Oil Processed',
    category: 'processing',
    icon: '🫧',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'astrolabe-refined-salt',
    name: 'Refined Salt (Astrolabe 2x)',
    boostName: 'Astrolabe',
    itemName: 'Refined Salt',
    itemId: KNOWN_IDS['Refined Salt'] || 3014,
    chance: 15,
    description: '15% chance to double Spice Rack output',
    effect: 'x2 Double Output',
    building: 'Aging Shed (Spice Rack)',
    activityKey: 'Refined Salt Processed',
    category: 'aging',
    icon: '🧂',
    procMultiplier: 2,
    isAdditive: false
  },
  {
    id: 'refiner-salt',
    name: 'Refined Salt (Refiner Skill +1)',
    boostName: 'Refiner',
    itemName: 'Refined Salt',
    itemId: KNOWN_IDS['Refined Salt'] || 3014,
    chance: 20,
    description: '20% chance for +1 Refined Salt from Spice Rack',
    effect: '+1 Refined Salt',
    building: 'Aging Shed (Spice Rack)',
    activityKey: 'Refined Salt Processed',
    category: 'aging',
    icon: '🧂',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'cleaver-cooking',
    name: "Master Chef's Cleaver (2x Food)",
    boostName: "Master Chef's Cleaver",
    itemName: 'Cooked Food',
    itemId: KNOWN_IDS['Mashed Potato'] || 401,
    chance: 10,
    description: '10% chance to double food cooked in any kitchen building',
    effect: '+1 Extra Food',
    building: 'Kitchen / Fire Pit / Deli',
    activityKey: 'Cooked',
    category: 'cooking',
    icon: '🔪',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'fiery-jackpot',
    name: 'Fiery Jackpot (Fire Pit +1)',
    boostName: 'Fiery Jackpot',
    itemName: 'Fire Pit Food',
    itemId: KNOWN_IDS['Mashed Potato'] || 401,
    chance: 20,
    description: '20% to 30% chance for +1 food cooked in the Fire Pit',
    effect: '+1 Extra Food',
    building: 'Fire Pit',
    activityKey: 'Cooked',
    category: 'cooking',
    icon: '🔥',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'green-amulet-sunflower',
    name: 'Green Amulet (10x Crop Yield)',
    boostName: 'Green Amulet',
    itemName: 'Sunflower',
    itemId: KNOWN_IDS['Sunflower'] || 201,
    chance: 10,
    description: '10% chance for 10x Crop Yield upon harvest',
    effect: 'x10 Massive Drop',
    building: 'Plots',
    activityKey: 'Sunflower Harvested',
    category: 'crops',
    icon: '📿',
    procMultiplier: 10,
    isAdditive: false
  },
  {
    id: 'green-amulet-pumpkin',
    name: 'Green Amulet (Pumpkin 10x)',
    boostName: 'Green Amulet',
    itemName: 'Pumpkin',
    itemId: KNOWN_IDS['Pumpkin'] || 203,
    chance: 10,
    description: '10% chance for 10x Crop Yield upon harvest',
    effect: 'x10 Massive Drop',
    building: 'Plots',
    activityKey: 'Pumpkin Harvested',
    category: 'crops',
    icon: '🎃',
    procMultiplier: 10,
    isAdditive: false
  },
  {
    id: 'peeled-potato',
    name: 'Peeled Potato (+1 Potato)',
    boostName: 'Peeled Potato',
    itemName: 'Potato',
    itemId: KNOWN_IDS['Potato'] || 202,
    chance: 20,
    description: '20% chance for +1 Potato upon harvest',
    effect: '+1 Potato',
    building: 'Plots',
    activityKey: 'Potato Harvested',
    category: 'crops',
    icon: '🥔',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'potent-potato',
    name: 'Potent Potato (+10 Potato)',
    boostName: 'Potent Potato',
    itemName: 'Potato',
    itemId: KNOWN_IDS['Potato'] || 202,
    chance: 3.3333,
    description: '3.33% (1 in 30) chance for +10 Potato on harvest',
    effect: '+10 Potatoes',
    building: 'Plots',
    activityKey: 'Potato Harvested',
    category: 'crops',
    icon: '🥔',
    procBonus: 10,
    isAdditive: true
  },
  {
    id: 'stellar-sunflower',
    name: 'Stellar Sunflower (+10 Sunflower)',
    boostName: 'Stellar Sunflower',
    itemName: 'Sunflower',
    itemId: KNOWN_IDS['Sunflower'] || 201,
    chance: 3.3333,
    description: '3.33% (1 in 30) chance for +10 Sunflower on harvest',
    effect: '+10 Sunflowers',
    building: 'Plots',
    activityKey: 'Sunflower Harvested',
    category: 'crops',
    icon: '🌻',
    procBonus: 10,
    isAdditive: true
  },
  {
    id: 'radical-radish',
    name: 'Radical Radish (+10 Radish)',
    boostName: 'Radical Radish',
    itemName: 'Radish',
    itemId: KNOWN_IDS['Radish'] || 209,
    chance: 3.3333,
    description: '3.33% (1 in 30) chance for +10 Radish on harvest',
    effect: '+10 Radishes',
    building: 'Plots',
    activityKey: 'Radish Harvested',
    category: 'crops',
    icon: '🔴',
    procBonus: 10,
    isAdditive: true
  },
  {
    id: 'alba-fishing',
    name: 'Alba (+1 Basic Fish)',
    boostName: 'Alba',
    itemName: 'Basic Fish',
    itemId: KNOWN_IDS['Anchovy'] || 1201,
    chance: 50,
    description: '50% chance of +1 Basic Fish',
    effect: '+1 Basic Fish',
    building: 'Fishing Wharf',
    activityKey: 'Fish Caught',
    category: 'fishing',
    icon: '🎣',
    procBonus: 1,
    isAdditive: true
  }
];

/**
 * Search boosts by item name or boost name
 * @param {string} query
 * @returns {Array<typeof PROC_PRESETS[0]>}
 */
export function searchBoosts(query = '') {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) return PROC_PRESETS;
  return PROC_PRESETS.filter(p =>
    p.name.toLowerCase().includes(clean) ||
    p.boostName.toLowerCase().includes(clean) ||
    p.itemName.toLowerCase().includes(clean) ||
    p.description.toLowerCase().includes(clean)
  );
}

/**
 * Find boost preset by ID or boostName
 * @param {string} idOrName
 * @returns {typeof PROC_PRESETS[0] | null}
 */
export function findBoostByName(idOrName = '') {
  const clean = (idOrName || '').toLowerCase().trim();
  return PROC_PRESETS.find(p =>
    p.id.toLowerCase() === clean ||
    p.boostName.toLowerCase() === clean ||
    p.name.toLowerCase() === clean
  ) || null;
}

/**
 * Find all boosts applicable to an item name
 * @param {string} itemName
 * @returns {Array<typeof PROC_PRESETS[0]>}
 */
export function findBoostsByItem(itemName = '') {
  const clean = (itemName || '').toLowerCase().trim();
  return PROC_PRESETS.filter(p => p.itemName.toLowerCase().includes(clean));
}
