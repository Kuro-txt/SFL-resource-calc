import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML } from '../config/constants.js';
import { getItemNameById } from '../data/knownIds.js';
import { roundUpToThreeDecimals } from '../utils/formatters.js';
import { ApiService } from '../services/api.js';

let tradeHistoryData = null;
let currentView = 'trades'; // 'trades' | 'calendar' | 'listings' | 'offers'
let currentFilter = 'all'; // 'all' | 'sold' | 'bought'
let searchQuery = '';
let cloudArchivedCount = 0;

// Calendar State
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let calendarViewMode = 'month'; // 'month' | '3month' | 'week'
let selectedCalendarDateKey = null; // 'YYYY-MM-DD'

export function renderTradeHistoryTemplate() {
  const container = document.getElementById('trade-history-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>📜</span> Marketplace Trade History
          </h3>
          <p id="trade-user-summary" class="text-[11px] text-sfl-woodLight font-semibold">
            tracks completed sales, purchases, interactive calendar & active listings
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button id="export-trades-csv-btn" class="bg-amber-100/90 text-sfl-dirt px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-cardBorder hover:bg-amber-200 transition cursor-pointer flex items-center gap-1.5 shadow-xs">
            📥 Export CSV
          </button>
          <button id="refresh-trade-history-btn" class="bg-sfl-wood text-amber-200 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1.5 shadow-xs">
            🔄 Refresh Profile
          </button>
        </div>
      </div>

      <!-- METRIC CARDS (TOTAL STATS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3.5 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🟢 Total Sales Volume</span>
          <span id="trade-metric-sales-volume" class="text-base sm:text-lg font-black text-sfl-green font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3.5 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🔵 Total Purchases Volume</span>
          <span id="trade-metric-buys-volume" class="text-base sm:text-lg font-black text-sfl-wood font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3.5 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">💸 Weekly Flower Spent</span>
          <span id="trade-metric-weekly-spent" class="text-base sm:text-lg font-black text-sfl-accent font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3.5 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">☁️ Trades Saved in Cloud</span>
          <span id="trade-metric-total-trades" class="text-base sm:text-lg font-black text-sfl-dirt font-mono">0</span>
        </div>
      </div>

      <!-- NAVIGATION SUB-TABS (TRADES / CALENDAR / LISTINGS / OFFERS) -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-sfl-cardBorder pb-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button id="subtab-trades-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-sfl-dirt bg-sfl-wood text-amber-200 shadow-xs">
            📜 Trade History (<span id="subtab-trades-count">0</span>)
          </button>
          <button id="subtab-calendar-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            📅 Trade Calendar
          </button>
          <button id="subtab-listings-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            🏷️ Active Listings (<span id="subtab-listings-count">0</span>)
          </button>
          <button id="subtab-offers-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            🎯 Open Offers (<span id="subtab-offers-count">0</span>)
          </button>
        </div>

        <div id="trade-search-container" class="relative w-full sm:w-60">
          <input type="text" id="trade-search-input" placeholder="🔍 Search item name or user..." 
            class="w-full sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
        </div>
      </div>

      <!-- FILTER CONTROLS FOR TRADES VIEW (SOLD / BOUGHT) -->
      <div id="trade-filters-bar" class="flex items-center gap-1.5">
        <button id="trade-filter-all" class="trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs">
          All
        </button>
        <button id="trade-filter-sold" class="trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50">
          🟢 Sold (Sales)
        </button>
        <button id="trade-filter-bought" class="trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50">
          🔵 Bought (Purchases)
        </button>
      </div>

      <!-- MAIN DATA CONTAINER -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-sm">
        <div class="bg-sfl-wood text-amber-200 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-sfl-dirt flex justify-between items-center">
          <span id="trade-table-title">📜 Completed Trade Transactions</span>
          <span id="trade-history-status" class="text-[11px] text-amber-300 font-mono">Ready</span>
        </div>

        <div id="trade-content-mount" class="overflow-x-auto">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
              <tr>
                <th class="px-3 py-2.5">Date & Time</th>
                <th class="px-2 py-2.5">Type</th>
                <th class="px-3 py-2.5">Item Name</th>
                <th class="px-2 py-2.5">Quantity</th>
                <th class="px-2 py-2.5">Unit Price</th>
                <th class="px-3 py-2.5">Counterparty</th>
                <th class="px-3 py-2.5 text-right">Total SFL</th>
              </tr>
            </thead>
            <tbody id="trade-history-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">
                  Click 'Refresh Profile' or 'Sync Farm' to load live marketplace activity & archive to TiDB Cloud.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function initTradeHistoryPanel() {
  renderTradeHistoryTemplate();

  document.getElementById('refresh-trade-history-btn')?.addEventListener('click', fetchMarketplaceTrades);
  document.getElementById('export-trades-csv-btn')?.addEventListener('click', exportTradesToCsv);

  document.getElementById('subtab-trades-btn')?.addEventListener('click', () => switchSubTab('trades'));
  document.getElementById('subtab-calendar-btn')?.addEventListener('click', () => switchSubTab('calendar'));
  document.getElementById('subtab-listings-btn')?.addEventListener('click', () => switchSubTab('listings'));
  document.getElementById('subtab-offers-btn')?.addEventListener('click', () => switchSubTab('offers'));

  document.getElementById('trade-filter-all')?.addEventListener('click', () => setTradeFilter('all'));
  document.getElementById('trade-filter-sold')?.addEventListener('click', () => setTradeFilter('sold'));
  document.getElementById('trade-filter-bought')?.addEventListener('click', () => setTradeFilter('bought'));

  const searchEl = document.getElementById('trade-search-input');
  searchEl?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCurrentView();
  });
}

function switchSubTab(tab) {
  currentView = tab;
  const subtabBtns = document.querySelectorAll('.trade-subtab-btn');
  subtabBtns.forEach(btn => {
    btn.className = "trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60";
  });

  const activeBtn = document.getElementById(`subtab-${tab}-btn`);
  if (activeBtn) {
    activeBtn.className = "trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-sfl-dirt bg-sfl-wood text-amber-200 shadow-xs";
  }

  const filterBar = document.getElementById('trade-filters-bar');
  if (filterBar) {
    if (tab === 'trades' || tab === 'calendar') filterBar.classList.remove('hidden');
    else filterBar.classList.add('hidden');
  }

  renderCurrentView();
}

function setTradeFilter(filter) {
  currentFilter = filter;
  const filterBtns = document.querySelectorAll('.trade-filter-btn');
  filterBtns.forEach(btn => {
    btn.className = "trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50";
  });

  const activeBtn = document.getElementById(`trade-filter-${filter}`);
  if (activeBtn) {
    activeBtn.className = "trade-filter-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs";
  }

  renderCurrentView();
}

export async function fetchMarketplaceTrades() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
  const statusEl = document.getElementById('trade-history-status');
  const mountEl = document.getElementById('trade-content-mount');

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Syncing marketplace & TiDB Cloud...";

  try {
    const data = await ApiService.getMarketplaceProfile(farmId, apiKey);
    tradeHistoryData = data;

    // Format trades for TiDB Cloud archiving
    const rawTrades = data.trades || [];
    const formattedForCloud = rawTrades.map(t => {
      const isSeller = isUserSeller(t, farmId);
      const itemName = getItemNameById(t.itemId);
      const otherUser = isSeller ? (t.fulfilledBy?.username || '') : (t.initiatedBy?.username || '');
      const otherId = isSeller ? (t.fulfilledBy?.id || null) : (t.initiatedBy?.id || null);

      return {
        id: t.id,
        farmId: farmId,
        itemId: t.itemId,
        itemName: itemName,
        quantity: parseFloat(t.quantity || 1),
        sfl: parseFloat(t.sfl || 0),
        tradeType: isSeller ? 'sold' : 'bought',
        source: t.source || 'listing',
        counterpartyId: otherId,
        counterpartyName: otherUser,
        fulfilledAt: t.fulfilledAt
      };
    });

    // 1. Sync live batch to TiDB Cloud
    try {
      const syncRes = await ApiService.syncTradesToCloud(farmId, formattedForCloud);
      if (syncRes?.totalArchivedTrades) {
        cloudArchivedCount = syncRes.totalArchivedTrades;
      }
    } catch (err) {
      console.warn("TiDB Cloud batch sync note:", err.message);
    }

    // 2. Fetch accumulated lifetime trades from TiDB Cloud
    try {
      const cloudRes = await ApiService.getCloudTrades(farmId);
      if (cloudRes?.trades && Array.isArray(cloudRes.trades) && cloudRes.trades.length > 0) {
        // Merge cloud historical trades with live trades
        const tradesMap = new Map();
        cloudRes.trades.forEach(t => tradesMap.set(t.id, t));
        formattedForCloud.forEach(t => tradesMap.set(t.id, t));

        tradeHistoryData.trades = Array.from(tradesMap.values()).sort((a, b) => (b.fulfilledAt || 0) - (a.fulfilledAt || 0));
        cloudArchivedCount = tradeHistoryData.trades.length;
      }
    } catch (err) {
      console.warn("TiDB Cloud fetch note:", err.message);
    }

    renderTradeSummaryMetrics(tradeHistoryData);
    renderCurrentView();
    if (statusEl) statusEl.textContent = `✅ Synced & Archived (${cloudArchivedCount || tradeHistoryData.trades?.length || 0} Total)`;
    return { success: true, count: cloudArchivedCount || tradeHistoryData.trades?.length || 0 };
  } catch (err) {
    const isAuthErr = err.message.includes('401') || err.message.toLowerCase().includes('api key');
    if (statusEl) statusEl.textContent = isAuthErr ? "⚠️ VIP Key Required" : `❌ Error: ${err.message}`;

    if (mountEl) {
      if (isAuthErr) {
        mountEl.innerHTML = `
          <div class="p-8 text-center text-sfl-dirt">
            <div class="max-w-md mx-auto bg-amber-50 border-2 border-amber-400 p-5 rounded-xl shadow-sm space-y-3">
              <div class="inline-block px-3 py-1 bg-amber-200 border border-amber-500 rounded-lg text-amber-950 font-bold text-xs">
                🔑 VIP Community API Key Required
              </div>
              <p class="text-xs text-sfl-wood font-medium leading-relaxed">
                Marketplace trading profile is powered by Sunflower Land's VIP Community API (Level 50+ VIP bumpkins).
              </p>
              <p class="text-[11px] text-sfl-woodLight">
                Please paste your API Key in the top header <strong>"API Key (Optional)"</strong> field to view live trades.
              </p>
              <a href="https://sunflower-land.com/community-docs" target="_blank" rel="noopener noreferrer" 
                class="inline-block text-xs font-bold text-amber-700 underline hover:text-amber-900">
                📖 How to get your SFL API Key ↗
              </a>
            </div>
          </div>
        `;
      } else {
        mountEl.innerHTML = `<div class="p-8 text-center text-sfl-accent italic font-semibold">❌ ${err.message}</div>`;
      }
    }
    return { success: false, error: err.message };
  }
}

