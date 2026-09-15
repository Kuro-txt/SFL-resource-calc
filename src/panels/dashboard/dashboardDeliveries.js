// ─── Balances & Coins Section ───────────────────────────────────────────────
// Displays Coins, Flowers, and SFL balances alongside daily coin flow without counting deliveries.

import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

export function parseBalances(farmData) {
  if (!farmData) return { totalCoins: 0, totalFlowers: 0, totalSfl: 0 };

  const root = farmData.farm || farmData.data || farmData;
  const coins = parseFloat(root.coins || 0);
  const flowers = parseFloat(root.flowers || root.flower || 0);
  const sfl = parseFloat(root.balance || root.sfl || 0);

  return { totalCoins: coins, totalFlowers: flowers, totalSfl: sfl };
}

export function renderDeliveriesSection(mountEl) {
  if (!mountEl) return;

  const farmData = window.farmData || window.currentFarmData;
  if (!farmData) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">🪙 Coins & Balances</h4>
      </div>
      <p class="text-xs text-sfl-woodLight italic text-center py-2">Farm data not loaded. Enter your Farm ID and load data first.</p>`;
    return;
  }

  const { totalCoins, totalFlowers, totalSfl } = parseBalances(farmData);

  let latestCoinsStats = null;
  try {
    const history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
        const found = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
        if (found) {
          latestCoinsStats = found;
          break;
        }
      }
    }
  } catch (_) {}

  const netCoinsVal = latestCoinsStats ? parseFloat(latestCoinsStats.netCoins || latestCoinsStats.net || 0) : 0;
  const earnedCoinsVal = latestCoinsStats ? parseFloat(latestCoinsStats.coinsEarned || latestCoinsStats.earned || 0) : 0;
  const spentCoinsVal = latestCoinsStats ? parseFloat(latestCoinsStats.coinsSpent || latestCoinsStats.spent || 0) : 0;

  const coinSubtext = latestCoinsStats ? `
    <p class="text-[9px] font-mono font-bold ${netCoinsVal >= 0 ? 'text-green-700' : 'text-red-600'}">
      ${netCoinsVal >= 0 ? '+' : ''}${Math.round(netCoinsVal).toLocaleString()} today
    </p>` : '';

  const flowHtml = latestCoinsStats && (earnedCoinsVal > 0 || spentCoinsVal > 0) ? `
    <div class="mt-3 pt-2.5 border-t border-amber-100 space-y-1 text-[11px] font-mono">
      <div class="flex items-center justify-between">
        <span class="text-sfl-woodLight font-semibold">Coins Earned Today:</span>
        <span class="text-green-700 font-bold">+${Math.round(earnedCoinsVal).toLocaleString()}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sfl-woodLight font-semibold">Coins Spent Today:</span>
        <span class="text-orange-700 font-bold">-${Math.round(spentCoinsVal).toLocaleString()}</span>
      </div>
    </div>` : '';

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">🪙 Coins & Balances</h4>
      <span class="text-[10px] font-bold font-mono text-sfl-woodLight">SFL: ${totalSfl.toFixed(2)}</span>
    </div>
    <div class="grid grid-cols-2 gap-2 text-center mb-1">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">🪙 Coins</p>
        <p class="font-mono font-bold text-yellow-600 text-sm sm:text-base">${totalCoins.toLocaleString()}</p>
        ${coinSubtext}
      </div>
      <div class="bg-pink-50 border border-pink-200 rounded-lg p-2.5">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">🌸 Flowers</p>
        <p class="font-mono font-bold text-pink-600 text-sm sm:text-base">${totalFlowers.toFixed(3)}</p>
      </div>
    </div>
    ${flowHtml}
    <p class="text-[10px] text-sfl-woodLight italic mt-2.5">Real-time farm balances synchronized from Sunflower Land API.</p>`;
}
