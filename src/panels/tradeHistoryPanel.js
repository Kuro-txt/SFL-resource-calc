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
let calendarViewMode = 'day'; // 'day' | 'week'
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let calendarWeekOffset = 0; // 0 = current week, -1 = last week, etc.
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

  const trades = profileData.trades || [];
  const listings = Object.values(profileData.listings || {});
  const offers = Object.values(profileData.offers || {});

  const farmId = String(profileData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  let totalSoldVolume = 0;
  let totalBoughtVolume = 0;
  let weeklySpent = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    const sfl = parseFloat(t.sfl || 0);
    const time = Number(t.fulfilledAt || 0);

    if (isSeller) {
      totalSoldVolume += sfl;
    } else {
      totalBoughtVolume += sfl;
      // Calculate accurate weekly flower spent from purchases made in the last 7 days
      if (time >= sevenDaysAgo) {
        weeklySpent += sfl;
      }
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
    if (titleEl) titleEl.textContent = "📅 Trade Calendar & Daily Profit Inspector";
    renderCalendarMainView(mountEl, farmId);
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
// 📅 DUAL-MODE CALENDAR: BY DAY & BY WEEK
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

function getWeekRange(offset = 0) {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - currentDayOfWeek + (offset * 7));
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  return { sunday, saturday };
}

function renderCalendarMainView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];
  const tradesMap = buildTradesDateMap(trades, farmId);

  // Set default selected date if empty
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

  // Top Mode Switcher Bar (By Day vs By Week)
  let topModeBarHtml = `
    <div class="p-3 bg-amber-50/90 border-b-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-sfl-woodLight uppercase tracking-wider">Calendar Mode:</span>
        <button id="cal-mode-day" class="cal-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === 'day' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📅 By Day
        </button>
        <button id="cal-mode-week" class="cal-mode-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 ${calendarViewMode === 'week' ? 'border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs' : 'border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-100/50'}">
          📊 By Week
        </button>
      </div>

      <div class="text-[11px] font-bold text-sfl-woodLight">
        Click any day to inspect completed trades and exact net flow
      </div>
    </div>
  `;

  if (calendarViewMode === 'day') {
    renderByDayView(mountEl, tradesMap, farmId, topModeBarHtml);
  } else {
    renderByWeekView(mountEl, tradesMap, farmId, topModeBarHtml);
  }
}

