import { getItemNameById } from '../src/data/knownIds.js';
import { CROP_FLOWER_PRICES, RESOURCE_FLOWER_FALLBACK_PRICES } from '../src/config/constants.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const customKey = (req.query.apiKey || req.headers['x-api-key'] || process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || '').trim();

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sunflower-land.com/',
    'Origin': 'https://sunflower-land.com'
  };

  if (customKey) {
    headers['x-api-key'] = customKey;
    headers['Authorization'] = `Bearer ${customKey}`;
  }

  try {
    const response = await fetch('https://api.sunflower-land.com/community/data?type=marketplaceActivity', {
      headers,
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      try {
        const renderRes = await fetch('https://sfl-calculator-backend.onrender.com/api/get-data', {
          signal: AbortSignal.timeout(10000)
        });
        if (renderRes.ok) {
          const renderData = await renderRes.json();
          if (renderData && renderData.p2p && Object.keys(renderData.p2p).length > 0) {
            res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
            return res.status(200).json(renderData);
          }
        }
      } catch (_) {}

      const fallbackP2p = {};
      for (const [k, v] of Object.entries(CROP_FLOWER_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
      }
      for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
        fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
      }
      return res.status(200).json({ flowerPrice: 0.13458, p2p: fallbackP2p, crops: fallbackP2p, items: {} });
    }

    const json = await response.json();
    const rootData = json?.data || json || {};
    const flowerPrice = parseFloat(rootData.flowerPrice) || 0.13458;

    const reports = rootData.reports || {};
    const dateKeys = Object.keys(reports).sort();
    const latestDateKey = dateKeys[dateKeys.length - 1];
    const latestReport = (latestDateKey && reports[latestDateKey]) || Object.values(reports)[0] || {};
    const rawItems = latestReport.items || {};

    const p2pPrices = {};
    const itemBreakdowns = {};

    for (const [key, itemData] of Object.entries(rawItems)) {
      if (!itemData || typeof itemData !== 'object') continue;

      const parts = key.split('-');
      const collection = parts[0] || 'collectibles';
      const itemId = parts.slice(1).join('-');

      const itemName = getItemNameById(itemId, collection);
      if (!itemName || itemName.startsWith('Item #')) continue;

      const floorPrice = parseFloat(itemData.floor);
      const latestSalePrice = parseFloat(itemData.latestSale);
      const lowPrice = parseFloat(itemData.low);

      let unitPrice = 0;
      if (!isNaN(floorPrice) && floorPrice > 0) unitPrice = floorPrice;
      else if (!isNaN(latestSalePrice) && latestSalePrice > 0) unitPrice = latestSalePrice;
      else if (!isNaN(lowPrice) && lowPrice > 0) unitPrice = lowPrice;

      if (unitPrice > 0) {
        if (collection === 'collectibles') {
          p2pPrices[itemName] = unitPrice;
          p2pPrices[`[P2P] ${itemName}`] = unitPrice;
        }
        const breakdownKey = collection === 'wearables' ? `${itemName} (Wearable)` : itemName;
        itemBreakdowns[breakdownKey] = { ...itemData, price: unitPrice, collection, itemId };
      }
    }

    for (const [crop, p] of Object.entries(CROP_FLOWER_PRICES)) {
      const canonical = crop.charAt(0).toUpperCase() + crop.slice(1);
      if (p2pPrices[canonical] === undefined) {
        p2pPrices[canonical] = p;
        p2pPrices[`[P2P] ${canonical}`] = p;
      }
    }
    for (const [resKey, p] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
      const canonical = resKey.charAt(0).toUpperCase() + resKey.slice(1);
      if (p2pPrices[canonical] === undefined) {
        p2pPrices[canonical] = p;
        p2pPrices[`[P2P] ${canonical}`] = p;
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      flowerPrice,
      p2p: p2pPrices,
      crops: p2pPrices,
      items: itemBreakdowns
    });
  } catch (error) {
    try {
      const renderRes = await fetch('https://sfl-calculator-backend.onrender.com/api/get-data', {
        signal: AbortSignal.timeout(10000)
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData && renderData.p2p && Object.keys(renderData.p2p).length > 0) {
          res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
          return res.status(200).json(renderData);
        }
      }
    } catch (_) {}

    const fallbackP2p = {};
    for (const [k, v] of Object.entries(CROP_FLOWER_PRICES)) {
      fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
    }
    for (const [k, v] of Object.entries(RESOURCE_FLOWER_FALLBACK_PRICES)) {
      fallbackP2p[k.charAt(0).toUpperCase() + k.slice(1)] = v;
    }
    return res.status(200).json({ flowerPrice: 0.13458, p2p: fallbackP2p, crops: fallbackP2p, items: {} });
  }
}