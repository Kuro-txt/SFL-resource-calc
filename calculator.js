//// --- LIVE PRICES, FARM SYNC, COMBOBOX, BASKET & WEEKLY POPUP LOGIC ---

// Global Application State Initialization
window.basket = window.basket || [];
window.allPrices = window.allPrices || {};
window.farmInventoryData = window.farmInventoryData || {};
window.selectedItemKey = window.selectedItemKey || null;
window.syncCount = window.syncCount || 0;
window.syncCooldownTimer = window.syncCooldownTimer || null;

// Persistent Tracking Targets State
window.trackedTargets = window.trackedTargets || [];

// Weekly Popup State (0 = Current Week, -1 = Last Week, etc.)
let currentWeekOffset = 0;

// Standard Flower Image HTML Tag
const FLOWER_IMG_HTML = `<img src="https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/flower.png" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-4 h-4 sfl-icon inline-block" alt="Flower">`;
const FLOWER_IMG_SMALL_HTML = `<img src="https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/flower.png" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-3.5 h-3.5 sfl-icon inline-block" alt="Flower">`;

// Helper: Format local date to YYYY-MM-DD without UTC timezone shifts
function formatDateYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Rounding & Formatting Helper Functions
function roundUpToOneDecimal(val) {
  return Math.ceil((parseFloat(val) || 0) * 10) / 10;
}

function roundUpToTwoDecimals(val) {
  return Math.ceil((parseFloat(val) || 0) * 100) / 100;
}

function roundUpToThreeDecimals(val) {
  return Math.ceil((parseFloat(val) || 0) * 1000) / 1000;
}

function formatFourDecimals(val) {
  return (parseFloat(val) || 0).toFixed(4);
}

// Fallback Betty NPC Unit Price Lookup
function getBettyUnitPrice(cleanName) {
  const bettyCatalog = {
    "sunflower": 0.02, "potato": 0.14, "pumpkin": 0.40, "carrot": 0.80,
    "cabbage": 1.50, "beetroot": 2.80, "cauliflower": 4.25, "parsnip": 6.50,
    "eggplant": 8.00, "corn": 9.00, "onion": 10.00, "radish": 9.50,
    "wheat": 7.00, "turnip": 8.00, "kale": 10.00, "artichoke": 12.00, "barley": 12.00
  };
  let key = (cleanName || '').toLowerCase().trim();
  return bettyCatalog[key] !== undefined ? bettyCatalog[key] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const savedTaxRate = localStorage.getItem('sfl_tax_rate');
  const savedCoinRatio = localStorage.getItem('sfl_coin_ratio');

  const taxEl = document.getElementById('tax-select');
  const coinEl = document.getElementById('coin-ratio');

  if (savedTaxRate !== null && taxEl) taxEl.value = savedTaxRate;
  if (savedCoinRatio !== null && coinEl) coinEl.value = savedCoinRatio;

  // Load saved tracking targets fallback from localStorage
  const localSavedTargets = localStorage.getItem('sfl_tracked_targets');
  if (localSavedTargets) {
    try {
      window.trackedTargets = JSON.parse(localSavedTargets) || [];
    } catch (e) {
      window.trackedTargets = [];
    }
  }

  // Sync tracked targets from Supabase if user is logged in
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const activeUser = window.currentUser || (await supabaseClient.auth.getUser())?.data?.user;

      if (activeUser) {
        window.currentUser = activeUser;
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('tracked_items')
          .eq('id', activeUser.id)
          .maybeSingle();

        if (!error && data && Array.isArray(data.tracked_items) && data.tracked_items.length > 0) {
          window.trackedTargets = data.tracked_items;
          localStorage.setItem('sfl_tracked_targets', JSON.stringify(data.tracked_items));
        }
      }
    } catch (err) {
      console.warn("Could not sync tracked items from Supabase:", err.message);
    }
  }

  // Render badges on page initialization
  renderTrackedBadges();

  loadPrices();
  initTrackingModal();
  initWeeklySummaryModal();
});

