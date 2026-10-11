import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getTradeAmounts, currentSflUsdRate, tradeHistoryData } from './tradeData.js';
import { isTradeResource, filterResources, filterNfts } from './tradeFilters.js';

export function extractFarmTransferMetrics(farmObj) {
  if (!farmObj || typeof farmObj !== 'object') {
    return {
      withdrawn: 0,
      deposited: 0,
      withdrawStarted: 0,
      depositStarted: 0,
      net: 0
    };
  }

  const root = farmObj.farm || farmObj.data || farmObj;

  const activity = {
    ...(root.bumpkin?.activity || {}),
    ...(root.activity || {}),
    ...(root.farmActivity || {}),
    ...root
  };

  const getNum = (keys) => {
    for (const k of keys) {
      if (activity[k] !== undefined && activity[k] !== null) {
        const val = typeof activity[k] === 'number' ? activity[k] : parseFloat(activity[k]);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  };

  let withdrawn = getNum([
    'FLOWER Withdrawn',
    'Flower Withdrawn',
    'flower Withdrawn',
    'SFL Withdrawn',
    'sfl Withdrawn'
  ]);

  let deposited = getNum([
    'FLOWER Deposited',
    'Flower Deposited',
    'flower Deposited',
    'SFL Deposited',
    'sfl Deposited'
  ]);

  let withdrawStarted = getNum([
    'FLOWER Withdraw Started',
    'Flower Withdraw Started',
    'flower Withdraw Started',
    'SFL Withdraw Started',
    'sfl Withdraw Started'
  ]);

  let depositStarted = getNum([
    'FLOWER Deposit Started',
    'Flower Deposit Started',
    'flower Deposit Started',
    'SFL Deposit Started',
    'sfl Deposit Started'
  ]);

  if (!withdrawn || !deposited || !withdrawStarted || !depositStarted) {
    for (const [key, val] of Object.entries(activity)) {
      if (val === undefined || val === null) continue;
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(num)) continue;

      const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!withdrawn && norm.includes('withdrawn') && (norm.includes('flower') || norm.includes('sfl'))) {
        withdrawn = num;
      } else if (!deposited && norm.includes('deposited') && (norm.includes('flower') || norm.includes('sfl'))) {
        deposited = num;
      } else if (!withdrawStarted && (norm.includes('withdrawstarted') || (norm.includes('withdraw') && norm.includes('start')))) {
        withdrawStarted = Math.round(num);
      } else if (!depositStarted && (norm.includes('depositstarted') || (norm.includes('deposit') && norm.includes('start')))) {
        depositStarted = Math.round(num);
      }
    }
  }

  const net = deposited - withdrawn;

  return {
    withdrawn,
    deposited,
    withdrawStarted: Math.round(withdrawStarted),
    depositStarted: Math.round(depositStarted),
    net
  };
}

if (typeof window !== 'undefined') {
  window.extractFarmTransferMetrics = extractFarmTransferMetrics;
}

// Option B navigation caps
export const MAX_DAY_OFFSET = -30;
export const MAX_WEEK_OFFSET = -12;
export const MAX_MONTH_OFFSET = -24;

export let dayOffset = 0;
export let weekOffset = 0;
export let monthOffset = 0;

export function stepDayOffset(delta) {
  const next = dayOffset + delta;
  if (next > 0 || next < MAX_DAY_OFFSET) return;
  dayOffset = next;
  renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
}

export function stepWeekOffset(delta) {
  const next = weekOffset + delta;
  if (next > 0 || next < MAX_WEEK_OFFSET) return;
  weekOffset = next;
  renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
}

export function stepMonthOffset(delta) {
  const next = monthOffset + delta;
  if (next > 0 || next < MAX_MONTH_OFFSET) return;
  monthOffset = next;
  renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
}

export function resetPeriodOffsets() {
  dayOffset = 0;
  weekOffset = 0;
  monthOffset = 0;
  renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
}

