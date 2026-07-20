export default async function handler(req, res) {
  const { farmId, apiKey } = req.query;

  if (!farmId || !apiKey) {
    return res.status(400).json({ error: 'Farm ID and API Key are required' });
  }

  try {
    const response = await fetch(`https://sfl.world/api/v1/land/info/farm_id/${farmId}`, {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `API responded with HTTP status ${response.status}. Please check your Farm ID and API Key.` 
      });
    }

    const rawData = await response.json();

    // Dynamically locate the inventory object regardless of API response wrapping
    let inventory = 
      rawData.inventory || 
      rawData.data?.inventory || 
      rawData.farm?.inventory || 
      rawData.data || 
      rawData;

    res.status(200).json({ success: true, inventory });
  } catch (error) {
    res.status(500).json({ error: 'Server connection failed', details: error.message });
  }
}
