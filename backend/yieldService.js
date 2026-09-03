const axios = require('axios');
const { getTiDBPool, ensureYieldsTableCreated } = require('./db');
const { CROP_FLOWER_PRICES, getFlowerUnitPrice } = require('./prices');
const { fetchFarmFullDataWithRetry, getStockAmount } = require('./farmApi');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const SFL_WORLD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://sfl.world/',
  'Origin': 'https://sfl.world',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};
const SFL_PLOT_CROPS = new Set([
  'sunflower', 'potato', 'pumpkin', 'carrot', 'cabbage',
  'beetroot', 'cauliflower', 'parsnip', 'eggplant', 'corn',
  'radish', 'wheat', 'kale', 'soybean', 'barley',
  'rhubarb', 'zucchini', 'yam', 'broccoli', 'pepper',
  'onion', 'turnip', 'artichoke',
  'grape', 'rice', 'olive',
  'tomato', 'lemon', 'blueberry', 'orange', 'apple', 'banana'
]);
const BETTY_SHOP_PRICES = CROP_FLOWER_PRICES;

function extractPrices(data) {
  let pricesMap = {};
  if (!data || typeof data !== 'object') return pricesMap;

  const GLOBAL_EXCLUDES = ['updated_text', 'updatedtext', 'updatedat', 'updated_at', 'created_at', 'id'];

  function searchObj(obj, prefix = '') {
    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      let lowerKey = key.toLowerCase().trim();
      if (GLOBAL_EXCLUDES.includes(lowerKey)) continue;
      if (lowerKey.includes('updated')) continue;

      let val = obj[key];

      if (typeof val === 'number') {
        pricesMap[prefix + key] = val;
      } else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
        pricesMap[prefix + key] = parseFloat(val);
      } else if (val && typeof val === 'object') {
        let p = val.price ?? val.sfl ?? val.sflPrice ?? val.flowerPrice ?? val.unitPrice;
        if (p !== undefined && p !== null) {
          pricesMap[prefix + key] = parseFloat(p) || 0;
        } else {
          let newPrefix = key.length <= 4 ? `[${key.toUpperCase()}] ` : '';
          searchObj(val, newPrefix);
        }
      }
    }
  }

  searchObj(data);
  return pricesMap;
}

