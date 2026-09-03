import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getItemNameById } from '../../data/knownIds.js';
import { getTradeAmounts, isUserSeller, tradeHistoryData } from './tradeData.js';
import { currentFilter } from './tradeFilters.js';
import { searchQuery } from './index.js';

export function renderTradesTableView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];

  let filtered = trades.filter(t => {
    const isSeller = isUserSeller(t, farmId);
    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && isSeller) return false;

    if (searchQuery) {
      const isEconomy = t.collection === 'economies' || Boolean(t.economy);
      const itemName = isEconomy ? `#${t.itemId}` : (t.itemName || getItemNameById(t.itemId)).toLowerCase();
      const otherUser = isSeller ? (t.counterpartyName || t.fulfilledBy?.username || '').toLowerCase() : (t.counterpartyName || t.initiatedBy?.username || '').toLowerCase();
      if (!itemName.includes(searchQuery) && !otherUser.includes(searchQuery)) return false;
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
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
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
      ? `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 px-2 py-0.5 rounded text-[10px] font-bold">🟢 SOLD</span>`
      : `<span class="bg-blue-100 text-blue-800 border border-blue-400/40 px-2 py-0.5 rounded text-[10px] font-bold">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-2 py-2.5 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemName}</td>
        <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">${qty.toLocaleString()}</td>
        <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2.5 font-medium text-sfl-wood">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2.5 font-mono font-bold text-right ${isSeller ? 'text-sfl-green' : 'text-sfl-wood'}">
          <div>${isSeller ? '+' : '-'}${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</div>
          ${isSeller && amounts.tax > 0 ? `<div class="text-[9px] font-normal text-sfl-woodLight">Gross: ${amounts.grossSfl.toFixed(3)} • Tax: -${amounts.tax.toFixed(3)}</div>` : ''}
        </td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
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
      <div class="bg-white/90 p-6 text-center border-t-2 border-sfl-cardBorder">
        <span class="text-xs sm:text-sm font-bold text-sfl-dirt flex items-center justify-center gap-1.5 mb-1">
          <span>📅</span> ${displayTitle}
        </span>
        <p class="text-xs text-sfl-woodLight italic">
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
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
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
      ? `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 px-1.5 py-0.2 rounded text-[9px] font-bold">🟢 SOLD</span>`
      : `<span class="bg-blue-100 text-blue-800 border border-blue-400/40 px-1.5 py-0.2 rounded text-[9px] font-bold">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2 font-mono text-sfl-wood text-xs whitespace-nowrap">${timeStr}</td>
        <td class="px-2 py-2 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2 font-bold text-sfl-dirt">${itemName}</td>
        <td class="px-2 py-2 font-mono font-bold text-sfl-wood">${qty.toLocaleString()}</td>
        <td class="px-2 py-2 font-mono text-sfl-woodLight text-xs">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2 font-medium text-sfl-wood text-xs">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2 font-mono font-bold text-right ${isSeller ? 'text-sfl-green' : 'text-sfl-wood'}">
          <div>${isSeller ? '+' : '-'}${amounts.netSfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</div>
          ${isSeller && amounts.tax > 0 ? `<div class="text-[9px] font-normal text-sfl-woodLight">Net (-${amounts.tax.toFixed(3)} tax)</div>` : ''}
        </td>
      </tr>
    `;
  });

  return `
    <div class="border-t-2 border-sfl-cardBorder bg-white/90">
      <div class="bg-amber-100/60 px-4 py-2 border-b border-sfl-cardBorder flex justify-between items-center">
        <span class="text-xs font-bold text-sfl-dirt uppercase tracking-wider flex items-center gap-1.5">
          <span>📜</span> Completed Transactions on ${displayTitle}
        </span>
        <span class="text-[11px] font-bold text-sfl-wood font-mono">
          ${dayData.trades.length} items traded
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-sfl-dirt">
          <thead class="text-[10px] uppercase bg-sfl-card border-b border-sfl-cardBorder text-sfl-wood">
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
          <tbody class="divide-y divide-sfl-cardBorder/40 font-medium bg-white">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
