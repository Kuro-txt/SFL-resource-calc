// ─── Trades Summary Section ───────────────────────────────────────────────────
// Reads in-memory tradeHistoryData; shows compact summary + link to Trade History tab.

import { tradeHistoryData, fetchMarketplaceTrades, getTradeAmounts } from '../tradeHistory/tradeData.js';
import { PanelManager } from '../../services/panelManager.js';
import { normalizeItemKey } from '../../utils/formatters.js';

const ITEM_ICONS = {
  egg: '🥚', milk: '🥛', feather: '🪶', leather: '👞', wool: '🧶',
  merinowool: '🐑', honey: '🍯', wood: '🪵', stone: '🪨', iron: '⛓️',
  gold: '🪙', crimstone: '💎', obsidian: '⬛', salt: '🧂',
  sunflower: '🌻', potato: '🥔', pumpkin: '🎃', carrot: '🥕', cabbage: '🥬',
  beetroot: '🟣', cauliflower: '🥦', parsnip: '🥕', eggplant: '🍆', corn: '🌽',
  radish: '🔴', wheat: '🌾', kale: '🥬', soybean: '🫘', barley: '🌾'
};

function getItemIcon(name) {
  const clean = normalizeItemKey(name);
  return ITEM_ICONS[clean] || '📦';
}

export function getTradeSummary() {
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

    if (!itemMap[name]) itemMap[name] = { sold: 0, bought: 0, sfl: 0, tradesCount: 0 };
    itemMap[name].tradesCount++;
    if (isSeller) {
      itemMap[name].sold += qty;
      itemMap[name].sfl += amounts.netSfl;
    } else {
      itemMap[name].bought += qty;
    }
  });

  const topItems = Object.entries(itemMap)
    .sort((a, b) => (b[1].sfl || 0) - (a[1].sfl || 0))
    .slice(0, 4);

  return { totalSold, totalBought, netSfl, topItems, total: trades.length };
}

export async function renderTradesSection(mountEl) {
  if (!mountEl) return;

  const summary = getTradeSummary();

  if (!summary) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>📜</span> Marketplace Trades
        </h4>
      </div>
      <div class="text-center py-6 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">⚖️</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">Trade Ledger Not Loaded</p>
        <p class="text-[11px] text-sfl-woodLight mt-1 mb-3">Sync marketplace trades to inspect sales profit & counterparty stats.</p>
        <button id="dashboard-load-trades-btn"
          class="bg-sfl-wood text-amber-200 px-4 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md hover:bg-sfl-woodLight transition cursor-pointer">
          🔄 Sync Marketplace Trades
        </button>
      </div>`;

    document.getElementById('dashboard-load-trades-btn')?.addEventListener('click', async () => {
      mountEl.innerHTML = `
        <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
          <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>📜</span> Marketplace Trades
          </h4>
        </div>
        <p class="text-xs text-sfl-woodLight italic text-center py-6">⏳ Fetching marketplace profile & TiDB Cloud...</p>`;
      await fetchMarketplaceTrades(false);
      renderTradesSection(mountEl);
    });
    return;
  }

  const { totalSold, totalBought, netSfl, topItems, total } = summary;
  const isProfitable = netSfl >= 0;
  const netColor = isProfitable ? 'text-sfl-green dark:text-emerald-400' : 'text-red-600 dark:text-rose-400';
  const netBg = isProfitable ? 'bg-green-100/90 dark:bg-green-950/50 border-green-300 dark:border-green-800' : 'bg-red-100/90 dark:bg-red-950/50 border-red-300 dark:border-red-800';

  const topHtml = topItems.map(([name, { sold, bought, sfl, tradesCount }]) => {
    const icon = getItemIcon(name);
    return `
      <div class="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-blue-100/30 dark:hover:bg-blue-950/20 rounded-lg transition">
        <div class="flex items-center gap-2 truncate">
          <span class="text-sm shrink-0">${icon}</span>
          <span class="font-bold text-sfl-dirt dark:text-amber-100 truncate">${name}</span>
          <span class="text-[10px] text-sfl-woodLight">(${tradesCount} trades)</span>
        </div>
        <div class="text-right font-mono shrink-0">
          ${sold > 0 ? `<span class="text-sfl-green font-bold">+${sold.toFixed(0)} sold</span>` : ''}
          ${bought > 0 ? `<span class="text-blue-600 font-bold ml-1">${bought.toFixed(0)} bought</span>` : ''}
          <span class="text-sfl-dirt dark:text-amber-200 font-bold ml-1.5">${sfl > 0 ? '+' : ''}${sfl.toFixed(2)} SFL</span>
        </div>
      </div>`;
  }).join('');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>📜</span> P2P Marketplace
        </h4>
        <p class="text-[10px] text-sfl-woodLight">${total} total fulfilled trades</p>
      </div>
      <button id="dash-goto-trades" class="text-[11px] font-bold text-sfl-wood dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1">
        <span>Ledger</span>
        <span>→</span>
      </button>
    </div>

    <!-- 3 Stat KPI Tiles -->
    <div class="grid grid-cols-3 gap-2 text-center mb-3">
      <div class="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/60 rounded-xl p-2 shadow-2xs">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase tracking-wider">Sold</p>
        <p class="font-mono font-bold text-sfl-green text-sm sm:text-base">${totalSold}</p>
      </div>
      <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-2 shadow-2xs">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase tracking-wider">Bought</p>
        <p class="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">${totalBought}</p>
      </div>
      <div class="${netBg} border rounded-xl p-2 shadow-2xs">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase tracking-wider">Net SFL</p>
        <p class="font-mono font-bold ${netColor} text-sm sm:text-base">${isProfitable ? '+' : ''}${netSfl.toFixed(2)}</p>
      </div>
    </div>

    ${topItems.length > 0 ? `
    <div class="space-y-0.5 max-h-48 overflow-y-auto pr-1">
      <p class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider mb-1">Top Traded Items</p>
      ${topHtml}
    </div>` : ''}`;

  document.getElementById('dash-goto-trades')?.addEventListener('click', () => PanelManager.switch('tradehistory'));
}
