import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getItemNameById } from '../../data/knownIds.js';
import { tradeHistoryData } from './tradeData.js';

export function renderListingsView(mountEl) {
  const listingsObj = tradeHistoryData?.listings || {};
  const listingEntries = Object.entries(listingsObj);

  if (listingEntries.length === 0) {
    mountEl.innerHTML = `<div class="p-8 text-center text-sfl-woodLight italic">No active listings on the market.</div>`;
    return;
  }

  let rowsHtml = '';
  listingEntries.forEach(([listId, listData]) => {
    const rawDate = listData.createdAt;
    let dateStr = 'Active';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : String(rawDate);
    }

    const isEconomy = listData.collection === 'economies' || Boolean(listData.economy);
    const itemsMap = listData.items || {};
    const itemNames = isEconomy 
      ? Object.entries(itemsMap).map(([rawId, q]) => `${q}x #${rawId}`).join(', ') || 'Economy Item'
      : Object.entries(itemsMap).map(([rawId, q]) => {
          const name = getItemNameById(rawId);
          return `${q}x ${name}`;
        }).join(', ') || 'Listing Item';

    const sfl = parseFloat(listData.sfl || 0);
    const tax = parseFloat(listData.tax || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames}</td>
        <td class="px-2 py-2.5 uppercase font-bold text-[10px] text-amber-800">${listData.collection || 'collectibles'}</td>
        <td class="px-2.5 py-2.5 font-mono text-sfl-accent font-bold">-${tax.toFixed(3)}</td>
        <td class="px-3 py-2.5 font-mono font-bold text-sfl-green text-right">${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
        <tr>
          <th class="px-3 py-2.5">Listed Date</th>
          <th class="px-3 py-2.5">Item & Quantity</th>
          <th class="px-2 py-2.5">Category</th>
          <th class="px-2.5 py-2.5 text-sfl-accent">Marketplace Tax</th>
          <th class="px-3 py-2.5 text-right">Listing SFL Price</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

export function renderOffersView(mountEl) {
  const offersObj = tradeHistoryData?.offers || {};
  const offerEntries = Object.entries(offersObj);

  if (offerEntries.length === 0) {
    mountEl.innerHTML = `<div class="p-8 text-center text-sfl-woodLight italic">No open buy offers currently placed.</div>`;
    return;
  }

  let rowsHtml = '';
  offerEntries.forEach(([offId, offData]) => {
    const rawDate = offData.createdAt;
    let dateStr = 'Active';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : String(rawDate);
    }

    const isEconomy = offData.collection === 'economies' || Boolean(offData.economy);
    const itemsMap = offData.items || {};
    const itemNames = isEconomy 
      ? Object.entries(itemsMap).map(([rawId, q]) => `${q}x #${rawId}`).join(', ') || 'Economy Item'
      : Object.entries(itemsMap).map(([rawId, q]) => {
          const name = getItemNameById(rawId);
          return `${q}x ${name}`;
        }).join(', ') || 'Offer Item';

    const sfl = parseFloat(offData.sfl || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames}</td>
        <td class="px-2 py-2.5 uppercase font-bold text-[10px] text-amber-800">${offData.collection || 'collectibles'}</td>
        <td class="px-3 py-2.5 font-mono font-bold text-sfl-wood text-right">${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
        <tr>
          <th class="px-3 py-2.5">Offer Placed</th>
          <th class="px-3 py-2.5">Item & Desired Qty</th>
          <th class="px-2 py-2.5">Category</th>
          <th class="px-3 py-2.5 text-right">Offer Amount</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}
