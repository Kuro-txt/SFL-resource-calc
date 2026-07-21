const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let registeredFarms = new Set();

app.get('/', (req, res) => {
  res.send('🌻 SFL Calculator Backend Server is Active!');
});

// Proxy Endpoint 1: Fetches live farm inventory from Sunflower Land API
app.get('/api/get-farm', async (req, res) => {
  const { farmId, apiKey } = req.query;

  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required.' });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      headers,
      timeout: 8000
    });

    return res.json(response.data);
  } catch (err) {
    console.error(`[SFL API ERROR] Farm #${farmId}:`, err.response?.status, err.response?.data || err.message);

    if (err.response?.status === 401) {
      return res.status(401).json({ error: '401 Unauthorized: Valid API Key/Token required.' });
    }
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `Farm #${farmId} does not exist on Sunflower Land.` });
    }
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a minute.' });
    }

    return res.status(500).json({ 
      error: `SFL API Error (${err.response?.status || 'Timeout'}): ${err.message}` 
    });
  }
});

// Proxy Endpoint 2: Fetches LIVE SFL Market Prices in Flowers / SFL Token
app.get('/api/get-data', async (req, res) => {
  try {
    // Attempt to fetch live market prices from SFL community API
    const response = await axios.get('https://api.sunflower-land.com/community/prices', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 5000
    });
    return res.json(response.data);
  } catch (err) {
    console.log('[PRICE API WARNING] Live price fetch failed, serving default Flower token prices.');

    // Realistic default Flower (SFL Token) prices (NOT Betty Shop coins)
    const defaultFlowerPrices = {
      "Sunflower": 0.0002,
      "Potato": 0.0014,
      "Pumpkin": 0.0040,
      "Carrot": 0.0080,
      "Cabbage": 0.0150,
      "Beetroot": 0.0280,
      "Cauliflower": 0.0425,
      "Parsnip": 0.0650,
      "Eggplant": 0.0800,
      "Corn": 0.0900,
      "Radish": 0.0950,
      "Wheat": 0.0700,
      "Kale": 0.1000,
      "Soybean": 0.0230,
      "Barley": 0.1200,
      "Rhubarb": 0.0024,
      "Zucchini": 0.0040,
      "Yam": 0.0080,
      "Broccoli": 0.0150,
      "Pepper": 0.0300,
      "Onion": 0.1000,
      "Turnip": 0.0800,
      "Artichoke": 0.1200,
      "Apple": 0.2500,
      "Blueberry": 0.1200,
      "Orange": 0.1800,
      "Banana": 0.2500,
      "Grape": 2.4000,
      "Rice": 3.2000,
      "Olive": 4.0000
    };
    return res.json(defaultFlowerPrices);
  }
});

// Register Auto Sync
app.post('/api/register-auto-sync', (req, res) => {
  const { farmId } = req.body;
  if (!farmId) return res.status(400).json({ success: false, error: 'Farm ID is required.' });

  registeredFarms.add(String(farmId));
  return res.json({ success: true, message: `Farm #${farmId} registered for daily 00:00 UTC sync!` });
});

// Unregister Auto Sync
app.post('/api/unregister-auto-sync', (req, res) => {
  const { farmId } = req.body;
  if (farmId) registeredFarms.delete(String(farmId));
  return res.json({ success: true });
});

// Daily Cron Job (00:00 UTC)
cron.schedule('0 0 * * *', async () => {
  for (const farmId of registeredFarms) {
    try {
      await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
    } catch (err) {
      console.error(`❌ [CRON SYNC ERROR] Farm #${farmId}: ${err.message}`);
    }
  }
}, { timezone: "UTC" });

app.listen(PORT, () => console.log(`🚀 SFL Backend Server listening on port ${PORT}`));
