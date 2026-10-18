import { renderPetsTemplate } from './petsTemplate.js';
import { 
  parseFarmPets, 
  checkFoodAvailability, 
  calculateFetchingCapacity,
  getTimeUntilUtcReset,
  getStoredEnergyLedger, 
  recordFeedEvent,
  getFoodPrice
} from './petsLogic.js';
import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

let activeFilter = 'all';
let searchQuery = '';
let activePeriod = 'daily';
let isInitialized = false;
let resetTimerInterval = null;

// Sample preview pet (Burro with 47,660 XP = Level 29)
const SAMPLE_PREVIEW_FARM = {
  farm: {
    inventory: {
      "Carrot Juice": 1,
      "Pumpkin": 40,
      "Radish": 25,
      "Cabbage": 15,
      "Cheese": 2,
      "Tomato": 10,
      "Kale": 5
    },
    pets: {
      common: {
        Burro: {
          name: "Burro",
          experience: 47660,
          energy: 540,
          requests: {
            food: [
              "Carrot Juice",
              "Goblin's Treat",
              "Caprese Salad"
            ],
            fedAt: Date.now() - 3600000,
            foodFed: [
              "Carrot Juice"
            ]
          },
          pettedAt: Date.now() - 1800000,
          cheeredAt: Date.now() - (86400000 * 3)
        }
      }
    }
  }
};

export function initPetsPanel() {
  if (isInitialized) return;
  isInitialized = true;

  // Listen to live farm data sync from auth bar / API
  window.addEventListener('farmDataSynced', (e) => {
    ingestLivePetFeedData(e.detail?.farmData || window.farmData);
    renderPetsCards();
    renderEnergyLedger();
  });

  // Listen to price updates
  window.addEventListener('pricesLoaded', () => {
    renderPetsCards();
    renderEnergyLedger();
  });
}

export function mountPetsPanel() {
  const container = document.getElementById('pets-section');
  if (!container) return;

  if (!container.innerHTML.trim() || !document.getElementById('pets-cards-container')) {
    renderPetsTemplate();
    bindPetsEventListeners();
  }

  // Start UTC countdown timer
  startUtcResetTimer();

  // Ingest any feedings from current farmData
  ingestLivePetFeedData(window.farmData);

  renderPetsCards();
  renderEnergyLedger();
}

function startUtcResetTimer() {
  if (resetTimerInterval) clearInterval(resetTimerInterval);

  const updateTimer = () => {
    const el = document.getElementById('pets-utc-reset-timer');
    if (!el) return;
    const t = getTimeUntilUtcReset();
    el.textContent = t.formatted;
  };

  updateTimer();
  resetTimerInterval = setInterval(updateTimer, 1000);
}

/**
 * Checks live pets for fed foods and records them to the energy ledger
 */
function ingestLivePetFeedData(farmData) {
  if (!farmData) return;
  const farm = farmData.farm || farmData;
  const farmId = farmData.farmId || window.currentFarmId || 'preview';
  const pets = parseFarmPets(farmData);

  pets.forEach(pet => {
    const requests = pet.requests;
    if (requests && requests.fedAt && Array.isArray(requests.foodFed) && requests.foodFed.length > 0) {
      let costSfl = 0;
      requests.foodFed.forEach(foodName => {
        costSfl += getFoodPrice(foodName);
      });

      // Energy calculation: Slot 0 gives ~45, Slot 1 ~75, Slot 2 ~115 (avg ~75)
      const estimatedEnergyGained = requests.foodFed.length * (70 + (pet.energyBonus || 0));
      const costPerEnergy = estimatedEnergyGained > 0 ? (costSfl / estimatedEnergyGained) : 0;

      recordFeedEvent({
        farmId: String(farmId),
        petName: pet.name,
        fedAt: requests.fedAt,
        energyGained: estimatedEnergyGained,
        totalEnergy: pet.energy || 0,
        foodsFed: requests.foodFed,
        costSfl: Math.round(costSfl * 10000) / 10000,
        costPerEnergy: Math.round(costPerEnergy * 1000000) / 1000000,
        loggedAt: new Date(requests.fedAt).toISOString()
      });
    }
  });
}

