import { KNOWN_IDS } from '../../data/knownIds.js';
import { BUILDINGS_CATALOG, getBuildings, getBuildingById, getBoostsForItem } from '../../data/procBoosts.js';
import { prngChance, findNextProc, forecastProcs, simulateBatchCraft } from '../../utils/prng.js';

// State
let currentBuildingId = 'kitchen';
let currentItemName = 'Beetroot Blaze';
let currentItemId = KNOWN_IDS['Beetroot Blaze'] || 539;
let currentCriticalHitName = "Master Chef's Cleaver";
let currentChance = 10;
let currentBoost = null;
let currentFarmId = '';
let currentCounter = 0;
let currentBatchSize = 10;
let showOnlyProcs = false;
let itemSearchQuery = '';
let isCustomMode = false;
const forecastCount = 50;

function getSyncedFarmActivity() {
  const farmObj = window.farmData || {};
  return {
    ...(farmObj.farmActivity || {}),
    ...(farmObj.activity || {}),
    ...(farmObj.bumpkin?.activity || {}),
    ...(farmObj.farm?.farmActivity || {}),
    ...(farmObj.farm?.activity || {})
  };
}

function getSyncedFarmId() {
  return localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value?.trim() || '';
}

function autoDetectCounter(itemName, buildingId) {
  const building = getBuildingById(buildingId);
  const act = getSyncedFarmActivity();

  const suffixes = [
    building?.activitySuffix,
    'Cooked',
    'Processed',
    'Fermented',
    'Crafted',
    'Harvested',
    'Aged'
  ].filter(Boolean);

  for (const sfx of suffixes) {
    const key = `${itemName} ${sfx}`;
    if (act[key] !== undefined) return Number(act[key]) || 0;
  }

  for (const sfx of suffixes) {
    const cleanTarget = `${itemName} ${sfx}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k in act) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) {
        return Number(act[k]) || 0;
      }
    }
  }

  if (act[itemName] !== undefined) return Number(act[itemName]) || 0;
  return 0;
}

export function mountProcsPanel() {
  const mountEl = document.getElementById('procs-section');
  if (!mountEl) return;

  if (!currentFarmId) {
    currentFarmId = getSyncedFarmId() || '0';
  }

  const building = getBuildingById(currentBuildingId) || BUILDINGS_CATALOG[0];
  currentBuildingId = building.id;

  const availableBoosts = getBoostsForItem(currentBuildingId, currentItemName);
  if (!currentBoost && availableBoosts.length > 0) {
    currentBoost = availableBoosts[0];
    currentCriticalHitName = currentBoost.boostName;
    currentChance = currentBoost.chance;
  }

  const detected = autoDetectCounter(currentItemName, currentBuildingId);
  if (detected > 0) {
    currentCounter = detected;
  }

  renderPanel(mountEl);
}

function renderPanel(mountEl) {
  const farmIdNum = Number(currentFarmId) || 0;
  const itemIdNum = Number(currentItemId) || 0;
  const chanceNum = Number(currentChance) || 0;
  const counterNum = Number(currentCounter) || 0;

  const currentBuilding = getBuildingById(currentBuildingId) || BUILDINGS_CATALOG[0];
  const availableBoosts = getBoostsForItem(currentBuildingId, currentItemName);

  if (!currentBoost && availableBoosts.length > 0) {
    currentBoost = availableBoosts[0];
    currentCriticalHitName = currentBoost.boostName;
    currentChance = currentBoost.chance;
  }

  const verb = currentBuilding.verb || 'Craft';
  const verbPlural = currentBuilding.verbPlural || 'Crafts';

  const buildingItems = currentBuilding.items.filter(it =>
    !itemSearchQuery || it.name.toLowerCase().includes(itemSearchQuery.toLowerCase().trim())
  );

  const nextHit = findNextProc({
    farmId: farmIdNum,
    itemId: itemIdNum,
    currentCounter: counterNum,
    chance: chanceNum,
    criticalHitName: currentCriticalHitName,
    maxLookahead: 300
  });

  const isAdditive = currentBoost?.isAdditive ?? false;
  const procMultiplier = currentBoost?.procMultiplier ?? 2;
  const procBonus = currentBoost?.procBonus ?? 1;

  const batchResults = simulateBatchCraft({
    farmId: farmIdNum,
    itemId: itemIdNum,
    startCounter: counterNum,
    batchSize: currentBatchSize,
    chance: chanceNum,
    criticalHitName: currentCriticalHitName,
    baseYield: 1,
    procMultiplier,
    procBonus,
    isAdditive
  });

  const rolls = forecastProcs({
    farmId: farmIdNum,
    itemId: itemIdNum,
    startCounter: counterNum,
    count: forecastCount,
    chance: chanceNum,
    criticalHitName: currentCriticalHitName
  });

  const visibleRolls = showOnlyProcs ? rolls.filter(r => r.proc) : rolls;

  mountEl.innerHTML = `
    <div class="space-y-3 max-w-5xl mx-auto px-1 sm:px-2 py-2">
      <!-- Top Bar: Title + Farm ID + Compact Counter Controls -->
      <div class="bg-amber-100/70 dark:bg-slate-900/80 border border-amber-300/80 dark:border-amber-800/40 rounded-2xl p-3 sm:p-3.5 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl select-none">🎲</span>
              <h2 class="text-base font-bold text-sfl-dirt dark:text-amber-100">
                Item Procs & PRNG Predictor
              </h2>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Official MurmurHash3
              </span>
            </div>
            <p class="text-xs text-sfl-woodLight dark:text-slate-400 mt-0.5">
              Forecast double yields and critical drops for your farm.
            </p>
          </div>

          <!-- Farm ID & Compact Counter Inputs -->
          <div class="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
            <div class="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-amber-200/80 dark:border-slate-700">
              <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Farm:</span>
              <input type="number" id="procs-farm-id-input" value="${currentFarmId}" 
                placeholder="12345" 
                class="w-16 px-1.5 py-0.5 text-xs font-mono font-bold rounded border border-amber-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>

            <div class="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-amber-200/80 dark:border-slate-700">
              <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Counter:</span>
              <button type="button" id="procs-counter-dec-btn" class="w-5 h-5 rounded bg-amber-100 dark:bg-slate-700 hover:bg-amber-200 text-xs font-bold text-sfl-dirt dark:text-slate-200 leading-none cursor-pointer select-none">-</button>
              <input type="number" id="procs-counter-input" value="${currentCounter}" min="0" 
                class="w-14 px-1 py-0.5 text-center font-mono font-bold text-xs rounded border border-amber-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sfl-dirt dark:text-amber-100 focus:outline-none" />
              <button type="button" id="procs-counter-inc-btn" class="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold leading-none cursor-pointer select-none">+</button>
              <button type="button" id="procs-sync-counter-btn" class="text-xs ml-0.5 hover:opacity-80 cursor-pointer" title="Auto-detect from synced farmActivity">🔄</button>
            </div>
          </div>
        </div>

        <!-- TIER 1: Buildings Bar -->
        <div class="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-slate-800">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide">
              🏛️ 1. Building:
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5" id="procs-buildings-container">
            ${BUILDINGS_CATALOG.map(b => {
              const isActive = !isCustomMode && currentBuildingId === b.id;
              const activeCls = isActive 
                ? 'bg-amber-600 text-white font-bold shadow-xs border-amber-700 ring-2 ring-amber-400/50' 
                : 'bg-white/80 dark:bg-slate-800/80 text-sfl-wood dark:text-slate-300 hover:bg-amber-100/90 dark:hover:bg-slate-700 border-amber-200/80 dark:border-slate-700 font-medium';
              return `
                <button type="button" data-building-id="${b.id}" class="procs-building-btn px-2.5 py-1 rounded-xl text-xs border transition flex items-center gap-1.5 cursor-pointer select-none ${activeCls}">
                  <span>${b.icon}</span>
                  <span>${b.name}</span>
                  <span class="text-[10px] opacity-75 font-mono">(${b.items.length})</span>
                </button>
              `;
            }).join('')}
            <button type="button" id="procs-custom-mode-btn" class="px-2.5 py-1 rounded-xl text-xs border transition flex items-center gap-1 cursor-pointer select-none ${isCustomMode ? 'bg-amber-600 text-white font-bold shadow-xs border-amber-700 ring-2 ring-amber-400/50' : 'bg-white/80 dark:bg-slate-800/80 text-sfl-wood dark:text-slate-300 hover:bg-amber-100/90 dark:hover:bg-slate-700 border-amber-200/80 dark:border-slate-700 font-medium'}">
              <span>⚙️</span>
              <span>Custom</span>
            </button>
          </div>
        </div>

        ${!isCustomMode ? `
        <!-- TIER 2: Items in Selected Building -->
        <div class="mt-2.5 pt-2 border-t border-amber-200/40 dark:border-slate-800/80">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mb-1.5">
            <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1">
              <span>${currentBuilding.icon}</span>
              <span>2. Pick Item in ${currentBuilding.name}:</span>
            </span>
            <div class="w-full sm:w-44 relative">
              <input type="text" id="procs-item-filter-input" value="${itemSearchQuery}" placeholder="Filter items..." 
                class="w-full px-2 py-0.5 text-xs rounded-lg border border-amber-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              ${itemSearchQuery ? `<button type="button" id="procs-clear-search-btn" class="absolute right-2 top-0.5 text-xs text-slate-400 hover:text-slate-600">✕</button>` : ''}
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 py-1" id="procs-items-container">
            ${buildingItems.map(it => {
              const isSelected = currentItemName === it.name;
              const selectedCls = isSelected
                ? 'bg-amber-500 text-white font-bold shadow-xs border-amber-600 ring-1 ring-amber-300'
                : 'bg-white/90 dark:bg-slate-800/90 text-sfl-dirt dark:text-slate-300 hover:bg-amber-100/80 dark:hover:bg-slate-700 border-amber-200/70 dark:border-slate-700 font-medium';
              return `
                <button type="button" data-item-name="${it.name}" data-item-id="${it.id}" class="procs-item-btn px-2 py-0.5 rounded-lg text-xs border transition flex items-center gap-1 cursor-pointer select-none ${selectedCls}">
                  <span>${it.icon || '🍽️'}</span>
                  <span>${it.name}</span>
                </button>
              `;
            }).join('')}
            ${buildingItems.length === 0 ? `<p class="text-xs text-slate-400 italic py-1">No items found matching "${itemSearchQuery}"</p>` : ''}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Compact Hero "Next Proc" Banner -->
      ${renderCompactHeroBanner(nextHit, chanceNum, currentItemName, currentCriticalHitName, verb, verbPlural)}

      <!-- Selected Boost Information Card (Clean & Concise) -->
      <div class="bg-amber-50/60 dark:bg-slate-900/60 border border-amber-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${currentBoost?.icon || '✨'}</span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs sm:text-sm font-bold text-sfl-dirt dark:text-amber-100">${currentCriticalHitName}</h4>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  ${chanceNum}% Chance
                </span>
                <span class="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  ${currentBoost?.effect || (isAdditive ? `+${procBonus} extra` : `x${procMultiplier} output`)}
                </span>
                ${currentBoost?.ranks ? `
                  <div class="flex items-center gap-1 bg-amber-100/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-lg border border-amber-300/80 dark:border-slate-700">
                    <span class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Rank:</span>
                    ${currentBoost.ranks.map(r => `
                      <button type="button" data-rank="${r.rank}" data-rank-chance="${r.chance}" class="procs-rank-btn px-1.5 py-0.2 rounded text-[10px] font-mono font-bold transition cursor-pointer select-none ${chanceNum === r.chance ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white/80 dark:bg-slate-700 text-sfl-wood dark:text-slate-300 hover:bg-amber-200'}">
                        R${r.rank} (${r.chance}%)
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
              <p class="text-xs text-sfl-woodLight dark:text-slate-400 mt-0.5">
                ${currentBoost?.description || `${chanceNum}% chance to trigger ${currentCriticalHitName}`}
              </p>
            </div>
          </div>

          <!-- Boost Pills if multiple boosts available -->
          ${!isCustomMode && availableBoosts.length > 1 ? `
            <div class="flex flex-wrap gap-1.5 self-end sm:self-auto shrink-0">
              ${availableBoosts.map(b => {
                const isCur = currentCriticalHitName === b.boostName;
                const pillCls = isCur
                  ? 'bg-amber-600 text-white font-bold border-amber-700'
                  : 'bg-white/80 dark:bg-slate-800 text-sfl-wood dark:text-slate-300 border-amber-200 dark:border-slate-700 hover:bg-amber-100';
                return `
                  <button type="button" data-boost-name="${b.boostName}" class="procs-boost-choice-btn px-2 py-0.5 rounded-md text-[11px] border transition cursor-pointer ${pillCls}">
                    <span>${b.icon || '✨'}</span>
                    <span>${b.name}</span>
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>

        ${isCustomMode ? `
        <!-- Custom Mode Parameters Drawer (Only shown in Custom Mode) -->
        <div class="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <label class="block text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400 mb-0.5">Item Name & ID</label>
            <div class="flex gap-1">
              <input type="text" id="procs-item-name-input" value="${currentItemName}" class="w-full px-2 py-1 rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 font-semibold text-xs" />
              <input type="number" id="procs-item-id-input" value="${currentItemId}" class="w-16 px-1.5 py-1 rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 font-mono text-xs" />
            </div>
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400 mb-0.5">Critical Hit Name</label>
            <input type="text" id="procs-crit-name-input" value="${currentCriticalHitName}" class="w-full px-2 py-1 rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 font-semibold text-xs" />
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400 mb-0.5">Chance (%)</label>
            <input type="number" id="procs-chance-input" value="${currentChance}" min="0.1" max="100" step="0.1" class="w-full px-2 py-1 rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 font-mono text-xs" />
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Batch Cooking/Crafting Simulator -->
      <div class="bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-2.5">
          <div>
            <h3 class="text-sm font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
              <span>🧮</span> Batch ${verb}ing Simulator
            </h3>
            <p class="text-xs text-sfl-woodLight dark:text-slate-400">
              Calculate expected procs and yields if you ${verb.toLowerCase()} a batch right now.
            </p>
          </div>
          <div class="flex items-center gap-2 self-stretch sm:self-auto">
            <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Batch Size:</span>
            <div class="flex items-center gap-1">
              ${[5, 10, 20, 50].map(sz => `
                <button type="button" data-batch-size="${sz}" class="procs-batch-size-btn px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${currentBatchSize === sz ? 'bg-amber-600 text-white border-amber-700' : 'bg-amber-50 dark:bg-slate-800 text-sfl-wood dark:text-slate-300 border-amber-200 dark:border-slate-700 hover:bg-amber-100'}">
                  ${sz}
                </button>
              `).join('')}
              <input type="number" id="procs-batch-input" value="${currentBatchSize}" min="1" max="500"
                class="w-12 px-1 py-0.5 text-center font-mono text-xs font-bold rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="bg-amber-50/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-200/50 dark:border-slate-700/60">
            <span class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Total Procs</span>
            <div class="text-lg font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
              ${batchResults.procsCount} <span class="text-xs font-normal text-slate-500">/ ${batchResults.batchSize}</span>
            </div>
            <span class="text-[10px] text-slate-500 font-mono">${((batchResults.procsCount / (batchResults.batchSize || 1)) * 100).toFixed(1)}% hit rate</span>
          </div>

          <div class="bg-amber-50/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-200/50 dark:border-slate-700/60">
            <span class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Total Yield</span>
            <div class="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
              ${batchResults.totalYield} <span class="text-xs font-normal text-slate-500">items</span>
            </div>
            <span class="text-[10px] text-emerald-600 font-mono">+${batchResults.bonusYield} bonus</span>
          </div>

          <div class="bg-amber-50/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-200/50 dark:border-slate-700/60 col-span-2">
            <span class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Procs On ${verbPlural}</span>
            <div class="text-xs font-mono font-bold text-sfl-dirt dark:text-amber-200 mt-1 flex flex-wrap gap-1">
              ${batchResults.procIndices.length > 0 
                ? batchResults.procIndices.map(idx => `
                    <span class="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700">
                      ${verb} #${idx}
                    </span>
                  `).join('')
                : `<span class="text-slate-400 font-normal italic">None in this batch range</span>`
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Forecast Table (Next 50 Rolls) -->
      <div class="bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2.5">
          <div>
            <h3 class="text-sm font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5">
              <span>📜</span> Upcoming Rolls Timeline (Next ${forecastCount} Rolls)
            </h3>
            <p class="text-xs text-sfl-woodLight dark:text-slate-400">
              Deterministic sequence for <span class="font-mono font-bold">${currentItemName}</span> with <span class="font-mono font-bold">${currentCriticalHitName}</span>.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-sfl-wood dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" id="procs-filter-procs-only" ${showOnlyProcs ? 'checked' : ''} class="rounded accent-amber-600 cursor-pointer" />
              <span>Show only Procs (${rolls.filter(r => r.proc).length})</span>
            </label>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-amber-200/60 dark:border-slate-800">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-amber-100/70 dark:bg-slate-800/80 text-sfl-wood dark:text-amber-200 font-bold border-b border-amber-200/80 dark:border-slate-700">
                <th class="py-1.5 px-3 text-center w-16">${verb} #</th>
                <th class="py-1.5 px-3 text-center w-24">Counter</th>
                <th class="py-1.5 px-3 text-center w-28">Roll Value (%)</th>
                <th class="py-1.5 px-3 text-center w-24">Threshold</th>
                <th class="py-1.5 px-3 text-center w-28">Outcome</th>
                <th class="py-1.5 px-3">Visual Result</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-100/60 dark:divide-slate-800 font-mono">
              ${visibleRolls.length > 0 ? visibleRolls.map(r => {
                const isHit = r.proc;
                const rowBg = isHit 
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 font-bold' 
                  : 'hover:bg-amber-50/40 dark:hover:bg-slate-800/40';
                return `
                  <tr class="${rowBg} transition-colors">
                    <td class="py-1.5 px-3 text-center text-sfl-woodLight dark:text-slate-400">#${r.step}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-sfl-dirt dark:text-amber-100">${r.counter}</td>
                    <td class="py-1.5 px-3 text-center ${isHit ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-500'}">
                      ${r.rollPercentage}%
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-400">< ${chanceNum}%</td>
                    <td class="py-1.5 px-3 text-center">
                      ${isHit 
                        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">PROC 🎉</span>` 
                        : `<span class="text-slate-400 text-[11px] font-normal">Normal</span>`
                      }
                    </td>
                    <td class="py-1.5 px-3">
                      <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                        <div class="${isHit ? 'bg-emerald-500' : 'bg-amber-300 dark:bg-amber-700'}" style="width: ${Math.min(100, Math.max(2, r.rollValue * 100))}%"></div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="6" class="py-5 text-center text-slate-400 italic font-sans text-xs">
                    No procs found in the next ${forecastCount} rolls. Try expanding your search or increasing proc chance.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  attachEventListeners(mountEl);
}

function renderCompactHeroBanner(nextHit, chanceNum, itemName, critName, verb, verbPlural) {
  if (!nextHit) {
    return `
      <div class="bg-amber-100/70 dark:bg-slate-800/80 border border-amber-300 dark:border-slate-700 rounded-xl p-3 text-center">
        <span class="text-sm font-bold text-sfl-dirt dark:text-amber-100">⏳ No proc found in next 300 ${verbPlural.toLowerCase()}</span>
      </div>
    `;
  }

  const isNextHit = nextHit.distance === 1;

  if (isNextHit) {
    return `
      <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-xl px-4 py-2.5 shadow-sm border border-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl select-none">🎉</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] uppercase font-black tracking-wider bg-white/20 px-1.5 py-0.2 rounded">GUARANTEED HIT</span>
              <span class="text-xs font-mono opacity-90">Counter #${nextHit.counter}</span>
            </div>
            <h3 class="text-sm sm:text-base font-black leading-tight mt-0.5">
              NEXT ${verb.toUpperCase()} WILL PROC!
            </h3>
            <p class="text-[11px] text-emerald-100">
              Very next ${verb.toLowerCase()} for <strong>${itemName}</strong> will trigger <strong>${critName}</strong> (${nextHit.rollPercentage}% < ${chanceNum}%).
            </p>
          </div>
        </div>
        <div class="shrink-0 bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-center self-end sm:self-auto">
          <div class="text-sm font-black font-mono tracking-tight">1 ${verb.toUpperCase()} AWAY</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-xl px-4 py-2.5 shadow-sm border border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
      <div class="flex items-center gap-2.5">
        <span class="text-2xl select-none">🎯</span>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-1.5 py-0.2 rounded">FORECAST</span>
            <span class="text-xs font-mono opacity-90">Target: Counter #${nextHit.counter}</span>
          </div>
          <h3 class="text-sm sm:text-base font-black leading-tight mt-0.5">
            Next Proc in ${nextHit.distance} ${verbPlural.toLowerCase()} for ${itemName}
          </h3>
          <p class="text-[11px] text-amber-100">
            Roll hits ${nextHit.rollPercentage}% (Threshold < ${chanceNum}%) with ${critName}.
          </p>
        </div>
      </div>
      <div class="shrink-0 bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-center self-end sm:self-auto">
        <div class="text-xs font-bold uppercase tracking-wider opacity-80 text-[10px]">Distance</div>
        <div class="text-sm font-black font-mono">${nextHit.distance} ${verbPlural.toLowerCase()}</div>
      </div>
    </div>
  `;
}

function attachEventListeners(mountEl) {
  mountEl.querySelectorAll('.procs-building-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bId = e.currentTarget.dataset.buildingId;
      if (!bId) return;
      isCustomMode = false;
      currentBuildingId = bId;

      const building = getBuildingById(bId);
      if (building && building.items.length > 0) {
        const firstItem = building.items[0];
        currentItemName = firstItem.name;
        currentItemId = firstItem.id;

        const boosts = getBoostsForItem(bId, firstItem.name);
        currentBoost = boosts.length > 0 ? boosts[0] : null;
        if (currentBoost) {
          currentCriticalHitName = currentBoost.boostName;
          currentChance = currentBoost.chance;
        }

        const detected = autoDetectCounter(firstItem.name, bId);
        if (detected > 0) currentCounter = detected;
      }
      renderPanel(mountEl);
    });
  });

  mountEl.querySelector('#procs-custom-mode-btn')?.addEventListener('click', () => {
    isCustomMode = true;
    renderPanel(mountEl);
  });

  const filterInput = mountEl.querySelector('#procs-item-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      itemSearchQuery = e.target.value;
      renderPanel(mountEl);
      const newFilter = mountEl.querySelector('#procs-item-filter-input');
      if (newFilter) {
        newFilter.focus();
        newFilter.selectionStart = newFilter.selectionEnd = newFilter.value.length;
      }
    });
  }

  mountEl.querySelector('#procs-clear-search-btn')?.addEventListener('click', () => {
    itemSearchQuery = '';
    renderPanel(mountEl);
  });

  mountEl.querySelectorAll('.procs-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itName = e.currentTarget.dataset.itemName;
      const itId = Number(e.currentTarget.dataset.itemId) || 0;
      if (!itName) return;

      currentItemName = itName;
      currentItemId = itId;

      const boosts = getBoostsForItem(currentBuildingId, itName);
      currentBoost = boosts.length > 0 ? boosts[0] : null;
      if (currentBoost) {
        currentCriticalHitName = currentBoost.boostName;
        currentChance = currentBoost.chance;
      }

      const detected = autoDetectCounter(itName, currentBuildingId);
      if (detected > 0) currentCounter = detected;

      renderPanel(mountEl);
    });
  });

  mountEl.querySelectorAll('.procs-boost-choice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bName = e.currentTarget.dataset.boostName;
      const availableBoosts = getBoostsForItem(currentBuildingId, currentItemName);
      const chosen = availableBoosts.find(b => b.boostName === bName);
      if (chosen) {
        currentBoost = chosen;
        currentCriticalHitName = chosen.boostName;
        currentChance = chosen.chance;
        renderPanel(mountEl);
      }
    });
  });

  mountEl.querySelectorAll('.procs-rank-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ch = Number(e.currentTarget.dataset.rankChance) || 20;
      currentChance = ch;
      renderPanel(mountEl);
    });
  });

  mountEl.querySelector('#procs-farm-id-input')?.addEventListener('input', (e) => {
    currentFarmId = e.target.value.trim();
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-counter-dec-btn')?.addEventListener('click', () => {
    currentCounter = Math.max(0, currentCounter - 1);
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-counter-inc-btn')?.addEventListener('click', () => {
    currentCounter++;
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-counter-input')?.addEventListener('input', (e) => {
    currentCounter = Math.max(0, Number(e.target.value) || 0);
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-sync-counter-btn')?.addEventListener('click', () => {
    const detected = autoDetectCounter(currentItemName, currentBuildingId);
    currentCounter = detected;
    renderPanel(mountEl);
  });

  // Custom Mode Handlers
  mountEl.querySelector('#procs-item-name-input')?.addEventListener('input', (e) => {
    currentItemName = e.target.value.trim();
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-item-id-input')?.addEventListener('input', (e) => {
    currentItemId = Number(e.target.value) || 0;
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-crit-name-input')?.addEventListener('input', (e) => {
    currentCriticalHitName = e.target.value.trim();
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-chance-input')?.addEventListener('input', (e) => {
    currentChance = Number(e.target.value) || 0;
    renderPanel(mountEl);
  });

  mountEl.querySelectorAll('.procs-batch-size-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentBatchSize = Number(e.currentTarget.dataset.batchSize) || 10;
      renderPanel(mountEl);
    });
  });

  mountEl.querySelector('#procs-batch-input')?.addEventListener('input', (e) => {
    currentBatchSize = Math.max(1, Number(e.target.value) || 1);
    renderPanel(mountEl);
  });

  mountEl.querySelector('#procs-filter-procs-only')?.addEventListener('change', (e) => {
    showOnlyProcs = e.target.checked;
    renderPanel(mountEl);
  });
}
