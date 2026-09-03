import { FLOWER_IMG_SMALL_HTML, SFL_GREENHOUSE_CROPS, SFL_FRUITS } from '../../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, getBettyUnitPrice } from '../../utils/formatters.js';
import { cropBaseYields, globalAvgYield, updateCropBaseYield } from './cropState.js';
import { activeHarvestDiffs, hasBaselineForToday, isInitialCheckDone, saveCurrentActivityAsBaseline } from './cropSync.js';

export function renderCropTrackerTemplate() {
  const container = document.getElementById('crop-tracker-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>🌱</span> Crop & Harvest Tracker v1
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            tracks plot crops, greenhouse crops & fruit patch harvests with custom yields
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- AUTO-FILL YIELDS FROM SFL.WORLD LAND API -->
          <button id="autofill-land-yields-btn" title="Auto-fill exact live average plot yields from sfl.world Land API" class="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5">
            <span>⚡</span> Auto-Fill Land Yields
          </button>

          <!-- QUICK APPLY AVG YIELD PILL -->
          <div class="flex items-center gap-1.5 bg-amber-900/10 dark:bg-amber-950/40 border border-amber-600/30 dark:border-amber-700/50 px-2.5 py-1 rounded-lg shadow-xs">
            <span class="text-[10px] font-bold text-sfl-wood dark:text-amber-300 whitespace-nowrap">Avg Yield / Unit:</span>
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
                <th class="px-3 py-2.5">Crop / Produce</th>
                <th class="px-2 py-2.5">Harvests</th>
                <th class="px-2 py-2.5 w-28">Avg Yield / Unit</th>
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
              <span id="crop-weekly-total-flowers" class="text-lg font-extrabold text-sfl-green font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
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

export function renderCropTrackerRows() {
  const tbody = document.getElementById('crop-tracker-body');
  if (!tbody) return;

  const savedTax = localStorage.getItem('sfl_tax_rate');
  const taxSelectEl = document.getElementById('tax-select');
  const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

  if (isInitialCheckDone && !hasBaselineForToday) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-sfl-dirt space-y-3">
          <div class="inline-block px-3 py-1 bg-amber-100 border-2 border-amber-400 rounded-lg text-amber-900 font-bold text-xs shadow-sm">
            🚩 00:00 UTC Baseline Not Found For Today
          </div>
          <p class="text-xs text-sfl-woodLight max-w-md mx-auto">
            Crop Tracker v1 compares harvest counts against your saved <strong>00:00 UTC snapshot</strong>. Yields and profit calculations will show here once today's baseline is logged.
          </p>
          <div class="pt-1">
            <button onclick="saveCurrentActivityAsBaseline()" class="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer inline-flex items-center gap-1.5">
              <span>📸</span> Set Current Farm Activity as Today's Baseline
            </button>
          </div>
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

    let typeBadge = '';
    let unitLabel = 'plots';
    if (SFL_GREENHOUSE_CROPS.has(entry.cleanKey)) {
      typeBadge = `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1.5 border border-emerald-300/60">🏡 Greenhouse</span>`;
      unitLabel = 'pots';
    } else if (SFL_FRUITS.has(entry.cleanKey)) {
      typeBadge = `<span class="text-[9px] bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded ml-1.5 border border-orange-300/60">🍎 Fruit</span>`;
      unitLabel = 'patches';
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold text-sfl-dirt flex items-center flex-wrap">
        <span>${entry.crop}</span> ${typeBadge}
      </td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">+${entry.harvestCount} ${unitLabel}</td>
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

export function updateCropTrackerTotals(cycles, gross, tax, flowers) {
  const cyclesEl = document.getElementById('summary-total-cycles');
  const taxEl = document.getElementById('summary-total-tax');
  const flowersEl = document.getElementById('summary-total-flowers');
  const grossEl = document.getElementById('summary-total-gross');

  if (cyclesEl) cyclesEl.textContent = cycles;
  if (taxEl) taxEl.textContent = `-${tax.toFixed(3)}`;
  if (flowersEl) flowersEl.textContent = flowers.toFixed(3);
  if (grossEl) grossEl.textContent = `Gross: ${gross.toFixed(3)} Flowers`;
}

export function getItemFlowerPrice(cleanKey) {
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
