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

  const numericIds = (Array.isArray(ids) ? ids : [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0)
    .map(Math.floor)
    .slice(0, 100);

  if (numericIds.length === 0) {
    return res.status(400).json({
      error: 'Malformed body: An array of 1–100 numeric farm IDs is required: { ids: [1, 2, 3] }'
    });
  }

  const envApiKey = 
    process.env.SFL_API_KEY ||
    process.env.COMMUNITY_API_KEY ||
    process.env.API_KEY ||
    process.env.SUNFLOWER_API_KEY ||
    process.env.VITE_SFL_API_KEY ||
    '';

  const headerKey = req.headers?.['x-api-key'] || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const keyToUse = (apiKey && String(apiKey).trim()) || (headerKey && String(headerKey).trim()) || String(envApiKey).trim();

  if (!keyToUse) {
    return res.status(401).json({
      error: 'Missing API key. Provide x-api-key header or apiKey in JSON body. Requires VIP and Level 50+ Bumpkin.'
    });
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
      body: JSON.stringify({ ids: numericIds })
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      let errData = null;
      const errText = await response.text();
      try { errData = JSON.parse(errText); } catch {}

      let userMsg = `SFL API returned status ${response.status}`;
      if (response.status === 401) {
        userMsg = 'Missing or invalid API key. Key is only valid while farm has VIP access and is level 50+.';
      } else if (response.status === 429) {
        userMsg = 'Too many requests. SFL limits requests to roughly 1 per 5 seconds per IP. Please back off and retry.';
      } else if (response.status === 500) {
        userMsg = 'Malformed body. Body must be a JSON object whose ids field is an array of 1–100 numbers.';
      }

      return res.status(response.status).json({
        error: userMsg,
        status: response.status,
        durationMs,
        details: errData || errText
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      requestedCount: numericIds.length,
      returnedCount: Object.keys(data.farms || {}).length,
      warning: data.warning || null,
      skipped: data.skipped || [],
      durationMs,
      ...data
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to communicate with Sunflower Land API',
      details: error.message
    });
  }
}
