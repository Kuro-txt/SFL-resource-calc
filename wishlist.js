// --- WISHLIST MODULE ---
let allNfts = [];
let wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  initTabSwitching();
  loadNftCatalog();
});

// Top Tab Switcher Logic
function initTabSwitching() {
  const tabCalcBtn = document.getElementById('tab-calc-btn');
  const tabWishlistBtn = document.getElementById('tab-wishlist-btn');
  const calcSection = document.getElementById('calculator-section');
  const wishlistSection = document.getElementById('wishlist-section');

  if (!tabCalcBtn || !tabWishlistBtn) return;

  tabCalcBtn.addEventListener('click', () => {
    tabCalcBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2.5 rounded-t-xl font-bold text-xs border-t-2 border-x-2 border-sfl-dirt shadow-md flex items-center gap-2";
    tabWishlistBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2.5 rounded-t-xl font-bold text-xs border-t-2 border-x-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2";
    calcSection.classList.remove('hidden');
    wishlistSection.classList.add('hidden');
  });

  tabWishlistBtn.addEventListener('click', () => {
    tabWishlistBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2.5 rounded-t-xl font-bold text-xs border-t-2 border-x-2 border-sfl-dirt shadow-md flex items-center gap-2";
    tabCalcBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2.5 rounded-t-xl font-bold text-xs border-t-2 border-x-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2";
    wishlistSection.classList.remove('hidden');
    calcSection.classList.add('hidden');
    renderWishlist();
  });
}

// Robust NFT Data Normalization
function normalizeNftData(raw) {
  if (!raw) return [];
  
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'object') {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.nfts)) list = raw.nfts;
    else if (Array.isArray(raw.items)) list = raw.items;
    else {
      // Map key-value objects: { "Bumpkin": { price: ... } }
      list = Object.entries(raw).map(([key, item]) => {
        if (typeof item === 'object' && item !== null) {
          return { name: item.name || key, ...item };
        }
        return { name: key, price: item };
      });
    }
  }

  // Format consistent properties
  return list.map(item => {
    const name = item.name || item.title || item.itemName || 'Unknown Item';
    const price = item.price ?? item.floorPrice ?? item.sflPrice ?? item.sfl ?? item.cost ?? 0;
    const boost = item.boost || item.boostInfo || item.buff || item.description || item.details || 'No Boost Info';
    const image = item.image || item.image_url || item.icon || '';

    return { name, price: parseFloat(price) || 0, boost, image, raw: item };
  });
}

// Fetch NFT list from Backend
async function loadNftCatalog() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/nfts`);
    const data = await res.json();
    
    allNfts = normalizeNftData(data);
    initNftCombobox();
  } catch (err) {
    console.warn("Failed to load NFT catalog from server:", err);
  }
}

// NFT Combobox / Search Selector with Full List on Focus
function initNftCombobox() {
  const input = document.getElementById('wishlist-search-input');
  const menu = document.getElementById('wishlist-search-menu');

  if (!input || !menu) return;

  function renderMenu() {
    const query = input.value.toLowerCase().trim();
    menu.innerHTML = '';

    const matches = allNfts.filter(nft => {
      return nft.name.toLowerCase().includes(query) || 
             nft.boost.toLowerCase().includes(query);
    }).slice(0, 25);

    if (matches.length === 0) {
      menu.innerHTML = '<li class="p-3 text-sfl-woodLight italic text-xs">No matching NFTs found</li>';
    } else {
      matches.forEach(nft => {
        const li = document.createElement('li');
        li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center text-xs border-b border-sfl-cardBorder/30 last:border-b-0';
        li.innerHTML = `
          <div class="flex items-center gap-2 overflow-hidden mr-2">
            ${nft.image ? `<img src="${nft.image}" class="w-6 h-6 object-contain rounded flex-shrink-0" onerror="this.style.display='none'">` : ''}
            <div class="truncate">
              <div class="font-bold text-sfl-dirt truncate">${nft.name}</div>
              <div class="text-[10px] text-sfl-woodLight truncate">${nft.boost}</div>
            </div>
          </div>
          <span class="text-sfl-green font-mono font-bold whitespace-nowrap flex items-center gap-1">
            ${nft.price.toFixed(2)} ${FLOWER_ICON}
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

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

function addToWishlist(nft) {
  if (wishlistItems.some(item => item.name === nft.name)) {
    alert('⚠️ Item is already in your wishlist!');
    return;
  }

  wishlistItems.push(nft);
  saveWishlist();
  renderWishlist();
}

function removeFromWishlist(index) {
  wishlistItems.splice(index, 1);
  saveWishlist();
  renderWishlist();
}

function saveWishlist() {
  localStorage.setItem('sfl_wishlist', JSON.stringify(wishlistItems));
}

function renderWishlist() {
  const tbody = document.getElementById('wishlist-body');
  if (!tbody) return;

  if (wishlistItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-sfl-woodLight italic">Your wishlist is empty! Search above to add NFTs.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  wishlistItems.forEach((nft, index) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold flex items-center gap-2">
        ${nft.image ? `<img src="${nft.image}" class="w-6 h-6 object-contain rounded" onerror="this.style.display='none'">` : ''}
        <span>${nft.name}</span>
      </td>
      <td class="px-3 py-2.5 text-xs text-sfl-woodLight">${nft.boost}</td>
      <td class="px-3 py-2.5 font-bold text-sfl-green font-mono">${nft.price.toFixed(2)} ${FLOWER_ICON}</td>
      <td class="px-2 py-2.5 text-center">
        <button onclick="removeFromWishlist(${index})" class="bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm">🗑️ Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
