import { BACKEND_URL, CROP_FLOWER_PRICES, RESOURCE_FLOWER_FALLBACK_PRICES, ALLOWED_ITEM_NAMES } from '../config/constants.js';
import { ApiService } from '../services/api.js';

export function getFallbackPrices() {
  const map = {};
  for (const [k, v] of Object.entries(CROP_FLOWER_PRICES || {})) {
    // Use canonical name from ALLOWED_ITEM_NAMES (e.g. "Merino Wool") to match backend key format
    const cleanKey = k.replace(/[^a-z0-9]/g, '');
    const officialName = ALLOWED_ITEM_NAMES[cleanKey] || (k.charAt(0).toUpperCase() + k.slice(1));
    map[officialName] = v;
  }
  for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES || {})) {
    const cleanKey = k.replace(/[^a-z0-9]/g, '');
    const officialName = ALLOWED_ITEM_NAMES[cleanKey] || (k.charAt(0).toUpperCase() + k.slice(1));
    map[officialName] = v;
  }
  return map;
}

// ── Price Cache Format Version ─────────────────────────────────────────────
// Bump this string whenever the price format/scale changes so all browsers
// automatically clear their stale localStorage cache on next load.
const PRICE_FORMAT_VERSION = 'v4-type-isolated';

export function getInitialPrices() {
  try {
    // If the stored format version doesn't match, wipe old price cache entirely.
    const storedVersion = localStorage.getItem('sfl_prices_format_version');
    if (storedVersion !== PRICE_FORMAT_VERSION) {
      console.warn('[SFL] Price format version mismatch — clearing stale price cache.');
      try { localStorage.removeItem('sfl_live_prices'); } catch (_) {}
      try { localStorage.setItem('sfl_prices_format_version', PRICE_FORMAT_VERSION); } catch (_) {}
      return getFallbackPrices();
    }

    const saved = localStorage.getItem('sfl_live_prices');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return { ...getFallbackPrices(), ...parsed };
      }
    }
  } catch (_) {}
  return getFallbackPrices();
}

window.allPrices = window.allPrices && Object.keys(window.allPrices).length > 0 ? window.allPrices : getInitialPrices();


