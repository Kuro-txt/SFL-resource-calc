import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

export function renderPetsTemplate() {
  const container = document.getElementById('pets-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">

      <!-- HEADER BANNER & ACTIONS -->
      <div class="bg-sfl-card/90 dark:bg-slate-900/80 p-4 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood dark:text-amber-300 uppercase flex items-center gap-2">
            <span>🐾</span> Pet Energy & Diet Cost Calculator
          </h3>
          <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold mt-0.5">
            Optimize your pet diet to get the cheapest Energy per SFL, track historical feeding costs, and simulate resource fetching capacity.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- UTC RESET COUNTDOWN -->
          <div class="bg-amber-100/90 dark:bg-slate-800/90 border border-amber-300 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-sfl-dirt dark:text-amber-100">
            <span class="text-orange-500 font-bold">⏳ Reset:</span>
            <span id="pets-utc-reset-timer" class="font-mono font-extrabold text-sfl-wood dark:text-amber-200">--:--:--</span>
            <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-semibold">(00:00 UTC)</span>
          </div>

          <!-- REFRESH / SYNC BUTTON -->
          <button type="button" id="pets-refresh-btn"
            class="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:translate-y-0.5 text-white font-bold px-3 py-1.5 rounded-lg border border-emerald-800 shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs whitespace-nowrap"
            title="Refresh pet data from live farm sync">
            <span id="pets-refresh-icon">🔄</span>
            <span>Sync Pets</span>
          </button>
        </div>
      </div>

      <!-- SUMMARY KPI METRICS: FOCUS ON ENERGY & COSTS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Total Pets & Level -->
        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-3 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
            🐾
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Active Pets</div>
            <div id="pets-stat-count" class="text-base font-extrabold text-sfl-wood dark:text-amber-200">0</div>
          </div>
        </div>

        <!-- Cumulative Energy -->
        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-3 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Total Energy</div>
            <div id="pets-stat-energy" class="text-base font-extrabold text-amber-600 dark:text-amber-300">0 ⚡</div>
          </div>
        </div>

        <!-- Pending Food Requests -->
        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-3 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
            🍲
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Pending Foods</div>
            <div id="pets-stat-pending-food" class="text-base font-extrabold text-orange-600 dark:text-orange-300">0</div>
          </div>
        </div>

        <!-- Average Cost per Energy -->
        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-3 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Best Cost / Energy</div>
            <div id="pets-stat-best-efficiency" class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 truncate mt-1">
              0.0000 SFL/⚡
            </div>
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="bg-sfl-card/70 dark:bg-slate-900/60 p-3 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
        <!-- Category Filter Buttons -->
        <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto" id="pets-filter-buttons">
          <button type="button" data-filter="all" class="pets-filter-btn bg-sfl-wood text-amber-200 px-3 py-1 rounded-lg text-xs font-bold border border-sfl-dirt cursor-pointer transition">
            All Pets
          </button>
          <button type="button" data-filter="common" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            Common
          </button>
          <button type="button" data-filter="rare" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            Rare / NFT
          </button>
          <button type="button" data-filter="hungry" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            🍲 Needs Food
          </button>
        </div>

        <!-- Search Input -->
        <div class="w-full sm:w-64">
          <input type="text" id="pets-search-input" placeholder="Search pet, category or food..."
            class="sfl-input w-full rounded-lg px-3 py-1.5 text-xs font-bold text-sfl-dirt dark:text-amber-100 focus:ring-1 focus:ring-sfl-gold placeholder:text-sfl-woodLight/60">
        </div>
      </div>

      <!-- PETS CARDS CONTAINER -->
      <div id="pets-cards-container" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Rendered dynamically -->
      </div>

      <!-- ENERGY & DIET COST LEDGER (DAILY / WEEKLY / MONTHLY) -->
      <div class="bg-sfl-card/90 dark:bg-slate-900/90 rounded-2xl border-2 border-sfl-cardBorder dark:border-slate-800 p-4 space-y-4 shadow-sm">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-sfl-cardBorder/60 dark:border-slate-800 pb-3">
          <div>
            <h4 class="text-sm font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-2 uppercase">
              <span>⚡</span> Pet Energy & Diet Cost Ledger
            </h4>
            <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold">
              Track energy gained against the market/crafting cost of foods fed across Daily, Weekly, and Monthly cycles.
            </p>
          </div>

          <!-- TIME-PERIOD TOGGLES (DAILY / WEEKLY / MONTHLY) -->
          <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-slate-800 p-1 rounded-xl border border-amber-300/60 dark:border-slate-700" id="pets-ledger-period-toggles">
            <button type="button" data-period="daily" class="ledger-period-btn bg-sfl-wood text-amber-200 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition">
              Daily
            </button>
            <button type="button" data-period="weekly" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition">
              Weekly
            </button>
            <button type="button" data-period="monthly" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition">
              Monthly
            </button>
            <button type="button" data-period="all" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition">
              All Time
            </button>
          </div>
        </div>

        <!-- LEDGER SUMMARY METRICS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700">
            <div class="text-[10px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">⚡ Total Energy Harvested</div>
            <div id="ledger-total-energy" class="text-base font-extrabold text-amber-600 dark:text-amber-300 mt-0.5">0</div>
          </div>
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700">
            <div class="text-[10px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">🌸 Total Diet Cost (SFL)</div>
            <div id="ledger-total-cost" class="text-base font-extrabold text-sfl-green dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>0.0000</span> ${FLOWER_IMG_SMALL_HTML}
            </div>
          </div>
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700">
            <div class="text-[10px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">🎯 Avg Cost Per Energy</div>
            <div id="ledger-avg-efficiency" class="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
              0.000000 SFL/⚡
            </div>
          </div>
        </div>

        <!-- FEEDING ENTRIES TABLE -->
        <div class="overflow-x-auto rounded-xl border border-sfl-cardBorder/60 dark:border-slate-800">
          <table class="w-full text-left text-xs font-semibold">
            <thead class="bg-amber-100/80 dark:bg-slate-800/80 text-sfl-wood dark:text-amber-200 uppercase text-[10px] border-b border-sfl-cardBorder/60 dark:border-slate-700">
              <tr>
                <th class="p-2.5">Date / Time</th>
                <th class="p-2.5">Pet</th>
                <th class="p-2.5">Foods Fed</th>
                <th class="p-2.5 text-right">Energy Gained</th>
                <th class="p-2.5 text-right">Cost (SFL)</th>
                <th class="p-2.5 text-right">Efficiency</th>
              </tr>
            </thead>
            <tbody id="pets-ledger-table-body" class="divide-y divide-sfl-cardBorder/30 dark:divide-slate-800">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;
}
