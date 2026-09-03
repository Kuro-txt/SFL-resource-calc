import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getTradeAmounts } from './tradeData.js';

export function renderTradeSummaryMetrics(profileData) {
  if (!profileData) return;
  const user = profileData.username || `Farm #${profileData.id || ''}`;
  const level = profileData.level || '-';
  const totalTradesCount = profileData.totalTrades || 0;

  const trades = profileData.trades || [];
  const listings = Object.values(profileData.listings || {});
  const offers = Object.values(profileData.offers || {});

  const farmId = String(profileData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  const now = Date.now();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Calculate Monday to Sunday of the current week
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon, 2 is Tue ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() + diffToMonday);
  currentWeekMonday.setHours(0, 0, 0, 0);

  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
  currentWeekSunday.setHours(23, 59, 59, 999);

  const mondayTime = currentWeekMonday.getTime();
  const sundayTime = currentWeekSunday.getTime();

  // Start of current month (1st of month at 00:00:00)
  const monthStartTime = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).getTime();

  let todaySales = 0, todayBuys = 0, todayCount = 0;
  let weekSales = 0, weekBuys = 0, weekCount = 0;
  let monthSales = 0, monthBuys = 0, monthCount = 0;
  let totalSales = 0, totalBuys = 0;

  trades.forEach(t => {
    const { isSeller, netSfl, grossSfl } = getTradeAmounts(t, farmId);
    const time = Number(t.fulfilledAt || 0);

    let isToday = false;
    if (time > 0) {
      const d = new Date(time);
      if (!isNaN(d.getTime())) {
        const dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dKey === todayKey) isToday = true;
      }
    }

    const isThisWeek = time >= mondayTime && time <= sundayTime;
    const isThisMonth = time >= monthStartTime;

    if (isSeller) {
      totalSales += netSfl;
      if (isToday) { todaySales += netSfl; todayCount++; }
      if (isThisWeek) { weekSales += netSfl; weekCount++; }
      if (isThisMonth) { monthSales += netSfl; monthCount++; }
    } else {
      totalBuys += grossSfl;
      if (isToday) { todayBuys += grossSfl; todayCount++; }
      if (isThisWeek) { weekBuys += grossSfl; weekCount++; }
      if (isThisMonth) { monthBuys += grossSfl; monthCount++; }
    }
  });

  const userSummaryEl = document.getElementById('trade-user-summary');
  if (userSummaryEl) {
    userSummaryEl.textContent = `Player: ${user} • Level: ${level} • Lifetime Market Volume: ${totalTradesCount.toLocaleString()} trades`;
  }

  // 1. TODAY
  const todayNet = todaySales - todayBuys;
  const todayNetEl = document.getElementById('trade-metric-today-net');
  if (todayNetEl) {
    todayNetEl.className = `text-lg font-black font-mono ${todayNet > 0 ? 'text-sfl-green' : (todayNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood')}`;
    todayNetEl.innerHTML = `${todayNet >= 0 ? '+' : ''}${todayNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  }
  const todayCountEl = document.getElementById('trade-metric-today-count');
  if (todayCountEl) todayCountEl.textContent = `${todayCount} ${todayCount === 1 ? 'trade' : 'trades'}`;
  const todaySalesEl = document.getElementById('trade-metric-today-sales');
  if (todaySalesEl) todaySalesEl.textContent = `+${todaySales.toFixed(3)}`;
  const todayBuysEl = document.getElementById('trade-metric-today-buys');
  if (todayBuysEl) todayBuysEl.textContent = `-${todayBuys.toFixed(3)}`;

  // 2. WEEK
  const weekNet = weekSales - weekBuys;
  const weekNetEl = document.getElementById('trade-metric-week-net');
  if (weekNetEl) {
    weekNetEl.className = `text-lg font-black font-mono ${weekNet > 0 ? 'text-sfl-green' : (weekNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood')}`;
    weekNetEl.innerHTML = `${weekNet >= 0 ? '+' : ''}${weekNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  }
  const weekCountEl = document.getElementById('trade-metric-week-count');
  if (weekCountEl) weekCountEl.textContent = `${weekCount} ${weekCount === 1 ? 'trade' : 'trades'}`;
  const weekSalesEl = document.getElementById('trade-metric-week-sales');
  if (weekSalesEl) weekSalesEl.textContent = `+${weekSales.toFixed(3)}`;
  const weekBuysEl = document.getElementById('trade-metric-week-buys');
  if (weekBuysEl) weekBuysEl.textContent = `-${weekBuys.toFixed(3)}`;

  // 3. MONTH
  const monthNet = monthSales - monthBuys;
  const monthNetEl = document.getElementById('trade-metric-month-net');
  if (monthNetEl) {
    monthNetEl.className = `text-lg font-black font-mono ${monthNet > 0 ? 'text-sfl-green' : (monthNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood')}`;
    monthNetEl.innerHTML = `${monthNet >= 0 ? '+' : ''}${monthNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  }
  const monthCountEl = document.getElementById('trade-metric-month-count');
  if (monthCountEl) monthCountEl.textContent = `${monthCount} ${monthCount === 1 ? 'trade' : 'trades'}`;
  const monthSalesEl = document.getElementById('trade-metric-month-sales');
  if (monthSalesEl) monthSalesEl.textContent = `+${monthSales.toFixed(3)}`;
  const monthBuysEl = document.getElementById('trade-metric-month-buys');
  if (monthBuysEl) monthBuysEl.textContent = `-${monthBuys.toFixed(3)}`;

  // 4. CLOUD ARCHIVE
  const totalTradesEl = document.getElementById('trade-metric-total-trades');
  if (totalTradesEl) totalTradesEl.textContent = `${trades.length.toLocaleString()}`;
  const lifetimeSalesEl = document.getElementById('trade-metric-lifetime-sales');
  if (lifetimeSalesEl) lifetimeSalesEl.textContent = `+${totalSales.toFixed(3)}`;
  const lifetimeBuysEl = document.getElementById('trade-metric-lifetime-buys');
  if (lifetimeBuysEl) lifetimeBuysEl.textContent = `-${totalBuys.toFixed(3)}`;

  document.getElementById('subtab-trades-count').textContent = trades.length;
  document.getElementById('subtab-listings-count').textContent = listings.length;
  document.getElementById('subtab-offers-count').textContent = offers.length;
}