export function renderCalculatorTemplate() {
  const container = document.getElementById('calc-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-5">

      <!-- HARVEST TRACKER SUB-SECTION -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm space-y-4">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
              <span>🌾</span> Daily Yield & Resource Tracker
            </h3>
            <p class="text-[11px] text-sfl-woodLight font-semibold">Automated yield tracking against your 00:00 UTC cloud baseline (Kept for 30 days).</p>
          </div>
        </div>

        <!-- AUTOMATED TRACKING & WEEKLY SUMMARY ACTION BAR -->
        <div class="flex flex-col sm:flex-row justify-center items-center gap-2 border-t-2 border-b-2 border-sfl-cardBorder/60 py-3">
          <button id="open-tracking-modal-btn" class="w-full sm:w-auto bg-amber-700 text-amber-100 hover:bg-amber-800 font-bold py-2 px-4 rounded-xl border-2 border-sfl-dirt text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <span>⚙️</span> Manage Automated Tracking Targets
          </button>
          <button id="open-weekly-modal-btn" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-amber-950 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-amber-100 font-black py-2 px-4 rounded-xl border-2 border-sfl-dirt shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 text-xs">
            <span>📊</span> Weekly Summary
          </button>
        </div>

        <!-- TRACKED TARGETS STATUS BAR -->
        <div id="tracker-targets-status-bar" class="hidden bg-sfl-card/70 border-2 border-sfl-cardBorder/70 p-2.5 rounded-lg text-xs shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"></div>

        <!-- BASELINE STATUS DISPLAY -->
        <div id="pre-harvest-status" class="hidden bg-amber-100/90 border-2 border-amber-400 p-3 rounded-lg text-xs font-bold text-amber-900 space-y-2 shadow-sm">
          <div id="cloud-baseline-status" class="flex justify-between items-center text-green-800">
            <span>☁️ 00:00 UTC Cloud Baseline: <span class="font-extrabold">Active</span></span>
            <span class="text-[10px] bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-bold">Automatic Sync</span>
          </div>
        </div>

        <!-- SNAPSHOT HISTORY TABLE -->
        <div class="overflow-x-auto bg-white/70 border-2 border-sfl-cardBorder rounded-lg">
          <table class="w-full text-left text-xs text-sfl-dirt">
            <thead class="bg-sfl-card border-b-2 border-sfl-cardBorder text-sfl-wood uppercase text-[11px]">
              <tr>
                <th class="px-3 py-2.5">Date</th>
                <th class="px-3 py-2.5">Total Daily Yield</th>
                <th class="px-3 py-2.5">Harvested Breakdown</th>
                <th class="px-3 py-2.5">Harvest Net Flowers</th>
                <th class="px-2 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="snapshot-history-body" class="divide-y divide-sfl-cardBorder/40 font-medium">
              <tr>
                <td colspan="5" class="px-4 py-6 text-center text-sfl-woodLight italic">
                  No harvest sessions logged yet!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

export function initCalculatorPanel() {
  renderCalculatorTemplate();
  bindCalculatorEvents();
  loadPrices();
}

function bindCalculatorEvents() {
  const handleDonation = async () => {
    const donationAddress = "0x55b97223202457d427a68389346da9a9314d0511";
    const donateBtn = document.getElementById('donate-btn');

    try {
      await navigator.clipboard.writeText(donationAddress);
      if (donateBtn) {
        donateBtn.textContent = "Copied! ❤️";
        donateBtn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
      }

      setTimeout(() => {
        if (donateBtn) {
          donateBtn.textContent = "Donate";
          donateBtn.classList.remove('bg-emerald-500', 'text-white', 'border-emerald-600');
        }
      }, 2500);
    } catch (err) {
      prompt("Copy your donation address below:", donationAddress);
    }
  };

  document.getElementById('donate-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDonation();
  });
}

export async function loadPrices(force = false) {
  try {
    const rawData = await ApiService.getPrices({ force });
    if (rawData && typeof rawData === 'object') {
      const copy = { ...rawData };
      delete copy.updated_text;
      delete copy.updatedText;
      delete copy.updated_at;
      delete copy.updatedAt;
      const extracted = extractPrices(copy);
      if (Object.keys(extracted).length > 0) {
        // Extracted prices (live P2P) now overwrite fallback prices
        window.allPrices = { ...getFallbackPrices(), ...extracted };
        try {
          localStorage.setItem('sfl_live_prices', JSON.stringify(window.allPrices));
          localStorage.setItem('sfl_prices_updated_at', new Date().toISOString());
          localStorage.setItem('sfl_prices_format_version', PRICE_FORMAT_VERSION);
        } catch (_) {}


        if (rawData.flowerPrice && parseFloat(rawData.flowerPrice) > 0) {
          window.flowerUsdRate = parseFloat(rawData.flowerPrice);
          try {
            localStorage.setItem('sfl_flower_usd_rate', String(window.flowerUsdRate));
          } catch (_) {}
        }

        // Notify active panels to re-render with fresh real prices
        if (typeof window.renderSnapshotHistory === 'function') {
          window.renderSnapshotHistory();
        }
        if (typeof window.refreshDashboardView === 'function') {
          window.refreshDashboardView();
        }
        if (typeof window.renderGoalTracker === 'function') {
          window.renderGoalTracker();
        }
        if (typeof window.renderWishlist === 'function') {
          window.renderWishlist();
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pricesLoaded', { detail: window.allPrices }));
        }
      }
    }
  } catch {
    console.warn("Using default fallback prices.");
    if (!window.allPrices || Object.keys(window.allPrices).length === 0) {
      window.allPrices = getInitialPrices();
    }
  }
}

export function extractPrices(data) {
  let pricesMap = {};
  if (!data || typeof data !== 'object') return pricesMap;

  // Crucial: 'items' contains NFT wearables and collectibles breakdown and MUST NOT be traversed,
  // preventing NFT floor prices (e.g. Wearable #56 Parsnip floor 596) from overwriting crop P2P prices (0.0096).
  const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id', 'items'];

  // 1. Direct priority extraction from p2p and crops dictionaries
  const sourceDicts = [data.p2p, data.crops];
  for (const dict of sourceDicts) {
    if (dict && typeof dict === 'object') {
      for (const [k, v] of Object.entries(dict)) {
        const num = typeof v === 'number' ? v : parseFloat(v);
        if (!isNaN(num) && num > 0) {
          pricesMap[k] = num;
          if (!k.startsWith('[')) pricesMap[`[P2P] ${k}`] = num;
        }
      }
    }
  }

  function searchObj(obj, prefix = '') {
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      let lowerKey = key.toLowerCase().trim();
      if (GLOBAL_EXCLUDES.includes(lowerKey)) continue;
      if (lowerKey.includes('updated')) continue;
      if (typeof window.isExcludedItem === 'function' && window.isExcludedItem(key)) continue;

      let val = obj[key];

      if (typeof val === 'number') {
        if (pricesMap[key] === undefined) pricesMap[key] = val;
        if (prefix && pricesMap[prefix + key] === undefined) pricesMap[prefix + key] = val;
      } else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
        const num = parseFloat(val);
        if (pricesMap[key] === undefined) pricesMap[key] = num;
        if (prefix && pricesMap[prefix + key] === undefined) pricesMap[prefix + key] = num;
      } else if (val && typeof val === 'object') {
        let p = val.price ?? val.sfl ?? val.sflPrice ?? val.flowerPrice ?? val.unitPrice;
        if (p !== undefined && p !== null) {
          const num = parseFloat(p) || 0;
          if (pricesMap[key] === undefined) pricesMap[key] = num;
          if (prefix && pricesMap[prefix + key] === undefined) pricesMap[prefix + key] = num;
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
