// ─── Items Spent Section ──────────────────────────────────────────────────────
// Diffs consecutive preharvest_baselines.stock rows to compute items consumed.

import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES, isAllowedDifferenceItem, ALLOWED_ITEM_NAMES, getCoinFlowerRatio } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';
import { tradeHistoryData } from '../tradeHistory/tradeData.js';
import { ApiService } from '../../services/api.js';
import { getItemNameById } from '../../data/knownIds.js';
import { getDateRangeBounds } from './dashboardPanel.js';
import { ITEM_CATEGORIES, CATEGORY_META, getItemCategory } from './dashboardEarned.js';

function getItemPrice(name) {
  if (name === 'Coins' || normalizeItemKey(name) === 'coins') {
    return 1 / getCoinFlowerRatio();
  }
  if (window.allPrices) {
    const cleanKey = normalizeItemKey(name);
    const match = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (match) {
      const p = parseFloat(window.allPrices[match]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
  }
  const betty = getBettyUnitPrice(normalizeItemKey(name));
  if (betty !== null && betty > 0) return betty;
  const fallback = RESOURCE_FLOWER_FALLBACK_PRICES[normalizeItemKey(name)];
  if (fallback && fallback > 0) return fallback;
  return 0.01;
}

const ITEM_ICONS = {
  coins: '🪙', coin: '🪙',
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

export async function loadSpentData(boundsInput = 'week') {
  const result = {};
  let history = [];
  try { history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]'); } catch (_) {}

  const bounds = (typeof boundsInput === 'object' && boundsInput?.minDateStr)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'week');

  const minTimestamp = bounds.minTimestamp || 0;
  const maxTimestamp = bounds.maxTimestamp || Infinity;
  const minDateStr = bounds.minDateStr || '';
  const maxDateStr = bounds.maxDateStr || '';

  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value?.trim() || '';

  // ── Gather all trade activity (fulfilled sold/bought, active listings, and in-game shop sales) ──
  const tradesSold = {};
  const tradesBought = {};
  const activeListings = {};

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

  // 2. Active Marketplace Listings (escrowed items that left inventory but are not consumed)
  const allListings = {
    ...(tradeHistoryData?.listings || {}),
    ...(window.farmData?.trades?.listings || {}),
    ...(window.farmData?.farm?.trades?.listings || {})
  };

  Object.values(allListings).forEach(listing => {
    if (!listing || !listing.items) return;
    for (const [rawKey, rawQty] of Object.entries(listing.items)) {
      const clean = normalizeItemKey(getItemNameById(rawKey) || rawKey);
      if (clean) {
        activeListings[clean] = (activeListings[clean] || 0) + parseFloat(rawQty || 0);
      }
    }
  });

  // 3. In-Game Shop Sales (from live farmActivity)
  const liveActivity = {
    ...(window.farmData?.farmActivity || {}),
    ...(window.farmData?.bumpkin?.activity || {}),
    ...(window.farmData?.farm?.farmActivity || {})
  };

  let hasSavedSpent = false;
  let totalCoinsSpent = 0;

  // 1. First, check sfl_daily_snapshots for saved spent records
  history.forEach(h => {
    const d = h.date || h.yield_date || '';
    if (minDateStr && (d < minDateStr || d > maxDateStr)) return;

    const rawSpent = (Array.isArray(h.spent) && h.spent.length > 0) ? h.spent
      : (Array.isArray(h.cropActivityYields) ? h.cropActivityYields.find(a => a && a.type === 'spent')?.items : null);

    if (Array.isArray(rawSpent) && rawSpent.length > 0) {
      hasSavedSpent = true;
      rawSpent.forEach(item => {
        const name = item.name || item.crop || item.item;
        if (!name) return;
        const clean = normalizeItemKey(name);
        if (clean === 'coins') {
          totalCoinsSpent += parseFloat(item.qty || 0);
          return;
        }
        if (!isAllowedDifferenceItem(clean)) return;

        // Deduct sold or active listings
        const soldOffset = (tradesSold[clean] || 0) + (activeListings[clean] || 0);
        let qty = parseFloat(item.qty || 0);
        if (soldOffset > 0) {
          qty = Math.max(0, qty - soldOffset);
        }
        if (qty <= 0.01) return; // Sold or listed item is NOT spent!

        const officialName = ALLOWED_ITEM_NAMES[clean] || name;
        if (!result[officialName]) result[officialName] = { qty: 0, flowers: 0 };
        const flowers = parseFloat(item.flowers || (qty * getItemPrice(officialName) * 0.9));
        result[officialName].qty += qty;
        result[officialName].flowers += flowers;
      });
    }

    // Accumulate coins spent
    const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
    const coinsObj = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
    if (coinsObj && coinsObj.coinsSpent) {
      totalCoinsSpent = Math.max(totalCoinsSpent, parseFloat(coinsObj.coinsSpent || 0));
    }
  });

  // 2. Fall back to trade-adjusted preharvest_baselines if no saved spent data
  if (!hasSavedSpent) {
    try {
      const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
      const user = window.currentUser;

      if (client && (user || farmId)) {
        const rowLimit = timeRange === '7d' ? 8 : 31;
        let query = client
          .from('preharvest_baselines')
          .select('snapshot_date, stock, farm_activity')
          .order('snapshot_date', { ascending: false })
          .limit(rowLimit);

        if (user?.id) query = query.eq('user_id', user.id);
        else if (farmId) query = query.eq('farm_id', farmId);

        const { data } = await query;
        if (data && data.length >= 2) {
          const chronological = [...data].reverse();

          // Calculate in-game shop sales between earliest and latest baselines
          const earliestAct = chronological[0]?.farm_activity || {};
          const latestAct = chronological[chronological.length - 1]?.farm_activity || liveActivity;

          // Track drops per item across consecutive baselines
          const grossDrops = {};
          for (let i = 1; i < chronological.length; i++) {
            const prev = chronological[i - 1].stock || {};
            const curr = chronological[i].stock || {};

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

          // Net consumed = Gross Drop + Bought - (Sold + Active Listings + In-Game Shop Sold)
          for (const [clean, drop] of Object.entries(grossDrops)) {
            const officialName = ALLOWED_ITEM_NAMES[clean] || clean;
            const sold = tradesSold[clean] || 0;
            const bought = tradesBought[clean] || 0;
            const listed = activeListings[clean] || 0;
            const shop = Math.max(0, 
              (parseFloat(latestAct[officialName + ' Sold']) || 0) - 
              (parseFloat(earliestAct[officialName + ' Sold']) || 0)
            );

            const totalSoldOffset = sold + listed + shop;
            const netConsumed = drop + bought - totalSoldOffset;

            if (netConsumed > 0.01) {
              if (!result[officialName]) result[officialName] = { qty: 0, flowers: 0 };
              result[officialName].qty += netConsumed;
              result[officialName].flowers += parseFloat((netConsumed * getItemPrice(officialName) * 0.9).toFixed(3));
            }
          }
        }
      }
    } catch (_) {}
  }

  // Add Coins if spent > 0
  if (totalCoinsSpent > 0) {
    const ratio = getCoinFlowerRatio();
    const coinSpentFlowers = parseFloat((totalCoinsSpent / ratio).toFixed(3));
    result['Coins'] = { qty: Math.round(totalCoinsSpent), flowers: coinSpentFlowers };
  }

  return Object.entries(result)
    .map(([name, { qty, flowers }]) => ({
      name,
      qty: Math.ceil(qty * 10) / 10,
      flowers: parseFloat(flowers.toFixed(3))
    }))
    .sort((a, b) => b.flowers - a.flowers);
}

let currentSpentCategory = 'all';

export async function renderSpentSection(mountEl, boundsInput = 'week') {
  if (!mountEl) return;

  const bounds = (typeof boundsInput === 'object' && boundsInput?.label)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'week');

  const rangeLabel = bounds.label || 'Selected Range';
  const allSpentItems = await loadSpentData(bounds);

  // Extract Coins
  const coinsData = allSpentItems.find(i => i.name === 'Coins') || null;
  const nonCoinItems = allSpentItems
    .filter(i => i.name !== 'Coins')
    .map(i => ({
      ...i,
      category: getItemCategory(i.name)
    }))
    .sort((a, b) => b.flowers - a.flowers);

  const grandFlowers = allSpentItems.reduce((s, v) => s + (v.flowers || 0), 0);

  // Category counts
  const counts = {
    all: nonCoinItems.length,
    crops: nonCoinItems.filter(i => i.category === 'crops').length,
    resources: nonCoinItems.filter(i => i.category === 'resources').length,
    animals: nonCoinItems.filter(i => i.category === 'animals').length,
    special: nonCoinItems.filter(i => i.category === 'special').length
  };

  if (nonCoinItems.length === 0 && !coinsData) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <div>
          <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>💸</span> Resources & Coins Spent
          </h4>
          <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • Crafting, chores & coins spent</p>
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
        <p class="text-[11px] text-sfl-woodLight mt-1">Navigate days with ◀ / ▶ or sync inventory data.</p>
      </div>`;
    return;
  }

  function getItemsListHtml() {
    const visibleItems = currentSpentCategory === 'all'
      ? nonCoinItems
      : nonCoinItems.filter(i => i.category === currentSpentCategory);

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

  function getCoinsBannerHtml() {
    if (!coinsData || coinsData.qty <= 0) return '';
    const ratio = getCoinFlowerRatio();
    return `
      <div class="bg-gradient-to-r from-orange-500/15 via-amber-500/20 to-orange-500/15 dark:from-orange-950/50 dark:to-amber-950/40 border border-orange-500/40 dark:border-orange-600/50 p-2.5 rounded-xl flex items-center justify-between shadow-2xs mb-2.5">
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

  mountEl.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>💸</span> Resources & Coins Spent
        </h4>
        <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • Crafting, chores & coins spent</p>
      </div>
      <div class="text-right">
        <span class="font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
          ${grandFlowers.toFixed(3)} 🌸 Used
        </span>
      </div>
    </div>

    <!-- Featured Coins Spent Card -->
    ${getCoinsBannerHtml()}

    <!-- Section Title & Category Filter Pills -->
    <div class="mb-1">
      <div class="flex items-center justify-between mb-1.5">
        <h5 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>📊</span> Item Breakdown
        </h5>
        <span class="text-[10px] font-bold text-sfl-woodLight bg-amber-200/50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          ${nonCoinItems.length + (coinsData ? 1 : 0)} items & coins
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
      // Re-attach listeners to refreshed pills
      mountEl.querySelectorAll('.dash-spent-cat-btn').forEach(b => {
        b.addEventListener('click', () => {
          currentSpentCategory = b.getAttribute('data-cat');
          renderSpentSection(mountEl, boundsInput);
        });
      });
    });
  });
}
