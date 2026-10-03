import { FLOWER_IMG_SMALL_HTML } from '../config/constants.js';

const SUNCHART_BASE = 'https://sun-chart.vercel.app';

// ── Item Categorization Mapping ───────────────────────────────────────────
export const ITEM_CATEGORIES = {
  crops: {
    key: 'crops',
    label: '🌾 Crops',
    items: [
      'Sunflower', 'Potato', 'Rhubarb', 'Pumpkin', 'Zucchini', 'Carrot', 'Yam',
      'Cabbage', 'Broccoli', 'Soybean', 'Beetroot', 'Pepper', 'Cauliflower',
      'Parsnip', 'Eggplant', 'Corn', 'Onion', 'Radish', 'Wheat', 'Turnip',
      'Kale', 'Artichoke', 'Barley', 'Rice', 'Grape', 'Olive'
    ]
  },
  fruits: {
    key: 'fruits',
    label: '🍎 Fruits',
    items: ['Tomato', 'Lemon', 'Blueberry', 'Orange', 'Apple', 'Banana']
  },
  resources: {
    key: 'resources',
    label: '🪨 Minerals & Resources',
    items: ['Wood', 'Stone', 'Iron', 'Gold', 'Crimstone', 'Salt', 'Obsidian', 'Sunstone']
  },
  animals: {
    key: 'animals',
    label: '🥚 Animals & Products',
    items: ['Egg', 'Honey', 'Leather', 'Wool', 'Merino Wool', 'Feather', 'Milk']
  },
  emblems: {
    key: 'emblems',
    label: '🛡️ Faction Emblems',
    items: ['Goblin Emblem', 'Bumpkin Emblem', 'Sunflorian Emblem', 'Nightshade Emblem']
  },
  bait: {
    key: 'bait',
    label: '🪱 Bait & Fish',
    items: ['Capsule Bait', 'Umbrella Bait', 'Crimson Baitfish']
  },
  exotics: {
    key: 'exotics',
    label: '✨ Exotics & Forage',
    items: [
      'Celestine', 'Lunara', 'Duskberry', 'Saltwort',
      'Ruffroot', 'Chewed Bone', 'Heart Leaf', 'Moonfur', 'Ribbon', 'Dewberry',
      'Wild Grass', 'Frost Pebble'
    ]
  }
};

// ── State ─────────────────────────────────────────────────────────────────
let marketData = null;
let lastMarketFetch = 0;
let selectedItem = 'Sunflower';
let selectedRange = '24h';
let activeCategory = 'all';
let activeMoversWindow = '24h';
let moversLimit = 'all'; // '5' | '10' | 'all'
let searchQuery = '';
let activeChart = null;
const historyCache = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────
export function getItemCategory(itemName) {
  const norm = String(itemName || '').toLowerCase().trim();
  for (const [catKey, cat] of Object.entries(ITEM_CATEGORIES)) {
    if (cat.items.some(i => i.toLowerCase().trim() === norm)) {
      return catKey;
    }
  }
  return 'exotics';
}

function formatSflPrice(val) {
  const num = typeof val === 'number' ? val : parseFloat(val || 0);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';
  if (num < 0.001) return num.toFixed(6);
  if (num < 0.01) return num.toFixed(5);
  if (num < 1) return num.toFixed(4);
  return num.toFixed(3);
}

function formatChangePct(val) {
  const num = typeof val === 'number' ? val : parseFloat(val || 0);
  if (isNaN(num)) return '0.00%';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}

