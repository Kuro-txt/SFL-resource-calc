// ─── Items Spent Section ──────────────────────────────────────────────────────
// Diffs consecutive preharvest_baselines.stock rows to compute items consumed.

import { 
  FLOWER_IMG_SMALL_HTML, 
  RESOURCE_FLOWER_FALLBACK_PRICES, 
  isAllowedDifferenceItem, 
  ALLOWED_ITEM_NAMES, 
  getCoinFlowerRatio,
  DEFAULT_GEM_PACKS,
  getSelectedGemPack,
  getSelectedGemRate,
  isGemDiscountActive
} from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';
import { tradeHistoryData } from '../tradeHistory/tradeData.js';
import { ApiService } from '../../services/api.js';
import { getItemNameById } from '../../data/knownIds.js';
import { getDateRangeBounds } from './dashboardPanel.js';
import { ITEM_CATEGORIES, CATEGORY_META, getItemCategory } from './dashboardEarned.js';

export function getGemFlowerPrice() {
  const selectedRate = typeof getSelectedGemRate === 'function' ? getSelectedGemRate() : null;
  if (selectedRate && selectedRate > 0) return selectedRate;
  const isDiscount = typeof isGemDiscountActive === 'function' ? isGemDiscountActive() : true;
  const baseRate = DEFAULT_GEM_PACKS?.['100']?.sfl1 || 0.0801;
  return baseRate * (isDiscount ? 0.8 : 1.0);
}

