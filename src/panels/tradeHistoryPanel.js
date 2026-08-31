import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML } from '../config/constants.js';
import { normalizeItemKey, roundUpToThreeDecimals } from '../utils/formatters.js';
import { ApiService } from '../services/api.js';

let tradeHistoryData = null;
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
            <span>📜</span> Marketplace Trade History
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            tracks completed sales, purchases, marketplace fees & trading volume
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button id="refresh-trade-history-btn" class="bg-sfl-wood text-amber-200 px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-sfl-woodLight transition cursor-pointer flex items-center gap-1.5 shadow-xs">
            🔄 Refresh Trades
          </button>
        </div>
      </div>

      <!-- METRIC CARDS (TOTAL STATS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🟢 Total Sales</span>
          <span id="trade-metric-sales-volume" class="text-base sm:text-lg font-black text-sfl-green font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span id="trade-metric-sales-count" class="text-[10px] text-sfl-woodLight block mt-0.5">0 items sold</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🔵 Total Purchases</span>
          <span id="trade-metric-buys-volume" class="text-base sm:text-lg font-black text-sfl-wood font-mono">0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span id="trade-metric-buys-count" class="text-[10px] text-sfl-woodLight block mt-0.5">0 items bought</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">🏷️ Market Fees Paid</span>
          <span id="trade-metric-fees-volume" class="text-base sm:text-lg font-black text-sfl-accent font-mono">-0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span class="text-[10px] text-sfl-woodLight block mt-0.5">Taxes & royalties</span>
        </div>

        <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs text-center">
          <span class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wider block mb-1">📊 Net Trade Flow</span>
          <span id="trade-metric-net-flow" class="text-base sm:text-lg font-black text-sfl-green font-mono">+0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          <span class="text-[10px] text-sfl-woodLight block mt-0.5">Net profit / expenditure</span>
        </div>
      </div>

      <!-- FILTER CONTROLS & SEARCH BAR -->
      <div class="bg-sfl-card/90 p-3 rounded-xl border-2 border-sfl-cardBorder flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs">
        <div class="flex items-center gap-1.5 w-full sm:w-auto">
          <button id="trade-filter-all" class="trade-filter-btn px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer border border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs">
            All Trades
          </button>
          <button id="trade-filter-sold" class="trade-filter-btn px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50">
            🟢 Sold
          </button>
          <button id="trade-filter-bought" class="trade-filter-btn px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50">
            🔵 Bought
          </button>
        </div>

        <div class="relative w-full sm:w-64">
          <input type="text" id="trade-search-input" placeholder="🔍 Filter by item name..." 
            class="w-full sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt focus:ring-1 focus:ring-sfl-gold">
        </div>
      </div>

      <!-- TRANSACTIONS CONTAINER -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-sm">
        <div class="bg-sfl-wood text-amber-200 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-sfl-dirt flex justify-between items-center">
          <span>📜 Trade Log</span>
          <span id="trade-history-status" class="text-[11px] text-amber-300 font-mono">Ready</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="text-[11px] uppercase bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood">
              <tr>
                <th class="px-3 py-2.5">Date & Time</th>
                <th class="px-2 py-2.5">Type</th>
                <th class="px-3 py-2.5">Item Traded</th>
                <th class="px-2 py-2.5">Quantity</th>
                <th class="px-2 py-2.5">Unit Price</th>
                <th class="px-2.5 py-2.5 text-sfl-accent">Fee / Tax</th>
                <th class="px-3 py-2.5 text-sfl-green">Total (SFL/Flowers)</th>
              </tr>
            </thead>
            <tbody id="trade-history-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">
                  Click 'Refresh Trades' or enter your Farm ID & API Key to view marketplace transactions.
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

  document.getElementById('trade-filter-all')?.addEventListener('click', () => setTradeFilter('all'));
  document.getElementById('trade-filter-sold')?.addEventListener('click', () => setTradeFilter('sold'));
  document.getElementById('trade-filter-bought')?.addEventListener('click', () => setTradeFilter('bought'));

  const searchEl = document.getElementById('trade-search-input');
  searchEl?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTradeRows();
  });
}

