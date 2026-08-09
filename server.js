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
const SFL_API_KEY = process.env.SFL_API_KEY || "";

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

function getSflHeaders() {
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sunflower-land.com/',
    'Origin': 'https://sunflower-land.com'
  };

  if (SFL_API_KEY && SFL_API_KEY.trim() !== '') {
    headers['x-api-key'] = SFL_API_KEY.trim();
  }

  return headers;
}

// Retries on 429 Rate Limits, 5xx Server Errors, and Timeouts
async function fetchFarmInventoryWithRetry(cleanFarmId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/farms/${cleanFarmId}`, {
        headers: getSflHeaders(),
        timeout: 15000 // Increased timeout to 15 seconds
      });
      return response.data?.farm?.inventory || response.data?.inventory || {};
    } catch (err) {
      const status = err.response?.status;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isServerError = status >= 500 && status < 600;

      if (status === 401) {
        console.error(`❌ [401 Unauthorized] SFL API rejected Farm #${cleanFarmId}. Check SFL_API_KEY.`);
        throw err;
      }

      if ((status === 429 || isServerError || isTimeout) && attempt < maxRetries) {
        const retryHeader = err.response?.headers['retry-after'];
        const waitTimeSec = retryHeader ? parseInt(retryHeader, 10) : attempt * 4;
        const reason = isTimeout ? 'Timeout' : `HTTP ${status}`;
        console.warn(`⚠️ [Farm #${cleanFarmId}] ${reason}. Retrying in ${waitTimeSec}s... (Attempt ${attempt}/${maxRetries})`);
        await delay(waitTimeSec * 1000);
      } else {
        throw err;
      }
    }
  }
  return {};
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
  const { farmId } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });

  const cleanFarmId = String(farmId).trim();
  try {
    const inventory = await fetchFarmInventoryWithRetry(cleanFarmId);
    res.json({ success: true, farm: { inventory } });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
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
        throw new Error("Cloudflare blocked Render IP and returned an HTML challenge page");
      }
      try {
        rawData = JSON.parse(rawData);
      } catch (e) {
        throw new Error("Received non-JSON response string from sfl.world");
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

    if (finalNFTs.length > 0) {
      return res.json(finalNFTs);
    }

    throw new Error("0 NFT items could be parsed from live response");
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
      const stock = await fetchFarmInventoryWithRetry(cleanFarmId);

      const { error: dbError } = await supabase
        .from('preharvest_baselines')
        .upsert({
          user_id: user.id,
          farm_id: cleanFarmId,
          snapshot_date: todayDate,
          stock: stock
        }, { onConflict: 'user_id,snapshot_date' });

      if (dbError) {
        console.error(`❌ [Supabase DB Error] Baseline save failed for Farm #${cleanFarmId}: ${dbError.message}`);
      } else {
        console.log(`✅ 00:00 UTC Baseline saved for Farm #${cleanFarmId} on ${todayDate}`);
      }
    } catch (err) {
      console.error(`❌ Failed baseline snapshot for Farm #${cleanFarmId}: ${err.message}`);
    }

    await delay(3500);
  }
}

async function processYieldCalculation() {
  console.log("🔍 [CRON 22:00 UTC] Starting yield calculation process...");
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items');

  if (error || !users || users.length === 0) {
    console.warn("⚠️ No user profiles found or Supabase error:", error?.message);
    return;
  }

  let livePrices = {};
  try {
    const priceRes = await axios.get('https://sfl.world/api/v1/prices', { headers: SFL_WORLD_HEADERS, timeout: 10000 });
    livePrices = priceRes.data || {};
  } catch (e) {
    console.warn("⚠️ Price API fetch failed, defaulting unit prices to 0.");
  }

  for (const user of users) {
    if (!user.farm_id) continue;
    const cleanFarmId = String(user.farm_id).trim();

    let targets = user.tracked_items;
    if (typeof targets === 'string') {
      try { targets = JSON.parse(targets); } catch (e) { targets = []; }
    }

    if (!Array.isArray(targets) || targets.length === 0) {
      console.warn(`⏩ Skipping Farm #${cleanFarmId}: No tracking targets selected.`);
      continue;
    }

    const { data: baselineRecord, error: baselineErr } = await supabase
      .from('preharvest_baselines')
      .select('stock')
      .eq('user_id', user.id)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (baselineErr || !baselineRecord || !baselineRecord.stock) {
      console.warn(`⚠️ Skipped 22:00 UTC yield for Farm #${cleanFarmId}: Baseline for ${todayDate} not found.`);
      continue;
    }
    const baselineStock = baselineRecord.stock;

    let farmInventory = {};
    try {
      farmInventory = await fetchFarmInventoryWithRetry(cleanFarmId);
    } catch (err) {
      console.error(`❌ Farm #${cleanFarmId} fetch failed at 22:00 UTC: ${err.message}`);
      await delay(3500);
      continue;
    }

    let yieldsList = [];
    let totalHarvestCount = 0;
    let totalNetFlowers = 0;

    targets.forEach(targetItem => {
      let cleanKey = String(targetItem).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      let currentQty = getStockAmount(farmInventory, cleanKey);
      let baselineQty = getStockAmount(baselineStock, cleanKey);
      let diff = currentQty - baselineQty;

      if (diff > 0.0001) {
        let harvestedQty = Math.ceil(diff * 10) / 10;
        let unitPrice = 0;
        let matchedKey = Object.keys(livePrices).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').trim() === cleanKey);
        if (matchedKey) {
          let p = parseFloat(livePrices[matchedKey]) || 0;
          unitPrice = p > 100 ? p / 1000 : p;
        }

        let itemFlowers = Math.ceil((unitPrice * harvestedQty * 0.9) * 1000) / 1000;
        let formattedName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);

        yieldsList.push({ name: formattedName, qty: harvestedQty, flowers: itemFlowers });
        totalHarvestCount += harvestedQty;
        totalNetFlowers += itemFlowers;
      }
    });

    if (yieldsList.length > 0) {
      const { error: dbError } = await supabase.from('daily_yields').upsert({
        user_id: user.id,
        farm_id: cleanFarmId,
        yield_date: todayDate,
        total_count: Math.ceil(totalHarvestCount * 10) / 10,
        net_flowers: Math.ceil(totalNetFlowers * 1000) / 1000,
        crops: yieldsList
      }, { onConflict: 'user_id,yield_date' });

      if (dbError) {
        console.error(`❌ [Supabase DB Error] Yield save failed for Farm #${cleanFarmId}: ${dbError.message}`);
      } else {
        console.log(`✅ 22:00 UTC Yield saved for Farm #${cleanFarmId} on ${todayDate}`);
      }
    } else {
      console.log(`ℹ️ Farm #${cleanFarmId}: No positive yield difference detected.`);
    }

    await delay(3500);
  }
}

app.get('/api/trigger-daily-baseline', async (req, res) => {
  const { key, type } = req.query;
  if (key !== CRON_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

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
  res.status(200).json({ success: true });
  processBaselineSnapshot().catch((err) => console.error("Snapshot Error:", err.message));
});

app.get('/api/cron/22utc-yield', async (req, res) => {
  res.status(200).json({ success: true });
  processYieldCalculation().catch((err) => console.error("Yield Error:", err.message));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on port ${PORT}`);
});
