import { FLOWER_IMG_HTML, FLOWER_IMG_SMALL_HTML, getItemTaxRate, RESOURCE_FLOWER_FALLBACK_PRICES } from '../config/constants.js';
import { formatDateYYYYMMDD, normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, getBettyUnitPrice } from '../utils/formatters.js';

let currentWeekOffset = 0;

export let cachedWeeklyArchives = null;
let isFetchingWeeklyArchives = false;

/** Call this whenever weekly_yields data is written so the modal re-fetches fresh data. */
export function invalidateWeeklyArchiveCache() {
  cachedWeeklyArchives = null;
  isFetchingWeeklyArchives = false;
}
window.invalidateWeeklyArchiveCache = invalidateWeeklyArchiveCache;

export async function getWeeklyArchive(mondayStr) {
  if (!cachedWeeklyArchives && !isFetchingWeeklyArchives) {
    isFetchingWeeklyArchives = true;
    try {
      const client = window.supabaseClient;
      const activeUser = window.currentUser;
      const farmId = localStorage.getItem('sfl_farm_id') || '';
      let loaded = [];

      if (client && activeUser) {
        const { data } = await client.from('weekly_yields').select('*').eq('user_id', activeUser.id);
        if (Array.isArray(data) && data.length > 0) loaded = data;
      }

      if (loaded.length === 0) {
        const backend = window.BACKEND_URL || '';
        const res = await fetch(`${backend}/api/weekly-yields?userId=${encodeURIComponent(activeUser?.id || '')}&farmId=${encodeURIComponent(farmId)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) loaded = json.data;
      }

      cachedWeeklyArchives = loaded;
    } catch (e) {
      console.warn("Weekly archive fetch error:", e.message);
      cachedWeeklyArchives = [];
    } finally {
      isFetchingWeeklyArchives = false;
    }
  }

  if (Array.isArray(cachedWeeklyArchives)) {
    return cachedWeeklyArchives.find(w => (w.week_start || '').split('T')[0] === mondayStr);
  }
  return null;
}

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
              <span id="weekly-harvest-log-title">📅 Day-by-Day Harvest Log</span>
              <span id="weekly-harvest-log-subtitle" class="text-[10px] text-sfl-woodLight font-mono">Quantity / Unit / Net Flowers</span>
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

  if (RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey] !== undefined) {
    return RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey];
  }

  return 0.01;
}

export function renderWeeklySummaryModal() {
  const { mondayStr, sundayStr, mondayDate, sundayDate } = getCalendarWeekRange(currentWeekOffset);
  const monFmt = mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const sunFmt = sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const dateRangeEl = document.getElementById('weekly-date-range');
  if (dateRangeEl) {
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
  let grandTaxTotal = 0;
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
  const isArchivedWeek = currentWeekOffset <= -3 || sortedDates.length === 0;

  const harvestTitleEl = document.getElementById('weekly-harvest-log-title');
  const harvestSubEl = document.getElementById('weekly-harvest-log-subtitle');

  if (isArchivedWeek) {
    if (harvestTitleEl) harvestTitleEl.textContent = `📅 Archived Harvest (${monFmt} – ${sunFmt})`;
    if (harvestSubEl) harvestSubEl.textContent = `Weekly Summary`;

    const archive = cachedWeeklyArchives ? cachedWeeklyArchives.find(w => (w.week_start || '').split('T')[0] === mondayStr) : null;

    if (!archive && cachedWeeklyArchives === null) {
      if (breakdownContainer) breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">Loading archived week...</div>';
      getWeeklyArchive(mondayStr).then(found => {
        if (found) renderWeeklySummaryModal();
        else if (sortedDates.length === 0) {
          if (breakdownContainer) breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No harvest snapshots logged for this calendar week.</div>';
        }
      });
      if (sortedDates.length === 0) return;
    }

    if (archive) {
      const totalItems = parseFloat(archive.total_items || 0);
      const totalFlowers = parseFloat(archive.total_flowers || 0);
      const itemsMap = archive.items_summary || {};

      let calculatedTotalFlowers = 0;
      let chips = [];
      let itemsHtml = '<div class="space-y-1.5">';
      const itemKeys = Object.keys(itemsMap);
      if (itemKeys.length === 0) {
        itemsHtml += '<div class="text-center italic text-xs text-sfl-woodLight py-3">No individual items recorded for this week.</div>';
      } else {
        itemKeys.forEach(itemName => {
          const val = itemsMap[itemName];
          const qty = Array.isArray(val) ? (parseFloat(val[0]) || 0) : (parseFloat(val) || 0);
          let fl = Array.isArray(val) ? (parseFloat(val[1]) || 0) : 0;
          if (qty <= 0) return;

          const cleanKey = normalizeItemKey(itemName);
          const effectiveTaxRate = getItemTaxRate(itemName, taxRate);

          // Fallback to live or base price if archive stored 0
          if (fl <= 0) {
            const unitPrice = getItemFlowerPrice(cleanKey);
            if (unitPrice > 0) {
              const grossTotal = unitPrice * qty;
              const taxAmount = grossTotal * effectiveTaxRate;
              fl = roundUpToThreeDecimals(grossTotal - taxAmount);
            }
          }

          calculatedTotalFlowers += fl;
          chips.push(`+${qty.toFixed(1)} ${itemName} (${fl.toFixed(3)} 🌸)`);

          itemsHtml += `
            <div class="flex items-center justify-between px-3 py-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-700/40 text-xs font-mono whitespace-nowrap overflow-x-auto gap-2">
              <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span class="font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5 whitespace-nowrap">
                  <span>🌾</span> <span>${itemName}</span>
                </span>
                <span class="text-[10px] text-sfl-woodLight dark:text-amber-300/70 font-sans font-bold bg-amber-100/90 dark:bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-700/50 whitespace-nowrap">
                  📅 ${monFmt} – ${sunFmt}
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span class="text-sfl-wood dark:text-amber-200 font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 whitespace-nowrap">
                  +${qty.toFixed(1)}
                </span>
                <span class="text-xs text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded whitespace-nowrap">
                  ${fl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                </span>
              </div>
            </div>
          `;
        });
      }
      itemsHtml += '</div>';

      const displayTotalFlowers = Math.max(totalFlowers, roundUpToThreeDecimals(calculatedTotalFlowers));

      if (snapshotsEl) snapshotsEl.textContent = 'Archived Week';
      if (itemsEl) itemsEl.textContent = `${totalItems.toFixed(1)} Items`;
      if (flowersEl) flowersEl.innerHTML = `${displayTotalFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
      if (grossValEl) grossValEl.textContent = `${displayTotalFlowers.toFixed(3)} Flowers`;
      if (taxValEl) taxValEl.textContent = `0.000 Flowers`;
      if (netValEl) netValEl.textContent = `${displayTotalFlowers.toFixed(3)} Flowers`;

      const chipsHtml = chips.length > 0 ? `
        <div class="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 rounded-xl border border-amber-300/70 dark:border-amber-700/50 text-xs font-mono mb-2">
          <div class="flex justify-between items-center font-bold text-sfl-dirt dark:text-amber-200 text-[11px] pb-1 mb-1 border-b border-amber-200/70 dark:border-amber-700/30">
            <span>🗓️ 7-Day Rollup: ${monFmt} – ${sunFmt}</span>
            <span class="text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1">${displayTotalFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          <div class="text-[11px] text-sfl-wood dark:text-amber-200/90 leading-relaxed font-semibold">
            ${chips.join(' • ')}
          </div>
        </div>
      ` : '';

      if (breakdownContainer) breakdownContainer.innerHTML = chipsHtml + itemsHtml;
      return;
    }

    if (breakdownContainer) breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-6 bg-white/60 dark:bg-amber-950/20 rounded-xl border border-sfl-cardBorder/40">No harvest snapshots logged for this calendar week.</div>';
    if (snapshotsEl) snapshotsEl.textContent = '0 Logs';
    if (itemsEl) itemsEl.textContent = '0.0 Items';
    if (flowersEl) flowersEl.innerHTML = `0.000 ${FLOWER_IMG_HTML}`;
    if (grossValEl) grossValEl.textContent = '0.000 Flowers';
    if (taxValEl) taxValEl.textContent = `0.000 Flowers`;
    if (netValEl) netValEl.textContent = '0.000 Flowers';
    return;
  }

  if (harvestTitleEl) harvestTitleEl.textContent = `📅 Day-by-Day Harvest Log (${sortedDates.length} Days)`;
  if (harvestSubEl) harvestSubEl.textContent = `Quantity / Unit / Net Flowers`;

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
      const effectiveTaxRate = getItemTaxRate(rawName || cleanName, taxRate);
      let taxAmount = grossTotal * effectiveTaxRate;
      let netFlowers = roundUpToThreeDecimals(grossTotal - taxAmount);

      dayItemsCount += qty;
      dayNetFlowers += netFlowers;

      grandTotalItems += qty;
      grandGrossFlowers += grossTotal;
      grandTaxTotal += taxAmount;
      grandNetFlowers += netFlowers;

      dayItemsHtml += `
        <div class="flex items-center justify-between p-2 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-700/40 gap-2 whitespace-nowrap overflow-x-auto text-xs font-mono">
          <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <span class="font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1 whitespace-nowrap">
              <span>🌾</span> <span>${cleanName}</span>
            </span>
            <span class="text-[10px] text-sfl-woodLight dark:text-amber-300/70 font-mono whitespace-nowrap">(${unitPrice.toFixed(3)}/ea)</span>
          </div>
          
          <div class="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <span class="text-sfl-wood dark:text-amber-200 font-bold bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/50 whitespace-nowrap">
              +${roundUpToOneDecimal(qty).toFixed(1)} qty
            </span>

            <span class="text-xs text-sfl-green dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-green-100 dark:bg-green-950/50 border border-sfl-green/30 px-2 py-0.5 rounded whitespace-nowrap">
              ${netFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
            </span>
          </div>
        </div>
      `;
    });

    html += `
      <details class="daily-harvest-day-details group bg-white/90 dark:bg-amber-950/20 border-2 border-sfl-cardBorder/70 rounded-xl overflow-hidden shadow-xs mb-3">
        <!-- DAY HEADER (COLLAPSED BY DEFAULT) -->
        <summary class="bg-sfl-wood text-amber-200 px-3 py-2 text-xs font-bold flex justify-between items-center border-b border-sfl-dirt cursor-pointer hover:bg-amber-900 transition list-none select-none">
          <span class="flex items-center gap-1.5">
            <span class="transition-transform duration-200 group-open:rotate-90 inline-block text-[10px] text-amber-300">▶</span>
            <span>🗓️</span>
            <span>${formattedDateHeader}</span>
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-amber-300 font-extrabold flex items-center gap-1">
              Day Total: ${dayNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML} (${roundUpToOneDecimal(dayItemsCount).toFixed(1)} items)
            </span>
            <span class="text-[9.5px] text-amber-300/60 font-sans group-open:hidden">(Click to expand)</span>
          </div>
        </summary>
        <!-- ITEMS FOR THIS DAY -->
        <div class="p-2.5 space-y-2 border-t border-sfl-dirt/30">
          ${dayItemsHtml}
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
        <button id="weekly-expand-all-btn" type="button" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 cursor-pointer transition">
          Expand All
        </button>
        <button id="weekly-collapse-all-btn" type="button" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 cursor-pointer transition">
          Collapse All
        </button>
      </div>
    </div>
  `;

  if (snapshotsEl) snapshotsEl.textContent = `${snapshotCount} Log${snapshotCount === 1 ? '' : 's'}`;
  if (itemsEl) itemsEl.textContent = `${roundUpToOneDecimal(grandTotalItems).toFixed(1)} Items`;
  if (flowersEl) flowersEl.innerHTML = `${grandNetFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;

  if (grossValEl) grossValEl.textContent = `${grandGrossFlowers.toFixed(3)} Flowers`;
  if (taxValEl) taxValEl.textContent = `${grandTaxTotal.toFixed(3)} Flowers`;
  if (netValEl) netValEl.textContent = `${grandNetFlowers.toFixed(3)} Flowers`;

  if (breakdownContainer) {
    breakdownContainer.innerHTML = topControlsHtml + html;
    document.getElementById('weekly-expand-all-btn')?.addEventListener('click', () => {
      breakdownContainer.querySelectorAll('.daily-harvest-day-details').forEach(d => d.open = true);
    });
    document.getElementById('weekly-collapse-all-btn')?.addEventListener('click', () => {
      breakdownContainer.querySelectorAll('.daily-harvest-day-details').forEach(d => d.open = false);
    });
  }
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
