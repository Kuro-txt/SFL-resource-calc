import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES, isAllowedDifferenceItem, ALLOWED_ITEM_NAMES, getCoinFlowerRatio, getItemTaxRate } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice, roundUpToThreeDecimals } from '../../utils/formatters.js';
import { getDateRangeBounds } from './dashboardPanel.js';

// ─── Categories & Icons ───────────────────────────────────────────────────────

export const ITEM_CATEGORIES = {
  // Crops & Fruits
  sunflower: 'crops', potato: 'crops', pumpkin: 'crops', carrot: 'crops', cabbage: 'crops',
  beetroot: 'crops', cauliflower: 'crops', parsnip: 'crops', radish: 'crops', wheat: 'crops',
  kale: 'crops', apple: 'crops', blueberry: 'crops', orange: 'crops', eggplant: 'crops',
  corn: 'crops', banana: 'crops', soybean: 'crops', grape: 'crops', rice: 'crops',
  olive: 'crops', tomato: 'crops', lemon: 'crops', barley: 'crops', rhubarb: 'crops',
  zucchini: 'crops', yam: 'crops', broccoli: 'crops', pepper: 'crops', onion: 'crops',
  turnip: 'crops', artichoke: 'crops', duskberry: 'crops', lunara: 'crops', celestine: 'crops',

  // Resources & Minerals
  wood: 'resources', stone: 'resources', iron: 'resources', gold: 'resources',
  crimstone: 'resources', obsidian: 'resources', salt: 'resources',

  // Animals & Barn
  egg: 'animals', honey: 'animals', leather: 'animals', wool: 'animals',
  merinowool: 'animals', feather: 'animals', milk: 'animals',

  // Special / Baits / Emblems
  goblinemblem: 'special', bumpkinemblem: 'special', sunflorianemblem: 'special',
  nightshadeemblem: 'special', ruffroot: 'special', chewedbone: 'special',
  heartleaf: 'special', moonfur: 'special', ribbon: 'special', dewberry: 'special',
  wildgrass: 'special', frostpebble: 'special', capsulebait: 'special',
  umbrellabait: 'special', crimsonbaitfish: 'special',

  // Coins
  coins: 'coins', coin: 'coins'
};

export const CATEGORY_META = {
  all: { label: 'All', icon: '🌟' },
  crops: { label: 'Crops', icon: '🌾' },
  resources: { label: 'Resources', icon: '🪵' },
  animals: { label: 'Animals', icon: '🥚' },
  special: { label: 'Special', icon: '🎁' }
};

export function getItemCategory(name) {
  const clean = normalizeItemKey(name);
  return ITEM_CATEGORIES[clean] || 'special';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch { return dateStr; }
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
  return ITEM_ICONS[clean] || '🌾';
}

// ─── Data loading ─────────────────────────────────────────────────────────────

