import { FLOWER_IMG_HTML, FLOWER_IMG_SMALL_HTML } from '../config/constants.js';
import { formatDateYYYYMMDD, normalizeItemKey, getBettyUnitPrice } from '../utils/formatters.js';

let currentWeekOffset = 0;

export function renderWeeklyModalTemplate() {
  const container = document.getElementById('weekly-modal-mount');
  if (!container) return;

  container.innerHTML = `
    <div id="weekly-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
        
        <!-- MODAL HEADER -->
        <div class="flex justify-between items-center border-b-2 border-sfl-cardBorder pb-3">
          <div>
            <h3 class="text-lg font-black text-sfl-dirt flex items-center gap-2">
              <span>🗓️</span> Weekly Harvest & Snapshot Report
            </h3>
            <p id="weekly-date-range" class="text-xs font-bold text-sfl-woodLight font-mono mt-0.5">
              Mon – Sun
            </p>
          </div>
          <button id="close-weekly-modal-btn" class="text-sfl-accent hover:text-red-700 font-black text-lg p-1 cursor-pointer">✕</button>
        </div>

        <!-- WEEK NAVIGATION -->
        <div class="flex justify-between items-center bg-amber-100/80 p-2 rounded-lg border border-amber-300 text-xs font-bold">
          <button id="prev-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer">
            ◀ Previous Week
          </button>
          <span id="week-label-badge" class="text-sfl-dirt font-black">Current Week</span>
          <button id="next-week-btn" class="bg-sfl-wood text-amber-100 px-2.5 py-1 rounded hover:bg-sfl-dirt transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Next Week ▶
          </button>
        </div>

        <!-- MAIN STATS CARDS -->
        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
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

          <!-- ITEMIZED CROP & RESOURCE BREAKDOWN -->
          <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl p-3 shadow-inner">
            <h4 class="text-xs font-bold text-sfl-dirt uppercase tracking-wider mb-2 border-b border-amber-200/60 pb-1 flex justify-between">
              <span>Resource / Crop</span>
              <span>Harvested Qty & Value</span>
            </h4>
            <div id="weekly-item-breakdown" class="space-y-1.5 max-h-48 overflow-y-auto text-xs"></div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="pt-3 border-t border-sfl-cardBorder flex justify-end">
          <button id="close-weekly-modal-footer-btn" class="bg-sfl-wood text-amber-100 font-bold px-4 py-1.5 rounded-lg hover:bg-sfl-dirt transition text-xs cursor-pointer">
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

export function calculateWeeklySummary(weekOffset = 0) {
  const { mondayStr, sundayStr, mondayDate, sundayDate } = getCalendarWeekRange(weekOffset);
  
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) {
    history = [];
  }

  let snapshotCount = 0;
  let cropBreakdown = {};
  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0;

  history.forEach(entry => {
    if (!entry) return;

    let rawDate = entry.date || entry.yield_date || '';
    let cleanDateStr = rawDate.split('T')[0].trim();

    if (cleanDateStr && cleanDateStr >= mondayStr && cleanDateStr <= sundayStr) {
      // Increment the snapshot log count for this calendar week
      snapshotCount++;

      if (Array.isArray(entry.crops) && entry.crops.length > 0) {
        entry.crops.forEach(crop => {
          const rawName = crop.name || crop.item || 'Item';
          const cleanKey = normalizeItemKey(rawName);
          if (!cleanKey) return;

          const cleanName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
          const qty = parseFloat(crop.qty) || 0;
          let flowers = parseFloat(crop.flowers) || 0;

          // Re-calculate unit price if snapshot flowers was stored corrupted or missing
          if ((flowers <= 0 || flowers > 1000) && qty > 0) {
            let unitPrice = getBettyUnitPrice(cleanKey) || 0;
            if (unitPrice === 0 && window.allPrices) {
              let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
              if (matchedKey) unitPrice = parseFloat(window.allPrices[matchedKey]) || 0;
            }
            flowers = (unitPrice * qty) * (1 - taxRate);
          }

          if (!cropBreakdown[cleanName]) {
            cropBreakdown[cleanName] = { qty: 0, flowers: 0 };
          }

          cropBreakdown[cleanName].qty += qty;
          cropBreakdown[cleanName].flowers += flowers;
        });
      }
    }
  });

  // Calculate grand totals directly from the aggregated itemized crop breakdown
  let grandTotalItems = 0;
  let grandTotalFlowers = 0;

  Object.values(cropBreakdown).forEach(item => {
    grandTotalItems += item.qty;
    grandTotalFlowers += item.flowers;
  });

  return {
    mondayStr,
    sundayStr,
    mondayFormatted: mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sundayFormatted: sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    snapshotCount,
    totalItems: Math.round(grandTotalItems * 10) / 10,
    totalFlowers: Math.round(grandTotalFlowers * 1000) / 1000,
    cropBreakdown
  };
}

export function renderWeeklySummaryModal() {
  const summary = calculateWeeklySummary(currentWeekOffset);

  const dateRangeEl = document.getElementById('weekly-date-range');
  if (dateRangeEl) {
    dateRangeEl.textContent = `${summary.mondayFormatted} – ${summary.sundayFormatted}`;
  }

  const weekLabelEl = document.getElementById('week-label-badge');
  if (weekLabelEl) {
    if (currentWeekOffset === 0) weekLabelEl.textContent = 'Current Week';
    else if (currentWeekOffset === -1) weekLabelEl.textContent = 'Last Week';
    else weekLabelEl.textContent = `${Math.abs(currentWeekOffset)} Weeks Ago`;
  }

  const nextBtn = document.getElementById('next-week-btn');
  if (nextBtn) {
    nextBtn.disabled = currentWeekOffset >= 0;
  }

  const snapshotsEl = document.getElementById('weekly-total-snapshots');
  const itemsEl = document.getElementById('weekly-total-items');
  const flowersEl = document.getElementById('weekly-total-flowers');

  if (snapshotsEl) snapshotsEl.textContent = `${summary.snapshotCount} Log${summary.snapshotCount === 1 ? '' : 's'}`;
  if (itemsEl) itemsEl.textContent = `${summary.totalItems.toFixed(1)} Items`;
  if (flowersEl) {
    flowersEl.innerHTML = `${summary.totalFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
  }

  const breakdownContainer = document.getElementById('weekly-item-breakdown');
  if (breakdownContainer) {
    const entries = Object.entries(summary.cropBreakdown);
    if (entries.length === 0) {
      breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-3">No snapshots logged for this calendar week.</div>';
    } else {
      let html = '';
      entries.sort((a, b) => b[1].qty - a[1].qty).forEach(([cropName, data]) => {
        let cleanQty = (Math.round(data.qty * 10) / 10).toFixed(1);
        let cleanFlowers = (Math.round(data.flowers * 1000) / 1000).toFixed(3);

        html += `
          <div class="flex justify-between items-center p-1.5 bg-amber-50 rounded border border-amber-200/60">
            <span class="font-bold text-sfl-dirt">${cropName}</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="font-bold text-sfl-wood">+${cleanQty}</span>
              <span class="text-[10px] text-sfl-green font-semibold flex items-center gap-1">(${cleanFlowers} ${FLOWER_IMG_SMALL_HTML})</span>
            </div>
          </div>
        `;
      });
      breakdownContainer.innerHTML = html;
    }
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