// ── API Fetchers ──────────────────────────────────────────────────────────
export async function fetchMarketData(force = false) {
  if (!force && marketData && (Date.now() - lastMarketFetch < 10 * 60 * 1000)) {
    return marketData;
  }
  try {
    const res = await fetch(`${SUNCHART_BASE}/api/market`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    marketData = json;
    lastMarketFetch = Date.now();
    return json;
  } catch (err) {
    console.warn("[MarketPanel] Error fetching market data:", err.message);
    return marketData;
  }
}

export async function fetchItemHistory(itemName, range = '24h', force = false) {
  const normKey = String(itemName || '').toLowerCase().trim();
  const cacheKey = `${normKey}_${range}`;
  const cached = historyCache.get(cacheKey);

  if (!force && cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    return cached.data;
  }

  try {
    const res = await fetch(`${SUNCHART_BASE}/api/history?item=${encodeURIComponent(normKey)}&range=${encodeURIComponent(range)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json) ? json : (json.data || []);
    historyCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.warn(`[MarketPanel] Error fetching history for ${itemName}:`, err.message);
    return cached ? cached.data : [];
  }
}

// ── Main Template ─────────────────────────────────────────────────────────
export function initMarketPanel() {
  const container = document.getElementById('market-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- HEADER / CONTROL BAR -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📈</span>
            <h2 class="text-base sm:text-lg font-black text-sfl-wood dark:text-amber-200 uppercase tracking-wider">
              Live Marketplace Trends
            </h2>
            <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live SunChart API
            </span>
          </div>
          <p class="text-xs text-sfl-woodLight dark:text-amber-300/80 font-medium">
            10-minute floor prices, market movers & interactive price charts
          </p>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <!-- Realtime Item Search -->
          <div class="relative flex-1 md:w-56">
            <input type="text" id="market-search-input" placeholder="🔍 Search item (e.g. Iron)..."
              class="w-full bg-white dark:bg-amber-950/60 border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl px-3 py-1.5 text-xs text-sfl-dirt dark:text-amber-100 focus:outline-none focus:border-amber-500 transition font-sans">
            <button id="market-search-clear" class="hidden absolute right-2 top-1.5 text-xs text-sfl-woodLight hover:text-sfl-dirt font-bold">✕</button>
          </div>

          <!-- Refresh Button -->
          <button id="market-refresh-btn" type="button"
            class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black px-3.5 py-1.5 rounded-xl border-2 border-amber-700 shadow-sm transition cursor-pointer flex items-center gap-1.5 text-xs uppercase shrink-0">
            <span id="market-refresh-icon">🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- MOVERS SECTION (Top Gainers & Losers) -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm space-y-3">
        <div class="flex flex-wrap justify-between items-center gap-2 border-b border-sfl-cardBorder/60 pb-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-sfl-wood dark:text-amber-200 uppercase tracking-wide">
              ⚡ Market Movers
            </span>
            <span id="market-last-updated" class="text-[10px] text-sfl-woodLight font-mono"></span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <!-- Window Toggle (24h / 12h) -->
            <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-amber-950/40 p-0.5 rounded-lg border border-sfl-cardBorder/60 text-[11px] font-bold">
              <button id="movers-window-24h" class="px-2.5 py-1 rounded-md transition cursor-pointer bg-sfl-wood text-amber-200 shadow-xs">
                24h Window
              </button>
              <button id="movers-window-12h" class="px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">
                12h Window
              </button>
            </div>

            <!-- Limit Toggle (Top 5 / Top 10 / All) -->
            <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-amber-950/40 p-0.5 rounded-lg border border-sfl-cardBorder/60 text-[11px] font-bold">
              <button id="movers-limit-5" class="px-2 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">Top 5</button>
              <button id="movers-limit-10" class="px-2 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">Top 10</button>
              <button id="movers-limit-all" class="px-2 py-1 rounded-md transition cursor-pointer bg-sfl-wood text-amber-200 shadow-xs">All</button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="market-movers-container">
          <!-- Rendered dynamically -->
          <div class="p-3 text-center text-xs text-sfl-woodLight italic">Loading market movers...</div>
        </div>
      </div>

      <!-- INTERACTIVE PRICE CHART SECTION -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm space-y-3">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-sfl-cardBorder/60 pb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📊</span>
            <div>
              <div class="flex items-center gap-2">
                <h3 id="chart-item-title" class="text-sm sm:text-base font-black text-sfl-wood dark:text-amber-200 uppercase">
                  Sunflower
                </h3>
                <span id="chart-item-price-badge" class="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                  0.000174 SFL
                </span>
                <span id="chart-item-change-badge" class="font-mono text-[11px] font-black px-2 py-0.5 rounded-md">
                  +0.00%
                </span>
              </div>
              <div id="chart-range-stats" class="text-[10px] text-sfl-woodLight font-mono flex items-center gap-2 pt-0.5">
                <span>Loading range data...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SEARCH OPTION & TIME RANGE SELECTOR DIRECTLY ABOVE GRAPH -->
        <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-1">
          <!-- Item Quick Search with Dropdown -->
          <div class="relative flex-1 sm:max-w-xs">
            <input type="text" id="chart-item-search-input" placeholder="🔍 Search item to chart (e.g. Iron, Wheat)..."
              class="w-full bg-white dark:bg-amber-950/60 border-2 border-sfl-cardBorder dark:border-amber-700/60 rounded-xl px-3 py-1.5 text-xs text-sfl-dirt dark:text-amber-100 focus:outline-none focus:border-amber-500 transition font-sans shadow-xs">
            <div id="chart-item-search-dropdown" class="hidden absolute left-0 right-0 top-full mt-1 bg-white dark:bg-amber-950 border-2 border-sfl-cardBorder dark:border-amber-700 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto p-1 space-y-0.5"></div>
          </div>

          <!-- Time Range Pill Selector -->
          <div class="flex items-center justify-end gap-1 bg-amber-100/70 dark:bg-amber-950/40 p-0.5 rounded-lg border border-sfl-cardBorder/60 text-[11px] font-bold shrink-0">
            <button data-range="24h" class="chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer bg-sfl-wood text-amber-200 shadow-xs">24h</button>
            <button data-range="7d" class="chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">7d</button>
            <button data-range="30d" class="chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">30d</button>
            <button data-range="90d" class="chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">90d</button>
            <button data-range="all" class="chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood">All</button>
          </div>
        </div>

        <!-- Canvas Container -->
        <div class="relative w-full h-64 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-2 border border-sfl-cardBorder/50">
          <div id="chart-loading-overlay" class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 rounded-xl z-10 transition-opacity">
            <span class="inline-flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
              <span class="animate-spin text-base">🔄</span> Fetching historical chart...
            </span>
          </div>
          <canvas id="market-price-chart" class="w-full h-full"></canvas>
        </div>
      </div>

      <!-- ALL ITEMS CATALOG & CATEGORIES -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm space-y-3">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span class="text-sm font-black text-sfl-wood dark:text-amber-200 uppercase tracking-wide">
            🏷️ Market Floor Prices by Category
          </span>
          <span id="market-items-count" class="text-xs text-sfl-woodLight font-mono">65 items</span>
        </div>

        <!-- Category Filter Tabs -->
        <div class="flex flex-wrap items-center gap-1.5 border-b border-sfl-cardBorder/60 pb-2" id="market-category-tabs">
          <button data-cat="all" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-sfl-wood text-amber-200 border-2 border-sfl-dirt shadow-xs">
            📦 All Items
          </button>
          <button data-cat="crops" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🌾 Crops
          </button>
          <button data-cat="fruits" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🍎 Fruits
          </button>
          <button data-cat="resources" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🪨 Resources
          </button>
          <button data-cat="animals" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🥚 Animals
          </button>
          <button data-cat="emblems" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🛡️ Emblems
          </button>
          <button data-cat="bait" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            🪱 Bait
          </button>
          <button data-cat="exotics" class="market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60">
            ✨ Exotics
          </button>
        </div>

        <!-- Categorized Grid / Table Mount -->
        <div id="market-items-grid" class="space-y-4">
          <div class="p-6 text-center text-xs text-sfl-woodLight italic">Loading floor prices...</div>
        </div>
      </div>
    </div>
  `;

  bindMarketEvents();
}

// ── Event Bindings ────────────────────────────────────────────────────────
function bindMarketEvents() {
  // Refresh button
  const refreshBtn = document.getElementById('market-refresh-btn');
  refreshBtn?.addEventListener('click', async () => {
    const icon = document.getElementById('market-refresh-icon');
    if (icon) icon.classList.add('animate-spin');
    await mountMarketPanel(true);
    if (icon) icon.classList.remove('animate-spin');
  });

  // Search input
  const searchInput = document.getElementById('market-search-input');
  const searchClear = document.getElementById('market-search-clear');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').trim().toLowerCase();
    if (searchClear) {
      if (searchQuery) searchClear.classList.remove('hidden');
      else searchClear.classList.add('hidden');
    }
    renderItemsGrid();
  });

  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    searchClear.classList.add('hidden');
    renderItemsGrid();
  });

  // Movers window toggle
  document.getElementById('movers-window-24h')?.addEventListener('click', () => {
    activeMoversWindow = '24h';
    updateMoversWindowButtons();
    renderMovers();
  });
  document.getElementById('movers-window-12h')?.addEventListener('click', () => {
    activeMoversWindow = '12h';
    updateMoversWindowButtons();
    renderMovers();
  });

  // Movers limit toggle
  ['5', '10', 'all'].forEach(lim => {
    document.getElementById(`movers-limit-${lim}`)?.addEventListener('click', () => {
      moversLimit = lim;
      updateMoversLimitButtons();
      renderMovers();
    });
  });

  // Dedicated Quick Search above the Graph
  const chartSearch = document.getElementById('chart-item-search-input');
  const chartDropdown = document.getElementById('chart-item-search-dropdown');

  function renderChartSearchDropdown(filter = '') {
    if (!chartDropdown || !marketData) return;
    const rawPrices = marketData.prices || [];
    const q = filter.toLowerCase().trim();
    const matches = rawPrices.filter(p => p.name.toLowerCase().includes(q));

    if (matches.length === 0) {
      chartDropdown.innerHTML = `<div class="p-2 text-center text-xs text-sfl-woodLight italic">No items match "${filter}"</div>`;
      chartDropdown.classList.remove('hidden');
      return;
    }

    chartDropdown.innerHTML = matches.map(item => `
      <div data-chart-item="${item.name}" class="chart-dropdown-row flex items-center justify-between p-2 rounded-lg hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition cursor-pointer text-xs">
        <span class="font-bold text-sfl-dirt dark:text-amber-100">${item.name}</span>
        <span class="font-mono font-semibold text-amber-800 dark:text-amber-300">${formatSflPrice(item.price)} 🌸</span>
      </div>
    `).join('');

    chartDropdown.querySelectorAll('.chart-dropdown-row').forEach(row => {
      row.addEventListener('click', () => {
        const name = row.getAttribute('data-chart-item');
        if (name) {
          selectItemForChart(name);
          if (chartSearch) chartSearch.value = name;
          chartDropdown.classList.add('hidden');
        }
      });
    });

    chartDropdown.classList.remove('hidden');
  }

  chartSearch?.addEventListener('focus', () => {
    renderChartSearchDropdown(chartSearch.value);
  });

  chartSearch?.addEventListener('input', (e) => {
    renderChartSearchDropdown(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (chartDropdown && !chartDropdown.contains(e.target) && e.target !== chartSearch) {
      chartDropdown.classList.add('hidden');
    }
  });

  // Range pill buttons
  document.querySelectorAll('.chart-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.getAttribute('data-range');
      if (range && range !== selectedRange) {
        selectedRange = range;
        updateRangeButtons();
        updateChartForItem(selectedItem, selectedRange);
      }
    });
  });

  // Category buttons
  document.querySelectorAll('.market-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      if (cat) {
        activeCategory = cat;
        updateCategoryButtons();
        renderItemsGrid();
      }
    });
  });
}

