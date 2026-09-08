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
export let analyticsTimeHorizon = 'week'; // 'today' | 'week' | 'month' | 'all'
export let analyticsMetric = 'sfl';       // 'sfl' | 'qty'
export let analyticsTradeType = 'all';    // 'all' | 'sold' | 'bought'
export let selectedItems = new Set();
export let itemSearchFilter = '';
export let focusedItemSeries = null;      // itemName if focused or null
export let lastMultiSeriesList = [];
export let lastMultiBuckets = [];
export let lastMultiMetric = 'sfl';
export let lastMultiTradeType = 'all';

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

export function setAnalyticsTradeType(type) {
  analyticsTradeType = type;
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
 * Extracts all traded items (both sold and bought) with full trade counts and totals
 */
export function getAllTradedItems(trades, farmId, filterType = 'all') {
  if (!Array.isArray(trades)) return [];
  const map = new Map();

  trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    if (filterType === 'sold' && !isSeller) return;
    if (filterType === 'bought' && isSeller) return;

    let name = t.itemName;
    if (!name || name.startsWith('Item #')) {
      name = getItemNameById(t.itemId || name);
    }
    const cleanName = String(name || 'Unknown Item').trim();
    const qty = parseFloat(t.quantity || 1);
    const amounts = getTradeAmounts(t, farmId);

    if (!map.has(cleanName)) {
      map.set(cleanName, {
        name: cleanName,
        count: 0,
        soldCount: 0,
        boughtCount: 0,
        totalSoldQty: 0,
        totalBoughtQty: 0,
        netQty: 0,
        totalSoldSfl: 0,
        totalGrossSoldSfl: 0,
        totalTax: 0,
        totalBoughtSfl: 0,
        netSfl: 0,
        totalQty: 0,
        totalSfl: 0 // Backwards compatibility
      });
    }

    const itemObj = map.get(cleanName);
    itemObj.count += 1;

    if (isSeller) {
      itemObj.soldCount += 1;
      itemObj.totalSoldQty += qty;
      itemObj.totalSoldSfl += amounts.netSfl;
      itemObj.totalGrossSoldSfl += amounts.grossSfl;
      itemObj.totalTax += amounts.tax;
      itemObj.netSfl += amounts.netSfl;
      itemObj.netQty -= qty;
      itemObj.totalQty += qty;
      itemObj.totalSfl += amounts.netSfl;
    } else {
      itemObj.boughtCount += 1;
      itemObj.totalBoughtQty += qty;
      itemObj.totalBoughtSfl += amounts.netSfl;
      itemObj.netSfl -= amounts.netSfl;
      itemObj.netQty += qty;
      itemObj.totalQty += qty;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (filterType === 'bought') return b.totalBoughtSfl - a.totalBoughtSfl || b.boughtCount - a.boughtCount;
    if (filterType === 'sold') return b.totalSoldSfl - a.totalSoldSfl || b.soldCount - a.soldCount;
    return (b.totalSoldSfl + b.totalBoughtSfl) - (a.totalSoldSfl + a.totalBoughtSfl) || b.count - a.count;
  });
}

/**
 * Extracts all sold items with trade counts from trades (backwards-compatible)
 */
export function getAllSoldItems(trades, farmId) {
  return getAllTradedItems(trades, farmId, 'sold');
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
export function getTimeBuckets(horizon, trades = []) {
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
    return { title: 'Today’s Hourly Flow', buckets };
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

  if (horizon === 'all') {
    // Lifetime all-time monthly buckets
    const timestamps = (Array.isArray(trades) ? trades : [])
      .map(t => t.fulfilledAt ? new Date(t.fulfilledAt).getTime() : 0)
      .filter(t => t > 0 && !isNaN(t));

    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : (now.getTime() - 180 * 86400000);
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps, now.getTime()) : now.getTime();

    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);

    const startYear = minDate.getFullYear();
    const startMonth = minDate.getMonth();
    const endYear = maxDate.getFullYear();
    const endMonth = maxDate.getMonth();

    const monthCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

    // If all trades are within <= 14 days, generate daily buckets
    if (monthCount <= 1 && ((maxTime - minTime) <= 14 * 86400000)) {
      const buckets = [];
      const totalDays = Math.max(Math.ceil((maxTime - minTime) / 86400000) + 1, 7);
      const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0);

      for (let i = 0; i < totalDays; i++) {
        const cur = new Date(startDate.getTime() + i * 86400000);
        const start = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0);
        const end = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999);
        const dayLabel = cur.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        buckets.push({
          label: dayLabel,
          tooltipLabel: cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          startTime: start.getTime(),
          endTime: end.getTime()
        });
      }
      return { title: 'All Time History (Daily)', buckets };
    }

    // Otherwise generate month-by-month buckets
    const buckets = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const start = new Date(curY, curM, 1, 0, 0, 0, 0);
      const end = new Date(curY, curM + 1, 0, 23, 59, 59, 999);
      const monthShort = start.toLocaleDateString(undefined, { month: 'short' });
      const yrShort = String(curY).slice(-2);
      buckets.push({
        label: `${monthShort} '${yrShort}`,
        tooltipLabel: `${start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`,
        startTime: start.getTime(),
        endTime: end.getTime()
      });

      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    const startLabel = buckets[0]?.label || '';
    const endLabel = buckets[buckets.length - 1]?.label || '';
    return { title: `All Time History (${startLabel} - ${endLabel})`, buckets };
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
 * Aggregates series per selected item, supporting sold, bought, and all trades
 */
