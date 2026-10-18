import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

export function renderPetsTemplate() {
  const container = document.getElementById('pets-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">

      <!-- HEADER BANNER & ACTIONS -->
      <div class="bg-sfl-card/90 dark:bg-slate-900/80 p-3 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 shadow-xs">
        <div>
          <h3 class="text-xs font-bold text-sfl-wood dark:text-amber-300 uppercase flex items-center gap-1.5">
            <span>🐾</span> Pet Energy & Diet Cost Calculator
          </h3>
          <p class="text-[10.5px] text-sfl-woodLight dark:text-slate-400 font-medium">
            Find the cheapest energy per SFL, track diet costs, and simulate resource fetching.
          </p>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <!-- UTC RESET COUNTDOWN -->
          <div class="bg-amber-100/90 dark:bg-slate-800/90 border border-amber-300/70 dark:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] text-sfl-dirt dark:text-amber-100">
            <span class="text-orange-500 font-bold">⏳ Reset:</span>
            <span id="pets-utc-reset-timer" class="font-mono font-bold text-sfl-wood dark:text-amber-200">--:--</span>
            <span class="text-[9.5px] text-sfl-woodLight dark:text-slate-400">(UTC)</span>
          </div>

          <!-- REFRESH BUTTON -->
          <button type="button" id="pets-refresh-btn"
            class="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold px-2.5 py-1 rounded-lg border border-emerald-800 shadow-xs transition cursor-pointer flex items-center gap-1 text-[11px] whitespace-nowrap"
            title="Refresh pet data">
            <span id="pets-refresh-icon">🔄</span>
            <span>Sync</span>
          </button>
        </div>
      </div>

      <!-- COMPACT KPI METRICS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">🐾</div>
          <div>
            <div class="text-[9px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Pets</div>
            <div id="pets-stat-count" class="text-sm font-extrabold text-sfl-wood dark:text-amber-200">0</div>
          </div>
        </div>

        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">⚡</div>
          <div>
            <div class="text-[9px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Total Energy</div>
            <div id="pets-stat-energy" class="text-sm font-extrabold text-amber-600 dark:text-amber-300">0 ⚡</div>
          </div>
        </div>

        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">🍲</div>
          <div>
            <div class="text-[9px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Pending Foods</div>
            <div id="pets-stat-pending-food" class="text-sm font-extrabold text-orange-600 dark:text-orange-300">0</div>
          </div>
        </div>

        <div class="bg-sfl-card/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">🎯</div>
          <div>
            <div class="text-[9px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Best Cost/⚡</div>
            <div id="pets-stat-best-efficiency" class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
              0.0000 SFL
            </div>
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="bg-sfl-card/70 dark:bg-slate-900/60 p-2 rounded-xl border border-sfl-cardBorder dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div class="flex flex-wrap items-center gap-1 w-full sm:w-auto" id="pets-filter-buttons">
          <button type="button" data-filter="all" class="pets-filter-btn bg-sfl-wood text-amber-200 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-sfl-dirt cursor-pointer transition">
            All Pets
          </button>
          <button type="button" data-filter="common" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            Common
          </button>
          <button type="button" data-filter="rare" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            Rare/NFT
          </button>
          <button type="button" data-filter="hungry" class="pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition">
            🍲 Hungry
          </button>
        </div>

        <div class="w-full sm:w-56">
          <input type="text" id="pets-search-input" placeholder="Search pet, category or food..."
            class="sfl-input w-full rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-100 focus:ring-1 focus:ring-sfl-gold placeholder:text-sfl-woodLight/60">
        </div>
      </div>

      <!-- PETS CARDS CONTAINER (3-COLUMN DENSE GRID) -->
      <div id="pets-cards-container" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <!-- Rendered dynamically -->
      </div>

      <!-- LOCAL ENERGY & DIET COST LEDGER (LOCAL STORAGE ONLY) -->
      <div class="bg-sfl-card/90 dark:bg-slate-900/90 rounded-xl border border-sfl-cardBorder dark:border-slate-800 p-3 space-y-3 shadow-xs">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-sfl-cardBorder/60 dark:border-slate-800 pb-2">
          <div>
            <h4 class="text-xs font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-1.5 uppercase">
              <span>⚡</span> Diet Cost & Energy Ledger
            </h4>
            <p class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-medium">
              Saved locally to your browser. Tracks energy gained vs SFL spent over time.
            </p>
          </div>

          <!-- TIME-PERIOD TOGGLES -->
          <div class="flex items-center gap-1 bg-amber-100/70 dark:bg-slate-800 p-0.5 rounded-lg border border-amber-300/60 dark:border-slate-700" id="pets-ledger-period-toggles">
            <button type="button" data-period="daily" class="ledger-period-btn bg-sfl-wood text-amber-200 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition">
              Daily
            </button>
            <button type="button" data-period="weekly" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition">
              Weekly
            </button>
            <button type="button" data-period="monthly" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition">
              Monthly
            </button>
            <button type="button" data-period="all" class="ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition">
              All Time
            </button>
          </div>
        </div>

        <!-- LEDGER SUMMARY METRICS -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-2 rounded-lg border border-amber-200/80 dark:border-slate-700">
            <div class="text-[9px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">⚡ Energy</div>
            <div id="ledger-total-energy" class="text-xs font-extrabold text-amber-600 dark:text-amber-300 mt-0.5">0</div>
          </div>
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-2 rounded-lg border border-amber-200/80 dark:border-slate-700">
            <div class="text-[9px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">🌸 Spent (SFL)</div>
            <div id="ledger-total-cost" class="text-xs font-extrabold text-sfl-green dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>0.0000</span> ${FLOWER_IMG_SMALL_HTML}
            </div>
          </div>
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-2 rounded-lg border border-amber-200/80 dark:border-slate-700">
            <div class="text-[9px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">🎯 Cost/⚡</div>
            <div id="ledger-avg-efficiency" class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              0.000000
            </div>
          </div>
        </div>

        <!-- FEEDING ENTRIES TABLE -->
        <div class="overflow-x-auto rounded-lg border border-sfl-cardBorder/60 dark:border-slate-800">
          <table class="w-full text-left text-xs font-semibold">
            <thead class="bg-amber-100/80 dark:bg-slate-800/80 text-sfl-wood dark:text-amber-200 uppercase text-[9.5px] border-b border-sfl-cardBorder/60 dark:border-slate-700">
              <tr>
                <th class="p-2">Date</th>
                <th class="p-2">Pet</th>
                <th class="p-2">Foods Fed</th>
                <th class="p-2 text-right">Energy</th>
                <th class="p-2 text-right">SFL</th>
                <th class="p-2 text-right">Cost/⚡</th>
              </tr>
            </thead>
            <tbody id="pets-ledger-table-body" class="divide-y divide-sfl-cardBorder/30 dark:divide-slate-800 text-[11px]">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;
}
