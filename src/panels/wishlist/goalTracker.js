import { 
  ALLOWED_DIFFERENCE_ITEMS, 
  BETTY_SHOP_PRICES, 
  RESOURCE_FLOWER_FALLBACK_PRICES, 
  FLOWER_IMG_SMALL_HTML,
  SFL_PLOT_CROPS,
  SFL_GREENHOUSE_CROPS,
  SFL_FRUITS,
  getItemTaxRate
} from '../../config/constants.js';
import { normalizeItemKey, roundUpToThreeDecimals } from '../../utils/formatters.js';
import { ApiService } from '../../services/api.js';
import { getFlowerUsdRate, formatUsdAmount } from '../wishlistPanel.js';
import { PanelManager } from '../../services/panelManager.js';

// Item Categorization Sets for Quick Presets
export const CROPS_SET = new Set([
  'sunflower', 'potato', 'pumpkin', 'carrot', 'cabbage',
  'beetroot', 'cauliflower', 'parsnip', 'radish', 'wheat',
  'kale', 'apple', 'blueberry', 'orange', 'eggplant',
  'corn', 'banana', 'soybean', 'grape', 'rice',
  'olive', 'tomato', 'lemon', 'barley', 'rhubarb',
  'zucchini', 'yam', 'broccoli', 'pepper', 'onion',
  'turnip', 'artichoke', 'duskberry', 'lunara', 'celestine'
]);

export const RESOURCES_SET = new Set([
  'wood', 'stone', 'iron', 'gold', 'egg',
  'honey', 'crimstone', 'leather', 'wool', 'merinowool',
  'feather', 'milk', 'obsidian', 'salt'
]);

export const EMBLEMS_SET = new Set([
  'goblinemblem', 'bumpkinemblem', 'sunflorianemblem', 'nightshadeemblem',
  'ruffroot', 'chewedbone', 'heartleaf', 'moonfur', 'ribbon',
  'dewberry', 'wildgrass', 'frostpebble', 'capsulebait', 'umbrellabait', 'crimsonbaitfish'
]);

// Module State
let activeTargetNames = new Set(); // Set of string NFT names (multiple targets allowed)
let priceMode = 'floor'; // 'floor' | 'offer'
let includeBalance = true;
let isTrackerCollapsed = false;
let isTableCollapsed = false;
let showInStockOnly = false;
let searchQuery = '';
let sortField = 'default'; // 'default' | 'name' | 'qty' | 'price' | 'value' | 'usd' | 'pledged'
let sortOrder = 'desc'; // 'asc' | 'desc'
let includedItemKeys = new Set();
let cachedWishlistItems = [];

// Initialize default state from localStorage
export function initGoalTrackerState() {
  try {
    const savedTargets = localStorage.getItem('sfl_wishlist_goal_targets');
    if (savedTargets) {
      const parsed = JSON.parse(savedTargets);
      if (Array.isArray(parsed)) {
        activeTargetNames = new Set(parsed);
      }
    } else {
      const single = localStorage.getItem('sfl_wishlist_goal_target');
      if (single) {
        activeTargetNames = new Set([single]);
      }
    }

    priceMode = localStorage.getItem('sfl_wishlist_goal_price_type') || 'floor';
    includeBalance = localStorage.getItem('sfl_wishlist_goal_include_balance') !== 'false';
    isTrackerCollapsed = localStorage.getItem('sfl_wishlist_goal_collapsed') === 'true';
    isTableCollapsed = localStorage.getItem('sfl_wishlist_goal_table_collapsed') === 'true';
    showInStockOnly = localStorage.getItem('sfl_wishlist_goal_show_in_stock_only') === 'true';
    sortField = localStorage.getItem('sfl_wishlist_goal_sort_field') || 'default';
    sortOrder = localStorage.getItem('sfl_wishlist_goal_sort_order') || 'desc';

    const savedKeys = localStorage.getItem('sfl_wishlist_goal_items');
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      if (Array.isArray(parsed)) {
        includedItemKeys = new Set(parsed);
      } else {
        resetIncludedToAll();
      }
    } else {
      resetIncludedToAll();
    }
  } catch (_) {
    resetIncludedToAll();
  }
}

function resetIncludedToAll() {
  includedItemKeys = new Set();
  ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
    includedItemKeys.add(normalizeItemKey(name));
  });
  saveIncludedKeys();
}

function saveIncludedKeys() {
  try {
    localStorage.setItem('sfl_wishlist_goal_items', JSON.stringify(Array.from(includedItemKeys)));
  } catch (_) {}
}

function saveGoalTargets() {
  try {
    const arr = Array.from(activeTargetNames);
    localStorage.setItem('sfl_wishlist_goal_targets', JSON.stringify(arr));
    if (arr.length > 0) {
      localStorage.setItem('sfl_wishlist_goal_target', arr[0]);
    } else {
      localStorage.removeItem('sfl_wishlist_goal_target');
    }
  } catch (_) {}
}

// Goal Target Helpers (Multiple Targets Supported)
export function getActiveGoalItems() {
  return Array.from(activeTargetNames);
}

export function isItemInGoal(itemName) {
  if (!itemName) return false;
  return activeTargetNames.has(itemName);
}

export function toggleGoalItem(itemName) {
  if (!itemName) return;
  if (activeTargetNames.has(itemName)) {
    activeTargetNames.delete(itemName);
  } else {
    activeTargetNames.add(itemName);
  }
  saveGoalTargets();
  renderGoalTracker(cachedWishlistItems);
}

export function addGoalItem(itemName) {
  if (!itemName) return;
  activeTargetNames.add(itemName);
  saveGoalTargets();
  renderGoalTracker(cachedWishlistItems);
}

export function removeGoalItem(itemName) {
  if (!itemName) return;
  activeTargetNames.delete(itemName);
  saveGoalTargets();
  renderGoalTracker(cachedWishlistItems);
}

export function clearGoalItems() {
  activeTargetNames.clear();
  saveGoalTargets();
  renderGoalTracker(cachedWishlistItems);
}

export function setAllWishlistAsGoals(wishlistItems = []) {
  activeTargetNames.clear();
  wishlistItems.forEach(i => activeTargetNames.add(i.name));
  saveGoalTargets();
  renderGoalTracker(wishlistItems);
}

// Backward-compatibility helpers
export function getActiveGoalItem() {
  const arr = Array.from(activeTargetNames);
  return arr.length > 0 ? arr[0] : '';
}

export function setActiveGoalItem(itemName) {
  toggleGoalItem(itemName);
}

export function getSortIndicator(field) {
  if (sortField === field) {
    return sortOrder === 'asc' ? '▲' : '▼';
  }
  return '⇅';
}

