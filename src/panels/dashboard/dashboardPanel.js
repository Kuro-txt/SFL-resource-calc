// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// Unified Command Center: Top KPI Ribbon, Items Earned, Items Spent, and Trades.
// Supports dynamic time ranges: Day (Daily), Week (7 Days), and Month (30 Days),
// with historical date range navigation (previous/next arrows and touch swipe).

import { renderEarnedSection, aggregateLocalEarned, loadEarnedTotals } from './dashboardEarned.js';
import { renderSpentSection, loadSpentData, clearBaselineMemoryCache } from './dashboardSpent.js';

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
    // Calendar Week: Monday 00:00:00 UTC to Sunday 23:59:59 UTC
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // 0 = Monday, ..., 6 = Sunday
    const daysBackToMonday = dayOfWeek + (offset * 7);
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBackToMonday));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));

    const minDateStr = monday.toISOString().split('T')[0];
    const maxDateStr = sunday.toISOString().split('T')[0];
    const minTimestamp = new Date(minDateStr + 'T00:00:00Z').getTime();
    const maxTimestamp = new Date(maxDateStr + 'T23:59:59.999Z').getTime();

    const startFmt = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const endFmt = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    let label = `${startFmt} – ${endFmt}`;
    if (offset === 0) label = `This Week (${startFmt} – ${endFmt})`;
    else if (offset === 1) label = `Last Week (${startFmt} – ${endFmt})`;

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

  // Calendar Month: 1st day to last day of month (e.g. Jun 1-30, Aug 1-31)
  const targetYear = now.getUTCFullYear();
  const targetMonth = now.getUTCMonth() - offset;
  const startDate = new Date(Date.UTC(targetYear, targetMonth, 1));
  const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0)); // Day 0 of next month is last day of target month

  const minDateStr = startDate.toISOString().split('T')[0];
  const maxDateStr = endDate.toISOString().split('T')[0];
  const minTimestamp = new Date(minDateStr + 'T00:00:00Z').getTime();
  const maxTimestamp = new Date(maxDateStr + 'T23:59:59.999Z').getTime();

  const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const startFmt = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const endFmt = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const monthKey = minDateStr.slice(0, 7); // 'YYYY-MM'

  let label = `${monthName} (${startFmt} – ${endFmt})`;
  if (offset === 0) label = `${monthName} (This Month)`;
  else if (offset === 1) label = `${monthName} (Last Month)`;

  return {
    timeRange: 'month',
    offset,
    monthKey,
    minDateStr,
    maxDateStr,
    minTimestamp,
    maxTimestamp,
    label,
    rangeText: label
  };
}

