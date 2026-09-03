import { renderCurrentView } from './index.js';
import { getTradeAmounts } from './tradeData.js';

export let currentView = 'trades';
export let currentFilter = 'all';

export function switchSubTab(tab) {
  currentView = tab;
  const subtabBtns = document.querySelectorAll('.trade-subtab-btn');
  subtabBtns.forEach(btn => {
    btn.className = "trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60";
  });

  const activeBtn = document.getElementById(`subtab-${tab}-btn`);
  if (activeBtn) {
    activeBtn.className = "trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-sfl-dirt bg-sfl-wood text-amber-200 shadow-xs";
  }

  const filterBar = document.getElementById('trade-filters-bar');
  if (filterBar) {
    if (tab === 'trades' || tab === 'calendar') filterBar.classList.remove('hidden');
    else filterBar.classList.add('hidden');
  }

  renderCurrentView();
}

export function setTradeFilter(filter) {
  currentFilter = filter;
  const filterBtns = document.querySelectorAll('.trade-filter-btn');
  filterBtns.forEach(btn => {
    btn.className = "trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50";
  });

  const activeBtn = document.getElementById(`trade-filter-${filter}`);
  if (activeBtn) {
    activeBtn.className = "trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs";
  }

  renderCurrentView();
}

export function buildTradesDateMap(trades, farmId) {
  const map = new Map();

  trades.forEach(t => {
    const rawTime = t.fulfilledAt;
    if (!rawTime) return;

    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        year: yyyy,
        month: d.getMonth(),
        day: d.getDate(),
        dateObj: d,
        trades: [],
        totalSold: 0,
        totalBought: 0,
        soldCount: 0,
        boughtCount: 0
      });
    }

    const dayObj = map.get(dateKey);
    const amounts = getTradeAmounts(t, farmId);
    const qty = parseFloat(t.quantity || 1);

    if (amounts.isSeller) {
      dayObj.totalSold += amounts.netSfl;
      dayObj.grossSold = (dayObj.grossSold || 0) + amounts.grossSfl;
      dayObj.totalTax = (dayObj.totalTax || 0) + amounts.tax;
      dayObj.soldCount += qty;
    } else {
      dayObj.totalBought += amounts.grossSfl;
      dayObj.boughtCount += qty;
    }

    dayObj.trades.push(t);
  });

  return map;
}

export function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = (day === 0 ? -6 : 1 - day) + (offset * 7);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}
