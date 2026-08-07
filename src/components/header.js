export function renderHeader() {
  const container = document.getElementById('header-mount');
  if (!container) return;

  container.innerHTML = `
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
  `;
}
