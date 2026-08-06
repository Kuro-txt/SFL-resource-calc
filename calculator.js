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

  if (status) status.Here is the full HTML code updated to display the flower icon image correctly instead of falling back to the SFL token image. 

The issue occurred because the relative image path `./assets/flower.webp` failed to load, triggering the `onerror` fallback script. This version uses the official direct URL for the Flower Token.

```html
<div class="flex items-center gap-1 font-bold">
  <span>Net Flowers</span>
  <span>0.000</span>
  <img 
    src="[https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/flower.png](https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/flower.png)" 
    onerror="this.onerror=null;this.src='[https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png](https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png)';" 
    class="w-4 h-4 sfl-icon inline-block" 
    alt="Flower Token"
  >
</div>