export function getLocalEarnedRows(boundsInput = 'week') {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]'); }
  catch { history = []; }
  if (!Array.isArray(history)) return [];

  const bounds = (typeof boundsInput === 'object' && boundsInput?.minDateStr)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'day');

  return history
    .filter(e => {
      if (!e) return false;
      const d = e.date || e.yield_date || '';
      if (d < bounds.minDateStr || d > bounds.maxDateStr) return false;
      return (parseFloat(e.totalCount || e.total_count) > 0) || (Array.isArray(e.crops) && e.crops.length > 0) || (e.cropActivityYields && e.cropActivityYields.length > 0);
    })
    .map(e => {
      const rawCrops = Array.isArray(e.crops) ? e.crops
        : (Array.isArray(e.cropActivityYields)
          ? e.cropActivityYields.map(c => ({ name: c.crop || c.name, qty: c.totalProduced || c.qty || 0, flowers: c.netFlowers || c.flowers || 0 }))
          : []);

      const items = {};
      let totalFlowers = 0;
      rawCrops.forEach(c => {
        const rawName = c.name || c.item || c.crop || 'Item';
        const clean = normalizeItemKey(rawName);
        if (clean === 'gem' || clean === 'gems') return; // Never show gems in earned (only spent not gained, if gained show none)
        if (!isAllowedDifferenceItem(clean)) return;

        const name = ALLOWED_ITEM_NAMES[clean] || rawName;
        const qty = parseFloat(c.qty) || 0;
        if (qty <= 0) return;

        const unitPrice = (parseFloat(c.unitPrice) > 0) ? parseFloat(c.unitPrice) : getItemPrice(name);
        const grossFlowers = unitPrice * qty;
        const effectiveTaxRate = getItemTaxRate(name);
        const flowers = roundUpToThreeDecimals(grossFlowers * (1 - effectiveTaxRate));
        const taxAmount = Math.max(0, grossFlowers - flowers);

        if (!items[name]) items[name] = { qty: 0, flowers: 0, grossFlowers: 0, taxAmount: 0 };
        items[name].qty += qty;
        items[name].flowers += flowers;
        items[name].grossFlowers += grossFlowers;
        items[name].taxAmount += taxAmount;
        totalFlowers += flowers;
      });

      // Include Coins earned as a resource (untaxed currency)
      const rawActs = Array.isArray(e.cropActivityYields) ? e.cropActivityYields
        : (Array.isArray(e.crop_activity_yields) ? e.crop_activity_yields : []);
      const coinObj = rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) || e.coins;
      const coinsEarned = parseFloat(coinObj?.coinsEarned || coinObj?.earned || 0);

      if (coinsEarned > 0) {
        const ratio = getCoinFlowerRatio();
        const coinFlowers = parseFloat((coinsEarned / ratio).toFixed(3));
        items['Coins'] = { qty: Math.round(coinsEarned), flowers: coinFlowers, grossFlowers: coinFlowers, taxAmount: 0 };
        totalFlowers += coinFlowers;
      }

      return {
        date: e.date || e.yield_date || '',
        items,
        totalFlowers: parseFloat(totalFlowers.toFixed(3))
      };
    })
    .filter(r => r.date && Object.keys(r.items).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function aggregateLocalEarned(boundsInput = 'week') {
  const rows = getLocalEarnedRows(boundsInput);
  const totals = {};
  rows.forEach(r => {
    Object.entries(r.items).forEach(([name, data]) => {
      if (!totals[name]) totals[name] = { qty: 0, flowers: 0, grossFlowers: 0, taxAmount: 0 };
      totals[name].qty += data.qty;
      totals[name].flowers += data.flowers;
      totals[name].grossFlowers += (data.grossFlowers || data.flowers);
      totals[name].taxAmount += (data.taxAmount || 0);
    });
  });
  return totals;
}

// ─── Render ───────────────────────────────────────────────────────────────────

let currentEarnedCategory = 'all';
let isEarnedOpen = true;
try {
  const saved = localStorage.getItem('sfl_dash_earned_open');
  if (saved !== null) isEarnedOpen = (saved === 'true');
} catch (_) {}

export function renderEarnedSection(mountEl, boundsInput = 'day') {
  if (!mountEl) return;

  const bounds = (typeof boundsInput === 'object' && boundsInput?.label)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'day');

  const totals = aggregateLocalEarned(bounds);
  const grandFlowers = Object.values(totals).reduce((s, v) => s + v.flowers, 0);
  const totalItemsCount = Object.values(totals).reduce((s, v) => s + v.qty, 0);
  const grandTaxAmount = Object.values(totals).reduce((s, v) => s + (v.taxAmount || 0), 0);

  const savedTax = typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_tax_rate') : null;
  const parsedTax = savedTax !== null ? parseFloat(savedTax) : NaN;
  const currentTaxRate = (!isNaN(parsedTax)) ? parsedTax : 0.10;
  const taxPct = Math.round(currentTaxRate * 100);

  // Extract Coins for dedicated prominent card
  const coinsData = totals['Coins'] || null;

  // Classify all other items
  const nonCoinItems = Object.entries(totals)
    .filter(([name]) => name !== 'Coins')
    .map(([name, { qty, flowers, grossFlowers, taxAmount }]) => ({
      name,
      qty,
      flowers: parseFloat(flowers.toFixed(3)),
      grossFlowers: parseFloat((grossFlowers || flowers).toFixed(3)),
      taxAmount: parseFloat((taxAmount || 0).toFixed(3)),
      category: getItemCategory(name)
    }))
    .sort((a, b) => b.flowers - a.flowers);

  // Category counts
  const counts = {
    all: nonCoinItems.length,
    crops: nonCoinItems.filter(i => i.category === 'crops').length,
    resources: nonCoinItems.filter(i => i.category === 'resources').length,
    animals: nonCoinItems.filter(i => i.category === 'animals').length,
    special: nonCoinItems.filter(i => i.category === 'special').length
  };

  const rangeLabel = bounds.label || 'Selected Range';

  if (nonCoinItems.length === 0 && !coinsData) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
        <div>
          <h4 class="text-xs sm:text-sm font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>🌾</span> Resources & Coins Earned
          </h4>
          <p class="text-[10px] text-sfl-woodLight dark:text-slate-400">${rangeLabel}</p>
        </div>
        <div class="text-right">
          <span class="font-mono text-sm font-bold text-sfl-green dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl shadow-2xs">
            +0.000 🌸
          </span>
        </div>
      </div>
      <div class="text-center py-12 px-4 bg-amber-50/40 dark:bg-slate-900/40 rounded-xl border border-amber-200/60 dark:border-slate-800">
        <span class="text-3xl mb-2 block">🚜</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Harvests Recorded in ${rangeLabel}</p>
        <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 mt-1">Navigate days with ◀ / ▶ or click 🔄 Refresh.</p>
      </div>`;
    return;
  }

  function getItemsListHtml() {
    const visibleItems = currentEarnedCategory === 'all'
      ? nonCoinItems
      : nonCoinItems.filter(i => i.category === currentEarnedCategory);

    if (visibleItems.length === 0) {
      return `
        <div class="text-center py-10 px-4 text-sfl-woodLight dark:text-slate-400">
          <span class="text-2xl mb-1.5 block opacity-60">🌾</span>
          <p class="text-xs font-semibold">No ${CATEGORY_META[currentEarnedCategory]?.label || 'items'} recorded in this timeframe.</p>
        </div>`;
    }

    const maxFlowers = visibleItems[0]?.flowers || 1;

    return visibleItems.map(({ name, qty, flowers, grossFlowers, taxAmount, category }) => {
      const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
      const icon = getItemIcon(name);
      const catMeta = CATEGORY_META[category] || { label: category, icon: '🌾' };
      const formattedQty = qty % 1 === 0 ? qty.toLocaleString() : qty.toFixed(1);
      const taxTooltip = taxAmount > 0 
        ? `Gross: ${grossFlowers.toFixed(3)} 🌸 | Tax (${taxPct}%): -${taxAmount.toFixed(3)} 🌸 | Net: ${flowers.toFixed(3)} 🌸`
        : `Value: ${flowers.toFixed(3)} 🌸`;

      return `
        <div class="group flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 transition-colors"
          title="${taxTooltip}">
          <!-- Column 1: Item (Icon + Name + Category + Micro Share Bar) -->
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span class="text-base sm:text-lg shrink-0 select-none">${icon}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-sfl-dirt dark:text-amber-100 text-[11px] sm:text-xs leading-snug break-words">${name}</span>
                <span class="hidden sm:inline-block text-[9px] font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">${catMeta.label}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <div class="w-12 sm:w-28 bg-amber-200/40 dark:bg-slate-800 rounded-full h-1 overflow-hidden shrink-0">
                  <div class="bg-gradient-to-r from-emerald-500 to-green-600 h-full rounded-full transition-all duration-300" style="width:${pct}%"></div>
                </div>
                <span class="sm:hidden text-[8px] font-medium uppercase tracking-wider text-sfl-woodLight dark:text-slate-400 opacity-75">${catMeta.label}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: Quantity Produced (Aligned) -->
          <div class="w-14 sm:w-24 text-right shrink-0 font-mono text-[11px] sm:text-xs">
            <span class="font-bold text-sfl-dirt dark:text-amber-100">+${formattedQty}</span>
          </div>

          <!-- Column 3: Flower Value (Aligned) -->
          <div class="w-20 sm:w-28 text-right shrink-0 font-mono text-[11px] sm:text-xs">
            <span class="font-bold text-sfl-green dark:text-emerald-400 sm:text-[13px]">+${flowers.toFixed(3)} 🌸</span>
          </div>
        </div>`;
    }).join('');
  }

  function getCoinsBannerHtml() {
    if (!coinsData || coinsData.qty <= 0) return '';
    const ratio = getCoinFlowerRatio();
    return `
      <div class="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 dark:from-yellow-950/40 dark:to-amber-950/30 border border-yellow-500/30 dark:border-yellow-600/40 p-2.5 rounded-xl flex items-center justify-between shadow-2xs mb-3 min-h-[58px]">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-950/60 border border-yellow-300 dark:border-yellow-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            🪙
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase text-yellow-800 dark:text-yellow-300 tracking-wider">Coins Earned</p>
            <p class="font-mono text-sm font-bold text-yellow-900 dark:text-yellow-100">+${Math.round(coinsData.qty).toLocaleString()} Coins</p>
          </div>
        </div>
        <div class="text-right font-mono">
          <span class="text-xs font-bold text-sfl-green dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs">
            +${coinsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight dark:text-slate-400 mt-1">1🌸 = ${ratio.toLocaleString()}🪙</p>
        </div>
      </div>`;
  }

  function getCategoryPillsHtml() {
    const pill = (cat, label, icon, count) => {
      const isActive = currentEarnedCategory === cat;
      const activeClass = isActive
        ? 'bg-emerald-600 text-white font-bold shadow-xs'
        : 'text-sfl-wood hover:text-sfl-dirt dark:text-slate-400 dark:hover:text-amber-200 font-medium hover:bg-amber-200/50 dark:hover:bg-slate-800';
      return `
        <button data-cat="${cat}" class="dash-earned-cat-btn px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs ${activeClass}">
          <span>${icon}</span>
          <span>${label}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-200/60 dark:bg-slate-800 text-sfl-woodLight dark:text-slate-400'}">${count}</span>
        </button>`;
    };

    return `
      <div class="flex items-center gap-1 overflow-x-auto p-1 bg-amber-100/70 dark:bg-slate-900/60 rounded-xl border border-amber-300/60 dark:border-slate-800 mb-3 scrollbar-none">
        ${pill('all', 'All', '🌟', counts.all)}
        ${pill('crops', 'Crops', '🌾', counts.crops)}
        ${pill('resources', 'Resources', '🪵', counts.resources)}
        ${pill('animals', 'Animals', '🥚', counts.animals)}
        ${pill('special', 'Special', '🎁', counts.special)}
      </div>`;
  }

  mountEl.innerHTML = `
    <!-- Header (Click to Expand / Collapse) -->
    <div id="dash-earned-toggle-header" class="flex items-center justify-between cursor-pointer select-none group py-0.5"
      title="${isEarnedOpen ? 'Click to collapse breakdown' : 'Click to expand breakdown'}">
      <div class="min-w-0 pr-2 flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          🌾
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-xs sm:text-sm font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              Resources & Coins Earned
            </h4>
            <span class="text-[10px] font-bold text-sfl-woodLight dark:text-slate-400 bg-amber-200/50 dark:bg-slate-800 px-2 py-0.2 rounded-full border border-amber-300/50 dark:border-slate-700">
              ${nonCoinItems.length + (coinsData ? 1 : 0)} items & coins
            </span>
          </div>
          <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate mt-0.5">${rangeLabel} • Net after ${taxPct}% tax ${grandTaxAmount > 0 ? `(-${grandTaxAmount.toFixed(3)} 🌸)` : ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <span class="font-mono text-xs sm:text-sm font-bold text-sfl-green dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl shadow-2xs"
          title="Gross: ${(grandFlowers + grandTaxAmount).toFixed(3)} 🌸 | Total Tax: -${grandTaxAmount.toFixed(3)} 🌸">
          +${grandFlowers.toFixed(3)} 🌸
        </span>
        <button id="dash-earned-arrow-btn" class="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-amber-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-sfl-wood dark:text-amber-200 transition shadow-2xs cursor-pointer"
          title="${isEarnedOpen ? 'Collapse items' : 'Expand items'}">
          ${isEarnedOpen ? '▲' : '▼'}
        </button>
      </div>
    </div>

    <!-- Collapsible Body (Currency Banners + Filter Pills + Ledger Table) -->
    <div id="dash-earned-body" class="${isEarnedOpen ? '' : 'hidden'} mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 space-y-3">
      <!-- Featured Coins Earned Card -->
      ${getCoinsBannerHtml()}

      <!-- Section Title & Category Filter Pills -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>📊</span> Item Breakdown
          </h5>
        </div>
        <div id="dash-earned-cat-pills">${getCategoryPillsHtml()}</div>
      </div>

      <!-- Item Breakdown Content Table -->
      <div class="rounded-xl border border-amber-200/60 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-900/40 overflow-hidden shadow-2xs">
        <div class="sticky top-0 z-10 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-amber-100/90 dark:bg-slate-900/95 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400 border-b border-amber-200/60 dark:border-slate-800">
          <span class="flex-1 min-w-0">Item</span>
          <span class="w-14 sm:w-24 text-right">
            <span class="sm:hidden">Qty</span>
            <span class="hidden sm:inline">Produced</span>
          </span>
          <span class="w-20 sm:w-28 text-right">
            <span class="sm:hidden">Value</span>
            <span class="hidden sm:inline">Value (Net)</span>
          </span>
        </div>
        <div id="dash-earned-items-list" class="max-h-[380px] overflow-y-auto divide-y divide-amber-200/30 dark:divide-slate-800/40">
          ${getItemsListHtml()}
        </div>
      </div>
    </div>`;

  // Bind collapse / expand toggle
  const toggleHeader = mountEl.querySelector('#dash-earned-toggle-header');
  if (toggleHeader && !toggleHeader._bound) {
    toggleHeader._bound = true;
    toggleHeader.addEventListener('click', (e) => {
      // Don't toggle if clicking a link or interactive element inside header other than arrow/header
      isEarnedOpen = !isEarnedOpen;
      try { localStorage.setItem('sfl_dash_earned_open', String(isEarnedOpen)); } catch (_) {}
      const body = mountEl.querySelector('#dash-earned-body');
      const arrow = mountEl.querySelector('#dash-earned-arrow-btn');
      if (body) {
        if (isEarnedOpen) body.classList.remove('hidden');
        else body.classList.add('hidden');
      }
      if (arrow) {
        arrow.textContent = isEarnedOpen ? '▲' : '▼';
        arrow.title = isEarnedOpen ? 'Collapse items' : 'Expand items';
      }
    });
  }

  // Delegated listener on stable parent — survives innerHTML re-renders of pill/list children
  if (!mountEl._earnedCatListenerBound) {
    mountEl._earnedCatListenerBound = true;
    mountEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.dash-earned-cat-btn');
      if (!btn) return;
      const targetCat = btn.getAttribute('data-cat');
      if (!targetCat || targetCat === currentEarnedCategory) return;
      currentEarnedCategory = targetCat;
      const pillsContainer = mountEl.querySelector('#dash-earned-cat-pills');
      const listContainer = mountEl.querySelector('#dash-earned-items-list');
      if (pillsContainer) pillsContainer.innerHTML = getCategoryPillsHtml();
      if (listContainer) listContainer.innerHTML = getItemsListHtml();
    });
  }
}
