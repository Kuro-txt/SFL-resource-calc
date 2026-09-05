const { fetchFarmFullDataWithRetry } = require('./farmApi');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processBaselineSnapshot(supabase) {
  console.log("🔍 [CRON 00:01 UTC] Starting baseline snapshot process...");
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items');
  if (error || !users || users.length === 0) {
    console.warn("⚠️ No user profiles found or Supabase error:", error?.message);
    return { success: false, error: error?.message || 'No user profiles found' };
  }

  const todayDate = new Date().toISOString().split('T')[0];

  for (const user of users) {
    if (!user.farm_id) continue;
    const cleanFarmId = String(user.farm_id).trim();

    try {
      const { inventory, farmActivity } = await fetchFarmFullDataWithRetry(cleanFarmId);

      const { error: dbError } = await supabase
        .from('preharvest_baselines')
        .upsert({
          user_id: user.id,
          farm_id: cleanFarmId,
          snapshot_date: todayDate,
          stock: inventory,
          farm_activity: farmActivity
        }, { onConflict: 'user_id,snapshot_date' });

      if (dbError) {
        console.error(`❌ [Supabase DB Error] Baseline save failed for Farm #${cleanFarmId}: ${dbError.message}`);
      } else {
        console.log(`✅ 00:00 UTC Baseline saved for Farm #${cleanFarmId} on ${todayDate}`);
      }
    } catch (err) {
      console.error(`❌ Failed baseline snapshot for Farm #${cleanFarmId}: ${err.message}`);
    }

    await delay(4500);
  }
  return { success: true, processed: users.length };
}

module.exports = { processBaselineSnapshot };
