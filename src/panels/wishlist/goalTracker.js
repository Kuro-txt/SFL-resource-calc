import { 
  ALLOWED_DIFFERENCE_ITEMS, 
  BETTY_SHOP_PRICES, 
  RESOURCE_FLOWER_FALLBACK_PRICES, 
  FLOWER_IMG_SMALL_HTML,
  SFL_PLOT_CROPS,
  SFL_GREENHOUSE_CROPS,
  SFL_FRUITS
} from '../../config/constants.js';
import { normalizeItemKey, roundUpToThreeDecimals } from '../../utils/formatters.js';
import { ApiService } from '../../services/api.js';
import { getFlowerUsdRate, formatUsdAmount } from '../wishlistPanel.js';

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
let activeTargetName = '';
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
    activeTargetName = localStorage.getItem('sfl_wishlist_goal_target') || '';
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

export function getActiveGoalItem() {
  return activeTargetName;
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
    return 0;
  });
}

export function setActiveGoalItem(itemName) {
  activeTargetName = itemName || '';
  try {
    localStorage.setItem('sfl_wishlist_goal_target', activeTargetName);
  } catch (_) {}
  renderGoalTracker(cachedWishlistItems);

  // Smooth scroll up to tracker
  const mountEl = document.getElementById('wishlist-goal-tracker-mount');
  if (mountEl) {
    mountEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Price and Inventory Helpers
export function getItemFlowerPrice(cleanKey) {
  if (typeof window !== 'undefined' && window.allPrices && typeof window.allPrices === 'object') {
    const matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      const rawPrice = parseFloat(window.allPrices[matchedKey]) || 0;
      if (rawPrice > 0) {
        return rawPrice > 100 ? rawPrice / 1000 : rawPrice;
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
  
  // Direct match or normalized key search
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

// Render the Entire Goal Tracker Widget
export function renderGoalTracker(wishlistItems = []) {
  cachedWishlistItems = wishlistItems;
  const container = document.getElementById('wishlist-goal-tracker-mount');
  if (!container) return;

  // Resolve Active Target Goal
  let targetItem = null;
  if (activeTargetName) {
    targetItem = wishlistItems.find(item => item.name.toLowerCase() === activeTargetName.toLowerCase());
  }
  if (!targetItem && wishlistItems.length > 0) {
    targetItem = wishlistItems[0];
    activeTargetName = targetItem.name;
    try { localStorage.setItem('sfl_wishlist_goal_target', activeTargetName); } catch (_) {}
  }

  // Calculate Target Cost
  let targetCost = 0;
  if (targetItem) {
    const floorPrice = typeof targetItem.price === 'number' ? targetItem.price : parseFloat(targetItem.price) || 0;
    const offerPrice = typeof targetItem.offerPrice === 'number' ? targetItem.offerPrice : parseFloat(targetItem.offerPrice) || floorPrice;
    targetCost = priceMode === 'offer' ? offerPrice : floorPrice;
  }

  const { rate: usdRate } = getFlowerUsdRate();
  const farmBalance = getOnFarmBalance();
  const effectiveBalance = includeBalance ? farmBalance : 0;

  // Calculate Inventory Valuation across the 64 whitelist items
  let totalPledgedInventory = 0;
  let selectedCount = 0;
  let totalOwnedStockCount = 0;

  const inventoryRows = ALLOWED_DIFFERENCE_ITEMS.map(itemName => {
    const cleanKey = normalizeItemKey(itemName);
    const qty = getItemInventoryQuantity(cleanKey);
    const unitPrice = getItemFlowerPrice(cleanKey);
    const flowerValue = qty * unitPrice;
    const isIncluded = includedItemKeys.has(cleanKey);

    if (qty > 0) totalOwnedStockCount++;
    if (isIncluded) {
      totalPledgedInventory += flowerValue;
      selectedCount++;
    }

    return {
      name: itemName,
      cleanKey,
      qty,
      unitPrice,
      flowerValue,
      usdValue: flowerValue * usdRate,
      isIncluded
    };
  });

  const totalAvailableAssets = effectiveBalance + totalPledgedInventory;
  const progressPercent = targetCost > 0 ? Math.min(100, (totalAvailableAssets / targetCost) * 100) : 0;
  const actualRatioPercent = targetCost > 0 ? (totalAvailableAssets / targetCost) * 100 : 0;
  const remainingFlowers = Math.max(0, targetCost - totalAvailableAssets);
  const surplusFlowers = Math.max(0, totalAvailableAssets - targetCost);
  const isGoalReached = targetCost > 0 && totalAvailableAssets >= targetCost;

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
            Pledge your on-farm SFL balance and inventory to calculate funding toward your dream NFT in real time.
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
        
        <!-- TARGET GOAL & PRICE MODE SELECTOR BAR -->
        <div class="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-300/80 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
          
          <!-- Dropdown -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
            <label class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>🎯 Target Goal:</span>
            </label>
            ${wishlistItems.length === 0 ? `
              <div class="text-xs text-sfl-woodLight dark:text-slate-400 italic">
                Add NFTs to your wishlist below to select a target goal!
              </div>
            ` : `
              <select id="goal-target-select" class="w-full sm:w-auto flex-1 sfl-input rounded-lg px-3 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 bg-amber-50/70 dark:bg-slate-900 border border-amber-300/80 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                ${wishlistItems.map(item => {
                  const floorVal = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                  const offerVal = typeof item.offerPrice === 'number' ? item.offerPrice : parseFloat(item.offerPrice) || floorVal;
                  const isSelected = targetItem && item.name.toLowerCase() === targetItem.name.toLowerCase();
                  return `<option value="${item.name}" ${isSelected ? 'selected' : ''}>
                    ⭐ ${item.name} — Floor: ${floorVal.toFixed(2)} 🌸 (Offer: ${offerVal.toFixed(2)} 🌸)
                  </option>`;
                }).join('')}
              </select>
            `}
          </div>

          <!-- Price Mode Radio / Toggle -->
          <div class="flex items-center gap-2 bg-amber-100/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-300/60 dark:border-slate-700 text-xs font-bold shrink-0 self-end sm:self-auto">
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
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5">
              ${targetItem ? targetItem.name : 'No item selected'}
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

          <!-- Card 3: Pledged Inventory -->
          <div class="bg-amber-100/80 dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-700/60 rounded-xl p-3 shadow-xs">
            <div class="text-[10px] font-black uppercase tracking-wider text-sfl-woodLight dark:text-amber-300 flex items-center justify-between">
              <span>📦 Pledged Inventory</span>
              <span class="text-[9px] font-bold text-amber-900 dark:text-amber-200">${selectedCount}/64 items</span>
            </div>
            <div class="text-base sm:text-xl font-mono font-black text-sfl-green dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>${totalPledgedInventory.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
            <div class="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              ≈ ${formatUsdAmount(totalPledgedInventory * usdRate)} USD
            </div>
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5">
              64 Whitelist Items Valuated
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
              ${isGoalReached ? '🎉 Goal Achieved!' : `Remaining: ${remainingFlowers.toFixed(2)} 🌸`}
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
            <div class="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-950/80 dark:to-green-950/80 border-2 border-emerald-400/80 dark:border-emerald-600/80 rounded-xl p-3 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
              <div class="flex items-center gap-2">
                <span class="text-lg">🎉</span>
                <div>
                  <span class="font-extrabold text-emerald-950 dark:text-emerald-100">Goal Achieved!</span>
                  <span> You have enough pledged assets to purchase <strong>${targetItem?.name || 'this item'}</strong>!</span>
                </div>
              </div>
              <div class="font-mono text-xs text-emerald-800 dark:text-emerald-300 whitespace-nowrap bg-emerald-200/60 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-400/60">
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
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="value" title="Click to sort by pledged flower value">
                      <div class="flex items-center justify-end gap-1">
                        <span>Pledged Value (🌸)</span>
                        <span class="text-[9px] ${sortField === 'value' ? 'font-black text-amber-800 dark:text-amber-300' : 'opacity-40'}">${getSortIndicator('value')}</span>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-right cursor-pointer hover:bg-amber-200/70 dark:hover:bg-slate-800 transition" data-sort-field="usd" title="Click to sort by value in USD">
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
                      Total Pledged Inventory Valuation:
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
        ${item.flowerValue.toFixed(3)} 🌸
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

  // Target Dropdown
  document.getElementById('goal-target-select')?.addEventListener('change', (e) => {
    activeTargetName = e.target.value;
    try { localStorage.setItem('sfl_wishlist_goal_target', activeTargetName); } catch (_) {}
    renderGoalTracker(wishlistItems);
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
    const rows = ALLOWED_DIFFERENCE_ITEMS.map(itemName => {
      const cleanKey = normalizeItemKey(itemName);
      const qty = getItemInventoryQuantity(cleanKey);
      const unitPrice = getItemFlowerPrice(cleanKey);
      const flowerValue = qty * unitPrice;
      return {
        name: itemName,
        cleanKey,
        qty,
        unitPrice,
        flowerValue,
        usdValue: flowerValue * usdRate,
        isIncluded: includedItemKeys.has(cleanKey)
      };
    });
    renderInventoryTableRows(rows, usdRate);
  });

  // Search Input
  const searchInput = document.getElementById('goal-item-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const { rate: usdRate } = getFlowerUsdRate();
      const rows = ALLOWED_DIFFERENCE_ITEMS.map(itemName => {
        const cleanKey = normalizeItemKey(itemName);
        const qty = getItemInventoryQuantity(cleanKey);
        const unitPrice = getItemFlowerPrice(cleanKey);
        const flowerValue = qty * unitPrice;
        return {
          name: itemName,
          cleanKey,
          qty,
          unitPrice,
          flowerValue,
          usdValue: flowerValue * usdRate,
          isIncluded: includedItemKeys.has(cleanKey)
        };
      });
      renderInventoryTableRows(rows, usdRate);
    });
  }
}

// Initialize Goal Tracker
export function initGoalTracker(wishlistItems = []) {
  initGoalTrackerState();
  renderGoalTracker(wishlistItems);
}

// Global exposure for event callbacks
if (typeof window !== 'undefined') {
  window.initGoalTracker = initGoalTracker;
  window.renderGoalTracker = renderGoalTracker;
  window.setActiveGoalItem = setActiveGoalItem;
  window.refreshGoalTrackerInventory = refreshGoalTrackerInventory;
}
