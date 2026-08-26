import { FLOWER_IMG_HTML, FLOWER_IMG_SMALL_HTML } from '../config/constants.js';
import { formatDateYYYYMMDD, normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, getBettyUnitPrice } from '../utils/formatters.js';

let currentWeekOffset = 0;

export function renderWeeklyModalTemplate() {
  const container = document.getElementById('weekly-modal-mount');
  if (!container) return;

  container.innerHTML = `
    <div id="weekly-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
        
        <div class="flex justify-between items-center border-b-2 border-sfl-cardBorder pb-3">
          <div>
            <h3 class="text-lg font-black text-sfl-dirt flex items-center gap-2">
              <span>🗓️</span> Daily Tracker Weekly Harvest Report
            </h3>
            <p id="weekly-date-range" class="text-xs font-bold text-sfl-wood font-mono mt-0.5">
              Calculating dates...
            </p>
          </div>
          <button id="close-weekly-modal-btn" class="text-sfl-accent hover:text-red-700 font-black text-lg p-1 cursor-pointer">✕</button>
        </div>

        <div class="flex justify-between items-center bg-amber-100/80 p-2 rounded-lg border border-amber-300 text-xs font-bold">
          <button id="prev-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer">
            ◀ Previous Week
          </button>
          <span id="week-label-badge" class="text-sfl-dirt font-black">Current Week</span>
          <button id="next-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Next Week ▶
          </button>
        </div>

        <!-- MAIN SCROLLABLE BODY (SINGLE UNIFIED SCROLLBAR) -->
        <div class="overflow-y-auto flex-1 pr-1.5 space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-amber-100/90 border-2 border-sfl-gold/60 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">Snapshots</span>
              <span id="weekly-total-snapshots" class="text-lg font-extrabold text-sfl-wood font-mono">0 Logs</span>
            </div>
            <div class="bg-amber-100/90 border-2 border-sfl-gold/60 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">Total Items</span>
              <span id="weekly-total-items" class="text-lg font-extrabold text-sfl-wood font-mono">0.0 Items</span>
            </div>
            <div class="bg-green-100/90 border-2 border-sfl-green/50 p-2.5 rounded-xl text-center shadow-sm">
              <span class="text-[10px] font-bold text-sfl-green uppercase tracking-wider block mb-0.5">Net Flowers</span>
              <span id="weekly-total-flowers" class="text-lg font-extrabold text-sfl-green font-mono">0.000 ${FLOWER_IMG_HTML}</span>
            </div>
          </div>

          <!-- SUMMARY TAX DEDUCTION BREAKDOWN BAR -->
          <div id="weekly-tax-bar" class="bg-amber-100/70 border border-amber-300/80 px-3 py-1.5 rounded-lg flex justify-between items-center text-[11px] font-mono text-sfl-wood">
            <span>Gross: <strong id="weekly-gross-val" class="text-sfl-dirt">0.000 Flowers</strong></span>
            <span class="text-sfl-accent font-bold">Tax (-): <span id="weekly-tax-val">0.000 Flowers</span></span>
            <span class="text-sfl-green font-extrabold">Net: <span id="weekly-net-val">0.000 Flowers</span></span>
          </div>

          <!-- DAY-BY-DAY HARVEST SECTION CONTAINER -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-sfl-dirt uppercase tracking-wider border-b border-amber-200/60 pb-1 flex justify-between items-center">
              <span>📅 Day-by-Day Harvest Log</span>
              <span class="text-[10px] text-sfl-woodLight font-mono">Quantity / Unit / Net Flowers</span>
            </h4>
            <div id="weekly-item-breakdown" class="space-y-3.5 text-xs"></div>
          </div>
        </div>

        <div class="pt-3 border-t border-sfl-cardBorder flex justify-end">
          <button id="close-weekly-modal-footer-btn" class="bg-sfl-wood text-amber-100 font-bold px-4 py-1.5 rounded-lg hover:bg-sfl-dirt transition text-xs cursor-pointer shadow-xs">
            Close Report
          </button>
        </div>
      </div>
    </div>
  `;
}

export function getCalendarWeekRange(weekOffset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday + (weekOffset * 7));
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