export function getNextDateStr(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function getDateRangeList(minStr, maxStr) {
  const list = [];
  if (!minStr) return list;
  if (!maxStr || minStr === maxStr) return [minStr];
  let curr = new Date(minStr + 'T00:00:00Z');
  const end = new Date(maxStr + 'T00:00:00Z');
  while (curr <= end) {
    list.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return list;
}

export function getGemCount(stock) {
  if (!stock || typeof stock !== 'object') return 0;
  if (stock.Gem !== undefined) return parseFloat(stock.Gem) || 0;
  if (stock.gem !== undefined) return parseFloat(stock.gem) || 0;
  if (stock.Gems !== undefined) return parseFloat(stock.Gems) || 0;
  if (stock.gems !== undefined) return parseFloat(stock.gems) || 0;
  const key = Object.keys(stock).find(k => {
    const c = normalizeItemKey(k);
    return c === 'gem' || c === 'gems';
  });
  return key ? (parseFloat(stock[key]) || 0) : 0;
}

function getItemPrice(name) {
  const clean = normalizeItemKey(name);
  if (clean === 'coins' || clean === 'coin') {
    return 1 / getCoinFlowerRatio();
  }
  if (clean === 'gem' || clean === 'gems') {
    return getGemFlowerPrice();
  }
  if (window.allPrices) {
    const match = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === clean);
    if (match) {
      const p = parseFloat(window.allPrices[match]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
  }
  const betty = getBettyUnitPrice(clean);
  if (betty !== null && betty > 0) return betty;
  const fallback = RESOURCE_FLOWER_FALLBACK_PRICES[clean];
  if (fallback && fallback > 0) return fallback;
  return 0.01;
}

const ITEM_ICONS = {
  coins: '🪙', coin: '🪙', gem: '💎', gems: '💎',
  egg: '🥚', milk: '🥛', feather: '🪶', leather: '👞', wool: '🧶',
  merinowool: '🐑', honey: '🍯', wood: '🪵', stone: '🪨', iron: '⛓️',
  gold: '🪙', crimstone: '💎', obsidian: '⬛', salt: '🧂',
  sunflower: '🌻', potato: '🥔', pumpkin: '🎃', carrot: '🥕', cabbage: '🥬',
  beetroot: '🟣', cauliflower: '🥦', parsnip: '🥕', eggplant: '🍆', corn: '🌽',
  radish: '🔴', wheat: '🌾', kale: '🥬', soybean: '🫘', barley: '🌾',
  rhubarb: '🌱', zucchini: '🥒', yam: '🍠', broccoli: '🥦', pepper: '🌶️',
  onion: '🧅', turnip: '🪴', artichoke: '🌿', duskberry: '🫐', lunara: '✨',
  celestine: '💎', grape: '🍇', rice: '🌾', olive: '🫒', tomato: '🍅',
  lemon: '🍋', blueberry: '🫐', orange: '🍊', apple: '🍎', banana: '🍌',
  goblinemblem: '👺', bumpkinemblem: '🧑‍🌾', sunflorianemblem: '🌻', nightshadeemblem: '🌙',
  ruffroot: '🌿', chewedbone: '🦴', heartleaf: '🍃', moonfur: '🐾', ribbon: '🎀',
  dewberry: '🫐', wildgrass: '🌾', frostpebble: '🪨', capsulebait: '💊', umbrellabait: '☂️',
  crimsonbaitfish: '🐟'
};

function getItemIcon(name) {
  const clean = normalizeItemKey(name);
  return ITEM_ICONS[clean] || '📦';
}

const IGNORE_ITEMS = new Set([
  'flower', 'sfl', 'coin', 'coins', 'gem', 'blockbuck', 'loveletter', 'currentcoins'
]);

// ── In-Memory RAM Caches (0 bytes written to localStorage) ─────────────────────
const baselineMemoryCache = new Map();
const spentDataMemoryCache = new Map();
const BASELINE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL in RAM
const SPENT_CACHE_TTL = 3 * 60 * 1000;    // 3 minutes TTL in RAM

export function clearBaselineMemoryCache() {
  baselineMemoryCache.clear();
  spentDataMemoryCache.clear();
}

export async function loadSpentData(boundsInput = 'week', force = false) {
  const result = {};
  let history = [];
  try { history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]'); } catch (_) {}

  const bounds = (typeof boundsInput === 'object' && boundsInput?.minDateStr)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'day');

  const minTimestamp = bounds.minTimestamp || 0;
  const maxTimestamp = bounds.maxTimestamp || Infinity;
  const minDateStr = bounds.minDateStr || '';
  const maxDateStr = bounds.maxDateStr || '';

  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value?.trim() || '';

  // 0. Check in-memory RAM cache for precomputed spent items
  const spentCacheKey = `${farmId}_${minDateStr}_${maxDateStr}_${bounds.timeRange || ''}`;
  if (!force) {
    const cachedSpent = spentDataMemoryCache.get(spentCacheKey);
    if (cachedSpent && (Date.now() - cachedSpent.timestamp < SPENT_CACHE_TTL)) {
      return cachedSpent.data;
    }
  }

  // ── Gather all trade activity (fulfilled sold/bought and in-game shop sales) ──
  const tradesSold = {};
  const tradesBought = {};

  // 1. Fulfilled Trades (from in-memory tradeHistoryData or cloud archive)
  let tradesList = tradeHistoryData?.trades || [];
  if (tradesList.length === 0 && farmId) {
    try {
      const cloud = await ApiService.getCloudTrades(farmId);
      if (cloud?.trades && Array.isArray(cloud.trades)) {
        tradesList = cloud.trades;
      }
    } catch (_) {}
  }

  tradesList.forEach(t => {
    const fulfilledAt = parseInt(t.fulfilledAt || 0, 10);
    if (fulfilledAt > 0 && (fulfilledAt < minTimestamp || fulfilledAt > maxTimestamp)) return;

    const rawName = t.itemName || t.name || t.item || '';
    const clean = normalizeItemKey((rawName && !rawName.startsWith('Item #')) ? rawName : getItemNameById(t.itemId || rawName, t.collection));
    if (!clean) return;

    const qty = parseFloat(t.quantity || 1);
    const isSeller = t.tradeType === 'sold' || (t.initiatedBy && String(t.initiatedBy.id || t.initiatedBy) === String(farmId));

    if (isSeller) {
      tradesSold[clean] = (tradesSold[clean] || 0) + qty;
    } else {
      tradesBought[clean] = (tradesBought[clean] || 0) + qty;
    }
  });

  // 3. In-Game Shop Sales (from live farmActivity)
  const liveActivity = {
    ...(window.farmData?.farmActivity || {}),
    ...(window.farmData?.bumpkin?.activity || {}),
    ...(window.farmData?.farm?.farmActivity || {})
  };

  const timeRange = bounds.timeRange || (typeof boundsInput === 'string' ? boundsInput : 'day');

  let hasSavedSpent = false;
  let totalCoinsSpent = 0;
  let totalGemsSpent = 0;

  // 1. First, check sfl_daily_snapshots for saved spent records
  history.forEach(h => {
    const d = h.date || h.yield_date || '';
    if (minDateStr && (d < minDateStr || d > maxDateStr)) return;

    let dayCoinsSpent = 0;
    let dayGemsSpent = 0;

    const rawSpent = (Array.isArray(h.spent) && h.spent.length > 0) ? h.spent
      : (Array.isArray(h.cropActivityYields) ? h.cropActivityYields.find(a => a && a.type === 'spent')?.items : null);

    if (Array.isArray(rawSpent) && rawSpent.length > 0) {
      hasSavedSpent = true;
      rawSpent.forEach(item => {
        const name = item.name || item.crop || item.item;
        if (!name) return;
        const clean = normalizeItemKey(name);
        if (clean === 'coins') {
          dayCoinsSpent = Math.max(dayCoinsSpent, parseFloat(item.qty || 0));
          return;
        }
        if (clean === 'gem' || clean === 'gems') {
          dayGemsSpent = Math.max(dayGemsSpent, parseFloat(item.qty || 0));
          return;
        }
        if (!isAllowedDifferenceItem(clean)) return;

        // Deduct sold items (ignoring unsold listings)
        const soldOffset = tradesSold[clean] || 0;
        let qty = parseFloat(item.qty || 0);
        if (soldOffset > 0) {
          qty = Math.max(0, qty - soldOffset);
        }
        if (qty <= 0.01) return; // Sold item is NOT spent!

        const officialName = ALLOWED_ITEM_NAMES[clean] || name;
        if (!result[officialName]) result[officialName] = { qty: 0, flowers: 0 };
        const flowers = parseFloat(item.flowers || (qty * getItemPrice(officialName) * 0.9));
        result[officialName].qty += qty;
        result[officialName].flowers += flowers;
      });
    }

    // Accumulate coins spent (deduplicate between coinsObj and rawSpent)
    const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
    const coinsObj = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
    if (coinsObj && coinsObj.coinsSpent) {
      dayCoinsSpent = Math.max(dayCoinsSpent, parseFloat(coinsObj.coinsSpent || 0));
    }
    totalCoinsSpent += dayCoinsSpent;

    // Accumulate gems spent (deduplicate between gemsObj and rawSpent)
    const gemsObj = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'gems' || a.crop === 'Gems')) : null) || h.gems;
    if (gemsObj && gemsObj.gemsSpent) {
      dayGemsSpent = Math.max(dayGemsSpent, parseFloat(gemsObj.gemsSpent || 0));
    }
    totalGemsSpent += dayGemsSpent;
  });

  // 2. Compute Gems spent (and fallback resources spent) from preharvest_baselines & live inventory
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const user = window.currentUser;

  let baselineRows = [];
  if (client && (user || farmId)) {
    const baselineCacheKey = `baselines_${user?.id || farmId}`;
    const cachedBaselines = baselineMemoryCache.get(baselineCacheKey);

    if (!force && cachedBaselines && (Date.now() - cachedBaselines.timestamp < BASELINE_CACHE_TTL)) {
      baselineRows = cachedBaselines.data;
    } else {
      try {
        let query = client
          .from('preharvest_baselines')
          .select('snapshot_date, stock, farm_activity')
          .order('snapshot_date', { ascending: false })
          .limit(35); // 35 rows covers Day, Week, and Month navigations at once in RAM

        if (user?.id) query = query.eq('user_id', user.id);
        else if (farmId) query = query.eq('farm_id', farmId);

        const { data } = await query;
        if (data && Array.isArray(data)) {
          baselineRows = data;
          baselineMemoryCache.set(baselineCacheKey, { data, timestamp: Date.now() });
        }
      } catch (_) {}
    }
  }

  // Combine chronological baselines + live inventory
  const chronological = [...baselineRows].sort((a, b) => (a.snapshot_date || '').localeCompare(b.snapshot_date || ''));
  const rawLiveStock = window.farmInventoryData || window.farmData?.inventory || window.farmData?.farm?.inventory || null;
  let liveStock = (rawLiveStock && typeof rawLiveStock === 'object' && Object.keys(rawLiveStock).length > 0) ? rawLiveStock : null;

  if (!liveStock) {
    try {
      const cachedInv = JSON.parse(localStorage.getItem('sfl_farm_inventory') || '{}');
      if (cachedInv && typeof cachedInv === 'object' && Object.keys(cachedInv).length > 0) {
        liveStock = cachedInv;
        window.farmInventoryData = cachedInv;
      }
    } catch (_) {}
  }

  const hasLiveStock = liveStock && typeof liveStock === 'object' && Object.keys(liveStock).length > 0;
  const todayUtcStr = new Date().toISOString().split('T')[0];

  const allSnapshots = [...chronological];
  if (hasLiveStock) {
    allSnapshots.push({
      snapshot_date: todayUtcStr,
      stock: liveStock,
      farm_activity: liveActivity,
      isLive: true
    });
  }

  // ── 2. Day-by-day 22:30 UTC vs 00:00 UTC Gems Difference Calculation ──
  // Per user rule: Compare 22:30 UTC gems with 00:00 UTC baseline gems; if difference is negative, show in spend for gems.
  const targetDates = getDateRangeList(minDateStr, maxDateStr);
  const baselineMap = new Map();
  chronological.forEach(b => {
    if (b.snapshot_date) baselineMap.set(b.snapshot_date, b);
  });

  const snapshotMap = new Map();
  history.forEach(h => {
    const d = h.date || h.yield_date;
    if (d) snapshotMap.set(d, h);
  });

  let gemsSpentFromDiffs = 0;
  let activeDayMeta = null;

  for (const dateStr of targetDates) {
    const isToday = (dateStr === todayUtcStr);
    const snap = snapshotMap.get(dateStr);
    const snapActs = Array.isArray(snap?.cropActivityYields) ? snap.cropActivityYields
      : (Array.isArray(snap?.crop_activity_yields) ? snap.crop_activity_yields : []);
    const snapGems = snapActs.find(a => a && a.type === 'gems') || snap?.gems;

    // 1. Get 00:00 UTC Baseline Gems
    let startGems = null;
    if (snapGems && snapGems.startGems !== undefined) {
      startGems = parseFloat(snapGems.startGems);
    } else if (baselineMap.has(dateStr)) {
      startGems = getGemCount(baselineMap.get(dateStr).stock);
    } else {
      const prior = chronological.filter(b => b.snapshot_date <= dateStr);
      if (prior.length > 0) {
        startGems = getGemCount(prior[prior.length - 1].stock);
      }
    }

    // 2. Get 22:30 UTC (or Live) Gems
    let endGems = null;
    if (isToday) {
      const liveGemCount = hasLiveStock ? getGemCount(liveStock) : null;
      if (liveGemCount !== null && startGems !== null && liveGemCount < startGems) {
        endGems = liveGemCount;
      } else if (snapGems && snapGems.endGems !== undefined) {
        endGems = parseFloat(snapGems.endGems);
      } else if (liveGemCount !== null) {
        endGems = liveGemCount;
      }
    } else {
      if (snapGems && snapGems.endGems !== undefined) {
        endGems = parseFloat(snapGems.endGems);
      } else {
        const nextDayStr = getNextDateStr(dateStr);
        if (baselineMap.has(nextDayStr)) {
          endGems = getGemCount(baselineMap.get(nextDayStr).stock);
        } else {
          const later = chronological.filter(b => b.snapshot_date > dateStr);
          if (later.length > 0) {
            endGems = getGemCount(later[0].stock);
          }
        }
      }
    }

    // 3. Compute Difference: 22 UTC minus 0 UTC
    if (startGems !== null && endGems !== null) {
      const diff = Math.round((endGems - startGems) * 10) / 10;
      // If difference is negative, show in spend for gems
      if (diff < 0) {
        const daySpent = Math.abs(diff);
        gemsSpentFromDiffs += daySpent;
        activeDayMeta = { date: dateStr, startGems, endGems, diff, isToday };
      }
    }

    // Fallback activeDayMeta if snapGems recorded gem spend
    if (!activeDayMeta && snapGems && parseFloat(snapGems.gemsSpent || 0) > 0) {
      const sG = snapGems.startGems !== undefined ? parseFloat(snapGems.startGems) : startGems;
      const eG = snapGems.endGems !== undefined ? parseFloat(snapGems.endGems) : endGems;
      const dF = snapGems.netGems !== undefined ? parseFloat(snapGems.netGems) : -parseFloat(snapGems.gemsSpent);
      activeDayMeta = { date: dateStr, startGems: sG, endGems: eG, diff: dF, isToday };
    }
  }

  // Consolidate gems spent
  if (gemsSpentFromDiffs > 0) {
    totalGemsSpent = Math.max(totalGemsSpent, gemsSpentFromDiffs);
  } else if (activeDayMeta && activeDayMeta.diff < 0 && totalGemsSpent === 0) {
    totalGemsSpent = Math.abs(activeDayMeta.diff);
  }

  // Fallback resources calculation for crops/items if no saved spent
  const grossDrops = {};
  if (!hasSavedSpent && allSnapshots.length >= 2) {
    for (let i = 1; i < allSnapshots.length; i++) {
      const prevSnap = allSnapshots[i - 1];
      const currSnap = allSnapshots[i];
      const stepDate = currSnap.isLive ? todayUtcStr : (prevSnap.snapshot_date || '');

      const inRange = (!minDateStr || stepDate >= minDateStr) && (!maxDateStr || stepDate <= maxDateStr);
      if (!inRange) continue;

      const prev = prevSnap.stock || {};
      const curr = currSnap.stock || {};
      const allItems = new Set([...Object.keys(prev), ...Object.keys(curr)]);
      allItems.forEach(item => {
        const clean = normalizeItemKey(item);
        if (IGNORE_ITEMS.has(clean) || !isAllowedDifferenceItem(clean)) return;

        const prevQty = parseFloat(prev[item]) || 0;
        const currQty = parseFloat(curr[item]) || 0;
        const drop = prevQty - currQty;
        if (drop > 0) {
          grossDrops[clean] = (grossDrops[clean] || 0) + drop;
        }
      });
    }
  }

  // Fallback resources calculation if no saved spent
  if (!hasSavedSpent && Object.keys(grossDrops).length > 0) {
    const earliestAct = chronological[0]?.farm_activity || {};
    const latestAct = chronological[chronological.length - 1]?.farm_activity || liveActivity;

    for (const [clean, drop] of Object.entries(grossDrops)) {
      const officialName = ALLOWED_ITEM_NAMES[clean] || clean;
      const sold = tradesSold[clean] || 0;
      const bought = tradesBought[clean] || 0;
      const shop = Math.max(0, 
        (parseFloat(latestAct[officialName + ' Sold']) || 0) - 
        (parseFloat(earliestAct[officialName + ' Sold']) || 0)
      );

      const totalSoldOffset = sold + shop;
      const netConsumed = drop + bought - totalSoldOffset;

      if (netConsumed > 0.01) {
        if (!result[officialName]) result[officialName] = { qty: 0, flowers: 0 };
        result[officialName].qty += netConsumed;
        result[officialName].flowers += parseFloat((netConsumed * getItemPrice(officialName) * 0.9).toFixed(3));
      }
    }
  }

  // Add Coins if spent > 0
  if (totalCoinsSpent > 0) {
    const ratio = getCoinFlowerRatio();
    const coinSpentFlowers = parseFloat((totalCoinsSpent / ratio).toFixed(3));
    result['Coins'] = { qty: Math.round(totalCoinsSpent), flowers: coinSpentFlowers };
  }

  // Add Gems ONLY if spent > 0 (if gained or none, show none)
  if (totalGemsSpent > 0) {
    const gemPrice = getGemFlowerPrice();
    const gemSpentFlowers = parseFloat((totalGemsSpent * gemPrice).toFixed(3));
    result['Gems'] = {
      qty: Math.ceil(totalGemsSpent * 10) / 10,
      flowers: gemSpentFlowers,
      unitPrice: gemPrice,
      dayMeta: activeDayMeta
    };
  }

  const finalItems = Object.entries(result)
    .map(([name, item]) => ({
      ...item,
      name,
      qty: Math.ceil(item.qty * 10) / 10,
      flowers: parseFloat(item.flowers.toFixed(3))
    }))
    .sort((a, b) => b.flowers - a.flowers);

  spentDataMemoryCache.set(spentCacheKey, { data: finalItems, timestamp: Date.now() });
  return finalItems;
}