async function renderKpiBanner(bounds = getDateRangeBounds(), preloadedSpentItems = null, preloadedTotals = null) {
  const mount = document.getElementById('dash-kpi-banner');
  if (!mount) return;

  // 1. Earned Output (including Coins converted via user ratio)
  const totals = preloadedTotals || (await loadEarnedTotals(bounds));
  const grandFlowers = Object.values(totals).reduce((s, v) => s + (v.flowers || 0), 0);
  const totalItems = Object.values(totals).reduce((s, v) => s + (v.qty || 0), 0);
  const grandTax = Object.values(totals).reduce((s, v) => s + (v.taxAmount || 0), 0);

  // 2. Spent Output (including Coins spent converted via user ratio)
  let grandSpentFlowers = 0;
  let totalSpentItems = 0;
  try {
    const spentItems = preloadedSpentItems || (await loadSpentData(bounds));
    grandSpentFlowers = spentItems.reduce((s, v) => s + (v.flowers || 0), 0);
    totalSpentItems = spentItems.reduce((s, v) => s + (v.qty || 0), 0);
  } catch (_) {}

  // 3. Net Output = Earned - Spent
  const netFlowers = grandFlowers - grandSpentFlowers;

  mount.innerHTML = `
    <!-- Box 1: Net Output (Hero Summary) -->
    <div class="bg-sfl-card/95 dark:bg-slate-900/90 p-4 rounded-2xl border-2 ${netFlowers >= 0 ? 'border-emerald-600/50 dark:border-emerald-600/60 bg-gradient-to-br from-emerald-500/10 to-transparent' : 'border-red-600/50 dark:border-red-600/60 bg-gradient-to-br from-red-500/10 to-transparent'} shadow-sm flex items-center gap-3.5">
      <div class="w-12 h-12 rounded-xl ${netFlowers >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-950/70 border-red-300 dark:border-red-800'} border flex items-center justify-center text-2xl shrink-0 shadow-2xs">
        ⚖️
      </div>
      <div class="truncate flex-1">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight dark:text-slate-400 tracking-wider">Net Output</p>
        <p class="font-mono text-lg sm:text-2xl font-bold ${netFlowers >= 0 ? 'text-sfl-green dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} truncate">
          ${netFlowers >= 0 ? '+' : ''}${netFlowers.toFixed(3)} 🌸
        </p>
        <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono mt-0.5">${netFlowers >= 0 ? 'Net Surplus' : 'Net Deficit'}</p>
      </div>
    </div>

    <!-- Box 2: Harvest & Resources Earned -->
    <div class="bg-sfl-card/95 dark:bg-slate-900/90 p-4 rounded-2xl border-2 border-emerald-600/30 dark:border-emerald-700/40 shadow-sm flex items-center gap-3.5">
      <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
        🌾
      </div>
      <div class="truncate flex-1">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight dark:text-slate-400 tracking-wider">Earned (After Tax)</p>
        <p class="font-mono text-lg sm:text-2xl font-bold text-sfl-green dark:text-emerald-400 truncate">+${grandFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono mt-0.5 truncate">${Math.round(totalItems).toLocaleString()} items & coins${grandTax > 0 ? ` • -${grandTax.toFixed(3)} 🌸 tax` : ''}</p>
      </div>
    </div>

    <!-- Box 3: Resources, Coins & Gems Spent -->
    <div class="bg-sfl-card/95 dark:bg-slate-900/90 p-4 rounded-2xl border-2 border-orange-600/30 dark:border-orange-700/40 shadow-sm flex items-center gap-3.5">
      <div class="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
        💸
      </div>
      <div class="truncate flex-1">
        <p class="text-[10px] font-bold uppercase text-sfl-woodLight dark:text-slate-400 tracking-wider">Spent</p>
        <p class="font-mono text-lg sm:text-2xl font-bold text-orange-700 dark:text-orange-400 truncate">-${grandSpentFlowers.toFixed(3)} 🌸</p>
        <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono mt-0.5 truncate">${Math.round(totalSpentItems).toLocaleString()} items & currency</p>
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
    <div class="inline-flex items-center gap-1 sm:gap-1.5 bg-amber-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-amber-300/80 dark:border-slate-700 shadow-2xs">
      <button id="dash-page-prev"
        class="h-8 px-2.5 sm:px-3 flex items-center justify-center gap-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/90 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-950 dark:text-amber-200 border border-amber-300/90 dark:border-slate-600 transition font-bold text-xs cursor-pointer shadow-2xs active:scale-95"
        title="Previous ${activeTimeRange}">
        <span class="text-sm">◀</span>
        <span class="hidden sm:inline font-semibold">Prev</span>
      </button>
      <span id="dash-date-label" class="text-xs sm:text-sm font-bold text-sfl-dirt dark:text-amber-100 px-2 sm:px-3 min-w-[130px] sm:min-w-[170px] text-center truncate select-none">
        ${bounds.label}
      </span>
      <button id="dash-page-next"
        class="h-8 px-2.5 sm:px-3 flex items-center justify-center gap-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/90 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-950 dark:text-amber-200 border border-amber-300/90 dark:border-slate-600 transition font-bold text-xs cursor-pointer shadow-2xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-200/80 disabled:active:scale-100"
        ${activeTimeOffset === 0 ? 'disabled' : ''}
        title="Next ${activeTimeRange}">
        <span class="hidden sm:inline font-semibold">Next</span>
        <span class="text-sm">▶</span>
      </button>
    </div>`;

  document.getElementById('dash-range-btn-day')?.addEventListener('click', () => switchTimeRange('day'));
  document.getElementById('dash-range-btn-week')?.addEventListener('click', () => switchTimeRange('week'));
  document.getElementById('dash-range-btn-month')?.addEventListener('click', () => switchTimeRange('month'));

  document.getElementById('dash-page-prev')?.addEventListener('click', () => navigatePeriod(1));
  document.getElementById('dash-page-next')?.addEventListener('click', () => navigatePeriod(-1));
}

