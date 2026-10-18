import { renderPetsTemplate } from './petsTemplate.js';
import { 
  parseFarmPets, 
  checkFoodAvailability, 
  getPetInteractionStatus, 
  getStoredEnergyLedger, 
  recordFeedEvent,
  getFoodPrice
} from './petsLogic.js';
import { PanelManager } from '../../services/panelManager.js';
import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';

let activeFilter = 'all';
let searchQuery = '';
let activePeriod = 'daily';
let isInitialized = false;

// Sample preview pet if user doesn't have pets loaded yet
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
          dailySocialXP: {
            [new Date().toISOString().split('T')[0]]: 25
          },
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
    console.log("🐾 Pets Panel: Farm data synced!", e.detail);
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

  // Render template if empty
  if (!container.innerHTML.trim() || !document.getElementById('pets-cards-container')) {
    renderPetsTemplate();
    bindPetsEventListeners();
  }

  // Check for new feedings from live farm data
  ingestLivePetFeedData(window.farmData);

  renderPetsCards();
  renderEnergyLedger();
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

      // Energy calculation: standard SFL gives ~50-100 energy per food
      const estimatedEnergyGained = requests.foodFed.length * 60;
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

  // 4. Ledger period toggles (Daily, Weekly, Monthly, All)
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

  // Use live farmData or sample preview if not synced yet
  let dataToUse = window.farmData;
  let isPreview = false;
  if (!dataToUse || !parseFarmPets(dataToUse).length) {
    dataToUse = SAMPLE_PREVIEW_FARM;
    isPreview = true;
  }

  const farm = dataToUse.farm || dataToUse;
  const inventory = farm.inventory || {};
  let pets = parseFarmPets(dataToUse);

  // Update top KPI stats
  updateTopKpis(pets, isPreview);

  // Apply filters
  if (activeFilter === 'common') {
    pets = pets.filter(p => p.rarity.toLowerCase() === 'common');
  } else if (activeFilter === 'rare') {
    pets = pets.filter(p => p.rarity.toLowerCase() !== 'common');
  } else if (activeFilter === 'hungry') {
    pets = pets.filter(p => {
      const foodReqs = checkFoodAvailability(p.requests, inventory);
      return foodReqs.some(f => !f.isFed);
    });
  } else if (activeFilter === 'nap') {
    pets = pets.filter(p => {
      const interaction = getPetInteractionStatus(p);
      return interaction.pettingReady;
    });
  }

  // Apply search
  if (searchQuery) {
    pets = pets.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchQuery);
      const matchRarity = p.rarity.toLowerCase().includes(searchQuery);
      const matchFood = p.requests?.food?.some(f => f.toLowerCase().includes(searchQuery));
      return matchName || matchRarity || matchFood;
    });
  }

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
    const perkInfo = pet.perkInfo;
    const foodReqs = checkFoodAvailability(pet.requests, inventory);
    const interaction = getPetInteractionStatus(pet);

    const fedCount = foodReqs.filter(f => f.isFed).length;
    const totalRequests = foodReqs.length;

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
              </div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold line-clamp-1">
                ${pet.desc || 'Faithful farm companion'}
              </p>
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-xs">
              Lv. ${levelStats.level}
            </div>
          </div>
        </div>

        <!-- LEVEL & XP PROGRESSION -->
        <div class="bg-amber-50/60 dark:bg-slate-800/50 p-2.5 rounded-xl border border-amber-200/60 dark:border-slate-700/60 space-y-1.5">
          <div class="flex justify-between items-center text-[11px] font-bold">
            <span class="text-sfl-wood dark:text-amber-200">Experience</span>
            <span class="text-sfl-woodLight dark:text-slate-400 font-mono">
              ${Number(levelStats.currentXp).toLocaleString()} / ${Number(levelStats.nextXp).toLocaleString()} XP
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-amber-200/60 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden p-0.5">
            <div class="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500" style="width: ${levelStats.progress}%"></div>
          </div>

          <div class="flex justify-between items-center text-[10px] text-sfl-woodLight dark:text-slate-400 font-semibold">
            <span>Progress: ${levelStats.progress}%</span>
            <span>${Number(levelStats.remainingXp).toLocaleString()} XP to Lv. ${levelStats.level + 1}</span>
          </div>
        </div>

        <!-- ENERGY METER -->
        <div class="flex items-center justify-between bg-amber-100/40 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-amber-200/50 dark:border-slate-700/50">
          <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-1.5">
            <span>⚡</span> Current Energy
          </span>
          <span class="text-sm font-extrabold text-amber-600 dark:text-amber-300 font-mono">
            ${pet.energy || 0}
          </span>
        </div>

        <!-- FOOD REQUESTS & INVENTORY / RECIPES -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
              <span>🍲</span> Food Requests
            </span>
            <span class="text-[11px] font-bold ${fedCount === totalRequests ? 'text-emerald-600 dark:text-emerald-400' : 'text-sfl-woodLight dark:text-slate-400'}">
              ${fedCount} / ${totalRequests} Fed
            </span>
          </div>

          <div class="space-y-1.5">
            ${foodReqs.map((food, idx) => {
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

              // Build Recipe Ingredients breakdown
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
                <div class="p-2 rounded-xl border ${bgStyle} flex flex-col gap-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
                      <span>•</span> ${food.foodName}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-sfl-green font-mono font-bold flex items-center gap-0.5">
                        ${food.price.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                      </span>
                      ${badgeHtml}
                    </div>
                  </div>
                  ${recipeDetailsHtml}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- DAILY INTERACTIONS & TIMERS -->
        <div class="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-sfl-cardBorder/40 dark:border-slate-800">
          <!-- Petting Nap -->
          <div class="bg-amber-100/30 dark:bg-slate-800/30 p-2 rounded-lg">
            <div class="font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-1">
              <span>🖐️</span> Petting Nap
            </div>
            <div class="text-[10px] ${interaction.pettingReady ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-sfl-woodLight dark:text-slate-400'} mt-0.5">
              ${interaction.pettingText}
            </div>
            ${interaction.nextNapInText ? `<div class="text-[9px] text-sfl-woodLight/80 dark:text-slate-500">${interaction.nextNapInText}</div>` : ''}
          </div>

          <!-- Social XP Today -->
          <div class="bg-amber-100/30 dark:bg-slate-800/30 p-2 rounded-lg">
            <div class="font-bold text-sfl-wood dark:text-amber-200 flex items-center gap-1">
              <span>🤝</span> Social XP
            </div>
            <div class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              ${interaction.todaySocialXp} / ${interaction.socialCap} XP (${interaction.socialPercent}%)
            </div>
            <div class="text-[9px] text-sfl-woodLight/80 dark:text-slate-500">${interaction.cheerText}</div>
          </div>
        </div>

        <!-- UPCOMING PERK -->
        ${perkInfo.nextPerk ? `
          <div class="bg-amber-100/60 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-amber-300/40 dark:border-slate-700/40 text-[10px] text-sfl-wood dark:text-amber-200 flex items-center justify-between">
            <span class="font-bold flex items-center gap-1">
              <span>🎁</span> Next at Lv. ${perkInfo.nextPerk.level}:
            </span>
            <span class="text-sfl-woodLight dark:text-slate-300 truncate max-w-[180px]" title="${perkInfo.nextPerk.perk}">
              ${perkInfo.nextPerk.perk}
            </span>
          </div>
        ` : ''}

      </div>
    `;
  });

  container.innerHTML = html;
}

function updateTopKpis(pets, isPreview) {
  const countEl = document.getElementById('pets-stat-count');
  const energyEl = document.getElementById('pets-stat-energy');
  const pendingEl = document.getElementById('pets-stat-pending-food');
  const socialEl = document.getElementById('pets-stat-social-xp');

  let totalEnergy = 0;
  let totalPendingFood = 0;
  let maxSocialXp = 0;

  pets.forEach(p => {
    totalEnergy += parseInt(p.energy || 0);
    const reqs = p.requests?.food || [];
    const fed = p.requests?.foodFed || [];
    totalPendingFood += Math.max(0, reqs.length - fed.length);

    const todayStr = new Date().toISOString().split('T')[0];
    const sXp = p.dailySocialXP?.[todayStr] || 0;
    if (sXp > maxSocialXp) maxSocialXp = sXp;
  });

  if (countEl) countEl.textContent = pets.length;
  if (energyEl) energyEl.textContent = totalEnergy.toLocaleString();
  if (pendingEl) pendingEl.textContent = totalPendingFood;
  if (socialEl) socialEl.textContent = `${maxSocialXp} / 50`;
}

export function renderEnergyLedger() {
  const tbody = document.getElementById('pets-ledger-table-body');
  const totalEnergyEl = document.getElementById('ledger-total-energy');
  const totalCostEl = document.getElementById('ledger-total-cost');
  const avgEffEl = document.getElementById('ledger-avg-efficiency');
  if (!tbody) return;

  const farmId = window.farmData?.farmId || window.currentFarmId || 'preview';
  let ledger = getStoredEnergyLedger(farmId);

  // If local ledger is empty, inject sample historical feed entries for preview
  if (ledger.length === 0) {
    const today = new Date();
    ledger = [
      {
        farmId,
        petName: "Burro",
        fedAt: today.getTime() - 3600000,
        energyGained: 60,
        foodsFed: ["Carrot Juice"],
        costSfl: 0.05,
        costPerEnergy: 0.000833,
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
        energyGained: 180,
        foodsFed: ["Carrot Juice", "Goblin's Treat", "Caprese Salad"],
        costSfl: 0.45,
        costPerEnergy: 0.002500,
        loggedAt: new Date(today.getTime() - (86400000 * 3)).toISOString()
      }
    ];
  }

  // Filter or aggregate by activePeriod
  const now = new Date();
  let filtered = [...ledger];

  if (activePeriod === 'daily') {
    // Last 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    filtered = ledger.filter(item => item.fedAt >= cutoff);
  } else if (activePeriod === 'weekly') {
    // Last 7 days
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    filtered = ledger.filter(item => item.fedAt >= cutoff);
  } else if (activePeriod === 'monthly') {
    // Last 30 days
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

  if (totalEnergyEl) totalEnergyEl.textContent = `+${totalEnergy.toLocaleString()}`;
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
        <td class="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-300">+${row.energyGained}</td>
        <td class="p-2.5 text-right font-mono font-bold text-sfl-green dark:text-emerald-400">${row.costSfl.toFixed(4)}</td>
        <td class="p-2.5 text-right font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">${row.costPerEnergy.toFixed(6)}</td>
      </tr>
    `;
  }).join('');
}
