// ─── Items Spent Section ──────────────────────────────────────────────────────
// Diffs consecutive preharvest_baselines.stock rows to compute items consumed.

import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES, isAllowedDifferenceItem, ALLOWED_ITEM_NAMES, getCoinFlowerRatio } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';

function getItemPrice(name) {
  if (name === 'Coins' || normalizeItemKey(name) === 'coins') {
    return 1 / getCoinFlowerRatio();
  }
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

const ITEM_ICONS = {
  coins: '🪙', coin: '🪙',
  egg: '🥚', milk: '🥛', feather: '🪶', leather: '👞', wool: '🧶',
  merinowool: '🐑', honey: '🍯', wood: '🪵', stone: '🪨', iron: '⛓️',
  gold: '🪙', crimstone: '💎', obsidian: '⬛', salt: '🧂',
  sunflower: '🌻', potato: '🥔', pumpkin: '🎃', carrot: '🥕', cabbage: '🥬',
  beetroot: '🟣', cauliflower: '🥦', parsnip: '🥕', eggplant: '🍆', corn: '🌽',
  radish: '🔴', wheat: '🌾', kale: '🥬', soybean: '🫘', barley: '🌾',
  rhubarb: '🌱', zucchini: '🥒', yam: '🍠', broccoli: '🥦', pepper: '🌶️',
  onion: '🧅', turnip: '🪴', artichoke: '🌿', duskberry: '🫐', lunara: '✨',
  celestine: '💎', grape: '🍇', rice: '🌾', olive: '🫒', tomato: '🍅',
  lemon: '🍋', blueberry: '🫐', orange: '🍊', apple: '🍎', banana: '🍌',
  goblinemblem: '👺', bumpkinemblem: '🧑‍🌾', sunflorianemblem: '🌻', nightshadeemblem: '🌙',
  ruffroot: '🌿', chewedbone: '🦴', heartleaf: '🍃', moonfur: '🐾', ribbon: '🎀',
  dewberry: '🫐', wildgrass: '🌾', frostpebble: '🪨', capsulebait: '💊', umbrellabait: '☂️',
  crimsonbaitfish: '🐟'
};

function getItemIcon(name) {
  const clean = normalizeItemKey(name);
  return ITEM_ICONS[clean] || '📦';
}

const IGNORE_ITEMS = new Set([
  'flower', 'sfl', 'coin', 'coins', 'gem', 'blockbuck', 'loveletter', 'currentcoins'
]);

export async function loadSpentData(timeRange = '7d') {
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const user = window.currentUser;
  if (!client || !user) return [];

  const rowLimit = timeRange === 'daily' ? 2 : (timeRange === '7d' ? 8 : 31);

  const { data, error } = await client
    .from('preharvest_baselines')
    .select('snapshot_date, stock')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false })
    .limit(rowLimit);

  if (error || !data || data.length < 2) return [];

  // Sort ascending chronologically
  const chronological = [...data].reverse();

  const result = {};
  for (let i = 1; i < chronological.length; i++) {
    const prev = chronological[i - 1].stock || {};
    const curr = chronological[i].stock || {};

    const allItems = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    allItems.forEach(item => {
      const clean = normalizeItemKey(item);
      if (IGNORE_ITEMS.has(clean)) return;
      if (!isAllowedDifferenceItem(clean)) return;

      const prevQty = parseFloat(prev[item]) || 0;
      const currQty = parseFloat(curr[item]) || 0;
      const consumed = prevQty - currQty;

      if (consumed > 0.01) {
        const officialName = ALLOWED_ITEM_NAMES[clean] || item;
        if (!result[officialName]) result[officialName] = { qty: 0, flowers: 0 };
        result[officialName].qty += consumed;
        result[officialName].flowers += parseFloat((consumed * getItemPrice(item)).toFixed(3));
      }
    });
  }

  // Include Coins spent as a resource for the selected timeframe
  let history = [];
  try { history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]'); } catch (_) {}
  let totalCoinsSpent = 0;
  const now = Date.now();
  let minDateStr = '';
  if (timeRange === 'daily') {
    const todayStr = new Date().toISOString().split('T')[0];
    const hasToday = history.some(h => (h.date || h.yield_date) === todayStr);
    minDateStr = hasToday ? todayStr : (history[0]?.date || history[0]?.yield_date || todayStr);
  } else if (timeRange === '7d') {
    minDateStr = new Date(now - 7 * 86400 * 1000).toISOString().split('T')[0];
  } else if (timeRange === 'month') {
    minDateStr = new Date(now - 30 * 86400 * 1000).toISOString().split('T')[0];
  }

  history.forEach(h => {
    const d = h.date || h.yield_date || '';
    if (timeRange === 'daily' && d !== minDateStr) return;
    if (minDateStr && d < minDateStr) return;

    const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
    const coinsObj = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
    if (coinsObj) {
      totalCoinsSpent += parseFloat(coinsObj.coinsSpent || coinsObj.spent || 0);
    }
  });

  if (totalCoinsSpent > 0) {
    const ratio = getCoinFlowerRatio();
    const coinSpentFlowers = parseFloat((totalCoinsSpent / ratio).toFixed(3));
    result['Coins'] = { qty: Math.round(totalCoinsSpent), flowers: coinSpentFlowers };
  }

  return Object.entries(result)
    .map(([name, { qty, flowers }]) => ({ name, qty, flowers }))
    .sort((a, b) => b.flowers - a.flowers);
}

