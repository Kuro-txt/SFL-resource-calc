const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gtvglgeoznnrsdcfazpc.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health check endpoint (for keep-alive pings)
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

  const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      headers,
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
    let itemsArray = [];

    if (Array.isArray(rawData)) {
      itemsArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
      itemsArray = rawData.data || rawData.nfts || rawData.items || Object.values(rawData);
    }

    const cleanedList = itemsArray.map(item => {
      const name = item.name || item.title || 'Unknown NFT';
      const price = parseFloat(item.floor ?? item.price ?? item.lastSalePrice ?? 0) || 0;
      const boost = item.boost_text || item.boost || (item.have_boost ? "Boost Active" : "No Boost");

      return {
        name: String(name).trim(),
        price: price,
        boost: String(boost).trim()
      };
    }).filter(item => item.name !== 'Unknown NFT');

    res.json(cleanedList);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch NFTs: ${err.message}` });
  }
});

// 4. FAST CRON SNAPSHOT ENDPOINT (Responds instantly to prevent Render 30s timeout)
app.get('/api/cron/snapshot', async (req, res) => {
  // Acknowledge trigger immediately
  res.status(200).json({ success: true, message: "Automated snapshot task started in background." });

  try {
    const { data: users, error } = await supabase.from('profiles').select('id, farm_id, tracked_items');
    if (error || !users) return;

    const todayDate = new Date().toISOString().split('T')[0];

    await Promise.allSettled(
      users.map(async (user) => {
        if (!user.farm_id) return;
        try {
          const farmRes = await axios.get(`https://api.sunflower-land.com/community/farms/${user.farm_id}`, { timeout: 8000 });
          const stock = farmRes.data?.farm?.inventory || farmRes.data?.inventory || {};
          
          await supabase.from('preharvest_baselines').upsert({
            user_id: user.id,
            snapshot_date: todayDate,
            stock: stock
          }, { onConflict: 'user_id,snapshot_date' });
        } catch (err) {
          console.warn(`Skipped snapshot for farm #${user.farm_id}: ${err.message}`);
        }
      })
    );
  } catch (err) {
    console.error("Cron Error:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Backend server running on port ${PORT}`);
});
