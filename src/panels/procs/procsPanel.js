import { KNOWN_IDS } from '../../data/knownIds.js';
import { PROC_PRESETS, searchBoosts, findBoostByName } from '../../data/procBoosts.js';
import { prngChance, findNextProc, forecastProcs, simulateBatchCraft } from '../../utils/prng.js';

let currentPreset = PROC_PRESETS[0]; // Default to Astrolabe (Fish Oil)
let currentFarmId = '';
let currentItemId = currentPreset.itemId;
let currentItemName = currentPreset.itemName;
let currentCriticalHitName = currentPreset.boostName;
let currentChance = currentPreset.chance;
let currentCounter = 0;
let currentBatchSize = 10;
let showOnlyProcs = false;
let forecastCount = 50;

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

function autoDetectCounter(activityKey) {
  if (!activityKey) return 0;
  const act = getSyncedFarmActivity();
  if (act[activityKey] !== undefined) return Number(act[activityKey]) || 0;

  // Case-insensitive lookup fallback
  const targetLower = activityKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const k in act) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetLower) {
      return Number(act[k]) || 0;
    }
  }
  return 0;
}

export function mountProcsPanel() {
  const mountEl = document.getElementById('procs-section');
  if (!mountEl) return;

  // Initialize farm ID from local storage or app state
  if (!currentFarmId) {
    currentFarmId = getSyncedFarmId() || '0';
  }

  // Auto-detect counter for current preset if available
  if (currentPreset?.activityKey) {
    const detected = autoDetectCounter(currentPreset.activityKey);
    if (detected > 0) currentCounter = detected;
  }

  renderPanel(mountEl);
}

