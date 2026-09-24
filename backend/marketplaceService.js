const axios = require('axios');
const { getSflHeaders } = require('./farmApi');
const { getItemNameById } = require('./knownIds');
const { CROP_FLOWER_PRICES, RESOURCE_FLOWER_FALLBACK_PRICES } = require('./prices');

const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";
const SFL_MARKETPLACE_URL = 'https://api.sunflower-land.com/community/data?type=marketplaceActivity';

// In-memory cache for marketplace activity (TTL: 60s)
let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
let inFlightPromise = null;

/**
 * Fetch and process the official Sunflower Land Marketplace Activity report.
 * Resolves live FLOWER USD price, item/resource/crop P2P floor prices, and NFT floor prices.
 */
async function fetchMarketplaceActivity(customApiKey = '', force = false) {
  const now = Date.now();
  if (!force && cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedData;
  }

  // Deduplicate simultaneous requests
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const apiKeyToUse = customApiKey || SFL_API_KEY;
      const response = await axios.get(SFL_MARKETPLACE_URL, {
        headers: getSflHeaders(apiKeyToUse),
        timeout: 25000
      });

      const rootData = response.data?.data || response.data || {};
      const flowerPrice = parseFloat(rootData.flowerPrice) || 0.13458;

      // Extract the latest report by date
      const reports = rootData.reports || {};
      const dateKeys = Object.keys(reports).sort();
      const latestDateKey = dateKeys[dateKeys.length - 1];
      const latestReport = (latestDateKey && reports[latestDateKey]) || Object.values(reports)[0] || {};
      const rawItems = latestReport.items || {};

      const p2pPrices = {};
      const itemBreakdowns = {};
      const nftsList = [];
      const seenNfts = new Set();

      for (const [key, itemData] of Object.entries(rawItems)) {
        if (!itemData || typeof itemData !== 'object') continue;

        // Parse collection and itemId (e.g., "collectibles-601", "wearables-104")
        const parts = key.split('-');
        const collection = parts[0] || 'collectibles';
        const itemId = parts.slice(1).join('-');

        const itemName = getItemNameById(itemId, collection);
        if (!itemName || itemName.startsWith('Item #')) continue;

        // Best available unit price: floor (cheapest active listing) > latestSale > low
        const floorPrice = parseFloat(itemData.floor);
        const latestSalePrice = parseFloat(itemData.latestSale);
        const lowPrice = parseFloat(itemData.low);

        let unitPrice = 0;
        if (!isNaN(floorPrice) && floorPrice > 0) {
          unitPrice = floorPrice;
        } else if (!isNaN(latestSalePrice) && latestSalePrice > 0) {
          unitPrice = latestSalePrice;
        } else if (!isNaN(lowPrice) && lowPrice > 0) {
          unitPrice = lowPrice;
        }

        if (unitPrice > 0) {
          p2pPrices[itemName] = unitPrice;
          itemBreakdowns[itemName] = {
            ...itemData,
            price: unitPrice,
            floor: !isNaN(floorPrice) ? floorPrice : null,
            latestSale: !isNaN(latestSalePrice) ? latestSalePrice : null,
            collection,
            itemId
          };

          // Also build NFT catalog entry for collectibles, wearables, pets, buds
          if (!seenNfts.has(itemName)) {
            seenNfts.add(itemName);
            nftsList.push({
              name: itemName,
              price: unitPrice,
              floor: unitPrice,
              boost: 'No Boost',
              collection,
              itemId
            });
          }
        }
      }

      // Add fallback defaults if any basic crops/resources weren't traded today
      for (const [crop, p] of Object.entries(CROP_FLOWER_PRICES)) {
        const canonical = crop.charAt(0).toUpperCase() + crop.slice(1);
        if (p2pPrices[canonical] === undefined) {
          p2pPrices[canonical] = p;
        }
      }
      for (const [res, p] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
        const canonical = res.charAt(0).toUpperCase() + res.slice(1);
        if (p2pPrices[canonical] === undefined) {
          p2pPrices[canonical] = p;
        }
      }

      const pricesPayload = {
        flowerPrice,
        p2p: p2pPrices,
        crops: p2pPrices,
        items: itemBreakdowns,
        updated_at: new Date().toISOString()
      };

      const exchangePayload = {
        sfl: { usd: flowerPrice },
        flowerPrice,
        updated_at: new Date().toISOString()
      };

      // Sort NFTs alphabetically for clean display
      nftsList.sort((a, b) => a.name.localeCompare(b.name));

      cachedData = {
        flowerPrice,
        pricesPayload,
        nftsPayload: nftsList,
        exchangePayload,
        timestamp: Date.now()
      };
      lastFetchTime = Date.now();

      return cachedData;
    } catch (err) {
      console.warn("⚠️ [Marketplace Activity] Failed to fetch live data from SFL:", err.message);

      // Return stale cache if available
      if (cachedData) {
        return cachedData;
      }

      // Secondary attempt: fallback to sfl.world in case API key is missing/unauthorized
      try {
        const sflWorldRes = await axios.get('https://sfl.world/api/v1/prices', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
            'Referer': 'https://sfl.world/'
          },
          timeout: 6000
        });
        if (sflWorldRes.data) {
          const raw = typeof sflWorldRes.data === 'string' ? JSON.parse(sflWorldRes.data) : sflWorldRes.data;
          const p2p = raw.p2p || raw.prices || {};
          const flPrice = parseFloat(raw.flowerPrice) || 0.13458;
          return {
            flowerPrice: flPrice,
            pricesPayload: { flowerPrice: flPrice, p2p, crops: p2p, items: {} },
            nftsPayload: [],
            exchangePayload: { sfl: { usd: flPrice }, flowerPrice: flPrice },
            timestamp: Date.now()
          };
        }
      } catch (_) {}

      // If no cache and no secondary endpoint, construct base fallback
      const fallbackP2p = {};
      for (const [k, v] of Object.entries(CROP_FLOWER_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
      }
      for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
      }

      return {
        flowerPrice: 0.13458,
        pricesPayload: { flowerPrice: 0.13458, p2p: fallbackP2p, crops: fallbackP2p, items: {} },
        nftsPayload: [],
        exchangePayload: { sfl: { usd: 0.13458 }, flowerPrice: 0.13458 },
        timestamp: Date.now()
      };
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

module.exports = {
  fetchMarketplaceActivity,
  CACHE_TTL_MS
};
