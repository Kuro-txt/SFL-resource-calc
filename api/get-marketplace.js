export default async function handler(req, res) {
  const { farmId, apiKey } = req.query;

  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required' });
  }

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
    const url = `https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(farmId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error || `API returned status ${response.status}. Please verify your VIP Community API Key.` 
      });
    }

    res.status(200).json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch marketplace data', details: error.message });
  }
}