function renderTradeSummaryMetrics(profileData) {
  if (!profileData) return;
  const user = profileData.username || `Farm #${profileData.id || ''}`;
  const level = profileData.level || '-';
  const totalTradesCount = profileData.totalTrades || 0;
  const weeklySpent = parseFloat(profileData.weeklyFlowerSpent || 0);

  const trades = profileData.trades || [];
  const listings = Object.values(profileData.listings || {});
  const offers = Object.values(profileData.offers || {});

  const farmId = String(profileData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  let totalSoldVolume = 0;
  let totalBoughtVolume = 0;

  trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    const sfl = parseFloat(t.sfl || 0);

    if (isSeller) {
      totalSoldVolume += sfl;
    } else {
      totalBoughtVolume += sfl;
    }
  });

  const userSummaryEl = document.getElementById('trade-user-summary');
  if (userSummaryEl) {
    userSummaryEl.textContent = `Player: ${user} • Level: ${level} • Lifetime Market Volume: ${totalTradesCount.toLocaleString()} trades`;
  }

  const salesVolEl = document.getElementById('trade-metric-sales-volume');
  const buysVolEl = document.getElementById('trade-metric-buys-volume');
  const weeklySpentEl = document.getElementById('trade-metric-weekly-spent');
  const totalTradesEl = document.getElementById('trade-metric-total-trades');

  if (salesVolEl) salesVolEl.innerHTML = `${totalSoldVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (buysVolEl) buysVolEl.innerHTML = `${totalBoughtVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (weeklySpentEl) weeklySpentEl.innerHTML = `${weeklySpent.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (totalTradesEl) totalTradesEl.textContent = `${trades.length.toLocaleString()}`;

  document.getElementById('subtab-trades-count').textContent = trades.length;
  document.getElementById('subtab-listings-count').textContent = listings.length;
  document.getElementById('subtab-offers-count').textContent = offers.length;
}

function isUserSeller(trade, myFarmId) {
  if (trade.tradeType) return trade.tradeType === 'sold';
  const initId = String(trade.initiatedBy?.id || trade.seller || '');
  const fulfId = String(trade.fulfilledBy?.id || trade.buyer || '');

  if (trade.source === 'listing') {
    return initId === myFarmId;
  } else if (trade.source === 'offer') {
    return fulfId === myFarmId;
  }
  return initId === myFarmId;
}

function renderCurrentView() {
  const mountEl = document.getElementById('trade-content-mount');
  const titleEl = document.getElementById('trade-table-title');
  if (!mountEl || !tradeHistoryData) return;

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  if (currentView === 'trades') {
    if (titleEl) titleEl.textContent = "📜 Completed Trade Ledger (Archived in TiDB Cloud)";
    renderTradesTableView(mountEl, farmId);
  } else if (currentView === 'calendar') {
    if (titleEl) titleEl.textContent = "📅 Trade Calendar Grid & Daily Net Profit";
    renderCalendarGridView(mountEl, farmId);
  } else if (currentView === 'listings') {
    if (titleEl) titleEl.textContent = "🏷️ Active Marketplace Listings";
    renderListingsView(mountEl);
  } else if (currentView === 'offers') {
    if (titleEl) titleEl.textContent = "🎯 Open Buy Offers";
    renderOffersView(mountEl);
  }
}

function renderTradesTableView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];

  let filtered = trades.filter(t => {
    const isSeller = isUserSeller(t, farmId);
    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && isSeller) return false;

    if (searchQuery) {
      const isEconomy = t.collection === 'economies' || Boolean(t.economy);
      const itemName = isEconomy ? `#${t.itemId}` : (t.itemName || getItemNameById(t.itemId)).toLowerCase();
      const otherUser = isSeller ? (t.counterpartyName || t.fulfilledBy?.username || '').toLowerCase() : (t.counterpartyName || t.initiatedBy?.username || '').toLowerCase();
      if (!itemName.includes(searchQuery) && !otherUser.includes(searchQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    mountEl.innerHTML = `
      <div class="p-8 text-center text-sfl-woodLight italic">
        No completed trades found matching your search and filter criteria.
      </div>
    `;
    return;
  }

  let rowsHtml = '';
  filtered.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
    const qty = parseFloat(t.quantity || 1);
    const sfl = parseFloat(t.sfl || 0);
    const unitPrice = qty > 0 ? (sfl / qty) : sfl;

    const rawDate = t.fulfilledAt;
    let dateStr = 'Recent';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(rawDate);
    }

    const otherUser = isSeller
      ? (t.counterpartyName || t.fulfilledBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Buyer'))
      : (t.counterpartyName || t.initiatedBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Seller'));

    const badge = isSeller
      ? `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 px-2 py-0.5 rounded text-[10px] font-bold">🟢 SOLD</span>`
      : `<span class="bg-blue-100 text-blue-800 border border-blue-400/40 px-2 py-0.5 rounded text-[10px] font-bold">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-2 py-2.5 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemName}</td>
        <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">${qty.toLocaleString()}</td>
        <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2.5 font-medium text-sfl-wood">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2.5 font-mono font-bold text-right ${isSeller ? 'text-sfl-green' : 'text-sfl-wood'}">
          ${isSeller ? '+' : '-'}${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
        </td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
        <tr>
          <th class="px-3 py-2.5">Date & Time</th>
          <th class="px-2 py-2.5">Type</th>
          <th class="px-3 py-2.5">Item Name</th>
          <th class="px-2 py-2.5">Quantity</th>
          <th class="px-2 py-2.5">Unit Price</th>
          <th class="px-3 py-2.5">Counterparty</th>
          <th class="px-3 py-2.5 text-right">Total SFL</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ----------------------------------------------------
// 📅 INTERACTIVE CALENDAR GRID & DAILY PROFIT INSPECTOR
// ----------------------------------------------------

function buildTradesDateMap(trades, farmId) {
  const map = new Map();

  trades.forEach(t => {
    if (!t.fulfilledAt) return;
    const d = new Date(t.fulfilledAt);
    if (isNaN(d.getTime())) return;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        year: yyyy,
        month: d.getMonth(),
        day: d.getDate(),
        dateObj: d,
        trades: [],
        totalSold: 0,
        totalBought: 0,
        soldCount: 0,
        boughtCount: 0
      });
    }

    const dayObj = map.get(dateKey);
    const isSeller = isUserSeller(t, farmId);
    const sfl = parseFloat(t.sfl || 0);
    const qty = parseFloat(t.quantity || 1);

    if (isSeller) {
      dayObj.totalSold += sfl;
      dayObj.soldCount += qty;
    } else {
      dayObj.totalBought += sfl;
      dayObj.boughtCount += qty;
    }

    dayObj.trades.push(t);
  });

  return map;
}

function renderCalendarGridView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];
  const tradesMap = buildTradesDateMap(trades, farmId);

  // If no day selected, pick most recent active trade date or today
  if (!selectedCalendarDateKey) {
    const sortedKeys = Array.from(tradesMap.keys()).sort().reverse();
    if (sortedKeys.length > 0) {
      selectedCalendarDateKey = sortedKeys[0];
      const recentDate = tradesMap.get(selectedCalendarDateKey)?.dateObj;
      if (recentDate) {
        calendarCurrentMonth = recentDate.getMonth();
        calendarCurrentYear = recentDate.getFullYear();
      }
    } else {
      const today = new Date();
      selectedCalendarDateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
  }

  // Header controls (Month Switcher, View Switcher: Month / 3 Months / Week)
  const monthName = new Date(calendarCurrentYear, calendarCurrentMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  let viewControlsHtml = `
    <div class="p-3.5 bg-amber-50/70 border-b-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
      <div class="flex items-center gap-2">
        <button id="cal-prev-month" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
          ◀ Prev
        </button>
        <span class="font-bold text-sfl-wood text-sm sm:text-base tracking-wide flex items-center gap-1.5 px-2">
          <span>📅</span> ${monthName}
        </span>
        <button id="cal-next-month" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
          Next ▶
        </button>
        <button id="cal-today-btn" class="bg-amber-200/70 border border-sfl-cardBorder hover:bg-amber-300 px-2 py-1 rounded-md text-[11px] font-bold text-sfl-dirt cursor-pointer transition ml-1">
          Today
        </button>
      </div>

      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs font-bold text-sfl-woodLight mr-1">View:</span>
        <button data-cal-view="month" class="cal-view-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${calendarViewMode === 'month' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📅 Month View
        </button>
        <button data-cal-view="3month" class="cal-view-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${calendarViewMode === '3month' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          🗓️ 3-Month Overview
        </button>
        <button data-cal-view="week" class="cal-view-btn px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${calendarViewMode === 'week' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📊 Week Strip
        </button>
      </div>
    </div>
  `;

  let gridContentHtml = '';

  if (calendarViewMode === 'month') {
    gridContentHtml = renderSingleMonthGrid(calendarCurrentYear, calendarCurrentMonth, tradesMap);
  } else if (calendarViewMode === '3month') {
    // Render 3 consecutive months
    const m1 = calendarCurrentMonth;
    const y1 = calendarCurrentYear;
    const m2 = (m1 - 1 + 12) % 12;
    const y2 = m1 === 0 ? y1 - 1 : y1;
    const m3 = (m1 - 2 + 12) % 12;
    const y3 = m1 < 2 ? y1 - 1 : y1;

    gridContentHtml = `
      <div class="p-3 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-xs bg-white/70">
            <div class="bg-sfl-card p-2 text-center font-bold text-xs text-sfl-wood uppercase border-b border-sfl-cardBorder">
              ${new Date(y3, m3, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            ${renderSingleMonthGrid(y3, m3, tradesMap, true)}
          </div>
          <div class="border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-xs bg-white/70">
            <div class="bg-sfl-card p-2 text-center font-bold text-xs text-sfl-wood uppercase border-b border-sfl-cardBorder">
              ${new Date(y2, m2, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            ${renderSingleMonthGrid(y2, m2, tradesMap, true)}
          </div>
          <div class="border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-xs bg-white/70">
            <div class="bg-sfl-card p-2 text-center font-bold text-xs text-sfl-wood uppercase border-b border-sfl-cardBorder">
              ${new Date(y1, m1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            ${renderSingleMonthGrid(y1, m1, tradesMap, true)}
          </div>
        </div>
      </div>
    `;
  } else if (calendarViewMode === 'week') {
    gridContentHtml = renderWeekStripView(tradesMap, farmId);
  }

  // Selected Day Breakdown Panel
  const selectedDayData = tradesMap.get(selectedCalendarDateKey) || null;
  const selectedDayPanelHtml = renderSelectedDayInspector(selectedCalendarDateKey, selectedDayData, farmId);

  mountEl.innerHTML = `
    ${viewControlsHtml}
    <div class="p-3">
      ${gridContentHtml}
    </div>
    ${selectedDayPanelHtml}
  `;

  bindCalendarGridEvents(mountEl, farmId);
}

function renderSingleMonthGrid(year, month, tradesMap, isCompact = false) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let headersHtml = dayHeaders.map(d => `<div class="text-center font-bold text-[10px] sm:text-xs text-sfl-wood uppercase py-1.5 bg-sfl-card/70 border-b border-sfl-cardBorder">${d}</div>`).join('');

  let cellsHtml = '';

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    cellsHtml += `
      <div class="min-h-[50px] sm:min-h-[72px] p-1 sm:p-1.5 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/30">
        <span class="text-[10px] font-mono block">${prevDayNum}</span>
      </div>
    `;
  }

  // Days in current month
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    const dayData = tradesMap.get(dateKey);

    const isToday = isCurrentMonth && today.getDate() === d;
    const isSelected = selectedCalendarDateKey === dateKey;

    let tradeBadgeHtml = '';
    let cellBg = 'bg-white hover:bg-amber-50/70';

    if (dayData && dayData.trades.length > 0) {
      const net = dayData.totalSold - dayData.totalBought;
      const netColor = net > 0 ? 'text-sfl-green bg-green-50 dark:bg-green-950/40 border-sfl-green/30' : (net < 0 ? 'text-sfl-accent bg-red-50 dark:bg-red-950/40 border-red-300' : 'text-sfl-wood bg-amber-50 border-amber-300');
      const netSign = net >= 0 ? '+' : '';

      if (isCompact) {
        tradeBadgeHtml = `
          <div class="mt-1 space-y-0.5">
            <span class="block text-[9px] font-bold text-sfl-dirt leading-none">${dayData.trades.length}t</span>
            <span class="block text-[9px] font-mono font-black ${net > 0 ? 'text-sfl-green' : (net < 0 ? 'text-sfl-accent' : 'text-sfl-wood')} leading-none">
              ${netSign}${net.toFixed(1)}
            </span>
          </div>
        `;
      } else {
        tradeBadgeHtml = `
          <div class="mt-1 space-y-1">
            <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100/80 text-sfl-dirt border border-amber-300 shadow-2xs">
              <span>📜</span> ${dayData.trades.length} ${dayData.trades.length === 1 ? 'trade' : 'trades'}
            </div>
            <div class="text-[10px] sm:text-[11px] font-mono font-black ${netColor} px-1.5 py-0.5 rounded border">
              Net: ${netSign}${net.toFixed(2)} ${FLOWER_IMG_SMALL_HTML}
            </div>
          </div>
        `;
      }

      cellBg = 'bg-amber-50/60 hover:bg-amber-100/80 cursor-pointer';
    }

    const ringStyle = isSelected 
      ? 'ring-2 ring-sfl-gold border-sfl-gold bg-amber-100/90 dark:bg-amber-950/60 shadow-xs z-10' 
      : 'border-sfl-cardBorder/60';

    cellsHtml += `
      <div data-day-key="${dateKey}" class="cal-day-cell min-h-[50px] sm:min-h-[72px] p-1 sm:p-1.5 border transition relative cursor-pointer ${cellBg} ${ringStyle}">
        <div class="flex justify-between items-center">
          <span class="text-[10px] sm:text-xs font-mono font-bold ${isToday ? 'bg-sfl-wood text-amber-200 px-1.5 py-0.2 rounded-full' : 'text-sfl-wood'}">
            ${d}
          </span>
          ${dayData ? `<span class="w-1.5 h-1.5 rounded-full bg-sfl-green inline-block"></span>` : ''}
        </div>
        ${tradeBadgeHtml}
      </div>
    `;
  }

  // Trailing empty cells
  const totalRendered = firstDayIndex + daysInMonth;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    cellsHtml += `
      <div class="min-h-[50px] sm:min-h-[72px] p-1 sm:p-1.5 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/30">
        <span class="text-[10px] font-mono block">${i}</span>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-7 gap-0 border-2 border-sfl-cardBorder rounded-xl overflow-hidden bg-sfl-cardBorder/40">
      ${headersHtml}
      ${cellsHtml}
    </div>
  `;
}

function renderWeekStripView(tradesMap, farmId) {
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    days.push({ key, dateObj: d });
  }

  let cardsHtml = '';
  days.forEach(({ key, dateObj }) => {
    const dayData = tradesMap.get(key);
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const isSelected = selectedCalendarDateKey === key;

    const count = dayData ? dayData.trades.length : 0;
    const sold = dayData ? dayData.totalSold : 0;
    const bought = dayData ? dayData.totalBought : 0;
    const net = sold - bought;
    const netColor = net > 0 ? 'text-sfl-green' : (net < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

    cardsHtml += `
      <div data-day-key="${key}" class="cal-day-cell p-3 rounded-xl border-2 transition cursor-pointer flex-1 min-w-[130px] ${isSelected ? 'border-sfl-gold bg-amber-100 dark:bg-amber-950/60 ring-2 ring-sfl-gold' : 'border-sfl-cardBorder bg-white hover:bg-amber-50'}">
        <span class="font-bold text-xs text-sfl-wood block mb-1">${dayName}</span>
        <span class="text-xs font-mono font-bold text-sfl-dirt block">${count} trades</span>
        <div class="mt-2 text-[11px] font-mono space-y-0.5">
          <span class="block text-sfl-green font-semibold">🟢 +${sold.toFixed(2)}</span>
          <span class="block text-sfl-wood font-semibold">🔵 -${bought.toFixed(2)}</span>
          <span class="block ${netColor} font-black border-t border-sfl-cardBorder/40 pt-1">
            Net: ${net >= 0 ? '+' : ''}${net.toFixed(2)}
          </span>
        </div>
      </div>
    `;
  });

  return `
    <div class="flex gap-2 overflow-x-auto pb-2">
      ${cardsHtml}
    </div>
  `;
}

function renderSelectedDayInspector(dateKey, dayData, farmId) {
  let displayTitle = dateKey;
  if (dayData?.dateObj) {
    displayTitle = dayData.dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } else if (dateKey) {
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        displayTitle = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
  }

  if (!dayData || dayData.trades.length === 0) {
    return `
      <div class="border-t-2 border-sfl-cardBorder bg-white/90 p-6 text-center">
        <span class="text-sm font-bold text-sfl-dirt flex items-center justify-center gap-1.5 mb-1">
          <span>📅</span> ${displayTitle}
        </span>
        <p class="text-xs text-sfl-woodLight italic">
          No marketplace trades recorded on this date. Click on any date in the calendar above to inspect trades.
        </p>
      </div>
    `;
  }

  const sold = dayData.totalSold;
  const bought = dayData.totalBought;
  const net = sold - bought;
  const netColor = net > 0 ? 'text-sfl-green' : (net < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  let rowsHtml = '';
  dayData.trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
    const qty = parseFloat(t.quantity || 1);
    const sfl = parseFloat(t.sfl || 0);
    const unitPrice = qty > 0 ? (sfl / qty) : sfl;

    const dateObj = t.fulfilledAt ? new Date(t.fulfilledAt) : null;
    const timeStr = dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Recent';

    const otherUser = isSeller
      ? (t.counterpartyName || t.fulfilledBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Buyer'))
      : (t.counterpartyName || t.initiatedBy?.username || (t.counterpartyId ? `Farm #${t.counterpartyId}` : 'Market Seller'));

    const badge = isSeller
      ? `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 px-2 py-0.5 rounded text-[10px] font-bold">🟢 SOLD</span>`
      : `<span class="bg-blue-100 text-blue-800 border border-blue-400/40 px-2 py-0.5 rounded text-[10px] font-bold">🔵 BOUGHT</span>`;

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood text-xs whitespace-nowrap">${timeStr}</td>
        <td class="px-2 py-2.5 whitespace-nowrap">${badge}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemName}</td>
        <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">${qty.toLocaleString()}</td>
        <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(4)} ${FLOWER_IMG_SMALL_HTML}</td>
        <td class="px-3 py-2.5 font-medium text-sfl-wood text-xs">
          ${isSeller ? 'To: ' : 'From: '}<strong>${otherUser}</strong>
        </td>
        <td class="px-3 py-2.5 font-mono font-bold text-right ${isSeller ? 'text-sfl-green' : 'text-sfl-wood'}">
          ${isSeller ? '+' : '-'}${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
        </td>
      </tr>
    `;
  });

  return `
    <div class="border-t-2 border-sfl-cardBorder bg-white/90">
      <!-- DAY SUMMARY BANNER -->
      <div class="bg-amber-100/60 p-4 border-b border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <span class="text-sm font-bold text-sfl-dirt flex items-center gap-2">
            <span>📅</span> Activity for <strong>${displayTitle}</strong>
          </span>
          <span class="text-[11px] text-sfl-woodLight font-semibold">
            ${dayData.trades.length} completed transactions recorded
          </span>
        </div>

        <div class="flex items-center gap-3 text-xs sm:text-sm font-mono flex-wrap">
          <span class="bg-white/80 border border-sfl-cardBorder px-2.5 py-1 rounded-md text-sfl-green font-bold shadow-2xs">
            🟢 Sales: +${sold.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
          </span>
          <span class="bg-white/80 border border-sfl-cardBorder px-2.5 py-1 rounded-md text-sfl-wood font-bold shadow-2xs">
            🔵 Purchases: -${bought.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
          </span>
          <span class="bg-white/90 border-2 border-sfl-cardBorder px-3 py-1 rounded-md ${netColor} font-black shadow-xs">
            ⚖️ Daily Net: ${net >= 0 ? '+' : ''}${net.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
          </span>
        </div>
      </div>

      <!-- DAY TRANSACTIONS TABLE -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-sfl-dirt">
          <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
            <tr>
              <th class="px-3 py-2.5">Time</th>
              <th class="px-2 py-2.5">Type</th>
              <th class="px-3 py-2.5">Item Name</th>
              <th class="px-2 py-2.5">Quantity</th>
              <th class="px-2 py-2.5">Unit Price</th>
              <th class="px-3 py-2.5">Counterparty</th>
              <th class="px-3 py-2.5 text-right">Total SFL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sfl-cardBorder/40 font-medium bg-white">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function bindCalendarGridEvents(mountEl, farmId) {
  // Day Cell click
  const dayCells = mountEl.querySelectorAll('.cal-day-cell');
  dayCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      const dayKey = e.currentTarget.getAttribute('data-day-key');
      if (dayKey) {
        selectedCalendarDateKey = dayKey;
        renderCalendarGridView(mountEl, farmId);
      }
    });
  });

  // Prev / Next Month
  mountEl.querySelector('#cal-prev-month')?.addEventListener('click', () => {
    calendarCurrentMonth--;
    if (calendarCurrentMonth < 0) {
      calendarCurrentMonth = 11;
      calendarCurrentYear--;
    }
    renderCalendarGridView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-month')?.addEventListener('click', () => {
    calendarCurrentMonth++;
    if (calendarCurrentMonth > 11) {
      calendarCurrentMonth = 0;
      calendarCurrentYear++;
    }
    renderCalendarGridView(mountEl, farmId);
  });

  // Today button
  mountEl.querySelector('#cal-today-btn')?.addEventListener('click', () => {
    const today = new Date();
    calendarCurrentMonth = today.getMonth();
    calendarCurrentYear = today.getFullYear();
    selectedCalendarDateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    renderCalendarGridView(mountEl, farmId);
  });

  // View Switcher (Month / 3-Month / Week)
  const viewBtns = mountEl.querySelectorAll('.cal-view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.getAttribute('data-cal-view');
      if (mode) {
        calendarViewMode = mode;
        renderCalendarGridView(mountEl, farmId);
      }
    });
  });
}

function renderListingsView(mountEl) {
  const listingsObj = tradeHistoryData?.listings || {};
  const listingEntries = Object.entries(listingsObj);

  if (listingEntries.length === 0) {
    mountEl.innerHTML = `<div class="p-8 text-center text-sfl-woodLight italic">No active listings on the market.</div>`;
    return;
  }

  let rowsHtml = '';
  listingEntries.forEach(([listId, listData]) => {
    const rawDate = listData.createdAt;
    let dateStr = 'Active';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : String(rawDate);
    }

    const isEconomy = listData.collection === 'economies' || Boolean(listData.economy);
    const itemsMap = listData.items || {};
    const itemNames = isEconomy 
      ? Object.entries(itemsMap).map(([rawId, q]) => `${q}x #${rawId}`).join(', ') || 'Economy Item'
      : Object.entries(itemsMap).map(([rawId, q]) => {
          const name = getItemNameById(rawId);
          return `${q}x ${name}`;
        }).join(', ') || 'Listing Item';

    const sfl = parseFloat(listData.sfl || 0);
    const tax = parseFloat(listData.tax || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames}</td>
        <td class="px-2 py-2.5 uppercase font-bold text-[10px] text-amber-800">${listData.collection || 'collectibles'}</td>
        <td class="px-2.5 py-2.5 font-mono text-sfl-accent font-bold">-${tax.toFixed(3)}</td>
        <td class="px-3 py-2.5 font-mono font-bold text-sfl-green text-right">${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
        <tr>
          <th class="px-3 py-2.5">Listed Date</th>
          <th class="px-3 py-2.5">Item & Quantity</th>
          <th class="px-2 py-2.5">Category</th>
          <th class="px-2.5 py-2.5 text-sfl-accent">Marketplace Tax</th>
          <th class="px-3 py-2.5 text-right">Listing SFL Price</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function renderOffersView(mountEl) {
  const offersObj = tradeHistoryData?.offers || {};
  const offerEntries = Object.entries(offersObj);

  if (offerEntries.length === 0) {
    mountEl.innerHTML = `<div class="p-8 text-center text-sfl-woodLight italic">No open buy offers currently placed.</div>`;
    return;
  }

  let rowsHtml = '';
  offerEntries.forEach(([offId, offData]) => {
    const rawDate = offData.createdAt;
    let dateStr = 'Active';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : String(rawDate);
    }

    const isEconomy = offData.collection === 'economies' || Boolean(offData.economy);
    const itemsMap = offData.items || {};
    const itemNames = isEconomy 
      ? Object.entries(itemsMap).map(([rawId, q]) => `${q}x #${rawId}`).join(', ') || 'Economy Item'
      : Object.entries(itemsMap).map(([rawId, q]) => {
          const name = getItemNameById(rawId);
          return `${q}x ${name}`;
        }).join(', ') || 'Offer Item';

    const sfl = parseFloat(offData.sfl || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames}</td>
        <td class="px-2 py-2.5 uppercase font-bold text-[10px] text-amber-800">${offData.collection || 'collectibles'}</td>
        <td class="px-3 py-2.5 font-mono font-bold text-sfl-wood text-right">${sfl.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      </tr>
    `;
  });

  mountEl.innerHTML = `
    <table class="w-full text-left text-xs text-sfl-dirt">
      <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
        <tr>
          <th class="px-3 py-2.5">Offer Placed</th>
          <th class="px-3 py-2.5">Item & Desired Qty</th>
          <th class="px-2 py-2.5">Category</th>
          <th class="px-3 py-2.5 text-right">Offer Amount</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-sfl-cardBorder/40 font-medium">
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function exportTradesToCsv() {
  const trades = tradeHistoryData?.trades || [];
  if (trades.length === 0) {
    alert("⚠️ No trade records to export yet. Please sync your farm first.");
    return;
  }

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();
  const headers = ["Date", "Type", "Item Name", "Item ID", "Quantity", "Total SFL", "Unit Price", "Counterparty", "Source", "Trade ID"];
  
  const rows = trades.map(t => {
    const isSeller = isUserSeller(t, farmId);
    const rawDate = t.fulfilledAt ? new Date(t.fulfilledAt).toISOString() : '';
    const isEconomy = t.collection === 'economies' || Boolean(t.economy);
    const itemName = isEconomy ? `#${t.itemId || '?'}` : (t.itemName || getItemNameById(t.itemId));
    const qty = t.quantity || 1;
    const sfl = t.sfl || 0;
    const unitPrice = qty > 0 ? (sfl / qty) : sfl;
    const counterparty = isSeller ? (t.counterpartyName || t.fulfilledBy?.username || '') : (t.counterpartyName || t.initiatedBy?.username || '');

    return [
      `"${rawDate}"`,
      `"${isSeller ? 'SOLD' : 'BOUGHT'}"`,
      `"${itemName}"`,
      `"${t.itemId || ''}"`,
      qty,
      sfl,
      unitPrice.toFixed(4),
      `"${counterparty}"`,
      `"${t.source || 'listing'}"`,
      `"${t.id || ''}"`
    ].join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sfl_trades_farm_${farmId || 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
