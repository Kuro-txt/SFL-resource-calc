import { BACKEND_URL, getCoinFlowerRatio, DEFAULT_GEM_PACKS } from '../config/constants.js';
import { ApiService } from '../services/api.js';
import { fetchMarketplaceTrades } from '../panels/tradeHistory/index.js';
import { renderNpcCards } from '../panels/npc/npcGiftsPanel.js';
import { renderWishlist } from '../panels/wishlistPanel.js';
import { loadPrices } from '../panels/calculatorPanel.js';
import { loadCloudYieldHistory, updatePreHarvestUI } from '../panels/trackerPanel.js';
import { mountDashboard } from '../panels/dashboard/dashboardPanel.js';

let savedInventory = {};
try { savedInventory = JSON.parse(localStorage.getItem('sfl_farm_inventory') || '{}'); } catch (_) {}
window.farmInventoryData = (window.farmInventoryData && Object.keys(window.farmInventoryData).length > 0) ? window.farmInventoryData : savedInventory;
window.farmNpcData = window.farmNpcData || JSON.parse(localStorage.getItem('sfl_farm_npcs') || '{}');
window.syncCount = window.syncCount || 0;
window.syncCooldownTimer = window.syncCooldownTimer || null;

export function renderAuthBar() {
  const container = document.getElementById('auth-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3">
      <!-- GLOBAL FARM SYNC & SETTINGS PANEL -->
      <div class="bg-sfl-card/95 dark:bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border-2 border-sfl-cardBorder dark:border-slate-700/80 shadow-sm space-y-2.5">
        <div class="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3">
          <!-- Left: Farm ID, Tax Rate, Coin:Flower Ratio, API Key -->
          <div class="flex flex-wrap items-end gap-2.5 flex-1">
            <!-- Farm ID -->
            <div class="w-28 sm:w-32">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 mb-1 flex items-center gap-1">
                <span>🚜</span> Farm ID
              </label>
              <input type="number" id="farm-id" placeholder="e.g. 12345" min="1" step="1"
                class="w-full sfl-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 shadow-2xs">
            </div>

            <!-- Global Tax Rate -->
            <div class="w-28 sm:w-32">
              <label for="tax-select" class="block text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 mb-1 flex items-center gap-1">
                <span>🏷️</span> Tax Rate
              </label>
              <select id="tax-select"
                class="w-full sfl-input rounded-xl px-2 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 dark:bg-amber-900/40 cursor-pointer shadow-2xs">
                <option value="0">0% (None)</option>
                <option value="0.05">5%</option>
                <option value="0.075">7.5%</option>
                <option value="0.10" selected>10%</option>
                <option value="0.125">12.5%</option>
                <option value="0.15">15%</option>
              </select>
            </div>

            <!-- Coin : Flower Ratio -->
            <div class="w-28 sm:w-32">
              <label for="coin-flower-ratio-input" class="block text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 mb-1 flex items-center gap-1" title="Number of Coins per 1 Flower token">
                <span>🪙:🌸</span> Ratio
              </label>
              <input type="number" id="coin-flower-ratio-input" placeholder="1000" min="1" step="10" value="1000"
                class="w-full sfl-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 shadow-2xs" title="Coin to Flower conversion ratio for dashboard calculations">
            </div>

            <!-- Gem Packs Exchange Option -->
            <div class="relative w-36 sm:w-44" id="gem-packs-wrapper">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 mb-1 flex items-center justify-between" title="Flower per Gem exchange rates from sfl.world">
                <span class="flex items-center gap-1"><span>💎</span> Gem Packs</span>
                <span id="gem-packs-badge" class="text-[9px] text-amber-700 dark:text-amber-400 font-normal">7 packs</span>
              </label>
              
              <button type="button" id="gem-packs-btn"
                class="w-full sfl-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 bg-amber-50/80 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-300 dark:border-slate-600 shadow-2xs cursor-pointer flex items-center justify-between gap-1 transition select-none"
                title="Click to view Flower price per Gem for all 7 Gem packs">
                <span class="truncate flex items-center gap-1">
                  <span id="gem-packs-btn-label">💎 Rates / Pack</span>
                </span>
                <span id="gem-packs-arrow" class="text-[10px] text-sfl-woodLight dark:text-slate-400 transition-transform duration-200">▼</span>
              </button>

              <!-- Dropdown Menu Popover -->
              <div id="gem-packs-dropdown"
                class="hidden absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border-2 border-amber-400/90 dark:border-slate-700 rounded-2xl shadow-2xl p-3 text-xs space-y-2.5 max-h-[80vh] overflow-y-auto">
                
                <div class="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-slate-800">
                  <div>
                    <div class="font-bold text-sfl-dirt dark:text-amber-300 flex items-center gap-1.5 text-xs">
                      <span>💎</span> Gem Exchange Packs
                    </div>
                    <div class="text-[10px] text-sfl-woodLight dark:text-slate-400">Total & Per Gem Price (🌸 Flower / USD)</div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button type="button" id="gem-packs-reset-btn" class="text-[10px] font-bold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 px-1.5 py-0.5 rounded bg-amber-100/60 dark:bg-slate-800 transition cursor-pointer" title="Reset selection">
                      Reset
                    </button>
                    <button type="button" id="gem-packs-refresh-btn" class="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-800 text-sfl-wood dark:text-slate-300 text-xs transition cursor-pointer" title="Refresh live exchange rates">
                      🔄
                    </button>
                  </div>
                </div>

                <!-- 20% Discount Option Banner & Toggle -->
                <div class="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-100/90 to-amber-50/70 dark:from-amber-950/60 dark:to-slate-800/70 border border-amber-300/90 dark:border-amber-700/60 shadow-2xs">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">🏷️</span>
                    <div>
                      <div class="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <span>20% Gem Discount</span>
                        <span class="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase">-20%</span>
                      </div>
                      <div class="text-[10px] text-sfl-woodLight dark:text-slate-400">Save 20% on total & per-gem rate</div>
                    </div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer select-none">
                    <input type="checkbox" id="gem-discount-toggle" class="sr-only peer" checked>
                    <div class="w-8 h-4.5 bg-stone-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div id="gem-packs-list" class="space-y-1.5">
                  <!-- Dynamically rendered 7 packs -->
                </div>

                <div class="pt-2 border-t border-amber-200/70 dark:border-slate-800 flex items-center justify-between text-[10px] text-sfl-woodLight dark:text-slate-400">
                  <span class="truncate">Source: sfl.world/api/v1.1/exchange</span>
                  <span id="gem-packs-status-tag" class="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-semibold">Live Rates</span>
                </div>
              </div>
            </div>

            <!-- Optional API Key -->
            <div class="w-32 sm:w-36">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 mb-1 flex items-center gap-1">
                <span>🔑</span> API Key <span class="font-normal opacity-75">(Opt)</span>
              </label>
              <input type="password" id="api-key" placeholder="Custom Token" autocomplete="off"
                class="w-full sfl-input rounded-xl px-2.5 py-1.5 text-xs text-sfl-dirt dark:text-amber-100 shadow-2xs">
            </div>
          </div>

          <!-- Right: Sync Button -->
          <div class="shrink-0 flex items-end">
            <button type="button" id="import-farm-btn"
              class="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:translate-y-0.5 text-white font-black px-5 py-2.5 rounded-xl border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
              <span>🔄</span>
              <span>Sync Data</span>
            </button>
          </div>
        </div>

        <div id="sync-status" class="text-xs text-center font-bold text-sfl-woodLight dark:text-amber-300 min-h-[18px]"></div>
      </div>
    </div>
  `;

  bindFarmSyncEvents();
}

function bindFarmSyncEvents() {
  document.getElementById('import-farm-btn')?.addEventListener('click', handleFarmSync);

  const savedFarmId = localStorage.getItem('sfl_farm_id');
  const savedApiKey = localStorage.getItem('sfl_api_key');
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');

  if (savedFarmId && farmIdEl) farmIdEl.value = savedFarmId;
  if (savedApiKey && apiKeyEl) apiKeyEl.value = savedApiKey;

  const savedTaxRate = localStorage.getItem('sfl_tax_rate');
  const taxEl = document.getElementById('tax-select');
  if (savedTaxRate !== null && taxEl) taxEl.value = savedTaxRate;

  taxEl?.addEventListener('change', (e) => {
    const newTax = e.target.value;
    localStorage.setItem('sfl_tax_rate', newTax);
    if (typeof window.renderSnapshotHistory === 'function') window.renderSnapshotHistory();
    if (typeof window.renderCropTrackerRows === 'function') window.renderCropTrackerRows();
    if (typeof window.renderCurrentTradeView === 'function') window.renderCurrentTradeView();
    if (typeof window.refreshDashboardView === 'function') window.refreshDashboardView();
  });

  const savedRatio = localStorage.getItem('sfl_coin_flower_ratio') || '1000';
  const ratioEl = document.getElementById('coin-flower-ratio-input');
  if (savedRatio && ratioEl) ratioEl.value = savedRatio;

  ratioEl?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('sfl_coin_flower_ratio', val.toString());
      if (typeof window.refreshDashboardView === 'function') {
        window.refreshDashboardView();
      }
    }
  });

  setupGemPacksDropdown();
}

export function setupGemPacksDropdown() {
  const btn = document.getElementById('gem-packs-btn');
  const dropdown = document.getElementById('gem-packs-dropdown');
  const arrow = document.getElementById('gem-packs-arrow');
  const list = document.getElementById('gem-packs-list');
  const wrapper = document.getElementById('gem-packs-wrapper');
  const refreshBtn = document.getElementById('gem-packs-refresh-btn');
  const resetBtn = document.getElementById('gem-packs-reset-btn');
  const labelEl = document.getElementById('gem-packs-btn-label');
  const statusTag = document.getElementById('gem-packs-status-tag');
  const badge = document.getElementById('gem-packs-badge');
  const discountToggle = document.getElementById('gem-discount-toggle');

  if (!btn || !dropdown || !list) return;

  // 1. Restore cached exchange data from localStorage if present
  let cachedExchange = null;
  try {
    const rawCache = localStorage.getItem('sfl_exchange_gems_cache');
    if (rawCache) cachedExchange = JSON.parse(rawCache);
  } catch (e) {}

  let currentGemsData = (cachedExchange && typeof cachedExchange === 'object' && Object.keys(cachedExchange).length > 0)
    ? cachedExchange
    : DEFAULT_GEM_PACKS;

  // 2. Restore 20% discount setting from localStorage (defaults to true)
  const savedDiscount = localStorage.getItem('sfl_gem_discount_active');
  let isDiscountActive = savedDiscount === null ? true : (savedDiscount === 'true');
  if (discountToggle) {
    discountToggle.checked = isDiscountActive;
    discountToggle.onchange = (e) => {
      isDiscountActive = e.target.checked;
      try {
        localStorage.setItem('sfl_gem_discount_active', String(isDiscountActive));
      } catch (err) {}
      if (selectedPackKey && currentGemsData[selectedPackKey]) {
        persistSelection(selectedPackKey, currentGemsData[selectedPackKey]);
      }
      renderList(currentGemsData);
    };
  }

  // 3. Restore selected pack from localStorage
  let selectedPackKey = localStorage.getItem('sfl_selected_gem_pack') || '';

  function persistSelection(gemKey, packData) {
    if (gemKey && packData) {
      selectedPackKey = String(gemKey);
      const discountMultiplier = isDiscountActive ? 0.8 : 1.0;
      const rate = Number(packData.sfl1 || 0) * discountMultiplier;
      const totalSfl = Number(packData.sfl || 0) * discountMultiplier;
      const usd = Number(packData.usd || 0) * discountMultiplier;

      try {
        localStorage.setItem('sfl_selected_gem_pack', selectedPackKey);
        localStorage.setItem('sfl_selected_gem_rate', String(rate));
        localStorage.setItem('sfl_selected_gem_total_sfl', String(totalSfl));
        localStorage.setItem('sfl_selected_gem_usd', String(usd));
        localStorage.setItem('sfl_selected_gem_discount_active', String(isDiscountActive));
        localStorage.setItem('sfl_selected_gem_discount_pct', isDiscountActive ? '20' : '0');
        localStorage.setItem('sfl_selected_gem_base_rate', String(packData.sfl1 || ''));
        localStorage.setItem('sfl_selected_gem_data', JSON.stringify({
          ...packData,
          discountActive: isDiscountActive,
          discountPct: 20,
          effectiveRate: rate,
          effectiveTotalSfl: totalSfl,
          effectiveUsd: usd
        }));
      } catch (e) {}
      window.selectedGemPack = selectedPackKey;
      window.selectedGemRate = rate;
    } else {
      selectedPackKey = '';
      try {
        localStorage.removeItem('sfl_selected_gem_pack');
        localStorage.removeItem('sfl_selected_gem_rate');
        localStorage.removeItem('sfl_selected_gem_total_sfl');
        localStorage.removeItem('sfl_selected_gem_usd');
        localStorage.removeItem('sfl_selected_gem_discount_active');
        localStorage.removeItem('sfl_selected_gem_discount_pct');
        localStorage.removeItem('sfl_selected_gem_base_rate');
        localStorage.removeItem('sfl_selected_gem_data');
      } catch (e) {}
      window.selectedGemPack = null;
      window.selectedGemRate = null;
    }

    try {
      window.dispatchEvent(new CustomEvent('gemPackChanged', {
        detail: {
          gem: selectedPackKey ? Number(selectedPackKey) : null,
          rate: window.selectedGemRate,
          discountActive: isDiscountActive,
          pack: packData || null
        }
      }));
    } catch (e) {}
  }

  function renderList(gemsMap) {
    if (!gemsMap || typeof gemsMap !== 'object') return;
    currentGemsData = gemsMap;

    const packs = Object.values(gemsMap)
      .map(p => ({
        gem: Number(p.gem || 0),
        usd: Number(p.usd || 0),
        sfl1: Number(p.sfl1 || 0),
        sfl: Number(p.sfl || 0),
        pol: Number(p.pol || 0)
      }))
      .filter(p => p.gem > 0)
      .sort((a, b) => a.gem - b.gem);

    if (badge) badge.textContent = `${packs.length} packs${isDiscountActive ? ' (-20%)' : ''}`;

    if (packs.length === 0) {
      list.innerHTML = `<div class="text-center py-3 text-sfl-woodLight dark:text-slate-400">No gem packs available.</div>`;
      return;
    }

    // Keep stored selection rate in sync with latest rates and discount
    if (selectedPackKey && gemsMap[selectedPackKey]) {
      persistSelection(selectedPackKey, gemsMap[selectedPackKey]);
    }

    list.innerHTML = packs.map(pack => {
      const isSelected = selectedPackKey && String(pack.gem) === String(selectedPackKey);
      const isBestValue = pack.gem >= 200000;
      const sfl1Val = isDiscountActive ? (pack.sfl1 * 0.8) : pack.sfl1;
      const sflVal = isDiscountActive ? (pack.sfl * 0.8) : pack.sfl;
      const usdVal = isDiscountActive ? (pack.usd * 0.8) : pack.usd;

      return `
        <div class="gem-pack-item flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
          isSelected
            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 shadow-2xs'
            : 'bg-amber-50/60 dark:bg-slate-800/60 border-amber-200/80 dark:border-slate-700/80 hover:bg-amber-100/70 dark:hover:bg-slate-700/70'
        }" data-gem="${pack.gem}">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg ${
              isSelected ? 'bg-amber-400 text-stone-900' : 'bg-amber-200/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200'
            } flex items-center justify-center font-bold text-sm shrink-0">
              💎
            </div>
            <div>
              <div class="font-bold text-xs text-sfl-dirt dark:text-amber-200 flex items-center gap-1.5">
                <span>${pack.gem.toLocaleString()} Gems</span>
                <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-normal">
                  $${usdVal.toFixed(2)}
                  ${isDiscountActive ? `<span class="line-through opacity-60 text-[9px] ml-0.5">$${pack.usd.toFixed(2)}</span>` : ''}
                </span>
                ${isBestValue ? '<span class="text-[9px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.2 rounded-full uppercase">Best</span>' : ''}
                ${isSelected ? '<span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ Selected</span>' : ''}
              </div>
              <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono">
                Total: <strong class="text-amber-950 dark:text-amber-300 font-semibold">${sflVal.toFixed(2)} 🌸</strong>
                ${isDiscountActive ? `<span class="line-through opacity-60 ml-0.5 font-normal">${pack.sfl.toFixed(2)} 🌸</span>` : ''}
                <span class="opacity-75 ml-1">(${pack.pol.toFixed(1)} POL)</span>
              </div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="flex items-center justify-end gap-1">
              <span class="inline-block px-2 py-0.5 rounded-lg ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
              } font-mono text-[11px]">
                ${sfl1Val.toFixed(4)} 🌸
              </span>
              ${isDiscountActive ? '<span class="text-[9px] bg-rose-500 text-white font-bold px-1 py-0.2 rounded">-20%</span>' : ''}
            </div>
            <div class="text-[9px] text-sfl-woodLight dark:text-slate-500 mt-0.5 font-sans">
              ${isDiscountActive ? `<span class="line-through opacity-60 mr-1">${pack.sfl1.toFixed(4)}</span>` : ''}per gem
            </div>
          </div>
        </div>
      `;
    }).join('');

    updateButtonLabel();

    list.querySelectorAll('.gem-pack-item').forEach(el => {
      el.addEventListener('click', () => {
        const gemVal = el.getAttribute('data-gem');
        if (selectedPackKey === gemVal) {
          // Deselect
          persistSelection('', null);
        } else {
          const packData = currentGemsData[gemVal];
          persistSelection(gemVal, packData);
        }
        renderList(currentGemsData);
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
      });
    });
  }

  function updateButtonLabel() {
    if (!labelEl) return;
    if (selectedPackKey && currentGemsData[selectedPackKey]) {
      const p = currentGemsData[selectedPackKey];
      const rate = isDiscountActive ? (p.sfl1 * 0.8) : p.sfl1;
      const sfl1 = Number(rate || 0).toFixed(4);
      labelEl.innerHTML = `<span>💎 ${Number(p.gem).toLocaleString()}:</span> <span class="text-emerald-700 dark:text-emerald-400 font-mono font-bold">${sfl1} 🌸</span>${isDiscountActive ? '<span class="text-[9px] text-rose-600 dark:text-rose-400 font-bold ml-0.5">(-20%)</span>' : ''}`;
    } else {
      labelEl.innerHTML = isDiscountActive
        ? `<span>💎 Gem Packs <span class="text-rose-600 dark:text-rose-400 text-[10px] font-bold">(-20%)</span></span>`
        : `<span>💎 Gem Packs (7)</span>`;
    }
  }

  // Toggle Dropdown
  btn.onclick = (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      dropdown.classList.remove('hidden');
      arrow.classList.add('rotate-180');
      fetchExchange(false);
    } else {
      dropdown.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  };

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper?.contains(e.target)) {
      dropdown.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  });

  // Reset button: clears selection from localStorage
  if (resetBtn) {
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      persistSelection('', null);
      renderList(currentGemsData);
    };
  }

  // Refresh button: fetches fresh live rates
  if (refreshBtn) {
    refreshBtn.onclick = (e) => {
      e.stopPropagation();
      fetchExchange(true);
    };
  }

  async function fetchExchange(force = false) {
    if (statusTag) statusTag.textContent = force ? "Refreshing..." : "Updating...";
    if (refreshBtn) refreshBtn.classList.add('animate-spin');
    try {
      const data = await ApiService.getExchangeRates({ force });
      if (data && data.gems) {
        // Cache in localStorage for immediate load next time
        try {
          localStorage.setItem('sfl_exchange_gems_cache', JSON.stringify(data.gems));
        } catch (e) {}
        renderList(data.gems);
        if (statusTag) statusTag.textContent = "Live " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (err) {
      console.warn("Could not refresh exchange rates:", err.message);
      if (statusTag) statusTag.textContent = "Offline (Cached)";
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('animate-spin');
    }
  }

  // Initial render from local cache or defaults
  renderList(currentGemsData);
  // Fetch live exchange data in background
  fetchExchange(false);
}

export async function handleFarmSync() {
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');
  const status = document.getElementById('sync-status');
  const syncBtn = document.getElementById('import-farm-btn');

  const farmId = farmIdEl ? farmIdEl.value.trim() : (localStorage.getItem('sfl_farm_id') || '');
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : (localStorage.getItem('sfl_api_key') || '');

  if (!farmId) {
    if (status) {
      status.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-bold">❌ Please enter a Farm ID to sync.</span>`;
    }
    farmIdEl?.focus();
    return;
  }

  // Save latest entered Farm ID & API Key
  localStorage.setItem('sfl_farm_id', farmId);
  if (apiKey) {
    localStorage.setItem('sfl_api_key', apiKey);
  }

  // Update button and status to active loading state
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<span class="inline-block animate-spin mr-1.5">🔄</span> <span>Syncing...</span>`;
  }
  if (status) {
    status.innerHTML = `<span class="text-amber-700 dark:text-amber-300 font-bold animate-pulse">⏳ Syncing Farm #${farmId} (Trades, Market Prices & Cloud Yields)...</span>`;
  }

  try {
    // 1. Fetch live market prices from SFL.world
    await loadPrices(true).catch(e => console.warn("Prices sync note:", e.message));

    // 2. Fetch Marketplace Trades & save to TiDB Cloud (does not hit farm inventory)
    let tradesCount = 0;
    try {
      const tradeRes = await fetchMarketplaceTrades(true);
      if (tradeRes && tradeRes.success) {
        tradesCount = tradeRes.count || (tradeRes.trades?.length || 0);
      }
    } catch (tradeErr) {
      console.warn("Marketplace trade sync warning:", tradeErr.message);
    }

    // 3. Fetch Cloud Yields & Daily Snapshots from Supabase
    try {
      await loadCloudYieldHistory(true);
    } catch (yieldErr) {
      console.warn("Cloud yield sync warning:", yieldErr.message);
    }

    // 4. Update Pre-Harvest Baseline UI from Cloud
    try {
      await updatePreHarvestUI();
    } catch (_) {}

    // 5. Load latest baseline inventory from Supabase (captured automatically by 00:01 UTC cron)
    const client = window.supabaseClient;
    const activeUser = window.currentUser;
    if (client && (activeUser?.id || farmId)) {
      try {
        let targetUserId = activeUser?.id;
        if (!targetUserId && farmId) {
          const { data: profile } = await client
            .from('profiles')
            .select('id')
            .eq('farm_id', farmId)
            .maybeSingle();
          if (profile?.id) targetUserId = profile.id;
        }
        if (targetUserId) {
          const { data: base } = await client
            .from('preharvest_baselines')
            .select('stock, farm_activity')
            .eq('user_id', targetUserId)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (base?.stock) {
            window.farmInventoryData = base.stock;
            try { localStorage.setItem('sfl_farm_inventory', JSON.stringify(base.stock)); } catch (_) {}
            window.farmData = { inventory: base.stock, farmActivity: base.farm_activity || {} };
          }
        }
      } catch (e) {
        console.warn("Baseline cloud load note:", e.message);
      }
    }

    // 6. Refresh active UI panels
    renderNpcCards();
    renderWishlist();
    if (typeof window.renderSnapshotHistory === 'function') {
      window.renderSnapshotHistory();
    }
    if (typeof window.renderCurrentTradeView === 'function') {
      window.renderCurrentTradeView();
    }
    if (typeof window.mountDashboard === 'function') {
      await window.mountDashboard();
    }

    if (status) {
      status.innerHTML = `
        <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-full shadow-2xs">
          <span>✅</span>
          <span>Synced Farm #${farmId}: <strong>${tradesCount}</strong> trades • Cloud data & Dashboard refreshed!</span>
        </span>`;
    }

  } catch (err) {
    if (status) {
      status.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-bold">❌ ${err.message}</span>`;
    }
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `<span>🔄</span> <span>Sync Data</span>`;
    }
  }
}

window.syncGlobalFarmData = handleFarmSync;

