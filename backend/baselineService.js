const { fetchAllFarmsBatched, normalizeFarmId } = require('./farmBatchSync');
const { logCronSummary } = require('./cronLogger');

async function processBaselineSnapshot(supabase) {
  const startTime = Date.now();
  const succeededFarms = [];
  const failedFarms = [];
  console.log("🔍 [CRON 00:01 UTC] Starting baseline snapshot process (batch mode)...");
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id');
  if (error || !users || users.length === 0) {
    console.warn("⚠️ No user profiles found or Supabase error:", error?.message);
    return { success: false, error: error?.message || 'No user profiles found' };
  }

  const todayDate = new Date().toISOString().split('T')[0];

  // 1. Prepare valid users and deduplicate farm IDs to fetch
  const validUsers = [];
  const farmIdsToFetch = new Set();

  for (const user of users) {
    const cleanId = normalizeFarmId(user.farm_id);
    if (cleanId) {
      validUsers.push({ ...user, cleanFarmId: cleanId });
      farmIdsToFetch.add(cleanId);
    }
  }

  if (farmIdsToFetch.size === 0) {
    console.warn("⚠️ No valid farm IDs found in profiles.");
    return { success: true, processed: 0, saved: 0 };
  }

  console.log(`📊 [Baseline Cron] Found ${validUsers.length} profiles across ${farmIdsToFetch.size} unique farms.`);

  // 2. Batch fetch all unique farms (20 per batch, 11s spacing, binary-split retry)
  const allFarms = await fetchAllFarmsBatched(Array.from(farmIdsToFetch));

  // 3. Unpack and save each unique farm's baseline data (save once per farm_id)
  const uniqueFarmEntries = new Map();
  for (const user of validUsers) {
    if (!uniqueFarmEntries.has(user.cleanFarmId)) {
      uniqueFarmEntries.set(user.cleanFarmId, user);
    }
  }

  let savedCount = 0;
  for (const [cleanFarmId, primaryUser] of uniqueFarmEntries.entries()) {
    // Explicit key existence check
    if (!Object.prototype.hasOwnProperty.call(allFarms, cleanFarmId)) {
      console.warn(`⚠️ Farm #${cleanFarmId} not returned by SFL. Skipping.`);
      failedFarms.push({ farmId: cleanFarmId, reason: 'Not returned by SFL' });
      continue;
    }

    const farmData = allFarms[cleanFarmId];
    const inventory = { ...(farmData.inventory || {}) };
    const farmActivity = { ...(farmData.farmActivity || farmData.activity || (farmData.farm && (farmData.farm.farmActivity || farmData.farm.bumpkin?.activity)) || {}) };
    const coins = parseFloat(farmData.coins || farmData.balance || 0);

    // Preserve coin snapshot in baseline
    inventory['Coins'] = coins;
    farmActivity['Current Coins'] = coins;

    try {
      const { error: dbError } = await supabase
        .from('preharvest_baselines')
        .upsert({
          user_id: primaryUser.id,
          farm_id: cleanFarmId,
          snapshot_date: todayDate,
          stock: inventory,
          farm_activity: farmActivity
        }, { onConflict: 'user_id,snapshot_date' });

      if (dbError) {
        console.error(`❌ [Supabase DB Error] Baseline save failed for Farm #${cleanFarmId}: ${dbError.message}`);
        failedFarms.push({ farmId: cleanFarmId, reason: dbError.message });
      } else {
        savedCount++;
        succeededFarms.push(cleanFarmId);
        console.log(`✅ 00:00 UTC Baseline saved for Farm #${cleanFarmId} on ${todayDate}`);
      }
    } catch (err) {
      console.error(`❌ Failed baseline save for Farm #${cleanFarmId}: ${err.message}`);
      failedFarms.push({ farmId: cleanFarmId, reason: err.message });
    }
  }

  const summary = logCronSummary('00:01 UTC Baseline Snapshot Complete', {
    startTime,
    total: uniqueFarmEntries.size,
    succeeded: succeededFarms.length,
    failed: failedFarms.length,
    failedIds: failedFarms.map(f => f.farmId),
    extraMetrics: [
      { label: 'Baselines Saved', value: `${savedCount} records` }
    ]
  });
  return {
    success: true,
    processed: uniqueFarmEntries.size,
    succeeded: succeededFarms.length,
    failed: failedFarms.length,
    failedFarmIds: failedFarms.map(f => f.farmId),
    saved: savedCount,
    duration: summary.duration,
    elapsedMs: summary.elapsedMs
  };
}

module.exports = { processBaselineSnapshot };