// ----------------------------------------------------
// 1️⃣ BY DAY VIEW
// ----------------------------------------------------
function renderByDayView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const selectedDayData = tradesMap.get(selectedCalendarDateKey) || {
    totalSold: 0,
    totalBought: 0,
    trades: []
  };

  const daySold = selectedDayData.totalSold || 0;
  const daySpend = selectedDayData.totalBought || 0;
  const dayNet = daySold - daySpend;
  const netSign = dayNet >= 0 ? '+' : '';
  const netColor = dayNet > 0 ? 'text-sfl-green' : (dayNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  let dayDisplayTitle = selectedCalendarDateKey;
  if (selectedDayData?.dateObj) {
    dayDisplayTitle = selectedDayData.dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  } else if (selectedCalendarDateKey) {
    const parts = selectedCalendarDateKey.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) {
        dayDisplayTitle = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  }

  // 1. TOP METRICS ROW FOR SELECTED DAY
  const dayMetricsHtml = `
    <div class="p-4 bg-white/90 border-b-2 border-sfl-cardBorder">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <span class="text-xs sm:text-sm font-bold text-sfl-dirt flex items-center gap-1.5">
          <span>📅</span> Selected Day: <strong>${dayDisplayTitle}</strong>
        </span>
        <span class="bg-amber-100 text-sfl-wood text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
          ${selectedDayData.trades.length} ${selectedDayData.trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">🟢 Flower from Sales</span>
          <span class="text-base sm:text-lg font-black text-sfl-green font-mono">+${daySold.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">🔵 Flower Spent</span>
          <span class="text-base sm:text-lg font-black text-sfl-wood font-mono">-${daySpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">⚖️ Net Flower</span>
          <span class="text-base sm:text-lg font-black ${netColor} font-mono">${netSign}${dayNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>
      </div>
    </div>
  `;

  // 2. INTERACTIVE CALENDAR MONTH GRID VIEW
  const monthDate = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  const monthName = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const monthGridNavHtml = `
    <div class="p-3 bg-amber-100/60 border-b-2 border-sfl-cardBorder flex justify-between items-center">
      <div class="flex items-center gap-2">
        <button id="cal-prev-month" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-3 py-1 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
          ◀ Prev Month
        </button>
        <span class="font-bold text-sfl-wood text-sm sm:text-base px-2">
          ${monthName}
        </span>
        <button id="cal-next-month" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-3 py-1 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
          Next Month ▶
        </button>
      </div>

      <button id="cal-today-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-3 py-1 rounded-md text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
        Today
      </button>
    </div>
  `;

  const calendarGridHtml = renderSingleMonthGrid(calendarCurrentYear, calendarCurrentMonth, tradesMap);

  // 3. COMPLETED TRADES TABLE FOR SELECTED DAY
  const tradesTableHtml = renderSelectedDayTradesTable(dayDisplayTitle, selectedDayData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${dayMetricsHtml}
    ${monthGridNavHtml}
    <div class="p-3 sm:p-4 bg-white/60">
      ${calendarGridHtml}
    </div>
    ${tradesTableHtml}
  `;

  bindDayViewEvents(mountEl, farmId);
}

// ----------------------------------------------------
// 2️⃣ BY WEEK VIEW (< > SWIPE WEEKS)
// ----------------------------------------------------
function renderByWeekView(mountEl, tradesMap, farmId, topModeBarHtml) {
  const { sunday, saturday } = getWeekRange(calendarWeekOffset);
  const weekTitle = `${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${saturday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Generate 7 days for the week
  const weekDays = [];
  let weekSales = 0;
  let weekSpend = 0;
  let weekTradesCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayData = tradesMap.get(key) || {
      dateKey: key,
      dateObj: d,
      totalSold: 0,
      totalBought: 0,
      trades: []
    };

    weekSales += dayData.totalSold || 0;
    weekSpend += dayData.totalBought || 0;
    weekTradesCount += dayData.trades.length;

    weekDays.push({ key, dateObj: d, dayData });
  }

  const weekNet = weekSales - weekSpend;
  const netSign = weekNet >= 0 ? '+' : '';
  const netColor = weekNet > 0 ? 'text-sfl-green' : (weekNet < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

  // 1. WEEK NAVIGATION BAR
  const weekNavHtml = `
    <div class="p-3.5 bg-amber-100/60 border-b-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div class="flex items-center gap-2">
        <button id="cal-prev-week" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs flex items-center gap-1">
          ◀ Previous Week
        </button>
        <span class="font-bold text-sfl-wood text-xs sm:text-sm px-2">
          <span>🗓️</span> ${weekTitle} ${calendarWeekOffset === 0 ? '<span class="ml-1 text-[10px] bg-amber-200 text-sfl-dirt px-2 py-0.5 rounded font-black">CURRENT</span>' : ''}
        </span>
        <button id="cal-next-week" class="bg-white border-2 border-sfl-cardBorder hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs flex items-center gap-1">
          Next Week ▶
        </button>
      </div>

      <button id="cal-current-week-btn" class="bg-amber-200 border border-sfl-cardBorder hover:bg-amber-300 px-3 py-1 rounded-md text-xs font-bold text-sfl-dirt cursor-pointer transition shadow-xs">
        This Week
      </button>
    </div>
  `;

  // 2. TOP METRICS ROW FOR THE WEEK
  const weekMetricsHtml = `
    <div class="p-4 bg-white/90 border-b-2 border-sfl-cardBorder">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">🟢 Weekly Sales</span>
          <span class="text-base sm:text-lg font-black text-sfl-green font-mono">+${weekSales.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">🔵 Weekly Spent</span>
          <span class="text-base sm:text-lg font-black text-sfl-wood font-mono">-${weekSpend.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-amber-50/70 border-2 border-sfl-cardBorder p-3 rounded-xl text-center shadow-2xs">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-0.5">⚖️ Weekly Net Flower</span>
          <span class="text-base sm:text-lg font-black ${netColor} font-mono">${netSign}${weekNet.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>
        </div>
      </div>
    </div>
  `;

  // 3. 7-DAY CARDS BREAKDOWN STRIP
  let dayCardsHtml = '';
  weekDays.forEach(({ key, dateObj, dayData }) => {
    const isSelected = selectedCalendarDateKey === key;
    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = dateObj.getDate();
    const count = dayData.trades.length;
    const s = dayData.totalSold || 0;
    const b = dayData.totalBought || 0;
    const n = s - b;
    const nColor = n > 0 ? 'text-sfl-green' : (n < 0 ? 'text-sfl-accent' : 'text-sfl-wood');

    dayCardsHtml += `
      <div data-day-key="${key}" class="cal-day-cell flex-1 min-w-[135px] p-3 rounded-xl border-2 transition cursor-pointer shadow-xs ${isSelected ? 'border-sfl-gold bg-amber-100 dark:bg-amber-950/60 ring-2 ring-sfl-gold' : 'border-sfl-cardBorder bg-white hover:bg-amber-50'}">
        <div class="flex justify-between items-center mb-1">
          <span class="font-black text-xs text-sfl-wood">${dayName} ${dayNum}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-sfl-dirt border border-amber-300">
            ${count}t
          </span>
        </div>
        <div class="mt-2 text-xs font-mono space-y-0.5">
          <span class="block text-sfl-green font-semibold">🟢 +${s.toFixed(2)}</span>
          <span class="block text-sfl-wood font-semibold">🔵 -${b.toFixed(2)}</span>
          <span class="block ${nColor} font-black border-t border-sfl-cardBorder/40 pt-1">
            Net: ${n >= 0 ? '+' : ''}${n.toFixed(2)}
          </span>
        </div>
      </div>
    `;
  });

  const weekStripHtml = `
    <div class="p-3 sm:p-4 bg-amber-50/40 border-b-2 border-sfl-cardBorder">
      <div class="flex gap-2.5 overflow-x-auto pb-2">
        ${dayCardsHtml}
      </div>
    </div>
  `;

  // 4. TRADES TABLE FOR THE SELECTED DAY OR ENTIRE WEEK
  const selectedDayData = tradesMap.get(selectedCalendarDateKey) || { totalSold: 0, totalBought: 0, trades: [] };
  let selectedTitle = selectedCalendarDateKey;
  if (selectedDayData?.dateObj) {
    selectedTitle = selectedDayData.dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  const tradesTableHtml = renderSelectedDayTradesTable(selectedTitle, selectedDayData, farmId);

  mountEl.innerHTML = `
    ${topModeBarHtml}
    ${weekNavHtml}
    ${weekMetricsHtml}
    ${weekStripHtml}
    ${tradesTableHtml}
  `;

  bindWeekViewEvents(mountEl, farmId);
}

// ----------------------------------------------------
// SHARED MONTH GRID RENDERER
// ----------------------------------------------------
function renderSingleMonthGrid(year, month, tradesMap) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let headersHtml = dayHeaders.map(d => `
    <div class="text-center font-black text-[11px] text-sfl-wood uppercase py-2 bg-sfl-card/80 border-b-2 border-sfl-cardBorder">
      ${d}
    </div>
  `).join('');

  let cellsHtml = '';

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    cellsHtml += `
      <div class="min-h-[64px] sm:min-h-[82px] p-2 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/20">
        <span class="text-xs font-mono">${prevDayNum}</span>
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
      const netSign = net >= 0 ? '+' : '';

      tradeBadgeHtml = `
        <div class="mt-1.5 space-y-1">
          <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-sfl-dirt border border-amber-300 shadow-2xs">
            <span>📜</span> ${dayData.trades.length} ${dayData.trades.length === 1 ? 'trade' : 'trades'}
          </div>
          <div class="text-[10px] sm:text-[11px] font-mono font-black ${net >= 0 ? 'text-sfl-green bg-green-50/80 dark:bg-green-950/40 border-sfl-green/40' : 'text-sfl-accent bg-red-50/80 dark:bg-red-950/40 border-red-300'} px-1.5 py-0.5 rounded border">
            Net: ${netSign}${net.toFixed(2)} ${FLOWER_IMG_SMALL_HTML}
          </div>
        </div>
      `;

      cellBg = 'bg-amber-50/80 hover:bg-amber-100 cursor-pointer';
    }

    const activeRing = isSelected 
      ? 'ring-2 ring-sfl-gold border-sfl-gold bg-amber-100 dark:bg-amber-950/60 shadow-md z-10 scale-[1.01]' 
      : 'border-sfl-cardBorder/50';

    cellsHtml += `
      <div data-day-key="${dateKey}" class="cal-day-cell min-h-[64px] sm:min-h-[82px] p-2 border transition duration-150 relative cursor-pointer ${cellBg} ${activeRing}">
        <div class="flex justify-between items-center">
          <span class="text-xs font-mono font-bold ${isToday ? 'bg-sfl-wood text-amber-200 px-1.5 py-0.2 rounded-full shadow-2xs' : 'text-sfl-wood'}">
            ${d}
          </span>
          ${dayData ? `<span class="w-2 h-2 rounded-full bg-sfl-green shadow-2xs inline-block"></span>` : ''}
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
      <div class="min-h-[64px] sm:min-h-[82px] p-2 bg-amber-50/20 text-sfl-woodLight/30 border border-sfl-cardBorder/20">
        <span class="text-xs font-mono">${i}</span>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-7 gap-0 border-2 border-sfl-cardBorder rounded-xl overflow-hidden bg-sfl-cardBorder/30 shadow-xs">
      ${headersHtml}
      ${cellsHtml}
    </div>
  `;
}

// ----------------------------------------------------
// SHARED TRANSACTIONS TABLE
// ----------------------------------------------------
function renderSelectedDayTradesTable(displayTitle, dayData, farmId) {
  if (!dayData || dayData.trades.length === 0) {
    return `
      <div class="bg-white/90 p-8 text-center border-t-2 border-sfl-cardBorder">
        <span class="text-sm font-bold text-sfl-dirt flex items-center justify-center gap-1.5 mb-1">
          <span>📅</span> ${displayTitle}
        </span>
        <p class="text-xs text-sfl-woodLight italic">
          No marketplace trades recorded on this date. Click on any date with trades in the calendar above.
        </p>
      </div>
    `;
  }

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
      ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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
      <div class="bg-amber-100/60 px-4 py-2.5 border-b border-sfl-cardBorder flex justify-between items-center">
        <span class="text-xs font-bold text-sfl-dirt uppercase tracking-wider flex items-center gap-1.5">
          <span>📜</span> Completed Transactions on ${displayTitle}
        </span>
        <span class="text-[11px] font-bold text-sfl-wood font-mono">
          ${dayData.trades.length} items traded
        </span>
      </div>

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

// ----------------------------------------------------
// EVENT BINDINGS
// ----------------------------------------------------
function bindDayViewEvents(mountEl, farmId) {
  // Mode switcher
  mountEl.querySelector('#cal-mode-day')?.addEventListener('click', () => {
    calendarViewMode = 'day';
    renderCalendarMainView(mountEl, farmId);
  });
  mountEl.querySelector('#cal-mode-week')?.addEventListener('click', () => {
    calendarViewMode = 'week';
    renderCalendarMainView(mountEl, farmId);
  });

  // Day Cell click
  const dayCells = mountEl.querySelectorAll('.cal-day-cell');
  dayCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      const dayKey = e.currentTarget.getAttribute('data-day-key');
      if (dayKey) {
        selectedCalendarDateKey = dayKey;
        renderCalendarMainView(mountEl, farmId);
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
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-month')?.addEventListener('click', () => {
    calendarCurrentMonth++;
    if (calendarCurrentMonth > 11) {
      calendarCurrentMonth = 0;
      calendarCurrentYear++;
    }
    renderCalendarMainView(mountEl, farmId);
  });

  // Today button
  mountEl.querySelector('#cal-today-btn')?.addEventListener('click', () => {
    const today = new Date();
    calendarCurrentMonth = today.getMonth();
    calendarCurrentYear = today.getFullYear();
    selectedCalendarDateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    renderCalendarMainView(mountEl, farmId);
  });
}

function bindWeekViewEvents(mountEl, farmId) {
  // Mode switcher
  mountEl.querySelector('#cal-mode-day')?.addEventListener('click', () => {
    calendarViewMode = 'day';
    renderCalendarMainView(mountEl, farmId);
  });
  mountEl.querySelector('#cal-mode-week')?.addEventListener('click', () => {
    calendarViewMode = 'week';
    renderCalendarMainView(mountEl, farmId);
  });

  // Prev / Next Week
  mountEl.querySelector('#cal-prev-week')?.addEventListener('click', () => {
    calendarWeekOffset--;
    renderCalendarMainView(mountEl, farmId);
  });

  mountEl.querySelector('#cal-next-week')?.addEventListener('click', () => {
    calendarWeekOffset++;
    renderCalendarMainView(mountEl, farmId);
  });

  // This Week button
  mountEl.querySelector('#cal-current-week-btn')?.addEventListener('click', () => {
    calendarWeekOffset = 0;
    renderCalendarMainView(mountEl, farmId);
  });

  // Day Cell click in Week View
  const dayCells = mountEl.querySelectorAll('.cal-day-cell');
  dayCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      const dayKey = e.currentTarget.getAttribute('data-day-key');
      if (dayKey) {
        selectedCalendarDateKey = dayKey;
        renderCalendarMainView(mountEl, farmId);
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
