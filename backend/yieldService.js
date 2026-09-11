const axios = require('axios');
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
    return { success: false, error: error?.message || 'No user profiles found' };
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

  let savedYieldsCount = 0;

  for (const user of users) {
    if (!user.farm_id) continue;
    const cleanFarmId = String(user.farm_id).trim();

    let targets = user.tracked_items;
    if (typeof targets === 'string') {
      try { targets = JSON.parse(targets); } catch (e) { targets = []; }
    }

    let baselineRecord = null;
    const { data: exactBaseline, error: baselineErr } = await supabase
      .from('preharvest_baselines')
      .select('stock, farm_activity, snapshot_date')
      .eq('user_id', user.id)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (!baselineErr && exactBaseline?.farm_activity && Object.keys(exactBaseline.farm_activity).length > 0) {
      baselineRecord = exactBaseline;
    } else {
      // Fallback: look for the most recent baseline before todayDate (e.g. yesterday if midnight snapshot was missed)
      const { data: fallbackRecord } = await supabase
        .from('preharvest_baselines')
        .select('stock, farm_activity, snapshot_date')
        .eq('user_id', user.id)
        .lt('snapshot_date', todayDate)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackRecord?.farm_activity && Object.keys(fallbackRecord.farm_activity).length > 0) {
        baselineRecord = fallbackRecord;
        console.log(`ℹ️ [Yield Calculation] Farm #${cleanFarmId}: Using fallback baseline from ${fallbackRecord.snapshot_date}`);
      }
    }

    if (!baselineRecord || !baselineRecord.farm_activity || Object.keys(baselineRecord.farm_activity).length === 0) {
      console.warn(`⚠️ Skipped 22:00 UTC calculation for Farm #${cleanFarmId}: No baseline found for ${todayDate} or earlier.`);
      continue;
    }

    // ── Prevent double-counting if using an earlier day's fallback baseline ──
    let priorRecordedHarvests = {};
    let priorRecordedStockDiffs = {};

    if (baselineRecord.snapshot_date !== todayDate) {
      console.log(`ℹ️ [Yield Calculation] Farm #${cleanFarmId}: Baseline is from ${baselineRecord.snapshot_date} (today is ${todayDate}). Checking prior yields to prevent double counting...`);
      const { data: priorYields } = await supabase
        .from('daily_yields')
        .select('yield_date, crops, crop_activity_yields')
        .eq('user_id', user.id)
        .gte('yield_date', baselineRecord.snapshot_date)
        .lt('yield_date', todayDate);

      if (Array.isArray(priorYields)) {
        for (const py of priorYields) {
          const acts = Array.isArray(py.crop_activity_yields) ? py.crop_activity_yields : [];
          for (const a of acts) {
            const cropName = (a.crop || a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cycles = parseFloat(a.harvestCount || 0);
            if (cropName && cycles > 0) {
              priorRecordedHarvests[cropName] = (priorRecordedHarvests[cropName] || 0) + cycles;
            }
          }
          const crs = Array.isArray(py.crops) ? py.crops : [];
          for (const c of crs) {
            const k = (c.name || c.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const q = parseFloat(c.qty || 0);
            if (k && q > 0) {
              priorRecordedStockDiffs[k] = (priorRecordedStockDiffs[k] || 0) + q;
            }
          }
        }
      }
    }

    const baselineStock = baselineRecord.stock || {};
    const baseActivity = baselineRecord.farm_activity || {};

    let currentData = { inventory: {}, farmActivity: {}, npcs: {} };
    try {
      currentData = await fetchFarmFullDataWithRetry(cleanFarmId);
    } catch (err) {
      console.error(`❌ Farm #${cleanFarmId} fetch failed at 22:00 UTC: ${err.message}`);
      await delay(8000);
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
        let grossDiff = currentQty - baselineQty;
        let priorDeduction = priorRecordedStockDiffs[cleanKey] || 0;
        let diff = Math.max(0, grossDiff - priorDeduction);

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
        let grossCycles = endCount - startCount;
        let priorCycles = priorRecordedHarvests[cleanCropKey] || 0;
        let harvestCycles = Math.max(0, grossCycles - priorCycles);

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
      await delay(8000);
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
      savedYieldsCount++;
      console.log(`✅ 22:00 UTC Yield saved for Farm #${cleanFarmId} on ${todayDate}`);
    }

    await delay(8000);
  }

  console.log(`🏁 [Yield Calculation] Completed: ${savedYieldsCount} farm yields saved to Supabase.`);
  return { success: true, processed: users.length, saved: savedYieldsCount };
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
        // Pure Supabase daily_yields upsert
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
        } else {
          totalBackfilled++;
        }
      }
    }
  }

  console.log(`🎉 Backfill finished: restored ${totalBackfilled} daily yield records.`);
  return { success: true, backfilledRecords: totalBackfilled };
}

