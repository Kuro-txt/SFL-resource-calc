import { 
  ALLOWED_DIFFERENCE_ITEMS, 
  RAW_GLOBAL_TAX_ITEMS, 
  GLOBAL_TAX_ITEMS, 
  getItemTaxRate, 
  CROP_FLOWER_PRICES, 
  RESOURCE_FLOWER_FALLBACK_PRICES 
} from '../../config/constants.js';
import { ITEM_BOOSTS, getItemBoost } from '../../data/itemBoosts.js';
import { normalizeItemKey } from '../../utils/formatters.js';

// Comprehensive set of resource category mappings
export const RESOURCE_CATEGORIES = {
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
  crimstone: 'Minerals', obsidian: 'Minerals', sunstone: 'Minerals',

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
  crimsonbaitfish: 'Forage & Other', saltwort: 'Forage & Other',
  goblinemblem: 'Forage & Other', bumpkinemblem: 'Forage & Other',
  sunflorianemblem: 'Forage & Other', nightshadeemblem: 'Forage & Other',
  marks: 'Forage & Other', mark: 'Forage & Other'
};

export const RESOURCE_CATEGORY_BADGES = {
  Crops: { label: '🌱 Crop', bg: 'bg-lime-100 text-lime-800 dark:bg-lime-950/70 dark:text-lime-300 border-lime-300/80 dark:border-lime-700' },
  Fruits: { label: '🍎 Fruit', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300/80 dark:border-orange-700' },
  Greenhouse: { label: '🏡 Greenhouse', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700' },
  Minerals: { label: '⛏️ Mineral', bg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/80 dark:border-amber-700' },
  Animal: { label: '🐔 Animal', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300/80 dark:border-sky-700' },
  Beetles: { label: '🪲 Beetle', bg: 'bg-pink-100 text-pink-800 dark:bg-pink-950/70 dark:text-pink-300 border-pink-300/80 dark:border-pink-700' },
  'Forage & Other': { label: '🛡️ Other', bg: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300/80 dark:border-purple-700' }
};

/**
 * Retrieve current farm inventory object from memory or localStorage.
 */
export function getFarmInventory() {
  if (typeof window !== 'undefined' && window.farmInventoryData && typeof window.farmInventoryData === 'object' && Object.keys(window.farmInventoryData).length > 0) {
    return window.farmInventoryData;
  }
  try {
    return JSON.parse(localStorage.getItem('sfl_farm_inventory') || '{}');
  } catch (_) {
    return {};
  }
}

/**
 * Retrieve current farm wardrobe object from memory or localStorage.
 */
export function getFarmWardrobe() {
  if (typeof window !== 'undefined' && window.farmWardrobeData && typeof window.farmWardrobeData === 'object' && Object.keys(window.farmWardrobeData).length > 0) {
    return window.farmWardrobeData;
  }
  if (typeof window !== 'undefined' && window.farmData?.wardrobe && typeof window.farmData.wardrobe === 'object') {
    return window.farmData.wardrobe;
  }
  try {
    return JSON.parse(localStorage.getItem('sfl_farm_wardrobe') || '{}');
  } catch (_) {
    return {};
  }
}

/**
 * Retrieve active global tax rate from the top auth bar select or localStorage.
 * Defaults to 0.10 (10%).
 */
export function getGlobalTaxRate() {
  try {
    const taxSelectEl = typeof document !== 'undefined' ? document.getElementById('tax-select') : null;
    if (taxSelectEl && taxSelectEl.value !== '') {
      const val = parseFloat(taxSelectEl.value);
      if (!isNaN(val) && val >= 0) return val;
    }
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_tax_rate') : null;
    if (saved !== null) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0) return val;
    }
  } catch (_) {}
  return 0.10;
}

/**
 * Retrieve quantity of an item from inventory safely.
 */
export function getItemQuantity(inventory, itemName) {
  if (!inventory || typeof inventory !== 'object') return 0;
  const targetClean = normalizeItemKey(itemName);

  for (const [k, v] of Object.entries(inventory)) {
    if (normalizeItemKey(k) === targetClean) {
      const parsed = parseFloat(v);
      return !isNaN(parsed) && parsed > 0 ? parsed : 0;
    }
  }
  return 0;
}

/**
 * Retrieve quantity of an item from wardrobe safely.
 */
export function getWardrobeQuantity(wardrobe, itemName) {
  if (!wardrobe || typeof wardrobe !== 'object') return 0;
  const targetClean = normalizeItemKey(itemName);

  for (const [k, v] of Object.entries(wardrobe)) {
    if (normalizeItemKey(k) === targetClean) {
      const parsed = parseFloat(v);
      return !isNaN(parsed) && parsed > 0 ? parsed : 0;
    }
  }
  return 0;
}

/**
 * Resolves unit FLOWER price for a resource from P2P/fallback price maps.
 */
export function getResourceUnitPrice(itemName, pricesData = null) {
  const clean = normalizeItemKey(itemName);
  const p2pPrices = pricesData?.p2p || pricesData?.crops || {};

  // 1. Direct match in live P2P map
  for (const [k, v] of Object.entries(p2pPrices)) {
    if (normalizeItemKey(k) === clean) {
      const num = parseFloat(v);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  // 2. Direct match in items breakdowns
  const itemObj = pricesData?.items?.[itemName] || pricesData?.items?.[clean];
  if (itemObj) {
    const floor = parseFloat(itemObj.floor || itemObj.latestSale);
    if (!isNaN(floor) && floor > 0) return floor;
  }

  // 3. Fallback: CROP_FLOWER_PRICES
  for (const [k, v] of Object.entries(CROP_FLOWER_PRICES)) {
    if (normalizeItemKey(k) === clean && typeof v === 'number' && v > 0) {
      return v;
    }
  }

  // 4. Fallback: RESOURCE_FLOWER_FALLBACK_PRICES
  for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
    if (normalizeItemKey(k) === clean && typeof v === 'number' && v > 0) {
      return v;
    }
  }

  return 0;
}

/**
 * Builds complete evaluation dataset for the Resources sub-tab.
 * Applies the user-configured global tax rate from the header input.
 */
export function computeResourcesInventory(pricesData = {}, usdRate = 0) {
  const inventory = getFarmInventory();
  const globalTaxRate = getGlobalTaxRate();

  // Combine whitelist items and any extra items present in inventory that are resources
  const itemNamesSet = new Set(ALLOWED_DIFFERENCE_ITEMS);
  RAW_GLOBAL_TAX_ITEMS.forEach(name => itemNamesSet.add(name));

  // Add any items in inventory matching known resource categories
  Object.keys(inventory).forEach(invKey => {
    const clean = normalizeItemKey(invKey);
    if (RESOURCE_CATEGORIES[clean] && !itemNamesSet.has(invKey)) {
      itemNamesSet.add(invKey);
    }
  });

  const rows = [];
  let totalGrossFlowers = 0;
  let totalTaxFlowers = 0;
  let totalNetFlowers = 0;
  let totalUnits = 0;
  let ownedCount = 0;

  for (const itemName of itemNamesSet) {
    const cleanKey = normalizeItemKey(itemName);
    const qty = getItemQuantity(inventory, itemName);
    const unitPrice = getResourceUnitPrice(itemName, pricesData);
    
    // For resources: use tax from global input (via getItemTaxRate with globalTaxRate)
    const taxRate = getItemTaxRate(itemName, globalTaxRate);

    const grossValue = qty * unitPrice;
    const taxAmount = grossValue * taxRate;
    const netValue = grossValue - taxAmount;
    const netUsd = netValue * usdRate;

    const category = RESOURCE_CATEGORIES[cleanKey] || 'Forage & Other';

    if (qty > 0) {
      ownedCount++;
      totalUnits += qty;
      totalGrossFlowers += grossValue;
      totalTaxFlowers += taxAmount;
      totalNetFlowers += netValue;
    }

    rows.push({
      name: itemName,
      cleanKey,
      category,
      qty,
      unitPrice,
      taxRate,
      grossValue,
      taxAmount,
      netValue,
      netUsd
    });
  }

  return {
    rows,
    globalTaxRate,
    summary: {
      ownedCount,
      totalUnits,
      totalGrossFlowers,
      totalTaxFlowers,
      totalNetFlowers,
      totalNetUsd: totalNetFlowers * usdRate
    }
  };
}

/**
 * Builds complete evaluation dataset for the Boosts sub-tab.
 * Strictly enforces a fixed 10% tax rate (0.10) for boosted collectibles and wearables.
 */
export function computeBoostsInventory(nftsList = [], usdRate = 0) {
  const inventory = getFarmInventory();
  const wardrobe = getFarmWardrobe();

  // Map NFT floor prices by item name (clean key)
  const nftPriceMap = new Map();
  (nftsList || []).forEach(nft => {
    if (nft?.name) {
      const clean = normalizeItemKey(nft.name);
      const floor = parseFloat(nft.floor || nft.price);
      if (!isNaN(floor) && floor > 0) {
        // Store best floor price found
        if (!nftPriceMap.has(clean) || floor < nftPriceMap.get(clean)) {
          nftPriceMap.set(clean, floor);
        }
      }
    }
  });

  // Extract all items that provide boosts
  const allBoostNames = Object.keys(ITEM_BOOSTS);
  const rows = [];
  let totalGrossFlowers = 0;
  let totalTaxFlowers = 0;
  let totalNetFlowers = 0;
  let totalUnits = 0;
  let ownedCount = 0;

  // Fixed 10% tax for all boosts
  const BOOST_TAX_RATE = 0.10;

  for (const rawName of allBoostNames) {
    const cleanKey = normalizeItemKey(rawName);
    const boostDesc = getItemBoost(rawName);
    if (!boostDesc || boostDesc === 'No Boost') continue;

    // Capitalize item display name properly
    const displayName = rawName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const invQty = getItemQuantity(inventory, rawName);
    const wardrobeQty = getWardrobeQuantity(wardrobe, rawName);
    const totalQty = invQty + wardrobeQty;

    const floorPrice = nftPriceMap.get(cleanKey) || 0;
    const grossValue = totalQty * floorPrice;
    const taxAmount = grossValue * BOOST_TAX_RATE;
    const netValue = grossValue - taxAmount;
    const netUsd = netValue * usdRate;

    if (totalQty > 0) {
      ownedCount++;
      totalUnits += totalQty;
      totalGrossFlowers += grossValue;
      totalTaxFlowers += taxAmount;
      totalNetFlowers += netValue;
    }

    rows.push({
      name: displayName,
      rawName,
      cleanKey,
      boostDesc,
      qty: totalQty,
      invQty,
      wardrobeQty,
      unitPrice: floorPrice,
      taxRate: BOOST_TAX_RATE,
      grossValue,
      taxAmount,
      netValue,
      netUsd
    });
  }

  return {
    rows,
    taxRate: BOOST_TAX_RATE,
    summary: {
      ownedCount,
      totalUnits,
      totalGrossFlowers,
      totalTaxFlowers,
      totalNetFlowers,
      totalNetUsd: totalNetFlowers * usdRate
    }
  };
}

/**
 * Filter and sort inventory rows based on active UI controls.
 */
export function filterAndSortRows(rows, { search = '', category = 'all', hideZero = true, sortBy = 'netValueDesc' } = {}) {
  let filtered = [...rows];

  // 1. Hide zero quantity items
  if (hideZero) {
    filtered = filtered.filter(row => row.qty > 0);
  }

  // 2. Category filter
  if (category && category !== 'all') {
    filtered = filtered.filter(row => {
      if (row.category) {
        return row.category.toLowerCase() === category.toLowerCase();
      }
      return true;
    });
  }

  // 3. Search query filter
  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(row => {
      const matchName = row.name.toLowerCase().includes(q);
      const matchCategory = row.category ? row.category.toLowerCase().includes(q) : false;
      const matchBoost = row.boostDesc ? row.boostDesc.toLowerCase().includes(q) : false;
      return matchName || matchCategory || matchBoost;
    });
  }

  // 4. Sort rows
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'netValueAsc':
        return a.netValue - b.netValue;
      case 'qtyDesc':
        return b.qty - a.qty || b.netValue - a.netValue;
      case 'qtyAsc':
        return a.qty - b.qty || a.netValue - b.netValue;
      case 'nameAsc':
        return a.name.localeCompare(b.name);
      case 'nameDesc':
        return b.name.localeCompare(a.name);
      case 'priceDesc':
        return b.unitPrice - a.unitPrice;
      case 'netValueDesc':
      default:
        return b.netValue - a.netValue || b.qty - a.qty || a.name.localeCompare(b.name);
    }
  });

  return filtered;
}
