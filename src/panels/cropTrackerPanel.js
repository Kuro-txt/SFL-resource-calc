import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML, SFL_PLOT_CROPS } from '../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, formatDateYYYYMMDD } from '../utils/formatters.js';

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
          <!-- QUICK APPLY AVG YIELD -->
          <div class="flex items-center gap-1 bg-amber-100/90 border border-amber-300 px-2 py-1 rounded-lg">
            <span class="text-[10px] font-bold text-sfl-wood whitespace-nowrap">Avg Yield per Plot:</span>
            <input type="number" id="global-avg-yield-input" value="${globalAvgYield}" min="0.1" step="0.05" class="w-14 sfl-input rounded px-1 text-xs font-mono font-bold text-center text-sfl-dirt">
            <button id="apply-global-yield-btn" title="Apply to all active crops" class="bg-sfl-wood text-amber-100 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-sfl-dirt transition cursor-pointer">
              Set All
            </button>
          </div>

          <button id="open-crop-weekly-btn" class="bg-sfl-gold text-sfl-dirt px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-amber-400 transition cursor-pointer flex items-center gap-1 shadow-sm">
            <span>📊</span> Weekly Summary
          </button>
          <button id="refresh-crop-activity-btn" class="bg-sfl-wood text-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1">
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
                <th class="px-3 py-2.5">Net Flowers</th>
              </tr>
            </thead>
            <tbody id="crop-tracker-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="6" class="px-4 py-8 text-center text-sfl-woodLight italic">
                  Click 'Check Live Today' or sign in to verify today's 00:00 UTC baseline.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PROFIT SUMMARY CARDS -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-4 shadow-inner">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Total Plots Harvested</span>
            <h2 id="summary-total-cycles" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-dirt mt-0.5">0</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Net Flower Earnings</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green mt-0.5 flex items-center justify-center gap-1">
              <span id="summary-total-flowers">0.000</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
          </div>
        </div>
      </div>

    </div>

    <!-- CROP TRACKER WEEKLY SUMMARY MODAL -->
    <div id="crop-weekly-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
        
        <div class="flex justify-between items-center border-b-2 border-sfl-cardBorder pb-3">
          <div>
            <h3 class="text-lg font-black text-sfl-dirt flex items-center gap-2">
              <span>🗓️</span> Crop Weekly Harvest Report
            </h3>
            <p id="crop-weekly-date-range" class="text-xs font-bold text-sfl-woodLight font-mono mt-0.5">
              Mon – Sun
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

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
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

          <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl p-3 shadow-inner">
            <h4 class="text-xs font-bold text-sfl-dirt uppercase tracking-wider mb-2 border-b border-amber-200/60 pb-1 flex justify-between">
              <span>Crop</span>
              <span>Plots / Est. Qty / Net Flowers</span>
            </h4>
            <div id="crop-weekly-breakdown" class="space-y-1.5 max-h-48 overflow-y-auto text-xs"></div>
          </div>
        </div>

        <div class="pt-3 border-t border-sfl-cardBorder flex justify-end">
          <button id="close-crop-weekly-modal-footer-btn" class="bg-sfl-wood text-amber-100 font-bold px-4 py-1.5 rounded-lg hover:bg-sfl-dirt transition text-xs cursor-pointer">
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

  const globalYieldInput = document.getElementById('global-avg-yield-input');
  globalYieldInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 1.0;
    globalAvgYield = val;
    localStorage.setItem('sfl_global_avg_yield', val.toString());
    cropBaseYields['_global'] = val;
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

