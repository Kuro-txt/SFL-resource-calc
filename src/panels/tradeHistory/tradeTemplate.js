import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML } from '../../config/constants.js';

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

      <!-- 4 TIME-HORIZON SUMMARY CARDS (TODAY / WEEK / MONTH / CLOUD LEDGER) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <!-- CARD 1: TODAY -->
        <div class="bg-white/90 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-sfl-cardBorder/60 pb-1.5 mb-2">
            <span class="text-xs font-bold text-sfl-wood flex items-center gap-1">
              <span>📅</span> Today's Trading
            </span>
            <span id="trade-metric-today-count" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-sfl-dirt border border-amber-300">0 trades</span>
          </div>
          <div class="mb-2">
            <span class="text-[9px] font-bold text-sfl-woodLight uppercase block">Today Net Profit</span>
            <span id="trade-metric-today-net" class="text-lg font-black text-sfl-wood font-mono">+0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1.5 border-t border-sfl-cardBorder/40">
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Sales</span>
              <span id="trade-metric-today-sales" class="font-bold text-sfl-green font-mono">+0.000</span>
            </div>
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Purchases</span>
              <span id="trade-metric-today-buys" class="font-bold text-sfl-wood font-mono">-0.000</span>
            </div>
          </div>
        </div>

        <!-- CARD 2: WEEK -->
        <div class="bg-white/90 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-sfl-cardBorder/60 pb-1.5 mb-2">
            <span class="text-xs font-bold text-sfl-wood flex items-center gap-1">
              <span>📊</span> Weekly (Mon–Sun)
            </span>
            <span id="trade-metric-week-count" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-sfl-dirt border border-amber-300">0 trades</span>
          </div>
          <div class="mb-2">
            <span class="text-[9px] font-bold text-sfl-woodLight uppercase block">Mon – Sun Net Profit</span>
            <span id="trade-metric-week-net" class="text-lg font-black text-sfl-wood font-mono">+0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1.5 border-t border-sfl-cardBorder/40">
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Sales</span>
              <span id="trade-metric-week-sales" class="font-bold text-sfl-green font-mono">+0.000</span>
            </div>
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Purchases</span>
              <span id="trade-metric-week-buys" class="font-bold text-sfl-wood font-mono">-0.000</span>
            </div>
          </div>
        </div>

        <!-- CARD 3: MONTH -->
        <div class="bg-white/90 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-sfl-cardBorder/60 pb-1.5 mb-2">
            <span class="text-xs font-bold text-sfl-wood flex items-center gap-1">
              <span>🗓️</span> Monthly Trading
            </span>
            <span id="trade-metric-month-count" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-sfl-dirt border border-amber-300">0 trades</span>
          </div>
          <div class="mb-2">
            <span class="text-[9px] font-bold text-sfl-woodLight uppercase block">This Month Net Profit</span>
            <span id="trade-metric-month-net" class="text-lg font-black text-sfl-wood font-mono">+0.000 ${FLOWER_IMG_SMALL_HTML}</span>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1.5 border-t border-sfl-cardBorder/40">
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Sales</span>
              <span id="trade-metric-month-sales" class="font-bold text-sfl-green font-mono">+0.000</span>
            </div>
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Purchases</span>
              <span id="trade-metric-month-buys" class="font-bold text-sfl-wood font-mono">-0.000</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: CLOUD ARCHIVE -->
        <div class="bg-white/90 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-sfl-cardBorder/60 pb-1.5 mb-2">
            <span class="text-xs font-bold text-sfl-wood flex items-center gap-1">
              <span>☁️</span> Cloud Ledger
            </span>
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-green-100 text-sfl-green border border-green-300">TiDB Synced</span>
          </div>
          <div class="mb-2">
            <span class="text-[9px] font-bold text-sfl-woodLight uppercase block">Trades Saved</span>
            <span id="trade-metric-total-trades" class="text-lg font-black text-sfl-dirt font-mono">0</span>
          </div>
          <div class="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1.5 border-t border-sfl-cardBorder/40">
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Total Sales</span>
              <span id="trade-metric-lifetime-sales" class="font-bold text-sfl-green font-mono">+0.000</span>
            </div>
            <div>
              <span class="text-[9px] text-sfl-woodLight block font-sans font-bold">Total Buys</span>
              <span id="trade-metric-lifetime-buys" class="font-bold text-sfl-wood font-mono">-0.000</span>
            </div>
          </div>
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
