import { renderInventoryShell, renderSummaryCards, renderResourcesTable, renderBoostsTable } from './inventoryTemplate.js';
import { 
  computeResourcesInventory, 
  computeBoostsInventory, 
  filterAndSortRows, 
  getGlobalTaxRate 
} from './inventoryLogic.js';
import { ApiService } from '../../services/api.js';

let activeSubTab = 'resources'; // 'resources' | 'boosts'
let searchQuery = '';
let activeCategory = 'all';
let hideZero = true;
let sortBy = 'netValueDesc';

let cachedPrices = null;
let cachedNfts = null;
let cachedUsdRate = 0;
let isInitialized = false;
let searchDebounceTimer = null;

/**
 * Initializes global event hooks for Inventory Panel.
 */
export function initInventoryPanel() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Restore last active sub-tab from storage if available
  try {
    const savedSubTab = localStorage.getItem('sfl_inv_subtab');
    if (savedSubTab === 'resources' || savedSubTab === 'boosts') {
      activeSubTab = savedSubTab;
    }
  } catch (_) {}

  // 2. React dynamically when global tax rate is changed in authBar header
  const taxSelectEl = document.getElementById('tax-select');
  taxSelectEl?.addEventListener('change', () => {
    // If the inventory panel is currently visible, recalculate immediately
    const section = document.getElementById('inventory-section');
    if (section && !section.classList.contains('hidden')) {
      renderActiveView();
    }
  });

  // 3. React dynamically when global farm data finishes syncing
  window.addEventListener('farmDataSynced', (e) => {
    const section = document.getElementById('inventory-section');
    if (section && !section.classList.contains('hidden')) {
      renderActiveView();
    }
  });
}

/**
 * Mounts the inventory panel when user navigates to the tab.
 */
export async function mountInventoryPanel() {
  const container = document.getElementById('inventory-section');
  if (!container) return;

  // Inject main template shell if not already mounted
  if (!container.innerHTML.trim() || !document.getElementById('inv-table-mount')) {
    container.innerHTML = renderInventoryShell();
    bindShellEventListeners();
  }

  updateFarmBadgeAndSyncTime();
  updateSubTabPillStyles();

  // Load prices and NFTs in background if not already cached
  await loadMarketAndNftData();

  // Render the active sub-tab view (Resources or Boosts)
  renderActiveView();
}

/**
 * Unmount lifecycle hook (cleans up timers).
 */
export function unmountInventoryPanel() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
}

/**
 * Updates farm ID badge and last updated timestamp in panel header.
 */