async function repairMissingBaselines(supabase) {
  console.log("🔧 [Repair] Starting repair of missing Sep 10 baselines & duplicate yields...");
  const { data: users, error: uErr } = await supabase.from('profiles').select('id, farm_id, tracked_items, crop_base_yields');
  if (uErr || !users || users.length === 0) return { success: false, error: "No users: " + uErr?.message };

  let repairedCount = 0;

  for (const user of users) {
    if (!user.farm_id) continue;
    const cleanFarmId = String(user.farm_id).trim();

    // Check if user is missing Sep 10 baseline
    const { data: b10 } = await supabase
      .from('preharvest_baselines')
      .select('id, snapshot_date')
      .eq('user_id', user.id)
      .eq('snapshot_date', '2026-09-10')
      .maybeSingle();

    if (!b10) {
      // Missing Sep 10 baseline! Reconstruct from Sep 9 baseline + Sep 9 yield
      const { data: b9 } = await supabase
        .from('preharvest_baselines')
        .select('*')
        .eq('user_id', user.id)
        .eq('snapshot_date', '2026-09-09')
        .maybeSingle();

      const { data: y9 } = await supabase
        .from('daily_yields')
        .select('*')
        .eq('user_id', user.id)
        .eq('yield_date', '2026-09-09')
        .maybeSingle();

      const { data: y10 } = await supabase
        .from('daily_yields')
        .select('*')
        .eq('user_id', user.id)
        .eq('yield_date', '2026-09-10')
        .maybeSingle();

      if (b9 && y10) {
        console.log(`🔧 [Repair] Reconstructing Sep 10 baseline for Farm #${cleanFarmId}...`);
        const reconstructedActivity = { ...(b9.farm_activity || {}) };
        const sep9Acts = (y9 && Array.isArray(y9.crop_activity_yields)) ? y9.crop_activity_yields : [];
        for (const act of sep9Acts) {
          const cropName = (act.crop || act.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const count = parseFloat(act.harvestCount || 0);
          if (!cropName || count <= 0) continue;
          const matchedKey = Object.keys(reconstructedActivity).find(k =>
            k.toLowerCase().replace(/[^a-z0-9]/g, '') === `${cropName}harvested`
          );
          if (matchedKey) {
            reconstructedActivity[matchedKey] = (parseFloat(reconstructedActivity[matchedKey]) || 0) + count;
          } else {
            reconstructedActivity[`${act.crop || cropName} Harvested`] = count;
          }
        }

        const reconstructedStock = { ...(b9.stock || {}) };
        const sep9Crops = (y9 && Array.isArray(y9.crops)) ? y9.crops : [];
        for (const item of sep9Crops) {
          const name = (item.name || item.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const qty = parseFloat(item.qty || 0);
          if (!name || qty <= 0) continue;
          const matchedKey = Object.keys(reconstructedStock).find(k =>
            k.toLowerCase().replace(/[^a-z0-9]/g, '') === name
          );
          if (matchedKey) {
            reconstructedStock[matchedKey] = (parseFloat(reconstructedStock[matchedKey]) || 0) + qty;
          } else {
            reconstructedStock[item.name || name] = qty;
          }
        }

        // 1. Insert reconstructed Sep 10 baseline
        await supabase.from('preharvest_baselines').upsert({
          user_id: user.id,
          farm_id: cleanFarmId,
          snapshot_date: '2026-09-10',
          stock: reconstructedStock,
          farm_activity: reconstructedActivity
        }, { onConflict: 'user_id,snapshot_date' });

        // 2. Correct Sep 10 daily_yields
        const correctedActs = [];
        const currentActs = Array.isArray(y10.crop_activity_yields) ? y10.crop_activity_yields : [];
        for (const curr of currentActs) {
          const crop = curr.crop || curr.name || '';
          const cleanCrop = crop.toLowerCase().replace(/[^a-z0-9]/g, '');
          let sep9Cycles = 0;
          const match9 = sep9Acts.find(a => (a.crop || a.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanCrop);
          if (match9) {
            sep9Cycles = parseFloat(match9.harvestCount || 0);
          }
          const trueCycles = Math.max(0, parseFloat(curr.harvestCount || 0) - sep9Cycles);
          if (trueCycles > 0) {
            const baseYield = parseFloat(curr.baseYield || 1.0);
            const totalProduced = Math.ceil((trueCycles * baseYield) * 10) / 10;
            const unitPrice = parseFloat(curr.unitPrice || 0);
            const netFlowers = Math.ceil((unitPrice * totalProduced * 0.9) * 1000) / 1000;

            correctedActs.push({
              crop,
              baseYield,
              unitPrice,
              netFlowers,
              harvestCount: trueCycles,
              totalProduced
            });
          }
        }

        const correctedCrops = [];
        let correctedTotalCount = 0;
        let correctedNetFlowers = 0;
        const currentCrops = Array.isArray(y10.crops) ? y10.crops : [];

        if (currentCrops.length > 0) {
          for (const curr of currentCrops) {
            const name = curr.name || curr.item || '';
            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            let sep9Qty = 0;
            const match9 = sep9Crops.find(c => (c.name || c.item || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);
            if (match9) {
              sep9Qty = parseFloat(match9.qty || 0);
            }
            const trueQty = Math.ceil(Math.max(0, parseFloat(curr.qty || 0) - sep9Qty) * 10) / 10;
            if (trueQty > 0) {
              const origQty = parseFloat(curr.qty || 0);
              const origFlowers = parseFloat(curr.flowers || 0);
              const unitFlowers = origQty > 0 ? (origFlowers / origQty) : 0;
              const netFl = Math.ceil((unitFlowers * trueQty) * 1000) / 1000;

              correctedCrops.push({
                name,
                qty: trueQty,
                flowers: netFl
              });
              correctedTotalCount += trueQty;
              correctedNetFlowers += netFl;
            }
          }
        } else if (correctedActs.length > 0) {
          correctedTotalCount = correctedActs.reduce((s, a) => s + a.totalProduced, 0);
          correctedNetFlowers = correctedActs.reduce((s, a) => s + a.netFlowers, 0);
        }

        const finalTotal = Math.ceil(correctedTotalCount * 10) / 10;
        const finalFlowers = Math.ceil(correctedNetFlowers * 1000) / 1000;

        await supabase.from('daily_yields').upsert({
          user_id: user.id,
          yield_date: '2026-09-10',
          total_count: finalTotal,
          net_flowers: finalFlowers,
          crops: correctedCrops,
          crop_activity_yields: correctedActs
        }, { onConflict: 'user_id,yield_date' });

        repairedCount++;
        console.log(`✅ [Repair] Fixed Farm #${cleanFarmId} for 2026-09-10 (totalCount: ${finalTotal}, netFlowers: ${finalFlowers})`);
      }
    }
  }

  console.log(`🏁 [Repair] Finished repair: fixed ${repairedCount} farms.`);
  return { success: true, repairedCount };
}

module.exports = {
  processYieldCalculation,
  backfillDailyYields,
  repairMissingBaselines
};
