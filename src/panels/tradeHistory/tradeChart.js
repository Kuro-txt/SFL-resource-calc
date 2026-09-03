export function generateSvgChart(dataPoints, height = 110) {
  if (!dataPoints || dataPoints.length === 0) {
    return `<div class="p-3 text-center text-sfl-woodLight text-xs italic">No trading activity data to plot in this period.</div>`;
  }

  const maxVal = Math.max(...dataPoints.map(d => Math.max(d.sold || 0, d.spent || 0, Math.abs(d.net || 0))), 1);
  const chartW = 580;
  const paddingX = 35;
  const paddingY = 16;
  const usableW = chartW - paddingX * 2;
  const usableH = height - paddingY * 2;
  const count = dataPoints.length;
  const step = usableW / Math.max(count, 1);
  const barW = Math.min(Math.max(step * 0.32, 4), 16);

  let barsHtml = '';
  let points = [];
  let labelsHtml = '';

  dataPoints.forEach((d, i) => {
    const x = paddingX + i * step + step / 2;
    const soldH = ((d.sold || 0) / maxVal) * usableH;
    const spentH = ((d.spent || 0) / maxVal) * usableH;
    
    const soldY = (height - paddingY) - soldH;
    const spentY = (height - paddingY) - spentH;
    const netY = (height - paddingY) - (((d.net || 0) / maxVal) * usableH);

    // Green Sales Bar
    if (d.sold > 0) {
      barsHtml += `<rect x="${x - barW - 1}" y="${soldY}" width="${barW}" height="${soldH}" rx="1.5" fill="#22c55e" opacity="0.85">
        <title>${d.label}: +${d.sold.toFixed(3)} SFL Sales</title>
      </rect>`;
    }
    // Blue Spend Bar
    if (d.spent > 0) {
      barsHtml += `<rect x="${x + 1}" y="${spentY}" width="${barW}" height="${spentH}" rx="1.5" fill="#3b82f6" opacity="0.85">
        <title>${d.label}: -${d.spent.toFixed(3)} SFL Spent</title>
      </rect>`;
    }

    // Line point for Net
    points.push(`${x},${netY}`);

    // X Axis Label
    if (count <= 10 || i % Math.ceil(count / 8) === 0 || i === count - 1) {
      labelsHtml += `<text x="${x}" y="${height - 2}" text-anchor="middle" font-size="8.5" font-family="monospace" font-weight="bold" fill="#8a5832">${d.label}</text>`;
    }
  });

  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';

  return `
    <div class="w-full bg-amber-50/60 dark:bg-amber-950/20 border-b border-sfl-cardBorder px-3 py-2">
      <div class="flex items-center justify-between mb-1 text-[10px] font-bold text-sfl-wood">
        <span class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1 text-sfl-green"><span class="w-2 h-2 rounded-xs bg-green-500 inline-block"></span> Sales</span>
          <span class="inline-flex items-center gap-1 text-blue-500"><span class="w-2 h-2 rounded-xs bg-blue-500 inline-block"></span> Spent</span>
          <span class="inline-flex items-center gap-1 text-amber-600"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Net Profit</span>
        </span>
        <span class="font-mono text-sfl-woodLight text-[9px]">Peak: ${maxVal.toFixed(2)} SFL</span>
      </div>
      <svg viewBox="0 0 ${chartW} ${height}" class="w-full h-24 select-none">
        <line x1="${paddingX}" y1="${height - paddingY}" x2="${chartW - paddingX}" y2="${height - paddingY}" stroke="#d4a373" stroke-dasharray="3,3" stroke-width="1"/>
        ${barsHtml}
        ${pathD ? `<path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${points.map((pt, idx) => {
          const d = dataPoints[idx];
          const [px, py] = pt.split(',');
          return `<circle cx="${px}" cy="${py}" r="2.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1">
            <title>${d.label} Net: ${d.net >= 0 ? '+' : ''}${d.net.toFixed(3)} SFL</title>
          </circle>`;
        }).join('')}
        ${labelsHtml}
      </svg>
    </div>
  `;
}