export function renderWeeklySummaryModal() {
  const { mondayStr, sundayStr, mondayDate, sundayDate } = getCalendarWeekRange(currentWeekOffset);

  const dateRangeEl = document.getElementById('weekly-date-range');
  if (dateRangeEl) {
    const monFmt = mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const sunFmt = sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    dateRangeEl.textContent = `📅 ${monFmt} – ${sunFmt}`;
  }

  const weekLabelEl = document.getElementById('week-label-badge');
  if (weekLabelEl) {
    if (currentWeekOffset === 0) weekLabelEl.textContent = 'Current Week';
    else if (currentWeekOffset === -1) weekLabelEl.textContent = 'Last Week';
    else weekLabelEl.textContent = `${Math.abs(currentWeekOffset)} Weeks Ago`;
  }

  const nextBtn = document.getElementById('next-week-btn');
  if (nextBtn) nextBtn.disabled = currentWeekOffset >= 0;

  const savedTax = localStorage.getItem('sfl_tax_rate');
  const taxSelectEl = document.getElementById('tax-select');
  const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) {}

  let snapshotCount = 0;
  let grandTotalItems = 0;
  let grandGrossFlowers = 0;
  let grandNetFlowers = 0;

  // Group by day without collapsing crops across days
  let dailySnapshotsMap = {};

  history.forEach(entry => {
    if (!entry) return;
    let rawDate = entry.date || entry.yield_date || '';
    let cleanDateStr = rawDate.split('T')[0].trim();

    if (cleanDateStr && cleanDateStr >= mondayStr && cleanDateStr <= sundayStr) {
      let cropsList = Array.isArray(entry.crops) ? entry.crops : [];
      if (cropsList.length > 0) {
        if (!dailySnapshotsMap[cleanDateStr]) {
          dailySnapshotsMap[cleanDateStr] = [];
        }
        dailySnapshotsMap[cleanDateStr].push(...cropsList);
      }
    }
  });

  const breakdownContainer = document.getElementById('weekly-item-breakdown');
  const snapshotsEl = document.getElementById('weekly-total-snapshots');
  const itemsEl = document.getElementById('weekly-total-items');
  const flowersEl = document.getElementById('weekly-total-flowers');
  const grossValEl = document.getElementById('weekly-gross-val');
  const taxValEl = document.getElementById('weekly-tax-val');
  const netValEl = document.getElementById('weekly-net-val');

  const sortedDates = Object.keys(dailySnapshotsMap).sort().reverse();

  if (sortedDates.length === 0) {
    if (breakdownContainer) breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No harvest snapshots logged for this calendar week.</div>';
    if (snapshotsEl) snapshotsEl.textContent = '0 Logs';
    if (itemsEl) itemsEl.textContent = '0.0 Items';
    if (flowersEl) flowersEl.innerHTML = `0.000 ${FLOWER_IMG_HTML}`;
    if (grossValEl) grossValEl.textContent = '0.000 Flowers';
    if (taxValEl) taxValEl.textContent = `0.000 Flowers (0%)`;
    if (netValEl) netValEl.textContent = '0.000 Flowers';
    return;
  }

  let html = '';

  sortedDates.forEach(dateStr => {
    snapshotCount++;
    const crops = dailySnapshotsMap[dateStr];
    let dateObj = new Date(dateStr + 'T00:00:00');
    let formattedDateHeader = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : dateStr;

    let dayItemsCount = 0;
    let dayNetFlowers = 0;
    let dayItemsHtml = '';

    crops.forEach(crop => {
      const rawName = crop.name || crop.item || 'Item';
      const cleanKey = normalizeItemKey(rawName);
      if (!cleanKey) return;

      const cleanName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
      const qty = parseFloat(crop.qty) || 0;
      if (qty <= 0) return;

      let unitPrice = getItemFlowerPrice(cleanKey);
      let grossTotal = unitPrice * qty;
      let taxAmount = grossTotal * taxRate;
      let netFlowers = roundUpToThreeDecimals(grossTotal - taxAmount);

      dayItemsCount += qty;
      dayNetFlowers += netFlowers;

      grandTotalItems += qty;
      grandGrossFlowers += grossTotal;
      grandNetFlowers += netFlowers;

      dayItemsHtml += `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-700/40 gap-2">
          <div class="flex flex-col">
            <span class="font-bold text-sfl-dirt text-xs flex items-center gap-1">
              <span>🌾</span> ${cleanName}
            </span>
            <span class="text-[10px] text-sfl-woodLight font-mono">Unit: ${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
            <span class="text-sfl-wood font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/50">
              +${roundUpToOneDecimal(qty).toFixed(1)} qty
            </span>

            <div class="flex flex-col items-end">
              <span class="text-xs text-sfl-green font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded">
                ${netFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
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
            Day Total: ${dayNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML} (${roundUpToOneDecimal(dayItemsCount).toFixed(1)} items)
          </span>
        </div>
        <!-- ITEMS FOR THIS DAY -->
        <div class="p-2.5 space-y-2">
          ${dayItemsHtml}
        </div>
      </div>
    `;
  });

  const grandTaxTotal = grandGrossFlowers * taxRate;

  if (snapshotsEl) snapshotsEl.textContent = `${snapshotCount} Log${snapshotCount === 1 ? '' : 's'}`;
  if (itemsEl) itemsEl.textContent = `${roundUpToOneDecimal(grandTotalItems).toFixed(1)} Items`;
  if (flowersEl) flowersEl.innerHTML = `${grandNetFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;

  if (grossValEl) grossValEl.textContent = `${grandGrossFlowers.toFixed(3)} Flowers`;
  if (taxValEl) taxValEl.textContent = `${grandTaxTotal.toFixed(3)} Flowers (${(taxRate * 100).toFixed(1)}%)`;
  if (netValEl) netValEl.textContent = `${grandNetFlowers.toFixed(3)} Flowers`;

  if (breakdownContainer) breakdownContainer.innerHTML = html;
}

export function initWeeklySummaryModal() {
  renderWeeklyModalTemplate();

  const modal = document.getElementById('weekly-modal');
  const openBtns = document.querySelectorAll('#open-weekly-modal-btn');
  const closeBtn = document.getElementById('close-weekly-modal-btn');
  const closeFooterBtn = document.getElementById('close-weekly-modal-footer-btn');
  const prevBtn = document.getElementById('prev-week-btn');
  const nextBtn = document.getElementById('next-week-btn');

  const openModal = () => {
    currentWeekOffset = 0;
    renderWeeklySummaryModal();
    modal?.classList.remove('hidden');
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
  };

  openBtns.forEach(btn => btn?.addEventListener('click', openModal));
  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);

  prevBtn?.addEventListener('click', () => {
    currentWeekOffset--;
    renderWeeklySummaryModal();
  });

  nextBtn?.addEventListener('click', () => {
    if (currentWeekOffset < 0) {
      currentWeekOffset++;
      renderWeeklySummaryModal();
    }
  });
}

window.renderWeeklySummaryModal = renderWeeklySummaryModal;
