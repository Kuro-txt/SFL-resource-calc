import { BACKEND_URL } from '../config/constants.js';
import { ApiService } from '../services/api.js';

let allNfts = [];
try {
  allNfts = JSON.parse(localStorage.getItem('sfl_nft_catalog') || '[]');
} catch (_) {}
let wishlistItems = [];
try {
  wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');
} catch (_) { wishlistItems = []; }

export function getFlowerUsdRate() {
  // 1. If user selected a specific gem pack at top, calculate USD per flower from that pack:
  try {
    const gemData = localStorage.getItem('sfl_selected_gem_data');
    if (gemData) {
      const parsed = JSON.parse(gemData);
      const totalSfl = parseFloat(parsed.effectiveTotalSfl || parsed.sfl);
      const totalUsd = parseFloat(parsed.effectiveUsd || parsed.usd);
      if (totalSfl > 0 && totalUsd > 0) {
        return {
          rate: totalUsd / totalSfl,
          source: `💎 ${Number(parsed.gem).toLocaleString()} Gem Pack${parsed.discountActive ? ' (-20%)' : ''}`
        };
      }
    }
  } catch (_) {}

  // 2. Otherwise use live Flower USD rate from API
  let flowerRate = 0;
  if (typeof window !== 'undefined' && window.flowerUsdRate && window.flowerUsdRate > 0) {
    flowerRate = window.flowerUsdRate;
  }
  if (!flowerRate) {
    try {
      const saved = localStorage.getItem('sfl_flower_usd_rate');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) flowerRate = val;
      }
    } catch (_) {}
  }
  if (!flowerRate) {
    flowerRate = 0.13458; // SFL default
  }

  return {
    rate: flowerRate,
    source: 'Live SFL/USD Rate'
  };
}

