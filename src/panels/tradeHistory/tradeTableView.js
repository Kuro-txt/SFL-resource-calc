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

  if (summaryMount) {
    summaryMount.classList.add('hidden');
    summaryMount.innerHTML = '';
  }

  let filtered = trades.filter(t => {
    const isSeller = isUserSeller(t, farmId);
    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && isSeller) return false;
    return true;
  });

  if (filtered.length === 0) {
    mountEl.innerHTML = `
      <div class="p-8 text-center text-sfl-woodLight dark:text-amber-300/60 italic">
        No completed trades found.
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
