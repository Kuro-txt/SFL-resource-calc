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

export const EXCLUDED_KEYWORDS = [
  'seed', 'axe', 'pickaxe', 'rod', 'shovel', 'drill', 
  'worm', 'wiggler', 'grub', 'fertilizer', 'mix', 
  'bait', 'potion', 'feed', 'box', 'chest'
];

export function isExcludedItem(itemName) {
  if (!itemName) return true;
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

export const BETTY_SHOP_PRICES = {
  "sunflower": 0.02, "potato": 0.14, "rhubarb": 0.24, "pumpkin": 0.4,
  "zucchini": 0.4, "carrot": 0.8, "yam": 0.8, "cabbage": 1.5,
  "broccoli": 1.5, "soybean": 2.3, "beetroot": 2.8, "pepper": 3,
  "cauliflower": 4.25, "parsnip": 6.5, "eggplant": 8, "corn": 9,
  "onion": 10, "radish": 9.5, "wheat": 7, "turnip": 8, "kale": 10,
  "artichoke": 12, "barley": 12, "saltwort": 50, "tomato": 2,
  "lemon": 6, "blueberry": 12, "orange": 18, "apple": 25,
  "banana": 25, "celestine": 200, "lunara": 500, "duskberry": 1000,
  "grape": 240, "rice": 320, "olive": 400
};

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
}