export function formatUsdAmount(amount) {
  if (isNaN(amount) || amount <= 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function renderWishlistTemplate() {
  const container = document.getElementById('wishlist-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>⭐</span> NFT & Collectibles Wishlist
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">Track live floor prices, custom offers, boosts, and total cost of target items in Flowers & Dollars ($ USD).</p>
        </div>
        <button id="clear-wishlist-btn" class="bg-sfl-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-red-700 transition cursor-pointer">
          🗑️ Clear Wishlist
        </button>
      </div>

      <div class="bg-sfl-card/80 p-4 rounded-xl border-2 border-sfl-cardBorder space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label class="block text-xs font-bold uppercase tracking-wider text-sfl-wood">🔍 Search & Add SFL NFTs or Collectibles</label>
          <span id="wishlist-catalog-status" class="text-[10px] font-bold text-sfl-woodLight"></span>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div class="relative flex-1">
            <input type="text" id="wishlist-search-input" placeholder="Type or click to search NFT name or boost..." autocomplete="off" class="w-full sfl-input rounded-lg px-3 py-2 text-sm text-sfl-dirt focus:outline-none focus:ring-2 focus:ring-sfl-gold">
            <ul id="wishlist-search-menu" class="hidden absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-white border-2 border-sfl-woodLight rounded-lg shadow-xl z-30 divide-y divide-sfl-cardBorder/30 text-sm">
              <li class="p-2 text-sfl-woodLight italic text-xs">Click "Load Live NFTs" to search items.</li>
            </ul>
          </div>
          <button type="button" id="load-nfts-btn" class="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:translate-y-0.5 text-white font-black px-4 py-2 rounded-xl border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
            <svg id="load-nfts-icon" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span id="load-nfts-btn-text">Load Live NFTs</span>
          </button>
        </div>
      </div>

      <div class="overflow-x-auto bg-white/80 border-2 border-sfl-cardBorder rounded-xl shadow-sm">
        <table class="w-full text-left text-xs text-sfl-dirt">
          <thead class="bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood uppercase text-[11px]">
            <tr>
              <th class="px-3 py-2.5">NFT / Item Name</th>
              <th class="px-3 py-2.5">Boost / Description</th>
              <th class="px-3 py-2.5">Floor Price (🌸 / $)</th>
              <th class="px-3 py-2.5">Offer Price (🌸 / $)</th>
              <th class="px-2 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody id="wishlist-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-sfl-woodLight italic">
                Your wishlist is empty! Search above to add items.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-sfl-gold/20 dark:bg-slate-800/80 border-2 border-sfl-gold dark:border-amber-700/60 rounded-xl p-4 text-center shadow-inner space-y-2.5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 block">Saved Items</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-wood dark:text-amber-100 mt-0.5">
              <span id="wishlist-item-count">0 Items</span>
            </h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 dark:border-slate-700/60 pt-2 sm:pt-0 px-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 block">Total Floor Price</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
              <span id="wishlist-total-flowers">0.00</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
            <div class="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5" id="wishlist-total-floor-usd">
              $0.00 USD
            </div>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 dark:border-slate-700/60 pt-2 sm:pt-0 px-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-200 block">Total Offer Price</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-amber-700 dark:text-amber-300 mt-0.5 flex items-center justify-center gap-1">
              <span id="wishlist-total-offer">0.00</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
            <div class="text-xs font-bold text-amber-800 dark:text-amber-300 font-mono mt-0.5" id="wishlist-total-offer-usd">
              $0.00 USD
            </div>
          </div>
        </div>
        <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 pt-2 border-t border-sfl-cardBorder/30 dark:border-slate-700/60 flex items-center justify-center gap-2" id="wishlist-rate-note"></div>
      </div>
    </div>
  `;
}

export function initWishlistPanel() {
  renderWishlistTemplate();
  initNftCombobox();
  renderWishlist();
  updateCatalogStatus();

  document.getElementById('load-nfts-btn')?.addEventListener('click', () => loadNftCatalog(true));

  const clearBtn = document.getElementById('clear-wishlist-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearWishlist);
  }

  // Pre-load NFT catalog in background if not already cached
  if (allNfts.length === 0) {
    loadNftCatalog(false).catch(() => {});
  }

  // Listen for gem pack selection changes or live rate refreshes from authBar
  if (typeof window !== 'undefined' && !window._wishlistGemListenerBound) {
    window.addEventListener('gemPackChanged', () => {
      updateWishlistTotals();
      renderWishlist();
    });
    window._wishlistGemListenerBound = true;
  }
}

function updateCatalogStatus() {
  const btnText = document.getElementById('load-nfts-btn-text');
  const statusEl = document.getElementById('wishlist-catalog-status');
  if (allNfts.length > 0) {
    if (btnText) btnText.textContent = 'Refresh Prices';
    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-700 font-bold">✅ ${allNfts.length} NFTs Ready</span>`;
  } else {
    if (btnText) btnText.textContent = 'Load Live NFTs';
    if (statusEl) statusEl.innerHTML = `<span class="text-sfl-woodLight">Click button to fetch catalog</span>`;
  }
}

export async function loadNftCatalog(force = false) {
  const btn = document.getElementById('load-nfts-btn');
  const btnText = document.getElementById('load-nfts-btn-text');
  const icon = document.getElementById('load-nfts-icon');
  const statusEl = document.getElementById('wishlist-catalog-status');

  if (btn) {
    btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');
    if (btnText) btnText.textContent = 'Loading NFTs...';
  }
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-amber-700 animate-pulse font-bold">⏳ Fetching live prices & NFT floors...</span>`;
  }

  try {
    const data = await ApiService.getNfts({ force });
    if (Array.isArray(data) && data.length > 0) {
      allNfts = data;
      try {
        localStorage.setItem('sfl_nft_catalog', JSON.stringify(data));
      } catch (_) {}
    } else {
      throw new Error("Empty dataset");
    }

    wishlistItems.forEach(savedItem => {
      let match = allNfts.find(n => n.name.toLowerCase() === savedItem.name.toLowerCase());
      if (match) {
        savedItem.price = match.price;
        savedItem.boost = match.boost;
        if (savedItem.offerPrice === undefined) {
          savedItem.offerPrice = match.price;
        }
      }
    });

    saveWishlist();
    renderWishlist();

    if (btnText) btnText.textContent = 'Refresh Prices';
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-emerald-700 font-bold">✅ ${allNfts.length} Live NFTs Loaded</span>`;
    }
  } catch (err) {
    console.warn("⚠️ Failed to load NFT catalog:", err.message);
    if (btnText) btnText.textContent = 'Retry Loading';
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Failed to load. Click to retry.</span>`;
    }
    const menu = document.getElementById('wishlist-search-menu');
    if (menu && allNfts.length === 0) {
      menu.innerHTML = '<li class="p-2 text-sfl-accent italic text-xs">⚠️ Unable to load live NFTs. Please retry with the button above.</li>';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      if (icon) icon.classList.remove('animate-spin');
    }
  }
}

let isComboboxBound = false;

function initNftCombobox() {
  const input = document.getElementById('wishlist-search-input');
  const menu = document.getElementById('wishlist-search-menu');

  if (!input || !menu) return;

  function renderMenu() {
    const query = input.value.toLowerCase().trim();
    menu.innerHTML = '';

    if (allNfts.length === 0) {
      menu.innerHTML = `
        <li class="p-3 text-center text-xs text-sfl-woodLight space-y-1.5">
          <p>NFT catalog not loaded yet.</p>
          <button type="button" id="menu-load-nfts-btn" class="inline-flex items-center gap-1 bg-emerald-600 text-white font-bold px-2.5 py-1 rounded text-[11px] shadow-xs hover:bg-emerald-500 cursor-pointer">
            <span>✨</span> Load Live NFTs
          </button>
        </li>`;
      document.getElementById('menu-load-nfts-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        loadNftCatalog(true);
      });
      menu.classList.remove('hidden');
      return;
    }

    const matches = allNfts.filter(nft => {
      if (!query) return true;
      return nft.name.toLowerCase().includes(query) || 
             (nft.boost && nft.boost.toLowerCase().includes(query));
    }).slice(0, 30);

    if (matches.length === 0) {
      menu.innerHTML = '<li class="p-3 text-sfl-woodLight italic text-xs">No matching NFTs found</li>';
    } else {
      matches.forEach(nft => {
        const li = document.createElement('li');
        li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center text-xs border-b border-sfl-cardBorder/30 last:border-b-0';

        const priceNum = typeof nft.price === 'number' ? nft.price : parseFloat(nft.price) || 0;
        const { rate: usdRate } = getFlowerUsdRate();

        li.innerHTML = `
          <div class="flex items-center gap-2 overflow-hidden mr-2">
            <span>⭐</span>
            <div class="truncate">
              <div class="font-bold text-sfl-dirt dark:text-amber-100 truncate">${nft.name}</div>
              <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 truncate">${nft.boost || 'No Boost'}</div>
            </div>
          </div>
          <div class="text-right whitespace-nowrap font-mono shrink-0">
            <div class="text-sfl-green dark:text-emerald-400 font-bold flex items-center justify-end gap-1">
              <span>${priceNum.toFixed(2)}</span>
              <img src="./assets/flower.webp" class="w-3.5 h-3.5 sfl-icon" alt="Flower">
            </div>
            <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
              ≈ ${formatUsdAmount(priceNum * usdRate)}
            </div>
          </div>
        `;
        li.addEventListener('click', () => {
          addToWishlist(nft);
          input.value = '';
          menu.classList.add('hidden');
        });
        menu.appendChild(li);
      });
    }

    menu.classList.remove('hidden');
  }

  if (!isComboboxBound) {
    input.addEventListener('input', renderMenu);
    input.addEventListener('focus', renderMenu);
    document.addEventListener('click', (e) => {
      const activeInput = document.getElementById('wishlist-search-input');
      const activeMenu = document.getElementById('wishlist-search-menu');
      if (activeInput && activeMenu && !activeInput.contains(e.target) && !activeMenu.contains(e.target)) {
        activeMenu.classList.add('hidden');
      }
    });
    isComboboxBound = true;
  }
}

export function addToWishlist(nft) {
  if (wishlistItems.some(item => item.name.toLowerCase() === nft.name.toLowerCase())) {
    alert('⚠️ Item is already in your wishlist!');
    return;
  }

  const priceNum = typeof nft.price === 'number' ? nft.price : parseFloat(nft.price) || 0;

  wishlistItems.push({
    name: nft.name,
    boost: nft.boost || 'No Boost',
    price: priceNum,
    offerPrice: priceNum
  });

  saveWishlist();
  renderWishlist();
}

export function updateOfferPrice(index, value) {
  const parsed = parseFloat(value);
  if (wishlistItems[index]) {
    wishlistItems[index].offerPrice = isNaN(parsed) ? 0 : parsed;
    saveWishlist();
    updateWishlistTotals();
  }
}

export function removeFromWishlist(index) {
  wishlistItems.splice(index, 1);
  saveWishlist();
  renderWishlist();
}

export function clearWishlist() {
  if (wishlistItems.length === 0) return;
  if (confirm("Are you sure you want to clear your entire wishlist?")) {
    wishlistItems = [];
    saveWishlist();
    renderWishlist();
  }
}

function saveWishlist() {
  localStorage.setItem('sfl_wishlist', JSON.stringify(wishlistItems));
}

export function updateWishlistTotals() {
  const countEl = document.getElementById('wishlist-item-count');
  const floorFlowersEl = document.getElementById('wishlist-total-flowers');
  const offerFlowersEl = document.getElementById('wishlist-total-offer');
  const floorUsdEl = document.getElementById('wishlist-total-floor-usd');
  const offerUsdEl = document.getElementById('wishlist-total-offer-usd');
  const rateNoteEl = document.getElementById('wishlist-rate-note');

  const { rate: usdRate, source: rateSource } = getFlowerUsdRate();

  let grandTotalFloor = 0;
  let grandTotalOffer = 0;

  wishlistItems.forEach(item => {
    const floor = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const offer = typeof item.offerPrice === 'number' ? item.offerPrice : parseFloat(item.offerPrice) || floor;
    grandTotalFloor += floor;
    grandTotalOffer += offer;
  });

  if (countEl) countEl.textContent = `${wishlistItems.length} Item${wishlistItems.length === 1 ? '' : 's'}`;
  if (floorFlowersEl) floorFlowersEl.textContent = grandTotalFloor.toFixed(2);
  if (offerFlowersEl) offerFlowersEl.textContent = grandTotalOffer.toFixed(2);

  if (floorUsdEl) {
    floorUsdEl.textContent = `≈ ${formatUsdAmount(grandTotalFloor * usdRate)} USD`;
  }
  if (offerUsdEl) {
    offerUsdEl.textContent = `≈ ${formatUsdAmount(grandTotalOffer * usdRate)} USD`;
  }
  if (rateNoteEl) {
    rateNoteEl.innerHTML = `<span>💵 Rate: <strong>1 🌸 ≈ $${usdRate.toFixed(4)} USD</strong></span> <span class="opacity-75">(${rateSource})</span>`;
  }
}

export function renderWishlist() {
  const tbody = document.getElementById('wishlist-body');
  if (!tbody) return;

  if (wishlistItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sfl-woodLight italic">Your wishlist is empty! Search above to add items.</td></tr>`;
    updateWishlistTotals();
    return;
  }

  tbody.innerHTML = '';
  const { rate: usdRate } = getFlowerUsdRate();

  wishlistItems.forEach((nft, index) => {
    const priceNum = typeof nft.price === 'number' ? nft.price : parseFloat(nft.price) || 0;
    if (nft.offerPrice === undefined) {
      nft.offerPrice = priceNum;
    }
    const offerNum = typeof nft.offerPrice === 'number' ? nft.offerPrice : parseFloat(nft.offerPrice) || 0;

    const floorUsd = priceNum * usdRate;
    const offerUsd = offerNum * usdRate;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition align-middle";

    const tdName = document.createElement('td');
    tdName.className = "px-3 py-2.5 font-bold flex items-center gap-2 text-sfl-dirt dark:text-amber-100";
    tdName.innerHTML = `<span>⭐</span><span>${nft.name}</span>`;

    const tdBoost = document.createElement('td');
    tdBoost.className = "px-3 py-2.5 text-xs text-sfl-woodLight dark:text-slate-400";
    tdBoost.textContent = nft.boost || 'No Boost';

    const tdFloor = document.createElement('td');
    tdFloor.className = "px-3 py-2.5 font-mono whitespace-nowrap";
    tdFloor.innerHTML = `
      <div class="font-bold text-sfl-green dark:text-emerald-400 flex items-center gap-1">
        <span>${priceNum.toFixed(2)}</span>
        <img src="./assets/flower.webp" class="w-3.5 h-3.5 sfl-icon inline-block" alt="Flower">
      </div>
      <div class="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
        ≈ ${formatUsdAmount(floorUsd)}
      </div>
    `;

    const tdOffer = document.createElement('td');
    tdOffer.className = "px-3 py-2.5 font-mono whitespace-nowrap";

    const offerInputWrapper = document.createElement('div');
    offerInputWrapper.className = "flex items-center gap-1.5";

    const offerInput = document.createElement('input');
    offerInput.type = 'number';
    offerInput.min = '0';
    offerInput.step = '0.01';
    offerInput.value = nft.offerPrice;
    offerInput.className = "w-24 sfl-input px-2 py-1 text-xs font-mono font-bold text-amber-900 dark:text-amber-100 rounded border-2 border-sfl-cardBorder focus:outline-none focus:border-amber-600 bg-amber-50 dark:bg-slate-800";

    const flowerIcon = document.createElement('img');
    flowerIcon.src = "./assets/flower.webp";
    flowerIcon.className = "w-3.5 h-3.5 sfl-icon inline-block";
    flowerIcon.alt = "Flower";

    offerInputWrapper.appendChild(offerInput);
    offerInputWrapper.appendChild(flowerIcon);

    const offerUsdDiv = document.createElement('div');
    offerUsdDiv.className = "text-[10px] font-semibold text-amber-800 dark:text-amber-300 mt-0.5";
    offerUsdDiv.id = `wishlist-offer-usd-${index}`;
    offerUsdDiv.textContent = `≈ ${formatUsdAmount(offerUsd)}`;

    offerInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      updateOfferPrice(index, e.target.value);
      offerUsdDiv.textContent = `≈ ${formatUsdAmount(val * usdRate)}`;
    });

    tdOffer.appendChild(offerInputWrapper);
    tdOffer.appendChild(offerUsdDiv);

    const tdAction = document.createElement('td');
    tdAction.className = "px-2 py-2.5 text-center";
    const removeBtn = document.createElement('button');
    removeBtn.className = "bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm cursor-pointer";
    removeBtn.textContent = '🗑️ Remove';
    removeBtn.addEventListener('click', () => removeFromWishlist(index));
    tdAction.appendChild(removeBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdBoost);
    tr.appendChild(tdFloor);
    tr.appendChild(tdOffer);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });

  updateWishlistTotals();
}

if (typeof window !== 'undefined') {
  window.updateOfferPrice = updateOfferPrice;
  window.removeFromWishlist = removeFromWishlist;
  window.renderWishlist = renderWishlist;
  window.getFlowerUsdRate = getFlowerUsdRate;
}
