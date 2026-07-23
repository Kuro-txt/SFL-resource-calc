const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/nfts
// Fetches live NFT catalog, floor prices, and boost information from sfl.world
router.get('/nfts', async (req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 
        'Accept': 'application/json' 
      },
      timeout: 10000
    });

    return res.json(response.data);
  } catch (err) {
    console.error('[NFT API ERROR]:', err.message);
    return res.status(500).json({ 
      error: `Failed to fetch NFTs from sfl.world: ${err.message}` 
    });
  }
});

module.exports = router;
