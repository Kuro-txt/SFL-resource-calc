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

      <!-- COMPACT GUIDE BOX AT THE TOP OF PAGE -->
      <div class="bg-amber-50/90 border-2 border-sfl-cardBorder rounded-xl p-2.5 sm:p-3 text-xs text-sfl-wood space-y-2 shadow-xs">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-sfl-cardBorder/50 pb-1.5">
          <p class="font-bold flex items-center gap-1.5 text-sfl-wood text-xs sm:text-sm">
            <span>📖</span> Quick Start & Automated Schedule
          </p>
          <span class="bg-amber-200/90 text-amber-900 border border-amber-400 text-[10px] font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
            <span>🖥️</span> <strong>Tip:</strong> Desktop Mode recommended on mobile
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-sfl-woodLight">
          <div class="bg-white/70 dark:bg-amber-950/30 p-2 rounded-lg border border-sfl-cardBorder/40 space-y-0.5">
            <span class="font-bold text-sfl-dirt block text-xs">1. Link Farm & Sign In</span>
            <p>Enter your <strong>Farm ID</strong> and sign in to activate automated cloud tracking & trade archiving.</p>
          </div>
          <div class="bg-white/70 dark:bg-amber-950/30 p-2 rounded-lg border border-sfl-cardBorder/40 space-y-0.5">
            <span class="font-bold text-sfl-dirt block text-xs">2. Daily Crop Tracker</span>
            <p>Snapshot at <strong>21:50 UTC</strong>; daily yields calculate at <strong>22:00 UTC</strong> with live multipliers.</p>
          </div>
          <div class="bg-amber-100/80 dark:bg-amber-900/40 p-2 rounded-lg border border-amber-300 dark:border-amber-700/50 space-y-0.5">
            <span class="font-bold text-amber-950 dark:text-amber-200 block text-xs">3. Trade Auto-Sync (4x Daily)</span>
            <p class="text-amber-900 dark:text-amber-300">Syncs at <strong>00:33, 06:33, 12:33, 18:33 UTC</strong> with exact API tax-deducted net profit.</p>
          </div>
        </div>
      </div>
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
