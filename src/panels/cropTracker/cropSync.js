import { SFL_PLOT_CROPS } from '../../config/constants.js';
import { ApiService } from '../../services/api.js';
import { cropBaseYields, saveBaseYieldSettings } from './cropState.js';
import { renderCropTrackerRows } from './cropTable.js';
import { renderCropWeeklySummary } from './cropWeekly.js';

export let activeHarvestDiffs = [];
export let hasBaselineForToday = false;
export let isInitialCheckDone = false;

export async function fetchAndApplyLandYields(showAlert = false) {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const statusEl = document.getElementById('crop-tracker-status');

  if (!farmId) {
    if (showAlert) alert("⚠️ Please enter your Farm ID at the top first!");
    return false;
  }

  if (statusEl) statusEl.textContent = "⚡ Fetching live land yields from SFL.world...";

  try {
    const liveLandYields = await ApiService.getLandYields(farmId);
    if (!liveLandYields || Object.keys(liveLandYields).length === 0) {
      if (statusEl) statusEl.textContent = "⚠️ Could not retrieve SFL.world yields";
      if (showAlert) alert(`⚠️ Could not load land yields from sfl.world for Farm #${farmId}`);
      return false;
    }

    let count = 0;
    for (const [cleanKey, avgVal] of Object.entries(liveLandYields)) {
      if (avgVal > 0) {
        cropBaseYields[cleanKey] = avgVal;
        count++;
      }
    }

    localStorage.setItem('sfl_crop_base_yields', JSON.stringify(cropBaseYields));
    await saveBaseYieldSettings(false);
    renderCropTrackerRows();
    renderCropWeeklySummary();

    if (statusEl) statusEl.textContent = `⚡ Auto-filled ${count} crop yields from SFL.world!`;
    if (showAlert) alert(`✅ Successfully loaded ${count} live average crop & greenhouse yields from SFL.world for Farm #${farmId}!`);
    return true;
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ Land Yields Error: ${err.message}`;
    if (showAlert) alert(`❌ Error fetching land yields: ${err.message}`);
    return false;
  }
}

export async function fetchLiveCropDiff() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const statusEl = document.getElementById('crop-tracker-status');
  const client = window.supabaseClient;
  const user = window.currentUser;
  const todayDate = new Date().toISOString().split('T')[0];

  isInitialCheckDone = true;

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Verifying 00:00 UTC baseline...";

  try {
    let baselineActivity = null;

    if (client && user) {
      const { data } = await client
        .from('preharvest_baselines')
        .select('farm_activity')
        .eq('user_id', user.id)
        .eq('snapshot_date', todayDate)
        .maybeSingle();

      if (data?.farm_activity && Object.keys(data.farm_activity).length > 0) {
        baselineActivity = data.farm_activity;
      }
    }

    if (!baselineActivity) {
      hasBaselineForToday = false;
      activeHarvestDiffs = [];
      renderCropTrackerRows();
      if (statusEl) statusEl.textContent = "⚠️ Baseline Missing";
      return;
    }

    hasBaselineForToday = true;
    if (statusEl) statusEl.textContent = "⏳ Fetching live farm activity...";

    const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
    const backend = window.BACKEND_URL || '';
    const res = await fetch(`${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    const farmObj = data.farm?.farm || data.farm || {};
    const currentActivity = farmObj.farmActivity || farmObj.activity || {};

    activeHarvestDiffs.length = 0; // Clear instead of reassign to keep reference

    for (let key in currentActivity) {
      if (key.toLowerCase().includes('harvested')) {
        let cropName = key.replace(/harvested/i, '').trim();
        let cleanCropKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!SFL_PLOT_CROPS.has(cleanCropKey)) continue;

        let startCount = parseFloat(baselineActivity[key] || 0);
        let endCount = parseFloat(currentActivity[key] || 0);
        let harvestCycles = endCount - startCount;

        if (harvestCycles > 0) {
          activeHarvestDiffs.push({
            crop: cropName,
            cleanKey: cleanCropKey,
            harvestCount: harvestCycles
          });
        }
      }
    }

    // If base yields have not been populated yet, auto-fetch from SFL.world Land API
    const customYieldsCount = Object.keys(cropBaseYields).filter(k => k !== '_global').length;
    if (customYieldsCount === 0) {
      await fetchAndApplyLandYields(false);
    } else {
      renderCropTrackerRows();
    }

    if (statusEl) statusEl.textContent = `✅ ${activeHarvestDiffs.length} Active Crops Tracked`;
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ ${err.message}`;
  }
}

export async function saveCurrentActivityAsBaseline() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
  const client = window.supabaseClient;
  const user = window.currentUser;
  const todayDate = new Date().toISOString().split('T')[0];

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (!client || !user) {
    alert("⚠️ Please sign in to save a persistent daily baseline snapshot to the cloud.");
    return;
  }

  const statusEl = document.getElementById('crop-tracker-status');
  if (statusEl) statusEl.textContent = "⏳ Saving current farm activity as today's baseline...";

  try {
    const backend = window.BACKEND_URL || '';
    const res = await fetch(`${backend}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    const farmObj = data.farm?.farm || data.farm || {};
    const inventory = farmObj.inventory || {};
    const farmActivity = farmObj.farmActivity || farmObj.activity || {};

    const { error: dbError } = await client.from('preharvest_baselines').upsert({
      user_id: user.id,
      farm_id: farmId,
      snapshot_date: todayDate,
      stock: inventory,
      farm_activity: farmActivity
    }, { onConflict: 'user_id,snapshot_date' });

    if (dbError) throw dbError;

    alert("✅ Current farm state & activity (including all fruits and crops) saved as today's baseline snapshot!");
    await fetchLiveCropDiff();
  } catch (err) {
    if (statusEl) statusEl.textContent = `❌ Baseline save failed: ${err.message}`;
    alert(`❌ Failed to save baseline snapshot: ${err.message}`);
  }
}
