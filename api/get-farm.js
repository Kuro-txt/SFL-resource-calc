export default async function handler(req, res) {
  const { farmId, apiKey } = req.query; // Accept optional key from frontend query

  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required' });
  }

  // Construct request headers dynamically
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  };

  // If the user provided a key, pass it along in the headers
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    // OR: headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch(`https://api.sunflower-land.com/community/farms/${farmId}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Sunflower Land API returned status ${response.status}. Double check your Farm ID.` 
      });
    }

    const data = await response.json();
    res.status(200).json({ success: true, farm: data });
  } catch (error) {
    res.status(500).json({ error: 'Server connection failed', details: error.message });
  }
}
