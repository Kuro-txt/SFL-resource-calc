const CROP_FLOWER_PRICES = {
  "sunflower": 0.0003,
  "potato": 0.00031,
  "pumpkin": 0.0010,
  "carrot": 0.00186,
  "cabbage": 0.00146,
  "beetroot": 0.0060,
  "cauliflower": 0.00675,
  "parsnip": 0.0120,
  "eggplant": 0.0080,
  "corn": 0.0111,
  "radish": 0.00859,
  "wheat": 0.01866,
  "kale": 0.0185,
  "soybean": 0.0018,
  "barley": 0.0200,
  "rhubarb": 0.00058,
  "zucchini": 0.00061,
  "yam": 0.00251,
  "broccoli": 0.00363,
  "pepper": 0.00697,
  "onion": 0.01214,
  "turnip": 0.01061,
  "artichoke": 0.00983,
  "grape": 0.23666,
  "rice": 0.25658,
  "olive": 0.29894,
  "tomato": 0.00478,
  "lemon": 0.00986,
  "blueberry": 0.01384,
  "orange": 0.01399,
  "apple": 0.01830,
  "banana": 0.01998
};

const RESOURCE_FLOWER_FALLBACK_PRICES = {
  "egg": 0.021,
  "milk": 0.1263,
  "feather": 0.00364,
  "leather": 0.080,
  "wool": 0.0205,
  "merinowool": 0.0039,
  "honey": 0.0997,
  "wood": 0.0114,
  "stone": 0.0200,
  "iron": 0.0675,
  "gold": 0.3044,
  "crimstone": 0.74,
  "obsidian": 15.288,
  "salt": 0.00417,
  "duskberry": 0.08,
  "lunara": 0.10,
  "celestine": 0.12,
  "goblinemblem": 0.05,
  "bumpkinemblem": 0.05,
  "sunflorianemblem": 0.05,
  "nightshadeemblem": 0.05,
  "ruffroot": 0.05,
  "chewedbone": 0.05,
  "heartleaf": 0.05,
  "moonfur": 0.05,
  "ribbon": 0.05,
  "dewberry": 0.03,
  "wildgrass": 0.02,
  "frostpebble": 0.05,
  "capsulebait": 0.06,
  "umbrellabait": 0.06,
  "crimsonbaitfish": 0.08
};

const ALLOWED_DIFFERENCE_ITEMS = [
  "Sunflower", "Potato", "Pumpkin", "Carrot", "Cabbage",
  "Beetroot", "Cauliflower", "Parsnip", "Radish", "Wheat",
  "Kale", "Apple", "Blueberry", "Orange", "Eggplant",
  "Corn", "Banana", "Soybean", "Grape", "Rice",
  "Olive", "Tomato", "Lemon", "Barley", "Rhubarb",
  "Zucchini", "Yam", "Broccoli", "Pepper", "Onion",
  "Turnip", "Artichoke", "Duskberry", "Lunara", "Celestine",
  "Wood", "Stone", "Iron", "Gold", "Egg",
  "Honey", "Crimstone", "Leather", "Wool", "Merino Wool",
  "Feather", "Milk", "Obsidian", "Salt", "Goblin Emblem",
  "Bumpkin Emblem", "Sunflorian Emblem", "Nightshade Emblem", "Ruffroot", "Chewed Bone",
  "Heart Leaf", "Moonfur", "Ribbon", "Dewberry", "Wild Grass",
  "Frost Pebble", "Capsule Bait", "Umbrella Bait", "Crimson Baitfish"
];

const ALLOWED_ITEM_NAMES = {};
const ALLOWED_ITEM_KEYS = new Set();
ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  ALLOWED_ITEM_KEYS.add(clean);
  ALLOWED_ITEM_NAMES[clean] = name;
});

function isAllowedDifferenceItem(name) {
  if (!name) return false;
  const clean = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALLOWED_ITEM_KEYS.has(clean);
}

function getFlowerUnitPrice(cleanKey, flatPrices = {}) {
  let matchedKey = Object.keys(flatPrices).find(k => {
    let norm = k.replace(/\[.*?\]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return norm === cleanKey;
  });
  if (matchedKey) {
    let p = parseFloat(flatPrices[matchedKey]) || 0;
    if (p > 0) return p > 100 ? p / 1000 : p;
  }
  if (CROP_FLOWER_PRICES[cleanKey] !== undefined) {
    return CROP_FLOWER_PRICES[cleanKey];
  }
  if (RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey] !== undefined) {
    return RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey];
  }
  return 0.01;
}

module.exports = {
  CROP_FLOWER_PRICES,
  RESOURCE_FLOWER_FALLBACK_PRICES,
  getFlowerUnitPrice,
  ALLOWED_DIFFERENCE_ITEMS,
  ALLOWED_ITEM_KEYS,
  ALLOWED_ITEM_NAMES,
  isAllowedDifferenceItem
};
