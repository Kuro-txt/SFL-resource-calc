export let calendarChartFilter = 'all'; // 'all' | 'spent' | 'sold' | 'net'

export function setCalendarChartFilter(filter) {
  calendarChartFilter = filter;
}

export function generateSvgChart(dataPoints, height = 125) {
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

  dataPoints.forEach((d, i) => {
    const x = paddingX + i * step + step / 2;
    const sold = d.sold || 0;
    const spent = d.spent || 0;
    const net = d.net || 0;

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
        barsHtml += `<rect x="${x - barW - 1}" y="${soldY}" width="${barW}" height="${soldH}" rx="1.5" fill="#22c55e" opacity="0.88">
          <title>${d.label}: +${sold.toFixed(3)} SFL Sales</title>
        </rect>`;
      }
      if (spent > 0) {
        barsHtml += `<rect x="${x + 1}" y="${spentY}" width="${barW}" height="${spentH}" rx="1.5" fill="#3b82f6" opacity="0.88">
          <title>${d.label}: -${spent.toFixed(3)} SFL Spent</title>
        </rect>`;
      }
      points.push(`${x},${netY}`);
    } else if (calendarChartFilter === 'spent') {
      if (spent > 0) {
        const fullSpentH = (spent / maxVal) * usableH;
        const fullSpentY = (height - paddingY) - fullSpentH;
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullSpentY}" width="${barW * 1.5}" height="${fullSpentH}" rx="2" fill="#3b82f6" opacity="0.9">
          <title>${d.label}: ${spent.toFixed(3)} SFL Spent</title>
        </rect>`;
        points.push(`${x},${fullSpentY}`);
      } else {
        points.push(`${x},${height - paddingY}`);
      }
    } else if (calendarChartFilter === 'sold') {
      if (sold > 0) {
        const fullSoldH = (sold / maxVal) * usableH;
        const fullSoldY = (height - paddingY) - fullSoldH;
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullSoldY}" width="${barW * 1.5}" height="${fullSoldH}" rx="2" fill="#22c55e" opacity="0.9">
          <title>${d.label}: +${sold.toFixed(3)} SFL Sales</title>
        </rect>`;
        points.push(`${x},${fullSoldY}`);
      } else {
        points.push(`${x},${height - paddingY}`);
      }
    } else if (calendarChartFilter === 'net') {
      const netColor = net >= 0 ? '#22c55e' : '#ef4444';
      if (Math.abs(net) > 0) {
        const fullNetH = (Math.abs(net) / maxVal) * (usableH / 2);
        const fullNetY = net >= 0 ? (height / 2 - fullNetH) : (height / 2);
        barsHtml += `<rect x="${x - (barW * 1.5) / 2}" y="${fullNetY}" width="${barW * 1.5}" height="${fullNetH}" rx="2" fill="${netColor}" opacity="0.9">
          <title>${d.label}: ${net >= 0 ? '+' : ''}${net.toFixed(3)} SFL Net</title>
        </rect>`;
      }
      points.push(`${x},${netY}`);
    }

    // X Axis Labels
    if (count <= 10 || i % Math.ceil(count / 8) === 0 || i === count - 1) {
      labelsHtml += `<text x="${x}" y="${height - 3}" text-anchor="middle" font-size="8.5" font-family="monospace" font-weight="bold" fill="#8a5832">${d.label}</text>`;
    }
  });

  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';
  const totalPeriodSpent = dataPoints.reduce((sum, d) => sum + (d.spent || 0), 0);
  const totalPeriodSold = dataPoints.reduce((sum, d) => sum + (d.sold || 0), 0);

  return `
    <div class="w-full bg-amber-50/60 dark:bg-amber-950/20 border-b border-sfl-cardBorder px-3 py-2">
      <!-- GRAPH FILTER SWITCHER BAR -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-1.5 text-[10px] font-bold text-sfl-wood">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-sfl-woodLight uppercase text-[9px] mr-1">Graph Mode:</span>
          <button data-chart-filter="all" class="chart-filter-btn px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition border ${calendarChartFilter === 'all' ? 'bg-amber-600 text-white border-amber-700 shadow-xs' : 'bg-white dark:bg-amber-900/30 text-sfl-dirt border-sfl-cardBorder hover:bg-amber-100'}">
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

        <span class="font-mono text-sfl-woodLight text-[9px]">Peak: ${maxVal.toFixed(2)} SFL</span>
      </div>

      <svg viewBox="0 0 ${chartW} ${height}" class="w-full h-28 select-none overflow-visible">
        <line x1="${paddingX}" y1="${zeroY}" x2="${chartW - paddingX}" y2="${zeroY}" stroke="#d4a373" stroke-dasharray="3,3" stroke-width="1"/>
        ${barsHtml}
        ${pathD && (calendarChartFilter === 'all' || calendarChartFilter === 'spent' || calendarChartFilter === 'sold') ? `<path d="${pathD}" fill="none" stroke="${calendarChartFilter === 'spent' ? '#3b82f6' : (calendarChartFilter === 'sold' ? '#22c55e' : '#f59e0b')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${points.map((pt, idx) => {
          const d = dataPoints[idx];
          const [px, py] = pt.split(',');
          let color = '#f59e0b';
          let tip = `${d.label} Net: ${d.net >= 0 ? '+' : ''}${d.net.toFixed(3)} SFL`;
          if (calendarChartFilter === 'spent') {
            color = '#3b82f6';
            tip = `${d.label} Spent: -${(d.spent || 0).toFixed(3)} SFL`;
          } else if (calendarChartFilter === 'sold') {
            color = '#22c55e';
            tip = `${d.label} Sales: +${(d.sold || 0).toFixed(3)} SFL`;
          }
          return `<circle cx="${px}" cy="${py}" r="2.5" fill="${color}" stroke="#ffffff" stroke-width="1">
            <title>${tip}</title>
          </circle>`;
        }).join('')}
        ${labelsHtml}
      </svg>
    </div>
  `;
}
