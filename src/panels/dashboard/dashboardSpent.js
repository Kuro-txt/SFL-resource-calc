// ─── Items Spent Section ──────────────────────────────────────────────────────
// Diffs consecutive preharvest_baselines.stock rows to compute items consumed.

import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';

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

// Items to ignore when computing spent (these naturally decrease but aren't "spent")
const IGNORE_ITEMS = new Set(['Flower', 'SFL', 'Coin', 'Gem', 'Block Buck', 'Love Letter']);

export async function loadSpentData() {
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const user = window.currentUser;
  if (!client || !user) return [];

  const { data, error } = await client
    .from('preharvest_baselines')
    .select('snapshot_date, stock')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true })
    .limit(8);

  if (error || !data || data.length < 2) return [];

  // Diff consecutive rows: if stock decreased, item was spent
  const result = {};
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].stock || {};
    const curr = data[i].stock || {};
    const fromDate = data[i - 1].snapshot_date;
    const toDate = data[i].snapshot_date;

    const allItems = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    allItems.forEach(item => {
      if (IGNORE_ITEMS.has(item)) return;
      const prevQty = parseFloat(prev[item]) || 0;
      const currQty = parseFloat(curr[item]) || 0;
      const consumed = prevQty - currQty;
      if (consumed > 0.01) {
        if (!result[item]) result[item] = { qty: 0, flowers: 0 };
        result[item].qty += consumed;
        result[item].flowers += parseFloat((consumed * getItemPrice(item)).toFixed(3));
      }
    });
  }

  return Object.entries(result)
    .map(([name, { qty, flowers }]) => ({ name, qty, flowers }))
    .sort((a, b) => b.flowers - a.flowers);
}

export async function renderSpentSection(mountEl) {
  if (!mountEl) return;

  mountEl.innerHTML = `<p class="text-xs text-sfl-woodLight italic text-center py-4">⏳ Loading consumed items...</p>`;

  const user = window.currentUser;
  if (!user) {
    mountEl.innerHTML = `<p class="text-xs text-sfl-woodLight italic text-center py-4">Sign in to see consumed items.</p>`;
    return;
  }

  const items = await loadSpentData();

  if (items.length === 0) {
    mountEl.innerHTML = `<p class="text-xs text-sfl-woodLight italic text-center py-4">No consumption data yet (needs 2+ daily baselines).</p>`;
    return;
  }

  const grandFlowers = items.reduce((s, v) => s + v.flowers, 0);
  const maxFlowers = items[0]?.flowers || 1;

  const barsHtml = items.slice(0, 8).map(({ name, qty, flowers }) => {
    const pct = Math.round((flowers / maxFlowers) * 100);
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-20 text-right font-bold text-sfl-dirt truncate shrink-0">${name}</span>
        <div class="flex-1 bg-amber-100 rounded-full h-2.5 overflow-hidden">
          <div class="bg-orange-400 h-2.5 rounded-full" style="width:${pct}%"></div>
        </div>
        <span class="w-28 font-mono text-orange-600 shrink-0 text-right">-${qty.toFixed(1)} (${flowers.toFixed(3)} 🌸)</span>
      </div>`;
  }).join('');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">💸 Items Spent (Last 7 Days)</h4>
      <span class="font-mono text-sm font-bold text-orange-600">${grandFlowers.toFixed(3)} 🌸 Used</span>
    </div>
    <div class="space-y-1.5">${barsHtml}</div>
    <p class="text-[10px] text-sfl-woodLight italic mt-3">Based on stock snapshots — reflects net consumption between midnight baselines.</p>`;
}
