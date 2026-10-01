import { KNOWN_IDS } from './knownIds.js';

/**
 * Complete Building Catalog for Sunflower Land PRNG & Proc Prediction
 * Grouped by building, retrieved from official game rules and https://sfl.world/info/cooking
 */
export const BUILDINGS_CATALOG = [
  {
    id: 'fish-market',
    name: 'Fish Market',
    icon: '🐟',
    activitySuffix: 'Processed',
    description: 'Process raw catches into processed fish products and oils.',
    defaultBoosts: [
      {
        id: 'bubble-aura',
        name: 'Bubble Aura (+1 Yield)',
        boostName: 'Bubble Aura',
        chance: 20,
        description: '20% chance for +1 yield from Fish Processing (Fish Market)',
        effect: '+1 Extra Item',
        icon: '🫧',
        procBonus: 1,
        isAdditive: true
      },
      {
        id: 'astrolabe-fm',
        name: 'Astrolabe (2x Double)',
        boostName: 'Astrolabe',
        chance: 15,
        description: '15% chance to double output',
        effect: 'x2 Double Output',
        icon: '🔭',
        procMultiplier: 2,
        isAdditive: false
      }
    ],
    items: [
      { name: 'Fish Oil', id: KNOWN_IDS['Fish Oil'] || 2724, icon: '🛢️' },
      { name: 'Crab Stick', id: KNOWN_IDS['Crab Stick'] || 2725, icon: '🦀' },
      { name: 'Fish Stick', id: KNOWN_IDS['Fish Stick'] || 2723, icon: '🥢' },
      { name: 'Fish Flake', id: KNOWN_IDS['Fish Flake'] || 2722, icon: '🍣' }
    ]
  },
  {
    id: 'fire-pit',
    name: 'Fire Pit',
    icon: '🔥',
    activitySuffix: 'Cooked',
    description: 'Campfire cooking for hearty soups, roasts, and basic meals.',
    defaultBoosts: [
      {
        id: 'cleaver-firepit',
        name: "Master Chef's Cleaver (2x)",
        boostName: "Master Chef's Cleaver",
        chance: 10,
        description: '10% chance to double food cooked in the Fire Pit',
        effect: 'x2 Double Output',
        icon: '🔪',
        procMultiplier: 2,
        isAdditive: false
      },
      {
        id: 'fiery-jackpot',
        name: 'Fiery Jackpot (+1 Yield)',
        boostName: 'Fiery Jackpot',
        chance: 20,
        description: '20% to 30% chance for +1 food cooked in the Fire Pit',
        effect: '+1 Extra Food',
        icon: '🔥',
        procBonus: 1,
        isAdditive: true
      }
    ],
    items: [
      { name: 'Rapid Roast', id: KNOWN_IDS['Rapid Roast'] || 544, icon: '🍖' },
      { name: 'Pizza Margherita', id: KNOWN_IDS['Pizza Margherita'] || 579, icon: '🍕' },
      { name: 'Popcorn', id: KNOWN_IDS['Popcorn'] || 536, icon: '🍿' },
      { name: 'Antipasto', id: KNOWN_IDS['Antipasto'] || 578, icon: '🥗' },
      { name: 'Rice Bun', id: KNOWN_IDS['Rice Bun'] || 563, icon: '🍙' },
      { name: 'Pumpkin Soup', id: KNOWN_IDS['Pumpkin Soup'] || 501, icon: '🥣' },
      { name: 'Reindeer Carrot', id: KNOWN_IDS['Reindeer Carrot'] || 503, icon: '🥕' },
      { name: 'Cabbers n Mash', id: KNOWN_IDS['Cabbers n Mash'] || 517, icon: '🥔' },
      { name: 'Mashed Potato', id: KNOWN_IDS['Mashed Potato'] || 519, icon: '🥔' },
      { name: 'Kale Omelette', id: KNOWN_IDS['Kale Omelette'] || 527, icon: '🍳' },
      { name: 'Mushroom Soup', id: KNOWN_IDS['Mushroom Soup'] || 525, icon: '🍄' },
      { name: 'Rhubarb Tart', id: KNOWN_IDS['Rhubarb Tart'] || 588, icon: '🥧' },
      { name: 'Bumpkin Broth', id: KNOWN_IDS['Bumpkin Broth'] || 521, icon: '🍲' },
      { name: 'Fried Tofu', id: KNOWN_IDS['Fried Tofu'] || 567, icon: '🧈' },
      { name: 'Kale Stew', id: KNOWN_IDS['Kale Stew'] || 529, icon: '🍲' },
      { name: 'Gumbo', id: KNOWN_IDS['Gumbo'] || 587, icon: '🥘' },
      { name: 'Boiled Eggs', id: KNOWN_IDS['Boiled Eggs'] || 526, icon: '🥚' },
      { name: 'Furikake Sprinkle', id: KNOWN_IDS['Furikake Sprinkle'] || 593, icon: '🍚' }
    ]
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    activitySuffix: 'Cooked',
    description: 'Advanced cooking station for multi-ingredient gourmet dishes.',
    defaultBoosts: [
      {
        id: 'cleaver-kitchen',
        name: "Master Chef's Cleaver (2x)",
        boostName: "Master Chef's Cleaver",
        chance: 10,
        description: '10% chance to double food cooked in the Kitchen',
        effect: 'x2 Double Output',
        icon: '🔪',
        procMultiplier: 2,
        isAdditive: false
      }
    ],
    items: [
      { name: 'Beetroot Blaze', id: KNOWN_IDS['Beetroot Blaze'] || 539, icon: '🔥' },
      { name: 'Sushi Roll', id: KNOWN_IDS['Sushi Roll'] || 571, icon: '🍣' },
      { name: 'Caprese Salad', id: KNOWN_IDS['Caprese Salad'] || 583, icon: '🥗' },
      { name: 'Mushroom Jacket Potatoes', id: KNOWN_IDS['Mushroom Jacket Potatoes'] || 550, icon: '🥔' },
      { name: 'Pancakes', id: KNOWN_IDS['Pancakes'] || 505, icon: '🥞' },
      { name: "Ocean's Olive", id: KNOWN_IDS["Ocean's Olive"] || 574, icon: '🫒' },
      { name: 'Spaghetti al Limone', id: KNOWN_IDS['Spaghetti al Limone'] || 584, icon: '🍝' },
      { name: 'Steamed Red Rice', id: KNOWN_IDS['Steamed Red Rice'] || 564, icon: '🍚' },
      { name: 'Fish Burger', id: KNOWN_IDS['Fish Burger'] || 542, icon: '🍔' },
      { name: 'Fish n Chips', id: KNOWN_IDS['Fish n Chips'] || 543, icon: '🍟' },
      { name: 'Fruit Salad', id: KNOWN_IDS['Fruit Salad'] || 523, icon: '🍎' },
      { name: 'Seafood Basket', id: KNOWN_IDS['Seafood Basket'] || 541, icon: '🍤' },
      { name: 'Tofu Scramble', id: KNOWN_IDS['Tofu Scramble'] || 568, icon: '🍳' },
      { name: 'Sunflower Crunch', id: KNOWN_IDS['Sunflower Crunch'] || 522, icon: '🌻' },
      { name: 'Fried Calamari', id: KNOWN_IDS['Fried Calamari'] || 546, icon: '🦑' },
      { name: 'Fish Omelette', id: KNOWN_IDS['Fish Omelette'] || 545, icon: '🍳' },
      { name: 'Bumpkin Roast', id: KNOWN_IDS['Bumpkin Roast'] || 504, icon: '🍗' },
      { name: 'Goblin Brunch', id: KNOWN_IDS['Goblin Brunch'] || 528, icon: '🥓' },
      { name: 'Bumpkin ganoush', id: KNOWN_IDS['Bumpkin ganoush'] || 538, icon: '🍆' },
      { name: 'Chowder', id: KNOWN_IDS['Chowder'] || 540, icon: '🥣' },
      { name: 'Roast Veggies', id: KNOWN_IDS['Roast Veggies'] || 502, icon: '🥕' },
      { name: 'Cauliflower Burger', id: KNOWN_IDS['Cauliflower Burger'] || 520, icon: '🍔' },
      { name: "Goblin's Treat", id: KNOWN_IDS["Goblin's Treat"] || 531, icon: '🍏' },
      { name: 'Bumpkin Salad', id: KNOWN_IDS['Bumpkin Salad'] || 507, icon: '🥗' },
      { name: 'Club Sandwich', id: KNOWN_IDS['Club Sandwich'] || 518, icon: '🥪' },
      { name: 'Surimi Rice Bowl', id: KNOWN_IDS['Surimi Rice Bowl'] || 594, icon: '🍚' },
      { name: 'Creamy Crab Bite', id: KNOWN_IDS['Creamy Crab Bite'] || 595, icon: '🦀' },
      { name: 'Crimstone Infused Fish Oil', id: KNOWN_IDS['Crimstone Infused Fish Oil'] || 596, icon: '🧪' }
    ]
  },
  {
    id: 'deli',
    name: 'Deli',
    icon: '🥪',
    activitySuffix: 'Cooked',
    description: 'Artisanal cheese aging, fermentation, and delicacy preservation.',
    defaultBoosts: [
      {
        id: 'cleaver-deli',
        name: "Master Chef's Cleaver (2x)",
        boostName: "Master Chef's Cleaver",
        chance: 10,
        description: '10% chance to double food produced in the Deli',
        effect: 'x2 Double Output',
        icon: '🔪',
        procMultiplier: 2,
        isAdditive: false
      }
    ],
    items: [
      { name: 'Cheese', id: KNOWN_IDS['Cheese'] || 575, icon: '🧀' },
      { name: 'Blueberry Jam', id: KNOWN_IDS['Blueberry Jam'] || 552, icon: '🫐' },
      { name: 'Fermented Fish', id: KNOWN_IDS['Fermented Fish'] || 553, icon: '🐟' },
      { name: 'Blue Cheese', id: KNOWN_IDS['Blue Cheese'] || 580, icon: '🧀' },
      { name: 'Honey Cheddar', id: KNOWN_IDS['Honey Cheddar'] || 581, icon: '🍯' },
      { name: 'Fancy Fries', id: KNOWN_IDS['Fancy Fries'] || 551, icon: '🍟' },
      { name: 'Sauerkraut', id: KNOWN_IDS['Sauerkraut'] || 554, icon: '🥬' },
      { name: 'Fermented Carrots', id: KNOWN_IDS['Fermented Carrots'] || 555, icon: '🥕' },
      { name: 'Shroom Syrup', id: KNOWN_IDS['Shroom Syrup'] || 537, icon: '🍄' }
    ]
  },
  {
    id: 'smoothie-shack',
    name: 'Smoothie Shack',
    icon: '🥤',
    activitySuffix: 'Cooked',
    description: 'Refreshing juices and vitality shakes blended from fresh fruits.',
    defaultBoosts: [
      {
        id: 'cleaver-smoothie',
        name: "Master Chef's Cleaver (2x)",
        boostName: "Master Chef's Cleaver",
        chance: 10,
        description: '10% chance to double drinks made in the Smoothie Shack',
        effect: 'x2 Double Output',
        icon: '🔪',
        procMultiplier: 2,
        isAdditive: false
      }
    ],
    items: [
      { name: 'Apple Juice', id: KNOWN_IDS['Apple Juice'] || 514, icon: '🍎' },
      { name: 'Orange Juice', id: KNOWN_IDS['Orange Juice'] || 515, icon: '🍊' },
      { name: 'Grape Juice', id: KNOWN_IDS['Grape Juice'] || 565, icon: '🍇' },
      { name: 'Purple Smoothie', id: KNOWN_IDS['Purple Smoothie'] || 516, icon: '🫐' },
      { name: 'Power Smoothie', id: KNOWN_IDS['Power Smoothie'] || 535, icon: '⚡' },
      { name: 'Sour Shake', id: KNOWN_IDS['Sour Shake'] || 586, icon: '🍋' },
      { name: 'Bumpkin Detox', id: KNOWN_IDS['Bumpkin Detox'] || 549, icon: '🥬' },
      { name: 'The Lot', id: KNOWN_IDS['The Lot'] || 570, icon: '🍹' },
      { name: 'Banana Blast', id: KNOWN_IDS['Banana Blast'] || 548, icon: '🍌' },
      { name: 'Slow Juice', id: KNOWN_IDS['Slow Juice'] || 534, icon: '🧃' },
      { name: 'Carrot Juice', id: KNOWN_IDS['Carrot Juice'] || 577, icon: '🥕' },
      { name: 'Quick Juice', id: KNOWN_IDS['Quick Juice'] || 533, icon: '🥤' }
    ]
  },
  {
    id: 'bakery',
    name: 'Bakery',
    icon: '🧁',
    activitySuffix: 'Cooked',
    description: 'Pies, pastries, and delectable cakes baked to perfection.',
    defaultBoosts: [
      {
        id: 'cleaver-bakery',
        name: "Master Chef's Cleaver (2x)",
        boostName: "Master Chef's Cleaver",
        chance: 10,
        description: '10% chance to double baked goods from the Bakery',
        effect: 'x2 Double Output',
        icon: '🔪',
        procMultiplier: 2,
        isAdditive: false
      }
    ],
    items: [
      { name: 'Apple Pie', id: KNOWN_IDS['Apple Pie'] || 506, icon: '🥧' },
      { name: 'Carrot Cake', id: KNOWN_IDS['Carrot Cake'] || 513, icon: '🥕' },
      { name: 'Lemon Cheesecake', id: KNOWN_IDS['Lemon Cheesecake'] || 585, icon: '🍋' },
      { name: 'Honey Cake', id: KNOWN_IDS['Honey Cake'] || 582, icon: '🍯' },
      { name: 'Orange Cake', id: KNOWN_IDS['Orange Cake'] || 532, icon: '🍊' },
      { name: 'Kale & Mushroom Pie', id: KNOWN_IDS['Kale & Mushroom Pie'] || 530, icon: '🥧' },
      { name: 'Sunflower Cake', id: KNOWN_IDS['Sunflower Cake'] || 508, icon: '🌻' },
      { name: 'Potato Cake', id: KNOWN_IDS['Potato Cake'] || 509, icon: '🥔' },
      { name: 'Pumpkin Cake', id: KNOWN_IDS['Pumpkin Cake'] || 510, icon: '🎃' },
      { name: 'Eggplant Cake', id: KNOWN_IDS['Eggplant Cake'] || 547, icon: '🍆' },
      { name: 'Cabbage Cake', id: KNOWN_IDS['Cabbage Cake'] || 512, icon: '🥬' },
      { name: 'Beetroot Cake', id: KNOWN_IDS['Beetroot Cake'] || 511, icon: '🔴' },
      { name: 'Parsnip Cake', id: KNOWN_IDS['Parsnip Cake'] || 524, icon: '🥕' },
      { name: 'Cauliflower Cake', id: KNOWN_IDS['Cauliflower Cake'] || 576, icon: '🥦' },
      { name: 'Cornbread', id: KNOWN_IDS['Cornbread'] || 569, icon: '🌽' },
      { name: 'Radish Cake', id: KNOWN_IDS['Radish Cake'] || 556, icon: '🔴' },
      { name: 'Wheat Cake', id: KNOWN_IDS['Wheat Cake'] || 557, icon: '🌾' }
    ]
  },
  {
    id: 'aging-shed',
    name: 'Aging Shed',
    icon: '🧪',
    activitySuffix: 'Processed',
    description: 'Fermentation Rack and Spice Rack for aged goods and seasonings.',
    defaultBoosts: [
      {
        id: 'astrolabe-aging',
        name: 'Astrolabe (2x Double)',
        boostName: 'Astrolabe',
        chance: 15,
        description: '15% chance to double Fermentation & Spice Rack output',
        effect: 'x2 Double Output',
        icon: '🔭',
        procMultiplier: 2,
        isAdditive: false
      },
      {
        id: 'refiner-salt',
        name: 'Refiner (+1 Salt)',
        boostName: 'Refiner',
        chance: 20,
        description: '20% chance for +1 Refined Salt from Spice Rack',
        effect: '+1 Refined Salt',
        icon: '🧂',
        procBonus: 1,
        isAdditive: true
      }
    ],
    items: [
      { name: 'Fish Oil', id: KNOWN_IDS['Fish Oil'] || 2724, icon: '🛢️' },
      { name: 'Fermented Fish', id: KNOWN_IDS['Fermented Fish'] || 553, icon: '🐟' },
      { name: 'Refined Salt', id: KNOWN_IDS['Refined Salt'] || 666, icon: '🧂' }
    ]
  },
  {
    id: 'plots',
    name: 'Crop Plots',
    icon: '🌾',
    activitySuffix: 'Harvested',
    description: 'Farming plots with high-yield critical drops and wearable multipliers.',
    defaultBoosts: [
      {
        id: 'green-amulet',
        name: 'Green Amulet (10x Yield)',
        boostName: 'Green Amulet',
        chance: 10,
        description: '10% chance for 10x Crop Yield upon harvest',
        effect: 'x10 Massive Drop',
        icon: '📿',
        procMultiplier: 10,
        isAdditive: false
      }
    ],
    items: [
      {
        name: 'Sunflower',
        id: KNOWN_IDS['Sunflower'] || 201,
        icon: '🌻',
        itemBoosts: [
          {
            id: 'stellar-sunflower',
            name: 'Stellar Sunflower (+10)',
            boostName: 'Stellar Sunflower',
            chance: 3.3333,
            description: '3.33% (1 in 30) chance for +10 Sunflower on harvest',
            effect: '+10 Sunflowers',
            icon: '🌻',
            procBonus: 10,
            isAdditive: true
          }
        ]
      },
      {
        name: 'Potato',
        id: KNOWN_IDS['Potato'] || 202,
        icon: '🥔',
        itemBoosts: [
          {
            id: 'peeled-potato',
            name: 'Peeled Potato (+1)',
            boostName: 'Peeled Potato',
            chance: 20,
            description: '20% chance for +1 Potato upon harvest',
            effect: '+1 Potato',
            icon: '🥔',
            procBonus: 1,
            isAdditive: true
          },
          {
            id: 'potent-potato',
            name: 'Potent Potato (+10)',
            boostName: 'Potent Potato',
            chance: 3.3333,
            description: '3.33% (1 in 30) chance for +10 Potato on harvest',
            effect: '+10 Potatoes',
            icon: '🥔',
            procBonus: 10,
            isAdditive: true
          }
        ]
      },
      { name: 'Pumpkin', id: KNOWN_IDS['Pumpkin'] || 203, icon: '🎃' },
      { name: 'Carrot', id: KNOWN_IDS['Carrot'] || 204, icon: '🥕' },
      { name: 'Cabbage', id: KNOWN_IDS['Cabbage'] || 205, icon: '🥬' },
      { name: 'Beetroot', id: KNOWN_IDS['Beetroot'] || 206, icon: '🔴' },
      { name: 'Cauliflower', id: KNOWN_IDS['Cauliflower'] || 207, icon: '🥦' },
      { name: 'Parsnip', id: KNOWN_IDS['Parsnip'] || 208, icon: '🥕' },
      {
        name: 'Radish',
        id: KNOWN_IDS['Radish'] || 209,
        icon: '🔴',
        itemBoosts: [
          {
            id: 'radical-radish',
            name: 'Radical Radish (+10)',
            boostName: 'Radical Radish',
            chance: 3.3333,
            description: '3.33% (1 in 30) chance for +10 Radish on harvest',
            effect: '+10 Radishes',
            icon: '🔴',
            procBonus: 10,
            isAdditive: true
          }
        ]
      },
      { name: 'Wheat', id: KNOWN_IDS['Wheat'] || 210, icon: '🌾' },
      { name: 'Kale', id: KNOWN_IDS['Kale'] || 211, icon: '🥬' },
      { name: 'Corn', id: KNOWN_IDS['Corn'] || 216, icon: '🌽' },
      { name: 'Eggplant', id: KNOWN_IDS['Eggplant'] || 215, icon: '🍆' },
      { name: 'Soybean', id: KNOWN_IDS['Soybean'] || 251, icon: '🌱' },
      { name: 'Rice', id: KNOWN_IDS['Rice'] || 253, icon: '🍚' }
    ]
  }
];