function updateMoversLimitButtons() {
  ['5', '10', 'all'].forEach(lim => {
    const btn = document.getElementById(`movers-limit-${lim}`);
    if (btn) {
      if (moversLimit === lim) {
        btn.className = "px-2 py-1 rounded-md transition cursor-pointer bg-sfl-wood text-amber-200 shadow-xs";
      } else {
        btn.className = "px-2 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood";
      }
    }
  });
}

function updateMoversWindowButtons() {
  const btn24 = document.getElementById('movers-window-24h');
  const btn12 = document.getElementById('movers-window-12h');
  if (activeMoversWindow === '24h') {
    btn24?.classList.add('bg-sfl-wood', 'text-amber-200', 'shadow-xs');
    btn24?.classList.remove('text-sfl-woodLight');
    btn12?.classList.remove('bg-sfl-wood', 'text-amber-200', 'shadow-xs');
    btn12?.classList.add('text-sfl-woodLight');
  } else {
    btn12?.classList.add('bg-sfl-wood', 'text-amber-200', 'shadow-xs');
    btn12?.classList.remove('text-sfl-woodLight');
    btn24?.classList.remove('bg-sfl-wood', 'text-amber-200', 'shadow-xs');
    btn24?.classList.add('text-sfl-woodLight');
  }
}

