import { getItemNameById } from '../../data/knownIds.js';
import { getTradeAmounts, getTradeCounterparty, tradeHistoryData, currentSflUsdRate } from './tradeData.js';

export function exportTradesToCsv() {
  const trades = tradeHistoryData?.trades || [];
  if (trades.length === 0) {
    alert("⚠️ No trade records to export yet. Please sync your farm first.");
    return;
  }

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();
  const headers = ["Date", "Type", "Collection", "Item Name", "Item ID", "Quantity", "Gross SFL", "Tax", "Net SFL", "SFL Rate (USD)", "Net Value (USD)", "Unit Price (SFL)", "Unit Price (USD)", "Counterparty", "Source", "Trade ID"];
  
  const rows = trades.map(t => {
    const amounts = getTradeAmounts(t, farmId);
    const isSeller = amounts.isSeller;
    const rawDate = t.fulfilledAt ? new Date(t.fulfilledAt).toISOString() : '';
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const rawName = t.itemName;
    const resolvedName = (rawName && !rawName.startsWith('Item #')) ? rawName : getItemNameById(t.itemId || rawName, t.collection);
    const itemName = isEconomy ? `#${t.itemId || '?'}` : resolvedName;
    const qty = t.quantity || 1;
    const unitPrice = qty > 0 ? (amounts.grossSfl / qty) : amounts.grossSfl;
    const counterparty = getTradeCounterparty(t, farmId, isSeller);

    const sflUsd = parseFloat(t.sflUsd || t.sfl_usd) || currentSflUsdRate || 0;
    const tradeSfl = isSeller ? amounts.netSfl : amounts.grossSfl;
    const usdValue = (t.usdValue !== undefined && t.usdValue !== null)
      ? parseFloat(t.usdValue)
      : (sflUsd > 0 ? (tradeSfl * sflUsd) : 0);
    const unitPriceUsd = sflUsd > 0 ? (unitPrice * sflUsd) : 0;

    return [
      `"${rawDate}"`,
      `"${isSeller ? 'SOLD' : 'BOUGHT'}"`,
      `"${t.collection || 'collectibles'}"`,
      `"${itemName}"`,
      `"${t.itemId || ''}"`,
      qty,
      amounts.grossSfl.toFixed(4),
      amounts.tax.toFixed(4),
      amounts.netSfl.toFixed(4),
      sflUsd > 0 ? sflUsd.toFixed(4) : '',
      usdValue > 0 ? usdValue.toFixed(4) : '',
      unitPrice.toFixed(4),
      unitPriceUsd > 0 ? unitPriceUsd.toFixed(4) : '',
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