document.getElementById('tax-select')?.addEventListener('change', (e) => {
  localStorage.setItem('sfl_tax_rate', e.target.value);
  updateBasketTable();
});

document.getElementById('coin-ratio')?.addEventListener('input', (e) => {
  localStorage.setItem('sfl_coin_ratio', e.target.value);
  updateBasketTable();
  if (typeof renderWishlist === 'function') renderWishlist();
});

function loadPrices() {
  const backend = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
  fetch(`${backend}/api/get-data`)
    .then(res => res.json())
    .then(rawData => {
      if (rawData && typeof rawData === 'object') {
        delete rawData.updated_text;
        delete rawData.updatedText;
        delete rawData.updated_at;
        delete rawData.updatedAt;
      }
      allPrices = extractPrices(rawData);
    })
    .catch(() => console.warn("Using default fallback prices."));
}

function extractPrices(data) {
  let pricesMap = {};
  if (!data || typeof data !== 'object') return pricesMap;

  const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

  function searchObj(obj, prefix = '') {
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      let lowerKey = key.toLowerCase().trim();
      if (GLOBAL_EXCLUDES.includes(lowerKey)) continue;
      if (lowerKey.includes('updated')) continue;
      if (typeof isExcludedItem === 'function' && isExcludedItem(key)) continue;

      let val = obj[key];

      if (typeof val === 'number') {
        pricesMap[prefix + key] = val;
      } else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
        pricesMap[prefix + key] = parseFloat(val);
      } else if (val && typeof val === 'object') {
        let p = val.price ?? val.sfl ?? val.sflPrice ?? val.flowerPrice ?? val.unitPrice;
        if (p !== undefined && p !== null) {
          pricesMap[prefix + key] = parseFloat(p) || 0;
        } else {
          let newPrefix = key.length <= 4 ? `[${key.toUpperCase()}] ` : '';
          searchObj(val, newPrefix);
        }
      }
    }
  }

  searchObj(data);
  return pricesMap;
}

function getItemStock(displayName) {
  let cleanSelected = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let invKey in farmInventoryData) {
    let cleanInvKey = invKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanInvKey === cleanSelected) {
      let val = farmInventoryData[invKey];
      let rawVal = typeof val === 'number' ? val : parseFloat(val?.amount || val || 0);
      return roundUpToOneDecimal(rawVal);
    }
  }
  return 0;
}

function startSyncCooldown() {
  const syncBtn = document.getElementById('import-farm-btn');
  if (!syncBtn) return;
  let timeLeft = 20;
  syncBtn.disabled = true;

  syncCooldownTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      syncBtn.textContent = `⏳ Please wait ${timeLeft}s...`;
    } else {
      clearInterval(syncCooldownTimer);
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 Sync Farm Quantities Now';
    }
  }, 1000);
}

document.getElementById('import-farm-btn')?.addEventListener('click', async () => {
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');
  const status = document.getElementById('sync-status');

  const farmId = farmIdEl ? farmIdEl.value.trim() : '';
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';

  if (!farmId) {
    if (status) status.textContent = '❌ Please enter a Farm ID.';
    return;
  }

  if (status) status.textContent = '⏳ Fetching farm data...';
  
  syncCount++;
  if (syncCount >= 2) {
    startSyncCooldown();
  }

  try {
    const backend = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
    const url = `${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error ${response.status}`);
    }

    const farmObj = data.farm?.farm || data.farm?.data || data.farm || data;
    farmInventoryData = farmObj?.inventory || {};

    let totalItemsCount = Object.keys(farmInventoryData).length;

    if (totalItemsCount > 0) {
      if (status) status.textContent = `✅ Synced ${totalItemsCount} item types from Farm #${farmId}!`;
      updateBasketTable();
    } else {
      if (status) status.textContent = `⚠️ Connected, but no inventory found on farm.`;
    }
  } catch (err) {
    if (status) status.textContent = err.message;
  }
});

