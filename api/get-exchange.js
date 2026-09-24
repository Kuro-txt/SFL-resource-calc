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
      signal: AbortSignal.timeout(15000)
    });

    let flowerPrice = 0.13458;
    if (response.ok) {
      const json = await response.json();
      flowerPrice = parseFloat(json?.data?.flowerPrice) || flowerPrice;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      sfl: { usd: flowerPrice },
      flowerPrice
    });
  } catch (error) {
    return res.status(200).json({
      sfl: { usd: 0.13458 },
      flowerPrice: 0.13458
    });
  }
}
