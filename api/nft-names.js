import { KNOWN_IDS, ITEM_IDS } from '../src/data/knownIds.js';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const collection = (req.query.collection || 'all').toLowerCase();
  const search = (req.query.search || req.query.q || '').trim();
  const format = (req.query.format || '').toLowerCase();
  const isFlat = format === 'array' || format === 'flat' || req.query.flat === 'true';

  const names = getNftNames({ collection, search });
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

  if (isFlat) {
    return res.status(200).json(names);
  }

  return res.status(200).json({
    total: names.length,
    collection,
    ...(search ? { search } : {}),
    names
  });
}
