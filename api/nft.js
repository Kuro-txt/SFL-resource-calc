import { getItemNameById } from '../src/data/knownIds.js';
import { getItemBoost } from '../src/data/itemBoosts.js';

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
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      try {
        const renderRes = await fetch('https://sfl-calculator-backend.onrender.com/api/nfts', {
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

      const nftKey = `${collection}-${itemId}`;
      if (unitPrice > 0 && !seenNames.has(nftKey)) {
        seenNames.add(nftKey);
        nftsList.push({
          name: itemName,
          price: unitPrice,
          floor: unitPrice,
          boost: getItemBoost(itemName) || 'No Boost',
          collection,
          itemId
        });
      }
    }

    nftsList.sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(nftsList);
  } catch (err) {
    try {
      const renderRes = await fetch('https://sfl-calculator-backend.onrender.com/api/nfts', {
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
    return res.status(200).json([]);
  }
}
