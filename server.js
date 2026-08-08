const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gtvglgeoznnrsdcfazpc.supabase.co";
// Use SERVICE_ROLE_KEY if provided in env to bypass RLS in background jobs, otherwise fallback to anon key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY || "anubhav@877";

// Helper: Case-insensitive stock lookup for Sunflower Land inventory objects
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

// Helper: Build request headers with optional API Key authorization
function getFarmHeaders(userApiKey) {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  };
  if (userApiKey) {
    headers['x-api-key'] = userApiKey;
    headers['Authorization'] = `Bearer ${userApiKey}`;
  }
  return headers;
}

// Health check endpoint
app.get('/api/health', (req, res) => res.status(200).send('OK'));

// 1. Live SFL Prices API
app.get('/api/get-data', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/prices', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
});

// 2. Farm Inventory API
app.get('/api/get-farm', async (req, res) => {
  const { farmId, apiKey } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });

  try {
    const response = await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      headers: getFarmHeaders(apiKey),
      timeout: 10000
    });
    res.json({ success: true, farm: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farm inventory', details: error.message });
  }
});

// 3. NFT Catalog API
app.get('/api/nfts', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://sfl.world/'
      },
      timeout: 12000
    });

    const rawData = response.data;
    let itemsArray = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.nfts || rawData?.items || Object.values(rawData || {}));

    const cleanedList = itemsArray.map(item => ({
      name: String(item.name || item.title || 'Unknown NFT').trim(),
      price: parseFloat(item.floor ?? item.price ?? item.lastSalePrice ?? 0) || 0,
      boost: String(item.boost_text || item.boost || (item.have_boost ? "Boost Active" : "No Boost")).trim()
    })).filter(item => item.name !== 'Unknown NFT');

    res.json(cleanedList);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch NFTs: ${err.message}` });
  }
});

// Helper Function: 00:00 UTC Baseline Snapshot
async function processBaselineSnapshot() {
  console.log("🔍 [CRON 00:00 UTC] Starting baseline snapshot process...");

  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, api_key, tracked_items');
  
  if (error) {
    console.error("❌ Supabase fetch profiles error:", error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.warn("⚠️ No user profiles found in Supabase database.");
    return;
  }

  const todayDate = new Date().toISOString().split('T')[0];

  await Promise.allSettled(
    users.map(async (user) => {
      if (!user.farm_id) {
        console.warn(`⏩ Skipping User ${user.id}: No linked Farm ID.`);
        return;
      }

      try {
        const farmRes = await axios.get(`https://api.sunflower-land.com/community/farms/${user.farm_id}`, {
          headers: getFarmHeaders(user.api_key),
          timeout: 10000
        });

        const stock = farmRes.data?.farm?.inventory || farmRes.data?.inventory || {};
        
        const { error: upsertErr } = await supabase.from('preharvest_baselines').upsert({
          user_id: user.id,
          snapshot_date: todayDate,
          stock: stock
        }, { onConflict: 'user_id,snapshot_date' });

        if (upsertErr) {
          console.error(`❌ Baseline save error for Farm #${user.farm_id}:`, upsertErr.message);
        } else {
          console.log(`✅ 00:00 UTC Baseline saved for Farm #${user.farm_id} on ${todayDate}`);
        }
      } catch (err) {
        console.error(`❌ Failed API fetch for Farm #${user.farm_id}: ${err.message}`);
      }
    })
  );
}

// Helper Function: 22:00 UTC Yield Calculation
async function processYieldCalculation() {
  console.log("🔍 [CRON 22:00 UTC] Starting yield calculation process...");
  const todayDate = new Date().toISOString().split('T')[0];

  const { data: users, error } = await supabase.from('profiles').select('id, farm_id, api_key, tracked_items');

  if (error) {
    console.error("❌ Supabase fetch profiles error:", error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.warn("⚠️ No user profiles found in Supabase.");
    return;
  }

  let livePrices = {};
  try {
    const priceRes = await axios.get('https://sfl.world/api/v1/prices', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    livePrices = priceRes.data || {};
  } catch (e) {
    console.warn("⚠️ Price API fetch failed, defaulting unit prices to 0.");
  }

  await Promise.allSettled(
    users.map(async (user) => {
      if (!user.farm_id) {
        console.warn(`⏩ Skipping User ${user.id}: No farm_id.`);
        return;
      }

      let targets = user.tracked_items;
      if (typeof targets === 'string') {
        try { targets = JSON.parse(targets); } catch (e) { targets = []; }
      }

      if (!Array.isArray(targets) || targets.length === 0) {
        console.warn(`⏩ Skipping Farm #${user.farm_id}: No tracking targets selected.`);
        return;
      }

      // Check for 00:00 UTC Baseline
      const { data: baselineRecord, error: baseErr } = await supabase
        .from('preharvest_baselines')
        .select('stock')
        .eq('user_id', user.id)
        .eq('snapshot_date', todayDate)
        .maybeSingle();

      if (baseErr) {
        console.error(`❌ Baseline check error for Farm #${user.farm_id}:`, baseErr.message);
        return;
      }

      if (!baselineRecord || !baselineRecord.stock || Object.keys(baselineRecord.stock).length === 0) {
        console.warn(`⚠️ Skipped 22:00 UTC yield for Farm #${user.farm_id}: No 00:00 UTC baseline found for ${todayDate}.`);
        return;
      }

      const baselineStock = baselineRecord.stock;

      // Fetch live farm inventory
      let farmInventory = {};
      try {
        const farmRes = await axios.get(`https://api.sunflower-land.com/community/farms/${user.farm_id}`, {
          headers: getFarmHeaders(user.api_key),
          timeout: 10000
        });
        farmInventory = farmRes.data?.farm?.inventory || farmRes.data?.inventory || {};
      } catch (err) {
        console.error(`❌ Farm #${user.farm_id} fetch failed at 22:00 UTC: ${err.message}`);
        return;
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
        const { error: yieldSaveErr } = await supabase.from('daily_yields').upsert({
          user_id: user.id,
          yield_date: todayDate,
          total_count: Math.ceil(totalHarvestCount * 10) / 10,
          net_flowers: Math.ceil(totalNetFlowers * 1000) / 1000,
          crops: yieldsList
        }, { onConflict: 'user_id,yield_date' });

        if (yieldSaveErr) {
          console.error(`❌ Yield save error for Farm #${user.farm_id}:`, yieldSaveErr.message);
        } else {
          console.log(`✅ 22:00 UTC Yield saved for Farm #${user.farm_id} on ${todayDate}`);
        }
      } else {
        console.log(`ℹ️ Farm #${user.farm_id}: No positive yield difference detected.`);
      }
    })
  );
}

// UNIFIED CRON ENDPOINT
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

app.listen(PORT, () => {
  console.log(`🚀 SFL Backend server running on port ${PORT}`);
});