async function processYieldCalculation(supabase) {
  console.log("🔍 [CRON 22:00 UTC] Starting yield calculation process...");
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items, crop_base_yields');

  if (error || !users || users.length === 0) {
    console.warn("⚠️ No user profiles found or Supabase error:", error?.message);
    return;
  }

  let flatPrices = {};
  try {
    const priceRes = await axios.get('https://sfl.world/api/v1/prices', { headers: SFL_WORLD_HEADERS, timeout: 10000 });
    flatPrices = extractPrices(priceRes.data || {});
  } catch (e) {
    console.warn("⚠️ Price API fetch failed, defaulting to shop prices.");
  }

  function getFlowerUnitPrice(cleanKey) {
    let matchedKey = Object.keys(flatPrices).find(k => {
      let norm = k.replace(/^\[.*?\]\s*/, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      return norm === cleanKey;
    });
    if (matchedKey) {
      let p = parseFloat(flatPrices[matchedKey]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
    if (CROP_FLOWER_PRICES[cleanKey] !== undefined) {
      return CROP_FLOWER_PRICES[cleanKey];
    }
    return 0.01;
  }

  for (const user of users) {
    if (!user.farm_id) continue;
    const cleanFarmId = String(user.farm_id).trim();

    let targets = user.tracked_items;
    if (typeof targets === 'string') {
      try { targets = JSON.parse(targets); } catch (e) { targets = []; }
    }

    const { data: baselineRecord, error: baselineErr } = await supabase
      .from('preharvest_baselines')
      .select('stock, farm_activity')
      .eq('user_id', user.id)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (baselineErr || !baselineRecord || !baselineRecord.farm_activity || Object.keys(baselineRecord.farm_activity).length === 0) {
      console.warn(`⚠️ Skipped 22:00 UTC calculation for Farm #${cleanFarmId}: Baseline for ${todayDate} not found.`);
      continue;
    }

    const baselineStock = baselineRecord.stock || {};
    const baseActivity = baselineRecord.farm_activity || {};

    let currentData = { inventory: {}, farmActivity: {}, npcs: {} };
    try {
      currentData = await fetchFarmFullDataWithRetry(cleanFarmId);
    } catch (err) {
      console.error(`❌ Farm #${cleanFarmId} fetch failed at 22:00 UTC: ${err.message}`);
      await delay(4500);
      continue;
    }

    let yieldsList = [];
    let totalHarvestCount = 0;
    let totalNetFlowers = 0;

    if (Array.isArray(targets) && targets.length > 0) {
      targets.forEach(targetItem => {
        let cleanKey = String(targetItem).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        let currentQty = getStockAmount(currentData.inventory, cleanKey);
        let baselineQty = getStockAmount(baselineStock, cleanKey);
        let diff = currentQty - baselineQty;

        if (diff > 0.0001) {
          let harvestedQty = Math.ceil(diff * 10) / 10;
          let unitPrice = getFlowerUnitPrice(cleanKey);
          let itemFlowers = Math.ceil((unitPrice * harvestedQty * 0.9) * 1000) / 1000;
          let formattedName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);

          yieldsList.push({ name: formattedName, qty: harvestedQty, flowers: itemFlowers });
          totalHarvestCount += harvestedQty;
          totalNetFlowers += itemFlowers;
        }
      });
    }

    const baseYields = user.crop_base_yields || {};
    const currActivity = currentData.farmActivity || {};
    let cropActivityYields = [];

    for (let actKey in currActivity) {
      if (actKey.toLowerCase().includes('harvested')) {
        let cropName = actKey.replace(/harvested/i, '').trim();
        let cleanCropKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!SFL_PLOT_CROPS.has(cleanCropKey)) continue;

        let startCount = parseFloat(baseActivity[actKey] || 0);
        let endCount = parseFloat(currActivity[actKey] || 0);
        let harvestCycles = endCount - startCount;

        if (harvestCycles > 0) {
          let baseYield = parseFloat(baseYields[cleanCropKey] || baseYields['_global']) || 1.0;
          let totalProduced = Math.ceil((harvestCycles * baseYield) * 10) / 10;
          let unitPrice = getFlowerUnitPrice(cleanCropKey);
          let netFlowers = Math.ceil((unitPrice * totalProduced * 0.9) * 1000) / 1000;

          cropActivityYields.push({
            crop: cropName,
            harvestCount: harvestCycles,
            baseYield: baseYield,
            totalProduced: totalProduced,
            unitPrice: unitPrice,
            netFlowers: netFlowers
          });
        }
      }
    }

    if (totalHarvestCount <= 0 && yieldsList.length === 0 && cropActivityYields.length === 0) {
      console.log(`ℹ️ [Yield Calculation] No harvest activity for Farm #${cleanFarmId} on ${todayDate}, skipping blank row save.`);
      await delay(2000);
      continue;
    }

    const { error: dbError } = await supabase.from('daily_yields').upsert({
      user_id: user.id,
      yield_date: todayDate,
      total_count: Math.ceil(totalHarvestCount * 10) / 10,
      net_flowers: Math.ceil(totalNetFlowers * 1000) / 1000,
      crops: yieldsList,
      crop_activity_yields: cropActivityYields
    }, { onConflict: 'user_id,yield_date' });

    if (dbError) {
      console.error(`❌ [Supabase DB Error] Yield save failed for Farm #${cleanFarmId}: ${dbError.message}`);
    } else {
      console.log(`✅ 22:00 UTC Yield saved for Farm #${cleanFarmId} on ${todayDate}`);
    }

    // Also persist in TiDB Cloud Serverless (immune to Supabase RLS policies)
    try {
      const pool = getTiDBPool();
      if (pool) {
        await ensureYieldsTableCreated(pool);
        const tidbId = `yield_${user.id}_${todayDate}`;
        const insertYieldSql = `
          INSERT INTO user_daily_yields 
          (id, user_id, farm_id, yield_date, total_count, net_flowers, crops, crop_activity_yields)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            total_count = VALUES(total_count),
            net_flowers = VALUES(net_flowers),
            crops = VALUES(crops),
            crop_activity_yields = VALUES(crop_activity_yields)
        `;
        await pool.query(insertYieldSql, [
          tidbId,
          user.id,
          cleanFarmId,
          todayDate,
          Math.ceil(totalHarvestCount * 10) / 10,
          Math.ceil(totalNetFlowers * 1000) / 1000,
          JSON.stringify(yieldsList),
          JSON.stringify(cropActivityYields)
        ]);
        console.log(`☁️ [TiDB Cloud] Yield archived for Farm #${cleanFarmId} on ${todayDate}`);
      }
    } catch (tidbErr) {
      console.warn(`⚠️ TiDB daily yield notice for Farm #${cleanFarmId}: ${tidbErr.message}`);
    }

    await delay(4500);
  }
}

async function backfillDailyYields(supabase) {
  console.log("🔄 Starting daily yields backfill from preharvest_baselines...");
  const { data: users, error: uErr } = await supabase.from('profiles').select('id, farm_id, tracked_items, crop_base_yields');
  if (uErr || !users || users.length === 0) return { success: false, error: "No user profiles found: " + uErr?.message };

  const { data: baselines, error: bErr } = await supabase
    .from('preharvest_baselines')
    .select('user_id, farm_id, snapshot_date, stock, farm_activity')
    .order('snapshot_date', { ascending: true });

  if (bErr || !baselines || baselines.length === 0) return { success: false, error: "No baselines found: " + bErr?.message };

  const userBaselines = new Map();
  baselines.forEach(b => {
    if (!userBaselines.has(b.user_id)) userBaselines.set(b.user_id, []);
    userBaselines.get(b.user_id).push(b);
  });

  let totalBackfilled = 0;
  const pool = getTiDBPool();
  if (pool) await ensureYieldsTableCreated(pool);

  for (const user of users) {
    const list = userBaselines.get(user.id);
    if (!list || list.length < 2) continue;

    const baseYields = user.crop_base_yields || {};

    for (let i = 0; i < list.length - 1; i++) {
      const startRecord = list[i];
      const endRecord = list[i + 1];
      const targetDate = startRecord.snapshot_date;

      const startAct = startRecord.farm_activity || {};
      const endAct = endRecord.farm_activity || {};

      let cropsList = [];
      let cropActivityYields = [];
      let totalHarvestCount = 0;
      let totalNetFlowers = 0;

      for (let actKey in endAct) {
        if (actKey.toLowerCase().includes('harvested')) {
          let cropName = actKey.replace(/harvested/i, '').trim();
          let cleanCropKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!SFL_PLOT_CROPS.has(cleanCropKey)) continue;

          let startCount = parseFloat(startAct[actKey] || 0);
          let endCount = parseFloat(endAct[actKey] || 0);
          let harvestCycles = endCount - startCount;

          if (harvestCycles > 0) {
            let baseYield = parseFloat(baseYields[cleanCropKey] || baseYields['_global']) || 1.0;
            let totalProduced = Math.ceil((harvestCycles * baseYield) * 10) / 10;
            let unitPrice = BETTY_SHOP_PRICES[cleanCropKey] || 0;
            let netFlowers = Math.ceil((unitPrice * totalProduced * 0.9) * 1000) / 1000;

            cropActivityYields.push({
              crop: cropName,
              harvestCount: harvestCycles,
              baseYield: baseYield,
              totalProduced: totalProduced,
              unitPrice: unitPrice,
              netFlowers: netFlowers
            });

            cropsList.push({
              name: cropName,
              qty: totalProduced,
              flowers: netFlowers
            });

            totalHarvestCount += totalProduced;
            totalNetFlowers += netFlowers;
          }
        }
      }

      if (cropActivityYields.length > 0) {
        // 1. Supabase upsert
        const { error: dbErr } = await supabase.from('daily_yields').upsert({
          user_id: user.id,
          yield_date: targetDate,
          total_count: Math.ceil(totalHarvestCount * 10) / 10,
          net_flowers: Math.ceil(totalNetFlowers * 1000) / 1000,
          crops: cropsList,
          crop_activity_yields: cropActivityYields
        }, { onConflict: 'user_id,yield_date' });

        if (dbErr) {
          console.warn(`Supabase backfill notice for Farm #${user.farm_id} (${targetDate}): ${dbErr.message}`);
        }

        // 2. TiDB Cloud upsert
        if (pool) {
          try {
            const tidbId = `yield_${user.id}_${targetDate}`;
            await pool.query(`
              INSERT INTO user_daily_yields 
              (id, user_id, farm_id, yield_date, total_count, net_flowers, crops, crop_activity_yields)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                total_count = VALUES(total_count),
                net_flowers = VALUES(net_flowers),
                crops = VALUES(crops),
                crop_activity_yields = VALUES(crop_activity_yields)
            `, [
              tidbId, user.id, user.farm_id, targetDate,
              Math.ceil(totalHarvestCount * 10) / 10,
              Math.ceil(totalNetFlowers * 1000) / 1000,
              JSON.stringify(cropsList),
              JSON.stringify(cropActivityYields)
            ]);
          } catch (e) {
            console.warn("TiDB backfill error:", e.message);
          }
        }

        totalBackfilled++;
      }
    }
  }

  console.log(`🎉 Backfill finished: restored ${totalBackfilled} daily yield records.`);
  return { success: true, backfilledRecords: totalBackfilled };
}

module.exports = {
  processYieldCalculation,
  backfillDailyYields
};