const input = document.getElementById('combobox-input');
const menu = document.getElementById('combobox-menu');

const SEARCH_EXCLUDED_KEYS = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

if (input && menu) {
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    menu.innerHTML = '';

    const matches = Object.keys(allPrices)
      .filter(key => {
        let lowerKey = key.toLowerCase().trim();
        if (SEARCH_EXCLUDED_KEYS.includes(lowerKey) || lowerKey.includes('updated')) return false;
        if (typeof isExcludedItem === 'function' && isExcludedItem(key)) return false;
        let cleanKey = key.replace(/^\[.*?\]\s*/, '');
        return cleanKey.toLowerCase().includes(query) || lowerKey.includes(query);
      })
      .sort((a, b) => a.replace(/^\[.*?\]\s*/, '').localeCompare(b.replace(/^\[.*?\]\s*/, '')));

    if (matches.length === 0) {
      menu.innerHTML = '<li class="p-2 text-sfl-woodLight italic">No matching items found</li>';
    } else {
      matches.forEach(item => {
        let displayName = item.replace(/^\[.*?\]\s*/, '');
        let stock = getItemStock(displayName);
        let rawPrice = allPrices[item];
        let formattedPrice = formatFourDecimals(rawPrice);

        let stockBadge = stock > 0 
          ? `<span class="text-[11px] font-bold text-sfl-green bg-green-100 border border-sfl-green/30 px-1.5 py-0.5 rounded ml-1.5">Qty: ${stock.toFixed(1)}</span>`
          : `<span class="text-[11px] text-sfl-woodLight/60 ml-1.5">(0)</span>`;

        const li = document.createElement('li');
        li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center';
        li.innerHTML = `
          <div class="flex items-center">
            <span class="font-bold text-sfl-dirt">${displayName}</span>
            ${stockBadge}
          </div>
          <span class="text-sfl-green font-mono text-xs font-bold flex items-center gap-1">${formattedPrice} ${FLOWER_IMG_SMALL_HTML}</span>
        `;
        li.addEventListener('click', () => selectItem(item, displayName));
        menu.appendChild(li);
      });
    }

    menu.classList.remove('hidden');
  });

  input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

function selectItem(itemKey, displayName) {
  selectedItemKey = itemKey;
  let cleanName = displayName || itemKey.replace(/^\[.*?\]\s*/, '');

  if (input) input.value = cleanName;
  if (menu) menu.classList.add('hidden');

  const badgeEl = document.getElementById('selected-item-badge');
  const nameEl = document.getElementById('selected-item-name');
  const priceEl = document.getElementById('selected-item-price');

  if (badgeEl) badgeEl.classList.remove('hidden');
  if (nameEl) nameEl.textContent = cleanName;
  if (priceEl) priceEl.innerHTML = `${formatFourDecimals(allPrices[itemKey])} ${FLOWER_IMG_SMALL_HTML}`;

  let foundStock = getItemStock(cleanName);
  const qtyInput = document.getElementById('quantity');
  const hintEl = document.getElementById('inventory-hint');
  const stockCountEl = document.getElementById('stock-count');

  if (foundStock > 0) {
    if (qtyInput) qtyInput.value = foundStock.toFixed(1);
    if (hintEl) hintEl.classList.remove('hidden');
    if (stockCountEl) stockCountEl.textContent = foundStock.toFixed(1);
  } else {
    if (qtyInput) qtyInput.value = 1;
    if (hintEl) hintEl.classList.add('hidden');
  }
}

