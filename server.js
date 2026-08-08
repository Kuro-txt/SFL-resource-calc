const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from root directory
app.use(express.static(path.join(__dirname)));

// Supabase Setup
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
  'Origin': 'https://sfl.world'
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

async function fetchFarmInventoryWithRetry(cleanFarmId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/farms/${cleanFarmId}`, {
        headers: getSflHeaders(),
        timeout: 10000
      });

      return response.data?.farm?.inventory || response.data?.inventory || {};
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        console.error(`❌ [401 Unauthorized] SFL API rejected Farm #${cleanFarmId}. Check SFL_API_KEY in Render Environment Variables.`);
        throw err;
      }

      if (status === 429 && attempt < maxRetries) {
        const retryHeader = err.response?.headers['retry-after'];
        const waitTimeSec = retryHeader ? parseInt(retryHeader, 10) : attempt * 5;

        console.warn(`⚠️ Rate limited (429) on Farm #${cleanFarmId}. Retrying in ${waitTimeSec}s... (Attempt ${attempt}/${maxRetries})`);
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

// Helper to format individual NFT item from sfl.world
function formatNftItem(item) {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || item.title || item.itemName || '').trim();
  if (!name || name === 'Unknown NFT') return null;

  const rawPrice = item.floor ?? item.price ?? item.lastSalePrice ?? 0;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;

  const boostText = String(item.boost_text || item.boost || '').trim();
  let boost = "No Boost";
  if (boostText) {
    boost = boostText;
  } else if (item.have_boost) {
    boost = "Boost Active";
  }

  return { name, price, boost };
}

app.get('/api/health', (req, res) => res.status(200).send('OK'));

// 1. Live SFL Resource Prices API
app.get('/api/get-data', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/prices', {
      headers: SFL_WORLD_HEADERS,
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    console.error(`❌ [Prices API Error]: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch price data', details: err.message });
  }
});

// 2. Sunflower Land Farm Inventory Sync API
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

// 3. Live NFT Catalog API Endpoint
app.get('/api/nfts', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: SFL_WORLD_HEADERS,
      timeout: 12000
    });

    let rawData = response.data;

    if (typeof rawData === 'string') {
      try {
        rawData = JSON.parse(rawData);
      } catch (e) {
        throw new Error("Received non-JSON HTML challenge page from sfl.world");
      }
    }

    let itemsList = [];

    if (Array.isArray(rawData)) {
      itemsList = rawData.map(formatNftItem).filter(Boolean);
    } else if (rawData && typeof rawData === 'object') {
      const targetArray = rawData.data || rawData.nfts || rawData.items;
      if (Array.isArray(targetArray)) {
        itemsList = targetArray.map(formatNftItem).filter(Boolean);
      }
    }

    if (itemsList.length > 0) {
      console.log(`✅ [NFT API] Successfully parsed ${itemsList.length} items from sfl.world`);
      return res.json(itemsList);
    }

    throw new Error("Parsed items list is empty");
  } catch (err) {
    console.error(`❌ [NFT API Error]: ${err.message}`);
    return res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

// Helper: 00:00 UTC Baseline Snapshot Process
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

      await supabase.from('preharvest_baselines').upsert({
        user_id: user.id,
        snapshot_date: todayDate,
        stock: stock
      }, { onConflict: 'user_id,snapshot_date' });

      console.log(`✅ 00:00 UTC Baseline saved for Farm #${cleanFarmId} on ${todayDate}`);
    } catch (err) {
      console.error(`❌ Failed API fetch for Farm #${cleanFarmId}: Status ${err.response?.status || err.message}`);
    }

    await delay(3500);
  }
}

// Helper: 22:00 UTC Yield Calculation Process
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

    const { data: baselineRecord } = await supabase
      .from('preharvest_baselines')
      .select('stock')
      .eq('user_id', user.id)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (!baselineRecord || !baselineRecord.stock || Object.keys(baselineRecord.stock).length === 0) {
      console.warn(`⚠️ Skipped 22:00 UTC yield for Farm #${cleanFarmId}: Baseline for ${todayDate} not found. Run type=baseline first!`);
      continue;
    }

    const baselineStock = baselineRecord.stock;

    let farmInventory = {};
    try {
      farmInventory = await fetchFarmInventoryWithRetry(cleanFarmId);
    } catch (err) {
      console.error(`❌ Farm #${cleanFarmId} fetch failed at 22:00 UTC: Status ${err.response?.status || err.message}`);
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
      await supabase.from('daily_yields').upsert({
        user_id: user.id,
        yield_date: todayDate,
        total_count: Math.ceil(totalHarvestCount * 10) / 10,
        net_flowers: Math.ceil(totalNetFlowers * 1000) / 1000,
        crops: yieldsList
      }, { onConflict: 'user_id,yield_date' });

      console.log(`✅ 22:00 UTC Yield saved for Farm #${cleanFarmId} on ${todayDate}`);
    } else {
      console.log(`ℹ️ Farm #${cleanFarmId}: No positive yield difference detected.`);
    }

    await delay(3500);
  }
}

// Unified Cron Endpoint
app.get('/api/trigger-daily-baseline', async (req, res) => {
  const { key, type } = req.query;

  if (key !== CRON_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid key' });
  }

  if (type === 'baseline') {
    res.status(200).json({ success: true, message: "00:00 UTC Baseline snapshot started." });
    processBaselineSnapshot().catch(err => console.error("Baseline Task Error:", err.message));
  } else if (type === 'yield') {
    res.status(200).json({ success: true, message: "22:00 UTC Yield calculation started." });
    processYieldCalculation().catch(err => console.error("Yield Task Error:", err.message));
  } else {
    res.status(400).json({ error: "Invalid type parameter. Use 'type=baseline' or 'type=yield'." });
  }
});

// Direct Cron Endpoints
app.get('/api/cron/snapshot', async (req, res) => {
  res.status(200).json({ success: true, message: "Automated snapshot task started in background." });
  processBaselineSnapshot().catch(err => console.error("Snapshot Task Error:", err.message));
});

app.get('/api/cron/22utc-yield', async (req, res) => {
  res.status(200).json({ success: true, message: "22:00 UTC yield calculation started in background." });
  processYieldCalculation().catch(err => console.error("Yield Task Error:", err.message));
});

// Fallback route serving index.html for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on http://localhost:${PORT}`);
});
