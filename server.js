const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS so your GitHub Pages frontend can communicate with Render
app.use(cors());
app.use(express.json());

let registeredFarms = new Set();

app.get('/', (req, res) => {
  res.send('🌻 SFL Calculator Backend Server is Active!');
});

// Proxy route for farm inventory
app.get('/api/get-farm', async (req, res) => {
  const { farmId } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required.' });

  try {
    const response = await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      headers: { 'User-Agent': 'SFL-Calculator-App/1.0', 'Accept': 'application/json' }
    });
    return res.json(response.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: `Farm #${farmId} not found.` });
    }
    return res.status(500).json({ error: 'Failed to fetch farm data from SFL API.' });
  }
});

// Proxy route for item price data
app.get('/api/get-data', async (req, res) => {
  try {
    const defaultPrices = {
      "Sunflower": 0.02, "Potato": 0.14, "Pumpkin": 0.4, "Carrot": 0.8,
      "Cabbage": 1.5, "Beetroot": 2.8, "Cauliflower": 4.25, "Parsnip": 6.5,
      "Eggplant": 8.0, "Corn": 9.0, "Radish": 9.5, "Wheat": 7.0, "Kale": 10.0
    };
    return res.json(defaultPrices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch price data.' });
  }
});

app.post('/api/register-auto-sync', (req, res) => {
  const { farmId } = req.body;
  if (!farmId) return res.status(400).json({ success: false, error: 'Farm ID is required.' });
  registeredFarms.add(String(farmId));
  return res.json({ success: true, message: `Farm #${farmId} registered for daily auto-sync!` });
});

app.post('/api/unregister-auto-sync', (req, res) => {
  const { farmId } = req.body;
  if (farmId) registeredFarms.delete(String(farmId));
  return res.json({ success: true });
});

cron.schedule('0 0 * * *', async () => {
  for (const farmId of registeredFarms) {
    try {
      await axios.get(`https://api.sunflower-land.com/community/farms/${farmId}`);
    } catch (err) {
      console.error(`Sync error for Farm #${farmId}: ${err.message}`);
    }
  }
}, { timezone: "UTC" });

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
