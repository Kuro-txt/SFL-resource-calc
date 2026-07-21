const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store for registered farms (In production, replace with a database like MongoDB)
const registeredFarms = [];

// Health check endpoint
app.get('/', (req, res) => {
  res.send('🌻 SFL Calculator Backend Server is Running!');
});

// API Endpoint to register a farm for daily auto-sync
app.post('/api/register-auto-sync', (req, res) => {
  const { farmId, apiKey } = req.body;
  
  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required.' });
  }

  // Prevent duplicates
  const existing = registeredFarms.find(f => f.farmId === farmId);
  if (!existing) {
    registeredFarms.push({ farmId, apiKey });
  }

  console.log(`✅ Farm #${farmId} registered for daily 00:00 UTC cloud sync.`);
  return res.json({ success: true, message: `Farm #${farmId} registered successfully!` });
});

// Daily Cron Job running at 00:00 UTC
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ [00:00 UTC] Running daily scheduled farm sync...');

  for (const farm of registeredFarms) {
    try {
      console.log(`⏳ Syncing Farm #${farm.farmId}...`);
      
      const response = await axios.get(
        `https://api.sunflower-land.com/community/farms/${farm.farmId}`
      );
      
      console.log(`✅ Successfully synced Farm #${farm.farmId}!`);
    } catch (err) {
      console.error(`❌ Failed to sync Farm #${farm.farmId}:`, err.message);
    }
  }
}, {
  timezone: "UTC" // Guarantees execution at 00:00 UTC
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Node.js Backend listening on port ${PORT}`);
});
