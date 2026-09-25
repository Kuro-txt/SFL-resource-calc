export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sfl.world/',
    'Origin': 'https://sfl.world'
  };

  // 1. Primary: Direct fetch from official sfl.world exchange API for live Gem Packs and currency rates
  try {
    const response = await fetch('https://sfl.world/api/v1.1/exchange', {
      headers,
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && (data.gems || data.sfl)) {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        return res.status(200).json(data);
      }
    }
  } catch (_) {}

  // 2. Secondary: Fallback to Render backend proxy
  try {
    const renderRes = await fetch('https://sfl-calculator-backend.onrender.com/api/get-exchange', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (renderRes.ok) {
      const data = await renderRes.json();
      if (data && (data.gems || data.sfl)) {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        return res.status(200).json(data);
      }
    }
  } catch (_) {}

  // 3. Tertiary: Graceful fallback calculation
  function generateFallbackGems(flPrice = 0.1403) {
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
    const fl = flPrice > 0 ? flPrice : 0.1403;
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

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return res.status(200).json({
    sfl: { usd: 0.1403 },
    pol: { usd: 0.18 },
    gems: generateFallbackGems(0.1403),
    fallback: true
  });
}
