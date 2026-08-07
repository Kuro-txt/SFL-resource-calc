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
          <p class="text-xs font-semibold text-sfl-woodLight">Live SFL market prices, NFT wishlist & farm inventory tool</p>
        </div>

        <div class="sm:self-start">
          <button id="donate-btn" class="text-xs font-bold text-white hover:text-amber-700 transition underline cursor-pointer bg-transparent border-none p-0 whitespace-nowrap">
            Donate
          </button>
        </div>
      </div>

      <!-- GUIDE BOX AT THE TOP OF PAGE -->
      <div class="bg-amber-50/90 border-2 border-sfl-cardBorder rounded-xl p-3.5 text-xs text-sfl-wood space-y-2 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-sfl-cardBorder/50 pb-2">
          <p class="font-bold flex items-center gap-1.5 text-sfl-wood">
            <span>📖</span> How to Save Snapshots & Log Daily Yields:
          </p>
          <span class="bg-amber-200/90 text-amber-900 border border-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span>🖥️</span> <strong>Tip:</strong> Enable Desktop Mode on mobile browsers for optimal experience!
          </span>
        </div>

        <ul class="list-disc list-inside space-y-1 text-[11px] text-sfl-woodLight font-medium pl-1">
          <li><strong>Automatic 00:00 UTC Snapshot:</strong> When signed in, our server automatically records your complete farm inventory at 00:00 UTC every night!</li>
          <li><strong>Automated 22:00 UTC Calculation:</strong> Our server automatically calculates daily earnings at 22:00 UTC for items selected under <span class="text-amber-800 font-bold">"⚙️ Manage Automated Tracking Targets"</span>.</li>
          <li><strong>Manual Calculation Anytime:</strong> Sync your farm inventory, add items to your basket, save a baseline, and click <span class="text-sfl-green font-bold">"🏁 2. Calculate Harvest Yield"</span>.</li>
        </ul>
      </div>
    </div>
  `;
}