export function getDayWindow(offset = 0) {
  const target = new Date();
  target.setDate(target.getDate() + offset);
  const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

  let label = 'Today';
  if (offset === -1) {
    label = 'Yesterday';
  } else if (offset < -1) {
    label = target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return { start: start.getTime(), end: end.getTime(), label };
}

export function getWeekWindow(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + (offset * 7);

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  let label = 'This Week (Mon–Sun)';
  if (offset === -1) {
    label = 'Last Week';
  } else if (offset < -1) {
    const mStr = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const sStr = sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    label = `${mStr} – ${sStr}`;
  }
  return { start: monday.getTime(), end: sunday.getTime(), label };
}

export function getMonthWindow(offset = 0) {
  const today = new Date();
  const targetYear = today.getFullYear();
  const targetMonth = today.getMonth() + offset;

  const start = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

  let label = 'This Month';
  if (offset === 0) {
    label = `This Month (${start.toLocaleDateString(undefined, { month: 'short' })})`;
  } else if (offset === -1) {
    label = `Last Month (${start.toLocaleDateString(undefined, { month: 'short' })})`;
  } else {
    label = start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  return { start: start.getTime(), end: end.getTime(), label };
}

export function renderTradeSummaryMetrics(profileData, farmData = null) {
  if (!profileData) return;
  const user = profileData.username || `Farm #${profileData.id || ''}`;
  const level = profileData.level || '-';
  const totalTradesCount = profileData.totalTrades || 0;

  const trades = profileData.trades || [];
  const listings = Object.values(profileData.listings || {});
  const offers = Object.values(profileData.offers || {});

  const farmId = String(profileData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  const dayWin = getDayWindow(dayOffset);
  const weekWin = getWeekWindow(weekOffset);
  const monthWin = getMonthWindow(monthOffset);

  let todaySales = 0, todayBuys = 0, todayCount = 0, todaySalesUsd = 0, todayBuysUsd = 0;
  let weekSales = 0, weekBuys = 0, weekCount = 0, weekSalesUsd = 0, weekBuysUsd = 0;
  let monthSales = 0, monthBuys = 0, monthCount = 0, monthSalesUsd = 0, monthBuysUsd = 0;
  let totalSales = 0, totalBuys = 0;
  let filteredTotalTrades = 0;

  trades.forEach(t => {
    const isRes = isTradeResource(t);
    if (!filterResources && isRes) return;
    if (!filterNfts && !isRes) return;
    filteredTotalTrades++;

    const { isSeller, netSfl, grossSfl } = getTradeAmounts(t, farmId);
    const time = Number(t.fulfilledAt || 0);

    const sflUsd = parseFloat(t.sflUsd || t.sfl_usd) || currentSflUsdRate || 0;
    const tradeUsd = sflUsd > 0 ? ((isSeller ? netSfl : grossSfl) * sflUsd) : 0;

    const isThisDay = (time >= dayWin.start && time <= dayWin.end);
    const isThisWeek = (time >= weekWin.start && time <= weekWin.end);
    const isThisMonth = (time >= monthWin.start && time <= monthWin.end);

    if (isSeller) {
      totalSales += netSfl;
      if (isThisDay) { todaySales += netSfl; todaySalesUsd += tradeUsd; todayCount++; }
      if (isThisWeek) { weekSales += netSfl; weekSalesUsd += tradeUsd; weekCount++; }
      if (isThisMonth) { monthSales += netSfl; monthSalesUsd += tradeUsd; monthCount++; }
    } else {
      totalBuys += grossSfl;
      if (isThisDay) { todayBuys += grossSfl; todayBuysUsd += tradeUsd; todayCount++; }
      if (isThisWeek) { weekBuys += grossSfl; weekBuysUsd += tradeUsd; weekCount++; }
      if (isThisMonth) { monthBuys += grossSfl; monthBuysUsd += tradeUsd; monthCount++; }
    }
  });

  const userSummaryEl = document.getElementById('trade-user-summary');
  if (userSummaryEl) {
    const rateNote = currentSflUsdRate > 0 ? ` • 1 🌸 = $${currentSflUsdRate.toFixed(4)} USD` : '';
    userSummaryEl.textContent = `Player: ${user} • Level: ${level} • Lifetime Market Volume: ${totalTradesCount.toLocaleString()} trades${rateNote}`;
  }

  // 1. TODAY / DAY CARD
  const todayNet = todaySales - todayBuys;
  const todayNetUsd = todaySalesUsd - todayBuysUsd;
  const todayNetEl = document.getElementById('trade-metric-today-net');
  if (todayNetEl) {
    todayNetEl.className = `text-lg font-black font-mono ${todayNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (todayNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
    const usdSub = Math.abs(todayNetUsd) > 0 ? ` <span class="text-xs font-semibold opacity-85">(${todayNetUsd >= 0 ? '+' : '-'}$${Math.abs(todayNetUsd).toFixed(2)})</span>` : '';
    todayNetEl.innerHTML = `${todayNet >= 0 ? '+' : ''}${todayNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}${usdSub}`;
  }
  const todayCountEl = document.getElementById('trade-metric-today-count');
  if (todayCountEl) todayCountEl.textContent = `${todayCount} ${todayCount === 1 ? 'trade' : 'trades'}`;
  const todaySalesEl = document.getElementById('trade-metric-today-sales');
  if (todaySalesEl) {
    const sUsd = todaySalesUsd > 0 ? ` ($${todaySalesUsd.toFixed(2)})` : '';
    todaySalesEl.textContent = `+${todaySales.toFixed(3)}${sUsd}`;
  }
  const todayBuysEl = document.getElementById('trade-metric-today-buys');
  if (todayBuysEl) {
    const bUsd = todayBuysUsd > 0 ? ` ($${todayBuysUsd.toFixed(2)})` : '';
    todayBuysEl.textContent = `-${todayBuys.toFixed(3)}${bUsd}`;
  }

  // 2. WEEK CARD
  const weekNet = weekSales - weekBuys;
  const weekNetUsd = weekSalesUsd - weekBuysUsd;
  const weekNetEl = document.getElementById('trade-metric-week-net');
  if (weekNetEl) {
    weekNetEl.className = `text-lg font-black font-mono ${weekNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (weekNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
    const usdSub = Math.abs(weekNetUsd) > 0 ? ` <span class="text-xs font-semibold opacity-85">(${weekNetUsd >= 0 ? '+' : '-'}$${Math.abs(weekNetUsd).toFixed(2)})</span>` : '';
    weekNetEl.innerHTML = `${weekNet >= 0 ? '+' : ''}${weekNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}${usdSub}`;
  }
  const weekCountEl = document.getElementById('trade-metric-week-count');
  if (weekCountEl) weekCountEl.textContent = `${weekCount} ${weekCount === 1 ? 'trade' : 'trades'}`;
  const weekSalesEl = document.getElementById('trade-metric-week-sales');
  if (weekSalesEl) {
    const wsUsd = weekSalesUsd > 0 ? ` ($${weekSalesUsd.toFixed(2)})` : '';
    weekSalesEl.textContent = `+${weekSales.toFixed(3)}${wsUsd}`;
  }
  const weekBuysEl = document.getElementById('trade-metric-week-buys');
  if (weekBuysEl) {
    const wbUsd = weekBuysUsd > 0 ? ` ($${weekBuysUsd.toFixed(2)})` : '';
    weekBuysEl.textContent = `-${weekBuys.toFixed(3)}${wbUsd}`;
  }

  // 3. MONTH CARD
  const monthNet = monthSales - monthBuys;
  const monthNetUsd = monthSalesUsd - monthBuysUsd;
  const monthNetEl = document.getElementById('trade-metric-month-net');
  if (monthNetEl) {
    monthNetEl.className = `text-lg font-black font-mono ${monthNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (monthNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
    const usdSub = Math.abs(monthNetUsd) > 0 ? ` <span class="text-xs font-semibold opacity-85">(${monthNetUsd >= 0 ? '+' : '-'}$${Math.abs(monthNetUsd).toFixed(2)})</span>` : '';
    monthNetEl.innerHTML = `${monthNet >= 0 ? '+' : ''}${monthNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}${usdSub}`;
  }
  const monthCountEl = document.getElementById('trade-metric-month-count');
  if (monthCountEl) monthCountEl.textContent = `${monthCount} ${monthCount === 1 ? 'trade' : 'trades'}`;
  const monthSalesEl = document.getElementById('trade-metric-month-sales');
  if (monthSalesEl) {
    const msUsd = monthSalesUsd > 0 ? ` ($${monthSalesUsd.toFixed(2)})` : '';
    monthSalesEl.textContent = `+${monthSales.toFixed(3)}${msUsd}`;
  }
  const monthBuysEl = document.getElementById('trade-metric-month-buys');
  if (monthBuysEl) {
    const mbUsd = monthBuysUsd > 0 ? ` ($${monthBuysUsd.toFixed(2)})` : '';
    monthBuysEl.textContent = `-${monthBuys.toFixed(3)}${mbUsd}`;
  }

  // 4. ON-CHAIN FLOWER TRANSFERS (DEPOSITS & WITHDRAWALS)
  let transfers = null;
  if (farmData) {
    transfers = extractFarmTransferMetrics(farmData);
  } else if (window.farmData) {
    transfers = extractFarmTransferMetrics(window.farmData);
  } else {
    try {
      const saved = localStorage.getItem('sfl_farm_transfers');
      if (saved) transfers = JSON.parse(saved);
    } catch (_) {}
  }

  if (!transfers) {
    transfers = {
      withdrawn: 0,
      deposited: 0,
      withdrawStarted: 0,
      depositStarted: 0,
      net: 0
    };
  }

  try {
    localStorage.setItem('sfl_farm_transfers', JSON.stringify(transfers));
  } catch (_) {}

  const totalTransfers = transfers.depositStarted + transfers.withdrawStarted;
  const transfersCountEl = document.getElementById('trade-metric-transfers-count');
  if (transfersCountEl) {
    transfersCountEl.textContent = `${totalTransfers} total`;
    transfersCountEl.title = `${transfers.depositStarted} deposits, ${transfers.withdrawStarted} withdrawals`;
  }

  const depositStartedEl = document.getElementById('trade-metric-deposit-started');
  if (depositStartedEl) {
    depositStartedEl.textContent = `${transfers.depositStarted}`;
  }

  const flowerDepositedEl = document.getElementById('trade-metric-flower-deposited');
  if (flowerDepositedEl) {
    flowerDepositedEl.innerHTML = `+${transfers.deposited.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
    flowerDepositedEl.title = `Total Deposited: +${transfers.deposited} Flower (${transfers.depositStarted} deposits)`;
  }

  const withdrawStartedEl = document.getElementById('trade-metric-withdraw-started');
  if (withdrawStartedEl) {
    withdrawStartedEl.textContent = `${transfers.withdrawStarted}`;
  }

  const flowerWithdrawnEl = document.getElementById('trade-metric-flower-withdrawn');
  if (flowerWithdrawnEl) {
    flowerWithdrawnEl.innerHTML = `-${transfers.withdrawn.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
    flowerWithdrawnEl.title = `Total Withdrawn: -${transfers.withdrawn} Flower (${transfers.withdrawStarted} withdrawals)`;
  }

  // Update navigation button states & labels
  const dayLabelEl = document.getElementById('day-nav-label');
  if (dayLabelEl) dayLabelEl.textContent = dayWin.label;
  const dayPrevBtn = document.getElementById('day-nav-prev');
  if (dayPrevBtn) dayPrevBtn.disabled = (dayOffset <= MAX_DAY_OFFSET);
  const dayNextBtn = document.getElementById('day-nav-next');
  if (dayNextBtn) dayNextBtn.disabled = (dayOffset >= 0);

  const weekLabelEl = document.getElementById('week-nav-label');
  if (weekLabelEl) weekLabelEl.textContent = weekWin.label;
  const weekPrevBtn = document.getElementById('week-nav-prev');
  if (weekPrevBtn) weekPrevBtn.disabled = (weekOffset <= MAX_WEEK_OFFSET);
  const weekNextBtn = document.getElementById('week-nav-next');
  if (weekNextBtn) weekNextBtn.disabled = (weekOffset >= 0);

  const monthLabelEl = document.getElementById('month-nav-label');
  if (monthLabelEl) monthLabelEl.textContent = monthWin.label;
  const monthPrevBtn = document.getElementById('month-nav-prev');
  if (monthPrevBtn) monthPrevBtn.disabled = (monthOffset <= MAX_MONTH_OFFSET);
  const monthNextBtn = document.getElementById('month-nav-next');
  if (monthNextBtn) monthNextBtn.disabled = (monthOffset >= 0);

  const resetBtn = document.getElementById('trade-reset-periods-btn');
  if (resetBtn) {
    if (dayOffset !== 0 || weekOffset !== 0 || monthOffset !== 0) {
      resetBtn.classList.remove('hidden');
    } else {
      resetBtn.classList.add('hidden');
    }
  }

  const tradesCountEl = document.getElementById('subtab-trades-count');
  if (tradesCountEl) {
    tradesCountEl.textContent = filteredTotalTrades;
  }
  const listingsCountEl = document.getElementById('subtab-listings-count');
  if (listingsCountEl) listingsCountEl.textContent = listings.length;
  const offersCountEl = document.getElementById('subtab-offers-count');
  if (offersCountEl) offersCountEl.textContent = offers.length;
}
