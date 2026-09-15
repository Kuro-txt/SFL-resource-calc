import { FLOWER_IMG_SMALL_HTML, RESOURCE_FLOWER_FALLBACK_PRICES, isAllowedDifferenceItem, ALLOWED_ITEM_NAMES, getCoinFlowerRatio } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';
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
    : getDateRangeBounds(boundsInput || 'week');

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
        if (!isAllowedDifferenceItem(clean)) return;

        const name = ALLOWED_ITEM_NAMES[clean] || rawName;
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

      // Include Coins earned as a resource
      const rawActs = Array.isArray(e.cropActivityYields) ? e.cropActivityYields
        : (Array.isArray(e.crop_activity_yields) ? e.crop_activity_yields : []);
      const coinObj = rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) || e.coins;
      const coinsEarned = parseFloat(coinObj?.coinsEarned || coinObj?.earned || 0);

      if (coinsEarned > 0) {
        const ratio = getCoinFlowerRatio();
        const coinFlowers = parseFloat((coinsEarned / ratio).toFixed(3));
        items['Coins'] = { qty: Math.round(coinsEarned), flowers: coinFlowers };
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
    Object.entries(r.items).forEach(([name, { qty, flowers }]) => {
      if (!totals[name]) totals[name] = { qty: 0, flowers: 0 };
      totals[name].qty += qty;
      totals[name].flowers += flowers;
    });
  });
  return totals;
}

// ─── Render ───────────────────────────────────────────────────────────────────

let currentEarnedCategory = 'all';