function updateRangeButtons() {
  document.querySelectorAll('.chart-range-btn').forEach(btn => {
    const r = btn.getAttribute('data-range');
    if (r === selectedRange) {
      btn.className = "chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer bg-sfl-wood text-amber-200 shadow-xs";
    } else {
      btn.className = "chart-range-btn px-2.5 py-1 rounded-md transition cursor-pointer text-sfl-woodLight hover:text-sfl-wood";
    }
  });
}

function updateCategoryButtons() {
  document.querySelectorAll('.market-cat-btn').forEach(btn => {
    const c = btn.getAttribute('data-cat');
    if (c === activeCategory) {
      btn.className = "market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-sfl-wood text-amber-200 border-2 border-sfl-dirt shadow-xs";
    } else {
      btn.className = "market-cat-btn px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/60 text-sfl-woodLight border-2 border-transparent hover:bg-amber-200/60";
    }
  });
}

// ── Render Movers ─────────────────────────────────────────────────────────
function renderMovers() {
  const container = document.getElementById('market-movers-container');
  if (!container || !marketData) return;

  const windowData = marketData.movers?.[activeMoversWindow] || marketData.movers || {};
  const gainers = windowData.gainers || [];
  const losers = windowData.losers || [];

  const limit = moversLimit === 'all' ? gainers.length : (parseInt(moversLimit, 10) || 10);
  const displayGainers = gainers.slice(0, limit);
  const displayLosers = losers.slice(0, limit);

  container.innerHTML = `
    <!-- TOP GAINERS -->
    <div class="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 space-y-2">
      <div class="flex items-center justify-between text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
        <span class="flex items-center gap-1.5"><span>🚀</span> Top Gainers (${activeMoversWindow})</span>
        <span class="text-[10px] font-mono">${displayGainers.length} of ${gainers.length} tracked</span>
      </div>
      <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        ${displayGainers.map(item => `
          <div data-item="${item.name}" class="market-mover-row flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-emerald-950/40 border border-emerald-200/60 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition cursor-pointer select-none">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100">${item.name}</span>
            </div>
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="text-sfl-woodLight font-semibold">${formatSflPrice(item.price)} 🌸</span>
              <span class="px-1.5 py-0.5 rounded text-[11px] font-black bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                ${formatChangePct(item.changePct)}
              </span>
            </div>
          </div>
        `).join('')}
        ${displayGainers.length === 0 ? `<div class="p-2 text-center text-xs text-sfl-woodLight italic">No positive movers recorded.</div>` : ''}
      </div>
    </div>

    <!-- TOP LOSERS -->
    <div class="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 space-y-2">
      <div class="flex items-center justify-between text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wide">
        <span class="flex items-center gap-1.5"><span>📉</span> Top Dips (${activeMoversWindow})</span>
        <span class="text-[10px] font-mono">${displayLosers.length} of ${losers.length} tracked</span>
      </div>
      <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        ${displayLosers.map(item => `
          <div data-item="${item.name}" class="market-mover-row flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-rose-950/40 border border-rose-200/60 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition cursor-pointer select-none">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100">${item.name}</span>
            </div>
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="text-sfl-woodLight font-semibold">${formatSflPrice(item.price)} 🌸</span>
              <span class="px-1.5 py-0.5 rounded text-[11px] font-black bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300">
                ${formatChangePct(item.changePct)}
              </span>
            </div>
          </div>
        `).join('')}
        ${displayLosers.length === 0 ? `<div class="p-2 text-center text-xs text-sfl-woodLight italic">No negative movers recorded.</div>` : ''}
      </div>
    </div>
  `;

  // Attach click to select item
  container.querySelectorAll('.market-mover-row').forEach(row => {
    row.addEventListener('click', () => {
      const name = row.getAttribute('data-item');
      if (name) {
        selectItemForChart(name);
      }
    });
  });
}

