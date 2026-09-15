import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemPrice(name) {
  if (window.allPrices) {
    const cleanKey = normalizeItemKey(name);
    const match = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (match) {
      const p = parseFloat(window.allPrices[match]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
  }
  const betty = getBettyUnitPrice(normalizeItemKey(name));
  if (betty !== null && betty > 0) return betty;
  const fallback = RESOURCE_FLOWER_FALLBACK_PRICES[normalizeItemKey(name)];
  if (fallback && fallback > 0) return fallback;
  return 0.01;
}

function fmtDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch { return dateStr; }
}

const ITEM_ICONS = {
  egg: '🥚', milk: '🥛', feather: '🪶', leather: '👞', wool: '🧶',
  merinowool: '🐑', honey: '🍯', wood: '🪵', stone: '🪨', iron: '⛓️',
  gold: '🪙', crimstone: '💎', obsidian: '⬛', salt: '🧂',
  sunflower: '🌻', potato: '🥔', pumpkin: '🎃', carrot: '🥕', cabbage: '🥬',
  beetroot: '🟣', cauliflower: '🥦', parsnip: '🥕', eggplant: '🍆', corn: '🌽',
  radish: '🔴', wheat: '🌾', kale: '🥬', soybean: '🫘', barley: '🌾',
  tomato: '🍅', apple: '🍎', orange: '🍊', blueberry: '🫐', banana: '🍌'
};

function getItemIcon(name) {
  const clean = normalizeItemKey(name);
  return ITEM_ICONS[clean] || '🌾';
}

// ─── Data loading ─────────────────────────────────────────────────────────────

export function getLocalEarnedRows() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]'); }
  catch { history = []; }
  if (!Array.isArray(history)) return [];

  return history
    .filter(e => e && ((parseFloat(e.totalCount || e.total_count) > 0) || (Array.isArray(e.crops) && e.crops.length > 0)))
    .map(e => {
      const rawCrops = Array.isArray(e.crops) ? e.crops
        : (Array.isArray(e.cropActivityYields)
          ? e.cropActivityYields.map(c => ({ name: c.crop || c.name, qty: c.totalProduced || c.qty || 0, flowers: c.netFlowers || c.flowers || 0 }))
          : []);

      const items = {};
      let totalFlowers = 0;
      rawCrops.forEach(c => {
        const name = c.name || c.item || 'Item';
        const qty = parseFloat(c.qty) || 0;
        let flowers = parseFloat(c.flowers) || 0;
        if (flowers <= 0 || flowers > qty * 1.5) {
          flowers = parseFloat((getItemPrice(name) * qty).toFixed(3));
        }
        if (qty <= 0) return;
        if (!items[name]) items[name] = { qty: 0, flowers: 0 };
        items[name].qty += qty;
        items[name].flowers += flowers;
        totalFlowers += flowers;
      });

      return {
        date: e.date || e.yield_date || '',
        items,
        totalFlowers: parseFloat(totalFlowers.toFixed(3))
      };
    })
    .filter(r => r.date && Object.keys(r.items).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function aggregateLocalEarned() {
  const rows = getLocalEarnedRows();
  const totals = {};
  rows.forEach(r => {
    Object.entries(r.items).forEach(([name, { qty, flowers }]) => {
      if (!totals[name]) totals[name] = { qty: 0, flowers: 0 };
      totals[name].qty += qty;
      totals[name].flowers += flowers;
    });
  });
  return totals;
}

// ─── Render ───────────────────────────────────────────────────────────────────

let currentEarnedTab = 'ranking';

export function renderEarnedSection(mountEl) {
  if (!mountEl) return;

  const rows = getLocalEarnedRows();
  const totals = aggregateLocalEarned();
  const grandFlowers = Object.values(totals).reduce((s, v) => s + v.flowers, 0);
  const totalItemsCount = Object.values(totals).reduce((s, v) => s + v.qty, 0);
  const sortedItems = Object.entries(totals).sort((a, b) => b[1].flowers - a[1].flowers);

  if (sortedItems.length === 0) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-sfl-wood uppercase flex items-center gap-1.5">
          <span>🌾</span> Harvest Production
        </span>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">🚜</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Harvest Sessions Recorded</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Run a harvest sync in the Daily Tracker to populate your 21-day production history.</p>
      </div>`;
    return;
  }

  const maxFlowers = sortedItems[0]?.[1]?.flowers || 1;

  const barsHtml = sortedItems.map(([name, { qty, flowers }]) => {
    const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
    const icon = getItemIcon(name);
    return `
      <div class="group flex items-center gap-2.5 text-xs py-1 hover:bg-amber-100/40 dark:hover:bg-amber-900/30 px-2 rounded-lg transition">
        <span class="text-sm shrink-0">${icon}</span>
        <div class="w-24 truncate font-bold text-sfl-dirt dark:text-amber-100 shrink-0" title="${name}">
          ${name}
        </div>
        <div class="flex-1 bg-amber-200/60 dark:bg-amber-900/40 rounded-full h-2 overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
        </div>
        <div class="text-right shrink-0 font-mono">
          <span class="font-bold text-sfl-dirt dark:text-amber-100">+${qty.toFixed(1)}</span>
          <span class="text-sfl-green text-[11px] ml-1 font-semibold">(${flowers.toFixed(3)} 🌸)</span>
        </div>
      </div>`;
  }).join('');

  const recentHtml = rows.slice(0, 6).map(r => {
    const chips = Object.entries(r.items).slice(0, 5).map(([name, { qty }]) =>
      `<span class="inline-flex items-center gap-0.5 bg-green-100/90 dark:bg-green-950/50 text-sfl-green border border-sfl-green/30 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
        <span>+${qty.toFixed(1)}</span>
        <span>${name}</span>
      </span>`
    ).join(' ');
    const extraCount = Object.keys(r.items).length - 5;

    return `
      <div class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-amber-200/60 dark:border-amber-800/40 last:border-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="bg-sfl-wood text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">${fmtDate(r.date)}</span>
          <div class="flex flex-wrap items-center gap-1">
            ${chips}
            ${extraCount > 0 ? `<span class="text-[10px] text-sfl-woodLight font-semibold">+${extraCount} more</span>` : ''}
          </div>
        </div>
        <span class="font-mono text-xs font-bold text-sfl-green whitespace-nowrap">${r.totalFlowers.toFixed(3)} 🌸</span>
      </div>`;
  }).join('');

  mountEl.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>🌾</span> Harvested Resources
        </h4>
        <p class="text-[10px] text-sfl-woodLight">Last 21 days • ${totalItemsCount.toFixed(0)} items produced</p>
      </div>
      <div class="text-right">
        <span class="font-mono text-sm font-bold text-sfl-green bg-green-100/80 dark:bg-green-950/40 border border-green-300 dark:border-green-800 px-2 py-0.5 rounded-lg shadow-2xs">
          ${grandFlowers.toFixed(3)} 🌸
        </span>
      </div>
    </div>

    <!-- Segmented Tab Switcher -->
    <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-amber-950/60 p-1 rounded-lg border border-amber-300/60 dark:border-amber-800 mb-3">
      <button id="dash-earned-tab-rank" class="flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${currentEarnedTab === 'ranking' ? 'bg-sfl-wood text-amber-200 shadow-xs' : 'text-sfl-woodLight hover:text-sfl-dirt'}">
        📊 Top Items Breakdown (${sortedItems.length})
      </button>
      <button id="dash-earned-tab-feed" class="flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition cursor-pointer ${currentEarnedTab === 'feed' ? 'bg-sfl-wood text-amber-200 shadow-xs' : 'text-sfl-woodLight hover:text-sfl-dirt'}">
        📅 Daily Harvest Log (${rows.length} Days)
      </button>
    </div>

    <!-- Tab Content -->
    <div id="dash-earned-content" class="max-h-60 overflow-y-auto pr-1">
      ${currentEarnedTab === 'ranking' ? `<div class="space-y-0.5">${barsHtml}</div>` : `<div class="space-y-0">${recentHtml}</div>`}
    </div>`;

  document.getElementById('dash-earned-tab-rank')?.addEventListener('click', () => {
    currentEarnedTab = 'ranking';
    renderEarnedSection(mountEl);
  });
  document.getElementById('dash-earned-tab-feed')?.addEventListener('click', () => {
    currentEarnedTab = 'feed';
    renderEarnedSection(mountEl);
  });
}
