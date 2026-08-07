export function renderNavTabs() {
  const container = document.getElementById('tabs-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center gap-2 border-b-2 border-sfl-cardBorder pb-2">
      <button id="tab-calc-btn" class="bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer">
        <span>🧺</span> Calculator & Daily Tracker
      </button>
      <button id="tab-wishlist-btn" class="bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer">
        <span>⭐</span> NFT Wishlist
      </button>
    </div>
  `;
}