/**
 * Returns all building records
 */
export function getBuildings() {
  return BUILDINGS_CATALOG;
}

/**
 * Find a building by ID
 * @param {string} buildingId
 */
export function getBuildingById(buildingId) {
  return BUILDINGS_CATALOG.find(b => b.id === buildingId) || null;
}

/**
 * Get all available boosts for a specific item inside a building
 * @param {string} buildingId
 * @param {string} itemName
 */
export function getBoostsForItem(buildingId, itemName) {
  const building = getBuildingById(buildingId);
  if (!building) return [];

  const item = building.items.find(i => i.name === itemName);
  const boosts = [...(building.defaultBoosts || [])];

  if (item?.itemBoosts) {
    boosts.unshift(...item.itemBoosts);
  }

  // Refiner only applies to Refined Salt in Aging Shed
  if (buildingId === 'aging-shed' && itemName !== 'Refined Salt') {
    return boosts.filter(b => b.boostName !== 'Refiner');
  }

  return boosts;
}

/**
 * Search all items and boosts across all buildings
 * @param {string} query
 */
export function searchCatalog(query = '') {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) return [];

  const results = [];
  for (const b of BUILDINGS_CATALOG) {
    for (const item of b.items) {
      if (item.name.toLowerCase().includes(clean)) {
        results.push({
          type: 'item',
          buildingId: b.id,
          buildingName: b.name,
          buildingIcon: b.icon,
          itemName: item.name,
          itemId: item.id,
          itemIcon: item.icon,
          activityKey: `${item.name} ${b.activitySuffix}`
        });
      }
    }
    for (const boost of b.defaultBoosts || []) {
      if (boost.name.toLowerCase().includes(clean) || boost.boostName.toLowerCase().includes(clean) || boost.description.toLowerCase().includes(clean)) {
        results.push({
          type: 'boost',
          buildingId: b.id,
          buildingName: b.name,
          buildingIcon: b.icon,
          boost
        });
      }
    }
  }
  return results;
}