export function aggregateItemSeries(trades, farmId, selectedList, buckets, tradeType = analyticsTradeType) {
  const seriesMap = new Map();

  selectedList.forEach(itemName => {
    seriesMap.set(itemName, {
      itemName,
      color: getItemColor(itemName, selectedList),
      points: buckets.map(b => ({
        label: b.tooltipLabel || b.label,
        sfl: 0,
        qty: 0,
        count: 0,
        soldSfl: 0,
        boughtSfl: 0,
        netSfl: 0,
        soldQty: 0,
        boughtQty: 0,
        netQty: 0,
        soldCount: 0,
        boughtCount: 0
      })),
      totalSfl: 0,
      totalQty: 0,
      totalSoldSfl: 0,
      totalGrossSoldSfl: 0,
      totalTax: 0,
      totalBoughtSfl: 0,
      netSfl: 0,
      totalSoldQty: 0,
      totalBoughtQty: 0,
      netQty: 0,
      totalSoldCount: 0,
      totalBoughtCount: 0,
      totalCount: 0
    });
  });

  const matchingTrades = [];

  trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    if (tradeType === 'sold' && !isSeller) return;
    if (tradeType === 'bought' && isSeller) return;

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
        const pt = s.points[i];
        pt.count += 1;
        s.totalCount += 1;

        if (isSeller) {
          pt.soldSfl += amounts.netSfl;
          pt.soldQty += qty;
          pt.soldCount += 1;
          pt.netSfl += amounts.netSfl;
          pt.netQty -= qty;

          s.totalSoldSfl += amounts.netSfl;
          s.totalGrossSoldSfl += amounts.grossSfl;
          s.totalTax += amounts.tax;
          s.totalSoldQty += qty;
          s.totalSoldCount += 1;
          s.netSfl += amounts.netSfl;
          s.netQty -= qty;
        } else {
          pt.boughtSfl += amounts.netSfl;
          pt.boughtQty += qty;
          pt.boughtCount += 1;
          pt.netSfl -= amounts.netSfl;
          pt.netQty += qty;

          s.totalBoughtSfl += amounts.netSfl;
          s.totalBoughtQty += qty;
          s.totalBoughtCount += 1;
          s.netSfl -= amounts.netSfl;
          s.netQty += qty;
        }

        matchingTrades.push(t);
        break;
      }
    }
  });

  // Calculate plotted series point values based on active tradeType
  seriesMap.forEach(s => {
    s.points.forEach(pt => {
      if (tradeType === 'bought') {
        pt.sfl = pt.boughtSfl;
        pt.qty = pt.boughtQty;
      } else if (tradeType === 'sold') {
        pt.sfl = pt.soldSfl;
        pt.qty = pt.soldQty;
      } else {
        // 'all' -> plot net flow
        pt.sfl = pt.netSfl;
        pt.qty = pt.netQty;
      }
    });

    if (tradeType === 'bought') {
      s.totalSfl = s.totalBoughtSfl;
      s.totalQty = s.totalBoughtQty;
    } else if (tradeType === 'sold') {
      s.totalSfl = s.totalSoldSfl;
      s.totalQty = s.totalSoldQty;
    } else {
      s.totalSfl = s.netSfl;
      s.totalQty = s.netQty;
    }
  });

  return {
    series: Array.from(seriesMap.values()),
    matchingTrades: matchingTrades.sort((a, b) => new Date(b.fulfilledAt).getTime() - new Date(a.fulfilledAt).getTime())
  };
}

/**
 * Generates an SVG Multi-Series Graph with zero-line split for negative net flow
 */
/**
 * Generates an SVG Multi-Series Graph with interactive crosshair, hover columns, and zero-line split
 */
