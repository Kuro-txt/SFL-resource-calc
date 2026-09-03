import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML, SFL_PLOT_CROPS, SFL_GREENHOUSE_CROPS, SFL_FRUITS } from '../../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, formatDateYYYYMMDD } from '../../utils/formatters.js';
import { cropBaseYields, globalAvgYield, updateDailyCropHistoricalYield } from './cropState.js';
import { getItemFlowerPrice } from './cropTable.js';
import { currentCropWeekOffset } from './index.js';

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
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-700/40 gap-2">
          <div class="flex flex-col">
            <span class="font-bold text-sfl-dirt text-xs flex items-center gap-1 flex-wrap">
              <span>${typeIcon}</span> <span>${formattedName}</span> ${typeBadge}
            </span>
            <span class="text-[10px] text-sfl-woodLight font-mono">Unit: ${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span class="text-sfl-wood font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/50">
              ${cycles} ${unitLabel}
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
