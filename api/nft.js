const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/nfts
// Fetches and normalizes live NFT catalog and floor prices from sfl.world
router.get('/nfts', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
        'Accept': 'application/json' 
      },
      timeout: 10000
    });

    const rawData = response.data;
    let normalizedList = [];

    // Handle different possible JSON structures returned by sfl.world
    let sourceArray = [];
    if (Array.isArray(rawData)) {
      sourceArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
      sourceArray = rawData.data || rawData.nfts || rawData.items || Object.entries(rawData).map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          return { name: key, ...val };
        }
        return { name: key, price: val };
      });
    }

    // Clean and format items for the frontend search bar
    normalizedList = sourceArray.map(item => {
      const rawName = item.name || item.title || item.itemName || "Unknown Item";
      const formattedName = String(rawName)
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const price = parseFloat(item.price ?? item.floorPrice ?? item.sflPrice ?? item.sfl ?? item.cost ?? 0) || 0;
      const boost = item.boost || item.boostInfo || item.buff || item.description || "Collectible / Boost Item";
      const image = item.image || item.image_url || item.icon || "";

      return {
        name: formattedName,
        price: price,
        boost: boost,
        image: image
      };
    }).filter(item => item.name !== "Unknown Item");

    return res.json(normalizedList);
  } catch (err) {
    console.error('[NFT API ERROR]:', err.message);
    return res.status(500).json({ 
      error: `Failed to fetch NFTs from sfl.world: ${err.message}` 
    });
  }
});

module.exports = router;
