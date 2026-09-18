// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// Unified Command Center: Top KPI Ribbon, Items Earned, Items Spent, and Trades.
// Supports dynamic time ranges: Day (Daily), Week (7 Days), and Month (30 Days),
// with historical date range navigation (previous/next arrows and touch swipe).

import { renderEarnedSection, aggregateLocalEarned } from './dashboardEarned.js';
import { renderSpentSection, loadSpentData } from './dashboardSpent.js';

let initialized = false;
let activeTimeRange = 'day'; // 'day' | 'week' | 'month'
let activeTimeOffset = 1;    // 0 = current/today, 1 = yesterday (default), 2 = 2 periods back, etc.

export function getDateRangeBounds(timeRange = activeTimeRange, offset = activeTimeOffset) {
  const now = new Date();

  if (timeRange === 'day') {
    const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const dateStr = targetDate.toISOString().split('T')[0];
    const minTimestamp = new Date(dateStr + 'T00:00:00Z').getTime();
    const maxTimestamp = new Date(dateStr + 'T23:59:59.999Z').getTime();

    let label = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    if (offset === 0) label += ' (Today)';
    else if (offset === 1) label += ' (Yesterday)';

    return {
      timeRange: 'day',
      offset,
      minDateStr: dateStr,
      maxDateStr: dateStr,
      minTimestamp,
      maxTimestamp,
      label,
      rangeText: label
    };
  }

  if (timeRange === 'week' || timeRange === '7d') {
    const endDaysAgo = offset * 7;
    const startDaysAgo = endDaysAgo + 6;
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - endDaysAgo));
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - startDaysAgo));

    const minDateStr = startDate.toISOString().split('T')[0];
    const maxDateStr = endDate.toISOString().split('T')[0];
    const minTimestamp = new Date(minDateStr + 'T00:00:00Z').getTime();
    const maxTimestamp = new Date(maxDateStr + 'T23:59:59.999Z').getTime();

    const startFmt = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const endFmt = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const label = offset === 0 ? `Last 7 Days (${startFmt} – ${endFmt})` : `${startFmt} – ${endFmt}`;

    return {
      timeRange: 'week',
      offset,
      minDateStr,
      maxDateStr,
      minTimestamp,
      maxTimestamp,
      label,
      rangeText: label
    };
  }

  // Month (30 days)
  const endDaysAgo = offset * 30;
  const startDaysAgo = endDaysAgo + 29;
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - endDaysAgo));
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - startDaysAgo));

  const minDateStr = startDate.toISOString().split('T')[0];
  const maxDateStr = endDate.toISOString().split('T')[0];
  const minTimestamp = new Date(minDateStr + 'T00:00:00Z').getTime();
  const maxTimestamp = new Date(maxDateStr + 'T23:59:59.999Z').getTime();

  const startFmt = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const endFmt = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const label = offset === 0 ? `Last 30 Days (${startFmt} – ${endFmt})` : `${startFmt} – ${endFmt}`;

  return {
    timeRange: 'month',
    offset,
    minDateStr,
    maxDateStr,
    minTimestamp,
    maxTimestamp,
    label,
    rangeText: label
  };
}