export function sortInventoryRows(rows) {
  const mult = sortOrder === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortField === 'name') {
      return mult * a.name.localeCompare(b.name);
    }
    if (sortField === 'qty') {
      const diff = a.qty - b.qty;
      if (diff !== 0) return mult * diff;
      return a.name.localeCompare(b.name);
    }
    if (sortField === 'price') {
      const diff = a.unitPrice - b.unitPrice;
      if (diff !== 0) return mult * diff;
      return a.name.localeCompare(b.name);
    }
    if (sortField === 'value' || sortField === 'usd') {
      const diff = a.flowerValue - b.flowerValue;
      if (diff !== 0) return mult * diff;
      return a.name.localeCompare(b.name);
    }
    if (sortField === 'pledged') {
      const diff = (a.isIncluded ? 1 : 0) - (b.isIncluded ? 1 : 0);
      if (diff !== 0) return mult * diff;
      return b.flowerValue - a.flowerValue;
    }
    return 0; // 'default': category/whitelist order
  });
}

// Price and Inventory Helpers
export function getItemFlowerPrice(cleanKey) {
  if (typeof window !== 'undefined' && window.allPrices && typeof window.allPrices === 'object') {
    const matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      const rawPrice = parseFloat(window.allPrices[matchedKey]) || 0;
      // Sanity cap: per-unit P2P flower prices for crops/resources are never > 50.
      // Values > 50 indicate stale lot-level data from the old sfl.world/api/v1/prices.
      if (rawPrice > 0 && rawPrice <= 50) {
        return rawPrice;
      }
    }
  }

  if (BETTY_SHOP_PRICES[cleanKey] !== undefined && BETTY_SHOP_PRICES[cleanKey] > 0) {
    return BETTY_SHOP_PRICES[cleanKey];
  }

  if (RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey] !== undefined && RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey] > 0) {
    return RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey];
  }

  return 0.01;
}

export function getFarmInventoryData() {
  if (typeof window !== 'undefined' && window.farmInventoryData && Object.keys(window.farmInventoryData).length > 0) {
    return window.farmInventoryData;
  }
  try {
    return JSON.parse(localStorage.getItem('sfl_farm_inventory') || '{}');
  } catch (_) {
    return {};
  }
}

export function getOnFarmBalance() {
  if (typeof window !== 'undefined' && typeof window.farmBalance === 'number' && window.farmBalance >= 0) {
    return window.farmBalance;
  }
  try {
    const val = parseFloat(localStorage.getItem('sfl_farm_balance'));
    return !isNaN(val) && val >= 0 ? val : 0;
  } catch (_) {
    return 0;
  }
}

export function getItemInventoryQuantity(cleanKey) {
  const inv = getFarmInventoryData();
  if (!inv || typeof inv !== 'object') return 0;
  
  const foundKey = Object.keys(inv).find(k => normalizeItemKey(k) === cleanKey);
  if (foundKey && inv[foundKey] !== undefined) {
    const qty = parseFloat(inv[foundKey]);
    return !isNaN(qty) && qty > 0 ? qty : 0;
  }
  return 0;
}