/**
 * Backward compatibility: flat list of top popular presets
 */
export const PROC_PRESETS = [
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
    id: 'astrolabe-fish-oil',
    name: 'Fish Oil (Astrolabe 2x)',
    boostName: 'Astrolabe',
    itemName: 'Fish Oil',
    itemId: KNOWN_IDS['Fish Oil'] || 2724,
    chance: 15,
    description: '15% chance to double Fermentation & Spice Rack output',
    effect: 'x2 Double Output',
    building: 'Fish Market / Aging Shed',
    activityKey: 'Fish Oil Processed',
    category: 'aging',
    icon: '🔭',
    procMultiplier: 2,
    isAdditive: false
  },
  {
    id: 'cleaver-cooking',
    name: "Master Chef's Cleaver (2x)",
    boostName: "Master Chef's Cleaver",
    itemName: 'Pumpkin Soup',
    itemId: KNOWN_IDS['Pumpkin Soup'] || 501,
    chance: 10,
    description: '10% chance to double cooked food in any kitchen building',
    effect: 'x2 Double Output',
    building: 'Fire Pit / Kitchen / Bakery',
    activityKey: 'Pumpkin Soup Cooked',
    category: 'cooking',
    icon: '🔪',
    procMultiplier: 2,
    isAdditive: false
  },
  {
    id: 'fiery-jackpot',
    name: 'Fiery Jackpot (Fire Pit +1)',
    boostName: 'Fiery Jackpot',
    itemName: 'Mashed Potato',
    itemId: KNOWN_IDS['Mashed Potato'] || 519,
    chance: 20,
    description: '20% to 30% chance for +1 food cooked in the Fire Pit',
    effect: '+1 Extra Food',
    building: 'Fire Pit',
    activityKey: 'Mashed Potato Cooked',
    category: 'cooking',
    icon: '🔥',
    procBonus: 1,
    isAdditive: true
  },
  {
    id: 'green-amulet-sunflower',
    name: 'Green Amulet (Sunflower 10x)',
    boostName: 'Green Amulet',
    itemName: 'Sunflower',
    itemId: KNOWN_IDS['Sunflower'] || 201,
    chance: 10,
    description: '10% chance for 10x Crop Yield upon harvest',
    effect: 'x10 Massive Drop',
    building: 'Crop Plots',
    activityKey: 'Sunflower Harvested',
    category: 'crops',
    icon: '📿',
    procMultiplier: 10,
    isAdditive: false
  }
];

export function findBoostByName(idOrName = '') {
  const clean = (idOrName || '').toLowerCase().trim();
  return PROC_PRESETS.find(p =>
    p.id.toLowerCase() === clean ||
    p.boostName.toLowerCase() === clean ||
    p.name.toLowerCase() === clean
  ) || null;
}
