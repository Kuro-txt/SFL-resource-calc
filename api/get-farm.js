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
      return res.status(response.status).json({ error: `API error status: ${response.status}` });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to farm API', details: error.message });
  }
}