// ADD TO BASKET
document.getElementById('add-btn')?.addEventListener('click', () => {
  const rawQty = parseFloat(document.getElementById('quantity')?.value) || 0;
  const qty = roundUpToOneDecimal(rawQty);

  if (!selectedItemKey || qty <= 0) return;

  const unitPrice = allPrices[selectedItemKey] || 0;
  const existingIdx = basket.findIndex(entry => entry.item === selectedItemKey);

  if (existingIdx > -1) {
    basket[existingIdx].qty = roundUpToOneDecimal(basket[existingIdx].qty + qty);
    basket[existingIdx].subtotal = basket[existingIdx].qty * unitPrice;
  } else {
    const subtotal = unitPrice * qty;
    basket.push({ item: selectedItemKey, qty, unitPrice, subtotal });
  }

  updateBasketTable();

  if (input) input.value = '';
  selectedItemKey = null;
  
  const qtyEl = document.getElementById('quantity');
  if (qtyEl) qtyEl.value = 1;
  
  document.getElementById('selected-item-badge')?.classList.add('hidden');
  document.getElementById('inventory-hint')?.classList.add('hidden');
});

document.getElementById('clear-basket')?.addEventListener('click', () => {
  basket = [];
  updateBasketTable();
});

function updateBasketQuantity(index, newQtyVal) {
  let rawQty = parseFloat(newQtyVal) || 0;
  let newQty = roundUpToOneDecimal(rawQty);

  if (newQty <= 0) {
    removeItem(index);
    return;
  }

  basket[index].qty = newQty;
  basket[index].subtotal = basket[index].unitPrice * newQty;
  updateBasketTable();
}

