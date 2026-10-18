import { renderPetsTemplate, renderPetsOptInGate } from './petsTemplate.js';
import { 
  parseFarmPets, 
  checkFoodAvailability, 
  calculateFetchingCapacity,
  getTimeUntilUtcReset,
  getStoredEnergyLedger, 
  recordFeedEvent,
  getFoodPrice,
  isPetTrackerOptedIn,
  setPetTrackerOptIn,
  isWalrusOnesieActive,
  setWalrusOnesieActive,
  getFoodTierAndEnergy,
  fetchCloudPetLedger,
  getPetAuraMultiplier,
  getPetAuraKey,
  setPetAura
} from './petsLogic.js';
import { WALRUS_ONESIE_ENERGY_BOOST, PET_AURA_MULTIPLIERS } from './petsData.js';
import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { ApiService } from '../../services/api.js';

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

  window.addEventListener('farmDataSynced', (e) => {
    if (!isPetTrackerOptedIn()) return;
    ingestLivePetFeedData(e.detail?.farmData || window.farmData);
    renderPetsCards();
    renderEnergyLedger();
  });

  window.addEventListener('pricesLoaded', () => {
    if (!isPetTrackerOptedIn()) return;
    renderPetsCards();
    renderEnergyLedger();
  });
}

export function mountPetsPanel() {
  const container = document.getElementById('pets-section');
  if (!container) return;

  // OPT-IN CHECK: If user has not opted in, show clean opt-in gate
  if (!isPetTrackerOptedIn()) {
    unmountPetsPanel();
    renderPetsOptInGate();
    const optInBtn = document.getElementById('pets-opt-in-btn');
    if (optInBtn) {
      optInBtn.addEventListener('click', () => {
        setPetTrackerOptIn(true);
        mountPetsPanel();
      });
    }
    return;
  }

  if (!container.innerHTML.trim() || !document.getElementById('pets-cards-container')) {
    renderPetsTemplate();
    bindPetsEventListeners();
  }

  startUtcResetTimer();
  ingestLivePetFeedData(window.farmData);

  renderPetsCards();
  renderEnergyLedger();

  const farmId = window.farmData?.farmId || window.currentFarmId;
  if (farmId && farmId !== 'preview') {
    fetchCloudPetLedger(farmId).then(events => {
      if (events && events.length) {
        renderEnergyLedger();
      }
    });
  }
}

export function unmountPetsPanel() {
  if (resetTimerInterval) {
    clearInterval(resetTimerInterval);
    resetTimerInterval = null;
  }
}

function startUtcResetTimer() {
  if (resetTimerInterval) clearInterval(resetTimerInterval);

  const updateTimer = () => {
    const el = document.getElementById('pets-utc-reset-timer');
    if (!el) return;
    const t = getTimeUntilUtcReset();
    el.textContent = `${t.hours}h ${String(t.minutes).padStart(2, '0')}m`;
  };

  updateTimer();
  // 30 second interval eliminates [Violation] setInterval warnings
  resetTimerInterval = setInterval(updateTimer, 30000);
}

/**
 * Checks live pets for fed foods and records them strictly to local ledger
 */
