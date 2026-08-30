import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML, SFL_PLOT_CROPS } from '../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, getBettyUnitPrice, formatDateYYYYMMDD } from '../utils/formatters.js';
import { ApiService } from '../services/api.js';

let cropBaseYields = JSON.parse(localStorage.getItem('sfl_crop_base_yields') || '{}');
let globalAvgYield = parseFloat(localStorage.getItem('sfl_global_avg_yield') || '1.0');
let activeHarvestDiffs = [];
let hasBaselineForToday = false;
let isInitialCheckDone = false;
let currentCropWeekOffset = 0;
let cloudSaveTimer = null;

export function renderCropTrackerTemplate() {
  const container = document.getElementById('crop-tracker-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>🌱</span> Crop Tracker v1
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            shows number of harvest, please input your estimated yeild per plot
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- AUTO-FILL YIELDS FROM SFL.WORLD LAND API -->
          <button id="autofill-land-yields-btn" title="Auto-fill exact live average plot yields from sfl.world Land API" class="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5">
            <span>⚡</span> Auto-Fill Land Yields
          </button>

          <!-- QUICK APPLY AVG YIELD PILL -->
          <div class="flex items-center gap-1.5 bg-amber-900/10 dark:bg-amber-950/40 border border-amber-600/30 dark:border-amber-700/50 px-2.5 py-1 rounded-lg shadow-xs">
            <span class="text-[10px] font-bold text-sfl-wood dark:text-amber-300 whitespace-nowrap">Avg Yield / Plot:</span>
            <input type="number" id="global-avg-yield-input" value="${globalAvgYield}" min="0.1" step="0.05" class="w-14 sfl-input rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center text-sfl-dirt">
            <button id="apply-global-yield-btn" title="Apply to all active crops" class="bg-sfl-wood text-amber-100 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-sfl-dirt transition cursor-pointer shadow-xs">
              Set All
            </button>
          </div>

          <button id="open-crop-weekly-btn" class="bg-amber-500 hover:bg-amber-400 text-amber-950 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-amber-100 font-black px-3 py-1.5 rounded-lg text-xs border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5">
            <span>📊</span> Weekly Summary
          </button>
          <button id="refresh-crop-activity-btn" class="bg-sfl-wood text-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1 shadow-xs">
            🔄 Check Live Today
          </button>
          <button id="save-base-yields-btn" class="bg-sfl-green text-white px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-green-700 transition cursor-pointer flex items-center gap-1 shadow-sm">
            💾 Save Multipliers
          </button>
        </div>
      </div>

      <!-- TODAY'S HARVEST TABLE -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-sm">
        <div class="bg-sfl-wood text-amber-200 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-sfl-dirt flex justify-between items-center">
          <span>🌾 Today's Harvest Yield & Profit</span>
          <span id="crop-tracker-status" class="text-[11px] text-amber-300 font-mono">Checking Baseline...</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
              <tr>
                <th class="px-3 py-2.5">Crop</th>
                <th class="px-2 py-2.5">Plots Harvested</th>
                <th class="px-2 py-2.5 w-28">Avg Yield / Plot</th>
                <th class="px-2 py-2.5">Est. Harvested Qty</th>
                <th class="px-2 py-2.5">Unit Price</th>
                <th class="px-2.5 py-2.5 text-sfl-accent">Tax Deducted</th>
                <th class="px-3 py-2.5 text-sfl-green">Net Flowers</th>
              </tr>
            </thead>
            <tbody id="crop-tracker-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">
                  Click 'Check Live Today' or sign in to verify today's 00:00 UTC baseline.
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
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Total Plots Harvested</span>
            <h2 id="summary-total-cycles" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-dirt mt-0.5">0</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-accent block">Total Tax Deducted</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-accent mt-0.5 flex items-center justify-center gap-1">
              <span id="summary-total-tax">-0.000</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Net Flower Earnings</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green mt-0.5 flex items-center justify-center gap-1">
              <span id="summary-total-flowers">0.000</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
            <span id="summary-total-gross" class="text-[10px] text-sfl-woodLight font-mono block mt-0.5">Gross: 0.000 Flowers</span>
          </div>
        </div>
      </div>

    </div>

    <!-- CROP TRACKER WEEKLY SUMMARY MODAL (SINGLE UNIFIED SCROLLBAR) -->
    <div id="crop-weekly-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
        
        <div class="flex justify-between items-center border-b-2 border-sfl-cardBorder pb-3">
          <div>
            <h3 class="text-lg font-black text-sfl-dirt flex items-center gap-2">
              <span>🗓️</span> Crop Weekly Harvest Report
            </h3>
            <p id="crop-weekly-date-range" class="text-xs font-bold text-sfl-wood font-mono mt-0.5">
              Calculating dates...
            </p>
          </div>
          <button id="close-crop-weekly-modal-btn" class="text-sfl-accent hover:text-red-700 font-black text-lg p-1 cursor-pointer">✕</button>
        </div>

        <div class="flex justify-between items-center bg-amber-100/80 p-2 rounded-lg border border-amber-300 text-xs font-bold">
          <button id="prev-crop-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer">
            ◀ Previous Week
          </button>
          <span id="crop-week-label-badge" class="text-sfl-dirt font-black">Current Week</span>
          <button id="next-crop-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Next Week ▶
          </button>
        </div>

        <!-- WEEKLY MODAL GLOBAL YIELD ADJUSTER -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-900/10 dark:bg-amber-950/40 border border-amber-600/30 dark:border-amber-700/50 p-2.5 rounded-xl shadow-xs text-xs font-bold">
          <span class="text-sfl-wood dark:text-amber-300 flex items-center gap-1.5">
            <span>⚙️</span> Set All Weekly Avg Yields:
          </span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button id="autofill-weekly-land-yields-btn" title="Auto-fill exact live average plot yields from sfl.world Land API" class="bg-amber-600 hover:bg-amber-500 text-white font-black px-2.5 py-1 rounded text-[10px] shadow-xs cursor-pointer flex items-center gap-1">
              <span>⚡</span> Auto-Fill Land Yields
            </button>
            <input type="number" id="weekly-global-avg-yield-input" value="${globalAvgYield}" min="0.1" step="0.05" class="w-16 sfl-input rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center text-sfl-dirt">
            <button id="apply-weekly-global-yield-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-sfl-dirt transition cursor-pointer shadow-xs">
              Apply All
            </button>
          </div>
        </div>

        <!-- MAIN SCROLLABLE CONTENT BODY (ONLY ONE SCROLLBAR) -->
        <div class="overflow-y-auto flex-1 pr-1.5 space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-amber-100/90 border-2 border-sfl-gold/60 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">Harvested Plots</span>
              <span id="crop-weekly-total-cycles" class="text-lg font-extrabold text-sfl-wood font-mono">0</span>
            </div>
            <div class="bg-amber-100/90 border-2 border-sfl-gold/60 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">Total Produced</span>
              <span id="crop-weekly-total-qty" class="text-lg font-extrabold text-sfl-wood font-mono">0.0</span>
            </div>
            <div class="bg-green-100/90 border-2 border-sfl-green/50 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-green uppercase tracking-wider block mb-0.5">Net Flowers</span>
              <span id="crop-weekly-total-flowers" class="text-lg font-extrabold text-sfl-green font-mono">0.000 ${FLOWER_IMG_HTML}</span>
            </div>
          </div>

          <!-- SUMMARY TAX DEDUCTION BREAKDOWN BAR -->
          <div id="crop-weekly-tax-bar" class="bg-amber-100/70 border border-amber-300/80 px-3 py-1.5 rounded-lg flex justify-between items-center text-[11px] font-mono text-sfl-wood">
            <span>Gross: <strong id="crop-weekly-gross-val" class="text-sfl-dirt">0.000 Flowers</strong></span>
            <span class="text-sfl-accent font-bold">Tax (-): <span id="crop-weekly-tax-val">0.000 Flowers</span></span>
            <span class="text-sfl-green font-extrabold">Net: <span id="crop-weekly-net-val">0.000 Flowers</span></span>
          </div>

          <!-- DAY-BY-DAY HARVEST SECTION CONTAINER (FLOWS NATURALLY WITHOUT INNER SCROLLBAR) -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-sfl-dirt uppercase tracking-wider border-b border-amber-200/60 pb-1 flex justify-between items-center">
              <span>📅 Day-by-Day Harvest Log</span>
              <span class="text-[10px] text-sfl-woodLight font-mono">Plots / Yield / Net Flowers</span>
            </h4>
            <div id="crop-weekly-breakdown" class="space-y-3.5 text-xs"></div>
          </div>
        </div>

        <div class="pt-3 border-t border-sfl-cardBorder flex justify-end">
          <button id="close-crop-weekly-modal-footer-btn" class="bg-sfl-wood text-amber-100 font-bold px-4 py-1.5 rounded-lg hover:bg-sfl-dirt transition text-xs cursor-pointer shadow-xs">
            Close Report
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initCropTrackerPanel() {
  renderCropTrackerTemplate();

  document.getElementById('refresh-crop-activity-btn')?.addEventListener('click', fetchLiveCropDiff);
  document.getElementById('save-base-yields-btn')?.addEventListener('click', () => saveBaseYieldSettings(true));
  document.getElementById('apply-global-yield-btn')?.addEventListener('click', applyGlobalYieldToAll);
  document.getElementById('apply-weekly-global-yield-btn')?.addEventListener('click', applyWeeklyGlobalYieldToAll);
  document.getElementById('autofill-land-yields-btn')?.addEventListener('click', () => fetchAndApplyLandYields(true));
  document.getElementById('autofill-weekly-land-yields-btn')?.addEventListener('click', () => fetchAndApplyLandYields(true));

  const globalYieldInput = document.getElementById('global-avg-yield-input');
  globalYieldInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 1.0;
    globalAvgYield = val;
    localStorage.setItem('sfl_global_avg_yield', val.toString());
    cropBaseYields['_global'] = val;
    syncWeeklyGlobalInput(val);
    debouncedCloudSave();
  });

  const weeklyGlobalInput = document.getElementById('weekly-global-avg-yield-input');
  weeklyGlobalInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 1.0;
    globalAvgYield = val;
    localStorage.setItem('sfl_global_avg_yield', val.toString());
    cropBaseYields['_global'] = val;
    syncMainGlobalInput(val);
    debouncedCloudSave();
  });

  const modal = document.getElementById('crop-weekly-modal');
  const openBtn = document.getElementById('open-crop-weekly-btn');
  const closeBtn = document.getElementById('close-crop-weekly-modal-btn');
  const closeFooterBtn = document.getElementById('close-crop-weekly-modal-footer-btn');
  const prevBtn = document.getElementById('prev-crop-week-btn');
  const nextBtn = document.getElementById('next-crop-week-btn');

  openBtn?.addEventListener('click', () => {
    currentCropWeekOffset = 0;
    renderCropWeeklySummary();
    modal?.classList.remove('hidden');
  });

  const closeModal = () => modal?.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);

  prevBtn?.addEventListener('click', () => {
    currentCropWeekOffset--;
    renderCropWeeklySummary();
  });

  nextBtn?.addEventListener('click', () => {
    if (currentCropWeekOffset < 0) {
      currentCropWeekOffset++;
      renderCropWeeklySummary();
    }
  });

  loadCloudBaseYields();
}

