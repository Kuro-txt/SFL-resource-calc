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

      <!-- GUIDE BOX AT THE TOP OF PAGE -->
      <div class="bg-amber-50/90 border-2 border-sfl-cardBorder rounded-xl p-3.5 text-xs text-sfl-wood space-y-2.5 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-sfl-cardBorder/50 pb-2">
          <p class="font-bold flex items-center gap-1.5 text-sfl-wood text-sm">
            <span>📖</span> Quick Start Guide & Tracking Schedule
          </p>
          <span class="bg-amber-200/90 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span>🖥️</span> <strong>Tip:</strong> Use Desktop Mode on mobile for the best view!
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-sfl-woodLight">
          <div class="bg-white/60 p-2.5 rounded-lg border border-sfl-cardBorder/40 space-y-1">
            <span class="font-bold text-sfl-dirt block">1. Sign In & Link Farm</span>
            <p><strong>Signing in is required</strong> for cloud backups and automated tracking. Enter your email, password & Farm ID at the top.</p>
          </div>
          <div class="bg-white/60 p-2.5 rounded-lg border border-sfl-cardBorder/40 space-y-1">
            <span class="font-bold text-sfl-dirt block">2. Targets & Multipliers</span>
            <p>Select tracking targets under <strong class="text-amber-800">"⚙️ Manage Tracking Targets"</strong> and set your <strong>Avg Yield per Plot</strong> in Crop Tracker v1.</p>
          </div>
          <div class="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300 space-y-1">
            <span class="font-bold text-amber-950 block">⏱️ When Will Yields Show?</span>
            <p class="text-amber-900"><strong>Signed up today?</strong> Your first baseline logs at <strong>00:00 UTC</strong>. Live tracking activates right after 00:00 UTC, and official daily logs save at <strong>22:00 UTC</strong>.</p>
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
