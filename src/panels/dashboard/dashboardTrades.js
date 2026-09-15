// ─── Trades Summary Section ───────────────────────────────────────────────────
// Reads in-memory tradeHistoryData; shows compact summary + link to Trade History tab.

import { tradeHistoryData, fetchMarketplaceTrades, getTradeAmounts } from '../tradeHistory/tradeData.js';
import { PanelManager } from '../../services/panelManager.js';

function getTradeSummary() {
  const trades = tradeHistoryData?.trades || [];
  if (trades.length === 0) return null;

  const farmId = String(tradeHistoryData?.id || localStorage.getItem('sfl_farm_id') || '').trim();

  let totalSold = 0, totalBought = 0, netSfl = 0;
  const itemMap = {};

  trades.forEach(t => {
    const amounts = getTradeAmounts(t, farmId);
    const isSeller = amounts.isSeller;
    const sfl = parseFloat(t.sfl || 0);
    const qty = parseFloat(t.quantity || 1);
    const name = t.itemName || 'Unknown';

    if (isSeller) {
      totalSold++;
      netSfl += amounts.netSfl;
    } else {
      totalBought++;
      netSfl -= sfl;
    }

    if (!itemMap[name]) itemMap[name] = { sold: 0, bought: 0, sfl: 0 };
    if (isSeller) { itemMap[name].sold += qty; itemMap[name].sfl += amounts.netSfl; }
    else { itemMap[name].bought += qty; }
  });

  const topItems = Object.entries(itemMap)
    .filter(([, v]) => v.sfl > 0)
    .sort((a, b) => b[1].sfl - a[1].sfl)
    .slice(0, 3);

  return { totalSold, totalBought, netSfl, topItems, total: trades.length };
}

export async function renderTradesSection(mountEl) {
  if (!mountEl) return;

  const summary = getTradeSummary();

  if (!summary) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">📜 Trades</h4>
      </div>
      <p class="text-xs text-sfl-woodLight italic text-center py-2">Trade data not loaded yet.</p>
      <button id="dashboard-load-trades-btn"
        class="mt-2 w-full bg-sfl-wood text-amber-200 px-3 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md hover:bg-sfl-woodLight transition cursor-pointer">
        📜 Load Trade History
      </button>`;

    document.getElementById('dashboard-load-trades-btn')?.addEventListener('click', async () => {
      mountEl.innerHTML = `<p class="text-xs text-sfl-woodLight italic text-center py-4">⏳ Loading trades...</p>`;
      await fetchMarketplaceTrades(false);
      renderTradesSection(mountEl);
    });
    return;
  }

  const { totalSold, totalBought, netSfl, topItems, total } = summary;
  const netColor = netSfl >= 0 ? 'text-sfl-green' : 'text-red-600';

  const topHtml = topItems.map(([name, { sold, sfl }]) => `
    <div class="flex items-center justify-between text-[11px]">
      <span class="font-bold text-sfl-dirt truncate">${name}</span>
      <span class="font-mono text-sfl-green shrink-0">×${sold.toFixed(0)} → ${sfl.toFixed(3)} SFL</span>
    </div>`).join('');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">📜 Trades (${total} total)</h4>
      <button id="dash-goto-trades" class="text-[10px] font-bold text-sfl-wood underline cursor-pointer hover:text-sfl-dirt">View All →</button>
    </div>
    <div class="grid grid-cols-3 gap-2 text-center mb-3">
      <div class="bg-green-50 border border-green-200 rounded-lg p-2">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">Sold</p>
        <p class="font-mono font-bold text-sfl-green text-sm">${totalSold}</p>
      </div>
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-2">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">Bought</p>
        <p class="font-mono font-bold text-orange-600 text-sm">${totalBought}</p>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-2">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">Net SFL</p>
        <p class="font-mono font-bold ${netColor} text-sm">${netSfl.toFixed(2)}</p>
      </div>
    </div>
    ${topItems.length > 0 ? `
    <p class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wide mb-1">Top Earners</p>
    <div class="space-y-1">${topHtml}</div>` : ''}`;

  document.getElementById('dash-goto-trades')?.addEventListener('click', () => PanelManager.switch('tradehistory'));
}
