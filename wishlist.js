// --- WISHLIST MODULE ---
const BUILTIN_SFL_CATALOG = [
  { name: "Nancy", price: 12.5, boost: "+20% Crop Growth Speed", image: "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/collectibles/nancy.png" },
  { name: "Scarecrow", price: 24.0, boost: "+15% Crop Yield", image: "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/collectibles/scarecrow.png" },
  { name: "Kuebiko", price: 110.0, boost: "Free Seeds & +5% Yield", image: "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/collectibles/kuebiko.png" },
  { name: "Golden Cauliflower", price: 78.0, boost: "+100% Cauliflower Yield", image: "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/collectibles/golden_cauliflower.png" },
  { name: "Mysterious Parsnip", price: 42.0, boost: "+50% Parsnip Growth Speed", image: "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/collectibles/mysterious_parsnip.png" },
  { name: "Cinder", price: 310.0, boost: "+50% Coal Mining Yield", image: "" },
  { name: "Emerald Turtle", price: 55.0, boost: "+0.5 Mineral Yield", image: "" },
  { name: "Tin Turtle", price: 28.0, boost: "+0.1 Stone Yield", image: "" },
  { name: "Gnome", price: 15.0, boost: "Decoration / Lucky Charm", image: "" },
  { name: "Peeler Gnome", price: 35.0, boost: "+10% Yield on Yam & Zucchini", image: "" },
  { name: "Tiki Totem", price: 45.0, boost: "+0.1 Wood Yield", image: "" },
  { name: "Rock Golem", price: 95.0, boost: "+1 Stone Yield", image: "" },
  { name: "Rooster", price: 65.0, boost: "2x Egg Drop Speed", image: "" },
  { name: "Chicken Coop", price: 250.0, boost: "+1 Egg Yield Per Harvest", image: "" },
  { name: "Gold Egg", price: 180.0, boost: "Free Feathers & Egg Boost", image: "" },
  { name: "Beekeeper Hat", price: 40.0, boost: "+20% Honey Speed", image: "" },
  { name: "Flower Fox", price: 130.0, boost: "+10% Flower Drop Rate", image: "" },
  { name: "Lunar Calendar", price: 80.0, boost: "+10% Fruit Growth Speed", image: "" },
  { name: "Giant Cabbage", price: 90.0, boost: "+100% Cabbage Yield", image: "" },
  { name: "Immortal Pear", price: 220.0, boost: "+1 Pear Fruit Drop", image: "" },
  { name: "Macaw", price: 160.0, boost: "+10% Banana Drop Speed", image: "" },
  { name: "Hoot", price: 140.0, boost: "+1 Radish & Wheat Drop", image: "" },
  { name: "Grub Statue", price: 50.0, boost: "+5% Fishing Worm Drop Rate", image: "" },
  { name: "Sir Goldensnout", price: 450.0, boost: "+1 Gold Ore Yield", image: "" },
  { name: "Kernel Secret", price: 75.0, boost: "+1 Corn Drop", image: "" }
];

let allNfts = [...BUILTIN_SFL_CATALOG];
let wishlistItems = JSON.parse(localStorage.getItem('sfl_wishlist') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  initNftCombobox();
  loadNftCatalog();
  renderWishlist();

  const clearBtn = document.getElementById('clear-wishlist-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearWishlist);
  }
});

// Clean DOM Tab Switcher
function setupTabs() {
  const tabCalcBtn = document.getElementById('tab-calc-btn');
  const tabWishlistBtn = document.getElementById('tab-wishlist-btn');
  const calcSection = document.getElementById('calculator-section');
  const wishlistSection = document.getElementById('wishlist-section');

  if (!tabCalcBtn || !tabWishlistBtn || !calcSection || !wishlistSection) return;

  tabCalcBtn.addEventListener('click', () => {
    calcSection.classList.remove('hidden');
    wishlistSection.classList.add('hidden');
    tabCalcBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer";
    tabWishlistBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer";
  });

  tabWishlistBtn.addEventListener('click', () => {
    wishlistSection.classList.remove('hidden');
    calcSection.classList.add('hidden');
    tabWishlistBtn.className = "bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer";
    tabCalcBtn.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer";
    renderWishlist();
  });
}

