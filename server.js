const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for frontend requests
app.use(cors());
app.use(express.json());

// In-memory list of registered farm IDs
// (In a full production database like MongoDB, you would save these permanently)
let registeredFarms = new Set();

// Health check endpoint
app.get('/', (req, res) => {
  res.send('🌻 SFL Calculator Backend Server is Active!');
});

// API Endpoint: Register Farm for Auto-Sync
app.post('/api/register-auto-sync', (req, res) => {
  const { farmId } = req.body;

  if (!farmId) {
    return res.status(400).json({ success: false, error: 'Farm ID is required.' });
  }

  registeredFarms.add(String(farmId));
  console.log(`[REGISTER] Farm #${farmId} enabled 00:00 UTC Auto Sync.`);

  return res.json({ 
    success: true, 
    message: `Farm #${farmId} successfully registered for daily 00:00 UTC sync!` 
  });
});

// API Endpoint: Unregister Farm
app.post('/api/unregister-auto-sync', (req, res) => {
  const { farmId } = req.body;
  if (farmId) {
    registeredFarms.delete(String(farmId));
    console.log(`[UNREGISTER] Farm #${farmId} disabled Auto Sync.`);
  }
  return res.json({ success: true });
});

// Daily Cron Job running at 00:00 UTC ("0 0 * * *")
cron.schedule('0 0 * * *', async () => {
  console.log(`⏰ [00:00 UTC] Starting daily sync for ${registeredFarms.size} farms...`);

  for (const farmId of registeredFarms) {
    try {
      console.log(`⏳ Fetching fresh data for Farm #${farmId}...`);
      const response = await axios.get(
        `https://api.sunflower-land.com/community/farms/${farmId}`
      );
      
      console.log(`✅ [SYNC SUCCESS] Farm #${farmId} synced successfully.`);
      // You can store state or perform calculations here if needed
    } catch (err) {
      console.error(`❌ [SYNC ERROR] Farm #${farmId}: ${err.message}`);
    }
  }
}, {
  timezone: "UTC" // Guarantees execution exactly at 00:00 UTC
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 SFL Backend Server listening on port ${PORT}`);
});
