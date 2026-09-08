import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getItemNameById } from '../../data/knownIds.js';
import { getTradeAmounts, isUserSeller, tradeHistoryData } from './tradeData.js';
import { currentFilter, selectedItemFilter, calculateItemTradeMetrics } from './tradeFilters.js';
import { searchQuery } from './index.js';

export function getTradeItemName(t) {
  const isEconomy = t.collection === 'economies' || Boolean(t.economy);
  if (isEconomy) return `#${t.itemId || '?'}`;
  const raw = t.itemName;
  if (raw && !raw.startsWith('Item #')) return raw;
  return getItemNameById(t.itemId || raw);
}

export function renderTradesTableView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];
  const summaryMount = document.getElementById('trade-item-summary-mount');

  // Render or hide dedicated item performance banner
  if (summaryMount) {
    if (selectedItemFilter && selectedItemFilter !== 'all') {
      const metrics = calculateItemTradeMetrics(trades, selectedItemFilter, farmId);
      if (metrics && metrics.totalTrades > 0) {
        summaryMount.classList.remove('hidden');
        summaryMount.innerHTML = `
          <div class="sfl-item-summary-card flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-xl p-3.5 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-2xl shadow-2xs shrink-0">
                📦
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="text-sm font-black text-sfl-wood dark:text-amber-200">${metrics.itemName}</h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                    ${metrics.totalTrades} ${metrics.totalTrades === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>
                <p class="text-[11px] font-semibold text-sfl-woodLight dark:text-amber-300/70">
                  Individual item sales, purchases & net flow summary
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono w-full lg:w-auto">
              <!-- SALES STATS -->
              <div class="trade-metric-box-sold rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="badge-sold text-[10px] font-sans font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 flex items-center gap-1">
                    🟢 Sold
                  </span>
                  <span class="stat-sold-sub text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    ${metrics.soldCount} ${metrics.soldCount === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
                <div class="stat-sold-val font-black text-emerald-700 dark:text-emerald-400 text-base font-mono flex items-center gap-1">
                  +${metrics.soldNetSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                </div>
                ${metrics.soldTax > 0 ? `<div class="stat-sold-sub text-[9.5px] font-mono text-emerald-800/80 dark:text-emerald-300/70">Gross: +${metrics.soldGrossSfl.toFixed(3)} • Tax: -${metrics.soldTax.toFixed(3)}</div>` : ''}
                <div class="stat-sold-foot text-[11px] text-sfl-wood dark:text-amber-200 mt-1.5 pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800/50 flex items-center justify-between font-sans">
                  <span>📦 <strong class="font-mono">${metrics.soldQty.toLocaleString()}</strong> units</span>
                  ${metrics.soldQty > 0 ? `<span class="text-[10px] font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-1 rounded">~${metrics.avgSellPrice.toFixed(4)}/ea</span>` : ''}
                </div>
              </div>

              <!-- BUYS STATS -->
              <div class="trade-metric-box-bought rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="badge-bought text-[10px] font-sans font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/50 flex items-center gap-1">
                    🔵 Bought
                  </span>
                  <span class="stat-bought-sub text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                    ${metrics.boughtCount} ${metrics.boughtCount === 1 ? 'buy' : 'buys'}
                  </span>
                </div>
                <div class="stat-bought-val font-black text-blue-700 dark:text-blue-300 text-base font-mono flex items-center gap-1">
                  -${metrics.boughtSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                </div>
                <div class="stat-bought-sub text-[9.5px] font-mono text-blue-800/80 dark:text-blue-300/70">Total Cost (0% buyer fee)</div>
                <div class="stat-bought-foot text-[11px] text-sfl-wood dark:text-amber-200 mt-1.5 pt-1.5 border-t border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between font-sans">
                  <span>📦 <strong class="font-mono">${metrics.boughtQty.toLocaleString()}</strong> units</span>
                  ${metrics.boughtQty > 0 ? `<span class="text-[10px] font-mono font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 px-1 rounded">~${metrics.avgBuyPrice.toFixed(4)}/ea</span>` : ''}
                </div>
              </div>

              <!-- NET SFL & FLOW -->
              <div class="trade-metric-box-net rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="badge-net text-[10px] font-sans font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/50 flex items-center gap-1">
                    ⚖️ Net Flow
                  </span>
                  <span class="text-[10px] font-mono font-bold ${metrics.netSfl >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                    ${metrics.netSfl >= 0 ? 'Profit' : 'Loss'}
                  </span>
                </div>
                <div class="font-black text-base font-mono flex items-center gap-1 ${metrics.netSfl >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
                  ${metrics.netSfl >= 0 ? '+' : ''}${metrics.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                </div>
                <div class="stat-net-sub text-[9.5px] font-mono text-sfl-woodLight dark:text-amber-300/70">Net Revenue minus Cost</div>
                <div class="stat-net-foot text-[11px] text-sfl-wood dark:text-amber-200 mt-1.5 pt-1.5 border-t border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between font-sans">
                  <span>📦 Net Qty:</span>
                  <span class="font-mono font-bold px-1.5 py-0.2 rounded ${metrics.netQty >= 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-sfl-wood dark:text-amber-200' : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'}">${metrics.netQty >= 0 ? '+' : ''}${metrics.netQty.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        summaryMount.classList.add('hidden');
        summaryMount.innerHTML = '';
      }
    } else {
      summaryMount.classList.add('hidden');
      summaryMount.innerHTML = '';
    }
  }

  let filtered = trades.filter(t => {
    const isSeller = isUserSeller(t, farmId);
    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && isSeller) return false;

    const itemName = getTradeItemName(t);

    if (selectedItemFilter && selectedItemFilter !== 'all') {
      if (itemName.trim().toLowerCase() !== selectedItemFilter.trim().toLowerCase()) {
        return false;
      }
    }

    if (searchQuery) {
      const lowerName = itemName.toLowerCase();
      const otherUser = isSeller ? (t.counterpartyName || t.fulfilledBy?.username || '').toLowerCase() : (t.counterpartyName || t.initiatedBy?.username || '').toLowerCase();
      if (!lowerName.includes(searchQuery) && !otherUser.includes(searchQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    mountEl.innerHTML = `
      <div class="p-8 text-center text-sfl-woodLight italic">
        No completed trades found matching your search and filter criteria.
      </div>
    `;
    return;
  }

  let rowsHtml = '';
  filtered.forEach(t => {
    const amounts = getTradeAmounts(t, farmId);
    const isSeller = amounts.isSeller;
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = getTradeItemName(t);
    const qty = parseFloat(t.quantity || 1);
    const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;

    const rawDate = t.fulfilledAt;
    let dateStr = 'Recent';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(rawDate);
    }

    const otherUser = isSeller
      ? (t.counterpartyName || t.fulfilledBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Buyer'))
      : (t.counterpartyName || t.initiatedBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Seller'));

    const badge = isSeller
      ? `<span class="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">🟢 SOLD</span>`
      : `<span class="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-700/60 px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood dark:text-amber-200 font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-2 py-2.5 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt dark:text-amber-100">${itemName}</td>
        <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood dark:text-amber-200">${qty.toLocaleString()}</td>
        <td class="px-2 py-2.5 font-mono text-sfl-woodLight dark:text-amber-300/70">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2.5 font-medium text-sfl-wood dark:text-amber-200">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2.5 font-mono font-bold text-right ${isSeller ? 'text-emerald-600 dark:text-emerald-400' : 'text-sfl-wood dark:text-amber-200'}">
          <div>${isSeller ? '+' : '-'}${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</div>
          ${isSeller && amounts.tax > 0 ? `<div class="text-[9px] font-normal text-sfl-woodLight dark:text-amber-300/60">Gross: ${amounts.grossSfl.toFixed(3)} • Tax: -${amounts.tax.toFixed(3)}</div>` : ''}
        </td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt dark:text-amber-100">
      <thead class="text-[11px] uppercase bg-sfl-card dark:bg-amber-950/50 border-b-2 border-sfl-cardBorder dark:border-amber-700/60 text-sfl-wood dark:text-amber-200">
        <tr>
          <th class="px-3 py-2.5">Date & Time</th>
          <th class="px-2 py-2.5">Type</th>
          <th class="px-3 py-2.5">Item Name</th>
          <th class="px-2 py-2.5">Quantity</th>
          <th class="px-2 py-2.5">Unit Price</th>
          <th class="px-3 py-2.5">Counterparty</th>
          <th class="px-3 py-2.5 text-right">Total SFL</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

export function renderSelectedDayTradesTable(displayTitle, dayData, farmId) {
  if (!dayData || dayData.trades.length === 0) {
    return `
      <div class="bg-white/90 dark:bg-amber-950/40 p-6 text-center border-t-2 border-sfl-cardBorder dark:border-amber-700/60">
        <span class="text-xs sm:text-sm font-bold text-sfl-dirt dark:text-amber-100 flex items-center justify-center gap-1.5 mb-1">
          <span>📅</span> ${displayTitle}
        </span>
        <p class="text-xs text-sfl-woodLight dark:text-amber-300/70 italic">
          No marketplace trades recorded on this date. Click on any date with trades in the calendar above.
        </p>
      </div>
    `;
  }

  let rowsHtml = '';
  dayData.trades.forEach(t => {
    const amounts = getTradeAmounts(t, farmId);
    const isSeller = amounts.isSeller;
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = getTradeItemName(t);
    const qty = parseFloat(t.quantity || 1);
    const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;

    const dateObj = t.fulfilledAt ? new Date(t.fulfilledAt) : null;
    const timeStr = dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : 'Recent';

    const otherUser = isSeller
      ? (t.counterpartyName || t.fulfilledBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Buyer'))
      : (t.counterpartyName || t.initiatedBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Seller'));

    const badge = isSeller
      ? `<span class="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 px-1.5 py-0.2 rounded text-[9px] font-bold inline-flex items-center gap-1 shadow-2xs">🟢 SOLD</span>`
      : `<span class="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-700/60 px-1.5 py-0.2 rounded text-[9px] font-bold inline-flex items-center gap-1 shadow-2xs">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition">
        <td class="px-3 py-2 font-mono text-sfl-wood dark:text-amber-200 text-xs whitespace-nowrap">${timeStr}</td>
        <td class="px-2 py-2 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2 font-bold text-sfl-dirt dark:text-amber-100">${itemName}</td>
        <td class="px-2 py-2 font-mono font-bold text-sfl-wood dark:text-amber-200">${qty.toLocaleString()}</td>
        <td class="px-2 py-2 font-mono text-sfl-woodLight dark:text-amber-300/70 text-xs">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2 font-medium text-sfl-wood dark:text-amber-200 text-xs">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2 font-mono font-bold text-right ${isSeller ? 'text-emerald-600 dark:text-emerald-400' : 'text-sfl-wood dark:text-amber-200'}">
          <div>${isSeller ? '+' : '-'}${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</div>
          ${isSeller && amounts.tax > 0 ? `<div class="text-[9px] font-normal text-sfl-woodLight dark:text-amber-300/60">Net (-${amounts.tax.toFixed(3)} tax)</div>` : ''}
        </td>
      </tr>
    `;
  });

  return `
    <div class="border-t-2 border-sfl-cardBorder dark:border-amber-700/60 bg-white/90 dark:bg-amber-950/40">
      <div class="bg-amber-100/60 dark:bg-amber-900/40 px-4 py-2 border-b border-sfl-cardBorder dark:border-amber-700/60 flex justify-between items-center">
        <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
          <span>📜</span> Completed Transactions on ${displayTitle}
        </span>
        <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 font-mono">
          ${dayData.trades.length} items traded
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-sfl-dirt dark:text-amber-100">
          <thead class="text-[10px] uppercase bg-sfl-card dark:bg-amber-950/50 border-b border-sfl-cardBorder dark:border-amber-700/60 text-sfl-wood dark:text-amber-200">
            <tr>
              <th class="px-3 py-2">Time</th>
              <th class="px-2 py-2">Type</th>
              <th class="px-3 py-2">Item Name</th>
              <th class="px-2 py-2">Quantity</th>
              <th class="px-2 py-2">Unit Price</th>
              <th class="px-3 py-2">Counterparty</th>
              <th class="px-3 py-2 text-right">Total SFL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sfl-cardBorder/40 dark:divide-amber-700/40 font-medium bg-white dark:bg-transparent">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