// ── Render Items Grid by Category ─────────────────────────────────────────
function renderItemsGrid() {
  const container = document.getElementById('market-items-grid');
  if (!container || !marketData) return;

  const rawPrices = marketData.prices || [];
  const changes24h = marketData.movers?.['24h']?.changesMap || {};

  // Build items array with current price and 24h change
  const items = rawPrices.map(p => {
    const norm = (p.name || '').toLowerCase().trim();
    const changeObj = changes24h[norm];
    return {
      name: p.name,
      price: p.price,
      changePct: changeObj ? changeObj.changePct : 0,
      changeAmt: changeObj ? changeObj.changeAmt : 0,
      category: getItemCategory(p.name)
    };
  });

  // Filter by search query
  let filtered = items;
  if (searchQuery) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQuery));
  }

  // Update total count
  const countEl = document.getElementById('market-items-count');
  if (countEl) countEl.textContent = `${filtered.length} of ${items.length} items`;

  // Group by category
  let categoriesToRender = [];
  if (activeCategory === 'all') {
    categoriesToRender = Object.keys(ITEM_CATEGORIES);
  } else {
    categoriesToRender = [activeCategory];
  }

  let html = '';

  for (const catKey of categoriesToRender) {
    const catMeta = ITEM_CATEGORIES[catKey] || { label: '✨ Other' };
    const catItems = filtered.filter(i => i.category === catKey);

    if (catItems.length === 0) continue;

    html += `
      <div class="space-y-2">
        <div class="flex items-center gap-2 border-b border-sfl-cardBorder/50 pb-1">
          <span class="text-xs font-black text-sfl-wood dark:text-amber-200 uppercase tracking-wide">
            ${catMeta.label}
          </span>
          <span class="text-[10px] text-sfl-woodLight font-mono">(${catItems.length})</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          ${catItems.map(item => {
            const isSelected = item.name.toLowerCase() === selectedItem.toLowerCase();
            const isPositive = item.changePct > 0;
            const isNegative = item.changePct < 0;
            const changeColor = isPositive ? 'text-emerald-600 dark:text-emerald-400' : (isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-sfl-woodLight');
            const badgeBg = isPositive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' : (isNegative ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300' : 'bg-amber-100/60 text-sfl-woodLight border-sfl-cardBorder/60');

            return `
              <div data-item="${item.name}" class="market-item-card p-3 rounded-xl transition cursor-pointer select-none border-2 flex items-center justify-between ${isSelected ? 'bg-amber-100/90 dark:bg-amber-900/40 border-amber-500 shadow-md ring-2 ring-amber-400/40' : 'bg-white/80 dark:bg-amber-950/30 border-sfl-cardBorder hover:border-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-900/20'}">
                <div class="space-y-0.5">
                  <div class="font-bold text-xs text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
                    <span>${item.name}</span>
                    ${isSelected ? `<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-amber-950 font-black">ACTIVE</span>` : ''}
                  </div>
                  <div class="text-[10px] text-sfl-woodLight">
                    24h: <span class="font-mono font-bold ${changeColor}">${formatChangePct(item.changePct)}</span>
                  </div>
                </div>

                <div class="text-right space-y-0.5">
                  <div class="font-mono font-black text-xs text-amber-800 dark:text-amber-300 flex items-center justify-end gap-1">
                    <span>${formatSflPrice(item.price)}</span>
                    <span class="text-xs">🌸</span>
                  </div>
                  <button class="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 underline hover:text-amber-900">
                    View Chart ↗
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (!html) {
    html = `<div class="p-8 text-center text-xs text-sfl-woodLight italic">No items match your filter "${searchQuery}".</div>`;
  }

  container.innerHTML = html;

  // Bind clicks to select item for chart
  container.querySelectorAll('.market-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.getAttribute('data-item');
      if (name) {
        selectItemForChart(name);
      }
    });
  });
}

