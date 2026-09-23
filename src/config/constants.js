export const SUPABASE_URL = "https://gtvglgeoznnrsdcfazpc.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo";
export const BACKEND_URL = "https://sfl-calculator-backend.onrender.com";

let client = null;
if (typeof window !== 'undefined' && window.supabase) {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
export const supabaseClient = client;

export const FLOWER_ICON = `<img src="./assets/flower.webp" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-4 h-4 sfl-icon" alt="Flower Token">`;
export const COIN_ICON = `<img src="./assets/coins.webp" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/coins.webp';" class="w-4 h-4 sfl-icon" alt="Coins">`;

export const FLOWER_IMG_HTML = `<img src="./assets/flower.webp" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-4 h-4 sfl-icon inline-block align-middle" alt="Flower">`;
export const FLOWER_IMG_SMALL_HTML = `<img src="./assets/flower.webp" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-3.5 h-3.5 sfl-icon inline-block align-middle" alt="Flower">`;

export const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];
export const SEARCH_EXCLUDED_KEYS = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

// Strict whitelist of 64 items for daily stock difference calculation
export const ALLOWED_DIFFERENCE_ITEMS = [
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

export const ALLOWED_ITEM_NAMES = {};
export const ALLOWED_ITEM_KEYS = new Set();
ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  ALLOWED_ITEM_KEYS.add(clean);
  ALLOWED_ITEM_NAMES[clean] = name;
});

export function isAllowedDifferenceItem(name) {
  if (!name) return false;
  const clean = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALLOWED_ITEM_KEYS.has(clean);
}

export const EXCLUDED_KEYWORDS = [
  'seed', 'axe', 'pickaxe', 'rod', 'shovel', 'drill', 
  'worm', 'wiggler', 'grub', 'fertilizer', 'mix', 
  'bait', 'potion', 'feed', 'box', 'chest'
];

export function isExcludedItem(itemName) {
  if (!itemName) return true;
  const clean = String(itemName).toLowerCase().replace(/[^a-z0-9]/g, '');
  // Whitelisted trackable items (e.g. Crimson Baitfish, Capsule Bait) are NEVER excluded
  if (ALLOWED_ITEM_KEYS.has(clean)) return false;
  const lower = itemName.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw));
}

export function isSnapshotEligible(itemName) {
  let clean = itemName.replace(/^\[.*?\]\s*/, '').trim();
  return !isExcludedItem(clean);
}

// STRICT FILTER FOR CROP & HARVEST TRACKER V1 (Plot Crops, Greenhouse Crops & Fruit Patch Fruits)
export const SFL_PLOT_CROPS = new Set([
  // 23 Standard Plot Crops
  'sunflower', 'potato', 'pumpkin', 'carrot', 'cabbage',
  'beetroot', 'cauliflower', 'parsnip', 'eggplant', 'corn',
  'radish', 'wheat', 'kale', 'soybean', 'barley',
  'rhubarb', 'zucchini', 'yam', 'broccoli', 'pepper',
  'onion', 'turnip', 'artichoke',
  // 3 Greenhouse Crops
  'grape', 'rice', 'olive',
  // 6 Fruit Patch Fruits
  'tomato', 'lemon', 'blueberry', 'orange', 'apple', 'banana'
]);

export const SFL_GREENHOUSE_CROPS = new Set(['grape', 'rice', 'olive']);
export const SFL_FRUITS = new Set(['tomato', 'lemon', 'blueberry', 'orange', 'apple', 'banana']);

export function getCropCategory(cleanKey) {
  if (SFL_GREENHOUSE_CROPS.has(cleanKey)) return 'Greenhouse';
  if (SFL_FRUITS.has(cleanKey)) return 'Fruit';
  return 'Plot Crop';
}

