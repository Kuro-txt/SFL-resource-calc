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
  "crystalleaf": 0.05,
  "moonfur": 0.05,
  "ribbon": 0.05,
  "dewberry": 0.03,
  "wildgrass": 0.02,
  "frostpebble": 0.05,
  "capsulebait": 0.06,
  "umbrellabait": 0.06,
  "crimsonbaitfish": 0.08,
  "greenbeetle": 0.05,
  "bluebeetle": 0.10,
  "pinkbeetle": 0.20,
  "amberbeetle": 0.40,
  "pigbristles": 0.08,
  "pigbristle": 0.08,
  "truffle": 0.15,
  "truffles": 0.15
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
  "Heart Leaf", "Crystal Leaf", "Moonfur", "Ribbon", "Dewberry", "Wild Grass",
  "Frost Pebble", "Capsule Bait", "Umbrella Bait", "Crimson Baitfish",
  "Green Beetle", "Blue Beetle", "Pink Beetle", "Amber Beetle", "Pig Bristles", "Truffle"
];

const ALLOWED_ITEM_NAMES = {};
const ALLOWED_ITEM_KEYS = new Set();
ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  ALLOWED_ITEM_KEYS.add(clean);
  ALLOWED_ITEM_NAMES[clean] = name;
});

// Common plural, singular, and typo aliases
ALLOWED_ITEM_KEYS.add('pigbristle');
ALLOWED_ITEM_NAMES['pigbristle'] = 'Pig Bristles';
ALLOWED_ITEM_KEYS.add('pigbritsles');
ALLOWED_ITEM_NAMES['pigbritsles'] = 'Pig Bristles';
ALLOWED_ITEM_KEYS.add('truffles');
ALLOWED_ITEM_NAMES['truffles'] = 'Truffle';
ALLOWED_ITEM_KEYS.add('bluebettle');
ALLOWED_ITEM_NAMES['bluebettle'] = 'Blue Beetle';

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

const RESOURCE_CATEGORIES = {
  // Plot Crops
  sunflower: 'Crops', potato: 'Crops', pumpkin: 'Crops', carrot: 'Crops', cabbage: 'Crops',
  beetroot: 'Crops', cauliflower: 'Crops', parsnip: 'Crops', radish: 'Crops', wheat: 'Crops',
  kale: 'Crops', barley: 'Crops', rhubarb: 'Crops', zucchini: 'Crops', yam: 'Crops',
  broccoli: 'Crops', pepper: 'Crops', onion: 'Crops', turnip: 'Crops', artichoke: 'Crops',
  corn: 'Crops', eggplant: 'Crops',

  // Fruits
  apple: 'Fruits', blueberry: 'Fruits', orange: 'Fruits', banana: 'Fruits',
  tomato: 'Fruits', lemon: 'Fruits',

  // Greenhouse Crops
  grape: 'Greenhouse', rice: 'Greenhouse', olive: 'Greenhouse', soybean: 'Greenhouse',
  duskberry: 'Greenhouse', lunara: 'Greenhouse', celestine: 'Greenhouse',

  // Minerals & Mining
  wood: 'Minerals', stone: 'Minerals', iron: 'Minerals', gold: 'Minerals',
  crimstone: 'Minerals', obsidian: 'Minerals',

  // Animal Products
  egg: 'Animal', milk: 'Animal', wool: 'Animal', merinowool: 'Animal',
  feather: 'Animal', leather: 'Animal', honey: 'Animal',

  // Beetles & Bugs
  greenbeetle: 'Beetles', bluebeetle: 'Beetles', pinkbeetle: 'Beetles',
  amberbeetle: 'Beetles', pigbristles: 'Beetles', truffle: 'Beetles',
  pigbristle: 'Beetles', truffles: 'Beetles',

  // Emblems, Bait, Forage & Exotics
  salt: 'Forage & Other', ruffroot: 'Forage & Other', chewedbone: 'Forage & Other',
  heartleaf: 'Forage & Other', crystalleaf: 'Forage & Other', moonfur: 'Forage & Other',
  ribbon: 'Forage & Other', dewberry: 'Forage & Other', wildgrass: 'Forage & Other',
  frostpebble: 'Forage & Other', capsulebait: 'Forage & Other', umbrellabait: 'Forage & Other',
  crimsonbaitfish: 'Forage & Other',
  goblinemblem: 'Forage & Other', bumpkinemblem: 'Forage & Other',
  sunflorianemblem: 'Forage & Other', nightshadeemblem: 'Forage & Other'
};