export function generateMultiItemSvgChart(seriesList, buckets, metric = 'sfl', tradeType = analyticsTradeType) {
  lastMultiSeriesList = Array.isArray(seriesList) ? seriesList : [];
  lastMultiBuckets = Array.isArray(buckets) ? buckets : [];
  lastMultiMetric = metric;
  lastMultiTradeType = tradeType;

  if (!seriesList || seriesList.length === 0) {
    return `
      <div class="p-8 text-center text-sfl-woodLight dark:text-amber-300/60 italic text-xs">
        No items selected. Select an item from the dropdown to display its activity graph.
      </div>
    `;
  }

  // Find max positive and negative value across all series and points
  let maxPos = 0;
  let maxNeg = 0;

  seriesList.forEach(s => {
    s.points.forEach(p => {
      const val = metric === 'sfl' ? p.sfl : p.qty;
      if (val > maxPos) maxPos = val;
      if (val < -maxNeg) maxNeg = Math.abs(val);
    });
  });

  if (maxPos <= 0 && maxNeg <= 0) {
    maxPos = 1;
  }

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

  // Dynamic Zero Line Placement
  const hasNegative = maxNeg > 0;
  let zeroY = chartH - paddingBottom;
  let positiveH = usableH;
  let negativeH = 0;

  if (hasNegative) {
    const totalSpan = maxPos + maxNeg;
    positiveH = (maxPos / totalSpan) * usableH;
    negativeH = (maxNeg / totalSpan) * usableH;
    zeroY = paddingTop + positiveH;
  }

  const scalePos = maxPos > 0 ? maxPos : 1;
  const scaleNeg = maxNeg > 0 ? maxNeg : 1;

  // Y Grid lines
  let gridHtml = '';
  if (!hasNegative) {
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = (scalePos / ySteps) * (ySteps - i);
      const yPos = paddingTop + (usableH / ySteps) * i;
      const formattedY = metric === 'sfl' ? yVal.toFixed(2) : Math.round(yVal).toLocaleString();

      gridHtml += `
        <line x1="${paddingLeft}" y1="${yPos}" x2="${chartW - paddingRight}" y2="${yPos}" stroke="#e5e7eb" stroke-dasharray="3,3" stroke-width="1" class="dark:stroke-amber-900/40" />
        <text x="${paddingLeft - 8}" y="${yPos + 3.5}" text-anchor="end" font-size="9" font-family="monospace" font-weight="bold" fill="#8a5832" class="dark:fill-amber-300/70">${formattedY}</text>
      `;
    }
  } else {
    gridHtml += `
      <line x1="${paddingLeft}" y1="${zeroY}" x2="${chartW - paddingRight}" y2="${zeroY}" stroke="#d97706" stroke-width="1.5" />
      <text x="${paddingLeft - 8}" y="${zeroY + 3.5}" text-anchor="end" font-size="9" font-family="monospace" font-weight="bold" fill="#d97706">0</text>
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${chartW - paddingRight}" y2="${paddingTop}" stroke="#e5e7eb" stroke-dasharray="3,3" stroke-width="1" class="dark:stroke-amber-900/40" />
      <text x="${paddingLeft - 8}" y="${paddingTop + 3.5}" text-anchor="end" font-size="9" font-family="monospace" font-weight="bold" fill="#10b981">+${metric === 'sfl' ? scalePos.toFixed(2) : Math.round(scalePos)}</text>
      <line x1="${paddingLeft}" y1="${chartH - paddingBottom}" x2="${chartW - paddingRight}" y2="${chartH - paddingBottom}" stroke="#e5e7eb" stroke-dasharray="3,3" stroke-width="1" class="dark:stroke-amber-900/40" />
      <text x="${paddingLeft - 8}" y="${chartH - paddingBottom + 3.5}" text-anchor="end" font-size="9" font-family="monospace" font-weight="bold" fill="#ef4444">-${metric === 'sfl' ? scaleNeg.toFixed(2) : Math.round(scaleNeg)}</text>
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
    const isFocused = focusedItemSeries === s.itemName;
    const isDimmed = focusedItemSeries && !isFocused;
    const seriesOpacity = isDimmed ? 0.15 : 0.95;
    const strokeW = isFocused ? 3.5 : 2.5;

    s.points.forEach((p, i) => {
      const val = metric === 'sfl' ? p.sfl : p.qty;
      const xPos = paddingLeft + i * stepX;
      let yPos = zeroY;

      if (val >= 0) {
        yPos = zeroY - ((val / scalePos) * positiveH);
      } else {
        yPos = zeroY + ((Math.abs(val) / scaleNeg) * negativeH);
      }

      coords.push(`${xPos.toFixed(1)},${yPos.toFixed(1)}`);

      pointsHtml += `
        <circle cx="${xPos.toFixed(1)}" cy="${yPos.toFixed(1)}" r="${isFocused ? '4' : '3.5'}" fill="${s.color}" stroke="#ffffff" stroke-width="1.5" class="multi-chart-circle multi-chart-circle-${i} pointer-events-none transition-all duration-100" data-idx="${i}" data-series="${s.itemName}">
        </circle>
      `;
    });

    const pathD = coords.length > 0 ? `M ${coords.join(' L ')}` : '';
    seriesHtml += `
      <g class="series-group transition-opacity duration-150" opacity="${seriesOpacity}">
        <path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" />
        ${pointsHtml}
      </g>
    `;
  });

  // Interactive Hover Columns across buckets
  let hoverColsHtml = '';
  buckets.forEach((b, i) => {
    const xPos = paddingLeft + i * stepX;
    const colW = numBuckets <= 1 ? usableW : stepX;
    const colX = numBuckets <= 1 ? paddingLeft : (i === 0 ? paddingLeft : xPos - stepX / 2);
    hoverColsHtml += `
      <rect class="multi-chart-hover-col" data-b-idx="${i}" data-cx="${xPos.toFixed(1)}" x="${colX.toFixed(1)}" y="${paddingTop}" width="${colW.toFixed(1)}" height="${usableH}" fill="transparent" cursor="crosshair" />
    `;
  });

  return `
    <div class="multi-item-chart-wrapper relative w-full overflow-visible select-none">
      <!-- FLOATING INTERACTIVE MULTI-ITEM TOOLTIP -->
      <div id="multi-item-chart-tooltip" class="hidden absolute z-30 pointer-events-none rounded-xl p-3 text-xs shadow-2xl border-2 transition-all duration-75 bg-white/95 text-sfl-dirt border-amber-400 dark:bg-amber-950/95 dark:text-amber-100 dark:border-amber-600 backdrop-blur-xs min-w-[220px] max-w-[340px]"></div>

      <svg viewBox="0 0 ${chartW} ${chartH}" class="w-full h-52 sm:h-60 select-none overflow-visible">
        <!-- Interactive Hover Band & Crosshair -->
        <rect id="multi-chart-hover-band" x="0" y="${paddingTop}" width="${stepX.toFixed(1)}" height="${usableH}" fill="#f59e0b" opacity="0" rx="3" pointer-events="none" />
        <line id="multi-chart-crosshair" x1="0" y1="${paddingTop}" x2="0" y2="${chartH - paddingBottom}" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3,3" opacity="0" pointer-events="none" />

        ${gridHtml}
        ${seriesHtml}
        ${xLabelsHtml}
        ${hoverColsHtml}
      </svg>
    </div>
  `;
}

/**
 * Binds interactive hover crosshair, bucket comparison tooltip, and point highlights for multi-item SVG chart
 */
export function bindInteractiveMultiItemChart(containerEl) {
  if (!containerEl) return;
  const wrapper = containerEl.querySelector('.multi-item-chart-wrapper');
  if (!wrapper) return;

  const tooltip = wrapper.querySelector('#multi-item-chart-tooltip');
  const crosshair = wrapper.querySelector('#multi-chart-crosshair');
  const hoverBand = wrapper.querySelector('#multi-chart-hover-band');
  const hoverCols = wrapper.querySelectorAll('.multi-chart-hover-col');
  const circles = wrapper.querySelectorAll('.multi-chart-circle');

  hoverCols.forEach(col => {
    col.addEventListener('pointerenter', onHover);
    col.addEventListener('pointermove', onHover);
  });

  wrapper.addEventListener('pointerleave', () => {
    if (tooltip) tooltip.classList.add('hidden');
    if (crosshair) crosshair.setAttribute('opacity', '0');
    if (hoverBand) hoverBand.setAttribute('opacity', '0');
    circles.forEach(c => {
      c.setAttribute('r', '3.5');
      c.setAttribute('stroke-width', '1.5');
    });
  });

  function onHover(e) {
    const bIdx = parseInt(e.currentTarget.getAttribute('data-b-idx'), 10);
    const bucket = lastMultiBuckets[bIdx];
    if (!bucket || !tooltip) return;

    const cx = parseFloat(e.currentTarget.getAttribute('data-cx') || 0);
    const colW = parseFloat(e.currentTarget.getAttribute('width') || 20);

    // Update crosshair & hover band
    if (crosshair) {
      crosshair.setAttribute('x1', cx);
      crosshair.setAttribute('x2', cx);
      crosshair.setAttribute('opacity', '1');
    }
    if (hoverBand) {
      hoverBand.setAttribute('x', cx - colW / 2);
      hoverBand.setAttribute('width', colW);
      hoverBand.setAttribute('opacity', '0.08');
    }

    // Scale up circles at this bucket index
    circles.forEach(c => {
      const idx = parseInt(c.getAttribute('data-idx'), 10);
      if (idx === bIdx) {
        c.setAttribute('r', '5.5');
        c.setAttribute('stroke-width', '2');
      } else {
        c.setAttribute('r', '3.5');
        c.setAttribute('stroke-width', '1.5');
      }
    });

    const bucketTitle = bucket.tooltipLabel || bucket.label;
    let totalBucketVal = 0;
    let totalBucketSoldSfl = 0;
    let totalBucketBoughtSfl = 0;

    const itemsHtml = lastMultiSeriesList.map(s => {
      const pt = s.points[bIdx] || { sfl: 0, qty: 0, soldSfl: 0, boughtSfl: 0, soldQty: 0, boughtQty: 0, netSfl: 0, netQty: 0, soldCount: 0, boughtCount: 0 };
      const val = lastMultiMetric === 'sfl' ? pt.sfl : pt.qty;
      totalBucketVal += val;
      totalBucketSoldSfl += pt.soldSfl || 0;
      totalBucketBoughtSfl += pt.boughtSfl || 0;

      const valStr = lastMultiMetric === 'sfl'
        ? `${val >= 0 ? '+' : ''}${val.toFixed(3)} SFL`
        : `${val >= 0 ? '+' : ''}${val.toLocaleString()} pcs`;

      const hasActivity = (pt.soldCount > 0 || pt.boughtCount > 0);

      return `
        <div class="py-1 border-b border-amber-200/50 dark:border-amber-800/50 last:border-0 last:pb-0">
          <div class="flex items-center justify-between gap-2 font-mono">
            <span class="font-bold flex items-center gap-1.5 text-sfl-wood dark:text-amber-200">
              <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${s.color};"></span>
              <span class="truncate max-w-[130px] font-sans">${s.itemName}</span>
            </span>
            <span class="font-black" style="color: ${s.color};">${valStr}</span>
          </div>
          ${hasActivity ? `
            <div class="flex items-center justify-between text-[9.5px] font-mono text-sfl-woodLight dark:text-amber-300/70 pl-4 pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400">🟢 +${pt.soldSfl.toFixed(2)} (${pt.soldQty}x)</span>
              <span class="text-blue-600 dark:text-blue-400">🔵 -${pt.boughtSfl.toFixed(2)} (${pt.boughtQty}x)</span>
            </div>
          ` : `
            <div class="text-[9px] font-sans text-sfl-woodLight/70 dark:text-amber-300/40 pl-4">No trades in bucket</div>
          `}
        </div>
      `;
    }).join('');

    const bucketNetTotal = totalBucketSoldSfl - totalBucketBoughtSfl;
    const isTotalProfit = bucketNetTotal >= 0;

    tooltip.innerHTML = `
      <div class="space-y-2 font-sans">
        <div class="font-bold text-[11px] text-sfl-dirt dark:text-amber-100 flex items-center justify-between gap-3 border-b border-amber-300/60 dark:border-amber-700/60 pb-1">
          <span class="flex items-center gap-1"><span>⏱️</span> ${bucketTitle}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700">
            ${lastMultiSeriesList.length} Item${lastMultiSeriesList.length === 1 ? '' : 's'}
          </span>
        </div>

        <div class="space-y-0.5">
          ${itemsHtml}
        </div>

        ${lastMultiSeriesList.length > 1 ? `
          <div class="pt-1.5 border-t border-amber-300/60 dark:border-amber-700/60 flex items-center justify-between text-[10px] font-bold font-mono">
            <span class="text-sfl-wood dark:text-amber-200 font-sans">Bucket Net Total:</span>
            <span class="font-black ${isTotalProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
              ${bucketNetTotal >= 0 ? '+' : ''}${lastMultiMetric === 'sfl' ? bucketNetTotal.toFixed(3) + ' SFL' : totalBucketVal.toLocaleString() + ' pcs'}
            </span>
          </div>
        ` : ''}
      </div>
    `;

    tooltip.classList.remove('hidden');

    // Bounds checking
    const wrapperRect = wrapper.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let left = clientX - wrapperRect.left + 15;
    let top = clientY - wrapperRect.top - 20;

    const tooltipW = tooltip.offsetWidth || 220;
    if (left + tooltipW > wrapperRect.width - 10) {
      left = clientX - wrapperRect.left - tooltipW - 15;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
}

/**
 * Main render function for the Item Analytics subtab
 */
export function renderItemAnalyticsView(mountEl, farmId) {
  if (!mountEl) return;
  const trades = tradeHistoryData?.trades || [];
  const tradedItems = getAllTradedItems(trades, farmId, analyticsTradeType);
  const allTradedItemsAny = getAllTradedItems(trades, farmId, 'all');

  // Selected items list
  const selectedList = Array.from(selectedItems);
  const { title: horizonTitle, buckets } = getTimeBuckets(analyticsTimeHorizon, trades);
  const { series, matchingTrades } = aggregateItemSeries(trades, farmId, selectedList, buckets, analyticsTradeType);

  // Available unselected items to choose from
  const availableItems = tradedItems.filter(item => !selectedItems.has(item.name));
  const filteredItems = itemSearchFilter
    ? tradedItems.filter(item => item.name.toLowerCase().includes(itemSearchFilter.toLowerCase()))
    : tradedItems;

  mountEl.innerHTML = `
    <div class="p-3 sm:p-5 space-y-4">
      
      <!-- TOP CONTROLS: HORIZON, TRADE TYPE & METRIC TOGGLE -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-amber-50/80 dark:bg-amber-950/40 border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl p-3 shadow-2xs">
        
        <!-- Left: Time Horizon Buttons (Day, Week, Month, All Time) -->
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
          <button id="horizon-all-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTimeHorizon === 'all' ? 'bg-sfl-wood dark:bg-amber-800 text-amber-100 border-sfl-dirt dark:border-amber-600 ring-2 ring-sfl-gold' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-amber-100/60'}">
            🌐 All Time
          </button>
        </div>

        <!-- Middle: Trade Type Filter (All, Sold, Bought) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 mr-1 flex items-center gap-1">
            <span>🔄</span> Mode:
          </span>
          <button id="trade-type-all-btn" 
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTradeType === 'all' ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-amber-100/60'}">
            ⚖️ All (Sold & Bought)
          </button>
          <button id="trade-type-sold-btn" 
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTradeType === 'sold' ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}">
            🟢 Sold Only
          </button>
          <button id="trade-type-bought-btn" 
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsTradeType === 'bought' ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-blue-50 dark:hover:bg-blue-950/30'}">
            🔵 Bought Only
          </button>
        </div>

        <!-- Right: Metric Toggle -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 mr-1 flex items-center gap-1">
            <span>📊</span> Y-Axis:
          </span>
          <button id="metric-sfl-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsMetric === 'sfl' ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}">
            💰 ${analyticsTradeType === 'bought' ? 'SFL Spent' : (analyticsTradeType === 'sold' ? 'SFL Sales' : 'Net SFL Flow')}
          </button>
          <button id="metric-qty-btn" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${analyticsMetric === 'qty' ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-400' : 'bg-white dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border-sfl-cardBorder dark:border-amber-700/60 hover:bg-blue-50 dark:hover:bg-blue-950/30'}">
            📦 ${analyticsTradeType === 'bought' ? 'Units Bought' : (analyticsTradeType === 'sold' ? 'Units Sold' : 'Net Units')}
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
            <select id="item-add-select" class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700/60 cursor-pointer max-w-[280px]">
              <option value="">➕ Choose an item to add...</option>
              ${availableItems.map(item => {
                let badge = '';
                if (analyticsTradeType === 'bought') {
                  badge = `${item.boughtCount} buys, -${item.totalBoughtSfl.toFixed(2)} SFL`;
                } else if (analyticsTradeType === 'sold') {
                  badge = `${item.soldCount} sales, +${item.totalSoldSfl.toFixed(2)} SFL`;
                } else {
                  badge = `${item.count} trades | Net ${item.netSfl >= 0 ? '+' : ''}${item.netSfl.toFixed(2)} SFL`;
                }
                return `<option value="${item.name}">${item.name} (${badge})</option>`;
              }).join('')}
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
            const itemData = allTradedItemsAny.find(i => i.name === itemName);
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
              No items selected. Choose an item from the dropdown or quick search below to view trading analytics.
            </span>
          ` : ''}
        </div>

        ${itemSearchFilter ? `
          <!-- Quick search matches to add -->
          <div class="flex items-center gap-1.5 flex-wrap pt-1">
            <span class="text-[11px] text-sfl-woodLight dark:text-amber-300/70">Matches:</span>
            ${filteredItems.slice(0, 8).map(item => {
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
            Select one or more items above to view their sales/purchases graph, comparative metrics, and transaction history.
          </p>
        </div>
      ` : `
        <div class="sfl-item-summary-card rounded-xl p-4 shadow-sm space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-300/60 dark:border-amber-700/50 pb-2">
            <div>
              <h4 class="text-sm font-black text-sfl-wood dark:text-amber-200 flex items-center gap-2">
                <span>📈</span> Multi-Item Activity Comparison: <span class="text-sfl-green dark:text-emerald-400 font-bold">${horizonTitle}</span>
              </h4>
              <p class="text-[11px] font-semibold text-sfl-woodLight dark:text-amber-300/70">
                Plotting ${metricDescription(analyticsMetric, analyticsTradeType)} across ${selectedList.length} selected item(s)
              </p>
            </div>

            <!-- Color Legend (Click to focus single series) -->
            <div class="flex items-center gap-1.5 flex-wrap text-xs font-mono font-bold">
              ${series.map(s => {
                let badgeText = '';
                if (analyticsMetric === 'sfl') {
                  badgeText = (s.totalSfl >= 0 ? '+' : '') + s.totalSfl.toFixed(2);
                } else {
                  badgeText = (s.totalQty >= 0 ? '+' : '') + s.totalQty.toLocaleString();
                }
                const isFocused = focusedItemSeries === s.itemName;
                return `
                  <button data-focus-series="${s.itemName}" title="Click to ${isFocused ? 'show all series' : 'focus only ' + s.itemName}" class="focus-series-btn inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-2xs cursor-pointer transition-all ${
                    isFocused 
                      ? 'bg-amber-200 dark:bg-amber-800 border-amber-500 dark:border-amber-400 ring-2 ring-amber-400 scale-105' 
                      : 'bg-white/80 dark:bg-amber-950/60 border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${s.color};"></span>
                    <span class="text-sfl-wood dark:text-amber-200">${s.itemName}</span>
                    <span class="text-[10px] font-black" style="color: ${s.color};">${badgeText}</span>
                    ${isFocused ? '<span class="text-[9px] text-amber-800 dark:text-amber-200 font-sans ml-0.5">✕</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- SVG Graph -->
          ${generateMultiItemSvgChart(series, buckets, analyticsMetric, analyticsTradeType)}
        </div>

        <!-- PERFORMANCE STATS BREAKDOWN FOR SELECTED ITEMS ONLY (WITH BOUGHT & SOLD) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          ${series.map(s => {
            const avgSellPrice = s.totalSoldQty > 0 ? (s.totalGrossSoldSfl / s.totalSoldQty) : 0;
            const avgBuyPrice = s.totalBoughtQty > 0 ? (s.totalBoughtSfl / s.totalBoughtQty) : 0;
            const isProfit = s.netSfl >= 0;

            return `
              <div class="rounded-xl p-3.5 border-2 shadow-2xs bg-white/95 dark:bg-amber-950/50 border-amber-300/80 dark:border-amber-700/60 flex flex-col justify-between space-y-3">
                
                <!-- Card Header -->
                <div class="flex items-center justify-between gap-2 pb-2 border-b border-amber-200/80 dark:border-amber-800/60">
                  <div class="flex items-center gap-2">
                    <span class="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-xs" style="background-color: ${s.color};"></span>
                    <span class="text-xs font-black text-sfl-dirt dark:text-amber-100">${s.itemName}</span>
                  </div>
                  <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                    ${s.totalCount} transactions
                  </span>
                </div>

                <!-- 3 Columns: Sold, Bought, Net Flow -->
                <div class="grid grid-cols-3 gap-2 text-xs">
                  
                  <!-- Sold Column -->
                  <div class="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col justify-between">
                    <div class="font-bold text-[10px] text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1 mb-1">
                      <span>🟢</span> Sold
                    </div>
                    <div class="space-y-0.5 font-mono text-[11px]">
                      <div class="font-black text-emerald-700 dark:text-emerald-400">+${s.totalSoldSfl.toFixed(3)} SFL</div>
                      <div class="text-[10px] text-sfl-woodLight dark:text-amber-300/70">📦 ${s.totalSoldQty.toLocaleString()} units</div>
                      <div class="text-[10px] text-sfl-woodLight dark:text-amber-300/60">${s.totalSoldCount} sales</div>
                      ${s.totalSoldQty > 0 ? `<div class="text-[9px] text-sfl-woodLight dark:text-amber-300/60">~${avgSellPrice.toFixed(4)}/ea</div>` : ''}
                    </div>
                  </div>

                  <!-- Bought Column -->
                  <div class="p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex flex-col justify-between">
                    <div class="font-bold text-[10px] text-blue-800 dark:text-blue-300 uppercase flex items-center gap-1 mb-1">
                      <span>🔵</span> Bought
                    </div>
                    <div class="space-y-0.5 font-mono text-[11px]">
                      <div class="font-black text-blue-700 dark:text-blue-400">-${s.totalBoughtSfl.toFixed(3)} SFL</div>
                      <div class="text-[10px] text-sfl-woodLight dark:text-amber-300/70">📦 ${s.totalBoughtQty.toLocaleString()} units</div>
                      <div class="text-[10px] text-sfl-woodLight dark:text-amber-300/60">${s.totalBoughtCount} buys</div>
                      ${s.totalBoughtQty > 0 ? `<div class="text-[9px] text-sfl-woodLight dark:text-amber-300/60">~${avgBuyPrice.toFixed(4)}/ea</div>` : ''}
                    </div>
                  </div>

                  <!-- Net Flow Column -->
                  <div class="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex flex-col justify-between">
                    <div class="font-bold text-[10px] text-sfl-wood dark:text-amber-200 uppercase flex items-center gap-1 mb-1">
                      <span>⚖️</span> Net Flow
                    </div>
                    <div class="space-y-0.5 font-mono text-[11px]">
                      <div class="font-black ${isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                        ${isProfit ? '+' : ''}${s.netSfl.toFixed(3)} SFL
                      </div>
                      <div class="text-[10px] text-sfl-wood dark:text-amber-200 font-bold">
                        Net Qty: ${s.netQty >= 0 ? '+' : ''}${s.netQty.toLocaleString()}
                      </div>
                      <div class="text-[9px] text-sfl-woodLight dark:text-amber-300/60 font-sans">
                        ${isProfit ? 'Profit' : 'Cost/Loss'}
                      </div>
                    </div>
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
              <span>📜</span> Activity Log for Selected Items in Period
            </span>
            <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 font-mono">
              ${matchingTrades.length} trades recorded
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-sfl-dirt dark:text-amber-100">
              <thead class="text-[10px] uppercase bg-sfl-card dark:bg-amber-950/50 border-b border-sfl-cardBorder dark:border-amber-700/60 text-sfl-wood dark:text-amber-200">
                <tr>
                  <th class="px-3 py-2">Date & Time</th>
                  <th class="px-2 py-2">Type</th>
                  <th class="px-3 py-2">Item Name</th>
                  <th class="px-2 py-2">Quantity</th>
                  <th class="px-2 py-2">Unit Price</th>
                  <th class="px-3 py-2">Counterparty</th>
                  <th class="px-3 py-2 text-right">Net SFL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-sfl-cardBorder/40 dark:divide-amber-700/40 font-medium">
                ${matchingTrades.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-6 text-center text-sfl-woodLight dark:text-amber-300/60 italic">
                      No transactions recorded for the selected item(s) in this time range.
                    </td>
                  </tr>
                ` : matchingTrades.map(t => {
                  const isSeller = isUserSeller(t, farmId);
                  const amounts = getTradeAmounts(t, farmId);
                  const rawDate = t.fulfilledAt;
                  const d = rawDate ? new Date(rawDate) : null;
                  const dateStr = d && !isNaN(d.getTime())
                    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recent';
                  const qty = parseFloat(t.quantity || 1);
                  const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;
                  const otherUser = t.counterpartyName || (isSeller ? (t.fulfilledBy?.username || 'Buyer') : (t.initiatedBy?.username || 'Seller'));
                  const itemColor = getItemColor(t.itemName, selectedList);

                  return `
                    <tr class="hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition">
                      <td class="px-3 py-2 font-mono text-sfl-wood dark:text-amber-200 whitespace-nowrap">${dateStr}</td>
                      <td class="px-2 py-2">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSeller 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        }">
                          ${isSeller ? '🟢 SOLD' : '🔵 BOUGHT'}
                        </span>
                      </td>
                      <td class="px-3 py-2 font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background-color: ${itemColor};"></span>
                        <span>${t.itemName}</span>
                      </td>
                      <td class="px-2 py-2 font-mono font-bold text-sfl-wood dark:text-amber-200">${qty.toLocaleString()}</td>
                      <td class="px-2 py-2 font-mono text-sfl-woodLight dark:text-amber-300/70">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
                      <td class="px-3 py-2 font-medium text-sfl-wood dark:text-amber-200">${otherUser}</td>
                      <td class="px-3 py-2 font-mono font-bold text-right ${isSeller ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}">
                        ${isSeller ? '+' : '-'}${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
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
  document.getElementById('horizon-all-btn')?.addEventListener('click', () => setAnalyticsTimeHorizon('all'));

  document.getElementById('trade-type-all-btn')?.addEventListener('click', () => setAnalyticsTradeType('all'));
  document.getElementById('trade-type-sold-btn')?.addEventListener('click', () => setAnalyticsTradeType('sold'));
  document.getElementById('trade-type-bought-btn')?.addEventListener('click', () => setAnalyticsTradeType('bought'));

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

  document.getElementById('quick-top5-btn')?.addEventListener('click', () => selectTopTradedItems(tradedItems, 5));
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

  // Series Focus/Isolation Click Handler from Legend
  mountEl.querySelectorAll('.focus-series-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemName = btn.getAttribute('data-focus-series');
      if (focusedItemSeries === itemName) {
        focusedItemSeries = null;
      } else {
        focusedItemSeries = itemName;
      }
      renderItemAnalyticsView(mountEl, farmId);
    });
  });

  // Bind interactive SVG chart crosshairs & tooltips
  bindInteractiveMultiItemChart(mountEl);
}

function metricDescription(metric, tradeType) {
  if (metric === 'sfl') {
    if (tradeType === 'bought') return 'Total SFL Spent on Purchases';
    if (tradeType === 'sold') return 'Net SFL Revenue Earned from Sales';
    return 'Net SFL Flow (Sales Revenue minus Purchase Spend)';
  } else {
    if (tradeType === 'bought') return 'Total Units Purchased';
    if (tradeType === 'sold') return 'Total Units Sold';
    return 'Net Units Flow (Purchased minus Sold)';
  }
}