let currentSpentCategory = 'all';
let isSpentOpen = true;
try {
  const saved = localStorage.getItem('sfl_dash_spent_open');
  if (saved !== null) isSpentOpen = (saved === 'true');
} catch (_) {}

export async function renderSpentSection(mountEl, boundsInput = 'day', preloadedSpentItems = null) {
  if (!mountEl) return;

  const bounds = (typeof boundsInput === 'object' && boundsInput?.label)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'day');

  const rangeLabel = bounds.label || 'Selected Range';
  const allSpentItems = preloadedSpentItems || (await loadSpentData(bounds));

  // Extract Coins and Gems
  const coinsData = allSpentItems.find(i => i.name === 'Coins') || null;
  const gemsData = allSpentItems.find(i => i.name === 'Gems') || null;

  const nonCurrencyItems = allSpentItems
    .filter(i => i.name !== 'Coins' && i.name !== 'Gems')
    .map(i => ({
      ...i,
      category: getItemCategory(i.name)
    }))
    .sort((a, b) => b.flowers - a.flowers);

  const grandFlowers = allSpentItems.reduce((s, v) => s + (v.flowers || 0), 0);

  // Category counts
  const counts = {
    all: nonCurrencyItems.length,
    crops: nonCurrencyItems.filter(i => i.category === 'crops').length,
    resources: nonCurrencyItems.filter(i => i.category === 'resources').length,
    animals: nonCurrencyItems.filter(i => i.category === 'animals').length,
    special: nonCurrencyItems.filter(i => i.category === 'special').length
  };

  if (nonCurrencyItems.length === 0 && !coinsData && !gemsData) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
        <div>
          <h4 class="text-xs sm:text-sm font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>💸</span> Resources, Coins & Gems Spent
          </h4>
          <p class="text-[10px] text-sfl-woodLight dark:text-slate-400">${rangeLabel} • Crafting, chores, coins & gems spent</p>
        </div>
        <div class="text-right">
          <span class="font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/90 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-800 px-2.5 py-1 rounded-xl shadow-2xs">
            -0.000 🌸
          </span>
        </div>
      </div>
      <div class="text-center py-12 px-4 bg-amber-50/40 dark:bg-slate-900/40 rounded-xl border border-amber-200/60 dark:border-slate-800">
        <span class="text-3xl mb-2 block">📉</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Consumption Recorded in ${rangeLabel}</p>
        <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 mt-1">Navigate days with ◀ / ▶ or click 🔄 Refresh.</p>
      </div>`;
    return;
  }

  function getItemsListHtml() {
    const visibleItems = currentSpentCategory === 'all'
      ? nonCurrencyItems
      : nonCurrencyItems.filter(i => i.category === currentSpentCategory);

    if (visibleItems.length === 0) {
      return `
        <div class="text-center py-10 px-4 text-sfl-woodLight dark:text-slate-400">
          <span class="text-2xl mb-1.5 block opacity-60">💸</span>
          <p class="text-xs font-semibold">No ${CATEGORY_META[currentSpentCategory]?.label || 'items'} spent in this timeframe.</p>
        </div>`;
    }

    const maxFlowers = visibleItems[0]?.flowers || 1;

    return visibleItems.map(({ name, qty, flowers, category }) => {
      const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
      const icon = getItemIcon(name);
      const catMeta = CATEGORY_META[category] || { label: category, icon: '🌾' };
      const formattedQty = qty % 1 === 0 ? qty.toLocaleString() : qty.toFixed(1);

      return `
        <div class="group flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-orange-500/10 dark:hover:bg-orange-500/15 transition-colors">
          <!-- Column 1: Item (Icon + Name + Category + Micro Share Bar) -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="text-base sm:text-lg shrink-0 select-none">${icon}</span>
            <div class="min-w-0 truncate flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-sfl-dirt dark:text-amber-100 truncate">${name}</span>
                <span class="text-[9px] font-semibold uppercase tracking-wider text-orange-800/80 dark:text-orange-300/80 bg-orange-100/70 dark:bg-orange-950/60 px-1.5 py-0.2 rounded">${catMeta.label}</span>
              </div>
              <div class="w-20 sm:w-28 bg-amber-200/40 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                <div class="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-300" style="width:${pct}%"></div>
              </div>
            </div>
          </div>

          <!-- Column 2: Quantity Consumed (Aligned) -->
          <div class="w-20 sm:w-24 text-right shrink-0 font-mono">
            <span class="font-bold text-orange-700 dark:text-orange-400">-${formattedQty}</span>
          </div>

          <!-- Column 3: Flower Cost (Aligned) -->
          <div class="w-24 sm:w-28 text-right shrink-0 font-mono">
            <span class="font-bold text-orange-700 dark:text-orange-400 text-xs sm:text-[13px]">-${flowers.toFixed(3)} 🌸</span>
          </div>
        </div>`;
    }).join('');
  }

  function getCoinsBannerHtml(inGrid = false) {
    if (!coinsData || coinsData.qty <= 0) return '';
    const ratio = getCoinFlowerRatio();
    const marginClass = inGrid ? '' : 'mb-3';
    return `
      <div class="bg-gradient-to-r from-orange-500/10 via-amber-500/15 to-orange-500/10 dark:from-orange-950/40 dark:to-amber-950/30 border border-orange-500/30 dark:border-orange-600/40 p-2.5 rounded-xl flex items-center justify-between shadow-2xs ${marginClass} min-h-[58px]">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            🪙
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase text-orange-800 dark:text-orange-300 tracking-wider">Coins Spent</p>
            <p class="font-mono text-sm font-bold text-orange-900 dark:text-orange-100">-${Math.round(coinsData.qty).toLocaleString()} Coins</p>
          </div>
        </div>
        <div class="text-right font-mono">
          <span class="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-100/90 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
            -${coinsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight dark:text-slate-400 mt-1">1🌸 = ${ratio.toLocaleString()}🪙</p>
        </div>
      </div>`;
  }

  function getGemsBannerHtml(inGrid = false) {
    if (!gemsData || gemsData.qty <= 0) return '';
    const gemPrice = getGemFlowerPrice();
    const isDiscount = isGemDiscountActive();
    const selectedPack = getSelectedGemPack();
    const packLabel = selectedPack ? `${selectedPack} Pack` : '100 Pack';
    const discountBadge = isDiscount ? '<span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-950/50 px-1 py-0.2 rounded border border-emerald-300/60 dark:border-emerald-700/60">-20%</span>' : '';
    const marginClass = inGrid ? '' : 'mb-3';

    let diffTooltip = `1💎 = ${gemPrice.toFixed(4)}🌸 • ${packLabel}`;
    let diffSubtitle = `${packLabel}`;
    if (gemsData.dayMeta && gemsData.dayMeta.startGems !== null && gemsData.dayMeta.endGems !== null) {
      const { startGems, endGems, diff, isToday } = gemsData.dayMeta;
      const endLabel = isToday ? 'Live' : '22:30 UTC';
      diffTooltip = `00:00 UTC: ${Math.round(startGems).toLocaleString()} ➔ ${endLabel}: ${Math.round(endGems).toLocaleString()} (${diff} 💎) • ${packLabel}`;
      diffSubtitle = `0 ➔ ${endLabel}: ${diff}💎`;
    }

    return `
      <div class="bg-gradient-to-r from-sky-500/10 via-blue-500/15 to-cyan-500/10 dark:from-sky-950/40 dark:to-cyan-950/30 border border-sky-500/30 dark:border-sky-600/40 p-2.5 rounded-xl flex items-center justify-between shadow-2xs ${marginClass} min-h-[58px]"
        title="${diffTooltip}">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            💎
          </div>
          <div>
            <div class="flex items-center gap-1">
              <p class="text-[10px] font-bold uppercase text-sky-800 dark:text-sky-300 tracking-wider">Gems Spent</p>
              ${discountBadge}
            </div>
            <p class="font-mono text-sm font-bold text-sky-900 dark:text-sky-100">-${(gemsData.qty % 1 === 0 ? gemsData.qty.toLocaleString() : gemsData.qty.toFixed(1))} Gems</p>
          </div>
        </div>
        <div class="text-right font-mono">
          <span class="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 px-2 py-0.5 rounded-lg shadow-2xs">
            -${gemsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight dark:text-slate-400 mt-1 truncate max-w-[130px]" title="${diffTooltip}">${diffSubtitle}</p>
        </div>
      </div>`;
  }

  function getCurrencyBannersHtml() {
    const hasCoins = coinsData && coinsData.qty > 0;
    const hasGems = gemsData && gemsData.qty > 0;

    if (!hasCoins && !hasGems) return '';

    if (hasCoins && hasGems) {
      return `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          ${getCoinsBannerHtml(true)}
          ${getGemsBannerHtml(true)}
        </div>`;
    }

    if (hasCoins) return getCoinsBannerHtml(false);
    return getGemsBannerHtml(false);
  }

  function getCategoryPillsHtml() {
    const pill = (cat, label, icon, count) => {
      const isActive = currentSpentCategory === cat;
      const activeClass = isActive
        ? 'bg-orange-600 text-white font-bold shadow-xs'
        : 'text-sfl-wood hover:text-sfl-dirt dark:text-slate-400 dark:hover:text-amber-200 font-medium hover:bg-amber-200/50 dark:hover:bg-slate-800';
      return `
        <button data-cat="${cat}" class="dash-spent-cat-btn px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs ${activeClass}">
          <span>${icon}</span>
          <span>${label}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-200/60 dark:bg-slate-800 text-sfl-woodLight dark:text-slate-400'}">${count}</span>
        </button>`;
    };

    return `
      <div class="flex items-center gap-1 overflow-x-auto p-1 bg-amber-100/70 dark:bg-slate-900/60 rounded-xl border border-amber-300/60 dark:border-slate-800 mb-3 scrollbar-none">
        ${pill('all', 'All', '🌟', counts.all)}
        ${pill('crops', 'Crops', '🌾', counts.crops)}
        ${pill('resources', 'Resources', '🪵', counts.resources)}
        ${pill('animals', 'Animals', '🥚', counts.animals)}
        ${pill('special', 'Special', '🎁', counts.special)}
      </div>`;
  }

  const currencyCount = (coinsData ? 1 : 0) + (gemsData ? 1 : 0);
  const totalDisplayCount = nonCurrencyItems.length + currencyCount;

  mountEl.innerHTML = `
    <!-- Header (Click to Expand / Collapse) -->
    <div id="dash-spent-toggle-header" class="flex items-center justify-between cursor-pointer select-none group py-0.5"
      title="${isSpentOpen ? 'Click to collapse breakdown' : 'Click to expand breakdown'}">
      <div class="min-w-0 pr-2 flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          💸
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-xs sm:text-sm font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
              Resources, Coins & Gems Spent
            </h4>
            <span class="text-[10px] font-bold text-sfl-woodLight dark:text-slate-400 bg-amber-200/50 dark:bg-slate-800 px-2 py-0.2 rounded-full border border-amber-300/50 dark:border-slate-700">
              ${totalDisplayCount} ${totalDisplayCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5">${rangeLabel} • Crafting, chores, coins & gems spent</p>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <span class="font-mono text-xs sm:text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/90 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-800 px-2.5 py-1 rounded-xl shadow-2xs">
          -${grandFlowers.toFixed(3)} 🌸
        </span>
        <button id="dash-spent-arrow-btn" class="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-amber-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-sfl-wood dark:text-amber-200 transition shadow-2xs cursor-pointer"
          title="${isSpentOpen ? 'Collapse items' : 'Expand items'}">
          ${isSpentOpen ? '▲' : '▼'}
        </button>
      </div>
    </div>

    <!-- Collapsible Body (Currency Banners + Filter Pills + Ledger Table + Footnote) -->
    <div id="dash-spent-body" class="${isSpentOpen ? '' : 'hidden'} mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 space-y-3">
      <!-- Featured Coins & Gems Spent Banners -->
      ${getCurrencyBannersHtml()}

      <!-- Section Title & Category Filter Pills -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>📊</span> Item Breakdown
          </h5>
        </div>
        <div id="dash-spent-cat-pills">${getCategoryPillsHtml()}</div>
      </div>

      <!-- Item Breakdown Content Table -->
      <div class="rounded-xl border border-amber-200/60 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-900/40 overflow-hidden shadow-2xs">
        <div class="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-amber-100/90 dark:bg-slate-900/95 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400 border-b border-amber-200/60 dark:border-slate-800">
          <span class="flex-1">Item</span>
          <span class="w-20 sm:w-24 text-right">Consumed</span>
          <span class="w-24 sm:w-28 text-right">Flower Cost</span>
        </div>
        <div id="dash-spent-items-list" class="max-h-[380px] overflow-y-auto divide-y divide-amber-200/30 dark:divide-slate-800/40">
          ${getItemsListHtml()}
        </div>
      </div>
      <p class="text-[10px] text-sfl-woodLight dark:text-slate-500 italic mt-2.5 text-center">
        * Trade-adjusted consumption. Excludes marketplace sales.
      </p>
    </div>`;

  // Bind collapse / expand toggle
  const toggleHeader = mountEl.querySelector('#dash-spent-toggle-header');
  if (toggleHeader && !toggleHeader._bound) {
    toggleHeader._bound = true;
    toggleHeader.addEventListener('click', (e) => {
      isSpentOpen = !isSpentOpen;
      try { localStorage.setItem('sfl_dash_spent_open', String(isSpentOpen)); } catch (_) {}
      const body = mountEl.querySelector('#dash-spent-body');
      const arrow = mountEl.querySelector('#dash-spent-arrow-btn');
      if (body) {
        if (isSpentOpen) body.classList.remove('hidden');
        else body.classList.add('hidden');
      }
      if (arrow) {
        arrow.textContent = isSpentOpen ? '▲' : '▼';
        arrow.title = isSpentOpen ? 'Collapse items' : 'Expand items';
      }
    });
  }

  // Delegated listener on stable parent — survives innerHTML re-renders of pill/list children
  if (!mountEl._spentCatListenerBound) {
    mountEl._spentCatListenerBound = true;
    mountEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.dash-spent-cat-btn');
      if (!btn) return;
      const targetCat = btn.getAttribute('data-cat');
      if (!targetCat || targetCat === currentSpentCategory) return;
      currentSpentCategory = targetCat;
      const pillsContainer = mountEl.querySelector('#dash-spent-cat-pills');
      const listContainer = mountEl.querySelector('#dash-spent-items-list');
      if (pillsContainer) pillsContainer.innerHTML = getCategoryPillsHtml();
      if (listContainer) listContainer.innerHTML = getItemsListHtml();
    });
  }
}
