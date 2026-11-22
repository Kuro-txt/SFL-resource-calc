import { KNOWN_IDS, ITEM_IDS } from '../src/data/knownIds.js';
import { getItemBoost } from '../src/data/itemBoosts.js';
import { TRANSPARENT_BOOST_SPRITES } from '../src/data/transparentBoostSprites.js';
import { RAW_GLOBAL_TAX_ITEMS } from '../src/config/constants.js';

const FASTLY_RAW_BASE = 'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/';

const ALLOWED_ITEM_KEYS = new Set(
  RAW_GLOBAL_TAX_ITEMS.map(n => n.toLowerCase().replace(/[^a-z0-9]/g, ''))
);

function getCollectibleImageUrl(name, id, collection = 'collectibles') {
  const norm = String(name || '').toLowerCase().trim();
  const spriteRel = TRANSPARENT_BOOST_SPRITES[norm];
  if (spriteRel) {
    return `${FASTLY_RAW_BASE}${spriteRel}`;
  }
  if (collection === 'wearables') {
    return `https://sunflower-land.com/play/erc1155/images/${id}.png`;
  }
  return `https://sunflower-land.com/play/erc1155/images/${id}.webp`;
}

function compileCollectiblePrices({
  rawItems = {},
  nftsList = [],
  flowerPriceUsd = 0.124309,
  collection = 'collectibles',
  boostsOnly = false,
  hasPrice = false,
  currency = 'flower',
  search = '',
  excludeResources = true
} = {}) {
  const normCol = String(collection || 'collectibles').toLowerCase().trim();
  const normCurr = String(currency || 'flower').toLowerCase().trim();
  const normSearch = String(search || '').toLowerCase().trim();

  const priceMap = new Map();
  if (Array.isArray(nftsList)) {
    nftsList.forEach(n => {
      const fl = parseFloat(n.floor || n.price);
      if (!isNaN(fl) && fl > 0) {
        if (n.name) priceMap.set(n.name.toLowerCase().trim(), fl);
        if (n.collection && n.itemId) priceMap.set(`${n.collection}-${n.itemId}`, fl);
      }
    });
  }
  if (rawItems && typeof rawItems === 'object') {
    Object.entries(rawItems).forEach(([k, v]) => {
      const fl = parseFloat(v.floor || v.price || v.latestSale);
      if (!isNaN(fl) && fl > 0) {
        priceMap.set(k.toLowerCase().trim(), fl);
        if (v.collection && v.itemId) priceMap.set(`${v.collection}-${v.itemId}`, fl);
      }
    });
  }

  const pricesMap = {};
  const pricesList = [];

  const includeCollectibles = normCol === 'all' || normCol === 'collectibles' || normCol === 'sfts' || normCol === 'sft';
  const includeWearables = normCol === 'all' || normCol === 'wearables' || normCol === 'wearable';

  if (includeCollectibles) {
    for (const [name, id] of Object.entries(KNOWN_IDS)) {
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (excludeResources && (ALLOWED_ITEM_KEYS.has(cleanKey) || id < 400)) {
        continue;
      }

      if (normSearch && !name.toLowerCase().includes(normSearch) && !cleanKey.includes(normSearch)) {
        continue;
      }

      const boost = getItemBoost(name);
      const isBoosted = Boolean(boost && boost !== 'No Boost');
      if (boostsOnly && !isBoosted) {
        continue;
      }

      const floor = priceMap.get(`collectibles-${id}`) || priceMap.get(name.toLowerCase().trim()) || null;
      if (hasPrice && (!floor || floor <= 0)) {
        continue;
      }

      const priceFlower = floor;
      const priceUsd = floor ? parseFloat((floor * flowerPriceUsd).toFixed(4)) : null;

      let val;
      if (normCurr === 'usd') {
        val = priceUsd;
      } else if (normCurr === 'both') {
        val = { flower: priceFlower, usd: priceUsd };
      } else {
        val = priceFlower;
      }

      pricesMap[name] = val;
      pricesList.push({
        id,
        name,
        collection: 'collectibles',
        priceFlower,
        priceUsd,
        value: val,
        boost: isBoosted ? boost : null,
        image: getCollectibleImageUrl(name, id, 'collectibles')
      });
    }
  }

  if (includeWearables) {
    for (const [name, id] of Object.entries(ITEM_IDS)) {
      const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normSearch && !name.toLowerCase().includes(normSearch) && !cleanKey.includes(normSearch)) {
        continue;
      }

      const boost = getItemBoost(name);
      const isBoosted = Boolean(boost && boost !== 'No Boost');
      if (boostsOnly && !isBoosted) {
        continue;
      }

      const floor = priceMap.get(`wearables-${id}`) || priceMap.get(name.toLowerCase().trim()) || null;
      if (hasPrice && (!floor || floor <= 0)) {
        continue;
      }

      const priceFlower = floor;
      const priceUsd = floor ? parseFloat((floor * flowerPriceUsd).toFixed(4)) : null;

      let val;
      if (normCurr === 'usd') {
        val = priceUsd;
      } else if (normCurr === 'both') {
        val = { flower: priceFlower, usd: priceUsd };
      } else {
        val = priceFlower;
      }

      const displayName = includeCollectibles && pricesMap[name] ? `${name} (Wearable)` : name;
      pricesMap[displayName] = val;
      pricesList.push({
        id,
        name,
        collection: 'wearables',
        priceFlower,
        priceUsd,
        value: val,
        boost: isBoosted ? boost : null,
        image: getCollectibleImageUrl(name, id, 'wearables')
      });
    }
  }

  return { pricesMap, pricesList };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const customKey = (req.query.apiKey || req.headers['x-api-key'] || process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || '').trim();
  const force = req.query.force === 'true';
  const collection = (req.query.collection || req.query.col || 'collectibles').toLowerCase();
  const currency = (req.query.currency || req.query.curr || 'flower').toLowerCase();
  const search = (req.query.search || req.query.q || '').trim();
  const boostsOnly = req.query.boostsOnly === 'true' || req.query.boosts === 'true' || req.query.boost === 'true';
  const hasPrice = req.query.hasPrice === 'true' || req.query.listedOnly === 'true' || req.query.listed === 'true';
  const excludeResources = req.query.excludeResources !== 'false' && req.query.resources !== 'true';
  const format = (req.query.format || '').toLowerCase();
  const isFlat = format === 'flat' || format === 'simple' || req.query.flat === 'true';
  const isArray = format === 'array' || format === 'list';

  // 1. First attempt: proxy to primary backend
  try {
    const params = new URLSearchParams({
      collection,
      currency,
      format,
      ...(search ? { search } : {}),
      ...(boostsOnly ? { boostsOnly: 'true' } : {}),
      ...(hasPrice ? { hasPrice: 'true' } : {}),
      ...(excludeResources ? { excludeResources: 'true' } : { excludeResources: 'false' }),
      ...(force ? { force: 'true' } : {}),
      ...(customKey ? { apiKey: customKey } : {})
    });

    const backendUrl = `https://sfl-calculator-backend.onrender.com/api/collectible-prices?${params.toString()}`;
    const renderRes = await fetch(backendUrl, {
      signal: AbortSignal.timeout(12000)
    });
    if (renderRes.ok) {
      const data = await renderRes.json();
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json(data);
    }
  } catch (_) {}

  // 2. Fallback: query upstream Sunflower Land community API
  let rawItems = {};
  let nftsList = [];
  let flowerPriceUsd = 0.124309;

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
      rawItems = latest.items || {};
    }
  } catch (_) {}

  // 3. Fallback: query backend's cached NFTs payload if upstream SFL returned no items (e.g. 401 unauthorized)
  if (Object.keys(rawItems).length === 0) {
    try {
      const nftsRes = await fetch('https://sfl-calculator-backend.onrender.com/api/nfts', {
        signal: AbortSignal.timeout(10000)
      });
      if (nftsRes.ok) {
        const list = await nftsRes.json();
        if (Array.isArray(list) && list.length > 0) {
          nftsList = list;
        }
      }
    } catch (_) {}
  }

  const { pricesMap, pricesList } = compileCollectiblePrices({
    rawItems,
    nftsList,
    flowerPriceUsd,
    flowerPriceUsd,
    collection,
    boostsOnly,
    hasPrice,
    currency,
    search,
    excludeResources
  });

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
    collection,
    total: Object.keys(pricesMap).length,
    ...(boostsOnly ? { boostsOnly: true } : {}),
    ...(hasPrice ? { hasPrice: true } : {}),
    ...(search ? { search } : {}),
    prices: pricesMap
  });
}
