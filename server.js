const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gtvglgeoznnrsdcfazpc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY || "anubhav@877";
const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";

const SFL_PLOT_CROPS = new Set([
  // 23 Standard Plot Crops
  'sunflower', 'potato', 'pumpkin', 'carrot', 'cabbage',
  'beetroot', 'cauliflower', 'parsnip', 'eggplant', 'corn',
  'radish', 'wheat', 'kale', 'soybean', 'barley',
  'rhubarb', 'zucchini', 'yam', 'broccoli', 'pepper',
  'onion', 'turnip', 'artichoke',
  // 3 Greenhouse Crops
  'grape', 'rice', 'olive',
  // 6 Fruit Patch Fruits
  'tomato', 'lemon', 'blueberry', 'orange', 'apple', 'banana'
]);

const BETTY_SHOP_PRICES = {
  "sunflower": 0.02, "potato": 0.14, "rhubarb": 0.24, "pumpkin": 0.4,
  "zucchini": 0.4, "carrot": 0.8, "yam": 0.8, "cabbage": 1.5,
  "broccoli": 1.5, "soybean": 2.3, "beetroot": 2.8, "pepper": 3,
  "cauliflower": 4.25, "parsnip": 6.5, "eggplant": 8, "corn": 9,
  "onion": 10, "radish": 9.5, "wheat": 7, "turnip": 8, "kale": 10,
  "artichoke": 12, "barley": 12, "saltwort": 50, "tomato": 2,
  "lemon": 6, "blueberry": 12, "orange": 18, "apple": 25,
  "banana": 25, "celestine": 200, "lunara": 500, "duskberry": 1000,
  "grape": 240, "rice": 320, "olive": 400
};

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

function getSflHeaders(customApiKey = '') {
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sunflower-land.com/',
    'Origin': 'https://sunflower-land.com'
  };

  const keyToUse = (customApiKey && customApiKey.trim()) || (SFL_API_KEY && SFL_API_KEY.trim());
  if (keyToUse) {
    headers['x-api-key'] = keyToUse;
    headers['Authorization'] = `Bearer ${keyToUse}`;
  }

  return headers;
}

async function fetchFarmFullDataWithRetry(cleanFarmId, maxRetries = 5, customApiKey = '') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/farms/${cleanFarmId}`, {
        headers: getSflHeaders(customApiKey),
        timeout: 15000
      });
      const farmObj = response.data?.farm || response.data || {};
      const inventory = farmObj.inventory || {};
      const farmActivity = farmObj.farmActivity || farmObj.activity || {};
      const npcs = farmObj.npcs || {};
      return { inventory, farmActivity, npcs };
    } catch (err) {
      const status = err.response?.status;
      const errMsg = (err.message || '').toLowerCase();
      const errCode = err.code || '';

      const isTimeoutOrAbort = 
        errCode === 'ECONNABORTED' || 
        errCode === 'ETIMEDOUT' || 
        errCode === 'ERR_CANCELED' || 
        errCode === 'ECONNRESET' || 
        errMsg.includes('timeout') || 
        errMsg.includes('aborted') || 
        errMsg.includes('canceled');

      const isServerError = status >= 500 && status < 600;

      if (status === 401) {
        console.error(`❌ [401 Unauthorized] SFL API rejected Farm #${cleanFarmId}. Check SFL_API_KEY.`);
        throw err;
      }

      if ((status === 429 || isServerError || isTimeoutOrAbort) && attempt < maxRetries) {
        const retryHeader = err.response?.headers['retry-after'];
        const waitTimeSec = retryHeader ? Math.max(parseInt(retryHeader, 10), 10) : attempt * 8;
        const reason = isTimeoutOrAbort ? `Network/Timeout (${err.code || err.message})` : `HTTP ${status}`;
        console.warn(`⚠️ [Farm #${cleanFarmId}] ${reason}. Retrying in ${waitTimeSec}s... (Attempt ${attempt}/${maxRetries})`);
        await delay(waitTimeSec * 1000);
      } else {
        throw err;
      }
    }
  }
  return { inventory: {}, farmActivity: {}, npcs: {} };
}

