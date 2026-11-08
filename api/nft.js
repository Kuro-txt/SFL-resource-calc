import { KNOWN_IDS, ITEM_IDS, getItemNameById } from '../src/data/knownIds.js';
import { getItemBoost } from '../src/data/itemBoosts.js';

function getNftNames({ collection = 'all', search = '' } = {}) {
  const col = String(collection || 'all').toLowerCase();
  const names = new Set();
  if (col === 'all' || col === 'collectibles' || col === 'sfts' || col === 'sft') {
    Object.keys(KNOWN_IDS).forEach(n => names.add(n));
  }
  if (col === 'all' || col === 'wearables' || col === 'wearable') {
    Object.keys(ITEM_IDS).forEach(n => names.add(n));
  }
  let list = Array.from(names).sort((a, b) => a.localeCompare(b));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(n => n.toLowerCase().includes(q));
  }
  return list;
}

function getFullNftCatalog({ collection = 'all', search = '', priceMap = null } = {}) {
  const col = String(collection || 'all').toLowerCase();
  const catalog = [];

  if (col === 'all' || col === 'collectibles' || col === 'sfts' || col === 'sft') {
    for (const [name, id] of Object.entries(KNOWN_IDS)) {
      const match = priceMap ? (priceMap.get(`collectibles-${id}`) || priceMap.get(name.toLowerCase())) : null;
      catalog.push({
        id,
        name,
        collection: 'collectibles',
        boost: getItemBoost(name) || 'No Boost',
        price: match ? match.price : null,
        floor: match ? match.floor : null
      });
    }
  }

  if (col === 'all' || col === 'wearables' || col === 'wearable') {
    for (const [name, id] of Object.entries(ITEM_IDS)) {
      const match = priceMap ? (priceMap.get(`wearables-${id}`) || priceMap.get(name.toLowerCase())) : null;
      catalog.push({
        id,
        name,
        collection: 'wearables',
        boost: getItemBoost(name) || 'No Boost',
        price: match ? match.price : null,
        floor: match ? match.floor : null
      });
    }
  }

  let list = catalog.sort((a, b) => a.name.localeCompare(b.name));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(item => item.name.toLowerCase().includes(q));
  }
  return list;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const isNamesOnly = req.query.names === 'true' || req.query.namesOnly === 'true';
  const isAllCatalog = req.query.all === 'true' || req.query.catalog === 'true';
  const collection = (req.query.collection || 'all').toLowerCase();
  const search = (req.query.search || req.query.q || '').trim();

  // If user only requests names list, resolve immediately from static catalog
  if (isNamesOnly) {
    const format = (req.query.format || '').toLowerCase();
    const isFlat = format === 'array' || format === 'flat' || req.query.flat === 'true' || !req.query.format;
    const names = getNftNames({ collection, search });
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    if (isFlat) return res.status(200).json(names);
    return res.status(200).json({ total: names.length, collection, names });
  }

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
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      try {
        const renderUrl = isAllCatalog
          ? 'https://sfl-calculator-backend.onrender.com/api/nfts?all=true'
          : 'https://sfl-calculator-backend.onrender.com/api/nfts';
        const renderRes = await fetch(renderUrl, {
          signal: AbortSignal.timeout(10000)
        });
        if (renderRes.ok) {
          const list = await renderRes.json();
          if (Array.isArray(list) && list.length > 0) {
            res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
            return res.status(200).json(list);
          }
        }
      } catch (_) {}

      if (isAllCatalog) {
        const catalog = getFullNftCatalog({ collection, search });
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
        return res.status(200).json(catalog);
      }
      return res.status(200).json([]);
    }

    const json = await response.json();
    const rootData = json?.data || json || {};
    const reports = rootData.reports || {};
    const dateKeys = Object.keys(reports).sort();
    const latestDateKey = dateKeys[dateKeys.length - 1];
    const latestReport = (latestDateKey && reports[latestDateKey]) || Object.values(reports)[0] || {};
    const rawItems = latestReport.items || {};

    const nftsList = [];
    const seenNames = new Set();
    const priceMap = new Map();

    for (const [key, itemData] of Object.entries(rawItems)) {
      if (!itemData || typeof itemData !== 'object') continue;

      const parts = key.split('-');
      const itemCol = parts[0] || 'collectibles';
      const itemId = parts.slice(1).join('-');

      const itemName = getItemNameById(itemId, itemCol);
      if (!itemName || itemName.startsWith('Item #')) continue;

      const floorPrice = parseFloat(itemData.floor);
      const latestSalePrice = parseFloat(itemData.latestSale);
      const lowPrice = parseFloat(itemData.low);

      let unitPrice = 0;
      if (!isNaN(floorPrice) && floorPrice > 0) unitPrice = floorPrice;
      else if (!isNaN(latestSalePrice) && latestSalePrice > 0) unitPrice = latestSalePrice;
      else if (!isNaN(lowPrice) && lowPrice > 0) unitPrice = lowPrice;

      const nftKey = `${itemCol}-${itemId}`;
      const itemRecord = {
        name: itemName,
        price: unitPrice,
        floor: unitPrice,
        boost: getItemBoost(itemName) || 'No Boost',
        collection: itemCol,
        itemId
      };

      if (unitPrice > 0) {
        priceMap.set(nftKey, itemRecord);
        priceMap.set(itemName.toLowerCase(), itemRecord);

        if (!seenNames.has(nftKey)) {
          seenNames.add(nftKey);
          nftsList.push(itemRecord);
        }
      }
    }

    if (isAllCatalog) {
      const catalog = getFullNftCatalog({ collection, search, priceMap });
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json(catalog);
    }

    nftsList.sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(nftsList);
  } catch (err) {
    try {
      const renderUrl = isAllCatalog
        ? 'https://sfl-calculator-backend.onrender.com/api/nfts?all=true'
        : 'https://sfl-calculator-backend.onrender.com/api/nfts';
      const renderRes = await fetch(renderUrl, {
        signal: AbortSignal.timeout(10000)
      });
      if (renderRes.ok) {
        const list = await renderRes.json();
        if (Array.isArray(list) && list.length > 0) {
          res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
          return res.status(200).json(list);
        }
      }
    } catch (_) {}

    if (isAllCatalog) {
      const catalog = getFullNftCatalog({ collection, search });
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).json(catalog);
    }
    return res.status(200).json([]);
  }
}
