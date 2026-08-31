import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML } from '../config/constants.js';
import { getItemNameById } from '../data/knownIds.js';
import { roundUpToThreeDecimals } from '../utils/formatters.js';
import { ApiService } from '../services/api.js';

let tradeHistoryData = null;
let currentView = 'trades'; // 'trades' | 'listings' | 'offers' | 'friends'
let currentFilter = 'all'; // 'all' | 'sold' | 'bought'
let searchQuery = '';

export function renderTradeHistoryTemplate() {
  const container = document.getElementById('trade-history-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- TOP HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>📜</span> Marketplace Trade History & Profile
          </h3>
          <p id="trade-user-summary" class="text-[11px] text-sfl-woodLight font-semibold">
            tracks completed sales, purchases, active listings & top trading partners
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button id="refresh-trade-history-btn" class="bg-sfl-wood text-amber-200 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1.5 shadow-xs">
            🔄 Refresh Profile
          </button>
        </div>
      </div>

      <!-- METRIC CARDS (TOTAL STATS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🟢 Total Sales Volume</span>
          <span id="trade-metric-sales-volume" class="text-base sm:text-lg font-black text-sfl-green font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span id="trade-metric-sales-count" class="text-[10px] text-sfl-woodLight block mt-0.5">0 items sold</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🔵 Total Purchases Volume</span>
          <span id="trade-metric-buys-volume" class="text-base sm:text-lg font-black text-sfl-wood font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span id="trade-metric-buys-count" class="text-[10px] text-sfl-woodLight block mt-0.5">0 items bought</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">💸 Weekly Spent / Earned</span>
          <span id="trade-metric-weekly-spent" class="text-base sm:text-lg font-black text-sfl-accent font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span id="trade-metric-weekly-earned" class="text-[10px] text-sfl-green font-bold block mt-0.5">Earned: 0.000 ${FLOWER_IMG_SMALL_HTML}</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🏆 Total Completed Trades</span>
          <span id="trade-metric-total-trades" class="text-base sm:text-lg font-black text-sfl-dirt font-mono">0</span>
          <span id="trade-metric-profile-level" class="text-[10px] text-sfl-woodLight block mt-0.5">Bumpkin Level: -</span>
        </div>
      </div>

      <!-- NAVIGATION SUB-TABS (TRADES / LISTINGS / OFFERS / FRIENDS) -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-sfl-cardBorder pb-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button id="subtab-trades-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-sfl-dirt bg-sfl-wood text-amber-200 shadow-xs">
            📜 Trade History (<span id="subtab-trades-count">0</span>)
          </button>
          <button id="subtab-listings-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            🏷️ Active Listings (<span id="subtab-listings-count">0</span>)
          </button>
          <button id="subtab-offers-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            🎯 Open Offers (<span id="subtab-offers-count">0</span>)
          </button>
          <button id="subtab-friends-btn" class="trade-subtab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-2 border-transparent bg-amber-100/60 text-sfl-woodLight hover:bg-amber-200/60">
            👥 Trade Partners (<span id="subtab-friends-count">0</span>)
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
                  Click 'Refresh Profile' or sign in with your VIP API Key to load live marketplace activity.
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

  document.getElementById('subtab-trades-btn')?.addEventListener('click', () => switchSubTab('trades'));
  document.getElementById('subtab-listings-btn')?.addEventListener('click', () => switchSubTab('listings'));
  document.getElementById('subtab-offers-btn')?.addEventListener('click', () => switchSubTab('offers'));
  document.getElementById('subtab-friends-btn')?.addEventListener('click', () => switchSubTab('friends'));

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
    if (tab === 'trades') filterBar.classList.remove('hidden');
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

  if (statusEl) statusEl.textContent = "⏳ Loading marketplace profile...";

  try {
    const data = await ApiService.getMarketplaceProfile(farmId, apiKey);
    tradeHistoryData = data;
    renderTradeSummaryMetrics(data);
    renderCurrentView();
    if (statusEl) statusEl.textContent = "✅ Profile Loaded";
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
  }
}

function renderTradeSummaryMetrics(profileData) {
  if (!profileData) return;
  const user = profileData.username || `Farm #${profileData.id || ''}`;
  const level = profileData.level || '-';
  const totalTradesCount = profileData.totalTrades || 0;
  const weeklySpent = parseFloat(profileData.weeklyFlowerSpent || 0);
  const weeklyEarned = parseFloat(profileData.weeklyFlowerEarned || 0);

  const trades = profileData.trades || [];
  const listings = Object.values(profileData.listings || {});
  const offers = Object.values(profileData.offers || {});
  const friends = profileData.friends || [];

  const farmId = String(profileData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  let totalSoldVolume = 0;
  let totalSoldCount = 0;
  let totalBoughtVolume = 0;
  let totalBoughtCount = 0;

  trades.forEach(t => {
    const isSeller = isUserSeller(t, farmId);
    const sfl = parseFloat(t.sfl || 0);
    const qty = parseFloat(t.quantity || 1);

    if (isSeller) {
      totalSoldVolume += sfl;
      totalSoldCount += qty;
    } else {
      totalBoughtVolume += sfl;
      totalBoughtCount += qty;
    }
  });

  const userSummaryEl = document.getElementById('trade-user-summary');
  if (userSummaryEl) {
    userSummaryEl.textContent = `Player: ${user} • Level: ${level} • Lifetime Trades: ${totalTradesCount.toLocaleString()}`;
  }

  const salesVolEl = document.getElementById('trade-metric-sales-volume');
  const salesCountEl = document.getElementById('trade-metric-sales-count');
  const buysVolEl = document.getElementById('trade-metric-buys-volume');
  const buysCountEl = document.getElementById('trade-metric-buys-count');
  const weeklySpentEl = document.getElementById('trade-metric-weekly-spent');
  const weeklyEarnedEl = document.getElementById('trade-metric-weekly-earned');
  const totalTradesEl = document.getElementById('trade-metric-total-trades');
  const profileLevelEl = document.getElementById('trade-metric-profile-level');

  if (salesVolEl) salesVolEl.innerHTML = `${totalSoldVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (salesCountEl) salesCountEl.textContent = `${totalSoldCount.toLocaleString()} items sold in history`;
  if (buysVolEl) buysVolEl.innerHTML = `${totalBoughtVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (buysCountEl) buysCountEl.textContent = `${totalBoughtCount.toLocaleString()} items bought in history`;
  if (weeklySpentEl) weeklySpentEl.innerHTML = `-${weeklySpent.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (weeklyEarnedEl) weeklyEarnedEl.innerHTML = `Earned: +${weeklyEarned.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (totalTradesEl) totalTradesEl.textContent = totalTradesCount.toLocaleString();
  if (profileLevelEl) profileLevelEl.textContent = `Bumpkin Level: ${level}`;

  document.getElementById('subtab-trades-count').textContent = trades.length;
  document.getElementById('subtab-listings-count').textContent = listings.length;
  document.getElementById('subtab-offers-count').textContent = offers.length;
  document.getElementById('subtab-friends-count').textContent = friends.length;
}

function isUserSeller(trade, myFarmId) {
  const initId = String(trade.initiatedBy?.id || trade.seller || '');
  const fulfId = String(trade.fulfilledBy?.id || trade.buyer || '');

  if (trade.source === 'listing') {
    // In a listing, the initiator is the seller, the fulfiller is the buyer
    return initId === myFarmId;
  } else if (trade.source === 'offer') {
    // In an offer, the initiator is the buyer, the fulfiller is the seller
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
    if (titleEl) titleEl.textContent = "📜 Completed Trade Transactions";
    renderTradesTableView(mountEl, farmId);
  } else if (currentView === 'listings') {
    if (titleEl) titleEl.textContent = "🏷️ Active Marketplace Listings";
    renderListingsView(mountEl);
  } else if (currentView === 'offers') {
    if (titleEl) titleEl.textContent = "🎯 Open Buy Offers";
    renderOffersView(mountEl);
  } else if (currentView === 'friends') {
    if (titleEl) titleEl.textContent = "👥 Top Trading Partners";
    renderFriendsView(mountEl);
  }
}

function renderTradesTableView(mountEl, farmId) {
  const trades = tradeHistoryData?.trades || [];

  let filtered = trades.filter(t => {
    const isSeller = isUserSeller(t, farmId);
    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && isSeller) return false;

    if (searchQuery) {
      const itemName = getItemNameById(t.itemId).toLowerCase();
      const otherUser = isSeller ? (t.fulfilledBy?.username || '').toLowerCase() : (t.initiatedBy?.username || '').toLowerCase();
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
    const itemName = getItemNameById(t.itemId);
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
      ? (t.fulfilledBy?.username || `Farm #${t.fulfilledBy?.id || '?'}`)
      : (t.initiatedBy?.username || `Farm #${t.initiatedBy?.id || '?'}`);

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

    const itemsMap = listData.items || {};
    const itemNames = Object.entries(itemsMap).map(([rawId, q]) => {
      const name = getItemNameById(rawId);
      return `${q}x ${name}`;
    }).join(', ');

    const sfl = parseFloat(listData.sfl || 0);
    const tax = parseFloat(listData.tax || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames || 'Listing Item'}</td>
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

    const itemsMap = offData.items || {};
    const itemNames = Object.entries(itemsMap).map(([rawId, q]) => {
      const name = getItemNameById(rawId);
      return `${q}x ${name}`;
    }).join(', ');

    const sfl = parseFloat(offData.sfl || 0);

    rowsHtml += `
      <tr class="hover:bg-amber-50/50 transition">
        <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
        <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemNames || 'Offer Item'}</td>
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

function renderFriendsView(mountEl) {
  const friends = tradeHistoryData?.friends || [];

  if (friends.length === 0) {
    mountEl.innerHTML = `<div class="p-8 text-center text-sfl-woodLight italic">No top trade partners recorded.</div>`;
    return;
  }

  let cardsHtml = '';
  friends.forEach(f => {
    cardsHtml += `
      <div class="bg-white/90 border-2 border-sfl-cardBorder p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div>
          <span class="font-bold text-sfl-dirt text-sm block">${f.username || `Farm #${f.id}`}</span>
          <span class="text-[10px] text-sfl-woodLight font-mono">Farm ID: ${f.id}</span>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-sfl-green font-mono block">${f.trades || 0} Trades</span>
          <span class="text-[10px] text-sfl-woodLight">Partner Trade Volume</span>
        </div>
      </div>
    `;
  });

  mountEl.innerHTML = `
    <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${cardsHtml}
    </div>
  `;
}
