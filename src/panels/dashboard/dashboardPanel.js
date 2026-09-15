// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// Unified Command Center: Top KPI Ribbon, Items Earned, Items Spent, Trades, and Balances.
// Supports dynamic time ranges: Daily (Today), 7 Days, and Month (30 Days).

import { renderEarnedSection, aggregateLocalEarned } from './dashboardEarned.js';
import { renderSpentSection } from './dashboardSpent.js';
import { renderTradesSection, getTradeSummary } from './dashboardTrades.js';
import { renderDeliveriesSection, parseBalances, aggregateCoinsForRange } from './dashboardDeliveries.js';

let initialized = false;
let activeTimeRange = '7d'; // 'daily' | '7d' | 'month'

const RANGE_LABELS = {
  daily: 'Today',
  '7d': '7 Days',
  month: 'Month'
};

function renderKpiBanner(timeRange = '7d') {
  const mount = document.getElementById('dash-kpi-banner');
  if (!mount) return;

  const rangeText = RANGE_LABELS[timeRange] || '7 Days';

  // 1. Harvest Data for range
  const totals = aggregateLocalEarned(timeRange);
  const grandFlowers = Object.values(totals).reduce((s, v) => s + (v.flowers || 0), 0);
  const totalItems = Object.values(totals).reduce((s, v) => s + (v.qty || 0), 0);

  // 2. Balances Data & Coin Flow for range
  const farmData = window.farmData || window.currentFarmData;
  const { totalCoins, totalFlowers, totalSfl } = parseBalances(farmData);
  const coinStats = aggregateCoinsForRange(timeRange);

  // 3. Trade Data for range
  const tradeSum = getTradeSummary(timeRange);
  const netSfl = tradeSum ? tradeSum.netSfl : 0;
  const tradeCount = tradeSum ? tradeSum.total : 0;

  mount.innerHTML = `
    <!-- KPI 1: Harvest Output for Time Range -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-emerald-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-xl shrink-0">
        🌾
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Harvest (${rangeText})</p>
        <p class="font-mono text-base sm:text-lg font-bold text-sfl-green truncate">${grandFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${totalItems.toFixed(0)} items produced</p>
      </div>
    </div>

    <!-- KPI 2: Farm Coins & Flow -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-amber-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-950/70 border border-yellow-300 dark:border-yellow-800 flex items-center justify-center text-xl shrink-0">
        🪙
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Coins (${rangeText})</p>
        <p class="font-mono text-base sm:text-lg font-bold text-yellow-700 dark:text-amber-300 truncate">${totalCoins > 0 ? totalCoins.toLocaleString() : '—'}</p>
        <p class="text-[10px] font-mono font-semibold ${coinStats.netCoins >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-600'}">
          ${coinStats.count > 0 ? `${coinStats.netCoins >= 0 ? '+' : ''}${Math.round(coinStats.netCoins).toLocaleString()} flow` : 'Ready to track'}
        </p>
      </div>
    </div>

    <!-- KPI 3: P2P Trade Profit for Time Range -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3 rounded-xl border-2 border-blue-600/30 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-xl shrink-0">
        ⚖️
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Trades P&L (${rangeText})</p>
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

function renderTimeRangeButtons() {
  const container = document.getElementById('dash-range-buttons');
  if (!container) return;

  const btnClass = (range) => range === activeTimeRange
    ? 'bg-sfl-wood text-amber-200 border-2 border-sfl-dirt shadow-xs font-bold'
    : 'text-sfl-woodLight hover:text-sfl-dirt dark:hover:text-amber-100 font-semibold';

  container.innerHTML = `
    <button id="dash-range-btn-daily" class="px-3 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('daily')}">
      ☀️ Daily
    </button>
    <button id="dash-range-btn-7d" class="px-3 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('7d')}">
      📅 7 Days
    </button>
    <button id="dash-range-btn-month" class="px-3 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('month')}">
      🗓️ Month
    </button>`;

  document.getElementById('dash-range-btn-daily')?.addEventListener('click', () => switchTimeRange('daily'));
  document.getElementById('dash-range-btn-7d')?.addEventListener('click', () => switchTimeRange('7d'));
  document.getElementById('dash-range-btn-month')?.addEventListener('click', () => switchTimeRange('month'));
}

function switchTimeRange(newRange) {
  if (activeTimeRange === newRange) return;
  activeTimeRange = newRange;
  renderTimeRangeButtons();
  populateSections(activeTimeRange);
}

function renderTemplate() {
  const container = document.getElementById('dashboard-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Header Banner & Time Range Switcher -->
      <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-sfl-wood dark:text-amber-200 uppercase flex items-center gap-2">
            <span>📊</span> Farm Command Center
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Track harvests, consumption, P2P trades, and wallet flow across custom timeframes.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <!-- Time Range Selector Pill -->
          <div id="dash-range-buttons" class="inline-flex items-center bg-amber-100/80 dark:bg-amber-950/70 p-1 rounded-xl border border-amber-300/80 dark:border-amber-800 shadow-2xs"></div>

          <!-- Refresh Button -->
          <button id="dashboard-refresh-btn"
            class="bg-sfl-wood text-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs border-2 border-sfl-dirt shadow-md hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
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

async function populateSections(timeRange = activeTimeRange) {
  renderKpiBanner(timeRange);
  renderEarnedSection(document.getElementById('dash-earned-mount'), timeRange);
  await renderSpentSection(document.getElementById('dash-spent-mount'), timeRange);
  await renderTradesSection(document.getElementById('dash-trades-mount'), timeRange);
  renderDeliveriesSection(document.getElementById('dash-deliveries-mount'), timeRange);
  // Re-run KPI banner once async sections finish
  renderKpiBanner(timeRange);
}

export function initDashboardPanel() {
  renderTemplate();
  renderTimeRangeButtons();
  initialized = true;

  document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
    populateSections(activeTimeRange);
  });
}

export async function mountDashboard() {
  if (!initialized) {
    initDashboardPanel();
  } else {
    renderTemplate();
    renderTimeRangeButtons();
    document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
      populateSections(activeTimeRange);
    });
  }
  await populateSections(activeTimeRange);
}