function setTradeFilter(filter) {
  currentFilter = filter;
  const filterBtns = document.querySelectorAll('.trade-filter-btn');
  filterBtns.forEach(btn => {
    btn.className = "trade-filter-btn px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer border border-sfl-cardBorder bg-white text-sfl-wood hover:bg-amber-50";
  });

  const activeBtn = document.getElementById(`trade-filter-${filter}`);
  if (activeBtn) {
    activeBtn.className = "trade-filter-btn px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer border border-sfl-dirt bg-sfl-wood text-amber-100 shadow-xs";
  }

  renderTradeRows();
}

export async function fetchMarketplaceTrades() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
  const statusEl = document.getElementById('trade-history-status');
  const tbody = document.getElementById('trade-history-body');

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID in the header at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Fetching marketplace profile...";

  try {
    const data = await ApiService.getMarketplaceProfile(farmId, apiKey);
    tradeHistoryData = data;
    renderTradeSummaryMetrics(data);
    renderTradeRows();
    if (statusEl) statusEl.textContent = "✅ Trades Loaded";
  } catch (err) {
    const isAuthErr = err.message.includes('401') || err.message.toLowerCase().includes('api key');
    if (statusEl) statusEl.textContent = isAuthErr ? "⚠️ API Key Required" : `❌ Error: ${err.message}`;

    if (tbody) {
      if (isAuthErr) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="px-6 py-8 text-center text-sfl-dirt">
              <div class="max-w-md mx-auto bg-amber-50 border-2 border-amber-400 p-4 rounded-xl shadow-xs space-y-3">
                <div class="inline-block px-3 py-1 bg-amber-200 border border-amber-500 rounded-lg text-amber-950 font-bold text-xs">
                  🔑 VIP Community API Key Required
                </div>
                <p class="text-xs text-sfl-wood font-medium leading-relaxed">
                  Marketplace trade history is powered by Sunflower Land's VIP Community API (available to Level 50+ VIP bumpkins).
                </p>
                <p class="text-[11px] text-sfl-woodLight">
                  Please paste your API Key in the top header <strong>"API Key (Optional)"</strong> field to access live trade history.
                </p>
                <a href="https://sunflower-land.com/community-docs" target="_blank" rel="noopener noreferrer" 
                  class="inline-block text-xs font-bold text-amber-700 underline hover:text-amber-900">
                  📖 How to get your SFL API Key ↗
                </a>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sfl-accent italic font-semibold">❌ ${err.message}</td></tr>`;
      }
    }
  }
}

