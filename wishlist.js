// --- WISHLIST MODULE ---
let allNfts = [];
let wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  initTabSwitching();
  loadNftCatalog();
});

// Tab Switcher Logic
function initTabSwitching() {
  const tabTrackerBtn = document.getElementById('tab-tracker-btn');
  const tabWishlistBtn = document.getElementById('tab-wishlist-btn');
  const trackerSection = document.getElementById('tracker-section');
  const wishlistSection = document.getElementById('wishlist-section');

  if (!tabTrackerBtn || !tabWishlistBtn) return;

  tabTrackerBtn.addEventListener('click', () => {
    tabTrackerBtn.className = "bg-sfl-wood text-amber-200 px-4 py-2 rounded-t-lg font-bold text-xs border-t-2 border-x-2 border-sfl-dirt shadow-md";
    tabWishlistBtn.className = "bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-t-lg font-bold text-xs border-t-2 border-x-2 border-transparent hover:bg-amber-200/50 transition";
    trackerSection.classList.remove('hidden');
    wishlistSection.classList.add('hidden');
  });

  tabWishlistBtn.addEventListener('click', () => {
    tabWishlistBtn.className = "bg-sfl-wood text-amber-200 px-4 py-2 rounded-t-lg font-bold text-xs border-t-2 border-x-2 border-sfl-dirt shadow-md";
    tabTrackerBtn.className = "bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-t-lg font-bold text-xs border-t-2 border-x-2 border-transparent hover:bg-amber-200/50 transition";
    wishlistSection.classList.remove('hidden');
    trackerSection.classList.add('hidden');
    renderWishlist();
  });
}

// Fetch NFT list from backend
async function loadNftCatalog() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/nfts`);
    const data = await res.json();
    
    // Normalize response if array or object wrapper
    allNfts = Array.isArray(data) ? data : (data.nfts || Object.values(data));
    initNftCombobox();
  } catch (err) {
    console.warn("Failed to load NFTs:", err);
  }
}

// NFT Combobox / Search Selector
function initNftCombobox() {
  const input = document.getElementById('wishlist-search-input');
  const menu = document.getElementById('wishlist-search-menu');

  if (!input || !menu) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    menu.innerHTML = '';

    if (!query) {
      menu.classList.add('hidden');
      return;
    }

    const matches = allNfts.filter(nft => {
      const name = (nft.name || nft.title || '').toLowerCase();
      return name.includes(query);
    }).slice(0, 15);

    if (matches.length === 0) {
      menu.innerHTML = '<li class="p-2 text-sfl-woodLight italic">No NFTs found</li>';
    } else {
      matches.forEach(nft => {
        const name = nft.name || nft.title || 'Unknown NFT';
        const price = nft.price || nft.floorPrice || nft.sflPrice || 0;
        const boost = nft.boost || nft.boostInfo || nft.description || 'No Boost Info';

        const li = document.createElement('li');
        li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center text-xs';
        li.innerHTML = `
          <div>
            <div class="font-bold text-sfl-dirt">${name}</div>
            <div class="text-[10px] text-sfl-woodLight truncate max-w-[200px]">${boost}</div>
          </div>
          <span class="text-sfl-green font-mono font-bold flex items-center gap-1">
            ${parseFloat(price).toFixed(2)} ${FLOWER_ICON}
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
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

function addToWishlist(nft) {
  const name = nft.name || nft.title || 'Unknown NFT';
  if (wishlistItems.some(item => (item.name || item.title) === name)) {
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
    const name = nft.name || nft.title || 'Unknown NFT';
    const price = nft.price || nft.floorPrice || nft.sflPrice || 0;
    const boost = nft.boost || nft.boostInfo || nft.description || 'N/A';
    const imgUrl = nft.image || nft.image_url || '';

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold flex items-center gap-2">
        ${imgUrl ? `<img src="${imgUrl}" class="w-6 h-6 object-contain rounded" onerror="this.style.display='none'">` : ''}
        <span>${name}</span>
      </td>
      <td class="px-3 py-2.5 text-xs text-sfl-woodLight">${boost}</td>
      <td class="px-3 py-2.5 font-bold text-sfl-green font-mono">${parseFloat(price).toFixed(2)} ${FLOWER_ICON}</td>
      <td class="px-2 py-2.5 text-center">
        <button onclick="removeFromWishlist(${index})" class="bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm">🗑️ Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