export function renderEarnedSection(mountEl, boundsInput = 'week') {
  if (!mountEl) return;

  const bounds = (typeof boundsInput === 'object' && boundsInput?.label)
    ? boundsInput
    : getDateRangeBounds(boundsInput || 'week');

  const totals = aggregateLocalEarned(bounds);
  const grandFlowers = Object.values(totals).reduce((s, v) => s + v.flowers, 0);
  const totalItemsCount = Object.values(totals).reduce((s, v) => s + v.qty, 0);

  // Extract Coins for dedicated prominent card
  const coinsData = totals['Coins'] || null;

  // Classify all other items
  const nonCoinItems = Object.entries(totals)
    .filter(([name]) => name !== 'Coins')
    .map(([name, { qty, flowers }]) => ({
      name,
      qty,
      flowers: parseFloat(flowers.toFixed(3)),
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
      <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
        <div>
          <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
            <span>🌾</span> Resources & Coins Earned
          </h4>
          <p class="text-[10px] text-sfl-woodLight">${rangeLabel}</p>
        </div>
        <div class="text-right">
          <span class="font-mono text-sm font-bold text-sfl-green bg-green-100/80 dark:bg-green-950/40 border border-green-300 dark:border-green-800 px-2 py-0.5 rounded-lg shadow-2xs">
            0.000 🌸
          </span>
        </div>
      </div>
      <div class="text-center py-8 px-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
        <span class="text-2xl mb-1 block">🚜</span>
        <p class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Harvests in ${rangeLabel}</p>
        <p class="text-[11px] text-sfl-woodLight mt-1">Navigate days with ◀ / ▶ or sync inventory data.</p>
      </div>`;
    return;
  }

  function getItemsListHtml() {
    const visibleItems = currentEarnedCategory === 'all'
      ? nonCoinItems
      : nonCoinItems.filter(i => i.category === currentEarnedCategory);

    if (visibleItems.length === 0) {
      return `
        <div class="text-center py-6 px-3 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-200/40 dark:border-amber-800/30">
          <p class="text-xs font-semibold text-sfl-woodLight">No ${CATEGORY_META[currentEarnedCategory]?.label || 'items'} recorded in this timeframe.</p>
        </div>`;
    }

    const maxFlowers = visibleItems[0]?.flowers || 1;

    return visibleItems.map(({ name, qty, flowers, category }) => {
      const pct = Math.min(100, Math.max(8, Math.round((flowers / maxFlowers) * 100)));
      const icon = getItemIcon(name);
      const catMeta = CATEGORY_META[category] || { label: category, icon: '🌾' };
      const formattedQty = qty % 1 === 0 ? qty.toLocaleString() : qty.toFixed(1);

      return `
        <div class="group flex items-center gap-2.5 text-xs py-1.5 hover:bg-emerald-100/40 dark:hover:bg-emerald-950/30 px-2 rounded-lg transition border border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-800/40">
          <span class="text-base shrink-0">${icon}</span>
          <div class="w-24 sm:w-28 truncate shrink-0">
            <span class="font-bold text-sfl-dirt dark:text-amber-100" title="${name}">${name}</span>
            <span class="block text-[9px] text-sfl-woodLight font-medium">${catMeta.label}</span>
          </div>
          <div class="flex-1 bg-amber-200/60 dark:bg-amber-900/40 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <div class="text-right shrink-0 font-mono">
            <span class="font-bold text-sfl-dirt dark:text-amber-100">+${formattedQty}</span>
            <span class="text-sfl-green text-[11px] ml-1 font-semibold">(${flowers.toFixed(3)} 🌸)</span>
          </div>
        </div>`;
    }).join('');
  }

  function getCoinsBannerHtml() {
    if (!coinsData || coinsData.qty <= 0) return '';
    const ratio = getCoinFlowerRatio();
    return `
      <div class="bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 dark:from-yellow-950/50 dark:to-amber-950/40 border border-yellow-500/40 dark:border-yellow-600/50 p-2.5 rounded-xl flex items-center justify-between shadow-2xs mb-2.5">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <div>
            <p class="text-[10px] font-bold uppercase text-yellow-800 dark:text-yellow-300 tracking-wider">Coins Earned</p>
            <p class="font-mono text-sm font-bold text-yellow-900 dark:text-yellow-100">+${Math.round(coinsData.qty).toLocaleString()} Coins</p>
          </div>
        </div>
        <div class="text-right">
          <span class="font-mono text-xs font-bold text-sfl-green dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs">
            +${coinsData.flowers.toFixed(3)} 🌸
          </span>
          <p class="text-[9px] text-sfl-woodLight font-mono mt-0.5">1🌸 = ${ratio.toLocaleString()}🪙</p>
        </div>
      </div>`;
  }

  function getCategoryPillsHtml() {
    const pill = (cat, label, icon, count) => {
      const isActive = currentEarnedCategory === cat;
      const activeClass = isActive
        ? 'bg-emerald-600 text-white shadow-xs'
        : 'bg-amber-100/90 dark:bg-amber-900/40 text-sfl-wood dark:text-amber-200 hover:bg-amber-200/80 dark:hover:bg-amber-800/60';
      return `
        <button data-cat="${cat}" class="dash-earned-cat-btn px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1 ${activeClass}">
          <span>${icon}</span>
          <span>${label}</span>
          <span class="opacity-75 text-[10px]">(${count})</span>
        </button>`;
    };

    return `
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5 text-xs font-bold scrollbar-none">
        ${pill('all', 'All', '🌟', counts.all)}
        ${pill('crops', 'Crops', '🌾', counts.crops)}
        ${pill('resources', 'Resources', '🪵', counts.resources)}
        ${pill('animals', 'Animals', '🥚', counts.animals)}
        ${pill('special', 'Special', '🎁', counts.special)}
      </div>`;
  }

  mountEl.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
      <div>
        <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>🌾</span> Resources & Coins Earned
        </h4>
        <p class="text-[10px] text-sfl-woodLight">${rangeLabel} • ${totalItemsCount.toFixed(0)} items produced</p>
      </div>
      <div class="text-right">
        <span class="font-mono text-sm font-bold text-sfl-green bg-green-100/80 dark:bg-green-950/40 border border-green-300 dark:border-green-800 px-2 py-0.5 rounded-lg shadow-2xs">
          ${grandFlowers.toFixed(3)} 🌸
        </span>
      </div>
    </div>

    <!-- Featured Coins Earned Card -->
    ${getCoinsBannerHtml()}

    <!-- Section Title & Category Filter Pills -->
    <div class="mb-1">
      <div class="flex items-center justify-between mb-1.5">
        <h5 class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
          <span>📊</span> Item Breakdown
        </h5>
        <span class="text-[10px] font-bold text-sfl-woodLight bg-amber-200/50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          ${nonCoinItems.length + (coinsData ? 1 : 0)} items & coins
        </span>
      </div>
      <div id="dash-earned-cat-pills">${getCategoryPillsHtml()}</div>
    </div>

    <!-- Item Breakdown Content List -->
    <div id="dash-earned-items-list" class="max-h-80 overflow-y-auto pr-1 space-y-1">
      ${getItemsListHtml()}
    </div>`;

  // Attach Category Filter Listeners
  mountEl.querySelectorAll('.dash-earned-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetCat = btn.getAttribute('data-cat');
      if (!targetCat || targetCat === currentEarnedCategory) return;
      currentEarnedCategory = targetCat;
      const pillsContainer = mountEl.querySelector('#dash-earned-cat-pills');
      const listContainer = mountEl.querySelector('#dash-earned-items-list');
      if (pillsContainer) pillsContainer.innerHTML = getCategoryPillsHtml();
      if (listContainer) listContainer.innerHTML = getItemsListHtml();
      // Re-attach listeners to refreshed pills
      mountEl.querySelectorAll('.dash-earned-cat-btn').forEach(b => {
        b.addEventListener('click', () => {
          currentEarnedCategory = b.getAttribute('data-cat');
          renderEarnedSection(mountEl, boundsInput);
        });
      });
    });
  });
}
