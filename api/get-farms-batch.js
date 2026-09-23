export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const { ids, apiKey } = body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of farm IDs is required in body: { ids: [...] }' });
  }

  const envApiKey = 
    process.env.SFL_API_KEY ||
    process.env.COMMUNITY_API_KEY ||
    process.env.API_KEY ||
    process.env.SUNFLOWER_API_KEY ||
    process.env.VITE_SFL_API_KEY ||
    '';

  const headerKey = req.headers['x-api-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const keyToUse = (apiKey && String(apiKey).trim()) || (headerKey && String(headerKey).trim()) || String(envApiKey).trim();

  if (!keyToUse) {
    return res.status(400).json({ error: 'x-api-key header or apiKey in body is required.' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-key': keyToUse,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.sunflower-land.com/community/getFarms', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ ids })
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `SFL API returned status ${response.status}`,
        durationMs,
        details: errText
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      requestedCount: ids.length,
      durationMs,
      farms: data
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to communicate with Sunflower Land API',
      details: error.message
    });
  }
}