// ── Select Item & Update Chart ────────────────────────────────────────────
export function selectItemForChart(itemName) {
  if (!itemName) return;
  selectedItem = itemName;

  // Highlight in items grid
  renderItemsGrid();

  // Scroll smoothly to chart on mobile/small screens if needed
  const chartTitle = document.getElementById('chart-item-title');
  if (chartTitle && window.innerWidth < 768) {
    chartTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  updateChartForItem(selectedItem, selectedRange);
}

async function updateChartForItem(itemName, range = '24h') {
  const titleEl = document.getElementById('chart-item-title');
  const priceBadge = document.getElementById('chart-item-price-badge');
  const changeBadge = document.getElementById('chart-item-change-badge');
  const rangeStats = document.getElementById('chart-range-stats');
  const overlay = document.getElementById('chart-loading-overlay');

  if (titleEl) titleEl.textContent = itemName;

  // Set current price and 24h change from marketData if available
  const norm = itemName.toLowerCase().trim();
  const currentPriceObj = marketData?.prices?.find(p => p.name.toLowerCase().trim() === norm);
  const change24hObj = marketData?.movers?.['24h']?.changesMap?.[norm];

  if (priceBadge && currentPriceObj) {
    priceBadge.innerHTML = `${formatSflPrice(currentPriceObj.price)} SFL 🌸`;
  }

  if (changeBadge) {
    if (change24hObj) {
      const isPos = change24hObj.changePct > 0;
      const isNeg = change24hObj.changePct < 0;
      changeBadge.textContent = formatChangePct(change24hObj.changePct);
      changeBadge.className = `font-mono text-[11px] font-black px-2 py-0.5 rounded-md border ${isPos ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' : (isNeg ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300' : 'bg-amber-100/60 text-sfl-woodLight border-sfl-cardBorder/60')}`;
    } else {
      changeBadge.textContent = '0.00%';
      changeBadge.className = 'font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-100/60 text-sfl-woodLight border border-sfl-cardBorder/60';
    }
  }

  if (overlay) overlay.classList.remove('hidden', 'opacity-0');

  const history = await fetchItemHistory(itemName, range);

  if (overlay) overlay.classList.add('hidden', 'opacity-0');

  // Compute stats for range
  if (Array.isArray(history) && history.length > 0) {
    const prices = history.map(d => typeof d.price === 'number' ? d.price : parseFloat(d.price || 0)).filter(p => !isNaN(p) && p > 0);
    if (prices.length > 0) {
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      if (rangeStats) {
        rangeStats.innerHTML = `
          <span>Range: <strong class="text-sfl-dirt dark:text-amber-200">${range.toUpperCase()}</strong></span>
          <span>•</span>
          <span>Low: <strong class="text-emerald-600 dark:text-emerald-400">${formatSflPrice(minP)}</strong></span>
          <span>•</span>
          <span>High: <strong class="text-rose-600 dark:text-rose-400">${formatSflPrice(maxP)}</strong></span>
          <span>•</span>
          <span>Avg: <strong class="text-amber-700 dark:text-amber-300">${formatSflPrice(avgP)}</strong></span>
        `;
      }
    }
  } else {
    if (rangeStats) {
      rangeStats.innerHTML = `<span class="italic text-rose-500">No history data available for this range.</span>`;
    }
  }

  renderChartCanvas(history, itemName, range);
}

// ── Chart.js Renderer ─────────────────────────────────────────────────────
function renderChartCanvas(historyData, itemName, range) {
  const canvas = document.getElementById('market-price-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }

  if (!Array.isArray(historyData) || historyData.length === 0) {
    return;
  }

  const ctx = canvas.getContext('2d');

  // Format timestamps nicely depending on range
  const labels = historyData.map(d => {
    const dt = new Date(d.recorded_at);
    if (range === '24h') {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  const prices = historyData.map(d => parseFloat(d.price || 0));

  // Determine gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(242, 169, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(242, 169, 0, 0.01)');

  const isDarkMode = document.documentElement.classList.contains('dark');
  const gridColor = isDarkMode ? 'rgba(242, 169, 0, 0.10)' : 'rgba(196, 154, 108, 0.18)';
  const tickColor = isDarkMode ? '#fde68a' : '#8a5832';

  activeChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${itemName} (SFL)`,
        data: prices,
        borderColor: '#f2a900',
        borderWidth: 2.2,
        backgroundColor: gradient,
        tension: 0.25,
        fill: true,
        pointRadius: historyData.length > 80 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#f2a900',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(43, 30, 23, 0.95)' : 'rgba(255, 243, 219, 0.98)',
          titleColor: isDarkMode ? '#fde68a' : '#2b1e17',
          bodyColor: isDarkMode ? '#fef3c7' : '#633d1f',
          borderColor: '#f2a900',
          borderWidth: 1.5,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const rawObj = historyData[items[0].dataIndex];
              if (rawObj?.recorded_at) {
                const dt = new Date(rawObj.recorded_at);
                return dt.toLocaleString();
              }
              return items[0].label;
            },
            label: (item) => {
              const val = parseFloat(item.raw);
              return `🌸 Floor Price: ${formatSflPrice(val)} SFL`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { family: 'monospace', size: 9 },
            maxTicksLimit: 7,
            maxRotation: 0
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { family: 'monospace', size: 9.5 },
            callback: (v) => formatSflPrice(v)
          }
        }
      }
    }
  });
}

// ── Mount Panel ───────────────────────────────────────────────────────────
export async function mountMarketPanel(force = false) {
  const container = document.getElementById('market-section');
  if (!container) return;

  const data = await fetchMarketData(force);
  if (!data) return;

  const lastUpdatedEl = document.getElementById('market-last-updated');
  if (lastUpdatedEl) {
    const now = new Date();
    lastUpdatedEl.textContent = `Updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }

  renderMovers();
  renderItemsGrid();
  updateChartForItem(selectedItem, selectedRange);
}
