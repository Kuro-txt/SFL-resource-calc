import { FLOWER_IMG_SMALL_HTML, COIN_ICON } from '../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, roundUpToTwoDecimals } from '../utils/formatters.js';

let cropBaseYields = JSON.parse(localStorage.getItem('sfl_crop_base_yields') || '{}');
let activeHarvestDiffs = [];

export function renderCropTrackerTemplate() {
  const container = document.getElementById('crop-tracker-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>🌱</span> Crop Activity Tracker (farmActivity)
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Compares 22:00 UTC vs 00:00 UTC crop harvest events. Total Yield = Harvests × Base Yield.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button id="refresh-crop-activity-btn" class="bg-sfl-wood text-amber-200 px-3 py-2 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1.5">
            🔄 Check Live Today
          </button>
          <button id="save-base-yields-btn" class="bg-sfl-green text-white px-3 py-2 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-green-700 transition cursor-pointer flex items-center gap-1.5">
            💾 Save Multipliers
          </button>
        </div>
      </div>

      <!-- TODAY'S HARVEST TABLE -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-sm">
        <div class="bg-sfl-wood text-amber-200 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-sfl-dirt flex justify-between items-center">
          <span>🌾 Today's Harvest Yield & Profit</span>
          <span id="crop-tracker-status" class="text-[11px] text-amber-300 font-mono">0 Harvests Active</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
              <tr>
                <th class="px-3 py-2.5">Crop</th>
                <th class="px-2 py-2.5">Harvest Cycles</th>
                <th class="px-2 py-2.5 w-24">Base Yield</th>
                <th class="px-2 py-2.5">Est. Harvested Qty</th>
                <th class="px-2 py-2.5">Unit Price</th>
                <th class="px-3 py-2.5">Net Flowers (10% Tax)</th>
                <th class="px-3 py-2.5">Coins Value</th>
              </tr>
            </thead>
            <tbody id="crop-tracker-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">
                  Click 'Check Live Today' or wait for 22:00 UTC cloud sync.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PROFIT SUMMARY CARDS -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-4 shadow-inner">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Total Harvest Cycles</span>
            <h2 id="summary-total-cycles" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-dirt mt-0.5">0</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Net Flower Earnings</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green mt-0.5 flex items-center justify-center gap-1">
              <span id="summary-total-flowers">0.000</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Estimated Coin Value</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-amber-600 mt-0.5 flex items-center justify-center gap-1">
              <span id="summary-total-coins">0.00</span>
              <img src="./assets/coins.webp" class="w-5 h-5 sfl-icon" alt="Coins">
            </h2>
          </div>
        </div>
      </div>

    </div>
  `;
}

export function initCropTrackerPanel() {
  renderCropTrackerTemplate();

  document.getElementById('refresh-crop-activity-btn')?.addEventListener('click', fetchLiveCropDiff);
  document.getElementById('save-base-yields-btn')?.addEventListener('click', saveBaseYieldSettings);

  loadCloudBaseYields();
}

export async function loadCloudBaseYields() {
  const client = window.supabaseClient;
  const user = window.currentUser;

  if (client && user) {
    const { data } = await client.from('profiles').select('crop_base_yields').eq('id', user.id).maybeSingle();
    if (data?.crop_base_yields) {
      cropBaseYields = data.crop_base_yields;
      localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
    }
  }
}

export async function saveBaseYieldSettings() {
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));

  const client = window.supabaseClient;
  const user = window.currentUser;

  if (client && user) {
    await client.from('profiles').upsert({
      id: user.id,
      crop_base_yields: cropBaseYields
    }, { onConflict: 'id' });
  }

  alert("✅ Base Yield Multipliers saved successfully!");
  renderCropTrackerRows();
}

export async function fetchLiveCropDiff() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const statusEl = document.getElementById('crop-tracker-status');

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Fetching live farm activity...";

  try {
    const client = window.supabaseClient;
    const user = window.currentUser;
    const todayDate = new Date().toISOString().split('T')[0];
    let baselineActivity = {};

    if (client && user) {
      const { data } = await client
        .from('preharvest_baselines')
        .select('farm_activity')
        .eq('user_id', user.id)
        .eq('snapshot_date', todayDate)
        .maybeSingle();

      if (data?.farm_activity) baselineActivity = data.farm_activity;
    }

    const backend = window.BACKEND_URL || '';
    const res = await fetch(`${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}`);
    const data = await res.json();
    const currentActivity = data.farm?.farmActivity || {};

    activeHarvestDiffs = [];

    for (let key in currentActivity) {
      if (key.toLowerCase().includes('harvested')) {
        let cropName = key.replace(/harvested/i, '').trim();
        let cleanCropKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');

        let startCount = parseFloat(baselineActivity[key] || 0);
        let endCount = parseFloat(currentActivity[key] || 0);
        let harvestCycles = endCount - startCount;

        if (harvestCycles > 0) {
          activeHarvestDiffs.push({
            crop: cropName,
            cleanKey: cleanCropKey,
            harvestCount: harvestCycles
          });
        }
      }
    }

    renderCropTrackerRows();
    if (statusEl) statusEl.textContent = `✅ ${activeHarvestDiffs.length} Active Crops Tracked`;
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ ${err.message}`;
  }
}

