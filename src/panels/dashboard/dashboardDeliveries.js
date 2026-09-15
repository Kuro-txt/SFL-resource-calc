// ─── Balances & Coins Section ───────────────────────────────────────────────
// Displays Coins, Flowers, and SFL balances alongside daily coin flow without counting deliveries.

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
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>🪙</span> Farm Balances & Coins
        </h4>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">🌾</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">Farm Data Not Loaded</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Enter your Farm ID at the top to load real-time coins, flowers, and tokens.</p>
      </div>`;
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
    <span class="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${netCoinsVal >= 0 ? 'text-green-700 dark:text-emerald-400 bg-green-100 dark:bg-green-950/60 border border-green-300 dark:border-green-800' : 'text-red-700 dark:text-rose-400 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800'} px-2 py-0.5 rounded-full mt-1">
      <span>${netCoinsVal >= 0 ? '▲ +' : '▼ '}${Math.round(netCoinsVal).toLocaleString()}</span>
      <span>today</span>
    </span>` : '';

  mountEl.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>🪙</span> Farm Balances
        </h4>
        <p class="text-[10px] text-sfl-woodLight">In-game currency and token holdings</p>
      </div>
      <span class="bg-amber-100 dark:bg-amber-950/60 text-sfl-wood dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shadow-2xs">
        🪙 SFL: ${totalSfl.toFixed(2)}
      </span>
    </div>

    <!-- 2 Main Balance Tiles -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div class="bg-gradient-to-br from-yellow-50 to-amber-100/70 dark:from-amber-950/40 dark:to-yellow-950/30 border border-amber-300/80 dark:border-amber-700/60 rounded-xl p-3 shadow-2xs text-center flex flex-col justify-center items-center">
        <p class="text-[10px] text-sfl-woodLight dark:text-amber-300 font-bold uppercase tracking-wider mb-0.5">🪙 Coins Balance</p>
        <p class="font-mono font-bold text-yellow-700 dark:text-amber-300 text-lg sm:text-xl">${totalCoins.toLocaleString()}</p>
        ${coinSubtext}
      </div>

      <div class="bg-gradient-to-br from-pink-50 to-rose-100/70 dark:from-pink-950/40 dark:to-rose-950/30 border border-pink-300/80 dark:border-pink-700/60 rounded-xl p-3 shadow-2xs text-center flex flex-col justify-center items-center">
        <p class="text-[10px] text-sfl-woodLight dark:text-pink-300 font-bold uppercase tracking-wider mb-0.5">🌸 Flower Balance</p>
        <p class="font-mono font-bold text-pink-700 dark:text-pink-300 text-lg sm:text-xl">${totalFlowers.toFixed(3)}</p>
        <span class="text-[10px] text-sfl-woodLight font-mono mt-1">Ready for exchange</span>
      </div>
    </div>

    <!-- Daily Coin Flow -->
    <div class="bg-white/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40 p-3 space-y-2">
      <p class="text-[10px] font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wider">Today's Coin Flow (00:00 → 22:00 UTC)</p>
      
      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-sfl-woodLight font-semibold flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Earned Today:</span>
        </span>
        <span class="font-bold text-green-700 dark:text-emerald-400">+${Math.round(earnedCoinsVal).toLocaleString()}</span>
      </div>

      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-sfl-woodLight font-semibold flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>Spent Today:</span>
        </span>
        <span class="font-bold text-orange-700 dark:text-orange-400">-${Math.round(spentCoinsVal).toLocaleString()}</span>
      </div>

      <div class="pt-1.5 border-t border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between text-xs font-mono font-bold">
        <span class="text-sfl-wood dark:text-amber-100">Net Flow:</span>
        <span class="${netCoinsVal >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}">
          ${netCoinsVal >= 0 ? '+' : ''}${Math.round(netCoinsVal).toLocaleString()}
        </span>
      </div>
    </div>`;
}
