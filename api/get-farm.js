export default async function handler(req, res) {
  const { farmId, apiKey } = req.query;

  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required' });
  }

  // Build request headers with key support
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  };

  const envApiKey = 
    process.env.SFL_API_KEY ||
    process.env.COMMUNITY_API_KEY ||
    process.env.API_KEY ||
    process.env.SUNFLOWER_API_KEY ||
    process.env.VITE_SFL_API_KEY ||
    process.env.NEXT_PUBLIC_SFL_API_KEY ||
    '';

  const cleanKey = (apiKey && String(apiKey).trim()) || String(envApiKey).trim();
  if (cleanKey) {
    headers['x-api-key'] = cleanKey;
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }

  try {
    const response = await fetch(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `API returned status ${response.status}. Please check your Farm ID or API Key.` 
      });
    }

    const data = await response.json();
    res.status(200).json({ success: true, farm: data });
  } catch (error) {
    res.status(500).json({ error: 'Server connection failed', details: error.message });
  }
}
