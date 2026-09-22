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

window.allPrices = window.allPrices && Object.keys(window.allPrices).length > 0 ? window.allPrices : getFallbackPrices();

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
        window.allPrices = { ...getFallbackPrices(), ...extracted };
      }
    }
  } catch {
    console.warn("Using default fallback prices.");
    if (!window.allPrices || Object.keys(window.allPrices).length === 0) {
      window.allPrices = getFallbackPrices();
    }
  }
}

export function extractPrices(data) {
  let pricesMap = {};
  if (!data || typeof data !== 'object') return pricesMap;

  const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

  function searchObj(obj, prefix = '') {
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      let lowerKey = key.toLowerCase().trim();
      if (GLOBAL_EXCLUDES.includes(lowerKey)) continue;
      if (lowerKey.includes('updated')) continue;
      if (typeof window.isExcludedItem === 'function' && window.isExcludedItem(key)) continue;

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
