import { tradeHistoryData, getTradeAmounts, isUserSeller } from './tradeData.js';
import { getItemNameById } from '../../data/knownIds.js';
import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

export const ITEM_PALETTE = [
  '#10b981', // Emerald
  '#3b82f6', // Sky Blue
  '#f59e0b', // Amber / Gold
  '#ec4899', // Rose Pink
  '#8b5cf6', // Purple / Violet
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#84cc16', // Lime
  '#f97316', // Tangerine
  '#14b8a6', // Teal
  '#a855f7', // Lavender
  '#6366f1'  // Indigo
];

// State for Item Analytics - starts empty so only selected items are shown
export let analyticsTimeHorizon = 'week'; // 'today' | 'week' | 'month'
export let analyticsMetric = 'sfl';       // 'sfl' | 'qty'
export let selectedItems = new Set();
export let itemSearchFilter = '';

export function setAnalyticsTimeHorizon(horizon) {
  analyticsTimeHorizon = horizon;
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

export function setAnalyticsMetric(metric) {
  analyticsMetric = metric;
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

export function toggleItemSelection(itemName) {
  if (selectedItems.has(itemName)) {
    selectedItems.delete(itemName);
  } else {
    selectedItems.add(itemName);
  }
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

export function selectAllItems(itemNames) {
  selectedItems = new Set(itemNames);
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

export function clearSelectedItems() {
  selectedItems.clear();
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

export function selectTopTradedItems(itemsList, topN = 5) {
  selectedItems.clear();
  itemsList.slice(0, topN).forEach(item => selectedItems.add(item.name));
  const mountEl = document.getElementById('trade-content-mount');
  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();
  if (mountEl) renderItemAnalyticsView(mountEl, farmId);
}

/**
 * Extracts all sold items with trade counts from trades
 */
export function getAllSoldItems(trades, farmId) {
  if (!Array.isArray(trades)) return [];
  const map = new Map();

  trades.forEach(t => {
    if (!isUserSeller(t, farmId)) return;
    let name = t.itemName;
    if (!name || name.startsWith('Item #')) {
      name = getItemNameById(t.itemId || name);
    }
    const cleanName = String(name || 'Unknown Item').trim();
    const qty = parseFloat(t.quantity || 1);
    const amounts = getTradeAmounts(t, farmId);

    if (!map.has(cleanName)) {
      map.set(cleanName, { name: cleanName, count: 0, totalQty: 0, totalSfl: 0 });
    }
    const itemObj = map.get(cleanName);
    itemObj.count += 1;
    itemObj.totalQty += qty;
    itemObj.totalSfl += amounts.netSfl;
  });

  return Array.from(map.values()).sort((a, b) => b.totalSfl - a.totalSfl || b.count - a.count);
}

/**
 * Returns distinct color for an item based on its position in selectedItems
 */
export function getItemColor(itemName, selectedList) {
  const idx = selectedList.indexOf(itemName);
  if (idx === -1) return '#94a3b8';
  return ITEM_PALETTE[idx % ITEM_PALETTE.length];
}

/**
 * Builds time intervals / buckets based on horizon
 */
export function getTimeBuckets(horizon) {
  const now = new Date();

  if (horizon === 'today') {
    // 8 slots of 3 hours: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
    const buckets = [];
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    for (let h = 0; h < 24; h += 3) {
      const start = new Date(year, month, day, h, 0, 0, 0);
      const end = new Date(year, month, day, h + 2, 59, 59, 999);
      buckets.push({
        label: `${String(h).padStart(2, '0')}:00`,
        startTime: start.getTime(),
        endTime: end.getTime()
      });
    }
    return { title: 'Today’s Hourly Sales', buckets };
  }

  if (horizon === 'month') {
    // Days in current month
    const buckets = [];
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthShort = now.toLocaleDateString(undefined, { month: 'short' });

    for (let d = 1; d <= lastDay; d++) {
      const start = new Date(year, month, d, 0, 0, 0, 0);
      const end = new Date(year, month, d, 23, 59, 59, 999);
      buckets.push({
        label: `${d}`,
        tooltipLabel: `${monthShort} ${d}`,
        startTime: start.getTime(),
        endTime: end.getTime()
      });
    }
    return { title: `This Month (${monthShort} ${year})`, buckets };
  }

  // Default: 'week' (Monday to Sunday)
  const buckets = [];
  const curDay = now.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = (curDay === 0 ? -6 : 1 - curDay);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const dayLabel = dayNames[i];
    buckets.push({
      label: `${dayLabel} ${d.getDate()}`,
      tooltipLabel: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      startTime: start.getTime(),
      endTime: end.getTime()
    });
  }
  return { title: 'This Week (Mon - Sun)', buckets };
}

/**
 * Aggregates sales series per selected item
 */
export function aggregateItemSeries(trades, farmId, selectedList, buckets) {
  const seriesMap = new Map();

  selectedList.forEach(itemName => {
    seriesMap.set(itemName, {
      itemName,
      color: getItemColor(itemName, selectedList),
      points: buckets.map(b => ({
        label: b.tooltipLabel || b.label,
        sfl: 0,
        qty: 0,
        count: 0
      })),
      totalSfl: 0,
      totalGrossSfl: 0,
      totalTax: 0,
      totalQty: 0,
      totalCount: 0
    });
  });

  const matchingTrades = [];

  trades.forEach(t => {
    if (!isUserSeller(t, farmId)) return;
    let name = t.itemName;
    if (!name || name.startsWith('Item #')) {
      name = getItemNameById(t.itemId || name);
    }
    const cleanName = String(name || '').trim();
    if (!selectedList.includes(cleanName)) return;

    const rawTime = t.fulfilledAt;
    if (!rawTime) return;
    const timeMs = new Date(rawTime).getTime();
    if (isNaN(timeMs)) return;

    const amounts = getTradeAmounts(t, farmId);
    const qty = parseFloat(t.quantity || 1);

    const s = seriesMap.get(cleanName);
    if (!s) return;

    // Check which bucket it lands in
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (timeMs >= b.startTime && timeMs <= b.endTime) {
        s.points[i].sfl += amounts.netSfl;
        s.points[i].qty += qty;
        s.points[i].count += 1;

        s.totalSfl += amounts.netSfl;
        s.totalGrossSfl += amounts.grossSfl;
        s.totalTax += amounts.tax;
        s.totalQty += qty;
        s.totalCount += 1;

        matchingTrades.push(t);
        break;
      }
    }
  });

  return {
    series: Array.from(seriesMap.values()),
    matchingTrades: matchingTrades.sort((a, b) => new Date(b.fulfilledAt).getTime() - new Date(a.fulfilledAt).getTime())
  };
}

/**
 * Generates an SVG Multi-Series Graph
 */
export function generateMultiItemSvgChart(seriesList, buckets, metric = 'sfl') {
  if (!seriesList || seriesList.length === 0) {
    return `
      <div class="p-8 text-center text-sfl-woodLight dark:text-amber-300/60 italic text-xs">
        No items selected. Select an item from the dropdown to display its sales graph.
      </div>
    `;
  }

  // Find max value across all series and points
  let maxVal = 0;
  seriesList.forEach(s => {
    s.points.forEach(p => {
      const val = metric === 'sfl' ? p.sfl : p.qty;
      if (val > maxVal) maxVal = val;
    });
  });

  if (maxVal <= 0) maxVal = 1; // avoid division by zero

  const chartW = 740;
  const chartH = 220;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 35;
  const usableW = chartW - paddingLeft - paddingRight;
  const usableH = chartH - paddingTop - paddingBottom;
  const numBuckets = buckets.length;
  const stepX = usableW / Math.max(numBuckets - 1, 1);

  // Y Grid lines (4 steps)
  let gridHtml = '';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const yVal = (maxVal / ySteps) * (ySteps - i);
    const yPos = paddingTop + (usableH / ySteps) * i;
    const formattedY = metric === 'sfl' ? yVal.toFixed(2) : Math.round(yVal).toLocaleString();

    gridHtml += `
      <line x1="${paddingLeft}" y1="${yPos}" x2="${chartW - paddingRight}" y2="${yPos}" stroke="#e5e7eb" stroke-dasharray="3,3" stroke-width="1" class="dark:stroke-amber-900/40" />
      <text x="${paddingLeft - 8}" y="${yPos + 3.5}" text-anchor="end" font-size="9" font-family="monospace" font-weight="bold" fill="#8a5832" class="dark:fill-amber-300/70">${formattedY}</text>
    `;
  }

  // X Labels
  let xLabelsHtml = '';
  const labelInterval = numBuckets > 15 ? Math.ceil(numBuckets / 10) : 1;
  buckets.forEach((b, i) => {
    if (i % labelInterval === 0 || i === numBuckets - 1) {
      const xPos = paddingLeft + i * stepX;
      xLabelsHtml += `
        <text x="${xPos}" y="${chartH - 12}" text-anchor="middle" font-size="9" font-family="monospace" font-weight="bold" fill="#8a5832" class="dark:fill-amber-300/70">${b.label}</text>
      `;
    }
  });

  // Series Lines & Points
  let seriesHtml = '';
  seriesList.forEach(s => {
    const coords = [];
    let pointsHtml = '';

    s.points.forEach((p, i) => {
      const val = metric === 'sfl' ? p.sfl : p.qty;
      const xPos = paddingLeft + i * stepX;
      const yPos = (chartH - paddingBottom) - ((val / maxVal) * usableH);
      coords.push(`${xPos.toFixed(1)},${yPos.toFixed(1)}`);

      const tooltipText = `${s.itemName} (${p.label}):\n• Sales: ${p.sfl.toFixed(3)} SFL\n• Units: ${p.qty.toLocaleString()} units\n• Trades: ${p.count}`;
      
      pointsHtml += `
        <circle cx="${xPos.toFixed(1)}" cy="${yPos.toFixed(1)}" r="3.5" fill="${s.color}" stroke="#ffffff" stroke-width="1.5" class="cursor-pointer hover:r-5 transition-all">
          <title>${tooltipText}</title>
        </circle>
      `;
    });

    const pathD = coords.length > 0 ? `M ${coords.join(' L ')}` : '';
    seriesHtml += `
      <g class="series-group">
        <path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
        ${pointsHtml}
      </g>
    `;
  });

  return `
    <div class="relative w-full overflow-hidden">
      <svg viewBox="0 0 ${chartW} ${chartH}" class="w-full h-52 sm:h-60 select-none">
        ${gridHtml}
        ${seriesHtml}
        ${xLabelsHtml}
      </svg>
    </div>
  `;
}

/**
 * Main render function for the Item Analytics subtab
 */
export function renderItemAnalyticsView(mountEl, farmId) {
  if (!mountEl) return;
  const trades = tradeHistoryData?.trades || [];
  const soldItems = getAllSoldItems(trades, farmId);

  // ONLY show items that are selected by the user
  const selectedList = Array.from(selectedItems);
  const { title: horizonTitle, buckets } = getTimeBuckets(analyticsTimeHorizon);
  const { series, matchingTrades } = aggregateItemSeries(trades, farmId, selectedList, buckets);

  // Available unselected items to choose from
  const availableSoldItems = soldItems.filter(item => !selectedItems.has(item.name));
  const filteredSoldItems = itemSearchFilter
    ? soldItems.filter(item => item.name.toLowerCase().includes(itemSearchFilter.toLowerCase()))
    : soldItems;

  mountEl.innerHTML = `
    <div class="p-3 sm:p-5 space-y-4">
      
      <!-- TOP CONTROLS: TIME HORIZON & METRIC TOGGLE -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50/80 dark:bg-amber-950/40 border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl p-3 shadow-2xs">
        
        <!-- Left: Time Horizon Buttons -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 mr-1 flex items-center gap-1">
            <span>⏱️</span> Range:
          </span>
          <button id="horizon-today-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTimeHorizon === 'today' ? 'bg-sfl-wood dark:bg-amber-800 text-amber-100 border-sfl-dirt dark:border-amber-600 ring-2 ring-sfl-gold' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-amber-100/60'}">
            📅 Today
          </button>
          <button id="horizon-week-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTimeHorizon === 'week' ? 'bg-sfl-wood dark:bg-amber-800 text-amber-100 border-sfl-dirt dark:border-amber-600 ring-2 ring-sfl-gold' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-amber-100/60'}">
            📆 This Week
          </button>
          <button id="horizon-month-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTimeHorizon === 'month' ? 'bg-sfl-wood dark:bg-amber-800 text-amber-100 border-sfl-dirt dark:border-amber-600 ring-2 ring-sfl-gold' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-amber-100/60'}">
            🗓️ Month
          </button>
        </div>

        <!-- Right: Metric Toggle (SFL vs Units) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 mr-1 flex items-center gap-1">
            <span>📊</span> Y-Axis:
          </span>
          <button id="metric-sfl-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsMetric === 'sfl' ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}">
            💰 SFL Sales
          </button>
          <button id="metric-qty-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsMetric === 'qty' ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-blue-50 dark:hover:bg-blue-950/30'}">
            📦 Units Sold
          </button>
        </div>

      </div>

      <!-- MULTI-ITEM SELECTOR (ONLY SHOW ITEMS THAT ARE SELECTED) -->
      <div class="bg-white/95 dark:bg-amber-950/40 border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="flex items-center gap-2 flex-wrap">
            <label for="item-add-select" class="text-xs font-black text-sfl-dirt dark:text-amber-100 uppercase tracking-wide flex items-center gap-1.5">
              <span>🎯</span> Select Items to Compare:
            </label>
            <select id="item-add-select" class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700/60 cursor-pointer max-w-[240px]">
              <option value="">➕ Choose an item to add...</option>
              ${availableSoldItems.map(item => `<option value="${item.name}">${item.name} (${item.count} sales, ${item.totalSfl.toFixed(2)} SFL)</option>`).join('')}
            </select>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <button id="quick-top5-btn" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-wood dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition cursor-pointer">
              Top 5 Traded
            </button>
            <button id="quick-clear-btn" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-sfl-wood dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition cursor-pointer">
              ✕ Clear All
            </button>
            <input type="text" id="item-search-filter-input" placeholder="🔍 Filter items..." value="${itemSearchFilter}" 
              class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700/60 w-36">
          </div>
        </div>

        <!-- SELECTED ITEMS DISPLAY (ONLY SHOW ITEMS THAT ARE SELECTED) -->
        <div class="flex items-center gap-2 flex-wrap min-h-[36px] p-2 border border-amber-200/80 dark:border-amber-800/60 rounded-lg bg-amber-50/40 dark:bg-amber-950/20">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200">
            Selected (${selectedList.length}):
          </span>
          ${selectedList.map(itemName => {
            const color = getItemColor(itemName, selectedList);
            const itemData = soldItems.find(i => i.name === itemName);
            const countStr = itemData ? ` (${itemData.count})` : '';
            return `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/80 text-sfl-dirt dark:text-amber-100 border border-amber-400 dark:border-amber-600 shadow-2xs">
                <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${color};"></span>
                <span>${itemName}${countStr}</span>
                <button data-remove-item="${itemName}" class="remove-item-btn ml-1 hover:text-red-500 font-black cursor-pointer" title="Remove ${itemName}">✕</button>
              </span>
            `;
          }).join('')}
          ${selectedList.length === 0 ? `
            <span class="text-xs text-sfl-woodLight dark:text-amber-300/60 italic">
              No items selected. Choose an item from the dropdown or quick search below to view sales.
            </span>
          ` : ''}
        </div>

        ${itemSearchFilter ? `
          <!-- Quick search matches to add -->
          <div class="flex items-center gap-1.5 flex-wrap pt-1">
            <span class="text-[11px] text-sfl-woodLight dark:text-amber-300/70">Matches:</span>
            ${filteredSoldItems.slice(0, 8).map(item => {
              const isSelected = selectedItems.has(item.name);
              return `
                <button data-add-item="${item.name}" class="text-[11px] font-bold px-2 py-0.5 rounded border transition cursor-pointer ${
                  isSelected ? 'bg-amber-200 dark:bg-amber-800 text-sfl-dirt dark:text-amber-100 border-amber-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder hover:bg-amber-100'
                }">
                  ${isSelected ? '✓ ' : '+ '} ${item.name} (${item.count})
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>

      <!-- GRAPH CARD -->
      ${selectedList.length === 0 ? `
        <div class="sfl-item-summary-card rounded-xl p-8 text-center shadow-sm space-y-2">
          <span class="text-3xl block">📈</span>
          <h4 class="text-sm font-bold text-sfl-wood dark:text-amber-200">No Items Selected</h4>
          <p class="text-xs text-sfl-woodLight dark:text-amber-300/70">
            Select one or more items above to view their sales graph, comparative metrics, and transaction history.
          </p>
        </div>
      ` : `
        <div class="sfl-item-summary-card rounded-xl p-4 shadow-sm space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-300/60 dark:border-amber-700/50 pb-2">
            <div>
              <h4 class="text-sm font-black text-sfl-wood dark:text-amber-200 flex items-center gap-2">
                <span>📈</span> Multi-Item Sales Comparison: <span class="text-sfl-green dark:text-emerald-400 font-bold">${horizonTitle}</span>
              </h4>
              <p class="text-[11px] font-semibold text-sfl-woodLight dark:text-amber-300/70">
                Plotting ${analyticsMetric === 'sfl' ? 'Net SFL Revenue earned' : 'Total Units Sold'} across ${selectedList.length} selected item(s)
              </p>
            </div>

            <!-- Color Legend -->
            <div class="flex items-center gap-2 flex-wrap text-xs font-mono font-bold">
              ${series.map(s => `
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs">
                  <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${s.color};"></span>
                  <span class="text-sfl-wood dark:text-amber-200">${s.itemName}</span>
                  <span class="text-[10px] font-black" style="color: ${s.color};">${analyticsMetric === 'sfl' ? '+' + s.totalSfl.toFixed(2) : s.totalQty.toLocaleString()}</span>
                </span>
              `).join('')}
            </div>
          </div>

          <!-- SVG Graph -->
          ${generateMultiItemSvgChart(series, buckets, analyticsMetric)}
        </div>

        <!-- PERFORMANCE STATS BREAKDOWN FOR SELECTED ITEMS ONLY -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${series.map(s => {
            const avgPrice = s.totalQty > 0 ? (s.totalGrossSfl / s.totalQty) : 0;
            return `
              <div class="rounded-xl p-3 border-2 shadow-2xs bg-white/95 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-700/60 flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/80 dark:border-amber-800/60">
                  <div class="flex items-center gap-2">
                    <span class="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-xs" style="background-color: ${s.color};"></span>
                    <span class="text-xs font-black text-sfl-dirt dark:text-amber-100">${s.itemName}</span>
                  </div>
                  <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                    ${s.totalCount} sales
                  </span>
                </div>

                <div class="space-y-1.5 font-mono text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-sfl-woodLight dark:text-amber-300/70">Net Revenue:</span>
                    <span class="font-black text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-1">
                      +${s.totalSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                    </span>
                  </div>
                  ${s.totalTax > 0 ? `
                    <div class="flex items-center justify-between text-[10px] text-sfl-woodLight dark:text-amber-300/60">
                      <span>Gross: +${s.totalGrossSfl.toFixed(3)}</span>
                      <span>Tax: -${s.totalTax.toFixed(3)}</span>
                    </div>
                  ` : ''}
                  <div class="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                    <span class="text-[11px] text-sfl-woodLight dark:text-amber-300/70">Units Sold:</span>
                    <span class="font-bold text-sfl-wood dark:text-amber-200">📦 ${s.totalQty.toLocaleString()}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-sfl-woodLight dark:text-amber-300/70">Avg Price:</span>
                    <span class="font-bold text-sfl-wood dark:text-amber-200">~${avgPrice.toFixed(4)} SFL/ea</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- TRANSACTION LEDGER TABLE FOR SELECTED ITEMS IN PERIOD ONLY -->
        <div class="border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl overflow-hidden bg-white/95 dark:bg-amber-950/40 shadow-2xs">
          <div class="bg-amber-100/80 dark:bg-amber-900/60 px-4 py-2.5 border-b border-sfl-cardBorder dark:border-amber-700/60 flex justify-between items-center">
            <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>📜</span> Sales Log for Selected Items in Period
            </span>
            <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 font-mono">
              ${matchingTrades.length} sales recorded
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-sfl-dirt dark:text-amber-100">
              <thead class="text-[10px] uppercase bg-sfl-card dark:bg-amber-950/50 border-b border-sfl-cardBorder dark:border-amber-700/60 text-sfl-wood dark:text-amber-200">
                <tr>
                  <th class="px-3 py-2">Date & Time</th>
                  <th class="px-3 py-2">Item Name</th>
                  <th class="px-2 py-2">Quantity</th>
                  <th class="px-2 py-2">Unit Price</th>
                  <th class="px-3 py-2">Buyer</th>
                  <th class="px-3 py-2 text-right">Net SFL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-sfl-cardBorder/40 dark:divide-amber-700/40 font-medium">
                ${matchingTrades.length === 0 ? `
                  <tr>
                    <td colspan="6" class="p-6 text-center text-sfl-woodLight dark:text-amber-300/60 italic">
                      No sales recorded for the selected item(s) in this time range.
                    </td>
                  </tr>
                ` : matchingTrades.map(t => {
                  const amounts = getTradeAmounts(t, farmId);
                  const rawDate = t.fulfilledAt;
                  const d = rawDate ? new Date(rawDate) : null;
                  const dateStr = d && !isNaN(d.getTime())
                    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recent';
                  const qty = parseFloat(t.quantity || 1);
                  const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;
                  const otherUser = t.counterpartyName || t.fulfilledBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Buyer');
                  const itemColor = getItemColor(t.itemName, selectedList);

                  return `
                    <tr class="hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition">
                      <td class="px-3 py-2 font-mono text-sfl-wood dark:text-amber-200 whitespace-nowrap">${dateStr}</td>
                      <td class="px-3 py-2 font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background-color: ${itemColor};"></span>
                        <span>${t.itemName}</span>
                      </td>
                      <td class="px-2 py-2 font-mono font-bold text-sfl-wood dark:text-amber-200">${qty.toLocaleString()}</td>
                      <td class="px-2 py-2 font-mono text-sfl-woodLight dark:text-amber-300/70">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
                      <td class="px-3 py-2 font-medium text-sfl-wood dark:text-amber-200">${otherUser}</td>
                      <td class="px-3 py-2 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                        +${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}

    </div>
  `;

  // Attach event listeners
  document.getElementById('horizon-today-btn')?.addEventListener('click', () => setAnalyticsTimeHorizon('today'));
  document.getElementById('horizon-week-btn')?.addEventListener('click', () => setAnalyticsTimeHorizon('week'));
  document.getElementById('horizon-month-btn')?.addEventListener('click', () => setAnalyticsTimeHorizon('month'));

  document.getElementById('metric-sfl-btn')?.addEventListener('click', () => setAnalyticsMetric('sfl'));
  document.getElementById('metric-qty-btn')?.addEventListener('click', () => setAnalyticsMetric('qty'));

  const selectPicker = document.getElementById('item-add-select');
  selectPicker?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      selectedItems.add(val);
      renderItemAnalyticsView(mountEl, farmId);
    }
  });

  document.getElementById('quick-top5-btn')?.addEventListener('click', () => selectTopTradedItems(soldItems, 5));
  document.getElementById('quick-clear-btn')?.addEventListener('click', () => clearSelectedItems());

  const searchInput = document.getElementById('item-search-filter-input');
  searchInput?.addEventListener('input', (e) => {
    itemSearchFilter = e.target.value.trim();
    renderItemAnalyticsView(mountEl, farmId);
  });

  mountEl.querySelectorAll('[data-remove-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemName = btn.getAttribute('data-remove-item');
      if (itemName) {
        selectedItems.delete(itemName);
        renderItemAnalyticsView(mountEl, farmId);
      }
    });
  });

  mountEl.querySelectorAll('[data-add-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemName = btn.getAttribute('data-add-item');
      if (itemName) {
        if (selectedItems.has(itemName)) selectedItems.delete(itemName);
        else selectedItems.add(itemName);
        renderItemAnalyticsView(mountEl, farmId);
      }
    });
  });
}