export async function renderSpentSection(mountEl, timeRange = '7d') {
  if (!mountEl) return;

  const rangeLabel = timeRange === 'daily' ? 'Today' : (timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
        <span>💸</span> Resources & Coins Spent
      </h4>
    </div>
    <p class="text-xs text-sfl-woodLight italic text-center py-6">⏳ Analyzing stock baselines...</p>`;

  const user = window.currentUser;
  if (!user) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>💸</span> Resources & Coins Spent
        </h4>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">🔒</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">Sign In Required</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Log in with your account to load multi-day consumption history.</p>
      </div>`;
    return;
  }

  const items = await loadSpentData(timeRange);

  if (items.length === 0) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>💸</span> Resources & Coins Spent
        </h4>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">📉</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Consumption in ${rangeLabel}</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Requires 2+ daily 00:00 UTC snapshots or recorded coin activity.</p>
      </div>`;
    return;
  }

  const grandFlowers = items.reduce((s, v) => s + v.flowers, 0);
  const maxFlowers = items[0]?.flowers || 1;

  const barsHtml = items.map(({ name, qty, flowers }) => {
    const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
    const icon = getItemIcon(name);
    const formattedQty = name === 'Coins' ? Math.round(qty).toLocaleString() : qty.toFixed(1);
    return `
      <div class="group flex items-center gap-2.5 text-xs py-1 hover:bg-orange-100/40 dark:hover:bg-orange-950/30 px-2 rounded-lg transition">
        <span class="text-sm shrink-0">${icon}</span>
        <div class="w-24 truncate font-bold text-sfl-dirt dark:text-amber-100 shrink-0" title="${name}">
          ${name}
        </div>
        <div class="flex-1 bg-amber-200/60 dark:bg-amber-900/40 rounded-full h-2 overflow-hidden">
          <div class="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
        </div>
        <div class="text-right shrink-0 font-mono">
          <span class="font-bold text-orange-700 dark:text-orange-400">-${formattedQty}</span>
          <span class="text-sfl-woodLight text-[11px] ml-1">(${flowers.toFixed(3)} 🌸)</span>
        </div>
      </div>`;
  }).join('');

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>💸</span> Resources & Coins Spent
        </h4>
        <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • Crafting, chores & coins spent</p>
      </div>
      <div class="text-right">
        <span class="font-mono text-sm font-bold text-orange-700 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 px-2 py-0.5 rounded-lg shadow-2xs">
          ${grandFlowers.toFixed(3)} 🌸 Used
        </span>
      </div>
    </div>
    <div class="max-h-60 overflow-y-auto pr-1 space-y-0.5">
      ${barsHtml}
    </div>
    <p class="text-[10px] text-sfl-woodLight italic mt-3 pt-2 border-t border-amber-100 dark:border-amber-900/40">
      * Computed between midnight baselines. Excludes market trades.
    </p>`;
}
