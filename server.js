const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function parseMySqlUrl(rawUrl) {
  if (!rawUrl) return null;
  const cleanUrl = rawUrl.trim().replace(/^['"]|['"]$/g, '');

  const match = cleanUrl.match(/^mysql(?:2)?:\/\/(.*?):(.*?)@([^:/]+)(?::(\d+))?(?:\/([^?]*))?(?:\?(.*))?$/);
  if (match) {
    const [, user, password, host, portStr, dbName] = match;
    let database = dbName || 'test';
    if (!database || ['sys', 'information_schema', 'performance_schema'].includes(database)) {
      database = 'test';
    }
    return {
      host,
      port: parseInt(portStr || '4000', 10),
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      database,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    };
  }

  try {
    const parsed = new URL(cleanUrl);
    let dbName = parsed.pathname.replace(/^\//, '').split('?')[0] || 'test';
    if (!dbName || ['sys', 'information_schema', 'performance_schema'].includes(dbName)) {
      dbName = 'test';
    }
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '4000', 10),
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: dbName,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    };
  } catch {
    return { uri: cleanUrl, database: 'test', ssl: { rejectUnauthorized: false } };
  }
}

let tidbPool = null;
function getTiDBPool() {
  const rawUrl = process.env.TIDB_DATABASE_URL || process.env.DATABASE_URL || process.env.TIDB_URL || process.env.MYSQL_URL || '';
  if (!rawUrl) return null;
  if (!tidbPool) {
    const config = parseMySqlUrl(rawUrl);
    if (!config) return null;

    if (config.host && config.user) {
      tidbPool = mysql.createPool({
        host: config.host,
        port: config.port || 4000,
        user: config.user,
        password: config.password,
        database: config.database || 'test',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 4,
        maxIdle: 2,
        idleTimeout: 30000,
        queueLimit: 0
      });
    } else {
      tidbPool = mysql.createPool({ uri: config.uri || rawUrl, database: 'test', ssl: { rejectUnauthorized: false } });
    }
  }
  return tidbPool;
}

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

app.all('/api/trades', async (req, res) => {
  try {
    const { default: tradesHandler } = await import('./api/trades.js');
    return tradesHandler(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process trades request', details: err.message });
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

let isYieldsTableReady = false;
async function ensureYieldsTableCreated(pool) {
  if (isYieldsTableReady || !pool) return;
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS user_daily_yields (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      farm_id BIGINT NOT NULL,
      yield_date DATE NOT NULL,
      total_count DECIMAL(20, 4) NOT NULL,
      net_flowers DECIMAL(20, 4) NOT NULL,
      crops JSON,
      crop_activity_yields JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_date (user_id, yield_date),
      INDEX idx_farm_date (farm_id, yield_date)
    );
  `;
  try {
    await pool.query(createTableSql);
    isYieldsTableReady = true;
  } catch (err) {
    console.warn("user_daily_yields auto-migration notice:", err.message);
  }
}

async function backfillDailyYields() {
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

// ----------------------------------------------------
// 🔄 AUTOMATED 4X DAILY MARKETPLACE TRADES AUTO-SYNC
// Runs at 00:33, 06:33, 12:33, 18:33 UTC
// Rate limit safe: 13s gap between requests, 3 retries
// ----------------------------------------------------
async function fetchMarketplaceTradesWithRetry(farmId, apiKey = '', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(farmId)}`, {
        headers: getSflHeaders(apiKey),
        timeout: 15000
      });
      
      const payload = response.data?.data || response.data?.farm || response.data || {};
      const trades = Array.isArray(payload.trades) 
        ? payload.trades 
        : (Array.isArray(payload) ? payload : Object.values(payload.trades || {}));

      return trades;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        console.warn(`⚠️ [Farm #${farmId}] 401 Unauthorized (Check SFL API key). Skipping retries.`);
        throw err;
      }
      if (attempt < maxRetries) {
        console.warn(`⚠️ [Farm #${farmId}] Trade fetch attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in 13s...`);
        await delay(13000);
      } else {
        throw err;
      }
    }
  }
  return [];
}

async function processAutoSyncTrades() {
  console.log("🚀 [Auto-Sync Trades] Starting 4x daily marketplace trades auto-sync (:33 UTC, 13s gap, 3 retries)...");
  
  const farmMap = new Map();

  // 1. Fetch registered users from Supabase profiles
  try {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, farm_id');
    if (!pErr && Array.isArray(profiles)) {
      profiles.forEach(p => {
        if (p.farm_id) {
          const cleanId = String(p.farm_id).trim();
          if (cleanId) farmMap.set(cleanId, '');
        }
      });
    }
  } catch (e) {
    console.warn("Notice: Supabase profiles query:", e.message);
  }

  // 2. Fetch distinct farms from TiDB Cloud
  try {
    const pool = getTiDBPool();
    if (pool) {
      const [rows] = await pool.query("SELECT DISTINCT farm_id FROM user_trades;");
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.farm_id) {
            const cleanId = String(r.farm_id).trim();
            if (!farmMap.has(cleanId)) farmMap.set(cleanId, '');
          }
        });
      }
    }
  } catch (e) {
    console.warn("Notice: TiDB user_trades query:", e.message);
  }

  const farmEntries = Array.from(farmMap.entries());
  console.log(`📋 [Auto-Sync Trades] Found ${farmEntries.length} registered farms to sync.`);

  let totalSynced = 0;

  for (let i = 0; i < farmEntries.length; i++) {
    const [farmId, apiKey] = farmEntries[i];
    console.log(`[${i + 1}/${farmEntries.length}] ⏳ Fetching trades for Farm #${farmId} (3 retries, 13s gap)...`);

    try {
      const rawTrades = await fetchMarketplaceTradesWithRetry(farmId, apiKey, 3);
      if (rawTrades.length > 0) {
        const pool = getTiDBPool();
        if (pool) {
          for (const t of rawTrades) {
            const id = String(t.id || '').trim();
            if (!id) continue;

            const isListing = t.source === 'listing';
            const initId = String(t.initiatedBy?.id || '');
            const fulfId = String(t.fulfilledBy?.id || '');
            const isSeller = isListing ? (initId === farmId) : (fulfId !== farmId);

            const otherName = isSeller ? (t.fulfilledBy?.username || '') : (t.initiatedBy?.username || '');
            const otherId = isSeller ? (t.fulfilledBy?.id || null) : (t.initiatedBy?.id || null);

            const itemId = parseInt(t.itemId || 0, 10);
            const isEconomy = t.collection === 'economies' || Boolean(t.economy);
            const itemName = isEconomy ? `#${itemId}` : String(t.itemName || t.name || `Item #${itemId}`).substring(0, 128);
            const quantity = parseFloat(t.quantity || 1);
            const sfl = parseFloat(t.sfl || 0);
            const tax = isSeller ? parseFloat(t.tax || 0) : 0;
            const netSfl = isSeller ? Math.max(0, sfl - tax) : sfl;
            const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
            const tradeType = isSeller ? 'sold' : 'bought';
            const source = String(t.source || 'listing').toLowerCase();
            const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
            const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

            const insertSql = `
              INSERT INTO user_trades 
              (id, farm_id, item_id, item_name, quantity, sfl, tax, net_sfl, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
                item_name = VALUES(item_name),
                quantity = VALUES(quantity),
                sfl = VALUES(sfl),
                tax = VALUES(tax),
                net_sfl = VALUES(net_sfl),
                unit_price = VALUES(unit_price)
            `;

            await pool.query(insertSql, [
              id, farmId, itemId, itemName, quantity, sfl, tax, netSfl, unitPrice, tradeType, source, otherId, otherName, fulfilledAt, fulfilledDate
            ]);
          }
        }
        console.log(`✅ [Auto-Sync Trades] Farm #${farmId}: Synced ${rawTrades.length} trades.`);
        totalSynced += rawTrades.length;
      } else {
        console.log(`ℹ️ [Auto-Sync Trades] Farm #${farmId}: 0 trades found.`);
      }
    } catch (err) {
      console.warn(`⚠️ [Auto-Sync Trades] Error syncing Farm #${farmId}: ${err.message}`);
    }

    // Strict 13-second gap between farms to comply with SFL rate limits
    if (i < farmEntries.length - 1) {
      console.log(`⏳ Waiting 13s before next farm (rate limit safe)...`);
      await delay(13000);
    }
  }

  console.log(`🎉 [Auto-Sync Trades] Finished auto-sync batch for ${farmEntries.length} farms. Total trades: ${totalSynced}.`);
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
  } else if (type === 'trades') {
    res.status(200).json({ success: true, message: "Trades auto-sync started." });
    processAutoSyncTrades().catch((err) => console.error("Trades Error:", err.message));
  } else {
    res.status(400).json({ error: "Invalid type parameter. Use 'type=baseline', 'type=yield', or 'type=trades'." });
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

app.get('/api/cron/sync-trades', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true, message: "Marketplace trades auto-sync initiated (13s gap, 3 retries)." });
  processAutoSyncTrades().catch((err) => console.error("Auto-sync trades Error:", err.message));
});