function updateBasketTable() {
  const tbody = document.getElementById('basket-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  let grandGrossTotal = 0;
  let totalBettyCoins = 0;
  let totalGrossRatioCoins = 0;

  const taxEl = document.getElementById('tax-select');
  const coinEl = document.getElementById('coin-ratio');

  const taxRate = taxEl ? (parseFloat(taxEl.value) || 0) : 0;
  const coinMultiplier = coinEl ? (parseFloat(coinEl.value) || 1000) : 1000;

  const coinSymbol = typeof COIN_ICON !== 'undefined' ? COIN_ICON : '🪙';

  if (basket.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-sfl-woodLight italic">Your farm basket is empty!</td></tr>';
  } else {
    basket.forEach((entry, index) => {
      grandGrossTotal += entry.subtotal;

      let cleanName = entry.item.replace(/^\[.*?\]\s*/, '');
      let stock = getItemStock(cleanName);
      let bettyUnitPrice = getBettyUnitPrice(cleanName);

      let stockDisplay = stock > 0 
        ? `<span class="text-[10px] text-sfl-green font-semibold ml-1">(Stock: ${stock.toFixed(1)})</span>`
        : `<span class="text-[10px] text-sfl-woodLight/60 ml-1">(Stock: 0)</span>`;

      let bettyCoinsDisplay = `<span class="text-sfl-woodLight/70 font-normal italic text-[10px]">Unavailable</span>`;
      if (bettyUnitPrice !== null) {
        let itemBettyCoins = entry.qty * bettyUnitPrice;
        totalBettyCoins += itemBettyCoins;
        bettyCoinsDisplay = `<span class="inline-flex items-center gap-1">${roundUpToTwoDecimals(itemBettyCoins).toFixed(2)} ${coinSymbol}</span>`;
      }

      let itemNetFlowers = entry.subtotal * (1 - taxRate);
      let itemNetRatioCoins = itemNetFlowers * coinMultiplier;
      
      totalGrossRatioCoins += (entry.subtotal * coinMultiplier);

      let ratioCoinsDisplay = entry.unitPrice > 0 
        ? `<span class="inline-flex items-center gap-1">${roundUpToTwoDecimals(itemNetRatioCoins).toFixed(2)} ${coinSymbol}</span>` 
        : `<span class="text-sfl-woodLight/70 font-normal italic text-[10px]">-</span>`;

      let tr = document.createElement('tr');
      tr.className = "hover:bg-amber-50/50 transition";
      
      let subtotalDisplay = entry.unitPrice > 0 
        ? `<span class="inline-flex items-center gap-1">${roundUpToThreeDecimals(entry.subtotal).toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>` 
        : `<span class="text-sfl-woodLight font-normal">Untradeable</span>`;

      tr.innerHTML = `
        <td class="px-2 py-2.5 font-bold text-sfl-dirt">
          <span>${cleanName}</span>
          ${stockDisplay}
        </td>
        <td class="px-1 py-2 font-mono">
          <input type="number" value="${entry.qty.toFixed(1)}" min="0.1" step="0.1"
            onchange="updateBasketQuantity(${index}, this.value)"
            class="w-14 sfl-input rounded px-1 py-0.5 text-xs font-bold text-sfl-dirt text-center focus:outline-none focus:ring-1 focus:ring-sfl-gold">
        </td>
        <td class="px-2 py-2.5 text-sfl-green font-bold">${subtotalDisplay}</td>
        <td class="px-2 py-2.5 text-sfl-gold font-bold">${bettyCoinsDisplay}</td>
        <td class="px-2 py-2.5 text-amber-600 font-bold">${ratioCoinsDisplay}</td>
        <td class="px-1 py-2.5 text-right">
          <button onclick="removeItem(${index})" class="text-sfl-accent hover:text-red-700 font-bold px-1 cursor-pointer">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const taxAmount = grandGrossTotal * taxRate;
  const netFlowers = grandGrossTotal - taxAmount;
  const totalNetRatioCoins = totalGrossRatioCoins * (1 - taxRate);

  const grossEl = document.getElementById('gross-flowers');
  const taxDeductEl = document.getElementById('tax-deduction');
  const totalFlowersEl = document.getElementById('total-flowers');
  const bettyCoinsEl = document.getElementById('total-betty-coins');
  const ratioCoinsEl = document.getElementById('total-ratio-coins');
  const itemCountEl = document.getElementById('item-count');

  if (grossEl) grossEl.textContent = `${roundUpToThreeDecimals(grandGrossTotal).toFixed(3)} Flowers`;
  if (taxDeductEl) taxDeductEl.textContent = `${roundUpToThreeDecimals(taxAmount).toFixed(3)} Flowers`;
  if (totalFlowersEl) totalFlowersEl.textContent = `${roundUpToThreeDecimals(netFlowers).toFixed(3)}`;
  if (bettyCoinsEl) bettyCoinsEl.textContent = `${roundUpToTwoDecimals(totalBettyCoins).toFixed(2)}`;
  if (ratioCoinsEl) ratioCoinsEl.textContent = `${roundUpToTwoDecimals(totalNetRatioCoins).toFixed(2)}`;
  if (itemCountEl) itemCountEl.textContent = `${basket.length} Item${basket.length === 1 ? '' : 's'}`;
}

function removeItem(index) {
  basket.splice(index, 1);
  updateBasketTable();
}

// --- PERSISTENT TRACKING TARGETS MODAL LOGIC ---
function initTrackingModal() {
  const openBtn = document.getElementById('open-tracking-modal-btn');
  const closeBtn = document.getElementById('close-tracking-modal-btn');
  const cancelBtn = document.getElementById('cancel-tracking-btn');
  const saveBtn = document.getElementById('save-tracking-targets-btn');
  const modal = document.getElementById('tracking-modal');

  const targetInput = document.getElementById('target-search-input');
  const targetMenu = document.getElementById('target-search-menu');

  if (!modal) return;

  const showModal = () => {
    renderTrackedBadges();
    modal.classList.remove('hidden');
  };

  const hideModal = () => {
    modal.classList.add('hidden');
    if (targetMenu) targetMenu.classList.add('hidden');
    if (targetInput) targetInput.value = '';
  };

  openBtn?.addEventListener('click', showModal);
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);

  // Target Item Combobox Search
  if (targetInput && targetMenu) {
    targetInput.addEventListener('input', () => {
      const query = targetInput.value.toLowerCase().trim();
      targetMenu.innerHTML = '';

      if (!query) {
        targetMenu.classList.add('hidden');
        return;
      }

      const matches = Object.keys(allPrices)
        .filter(key => {
          let lowerKey = key.toLowerCase().trim();
          if (SEARCH_EXCLUDED_KEYS.includes(lowerKey) || lowerKey.includes('updated')) return false;
          if (typeof isExcludedItem === 'function' && isExcludedItem(key)) return false;
          let cleanKey = key.replace(/^\[.*?\]\s*/, '');
          return cleanKey.toLowerCase().includes(query) || lowerKey.includes(query);
        })
        .sort((a, b) => a.replace(/^\[.*?\]\s*/, '').localeCompare(b.replace(/^\[.*?\]\s*/, '')));

      if (matches.length === 0) {
        targetMenu.innerHTML = '<li class="p-2 text-sfl-woodLight italic">No matching items found</li>';
      } else {
        matches.forEach(itemKey => {
          let displayName = itemKey.replace(/^\[.*?\]\s*/, '');
          let cleanName = displayName.toLowerCase().trim();

          if (window.trackedTargets.includes(cleanName)) return;

          const li = document.createElement('li');
          li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center';
          li.innerHTML = `<span class="font-bold text-sfl-dirt">${displayName}</span>`;
          
          li.addEventListener('click', () => {
            if (!window.trackedTargets.includes(cleanName)) {
              window.trackedTargets.push(cleanName);
              renderTrackedBadges();
            }
            targetInput.value = '';
            targetMenu.classList.add('hidden');
          });
          targetMenu.appendChild(li);
        });
      }

      targetMenu.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!targetInput.contains(e.target) && !targetMenu.contains(e.target)) {
        targetMenu.classList.add('hidden');
      }
    });
  }

  saveBtn?.addEventListener('click', async () => {
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const activeUser = window.currentUser || (await supabaseClient.auth.getUser())?.data?.user;

        if (activeUser) {
          window.currentUser = activeUser;
          const { error } = await supabaseClient
            .from('profiles')
            .upsert({ 
              id: activeUser.id,
              tracked_items: window.trackedTargets 
            }, { onConflict: 'id' });

          if (error) {
            console.error("Supabase Error saving targets:", error);
            alert(`⚠️ Saved locally, but Supabase error: ${error.message}`);
            return;
          }
        } else {
          console.warn("User session missing. Saved to localStorage only.");
        }
      } catch (err) {
        console.error("Failed to save tracked targets to Supabase:", err.message);
        alert(`⚠️ Saved locally, but failed to reach Supabase: ${err.message}`);
        return;
      }
    }

    renderTrackedBadges();
    alert('✅ Persistent tracking targets saved successfully!');
    hideModal();
  });
}

function renderTrackedBadges() {
  const container = document.getElementById('tracked-targets-container');
  if (!container) return;

  container.innerHTML = '';

  // Hydrate from localStorage if window.trackedTargets is empty
  if (!window.trackedTargets || window.trackedTargets.length === 0) {
    const rawLocal = localStorage.getItem('sfl_tracked_targets');
    if (rawLocal) {
      try { window.trackedTargets = JSON.parse(rawLocal) || []; } catch (e) {}
    }
  }

  if (!window.trackedTargets || window.trackedTargets.length === 0) {
    container.innerHTML = '<span class="text-xs text-sfl-woodLight italic">No items added to persistent tracking list yet.</span>';
    return;
  }

  window.trackedTargets.forEach((itemName, index) => {
    let cleanStr = String(itemName).replace(/^\[.*?\]\s*/, '').trim();
    let displayName = cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
    
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-1.5 bg-sfl-gold/20 border border-sfl-gold text-sfl-dirt px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm';
    badge.innerHTML = `
      <span>${displayName}</span>
      <button type="button" class="text-sfl-accent hover:text-red-700 font-extrabold cursor-pointer ml-1" onclick="removeTrackedTarget(${index})">✕</button>
    `;
    container.appendChild(badge);
  });
}

function removeTrackedTarget(index) {
  if (window.trackedTargets && window.trackedTargets[index] !== undefined) {
    window.trackedTargets.splice(index, 1);
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
  }
}

window.renderTrackedBadges = renderTrackedBadges;

window.openTrackingModal = function() {
  const modal = document.getElementById('tracking-modal');
  if (modal) {
    renderTrackedBadges();
    modal.classList.remove('hidden');
  }
};

// =========================================================================
// MONDAY - SUNDAY WEEKLY SUMMARY POPUP LOGIC
// =========================================================================

/**
 * Calculates Monday 00:00:00 to Sunday 23:59:59 dates for a given week offset using local time.
 */
function getCalendarWeekRange(weekOffset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  // Distance back to Monday (If Sunday [0], Monday was 6 days ago)
  const distanceToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday + (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    mondayDate: monday,
    sundayDate: sunday,
    mondayStr: formatDateYYYYMMDD(monday),
    sundayStr: formatDateYYYYMMDD(sunday)
  };
}

/**
 * Summarizes snapshots between Monday and Sunday for the active week offset.
 */
function calculateWeeklySummary(weekOffset = 0) {
  const { mondayStr, sundayStr, mondayDate, sundayDate } = getCalendarWeekRange(weekOffset);
  
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) {
    history = [];
  }

  let totalItems = 0;
  let totalFlowers = 0;
  let cropBreakdown = {};

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0;

  history.forEach(entry => {
    const entryDateStr = entry.date || entry.yield_date;
    if (entryDateStr && entryDateStr >= mondayStr && entryDateStr <= sundayStr) {
      
      let dayNetFlowers = parseFloat(entry.netFlowers || entry.net_flowers || 0);
      let dayTotalCount = parseFloat(entry.totalCount || entry.total_count || 0);
      let calculatedDayFlowers = 0;

      if (Array.isArray(entry.crops) && entry.crops.length > 0) {
        entry.crops.forEach(crop => {
          const rawName = crop.name || crop.item || 'Crop';
          const cleanKey = (typeof normalizeItemKey === 'function') 
            ? normalizeItemKey(rawName) 
            : rawName.toLowerCase().replace(/^\[.*?\]\s*/, '').trim();
          const cleanName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
          const qty = parseFloat(crop.qty) || 0;
          let flowers = parseFloat(crop.flowers) || 0;

          // If flowers is 0 or uncalculated, calculate using unit price
          if (flowers <= 0 && qty > 0) {
            let unitPrice = 0;
            if (typeof getItemUnitPrice === 'function') {
              unitPrice = getItemUnitPrice(cleanKey);
            } else if (window.allPrices) {
              let matchedKey = Object.keys(window.allPrices).find(k => k.toLowerCase().includes(cleanKey));
              if (matchedKey) unitPrice = parseFloat(window.allPrices[matchedKey]) || 0;
            }
            flowers = (unitPrice * qty) * (1 - taxRate);
          }

          calculatedDayFlowers += flowers;

          if (!cropBreakdown[cleanName]) {
            cropBreakdown[cleanName] = { qty: 0, flowers: 0 };
          }
          cropBreakdown[cleanName].qty += qty;
          cropBreakdown[cleanName].flowers += flowers;
        });
      }

      // Use dayNetFlowers if valid (> 0), otherwise use sum of calculated crop flowers
      let finalDayFlowers = dayNetFlowers > 0 ? dayNetFlowers : calculatedDayFlowers;

      totalItems += dayTotalCount;
      totalFlowers += finalDayFlowers;
    }
  });

  return {
    mondayStr,
    sundayStr,
    mondayFormatted: mondayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sundayFormatted: sundayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    totalItems: Math.ceil(totalItems * 10) / 10,
    totalFlowers: Math.ceil(totalFlowers * 1000) / 1000,
    cropBreakdown
  };
}

/**
 * Renders the Weekly Summary Modal UI.
 */
function renderWeeklySummaryModal() {
  const summary = calculateWeeklySummary(currentWeekOffset);

  // Date Range Display
  const dateRangeEl = document.getElementById('weekly-date-range');
  if (dateRangeEl) {
    dateRangeEl.textContent = `${summary.mondayFormatted} – ${summary.sundayFormatted}`;
  }

  // Week Badge Label
  const weekLabelEl = document.getElementById('week-label-badge');
  if (weekLabelEl) {
    if (currentWeekOffset === 0) weekLabelEl.textContent = 'Current Week';
    else if (currentWeekOffset === -1) weekLabelEl.textContent = 'Last Week';
    else weekLabelEl.textContent = `${Math.abs(currentWeekOffset)} Weeks Ago`;
  }

  // Next Week Button state (Cannot navigate into the future)
  const nextBtn = document.getElementById('next-week-btn');
  if (nextBtn) {
    nextBtn.disabled = currentWeekOffset >= 0;
  }

  // Totals
  const itemsEl = document.getElementById('weekly-total-items');
  const flowersEl = document.getElementById('weekly-total-flowers');
  if (itemsEl) itemsEl.textContent = `${summary.totalItems.toFixed(1)} Items`;
  if (flowersEl) {
    flowersEl.innerHTML = `${summary.totalFlowers.toFixed(3)} ${FLOWER_IMG_HTML}`;
  }

  // Item Breakdown List
  const breakdownContainer = document.getElementById('weekly-item-breakdown');
  if (breakdownContainer) {
    const entries = Object.entries(summary.cropBreakdown);
    if (entries.length === 0) {
      breakdownContainer.innerHTML = '<div class="text-center italic text-sfl-woodLight py-3">No harvests recorded for this calendar week.</div>';
    } else {
      let html = '';
      entries.sort((a, b) => b[1].qty - a[1].qty).forEach(([cropName, data]) => {
        html += `
          <div class="flex justify-between items-center p-1.5 bg-amber-50 rounded border border-amber-200/60">
            <span class="font-bold text-sfl-dirt">${cropName}</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="font-bold text-sfl-wood">+${data.qty.toFixed(1)}</span>
              <span class="text-[10px] text-sfl-green font-semibold flex items-center gap-1">(${data.flowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML})</span>
            </div>
          </div>
        `;
      });
      breakdownContainer.innerHTML = html;
    }
  }
}

/**
 * Binds events for the Weekly Report Popup.
 */
function initWeeklySummaryModal() {
  const modal = document.getElementById('weekly-modal');
  const openBtns = document.querySelectorAll('#open-weekly-modal-btn');
  const closeBtn = document.getElementById('close-weekly-modal-btn');
  const closeFooterBtn = document.getElementById('close-weekly-modal-footer-btn');
  const prevBtn = document.getElementById('prev-week-btn');
  const nextBtn = document.getElementById('next-week-btn');

  const openModal = () => {
    currentWeekOffset = 0; // Reset to current week on open
    renderWeeklySummaryModal();
    modal?.classList.remove('hidden');
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
  };

  openBtns.forEach(btn => btn?.addEventListener('click', openModal));
  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);

  prevBtn?.addEventListener('click', () => {
    currentWeekOffset--;
    renderWeeklySummaryModal();
  });

  nextBtn?.addEventListener('click', () => {
    if (currentWeekOffset < 0) {
      currentWeekOffset++;
      renderWeeklySummaryModal();
    }
  });
}

// --- CRYPTO DONATION CLIPBOARD COPY ---
document.getElementById('donate-btn')?.addEventListener('click', async () => {
  const donationAddress = "0xE32d234D63998F5078de9A7E2303233699276642";
  const donateBtn = document.getElementById('donate-btn');

  try {
    await navigator.clipboard.writeText(donationAddress);
    
    const originalText = donateBtn.textContent;
    donateBtn.textContent = "Copied!";
    donateBtn.classList.add('text-green-400');

    setTimeout(() => {
      donateBtn.textContent = originalText;
      donateBtn.classList.remove('text-green-400');
    }, 2000);

  } catch (err) {
    prompt("Copy your donation address below:", donationAddress);
  }
});
