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

export function renderEarnedSection(mountEl) {
  if (!mountEl) return;

  const rows = getLocalEarnedRows();
  const totals = aggregateLocalEarned();
  const grandFlowers = Object.values(totals).reduce((s, v) => s + v.flowers, 0);
  const sortedItems = Object.entries(totals).sort((a, b) => b[1].flowers - a[1].flowers);

  if (sortedItems.length === 0) {
    mountEl.innerHTML = `<p class="text-xs text-sfl-woodLight italic text-center py-4">No harvest data yet. Run the daily tracker first!</p>`;
    return;
  }

  const maxFlowers = sortedItems[0]?.[1]?.flowers || 1;
  const barsHtml = sortedItems.slice(0, 8).map(([name, { qty, flowers }]) => {
    const pct = Math.round((flowers / maxFlowers) * 100);
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-20 text-right font-bold text-sfl-dirt truncate shrink-0">${name}</span>
        <div class="flex-1 bg-amber-100 rounded-full h-2.5 overflow-hidden">
          <div class="bg-sfl-green h-2.5 rounded-full" style="width:${pct}%"></div>
        </div>
        <span class="w-28 font-mono text-sfl-green shrink-0 text-right">+${qty.toFixed(1)} (${flowers.toFixed(3)} 🌸)</span>
      </div>`;
  }).join('');

  const recentHtml = rows.slice(0, 5).map(r => {
    const chips = Object.entries(r.items).map(([name, { qty }]) =>
      `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 text-[10px] font-bold px-1.5 py-0.5 rounded">+${qty.toFixed(1)} ${name}</span>`
    ).join(' ');
    return `
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 border-b border-amber-100 last:border-0">
        <span class="text-[11px] font-bold text-sfl-wood w-14 shrink-0">${fmtDate(r.date)}</span>
        <span class="flex flex-wrap gap-1">${chips}</span>
        <span class="ml-auto font-mono text-sfl-green text-[11px] shrink-0">${r.totalFlowers.toFixed(3)} 🌸</span>
      </div>`;
  }).join('');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">🌾 Items Earned (Last 21 Days)</h4>
      <span class="font-mono text-sm font-bold text-sfl-green">${grandFlowers.toFixed(3)} 🌸</span>
    </div>
    <div class="space-y-1.5 mb-4">${barsHtml}</div>
    <div class="mt-3">
      <p class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wide mb-1">Recent Days</p>
      ${recentHtml}
    </div>`;
}