async function renderKpiBanner(bounds = getDateRangeBounds()) {
  const mount = document.getElementById('dash-kpi-banner');
  if (!mount) return;

  // 1. Earned Output (including Coins converted via user ratio)
  const totals = aggregateLocalEarned(bounds);
  const grandFlowers = Object.values(totals).reduce((s, v) => s + (v.flowers || 0), 0);
  const totalItems = Object.values(totals).reduce((s, v) => s + (v.qty || 0), 0);
  const grandTax = Object.values(totals).reduce((s, v) => s + (v.taxAmount || 0), 0);

  // 2. Spent Output (including Coins spent converted via user ratio)
  let grandSpentFlowers = 0;
  let totalSpentItems = 0;
  try {
    const spentItems = await loadSpentData(bounds);
    grandSpentFlowers = spentItems.reduce((s, v) => s + (v.flowers || 0), 0);
    totalSpentItems = spentItems.reduce((s, v) => s + (v.qty || 0), 0);
  } catch (_) {}

  // 3. Net Output = Earned - Spent
  const netFlowers = grandFlowers - grandSpentFlowers;

  mount.innerHTML = `
    <!-- Box 1: Harvest & Resources Earned -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3.5 rounded-xl border-2 border-emerald-600/30 shadow-sm flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-2xl shrink-0">
        🌾
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Earned (After Tax)</p>
        <p class="font-mono text-base sm:text-xl font-bold text-sfl-green truncate">+${grandFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${Math.round(totalItems).toLocaleString()} items & coins${grandTax > 0 ? ` • -${grandTax.toFixed(3)} 🌸 tax` : ''}</p>
      </div>
    </div>

    <!-- Box 2: Resources & Coins Spent -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3.5 rounded-xl border-2 border-orange-600/30 shadow-sm flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800 flex items-center justify-center text-2xl shrink-0">
        💸
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Spent</p>
        <p class="font-mono text-base sm:text-xl font-bold text-orange-700 dark:text-orange-400 truncate">-${grandSpentFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${Math.round(totalSpentItems).toLocaleString()} items & coins</p>
      </div>
    </div>

    <!-- Box 3: Net Output -->
    <div class="bg-sfl-card/90 dark:bg-amber-950/40 p-3.5 rounded-xl border-2 ${netFlowers >= 0 ? 'border-emerald-600/40' : 'border-red-600/40'} shadow-sm flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl ${netFlowers >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-950/70 border-red-300 dark:border-red-800'} border flex items-center justify-center text-2xl shrink-0">
        ⚖️
      </div>
      <div class="truncate">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight tracking-wider">Net Output</p>
        <p class="font-mono text-base sm:text-xl font-bold ${netFlowers >= 0 ? 'text-sfl-green dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} truncate">
          ${netFlowers >= 0 ? '+' : ''}${netFlowers.toFixed(3)} 🌸
        </p>
        <p class="text-[10px] text-sfl-woodLight font-mono">${netFlowers >= 0 ? 'Net Surplus' : 'Net Deficit'}</p>
      </div>
    </div>`;
}

function renderTimeRangeControls() {
  const container = document.getElementById('dash-range-controls');
  if (!container) return;

  const bounds = getDateRangeBounds(activeTimeRange, activeTimeOffset);

  const btnClass = (range) => range === activeTimeRange
    ? 'bg-amber-500 text-stone-950 dark:bg-amber-400 dark:text-slate-950 border-2 border-amber-600 dark:border-amber-300 shadow-xs font-bold'
    : 'text-sfl-woodLight hover:text-sfl-dirt dark:text-slate-400 dark:hover:text-amber-200 font-semibold';

  container.innerHTML = `
    <!-- Range Selector Tabs (Day, Week, Month) -->
    <div class="inline-flex items-center bg-amber-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-amber-300/80 dark:border-slate-700 shadow-2xs">
      <button id="dash-range-btn-day" class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('day')}">
        📅 Day
      </button>
      <button id="dash-range-btn-week" class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('week')}">
        🗓️ Week
      </button>
      <button id="dash-range-btn-month" class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${btnClass('month')}">
        📆 Month
      </button>
    </div>

    <!-- Date Range Navigator Pager (Previous / Next Arrows & Date Label) -->
    <div class="inline-flex items-center gap-1.5 bg-amber-100/90 dark:bg-slate-800/90 px-2 py-1 rounded-xl border border-amber-300/80 dark:border-slate-700 shadow-2xs">
      <button id="dash-page-prev"
        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-200/80 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 transition font-bold text-xs cursor-pointer"
        title="Previous ${activeTimeRange}">
        ◀
      </button>
      <span id="dash-date-label" class="text-xs font-bold text-sfl-dirt dark:text-amber-100 px-2 min-w-[135px] sm:min-w-[165px] text-center truncate">
        ${bounds.label}
      </span>
      <button id="dash-page-next"
        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-200/80 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 transition font-bold text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        ${activeTimeOffset === 0 ? 'disabled' : ''}
        title="Next ${activeTimeRange}">
        ▶
      </button>
    </div>`;

  document.getElementById('dash-range-btn-day')?.addEventListener('click', () => switchTimeRange('day'));
  document.getElementById('dash-range-btn-week')?.addEventListener('click', () => switchTimeRange('week'));
  document.getElementById('dash-range-btn-month')?.addEventListener('click', () => switchTimeRange('month'));

  document.getElementById('dash-page-prev')?.addEventListener('click', () => navigatePeriod(1));
  document.getElementById('dash-page-next')?.addEventListener('click', () => navigatePeriod(-1));
}

