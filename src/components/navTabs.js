export function renderNavTabs() {
  const container = document.getElementById('tabs-mount');
  if (!container) return;

  container.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 border-b-2 border-sfl-cardBorder pb-2">
      <button id="tab-calc-btn" class="bg-sfl-wood text-amber-200 px-4 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-1.5 cursor-pointer">
        <span>🌾</span> Daily Tracker
      </button>
      <button id="tab-croptracker-btn" class="bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-1.5 cursor-pointer">
        <span>🌱</span> Crop Tracker V1
      </button>
      <button id="tab-tradehistory-btn" class="bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-1.5 cursor-pointer">
        <span>📜</span> Trade History
      </button>
      <button id="tab-npc-btn" class="bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-1.5 cursor-pointer">
        <span>🎁</span> NPC Gifts
      </button>
      <button id="tab-wishlist-btn" class="bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-1.5 cursor-pointer">
        <span>⭐</span> NFT Wishlist
      </button>
    </div>
  `;
}
