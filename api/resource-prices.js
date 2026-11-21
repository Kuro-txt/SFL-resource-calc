import { RAW_GLOBAL_TAX_ITEMS, CROP_FLOWER_PRICES, RESOURCE_FLOWER_FALLBACK_PRICES } from '../src/config/constants.js';
import { RESOURCE_CATEGORIES } from '../src/panels/inventory/inventoryLogic.js';

function getUnitPrice(cleanKey, p2p = {}) {
  const matchedKey = Object.keys(p2p).find(k => {
    const norm = k.replace(/\[.*?\]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return norm === cleanKey;
  });
  if (matchedKey) {
    const p = parseFloat(p2p[matchedKey]) || 0;
    if (p > 0) return p > 100 ? p / 1000 : p;
  }
  if (CROP_FLOWER_PRICES[cleanKey] !== undefined) {
    return CROP_FLOWER_PRICES[cleanKey];
  }
  if (RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey] !== undefined) {
    return RESOURCE_FLOWER_FALLBACK_PRICES[cleanKey];
  }
  return 0.01;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const customKey = (req.query.apiKey || req.headers['x-api-key'] || process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || '').trim();
  const force = req.query.force === 'true';
  const category = (req.query.category || req.query.cat || 'all').toLowerCase();
  const currency = (req.query.currency || req.query.curr || 'flower').toLowerCase();
  const search = (req.query.search || req.query.q || '').trim().toLowerCase();
  const format = (req.query.format || '').toLowerCase();
  const isFlat = format === 'flat' || format === 'simple' || req.query.flat === 'true';
  const isArray = format === 'array' || format === 'list';

  let p2p = {};
  let flowerPriceUsd = 0.124309;

  // 1. Fetch live market prices via primary backend proxy
  try {
    const keyParam = customKey ? `&apiKey=${encodeURIComponent(customKey)}` : '';
    const renderRes = await fetch(`https://sfl-calculator-backend.onrender.com/api/get-data?force=${force}${keyParam}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (renderRes.ok) {
      const renderData = await renderRes.json();
      if (renderData && renderData.p2p) {
        p2p = renderData.p2p;
        if (renderData.flowerPrice) flowerPriceUsd = parseFloat(renderData.flowerPrice);
      }
    }
  } catch (_) {}

  // 2. Fallback to upstream Sunflower Land community API if needed
  if (Object.keys(p2p).length === 0) {
    try {
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      };
      if (customKey) {
        headers['x-api-key'] = customKey;
        headers['Authorization'] = `Bearer ${customKey}`;
      }
      const sflRes = await fetch('https://api.sunflower-land.com/community/data?type=marketplaceActivity', {
        headers,
        signal: AbortSignal.timeout(15000)
      });
      if (sflRes.ok) {
        const json = await sflRes.json();
        const root = json?.data || json || {};
        if (root.flowerPrice) flowerPriceUsd = parseFloat(root.flowerPrice);
        const reports = root.reports || {};
        const dateKeys = Object.keys(reports).sort();
        const latest = (dateKeys.length && reports[dateKeys[dateKeys.length - 1]]) || {};
        const items = latest.items || {};
        for (const [k, v] of Object.entries(items)) {
          if (!v || typeof v !== 'object') continue;
          const floor = parseFloat(v.floor || v.latestSale || v.low);
          if (!isNaN(floor) && floor > 0) {
            p2p[k] = floor;
          }
        }
      }
    } catch (_) {}
  }

  // 3. Compile filtered resource prices
  const pricesMap = {};
  const pricesList = [];

  for (const name of RAW_GLOBAL_TAX_ITEMS) {
    const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemCat = RESOURCE_CATEGORIES[cleanKey] || 'Forage & Other';

    // Category filter
    if (category !== 'all') {
      if (itemCat.toLowerCase() !== category && !itemCat.toLowerCase().startsWith(category)) {
        continue;
      }
    }

    // Search filter
    if (search && !name.toLowerCase().includes(search) && !cleanKey.includes(search)) {
      continue;
    }

    const priceFlower = getUnitPrice(cleanKey, p2p);
    const priceUsd = parseFloat((priceFlower * flowerPriceUsd).toFixed(6));

    let val;
    if (currency === 'usd') {
      val = priceUsd;
    } else if (currency === 'both') {
      val = { flower: priceFlower, usd: priceUsd };
    } else {
      val = priceFlower;
    }

    pricesMap[name] = val;
    pricesList.push({
      name,
      category: itemCat,
      priceFlower,
      priceUsd,
      value: val
    });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  if (isFlat) {
    return res.status(200).json(pricesMap);
  }

  if (isArray) {
    return res.status(200).json(pricesList);
  }

  return res.status(200).json({
    updated_at: new Date().toISOString(),
    flowerPriceUsd,
    currency: currency.toUpperCase(),
    total: Object.keys(pricesMap).length,
    ...(category !== 'all' ? { category } : {}),
    ...(search ? { search } : {}),
    prices: pricesMap
  });
}