function switchTimeRange(newRange) {
  const defaultOffset = (newRange === 'day') ? 1 : 0;
  if (activeTimeRange === newRange && activeTimeOffset === defaultOffset) return;
  activeTimeRange = newRange;
  activeTimeOffset = defaultOffset; // Reset offset: yesterday for day, 0 for week/month
  renderTimeRangeControls();
  populateSections();
}

function navigatePeriod(delta) {
  const newOffset = activeTimeOffset + delta;
  if (newOffset < 0) return; // Cannot navigate into future
  activeTimeOffset = newOffset;
  renderTimeRangeControls();
  populateSections();
}

// ── Touch Swipe Gesture Handler ────────────────────────────────────────────────
let touchStartX = 0;
let touchStartY = 0;

function setupSwipeGestures() {
  const target = document.getElementById('dashboard-section');
  if (!target || target.dataset.swipeBound) return;
  target.dataset.swipeBound = 'true';

  target.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  target.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      // Horizontal swipe threshold: >= 60px horizontal and dx > 1.4 * dy
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (deltaX > 0) {
          // Swiped right -> go to previous (older) period
          navigatePeriod(1);
        } else {
          // Swiped left -> go to next (newer) period
          navigatePeriod(-1);
        }
      }
    }
  }, { passive: true });
}

function renderTemplate() {
  const container = document.getElementById('dashboard-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Header Banner & Time Range Controls (Day/Week/Month + Pager) -->
      <div class="bg-sfl-card/95 dark:bg-slate-900/80 p-4 rounded-2xl border-2 border-sfl-cardBorder dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-sfl-wood dark:text-amber-300 uppercase flex items-center gap-2">
            <span>📊</span> Dashboard
          </h3>
          <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold">
            Track harvests, consumption, and net organic yields. Swipe left/right or use arrows to navigate history.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <!-- Time Range Selector & Pager Controls -->
          <div id="dash-range-controls" class="flex items-center gap-2 flex-wrap"></div>

          <!-- Refresh Button -->
          <button id="dashboard-refresh-btn"
            class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 border-2 border-amber-300 dark:border-slate-600 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Top High-Level 3-Box KPI Ribbon -->
      <div id="dash-kpi-banner" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>

      <!-- Main Dashboard Grid: Two Columns (Earned & Spent) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <!-- Column 1: Items & Coins Earned (Emerald Accent) -->
        <div class="bg-sfl-card/95 dark:bg-amber-950/30 p-4 rounded-2xl border-2 border-emerald-600/30 shadow-sm">
          <div id="dash-earned-mount"></div>
        </div>

        <!-- Column 2: Items & Coins Spent (Orange Accent) -->
        <div class="bg-sfl-card/95 dark:bg-amber-950/30 p-4 rounded-2xl border-2 border-orange-600/30 shadow-sm">
          <div id="dash-spent-mount"></div>
        </div>
      </div>
    </div>`;

  setupSwipeGestures();
}

export async function populateSections(boundsInput = null) {
  const bounds = boundsInput || getDateRangeBounds(activeTimeRange, activeTimeOffset);
  await renderKpiBanner(bounds);
  renderEarnedSection(document.getElementById('dash-earned-mount'), bounds);
  await renderSpentSection(document.getElementById('dash-spent-mount'), bounds);
  await renderKpiBanner(bounds);
}

export function initDashboardPanel() {
  renderTemplate();
  renderTimeRangeControls();
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
    renderTimeRangeControls();
    document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
      populateSections();
    });
  }
  await populateSections();
}

if (typeof window !== 'undefined') {
  window.mountDashboard = mountDashboard;
  window.refreshDashboardView = () => populateSections();
  window.populateSections = populateSections;
}