function updateFarmBadgeAndSyncTime() {
  const badgeEl = document.getElementById('inventory-farm-badge');
  const syncTimeEl = document.getElementById('inventory-sync-time');

  const farmId = window.currentFarmId || (typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_farm_id') : '') || '';
  if (badgeEl) {
    if (farmId) {
      badgeEl.textContent = `Farm #${farmId}`;
      badgeEl.className = "px-2 py-0.5 rounded-full text-[11px] font-bold bg-lime-100 dark:bg-lime-950 text-lime-800 dark:text-lime-300 border border-lime-300 dark:border-lime-700";
    } else {
      badgeEl.textContent = "Farm: Not Synced";
      badgeEl.className = "px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/60 dark:bg-slate-700 text-sfl-wood dark:text-amber-200 border border-amber-300 dark:border-slate-600";
    }
  }

  if (syncTimeEl) {
    const lastSyncIso = typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_farm_inventory_updated_at') : null;
    if (lastSyncIso) {
      try {
        const d = new Date(lastSyncIso);
        syncTimeEl.textContent = `Synced: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (_) {
        syncTimeEl.textContent = 'Synced';
      }
    } else {
      syncTimeEl.textContent = 'Not synced yet';
    }
  }
}

/**
 * Loads price and NFT data via ApiService with deduplication and caching.
 */
async function loadMarketAndNftData() {
  try {
    const pricesPromise = ApiService.getPrices().catch(() => null);
    const nftsPromise = ApiService.getNfts().catch(() => []);

    const [pricesData, nftsData] = await Promise.all([pricesPromise, nftsPromise]);

    if (pricesData) {
      cachedPrices = pricesData;
      cachedUsdRate = parseFloat(pricesData.flowerPrice) || 0;
    }
    if (Array.isArray(nftsData) && nftsData.length > 0) {
      cachedNfts = nftsData;
    }
  } catch (err) {
    console.warn("⚠️ [Inventory Panel] Notice loading market/NFT data:", err.message);
  }
}

/**
 * Updates UI styling of the Resources / Boosts toggle buttons.
 */
function updateSubTabPillStyles() {
  const resBtn = document.getElementById('inv-subtab-resources-btn');
  const boostBtn = document.getElementById('inv-subtab-boosts-btn');
  const catPillsContainer = document.getElementById('inv-category-pills');
  const taxNoticeText = document.getElementById('inv-tax-notice-text');

  const globalTaxRate = getGlobalTaxRate();
  const globalTaxPct = Math.round(globalTaxRate * 100);

  if (activeSubTab === 'resources') {
    if (resBtn) {
      resBtn.className = "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-sfl-wood text-amber-200 border-sfl-dirt shadow-md";
    }
    if (boostBtn) {
      boostBtn.className = "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-transparent text-sfl-woodLight dark:text-slate-300 border-transparent hover:bg-amber-200/50 dark:hover:bg-slate-700/50";
    }
    if (catPillsContainer) catPillsContainer.classList.remove('hidden');
    if (taxNoticeText) taxNoticeText.textContent = `Global Tax: ${globalTaxPct}% (from header)`;
  } else {
    if (resBtn) {
      resBtn.className = "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-transparent text-sfl-woodLight dark:text-slate-300 border-transparent hover:bg-amber-200/50 dark:hover:bg-slate-700/50";
    }
    if (boostBtn) {
      boostBtn.className = "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-sfl-wood text-amber-200 border-sfl-dirt shadow-md";
    }
    if (catPillsContainer) catPillsContainer.classList.add('hidden');
    if (taxNoticeText) taxNoticeText.textContent = `Boosts Tax: 10% (Fixed)`;
  }
}

/**
 * Renders the active sub-tab view (Resources or Boosts).
 */
export function renderActiveView() {
  const summaryMount = document.getElementById('inv-summary-cards');
  const tableMount = document.getElementById('inv-table-mount');
  const resCountBadge = document.getElementById('inv-res-tab-count');
  const boostCountBadge = document.getElementById('inv-boost-tab-count');

  updateSubTabPillStyles();
  updateFarmBadgeAndSyncTime();

  if (activeSubTab === 'resources') {
    const resData = computeResourcesInventory(cachedPrices, cachedUsdRate);
    if (resCountBadge) resCountBadge.textContent = resData.summary.ownedCount.toLocaleString();

    // Also update boost count in background
    const boostData = computeBoostsInventory(cachedNfts, cachedUsdRate);
    if (boostCountBadge) boostCountBadge.textContent = boostData.summary.ownedCount.toLocaleString();

    // Render summary stat cards
    if (summaryMount) {
      summaryMount.innerHTML = renderSummaryCards({
        subTab: 'resources',
        summary: resData.summary,
        taxRate: resData.globalTaxRate,
        globalTaxRate: resData.globalTaxRate
      });
    }

    // Filter and sort rows
    const visibleRows = filterAndSortRows(resData.rows, {
      search: searchQuery,
      category: activeCategory,
      hideZero,
      sortBy
    });

    // Render table
    if (tableMount) {
      tableMount.innerHTML = renderResourcesTable(visibleRows, resData.globalTaxRate);
    }
  } else {
    const boostData = computeBoostsInventory(cachedNfts, cachedUsdRate);
    if (boostCountBadge) boostCountBadge.textContent = boostData.summary.ownedCount.toLocaleString();

    // Render summary stat cards (Boosts tax is fixed 10%)
    if (summaryMount) {
      summaryMount.innerHTML = renderSummaryCards({
        subTab: 'boosts',
        summary: boostData.summary,
        taxRate: 0.10,
        globalTaxRate: getGlobalTaxRate()
      });
    }

    // Filter and sort rows
    const visibleRows = filterAndSortRows(boostData.rows, {
      search: searchQuery,
      category: 'all', // Boosts do not use resource categories
      hideZero,
      sortBy
    });

    // Render table
    if (tableMount) {
      tableMount.innerHTML = renderBoostsTable(visibleRows);
    }
  }
}

/**
 * Binds shell-level UI event listeners.
 */
function bindShellEventListeners() {
  // 1. Sub-tab toggle: Resources
  document.getElementById('inv-subtab-resources-btn')?.addEventListener('click', () => {
    if (activeSubTab === 'resources') return;
    activeSubTab = 'resources';
    try { localStorage.setItem('sfl_inv_subtab', 'resources'); } catch (_) {}
    renderActiveView();
  });

  // 2. Sub-tab toggle: Boosts
  document.getElementById('inv-subtab-boosts-btn')?.addEventListener('click', () => {
    if (activeSubTab === 'boosts') return;
    activeSubTab = 'boosts';
    try { localStorage.setItem('sfl_inv_subtab', 'boosts'); } catch (_) {}
    renderActiveView();
  });

  // 3. Search input with debounce & clear button
  const searchInput = document.getElementById('inv-search-input');
  const searchClearBtn = document.getElementById('inv-search-clear-btn');

  searchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (searchClearBtn) {
      if (val) searchClearBtn.classList.remove('hidden');
      else searchClearBtn.classList.add('hidden');
    }

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = val;
      renderActiveView();
    }, 150);
  });

  searchClearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    searchQuery = '';
    renderActiveView();
    searchInput?.focus();
  });

  // 4. Hide zero stock checkbox
  const hideZeroCb = document.getElementById('inv-hide-zero-cb');
  hideZeroCb?.addEventListener('change', (e) => {
    hideZero = e.target.checked;
    renderActiveView();
  });

  // 5. Sort By dropdown
  const sortSelect = document.getElementById('inv-sort-select');
  sortSelect?.addEventListener('change', (e) => {
    sortBy = e.target.value;
    renderActiveView();
  });

  // 6. Category filter pills
  const catPills = document.querySelectorAll('.inv-cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => {
        p.className = "inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200";
      });
      pill.className = "inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-sfl-wood text-amber-200 border border-sfl-dirt";

      activeCategory = pill.getAttribute('data-cat') || 'all';
      renderActiveView();
    });
  });

  // 7. Manual "🔄 Sync Inventory" button
  const refreshBtn = document.getElementById('inventory-refresh-btn');
  const refreshSpinner = document.getElementById('inventory-refresh-spinner');

  refreshBtn?.addEventListener('click', async () => {
    const farmId = window.currentFarmId || (typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_farm_id') : '') || document.getElementById('farm-id')?.value.trim();
    if (!farmId) {
      alert("⚠️ Please enter and save your Farm ID in the top bar to sync farm inventory.");
      return;
    }

    const apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_api_key') : '') || document.getElementById('api-key')?.value.trim() || '';

    try {
      if (refreshSpinner) refreshSpinner.classList.add('animate-spin');
      if (refreshBtn) refreshBtn.disabled = true;

      // Force fetch latest farm data
      const farmObj = await ApiService.getFarmFullData(farmId, apiKey, { force: true });
      if (farmObj) {
        const liveInv = farmObj.inventory || {};
        window.farmInventoryData = liveInv;
        const liveWardrobe = farmObj.wardrobe || farmObj.farm?.wardrobe || {};
        window.farmWardrobeData = liveWardrobe;

        try {
          localStorage.setItem('sfl_farm_inventory', JSON.stringify(liveInv));
          localStorage.setItem('sfl_farm_wardrobe', JSON.stringify(liveWardrobe));
          localStorage.setItem('sfl_farm_inventory_updated_at', new Date().toISOString());
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('farmDataSynced', {
          detail: { inventory: liveInv, farmData: farmObj, farmId }
        }));
      }

      // Also refresh latest prices and NFTs
      await loadMarketAndNftData();
      renderActiveView();
    } catch (err) {
      alert(`⚠️ Failed to sync farm inventory: ${err.message}`);
    } finally {
      if (refreshSpinner) refreshSpinner.classList.remove('animate-spin');
      if (refreshBtn) refreshBtn.disabled = false;
    }
  });
}