function renderTradeSummaryMetrics(data) {
  const trades = extractTradesArray(data);
  let totalSoldVolume = 0;
  let totalSoldCount = 0;
  let totalBoughtVolume = 0;
  let totalBoughtCount = 0;
  let totalFees = 0;

  const farmId = String(localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value || '').trim();

  trades.forEach(t => {
    const isSeller = String(t.seller || t.sellerId || t.sellerFarmId || '') === farmId || t.type === 'sold' || t.action === 'sale';
    const isBuyer = String(t.buyer || t.buyerId || t.buyerFarmId || '') === farmId || t.type === 'bought' || t.action === 'purchase';

    const sflVal = parseFloat(t.sfl || t.price || t.totalPrice || t.flowers || 0);
    const qty = parseFloat(t.quantity || t.qty || t.amount || 1);
    const feeVal = parseFloat(t.fee || t.tax || t.royalty || 0);

    if (isSeller) {
      totalSoldVolume += sflVal;
      totalSoldCount += qty;
      totalFees += feeVal;
    } else if (isBuyer) {
      totalBoughtVolume += sflVal;
      totalBoughtCount += qty;
    }
  });

  const netFlow = totalSoldVolume - totalBoughtVolume - totalFees;

  const salesVolEl = document.getElementById('trade-metric-sales-volume');
  const salesCountEl = document.getElementById('trade-metric-sales-count');
  const buysVolEl = document.getElementById('trade-metric-buys-volume');
  const buysCountEl = document.getElementById('trade-metric-buys-count');
  const feesVolEl = document.getElementById('trade-metric-fees-volume');
  const netFlowEl = document.getElementById('trade-metric-net-flow');

  if (salesVolEl) salesVolEl.innerHTML = `${totalSoldVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (salesCountEl) salesCountEl.textContent = `${totalSoldCount} items sold`;
  if (buysVolEl) buysVolEl.innerHTML = `${totalBoughtVolume.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  if (buysCountEl) buysCountEl.textContent = `${totalBoughtCount} items bought`;
  if (feesVolEl) feesVolEl.innerHTML = `-${totalFees.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;

  if (netFlowEl) {
    const isPositive = netFlow >= 0;
    netFlowEl.className = `text-base sm:text-lg font-black font-mono ${isPositive ? 'text-sfl-green' : 'text-sfl-accent'}`;
    netFlowEl.innerHTML = `${isPositive ? '+' : ''}${netFlow.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}`;
  }
}

function extractTradesArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.trades)) return data.trades;
  if (Array.isArray(data.history)) return data.history;
  if (Array.isArray(data.transactions)) return data.transactions;
  if (Array.isArray(data.sales)) return data.sales;
  if (data.profile && Array.isArray(data.profile.trades)) return data.profile.trades;
  return [];
}

function renderTradeRows() {
  const tbody = document.getElementById('trade-history-body');
  if (!tbody) return;

  const trades = extractTradesArray(tradeHistoryData);
  const farmId = String(localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value || '').trim();

  let filtered = trades.filter(t => {
    const isSeller = String(t.seller || t.sellerId || t.sellerFarmId || '') === farmId || t.type === 'sold' || t.action === 'sale';
    const isBuyer = String(t.buyer || t.buyerId || t.buyerFarmId || '') === farmId || t.type === 'bought' || t.action === 'purchase';

    if (currentFilter === 'sold' && !isSeller) return false;
    if (currentFilter === 'bought' && !isBuyer) return false;

    if (searchQuery) {
      const itemName = String(t.name || t.item || t.itemName || '').toLowerCase();
      if (!itemName.includes(searchQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sfl-woodLight italic">No trade transactions found matching the current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';

  filtered.forEach(t => {
    const isSeller = String(t.seller || t.sellerId || t.sellerFarmId || '') === farmId || t.type === 'sold' || t.action === 'sale';
    const rawDate = t.createdAt || t.date || t.timestamp || t.time;
    let dateStr = 'Recent';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(rawDate);
    }

    const itemName = t.name || t.item || t.itemName || 'Trade Item';
    const qty = parseFloat(t.quantity || t.qty || t.amount || 1);
    const totalPrice = parseFloat(t.sfl || t.price || t.totalPrice || t.flowers || 0);
    const unitPrice = qty > 0 ? (totalPrice / qty) : totalPrice;
    const feeVal = parseFloat(t.fee || t.tax || t.royalty || 0);

    const typeBadge = isSeller
      ? `<span class="bg-green-100 text-sfl-green border border-sfl-green/40 px-2 py-0.5 rounded text-[10px] font-bold">🟢 SOLD</span>`
      : `<span class="bg-blue-100 text-blue-800 border border-blue-400/40 px-2 py-0.5 rounded text-[10px] font-bold">🔵 BOUGHT</span>`;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-mono text-sfl-wood font-medium whitespace-nowrap">${dateStr}</td>
      <td class="px-2 py-2.5 whitespace-nowrap">${typeBadge}</td>
      <td class="px-3 py-2.5 font-bold text-sfl-dirt">${itemName}</td>
      <td class="px-2 py-2.5 font-mono font-bold text-sfl-wood">${qty}</td>
      <td class="px-2 py-2.5 font-mono text-sfl-woodLight">${unitPrice.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-2.5 py-2.5 font-mono font-bold text-sfl-accent">${feeVal > 0 ? `-${feeVal.toFixed(3)}` : '0.000'}</td>
      <td class="px-3 py-2.5 font-mono font-bold ${isSeller ? 'text-sfl-green' : 'text-sfl-wood'}">${isSeller ? '+' : '-'}${totalPrice.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
    `;
    tbody.appendChild(tr);
  });
}
