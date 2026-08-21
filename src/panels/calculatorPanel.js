import { BACKEND_URL } from '../config/constants.js';

window.allPrices = window.allPrices || {};
window.farmInventoryData = window.farmInventoryData || {};
window.syncCount = window.syncCount || 0;
window.syncCooldownTimer = window.syncCooldownTimer || null;

export function renderCalculatorTemplate() {
  const container = document.getElementById('calc-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">

      <!-- FARM SYNC PANEL -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder space-y-3">
        <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
          <span>🔑</span> SYNC INVENTORY
        </h3>
        <form onsubmit="return false;" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-sfl-wood mb-1">Farm ID</label>
              <input type="number" id="farm-id" placeholder="e.g. 12345" min="1" step="1" class="w-full sfl-input rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-sfl-wood mb-1">
                API Key / Token <span class="text-sfl-woodLight font-normal">(Optional)</span>
              </label>
              <input type="password" id="api-key" placeholder="Paste custom Key/Token" autocomplete="off" class="w-full sfl-input rounded-lg px-3 py-1.5 text-sm">
            </div>
          </div>
          <button type="button" id="import-farm-btn" class="w-full bg-sfl-wood text-amber-200 font-bold py-2.5 px-3 rounded-lg border-2 border-sfl-dirt text-sm hover:bg-sfl-woodLight transition flex items-center justify-center gap-2">
            🔄 Sync Inventory Now
          </button>
        </form>
        <p id="sync-status" class="text-xs text-center font-bold text-sfl-woodLight min-h-[16px]"></p>
      </div>

      <!-- GLOBAL SETTINGS (TAX & RATIO) -->
      <div class="bg-sfl-card/90 p-3.5 rounded-xl border-2 border-sfl-cardBorder shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col">
            <label class="text-xs font-bold text-sfl-wood uppercase mb-1 flex items-center gap-1">
              <span>🏷️</span> Market Tax Rate
            </label>
            <select id="tax-select" class="w-full sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt cursor-pointer">
              <option value="0">0% (No Tax)</option>
              <option value="0.05">5% Tax</option>
              <option value="0.075">7.5% Tax</option>
              <option value="0.10" selected>10% Tax</option>
              <option value="0.125">12.5% Tax</option>
              <option value="0.15">15% Tax</option>
            </select>
          </div>
          <div class="flex flex-col">
            <label class="text-xs font-bold text-sfl-wood uppercase mb-1 flex items-center gap-1">
              <img src="./assets/coins.webp" class="w-4 h-4 sfl-icon" alt="Coins"> Coins per 1 Flower
            </label>
            <input type="number" id="coin-ratio" value="1000" min="1" step="1" class="w-full sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt">
          </div>
        </div>
      </div>

      <!-- HARVEST TRACKER SUB-SECTION -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm space-y-4">
        
        <!-- TRACKER TITLE & ACTION BUTTONS -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
              <span>🌾</span> Daily Yield & Resource Tracker
            </h3>
            <p class="text-[11px] text-sfl-woodLight font-semibold">Track crop, fruit, & resource yields harvested between sessions (Kept for 30 days).</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="save-pre-harvest-btn" class="bg-amber-600 text-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-amber-700 transition cursor-pointer">
              🚩 1. Save Pre-Harvest Stock
            </button>
            <button id="log-yield-btn" class="bg-sfl-green text-white px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-green-700 transition cursor-pointer">
              🏁 2. Calculate Harvest Yield
            </button>
            <input type="file" id="import-file-input" accept=".json" class="hidden">
            <button id="import-json-btn" class="bg-sfl-wood text-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer">
              📤 Import
            </button>
            <button id="export-json-btn" class="bg-sfl-wood text-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer">
              📥 Export
            </button>
          </div>
        </div>

        <!-- AUTOMATED TRACKING & WEEKLY SUMMARY ACTION BAR -->
        <div class="flex flex-col sm:flex-row justify-center items-center gap-2 border-t-2 border-b-2 border-sfl-cardBorder/60 py-3">
          <button id="open-tracking-modal-btn" onclick="openTrackingModal()" class="w-full sm:w-auto bg-amber-600 text-amber-100 font-bold py-2.5 px-5 rounded-xl border-2 border-sfl-dirt text-xs sm:text-sm hover:bg-amber-700 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <span>⚙️</span> Manage Automated Tracking Targets
          </button>
          <button id="open-weekly-modal-btn" class="w-full sm:w-auto bg-sfl-gold text-sfl-dirt font-bold py-2.5 px-5 rounded-xl border-2 border-sfl-dirt hover:bg-amber-400 transition shadow-md cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm">
            <span>📊</span> Weekly Summary
          </button>
        </div>

        <!-- BASELINE STATUS DISPLAY -->
        <div id="pre-harvest-status" class="hidden bg-amber-100/90 border-2 border-amber-400 p-3 rounded-lg text-xs font-bold text-amber-900 space-y-2 shadow-sm">
          <div id="cloud-baseline-status" class="hidden flex justify-between items-center text-green-800 border-b border-amber-300/60 pb-1">
            <span>☁️ 00:00 UTC Cloud Baseline: <span class="font-extrabold">Active</span></span>
            <span class="text-[10px] bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-bold">Automatic</span>
          </div>
          <div id="manual-baseline-status" class="hidden">
            <div class="flex justify-between items-center text-amber-900">
              <span>🚩 Manual Baseline: <span class="font-extrabold text-amber-800">Active</span> (<span id="pre-harvest-time">Today</span>)</span>
              <button id="clear-pre-harvest-btn" class="text-[10px] bg-sfl-accent text-white px-2 py-0.5 rounded font-bold hover:bg-red-700 transition cursor-pointer">Clear Manual Baseline</button>
            </div>
            <div id="manual-baseline-items" class="mt-1 flex flex-wrap gap-1 text-[10px]"></div>
          </div>
        </div>

        <!-- SNAPSHOT HISTORY TABLE -->
        <div class="overflow-x-auto bg-white/70 border-2 border-sfl-cardBorder rounded-lg">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood uppercase text-[11px]">
              <tr>
                <th class="px-3 py-2.5">Date</th>
                <th class="px-3 py-2.5">Total Daily Yield</th>
                <th class="px-3 py-2.5">Harvested Breakdown</th>
                <th class="px-3 py-2.5">Harvest Net Flowers</th>
                <th class="px-2 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="snapshot-history-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="5" class="px-4 py-6 text-center text-sfl-woodLight italic">
                  No harvest sessions logged yet!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function initCalculatorPanel() {
  renderCalculatorTemplate();

  const savedTaxRate = localStorage.getItem('sfl_tax_rate');
  const savedCoinRatio = localStorage.getItem('sfl_coin_ratio');

  const taxEl = document.getElementById('tax-select');
  const coinEl = document.getElementById('coin-ratio');

  if (savedTaxRate !== null && taxEl) taxEl.value = savedTaxRate;
  if (savedCoinRatio !== null && coinEl) coinEl.value = savedCoinRatio;

  bindCalculatorEvents();
  loadPrices();
}

function bindCalculatorEvents() {
  document.getElementById('tax-select')?.addEventListener('change', (e) => {
    localStorage.setItem('sfl_tax_rate', e.target.value);
    if (typeof window.renderSnapshotHistory === 'function') window.renderSnapshotHistory();
  });

  document.getElementById('coin-ratio')?.addEventListener('input', (e) => {
    localStorage.setItem('sfl_coin_ratio', e.target.value);
    if (typeof window.renderWishlist === 'function') window.renderWishlist();
  });

  document.getElementById('import-farm-btn')?.addEventListener('click', handleFarmSync);

  document.getElementById('donate-btn')?.addEventListener('click', async () => {
    const donationAddress = "0xE32d234D63998F5078de9A7E2303233699276642";
    const donateBtn = document.getElementById('donate-btn');

    try {
      await navigator.clipboard.writeText(donationAddress);
      const originalText = donateBtn.textContent;
      donateBtn.textContent = "Copied!";
      donateBtn.classList.add('text-green-400');

      setTimeout(() => {
        donateBtn.textContent = originalText;
        donateBtn.classList.remove('text-green-400');
      }, 2000);
    } catch (err) {
      prompt("Copy your donation address below:", donationAddress);
    }
  });
}

export function loadPrices() {
  const backend = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
  fetch(`${backend}/api/get-data`)
    .then(res => res.json())
    .then(rawData => {
      if (rawData && typeof rawData === 'object') {
        delete rawData.updated_text;
        delete rawData.updatedText;
        delete rawData.updated_at;
        delete rawData.updatedAt;
      }
      window.allPrices = extractPrices(rawData);
    })
    .catch(() => console.warn("Using default fallback prices."));
}

export function extractPrices(data) {
  let pricesMap = {};
  if (!data || typeof data !== 'object') return pricesMap;

  const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

  function searchObj(obj, prefix = '') {
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      let lowerKey = key.toLowerCase().trim();
      if (GLOBAL_EXCLUDES.includes(lowerKey)) continue;
      if (lowerKey.includes('updated')) continue;
      if (typeof window.isExcludedItem === 'function' && window.isExcludedItem(key)) continue;

      let val = obj[key];

      if (typeof val === 'number') {
        pricesMap[prefix + key] = val;
      } else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
        pricesMap[prefix + key] = parseFloat(val);
      } else if (val && typeof val === 'object') {
        let p = val.price ?? val.sfl ?? val.sflPrice ?? val.flowerPrice ?? val.unitPrice;
        if (p !== undefined && p !== null) {
          pricesMap[prefix + key] = parseFloat(p) || 0;
        } else {
          let newPrefix = key.length <= 4 ? `[${key.toUpperCase()}] ` : '';
          searchObj(val, newPrefix);
        }
      }
    }
  }

  searchObj(data);
  return pricesMap;
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
      syncBtn.textContent = '🔄 Sync Inventory Now';
    }
  }, 1000);
}

async function handleFarmSync() {
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');
  const status = document.getElementById('sync-status');

  const farmId = farmIdEl ? farmIdEl.value.trim() : '';
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';

  if (!farmId) {
    if (status) status.textContent = '❌ Please enter a Farm ID.';
    return;
  }

  if (status) status.textContent = '⏳ Fetching farm data...';
  
  window.syncCount++;
  if (window.syncCount >= 2) {
    startSyncCooldown();
  }

  try {
    const backend = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
    const url = `${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error ${response.status}`);
    }

    const farmObj = data.farm?.farm || data.farm?.data || data.farm || data;
    window.farmInventoryData = farmObj?.inventory || {};

    let totalItemsCount = Object.keys(window.farmInventoryData).length;

    if (totalItemsCount > 0) {
      if (status) status.textContent = `✅ Synced ${totalItemsCount} item types from Farm #${farmId}!`;
    } else {
      if (status) status.textContent = `⚠️ Connected, but no inventory found on farm.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}