// Case-Insensitive Catalog Parser (Integrates Live API Prices)
function parseLiveCatalog(apiData) {
  if (!apiData) return BUILTIN_SFL_CATALOG;

  let liveMap = {};

  if (typeof apiData === 'object' && apiData !== null) {
    let source = apiData.data || apiData.nfts || apiData.items || apiData;
    
    if (Array.isArray(source)) {
      source.forEach(item => {
        if (item && (item.name || item.title)) {
          let name = String(item.name || item.title).toLowerCase().trim();
          let price = parseFloat(item.price ?? item.floorPrice ?? item.sflPrice ?? item.sfl ?? 0) || 0;
          liveMap[name] = {
            name: item.name || item.title,
            price: price,
            boost: item.boost || item.boostInfo || item.description || "Collectible / Boost Item",
            image: item.image || item.image_url || ""
          };
        }
      });
    } else {
      Object.entries(source).forEach(([key, val]) => {
        let cleanKey = key.toLowerCase().trim();
        if (typeof val === 'number') {
          liveMap[cleanKey] = { name: key, price: val, boost: "Collectible / Boost Item", image: "" };
        } else if (typeof val === 'object' && val !== null) {
          let price = parseFloat(val.price ?? val.floorPrice ?? val.sflPrice ?? val.sfl ?? 0) || 0;
          liveMap[cleanKey] = {
            name: val.name || key,
            price: price,
            boost: val.boost || val.boostInfo || val.description || "Collectible / Boost Item",
            image: val.image || val.image_url || ""
          };
        }
      });
    }
  }

  let finalCatalog = [];

  BUILTIN_SFL_CATALOG.forEach(baseItem => {
    let key = baseItem.name.toLowerCase().trim();
    if (liveMap[key]) {
      finalCatalog.push({
        name: baseItem.name,
        price: liveMap[key].price > 0 ? liveMap[key].price : baseItem.price,
        boost: baseItem.boost,
        image: liveMap[key].image || baseItem.image
      });
      delete liveMap[key];
    } else {
      finalCatalog.push(baseItem);
    }
  });

  Object.values(liveMap).forEach(extraItem => {
    finalCatalog.push(extraItem);
  });

  return finalCatalog;
}

// Fetch NFT list from Backend
async function loadNftCatalog() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/nfts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    allNfts = parseLiveCatalog(data);
    
    wishlistItems.forEach(savedItem => {
      let liveMatch = allNfts.find(n => n.name.toLowerCase() === savedItem.name.toLowerCase());
      if (liveMatch && liveMatch.price > 0) {
        savedItem.price = liveMatch.price;
      }
    });

    saveWishlist();
    renderWishlist();
  } catch (err) {
    console.warn("Using default catalog with built-in prices:", err.message);
  }
}

// Search Combobox Dropdown
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
      menu.innerHTML = '<li class="p-3 text-sfl-woodLight italic text-xs">No matching items found</li>';
    } else {
      matches.forEach(nft => {
        const li = document.createElement('li');
        li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center text-xs border-b border-sfl-cardBorder/30 last:border-b-0';
        
        let iconHtml = nft.image ? `<img src="${nft.image}" class="w-6 h-6 object-contain rounded flex-shrink-0" onerror="this.style.display='none'">` : '<span>⭐</span>';

        li.innerHTML = `
          <div class="flex items-center gap-2 overflow-hidden mr-2">
            ${iconHtml}
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
  if (wishlistItems.some(item => item.name.toLowerCase() === nft.name.toLowerCase())) {
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

function clearWishlist() {
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

function renderWishlist() {
  const tbody = document.getElementById('wishlist-body');
  if (!tbody) return;

  const coinRatio = parseFloat(localStorage.getItem('sfl_coin_ratio')) || 1000;

  if (wishlistItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-sfl-woodLight italic">Your wishlist is empty! Search above to add items.</td></tr>`;
    document.getElementById('wishlist-item-count').textContent = '0 Items';
    document.getElementById('wishlist-total-flowers').textContent = '0.00';
    document.getElementById('wishlist-total-coins').textContent = '0.00';
    return;
  }

  tbody.innerHTML = '';
  let grandTotalFlowers = 0;

  wishlistItems.forEach((nft, index) => {
    grandTotalFlowers += nft.price;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-amber-50/50 transition";
    
    let iconHtml = nft.image ? `<img src="${nft.image}" class="w-6 h-6 object-contain rounded flex-shrink-0" onerror="this.style.display='none'">` : '<span>⭐</span>';

    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold flex items-center gap-2">
        ${iconHtml}
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

  const grandTotalCoins = grandTotalFlowers * coinRatio;

  document.getElementById('wishlist-item-count').textContent = `${wishlistItems.length} Item${wishlistItems.length === 1 ? '' : 's'}`;
  document.getElementById('wishlist-total-flowers').textContent = grandTotalFlowers.toFixed(2);
  document.getElementById('wishlist-total-coins').textContent = grandTotalCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
