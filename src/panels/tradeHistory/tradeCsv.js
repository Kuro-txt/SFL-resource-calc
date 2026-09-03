import { getItemNameById } from '../../data/knownIds.js';
import { getTradeAmounts, tradeHistoryData } from './tradeData.js';

export function exportTradesToCsv() {
  const trades = tradeHistoryData?.trades || [];
  if (trades.length === 0) {
    alert("⚠️ No trade records to export yet. Please sync your farm first.");
    return;
  }

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();
  const headers = ["Date", "Type", "Item Name", "Item ID", "Quantity", "Gross SFL", "Tax", "Net SFL", "Unit Price", "Counterparty", "Source", "Trade ID"];
  
  const rows = trades.map(t => {
    const amounts = getTradeAmounts(t, farmId);
    const isSeller = amounts.isSeller;
    const rawDate = t.fulfilledAt ? new Date(t.fulfilledAt).toISOString() : '';
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
    const qty = t.quantity || 1;
    const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;
    const counterparty = isSeller ? (t.counterpartyName || t.fulfilledBy?.username || '') : (t.counterpartyName || t.initiatedBy?.username || '');

    return [
      `"${rawDate}"`,
      `"${isSeller ? 'SOLD' : 'BOUGHT'}"`,
      `"${itemName}"`,
      `"${t.itemId || ''}"`,
      qty,
      amounts.grossSfl.toFixed(4),
      amounts.tax.toFixed(4),
      amounts.netSfl.toFixed(4),
      unitPrice.toFixed(4),
      `"${counterparty}"`,
      `"${t.source || 'listing'}"`,
      `"${t.id || ''}"`
    ].join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sfl_trades_farm_${farmId || 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