function getResourcePrices({ p2p = {}, flowerPriceUsd = 0.124309, category = 'all', currency = 'flower', search = '' } = {}) {
  const normCategory = String(category || 'all').toLowerCase().trim();
  const normCurrency = String(currency || 'flower').toLowerCase().trim();
  const normSearch = String(search || '').toLowerCase().trim();

  const pricesMap = {};
  const pricesList = [];

  for (const name of ALLOWED_DIFFERENCE_ITEMS) {
    const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemCat = RESOURCE_CATEGORIES[cleanKey] || 'Forage & Other';

    if (normCategory !== 'all') {
      if (itemCat.toLowerCase() !== normCategory && !itemCat.toLowerCase().startsWith(normCategory)) {
        continue;
      }
    }

    if (normSearch && !name.toLowerCase().includes(normSearch) && !cleanKey.includes(normSearch)) {
      continue;
    }

    const priceFlower = getFlowerUnitPrice(cleanKey, p2p);
    const priceUsd = parseFloat((priceFlower * flowerPriceUsd).toFixed(6));

    let val;
    if (normCurrency === 'usd') {
      val = priceUsd;
    } else if (normCurrency === 'both') {
      val = { flower: priceFlower, usd: priceUsd };
    } else {
      val = priceFlower;
    }

    pricesMap[name] = val;
    pricesList.push({
      name,
      category: itemCat,
      priceFlower,
      priceUsd,
      value: val
    });
  }

  return { pricesMap, pricesList };
}

function getCollectibleImageUrl(name, id, collection = 'collectibles') {
  let TRANSPARENT_BOOST_SPRITES = {};
  try {
    TRANSPARENT_BOOST_SPRITES = require('./transparentBoostSprites').TRANSPARENT_BOOST_SPRITES || {};
  } catch (_) {}

  const cleanKey = String(name || '').toLowerCase().trim();
  const sprite = TRANSPARENT_BOOST_SPRITES[cleanKey];
  if (sprite) {
    return `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/${sprite}`;
  }
  if (collection === 'wearables') {
    return `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/wearables/${id}.webp`;
  }
  return `https://sunflower-land.com/play/erc1155/images/${id}.webp`;
}

