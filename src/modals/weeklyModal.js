import { FLOWER_IMG_HTML, FLOWER_IMG_SMALL_HTML } from '../config/constants.js';
import { formatDateYYYYMMDD, normalizeItemKey, getBettyUnitPrice } from '../utils/formatters.js';

let currentWeekOffset = 0;

export function getCalendarWeekRange(weekOffset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
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

  let totalItems = 0;
  let totalFlowers = 0;
  let cropBreakdown = {};

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0;

  history.forEach(entry => {
    const entryDateStr = entry.date || entry.yield_date;
    if (entryDateStr && entryDateStr >= mondayStr && entryDateStr <= sundayStr) {
      
      let dayNetFlowers = parseFloat(entry.netFlowers || entry.net_flowers || 0);
      let dayTotalCount = parseFloat(entry.totalCount || entry.total_count || 0);
      let calculatedDayFlowers = 0;

      if (Array.isArray(entry.crops) && entry.crops.length > 0) {
        entry.crops.forEach(crop => {
          const rawName = crop.name || crop.item || 'Crop';
          const cleanKey = normalizeItemKey(rawName);
          const cleanName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
          const qty = parseFloat(crop.qty) || 0;
          let flowers = parseFloat(crop.flowers) || 0;

          if (flowers <= 0 && qty > 0) {
            let unitPrice = 0;
            if (typeof getBettyUnitPrice === 'function') {
              unitPrice = getBettyUnitPrice(cleanKey) || 0;
            }
            if (unitPrice === 0 && window.allPrices) {
              let matchedKey = Object.keys(window.allPrices).find(k => k.toLowerCase().includes(cleanKey));
              if (matchedKey) unitPrice = parseFloat(window.allPrices[matchedKey]) || 0;
            }
            flowers = (unitPrice * qty) * (1 - taxRate);
          }

          calculatedDayFlowers += flowers;

          if (!cropBreakdown[cleanName]) {
            cropBreakdown[cleanName] = { qty: 0, flowers: 0 };
          }
          cropBreakdown[cleanName].qty += qty;
          cropBreakdown[cleanName].flowers += flowers;
        });
      }

      let finalDayFlowers = dayNetFlowers > 0 ? dayNetFlowers : calculatedDayFlowers;

      totalItems += dayTotalCount;
      totalFlowers += finalDayFlowers;
    }
  });

  return {
    mondayStr,
    sundayStr,
    mondayFormatted: mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sundayFormatted: sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    totalItems: Math.ceil(totalItems * 10) / 10,
    totalFlowers: Math.ceil(totalFlowers * 1000) / 1000,
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

  const itemsEl = document.getElementById('weekly-total-items');
  const flowersEl = document.getElementById('weekly-total-flowers');
  if (itemsEl) itemsEl.textContent = `${summary.totalItems.toFixed(1)} Items`;
  if (flowersEl) {
    flowersEl.innerHTML = `${summary.totalFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
  }

  const breakdownContainer = document.getElementById('weekly-item-breakdown');
  if (breakdownContainer) {
    const entries = Object.entries(summary.cropBreakdown);
    if (entries.length === 0) {
      breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-3">No harvests recorded for this calendar week.</div>';
    } else {
      let html = '';
      entries.sort((a, b) => b[1].qty - a[1].qty).forEach(([cropName, data]) => {
        html += `
          <div class="flex justify-between items-center p-1.5 bg-amber-50 rounded border border-amber-200/60">
            <span class="font-bold text-sfl-dirt">${cropName}</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="font-bold text-sfl-wood">+${data.qty.toFixed(1)}</span>
              <span class="text-[10px] text-sfl-green font-semibold flex items-center gap-1">(${data.flowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML})</span>
            </div>
          </div>
        `;
      });
      breakdownContainer.innerHTML = html;
    }
  }
}

export function initWeeklySummaryModal() {
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
