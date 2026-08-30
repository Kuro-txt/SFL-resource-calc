export default async function handler(req, res) {
  const { farmId } = req.query;

  if (!farmId) {
    return res.status(400).json({ error: 'Farm ID is required' });
  }

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sfl.world/',
    'Origin': 'https://sfl.world'
  };

  try {
    const response = await fetch(`https://sfl.world/api/v1/land/${encodeURIComponent(farmId)}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `SFL.world API returned status ${response.status}. Please check your Farm ID.` 
      });
    }

    const data = await response.json();
    res.status(200).json({ success: true, land: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch land data from sfl.world', details: error.message });
  }
}