export async function loadCloudBaseYields() {
  const client = window.supabaseClient;
  const user = window.currentUser;

  if (client && user) {
    try {
      const { data } = await client.from('profiles').select('crop_base_yields').eq('id', user.id).maybeSingle();
      if (data?.crop_base_yields) {
        cropBaseYields = data.crop_base_yields;
        localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));

        if (cropBaseYields['_global'] !== undefined) {
          globalAvgYield = parseFloat(cropBaseYields['_global']) || 1.0;
          localStorage.setItem('sfl_global_avg_yield', globalAvgYield.toString());
          const inputEl = document.getElementById('global-avg-yield-input');
          if (inputEl) inputEl.value = globalAvgYield;
        }
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

  if (activeHarvestDiffs.length > 0) {
    activeHarvestDiffs.forEach(entry => {
      cropBaseYields[entry.cleanKey] = val;
    });
  }

  saveBaseYieldSettings(false);
  renderCropTrackerRows();
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

    const backend = window.BACKEND_URL || '';
    const res = await fetch(`${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}`);
    const data = await res.json();
    const currentActivity = data.farm?.farmActivity || {};

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
  const val = parseFloat(value) || globalAvgYield || 1.0;
  cropBaseYields[cleanKey] = val;
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
  debouncedCloudSave();
  renderCropTrackerRows();
}

window.updateCropBaseYield = updateCropBaseYield;

export function renderCropTrackerRows() {
  const tbody = document.getElementById('crop-tracker-body');
  if (!tbody) return;

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0.10;

  if (isInitialCheckDone && !hasBaselineForToday) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-sfl-dirt space-y-2">
          <div class="inline-block px-3 py-1 bg-amber-100 border-2 border-amber-400 rounded-lg text-amber-900 font-bold text-xs shadow-sm">
            🚩 00:00 UTC Baseline Not Found For Today
          </div>
          <p class="text-xs text-sfl-woodLight max-w-md mx-auto mt-2">
            Crop Tracker v1 compares harvest counts against your saved <strong>00:00 UTC snapshot</strong>. Yields and profit calculations will show here once today's baseline is logged.
          </p>
        </td>
      </tr>
    `;
    updateCropTrackerTotals(0, 0);
    return;
  }

  if (activeHarvestDiffs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sfl-woodLight italic">No crop harvests detected yet today compared to 00:00 UTC baseline.</td></tr>`;
    updateCropTrackerTotals(0, 0);
    return;
  }

  tbody.innerHTML = '';
  let grandCycles = 0;
  let grandFlowers = 0;

  activeHarvestDiffs.forEach(entry => {
    const baseYield = cropBaseYields[entry.cleanKey] !== undefined ? cropBaseYields[entry.cleanKey] : globalAvgYield;
    const totalHarvested = roundUpToOneDecimal(entry.harvestCount * baseYield);
    const unitPrice = getItemFlowerPrice(entry.cleanKey);
    const grossFlowers = unitPrice * totalHarvested;
    const netFlowers = roundUpToThreeDecimals(grossFlowers * (1 - taxRate));

    grandCycles += entry.harvestCount;
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
      <td class="px-3 py-2.5 font-mono font-bold text-sfl-green">${netFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
    `;
    tbody.appendChild(tr);
  });

  updateCropTrackerTotals(grandCycles, grandFlowers);
}

function updateCropTrackerTotals(cycles, flowers) {
  const cyclesEl = document.getElementById('summary-total-cycles');
  const flowersEl = document.getElementById('summary-total-flowers');

  if (cyclesEl) cyclesEl.textContent = cycles;
  if (flowersEl) flowersEl.textContent = flowers.toFixed(3);
}

// -------------------------------------------------------------
// WEEKLY SUMMARY REPORT (CROP TRACKER V1)
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
    dateRangeEl.textContent = `${monFmt} – ${sunFmt}`;
  }

  if (weekLabelEl) {
    if (currentCropWeekOffset === 0) weekLabelEl.textContent = 'Current Week';
    else if (currentCropWeekOffset === -1) weekLabelEl.textContent = 'Last Week';
    else weekLabelEl.textContent = `${Math.abs(currentCropWeekOffset)} Weeks Ago`;
  }

  if (nextBtn) nextBtn.disabled = currentCropWeekOffset >= 0;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) {}

  let cropAggregates = {};
  let totalCycles = 0;
  let totalQty = 0;
  let totalFlowers = 0;

  history.forEach(entry => {
    let cleanDate = (entry.date || entry.yield_date || '').split('T')[0];
    if (cleanDate >= mondayStr && cleanDate <= sundayStr) {
      let cropList = entry.cropActivityYields || entry.crop_activity_yields || [];
      cropList.forEach(item => {
        let name = item.crop || 'Crop';
        if (!cropAggregates[name]) {
          cropAggregates[name] = { cycles: 0, qty: 0, flowers: 0 };
        }
        let cycles = parseFloat(item.harvestCount || item.harvest_count || 0);
        let qty = parseFloat(item.totalProduced || item.total_produced || 0);
        let flowers = parseFloat(item.netFlowers || item.net_flowers || 0);

        cropAggregates[name].cycles += cycles;
        cropAggregates[name].qty += qty;
        cropAggregates[name].flowers += flowers;

        totalCycles += cycles;
        totalQty += qty;
        totalFlowers += flowers;
      });
    }
  });

  const cyclesEl = document.getElementById('crop-weekly-total-cycles');
  const qtyEl = document.getElementById('crop-weekly-total-qty');
  const flowersEl = document.getElementById('crop-weekly-total-flowers');
  const breakdownEl = document.getElementById('crop-weekly-breakdown');

  if (cyclesEl) cyclesEl.textContent = totalCycles;
  if (qtyEl) qtyEl.textContent = totalQty.toFixed(1);
  if (flowersEl) flowersEl.innerHTML = `${totalFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;

  if (breakdownEl) {
    const entries = Object.entries(cropAggregates);
    if (entries.length === 0) {
      breakdownEl.innerHTML = '<div class="text-center italic text-sfl-woodLight py-3">No crop activity logged for this calendar week.</div>';
    } else {
      let html = '';
      entries.sort((a, b) => b[1].cycles - a[1].cycles).forEach(([cropName, data]) => {
        html += `
          <div class="flex justify-between items-center p-2 bg-amber-50 rounded border border-amber-200/60">
            <span class="font-bold text-sfl-dirt">${cropName}</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="text-sfl-wood font-bold">${data.cycles} plots</span>
              <span class="text-sfl-dirt font-extrabold">(${data.qty.toFixed(1)} qty)</span>
              <span class="text-[10px] text-sfl-green font-semibold flex items-center gap-1">${data.flowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
            </div>
          </div>
        `;
      });
      breakdownEl.innerHTML = html;
    }
  }
}
