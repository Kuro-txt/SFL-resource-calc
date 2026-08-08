const express = require('express');
const axios = require('axios');
const router = express.Router();

// CHANGE THIS: Change '/nfts' to '/'
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://sfl.world/',
        'Origin': 'https://sfl.world'
      },
      timeout: 12000
    });

    let rawData = response.data;

    // Check if the response is an HTML page (Cloudflare or SPA fallback) instead of JSON
    if (typeof rawData === 'string') {
      try {
        rawData = JSON.parse(rawData);
      } catch (e) {
        throw new Error("Received HTML or invalid text response from sfl.world");
      }
    }

    let rawItems = [];
    if (Array.isArray(rawData)) {
      rawItems = rawData;
    } else if (rawData && typeof rawData === 'object') {
      rawItems = rawData.data || rawData.nfts || rawData.items || Object.values(rawData);
    }

    const cleanedList = rawItems.map(item => {
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
    }).filter(Boolean);

    if (cleanedList.length > 0) {
      console.log(`✅ [NFT API] Returning ${cleanedList.length} items from sfl.world`);
      return res.json(cleanedList);
    }

    throw new Error("Parsed items array is empty");
  } catch (err) {
    console.error('❌ [NFT API ERROR]:', err.message);
    return res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

module.exports = router;