export async function fetchAndApplyLandYields(showAlert = false) {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const statusEl = document.getElementById('crop-tracker-status');

  if (!farmId) {
    if (showAlert) alert("⚠️ Please enter your Farm ID at the top first!");
    return false;
  }

  if (statusEl) statusEl.textContent = "⚡ Fetching live land yields from SFL.world...";

  try {
    const liveLandYields = await ApiService.getLandYields(farmId);
    if (!liveLandYields || Object.keys(liveLandYields).length === 0) {
      if (statusEl) statusEl.textContent = "⚠️ Could not retrieve SFL.world yields";
      if (showAlert) alert(`⚠️ Could not load land yields from sfl.world for Farm #${farmId}`);
      return false;
    }

    let count = 0;
    for (const [cleanKey, avgVal] of Object.entries(liveLandYields)) {
      if (avgVal > 0) {
        cropBaseYields[cleanKey] = avgVal;
        count++;
      }
    }

    localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
    await saveBaseYieldSettings(false);
    renderCropTrackerRows();
    renderCropWeeklySummary();

    if (statusEl) statusEl.textContent = `⚡ Auto-filled ${count} crop yields from SFL.world!`;
    if (showAlert) alert(`✅ Successfully loaded ${count} live average crop & greenhouse yields from SFL.world for Farm #${farmId}!`);
    return true;
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ Land Yields Error: ${err.message}`;
    if (showAlert) alert(`❌ Error fetching land yields: ${err.message}`);
    return false;
  }
}

function syncMainGlobalInput(val) {
  const el = document.getElementById('global-avg-yield-input');
  if (el) el.value = val;
}

function syncWeeklyGlobalInput(val) {
  const el = document.getElementById('weekly-global-avg-yield-input');
  if (el) el.value = val;
}

export async function loadCloudBaseYields() {
  const client = window.supabaseClient;
  const user = window.currentUser;

  try {
    const localSaved = localStorage.getItem('sfl_crop_base_yields');
    if (localSaved) {
      cropBaseYields = JSON.parse(localSaved) || {};
      if (cropBaseYields['_global'] !== undefined) {
        globalAvgYield = parseFloat(cropBaseYields['_global']) || 1.0;
        syncMainGlobalInput(globalAvgYield);
        syncWeeklyGlobalInput(globalAvgYield);
      }
    }
  } catch (e) {}

  if (client && user) {
    try {
      const { data } = await client.from('profiles').select('crop_base_yields').eq('id', user.id).maybeSingle();
      if (data?.crop_base_yields) {
        cropBaseYields = data.crop_base_yields;
        localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));

        if (cropBaseYields['_global'] !== undefined) {
          globalAvgYield = parseFloat(cropBaseYields['_global']) || 1.0;
          localStorage.setItem('sfl_global_avg_yield', globalAvgYield.toString());
          syncMainGlobalInput(globalAvgYield);
          syncWeeklyGlobalInput(globalAvgYield);
        }
        renderCropTrackerRows();
      }
    } catch (err) {
      console.warn("Could not load cloud crop multipliers:", err.message);
    }
  }
}

function debouncedCloudSave() {
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveBaseYieldSettings(false);
  }, 1000);
}

export function applyGlobalYieldToAll() {
  const inputEl = document.getElementById('global-avg-yield-input');
  const val = parseFloat(inputEl?.value) || 1.0;
  globalAvgYield = val;
  localStorage.setItem('sfl_global_avg_yield', val.toString());
  cropBaseYields['_global'] = val;
  syncWeeklyGlobalInput(val);

  if (activeHarvestDiffs.length > 0) {
    activeHarvestDiffs.forEach(entry => {
      cropBaseYields[entry.cleanKey] = val;
    });
  }

  saveBaseYieldSettings(false);
  renderCropTrackerRows();
}

export function applyWeeklyGlobalYieldToAll() {
  const inputEl = document.getElementById('weekly-global-avg-yield-input');
  const val = parseFloat(inputEl?.value) || 1.0;
  globalAvgYield = val;
  localStorage.setItem('sfl_global_avg_yield', val.toString());
  cropBaseYields['_global'] = val;
  syncMainGlobalInput(val);

  SFL_PLOT_CROPS.forEach(cropKey => {
    cropBaseYields[cropKey] = val;
  });

  saveBaseYieldSettings(false);
  renderCropTrackerRows();
  renderCropWeeklySummary();
}

export async function saveBaseYieldSettings(showAlert = false) {
  cropBaseYields['_global'] = globalAvgYield;
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
  localStorage.setItem('sfl_global_avg_yield', globalAvgYield.toString());

  const client = window.supabaseClient;
  const user = window.currentUser;

  if (client && user) {
    try {
      await client.from('profiles').upsert({
        id: user.id,
        crop_base_yields: cropBaseYields
      }, { onConflict: 'id' });
      if (showAlert) alert("✅ Avg Yield per Plot multipliers saved to cloud and local storage!");
    } catch (err) {
      if (showAlert) alert("⚠️ Saved locally, but failed to reach Supabase: " + err.message);
    }
  } else if (showAlert) {
    alert("✅ Avg Yield per Plot settings saved locally!");
  }

  renderCropTrackerRows();
}

export async function fetchLiveCropDiff() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const statusEl = document.getElementById('crop-tracker-status');
  const client = window.supabaseClient;
  const user = window.currentUser;
  const todayDate = new Date().toISOString().split('T')[0];

  isInitialCheckDone = true;

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Verifying 00:00 UTC baseline...";

  try {
    let baselineActivity = null;

    if (client && user) {
      const { data } = await client
        .from('preharvest_baselines')
        .select('farm_activity')
        .eq('user_id', user.id)
        .eq('snapshot_date', todayDate)
        .maybeSingle();

      if (data?.farm_activity && Object.keys(data.farm_activity).length > 0) {
        baselineActivity = data.farm_activity;
      }
    }

    if (!baselineActivity) {
      hasBaselineForToday = false;
      activeHarvestDiffs = [];
      renderCropTrackerRows();
      if (statusEl) statusEl.textContent = "⚠️ Baseline Missing";
      return;
    }

    hasBaselineForToday = true;
    if (statusEl) statusEl.textContent = "⏳ Fetching live farm activity...";

    const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
    const backend = window.BACKEND_URL || '';
    const res = await fetch(`${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    const farmObj = data.farm?.farm || data.farm || {};
    const currentActivity = farmObj.farmActivity || farmObj.activity || {};

    activeHarvestDiffs = [];

    for (let key in currentActivity) {
      if (key.toLowerCase().includes('harvested')) {
        let cropName = key.replace(/harvested/i, '').trim();
        let cleanCropKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!SFL_PLOT_CROPS.has(cleanCropKey)) continue;

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

    // If base yields have not been populated yet, auto-fetch from SFL.world Land API
    const customYieldsCount = Object.keys(cropBaseYields).filter(k => k !== '_global').length;
    if (customYieldsCount === 0) {
      await fetchAndApplyLandYields(false);
    } else {
      renderCropTrackerRows();
    }

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
      if (rawPrice > 0) return rawPrice > 100 ? rawPrice / 1000 : rawPrice;
    }
  }

  let bettyPrice = getBettyUnitPrice(cleanKey);
  if (bettyPrice !== null && bettyPrice > 0) {
    return bettyPrice;
  }

  return 0;
}

export function updateCropBaseYield(cleanKey, value) {
  const val = parseFloat(value) || globalAvgYield || 1.0;
  cropBaseYields[cleanKey] = val;
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
  debouncedCloudSave();
  renderCropTrackerRows();
}

export async function updateDailyCropHistoricalYield(dateStr, cleanCropKey, value) {
  const newYield = parseFloat(value) || 1.0;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) { history = []; }

  const entryIndex = history.findIndex(entry => {
    const d = (entry.date || entry.yield_date || '').split('T')[0];
    return d === dateStr;
  });

  if (entryIndex !== -1) {
    const entry = history[entryIndex];
    const cropList = entry.cropActivityYields || entry.crop_activity_yields || [];
    const savedTax = localStorage.getItem('sfl_tax_rate');
    const taxSelectEl = document.getElementById('tax-select');
    const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

    cropList.forEach(cropItem => {
      const rawName = cropItem.crop || cropItem.name || '';
      if (normalizeItemKey(rawName) === cleanCropKey) {
        cropItem.baseYield = newYield;
        cropItem.base_yield = newYield;
        const cycles = parseFloat(cropItem.harvestCount || cropItem.harvest_count || 0);
        const totalProduced = roundUpToOneDecimal(cycles * newYield);
        cropItem.totalProduced = totalProduced;
        cropItem.total_produced = totalProduced;

        const unitPrice = getItemFlowerPrice(cleanCropKey);
        cropItem.unitPrice = unitPrice;
        const grossTotal = unitPrice * totalProduced;
        const taxAmount = grossTotal * taxRate;
        cropItem.netFlowers = roundUpToThreeDecimals(grossTotal - taxAmount);
        cropItem.net_flowers = cropItem.netFlowers;
      }
    });

    entry.cropActivityYields = cropList;
    entry.crop_activity_yields = cropList;
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(history));

    const client = window.supabaseClient;
    const user = window.currentUser;
    if (client && user) {
      try {
        await client.from('daily_yields').upsert({
          user_id: user.id,
          yield_date: dateStr,
          crop_activity_yields: cropList
        }, { onConflict: 'user_id,yield_date' });
      } catch (err) {
        console.warn("Could not sync updated day yield to Supabase:", err.message);
      }
    }
  }

  renderCropWeeklySummary();
}