function getCollectiblePrices({
  nftsList = [],
  rawItems = {},
  flowerPriceUsd = 0.124309,
  collection = 'collectibles',
  boostsOnly = false,
  hasPrice = false,
  currency = 'flower',
  search = '',
  excludeResources = true
} = {}) {
  const { KNOWN_IDS, ITEM_IDS } = require('./knownIds');
  const { getItemBoost } = require('./itemBoosts');

  const normCol = String(collection || 'collectibles').toLowerCase().trim();
  const normCurr = String(currency || 'flower').toLowerCase().trim();
  const normSearch = String(search || '').toLowerCase().trim();

  // Price lookup map
  const priceMap = new Map();
  if (Array.isArray(nftsList)) {
    nftsList.forEach(n => {
      const fl = parseFloat(n.floor || n.price);
      if (!isNaN(fl) && fl > 0) {
        if (n.name) priceMap.set(n.name.toLowerCase().trim(), fl);
        if (n.collection && n.itemId) priceMap.set(`${n.collection}-${n.itemId}`, fl);
      }
    });
  }
  if (rawItems && typeof rawItems === 'object') {
    Object.entries(rawItems).forEach(([k, v]) => {
      const fl = parseFloat(v.floor || v.price || v.latestSale);
      if (!isNaN(fl) && fl > 0) {
        priceMap.set(k.toLowerCase().trim(), fl);
        if (v.collection && v.itemId) priceMap.set(`${v.collection}-${v.itemId}`, fl);
      }
    });
  }

  const pricesMap = {};
  const pricesList = [];

  const includeCollectibles = normCol === 'all' || normCol === 'collectibles' || normCol === 'sfts' || normCol === 'sft';
  const includeWearables = normCol === 'all' || normCol === 'wearables' || normCol === 'wearable';

  // 1. Process Collectibles (SFTs)
  if (includeCollectibles) {
    for (const [name, id] of Object.entries(KNOWN_IDS)) {
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (excludeResources && (ALLOWED_ITEM_KEYS.has(cleanKey) || id < 400)) {
        continue;
      }

      if (normSearch && !name.toLowerCase().includes(normSearch) && !cleanKey.includes(normSearch)) {
        continue;
      }

      const boost = getItemBoost(name);
      const isBoosted = Boolean(boost && boost !== 'No Boost');
      if (boostsOnly && !isBoosted) {
        continue;
      }

      const floor = priceMap.get(`collectibles-${id}`) || priceMap.get(name.toLowerCase().trim()) || null;
      if (hasPrice && (!floor || floor <= 0)) {
        continue;
      }

      const priceFlower = floor;
      const priceUsd = floor ? parseFloat((floor * flowerPriceUsd).toFixed(4)) : null;

      let val;
      if (normCurr === 'usd') {
        val = priceUsd;
      } else if (normCurr === 'both') {
        val = { flower: priceFlower, usd: priceUsd };
      } else {
        val = priceFlower;
      }

      pricesMap[name] = val;
      pricesList.push({
        id,
        name,
        collection: 'collectibles',
        priceFlower,
        priceUsd,
        value: val,
        boost: isBoosted ? boost : null,
        image: getCollectibleImageUrl(name, id, 'collectibles')
      });
    }
  }

  // 2. Process Wearables
  if (includeWearables) {
    for (const [name, id] of Object.entries(ITEM_IDS)) {
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normSearch && !name.toLowerCase().includes(normSearch) && !cleanKey.includes(normSearch)) {
        continue;
      }

      const boost = getItemBoost(name);
      const isBoosted = Boolean(boost && boost !== 'No Boost');
      if (boostsOnly && !isBoosted) {
        continue;
      }

      const floor = priceMap.get(`wearables-${id}`) || priceMap.get(name.toLowerCase().trim()) || null;
      if (hasPrice && (!floor || floor <= 0)) {
        continue;
      }

      const priceFlower = floor;
      const priceUsd = floor ? parseFloat((floor * flowerPriceUsd).toFixed(4)) : null;

      let val;
      if (normCurr === 'usd') {
        val = priceUsd;
      } else if (normCurr === 'both') {
        val = { flower: priceFlower, usd: priceUsd };
      } else {
        val = priceFlower;
      }

      const displayName = includeCollectibles && pricesMap[name] ? `${name} (Wearable)` : name;
      pricesMap[displayName] = val;
      pricesList.push({
        id,
        name,
        collection: 'wearables',
        priceFlower,
        priceUsd,
        value: val,
        boost: isBoosted ? boost : null,
        image: getCollectibleImageUrl(name, id, 'wearables')
      });
    }
  }

  return { pricesMap, pricesList };
}

module.exports = {
  CROP_FLOWER_PRICES,
  RESOURCE_FLOWER_FALLBACK_PRICES,
  getFlowerUnitPrice,
  ALLOWED_DIFFERENCE_ITEMS,
  ALLOWED_ITEM_KEYS,
  ALLOWED_ITEM_NAMES,
  isAllowedDifferenceItem,
  RESOURCE_CATEGORIES,
  getResourcePrices,
  getCollectiblePrices,
  getCollectibleImageUrl
};
