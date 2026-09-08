import { BACKEND_URL } from '../config/constants.js';
import { ApiService } from '../services/api.js';
import { fetchMarketplaceTrades } from '../panels/tradeHistory/index.js';
import { renderNpcCards } from '../panels/npc/npcGiftsPanel.js';
import { renderWishlist } from '../panels/wishlistPanel.js';

window.farmInventoryData = window.farmInventoryData || {};
window.farmNpcData = window.farmNpcData || JSON.parse(localStorage.getItem('sfl_farm_npcs') || '{}');
window.syncCount = window.syncCount || 0;
window.syncCooldownTimer = window.syncCooldownTimer || null;

export function renderAuthBar() {
  const container = document.getElementById('auth-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3">
      <!-- AUTHENTICATION BAR -->
      <div id="auth-panel" class="bg-sfl-wood text-amber-100 p-3 rounded-xl border-2 border-sfl-dirt flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
        <form id="auth-logged-out" onsubmit="return false;" class="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <span class="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <span>☁️</span> Multi-Device Sync: Log in to save settings & snapshots across devices
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
            <span>✅</span> Logged in as: <span id="user-email-display" class="text-white font-semibold"></span>
          </span>
          <button id="btn-logout" class="bg-sfl-accent text-white font-bold px-3 py-1 rounded text-xs hover:bg-red-700 transition cursor-pointer">Sign Out</button>
        </div>
      </div>

      <!-- GLOBAL FARM SYNC PANEL -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder space-y-3 shadow-sm">
        <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
          <span>🔑</span> SYNC FARM, INVENTORY & TRADES
        </h3>
        <form onsubmit="return false;" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-sfl-wood mb-1">Farm ID</label>
              <input type="number" id="farm-id" placeholder="e.g. 12345" min="1" step="1" class="w-full sfl-input rounded-lg px-3 py-1.5 text-sm text-sfl-dirt">
              <!-- GLOBAL TAX RATE DIRECTLY BELOW FARM ID -->
              <div class="mt-2 flex items-center justify-between gap-2 bg-sfl-card/70 px-2.5 py-1.5 rounded-lg border border-sfl-cardBorder">
                <label for="tax-select" class="text-[11px] font-bold text-sfl-wood uppercase whitespace-nowrap flex items-center gap-1">
                  <span>🏷️</span> Global Tax Rate:
                </label>
                <select id="tax-select" class="sfl-input rounded-md px-2 py-0.5 text-xs font-bold text-sfl-dirt cursor-pointer w-28">
                  <option value="0">0% (None)</option>
                  <option value="0.05">5%</option>
                  <option value="0.075">7.5%</option>
                  <option value="0.10" selected>10%</option>
                  <option value="0.125">12.5%</option>
                  <option value="0.15">15%</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-sfl-wood mb-1">
                API Key / Token <span class="text-sfl-woodLight font-normal">(Optional)</span>
              </label>
              <input type="password" id="api-key" placeholder="Paste custom Key/Token" autocomplete="off" class="w-full sfl-input rounded-lg px-3 py-1.5 text-sm text-sfl-dirt">
            </div>
          </div>
          <button type="button" id="import-farm-btn" class="w-full bg-sfl-wood text-amber-200 font-bold py-2.5 px-3 rounded-lg border-2 border-sfl-dirt text-sm hover:bg-sfl-woodLight transition flex items-center justify-center gap-2 cursor-pointer shadow-xs">
            🔄 Sync Farm, Inventory & Trades Now
          </button>
        </form>
        <p id="sync-status" class="text-xs text-center font-bold text-sfl-woodLight min-h-[16px]"></p>
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
  });
}

function startSyncCooldown() {
  const syncBtn = document.getElementById('import-farm-btn');
  if (!syncBtn) return;
  let timeLeft = 20;
  syncBtn.disabled = true;

  window.syncCooldownTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      syncBtn.textContent = `⏳ Please wait ${timeLeft}s...`;
    } else {
      clearInterval(window.syncCooldownTimer);
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 Sync Farm, Inventory & Trades Now';
    }
  }, 1000);
}

export async function handleFarmSync() {
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');
  const status = document.getElementById('sync-status');

  const farmId = farmIdEl ? farmIdEl.value.trim() : '';
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';

  if (!farmId) {
    if (status) status.textContent = '❌ Please enter a Farm ID.';
    return;
  }

  // Save latest entered Farm ID & API Key
  localStorage.setItem('sfl_farm_id', farmId);
  if (apiKey) {
    localStorage.setItem('sfl_api_key', apiKey);
  }

  if (status) status.textContent = '⏳ Syncing farm inventory, NPCs & saving trades to cloud...';
  
  window.syncCount++;
  if (window.syncCount >= 2) {
    startSyncCooldown();
  }

  try {
    const farmObj = await ApiService.getFarmFullData(farmId, apiKey, { force: true });
    window.farmInventoryData = farmObj?.inventory || {};
    window.farmNpcData = farmObj?.npcs || {};
    localStorage.setItem('sfl_farm_npcs', JSON.stringify(window.farmNpcData));

    let totalItemsCount = Object.keys(window.farmInventoryData).length;
    let totalNpcsCount = Object.keys(window.farmNpcData).length;

    // Trigger panel updates for NPC & Wishlist
    renderNpcCards();
    renderWishlist();

    // Automatically trigger daily snapshots & yields sync from cloud
    if (typeof window.loadCloudYieldHistory === 'function') {
      window.loadCloudYieldHistory(true).catch(e => console.warn("Yield sync notice:", e.message));
    }

    // Automatically trigger trade history sync and cloud archiving in background
    let tradeMsg = '';
    try {
      const tradeRes = await fetchMarketplaceTrades(true);
      if (tradeRes && tradeRes.success) {
        tradeMsg = ` & saved ${tradeRes.count} trades to cloud`;
      }
    } catch (tradeErr) {
      console.warn("Marketplace trade auto-sync warning:", tradeErr.message);
    }

    if (status) {
      status.textContent = `✅ Synced ${totalItemsCount} items, ${totalNpcsCount} NPCs${tradeMsg} (Farm #${farmId})!`;
    }

  } catch (err) {
    if (status) status.textContent = err.message;
  }
}
