import { BACKEND_URL } from '../config/constants.js';

let allNfts = [];
let wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');

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
          <p class="text-[11px] text-sfl-woodLight font-semibold">Track live floor prices, custom offers, boosts, and total cost of target items from sfl.world.</p>
        </div>
        <button id="clear-wishlist-btn" class="bg-sfl-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sfl-dirt hover:bg-red-700 transition cursor-pointer">
          🗑️ Clear Wishlist
        </button>
      </div>

      <div class="bg-sfl-card/80 p-4 rounded-xl border-2 border-sfl-cardBorder space-y-2">
        <label class="block text-xs font-bold uppercase tracking-wider text-sfl-wood">🔍 Search & Add SFL NFTs or Collectibles</label>
        <div class="relative max-w-lg">
          <input type="text" id="wishlist-search-input" placeholder="Type or click to search NFT name or boost..." autocomplete="off" class="w-full sfl-input rounded-lg px-3 py-2 text-sm text-sfl-dirt focus:outline-none focus:ring-2 focus:ring-sfl-gold">
          <ul id="wishlist-search-menu" class="hidden absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-white border-2 border-sfl-woodLight rounded-lg shadow-xl z-30 divide-y divide-sfl-cardBorder/30 text-sm">
            <li class="p-2 text-sfl-woodLight italic text-xs">Loading NFT catalog...</li>
          </ul>
        </div>
      </div>

      <div class="overflow-x-auto bg-white/80 border-2 border-sfl-cardBorder rounded-xl shadow-sm">
        <table class="w-full text-left text-xs text-sfl-dirt">
          <thead class="bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood uppercase text-[11px]">
            <tr>
              <th class="px-3 py-2.5">NFT / Item Name</th>
              <th class="px-3 py-2.5">Boost / Description</th>
              <th class="px-3 py-2.5">Floor Price</th>
              <th class="px-3 py-2.5">Offer Price</th>
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

      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-4 text-center shadow-inner space-y-2">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Saved Items</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-wood mt-0.5">
              <span id="wishlist-item-count">0 Items</span>
            </h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Total Floor Price</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green mt-0.5 flex items-center justify-center gap-1">
              <span id="wishlist-total-flowers">0.00</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Total Offer Price</span>
            <h2 class="text-xl sm:text-2xl font-pixel font-bold text-amber-700 mt-0.5 flex items-center justify-center gap-1">
              <span id="wishlist-total-offer">0.00</span>
              <img src="./assets/flower.webp" class="w-5 h-5 sfl-icon" alt="Flower">
            </h2>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initWishlistPanel() {
  renderWishlistTemplate();
  initNftCombobox();
  loadNftCatalog();
  renderWishlist();

  const clearBtn = document.getElementById('clear-wishlist-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearWishlist);
  }
}

export async function loadNftCatalog() {
  try {
    const rawUrl = typeof BACKEND_URL !== 'undefined' && BACKEND_URL ? BACKEND_URL : '';
    const cleanBaseUrl = rawUrl.replace(/\/+$/, '');
    
    // Fetch directly from your backend on Render (which has cors enabled)
    const res = await fetch(`${cleanBaseUrl}/api/nfts`);
    if (!res.ok) throw new Error(`Backend returned HTTP status ${res.status}`);
    
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      allNfts = data;
      console.log(`✅ Successfully loaded ${allNfts.length} live NFTs into catalog from backend.`);
    } else {
      throw new Error("API response payload is invalid or empty");
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
  } catch (err) {
    console.error("❌ Failed to fetch NFT catalog via backend:", err.message);
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

        li.innerHTML = `
          <div class="flex items-center gap-2 overflow-hidden mr-2">
            <span>⭐</span>
            <div class="truncate">
              <div class="font-bold text-sfl-dirt truncate">${nft.name}</div>
              <div class="text-[10px] text-sfl-woodLight truncate">${nft.boost || 'No Boost'}</div>
            </div>
          </div>
          <span class="text-sfl-green font-mono font-bold whitespace-nowrap flex items-center gap-1">
            ${priceNum.toFixed(2)} Flowers
          </span>
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

  input.addEventListener('input', renderMenu);
  input.addEventListener('focus', renderMenu);

  if (!isComboboxBound) {
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

  wishlistItems.forEach((nft, index) => {
    const priceNum = typeof nft.price === 'number' ? nft.price : parseFloat(nft.price) || 0;
    if (nft.offerPrice === undefined) {
      nft.offerPrice = priceNum;
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition align-middle";

    const tdName = document.createElement('td');
    tdName.className = "px-3 py-2.5 font-bold flex items-center gap-2";
    tdName.innerHTML = `<span>⭐</span><span>${nft.name}</span>`;

    const tdBoost = document.createElement('td');
    tdBoost.className = "px-3 py-2.5 text-xs text-sfl-woodLight";
    tdBoost.textContent = nft.boost || 'No Boost';

    const tdFloor = document.createElement('td');
    tdFloor.className = "px-3 py-2.5 font-bold text-sfl-green font-mono";
    tdFloor.textContent = `${priceNum.toFixed(2)} Flowers`;

    const tdOffer = document.createElement('td');
    tdOffer.className = "px-3 py-2.5";
    const offerInput = document.createElement('input');
    offerInput.type = 'number';
    offerInput.min = '0';
    offerInput.step = '0.01';
    offerInput.value = nft.offerPrice;
    offerInput.className = "w-24 sfl-input px-2 py-1 text-xs font-mono font-bold text-amber-900 rounded border-2 border-sfl-cardBorder focus:outline-none focus:border-amber-600 bg-amber-50";
    offerInput.addEventListener('input', (e) => updateOfferPrice(index, e.target.value));
    tdOffer.appendChild(offerInput);

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
}