function renderPanel(mountEl) {
  const farmIdNum = Number(currentFarmId) || 0;
  const itemIdNum = Number(currentItemId) || 0;
  const chanceNum = Number(currentChance) || 0;
  const counterNum = Number(currentCounter) || 0;

  // Calculate next proc
  const nextHit = findNextProc({
    farmId: farmIdNum,
    itemId: itemIdNum,
    currentCounter: counterNum,
    chance: chanceNum,
    criticalHitName: currentCriticalHitName,
    maxLookahead: 300
  });

  // Calculate batch simulation
  const isAdditive = currentPreset?.isAdditive ?? true;
  const procMultiplier = currentPreset?.procMultiplier ?? 2;
  const procBonus = currentPreset?.procBonus ?? 1;

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

  // Calculate timeline
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
    <div class="space-y-4 max-w-5xl mx-auto px-1 sm:px-2 py-3">
      <!-- Title & Intro Header -->
      <div class="bg-amber-100/70 dark:bg-slate-900/80 border border-amber-300/80 dark:border-amber-800/40 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl sm:text-3xl select-none">🎲</span>
              <h2 class="text-base sm:text-lg font-bold text-sfl-dirt dark:text-amber-100">
                Item Procs & PRNG Predictor
              </h2>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Live Deterministic
              </span>
            </div>
            <p class="text-xs text-sfl-woodLight dark:text-slate-400 mt-1">
              Predict exactly when chance-based double yields and critical hits occur using Sunflower Land's official 32-bit MurmurHash3 algorithm.
            </p>
          </div>
          <div class="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Farm ID:</span>
            <input type="number" id="procs-farm-id-input" value="${currentFarmId}" 
              placeholder="e.g. 12345" 
              class="w-24 sm:w-28 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs" />
          </div>
        </div>

        <!-- Preset Pills Selector -->
        <div class="mt-4 pt-3 border-t border-amber-200/60 dark:border-slate-800">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[11px] font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide">
              ⚡ Quick Presets & Boost Catalog:
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5" id="procs-presets-container">
            ${PROC_PRESETS.map(p => {
              const isActive = currentPreset?.id === p.id;
              const activeCls = isActive 
                ? 'bg-amber-600 text-white font-bold shadow-2xs border-amber-700' 
                : 'bg-white/80 dark:bg-slate-800/80 text-sfl-wood dark:text-slate-300 hover:bg-amber-100/90 dark:hover:bg-slate-700 border-amber-200/80 dark:border-slate-700 font-medium';
              return `
                <button type="button" data-preset-id="${p.id}" class="procs-preset-btn px-2.5 py-1 rounded-xl text-xs border transition flex items-center gap-1.5 cursor-pointer ${activeCls}">
                  <span>${p.icon}</span>
                  <span>${p.name}</span>
                </button>
              `;
            }).join('')}
            <button type="button" id="procs-custom-mode-btn" class="px-2.5 py-1 rounded-xl text-xs border transition flex items-center gap-1.5 cursor-pointer ${!currentPreset ? 'bg-amber-600 text-white font-bold shadow-2xs border-amber-700' : 'bg-white/80 dark:bg-slate-800/80 text-sfl-wood dark:text-slate-300 hover:bg-amber-100/90 dark:hover:bg-slate-700 border-amber-200/80 dark:border-slate-700 font-medium'}">
              <span>⚙️</span>
              <span>Custom / Manual</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Hero "Next Proc" Countdown Banner -->
      ${renderHeroBanner(nextHit, chanceNum)}

      <!-- Configuration Controls & Active Boost Info -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Card 1: Active Boost Info -->
        <div class="bg-amber-50/50 dark:bg-slate-900/50 border border-amber-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400">Selected Boost Info</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                ${currentChance}% Chance
              </span>
            </div>
            <div class="flex items-center gap-2.5 mb-2">
              <span class="text-2xl">${currentPreset?.icon || '✨'}</span>
              <div>
                <h4 class="text-sm font-bold text-sfl-dirt dark:text-amber-100">${currentCriticalHitName}</h4>
                <p class="text-[11px] text-sfl-woodLight dark:text-slate-400">${currentPreset?.building || 'Game Action'}</p>
              </div>
            </div>
            <p class="text-xs text-sfl-dirt dark:text-slate-300 bg-amber-100/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-200/40 dark:border-slate-700/50 italic leading-relaxed">
              "${currentPreset?.description || `${currentChance}% chance to trigger ${currentCriticalHitName}`}"
            </p>
          </div>
          <div class="mt-3 pt-2.5 border-t border-amber-200/40 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span class="text-sfl-woodLight dark:text-slate-400">Effect on Proc:</span>
            <span class="font-bold text-emerald-700 dark:text-emerald-400 font-mono">${currentPreset?.effect || `x${procMultiplier} / +${procBonus}`}</span>
          </div>
        </div>

        <!-- Card 2: Interactive Counter Stepper -->
        <div class="bg-amber-50/50 dark:bg-slate-900/50 border border-amber-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400">Current Action Counter</span>
              <button type="button" id="procs-sync-counter-btn" class="text-[10px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer" title="Auto-detect from synced farmActivity">
                <span>🔄</span> Detect from Farm
              </button>
            </div>
            <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 mb-2">
              Activity: <span class="font-mono font-bold text-sfl-dirt dark:text-amber-200">${currentPreset?.activityKey || 'Custom Counter'}</span>
            </p>
            <div class="flex items-center justify-center gap-2 my-2">
              <button type="button" id="procs-counter-dec-btn" class="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-100 font-bold text-base shadow-2xs cursor-pointer select-none transition">
                -1
              </button>
              <input type="number" id="procs-counter-input" value="${currentCounter}" min="0"
                class="w-28 h-10 text-center font-mono font-bold text-base rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs" />
              <button type="button" id="procs-counter-inc-btn" class="px-3 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-2xs cursor-pointer select-none transition flex items-center gap-1">
                <span>+1 Craft</span>
              </button>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-amber-200/40 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span class="text-sfl-woodLight dark:text-slate-400">Step forward after in-game action:</span>
            <div class="flex gap-1.5">
              <button type="button" id="procs-step-5-btn" class="px-2 py-0.5 rounded bg-amber-200/60 dark:bg-slate-800 hover:bg-amber-300/60 font-mono text-[10px] font-bold text-sfl-dirt dark:text-amber-100 cursor-pointer">+5</button>
              <button type="button" id="procs-counter-reset-btn" class="px-2 py-0.5 rounded bg-amber-200/60 dark:bg-slate-800 hover:bg-amber-300/60 font-mono text-[10px] font-bold text-sfl-dirt dark:text-amber-100 cursor-pointer">Reset</button>
            </div>
          </div>
        </div>

        <!-- Card 3: Exact Seed Parameters -->
        <div class="bg-amber-50/50 dark:bg-slate-900/50 border border-amber-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400">PRNG Seed Inputs</span>
              <span class="text-[9px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">MurmurHash3</span>
            </div>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-sfl-woodLight dark:text-slate-400">Item:</span>
                <input type="text" id="procs-item-name-input" value="${currentItemName}" 
                  class="w-32 px-2 py-0.5 text-right text-xs font-semibold rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sfl-woodLight dark:text-slate-400">Item ID:</span>
                <input type="number" id="procs-item-id-input" value="${currentItemId}" 
                  class="w-24 px-2 py-0.5 text-right font-mono text-xs font-semibold rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sfl-woodLight dark:text-slate-400">Critical Hit Name:</span>
                <input type="text" id="procs-crit-name-input" value="${currentCriticalHitName}" 
                  class="w-32 px-2 py-0.5 text-right text-xs font-semibold rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sfl-woodLight dark:text-slate-400">Threshold (%):</span>
                <input type="number" step="0.1" id="procs-chance-input" value="${currentChance}" 
                  class="w-20 px-2 py-0.5 text-right font-mono text-xs font-semibold rounded border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
              </div>
            </div>
          </div>
          <div class="mt-3 pt-2 text-[10px] text-right text-sfl-woodLight dark:text-slate-500 italic">
            Exact variables passed to SFL client dice roll
          </div>
        </div>
      </div>

      <!-- Batch Crafting Simulator Card -->
      <div class="bg-gradient-to-r from-amber-100/60 via-amber-50/50 to-orange-100/50 dark:from-slate-900/80 dark:to-amber-950/40 border border-amber-300/70 dark:border-amber-800/40 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 class="text-xs sm:text-sm font-bold text-sfl-dirt dark:text-amber-100 flex items-center gap-1.5 uppercase tracking-wide">
              <span>📦</span> Batch Crafting Forecast
            </h3>
            <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 mt-0.5">
              Simulate multiple consecutive crafts starting from Counter #${counterNum} to see total output & hits.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Craft Size:</span>
            <div class="flex gap-1">
              ${[5, 10, 20, 50].map(sz => `
                <button type="button" data-batch-size="${sz}" class="procs-batch-preset-btn px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${currentBatchSize === sz ? 'bg-amber-600 text-white border-amber-700' : 'bg-white/80 dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-sfl-dirt dark:text-slate-300'}">
                  ${sz}
                </button>
              `).join('')}
            </div>
            <input type="number" id="procs-batch-input" value="${currentBatchSize}" min="1" max="100" 
              class="w-16 px-2 py-1 text-xs text-center font-mono font-bold rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/70 dark:bg-slate-950/60 p-3.5 rounded-xl border border-amber-200/60 dark:border-slate-800">
          <div class="text-center sm:text-left">
            <p class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Total Items Produced</p>
            <p class="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              ${batchResults.totalYield} <span class="text-xs font-normal text-sfl-dirt dark:text-amber-100">${currentItemName}</span>
            </p>
          </div>
          <div class="text-center sm:text-left">
            <p class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Critical Procs Hit</p>
            <p class="font-mono text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">
              ${batchResults.procCount} <span class="text-xs font-normal text-sfl-woodLight dark:text-slate-400">/ ${currentBatchSize} crafts</span>
            </p>
          </div>
          <div class="text-center sm:text-left">
            <p class="text-[10px] uppercase font-bold text-sfl-woodLight dark:text-slate-400">Winning Crafts</p>
            <p class="text-xs font-semibold text-sfl-dirt dark:text-slate-200 mt-1">
              ${batchResults.procs.length > 0 
                ? batchResults.procs.map(idx => `<span class="inline-block px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold mr-1 mb-1">#${idx}</span>`).join('')
                : '<span class="text-slate-400 italic">No procs in this batch</span>'}
            </p>
          </div>
        </div>
      </div>

      <!-- Upcoming Rolls Timeline Table -->
      <div class="bg-amber-50/20 dark:bg-slate-900/40 rounded-2xl border border-amber-200/60 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-amber-100/90 dark:bg-slate-900/95 border-b border-amber-200/60 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <h3 class="text-xs sm:text-sm font-bold text-sfl-wood dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
              <span>📜</span> Upcoming Rolls Timeline
            </h3>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/70 dark:bg-slate-800 text-sfl-dirt dark:text-slate-300 font-semibold">
              Showing ${visibleRolls.length} rolls
            </span>
          </div>
          <div class="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <label class="flex items-center gap-1.5 text-xs text-sfl-wood dark:text-slate-300 cursor-pointer select-none">
              <input type="checkbox" id="procs-filter-procs-only" ${showOnlyProcs ? 'checked' : ''} class="rounded border-amber-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer" />
              <span>Show Procs Only</span>
            </label>
            <select id="procs-count-select" class="px-2 py-1 text-xs font-semibold rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100">
              <option value="25" ${forecastCount === 25 ? 'selected' : ''}>Next 25</option>
              <option value="50" ${forecastCount === 50 ? 'selected' : ''}>Next 50</option>
              <option value="100" ${forecastCount === 100 ? 'selected' : ''}>Next 100</option>
            </select>
          </div>
        </div>

        <!-- Sticky Table Header -->
        <div class="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-amber-100/80 dark:bg-slate-900/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400 border-b border-amber-200/40 dark:border-slate-800">
          <span class="w-16 sm:w-20 text-left">Action #</span>
          <span class="w-20 sm:w-24 text-left">Counter</span>
          <span class="flex-1 text-center">PRNG Roll vs Threshold (${chanceNum}%)</span>
          <span class="w-24 sm:w-32 text-right">Outcome</span>
        </div>

        <div class="max-h-[380px] overflow-y-auto divide-y divide-amber-200/30 dark:divide-slate-800/40">
          ${visibleRolls.length > 0 ? visibleRolls.map(r => {
            const isProc = r.proc;
            const rowBg = isProc 
              ? 'bg-emerald-500/15 dark:bg-emerald-500/20 font-semibold' 
              : 'hover:bg-amber-100/40 dark:hover:bg-slate-800/40';
            const badgeCls = isProc
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';

            return `
              <div class="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 text-xs transition-colors ${rowBg}">
                <div class="w-16 sm:w-20 font-mono text-[11px] text-sfl-dirt dark:text-amber-100">
                  +${r.actionIndex}
                </div>
                <div class="w-20 sm:w-24 font-mono text-[11px] text-sfl-woodLight dark:text-slate-400">
                  #${r.counter}
                </div>
                <div class="flex-1 px-2 flex items-center justify-center gap-2">
                  <div class="w-24 sm:w-40 bg-amber-200/40 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div class="${isProc ? 'bg-emerald-500' : 'bg-amber-500/60'} h-full rounded-full" style="width: ${Math.min(100, Math.max(5, (r.roll / Math.max(1, chanceNum * 2)) * 100))}%"></div>
                  </div>
                  <span class="font-mono text-[11px] ${isProc ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-sfl-woodLight dark:text-slate-400'}">
                    ${r.roll.toFixed(2)}%
                  </span>
                </div>
                <div class="w-24 sm:w-32 text-right">
                  <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}">
                    ${isProc ? '🎉 PROC! (+1)' : 'Normal'}
                  </span>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="text-center py-10 px-4 text-sfl-woodLight dark:text-slate-400">
              <span class="text-2xl mb-1 block">🔍</span>
              <p class="text-xs font-semibold">No procs found in the next ${forecastCount} rolls. Increase forecast length or chance.</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  bindEvents(mountEl);
}

function renderHeroBanner(nextHit, chance) {
  if (!nextHit) {
    return `
      <div class="bg-amber-100/60 dark:bg-slate-900/60 border border-amber-300/60 dark:border-slate-800 rounded-2xl p-4 text-center">
        <p class="text-xs font-bold text-sfl-woodLight dark:text-slate-400">No proc found within the next 300 actions. Check chance threshold.</p>
      </div>
    `;
  }

  const { distance, nextCounter, roll } = nextHit;
  const isImmediate = distance === 0;

  if (isImmediate) {
    return `
      <div class="bg-gradient-to-r from-emerald-500/20 via-green-500/30 to-emerald-500/20 border-2 border-emerald-500 dark:border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between gap-3 animate-pulse">
        <div class="flex items-center gap-3">
          <span class="text-3xl sm:text-4xl select-none">🎉</span>
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs">
              READY RIGHT NOW
            </span>
            <h3 class="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-200 mt-1">
              YOUR VERY NEXT ACTION WILL DOUBLE / PROC!
            </h3>
            <p class="text-xs text-emerald-800 dark:text-emerald-300">
              Counter #${nextCounter} rolled <span class="font-mono font-bold">${roll.toFixed(2)}%</span> (&lt; ${chance}%). Perform your action now to claim the bonus!
            </p>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="font-mono text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">NEXT!</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border border-amber-400/60 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-3xl sm:text-4xl select-none">⏳</span>
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white shadow-2xs">
            FORECAST
          </span>
          <h3 class="text-sm sm:text-base font-bold text-sfl-dirt dark:text-amber-100 mt-1">
            Next Proc in <span class="font-extrabold text-amber-700 dark:text-amber-300 font-mono text-base sm:text-lg">${distance}</span> ${distance === 1 ? 'action' : 'actions'}
          </h3>
          <p class="text-xs text-sfl-woodLight dark:text-slate-400">
            Hits at counter <span class="font-mono font-bold text-sfl-dirt dark:text-amber-200">#${nextCounter}</span> with roll <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400">${roll.toFixed(2)}%</span>.
          </p>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="font-mono text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400">
          in ${distance}
        </span>
      </div>
    </div>
  `;
}

function bindEvents(mountEl) {
  // Preset Buttons
  mountEl.querySelectorAll('.procs-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.presetId;
      const found = PROC_PRESETS.find(p => p.id === pid);
      if (found) {
        currentPreset = found;
        currentItemId = found.itemId;
        currentItemName = found.itemName;
        currentCriticalHitName = found.boostName;
        currentChance = found.chance;
        // Auto-detect counter for preset
        const detected = autoDetectCounter(found.activityKey);
        if (detected > 0) currentCounter = detected;
        renderPanel(mountEl);
      }
    });
  });

  // Custom Mode Button
  document.getElementById('procs-custom-mode-btn')?.addEventListener('click', () => {
    currentPreset = null;
    renderPanel(mountEl);
  });

  // Farm ID Input
  const farmIdInput = document.getElementById('procs-farm-id-input');
  if (farmIdInput) {
    farmIdInput.addEventListener('change', (e) => {
      currentFarmId = e.target.value.trim();
      renderPanel(mountEl);
    });
  }

  // Counter Steppers
  document.getElementById('procs-counter-inc-btn')?.addEventListener('click', () => {
    currentCounter++;
    renderPanel(mountEl);
  });

  document.getElementById('procs-counter-dec-btn')?.addEventListener('click', () => {
    if (currentCounter > 0) currentCounter--;
    renderPanel(mountEl);
  });

  document.getElementById('procs-step-5-btn')?.addEventListener('click', () => {
    currentCounter += 5;
    renderPanel(mountEl);
  });

  document.getElementById('procs-counter-reset-btn')?.addEventListener('click', () => {
    currentCounter = 0;
    renderPanel(mountEl);
  });

  const counterInput = document.getElementById('procs-counter-input');
  if (counterInput) {
    counterInput.addEventListener('change', (e) => {
      currentCounter = Math.max(0, parseInt(e.target.value, 10) || 0);
      renderPanel(mountEl);
    });
  }

  // Sync Counter Button
  document.getElementById('procs-sync-counter-btn')?.addEventListener('click', () => {
    if (currentPreset?.activityKey) {
      const detected = autoDetectCounter(currentPreset.activityKey);
      currentCounter = detected;
      renderPanel(mountEl);
    }
  });

  // Seed Inputs (Custom Overrides)
  document.getElementById('procs-item-name-input')?.addEventListener('change', (e) => {
    currentItemName = e.target.value.trim();
    // Try to auto-match known ID
    if (KNOWN_IDS[currentItemName]) {
      currentItemId = KNOWN_IDS[currentItemName];
    }
    renderPanel(mountEl);
  });

  document.getElementById('procs-item-id-input')?.addEventListener('change', (e) => {
    currentItemId = parseInt(e.target.value, 10) || 0;
    renderPanel(mountEl);
  });

  document.getElementById('procs-crit-name-input')?.addEventListener('change', (e) => {
    currentCriticalHitName = e.target.value.trim();
    renderPanel(mountEl);
  });

  document.getElementById('procs-chance-input')?.addEventListener('change', (e) => {
    currentChance = Math.max(0.01, Math.min(100, parseFloat(e.target.value) || 0));
    renderPanel(mountEl);
  });

  // Batch Presets
  mountEl.querySelectorAll('.procs-batch-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBatchSize = parseInt(btn.dataset.batchSize, 10) || 10;
      renderPanel(mountEl);
    });
  });

  const batchInput = document.getElementById('procs-batch-input');
  if (batchInput) {
    batchInput.addEventListener('change', (e) => {
      currentBatchSize = Math.max(1, parseInt(e.target.value, 10) || 1);
      renderPanel(mountEl);
    });
  }

  // Filter Toggle
  document.getElementById('procs-filter-procs-only')?.addEventListener('change', (e) => {
    showOnlyProcs = e.target.checked;
    renderPanel(mountEl);
  });

  // Count Select
  document.getElementById('procs-count-select')?.addEventListener('change', (e) => {
    forecastCount = parseInt(e.target.value, 10) || 50;
    renderPanel(mountEl);
  });
}
