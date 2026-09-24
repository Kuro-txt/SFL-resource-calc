const axios = require('axios');
const { getSflHeaders } = require('./farmApi');
const { getItemNameById } = require('./knownIds');
const { CROP_FLOWER_PRICES, RESOURCE_FLOWER_FALLBACK_PRICES } = require('./prices');

const fs = require('fs');
const path = require('path');
const MARKETPLACE_CACHE_FILE = path.join(__dirname, 'lastMarketplaceData.json');
const PRICES_CACHE_FILE = path.join(__dirname, 'lastMarketPrices.json');
const NFTS_CACHE_FILE = path.join(__dirname, 'lastNfts.json');

const SFL_MARKETPLACE_URL = 'https://api.sunflower-land.com/community/data?type=marketplaceActivity';

function getEffectiveApiKey(customApiKey = '') {
  return (customApiKey && typeof customApiKey === 'string' && customApiKey.trim())
    || (process.env.SFL_API_KEY && process.env.SFL_API_KEY.trim())
    || (process.env.COMMUNITY_API_KEY && process.env.COMMUNITY_API_KEY.trim())
    || (process.env.API_KEY && process.env.API_KEY.trim())
    || (process.env.SUNFLOWER_API_KEY && process.env.SUNFLOWER_API_KEY.trim())
    || (process.env.VITE_SFL_API_KEY && process.env.VITE_SFL_API_KEY.trim())
    || '';
}

function loadSavedMarketplaceData() {
  try {
    if (fs.existsSync(MARKETPLACE_CACHE_FILE)) {
      const raw = fs.readFileSync(MARKETPLACE_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pricesPayload && Object.keys(parsed.pricesPayload.p2p || {}).length > 0) {
        return parsed;
      }
    }
  } catch (_) {}

  try {
    if (fs.existsSync(PRICES_CACHE_FILE)) {
      const raw = fs.readFileSync(PRICES_CACHE_FILE, 'utf8');
      const p2p = JSON.parse(raw);
      if (p2p && typeof p2p === 'object' && Object.keys(p2p).length > 0) {
        let nftsList = [];
        try {
          if (fs.existsSync(NFTS_CACHE_FILE)) {
            nftsList = JSON.parse(fs.readFileSync(NFTS_CACHE_FILE, 'utf8')) || [];
          }
        } catch (_) {}
        return {
          flowerPrice: 0.13458,
          pricesPayload: { flowerPrice: 0.13458, p2p, crops: p2p, items: {} },
          nftsPayload: nftsList,
          exchangePayload: { sfl: { usd: 0.13458 }, flowerPrice: 0.13458 },
          timestamp: Date.now()
        };
      }
    }
  } catch (_) {}

  return null;
}

// In-memory cache for marketplace activity (initialized from disk JSON if available)
let cachedData = loadSavedMarketplaceData();
let lastFetchTime = cachedData?.timestamp || 0;
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
      const apiKeyToUse = getEffectiveApiKey(customApiKey);
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
          p2pPrices[`[P2P] ${itemName}`] = unitPrice;
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
          p2pPrices[`[P2P] ${canonical}`] = p;
        }
      }
      for (const [res, p] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
        const canonical = res.charAt(0).toUpperCase() + res.slice(1);
        if (p2pPrices[canonical] === undefined) {
          p2pPrices[canonical] = p;
          p2pPrices[`[P2P] ${canonical}`] = p;
        }
      }

      const pricesPayload = {
        flowerPrice,
        p2p: p2pPrices,
        crops: p2pPrices,
        items: itemBreakdowns,
        updated_at: new Date().toISOString()
      };

      function generateGemPacks(flPrice) {
        const gemPackUsd = {
          "100": 1.29,
          "650": 6.49,
          "1350": 12.99,
          "2800": 25.99,
          "7400": 64.99,
          "15500": 129.99,
          "200000": 1299.99
        };
        const dynamicGems = {};
        const fl = flPrice > 0 ? flPrice : 0.13458;
        for (const [gemCountStr, usdVal] of Object.entries(gemPackUsd)) {
          const gemCount = parseInt(gemCountStr, 10);
          const totalSfl = Math.round((usdVal / fl) * 10000) / 10000;
          const sfl1 = Math.round((totalSfl / gemCount) * 10000) / 10000;
          dynamicGems[gemCountStr] = {
            gem: gemCount,
            usd: usdVal,
            sfl: totalSfl,
            sfl1,
            pol: Math.round((usdVal * 1.5) * 10000) / 10000
          };
        }
        return dynamicGems;
      }

      const exchangePayload = {
        sfl: { usd: flowerPrice },
        flowerPrice,
        gems: generateGemPacks(flowerPrice),
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

      // Persist to local JSON files in code so offline/cached access is always up to date
      try {
        fs.writeFileSync(MARKETPLACE_CACHE_FILE, JSON.stringify(cachedData, null, 2), 'utf8');
        fs.writeFileSync(PRICES_CACHE_FILE, JSON.stringify(p2pPrices, null, 2), 'utf8');
        fs.writeFileSync(NFTS_CACHE_FILE, JSON.stringify(nftsList, null, 2), 'utf8');
        console.log(`💾 [Marketplace Activity] Updated JSON files in code repository (lastMarketplaceData.json, lastMarketPrices.json, lastNfts.json)`);
      } catch (fileErr) {
        console.warn("⚠️ Failed to write marketplace cache files:", fileErr.message);
      }

      return cachedData;
    } catch (err) {
      console.warn("⚠️ [Marketplace Activity] Failed to fetch live data from SFL:", err.message);

      // Return stale cache if available
      if (cachedData) {
        return cachedData;
      }

      // Construct base fallback in case of errors
      const fallbackP2p = {};
      for (const [k, v] of Object.entries(CROP_FLOWER_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
      }
      for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
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
          const p2p = {};
          if (raw && typeof raw === 'object') {
            for (const [k, v] of Object.entries(raw)) {
              if (k === 'flowerPrice' || typeof v !== 'number') continue;
              const cleanKey = k.replace(/\[.*?\]/g, '').trim();
              if (cleanKey && v > 0) p2p[cleanKey] = v;
            }
          }
          const flPrice = parseFloat(raw.flowerPrice) || 0.13458;
          for (const [k, v] of Object.entries(fallbackP2p)) {
            if (p2p[k] === undefined) p2p[k] = v;
          }
          if (Object.keys(p2p).length > 0) {
            return {
              flowerPrice: flPrice,
              pricesPayload: { flowerPrice: flPrice, p2p, crops: p2p, items: {} },
              nftsPayload: [],
              exchangePayload: { sfl: { usd: flPrice }, flowerPrice: flPrice },
              timestamp: Date.now()
            };
          }
        }
      } catch (_) {}

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
