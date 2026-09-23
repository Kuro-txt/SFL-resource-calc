const { fetchAllFarmsBatched, normalizeFarmId } = require('./farmBatchSync');

async function processBaselineSnapshot(supabase) {
  console.log("🔍 [CRON 00:01 UTC] Starting baseline snapshot process (batch mode)...");
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items');
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

  // 3. Unpack and save each profile's data with verified ID matching
  let savedCount = 0;
  for (const user of validUsers) {
    // Explicit key existence check
    if (!Object.prototype.hasOwnProperty.call(allFarms, user.cleanFarmId)) {
      console.warn(`⚠️ Farm #${user.cleanFarmId} not returned by SFL. Skipping User ${user.id}.`);
      continue;
    }

    const farmData = allFarms[user.cleanFarmId];
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
          user_id: user.id,
          farm_id: user.cleanFarmId,
          snapshot_date: todayDate,
          stock: inventory,
          farm_activity: farmActivity
        }, { onConflict: 'user_id,snapshot_date' });

      if (dbError) {
        console.error(`❌ [Supabase DB Error] Baseline save failed for Farm #${user.cleanFarmId}: ${dbError.message}`);
      } else {
        savedCount++;
        console.log(`✅ 00:00 UTC Baseline saved for Farm #${user.cleanFarmId} on ${todayDate}`);
      }
    } catch (err) {
      console.error(`❌ Failed baseline save for Farm #${user.cleanFarmId}: ${err.message}`);
    }
  }

  console.log(`🏁 [Baseline Cron Finished] ${savedCount}/${validUsers.length} profiles saved to preharvest_baselines.`);
  return { success: true, processed: validUsers.length, saved: savedCount };
}

module.exports = { processBaselineSnapshot };
