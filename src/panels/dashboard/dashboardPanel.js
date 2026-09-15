// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// Unified Command Center: Top KPI Ribbon, Items Earned, Items Spent, Trades, and Balances.

import { renderEarnedSection, aggregateLocalEarned } from './dashboardEarned.js';
import { renderSpentSection } from './dashboardSpent.js';
import { renderTradesSection, getTradeSummary } from './dashboardTrades.js';
import { renderDeliveriesSection, parseBalances } from './dashboardDeliveries.js';

let initialized = false;

function renderKpiBanner() {
  const mount = document.getElementById('dash-kpi-banner');
  if (!mount) return;

  // 1. Harvest Data
  const totals = aggregateLocalEarned();
  const grandFlowers = Object.values(totals).reduce((s, v) => s + (v.flowers || 0), 0);
  const totalItems = Object.values(totals).reduce((s, v) => s + (v.qty || 0), 0);

  // 2. Balances Data
  const farmData = window.farmData || window.currentFarmData;
  const { totalCoins, totalFlowers, totalSfl } = parseBalances(farmData);

  // Today's coins
  let todayCoinsNet = null;
  try {
    const history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
        const found = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
        if (found) {
          todayCoinsNet = parseFloat(found.netCoins || found.net || 0);
          break;
        }
      }
    }
  } catch (_) {}

  // 3. Trade Data
  const tradeSum = getTradeSummary();
  const netSfl = tradeSum ? tradeSum.netSfl : 0;
  const tradeCount = tradeSum ? tradeSum.total : 0;

  mount.innerHTML = `
    <!-- KPI 1: 21-Day Harvest Output -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-emerald-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-xl shrink-0">
        🌾
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">21-Day Harvest Yield</p>
        <p class="font-mono text-base sm:text-lg font-bold text-sfl-green truncate">${grandFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${totalItems.toFixed(0)} items produced</p>
      </div>
    </div>

    <!-- KPI 2: Farm Coins -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-amber-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-950/70 border border-yellow-300 dark:border-yellow-800 flex items-center justify-center text-xl shrink-0">
        🪙
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Farm Coins</p>
        <p class="font-mono text-base sm:text-lg font-bold text-yellow-700 dark:text-amber-300 truncate">${totalCoins > 0 ? totalCoins.toLocaleString() : '—'}</p>
        <p class="text-[10px] font-mono font-semibold ${todayCoinsNet !== null && todayCoinsNet >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-600'}">
          ${todayCoinsNet !== null ? `${todayCoinsNet >= 0 ? '+' : ''}${Math.round(todayCoinsNet).toLocaleString()} today` : 'Ready to track'}
        </p>
      </div>
    </div>

    <!-- KPI 3: P2P Trade Profit -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-blue-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-xl shrink-0">
        ⚖️
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Marketplace P&L</p>
        <p class="font-mono text-base sm:text-lg font-bold ${netSfl >= 0 ? 'text-sfl-green dark:text-emerald-400' : 'text-red-600'} truncate">
          ${netSfl >= 0 ? '+' : ''}${netSfl.toFixed(2)} SFL
        </p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${tradeCount} trades fulfilled</p>
      </div>
    </div>

    <!-- KPI 4: Flower Balance -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-pink-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/70 border border-pink-300 dark:border-pink-800 flex items-center justify-center text-xl shrink-0">
        🌸
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Flower Balance</p>
        <p class="font-mono text-base sm:text-lg font-bold text-pink-700 dark:text-pink-300 truncate">${totalFlowers > 0 ? totalFlowers.toFixed(3) : '0.000'} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight font-mono">SFL Balance: ${totalSfl.toFixed(2)}</p>
      </div>
    </div>`;
}

function renderTemplate() {
  const container = document.getElementById('dashboard-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Header Banner -->
      <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-sfl-wood dark:text-amber-200 uppercase flex items-center gap-2">
            <span>📊</span> Farm Command Center
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Unified performance dashboard — track harvests, consumption, P2P trades, and wallet flow.
          </p>
        </div>
        <button id="dashboard-refresh-btn"
          class="bg-sfl-wood text-amber-200 px-3.5 py-1.5 rounded-lg font-bold text-xs border-2 border-sfl-dirt shadow-md hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1.5 shrink-0">
          <span>🔄</span>
          <span>Refresh All</span>
        </button>
      </div>

      <!-- Top High-Level KPI Ribbon -->
      <div id="dash-kpi-banner" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>

      <!-- 2x2 Clean Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Card 1: Items Earned (Emerald Accent) -->
        <div class="bg-sfl-card/90 dark:bg-amber-950/30 p-4 rounded-xl border-2 border-emerald-600/30 shadow-sm flex flex-col justify-between">
          <div id="dash-earned-mount"></div>
        </div>

        <!-- Card 2: Items Spent (Orange Accent) -->
        <div class="bg-sfl-card/90 dark:bg-amber-950/30 p-4 rounded-xl border-2 border-orange-600/30 shadow-sm flex flex-col justify-between">
          <div id="dash-spent-mount"></div>
        </div>

        <!-- Card 3: Trades Ledger (Blue Accent) -->
        <div class="bg-sfl-card/90 dark:bg-amber-950/30 p-4 rounded-xl border-2 border-blue-600/30 shadow-sm flex flex-col justify-between">
          <div id="dash-trades-mount"></div>
        </div>

        <!-- Card 4: Farm Balances & Coins (Gold Accent) -->
        <div class="bg-sfl-card/90 dark:bg-amber-950/30 p-4 rounded-xl border-2 border-amber-600/30 shadow-sm flex flex-col justify-between">
          <div id="dash-deliveries-mount"></div>
        </div>

      </div>
    </div>`;
}

async function populateSections() {
  renderKpiBanner();
  renderEarnedSection(document.getElementById('dash-earned-mount'));
  await renderSpentSection(document.getElementById('dash-spent-mount'));
  await renderTradesSection(document.getElementById('dash-trades-mount'));
  renderDeliveriesSection(document.getElementById('dash-deliveries-mount'));
  // Update KPI banner again after async sections populate
  renderKpiBanner();
}

export function initDashboardPanel() {
  renderTemplate();
  initialized = true;

  document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
    populateSections();
  });
}

export async function mountDashboard() {
  if (!initialized) {
    initDashboardPanel();
  } else {
    renderTemplate();
    document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
      populateSections();
    });
  }
  await populateSections();
}