function ingestLivePetFeedData(farmData) {
  if (!isPetTrackerOptedIn()) return;
  if (!farmData) return;
  const farm = farmData.farm || farmData;
  const farmId = farmData.farmId || window.currentFarmId || 'preview';
  const pets = parseFarmPets(farmData);
  const walrusBonus = isWalrusOnesieActive(farmData) ? WALRUS_ONESIE_ENERGY_BOOST : 0;

  pets.forEach(pet => {
    const requests = pet.requests;
    if (requests && requests.fedAt && Array.isArray(requests.foodFed) && requests.foodFed.length > 0) {
      let costSfl = 0;
      let totalEnergyGained = 0;
      const energyBonus = pet.energyBonus || 0;
      const auraMultiplier = getPetAuraMultiplier(pet.name, pet);

      requests.foodFed.forEach((foodName, fIdx) => {
        costSfl += getFoodPrice(foodName);
        const { baseEnergy } = getFoodTierAndEnergy(foodName, fIdx);
        const baseWithAura = Math.round(baseEnergy * auraMultiplier);
        totalEnergyGained += (baseWithAura + energyBonus + walrusBonus);
      });

      const costPerEnergy = totalEnergyGained > 0 ? (costSfl / totalEnergyGained) : 0;

      recordFeedEvent({
        farmId: String(farmId),
        petName: pet.name,
        fedAt: requests.fedAt,
        energyGained: totalEnergyGained,
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
        b.className = "pets-filter-btn bg-amber-100/70 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-slate-700 cursor-pointer transition";
      });
      btn.className = "pets-filter-btn bg-sfl-wood text-amber-200 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-sfl-dirt cursor-pointer transition";
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

  // 3. Refresh button (Dedicated to Pets: fetches farm pet data & cloud ledger without global sync)
  const refreshBtn = document.getElementById('pets-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const icon = document.getElementById('pets-refresh-icon');
      const label = document.getElementById('pets-refresh-label');
      if (icon) icon.classList.add('animate-spin');
      if (label) label.textContent = 'Syncing...';
      refreshBtn.disabled = true;

      try {
        const farmId = window.farmData?.farmId || window.currentFarmId || localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value?.trim();
        const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value?.trim() || '';

        if (!farmId || farmId === 'preview') {
          alert('⚠️ Please enter your Farm ID at the top to sync your pets.');
          return;
        }

        // Fetch live farm data specifically for pets & inventory (bypasses global sync)
        const freshFarm = await ApiService.getFarmFullData(farmId, apiKey, { force: true });
        if (freshFarm) {
          window.farmData = freshFarm;
          const liveInv = freshFarm.inventory || freshFarm.farm?.inventory || {};
          window.farmInventoryData = liveInv;
          try {
            localStorage.setItem('sfl_farm_inventory', JSON.stringify(liveInv));
          } catch (_) {}

          // Ingest live feed data into local ledger
          ingestLivePetFeedData(freshFarm);
        }

        // Fetch latest cloud pet feed events from TiDB Cloud
        if (isPetTrackerOptedIn() && farmId && farmId !== 'preview') {
          try {
            await fetchCloudPetLedger(farmId);
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Notice: Pet-specific sync notice:", err.message);
      } finally {
        if (icon) icon.classList.remove('animate-spin');
        if (label) label.textContent = 'Sync';
        refreshBtn.disabled = false;
        renderPetsCards();
        renderEnergyLedger();
        const walrusToggle = document.getElementById('pets-walrus-onesie-toggle');
        if (walrusToggle) walrusToggle.checked = isWalrusOnesieActive(window.farmData);
      }
    });
  }

  // 4. Ledger period toggles
  const periodBtns = document.querySelectorAll('.ledger-period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => {
        b.className = "ledger-period-btn hover:bg-amber-200/60 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition";
      });
      btn.className = "ledger-period-btn bg-sfl-wood text-amber-200 px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition";
      activePeriod = btn.getAttribute('data-period') || 'daily';
      renderEnergyLedger();
    });
  });

  // 5. Opt-out button
  const optOutBtn = document.getElementById('pets-opt-out-btn');
  if (optOutBtn) {
    optOutBtn.addEventListener('click', () => {
      const confirmOptOut = window.confirm(
        'Opt out of Pet Tracker?\n\nYour local ledger entries will be preserved, but automatic pet tracking and calculations will be paused.'
      );
      if (confirmOptOut) {
        setPetTrackerOptIn(false);
        unmountPetsPanel();
        mountPetsPanel();
      }
    });
  }

  // 6. Walrus Onesie toggle
  const walrusToggle = document.getElementById('pets-walrus-onesie-toggle');
  if (walrusToggle) {
    walrusToggle.checked = isWalrusOnesieActive(window.farmData);
    walrusToggle.addEventListener('change', (e) => {
      setWalrusOnesieActive(e.target.checked);
      renderPetsCards();
      renderEnergyLedger();
    });
  }

  // 7. Pet Aura selector (event delegation on cards container)
  const cardsContainer = document.getElementById('pets-cards-container');
  if (cardsContainer && !cardsContainer.dataset.boundAura) {
    cardsContainer.dataset.boundAura = 'true';
    cardsContainer.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('pet-aura-select')) {
        const petName = e.target.getAttribute('data-pet-name');
        const petId = e.target.getAttribute('data-pet-id');
        const newAura = e.target.value;
        if (petName) setPetAura(petName, newAura);
        if (petId) setPetAura(String(petId), newAura);
        renderPetsCards();
        renderEnergyLedger();
      }
    });
  }
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
  const isWalrusActive = isWalrusOnesieActive(dataToUse);
  const walrusToggle = document.getElementById('pets-walrus-onesie-toggle');
  if (walrusToggle && document.activeElement !== walrusToggle) {
    walrusToggle.checked = isWalrusActive;
  }

  if (activeFilter === 'common') {
    pets = pets.filter(p => p.rarity.toLowerCase() === 'common');
  } else if (activeFilter === 'rare') {
    pets = pets.filter(p => p.rarity.toLowerCase() !== 'common');
  } else if (activeFilter === 'hungry') {
    pets = pets.filter(p => {
      const auraMul = getPetAuraMultiplier(p.name, p);
      const foodReqs = checkFoodAvailability(p.requests, inventory, p.levelStats?.level || 1, auraMul, isWalrusActive);
      return foodReqs.some(f => !f.isFed);
    });
  }

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
      <div class="col-span-full py-8 text-center bg-sfl-card/40 dark:bg-slate-900/40 rounded-xl border border-dashed border-sfl-cardBorder dark:border-slate-800">
        <div class="text-2xl mb-1">🐾</div>
        <div class="text-xs font-bold text-sfl-wood dark:text-amber-200">No Pets Found</div>
        <div class="text-[10px] text-sfl-woodLight dark:text-slate-400 mt-0.5">Try adjusting your filter or search.</div>
      </div>
    `;
    return;
  }

  let html = '';
  if (isPreview) {
    html += `
      <div class="col-span-full bg-amber-100/90 dark:bg-slate-800/90 border border-amber-300 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] text-sfl-dirt dark:text-amber-100 flex items-center justify-between">
        <span class="flex items-center gap-1 font-bold">
          <span>ℹ️</span> Sample Preview: Sync your Farm ID above to view live pets!
        </span>
      </div>
    `;
  }

  pets.forEach((pet, petIdx) => {
    const levelStats = pet.levelStats;
    const petLevel = levelStats.level;
    const auraMultiplier = getPetAuraMultiplier(pet.name, pet);
    const auraKey = getPetAuraKey(pet.name, pet);
    const foodReqs = checkFoodAvailability(pet.requests, inventory, petLevel, auraMultiplier, isWalrusActive);
    const fedCount = foodReqs.filter(f => f.isFed).length;
    const totalRequests = foodReqs.length;

    const fetchCap = calculateFetchingCapacity(
      pet.energy || 0,
      petLevel,
      pet.category,
      pet.rarity === 'NFT',
      pet.name,
      pet.species
    );

    const readyFetches = fetchCap.fetches.filter(f => f.isUnlocked && f.maxFetches > 0);
    const readyFetchesHtml = readyFetches.length > 0 
      ? readyFetches.map(f => `<span>${f.icon} ${f.maxFetches}x (${f.totalYield})</span>`).join(' • ')
      : `<span class="text-sfl-woodLight dark:text-slate-400 font-normal">None ready (need 100⚡)</span>`;

    let rarityBadgeClass = 'bg-amber-100 dark:bg-slate-800 text-sfl-dirt dark:text-amber-200 border-amber-300/60 dark:border-slate-700';
    if (pet.rarity?.toLowerCase() === 'nft') {
      rarityBadgeClass = 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-800';
    } else if (pet.rarity?.toLowerCase() === 'rare') {
      rarityBadgeClass = 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-800';
    }

    html += `
      <div class="bg-sfl-card/95 dark:bg-slate-900/90 rounded-xl border border-sfl-cardBorder dark:border-slate-800 p-3 shadow-xs space-y-2.5 hover:border-sfl-gold/60 transition">

        <!-- COMPACT HEADER ROW -->
        <div class="flex items-center justify-between gap-2 border-b border-sfl-cardBorder/40 dark:border-slate-800 pb-2">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="text-2xl shrink-0 leading-none">${pet.emoji}</span>
            <div class="truncate">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold text-sfl-wood dark:text-amber-100 truncate">${pet.name}</span>
                <span class="${rarityBadgeClass} border text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded shrink-0">
                  ${pet.rarity}
                </span>
                ${auraMultiplier > 1 ? `
                  <span class="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5" title="Aura multiplier: ${auraMultiplier}x to base energy">
                    <span>✨</span> ${auraMultiplier}x
                  </span>
                ` : ''}
              </div>
              <div class="text-[9.5px] text-sfl-woodLight dark:text-slate-400 font-semibold truncate">
                ${pet.species} • Lv. ${levelStats.level} (${levelStats.progress}%)
              </div>
              ${pet.traits ? `
                <div class="text-[8.5px] text-sfl-woodLight/80 dark:text-slate-400/80 font-medium truncate flex items-center gap-1 mt-0.5">
                  ${pet.traits.fur ? `<span>Fur: ${pet.traits.fur}</span>` : ''}
                  ${pet.traits.accessory ? `<span>• ${pet.traits.accessory}</span>` : ''}
                  ${pet.traits.bib ? `<span>• ${pet.traits.bib}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- ENERGY PILL & AURA SELECTOR -->
          <div class="flex flex-col items-end gap-1 shrink-0">
            <div class="inline-flex items-center gap-1 bg-amber-100/90 dark:bg-slate-800 border border-amber-300/80 dark:border-slate-700 text-amber-700 dark:text-amber-300 font-mono font-black text-xs px-2 py-0.5 rounded-lg shadow-xs">
              <span>⚡</span> ${pet.energy || 0}
            </div>
            <div class="flex items-center gap-1">
              <label for="pet-aura-select-${petIdx}" class="text-[9px] font-bold text-sfl-woodLight dark:text-slate-400 flex items-center gap-0.5" title="Aura multiplies base food energy (Common 1.5x, Rare 2x, Mythic 3x)">
                <span>✨</span> Aura:
              </label>
              <select id="pet-aura-select-${petIdx}" data-pet-name="${pet.name}" data-pet-id="${pet.id || ''}" class="pet-aura-select bg-amber-50 dark:bg-slate-800 text-[9.5px] font-bold text-sfl-wood dark:text-amber-200 border border-amber-300/70 dark:border-slate-700 rounded px-1 py-0.5 cursor-pointer focus:ring-1 focus:ring-amber-500">
                <option value="none" ${auraKey === 'none' ? 'selected' : ''}>None (1x)</option>
                <option value="common" ${auraKey === 'common' ? 'selected' : ''}>Common (1.5x)</option>
                <option value="rare" ${auraKey === 'rare' ? 'selected' : ''}>Rare (2x)</option>
                <option value="mythic" ${auraKey === 'mythic' ? 'selected' : ''}>Mythic (3x)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- THIN PROGRESS BAR -->
        <div class="w-full bg-amber-200/50 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div class="bg-amber-500 h-full rounded-full" style="width: ${levelStats.progress}%"></div>
        </div>

        <!-- COMPACT FOOD REQUESTS & COST PER ENERGY -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold uppercase text-sfl-wood dark:text-amber-200">
            <span>🍲 Food Diet & Energy Costs</span>
            <span class="${fedCount === totalRequests ? 'text-emerald-600' : 'text-sfl-woodLight dark:text-slate-400'}">
              ${fedCount}/${totalRequests} Fed
            </span>
          </div>

          <div class="space-y-1">
            ${foodReqs.map((food, fIdx) => {
              let badgeHtml = '';
              let rowStyle = 'bg-amber-50/60 dark:bg-slate-800/40 border-amber-200/60 dark:border-slate-700';

              if (food.status === 'fed') {
                badgeHtml = '<span class="text-emerald-700 dark:text-emerald-400 font-bold text-[9px]">✅ Fed</span>';
                rowStyle = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-800/40';
              } else if (food.status === 'ready') {
                badgeHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[9px] px-1.5 py-0.2 rounded border border-emerald-300/80">Bag: ${food.inBagCount}</span>`;
              } else if (food.status === 'can_cook') {
                badgeHtml = '<span class="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold text-[9px] px-1.5 py-0.2 rounded border border-indigo-300/80">🍳 Cook</span>';
              } else {
                badgeHtml = '<span class="text-orange-600 dark:text-orange-400 font-semibold text-[9px]">Missing</span>';
              }

              let tierBadgeClass = 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300/80';
              if (food.slotTier === 'Easy') {
                tierBadgeClass = 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/80';
              } else if (food.slotTier === 'Hard') {
                tierBadgeClass = 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300/80';
              }

              const detailId = `recipe-pet-${petIdx}-food-${fIdx}`;

              return `
                <div class="p-1.5 rounded-lg border ${rowStyle} text-[10.5px]">
                  <div class="flex items-center justify-between gap-1">
                    <div class="flex items-center gap-1.5 truncate">
                      <span class="${tierBadgeClass} border text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded shrink-0">
                        ${food.slotTier}
                      </span>
                      <span class="font-bold text-sfl-dirt dark:text-amber-100 truncate">${food.foodName}</span>
                      ${food.isBestValue ? `
                        <span class="bg-amber-400 text-slate-900 text-[8px] font-black uppercase px-1 py-0.2 rounded shrink-0">
                          ⭐ Best Value
                        </span>
                      ` : ''}
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-[9.5px] text-sfl-green font-mono font-bold flex items-center">
                        ${food.price.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}
                      </span>
                      ${badgeHtml}
                    </div>
                  </div>

                  <!-- ENERGY & COST PER 100 ENERGY INLINE -->
                  <div class="flex items-center justify-between text-[9.5px] mt-0.5 pt-0.5 border-t border-black/5 dark:border-white/5">
                    <span class="text-amber-700 dark:text-amber-300 font-bold font-mono flex items-center gap-1">
                      +${food.totalEnergy} ⚡
                      ${food.auraMultiplier > 1 ? `<span class="text-[8px] text-amber-600 dark:text-amber-400 font-extrabold" title="Base energy multiplied by ${food.auraMultiplier}x aura">(${food.auraMultiplier}x✨)</span>` : ''}
                      ${food.walrusBonus ? '<span class="text-[8px] text-emerald-600 dark:text-emerald-400 font-extrabold" title="Includes +5⚡ from Walrus Onesie">(+5🦭)</span>' : ''}
                    </span>
                    <span class="text-indigo-600 dark:text-indigo-400 font-mono font-bold" title="${food.costPerEnergy.toFixed(6)} SFL / 1⚡">
                      ${food.costPer100Energy.toFixed(4)} / 100⚡
                    </span>
                    ${food.ingredientDetails?.length ? `
                      <button type="button" onclick="document.getElementById('${detailId}').classList.toggle('hidden')" 
                        class="text-[9px] text-sfl-woodLight hover:text-sfl-wood underline cursor-pointer">
                        Recipe
                      </button>
                    ` : ''}
                  </div>

                  <!-- COLLAPSIBLE RECIPE INGREDIENTS -->
                  ${food.ingredientDetails?.length ? `
                    <div id="${detailId}" class="hidden mt-1 pt-1 border-t border-amber-200/50 dark:border-slate-700 text-[9px] text-sfl-woodLight dark:text-slate-400 space-y-0.5">
                      <div class="flex flex-wrap gap-x-2 gap-y-0.5">
                        ${food.ingredientDetails.map(ing => `
                          <span class="${ing.hasEnough ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-red-500 font-bold'} font-mono">
                            ${ing.name}: ${ing.available}/${ing.required}
                            ${ing.subRecipeInfo ? `<span class="text-[8.5px] font-normal italic ${ing.hasEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'}">(${ing.subRecipeInfo})</span>` : ''}
                          </span>
                        `).join(' • ')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- COMPACT FETCHING CAPACITY & BEST FETCH BY PRICE -->
        <div class="bg-amber-100/40 dark:bg-slate-800/40 p-2 rounded-lg border border-amber-200/60 dark:border-slate-700/60 text-[10px] space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sfl-wood dark:text-amber-200 uppercase flex items-center gap-1">
              <span>🏹</span> Fetch Ready:
            </span>
            <div class="flex flex-wrap items-center gap-1.5 font-mono font-bold text-sfl-dirt dark:text-amber-100">
              ${readyFetchesHtml}
            </div>
          </div>

          ${fetchCap.bestFetch ? `
            <!-- BEST RESOURCE TO FETCH BY PRICE -->
            <div class="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-slate-700/50">
              <span class="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <span>⭐</span> Best Fetch:
              </span>
              <div class="flex items-center gap-1.5 font-bold text-sfl-wood dark:text-amber-200">
                <span>${fetchCap.bestFetch.icon} ${fetchCap.bestFetch.name}</span>
                <span class="font-mono text-[9px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-300 dark:border-emerald-800" title="Fetches yield ~${fetchCap.bestFetch.sflPer100Energy.toFixed(4)} SFL market value per 100 energy">
                  ~${fetchCap.bestFetch.sflPer100Energy.toFixed(4)} SFL / 100⚡
                </span>
              </div>
            </div>
          ` : ''}

          ${fetchCap.allEnergyPlan?.plan?.length ? `
            <!-- BEST FETCH WITH ALL ENERGY -->
            <div class="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-slate-700/50">
              <span class="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <span>💰</span> All Energy (${pet.energy || 0}⚡):
              </span>
              <div class="flex items-center gap-1.5 font-bold text-sfl-wood dark:text-amber-200">
                <span class="font-mono text-[9.5px]">${fetchCap.allEnergyPlan.summaryText}</span>
                <span class="font-mono text-[9px] text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-950/60 px-1 py-0.5 rounded border border-amber-300 dark:border-amber-700" title="Total estimated SFL value generated using all available energy">
                  ~${fetchCap.allEnergyPlan.totalSfl.toFixed(4)} SFL
                </span>
              </div>
            </div>
          ` : ''}
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

  const isWalrusActive = isWalrusOnesieActive(window.farmData);
  let totalEnergy = 0;
  let totalPendingFood = 0;
  let lowestCostPerEnergy = Infinity;

  pets.forEach(p => {
    totalEnergy += parseInt(p.energy || 0);
    const auraMul = getPetAuraMultiplier(p.name, p);
    const foodReqs = checkFoodAvailability(p.requests, inventory, p.levelStats?.level || 1, auraMul, isWalrusActive);
    
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
    const lowest100 = lowestCostPerEnergy !== Infinity ? (lowestCostPerEnergy * 100) : 0;
    bestEffEl.textContent = lowest100 > 0 
      ? `${lowest100.toFixed(4)} SFL` 
      : '0.0000 SFL';
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
  const avgCostPer100 = (avgCostPerEnergy * 100).toFixed(4);

  if (totalEnergyEl) totalEnergyEl.textContent = `+${totalEnergy.toLocaleString()} ⚡`;
  if (totalCostEl) totalCostEl.innerHTML = `<span>${totalCost.toFixed(4)}</span> ${FLOWER_IMG_SMALL_HTML}`;
  if (avgEffEl) avgEffEl.textContent = `${avgCostPer100} SFL`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-sfl-woodLight dark:text-slate-400 italic text-[11px]">
          No local feeding logs for this period. Feed your pets and sync your farm to record entries.
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
    const costPer100 = (parseFloat(row.costPerEnergy || 0) * 100).toFixed(4);

    return `
      <tr class="hover:bg-amber-100/40 dark:hover:bg-slate-800/40 transition">
        <td class="p-2 font-mono text-[10px] text-sfl-woodLight dark:text-slate-400">${dateStr}</td>
        <td class="p-2 font-bold text-sfl-wood dark:text-amber-100">${row.petName}</td>
        <td class="p-2 text-sfl-dirt dark:text-slate-300 truncate max-w-[140px]" title="${foodsStr}">${foodsStr}</td>
        <td class="p-2 text-right font-mono font-bold text-amber-600 dark:text-amber-300">+${row.energyGained} ⚡</td>
        <td class="p-2 text-right font-mono font-bold text-sfl-green dark:text-emerald-400">${row.costSfl.toFixed(4)}</td>
        <td class="p-2 text-right font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">${costPer100} SFL</td>
      </tr>
    `;
  }).join('');
}