function bindPetsEventListeners() {
  // 1. Filter buttons
  const filterBtns = document.querySelectorAll('.pets-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = "pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition";
      });
      btn.className = "pets-filter-btn bg-sfl-wood text-amber-200 px-3 py-1 rounded-lg text-xs font-bold border border-sfl-dirt cursor-pointer transition";
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderPetsCards();
    });
  });

  // 2. Search input
  const searchInput = document.getElementById('pets-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').toLowerCase().trim();
      renderPetsCards();
    });
  }

  // 3. Refresh button
  const refreshBtn = document.getElementById('pets-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const icon = document.getElementById('pets-refresh-icon');
      if (icon) icon.classList.add('animate-spin');
      if (typeof window.syncFarmCrops === 'function') {
        try { await window.syncFarmCrops(); } catch (_) {}
      }
      setTimeout(() => {
        if (icon) icon.classList.remove('animate-spin');
        mountPetsPanel();
      }, 800);
    });
  }

  // 4. Ledger period toggles
  const periodBtns = document.querySelectorAll('.ledger-period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => {
        b.className = "ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition";
      });
      btn.className = "ledger-period-btn bg-sfl-wood text-amber-200 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition";
      activePeriod = btn.getAttribute('data-period') || 'daily';
      renderEnergyLedger();
    });
  });
}