export const CROP_FLOWER_PRICES = {
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

// Exported as BETTY_SHOP_PRICES for backward-compatibility with all imports
export const BETTY_SHOP_PRICES = CROP_FLOWER_PRICES;

export const RESOURCE_FLOWER_FALLBACK_PRICES = {
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


// Whitelist of 64 items that use the global tax rate (from tax-select / sfl_tax_rate).
// Everything else is taxed at a fixed 10% rate.
export const RAW_GLOBAL_TAX_ITEMS = [
  'Sunflower', 'Potato', 'Pumpkin', 'Carrot', 'Cabbage',
  'Beetroot', 'Cauliflower', 'Parsnip', 'Radish', 'Wheat',
  'Kale', 'Apple', 'Blueberry', 'Orange', 'Eggplant',
  'Corn', 'Banana', 'Soybean', 'Grape', 'Rice',
  'Olive', 'Tomato', 'Lemon', 'Barley', 'Rhubarb',
  'Zucchini', 'Yam', 'Broccoli', 'Pepper', 'Onion',
  'Turnip', 'Artichoke', 'Duskberry', 'Lunara', 'Celestine',
  'Wood', 'Stone', 'Iron', 'Gold', 'Egg',
  'Honey', 'Crimstone', 'Leather', 'Wool', 'Merino Wool',
  'Feather', 'Milk', 'Salt', 'Goblin Emblem', 'Bumpkin Emblem',
  'Sunflorian Emblem', 'Nightshade Emblem', 'Ruffroot', 'Chewed Bone', 'Heart Leaf',
  'Moonfur', 'Ribbon', 'Dewberry', 'Wild Grass', 'Frost Pebble',
  'Capsule Bait', 'Umbrella Bait', 'Crimson Baitfish', 'Saltwort'
];

export const GLOBAL_TAX_ITEMS = new Set();
RAW_GLOBAL_TAX_ITEMS.forEach(name => {
  const lower = name.toLowerCase().trim();
  GLOBAL_TAX_ITEMS.add(lower);
  GLOBAL_TAX_ITEMS.add(lower.replace(/\s+/g, '_'));
  GLOBAL_TAX_ITEMS.add(lower.replace(/\s+/g, ''));
});

export function isGlobalTaxItem(itemName) {
  if (!itemName) return false;
  const clean = String(itemName)
    .toLowerCase()
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^(crop|item|resource)\s*#?/i, '')
    .trim();
  return GLOBAL_TAX_ITEMS.has(clean) ||
         GLOBAL_TAX_ITEMS.has(clean.replace(/\s+/g, '_')) ||
         GLOBAL_TAX_ITEMS.has(clean.replace(/\s+/g, ''));
}

export function getItemTaxRate(itemName, globalTaxRate = null) {
  if (globalTaxRate === null || globalTaxRate === undefined || isNaN(globalTaxRate)) {
    const savedTax = typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_tax_rate') : null;
    const taxSelectEl = typeof document !== 'undefined' ? document.getElementById('tax-select') : null;
    globalTaxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);
  }
  return isGlobalTaxItem(itemName) ? globalTaxRate : 0.10;
}

export const DEFAULT_COIN_FLOWER_RATIO = 1000;

export function getCoinFlowerRatio() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sfl_coin_flower_ratio');
    const val = parseFloat(saved);
    if (!isNaN(val) && val > 0) return val;
  }
  const ratioInput = typeof document !== 'undefined' ? document.getElementById('coin-flower-ratio-input') : null;
  if (ratioInput) {
    const val = parseFloat(ratioInput.value);
    if (!isNaN(val) && val > 0) return val;
  }
  return DEFAULT_COIN_FLOWER_RATIO;
}

export const DEFAULT_GEM_PACKS = {
  "100": { "gem": 100, "usd": 1.29, "sfl1": 0.0801, "sfl": 8.0137, "pol": 12.7754 },
  "650": { "gem": 650, "usd": 6.49, "sfl1": 0.0620, "sfl": 40.3171, "pol": 64.2731 },
  "1350": { "gem": 1350, "usd": 12.99, "sfl1": 0.0598, "sfl": 80.6963, "pol": 128.6452 },
  "2800": { "gem": 2800, "usd": 25.99, "sfl1": 0.0577, "sfl": 161.4548, "pol": 257.3895 },
  "7400": { "gem": 7400, "usd": 64.99, "sfl1": 0.0546, "sfl": 403.7301, "pol": 643.6223 },
  "15500": { "gem": 15500, "usd": 129.99, "sfl1": 0.0521, "sfl": 807.5223, "pol": 1287.3435 },
  "200000": { "gem": 200000, "usd": 1299.99, "sfl1": 0.0404, "sfl": 8075.7822, "pol": 12874.3268 }
};

export function getSelectedGemPack() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('sfl_selected_gem_pack') || null;
  }
  return null;
}

export function getSelectedGemRate() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sfl_selected_gem_rate');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

export function isGemDiscountActive() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sfl_gem_discount_active');
    return saved === null ? true : saved === 'true';
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.BACKEND_URL = BACKEND_URL;
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.supabaseClient = supabaseClient;
  window.isExcludedItem = isExcludedItem;
  window.isSnapshotEligible = isSnapshotEligible;
  window.SFL_PLOT_CROPS = SFL_PLOT_CROPS;
  window.SFL_GREENHOUSE_CROPS = SFL_GREENHOUSE_CROPS;
  window.SFL_FRUITS = SFL_FRUITS;
  window.getCropCategory = getCropCategory;
  window.GLOBAL_TAX_ITEMS = GLOBAL_TAX_ITEMS;
  window.isGlobalTaxItem = isGlobalTaxItem;
  window.getItemTaxRate = getItemTaxRate;
  window.ALLOWED_DIFFERENCE_ITEMS = ALLOWED_DIFFERENCE_ITEMS;
  window.ALLOWED_ITEM_KEYS = ALLOWED_ITEM_KEYS;
  window.ALLOWED_ITEM_NAMES = ALLOWED_ITEM_NAMES;
  window.isAllowedDifferenceItem = isAllowedDifferenceItem;
  window.DEFAULT_COIN_FLOWER_RATIO = DEFAULT_COIN_FLOWER_RATIO;
  window.getCoinFlowerRatio = getCoinFlowerRatio;
  window.DEFAULT_GEM_PACKS = DEFAULT_GEM_PACKS;
  window.getSelectedGemPack = getSelectedGemPack;
  window.getSelectedGemRate = getSelectedGemRate;
  window.isGemDiscountActive = isGemDiscountActive;
}
