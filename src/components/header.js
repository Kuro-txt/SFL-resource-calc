export function renderHeader() {
  const container = document.getElementById('header-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3">
      <!-- HEADER BANNER & SUBTITLE -->
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="hidden sm:block w-16"></div>

        <div class="text-center space-y-1">
          <div class="inline-block bg-sfl-wood text-amber-200 border-2 border-sfl-dirt px-6 py-1.5 rounded-full shadow-md">
            <h1 class="text-2xl sm:text-4xl font-pixel tracking-wider font-bold text-amber-300 flex items-center gap-2 justify-center">
              <span>🌻</span> SFL RESOURCE CALCULATOR
            </h1>
          </div>
          <p class="text-xs font-semibold text-sfl-woodLight">Live SFL market prices, NFT wishlist & farm inventory tracker</p>
        </div>

        <div class="sm:self-start">
          <button id="donate-btn" class="text-xs font-bold text-white hover:text-amber-700 transition underline cursor-pointer bg-transparent border-none p-0 whitespace-nowrap">
            Donate
          </button>
        </div>
      </div>

      <!-- GUIDE BOX AT THE TOP OF PAGE -->
      <div class="bg-amber-50/90 border-2 border-sfl-cardBorder rounded-xl p-3.5 text-xs text-sfl-wood space-y-2.5 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-sfl-cardBorder/50 pb-2">
          <p class="font-bold flex items-center gap-1.5 text-sfl-wood text-sm">
            <span>📖</span> Quick Start & Tracking Timeline Guide
          </p>
          <span class="bg-amber-200/90 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span>🖥️</span> <strong>Tip:</strong> Use Desktop Mode on mobile for the best view!
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-sfl-woodLight">
          <div class="bg-white/60 p-2.5 rounded-lg border border-sfl-cardBorder/40 space-y-1">
            <span class="font-bold text-sfl-dirt block">1. Sign In & Link Farm</span>
            <p><strong>Sign up/in above</strong> and enter your <strong>Farm ID</strong>. Add items under <strong class="text-amber-800">"⚙️ Manage Tracking Targets"</strong> for inventory tracking.</p>
          </div>

          <div class="bg-white/60 p-2.5 rounded-lg border border-sfl-cardBorder/40 space-y-1">
            <span class="font-bold text-sfl-dirt block">2. Starting Baseline (00:00 UTC)</span>
            <p>Tracking begins at the next <strong>00:00 UTC snapshot</strong>. If you sign up mid-day, live tracking and diffs activate right after tonight's 00:00 UTC cron runs.</p>
          </div>

          <div class="bg-white/60 p-2.5 rounded-lg border border-sfl-cardBorder/40 space-y-1">
            <span class="font-bold text-sfl-dirt block">3. Live Diffs & 22:00 UTC Yields</span>
            <p>Once baseline is active, click <strong class="text-sfl-green">"🔄 Check Live Today"</strong> anytime. Daily totals & weekly summaries save automatically at <strong>22:00 UTC</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
