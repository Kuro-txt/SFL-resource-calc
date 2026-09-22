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
    const clean = normalizeItemKey((rawName && !rawName.startsWith('Item #')) ? rawName : getItemNameById(t.itemId || rawName));
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

  // ── 2. Day-by-day 22:00 UTC vs 00:00 UTC Gems Difference Calculation ──
  // Per user rule: Compare 22:00 UTC gems with 00:00 UTC baseline gems; if difference is negative, show in spend for gems.
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

    // 2. Get 22:00 UTC (or Live) Gems
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
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <div>
          <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>💸</span> Resources, Coins & Gems Spent
          </h4>
          <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • Crafting, chores, coins & gems spent</p>
        </div>
        <div class="text-right">
          <span class="font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
            0.000 🌸 Used
          </span>
        </div>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">📉</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Consumption in ${rangeLabel}</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Navigate days with ◀ / ▶ or click 🔄 Sync Data.</p>
      </div>`;
    return;
  }

  function getItemsListHtml() {
    const visibleItems = currentSpentCategory === 'all'
      ? nonCurrencyItems
      : nonCurrencyItems.filter(i => i.category === currentSpentCategory);

    if (visibleItems.length === 0) {
      return `
        <div class="text-center py-6 px-3 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-200/40 dark:border-amber-800/30">
          <p class="text-xs font-semibold text-sfl-woodLight">No ${CATEGORY_META[currentSpentCategory]?.label || 'items'} spent in this timeframe.</p>
        </div>`;
    }

    const maxFlowers = visibleItems[0]?.flowers || 1;

    return visibleItems.map(({ name, qty, flowers, category }) => {
      const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
      const icon = getItemIcon(name);
      const catMeta = CATEGORY_META[category] || { label: category, icon: '🌾' };
      const formattedQty = qty % 1 === 0 ? qty.toLocaleString() : qty.toFixed(1);

      return `
        <div class="group flex items-center gap-2.5 text-xs py-1.5 hover:bg-orange-100/40 dark:hover:bg-orange-950/30 px-2 rounded-lg transition border border-transparent hover:border-orange-200/50 dark:hover:border-orange-800/40">
          <span class="text-base shrink-0">${icon}</span>
          <div class="w-24 sm:w-28 truncate shrink-0">
            <span class="font-bold text-sfl-dirt dark:text-amber-100" title="${name}">${name}</span>
            <span class="block text-[9px] text-sfl-woodLight font-medium">${catMeta.label}</span>
          </div>
          <div class="flex-1 bg-amber-200/60 dark:bg-amber-900/40 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <div class="text-right shrink-0 font-mono">
            <span class="font-bold text-orange-700 dark:text-orange-400">-${formattedQty}</span>
            <span class="text-sfl-woodLight text-[11px] ml-1">(${flowers.toFixed(3)} 🌸)</span>
          </div>
        </div>`;
    }).join('');
  }

  function getCoinsBannerHtml(inGrid = false) {
    if (!coinsData || coinsData.qty <= 0) return '';
    const ratio = getCoinFlowerRatio();
    const marginClass = inGrid ? '' : 'mb-2.5';
    return `
      <div class="bg-gradient-to-r from-orange-500/15 via-amber-500/20 to-orange-500/15 dark:from-orange-950/50 dark:to-amber-950/40 border border-orange-500/40 dark:border-orange-600/50 p-2.5 rounded-xl flex items-center justify-between shadow-2xs ${marginClass}">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <div>
            <p class="text-[10px] font-bold uppercase text-orange-800 dark:text-orange-300 tracking-wider">Coins Spent</p>
            <p class="font-mono text-sm font-bold text-orange-900 dark:text-orange-100">-${Math.round(coinsData.qty).toLocaleString()} Coins</p>
          </div>
        </div>
        <div class="text-right">
          <span class="font-mono text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-100/90 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
            -${coinsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight font-mono mt-0.5">1🌸 = ${ratio.toLocaleString()}🪙</p>
        </div>
      </div>`;
  }

  function getGemsBannerHtml(inGrid = false) {
    if (!gemsData || gemsData.qty <= 0) return '';
    const gemPrice = getGemFlowerPrice();
    const isDiscount = isGemDiscountActive();
    const selectedPack = getSelectedGemPack();
    const packLabel = selectedPack ? `${selectedPack} Pack` : '100 Pack';
    const discountBadge = isDiscount ? '<span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold ml-1 bg-emerald-100/80 dark:bg-emerald-950/50 px-1 py-0.5 rounded border border-emerald-300/60 dark:border-emerald-700/60">-20%</span>' : '';
    const marginClass = inGrid ? '' : 'mb-2.5';

    let diffSubtitle = `1💎 = ${gemPrice.toFixed(4)}🌸 • ${packLabel}`;
    if (gemsData.dayMeta && gemsData.dayMeta.startGems !== null && gemsData.dayMeta.endGems !== null) {
      const { startGems, endGems, diff, isToday } = gemsData.dayMeta;
      const endLabel = isToday ? 'Live' : '22 UTC';
      diffSubtitle = `0 UTC: ${Math.round(startGems).toLocaleString()} ➔ ${endLabel}: ${Math.round(endGems).toLocaleString()} (${diff} 💎) • ${packLabel}`;
    }

    return `
      <div class="bg-gradient-to-r from-sky-500/15 via-blue-500/20 to-cyan-500/15 dark:from-sky-950/50 dark:to-cyan-950/40 border border-sky-500/40 dark:border-sky-600/50 p-2.5 rounded-xl flex items-center justify-between shadow-2xs ${marginClass}">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💎</span>
          <div>
            <div class="flex items-center gap-1">
              <p class="text-[10px] font-bold uppercase text-sky-800 dark:text-sky-300 tracking-wider">Gems Spent</p>
              ${discountBadge}
            </div>
            <p class="font-mono text-sm font-bold text-sky-900 dark:text-sky-100">-${(gemsData.qty % 1 === 0 ? gemsData.qty.toLocaleString() : gemsData.qty.toFixed(1))} Gems</p>
          </div>
        </div>
        <div class="text-right">
          <span class="font-mono text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 px-2 py-0.5 rounded-lg shadow-2xs">
            -${gemsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight font-mono mt-0.5">${diffSubtitle}</p>
        </div>
      </div>`;
  }

  function getCurrencyBannersHtml() {
    const hasCoins = coinsData && coinsData.qty > 0;
    const hasGems = gemsData && gemsData.qty > 0;

    if (!hasCoins && !hasGems) return '';

    if (hasCoins && hasGems) {
      return `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
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
        ? 'bg-orange-600 text-white shadow-xs'
        : 'bg-amber-100/90 dark:bg-amber-900/40 text-sfl-wood dark:text-amber-200 hover:bg-amber-200/80 dark:hover:bg-amber-800/60';
      return `
        <button data-cat="${cat}" class="dash-spent-cat-btn px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1 ${activeClass}">
          <span>${icon}</span>
          <span>${label}</span>
          <span class="opacity-75 text-[10px]">(${count})</span>
        </button>`;
    };

    return `
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5 text-xs font-bold scrollbar-none">
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
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>💸</span> Resources, Coins & Gems Spent
        </h4>
        <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • Crafting, chores, coins & gems spent</p>
      </div>
      <div class="text-right">
        <span class="font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
          ${grandFlowers.toFixed(3)} 🌸 Used
        </span>
      </div>
    </div>

    <!-- Featured Coins & Gems Spent Banners -->
    ${getCurrencyBannersHtml()}

    <!-- Section Title & Category Filter Pills -->
    <div class="mb-1">
      <div class="flex items-center justify-between mb-1.5">
        <h5 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>📊</span> Item Breakdown
        </h5>
        <span class="text-[10px] font-bold text-sfl-woodLight bg-amber-200/50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          ${totalDisplayCount} ${totalDisplayCount === 1 ? 'item' : 'items'} & currency
        </span>
      </div>
      <div id="dash-spent-cat-pills">${getCategoryPillsHtml()}</div>
    </div>

    <!-- Item Breakdown Content List -->
    <div id="dash-spent-items-list" class="max-h-80 overflow-y-auto pr-1 space-y-1">
      ${getItemsListHtml()}
    </div>
    <p class="text-[10px] text-sfl-woodLight italic mt-3 pt-2 border-t border-amber-100 dark:border-amber-900/40">
      * Trade-adjusted consumption. Excludes marketplace sales.
    </p>`;

  // Attach Category Filter Listeners
  mountEl.querySelectorAll('.dash-spent-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetCat = btn.getAttribute('data-cat');
      if (!targetCat || targetCat === currentSpentCategory) return;
      currentSpentCategory = targetCat;
      const pillsContainer = mountEl.querySelector('#dash-spent-cat-pills');
      const listContainer = mountEl.querySelector('#dash-spent-items-list');
      if (pillsContainer) pillsContainer.innerHTML = getCategoryPillsHtml();
      if (listContainer) listContainer.innerHTML = getItemsListHtml();
    });
  });
}
