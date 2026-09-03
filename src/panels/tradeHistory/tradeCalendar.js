import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { tradeHistoryData } from './tradeData.js';
import { buildTradesDateMap, getWeekRange } from './tradeFilters.js';
import { generateSvgChart } from './tradeChart.js';
import { renderSelectedDayTradesTable } from './tradeTableView.js';

export let calendarViewMode = 'day';
export let calendarCurrentMonth = new Date().getMonth();
export let calendarCurrentYear = new Date().getFullYear();
export let calendarWeekOffset = 0;
export let calendarQuarterOffset = 0;
export let selectedCalendarDateKey = null;

export function renderCalendarMainView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];
  const tradesMap = buildTradesDateMap(trades, farmId);

  // Set default selected date if empty
  if (!selectedCalendarDateKey) {
    const sortedKeys = Array.from(tradesMap.keys()).sort().reverse();
    if (sortedKeys.length > 0) {
      selectedCalendarDateKey = sortedKeys[0];
      const recentDate = tradesMap.get(selectedCalendarDateKey)?.dateObj;
      if (recentDate) {
        calendarCurrentMonth = recentDate.getMonth();
        calendarCurrentYear = recentDate.getFullYear();
      }
    } else {
      const today = new Date();
      selectedCalendarDateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
  }

  // Top Mode Switcher Bar (By Day, By Week, By Month, By 3 Months)
  let topModeBarHtml = `
    <div class="p-2.5 bg-amber-50/90 border-b-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs font-bold text-sfl-woodLight uppercase mr-1">View:</span>
        <button data-cal-mode="day" class="cal-mode-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === 'day' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📅 Day
        </button>
        <button data-cal-mode="week" class="cal-mode-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === 'week' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📊 Week
        </button>
        <button data-cal-mode="month" class="cal-mode-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === 'month' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          🗓️ Month
        </button>
        <button data-cal-mode="3month" class="cal-mode-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === '3month' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📈 3 Months
        </button>
      </div>

      <div class="text-[11px] font-bold text-sfl-woodLight">
        Click any day to inspect completed trades and exact net flow
      </div>
    </div>
  `;

  if (calendarViewMode === 'day') {
    renderByDayView(mountEl, tradesMap, farmId, topModeBarHtml);
  } else if (calendarViewMode === 'week') {
    renderByWeekView(mountEl, tradesMap, farmId, topModeBarHtml);
  } else if (calendarViewMode === 'month') {
    renderByMonthView(mountEl, tradesMap, farmId, topModeBarHtml);
  } else if (calendarViewMode === '3month') {
    renderBy3MonthView(mountEl, tradesMap, farmId, topModeBarHtml);
  }
}

