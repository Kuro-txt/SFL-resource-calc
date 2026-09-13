import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML, SFL_PLOT_CROPS, SFL_GREENHOUSE_CROPS, SFL_FRUITS, getItemTaxRate } from '../../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, formatDateYYYYMMDD } from '../../utils/formatters.js';
import { cropBaseYields, globalAvgYield, updateDailyCropHistoricalYield } from './cropState.js';
import { getItemFlowerPrice } from './cropTable.js';
import { currentCropWeekOffset } from './index.js';
import { getWeeklyArchive, cachedWeeklyArchives } from '../../modals/weeklyModal.js';

export function getCropWeekRange(offset = 0) {
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
  const monFmt = mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const sunFmt = sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const dateRangeEl = document.getElementById('crop-weekly-date-range');
  const weekLabelEl = document.getElementById('crop-week-label-badge');
  const nextBtn = document.getElementById('next-crop-week-btn');

  if (dateRangeEl) {
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
  let grandTaxTotal = 0;
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
  const isArchivedWeek = currentCropWeekOffset <= -3 || sortedDates.length === 0;

  const harvestTitleEl = document.getElementById('crop-weekly-harvest-log-title');
  const harvestSubEl = document.getElementById('crop-weekly-harvest-log-subtitle');

  if (isArchivedWeek) {
    if (harvestTitleEl) harvestTitleEl.textContent = `📅 Archived Harvest (${monFmt} – ${sunFmt})`;
    if (harvestSubEl) harvestSubEl.textContent = `Weekly Summary`;

    const archive = cachedWeeklyArchives ? cachedWeeklyArchives.find(w => (w.week_start || '').split('T')[0] === mondayStr) : null;

    if (!archive && cachedWeeklyArchives === null) {
      if (breakdownEl) breakdownEl.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">Loading archived week...</div>';
      getWeeklyArchive(mondayStr).then(found => {
        if (found) renderCropWeeklySummary();
        else if (sortedDates.length === 0) {
          if (breakdownEl) breakdownEl.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No crop activity logged for this calendar week.</div>';
        }
      });
      if (sortedDates.length === 0) return;
    }

    if (archive) {
      const itemsMap = archive.items_summary || {};
      const cropKeys = Object.keys(itemsMap).filter(name => {
        const cleanKey = normalizeItemKey(name);
        return SFL_PLOT_CROPS.has(cleanKey) || SFL_GREENHOUSE_CROPS.has(cleanKey) || SFL_FRUITS.has(cleanKey);
      });

      if (cropKeys.length > 0) {
        let archQty = 0;
        let archFlowers = 0;
        let chips = [];
        let cropCardsHtml = '<div class="space-y-1.5">';

        cropKeys.forEach(cropName => {
          const cleanCropKey = normalizeItemKey(cropName);
          const formattedName = cleanCropKey.charAt(0).toUpperCase() + cleanCropKey.slice(1);
          const val = itemsMap[cropName];
          const qty = Array.isArray(val) ? (parseFloat(val[0]) || 0) : (parseFloat(val) || 0);
          let fl = Array.isArray(val) ? (parseFloat(val[1]) || 0) : 0;
          if (qty <= 0) return;

          if (fl <= 0) {
            const unitPrice = getItemFlowerPrice(cleanCropKey);
            if (unitPrice > 0) {
              const effectiveTaxRate = getItemTaxRate(formattedName || cleanCropKey, taxRate);
              const grossTotal = unitPrice * qty;
              const taxAmount = grossTotal * effectiveTaxRate;
              fl = roundUpToThreeDecimals(grossTotal - taxAmount);
            }
          }

          archQty += qty;
          archFlowers += fl;

          chips.push(`+${qty.toFixed(1)} ${formattedName} (${fl.toFixed(3)} 🌸)`);

          let typeIcon = '🌾';
          let typeBadge = '';
          if (SFL_GREENHOUSE_CROPS.has(cleanCropKey)) {
            typeIcon = '🏡';
            typeBadge = `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1 border border-emerald-300/60">Greenhouse</span>`;
          } else if (SFL_FRUITS.has(cleanCropKey)) {
            typeIcon = '🍎';
            typeBadge = `<span class="text-[9px] bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded ml-1 border border-orange-300/60">Fruit</span>`;
          }

          cropCardsHtml += `
            <div class="flex items-center justify-between px-3 py-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-700/40 text-xs font-mono whitespace-nowrap overflow-x-auto gap-2">
              <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span class="font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5 whitespace-nowrap">
                  <span>${typeIcon}</span> <span>${formattedName}</span> ${typeBadge}
                </span>
                <span class="text-[10px] text-sfl-woodLight dark:text-amber-300/70 font-sans font-bold bg-amber-100/90 dark:bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-700/50 whitespace-nowrap">
                  📅 ${monFmt} – ${sunFmt}
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span class="text-sfl-wood dark:text-amber-200 font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 whitespace-nowrap">
                  +${qty.toFixed(1)} qty
                </span>
                <span class="text-xs text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded whitespace-nowrap">
                  ${fl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                </span>
              </div>
            </div>
          `;
        });
        cropCardsHtml += '</div>';

        const chipsHtml = chips.length > 0 ? `
          <div class="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 rounded-xl border border-amber-300/70 dark:border-amber-700/50 text-xs font-mono mb-2">
            <div class="flex justify-between items-center font-bold text-sfl-dirt dark:text-amber-200 text-[11px] pb-1 mb-1 border-b border-amber-200/70 dark:border-amber-700/30">
              <span>🗓️ 7-Day Rollup: ${monFmt} – ${sunFmt}</span>
              <span class="text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1">${archFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
            </div>
            <div class="text-[11px] text-sfl-wood dark:text-amber-200/90 leading-relaxed font-semibold">
              ${chips.join(' • ')}
            </div>
          </div>
        ` : '';

        if (breakdownEl) breakdownEl.innerHTML = chipsHtml + cropCardsHtml;
        if (cyclesEl) cyclesEl.textContent = 'Archived';
        if (qtyEl) qtyEl.textContent = archQty.toFixed(1);
        if (flowersEl) flowersEl.innerHTML = `${archFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
        if (grossValEl) grossValEl.textContent = `${archFlowers.toFixed(3)} Flowers`;
        if (taxValEl) taxValEl.textContent = `0.000 Flowers`;
        if (netValEl) netValEl.textContent = `${archFlowers.toFixed(3)} Flowers`;
        return;
      }
    }

    if (breakdownEl) breakdownEl.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No crop activity logged for this calendar week.</div>';
    if (cyclesEl) cyclesEl.textContent = '0';
    if (qtyEl) qtyEl.textContent = '0.0';
    if (flowersEl) flowersEl.innerHTML = `0.000 ${FLOWER_IMG_HTML}`;
    if (grossValEl) grossValEl.textContent = '0.000 Flowers';
    if (taxValEl) taxValEl.textContent = `0.000 Flowers`;
    if (netValEl) netValEl.textContent = '0.000 Flowers';
    return;
  }

  if (harvestTitleEl) harvestTitleEl.textContent = `📅 Day-by-Day Harvest Log (${sortedDates.length} Days)`;
  if (harvestSubEl) harvestSubEl.textContent = `Plots / Yield / Net Flowers`;

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
      const effectiveTaxRate = getItemTaxRate(formattedName || cleanCropKey, taxRate);
      let taxAmount = grossTotal * effectiveTaxRate;
      let netFlowerVal = roundUpToThreeDecimals(grossTotal - taxAmount);

      totalCycles += cycles;
      totalQty += cropCalculatedQty;
      grandGrossFlowers += grossTotal;
      grandTaxTotal += taxAmount;
      grandNetFlowers += netFlowerVal;

      dayCycles += cycles;
      dayNetFlowers += netFlowerVal;

      let typeIcon = '🌾';
      let typeBadge = '';
      let unitLabel = 'plots';
      if (SFL_GREENHOUSE_CROPS.has(cleanCropKey)) {
        typeIcon = '🏡';
        typeBadge = `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1 border border-emerald-300/60">Greenhouse</span>`;
        unitLabel = 'pots';
      } else if (SFL_FRUITS.has(cleanCropKey)) {
        typeIcon = '🍎';
        typeBadge = `<span class="text-[9px] bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded ml-1 border border-orange-300/60">Fruit</span>`;
        unitLabel = 'patches';
      }

      dayCropsHtml += `
        <div class="flex items-center justify-between p-2 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-700/40 gap-2 whitespace-nowrap overflow-x-auto text-xs font-mono">
          <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <span class="font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1 whitespace-nowrap">
              <span>${typeIcon}</span> <span>${formattedName}</span> ${typeBadge}
            </span>
            <span class="text-[10px] text-sfl-woodLight dark:text-amber-300/70 font-mono whitespace-nowrap">(${unitPrice.toFixed(3)}/ea)</span>
          </div>
          
          <div class="flex items-center gap-2 shrink-0 whitespace-nowrap font-mono text-xs">
            <span class="text-sfl-wood dark:text-amber-200 font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/50 whitespace-nowrap">
              ${cycles} ${unitLabel}
            </span>

            <!-- CLEAN INLINE AVG YIELD PILL -->
            <div class="flex items-center gap-1 bg-amber-900/10 dark:bg-amber-950/40 border border-amber-600/30 dark:border-amber-700/50 px-1.5 py-0.5 rounded-lg shadow-xs whitespace-nowrap">
              <span class="text-[10px] font-bold text-sfl-wood dark:text-amber-300 uppercase">Yield:</span>
              <input type="number" step="0.05" min="0.1" value="${dayBaseYield}"
                onchange="updateDailyCropHistoricalYield('${dateStr}', '${cleanCropKey}', this.value)"
                class="w-14 sfl-input rounded px-1.5 py-0.5 text-xs font-bold text-center text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
            </div>

            <span class="text-sfl-dirt dark:text-amber-100 font-extrabold text-xs whitespace-nowrap">
              = ${cropCalculatedQty.toFixed(1)} qty
            </span>

            <span class="text-xs text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded whitespace-nowrap">
              ${netFlowerVal.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
            </span>
          </div>
        </div>
      `;
    });

    html += `
      <details class="crop-harvest-day-details group bg-white/90 dark:bg-amber-950/20 border-2 border-sfl-cardBorder/70 rounded-xl overflow-hidden shadow-xs mb-3">
        <!-- DAY HEADER (COLLAPSED BY DEFAULT) -->
        <summary class="bg-sfl-wood text-amber-200 px-3 py-2 text-xs font-bold flex justify-between items-center border-b border-sfl-dirt cursor-pointer hover:bg-amber-900 transition list-none select-none">
          <span class="flex items-center gap-1.5">
            <span class="transition-transform duration-200 group-open:rotate-90 inline-block text-[10px] text-amber-300">▶</span>
            <span>🗓️</span>
            <span>${formattedDateHeader}</span>
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
              Day Total: ${dayNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML} (${dayCycles} plots)
            </span>
            <span class="text-[9.5px] text-amber-300/60 font-sans group-open:hidden">(Click to expand)</span>
          </div>
        </summary>
        <!-- CROPS FOR THIS DAY -->
        <div class="p-2.5 space-y-2 border-t border-sfl-dirt/30">
          ${dayCropsHtml}
        </div>
      </details>
    `;
  });

  const topControlsHtml = `
    <div class="flex justify-between items-center text-xs font-bold px-1 pb-1 mb-2 border-b border-amber-200/50 dark:border-amber-800/40">
      <span class="text-sfl-dirt dark:text-amber-200 uppercase tracking-wide text-[11px]">
        📅 Day-by-Day Harvest Log (${sortedDates.length} Days)
      </span>
      <div class="flex items-center gap-1.5">
        <button id="crop-weekly-expand-all-btn" type="button" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 cursor-pointer transition">
          Expand All
        </button>
        <button id="crop-weekly-collapse-all-btn" type="button" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 cursor-pointer transition">
          Collapse All
        </button>
      </div>
    </div>
  `;

  if (cyclesEl) cyclesEl.textContent = totalCycles;
  if (qtyEl) qtyEl.textContent = totalQty.toFixed(1);
  if (flowersEl) flowersEl.innerHTML = `${grandNetFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
  
  if (grossValEl) grossValEl.textContent = `${grandGrossFlowers.toFixed(3)} Flowers`;
  if (taxValEl) taxValEl.textContent = `${grandTaxTotal.toFixed(3)} Flowers`;
  if (netValEl) netValEl.textContent = `${grandNetFlowers.toFixed(3)} Flowers`;

  if (breakdownEl) {
    breakdownEl.innerHTML = topControlsHtml + html;
    document.getElementById('crop-weekly-expand-all-btn')?.addEventListener('click', () => {
      breakdownEl.querySelectorAll('.crop-harvest-day-details').forEach(d => d.open = true);
    });
    document.getElementById('crop-weekly-collapse-all-btn')?.addEventListener('click', () => {
      breakdownEl.querySelectorAll('.crop-harvest-day-details').forEach(d => d.open = false);
    });
  }
}
