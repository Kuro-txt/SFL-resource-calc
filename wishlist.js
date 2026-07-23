// --- WISHLIST MODULE ---
const FALLBACK_NFTS = [
  { name: "Nancy", price: 15.0, boost: "20% Crop Growth Speed", image: "https://sunflower-land.com/play/v2/collectibles/nancy.png" },
  { name: "Scarecrow", price: 25.5, boost: "15% Yield Increase on Crops", image: "https://sunflower-land.com/play/v2/collectibles/scarecrow.png" },
  { name: "Kuebiko", price: 120.0, boost: "Free Seeds & +5% Yield", image: "https://sunflower-land.com/play/v2/collectibles/kuebiko.png" },
  { name: "Golden Cauliflower", price: 85.0, boost: "100% Cauliflower Yield", image: "https://sunflower-land.com/play/v2/collectibles/golden_cauliflower.png" },
  { name: "Mysterious Parsnip", price: 45.0, boost: "50% Parsnip Growth Speed", image: "https://sunflower-land.com/play/v2/collectibles/mysterious_parsnip.png" },
  { name: "Victoria Cultivated", price: 210.0, boost: "+1 Yellow Cake & Fruit Speed", image: "" },
  { name: "Cinder", price: 350.0, boost: "50% Faster Coal Mining", image: "" },
  { name: "Emerald Turtle", price: 60.0, boost: "+0.5 Mineral Yield", image: "" },
  { name: "Tin Turtle", price: 30.0, boost: "+0.1 Stone Yield", image: "" }
];

let allNfts = [...FALLBACK_NFTS];
let wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  initNftCombobox();
  loadNftCatalog();
  renderWishlist();
});

// Global Tab Switcher Function
window.switchTab = function(tabName) {
  const calcSection = document.getElementById('calculator-section');
  const wishlistSection = document.getElementById('wishlist-section');
  const tabCalcBtn = document.getElementById('tab-calc-btn');
  const tabWishlistBtn = document.getElementById('tab-wishlist-btn');

  if (!calcSection || !wishlistSection) return;

  if (tabName === 'calc') {
    calcSection.classList.remove('hidden');
    wishlistSection.classList.add('hidden');
    tabCalcBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer";
    tabWishlistBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer";
  } else if (tabName === 'wishlist') {
    wishlistSection.classList.remove('hidden');
    calcSection.classList.add('hidden');
    tabWishlistBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer";
    tabCalcBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer";
    renderWishlist();
  }
};

// Data Normalizer
function normalizeNftData(raw) {
  if (!raw) return FALLBACK_NFTS;
  
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'object') {
    if (Array.isArray(raw.data)) list = raw.data;
    else if (Array.isArray(raw.nfts)) list = raw.nfts;
    else if (Array.isArray(raw.items)) list = raw.items;
    else {
      list = Object.entries(raw).map(([key, item]) => {
        if (typeof item === 'object' && item !== null) {
          return { name: item.name || key, ...item };
        }
        return { name: key, price: item };
      });
    }
  }

  if (list.length === 0) return FALLBACK_NFTS;

  return list.map(item => {
    const name = item.name || item.title || item.itemName || 'Unknown Item';
    const price = item.price ?? item.floorPrice ?? item.sflPrice ?? item.sfl ?? item.cost ?? 0;
    const boost = item.boost || item.boostInfo || item.buff || item.description || item.details || 'No Boost Info';
    const image = item.image || item.image_url || item.icon || '';

    return { name, price: parseFloat(price) || 0, boost, image };
  });
}

// Fetch NFT list from Backend
async function loadNftCatalog() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/nfts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    allNfts = normalizeNftData(data);
  } catch (err) {
    console.warn("Using default NFT catalog (Server sleeping/offline):", err.message);
  }
}

// NFT Combobox / Dropdown Selector
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
    }).slice(0, 20);

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
            ${nft.price.toFixed(2)} ${typeof FLOWER_ICON !== 'undefined' ? FLOWER_ICON : 'Flowers'}
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
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-sfl-woodLight italic">Your wishlist is empty! Search above to add items.</td></tr>`;
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
      <td class="px-3 py-2.5 font-bold text-sfl-green font-mono">${nft.price.toFixed(2)} ${typeof FLOWER_ICON !== 'undefined' ? FLOWER_ICON : 'Flowers'}</td>
      <td class="px-2 py-2.5 text-center">
        <button onclick="removeFromWishlist(${index})" class="bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm">🗑️ Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