// ⏰ AUTOMATED INTERNAL CRON JOBS:
// 1. Snapshot: Daily at 21:50 UTC
cron.schedule('50 21 * * *', () => {
  console.log('⏰ [Cron] Starting 21:50 UTC Snapshot...');
  processBaselineSnapshot().catch(err => console.error("Snapshot error:", err.message));
});

// 2. Yield: Daily at 22:00 UTC
cron.schedule('0 22 * * *', () => {
  console.log('⏰ [Cron] Starting 22:00 UTC Daily Yield Calculation...');
  processYieldCalculation().catch(err => console.error("Yield error:", err.message));
});

// 3. Trade Auto-Sync: 4 times a day at minute 33 (00:33, 06:33, 12:33, 18:33 UTC) with 13s rate-limit gap & 3 retries
cron.schedule('33 0,6,12,18 * * *', () => {
  console.log('⏰ [Cron] Starting 4x daily scheduled trade auto-sync at :33 UTC (13s gap, 3 retries)...');
  processAutoSyncTrades().catch(err => console.error("Auto-sync trades error:", err.message));
});

app.get('/api/cron/backfill-yields', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const result = await backfillDailyYields();
  res.status(200).json(result);
});

app.get('/api/yields', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId } = req.query;

  const pool = getTiDBPool();
  if (!pool) {
    return res.status(200).json({ success: false, data: [], message: 'TiDB not configured' });
  }

  try {
    await ensureYieldsTableCreated(pool);
    let query = 'SELECT * FROM user_daily_yields WHERE 1=1';
    const params = [];

    if (farmId && userId) {
      query += ' AND (farm_id = ? OR user_id = ?)';
      params.push(farmId, userId);
    } else if (farmId) {
      query += ' AND farm_id = ?';
      params.push(farmId);
    } else if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY yield_date DESC LIMIT 100';
    const [rows] = await pool.query(query, params);

    const formatted = (rows || []).map(r => {
      let crops = typeof r.crops === 'string' ? JSON.parse(r.crops || '[]') : (r.crops || []);
      const cropActivityYields = typeof r.crop_activity_yields === 'string' ? JSON.parse(r.crop_activity_yields || '[]') : (r.crop_activity_yields || []);

      if ((!crops || crops.length === 0) && Array.isArray(cropActivityYields) && cropActivityYields.length > 0) {
        crops = cropActivityYields.map(c => ({
          name: c.crop || c.name || 'Crop',
          qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
          flowers: parseFloat(c.netFlowers || c.flowers || 0)
        }));
      }

      return {
        date: r.yield_date ? new Date(r.yield_date).toISOString().split('T')[0] : '',
        totalCount: parseFloat(r.total_count || 0),
        netFlowers: parseFloat(r.net_flowers || 0).toFixed(3),
        crops: crops,
        cropActivityYields: cropActivityYields
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on port ${PORT}`);
});
