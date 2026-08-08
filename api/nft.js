const express = require('express');
const axios = require('axios');
const router = express.Router();

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

    const rawData = response.data;
    const itemsList = [];

    function parseNftObject(obj, parentKey = '') {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach(item => parseNftObject(item));
        return;
      }

      const hasFloor = obj.floor !== undefined || obj.floorPrice !== undefined || obj.floor_price !== undefined || obj.price !== undefined || obj.lastSalePrice !== undefined || obj.sfl !== undefined;
      const hasBoost = obj.boost !== undefined || obj.boost_text !== undefined || obj.details !== undefined || obj.have_boost !== undefined;

      if (hasFloor || hasBoost) {
        const name = obj.name || obj.title || obj.itemName || obj.item_name || (isNaN(Number(parentKey)) && parentKey.length > 1 ? parentKey : null);
        
        if (name && !['success', 'status', 'message', 'updated_at', 'timestamp'].includes(String(name).toLowerCase())) {
          const rawPrice = obj.floor ?? obj.floorPrice ?? obj.floor_price ?? obj.price ?? obj.lastSalePrice ?? obj.last_sale_price ?? obj.sfl ?? obj.sflPrice ?? obj.value ?? 0;
          const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;
          const boost = String(obj.boost_text || obj.boost || obj.details || obj.description || (obj.have_boost ? "Boost Active" : "No Boost")).trim();

          itemsList.push({
            name: String(name).trim(),
            price: price,
            boost: boost
          });
          return;
        }
      }

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          parseNftObject(value, key);
        }
      }
    }

    parseNftObject(rawData);

    const uniqueMap = new Map();
    itemsList.forEach(item => {
      if (item.name && !uniqueMap.has(item.name.toLowerCase())) {
        uniqueMap.set(item.name.toLowerCase(), item);
      }
    });

    const finalNFTs = Array.from(uniqueMap.values());

    if (finalNFTs.length === 0) {
      return res.status(404).json({ error: "No NFT items could be parsed from live SFL endpoint" });
    }

    return res.json(finalNFTs);
  } catch (err) {
    console.error('❌ [NFT API ERROR]:', err.message);
    return res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

module.exports = router;