function getItemFlowerPrice(cleanKey) {
  if (window.allPrices) {
    let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      let rawPrice = parseFloat(window.allPrices[matchedKey]) || 0;
      return rawPrice > 100 ? rawPrice / 1000 : rawPrice;
    }
  }
  return 0;
}

export function updateCropBaseYield(cleanKey, value) {
  const val = parseFloat(value) || 1.0;
  cropBaseYields[cleanKey] = val;
  renderCropTrackerRows();
}

window.updateCropBaseYield = updateCropBaseYield;

export function renderCropTrackerRows() {
  const tbody = document.getElementById('crop-tracker-body');
  if (!tbody) return;

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0.10;
  const coinRatio = parseFloat(document.getElementById('coin-ratio')?.value) || 1000;

  if (activeHarvestDiffs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">No crop harvests detected yet today compared to 00:00 UTC.</td></tr>`;
    updateCropTrackerTotals(0, 0, 0);
    return;
  }

  tbody.innerHTML = '';
  let grandCycles = 0;
  let grandFlowers = 0;
  let grandCoins = 0;

  activeHarvestDiffs.forEach(entry => {
    const baseYield = cropBaseYields[entry.cleanKey] !== undefined ? cropBaseYields[entry.cleanKey] : 1.0;
    const totalHarvested = roundUpToOneDecimal(entry.harvestCount * baseYield);
    const unitPrice = getItemFlowerPrice(entry.cleanKey);
    const grossFlowers = unitPrice * totalHarvested;
    const netFlowers = roundUpToThreeDecimals(grossFlowers * (1 - taxRate));
    const netCoins = roundUpToTwoDecimals(netFlowers * coinRatio);

    grandCycles += entry.harvestCount;
    grandFlowers += netFlowers;
    grandCoins += netCoins;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold text-sfl-dirt">${entry.crop}</td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">+${entry.harvestCount}</td>
      <td class="px-2 py-2.5 font-mono">
        <input type="number" step="0.1" min="0.1" value="${baseYield}" 
          onchange="updateCropBaseYield('${entry.cleanKey}', this.value)"
          class="w-16 sfl-input rounded px-1.5 py-0.5 text-xs font-bold text-center text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
      </td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-green">${totalHarvested.toFixed(1)}</td>
      <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-3 py-2.5 font-mono font-bold text-sfl-green">${netFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-3 py-2.5 font-mono font-bold text-amber-600">${netCoins.toFixed(2)} 🪙</td>
    `;
    tbody.appendChild(tr);
  });

  updateCropTrackerTotals(grandCycles, grandFlowers, grandCoins);
}

function updateCropTrackerTotals(cycles, flowers, coins) {
  const cyclesEl = document.getElementById('summary-total-cycles');
  const flowersEl = document.getElementById('summary-total-flowers');
  const coinsEl = document.getElementById('summary-total-coins');

  if (cyclesEl) cyclesEl.textContent = cycles;
  if (flowersEl) flowersEl.textContent = flowers.toFixed(3);
  if (coinsEl) coinsEl.textContent = coins.toFixed(2);
}