function updateDateNavigationUI() {
  const bounds = getDateRangeBounds(activeTimeRange, activeTimeOffset);
  const dateLabel = document.getElementById('dash-date-label');
  if (dateLabel) dateLabel.textContent = bounds.label;
  const nextBtn = document.getElementById('dash-page-next');
  if (nextBtn) {
    nextBtn.disabled = (activeTimeOffset === 0);
  }
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
  updateDateNavigationUI();
  populateSections();
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
            Track harvests, consumption, and net organic yields. Use ◀ / ▶ arrows to navigate history.
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

      <!-- Top High-Level 3-Box KPI Ribbon (Net Output Above, then Earned, then Spent) -->
      <div id="dash-kpi-banner" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>

      <!-- Main Dashboard Sections: Stacked (Earned, then Spent) -->
      <div class="space-y-4">
        <!-- Section 1: Items & Coins Earned (Emerald Accent) -->
        <div class="bg-sfl-card/95 dark:bg-slate-900/90 p-3.5 sm:p-5 rounded-2xl border-2 border-emerald-600/30 dark:border-emerald-700/40 shadow-sm transition-all">
          <div id="dash-earned-mount"></div>
        </div>

        <!-- Section 2: Items & Coins Spent (Orange Accent) -->
        <div class="bg-sfl-card/95 dark:bg-slate-900/90 p-3.5 sm:p-5 rounded-2xl border-2 border-orange-600/30 dark:border-orange-700/40 shadow-sm transition-all">
          <div id="dash-spent-mount"></div>
        </div>
      </div>
    </div>`;
}

let activeRenderId = 0;

export async function populateSections(boundsInput = null, force = false) {
  const renderId = ++activeRenderId;
  const bounds = boundsInput || getDateRangeBounds(activeTimeRange, activeTimeOffset);

  const container = document.getElementById('dashboard-section');
  if (container) {
    container.classList.add('transition-opacity', 'duration-150');
    container.classList.add('opacity-80');
  }

  try {
    // 1. Fetch spent items and earned totals in parallel (hits in-memory RAM cache in 0ms if already cached)
    const [spentItems, earnedTotals] = await Promise.all([
      loadSpentData(bounds, force),
      loadEarnedTotals(bounds)
    ]);

    // If another date navigation occurred while waiting, drop this stale render
    if (renderId !== activeRenderId) return;

    // 2. Coordinated single-pass render across all sections in one frame
    renderKpiBanner(bounds, spentItems, earnedTotals);
    renderEarnedSection(document.getElementById('dash-earned-mount'), bounds, earnedTotals);
    renderSpentSection(document.getElementById('dash-spent-mount'), bounds, spentItems);
  } finally {
    if (renderId === activeRenderId && container) {
      container.classList.remove('opacity-80');
      container.classList.add('opacity-100');
    }
  }
}

export function initDashboardPanel() {
  renderTemplate();
  renderTimeRangeControls();
  initialized = true;

  document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
    clearBaselineMemoryCache();
    populateSections(null, true);
  });
}

let isMounting = false;
export async function mountDashboard() {
  if (isMounting) return;
  isMounting = true;
  try {
    if (!initialized) {
      initDashboardPanel(); // Binds refresh btn once here
    } else {
      renderTemplate();
      renderTimeRangeControls();
      // Refresh btn listener was already bound in initDashboardPanel — do NOT re-bind
    }
    await populateSections();
  } finally {
    isMounting = false;
  }
}

if (typeof window !== 'undefined') {
  window.mountDashboard = mountDashboard;
  window.refreshDashboardView = () => populateSections().catch(err => console.error('Dashboard refresh failed:', err));
  window.populateSections = populateSections;
}
