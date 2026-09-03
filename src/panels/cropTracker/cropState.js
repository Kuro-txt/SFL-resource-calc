import { SFL_PLOT_CROPS } from '../../config/constants.js';
import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals } from '../../utils/formatters.js';
import { activeHarvestDiffs } from './cropSync.js';
import { renderCropTrackerRows, getItemFlowerPrice } from './cropTable.js';
import { renderCropWeeklySummary } from './cropWeekly.js';

export let cropBaseYields = JSON.parse(localStorage.getItem('sfl_crop_base_yields') || '{}');
export let globalAvgYield = parseFloat(localStorage.getItem('sfl_global_avg_yield') || '1.0');
let cloudSaveTimer = null;

export function setGlobalAvgYield(val) {
  globalAvgYield = val;
}

export async function loadCloudBaseYields() {
  const client = window.supabaseClient;
  const user = window.currentUser;

  try {
    const localSaved = localStorage.getItem('sfl_crop_base_yields');
    if (localSaved) {
      cropBaseYields = JSON.parse(localSaved) || {};
      if (cropBaseYields['_global'] !== undefined) {
        globalAvgYield = parseFloat(cropBaseYields['_global']) || 1.0;
        syncMainGlobalInput(globalAvgYield);
        syncWeeklyGlobalInput(globalAvgYield);
      }
    }
  } catch (e) {}

  if (client && user) {
    try {
      const { data } = await client.from('profiles').select('crop_base_yields').eq('id', user.id).maybeSingle();
      if (data?.crop_base_yields) {
        cropBaseYields = data.crop_base_yields;
        localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));

        if (cropBaseYields['_global'] !== undefined) {
          globalAvgYield = parseFloat(cropBaseYields['_global']) || 1.0;
          localStorage.setItem('sfl_global_avg_yield', globalAvgYield.toString());
          syncMainGlobalInput(globalAvgYield);
          syncWeeklyGlobalInput(globalAvgYield);
        }
        renderCropTrackerRows();
      }
    } catch (err) {
      console.warn("Could not load cloud crop multipliers:", err.message);
    }
  }
}

export function debouncedCloudSave() {
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveBaseYieldSettings(false);
  }, 1000);
}

export async function saveBaseYieldSettings(showAlert = false) {
  cropBaseYields['_global'] = globalAvgYield;
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
  localStorage.setItem('sfl_global_avg_yield', globalAvgYield.toString());

  const client = window.supabaseClient;
  const user = window.currentUser;

  if (client && user) {
    try {
      await client.from('profiles').upsert({
        id: user.id,
        crop_base_yields: cropBaseYields
      }, { onConflict: 'id' });
      if (showAlert) alert("✅ Avg Yield per Plot multipliers saved to cloud and local storage!");
    } catch (err) {
      if (showAlert) alert("⚠️ Saved locally, but failed to reach Supabase: " + err.message);
    }
  } else if (showAlert) {
    alert("✅ Avg Yield per Plot settings saved locally!");
  }

  renderCropTrackerRows();
}

export function updateCropBaseYield(cleanKey, value) {
  const val = parseFloat(value) || globalAvgYield || 1.0;
  cropBaseYields[cleanKey] = val;
  localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
  debouncedCloudSave();
  renderCropTrackerRows();
}

export async function updateDailyCropHistoricalYield(dateStr, cleanCropKey, value) {
  const newYield = parseFloat(value) || 1.0;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (e) { history = []; }

  const entryIndex = history.findIndex(entry => {
    const d = (entry.date || entry.yield_date || '').split('T')[0];
    return d === dateStr;
  });

  if (entryIndex !== -1) {
    const entry = history[entryIndex];
    const cropList = entry.cropActivityYields || entry.crop_activity_yields || [];
    const savedTax = localStorage.getItem('sfl_tax_rate');
    const taxSelectEl = document.getElementById('tax-select');
    const taxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);

    cropList.forEach(cropItem => {
      const rawName = cropItem.crop || cropItem.name || '';
      if (normalizeItemKey(rawName) === cleanCropKey) {
        cropItem.baseYield = newYield;
        cropItem.base_yield = newYield;
        const cycles = parseFloat(cropItem.harvestCount || cropItem.harvest_count || 0);
        const totalProduced = roundUpToOneDecimal(cycles * newYield);
        cropItem.totalProduced = totalProduced;
        cropItem.total_produced = totalProduced;

        const unitPrice = getItemFlowerPrice(cleanCropKey);
        cropItem.unitPrice = unitPrice;
        const grossTotal = unitPrice * totalProduced;
        const taxAmount = grossTotal * taxRate;
        cropItem.netFlowers = roundUpToThreeDecimals(grossTotal - taxAmount);
        cropItem.net_flowers = cropItem.netFlowers;
      }
    });

    entry.cropActivityYields = cropList;
    entry.crop_activity_yields = cropList;
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(history));

    const client = window.supabaseClient;
    const user = window.currentUser;
    if (client && user) {
      try {
        await client.from('daily_yields').upsert({
          user_id: user.id,
          yield_date: dateStr,
          crop_activity_yields: cropList
        }, { onConflict: 'user_id,yield_date' });
      } catch (err) {
        console.warn("Could not sync updated day yield to Supabase:", err.message);
      }
    }
  }

  renderCropWeeklySummary();
}

export function applyGlobalYieldToAll() {
  const inputEl = document.getElementById('global-avg-yield-input');
  const val = parseFloat(inputEl?.value) || 1.0;
  globalAvgYield = val;
  localStorage.setItem('sfl_global_avg_yield', val.toString());
  cropBaseYields['_global'] = val;
  syncWeeklyGlobalInput(val);

  if (activeHarvestDiffs.length > 0) {
    activeHarvestDiffs.forEach(entry => {
      cropBaseYields[entry.cleanKey] = val;
    });
  }

  saveBaseYieldSettings(false);
  renderCropTrackerRows();
}

export function applyWeeklyGlobalYieldToAll() {
  const inputEl = document.getElementById('weekly-global-avg-yield-input');
  const val = parseFloat(inputEl?.value) || 1.0;
  globalAvgYield = val;
  localStorage.setItem('sfl_global_avg_yield', val.toString());
  cropBaseYields['_global'] = val;
  syncMainGlobalInput(val);

  SFL_PLOT_CROPS.forEach(cropKey => {
    cropBaseYields[cropKey] = val;
  });

  saveBaseYieldSettings(false);
  renderCropTrackerRows();
  renderCropWeeklySummary();
}

export function syncMainGlobalInput(val) {
  const el = document.getElementById('global-avg-yield-input');
  if (el) el.value = val;
}

export function syncWeeklyGlobalInput(val) {
  const el = document.getElementById('weekly-global-avg-yield-input');
  if (el) el.value = val;
}
