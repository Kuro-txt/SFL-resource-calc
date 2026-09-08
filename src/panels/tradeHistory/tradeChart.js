export let calendarChartFilter = 'all'; // 'all' | 'spent' | 'sold' | 'net'
export let lastCalendarDataPoints = [];

export function setCalendarChartFilter(filter) {
  calendarChartFilter = filter;
}

export function generateSvgChart(dataPoints, height = 125) {
  lastCalendarDataPoints = Array.isArray(dataPoints) ? dataPoints : [];
  if (!dataPoints || dataPoints.length === 0) {
    return `<div class="p-3 text-center text-sfl-woodLight text-xs italic">No trading activity data to plot in this period.</div>`;
  }

  const chartW = 580;
  const paddingX = 35;
  const paddingY = 18;
  const usableW = chartW - paddingX * 2;
  const usableH = height - paddingY * 2;
  const count = dataPoints.length;
  const step = usableW / Math.max(count, 1);
  const barW = Math.min(Math.max(step * 0.35, 4), 16);

  // Compute maximums based on active filter
  let maxVal = 1;
  if (calendarChartFilter === 'spent') {
    maxVal = Math.max(...dataPoints.map(d => d.spent || 0), 0.1);
  } else if (calendarChartFilter === 'sold') {
    maxVal = Math.max(...dataPoints.map(d => d.sold || 0), 0.1);
  } else if (calendarChartFilter === 'net') {
    maxVal = Math.max(...dataPoints.map(d => Math.abs(d.net || 0)), 0.1);
  } else {
    maxVal = Math.max(...dataPoints.map(d => Math.max(d.sold || 0, d.spent || 0, Math.abs(d.net || 0))), 0.1);
  }

  // Determine baseline zero line to prevent negative net clipping
  const hasNegativeNet = dataPoints.some(d => (d.net || 0) < 0);
  let zeroY = height - paddingY;
  let positiveH = usableH;
  let negativeH = 0;

  if (calendarChartFilter === 'all' && hasNegativeNet) {
    const maxPos = Math.max(...dataPoints.map(d => Math.max(d.sold || 0, d.spent || 0, Math.max(0, d.net || 0))), 0.1);
    const maxNeg = Math.max(...dataPoints.map(d => Math.max(0, -(d.net || 0))), 0.1);
    const totalSpan = maxPos + maxNeg;
    positiveH = (maxPos / totalSpan) * usableH;
    negativeH = (maxNeg / totalSpan) * usableH;
    zeroY = paddingY + positiveH;
    maxVal = maxPos;
  }

  let barsHtml = '';
  let points = [];
  let labelsHtml = '';
  let hoverColsHtml = '';

  dataPoints.forEach((d, i) => {
    const x = paddingX + i * step + step / 2;
    const sold = d.sold || 0;
    const spent = d.spent || 0;
    const net = d.net !== undefined ? d.net : (sold - spent);

    const soldH = (sold / maxVal) * positiveH;
    const spentH = (spent / maxVal) * positiveH;

    const soldY = zeroY - soldH;
    const spentY = zeroY - spentH;

    let netY = zeroY;
    if (net >= 0) {
      netY = zeroY - (net / maxVal) * positiveH;
    } else if (negativeH > 0) {
      const maxNeg = Math.max(...dataPoints.map(pt => Math.max(0, -(pt.net || 0))), 0.1);
      netY = zeroY + (Math.abs(net) / maxNeg) * negativeH;
    } else {
      netY = zeroY;
    }

    if (calendarChartFilter === 'all') {
      if (sold > 0) {
        barsHtml += `<rect x="${x - barW - 1}" y="${soldY}" width="${barW}" height="${soldH}" rx="1.5" fill="#22c55e" opacity="0.88" class="pointer-events-none" />`;
      }
      if (spent > 0) {
        barsHtml += `<rect x="${x + 1}" y="${spentY}" width="${barW}" height="${spentH}" rx="1.5" fill="#3b82f6" opacity="0.88" class="pointer-events-none" />`;
      }
      points.push(`${x},${netY}`);
    } else if (calendarChartFilter === 'spent') {
      if (spent > 0) {
        const fullSpentH = (spent / maxVal) * usableH;
        const fullSpentY = (height - paddingY) - fullSpentH;
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullSpentY}" width="${barW * 1.5}" height="${fullSpentH}" rx="2" fill="#3b82f6" opacity="0.9" class="pointer-events-none" />`;
        points.push(`${x},${fullSpentY}`);
      } else {
        points.push(`${x},${height - paddingY}`);
      }
    } else if (calendarChartFilter === 'sold') {
      if (sold > 0) {
        const fullSoldH = (sold / maxVal) * usableH;
        const fullSoldY = (height - paddingY) - fullSoldH;
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullSoldY}" width="${barW * 1.5}" height="${fullSoldH}" rx="2" fill="#22c55e" opacity="0.9" class="pointer-events-none" />`;
        points.push(`${x},${fullSoldY}`);
      } else {
        points.push(`${x},${height - paddingY}`);
      }
    } else if (calendarChartFilter === 'net') {
      const netColor = net >= 0 ? '#22c55e' : '#ef4444';
      if (Math.abs(net) > 0) {
        const fullNetH = (Math.abs(net) / maxVal) * (usableH / 2);
        const fullNetY = net >= 0 ? (height / 2 - fullNetH) : (height / 2);
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullNetY}" width="${barW * 1.5}" height="${fullNetH}" rx="2" fill="${netColor}" opacity="0.9" class="pointer-events-none" />`;
      }
      points.push(`${x},${netY}`);
    }

    // X Axis Labels
    if (count <= 10 || i % Math.ceil(count / 8) === 0 || i === count - 1) {
      labelsHtml += `<text x="${x}" y="${height - 3}" text-anchor="middle" font-size="8.5" font-family="monospace" font-weight="bold" fill="#8a5832" class="pointer-events-none">${d.label}</text>`;
    }

    // Transparent Interactive Hover Column
    hoverColsHtml += `
      <rect class="chart-col-hover-target" data-idx="${i}" data-cx="${x}" x="${x - step / 2}" y="0" width="${step}" height="${height}" fill="transparent" cursor="pointer" />
    `;
  });

  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';
  const totalPeriodSpent = dataPoints.reduce((sum, d) => sum + (d.spent || 0), 0);
  const totalPeriodSold = dataPoints.reduce((sum, d) => sum + (d.sold || 0), 0);

  return `
    <div class="calendar-chart-wrapper relative w-full bg-amber-50/60 dark:bg-amber-950/20 border-b border-sfl-cardBorder px-3 py-2 select-none overflow-visible">
      <!-- GRAPH FILTER SWITCHER BAR -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-1.5 text-[10px] font-bold text-sfl-wood">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-sfl-woodLight uppercase text-[9px] mr-1">Graph Mode:</span>
          <button data-chart-filter="all" class="chart-filter-btn px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition border ${calendarChartFilter === 'all' ? 'bg-amber-600 text-white border-amber-700 shadow-xs' : 'bg-white dark:bg-amber-900/30 text-sfl-dirt dark:text-amber-200 border-sfl-cardBorder hover:bg-amber-100'}">
            📊 All
          </button>
          <button data-chart-filter="spent" class="chart-filter-btn px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition border ${calendarChartFilter === 'spent' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white dark:bg-amber-900/30 text-blue-700 dark:text-blue-300 border-sfl-cardBorder hover:bg-blue-50'}">
            🔵 Spend Graph (-${totalPeriodSpent.toFixed(2)} SFL)
          </button>
          <button data-chart-filter="sold" class="chart-filter-btn px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition border ${calendarChartFilter === 'sold' ? 'bg-green-600 text-white border-green-700 shadow-xs' : 'bg-white dark:bg-amber-900/30 text-green-700 dark:text-green-300 border-sfl-cardBorder hover:bg-green-50'}">
            🟢 Sales (+${totalPeriodSold.toFixed(2)} SFL)
          </button>
          <button data-chart-filter="net" class="chart-filter-btn px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition border ${calendarChartFilter === 'net' ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-xs' : 'bg-white dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-sfl-cardBorder hover:bg-amber-50'}">
            ⚖️ Net Profit
          </button>
        </div>

        <span class="font-mono text-sfl-woodLight text-[9px]">Peak: ${maxVal.toFixed(2)} SFL • <em>Hover/Click points</em></span>
      </div>

      <!-- FLOATING INTERACTIVE TOOLTIP -->
      <div id="calendar-chart-tooltip" class="hidden absolute z-30 pointer-events-none rounded-xl p-2.5 text-xs shadow-2xl border-2 transition-all duration-75 bg-white/95 text-sfl-dirt border-amber-400 dark:bg-amber-950/95 dark:text-amber-100 dark:border-amber-600 backdrop-blur-xs min-w-[170px]"></div>

      <svg viewBox="0 0 ${chartW} ${height}" class="w-full h-28 select-none overflow-visible">
        <!-- Baseline zero line -->
        <line x1="${paddingX}" y1="${zeroY}" x2="${chartW - paddingX}" y2="${zeroY}" stroke="#d4a373" stroke-dasharray="3,3" stroke-width="1"/>
        
        <!-- Interactive Hover Highlight Column & Crosshair -->
        <rect id="calendar-hover-highlight" x="0" y="0" width="${step}" height="${height}" fill="#f59e0b" opacity="0" rx="3" pointer-events="none" />
        <line id="calendar-crosshair" x1="0" y1="0" x2="0" y2="${height - 10}" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3,3" opacity="0" pointer-events="none" />

        <!-- Bars -->
        ${barsHtml}

        <!-- Trend Line -->
        ${pathD && (calendarChartFilter === 'all' || calendarChartFilter === 'spent' || calendarChartFilter === 'sold') ? `<path d="${pathD}" fill="none" stroke="${calendarChartFilter === 'spent' ? '#3b82f6' : (calendarChartFilter === 'sold' ? '#22c55e' : '#f59e0b')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />` : ''}

        <!-- Points -->
        ${points.map((pt, idx) => {
          const [px, py] = pt.split(',');
          let color = '#f59e0b';
          if (calendarChartFilter === 'spent') color = '#3b82f6';
          else if (calendarChartFilter === 'sold') color = '#22c55e';
          return `<circle cx="${px}" cy="${py}" r="2.5" fill="${color}" stroke="#ffffff" stroke-width="1" class="pointer-events-none" />`;
        }).join('')}

        <!-- X Axis Labels -->
        ${labelsHtml}

        <!-- Transparent Hover Detection Columns -->
        ${hoverColsHtml}
      </svg>
    </div>
  `;
}

/**
 * Binds hover tooltips, crosshairs, and click navigation on the calendar chart
 */
export function bindInteractiveCalendarChart(containerEl, onSelectDate) {
  if (!containerEl) return;
  const wrapper = containerEl.querySelector('.calendar-chart-wrapper');
  if (!wrapper) return;

  const tooltip = wrapper.querySelector('#calendar-chart-tooltip');
  const crosshair = wrapper.querySelector('#calendar-crosshair');
  const highlight = wrapper.querySelector('#calendar-hover-highlight');
  const hoverCols = wrapper.querySelectorAll('.chart-col-hover-target');

  hoverCols.forEach(col => {
    col.addEventListener('pointerenter', onHover);
    col.addEventListener('pointermove', onHover);
    col.addEventListener('click', () => {
      const idx = parseInt(col.getAttribute('data-idx'), 10);
      const d = lastCalendarDataPoints[idx];
      if (d && d.dateKey && typeof onSelectDate === 'function') {
        onSelectDate(d.dateKey);
      }
    });
  });

  wrapper.addEventListener('pointerleave', () => {
    if (tooltip) tooltip.classList.add('hidden');
    if (crosshair) crosshair.setAttribute('opacity', '0');
    if (highlight) highlight.setAttribute('opacity', '0');
  });

  function onHover(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
    const d = lastCalendarDataPoints[idx];
    if (!d || !tooltip) return;

    const x = parseFloat(e.currentTarget.getAttribute('data-cx') || 0);
    const step = parseFloat(e.currentTarget.getAttribute('width') || 20);

    // Position crosshair and highlight
    if (crosshair) {
      crosshair.setAttribute('x1', x);
      crosshair.setAttribute('x2', x);
      crosshair.setAttribute('opacity', '1');
    }
    if (highlight) {
      highlight.setAttribute('x', x - step / 2);
      highlight.setAttribute('opacity', '0.08');
    }

    // Build rich tooltip content
    const sold = d.sold || 0;
    const spent = d.spent || 0;
    const net = d.net !== undefined ? d.net : (sold - spent);
    const isProfit = net >= 0;
    const dateTitle = d.fullDateStr || d.label;

    tooltip.innerHTML = `
      <div class="space-y-1.5 font-mono">
        <div class="font-bold text-[11px] text-sfl-dirt dark:text-amber-100 flex items-center justify-between gap-3 border-b border-amber-300/60 dark:border-amber-700/60 pb-1">
          <span class="flex items-center gap-1 font-sans"><span>📅</span> ${dateTitle}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${isProfit ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300'}">
            ${isProfit ? 'PROFIT' : 'LOSS'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <span class="text-sfl-woodLight dark:text-amber-300/70 font-sans">Sales:</span>
          <span class="text-right font-bold text-emerald-600 dark:text-emerald-400">+${sold.toFixed(3)} SFL</span>
          <span class="text-sfl-woodLight dark:text-amber-300/70 font-sans">Spent:</span>
          <span class="text-right font-bold text-blue-600 dark:text-blue-400">-${spent.toFixed(3)} SFL</span>
          <span class="text-sfl-wood dark:text-amber-200 font-bold border-t border-amber-200/60 dark:border-amber-800/60 pt-0.5 font-sans">Net Flow:</span>
          <span class="text-right font-black border-t border-amber-200/60 dark:border-amber-800/60 pt-0.5 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
            ${net >= 0 ? '+' : ''}${net.toFixed(3)} SFL
          </span>
        </div>
        ${d.dateKey ? `
          <div class="pt-1 border-t border-amber-200/60 dark:border-amber-800/60 text-[10px] text-amber-700 dark:text-amber-300 font-sans font-semibold flex items-center gap-1">
            <span>👆</span> <em>Click to inspect day's trades</em>
          </div>
        ` : ''}
      </div>
    `;

    tooltip.classList.remove('hidden');

    // Tooltip position relative to wrapper bounds
    const wrapperRect = wrapper.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let left = clientX - wrapperRect.left + 15;
    let top = clientY - wrapperRect.top - 15;

    const tooltipW = tooltip.offsetWidth || 180;
    if (left + tooltipW > wrapperRect.width - 10) {
      left = clientX - wrapperRect.left - tooltipW - 15;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
}
