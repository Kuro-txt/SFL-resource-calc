import { BACKEND_URL, getCoinFlowerRatio } from '../config/constants.js';
import { ApiService } from '../services/api.js';
import { fetchMarketplaceTrades } from '../panels/tradeHistory/index.js';
import { renderNpcCards } from '../panels/npc/npcGiftsPanel.js';
import { renderWishlist } from '../panels/wishlistPanel.js';
import { loadPrices } from '../panels/calculatorPanel.js';
import { loadCloudYieldHistory, updatePreHarvestUI } from '../panels/trackerPanel.js';
import { mountDashboard } from '../panels/dashboard/dashboardPanel.js';

window.farmInventoryData = window.farmInventoryData || {};
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

      <!-- COMPACT MULTI-DEVICE CLOUD AUTH BAR -->
      <div id="auth-panel" class="bg-sfl-wood/95 text-amber-100 p-2.5 rounded-xl border-2 border-sfl-dirt flex flex-col sm:flex-row justify-between items-center gap-2 shadow-sm text-xs">
        <form id="auth-logged-out" onsubmit="return false;" class="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <span class="text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
            <span>☁️</span> <strong>Cloud Sync:</strong> Sign in to backup your snapshots & settings across devices
          </span>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input type="email" id="auth-email" placeholder="Email" autocomplete="username" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-36">
            <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-32">
            <button type="button" id="btn-login" class="bg-sfl-green text-white font-bold px-3 py-1 rounded text-xs hover:bg-green-700 transition whitespace-nowrap cursor-pointer">Sign In</button>
            <button type="button" id="btn-signup" class="bg-amber-600 text-white font-bold px-3 py-1 rounded text-xs hover:bg-amber-700 transition whitespace-nowrap cursor-pointer">Sign Up</button>
          </div>
        </form>

        <div id="auth-logged-in" class="hidden w-full flex justify-between items-center">
          <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>✅</span> Cloud Sync Active: <span id="user-email-display" class="text-white font-semibold"></span>
          </span>
          <button id="btn-logout" class="bg-sfl-accent text-white font-bold px-3 py-1 rounded text-xs hover:bg-red-700 transition cursor-pointer">Sign Out</button>
        </div>
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
