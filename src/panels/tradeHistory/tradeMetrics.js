import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getTradeAmounts } from './tradeData.js';

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

  // Unwrap potential nested farm objects
  const root = farmObj.farm || farmObj.data || farmObj;

  // Flatten potential activity dictionaries
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

  // Fallback: case-insensitive scan if any is still 0
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

export function renderTradeSummaryMetrics(profileData, farmData = null) {
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
    todayNetEl.className = `text-lg font-black font-mono ${todayNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (todayNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
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
    weekNetEl.className = `text-lg font-black font-mono ${weekNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (weekNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
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
    monthNetEl.className = `text-lg font-black font-mono ${monthNet > 0 ? 'text-sfl-green dark:text-emerald-400' : (monthNet < 0 ? 'text-sfl-accent dark:text-rose-400' : 'text-sfl-wood dark:text-amber-100')}`;
    monthNetEl.innerHTML = `${monthNet >= 0 ? '+' : ''}${monthNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  }
  const monthCountEl = document.getElementById('trade-metric-month-count');
  if (monthCountEl) monthCountEl.textContent = `${monthCount} ${monthCount === 1 ? 'trade' : 'trades'}`;
  const monthSalesEl = document.getElementById('trade-metric-month-sales');
  if (monthSalesEl) monthSalesEl.textContent = `+${monthSales.toFixed(3)}`;
  const monthBuysEl = document.getElementById('trade-metric-month-buys');
  if (monthBuysEl) monthBuysEl.textContent = `-${monthBuys.toFixed(3)}`;

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

  // Cache in localStorage for immediate rendering on future loads
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

  document.getElementById('subtab-trades-count').textContent = trades.length;
  document.getElementById('subtab-listings-count').textContent = listings.length;
  document.getElementById('subtab-offers-count').textContent = offers.length;
}