export function renderByDayView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const selectedDayData = tradesMap.get(selectedCalendarDateKey) || {
    totalSold: 0,
    totalBought: 0,
    trades: []
  };

  const daySold = selectedDayData.totalSold || 0;
  const daySpend = selectedDayData.totalBought || 0;
  const dayNet = daySold - daySpend;
  const netSign = dayNet >= 0 ? '+' : '';
  const netColor = dayNet > 0 ? 'text-sfl-green' : (dayNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  let dayDisplayTitle = selectedCalendarDateKey;
  if (selectedDayData?.dateObj) {
    dayDisplayTitle = selectedDayData.dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  } else if (selectedCalendarDateKey) {
    const parts = selectedCalendarDateKey.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        dayDisplayTitle = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  }

  // 1. TOP METRICS ROW
  const dayMetricsHtml = `
    <div class="p-3 bg-white/90 border-b border-sfl-cardBorder">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <span class="text-xs font-bold text-sfl-dirt flex items-center gap-1.5">
          <span>📅</span> Selected Day: <strong>${dayDisplayTitle}</strong>
        </span>
        <span class="bg-amber-100 text-sfl-wood text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
          ${selectedDayData.trades.length} ${selectedDayData.trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🟢 Flower from Sales</span>
          <span class="text-sm sm:text-base font-black text-sfl-green font-mono">+${daySold.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🔵 Flower Spent</span>
          <span class="text-sm sm:text-base font-black text-sfl-wood font-mono">-${daySpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">⚖️ Net Flower</span>
          <span class="text-sm sm:text-base font-black ${netColor} font-mono">${netSign}${dayNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>
      </div>
    </div>
  `;

  // 2. 14-DAY GRAPH TREND
  const recent14Days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const item = tradesMap.get(key) || { totalSold: 0, totalBought: 0 };
    recent14Days.push({
      label: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      sold: item.totalSold || 0,
      spent: item.totalBought || 0,
      net: (item.totalSold || 0) - (item.totalBought || 0)
    });
  }
  const graphHtml = generateSvgChart(recent14Days, 100);

  // 3. COMPACT MONTH GRID VIEW
  const monthDate = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  const monthName = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const monthGridNavHtml = `
    <div class="p-2.5 bg-amber-100/60 border-b border-sfl-cardBorder flex justify-between items-center">
      <div class="flex items-center gap-1.5">
        <button id="cal-prev-month" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          ◀ Prev
        </button>
        <span class="font-bold text-sfl-wood text-xs sm:text-sm px-2">
          ${monthName}
        </span>
        <button id="cal-next-month" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          Next ▶
        </button>
      </div>

      <button id="cal-today-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
        Today
      </button>
    </div>
  `;

  const calendarGridHtml = renderSingleMonthGrid(calendarCurrentYear, calendarCurrentMonth, tradesMap);

  // 4. COMPLETED TRADES TABLE
  const tradesTableHtml = renderSelectedDayTradesTable(dayDisplayTitle, selectedDayData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${dayMetricsHtml}
    ${graphHtml}
    ${monthGridNavHtml}
    <div class="p-2 sm:p-3 bg-white/60">
      ${calendarGridHtml}
    </div>
    ${tradesTableHtml}
  `;

  bindGenericCalendarEvents(mountEl, farmId);
}

export function renderByWeekView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const { monday, sunday } = getWeekRange(calendarWeekOffset);
  const weekTitle = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const weekDays = [];
  let weekSales = 0;
  let weekSpend = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayData = tradesMap.get(key) || {
      dateKey: key,
      dateObj: d,
      totalSold: 0,
      totalBought: 0,
      trades: []
    };

    weekSales += dayData.totalSold || 0;
    weekSpend += dayData.totalBought || 0;

    weekDays.push({ key, dateObj: d, dayData });
  }

  const weekNet = weekSales - weekSpend;
  const netSign = weekNet >= 0 ? '+' : '';
  const netColor = weekNet > 0 ? 'text-sfl-green' : (weekNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  // Week Navigation
  const weekNavHtml = `
    <div class="p-2.5 bg-amber-100/60 border-b border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div class="flex items-center gap-1.5">
        <button id="cal-prev-week" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          ◀ Previous Week
        </button>
        <span class="font-bold text-sfl-wood text-xs sm:text-sm px-2">
          <span>🗓️</span> ${weekTitle} ${calendarWeekOffset === 0 ? '<span class="ml-1 text-[9px] bg-amber-200 text-sfl-dirt px-1.5 py-0.2 rounded font-black">THIS WEEK</span>' : ''}
        </span>
        <button id="cal-next-week" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          Next Week ▶
        </button>
      </div>

      <button id="cal-current-week-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
        This Week
      </button>
    </div>
  `;

  // Week Metrics
  const weekMetricsHtml = `
    <div class="p-3 bg-white/90 border-b border-sfl-cardBorder">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🟢 Weekly Sales</span>
          <span class="text-sm sm:text-base font-black text-sfl-green font-mono">+${weekSales.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🔵 Weekly Spent</span>
          <span class="text-sm sm:text-base font-black text-sfl-wood font-mono">-${weekSpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">⚖️ Weekly Net Flower</span>
          <span class="text-sm sm:text-base font-black ${netColor} font-mono">${netSign}${weekNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>
      </div>
    </div>
  `;

  // Weekly Graph
  const weekGraphPoints = weekDays.map(({ key, dateObj, dayData }) => ({
    label: dateObj.toLocaleDateString(undefined, { weekday: 'short' }),
    sold: dayData.totalSold || 0,
    spent: dayData.totalBought || 0,
    net: (dayData.totalSold || 0) - (dayData.totalBought || 0)
  }));
  const graphHtml = generateSvgChart(weekGraphPoints, 100);

  // 7-Day Compact Cards Strip
  let dayCardsHtml = '';
  weekDays.forEach(({ key, dateObj, dayData }) => {
    const isSelected = selectedCalendarDateKey === key;
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = dateObj.getDate();
    const count = dayData.trades.length;
    const s = dayData.totalSold || 0;
    const b = dayData.totalBought || 0;
    const n = s - b;
    const nColor = n > 0 ? 'text-sfl-green' : (n < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

    dayCardsHtml += `
      <div data-day-key="${key}" class="cal-day-cell flex-1 min-w-[105px] p-2 rounded-lg border transition cursor-pointer shadow-2xs ${isSelected ? 'border-sfl-gold bg-amber-100 dark:bg-amber-950/60 ring-2 ring-sfl-gold' : 'border-sfl-cardBorder bg-white hover:bg-amber-50'}">
        <div class="flex justify-between items-center mb-1">
          <span class="font-black text-xs text-sfl-wood">${dayName} ${dayNum}</span>
          ${count > 0 ? `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-sfl-dirt border border-amber-300">${count}t</span>` : ''}
        </div>
        <div class="text-[10px] font-mono space-y-0.5">
          <span class="block text-sfl-green font-semibold leading-tight">+${s.toFixed(1)}</span>
          <span class="block text-sfl-wood font-semibold leading-tight">-${b.toFixed(1)}</span>
          <span class="block ${nColor} font-black border-t border-sfl-cardBorder/40 pt-0.5 leading-tight">
            ${n >= 0 ? '+' : ''}${n.toFixed(1)}
          </span>
        </div>
      </div>
    `;
  });

  const weekStripHtml = `
    <div class="p-2 sm:p-3 bg-amber-50/40 border-b border-sfl-cardBorder">
      <div class="flex gap-2 overflow-x-auto pb-1">
        ${dayCardsHtml}
      </div>
    </div>
  `;

  // Selected Day Trades
  const selectedDayData = tradesMap.get(selectedCalendarDateKey) || { totalSold: 0, totalBought: 0, trades: [] };
  let selectedTitle = selectedCalendarDateKey;
  if (selectedDayData?.dateObj) {
    selectedTitle = selectedDayData.dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const tradesTableHtml = renderSelectedDayTradesTable(selectedTitle, selectedDayData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${weekNavHtml}
    ${weekMetricsHtml}
    ${graphHtml}
    ${weekStripHtml}
    ${tradesTableHtml}
  `;

  bindGenericCalendarEvents(mountEl, farmId);
}

export function renderByMonthView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const monthDate = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  const monthName = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();

  let monthSales = 0;
  let monthSpend = 0;
  let monthTradesCount = 0;
  const monthDailyPoints = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calendarCurrentMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${calendarCurrentYear}-${mm}-${dd}`;
    const dayData = tradesMap.get(key) || { totalSold: 0, totalBought: 0, trades: [] };

    monthSales += dayData.totalSold || 0;
    monthSpend += dayData.totalBought || 0;
    monthTradesCount += dayData.trades.length;

    monthDailyPoints.push({
      label: String(d),
      sold: dayData.totalSold || 0,
      spent: dayData.totalBought || 0,
      net: (dayData.totalSold || 0) - (dayData.totalBought || 0)
    });
  }

  const monthNet = monthSales - monthSpend;
  const netSign = monthNet >= 0 ? '+' : '';
  const netColor = monthNet > 0 ? 'text-sfl-green' : (monthNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  const monthNavHtml = `
    <div class="p-2.5 bg-amber-100/60 border-b border-sfl-cardBorder flex justify-between items-center">
      <div class="flex items-center gap-1.5">
        <button id="cal-prev-month" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          ◀ Prev Month
        </button>
        <span class="font-bold text-sfl-wood text-xs sm:text-sm px-2">
          ${monthName}
        </span>
        <button id="cal-next-month" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          Next Month ▶
        </button>
      </div>

      <button id="cal-today-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
        This Month
      </button>
    </div>
  `;

  const monthMetricsHtml = `
    <div class="p-3 bg-white/90 border-b border-sfl-cardBorder">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🟢 Monthly Sales</span>
          <span class="text-sm sm:text-base font-black text-sfl-green font-mono">+${monthSales.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🔵 Monthly Spent</span>
          <span class="text-sm sm:text-base font-black text-sfl-wood font-mono">-${monthSpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">⚖️ Monthly Net</span>
          <span class="text-sm sm:text-base font-black ${netColor} font-mono">${netSign}${monthNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🏆 Month Trades</span>
          <span class="text-sm sm:text-base font-black text-sfl-dirt font-mono">${monthTradesCount}</span>
        </div>
      </div>
    </div>
  `;

  const graphHtml = generateSvgChart(monthDailyPoints, 110);

  // Render all trades in this month
  const monthTrades = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calendarCurrentMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${calendarCurrentYear}-${mm}-${dd}`;
    const dayData = tradesMap.get(key);
    if (dayData && dayData.trades.length > 0) {
      monthTrades.push(...dayData.trades);
    }
  }

  const monthTradesData = {
    trades: monthTrades.sort((a, b) => (b.fulfilledAt || 0) - (a.fulfilledAt || 0))
  };

  const tradesTableHtml = renderSelectedDayTradesTable(`Month of ${monthName}`, monthTradesData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${monthNavHtml}
    ${monthMetricsHtml}
    ${graphHtml}
    ${tradesTableHtml}
  `;

  bindGenericCalendarEvents(mountEl, farmId);
}

export function renderBy3MonthView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const baseMonth = calendarCurrentMonth;
  const baseY = calendarCurrentYear;

  const m1 = baseMonth;
  const y1 = baseY;
  const m2 = (m1 - 1 + 12) % 12;
  const y2 = m1 === 0 ? y1 - 1 : y1;
  const m3 = (m1 - 2 + 12) % 12;
  const y3 = m1 < 2 ? y1 - 1 : y1;

  const quarterTitle = `${new Date(y3, m3, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' })} – ${new Date(y1, m1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' })}`;

  // Calculate 3-month metrics
  let qSales = 0;
  let qSpend = 0;
  let qTrades = 0;
  const qPoints = [];
  const allQuarterTrades = [];

  // Group by 12 weekly buckets for clean graph
  for (let w = 11; w >= 0; w--) {
    const { monday } = getWeekRange(-w);
    let wS = 0;
    let wB = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayData = tradesMap.get(key);
      if (dayData) {
        wS += dayData.totalSold || 0;
        wB += dayData.totalBought || 0;
        qTrades += dayData.trades.length;
        allQuarterTrades.push(...dayData.trades);
      }
    }
    qSales += wS;
    qSpend += wB;
    qPoints.push({
      label: monday.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      sold: wS,
      spent: wB,
      net: wS - wB
    });
  }

  const qNet = qSales - qSpend;
  const netSign = qNet >= 0 ? '+' : '';
  const netColor = qNet > 0 ? 'text-sfl-green' : (qNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  const qNavHtml = `
    <div class="p-2.5 bg-amber-100/60 border-b border-sfl-cardBorder flex justify-between items-center">
      <div class="flex items-center gap-1.5">
        <button id="cal-prev-quarter" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          ◀ Prev 3-Months
        </button>
        <span class="font-bold text-sfl-wood text-xs sm:text-sm px-2">
          <span>📈</span> ${quarterTitle}
        </span>
        <button id="cal-next-quarter" class="bg-white border border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
          Next 3-Months ▶
        </button>
      </div>

      <button id="cal-current-quarter-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-2.5 py-1 rounded text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-2xs">
        Current Quarter
      </button>
    </div>
  `;

  const qMetricsHtml = `
    <div class="p-3 bg-white/90 border-b border-sfl-cardBorder">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🟢 3-Month Sales</span>
          <span class="text-sm sm:text-base font-black text-sfl-green font-mono">+${qSales.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🔵 3-Month Spent</span>
          <span class="text-sm sm:text-base font-black text-sfl-wood font-mono">-${qSpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">⚖️ 3-Month Net</span>
          <span class="text-sm sm:text-base font-black ${netColor} font-mono">${netSign}${qNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border border-sfl-cardBorder p-2.5 rounded-lg text-center shadow-2xs">
          <span class="text-[9px] font-bold text-sfl-woodLight uppercase block mb-0.5">🏆 Total Trades</span>
          <span class="text-sm sm:text-base font-black text-sfl-dirt font-mono">${qTrades}</span>
        </div>
      </div>
    </div>
  `;

  const graphHtml = generateSvgChart(qPoints, 110);

  const quarterTradesData = {
    trades: Array.from(new Map(allQuarterTrades.map(t => [t.id, t])).values()).sort((a, b) => (b.fulfilledAt || 0) - (a.fulfilledAt || 0))
  };

  const tradesTableHtml = renderSelectedDayTradesTable(`${quarterTitle}`, quarterTradesData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${qNavHtml}
    ${qMetricsHtml}
    ${graphHtml}
    ${tradesTableHtml}
  `;

  bindGenericCalendarEvents(mountEl, farmId);
}

export function renderSingleMonthGrid(year, month, tradesMap) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let headersHtml = dayHeaders.map(d => `
    <div class="text-center font-black text-[10px] text-sfl-wood uppercase py-1 bg-sfl-card/80 border-b border-sfl-cardBorder">
      ${d}
    </div>
  `).join('');

  let cellsHtml = '';

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    cellsHtml += `
      <div class="min-h-[42px] sm:min-h-[54px] p-1 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/20">
        <span class="text-[10px] font-mono">${prevDayNum}</span>
      </div>
    `;
  }

  // Days in current month
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    const dayData = tradesMap.get(dateKey);

    const isToday = isCurrentMonth && today.getDate() === d;
    const isSelected = selectedCalendarDateKey === dateKey;

    let tradeBadgeHtml = '';
    let cellBg = 'bg-white hover:bg-amber-50/70';

    if (dayData && dayData.trades.length > 0) {
      const net = dayData.totalSold - dayData.totalBought;
      const netSign = net >= 0 ? '+' : '';

      tradeBadgeHtml = `
        <div class="mt-0.5 space-y-0.5">
          <div class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-sfl-dirt border border-amber-300 shadow-2xs leading-none">
            ${dayData.trades.length}t
          </div>
          <div class="text-[9px] sm:text-[10px] font-mono font-black ${net >= 0 ? 'text-sfl-green bg-green-50/80 dark:bg-green-950/40 border-sfl-green/40' : 'text-sfl-accent bg-red-50/80 dark:bg-red-950/40 border-red-300'} px-1 py-0.2 rounded border leading-none">
            ${netSign}${net.toFixed(1)}
          </div>
        </div>
      `;

      cellBg = 'bg-amber-50/80 hover:bg-amber-100 cursor-pointer';
    }

    const activeRing = isSelected 
      ? 'ring-2 ring-sfl-gold border-sfl-gold bg-amber-100 dark:bg-amber-950/60 shadow-xs z-10' 
      : 'border-sfl-cardBorder/40';

    cellsHtml += `
      <div data-day-key="${dateKey}" class="cal-day-cell min-h-[42px] sm:min-h-[54px] p-1 border transition duration-100 relative cursor-pointer ${cellBg} ${activeRing}">
        <div class="flex justify-between items-center leading-none">
          <span class="text-[10px] sm:text-xs font-mono font-bold ${isToday ? 'bg-sfl-wood text-amber-200 px-1 py-0.2 rounded-full' : 'text-sfl-wood'}">
            ${d}
          </span>
          ${dayData ? `<span class="w-1.5 h-1.5 rounded-full bg-sfl-green inline-block"></span>` : ''}
        </div>
        ${tradeBadgeHtml}
      </div>
    `;
  }

  // Trailing empty cells
  const totalRendered = firstDayIndex + daysInMonth;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    cellsHtml += `
      <div class="min-h-[42px] sm:min-h-[54px] p-1 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/20">
        <span class="text-[10px] font-mono">${i}</span>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-7 gap-0 border-2 border-sfl-cardBorder rounded-lg overflow-hidden bg-sfl-cardBorder/30 shadow-xs">
      ${headersHtml}
      ${cellsHtml}
    </div>
  `;
}

export function bindGenericCalendarEvents(mountEl, farmId) {
  // Mode Switcher (Day / Week / Month / 3-Month)
  const modeBtns = mountEl.querySelectorAll('.cal-mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.getAttribute('data-cal-mode');
      if (mode) {
        calendarViewMode = mode;
        renderCalendarMainView(mountEl, farmId);
      }
    });
  });

  // Day Cell click
  const dayCells = mountEl.querySelectorAll('.cal-day-cell');
  dayCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      const dayKey = e.currentTarget.getAttribute('data-day-key');
      if (dayKey) {
        selectedCalendarDateKey = dayKey;
        renderCalendarMainView(mountEl, farmId);
      }
    });
  });

  // Month navigation
  mountEl.querySelector('#cal-prev-month')?.addEventListener('click', () => {
    calendarCurrentMonth--;
    if (calendarCurrentMonth < 0) {
      calendarCurrentMonth = 11;
      calendarCurrentYear--;
    }
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-month')?.addEventListener('click', () => {
    calendarCurrentMonth++;
    if (calendarCurrentMonth > 11) {
      calendarCurrentMonth = 0;
      calendarCurrentYear++;
    }
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-today-btn')?.addEventListener('click', () => {
    const today = new Date();
    calendarCurrentMonth = today.getMonth();
    calendarCurrentYear = today.getFullYear();
    selectedCalendarDateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    renderCalendarMainView(mountEl, farmId);
  });

  // Week navigation
  mountEl.querySelector('#cal-prev-week')?.addEventListener('click', () => {
    calendarWeekOffset--;
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-week')?.addEventListener('click', () => {
    calendarWeekOffset++;
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-current-week-btn')?.addEventListener('click', () => {
    calendarWeekOffset = 0;
    renderCalendarMainView(mountEl, farmId);
  });

  // 3-Month / Quarter navigation
  mountEl.querySelector('#cal-prev-quarter')?.addEventListener('click', () => {
    calendarCurrentMonth -= 3;
    if (calendarCurrentMonth < 0) {
      calendarCurrentMonth += 12;
      calendarCurrentYear--;
    }
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-quarter')?.addEventListener('click', () => {
    calendarCurrentMonth += 3;
    if (calendarCurrentMonth > 11) {
      calendarCurrentMonth -= 12;
      calendarCurrentYear++;
    }
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-current-quarter-btn')?.addEventListener('click', () => {
    const today = new Date();
    calendarCurrentMonth = today.getMonth();
    calendarCurrentYear = today.getFullYear();
    renderCalendarMainView(mountEl, farmId);
  });
}
