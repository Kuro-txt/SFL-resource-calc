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

          <!-- OPT-OUT BUTTON -->
          <button type="button" id="pets-opt-out-btn"
            class="bg-amber-100/70 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950/40 text-sfl-woodLight hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300 font-bold px-2 py-1 rounded-lg border border-amber-300/60 dark:border-slate-700 text-[10.5px] transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
            title="Opt out or disable pet tracking">
            <span>⚙️</span>
            <span>Opt Out</span>
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
            <div class="text-[9px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Best Cost/100⚡</div>
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

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <!-- WALRUS ONESIE BOOST TOGGLE -->
          <label class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-amber-300/70 dark:border-slate-700 cursor-pointer select-none transition shrink-0" title="Walrus Onesie wearable adds +5 Energy to all pet food requests">
            <input type="checkbox" id="pets-walrus-onesie-toggle" class="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer">
            <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-1">
              <span>🦭</span> Walrus Onesie <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">(+5⚡)</span>
            </span>
          </label>

          <div class="w-full sm:w-56">
            <input type="text" id="pets-search-input" placeholder="Search pet, category or food..."
              class="sfl-input w-full rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-100 focus:ring-1 focus:ring-sfl-gold placeholder:text-sfl-woodLight/60">
          </div>
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
            <div class="text-[9px] font-bold text-sfl-woodLight dark:text-slate-400 uppercase">🎯 Cost/100⚡</div>
            <div id="ledger-avg-efficiency" class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              0.0000 SFL
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
                <th class="p-2 text-right">Cost/100⚡</th>
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

export function renderPetsOptInGate() {
  const container = document.getElementById('pets-section');
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto py-4 px-2">
      <div class="bg-sfl-card/95 dark:bg-slate-900/95 rounded-2xl border-2 border-sfl-cardBorder dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl text-center">
        
        <!-- ICON & BADGE -->
        <div class="flex flex-col items-center gap-2">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 dark:from-amber-600 dark:to-amber-800 flex items-center justify-center text-3xl shadow-inner border border-amber-300">
            🐾
          </div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-200 text-xs font-extrabold uppercase border border-amber-300/60 dark:border-slate-700">
            <span>✨</span> Beta Feature • Optional Opt-In
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-sfl-wood dark:text-amber-200 uppercase tracking-tight">
            Pet Energy & Economics Tracker
          </h2>
          <p class="text-xs sm:text-sm text-sfl-woodLight dark:text-slate-300 max-w-lg">
            Track daily pet food costs in SFL, calculate cost per 100 energy, discover the cheapest dishes to cook, and simulate resource fetching yields.
          </p>
        </div>

        <!-- FEATURE HIGHLIGHTS GRID -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
            <span class="text-xl shrink-0">⚡</span>
            <div>
              <div class="text-xs font-bold text-sfl-wood dark:text-amber-200">Cost per 100⚡</div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-medium">Exact SFL required per 100 energy gained from requested foods.</p>
            </div>
          </div>

          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
            <span class="text-xl shrink-0">⭐</span>
            <div>
              <div class="text-xs font-bold text-sfl-wood dark:text-amber-200">Best Value Dishes</div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-medium">Flags the most budget-friendly meals using current market and recipe crafting prices.</p>
            </div>
          </div>

          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
            <span class="text-xl shrink-0">🏹</span>
            <div>
              <div class="text-xs font-bold text-sfl-wood dark:text-amber-200">Fetching Simulator</div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-medium">Simulates ready fetches and decimal bonus yields for Acorns, Category items, and Fossil Shells.</p>
            </div>
          </div>

          <div class="bg-amber-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
            <span class="text-xl shrink-0">📊</span>
            <div>
              <div class="text-xs font-bold text-sfl-wood dark:text-amber-200">Local Diet Ledger</div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-medium">Tracks foods fed, energy gained, and total SFL spent across Daily, Weekly, and Monthly cycles.</p>
            </div>
          </div>
        </div>

        <!-- PRIVACY / LOCAL NOTE -->
        <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-2.5 rounded-xl text-left flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-200">
          <span class="text-base shrink-0">🔒</span>
          <span><strong>100% Client-Side & Private:</strong> This feature does not connect to any cloud server or external database. All feeding history is stored strictly in your browser. You can opt out at any time.</span>
        </div>

        <!-- OPT-IN ACTION BUTTON -->
        <div class="pt-2">
          <button type="button" id="pets-opt-in-btn"
            class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-600 text-amber-100 font-black text-sm rounded-xl border-2 border-amber-900 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 mx-auto">
            <span>🐾</span>
            <span>Opt In & Activate Pet Tracker</span>
          </button>
        </div>

      </div>
    </div>
  `;
}