export function getItemCategoryInfo(cleanKey) {
  if (SFL_GREENHOUSE_CROPS.has(cleanKey)) {
    return { category: 'Greenhouse', badge: '🏡 Greenhouse', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' };
  }
  if (SFL_FRUITS.has(cleanKey)) {
    return { category: 'Fruit', badge: '🍎 Fruit', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300' };
  }
  if (CROPS_SET.has(cleanKey)) {
    return { category: 'Plot Crop', badge: '🌱 Crop', badgeClass: 'bg-lime-100 text-lime-800 dark:bg-lime-950/70 dark:text-lime-300' };
  }
  if (RESOURCES_SET.has(cleanKey)) {
    return { category: 'Resource', badge: '🪵 Resource', badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300' };
  }
  return { category: 'Emblem/Forage', badge: '🛡️ Emblem/Other', badgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300' };
}

export function getInventoryRows(usdRate) {
  let totalGrossInventory = 0;
  let totalTaxDeducted = 0;
  let totalPledgedInventory = 0;
  let selectedCount = 0;
  let totalOwnedStockCount = 0;

  const rows = ALLOWED_DIFFERENCE_ITEMS.map(itemName => {
    const cleanKey = normalizeItemKey(itemName);
    const qty = getItemInventoryQuantity(cleanKey);
    const unitPrice = getItemFlowerPrice(cleanKey);
    const grossFlowerValue = qty * unitPrice;
    const taxRate = getItemTaxRate(itemName);
    const taxDeduction = grossFlowerValue * taxRate;
    const flowerValue = grossFlowerValue - taxDeduction;
    const isIncluded = includedItemKeys.has(cleanKey);

    if (qty > 0) totalOwnedStockCount++;
    if (isIncluded) {
      totalGrossInventory += grossFlowerValue;
      totalTaxDeducted += taxDeduction;
      totalPledgedInventory += flowerValue;
      selectedCount++;
    }

    return {
      name: itemName,
      cleanKey,
      qty,
      unitPrice,
      taxRate,
      taxDeduction,
      grossFlowerValue,
      flowerValue,
      usdValue: flowerValue * usdRate,
      isIncluded
    };
  });

  return {
    rows,
    totalGrossInventory,
    totalTaxDeducted,
    totalPledgedInventory,
    selectedCount,
    totalOwnedStockCount
  };
}

function formatLastUpdated(isoString) {
  if (!isoString) return 'Not synced yet';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Not synced yet';
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return 'Not synced yet';
  }
}

// Refresh live farm inventory directly from API
export async function refreshGoalTrackerInventory() {
  const syncBtn = document.getElementById('goal-refresh-inventory-btn');
  const syncIcon = document.getElementById('goal-refresh-icon');
  const syncText = document.getElementById('goal-refresh-text');

  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim() || '';
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';

  if (!farmId) {
    alert("⚠️ Please enter and save your Farm ID in the top bar to fetch farm inventory.");
    return;
  }

  if (syncBtn) syncBtn.disabled = true;
  if (syncIcon) syncIcon.classList.add('animate-spin');
  if (syncText) syncText.textContent = 'Syncing...';

  try {
    const farmObj = await ApiService.getFarmFullData(farmId, apiKey, { force: true });
    if (farmObj) {
      window.farmData = farmObj;
      const liveInv = farmObj.inventory || {};
      window.farmInventoryData = liveInv;
      const liveBalance = parseFloat(farmObj.balance) || 0;
      window.farmBalance = liveBalance;

      try {
        localStorage.setItem('sfl_farm_inventory', JSON.stringify(liveInv));
        localStorage.setItem('sfl_farm_balance', String(liveBalance));
        localStorage.setItem('sfl_farm_inventory_updated_at', new Date().toISOString());
      } catch (_) {}

      try {
        window.dispatchEvent(new CustomEvent('farmDataSynced', {
          detail: { inventory: liveInv, balance: liveBalance }
        }));
      } catch (_) {}
    }
  } catch (err) {
    console.warn("⚠️ Failed to refresh farm inventory for Goal Tracker:", err.message);
    alert(`⚠️ Failed to sync farm data: ${err.message}`);
  } finally {
    if (syncBtn) syncBtn.disabled = false;
    if (syncIcon) syncIcon.classList.remove('animate-spin');
    if (syncText) syncText.textContent = 'Refresh Inventory';
    renderGoalTracker(cachedWishlistItems);
  }
}

// Render Global Goal Reached Banner (Mounts at top of the app)
export function renderGlobalGoalBanner() {
  const mountEl = document.getElementById('global-goal-banner-mount');
  if (!mountEl) return;

  let state = null;
  try {
    const raw = localStorage.getItem('sfl_wishlist_goal_reached_state');
    if (raw) state = JSON.parse(raw);
  } catch (_) {}

  // Fallback: If state is missing or unverified, evaluate from cached targets, balance, and inventory
  if ((!state || typeof state.reached !== 'boolean') && typeof localStorage !== 'undefined') {
    let targets = [];
    try {
      targets = JSON.parse(localStorage.getItem('sfl_wishlist_goal_targets') || '[]');
    } catch (_) {}
    if (targets.length === 0) {
      const single = localStorage.getItem('sfl_wishlist_goal_target');
      if (single) targets = [single];
    }

    if (targets.length > 0) {
      let wishlist = [];
      try { wishlist = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]'); } catch (_) {}
      const targetItems = wishlist.filter(i => targets.includes(i.name));
      if (targetItems.length > 0) {
        const pMode = localStorage.getItem('sfl_wishlist_goal_price_type') || 'floor';
        let cost = 0;
        targetItems.forEach(i => {
          cost += pMode === 'offer' ? (parseFloat(i.offerPrice) || parseFloat(i.price) || 0) : (parseFloat(i.price) || 0);
        });

        const incBal = localStorage.getItem('sfl_wishlist_goal_include_balance') !== 'false';
        const bal = incBal ? (parseFloat(localStorage.getItem('sfl_farm_balance')) || 0) : 0;
        
        let invVal = 0;
        let incKeys = null;
        try {
          const rawKeys = localStorage.getItem('sfl_wishlist_goal_items');
          if (rawKeys) incKeys = new Set(JSON.parse(rawKeys));
        } catch (_) {}

        ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
          const clean = normalizeItemKey(name);
          if (!incKeys || incKeys.has(clean)) {
            const qty = getItemInventoryQuantity(clean);
            const price = getItemFlowerPrice(clean);
            const gross = qty * price;
            const tax = gross * getItemTaxRate(name);
            invVal += (gross - tax);
          }
        });

        const total = bal + invVal;
        if (cost > 0 && total >= cost) {
          state = {
            reached: true,
            targetNames: targetItems.map(i => i.name),
            targetCount: targetItems.length,
            targetCost: cost,
            totalAssets: total,
            surplus: total - cost,
            usdRate: 0.13458
          };
          try { localStorage.setItem('sfl_wishlist_goal_reached_state', JSON.stringify(state)); } catch (_) {}
        }
      }
    }
  }

  if (!state || !state.reached || !state.targetNames || state.targetNames.length === 0) {
    mountEl.innerHTML = '<div class="hidden sm:block w-28"></div>';
    return;
  }

  let currentUsdRate = 0.13458;
  try {
    const res = getFlowerUsdRate();
    if (res && res.rate > 0) currentUsdRate = res.rate;
  } catch (_) {}
  const effectiveUsdRate = state.usdRate || currentUsdRate;
  const surplusUsd = (state.surplus || 0) * effectiveUsdRate;

  // Format list of target items
  const names = state.targetNames;
  const targetLabel = names.length === 1 
    ? `⭐ <strong>${names[0]}</strong>` 
    : `⭐ <strong>${names.length} Goals</strong> (${names.slice(0, 2).join(', ')}${names.length > 2 ? '...' : ''})`;

  mountEl.innerHTML = `
    <div class="relative group bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 dark:from-slate-900 dark:via-emerald-950/60 dark:to-slate-900 border-2 border-amber-400/80 dark:border-emerald-500/70 rounded-2xl p-2 sm:px-3 sm:py-2 text-white shadow-lg dark:shadow-[0_0_22px_rgba(16,185,129,0.3)] ring-1 ring-amber-300/30 dark:ring-emerald-400/30 flex items-center gap-2.5 max-w-full sm:max-w-xs md:max-w-sm backdrop-blur-md transition-all duration-200 animate-fadeIn">
      <div class="w-8 h-8 rounded-xl bg-amber-400/90 dark:bg-emerald-900/60 text-amber-950 dark:text-emerald-300 border border-amber-300 dark:border-emerald-500/50 flex items-center justify-center text-base shrink-0 shadow-sm">
        🎉
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <span class="text-[9px] font-black uppercase tracking-wider bg-amber-300 text-stone-950 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border dark:border-emerald-500/50 px-1.5 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
            Goal Reached!
          </span>
          <span class="text-xs font-bold text-amber-100 dark:text-amber-300 truncate drop-shadow-xs" title="${names.join(', ')}">
            ${targetLabel}
          </span>
        </div>
        <div class="text-[10px] text-emerald-100 dark:text-slate-300 font-mono font-medium truncate mt-0.5 flex items-center gap-1">
          <span>Target: <strong class="text-white dark:text-amber-200">${(state.targetCost || 0).toFixed(1)} 🌸</strong></span>
          <span class="opacity-40">•</span>
          <span>Pledged: <strong class="text-white dark:text-emerald-400 font-bold">${(state.totalAssets || 0).toFixed(1)} 🌸</strong></span>
          <span class="text-amber-200 dark:text-emerald-300 font-bold">(+${(state.surplus || 0).toFixed(1)})</span>
        </div>
      </div>
      <button id="global-goal-view-btn" type="button" class="bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 dark:border-emerald-300 font-black px-2.5 py-1.5 rounded-xl border border-amber-500 shadow-sm transition cursor-pointer text-xs whitespace-nowrap shrink-0 flex items-center gap-1" title="View Wishlist Goals">
        <span>🎯</span>
        <span>View</span>
      </button>
    </div>
  `;

  document.getElementById('global-goal-view-btn')?.addEventListener('click', () => {
    if (typeof PanelManager !== 'undefined' && PanelManager.switch) {
      PanelManager.switch('wishlist');
    } else if (typeof window.PanelManager !== 'undefined' && window.PanelManager.switch) {
      window.PanelManager.switch('wishlist');
    }
    const targetMount = document.getElementById('wishlist-goal-tracker-mount');
    if (targetMount) {
      targetMount.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// Render the Entire Goal Tracker Widget
export function renderGoalTracker(wishlistItems = []) {
  cachedWishlistItems = wishlistItems;
  const container = document.getElementById('wishlist-goal-tracker-mount');
  if (!container) return;

  // Resolve Active Target Goal Items (multiple targets supported)
  const targetItems = wishlistItems.filter(item => activeTargetNames.has(item.name));

  // If no targets explicitly set and wishlist has items, default to the first one
  if (targetItems.length === 0 && wishlistItems.length > 0 && activeTargetNames.size === 0) {
    activeTargetNames.add(wishlistItems[0].name);
    targetItems.push(wishlistItems[0]);
    saveGoalTargets();
  }

  // Calculate Target Cost across all selected goals
  let targetCost = 0;
  targetItems.forEach(item => {
    const floorPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const offerPrice = typeof item.offerPrice === 'number' ? item.offerPrice : parseFloat(item.offerPrice) || floorPrice;
    targetCost += (priceMode === 'offer' ? offerPrice : floorPrice);
  });

  const { rate: usdRate } = getFlowerUsdRate();
  const farmBalance = getOnFarmBalance();
  const effectiveBalance = includeBalance ? farmBalance : 0;

  // Calculate Inventory Valuation across the 64 whitelist items (applying market tax rate)
  const {
    rows: inventoryRows,
    totalGrossInventory,
    totalTaxDeducted,
    totalPledgedInventory,
    selectedCount,
    totalOwnedStockCount
  } = getInventoryRows(usdRate);

  const totalAvailableAssets = effectiveBalance + totalPledgedInventory;
  const progressPercent = targetCost > 0 ? Math.min(100, (totalAvailableAssets / targetCost) * 100) : 0;
  const actualRatioPercent = targetCost > 0 ? (totalAvailableAssets / targetCost) * 100 : 0;
  const remainingFlowers = Math.max(0, targetCost - totalAvailableAssets);
  const surplusFlowers = Math.max(0, totalAvailableAssets - targetCost);
  const isGoalReached = targetCost > 0 && targetItems.length > 0 && totalAvailableAssets >= targetCost;

  // Persist goal reached state to localStorage so it never resets when refreshed or tab is closed
  try {
    const reachedState = {
      reached: isGoalReached,
      targetNames: targetItems.map(i => i.name),
      targetCount: targetItems.length,
      targetCost,
      totalAssets: totalAvailableAssets,
      surplus: surplusFlowers,
      usdRate,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('sfl_wishlist_goal_reached_state', JSON.stringify(reachedState));
  } catch (_) {}

  // Update global banner across the app
  renderGlobalGoalBanner();

  const lastUpdated = localStorage.getItem('sfl_farm_inventory_updated_at');
  const formattedUpdated = formatLastUpdated(lastUpdated);

  // Render Card Template
  container.innerHTML = `
    <div class="bg-gradient-to-br from-amber-50 to-amber-100/70 dark:from-slate-800/90 dark:to-slate-900 border-2 border-amber-600/40 dark:border-amber-700/60 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-4">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-amber-600/20 dark:border-slate-700/60">
        <div>
          <h3 class="text-sm sm:text-base font-black text-sfl-wood dark:text-amber-100 uppercase tracking-wide flex items-center gap-2">
            <span>🎯</span> Wishlist Goal Tracker & Inventory Liquidation
          </h3>
          <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold mt-0.5">
            Pledge your on-farm SFL balance and inventory to calculate funding toward your dream NFT bundle in real time.
          </p>
        </div>

        <div class="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <button id="goal-refresh-inventory-btn" class="bg-sfl-wood hover:bg-sfl-dirt active:translate-y-0.5 text-amber-100 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-sfl-dirt shadow-xs hover:shadow transition cursor-pointer flex items-center gap-1.5 shrink-0" title="Fetch live inventory and SFL balance via official Farm API">
            <svg id="goal-refresh-icon" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span id="goal-refresh-text">Refresh Inventory</span>
          </button>

          <span class="text-[10px] font-mono text-sfl-woodLight dark:text-slate-400 bg-amber-200/50 dark:bg-slate-700/60 px-2 py-1 rounded-lg border border-amber-300/60 dark:border-slate-600/60" title="Last cached timestamp of farm inventory">
            🕒 ${formattedUpdated}
          </span>

          <button id="goal-tracker-collapse-btn" class="text-sfl-wood dark:text-amber-200 hover:text-amber-900 p-1 font-bold text-xs bg-amber-200/40 dark:bg-slate-700/50 hover:bg-amber-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer" title="Toggle Goal Tracker details">
            ${isTrackerCollapsed ? '▼ Expand' : '▲ Minimize'}
          </button>
        </div>
      </div>

      <!-- MAIN BODY (COLLAPSIBLE) -->
      <div id="goal-tracker-body" class="${isTrackerCollapsed ? 'hidden' : 'space-y-4'}">
        
        <!-- TARGET GOALS (MULTIPLE ITEMS SUPPORTED) & PRICE MODE SELECTOR BAR -->
        <div class="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-amber-300/80 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
          
          <!-- Target Goals Pills & Quick Add -->
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <label class="text-xs font-black text-sfl-wood dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯 Active Goals (${targetItems.length}):</span>
              </label>

              <div class="flex items-center gap-1.5 text-xs">
                <button id="goal-select-all-btn" class="text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer">
                  Select All (${wishlistItems.length})
                </button>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <button id="goal-clear-all-btn" class="text-[10px] font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer">
                  Clear Goals
                </button>
              </div>
            </div>

            <!-- Active Goals Pills -->
            <div class="flex flex-wrap items-center gap-1.5">
              ${targetItems.length === 0 ? `
                <span class="text-xs text-sfl-woodLight dark:text-slate-400 italic">
                  No active goals selected. Pick items from dropdown or click "Add to Goal" in the wishlist table below!
                </span>
              ` : targetItems.map(item => {
                const floorVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                const offerVal = typeof item.offerPrice === 'number' ? item.offerPrice : parseFloat(item.offerPrice) || floorVal;
                const cost = priceMode === 'offer' ? offerVal : floorVal;
                return `
                  <span class="inline-flex items-center gap-1.5 bg-amber-200/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-400/80 dark:border-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs">
                    <span>⭐ ${item.name}</span>
                    <span class="text-[10px] font-mono text-amber-900 dark:text-amber-300 font-extrabold">(${cost.toFixed(2)} 🌸)</span>
                    <button type="button" data-remove-target="${item.name}" class="goal-remove-pill-btn text-amber-800 hover:text-red-700 font-black ml-0.5 cursor-pointer text-sm leading-none" title="Remove from goals">✕</button>
                  </span>
                `;
              }).join('')}

              <!-- Quick Add Dropdown for Remaining Wishlist Items -->
              ${wishlistItems.filter(i => !activeTargetNames.has(i.name)).length > 0 ? `
                <select id="goal-add-target-select" class="sfl-input rounded-lg px-2 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-100 bg-amber-50/80 dark:bg-slate-900 border border-amber-300/80 dark:border-slate-600 focus:outline-none cursor-pointer">
                  <option value="">➕ Add More Items to Goal...</option>
                  ${wishlistItems.filter(i => !activeTargetNames.has(i.name)).map(item => {
                    const floorVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                    return `<option value="${item.name}">+ ${item.name} (${floorVal.toFixed(2)} 🌸)</option>`;
                  }).join('')}
                </select>
              ` : ''}
            </div>
          </div>

          <!-- Price Mode Radio / Toggle -->
          <div class="flex items-center gap-2 bg-amber-100/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-300/60 dark:border-slate-700 text-xs font-bold shrink-0 self-end md:self-center">
            <span class="text-[10px] uppercase text-sfl-woodLight dark:text-slate-400 pl-1">Basis:</span>
            <button id="goal-mode-floor-btn" class="px-2.5 py-1 rounded-md text-xs font-extrabold transition cursor-pointer ${priceMode === 'floor' ? 'bg-sfl-wood text-amber-100 shadow-xs' : 'text-sfl-wood dark:text-slate-300 hover:bg-amber-200/50 dark:hover:bg-slate-800'}">
              Floor Price
            </button>
            <button id="goal-mode-offer-btn" class="px-2.5 py-1 rounded-md text-xs font-extrabold transition cursor-pointer ${priceMode === 'offer' ? 'bg-sfl-wood text-amber-100 shadow-xs' : 'text-sfl-wood dark:text-slate-300 hover:bg-amber-200/50 dark:hover:bg-slate-800'}">
              Custom Offer
            </button>
          </div>
        </div>

        <!-- 4-METRIC SUMMARY CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          
          <!-- Card 1: Target Cost -->
          <div class="bg-amber-100/80 dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-700/60 rounded-xl p-3 shadow-xs">
            <div class="text-[10px] font-black uppercase tracking-wider text-sfl-woodLight dark:text-amber-300 flex items-center justify-between">
              <span>🎯 Target Cost</span>
              <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-slate-700 text-amber-900 dark:text-amber-200 font-bold">${priceMode}</span>
            </div>
            <div class="text-base sm:text-xl font-mono font-black text-sfl-wood dark:text-amber-100 mt-1 flex items-center gap-1">
              <span>${targetCost.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
            <div class="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              ≈ ${formatUsdAmount(targetCost * usdRate)} USD
            </div>
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5" title="${targetItems.map(i => i.name).join(', ')}">
              ${targetItems.length === 0 ? 'No goals selected' : `${targetItems.length} Goal Item${targetItems.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <!-- Card 2: On-Farm SFL Balance -->
          <div class="bg-amber-100/80 dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-700/60 rounded-xl p-3 shadow-xs relative">
            <div class="text-[10px] font-black uppercase tracking-wider text-sfl-woodLight dark:text-amber-300 flex items-center justify-between">
              <span>🪙 SFL Balance</span>
              <label class="inline-flex items-center gap-1 cursor-pointer" title="Include farm balance in pledged goal assets">
                <input type="checkbox" id="goal-include-balance-chk" ${includeBalance ? 'checked' : ''} class="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer">
                <span class="text-[9px] font-bold text-amber-900 dark:text-amber-200">Include</span>
              </label>
            </div>
            <div class="text-base sm:text-xl font-mono font-black ${includeBalance ? 'text-sfl-green dark:text-emerald-400' : 'text-sfl-woodLight dark:text-slate-500 line-through'} mt-1 flex items-center gap-1">
              <span>${farmBalance.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
            <div class="text-[11px] font-mono font-bold ${includeBalance ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 line-through'} mt-0.5">
              ≈ ${formatUsdAmount(farmBalance * usdRate)} USD
            </div>
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5">
              ${includeBalance ? '✅ Pledged to goal' : '❌ Excluded from assets'}
            </div>
          </div>

          <!-- Card 3: Pledged Inventory (Net after Tax) -->
          <div class="bg-amber-100/80 dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-700/60 rounded-xl p-3 shadow-xs">
            <div class="text-[10px] font-black uppercase tracking-wider text-sfl-woodLight dark:text-amber-300 flex items-center justify-between">
              <span>📦 Pledged Inventory (Net)</span>
              <span class="text-[9px] font-bold text-amber-900 dark:text-amber-200">${selectedCount}/64 items</span>
            </div>
            <div class="text-base sm:text-xl font-mono font-black text-sfl-green dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>${totalPledgedInventory.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
            <div class="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              ≈ ${formatUsdAmount(totalPledgedInventory * usdRate)} USD
            </div>
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5" title="Net proceeds after market tax. Gross value: ${totalGrossInventory.toFixed(2)} 🌸 (Tax: -${totalTaxDeducted.toFixed(2)} 🌸)">
              Net after Tax (Gross: ${totalGrossInventory.toFixed(2)} 🌸)
            </div>
          </div>

          <!-- Card 4: Total Available Assets -->
          <div class="bg-gradient-to-br ${isGoalReached ? 'from-emerald-100/90 to-green-100/90 dark:from-emerald-950/70 dark:to-green-950/70 border-emerald-500 dark:border-emerald-600' : 'from-amber-100/90 to-yellow-100/90 dark:from-slate-800 dark:to-slate-800 border-sfl-gold dark:border-amber-600'} border-2 rounded-xl p-3 shadow-xs">
            <div class="text-[10px] font-black uppercase tracking-wider ${isGoalReached ? 'text-emerald-800 dark:text-emerald-300' : 'text-sfl-woodLight dark:text-amber-300'} flex items-center justify-between">
              <span>💰 Total Assets</span>
              <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isGoalReached ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200' : 'bg-amber-200 dark:bg-slate-700 text-amber-900 dark:text-amber-200'}">
                ${actualRatioPercent.toFixed(1)}%
              </span>
            </div>
            <div class="text-base sm:text-xl font-mono font-black ${isGoalReached ? 'text-emerald-700 dark:text-emerald-400' : 'text-sfl-green dark:text-emerald-400'} mt-1 flex items-center gap-1">
              <span>${totalAvailableAssets.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
            <div class="text-[11px] font-mono font-bold ${isGoalReached ? 'text-emerald-800 dark:text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'} mt-0.5">
              ≈ ${formatUsdAmount(totalAvailableAssets * usdRate)} USD
            </div>
            <div class="text-[10px] ${isGoalReached ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-sfl-woodLight dark:text-slate-400'} truncate mt-0.5">
              ${isGoalReached ? '🎉 All Goals Achieved!' : `Remaining: ${remainingFlowers.toFixed(2)} 🌸`}
            </div>
          </div>

        </div>

        <!-- PROGRESS BAR SECTION -->
        <div class="bg-white/90 dark:bg-slate-800/90 p-3.5 sm:p-4 rounded-xl border border-amber-300/80 dark:border-slate-700 space-y-2.5 shadow-xs">
          <div class="flex justify-between items-center text-xs">
            <span class="font-extrabold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
              <span>📊</span> Funding Progress:
            </span>
            <div class="font-mono font-black text-sm ${isGoalReached ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'} flex items-center gap-1.5">
              <span>${actualRatioPercent.toFixed(1)}% Funded</span>
              <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400 font-mono">(${totalAvailableAssets.toFixed(2)} / ${targetCost.toFixed(2)} 🌸)</span>
            </div>
          </div>

          <!-- Progress Bar Track -->
          <div class="w-full h-5 sm:h-6 bg-amber-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-amber-300/80 dark:border-slate-600 shadow-inner relative">
            <div 
              class="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 text-[10px] font-black font-mono text-white ${isGoalReached ? 'bg-gradient-to-r from-emerald-600 to-green-500 shadow-sm' : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400'}"
              style="width: ${progressPercent}%; min-width: ${progressPercent > 0 ? '1.5rem' : '0'};"
            >
              ${progressPercent >= 15 ? `${actualRatioPercent.toFixed(0)}%` : ''}
            </div>
          </div>

          <!-- Progress Status Banner -->
          ${isGoalReached ? `
            <div class="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-slate-900 dark:via-emerald-950/60 dark:to-slate-900 border-2 border-emerald-400/80 dark:border-emerald-500/70 rounded-xl p-3 text-emerald-950 dark:text-emerald-200 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs dark:shadow-[0_0_18px_rgba(16,185,129,0.25)]">
              <div class="flex items-center gap-2">
                <span class="text-lg">🎉</span>
                <div>
                  <span class="font-extrabold text-emerald-950 dark:text-emerald-300">All Goals Reached!</span>
                  <span class="text-emerald-900 dark:text-slate-300 font-medium"> You have enough pledged assets to purchase ${targetItems.length === 1 ? `<strong class="text-emerald-950 dark:text-amber-300 font-bold">${targetItems[0].name}</strong>` : `all <strong class="text-emerald-950 dark:text-amber-300 font-bold">${targetItems.length} target items</strong>`}!</span>
                </div>
              </div>
              <div class="font-mono text-xs text-emerald-800 dark:text-emerald-300 whitespace-nowrap bg-emerald-200/60 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-400/60 dark:border-emerald-500/50 shadow-2xs">
                +${surplusFlowers.toFixed(2)} 🌸 Surplus (≈ ${formatUsdAmount(surplusFlowers * usdRate)})
              </div>
            </div>
          ` : `
            <div class="bg-amber-100/70 dark:bg-slate-900/60 border border-amber-300/80 dark:border-slate-700 rounded-xl p-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-sfl-wood dark:text-slate-300 font-semibold">
              <span class="flex items-center gap-1.5">
                <span>⏳</span>
                <span>Remaining Needed: <strong class="text-sfl-dirt dark:text-amber-200 font-mono font-bold">${remainingFlowers.toFixed(2)} 🌸</strong> (≈ ${formatUsdAmount(remainingFlowers * usdRate)} USD)</span>
              </span>
              <span class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-mono">
                ${(100 - progressPercent).toFixed(1)}% to goal completion
              </span>
            </div>
          `}
        </div>

        <!-- INVENTORY LIQUIDATION BREAKDOWN TABLE (ACCORDION) -->
        <div class="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-amber-300/80 dark:border-slate-700 overflow-hidden shadow-xs">
          
          <!-- Accordion Header -->
          <div class="bg-amber-100/80 dark:bg-slate-900 px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-300/80 dark:border-slate-700">
            <div class="flex items-center gap-2">
              <span class="text-sm">📦</span>
              <div>
                <span class="text-xs font-black uppercase tracking-wider text-sfl-wood dark:text-amber-100">
                  Inventory Liquidation Breakdown (64 Whitelist Items)
                </span>
                <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-bold ml-1.5">
                  (${totalOwnedStockCount} in stock)
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button id="goal-table-toggle-btn" class="bg-sfl-wood text-amber-100 hover:bg-sfl-dirt px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer">
                ${isTableCollapsed ? '▼ Show Liquidation Items' : '▲ Hide Table'}
              </button>
            </div>
          </div>

          <!-- Table Content Body -->
          <div id="goal-liquidation-table-wrapper" class="${isTableCollapsed ? 'hidden' : 'block'} p-3 space-y-3">
            
            <!-- Quick Presets Toolbar -->
            <div class="flex flex-wrap items-center justify-between gap-2 bg-amber-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200 dark:border-slate-700 text-xs">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] font-black uppercase text-sfl-woodLight dark:text-slate-400 mr-1">Presets:</span>
                <button id="preset-all-btn" class="bg-amber-200/80 hover:bg-amber-300/80 text-sfl-dirt dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-300 dark:border-slate-600 transition cursor-pointer">
                  All (64)
                </button>
                <button id="preset-crops-btn" class="bg-amber-200/80 hover:bg-amber-300/80 text-sfl-dirt dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-300 dark:border-slate-600 transition cursor-pointer">
                  🌱 Crops (35)
                </button>
                <button id="preset-resources-btn" class="bg-amber-200/80 hover:bg-amber-300/80 text-sfl-dirt dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-300 dark:border-slate-600 transition cursor-pointer">
                  🪵 Resources (14)
                </button>
                <button id="preset-emblems-btn" class="bg-amber-200/80 hover:bg-amber-300/80 text-sfl-dirt dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-300 dark:border-slate-600 transition cursor-pointer">
                  🛡️ Emblems/Other (15)
                </button>
                <button id="preset-instock-btn" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-300 dark:border-emerald-700 transition cursor-pointer">
                  ✅ In Stock Only
                </button>
                <button id="preset-clear-btn" class="bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded text-[11px] font-bold border border-rose-300 dark:border-rose-700 transition cursor-pointer">
                  ❌ Clear All
                </button>
              </div>

              <!-- Filter Checkbox, Sort Select & Search Input -->
              <div class="flex items-center gap-2 flex-wrap">
                <label class="inline-flex items-center gap-1.5 text-[11px] font-bold text-sfl-wood dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" id="goal-filter-instock-chk" ${showInStockOnly ? 'checked' : ''} class="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer">
                  <span>Show stock > 0 only</span>
                </label>

                <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-amber-300/60 dark:border-slate-700 text-xs">
                  <span class="text-[10px] font-black uppercase text-sfl-woodLight dark:text-slate-400 whitespace-nowrap">Sort:</span>
                  <select id="goal-sort-select" class="sfl-input rounded px-1.5 py-0.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-600 focus:outline-none cursor-pointer">
                    <option value="default_asc" ${sortField === 'default' ? 'selected' : ''}>Default (Category)</option>
                    <option value="value_desc" ${sortField === 'value' && sortOrder === 'desc' ? 'selected' : ''}>Pledged Value (High to Low)</option>
                    <option value="value_asc" ${sortField === 'value' && sortOrder === 'asc' ? 'selected' : ''}>Pledged Value (Low to High)</option>
                    <option value="qty_desc" ${sortField === 'qty' && sortOrder === 'desc' ? 'selected' : ''}>Owned Qty (High to Low)</option>
                    <option value="qty_asc" ${sortField === 'qty' && sortOrder === 'asc' ? 'selected' : ''}>Owned Qty (Low to High)</option>
                    <option value="price_desc" ${sortField === 'price' && sortOrder === 'desc' ? 'selected' : ''}>Unit Price (High to Low)</option>
                    <option value="price_asc" ${sortField === 'price' && sortOrder === 'asc' ? 'selected' : ''}>Unit Price (Low to High)</option>
                    <option value="name_asc" ${sortField === 'name' && sortOrder === 'asc' ? 'selected' : ''}>Item Name (A-Z)</option>
                    <option value="name_desc" ${sortField === 'name' && sortOrder === 'desc' ? 'selected' : ''}>Item Name (Z-A)</option>
                    <option value="pledged_desc" ${sortField === 'pledged' && sortOrder === 'desc' ? 'selected' : ''}>Pledge Status (Pledged First)</option>
                  </select>
                </div>

                <div class="relative">
                  <input type="text" id="goal-item-search-input" value="${searchQuery}" placeholder="Search items..." class="w-32 sm:w-36 sfl-input rounded-lg px-2 py-1 text-xs text-sfl-dirt dark:text-amber-100 bg-white dark:bg-slate-800 border border-amber-300/80 dark:border-slate-600">
                </div>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto max-h-96 border border-amber-200 dark:border-slate-700 rounded-xl">
              <table class="w-full text-left text-xs text-sfl-dirt dark:text-slate-200">
                <thead class="bg-amber-100/90 dark:bg-slate-900 border-b border-amber-200 dark:border-slate-700 text-sfl-wood dark:text-amber-200 uppercase text-[10px] sticky top-0 z-10 select-none">
                  <tr>
                    <th class="px-3 py-2 text-center w-14 cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="pledged" title="Click to sort by pledge status">
                      <div class="flex items-center justify-center gap-1">
                        <span>Pledge</span>
                        <span class="text-[9px] ${sortField === 'pledged' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('pledged')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="name" title="Click to sort by item name">
                      <div class="flex items-center gap-1">
                        <span>Item Name</span>
                        <span class="text-[9px] ${sortField === 'name' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('name')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="qty" title="Click to sort by owned quantity">
                      <div class="flex items-center justify-end gap-1">
                        <span>Owned Qty</span>
                        <span class="text-[9px] ${sortField === 'qty' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('qty')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="price" title="Click to sort by unit price">
                      <div class="flex items-center justify-end gap-1">
                        <span>Unit Price (🌸)</span>
                        <span class="text-[9px] ${sortField === 'price' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('price')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="value" title="Click to sort by net pledged flower value (after market tax)">
                      <div class="flex items-center justify-end gap-1">
                        <span>Pledged Net (🌸)</span>
                        <span class="text-[9px] ${sortField === 'value' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('value')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="usd" title="Click to sort by net value in USD">
                      <div class="flex items-center justify-end gap-1">
                        <span>Value ($ USD)</span>
                        <span class="text-[9px] ${sortField === 'usd' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('usd')}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody id="goal-inventory-tbody" class="divide-y divide-amber-100 dark:divide-slate-700/60 font-medium">
                  <!-- Dynamically rendered rows -->
                </tbody>
                <tfoot class="bg-amber-100/90 dark:bg-slate-900 border-t-2 border-amber-300 dark:border-slate-700 font-bold text-xs sticky bottom-0 z-10">
                  <tr>
                    <td class="px-3 py-2 text-center">
                      <span class="text-[10px] text-amber-800 dark:text-amber-300">${selectedCount} sel</span>
                    </td>
                    <td class="px-3 py-2 text-sfl-wood dark:text-amber-200" colspan="3">
                      Total Pledged Inventory (Net after Tax):
                      <span class="text-[10px] font-normal text-sfl-woodLight dark:text-slate-400 block sm:inline sm:ml-1">(Gross: ${totalGrossInventory.toFixed(2)} 🌸 • Tax: -${totalTaxDeducted.toFixed(2)} 🌸)</span>
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-sfl-green dark:text-emerald-400">
                      ${totalPledgedInventory.toFixed(2)} 🌸
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      ${formatUsdAmount(totalPledgedInventory * usdRate)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  `;

  // Render Rows and Bind Event Listeners
  renderInventoryTableRows(inventoryRows, usdRate);
  bindGoalTrackerEvents(wishlistItems);
}

// Render dynamic rows inside table
function renderInventoryTableRows(rows, usdRate) {
  const tbody = document.getElementById('goal-inventory-tbody');
  if (!tbody) return;

  const query = searchQuery.toLowerCase().trim();
  const filtered = rows.filter(row => {
    if (showInStockOnly && row.qty <= 0) return false;
    if (query && !row.name.toLowerCase().includes(query)) return false;
    return true;
  });

  const sorted = sortInventoryRows(filtered);

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-sfl-woodLight dark:text-slate-400 italic">
          No inventory items matched the current filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  sorted.forEach(item => {
    const info = getItemCategoryInfo(item.cleanKey);
    const tr = document.createElement('tr');
    tr.className = `hover:bg-amber-50/60 dark:hover:bg-slate-700/40 transition align-middle ${item.isIncluded && item.qty > 0 ? 'bg-amber-50/30 dark:bg-slate-800/40' : ''}`;
    
    tr.innerHTML = `
      <td class="px-3 py-2 text-center">
        <input type="checkbox" data-key="${item.cleanKey}" class="goal-item-chk w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer" ${item.isIncluded ? 'checked' : ''}>
      </td>
      <td class="px-3 py-2">
        <div class="font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
          <span>${item.name}</span>
          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${info.badgeClass}">${info.badge}</span>
        </div>
      </td>
      <td class="px-3 py-2 text-right font-mono ${item.qty > 0 ? 'font-bold text-sfl-dirt dark:text-amber-200' : 'text-slate-400 dark:text-slate-500'}">
        ${item.qty > 0 ? item.qty.toLocaleString() : '0'}
      </td>
      <td class="px-3 py-2 text-right font-mono text-sfl-woodLight dark:text-slate-400">
        ${item.unitPrice.toFixed(4)} 🌸
      </td>
      <td class="px-3 py-2 text-right font-mono ${item.isIncluded && item.flowerValue > 0 ? 'font-bold text-sfl-green dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
        <div>${item.flowerValue.toFixed(3)} 🌸</div>
        ${item.taxDeduction > 0 && item.qty > 0 ? `<div class="text-[9px] text-sfl-woodLight dark:text-slate-400 font-normal">(-${(item.taxRate * 100).toFixed(0)}% tax)</div>` : ''}
      </td>
      <td class="px-3 py-2 text-right font-mono ${item.isIncluded && item.usdValue > 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
        ${formatUsdAmount(item.usdValue)}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind checkbox change events
  tbody.querySelectorAll('.goal-item-chk').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const key = e.target.getAttribute('data-key');
      if (e.target.checked) {
        includedItemKeys.add(key);
      } else {
        includedItemKeys.delete(key);
      }
      saveIncludedKeys();
      renderGoalTracker(cachedWishlistItems);
    });
  });
}

// Bind Global UI Events for the Goal Tracker
function bindGoalTrackerEvents(wishlistItems) {
  // Refresh Inventory Button
  document.getElementById('goal-refresh-inventory-btn')?.addEventListener('click', () => {
    refreshGoalTrackerInventory();
  });

  // Quick Add Target Dropdown
  document.getElementById('goal-add-target-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      addGoalItem(val);
      if (typeof window.renderWishlist === 'function') {
        window.renderWishlist();
      }
    }
  });

  // Remove Individual Goal Pill Buttons
  document.querySelectorAll('.goal-remove-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.getAttribute('data-remove-target');
      if (target) {
        removeGoalItem(target);
        if (typeof window.renderWishlist === 'function') {
          window.renderWishlist();
        }
      }
    });
  });

  // Select All Wishlist Items as Goals
  document.getElementById('goal-select-all-btn')?.addEventListener('click', () => {
    setAllWishlistAsGoals(wishlistItems);
    if (typeof window.renderWishlist === 'function') {
      window.renderWishlist();
    }
  });

  // Clear All Goals
  document.getElementById('goal-clear-all-btn')?.addEventListener('click', () => {
    clearGoalItems();
    if (typeof window.renderWishlist === 'function') {
      window.renderWishlist();
    }
  });

  // Price Mode Buttons
  document.getElementById('goal-mode-floor-btn')?.addEventListener('click', () => {
    if (priceMode !== 'floor') {
      priceMode = 'floor';
      try { localStorage.setItem('sfl_wishlist_goal_price_type', 'floor'); } catch (_) {}
      renderGoalTracker(wishlistItems);
    }
  });
  document.getElementById('goal-mode-offer-btn')?.addEventListener('click', () => {
    if (priceMode !== 'offer') {
      priceMode = 'offer';
      try { localStorage.setItem('sfl_wishlist_goal_price_type', 'offer'); } catch (_) {}
      renderGoalTracker(wishlistItems);
    }
  });

  // Include Balance Checkbox
  document.getElementById('goal-include-balance-chk')?.addEventListener('change', (e) => {
    includeBalance = e.target.checked;
    try { localStorage.setItem('sfl_wishlist_goal_include_balance', String(includeBalance)); } catch (_) {}
    renderGoalTracker(wishlistItems);
  });

  // Collapse Entire Tracker Button
  document.getElementById('goal-tracker-collapse-btn')?.addEventListener('click', () => {
    isTrackerCollapsed = !isTrackerCollapsed;
    try { localStorage.setItem('sfl_wishlist_goal_collapsed', String(isTrackerCollapsed)); } catch (_) {}
    renderGoalTracker(wishlistItems);
  });

  // Collapse Table Button
  document.getElementById('goal-table-toggle-btn')?.addEventListener('click', () => {
    isTableCollapsed = !isTableCollapsed;
    try { localStorage.setItem('sfl_wishlist_goal_table_collapsed', String(isTableCollapsed)); } catch (_) {}
    renderGoalTracker(wishlistItems);
  });

  // Preset Buttons
  document.getElementById('preset-all-btn')?.addEventListener('click', () => {
    resetIncludedToAll();
    renderGoalTracker(wishlistItems);
  });

  document.getElementById('preset-crops-btn')?.addEventListener('click', () => {
    includedItemKeys = new Set(Array.from(CROPS_SET));
    saveIncludedKeys();
    renderGoalTracker(wishlistItems);
  });

  document.getElementById('preset-resources-btn')?.addEventListener('click', () => {
    includedItemKeys = new Set(Array.from(RESOURCES_SET));
    saveIncludedKeys();
    renderGoalTracker(wishlistItems);
  });

  document.getElementById('preset-emblems-btn')?.addEventListener('click', () => {
    includedItemKeys = new Set(Array.from(EMBLEMS_SET));
    saveIncludedKeys();
    renderGoalTracker(wishlistItems);
  });

  document.getElementById('preset-instock-btn')?.addEventListener('click', () => {
    includedItemKeys = new Set();
    ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
      const cleanKey = normalizeItemKey(name);
      if (getItemInventoryQuantity(cleanKey) > 0) {
        includedItemKeys.add(cleanKey);
      }
    });
    saveIncludedKeys();
    renderGoalTracker(wishlistItems);
  });

  document.getElementById('preset-clear-btn')?.addEventListener('click', () => {
    includedItemKeys = new Set();
    saveIncludedKeys();
    renderGoalTracker(wishlistItems);
  });

  // Sort Dropdown Change
  document.getElementById('goal-sort-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const [field, dir] = val.split('_');
    sortField = field;
    sortOrder = dir || 'desc';
    try {
      localStorage.setItem('sfl_wishlist_goal_sort_field', sortField);
      localStorage.setItem('sfl_wishlist_goal_sort_order', sortOrder);
    } catch (_) {}
    renderGoalTracker(wishlistItems);
  });

  // Table Header Sort Clicks
  document.querySelectorAll('th[data-sort-field]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort-field');
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = (field === 'name' ? 'asc' : 'desc');
      }
      try {
        localStorage.setItem('sfl_wishlist_goal_sort_field', sortField);
        localStorage.setItem('sfl_wishlist_goal_sort_order', sortOrder);
      } catch (_) {}
      renderGoalTracker(wishlistItems);
    });
  });

  // In-Stock Only Filter Checkbox
  document.getElementById('goal-filter-instock-chk')?.addEventListener('change', (e) => {
    showInStockOnly = e.target.checked;
    try { localStorage.setItem('sfl_wishlist_goal_show_in_stock_only', String(showInStockOnly)); } catch (_) {}
    const { rate: usdRate } = getFlowerUsdRate();
    const { rows } = getInventoryRows(usdRate);
    renderInventoryTableRows(rows, usdRate);
  });

  // Search Input
  const searchInput = document.getElementById('goal-item-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const { rate: usdRate } = getFlowerUsdRate();
      const { rows } = getInventoryRows(usdRate);
      renderInventoryTableRows(rows, usdRate);
    });
  }

  // Tax Rate Select Listener
  document.getElementById('tax-select')?.addEventListener('change', () => {
    renderGoalTracker(wishlistItems);
  });
}

// Initialize Goal Tracker
export function initGoalTracker(wishlistItems = []) {
  initGoalTrackerState();
  renderGoalTracker(wishlistItems);
  renderGlobalGoalBanner();
}

// Global exposure for event callbacks
if (typeof window !== 'undefined') {
  window.initGoalTracker = initGoalTracker;
  window.renderGoalTracker = renderGoalTracker;
  window.getActiveGoalItems = getActiveGoalItems;
  window.getActiveGoalItem = getActiveGoalItem;
  window.setActiveGoalItem = setActiveGoalItem;
  window.toggleGoalItem = toggleGoalItem;
  window.addGoalItem = addGoalItem;
  window.removeGoalItem = removeGoalItem;
  window.clearGoalItems = clearGoalItems;
  window.setAllWishlistAsGoals = setAllWishlistAsGoals;
  window.refreshGoalTrackerInventory = refreshGoalTrackerInventory;
  window.renderGlobalGoalBanner = renderGlobalGoalBanner;
}