function getStockAmount(stockObj, targetCleanKey) {
  if (!stockObj || typeof stockObj !== 'object') return 0;
  for (let k in stockObj) {
    let cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (cleanK === targetCleanKey) {
      let val = stockObj[k];
      let num = typeof val === 'number' ? val : parseFloat(val?.amount || val || 0);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

function formatNftItem(item, parentKey = '') {
  if (!item || typeof item !== 'object') return null;

  const rawName = item.name || item.title || item.itemName || (isNaN(Number(parentKey)) && parentKey.length > 1 ? parentKey : '');
  const name = String(rawName).trim();

  if (!name || name === 'Unknown NFT' || ['success', 'status', 'message', 'updated_at', 'timestamp'].includes(name.toLowerCase())) {
    return null;
  }

  const rawPrice = item.floor ?? item.price ?? item.floorPrice ?? item.floor_price ?? item.lastSalePrice ?? item.sfl ?? 0;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;

  const boostText = String(item.boost_text || item.boost || item.details || '').trim();
  let boost = "No Boost";
  if (boostText) {
    boost = boostText;
  } else if (item.have_boost) {
    boost = "Boost Active";
  }

  return { name, price, boost };
}

app.get('/api/health', (req, res) => res.status(200).send('OK'));

app.get('/api/get-data', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/prices', {
      headers: SFL_WORLD_HEADERS,
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data', details: err.message });
  }
});

app.get('/api/get-farm', async (req, res) => {
  const { farmId, apiKey } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });

  const cleanFarmId = String(farmId).trim();
  const cleanApiKey = apiKey ? String(apiKey).trim() : '';
  try {
    const { inventory, farmActivity, npcs } = await fetchFarmFullDataWithRetry(cleanFarmId, 5, cleanApiKey);
    res.json({ success: true, farm: { inventory, farmActivity, npcs } });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

app.get('/api/get-land', async (req, res) => {
  const { farmId } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });

  const cleanFarmId = String(farmId).trim();
  try {
    const response = await axios.get(`https://sfl.world/api/v1/land/${encodeURIComponent(cleanFarmId)}`, {
      headers: SFL_WORLD_HEADERS,
      timeout: 10000
    });
    res.json({ success: true, land: response.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch land data from sfl.world', details: err.message });
  }
});

app.get('/api/get-marketplace', async (req, res) => {
  const { farmId, apiKey } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });

  const cleanFarmId = String(farmId).trim();
  const cleanApiKey = apiKey ? String(apiKey).trim() : '';

  try {
    const response = await axios.get(`https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(cleanFarmId)}`, {
      headers: getSflHeaders(cleanApiKey),
      timeout: 15000
    });
    res.json({ success: true, data: response.data });
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    res.status(status).json({ error: msg });
  }
});

app.get('/api/nfts', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: SFL_WORLD_HEADERS,
      timeout: 12000
    });

    let rawData = response.data;

    if (typeof rawData === 'string') {
      if (rawData.includes('<!DOCTYPE html>') || rawData.includes('Cloudflare')) {
        throw new Error("Cloudflare challenge page returned");
      }
      try {
        rawData = JSON.parse(rawData);
      } catch (e) {
        throw new Error("Received non-JSON response from price service");
      }
    }

    let itemsList = [];

    function parseNode(node, key = '') {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(child => parseNode(child, key));
        return;
      }

      const formatted = formatNftItem(node, key);
      if (formatted) {
        itemsList.push(formatted);
      }

      for (const [childKey, childValue] of Object.entries(node)) {
        if (typeof childValue === 'object' && childValue !== null) {
          parseNode(childValue, childKey);
        }
      }
    }

    parseNode(rawData);

    const uniqueMap = new Map();
    itemsList.forEach(item => {
      if (item.name && !uniqueMap.has(item.name.toLowerCase())) {
        uniqueMap.set(item.name.toLowerCase(), item);
      }
    });

    const finalNFTs = Array.from(uniqueMap.values());
    if (finalNFTs.length > 0) return res.json(finalNFTs);

    throw new Error("Parsed items array is empty");
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

async function processBaselineSnapshot() {
  console.log("🔍 [CRON 00:00 UTC] Starting baseline snapshot process...");
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items');
  if (error || !users || users.length === 0) {
    console.warn("⚠️ No user profiles found or Supabase error:", error?.message);
    return;
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
}

async function processYieldCalculation() {
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
    let matchedKey = Object.keys(flatPrices).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').trim() === cleanKey);
    if (matchedKey) {
      let p = parseFloat(flatPrices[matchedKey]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
    if (BETTY_SHOP_PRICES[cleanKey] !== undefined) {
      return BETTY_SHOP_PRICES[cleanKey];
    }
    return 0;
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

    await delay(4500);
  }
}

function verifyCronAuth(req) {
  const key = req.query.key || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
  return key === CRON_SECRET_KEY;
}

app.get('/api/trigger-daily-baseline', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { type } = req.query;

  if (type === 'baseline') {
    res.status(200).json({ success: true, message: "Baseline started." });
    processBaselineSnapshot().catch((err) => console.error("Baseline Error:", err.message));
  } else if (type === 'yield') {
    res.status(200).json({ success: true, message: "Yield started." });
    processYieldCalculation().catch((err) => console.error("Yield Error:", err.message));
  } else {
    res.status(400).json({ error: "Invalid type parameter. Use 'type=baseline' or 'type=yield'." });
  }
});

app.get('/api/cron/snapshot', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true });
  processBaselineSnapshot().catch((err) => console.error("Snapshot Error:", err.message));
});

app.get('/api/cron/22utc-yield', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true });
  processYieldCalculation().catch((err) => console.error("Yield Error:", err.message));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on port ${PORT}`);
});