export function renderPetsCards() {
  const container = document.getElementById('pets-cards-container');
  if (!container) return;

  let dataToUse = window.farmData;
  let isPreview = false;
  if (!dataToUse || !parseFarmPets(dataToUse).length) {
    dataToUse = SAMPLE_PREVIEW_FARM;
    isPreview = true;
  }

  const farm = dataToUse.farm || dataToUse;
  const inventory = farm.inventory || {};
  let pets = parseFarmPets(dataToUse);

  // Apply filters
  if (activeFilter === 'common') {
    pets = pets.filter(p => p.rarity.toLowerCase() === 'common');
  } else if (activeFilter === 'rare') {
    pets = pets.filter(p => p.rarity.toLowerCase() !== 'common');
  } else if (activeFilter === 'hungry') {
    pets = pets.filter(p => {
      const foodReqs = checkFoodAvailability(p.requests, inventory, p.levelStats?.level || 1);
      return foodReqs.some(f => !f.isFed);
    });
  }

  // Apply search
  if (searchQuery) {
    pets = pets.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchQuery);
      const matchCategory = p.category?.toLowerCase().includes(searchQuery);
      const matchFood = p.requests?.food?.some(f => f.toLowerCase().includes(searchQuery));
      return matchName || matchCategory || matchFood;
    });
  }

  updateTopKpis(pets, inventory);

  if (pets.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-sfl-card/40 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-sfl-cardBorder dark:border-slate-800">
        <div class="text-4xl mb-2">🐾</div>
        <div class="text-sm font-bold text-sfl-wood dark:text-amber-200">No Pets Match Your Filter</div>
        <div class="text-xs text-sfl-woodLight dark:text-slate-400 mt-1">Try changing your search or filter pill above.</div>
      </div>
    `;
    return;
  }

  let html = '';
  if (isPreview) {
    html += `
      <div class="col-span-full bg-amber-100/90 dark:bg-slate-800/90 border border-amber-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-sfl-dirt dark:text-amber-100 flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-bold">
          <span>ℹ️</span> Showing Sample Preview Data. Enter your Farm ID in the top bar and click "Sync Farm" to view your live pets!
        </span>
      </div>
    `;
  }

  pets.forEach(pet => {
    const levelStats = pet.levelStats;
    const petLevel = levelStats.level;
    const foodReqs = checkFoodAvailability(pet.requests, inventory, petLevel);
    const fedCount = foodReqs.filter(f => f.isFed).length;
    const totalRequests = foodReqs.length;

    // Fetch capacity calculation based on current energy
    const fetchCap = calculateFetchingCapacity(
      pet.energy || 0,
      petLevel,
      pet.category,
      pet.rarity === 'NFT'
    );

    html += `
      <div class="bg-sfl-card/95 dark:bg-slate-900/90 rounded-2xl border-2 border-sfl-cardBorder dark:border-slate-800 p-4 shadow-sm space-y-4 hover:border-sfl-gold/60 transition">

        <!-- CARD HEADER -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-100/80 dark:bg-slate-800 border border-amber-300/60 dark:border-slate-700 flex items-center justify-center text-3xl shadow-xs shrink-0">
              ${pet.emoji}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-base font-extrabold text-sfl-wood dark:text-amber-100">${pet.name}</h4>
                <span class="bg-amber-100 dark:bg-slate-800 text-sfl-wood dark:text-amber-200 border border-amber-300/80 dark:border-slate-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  ${pet.rarity}
                </span>
                <!-- CATEGORY BADGE -->
                <span class="bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>${pet.categoryInfo?.icon || '🌾'}</span>
                  <span>${pet.category} ➔ ${pet.categoryInfo?.resource || 'Resource'}</span>
                </span>
              </div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold line-clamp-1 mt-0.5">
                ${pet.desc || 'Faithful farm companion'}
              </p>
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-xs">
              Lv. ${levelStats.level}
            </div>
            <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono mt-0.5">
              ${levelStats.progress}%
            </div>
          </div>
        </div>

        <!-- CURRENT ENERGY CAPACITY DISPLAY -->
        <div class="bg-gradient-to-r from-amber-100/80 to-amber-200/50 dark:from-slate-800/80 dark:to-slate-800/40 p-3 rounded-xl border border-amber-300/80 dark:border-slate-700 flex items-center justify-between shadow-xs">
          <div>
            <div class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400 flex items-center gap-1">
              <span>⚡</span> Stored Energy Reserve
            </div>
            <div class="text-xl font-extrabold text-amber-600 dark:text-amber-300 font-mono">
              ${(pet.energy || 0).toLocaleString()} ⚡
            </div>
          </div>
          <div class="text-right text-[10px] text-sfl-woodLight dark:text-slate-400 font-semibold">
            <div>Bonus: <span class="text-amber-600 dark:text-amber-300 font-bold">+${pet.energyBonus || 0}⚡</span> / food</div>
            <div class="text-[9px] text-sfl-woodLight/80 dark:text-slate-500">Resets never expire</div>
          </div>
        </div>

        <!-- FOOD REQUESTS & COST PER ENERGY ECONOMICS -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
              <span>🍲</span> Daily Diet & Energy Costs
            </span>
            <span class="text-[11px] font-bold ${fedCount === totalRequests ? 'text-emerald-600 dark:text-emerald-400' : 'text-sfl-woodLight dark:text-slate-400'}">
              ${fedCount} / ${totalRequests} Fed
            </span>
          </div>

          <div class="space-y-2">
            ${foodReqs.map(food => {
              let badgeHtml = '';
              let bgStyle = 'bg-amber-50/50 dark:bg-slate-800/40 border-amber-200/60 dark:border-slate-700';

              if (food.status === 'fed') {
                badgeHtml = '<span class="text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">✅ Fed</span>';
                bgStyle = 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/50';
              } else if (food.status === 'ready') {
                badgeHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-md border border-emerald-300/80">In Bag: ${food.inBagCount}</span>`;
              } else if (food.status === 'can_cook') {
                badgeHtml = '<span class="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold text-[10px] px-2 py-0.5 rounded-md border border-indigo-300/80">🍳 Can Cook!</span>';
              } else {
                badgeHtml = '<span class="text-orange-600 dark:text-orange-400 font-semibold text-[10px]">Need Ingredients</span>';
              }

              // Recipe ingredient tags
              let recipeDetailsHtml = '';
              if (food.ingredientDetails && food.ingredientDetails.length > 0) {
                const ingsList = food.ingredientDetails.map(ing => `
                  <span class="inline-flex items-center gap-0.5 ${ing.hasEnough ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-mono">
                    ${ing.name}: ${ing.available}/${ing.required}
                  </span>
                `).join('<span class="text-sfl-cardBorder"> • </span>');

                recipeDetailsHtml = `
                  <div class="mt-1 pt-1 border-t border-amber-200/40 dark:border-slate-700/40 text-[9.5px]">
                    <span class="font-bold text-sfl-woodLight dark:text-slate-400">Recipe:</span> ${ingsList}
                  </div>
                `;
              }

              return `
                <div class="p-2.5 rounded-xl border ${bgStyle} flex flex-col gap-1">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="bg-amber-200/60 dark:bg-slate-700 text-sfl-wood dark:text-amber-200 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded">
                        ${food.slotTier}
                      </span>
                      <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100">
                        ${food.foodName}
                      </span>
                      ${food.isBestValue ? `
                        <span class="bg-amber-400 dark:bg-amber-500 text-sfl-dirt dark:text-slate-900 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-xs animate-pulse">
                          ⭐ Best Value
                        </span>
                      ` : ''}
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-sfl-green font-mono font-bold flex items-center gap-0.5">
                        ${food.price.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                      </span>
                      ${badgeHtml}
                    </div>
                  </div>

                  <!-- ENERGY RETURN & COST PER ENERGY RATIO -->
                  <div class="flex items-center justify-between text-[10px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md">
                    <span class="text-amber-700 dark:text-amber-300 font-bold font-mono">
                      ⚡ Yields +${food.totalEnergy} Energy
                    </span>
                    <span class="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                      Cost: ${food.costPerEnergy.toFixed(6)} SFL/⚡
                    </span>
                  </div>

                  ${recipeDetailsHtml}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- INTERACTIVE FETCHING CAPACITY & RESOURCE SIMULATOR -->
        <div class="bg-amber-100/40 dark:bg-slate-800/40 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700/60 space-y-2">
          <div class="flex justify-between items-center text-xs font-bold text-sfl-wood dark:text-amber-200">
            <span class="flex items-center gap-1.5 uppercase">
              <span>🏹</span> Resource Fetching Capacity
            </span>
            <span class="text-[10px] text-sfl-woodLight dark:text-slate-400">
              Yield: +${fetchCap.decimalBonus}x bonus
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <!-- Acorn Option (100 Energy) -->
            <div class="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-200 dark:border-slate-700">
              <div class="flex justify-between items-center text-[11px] font-bold">
                <span class="text-sfl-wood dark:text-amber-100">🌰 Acorns (100⚡)</span>
                <span class="text-amber-600 font-bold">${fetchCap.acorn.maxFetches} fetches</span>
              </div>
              <div class="text-[10px] text-sfl-green font-mono font-bold mt-1">
                Yield: ~${fetchCap.acorn.totalYield} Acorns
              </div>
              <div class="text-[9px] text-sfl-woodLight dark:text-slate-400">
                (${fetchCap.acorn.yieldPerFetch} per fetch)
              </div>
            </div>

            <!-- Category Resource (200 Energy) -->
            <div class="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-200 dark:border-slate-700">
              <div class="flex justify-between items-center text-[11px] font-bold">
                <span class="text-sfl-wood dark:text-amber-100">${fetchCap.category.icon} ${fetchCap.category.name} (200⚡)</span>
                <span class="text-amber-600 font-bold">${fetchCap.category.maxFetches} fetches</span>
              </div>
              <div class="text-[10px] text-sfl-green font-mono font-bold mt-1">
                Yield: ~${fetchCap.category.totalYield} ${fetchCap.category.name}
              </div>
              <div class="text-[9px] text-sfl-woodLight dark:text-slate-400">
                (${fetchCap.category.yieldPerFetch} per fetch)
              </div>
            </div>
          </div>

          ${fetchCap.fossilShell.unlocked ? `
            <div class="bg-white/60 dark:bg-slate-900/60 px-2 py-1 rounded text-[10px] flex justify-between items-center text-sfl-woodLight dark:text-slate-400 font-semibold">
              <span>🐚 Fossil Shells (300⚡):</span>
              <span class="font-bold text-sfl-dirt dark:text-amber-200">${fetchCap.fossilShell.maxFetches} Shells ready to fetch</span>
            </div>
          ` : `
            <div class="text-[9px] text-sfl-woodLight dark:text-slate-500 italic text-center">
              Fossil Shells (300⚡) unlock at Level 20.
            </div>
          `}
        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

function updateTopKpis(pets, inventory) {
  const countEl = document.getElementById('pets-stat-count');
  const energyEl = document.getElementById('pets-stat-energy');
  const pendingEl = document.getElementById('pets-stat-pending-food');
  const bestEffEl = document.getElementById('pets-stat-best-efficiency');

  let totalEnergy = 0;
  let totalPendingFood = 0;
  let lowestCostPerEnergy = Infinity;

  pets.forEach(p => {
    totalEnergy += parseInt(p.energy || 0);
    const foodReqs = checkFoodAvailability(p.requests, inventory, p.levelStats?.level || 1);
    
    foodReqs.forEach(f => {
      if (!f.isFed) {
        totalPendingFood++;
        if (f.costPerEnergy > 0 && f.costPerEnergy < lowestCostPerEnergy) {
          lowestCostPerEnergy = f.costPerEnergy;
        }
      }
    });
  });

  if (countEl) countEl.textContent = pets.length;
  if (energyEl) energyEl.textContent = `${totalEnergy.toLocaleString()} ⚡`;
  if (pendingEl) pendingEl.textContent = totalPendingFood;
  if (bestEffEl) {
    bestEffEl.textContent = lowestCostPerEnergy !== Infinity 
      ? `${lowestCostPerEnergy.toFixed(5)} SFL/⚡` 
      : '0.0000 SFL/⚡';
  }
}

export function renderEnergyLedger() {
  const tbody = document.getElementById('pets-ledger-table-body');
  const totalEnergyEl = document.getElementById('ledger-total-energy');
  const totalCostEl = document.getElementById('ledger-total-cost');
  const avgEffEl = document.getElementById('ledger-avg-efficiency');
  if (!tbody) return;

  const farmId = window.farmData?.farmId || window.currentFarmId || 'preview';
  let ledger = getStoredEnergyLedger(farmId);

  // Fallback demo feeding entries for instant preview
  if (ledger.length === 0) {
    const today = new Date();
    ledger = [
      {
        farmId,
        petName: "Burro",
        fedAt: today.getTime() - 3600000,
        energyGained: 45,
        foodsFed: ["Carrot Juice"],
        costSfl: 0.05,
        costPerEnergy: 0.001111,
        loggedAt: new Date(today.getTime() - 3600000).toISOString()
      },
      {
        farmId,
        petName: "Burro",
        fedAt: today.getTime() - 86400000,
        energyGained: 120,
        foodsFed: ["Carrot Juice", "Goblin's Treat"],
        costSfl: 0.17,
        costPerEnergy: 0.001416,
        loggedAt: new Date(today.getTime() - 86400000).toISOString()
      },
      {
        farmId,
        petName: "Burro",
        fedAt: today.getTime() - (86400000 * 3),
        energyGained: 235,
        foodsFed: ["Carrot Juice", "Goblin's Treat", "Caprese Salad"],
        costSfl: 0.40,
        costPerEnergy: 0.001702,
        loggedAt: new Date(today.getTime() - (86400000 * 3)).toISOString()
      }
    ];
  }

  let filtered = [...ledger];

  if (activePeriod === 'daily') {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    filtered = ledger.filter(item => item.fedAt >= cutoff);
  } else if (activePeriod === 'weekly') {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    filtered = ledger.filter(item => item.fedAt >= cutoff);
  } else if (activePeriod === 'monthly') {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    filtered = ledger.filter(item => item.fedAt >= cutoff);
  }

  let totalEnergy = 0;
  let totalCost = 0;

  filtered.forEach(entry => {
    totalEnergy += parseInt(entry.energyGained || 0);
    totalCost += parseFloat(entry.costSfl || 0);
  });

  const avgCostPerEnergy = totalEnergy > 0 ? (totalCost / totalEnergy) : 0;

  if (totalEnergyEl) totalEnergyEl.textContent = `+${totalEnergy.toLocaleString()} ⚡`;
  if (totalCostEl) totalCostEl.innerHTML = `<span>${totalCost.toFixed(4)}</span> ${FLOWER_IMG_SMALL_HTML}`;
  if (avgEffEl) avgEffEl.textContent = `${avgCostPerEnergy.toFixed(6)} SFL/⚡`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-sfl-woodLight dark:text-slate-400 italic">
          No feeding logs recorded for this period. Feed your pets and sync your farm to record entries!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const dateStr = row.loggedAt ? new Date(row.loggedAt).toLocaleString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    }) : 'Recent';

    const foodsStr = Array.isArray(row.foodsFed) ? row.foodsFed.join(', ') : 'Pet Food';

    return `
      <tr class="hover:bg-amber-100/40 dark:hover:bg-slate-800/40 transition">
        <td class="p-2.5 font-mono text-[11px] text-sfl-woodLight dark:text-slate-400">${dateStr}</td>
        <td class="p-2.5 font-bold text-sfl-wood dark:text-amber-100">${row.petName}</td>
        <td class="p-2.5 text-sfl-dirt dark:text-slate-300">${foodsStr}</td>
        <td class="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-300">+${row.energyGained} ⚡</td>
        <td class="p-2.5 text-right font-mono font-bold text-sfl-green dark:text-emerald-400">${row.costSfl.toFixed(4)}</td>
        <td class="p-2.5 text-right font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">${row.costPerEnergy.toFixed(6)}</td>
      </tr>
    `;
  }).join('');
}
