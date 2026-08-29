import { BACKEND_URL } from '../config/constants.js';

window.allPrices = window.allPrices || {};

export function renderCalculatorTemplate() {
  const container = document.getElementById('calc-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-5">

      <!-- COMPACT TAX RATE BAR -->
      <div class="flex justify-end">
        <div class="bg-sfl-card/90 px-3 py-1.5 rounded-xl border-2 border-sfl-cardBorder shadow-sm inline-flex items-center gap-2">
          <label class="text-xs font-bold text-sfl-wood uppercase flex items-center gap-1 whitespace-nowrap">
            <span>🏷️</span> Tax Rate:
          </label>
          <select id="tax-select" class="sfl-input rounded-lg px-2 py-0.5 text-xs font-bold text-sfl-dirt cursor-pointer w-28">
            <option value="0">0% (None)</option>
            <option value="0.05">5%</option>
            <option value="0.075">7.5%</option>
            <option value="0.10" selected>10%</option>
            <option value="0.125">12.5%</option>
            <option value="0.15">15%</option>
          </select>
        </div>
      </div>

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

  const savedTaxRate = localStorage.getItem('sfl_tax_rate');
  const taxEl = document.getElementById('tax-select');
  if (savedTaxRate !== null && taxEl) taxEl.value = savedTaxRate;

  bindCalculatorEvents();
  loadPrices();
}

function bindCalculatorEvents() {
  document.getElementById('tax-select')?.addEventListener('change', (e) => {
    localStorage.setItem('sfl_tax_rate', e.target.value);
    if (typeof window.renderSnapshotHistory === 'function') window.renderSnapshotHistory();
    if (typeof window.renderCropTrackerRows === 'function') window.renderCropTrackerRows();
  });

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
}

export function loadPrices() {
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
      window.allPrices = extractPrices(rawData);
    })
    .catch(() => console.warn("Using default fallback prices."));
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