window.updateCropBaseYield = updateCropBaseYield;
window.updateDailyCropHistoricalYield = updateDailyCropHistoricalYield;

export function renderCropTrackerRows() {
  const tbody = document.getElementById('crop-tracker-body');
  if (!tbody) return;

  const savedTax = localStorage.getItem('sfl_tax_rate');
  const taxSelectEl = document.getElementById('tax-select');
  const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

  if (isInitialCheckDone && !hasBaselineForToday) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-sfl-dirt space-y-2">
          <div class="inline-block px-3 py-1 bg-amber-100 border-2 border-amber-400 rounded-lg text-amber-900 font-bold text-xs shadow-sm">
            🚩 00:00 UTC Baseline Not Found For Today
          </div>
          <p class="text-xs text-sfl-woodLight max-w-md mx-auto mt-2">
            Crop Tracker v1 compares harvest counts against your saved <strong>00:00 UTC snapshot</strong>. Yields and profit calculations will show here once today's baseline is logged.
          </p>
        </td>
      </tr>
    `;
    updateCropTrackerTotals(0, 0, 0, 0);
    return;
  }

  if (activeHarvestDiffs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">No crop harvests detected yet today compared to 00:00 UTC baseline.</td></tr>`;
    updateCropTrackerTotals(0, 0, 0, 0);
    return;
  }

  tbody.innerHTML = '';
  let grandCycles = 0;
  let grandGross = 0;
  let grandTax = 0;
  let grandFlowers = 0;

  activeHarvestDiffs.forEach(entry => {
    const baseYield = cropBaseYields[entry.cleanKey] !== undefined ? cropBaseYields[entry.cleanKey] : globalAvgYield;
    const totalHarvested = roundUpToOneDecimal(entry.harvestCount * baseYield);
    const unitPrice = getItemFlowerPrice(entry.cleanKey);
    const grossFlowers = unitPrice * totalHarvested;
    const taxDeduction = grossFlowers * taxRate;
    const netFlowers = roundUpToThreeDecimals(grossFlowers - taxDeduction);

    grandCycles += entry.harvestCount;
    grandGross += grossFlowers;
    grandTax += taxDeduction;
    grandFlowers += netFlowers;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold text-sfl-dirt">${entry.crop}</td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">+${entry.harvestCount} plots</td>
      <td class="px-2 py-2.5 font-mono">
        <input type="number" step="0.05" min="0.1" value="${baseYield}" 
          onchange="updateCropBaseYield('${entry.cleanKey}', this.value)"
          class="w-20 sfl-input rounded px-2 py-0.5 text-xs font-bold text-center text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
      </td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-green">${totalHarvested.toFixed(1)}</td>
      <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-2.5 py-2.5 font-mono font-bold text-sfl-accent">-${taxDeduction.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-3 py-2.5 font-mono font-bold text-sfl-green">${netFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
    `;
    tbody.appendChild(tr);
  });

  updateCropTrackerTotals(grandCycles, grandGross, grandTax, grandFlowers);
}

function updateCropTrackerTotals(cycles, gross, tax, flowers) {
  const cyclesEl = document.getElementById('summary-total-cycles');
  const taxEl = document.getElementById('summary-total-tax');
  const flowersEl = document.getElementById('summary-total-flowers');
  const grossEl = document.getElementById('summary-total-gross');

  if (cyclesEl) cyclesEl.textContent = cycles;
  if (taxEl) taxEl.textContent = `-${tax.toFixed(3)}`;
  if (flowersEl) flowersEl.textContent = flowers.toFixed(3);
  if (grossEl) grossEl.textContent = `Gross: ${gross.toFixed(3)} Flowers`;
}

// -------------------------------------------------------------
// WEEKLY SUMMARY REPORT (CROP TRACKER V1 - DAY BY DAY VIEW)
// -------------------------------------------------------------

function getCropWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? 6 : day - 1);

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday + (offset * 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    mondayDate: monday,
    sundayDate: sunday,
    mondayStr: formatDateYYYYMMDD(monday),
    sundayStr: formatDateYYYYMMDD(sunday)
  };
}

export function renderCropWeeklySummary() {
  const { mondayStr, sundayStr, mondayDate, sundayDate } = getCropWeekRange(currentCropWeekOffset);

  const dateRangeEl = document.getElementById('crop-weekly-date-range');
  const weekLabelEl = document.getElementById('crop-week-label-badge');
  const nextBtn = document.getElementById('next-crop-week-btn');

  if (dateRangeEl) {
    const monFmt = mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const sunFmt = sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    dateRangeEl.textContent = `📅 ${monFmt} – ${sunFmt}`;
  }

  if (weekLabelEl) {
    if (currentCropWeekOffset === 0) weekLabelEl.textContent = 'Current Week';
    else if (currentCropWeekOffset === -1) weekLabelEl.textContent = 'Last Week';
    else weekLabelEl.textContent = `${Math.abs(currentCropWeekOffset)} Weeks Ago`;
  }

  if (nextBtn) nextBtn.disabled = currentCropWeekOffset >= 0;

  const savedTax = localStorage.getItem('sfl_tax_rate');
  const taxSelectEl = document.getElementById('tax-select');
  const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) {}

  let totalCycles = 0;
  let totalQty = 0;
  let grandGrossFlowers = 0;
  let grandNetFlowers = 0;

  // Group logs strictly by day/date without collapsing crops across days
  let dailyHarvestMap = {};

  history.forEach(entry => {
    let rawDate = entry.date || entry.yield_date || '';
    let cleanDate = rawDate.split('T')[0];

    if (cleanDate >= mondayStr && cleanDate <= sundayStr) {
      let cropList = entry.cropActivityYields || entry.crop_activity_yields || [];
      if (!Array.isArray(cropList) || cropList.length === 0) return;

      let validCrops = cropList.filter(item => {
        let rawCropName = item.crop || item.name || 'Crop';
        return SFL_PLOT_CROPS.has(normalizeItemKey(rawCropName));
      });

      if (validCrops.length > 0) {
        if (!dailyHarvestMap[cleanDate]) {
          dailyHarvestMap[cleanDate] = [];
        }
        dailyHarvestMap[cleanDate].push(...validCrops);
      }
    }
  });

  const breakdownEl = document.getElementById('crop-weekly-breakdown');
  const cyclesEl = document.getElementById('crop-weekly-total-cycles');
  const qtyEl = document.getElementById('crop-weekly-total-qty');
  const flowersEl = document.getElementById('crop-weekly-total-flowers');
  const grossValEl = document.getElementById('crop-weekly-gross-val');
  const taxValEl = document.getElementById('crop-weekly-tax-val');
  const netValEl = document.getElementById('crop-weekly-net-val');

  const sortedDates = Object.keys(dailyHarvestMap).sort().reverse();

  if (sortedDates.length === 0) {
    if (breakdownEl) breakdownEl.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No crop activity logged for this calendar week.</div>';
    if (cyclesEl) cyclesEl.textContent = '0';
    if (qtyEl) qtyEl.textContent = '0.0';
    if (flowersEl) flowersEl.innerHTML = `0.000 ${FLOWER_IMG_HTML}`;
    if (grossValEl) grossValEl.textContent = '0.000 Flowers';
    if (taxValEl) taxValEl.textContent = `0.000 Flowers (0%)`;
    if (netValEl) netValEl.textContent = '0.000 Flowers';
    return;
  }

  let html = '';

  sortedDates.forEach(dateStr => {
    const crops = dailyHarvestMap[dateStr];
    let dateObj = new Date(dateStr + 'T00:00:00');
    let formattedDateHeader = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : dateStr;

    let dayCycles = 0;
    let dayNetFlowers = 0;
    let dayCropsHtml = '';

    crops.forEach(item => {
      let rawCropName = item.crop || item.name || 'Crop';
      let cleanCropKey = normalizeItemKey(rawCropName);
      let formattedName = cleanCropKey.charAt(0).toUpperCase() + cleanCropKey.slice(1);

      let cycles = parseFloat(item.harvestCount || item.harvest_count || 0);
      const dayBaseYield = item.baseYield !== undefined && item.baseYield !== null
        ? parseFloat(item.baseYield)
        : (item.base_yield !== undefined && item.base_yield !== null ? parseFloat(item.base_yield) : (cropBaseYields[cleanCropKey] !== undefined ? cropBaseYields[cleanCropKey] : globalAvgYield));
      const cropCalculatedQty = roundUpToOneDecimal(cycles * dayBaseYield);

      let unitPrice = getItemFlowerPrice(cleanCropKey);
      let grossTotal = unitPrice * cropCalculatedQty;
      let taxAmount = grossTotal * taxRate;
      let netFlowerVal = roundUpToThreeDecimals(grossTotal - taxAmount);

      totalCycles += cycles;
      totalQty += cropCalculatedQty;
      grandGrossFlowers += grossTotal;
      grandNetFlowers += netFlowerVal;

      dayCycles += cycles;
      dayNetFlowers += netFlowerVal;

      dayCropsHtml += `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-700/40 gap-2">
          <div class="flex flex-col">
            <span class="font-bold text-sfl-dirt text-xs flex items-center gap-1">
              <span>🌾</span> ${formattedName}
            </span>
            <span class="text-[10px] text-sfl-woodLight font-mono">Unit: ${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span class="text-sfl-wood font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/50">
              ${cycles} plots
            </span>

            <!-- CLEAN INLINE AVG YIELD PILL -->
            <div class="flex items-center gap-1.5 bg-amber-900/10 dark:bg-amber-950/40 border border-amber-600/30 dark:border-amber-700/50 px-2 py-0.5 rounded-lg shadow-xs">
              <span class="text-[10px] font-bold text-sfl-wood dark:text-amber-300 uppercase">Yield:</span>
              <input type="number" step="0.05" min="0.1" value="${dayBaseYield}"
                onchange="updateDailyCropHistoricalYield('${dateStr}', '${cleanCropKey}', this.value)"
                class="w-14 sfl-input rounded px-1.5 py-0.5 text-xs font-bold text-center text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
            </div>

            <span class="text-sfl-dirt font-extrabold text-xs">
              = ${cropCalculatedQty.toFixed(1)} qty
            </span>

            <div class="flex flex-col items-end">
              <span class="text-xs text-sfl-green font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded">
                ${netFlowerVal.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
              </span>
              <span class="text-[9px] text-sfl-accent font-mono">Tax: -${taxAmount.toFixed(3)}</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `
      <div class="bg-white/90 dark:bg-amber-950/20 border-2 border-sfl-cardBorder/70 rounded-xl overflow-hidden shadow-xs">
        <!-- DAY HEADER -->
        <div class="bg-sfl-wood text-amber-200 px-3 py-1.5 text-xs font-bold flex justify-between items-center border-b border-sfl-dirt">
          <span class="flex items-center gap-1.5">
            <span>🗓️</span> ${formattedDateHeader}
          </span>
          <span class="font-mono text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
            Day Total: ${dayNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML} (${dayCycles} plots)
          </span>
        </div>
        <!-- CROPS FOR THIS DAY -->
        <div class="p-2.5 space-y-2">
          ${dayCropsHtml}
        </div>
      </div>
    `;
  });

  const grandTaxTotal = grandGrossFlowers * taxRate;

  if (cyclesEl) cyclesEl.textContent = totalCycles;
  if (qtyEl) qtyEl.textContent = totalQty.toFixed(1);
  if (flowersEl) flowersEl.innerHTML = `${grandNetFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
  
  if (grossValEl) grossValEl.textContent = `${grandGrossFlowers.toFixed(3)} Flowers`;
  if (taxValEl) taxValEl.textContent = `${grandTaxTotal.toFixed(3)} Flowers (${(taxRate * 100).toFixed(1)}%)`;
  if (netValEl) netValEl.textContent = `${grandNetFlowers.toFixed(3)} Flowers`;

  if (breakdownEl) breakdownEl.innerHTML = html;
}

window.renderCropTrackerRows = renderCropTrackerRows;
window.renderCropWeeklySummary = renderCropWeeklySummary;
window.loadCloudBaseYields = loadCloudBaseYields;
