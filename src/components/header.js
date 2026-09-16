export function renderHeader() {
  const container = document.getElementById('header-mount');
  if (!container) return;

  const isDark = document.documentElement.classList.contains('dark');

  container.innerHTML = `
    <div class="space-y-3">
      <!-- HEADER BANNER & SUBTITLE -->
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="hidden sm:block w-28"></div>

        <div class="text-center space-y-1">
          <div class="inline-block bg-sfl-wood text-amber-200 border-2 border-sfl-dirt px-6 py-1.5 rounded-full shadow-md">
            <h1 class="text-2xl sm:text-4xl font-pixel tracking-wider font-bold text-amber-300 flex items-center gap-2 justify-center">
              <span>🌻</span> SFL RESOURCE CALCULATOR
            </h1>
          </div>
          <p class="text-xs font-semibold text-sfl-woodLight">Live SFL market prices, NFT wishlist & automated crop tracker</p>
        </div>

        <div class="sm:self-start flex items-center gap-3">
          <!-- THEME TOGGLE BUTTON -->
          <button id="theme-toggle-btn" class="bg-sfl-wood text-amber-200 border-2 border-sfl-dirt hover:bg-sfl-woodLight px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>${isDark ? '☀️' : '🌙'}</span>
            <span>${isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button id="donate-btn" class="text-xs font-bold text-white hover:text-amber-700 transition underline cursor-pointer bg-transparent border-none p-0 whitespace-nowrap">
            Donate
          </button>
        </div>
      </div>

      <!-- COMPACT COLLAPSIBLE GUIDE BOX AT THE TOP OF PAGE -->
      <details class="group bg-amber-50/90 dark:bg-amber-950/40 border-2 border-sfl-cardBorder rounded-xl p-2 sm:p-2.5 text-xs text-sfl-wood shadow-xs transition-all">
        <summary class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 cursor-pointer list-none select-none font-bold text-xs sm:text-sm text-sfl-wood">
          <div class="flex items-center gap-1.5">
            <span>📖</span>
            <span>How to Use SFL Calculator</span>
            <span class="text-[10px] text-sfl-woodLight font-normal ml-1 group-open:hidden">(click to expand)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>🖥️</span> Tip: Desktop Mode recommended on mobile
            </span>
            <span class="text-xs transition-transform duration-200 group-open:rotate-180">▼</span>
          </div>
        </summary>

        <div class="mt-2 pt-2 border-t border-sfl-cardBorder/50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-sfl-woodLight">
          <div class="bg-white/70 dark:bg-amber-950/30 p-2 rounded-lg border border-sfl-cardBorder/40 space-y-0.5">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">1. Link Farm & Sync</span>
            <p>Enter your <strong>Farm ID</strong> and click <strong>🔄 Sync Data</strong> to load resources, trades & dashboard.</p>
          </div>
          <div class="bg-white/70 dark:bg-amber-950/30 p-2 rounded-lg border border-sfl-cardBorder/40 space-y-0.5">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">2. Set Targets & Ratios</span>
            <p>Configure your 🪙:🌸 ratio, tax rate, and wishlist goals under <strong>NFT Wishlist</strong>.</p>
          </div>
          <div class="bg-white/70 dark:bg-amber-950/30 p-2 rounded-lg border border-sfl-cardBorder/40 space-y-0.5">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">3. Automated Analytics</span>
            <p>Track Day / 7 Days / Month resources earned, spent, and trades ledger with live valuations.</p>
          </div>
        </div>
      </details>
    </div>
  `;

  bindThemeEvents();
}

function bindThemeEvents() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    
    if (isCurrentlyDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sfl_theme', 'light');
      toggleBtn.innerHTML = `<span>🌙</span><span>Dark</span>`;
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sfl_theme', 'dark');
      toggleBtn.innerHTML = `<span>☀️</span><span>Light</span>`;
    }
  });
}
